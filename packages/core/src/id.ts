/**
 * Creates a branded (nominal) type from a primitive.
 *
 * Branded types prevent accidental mixing of structurally identical
 * but semantically different IDs at compile time.
 *
 * @typeParam K - The underlying primitive type (usually `string`)
 * @typeParam T - A unique brand tag per entity (use a string literal)
 *
 * @example
 * type ContactId = VSId<string, 'Contact'>;
 * type UserId    = VSId<string, 'User'>;
 *
 * declare const contactId: ContactId;
 * declare let   userId: UserId;
 *
 * userId = contactId; // ✅ TypeScript error — brands don't match
 */
export type VSId<K, T> = K & { __brand: T };
