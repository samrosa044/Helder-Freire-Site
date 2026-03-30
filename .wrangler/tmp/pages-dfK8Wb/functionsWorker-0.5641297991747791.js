var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _auth.js
var encoder = new TextEncoder();
function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
__name(toBase64, "toBase64");
function fromBase64(str) {
  return decodeURIComponent(escape(atob(str)));
}
__name(fromBase64, "fromBase64");
async function criarToken(usuario, segredo) {
  const payload = toBase64(JSON.stringify({
    usuario,
    exp: Date.now() + 8 * 60 * 60 * 1e3
  }));
  const chave = await crypto.subtle.importKey(
    "raw",
    encoder.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", chave, encoder.encode(payload));
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payload}.${sigBase64}`;
}
__name(criarToken, "criarToken");
async function verificarToken(token, segredo) {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;
    const chave = await crypto.subtle.importKey(
      "raw",
      encoder.encode(segredo),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    const valido = await crypto.subtle.verify("HMAC", chave, sigBytes, encoder.encode(payload));
    if (!valido) return false;
    const { exp } = JSON.parse(fromBase64(payload));
    return Date.now() < exp;
  } catch {
    return false;
  }
}
__name(verificarToken, "verificarToken");
async function autenticado(request, segredo) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return false;
  return verificarToken(header.slice(7), segredo);
}
__name(autenticado, "autenticado");
function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(json, "json");
function naoAutorizado() {
  return json({ erro: "N\xE3o autorizado. Fa\xE7a login novamente." }, 401);
}
__name(naoAutorizado, "naoAutorizado");

// api/auditoria.js
async function onRequestGet({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
  const url = new URL(request.url);
  const kpis = url.searchParams.get("kpis");
  try {
    if (kpis) {
      const [ativos, pendentes, leads, rejeitados] = await Promise.all([
        env.DB.prepare(`SELECT COUNT(*) as n FROM imoveis WHERE status = 'ativo'`).first(),
        env.DB.prepare(`SELECT COUNT(*) as n FROM pendentes WHERE status = 'pendente'`).first(),
        env.DB.prepare(`SELECT COUNT(*) as n FROM leads`).first(),
        env.DB.prepare(`SELECT COUNT(*) as n FROM pendentes WHERE status = 'rejeitado'`).first()
      ]);
      return json({
        imoveis_ativos: ativos?.n || 0,
        pendentes: pendentes?.n || 0,
        leads: leads?.n || 0,
        rejeitados: rejeitados?.n || 0
      });
    }
    const { results } = await env.DB.prepare(
      `SELECT * FROM auditoria ORDER BY criado_em DESC LIMIT 50`
    ).all();
    return json(results);
  } catch (e) {
    return json({ erro: "Erro ao buscar auditoria" }, 500);
  }
}
__name(onRequestGet, "onRequestGet");

// api/imoveis.js
async function onRequestGet2({ request, env }) {
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo");
  const id = url.searchParams.get("id");
  try {
    if (id) {
      const imovel = await (env.DB || env.helder_freire_imoveis).prepare(
        `SELECT * FROM imoveis WHERE id = ? AND status = 'ativo'`
      ).bind(id).first();
      return imovel ? json(imovel) : json({ erro: "Im\xF3vel n\xE3o encontrado" }, 404);
    }
    const query = tipo && tipo !== "todos" ? `SELECT * FROM imoveis WHERE status = 'ativo' AND tipo = ? ORDER BY id DESC` : `SELECT * FROM imoveis WHERE status = 'ativo' ORDER BY id DESC`;
    const { results } = tipo && tipo !== "todos" ? await (env.DB || env.helder_freire_imoveis).prepare(query).bind(tipo).all() : await (env.DB || env.helder_freire_imoveis).prepare(query).all();
    return json(results);
  } catch (e) {
    return json({ erro: "Erro ao buscar im\xF3veis" }, 500);
  }
}
__name(onRequestGet2, "onRequestGet");
async function onRequestPost({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
  try {
    const d = await request.json();
    if (!d.titulo || !d.endereco || !d.valor) {
      return json({ erro: "T\xEDtulo, endere\xE7o e valor s\xE3o obrigat\xF3rios" }, 400);
    }
    const result = await (env.DB || env.helder_freire_imoveis).prepare(`
      INSERT INTO imoveis (tipo, titulo, endereco, cidade, valor, area, quartos, vagas, modal, descricao, fotos, status, destaque)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?)
    `).bind(
      d.tipo || "casa",
      d.titulo,
      d.endereco,
      d.cidade || "Passos",
      d.valor,
      d.area || "",
      d.quartos || "-",
      d.vagas || "-",
      d.modal || "Venda",
      d.descricao || "",
      d.fotos || "",
      d.destaque || "N\xE3o"
    ).run();
    await (env.DB || env.helder_freire_imoveis).prepare(
      `INSERT INTO auditoria (tipo, mensagem) VALUES ('add', ?)`
    ).bind(`Im\xF3vel adicionado: "${d.titulo}" (${d.tipo})`).run();
    return json({ sucesso: true, id: result.meta.last_row_id }, 201);
  } catch (e) {
    return json({ erro: "Erro ao salvar im\xF3vel" }, 500);
  }
}
__name(onRequestPost, "onRequestPost");
async function onRequestPut({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
  try {
    const d = await request.json();
    if (!d.id) return json({ erro: "ID obrigat\xF3rio" }, 400);
    await (env.DB || env.helder_freire_imoveis).prepare(`
      UPDATE imoveis SET
        tipo = ?, titulo = ?, endereco = ?, cidade = ?,
        valor = ?, area = ?, quartos = ?, vagas = ?,
        modal = ?, descricao = ?, fotos = ?, status = ?,
        destaque = ?, atualizado_em = datetime('now','localtime')
      WHERE id = ?
    `).bind(
      d.tipo,
      d.titulo,
      d.endereco,
      d.cidade || "Passos",
      d.valor,
      d.area,
      d.quartos,
      d.vagas,
      d.modal,
      d.descricao,
      d.fotos,
      d.status,
      d.destaque,
      d.id
    ).run();
    await (env.DB || env.helder_freire_imoveis).prepare(
      `INSERT INTO auditoria (tipo, mensagem) VALUES ('edit', ?)`
    ).bind(`Im\xF3vel #${d.id} atualizado: "${d.titulo}"`).run();
    return json({ sucesso: true });
  } catch (e) {
    return json({ erro: "Erro ao atualizar im\xF3vel" }, 500);
  }
}
__name(onRequestPut, "onRequestPut");
async function onRequestDelete({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return json({ erro: "ID obrigat\xF3rio" }, 400);
    const imovel = await (env.DB || env.helder_freire_imoveis).prepare(
      `SELECT titulo FROM imoveis WHERE id = ?`
    ).bind(id).first();
    await (env.DB || env.helder_freire_imoveis).prepare(`DELETE FROM imoveis WHERE id = ?`).bind(id).run();
    await (env.DB || env.helder_freire_imoveis).prepare(
      `INSERT INTO auditoria (tipo, mensagem) VALUES ('delete', ?)`
    ).bind(`Im\xF3vel #${id} exclu\xEDdo: "${imovel?.titulo || ""}"`).run();
    return json({ sucesso: true });
  } catch (e) {
    return json({ erro: "Erro ao excluir im\xF3vel" }, 500);
  }
}
__name(onRequestDelete, "onRequestDelete");

