-- ═══════════════════════════════════════════════════
--  MIGRATION — Idempotente (pode rodar sobre schema.sql sem erros)
-- ═══════════════════════════════════════════════════

-- Tabela de configurações (caso não exista — schema.sql antigo não a tinha)
CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT
);

-- Configuração inicial do WhatsApp
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES
  ('whatsapp',  'https://wa.me/qr/XGTDJPC5WY2QM1'),
  ('email',     ''),
  ('instagram', '');

-- NOTA: ALTER TABLE ADD COLUMN falha se a coluna já existe.
-- O schema.sql atualizado já tem cpf e cep em leads e pendentes,
-- então essas linhas só são necessárias se vier de um banco MUITO antigo.
-- Se der erro "duplicate column name", ignore — os dados já estão corretos.
