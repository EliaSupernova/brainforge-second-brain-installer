# Multi-Agent Orchestration

BrainForge is a second-brain installer. The multi-agent system is part of how that installer lets Claude Code and Codex run big work without losing context.

## Workflow

```text
initial plan
  -> research
  -> refined plan
  -> build
  -> test
  -> review
  -> improve
  -> release
```

## Roles

- Planner: requirements, acceptance criteria, risks, and context budget.
- Researcher: official docs, GitHub projects, prior art, and evidence links.
- Architect: boundaries, storage, interfaces, and extension points.
- Builder: implementation.
- Tester: checks, fixtures, smoke tests, and regression coverage.
- Security Reviewer: local privacy, config safety, secrets, prompt injection, and destructive actions.
- Docs/Release Engineer: README, install flow, package metadata, examples, and release checklist.
- Critic: independent review against the user's actual objective.

## Context Window Handling

Each agent receives:

- The objective.
- The current plan.
- Relevant memory search results.
- The previous handoff.
- Only files needed for its phase.

Each phase writes a handoff with:

- What changed.
- Evidence.
- Risks and assumptions.
- Open questions.
- Next owner and next steps.

## Task Runtime

The protocol is backed by real task state in `10-Orchestration/Tasks/`.

```bash
brainforge company start --objective "..."
brainforge company status
brainforge company advance --task TASK_ID --summary "..." --evidence "..."
```

Starting a task creates:

- `company-task.json`: machine-readable status, current phase, owner, and packet paths.
- `README.md`: human-readable task overview.
- `phases/NN-phase.md`: the scoped packet for each phase when it starts.
- global handoffs in `10-Orchestration/Handoffs/`.

This lets Claude Code, Codex, or a human operator resume the work without loading the whole transcript.

## Shipped Agent Prompts

BrainForge writes role prompts into `10-Orchestration/Agents/` inside the generated vault and also ships plugin-side prompt files under `plugins/brainforge/agents/`:

- Planner
- Researcher
- Architect
- Builder
- Tester
- Security Reviewer
- Docs Release Engineer
- Critic

## MCP Tools

BrainForge exposes:

- `get_orchestration_protocol`
- `start_company_task`
- `get_company_task`
- `advance_company_task`
- `create_handoff`

These tools let Claude Code or Codex coordinate the loop without dumping the entire project history into every turn.
