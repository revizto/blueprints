#!/usr/bin/env node
// claude.ai Artifacts port — derives each plugin's claude.ai build from its released Cowork build.
//
// WHY. Since Cowork live artifacts were retired for new artifacts (19 Aug 2026), a session normally has
// the built-in Artifact tool and no `create_artifact`. A page published with the Artifact tool reaches
// connectors through the `mcp` capability, by connector DISPLAY NAME, instead of Cowork's
// window.cowork.callMcpTool bridge keyed by connector id. Organisations that still have live artifacts
// (CMEK, ZDR, HIPAA-ready) keep the Cowork build. Each plugin therefore ships BOTH files.
//
// PORTED, NOT REIMPLEMENTED. Every transform here is a branch of a claude.ai port already running live.
// The Matrix is derived from its claude.ai port, which has run live since 29 Oct 2026; the Blueprint from its
// own claude.ai profile, live since 28 Oct 2026. Their shims (shim.html, shim-blueprint.html) and the
// Matrix's downloads dlBlob (dlblob.js) are those artifacts' own code. Release deltas, declared:
//   R1  no connector is baked in: the shim reads each connector's display name from the page's own
//       connector table, which the install skill fills (the Cowork build's single install edit, plus a
//       `name` beside each `prefix`).
//   R2  the shim's tool list is the build's own declaration, not a hand list.
//   R3  the Blueprint keeps its own published shim (its claude.ai build since 28 Oct 2026): askClaude on the
//       `sample` capability, the no-bridge state when the viewer cannot run connectors, a memory fallback
//       when storage throws; its in-page confirm for discarding a resumable job (a native confirm()
//       returns false in the claude.ai viewer, so Discard could never run); and its `noconn` failure kind
//       for a connector the viewer has not connected. All taken verbatim from that build's source.
//   R4  the Blueprint's connector names come from the install's `name` (Cowork injected them through
//       cowork-artifact-meta; the published profile synthesised that block from baked ids, a release cannot).
//   R5  copy that tells the user to look in Cowork, open Cowork or re-create through Cowork, and the
//       "add the new id via the Add box" remedy (an id added there has no name, so it cannot be reached),
//       now points at the install skill or the artifact's Permissions menu.
//   R6  host-proof form controls (controls.css, injected as <style id="rvz-controls">, as the Matrix's first
//       claude.ai port did): the host can paint native checkboxes, radios and text fields dark on a light page.
//       Checkboxes and radios are drawn white (teal when ticked); fields are white with ink text. Every Revizto
//       artifact carries this — a black box or field on a light page is a defect.
//   R7  the Matrix seeds its connector names from the install's `name` (as R4 does for the Blueprint), so a
//       connection is labelled by its name before the first read; and a connector the viewer has not
//       connected keeps its own kind (`noconn`, worded as the Blueprint's) instead of the `gone` signature the
//       first Matrix port gave it, which skipped the connector and told the viewer to reinstall. Both found by
//       PR review (Greptile).
//   R8  the Blueprint shim (PR #5 review): a tool call the viewer declined returns the "not connected for this
//       viewer" signature (the Blueprint's noconn kind, with the Permissions remedy) instead of throwing into its
//       generic failure; and a platform timeout carries the "timeout" marker its classifier matches.
// Not carried over, with reasons: the Matrix port's private-name scan (the release build is scanned for
// names before packaging; the shims are fixed files checked here), and its connector cut (a release
// bakes no connector). Its runtime harness is tools/claudeai/shim.test.mjs.
// Every edit must match its anchor exactly the expected number of times or the port refuses: never
// "mostly applies".
//
//   node tools/claudeai/port.mjs <matrix|blueprint> <cowork.html> <out.html>
//   node tools/claudeai/port.mjs --check            re-derive both committed claude.ai assets; exit 1 on any byte difference
//   node tools/claudeai/port.mjs --selftest         every refusal must fire
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const SHIM = () => fs.readFileSync(path.join(HERE, 'shim.html'), 'utf8');             // the Matrix's claude.ai shim
const SHIM_BP = () => fs.readFileSync(path.join(HERE, 'shim-blueprint.html'), 'utf8'); // the Blueprint's (its published claude.ai profile)
const DLBLOB = () => fs.readFileSync(path.join(HERE, 'dlblob.js'), 'utf8');
const CONTROLS = () => fs.readFileSync(path.join(HERE, 'controls.css'), 'utf8');
// The Blueprint's Read-only pill turns red when on: its ticked box is white with a red tick, as the pill's own
// accent-color intended, not the teal fill the generic rule gives a ticked box.
const BP_CONTROLS = `.tcs-agree input{--rvz-tick:var(--red,#E40001)}.ap-sure input,.act-block .ab-allow input{--rvz-tick:var(--warn)}\n` +
  `.ro-toggle.on input[type=checkbox]:checked{background-color:var(--white,#fff);border-color:var(--white,#fff);` +
  `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.2l2.6 2.6L12 5.4' ` +
  `fill='none' stroke='%23E40001' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}\n`;
