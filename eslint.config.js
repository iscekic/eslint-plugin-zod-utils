import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**"],
  },
  {
    files: ["**/*.js"],
    ...js.configs.recommended,
  },
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  {
    files: [
      "tests/fixtures/type-aware/schema-constraint-methods.ts",
      "tests/fixtures/type-aware/schema-methods.ts",
      "tests/fixtures/type-aware/v3-schema-methods.ts",
    ],
    rules: {
      "@typescript-eslint/no-deprecated": "off",
    },
  },
);
