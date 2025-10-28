import * as z from "zod";
import { createAgent, toolStrategy, providerStrategy } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "./src/config/env.config";

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const ContactInfo = z.object({
  name: z.string().describe("Person's name"),
  email: z.string().describe("Email address"),
});

const EventDetails = z.object({
  event_name: z.string().describe("Name of the event"),
  date: z.string().describe("Event date"),
});

const agent = createAgent({
  model,
  tools: [],
  responseFormat: toolStrategy([ContactInfo, EventDetails]),
});

(async () => {
  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "Extract info: John Doe (john@email.com) is organizing Tech Conference on March 15th",
      },
    ],
  });

  console.log(result);
})();
