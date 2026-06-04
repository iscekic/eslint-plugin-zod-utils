import * as schemas from "./schemas.js";

export function getSchemas() {
  return [
    schemas.TenantIdSchema.optional(),
    schemas.BaseSchema.pick({ id: true }),
  ];
}
