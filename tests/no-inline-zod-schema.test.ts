import parser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

const tsconfigRootDir = fileURLToPath(new URL("..", import.meta.url));

const typeAwareRuleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2024,
      projectService: true,
      sourceType: "module",
      tsconfigRootDir,
    },
  },
});

function readFixture(name: string): string {
  return readFileSync(new URL(`fixtures/type-aware/${name}`, import.meta.url), "utf8");
}

function inlineSchemaErrors(count: number): Array<{ messageId: "inlineSchema" }> {
  return Array.from({ length: count }, () => ({ messageId: "inlineSchema" }));
}

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
      name: "allows top-level route config schemas because they are evaluated once",
      code: `
        import { z } from "zod";

        app.post("/users", {
          body: z.object({
            id: z.string(),
          }),
        });
      `,
    },
    {
      name: "allows schemas passed to top-level factory calls because they are evaluated once",
      code: `
        import { z } from "zod";

        export const parser = createParser(z.object({
          id: z.string(),
        }));
      `,
    },
    {
      name: "allows static class field schemas because they are evaluated once with the class definition",
      code: `
        import { z } from "zod";

        class Parser {
          static schema = z.object({
            id: z.string(),
          });
        }
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
    {
      name: "ignores global z references because the rule does not assume z is Zod",
      code: `
        function build() {
          return z.string();
        }
      `,
    },
    {
      name: "does not infer imported schema roots by name without type information",
      code: `
        import { UserZodSchema } from "./schemas";

        function build() {
          return UserZodSchema.pick({ id: true });
        }
      `,
    },
    {
      name: "ignores Zod error formatting utilities inside functions",
      code: `
        import { z } from "zod";

        function formatError(error: z.ZodError) {
          return {
            flattened: z.flattenError(error),
            pretty: z.prettifyError(error),
            tree: z.treeifyError(error),
          };
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
      name: "reports default z imports outside module scope",
      code: `
        import z from "zod";

        function getSchema() {
          return z.string();
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
      name: "reports instance class field schemas because they are evaluated for each instance",
      code: `
        import { z } from "zod";

        class Parser {
          schema = z.object({
            id: z.string(),
          });
        }
      `,
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      name: "reports Zod namespace schema factories outside module scope",
      code: `
        import { iso as zodIso, z } from "zod";

        function getSchemas(jsonSchema: Parameters<typeof z.fromJSONSchema>[0]) {
          return [
            z.coerce.string(),
            z.fromJSONSchema(jsonSchema),
            z.iso.datetime(),
            zodIso.datetime(),
            z.looseObject({ id: z.string() }),
            z.strictObject({ id: z.string() }),
          ];
        }
      `,
      errors: [
        { messageId: "inlineSchema" },
        { messageId: "inlineSchema" },
        { messageId: "inlineSchema" },
        { messageId: "inlineSchema" },
        { messageId: "inlineSchema" },
        { messageId: "inlineSchema" },
      ],
    },
  ],
});

typeAwareRuleTester.run("no-inline-zod-schema typed schema roots", noInlineZodSchema, {
  valid: [
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/non-zod-builder.ts`,
      name: "ignores imported non-Zod builders with schema-like method names",
      code: readFixture("non-zod-builder.ts"),
    },
  ],
  invalid: [
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/pick.ts`,
      name: "reports imported Zod schema combinators outside module scope",
      code: readFixture("pick.ts"),
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/extend.ts`,
      name: "reports imported Zod schema combinators without inline z calls",
      code: readFixture("extend.ts"),
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/safe-extend.ts`,
      name: "reports imported Zod safeExtend combinators without inline z calls",
      code: readFixture("safe-extend.ts"),
      errors: [{ messageId: "inlineSchema" }],
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/namespace-schema-roots.ts`,
      name: "reports Zod schema methods through namespace-imported schema roots",
      code: readFixture("namespace-schema-roots.ts"),
      errors: inlineSchemaErrors(2),
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/schema-container-roots.ts`,
      name: "reports Zod schema methods through object-contained schema roots",
      code: readFixture("schema-container-roots.ts"),
      errors: inlineSchemaErrors(2),
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/schema-return-roots.ts`,
      name: "reports Zod schema methods through schema-returning call roots",
      code: readFixture("schema-return-roots.ts"),
      errors: inlineSchemaErrors(2),
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/schema-methods.ts`,
      name: "reports imported Zod schema-producing methods without inline z calls",
      code: readFixture("schema-methods.ts"),
      errors: inlineSchemaErrors(11),
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/schema-constraint-methods.ts`,
      name: "reports imported Zod schema constraint methods without inline z calls",
      code: readFixture("schema-constraint-methods.ts"),
      errors: inlineSchemaErrors(33),
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/schema-enum-methods.ts`,
      name: "reports imported Zod enum schema-producing methods without inline z calls",
      code: readFixture("schema-enum-methods.ts"),
      errors: inlineSchemaErrors(2),
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/v3-schema-methods.ts`,
      name: "reports Zod v3 schema-producing methods without inline z calls",
      code: readFixture("v3-schema-methods.ts"),
      errors: inlineSchemaErrors(25),
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/reexported-zod-factories.ts`,
      name: "reports Zod factories imported through local re-exports",
      code: readFixture("reexported-zod-factories.ts"),
      errors: inlineSchemaErrors(2),
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/reexported-zod-star-factories.ts`,
      name: "reports Zod factories imported through local star and default re-exports",
      code: readFixture("reexported-zod-star-factories.ts"),
      errors: inlineSchemaErrors(3),
    },
    {
      filename: `${tsconfigRootDir}/tests/fixtures/type-aware/reexported-zod-namespace-factories.ts`,
      name: "reports Zod factories imported through local namespace and default re-exports",
      code: readFixture("reexported-zod-namespace-factories.ts"),
      errors: inlineSchemaErrors(3),
    },
  ],
});
