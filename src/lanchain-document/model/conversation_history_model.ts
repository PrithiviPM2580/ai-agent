import { initChatModel } from "langchain";
import config from "../../config/env.config";
import { AIMessage, HumanMessage, SystemMessage } from "langchain";

//First way of doing conversation with history
(async () => {
  const geminiModel = await initChatModel(
    "gemini-2.0-flash", // model name
    { modelProvider: "google-genai", apiKey: config.GEMINI_API_KEY } // second argument
  );
  const conversation1 = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello! Who won the world series in 2020?" },
    {
      role: "assistant",
      content: "The Los Angeles Dodgers won the World Series in 2020.",
    },
    { role: "user", content: "Where was it played?" },
  ];
  const response1 = await geminiModel.invoke(conversation1);
  console.log("Response", response1.content);
  console.log("Conversation: ", conversation1);
})();

//Second way of doing conversation with history
(async () => {
  const geminiModel = await initChatModel("gemini-2.0-flash", {
    modelProvider: "google-genai",
    apiKey: config.GEMINI_API_KEY,
  });
  const conversation2 = [
    new SystemMessage(
      "You are a helpful assistant that translates English to French."
    ),
    new HumanMessage("Translate: I love programming."),
    new AIMessage("J'adore la programmation."),
    new HumanMessage("Translate: I love building applications."),
  ];
  const response2 = await geminiModel.invoke(conversation2);
  console.log("Response", response2.content);
  console.log("Conversation: ", conversation2);
})();
