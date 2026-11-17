---
name: project-intelligence-matrix
description: >
  This skill should be used when the user wants to "open the Revizto Matrix",
  "open the Project Intelligence Matrix", "set up clash governance", "open the clash
  matrix", "build clash tests from my search sets", or just installed the Revizto
  Project Intelligence Matrix plugin and needs the Matrix created. It deploys the
  pre-built Project Intelligence Matrix (a fixed, self-contained HTML file bundled
  with this plugin) as a Cowork artifact, optionally pointed at the installing
  user's own Revizto MCP connectors for live, read-only clash data.
metadata:
  version: "1.0.0"
---

# Project Intelligence Matrix — install action

Deploy the **pre-built** Revizto Project Intelligence Matrix as a Cowork artifact.

## 🚫 CRITICAL — deploy the bundled file verbatim. Do NOT build a matrix.

The Matrix is a **finished, approved artifact**: a single self-contained HTML file
(`assets/matrix.html`) that ships inside this plugin. Your entire job is to **copy that exact file**
and **replace one marker with the user's connector prefixes**, then register it as an artifact.

Its size, checksums, version, build stamp and tool list all live in `assets/manifest.json`,
generated from the file itself when the release was packaged. **Never type any of those values into
this document.** A transcribed number goes stale at the next release, and a guard that fails on a
correct file teaches installers to ignore it. Read the manifest.

You must **NOT**, under any circumstances:

- author, write, generate, re-create, "rebuild", redesign or improve a matrix, a dashboard or any part of this file;
- summarise the file and reproduce it from memory;
- change its layout, styles, scripts, views or any HTML/JS other than the single connector marker described in step 3.

If you find yourself *writing HTML, CSS or JavaScript*, stop — you are doing the wrong thing. The
correct action is a **byte-for-byte file copy** plus one small edit. A regenerated matrix is an
automatic failure.

## ⚠️ Prerequisite — run this install in a LOCAL (on-your-computer) session, not a cloud session

The read tools are authorised for the Matrix artifact only when `create_artifact` runs **locally on the
user's computer**. In a **cloud** Cowork session the artifact is registered through the cloud→desktop
bridge, which **cannot bind the `mcp_tools` allowlist** — the Matrix still opens and every offline
feature works, but live reads fail with "The Matrix’s tools aren’t authorised for this artifact yet".

Before you start: confirm the session is running **on this computer** (local), not in the cloud. In the
Claude app the header shows a **cloud icon** for cloud sessions and a **computer/laptop icon** for local
ones. To switch: use the **run-location control at the top-right of the window** and choose **"On your
computer"** (or set the default under **Settings → Cowork → turn OFF "Run new tasks in the cloud"**). If
this is a cloud session, tell the user to switch and re-run.

## What this artifact is

A clash-governance workspace. The user imports their project's search-set export (`.vimsst`) or starts
from the bundled **Codifying Coordination v2.0** template, decides which pairs of search sets are
clash-tested and how, and exports clash tests (`.vimctst`) that Revizto imports. All of that works
**offline**. With a Revizto MCP connector, the **04 Health** view also reads how those clash tests are
running in a live project — read-only, always: this build cannot write to Revizto.

## Steps

**1 — Check for a Revizto MCP connector (optional for this artifact).** Look for a
`mcp__<id>__list_licenses` tool in this session.

- **None connected:** the Matrix is still fully usable offline. Tell the user that live clash data in
  04 Health needs the **Revizto MCP** connector for their region (**Customize → Connectors**), ask whether
  they want to add it first, and if they don't, continue — skip steps 3 and 4 and deploy with no
  `mcp_tools` (step 5).
- **Connected:** continue with every step.

The connector is a custom/remote MCP server: transport **Streamable HTTP**, URL
`https://api.<region>.revizto.com/mcp`, **OAuth Client ID `revizto-mcp`**, client secret **blank**.

Two Revizto-side conditions are easy to miss, and both surface later as "unreadable licence" rather than
as a connection error, so mention them if licences come back blocked:

- The **Revizto MCP Server** app must be activated on the organisation account (owner/admin:
  Manage account info → Developer portal).
