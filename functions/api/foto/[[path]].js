// ═══════════════════════════════════════════════════
//  /api/foto/* — Serve imagens do R2 via Worker
//
//  GET /api/foto/imoveis/timestamp-uid.jpg
//  → busca a chave "imoveis/timestamp-uid.jpg" no R2
//  → retorna o binário com Content-Type correto
//
//  Vantagem: o bucket R2 fica privado (sem URL pública),
//  as imagens são servidas pelo próprio domínio do site.
// ═══════════════════════════════════════════════════

export async function onRequestGet({ request, env, params }) {
  const R2 = env.FOTOS_BUCKET;
  if (!R2) {
    return new Response('Armazenamento não configurado.', { status: 503 });
  }

  // params.path é um array de segmentos, ex: ['imoveis', 'timestamp-uid.jpg']
  const key = Array.isArray(params.path)
    ? params.path.join('/')
    : (params.path || '');

  if (!key) {
    return new Response('Chave não informada.', { status: 400 });
  }

  try {
    const obj = await R2.get(key);

    if (!obj) {
      return new Response('Imagem não encontrada.', { status: 404 });
    }

    const contentType = obj.httpMetadata?.contentType || _inferirTipo(key);

    // Cache agressivo: imagens são imutáveis (chave única por upload)
    return new Response(obj.body, {
      status: 200,
      headers: {
        'Content-Type':  contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag':          obj.etag || '',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response('Erro ao buscar imagem: ' + e.message, { status: 500 });
  }
}

// ── Preflight CORS ────────────────────────────────────────────────
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age':       '86400',
    },
  });
}

// ── Helper: infere Content-Type pela extensão ─────────────────────
function _inferirTipo(key) {
  const ext = (key.split('.').pop() || '').toLowerCase();
  const mapa = {
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    webp: 'image/webp',
  };
  return mapa[ext] || 'image/jpeg';
}
