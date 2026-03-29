// ═══════════════════════════════════════════════════
//  HELDER FREIRE IMÓVEIS — Frontend v4.0
//  Cloudflare Pages + Workers + D1
//  localStorage → API REST segura
// ═══════════════════════════════════════════════════

// ─── Turnstile tokens ────────────────────────────────────────────
let tsCadastroToken = null;
let tsClienteToken  = null;
let tsProprietarioToken = null;

function onTsCadastro(token) {
  tsCadastroToken = token;
  const btn = document.getElementById('btn-cadastro-submit');
  if (!btn) return;
  btn.disabled = false;
  btn.removeAttribute('style');
  btn.textContent = 'Enviar Cadastro para Análise';
}

function onTsCliente(token) {
  tsClienteToken = token;
  const btn = document.getElementById('c-submit-btn');
  if (!btn) return;
  btn.classList.remove('btn-locked');
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="var(--navy)"/><path d="M3 7.5L5.5 10.5L11 4" stroke="var(--navy)" stroke-width="1.6" stroke-linecap="round"/></svg> Enviar Solicitação`;
}

function onTsProprietario(token) {
  tsProprietarioToken = token;
  const btn = document.getElementById('p-submit-btn');
  if (!btn) return;
  btn.classList.remove('btn-locked');
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="var(--navy)"/><path d="M3 7.5L5.5 10.5L11 4" stroke="var(--navy)" stroke-width="1.6" stroke-linecap="round"/></svg> Enviar para Helder Freire`;
}

// ─── API Helper ──────────────────────────────────────────────────
const API = {
  token: () => sessionStorage.getItem('adm_token'),

  headers(auth = false) {
    const h = { 'Content-Type': 'application/json' };
    if (auth && this.token()) h['Authorization'] = 'Bearer ' + this.token();
    return h;
  },

  async get(path, auth = false) {
    const r = await fetch('/api' + path, { headers: this.headers(auth) });
    if (!r.ok) throw new Error((await r.json()).erro || 'Erro na requisição');
    return r.json();
  },

  async post(path, dados, auth = false) {
    const r = await fetch('/api' + path, {
      method: 'POST',
      headers: this.headers(auth),
      body: JSON.stringify(dados)
    });
    if (!r.ok) throw new Error((await r.json()).erro || 'Erro na requisição');
    return r.json();
  },

  async put(path, dados) {
    const r = await fetch('/api' + path, {
      method: 'PUT',
      headers: this.headers(true),
      body: JSON.stringify(dados)
    });
    if (!r.ok) throw new Error((await r.json()).erro || 'Erro na requisição');
    return r.json();
  },

  async delete(path) {
    const r = await fetch('/api' + path, {
      method: 'DELETE',
      headers: this.headers(true)
    });
    if (!r.ok) throw new Error((await r.json()).erro || 'Erro na requisição');
    return r.json();
  }
};

// ─── Constantes visuais ──────────────────────────────────────────
const TYPE_ICONS  = { casa:'🏠', apartamento:'🏢', fazenda:'🌾', terreno:'📐', comercial:'🏪', aluguel:'🔑' };
const TYPE_LABELS = { casa:'Casa', apartamento:'Apartamento', fazenda:'Fazenda/Sítio', terreno:'Terreno', comercial:'Comercial', aluguel:'Aluguel' };

