import {
  BaseSchema,
  CatchTenantIdSchema,
  DefaultTenantIdSchema,
  FunctionSchema,
  OptionalTenantIdSchema,
  TenantIdSchema,
  TupleSchema,
} from "./schemas.js";

export function getSchemas() {
  return [
    TenantIdSchema.default("tenant"),
    TenantIdSchema.catch("tenant"),
    TenantIdSchema.pipe(TenantIdSchema),
    TenantIdSchema.optional().nonoptional(),
    OptionalTenantIdSchema.unwrap(),
    DefaultTenantIdSchema.removeDefault(),
    CatchTenantIdSchema.removeCatch(),
    BaseSchema.keyof(),
    TupleSchema.rest(TenantIdSchema),
    FunctionSchema.input([TenantIdSchema]),
    FunctionSchema.output(TenantIdSchema),
  ];
}
