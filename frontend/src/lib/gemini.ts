import { GoogleGenAI, Type } from "@google/genai";

export { Type };

// Standard model for text/analysis tasks per skill
export const MODEL_NAME = "gemini-3-flash-preview";

// Initialize AI lazily
let aiInstance: GoogleGenAI | null = null;

export function getAi() {
  if (!aiInstance) {
    // Note: process.env.GEMINI_API_KEY is handled by the platform for frontend calls
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[GEMINI_LIB] API key missing. AI features will fail.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey as string });
  }
  return aiInstance;
}
