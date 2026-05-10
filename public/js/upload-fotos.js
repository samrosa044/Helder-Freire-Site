// ═══════════════════════════════════════════════════
//  SISTEMA DE UPLOAD DE FOTOS — Compartilhado
//  Helder Freire Imóveis — v2.0
//
//  Funciona para:
//    • Painel admin → tab "Cadastrar" (#adm-file-input)
//    • Modal de edição de imóvel (#ei-file-input)
//
//  Fluxo:
//    1. Usuário seleciona arquivo(s)
//    2. Preview instantâneo via createObjectURL (sem base64 na memória)
//    3. Compressão via Canvas (max 1600px, JPEG 0.82)
//    4. Na hora de salvar: upload para /api/upload (R2)
//    5. URLs retornadas são salvas no D1 (campo fotos)
//
//  Compatibilidade:
//    • Chrome Android ✓
//    • Safari iPhone (iOS 15+) ✓
//    • Samsung Internet ✓
//    • Desktop Chrome/Firefox/Edge ✓
// ═══════════════════════════════════════════════════

// ── Estado interno por contexto ───────────────────────────────────
// ctx = 'adm' → formulário de cadastro admin
// ctx = 'ei'  → modal de edição de imóvel
const _fotosState = {
  adm: { files: [], blobUrls: [] },
  ei:  { files: [], blobUrls: [] },
};

// IDs dos elementos DOM por contexto
const _fotosIds = {
  adm: { grid: 'adm-fotos-grid', hidden: 'adm-fotos', fileInput: 'adm-file-input' },
  ei:  { grid: 'ei-fotos-grid',  hidden: 'ei-fotos',  fileInput: 'ei-file-input'  },
};

// ── Compressão client-side via Canvas ─────────────────────────────
/**
 * Comprime uma imagem usando Canvas.
 * @param {File} file         - Arquivo original
 * @param {number} maxWidth   - Largura máxima em pixels (default: 1600)
 * @param {number} quality    - Qualidade JPEG 0-1 (default: 0.82)
 * @returns {Promise<File>}   - Arquivo comprimido (JPEG)
 */
async function _fotoComprimir(file, maxWidth = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    // Arquivos muito pequenos não precisam de compressão
    if (file.size < 60 * 1024) {
      resolve(file);
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      let w = img.naturalWidth  || img.width;
      let h = img.naturalHeight || img.height;

      // Reduz se exceder maxWidth
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }

      // Canvas para recodificação
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      // Fundo branco (evita transparência em PNG convertido a JPEG)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }

          // Usa o arquivo comprimido apenas se for menor
          const nomeBase = file.name.replace(/\.(heic|heif|png|webp|jpeg)$/i, '') || 'foto';
          const comprimido = new File(
            [blob],
            nomeBase + '.jpg',
            { type: 'image/jpeg', lastModified: Date.now() }
          );

          resolve(comprimido.size < file.size ? comprimido : file);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(file); // fallback: usa original
    };

    img.src = blobUrl;
  });
}

// ── Upload para /api/upload ────────────────────────────────────────
/**
 * Comprime e envia arquivos para R2 via /api/upload.
 * @param {File[]} files  - Array de File objects
 * @returns {Promise<string[]>} - URLs públicas dos arquivos salvos
 */
async function _fotosEnviarParaAPI(files) {
  if (!files.length) return [];

  const token = (typeof API !== 'undefined' && API.token)
    ? API.token()
    : sessionStorage.getItem('adm_token');

  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  // Comprime sequencialmente para não sobrecarregar a memória em mobile
  const progresso = _fotosMostrarProgresso();
  const comprimidos = [];
  for (let i = 0; i < files.length; i++) {
    if (progresso) progresso(i + 1, files.length, 'comprimindo');
    comprimidos.push(await _fotoComprimir(files[i]));
  }

  if (progresso) progresso(files.length, files.length, 'enviando');

  // Monta FormData — NÃO definir Content-Type manualmente
  // (o browser define automaticamente com o boundary correto)
  const form = new FormData();
  for (const f of comprimidos) {
    form.append('files', f, f.name);
  }

  let resp;
  try {
    resp = await fetch('/api/upload', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      // IMPORTANTE: não incluir 'Content-Type' aqui — o browser faz isso automaticamente
      body: form,
    });
  } catch (netErr) {
    throw new Error('Erro de rede ao enviar imagens. Verifique sua conexão.');
  }

  if (!resp.ok) {
    let mensagem = `Erro ${resp.status} no upload`;
    try {
      const data = await resp.json();
      mensagem = data.erro || mensagem;
    } catch (_) {}
    throw new Error(mensagem);
  }

  const data = await resp.json();
  if (data.erros && data.erros.length) {
    console.warn('[upload-fotos] Avisos do servidor:', data.erros);
  }
  return data.urls || [];
}

