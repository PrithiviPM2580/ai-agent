import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "../../config/env.config";

// Initialize the Google Gemini LLM
const llm = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

// Define the state annotations for the workflow
const StateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  joke: Annotation<string>,
  improvedJoke: Annotation<string>,
  finalJoke: Annotation<string>,
});

//Define node functions

//First llm call to generate initial joke
async function generateJoke(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(`Write a short joke about ${state.topic}`);
  return { joke: msg.content };
}

//Gate function to check if it has a punchline
async function checkPunchline(state: typeof StateAnnotation.State) {
  if (state.joke.includes("?") || state.joke.includes("!")) {
    return "Pass";
  }
  return "Fail";
}

//Second llm call to improve the joke
async function improveJoke(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(
    `Make this joke funnier by adding wordplay: ${state.joke}`
  );
  return { improvedJoke: msg.content };
}

//Thired llm call to final polish
async function polishJoke(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(
    `Add a surprising twist to this joke: ${state.improvedJoke}`
  );
  return { finalJoke: msg.content };
}

// Construct the state graph for the workflow
const chain = new StateGraph(StateAnnotation)
  .addNode("generateJoke", generateJoke)
  .addNode("improveJoke", improveJoke)
  .addNode("polishJoke", polishJoke)
  .addEdge("__start__", "generateJoke")
  .addConditionalEdges("generateJoke", checkPunchline, {
    Pass: "improveJoke",
    Fail: "__end__",
  })
  .addEdge("improveJoke", "polishJoke")
  .addEdge("polishJoke", "__end__")
  .compile();

//Invoke
(async () => {
  const state = await chain.invoke({ topic: "cats" });
  console.log("Initial joke:");
  console.log(state.joke);
  console.log("\n--- --- ---\n");
  if (state.improvedJoke !== undefined) {
    console.log("Improved joke:");
    console.log(state.improvedJoke);
    console.log("\n--- --- ---\n");

    console.log("Final joke:");
    console.log(state.finalJoke);
  } else {
    console.log("Joke failed quality gate - no punchline detected!");
  }
})();
