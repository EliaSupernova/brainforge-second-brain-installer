# Threat Model

BrainForge processes private chat exports and writes local memory files. The biggest risk is not remote code execution; it is accidental disclosure, trusted false memory, unsafe config edits, or an agent loading too much sensitive context.

## Assets

- Raw AI exports in the imports folder.
- Generated Markdown memory files.
- Reviewed memory in `09-System/Reviewed Memories.md`.
- Embedding indexes in `08-Indexes/`.
- Claude Code and Codex configuration files.
- Company task packets and handoffs.

## Trust Boundaries

- User-provided exports are untrusted input.
- Machine-extracted memory is untrusted until reviewed.
- MCP clients are trusted to call BrainForge tools, but their prompts and retrieved context may contain untrusted text.
- Obsidian community plugins are third-party code and are only recommended, not installed.
- Ollama runs locally; BrainForge assumes the configured Ollama URL is controlled by the user.

## Main Risks And Controls

| Risk | Control |
| --- | --- |
| Raw exports deleted or overwritten | BrainForge never deletes raw imports. |
| Existing config damaged | `setup --configure` is explicit and backs up files first. |
| Plugin install hides config edits | `plugin install` uses the same backup-first config path and prompts unless `--yes` is passed. |
| Draft extraction becomes trusted memory | Draft files are labeled unreviewed; review queue promotes memories only after approval. |
| Path traversal through MCP read/write | Memory read/write resolves paths and refuses targets outside the AI-Brain folder. |
| Prompt injection inside imported chats | Imported text is treated as evidence, not instructions. Agents should prefer reviewed memory. |
| Sensitive data leaves the machine | Default behavior is local files and local embeddings. No hosted service is configured. |
| Low-quality embeddings create bad recall | Manifest records provider and fallback reason; doctor warns on hash fallback. |
| Long tasks lose truth across context windows | Company tasks and handoffs record durable phase state. |

## Security Review Checklist

- Run `npm run check`.
- Run `npm test`.
- Run `npm run smoke`.
- Run `brainforge doctor --strict` on a configured test vault.
- Verify config backups exist after `setup --configure --yes`.
- Try MCP memory reads with `../` paths and confirm they fail.
- Review generated memories before treating them as durable facts.

## Non-Goals For The MVP

- Cloud sync.
- Hosted vector databases.
- Automatic Obsidian plugin installation.
- Account login automation.
- Secret scanning of imported exports.
- Cryptographic encryption of the vault.
