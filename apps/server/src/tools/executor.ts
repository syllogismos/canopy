import { gemini, FLASH_MODEL } from "../gemini";

/** Execute a tool call by name. */
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ result: unknown; isError: boolean }> {
  switch (name) {
    case "web_search": {
      const query = args.query as string;
      if (!query)
        return { result: { error: "Missing required field: query" }, isError: true };

      const response = await gemini.models.generateContent({
        model: FLASH_MODEL,
        contents: [{ role: "user", parts: [{ text: query }] }],
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text ?? "";
      const sources =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(
          (chunk: any) => ({ title: chunk.web?.title, uri: chunk.web?.uri })
        ) ?? [];

      return { result: { text, sources }, isError: false };
    }

    case "compare_items": {
      if (!args.title || !args.columns || !args.rows) {
        return {
          result: { error: "Missing required fields: title, columns, rows" },
          isError: true,
        };
      }
      return {
        result: {
          type: "comparison",
          title: args.title,
          columns: args.columns,
          rows: args.rows,
          recommendation: args.recommendation ?? null,
        },
        isError: false,
      };
    }

    case "create_checklist": {
      if (!args.title || !args.items) {
        return {
          result: { error: "Missing required fields: title, items" },
          isError: true,
        };
      }
      return {
        result: {
          type: "checklist",
          title: args.title,
          items: args.items,
        },
        isError: false,
      };
    }

    default:
      return {
        result: { error: `Unknown tool: ${name}` },
        isError: true,
      };
  }
}