const controlsFor = product => '<style id="rvz-controls">\n' + CONTROLS() + (product === 'blueprint' ? BP_CONTROLS : '') + '</style>\n';

export const ASSETS = {
  matrix: {
    dir: 'plugins/revizto-pi-matrix/skills/project-intelligence-matrix/assets',
    cowork: 'matrix.html', claudeai: 'matrix-claudeai.html',
  },
  blueprint: {
    dir: 'mcp-blueprints/revizto-project-intelligence/skills/project-intelligence-dashboard/assets',
    cowork: 'dashboard.html', claudeai: 'dashboard-claudeai.html',
  },
};

export class PortError extends Error {}

// The page without its port shim: the shim is ours and may name native dialogs in comments. Found by its marker,
// not by a pattern over markup, so no tag spelling (case, attributes, `</script >`) can widen or narrow the cut.
export function withoutShim(text) {
  const k = text.indexOf('PORT SHIM');
  if (k < 0) return text;
  const a = text.lastIndexOf('<script', k), b = text.indexOf('</script', k);
  if (a < 0 || b < 0) return text;
  const e = text.indexOf('>', b);
  return text.slice(0, a) + text.slice(e < 0 ? text.length : e + 1);
}

// The page with every <script>…</script> block taken out, by position (case-insensitive, any attributes, any end-tag
// spelling); the pieces are joined with a newline so text on either side of a removed block can never join into a
// new tag. Used only to ask "is a document-skeleton tag left in the markup?" — never to make text safe.
export function outsideScripts(text) {
  const low = String(text).toLowerCase(), t = String(text), out = [];
  let pos = 0;
  for (;;) {
    let i = low.indexOf('<script', pos);
    while (i >= 0 && /[a-z0-9_-]/.test(low.charAt(i + 7))) i = low.indexOf('<script', i + 7);   // <scripts…> is not a script tag
    if (i < 0) { out.push(t.slice(pos)); break; }
    out.push(t.slice(pos, i));
    const j = low.indexOf('</script', i + 7);
    if (j < 0) break;                                   // an unclosed script runs to the end of the document
    const k = t.indexOf('>', j);
    pos = k < 0 ? t.length : k + 1;
  }
  return out.join('\n');
}

// The port shim's own script body, by the same marker (for the runtime harness).
export function shimScript(text) {
  const k = text.indexOf('PORT SHIM');
  if (k < 0) return '';
  const a = text.indexOf('>', text.lastIndexOf('<script', k)) + 1, b = text.indexOf('</script', k);
  return a > 0 && b > a ? text.slice(a, b) : '';
}

