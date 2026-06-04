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

## Notes

Nested field schemas inside an allowed module-initialized schema are allowed. For example, `z.string()` is valid inside a module-level `z.object({ id: z.string() })`.
