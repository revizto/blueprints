---
name: project-intelligence-matrix
description: >
  This skill should be used when the user wants to "open the Revizto Matrix",
  "open the Project Intelligence Matrix", "set up clash governance", "open the clash
  matrix", "build clash tests from my search sets", or just installed the Revizto
  Project Intelligence Matrix plugin and needs the Matrix created. It deploys the
  pre-built Project Intelligence Matrix (a fixed, self-contained HTML file bundled
  with this plugin) as an artifact, optionally pointed at the installing user's own
  Revizto MCP connectors for live, read-only clash data.
metadata:
  version: "1.0.1"
---

# Project Intelligence Matrix — install action

Deploy the **pre-built** Revizto Project Intelligence Matrix as an artifact.

## 🚫 CRITICAL — deploy a bundled file verbatim. Do NOT build a matrix.

The Matrix is a **finished, approved artifact** that ships inside this plugin as two builds of the same
release, one per way of creating artifacts (step 0 picks one):

- `assets/matrix-claudeai.html` — for the **Artifact tool** (claude.ai artifacts). The usual case.
- `assets/matrix.html` — for Cowork's **`create_artifact`** (live artifacts), which only some organisations
  still have.

`matrix-claudeai.html` is derived from `matrix.html` by a fixed, checked port; neither is ever edited by
hand. Your entire job is to **copy one file**, **fill one marker with the user's connectors**, then
register it. Sizes, checksums, version, build stamp and tool list live in `assets/manifest.json`, generated
from the files at release. **Never type any of those values into this document** — read the manifest.

You must **NOT**, under any circumstances:

- author, write, generate, re-create, "rebuild", redesign or improve a matrix, a dashboard or any part of these files;
- summarise a file and reproduce it from memory;
- change its layout, styles, scripts, views or any HTML/JS other than the single connector marker described in step 3.

If you find yourself *writing HTML, CSS or JavaScript*, stop — you are doing the wrong thing. A regenerated
matrix is an automatic failure.

## What this artifact is

A clash-governance workspace. The user imports their project's search-set export (`.vimsst`) or starts
from the bundled **Codifying Coordination v2.0** template, decides which pairs of search sets are
clash-tested and how, and exports clash tests that Revizto imports. All of that works **offline**. With a
Revizto MCP connector, the **04 Health** view also reads how those clash tests are running in a live
project — read-only, always: this build cannot write to Revizto. It is Revizto's own published plugin;
deploying it to the user's own artifacts installs it for them.

## Steps

**0 — Pick the install path from the tools this session has.** Cowork's live artifacts were retired for
new artifacts on 19 August 2026; sessions now normally have the built-in **Artifact** tool instead of
`create_artifact`. Organisations on customer-managed keys, zero data retention or a HIPAA-ready setup keep
live artifacts.

- The **Artifact** tool is available → **Path A** (claude.ai artifact). Use it even if `create_artifact`
  also exists.
- No Artifact tool, but `create_artifact` is available (search your deferred tools for it before deciding)
  → **Path B** (Cowork live artifact).
- **Neither** → stop. Tell the user artifacts are switched off for them: **Settings → Capabilities →
  "Create and edit files"** (on Team and Enterprise an owner sets it under **Organization settings →
  Capabilities**). Do not publish the file any other way.

Path B only: the read tools are authorised for the artifact only when `create_artifact` runs **locally on
the user's computer**. In a **cloud** session it cannot bind the `mcp_tools` allowlist. If the header shows
a cloud icon, tell the user to switch the run location to **"On your computer"** and re-run. Path A has no
such requirement.

**1 — Check for a Revizto MCP connector (optional for this artifact).** Look for a
`mcp__<id>__list_licenses` tool in this session.

- **None connected:** the Matrix is still fully usable offline. Tell the user that live clash data in
  04 Health needs the **Revizto MCP** connector for their region (**Customize → Connectors**), ask whether
  they want to add it first, and if they don't, continue: leave the marker as shipped (step 3), skip
  step 4, and register with no connector access (step 5).
- **Connected:** continue with every step.