// ─── Catálogo Público ────────────────────────────────────────────
async function renderCatalogo(filtro = 'todos') {
  const grid = document.getElementById('propGrid');
  grid.innerHTML = '<div class="empty-state"><div>⏳</div><div>Carregando imóveis...</div></div>';

  try {
    const url = filtro !== 'todos' ? `/imoveis?tipo=${filtro}` : '/imoveis';
    const imoveis = await API.get(url);

    if (!imoveis.length) {
      grid.innerHTML = '<div class="empty-state"><div>🏘️</div><div>Nenhum imóvel nesta categoria.</div></div>';
      return;
    }

    grid.innerHTML = imoveis.map(im => `
      <div class="pcard">
        <div class="pcard-img">
          <div class="pcard-img-bg"></div>
          <div class="pcard-type-icon">${TYPE_ICONS[im.tipo] || '🏠'}</div>
          <span class="pcard-badge ${im.modal === 'Locação' ? 'badge-aluguel' : im.destaque === 'Sim' ? 'badge-novo' : 'badge-venda'}">
            ${im.modal === 'Locação' ? 'Aluguel' : im.destaque === 'Sim' ? '✓ Destaque' : 'Venda'}
          </span>
          <div class="pcard-verified">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" stroke="#38bdf8" stroke-width=".8"/><path d="M2.5 5.2L4 7L7.5 3" stroke="#38bdf8" stroke-width="1" stroke-linecap="round"/></svg>
            Verificado
          </div>
        </div>
        <div class="pcard-body">
          <div class="pcard-cat">${TYPE_LABELS[im.tipo] || im.tipo}</div>
          <div class="pcard-name">${im.titulo}</div>
          <div class="pcard-loc">📍 ${im.cidade}</div>
          <div class="pcard-div"></div>
          <div class="pcard-foot">
            <div class="pcard-price">R$ ${im.valor}</div>
            <div class="pcard-specs">
              ${im.quartos && im.quartos !== '-' ? `<span class="pcs">🛏 ${im.quartos}</span>` : ''}
              ${im.vagas   && im.vagas   !== '-' ? `<span class="pcs">🚗 ${im.vagas}</span>`   : ''}
              ${im.area                          ? `<span class="pcs">📐 ${im.area}</span>`    : ''}
            </div>
          </div>
        </div>
      </div>`).join('');
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><div>⚠️</div><div>Erro ao carregar imóveis. Tente recarregar a página.</div></div>';
  }
}

