import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "../../config/env.config";

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    name: z.string(),
    skill: z.string(),
  })
);

const prompt = `
Return a JSON object with a programmer's name and skill.
Format: ${parser.getFormatInstructions()}
`;

(async () => {
  const model = new ChatGoogleGenerativeAI({
    model: config.MODEL,
    apiKey: config.GEMINI_API_KEY,
    temperature: 0.7,
    maxOutputTokens: 2048,
  });
  const response = await model.invoke(prompt);
  const parsed = await parser.parse(response.content as string);

  console.log(parsed);
})();
