# Changelog

## 1.0.0 — first public release

The Revizto Project Intelligence Matrix joins the Revizto Blueprints marketplace as its own plugin,
installed and versioned separately from the Project Intelligence Blueprint.

- **Four views.** 01 Import · 02 Matrix · 03 Clash Test Editor · 04 Health, behind a Start here page and
  an in-product Tour, Glossary and About.
- **Two ways in.** Import your project's search-set export (`.vimsst`), or start from the Codifying
  Coordination v2.0 template — edit a copy; the original stays untouched.
- **Clash tests from search sets.** Decide which pairs are tested, the clash type and clearance distance,
  priority and who moves; tune them in bulk or row by row with undo, with changed rows marked against
  their starting point.
- **Export for Revizto.** Clash tests export as a `.vimctst` file Revizto imports. Tests bind to your
  project's search sets by ID, so export reads the project's search-set export first.
- **Live and read-only, when connected.** With the Revizto MCP connector, 04 Health reads how the clash
  tests are running in a live project. The build declares read tools only and refuses any write before it
  reaches the connector. Terms are accepted at the first live read, per connection.
- **Local by default.** Matrices are saved in browser storage on the device. Nothing is uploaded.
