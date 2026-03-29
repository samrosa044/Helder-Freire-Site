// ═══════════════════════════════════════════════════
//  /api/leads — Leads de clientes buscando imóvel
//
//  POST /api/leads     → registra lead (público)
//  GET  /api/leads     → lista leads (admin)
// ═══════════════════════════════════════════════════
import { autenticado, json, naoAutorizado } from '../_auth.js';

// ── POST — Registra novo lead (público) ───────────
export async function onRequestPost({ request, env }) {
  try {
    const d = await request.json();

    if (!d.nome || !d.whatsapp) {
      return json({ erro: 'Nome e WhatsApp são obrigatórios' }, 400);
    }

    await ( env.DB || env.helder_freire_imoveis ).prepare(`
      INSERT INTO leads
        (nome, whatsapp, email, tipo_imovel, finalidade,
         valor_maximo, quartos_minimo, bairro, observacoes,
         como_contatar, prazo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      d.nome, d.whatsapp, d.email || '',
      d.tipo_imovel || '', d.finalidade || '',
      d.valor_maximo || '', d.quartos_minimo || '',
      d.bairro || '', d.observacoes || '',
      d.como_contatar || '', d.prazo || ''
    ).run();

    await ( env.DB || env.helder_freire_imoveis ).prepare(
      `INSERT INTO auditoria (tipo, mensagem) VALUES ('info', ?)`
    ).bind(`Novo lead: ${d.nome} buscando ${d.tipo_imovel || 'imóvel'}`).run();

    return json({ sucesso: true }, 201);
  } catch (e) {
    return json({ erro: 'Erro ao salvar contato' }, 500);
  }
}

// ── GET — Lista leads (admin) ────────────────────
export async function onRequestGet({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();

  try {
    const { results } = await ( env.DB || env.helder_freire_imoveis ).prepare(
      `SELECT * FROM leads ORDER BY criado_em DESC`
    ).all();

    return json(results);
  } catch (e) {
    return json({ erro: 'Erro ao buscar leads' }, 500);
  }
}