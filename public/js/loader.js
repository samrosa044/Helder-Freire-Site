/**
 * loader.js — Helder Freire Imóveis
 * Carrega os partials HTML e monta a página dinamicamente.
 */

const PARTIALS = [
  'login.html',
  'modals-topo.html',
  'nav.html',
  'hero.html',
  'check-strip.html',
  'catalogo.html',
  'footer.html',
  'admin-panel.html',
];

function carregarScript(src) {
  return new Promise((resolve, reject) => {
    const script    = document.createElement('script');
    script.src      = src;
    script.onload   = resolve;
    script.onerror  = () => reject(new Error('Falha ao carregar: ' + src));
    document.body.appendChild(script);
  });
}

(async () => {
  // ── Lê o hash ANTES de qualquer modificação do DOM ─────────────
  const _adminRequested = window.location.hash === '#admin';

  // Remove o hash da URL imediatamente (URL limpa, sem recarregar)
  if (_adminRequested) {
    history.replaceState(null, '', window.location.pathname);
  }

  try {
    const respostas = await Promise.all(
      PARTIALS.map(nome => fetch(`/partials/${nome}`))
    );

    for (let i = 0; i < respostas.length; i++) {
      if (!respostas[i].ok) {
        console.error(`[loader] Partial não encontrado: ${PARTIALS[i]} (${respostas[i].status})`);
      }
    }

    const htmls = await Promise.all(respostas.map(r => r.text()));
    document.body.innerHTML = htmls.join('\n');

    await carregarScript('/js/upload-fotos.js');
    await carregarScript('/js/main.js');

    // ── Acesso admin via URL /#admin ────────────────────────────
    // Sempre exige login — nunca abre o painel sem token válido.
    // openAdminFlow() verifica se já há token; se sim, abre direto;
    // se não, mostra o formulário de login.
    if (_adminRequested) {
      console.log('[admin] Acesso via URL /#admin detectado.');
      if (typeof openAdminFlow === 'function') {
        openAdminFlow();
      } else {
        console.error('[admin] openAdminFlow não encontrada. main.js carregou corretamente?');
      }
    }

  } catch (err) {
    console.error('[loader] Erro ao montar a página:', err);
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;
                  font-family:sans-serif;color:#c00;flex-direction:column;gap:12px;">
        <strong>Erro ao carregar a página.</strong>
        <small>${err.message}</small>
      </div>`;
  }
})();
