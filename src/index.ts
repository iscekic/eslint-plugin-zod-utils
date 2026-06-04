import { noInlineZodSchema } from "./rules/no-inline-zod-schema.js";

const ruleName = "zod-utils/no-inline-zod-schema";

const rules = {
  "no-inline-zod-schema": noInlineZodSchema,
};

type Plugin = {
  meta: {
    name: string;
    version: string;
  };
  rules: typeof rules;
  configs: {
    recommended?: {
      plugins: {
        "zod-utils": Plugin;
      };
      rules: Record<typeof ruleName, "error">;
    };
    "legacy-recommended"?: {
      plugins: ["zod-utils"];
      rules: Record<typeof ruleName, "error">;
    };
  };
};

const plugin: Plugin = {
  meta: {
    name: "eslint-plugin-zod-utils",
    version: "1.0.10",
  },
  rules,
  configs: {},
};

plugin.configs.recommended = {
  plugins: {
    "zod-utils": plugin,
  },
  rules: {
    [ruleName]: "error",
  },
};

plugin.configs["legacy-recommended"] = {
  plugins: ["zod-utils"],
  rules: {
    [ruleName]: "error",
  },
};

export const configs = plugin.configs;
export { rules };
export default plugin;
