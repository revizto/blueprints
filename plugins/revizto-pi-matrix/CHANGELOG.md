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

Hardened before release in response to pre-merge code review:

- **Edits are saved to the matrix they were made in**, even when you switch matrices, delete one or
  finish an import within the autosave delay. If the browser refuses to save, the Matrix stays on the
  current matrix — from the picker, the template, an import or a resumed session — and tells you how to
  free space, rather than switching and losing the edit.
- **Revert restores an imported matrix to how it was imported** and never deletes it. Matrices imported
  before this build show Revert as unavailable, with the reason.
- **Multi-set clash tests export whole or not at all.** A test only partly selected, partly left out, or
  partly already in the project is named, with the choice to include the whole test or leave it out; the
  counts shown before export equal the file.
- **Search sets with the same name in different folders are refused, not guessed.** Tests that use them
  are blocked at export with the folders named; rename one in Revizto and export the search sets again.
- **04 Health recognises the multi-set tests the Matrix exported.** When this browser made the export, it
  credits each test with exactly the pairs it was written with and says when a pair was added after the
  last export; otherwise it matches by name and says so.
- **A live read stays with the project and server it started on.** Switching mid-read discards the old
  read instead of showing it under the new project; repeated Reads run one at a time, latest wins.
- **Every message that tells you to re-create the artifact names this plugin's install skill**
  (`project-intelligence-matrix`) — at start-up when no connection exists, and when a connector's tools
  are not authorised for this artifact. A release check refuses the Project Intelligence Blueprint's
  install skill, by full or short name.
- **The Geist font licence ships with the plugin** (`OFL.txt`).
- **The install explains its one-off read calls** before making them (see README → Your data).
