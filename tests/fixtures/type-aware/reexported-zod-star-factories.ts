import { object, string, z, zodDefault } from "./zod-star-reexports.js";

export function getSchemas() {
  return [
    z.object({
      id: z.string(),
    }),
    object({
      id: string(),
    }),
    zodDefault.string(),
  ];
}
