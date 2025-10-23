import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool, createMiddleware, ToolMessage, createAgent } from "langchain";
import { z } from "zod";
import config from "../../config/env.config";

const handleToolsError = createMiddleware({
  name: "HandleToolErrors",
  wrapToolCall: (request, handler) => {
    try {
      return handler(request);
    } catch (error) {
      return new ToolMessage({
        content: `Tool error: Please check your input and try again. (${error})`,
        tool_call_id: request.toolCall.id!,
      });
    }
  },
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

const getNews = tool(
  async ({ country }) => {
    const NEWS_BASE_URL = "https://newsapi.org/v2";
    const news_url = `${NEWS_BASE_URL}/top-headlines?country=${country}&apiKey=${config.NEWS_API_KEY}`;
    const response = await fetch(news_url);
    const data = await response.json();

    return `The latest news in ${country} is: ${data.articles[0].title}`;
  },
  {
    name: "getNews",
    description: "Get latest news for a country",
    schema: z.object({
      country: z.string().describe("Provide the country name"),
    }),
  }
);
const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [getNews, getWeather],
  middleware: [handleToolsError] as const,
});

(async () => {
  const response = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "What's the latest news in the US and the weather in New York?",
      },
    ],
  });

  console.log(`Response: ${response.messages[2].content}`);
})();
