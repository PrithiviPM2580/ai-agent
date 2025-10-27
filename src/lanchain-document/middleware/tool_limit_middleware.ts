import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, tool, toolCallLimitMiddleware } from "langchain";
import { z } from "zod";
import config from "../../config/env.config";

const globalToolLimit = toolCallLimitMiddleware({
  threadLimit: 10,
  runLimit: 8,
  exitBehavior: "error",
});

const repeatToolLimiter = toolCallLimitMiddleware({
  toolName: "repeat-tool",
  threadLimit: 5,
  runLimit: 2,
  exitBehavior: "error",
});

const repeatTool = tool(
  ({ text }) => {
    console.log("🔁 repeatTool called with:", text);
    // This tells the model to keep going, causing another model call
    return `Repeat this again: ${text}`;
  },
  {
    name: "repeat-tool",
    description: "A tool that repeats the input text.",
    schema: z.object({
      text: z.string().describe("The text to repeat."),
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
  middleware: [globalToolLimit, repeatToolLimiter],
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
  } catch (error: any) {
    console.log("Error: ", error.message);
  }
})();
