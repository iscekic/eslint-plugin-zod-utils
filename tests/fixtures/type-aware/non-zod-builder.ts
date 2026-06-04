import { nonZodBuilder } from "./schemas.js";

export function getSchema() {
  return nonZodBuilder.pick({ id: true });
}
