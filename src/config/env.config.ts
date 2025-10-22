import "dotenv/config";

export const config = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  MODEL: "gemini-2.0-flash",
};

export default config;
