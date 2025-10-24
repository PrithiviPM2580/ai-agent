import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "langchain";
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
  // 4️⃣ Ask the model a question involving two cities
  const question = "hi";
  console.log("👤 User:", question);

  // Step 1: Model generates tool calls
  const ai_msg = await modelWithTools.invoke([
    { role: "user", content: question },
  ]);

  // 🧩 Check if model actually called any tools
  if (!ai_msg.tool_calls || ai_msg.tool_calls.length === 0) {
    console.log("💬 Model did not call any tools. Here's the direct reply:");
    console.log(ai_msg.content || ai_msg.text);
    return;
  }

  console.log("🤖 Model Response with Tool Calls:", ai_msg.tool_calls);

  // Step 2: Execute all tool calls in parallel
  const toolResults = await Promise.all(
    (ai_msg.tool_calls || []).map(async (toolCall) => {
      const result = await getWeather.invoke(toolCall);
      console.log(
        `🔧 Tool Result for ${JSON.stringify(toolCall.args)}:`,
        result.text
      );
      return result;
    })
  );

  console.log("Tool Result: ", toolResults);

  // Step 3: Pass results back to model for final summary
  const finalResponse = await modelWithTools.invoke([
    { role: "user", content: question },
    ai_msg,
    ...toolResults,
  ]);

  console.log("\n🌤️ Final AI Response:\n", finalResponse.text);
})();
