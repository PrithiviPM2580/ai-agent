import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { z } from "zod";
import config from "../../config/env.config";

const contextSchema = z.object({
  userRole: z.enum(["admin", "user", "guest"]),
});

type Context = z.infer<typeof contextSchema>;

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.2,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [],
  contextSchema,
  middleware: [
    dynamicSystemPromptMiddleware<Context>((state, runtime) => {
      const userRole = runtime.context.userRole;
      let basePrompt = `You are a helpful ${userRole} assistant.`;
      if (userRole === "admin") {
        basePrompt += " You have access to all administrative functions.";
      } else if (userRole === "user") {
        basePrompt += " You have access to standard user functions.";
      } else {
        basePrompt += " You have limited access as a guest.";
      }
      return basePrompt;
    }),
  ],
});

(async () => {
  const response = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "Who are you?",
        },
      ],
    },
    {
      context: { userRole: "admin" },
    }
  );

  console.log("Response:", response);
})();
