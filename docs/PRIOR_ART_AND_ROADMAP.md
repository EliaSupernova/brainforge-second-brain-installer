# Prior Art and Roadmap

Last reviewed: 2026-05-25

BrainForge should not try to become another full chat app, generic vector
database, or hosted memory API. The stronger opening is narrower and more
useful:

> Turn a user's exported AI chats into a reviewed local brain, then wire that
> brain into Claude Code, Codex, Obsidian, and other MCP-capable tools.

This document tracks what already exists and what BrainForge can learn from it.

## What Others Have Built

| Project | What it is | Useful idea | Why BrainForge is different |
| --- | --- | --- | --- |
| [Mem0](https://github.com/mem0ai/mem0) | Universal memory layer for AI agents with SDKs, CLI, server, MCP-adjacent integrations, and benchmarked memory algorithms. | Multi-signal retrieval: semantic search, keyword search, entity linking, and time-aware ranking. | BrainForge starts from exported historical chats and reviewed local vault memory, not only from live app integration. |
| [Mem0 OpenMemory](https://mem0.ai/openmemory) | Persistent MCP memory layer for coding agents. | Project-scoped memories, access logs, tagging, and memory review controls. | BrainForge can be local-first and export-bootstrap-first while optionally integrating with a backend later. |
| [Khoj](https://github.com/khoj-ai/khoj) | Self-hostable AI second brain for docs, web, custom agents, automations, and local/hosted models. | A second brain is most useful when it spans documents, search, agents, and scheduled work. | BrainForge should avoid competing as a full app. It should be an installer and bridge that configures existing tools. |
| [mcp-memory-service](https://github.com/doobidoo/mcp-memory-service) | Persistent memory service with REST, MCP, CLI, dashboard, knowledge graph, and autonomous consolidation. | Use one memory service across many agent clients, with graph relationships and consolidation. | BrainForge can keep a lightweight local vault first, then add optional adapters to heavier memory backends. |
| [Obsidian Smart Connections](https://github.com/brianpetro/obsidian-smart-connections) | Obsidian plugin for chatting with notes and finding related notes through embeddings. | Obsidian-native UX matters: related notes, note-level and block-level recall, local model options. | BrainForge creates and curates the vault before Obsidian plugins ever run. |
| [Basic Memory](https://github.com/basicmachines-co/basic-memory) | Local-first Markdown and MCP memory for AI conversations. | Markdown as the human-readable source of truth is a strong design choice. | BrainForge should lean into Markdown vaults, but add importers, review workflow, and setup automation. |
| [Supermemory MCP](https://github.com/supermemoryai/supermemory-mcp) | Universal memory MCP that makes memories available across LLM clients. | Simple "your memory in every LLM" positioning is easy to understand. | BrainForge's promise should be "your AI history becomes your local second brain," not just "shared memory." |
| [Letta](https://github.com/letta-ai/letta) | Platform for stateful agents with advanced memory, skills, and subagents. | Separate user memory, persona, tools, skills, and subagents. | BrainForge can export role prompts and memory packets to agent tools without owning the whole agent runtime. |
| [Graphiti](https://github.com/getzep/graphiti) | Temporal knowledge graph framework for AI agents. | Facts need provenance and time windows, because people change over time. | BrainForge should add temporal memory metadata before trying to be a full knowledge graph. |
| [Hindsight](https://github.com/vectorize-io/hindsight) | Agent memory system focused on learning, not just recalling. | Memory should capture lessons from failures, decisions, and outcomes. | BrainForge can add "lessons learned" extraction from chat exports and agent handoffs. |
| [Agent Memory Techniques](https://github.com/NirDiamant/Agent_Memory_Techniques) | Educational repo covering buffers, vector stores, knowledge graphs, episodic memory, semantic memory, MemGPT, Mem0, Letta, Zep, Graphiti, and benchmarks. | Treat memory as multiple systems, not one embedding search box. | BrainForge should expose memory tiers in plain files and commands. |

## Patterns To Borrow

1. Hybrid retrieval

   Do not rely only on embeddings. Use embeddings, keyword search, entity
   matches, recency, and memory type together. This is the biggest technical
   upgrade from the current MVP.

2. Reviewed memory, not silent memory

   Memories should be visible, editable, rejectable, and traceable to source
   chats. Auto-memory is powerful only if the user can inspect and fix it.

3. Project-scoped recall

   Claude and Codex should receive different context depending on the current
   repo, task, person, and topic. A single giant memory bucket will get noisy.

4. Temporal facts

   Store when a fact was observed, when it was last confirmed, and whether a
   newer memory supersedes it. This avoids agents using old preferences as if
   they are current.

5. Memory types

   Keep separate buckets for:

   - user profile
   - preferences
   - projects
   - people and relationships
   - decisions
   - lessons learned
   - workflows
   - open loops
   - rejected or outdated memories

6. Knowledge graph later, source links first

   Graphs are useful, but the first priority is source-backed facts. Every
   extracted memory should point back to the imported file and conversation
   chunk that created it.

7. Multi-client setup

   A strong installer should configure Claude Code, Codex, Obsidian, and MCP
   clients with one coherent local brain, instead of making the user wire every
   client manually.

8. Plain-language UX

   The user should not need to know what embeddings, MCP, vector stores, or
   JSON config files are. The product can expose simple commands: setup,
   import, review, search, fix.

## Patterns To Avoid

1. Becoming a hosted memory company too early

   Hosting, auth, sync, billing, and dashboards can bury the core promise.
   BrainForge should win locally first.

2. Copying restrictive plugin code

   Some useful Obsidian projects are source-available or use non-standard
   licenses. Borrow product ideas, not code, unless the license is clearly
   compatible.

3. Blind memory injection

   Injecting every plausible memory into every agent call will make agents
   worse. Retrieval must be scoped, ranked, and explainable.

4. One-shot AI extraction

   A single LLM pass will miss nuance and create false memories. Use draft
   memories, review queues, source evidence, and later contradiction checks.

5. Heavy infrastructure as the default

   Qdrant, Neo4j, Milvus, Postgres, dashboards, and cloud sync can be optional
   power modes. The default install should still work on a normal laptop.

## BrainForge Product Position

BrainForge should be:

- an installer
- an importer
- a local vault creator
- a reviewed memory extractor
- an MCP bridge
- a Claude Code and Codex setup helper
- an Obsidian-friendly second brain bootstrapper

BrainForge should not initially be:

- a new chat app
- a hosted SaaS memory API
- a full Obsidian clone
- a generic vector database
- a replacement for Mem0, Khoj, Letta, or Graphiti

The best sentence:

> BrainForge turns your old AI conversations into a local, reviewed second
> brain that your coding agents can actually use.

## Suggested Roadmap

### v0.2: Better Memory Quality

- Add hybrid retrieval: embeddings plus keyword scoring.
- Add entity extraction for people, projects, repos, apps, companies, and files.
- Add source citations for every draft memory.
- Add memory type classification.
- Add "current vs stale" fields to reviewed memories.
- Add tests that prove bad or outdated memories can be rejected.

### v0.3: Better User Review

- Add a small local review UI.
- Show source snippets beside each proposed memory.
- Let users approve, edit, merge, reject, and mark memories as outdated.
- Add a "daily review packet" for newly discovered memories.
- Add import quality reports by export source.

### v0.4: Obsidian Power Mode

- Generate Obsidian dashboards for projects, people, decisions, and open loops.
- Add recommended Smart Connections setup notes without depending on it.
- Add Dataview-ready metadata.
- Add backlinks from reviewed memories to source conversations.
- Add an optional BrainForge Obsidian companion plugin only if needed.

### v0.5: Agent Orchestration Upgrade

- Make planner, researcher, builder, tester, critic, and release roles query
  scoped memory differently.
- Add task memory: decisions, blockers, assumptions, test evidence, and next
  actions.
- Add automatic handoff compaction for long jobs.
- Add "lesson learned" extraction after a failed or fixed task.

### v0.6: Optional Advanced Backends

- Add adapter interfaces for Mem0-compatible stores.
- Add optional SQLite full-text search.
- Add optional local vector database support.
- Add optional temporal graph export compatible with Graphiti-style ideas.
- Keep the default vault-only path working.

### v1.0: Trustworthy Personal AI Brain

- Stable installer.
- Stable vault schema.
- Stable MCP API.
- Tested Claude Code and Codex setup flows.
- Strong privacy and threat model docs.
- Human review as a first-class safety feature.
- Clear migration path from earlier vault versions.

## Build vs Integrate

Build directly:

- export importers
- local vault schema
- draft and reviewed memory workflow
- source-backed memory citations
- Claude Code and Codex adapter setup
- MCP tools for local search and review
- plain-language setup and doctor commands

Integrate optionally:

- Obsidian plugins for note-level UX
- Ollama for local embeddings
- SQLite full-text search for faster keyword search
- Mem0-compatible APIs for users who want hosted or team memory
- graph backends for users who need temporal relationship queries

Avoid for now:

- cloud accounts
- paid hosted sync
- enterprise team dashboards
- browser extension capture
- building a full chat interface

## Next Research Questions

- Which chat export formats are most common and painful in real use?
- Can source-backed memory review stay simple enough for non-technical users?
- What is the minimum local search quality that feels magical?
- What exact MCP payload should Claude Code and Codex receive for a project?
- Should BrainForge have its own Obsidian plugin, or just generate a vault that
  works well with existing plugins?
- How should stale memories be detected without asking the user too many
  questions?

## Sources

- Mem0: https://github.com/mem0ai/mem0
- Mem0 OpenMemory: https://mem0.ai/openmemory
- Khoj: https://github.com/khoj-ai/khoj
- MCP Memory Service: https://github.com/doobidoo/mcp-memory-service
- Obsidian Smart Connections: https://github.com/brianpetro/obsidian-smart-connections
- Basic Memory: https://github.com/basicmachines-co/basic-memory
- Supermemory MCP: https://github.com/supermemoryai/supermemory-mcp
- Letta: https://github.com/letta-ai/letta
- Graphiti: https://github.com/getzep/graphiti
- Hindsight: https://github.com/vectorize-io/hindsight
- Agent Memory Techniques: https://github.com/NirDiamant/Agent_Memory_Techniques
