import type { AxiosInstance } from "axios";
import { getConfiguredInstance } from "../configure";

/**
 * Abstract base for all resource services.
 * Automatically uses the axios instance registered via configure().
 */
export abstract class BaseApiService {
  protected readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  /**
   * Returns the globally configured axios instance.
   * Lazy-evaluated so configure() can be called after class instantiation.
   */
  protected get http(): AxiosInstance {
    return getConfiguredInstance();
  }

  protected getFullUrl(path: string): string {
    return `${this.endpoint}${path}`;
  }
}
