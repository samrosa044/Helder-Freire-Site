// ═══════════════════════════════════════════════════
//  /r2/[...path] — Proxy público para imagens no R2
//
//  GET /r2/imoveis/1234-abc.jpg  → serve o arquivo do R2
//
//  Vantagens vs URL pública do bucket:
//  • Mesmo domínio do site → zero CORS / zero OpaqueResponseBlocking
//  • Bucket pode ser PRIVADO (não precisa de "Public Access" no R2)
//  • Cache CDN automático do Cloudflare
//  • Sem configuração de R2_PUBLIC_URL
// ═══════════════════════════════════════════════════

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

const TIPOS_IMAGEM = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'image/gif',  'image/svg+xml', 'image/heic',
]);

export async function onRequestGet({ request, env, params }) {
  const R2 = env.FOTOS_BUCKET;
  if (!R2) return new Response('Storage não configurado', { status: 503 });

  // Reconstrói a chave: params.path = ['imoveis', '1234-abc.jpg']
  const segments = params.path;
  if (!segments?.length) return new Response('Caminho inválido', { status: 400 });
  const key = segments.join('/');

  // Segurança: bloqueia path traversal
  if (key.includes('..') || key.startsWith('/')) {
    return new Response('Acesso negado', { status: 403 });
  }

  // Cache HTTP — retorna resposta cacheada se disponível
  const cache    = caches.default;
  const cacheKey = new Request(request.url);
  const cached   = await cache.match(cacheKey);
  if (cached) return cached;

  // Busca no R2
  let objeto;
  try {
    objeto = await R2.get(key);
  } catch (e) {
    return new Response('Erro ao buscar imagem: ' + e.message, { status: 500 });
  }
  if (!objeto) return new Response('Imagem não encontrada', { status: 404 });

  const contentType = objeto.httpMetadata?.contentType || _inferirTipo(key);

  // Garante que é uma imagem (segurança)
  if (!TIPOS_IMAGEM.has(contentType.split(';')[0].trim())) {
    return new Response('Tipo não permitido', { status: 415 });
  }

  const headers = new Headers({
    'Content-Type':               contentType,
    'Cache-Control':              CACHE_CONTROL,
    'ETag':                       objeto.etag || '',
    'Access-Control-Allow-Origin':'*',
    'X-Content-Type-Options':     'nosniff',
  });

  // Suporte a ETag → 304 Not Modified
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch && objeto.etag && ifNoneMatch === objeto.etag) {
    return new Response(null, { status: 304, headers });
  }

  const resp = new Response(objeto.body, { status: 200, headers });

  // Salva no cache do Cloudflare CDN para requests futuros
  try { await cache.put(cacheKey, resp.clone()); } catch (_) {}

  return resp;
}

function _inferirTipo(key) {
  const ext = (key.split('.').pop() || '').toLowerCase();
  const mapa = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png',  webp: 'image/webp',
    gif: 'image/gif',  svg:  'image/svg+xml',
    heic:'image/heic', heif: 'image/heic',
  };
  return mapa[ext] || 'application/octet-stream';
}
