// Graph API

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Annotation, StateGraph, Send } from "@langchain/langgraph";
import { z } from "zod";
import config from "../../config/env.config";

//Type
type SectionSchema = {
  name: string;
  description: string;
};
type SectionsSchema = {
  sections: SectionSchema[];
};

// Schema for document sections
const sectionSchema = z.object({
  name: z.string().describe("The name of the document section"),
  description: z
    .string()
    .describe("A brief description of the document section"),
});

const sectionsSchema = z.object({
  sections: z
    .array(sectionSchema)
    .min(1)
    .max(3)
    .describe("List of document sections"),
});

// Initialize LLM using Google Gemini
const llmGraph = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const planner = llmGraph.withStructuredOutput(sectionsSchema);

// Graph State
const StateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  sections: Annotation<SectionsSchema[]>,
  completedSections: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
  finalReport: Annotation<string>(),
});

//Worker State
const WorkerStateAnnotation = Annotation.Root({
  section: Annotation<SectionSchema>,
  completedSections: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
});

//Nodes

// Orchestrator Worker to plan document sections
async function orchestrator(state: typeof StateAnnotation.State) {
  const reportSections = await planner.invoke([
    { role: "system", content: "Generate a plan" },
    { role: "user", content: `Here is the report topic: ${state.topic}` },
  ]);
  return { sections: reportSections.sections };
}

// Worker to create individual document sections
async function worker(state: typeof WorkerStateAnnotation.State) {
  const section = await llmGraph.invoke([
    {
      role: "system",
      content:
        "Write a report section following the provided name and description. Include no preamble for each section. Use markdown formatting.",
    },
    {
      role: "user",
      content: `Here is the section name: ${state.section.name} and description: ${state.section.description}`,
    },
  ]);
  return { completedSections: [section.content] };
}

//Synthesizer to compile final report
async function synthesizer(state: typeof StateAnnotation.State) {
  const completedSections = state.completedSections;
  const completedReportSections = completedSections.join("\n\n---\n\n");
  return { finalReport: completedReportSections };
}

// Conditional edge function to create llm_call workers that each write a section of the report
function assignWorkers(state: typeof StateAnnotation.State) {
  return state.sections.map((section) => {
    return new Send("worker", { section });
  });
}

// Construct the state graph for the workflow
const orchestratorWorkerWorkflow = new StateGraph(StateAnnotation)
  .addNode("orchestrator", orchestrator)
  .addNode("worker", worker)
  .addNode("synthesizer", synthesizer)
  .addEdge("__start__", "orchestrator")
  .addConditionalEdges("orchestrator", assignWorkers, ["worker"])
  .addEdge("worker", "synthesizer")
  .addEdge("synthesizer", "__end__")
  .compile();

// Invoke
(async () => {
  const state = await orchestratorWorkerWorkflow.invoke({
    topic: "What is computer.",
  });
  console.log(state.finalReport);
})();
