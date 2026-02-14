/** Execute a tool call by name. These are "formatting" tools — the model
 *  provides the structured content, we just validate and pass it through. */
export function executeTool(
  name: string,
  args: Record<string, unknown>
): { result: unknown; isError: boolean } {
  switch (name) {
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
