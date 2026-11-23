/**
 * Output-encoding inventory for dashboard.html.   node tests/encoding.mjs [--write]
 *
 * WHY. Build 2026-11-24.2 escapes every value from Revizto, the user, browser storage or Claude before it reaches
 * the page as markup (CodeQL js/xss-through-dom on PR #5 and the audits behind it). This file keeps it that way.
 * It lists every place the app script splices a value into a string that is not provably escaped:
 *   - every `${…}` that is not ONE whole call to _esc / tcsEsc / fmt / encodeURIComponent, and
 *   - every operand of every `+` chain that contains a markup literal (a quoted string with `<` or `>`), wherever
 *     the operand sits in the chain — not only next to the markup.
 * Each entry is the FULL expression, whitespace-normalised (never truncated: a change anywhere in it is a new entry).
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
  if (i < 0) return '';
  const j = src.indexOf('</script>', i);
  return src.slice(i + 8, j < 0 ? src.length : j);
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

/* ------------------------------------------------------------------ a small JavaScript tokenizer
   Enough of the grammar to find `+` chains: strings, template literals (one token, nested `${}` included),
   regular-expression literals (told from division by the token before them), comments, punctuation, words. */
const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^',
  '=>', '==', '===', '!=', '!==', '&&', '||', '??', '+=', '-=', '*=', '/=', '<=', '>=',
  'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await']);
const PUNCT = ['===', '!==', '**=', '...', '>>>', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '+=', '-=', '*=', '/=',
  '%=', '&=', '|=', '^=', '++', '--', '<<', '>>'];

function skipTemplate(js, i) {              // i at the opening backtick; returns the index after the closing one
  let j = i + 1;
  while (j < js.length) {
    const c = js[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '`') return j + 1;
    if (c === '$' && js[j + 1] === '{') {
      let d = 1; j += 2;
      while (j < js.length && d > 0) {
        const k = js[j];
        if (k === '\\') { j += 2; continue; }
        if (k === '"' || k === "'") { j = skipString(js, j); continue; }
        if (k === '`') { j = skipTemplate(js, j); continue; }
        if (k === '{') d++; else if (k === '}') d--;
        j++;
      }
      continue;
    }
    j++;
  }
  return j;
}
function skipString(js, i) {
  const q = js[i]; let j = i + 1;
  while (j < js.length && js[j] !== q && js[j] !== '\n') { if (js[j] === '\\') j++; j++; }
  return j + 1;
}

export function tokens(js) {
  const out = []; let i = 0, prev = null;
  while (i < js.length) {
    const c = js[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && js[i + 1] === '/') { const e = js.indexOf('\n', i); i = e < 0 ? js.length : e; continue; }
    if (c === '/' && js[i + 1] === '*') { const e = js.indexOf('*/', i + 2); i = e < 0 ? js.length : e + 2; continue; }
    let t, j;
    if (c === '"' || c === "'") { j = skipString(js, i); t = { k: 'str', v: js.slice(i, j) }; }
    else if (c === '`') { j = skipTemplate(js, i); t = { k: 'tpl', v: js.slice(i, j) }; }
    else if (c === '/' && (prev === null || REGEX_AFTER.has(prev.v))) {
      j = i + 1; let cls = false;
      while (j < js.length && js[j] !== '\n') {
        if (js[j] === '\\') { j += 2; continue; }
        if (js[j] === '[') cls = true; else if (js[j] === ']') cls = false; else if (js[j] === '/' && !cls) break;
        j++;
      }
      j++; while (j < js.length && /[a-z]/i.test(js[j])) j++;
      t = { k: 're', v: js.slice(i, j) };
    } else if (/[A-Za-z0-9_$.]/.test(c)) {
      j = i; while (j < js.length && /[A-Za-z0-9_$.]/.test(js[j])) j++;
      if (js[j - 1] === '.' && js[j] === '.') j--;
      t = { k: 'w', v: js.slice(i, j) };
    } else {
      const p = PUNCT.find(x => js.startsWith(x, i));
      j = i + (p ? p.length : 1); t = { k: 'p', v: js.slice(i, j) };
    }
    t.at = i; t.end = j; out.push(t); prev = t; i = j;
  }
  return out;
}

const OPEN = new Set(['(', '[', '{']), CLOSE = new Set([')', ']', '}']);
const STOP = new Set([';', ',', '?', ':', '=', '=>', '&&', '||', '??', '+=', '-=', '*=', '/=', '==', '===', '!=', '!==', '<=', '>=',
  'return', 'throw', 'case', 'else', 'typeof']);
const isMarkup = t => t.k === 'str' && /[<>]/.test(t.v);

// every operand of every `+` chain that holds a markup literal
function concatenations(js) {
  const T = tokens(js), out = [], seenChains = new Set();
  for (let n = 0; n < T.length; n++) {
    if (!isMarkup(T[n])) continue;
    const plusNear = (T[n - 1] && T[n - 1].v === '+') || (T[n + 1] && T[n + 1].v === '+');
    if (!plusNear) continue;
    // walk left to the start of the chain, then right to its end, splitting on `+` at depth 0
    let a = n, d = 0;
    for (let i = n - 1; i >= 0; i--) {
      const v = T[i].v;
      if (CLOSE.has(v)) { d++; a = i; continue; }
      if (OPEN.has(v)) { if (d === 0) break; d--; a = i; continue; }
      if (d === 0 && (STOP.has(v) || (T[i].k === 'w' && STOP.has(v)))) break;
      a = i;
    }
    let b = n; d = 0;
    for (let i = n + 1; i < T.length; i++) {
      const v = T[i].v;
      if (OPEN.has(v)) { d++; b = i; continue; }
      if (CLOSE.has(v)) { if (d === 0) break; d--; b = i; continue; }
      if (d === 0 && STOP.has(v)) break;
      b = i;
    }
    const key = a + ':' + b; if (seenChains.has(key)) continue; seenChains.add(key);
    let start = a; d = 0;
    const flush = end => {
      if (end < start) return;
      const ops = T.slice(start, end + 1);
      if (ops.length === 1 && (ops[0].k === 'str' || ops[0].k === 'tpl')) return;   // literals (templates: see interpolations)
      out.push(js.slice(ops[0].at, ops[ops.length - 1].end));
    };
    for (let i = a; i <= b; i++) {
      const v = T[i].v;
      if (OPEN.has(v)) d++; else if (CLOSE.has(v)) d--;
      else if (d === 0 && v === '+') { flush(i - 1); start = i + 1; }
    }
    flush(b);
  }
  return out;
}

export function inventory(src) {
  const js = appScript(src), seen = {};
  for (const x0 of interpolations(js).concat(concatenations(js))) {
    const x = x0.replace(/\s+/g, ' ').trim();
    if (!x || ONE_CALL.test(x) || /^[\d.]+$/.test(x) || /^"[^"]*"$|^'[^']*'$/.test(x)) continue;
    seen[x] = (seen[x] || 0) + 1;
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
