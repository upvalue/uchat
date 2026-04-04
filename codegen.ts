import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "graph/schema.graphql",
  generates: {
    // Web frontend (existing) — uses operations from deno/operations.graphql
    // which are the same queries used by the web app.
    "./src/generated/": {
      preset: "client",
      documents: ["deno/operations.graphql"],
      config: {
        documentMode: "string",
      },
    },
    // Deno CLI client
    "./deno/_generated.ts": {
      documents: ["deno/operations.graphql"],
      plugins: ["typescript", "typescript-operations"],
      config: {
        // Keep it self-contained: no external imports
        onlyOperationTypes: false,
        skipTypename: true,
        enumsAsTypes: true,
        scalars: {
          JSON: "Record<string, unknown>",
          Time: "string",
        },
      },
    },
  },
};

export default config;
