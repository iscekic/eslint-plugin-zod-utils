import { ESLintUtils } from "@typescript-eslint/utils";
import type { ParserServices, TSESTree } from "@typescript-eslint/utils";
import type { Type } from "typescript";

const ZOD_FACTORY_IMPORTS = new Set([
  "any",
  "array",
  "base64",
  "base64url",
  "bigint",
  "boolean",
  "cidrv4",
  "cidrv6",
  "codec",
  "cuid",
  "cuid2",
  "custom",
  "date",
  "discriminatedUnion",
  "e164",
  "email",
  "emoji",
  "enum",
  "exactOptional",
  "file",
  "float32",
  "float64",
  "function",
  "fromJSONSchema",
  "guid",
  "hash",
  "hex",
  "hostname",
  "httpUrl",
  "instanceof",
  "int",
  "int32",
  "int64",
  "intersection",
  "invertCodec",
  "ipv4",
  "ipv6",
  "json",
  "jwt",
  "keyof",
  "ksuid",
  "lazy",
  "literal",
  "looseObject",
  "looseRecord",
  "mac",
  "map",
  "nan",
  "nanoid",
  "nativeEnum",
  "never",
  "nonoptional",
  "null",
  "nullable",
  "nullish",
  "number",
  "object",
  "optional",
  "partialRecord",
  "pipe",
  "prefault",
  "preprocess",
  "promise",
  "readonly",
  "record",
  "set",
  "string",
  "stringFormat",
  "stringbool",
  "strictObject",
  "success",
  "symbol",
  "templateLiteral",
  "transform",
  "tuple",
  "uint32",
  "uint64",
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
  "xor",
  "xid",
]);

const ZOD_DIRECT_COMBINATOR_IMPORTS = new Set([
  "catchall",
  "extend",
  "merge",
  "omit",
  "partial",
  "pick",
  "required",
  "safeExtend",
]);

const ZOD_NAMESPACE_IMPORTS = new Set(["z", "coerce", "iso"]);

const ZOD_ISO_FACTORY_IMPORTS = new Set(["date", "datetime", "duration", "time"]);

const ZOD_EXECUTION_METHODS = new Set([
  "parse",
  "parseAsync",
  "safeParse",
  "safeParseAsync",
]);

const ZOD_SCHEMA_COMBINATOR_METHODS = new Set([
  "and",
  "array",
  "brand",
  "catchall",
  "deepPartial",
  "describe",
  "extend",
  "merge",
  "nullable",
  "nullish",
  "omit",
  "optional",
  "or",
  "partial",
  "passthrough",
  "pick",
  "readonly",
  "refine",
  "required",
  "strict",
  "strip",
  "superRefine",
  "transform",
]);

const EAGER_CALLBACK_METHODS = new Set([
  "every",
  "filter",
  "find",
  "findIndex",
  "findLast",
  "findLastIndex",
  "flatMap",
  "forEach",
  "map",
  "reduce",
  "reduceRight",
  "some",
  "sort",
  "toSorted",
]);

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

type FunctionLike =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

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

