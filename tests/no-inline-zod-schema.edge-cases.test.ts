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

function inlineSchemaErrors(count: number): Array<{ messageId: "inlineSchema" }> {
  return Array.from({ length: count }, () => ({ messageId: "inlineSchema" }));
}

ruleTester.run("no-inline-zod-schema edge cases", noInlineZodSchema, {
  valid: [
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
      name: "reports schemas imported from the zod v4 subpath outside module scope",
      code: `
        import zod from "zod/v4";
        import { object, string, z } from "zod/v4";

        function getSchemas() {
          return [
            z.object({
              id: z.string(),
            }),
            object({
              id: string(),
            }),
            zod.string(),
          ];
        }
      `,
      errors: inlineSchemaErrors(3),
    },
    {
      name: "reports schemas created through default-as named Zod imports",
      code: `
        import { default as zod } from "zod";

        function getSchema() {
          return zod.object({
            id: zod.string(),
          });
        }
      `,
      errors: inlineSchemaErrors(1),
    },
    {
      name: "reports schemas imported from zod mini subpaths outside module scope",
      code: `
        import * as zMini from "zod/mini";
        import { object, string } from "zod/v4-mini";

        function getSchemas() {
          return [
            zMini.object({
              id: zMini.string(),
            }),
            object({
              id: string(),
            }),
          ];
        }
      `,
      errors: inlineSchemaErrors(2),
    },
    {
      name: "reports schemas imported from the zod v3 subpath outside module scope",
      code: `
        import zod from "zod/v3";
        import { effect, ostring, pipeline, transformer, z } from "zod/v3";

        function getSchemas() {
          return [
            z.object({
              id: z.string(),
            }),
            zod.string(),
            z.effect(z.string(), {
              type: "refinement",
              refinement: () => true,
            }),
            z.pipeline(z.string(), z.string()),
            z.transformer(z.string(), z.string(), (value) => value),
            z.ostring(),
            effect(z.string(), {
              type: "refinement",
              refinement: () => true,
            }),
            pipeline(z.string(), z.string()),
            transformer(z.string(), z.string(), (value) => value),
            ostring(),
          ];
        }
      `,
      errors: inlineSchemaErrors(10),
    },
    {
      name: "reports schemas created inside module-level schema callbacks that run during parsing",
      code: `
        import { z } from "zod";

        const PayloadSchema = z.string().transform((value) => {
          const ParsedPayloadSchema = z.object({
            id: z.string(),
          });

          return ParsedPayloadSchema.parse(JSON.parse(value));
        });

        const RecursiveSchema = z.lazy(() =>
          z.object({
            id: z.string(),
          }),
        );

        const RefinedSchema = z.string().refine((value) => {
          z.object({
            id: z.string(),
          });

          return value.length > 0;
        });

        const SuperRefinedSchema = z.string().superRefine((value, ctx) => {
          z.object({
            id: z.string(),
          });
        });

        const PreprocessedSchema = z.preprocess((value) => {
          z.object({
            id: z.string(),
          });

          return value;
        }, z.string());

        const CustomSchema = z.custom((value) => {
          z.object({
            id: z.string(),
          });

          return true;
        });

        const DefaultSchema = z.unknown().default(() => {
          z.object({
            id: z.string(),
          });

          return "fallback";
        });

        const CatchSchema = z.unknown().catch(() => {
          z.object({
            id: z.string(),
          });

          return "fallback";
        });
      `,
      errors: inlineSchemaErrors(8),
    },
    {
      name: "reports nested schemas created inside runtime schema callbacks even when the outer schema is inline",
      code: `
        import { z } from "zod";

        function getParser() {
          return z.string().transform((value) => {
            const ParsedPayloadSchema = z.object({
              id: z.string(),
            });

            return ParsedPayloadSchema.parse(JSON.parse(value));
          });
        }
      `,
      errors: inlineSchemaErrors(2),
    },
    {
      name: "reports schemas created through module-level aliases of Zod imports",
      code: `
        import { object, string, z } from "zod";

        const schema = z;
        const makeObject = object;
        const makeString = string;
        const objectFromMember = z.object;
        const stringFromMember = z.string;
        const { object: objectFromDestructure, string: stringFromDestructure } = z;
        const coerce = z.coerce;
        const { string: coerceString } = z.coerce;

        function getSchemas() {
          return [
            schema.object({
              id: stringFromMember(),
            }),
            objectFromMember({
              id: stringFromMember(),
            }),
            makeObject({
              id: makeString(),
            }),
            objectFromDestructure({
              id: stringFromDestructure(),
            }),
            coerce.string(),
            coerceString(),
          ];
        }
      `,
      errors: inlineSchemaErrors(6),
    },
    {
      name: "reports schemas created through function-local aliases of Zod imports",
      code: `
        import { object, string, z } from "zod";

        function getSchemas() {
          const schema = z;
          const makeObject = object;
          const makeString = string;
          const objectFromMember = z.object;
          const { object: objectFromDestructure, string: stringFromDestructure } = z;

          return [
            schema.object({
              id: makeString(),
            }),
            makeObject({
              id: makeString(),
            }),
            objectFromMember({
              id: makeString(),
            }),
            objectFromDestructure({
              id: stringFromDestructure(),
            }),
          ];
        }
      `,
      errors: inlineSchemaErrors(4),
    },
    {
      name: "reports schemas created through CommonJS Zod imports",
      code: `
        const zod = require("zod");
        const { object, string, z } = require("zod");
        const requiredZ = require("zod").z;
        const requiredObject = require("zod").object;
        const requiredString = require("zod").string;
        const zodV4 = require("zod/v4");

        function getSchemas() {
          return [
            z.object({
              id: z.string(),
            }),
            zod.object({
              id: zod.string(),
            }),
            object({
              id: string(),
            }),
            requiredZ.object({
              id: requiredZ.string(),
            }),
            requiredObject({
              id: requiredString(),
            }),
            zodV4.object({
              id: zodV4.string(),
            }),
          ];
        }
      `,
      errors: inlineSchemaErrors(6),
    },
    {
      name: "reports schemas created through direct CommonJS Zod require calls",
      code: `
        function getSchemas() {
          return [
            require("zod").object({
              id: require("zod").string(),
            }),
            require("zod").z.object({
              id: require("zod").z.string(),
            }),
          ];
        }
      `,
      errors: inlineSchemaErrors(2),
    },
    {
      name: "reports schemas created through function-local CommonJS Zod imports",
      code: `
        function getSchemas() {
          const zod = require("zod");
          const { object, string, z } = require("zod");
          const requiredZ = require("zod").z;
          const requiredObject = require("zod").object;
          const requiredString = require("zod").string;

          return [
            z.object({
              id: z.string(),
            }),
            zod.object({
              id: zod.string(),
            }),
            object({
              id: string(),
            }),
            requiredZ.object({
              id: requiredZ.string(),
            }),
            requiredObject({
              id: requiredString(),
            }),
          ];
        }
      `,
      errors: inlineSchemaErrors(5),
    },
    {
      name: "reports Zod 4 namespace schema factories outside module scope",
      code: `
        import { z } from "zod";

        function getSchemas() {
          return [
            z.guid(),
            z.int(),
            z.json(),
          ];
        }
      `,
      errors: inlineSchemaErrors(3),
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
      errors: inlineSchemaErrors(1),
    },
    {
      name: "reports schemas created inside top-level tRPC procedure callbacks",
      code: `
        import { z } from "zod";

        export const router = createRouter({
          getUser: procedure.query(async ({ input }) => {
            const ResultSchema = z.object({
              id: z.string(),
            });

            return ResultSchema.parse(input);
          }),
          updateUser: procedure.mutation(({ input }) => {
            return z.object({
              id: z.string(),
            }).parse(input);
          }),
        });
      `,
      errors: inlineSchemaErrors(2),
    },
    {
      name: "reports schemas created inside top-level route handler callbacks",
      code: `
        import { z } from "zod";

        app.post("/users", async (c) => {
          const BodySchema = z.object({
            id: z.string(),
          });

          return c.json(BodySchema.parse(await c.req.json()));
        });
      `,
      errors: inlineSchemaErrors(1),
    },
  ],
});
