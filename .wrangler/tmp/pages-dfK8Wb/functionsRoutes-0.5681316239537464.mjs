import { onRequestGet as __api_auditoria_js_onRequestGet } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\auditoria.js"
import { onRequestDelete as __api_imoveis_js_onRequestDelete } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\imoveis.js"
import { onRequestGet as __api_imoveis_js_onRequestGet } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\imoveis.js"
import { onRequestPost as __api_imoveis_js_onRequestPost } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\imoveis.js"
import { onRequestPut as __api_imoveis_js_onRequestPut } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\imoveis.js"
import { onRequestGet as __api_leads_js_onRequestGet } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\leads.js"
import { onRequestPost as __api_leads_js_onRequestPost } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\leads.js"
import { onRequestOptions as __api_login_js_onRequestOptions } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\login.js"
import { onRequestPost as __api_login_js_onRequestPost } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\login.js"
import { onRequestGet as __api_pendentes_js_onRequestGet } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\pendentes.js"
import { onRequestPost as __api_pendentes_js_onRequestPost } from "C:\\GIT\\Helder-Freire-Site\\functions\\api\\pendentes.js"

export const routes = [
    {
      routePath: "/api/auditoria",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_auditoria_js_onRequestGet],
    },
  {
      routePath: "/api/imoveis",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_imoveis_js_onRequestDelete],
    },
  {
      routePath: "/api/imoveis",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_imoveis_js_onRequestGet],
    },
  {
      routePath: "/api/imoveis",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_imoveis_js_onRequestPost],
    },
  {
      routePath: "/api/imoveis",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_imoveis_js_onRequestPut],
    },
  {
      routePath: "/api/leads",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_leads_js_onRequestGet],
    },
  {
      routePath: "/api/leads",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_leads_js_onRequestPost],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_login_js_onRequestOptions],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_js_onRequestPost],
    },
  {
      routePath: "/api/pendentes",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_pendentes_js_onRequestGet],
    },
  {
      routePath: "/api/pendentes",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_pendentes_js_onRequestPost],
    },
  ]