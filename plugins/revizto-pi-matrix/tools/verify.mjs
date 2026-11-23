#!/usr/bin/env node
// Revizto Project Intelligence Matrix — repository gates.
//
// The Matrix ships as one self-contained HTML file (skills/project-intelligence-matrix/assets/matrix.html),
// built and guarded outside this repository and packaged here with a manifest written from the file.
// These gates re-check, on every push, that nothing in this folder has drifted from that release:
// a hand-edit to the HTML, a version stated differently in two places, a tool list that no longer
// matches the build, or a licence, notice or terms copy that no longer matches the root.
//
//   node tools/verify.mjs              run every gate (exit 1 on any failure)
//   node tools/verify.mjs --selftest   inject each defect the gates exist to catch; every one must go red
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { port as claudeaiPort, NATIVE_DIALOG } from '../../../tools/claudeai/port.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLS = fs.readFileSync(path.resolve(ROOT, '..', '..', 'tools/claudeai/controls.css'), 'utf8');
const REPO = path.resolve(ROOT, '..', '..');
const SKILL = 'skills/project-intelligence-matrix';

function load() {
  const r = (p, enc = 'utf8') => fs.readFileSync(p, enc);
  return {
    html: r(path.join(ROOT, SKILL, 'assets/matrix.html'), null),
    // The claude.ai build: the port of matrix.html, published with the Artifact tool. Optional at load so its
    // absence is a gate, not a crash.
    claudeai: fs.existsSync(path.join(ROOT, SKILL, 'assets/matrix-claudeai.html'))
      ? r(path.join(ROOT, SKILL, 'assets/matrix-claudeai.html'), null) : Buffer.alloc(0),
    manifest: r(path.join(ROOT, SKILL, 'assets/manifest.json')),
    plugin: r(path.join(ROOT, '.claude-plugin/plugin.json')),
    marketplace: r(path.join(REPO, '.claude-plugin/marketplace.json')),
    skill: r(path.join(ROOT, SKILL, 'SKILL.md')),
    changelog: r(path.join(ROOT, 'CHANGELOG.md')),
    readme: r(path.join(ROOT, 'README.md')),
    // Apache 2.0 LICENSE, NOTICE and the Repository Terms (TERMS.md): each a byte-identical copy of the root file,
    // because Claude installs a plugin from its own folder. Optional at load so a missing copy is a gate, not a crash.
    licence: fs.existsSync(path.join(ROOT, 'LICENSE')) ? r(path.join(ROOT, 'LICENSE'), null) : Buffer.alloc(0),
    notice: fs.existsSync(path.join(ROOT, 'NOTICE')) ? r(path.join(ROOT, 'NOTICE'), null) : Buffer.alloc(0),
    terms: fs.existsSync(path.join(ROOT, 'TERMS.md')) ? r(path.join(ROOT, 'TERMS.md'), null) : Buffer.alloc(0),
    oldLicence: fs.existsSync(path.join(ROOT, 'LICENSE.md')),
    // The embedded Geist fonts' licence. Optional at load so its absence is reported as a gate, not a crash.
    ofl: fs.existsSync(path.join(ROOT, 'OFL.txt')) ? r(path.join(ROOT, 'OFL.txt')) : '',
    rootLicence: r(path.join(REPO, 'LICENSE'), null),
    rootNotice: r(path.join(REPO, 'NOTICE'), null),
    rootTerms: r(path.join(REPO, 'TERMS.md'), null),
  };
}

const WRITE = /(^|_)(update|create|delete|add|remove|set|edit|close|invite|toggle|restore|reorder|change)(_|$)/;
const isRead = t => /^(list|get)_/.test(t) && !WRITE.test(t);

// The build's own declaration: the first non-empty `tools:[...]` literal (the connection host object).
function buildTools(text) {
  for (const m of text.matchAll(/\btools\s*:\s*\[([^\]]*)\]/g)) {
    const names = [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1]);
    if (names.length) return names;
  }
  return [];
}

