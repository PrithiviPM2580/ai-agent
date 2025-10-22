import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import config from "./src/config/env.config";

(async () => {
  const model = new ChatGoogleGenerativeAI({
    model: config.MODEL,
    apiKey: config.GEMINI_API_KEY,
    temperature: 0.7,
    maxOutputTokens: 2048,
  });

})();
