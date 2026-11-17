# Plugins and tools

Items in this folder do their job **without** a Revizto MCP Server connection: Claude plugins that don't
depend on one (they may use it optionally), and standalone tools you run outside Claude.

| Item | Type | Status |
|---|---|---|
| [revizto-pi-matrix](revizto-pi-matrix/) | Claude plugin — Revizto Project Intelligence Matrix | `1.0.0`. Works offline; the Revizto MCP connector adds read-only live data. |
| [converters](converters/) | Standalone tools | Reserved — nothing published yet |

Anything that needs a live MCP connection to do its job belongs in [`../mcp-blueprints/`](../mcp-blueprints/)
— see the rule in the [repository README](../README.md).

A Claude plugin added here gets its own folder with a `.claude-plugin/plugin.json`, a byte-identical copy of
the root `LICENSE.md`, and an entry in the root `.claude-plugin/marketplace.json`. Standalone tools have no
marketplace entry.
