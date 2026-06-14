// =========================================================================
// PREVIEW VISUAL — captura screenshots do app em emulação mobile, sem deploy.
// Fluxo padrão para decisões puramente estéticas (cores, espaçamentos, design):
// gerar variantes em PNG, enviar no chat, e só fazer deploy da aprovada.
//
// Uso:
//   node tools/preview.js '<json>'
//   node tools/preview.js                # default: 1 shot da view-feed
//
// JSON: {
//   "view":  "view-feed" | "view-auth" | "view-onboarding" | "view-install",
//   "tab":   "vagas" | "home" | "pedidos",   // aba do feed a ativar
//   "shots": [{
//     "file":    "/tmp/x.png",
//     "css":     ":root{--bg-canvas:#124014 !important}",  // CSS override
//     "label":   "1 · texto do selo",
//     "scrollY": 300,                          // pixels a rolar antes do screenshot
//     "actions": [                             // sequência de interações após carregar
//       { "click": ".vaga-card__btn-apply" },  // clica num seletor CSS
//       { "wait":  700 },                      // espera N ms (ex: aguardar animação)
//       { "scroll": "#vagas-scroll", "top": 200 }  // rola um elemento scrollável
//     ]
//   }]
// }
//
// Particularidades DESTE ambiente (descobertas na sessão de 12/06/2026 — não remover):
// - ignoreHTTPSErrors: o proxy da rede usa CA própria que o Chromium rejeita;
// - serviceWorkers 'block': o SW intercepta as webfonts e falha atrás do proxy;
// - gstatic/firebasejs é bloqueado pela política de rede → stub do Firebase
//   (sem ele o app.js quebra na linha do initializeApp e showView não existe);
// - headless não dispara carregamento lazy de webfonts → document.fonts.load
//   explícito, senão os ícones Material Symbols renderizam como texto.
// =========================================================================
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8077;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const cfg = process.argv[2] ? JSON.parse(process.argv[2]) : {
  view: 'view-feed',
  shots: [{ file: '/tmp/preview.png', css: '', label: '' }],
};

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  for (const shot of cfg.shots) {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      serviceWorkers: 'block',
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    });
    await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.abort());
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.firebase = {
        apps: [],
        initializeApp() { this.apps.push({}); return {}; },
        auth() {
          return { onAuthStateChanged(cb) { setTimeout(() => cb(null), 50); }, languageCode: '' };
        },
        firestore() {
          return { collection() { return { doc() { return { get: async () => ({ exists: true }) } } } } };
        },
      };
      window.firebase.auth.RecaptchaVerifier = function () { return { render: async () => 0, clear() {} } };
    });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1600); // MINIMUM_LOADER_TIME do session.js + folga
    await page.evaluate(({ view, label, tab }) => {
      document.getElementById('loader-global')?.classList.add('u-hidden');
      if (typeof showView === 'function') showView(view);
      // Clica na aba correta dentro do feed (ex: "vagas", "pedidos", "home")
      if (tab) {
        document.querySelector(`.feed-tabs-pill__tab[data-tab="${tab}"]`)?.click();
      }
      if (label) {
        const tag = document.createElement('div');
        tag.textContent = label;
        tag.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);' +
          'background:#000c;color:#fff;padding:6px 14px;border-radius:20px;font:600 13px Inter,sans-serif;z-index:999999';
        document.body.appendChild(tag);
      }
    }, { view: cfg.view, label: shot.label, tab: shot.tab });
    // Executa sequência de ações (cliques, esperas, scroll) antes do screenshot
    for (const action of (shot.actions || [])) {
      if (action.click) {
        await page.click(action.click).catch(() => {});
      }
      if (action.wait) {
        await page.waitForTimeout(action.wait);
      }
      if (action.scroll) {
        await page.evaluate(({ sel, top }) => {
          const el = document.querySelector(sel);
          if (el) el.scrollTop = top || 0;
        }, { sel: action.scroll, top: action.top ?? 0 });
      }
    }
    // Scroll global da página (shorthand para rolar o viewport inteiro)
    if (shot.scrollY) {
      await page.evaluate(y => window.scrollBy(0, y), shot.scrollY);
      await page.waitForTimeout(200);
    }
    if (shot.css) await page.addStyleTag({ content: shot.css });
    await page.evaluate(() => Promise.all([
      document.fonts.load("400 16px Inter"),
      document.fonts.load("600 16px Inter"),
      document.fonts.load("800 16px Inter"),
      document.fonts.load("24px 'Material Symbols Rounded'"),
    ]).catch(() => {})).catch(() => {});
    await page.waitForTimeout(900); // animação screenIn + repaint dos glifos
    // sanidade: ligadura aplicada = glifo ~24px; texto cru = ~97px (fonte não carregou)
    const iconWidth = await page.evaluate(() => {
      const s = document.createElement('span');
      s.className = 'material-symbols-rounded';
      s.textContent = 'bookmark';
      s.style.cssText = 'position:fixed;top:-50px;font-size:24px';
      document.body.appendChild(s);
      const w = s.offsetWidth; s.remove(); return w;
    });
    if (iconWidth > 40) console.warn(`AVISO ${shot.file}: ícones não renderizaram (largura ${iconWidth}px) — fontes não carregaram`);
    await page.screenshot({ path: shot.file });
    await ctx.close();
    console.log('OK', shot.file);
  }
  await browser.close();
  server.close();
})();