function getStaticMemberName(node: TSESTree.MemberExpression): string | null {
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }

  if (
    node.computed &&
    node.property.type === "Literal" &&
    typeof node.property.value === "string"
  ) {
    return node.property.value;
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

function getRootMethodName(node: TSESTree.Node): string | null {
  let current = node;
  let rootMethodName: string | null = null;

  while (true) {
    if (current.type === "CallExpression") {
      current = current.callee;
      continue;
    }

    if (current.type === "MemberExpression") {
      if (current.object.type === "Identifier") {
        rootMethodName = getStaticMemberName(current);
      }

      current = current.object;
      continue;
    }

    return rootMethodName;
  }
}

function getMemberPathFromRoot(node: TSESTree.Node): string[] | null {
  const memberPath: string[] = [];
  let current = node;

  while (true) {
    if (current.type === "CallExpression") {
      current = current.callee;
      continue;
    }

    if (current.type === "ChainExpression") {
      current = current.expression;
      continue;
    }

    if (
      current.type === "TSAsExpression" ||
      current.type === "TSNonNullExpression" ||
      current.type === "TSSatisfiesExpression" ||
      current.type === "TSTypeAssertion"
    ) {
      current = current.expression;
      continue;
    }

    if (current.type === "MemberExpression") {
      const memberName = getStaticMemberName(current);

      if (memberName === null) {
        return null;
      }

      memberPath.unshift(memberName);
      current = current.object;
      continue;
    }

    return memberPath;
  }
}

function getCallMethodName(node: TSESTree.CallExpression): string | null {
  const { callee } = node;

  if (
    callee.type === "MemberExpression" &&
    getStaticMemberName(callee) !== null
  ) {
    return getStaticMemberName(callee);
  }

  return null;
}

type ZodImportKind =
  | { type: "factory" }
  | { importedName: string; type: "namespace" };

function getZodImportKind(node: TSESTree.Node): ZodImportKind | null {
  if (
    node.type !== "ImportDefaultSpecifier" &&
    node.type !== "ImportNamespaceSpecifier" &&
    node.type !== "ImportSpecifier"
  ) {
    return null;
  }

  const declaration = node.parent;

  if (declaration?.type !== "ImportDeclaration") {
    return null;
  }

  if (declaration.source.value !== "zod") {
    return null;
  }

  if (node.type === "ImportDefaultSpecifier" || node.type === "ImportNamespaceSpecifier") {
    return { importedName: "z", type: "namespace" };
  }

  if (node.importKind === "type" || declaration.importKind === "type") {
    return null;
  }

  const importedName =
    node.imported.type === "Identifier" ? node.imported.name : node.imported.value;

  if (ZOD_NAMESPACE_IMPORTS.has(importedName)) {
    return { importedName, type: "namespace" };
  }

  if (ZOD_FACTORY_IMPORTS.has(importedName) || ZOD_DIRECT_COMBINATOR_IMPORTS.has(importedName)) {
    return { type: "factory" };
  }

  return null;
}

function isZodSchemaNamespaceCall(
  importName: string,
  memberPath: string[],
): boolean {
  if (importName === "coerce") {
    return memberPath[0] !== undefined && ZOD_FACTORY_IMPORTS.has(memberPath[0]);
  }

  if (importName === "iso") {
    return memberPath[0] !== undefined && ZOD_ISO_FACTORY_IMPORTS.has(memberPath[0]);
  }

  if (memberPath[0] === "coerce") {
    return memberPath[1] !== undefined && ZOD_FACTORY_IMPORTS.has(memberPath[1]);
  }

  if (memberPath[0] === "iso") {
    return memberPath[1] !== undefined && ZOD_ISO_FACTORY_IMPORTS.has(memberPath[1]);
  }

  return memberPath[0] !== undefined && ZOD_FACTORY_IMPORTS.has(memberPath[0]);
}

function hasFullTypeInformation(
  services: ParserServices,
): services is ParserServices & { program: NonNullable<ParserServices["program"]> } {
  return services.program !== null;
}

function isZodDeclarationFile(fileName: string): boolean {
  return /(?:^|[/\\])node_modules[/\\]zod[/\\]/u.test(fileName);
}

function isZodSchemaType(type: Type, services: ParserServices, seen = new Set<Type>()): boolean {
  if (!hasFullTypeInformation(services)) {
    return false;
  }

  if (seen.has(type)) {
    return false;
  }

  seen.add(type);

  const symbols = [type.getSymbol(), type.aliasSymbol];

  if (
    symbols.some((symbol) =>
      symbol?.getDeclarations()?.some((declaration) =>
        isZodDeclarationFile(declaration.getSourceFile().fileName),
      ),
    )
  ) {
    return true;
  }

  if (type.isUnionOrIntersection()) {
    return type.types.some((subType) => isZodSchemaType(subType, services, seen));
  }

  if (type.getBaseTypes()?.some((baseType) => isZodSchemaType(baseType, services, seen))) {
    return true;
  }

  const parseSymbol = type.getProperty("parse");

  return (
    parseSymbol?.getDeclarations()?.some((declaration) =>
      isZodDeclarationFile(declaration.getSourceFile().fileName),
    ) ?? false
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
        "Create Zod schemas during module initialization instead of inside functions, callbacks, or other repeated execution paths.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const parserServices = ESLintUtils.getParserServices(context, true);

    function isZodExecutionCall(node: TSESTree.CallExpression): boolean {
      const methodName = getCallMethodName(node);

      return methodName !== null && ZOD_EXECUTION_METHODS.has(methodName);
    }

    function isZodSchemaCall(node: TSESTree.CallExpression): boolean {
      if (isZodExecutionCall(node)) {
        return false;
      }

      const root = getRootIdentifier(node.callee);

      if (!root) {
        return false;
      }

      const scope = sourceCode.getScope(root) as ScopeLike;
      const variable = findVariable(scope, root.name);

      return (
        variable?.defs.some((definition) => {
          const importKind = getZodImportKind(definition.node);

          if (importKind?.type === "factory") {
            return true;
          }

          if (importKind?.type !== "namespace") {
            return false;
          }

          const memberPath = getMemberPathFromRoot(node.callee);

          if (memberPath === null || memberPath.length === 0) {
            return false;
          }

          return isZodSchemaNamespaceCall(importKind.importedName, memberPath);
        }) ?? false
      );
    }

    function isTypedZodSchemaCombinatorCall(node: TSESTree.CallExpression): boolean {
      const rootMethodName = getRootMethodName(node);

      if (
        rootMethodName === null ||
        !ZOD_SCHEMA_COMBINATOR_METHODS.has(rootMethodName)
      ) {
        return false;
      }

      const root = getRootIdentifier(node.callee);

      if (!root) {
        return false;
      }

      if (!hasFullTypeInformation(parserServices)) {
        return false;
      }

      const type = parserServices.getTypeAtLocation(root);

      return isZodSchemaType(type, parserServices);
    }

    function isSchemaCreationCall(node: TSESTree.CallExpression): boolean {
      return isZodSchemaCall(node) || isTypedZodSchemaCombinatorCall(node);
    }

    function isInModuleInitializationPath(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node;

      while (current) {
        if (current.type === "Program") {
          return true;
        }

        if (
          current.type === "FunctionDeclaration" ||
          current.type === "FunctionExpression" ||
          current.type === "ArrowFunctionExpression"
        ) {
          return false;
        }

        if (current.type === "PropertyDefinition" && !current.static) {
          return false;
        }

        current = current.parent;
      }

      return false;
    }

    function isFunctionExecutedDuringModuleInitialization(node: FunctionLike): boolean {
      if (node.type === "FunctionDeclaration") {
        return false;
      }

      const parent = node.parent;

      if (parent?.type === "CallExpression") {
        if (parent.callee === node) {
          return isInModuleInitializationPath(parent);
        }

        if (parent.arguments.includes(node)) {
          const methodName = getCallMethodName(parent);

          return (
            methodName !== null &&
            EAGER_CALLBACK_METHODS.has(methodName) &&
            isInModuleInitializationPath(parent)
          );
        }
      }

      return false;
    }

    function hasSchemaCreationCallAncestor(node: TSESTree.Node): boolean {
      let current = node.parent;

      while (current) {
        if (current.type === "CallExpression" && isSchemaCreationCall(current)) {
          return true;
        }

        current = current.parent;
      }

      return false;
    }

    function isInsideRepeatedExecutionPath(node: TSESTree.Node): boolean {
      let current = node.parent;

      while (current) {
        if (
          current.type === "FunctionDeclaration" ||
          current.type === "FunctionExpression" ||
          current.type === "ArrowFunctionExpression"
        ) {
          if (!isFunctionExecutedDuringModuleInitialization(current)) {
            return true;
          }
        }

        if (current.type === "PropertyDefinition" && !current.static) {
          return true;
        }

        current = current.parent;
      }

      return false;
    }

    return {
      CallExpression(node) {
        if (!isSchemaCreationCall(node)) {
          return;
        }

        if (hasSchemaCreationCallAncestor(node)) {
          return;
        }

        if (!isInsideRepeatedExecutionPath(node)) {
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
