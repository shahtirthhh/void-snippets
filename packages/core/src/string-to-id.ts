import type { Id } from "./id";

// T should always be an Id<string, SomeBrand>
export const stringToId = <T extends Id<string, unknown>>(id: string): T =>
  id as unknown as T;
