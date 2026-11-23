/**
 * Blueprint regression harness.   node tests/run.mjs
 *
 * Four gates, ordered by how expensive the bug they catch turned out to be:
 *   1  SYNTAX     the inline script parses at all
 *   2  CONTRACT   nothing can reach the wire that ARG_CONTRACT does not declare
 *   3  TAXONOMY   failures get the right KIND, and blame the right party
 *   4  HYGIENE    defects already shipped once cannot come back
 *
 * Gate 2 is the important one. The contract introduces exactly one risk: someone adds a
 * legitimately-new argument, forgets to declare it, and the contract silently strips it so
 * the feature quietly does nothing. This gate fails the build in that case. The silent-strip
 * failure therefore cannot be committed - only hand-edited in afterwards.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import os from 'os';
import crypto from 'crypto';
import { port, selftest as portSelftest, NATIVE_DIALOG, withoutShim } from '../../../tools/claudeai/port.mjs';
import { unreviewed as unreviewedSplices } from './encoding.mjs';

const ROOT  = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSET = path.join(ROOT, 'skills/project-intelligence-dashboard/assets/dashboard.html');
const SRC   = fs.readFileSync(ASSET, 'utf8');

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (detail ? '\n        ' + detail : '')); }
};
const section = t => console.log('\n' + t);

/* --------------------------------------------------------------------- helpers */
function inlineScript() {
  const blocks = [];
  for (const m of SRC.matchAll(/<script([^>]*)>([\s\S]*?)<\/script[^>]*>/gi)) {
    const attrs = m[1];
    if (/src=/i.test(attrs)) continue;
    const t = /type\s*=\s*["']([^"']+)/i.exec(attrs);
    if (t && !/javascript|module/i.test(t[1])) continue;
    blocks.push(m[2]);
  }
  return blocks;
}

/**
 * Strip comments so the static scanners read CODE, not prose.
 * Without this, a comment that merely *describes* a past defect (e.g. the WS37 note quoting
 * "list_issues limit:200/500") is indistinguishable from the defect itself, and the harness
 * reports a bug that does not exist. A test that cries wolf gets ignored, which is exactly the
 * failure mode the stale SKILL.md guard already demonstrated.
 * String, template AND regex literals are all respected. Regex handling is not optional: this
 * build contains regexes that themselves contain quote characters (unknownPropsIn's
 * /["'`]([A-Za-z_$][\w$]*)["'`]/g is one). A stripper that ignores regexes treats that quote as
 * the start of a string, desynchronises, and then fails to strip later comments - which is
 * precisely how an earlier draft of this harness reported a phantom `limit:200`.
 */
function stripComments(src) {
  let out = '', i = 0, instr = null;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (instr) {
      out += c;
      if (c === '\\') { out += (d ?? ''); i += 2; continue; }
      if (c === instr) instr = null;
      i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { instr = c; out += c; i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; out += ' '; continue; }
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; out += ' '; continue; }
    if (c === '/') {
      // regex literal? standard heuristic: a '/' after one of these tokens cannot be division.
      const prev = /[^\s]/.exec([...out].reverse().join('').slice(0, 4)) ? out.replace(/\s+$/, '').slice(-1) : '';
      if (prev === '' || '(,=:[!&|?{};+-*%~^'.includes(prev)) {
        let j = i + 1, cls = false;
        for (; j < src.length; j++) {
          const r = src[j];
          if (r === '\\') { j++; continue; }
          if (r === '[') cls = true;
          else if (r === ']') cls = false;
          else if (r === '/' && !cls) break;
          else if (r === '\n') { j = i; break; }        // not a regex after all
        }
        if (j > i) { out += src.slice(i, j + 1); i = j + 1; continue; }
      }
    }
    out += c; i++;
  }
  return out;
}
const CODE = stripComments(SRC);

