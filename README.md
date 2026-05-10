# Helder Freire Imóveis — Redesign v2.0

## O que foi alterado

### Estrutura de páginas (partials)
- **nav.html** — Header redesenhado: barra superior com CRECI-MG/região, menu limpo com Início/Imóveis/Sobre/Anuncie/Contato, botão WhatsApp destacado. **Sem link Admin visível.**
- **hero.html** — Hero atualizado com novos textos, selos de confiança e stats
- **catalogo.html** — Mantido e funcional com filtros e carousel
- **sobre.html** — Seção Sobre completa com stats e forma de atendimento
- **anuncie.html** — Seção "Anuncie seu imóvel" com passo a passo
- **contato.html** — Seção de Contato com cards de canais
- **diferenciais.html** — Cards "Por que escolher a Helder Freire?"
- **cta-final.html** — CTA final com botões de conversão
- **footer.html** — Rodapé completo com 4 colunas. **Sem link Admin.**
- **float-wa.html** — Botão flutuante de WhatsApp

### Acesso Admin
- O botão Admin **foi removido** do menu público e do footer
- O painel admin continua funcionando normalmente
- Para acessar: adicione `?admin=1` na URL ou `#admin` no hash

### CSS
- **styles.css** — Completamente renovado com novos componentes
- **mobile.css** — Responsividade total para 360px–1440px+

## Como rodar localmente

```bash
npm install
npx wrangler pages dev public --compatibility-date=2024-01-01
```

## Configurações necessárias

1. **WhatsApp**: Substitua `5535999999999` pelo número real do Helder em todos os arquivos `.html` das partials
2. **Instagram**: Atualize `@helderfreire.imoveis` com o @ real
3. **Email**: Adicione o email de contato na seção contato.html
4. **Horário**: Atualize o horário de atendimento em contato.html

## Estrutura de pastas

```
site_redesign/
├── public/
│   ├── index.html
│   ├── css/
│   │   ├── styles.css
│   │   └── mobile.css
│   ├── js/
│   │   ├── loader.js
│   │   └── main.js
│   └── partials/
│       ├── nav.html          ← Header público (sem Admin)
│       ├── hero.html         ← Banner principal
│       ├── check-strip.html  ← Faixa de selos
│       ├── catalogo.html     ← Vitrine de imóveis
│       ├── sobre.html        ← Sobre a imobiliária
│       ├── anuncie.html      ← Anuncie seu imóvel
│       ├── contato.html      ← Contato
│       ├── diferenciais.html ← Diferenciais
│       ├── cta-final.html    ← CTA final
│       ├── footer.html       ← Rodapé (sem Admin)
│       ├── float-wa.html     ← Botão flutuante WA
│       ├── login.html        ← Tela login admin (hidden)
│       ├── admin-panel.html  ← Painel admin completo
│       └── modals-topo.html  ← Modais do sistema
└── functions/                ← API Cloudflare (inalterada)
```
