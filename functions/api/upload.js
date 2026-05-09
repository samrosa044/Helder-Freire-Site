// ═══════════════════════════════════════════════════
//  /api/upload — Upload de imagens para Cloudflare R2
//
//  POST /api/upload   → recebe multipart/form-data
//                       campo: files[] (File objects)
//                       retorno: { sucesso: true, urls: [...] }
//
//  Requer:
//    - Binding R2: FOTOS_BUCKET (wrangler.toml → [[r2_buckets]])
//    - Var: R2_PUBLIC_URL  (URL pública do bucket, ex: https://fotos.helderfreire.com.br)
//    - JWT auth: Authorization: Bearer <token>
// ═══════════════════════════════════════════════════
import { autenticado, naoAutorizado } from '../_auth.js';

// Tipos de imagem aceitos
const TIPOS_ACEITOS = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

// Extensões aceitas (fallback quando o browser não envia MIME correto)
const EXT_ACEITAS = /\.(jpg|jpeg|png|webp|heic|heif)$/i;

// Tamanho máximo por arquivo: 10MB (após compressão client-side)
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function respJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ── OPTIONS — preflight CORS ──────────────────────────────────────
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ── POST — Upload de arquivos ─────────────────────────────────────
export async function onRequestPost({ request, env }) {
  // 1. Autenticação obrigatória
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();

  // 2. Verifica se R2 está configurado
  const R2 = env.FOTOS_BUCKET;
  if (!R2) {
    return respJson({
      erro: 'Armazenamento de imagens (R2) não configurado. Adicione [[r2_buckets]] no wrangler.toml e crie o bucket.',
    }, 503);
  }

  // 3. URL pública do bucket (configure em wrangler.toml [vars] ou como secret)
  const baseUrl = (env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!baseUrl) {
    return respJson({
      erro: 'R2_PUBLIC_URL não configurada. Defina a URL pública do bucket nas vars do wrangler.',
    }, 503);
  }

  // 4. Lê o multipart/form-data
  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return respJson({ erro: 'Falha ao ler multipart/form-data: ' + e.message }, 400);
  }

  const entries = formData.getAll('files');
  if (!entries.length) {
    return respJson({ erro: 'Nenhum arquivo enviado. Use o campo "files" no FormData.' }, 400);
  }

  const urls = [];
  const erros = [];

  for (const entry of entries) {
    // Garante que é um File (não uma string)
    if (!(entry instanceof File) && typeof entry !== 'object') {
      erros.push('Item inválido ignorado.');
      continue;
    }

    const file   = entry;
    const nome   = file.name || 'foto.jpg';
    const tipo   = file.type || _inferirTipo(nome);
    const tamanho = file.size || 0;

    // Valida tipo
    if (!TIPOS_ACEITOS.has(tipo) && !EXT_ACEITAS.test(nome)) {
      erros.push(`Tipo não suportado: ${nome} (${tipo})`);
      continue;
    }

    // Valida tamanho
    if (tamanho > MAX_SIZE_BYTES) {
      erros.push(`Arquivo muito grande: ${nome} (${(tamanho / 1024 / 1024).toFixed(1)}MB > 10MB)`);
      continue;
    }

    try {
      const buffer = await file.arrayBuffer();
      if (!buffer.byteLength) {
        erros.push(`Arquivo vazio: ${nome}`);
        continue;
      }

      // Gera chave única no R2
      const ext = _extensao(tipo, nome);
      const ts  = Date.now();
      const uid = Math.random().toString(36).slice(2, 9);
      const key = `imoveis/${ts}-${uid}.${ext}`;

      // Persiste no R2
      await R2.put(key, buffer, {
        httpMetadata: {
          contentType: tipo === 'image/heic' || tipo === 'image/heif'
            ? 'image/jpeg'  // HEIC foi convertido a JPEG pelo canvas no frontend
            : tipo,
          cacheControl: 'public, max-age=31536000, immutable',
        },
        customMetadata: {
          originalName:  nome,
          uploadedAt:    new Date().toISOString(),
          sizeBytes:     String(tamanho),
        },
      });

      urls.push(`${baseUrl}/${key}`);
    } catch (e) {
      erros.push(`Erro ao salvar ${nome}: ${e.message}`);
    }
  }

  if (!urls.length) {
    return respJson({
      erro: 'Nenhuma imagem foi salva.' + (erros.length ? ' Erros: ' + erros.join('; ') : ''),
    }, 422);
  }

  return respJson({ sucesso: true, urls, erros: erros.length ? erros : undefined }, 201);
}

// ── Helpers ───────────────────────────────────────────────────────
function _inferirTipo(nome) {
  const ext = (nome.split('.').pop() || '').toLowerCase();
  const mapa = {
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return mapa[ext] || 'image/jpeg';
}

function _extensao(tipo, nome) {
  // HEIC/HEIF são convertidos a JPEG pelo canvas no frontend
  if (tipo === 'image/heic' || tipo === 'image/heif') return 'jpg';
  const mapa = {
    'image/jpeg': 'jpg',
    'image/jpg':  'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
  };
  if (mapa[tipo]) return mapa[tipo];
  // fallback: pega da extensão do arquivo
  const ext = (nome.split('.').pop() || 'jpg').toLowerCase();
  return ['jpg','jpeg','png','webp'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'jpg';
}
