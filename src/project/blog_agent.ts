// Blog Agent using Google Gemini and LangGraph

//Graph API

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";
import { z } from "zod";
import config from "../config/env.config";

const sectionSchema = z.object({
  name: z.string().describe("The name of the document section"),
  description: z
    .string()
    .describe("A brief description of the document section"),
});

const sectionsSchema = z.object({
  sections: z
    .array(sectionSchema)
    .min(2)
    .max(5)
    .describe("List of document sections"),
});
type SectionSchema = z.infer<typeof sectionSchema>;
type SectionsSchema = z.infer<typeof sectionsSchema>;

//Initialize LLM using Google Gemini
const llmGraph = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

//Structured output for sections planning
const planner = llmGraph.withStructuredOutput(sectionsSchema);

//Graph State
const StateAnnotation = Annotation.Root({
  blog: Annotation<string>,
  sections: Annotation<SectionsSchema[]>,
  completedSections: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
  finalBlog: Annotation<string>(),
});

const WorkerAnnotation = Annotation.Root({
  section: Annotation<SectionSchema>,
  completedSections: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
});

// Orchestrator to plan blog sections
async function orchestrator(state: typeof StateAnnotation.State) {
  const blogList = await planner.invoke([
    {
      role: "system",
      content: "You are a blog creator",
    },
    {
      role: "user",
      content: `Here is the blog to create: ${state.blog}`,
    },
  ]);
  return { sections: blogList.sections };
}

// Worker to plan blog sections
async function worker(state: typeof WorkerAnnotation.State) {
  const sectionWork = await llmGraph.invoke([
    {
      role: "system",
      content:
        "Write a blog section for the given name and description. Also the section must be format in markdown.",
    },
    {
      role: "user",
      content: `Write a blog with the ${state.section.name} with ${state.section.description}.`,
    },
  ]);
  return { completedSections: [sectionWork.content] };
}

// Synthesizer to put section of blog together
async function synthesizer(state: typeof StateAnnotation.State) {
  const completedSections = state.completedSections;
  const completedReportSections = completedSections.join("\n\n---\n\n");
  return { finalBlog: completedReportSections };
}

// Conditional edge to create each blog
function assignWorkers(state: typeof StateAnnotation.State) {
  return state.sections.map((section) => new Send("worker", { section }));
}

// Construct the state graph of blog workflow
const blogWorkFlow = new StateGraph(StateAnnotation)
  .addNode("orchestrator", orchestrator)
  .addNode("worker", worker)
  .addNode("synthesizer", synthesizer)
  .addEdge("__start__", "orchestrator")
  .addConditionalEdges("orchestrator", assignWorkers, ["worker"])
  .addEdge("worker", "synthesizer")
  .addEdge("synthesizer", "__end__")
  .compile();

//Invoke
(async () => {
  const response = await blogWorkFlow.invoke({
    blog: "Write a blog about NextJS",
  });
  console.log(response.finalBlog);
})();
