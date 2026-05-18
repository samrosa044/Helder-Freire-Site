/**
 * imoveis-page.js — Helder Freire Imóveis
 * Lógica da página /imoveis: listagem, filtros, modal de detalhe.
 */

const TYPE_ICONS  = { casa:'🏠', apartamento:'🏢', fazenda:'🌾', terreno:'📐', comercial:'🏪', aluguel:'🔑' };
const TYPE_LABELS = { casa:'Casa', apartamento:'Apartamento', fazenda:'Fazenda/Sítio', terreno:'Terreno', comercial:'Comercial', aluguel:'Aluguel' };

let _todosImoveis = [];
let _tipoAtivo    = '';
let _galFotos     = [];
let _galIdx       = 0;

// ── Inicialização ──────────────────────────────────────────────────
(async () => {
  // Lê parâmetro ?tipo= da URL e seleciona chip correspondente
  const params = new URLSearchParams(window.location.search);
  const tipoUrl = (params.get('tipo') || '').toLowerCase();
  if (tipoUrl) {
    _tipoAtivo = tipoUrl;
    document.querySelectorAll('.im-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.tipo === tipoUrl);
    });
  }

  await imCarregar();
})();

// ── Buscar imóveis da API ──────────────────────────────────────────
async function imCarregar() {
  const grid = document.getElementById('im-grid');
  grid.innerHTML = '<div class="im-empty"><div>⏳</div><div>Carregando imóveis…</div></div>';

  try {
    const url = _tipoAtivo ? `/api/imoveis?tipo=${_tipoAtivo}` : '/api/imoveis';
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('API ' + resp.status);
    _todosImoveis = await resp.json();
    _popularSelects();
    imRenderizar(_todosImoveis);
  } catch (e) {
    grid.innerHTML = '<div class="im-empty"><div>⚠️</div><div>Erro ao carregar imóveis. Tente recarregar a página.</div></div>';
    document.getElementById('im-count').textContent = '';
    console.error(e);
  }
}

// ── Popular selects de cidade e bairro ────────────────────────────
function _popularSelects() {
  const cidades = [...new Set(_todosImoveis.map(i => i.cidade).filter(Boolean))].sort();
  const bairros = [...new Set(_todosImoveis.map(i => i.bairro).filter(Boolean))].sort();

  const selCidade = document.getElementById('im-cidade');
  cidades.forEach(c => selCidade.add(new Option(c, c)));

  const selBairro = document.getElementById('im-bairro');
  bairros.forEach(b => selBairro.add(new Option(b, b)));
}

// ── Aplicar filtros (chamado pelos inputs) ─────────────────────────
function imAplicar() {
  const busca    = (document.getElementById('im-busca').value    || '').toLowerCase().trim();
  const modal    = document.getElementById('im-modal').value    || '';
  const cidade   = document.getElementById('im-cidade').value   || '';
  const bairro   = document.getElementById('im-bairro').value   || '';
  const precoMin = parseFloat(document.getElementById('im-preco-min').value || 0) || 0;
  const precoMax = parseFloat(document.getElementById('im-preco-max').value || 0) || Infinity;

  const filtrados = _todosImoveis.filter(im => {
    if (_tipoAtivo && im.tipo !== _tipoAtivo) return false;
    if (modal   && im.modal   !== modal)   return false;
    if (cidade  && im.cidade  !== cidade)  return false;
    if (bairro  && im.bairro  !== bairro)  return false;
    if (busca) {
      const haystack = [im.titulo, im.cidade, im.bairro, im.descricao, im.tipo].join(' ').toLowerCase();
      if (!haystack.includes(busca)) return false;
    }
    if (precoMin > 0 || precoMax < Infinity) {
      const v = parseFloat((im.valor || '').replace(/\./g,'').replace(',','.'));
      if (!isNaN(v) && (v < precoMin || v > precoMax)) return false;
    }
    return true;
  });

  imRenderizar(filtrados);
}

