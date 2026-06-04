# `zod-utils/no-inline-zod-schema`

Disallows creating Zod schemas outside module-level variable declarations.

## Why

Zod schemas are immutable runtime objects. Creating them inline in functions, callbacks, hooks, render paths, or arguments repeatedly allocates equivalent schema objects and makes schemas harder to share, test, and inspect.

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

const parser = createParser(z.object({
  id: z.string(),
}));
```

## Notes

Nested field schemas inside an allowed top-level schema are allowed. For example, `z.string()` is valid inside a top-level `z.object({ id: z.string() })`.
