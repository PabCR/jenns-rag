import { GoogleGenAI } from "@google/genai";

// Helper to ensure we always use the latest API key from the environment
export const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please connect your account first.");
  }
  return new GoogleGenAI({ apiKey });
};

