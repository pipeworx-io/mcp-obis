# mcp-obis

OBIS (Ocean Biodiversity Information System) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_taxon` | Resolve a marine species/genus/family name against OBIS to its taxon record (taxon ID, rank, accepted name, kingdom/phylum/family/genus, and total occurrence-record count). OBIS = global ocean biodiversity occurrence database; complements GBIF with a marine focus. Keyless. |
| `find_occurrences` | Find georeferenced marine occurrence records (latitude, longitude, date, depth, country, locality, basis of record) for a scientific name from OBIS. Optionally filter by date range. Returns the total match count plus a sample of records. |
| `get_statistics` | Get aggregate OBIS statistics for a marine taxon: total occurrence records, distinct species/taxa, contributing datasets, and the observed year range. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "obis": {
      "url": "https://gateway.pipeworx.io/obis/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Obis data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
