# Revizto Blueprints

Blueprints, Claude plugins and tools for working with Revizto, published by Revizto as a head start for
customers and partners building their own solutions. Licensed under the [Apache License 2.0](LICENSE) and
subject to the [Revizto Open-Source Repository Terms and Conditions](TERMS.md) — read both before you take a copy.

## What's here

| Item | Version | What it does | Revizto MCP connector |
|---|---|---|---|
| [Revizto Project Intelligence Blueprint](mcp-blueprints/revizto-project-intelligence/) | `1.0.5` | Live project intelligence: a six-view Cowork dashboard over your Revizto licences and projects, plus curated Revizto platform skills. Opens read-only every session; approved writes when you allow them. | Required |
| [Revizto Project Intelligence Matrix](plugins/revizto-pi-matrix/) | `1.0.1` | Clash governance: build clash tests from your project's search sets or the Codifying Coordination v2.0 template and export them for Revizto to import. Live clash data in 04 Health, read-only. | Optional |
| [Converters](plugins/converters/) | — | Reserved for Revizto ↔ JSON converters. Nothing published yet. | — |

Each plugin installs on its own. Install one or both.

---

# Install

Five steps, per user, **no Claude admin required**. Both plugins come from the same marketplace; each
step says where they differ. Each plugin's own README has the full detail, verification and
troubleshooting: [Blueprint](mcp-blueprints/revizto-project-intelligence/README.md) ·
[Matrix](plugins/revizto-pi-matrix/README.md).

### Prerequisites

- **Claude with artifacts switched on.** Both plugins install as artifacts. Artifacts need **Settings →
  Capabilities → "Create and edit files"** (on Team and Enterprise an owner sets it).
- **For live Revizto data** (always for the Blueprint; optional for the Matrix): a Revizto licence the
  MCP Server accepts. Three things must all be true: the **Revizto MCP Server** app is activated on the
  organisation account, your licence role is **Administrator or Owner**, and that account is authorised
  for your connector.
- **(Team/Enterprise only)** your Claude admin allows the Revizto MCP connector domain(s) — and, for the
  Blueprint, `cdn.jsdelivr.net` — under **Admin settings → Capabilities**.

### Step 1 — Check how your Claude creates artifacts

Most Claude accounts now create artifacts with Claude's built-in **Artifact** tool, and the install skills
use it. The task can then run anywhere, and the first time a plugin reads live data the artifact asks you
to **allow its Revizto tools**. Nothing to do in this step.

**Only if your organisation still uses Cowork live artifacts** (organisations on customer-managed encryption
keys, zero data retention or a HIPAA-ready setup): reading live data then needs the artifact's own tool
allowlist, which only the install skill fills, and only when it runs **locally** — in a cloud session the
artifact opens but cannot read Revizto. Use the run-location control at the top-right of the Claude
window → **"On your computer"** (the header then shows a laptop icon). To make it the default:
**Settings → Cowork → turn off "Run new tasks in the cloud."** The skill tells you which way it is
installing.

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
| Blueprint | **revizto-project-intelligence** | 3 skills at version 1.0.5 |
| Matrix | **revizto-project-intelligence-matrix** | 1 skill at version 1.0.1 |

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

In a Claude task, say:

- *Open the Revizto Project Intelligence Blueprint — follow the `project-intelligence-dashboard` skill.*
- *Open the Revizto Project Intelligence Matrix — follow the `project-intelligence-matrix` skill.*

Each skill copies its bundled file, checks it against its manifest and publishes it as an artifact. With
the Artifact tool it makes no Revizto calls: the artifact asks you to allow its Revizto tools the first time
it reads live data. On the Cowork live-artifact path it calls your Revizto read tools once (when a connector
is connected) and registers the artifact with them authorised. If Claude starts *designing* a dashboard or matrix instead,
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

Unless an item's own documentation says otherwise, the content of this repository is licensed under the
[Apache License, Version 2.0](LICENSE), except for Revizto's names, logos, trademarks, service marks and other
brand assets (the Excluded Materials, Section 5 of the Terms) and the third-party components listed in
[NOTICE](NOTICE), which keep their own licences. Use of the
repository content is also subject to the
[Revizto Open-Source Repository Terms and Conditions, Version 2.0 — 13 November 2026](TERMS.md). [NOTICE](NOTICE)
lists the copyright holder and the third-party components. Each plugin folder carries identical copies of
`LICENSE`, `NOTICE` and `TERMS.md`, because Claude installs a plugin from its own folder.

**History.** Until this change the repository was published under the Revizto Custom Licence
(`LICENSE.md`), and before that under the MIT License.

**Contributing.** Contributions are welcome by pull request; Section 12 of the Terms covers how they are
licensed. The repository accepts signed-off commits only (`git commit -s`).

## History

This repository was previously published as `revizto/project-intelligence-blueprint`.
