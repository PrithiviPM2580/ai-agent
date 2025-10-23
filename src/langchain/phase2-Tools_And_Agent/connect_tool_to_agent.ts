// 1️⃣ Case One — You call the tool yourself

import { tool as InvokeTool } from "@langchain/core/tools";
import * as z from "zod";
import config from "../../config/env.config";

const WEATHER_BASE_URL = "https://api.weatherapi.com/v1";

// ✅ define schema first
const schema = z.object({
  city: z.string().describe("City name"),
});

// ✅ pass function AND schema as two arguments
const getWeatherInvoke = InvokeTool(
  async ({ city }) => {
    const weather_url = `${WEATHER_BASE_URL}/current.json?key=${config.WEATHER_API_KEY}&q=${city}`;
    const response = await fetch(weather_url);
    const data = await response.json();
    return `The weather in ${city} is ${data.current.condition.text} with ${data.current.temp_c}°C.`;
  },
  {
    name: "getWeatherInvoke",
    description: "Get weather info for a city",
    schema, // ✅ schema reference
  }
);

(async () => {
  const result = await getWeatherInvoke.invoke({ city: "London" });
  console.log(result);
})();

// 2️⃣ Case Two — The AI calls the tool automatically

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool as AutomateTool } from "langchain";
import { createAgent, createMiddleware, ToolMessage } from "langchain";

const handleToolErrors = createMiddleware({
  name: "HandleToolErrors",
  wrapToolCall: (request, handler) => {
    try {
      return handler(request);
    } catch (error) {
      // Return a custom error message to the model
      return new ToolMessage({
        content: `Tool error: Please check your input and try again. (${error})`,
        tool_call_id: request.toolCall.id!,
      });
    }
  },
});

const getWeatherAutomate = AutomateTool(
  async ({ city }) => {
    const weather_url = `${WEATHER_BASE_URL}/current.json?key=${config.WEATHER_API_KEY}&q=${city}`;
    const response = await fetch(weather_url);
    const data = await response.json();
    return `The weather in ${city} is ${data.current.condition.text} with ${data.current.temp_c}°C.`;
  },
  {
    name: "getWeatherAutomate",
    description: "Get weather info for a city",
    schema: z.object({
      city: z.string().describe("The city to get weather for"),
    }),
  }
);

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

(async () => {
  const agent = await createAgent({
    model,
    tools: [getWeatherAutomate],
    middleware: [handleToolErrors] as const,
    systemPrompt:
      "You are a helpful assistant that provides weather information. Use the tools when necessary.",
  });

  const response = await agent.invoke({
    messages: [
      { role: "user", content: "What's the weather in San Francisco?" },
    ],
  });

  console.log(response.messages[2].content);
})();
