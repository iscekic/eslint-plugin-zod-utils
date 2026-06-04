import { BaseSchema, TenantIdSchema } from "./schemas.js";

export function getSchema() {
  return BaseSchema.safeExtend({ tenantId: TenantIdSchema });
}
