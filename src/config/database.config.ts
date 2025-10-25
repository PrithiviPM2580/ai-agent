import { MongoClient } from "mongodb";
import config from "./env.config";

async function connectToDatabase() {
  try {
    const client = new MongoClient(config.MONGODB_URI);
    await client.connect();
    return client;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
}

export default connectToDatabase;
