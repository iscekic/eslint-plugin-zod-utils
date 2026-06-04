import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";

const ZOD_FACTORY_IMPORTS = new Set([
  "any",
  "array",
  "base64",
  "base64url",
  "bigint",
  "boolean",
  "cidrv4",
  "cidrv6",
  "cuid",
  "cuid2",
  "custom",
  "date",
  "discriminatedUnion",
  "e164",
  "email",
  "emoji",
  "enum",
  "file",
  "function",
  "instanceof",
  "intersection",
  "ipv4",
  "ipv6",
  "jwt",
  "ksuid",
  "lazy",
  "literal",
  "map",
  "nan",
  "nanoid",
  "nativeEnum",
  "never",
  "null",
  "nullable",
  "number",
  "object",
  "optional",
  "preprocess",
  "promise",
  "record",
  "set",
  "string",
  "stringbool",
  "symbol",
  "templateLiteral",
  "tuple",
  "undefined",
  "union",
  "unknown",
  "ulid",
  "url",
  "uuid",
  "uuidv4",
  "uuidv6",
  "uuidv7",
  "void",
  "xid",
]);

const ZOD_NAMESPACE_IMPORTS = new Set(["z", "coerce", "iso"]);

type ScopeLike = {
  set?: Map<string, VariableLike>;
  upper?: ScopeLike | null;
  variables?: VariableLike[];
};

type VariableLike = {
  defs: Array<{
    node: TSESTree.Node;
    type: string;
  }>;
  name: string;
};

function findVariable(scope: ScopeLike | null, name: string): VariableLike | null {
  let currentScope = scope;

  while (currentScope) {
    const variable =
      currentScope.set?.get(name) ??
      currentScope.variables?.find((candidate) => candidate.name === name);

    if (variable) {
      return variable;
    }

    currentScope = currentScope.upper ?? null;
  }

  return null;
}

function getRootIdentifier(node: TSESTree.Node | null | undefined): TSESTree.Identifier | null {
  if (!node) {
    return null;
  }

  switch (node.type) {
    case "Identifier":
      return node;

    case "MemberExpression":
      return getRootIdentifier(node.object);

    case "CallExpression":
      return getRootIdentifier(node.callee);

    case "ChainExpression":
      return getRootIdentifier(node.expression);

    case "TSAsExpression":
    case "TSNonNullExpression":
    case "TSSatisfiesExpression":
    case "TSTypeAssertion":
      return getRootIdentifier(node.expression);

    default:
      return null;
  }
}

function isZodImportSpecifier(node: TSESTree.Node): boolean {
  if (
    node.type !== "ImportNamespaceSpecifier" &&
    node.type !== "ImportSpecifier"
  ) {
    return false;
  }

  const declaration = node.parent;

  if (declaration?.type !== "ImportDeclaration") {
    return false;
  }

  if (declaration.source.value !== "zod") {
    return false;
  }

  if (node.type === "ImportNamespaceSpecifier") {
    return true;
  }

  if (node.importKind === "type" || declaration.importKind === "type") {
    return false;
  }

  const importedName =
    node.imported.type === "Identifier" ? node.imported.name : node.imported.value;

  return ZOD_NAMESPACE_IMPORTS.has(importedName) || ZOD_FACTORY_IMPORTS.has(importedName);
}

function unwrapExpression(node: TSESTree.Node): TSESTree.Node {
  let current = node;

  while (
    current.parent?.type === "TSAsExpression" ||
    current.parent?.type === "TSNonNullExpression" ||
    current.parent?.type === "TSSatisfiesExpression" ||
    current.parent?.type === "TSTypeAssertion"
  ) {
    current = current.parent;
  }

  return current;
}

function isModuleLevelVariableInitializer(node: TSESTree.CallExpression): boolean {
  const expression = unwrapExpression(node);

  if (expression.parent?.type !== "VariableDeclarator") {
    return false;
  }

  if (expression.parent.init !== expression) {
    return false;
  }

  const declaration = expression.parent.parent;

  if (declaration.type !== "VariableDeclaration") {
    return false;
  }

  const container = declaration.parent;

  return (
    container.type === "Program" ||
    (container.type === "ExportNamedDeclaration" && container.parent.type === "Program")
  );
}

export const noInlineZodSchema = ESLintUtils.RuleCreator(
  (ruleName) => `https://www.npmjs.com/package/eslint-plugin-zod-utils#${ruleName}`,
)({
  name: "no-inline-zod-schema",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow creating Zod schemas outside module scope.",
    },
    messages: {
      inlineSchema:
        "Create Zod schemas at module scope instead of inline inside functions, callbacks, classes, or arguments.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    function isZodSchemaCall(node: TSESTree.CallExpression): boolean {
      const root = getRootIdentifier(node.callee);

      if (!root) {
        return false;
      }

      const scope = sourceCode.getScope(root) as ScopeLike;
      const variable = findVariable(scope, root.name);

      return variable?.defs.some((definition) => isZodImportSpecifier(definition.node)) ?? false;
    }

    function hasZodCallAncestor(node: TSESTree.Node): boolean {
      let current = node.parent;

      while (current) {
        if (current.type === "CallExpression" && isZodSchemaCall(current)) {
          return true;
        }

        current = current.parent;
      }

      return false;
    }

    return {
      CallExpression(node) {
        if (!isZodSchemaCall(node)) {
          return;
        }

        if (hasZodCallAncestor(node)) {
          return;
        }

        if (isModuleLevelVariableInitializer(node)) {
          return;
        }

        context.report({
          node,
          messageId: "inlineSchema",
        });
      },
    };
  },
});
