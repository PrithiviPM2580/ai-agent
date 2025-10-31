import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import config from "../../config/env.config";
import { tool, AIMessage } from "langchain";
import { formatDuration } from "../../utils";

//Tools

const add = tool(
  ({ a, b }) => {
    return a + b;
  },
  {
    name: "add",
    description: "adds two numbers",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const multiply = tool(
  ({ a, b }) => {
    return a * b;
  },
  {
    name: "multiply",
    description: "multiplies two numbers",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const divide = tool(
  ({ a, b }) => {
    if (b === 0) {
      throw new Error("Division by zero is not allowed.");
    }
    return a / b;
  },
  {
    name: "divide",
    description: "divides two numbers",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

//  Initialize the Google Generative AI model
const llmGraph = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

// Augment the LLM with tools
const tools = [add, multiply, divide];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const llmWithTools = llmGraph.bindTools(tools);

// Nodes

//
async function llmCall(state: typeof MessagesAnnotation.State) {
  const start = Date.now();
  console.log("\n🟢 [LLMWithTools] Starting node...");

  const result = await llmWithTools.invoke([
    {
      role: "system",
      content:
        "You are a helpful assistant tasked with performing arithmetic on a set of inputs.",
    },
    ...state.messages,
  ]);
  const end = Date.now();
  console.log("✅ [LLMWithTools] Result:", result.content);
  console.log(`⏱️ [LLMWithTools] Duration: ${formatDuration(end - start)}`);
  return {
    messages: [result],
  };
}

const toolNode = new ToolNode(tools);

// Conditional edge function to route to the tool node or end
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const start = Date.now();
  console.log("\n🟡 [Routing] Deciding next step...");

  const lastMessage = state.messages.at(-1);
  console.log("🧩 LLM Output:", lastMessage);

  // Narrow type to AIMessage
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    console.log("🔧 Tool Call Detected:", lastMessage.tool_calls);
    return "toolNode";
  }
  const end = Date.now();
  console.log("✅ No tool call, ending agent.");
  console.log(`⏱️ [LLMWithTools] Duration: ${formatDuration(end - start)}`);

  return "__end__";
}

// Construct the Agent Graph Workflow
const agentWorkflow = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge("__start__", "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", "__end__"])
  .addEdge("toolNode", "llmCall")
  .compile();

// Invoke
(async () => {
  const messages = [
    {
      role: "user",
      content: "Add 3 and 4.",
    },
  ];
  const result = await agentWorkflow.invoke({ messages });
  console.log("\n🏁 [Final Output]");
  console.log("Topic:", result);
})();
