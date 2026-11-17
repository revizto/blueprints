# Changelog — repository

Repository-level changes: layout, licence, additions and removals. Each item keeps its own changelog in its
folder — [Blueprint](mcp-blueprints/revizto-project-intelligence/CHANGELOG.md) ·
[Matrix](plugins/revizto-pi-matrix/CHANGELOG.md).

## Unreleased — Revizto Blueprints layout, and the Project Intelligence Matrix 1.0.0

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
