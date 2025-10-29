import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  createAgent,
  humanInTheLoopMiddleware,
  tool,
  piiRedactionMiddleware,
} from "langchain";
import { MemorySaver, Command } from "@langchain/langgraph";
import config from "../../config/env.config";
import { z } from "zod";

const checkpointer = new MemorySaver();

const sendEmailTool = tool(
  ({ email }) => {
    return `Email sent to ${email}`;
  },
  {
    name: "send_email",
    description:
      "Sends an email to the specified recipient with the given subject and body.",
    schema: z.object({
      email: z.email().describe("The email address of the recipient."),
    }),
  }
);

const PII_RULES = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
};

const humanToLoopMiddleware = humanInTheLoopMiddleware({
  interruptOn: {
    send_email: true,
  },
});

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [sendEmailTool],
  middleware: [
    humanToLoopMiddleware,
    piiRedactionMiddleware({ rules: PII_RULES }),
  ],
  checkpointer,
});

(async () => {
  const configurableConfig = { configurable: { thread_id: "some_id" } };
  let result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "Send an email lanchain@gmai.com to the team",
        },
      ],
    },
    configurableConfig
  );

  console.log("Initial Result:", result);

  result = await agent.invoke(
    new Command({ resume: { decisions: [{ type: "approve" }] } }),
    configurableConfig // Same thread ID to resume the paused conversation
  );
  console.log("Final Result after Human Approval:", result);
})();
