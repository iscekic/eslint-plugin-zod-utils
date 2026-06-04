import { object, string, z } from "./zod-reexports.js";

export function getSchemas() {
  return [
    z.object({
      id: z.string(),
    }),
    object({
      id: string(),
    }),
  ];
}
