// =========================================================================
// FONTE ÚNICA de "ícones que o app referencia".
// Usado pelo gerador do sprite (scripts/gen-icon-sprite.mjs) E pelo checker
// (scripts/check-icons.mjs). Varre index.html + js/**/*.js e junta TODO nome de
// ícone alcançável, cobrindo as 8 formas de referência do app. Só depende de `fs`.
//
// Por que existe: um `<use href="#ic-NOME">` para um NOME sem <symbol> renderiza
// EM BRANCO, sem erro. A lista de ícones não pode mais ser mantida à mão (já
// causou 7 diálogos em branco). Aqui ela é DERIVADA do uso.
// =========================================================================
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Formato de um nome de ícone Material Symbol: minúsculas + dígitos + underscore.
// Filtra títulos/mensagens (têm espaço/acento/maiúscula) — evita falso-positivo.
const ICON_RE = /^[a-z][a-z0-9_]*$/;

// Nomes que chegam a #ic-* por INDIREÇÃO que um scanner não vê com segurança:
//  - error/help: defaults dos diálogos (openDialog icon="error"; customConfirm "help").
//  - school/redeem: fallbacks do benefitIcon() (js/feed/index.js) que não aparecem
//    em nenhum data-icon/icon:/#ic- literal.
// (As demais saídas do benefitIcon e as do icShieldIcon já são cobertas por outros
//  padrões — data-icon, icon:, e #ic-gpp_* literais no index.html.)
export const EXTRAS = ['error', 'help', 'school', 'redeem'];

function listJsFiles(root) {
  const dir = join(root, 'js');
  return readdirSync(dir, { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.js'))
    .map((f) => join(dir, f));
}

// Devolve os args de TOPO de cada chamada `fnName(...)` em `text` (ciente de
// aspas/parênteses/colchetes/chaves e multilinha). Cada item = array de strings
// (um por argumento de topo).
function findCallArgs(text, fnName) {
  const calls = [];
  const needle = fnName + '(';
  let i = 0;
  while ((i = text.indexOf(needle, i)) !== -1) {
    // fronteira à esquerda: não casar quando colado a um identificador maior
    // (`mysetIcon(`); `.setIcon(`, ` customAlert(`, `await comingSoon(` passam.
    const before = text[i - 1];
    if (before && /[A-Za-z0-9_$]/.test(before)) { i += needle.length; continue; }
    let j = i + needle.length;
    let depth = 1, quote = null, argStart = j;
    const args = [];
    for (; j < text.length && depth > 0; j++) {
      const c = text[j];
      if (quote) { if (c === quote && text[j - 1] !== '\\') quote = null; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) { args.push(text.slice(argStart, j)); break; } }
      else if (c === ',' && depth === 1) { args.push(text.slice(argStart, j)); argStart = j + 1; }
    }
    calls.push(args.map((a) => a.trim()));
    i = j + 1;
  }
  return calls;
}

// Extrai nomes de ícone (formato ICON_RE) de literais string num trecho.
function tokensFrom(expr) {
  const out = [];
  const re = /['"]([A-Za-z0-9_]+)['"]/g;
  let m;
  while ((m = re.exec(expr)) !== null) if (ICON_RE.test(m[1])) out.push(m[1]);
  return out;
}

/**
 * @param {string} root  raiz do repo
 * @returns {{ used: string[], outlineRefs: string[] }}
 */
export function collectUsedIcons(root) {
  const files = [join(root, 'index.html'), ...listJsFiles(root)];
  const used = new Set(EXTRAS);
  const outline = new Set();

  for (const file of files) {
    const t = readFileSync(file, 'utf8');

    // 1) Literais #ic-NOME e #ic-NOME-o (interpolações `#ic-${...}` não casam)
    for (const m of t.matchAll(/#ic-([a-z0-9_]+)(-o)?\b/g)) {
      used.add(m[1]);
      if (m[2]) outline.add(m[1]);
    }
    // 2) window.icon('NOME') / "NOME"
    for (const m of t.matchAll(/\bicon\(\s*['"]([a-z0-9_]+)['"]/g)) if (ICON_RE.test(m[1])) used.add(m[1]);
    // 3) setIcon(el, <expr>) — 2º arg pode ser 'x' ou ternário 'a' : 'b'
    for (const args of findCallArgs(t, 'setIcon')) if (args[1]) tokensFrom(args[1]).forEach((n) => used.add(n));
    // 4) diálogos: o ícone é o 3º arg (índice 2), string literal
    for (const fn of ['customAlert', 'customConfirm', 'comingSoon'])
      for (const args of findCallArgs(t, fn)) if (args[2]) tokensFrom(args[2]).forEach((n) => used.add(n));
    // 5) icon: 'NOME' (config/repository/openDialog{...})
    for (const m of t.matchAll(/\bicon:\s*['"]([a-z0-9_]+)['"]/g)) if (ICON_RE.test(m[1])) used.add(m[1]);
    // 6) data-icon="NOME"
    for (const m of t.matchAll(/data-icon=['"]([a-z0-9_]+)['"]/g)) if (ICON_RE.test(m[1])) used.add(m[1]);
  }

  return { used: [...used].sort(), outlineRefs: [...outline].sort() };
}
