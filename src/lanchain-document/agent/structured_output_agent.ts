import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { config } from "../../config/env.config";
import { z } from "zod";
import { createAgent } from "langchain";

const ContactInfo = z.object({
  name: z.string(),
  email: z.email(),
  phone: z.string(),
});

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [],
  responseFormat: ContactInfo,
});

(async () => {
  const response = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "Extract contact info from: John Doe, john@example.com, (555) 123-4567",
      },
    ],
  });
  console.log(
    `Contact Info: ${JSON.stringify(response.structuredResponse, null, 2)}`
  );
})();