// ── Indicador de progresso (não-bloqueante) ───────────────────────
function _fotosMostrarProgresso() {
  // Só cria indicador se houver mais de 1 foto
  return null; // pode ser expandido para mostrar um toast/spinner
}

// ── Renderizar preview de uma foto no grid ────────────────────────
function _fotoRenderizarPreview(src, gridEl, ctx, pendingIdx) {
  const isPending = pendingIdx !== undefined && pendingIdx !== null;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;display:inline-block;flex-shrink:0';
  wrap.dataset.ctx = ctx;
  if (isPending) wrap.dataset.pendingIdx = String(pendingIdx);

  wrap.innerHTML = `
    <img
      src="${_escapeAttr(src)}"
      data-url="${_escapeAttr(src)}"
      style="height:80px;width:110px;object-fit:cover;border-radius:8px;
             border:2px solid ${isPending ? '#f59e0b' : '#e2e8f0'};display:block"
      loading="lazy"
      onerror="this.closest('div').style.opacity='0.4'">
    ${isPending
      ? `<div style="position:absolute;bottom:0;left:0;right:0;
              background:rgba(245,158,11,.85);font-size:8px;color:#fff;
              text-align:center;padding:2px 0;border-radius:0 0 6px 6px;
              font-weight:700;letter-spacing:.3px">⏳ PENDENTE</div>`
      : ''}
    <button
      type="button"
      onclick="_fotoRemover(this,'${ctx}')"
      aria-label="Remover foto"
      style="position:absolute;top:-7px;right:-7px;background:#dc2626;color:#fff;
             border:none;border-radius:50%;width:22px;height:22px;font-size:13px;
             cursor:pointer;line-height:1;z-index:2;display:flex;align-items:center;
             justify-content:center;padding:0;font-family:sans-serif">×</button>`;

  gridEl.appendChild(wrap);
}

// ── Remover foto do grid ───────────────────────────────────────────
/**
 * Remove uma foto do grid e atualiza o estado.
 * @param {HTMLElement} btn - Botão × clicado
 * @param {string} ctx      - Contexto: 'adm' ou 'ei'
 */
function _fotoRemover(btn, ctx) {
  const wrap = btn.closest
    ? btn.closest('[data-ctx]') || btn.parentNode
    : btn.parentNode;

  const img  = wrap.querySelector('img');
  const url  = img ? (img.dataset.url || img.src) : '';
  const pidx = wrap.dataset.pendingIdx;

  // Revoga blob URL e marca como removido no estado
  if (pidx !== undefined) {
    const st = _fotosState[ctx];
    if (st) {
      const blobUrl = st.blobUrls[+pidx];
      if (blobUrl) {
        try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      }
      st.files[+pidx]    = null; // null = removido (mantém índices)
      st.blobUrls[+pidx] = null;
    }
  }

  wrap.remove();

  // Remove do campo hidden (apenas URLs http — fotos já salvas)
  const ids    = _fotosIds[ctx];
  const hidden = ids && document.getElementById(ids.hidden);
  if (hidden && url && url.startsWith('http')) {
    const restantes = hidden.value
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u && u !== url);
    hidden.value = restantes.join('\n');
  }

  // Se grid ficou vazio, mostra placeholder
  _fotosVerificarVazio(ctx);
}

// Wrappers para compatibilidade com código HTML existente
function eiRemoverFoto(btn)  { _fotoRemover(btn, 'ei'); }
function admRemoverFoto(btn) { _fotoRemover(btn, 'adm'); }

// ── Adicionar arquivos ao grid ────────────────────────────────────
/**
 * Processa arquivos selecionados pelo input file.
 * Adiciona previews instantâneos e armazena Files para upload posterior.
 * @param {HTMLInputElement} input - O elemento <input type="file">
 * @param {string} ctx             - Contexto: 'adm' ou 'ei'
 */
