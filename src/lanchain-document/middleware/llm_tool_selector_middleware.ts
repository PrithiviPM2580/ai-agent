import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  createAgent,
  tool,
  llmGraphToolSelectorMiddleware,
  HumanMessage,
} from "langchain";
import { z } from "zod";
import config from "../../config/env.config";

const sumTwoNumbersTool = tool(
  ({ a, b }: { a: number; b: number }) => {
    console.log(`➕ Summing numbers: ${a} + ${b}`);
    return a + b;
  },
  {
    name: "sum-two-numbers",
    description: "Sums two numbers and returns the result.",
    schema: z.object({
      a: z.number().describe("The first number to sum."),
      b: z.number().describe("The second number to sum."),
    }),
  }
);

const addTwoNumbersTool = tool(
  ({ x, y }: { x: number; y: number }) => {
    console.log(`➕ Adding numbers: ${x} + ${y}`);
    return x + y;
  },
  {
    name: "add-two-numbers",
    description: "Adds two numbers and returns the result.",
    schema: z.object({
      x: z.number().describe("The first number to add."),
      y: z.number().describe("The second number to add."),
    }),
  }
);

const multiplyTwoNumbersTool = tool(
  ({ m, n }: { m: number; n: number }) => {
    console.log(`✖️ Multiplying numbers: ${m} * ${n}`);
    return m * n;
  },
  {
    name: "multiply-two-numbers",
    description: "Multiplies two numbers and returns the result.",
    schema: z.object({
      m: z.number().describe("The first number to multiply."),
      n: z.number().describe("The second number to multiply."),
    }),
  }
);

const divideTwoNumbersTool = tool(
  ({ p, q }: { p: number; q: number }) => {
    console.log(`➗ Dividing numbers: ${p} / ${q}`);
    if (q === 0) {
      return "Error: Division by zero is undefined.";
    }
    return p / q;
  },
  {
    name: "divide-two-numbers",
    description: "Divides two numbers and returns the result.",
    schema: z.object({
      p: z.number().describe("The numerator."),
      q: z.number().describe("The denominator."),
    }),
  }
);

const mainModel = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const helperModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.3,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model: mainModel,
  tools: [],
  middleware: [
    llmGraphToolSelectorMiddleware({
      model: helperModel,
      // maxTools:2,
      // alwaysInclude:["sum-two-numbers"]
    }),
  ],
});

(async () => {
  const result = await agent.invoke({
    messages: [
      new HumanMessage(
        "What is the sum of 15 and 27? Also, what is 144 divided by 12?"
      ),
    ],
  });
  console.log("🧠 Model Response:\n", result.messages);
})();
