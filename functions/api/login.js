// ═══════════════════════════════════════════════════
//  /api/login — Autenticação do Painel Admin
//
//  POST /api/login  → { usuario, senha } → { token }
// ═══════════════════════════════════════════════════
import { criarToken, json } from '../_auth.js';

export async function onRequestPost({ request, env }) {
  try {
    const { usuario, senha } = await request.json();

    const adminUser = env.ADMIN_USER || 'admin';
    const adminPass = env.ADMIN_PASS;
    const jwtSecret = env.JWT_SECRET;

    // Verifica se os segredos estão configurados
    if (!adminPass || !jwtSecret) {
      return json(
        { erro: 'Servidor não configurado. Defina JWT_SECRET e ADMIN_PASS via wrangler secret.' },
        500
      );
    }

    // Valida credenciais
    if (usuario !== adminUser || senha !== adminPass) {
      return json({ erro: 'Usuário ou senha incorretos' }, 401);
    }

    const token = await criarToken(usuario, jwtSecret);
    return json({ token });

  } catch (e) {
    return json({ erro: 'Erro interno no servidor' }, 500);
  }
}

// Suporte a CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
