// ═══════════════════════════════════════════════════
//  /api/auditoria — Log de auditoria e KPIs do admin
//
//  GET /api/auditoria        → últimas 50 ações (admin)
//  GET /api/auditoria?kpis=1 → contadores do dashboard (admin)
// ═══════════════════════════════════════════════════
import { autenticado, json, naoAutorizado } from '../_auth.js';

export async function onRequestGet({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();

  const url  = new URL(request.url);
  const kpis = url.searchParams.get('kpis');

  try {
    // ─ KPIs do dashboard ──────────────────────────
    if (kpis) {
      const [ativos, pendentes, leads, rejeitados] = await Promise.all([
        env.DB.prepare(`SELECT COUNT(*) as n FROM imoveis WHERE status = 'ativo'`).first(),
        env.DB.prepare(`SELECT COUNT(*) as n FROM pendentes WHERE status = 'pendente'`).first(),
        env.DB.prepare(`SELECT COUNT(*) as n FROM leads`).first(),
        env.DB.prepare(`SELECT COUNT(*) as n FROM pendentes WHERE status = 'rejeitado'`).first(),
      ]);

      return json({
        imoveis_ativos:   ativos?.n    || 0,
        pendentes:        pendentes?.n || 0,
        leads:            leads?.n     || 0,
        rejeitados:       rejeitados?.n || 0,
      });
    }

    // ─ Log de auditoria ───────────────────────────
    const { results } = await env.DB.prepare(
      `SELECT * FROM auditoria ORDER BY criado_em DESC LIMIT 50`
    ).all();

    return json(results);
  } catch (e) {
    return json({ erro: 'Erro ao buscar auditoria' }, 500);
  }
}