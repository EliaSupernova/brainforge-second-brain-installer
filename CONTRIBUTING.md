# Contributing

BrainForge is meant to stay local-first, conservative, and understandable.

## Development Setup

```bash
npm install
npm run build
npm test
```

## Before Opening A Pull Request

Run:

```bash
npm run check
npm test
npm run smoke
npm pack --dry-run
```

## Design Rules

- Keep raw imports as evidence; never delete them automatically.
- Prefer explicit review before durable memory is trusted.
- Back up user config before edits.
- Do not add cloud services, telemetry, or hosted databases without a clear opt-in design.
- Keep MCP tool outputs structured enough for an agent to recover from mistakes.
- For long-running work, use the company task runtime and leave handoffs.

## Testing Expectations

Add focused tests when changing:

- Import parsing.
- Memory extraction or review behavior.
- Embedding provider selection.
- MCP tools.
- Claude Code or Codex config writers.
- Company task phase transitions.
- Path or config safety boundaries.
- Plugin helper commands.
