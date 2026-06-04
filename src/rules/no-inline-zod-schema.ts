import { ESLintUtils } from "@typescript-eslint/utils";
import type { ParserServices, TSESTree } from "@typescript-eslint/utils";
import ts, { type Type } from "typescript";

const ZOD_IMPORT_SOURCES = new Set([
  "zod",
  "zod/mini",
  "zod/v3",
  "zod/v4",
  "zod/v4-mini",
  "zod/v4/mini",
]);

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
  "effect",
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
  "oboolean",
  "onumber",
  "optional",
  "ostring",
  "partialRecord",
  "pipeline",
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
  "transformer",
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
  "augment",
  "array",
  "brand",
  "catch",
  "catchall",
  "cuid",
  "cuid2",
  "date",
  "default",
  "deepPartial",
  "describe",
  "email",
  "endsWith",
  "exclude",
  "extract",
  "extend",
  "gt",
  "gte",
  "includes",
  "input",
  "int",
  "keyof",
  "length",
  "lowercase",
  "lt",
  "lte",
  "merge",
  "max",
  "min",
  "nonempty",
  "nonnegative",
  "nonoptional",
  "nonstrict",
  "normalize",
  "nullable",
  "nullish",
  "omit",
  "optional",
  "or",
  "output",
  "partial",
  "passthrough",
  "pick",
  "pipe",
  "positive",
  "promise",
  "readonly",
  "refine",
  "refinement",
  "regex",
  "removeCatch",
  "removeDefault",
  "required",
  "rest",
  "safeExtend",
  "size",
  "slugify",
  "startsWith",
  "strict",
  "strip",
  "step",
  "superRefine",
  "toLowerCase",
  "toUpperCase",
  "transform",
  "trim",
  "ulid",
  "unwrap",
  "uppercase",
  "url",
  "uuid",
  "with",
  "overwrite",
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
  | { importedName: string; memberPath: string[]; type: "namespace" };

function isZodImportSource(source: unknown): source is string {
  return typeof source === "string" && ZOD_IMPORT_SOURCES.has(source);
}

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

  if (!isZodImportSource(declaration.source.value)) {
    return null;
  }

  if (node.type === "ImportDefaultSpecifier" || node.type === "ImportNamespaceSpecifier") {
    return { importedName: "z", memberPath: [], type: "namespace" };
  }

  if (node.importKind === "type" || declaration.importKind === "type") {
    return null;
  }

  const importedName =
    node.imported.type === "Identifier" ? node.imported.name : node.imported.value;

  if (importedName === "default") {
    return { importedName: "z", memberPath: [], type: "namespace" };
  }

  if (ZOD_NAMESPACE_IMPORTS.has(importedName)) {
    return { importedName, memberPath: [], type: "namespace" };
  }

  if (ZOD_FACTORY_IMPORTS.has(importedName) || ZOD_DIRECT_COMBINATOR_IMPORTS.has(importedName)) {
    return { type: "factory" };
  }

  return null;
}

function unwrapExpression(node: TSESTree.Node): TSESTree.Node {
  let current = node;

  while (
    current.type === "ChainExpression" ||
    current.type === "TSAsExpression" ||
    current.type === "TSNonNullExpression" ||
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSTypeAssertion"
  ) {
    current = current.type === "ChainExpression" ? current.expression : current.expression;
  }

  return current;
}

function isZodSchemaNamespaceCall(
  importName: string,
  memberPath: string[],
): boolean {
  const path = memberPath[0] === "z" ? memberPath.slice(1) : memberPath;

  if (importName === "coerce") {
    return path[0] !== undefined && ZOD_FACTORY_IMPORTS.has(path[0]);
  }

  if (importName === "iso") {
    return path[0] !== undefined && ZOD_ISO_FACTORY_IMPORTS.has(path[0]);
  }

  if (path[0] === "coerce") {
    return path[1] !== undefined && ZOD_FACTORY_IMPORTS.has(path[1]);
  }

  if (path[0] === "iso") {
    return path[1] !== undefined && ZOD_ISO_FACTORY_IMPORTS.has(path[1]);
  }

  return path[0] !== undefined && ZOD_FACTORY_IMPORTS.has(path[0]);
}

function appendZodMember(reference: ZodImportKind, memberName: string): ZodImportKind | null {
  if (reference.type === "factory") {
    return null;
  }

  const memberPath =
    memberName === "z" && reference.memberPath.length === 0
      ? []
      : [...reference.memberPath, memberName];

  if (isZodSchemaNamespaceCall(reference.importedName, memberPath)) {
    return { type: "factory" };
  }

  return {
    importedName: reference.importedName,
    memberPath,
    type: "namespace",
  };
}

function isRequireZodCall(node: TSESTree.Node): boolean {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "require" &&
    node.arguments.length === 1 &&
    node.arguments[0]?.type === "Literal" &&
    isZodImportSource(node.arguments[0].value)
  );
}

function getPatternPath(
  pattern: TSESTree.Node,
  localName: string,
): string[] | null {
  if (pattern.type === "Identifier") {
    return pattern.name === localName ? [] : null;
  }

  if (pattern.type !== "ObjectPattern") {
    return null;
  }

  for (const property of pattern.properties) {
    if (property.type === "RestElement") {
      continue;
    }

    const key =
      property.key.type === "Identifier"
        ? property.key.name
        : property.key.type === "Literal" && typeof property.key.value === "string"
          ? property.key.value
          : null;

    if (key === null) {
      continue;
    }

    const nestedPath = getPatternPath(property.value, localName);

    if (nestedPath !== null) {
      return [key, ...nestedPath];
    }
  }

  return null;
}

