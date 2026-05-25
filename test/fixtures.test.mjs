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
              "My name is Chat Example. I prefer direct answers and backups before config edits. I still need to follow up with RBC about account linking by Friday."
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

const pluginInfo = runJson(["plugin", "info", "--brain-dir", brainDir, "--json"]);
assert.equal(pluginInfo.status, "success");
assert.equal(pluginInfo.mcpConfig.mcpServers.brainforge.command, "brainforge");
assert.deepEqual(pluginInfo.mcpConfig.mcpServers.brainforge.args, ["mcp", "--brain-dir", brainDir]);
assert.match(pluginInfo.codexPluginManifest, /plugins\/brainforge\/\.codex-plugin\/plugin\.json$/);

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
assert.ok(imported.written.includes(join(brainDir, "08-Indexes", "memories.jsonl")));

const profile = readFileSync(join(brainDir, "00-Identity", "Extracted Profile.md"), "utf8");
const preferences = readFileSync(join(brainDir, "04-Preferences", "Extracted Preferences.md"), "utf8");
const decisions = readFileSync(join(brainDir, "03-Decisions", "Extracted Decisions.md"), "utf8");
const workflows = readFileSync(join(brainDir, "09-System", "Extracted Workflows.md"), "utf8");
const openLoops = readFileSync(join(brainDir, "07-Open Loops", "Extracted Open Loops.md"), "utf8");
const chunks = readJsonl(join(brainDir, "08-Indexes", "chunks.jsonl"));
const memoryIndex = readJsonl(join(brainDir, "08-Indexes", "memories.jsonl"));

assert.match(profile, /My name is Chat Example/);
assert.match(preferences, /I prefer direct answers/);
assert.match(decisions, /Decision: use reviewed memories/);
assert.match(workflows, /initial plan, research, refined plan/);
assert.match(openLoops, /follow up with RBC/);
assert.ok(chunks.every((chunk) => Array.isArray(chunk.memoryTypes)));
assert.ok(chunks.every((chunk) => typeof chunk.sourceCitation === "string" && chunk.sourceCitation.includes("#chunk-")));
assert.ok(memoryIndex.length >= 4);
assert.ok(memoryIndex.some((memory) => memory.type === "open_loop"));
assert.ok(memoryIndex.every((memory) => Array.isArray(memory.sourceRefs) && memory.sourceRefs.length >= 1));
assert.ok(memoryIndex.every((memory) => memory.sourceRefs[0].chunkId && memory.sourceRefs[0].sourceFile && memory.sourceRefs[0].excerpt));

const search = runJson(["search", "reviewed memories local privacy", "--brain-dir", brainDir, "--json"]);
assert.ok(Array.isArray(search));
assert.ok(search.length > 0);
assert.ok(search.every((result) => typeof result.vectorScore === "number" && typeof result.keywordScore === "number"));

const reviewList = runJson(["review", "--brain-dir", brainDir, "--json"]);
assert.equal(reviewList.action, "list");
assert.ok(reviewList.count >= 4);
assert.ok(reviewList.items.every((item) => typeof item.id === "string" && item.id.length === 12));
assert.ok(reviewList.items.every((item) => item.status === "pending"));

const defaultDraftSearch = runJson(["search", "direct answers backups config edits", "--brain-dir", brainDir, "--source-backed", "--json"]);
assert.deepEqual(defaultDraftSearch, []);

const pendingOpenLoopSearch = runJson(["search", "follow up RBC account linking", "--brain-dir", brainDir, "--type", "open_loop", "--status", "pending", "--source-backed", "--json"]);
assert.ok(pendingOpenLoopSearch.length > 0);
assert.ok(pendingOpenLoopSearch.every((result) => result.type === "open_loop" && result.status === "pending"));
assert.ok(pendingOpenLoopSearch.every((result) => typeof result.recencyScore === "number"));

const preferenceItem = reviewList.items.find((item) => item.section === "preferences" && /direct answers/.test(item.text));
assert.ok(preferenceItem);
const editedText = "I prefer concise direct answers and verified backups before config edits.";
const edited = runJson(["review", "--brain-dir", brainDir, "--edit", preferenceItem.id, "--text", editedText, "--json"]);
assert.equal(edited.edited, 1);
assert.match(runFailure(["review", "--brain-dir", brainDir, "--edit", "missing-id", "--text", "Nope", "--json"]), /Unknown review id/);
assert.match(runFailure(["review", "--brain-dir", brainDir, "--edit", preferenceItem.id, "--text", "   ", "--json"]), /Editing requires/);

const afterEdit = runJson(["review", "--brain-dir", brainDir, "--json"]);
const editedItem = afterEdit.items.find((item) => item.id === preferenceItem.id);
assert.equal(editedItem?.text, editedText);
assert.equal(editedItem?.originalText, preferenceItem.text);
assert.ok(editedItem?.editedAt);
assert.equal(editedItem?.sourceRefs?.[0]?.chunkId, preferenceItem.sourceRefs?.[0]?.chunkId);

const memoryIndexAfterEdit = readJsonl(join(brainDir, "08-Indexes", "memories.jsonl"));
const editedRecord = memoryIndexAfterEdit.find((memory) => memory.id === preferenceItem.id);
assert.equal(editedRecord?.text, editedText);
assert.equal(editedRecord?.sourceRefs?.[0]?.chunkId, preferenceItem.sourceRefs?.[0]?.chunkId);

