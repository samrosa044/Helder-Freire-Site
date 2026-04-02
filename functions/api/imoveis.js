// ═══════════════════════════════════════════════════
//  /api/imoveis — CRUD de Imóveis
//
//  GET    /api/imoveis          → lista imóveis ativos (público)
//  POST   /api/imoveis          → adiciona imóvel (admin)
//  PUT    /api/imoveis          → edita imóvel (admin)
//  DELETE /api/imoveis?id=123   → remove imóvel (admin)
// ═══════════════════════════════════════════════════
import { autenticado, json, naoAutorizado } from '../_auth.js';

// ── GET — Listagem pública ─────────────────────────────────────────
export async function onRequestGet({ request, env }) {
  const url  = new URL(request.url);
  const tipo = url.searchParams.get('tipo');
  const id   = url.searchParams.get('id');
  const all  = url.searchParams.get('all') === '1';

  try {
    if (id) {
      const imovel = await ( env.DB || env.helder_freire_imoveis ).prepare(
        'SELECT * FROM imoveis WHERE id = ?'
      ).bind(id).first();
      return imovel ? json(imovel) : json({ erro: 'Imóvel não encontrado' }, 404);
    }

    let query, result;
    if (all) {
      query = tipo && tipo !== 'todos'
        ? 'SELECT * FROM imoveis WHERE tipo = ? ORDER BY id DESC'
        : 'SELECT * FROM imoveis ORDER BY id DESC';
      result = tipo && tipo !== 'todos'
        ? await ( env.DB || env.helder_freire_imoveis ).prepare(query).bind(tipo).all()
        : await ( env.DB || env.helder_freire_imoveis ).prepare(query).all();
    } else {
      query = tipo && tipo !== 'todos'
        ? "SELECT * FROM imoveis WHERE status = 'ativo' AND tipo = ? ORDER BY id DESC"
        : "SELECT * FROM imoveis WHERE status = 'ativo' ORDER BY id DESC";
      result = tipo && tipo !== 'todos'
        ? await ( env.DB || env.helder_freire_imoveis ).prepare(query).bind(tipo).all()
        : await ( env.DB || env.helder_freire_imoveis ).prepare(query).all();
    }

    return json(result.results);
  } catch (e) {
    return json({ erro: 'Erro ao buscar imóveis' }, 500);
  }
}

// ── POST — Adicionar imóvel (admin) ───────────────
export async function onRequestPost({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();

  try {
    const d = await request.json();

    if (!d.titulo || !d.endereco || !d.valor) {
      return json({ erro: 'Título, endereço e valor são obrigatórios' }, 400);
    }

    const result = await ( env.DB || env.helder_freire_imoveis ).prepare(`
      INSERT INTO imoveis (tipo, titulo, endereco, cidade, valor, area, quartos, vagas, modal, descricao, fotos, status, destaque)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?)
    `).bind(
      d.tipo || 'casa', d.titulo, d.endereco,
      d.cidade || 'Passos', d.valor,
      d.area || '', d.quartos || '-', d.vagas || '-',
      d.modal || 'Venda', d.descricao || '',
      d.fotos || '', d.destaque || 'Não'
    ).run();

    await ( env.DB || env.helder_freire_imoveis ).prepare(
      `INSERT INTO auditoria (tipo, mensagem) VALUES ('add', ?)`
    ).bind(`Imóvel adicionado: "${d.titulo}" (${d.tipo})`).run();

    return json({ sucesso: true, id: result.meta.last_row_id }, 201);
  } catch (e) {
    return json({ erro: 'Erro ao salvar imóvel' }, 500);
  }
}

// ── PUT — Editar imóvel (admin) ───────────────────
export async function onRequestPut({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();

  try {
    const d = await request.json();
    if (!d.id) return json({ erro: 'ID obrigatório' }, 400);

    await ( env.DB || env.helder_freire_imoveis ).prepare(`
      UPDATE imoveis SET
        tipo = ?, titulo = ?, endereco = ?, cidade = ?,
        valor = ?, area = ?, quartos = ?, vagas = ?,
        modal = ?, descricao = ?, fotos = ?, status = ?,
        destaque = ?, atualizado_em = datetime('now','localtime')
      WHERE id = ?
    `).bind(
      d.tipo, d.titulo, d.endereco, d.cidade || 'Passos',
      d.valor, d.area, d.quartos, d.vagas,
      d.modal, d.descricao, d.fotos, d.status,
      d.destaque, d.id
    ).run();

    await ( env.DB || env.helder_freire_imoveis ).prepare(
      `INSERT INTO auditoria (tipo, mensagem) VALUES ('edit', ?)`
    ).bind(`Imóvel #${d.id} atualizado: "${d.titulo}"`).run();

    return json({ sucesso: true });
  } catch (e) {
    return json({ erro: 'Erro ao atualizar imóvel' }, 500);
  }
}

// ── DELETE — Remover imóvel (admin) ───────────────
export async function onRequestDelete({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();

  try {
    const url  = new URL(request.url);
    const id   = url.searchParams.get('id');
    if (!id) return json({ erro: 'ID obrigatório' }, 400);

    // Busca título para o log antes de deletar
    const imovel = await ( env.DB || env.helder_freire_imoveis ).prepare(
      `SELECT titulo FROM imoveis WHERE id = ?`
    ).bind(id).first();

    await ( env.DB || env.helder_freire_imoveis ).prepare(`DELETE FROM imoveis WHERE id = ?`).bind(id).run();

    await ( env.DB || env.helder_freire_imoveis ).prepare(
      `INSERT INTO auditoria (tipo, mensagem) VALUES ('delete', ?)`
    ).bind(`Imóvel #${id} excluído: "${imovel?.titulo || ''}"`).run();

    return json({ sucesso: true });
  } catch (e) {
    return json({ erro: 'Erro ao excluir imóvel' }, 500);
  }
}