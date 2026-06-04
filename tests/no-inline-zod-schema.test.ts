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

ruleTester.run("no-inline-zod-schema", noInlineZodSchema, {
  valid: [
    {
      name: "allows a namespace z schema declared as a module-level constant",
      code: `
        import { z } from "zod";

        const UserSchema = z.object({
          id: z.string(),
          tags: z.array(z.string()).optional(),
        });
      `,
    },
    {
      name: "allows exported module-level schemas",
      code: `
        import { z } from "zod";

        export const ParamsSchema = z.object({
          q: z.string().optional(),
        });
      `,
    },
    {
      name: "allows namespace imports",
      code: `
        import * as zod from "zod";

        const UserSchema = zod.object({
          id: zod.string(),
        });
      `,
    },
    {
      name: "allows aliased z imports",
      code: `
        import { z as schema } from "zod";

        const UserSchema = schema.object({
          id: schema.string(),
        });
      `,
    },
    {
      name: "allows direct named Zod factories at module scope",
      code: `
        import { object, string } from "zod";

        const UserSchema = object({
          id: string(),
        });
      `,
    },
    {
      name: "allows type operators around a module-level schema initializer",
      code: `
        import { z } from "zod";

        const UserSchema = z.object({
          id: z.string(),
        }) satisfies z.ZodTypeAny;
      `,
    },
    {
      name: "ignores non-Zod objects named z when zod is not imported",
      code: `
        const z = createBuilder();

        function build() {
          return z.object({ id: z.string() });
        }
      `,
    },
  ],
  invalid: [
    {
      name: "reports a schema created inside a function body",
      code: `
        import { z } from "zod";

        function parseUser(input: unknown) {
          const UserSchema = z.object({
            id: z.string(),
          });

          return UserSchema.parse(input);
        }
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      name: "reports a schema returned from a callback",
      code: `
        import { z } from "zod";

        const makeSchema = () => z.object({
          id: z.string(),
        });
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      name: "reports a schema passed as a function argument",
      code: `
        import { z } from "zod";

        export const parser = createParser(z.object({
          id: z.string(),
        }));
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      name: "reports a schema created inside a React hook callback",
      code: `
        import { z } from "zod";

        const Component = () => {
          const schema = useMemo(
            () => z.object({
              id: z.string(),
            }),
            [],
          );

          return null;
        };
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      name: "reports chained primitive schemas outside module scope",
      code: `
        import { z } from "zod";

        function getSchema() {
          return z.string().min(1).optional();
        }
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      name: "reports namespace imports outside module scope",
      code: `
        import * as zod from "zod";

        function getSchema() {
          return zod.object({
            id: zod.string(),
          });
        }
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      name: "reports direct named Zod factories outside module scope",
      code: `
        import { object, string } from "zod";

        function getSchema() {
          return object({
            id: string(),
          });
        }
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      name: "reports class field schemas because classes are not module-level declarations",
      code: `
        import { z } from "zod";

        class Parser {
          static schema = z.object({
            id: z.string(),
          });
        }
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
  ],
});
