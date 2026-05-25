# BrainForge

BrainForge is a local-first AI second brain installer for Claude Code, Codex, and Obsidian.

The product promise:

> Drop in your AI chat exports. BrainForge turns them into a searchable, embedded, Obsidian-readable brain that Claude Code and Codex can share through MCP.

## MVP Status

This repository contains a working MVP skeleton:

- Creates an `AI-Brain` vault and an imports folder.
- Parses ChatGPT-style exports, Claude-style exports, Markdown, and plain text.
- Chunks and embeds content locally with a deterministic vector fallback.
- Extracts draft memories into readable Markdown notes.
- Lets users review draft extracted memories and explicitly promote them into reviewed memory.
- Exposes MCP tools for search, reading, saving, importing, and doctor checks.
- Adds a multi-agent orchestration protocol with planner, researcher, architect, builder, tester, security reviewer, docs/release engineer, and critic roles.
- Generates scoped role prompts inside the vault so long tasks can be split across specialized agents.
- Starts and advances tracked company tasks with current owner state, phase packets, and handoff links.
- Writes structured phase handoffs so Claude Code and Codex can handle long work without dragging the entire transcript through every context window.
- Provides safe Claude Code and Codex adapter writers behind explicit approval flags.
- Provides `brainforge plugin info` and `brainforge plugin install` for plugin-style discovery and adapter setup.
- Recommends Obsidian plugins without silently changing an existing Obsidian install.

## Install From Source

```bash
git clone https://github.com/YOUR-ORG/brainforge-second-brain-installer.git
cd brainforge-second-brain-installer
npm install
npm run build
npm link
```

Then run:

```bash
brainforge setup
```

For GitHub clone instructions, see [docs/INSTALL.md](docs/INSTALL.md).
For publishing your own repo, see [docs/GITHUB_PUBLISHING.md](docs/GITHUB_PUBLISHING.md).

By default BrainForge does not edit Claude or Codex configs. To create backups and add adapters:

```bash
brainforge setup --configure
```

Or use the plugin-style install command:

```bash
brainforge plugin install
```

For non-interactive setup:

```bash
brainforge plugin install --yes
```

## User Flow

1. Run `brainforge setup`.
2. Drop ChatGPT, Claude, Codex, Markdown, or text exports into the created imports folder.
3. Run `brainforge import`.
4. Run `brainforge search "what projects matter to me right now"`.
5. Run `brainforge review` to inspect draft memories.
6. Run `brainforge review --approve-all` when you want to promote drafts into reviewed memory.
7. Run `brainforge company start --objective "..."` when you want a full planner/researcher/architect/builder/tester/reviewer/release loop.
8. Run `brainforge doctor` to verify the setup.

## Commands

```bash
brainforge setup [--brain-dir PATH] [--imports-dir PATH] [--configure] [--yes]
brainforge import [--brain-dir PATH] [--imports-dir PATH] [--embedding-provider auto|ollama|hash]
brainforge search "query" [--brain-dir PATH] [--limit 5]
brainforge doctor [--brain-dir PATH] [--strict] [--json]
brainforge review [--brain-dir PATH] [--approve ID[,ID]] [--reject ID[,ID]] [--approve-all] [--json]
brainforge protocol [--json]
brainforge handoff --phase PHASE --from AGENT --to AGENT --summary TEXT [--brain-dir PATH]
brainforge company start --objective TEXT [--title TEXT] [--brain-dir PATH] [--json]
brainforge company status [--task TASK_ID] [--brain-dir PATH] [--json]
brainforge company list [--brain-dir PATH] [--json]
brainforge company advance [--task TASK_ID] --summary TEXT [--evidence TEXT] [--next TEXT] [--questions TEXT] [--brain-dir PATH] [--json]
brainforge plugin info [--brain-dir PATH] [--json]
brainforge plugin install [--brain-dir PATH] [--imports-dir PATH] [--yes] [--json]
brainforge mcp [--brain-dir PATH]
```

## Multi-Agent Orchestration

BrainForge includes a company-style workflow for large tasks:

```text
initial plan -> research -> refined plan -> build -> test -> review -> improve -> release
```

The MCP server exposes `get_orchestration_protocol` and `create_handoff` so Claude Code or Codex can coordinate specialized agents while keeping context scoped.

The runtime commands make that workflow concrete:

```bash
brainforge company start --objective "Build a private AI second brain installer"
brainforge company status
brainforge company advance --summary "Initial plan completed" --evidence "10-Orchestration/Tasks/..."
```

MCP clients can call `start_company_task`, `get_company_task`, and `advance_company_task` to operate the same task state.

## Local Embeddings

BrainForge supports three local embedding modes:

- `auto` default: try Ollama locally, then fall back to deterministic local hash vectors.
- `ollama`: require Ollama `/api/embed` and fail if unavailable.
- `hash`: no model download, no API key, deterministic local fallback.

Example with real local neural embeddings:

```bash
ollama pull embeddinggemma
brainforge import --embedding-provider ollama --embedding-model embeddinggemma
```

You can also set:

```bash
export BRAINFORGE_EMBEDDING_PROVIDER=ollama
export BRAINFORGE_EMBEDDING_MODEL=embeddinggemma
export BRAINFORGE_OLLAMA_URL=http://localhost:11434
```

## Claude Code / Codex Design

BrainForge follows the native extension points:

- Claude Code: `CLAUDE.md`, MCP, and optional user-scoped config.
- Codex: `AGENTS.md`, `~/.codex/config.toml`, and MCP.
- Obsidian: normal Markdown vault files plus recommended community plugins.

Plugin helper:

```bash
brainforge plugin info
brainforge plugin install
```

`plugin info` prints the packaged plugin files under `plugins/brainforge/` and the MCP config shape. `plugin install` creates the vault and, after approval, backs up and writes the Claude Code/Codex adapters.

## Safety

BrainForge is intentionally conservative:

- Raw exports are never deleted.
- Existing files are not silently overwritten.
- Global Claude/Codex config edits require `--configure`.
- Config files are backed up before edits.
- `brainforge doctor --strict` exits non-zero when any warning or failure remains.
- Extracted memories are labeled as draft/unreviewed.
- Review state is tracked in `08-Indexes/memory-review-queue.json`.
- Reviewed memories are appended to `09-System/Reviewed Memories.md`; they are not silently overwritten.
- Everything is local by default.

Security docs:

- [SECURITY.md](SECURITY.md)
- [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md)
- [docs/COMPLETION_AUDIT.md](docs/COMPLETION_AUDIT.md)

## Verify A Clone

```bash
npm run verify
```

This runs type checking, fixture tests, smoke setup/import/search/review/company-task flow, and package dry-run.

## Recommended Next Milestones

- Add retrieval-quality fixtures comparing Ollama models against the hash fallback.
- Add a richer review UI for approving individual extracted memories.
- Add robust importers for full ChatGPT and Claude export formats.
- Add real-client plugin validation recipes for each Claude Code and Codex release line.
- Add end-to-end MCP integration tests with Claude/Codex clients.