The connector is a custom/remote MCP server: transport **Streamable HTTP**, URL
`https://api.<region>.revizto.com/mcp`, **OAuth Client ID `revizto-mcp`**, client secret **blank**.

Path A also needs each Revizto connector's **display name** — the name the user gave it in their connector
settings, because a claude.ai artifact reaches a connector by name, not by id. Load the
**`artifact-capabilities`** skill now (the Artifact tool requires it before declaring capabilities); its
"connectors this session" list maps each connector id to its name. Copy each Revizto connector's name
exactly as listed. Never guess a name.

Path A also needs the prefix to be a connector **id** (`mcp__` + a UUID + `__`), because the page matches
connectors by id. If the Revizto tools in this session have no UUID-shaped prefix, stop and tell the user
this host is not supported yet — do not install a Matrix that cannot read.

Two Revizto-side conditions are easy to miss, and both surface later as "unreadable licence" rather than
as a connection error, so mention them if licences come back blocked:

- The **Revizto MCP Server** app must be activated on the organisation account (owner/admin:
  Manage account info → Developer portal).
- Each organisation account must be **authorised for that connector**. One sign-in only covers accounts on
  the authentication method used at the time; the rest are authorised from Revizto Workspace → profile →
  **Active sessions → API**.

If the user's connector was created before 30 July 2026, it used the previous OAuth client ID and no
longer authorises — it must be removed and re-added with `revizto-mcp`. Re-adding mints a **new connector
id** (and may change its name), so a previously deployed Matrix points at a connector that no longer
exists. Re-run this skill; do not try to repair the old artifact in place.

**2 — Copy the bundled Matrix verbatim and check it against the manifest.** Do not open it to reproduce
it — copy it.

**Where to run it.** Run the copy in your **outputs (working) folder** — the folder your shell, your file
tools and the Artifact tool can all reach. In Cowork the shell sees it under `/sessions/<id>/mnt/outputs/`,
while the Read and Artifact tools take its path on the computer; `cd` there first, and in steps 5 and 6 give
those tools the same file by the path they use. A file left in the shell's own home folder cannot be
published.

First resolve the plugin's own folder. Claude normally sets `$CLAUDE_PLUGIN_ROOT`, and it always wins; if
it is empty, find the plugin folder — the one containing `.claude-plugin/plugin.json` whose `name` is
`revizto-project-intelligence-matrix` —
and add `PR=/path/to/that/folder` as the first line of the block (each shell call starts fresh, so a value
set in an earlier call is gone). Set `HOST` to `claudeai`
for Path A or `cowork` for Path B. Every path below reads from `PR`, so there is one code path either way.

```bash
HOST=claudeai   # Path A. Path B: HOST=cowork
PR="${CLAUDE_PLUGIN_ROOT:-${PR:-}}"
if [ -z "$PR" ]; then
  echo "STOP: CLAUDE_PLUGIN_ROOT is not set. Set PR to the folder containing this plugin's .claude-plugin/plugin.json, then re-run this block."
  exit 1
fi
[ -f "$PR/.claude-plugin/plugin.json" ] && [ -f "$PR/skills/project-intelligence-matrix/assets/matrix.html" ] \
  || { echo "STOP: $PR is not the Matrix plugin folder."; exit 1; }
A="$PR/skills/project-intelligence-matrix/assets"
F=$( [ "$HOST" = claudeai ] && echo matrix-claudeai.html || echo matrix.html )
cp "$A/$F" ./pi-matrix.pristine.html     # never edited: the reference for step 6
cp "$A/$F" ./pi-matrix.html              # the copy you edit in step 3
python3 - "$A/manifest.json" ./pi-matrix.pristine.html "$PR/.claude-plugin/plugin.json" "$HOST" "$A/matrix.html" <<'PY'
import hashlib, json, re, sys
m = json.load(open(sys.argv[1])); b = open(sys.argv[2], "rb").read(); host = sys.argv[4]
v = json.load(open(sys.argv[3]))["version"]
assert m.get("md5"), "STOP: manifest.json is unfilled - this package was never released. Do not deploy."
assert m.get("version") == v, f"STOP: manifest is version {m.get('version')}, plugin is {v}. Do not deploy."
want = m if host == "cowork" else m.get("claudeai") or {}
assert want.get("sha256"), "STOP: the manifest has no claude.ai build - this package predates it. Do not deploy."
if host == "claudeai":
    cw = hashlib.sha256(open(sys.argv[5], "rb").read()).hexdigest()
    assert want["portOf"]["sha256"] == m["sha256"] == cw, "STOP: the claude.ai build is not the port of this release. Do not deploy."
got = hashlib.sha256(b).hexdigest()
print("file", host, "| bytes", len(b), "want", want["size"], "| sha256", got[:12], "want", want["sha256"][:12])
assert len(b) == want["size"] and got == want["sha256"], "STOP: the copy does not match the manifest. Do not deploy it."
assert m.get("anchorCount") == 1 and b.decode().count(m["anchor"]) == 1, "STOP: install marker missing or repeated."
rd, wr = m["tools"]["read"], m["tools"]["write"]
assert rd and wr == [] and all(re.match(r"^(list|get)_", t) for t in rd), "STOP: manifest declares a non-read tool."
print("OK - Matrix", m["version"], "build", m["stamp"], "| read tools:", ", ".join(rd))
PY
```

