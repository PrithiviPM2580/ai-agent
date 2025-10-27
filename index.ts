import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, tool } from "langchain"; // add .js if using ES modules
import { z } from "zod";
import config from "./src/config/env.config";

// 🧠 Initialize the model
const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const sumToolCode = tool(
  async ({ language, task }) => {
    console.log(`🧩 Writing code in ${language} for: ${task}`);

    // ✅ Call the model directly here (not the agent)
    const response = await model.invoke([
      {
        role: "user",
        content: `Write a ${language} code for the following task: ${task}`,
      },
    ]);

    return response.content; // Return the text
  },
  {
    name: "sum_tool_code",
    description:
      "A tool that generates code for a given programming language and task.",
    schema: z.object({
      language: z.string().describe("The programming language"),
      task: z.string().describe("The task to accomplish"),
    }),
  }
);

// 🧠 Create the agent
const agent = createAgent({
  model,
  tools: [sumToolCode],
});

// 🚀 Run the agent
(async () => {
  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "Write a JavaScript code to find the sum of two numbers.",
      },
    ],
  });

  const codeMessage = result.messages.find(
    (msg) => msg.name === "sum_tool_code"
  );

  console.log("✅ Generated Code:\n", codeMessage?.content || "No code found");
})();
