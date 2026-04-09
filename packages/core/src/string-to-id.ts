import type { VSId } from "./id";

/**
 * Casts a plain `string` to a branded `VSId` type.
 *
 * Use at runtime boundaries (e.g. URL params, API responses, localStorage)
 * where you receive a raw string and need the correct branded ID type.
 *
 * @typeParam T - Must be a `VSId<string, Brand>` type
 *
 * @example
 * import type { VSId } from '@void-snippets/core';
 * import { stringToId } from '@void-snippets/core';
 *
 * type ContactId = VSId<string, 'Contact'>;
 *
 * const raw = params.contactId; // string
 * const id = stringToId<ContactId>(raw); // ContactId ✅
 */
export const stringToId = <T extends VSId<string, unknown>>(
  id: string
): T => id as unknown as T;
