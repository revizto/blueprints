# MCP blueprints

Items in this folder need a live **Revizto MCP Server** connection to do their job. They read (and, where
you explicitly allow it, write) your Revizto project data through the MCP connector you add in Claude.

| Blueprint | What it does |
|---|---|
| [revizto-project-intelligence](revizto-project-intelligence/) | Live project intelligence dashboard in Claude Cowork, plus curated Revizto platform skills. Read-only by default. |

## Prerequisites

Each blueprint's README states its exact prerequisites and install steps — follow it from Step 1. For the
Project Intelligence Blueprint they are, in outline:

- the Claude desktop app with Cowork, with the task set to run **on your computer**;
- a Revizto licence you administer (Administrator or Owner role), with the **Revizto MCP Server** app
  switched on for that Revizto account;
- the Revizto MCP connector added in Claude for each region you use (`https://api.<region>.revizto.com/mcp`);
- on Team/Enterprise, the region domains allowlisted by your Claude admin.

Items that work without an MCP connection belong in [`../plugins/`](../plugins/) — see the rule in the
[repository README](../README.md).
