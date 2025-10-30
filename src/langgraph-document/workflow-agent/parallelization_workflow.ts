// Graph API

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, Annotation, entrypoint, task } from "@langchain/langgraph";
import config from "../../config/env.config";

// Initialize the Google Gemini llmGraph
const llmGraph = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

// Graph State Annotation

const StateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  joke: Annotation<string>,
  story: Annotation<string>,
  poem: Annotation<string>,
  combinedOutput: Annotation<string>,
});

//Nodes

// First llm call to generate initial joke
async function callLLM1(state: typeof StateAnnotation.State) {
  const msg = await llmGraph.invoke(`Write a short joke about ${state.topic}`);
  return { joke: msg.content };
}

// Second llm call to generate a story
async function callLLM2(state: typeof StateAnnotation.State) {
  const msg = await llmGraph.invoke(`Write a short story about ${state.topic}`);
  return { story: msg.content };
}

// Third llm call to generate a poem
async function callLLM3(state: typeof StateAnnotation.State) {
  const msg = await llmGraph.invoke(`Write a short poem about ${state.topic}`);
  return { poem: msg.content };
}

// Combine the joke, story and poem into a single output
async function aggregator(state: typeof StateAnnotation.State) {
  const combined =
    `Here's a story, joke, and poem about ${state.topic}!\n\n` +
    `STORY:\n${state.story}\n\n` +
    `JOKE:\n${state.joke}\n\n` +
    `POEM:\n${state.poem}`;
  return { combinedOutput: combined };
}

// Construct the state graph for the workflow
const parallelWorkflow = new StateGraph(StateAnnotation)
  .addNode("callLLM1", callLLM1)
  .addNode("callLLM2", callLLM2)
  .addNode("callLLM3", callLLM3)
  .addNode("aggregator", aggregator)
  .addEdge("__start__", "callLLM1")
  .addEdge("__start__", "callLLM2")
  .addEdge("__start__", "callLLM3")
  .addEdge("callLLM1", "aggregator")
  .addEdge("callLLM2", "aggregator")
  .addEdge("callLLM3", "aggregator")
  .addEdge("aggregator", "__end__")
  .compile();

// Invoke
(async () => {
  const result = await parallelWorkflow.invoke({ topic: "cats" });
  console.log(result.combinedOutput);
})();

// Functional API

// Initialize the Google Gemini llmFunction
const llmFunction = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

//Tasks

// First llmFunction call to generate initial joke
const callLLM1Task = task("generateJoke", async (topic: string) => {
  const msg = await llmFunction.invoke(`Write a short joke about ${topic}`);
  return msg.text;
});

//Second llmFunction call to generate a story
const callLLM2Task = task("generateStory", async (topic: string) => {
  const msg = await llmFunction.invoke(`Write a short story about ${topic}`);
  return msg.text;
});

//Third llmFunction call to generate a poem
const callLLM3Task = task("generatePoem", async (topic: string) => {
  const msg = await llmFunction.invoke(`Write a short poem about ${topic}`);
  return msg.text;
});

//Aggregator task to combine outputs
const aggregatorTask = task(
  "aggregateOutputs",
  async (params: {
    topic: string;
    joke: string;
    story: string;
    poem: string;
  }) => {
    const { topic, joke, story, poem } = params;
    const combined =
      `Here's a story, joke, and poem about ${topic}!\n\n` +
      `STORY:\n${story}\n\n` +
      `JOKE:\n${joke}\n\n` +
      `POEM:\n${poem}`;
    return combined;
  }
);

//Build the workflow using functional API
const parallelWorkflowFunction = entrypoint(
  "parallelJokeStoryPoemGenerator",
  async (topic: string) => {
    const [joke, story, poem] = await Promise.all([
      callLLM1Task(topic),
      callLLM2Task(topic),
      callLLM3Task(topic),
    ]);
    return await aggregatorTask({
      topic,
      joke,
      story,
      poem,
    });
  }
);

//Invoke
(async () => {
  const stream = await parallelWorkflowFunction.stream("dogs", {
    streamMode: "updates",
  });
  for await (const step of stream) {
    console.log(step);
  }
})();