// A native dialog call, bare or through window/globalThis/self, with or without a space before the bracket.
export const NATIVE_DIALOG = /(?:^|[^\w.$])(?:(?:window|globalThis|self)\s*\.\s*)?(confirm|alert|prompt)\s*\(/;

function rep(src, old, neu, count = 1) {
  const c = src.split(old).length - 1;
  if (c !== count) throw new PortError(`anchor occurs ${c} times, need ${count}: ${JSON.stringify(old.slice(0, 90))}`);
  return src.split(old).join(neu);
}

// The Matrix's own tool declaration: the first non-empty `tools:[...]` literal (same rule as verify.mjs).
export function matrixTools(text) {
  for (const m of text.matchAll(/\btools\s*:\s*\[([^\]]*)\]/g)) {
    const names = [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1]);
    if (names.length) return names;
  }
  return [];
}

// The Blueprint's own contract table (same rule as tools/build.mjs): every tool it may call, reads and writes.
export function blueprintTools(text) {
  const i = text.indexOf('const ARG_CONTRACT={');
  const j = text.indexOf('};', i);
  if (i < 0 || j < 0) return [];
  // eslint-disable-next-line no-new-func
  const t = new Function(text.slice(i, j + 2) + '\n;return ARG_CONTRACT;')();
  return Object.keys(t).sort();
}

function shimFor(product, tools) {
  const list = '{' + tools.map(x => x + ':1').join(',') + '}';
  if (product === 'blueprint') return rep(SHIM_BP(), '/*@@RVZ_TOOLS@@*/', list);
  let s = SHIM();
  s = rep(s, '/*@@RVZ_CONNECTOR_TABLE@@*/', 'CONNECTORS');
  return rep(s, '/*@@RVZ_TOOLS@@*/', list);
}

const GONE = 'If the connector was rebuilt or renamed, run the install skill again: this page reaches only the connectors the install named, so a connector added here by id cannot be reached.';

const INSTALL_AGAIN = 'No connection is configured in this build. Run the install skill again to add your Revizto ' +
  'connectors: this page reaches a connector by the name it has in your Claude connector settings, and only the ' +
  'connectors the install declared.';

