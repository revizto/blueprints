# Revizto Project Intelligence Matrix

Clash governance for Revizto, delivered as a Claude Cowork artifact.

Decide which pairs of search sets get clash-tested, and how — clash type, clearance distance, priority
and who moves — then export them as clash tests Revizto imports. Start from your own project's
search-set export (`.vimsst`), or from the bundled **Codifying Coordination v2.0** template and edit it
to make it your own; the original template stays untouched.

Authoring and export work **offline**. With the Revizto MCP connector, **04 Health** also reads how
those clash tests are running in a live project. Live reads are **read-only, always**: this build has
no write path to Revizto.

**Status:** `v1.0.0`. Version history in [CHANGELOG.md](CHANGELOG.md).

> ### Upgrading? Re-run the install skill.
>
> Updating the plugin does **not** update a Matrix you have already deployed — the artifact still
> contains the code it was built from. Re-run the `project-intelligence-matrix` skill (Step 5). Saved
> matrices live in browser storage for the artifact; export the clash tests you need before
> re-installing, in case they do not carry over.

---

# Install

Five steps, per-user, **no Claude admin required**. If you only want the offline features, skip Step 2.

### Prerequisites

- **Claude desktop app with Cowork.** The Matrix runs as a Cowork artifact — not in a plain chat.
- **For live data only:** a Revizto licence the MCP Server accepts. Three things must all be true: the
  Revizto MCP Server app is activated on the organisation account, your licence role is Administrator or
  Owner, and that account is authorised for your connector.
- **(Team/Enterprise only, live data)** your Claude admin allows the Revizto MCP connector domain(s) under
  **Admin settings → Capabilities**.

### Step 1 — Run this task on your computer, not the cloud 🔴

A Claude task runs either on your computer or in the cloud. Live reads need two gates open: the connector
must be signed in (Step 2), *and* the artifact's own tool allowlist must authorise the tools. Only the
install skill fills that second gate, and only when it runs **locally**.

Use the run-location control at the top-right of the Claude window → **"On your computer"** (the header
then shows a laptop icon, not a cloud icon). To make it the default: **Settings → Cowork → turn off "Run
new tasks in the cloud."**

### Step 2 — Connect the Revizto MCP connector (optional — live data)

Skip this step if you only want to author and export clash tests.

Add the **Revizto MCP** connector for your region as a custom connector under **Customize → Connectors**,
then sign in with your Revizto account and approve the tool access it requests. One connector per region.
If your organisation manages your Claude account, an owner must add the connector once from
**Organization settings → Connectors** before members can add it.

| Field | Value |
|---|---|
| Type / transport | Streamable HTTP (remote MCP server) |
| URL | `https://api.<region>.revizto.com/mcp` |
| OAuth Client ID | `revizto-mcp` |
| OAuth Client Secret | leave blank |

Regions: `virginia` (North America), `canada`, `ireland` (Europe), `london` (UK), `frankfurt` (UAE,
hosted in Germany), `saopaulo` (South America), `singapore` (SE Asia), `sydney` (ANZ), `tokyo` (Japan),
`ksa` (KSA Premium), `zurich` (Switzerland).

> **If you belong to several Revizto organisation accounts**, one connector sign-in authorises only the
> accounts covered by that sign-in. Authorise the rest from Revizto Workspace → your profile → **Active
> sessions → API**.

If you already added this connector for the Revizto Project Intelligence Blueprint, the same connector
serves the Matrix — do not add a second one.

### Step 3 — Install the plugin

**Add the marketplace by URL.** In Claude: **Directory → Plugins → Personal → +** → `revizto/blueprints`
→ turn **"Sync automatically" off** → **Sync** → install **revizto-project-intelligence-matrix**.

The install detail should list **1 skill** at version **1.0.0**.

> **Upgrading?** Remove the old entry before installing the new one, or Claude keeps serving the cached
> version.

### Step 4 — Enable the plugin's skill 🔴

**Installing the plugin does not enable its skill.** Under **Directory → Skills**, switch on
**`project-intelligence-matrix`** — this is the install action. Confirm with *"list your available
skills"* before continuing.

### Step 5 — Open the Matrix

In a Cowork session running on your computer, say:

> Open the Revizto Project Intelligence Matrix — follow the `project-intelligence-matrix` skill.

It copies the bundled Matrix, checks it against its manifest, and — if you connected Revizto in Step 2 —
calls your Revizto read tools once and registers the artifact with them authorised.

