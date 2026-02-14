import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";

/** Comparison table tool — model calls this after gathering info via grounding */
export const compareItemsDeclaration: FunctionDeclaration = {
  name: "compare_items",
  description:
    "Create a structured comparison table. Use this after researching options via search to present a clear side-by-side comparison to the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Title for the comparison (e.g. 'Mumbai to Delhi Trains')",
      },
      columns: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "Column headers (e.g. ['Train Name', 'Departure', 'Duration', 'Price'])",
      },
      rows: {
        type: Type.ARRAY,
        items: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        description: "Data rows, each an array of cell values matching columns",
      },
      recommendation: {
        type: Type.STRING,
        description: "Brief recommendation with reasoning",
      },
    },
    required: ["title", "columns", "rows"],
  },
};

/** Step-by-step checklist tool */
export const createChecklistDeclaration: FunctionDeclaration = {
  name: "create_checklist",
  description:
    "Create a structured step-by-step checklist. Use this for processes, applications, or eligibility guides.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Title for the checklist",
      },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            step: { type: Type.STRING, description: "Step title" },
            details: { type: Type.STRING, description: "Step details/instructions" },
            required: { type: Type.BOOLEAN, description: "Whether this step is mandatory" },
          },
          required: ["step", "details"],
        },
        description: "Ordered list of checklist items",
      },
    },
    required: ["title", "items"],
  },
};

/** Web search tool — delegates to a separate Gemini call with Google Search grounding */
export const webSearchDeclaration: FunctionDeclaration = {
  name: "web_search",
  description:
    "Search the web for real-time information using Google Search. Use this to find current prices, schedules, availability, news, government scheme details, or any factual information you need to answer the user's query.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The search query (e.g. 'Mumbai to Delhi trains today', 'PM Kisan scheme eligibility 2025')",
      },
    },
    required: ["query"],
  },
};

/** All tool declarations for the ReAct loop */
export const toolDeclarations: FunctionDeclaration[] = [
  webSearchDeclaration,
  compareItemsDeclaration,
  createChecklistDeclaration,
];
