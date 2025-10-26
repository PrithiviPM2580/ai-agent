import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, summarizationMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import config from "../../config/env.config";

const checkpointer = new MemorySaver();

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const summarizeMiddleware = summarizationMiddleware({
  model,
  maxTokensBeforeSummary: 5,
  messagesToKeep: 3,
  summaryPrefix: "Summarize the following conversation briefly:",
});

const agent = createAgent({
  model,
  tools: [],
  middleware: [summarizeMiddleware],
  checkpointer,
});

(async () => {
  const config = { configurable: { thread_id: "1" } };
  await agent.invoke({ messages: "hi, my name is bob" }, config);
  await agent.invoke({ messages: "write a short poem about cats" }, config);
  await agent.invoke({ messages: "now do the same but for dogs" }, config);
  const finalResponse = await agent.invoke(
    { messages: "what's my name?" },
    config
  );

  console.log("Response:\n", finalResponse);
  console.log("FinalResponse:\n", finalResponse.messages.at(-1)?.content);
})();
