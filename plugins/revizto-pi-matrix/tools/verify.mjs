#!/usr/bin/env node
// Revizto Project Intelligence Matrix — repository gates.
//
// The Matrix ships as one self-contained HTML file (skills/project-intelligence-matrix/assets/matrix.html),
// built and guarded outside this repository and packaged here with a manifest written from the file.
// These gates re-check, on every push, that nothing in this folder has drifted from that release:
// a hand-edit to the HTML, a version stated differently in two places, a tool list that no longer
// matches the build, or a licence copy that no longer matches the root.
//
//   node tools/verify.mjs              run every gate (exit 1 on any failure)
//   node tools/verify.mjs --selftest   inject each defect the gates exist to catch; every one must go red
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '..', '..');
const SKILL = 'skills/project-intelligence-matrix';

function load() {
  const r = (p, enc = 'utf8') => fs.readFileSync(p, enc);
  return {
    html: r(path.join(ROOT, SKILL, 'assets/matrix.html'), null),
    manifest: r(path.join(ROOT, SKILL, 'assets/manifest.json')),
    plugin: r(path.join(ROOT, '.claude-plugin/plugin.json')),
    marketplace: r(path.join(REPO, '.claude-plugin/marketplace.json')),
    skill: r(path.join(ROOT, SKILL, 'SKILL.md')),
    changelog: r(path.join(ROOT, 'CHANGELOG.md')),
    readme: r(path.join(ROOT, 'README.md')),
    licence: r(path.join(ROOT, 'LICENSE.md'), null),
    rootLicence: r(path.join(REPO, 'LICENSE.md'), null),
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
  ok('licence', 'LICENSE.md is a byte-identical copy of the root licence', Buffer.compare(f.licence, f.rootLicence) === 0);
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
    ['uuid',              mod('html', b => str(b.toString().replace('/*@@INSTALL_CONNECTORS@@*/', '"mcp__1a2b3c4d-1111-2222-3333-444455556666__"')))],
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
