import { z } from "zod";
import { MessagesZodState } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import config from "../../config/env.config";

const customAgentState = z.object({
  messages: MessagesZodState.shape.messages,
  userPreferences: z.record(z.string(), z.string()), // ✅ Correct here
}) as unknown as z.ZodObject<any>;

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [],
  stateSchema: customAgentState,
});

(async () => {
  const response = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "Explain what AI is.",
      },
    ],
    userPreferences: { tone: "friendly" },
  });

  console.log(response);
})();