If Claude starts *designing* a matrix instead, the skill is not enabled — go back to Step 4.

### Verify

- The Matrix opens on **Start here**, offering your search-set export or the Codifying Coordination v2.0
  template.
- **About** reads version **1.0.0**.
- **Live data (if connected):** open **04 Health** and read a project. The **Terms** gate appears at that
  first read — not when the Matrix opens. Accept it, and the read runs.

### Troubleshooting

| Symptom | Fix |
|---|---|
| "The Matrix’s tools aren’t authorised for this artifact yet" | You ran the install **in the cloud**, or before connecting Revizto. Re-run the skill on your computer (Step 1) with the connector signed in. |
| Asking Claude to open the Matrix does nothing, or it starts **designing** one | The `project-intelligence-matrix` skill is not enabled (Step 4). It should copy a file, never author one. |
| The install skill stops with "manifest.json is unfilled" or "does not match the manifest" | The package is incomplete or was altered. Remove the plugin, re-sync the marketplace and install again. Do not deploy the file by hand. |
| Marketplace add fails: `github_repo_not_accessible`, or a prompt about the Claude GitHub App | "Sync automatically" was left **on**. Remove the entry and re-add with it off (Step 3). |
| Adding the marketplace says it needs **admin** | You are on the **Organization** tab. Use **Personal** — per-user, no admin. |
| Plugin stuck on an old version after reinstall | Cache. Quit Claude, then `chflags -R nouchg ~/.claude/plugins 2>/dev/null; rm -rf ~/.claude/plugins/cache ~/.claude/plugins/marketplaces/revizto`, reopen and re-add. On Windows: `%USERPROFILE%\.claude\plugins\`. |
| A licence is not readable | Check the three conditions under Prerequisites. "This account isn't authorised for MCP yet" is fixed under Step 2. |
| Connector fails, or shows "no longer registered" | Re-add it with client ID `revizto-mcp` and a blank secret (Step 2), then re-run the skill — re-adding mints a new connector id and the artifact is bound to the old one. |
| A "Choose a file" button does nothing | Cowork does not let artifacts open file dialogs. Drag the file onto the drop zone instead. |

Every live call inherits your own Revizto role and project membership — the Matrix cannot see anything you
cannot see in Revizto itself.

---

# Reference

## The four views

| View | What it does |
|---|---|
| 01 Import | Bring in your project's search-set export (`.vimsst`), or start from the Codifying Coordination v2.0 template. |
| 02 Matrix | Explore the matrix: which pairs of search sets are clash-tested, and the clash tests they become. |
| 03 Clash Test Editor | Tune each clash test — type, distance, priority, who moves — in bulk or row by row, with undo. Export the clash tests (`.vimctst`) for Revizto to import. |
| 04 Health | Coverage and setup checks against your matrix. When connected, how the clash tests are running in a live project. |

## Your data

- **Stays on this device.** Matrices you import or edit are saved in your browser's storage for this
  artifact. Nothing is uploaded.
- **Live reads are read-only and consented.** No Revizto call is made until you accept the Terms at the
  first live read, recorded on-device, per connection.
- **Exported clash tests bind to your project's search sets by ID**, so export reads your project's
  search-set export first (Export, step 1).

Tools declared at install, per connector: read from `skills/project-intelligence-matrix/assets/manifest.json`
→ `tools.read`. All are reads; none writes.

## Org-wide rollout

Per-user installs need no admin. To push the Matrix to an entire organisation, a Team/Enterprise Owner
uses **Organization settings → Plugins**, with Cowork and Skills enabled for the org first. See
[Manage plugins for your organization](https://support.claude.com/en/articles/13837433-manage-plugins-for-your-organization).

## Plugin layout

This plugin lives in `plugins/revizto-pi-matrix/` of the [Revizto Blueprints](../../README.md) repository.

```
.claude-plugin/plugin.json             plugin manifest
skills/
  project-intelligence-matrix/         install action
    assets/matrix.html                 the Matrix (single self-contained file)
    assets/manifest.json               size, checksums, version, tools — written at release
tools/verify.mjs                       repository gates (asset, public-safe, read-only, version, licence; --selftest)
CHANGELOG.md · CONNECTORS.md · SKILLS-MANIFEST.md · LICENSE.md
```

## Licence

See [LICENSE.md](LICENSE.md).
