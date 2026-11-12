# Connectors

## Optional connector

The Matrix authors and exports clash tests **without any connector**. The **Revizto MCP** connector is
needed only for live, read-only data in **04 Health**. The plugin does not bundle it: the connector has a
per-region endpoint and OAuth sign-in, so you add it yourself under **Customize → Connectors** (README,
Step 2), one connection per region you use. A connector already added for the Revizto Project
Intelligence Blueprint serves the Matrix too.

| Connector | How you add it | Notes |
|---|---|---|
| Revizto MCP (project data) | Customize → Connectors → add "Revizto MCP" for your region, sign in | OAuth 2.1 PKCE against the regional Revizto API. One connection per region. |

> **Two separate gates.** Connecting the connector is necessary but **not** sufficient. The Matrix
> artifact has its own per-artifact `mcp_tools` allowlist, which the connector grant does **not**
> populate — the install skill's `create_artifact` declares the read tools into it, and only when run
> locally in Cowork. If the Matrix says "tools aren’t authorised for this artifact yet," that second gate is
> the empty one.

## Read-only by construction

The Matrix declares read tools only (`skills/project-intelligence-matrix/assets/manifest.json` →
`tools.read`) and its connection layer refuses any tool whose name carries a write verb before anything
reaches the connector. There is no setting that enables writes.

## Regional connections

The install skill writes one entry per connected region into the Matrix's connector list, in this shape:

```js
const CONNECTORS=[{prefix:"mcp__<your-connector-id>__",env:"prod",origin:"current"}];
```

Each connection exposes its tools with a unique `mcp__<connector-id>__` prefix. The install skill reads
it for you; to see it yourself, ask Claude to *"list the Revizto MCP tool names you can call"* — the
leading segment up to and including the trailing `__` is the prefix.

Terms acceptance is recorded **per connection, at the first live read**, on this device.

## Admin network allowlist (Team/Enterprise)

Allow the Revizto MCP connector domain(s). Fonts are embedded in the Matrix — no font or script CDN is
required.
