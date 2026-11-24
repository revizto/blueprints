---
name: project-intelligence-dashboard
description: >
  This skill should be used when the user wants to "open the Revizto dashboard",
  "set up project intelligence", "show my Revizto projects", "open the Project
  Intelligence Blueprint", or just installed the Revizto Project Intelligence plugin
  and needs the dashboard created. It deploys the pre-built, read-only Project
  Intelligence Blueprint (a fixed, self-contained HTML file bundled with this plugin)
  as an artifact, pointed at the installing user's own Revizto licences.
metadata:
  version: "1.0.5"
---

# Project Intelligence Blueprint — install action

Deploy the **pre-built** Revizto Project Intelligence Blueprint as an artifact.

## 🚫 CRITICAL — deploy the bundled file verbatim. Do NOT build a dashboard.

The Blueprint is a **finished, approved artifact** that ships inside this plugin as two builds of the
same release, one per way of creating artifacts (step 0 picks one):

- `assets/dashboard-claudeai.html` — for the **Artifact tool** (claude.ai artifacts). The usual case.
- `assets/dashboard.html` — for Cowork's **`create_artifact`** (live artifacts), which only some
  organisations still have.

`dashboard-claudeai.html` is derived from `dashboard.html` by a fixed, checked port; neither is ever edited
by hand. Your entire job is to **copy one file** and **insert the user's connector(s) into one line**, then
register it as an artifact. It is Revizto's own published plugin; deploying it to the user's own artifacts
installs it for them.

Its size, line count, checksum, build stamp and tool list all live in `assets/manifest.json`,
generated from the file itself. **Never type any of those numbers into this document.** Earlier
versions did, the numbers went stale at every release, and the guard ended up failing on a
*correct* file — which taught installers to ignore it. Read the manifest instead.

You must **NOT**, under any circumstances:

- author, write, generate, re-create, "rebuild", redesign, or improve a dashboard;
- summarise the file and reproduce it from memory;
- change the layout, styles, scripts, views, or any HTML/JS other than the single `CONFIG.connectors` line described below.

If you find yourself *writing HTML/CSS/JS for a dashboard*, stop — you are doing the wrong thing.
The correct action is a **byte-for-byte file copy** plus one tiny edit. A regenerated dashboard is
an automatic failure.

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

