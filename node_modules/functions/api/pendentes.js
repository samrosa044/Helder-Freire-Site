// ═══════════════════════════════════════════════════
//  /api/pendentes — Cadastros aguardando aprovação
//
//  GET  /api/pendentes              → lista (admin)
//  POST /api/pendentes              → novo cadastro (público, via formulário)
//  POST /api/pendentes?acao=aprovar → aprova e publica imóvel (admin)
//  POST /api/pendentes?acao=rejeitar → rejeita com motivo (admin)
// ═══════════════════════════════════════════════════
import { autenticado, json, naoAutorizado } from '../_auth.js';

// ── GET — Lista pendentes (admin) ─────────────────
export async function onRequestGet({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();

  try {
    const url    = new URL(request.url);
    const status = url.searchParams.get('status') || 'pendente';

    const { results } = await env.DB.prepare(
      `SELECT * FROM pendentes WHERE status = ? ORDER BY criado_em DESC`
    ).bind(status).all();

    return json(results);
  } catch (e) {
    return json({ erro: 'Erro ao buscar cadastros' }, 500);
  }
}

// ── POST — Ações e novo cadastro ─────────────────
export async function onRequestPost({ request, env }) {
  const url  = new URL(request.url);
  const acao = url.searchParams.get('acao');

  // ─ Ação: APROVAR (admin) ──────────────────────
  if (acao === 'aprovar') {
    if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
    try {
      const { id } = await request.json();
      const pend = await env.DB.prepare(
        `SELECT * FROM pendentes WHERE id = ?`
      ).bind(id).first();

      if (!pend) return json({ erro: 'Cadastro não encontrado' }, 404);

      // Marca como aprovado
      await env.DB.prepare(`
        UPDATE pendentes SET status = 'aprovado', atualizado_em = datetime('now','localtime')
        WHERE id = ?
      `).bind(id).run();

      // Publica o imóvel
      await env.DB.prepare(`
        INSERT INTO imoveis (tipo, titulo, endereco, cidade, valor, area, quartos, vagas, modal, descricao, fotos, status, destaque)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', 'Não')
      `).bind(
        pend.tipo_imovel || 'casa',
        `${pend.tipo_imovel || 'Imóvel'} — ${pend.endereco || pend.cidade || 'Passos'}`,
        pend.endereco || '', pend.cidade || 'Passos',
        pend.valor || 'A consultar', pend.area || '',
        pend.quartos || '-', pend.vagas || '-',
        pend.modalidade || 'Venda', pend.descricao || '',
        pend.fotos || ''
      ).run();

      await env.DB.prepare(
        `INSERT INTO auditoria (tipo, mensagem) VALUES ('approve', ?)`
      ).bind(`Cadastro #${id} aprovado — ${pend.tipo_imovel} de ${pend.nome}`).run();

      return json({ sucesso: true });
    } catch (e) {
      return json({ erro: 'Erro ao aprovar cadastro' }, 500);
    }
  }

  // ─ Ação: REJEITAR (admin) ─────────────────────
  if (acao === 'rejeitar') {
    if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
    try {
      const { id, motivo } = await request.json();
      const pend = await env.DB.prepare(
        `SELECT nome, tipo_imovel FROM pendentes WHERE id = ?`
      ).bind(id).first();

      await env.DB.prepare(`
        UPDATE pendentes
        SET status = 'rejeitado', motivo_rejeicao = ?, atualizado_em = datetime('now','localtime')
        WHERE id = ?
      `).bind(motivo || '', id).run();

      await env.DB.prepare(
        `INSERT INTO auditoria (tipo, mensagem) VALUES ('reject', ?)`
      ).bind(`Cadastro #${id} rejeitado — ${pend?.tipo_imovel} de ${pend?.nome}. Motivo: ${motivo || 'não informado'}`).run();

      return json({ sucesso: true });
    } catch (e) {
      return json({ erro: 'Erro ao rejeitar cadastro' }, 500);
    }
  }

  // ─ Sem ação: novo cadastro público ───────────────
  try {
    const d = await request.json();

    if (!d.nome || !d.whatsapp) {
      return json({ erro: 'Nome e WhatsApp são obrigatórios' }, 400);
    }

    // Campos extras específicos por tipo (fazenda, terreno, etc.)
    const extras = JSON.stringify(d.dados_extras || {});

    await env.DB.prepare(`
      INSERT INTO pendentes
        (formulario, tipo_imovel, modalidade, nome, whatsapp, email,
         proprietario, endereco, cidade, valor, area, quartos, suites,
         vagas, fotos, descricao, dados_extras)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      d.formulario || 'proprietario',
      d.tipo_imovel || '', d.modalidade || 'Venda',
      d.nome, d.whatsapp, d.email || '',
      d.proprietario || '', d.endereco || '',
      d.cidade || 'Passos', d.valor || '',
      d.area || '', d.quartos || '', d.suites || '',
      d.vagas || '', d.fotos || '',
      d.descricao || '', extras
    ).run();

    await env.DB.prepare(
      `INSERT INTO auditoria (tipo, mensagem) VALUES ('info', ?)`
    ).bind(`Novo cadastro recebido (${d.tipo_imovel}) de ${d.nome}`).run();

    return json({ sucesso: true }, 201);
  } catch (e) {
    return json({ erro: 'Erro ao salvar cadastro' }, 500);
  }
}