# Revizto Project Intelligence Blueprint

Live project intelligence over the **Revizto MCP Server**, delivered as a Claude artifact.

It follows one explicit path: **MCP Server → Licence → Project.** Each Revizto MCP server you connect is
its own connection, named as you named it in Claude. You choose which server the Blueprint reads from,
and every licence and project you see comes from that one server — nothing is merged across servers and
nothing is guessed on your behalf.

Headline totals are exact, taken from Revizto's own counts. Detailed panels are drawn from a sample and
always labelled "N of M". Nothing is cached or bundled: every figure is read live, and where there is
nothing to read the Blueprint says so rather than showing anything else.

The Blueprint **opens read-only every session**. Read-only is a toggle you control — switch it off and
the write surface becomes available, so you can push reassignments, status changes and more into your
Revizto project. Every write runs count-first targeting, a diff preview, and an explicit approval step.

**Status:** `v1.0.5` (build `2026-11-23.1`). Version history in [CHANGELOG.md](CHANGELOG.md).

> ### Upgrading? Re-run the install skill.
>
> Updating the plugin does **not** update a Blueprint you have already deployed — the artifact still
> contains the code it was built from. Re-run the `project-intelligence-dashboard` skill (Step 5).
>
> **1.0.4 is a required upgrade.** 1.0.3 sends an argument the Revizto MCP refuses, so every read
> fails and every connection reports *"Connected · licences not readable"* — a healthy connector
> described as broken. A 1.0.3 artifact carries that defect and cannot be repaired in place; it must be
> redeployed by re-running the skill.
>
> The tool authorisations are unchanged from 1.0.3 (`list_accounts` for licence discovery and
> `update_issues` for the write surface), so you will be asked to approve the same set.

---

# Install

Five steps, per-user, **no Claude admin required**.

### Prerequisites

- **Claude with artifacts switched on.** The Blueprint installs as an artifact. Artifacts need **Settings →
  Capabilities → "Create and edit files"** (on Team and Enterprise an owner sets it).
- **A Revizto licence the MCP Server accepts.** Three things must all be true: the Revizto MCP Server app
  is activated on the organisation account, your licence role is Administrator or Owner, and that account
  is authorised for your connector. The Blueprint verifies each licence with a real call and tells you
  which one is missing.
- **(Team/Enterprise only) Admin network allowlist** — your Claude admin allows the Revizto MCP connector
  domain(s) and `cdn.jsdelivr.net` under **Admin settings → Capabilities**.

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

Add the **Revizto MCP** connector for your region as a custom connector under **Customize → Connectors**,
then sign in with your Revizto account and approve the tool access it requests. One connector per region;
most customers use one. If your organisation manages your Claude account, an owner must add the connector
once from **Organization settings → Connectors** before members can add it.

| Field | Value |
|---|---|
| Type / transport | Streamable HTTP (remote MCP server) |
| URL | `https://api.<region>.revizto.com/mcp` |
| OAuth Client ID | `revizto-mcp` |
| OAuth Client Secret | leave blank |

Regions: `virginia` (North America), `canada`, `ireland` (Europe), `london` (UK), `frankfurt` (UAE, hosted
in Germany), `saopaulo` (South America), `singapore` (SE Asia), `sydney` (ANZ), `tokyo` (Japan), `ksa`
(KSA Premium), `zurich` (Switzerland).

> **If you belong to several Revizto organisation accounts**, one connector sign-in authorises only the
> accounts covered by that sign-in. Authorise the rest from Revizto Workspace → your profile →
> **Active sessions → API**. This is the most common reason a licence shows as unreadable. The Blueprint
> lists every account it could not use, with Revizto's own explanation against each.

Confirm before continuing — ask Claude: *"Check my Revizto MCP connection. Which Revizto account and
region can you access?"*

### Step 3 — Install the plugin

**Add the marketplace by URL.** **+** → `revizto/blueprints` → turn **"Sync automatically" off** →
**Sync** → install **revizto-project-intelligence**. The same marketplace also lists the Revizto Project
Intelligence Matrix; install it too if you want it — each installs on its own.

**Or upload the package.** If you were supplied `revizto-project-intelligence-v1.0.5.plugin` (also
attached to the GitHub release), use **Directory → Plugins → Personal → Local uploads**. No repository
access needed.

Either way the install detail should list **3 skills** at version **1.0.5**.

> **Upgrading?** Remove the old entry before installing the new one, or Claude keeps serving the cached
> version. **Added the marketplace before the rename?**
> It was previously published as `revizto/project-intelligence-blueprint`; remove that marketplace and add
> `revizto/blueprints` instead: the repository was renamed and this plugin now lives in
> `mcp-blueprints/revizto-project-intelligence/`.