/** top-level keys of the object literal whose '{' sits at src[i] */
function objectKeys(src, i) {
  let depth = 0, start = i + 1, instr = null;
  const parts = [];
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (instr) { if (c === '\\') { j++; continue; } if (c === instr) instr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { instr = c; continue; }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') {
      depth--;
      if (depth === 0) { parts.push(src.slice(start, j)); break; }
    } else if (c === ',' && depth === 1) { parts.push(src.slice(start, j)); start = j + 1; }
  }
  const keys = [], unresolved = [];
  for (let p of parts) {
    p = p.trim();
    if (!p) continue;
    let m = /^["']?([A-Za-z_$][\w$]*)["']?\s*:/.exec(p);
    if (m) { keys.push(m[1]); continue; }
    m = /^([A-Za-z_$][\w$]*)\s*$/.exec(p);              // shorthand  {page}
    if (m) { keys.push(m[1]); continue; }
    unresolved.push(p.slice(0, 70).replace(/\s+/g, ' '));
  }
  return { keys, unresolved };
}

/** evaluate a slice of the build's own source so tests run the SHIPPED code, not a copy */
function evalSlice(startMarker, endMarker, exportNames) {
  const i = SRC.indexOf(startMarker);
  const j = SRC.indexOf(endMarker, i);
  if (i < 0 || j < 0) throw new Error('could not slice source at ' + JSON.stringify(startMarker));
  return new Function(SRC.slice(i, j) + '\n;return {' + exportNames.join(',') + '};')();
}

/* ============================================================== 1  SYNTAX */
section('1  SYNTAX');
{
  const blocks = inlineScript();
  ok('exactly one inline script block', blocks.length === 1, 'found ' + blocks.length);
  /* A private, uniquely named directory rather than a fixed file name in the shared temp folder, which
     another user or process could pre-create or swap (code scanning: insecure temporary file, CWE-377). */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-syntax-'));
  const tmp = path.join(dir, 'check.mjs');
  let syntaxOk = true, err = '';
  try {
    fs.writeFileSync(tmp, blocks.join('\n;\n'), { mode: 0o600, flag: 'wx' });
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
  } catch (e) { syntaxOk = false; err = String(e.stderr || e).slice(0, 500); }
  finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
  ok('inline script parses', syntaxOk, err);
}