// api/leads.js
async function verificarTurnstile(token, secret, ip) {
  if (!secret) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = await r.json();
    return data.success === true;
  } catch (_) {
    return true;
  }
}
__name(verificarTurnstile, "verificarTurnstile");
async function onRequestPost2({ request, env }) {
  try {
    const d = await request.json();
    if (!d.nome || !d.whatsapp) {
      return json({ erro: "Nome e WhatsApp s\xE3o obrigat\xF3rios" }, 400);
    }
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const tsValido = await verificarTurnstile(d.cf_token, env.TURNSTILE_SECRET, ip);
    if (!tsValido) {
      return json({ erro: "Verifica\xE7\xE3o de seguran\xE7a inv\xE1lida. Recarregue a p\xE1gina e tente novamente." }, 403);
    }
    await (env.DB || env.helder_freire_imoveis).prepare(`
      INSERT INTO leads
        (nome, whatsapp, email, tipo_imovel, finalidade,
         valor_maximo, quartos_minimo, bairro, observacoes,
         como_contatar, prazo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      d.nome,
      d.whatsapp,
      d.email || "",
      d.tipo_imovel || "",
      d.finalidade || "",
      d.valor_maximo || "",
      d.quartos_minimo || "",
      d.bairro || "",
      d.observacoes || "",
      d.como_contatar || "",
      d.prazo || ""
    ).run();
    await (env.DB || env.helder_freire_imoveis).prepare(
      `INSERT INTO auditoria (tipo, mensagem) VALUES ('info', ?)`
    ).bind(`Novo lead: ${d.nome} buscando ${d.tipo_imovel || "im\xF3vel"}`).run();
    return json({ sucesso: true }, 201);
  } catch (e) {
    return json({ erro: "Erro ao salvar contato" }, 500);
  }
}
__name(onRequestPost2, "onRequestPost");
async function onRequestGet3({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
  try {
    const { results } = await (env.DB || env.helder_freire_imoveis).prepare(
      `SELECT * FROM leads ORDER BY criado_em DESC`
    ).all();
    return json(results);
  } catch (e) {
    return json({ erro: "Erro ao buscar leads" }, 500);
  }
}
__name(onRequestGet3, "onRequestGet");

// api/login.js
async function onRequestPost3({ request, env }) {
  try {
    const { usuario, senha } = await request.json();
    const adminUser = env.ADMIN_USER || "admin";
    const adminPass = env.ADMIN_PASS;
    const jwtSecret = env.JWT_SECRET;
    if (!adminPass || !jwtSecret) {
      return json(
        { erro: "Servidor n\xE3o configurado. Defina JWT_SECRET e ADMIN_PASS via wrangler secret." },
        500
      );
    }
    if (usuario !== adminUser || senha !== adminPass) {
      return json({ erro: "Usu\xE1rio ou senha incorretos" }, 401);
    }
    const token = await criarToken(usuario, jwtSecret);
    return json({ token });
  } catch (e) {
    return json({ erro: "Erro interno no servidor" }, 500);
  }
}
__name(onRequestPost3, "onRequestPost");
async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
__name(onRequestOptions, "onRequestOptions");

// api/pendentes.js
function getDB(env) {
  return env.DB || env.helder_freire_imoveis || env.HELDER_FREIRE_IMOVEIS;
}
__name(getDB, "getDB");
async function verificarTurnstile2(token, secret, ip) {
  if (!secret) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = await r.json();
    return data.success === true;
  } catch (_) {
    return true;
  }
}
__name(verificarTurnstile2, "verificarTurnstile");
async function onRequestGet4({ request, env }) {
  if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
  const DB = getDB(env);
  if (!DB) return json({ erro: "Banco de dados n\xE3o configurado (binding DB ausente)" }, 500);
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pendente";
    const { results } = await DB.prepare(
      "SELECT * FROM pendentes WHERE status = ? ORDER BY criado_em DESC"
    ).bind(status).all();
    return json(results);
  } catch (e) {
    return json({ erro: "Erro ao buscar cadastros: " + e.message }, 500);
  }
}
__name(onRequestGet4, "onRequestGet");
async function onRequestPost4({ request, env }) {
  const DB = getDB(env);
  if (!DB) return json({ erro: "Banco de dados n\xE3o configurado (binding DB ausente)" }, 500);
  const url = new URL(request.url);
  const acao = url.searchParams.get("acao");
  if (acao === "aprovar") {
    if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
    try {
      const { id } = await request.json();
      const pend = await DB.prepare("SELECT * FROM pendentes WHERE id = ?").bind(id).first();
      if (!pend) return json({ erro: "Cadastro n\xE3o encontrado" }, 404);
      await DB.prepare(
        "UPDATE pendentes SET status = 'aprovado', atualizado_em = datetime('now','localtime') WHERE id = ?"
      ).bind(id).run();
      await DB.prepare(
        "INSERT INTO imoveis (tipo, titulo, endereco, cidade, valor, area, quartos, vagas, modal, descricao, fotos, status, destaque) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', 'N\xE3o')"
      ).bind(
        pend.tipo_imovel || "casa",
        (pend.tipo_imovel || "Im\xF3vel") + " \u2014 " + (pend.endereco || pend.cidade || "Passos"),
        pend.endereco || "",
        pend.cidade || "Passos",
        pend.valor || "A consultar",
        pend.area || "",
        pend.quartos || "-",
        pend.vagas || "-",
        pend.modalidade || "Venda",
        pend.descricao || "",
        pend.fotos || ""
      ).run();
      await DB.prepare("INSERT INTO auditoria (tipo, mensagem) VALUES ('approve', ?)").bind("Cadastro #" + id + " aprovado \u2014 " + pend.tipo_imovel + " de " + pend.nome).run();
      return json({ sucesso: true });
    } catch (e) {
      return json({ erro: "Erro ao aprovar: " + e.message }, 500);
    }
  }
  if (acao === "rejeitar") {
    if (!await autenticado(request, env.JWT_SECRET)) return naoAutorizado();
    try {
      const { id, motivo } = await request.json();
      const pend = await DB.prepare("SELECT nome, tipo_imovel FROM pendentes WHERE id = ?").bind(id).first();
      await DB.prepare(
        "UPDATE pendentes SET status = 'rejeitado', motivo_rejeicao = ?, atualizado_em = datetime('now','localtime') WHERE id = ?"
      ).bind(motivo || "", id).run();
      await DB.prepare("INSERT INTO auditoria (tipo, mensagem) VALUES ('reject', ?)").bind("Cadastro #" + id + " rejeitado \u2014 " + (pend && pend.tipo_imovel) + " de " + (pend && pend.nome) + ". Motivo: " + (motivo || "n\xE3o informado")).run();
      return json({ sucesso: true });
    } catch (e) {
      return json({ erro: "Erro ao rejeitar: " + e.message }, 500);
    }
  }
  try {
    const d = await request.json();
    if (!d.nome || !d.whatsapp) {
      return json({ erro: "Nome e WhatsApp s\xE3o obrigat\xF3rios" }, 400);
    }
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const tsValido = await verificarTurnstile2(d.cf_token, env.TURNSTILE_SECRET, ip);
    if (!tsValido) {
      return json({ erro: "Verifica\xE7\xE3o de seguran\xE7a inv\xE1lida. Recarregue a p\xE1gina e tente novamente." }, 403);
    }
    const extras = JSON.stringify(d.dados_extras || {});
    await DB.prepare(
      "INSERT INTO pendentes (formulario, tipo_imovel, modalidade, nome, whatsapp, email, proprietario, endereco, cidade, valor, area, quartos, suites, vagas, fotos, descricao, condo_iptu, dados_extras) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      d.formulario || "proprietario",
      d.tipo_imovel || "",
      d.modalidade || "Venda",
      d.nome,
      d.whatsapp,
      d.email || "",
      d.proprietario || "",
      d.endereco || "",
      d.cidade || "Passos",
      d.valor || "",
      d.area || "",
      d.quartos || "",
      d.suites || "",
      d.vagas || "",
      d.fotos || "",
      d.descricao || "",
      d.condo_iptu || "",
      extras
    ).run();
    await DB.prepare("INSERT INTO auditoria (tipo, mensagem) VALUES ('info', ?)").bind("Novo cadastro recebido (" + d.tipo_imovel + ") de " + d.nome).run();
    return json({ sucesso: true }, 201);
  } catch (e) {
    return json({ erro: "Erro ao salvar cadastro: " + e.message }, 500);
  }
}
__name(onRequestPost4, "onRequestPost");

// ../.wrangler/tmp/pages-dfK8Wb/functionsRoutes-0.5681316239537464.mjs
var routes = [
  {
    routePath: "/api/auditoria",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/imoveis",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/imoveis",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/imoveis",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/imoveis",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/leads",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/leads",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/login",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/login",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/pendentes",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/pendentes",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
