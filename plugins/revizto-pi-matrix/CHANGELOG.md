# Changelog

## 1.0.1 — the Repository Terms 2.0 and the Apache License 2.0; drag and drop is the only way to bring a file in

- **Licence.** The Matrix is licensed under the Apache License, Version 2.0 (`LICENSE`), with `NOTICE`, and is
  subject to the **Revizto Open-Source Repository Terms and Conditions, Version 2.0 — 13 November 2026**
  (`TERMS.md`). These replace the Revizto Custom Licence (`LICENSE.md`). Revizto's brand assets and the
  third-party components listed in `NOTICE` are not licensed under the Apache License.
- **In-app Terms.** The Terms gate shows the Repository Terms in full, word for word, followed by notes on
  what the Matrix reads and keeps (the notes describe the Matrix; they are not terms). The agreement names
  the Revizto MCP Server Terms as well, for the Matrix's live reads. The Terms version moves
  from 1.1 to 2.0, so every connection is asked to accept the Terms once more before its first live read.
  About names Apache 2.0 and the Repository Terms.
- **Files are brought in by drag and drop only.** Every drop zone (Import, the import wizard, the Clash Test
  Editor's setup card, the export template and 04 Health's check) reads a file you drag onto it from Finder or
  File Explorer. The keyboard routes that 1.0.0 carried but did not show — pasting a copied file onto a
  focused drop zone, and pressing Enter for a file browser — are removed. Neither could be relied on in
  Cowork, which closes every file dialog an artifact opens, and a hidden route that may not work is worse
  than none.
- Drop zones are no longer stops in the Tab order (a stop that does nothing when reached is a dead end for a
  keyboard user). A screen reader describes each one as drag and drop only. When a file is refused, focus
  still returns to the zone and the reason is announced.
- **Installs with Claude's Artifact tool.** Cowork live artifacts (`create_artifact`) were retired for new
  artifacts on 19 August 2026, so a 1.0.0 install could no longer complete. The plugin now also ships
  `matrix-claudeai.html`, the same release for Claude's Artifact tool: it reaches your Revizto connectors by
  their names through the artifact's own connector access, asks you to allow the Revizto tools before its
  first live read (so the install makes no Revizto calls), and saves exported clash tests as a `.zip`.
  Help that pointed at Cowork, or at adding a connector id, points at the install skill or the artifact's
  Permissions menu. The
  install skill uses it whenever the session has the Artifact tool, and keeps `matrix.html` and the
  `create_artifact` path for organisations that still have live artifacts. The claude.ai build is derived
  from `matrix.html` by `tools/claudeai/port.mjs` and checked byte for byte on every push.
- No other behaviour changes. Saved matrices and the declared read-only tools are as in 1.0.0; re-run the `project-intelligence-matrix` skill to update an artifact you have already created.

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
- **Selectors and announcements are escaped by one shared helper each** (code scanning, PR #2). Names
  containing a backslash or quote no longer lose keyboard focus after Esc, rename-cancel or a Health level
  click; tags in announcements are stripped until none remain; filter lists build only for a known column.
  A release check refuses the unescaped shapes anywhere in the build.
- **The Geist font licence ships with the plugin** (`OFL.txt`).
- **The install explains its one-off read calls** before making them (see README → Your data).
