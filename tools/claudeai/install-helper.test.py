"""The install skills' connector helper takes any connector name as data, never as code.

    python3 tools/claudeai/install-helper.test.py

Runs the helper block exactly as each SKILL.md prints it, with the example lines replaced the way an installing agent
replaces them, on a copy of the shipped page. Every allowed name must round-trip exactly (read back by node from the
written line), names the skill tells the agent to stop on must be refused with the page untouched, and no name may
run a command. Copilot (PR #5) and two independent reviews supplied the hostile names.
"""
import json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TMP = tempfile.mkdtemp(prefix='rvz-helper-')
CANARY = os.path.join(TMP, 'ran')
PFX = 'mcp__' + '-'.join(['1a2b3c4d', '5e6f', '7890', 'abcd', 'ef1234567890']) + '__'
OK = ['Revizto "Syd"', 'Sydney"', 'Sydney\\', 'Sydney\\\\\\', 'a</script><b>x', '<!-- x -->', 'Ünïcode — NZ ‘x’ 👩‍💻', '',
      "it's \\n not a newline", 'a"""b', '"""+str(open(%r,"w").write("x"))+r"""' % CANARY, '|~|', 'x y z',
      '$(touch %s) `touch %s` ${HOME}' % (CANARY, CANARY), 'PY', 'RVZ_CONNECTORS_END ']
REFUSED = ['two\nlines', 'tab\there', 'x\nPY\ntouch %s\n' % CANARY, 'Sydney\r', 'Syd\rmcp__evil__\rEvil', 'a\r\nb']
TARGETS = [('plugins/revizto-pi-matrix/skills/project-intelligence-matrix', 'matrix.html', 'pi-matrix.html'),
           ('mcp-blueprints/revizto-project-intelligence/skills/project-intelligence-dashboard', 'dashboard.html', 'pi-blueprint.html')]
EXAMPLE = 'mcp__<connector-id>__\n<connector display name>\n'
fails = 0


def check(ok, what):
    global fails
    print(('  PASS  ' if ok else '  FAIL  ') + what)
    fails += not ok


for skill_dir, asset, page in TARGETS:
    skill = open(os.path.join(ROOT, skill_dir, 'SKILL.md'), encoding='utf-8').read()
    shipped_p = os.path.join(ROOT, skill_dir, 'assets', asset)
    shipped = open(shipped_p, encoding='utf-8').read()
    m = re.search(r"```bash\n(cat > \./rvz-connectors\.txt <<'RVZ_CONNECTORS_END'\n.*?\nPY\n)```", skill, re.S)
    check(bool(m) and m.group(1).count(EXAMPLE) == 1, page + ': SKILL.md prints the helper with its two example lines')
    if not m:
        continue
    block = m.group(1)

    def run(lines):
        d = os.path.join(TMP, 'w'); shutil.rmtree(d, ignore_errors=True); os.makedirs(d); shutil.copy(shipped_p, os.path.join(d, page))
        r = subprocess.run(['bash', '-c', block.replace(EXAMPLE, ''.join(l + '\n' for l in lines))], cwd=d, capture_output=True, text=True)
        return r, open(os.path.join(d, page), encoding='utf-8').read(), os.path.exists(os.path.join(d, 'rvz-connectors.txt'))

    def readback(out):
        if page == 'pi-matrix.html':
            js = re.search(r"const CONNECTORS=\[.*?\];", out).group(0) + ';process.stdout.write(JSON.stringify(CONNECTORS))'
        else:
            g = re.search(r"const CONFIG=\{connectors:\[\n( /\*[\s\S]*?\*/\n)([\s\S]*?)\],readOnly:", out)
            js = 'const C=[' + g.group(2) + '];process.stdout.write(JSON.stringify(C))'
        return json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)

    for name in OK:
        r, out, left = run([PFX, name])
        got = readback(out) if r.returncode == 0 else []
        check(r.returncode == 0 and len(got) == 1 and got[0]['prefix'] == PFX and got[0].get('name') == (name or None)
              and out.count('</script>') == shipped.count('</script>') and not left, page + ': name round-trips ' + repr(name)[:60])
    r, out, _ = run([PFX, 'Sydney', PFX.replace('1a2b', '9f9f'), 'Ireland "IE"'])
    check(r.returncode == 0 and [g.get('name') for g in readback(out)] == ['Sydney', 'Ireland "IE"'], page + ': two regions, in order')
    for name in REFUSED:
        r, out, _ = run([PFX, name])
        check(r.returncode != 0 and out == shipped, page + ': refused, page untouched ' + repr(name)[:60])
    r, out, _ = run(['mcp__x__;rm', 'n'])
    check(r.returncode != 0 and out == shipped, page + ': a prefix that is not mcp__<id>__ is refused')
check(not os.path.exists(CANARY), 'no name ran a command')
shutil.rmtree(TMP, ignore_errors=True)
print('\n%s' % ('all passed' if not fails else '%d FAILED' % fails))
sys.exit(1 if fails else 0)
