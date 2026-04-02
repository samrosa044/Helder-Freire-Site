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

    grid.innerHTML = imoveis.map(im => {
      const _fotos = (im.fotos||'').split(/[\n,]+/).map(u=>u.trim()).filter(u=>u.length>4);
      const _capa  = _fotos.length
        ? '<img src="'+_fotos[0]+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'">'
        : '<div class="pcard-type-icon">'+(TYPE_ICONS[im.tipo]||'🏠')+'</div>';
      const _json  = JSON.stringify(im).replace(/'/g,"&#39;");
      const _badge = im.modal==='Locação'?'badge-aluguel':im.destaque==='Sim'?'badge-novo':'badge-venda';
      const _label = im.modal==='Locação'?'Aluguel':im.destaque==='Sim'?'✓ Destaque':'Venda';
      return `
      <div class="pcard" onclick='abrirModalImovel(${_json})' style="cursor:pointer">
        <div class="pcard-img">
          <div class="pcard-img-bg"></div>
          ${_capa}
          <span class="pcard-badge ${_badge}">${_label}</span>
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
      </div>`;
    }).join('');
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
          <button class="act-btn act-reject"  onclick="openReject(${p.id})">✗ Rejeitar</button>
          <button class="act-btn act-delete"  onclick="delPendente(${p.id})" style="font-size:10px;padding:4px 7px">🗑</button>`;
      } else if (status === 'aprovado') {
        acoes = `<span style="color:var(--green);font-size:12px;font-weight:600">✅ Aprovado</span>
          <br><button class="act-btn act-reject" style="margin-top:4px;font-size:10px" onclick="openReject(${p.id})">Rejeitar</button>
          <button class="act-btn act-delete" style="margin-top:4px;font-size:10px;padding:4px 7px" onclick="delPendente(${p.id})">🗑</button>`;
      } else if (status === 'rejeitado') {
        const motivo = p.motivo_rejeicao ? `<br><span style="font-size:10px;color:var(--textl)">Motivo: ${p.motivo_rejeicao}</span>` : '';
        acoes = `<span style="color:var(--red);font-size:12px;font-weight:600">❌ Rejeitado</span>${motivo}
          <br><button class="act-btn act-approve" style="margin-top:4px;font-size:10px" onclick="aprovar(${p.id})">Aprovar</button>
          <button class="act-btn act-delete" style="margin-top:4px;font-size:10px;padding:4px 7px" onclick="delPendente(${p.id})">🗑</button>`;
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
  tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px">⏳ Carregando...</td></tr>';

  try {
    let lista = await API.get('/imoveis?all=1', true);
    if (busca) lista = lista.filter(i =>
      (i.titulo || '').toLowerCase().includes(busca.toLowerCase()) ||
      (i.tipo   || '').toLowerCase().includes(busca.toLowerCase())
    );

    if (!lista.length) {
      tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--textl)">Nenhum imóvel cadastrado</td></tr>';
      return;
    }

    tb.innerHTML = lista.map(im => {
      const numId  = '#' + String(im.id).padStart(4,'0');
      const imJson = JSON.stringify(im).replace(/'/g,"&#39;");
      return `
      <tr>
        <td><button onclick='openDetalhes(${imJson})' style="background:var(--navy);color:var(--gold);border:none;cursor:pointer;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;font-family:inherit">${numId}</button></td>
        <td>${TYPE_ICONS[im.tipo] || '🏠'} ${TYPE_LABELS[im.tipo] || im.tipo}</td>
        <td><strong>${im.titulo}</strong></td>
        <td style="color:var(--navy-light);font-weight:600">R$ ${im.valor}</td>
        <td>${im.cidade}</td>
        <td><span class="pill ${im.status === 'ativo' ? 'pill-approved' : 'pill-pending'}">${im.status === 'ativo' ? '✓ Ativo' : 'Inativo'}</span></td>
        <td style="white-space:nowrap;display:flex;gap:4px;flex-wrap:wrap">
          <button class="act-btn act-edit"   onclick='abrirEditarImovel(${imJson})'>✏️ Editar</button>
          <button class="act-btn act-reject" onclick="delImovel(${im.id})" style="font-size:10px">🗑</button>
        </td>
      </tr>`;
    }).join('');
  } catch (e) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red)">Erro ao carregar.</td></tr>';
  }
}

async function delImovel(id) {
  if (!confirm('Excluir este imóvel permanentemente? Esta ação não pode ser desfeita.')) return;
  try {
    await API.delete('/imoveis?id=' + id);
    await Promise.all([renderImoveis(), renderCatalogo(), updateKPIs()]);
  } catch (e) { alert('Erro: ' + e.message); }
}

async function delPendente(id) {
  if (!confirm('Apagar este cadastro permanentemente?')) return;
  try {
    await API.delete('/pendentes?id=' + id);
    await Promise.all([renderPendentes(), updateKPIs()]);
  } catch (e) { alert('Erro: ' + e.message); }
}

async function delLead(id) {
  if (!confirm('Apagar este lead permanentemente?')) return;
  try {
    await API.delete('/leads?id=' + id);
    renderLeads();
  } catch (e) { alert('Erro: ' + e.message); }
}

// ─── Modal Editar Imóvel ──────────────────────────────────────────
function abrirEditarImovel(im) {
  if (typeof im === 'string') im = JSON.parse(im);

  const TIPOS = ['casa','apartamento','fazenda','terreno','comercial','aluguel'];

  const tiposBtns = TIPOS.map(t => {
    const sel = im.tipo === t;
    return `<button type="button" onclick="eiSelecionarTipo(this,'${t}')"
      style="padding:7px 14px;border-radius:8px;border:2px solid ${sel?'var(--gold)':'#e2e8f0'};
             background:${sel?'var(--gold)':'#f8fafc'};color:${sel?'#0c2461':'#475569'};
             font-size:12px;font-weight:${sel?'700':'500'};cursor:pointer;transition:.15s">
      ${TYPE_ICONS[t]||''} ${TYPE_LABELS[t]||t}
    </button>`;
  }).join('');

  // Monta preview de fotos existentes
  const fotosExist = (im.fotos||'').split(/[\n,]+/).map(u=>u.trim()).filter(u=>u.length>4);
  const fotosPreviewHtml = fotosExist.length
    ? fotosExist.map((u,i) => `
        <div style="position:relative;display:inline-block">
          <img src="${u}" data-url="${u}" style="height:80px;width:110px;object-fit:cover;border-radius:8px;border:2px solid #e2e8f0" onerror="this.parentNode.style.display='none'">
          <button onclick="eiRemoverFoto(this)" style="position:absolute;top:-6px;right:-6px;background:#dc2626;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;line-height:1">×</button>
        </div>`).join('')
    : '';

  document.getElementById('det-modal').innerHTML = `
    <div class="det-card" style="max-width:800px;width:100%;background:#fff">
      <div class="det-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="background:var(--gold);color:var(--navy);font-size:13px;font-weight:800;padding:4px 12px;border-radius:6px">#${String(im.id).padStart(4,'0')}</span>
          <span style="color:rgba(255,255,255,.85);font-size:14px;font-weight:600">✏️ Editar Imóvel</span>
        </div>
        <button onclick="closeDetModal()" style="background:none;border:none;color:rgba(255,255,255,.6);font-size:24px;cursor:pointer;line-height:1">×</button>
      </div>

      <div style="overflow-y:auto;max-height:72vh;padding:24px 28px">
        <input type="hidden" id="ei-id" value="${im.id}">
        <input type="hidden" id="ei-tipo" value="${im.tipo||'casa'}">

        <!-- TIPO -->
        <div style="margin-bottom:20px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Tipo do Imóvel</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="ei-tipos-grid">${tiposBtns}</div>
        </div>

        <!-- CAMPOS PRINCIPAIS -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div style="grid-column:1/-1">
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Título do Anúncio *</label>
            <input id="ei-titulo" value="${(im.titulo||'').replace(/"/g,'&quot;')}" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Endereço / Localização *</label>
            <input id="ei-endereco" value="${(im.endereco||'').replace(/"/g,'&quot;')}" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Cidade</label>
            <input id="ei-cidade" value="${(im.cidade||'Passos').replace(/"/g,'&quot;')}" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Valor (R$) *</label>
            <input id="ei-valor" value="${(im.valor||'').replace(/"/g,'&quot;')}" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Área (m² ou ha)</label>
            <input id="ei-area" value="${(im.area||'').replace(/"/g,'&quot;')}" placeholder="Ex: 120 m²" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Quartos</label>
            <select id="ei-quartos" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              ${['-','1','2','3','4','5+'].map(v=>`<option${im.quartos===v?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Vagas</label>
            <select id="ei-vagas" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              ${['-','0','1','2','3','4+'].map(v=>`<option${im.vagas===v?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Modalidade</label>
            <select id="ei-modal" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              ${['Venda','Locação','Arrendamento','Venda e Locação'].map(v=>`<option${im.modal===v?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Status</label>
            <select id="ei-status" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              <option${im.status==='ativo'?' selected':''}>ativo</option>
              <option${im.status==='inativo'?' selected':''}>inativo</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Destaque na Home?</label>
            <select id="ei-destaque" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              <option${im.destaque==='Não'?' selected':''}>Não</option>
              <option${im.destaque==='Sim'?' selected':''}>Sim</option>
            </select>
          </div>
        </div>

        <!-- DESCRIÇÃO -->
        <div style="margin-bottom:20px">
          <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:5px">Descrição Completa</label>
          <textarea id="ei-descricao" rows="4" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit">${im.descricao||''}</textarea>
        </div>

        <!-- FOTOS -->
        <div style="border:2px dashed #e2e8f0;border-radius:10px;padding:18px">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">📸 Fotos do Imóvel</div>

          <!-- Upload de arquivo -->
          <div style="margin-bottom:14px">
            <label style="display:flex;align-items:center;gap:10px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;cursor:pointer;font-size:13px;color:#475569">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Selecionar fotos do computador
              <input type="file" id="ei-file-input" accept="image/*" multiple onchange="eiAdicionarFotosArquivo(this)" style="display:none">
            </label>
            <div style="font-size:10px;color:#94a3b8;margin-top:5px">JPG, PNG, WEBP — múltiplas fotos permitidas. As imagens serão salvas no banco de dados.</div>
          </div>

          <!-- Fotos atuais -->
          <div id="ei-fotos-grid" style="display:flex;gap:10px;flex-wrap:wrap;min-height:40px">
            ${fotosPreviewHtml || '<span style="font-size:12px;color:#94a3b8">Nenhuma foto ainda</span>'}
          </div>

          <!-- Campo oculto com os dados das fotos -->
          <input type="hidden" id="ei-fotos" value="${(im.fotos||'').replace(/"/g,'&quot;')}">
        </div>
      </div>

      <div class="det-card-footer" style="background:#f8fafc">
        <button onclick="salvarEdicaoImovel()" style="background:var(--gold);color:var(--navy);border:none;padding:11px 28px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">✓ Salvar Alterações</button>
        <button class="adm-btn adm-btn-ghost" onclick="closeDetModal()">Cancelar</button>
      </div>
    </div>`;

  document.getElementById('det-modal').style.display = 'flex';
}

function eiSelecionarTipo(btn, tipo) {
  document.getElementById('ei-tipo').value = tipo;
  document.querySelectorAll('#ei-tipos-grid button').forEach(b => {
    b.style.background = '#f8fafc';
    b.style.color = '#475569';
    b.style.borderColor = '#e2e8f0';
    b.style.fontWeight = '500';
  });
  btn.style.background = 'var(--gold)';
  btn.style.color = '#0c2461';
  btn.style.borderColor = 'var(--gold)';
  btn.style.fontWeight = '700';
}

function eiRemoverFoto(btn) {
  const wrap = btn.parentNode;
  const url  = wrap.querySelector('img').dataset.url;
  wrap.remove();
  // Atualiza lista de fotos removendo esta entrada
  const input = document.getElementById('ei-fotos');
  try {
    const lista = JSON.parse(input.dataset.lista||'[]');
    input.dataset.lista = JSON.stringify(lista.filter(u=>u!==url));
    // reconstroi o value para envio (apenas URLs http para salvar no banco)
    input.value = lista.filter(u=>u!==url && (u.startsWith('http')||u.startsWith('data:'))).join('\n');
  } catch {
    const novas = input.value.split(/[\n,]+/).map(u=>u.trim()).filter(u=>u && u!==url);
    input.value = novas.join('\n');
  }
  if (!document.querySelector('#ei-fotos-grid img')) {
    document.getElementById('ei-fotos-grid').innerHTML = '<span style="font-size:12px;color:#94a3b8">Nenhuma foto</span>';
  }
}

async function eiAdicionarFotosArquivo(input) {
  const grid = document.getElementById('ei-fotos-grid');
  const hiddenInput = document.getElementById('ei-fotos');
  const semFoto = grid.querySelector('span');
  if (semFoto) semFoto.remove();

  const files = Array.from(input.files);
  for (const file of files) {
    const b64 = await new Promise(res => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.readAsDataURL(file);
    });

    // Adiciona preview
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:inline-block';
    wrap.innerHTML = `
      <img src="${b64}" data-url="${b64}" style="height:80px;width:110px;object-fit:cover;border-radius:8px;border:2px solid #e2e8f0">
      <button onclick="eiRemoverFoto(this)" style="position:absolute;top:-6px;right:-6px;background:#dc2626;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;line-height:1">×</button>`;
    grid.appendChild(wrap);

    // Adiciona ao campo hidden
    const atual = hiddenInput.value.trim();
    hiddenInput.value = atual ? atual + '\n' + b64 : b64;
  }
  input.value = ''; // reset input para permitir re-selecionar
}

  document.getElementById('det-modal').innerHTML = `
    <div class="det-card" style="max-width:780px;width:100%">
      <div class="det-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="background:var(--gold);color:var(--navy);font-size:13px;font-weight:800;padding:4px 12px;border-radius:6px">#${String(im.id).padStart(4,'0')}</span>
          <span style="color:rgba(255,255,255,.85);font-size:14px;font-weight:600">✏️ Editar Imóvel</span>
        </div>
        <button onclick="closeDetModal()" style="background:none;border:none;color:rgba(255,255,255,.6);font-size:22px;cursor:pointer">×</button>
      </div>
      <div style="overflow-y:auto;max-height:70vh;padding:24px">
        <input type="hidden" id="ei-id" value="${im.id}">

        <div style="margin-bottom:18px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Tipo do Imóvel</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${tiposBtns}</div>
          <input type="hidden" id="ei-tipo" value="${im.tipo||'casa'}">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div style="grid-column:1/-1">
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Título do Anúncio *</label>
            <input id="ei-titulo" value="${(im.titulo||'').replace(/"/g,'&quot;')}" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Endereço / Localização *</label>
            <input id="ei-endereco" value="${(im.endereco||'').replace(/"/g,'&quot;')}" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Cidade</label>
            <input id="ei-cidade" value="${(im.cidade||'Passos').replace(/"/g,'&quot;')}" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Valor (R$) *</label>
            <input id="ei-valor" value="${(im.valor||'').replace(/"/g,'&quot;')}" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Área</label>
            <input id="ei-area" value="${(im.area||'').replace(/"/g,'&quot;')}" placeholder="Ex: 120 m²" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Quartos</label>
            <select id="ei-quartos" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              ${['-','1','2','3','4','5+'].map(v=>`<option${im.quartos===v?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Vagas</label>
            <select id="ei-vagas" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              ${['-','0','1','2','3','4+'].map(v=>`<option${im.vagas===v?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Modalidade</label>
            <select id="ei-modal" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              ${['Venda','Locação','Arrendamento','Venda e Locação'].map(v=>`<option${im.modal===v?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Status</label>
            <select id="ei-status" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              <option${im.status==='ativo'?' selected':''}>ativo</option>
              <option${im.status==='inativo'?' selected':''}>inativo</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Destaque na Home?</label>
            <select id="ei-destaque" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box">
              <option${im.destaque==='Não'?' selected':''}>Não</option>
              <option${im.destaque==='Sim'?' selected':''}>Sim</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:14px">
          <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Descrição Completa</label>
          <textarea id="ei-descricao" rows="4" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit">${im.descricao||''}</textarea>
        </div>

        <div>
          <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">
            📸 Fotos — cole links diretos de imagens separados por vírgula ou quebra de linha
          </label>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:6px">Formatos aceitos: links diretos (.jpg/.png) do Drive, Dropbox ou qualquer URL pública de imagem</div>
          <textarea id="ei-fotos" rows="3" placeholder="https://exemplo.com/foto1.jpg&#10;https://exemplo.com/foto2.jpg" style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;box-sizing:border-box;resize:vertical;font-family:monospace">${im.fotos||''}</textarea>
          <div id="ei-foto-preview" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"></div>
          <button type="button" onclick="previewFotos()" style="margin-top:6px;padding:5px 12px;font-size:11px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer">🔍 Pré-visualizar fotos</button>
        </div>
      </div>
      <div class="det-card-footer">
        <button class="act-btn act-approve" onclick="salvarEdicaoImovel()" style="padding:10px 24px;font-size:13px">✓ Salvar Alterações</button>
        <button class="adm-btn adm-btn-ghost" onclick="closeDetModal()">Cancelar</button>
      </div>
    </div>`;
  document.getElementById('det-modal').style.display = 'flex';
}

async function salvarEdicaoImovel() {
  const id    = document.getElementById('ei-id').value;
  const titulo   = document.getElementById('ei-titulo').value.trim();
  const endereco = document.getElementById('ei-endereco').value.trim();
  const valor    = document.getElementById('ei-valor').value.trim();
  if (!titulo || !endereco || !valor) { alert('Preencha Título, Endereço e Valor'); return; }

  const btn = document.querySelector('#det-modal .act-approve');
  btn.textContent = '⏳ Salvando...'; btn.disabled = true;

  try {
    await API.put('/imoveis', {
      id:       +id,
      tipo:     document.getElementById('ei-tipo').value,
      titulo, endereco,
      cidade:   document.getElementById('ei-cidade').value   || 'Passos',
      valor,
      area:     document.getElementById('ei-area').value     || '',
      quartos:  document.getElementById('ei-quartos').value  || '-',
      vagas:    document.getElementById('ei-vagas').value    || '-',
      modal:    document.getElementById('ei-modal').value    || 'Venda',
      descricao:document.getElementById('ei-descricao').value|| '',
      fotos:    document.getElementById('ei-fotos').value    || '',
      status:   document.getElementById('ei-status').value   || 'ativo',
      destaque: document.getElementById('ei-destaque').value || 'Não',
    }, true);
    closeDetModal();
    await Promise.all([renderImoveis(), renderCatalogo(), updateKPIs()]);
  } catch (e) {
    alert('Erro ao salvar: ' + e.message);
    btn.textContent = '✓ Salvar Alterações'; btn.disabled = false;
  }
}

// ─── Modal Público do Imóvel (página inicial) ─────────────────────
function abrirModalImovel(im) {
  if (typeof im === 'string') im = JSON.parse(im);

  // Processa fotos: aceita URLs separadas por vírgula/quebra de linha ou link único do Drive
  const rawFotos = im.fotos || '';
  const fotosArr = rawFotos.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith('http') || u.startsWith('data:'));
  let fotoIdx = 0;

  const galeriaHTML = fotosArr.length
    ? `<div id="pub-gallery" style="position:relative;background:#0a1628;border-radius:12px 12px 0 0;overflow:hidden;height:260px;flex-shrink:0">
        <img id="pub-foto-main" src="${fotosArr[0]}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
        ${fotosArr.length > 1 ? `
        <button onclick="pubFotoNav(-1)" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:34px;height:34px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">‹</button>
        <button onclick="pubFotoNav(1)"  style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:34px;height:34px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">›</button>
        <div id="pub-foto-counter" style="position:absolute;bottom:10px;right:14px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;padding:3px 9px;border-radius:10px">1 / ${fotosArr.length}</div>
        <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:5px">
          ${fotosArr.map((_,i) => `<div class="pub-dot${i===0?' pub-dot-on':''}" style="width:6px;height:6px;border-radius:50%;background:${i===0?'#fff':'rgba(255,255,255,.4)'};transition:.2s" onclick="pubFotoGo(${i})"></div>`).join('')}
        </div>` : ''}
      </div>`
    : `<div style="height:180px;background:linear-gradient(135deg,#0c2461,#1a3a7a);border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:center;font-size:64px;flex-shrink:0">${TYPE_ICONS[im.tipo]||'🏠'}</div>`;

  const badge = im.modal === 'Locação' ? 'Aluguel' : im.destaque === 'Sim' ? '✦ Destaque' : 'Venda';
  const badgeColor = im.modal === 'Locação' ? '#38bdf8' : im.destaque === 'Sim' ? '#c9a84c' : '#22c55e';

  const specs = [
    im.quartos && im.quartos !== '-' ? `<div style="text-align:center"><div style="font-size:20px">🛏</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">${im.quartos} quarto${im.quartos!=='1'?'s':''}</div></div>` : '',
    im.vagas   && im.vagas   !== '-' ? `<div style="text-align:center"><div style="font-size:20px">🚗</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">${im.vagas} vaga${im.vagas!=='1'?'s':''}</div></div>` : '',
    im.area                          ? `<div style="text-align:center"><div style="font-size:20px">📐</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">${im.area}</div></div>` : '',
    im.modal                         ? `<div style="text-align:center"><div style="font-size:20px">📋</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">${im.modal}</div></div>` : '',
  ].filter(Boolean).join('');

  const waNum = 'qr/XGTDJPC5WY2QM1'; // link do WhatsApp do corretor
  const waMsg = encodeURIComponent('Olá, Helder! Tenho interesse no imóvel: '+im.titulo+' — R$ '+im.valor+'. Pode me passar mais informações?');

  document.getElementById('pub-modal').innerHTML = `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:580px;max-height:92vh;overflow-y:auto;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.4)" onclick="event.stopPropagation()">
      ${galeriaHTML}
      <div style="padding:22px 24px 24px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px">
          <div>
            <div style="font-size:10px;font-weight:700;color:${badgeColor};letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">${badge} · ${TYPE_LABELS[im.tipo]||im.tipo}</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:#0c2461;font-weight:700;line-height:1.2">${im.titulo}</div>
          </div>
          <button onclick="fecharModalImovel()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;flex-shrink:0;padding:0;line-height:1">×</button>
        </div>

        <div style="font-size:12px;color:#64748b;margin-bottom:16px">📍 ${im.endereco ? im.endereco + (im.cidade ? ', ' + im.cidade : '') : im.cidade || '-'}</div>

        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#1a3a7a;font-weight:700;margin-bottom:16px">R$ ${im.valor}</div>

        ${specs ? `<div style="display:flex;gap:20px;flex-wrap:wrap;padding:14px 0;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;margin-bottom:16px">${specs}</div>` : ''}

        ${im.descricao ? `<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Descrição</div><div style="font-size:13px;color:#334155;line-height:1.7">${im.descricao}</div></div>` : ''}

        <a href="https://wa.me/${waNum}?text=${waMsg}" target="_blank"
           style="display:flex;align-items:center;justify-content:center;gap:10px;background:#22c55e;color:#fff;padding:14px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;transition:.2s">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Falar com Helder Freire
        </a>
      </div>
    </div>`;

  // Guarda fotos no escopo do modal para navegação
  window._pubFotos = fotosArr;
  window._pubFotoIdx = 0;
  document.getElementById('pub-modal').style.display = 'flex';
}

function pubFotoNav(dir) {
  const fotos = window._pubFotos || [];
  if (!fotos.length) return;
  window._pubFotoIdx = (window._pubFotoIdx + dir + fotos.length) % fotos.length;
  pubFotoGo(window._pubFotoIdx);
}

function pubFotoGo(idx) {
  const fotos = window._pubFotos || [];
  if (!fotos[idx]) return;
  window._pubFotoIdx = idx;
  const img = document.getElementById('pub-foto-main');
  if (img) img.src = fotos[idx];
  const counter = document.getElementById('pub-foto-counter');
  if (counter) counter.textContent = `${idx + 1} / ${fotos.length}`;
  document.querySelectorAll('.pub-dot').forEach((d, i) => {
    d.style.background = i === idx ? '#fff' : 'rgba(255,255,255,.4)';
  });
}

function fecharModalImovel() {
  document.getElementById('pub-modal').style.display = 'none';
}

// ─── Cadastrar Imóvel (Admin) ─────────────────────────────────────
let admCurrentType = 'casa';

function selectAdmType(tipo, btn) {
  admCurrentType = tipo;
  document.querySelectorAll('#tab-cadastrar .fchip').forEach(b => {
    b.classList.remove('active');
    b.style.background = 'var(--g100)';
    b.style.color = 'var(--text)';
    b.style.borderColor = 'var(--g200)';
    b.style.fontWeight = '';
  });
  btn.classList.add('active');
  btn.style.background = 'var(--gold)';
  btn.style.color = 'var(--navy)';
  btn.style.borderColor = 'var(--gold)';
  btn.style.fontWeight = '700';
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
        <td><button class="act-btn act-delete" onclick="delLead(${l.id})" style="font-size:10px;padding:4px 8px">🗑 Apagar</button></td>
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