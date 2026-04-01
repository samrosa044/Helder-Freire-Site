// ═══════════════════════════════════════════════════
//  HELDER FREIRE IMÓVEIS — Frontend v4.0
//  Cloudflare Pages + Workers + D1
//  localStorage → API REST segura
// ═══════════════════════════════════════════════════

// ─── Cloudflare Turnstile — execution:execute ────────────────────
const TS_SITEKEY = '0x4AAAAAACxUqF1s-5o5oIzJ';
const _tsW = {};
let tsCadastroToken = null, tsClienteToken = null, tsProprietarioToken = null;

function onTsCadastro(token) {
  tsCadastroToken = token;
  const btn = document.getElementById('btn-cadastro-submit');
  if (!btn) return;
  btn.disabled = false; btn.removeAttribute('style');
  btn.textContent = 'Enviar Cadastro para Análise';
}
function onTsCliente(token) {
  tsClienteToken = token;
  const btn = document.getElementById('c-submit-btn');
  if (!btn) return;
  btn.style.opacity='1'; btn.style.pointerEvents='auto'; btn.style.cursor='pointer';
  btn.innerHTML='<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="var(--navy)"/><path d="M3 7.5L5.5 10.5L11 4" stroke="var(--navy)" stroke-width="1.6" stroke-linecap="round"/></svg> Enviar Solicitação';
}
function onTsProprietario(token) {
  tsProprietarioToken = token;
  const btn = document.getElementById('p-submit-btn');
  if (!btn) return;
  btn.style.opacity='1'; btn.style.pointerEvents='auto'; btn.style.cursor='pointer';
  btn.innerHTML='<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="var(--navy)"/><path d="M3 7.5L5.5 10.5L11 4" stroke="var(--navy)" stroke-width="1.6" stroke-linecap="round"/></svg> Enviar para Helder Freire';
}
function _tsInit() {
  _tsW.cadastro     = window.turnstile.render('#ts-cadastro',     {sitekey:TS_SITEKEY, callback:onTsCadastro,     execution:'execute', theme:'dark'});
  _tsW.cliente      = window.turnstile.render('#ts-cliente',      {sitekey:TS_SITEKEY, callback:onTsCliente,      execution:'execute', theme:'dark'});
  _tsW.proprietario = window.turnstile.render('#ts-proprietario', {sitekey:TS_SITEKEY, callback:onTsProprietario, execution:'execute', theme:'dark'});
}
function _tsExecute(key, btnId, clearFn) {
  clearFn();
  const btn = document.getElementById(btnId);
  if (btn) { btn.style.opacity='0.4'; btn.style.pointerEvents='none'; btn.style.cursor='not-allowed'; }
  const wId = _tsW[key];
  if (!wId || !window.turnstile) return;
  try { window.turnstile.reset(wId); window.turnstile.execute(wId); } catch(e) {}
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
  _tsExecute('cadastro', 'btn-cadastro-submit', () => { tsCadastroToken = null; });
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
      const numId     = '#' + String(p.id).padStart(4,'0');
      const tipoLabel = `${TYPE_ICONS[p.tipo_imovel] || '🏠'} ${TYPE_LABELS[p.tipo_imovel] || p.tipo_imovel}`;
      const wa        = `<a href="https://wa.me/55${(p.whatsapp||'').replace(/\D/g,'')}" target="_blank" style="color:var(--green)">${p.whatsapp}</a>`;
      const data      = new Date(p.criado_em).toLocaleDateString('pt-BR');
      const valor     = p.valor ? 'R$ ' + p.valor : '-';
      const local     = p.endereco || p.cidade || '-';
      const pJson     = JSON.stringify(p).replace(/</g,'\u003c').replace(/\\/g,'\\\\').replace(/'/g,"\\'");

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
          <td><button onclick='openDetalhes(${JSON.stringify(p).replace(/'/g,"&#39;")})' style="background:var(--navy);color:var(--gold);border:none;cursor:pointer;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;font-family:inherit">${numId}</button></td>
          <td>${tipoLabel}${p.formulario==='cliente'?'<br><small style="color:var(--textl)">👤 Cliente</small>':'<br><small style="color:var(--textl)">🏠 Proprietário</small>'}</td>
          <td><strong>${p.nome}</strong></td>
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

    tb.innerHTML = lista.map(im => {
      const numId = '#' + String(im.id).padStart(4,'0');
      return `
      <tr>
        <td><button onclick='openDetalhes(${JSON.stringify(im).replace(/'/g,"&#39;")})' style="background:var(--navy);color:var(--gold);border:none;cursor:pointer;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;font-family:inherit">${numId}</button></td>
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
      </tr>`;
    }).join('');
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
  tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px">⏳ Carregando...</td></tr>';

  try {
    const leads = await API.get('/leads', true);
    if (!leads.length) {
      tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--textl)">Nenhum lead ainda</td></tr>';
      return;
    }
    tb.innerHTML = leads.map(l => {
      const numId = '#' + String(l.id).padStart(4, '0');
      const lJson = JSON.stringify(l).replace(/'/g, "&#39;");
      return `
      <tr>
        <td><button onclick='openLeadDetalhes(${lJson})' style="background:var(--navy);color:var(--gold);border:none;cursor:pointer;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;font-family:inherit">${numId}</button></td>
        <td><strong>${l.nome}</strong></td>
        <td><a href="https://wa.me/55${(l.whatsapp||'').replace(/\D/g,'')}" target="_blank" style="color:var(--green)">${l.whatsapp}</a></td>
        <td>${l.email ? `<a href="mailto:${l.email}" style="color:var(--textl);font-size:12px">${l.email}</a>` : '-'}</td>
        <td>${TYPE_ICONS[l.tipo_imovel] || '🏠'} ${TYPE_LABELS[l.tipo_imovel] || l.tipo_imovel || '-'}</td>
        <td>${l.valor_maximo || '-'}</td>
        <td style="white-space:nowrap">${new Date(l.criado_em).toLocaleDateString('pt-BR')}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red)">Erro ao carregar leads.</td></tr>';
  }
}

function openLeadDetalhes(l) {
  if (typeof l === 'string') l = JSON.parse(l);
  const numId = '#' + String(l.id).padStart(4, '0');
  const FINALIDADE_LABELS = { Comprar: 'Comprar', Alugar: 'Alugar' };
  const rows = `
    <tr><td class="det-l">Nº do Chamado</td><td class="det-v"><strong style="color:var(--gold)">${numId}</strong></td></tr>
    <tr><td class="det-l">Nome</td><td class="det-v"><strong>${l.nome||'-'}</strong></td></tr>
    <tr><td class="det-l">WhatsApp</td><td class="det-v"><a href="https://wa.me/55${(l.whatsapp||'').replace(/\D/g,'')}" target="_blank" style="color:#16a34a">${l.whatsapp||'-'}</a></td></tr>
    <tr><td class="det-l">E-mail</td><td class="det-v">${l.email ? `<a href="mailto:${l.email}" style="color:var(--navy-light)">${l.email}</a>` : '-'}</td></tr>
    <tr><td class="det-l">CPF</td><td class="det-v">${l.cpf||'-'}</td></tr>
    <tr><td class="det-l">Tipo de Imóvel</td><td class="det-v">${TYPE_ICONS[l.tipo_imovel]||'🏠'} ${TYPE_LABELS[l.tipo_imovel]||l.tipo_imovel||'-'}</td></tr>
    <tr><td class="det-l">Finalidade</td><td class="det-v">${l.finalidade||'-'}</td></tr>
    <tr><td class="det-l">Valor Máximo</td><td class="det-v">${l.valor_maximo||'-'}</td></tr>
    <tr><td class="det-l">Quartos Mínimo</td><td class="det-v">${l.quartos_minimo||'-'}</td></tr>
    <tr><td class="det-l">Bairro / Região</td><td class="det-v">${l.bairro||'-'}</td></tr>
    <tr><td class="det-l">Observações</td><td class="det-v">${l.observacoes||'-'}</td></tr>
    <tr><td class="det-l">Como Contatar</td><td class="det-v">${l.como_contatar||'-'}</td></tr>
    <tr><td class="det-l">Prazo</td><td class="det-v">${l.prazo||'-'}</td></tr>
    <tr><td class="det-l">Recebido em</td><td class="det-v">${new Date(l.criado_em).toLocaleString('pt-BR')}</td></tr>`;

  document.getElementById('det-modal').innerHTML = `
    <div class="det-card">
      <div class="det-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="background:var(--gold);color:var(--navy);font-size:13px;font-weight:800;padding:4px 12px;border-radius:6px">${numId}</span>
          <span style="color:rgba(255,255,255,.7);font-size:13px">👤 Lead — ${l.nome||'Cliente'}</span>
        </div>
        <button onclick="closeDetModal()" style="background:none;border:none;color:rgba(255,255,255,.6);font-size:22px;cursor:pointer;line-height:1">×</button>
      </div>
      <div style="overflow-y:auto;max-height:65vh">
        <table class="det-table"><tbody>${rows}</tbody></table>
      </div>
      <div class="det-card-footer">
        <a href="https://wa.me/55${(l.whatsapp||'').replace(/\D/g,'')}" target="_blank" class="act-btn act-approve" style="text-decoration:none">📲 WhatsApp</a>
        <button class="adm-btn adm-btn-ghost" onclick="closeDetModal()">Fechar</button>
      </div>
    </div>`;
  document.getElementById('det-modal').style.display = 'flex';
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

// ─── Validações de Campos ─────────────────────────────────────────
function validarEmail(email) {
  if (!email) return true; // opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function validarCPF(cpf) {
  if (!cpf) return true; // opcional
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +n[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  if (r !== +n[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +n[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  return r === +n[10];
}

function validarWhatsApp(wa) {
  const n = wa.replace(/\D/g, '');
  return n.length >= 10 && n.length <= 11;
}

function formatarWhatsApp(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 2) v = v;
  else if (v.length <= 6) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  else if (v.length <= 10) v = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
  else v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  input.value = v;
}

function formatarCPF(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  input.value = v;
}

function formatarCEP(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  input.value = v;
}

async function buscarCEP(input) {
  const cep = input.value.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    if (d.erro) { mostrarErroCampo(input, 'CEP não encontrado'); return; }
    limparErroCampo(input);
    // preenche campos de endereço se existirem
    const endEl   = document.getElementById('p-end');
    const cidEl   = document.getElementById('p-cidade');
    if (endEl && !endEl.value) endEl.value = [d.logradouro, d.bairro].filter(Boolean).join(', ');
    if (cidEl && !cidEl.value) cidEl.value = d.localidade || 'Passos';
  } catch {}
}

function mostrarErroCampo(input, msg) {
  limparErroCampo(input);
  input.style.borderColor = '#dc2626';
  const err = document.createElement('div');
  err.className = 'field-error';
  err.style.cssText = 'color:#dc2626;font-size:11px;margin-top:3px;font-weight:500';
  err.textContent = '⚠ ' + msg;
  input.parentNode.appendChild(err);
}

function limparErroCampo(input) {
  input.style.borderColor = '';
  const old = input.parentNode.querySelector('.field-error');
  if (old) old.remove();
}

function nextStep(prefix, from, to) {
  // ── Validações Step 1 Cliente ──────────────────────────────────
  if (prefix === 'c' && from === 1) {
    const nomeEl  = document.getElementById('c-nome');
    const waEl    = document.getElementById('c-wa');
    const emailEl = document.getElementById('c-email');
    const cpfEl   = document.getElementById('c-cpf');

    let ok = true;
    if (!nomeEl.value.trim()) { mostrarErroCampo(nomeEl, 'Nome é obrigatório'); ok = false; }
    else limparErroCampo(nomeEl);
    if (!validarWhatsApp(waEl.value)) { mostrarErroCampo(waEl, 'WhatsApp inválido — informe DDD + número'); ok = false; }
    else limparErroCampo(waEl);
    if (emailEl && emailEl.value && !validarEmail(emailEl.value)) { mostrarErroCampo(emailEl, 'E-mail inválido'); ok = false; }
    else if (emailEl) limparErroCampo(emailEl);
    if (cpfEl && cpfEl.value && !validarCPF(cpfEl.value)) { mostrarErroCampo(cpfEl, 'CPF inválido'); ok = false; }
    else if (cpfEl) limparErroCampo(cpfEl);
    if (!ok) return;
  }

  // ── Validações Step 2 Proprietário ────────────────────────────
  if (prefix === 'p' && from === 2) {
    const nomeEl  = document.getElementById('p-nome');
    const waEl    = document.getElementById('p-wa');
    const emailEl = document.getElementById('p-email');
    const cpfEl   = document.getElementById('p-cpf');

    let ok = true;
    if (!nomeEl.value.trim()) { mostrarErroCampo(nomeEl, 'Nome é obrigatório'); ok = false; }
    else limparErroCampo(nomeEl);
    if (!validarWhatsApp(waEl.value)) { mostrarErroCampo(waEl, 'WhatsApp inválido — informe DDD + número'); ok = false; }
    else limparErroCampo(waEl);
    if (emailEl && emailEl.value && !validarEmail(emailEl.value)) { mostrarErroCampo(emailEl, 'E-mail inválido'); ok = false; }
    else if (emailEl) limparErroCampo(emailEl);
    if (cpfEl && cpfEl.value.replace(/\D/g,'') && !validarCPF(cpfEl.value)) { mostrarErroCampo(cpfEl, 'CPF inválido'); ok = false; }
    else if (cpfEl) limparErroCampo(cpfEl);
    if (!ok) return;
  }

  // ── Validações Step 3 Proprietário ────────────────────────────
  if (prefix === 'p' && from === 3) {
    const endEl = document.getElementById('p-end');
    const valEl = document.getElementById('p-valor');
    const cepEl = document.getElementById('p-cep');

    let ok = true;
    if (!endEl.value.trim()) { mostrarErroCampo(endEl, 'Endereço é obrigatório'); ok = false; }
    else limparErroCampo(endEl);
    if (!valEl.value.trim()) { mostrarErroCampo(valEl, 'Valor é obrigatório'); ok = false; }
    else limparErroCampo(valEl);
    if (cepEl && cepEl.value.replace(/\D/g,'').length > 0 && cepEl.value.replace(/\D/g,'').length !== 8) {
      mostrarErroCampo(cepEl, 'CEP deve ter 8 dígitos'); ok = false;
    } else if (cepEl) limparErroCampo(cepEl);
    if (!ok) return;
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

  if (prefix === 'c' && to === 3) _tsExecute('cliente',      'c-submit-btn', () => { tsClienteToken      = null; });
  if (prefix === 'p' && to === 4) _tsExecute('proprietario', 'p-submit-btn', () => { tsProprietarioToken = null; });
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

  // Única condição: token do Turnstile definido pelo callback
  const token = isCliente ? tsClienteToken : tsProprietarioToken;
  if (!token) {
    alert('Por favor, complete a verificação "Não sou um robô" antes de enviar.');
    return;
  }

  submitBtn.disabled    = true;
  submitBtn.textContent = '⏳ Enviando...';

  try {
    if (isCliente) {
      await API.post('/leads', {
        nome:           document.getElementById('c-nome').value.trim(),
        whatsapp:       document.getElementById('c-wa').value.trim(),
        email:          document.getElementById('c-email').value.trim(),
        cpf:            document.getElementById('c-cpf')?.value.trim() || '',
        tipo_imovel:    document.getElementById('c-tipo').value,
        finalidade:     document.getElementById('c-final').value,
        valor_maximo:   document.getElementById('c-valor').value,
        quartos_minimo: document.getElementById('c-quartos').value,
        bairro:         document.getElementById('c-bairro').value.trim(),
        observacoes:    document.getElementById('c-obs').value.trim(),
        como_contatar:  document.getElementById('c-contato').value,
        prazo:          document.getElementById('c-prazo').value,
        cf_token:       token,
      });
    } else {
      const tipoIm = document.getElementById('p-tipo').value;
      const dadosExtras = {};

      if (['casa','apartamento','aluguel'].includes(tipoIm)) {
        dadosExtras.aceita_fgts          = document.getElementById('p-fgts')?.value;
        dadosExtras.aceita_financiamento = document.getElementById('p-fin')?.value;
      } else if (tipoIm === 'fazenda') {
        dadosExtras.hectares         = document.getElementById('p-ha')?.value;
        dadosExtras.alqueires        = document.getElementById('p-alq')?.value;
        dadosExtras.distancia_passos = document.getElementById('p-dist')?.value;
      } else if (tipoIm === 'terreno') {
        dadosExtras.frente       = document.getElementById('p-frente')?.value;
        dadosExtras.topografia   = document.getElementById('p-topo')?.value;
        dadosExtras.documentacao = document.getElementById('p-doc')?.value;
      }

      await API.post('/pendentes', {
        formulario:   'proprietario',
        tipo_imovel:  tipoIm,
        modalidade:   document.getElementById('p-modal').value,
        nome:         document.getElementById('p-nome').value.trim(),
        whatsapp:     document.getElementById('p-wa').value.trim(),
        email:        document.getElementById('p-email').value.trim(),
        cpf:          document.getElementById('p-cpf')?.value.trim() || '',
        proprietario: document.getElementById('p-prop').value,
        endereco:     document.getElementById('p-end').value.trim(),
        cep:          document.getElementById('p-cep')?.value.trim() || '',
        cidade:       document.getElementById('p-cidade').value.trim(),
        valor:        document.getElementById('p-valor').value.trim(),
        fotos:        document.getElementById('p-fotos').value.trim(),
        descricao:    document.getElementById('p-desc').value.trim(),
        quartos:      document.getElementById('p-quartos')?.value || '',
        suites:       document.getElementById('p-suites')?.value  || '',
        vagas:        document.getElementById('p-vagas')?.value   || '',
        area:         document.getElementById('p-area')?.value    || document.getElementById('p-tarea')?.value || '',
        condo_iptu:   document.getElementById('p-condo')?.value   || '',
        dados_extras: dadosExtras,
        cf_token:     token,
      });
    }

    document.getElementById(prefix + '-body').style.display = 'none';
    document.getElementById(prefix + '-success').classList.add('show');
  } catch (e) {
    alert('Erro ao enviar: ' + e.message);
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Enviar';
  }
}


// ─── Modal Detalhes ───────────────────────────────────────────────
function openDetalhes(d) {
  if (typeof d === 'string') d = JSON.parse(d);
  const isImovel = !!d.titulo;
  const numId = '#' + String(d.id).padStart(4,'0');
  const extras = (() => { try { return JSON.parse(d.dados_extras||'{}'); } catch { return {}; } })();
  const extraHtml = Object.entries(extras).filter(([,v])=>v).map(([k,v])=>
    `<tr><td class="det-l">${k.replace(/_/g,' ')}</td><td class="det-v">${v}</td></tr>`).join('');

  let rows = '';
  if (isImovel) {
    rows = `
      <tr><td class="det-l">Tipo</td><td class="det-v">${TYPE_ICONS[d.tipo]||''} ${TYPE_LABELS[d.tipo]||d.tipo||'-'}</td></tr>
      <tr><td class="det-l">Modalidade</td><td class="det-v">${d.modal||'-'}</td></tr>
      <tr><td class="det-l">Endereço</td><td class="det-v">${d.endereco||'-'}</td></tr>
      <tr><td class="det-l">Cidade</td><td class="det-v">${d.cidade||'-'}</td></tr>
      <tr><td class="det-l">Valor</td><td class="det-v" style="color:var(--navy-light);font-weight:600">${d.valor?'R$ '+d.valor:'-'}</td></tr>
      <tr><td class="det-l">Área</td><td class="det-v">${d.area||'-'}</td></tr>
      <tr><td class="det-l">Quartos</td><td class="det-v">${d.quartos||'-'}</td></tr>
      <tr><td class="det-l">Vagas</td><td class="det-v">${d.vagas||'-'}</td></tr>
      <tr><td class="det-l">Status</td><td class="det-v">${d.status||'-'}</td></tr>
      <tr><td class="det-l">Destaque</td><td class="det-v">${d.destaque||'Não'}</td></tr>
      <tr><td class="det-l">Fotos</td><td class="det-v">${d.fotos?`<a href="${d.fotos}" target="_blank">Ver fotos</a>`:'-'}</td></tr>
      <tr><td class="det-l">Descrição</td><td class="det-v">${d.descricao||'-'}</td></tr>
      <tr><td class="det-l">Cadastrado em</td><td class="det-v">${new Date(d.criado_em).toLocaleString('pt-BR')}</td></tr>`;
  } else {
    const tipo = d.formulario==='cliente' ? '👤 Cliente buscando imóvel' : '🏠 Proprietário';
    const statusCor = {pendente:'#f59e0b',aprovado:'#16a34a',rejeitado:'#dc2626'}[d.status]||'#64748b';
    rows = `
      <tr><td class="det-l">Formulário</td><td class="det-v">${tipo}</td></tr>
      <tr><td class="det-l">Nome</td><td class="det-v"><strong>${d.nome||'-'}</strong></td></tr>
      <tr><td class="det-l">WhatsApp</td><td class="det-v"><a href="https://wa.me/55${(d.whatsapp||'').replace(/\D/g,'')}" target="_blank" style="color:#16a34a">${d.whatsapp||'-'}</a></td></tr>
      <tr><td class="det-l">E-mail</td><td class="det-v">${d.email||'-'}</td></tr>
      <tr><td class="det-l">CPF</td><td class="det-v">${d.cpf||'-'}</td></tr>
      <tr><td class="det-l">Tipo Imóvel</td><td class="det-v">${TYPE_ICONS[d.tipo_imovel]||''} ${TYPE_LABELS[d.tipo_imovel]||d.tipo_imovel||'-'}</td></tr>
      <tr><td class="det-l">Modalidade</td><td class="det-v">${d.modalidade||'-'}</td></tr>
      <tr><td class="det-l">Proprietário</td><td class="det-v">${d.proprietario||'-'}</td></tr>
      <tr><td class="det-l">CEP</td><td class="det-v">${d.cep||'-'}</td></tr>
      <tr><td class="det-l">Endereço</td><td class="det-v">${d.endereco||'-'}</td></tr>
      <tr><td class="det-l">Cidade</td><td class="det-v">${d.cidade||'-'}</td></tr>
      <tr><td class="det-l">Valor</td><td class="det-v" style="color:var(--navy-light);font-weight:600">${d.valor?'R$ '+d.valor:'-'}</td></tr>
      <tr><td class="det-l">Área</td><td class="det-v">${d.area||'-'}</td></tr>
      <tr><td class="det-l">Quartos</td><td class="det-v">${d.quartos||'-'}</td></tr>
      <tr><td class="det-l">Suítes</td><td class="det-v">${d.suites||'-'}</td></tr>
      <tr><td class="det-l">Vagas</td><td class="det-v">${d.vagas||'-'}</td></tr>
      <tr><td class="det-l">Cond./IPTU</td><td class="det-v">${d.condo_iptu||'-'}</td></tr>
      <tr><td class="det-l">Fotos</td><td class="det-v">${d.fotos?`<a href="${d.fotos}" target="_blank">Ver fotos</a>`:'-'}</td></tr>
      <tr><td class="det-l">Descrição</td><td class="det-v">${d.descricao||'-'}</td></tr>
      ${extraHtml}
      <tr><td class="det-l">Status</td><td class="det-v"><strong style="color:${statusCor}">${d.status||'-'}</strong></td></tr>
      ${d.motivo_rejeicao?`<tr><td class="det-l">Motivo</td><td class="det-v" style="color:#dc2626">${d.motivo_rejeicao}</td></tr>`:''}
      <tr><td class="det-l">Enviado em</td><td class="det-v">${new Date(d.criado_em).toLocaleString('pt-BR')}</td></tr>`;
  }

  document.getElementById('det-modal').innerHTML = `
    <div class="det-card">
      <div class="det-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="background:var(--gold);color:var(--navy);font-size:13px;font-weight:800;padding:4px 12px;border-radius:6px">${numId}</span>
          <span style="color:rgba(255,255,255,.7);font-size:13px">${isImovel ? (d.titulo||'Imóvel') : (d.nome||'Cadastro')}</span>
        </div>
        <button onclick="closeDetModal()" style="background:none;border:none;color:rgba(255,255,255,.6);font-size:22px;cursor:pointer;line-height:1">×</button>
      </div>
      <div style="overflow-y:auto;max-height:65vh">
        <table class="det-table"><tbody>${rows}</tbody></table>
      </div>
      <div class="det-card-footer">
        ${!isImovel && d.status==='pendente' ? `<button class="act-btn act-approve" onclick="aprovar(${d.id});closeDetModal()">✓ Aprovar</button><button class="act-btn act-reject" onclick="closeDetModal();openReject(${d.id})">✗ Rejeitar</button>` : ''}
        <button class="adm-btn adm-btn-ghost" onclick="closeDetModal()">Fechar</button>
      </div>
    </div>`;
  document.getElementById('det-modal').style.display='flex';
}
function closeDetModal() {
  const m = document.getElementById('det-modal');
  if (m) m.style.display='none';
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