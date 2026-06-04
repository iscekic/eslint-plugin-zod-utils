# `zod-utils/no-inline-zod-schema`

Disallows creating Zod schemas outside module initialization.

## Why

Zod schemas are immutable runtime objects. Creating them inline in functions, callbacks, hooks, render paths, or instance fields repeatedly allocates equivalent schema objects and makes schemas harder to share, test, and inspect.

## Allowed

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
});
```

```ts
import { object, string } from "zod";

export const UserSchema = object({
  id: string(),
});
```

```ts
import { z } from "zod";

app.post("/users", {
  body: z.object({
    id: z.string(),
  }),
});
```

```ts
import { UserSchema } from "./schemas";

const PublicUserSchema = UserSchema.pick({
  id: true,
});
```

## Disallowed

```ts
import { z } from "zod";

function buildSchema() {
  return z.object({
    id: z.string(),
  });
}
```

```ts
import { z } from "zod";

app.post("/users", (request) => {
  return z.object({
    id: z.string(),
  }).parse(request.body);
});
```

```ts
import z from "zod";

function buildSchema() {
  return z.string();
}
```

```ts
import { UserSchema } from "./schemas";

function buildSchema() {
  return UserSchema.pick({
    id: true,
  });
}
```

## Notes

Nested field schemas inside an allowed module-initialized schema are allowed. For example, `z.string()` is valid inside a module-level `z.object({ id: z.string() })`.

The rule recognizes named, namespace, aliased, default, and direct factory imports from `zod`.

When `@typescript-eslint/parser` provides type information, the rule also detects derived schemas created from imported Zod schema values through combinators such as `.extend()`, `.pick()`, `.omit()`, `.merge()`, `.partial()`, `.optional()`, `.nullable()`, `.array()`, `.transform()`, and `.refine()`.

The rule does not infer schemas from variable names and does not assume a global `z` identifier refers to Zod.
