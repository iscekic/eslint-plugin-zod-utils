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

Requires Zod schemas to be created as module-level variable declarations. This avoids recreating schemas inside functions, callbacks, render paths, hooks, or argument lists.

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

const parser = createParser(z.object({
  id: z.string(),
}));
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

The rule understands `import { z } from "zod"`, `import * as zod from "zod"`, aliased `z` imports, and direct named schema factories such as `import { object, string } from "zod"`.

## Development

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm pack --dry-run
```