function filterProps(tipo, btn) {
  document.querySelectorAll('.fchip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderCatalogo(tipo);
}

// ─── Modal de Cadastro Público ───────────────────────────────────
let currentType = 'casa';

function selectType(tipo, btn) {
  currentType = tipo;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.fields-group').forEach(g => g.classList.remove('active'));
  const fg = document.getElementById('fields-' + tipo);
  if (fg) fg.classList.add('active');
}

function openCadastroModal() {
  document.getElementById('cadastroModal').classList.add('open');
  document.getElementById('cadastroBody').style.display = 'block';
  document.getElementById('cadastroSuccess').classList.remove('show');
  document.body.style.overflow = 'hidden';
}

function closeCadastroModal() {
  document.getElementById('cadastroModal').classList.remove('open');
  document.body.style.overflow = '';
}

async function submitCadastro() {
  const nome = document.getElementById('c_nome').value.trim();
  const wa   = document.getElementById('c_wa').value.trim();

  if (!nome || !wa) { alert('Preencha nome e WhatsApp'); return; }
  if (!tsCadastroToken) { alert('Confirme que você não é um robô'); return; }

  const btn = document.getElementById('btn-cadastro-submit');
  btn.textContent = '⏳ Enviando...';
  btn.disabled = true;

  try {
    await API.post('/pendentes', {
      formulario:  'proprietario',
      tipo_imovel: currentType,
      nome, whatsapp: wa,
      email: document.getElementById('c_email')?.value || '',
    });

    document.getElementById('cadastroBody').style.display = 'none';
    document.getElementById('cadastroSuccess').classList.add('show');

    if (API.token()) { updateKPIs(); renderPendentes(); }
  } catch (e) {
    alert('Erro ao enviar: ' + e.message);
    btn.textContent = 'Enviar Cadastro para Análise';
    btn.disabled = false;
  }
}

// ─── Admin Login ─────────────────────────────────────────────────
function openAdminFlow() {
  if (API.token()) { openAdminPanel(); return; }
  document.getElementById('loginScreen').classList.add('open');
  document.body.style.overflow = 'hidden';
}

async function doLogin() {
  const usuario = document.getElementById('loginUser').value;
  const senha   = document.getElementById('loginPass').value;

  const btn = document.querySelector('.login-btn');
  btn.textContent = '⏳ Entrando...';
  btn.disabled = true;

  try {
    const { token } = await API.post('/login', { usuario, senha });
    sessionStorage.setItem('adm_token', token);
    document.getElementById('loginScreen').classList.remove('open');
    openAdminPanel();
  } catch (e) {
    document.getElementById('loginErr').style.display = 'block';
    setTimeout(() => document.getElementById('loginErr').style.display = 'none', 3000);
  } finally {
    btn.textContent = 'Entrar no Painel';
    btn.disabled = false;
  }
}

function closeLoginAndAdmin() {
  document.getElementById('loginScreen').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Admin Panel ─────────────────────────────────────────────────
async function openAdminPanel() {
  document.getElementById('adminPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
  await Promise.all([updateKPIs(), renderPendentes(), renderImoveis(), renderAudit()]);
}

function closeAdmin() {
  document.getElementById('adminPanel').classList.remove('open');
  document.body.style.overflow = '';
  renderCatalogo();
}

function admLogout() {
  sessionStorage.removeItem('adm_token');
  closeAdmin();
}

const ADM_TITLES = {
  dashboard: 'Dashboard', pendentes: 'Imóveis Pendentes',
  imoveis: 'Imóveis Ativos', cadastrar: 'Cadastrar Imóvel',
  leads: 'Leads / Contatos', auditoria: 'Auditoria Completa', config: 'Configurações'
};

function showAdmTab(tab, el) {
  document.querySelectorAll('.adm-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('admTitle').textContent = ADM_TITLES[tab] || tab;
  if (el) {
    document.querySelectorAll('.adm-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
  }
  if (tab === 'pendentes') renderPendentes();
  if (tab === 'imoveis')   renderImoveis();
  if (tab === 'leads')     renderLeads();
  if (tab === 'auditoria') renderAudit();
}

// ─── KPIs ─────────────────────────────────────────────────────────
async function updateKPIs() {
  try {
    const kpis = await API.get('/auditoria?kpis=1', true);
    document.getElementById('kpi-ativos').textContent  = kpis.imoveis_ativos;
    document.getElementById('kpi-pend').textContent    = kpis.pendentes;
    document.getElementById('kpi-leads').textContent   = kpis.leads;
    document.getElementById('kpi-rej').textContent     = kpis.rejeitados;
    const badge = document.getElementById('badge-pendentes');
    if (badge) {
      badge.textContent    = kpis.pendentes;
      badge.style.display  = kpis.pendentes > 0 ? 'inline' : 'none';
    }
  } catch {}
}

// ─── Pendentes ────────────────────────────────────────────────────
let currentPendStatus = 'pendente';

function setPendStatus(status, btn) {
  currentPendStatus = status;
  document.querySelectorAll('.pend-stab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPendentes();
}

async function renderPendentes() {
  const tb    = document.getElementById('pendentes-tbody');
  const busca = (document.getElementById('pend-search')?.value || '').toLowerCase();
  const tipo  = document.getElementById('pend-tipo')?.value || '';
  const status = currentPendStatus;

  tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px">⏳ Carregando...</td></tr>';

  try {
    let lista = await API.get('/pendentes?status=' + status, true);

    if (busca) lista = lista.filter(p =>
      (p.nome       || '').toLowerCase().includes(busca) ||
      (p.tipo_imovel|| '').toLowerCase().includes(busca) ||
      (p.endereco   || '').toLowerCase().includes(busca)
    );
    if (tipo) lista = lista.filter(p => p.tipo_imovel === tipo);

    // Atualiza contadores nas abas
    ['pendente','aprovado','rejeitado'].forEach(async s => {
      try {
        const all = await API.get('/pendentes?status=' + s, true);
        const el  = document.getElementById('cnt-' + s);
        if (el) el.textContent = all.length ? `(${all.length})` : '';
      } catch {}
    });

    const emptyMsg = {
      pendente:  'Nenhum cadastro pendente no momento 🎉',
      aprovado:  'Nenhum cadastro aprovado ainda.',
      rejeitado: 'Nenhum cadastro rejeitado.',
    };

    if (!lista.length) {
      tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--textl)">${emptyMsg[status] || 'Nenhum resultado.'}</td></tr>`;
      return;
    }

    tb.innerHTML = lista.map(p => {
      const tipoLabel = `${TYPE_ICONS[p.tipo_imovel] || '🏠'} ${TYPE_LABELS[p.tipo_imovel] || p.tipo_imovel}`;
      const wa        = `<a href="https://wa.me/55${(p.whatsapp||'').replace(/\D/g,'')}" target="_blank" style="color:var(--green)">${p.whatsapp}</a>`;
      const data      = new Date(p.criado_em).toLocaleDateString('pt-BR');
      const valor     = p.valor ? 'R$ ' + p.valor : '-';
      const local     = p.endereco || p.cidade || '-';

      let acoes = '';
      if (status === 'pendente') {
        acoes = `
          <button class="act-btn act-approve" onclick="aprovar(${p.id})">✓ Aprovar</button>
          <button class="act-btn act-reject"  onclick="openReject(${p.id})">✗ Rejeitar</button>`;
      } else if (status === 'aprovado') {
        acoes = `<span style="color:var(--green);font-size:12px;font-weight:600">✅ Aprovado</span>
          <br><button class="act-btn act-reject" style="margin-top:4px;font-size:10px" onclick="openReject(${p.id})">Rejeitar</button>`;
      } else if (status === 'rejeitado') {
        const motivo = p.motivo_rejeicao ? `<br><span style="font-size:10px;color:var(--textl)">Motivo: ${p.motivo_rejeicao}</span>` : '';
        acoes = `<span style="color:var(--red);font-size:12px;font-weight:600">❌ Rejeitado</span>${motivo}
          <br><button class="act-btn act-approve" style="margin-top:4px;font-size:10px" onclick="aprovar(${p.id})">Aprovar</button>`;
      }

      return `
        <tr>
          <td>${tipoLabel}</td>
          <td><strong>${p.nome}</strong>${p.formulario === 'cliente' ? '<br><span style="font-size:10px;color:var(--textl)">Cliente</span>' : ''}</td>
          <td>${wa}</td>
          <td>${local}</td>
          <td>${valor}</td>
          <td style="white-space:nowrap">${data}</td>
          <td style="white-space:nowrap">${acoes}</td>
        </tr>`;
    }).join('');
  } catch (e) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red)">Erro ao carregar. Tente novamente.</td></tr>';
  }
}

async function aprovar(id) {
  if (!confirm('Aprovar e publicar este imóvel?')) return;
  try {
    await API.post('/pendentes?acao=aprovar', { id }, true);
    await Promise.all([updateKPIs(), renderPendentes(), renderImoveis(), renderCatalogo()]);
  } catch (e) { alert('Erro ao aprovar: ' + e.message); }
}

// ─── Rejeitar ─────────────────────────────────────────────────────
let rejectId = null;

function openReject(id) {
  rejectId = id;
  document.getElementById('rejectModal').classList.add('open');
}
function closeRejectModal() {
  document.getElementById('rejectModal').classList.remove('open');
  document.getElementById('rejectReason').value = '';
  rejectId = null;
}

async function confirmReject() {
  if (!rejectId) return;
  const motivo = document.getElementById('rejectReason').value.trim();
  try {
    await API.post('/pendentes?acao=rejeitar', { id: rejectId, motivo }, true);
    closeRejectModal();
    await Promise.all([updateKPIs(), renderPendentes()]);
  } catch (e) { alert('Erro ao rejeitar: ' + e.message); }
}

// ─── Imóveis Admin ────────────────────────────────────────────────
async function renderImoveis(busca = '') {
  const tb = document.getElementById('imoveis-tbody');
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">⏳ Carregando...</td></tr>';

  try {
    let lista = await API.get('/imoveis', true);
    if (busca) lista = lista.filter(i =>
      (i.titulo || '').toLowerCase().includes(busca.toLowerCase()) ||
      (i.tipo   || '').toLowerCase().includes(busca.toLowerCase())
    );

    if (!lista.length) {
      tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--textl)">Nenhum imóvel cadastrado</td></tr>';
      return;
    }

    tb.innerHTML = lista.map(im => `
      <tr>
        <td>${TYPE_ICONS[im.tipo] || '🏠'} ${TYPE_LABELS[im.tipo] || im.tipo}</td>
        <td><strong>${im.titulo}</strong></td>
        <td style="color:var(--navy-light);font-weight:600">R$ ${im.valor}</td>
        <td>${im.cidade}</td>
        <td><span class="pill ${im.status === 'ativo' ? 'pill-approved' : 'pill-pending'}">${im.status === 'ativo' ? '✓ Ativo' : 'Inativo'}</span></td>
        <td style="white-space:nowrap">
          <button class="act-btn act-edit" onclick="toggleStatus(${im.id}, '${im.status}', '${im.titulo.replace(/'/g, "\\'")}', ${JSON.stringify(im).replace(/</g,'\\u003c')})">
            ${im.status === 'ativo' ? 'Pausar' : 'Ativar'}
          </button>
          <button class="act-btn act-delete" onclick="delImovel(${im.id})">Excluir</button>
        </td>
      </tr>`).join('');
  } catch (e) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--red)">Erro ao carregar.</td></tr>';
  }
}

