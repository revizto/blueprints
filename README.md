# Revizto Blueprints

Blueprints, Claude plugins and tools for working with Revizto, published by Revizto as a head start for
customers and partners building their own solutions. Read [LICENSE.md](LICENSE.md) before you take a copy.

## What's here

| Item | Version | What it does | Revizto MCP connector |
|---|---|---|---|
| [Revizto Project Intelligence Blueprint](mcp-blueprints/revizto-project-intelligence/) | `1.0.4` | Live project intelligence: a six-view Cowork dashboard over your Revizto licences and projects, plus curated Revizto platform skills. Opens read-only every session; approved writes when you allow them. | Required |
| [Revizto Project Intelligence Matrix](plugins/revizto-pi-matrix/) | `1.0.0` | Clash governance: build clash tests from your project's search sets or the Codifying Coordination v2.0 template and export them for Revizto to import. Live clash data in 04 Health, read-only. | Optional |
| [Converters](plugins/converters/) | — | Reserved for Revizto ↔ JSON converters. Nothing published yet. | — |

Each plugin installs on its own. Install one or both.

---

# Install

Five steps, per user, **no Claude admin required**. Both plugins come from the same marketplace; each
step says where they differ. Each plugin's own README has the full detail, verification and
troubleshooting: [Blueprint](mcp-blueprints/revizto-project-intelligence/README.md) ·
[Matrix](plugins/revizto-pi-matrix/README.md).

### Prerequisites

- **Claude desktop app with Cowork.** Both plugins run as Cowork artifacts — not in a plain chat and not
  on claude.ai.
- **For live Revizto data** (always for the Blueprint; optional for the Matrix): a Revizto licence the
  MCP Server accepts. Three things must all be true: the **Revizto MCP Server** app is activated on the
  organisation account, your licence role is **Administrator or Owner**, and that account is authorised
  for your connector.
- **(Team/Enterprise only)** your Claude admin allows the Revizto MCP connector domain(s) — and, for the
  Blueprint, `cdn.jsdelivr.net` — under **Admin settings → Capabilities**.

### Step 1 — Run the task on your computer, not the cloud 🔴

Reading live data needs two gates open: the connector must be signed in (Step 2), *and* the artifact's own
tool allowlist must authorise the tools. Only the install skill fills that second gate, and only when it
runs **locally** — in a cloud session the artifact opens but cannot read Revizto.

Use the run-location control at the top-right of the Claude window → **"On your computer"** (the header
then shows a laptop icon). To make it the default: **Settings → Cowork → turn off "Run new tasks in the
cloud."**

### Step 2 — Connect the Revizto MCP connector

**Blueprint: required. Matrix: only for live data** — skip this step if you only want the Matrix to
author and export clash tests.

Add the **Revizto MCP** connector for your region as a custom connector under **Customize → Connectors**,
then sign in with your Revizto account and approve the tool access it requests. One connector per region
serves both plugins. If your organisation manages your Claude account, an owner must add the connector once
from **Organization settings → Connectors** before members can add it.

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
> sessions → API**. This is the most common reason a licence shows as unreadable.

Confirm before continuing — ask Claude: *"Check my Revizto MCP connection. Which Revizto account and
region can you access?"*

### Step 3 — Add the marketplace and install

In Claude: **Directory → Plugins → Personal → +** → enter `revizto/blueprints` → turn **"Sync
automatically" OFF** → **Sync**. Then install either or both:

| Plugin | Install | The install detail should list |
|---|---|---|
| Blueprint | **revizto-project-intelligence** | 3 skills at version 1.0.4 |
| Matrix | **revizto-project-intelligence-matrix** | 1 skill at version 1.0.0 |

> **Added this marketplace before the rename?** It was previously published as `revizto/project-intelligence-blueprint`.
> Remove that marketplace and add `revizto/blueprints` instead. The Blueprint now lives in
> `mcp-blueprints/revizto-project-intelligence/`. Remove an old plugin entry before installing the new
> one, or Claude keeps serving the cached version.

### Step 4 — Enable the install skills 🔴

**Installing a plugin does not enable its skills.** They arrive switched off, and the install action is
one of them. Under **Directory → Skills**, switch on:

- Blueprint: **`project-intelligence-dashboard`** — required. Optionally `skill-aeco-innovation-revizto`
  and `skill-aeco-innovation-revizto-api` (Revizto platform and API reference).
- Matrix: **`project-intelligence-matrix`** — required.

Confirm with *"list your available skills"* before continuing.

### Step 5 — Open them

In a Cowork session running on your computer, say:

- *Open the Revizto Project Intelligence Blueprint — follow the `project-intelligence-dashboard` skill.*
- *Open the Revizto Project Intelligence Matrix — follow the `project-intelligence-matrix` skill.*

Each skill copies its bundled file, checks it against its manifest, calls your Revizto read tools once
(when a connector is connected) and registers the artifact with them authorised. If Claude starts *designing* a dashboard or matrix instead,
the skill is not enabled — go back to Step 4.

Then verify each one against its own README:
[Blueprint → Verify](mcp-blueprints/revizto-project-intelligence/README.md#verify) ·
[Matrix → Verify](plugins/revizto-pi-matrix/README.md#verify).

**Upgrading either plugin?** Updating the plugin does not update an artifact you have already opened —
re-run its install skill (Step 5).

---

# Repository

| Folder | What goes here |
|---|---|
| [`mcp-blueprints/`](mcp-blueprints/) | Items that need a live **Revizto MCP Server** connection to do their job. |
| [`plugins/`](plugins/) | Everything else — Claude plugins that work without the MCP server (and may use it optionally), and standalone tools. |

**The rule for a new addition:** if a customer needs a live Revizto MCP Server connection for it to do its
job, it goes in `mcp-blueprints/`; otherwise in `plugins/`. The marketplace file,
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json), says how each plugin installs and can
point into either folder. Standalone tools have no marketplace entry.

Each plugin carries its own changelog, connector notes and a byte-identical copy of the root licence,
because Claude installs a plugin from its own folder. Release tags name the plugin: the Blueprint keeps its
`vX.Y.Z` tags; the Matrix is tagged `matrix-vX.Y.Z`. Repository-level changes are in
[CHANGELOG.md](CHANGELOG.md).

## Licence

[LICENSE.md](LICENSE.md) is the Revizto Custom Licence and governs this repository.

The licence text currently names the Revizto Project Intelligence Blueprint. Broader wording covering every
item in this repository is in preparation.

## History

This repository was previously published as `revizto/project-intelligence-blueprint`.
