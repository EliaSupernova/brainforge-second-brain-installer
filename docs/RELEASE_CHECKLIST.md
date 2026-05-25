# Release Checklist

Use this before publishing BrainForge from GitHub or npm.

## Required Checks

- `npm install`
- `npm run verify`
- `npm pack --dry-run`

## Manual Verification

- Setup creates an AI-Brain vault.
- Import folder instructions are clear.
- Chat export import writes chunks, vectors, manifest, and extracted Markdown memories.
- Manifest records the embedding provider, dimensions, model, and fallback reason when applicable.
- Search returns relevant chunks.
- Review lists draft memories with stable IDs.
- `review --approve ID` and `review --reject ID` update queue status.
- `review --approve-all` writes reviewed memory.
- Doctor passes core checks.
- `setup --configure --yes` writes Claude/Codex adapters only after backups or in a clean config.
- Re-running `setup --configure --yes` does not duplicate the Codex MCP block.
- Existing Claude/Codex instruction text is preserved when BrainForge appends marked sections.
- `brainforge doctor --strict` is available for release gates that should fail on warnings.
- Orchestration files exist in `09-System/` and `10-Orchestration/`.
- Role prompts exist in `10-Orchestration/Agents/`.
- `brainforge protocol` returns the plan/research/refined-plan/build/test/review/improve/release loop.
- `brainforge handoff` writes a Markdown handoff.
- `brainforge company start` creates a tracked task folder with `company-task.json`, `README.md`, and the first phase packet.
- `brainforge company status` reports the current phase owner.
- `brainforge company advance` writes a handoff and moves to the next phase.
- `SECURITY.md`, `docs/THREAT_MODEL.md`, and `docs/COMPLETION_AUDIT.md` are current.

## Safety Review

- Raw imports are not deleted.
- Existing memory files are not silently overwritten.
- Global config edits require `--configure`.
- Destructive actions are absent or require explicit approval.
- No secrets or personal paths are committed.

## Publish Notes

The MVP supports Ollama `/api/embed` and the deterministic hash fallback. Before positioning this as high-quality semantic memory, compare retrieval quality across `embeddinggemma`, `nomic-embed-text`, and the fallback on fixture exports.
