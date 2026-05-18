/**
 * loader.js — Helder Freire Imóveis
 * Carrega os partials HTML e monta a página dinamicamente.
 * Para editar uma seção, basta abrir o arquivo correspondente em public/partials/.
 */

const PARTIALS = [
  'login.html',       // Tela de login administrativo
  'modals-topo.html', // Modais: rejeição, detalhes, imóvel público
  'nav.html',         // Barra de navegação
  'hero.html',        // Banner principal
  'check-strip.html', // Faixa de selos (Imóveis Verificados, CRECI…)
  'catalogo.html',    // Grade de imóveis disponíveis
  'footer.html',      // Rodapé
  'admin-panel.html', // Painel administrativo completo
];

// Carrega um script e retorna Promise
function carregarScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload  = resolve;
    script.onerror = () => reject(new Error('Falha ao carregar: ' + src));
    document.body.appendChild(script);
  });
}

(async () => {
  try {
    // Carrega todos os partials em paralelo
    const respostas = await Promise.all(
      PARTIALS.map(nome => fetch(`/partials/${nome}`))
    );

    // Verifica se todos foram encontrados
    for (let i = 0; i < respostas.length; i++) {
      if (!respostas[i].ok) {
        console.error(`[loader] Partial não encontrado: ${PARTIALS[i]} (${respostas[i].status})`);
      }
    }

    // Lê o texto de cada partial
    const htmls = await Promise.all(respostas.map(r => r.text()));

    // Injeta tudo no body
    document.body.innerHTML = htmls.join('\n');

    // Carrega upload-fotos.js ANTES de main.js
    // (main.js chama _fotosObterUrls, _fotosLimpar, etc. definidas em upload-fotos.js)
    await carregarScript('/js/upload-fotos.js');

    // Carrega o script principal APÓS o DOM estar montado
    await carregarScript('/js/main.js');

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