async function toggleStatus(id, statusAtual, titulo, imData) {
  const novoStatus = statusAtual === 'ativo' ? 'inativo' : 'ativo';
  try {
    await API.put('/imoveis', { ...imData, id, status: novoStatus });
    await Promise.all([renderImoveis(), renderCatalogo(), updateKPIs()]);
  } catch (e) { alert('Erro: ' + e.message); }
}

async function delImovel(id) {
  if (!confirm('Excluir este imóvel permanentemente?')) return;
  try {
    await API.delete('/imoveis?id=' + id);
    await Promise.all([renderImoveis(), renderCatalogo(), updateKPIs()]);
  } catch (e) { alert('Erro: ' + e.message); }
}

// ─── Cadastrar Imóvel (Admin) ─────────────────────────────────────
let admCurrentType = 'casa';

function selectAdmType(tipo, btn) {
  admCurrentType = tipo;
  document.querySelectorAll('#tab-cadastrar .fchip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('adm-type').value = tipo;
}

async function salvarImovelAdmin() {
  const titulo   = document.getElementById('adm-titulo').value.trim();
  const endereco = document.getElementById('adm-endereco').value.trim();
  const valor    = document.getElementById('adm-valor').value.trim();

  if (!titulo || !endereco || !valor) { alert('Preencha Título, Endereço e Valor'); return; }

  const btn = document.querySelector('#tab-cadastrar .adm-btn-gold');
  btn.textContent = '⏳ Salvando...';
  btn.disabled = true;

  try {
    await API.post('/imoveis', {
      tipo:      admCurrentType,
      titulo, endereco,
      cidade:    document.getElementById('adm-cidade').value    || 'Passos',
      valor,
      area:      document.getElementById('adm-area').value      || '',
      quartos:   document.getElementById('adm-quartos').value   || '-',
      vagas:     document.getElementById('adm-vagas').value     || '-',
      modal:     document.getElementById('adm-modal').value     || 'Venda',
      descricao: document.getElementById('adm-desc').value      || '',
      fotos:     document.getElementById('adm-fotos').value     || '',
      destaque:  document.getElementById('adm-destaque').value  || 'Não',
    }, true);

    alert('✅ Imóvel publicado com sucesso!');
    document.getElementById('adm-titulo').value   = '';
    document.getElementById('adm-endereco').value = '';
    document.getElementById('adm-valor').value    = '';
    document.getElementById('adm-desc').value     = '';

    await Promise.all([updateKPIs(), renderImoveis(), renderCatalogo()]);
    showAdmTab('imoveis', document.querySelectorAll('.adm-item')[2]);
  } catch (e) {
    alert('Erro ao salvar: ' + e.message);
  } finally {
    btn.textContent = '✓ Publicar Imóvel';
    btn.disabled = false;
  }
}

// ─── Leads (Admin) ────────────────────────────────────────────────
async function renderLeads() {
  const tb = document.getElementById('leads-tbody');
  if (!tb) return;
  tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">⏳ Carregando...</td></tr>';

  try {
    const leads = await API.get('/leads', true);
    if (!leads.length) {
      tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--textl)">Nenhum lead ainda</td></tr>';
      return;
    }
    tb.innerHTML = leads.map(l => `
      <tr>
        <td><strong>${l.nome}</strong></td>
        <td><a href="https://wa.me/55${(l.whatsapp||'').replace(/\D/g,'')}" target="_blank" style="color:var(--green)">${l.whatsapp}</a></td>
        <td>${TYPE_ICONS[l.tipo_imovel] || ''} ${TYPE_LABELS[l.tipo_imovel] || l.tipo_imovel || '-'}</td>
        <td>${l.valor_maximo || '-'}</td>
        <td style="white-space:nowrap">${new Date(l.criado_em).toLocaleDateString('pt-BR')}</td>
      </tr>`).join('');
  } catch (e) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--red)">Erro ao carregar leads.</td></tr>';
  }
}

