/**
 * Output-encoding inventory for dashboard.html.   node tests/encoding.mjs [--write]
 *
 * WHY. Build 2026-11-24.2 escapes every value from Revizto, the user, browser storage or Claude before it reaches
 * the page as markup (CodeQL js/xss-through-dom on PR #5 and the audits behind it). This file keeps it that way.
 * It reads the app script with a small tokenizer (strings, template literals, regular expressions and comments are
 * whole tokens, so a bracket, brace or quote inside one never counts as code) and lists every place a value can reach
 * the page as markup without provable escaping:
 *   1 every `${…}` that is not ONE whole call to _esc / tcsEsc / fmt / encodeURIComponent, and every such call that
 *     lands where that escaping is not enough (a URL attribute, an unquoted attribute, an event handler, a script or
 *     style block, or encodeURIComponent in a single-quoted attribute);
 *   2 every operand of every `+` chain that holds a markup literal (a string or template literal with `<`, `>`, an
 *     attribute opening such as `="`, or an escaped bracket) anywhere in it, at any bracket depth;
 *   3 every `x += value` and `x = x + value` whose value is not settled (a literal, a template or one escaping call);
 *   4 every mention of a markup sink, however spelled (`.innerHTML=`, `["innerHTML"]=`, `{innerHTML:…}`, outerHTML,
 *     srcdoc, `setAttribute("srcdoc",…)`, insertAdjacentHTML, document.write, setHTMLUnsafe,
 *     createContextualFragment, parseFromString), with the value it is given;
 *   5 in every function that returns markup anywhere, every return value that is not settled and is not a markup
 *     `+` chain (listed by 2).
 * escaperBindings() also checks the escapers are what the page says: each declared once, never reassigned, shadowed
 * or taken as a parameter.
 * Each entry is the FULL expression, whitespace-normalised (never truncated: a change anywhere in it is a new entry).
 * The list is pinned in tests/output-encoding.json (reviewed: fixed strings, numbers, constants, CSS selectors,
 * textContent or setAttribute sinks, helpers that escape inside, values escaped where they are built or finally
 * rendered). tests/run.mjs fails if the page gains an entry that is not on the list, so a new one has to be escaped
 * or visibly reviewed in the pull request that adds it. The same file pins the escaped form of every fixed site.
 *
 * THREAT MODEL. Accidental regressions in reviewed pull requests, not a hostile author (who could edit the pins).
 * Code written to evade a tokenizer is out of scope; the forms above are how such code is written by mistake.
 *
 * LIMITS. This is a source inventory, not a data-flow analysis. A variable is reviewed where it is spliced, not where
 * it is assigned: markup held in a variable (built by a ternary, Array.join, String.concat or replace()) is checked
 * through forms 1-5 only, so changing how an already-reviewed variable is built does not by itself add an entry. A
 * NEW splice of any variable always does (pinned counts have no slack). The behavioural check is the taint harness
 * (hostile data through the real page).
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

function appScript(src) {
  const i = src.indexOf('<script>\nconst CONFIG');
  if (i < 0) return '';
  const j = src.indexOf('</script>', i);
  return src.slice(i + 8, j < 0 ? src.length : j);
}

/* ------------------------------------------------------------------ a small JavaScript tokenizer
   Strings, template literals (one token; each `${…}` inside is tokenized the same way and kept as a part),
   regular-expression literals (told from division by the token before them), comments, punctuation, words. */
const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^',
  '=>', '==', '===', '!=', '!==', '&&', '||', '??', '+=', '-=', '*=', '/=', '<=', '>=', '...',
  'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await']);
const HEADS = new Set(['if', 'while', 'for', 'with']);
const OBJ_AFTER = new Set(['=', '(', ',', ':', '?', '[', '||', '&&', '??', 'return', '...', '+', '||=', '&&=', '??=']);
const PUNCT = ['>>>=', '===', '!==', '**=', '...', '>>>', '<<=', '>>=', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&',
  '||', '??', '?.', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '++', '--', '<<', '>>', '**'];