// ── Selecionar chip de tipo ────────────────────────────────────────
function imChip(btn) {
  document.querySelectorAll('.im-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  _tipoAtivo = btn.dataset.tipo || '';
  imAplicar();
}

// ── Limpar todos os filtros ────────────────────────────────────────
function imLimpar() {
  _tipoAtivo = '';
  document.getElementById('im-busca').value    = '';
  document.getElementById('im-modal').value    = '';
  document.getElementById('im-cidade').value   = '';
  document.getElementById('im-bairro').value   = '';
  document.getElementById('im-preco-min').value = '';
  document.getElementById('im-preco-max').value = '';
  document.querySelectorAll('.im-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  imRenderizar(_todosImoveis);
}

// ── Renderizar cards ───────────────────────────────────────────────
function imRenderizar(lista) {
  const grid  = document.getElementById('im-grid');
  const count = document.getElementById('im-count');

  count.textContent = lista.length === 0
    ? 'Nenhum imóvel encontrado'
    : lista.length === 1 ? '1 imóvel encontrado'
    : `${lista.length} imóveis encontrados`;

  if (!lista.length) {
    grid.innerHTML = `
      <div class="im-empty">
        <div>🏘️</div>
        <div>Nenhum imóvel encontrado com esses filtros.<br>
        <button onclick="imLimpar()" style="margin-top:14px;padding:9px 22px;border-radius:20px;border:1px solid rgba(255,255,255,.25);background:transparent;color:rgba(255,255,255,.6);cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600">
          Limpar filtros
        </button></div>
      </div>`;
    return;
  }

  grid.innerHTML = lista.map(im => {
    const fotos  = (im.fotos||'').split(/[\n,]+/).map(u=>u.trim()).filter(u=>u.length>6);
    const capa   = fotos.length
      ? `<img src="${fotos[0]}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
      : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:56px;opacity:.3">${TYPE_ICONS[im.tipo]||'🏠'}</div>`;
    const badgeCls = im.modal==='Locação' ? 'badge-aluguel' : im.destaque==='Sim' ? 'badge-novo' : 'badge-venda';
    const badgeTxt = im.modal==='Locação' ? 'Aluguel' : im.destaque==='Sim' ? '✓ Destaque' : 'Venda';
    const waNum = '5535999999999';
    const waMsg = encodeURIComponent(`Olá, tenho interesse no imóvel: ${im.titulo}. Pode me dar mais informações?`);
    const json  = JSON.stringify(im).replace(/'/g,"&#39;").replace(/"/g,'&quot;');

    return `
    <div class="im-card pcard" onclick="imModalAbrir(this)" data-im="${json}" style="display:flex">
      <div class="im-card-img pcard-img">
        <div class="pcard-img-bg"></div>
        ${capa}
        <span class="pcard-badge ${badgeCls}">${badgeTxt}</span>
        <div class="pcard-verified">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" stroke="#38bdf8" stroke-width=".8"/><path d="M2.5 5.2L4 7L7.5 3" stroke="#38bdf8" stroke-width="1" stroke-linecap="round"/></svg>
          Verificado
        </div>
      </div>
      <div class="pcard-body" style="flex:1">
        <div class="pcard-cat">${TYPE_LABELS[im.tipo]||im.tipo}${im.bairro ? ' · '+im.bairro : ''}</div>
        <div class="pcard-name">${im.titulo}</div>
        <div class="pcard-loc">📍 ${[im.bairro, im.cidade].filter(Boolean).join(', ') || im.cidade || '—'}</div>
        <div class="pcard-div"></div>
        <div class="pcard-foot">
          <div class="pcard-price">R$ ${im.valor||'—'}</div>
          <div class="pcard-specs">
            ${im.quartos && im.quartos!=='-' ? `<span class="pcs">🛏 ${im.quartos}</span>` : ''}
            ${im.banheiros && im.banheiros!=='-' ? `<span class="pcs">🚿 ${im.banheiros}</span>` : ''}
            ${im.vagas && im.vagas!=='-' ? `<span class="pcs">🚗 ${im.vagas}</span>` : ''}
            ${im.area ? `<span class="pcs">📐 ${im.area}</span>` : ''}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;padding:0 16px 16px">
        <button class="im-btn-detalhe" onclick="event.stopPropagation();imModalAbrir(this.closest('.im-card'))">Ver detalhes</button>
        <a class="im-btn-interesse site-wa-link" href="https://wa.me/${waNum}?text=${waMsg}" target="_blank" onclick="event.stopPropagation()">
          Tenho interesse
        </a>
      </div>
    </div>`;
  }).join('');
}

// ── Modal de detalhe ───────────────────────────────────────────────
function imModalAbrir(card) {
  let im;
  try { im = JSON.parse(card.dataset.im.replace(/&quot;/g,'"')); } catch(e) { return; }

  _galFotos = (im.fotos||'').split(/[\n,]+/).map(u=>u.trim()).filter(u=>u.length>6);
  _galIdx   = 0;

  // badge
  const badgeCls = im.modal==='Locação' ? 'badge-aluguel' : im.destaque==='Sim' ? 'badge-novo' : 'badge-venda';
  const badgeTxt = im.modal==='Locação' ? 'Aluguel' : im.destaque==='Sim' ? '✓ Destaque' : 'Venda';
  document.getElementById('imModalBadge').innerHTML = `<span class="pcard-badge ${badgeCls}">${badgeTxt}</span>`;

  // galeria
  _imGalRender();
  document.getElementById('imGalCounter').style.display = _galFotos.length > 1 ? 'block' : 'none';

  // conteúdo
  document.getElementById('imModalCat').textContent    = `${TYPE_LABELS[im.tipo]||im.tipo} · ${im.modal||'Venda'}`;
  document.getElementById('imModalTitle').textContent  = im.titulo || '—';
  document.getElementById('imModalLoc').textContent    = '📍 ' + [im.bairro, im.cidade].filter(Boolean).join(', ');
  document.getElementById('imModalPrice').textContent  = 'R$ ' + (im.valor || '—');

  // specs
  const specs = [];
  if (im.quartos   && im.quartos!=='-')   specs.push(`<div class="im-modal-spec">🛏 <span>${im.quartos} quarto${im.quartos!=='1'?'s':''}</span></div>`);
  if (im.banheiros && im.banheiros!=='-') specs.push(`<div class="im-modal-spec">🚿 <span>${im.banheiros} banheiro${im.banheiros!=='1'?'s':''}</span></div>`);
  if (im.vagas     && im.vagas!=='-')     specs.push(`<div class="im-modal-spec">🚗 <span>${im.vagas} vaga${im.vagas!=='1'?'s':''}</span></div>`);
  if (im.area)                             specs.push(`<div class="im-modal-spec">📐 <span>${im.area}</span></div>`);
  document.getElementById('imModalSpecs').innerHTML = specs.join('') || '<span style="font-size:13px;color:rgba(255,255,255,.3)">Especificações não informadas</span>';

  document.getElementById('imModalDesc').textContent = im.descricao || '';
  document.getElementById('imModalDesc').style.display = im.descricao ? 'block' : 'none';

  // botão WA
  const waNum = '5535999999999';
  const waMsg = encodeURIComponent(`Olá, tenho interesse no imóvel: ${im.titulo}. Pode me dar mais informações?`);
  document.getElementById('imModalWa').href = `https://wa.me/${waNum}?text=${waMsg}`;

  document.getElementById('imModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function _imGalRender() {
  const wrap = document.getElementById('imGaleriaImg');
  if (_galFotos.length) {
    wrap.innerHTML = `<img src="${_galFotos[_galIdx]}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`;
  } else {
    wrap.innerHTML = `<span style="font-size:72px;opacity:.3">${'🏠'}</span>`;
  }
  const counter = document.getElementById('imGalCounter');
  if (counter) counter.textContent = `${_galIdx+1} / ${_galFotos.length}`;
}

function imGalNav(dir) {
  if (!_galFotos.length) return;
  _galIdx = (_galIdx + dir + _galFotos.length) % _galFotos.length;
  _imGalRender();
}

function imModalFechar(e) {
  if (e && e.target !== document.getElementById('imModal')) return;
  document.getElementById('imModal').classList.remove('open');
  document.body.style.overflow = '';
}

// fechar com ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('imModal').classList.remove('open');
    document.body.style.overflow = '';
  }
});
