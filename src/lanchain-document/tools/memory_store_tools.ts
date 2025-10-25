import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, tool } from "langchain";
import { z } from "zod";
import { InMemoryStore } from "@langchain/langgraph";
import config from "../../config/env.config";

const store = new InMemoryStore();

const getUserInfo = tool(
  async ({ user_id }) => {
    const value = await store.get(["users"], user_id);
    console.log("get_user_info:", user_id, value);
    return value;
  },
  {
    name: "get_user_info",
    description: "Get user information by user ID",
    schema: z.object({
      user_id: z
        .string()
        .describe("The ID of the user to fetch information for."),
    }),
  }
);

const saveUserInfo = tool(
  async ({ user_id, name, age, email }) => {
    await store.put(["users"], user_id, { name, age, email });
    console.log("save_user_info", user_id, name, age, email);
    return `User info for ${name} saved successfully.`;
  },
  {
    name: "save_user_info",
    description: "Save user information",
    schema: z.object({
      user_id: z
        .string()
        .describe("The ID of the user to save information for."),
      name: z.string().describe("The name of the user."),
      age: z.number().describe("The age of the user."),
      email: z.string().describe("The email of the user."),
    }),
  }
);

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [getUserInfo, saveUserInfo],
  store,
});

(async () => {
  await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "Save the following user: userid: abc123, name: Prithivi Thapa, age: 22, email: prithivi@langchain.dev",
      },
    ],
  });

  const result = await agent.invoke({
    messages: [
      { role: "user", content: "Get user info for user with id 'abc123'" },
    ],
  });

  console.log(result.messages[2].content);
})();
