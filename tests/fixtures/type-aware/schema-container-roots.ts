import { BaseSchema, TenantIdSchema } from "./schemas.js";

const schemaBag = {
  BaseSchema,
  TenantIdSchema,
};

export function getSchemas() {
  return [
    schemaBag.TenantIdSchema.optional(),
    schemaBag.BaseSchema.pick({ id: true }),
  ];
}
