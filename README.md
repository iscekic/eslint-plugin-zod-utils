# eslint-plugin-zod-utils

ESLint utilities for safer Zod schema usage.

## Installation

```sh
npm install --save-dev eslint-plugin-zod-utils
```

## Usage

Flat config:

```js
import zodUtils from "eslint-plugin-zod-utils";

export default [
  zodUtils.configs.recommended,
];
```

Or configure the rule directly:

```js
import zodUtils from "eslint-plugin-zod-utils";

export default [
  {
    plugins: {
      "zod-utils": zodUtils,
    },
    rules: {
      "zod-utils/no-inline-zod-schema": "error",
    },
  },
];
```

Legacy eslintrc:

```json
{
  "extends": ["plugin:zod-utils/legacy-recommended"]
}
```

## Rules

### `zod-utils/no-inline-zod-schema`

Requires Zod schemas to be created during module initialization. This avoids recreating schemas inside functions, callbacks, render paths, hooks, or instance fields.

This rule was inspired by the motivation behind [`babel-plugin-zod-hoist`](https://github.com/gajus/babel-plugin-zod-hoist#motivation), which documents the cost of repeatedly initializing equivalent Zod schemas and the benefits of hoisting them.

Invalid:

```ts
import { z } from "zod";

function parseUser(input: unknown) {
  const UserSchema = z.object({
    id: z.string(),
  });

  return UserSchema.parse(input);
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

Valid:

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
});

function parseUser(input: unknown) {
  return UserSchema.parse(input);
}
```

```ts
import { z } from "zod";

app.post("/users", {
  body: z.object({
    id: z.string(),
  }),
});
```

The rule understands `import { z } from "zod"`, `import * as zod from "zod"`, aliased `z` imports, and direct named schema factories such as `import { object, string } from "zod"`.
It also understands default imports such as `import z from "zod"`.

When type information is available through `@typescript-eslint/parser`, the rule also reports repeated derived schema creation from imported Zod schemas:

```ts
import { UserSchema } from "./schemas";

function getPublicSchema() {
  return UserSchema.pick({ id: true });
}
```

```ts
import { BaseSchema, TenantIdSchema } from "./schemas";

function getTenantSchema() {
  return BaseSchema.extend({ tenantId: TenantIdSchema });
}
```

Type information is optional: on hosts that provide no parser services at all (for example oxlint's JS-plugin runtime), the rule falls back to the same syntactic detection instead of erroring.

This type-aware detection does not use schema-name conventions. If type information is unavailable, imported schema roots are not inferred from names such as `UserSchema` or `UserZodSchema`. The rule also does not assume a global `z` identifier refers to Zod.

## Development

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm pack --dry-run
```
