import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { createAgent, HumanMessage, todoListMiddleware, tool } from "langchain";
import config from "../config/env.config"; // ✅ make sure your env file uses .js if using ES modules

// 🧩 Models
const mainModel = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const helperModel = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.3,
});

// 🧰 Tools

const writeCodeTool = tool(
  async ({ language, task }) => {
    console.log(`🧩 Writing code in ${language} for: ${task}`);

    const response = await helperModel.invoke([
      {
        role: "user",
        content: `Write ${language} code for: ${task}`,
      },
    ]);

    // ✅ Return structured data so the todo middleware knows it's done
    return {
      result: response.content,
      todo_status: "done",
    };
  },
  {
    name: "write_code_tool",
    description: "Generates code for a given language and task.",
    schema: z.object({
      language: z.string().describe("Programming language name"),
      task: z.string().describe("Coding task description"),
    }),
  }
);

const runCodeTool = tool(
  async ({ code }) => {
    console.log("🏃‍♂️ Running code:\n", code);
    // Simulate execution output
    return {
      result: `✅ Simulated run for: ${code.slice(0, 60)}...`,
      todo_status: "done",
    };
  },
  {
    name: "run_code_tool",
    description: "Simulates running the provided code and returns fake output.",
    schema: z.object({
      code: z.string().describe("The code to execute"),
    }),
  }
);

// 🤖 Agent Setup
const agent = createAgent({
  model: mainModel,
  tools: [writeCodeTool, runCodeTool],
  middleware: [todoListMiddleware()],
  systemPrompt: `
You are an autonomous coding assistant.
Your goal is to build projects step-by-step using the tools provided.
Follow these rules strictly:
1. Create a TODO plan before coding.
2. Use the tools (write_code_tool, run_code_tool) to complete each TODO.
3. After completing a TODO, mark it as "done".
4. When all TODOs are done, return: "✅ All tasks completed."
Do NOT repeat or re-run finished tasks.
`,
});

// 🚀 Run the agent
(async () => {
  try {
    const result = await agent.invoke({
      messages: [
        new HumanMessage(
          "Build a simple backend API in Node.js for a product using Express and MongoDB with CRUD operations."
        ),
      ],
    });

    console.log("🧠 Model Response:\n", result.messages);
    console.log("\n📋 Final Output:\n", result);
  } catch (err) {
    console.error("❌ Agent Error:", err);
  }
})();