async function _fotosAdicionarArquivo(input, ctx) {
  const ids  = _fotosIds[ctx];
  const grid = document.getElementById(ids.grid);
  if (!grid) { console.error('[upload-fotos] Grid não encontrado:', ids.grid); return; }

  // Remove o placeholder "nenhuma foto"
  const placeholder = grid.querySelector('span');
  if (placeholder) placeholder.remove();

  const st    = _fotosState[ctx];
  const novos = Array.from(input.files || []);

  // Limita total a 20 fotos
  const existentes = grid.querySelectorAll('img').length;
  const limite     = Math.max(0, 20 - existentes);
  const paraAdicionar = novos.slice(0, limite);

  if (novos.length > limite) {
    console.warn(`[upload-fotos] Limite de 20 fotos. ${novos.length - limite} arquivo(s) ignorado(s).`);
  }

  for (const file of paraAdicionar) {
    // Valida tipo pelo MIME ou extensão (fallback para mobile)
    if (!_fotoTipoValido(file)) {
      console.warn('[upload-fotos] Tipo não suportado:', file.name, file.type);
      continue;
    }

    // Preview instantâneo via blob URL (não usa base64, não sobrecarrega memória)
    let blobUrl;
    try {
      blobUrl = URL.createObjectURL(file);
    } catch (e) {
      console.error('[upload-fotos] createObjectURL falhou:', e);
      continue;
    }

    const idx = st.files.length;
    st.files.push(file);
    st.blobUrls.push(blobUrl);

    _fotoRenderizarPreview(blobUrl, grid, ctx, idx);
  }

  // Reseta o input para permitir selecionar os mesmos arquivos novamente
  try { input.value = ''; } catch (_) {}
}

// Funções públicas chamadas pelo HTML
function admFotosAdicionarArquivo(input) { _fotosAdicionarArquivo(input, 'adm'); }
function eiAdicionarFotosArquivo(input)  { _fotosAdicionarArquivo(input, 'ei');  }

// ── Obter todas as URLs (existentes + novas) para salvar ──────────
/**
 * Retorna array com todas as URLs de fotos para enviar ao backend.
 * Arquivos pendentes são comprimidos e enviados para R2.
 * Exibe feedback de progresso em caso de uploads.
 *
 * @param {string} ctx  - Contexto: 'adm' ou 'ei'
 * @returns {Promise<string[]>} - Array de URLs públicas
 */
async function _fotosObterUrls(ctx) {
  const ids    = _fotosIds[ctx];
  const hidden = ids && document.getElementById(ids.hidden);

  // URLs já salvas no banco (campo hidden)
  const existentes = hidden
    ? hidden.value.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith('http'))
    : [];

  // Arquivos pendentes (filtrar nulls de removidos)
  const st      = _fotosState[ctx];
  const pending = (st.files || []).filter(Boolean);

  if (!pending.length) return existentes;

  // Upload dos arquivos pendentes
  const novasUrls = await _fotosEnviarParaAPI(pending);
  return [...existentes, ...novasUrls];
}

// ── Limpar estado completo após salvar ────────────────────────────
/**
 * Reseta o estado do formulário de fotos após um save bem-sucedido.
 * @param {string} ctx - Contexto: 'adm' ou 'ei'
 */
function _fotosLimpar(ctx) {
  const st = _fotosState[ctx];

  // Revoga todos os blob URLs para liberar memória
  (st.blobUrls || []).forEach(u => {
    if (u) { try { URL.revokeObjectURL(u); } catch (_) {} }
  });
  st.files    = [];
  st.blobUrls = [];

  const ids = _fotosIds[ctx];

  const grid   = ids && document.getElementById(ids.grid);
  const hidden = ids && document.getElementById(ids.hidden);
  const finput = ids && document.getElementById(ids.fileInput);

  if (grid)   grid.innerHTML = '<span style="font-size:12px;color:#94a3b8">Nenhuma foto ainda</span>';
  if (hidden) hidden.value   = '';
  if (finput) { try { finput.value = ''; } catch (_) {} }
}

// ── Inicializar estado do contexto de edição ──────────────────────
/**
 * Deve ser chamada toda vez que o modal de edição é aberto,
 * para garantir que não há estado residual de uma edição anterior.
 */
function _fotosInicializarEdicao() {
  _fotosLimpar('ei');
}

// ── Helpers ───────────────────────────────────────────────────────
function _fotoTipoValido(file) {
  const mime = (file.type || '').toLowerCase();
  const nome = (file.name || '').toLowerCase();
  if (/^image\/(jpeg|jpg|png|webp|heic|heif)$/.test(mime)) return true;
  if (/\.(jpg|jpeg|png|webp|heic|heif)$/.test(nome))       return true;
  return false;
}

function _fotosVerificarVazio(ctx) {
  const ids  = _fotosIds[ctx];
  const grid = ids && document.getElementById(ids.grid);
  if (grid && !grid.querySelector('img')) {
    grid.innerHTML = '<span style="font-size:12px;color:#94a3b8">Nenhuma foto ainda</span>';
  }
}

function _escapeAttr(str) {
  return String(str || '')
    .replace(/&/g,  '&amp;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;');
}
