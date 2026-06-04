import parser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";
import { noInlineZodSchema } from "../src/rules/no-inline-zod-schema.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
    },
  },
});

ruleTester.run("no-inline-zod-schema edge cases", noInlineZodSchema, {
  valid: [
    {
      name: "allows a schema created in a top-level IIFE because it runs during module initialization",
      code: `
        import { z } from "zod";

        const UserSchema = (() =>
          z.object({
            id: z.string(),
          }))();
      `,
    },
    {
      name: "allows schemas created by top-level array callbacks because they run during module initialization",
      code: `
        import { z } from "zod";

        const FieldSchemas = ["id", "name"].map((key) =>
          z.object({
            [key]: z.string(),
          }),
        );
      `,
    },
  ],
  invalid: [
    {
      name: "reports Zod 4 namespace schema factories outside module scope",
      code: `
        import { z } from "zod";

        const JsonInput = z.unknown();
        const JsonOutput = z.unknown();

        function getSchemas() {
          return [
            z.codec(JsonInput, JsonOutput, {
              decode: (value) => value,
              encode: (value) => value,
            }),
            z.guid(),
            z.int(),
            z.json(),
          ];
        }
      `,
      errors: [
        { messageId: "inlineSchema" },
        { messageId: "inlineSchema" },
        { messageId: "inlineSchema" },
        { messageId: "inlineSchema" },
      ],
    },
    {
      name: "reports direct named Zod schema combinators outside module scope",
      code: `
        import { extend, z } from "zod";

        const BaseSchema = z.object({ id: z.string() });
        const NameSchema = z.string();

        function getSchema() {
          return extend(BaseSchema, {
            name: NameSchema,
          });
        }
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      name: "reports computed Zod namespace factory access outside module scope",
      code: `
        import { z } from "zod";

        function getSchema() {
          return z["object"]({
            id: z["string"](),
          });
        }
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
  ],
});
