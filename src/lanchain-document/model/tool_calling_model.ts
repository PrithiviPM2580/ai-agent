import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { tool, BaseMessage } from "langchain";
import config from "../../config/env.config";

const getWeather = tool(
  async ({ city }) => {
    const WEATHER_BASE_URL = "https://api.weatherapi.com/v1";
    const weather_url = `${WEATHER_BASE_URL}/current.json?key=${config.WEATHER_API_KEY}&q=${city}`;
    const response = await fetch(weather_url);
    const data = await response.json();
    return `The weather in ${city} is ${data.current.condition.text} with ${data.current.temp_c}°C.`;
  },
  {
    name: "getWeather",
    description: "Get weather info for a city",
    schema: z.object({
      city: z.string().describe("Provide the city name"),
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
  // 2️⃣ Step 1: Model generates tool calls
  const messages: BaseMessage[] = [
    { role: "user", content: "What's the weather in New York?" } as any,
  ];
  const ai_msg = await modelWithTools.invoke(messages);
  messages.push(ai_msg);

  // 3️⃣ Step 2: Execute tools and collect results
  if (ai_msg.tool_calls && ai_msg.tool_calls.length > 0) {
    for (const tool_call of ai_msg.tool_calls) {
      const tool_result = await getWeather.invoke(tool_call);
      messages.push(tool_result);
    }
  }

  // 4️⃣ Step 3: Pass results back to model for final response
  const final_response = await modelWithTools.invoke(messages);
  console.log(final_response.text);
})();
