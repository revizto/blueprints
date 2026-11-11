#!/usr/bin/env node
// Revizto Project Intelligence Matrix — repository gates.
//
// The Matrix ships as one self-contained HTML file (skills/project-intelligence-matrix/assets/matrix.html),
// built and guarded outside this repository and packaged here with a manifest written from the file.
// These gates re-check, on every push, that nothing in this folder has drifted from that release:
// a hand-edit to the HTML, a version stated differently in two places, or a licence copy that no
// longer matches the root. They are the same checks the release packager ran, so a green packager
// followed by a red CI means something changed after packaging.
//
//   node tools/verify.mjs            run every gate (exit 1 on any failure)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '..', '..');
const SKILL = path.join(ROOT, 'skills/project-intelligence-matrix');
const read = (p, enc = 'utf8') => fs.readFileSync(p, enc);
let failed = 0, passed = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { passed++; console.log('  PASS  ' + name); }
  else { failed++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); }
};

const html = fs.readFileSync(path.join(SKILL, 'assets/matrix.html'));
const text = html.toString('utf8');
const man = JSON.parse(read(path.join(SKILL, 'assets/manifest.json')));
const hash = (alg) => crypto.createHash(alg).update(html).digest('hex');

console.log('1  ASSET  (the shipped file is the packaged file)');
ok('manifest is filled (the package passed its release checks)', !!man.md5);
ok('size matches the manifest', html.length === man.size, html.length + ' vs ' + man.size);
ok('md5 matches the manifest', hash('md5') === man.md5);
ok('sha256 matches the manifest', hash('sha256') === man.sha256);
const anchor = man.anchor || '/*@@INSTALL_CONNECTORS@@*/';
ok('exactly one install marker, inside CONNECTORS=[ ]',
   text.split(anchor).length - 1 === 1 && text.includes('CONNECTORS=[' + anchor + ']'));

console.log('2  PUBLIC  (nothing install- or workspace-specific ships)');
const uuidPrefix = /mcp__[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
ok('no connector id baked in', !uuidPrefix.test(text));
const noB64 = text.replace(/data:[^,"'\s)]*;base64,[A-Za-z0-9+/=\s]+/g, 'data:;base64,');
const emails = [...new Set(noB64.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])]
  .filter(e => !/@example\.com$/i.test(e) && e.toLowerCase() !== 'support@revizto.com');
ok('e-mail addresses are placeholders or Revizto support only', emails.length === 0, emails.slice(0, 3).join(', '));

console.log('3  READ-ONLY  (the build declares reads only, and the manifest says so)');
const tools = (man.tools && man.tools.read) || [];
const write = /(^|_)(update|create|delete|add|remove|set|edit|close|invite|toggle|restore|reorder|change)(_|$)/;
ok('manifest lists read tools', tools.length > 0);
ok('every declared tool is a read', tools.every(t => /^(list|get)_/.test(t) && !write.test(t)),
   tools.filter(t => !/^(list|get)_/.test(t) || write.test(t)).join(', '));
ok('manifest declares no write tool', Array.isArray(man.tools && man.tools.write) && man.tools.write.length === 0);

console.log('4  VERSION  (one release, one number, in every file that states it)');
const v = JSON.parse(read(path.join(ROOT, '.claude-plugin/plugin.json'))).version;
const market = JSON.parse(read(path.join(REPO, '.claude-plugin/marketplace.json')));
const entry = (market.plugins || []).find(p => p.name === 'revizto-project-intelligence-matrix') || {};
const skillV = (/^metadata:\s*\n\s+version:\s*"([^"]+)"/m.exec(read(path.join(SKILL, 'SKILL.md'))) || [])[1];
const logV = (/^##\s+(\d+\.\d+\.\d+)/m.exec(read(path.join(ROOT, 'CHANGELOG.md'))) || [])[1];
const htmlV = (/const\s+BUILD\s*=\s*\{[^}]*version\s*:\s*"([^"]+)"/.exec(text) || [])[1];
const readme = read(path.join(ROOT, 'README.md'));
ok('marketplace entry agrees', entry.version === v, entry.version + ' vs ' + v);
ok('marketplace entry points at this folder', entry.source === './plugins/revizto-pi-matrix', entry.source);
ok('SKILL.md metadata agrees', skillV === v, skillV + ' vs ' + v);
ok('CHANGELOG top entry agrees', logV === v, logV + ' vs ' + v);
ok('the HTML build agrees', htmlV === v && man.version === v, htmlV + ' / ' + man.version + ' vs ' + v);
ok('README states this version', readme.includes('`v' + v + '`') && readme.includes('version **' + v + '**'));

console.log('5  LICENCE');
ok('LICENSE.md is a byte-identical copy of the root licence',
   read(path.join(ROOT, 'LICENSE.md'), null).equals(read(path.join(REPO, 'LICENSE.md'), null)));

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
