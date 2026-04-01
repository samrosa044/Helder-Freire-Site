-- ═══════════════════════════════════════════════════
--  MIGRATION — Adiciona campos cpf, cep às tabelas
--  Rodar com: wrangler d1 execute helder_freire_imoveis --file=migration.sql
-- ═══════════════════════════════════════════════════

-- Adiciona cpf na tabela leads (ignora se já existir)
ALTER TABLE leads ADD COLUMN cpf TEXT;

-- Adiciona cpf e cep na tabela pendentes (ignora se já existir)
ALTER TABLE pendentes ADD COLUMN cpf TEXT;
ALTER TABLE pendentes ADD COLUMN cep TEXT;