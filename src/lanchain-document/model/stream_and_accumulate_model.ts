import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessageChunk, tool } from "langchain";
import { z } from "zod";
import config from "../../config/env.config";

const getWeather = tool(
  async ({ city }) => {
    console.log(`🛰️ Fetching weather for: ${city}`);
    const WEATHER_BASE_URL = "https://api.weatherapi.com/v1";
    const weather_url = `${WEATHER_BASE_URL}/current.json?key=${config.WEATHER_API_KEY}&q=${city}`;
    const response = await fetch(weather_url);
    const data = await response.json();
    return `The weather in ${city} is ${data.current.condition.text} with ${data.current.temp_c}°C.`;
  },
  {
    name: "get_weather",
    description: "Get the current weather for a given city.",
    schema: z.object({
      city: z.string().describe("The city to get the weather for."),
    }),
  }
);

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const modelWithTools = model.bindTools([getWeather]);

(async () => {
  const question = "What's the weather in Boston and Tokyo?";
  console.log("👤 User:", question);

  // --- STEP 1: Stream the model response ---
  console.log("\n🌊 Streaming model response...");
  const stream = await modelWithTools.stream([
    { role: "user", content: question },
  ]);

  // We’ll accumulate chunks as they come in
  let full: AIMessageChunk | null = null;

  for await (const chunk of stream) {
    // show live tool call tokens
    if (chunk.tool_call_chunks) {
      for (const toolChunk of chunk.tool_call_chunks) {
        console.log(`🧩 Tool name: ${toolChunk.name}`);
        console.log(`🧠 Args: ${toolChunk.args}`);
      }
    }

    // accumulate chunks to reconstruct the final AI message
    full = full ? full.concat(chunk) : chunk;
    console.log(`🤖 : ${JSON.stringify(full.contentBlocks)}`);
  }

  // --- STEP 2: Once streaming completes ---
  const ai_msg = full;
  console.log("\n✅ Streaming complete!");
  console.log("🤖 Model tool calls:", ai_msg?.tool_calls);

  // --- STEP 3: If tools were called, execute them ---
  if (!ai_msg?.tool_calls || ai_msg.tool_calls.length === 0) {
    console.log("💬 Direct AI reply (no tools called):", ai_msg?.content);
    return;
  }

  const toolResults = await Promise.all(
    ai_msg.tool_calls.map(async (toolCall) => {
      const result = await getWeather.invoke(toolCall);
      console.log(
        `🔧 Tool result for ${JSON.stringify(toolCall.args)}:`,
        result.text
      );
      return result;
    })
  );

  // --- STEP 4: Send results back to model for final summary ---
  const finalStream = await modelWithTools.stream([
    { role: "user", content: question },
    ai_msg,
    ...toolResults,
  ]);

  console.log("\n🌤️ Final AI Response (streaming):\n");
  let fullFinal = null;
  for await (const chunk of finalStream) {
    process.stdout.write(chunk.text ?? "");
    fullFinal = fullFinal ? fullFinal.concat(chunk) : chunk;
  }

  console.log("\n\n✅ Done. Full AI Message:", fullFinal?.content);
})();
