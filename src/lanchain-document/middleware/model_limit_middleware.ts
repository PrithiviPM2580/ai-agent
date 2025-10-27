import { z } from "zod";
import { createAgent, tool, modelCallLimitMiddleware } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "../../config/env.config";

const repeatTool = tool(
  async ({ text }) => {
    console.log("🔁 repeatTool called with:", text);
    // This tells the model to keep going, causing another model call
    return `Repeat this again: ${text}`;
  },
  {
    name: "repeat_tool",
    description:
      "Repeats back what you say so that the model continues looping.",
    schema: z.object({
      text: z.string(),
    }),
  }
);

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [repeatTool],
  middleware: [
    modelCallLimitMiddleware({
      runLimit: 8, // Only 3 model calls allowed per run
      exitBehavior: "throw",
    }),
  ],
});

(async () => {
  try {
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content:
            "Keep using repeat_tool over and over for 10 times saying hello",
        },
      ],
    });
    console.log("✅ Result:", result);
  } catch (err: any) {
    console.error("💥 Run limit exceeded!", err.message);
  }
})();
