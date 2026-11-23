# claude.ai port

Cowork live artifacts (`create_artifact`) were retired for new artifacts on 19 August 2026. A Claude session
now normally has the built-in **Artifact** tool, whose pages reach connectors through the artifact's own
connector access, by connector **name**. Organisations on customer-managed keys, zero data retention or a
HIPAA-ready setup keep live artifacts. So each plugin ships two builds of the same release:

| Plugin | Cowork live artifact | Claude's Artifact tool |
|---|---|---|
| Blueprint | `dashboard.html` | `dashboard-claudeai.html` |
| Matrix | `matrix.html` | `matrix-claudeai.html` |

`port.mjs` derives the claude.ai build from the Cowork build. Never edit a claude.ai build by hand: both
plugins' gates re-derive it on every push and fail on any byte of difference.

```bash
node tools/claudeai/port.mjs <matrix|blueprint> <cowork.html> <out.html>   # derive
node tools/claudeai/port.mjs --check       # both committed claude.ai builds are the port (CI)
node tools/claudeai/port.mjs --selftest    # every refusal fires (CI)
```

What the port changes, and nothing else: the document skeleton (the Artifact tool supplies it); a shim that
maps the Cowork bridge onto the `mcp` capability, by the connector name the install skill writes beside each
connector prefix (`shim.html` for the Matrix, `shim-blueprint.html` for the Blueprint — each the shim of that
product's claude.ai build already running live); the Matrix's saves through the `downloads` capability
(`dlblob.js`, zipped); the Blueprint's assistant through the `sample` capability and its Discard confirmation
in the page (the claude.ai viewer blocks native dialogs); host-proof form controls (`controls.css`, injected as
`<style id="rvz-controls">`: white checkboxes, radios and fields in any host theme — a black box or field on a
light page is a defect); and the copy that told the user to look in Cowork.
Every edit must match its anchor exactly the expected number of times, or the port refuses.

## Release order

- **Blueprint:** port → `node tools/build.mjs` (its manifest describes both builds) → `npm run verify`.
- **Matrix:** package the guarded release build (`matrix.html` and its manifest) → port →
  `node tools/claudeai/port.mjs --write-matrix-manifest` (adds the manifest's `claudeai` block, touching nothing
  else) → `node tools/verify.mjs` in the plugin folder.
