# Security Policy

BrainForge is local-first software that handles private AI chat exports. Treat every export, generated memory, embedding index, and handoff as sensitive user data.

## Supported Version

The current MVP line is `0.1.x`.

## Reporting A Security Issue

Before public disclosure, open a private security advisory in the GitHub repository or contact the maintainer listed by the repository owner.

Please include:

- BrainForge version or commit.
- Operating system and Node.js version.
- The command or MCP tool involved.
- Whether private exports, config files, or generated memories were exposed.
- Minimal reproduction steps without sharing personal exports.

## Security Promises

- BrainForge does not delete raw imports.
- BrainForge does not edit global Claude Code or Codex configuration unless `setup --configure` is used.
- BrainForge backs up existing config files before editing them.
- BrainForge labels extracted memories as draft until reviewed.
- BrainForge blocks MCP memory reads and writes outside the configured AI-Brain folder.
- BrainForge uses local embeddings by default: Ollama on localhost when available, otherwise deterministic local hash vectors.

## Known Limits

- BrainForge cannot verify that every third-party AI export format is complete or stable.
- Recommended Obsidian plugins are not installed automatically.
- MCP clients still decide how much context to load and how they use retrieved memories.
- Hash embeddings are private and deterministic, but lower quality than real semantic embeddings.
- A user can intentionally configure BrainForge to point at any local folder; use trusted paths only.

See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for the detailed model.
