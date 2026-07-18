// =========================================================================
// CHECKER de ícones — falha se algum ícone REFERENCIADO não tiver <symbol>.
//
//   node scripts/check-icons.mjs     (ou: npm run icons:check)
//
// Roda no CI (.github/workflows/deploy.yml) ANTES do deploy: um `<use href="#ic-X">`
// sem símbolo renderiza EM BRANCO sem erro, então isto bloqueia o deploy quebrado.
// Só usa `fs` — nenhum pacote npm (roda no runner sem `npm install`).
//
// Defesa em profundidade:
//  (a) todo nome que o scanner (icon-usage.mjs) considera USADO tem símbolo; e
//  (b) — independente do scanner — todo literal #ic-NOME / #ic-NOME-o no código
//      tem símbolo (pega typo em referência literal mesmo que o scanner cegue).
// =========================================================================
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { collectUsedIcons } from './icon-usage.mjs';

const ROOT = '.';

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const defined = new Set([...html.matchAll(/id="(ic-[a-z0-9_]+(?:-o)?)"/g)].map((m) => m[1]));

const files = [join(ROOT, 'index.html'),
  ...readdirSync(join(ROOT, 'js'), { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.js'))
    .map((f) => join(ROOT, 'js', f))];

// (a) nomes derivados do uso  →  precisam do símbolo de FILL `ic-NOME`
const { used } = collectUsedIcons(ROOT);
const missingUsed = used.filter((n) => !defined.has('ic-' + n));

// (b) literais #ic-... no código (inclui variantes -o) → precisam existir tais quais
const literalRefs = new Set();
for (const f of files)
  for (const m of readFileSync(f, 'utf8').matchAll(/#(ic-[a-z0-9_]+(?:-o)?)\b/g)) literalRefs.add(m[1]);
const missingLiteral = [...literalRefs].filter((id) => !defined.has(id)).sort();

if (missingUsed.length || missingLiteral.length) {
  console.error('✗ Ícones referenciados SEM símbolo no sprite (renderizariam em branco):');
  if (missingUsed.length) console.error('  • por uso (adicione ao código + rode `npm run icons:gen`):', missingUsed.join(', '));
  if (missingLiteral.length) console.error('  • em #ic-... literal:', missingLiteral.join(', '));
  console.error(`\nGere o sprite com: npm run icons:gen  (${defined.size} símbolos definidos hoje)`);
  process.exit(1);
}

console.log(`✓ Ícones OK — ${used.length} usados, ${defined.size} símbolos, 0 faltando.`);
