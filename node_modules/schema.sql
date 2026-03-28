-- ═══════════════════════════════════════════════════
--  HELDER FREIRE IMÓVEIS — Schema D1
--  Rodar com: npm run db:init
-- ═══════════════════════════════════════════════════

-- ─── Imóveis ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imoveis (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo        TEXT NOT NULL,                       -- casa, apartamento, fazenda, terreno, comercial, aluguel
  titulo      TEXT NOT NULL,
  endereco    TEXT,
  cidade      TEXT DEFAULT 'Passos',
  valor       TEXT,
  area        TEXT,
  quartos     TEXT,
  vagas       TEXT,
  modal       TEXT DEFAULT 'Venda',               -- Venda, Locação, Arrendamento
  descricao   TEXT,
  fotos       TEXT,                               -- link Google Drive / R2
  status      TEXT DEFAULT 'ativo',              -- ativo, inativo
  destaque    TEXT DEFAULT 'Não',
  criado_em   TEXT DEFAULT (datetime('now', 'localtime')),
  atualizado_em TEXT
);

-- ─── Cadastros pendentes (formulários públicos) ───────────────────
CREATE TABLE IF NOT EXISTS pendentes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  formulario      TEXT,                           -- 'cliente' ou 'proprietario'
  tipo_imovel     TEXT,
  modalidade      TEXT,
  nome            TEXT NOT NULL,
  whatsapp        TEXT NOT NULL,
  email           TEXT,
  proprietario    TEXT,
  endereco        TEXT,
  cidade          TEXT DEFAULT 'Passos',
  valor           TEXT,
  area            TEXT,
  quartos         TEXT,
  suites          TEXT,
  vagas           TEXT,
  fotos           TEXT,
  descricao       TEXT,
  dados_extras    TEXT,                           -- JSON com campos específicos por tipo
  status          TEXT DEFAULT 'pendente',       -- pendente, aprovado, rejeitado
  motivo_rejeicao TEXT,
  criado_em       TEXT DEFAULT (datetime('now', 'localtime')),
  atualizado_em   TEXT
);

-- ─── Leads / Clientes buscando imóvel ────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT NOT NULL,
  whatsapp        TEXT NOT NULL,
  email           TEXT,
  tipo_imovel     TEXT,
  finalidade      TEXT,
  valor_maximo    TEXT,
  quartos_minimo  TEXT,
  bairro          TEXT,
  observacoes     TEXT,
  como_contatar   TEXT,
  prazo           TEXT,
  criado_em       TEXT DEFAULT (datetime('now', 'localtime'))
);

-- ─── Auditoria ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo       TEXT,                               -- approve, reject, add, edit, delete, info
  mensagem   TEXT,
  usuario    TEXT DEFAULT 'Admin',
  criado_em  TEXT DEFAULT (datetime('now', 'localtime'))
);

-- ─── Dados demo ──────────────────────────────────────────────────
INSERT OR IGNORE INTO imoveis (id, tipo, titulo, endereco, cidade, valor, area, quartos, vagas, modal, descricao, status, destaque) VALUES
(1, 'casa',        'Casa ampla com piscina — Bela Vista',   'Rua das Flores, 120 — Bela Vista',     'Passos', '380.000',   '180 m²',  '3', '2', 'Venda', 'Casa espaçosa com piscina, churrasqueira e quintal arborizado. Localização privilegiada.', 'ativo', 'Sim'),
(2, 'fazenda',     'Fazenda Boa Esperança — 150ha',         'Estrada rural, 35km de Passos',         'Passos', '2.800.000', '150 ha',  '-', '-', 'Venda', 'Fazenda de pecuária com casa sede, curral, açude, 100ha de pastagem e 30ha de reserva.', 'ativo', 'Sim'),
(3, 'apartamento', 'Apartamento 2 quartos — Centro',        'Av. 17 de Agosto, 450 — Centro',        'Passos', '220.000',   '72 m²',   '2', '1', 'Venda', 'Apartamento moderno no centro de Passos, com elevador e portaria.', 'ativo', 'Não');

INSERT OR IGNORE INTO auditoria (tipo, mensagem) VALUES ('info', 'Banco de dados iniciado com sucesso');