function gates(f, out = () => {}) {
  const fails = [];
  const ok = (id, name, cond, detail = '') => {
    if (!cond) fails.push(id);
    out((cond ? '  PASS  ' : '  FAIL  ') + name + (!cond && detail ? '  — ' + detail : ''));
  };
  const text = f.html.toString('utf8');
  let man = {}; try { man = JSON.parse(f.manifest); } catch { /* reported below */ }
  const hash = alg => crypto.createHash(alg).update(f.html).digest('hex');

  out('1  ASSET  (the shipped file is the packaged file)');
  ok('filled', 'manifest is filled (the package passed its release checks)', !!man.md5);
  ok('size', 'size matches the manifest', f.html.length === man.size, f.html.length + ' vs ' + man.size);
  ok('md5', 'md5 matches the manifest', hash('md5') === man.md5);
  ok('sha256', 'sha256 matches the manifest', hash('sha256') === man.sha256);
  const anchor = man.anchor || '/*@@INSTALL_CONNECTORS@@*/';
  ok('anchor', 'exactly one install marker, inside CONNECTORS=[ ]',
     text.split(anchor).length - 1 === 1 && text.includes('CONNECTORS=[' + anchor + ']'));
  // The install skill refuses to deploy unless manifest.anchorCount is exactly 1, so a manifest that says
  // otherwise is a package nobody can install. Check the manifest's own claim, not only the HTML.
  ok('anchor-count', 'manifest records exactly one install marker (the installer asserts anchorCount === 1)',
     man.anchorCount === 1 && man.anchor === '/*@@INSTALL_CONNECTORS@@*/', 'anchorCount=' + man.anchorCount + ' anchor=' + man.anchor);

  out('2  PUBLIC  (nothing install- or workspace-specific ships)');
  ok('uuid', 'no connector id baked in',
     !/mcp__[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text));
  const noB64 = text.replace(/data:[^,"'\s)]*;base64,[A-Za-z0-9+/=\s]+/g, 'data:;base64,');
  const emails = [...new Set(noB64.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])]
    .filter(e => !/@example\.com$/i.test(e) && e.toLowerCase() !== 'support@revizto.com');
  ok('email', 'e-mail addresses are placeholders or Revizto support only', emails.length === 0, emails.slice(0, 3).join(', '));

  out('3  READ-ONLY  (the build declares reads only, and the manifest lists exactly those)');
  const tools = (man.tools && man.tools.read) || [];
  const built = buildTools(text);
  ok('tools-read', 'every manifest tool is a read', tools.length > 0 && tools.every(isRead),
     tools.filter(t => !isRead(t)).join(', ') || '(empty)');
  ok('tools-write', 'manifest declares no write tool', Array.isArray(man.tools && man.tools.write) && man.tools.write.length === 0);
  ok('tools-build', "manifest tools equal the build's own declaration",
     built.length > 0 && JSON.stringify(built) === JSON.stringify(tools),
     'build: ' + built.join(',') + ' | manifest: ' + tools.join(','));

  out('4  VERSION  (one release, one number, in every file that states it)');
  let v, entry = {};
  try { v = JSON.parse(f.plugin).version; } catch { v = '(unreadable)'; }
  try { entry = (JSON.parse(f.marketplace).plugins || []).find(p => p.name === 'revizto-project-intelligence-matrix') || {}; } catch { /* empty */ }
  const skillV = (/^metadata:\s*\n\s+version:\s*"([^"]+)"/m.exec(f.skill) || [])[1];
  const logV = (/^##\s+(\d+\.\d+\.\d+)/m.exec(f.changelog) || [])[1];
  const htmlV = (/const\s+BUILD\s*=\s*\{[^}]*version\s*:\s*"([^"]+)"/.exec(text) || [])[1];
  ok('market-version', 'marketplace entry agrees', entry.version === v, entry.version + ' vs ' + v);
  ok('market-source', 'marketplace entry points at this folder', entry.source === './plugins/revizto-pi-matrix', entry.source);
  ok('skill-version', 'SKILL.md metadata agrees', skillV === v, skillV + ' vs ' + v);
  ok('changelog-version', 'CHANGELOG top entry agrees', logV === v, logV + ' vs ' + v);
  ok('html-version', 'the HTML build and the manifest agree', htmlV === v && man.version === v, htmlV + ' / ' + man.version + ' vs ' + v);
  ok('readme-version', 'README states this version', f.readme.includes('`v' + v + '`') && f.readme.includes('version **' + v + '**'));

  out('5  LICENCE');
  // The Apache License 2.0 text, verbatim from apache.org (sha256 of LICENSE-2.0.txt). GitHub reads it as Apache-2.0.
  const APACHE_SHA256 = 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30';
  ok('apache', 'the root LICENSE is the Apache License 2.0, unaltered', crypto.createHash('sha256').update(f.rootLicence).digest('hex') === APACHE_SHA256);
  ok('licence', 'LICENSE is a byte-identical copy of the root licence', f.licence.length > 0 && Buffer.compare(f.licence, f.rootLicence) === 0);
  ok('notice', 'NOTICE is a byte-identical copy of the root notice', f.notice.length > 0 && Buffer.compare(f.notice, f.rootNotice) === 0);
  ok('terms', 'TERMS.md is a byte-identical copy of the root Terms', f.terms.length > 0 && Buffer.compare(f.terms, f.rootTerms) === 0);
  ok('old-licence', 'no LICENSE.md (the retired Revizto Custom Licence) in this folder', !f.oldLicence);
  ok('plugin-licence', 'plugin.json declares Apache-2.0', (() => { try { return JSON.parse(f.plugin).license === 'Apache-2.0'; } catch { return false; } })());
  // The in-app Terms gate names the Repository Terms and Apache 2.0, never the retired licence, at the Terms version.
  ok('gate-terms', 'the build names the Repository Terms and Apache 2.0, not the Custom Licence',
     /Revizto Open-Source Repository/.test(text) && /Apache License/.test(text) && !/Custom Licen[cs]e/.test(text));
  // The gate's Terms block, word for word against this folder's TERMS.md (which is the root copy, pinned to
  // legal's text), and the re-gate version equal to the version TERMS.md states.
  const words = t => t.replace(/<\/?(b|strong|em|i|a)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/[*_#]/g, '').split(/\s+/).filter(Boolean);
  const ti = text.indexOf('<div class="tcs-terms" id="tcsTerms">'), tj = ti < 0 ? -1 : text.indexOf('<h4 class="tcs-notes">', ti);
  const gateW = ti < 0 || tj < 0 ? [] : words(text.slice(ti, tj));
  const termsTxt = f.terms.toString('utf8');
  const refW = words(termsTxt.split(/\n## Terms and Conditions\n/)[1] || '');
  let k = 0; while (k < refW.length && refW[k] === gateW[k]) k++;
  ok('gate-words', 'the in-app Terms are TERMS.md word for word (' + refW.length + ' words)',
     refW.length > 1000 && gateW.length === refW.length && k === refW.length,
     'first difference at word ' + k + ': "' + refW.slice(k, k + 5).join(' ') + '" vs "' + gateW.slice(k, k + 5).join(' ') + '"');
  const termsV = (/^_Version (\d+\.\d+) — /m.exec(termsTxt) || [])[1];
  const tcsV = (/tcsVersion\s*:\s*"([^"]+)"/.exec(text) || [])[1];
  ok('gate-version', 'the in-app Terms re-gate at the version TERMS.md states', !!termsV && tcsV === termsV, tcsV + ' vs ' + termsV);
  // The build embeds Geist and Geist Mono and its About text says the OFL ships beside it.
  const embedsGeist = /Geist/.test(text) && /SIL Open Font License/.test(text);
  ok('ofl', 'OFL.txt ships with the plugin and carries the Geist copyright and the OFL 1.1 text',
     !embedsGeist || (/Copyright 2024 The Geist Project Authors/.test(f.ofl) && /SIL OPEN FONT LICENSE Version 1\.1/.test(f.ofl)));

  out('6  CLAUDE.AI BUILD  (the file the Artifact tool publishes is the port of the file above, nothing else)');
  const ca = f.claudeai, caText = ca.toString('utf8'), cam = man.claudeai || {};
  const caHash = alg => crypto.createHash(alg).update(ca).digest('hex');
  ok('ca-manifest', 'manifest describes matrix-claudeai.html as the port of this matrix.html',
     cam.file === 'matrix-claudeai.html' && !!cam.portOf && cam.portOf.file === 'matrix.html' && cam.portOf.sha256 === hash('sha256'));
  ok('ca-size', 'size, md5 and sha256 match the manifest',
     ca.length > 0 && ca.length === cam.size && caHash('md5') === cam.md5 && caHash('sha256') === cam.sha256, ca.length + ' vs ' + cam.size);
  let derived = null, why = '';
  try { derived = claudeaiPort('matrix', text); } catch (e) { why = e.message; }
  ok('ca-port', 'it is byte for byte what tools/claudeai/port.mjs derives from matrix.html',
     derived !== null && Buffer.compare(ca, Buffer.from(derived, 'utf8')) === 0, why || 'committed file differs from the derived port');
  ok('ca-anchor', 'exactly one install marker, inside CONNECTORS=[ ]',
     caText.split(anchor).length - 1 === 1 && caText.includes('CONNECTORS=[' + anchor + ']'));
  ok('ca-uuid', 'no connector id baked in',
     ca.length > 0 && !/mcp__[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(caText));
  const caNoB64 = caText.replace(/data:[^,"'\s)]*;base64,[A-Za-z0-9+/=\s]+/g, 'data:;base64,');
  const caEmails = [...new Set(caNoB64.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])]
    .filter(e => !/@example\.com$/i.test(e) && e.toLowerCase() !== 'support@revizto.com');
  ok('ca-email', 'e-mail addresses are placeholders or Revizto support only', caEmails.length === 0, caEmails.slice(0, 3).join(', '));
  ok('ca-host', 'it reaches connectors through the mcp capability, never the Cowork bridge',
     /use\("mcp"\)/.test(caText) && !/\b\w+\.cowork\.\w+/.test(caText));
  ok('ca-dialog', 'no native dialog (the claude.ai viewer blocks confirm, alert and prompt)',
     ca.length > 0 && !NATIVE_DIALOG.test(caText.replace(/<script>[\s\S]*?PORT SHIM[\s\S]*?<\/script>/, '')));
  ok('ca-controls', 'host-proof controls: white checkboxes, radios and fields in any host theme (rvz-controls)',
     caText.split('<style id="rvz-controls">').length === 2 && caText.includes(CONTROLS));
  const caTools = (/var TOOLS = \{([^}]*)\};/.exec(caText) || [])[1];
  ok('ca-tools', "the shim's tool list is exactly the manifest's read tools",
     !!caTools && JSON.stringify(caTools.split(',').map(x => x.split(':')[0]).sort()) === JSON.stringify([...tools].sort()), caTools);
  return fails;
}

function selftest() {
  const base = load();
  const mod = (k, fn) => ({ ...base, [k]: fn(base[k]) });
  const json = (s, fn) => { const o = JSON.parse(s); fn(o); return JSON.stringify(o); };
  const str = b => Buffer.from(b.toString('utf8'));
  const cases = [
    ['size',              mod('html', b => Buffer.concat([b, Buffer.from(' ')]))],
    ['filled',            mod('manifest', s => json(s, o => { o.md5 = ''; }))],
    ['anchor',            mod('html', b => str(b.toString().replace('/*@@INSTALL_CONNECTORS@@*/', '')))],
    ['anchor-count',      mod('manifest', s => json(s, o => { o.anchorCount = 0; }))],
    ['anchor-count',      mod('manifest', s => json(s, o => { delete o.anchorCount; }))],
    ['uuid',              mod('html', b => str(b.toString().replace('/*@@INSTALL_CONNECTORS@@*/', '"mcp__' + ['1a2b3c4d', '1111', '2222', '3333', '444455556666'].join('-') + '__"')))],
    ['email',             mod('html', b => Buffer.concat([b, Buffer.from('someone@contoso.com')]))],
    ['tools-read',        mod('manifest', s => json(s, o => { o.tools.read.push('update_issues'); }))],
    ['tools-write',       mod('manifest', s => json(s, o => { o.tools.write = ['update_issues']; }))],
    ['tools-build',       mod('manifest', s => json(s, o => { o.tools.read.pop(); }))],
    ['market-version',    mod('marketplace', s => json(s, o => { o.plugins.find(p => p.name === 'revizto-project-intelligence-matrix').version = '9.9.9'; }))],
    ['market-source',     mod('marketplace', s => json(s, o => { o.plugins.find(p => p.name === 'revizto-project-intelligence-matrix').source = './x'; }))],
    ['skill-version',     mod('skill', s => s.replace(/(metadata:\s*\n\s+version:\s*")[^"]+/, '$19.9.9'))],
    ['changelog-version', mod('changelog', s => s.replace(/^##\s+\d+\.\d+\.\d+/m, '## 9.9.9'))],
    ['html-version',      mod('manifest', s => json(s, o => { o.version = '9.9.9'; }))],
    ['readme-version',    mod('readme', s => s.split('version **').join('version __'))],
    ['licence',           mod('licence', b => Buffer.concat([b, Buffer.from('x')]))],
    ['licence',           mod('licence', () => Buffer.alloc(0))],
    ['apache',            mod('rootLicence', b => Buffer.concat([b, Buffer.from(' ')]))],
    ['notice',            mod('notice', b => Buffer.concat([b, Buffer.from('x')]))],
    ['terms',             mod('terms', b => Buffer.from(b.toString().replace('CHF 1', 'CHF 10')))],
    ['old-licence',       mod('oldLicence', () => true)],
    ['plugin-licence',    mod('plugin', s => json(s, o => { o.license = 'SEE LICENSE IN LICENSE.md'; }))],
    ['gate-terms',        mod('html', b => str(b.toString().replace('Revizto Open-Source Repository', 'Revizto Custom Licence')))],
    ['gate-words',        mod('html', b => str(b.toString().replace('(b) CHF 1 (one Swiss franc)', '(b) CHF 10 (ten Swiss francs)')))],
    ['gate-version',      mod('html', b => str(b.toString().replace('tcsVersion:"2.0"', 'tcsVersion:"1.1"')))],
    ['ofl',               mod('ofl', () => '')],
    ['ca-manifest',       mod('manifest', s => json(s, o => { delete o.claudeai; }))],
    ['ca-manifest',       mod('html', b => Buffer.concat([b, Buffer.from(' ')]))],
    ['ca-size',           mod('claudeai', b => Buffer.concat([b, Buffer.from(' ')]))],
    ['ca-size',           mod('claudeai', () => Buffer.alloc(0))],
    ['ca-port',           mod('claudeai', b => str(b.toString().replace('Run the install skill again', 'Run the installer again')))],
    ['ca-port',           mod('html', b => str(b.toString().replace('This page is not running inside Cowork, so no connector', 'This page is not in Cowork, so no connector')))],
    ['ca-anchor',         mod('claudeai', b => str(b.toString().replace('/*@@INSTALL_CONNECTORS@@*/', '')))],
    ['ca-uuid',           mod('claudeai', b => str(b.toString().replace('/*@@INSTALL_CONNECTORS@@*/', '/*@@INSTALL_CONNECTORS@@*/"mcp__' + ['1a2b3c4d', '1111', '2222', '3333', '444455556666'].join('-') + '__"')))],
    ['ca-email',          mod('claudeai', b => Buffer.concat([b, Buffer.from('someone@contoso.com')]))],
    ['ca-host',           mod('claudeai', b => Buffer.concat([b, Buffer.from('window.cowork.callMcpTool')]))],
    ['ca-dialog',         mod('claudeai', b => Buffer.concat([b, Buffer.from('<script>window.alert ("x")</script>')]))],
    ['ca-controls',       mod('claudeai', b => str(b.toString().replace('<style id="rvz-controls">', '<style id="rvz-ctl">')))],
    ['ca-controls',       mod('claudeai', b => str(b.toString().replace(CONTROLS, CONTROLS.replace('appearance:none;color-scheme:light', 'appearance:auto;color-scheme:light'))))],
    ['ca-tools',          mod('claudeai', b => str(b.toString().replace('var TOOLS = {list_accounts:1,', 'var TOOLS = {list_accounts:1,update_issues:1,')))],
  ];
  const clean = gates(base);
  let blind = clean.length ? ['clean tree is not green: ' + clean.join(', ')] : [];
  for (const [id, f] of cases) {
    const red = gates(f).includes(id);
    console.log((red ? '  PASS  ' : '  FAIL  ') + 'goes red on: ' + id);
    if (!red) blind.push(id);
  }
  console.log(blind.length ? '\nSELFTEST FAILED — blind: ' + blind.join(', ') : '\nSELFTEST PASS — all ' + cases.length + ' injected defects went red.');
  return blind.length ? 1 : 0;
}

if (process.argv.includes('--selftest')) process.exit(selftest());
let total = 0;
const fails = gates(load(), s => { if (/^  (PASS|FAIL)/.test(s)) total++; console.log(s); });
console.log('\n' + (total - fails.length) + ' passed, ' + fails.length + ' failed');
process.exit(fails.length ? 1 : 0);
