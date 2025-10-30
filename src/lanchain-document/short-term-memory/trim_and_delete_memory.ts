import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, trimMessages, createMiddleware } from "langchain";
import { RemoveMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import config from "../../config/env.config";

//  💾 Checkpointer (stores conversation memory in RAM)
const checkpointer = new MemorySaver();

// 🧠 Middleware: Trim + Delete

const manageMessagesMiddleware = createMiddleware({
  name: "TrimAndDelete",
  beforeModel: async (state) => {
    const allmGraphessages = state.messages;
    console.log("\n🧩 Total messages in memory:", allmGraphessages.length);

    if (allmGraphessages.length > 10) {
      console.log("🗑️ Too many messages — deleting oldest ones...");

      const toDelete = allmGraphessages
        .slice(0, 3) // only keep ones with valid id
        .map((m) => new RemoveMessage({ id: m.id! }));
      return { ...state, messages: toDelete };
    }

    // 2️⃣ Trim messages before sending to model
    const trimmed = await trimMessages(allmGraphessages, {
      strategy: "last",
      maxTokens: 2,
      startOn: "human",
      endOn: ["human", "tool"],
      tokenCounter: (msgs) => msgs.length,
    });

    console.log("✂️ Trimmed messages count:", trimmed.length);
    console.log(
      "🧾 Sending these to model:",
      trimmed.map((m) => m.content)
    );

    return { ...state, messages: trimmed };
  },
});

// 🧠 Chat Model: Google Gemini

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

// 🧠 Agent: with Middleware and Checkpointer

const agent = createAgent({
  model,
  tools: [],
  middleware: [manageMessagesMiddleware],
  checkpointer,
});

// 🏃‍♂️ Run Agent with sample conversation

const conversation = [
  { role: "user", content: "Hi!" },
  { role: "ai", content: "Hey there!" },
  { role: "user", content: "Tell me a story." },
  { role: "ai", content: "Once upon a time, a cat learned to code." },
  { role: "user", content: "What did it build?" },
  { role: "ai", content: "A website for fish recipes." },
  { role: "user", content: "Was it popular?" },
  { role: "ai", content: "Yes! It went viral among sea creatures." },
  { role: "user", content: "What happened next?" },
  { role: "ai", content: "The cat became famous and bought a yacht." },
  { role: "user", content: "Then what?" },
];

// 🧠 Run agent with memory

(async () => {
  const res = await agent.invoke(
    { messages: conversation },
    { configurable: { thread_id: "thread_1" } } // ✅ thread_id required for MemorySaver
  );

  console.log(`🤖 Final model response: ${res.messages.at(-1)?.content}`);
})();
