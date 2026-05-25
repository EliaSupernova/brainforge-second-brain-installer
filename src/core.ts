import { createHash } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { dirname, extname, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  access,
  appendFile,
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile
} from "node:fs/promises";

export const DEFAULT_BRAIN_DIR = "~/AI-Brain";
export const DEFAULT_IMPORTS_DIR = "~/Desktop/BrainForge-Imports";
export const VECTOR_DIMENSIONS = 384;

export interface BrainPaths {
  brainDir: string;
  importsDir: string;
  indexDir: string;
  orchestrationDir: string;
  tasksDir: string;
  chunksPath: string;
  vectorsPath: string;
  manifestPath: string;
  reviewQueuePath: string;
  memoryIndexPath: string;
}

export interface SetupOptions {
  brainDir?: string;
  importsDir?: string;
  configure?: boolean;
  yes?: boolean;
}

export interface PluginInstallOptions extends SetupOptions {}

export interface ImportOptions {
  brainDir?: string;
  importsDir?: string;
  embeddingProvider?: EmbeddingProviderChoice;
  embeddingModel?: string;
  ollamaUrl?: string;
}

export interface ReviewOptions {
  brainDir?: string;
  approveAll?: boolean;
  approve?: string[];
  reject?: string[];
  outdate?: string[];
  editId?: string;
  editText?: string;
}

export type EmbeddingProviderChoice = "auto" | "ollama" | "hash";

export interface EmbeddingOptions {
  provider?: EmbeddingProviderChoice;
  model?: string;
  ollamaUrl?: string;
}

export interface EmbeddingMetadata {
  provider: "ollama" | "brainforge-local-hash";
  requestedProvider: EmbeddingProviderChoice;
  model?: string;
  ollamaUrl?: string;
  dimensions: number;
  fallbackReason?: string;
  note: string;
}

export interface ParsedMessage {
  sourceFile: string;
  conversationTitle: string;
  role: string;
  text: string;
}

export interface ChunkRecord {
  id: string;
  sourceFile: string;
  conversationTitle: string;
  role: string;
  text: string;
  chunkIndex: number;
  sourceCitation: string;
  memoryTypes: string[];
  entities: string[];
  keywords: string[];
}

export interface VectorRecord {
  id: string;
  vector: number[];
}

export interface SearchResult {
  score: number;
  vectorScore: number;
  keywordScore: number;
  entityScore: number;
  chunk: ChunkRecord;
}

export type MemoryType = "identity" | "preference" | "decision" | "project" | "goal" | "person" | "workflow" | "open_loop";

export interface SourceRef {
  chunkId: string;
  sourceFile: string;
  conversationTitle: string;
  role: string;
  excerpt: string;
  citation: string;
}

export interface MemoryRecord {
  id: string;
  type: MemoryType;
  text: string;
  status: MemoryReviewStatus;
  createdAt: string;
  updatedAt: string;
  observedAt: string;
  lastConfirmedAt?: string;
  sourceRefs: SourceRef[];
  entities: string[];
}

export interface MemorySearchResult {
  score: number;
  keywordScore: number;
  entityScore: number;
  recencyScore: number;
  memory: MemoryRecord;
  matchedSourceRefs: SourceRef[];
  why: string[];
}

export interface HandoffInput {
  phase: string;
  fromAgent: string;
  toAgent: string;
  summary: string;
  taskId?: string;
  evidence?: string;
  nextSteps?: string;
  openQuestions?: string;
}

export type CompanyPhaseId = "initial_plan" | "research" | "refined_plan" | "build" | "test" | "review" | "improve" | "release";
export type CompanyTaskStatus = "active" | "completed";
export type CompanyPhaseStatus = "pending" | "in_progress" | "complete";

export interface CompanyPhaseDefinition {
  id: CompanyPhaseId;
  label: string;
  owner: string;
  folder: string;
  goal: string;
  exitCriteria: string[];
}

export interface CompanyTaskPhase {
  id: CompanyPhaseId;
  label: string;
  owner: string;
  status: CompanyPhaseStatus;
  startedAt?: string;
  completedAt?: string;
  packetPath?: string;
  handoffPath?: string;
}

export interface CompanyTask {
  id: string;
  title: string;
  objective: string;
  status: CompanyTaskStatus;
  currentPhase?: CompanyPhaseId;
  createdAt: string;
  updatedAt: string;
  phases: CompanyTaskPhase[];
}

export interface StartCompanyTaskOptions {
  brainDir?: string;
  title?: string;
  objective: string;
}

export interface AdvanceCompanyTaskOptions {
  brainDir?: string;
  taskId?: string;
  summary: string;
  evidence?: string;
  nextSteps?: string;
  openQuestions?: string;
}

export interface DraftMemoryItem {
  id: string;
  section: string;
  file: string;
  text: string;
  memoryType?: string;
  sourceFile?: string;
  conversationTitle?: string;
  sourceCitation?: string;
  evidence?: string;
  sourceRefs?: SourceRef[];
  entities?: string[];
  observedAt?: string;
  lastConfirmedAt?: string;
  originalText?: string;
  editedAt?: string;
}

export type MemoryReviewStatus = "pending" | "approved" | "rejected" | "outdated";

export interface MemoryReviewItem extends DraftMemoryItem {
  status: MemoryReviewStatus;
  createdAt: string;
  updatedAt: string;
  source: "extracted";
}

export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

const COMPANY_PHASES: CompanyPhaseDefinition[] = [
  {
    id: "initial_plan",
    label: "Initial Plan",
    owner: "Planner",
    folder: "Plans",
    goal: "Turn the objective into requirements, acceptance criteria, risks, and a context budget.",
    exitCriteria: ["Requirements are explicit.", "Acceptance criteria are testable.", "Open risks and assumptions are listed."]
  },
  {
    id: "research",
    label: "Research",
    owner: "Researcher",
    folder: "Research",
    goal: "Gather current docs, prior art, implementation options, and evidence before build decisions.",
    exitCriteria: ["Sources or local evidence are named.", "Relevant options and tradeoffs are compared.", "Unknowns are called out."]
  },
  {
    id: "refined_plan",
    label: "Refined Plan",
    owner: "Architect",
    folder: "Plans",
    goal: "Convert research into a concrete build plan with boundaries, interfaces, and verification gates.",
    exitCriteria: ["Implementation steps are ordered.", "Data and tool contracts are clear.", "Verification gates are chosen."]
  },
  {
    id: "build",
    label: "Build",
    owner: "Builder",
    folder: "Plans",
    goal: "Implement the accepted plan in small, reviewable changes.",
    exitCriteria: ["Changes are scoped to the plan.", "Artifacts are listed.", "Risky actions were approved or avoided."]
  },
  {
    id: "test",
    label: "Test",
    owner: "Tester",
    folder: "Reviews",
    goal: "Run checks that prove the workflow behaves as intended.",
    exitCriteria: ["Automated checks are recorded.", "Manual checks are recorded where needed.", "Failures have recovery notes."]
  },
  {
    id: "review",
    label: "Review",
    owner: "Critic",
    folder: "Reviews",
    goal: "Compare the work against the actual objective and find missing requirements or weak evidence.",
    exitCriteria: ["Findings are severity-ranked.", "No overclaims remain.", "Residual risk is explicit."]
  },
  {
    id: "improve",
    label: "Improve",
    owner: "Builder",
    folder: "Plans",
    goal: "Fix review findings and tighten implementation, docs, or tests.",
    exitCriteria: ["Review findings are addressed or documented.", "Regression checks still pass.", "The next owner has clean evidence."]
  },
  {
    id: "release",
    label: "Release",
    owner: "Docs/Release Engineer",
    folder: "Reviews",
    goal: "Prepare docs, install instructions, package checks, and release notes.",
    exitCriteria: ["Install instructions are current.", "Release checklist is updated.", "Final verification evidence is listed."]
  }
];

export function expandHome(pathLike: string): string {
  if (pathLike === "~") return homedir();
  if (pathLike.startsWith("~/")) return join(homedir(), pathLike.slice(2));
  return pathLike;
}

export function brainPaths(brainDir = DEFAULT_BRAIN_DIR, importsDir = DEFAULT_IMPORTS_DIR): BrainPaths {
  const resolvedBrainDir = resolve(expandHome(brainDir));
  const resolvedImportsDir = resolve(expandHome(importsDir));
  const indexDir = join(resolvedBrainDir, "08-Indexes");
  const orchestrationDir = join(resolvedBrainDir, "10-Orchestration");
  return {
    brainDir: resolvedBrainDir,
    importsDir: resolvedImportsDir,
    indexDir,
    orchestrationDir,
    tasksDir: join(orchestrationDir, "Tasks"),
    chunksPath: join(indexDir, "chunks.jsonl"),
    vectorsPath: join(indexDir, "vectors.jsonl"),
    manifestPath: join(indexDir, "manifest.json"),
    reviewQueuePath: join(indexDir, "memory-review-queue.json"),
    memoryIndexPath: join(indexDir, "memories.jsonl")
  };
}