- Each organisation account must be **authorised for that connector**. One sign-in only covers accounts on
  the authentication method used at the time; the rest are authorised from Revizto Workspace → profile →
  **Active sessions → API**.

If the user's connector was created before 30 July 2026, it used the previous OAuth client ID and no
longer authorises — it must be removed and re-added with `revizto-mcp`. Re-adding mints a **new connector
id**, so a previously deployed Matrix is bound to an id that no longer exists. Re-run this skill; do not
try to repair the old artifact in place.

**2 — Copy the bundled Matrix verbatim and check it against the manifest.** Do not open it to reproduce
it — copy it:

First resolve the plugin's own folder. Claude normally sets `$CLAUDE_PLUGIN_ROOT`, and it always wins; if
it is empty, find the plugin folder — the one containing `.claude-plugin/plugin.json` whose `name` is
`revizto-project-intelligence-matrix` —
and set `PR` to it yourself (`PR=/path/to/that/folder`) before running the block. Every path below reads from `PR`, so there is one code path either way.

```bash
PR="${CLAUDE_PLUGIN_ROOT:-${PR:-}}"
if [ -z "$PR" ]; then
  echo "STOP: CLAUDE_PLUGIN_ROOT is not set. Set PR to the folder containing this plugin's .claude-plugin/plugin.json, then re-run this block."
  exit 1
fi
[ -f "$PR/.claude-plugin/plugin.json" ] && [ -f "$PR/skills/project-intelligence-matrix/assets/matrix.html" ] \
  || { echo "STOP: $PR is not the Matrix plugin folder."; exit 1; }
A="$PR/skills/project-intelligence-matrix/assets"
cp "$A/matrix.html" ./pi-matrix.pristine.html     # never edited: the reference for step 6
cp "$A/matrix.html" ./pi-matrix.html              # the copy you edit in step 3
python3 - "$A/manifest.json" ./pi-matrix.pristine.html "$PR/.claude-plugin/plugin.json" <<'PY'
import hashlib, json, re, sys
m = json.load(open(sys.argv[1])); b = open(sys.argv[2], "rb").read()
v = json.load(open(sys.argv[3]))["version"]
assert m.get("md5"), "STOP: manifest.json is unfilled - this package was never released. Do not deploy."
assert m.get("version") == v, f"STOP: manifest is version {m.get('version')}, plugin is {v}. Do not deploy."
got = hashlib.sha256(b).hexdigest()
print("bytes", len(b), "want", m["size"], "| sha256", got[:12], "want", m["sha256"][:12])
assert len(b) == m["size"] and got == m["sha256"], "STOP: the copy does not match the manifest. Do not deploy it."
assert m.get("anchorCount") == 1 and b.decode().count(m["anchor"]) == 1, "STOP: install marker missing or repeated."
rd, wr = m["tools"]["read"], m["tools"]["write"]
assert rd and wr == [] and all(re.match(r"^(list|get)_", t) for t in rd), "STOP: manifest declares a non-read tool."
print("OK - Matrix", m["version"], "build", m["stamp"], "| read tools:", ", ".join(rd))
PY
```

If either assertion fails, **stop and say so**. An unfilled manifest means the package did not pass its
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
Revizto region, add one entry, in install order, so the line becomes:

```js
const CONNECTORS=[{prefix:"mcp__<connector-id>__",env:"prod",origin:"current"}];
```

(Two regions: two entries separated by a comma. The first entry is the one the Matrix selects first.)
Replace the marker comment itself — it must not remain in the file. Use a single targeted find-and-replace
on that one line and **touch nothing else**: no reformatting, no other edits. Read the real prefix; never
guess it. If no connector is connected, leave the line exactly as shipped.

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

**4 — Call every read tool in `manifest.json` once in this session (mandatory when connected — this is
what makes the allowlist bind).**

**Tell the user first, and get their go-ahead.** Say, in one or two sentences, that to authorise the
Matrix's live reads you will now call each Revizto read tool once through their connector — read-only, for
one account, licence and project — and that this happens at install, before the Matrix's own Terms gate.
If they decline, skip this step and deploy with no `mcp_tools` (the Matrix works offline; they can re-run
the install later).

