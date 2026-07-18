// Gerador do sprite de ícones (#ic-* no topo do <body> do index.html).
// USO:  npm i -D @material-symbols/svg-500 @iconify-json/ic
//       node scripts/gen-icon-sprite.mjs   # escreve scripts/icon-sprite.html
//       -> cole o conteúdo gerado no <body> do index.html (bloco <svg class="icon-sprite">).
// Para ADICIONAR um ícone: inclua o nome em FILL (e em OUTLINE se precisar da variante contorno).
import { readFileSync, writeFileSync, existsSync } from 'fs';
const SYM = './node_modules/@material-symbols/svg-500/rounded';        // Google Symbols Rounded wght500
const IC  = JSON.parse(readFileSync('./node_modules/@iconify-json/ic/icons.json','utf8')); // Material Icons "round"

const FILL = `add add_box add_to_home_screen arrow_back arrow_upward attach_file attach_money autorenew balance bolt bookmark campaign cancel chat chat_bubble check check_box check_box_outline_blank check_circle check_small chevron_right close cloud_off commute contract credit_card database delete directions_bus diversity_3 domain downloading edit edit_note error event_available event_busy expand_more filter_alt flag gpp_bad gpp_good gpp_maybe group_search groups health_and_safety help history home hourglass_top how_to_reg info install_mobile ios_share keyboard_arrow_down location_off location_on lock logout lunch_dining map medical_services more_horiz more_vert paid payments pending_actions person_add person_search phone_android phone_disabled photo_camera progress_activity public qr_code_2 radio_button_unchecked receipt_long redeem remove replay restaurant savings schedule school screen_rotation search share shield shield_question spa sync system_update task_alt travel_explore tune verified_user videocam_off view_agenda visibility warning work workspace_premium`.trim().split(/\s+/);
const OUTLINE = `attach_money qr_code_2 credit_card receipt_long attach_file schedule payments help`.trim().split(/\s+/);

// Ícones ausentes no pacote Google (v0.45.8): vêm do set "ic" (Material Icons Round, filled).
// A trinca GPP fica junta (mesma fonte → visual uniforme no medidor do IC).
const IC_ROUND = {
  gpp_good:'round-gpp-good', gpp_bad:'round-gpp-bad', gpp_maybe:'round-gpp-maybe',
  expand_more:'round-expand-more', add_to_home_screen:'round-add-to-home-screen',
  install_mobile:'round-install-mobile', phone_android:'round-phone-android',
  screen_rotation:'round-screen-rotation', system_update:'round-system-update',
};

const symInner = (file) => {
  const svg = readFileSync(`${SYM}/${file}`,'utf8');
  return (svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)[1].trim());
};
const fillFile = (n) => existsSync(`${SYM}/${n}-fill.svg`) ? `${n}-fill.svg` : `${n}.svg`;

const symbolFor = (name) => {
  if (IC_ROUND[name]) {
    const ic = IC.icons[IC_ROUND[name]];
    const vb = `0 0 ${ic.width||IC.width||24} ${ic.height||IC.height||24}`;
    return `<symbol id="ic-${name}" viewBox="${vb}">${ic.body}</symbol>`;
  }
  return `<symbol id="ic-${name}" viewBox="0 -960 960 960">${symInner(fillFile(name))}</symbol>`;
};

const dupes = FILL.filter((n,i)=>FILL.indexOf(n)!==i);
if (dupes.length) throw new Error('DUP: '+dupes);
if (FILL.length !== 102) throw new Error('contagem inesperada: '+FILL.length);

const symbols = [
  ...FILL.map(symbolFor),
  ...OUTLINE.map(n => `<symbol id="ic-${n}-o" viewBox="0 -960 960 960">${symInner(n+'.svg')}</symbol>`),
];

const sprite =
`<!-- ============================================================================
     SPRITE DE ÍCONES (SVG inline) — substitui a fonte Material Symbols Rounded.
     Os ícones desenham no 1º paint, sem esperar download de fonte e SEM rede
     (offline-safe no PWA). Cada <use href="#ic-NOME"> instancia um símbolo.
     Fonte: Material Symbols Rounded wght 500 (variante -fill = padrão FILL 1);
     sufixo "-o" = contorno (FILL 0), usado em meta-items e botões de ajuda.
     9 ícones ausentes do pacote (GPP + phone/install/rotation/update/expand)
     vêm do Material Icons "round". Cor via currentColor; tamanho via font-size.
     GERADO por scripts/gen-sprite — não editar à mão.
     ============================================================================ -->
<svg xmlns="http://www.w3.org/2000/svg" class="icon-sprite" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>
${symbols.join('\n')}
</defs></svg>`;

writeFileSync('./scripts/icon-sprite.html', sprite);
console.log(`Símbolos: ${FILL.length} fill (${Object.keys(IC_ROUND).length} via ic) + ${OUTLINE.length} outline = ${symbols.length}`);
console.log(`Sprite: ${(sprite.length/1024).toFixed(1)} KB (bruto)`);
