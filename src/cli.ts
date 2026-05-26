#!/usr/bin/env node
import { advanceCompanyTask, createHandoff, doctor, getCompanyTask, getRelatedMemories, importExports, installPlugin, listCompanyTasks, orchestrationProtocol, pluginInfo, rebuildMemoryMap, reviewDraftMemories, searchBrain, searchMemories, setupBrain, startCompanyTask, type MemoryReviewStatus, type MemoryType } from "./core.js";
import { runMcpServer } from "./mcp.js";

interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  try {
    switch (args.command) {
      case "setup":
        await outputResult(await setupBrain({
          brainDir: stringFlag(args, "brain-dir"),
          importsDir: stringFlag(args, "imports-dir"),
          configure: Boolean(args.flags.configure),
          yes: Boolean(args.flags.yes)
        }), Boolean(args.flags.json));
        break;
      case "import":
        await outputResult(await importExports({
          brainDir: stringFlag(args, "brain-dir"),
          importsDir: stringFlag(args, "imports-dir"),
          embeddingProvider: embeddingProviderFlag(args),
          embeddingModel: stringFlag(args, "embedding-model"),
          ollamaUrl: stringFlag(args, "ollama-url")
        }), Boolean(args.flags.json));
        break;
      case "search": {
        const query = args.positionals.join(" ").trim();
        if (!query) throw new Error("Usage: brainforge search \"your query\"");
        const brainDir = stringFlag(args, "brain-dir");
        const limit = numberFlag(args, "limit") ?? 5;
        const memoryType = memoryTypeFlag(args);
        const memoryStatus = memoryStatusFlag(args);
        const sourceBacked = Boolean(args.flags["source-backed"]) || Boolean(memoryType) || Boolean(memoryStatus);
        if (sourceBacked) {
          const memoryResults = await searchMemories(query, brainDir, limit, { type: memoryType, status: memoryStatus });
          await outputResult(memoryResults.map((result) => ({
            id: result.memory.id,
            score: result.score,
            keywordScore: result.keywordScore,
            entityScore: result.entityScore,
            recencyScore: result.recencyScore,
            type: result.memory.type,
            status: result.memory.status,
            text: result.memory.text,
            sources: result.matchedSourceRefs,
            why: result.why
          })), Boolean(args.flags.json));
          break;
        }
        const results = await searchBrain(query, brainDir, limit, {
          model: stringFlag(args, "embedding-model"),
          ollamaUrl: stringFlag(args, "ollama-url")
        });
        await outputResult(results.map((result) => ({
          score: result.score,
          vectorScore: result.vectorScore,
          keywordScore: result.keywordScore,
          entityScore: result.entityScore,
          title: result.chunk.conversationTitle,
          source: result.chunk.sourceFile,
          citation: result.chunk.sourceCitation,
          memoryTypes: result.chunk.memoryTypes,
          entities: result.chunk.entities,
          text: result.chunk.text
        })), Boolean(args.flags.json));
        break;
      }
      case "doctor": {
        const checks = await doctor(stringFlag(args, "brain-dir"));
        if (args.flags.json) {
          await outputResult(checks, true);
        } else {
          for (const check of checks) {
            const symbol = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
            console.log(`${symbol} ${check.name}: ${check.message}`);
          }
          const failures = checks.filter((check) => check.status === "fail").length;
          if (failures > 0) process.exitCode = 1;
        }
        if (args.flags.strict && checks.some((check) => check.status !== "pass")) {
          process.exitCode = 1;
        }
        break;
      }
      case "review":
        await outputResult(await reviewDraftMemories({
          brainDir: stringFlag(args, "brain-dir"),
          approveAll: Boolean(args.flags["approve-all"]),
          approve: listFlag(args, "approve"),
          reject: listFlag(args, "reject"),
          outdate: listFlag(args, "outdate"),
          editId: stringFlag(args, "edit"),
          editText: stringFlag(args, "text")
        }), Boolean(args.flags.json));
        break;
      case "map":
        await outputResult(await rebuildMemoryMap(stringFlag(args, "brain-dir")), Boolean(args.flags.json));
        break;
      case "related": {
        const memoryId = requiredFlag(args, "id");
        await outputResult(await getRelatedMemories(stringFlag(args, "brain-dir"), memoryId, numberFlag(args, "limit") ?? 5), Boolean(args.flags.json));
        break;
      }
      case "protocol":
        await outputResult(orchestrationProtocol(), Boolean(args.flags.json));
        break;
      case "handoff": {
        const phase = requiredFlag(args, "phase");
        const fromAgent = requiredFlag(args, "from");
        const toAgent = requiredFlag(args, "to");
        const summary = requiredFlag(args, "summary");
        const path = await createHandoff(stringFlag(args, "brain-dir"), {
          phase,
          fromAgent,
          toAgent,
          summary,
          evidence: stringFlag(args, "evidence"),
          nextSteps: stringFlag(args, "next"),
          openQuestions: stringFlag(args, "questions")
        });
        await outputResult({ path }, Boolean(args.flags.json));
        break;
      }
      case "company":
        await handleCompanyCommand(args);
        break;
      case "plugin":
        await handlePluginCommand(args);
        break;
      case "mcp":
        await runMcpServer(stringFlag(args, "brain-dir"));
        break;
      case "help":
      case "":
        printHelp();
        break;
      default:
        throw new Error(`Unknown command: ${args.command}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function handlePluginCommand(args: ParsedArgs): Promise<void> {
  const action = args.positionals[0] ?? "info";
  switch (action) {
    case "info":
      await outputResult(pluginInfo(stringFlag(args, "brain-dir")), Boolean(args.flags.json));
      break;
    case "install":
      await outputResult(await installPlugin({
        brainDir: stringFlag(args, "brain-dir"),
        importsDir: stringFlag(args, "imports-dir"),
        yes: Boolean(args.flags.yes)
      }), Boolean(args.flags.json));
      break;
    default:
      throw new Error(`Unknown plugin command: ${action}`);
  }
}

async function handleCompanyCommand(args: ParsedArgs): Promise<void> {
  const action = args.positionals[0] ?? "status";
  switch (action) {
    case "start": {
      const objective = stringFlag(args, "objective") ?? args.positionals.slice(1).join(" ").trim();
      if (!objective) throw new Error("Usage: brainforge company start --objective \"what should the agent company do\"");
      await outputResult(await startCompanyTask({
        brainDir: stringFlag(args, "brain-dir"),
        title: stringFlag(args, "title"),
        objective
      }), Boolean(args.flags.json));
      break;
    }
    case "list":
      await outputResult(await listCompanyTasks(stringFlag(args, "brain-dir")), Boolean(args.flags.json));
      break;
    case "status":
      await outputResult(await getCompanyTask(stringFlag(args, "brain-dir"), stringFlag(args, "task")), Boolean(args.flags.json));
      break;
    case "advance": {
      const summary = stringFlag(args, "summary") ?? args.positionals.slice(1).join(" ").trim();
      if (!summary) throw new Error("Usage: brainforge company advance --task TASK_ID --summary \"what this phase completed\"");
      await outputResult(await advanceCompanyTask({
        brainDir: stringFlag(args, "brain-dir"),
        taskId: stringFlag(args, "task"),
        summary,
        evidence: stringFlag(args, "evidence"),
        nextSteps: stringFlag(args, "next"),
        openQuestions: stringFlag(args, "questions")
      }), Boolean(args.flags.json));
      break;
    }
    default:
      throw new Error(`Unknown company command: ${action}`);
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg.startsWith("--")) {
      const withoutPrefix = arg.slice(2);
      const [key, inlineValue] = withoutPrefix.split("=", 2);
      if (inlineValue !== undefined) {
        flags[key] = inlineValue;
      } else if (rest[index + 1] && !rest[index + 1].startsWith("--")) {
        flags[key] = rest[index + 1];
        index += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }
  return { command, positionals, flags };
}

function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags[name];
  return typeof value === "string" ? value : undefined;
}

function numberFlag(args: ParsedArgs, name: string): number | undefined {
  const value = args.flags[name];
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function listFlag(args: ParsedArgs, name: string): string[] | undefined {
  const value = stringFlag(args, name);
  if (!value) return undefined;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function requiredFlag(args: ParsedArgs, name: string): string {
  const value = stringFlag(args, name);
  if (!value) throw new Error(`Missing required --${name}`);
  return value;
}

function embeddingProviderFlag(args: ParsedArgs): "auto" | "ollama" | "hash" | undefined {
  const value = stringFlag(args, "embedding-provider");
  if (value === undefined) return undefined;
  if (value === "auto" || value === "ollama" || value === "hash") return value;
  throw new Error("--embedding-provider must be one of: auto, ollama, hash");
}

function memoryTypeFlag(args: ParsedArgs): MemoryType | undefined {
  const value = stringFlag(args, "type");
  if (value === undefined) return undefined;
  if (value === "identity" || value === "preference" || value === "decision" || value === "project" || value === "goal" || value === "person" || value === "workflow" || value === "open_loop") return value;
  throw new Error("--type must be one of: identity, preference, decision, project, goal, person, workflow, open_loop");
}

function memoryStatusFlag(args: ParsedArgs): MemoryReviewStatus | undefined {
  const value = stringFlag(args, "status");
  if (value === undefined) return undefined;
  if (value === "pending" || value === "approved" || value === "rejected" || value === "outdated") return value;
  throw new Error("--status must be one of: pending, approved, rejected, outdated");
}

async function outputResult(value: unknown, json: boolean): Promise<void> {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) console.log(JSON.stringify(item, null, 2));
    return;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(record)) {
      console.log(`${key}: ${Array.isArray(item) ? item.join(", ") : JSON.stringify(item)}`);
    }
    return;
  }
  console.log(String(value));
}

function printHelp(): void {
  console.log(`BrainForge

Commands:
  brainforge setup [--brain-dir PATH] [--imports-dir PATH] [--configure] [--yes] [--json]
  brainforge import [--brain-dir PATH] [--imports-dir PATH] [--embedding-provider auto|ollama|hash] [--embedding-model MODEL] [--ollama-url URL] [--json]
  brainforge search "query" [--brain-dir PATH] [--limit 5] [--source-backed] [--type identity|preference|decision|project|goal|person|workflow|open_loop] [--status pending|approved|rejected|outdated] [--embedding-model MODEL] [--ollama-url URL] [--json]
  brainforge doctor [--brain-dir PATH] [--strict] [--json]
  brainforge review [--brain-dir PATH] [--approve ID[,ID]] [--reject ID[,ID]] [--outdate ID[,ID]] [--edit ID --text TEXT] [--approve-all] [--json]
  brainforge map [--brain-dir PATH] [--json]
  brainforge related --id MEMORY_ID [--brain-dir PATH] [--limit 5] [--json]
  brainforge protocol [--json]
  brainforge handoff --phase PHASE --from AGENT --to AGENT --summary TEXT [--brain-dir PATH] [--evidence TEXT] [--next TEXT] [--questions TEXT]
  brainforge company start --objective TEXT [--title TEXT] [--brain-dir PATH] [--json]
  brainforge company status [--task TASK_ID] [--brain-dir PATH] [--json]
  brainforge company list [--brain-dir PATH] [--json]
  brainforge company advance [--task TASK_ID] --summary TEXT [--evidence TEXT] [--next TEXT] [--questions TEXT] [--brain-dir PATH] [--json]
  brainforge plugin info [--brain-dir PATH] [--json]
  brainforge plugin install [--brain-dir PATH] [--imports-dir PATH] [--yes] [--json]
  brainforge mcp [--brain-dir PATH]
`);
}

main();
