-- ═══════════════════════════════════════════════════
--  Migração: corrigir URLs de fotos com placeholder inválido
--
--  Problema: imagens foram salvas com a URL de exemplo
--    https://pub-SUBSTITUA_PELO_SEU_ID.r2.dev/imoveis/xxx.jpg
--  em vez da URL correta via proxy.
--
--  Esta migração converte essas URLs para o formato do proxy:
--    /r2/imoveis/xxx.jpg
--
--  Como executar:
--    wrangler d1 execute helder-freire-imoveis --file=migration-fix-fotos.sql
--
--  Ou no dashboard Cloudflare → D1 → helder-freire-imoveis → Console
-- ═══════════════════════════════════════════════════

-- 1. Verifica quais registros têm a URL placeholder (consulta diagnóstico)
-- SELECT id, titulo, fotos FROM imoveis WHERE fotos LIKE '%SUBSTITUA_PELO_SEU_ID%';

-- 2. Corrige: substitui a base URL errada pelo prefixo do proxy
UPDATE imoveis
SET fotos = REPLACE(
  fotos,
  'https://pub-SUBSTITUA_PELO_SEU_ID.r2.dev',
  '/r2'
)
WHERE fotos LIKE '%pub-SUBSTITUA_PELO_SEU_ID.r2.dev%';

-- 3. Confirma resultado
-- SELECT id, titulo, fotos FROM imoveis WHERE fotos LIKE '%/r2/%';
