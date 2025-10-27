import { piiRedactionMiddleware } from "langchain";
import { createAgent, tool } from "langchain";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "../../config/env.config";

// ✅ Define multiple rules at once
const PII_RULES = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
};

// Example tool
const lookupUser = tool(
  async ({ ssn, email }) => {
    // Tool gets the **real** value even though model saw redacted one

    return { name: "John Doe", account: "active", ssn, email };
  },
  {
    name: "lookup_user",
    description: "Look up user by SSN",
    schema: z.object({ ssn: z.string(), email: z.email() }),
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
  tools: [lookupUser],
  middleware: [piiRedactionMiddleware({ rules: PII_RULES })],
});

(async () => {
  // 🧠 Run
  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "Look up SSN 123-45-6789 and email john.doe@gmail.com",
      },
    ],
  });

  console.log("Response: ", result);
})();