function portMatrix(src) {
  const title = 'Revizto Project Intelligence Matrix';
  const head = '<!DOCTYPE html>\n<html lang="en-NZ">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    `<title>${title}</title>\n<style>\n`;
  if (!src.startsWith(head)) throw new PortError('the Matrix build does not start with the expected head');
  if (src.split('/*@@INSTALL_CONNECTORS@@*/').length - 1 !== 1) throw new PortError('the install marker is missing or repeated');
  if (src.includes('const HOST_FILE_PICKER')) throw new PortError('the build still declares HOST_FILE_PICKER (retired: drag and drop only)');
  const tools = matrixTools(src);
  if (!tools.length) throw new PortError('the Matrix build declares no tools');
  // 1. the host supplies the document skeleton: title + the no-downloads rule, then the build's own CSS
  src = `<title>${title}</title>\n<style>\n` +
    'body.rvz-nodl #btnExpCt,body.rvz-nodl [data-intel-sum="dl"]{display:none!important}\n' + src.slice(head.length);
  src = rep(src, '</style>\n</head>\n<body>\n', '</style>\n\n');
  const tail = '</body>\n</html>';
  if (!src.trimEnd().endsWith(tail)) throw new PortError('the Matrix build does not end with </body></html>');
  src = src.trimEnd().slice(0, -tail.length) + '\n';
  // 2. the host-proof controls (R6) and the shim, before the app script
  src = rep(src, '<script>', controlsFor('matrix') + shimFor('matrix', tools) + '<script>');
  // 3. the bridge name
  src = src.replace(/\b(HOST_W|window|w)\.cowork\b/g, '$1.RVZ_BRIDGE');
  // 4. copy that names Cowork as the host (R6)
  src = rep(src, '"This page is not running inside Cowork, so it cannot reach any connector.',
    '"This viewer cannot run the Revizto connectors for this page, so it cannot reach any connector.');
  src = rep(src, 'This page is not running inside Cowork, so no connector can be reached from here. ',
    'This viewer cannot run the Revizto connectors for this page, so no connector can be reached from here. ');
  src = rep(src, 'connMsg("warn","<b>No MCP bridge in this host.</b> This page is not running inside Cowork, so no "+',
    'connMsg("warn","<b>No MCP bridge in this host.</b> This viewer cannot run the Revizto connectors for this page ' +
    '(not signed in, connector access declined, or not connected), so no "+');
  // the connect-by-id sentence ships twice (once split across two string literals); each becomes one literal
  const by = 'No connection is configured in this build. Add one by connector id';
  if (src.split(by).length - 1 !== 2) throw new PortError('the connect-by-id sentence does not occur exactly twice');
  for (let n = 0; n < 2; n++) {
    const i = src.indexOf(by);
    const j = src.indexOf('</div>', i);
    if (j < 0 || j - i > 400) throw new PortError('the connect-by-id sentence does not end where expected');
    src = src.slice(0, i) + INSTALL_AGAIN + src.slice(j);
  }
  // 5. saves go through the downloads capability
  const a = src.indexOf('function dlBlob(text,mime,name){\n  const b=new Blob');
  if (a < 0) throw new PortError('the anchor-download dlBlob is missing');
  const endMark = 'setTimeout(()=>URL.revokeObjectURL(u),2000);\n}\n';
  const b = src.indexOf(endMark, a);
  if (b < 0) throw new PortError('the anchor-download dlBlob does not end as expected');
  src = src.slice(0, a) + DLBLOB() + src.slice(b + endMark.length);
  // 6. remedies that only make sense in Cowork (R5)
  src = rep(src, '    r: ["Open this artifact inside Cowork.",',
    '    r: ["Allow the Revizto tools from this artifact\'s Permissions menu, or check that the Revizto connector is connected.",');
  src = rep(src, 'If the connector was rebuilt, its id changed — add the new id via the Add box, then press Re-check. ' +
    'Connector ids are per-install, so a rebuild always issues new ones.', GONE);
  src = rep(src, '    r: ["Add the connector\'s new id via the Add box, then press Re-check — a rebuilt connector always issues a new id.",',
    '    r: ["Run the install skill again — this page reaches only the connectors the install named, so a rebuilt or renamed connector needs a new install.",');
  // 7. connector names and the not-connected kind (R7)
  src = rep(src, 'function connHostNames() {\n  if (_connNames) return _connNames;\n  _connNames = {};\n',
    'function connHostNames() {\n  if (_connNames) return _connNames;\n  _connNames = {};\n' +
    '  try { (CONNECTORS || []).forEach(function (c) { if (c && c.prefix && c.name) _connNames[c.prefix] = String(c.name); }); } catch (e) {}\n');
  src = rep(src, '   if (/Failed to parse SSE/i.test(m)) return FAIL_TEXT.gone(m);',
    '   if (/connector not connected for this viewer/i.test(m)) return { k: "noconn", t: "This Revizto connector isn’t connected for you", ' +
    'd: "Connect it in Claude (Settings → Connectors), allow it for this page when asked, then Reload." };\n' +
    '   if (/Failed to parse SSE/i.test(m)) return FAIL_TEXT.gone(m);');
  // 8. the Cowork meta block does not exist here (as the live port)
  src = rep(src, 'cowork-artifact-meta', 'cowork-artifact-meta-unverified', 2);
  // 9. the host flag: saves are zipped (the downloads capability refuses the .vimctst extension)
  src = rep(src, 'const HOST_SAVE_WRAP=null;', 'const HOST_SAVE_WRAP="zip";');
  if (src.includes('createObjectURL')) throw new PortError('an object-URL download survives');
  return src;
}