function getZodReferenceFromVariable(
  variable: VariableLike,
  localName: string,
  getScope: (node: TSESTree.Node) => ScopeLike,
  seen: Set<string>,
): ZodImportKind | null {
  if (seen.has(localName)) {
    return null;
  }

  seen.add(localName);

  for (const definition of variable.defs) {
    const importKind = getZodImportKind(definition.node);

    if (importKind !== null) {
      return importKind;
    }

    if (definition.node.type !== "VariableDeclarator" || !definition.node.init) {
      continue;
    }

    const initReference = getZodReferenceFromExpression(definition.node.init, getScope, seen);

    if (initReference === null) {
      continue;
    }

    if (definition.node.id.type === "Identifier" && definition.node.id.name === localName) {
      return initReference;
    }

    const patternPath = getPatternPath(definition.node.id, localName);

    if (patternPath === null) {
      continue;
    }

    let currentReference: ZodImportKind | null = initReference;

    for (const memberName of patternPath) {
      if (currentReference === null) {
        break;
      }

      currentReference = appendZodMember(currentReference, memberName);
    }

    if (currentReference !== null) {
      return currentReference;
    }
  }

  return null;
}

function getZodReferenceFromExpression(
  node: TSESTree.Node,
  getScope: (node: TSESTree.Node) => ScopeLike,
  seen = new Set<string>(),
): ZodImportKind | null {
  const expression = unwrapExpression(node);

  if (isRequireZodCall(expression)) {
    return { importedName: "z", memberPath: [], type: "namespace" };
  }

  if (expression.type === "Identifier") {
    const scope = getScope(expression);
    const variable = findVariable(scope, expression.name);

    return variable ? getZodReferenceFromVariable(variable, expression.name, getScope, seen) : null;
  }

  if (expression.type === "MemberExpression") {
    const memberName = getStaticMemberName(expression);

    if (memberName === null) {
      return null;
    }

    const objectReference = getZodReferenceFromExpression(expression.object, getScope, seen);

    return objectReference === null ? null : appendZodMember(objectReference, memberName);
  }

  return null;
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

function isZodSymbol(symbol: ts.Symbol | undefined, checker: ts.TypeChecker): boolean {
  if (!symbol) {
    return false;
  }

  const symbols = [symbol];

  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    symbols.push(checker.getAliasedSymbol(symbol));
  }

  return symbols.some((candidate) =>
    candidate.getDeclarations()?.some((declaration) =>
      isZodDeclarationFile(declaration.getSourceFile().fileName),
    ),
  );
}

function isImportDefinition(variable: VariableLike | null): boolean {
  return variable?.defs.some((definition) => definition.type === "ImportBinding") ?? false;
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

    const getScope = (node: TSESTree.Node): ScopeLike => sourceCode.getScope(node);

    function isZodExecutionCall(node: TSESTree.CallExpression): boolean {
      const methodName = getCallMethodName(node);

      return methodName !== null && ZOD_EXECUTION_METHODS.has(methodName);
    }

    function isZodSchemaCall(node: TSESTree.CallExpression): boolean {
      if (isZodExecutionCall(node)) {
        return false;
      }

      return getZodReferenceFromExpression(node.callee, getScope)?.type === "factory";
    }

    function isTypedZodSchemaCall(node: TSESTree.CallExpression): boolean {
      if (!hasFullTypeInformation(parserServices) || isZodExecutionCall(node)) {
        return false;
      }

      const schemaType = parserServices.getTypeAtLocation(node);

      if (!isZodSchemaType(schemaType, parserServices)) {
        return false;
      }

      const callee = unwrapExpression(node.callee);
      let symbolNode: TSESTree.Node | null = null;

      if (callee.type === "Identifier") {
        symbolNode = callee;
      } else if (callee.type === "MemberExpression") {
        const methodName = getStaticMemberName(callee);

        if (
          methodName !== null &&
          !ZOD_FACTORY_IMPORTS.has(methodName) &&
          !ZOD_ISO_FACTORY_IMPORTS.has(methodName) &&
          !ZOD_SCHEMA_COMBINATOR_METHODS.has(methodName) &&
          getZodReferenceFromExpression(callee, getScope)?.type !== "factory"
        ) {
          return false;
        }

        symbolNode = callee.property;

        if (
          methodName !== null &&
          (ZOD_FACTORY_IMPORTS.has(methodName) ||
            ZOD_ISO_FACTORY_IMPORTS.has(methodName) ||
            ZOD_SCHEMA_COMBINATOR_METHODS.has(methodName))
        ) {
          return true;
        }
      }

      if (symbolNode === null) {
        return false;
      }

      const checker = parserServices.program.getTypeChecker();
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(symbolNode);
      const symbol = checker.getSymbolAtLocation(tsNode);

      if (isZodSymbol(symbol, checker)) {
        return true;
      }

      if (callee.type === "Identifier") {
        const variable = findVariable(getScope(callee), callee.name);

        return isImportDefinition(variable);
      }

      return false;
    }

    function isSchemaCreationCall(node: TSESTree.CallExpression): boolean {
      return isZodSchemaCall(node) || isTypedZodSchemaCall(node);
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
        if (
          current.type === "FunctionDeclaration" ||
          current.type === "FunctionExpression" ||
          current.type === "ArrowFunctionExpression"
        ) {
          return false;
        }

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
