// The type takes two generics:
// K = the primitive (usually string)
// T = the brand tag (a unique marker per entity)
export type Id<K, T> = K & { __brand: T };
