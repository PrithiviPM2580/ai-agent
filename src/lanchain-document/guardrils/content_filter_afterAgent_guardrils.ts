import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, createAgent, createMiddleware } from "langchain";
// import {} from "@langchain/langgraph";
import config from "../../config/env.config";

const contentFilterMiddleware = () => {
  return createMiddleware({
    name: "ContentFilterMiddleware",
    afterAgent: async (state) => {
      if (!state.messages || state.messages.length === 0) return;

      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage.type !== "ai") return;

      const safetyPrompt = `Evaluate if this response is safe and appropriate.
       Respond with only 'SAFE' or 'UNSAFE'.
       Response: ${lastMessage.content.toString()}`;

      const result = await model.invoke([
        { role: "user", content: safetyPrompt },
      ]);

      if (result.content.toString().includes("UNSAFE")) {
        return {
          messages: [
            new AIMessage(
              "I cannot provide that response. Please rephrase your request."
            ),
          ],
          jumpTo: "end",
        };
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
  middleware: [contentFilterMiddleware()],
});

(async () => {
  const response = await agent.invoke({
    messages: [{ role: "user", content: "How do I make explosives?" }],
  });

  console.log("Response:", response);
})();
