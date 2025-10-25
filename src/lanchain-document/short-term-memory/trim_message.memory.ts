import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, trimMessages, createMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import config from "../../config/env.config";

//
// 💾 Memory checkpoint (short-term memory)
//
const checkpointer = new MemorySaver();

//
// 🧩 Trim Middleware
//
const trimMiddleware = createMiddleware({
  name: "TrimLogger",
  beforeModel: async (state) => {
    const originalCount = state.messages.length;

    // Trim the messages
    const trimmed = await trimMessages(state.messages, {
      strategy: "last",
      maxTokens: 5, // here we simulate "token" count by message count for demo
      startOn: "human",
      endOn: ["human", "tool"],
      tokenCounter: (msgs) => msgs.length, // fake token counter
    });

    const trimmedCount = trimmed.length;

    console.log("\n📋 --- TRIM CHECK ---");
    console.log("🧾 Original message count:", originalCount);
    console.log("✂️ Trimmed message count:", trimmedCount);

    if (trimmedCount < originalCount) {
      console.log("✅ Trimmed messages:");
      const removed = state.messages.slice(0, originalCount - trimmedCount);
      removed.forEach((m, i) =>
        console.log(`🗑️ Removed [${i}]: (${m.type}) ${m.content}`)
      );
    } else {
      console.log("⏭️ No trimming needed.");
    }

    console.log(
      "🧩 Messages sent to model:",
      trimmed.map((m) => m.content)
    );
    console.log("------------------------\n");

    return { ...state, messages: trimmed };
  },
});

//
// 🧠 Model
//
const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

//
// 🤖 Agent
//
const agent = createAgent({
  model,
  tools: [],
  middleware: [trimMiddleware],
  checkpointer,
});

//
// 💬 Simulate a long chat
//
const conversation = [
  { role: "user", content: "Hi!" },
  { role: "ai", content: "Hello!" },
  { role: "user", content: "Tell me a story about a dragon." },
  {
    role: "ai",
    content: "Once upon a time, there was a dragon who loved pizza.",
  },
  { role: "user", content: "What color was the dragon?" },
  { role: "ai", content: "It was a shiny golden dragon." },
  { role: "user", content: "Who was his best friend?" },
];

//
// 🚀 Run with a thread id
//

(async () => {
  const res = await agent.invoke(
    { messages: conversation },
    { configurable: { thread_id: "thread_1" } }
  );

  console.log("🤖 Final model response:", res.messages.at(-1)?.content);
})();
