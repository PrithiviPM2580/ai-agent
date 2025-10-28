import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, piiRedactionMiddleware, tool } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";
import config from "../../config/env.config";

const checkpointer = new MemorySaver();

const PII_RULES = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
};

const getEmailTool = tool(
  ({ email }) => {
    return `Extracted email: ${email}`;
  },
  {
    name: "get_email",
    description: "Extract email address from the input",
    schema: z.object({
      email: z.email().describe("The extracted email address"),
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
  tools: [getEmailTool],
  middleware: [piiRedactionMiddleware({ rules: PII_RULES })],
  checkpointer,
});

(async () => {
  const configureContext = { configurable: { thread_id: "some_id" } };

  const response = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content:
            "My email is john.doe@example.com and card is 4532-1234-5678-9010",
        },
      ],
    },
    configureContext
  );
  console.log("Agent1 Response:", response);

  const response2 = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "Do you know my email? Please extract my email'",
        },
      ],
    },
    configureContext
  );
  console.log("Agent2 Response:", response2);
})();