const LT = /[\n\r\u2028\u2029]/;   // line terminators
function skipString(js, i) {
  const q = js[i]; let j = i + 1;
  while (j < js.length && js[j] !== q && !LT.test(js[j])) { if (js[j] === '\\') j++; j++; }
  return j + 1;
}

// i at the opening backtick → { end (index after the closing backtick), parts: [{ at, end, toks }] for each `${…}` }
function readTemplate(js, i) {
  const parts = []; let j = i + 1;
  while (j < js.length) {
    const c = js[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '`') return { end: j + 1, parts };
    if (c === '$' && js[j + 1] === '{') {
      const r = lex(js, j + 2, true);
      parts.push({ at: j + 2, end: r.end, toks: r.toks });
      j = r.end + 1; continue;
    }
    j++;
  }
  return { end: j, parts };
}

// the `:` just lexed ends a label (`L:`) or a `case …:` / `default:`, so a `{` after it opens a block, not an object
function labelOrCase(out) {
  const n = out.length - 1, w = out[n - 1], before = out[n - 2];
  if (w && w.k === 'w' && (w.v === 'default' || !before || /^(?:;|\{|\})$/.test(before.v))) return true;
  for (let k = n - 1, d = 0; k >= 0 && k > n - 40; k--) {
    const v = out[k].v;
    if (v === ')' || v === ']') d++; else if (v === '(' || v === '[') d--;
    if (d < 0 || (d === 0 && /^(?:;|\{|\}|\?)$/.test(v))) return false;
    if (d === 0 && v === 'case' && out[k].k === 'w') return true;
  }
  return false;
}

