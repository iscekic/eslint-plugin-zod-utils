import { StatusSchema } from "./schemas.js";

export function getSchemas() {
  return [
    StatusSchema.exclude(["closed"]),
    StatusSchema.extract(["open"]),
  ];
}