### Step 4 — Enable the plugin's skills 🔴

**Installing the plugin does not enable its skills.** They arrive switched off, and the install action is
one of them — so skipping this step means asking Claude to open the Blueprint does nothing.

Under **Directory → Skills**, switch on:

- **`project-intelligence-dashboard`** — required. This is the install action.
- `skill-aeco-innovation-revizto` — optional, Revizto platform knowledge.
- `skill-aeco-innovation-revizto-api` — optional, Revizto API and MCP reference.

Confirm with *"list your available skills"* before continuing.

### Step 5 — Open the Blueprint

In a Claude task, say:

> Open the Revizto Project Intelligence Blueprint — follow the `project-intelligence-dashboard` skill.

It copies the bundled dashboard, checks it against its manifest and publishes it as an artifact. With the
Artifact tool it makes no Revizto calls: allow the Revizto tools when the artifact asks. (On the Cowork
live-artifact path it calls your Revizto tools and registers the artifact with those tools authorised.)
Then accept the **Terms**, choose your **MCP Server**, and pick your **Licence**.

If Claude starts *designing* a dashboard instead, the skill is not enabled — go back to Step 4.

### Verify

- The status pill reads **live**.
- The **MCP Server** control names the server you are reading from. Each row shows its licence count, and
  any accounts it could not use are summarised on one line you can expand.
- The **Licence** picker groups licences into **Readable**, **Checking…** and **Not readable**, with a
  reason against every unreadable one.
- The project picker lists live projects only; archived and frozen work appears under **Include
  archived**, tagged when it does.
- **06 Action anything shows a padlock on first load.** Correct — toggle the **Read-only** pill off to
  enable writes.
- About / footer reads build **`2026-11-23.1`**.

### Troubleshooting

