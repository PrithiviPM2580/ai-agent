import { createAgent, HumanMessage, todoListMiddleware } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "../../config/env.config";

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
});

const agent = createAgent({
  model,
  middleware: [
    todoListMiddleware({
      systemPrompt:
        "You are a project planner. Break user requests into actionable TODOs.",
      toolDescription:
        "Use this tool to write down TODOs with clear, specific steps.",
    }),
  ],
});

(async () => {
  const result = await agent.invoke({
    messages: [
      new HumanMessage("Plan how to build a full-stack e-commerce app"),
    ],
  });
  console.log("Tool Message: ", result.messages[1].content);
  console.log("AI Response: ", result.messages[2].content);
  console.log("🧠 Model Response:\n", result.messages);
  //   console.log("✅ TODOs:\n", );
})();
