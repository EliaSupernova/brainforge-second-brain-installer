---
name: brainforge-memory
description: Use the local BrainForge AI-Brain vault for durable user preferences, project context, decisions, goals, and AI chat export recall.
---

# BrainForge Memory

Use this skill when the user asks about their history, preferences, projects, prior decisions, or wants continuity across Claude Code and Codex.

## Workflow

1. Search the BrainForge MCP server with `search_brain`.
2. Read specific Markdown notes only when search results point to them.
3. Treat extracted memories as draft unless marked reviewed.
4. Use `review_memories` to list drafts, and only approve drafts when the user explicitly asks.
5. Save durable new context with `save_memory`.
6. Never delete raw imports or overwrite existing memory without explicit approval.

## Long Tasks

For non-trivial work, use BrainForge's company-style loop:

1. Initial plan.
2. Research.
3. Refined plan.
4. Build.
5. Test.
6. Review.
7. Improve.
8. Release.

Use `get_orchestration_protocol` before starting a long task and `create_handoff` at each phase boundary.
