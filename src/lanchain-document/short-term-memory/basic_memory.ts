import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import config from "../../config/env.config";

const checkpointer = new MemorySaver();

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [],
  checkpointer,
});

(async () => {
  // 🧠 First message
  const res1 = await agent.invoke(
    {
      messages: [{ role: "user", content: "My name is Prithivi." }],
    },
    { configurable: { thread_id: "123" } }
  );
  console.log("Response 1:", res1.messages[res1.messages.length - 1].content);

  // 🧠 Second message in same thread (should remember your name)
  const res2 = await agent.invoke(
    {
      messages: [{ role: "user", content: "What is my name?" }],
    },
    { configurable: { thread_id: "123" } } // same thread → memory reused
  );
  console.log("Response 2:", res2.messages[res2.messages.length - 1].content);

  // 💭 Third message in a different thread (memory reset)
  const res3 = await agent.invoke(
    {
      messages: [{ role: "user", content: "What is my name?" }],
    },
    { configurable: { thread_id: "456" } } // new thread → memory empty
  );
  console.log("Response 3:", res3.messages[res3.messages.length - 1].content);
})();