const firstId = preferenceItem.id;
const secondId = reviewList.items.find((item) => item.id !== firstId)?.id;
assert.ok(secondId);
const selected = runJson(["review", "--brain-dir", brainDir, "--approve", firstId, "--reject", secondId, "--json"]);
assert.equal(selected.action, "update");
assert.equal(selected.approved, 1);
assert.equal(selected.rejected, 1);
assert.match(readFileSync(selected.reviewedPath, "utf8"), new RegExp(firstId));
assert.match(readFileSync(selected.reviewedPath, "utf8"), /concise direct answers/);

const afterSelected = runJson(["review", "--brain-dir", brainDir, "--json"]);
assert.equal(afterSelected.items.find((item) => item.id === firstId)?.status, "approved");
assert.equal(afterSelected.items.find((item) => item.id === secondId)?.status, "rejected");
assert.ok(afterSelected.items.find((item) => item.id === firstId)?.sourceRefs?.[0]?.chunkId);

runJson(["import", "--brain-dir", brainDir, "--imports-dir", importsDir, "--embedding-provider", "hash", "--json"]);
const afterReimport = runJson(["review", "--brain-dir", brainDir, "--json"]);
assert.equal(afterReimport.items.find((item) => item.id === firstId)?.status, "approved");
assert.equal(afterReimport.items.find((item) => item.id === secondId)?.status, "rejected");
assert.equal(afterReimport.items.find((item) => item.id === firstId)?.text, editedText);
assert.ok(afterReimport.items.find((item) => item.id === firstId)?.editedAt);

const approved = runJson(["review", "--brain-dir", brainDir, "--approve-all", "--json"]);
assert.equal(approved.action, "approve-all");
assert.ok(approved.approved >= 1);
assert.ok(existsSync(approved.memoryIndexPath));
assert.match(readFileSync(approved.reviewedPath, "utf8"), /Approved/);

const memoryIndexPath = join(brainDir, "08-Indexes", "memories.jsonl");
const recordsBeforeRecency = readJsonl(memoryIndexPath);
const sourceTemplate = recordsBeforeRecency.find((memory) => memory.sourceRefs?.[0])?.sourceRefs ?? [];
const oldDate = "2020-01-01T00:00:00.000Z";
const newDate = new Date().toISOString();
writeJsonlFile(memoryIndexPath, [
  ...recordsBeforeRecency,
  {
    id: "recency-old",
    type: "preference",
    text: "Recency ranking sentinel memory prefers durable review.",
    status: "approved",
    createdAt: oldDate,
    updatedAt: oldDate,
    observedAt: oldDate,
    lastConfirmedAt: oldDate,
    sourceRefs: sourceTemplate,
    entities: []
  },
  {
    id: "recency-new",
    type: "preference",
    text: "Recency ranking sentinel memory prefers durable review.",
    status: "approved",
    createdAt: newDate,
    updatedAt: newDate,
    observedAt: newDate,
    lastConfirmedAt: newDate,
    sourceRefs: sourceTemplate,
    entities: []
  }
]);
const recencySearch = runJson(["search", "recency ranking sentinel durable review", "--brain-dir", brainDir, "--type", "preference", "--status", "approved", "--source-backed", "--json"]);
assert.equal(recencySearch[0].id, "recency-new");
assert.ok(recencySearch[0].recencyScore > recencySearch.find((result) => result.id === "recency-old").recencyScore);

const sourceBackedSearch = runJson(["search", "direct answers backups config edits", "--brain-dir", brainDir, "--type", "preference", "--status", "approved", "--source-backed", "--json"]);
assert.ok(sourceBackedSearch.some((result) => /concise direct answers/.test(result.text)));
assert.ok(sourceBackedSearch.every((result) => result.type === "preference" && result.status === "approved"));
assert.ok(sourceBackedSearch.every((result) => Array.isArray(result.sources) && result.sources[0].chunkId));
assert.ok(sourceBackedSearch.every((result) => typeof result.recencyScore === "number" && result.why.some((why) => why.startsWith("recency="))));

const outdated = runJson(["review", "--brain-dir", brainDir, "--outdate", sourceBackedSearch[0].id, "--json"]);
assert.equal(outdated.outdated, 1);
const afterOutdatedSearch = runJson(["search", "direct answers backups config edits", "--brain-dir", brainDir, "--status", "outdated", "--source-backed", "--json"]);
assert.ok(afterOutdatedSearch.some((result) => result.status === "outdated"));

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
const pluginInstall = runJson(["plugin", "install", "--brain-dir", brainDir, "--imports-dir", importsDir, "--yes", "--json"], { HOME: fakeHome });
assert.equal(pluginInstall.status, "success");
assert.equal(pluginInstall.plugin.mcpConfig.mcpServers.brainforge.command, "brainforge");

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

function runFailure(args, env = {}) {
  try {
    execFileSync(process.execPath, [cli, ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    return error.stderr?.toString() ?? error.message;
  }
  throw new Error(`Expected command to fail: ${args.join(" ")}`);
}

function readJsonl(path) {
  return readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function writeJsonlFile(path, records) {
  writeFileSync(path, records.map((record) => JSON.stringify(record)).join("\n") + "\n");
}
