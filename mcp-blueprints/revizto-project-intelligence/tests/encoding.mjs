/**
 * Output-encoding inventory for dashboard.html.   node tests/encoding.mjs [--write]
 *
 * WHY. Build 2026-11-24.1 escapes every value from Revizto, the user, browser storage or Claude before it reaches
 * the page as markup (CodeQL js/xss-through-dom on PR #5 and the two audits behind it). This file keeps it that way.
 * It lists every place the app script splices a value into a string that is not provably escaped:
 *   - every `${…}` that is not ONE whole call to _esc / tcsEsc / fmt / encodeURIComponent, and
 *   - every operand concatenated with `+` onto a string literal that contains markup (`<` or `>`).
 * The list is pinned in tests/output-encoding.json (reviewed: fixed strings, numbers, constants, textContent or
 * setAttribute sinks, helpers that escape inside, values escaped where they are finally rendered). tests/run.mjs
 * fails if the page gains a splice that is not on the list, so a new one has to be escaped or visibly reviewed
 * in the pull request that adds it. The same file pins the escaped form of every fixed site.
 *
 *   node tests/encoding.mjs           print the inventory size
 *   node tests/encoding.mjs --write   rewrite the "reviewed" half of output-encoding.json from the page
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ASSET = path.join(ROOT, 'skills/project-intelligence-dashboard/assets/dashboard.html');
export const PINS = path.join(ROOT, 'tests/output-encoding.json');

// one whole escaping call, nothing outside it: `_esc(x)` passes, `_esc("")+x` and `_esc(a)||b` do not
const ONE_CALL = /^(?:_esc|tcsEsc|fmt|encodeURIComponent)\((?:[^()]|\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))*\)$/;

function appScript(src) {
  const i = src.indexOf('<script>\nconst CONFIG');
  return i < 0 ? '' : src.slice(i);
}

// every `${…}` (balanced braces), outermost only
function interpolations(js) {
  const out = [];
  for (let i = js.indexOf('${'); i >= 0; i = js.indexOf('${', i + 2)) {
    let d = 1, j = i + 2;
    while (j < js.length && d > 0) { const c = js[j]; if (c === '{') d++; else if (c === '}') d--; j++; }
    out.push(js.slice(i + 2, j - 1).trim());
    i = j - 2;
  }
  return out;
}

// operands joined with `+` to a quoted literal that contains markup
function concatenations(js) {
  const out = [];
  const lit = String.raw`(?:"(?:[^"\\\n]|\\.)*[<>](?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*[<>](?:[^'\\\n]|\\.)*')`;
  const opnd = String.raw`([A-Za-z_$(][^+;,\n]{0,120}?)`;
  for (const m of js.matchAll(new RegExp(lit + String.raw`\s*\+\s*` + opnd + String.raw`\s*(?=\+|\)|;|,|$)`, 'gm'))) out.push(m[1].trim());
  for (const m of js.matchAll(new RegExp(opnd + String.raw`\s*\+\s*` + lit, 'gm'))) out.push(m[1].trim());
  return out;
}

export function inventory(src) {
  const js = appScript(src), seen = {};
  for (const x of interpolations(js).concat(concatenations(js))) {
    if (!x || ONE_CALL.test(x) || /^[\d.]+$/.test(x) || /^"[^"]*"$|^'[^']*'$/.test(x)) continue;
    const k = x.replace(/\s+/g, ' ').slice(0, 120);
    seen[k] = (seen[k] || 0) + 1;
  }
  return seen;
}

// entries in the page beyond what the pinned list allows
export function unreviewed(src, reviewed) {
  const have = inventory(src), out = [];
  for (const [k, n] of Object.entries(have)) if (n > (reviewed[k] || 0)) out.push(k);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = fs.readFileSync(ASSET, 'utf8');
  const inv = inventory(src);
  if (process.argv.includes('--write')) {
    const pins = fs.existsSync(PINS) ? JSON.parse(fs.readFileSync(PINS, 'utf8')) : {};
    pins.reviewed = Object.fromEntries(Object.entries(inv).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    fs.writeFileSync(PINS, JSON.stringify(pins, null, 1) + '\n');
    console.log('wrote ' + path.relative(ROOT, PINS) + ': ' + Object.keys(inv).length + ' reviewed splices');
  } else console.log(Object.keys(inv).length + ' distinct splices, ' + Object.values(inv).reduce((a, b) => a + b, 0) + ' in all');
}
