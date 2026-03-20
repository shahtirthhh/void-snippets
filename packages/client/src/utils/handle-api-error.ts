import { AxiosError } from "axios";

/**
 * Normalizes axios and generic errors into a standard Error.
 * Always throws — return type is `never`.
 */
export function handleApiError(error: unknown): never {
  if (error instanceof AxiosError) {
    const serverMessage =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (error.response?.data as { message?: string })?.message;
    throw new Error(serverMessage ?? error.message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("An unexpected error occurred.");
}