export async function pathExists(pathLike: string): Promise<boolean> {
  try {
    await access(pathLike);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(pathLike: string): Promise<void> {
  await mkdir(pathLike, { recursive: true });
}

async function writeNewFile(pathLike: string, content: string): Promise<"created" | "exists"> {
  if (await pathExists(pathLike)) return "exists";
  await ensureDir(dirname(pathLike));
  await writeFile(pathLike, content, "utf8");
  return "created";
}

export async function setupBrain(options: SetupOptions = {}): Promise<Record<string, unknown>> {
  const paths = brainPaths(options.brainDir, options.importsDir);
  const folders = [
    "00-Identity",
    "01-Projects",
    "02-People",
    "03-Decisions",
    "04-Preferences",
    "05-Goals",
    "06-Conversations",
    "07-Imports/raw",
    "08-Indexes",
    "09-System",
    "10-Orchestration/Agents",
    "10-Orchestration/Handoffs",
    "10-Orchestration/Plans",
    "10-Orchestration/Research",
    "10-Orchestration/Reviews",
    "10-Orchestration/Tasks",
    ".obsidian"
  ];

  await ensureDir(paths.brainDir);
  await ensureDir(paths.importsDir);
  for (const folder of folders) {
    await ensureDir(join(paths.brainDir, folder));
  }

  const writes = await Promise.all([
    writeNewFile(join(paths.brainDir, "Home.md"), homeMarkdown()),
    writeNewFile(join(paths.brainDir, "README.md"), vaultReadme(paths.importsDir)),
    writeNewFile(join(paths.brainDir, "AGENTS.md"), agentsMarkdown()),
    writeNewFile(join(paths.brainDir, "CLAUDE.md"), claudeMarkdown()),
    writeNewFile(join(paths.brainDir, "09-System", "Recommended Obsidian Plugins.md"), obsidianPluginsMarkdown()),
    writeNewFile(join(paths.brainDir, "09-System", "Memory Review Policy.md"), memoryReviewPolicyMarkdown()),
    writeNewFile(join(paths.brainDir, "09-System", "Agent Company Operating System.md"), agentCompanyMarkdown()),
    writeNewFile(join(paths.brainDir, "09-System", "Context Window Protocol.md"), contextWindowProtocolMarkdown()),
    writeNewFile(join(paths.brainDir, "10-Orchestration", "README.md"), orchestrationReadmeMarkdown()),
    writeNewFile(join(paths.tasksDir, "README.md"), companyTasksReadmeMarkdown()),
    ...agentRolePrompts().map((role) => writeNewFile(join(paths.brainDir, "10-Orchestration", "Agents", role.fileName), role.content)),
    writeNewFile(join(paths.importsDir, "PUT_EXPORTS_HERE.txt"), importsReadme(paths.brainDir))
  ]);

  let adapterResult: Record<string, unknown> = { configured: false };
  if (options.configure) {
    const approved = options.yes || await askYesNo("BrainForge will back up and edit Claude/Codex user config files. Continue?");
    adapterResult = approved
      ? await configureAdapters(paths.brainDir)
      : { configured: false, reason: "User declined config edits." };
  }

  return {
    brainDir: paths.brainDir,
    importsDir: paths.importsDir,
    files: writes,
    adapters: adapterResult,
    next: [
      `Put AI exports into ${paths.importsDir}`,
      "Run: brainforge import",
      "Run: brainforge doctor"
    ]
  };
}

export async function installPlugin(options: PluginInstallOptions = {}): Promise<Record<string, unknown>> {
  const result = await setupBrain({ ...options, configure: true });
  return {
    status: "success",
    summary: "BrainForge plugin-style adapter install finished. Claude Code and Codex can use the shared AI-Brain through MCP when config edits were approved.",
    setup: result,
    plugin: pluginInfo(options.brainDir),
    next_actions: [
      "Restart Claude Code and Codex so they reload MCP configuration.",
      "Put AI exports into the imports folder.",
      "Run: brainforge import",
      "Run: brainforge doctor"
    ]
  };
}

export function pluginInfo(brainDir?: string): Record<string, unknown> {
  const paths = brainPaths(brainDir);
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const pluginDir = join(packageRoot, "plugins", "brainforge");
  const mcpConfig = {
    mcpServers: {
      brainforge: {
        command: "brainforge",
        args: ["mcp", "--brain-dir", paths.brainDir]
      }
    }
  };
  return {
    status: "success",
    summary: "BrainForge ships a plugin-style bundle plus MCP adapter config for Claude Code and Codex.",
    pluginDir,
    codexPluginManifest: join(pluginDir, ".codex-plugin", "plugin.json"),
    mcpManifest: join(pluginDir, ".mcp.json"),
    skillsDir: join(pluginDir, "skills"),
    agentsDir: join(pluginDir, "agents"),
    mcpConfig,
    install_commands: [
      "brainforge plugin install",
      "brainforge setup --configure"
    ],
    safe_notes: [
      "Install commands ask before editing config unless --yes is passed.",
      "Existing Claude Code and Codex config files are backed up before edits.",
      "The plugin bundle is plain files under plugins/brainforge for tools that support local plugin loading."
    ],
    artifacts: [
      pluginDir,
      join(pluginDir, ".codex-plugin", "plugin.json"),
      join(pluginDir, ".mcp.json"),
      join(pluginDir, "skills"),
      join(pluginDir, "agents")
    ]
  };
}

async function askYesNo(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input, output });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

export async function importExports(options: ImportOptions = {}): Promise<Record<string, unknown>> {
  const paths = brainPaths(options.brainDir, options.importsDir);
  await ensureDir(paths.indexDir);
  const files = await listImportFiles(paths.importsDir);
  const parsed: ParsedMessage[] = [];

  for (const file of files) {
    const messages = await parseImportFile(file);
    parsed.push(...messages);
  }

  const chunks = chunkMessages(parsed);
  const embeddingRun = await embedChunks(chunks, {
    provider: options.embeddingProvider,
    model: options.embeddingModel,
    ollamaUrl: options.ollamaUrl
  });
  await writeJsonl(paths.chunksPath, chunks);
  await writeJsonl(paths.vectorsPath, embeddingRun.vectors);
  await writeFile(paths.manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    importsDir: paths.importsDir,
    files: files.length,
    messages: parsed.length,
    chunks: chunks.length,
    embedding: embeddingRun.metadata
  }, null, 2), "utf8");

  const memoryDrafts = extractMemoryDrafts(chunks);
  await writeExtractedMemories(paths.brainDir, memoryDrafts);

  return {
    importsDir: paths.importsDir,
    files: files.length,
    messages: parsed.length,
    chunks: chunks.length,
    embedding: embeddingRun.metadata,
    written: [
      paths.chunksPath,
      paths.vectorsPath,
      paths.manifestPath,
      join(paths.brainDir, "00-Identity", "Extracted Profile.md"),
      join(paths.brainDir, "04-Preferences", "Extracted Preferences.md"),
      join(paths.brainDir, "01-Projects", "Extracted Projects.md"),
      join(paths.brainDir, "03-Decisions", "Extracted Decisions.md"),
      join(paths.brainDir, "05-Goals", "Extracted Goals.md"),
      join(paths.brainDir, "02-People", "Extracted People.md"),
      join(paths.brainDir, "09-System", "Extracted Workflows.md"),
      join(paths.brainDir, "07-Open Loops", "Extracted Open Loops.md"),
      paths.reviewQueuePath,
      paths.memoryIndexPath
    ]
  };
}

async function listImportFiles(root: string): Promise<string[]> {
  if (!await pathExists(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listImportFiles(fullPath));
    } else if (!shouldSkipImportFile(entry.name) && [".json", ".jsonl", ".md", ".txt"].includes(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function shouldSkipImportFile(name: string): boolean {
  return name === "PUT_EXPORTS_HERE.txt" || name === ".DS_Store";
}

async function parseImportFile(pathLike: string): Promise<ParsedMessage[]> {
  const raw = await readFile(pathLike, "utf8");
  const ext = extname(pathLike).toLowerCase();
  if (ext === ".jsonl") {
    return parseJsonlExport(raw, pathLike);
  }
  if (ext === ".json") {
    try {
      return parseJsonExport(JSON.parse(raw), pathLike);
    } catch {
      return [{ sourceFile: pathLike, conversationTitle: "Invalid JSON import", role: "unknown", text: raw }];
    }
  }
  return [{ sourceFile: pathLike, conversationTitle: pathLike.split("/").pop() ?? "Text import", role: "unknown", text: raw }];
}

function parseJsonlExport(raw: string, sourceFile: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const title = sourceFile.split("/").pop() ?? "JSONL import";
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const value = JSON.parse(trimmed) as unknown;
      messages.push(...parseJsonlLine(value, sourceFile, title));
    } catch {
      messages.push({ sourceFile, conversationTitle: title, role: "unknown", text: trimmed });
    }
  }
  return messages;
}

function parseJsonlLine(value: unknown, sourceFile: string, title: string): ParsedMessage[] {
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  if (object.item) return parseMessageObject(object.item, sourceFile, title);
  if (object.message) return parseMessageObject(object.message, sourceFile, title);
  return parseMessageObject(object, sourceFile, title);
}

function parseJsonExport(value: unknown, sourceFile: string): ParsedMessage[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => parseJsonConversation(item, sourceFile, `Conversation ${index + 1}`));
  }
  return parseJsonConversation(value, sourceFile, "Conversation");
}

function parseJsonConversation(value: unknown, sourceFile: string, fallbackTitle: string): ParsedMessage[] {
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  const title = stringValue(object.title) ?? stringValue(object.name) ?? fallbackTitle;

  if (object.mapping && typeof object.mapping === "object") {
    return Object.values(object.mapping as Record<string, unknown>)
      .flatMap((node) => {
        if (!node || typeof node !== "object") return [];
        const message = (node as Record<string, unknown>).message;
        return parseMessageObject(message, sourceFile, title);
      });
  }

  const messages = object.messages ?? object.chat_messages ?? object.conversation;
  if (Array.isArray(messages)) {
    return messages.flatMap((message) => parseMessageObject(message, sourceFile, title));
  }

  const text = collectText(value).join("\n").trim();
  return text ? [{ sourceFile, conversationTitle: title, role: "unknown", text }] : [];
}

function parseMessageObject(value: unknown, sourceFile: string, conversationTitle: string): ParsedMessage[] {
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  if (object.item && typeof object.item === "object") return parseMessageObject(object.item, sourceFile, conversationTitle);
  const role =
    stringValue(object.role) ??
    stringValue(object.sender) ??
    stringValue((object.author as Record<string, unknown> | undefined)?.role) ??
    "unknown";
  const content = object.content;
  const parts = content && typeof content === "object"
    ? (content as Record<string, unknown>).parts
    : undefined;
  const text = Array.isArray(parts)
    ? parts.map((part) => typeof part === "string" ? part : collectText(part).join(" ")).join("\n")
    : collectText(content ?? object.text ?? object.message).join("\n");
  const cleaned = text.trim();
  return cleaned ? [{ sourceFile, conversationTitle, role, text: cleaned }] : [];
}

function collectText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  const preferred = ["text", "content", "message", "value", "summary"];
  const collected: string[] = [];
  for (const key of preferred) {
    if (key in object) collected.push(...collectText(object[key]));
  }
  if (collected.length > 0) return collected;
  return [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function chunkMessages(messages: ParsedMessage[]): ChunkRecord[] {
  const chunks: ChunkRecord[] = [];
  for (const message of messages) {
    const parts = chunkText(message.text, 1400, 220);
    parts.forEach((text, index) => {
      const id = createHash("sha256")
        .update(`${message.sourceFile}:${message.conversationTitle}:${message.role}:${index}:${text}`)
        .digest("hex")
        .slice(0, 24);
      chunks.push({
        id,
        ...message,
        text,
        chunkIndex: index,
        sourceCitation: `${message.conversationTitle} (${message.role}) from ${message.sourceFile}#chunk-${index + 1}`,
        memoryTypes: classifyMemoryTypes(text),
        entities: extractEntities(text),
        keywords: extractKeywords(text)
      });
    });
  }
  return chunks;
}

function chunkText(text: string, maxChars: number, overlapChars: number): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const hardEnd = Math.min(start + maxChars, cleaned.length);
    const naturalEnd = hardEnd === cleaned.length ? hardEnd : Math.max(cleaned.lastIndexOf(". ", hardEnd), cleaned.lastIndexOf(" ", hardEnd));
    const end = naturalEnd > start + 300 ? naturalEnd : hardEnd;
    chunks.push(cleaned.slice(start, end).trim());
    if (end === cleaned.length) break;
    start = Math.max(0, end - overlapChars);
  }
  return chunks;
}

