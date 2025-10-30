// Graph API

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { z } from "zod";
import config from "../../config/env.config";
import de from "zod/v4/locales/de.js";

// Initialize the Google Gemini llmGraph
const llmGraph = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

//Schema for structured routing
const routeScheme = z.object({
  step: z
    .enum(["poem", "story", "joke"])
    .describe("The next step in the routing process"),
});

// Augment the structure output with the routing schema
const router = llmGraph.withStructuredOutput(routeScheme);

// Grapg State Annotation
const StateAnnotation = Annotation.Root({
  input: Annotation<string>,
  decision: Annotation<string>,
  output: Annotation<string>,
});

//Nodes

//Write a poem
async function llmCall1(state: typeof StateAnnotation.State) {
  const msg = await llmGraph.invoke([
    {
      role: "system",
      content: "You are an expert poet.",
    },
    {
      role: "user",
      content: state.input,
    },
  ]);
  return { output: msg.content };
}

//Write a story
async function llmCall2(state: typeof StateAnnotation.State) {
  const msg = await llmGraph.invoke([
    {
      role: "system",
      content: "You are an expert storyteller.",
    },
    {
      role: "user",
      content: state.input,
    },
  ]);
  return { output: msg.content };
}

//Write a joke
async function llmCall3(state: typeof StateAnnotation.State) {
  const msg = await llmGraph.invoke([
    {
      role: "system",
      content: "You are an expert comedian.",
    },
    {
      role: "user",
      content: state.input,
    },
  ]);
  return { output: msg.content };
}

//Routing Node
async function llmCallRouter(state: typeof StateAnnotation.State) {
  const decision = await router.invoke([
    {
      role: "system",
      content:
        "Route the input to story, joke, or poem based on the user's request.",
    },
    {
      role: "user",
      content: state.input,
    },
  ]);
  return { decision: decision.step };
}

// Conditional edge function to route to the appropriate node
function routeDecision(state: typeof StateAnnotation.State) {
  if (state.decision === "poem") {
    return "llmCall1";
  } else if (state.decision === "story") {
    return "llmCall2";
  } else {
    return "llmCall3";
  }
}

// Construct the state graph for the workflow
const routerWorkflow = new StateGraph(StateAnnotation)
  .addNode("llmCall1", llmCall1)
  .addNode("llmCall2", llmCall2)
  .addNode("llmCall3", llmCall3)
  .addNode("llmCallRouter", llmCallRouter)
  .addEdge("__start__", "llmCallRouter")
  .addConditionalEdges("llmCallRouter", routeDecision, [
    "llmCall1",
    "llmCall2",
    "llmCall3",
  ])
  .addEdge("llmCall1", "__end__")
  .addEdge("llmCall2", "__end__")
  .addEdge("llmCall3", "__end__")
  .compile();

//Invoke
(async () => {
  const state = await routerWorkflow.invoke({
    input: "Write me a joke about cats.",
  });
  console.log("Final Output:", state);
})();
