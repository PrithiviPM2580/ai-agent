import { initChatModel } from "langchain";
import config from "../../config/env.config";

(async () => {
  const model = await initChatModel(config.MODEL, {
    modelProvider: "google-genai",
    apiKey: config.GEMINI_API_KEY,
    temperature: 0.7,
    maxOutputTokens: 1024,
  });

  const responses = await model.batch([
    "Why do parrots have colorful feathers?",
    "How do airplanes fly?",
    "What is quantum computing?",
    "Why do parrots have colorful feathers?",
    "How do airplanes fly?",
    "What is quantum computing?",
  ]);

  for (const response of responses) {
    console.log("Respose: ", response);
  }
})();
