# Completion Audit

This audit maps the requested product requirements to current repository evidence.

## Implemented

- GitHub-downloadable package shape: `package.json`, `README.md`, `docs/INSTALL.md`, `.github/workflows/ci.yml`, and `docs/GITHUB_PUBLISHING.md`.
- Claude Code/Codex plugin-style bundle: `plugins/brainforge/.codex-plugin/plugin.json`, `plugins/brainforge/.mcp.json`, role prompts, and skills.
- Plugin helper: `brainforge plugin info` and `brainforge plugin install`.
- Local AI-Brain vault setup: `brainforge setup`.
- Imports folder instructions: generated `PUT_EXPORTS_HERE.txt` and vault README.
- Chat export parsing: ChatGPT-style JSON, Claude-style JSON, Codex JSONL, Markdown, and text fixtures.
- Local embeddings: Ollama `/api/embed`, auto fallback, and deterministic hash provider.
- Memory extraction: identity, preferences, projects, decisions, goals, people, and workflows.
- Human review: draft queue, approve, reject, approve-all, and reviewed memory append.
- Claude Code and Codex adapters: MCP config plus `AGENTS.md` and `CLAUDE.md`, gated by `setup --configure`.
- Obsidian support: Markdown vault and recommended plugin note.
- Multi-agent company runtime: start/status/list/advance commands and MCP tools.
- Context-window handling: phase packets, handoffs, role prompts, and company task state.
- Safety-first verification: doctor checks, strict mode, CI, smoke flow, and package dry run.
- Security posture: `SECURITY.md` and `docs/THREAT_MODEL.md`.

## Verification Commands

```bash
npm run check
npm test
npm run smoke
npm pack --dry-run
node -e "JSON.parse(require('fs').readFileSync('plugins/brainforge/.codex-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('plugins/brainforge/.mcp.json','utf8'))"
```

## External Owner Actions

- Choose a GitHub account and repository URL.
- Push the repository.
- Test MCP registration inside real Claude Code and Codex installations on the maintainer's machine.
- Decide whether to publish to npm or keep GitHub clone installation only.
