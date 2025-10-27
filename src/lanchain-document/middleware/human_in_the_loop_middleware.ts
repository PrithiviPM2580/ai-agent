import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { createAgent, tool, humanInTheLoopMiddleware } from "langchain";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";
import config from "../../config/env.config";

interface UserInfo {
  name?: string;
  age?: number;
  email?: string;
}

const store = new InMemoryStore();
const checkpointer = new MemorySaver();

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

const updateUserInfo = tool(
  async ({ user_id, name, age, email }) => {
    const existingData = (await store.get(["users"], user_id)) as UserInfo;
    if (!existingData) {
      return `User with ID ${user_id} does not exist.`;
    }
    const updatedData = {
      name: name ?? existingData?.name,
      age: age ?? existingData?.age,
      email: email ?? existingData?.email,
    };
    await store.put(["users"], user_id, updatedData);
    console.log("update_user_info", user_id, updatedData);
    return `User info for ID ${user_id} updated successfully.`;
  },
  {
    name: "update_user_info",
    description: "Update user information",
    schema: z.object({
      user_id: z
        .string()
        .describe("The ID of the user to update information for."),
      name: z.string().optional().describe("The name of the user."),
      age: z.number().optional().describe("The age of the user."),
      email: z.string().optional().describe("The email of the user."),
    }),
  }
);

const deleteUserInfo = tool(
  async ({ user_id }) => {
    await store.delete(["users"], user_id);
    console.log("delete_user_info:", user_id);
    return `User info for ID ${user_id} deleted successfully.`;
  },
  {
    name: "delete_user_info",
    description: "Delete user information by user ID",
    schema: z.object({
      user_id: z
        .string()
        .describe("The ID of the user to delete information for."),
    }),
  }
);

const humanInTheLoop = humanInTheLoopMiddleware({
  interruptOn: {
    get_user_info: false,
    save_user_info: true,
    update_user_info: true,
    delete_user_info: true,
  },
});

const model = new ChatGoogleGenerativeAI({
  model: config.MODEL,
  apiKey: config.GEMINI_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 1024,
});

const agent = createAgent({
  model,
  tools: [getUserInfo, saveUserInfo, updateUserInfo, deleteUserInfo],
  middleware: [humanInTheLoop],
  store,
  checkpointer,
});

(async () => {
  const configCheckPoint = { configurable: { thread_id: "thread_123" }, store };
  await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content:
            "Save the following user: userid: abc123, name: Prithivi Thapa, age: 22, email: prithivi@langchain.dev",
        },
      ],
    },
    configCheckPoint
  );

  const getResult = await agent.invoke(
    {
      messages: [
        { role: "user", content: "Get user info for user with id 'abc123'" },
      ],
    },
    configCheckPoint
  );

  if (getResult.__interrupt__) {
    console.log("Human intervention required for get_user_info.");
    return;
  } else {
    console.log("No human intervention required for get_user_info.");
  }

  //   const updateResult = await agent.invoke({
  //     messages: [
  //       {
  //         role: "user",
  //         content:
  //           "Update user with id 'abc123' to have email 'prithivi.thapa@langchain.dev'",
  //       },
  //     ],
  //   });

  //   const deleteResult = await agent.invoke({
  //     messages: [{ role: "user", content: "Delete user with id 'abc123'" }],
  //   });

  console.log("GetResult: ", getResult.messages[2].content);
  console.log(
    "\n-----Responses from update and delete tools are commented out-----\n",
    getResult
  );
})();
