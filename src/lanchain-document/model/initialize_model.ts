import { initChatModel } from "langchain";
import config from "../../config/env.config";

(async () => {
  const geminiModel = await initChatModel(
    "gemini-2.0-flash", // model name
    { modelProvider: "google-genai", apiKey: config.GEMINI_API_KEY } // second argument
  );

  const response = await geminiModel.invoke(
    "Tell me a joke about programming."
  );
  console.log("Response", response.content);
})();
