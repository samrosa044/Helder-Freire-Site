// ═══════════════════════════════════════════════════
//  /api/config — Configurações do site
//
//  GET  /api/config  → retorna config pública (whatsapp, email, instagram)
//  PUT  /api/config  → atualiza config (admin)
// ═══════════════════════════════════════════════════
import { autenticado, json, naoAutorizado } from '../_auth.js';

function getDB(env) {
  return env.DB || env.helder_freire_imoveis;
}

async function ensureTable(DB) {
  try {
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT
      )
    `).run();
  } catch (_) {}
}

// ── GET — Retorna configurações públicas ──────────────────────────
export async function onRequestGet({ env }) {
  const DB = getDB(env);
  if (!DB) return json({ whatsapp: '', email: '', instagram: '' });

  try {
    await ensureTable(DB);
    const { results } = await DB.prepare('SELECT chave, valor FROM configuracoes').all();
    const cfg = {};
    for (const r of results) cfg[r.chave] = r.valor;
    return json({
      whatsapp:  cfg.whatsapp  || 'https://wa.me/qr/XGTDJPC5WY2QM1',
      email:     cfg.email     || '',
      instagram: cfg.instagram || '',
    });
  } catch (e) {
    return json({ whatsapp: 'https://wa.me/qr/XGTDJPC5WY2QM1', email: '', instagram: '' });
  }
}

// ── PUT — Atualiza configurações (admin) ──────────────────────────
export async function onRequestPut({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();

  const DB = getDB(env);
  if (!DB) return json({ erro: 'Banco não configurado' }, 500);

  try {
    await ensureTable(DB);
    const d = await request.json();

    const campos = ['whatsapp', 'email', 'instagram'];
    for (const chave of campos) {
      if (d[chave] !== undefined) {
        await DB.prepare(
          'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor'
        ).bind(chave, d[chave] || '').run();
      }
    }

    // Atualiza senha se informada
    if (d.nova_senha && d.nova_senha.trim()) {
      const { autenticarSenha } = await import('../_auth.js').catch(() => ({}));
      // Salva nova senha como variável de ambiente não é possível via D1,
      // mas podemos salvar como config especial (com hash simples)
      const encoder = new TextEncoder();
      const data = encoder.encode(d.nova_senha);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      await DB.prepare(
        'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor'
      ).bind('admin_pass_hash', hashHex).run();
    }

    await DB.prepare(
      "INSERT INTO auditoria (tipo, mensagem) VALUES ('edit', 'Configurações do site atualizadas')"
    ).run();

    return json({ sucesso: true });
  } catch (e) {
    return json({ erro: 'Erro ao salvar configurações: ' + e.message }, 500);
  }
}
