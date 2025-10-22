import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import config from "../../config/env.config";

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 2048,
});

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    language: z.string(),
    ide: z.string(),
    description: z.string(),
    code: z.string(),
  })
);

const prompt = new PromptTemplate({
  inputVariables: ["language", "ide"],
  partialVariables: {
    format_instructions: parser.getFormatInstructions(),
  },
  template: `
You are a senior software developer.

Write a short "Hello, World!" program in {language} that runs inside {ide}.
Include a short description of what the code does.

Return the response strictly as JSON with the keys language, ide, description, and code:
{format_instructions}
  `,
});

const chain = RunnableSequence.from([prompt, model, parser]);

(async () => {
  const response = await chain.invoke({
    language: "Javascript",
    ide: "Nodejs",
  });
  console.log(response);
})();
