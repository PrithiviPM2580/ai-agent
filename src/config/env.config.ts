import "dotenv/config";

export const config = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  MODEL: "gemini-2.0-flash",
  WEATHER_API_KEY: process.env.WEATHER_API_KEY,
  NEWS_API_KEY: process.env.NEWS_API_KEY,
};

export default config;
