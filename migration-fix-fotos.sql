-- ═══════════════════════════════════════════════════
--  migration-fix-fotos.sql
--  Corrige URLs de imagens salvas com o placeholder inválido
--
--  Problema: imagens foram gravadas no D1 com a URL:
--    https://pub-SUBSTITUA_PELO_SEU_ID.r2.dev/imoveis/xxx.jpg
--  que nunca foi uma URL real → OpaqueResponseBlocking no browser
--
--  Solução: converte para o formato do proxy /r2/
--    /r2/imoveis/xxx.jpg  (servido pelo Worker em functions/r2/[[path]].js)
--
--  Como executar:
--    wrangler d1 execute helder-freire-imoveis --remote --file=migration-fix-fotos.sql
--
--  Para verificar antes de executar (só leitura):
--    wrangler d1 execute helder-freire-imoveis --remote --command="SELECT id, titulo, fotos FROM imoveis WHERE fotos LIKE '%SUBSTITUA_PELO_SEU_ID%'"
-- ═══════════════════════════════════════════════════

UPDATE imoveis
SET fotos = REPLACE(
  fotos,
  'https://pub-SUBSTITUA_PELO_SEU_ID.r2.dev',
  '/r2'
)
WHERE fotos LIKE '%pub-SUBSTITUA_PELO_SEU_ID.r2.dev%';