**Path B MUST run in a LOCAL (on-your-computer) session, not a cloud session.** The read tools are
authorised for the dashboard artifact only when `create_artifact` runs **locally on the user's computer**.
In a **cloud** Cowork session the artifact is registered through the cloud→desktop bridge, which **cannot
bind the `mcp_tools` allowlist** — so the dashboard opens with an empty allowlist and shows "The
Blueprint's tools aren't authorised for this artifact yet" / "Licence not accessible via MCP" / "No
projects", no matter how correctly everything else is done. The header shows a **cloud icon** for cloud
sessions and a **computer/laptop icon** for local ones; to switch, use the **run-location control at the
top-right of the window** and choose **"On your computer"** (or turn OFF **Settings → Cowork → "Run new
tasks in the cloud"**), then re-run. Path A has no such requirement.

**1 — Confirm a Revizto MCP connector is connected.** If no `mcp__<id>__list_licenses` tool is available in
this session, tell the user to add the **Revizto MCP** connector for their region under **Customize →
Connectors** and stop. The connector is a custom/remote MCP server: transport **Streamable HTTP**, URL
`https://api.<region>.revizto.com/mcp`, **OAuth Client ID `revizto-mcp`**, client secret **blank**. (The
Blueprint still opens without a connector — it shows a calm "Connect the Revizto MCP Server" first-run
panel — but has nothing live to read.)

Path A also needs each Revizto connector's **display name** — the name the user gave it in their connector
settings, because a claude.ai artifact reaches a connector by name, not by id. Load the
**`artifact-capabilities`** skill now (the Artifact tool requires it before declaring capabilities); its
"connectors this session" list maps each connector id to its name. Copy each Revizto connector's name
exactly as listed. Never guess a name.

Path A also needs the prefix to be a connector **id** (`mcp__` + a UUID + `__`), because the page matches
connectors by id. If the Revizto tools in this session have no UUID-shaped prefix, stop and tell the user
this host is not supported yet — do not install a Blueprint that cannot read.

Two Revizto-side conditions are easy to miss, and both surface later as "unreadable licence" rather than as
a connection error, so mention them if licences come back blocked:

- The **Revizto MCP Server** app must be activated on the organisation account (owner/admin:
  Manage account info → Developer portal).
- Each organisation account must be **authorised for that connector**. One sign-in only covers accounts on
  the authentication method used at the time; the rest are authorised from Revizto Workspace → profile →
  **Active sessions → API**.

If the user had a connector before 30 July 2026, it was created with the previous OAuth client ID and no
longer authorises — it must be removed and re-added with `revizto-mcp`. Re-adding mints a **new connector
id** (and may change its name), so a previously-deployed Blueprint is bound to a connector that no longer exists. That is
precisely why this skill is being re-run; do not assume the old artifact can be repaired in place.

**2 — Copy the bundled dashboard verbatim into your scratch workspace.** Do not open it to reproduce
it — just copy it. Set `HOST` to `claudeai` for Path A or `cowork` for Path B.

**Where to run it.** Run the copy in your **outputs (working) folder** — the folder your shell, your file
tools and the Artifact tool can all reach. In Cowork the shell sees it under `/sessions/<id>/mnt/outputs/`,
while the Read and Artifact tools take its path on the computer; `cd` there first, and in steps 5 and 6 give
those tools the same file by the path they use. A file left in the shell's own home folder cannot be
published.

```bash
HOST=claudeai   # Path A. Path B: HOST=cowork
PR="${CLAUDE_PLUGIN_ROOT:-${PR:-}}"
[ -n "$PR" ] && [ -f "$PR/.claude-plugin/plugin.json" ] && [ -f "$PR/skills/project-intelligence-dashboard/assets/dashboard.html" ] \
  || { echo "STOP: set PR to the folder containing this plugin's .claude-plugin/plugin.json (name revizto-project-intelligence), then re-run this block."; exit 1; }
A="$PR/skills/project-intelligence-dashboard/assets"
F=$( [ "$HOST" = claudeai ] && echo dashboard-claudeai.html || echo dashboard.html )
cp "$A/$F" ./pi-blueprint.pristine.html     # never edited: the reference for step 6
cp "$A/$F" ./pi-blueprint.html              # the copy you edit in step 3
python3 - "$A/manifest.json" ./pi-blueprint.pristine.html "$HOST" "$A/dashboard.html" <<'PY'
import hashlib, json, sys
m = json.load(open(sys.argv[1])); b = open(sys.argv[2], "rb").read(); host = sys.argv[3]
want = m["asset"] if host == "cowork" else (m.get("claudeai") or {})
assert want.get("sha256"), "STOP: the manifest has no claude.ai build - this package predates it. Do not deploy."
if host == "claudeai":
    cw = hashlib.sha256(open(sys.argv[4], "rb").read()).hexdigest()
    assert want["portOf"]["sha256"] == m["asset"]["sha256"] == cw, "STOP: the claude.ai build is not the port of this release. Do not deploy."
size = want.get("bytes", want.get("size")); got = hashlib.sha256(b).hexdigest()
print("file", host, "| bytes", len(b), "want", size, "| sha256", got[:12], "want", want["sha256"][:12])
assert len(b) == size and got == want["sha256"], "STOP: the copy does not match the manifest. Do not deploy it."
print("OK - Blueprint build", m["buildStamp"], "| read:", ", ".join(m["tools"]["read"]), "| write:", ", ".join(m["tools"]["write"]))
PY
```

If an assertion fails you have the wrong file, a truncated copy, or a file you generated yourself —
**do not proceed**. If the copy is only a few KB you have definitely got the wrong file.

(If `$CLAUDE_PLUGIN_ROOT` isn't set in this environment, find the plugin folder — the one whose
`.claude-plugin/plugin.json` `name` is `revizto-project-intelligence` — and add `PR=/path/to/that/folder`
as the first line of the block; each shell call starts fresh. Never substitute a hand-written file.)

**3 — Make EXACTLY ONE edit: insert the connector prefix(es) into `CONFIG.connectors`.** Each
Revizto MCP server you add becomes one selectable row in the Blueprint's **MCP Server** panel; the
Blueprint reads from exactly one at a time and the user picks which. Near the top
of the copied file the connector array ships empty:

```js
const CONFIG={connectors:[
 /* Add ONE entry per Revizto MCP connection ... */
],readOnly:false,tcsVersion:"…",buildStamp:"…"};
```

(The `tcsVersion` and `buildStamp` values are whatever the shipped file says. Leave them exactly as
found — they are not yours to set, and `manifest.json` records what they should be.)

Read the installer's actual Revizto MCP tool prefix from the connected tool names in this session —
the leading `mcp__<connector-id>__` segment (e.g. `mcp__1a2b3c4d-…__list_licenses` → prefix
`mcp__1a2b3c4d-…__`). For **each** connected Revizto region, add one entry, so the array becomes:

```js
const CONFIG={connectors:[
  {prefix:"mcp__<connector-id>__",wsHost:"ws.revizto.com",missing:[]},
],readOnly:false,tcsVersion:"…",buildStamp:"…"};   // ← both left exactly as they were
```

Path A adds that connector's display name from step 1, exactly as listed:

```js
  {prefix:"mcp__<connector-id>__",wsHost:"ws.revizto.com",missing:[],name:"<connector display name>"},
```

Write the line with the helper below, never by hand. On the lines between the `cat` line and the closing
`RVZ_CONNECTORS_END` line, replace the two example lines with two lines per connected Revizto region, in install
order: the connector's prefix (read above, from this session's tool names), then its display name (from step 1),
each exactly as read, nothing else on the line. Path B, or a name you could not read: leave the name line empty. The
helper reads those lines as data — they never become code — and writes each prefix and name as a JSON string (with
`<` as `\u003c`), so no quote, backslash or `</script>` in a name can change it or break the page. If a display name
spans more than one line, holds a control character or is exactly `RVZ_CONNECTORS_END`, stop and tell the user.

