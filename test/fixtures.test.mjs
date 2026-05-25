import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const cli = join(root, "dist", "cli.js");
const core = await import(join(root, "dist", "core.js"));
const fixtureRoot = join(root, "tmp", "fixture-tests");
const brainDir = join(fixtureRoot, "AI-Brain");
const importsDir = join(fixtureRoot, "Imports");

rmSync(fixtureRoot, { recursive: true, force: true });
mkdirSync(importsDir, { recursive: true });

writeFileSync(join(importsDir, "chatgpt-conversations.json"), JSON.stringify([
  {
    title: "ChatGPT export shape",
    mapping: {
      a: {
        message: {
          author: { role: "user" },
          content: {
            parts: [
              "My name is Chat Example. I prefer direct answers and backups before config edits."
            ]
          }
        }
      },
      b: {
        message: {
          author: { role: "assistant" },
          content: { parts: ["We should preserve local privacy and write a doctor check."] }
        }
      }
    }
  }
]));

writeFileSync(join(importsDir, "claude-export.json"), JSON.stringify({
  name: "Claude export shape",
  chat_messages: [
    {
      sender: "human",
      text: "I am building the Claude vault. Decision: use reviewed memories before trusted recall."
    },
    {
      sender: "assistant",
      text: "The workflow should be initial plan, research, refined plan, build, test, review, improve, release."
    }
  ]
}));

writeFileSync(join(importsDir, "codex-session.jsonl"), [
  JSON.stringify({
    type: "response_item",
    item: {
      type: "message",
      role: "user",
      content: [
        { type: "input_text", text: "My goal is to make Codex share workflows with Claude through one AI-Brain." }
      ]
    }
  }),
  JSON.stringify({
    type: "response_item",
    item: {
      type: "message",
      role: "assistant",
      content: [
        { type: "output_text", text: "Create MCP tools for search, import, doctor, and memory review." }
      ]
    }
  })
].join("\n"));

const setup = runJson(["setup", "--brain-dir", brainDir, "--imports-dir", importsDir, "--yes", "--json"]);
assert.equal(setup.brainDir, brainDir);
assert.ok(existsSync(join(brainDir, "10-Orchestration", "Tasks", "README.md")));

const savedMemoryPath = await core.saveMemory(brainDir, "../Escaped Section", "../../Saved Memory", "Stays inside the vault.");
assert.ok(savedMemoryPath.startsWith(`${brainDir}/`));
assert.ok(existsSync(savedMemoryPath));
await assert.rejects(() => core.readMemory(brainDir, "../outside.md"), /outside the brain directory/);

const companyStart = runJson([
  "company",
  "start",
  "--brain-dir",
  brainDir,
  "--title",
  "Fixture Company Task",
  "--objective",
  "Build and release the BrainForge second brain installer through a full multi-agent loop.",
  "--json"
]);
assert.equal(companyStart.status, "success");
assert.equal(companyStart.task.currentPhase, "initial_plan");
assert.equal(companyStart.task.currentPhaseDetails.owner, "Planner");
assert.ok(existsSync(companyStart.task.currentPhaseDetails.packetPath));

const companyTaskId = companyStart.task.id;
const companyStatus = runJson(["company", "status", "--brain-dir", brainDir, "--task", companyTaskId, "--json"]);
assert.equal(companyStatus.task.id, companyTaskId);
assert.equal(companyStatus.task.currentPhaseDetails.label, "Initial Plan");

const firstAdvance = runJson([
  "company",
  "advance",
  "--brain-dir",
  brainDir,
  "--task",
  companyTaskId,
  "--summary",
  "Initial plan fixture phase completed.",
  "--evidence",
  "fixture test",
  "--next",
  "Research the options.",
  "--json"
]);
assert.equal(firstAdvance.task.currentPhase, "research");
assert.equal(firstAdvance.task.currentPhaseDetails.owner, "Researcher");
assert.ok(existsSync(firstAdvance.task.currentPhaseDetails.packetPath));
assert.match(readFileSync(firstAdvance.artifacts[0], "utf8"), new RegExp(companyTaskId));

for (const phaseSummary of [
  "Research fixture phase completed.",
  "Refined plan fixture phase completed.",
  "Build fixture phase completed.",
  "Test fixture phase completed.",
  "Review fixture phase completed.",
  "Improve fixture phase completed.",
  "Release fixture phase completed."
]) {
  runJson([
    "company",
    "advance",
    "--brain-dir",
    brainDir,
    "--task",
    companyTaskId,
    "--summary",
    phaseSummary,
    "--evidence",
    "fixture test",
    "--json"
  ]);
}

const completedCompany = runJson(["company", "status", "--brain-dir", brainDir, "--task", companyTaskId, "--json"]);
assert.equal(completedCompany.task.status, "completed");
assert.equal(completedCompany.task.currentPhaseDetails, null);

const imported = runJson(["import", "--brain-dir", brainDir, "--imports-dir", importsDir, "--embedding-provider", "hash", "--json"]);
assert.equal(imported.files, 3);
assert.equal(imported.messages, 6);
assert.equal(imported.embedding.provider, "brainforge-local-hash");

