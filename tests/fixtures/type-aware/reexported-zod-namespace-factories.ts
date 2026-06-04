import zodDefault, * as localZod from "./zod-star-reexports.js";

export function getSchemas() {
  return [
    localZod.z.object({
      id: localZod.z.string(),
    }),
    localZod.object({
      id: localZod.string(),
    }),
    zodDefault.string(),
  ];
}
