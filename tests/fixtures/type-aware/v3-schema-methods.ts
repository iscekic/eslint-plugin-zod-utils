import { z } from "zod/v3";

const V3TenantIdSchema = z.string();

const V3NumberSchema = z.number();

const V3StringArraySchema = z.array(z.string());

const V3StringSetSchema = z.set(z.string());

const V3DateSchema = z.date();

const V3BaseSchema = z.object({ id: z.string() });

export function getSchemas() {
  return [
    V3TenantIdSchema.promise(),
    V3TenantIdSchema.refinement((value) => value.length > 0, {
      code: "custom",
      message: "Required",
    }),
    V3BaseSchema.augment({ name: z.string() }),
    V3BaseSchema.nonstrict(),
    V3TenantIdSchema.email(),
    V3TenantIdSchema.url(),
    V3TenantIdSchema.uuid(),
    V3TenantIdSchema.cuid(),
    V3TenantIdSchema.cuid2(),
    V3TenantIdSchema.ulid(),
    V3TenantIdSchema.regex(/^[a-z]+$/u),
    V3TenantIdSchema.min(1),
    V3TenantIdSchema.max(10),
    V3TenantIdSchema.length(5),
    V3NumberSchema.min(0),
    V3NumberSchema.max(10),
    V3NumberSchema.step(2),
    V3StringArraySchema.min(1),
    V3StringArraySchema.max(10),
    V3StringArraySchema.length(5),
    V3StringSetSchema.min(1),
    V3StringSetSchema.max(10),
    V3StringSetSchema.size(5),
    V3DateSchema.min(new Date("2024-01-01")),
    V3DateSchema.max(new Date("2025-01-01")),
  ];
}
