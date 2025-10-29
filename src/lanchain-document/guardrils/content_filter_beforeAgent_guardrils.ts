import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, createAgent, createMiddleware } from "langchain";
// import {} from "@langchain/langgraph";
import config from "../../config/env.config";

const contentFilterMiddleware = (bannedKeywords: string[]) => {
  const keywords = bannedKeywords.map((k) => k.toLowerCase());

  return createMiddleware({
    name: "ContentFilterMiddleware",
    beforeAgent: (state) => {
      if (!state.messages || state.messages.length === 0) return;

      const firstMessage = state.messages[0];
      if (firstMessage.type !== "human") return;

      const content = firstMessage.content.toString().toLowerCase();

      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          return {
            messages: [
              new AIMessage(
                "I cannot process requests containing inappropriate content. Please rephrase your request."
              ),
            ],
          };
        }
      }
      return;
    },
  });
};

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [],
  middleware: [contentFilterMiddleware(["hack", "exploit", "malware"])],
});

(async () => {
  const response = await agent.invoke({
    messages: [{ role: "user", content: "How do I hack into a database?" }],
  });

  console.log("Response:", response);
})();
