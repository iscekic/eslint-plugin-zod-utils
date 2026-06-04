import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const BaseSchema = z.object({
  id: z.string(),
});

export const TenantIdSchema = z.string();

export const nonZodBuilder = {
  pick(shape: Record<string, boolean>) {
    return Object.keys(shape).join(",");
  },
};
