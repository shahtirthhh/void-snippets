import type { AxiosInstance } from "axios";

let _instance: AxiosInstance | null = null;

/**
 * Registers your axios instance globally.
 * Call this once at your app's entry point before using any service.
 *
 * @example
 * import axios from 'axios';
 * import { configure } from '@void-snippets/client';
 *
 * const axiosInstance = axios.create({ baseURL: 'https://api.example.com' });
 * configure(axiosInstance);
 */
export function configure(instance: AxiosInstance): void {
  _instance = instance;
}

/**
 * @internal — used by BaseApiService, not part of the public API.
 */
export function getConfiguredInstance(): AxiosInstance {
  if (!_instance) {
    throw new Error(
      "[@void-snippets/client] No axios instance configured.\n" +
        "Call configure(axiosInstance) once at your app entry point before using any resource service.\n\n" +
        "Example:\n" +
        "  import { configure } from '@void-snippets/client';\n" +
        "  configure(myAxiosInstance);"
    );
  }
  return _instance;
}