// tokens from i; inInterp: stop at the `}` that closes a template's `${`
function lex(js, i, inInterp) {
  const out = [], parens = [], curls = []; let prev = null, braces = 0, nl = false;
  // a `/` after `)` starts a regex only when the `)` closes an if/while/for/with head; after `}` only when the
  // `}` closes a block, not an object literal
  const regexOk = () => prev === null || (prev.v === ')' ? prev.head : prev.v === '}' ? !prev.obj : REGEX_AFTER.has(prev.v));
  while (i < js.length) {
    const c = js[i];
    if (/\s/.test(c)) { if (LT.test(c)) nl = true; i++; continue; }
    if (c === '/' && js[i + 1] === '/') { let e = i; while (e < js.length && !LT.test(js[e])) e++; i = e; continue; }
    if (c === '/' && js[i + 1] === '*') { const e = js.indexOf('*/', i + 2); if (LT.test(js.slice(i, e < 0 ? js.length : e))) nl = true; i = e < 0 ? js.length : e + 2; continue; }
    if (inInterp && c === '}' && braces === 0) return { toks: out, end: i };
    let t, j;
    if (c === '"' || c === "'") { j = skipString(js, i); t = { k: 'str', v: js.slice(i, j) }; }
    else if (c === '`') { const r = readTemplate(js, i); j = r.end; t = { k: 'tpl', v: js.slice(i, j), parts: r.parts }; }
    else if (c === '/' && regexOk()) {
      j = i + 1; let cls = false;
      while (j < js.length && !LT.test(js[j])) {
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
      if (t.v === '{') { braces++; curls.push(prev !== null && OBJ_AFTER.has(prev.v) && !(prev.v === ':' && labelOrCase(out))); }
      else if (t.v === '}') { braces--; t.obj = curls.pop() === true; }
      else if (t.v === '(') parens.push(prev !== null && prev.k === 'w' && HEADS.has(prev.v) && !/^(?:\.|\?\.)$/.test((out[out.length - 2] || {}).v || ''));
      else if (t.v === ')') t.head = parens.pop() === true;
    }
    t.at = i; t.end = j; t.nl = nl; nl = false; out.push(t); prev = t; i = j;
  }
  return { toks: out, end: i };
}

export const tokens = js => lex(js, 0, false).toks;

const OPEN = new Set(['(', '[', '{']), CLOSE = new Set([')', ']', '}']);
const STOP = new Set([';', ',', '?', ':', '=', '=>', '&&', '||', '??', '+=', '-=', '*=', '/=', '%=', '==', '===', '!=', '!==',
  '<=', '>=', '&&=', '||=', '??=', 'return', 'throw', 'case', 'else', 'const', 'let', 'var', 'in', 'of']);
const ESCAPERS = new Set(['_esc', 'tcsEsc', 'fmt', 'encodeURIComponent']);
const isLit = t => t.k === 'str' || t.k === 're' || (t.k === 'w' && /^[\d.]+$/.test(t.v));
const MARKUP = /[<>]|=\s*\\?["']|\\x3[ce]|\\u003[ce]|&lt;|&gt;/i;   // a tag, an attribute value opening, or an escaped bracket
const hasMarkup = t => (t.k === 'str' || t.k === 'tpl') && MARKUP.test(t.v.slice(1, -1));
const SINK_PROP = /^(?:innerHTML|outerHTML|srcdoc)$/, SINK_CALL = /^(?:insertAdjacentHTML|write|writeln|setHTMLUnsafe|createContextualFragment|parseFromString)$/;
const lastSeg = v => v.slice(v.lastIndexOf('.') + 1);

// index of the bracket that closes T[i], or -1
function closer(T, i, last = T.length - 1) {
  let d = 0;
  for (let k = i; k <= last; k++) {
    if (T[k].k !== 'p') continue;
    if (OPEN.has(T[k].v)) d++;
    else if (CLOSE.has(T[k].v) && --d === 0) return k;
  }
  return -1;
}

// T[a..b] with redundant outer brackets removed: `(("x"))` → `"x"`
function unwrap(T, a, b) {
  while (b > a && T[a].v === '(' && T[b].v === ')' && closer(T, a, b) === b) { a++; b--; }
  return [a, b];
}

// T[a..b] is ONE whole escaping call and nothing else: `_esc(x)` yes; `_esc("(")+x+_esc(")")`, `_esc(a)||b` no
function oneCallTok(T, a, b) {
  [a, b] = unwrap(T, a, b);
  return b - a >= 2 && T[a].k === 'w' && ESCAPERS.has(T[a].v) && T[a + 1].v === '(' && closer(T, a + 1, b) === b;
}
export const oneCall = x => { const T = tokens(x); return T.length > 0 && oneCallTok(T, 0, T.length - 1); };

// T[a..b] needs no review: a literal, or a template (its `${}` are listed on their own), or one escaping call
function settled(T, a, b) {
  if (b < a) return true;
  [a, b] = unwrap(T, a, b);
  if (a === b && (isLit(T[a]) || T[a].k === 'tpl')) return true;
  return oneCallTok(T, a, b);
}

// a line break between T[i-1] and T[i] that ends the statement (automatic semicolon insertion)
const asi = (T, i) => {
  const q = T[i - 1], t = T[i];
  if (!q || !t || !t.nl) return false;
  const ends = q.k !== 'p' || q.v === ')' || q.v === ']';
  const starts = (t.k === 'w' && t.v[0] !== '.' && !/^(?:in|of|instanceof)$/.test(t.v)) || t.k === 'str' || t.k === 'tpl';
  return ends && starts;
};

// the extent of the expression around operator T[n]: [a, b], bounded by a STOP, an unmatched bracket or a statement
// end at depth 0
function extent(T, n) {
  let a = n, d = 0;
  for (let i = n - 1; i >= 0; i--) {
    const v = T[i].v, p = T[i].k === 'p' || T[i].k === 'w';
    if (d === 0 && asi(T, i + 1)) break;
    if (p && CLOSE.has(v)) { d++; a = i; continue; }
    if (p && OPEN.has(v)) { if (d === 0) break; d--; a = i; continue; }
    if (d === 0 && p && STOP.has(v)) break;
    a = i;
  }
  let b = n; d = 0;
  for (let i = n + 1; i < T.length; i++) {
    const v = T[i].v, p = T[i].k === 'p' || T[i].k === 'w';
    if (d === 0 && asi(T, i)) break;
    if (p && OPEN.has(v)) { d++; b = i; continue; }
    if (p && CLOSE.has(v)) { if (d === 0) break; d--; b = i; continue; }
    if (d === 0 && p && STOP.has(v)) break;
    b = i;
  }
  return [a, b];
}

// the right-hand side of an assignment or argument starting at i: up to `;` or `,` or an unmatched bracket
function rhs(T, i) {
  let d = 0, b = i - 1;
  for (let k = i; k < T.length; k++) {
    const v = T[k].v, p = T[k].k === 'p';
    if (p && OPEN.has(v)) d++;
    else if (p && CLOSE.has(v)) { if (d === 0) break; d--; }
    else if (d === 0 && p && (v === ';' || v === ',')) break;
    b = k;
  }
  return b;
}

// the `(` of the call whose arguments hold T[n], or -1
function callAround(T, n) {
  for (let k = n - 1, d = 0; k >= 0; k--) {
    const v = T[k].v, p = T[k].k === 'p';
    if (p && CLOSE.has(v)) d++;
    else if (p && OPEN.has(v)) { if (d-- > 0) continue; return v === '(' ? k : -1; }
    else if (d === 0 && p && v === ';') return -1;
  }
  return -1;
}

// an argument list T[o]…T[c] (the brackets) has an argument that is not settled
function unsettledArgs(T, o, c) {
  let start = o + 1, d = 0;
  for (let i = o + 1; i <= c; i++) {
    const v = T[i].v, p = T[i].k === 'p';
    if (i < c && p && OPEN.has(v)) d++;
    else if (i < c && p && CLOSE.has(v)) d--;
    else if (i === c || (d === 0 && p && v === ',')) { if (i - 1 >= start && !settled(T, start, i - 1)) return true; start = i + 1; }
  }
  return false;
}

// index of the bracket that opens T[c], or -1
function opener(T, c) {
  let d = 0;
  for (let k = c; k >= 0; k--) {
    if (T[k].k !== 'p') continue;
    if (CLOSE.has(T[k].v)) d++;
    else if (OPEN.has(T[k].v) && --d === 0) return k;
  }
  return -1;
}

// the `{` that opens the innermost function body around T[r] (-1: top level)
function fnOf(T, r) {
  let d = 0;
  for (let k = r - 1; k >= 0; k--) {
    if (T[k].k !== 'p') continue;
    const v = T[k].v;
    if (CLOSE.has(v)) { d++; continue; }
    if (!OPEN.has(v)) continue;
    if (d > 0) { d--; continue; }
    if (v !== '{') continue;
    const before = T[k - 1];
    if (before && before.v === '=>') return k;
    if (before && before.v === ')') {
      const o = opener(T, k - 1), h = T[o - 1], kw = (h && h.v === 'function') || (T[o - 2] && T[o - 2].v === 'function');
      if (!(h && h.k === 'w' && /^(?:if|for|while|switch|catch|with)$/.test(h.v)) && (kw || !T[k].nl)) return k;
    }
  }
  return -1;
}

// the last token of a return value starting at i (b < i: a bare `return`); ends at `;`, an unmatched bracket or a line
// break where the language would end the statement
function retEnd(T, i) {
  let d = 0, b = i - 1;
  for (let k = i; k < T.length; k++) {
    const t = T[k], v = t.v, p = t.k === 'p';
    if (k === i && t.nl) break;
    if (p && OPEN.has(v)) d++;
    else if (p && CLOSE.has(v)) { if (d === 0) break; d--; }
    else if (d === 0 && p && v === ';') break;
    else if (d === 0 && k > i && asi(T, k)) break;
    b = k;
  }
  return b;
}

// every `${…}` in a template token, outermost only (an inner one is part of its outer entry)
function interpolationsIn(T, js, out) {
  for (const t of T) if (t.k === 'tpl') {
    let from = t.at + 1, before = '';
    for (const part of t.parts) {
      before += js.slice(from, part.at - 2);
      out.push({ text: js.slice(part.at, part.end), toks: part.toks, before });
      before += 'x'; from = part.end + 1;
    }
  }
}

// escaping that does not fit where the value lands. _esc / tcsEsc keep a value inside text or a quoted attribute; they
// do not stop a URL's scheme (`javascript:`), CSS, markup in srcdoc, an event handler's script, an unquoted attribute
// or an attribute-name position; encodeURIComponent leaves `'`. `before` is the markup in front of the value, with
// every earlier value replaced by `x`.
const RISKY_ATTR = /^(?:on[a-z]+|href|src|srcset|srcdoc|action|formaction|xlink:href|poster|data|style|background|ping|manifest|codebase|cite|longdesc|usemap|lowsrc|dynsrc)$/i;
function htmlState(before) {
  if (/<(?:script|style)\b[^>]*>(?:(?!<\/(?:script|style))[\s\S])*$/i.test(before)) return { at: 'raw' };
  const lt = before.lastIndexOf('<'), gt = before.lastIndexOf('>');
  if (lt < 0 || gt > lt) return { at: 'text' };
  let q = null, cur = '', name = '', eq = false;
  for (const ch of before.slice(lt + 1)) {
    if (q) { if (ch === q) { q = null; eq = false; name = ''; } continue; }
    if (eq && (ch === '"' || ch === "'") && cur === '') { q = ch; continue; }
    if (ch === '=' && !eq) { name = cur; cur = ''; eq = true; continue; }
    if (/[\s/]/.test(ch)) { if (eq && cur !== '') { eq = false; name = ''; } if (!eq) cur = ''; continue; }
    cur += ch;
  }
  if (q) return { at: 'quoted', name, q };
  return { at: eq ? 'unquoted' : 'name', name };
}
function contextMisfit(before, Q) {
  const st = htmlState(before);
  if (st.at === 'text') return false;
  if (st.at !== 'quoted') return true;
  if (RISKY_ATTR.test(st.name)) return true;
  return Q[0].v === 'encodeURIComponent' && st.q === "'";
}
const litText = t => t.k === 'str' ? t.v.slice(1, -1)
  : t.k === 'tpl' ? (() => { let o = '', from = t.at + 1; for (const p of t.parts) { o += t.v.slice(from - t.at, p.at - 2 - t.at) + 'x'; from = p.end + 1; } return o + t.v.slice(from - t.at, t.v.length - 1); })() : 'x';

function entries(js) {
  const T = tokens(js), out = [];
  const text = (a, b) => js.slice(T[a].at, T[b].end);

  // 1 interpolations
  const ins = []; interpolationsIn(T, js, ins);
  // (a template inside is not settled here: only the outermost `${}` is listed, so the whole one is the entry)
  for (const x of ins) {
    const Q = x.toks, last = Q.length - 1;
    if (last < 0) continue;
    const [a, b] = unwrap(Q, 0, last);
    if (!((a === b && isLit(Q[a])) || oneCallTok(Q, 0, last))) out.push(x.text);
    else if (oneCallTok(Q, 0, last) && contextMisfit(x.before, Q.slice(a))) out.push('context ' + x.before.slice(-40).replace(/^[^<]*(?=<)/, '') + '${' + x.text + '}');
  }

  // 2 every operand of every `+` chain with a markup literal anywhere in it
  const chains = new Set();
  for (let n = 0; n < T.length; n++) {
    if (T[n].k !== 'p' || T[n].v !== '+') continue;
    const [a, b] = extent(T, n), key = a + ':' + b;
    if (chains.has(key)) continue; chains.add(key);
    let markup = false; for (let i = a; i <= b; i++) if (hasMarkup(T[i])) { markup = true; break; }
    if (!markup) continue;
    let start = a, d = 0, before = '';
    for (let i = a; i <= b + 1; i++) {
      const v = i <= b ? T[i].v : null, p = i <= b && T[i].k === 'p';
      if (p && OPEN.has(v)) d++; else if (p && CLOSE.has(v)) d--;
      else if (i > b || (d === 0 && p && v === '+')) {
        if (i - 1 >= start) {
          const [x, y] = unwrap(T, start, i - 1);
          if (!settled(T, start, i - 1)) out.push(text(start, i - 1));
          else if (oneCallTok(T, x, y) && contextMisfit(before, T.slice(x, y + 1))) out.push('context ' + before.slice(-40).replace(/^[^<]*(?=<)/, '') + '+' + text(start, i - 1));
          before += x === y ? litText(T[x]) : 'x';
        }
        start = i + 1;
      }
    }
  }

  // 3 accumulated markup: every `x += value`, and 4 direct sinks (a markup chain on the right is also split in 2)
  for (let n = 0; n < T.length; n++) {
    const t = T[n];
    if (t.k === 'p' && t.v === '+=') {
      const b = rhs(T, n + 1);
      // the target: `x`, `a.b`, `a[i]`, `a[i].b` — never the statement before it
      let a = n - 1;
      for (;;) {
        if (a > 0 && T[a].k === 'w' && T[a].v[0] === '.' && T[a - 1].v === ']') { a--; continue; }
        if (a > 0 && T[a].v === ']') { let d = 0, k = a; for (; k >= 0; k--) { if (T[k].v === ']') d++; else if (T[k].v === '[' && --d === 0) break; } a = k - 1; continue; }
        break;
      }
      if (a < 0 || T[a].k !== 'w') a++;
      if (!settled(T, n + 1, b)) out.push((a < n ? text(a, n - 1) : '') + ' += ' + text(n + 1, b));
    }
    // self-append without `+=`: `x = x + value`
    if (t.k === 'p' && t.v === '=' && n > 0 && T[n - 1].k === 'w' && T[n + 1] && T[n + 1].v === T[n - 1].v && T[n + 2] && T[n + 2].v === '+') {
      const b = rhs(T, n + 1);
      if (!settled(T, n + 1, b)) out.push(T[n - 1].v + ' = ' + text(n + 1, b));
    }
    // 4 sinks: any mention of a markup sink, however it is spelled (`.innerHTML=`, `["innerHTML"]=`, `{innerHTML:…}`,
    // `.srcdoc=`, `setAttribute("srcdoc",…)`, `insertAdjacentHTML(…)` / `.call(…)`, `document?.write(…)`, …)
    const sw = t.k === 'w' && (SINK_PROP.test(lastSeg(t.v)) || t.v.split('.').some(x => SINK_CALL.test(x)));
    const ss = (t.k === 'str' || (t.k === 'tpl' && !t.parts.length)) && (SINK_PROP.test(t.v.slice(1, -1)) || SINK_CALL.test(t.v.slice(1, -1)));
    if (sw || ss) {
      const label = sw ? '.' + lastSeg(t.v) : t.v;
      let k = n + 1;
      if (ss && T[k] && T[k].v === ']') k++;
      if (T[k] && T[k].v === '?.' && T[k + 1] && T[k + 1].v === '(') k++;
      const nx = T[k] && T[k].v;
      if (nx === '=' || nx === '+=' || nx === ':') {
        const b = rhs(T, k + 1);
        if (!settled(T, k + 1, b)) out.push(label + ' ' + nx + ' ' + text(k + 1, b));
      } else if (nx === '(' && (sw || ss)) {
        const c = closer(T, k);
        if (c > k && unsettledArgs(T, k, c)) out.push(label + text(k, c));
      } else if (ss && callAround(T, n) >= 0) {                           // setAttribute("srcdoc",v), Reflect.set(el,"innerHTML",v)
        const o = callAround(T, n), c = closer(T, o);
        if (c > n && unsettledArgs(T, o, c)) out.push(text(o, c));
      } else if (sw && nx !== '.' && !(nx === '?.' )) {
        const b = rhs(T, n);                                                  // any other use: the expression it is in
        out.push('sink ' + text(n, b));
      }
    }
  }

  // 5 returned markup: in a function that returns markup anywhere, every return value that is not settled and is not a
  // markup `+` chain (whose operands are listed in 2) — `return w.x`, `return c?"<b>"+_esc(a):w.x`, `return h+w.x`
  const fns = new Map();
  for (let r = 0; r < T.length; r++) {
    if (T[r].k !== 'w' || T[r].v !== 'return') continue;
    const f = fnOf(T, r), b = retEnd(T, r + 1);
    if (!fns.has(f)) fns.set(f, []);
    fns.get(f).push([r + 1, b]);
  }
  for (const rets of fns.values()) {
    const markup = ([a, b]) => { for (let i = a; i <= b; i++) if (hasMarkup(T[i])) return true; return false; };
    if (!rets.some(markup)) continue;
    for (const [a, b] of rets) {
      if (b < a || settled(T, a, b)) continue;
      let plus = false, other = false, d = 0;
      for (let i = a; i <= b; i++) {
        const v = T[i].v, p = T[i].k === 'p' || T[i].k === 'w';
        if (p && OPEN.has(v)) d++; else if (p && CLOSE.has(v)) d--;
        else if (d === 0 && v === '+' && T[i].k === 'p') plus = true;
        else if (d === 0 && p && STOP.has(v)) other = true;
      }
      if (plus && !other && markup([a, b])) continue;
      out.push('return ' + text(a, b));
    }
  }
  return out;
}

// the escapers are what the page says they are: each declared once, never reassigned, shadowed or taken as a parameter
// (else `const _esc=s=>s` anywhere would make every `_esc(x)` above look safe). Returns the violations.
export function escaperBindings(src) {
  const bad = [], decl = {};
  const walk = L => {
    for (let i = 0; i < L.length; i++) {
      const t = L[i];
      if (t.k === 'tpl') { for (const part of t.parts) walk(part.toks); continue; }
      if (t.k === 'w' && /^(?:with|eval|Function)$/.test(t.v) && L[i + 1] && L[i + 1].v === '(')
        { bad.push(t.v + '( makes the escapers unprovable'); continue; }
      if (t.k === 'w' && /(?:^|\.)String\.prototype(?:\.|$)/.test(t.v)) { bad.push('String.prototype is touched: ' + t.v); continue; }
      if (t.k === 'w' && t.v.includes('.') && ESCAPERS.has(lastSeg(t.v)) && L[i + 1] && /^(?:=|:|\+=|\|\|=|\?\?=|&&=)$/.test(L[i + 1].v))
        { bad.push(t.v + ' assigned'); continue; }
      if (t.k !== 'w' || !ESCAPERS.has(t.v)) continue;
      const pv = L[i - 1] && L[i - 1].v, nv = L[i + 1] && L[i + 1].v;
      if (pv === 'function' || (/^(?:const|let|var)$/.test(pv || '') && nv === '=')) { decl[t.v] = (decl[t.v] || 0) + 1; continue; }
      if (nv === '(' && pv !== '.' && pv !== '?.') continue;                                  // a call
      if ((pv === '(' || pv === ',') && (nv === ')' || nv === ',')) {                         // an argument, unless a parameter
        let o = i, d = 0; for (; o >= 0; o--) { const v = L[o].v; if (v === ')') d++; else if (v === '(' && d-- === 0) break; }
        const c = closer(L, o);
        const param = (L[c + 1] && L[c + 1].v === '=>') || (L[o - 1] && /^(?:function|catch)$/.test(L[o - 1].v)) || (L[o - 2] && L[o - 2].v === 'function');
        if (!param) continue;
      }
      bad.push(t.v + ' bound or used as a value: ' + L.slice(Math.max(0, i - 3), i + 4).map(x => x.v).join(' '));
    }
  };
  walk(tokens(appScript(src)));
  for (const n of ESCAPERS) if ((decl[n] || 0) !== (n === 'encodeURIComponent' ? 0 : 1)) bad.push(n + ' declared ' + (decl[n] || 0) + ' times');
  return bad;
}

export function inventory(src) {
  const seen = {};
  for (const x0 of entries(appScript(src))) {
    const x = x0.replace(/\s+/g, ' ').trim();
    if (x) seen[x] = (seen[x] || 0) + 1;
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