async function embedChunks(chunks: ChunkRecord[], options: EmbeddingOptions): Promise<{ vectors: VectorRecord[]; metadata: EmbeddingMetadata }> {
  const texts = chunks.map((chunk) => chunk.text);
  const config = resolveEmbeddingOptions(options);
  if (texts.length === 0) {
    return {
      vectors: [],
      metadata: {
        provider: "brainforge-local-hash",
        requestedProvider: config.provider,
        dimensions: VECTOR_DIMENSIONS,
        note: "No import chunks were present, so no embeddings were generated."
      }
    };
  }

  if (config.provider === "ollama" || config.provider === "auto") {
    try {
      const vectors = await embedTextsWithOllama(texts, config);
      return {
        vectors: chunks.map((chunk, index) => ({ id: chunk.id, vector: vectors[index] })),
        metadata: {
          provider: "ollama",
          requestedProvider: config.provider,
          model: config.model,
          ollamaUrl: config.ollamaUrl,
          dimensions: vectors[0]?.length ?? 0,
          note: "Local neural embeddings generated through Ollama /api/embed."
        }
      };
    } catch (error) {
      if (config.provider === "ollama") {
        throw new Error(`Ollama embedding failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      const fallbackVectors = embedTextsWithHash(texts);
      return {
        vectors: chunks.map((chunk, index) => ({ id: chunk.id, vector: fallbackVectors[index] })),
        metadata: {
          provider: "brainforge-local-hash",
          requestedProvider: config.provider,
          model: config.model,
          ollamaUrl: config.ollamaUrl,
          dimensions: VECTOR_DIMENSIONS,
          fallbackReason: error instanceof Error ? error.message : String(error),
          note: "Auto mode could not reach Ollama, so BrainForge used its deterministic local hash embedding fallback."
        }
      };
    }
  }

  const vectors = embedTextsWithHash(texts);
  return {
    vectors: chunks.map((chunk, index) => ({ id: chunk.id, vector: vectors[index] })),
    metadata: {
      provider: "brainforge-local-hash",
      requestedProvider: config.provider,
      dimensions: VECTOR_DIMENSIONS,
      note: "Deterministic local hash embeddings. No network, model download, or API key required."
    }
  };
}

function resolveEmbeddingOptions(options: EmbeddingOptions = {}): Required<EmbeddingOptions> {
  const provider = normalizeEmbeddingProvider(options.provider ?? process.env.BRAINFORGE_EMBEDDING_PROVIDER);
  return {
    provider,
    model: options.model ?? process.env.BRAINFORGE_EMBEDDING_MODEL ?? "embeddinggemma",
    ollamaUrl: (options.ollamaUrl ?? process.env.BRAINFORGE_OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, "")
  };
}

function normalizeEmbeddingProvider(value: unknown): EmbeddingProviderChoice {
  return value === "ollama" || value === "hash" || value === "auto" ? value : "auto";
}

async function embedTextsWithOllama(texts: string[], config: Required<EmbeddingOptions>): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let index = 0; index < texts.length; index += 32) {
    const batch = texts.slice(index, index + 32);
    const response = await fetch(`${config.ollamaUrl}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: config.model, input: batch }),
      signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`POST /api/embed returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
    const payload = await response.json() as { embeddings?: unknown };
    if (!Array.isArray(payload.embeddings)) {
      throw new Error("Ollama response did not contain an embeddings array.");
    }
    for (const item of payload.embeddings) {
      if (!Array.isArray(item) || item.some((value) => typeof value !== "number")) {
        throw new Error("Ollama returned an invalid embedding vector.");
      }
      vectors.push(normalizeVector(item as number[]));
    }
  }
  if (vectors.length !== texts.length) {
    throw new Error(`Ollama returned ${vectors.length} vectors for ${texts.length} inputs.`);
  }
  return vectors;
}

function embedTextsWithHash(texts: string[]): number[][] {
  return texts.map((text) => embedText(text));
}

export function embedText(text: string): number[] {
  const vector = new Array<number>(VECTOR_DIMENSIONS).fill(0);
  const tokens = tokenize(text);
  for (const token of tokens) {
    const hash = createHash("sha256").update(token).digest();
    const bucket = hash.readUInt32BE(0) % VECTOR_DIMENSIONS;
    const sign = hash[4] % 2 === 0 ? 1 : -1;
    vector[bucket] += sign * (1 + Math.log10(token.length));
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(6)));
}

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(8)));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9'-]{1,}/g)?.slice(0, 2000) ?? [];
}

function extractKeywords(text: string): string[] {
  const stopwords = new Set(["about", "after", "again", "before", "being", "could", "every", "from", "have", "into", "just", "like", "more", "need", "should", "that", "their", "then", "there", "these", "this", "through", "want", "what", "when", "where", "with", "would", "your"]);
  return unique(tokenize(text).filter((token) => token.length > 2 && !stopwords.has(token)), 80);
}

function classifyMemoryTypes(text: string): MemoryType[] {
  const lowered = text.toLowerCase();
  const types: MemoryType[] = [];
  if (/\b(i am|i'm|my name|i work|i live|i run|i build|my role|my company)\b/.test(lowered)) types.push("identity");
  if (/\b(i prefer|i like|i want|i need|always|never|don't|do not|hate|make sure)\b/.test(lowered)) types.push("preference");
  if (/\b(project|working on|building|repo|course|startup|product|brand)\b/.test(lowered)) types.push("project");
  if (/\b(decision|decided|we decided|i decided|going with|we will|we should)\b/.test(lowered)) types.push("decision");
  if (/\b(goal|trying to|i want to|we want to|north star|objective)\b/.test(lowered)) types.push("goal");
  if (/\b(workflow|process|steps|pipeline|handoff|automation|routine|when .* then|first .* then)\b/.test(lowered)) types.push("workflow");
  if (/\b(open loop|todo|to do|follow up|follow-up|next step|blocked|blocker|waiting on|pending|unresolved|needs? to|should check|remind|deadline)\b/.test(lowered)) types.push("open_loop");
  if (extractEntities(text).length > 0) types.push("person");
  return unique(types, 8) as MemoryType[];
}

function extractEntities(text: string): string[] {
  const ignored = new Set(["The", "This", "That", "What", "When", "Where", "Why", "How", "Create", "Decision", "Goal", "Project", "Workflow", "Memory", "Brain", "BrainForge"]);
  const names = text.match(/\b[A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,3}\b/g) ?? [];
  return unique(names.map((name) => name.trim()).filter((name) => !ignored.has(name) && !/^(I|My|We|A|An)$/.test(name)), 30);
}

function lexicalScore(queryTokens: string[], candidateTokens: string[]): number {
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;
  const candidateSet = new Set(candidateTokens);
  const matches = unique(queryTokens, 200).filter((token) => candidateSet.has(token)).length;
  return Number((matches / Math.max(1, Math.min(unique(queryTokens, 200).length, 12))).toFixed(6));
}

function entityOverlapScore(queryEntities: string[], candidateEntities: string[]): number {
  if (queryEntities.length === 0 || candidateEntities.length === 0) return 0;
  const candidateSet = new Set(candidateEntities.map((entity) => entity.toLowerCase()));
  const matches = unique(queryEntities.map((entity) => entity.toLowerCase()), 50).filter((entity) => candidateSet.has(entity)).length;
  return Number((matches / Math.max(1, queryEntities.length)).toFixed(6));
}

async function writeJsonl(pathLike: string, records: unknown[]): Promise<void> {
  await ensureDir(dirname(pathLike));
  await writeFile(pathLike, records.map((record) => JSON.stringify(record)).join("\n") + "\n", "utf8");
}

async function readJsonl<T>(pathLike: string): Promise<T[]> {
  if (!await pathExists(pathLike)) return [];
  const raw = await readFile(pathLike, "utf8");
  return raw.split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}

interface IndexManifest {
  embedding?: Partial<EmbeddingMetadata>;
}

export async function searchBrain(query: string, brainDir?: string, limit = 5, options: EmbeddingOptions = {}): Promise<SearchResult[]> {
  const paths = brainPaths(brainDir);
  const chunks = await readJsonl<ChunkRecord>(paths.chunksPath);
  const vectors = await readJsonl<VectorRecord>(paths.vectorsPath);
  const chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const manifest = await readManifest(paths.manifestPath);
  const queryVector = await embedQueryForIndex(query, manifest, options);
  const queryTokens = tokenize(query);
  const queryEntities = extractEntities(query);
  return vectors
    .map((record) => {
      const chunk = chunkMap.get(record.id);
      if (!chunk) return null;
      const vectorScore = Math.max(0, cosine(queryVector, record.vector));
      const keywordScore = lexicalScore(queryTokens, chunk.keywords.length > 0 ? chunk.keywords : tokenize(chunk.text));
      const entityScore = entityOverlapScore(queryEntities, chunk.entities);
      const score = Number(((vectorScore * 0.65) + (keywordScore * 0.25) + (entityScore * 0.1)).toFixed(6));
      return { score, vectorScore, keywordScore, entityScore, chunk };
    })
    .filter((item): item is SearchResult => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function searchMemories(
  query: string,
  brainDir?: string,
  limit = 5,
  filters: { type?: MemoryType; status?: MemoryReviewStatus } = {}
): Promise<MemorySearchResult[]> {
  const paths = brainPaths(brainDir);
  if (!await pathExists(paths.memoryIndexPath)) return [];
  const memories = (await readJsonl<MemoryRecord>(paths.memoryIndexPath))
    .filter((memory) => !filters.type || memory.type === filters.type)
    .filter((memory) => !filters.status || memory.status === filters.status)
    .filter((memory) => filters.status || memory.status === "approved");
  const queryTokens = tokenize(query);
  const queryEntities = extractEntities(query);
  return memories
    .map((memory) => {
      const memoryTokens = extractKeywords(`${memory.text} ${memory.entities.join(" ")} ${memory.sourceRefs.map((source) => source.excerpt).join(" ")}`);
      const keywordScore = lexicalScore(queryTokens, memoryTokens);
      const entityScore = entityOverlapScore(queryEntities, memory.entities);
      const recencyScore = memoryRecencyScore(memory);
      const score = Number(((keywordScore * 0.65) + (entityScore * 0.15) + (recencyScore * 0.2)).toFixed(6));
      const why = [
        keywordScore > 0 ? `keyword=${keywordScore}` : "",
        entityScore > 0 ? `entity=${entityScore}` : "",
        `recency=${recencyScore}`,
        `status=${memory.status}`,
        `type=${memory.type}`
      ].filter(Boolean);
      return { score, keywordScore, entityScore, recencyScore, memory, matchedSourceRefs: memory.sourceRefs.slice(0, 3), why };
    })
    .filter((item) => item.keywordScore > 0 || item.entityScore > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function memoryRecencyScore(memory: MemoryRecord): number {
  const timestamp = Date.parse(memory.lastConfirmedAt ?? memory.updatedAt ?? memory.observedAt ?? memory.createdAt);
  if (!Number.isFinite(timestamp)) return 0;
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  return Number((1 / (1 + ageDays / 30)).toFixed(6));
}

async function embedQueryForIndex(query: string, manifest: IndexManifest | null, options: EmbeddingOptions): Promise<number[]> {
  const providerFromManifest = manifest?.embedding?.provider === "ollama" ? "ollama" : "hash";
  if (providerFromManifest === "ollama") {
    const model = options.model ?? manifest?.embedding?.model;
    const ollamaUrl = options.ollamaUrl ?? manifest?.embedding?.ollamaUrl;
    const [vector] = await embedTextsWithOllama([query], resolveEmbeddingOptions({ provider: "ollama", model, ollamaUrl }));
    return vector;
  }
  return embedText(query);
}

async function readManifest(pathLike: string): Promise<IndexManifest | null> {
  if (!await pathExists(pathLike)) return null;
  const raw = await readFile(pathLike, "utf8");
  return raw.trim() ? JSON.parse(raw) as IndexManifest : null;
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return -1;
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) sum += a[index] * b[index];
  return Number(sum.toFixed(6));
}

interface MemoryDraftCandidate {
  text: string;
  type: MemoryType;
  sourceRef: SourceRef;
  entities: string[];
  observedAt: string;
}

interface MemoryDrafts {
  identity: MemoryDraftCandidate[];
  preferences: MemoryDraftCandidate[];
  projects: MemoryDraftCandidate[];
  decisions: MemoryDraftCandidate[];
  goals: MemoryDraftCandidate[];
  people: MemoryDraftCandidate[];
  workflows: MemoryDraftCandidate[];
  openLoops: MemoryDraftCandidate[];
}

function extractMemoryDrafts(chunks: ChunkRecord[]): MemoryDrafts {
  const drafts: MemoryDrafts = { identity: [], preferences: [], projects: [], decisions: [], goals: [], people: [], workflows: [], openLoops: [] };
  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
    const lowered = sentence.toLowerCase();
    const sourceRef = sourceRefForChunk(chunk, sentence);
    if (/\b(i am|i'm|my name|i work|i live|i run|i build|my role|my company)\b/.test(lowered)) drafts.identity.push(memoryDraftCandidate("identity", sentence, sourceRef));
    if (/\b(i prefer|i like|i want|i need|always|never|don't|do not|hate|make sure)\b/.test(lowered)) drafts.preferences.push(memoryDraftCandidate("preference", sentence, sourceRef));
    if (/\b(project|working on|building|repo|course|startup|product|brand)\b/.test(lowered)) drafts.projects.push(memoryDraftCandidate("project", sentence, sourceRef));
    if (/\b(decision|decided|we decided|i decided|going with|we will|we should)\b/.test(lowered)) drafts.decisions.push(memoryDraftCandidate("decision", sentence, sourceRef));
    if (/\b(goal|trying to|i want to|we want to|north star|objective)\b/.test(lowered)) drafts.goals.push(memoryDraftCandidate("goal", sentence, sourceRef));
    if (/\b(workflow|process|steps|pipeline|handoff|automation|routine|when .* then|first .* then)\b/.test(lowered)) drafts.workflows.push(memoryDraftCandidate("workflow", sentence, sourceRef));
    if (/\b(open loop|todo|to do|follow up|follow-up|next step|blocked|blocker|waiting on|pending|unresolved|needs? to|should check|remind|deadline)\b/.test(lowered)) drafts.openLoops.push(memoryDraftCandidate("open_loop", sentence, sourceRef));
    for (const name of sentence.match(/\b[A-Z][a-z]{2,}\b/g) ?? []) {
      if (!["The", "This", "That", "What", "When", "Where", "Claude", "Codex", "ChatGPT"].includes(name)) drafts.people.push(memoryDraftCandidate("person", name, sourceRef));
    }
    }
  }
  return {
    identity: uniqueDrafts(drafts.identity, 60),
    preferences: uniqueDrafts(drafts.preferences, 80),
    projects: uniqueDrafts(drafts.projects, 80),
    decisions: uniqueDrafts(drafts.decisions, 80),
    goals: uniqueDrafts(drafts.goals, 80),
    people: uniqueDrafts(drafts.people, 120),
    workflows: uniqueDrafts(drafts.workflows, 80),
    openLoops: uniqueDrafts(drafts.openLoops, 80)
  };
}

function memoryDraftCandidate(type: MemoryType, text: string, sourceRef: SourceRef): MemoryDraftCandidate {
  return {
    text,
    type,
    sourceRef,
    entities: extractEntities(text),
    observedAt: new Date().toISOString()
  };
}

function sourceRefForChunk(chunk: ChunkRecord, excerpt: string): SourceRef {
  return {
    chunkId: chunk.id,
    sourceFile: chunk.sourceFile,
    conversationTitle: chunk.conversationTitle,
    role: chunk.role,
    excerpt,
    citation: chunk.sourceCitation
  };
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24 && sentence.length <= 500);
}

function unique(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function uniqueDrafts(items: MemoryDraftCandidate[], limit: number): MemoryDraftCandidate[] {
  const seen = new Set<string>();
  const result: MemoryDraftCandidate[] = [];
  for (const item of items) {
    const key = item.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

async function writeExtractedMemories(brainDir: string, drafts: MemoryDrafts): Promise<void> {
  await writeGeneratedMemoryFile(join(brainDir, "00-Identity", "Extracted Profile.md"), memoryListMarkdown("Extracted Profile", drafts.identity.map((item) => item.text)));
  await writeGeneratedMemoryFile(join(brainDir, "04-Preferences", "Extracted Preferences.md"), memoryListMarkdown("Extracted Preferences", drafts.preferences.map((item) => item.text)));
  await writeGeneratedMemoryFile(join(brainDir, "01-Projects", "Extracted Projects.md"), memoryListMarkdown("Extracted Projects", drafts.projects.map((item) => item.text)));
  await writeGeneratedMemoryFile(join(brainDir, "03-Decisions", "Extracted Decisions.md"), memoryListMarkdown("Extracted Decisions", drafts.decisions.map((item) => item.text)));
  await writeGeneratedMemoryFile(join(brainDir, "05-Goals", "Extracted Goals.md"), memoryListMarkdown("Extracted Goals", drafts.goals.map((item) => item.text)));
  await writeGeneratedMemoryFile(join(brainDir, "02-People", "Extracted People.md"), memoryListMarkdown("Extracted People", drafts.people.map((item) => item.text)));
  await writeGeneratedMemoryFile(join(brainDir, "09-System", "Extracted Workflows.md"), memoryListMarkdown("Extracted Workflows", drafts.workflows.map((item) => item.text)));
  await writeGeneratedMemoryFile(join(brainDir, "07-Open Loops", "Extracted Open Loops.md"), memoryListMarkdown("Extracted Open Loops", drafts.openLoops.map((item) => item.text)));
  await updateMemoryReviewQueue(brainDir, drafts);
}

async function writeGeneratedMemoryFile(pathLike: string, content: string): Promise<void> {
  await ensureDir(dirname(pathLike));
  await backupFile(pathLike);
  await writeFile(pathLike, content, "utf8");
}

function memoryListMarkdown(title: string, items: string[]): string {
  const body = items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- No draft memories extracted yet.";
  return `# ${title}\n\nStatus: draft, machine-extracted, needs human review.\n\n${body}\n`;
}

async function updateMemoryReviewQueue(brainDir: string, drafts: MemoryDrafts): Promise<void> {
  const paths = brainPaths(brainDir);
  const previous = await readReviewQueue(paths.reviewQueuePath);
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const now = new Date().toISOString();
  const nextDrafts = [
    ...drafts.identity.map((item) => queueItemDraft("identity", join(brainDir, "00-Identity", "Extracted Profile.md"), item, now)),
    ...drafts.preferences.map((item) => queueItemDraft("preferences", join(brainDir, "04-Preferences", "Extracted Preferences.md"), item, now)),
    ...drafts.projects.map((item) => queueItemDraft("projects", join(brainDir, "01-Projects", "Extracted Projects.md"), item, now)),
    ...drafts.decisions.map((item) => queueItemDraft("decisions", join(brainDir, "03-Decisions", "Extracted Decisions.md"), item, now)),
    ...drafts.goals.map((item) => queueItemDraft("goals", join(brainDir, "05-Goals", "Extracted Goals.md"), item, now)),
    ...drafts.people.map((item) => queueItemDraft("people", join(brainDir, "02-People", "Extracted People.md"), item, now)),
    ...drafts.workflows.map((item) => queueItemDraft("workflows", join(brainDir, "09-System", "Extracted Workflows.md"), item, now)),
    ...drafts.openLoops.map((item) => queueItemDraft("open_loops", join(brainDir, "07-Open Loops", "Extracted Open Loops.md"), item, now))
  ];
  const merged = nextDrafts.map((item) => {
    const existing = previousById.get(item.id);
    return existing ? {
      ...item,
      text: existing.editedAt ? existing.text : item.text,
      entities: existing.editedAt ? existing.entities : item.entities,
      sourceRefs: existing.editedAt && existing.sourceRefs?.length ? existing.sourceRefs : item.sourceRefs,
      status: existing.status,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      lastConfirmedAt: existing.lastConfirmedAt,
      originalText: existing.originalText,
      editedAt: existing.editedAt
    } : item;
  });
  await writeReviewQueue(paths.reviewQueuePath, merged);
  await writeMemoryIndex(paths.memoryIndexPath, merged);
}

function queueItemDraft(section: string, file: string, draft: MemoryDraftCandidate, now: string): MemoryReviewItem {
  return {
    id: memoryReviewId(section, draft.text),
    section,
    file,
    text: draft.text,
    memoryType: draft.type,
    sourceFile: draft.sourceRef.sourceFile,
    conversationTitle: draft.sourceRef.conversationTitle,
    sourceCitation: draft.sourceRef.citation,
    evidence: draft.sourceRef.excerpt,
    sourceRefs: [draft.sourceRef],
    entities: draft.entities,
    observedAt: draft.observedAt,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    source: "extracted"
  };
}

function memoryReviewId(section: string, text: string): string {
  return createHash("sha256").update(`${section}:${text}`).digest("hex").slice(0, 12);
}

async function readReviewQueue(pathLike: string): Promise<MemoryReviewItem[]> {
  if (!await pathExists(pathLike)) return [];
  const raw = await readFile(pathLike, "utf8");
  const parsed = raw.trim() ? JSON.parse(raw) as unknown : [];
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isMemoryReviewItem);
}

function isMemoryReviewItem(value: unknown): value is MemoryReviewItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MemoryReviewItem>;
  return typeof item.id === "string"
    && typeof item.section === "string"
    && typeof item.file === "string"
    && typeof item.text === "string"
    && (item.status === "pending" || item.status === "approved" || item.status === "rejected" || item.status === "outdated");
}

