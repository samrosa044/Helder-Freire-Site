// ═══════════════════════════════════════════════════
//  /api/upload — Upload de imagens para Cloudflare R2
//
//  POST /api/upload   → recebe multipart/form-data
//                       campo: files[] (File objects)
//                       retorno: { sucesso: true, urls: [...] }
//
//  Requer:
//    - Binding R2: FOTOS_BUCKET (wrangler.toml → [[r2_buckets]])
//    - JWT auth: Authorization: Bearer <token>
//
//  Nota: URLs retornadas usam o proxy /r2/[path] no próprio Worker.
//        NÃO é necessário R2_PUBLIC_URL nem acesso público no bucket.
// ═══════════════════════════════════════════════════
import { autenticado, naoAutorizado } from '../_auth.js';

const TIPOS_ACEITOS = new Set(['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']);
const EXT_ACEITAS   = /\.(jpg|jpeg|png|webp|heic|heif)$/i;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function respJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age':       '86400',
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();

  const R2 = env.FOTOS_BUCKET;
  if (!R2) return respJson({ erro: 'R2 não configurado. Verifique [[r2_buckets]] no wrangler.toml.' }, 503);

  // URL base = proxy /r2/ no mesmo domínio do site
  // Ex: https://helderfreireimoveis.com.br/r2/imoveis/1234-abc.jpg
  // Sem CORS, sem OpaqueResponseBlocking, bucket pode ser privado.
  const baseUrl = new URL(request.url).origin + '/r2';

  let formData;
  try { formData = await request.formData(); }
  catch (e) { return respJson({ erro: 'Falha ao ler multipart: ' + e.message }, 400); }

  const entries = formData.getAll('files');
  if (!entries.length) return respJson({ erro: 'Nenhum arquivo enviado (campo: files).' }, 400);

  const urls = [], erros = [];

  for (const file of entries) {
    if (!file || typeof file !== 'object') { erros.push('Item inválido.'); continue; }

    const nome    = file.name || 'foto.jpg';
    const tipo    = file.type || _inferirTipo(nome);
    const tamanho = file.size || 0;

    if (!TIPOS_ACEITOS.has(tipo) && !EXT_ACEITAS.test(nome)) {
      erros.push(`Tipo não suportado: ${nome} (${tipo})`); continue;
    }
    if (tamanho > MAX_SIZE_BYTES) {
      erros.push(`Muito grande: ${nome} (${(tamanho/1024/1024).toFixed(1)}MB)`); continue;
    }

    try {
      const buffer = await file.arrayBuffer();
      if (!buffer.byteLength) { erros.push(`Vazio: ${nome}`); continue; }

      const ext = _extensao(tipo, nome);
      const key = `imoveis/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;

      await R2.put(key, buffer, {
        httpMetadata: {
          contentType:  (tipo === 'image/heic' || tipo === 'image/heif') ? 'image/jpeg' : tipo,
          cacheControl: 'public, max-age=31536000, immutable',
        },
        customMetadata: { originalName: nome, uploadedAt: new Date().toISOString(), sizeBytes: String(tamanho) },
      });

      urls.push(`${baseUrl}/${key}`);
    } catch (e) {
      erros.push(`Erro ao salvar ${nome}: ${e.message}`);
    }
  }

  if (!urls.length) return respJson({ erro: 'Nenhuma imagem salva. ' + erros.join('; ') }, 422);
  return respJson({ sucesso: true, urls, erros: erros.length ? erros : undefined }, 201);
}

function _inferirTipo(nome) {
  const ext = (nome.split('.').pop() || '').toLowerCase();
  return { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', heic:'image/heic', heif:'image/heif' }[ext] || 'image/jpeg';
}

function _extensao(tipo, nome) {
  if (tipo === 'image/heic' || tipo === 'image/heif') return 'jpg';
  const m = { 'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp' };
  if (m[tipo]) return m[tipo];
  const ext = (nome.split('.').pop() || 'jpg').toLowerCase();
  return ['jpg','jpeg','png','webp'].includes(ext) ? (ext==='jpeg'?'jpg':ext) : 'jpg';
}