```bash
cat > ./rvz-connectors.txt <<'RVZ_CONNECTORS_END'
mcp__<connector-id>__
<connector display name>
RVZ_CONNECTORS_END
python3 - ./pi-blueprint.html ./rvz-connectors.txt <<'PY'
import json, os, re, sys
f, data = sys.argv[1], sys.argv[2]
raw = open(data, encoding="utf-8", newline="").read(); os.remove(data)   # newline="": a \r stays visible
lines = (raw[:-1] if raw.endswith("\n") else raw).split("\n")
assert len(lines) >= 2 and len(lines) % 2 == 0, "STOP: write two lines per connector (prefix, then name). Redo this step."
CONNS = list(zip(lines[0::2], lines[1::2]))
assert all(re.fullmatch(r"mcp__[A-Za-z0-9_-]+__", p) for p, _ in CONNS), "STOP: a prefix is not mcp__<id>__. Redo this step."
assert not any(re.search(r"[\x00-\x1f\x7f]", n) for _, n in CONNS), "STOP: a connector name holds a control character. Tell the user."
js = lambda v: json.dumps(v, ensure_ascii=False).replace("<", "\\u003c")
ins = "".join("  {prefix:%s,wsHost:\"ws.revizto.com\",missing:[]%s},\n" % (js(p), (",name:" + js(n)) if n else "") for p, n in CONNS)
s = open(f, encoding="utf-8").read()
m = re.search(r"const CONFIG=\{connectors:\[\n( /\*[\s\S]*?\*/\n)\],readOnly:", s)
assert m and s.count("const CONFIG={connectors:[") == 1, "STOP: CONFIG.connectors is not the shipped empty list. Redo from step 2."
open(f, "w", encoding="utf-8").write(s[:m.end(1)] + ins + s[m.end(1):])
print("connectors set:", len(CONNS))
PY
```