async function writeReviewQueue(pathLike: string, items: MemoryReviewItem[]): Promise<void> {
  await ensureDir(dirname(pathLike));
  await backupFile(pathLike);
  await writeFile(pathLike, JSON.stringify(items, null, 2) + "\n", "utf8");
}

async function writeMemoryIndex(pathLike: string, items: MemoryReviewItem[]): Promise<void> {
  const records = items.map(memoryRecordFromReviewItem);
  await writeJsonl(pathLike, records);
}

function memoryRecordFromReviewItem(item: MemoryReviewItem): MemoryRecord {
  const type = normalizeMemoryType(item.memoryType ?? item.section);
  const now = item.updatedAt || item.createdAt;
  return {
    id: item.id,
    type,
    text: item.text,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    observedAt: item.observedAt ?? item.createdAt,
    lastConfirmedAt: item.lastConfirmedAt,
    sourceRefs: item.sourceRefs?.length ? item.sourceRefs : [{
      chunkId: "unknown",
      sourceFile: item.sourceFile ?? item.file,
      conversationTitle: item.conversationTitle ?? "Unknown conversation",
      role: "unknown",
      excerpt: item.evidence ?? item.text,
      citation: item.sourceCitation ?? item.file
    }],
    entities: item.entities ?? extractEntities(item.text)
  };
}

