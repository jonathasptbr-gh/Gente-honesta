// =========================================================================
// GERADOR do sprite de ícones (símbolos #ic-* no topo do <body> do index.html).
//
// USO:  npm install            # instala os 2 pacotes de dev (uma vez)
//       npm run icons:gen      # deriva do uso e reescreve o sprite NO index.html
//
// A lista de ícones NÃO é mais mantida à mão: vem de scripts/icon-usage.mjs
// (varre o código e junta todo nome referenciado). Para adicionar um ícone, basta
// USÁ-LO no código (via #ic-NOME, window.icon, setIcon, customAlert, data-icon,
// icon:, …) e rodar `npm run icons:gen`. O `npm run icons:check` (e o CI) falham
// se algum nome referenciado não tiver símbolo.
//
// Fonte dos desenhos: Material Symbols Rounded wght 500 (variante -fill = FILL 1);
// 9 ícones ausentes do pacote vêm do Material Icons "round" (IC_ROUND).
// =========================================================================
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { collectUsedIcons } from './icon-usage.mjs';

const ROOT = '.';
const SYM = './node_modules/@material-symbols/svg-500/rounded';         // Google Symbols Rounded wght500
const IC = JSON.parse(readFileSync('./node_modules/@iconify-json/ic/icons.json', 'utf8')); // Material Icons "round"
const INDEX = './index.html';

// Nomes que TAMBÉM ganham a variante CONTORNO (-o), usada nos contextos FILL 0 do
// CSS (meta-items dos cards Pro/vaga e botões de ajuda "?"). É uma escolha de
// RENDER (não de uso), então fica explícita. Os 4 primeiros são referenciados
// dinamicamente (`#ic-${icon}-o` no proFooter) — o scanner não os vê como -o.
const OUTLINE = 'attach_money qr_code_2 credit_card receipt_long attach_file schedule payments help'.split(' ');

// Ícones ausentes do pacote Google (v0.45.8): vêm do set "ic" (Material Icons
// Round, filled). A trinca GPP fica junta → visual uniforme no medidor do IC.
const IC_ROUND = {
  gpp_good: 'round-gpp-good', gpp_bad: 'round-gpp-bad', gpp_maybe: 'round-gpp-maybe',
  expand_more: 'round-expand-more', add_to_home_screen: 'round-add-to-home-screen',
  install_mobile: 'round-install-mobile', phone_android: 'round-phone-android',
  screen_rotation: 'round-screen-rotation', system_update: 'round-system-update',
};

const symInner = (file) => readFileSync(`${SYM}/${file}`, 'utf8').match(/<svg[^>]*>([\s\S]*?)<\/svg>/)[1].trim();
const fillFile = (n) => (existsSync(`${SYM}/${n}-fill.svg`) ? `${n}-fill.svg` : `${n}.svg`);

function fillSymbol(name) {
  if (IC_ROUND[name]) {
    const ic = IC.icons[IC_ROUND[name]];
    if (!ic) throw new Error(`IC_ROUND aponta p/ '${IC_ROUND[name]}' inexistente no set ic`);
    return `<symbol id="ic-${name}" viewBox="0 0 ${ic.width || IC.width || 24} ${ic.height || IC.height || 24}">${ic.body}</symbol>`;
  }
  if (!existsSync(`${SYM}/${name}-fill.svg`) && !existsSync(`${SYM}/${name}.svg`)) {
    throw new Error(`Ícone usado '${name}' não é um Material Symbol (nem está em IC_ROUND). ` +
      `Typo no código, ou precisa ser adicionado ao IC_ROUND?`);
  }
  return `<symbol id="ic-${name}" viewBox="0 -960 960 960">${symInner(fillFile(name))}</symbol>`;
}

const { used } = collectUsedIcons(ROOT);   // <- lista DERIVADA do uso
const symbols = [
  ...used.map(fillSymbol),
  ...OUTLINE.map((n) => `<symbol id="ic-${n}-o" viewBox="0 -960 960 960">${symInner(`${n}.svg`)}</symbol>`),
];

const sprite =
`    <!-- ============================================================================
         SPRITE DE ÍCONES (SVG inline) — substitui a fonte Material Symbols Rounded.
         Os ícones desenham no 1º paint, sem esperar download e SEM rede (offline no
         PWA). Cada <use href="#ic-NOME"> instancia um símbolo.
         GERADO por scripts/gen-icon-sprite.mjs (lista DERIVADA do uso via
         icon-usage.mjs) — não editar à mão; rode \`npm run icons:gen\`.
         ============================================================================ -->
    <svg xmlns="http://www.w3.org/2000/svg" class="icon-sprite" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>
${symbols.map((s) => '    ' + s).join('\n')}
    </defs></svg>`;

// Escreve DIRETO no index.html (substitui o bloco existente) — sem copiar-colar.
const html = readFileSync(INDEX, 'utf8');
const block = /    <!-- =+\n(?:.*\n)*?    <\/defs><\/svg>/m;
if (!block.test(html)) throw new Error('bloco do sprite não encontrado no index.html');
writeFileSync(INDEX, html.replace(block, sprite));

console.log(`Sprite reescrito no index.html: ${used.length} fill (${Object.keys(IC_ROUND).length} via ic) + ${OUTLINE.length} outline = ${symbols.length} símbolos.`);
