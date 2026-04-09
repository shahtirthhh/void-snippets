/**
 * Wraps a Promise and returns a [error, null] | [null, data] tuple.
 * Eliminates try/catch at the call site — Go-style error handling for TypeScript.
 *
 * @example
 * const [err, data] = await catchError(fetchUser(id));
 * if (err) { // handle error }
 * // data is correctly typed as T here
 */
export async function catchError<T>(
  promise: Promise<T>
): Promise<[Error, null] | [null, T]> {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    if (error instanceof Error) return [error, null];
    return [new Error(String(error)), null];
  }
}