function normalizeMemoryType(value: string): MemoryType {
  const normalized = value.toLowerCase().replace(/s$/, "");
  if (normalized === "preference") return "preference";
  if (normalized === "identity") return "identity";
  if (normalized === "decision") return "decision";
  if (normalized === "project") return "project";
  if (normalized === "goal") return "goal";
  if (normalized === "person" || normalized === "people") return "person";
  if (normalized === "workflow") return "workflow";
  if (normalized === "open_loop" || normalized === "open loop" || normalized === "openloop") return "open_loop";
  return "project";
}

export async function saveMemory(brainDir: string | undefined, section: string, title: string, content: string): Promise<string> {
  const paths = brainPaths(brainDir);
  const safeSection = sanitizePathPart(section || "06-Conversations") || "06-Conversations";
  const safeTitle = sanitizePathPart(title || `Memory ${new Date().toISOString()}`) || `Memory ${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const filePath = resolve(paths.brainDir, safeSection, `${safeTitle}.md`);
  if (!isInsideDirectory(paths.brainDir, filePath)) throw new Error("Refusing to write outside the brain directory.");
  await writeNewFile(filePath, `# ${title}\n\n${content.trim()}\n`);
  return filePath;
}

export async function readMemory(brainDir: string | undefined, relativePath: string): Promise<string> {
  const paths = brainPaths(brainDir);
  const target = resolve(paths.brainDir, relativePath);
  if (!isInsideDirectory(paths.brainDir, target)) throw new Error("Refusing to read outside the brain directory.");
  return readFile(target, "utf8");
}

export async function reviewDraftMemories(options: ReviewOptions = {}): Promise<Record<string, unknown>> {
  const paths = brainPaths(options.brainDir);
  const queue = await readReviewQueue(paths.reviewQueuePath);
  const approveIds = new Set(options.approve ?? []);
  const rejectIds = new Set(options.reject ?? []);
  const outdateIds = new Set(options.outdate ?? []);
  const editId = options.editId?.trim();
  const editText = options.editText?.trim();
  if ((editId && !editText) || (!editId && editText)) {
    throw new Error("Editing requires both --edit ID and --text TEXT.");
  }
  if (!options.approveAll && approveIds.size === 0 && rejectIds.size === 0 && outdateIds.size === 0 && !editId) {
    return {
      action: "list",
      count: queue.length,
      pending: queue.filter((item) => item.status === "pending").length,
      approved: queue.filter((item) => item.status === "approved").length,
      rejected: queue.filter((item) => item.status === "rejected").length,
      outdated: queue.filter((item) => item.status === "outdated").length,
      items: queue
    };
  }

  const now = new Date().toISOString();
  const toApprove = new Set<string>();
  const toReject = new Set<string>();
  const toOutdate = new Set<string>();
  for (const item of queue) {
    if (options.approveAll && item.status === "pending") toApprove.add(item.id);
    if (approveIds.has(item.id)) toApprove.add(item.id);
    if (rejectIds.has(item.id)) toReject.add(item.id);
    if (outdateIds.has(item.id)) toOutdate.add(item.id);
  }
  for (const id of toReject) toApprove.delete(id);
  for (const id of toOutdate) {
    toApprove.delete(id);
    toReject.delete(id);
  }

  const knownIds = new Set(queue.map((item) => item.id));
  const unknownApprove = [...approveIds].filter((id) => !knownIds.has(id));
  const unknownReject = [...rejectIds].filter((id) => !knownIds.has(id));
  const unknownOutdate = [...outdateIds].filter((id) => !knownIds.has(id));
  const unknownEdit = editId && !knownIds.has(editId) ? [editId] : [];
  if (unknownApprove.length > 0 || unknownReject.length > 0 || unknownOutdate.length > 0 || unknownEdit.length > 0) {
    throw new Error(`Unknown review id(s): ${[...unknownApprove, ...unknownReject, ...unknownOutdate, ...unknownEdit].join(", ")}`);
  }

  const newlyApproved: MemoryReviewItem[] = [];
  let edited = 0;
  const updated = queue.map((item) => {
    let next = item;
    if (editId && editText && item.id === editId) {
      edited += 1;
      next = {
        ...next,
        text: editText,
        originalText: next.originalText ?? next.text,
        editedAt: now,
        updatedAt: now,
        lastConfirmedAt: now,
        entities: extractEntities(editText)
      };
    }
    if (toApprove.has(item.id)) {
      const approved = { ...next, status: "approved" as const, updatedAt: now, lastConfirmedAt: now };
      if (item.status !== "approved") newlyApproved.push(approved);
      return approved;
    }
    if (toReject.has(item.id)) return { ...next, status: "rejected" as const, updatedAt: now };
    if (toOutdate.has(item.id)) return { ...next, status: "outdated" as const, updatedAt: now };
    return next;
  });
  await writeReviewQueue(paths.reviewQueuePath, updated);
  await writeMemoryIndex(paths.memoryIndexPath, updated);

  const reviewedPath = join(paths.brainDir, "09-System", "Reviewed Memories.md");
  if (newlyApproved.length > 0) {
    await ensureDir(dirname(reviewedPath));
    const body = newlyApproved.map((item) => `- ${item.id} [${item.section}] ${item.text}`).join("\n");
    await appendFile(reviewedPath, `\n## Approved ${now}\n\n${body}\n`, "utf8");
  }

  return {
    action: options.approveAll ? "approve-all" : "update",
    approved: toApprove.size,
    rejected: toReject.size,
    outdated: toOutdate.size,
    edited,
    reviewedPath,
    queuePath: paths.reviewQueuePath,
    memoryIndexPath: paths.memoryIndexPath
  };
}

async function readDraftMemoryItems(brainDir: string): Promise<DraftMemoryItem[]> {
  const paths = brainPaths(brainDir);
  return (await readReviewQueue(paths.reviewQueuePath)).map((item) => ({
    id: item.id,
    section: item.section,
    file: item.file,
    text: item.text
  }));
}

export function companyPhases(): CompanyPhaseDefinition[] {
  return COMPANY_PHASES.map((phase) => ({
    ...phase,
    exitCriteria: [...phase.exitCriteria]
  }));
}

export async function startCompanyTask(options: StartCompanyTaskOptions): Promise<Record<string, unknown>> {
  const objective = options.objective.trim();
  if (!objective) throw new Error("Company task objective is required.");

  const paths = brainPaths(options.brainDir);
  const title = normalizeTaskTitle(options.title, objective);
  const id = createCompanyTaskId(title);
  const now = new Date().toISOString();
  const phases = COMPANY_PHASES.map((definition, index): CompanyTaskPhase => ({
    id: definition.id,
    label: definition.label,
    owner: definition.owner,
    status: index === 0 ? "in_progress" : "pending",
    startedAt: index === 0 ? now : undefined,
    packetPath: phasePacketPath(paths, id, definition.id)
  }));
  const task: CompanyTask = {
    id,
    title,
    objective,
    status: "active",
    currentPhase: COMPANY_PHASES[0].id,
    createdAt: now,
    updatedAt: now,
    phases
  };

  await ensureDir(companyTaskDir(paths, id));
  await writeNewFile(join(paths.tasksDir, "README.md"), companyTasksReadmeMarkdown());
  await writeCompanyPhasePacket(paths, task, phases[0]);
  await writeCompanyTask(paths, task);
  await writeCompanyTaskReadme(paths, task);

  const currentPhase = phases[0];
  return {
    status: "success",
    summary: `Started company task ${id}. ${currentPhase.owner} owns ${currentPhase.label}.`,
    task: companyTaskView(paths, task),
    next_actions: [
      `Open ${currentPhase.packetPath}`,
      `Have ${currentPhase.owner} complete ${currentPhase.label}.`,
      `Run: brainforge company advance --task ${id} --summary "..."`
    ],
    artifacts: [
      companyTaskDir(paths, id),
      companyTaskJsonPath(paths, id),
      currentPhase.packetPath
    ]
  };
}

