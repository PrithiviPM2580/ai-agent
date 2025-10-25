import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { createAgent } from "langchain";
import config from "../../config/env.config";
import connectToDatabase from "../../config/database.config";

(async () => {
  const { client, db } = await connectToDatabase();

  const checkpointer = new MongoDBSaver({ client, dbName: "langchain" });

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

  // ✅ 5️⃣ First run (thread_1 — will be remembered)
  console.log("🧠 Conversation 1 (same thread):");
  const res1 = await agent.invoke(
    { messages: [{ role: "user", content: "Hello! My name is Prithivi." }] },
    { configurable: { thread_id: "thread_1" } }
  );
  console.log("Response 1:", res1.messages[res1.messages.length - 1].content);

  const res2 = await agent.invoke(
    { messages: [{ role: "user", content: "What is my name?" }] },
    { configurable: { thread_id: "thread_1" } } // 🧠 Same thread_id — remembers
  );
  console.log("Response 2:", res2.messages[res2.messages.length - 1].content);

  // ✅ 6️⃣ Second run (thread_2 — new memory)
  console.log("\n🧹 Conversation 2 (new thread):");
  const res3 = await agent.invoke(
    { messages: [{ role: "user", content: "What is my name?" }] },
    { configurable: { thread_id: "thread_2" } } // 🚫 New thread — forgets
  );
  console.log("Response 3:", res3.messages[res3.messages.length - 1].content);
  const writes = await db
    .collection("checkpoint_writes")
    .find({ thread_id: "thread_1" })
    .toArray();

  console.log("🧠 Chat history for thread_1:\n");

  for (const w of writes) {
    if (w.channel === "messages") {
      const decoded = JSON.parse(w.value.buffer.toString());

      // User message
      if (decoded[0]?.role === "user") {
        console.log(`👤 User: ${decoded[0].content}`);
      }

      // AI message
      if (decoded[0]?.kwargs?.content) {
        console.log(`🤖 AI: ${decoded[0].kwargs.content}`);
      }
    }
  }

  // ✅ 7️⃣ Close MongoDB connection
  await client.close();
})();
