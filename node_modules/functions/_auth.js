// ═══════════════════════════════════════════════════
//  _auth.js — Autenticação JWT para Cloudflare Workers
// ═══════════════════════════════════════════════════

const encoder = new TextEncoder();

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(str) {
  return decodeURIComponent(escape(atob(str)));
}

export async function criarToken(usuario, segredo) {
  const payload = toBase64(JSON.stringify({
    usuario,
    exp: Date.now() + 8 * 60 * 60 * 1000
  }));

  const chave = await crypto.subtle.importKey(
    'raw',
    encoder.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', chave, encoder.encode(payload));
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return `${payload}.${sigBase64}`;
}

export async function verificarToken(token, segredo) {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return false;

    const chave = await crypto.subtle.importKey(
      'raw',
      encoder.encode(segredo),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    const valido = await crypto.subtle.verify('HMAC', chave, sigBytes, encoder.encode(payload));
    if (!valido) return false;

    const { exp } = JSON.parse(fromBase64(payload));
    return Date.now() < exp;
  } catch {
    return false;
  }
}

export async function autenticado(request, segredo) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return false;
  return verificarToken(header.slice(7), segredo);
}

export function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

export function naoAutorizado() {
  return json({ erro: 'Não autorizado. Faça login novamente.' }, 401);
}