function portBlueprint(src) {
  const head = '<!doctype html><html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>';
  if (!src.startsWith(head)) throw new PortError('the Blueprint build does not start with the expected head');
  if (!/const CONFIG=\{connectors:\[\n \/\*[\s\S]*?\*\/\n\],readOnly:/.test(src)) throw new PortError('CONFIG.connectors does not ship empty');
  const tools = blueprintTools(src);
  if (!tools.length) throw new PortError('the Blueprint build has no ARG_CONTRACT');
  // 1. the host supplies the document skeleton
  src = '<title>' + src.slice(head.length);
  src = rep(src, '</style>\n</head>\n<body>\n', '</style>\n\n');
  const tail = '</body>\n</html>';
  if (!src.trimEnd().endsWith(tail)) throw new PortError('the Blueprint build does not end with </body></html>');
  src = src.trimEnd().slice(0, -tail.length) + '\n';
  // 2. the host-proof controls (R6) and the shim, before the app script
  src = rep(src, '<script>\nconst CONFIG={connectors:[', controlsFor('blueprint') + shimFor('blueprint', tools) + '<script>\nconst CONFIG={connectors:[');
  // 3. the bridge name
  src = src.replace(/\bwindow\.cowork\b/g, 'window.RVZ_BRIDGE');
  // 4. connector display names from the install (R5)
  src = rep(src, 'function connHostNames(){\n  if(_connNames)return _connNames;\n  _connNames={};\n',
    'function connHostNames(){\n  if(_connNames)return _connNames;\n  _connNames={};\n' +
    '  (CONFIG.connectors||[]).forEach(function(c){if(c&&c.prefix&&c.name)_connNames[c.prefix]=String(c.name);});\n');
  // 5. the in-page confirm for Discard (R3, the published profile's fix taken verbatim)
  src = rep(src, 'if(disc)disc.onclick=()=>{if(confirm("Discard tracking for this job? The "+fmt(done)+" changes already made stay in Revizto — this only stops the remaining "+fmt(rem)+" from being picked up here.")){PENDING_RESUME=null;JOB=null;try{localStorage.removeItem(jobKey());}catch(e){}b.hidden=true;b.innerHTML="";}};}',
    'if(disc)disc.onclick=()=>{confirmLoad("Discard tracking for this job?","The "+fmt(done)+" changes already made stay in Revizto — this only stops the remaining "+fmt(rem)+" from being picked up here.","Discard tracking").then(ok=>{if(!ok)return;PENDING_RESUME=null;JOB=null;try{localStorage.removeItem(jobKey());}catch(e){}b.hidden=true;b.innerHTML="";});};}');
  // 6. the `noconn` failure kind (R3, verbatim from the published build's routing)
  src = rep(src, 'if(/Failed to parse SSE/i.test(m))return{k:"gone",',
    '/* the claude.ai runtime reports a connector the viewer has not connected. Distinct from `gone`\n' +
    '     (a removed or rebuilt connector) — the remedy is to connect it, not to re-add an id. Never produced in Cowork. */\n' +
    '  if(/connector not connected for this viewer/i.test(m))return{k:"noconn",t:"This Revizto connector isn’t connected for you",' +
    'd:"Connect it in Claude (Settings → Connectors), allow it for this page when asked, then Reload."};\n' +
    '  if(/Failed to parse SSE/i.test(m))return{k:"gone",');
  src = rep(src, 'If the connector was rebuilt, its id changed — add the new id via the Add box in the header, then press Re-check. ' +
    'Connector ids are per-install, so a rebuild always issues new ones.', GONE);
  // 7. copy (R5)
  src = rep(src, 'No connection is configured in this build. Add one by connector id — you can find it in Cowork under the Revizto MCP ' +
    'connector. A connection added here is remembered on this device, but its tools only return data once they have been ' +
    'authorised for this artifact (re-create it through the install skill).', INSTALL_AGAIN);
  src = rep(src, 'This copy of the Blueprint has no connection to Claude\'s MCP bridge, so it cannot read anything and has no ' +
    'bundled data to show instead. Install the Revizto Project Intelligence plugin and run the <b>project-intelligence-dashboard</b> ' +
    'skill on your own computer — that is what authorises the Revizto MCP tools for the artifact. See the README.',
    'This copy of the Blueprint cannot reach the Revizto connectors from this view, so it cannot read anything and has no ' +
    'bundled data to show instead. Allow the Revizto tools from this artifact\'s Permissions menu, or check that the Revizto ' +
    'connector is connected; if it was renamed or re-added since the install, run the <b>project-intelligence-dashboard</b> ' +
    'skill again. See the README.');
  src = rep(src, 'Live brief unavailable here — open in Cowork with the MCP connected, or use a prompt\'s Copy button.',
    'Live brief unavailable here — the Revizto connector or Claude is not available in this view; use a prompt\'s Copy button.');
  return src;
}

export function port(product, src) {
  let out;
  if (product === 'matrix') out = portMatrix(src);
  else if (product === 'blueprint') out = portBlueprint(src);
  else throw new PortError('unknown product ' + product);
  // post-conditions, both products
  const left = out.match(/\b\w+\.cowork\.\w+/g);
  if (left) throw new PortError('a Cowork bridge reference survives: ' + left.slice(0, 2).join(', '));
  if (/not running inside Cowork|open in Cowork|inside Cowork\.|find it in Cowork|on your own computer — that is what authorises|via the Add box/.test(out)) {
    throw new PortError('copy still sends the user to Cowork or to the Add box');
  }
  if (!out.includes('use("mcp")') || out.split('window.RVZ_BRIDGE = {').length !== 2) throw new PortError('the shim is missing or duplicated');
  if (/@@RVZ_/.test(out)) throw new PortError('a shim placeholder survives');
  if (out.split('<style id="rvz-controls">').length !== 2 || !out.includes(CONTROLS())) throw new PortError('the host-proof controls are missing or duplicated');
  if (NATIVE_DIALOG.test(withoutShim(out))) {
    throw new PortError('a native dialog survives (the claude.ai viewer blocks confirm, alert and prompt)');
  }
  if (/mcp__[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(out)) throw new PortError('a connector id is baked in');
  if (/^<!doctype|<html[\s>]|<\/?body>|<\/?head>/im.test(outsideScripts(out))) {
    throw new PortError('a document skeleton tag survives (the Artifact tool supplies it)');
  }
  return out;
}

const sha = b => crypto.createHash('sha256').update(b).digest('hex');

export function check(out = console.log) {
  const bad = [];
  for (const [product, a] of Object.entries(ASSETS)) {
    const dir = path.join(REPO, a.dir);
    let want;
    try { want = port(product, fs.readFileSync(path.join(dir, a.cowork), 'utf8')); }
    catch (e) { bad.push(product); out(`  FAIL  ${product}: the port refuses the Cowork build — ${e.message}`); continue; }
    const have = fs.existsSync(path.join(dir, a.claudeai)) ? fs.readFileSync(path.join(dir, a.claudeai)) : null;
    const same = have && Buffer.compare(have, Buffer.from(want, 'utf8')) === 0;
    if (!same) bad.push(product);
    out((same ? '  PASS  ' : '  FAIL  ') + `${product}: ${a.claudeai} is the port of ${a.cowork}` +
      (same ? '' : ` — committed ${have ? sha(have).slice(0, 12) : '(missing)'}, derived ${sha(want).slice(0, 12)}`));
  }
  return bad;
}

// The block each manifest carries for the claude.ai build: what the install skill checks before publishing.
export function describe(product) {
  const a = ASSETS[product], dir = path.join(REPO, a.dir);
  const cw = fs.readFileSync(path.join(dir, a.cowork));
  const buf = fs.readFileSync(path.join(dir, a.claudeai));
  return {
    file: a.claudeai,
    size: buf.length,
    md5: crypto.createHash('md5').update(buf).digest('hex'),
    sha256: sha(buf),
    portOf: { file: a.cowork, sha256: sha(cw) },
  };
}

export function selftest() {
  const bad = [];
  const refuses = (name, fn) => { try { fn(); bad.push(name); } catch (e) { if (!(e instanceof PortError)) bad.push(name + ' (' + e.message + ')'); } };
  const m = fs.readFileSync(path.join(REPO, ASSETS.matrix.dir, ASSETS.matrix.cowork), 'utf8');
  const b = fs.readFileSync(path.join(REPO, ASSETS.blueprint.dir, ASSETS.blueprint.cowork), 'utf8');
  try { port('matrix', m); port('blueprint', b); } catch (e) { bad.push('the shipped builds port: ' + e.message); }
  refuses('matrix: wrong head', () => port('matrix', m.replace('<!DOCTYPE html>', '<!doctype html>')));
  refuses('matrix: no install marker', () => port('matrix', m.replace('/*@@INSTALL_CONNECTORS@@*/', '')));
  refuses('matrix: no dlBlob', () => port('matrix', m.replace('function dlBlob(text,mime,name){', 'function dlBlob2(text,mime,name){')));
  refuses('matrix: no save flag', () => port('matrix', m.replace('const HOST_SAVE_WRAP=null;', 'const HOST_SAVE_WRAP=0;')));
  refuses('matrix: copy anchor moved', () => port('matrix', m.replace('This page is not running inside Cowork, so no connector', 'This page is not inside Cowork, so no connector')));
  refuses('matrix: second app script', () => port('matrix', m.replace('</style>\n</head>', '</style>\n<script></script>\n</head>')));
  refuses('matrix: file picker back', () => port('matrix', m.replace('<script>', '<script>const HOST_FILE_PICKER=1;')));
  refuses('matrix: a baked connector', () => port('matrix', m.replace('/*@@INSTALL_CONNECTORS@@*/', '/*@@INSTALL_CONNECTORS@@*/{prefix:"mcp__' + ['1a2b3c4d', '1111', '2222', '3333', '444455556666'].join('-') + '__"}')));
  refuses('matrix: native alert', () => port('matrix', m.replace('</script>', 'alert("x");</script>')));
  refuses('matrix: native confirm through window', () => port('matrix', m.replace('</script>', 'window.confirm ("x");</script>')));
  refuses('matrix: nobridge remedy moved', () => port('matrix', m.replace('Open this artifact inside Cowork.', 'Open this artifact in Cowork.')));
  refuses('matrix: gone remedy moved', () => port('matrix', m.replace('add the new id via the Add box, then', 'add the new id via the Add box and then')));
  refuses('blueprint: noconn anchor moved', () => port('blueprint', b.replace('if(/Failed to parse SSE/i.test(m))return{k:"gone",', 'if(/Failed to parse SSE/.test(m))return{k:"gone",')));
  refuses('matrix: names anchor moved', () => port('matrix', m.replace('function connHostNames() {\n  if (_connNames)', 'function connHostNames() {\n if (_connNames)')));
  refuses('matrix: gone signature moved', () => port('matrix', m.replace('   if (/Failed to parse SSE/i.test(m)) return FAIL_TEXT.gone(m);', '   if (/Failed to parse SSE/.test(m)) return FAIL_TEXT.gone(m);')));
  refuses('matrix: unported bridge use', () => port('matrix', m.replace('</script>', 'top.cowork.callMcpTool;</script>')));
  refuses('blueprint: wrong head', () => port('blueprint', b.replace('<!doctype html><html lang="en">', '<!DOCTYPE html><html lang="en">')));
  refuses('blueprint: baked connector', () => port('blueprint', b.replace('const CONFIG={connectors:[\n', 'const CONFIG={connectors:[\n{prefix:"x"},\n')));
  refuses('blueprint: no contract', () => port('blueprint', b.replace('const ARG_CONTRACT={', 'const ARG_CONTRACTS={')));
  refuses('blueprint: names anchor moved', () => port('blueprint', b.replace('function connHostNames(){\n  if(_connNames)', 'function connHostNames(){\n if(_connNames)')));
  refuses('blueprint: no-bridge copy moved', () => port('blueprint', b.replace('has no connection to Claude\'s MCP bridge', 'has no link to Claude\'s MCP bridge')));
  refuses('blueprint: native confirm back', () => port('blueprint', b.replace('function closeConfirm()', 'function x(){confirm("y")}\nfunction closeConfirm()')));
  refuses('blueprint: discard anchor moved', () => port('blueprint', b.replace('if(confirm("Discard tracking for this job? The "', 'if(window.confirm("Discard tracking for this job? The "')));
  refuses('blueprint: brief copy moved', () => port('blueprint', b.replace('open in Cowork with the MCP connected', 'open Cowork with the MCP connected')));
  refuses('unknown product', () => port('carbon', m));
  // the skeleton check looks only outside scripts, however a script tag is spelt
  const SKEL = /^<!doctype|<html[\s>]|<\/?body>|<\/?head>/im;
  const cases = [
    ['a stray <body> outside scripts is found', 'x<body>y', true],
    ['a <body> inside a script is ignored', '<script>var a="<body>";</script>', false],
    ['an upper-case <SCRIPT> block is ignored', '<SCRIPT type="x">var a="<body>"</SCRIPT >', false],
    ['nested script spelling cannot hide a tag', '<scr<script></script>ipt><body>', true],
    ['nested script spelling does not rebuild a script tag', '<scr<script></script>ipt>', false],
    ['an unclosed script runs to the end', 'a<script>var b="<body>"', false],
    ['<scripts> is not a script tag', '<scripts><body></scripts>', true],
  ];
  for (const [name, input, want] of cases) {
    const rest = outsideScripts(input);
    const got = SKEL.test(rest) || (name.includes('rebuild') && /<script/i.test(rest));
    if (got !== want) bad.push('outsideScripts: ' + name);
  }
  return bad;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    const bad = selftest();
    console.log(bad.length ? 'SELFTEST FAIL: ' + bad.join('; ') : 'SELFTEST PASS — the port refuses every input it cannot fully apply');
    process.exit(bad.length ? 1 : 0);
  }
  if (args.includes('--write-matrix-manifest')) {
    // Run after package_release.py has written the Matrix manifest: adds the claude.ai block, touching nothing else.
    const a = ASSETS.matrix, mf = path.join(REPO, a.dir, 'manifest.json');
    const bad = check(() => {});
    if (bad.includes('matrix')) { console.error('refused: ' + a.claudeai + ' is not the port of ' + a.cowork + ' — run the port first'); process.exit(1); }
    const man = JSON.parse(fs.readFileSync(mf, 'utf8'));
    if (!man.md5) { console.error('refused: the Matrix manifest is unfilled (package_release.py has not passed)'); process.exit(1); }
    man.claudeai = describe('matrix');
    fs.writeFileSync(mf, JSON.stringify(man, null, 2) + '\n');
    console.log('wrote the claude.ai block of ' + path.relative(REPO, mf) + '  sha256 ' + man.claudeai.sha256.slice(0, 12));
    process.exit(0);
  }
  if (args.includes('--check')) {
    console.log('claude.ai builds are the port of the Cowork builds');
    process.exit(check().length ? 1 : 0);
  }
  if (args.length !== 3) { console.error('usage: port.mjs <matrix|blueprint> <cowork.html> <out.html> | --check | --selftest'); process.exit(2); }
  try {
    const out = port(args[0], fs.readFileSync(args[1], 'utf8'));
    fs.writeFileSync(args[2], out);
    console.log(`wrote ${args[2]}  ${Buffer.byteLength(out).toLocaleString('en-NZ')} B  sha256 ${sha(Buffer.from(out)).slice(0, 12)}`);
  } catch (e) {
    if (e instanceof PortError) { console.error('PORT REFUSED: ' + e.message); process.exit(1); }
    throw e;
  }
}
