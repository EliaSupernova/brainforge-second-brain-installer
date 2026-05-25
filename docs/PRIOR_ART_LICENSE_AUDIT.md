# Prior Art License Audit

Last reviewed: 2026-05-25

This is an engineering license screen, not legal advice. BrainForge should
default to clean-room implementation of product ideas unless a dependency is
intentionally added with compatible license notices.

## Summary

| Project | License observed | Code reuse stance | BrainForge stance |
| --- | --- | --- | --- |
| [Mem0](https://github.com/mem0ai/mem0) | Apache-2.0 | Possible with notices and dependency review | Adapt memory API and hybrid retrieval patterns. |
| [Mem0 OpenMemory](https://mem0.ai/openmemory) | Appears under Mem0/Apache-2.0, verify subpackage terms | Possible only after folder-level review | Adapt access logs, tags, and project-scoped memory ideas. |
| [Khoj](https://github.com/khoj-ai/khoj) | AGPL-3.0 | Avoid direct code reuse | Ideas only: broad second-brain product surface. |
| [Obsidian Smart Connections](https://github.com/brianpetro/obsidian-smart-connections) | Custom Smart Plugins License Agreement | Avoid direct code reuse | Ideas only: related-note and in-editor recall UX. |
| [mcp-memory-service](https://github.com/doobidoo/mcp-memory-service) | Apache-2.0 | Possible with notices and dependency review | Adapt MCP-native memory service patterns. |
| [Basic Memory](https://github.com/basicmachines-co/basic-memory) | AGPL-3.0 | Avoid direct code reuse | Ideas only: editable Markdown memory store. |
| [Supermemory MCP](https://github.com/supermemoryai/supermemory-mcp) | MIT | Possible with notices and dependency review | Adapt MCP onboarding and cross-client positioning. |
| [Letta](https://github.com/letta-ai/letta) | Apache-2.0 | Possible with notices and dependency review | Adapt explicit memory blocks and stateful-agent concepts. |
| [Graphiti](https://github.com/getzep/graphiti) | Apache-2.0 | Possible with notices and dependency review | Adapt temporal entity/fact concepts. |
| [Agent Memory Techniques](https://github.com/NirDiamant/Agent_Memory_Techniques) | Apache-2.0 | Possible for examples after dependency review | Adapt taxonomy and evaluation ideas. |

## Current Implementation Rule

The current BrainForge memory upgrade is clean-room:

- no source code was copied from prior-art repositories
- no new runtime dependency was added
- AGPL and custom-licensed projects were treated as ideas-only
- source-backed memory, typed memory, entity hints, and review-aware search were
  implemented inside the existing BrainForge codebase

## Future Reuse Checklist

Before copying code or adding a dependency from any prior-art project:

1. Confirm the exact package or folder license.
2. Check transitive dependency licenses.
3. Preserve required license and notice files.
4. Avoid AGPL/custom-restricted code unless BrainForge intentionally accepts the
   obligations.
5. Prefer adapter boundaries over vendoring code.
6. Document the decision in this file.
