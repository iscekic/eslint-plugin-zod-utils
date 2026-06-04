import { UserSchema } from "./schemas.js";

export function getSchema() {
  return UserSchema.pick({ id: true });
}