const profile = readFileSync(join(brainDir, "00-Identity", "Extracted Profile.md"), "utf8");
const preferences = readFileSync(join(brainDir, "04-Preferences", "Extracted Preferences.md"), "utf8");
const decisions = readFileSync(join(brainDir, "03-Decisions", "Extracted Decisions.md"), "utf8");
const workflows = readFileSync(join(brainDir, "09-System", "Extracted Workflows.md"), "utf8");

assert.match(profile, /My name is Chat Example/);
assert.match(preferences, /I prefer direct answers/);
assert.match(decisions, /Decision: use reviewed memories/);
assert.match(workflows, /initial plan, research, refined plan/);

const search = runJson(["search", "reviewed memories local privacy", "--brain-dir", brainDir, "--json"]);
assert.ok(Array.isArray(search));
assert.ok(search.length > 0);

const reviewList = runJson(["review", "--brain-dir", brainDir, "--json"]);
assert.equal(reviewList.action, "list");
assert.ok(reviewList.count >= 4);
assert.ok(reviewList.items.every((item) => typeof item.id === "string" && item.id.length === 12));
assert.ok(reviewList.items.every((item) => item.status === "pending"));

const firstId = reviewList.items[0].id;
const secondId = reviewList.items[1].id;
const selected = runJson(["review", "--brain-dir", brainDir, "--approve", firstId, "--reject", secondId, "--json"]);
assert.equal(selected.action, "update");
assert.equal(selected.approved, 1);
assert.equal(selected.rejected, 1);
assert.match(readFileSync(selected.reviewedPath, "utf8"), new RegExp(firstId));

const afterSelected = runJson(["review", "--brain-dir", brainDir, "--json"]);
assert.equal(afterSelected.items.find((item) => item.id === firstId)?.status, "approved");
assert.equal(afterSelected.items.find((item) => item.id === secondId)?.status, "rejected");

runJson(["import", "--brain-dir", brainDir, "--imports-dir", importsDir, "--embedding-provider", "hash", "--json"]);
const afterReimport = runJson(["review", "--brain-dir", brainDir, "--json"]);
assert.equal(afterReimport.items.find((item) => item.id === firstId)?.status, "approved");
assert.equal(afterReimport.items.find((item) => item.id === secondId)?.status, "rejected");

const approved = runJson(["review", "--brain-dir", brainDir, "--approve-all", "--json"]);
assert.equal(approved.action, "approve-all");
assert.ok(approved.approved >= 1);
assert.match(readFileSync(approved.reviewedPath, "utf8"), /Approved/);

const doctor = runJson(["doctor", "--brain-dir", brainDir, "--json"]);
assert.equal(doctor.find((check) => check.name === "Memory review")?.status, "pass");
assert.equal(doctor.find((check) => check.name === "Company task runtime")?.status, "pass");

const fakeHome = join(fixtureRoot, "home");
mkdirSync(join(fakeHome, ".codex"), { recursive: true });
mkdirSync(join(fakeHome, ".claude"), { recursive: true });
writeFileSync(join(fakeHome, ".claude.json"), JSON.stringify({
  mcpServers: {
    existing: { command: "existing-tool", args: [] }
  }
}, null, 2));
writeFileSync(join(fakeHome, ".codex", "config.toml"), "# existing codex config\n");
writeFileSync(join(fakeHome, ".codex", "AGENTS.md"), "# Existing Codex Instructions\n");
writeFileSync(join(fakeHome, ".claude", "CLAUDE.md"), "# Existing Claude Instructions\n");

runJson(["setup", "--brain-dir", brainDir, "--imports-dir", importsDir, "--configure", "--yes", "--json"], { HOME: fakeHome });
runJson(["setup", "--brain-dir", brainDir, "--imports-dir", importsDir, "--configure", "--yes", "--json"], { HOME: fakeHome });

const claudeConfig = JSON.parse(readFileSync(join(fakeHome, ".claude.json"), "utf8"));
assert.equal(claudeConfig.mcpServers.existing.command, "existing-tool");
assert.equal(claudeConfig.mcpServers.brainforge.command, "brainforge");

const codexConfig = readFileSync(join(fakeHome, ".codex", "config.toml"), "utf8");
assert.match(codexConfig, /# existing codex config/);
assert.equal((codexConfig.match(/\[mcp_servers\.brainforge\]/g) ?? []).length, 1);

const codexAgents = readFileSync(join(fakeHome, ".codex", "AGENTS.md"), "utf8");
assert.match(codexAgents, /Existing Codex Instructions/);
assert.match(codexAgents, /brainforge:start/);

const claudeMd = readFileSync(join(fakeHome, ".claude", "CLAUDE.md"), "utf8");
assert.match(claudeMd, /Existing Claude Instructions/);
assert.match(claudeMd, /brainforge:start/);

const backupRoot = join(fakeHome, ".brainforge", "backups");
assert.ok(existsSync(backupRoot));
assert.ok(readdirSync(backupRoot).length >= 1);

function runJson(args, env = {}) {
  const output = execFileSync(process.execPath, [cli, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8"
  });
  return JSON.parse(output);
}