export async function listCompanyTasks(brainDir?: string): Promise<Record<string, unknown>> {
  const paths = brainPaths(brainDir);
  const tasks = await readCompanyTasks(paths);
  const active = tasks.filter((task) => task.status === "active").length;
  return {
    status: tasks.length > 0 ? "success" : "warning",
    summary: tasks.length > 0 ? `${tasks.length} company task(s), ${active} active.` : "No company tasks exist yet.",
    count: tasks.length,
    active,
    tasks: tasks.map((task) => companyTaskView(paths, task)),
    next_actions: tasks.length > 0
      ? ["Run: brainforge company status --task TASK_ID", "Run: brainforge company advance --task TASK_ID --summary \"...\""]
      : ["Run: brainforge company start --objective \"...\""]
  };
}

export async function getCompanyTask(brainDir?: string, taskId?: string): Promise<Record<string, unknown>> {
  const paths = brainPaths(brainDir);
  const task = await resolveCompanyTask(paths, taskId);
  const current = currentCompanyPhase(task);
  return {
    status: "success",
    summary: current
      ? `${task.id} is in ${current.label}, owned by ${current.owner}.`
      : `${task.id} is completed.`,
    task: companyTaskView(paths, task),
    next_actions: current
      ? [
        `Open ${current.packetPath}`,
        `Have ${current.owner} complete ${current.label}.`,
        `Run: brainforge company advance --task ${task.id} --summary "..."`
      ]
      : ["Review the release handoff and archive the task when ready."]
  };
}

export async function advanceCompanyTask(options: AdvanceCompanyTaskOptions): Promise<Record<string, unknown>> {
  const summary = options.summary.trim();
  if (!summary) throw new Error("Company task advance requires --summary.");

  const paths = brainPaths(options.brainDir);
  const task = await resolveCompanyTask(paths, options.taskId);
  if (task.status === "completed") throw new Error(`Company task ${task.id} is already completed.`);

  const currentIndex = task.phases.findIndex((phase) => phase.id === task.currentPhase);
  if (currentIndex < 0) throw new Error(`Company task ${task.id} has no active phase.`);

  const current = task.phases[currentIndex];
  const next = task.phases[currentIndex + 1];
  const now = new Date().toISOString();
  const handoffPath = await createHandoff(options.brainDir, {
    phase: current.id,
    fromAgent: current.owner,
    toAgent: next?.owner ?? "Release Archive",
    summary,
    taskId: task.id,
    evidence: options.evidence,
    nextSteps: options.nextSteps,
    openQuestions: options.openQuestions
  });

  const phases: CompanyTaskPhase[] = task.phases.map((phase, index) => {
    if (index === currentIndex) {
      return { ...phase, status: "complete", completedAt: now, handoffPath };
    }
    if (index === currentIndex + 1) {
      return { ...phase, status: "in_progress", startedAt: phase.startedAt ?? now };
    }
    return phase;
  });

  const updatedTask: CompanyTask = {
    ...task,
    status: next ? "active" : "completed",
    currentPhase: next?.id,
    updatedAt: now,
    phases
  };
  if (!next) delete updatedTask.currentPhase;

  const nextPhase = next ? phases[currentIndex + 1] : undefined;
  if (nextPhase) await writeCompanyPhasePacket(paths, updatedTask, nextPhase);
  await writeCompanyTask(paths, updatedTask);
  await writeCompanyTaskReadme(paths, updatedTask);

  return {
    status: "success",
    summary: nextPhase
      ? `Completed ${current.label}; ${nextPhase.owner} now owns ${nextPhase.label}.`
      : `Completed ${current.label}; company task ${task.id} is ready for release archive.`,
    task: companyTaskView(paths, updatedTask),
    next_actions: nextPhase
      ? [
        `Open ${nextPhase.packetPath}`,
        `Have ${nextPhase.owner} complete ${nextPhase.label}.`,
        `Run: brainforge company advance --task ${task.id} --summary "..."`
      ]
      : ["Run: brainforge doctor --strict", "Review docs/RELEASE_CHECKLIST.md before publishing."],
    artifacts: [
      handoffPath,
      companyTaskJsonPath(paths, task.id),
      ...(nextPhase?.packetPath ? [nextPhase.packetPath] : [])
    ]
  };
}

export function orchestrationProtocol(): Record<string, unknown> {
  return {
    loop: COMPANY_PHASES.map((phase) => phase.id),
    phases: companyPhases(),
    roles: [
      { name: "Planner", owns: "scope, milestones, acceptance criteria, context budget" },
      { name: "Researcher", owns: "official docs, prior art, risks, evidence links" },
      { name: "Architect", owns: "system design, data model, interfaces, extension points" },
      { name: "Builder", owns: "implementation in small verifiable changes and review fixes" },
      { name: "Tester", owns: "unit, integration, smoke, fixture, and regression checks" },
      { name: "Security Reviewer", owns: "privacy, secrets, config writes, prompt injection, destructive action gates" },
      { name: "Docs/Release Engineer", owns: "README, examples, package metadata, publish checklist" },
      { name: "Critic", owns: "independent review against the actual objective" }
    ],
    taskRuntime: {
      state: "10-Orchestration/Tasks/<task-id>/company-task.json",
      commands: [
        "brainforge company start --objective \"...\"",
        "brainforge company status --task TASK_ID",
        "brainforge company advance --task TASK_ID --summary \"...\""
      ],
      mcpTools: ["start_company_task", "get_company_task", "advance_company_task"]
    },
    handoffRule: "Every phase ends with a Markdown handoff containing summary, evidence, risks, open questions, next owner, and next steps.",
    contextRule: "Each specialized agent reads only the objective, current plan, relevant memory search results, previous handoff, and files needed for that role."
  };
}

function normalizeTaskTitle(title: string | undefined, objective: string): string {
  const firstLine = objective.split("\n").find((line) => line.trim()) ?? "BrainForge company task";
  const firstSentence = firstLine.split(/[.!?]/).find((part) => part.trim()) ?? firstLine;
  return (title?.trim() || firstSentence.trim() || "BrainForge company task").replace(/\s+/g, " ").slice(0, 120);
}

function createCompanyTaskId(title: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const suffix = createHash("sha256").update(`${title}:${Date.now()}:${Math.random()}`).digest("hex").slice(0, 6);
  return `${stamp}-${slugify(title, "task")}-${suffix}`;
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

function sanitizeTaskId(value: string): string {
  const safe = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!safe) throw new Error("Invalid company task id.");
  return safe;
}

function companyTaskDir(paths: BrainPaths, taskId: string): string {
  return join(paths.tasksDir, sanitizeTaskId(taskId));
}

function companyTaskJsonPath(paths: BrainPaths, taskId: string): string {
  return join(companyTaskDir(paths, taskId), "company-task.json");
}

function phasePacketPath(paths: BrainPaths, taskId: string, phaseId: CompanyPhaseId): string {
  const index = COMPANY_PHASES.findIndex((phase) => phase.id === phaseId);
  if (index < 0) throw new Error(`Unknown company phase: ${phaseId}`);
  return join(companyTaskDir(paths, taskId), "phases", `${String(index + 1).padStart(2, "0")}-${phaseId}.md`);
}

function phaseDefinition(phaseId: CompanyPhaseId): CompanyPhaseDefinition {
  const definition = COMPANY_PHASES.find((phase) => phase.id === phaseId);
  if (!definition) throw new Error(`Unknown company phase: ${phaseId}`);
  return definition;
}

async function writeCompanyTask(paths: BrainPaths, task: CompanyTask): Promise<void> {
  const pathLike = companyTaskJsonPath(paths, task.id);
  await ensureDir(dirname(pathLike));
  await writeFile(pathLike, JSON.stringify(task, null, 2) + "\n", "utf8");
}

async function writeCompanyTaskReadme(paths: BrainPaths, task: CompanyTask): Promise<void> {
  const lines = task.phases.map((phase) => {
    const status = phase.status === "complete" ? "complete" : phase.status === "in_progress" ? "in_progress" : "pending";
    const packet = phase.packetPath ? ` Packet: ${phase.packetPath}` : "";
    const handoff = phase.handoffPath ? ` Handoff: ${phase.handoffPath}` : "";
    return `- ${status}: ${phase.label} (${phase.owner}).${packet}${handoff}`;
  }).join("\n");
  const content = `# ${task.title}

Task ID: ${task.id}
Status: ${task.status}
Current phase: ${task.currentPhase ?? "completed"}

## Objective

${task.objective}

## Phases

${lines}
`;
  await writeFile(join(companyTaskDir(paths, task.id), "README.md"), content, "utf8");
}

async function writeCompanyPhasePacket(paths: BrainPaths, task: CompanyTask, phase: CompanyTaskPhase): Promise<string> {
  const definition = phaseDefinition(phase.id);
  const packetPath = phase.packetPath ?? phasePacketPath(paths, task.id, phase.id);
  const phaseIndex = COMPANY_PHASES.findIndex((item) => item.id === phase.id);
  const previousHandoffs = task.phases
    .slice(0, phaseIndex)
    .filter((item) => item.handoffPath)
    .map((item) => `- ${item.label}: ${item.handoffPath}`)
    .join("\n");
  const exitCriteria = definition.exitCriteria.map((item) => `- ${item}`).join("\n");
  const content = `# ${definition.label} Packet

Task: ${task.title}
Task ID: ${task.id}
Owner: ${definition.owner}
Status: ${phase.status}

## Objective

${task.objective}

## Scoped Inputs

- This packet.
- Relevant BrainForge memory search results.
- Previous handoff files:
${previousHandoffs || "- None. This is the first phase."}
- Only the project files needed for this phase.

## Work

${definition.goal}

## Exit Criteria

${exitCriteria}

## Completion Command

\`\`\`bash
brainforge company advance --task ${task.id} --summary "what this phase completed" --evidence "files, commands, links, or decisions" --next "recommended next steps" --questions "open questions"
\`\`\`

## Context Rule

Do not carry a full transcript forward. Put the durable truth in the handoff and let the next owner load only this task, the prior handoff, and the files they need.
`;
  await writeNewFile(packetPath, content);
  return packetPath;
}

