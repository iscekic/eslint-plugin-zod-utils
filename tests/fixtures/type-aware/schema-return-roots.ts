import { BaseSchema, TenantIdSchema } from "./schemas.js";

function getBaseSchema() {
  return BaseSchema;
}

function getTenantIdSchema() {
  return TenantIdSchema;
}

export function getSchemas() {
  return [
    getBaseSchema().pick({ id: true }),
    getTenantIdSchema().optional(),
  ];
}