If any assertion fails, **stop and say so**. An unfilled manifest means the package did not pass its
release checks; a mismatch means the wrong file, a truncated copy, or a file you generated yourself. If
the copy is only a few KB you have definitely got the wrong file.

Never substitute a hand-written file, and never point `PR` at anything but this plugin's own installed
folder.

**3 — Make EXACTLY ONE edit: replace the connector marker.** The copied file contains this exact text
once, as the value of its connector list:

```js
const CONNECTORS=[/*@@INSTALL_CONNECTORS@@*/];
```

The marker string is also recorded in `manifest.json` → `.anchor`. Read the installer's actual Revizto
MCP tool prefix from the connected tool names in this session — the leading `mcp__<connector-id>__`
segment (e.g. `mcp__1a2b3c4d-…__list_licenses` → prefix `mcp__1a2b3c4d-…__`). For **each** connected
Revizto region, add one entry, in install order. Path B:

```js
const CONNECTORS=[{prefix:"mcp__<connector-id>__",env:"prod",origin:"current"}];
```

Path A adds that connector's display name from step 1, exactly as listed:

```js
const CONNECTORS=[{prefix:"mcp__<connector-id>__",env:"prod",origin:"current",name:"<connector display name>"}];
```

(Two regions: two entries separated by a comma. The first entry is the one the Matrix selects first.)
Write the line with the helper below, never by hand. On the lines between the `cat` line and the closing
`RVZ_CONNECTORS_END` line, replace the two example lines with two lines per connected Revizto region, in install
order: the connector's prefix (read above, from this session's tool names), then its display name (from step 1),
each exactly as read, nothing else on the line. Path B only: leave the name line empty. On Path A every connector
needs its exact display name, because the page reaches a connector by name and rejects every call for one without
it: if you cannot read a name, stop and ask the user for it, and do not publish without it (the helper refuses a
blank name on the claude.ai build). The
helper reads those lines as data — they never become code — and writes each prefix and name as a JSON string (with
`<` as `\u003c`), so no quote, backslash or `</script>` in a name can change it or break the page. If a display name
spans more than one line, holds a control character or is exactly `RVZ_CONNECTORS_END`, stop and tell the user. The
helper replaces the marker comment itself and touches nothing else. Read the real prefix and name; never guess them.
If no connector is connected, skip the helper and leave the line exactly as shipped.

