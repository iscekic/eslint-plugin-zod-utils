import { describe, expect, it } from "vitest";
import plugin, { configs, rules } from "../src/index.js";

describe("plugin export", () => {
  it("exports package metadata", () => {
    expect(plugin.meta).toEqual({
      name: "eslint-plugin-zod-utils",
      version: "1.0.10",
    });
  });

  it("exports the no-inline-zod-schema rule", () => {
    expect(rules["no-inline-zod-schema"]).toBeDefined();
    expect(plugin.rules["no-inline-zod-schema"]).toBe(rules["no-inline-zod-schema"]);
  });

  it("exports a flat recommended config", () => {
    expect(configs.recommended).toEqual({
      plugins: {
        "zod-utils": plugin,
      },
      rules: {
        "zod-utils/no-inline-zod-schema": "error",
      },
    });
  });

  it("exports a legacy recommended config for eslintrc users", () => {
    expect(configs["legacy-recommended"]).toEqual({
      plugins: ["zod-utils"],
      rules: {
        "zod-utils/no-inline-zod-schema": "error",
      },
    });
  });
});
