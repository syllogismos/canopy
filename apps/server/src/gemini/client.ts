import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required. See .env.sample");
}

export const gemini = new GoogleGenAI({ apiKey });

/** Flash model for planning + function-calling with visible reasoning */
export const FLASH_MODEL = "gemini-3-flash-preview";

/** Pro model fallback */
export const PRO_MODEL = "gemini-3-pro-preview";
