# Changelog — repository

Repository-level changes: layout, licence, additions and removals. Each item keeps its own changelog in its
folder — [Blueprint](mcp-blueprints/revizto-project-intelligence/CHANGELOG.md) ·
[Matrix](plugins/revizto-pi-matrix/CHANGELOG.md).

## Unreleased — Apache License 2.0 and the Revizto Open-Source Repository Terms 2.0; Blueprint 1.0.5; Matrix 1.0.1

- **New licensing model.** The repository is licensed under the Apache License, Version 2.0 (`LICENSE`), and
  its use is subject to the **Revizto Open-Source Repository Terms and Conditions, Version 2.0 — 13 November
  2026** (`TERMS.md`). `NOTICE` names the copyright holder (Revizto SA), the Excluded Materials and the
  third-party components. They replace the Revizto Custom Licence (`LICENSE.md`, removed) and the
  Blueprint's own Terms 1.1.
- **Copies per plugin.** Each plugin folder carries byte-identical copies of `LICENSE`, `NOTICE` and `TERMS.md`,
  and `OFL.txt` for the embedded Geist fonts. `plugin.json` declares `Apache-2.0`.
- **Blueprint 1.0.5** and **Matrix 1.0.1** show the new Terms in their acceptance gates, word for word, and
  ask every connection to accept them once (Terms version 2.0). Matrix 1.0.1 also makes drag and drop the
  only way to bring a file in. Re-run each plugin's install skill to update an artifact already created.

## Revizto Blueprints layout, and the Project Intelligence Matrix 1.0.0

The repository becomes **Revizto Blueprints**, a shared home for Revizto MCP blueprints, Claude plugins
and tools, and gains its second plugin.

- **New repository name and address:** `revizto/blueprints` (previously
  `revizto/project-intelligence-blueprint`). Install instructions use the new address; earlier changelog
  entries keep the address that was correct at the time.
- **Two top-level folders.** `mcp-blueprints/` for items that need a live Revizto MCP Server connection
  to do their job; `plugins/` for everything else. The rule is in the [README](README.md).
- **The Project Intelligence Blueprint moved** from the repository root to
  `mcp-blueprints/revizto-project-intelligence/`, by rename, so its history follows it. It is still
  version 1.0.4: its skills, dashboard and manifest are unchanged. Its build and verification gates
  (`tools/`, `tests/`, `package.json`, `RELEASING.md`) moved with it; the version gate now reads the
  Blueprint's own entry from the root marketplace. Its README gives the new install address and corrects
  the build stamp it quotes to the one that ships (`2026-08-28.2`). The plugin name
  (`revizto-project-intelligence`) and marketplace name (`revizto`) are unchanged.
- **Added: the Revizto Project Intelligence Matrix 1.0.0** in `plugins/revizto-pi-matrix/`, with its own
  marketplace entry, install skill and repository gates.
- **One install sequence** in the [README](README.md) covers both plugins.
- **CI** runs each plugin's gates from its own folder.
- **Licence copy per plugin.** Each plugin folder carries a byte-identical copy of the root `LICENSE.md`.
- **`plugins/converters/` reserved** for Revizto ↔ JSON converters. Nothing is published there yet.