```bash
cat > ./rvz-connectors.txt <<'RVZ_CONNECTORS_END'
mcp__<connector-id>__
<connector display name>
RVZ_CONNECTORS_END
python3 - ./pi-matrix.html ./rvz-connectors.txt <<'PY'
import json, os, re, sys
f, data = sys.argv[1], sys.argv[2]
raw = open(data, encoding="utf-8", newline="").read(); os.remove(data)   # newline="": a \r stays visible
lines = (raw[:-1] if raw.endswith("\n") else raw).split("\n")
assert len(lines) >= 2 and len(lines) % 2 == 0, "STOP: write two lines per connector (prefix, then name). Redo this step."
CONNS = list(zip(lines[0::2], lines[1::2]))
assert all(re.fullmatch(r"mcp__[A-Za-z0-9_-]+__", p) for p, _ in CONNS), "STOP: a prefix is not mcp__<id>__. Redo this step."
assert not any(re.search(r"[\x00-\x1f\x7f]", n) for _, n in CONNS), "STOP: a connector name holds a control character. Tell the user."
js = lambda v: json.dumps(v, ensure_ascii=False).replace("<", "\\u003c")
ent = ",".join("{prefix:%s,env:\"prod\",origin:\"current\"%s}" % (js(p), (",name:" + js(n)) if n else "") for p, n in CONNS)
s = open(f, encoding="utf-8").read()
assert not ("window.RVZ_BRIDGE = {" in s and any(not n.strip() for _, n in CONNS)), "STOP: Path A needs every connector's exact display name. Ask the user for it; do not publish without it."
old = "const CONNECTORS=[/*@@INSTALL_CONNECTORS@@*/];"
assert s.count(old) == 1, "STOP: install marker missing or repeated. Redo from step 2."
open(f, "w", encoding="utf-8").write(s.replace(old, "const CONNECTORS=[" + ent + "];"))
print("connector line set:", len(CONNS), "connector(s)")
PY
```

Then prove the edit was that one line and nothing else:

```bash
python3 - ./pi-matrix.pristine.html ./pi-matrix.html <<'PY'
import sys
a = open(sys.argv[1], encoding="utf-8").read().split("\n"); b = open(sys.argv[2], encoding="utf-8").read().split("\n")
assert len(a) == len(b), "STOP: lines were added or removed. Redo from step 2."
diff = [i for i in range(len(a)) if a[i] != b[i]]
assert len(diff) <= 1 and all(a[i].startswith("const CONNECTORS=[") for i in diff), "STOP: something other than the connector line changed. Redo from step 2."
print("OK -", "connector line set" if diff else "unchanged (no connector)", "| markers left:", b[diff[0]].count("@@INSTALL_CONNECTORS@@") if diff else "n/a")
PY
```

When connected, "markers left" must be 0.

**4 — Path B only, when connected: call every read tool in `manifest.json` once in this session (this is
what makes the allowlist bind).** Path A skips this step: a claude.ai artifact asks the user to approve its
connector tools itself, the first time it needs them, so you make **no** Revizto calls at install.

**Tell the user first, and get their go-ahead.** Say, in one or two sentences, that to authorise the
Matrix's live reads you will now call each Revizto read tool once through their connector — read-only, for
one account, licence and project — and that this happens at install, before the Matrix's own Terms gate.
If they decline, skip this step and deploy with no `mcp_tools` (the Matrix works offline; they can re-run
the install later).

`manifest.json` → `.tools.read` is the authoritative list. `create_artifact` only puts a tool on the
artifact's `mcp_tools` allowlist if you **actually called that tool in this session** — declaring a tool
you never called does nothing. So, for **each** connected prefix, call each tool in `.tools.read` once
before creating the artifact, in this order so each call has the identifiers it needs:

1. `list_accounts` → take the `uuid` of an account whose `mcpStatus` is `"available"`.
2. `list_licenses` with that `accountUuid` → take a `licenseUuid`.
3. `list_projects` with that `licenseUuid` → take a `projectUuid`.
4. With that `projectUuid`, call every remaining tool in `.tools.read`. Tools that need a further
   identifier the earlier calls did not return (for example an issue UUID) may be called with the
   `projectUuid` alone.

If a call returns empty or errors for lack of data or a missing identifier, that is fine — it still counts
as "called this session", which is all the binding needs. Repeat per connector prefix.

**Both paths:** if a tool in `.tools.read` **does not exist** in this session at all (the Matrix declares
some tools ahead of the Revizto MCP server shipping them), leave it out of what you declare in step 5; the
Matrix handles its absence. This build is **read-only**: `manifest.json` → `.tools.write` is empty. **Never
call or declare any write tool** (`update_issues` or anything else) for this artifact.

**5 — Register the artifact from the copied file.**

*Path A — the Artifact tool.*