// ─── Auditoria (Admin) ────────────────────────────────────────────
function auditDot(tipo) {
  const cores = { approve:'green', reject:'red', add:'blue', edit:'blue', delete:'red', info:'orange' };
  return `<div class="audit-dot ${cores[tipo] || 'blue'}"></div>`;
}

async function renderAudit() {
  try {
    const log = await API.get('/auditoria', true);
    const html = log.map(e => `
      <div class="audit-entry">
        ${auditDot(e.tipo)}
        <div>
          <div class="audit-text">${e.mensagem}</div>
          <div class="audit-time">${new Date(e.criado_em).toLocaleString('pt-BR')} — ${e.usuario || 'Admin'}</div>
        </div>
      </div>`).join('');

    const el1 = document.getElementById('audit-recent');
    const el2 = document.getElementById('audit-full');
    if (el1) el1.innerHTML = html.slice(0, 5) || '<div style="padding:20px;color:var(--textl);font-size:12px">Sem atividade</div>';
    if (el2) el2.innerHTML = html || '<div style="padding:20px;color:var(--textl);font-size:12px">Sem registros</div>';
  } catch {}
}

// ─── Formulários Integrados (modais) ─────────────────────────────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVC3VEBDDGu1oESxGUS15uLcKnKYpep0VJsaH69hmTe5aZyU2pY66kK0vrpkRX0XO-HA/exec';

