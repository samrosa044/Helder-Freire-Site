// ═══════════════════════════════════════════════════
//  /r2/[...path] — Proxy público para imagens no R2
//
//  GET /r2/imoveis/1234-abc.jpg  → serve o arquivo do R2
//
//  Por que este proxy existe?
//  • Elimina a necessidade de configurar URL pública no bucket R2
//  • Imagens servidas no mesmo domínio do site (sem CORS)
//  • Cache via Cloudflare CDN automático
//  • Acesso controlado: apenas leitura pública de imagens
// ═══════════════════════════════════════════════════

// Cache de 1 ano para imagens (imutáveis por chave única)
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

// Tipos de conteúdo permitidos (segurança: só serve imagens)
const TIPOS_IMAGEM = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'image/gif',  'image/svg+xml', 'image/heic',
]);

export async function onRequestGet({ request, env, params }) {
  const R2 = env.FOTOS_BUCKET;

  // R2 não configurado
  if (!R2) {
    return new Response('Armazenamento não configurado', { status: 503 });
  }

  // Reconstrói a chave do R2 a partir dos segmentos da URL
  // params.path é um array ex: ['imoveis', '1234-abc.jpg']
  const segments = params.path;
  if (!segments || !segments.length) {
    return new Response('Caminho inválido', { status: 400 });
  }
  const key = segments.join('/');

  // Segurança: bloqueia path traversal
  if (key.includes('..') || key.startsWith('/')) {
    return new Response('Acesso negado', { status: 403 });
  }

  // Tenta servir do cache HTTP primeiro
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cache    = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // Busca o objeto no R2
  let objeto;
  try {
    objeto = await R2.get(key);
  } catch (e) {
    console.error('[r2-proxy] Erro ao buscar:', key, e.message);
    return new Response('Erro ao buscar imagem', { status: 500 });
  }

  if (!objeto) {
    return new Response('Imagem não encontrada', { status: 404 });
  }

  // Determina o Content-Type
  const contentType = objeto.httpMetadata?.contentType || _inferirTipo(key);

  // Segurança: garante que é realmente uma imagem
  if (!TIPOS_IMAGEM.has(contentType.split(';')[0].trim())) {
    return new Response('Tipo não permitido', { status: 415 });
  }

  // Monta a resposta
  const headers = new Headers({
    'Content-Type':  contentType,
    'Cache-Control': CACHE_CONTROL,
    'ETag':          objeto.etag || '',
    'Last-Modified': objeto.uploaded?.toUTCString() || '',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  });

  // Suporte a ETag / If-None-Match (304 Not Modified)
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch && objeto.etag && ifNoneMatch === objeto.etag) {
    return new Response(null, { status: 304, headers });
  }

  const resposta = new Response(objeto.body, { status: 200, headers });

  // Salva no cache do Cloudflare CDN para requests futuros
  // (não aguarda — faz em background)
  event?.waitUntil?.(cache.put(cacheKey, resposta.clone()));

  return resposta;
}

// ── Helpers ───────────────────────────────────────────────────────
function _inferirTipo(key) {
  const ext = (key.split('.').pop() || '').toLowerCase();
  const mapa = {
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    webp: 'image/webp',
    gif:  'image/gif',
    svg:  'image/svg+xml',
    heic: 'image/heic',
    heif: 'image/heic',
  };
  return mapa[ext] || 'application/octet-stream';
}
