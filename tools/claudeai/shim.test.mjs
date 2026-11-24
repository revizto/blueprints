// Runtime harness for the claude.ai shims: runs the shim (the first <script>) of each committed claude.ai build
// in a fake claude.ai host and checks the bridge the app relies on.   node tools/claudeai/shim.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shimScript } from './port.mjs';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ID = ['1a2b3c4d', '5e6f', '7890', 'abcd', 'ef1234567890'].join('-');      // the documented placeholder id
const OTHER = ['99999999', '1111', '2222', '3333', '444455556666'].join('-');
const results = [];
const ok = (n, c, d='') => { results.push([n, !!c]); console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  — ' + d)); };
async function run(product, file, table, tableDecl) {
  const src = fs.readFileSync(file, 'utf8');
  const shim = shimScript(src);
  const calls = [];
  const mcp = { callTool: async (server, tool, args) => { calls.push([server, tool, args]);
    if (tool === 'list_projects') { const e = new Error('nope'); e.code = 'not_granted'; throw e; }
    if (tool === 'list_licenses') { const e = new Error('not connected'); e.code = 'server_not_connected'; throw e; }
    if (tool === 'list_clash_tests') { const e = new Error('no answer in 30 s'); e.code = 'timeout'; throw e; }
    return { payload: { ok: true, tool } }; } };
  const sample = Object.assign(async (input, opts) => ({ text: 'ANSWER:' + JSON.stringify(input).length }), {});
  const body = { classList: { add(){} } };
  const win = { claude: { use: async n => n === 'mcp' ? mcp : n === 'sample' ? sample : n === 'downloads' ? { save: async () => {} } : null } };
  const id = ID;
  win.localStorage = { setItem(){}, removeItem(){}, getItem(){ return null; } };
  const fn = new Function('window', 'document', tableDecl + '\n' + shim + '\n;return window;');
  const w = fn(win, { body }, );
  await new Promise(r => setTimeout(r, 20));
  const B = w.RVZ_BRIDGE;
  const r1 = await B.callMcpTool('mcp__' + id + '__list_accounts', { a: 1 });
  ok(product + ': routes by the install name', calls[0] && calls[0][0] === 'Revizto Sydney MCP' && calls[0][1] === 'list_accounts', JSON.stringify(calls[0]));
  ok(product + ': result in the Cowork shape', r1 && r1.structuredContent && r1.structuredContent.ok === true, JSON.stringify(r1));
  const r2 = await B.callMcpTool('mcp__' + OTHER + '__list_accounts', {});
  ok(product + ': an unnamed connector is refused with the classified message', r2.isError && /Failed to parse SSE message .*run the install skill again/.test(r2.content[0].text), JSON.stringify(r2));
  const r3 = await B.callMcpTool('mcp__' + id + '__delete_everything', {});
  ok(product + ': an undeclared tool is refused before the platform', r3.isError && /Unknown tool/.test(r3.content[0].text));
  const r4 = await B.callMcpTool('mcp__' + id + '__list_licenses', {});
  ok(product + ': a connector the viewer has not connected is its own kind, never the removed-connector signature',
     r4.isError && /connector not connected for this viewer/.test(r4.content[0].text) && !/Failed to parse SSE/.test(r4.content[0].text), JSON.stringify(r4));
  let threw = '', r5 = null; try { r5 = await B.callMcpTool('mcp__' + id + '__list_projects', {}); } catch (e) { threw = e.message; }
  if (product === 'matrix') ok(product + ': declined consent surfaces as no bridge', /not granted/.test(threw), threw);
  else ok(product + ': declined consent is the not-connected-for-you kind with the Permissions remedy, not a generic failure',
    !threw && r5 && r5.isError && /connector not connected for this viewer/.test(r5.content[0].text) && /Permissions menu/.test(r5.content[0].text), threw || JSON.stringify(r5));
  const r6 = await B.callMcpTool('mcp__' + id + '__list_clash_tests', {});
  // each product's own classifier: the Blueprint's mcpFailKind matches /timeout/i, the Matrix's /timeout|timed out|abort/i
  const TIMEOUT = product === 'matrix' ? /timeout|timed out|abort/i : /timeout/i;
  ok(product + ': a platform timeout is classified as a timeout by its own classifier', r6.isError && TIMEOUT.test(r6.content[0].text), JSON.stringify(r6));
  return w;
}
const M = path.join(REPO, 'plugins/revizto-pi-matrix/skills/project-intelligence-matrix/assets/matrix-claudeai.html');
const Bp = path.join(REPO, 'mcp-blueprints/revizto-project-intelligence/skills/project-intelligence-dashboard/assets/dashboard-claudeai.html');
const entry = '{prefix:"mcp__' + ID + '__",name:"Revizto Sydney MCP"}';
await run('matrix', M, 'CONNECTORS', 'var CONNECTORS=[' + entry + '];');
const wb = await run('blueprint', Bp, 'CONFIG', 'var CONFIG={connectors:[' + entry + ']};');
const a = await wb.RVZ_BRIDGE.askClaude('SYS', [{ request: 'q' }]);
ok('blueprint: askClaude answers through sample', typeof a === 'string' && /^ANSWER:\d+$/.test(a), JSON.stringify(a));
// a viewer whose mcp capability resolves null: the Blueprint withdraws the bridge and shows its no-bridge state
{
  const src = fs.readFileSync(Bp, 'utf8'); const shim = shimScript(src);
  let nb = 0; const win = { claude: { use: async () => null }, localStorage: { setItem(){}, removeItem(){}, getItem(){ return null; } } };
  const w = new Function('window', 'document', 'noBridgeState', 'var CONFIG={connectors:[]};\n' + shim + '\n;return window;')(win, { body: { classList: { add(){} } } }, () => { nb++; });
  await new Promise(r => setTimeout(r, 30));
  ok('blueprint: no mcp -> bridge withdrawn and no-bridge state shown', !w.RVZ_BRIDGE.callMcpTool && nb === 1, 'callMcpTool ' + typeof w.RVZ_BRIDGE.callMcpTool + ', noBridgeState x' + nb);
}
const fails = results.filter(r => !r[1]).length; console.log(fails ? fails + ' FAILED' : 'all ' + results.length + ' passed'); process.exit(fails ? 1 : 0);
