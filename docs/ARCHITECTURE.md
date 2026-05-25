# BrainForge Architecture

BrainForge has five layers:

1. **Vault generator**: creates a local Obsidian-compatible Markdown vault.
2. **Import pipeline**: parses AI exports, chunks text, embeds chunks, and extracts draft memory.
3. **MCP server**: exposes search/read/save/import/doctor tools to Claude Code and Codex.
4. **Company task runtime**: tracks long work through phase packets, current owner state, and handoff links.
5. **Adapters**: safely connect Claude Code and Codex to the same vault.

## Data Flow

```text
Chat exports
  -> parser
  -> chunks
  -> local embeddings (Ollama /api/embed when available, deterministic hash fallback otherwise)
  -> JSONL vector index
  -> draft Markdown memories
  -> MCP search/read/save tools
  -> tracked company tasks and structured handoffs for long multi-agent work
```

## Safety Model

- Raw exports stay in the imports folder.
- Generated memories are drafts until reviewed.
- Re-import backs up existing generated draft files before replacing them.
- Re-import preserves review status for stable memory IDs when the same extracted memory appears again.
- Reviewed memories append to `09-System/Reviewed Memories.md` rather than overwriting earlier approvals.
- Config edits require explicit `--configure`.
- Backups are written before config edits.
- Path traversal is blocked when reading memories through MCP.

## Embedding Providers

BrainForge has provider modes:

- `auto`: try Ollama first, fall back to local hash vectors.
- `ollama`: use local Ollama `/api/embed` with a configurable embedding model.
- `hash`: deterministic local fallback with no model downloads or network calls.

The active provider, model, dimensions, and fallback reason are written to `08-Indexes/manifest.json`.

## Review Queue

Extracted memories receive stable IDs derived from their section and text. Review state lives in `08-Indexes/memory-review-queue.json` with `pending`, `approved`, and `rejected` statuses. Approved memories are appended to `09-System/Reviewed Memories.md` for human-readable agent recall.

## Company Task Runtime

Long tasks live under `10-Orchestration/Tasks/<task-id>/`. Each task stores `company-task.json`, a readable `README.md`, phase packets, and links to global handoff files. The CLI and MCP server expose the same operations:

- `company start` / `start_company_task`
- `company status` / `get_company_task`
- `company advance` / `advance_company_task`

This is the part that makes the planner -> researcher -> architect -> builder -> tester -> critic -> improvement -> release loop durable across context windows.

## Native Extension Points

- Claude Code: MCP plus `CLAUDE.md`.
- Codex: MCP plus `AGENTS.md`.
- Obsidian: plain Markdown vault plus recommended plugins.
