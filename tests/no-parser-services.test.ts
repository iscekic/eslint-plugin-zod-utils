import parser from "@typescript-eslint/parser";
import { TSESLint } from "@typescript-eslint/utils";
import { describe, expect, it } from "vitest";
import { noInlineZodSchema } from "../src/rules/no-inline-zod-schema.js";

// Simulates hosts without a tseslint parser (for example oxlint's JS-plugin
// runtime): the AST is there, but parser services are not.
const bareParser = {
  meta: { name: "bare-parser" },
  parseForESLint(code: string, options?: unknown) {
    const { ast, scopeManager, visitorKeys } = parser.parseForESLint(
      code,
      options as Parameters<typeof parser.parseForESLint>[1],
    );
    return { ast, scopeManager, visitorKeys };
  },
};

function lint(code: string): TSESLint.Linter.LintMessage[] {
  const linter = new TSESLint.Linter({ configType: "flat" });
  return linter.verify(
    code,
    {
      files: ["**/*.ts"],
      plugins: {
        "zod-utils": {
          rules: { "no-inline-zod-schema": noInlineZodSchema },
        },
      },
      languageOptions: {
        parser: bareParser,
        parserOptions: { ecmaVersion: 2024, sourceType: "module" },
      },
      rules: { "zod-utils/no-inline-zod-schema": "error" },
    },
    "file.ts",
  );
}

describe("without parser services", () => {
  it("still reports inline schemas through the syntactic path", () => {
    const messages = lint(`
      import { z } from "zod";

      export function bad(value) {
        return z.string().safeParse(value).success;
      }
    `);

    expect(messages.map((message) => message.ruleId)).toEqual(["zod-utils/no-inline-zod-schema"]);
  });

  it("does not throw or report on module-level schemas", () => {
    const messages = lint(`
      import { z } from "zod";

      export const schema = z.string();
    `);

    expect(messages).toEqual([]);
  });
});
