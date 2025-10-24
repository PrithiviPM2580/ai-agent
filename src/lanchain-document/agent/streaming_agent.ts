import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "../../config/env.config";
import { createAgent } from "langchain";

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [],
});

(async () => {
  const stream = await agent.stream(
    {
      messages: [
        {
          role: "user",
          content: "Explain what AI is.",
        },
      ],
    },
    {
      streamMode: "values",
    }
  );

  for await (const chunk of stream) {
    const latestMessage = chunk.messages.at(-1);
    if (latestMessage?.content) {
      console.log("Agent: ", latestMessage.content);
    }
  }
})();
