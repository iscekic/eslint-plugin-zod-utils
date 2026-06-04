import { BaseSchema, TenantIdSchema } from "./schemas.js";

export function getSchema() {
  return BaseSchema.extend({ tenantId: TenantIdSchema });
}
