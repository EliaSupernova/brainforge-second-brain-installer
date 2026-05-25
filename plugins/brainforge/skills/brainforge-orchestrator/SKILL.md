---
name: brainforge-orchestrator
description: Run complex BrainForge work as a multi-agent software team with scoped context, phase handoffs, and plan/research/plan/build/test/review/release loops.
---

# BrainForge Orchestrator

Use this skill for long or ambiguous work where one context window is not enough.

## Team Roles

- Planner: turns the user goal into requirements and acceptance criteria.
- Researcher: gathers official docs, prior art, risks, and options.
- Architect: decides system boundaries, interfaces, storage, and extension points.
- Builder: implements small verifiable changes.
- Tester: runs checks, creates fixtures, and verifies user flows.
- Security Reviewer: checks privacy, config edits, secrets, prompt injection, and destructive actions.
- Docs/Release Engineer: prepares README, examples, packaging, and release checklist.
- Critic: independently searches for gaps and overclaims.

## Loop

1. Initial plan.
2. Research.
3. Refined plan.
4. Build.
5. Test.
6. Review.
7. Improve.
8. Release.

## Task Runtime

For substantial work, call `start_company_task` first. Use `get_company_task` to load the current packet and owner. After a role completes its phase and has evidence, call `advance_company_task` with summary, evidence, next steps, and open questions.

CLI equivalents:

- `brainforge company start --objective "..."`
- `brainforge company status`
- `brainforge company advance --task TASK_ID --summary "..." --evidence "..."`

## Context Discipline

Each role should read only:

- The active company task packet.
- The objective.
- The current plan.
- Relevant BrainForge memory search results.
- The prior handoff.
- Files needed for that role.

At phase boundaries, prefer `advance_company_task`; use `create_handoff` for standalone handoffs that are not tied to a tracked task.
