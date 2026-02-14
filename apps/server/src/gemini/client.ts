import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required. See .env.sample");
}

export const gemini = new GoogleGenAI({ apiKey });

/** Flash model for planning + function-calling with visible reasoning */
export const FLASH_MODEL = "gemini-2.5-flash-preview-05-20";

/** Pro model fallback */
export const PRO_MODEL = "gemini-2.5-pro-preview-05-06";
