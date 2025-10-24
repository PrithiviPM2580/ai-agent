import { initChatModel } from "langchain";
import config from "../../config/env.config";

(async () => {
  const model = await initChatModel(config.MODEL, {
    modelProvider: "google-genai",
    apiKey: config.GEMINI_API_KEY,
    temperature: 0.7,
    maxTokens: 2048,
  });

  const stream = await model.stream("Why do parrots have colorful feathers?");
  for await (const chunk of stream) {
    console.log(chunk.text);
  }
})();
