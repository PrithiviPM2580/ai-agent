//Graph API

import { StateGraph, Annotation, task, entrypoint } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "../../config/env.config";

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
