import { MongoClient } from "mongodb";
import config from "./env.config";

const DB_NAME = "langchain";

async function connectToDatabase() {
  try {
    const client = new MongoClient(config.MONGODB_URI);
    const db = client.db(DB_NAME);
    await client.connect();
    return { client, db };
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
}

export default connectToDatabase;