function openForm(tipo) {
  document.getElementById('form-' + tipo).classList.add('open');
  document.body.style.overflow = 'hidden';
  resetForm(tipo);
}

function closeForm(tipo) {
  document.getElementById('form-' + tipo).classList.remove('open');
  document.body.style.overflow = '';
}

function resetForm(tipo) {
  const prefix = tipo === 'cliente' ? 'c' : 'p';
  document.querySelectorAll(`#form-${tipo} .iform-step`).forEach(s => s.classList.remove('active'));
  document.querySelectorAll(`#form-${tipo} .ipstep`).forEach(s => s.classList.remove('active', 'done'));
  document.getElementById(prefix + 's1').classList.add('active');
  document.getElementById(prefix + 'p1').classList.add('active');
  const body = document.getElementById(prefix + '-body');
  const succ = document.getElementById(prefix + '-success');
  if (body) body.style.display = 'block';
  if (succ) succ.classList.remove('show');
}

function nextStep(prefix, from, to) {
  if (prefix === 'c' && from === 1) {
    const nome = document.getElementById('c-nome').value.trim();
    const wa   = document.getElementById('c-wa').value.trim();
    if (!nome || !wa) { alert('Por favor, preencha nome e WhatsApp.'); return; }
  }
  if (prefix === 'p' && from === 2) {
    const nome = document.getElementById('p-nome').value.trim();
    const wa   = document.getElementById('p-wa').value.trim();
    if (!nome || !wa) { alert('Por favor, preencha nome e WhatsApp.'); return; }
  }
  if (prefix === 'p' && from === 3) {
    const end = document.getElementById('p-end').value.trim();
    const val = document.getElementById('p-valor').value.trim();
    if (!end || !val) { alert('Por favor, preencha o endereço e o valor.'); return; }
  }

  const formId = prefix === 'c' ? 'cliente' : 'proprietario';
  const steps  = document.querySelectorAll(`#form-${formId} .iform-step`);
  const psteps = document.querySelectorAll(`#form-${formId} .ipstep`);

  steps.forEach(s => s.classList.remove('active'));
  document.getElementById(prefix + 's' + to).classList.add('active');

  psteps.forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < to)  s.classList.add('done');
    if (i + 1 === to) s.classList.add('active');
  });
}