The helper above is that one edit. **Do not touch anything else in the file** — no reformatting, no other
edits. Read the real prefix and name; never guess them. (If you genuinely cannot obtain
a prefix, you may leave `connectors:[]` and deploy anyway — the Blueprint will show the connect CTA —
but it won't load live data, so prefer inserting the prefix.)

**4 — Path B only: call every read tool in `manifest.json` once in this session (mandatory — this is what makes the allowlist bind).**
Path A skips this step: a claude.ai artifact asks the user to approve its connector tools itself, the first
time it needs them, so you make **no** Revizto calls at install.

`manifest.json` → `.tools.read` is the authoritative list, generated from the build's own argument
contract. Use it rather than any list written out in prose, here or anywhere else. A previous
release shipped a skill that named nine tools against a build that needed ten, and the missing one
was `list_accounts` — the entry point for licence discovery — so every install produced *"no
licences at all"* and every server looked unauthorised.
`create_artifact` will only put a tool on the artifact's `mcp_tools` allowlist if you **actually called
that tool in this session** — declaring a tool you never called does nothing, and the dashboard then
shows "The Blueprint's tools aren't authorised for this artifact yet." So, for **each** connected
connector prefix, call each of the ten read tools at least once before creating the artifact:

> **`list_accounts` is new in 1.0.3 and it is not optional.** `list_licenses` now requires an
> `accountUuid` on every Revizto region, so the Blueprint discovers licences by calling `list_accounts`
> first and then one scoped `list_licenses` per available account. If `list_accounts` is missing from the
> allowlist the Blueprint finds **no licences at all** and every server reports as unauthorised. A 1.0.2
> install skill will produce exactly that failure against a 1.0.3 build.

1. `mcp__<prefix>__list_accounts` → the entry point. Take the `uuid` of an account whose `mcpStatus`
   is `"available"`.
2. `mcp__<prefix>__list_licenses` with that `accountUuid` → confirm a licence is returned. Take a
   `licenseUuid` from the result.
3. `mcp__<prefix>__list_license_members` and `mcp__<prefix>__list_projects` (both with that
   `licenseUuid`) → take a `projectUuid` from the result.
4. With that `projectUuid`, call `list_project_members`, `list_workflows`, `list_issues`,
   `list_sheets`, `list_clash_tests`, `list_stamp_templates`.

If any call returns empty or errors for lack of data, that's fine — it still counts as "called this
session," which is all the allowlist binding needs. The goal is simply that every one of the ten tools
has been invoked once so it can be declared. (Repeat per connector prefix if the user has more than one region.)

**5 — Register the artifact from the copied file.**

*Path A — the Artifact tool.*

1. **Re-install or first install?** List the user's artifacts (`action: "list"`). If one titled
   **Revizto Project Intelligence Blueprint** exists, this is a re-install: read it (`action: "read"` with
   its `url`; the tool requires that before an update) and publish to that same `url`, so the user keeps
   their link. Otherwise publish a new artifact.
2. **The Artifact tool asks you to read a file you did not write before publishing it.** Read
   `pi-blueprint.html` in parts (the Read tool with `offset` and `limit`). It is large: some lines are the
   embedded Geist fonts as base64. The sha256 check in step 2 proves these are the released bytes, and step 3
   is your one edit.
3. **Publish** with:
   - `file_path`: `pi-blueprint.html` in your outputs folder, by the path the Artifact tool uses (the file
     from steps 2–3 — **not** any newly authored file);
   - `url`: only on a re-install;
   - `icon`: `chart` on a first publish;
   - `description`: "Revizto project intelligence: live issues, clashes, health and actions for your Revizto projects.";
   - `capabilities`:
     `{"mcp": {"servers": [{"server": "<connector display name>", "tools": [<.tools.read that exist in this session>, <.tools.write that exist>]}]}, "sample": {}}`
     — one `servers` entry per connector, its `server` exactly the name you wrote into the connector line.
     `sample` backs the Blueprint's plain-language brief and Ask; the viewer is asked before its first use.
     Not connected: `{"sample": {}}`.

   **Never call `update_issues` during install.** You declare it; only a user-approved write through the
   06 gate, with read-only switched off, ever invokes it. A connector tool the user has set to need
   approval for every use cannot be used by an artifact; reads still work.

*Path B — `create_artifact`.* Call it with:

- `id`: **`revizto-project-intelligence-blueprint`** (reuse this exact id; never invent a new one).
- `html_path`: the path to your copied `./pi-blueprint.html` (the file from steps 2–3 — **not** any newly authored file).
- `mcp_tools`: **REQUIRED — this is the whole point of the install.** List all ten read tools below,
  each fully-qualified with the connector's `mcp__<connector-id>__` prefix (and repeat the set for every
  connected prefix). If you omit `mcp_tools` or pass an empty list, the artifact's allowlist stays empty
  and the dashboard can never read live data — it will show "tools aren't authorised for this artifact."
  **Also include `update_issues`** (per connector prefix) — this build ships `readOnly:false`, so the
  Read-only pill is a live per-session toggle and, when a user switches it off, the count-first +
  name/reason approval pipeline can execute real writes; `update_issues` must be on the allowlist for those
  approved writes to go through. So declare **eleven** tools per prefix: the ten reads **+ `update_issues`**.
  Do **not** include `whoami` ("me/my" in 06 resolves to an explicitly chosen user).

  > **Never call `update_issues` during install.** It is a write. In step 4 you call only the ten *read*
  > tools; you *declare* `update_issues` here without ever invoking it. A real write only ever happens later,
  > when a user toggles read-only off and approves it through the 06 gate.

