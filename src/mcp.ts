import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { advanceCompanyTask, createHandoff, doctor, getCompanyTask, importExports, listCompanyTasks, orchestrationProtocol, readMemory, reviewDraftMemories, saveMemory, searchBrain, startCompanyTask } from "./core.js";

export async function runMcpServer(brainDir?: string): Promise<void> {
  const server = new McpServer({
    name: "brainforge",
    version: "0.1.0"
  });

  server.tool(
    "search_brain",
    "Search the user's local BrainForge AI-Brain using the local embedding index.",
    {
      query: z.string(),
      limit: z.number().int().min(1).max(20).optional(),
      embeddingModel: z.string().optional(),
      ollamaUrl: z.string().optional()
    },
    async ({ query, limit, embeddingModel, ollamaUrl }) => {
      const results = await searchBrain(query, brainDir, limit ?? 5, { model: embeddingModel, ollamaUrl });
      return textResult(results.map((result) => ({
        score: result.score,
        sourceFile: result.chunk.sourceFile,
        conversationTitle: result.chunk.conversationTitle,
        role: result.chunk.role,
        text: result.chunk.text
      })));
    }
  );

  server.tool(
    "read_memory",
    "Read a Markdown memory file from the AI-Brain vault by relative path.",
    {
      relativePath: z.string()
    },
    async ({ relativePath }) => textResult(await readMemory(brainDir, relativePath))
  );

  server.tool(
    "save_memory",
    "Create a new Markdown memory note in the AI-Brain vault without overwriting existing notes.",
    {
      section: z.string().default("06-Conversations"),
      title: z.string(),
      content: z.string()
    },
    async ({ section, title, content }) => {
      const path = await saveMemory(brainDir, section, title, content);
      return textResult({ path });
    }
  );

  server.tool(
    "import_exports",
    "Import files from the BrainForge imports folder, rebuild the local embedding index, and extract draft memories.",
    {
      importsDir: z.string().optional(),
      embeddingProvider: z.enum(["auto", "ollama", "hash"]).optional(),
      embeddingModel: z.string().optional(),
      ollamaUrl: z.string().optional()
    },
    async ({ importsDir, embeddingProvider, embeddingModel, ollamaUrl }) => textResult(await importExports({
      brainDir,
      importsDir,
      embeddingProvider,
      embeddingModel,
      ollamaUrl
    }))
  );

  server.tool(
    "doctor_check",
    "Run BrainForge setup checks for the vault, indexes, and Claude/Codex adapters.",
    {},
    async () => textResult(await doctor(brainDir))
  );

  server.tool(
    "review_memories",
    "List extracted memory review items, approve selected IDs, reject selected IDs, or approve all only when the user explicitly approves.",
    {
      approveAll: z.boolean().optional(),
      approve: z.array(z.string()).optional(),
      reject: z.array(z.string()).optional()
    },
    async ({ approveAll, approve, reject }) => textResult(await reviewDraftMemories({ brainDir, approveAll: Boolean(approveAll), approve, reject }))
  );

  server.tool(
    "get_orchestration_protocol",
    "Return BrainForge's multi-agent plan/research/refined-plan/build/test/review/improve/release workflow and context-window rules.",
    {},
    async () => textResult(orchestrationProtocol())
  );

  server.tool(
    "start_company_task",
    "Start a tracked BrainForge company task with phase packets, owners, and context-window handoff rules.",
    {
      objective: z.string(),
      title: z.string().optional()
    },
    async ({ objective, title }) => textResult(await startCompanyTask({ brainDir, objective, title }))
  );

  server.tool(
    "get_company_task",
    "Get the active BrainForge company task, a specific task, or the task list.",
    {
      taskId: z.string().optional(),
      list: z.boolean().optional()
    },
    async ({ taskId, list }) => textResult(list ? await listCompanyTasks(brainDir) : await getCompanyTask(brainDir, taskId))
  );

  server.tool(
    "advance_company_task",
    "Complete the current phase of a tracked company task, write a handoff, and move the next specialist into ownership.",
    {
      taskId: z.string().optional(),
      summary: z.string(),
      evidence: z.string().optional(),
      nextSteps: z.string().optional(),
      openQuestions: z.string().optional()
    },
    async ({ taskId, summary, evidence, nextSteps, openQuestions }) => textResult(await advanceCompanyTask({
      brainDir,
      taskId,
      summary,
      evidence,
      nextSteps,
      openQuestions
    }))
  );

  server.tool(
    "create_handoff",
    "Write a structured phase handoff so the next specialized agent can continue with scoped context.",
    {
      phase: z.string(),
      fromAgent: z.string(),
      toAgent: z.string(),
      summary: z.string(),
      taskId: z.string().optional(),
      evidence: z.string().optional(),
      nextSteps: z.string().optional(),
      openQuestions: z.string().optional()
    },
    async (input) => {
      const path = await createHandoff(brainDir, input);
      return textResult({ path });
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function textResult(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text" as const, text }] };
}
