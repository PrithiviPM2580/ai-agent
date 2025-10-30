//Graph API

import { StateGraph, Annotation, task, entrypoint } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "../../config/env.config";

// Initialize the Google Gemini llmGraph
const llmGraph = new ChatGoogleGenerativeAI({
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

//First llmGraph call to generate initial joke
async function generateJoke(state: typeof StateAnnotation.State) {
  const msg = await llmGraph.invoke(`Write a short joke about ${state.topic}`);
  return { joke: msg.text };
}

//Gate function to check if it has a punchline
async function checkPunchline(state: typeof StateAnnotation.State) {
  if (state.joke.includes("?") || state.joke.includes("!")) {
    return "Pass";
  }
  return "Fail";
}

//Second llmGraph call to improve the joke
async function improveJoke(state: typeof StateAnnotation.State) {
  const msg = await llmGraph.invoke(
    `Make this joke funnier by adding wordplay: ${state.joke}`
  );
  return { improvedJoke: msg.text };
}

//Thired llmGraph call to final polish
async function polishJoke(state: typeof StateAnnotation.State) {
  const msg = await llmGraph.invoke(
    `Add a surprising twist to this joke: ${state.improvedJoke}`
  );
  return { finalJoke: msg.text };
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

//Functional API
const llmFunction = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

//Tasks

//First llmFunction call to generate initial joke
const generateJokeTask = task("generateJokeTask", async (topic: string) => {
  const msg = await llmFunction.invoke(`Write a short joke about ${topic}`);
  return msg.text;
});

//Gate function to check if it has a punchline
function checkPunchlineTask(joke: string) {
  if (joke.includes("?") || joke.includes("!")) {
    return "Pass";
  }
  return "Fail";
}

//Second llmFunction call to improve the joke
const improvedJokeTask = task("improveJokeTask", async (joke: string) => {
  const msg = await llmFunction.invoke(
    `Make this joke funnier by adding wordplay: ${joke}`
  );
  return msg.text;
});

//Thired llmFunction call to final polish
const polishJokeTask = task("polishJokeTask", async (improvedJoke: string) => {
  const msg = await llmFunction.invoke(
    `Add a surprising twist to this joke: ${improvedJoke}`
  );
  return msg.text;
});

// Construct the workflow using functional API
const workFlow = entrypoint("jokeMaker", async (topic: string) => {
  const originalJoke = await generateJokeTask(topic);
  if (checkPunchlineTask(originalJoke) === "Pass") {
    return originalJoke;
  }
  const improvedJoke = await improvedJokeTask(originalJoke);
  const polishJoke = await polishJokeTask(improvedJoke);
  return polishJoke;
});
(async () => {
  const stream = await workFlow.stream("dogs", {
    streamMode: "updates",
  });

  for await (const step of stream) {
    console.log(step);
  }
})();