function selTipo(btn, inputId, valor) {
  const grupo = btn.closest('.iform-tipo-grid');
  grupo.querySelectorAll('.iform-tipo-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  document.getElementById(inputId).value = valor;
}

function showPFields(tipo) {
  document.querySelectorAll('[id^="pf-"]').forEach(el => el.style.display = 'none');
  const residenciais = ['casa', 'apartamento', 'aluguel'];
  if (residenciais.includes(tipo))  document.getElementById('pf-residencial').style.display = 'block';
  else if (tipo === 'fazenda')      document.getElementById('pf-fazenda').style.display = 'block';
  else if (tipo === 'terreno')      document.getElementById('pf-terreno').style.display = 'block';
  else if (tipo === 'comercial')    document.getElementById('pf-comercial').style.display = 'block';
}

async function submitForm(tipo) {
  const isCliente = tipo === 'cliente';
  const prefix    = isCliente ? 'c' : 'p';
  const submitBtn = document.getElementById(prefix + '-submit-btn');

  // Fallback: pega token direto do widget caso callback não tenha disparado
  if (isCliente && !tsClienteToken) {
    tsClienteToken = window.turnstile?.getResponse(document.getElementById('ts-cliente')) || null;
    if (tsClienteToken) onTsCliente(tsClienteToken);
  }
  if (!isCliente && !tsProprietarioToken) {
    tsProprietarioToken = window.turnstile?.getResponse(document.getElementById('ts-proprietario')) || null;
    if (tsProprietarioToken) onTsProprietario(tsProprietarioToken);
  }

  // Se ainda está bloqueado, avisa
  if (submitBtn.classList.contains('btn-locked')) {
    alert('Por favor, complete a verificação de segurança antes de enviar.');
    return;
  }

  submitBtn.classList.add('btn-locked');
  submitBtn.textContent = '⏳ Enviando...';

  try {
    if (isCliente) {
      // Lead — cliente buscando imóvel
      await API.post('/leads', {
        nome:           document.getElementById('c-nome').value,
        whatsapp:       document.getElementById('c-wa').value,
        email:          document.getElementById('c-email').value,
        tipo_imovel:    document.getElementById('c-tipo').value,
        finalidade:     document.getElementById('c-final').value,
        valor_maximo:   document.getElementById('c-valor').value,
        quartos_minimo: document.getElementById('c-quartos').value,
        bairro:         document.getElementById('c-bairro').value,
        observacoes:    document.getElementById('c-obs').value,
        como_contatar:  document.getElementById('c-contato').value,
        prazo:          document.getElementById('c-prazo').value,
      });
    } else {
      // Cadastro — proprietário enviando imóvel
      const tipoIm = document.getElementById('p-tipo').value;
      const dadosExtras = {};

      if (['casa','apartamento','aluguel'].includes(tipoIm)) {
        dadosExtras.aceita_fgts         = document.getElementById('p-fgts')?.value;
        dadosExtras.aceita_financiamento = document.getElementById('p-fin')?.value;
      } else if (tipoIm === 'fazenda') {
        dadosExtras.hectares        = document.getElementById('p-ha')?.value;
        dadosExtras.alqueires       = document.getElementById('p-alq')?.value;
        dadosExtras.distancia_passos = document.getElementById('p-dist')?.value;
      } else if (tipoIm === 'terreno') {
        dadosExtras.frente      = document.getElementById('p-frente')?.value;
        dadosExtras.topografia  = document.getElementById('p-topo')?.value;
        dadosExtras.documentacao = document.getElementById('p-doc')?.value;
      }

      await API.post('/pendentes', {
        formulario:   'proprietario',
        tipo_imovel:  tipoIm,
        modalidade:   document.getElementById('p-modal').value,
        nome:         document.getElementById('p-nome').value,
        whatsapp:     document.getElementById('p-wa').value,
        email:        document.getElementById('p-email').value,
        proprietario: document.getElementById('p-prop').value,
        endereco:     document.getElementById('p-end').value,
        cidade:       document.getElementById('p-cidade').value,
        valor:        document.getElementById('p-valor').value,
        fotos:        document.getElementById('p-fotos').value,
        descricao:    document.getElementById('p-desc').value,
        quartos:      document.getElementById('p-quartos')?.value || '',
        suites:       document.getElementById('p-suites')?.value  || '',
        vagas:        document.getElementById('p-vagas')?.value   || '',
        area:         document.getElementById('p-area')?.value    || document.getElementById('p-tarea')?.value || '',
        dados_extras: dadosExtras,
      });
    }

    document.getElementById(prefix + '-body').style.display = 'none';
    document.getElementById(prefix + '-success').classList.add('show');
  } catch (e) {
    alert('Erro ao enviar: ' + e.message);
    submitBtn.classList.remove('status-sending');
    submitBtn.textContent = 'Enviar';
  }
}

// ─── Event Listeners ──────────────────────────────────────────────
window.addEventListener('scroll', () =>
  document.getElementById('navbar').classList.toggle('scrolled', scrollY > 10)
);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeCadastroModal(); closeRejectModal(); }
});

document.getElementById('cadastroModal').addEventListener('click', e => {
  if (e.target.id === 'cadastroModal') closeCadastroModal();
});

document.getElementById('rejectModal').addEventListener('click', e => {
  if (e.target.id === 'rejectModal') closeRejectModal();
});

['form-cliente', 'form-proprietario'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target === this) closeForm(this.id.replace('form-', ''));
  });
});

// ─── Inicialização ────────────────────────────────────────────────
showPFields('casa');
renderCatalogo();