/* ============================================================ 2  CONTRACT */
section('2  CONTRACT  (no undeclared argument can reach the wire)');
let ARG_CONTRACT, contractCheck, CONTRACT_CAPTURED;
const pageLimits = [];   // [{tool,value}] literal `limit:` seen at real call sites (gate 4 reads this)
{
  const m = evalSlice('const CONTRACT_CAPTURED=', 'let CONTRACT_HITS=',
                      ['ARG_CONTRACT', 'CONTRACT_CAPTURED']);
  ARG_CONTRACT = m.ARG_CONTRACT; CONTRACT_CAPTURED = m.CONTRACT_CAPTURED;

  // contractCheck depends on CONTRACT_HITS / contractBanner; stub them so we test the logic alone
  const fnSrc = SRC.slice(SRC.indexOf('function contractCheck(name,args){'),
                          SRC.indexOf('/* deterministic refusals'));
  contractCheck = new Function(
    'ARG_CONTRACT', 'CONTRACT_CAPTURED',
    'var CONTRACT_HITS=[],CONFIG={buildStamp:"test"};' +
    'function contractBanner(){}' +
    'var console={error(){},log(){},warn(){}};' +
    fnSrc + '\n;return contractCheck;'
  )(ARG_CONTRACT, CONTRACT_CAPTURED);

  ok('contract table parsed', !!ARG_CONTRACT && typeof ARG_CONTRACT === 'object');
  ok('capture date recorded', /^\d{4}-\d{2}-\d{2}$/.test(CONTRACT_CAPTURED || ''), CONTRACT_CAPTURED);

  // --- behaviour -----------------------------------------------------------
  ok('WS36: _cb is stripped from list_accounts',
     JSON.stringify(contractCheck('mcp__x__list_accounts', { _cb: 'z' })) === '{}');
  ok('WS36: _cb stripped, legitimate arg preserved',
     JSON.stringify(contractCheck('mcp__x__list_licenses', { accountUuid: 'u', _cb: 'z' }))
       === JSON.stringify({ accountUuid: 'u' }));
  ok('clean args pass through by identity (no needless copying)',
     (() => { const a = { projectUuid: 'p' }; return contractCheck('mcp__x__list_sheets', a) === a; })());
  ok('unknown tool fails OPEN (never blocks a future tool)',
     (() => { const a = { anything: 1 }; return contractCheck('mcp__x__list_future_thing', a) === a; })());
  ok('write path is covered too',
     JSON.stringify(contractCheck('mcp__x__update_issues',
       { projectUuid: 'p', issueUuids: ['a'], deadlineExpr: 'next friday' }))
       === JSON.stringify({ projectUuid: 'p', issueUuids: ['a'] }));
  ok('prefix stripping tolerates any connector id',
     JSON.stringify(contractCheck('mcp__0000-1111-2222__list_accounts', { _cb: 1 })) === '{}');

  // --- completeness: every argument the SOURCE sends must be declared -------
  const found = new Map();                 // tool -> Set(keys)
  const unresolvedSites = [];
  const add = (tool, keys) => {
    if (!found.has(tool)) found.set(tool, new Set());
    keys.forEach(k => found.get(tool).add(k));
  };
  const noteLimits = (tool, i) => {
    // read the same object literal again, this time for literal numeric limit values
    const seg = CODE.slice(i, i + 400);
    const m = /limit:\s*(\d+)/.exec(seg);
    if (m) pageLimits.push({ tool, value: +m[1] });
  };
  // call(<expr>+"tool", {...})  and  call(<expr>+"tool", Object.assign({...}, ...))
  for (const m of CODE.matchAll(/\bcall\(\s*[A-Za-z_$][\w$]*\s*\+\s*"([a-z_]+)"\s*,\s*/g)) {
    const tool = m[1];
    let i = m.index + m[0].length;
    if (CODE[i] === '{') { const r = objectKeys(CODE, i); add(tool, r.keys); noteLimits(tool, i); r.unresolved.forEach(u => unresolvedSites.push(tool + ': ' + u)); continue; }
    const oa = /^Object\.assign\(\s*\{/.exec(CODE.slice(i, i + 24));
    if (oa) {
      const braceAt = i + CODE.slice(i).indexOf('{');
      const r = objectKeys(CODE, braceAt); add(tool, r.keys); noteLimits(tool, braceAt);
      r.unresolved.forEach(u => unresolvedSites.push(tool + ': ' + u));
      continue;
    }
    unresolvedSites.push(tool + ': non-literal args -> ' + CODE.slice(i, i + 60).replace(/\s+/g, ' '));
  }
  // reviewed dynamic contributors - each merged in via Object.assign at a site above.
  // Listed explicitly so the test proves them rather than skipping them.
  const REVIEWED_DYNAMIC = {
    // issueCount(prj, opts) -> merged into list_issues; opts literals scanned below
    list_issues: 'issueCount opts + rebalance serverArgs',
    update_issues: 'actNormalizeIntent change object'
  };
  for (const m of CODE.matchAll(/issueCount\(\s*[^,]{1,80},\s*\{/g)) {
    const r = objectKeys(CODE, m.index + m[0].length - 1);
    add('list_issues', r.keys);
  }
  for (const m of CODE.matchAll(/\bserverArgs\.([A-Za-z_$][\w$]*)\s*=/g)) add('list_issues', [m[1]]);
  for (const m of CODE.matchAll(/\bchange\.([A-Za-z_$][\w$]*)\s*=/g))     add('update_issues', [m[1]]);

  let undeclared = [];
  for (const [tool, keys] of found) {
    const allow = ARG_CONTRACT[tool];
    if (!allow) { undeclared.push(tool + ' (tool absent from ARG_CONTRACT entirely)'); continue; }
    for (const k of keys) if (!allow.includes(k)) undeclared.push(tool + '.' + k);
  }
  ok('every argument the source sends is declared in ARG_CONTRACT',
     undeclared.length === 0, undeclared.join(', '));
  ok('no unresolvable argument site (each must be reviewed and listed)',
     unresolvedSites.every(s => REVIEWED_DYNAMIC[s.split(':')[0]]),
     unresolvedSites.filter(s => !REVIEWED_DYNAMIC[s.split(':')[0]]).join('\n        '));
  ok('every tool called in source appears in ARG_CONTRACT',
     [...found.keys()].every(t => ARG_CONTRACT[t]),
     [...found.keys()].filter(t => !ARG_CONTRACT[t]).join(', '));
}

/* ============================================================ 3  TAXONOMY */
section('3  TAXONOMY  (right kind, right party blamed)');
{
  const { mcpFailKind, unknownPropsIn } =
    evalSlice('function unknownPropsIn(m)', 'let CONNSTATE=', ['mcpFailKind', 'unknownPropsIn']);
  const K = m => mcpFailKind({ mcpMsg: m }).k;
  const REAL = `Invalid parameters for tool 'list_accounts': Additional object properties are not allowed: ["_cb"]`;

  ok('WS36 message -> clientargs, not drift', K(REAL) === 'clientargs', K(REAL));
  ok('unknownPropsIn extracts the property, not the tool name',
     JSON.stringify(unknownPropsIn(REAL)) === JSON.stringify(['_cb']));
  ok('genuine server drift still -> drift',
     K("Invalid parameters for tool 'list_licenses': Missing required property `accountUuid`") === 'drift');
  ok('WS28d limit ceiling still -> drift',
     K("Invalid parameters for tool 'list_issues': Property '/limit': Number must be <= 100") === 'drift');
  ok('appauth untouched', K('You are not authorized to access this account') === 'appauth');
  ok('rights untouched',  K("You don't have enough rights to perform this action.") === 'rights');
  ok('gone untouched',    K('Failed to parse SSE message') === 'gone');
  ok('xregion untouched', K('Direct API access is forbidden') === 'xregion');
  ok('notfound untouched', K('Entity not found') === 'notfound');
  ok('no false-positive sanitiser trigger on unrelated failures',
     unknownPropsIn('Entity not found').length === 0 &&
     unknownPropsIn('Missing required property `accountUuid`').length === 0 &&
     unknownPropsIn('').length === 0);

  const d = mcpFailKind({ mcpMsg: REAL }).d;
  ok('clientargs message names the offending property', /_cb/.test(d));
  ok('clientargs message exonerates connector/account/licence',
     /not in your connector, your account or your licence/.test(d));
  ok('clientargs message does NOT tell the user to reconnect', !/reconnect/i.test(d));
}

/* ============================================================= 4  HYGIENE */
section('4  HYGIENE  (shipped defects cannot return)');
{
  ok('WS36: no synthetic cache-bust property anywhere', !/\._cb\s*=/.test(CODE));
  ok('WS36: no `busted` argument object remains', !/\bbusted\b/.test(CODE));
  ok('WS36: call() sends `base`, never a mutated copy', /await once\(base\)/.test(CODE));
  ok('contract is applied at the choke point',
     /const base=contractCheck\(name,Object\.assign\(\{\},args\|\|\{\}\)\)/.test(CODE));
  // Reads are capped at 100 by the server (WS28d). WRITE_BATCH is deliberately NOT capped -
  // update_issues takes an issueUuids array with no documented maximum - so the two must never
  // share a constant. This gate reads literal `limit:` values at REAL CALL SITES only, which is
  // both the precise expression of the rule and immune to prose that merely describes the bug.
  {
    const over = pageLimits.filter(p => p.tool !== 'update_issues' && p.value > 100);
    ok('WS28d: no read call site requests a page size above 100',
       over.length === 0, over.map(p => p.tool + ':' + p.value).join(', '));
    ok('page-size gate actually inspected some call sites', pageLimits.length > 0,
       'scanner found no literal limits at all - the gate would pass vacuously');
  }
  ok('bundled asset ships NO baked connectors (never leak an installer\'s ids)',
     /connectors:\[\s*(?:\/\*)/.test(SRC) && !/prefix:"mcp__[0-9a-f]{8}-/.test(SRC));
  {
    const rn = (/const REGION_NAMES=\{([^}]*)\}/.exec(SRC) || [])[1] || '';
    ok('REGION_NAMES names no internal or pre-production region',
       rn.length > 0 && !/stage|barcelona/i.test(rn),
       rn.length ? 'offending label present' : 'REGION_NAMES not found - gate would pass vacuously');
  }
  ok('no private/stage environment concept ships',
     !/env\s*:\s*["'](?:stage|prod)["']|\.env\s*===|cbadge stage|private stage/i.test(SRC));
  ok('bundled asset carries no cowork-artifact-meta header',
     !/^<!doctype html><script type="application\/json" id="cowork-artifact-meta"/i.test(SRC));
  ok('build stamp present and well-formed',
     /buildStamp:"\d{4}-\d{2}-\d{2}[.\w]*"/.test(SRC),
     (/buildStamp:"([^"]*)"/.exec(SRC) || [])[1]);
}

/* ============================================================= 5  MANIFEST */
section('5  MANIFEST  (the install guard describes the file beside it)');
{
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--check'],
                       { stdio: 'pipe' }).toString();
  } catch (e) { code = e.status || 1; out = String(e.stdout || '') + String(e.stderr || ''); }
  ok('manifest.json is present and current', code === 0, out.trim());

  const MAN = path.join(ROOT, 'skills/project-intelligence-dashboard/assets/manifest.json');
  if (fs.existsSync(MAN)) {
    const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
    // The tool list is the thing that actually broke an install once (a 1.0.2 skill declaring nine
    // tools against a 1.0.3 build that needed list_accounts -> "no licences at all"). It must be
    // derived from the contract, never transcribed.
    ok('manifest declares list_accounts as a read tool',
       man.tools.read.includes('list_accounts'),
       'licence discovery starts here; omitting it finds zero licences');
    ok('manifest read-tool list matches ARG_CONTRACT exactly',
       JSON.stringify(man.tools.read) ===
       JSON.stringify(Object.keys(ARG_CONTRACT).filter(t => !/(update|create|delete|change|add|remove|invite|set|restore|reorder)_/.test(t)).sort()));
    ok('manifest build stamp matches the asset',
       man.buildStamp === (/buildStamp:"([^"]+)"/.exec(SRC) || [])[1]);
  }

  // SKILL.md must not re-introduce hardcoded numbers - that is the staleness this replaced.
  const SKILL = path.join(ROOT, 'skills/project-intelligence-dashboard/SKILL.md');
  if (fs.existsSync(SKILL)) {
    const md = fs.readFileSync(SKILL, 'utf8');
    ok('SKILL.md states no hardcoded asset size',
       !/[≈~]\s*\d{3,}[,\d]*\s*(?:bytes|KB)/i.test(md),
       (/[≈~]\s*\d{3,}[,\d]*\s*(?:bytes|KB)/i.exec(md) || [])[0]);
    ok('SKILL.md states no hardcoded line count',
       !/[≈~]\s*[\d,]{3,}\s*lines/i.test(md),
       (/[≈~]\s*[\d,]{3,}\s*lines/i.exec(md) || [])[0]);
    ok('SKILL.md pins no literal buildStamp to verify against',
       !/verif\w*[^.]{0,80}buildStamp:"\d/i.test(md));
  }
}

/* ============================================================== 6  VERSION */
section('6  VERSION  (one release, one number, in every file that states it)');
{
  // The plugin version is written independently in four places. Nothing kept them in step, and a
  // mismatch is not cosmetic: Claude reports the marketplace version at install, so a stale entry
  // silently serves customers an older plugin than the repo claims to ship.
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const plugin = JSON.parse(read('.claude-plugin/plugin.json')).version;
  // Declared change: the marketplace now lives at the repository root, two levels above this plugin,
  // and lists more than one plugin. Read it there and take this plugin's own entry by name.
  const marketFile = JSON.parse(fs.readFileSync(path.join(ROOT, '..', '..', '.claude-plugin/marketplace.json'), 'utf8'));
  const market = ((marketFile.plugins || []).find(p => p.name === 'revizto-project-intelligence') || {}).version;
  const skill  = (/^\s*version:\s*"([^"]+)"/m.exec(read('skills/project-intelligence-dashboard/SKILL.md')) || [])[1];
  const readme = read('README.md');
  const changelog = (/^##\s*(\d+\.\d+\.\d+)/m.exec(read('CHANGELOG.md')) || [])[1];

  ok('plugin.json and marketplace.json agree', plugin === market, plugin + ' vs ' + market);
  ok('SKILL.md metadata version agrees', skill === plugin, skill + ' vs ' + plugin);
  ok('CHANGELOG top entry is this version', changelog === plugin, changelog + ' vs ' + plugin);
  ok('README package name names this version',
     readme.includes('revizto-project-intelligence-v' + plugin + '.plugin'));
  ok('README install-detail version agrees',
     new RegExp('at version \\*\\*' + plugin.replace(/\./g, '\\.') + '\\*\\*').test(readme));

  // The CHANGELOG heading quotes the dashboard build stamp; it must be the one that ships.
  const stamp = (/buildStamp:"([^"]+)"/.exec(SRC) || [])[1];
  // split(/\n## /)[1] is the FIRST release section including its own heading text. Using [0] takes
  // only the file title above it - which is how an earlier draft of this gate reported a stale
  // stamp that was in fact correct. Same lesson as the phantom `limit:200`: check the checker.
  const topSection = read('CHANGELOG.md').split(/\n## /)[1] || '';
  ok('CHANGELOG top entry quotes the shipped build stamp',
     new RegExp('`' + stamp.replace(/\./g, '\\.') + '`').test(topSection),
     'asset ships ' + stamp + '; top section says ' +
       ((/build `([^`]+)`/.exec(topSection) || [])[1] || '(none)'));
}

section('7  TERMS  (the gate carries the Repository Terms word for word; one version, everywhere)');
{
  // The in-app gate shows legal's Revizto Open-Source Repository Terms in full. They are compared WORD FOR
  // WORD with this folder's TERMS.md (itself a byte copy of the root file, derived from legal's docx and
  // pinned by sha256 in the release pre-flight), so a hand-edit to either can never ship unnoticed.
  const stripTags = t => {   // until stable, so a tag rebuilt by the removal of another is removed too; then no stray `<` is left
    let s = String(t), prev;
    do { prev = s; s = s.replace(/<\/?(?:b|strong|em|i|a)\b[^<>]*>/gi, ''); } while (s !== prev);
    do { prev = s; s = s.replace(/<[^<>]*>/g, ' '); } while (s !== prev);
    return s.replace(/</g, ' ');
  };
  const ENT = { '&mdash;': '—', '&amp;': '&', '&quot;': '"', '&#39;': "'" };
  // one pass over the entities, so `&amp;quot;` decodes once to `&quot;` and never on to `"`
  const words = t => stripTags(t).replace(/&(?:mdash|amp|quot|#39);/g, e => ENT[e])
    .replace(/[*_#]/g, '').split(/\s+/).filter(Boolean);
  const i = SRC.indexOf('<div class="tcs-terms" id="tcsTerms">'), j = i < 0 ? -1 : SRC.indexOf('</div>', i);
  const gate = i < 0 || j < 0 ? [] : words(SRC.slice(i, j));
  const termsFile = fs.existsSync(path.join(ROOT, 'TERMS.md')) ? fs.readFileSync(path.join(ROOT, 'TERMS.md'), 'utf8') : '';
  // TERMS.md = a version line, the two-line title, then the Terms. The gate carries its own title.
  const body = termsFile.split(/\n## Terms and Conditions\n/)[1] || '';
  const ref = words(body);
  let k = 0; while (k < ref.length && ref[k] === gate[k]) k++;
  ok('the gate carries the Repository Terms (#tcsTerms)', gate.length > 1000, 'found ' + gate.length + ' words');
  ok('...word for word against TERMS.md (' + ref.length + ' words)', ref.length > 1000 && gate.length === ref.length && k === ref.length,
     'first difference at word ' + k + ': TERMS.md "' + ref.slice(k, k + 6).join(' ') + '" vs gate "' + gate.slice(k, k + 6).join(' ') + '"');
  const ver = (/^_Version (\d+\.\d+) — /m.exec(termsFile) || [])[1];
  const tcs = (/tcsVersion:"([^"]+)"/.exec(SRC) || [])[1];
  ok('the gate re-gates at the Terms version TERMS.md states', !!ver && tcs === ver, 'TERMS.md ' + ver + ' vs tcsVersion ' + tcs);
  ok('no retired Custom Licence wording, and LICENSE + NOTICE ship beside the plugin',
     !/Custom Licen[cs]e/.test(SRC) && fs.existsSync(path.join(ROOT, 'LICENSE')) && fs.existsSync(path.join(ROOT, 'NOTICE')) &&
     !fs.existsSync(path.join(ROOT, 'LICENSE.md')));
}

section('8  CLAUDE.AI BUILD  (the file the Artifact tool publishes is the port of dashboard.html, nothing else)');
{
  // Cowork's create_artifact is gone for new artifacts (19 Aug 2026); a session normally has the Artifact tool,
  // whose pages reach connectors by display name through the `mcp` capability. dashboard-claudeai.html is
  // derived from dashboard.html by tools/claudeai/port.mjs at the repository root and must never be edited by hand.
  const CA = path.join(ROOT, 'skills/project-intelligence-dashboard/assets/dashboard-claudeai.html');
  const MAN = path.join(ROOT, 'skills/project-intelligence-dashboard/assets/manifest.json');
  const sha = b => crypto.createHash('sha256').update(b).digest('hex');
  const CONTROLS = fs.readFileSync(path.join(ROOT, '..', '..', 'tools/claudeai/controls.css'), 'utf8');
  let derived = null, why = '';
  try { derived = port('blueprint', SRC); } catch (e) { why = e.message; }
  // Each check returns its own verdict so the same function can be run against injected defects (Forbidden #14).
  const checks = (ca, man, src) => {
    const caText = ca.toString('utf8'), cam = man.claudeai || {};
    const caTools = ((/var TOOLS = \{([^}]*)\};/.exec(caText) || [])[1] || '').split(',').map(x => x.split(':')[0]).sort();
    return [
      ['ships', 'the claude.ai build ships beside dashboard.html', ca.length > 0],
      ['manifest', 'manifest describes it as the port of this dashboard.html',
        cam.file === 'dashboard-claudeai.html' && cam.size === ca.length && cam.sha256 === sha(ca) &&
        !!cam.portOf && cam.portOf.sha256 === sha(Buffer.from(src, 'utf8'))],
      ['port', 'it is byte for byte what tools/claudeai/port.mjs derives', derived !== null && Buffer.compare(ca, Buffer.from(derived, 'utf8')) === 0, why],
      ['host', 'it reaches connectors through the mcp capability, never the Cowork bridge',
        /use\("mcp"\)/.test(caText) && !/\b\w+\.cowork\.\w+/.test(caText)],
      ['sample', 'askClaude is backed by the sample capability', /use\("sample"\)/.test(caText) && /askClaude: function\(system, data\)/.test(caText)],
      ['dialog', 'no native dialog (the claude.ai viewer blocks confirm, alert and prompt)',
        !NATIVE_DIALOG.test(withoutShim(caText))],
      ['controls', 'host-proof controls: white checkboxes, radios and fields in any host theme (rvz-controls)',
        caText.split('<style id="rvz-controls">').length === 2 && caText.includes(CONTROLS)],
      ['tools', "the shim's tool list is exactly the contract's reads and writes",
        JSON.stringify(caTools) === JSON.stringify([...(man.tools ? man.tools.read.concat(man.tools.write) : [])].sort()), caTools.join(',')],
      ['empty', 'it ships no connector', !/mcp__[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(caText) &&
        /const CONFIG=\{connectors:\[\n \/\*[\s\S]*?\*\/\n\],readOnly:/.test(caText)],
    ];
  };
  const ca0 = fs.existsSync(CA) ? fs.readFileSync(CA) : Buffer.alloc(0);
  const man0 = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : {};
  for (const [, name, cond, detail] of checks(ca0, man0, SRC)) ok(name, cond, detail);
  ok('the port refuses every input it cannot fully apply (its selftest)', portSelftest().length === 0);
  // Every check above must be able to fail: inject the defect each exists to catch.
  const t = ca0.toString('utf8');
  const fails = (ca, man = man0) => checks(Buffer.from(ca), man, SRC).filter(c => !c[2]).map(c => c[0]);
  const cases = [
    ['ships', ''],
    ['manifest', t, { ...man0, claudeai: { ...man0.claudeai, portOf: { file: 'dashboard.html', sha256: '0' } } }],
    ['port', t.replace('Allow the Revizto tools from this artifact', 'Allow the tools from this artifact')],
    ['host', t + 'window.cowork.callMcpTool'],
    ['sample', t.replace('askClaude: function(system, data)', 'askClaude: function(sys, data)')],
    ['dialog', t.replace('function closeConfirm()', 'function x(){window.confirm ("y")}\nfunction closeConfirm()')],
    ['controls', t.replace('-webkit-appearance:none;appearance:none;color-scheme:light;flex-shrink:0', 'flex-shrink:0')],
    ['tools', t.replace('var TOOLS = {', 'var TOOLS = {delete_issues:1,')],
    ['empty', t.replace('const CONFIG={connectors:[\n', 'const CONFIG={connectors:[\n{prefix:"mcp__' + ['1a2b3c4d', '1111', '2222', '3333', '444455556666'].join('-') + '__"},\n')],
  ];
  const blind = cases.filter(([id, ca, man]) => !fails(ca, man).includes(id)).map(c => c[0]);
  ok('every claude.ai check above goes red on its own injected defect (' + cases.length + ')', blind.length === 0, 'blind: ' + blind.join(', '));
}

section('9  OUTPUT ENCODING  (no value from Revizto, the user, storage or Claude reaches the page as markup)');
{
  // CodeQL js/xss-through-dom on PR #5 (Compare picker) and the two audits behind it: project titles, issue fields,
  // member names and e-mails, status/type/workflow names, server error text, stored jobs and milestones and Claude's
  // plans were spliced into innerHTML unescaped; every such place is escaped since build 2026-11-24.1.
  // tests/output-encoding.json pins (a) the escaped form of every fixed site and (b) every remaining splice that is
  // not one whole escaping call, each reviewed. A revert, or a new splice that is not reviewed, fails here.
  const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/output-encoding.json'), 'utf8'));
  const missing = src => (pins.escaped || []).filter(x => !src.includes(x));
  const left = src => unreviewedSplices(src, pins.reviewed || {});
  ok('every fixed site keeps its escaped form (' + (pins.escaped || []).length + ')', (pins.escaped || []).length > 40 && missing(SRC).length === 0,
     missing(SRC).slice(0, 3).join(' | '));
  ok('every splice into a string is one escaping call or reviewed (' + Object.keys(pins.reviewed || {}).length + ' reviewed)',
     Object.keys(pins.reviewed || {}).length > 100 && left(SRC).length === 0, left(SRC).slice(0, 5).join(' | '));
  // the gate can fail: each injected regression must be caught by one of the two checks
  const red = s => missing(s).length > 0 || left(s).length > 0;
  const probes = [
    ['Compare picker title revert', SRC.replace('<span>${_esc(p.title)}</span>', '<span>${p.title}</span>')],
    ['assignee options revert', SRC.replace('`<option value="${_esc(e)}">${_esc(e)}</option>`', '`<option value="${e}">${e}</option>`')],
    ['moves list revert', SRC.replace('<div class="mi">${_esc(mv[2])}</div>', '<div class="mi">${mv[2]}</div>')],
    ['no-project banner revert (concatenation)', SRC.replace('"</b><br>"+_esc((_kk&&_kk.d)||', '"</b><br>"+((_kk&&_kk.d)||')],
    ['colour validation removed', SRC.replace('return _safeCol(sc);', 'return sc;')],
    ['escape call with raw data after it', SRC.replace('function rowHtml(w){', 'function rowHtml(w){const _x=`<b>${_esc("")+w.title}</b>`;')],
    ['new raw concatenation', SRC.replace('function rowHtml(w){', 'function rowHtml(w){const _y=\'<b>\'+w.reporter+\'</b>\';')],
    ['new raw interpolation of an unlisted name', SRC.replace('function rowHtml(w){', 'function rowHtml(w){const _z=`<i>${w.reporter}</i>`;')],
  ];
  const blind = probes.filter(([, s]) => !red(s)).map(p => p[0]);
  ok('the gate goes red on every injected regression (' + probes.length + ')', blind.length === 0, 'blind: ' + blind.join(', '));
}

/* ---------------------------------------------------------------- verdict */
console.log('\n' + '-'.repeat(58));
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
