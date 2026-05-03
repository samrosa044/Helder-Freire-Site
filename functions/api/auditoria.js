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
      const DB = env.DB || env.helder_freire_imoveis;
      const [ativos, rascunhos, leads] = await Promise.all([
        DB.prepare(`SELECT COUNT(*) as n FROM imoveis WHERE status = 'ativo'`).first(),
        DB.prepare(`SELECT COUNT(*) as n FROM imoveis WHERE status = 'rascunho'`).first(),
        DB.prepare(`SELECT COUNT(*) as n FROM leads`).first(),
      ]);

      return json({
        imoveis_ativos: ativos?.n    || 0,
        rascunhos:      rascunhos?.n || 0,
        leads:          leads?.n     || 0,
      });
    }

    // ─ Log de auditoria ───────────────────────────
    const DB2 = env.DB || env.helder_freire_imoveis;
    const { results } = await DB2.prepare(
      `SELECT * FROM auditoria ORDER BY criado_em DESC LIMIT 50`
    ).all();

    return json(results);
  } catch (e) {
    return json({ erro: 'Erro ao buscar auditoria' }, 500);
  }
}