async function readCompanyTasks(paths: BrainPaths): Promise<CompanyTask[]> {
  if (!await pathExists(paths.tasksDir)) return [];
  const entries = await readdir(paths.tasksDir, { withFileTypes: true });
  const tasks: CompanyTask[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const task = await readCompanyTaskFile(join(paths.tasksDir, entry.name, "company-task.json"));
    if (task) tasks.push(task);
  }
  return tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function resolveCompanyTask(paths: BrainPaths, taskId?: string): Promise<CompanyTask> {
  if (taskId) {
    const task = await readCompanyTaskFile(companyTaskJsonPath(paths, taskId));
    if (!task) throw new Error(`Company task not found: ${taskId}`);
    return task;
  }
  const tasks = await readCompanyTasks(paths);
  const active = tasks.find((task) => task.status === "active");
  if (active) return active;
  if (tasks[0]) return tasks[0];
  throw new Error("No company tasks found. Run: brainforge company start --objective \"...\"");
}

async function readCompanyTaskFile(pathLike: string): Promise<CompanyTask | null> {
  if (!await pathExists(pathLike)) return null;
  const raw = await readFile(pathLike, "utf8");
  const parsed = raw.trim() ? JSON.parse(raw) as unknown : null;
  return isCompanyTask(parsed) ? parsed : null;
}

function isCompanyTask(value: unknown): value is CompanyTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<CompanyTask>;
  return typeof task.id === "string"
    && typeof task.title === "string"
    && typeof task.objective === "string"
    && (task.status === "active" || task.status === "completed")
    && typeof task.createdAt === "string"
    && typeof task.updatedAt === "string"
    && (task.currentPhase === undefined || isCompanyPhaseId(task.currentPhase))
    && Array.isArray(task.phases)
    && task.phases.every(isCompanyTaskPhase);
}

function isCompanyTaskPhase(value: unknown): value is CompanyTaskPhase {
  if (!value || typeof value !== "object") return false;
  const phase = value as Partial<CompanyTaskPhase>;
  return isCompanyPhaseId(phase.id)
    && typeof phase.label === "string"
    && typeof phase.owner === "string"
    && (phase.status === "pending" || phase.status === "in_progress" || phase.status === "complete");
}

function isCompanyPhaseId(value: unknown): value is CompanyPhaseId {
  return typeof value === "string" && COMPANY_PHASES.some((phase) => phase.id === value);
}

function currentCompanyPhase(task: CompanyTask): CompanyTaskPhase | undefined {
  return task.phases.find((phase) => phase.id === task.currentPhase) ?? task.phases.find((phase) => phase.status === "in_progress");
}

function companyTaskView(paths: BrainPaths, task: CompanyTask): Record<string, unknown> {
  return {
    ...task,
    taskDir: companyTaskDir(paths, task.id),
    taskPath: companyTaskJsonPath(paths, task.id),
    currentPhaseDetails: currentCompanyPhase(task) ?? null
  };
}

export async function createHandoff(brainDir: string | undefined, input: HandoffInput): Promise<string> {
  const paths = brainPaths(brainDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safePhase = sanitizePathPart(input.phase || "handoff").replace(/\//g, "-");
  const filePath = join(paths.brainDir, "10-Orchestration", "Handoffs", `${timestamp}-${safePhase}.md`);
  const content = `# ${input.phase} Handoff

From: ${input.fromAgent}
To: ${input.toAgent}
${input.taskId ? `Task ID: ${input.taskId}\n` : ""}Date: ${new Date().toISOString()}

## Summary

${input.summary.trim()}

## Evidence

${input.evidence?.trim() || "- No evidence recorded."}

## Next Steps

${input.nextSteps?.trim() || "- No next steps recorded."}

## Open Questions

${input.openQuestions?.trim() || "- None recorded."}
`;
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content, "utf8");
  return filePath;
}

function sanitizePathPart(value: string): string {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9 ._-]/g, "").trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function isInsideDirectory(root: string, target: string): boolean {
  const relation = relative(resolve(root), resolve(target));
  return relation === "" || (!relation.startsWith("..") && !relation.startsWith("/") && !relation.includes(`..${"/"}`));
}