| Symptom | Fix |
|---|---|
| "This copy of the Blueprint cannot reach the Revizto connectors from this view" | The request was declined, or the connector is not connected for you. Allow them from the artifact's Permissions menu, or reconnect (Step 2). |
| "This Revizto MCP connection is no longer registered" | The connector was renamed, re-added or rebuilt since the install, or the install did not record its name. Re-run the skill (Step 5). A connector added by id inside the Blueprint cannot be reached from a claude.ai artifact. |
| "This Revizto connector isn’t connected for you" | Connect it in Claude (Settings → Connectors), allow it when the artifact asks, then Reload. |
| "Tools aren't authorised for this artifact" / "Licence not accessible" / no projects | Cowork live-artifact installs only: you ran the install **in the cloud**. Re-run it on your computer (Step 1). This is the usual cause. |
| An approved 06 Action write fails | A connector tool you set to need approval for every use cannot be used by an artifact. Allow `update_issues` for the connector, or keep the Blueprint read-only. |
| Asking Claude to open the Blueprint does nothing, or it starts **designing** one | The `project-intelligence-dashboard` skill is not enabled (Step 4). It should copy a file, never author one. |
| Build stamp older than `2026-11-23.1` | The deployed artifact predates the plugin update. Re-run the skill (Step 5). |
| Marketplace add fails: `github_repo_not_accessible`, or a prompt about the Claude GitHub App | "Sync automatically" was left **on**. Remove the entry and re-add with it off (Step 3). |
| Adding the marketplace says it needs **admin** | You are on the **Organization** tab. Use **Personal** — per-user, no admin. |
| Plugin stuck on an old version after reinstall | Cache. Quit Claude, then `chflags -R nouchg ~/.claude/plugins 2>/dev/null; rm -rf ~/.claude/plugins/cache ~/.claude/plugins/marketplaces/revizto`, reopen and re-add. On Windows: `%USERPROFILE%\.claude\plugins\`. |
| A licence sits under **Not readable** | Read the stated reason. A role problem needs Administrator or Owner. "This account isn't authorised for MCP yet" is fixed under Step 2. "Lives on a different regional server" means switch server in the MCP Server panel. Unreadable licences stay listed deliberately, so you can see the whole estate. |
| Licence picker empty, or a licence missing | Check the **MCP Server** panel first — the licence may live on another server, or its account may be one of the unavailable ones listed against that server. |
| A server lists accounts it could not use | Expand the line for Revizto's explanation per account. Usually the Revizto MCP Server app is not activated on that account (an owner or admin does this under **Manage account info → Developer portal**), or the account is not covered by your connector sign-in (Step 2). |
| A project you expect isn't listed | It is archived or frozen — turn on **Include archived**. |
| Connector fails, or shows "no longer registered" | Re-add it with client ID `revizto-mcp` and a blank secret (Step 2), then re-run the skill — re-adding mints a new connector id and the artifact's allowlist is bound to the old one. As a stopgap you can paste the new id into the **Add** box in the MCP Server panel and press **Re-check**, but only a re-run restores the allowlist. |
| Blank charts, no error (Team/Enterprise) | A connector domain or `cdn.jsdelivr.net` is not allowlisted — ask your Claude admin. |
| Opened the HTML file directly and it shows only a connect prompt | Expected. The Blueprint has no bundled or sample data; outside Cowork there is nothing to read. |

Every call inherits your own Revizto role and project membership — the Blueprint cannot see or do
anything you cannot do in Revizto itself.

---

# Reference

## The six views

`01 Morning brief` · `02 Project checklist` · `03 Cross-project intelligence` · `04 Coordination
analytics` · `05 Ask anything` · `06 Action anything` — the write surface, disabled while read-only is on.

## Configuration

One `CONFIG` object at the top of `dashboard.html`:

| Constant | Ships as | Meaning |
|---|---|---|
| `connectors` | `[]` | One entry per connected region, `{prefix, env, wsHost, missing}`. The install skill fills this with your own `mcp__<connector-id>__` prefixes; connections can also be added at runtime from the MCP Server panel. |
| `readOnly` | `false` | The Read-only pill is a live per-session toggle. The Blueprint opens read-only regardless; this constant only controls whether the toggle can be turned off. Set `true` to hard-lock read-only and disable writes entirely. |
| `tcsVersion` | `"2.0"` | Terms version (Revizto Open-Source Repository Terms 2.0). Bumping it re-prompts acceptance on every connection. |
| `buildStamp` | `"2026-11-23.1"` | Shown in About and the Terms footer, for support. |

## Trust posture

- **Nothing is skipped silently.** Accounts the MCP cannot use, and accounts that accept the request then
  refuse the read, are both listed against their server in Revizto's own wording.
- **Live, never cached.** Cache-busted reads, per-call timeouts, honest failure states, and a full reset
  on every licence, project or server switch. No bundled, sample or demonstration data exists in the build.
- **Your session, your permissions.** All calls run through your own authenticated MCP session. `whoami`
  is never declared.
- **Consent precedes access.** No live data until Terms are accepted, recorded on-device, per connection.
- **AI answers (05 Ask)** send only the derived figures needed; project data is not stored server-side.

Tool allowlist, per connector: `list_accounts, list_licenses, list_license_members, list_projects,
list_project_members, list_workflows, list_issues, list_sheets, list_clash_tests, list_stamp_templates`
plus `update_issues`, which is only ever invoked by a write you have approved.

## Org-wide rollout

Per-user installs need no admin. To push the Blueprint to an entire organisation, a Team/Enterprise Owner
uses **Organization settings → Plugins**, with Cowork and Skills enabled for the org first. See
[Manage plugins for your organization](https://support.claude.com/en/articles/13837433-manage-plugins-for-your-organization).

## Repository layout

This plugin lives in `mcp-blueprints/revizto-project-intelligence/` of the
[Revizto Blueprints](../../README.md) repository. The marketplace file is at the repository root.

```
.claude-plugin/plugin.json           plugin manifest
skills/
  project-intelligence-dashboard/    install action + assets/dashboard.html (Cowork live artifacts)
                                     + assets/dashboard-claudeai.html (Claude's Artifact tool; derived by
                                       tools/claudeai/port.mjs at the repository root) + assets/manifest.json
  skill-aeco-innovation-revizto/       Revizto platform knowledge
  skill-aeco-innovation-revizto-api/   Revizto API / MCP reference
tools/ · tests/ · package.json       build and verification gates (see RELEASING.md)
CHANGELOG.md · CONNECTORS.md · SKILLS-MANIFEST.md · LICENSE · NOTICE · TERMS.md · OFL.txt
```

## Licence and terms

This item is licensed under the [Apache License, Version 2.0](LICENSE), except for Revizto's names, logos,
trademarks, service marks and other brand assets (the Excluded Materials, Section 5 of the Terms) and the
third-party components listed in [NOTICE](NOTICE), which keep their own licences. Its use is subject to the
[Revizto Open-Source Repository Terms and Conditions, Version 2.0 — 13 November 2026](TERMS.md).

The Blueprint embeds the Geist and Geist Mono typefaces (Copyright 2024 The Geist Project Authors), used
under the SIL Open Font License 1.1 — see [OFL.txt](OFL.txt). It loads Chart.js 4.5.0 (MIT) from
`cdn.jsdelivr.net` at run time.