1. **Re-install or first install?** List the user's artifacts (`action: "list"`). If one titled
   **Revizto Project Intelligence Matrix** exists, this is a re-install: read it (`action: "read"` with its
   `url`; the tool requires that before an update) and publish to that same `url`, so the user keeps their
   link. Otherwise publish a new artifact.
2. **The Artifact tool asks you to read a file you did not write before publishing it.** Read
   `pi-matrix.html` in parts (the Read tool with `offset` and `limit`). It is large: some lines are the
   embedded Geist fonts as base64 and some are long data tables. The sha256 checks in steps 2 and 3 prove
   these are the released bytes plus your one edit.
3. **Publish** with:
   - `file_path`: `pi-matrix.html` in your outputs folder, by the path the Artifact tool uses (the file from
     steps 2–3 — **not** any newly authored file);
   - `url`: only on a re-install (step 5.1);
   - `icon`: `grid` on a first publish;
   - `description`: "Revizto clash governance: author clash tests from search sets and check them in a live project.";
   - `capabilities`, when connected:
     `{"mcp": {"servers": [{"server": "<connector display name>", "tools": [<every tool in .tools.read that exists in this session>]}]}, "downloads": true}`
     — one `servers` entry per connector, its `server` exactly the name you wrote into the connector line.
     Not connected: `{"downloads": true}`. `downloads` is how the Matrix saves the clash tests it exports.

*Path B — `create_artifact`.* Call it with:

- `id`: **`revizto-project-intelligence-matrix`** (reuse this exact id; never invent a new one).
- `html_path`: the path to your copied `./pi-matrix.html` (the file from steps 2–3 — **not** any newly authored file).
- `mcp_tools`: when connected, **required** — every tool you called in step 4, each fully qualified with
  its connector's `mcp__<connector-id>__` prefix, repeated per connected prefix. If you omit it or pass an
  empty list while connected, live reads can never work. When **no** connector is connected, omit
  `mcp_tools` entirely.

**6 — Verify you deployed the real thing (mandatory).**

- Content: the only permitted difference from the shipped file is the connector line, which the check at
  the end of step 3 proved against `./pi-matrix.pristine.html` (itself checked against `manifest.json` in
  step 2). Confirm the deployed file is `./pi-matrix.html`, contains the four views (`tab-import`,
  `tab-matrix`, `tab-reg`, `tab-health`) and, when connected, no longer contains the marker text. A matrix
  you "built" yourself will be far smaller and will match nothing — discard it and redo from step 2.
- Live reads (connected installs): the user opens **04 Health** and reads a project. Path A: the artifact
  first asks them to allow the Revizto tools, then the Matrix shows its Terms gate, then the read runs.
  "This viewer cannot run the Revizto connectors for this page" means the approval was declined or the
  connector is not connected for them; "This Revizto MCP connection is no longer registered" straight
  after install usually means the connector line lacks that connector's name — re-run from step 2. Path B: it must reach the Terms gate and then the read — **not** "The
  Matrix's tools aren't authorised for this artifact". If it shows that, confirm you (a) *called* every
  available tool in step 4 and (b) *declared* exactly those in step 5, then re-create.

**7 — Hand off to the user.** Tell them the Matrix is open and lands on **Start here**, with two ways in:
import their project's search-set export (`.vimsst`), or start from the Codifying Coordination v2.0
template. Everything they import or edit stays in their own browser's storage for this artifact. On Path A,
the first live read asks them to allow the Revizto tools; the Terms gate follows at that first live Revizto
read, not at open. Exported clash tests are saved as a `.zip` on Path A (unzip it to get the `.vimctst`).
Point them at the in-product **About · Tour · Terms**. Then stop — do not offer to extend or modify the
artifact.

## Tools to declare (per connected connector)

**Read `assets/manifest.json` and use `.tools.read`.** This section deliberately does not repeat the
list: a transcribed list is how an earlier Revizto install skill named nine tools against a build that
needed ten, and every install of it failed. `.tools.write` is empty — this build never writes.

## If the user asks for changes

Do not edit the deployed file. A hand edit passes none of the release checks, and the next re-install
silently discards it. Changes come from Revizto in a new release of this plugin.