async function backupFile(pathLike: string): Promise<string | null> {
  if (!await pathExists(pathLike)) return null;
  const backupRoot = join(homedir(), ".brainforge", "backups", new Date().toISOString().replace(/[:.]/g, "-"));
  await ensureDir(backupRoot);
  const backupPath = join(backupRoot, pathLike.replace(/^\//, "").replace(/\//g, "__"));
  await copyFile(pathLike, backupPath);
  return backupPath;
}

export async function configureAdapters(brainDir: string): Promise<Record<string, unknown>> {
  const backups: string[] = [];
  const changes: string[] = [];

  const claudeConfigPath = join(homedir(), ".claude.json");
  const claudeBackup = await backupFile(claudeConfigPath);
  if (claudeBackup) backups.push(claudeBackup);
  await upsertClaudeMcp(claudeConfigPath, brainDir);
  changes.push(claudeConfigPath);

  const codexDir = join(homedir(), ".codex");
  await ensureDir(codexDir);
  const codexConfigPath = join(codexDir, "config.toml");
  const codexBackup = await backupFile(codexConfigPath);
  if (codexBackup) backups.push(codexBackup);
  await upsertCodexMcp(codexConfigPath, brainDir);
  changes.push(codexConfigPath);

  const codexAgentsPath = join(codexDir, "AGENTS.md");
  const codexAgentsBackup = await backupFile(codexAgentsPath);
  if (codexAgentsBackup) backups.push(codexAgentsBackup);
  await upsertMarkedSection(codexAgentsPath, codexGlobalInstructions(brainDir));
  changes.push(codexAgentsPath);

  const claudeDir = join(homedir(), ".claude");
  await ensureDir(claudeDir);
  const claudeMdPath = join(claudeDir, "CLAUDE.md");
  const claudeMdBackup = await backupFile(claudeMdPath);
  if (claudeMdBackup) backups.push(claudeMdBackup);
  await upsertMarkedSection(claudeMdPath, claudeGlobalInstructions(brainDir));
  changes.push(claudeMdPath);

  return { configured: true, backups, changes };
}

async function upsertClaudeMcp(configPath: string, brainDir: string): Promise<void> {
  let config: Record<string, unknown> = {};
  if (await pathExists(configPath)) {
    const raw = await readFile(configPath, "utf8");
    config = raw.trim() ? JSON.parse(raw) as Record<string, unknown> : {};
  }
  const mcpServers = (config.mcpServers && typeof config.mcpServers === "object")
    ? config.mcpServers as Record<string, unknown>
    : {};
  mcpServers.brainforge = { command: "brainforge", args: ["mcp", "--brain-dir", brainDir], env: {} };
  config.mcpServers = mcpServers;
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

async function upsertCodexMcp(configPath: string, brainDir: string): Promise<void> {
  const existing = await pathExists(configPath) ? await readFile(configPath, "utf8") : "";
  if (existing.includes("[mcp_servers.brainforge]")) return;
  const addition = [
    "",
    "# BrainForge shared AI-Brain MCP server",
    "[mcp_servers.brainforge]",
    'command = "brainforge"',
    `args = ["mcp", "--brain-dir", ${tomlString(brainDir)}]`,
    ""
  ].join("\n");
  await appendFile(configPath, addition, "utf8");
}

function tomlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function upsertMarkedSection(pathLike: string, section: string): Promise<void> {
  const start = "<!-- brainforge:start -->";
  const end = "<!-- brainforge:end -->";
  const existing = await pathExists(pathLike) ? await readFile(pathLike, "utf8") : "";
  const block = `${start}\n${section.trim()}\n${end}\n`;
  const next = existing.includes(start) && existing.includes(end)
    ? existing.replace(new RegExp(`${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}\\n?`), block)
    : `${existing.trim() ? `${existing.trim()}\n\n` : ""}${block}`;
  await ensureDir(dirname(pathLike));
  await writeFile(pathLike, next, "utf8");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function doctor(brainDir?: string): Promise<DoctorCheck[]> {
  const paths = brainPaths(brainDir);
  const checks: DoctorCheck[] = [];
  checks.push(await existsCheck("Brain directory", paths.brainDir, "AI-Brain folder exists."));
  checks.push(await existsCheck("Imports instructions", join(paths.brainDir, "README.md"), "Vault README exists."));
  checks.push(await existsCheck("Claude instructions", join(paths.brainDir, "CLAUDE.md"), "Vault CLAUDE.md exists."));
  checks.push(await existsCheck("Codex instructions", join(paths.brainDir, "AGENTS.md"), "Vault AGENTS.md exists."));
  checks.push(await existsCheck("Obsidian recommendations", join(paths.brainDir, "09-System", "Recommended Obsidian Plugins.md"), "Obsidian plugin recommendations exist."));
  checks.push(await existsCheck("Agent orchestration protocol", join(paths.brainDir, "09-System", "Agent Company Operating System.md"), "Multi-agent operating protocol exists."));
  checks.push(await existsCheck("Context window protocol", join(paths.brainDir, "09-System", "Context Window Protocol.md"), "Context-window handoff protocol exists."));
  checks.push(await existsCheck("Scoped agent role prompts", join(paths.brainDir, "10-Orchestration", "Agents", "Planner.md"), "Scoped agent role prompts exist."));
  checks.push(await existsCheck("Company task runtime", join(paths.tasksDir, "README.md"), "Tracked company task runtime exists."));
  checks.push(await existsCheck("Chunk index", paths.chunksPath, "Embeddings chunk index exists.", "Run brainforge import after adding exports."));
  checks.push(await existsCheck("Vector index", paths.vectorsPath, "Vector index exists.", "Run brainforge import after adding exports."));
  checks.push(await embeddingManifestCheck(paths.manifestPath));
  checks.push(await memoryReviewCheck(paths.brainDir));

  const claudeConfigPath = join(homedir(), ".claude.json");
  const codexConfigPath = join(homedir(), ".codex", "config.toml");
  checks.push(await containsCheck("Claude MCP adapter", claudeConfigPath, "brainforge", "Claude user config includes BrainForge MCP.", "Run brainforge setup --configure."));
  checks.push(await containsCheck("Codex MCP adapter", codexConfigPath, "[mcp_servers.brainforge]", "Codex config includes BrainForge MCP.", "Run brainforge setup --configure."));
  return checks;
}

async function memoryReviewCheck(brainDir: string): Promise<DoctorCheck> {
  const paths = brainPaths(brainDir);
  const queue = await readReviewQueue(paths.reviewQueuePath);
  const pending = queue.filter((item) => item.status === "pending").length;
  const approved = queue.filter((item) => item.status === "approved").length;
  const reviewedPath = join(brainDir, "09-System", "Reviewed Memories.md");
  if (queue.length === 0) {
    return { name: "Memory review", status: "warn", message: "No draft memories found yet. Run brainforge import after adding exports." };
  }
  if (approved > 0 && await pathExists(reviewedPath)) {
    return { name: "Memory review", status: "pass", message: `${approved} reviewed memory item(s), ${pending} pending.` };
  }
  return { name: "Memory review", status: "warn", message: `${pending} draft memories exist but have not been approved. Run brainforge review, then approve selected IDs or use --approve-all.` };
}

async function embeddingManifestCheck(manifestPath: string): Promise<DoctorCheck> {
  const manifest = await readManifest(manifestPath);
  if (!manifest?.embedding) {
    return { name: "Embedding provider", status: "warn", message: "No embedding manifest yet. Run brainforge import after adding exports." };
  }
  if (manifest.embedding.provider === "ollama") {
    return {
      name: "Embedding provider",
      status: "pass",
      message: `Using local Ollama embeddings${manifest.embedding.model ? ` (${manifest.embedding.model})` : ""}.`
    };
  }
  const suffix = manifest.embedding.fallbackReason ? ` Fallback reason: ${manifest.embedding.fallbackReason}` : "";
  return {
    name: "Embedding provider",
    status: "warn",
    message: `Using deterministic local hash embeddings. Install Ollama and run import with --embedding-provider ollama for stronger semantic recall.${suffix}`
  };
}

async function existsCheck(name: string, pathLike: string, pass: string, warn?: string): Promise<DoctorCheck> {
  return await pathExists(pathLike)
    ? { name, status: "pass", message: pass }
    : { name, status: warn ? "warn" : "fail", message: warn ?? `${pathLike} is missing.` };
}

async function containsCheck(name: string, pathLike: string, needle: string, pass: string, warn: string): Promise<DoctorCheck> {
  if (!await pathExists(pathLike)) return { name, status: "warn", message: warn };
  const raw = await readFile(pathLike, "utf8");
  return raw.includes(needle)
    ? { name, status: "pass", message: pass }
    : { name, status: "warn", message: warn };
}

export async function statsFor(pathLike: string): Promise<{ size: number; modified: string } | null> {
  if (!await pathExists(pathLike)) return null;
  const info = await stat(pathLike);
  return { size: info.size, modified: info.mtime.toISOString() };
}

function homeMarkdown(): string {
  return `# AI-Brain\n\nThis vault is managed by BrainForge.\n\n## Start Here\n\n- [[00-Identity/Extracted Profile]]\n- [[04-Preferences/Extracted Preferences]]\n- [[01-Projects/Extracted Projects]]\n- [[03-Decisions/Extracted Decisions]]\n- [[05-Goals/Extracted Goals]]\n\n## Operating Rule\n\nRaw imports are evidence. Extracted memories are draft until reviewed by the user.\n`;
}

function vaultReadme(importsDir: string): string {
  return `# BrainForge AI-Brain Vault\n\nPut AI exports into:\n\n${importsDir}\n\nThen run:\n\n\`\`\`bash\nbrainforge import\nbrainforge doctor\n\`\`\`\n\nThis vault is plain Markdown so Obsidian, Claude Code, Codex, and normal text tools can all read it.\n`;
}

function agentsMarkdown(): string {
  return `# BrainForge AGENTS.md\n\nUse this AI-Brain as shared user memory.\n\n## Rules\n\n- Search the BrainForge MCP server before asking the user to re-explain old context.\n- Treat extracted memories as draft unless they are marked reviewed.\n- Prefer reading specific notes over loading the whole vault.\n- Never delete or overwrite raw imports without explicit user approval.\n- Save durable decisions, preferences, project context, and reusable procedures back to this vault.\n`;
}

function claudeMarkdown(): string {
  return `# BrainForge CLAUDE.md\n\nUse this AI-Brain as shared user memory.\n\n## Always-On Behavior\n\n- Use the BrainForge MCP tools for targeted recall.\n- Keep replies grounded in reviewed memory when possible.\n- If memory is unreviewed or uncertain, say so briefly.\n- Save durable facts only when they will help future sessions.\n- Do not silently modify global tool configuration.\n`;
}

function obsidianPluginsMarkdown(): string {
  return `# Recommended Obsidian Plugins\n\nBrainForge does not silently install Obsidian plugins in the MVP. Recommended plugins:\n\n- Dataview: dashboards over memory files.\n- Templater: reusable note templates.\n- Omnisearch: fast local search inside Obsidian.\n- Advanced URI: deep links from external tools.\n- Git: version history and backups.\n\nOpen Obsidian, choose this folder as a vault, then install only the plugins you trust.\n`;
}

function memoryReviewPolicyMarkdown(): string {
  return `# Memory Review Policy\n\nBrainForge separates raw evidence from trusted memory.\n\n## Levels\n\n- raw: imported exports and source files.\n- draft: machine-extracted memories that need review.\n- reviewed: user-approved memory.\n- deprecated: old memory retained for history but not active guidance.\n\nAgents should prefer reviewed memory and clearly label draft memory when using it.\n`;
}

function agentRolePrompts(): Array<{ fileName: string; content: string }> {
  const roles = [
    ["Planner", "Turn the objective into concrete requirements, acceptance criteria, phase order, risks, and context budget."],
    ["Researcher", "Gather current official docs, prior art, implementation options, and evidence links before build decisions."],
    ["Architect", "Design boundaries, storage, tool contracts, data flow, config strategy, and migration paths."],
    ["Builder", "Implement small, verifiable changes that move the product toward the accepted plan."],
    ["Tester", "Verify behavior with type checks, smoke flows, fixtures, doctor checks, and regression notes."],
    ["Security Reviewer", "Review local privacy, secrets, prompt injection, path traversal, config writes, backups, and destructive actions."],
    ["Docs Release Engineer", "Prepare README, examples, package metadata, release checklist, and publish notes."],
    ["Critic", "Challenge incomplete evidence, missing requirements, weak tests, vague claims, and scope drift."]
  ];
  return roles.map(([name, mission]) => ({
    fileName: `${name.replace(/\s+/g, "-")}.md`,
    content: `# ${name}

Mission: ${mission}

## Inputs

- Active BrainForge company task packet, when one exists.
- User objective.
- Current plan.
- Relevant BrainForge search results.
- Previous phase handoff.
- Files needed for this role only.

## Output

Write a handoff with:

- Summary.
- Evidence.
- Risks or assumptions.
- Open questions.
- Next owner and next steps.

## Context Rule

Do not pull the whole transcript forward. Ask for or create a structured handoff instead.
When using the task runtime, advance the task only after this role's exit criteria are satisfied.
`
  }));
}

function agentCompanyMarkdown(): string {
  return `# Agent Company Operating System

BrainForge treats complex work like a small software company. The goal is controlled specialization with clean handoffs, not noisy roleplay.

## Standard Loop

1. Initial plan: define scope, requirements, acceptance criteria, and context budget.
2. Research: gather official docs, prior art, risks, and implementation options.
3. Refined plan: convert research into a concrete build plan.
4. Build: implement in small, reversible changes.
5. Test: run type checks, unit tests, smoke tests, and fixture imports.
6. Review: inspect for bugs, missing requirements, security risks, and overclaims.
7. Improve: fix review findings.
8. Release: update docs, package metadata, examples, and publish checklist.

## Roles

- Planner: owns scope, milestones, and acceptance criteria.
- Researcher: owns evidence, docs, prior art, and open questions.
- Architect: owns system design, interfaces, data model, and tradeoffs.
- Builder: owns implementation.
- Tester: owns verification and regression coverage.
- Security Reviewer: owns privacy, prompt injection, config safety, and destructive action gates.
- Docs/Release Engineer: owns README, install flow, package metadata, and release notes.
- Critic: challenges weak evidence and incomplete requirements.

## Operating Rule

Each role works from scoped context, then writes a handoff before the next role starts. No role needs the full transcript unless the handoff evidence proves it is necessary.

## Task Runtime

Use \`brainforge company start\` to create a tracked task folder, \`brainforge company status\` to see the current owner, and \`brainforge company advance\` when a phase is complete. MCP clients can use \`start_company_task\`, \`get_company_task\`, and \`advance_company_task\`.
`;
}

function contextWindowProtocolMarkdown(): string {
  return `# Context Window Protocol

BrainForge keeps long work stable by reducing context at phase boundaries.

## What Each Agent Reads

- Current objective.
- Current plan.
- Relevant BrainForge search results.
- Previous phase handoff.
- Only the files needed for the current role.

## What Each Agent Writes

Every phase writes a handoff in \`10-Orchestration/Handoffs/\` with:

- Summary of what changed.
- Evidence: files, commands, test output, links, or decisions.
- Risks and assumptions.
- Open questions.
- Next owner and next steps.

## Compression Rule

Never carry raw chat history forward when a structured handoff can carry the same truth. Raw logs are evidence; handoffs are operational memory.
`;
}

function orchestrationReadmeMarkdown(): string {
  return `# Orchestration

This folder stores the working state for BrainForge's multi-agent workflow.

- \`Plans/\`: active and archived plans.
- \`Research/\`: research briefs and source notes.
- \`Reviews/\`: review findings and release checks.
- \`Tasks/\`: tracked company tasks with phase packets and current owner state.
- \`Handoffs/\`: phase summaries that keep long tasks inside the context window.

Use the MCP tools \`get_orchestration_protocol\`, \`start_company_task\`, \`get_company_task\`, \`advance_company_task\`, and \`create_handoff\` to operate this workflow from Claude Code or Codex.
`;
}

function companyTasksReadmeMarkdown(): string {
  return `# Company Tasks

This folder holds tracked multi-agent work.

Start a task:

\`\`\`bash
brainforge company start --objective "..."
\`\`\`

Check the current owner:

\`\`\`bash
brainforge company status
\`\`\`

Advance a completed phase:

\`\`\`bash
brainforge company advance --task TASK_ID --summary "..." --evidence "..."
\`\`\`

Each task stores \`company-task.json\`, a readable \`README.md\`, phase packets, and links to handoff files.
`;
}

function importsReadme(brainDir: string): string {
  return `Put AI exports here, then run:\n\nbrainforge import --brain-dir ${brainDir}\n\nSupported MVP inputs:\n\n- ChatGPT conversations JSON\n- Claude conversations JSON-like exports\n- Markdown files\n- Plain text files\n\nRaw files stay here. BrainForge writes indexed memory into the AI-Brain vault.\n`;
}

function codexGlobalInstructions(brainDir: string): string {
  return `# BrainForge Shared Memory\n\nUse the BrainForge MCP server and the AI-Brain vault at ${brainDir} for durable user context. Search before asking the user to repeat project history, preferences, or prior decisions. Treat draft extracted memories as unreviewed evidence. For complex work, use the BrainForge company task tools so planner, researcher, architect, builder, tester, critic, security, and release roles leave phase packets and handoffs.`;
}

function claudeGlobalInstructions(brainDir: string): string {
  return `# BrainForge Shared Memory\n\nUse the BrainForge MCP server and the AI-Brain vault at ${brainDir} for durable user context. Search before asking the user to repeat project history, preferences, or prior decisions. Treat draft extracted memories as unreviewed evidence. For complex work, use the BrainForge company task tools so planner, researcher, architect, builder, tester, critic, security, and release roles leave phase packets and handoffs.`;
}
