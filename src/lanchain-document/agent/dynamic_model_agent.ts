import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, tool, createMiddleware } from "langchain";
import { z } from "zod";
import config from "../../config/env.config";

const fastModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const smartModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-pro",
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

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

const dynamicModelMiddleware = createMiddleware({
  name: "DynamicModelMiddleware",
  wrapModelCall: (request, handler) => {
    const messageCount = request.messages.length;
    const userPrompt = request.messages.at(-1)?.content || "";

    let chooseModel;

    if (messageCount > 10) {
      chooseModel = smartModel;
    } else if (
      typeof userPrompt === "string" &&
      userPrompt.includes("analysis")
    ) {
      chooseModel = smartModel;
    } else {
      chooseModel = fastModel;
    }

    console.log(
      `🧩 Middleware running | Messages: ${messageCount} | Using model: ${chooseModel.model}`
    );

    return handler({ ...request, model: chooseModel });
  },
});

const agent = createAgent({
  model: fastModel,
  tools: [getWeather],
  middleware: [dynamicModelMiddleware] as const,
});

(async () => {
  const response = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "What's the weather in San Francisco?",
      },
    ],
  });
  console.log("Agent Response:", response.messages[2].content);
})();
