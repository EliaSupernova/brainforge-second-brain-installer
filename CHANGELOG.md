# Changelog

## 0.1.0

Initial MVP.

- Creates a local AI-Brain Markdown vault.
- Creates a desktop imports folder for AI chat exports.
- Parses ChatGPT-style JSON, Claude-style JSON, Codex-style JSONL, Markdown, and plain text.
- Builds local chunk and vector indexes.
- Supports Ollama `/api/embed` and deterministic local hash embeddings.
- Extracts draft memories for identity, projects, preferences, decisions, people, goals, and workflows.
- Adds a review queue for approving or rejecting draft memories.
- Exposes MCP tools for search, read, save, import, doctor checks, memory review, handoffs, and company task orchestration.
- Adds Claude Code and Codex adapter configuration behind explicit `setup --configure`.
- Backs up existing config files before edits.
- Generates Obsidian-compatible Markdown notes and plugin recommendations.
- Adds tracked company tasks for the full initial plan -> research -> refined plan -> build -> test -> review -> improve -> release loop.
- Ships docs, release checklist, security policy, and threat model.
