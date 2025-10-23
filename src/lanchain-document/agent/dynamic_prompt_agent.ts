import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import config from "../../config/env.config";
import { z } from "zod";

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});
const contextSchema = z.object({
  userRole: z.enum(["expert", "beginner"]),
});

const dynamicPromptMiddleware = dynamicSystemPromptMiddleware<
  z.infer<typeof contextSchema>
>((state, runtime) => {
  const userRole = runtime.context.userRole || "user";
  const basePrompt = "You are a helpful assistant.";

  if (userRole === "expert") {
    return `${basePrompt} Provide detailed and technical explanations.`;
  } else if (userRole === "beginner") {
    return `${basePrompt} Use simple language and provide step-by-step explanations.`;
  }
  return basePrompt;
});

const agent = createAgent({
  model,
  tools: [],
  contextSchema,
  middleware: [dynamicPromptMiddleware] as const,
});

(async () => {
  const response1 = await agent.invoke(
    { messages: [{ role: "user", content: "Explain 2+2" }] },
    { context: { userRole: "expert" } }
  );

  console.log(
    `Expert Response: ${JSON.stringify(response1.messages[1].content, null, 2)}`
  );

  const response2 = await agent.invoke(
    { messages: [{ role: "user", content: "Explain 2+2" }] },
    { context: { userRole: "beginner" } }
  );

  console.log(
    `Beginner Response: ${JSON.stringify(
      response2.messages.at(-1)?.content,
      null,
      2
    )}`
  );
})();
