import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const BaseSchema = z.object({
  id: z.string(),
});

export const TenantIdSchema = z.string();

export const NumberSchema = z.number();

export const BigIntSchema = z.bigint();

export const StringArraySchema = z.array(z.string());

export const StringSetSchema = z.set(z.string());

export const StringMapSchema = z.map(z.string(), z.string());

export const TupleSchema = z.tuple([z.string()]);

export const FunctionSchema = z.function({
  input: [z.string()],
  output: z.string(),
});

export const FileSchema = z.file();

export const DateSchema = z.date();

export const StatusSchema = z.enum(["open", "closed", "pending"]);

export const OptionalTenantIdSchema = TenantIdSchema.optional();

export const DefaultTenantIdSchema = TenantIdSchema.default("tenant");

export const CatchTenantIdSchema = TenantIdSchema.catch("tenant");

export const nonZodBuilder = {
  pick(shape: Record<string, boolean>) {
    return Object.keys(shape).join(",");
  },
};
