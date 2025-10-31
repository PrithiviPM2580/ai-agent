import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { z } from "zod";
import config from "../../config/env.config";

// ✅ Structured output parser for annotations
const feedbackSchema = z.object({
  grade: z
    .enum(["funny", "not funny"])
    .describe("Decide if the joke is funny or not funny"),
  feedback: z
    .string()
    .describe(
      "If the joke is not funny, provide feedback on how to improve it."
    ),
});

// ✅ Type
type Feedback = z.infer<typeof feedbackSchema>;

// ✅ State Graph Annotation
const StateAnnotation = Annotation.Root({
  joke: Annotation<string>,
  topic: Annotation<string>,
  feedback: Annotation<string>,
  funnyOrNot: Annotation<string>,
});

// ✅ Initialize the Google Generative AI model
const llmGraph = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

// ✅ Structured output parser for feedback
const evaluator = llmGraph.withStructuredOutput(feedbackSchema);

// Helper: format duration
function formatDuration(ms: number) {
  return `${(ms / 1000).toFixed(2)} sec`;
}

// ✅ Initial Joke Generation Node
async function llmCallGenerateJoke(state: typeof StateAnnotation.State) {
  const start = Date.now();
  console.log("\n🟢 [GenerateJoke] Starting node...");
  console.log("⏱️ Start Time:", new Date(start).toLocaleTimeString());
  console.log("Current State Input:", state);

  let msg;
  if (state.feedback) {
    console.log("🗣️ Using feedback from previous iteration:", state.feedback);
    msg = await llmGraph.invoke(
      `Write a joke about ${state.topic} but take into account the feedback: ${state.feedback}`
    );
  } else {
    console.log("🆕 No feedback found. Generating a new joke...");
    msg = await llmGraph.invoke(`Write a joke about ${state.topic}`);
  }

  const end = Date.now();
  console.log("✅ [GenerateJoke] Joke Generated:", msg.content);
  console.log("⏳ Duration:", formatDuration(end - start));
  console.log("🏁 End Time:", new Date(end).toLocaleTimeString());
  return { joke: msg.content };
}

// ✅ Joke Evaluation Node
async function llmCallEvaluateJoke(state: typeof StateAnnotation.State) {
  const start = Date.now();
  console.log("\n🟠 [EvaluateJoke] Evaluating joke...");
  console.log("⏱️ Start Time:", new Date(start).toLocaleTimeString());
  console.log("Joke to evaluate:", state.joke);

  const grade = await evaluator.invoke(`Grade the joke ${state.joke}`);

  const end = Date.now();
  console.log("📊 [EvaluateJoke] Evaluation Result:", grade);
  console.log("⏳ Duration:", formatDuration(end - start));
  console.log("🏁 End Time:", new Date(end).toLocaleTimeString());
  return { funnyOrNot: grade.grade, feedback: grade.feedback };
}

// ✅ Conditional edge to check if the joke is funny
function routeJoke(state: typeof StateAnnotation.State) {
  console.log("\n⚙️ [Router] Deciding next step based on evaluation...");
  console.log("FunnyOrNot:", state.funnyOrNot);
  console.log("Feedback:", state.feedback);

  if (state.funnyOrNot === "funny") {
    console.log("🎉 [Router] Joke accepted! Ending workflow.");
    return "Accepted";
  } else if (state.funnyOrNot === "not funny") {
    console.log("🔁 [Router] Joke rejected. Sending back for improvement.");
    return "Rejected + Feedback";
  } else {
    console.log("⚠️ [Router] Unexpected evaluation. Retrying...");
    return "Rejected + Feedback"; // fallback
  }
}

// ✅ Define the State Graph Workflow
const optimizerWorkflow = new StateGraph(StateAnnotation)
  .addNode("Generate Joke", llmCallGenerateJoke)
  .addNode("Evaluate Joke", llmCallEvaluateJoke)
  .addEdge("__start__", "Generate Joke")
  .addEdge("Generate Joke", "Evaluate Joke")
  .addConditionalEdges("Evaluate Joke", routeJoke, {
    Accepted: "__end__",
    "Rejected + Feedback": "Generate Joke",
  })
  .addEdge("Generate Joke", "__end__")
  .compile();

// ✅ Invoke
(async () => {
  const totalStart = Date.now();
  console.log("🚀 Starting Evaluator-Optimizer Workflow...");
  console.log(
    "🕒 Workflow Start Time:",
    new Date(totalStart).toLocaleTimeString()
  );

  const state = await optimizerWorkflow.invoke({ topic: "Cats" });

  const totalEnd = Date.now();
  console.log("\n🏁 [Final Output]");
  console.log("Topic:", state.topic);
  console.log("Final Joke:", state.joke);
  console.log("Feedback:", state.feedback);
  console.log("Evaluation:", state.funnyOrNot);

  console.log(
    "\n⏰ Total Workflow Duration:",
    formatDuration(totalEnd - totalStart)
  );
  console.log("🕓 Workflow End Time:", new Date(totalEnd).toLocaleTimeString());
})();