`manifest.json` → `.tools.read` is the authoritative list. It is extracted from the build's own
declaration when the release is packaged; use it rather than any list written out in prose, here or
anywhere else. `create_artifact` only puts a tool on the artifact's `mcp_tools` allowlist if you
**actually called that tool in this session** — declaring a tool you never called does nothing. So, for
**each** connected prefix, call each tool in `.tools.read` once before creating the artifact, in this
order so each call has the identifiers it needs:

1. `list_accounts` → take the `uuid` of an account whose `mcpStatus` is `"available"`.
2. `list_licenses` with that `accountUuid` → take a `licenseUuid`.
3. `list_projects` with that `licenseUuid` → take a `projectUuid`.
4. With that `projectUuid`, call every remaining tool in `.tools.read`. Tools that need a further
   identifier the earlier calls did not return (for example an issue UUID) may be called with the
   `projectUuid` alone.

If a call returns empty or errors for lack of data or a missing identifier, that is fine — it still counts
as "called this session", which is all the binding needs. If a tool in `.tools.read` **does not exist** in
this session at all (the Matrix declares some tools ahead of the Revizto MCP server shipping them), skip
it and leave it out of `mcp_tools`; the Matrix handles its absence. Repeat per connector prefix.

This build is **read-only**: `manifest.json` → `.tools.write` is empty. **Never call or declare any write
tool** (`update_issues` or anything else) for this artifact.

**5 — Register the artifact from the copied file.** Call `create_artifact` with:

- `id`: **`revizto-project-intelligence-matrix`** (reuse this exact id; never invent a new one).
- `html_path`: the path to your copied `./pi-matrix.html` (the file from steps 2–3 — **not** any newly authored file).
- `mcp_tools`: when connected, **required** — every tool you called in step 4, each fully qualified with
  its connector's `mcp__<connector-id>__` prefix, repeated per connected prefix. If you omit it or pass an
  empty list while connected, live reads can never work. When **no** connector is connected, omit
  `mcp_tools` entirely.

**6 — Verify you deployed the real thing AND the tools bound (mandatory).**

- Content: the only permitted difference from the shipped file is the connector line, which the check at
  the end of step 3 proved against `./pi-matrix.pristine.html` (itself checked against `manifest.json` in
  step 2). Confirm the deployed file is `./pi-matrix.html` and contains the four views (`tab-import`, `tab-matrix`, `tab-reg`, `tab-health`) and no longer contains
  the marker text when connected. A matrix you "built" yourself will be far smaller and will match
  nothing — discard it and redo from step 2.
- Tools (connected installs): open the Matrix, go to **04 Health** and read a project. It must reach the
  Terms gate and then the project read — **not** "The Matrix's tools aren't authorised for this
  artifact". If it shows that message, the allowlist did not bind: confirm you (a) *called* every
  available tool in `.tools.read` in step 4 and (b) *declared* exactly those in step 5, then re-create.
  If it still fails, the artifact-creation path on this build is not binding the allowlist — report that
  to Revizto with the desktop app version.

**7 — Hand off to the user.** Tell them the Matrix is open and lands on **Start here**, with two ways in:
import their project's search-set export (`.vimsst`), or start from the Codifying Coordination v2.0
template. Everything they import or edit stays in their own browser's storage on this device. The Terms
gate appears at the **first live Revizto read**, not at open. Point them at the in-product **About · Tour
· Terms**. Then stop — do not offer to extend or modify the artifact.

## Tools to declare (per connected connector prefix)

**Read `assets/manifest.json` and use `.tools.read`.** This section deliberately does not repeat the
list: a transcribed list is how an earlier Revizto install skill named nine tools against a build that
needed ten, and every install of it failed. `.tools.write` is empty — this build never writes.

## If the user asks for changes

Do not edit the deployed file. A hand edit passes none of the release checks, and the next re-install
silently discards it. Changes come from Revizto in a new release of this plugin.