**6 — Verify you deployed the real thing AND the tools bound (mandatory).**

- Content: the deployed HTML must match `manifest.json` on **bytes** and **sha256** (recheck as in
  step 2 — the only permitted difference from the shipped file is the `CONFIG.connectors` line you
  edited, so recompute the hash on the *pristine* copy, not the edited one; on Path A compare against
  `manifest.json` → `claudeai`). It must also contain the
  six-view chrome (panel ids incl. `panel-issues`, `panel-health`, `panel-compare`, `panel-ask`). A
  dashboard you "built" yourself will be far smaller and will match nothing. If it does not match,
  you regenerated it — discard and redo from step 2 by copying the file.
- Tools, Path A: on first live load the artifact asks the user to allow the Revizto tools, then shows the
  Terms gate → licence picker. "This Revizto MCP connection is no longer registered" straight after
  install usually means the connector line lacks that connector's `name` — redo from step 2.
- Tools, Path B: after the artifact opens, it must reach the Terms gate → licence picker, **not** the
  "tools aren't authorised for this artifact yet" panel. If it shows that panel, the `mcp_tools` did not
  bind — confirm you (a) *called* every tool in `manifest.json` → `.tools.read` in step 4 and
  (b) *declared* all of those **plus** `.tools.write` in step 5,
  then re-create. If it still fails after both, the artifact-creation path on this build is not binding
  the allowlist — report that to Revizto (capture the desktop version).

**7 — Hand off to the user.** Tell them the Blueprint is open; on first live load it shows the Terms
gate (accept to proceed), then a licence picker; it lands on their most-recently-active project. Point
them at the in-product **About · Terms · Tour**.

## Tools to declare (per connected connector prefix)

**Read `assets/manifest.json` and use `.tools.read` and `.tools.write`.** They are generated from the
build's own `ARG_CONTRACT`, so they cannot drift from what the dashboard actually calls. This section
deliberately does not repeat the list: a transcribed list is exactly how the nine-vs-ten failure
happened, and `tests/run.mjs` fails the build if the manifest and the contract ever disagree.

`list_accounts` is the entry point — licence discovery starts there. See the note in step 4.

Plus **`update_issues`** (the 06 Action write tool) — declared so approved writes can execute when the user
toggles read-only off. This build ships `readOnly:false` (the pill is a live per-session toggle; the
Blueprint still opens read-only every session). **Declare `update_issues` but never call it during install
— it is a write; only user-approved writes through the 06 gate ever invoke it.** `whoami` is intentionally
excluded ("me/my" in 06 resolves to an explicitly chosen user).
