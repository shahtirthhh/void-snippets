import type {
  VSQueryParams,
  VSDefaultPaginatedResponse,
  VSDefaultSingleResponse,
} from "@void-snippets/core";
import { handleApiError } from "../utils/handle-api-error";
import { BaseApiService } from "./base-api.service";

/**
 * Generic CRUD resource service. Extend this class for each API resource.
 *
 * @typeParam TId        - The type of the resource's identifier (e.g., string)
 * @typeParam TBase      - The base entity type returned in list responses
 * @typeParam TDetail    - The detailed entity type returned in single-item responses (defaults to TBase)
 * @typeParam TCreate    - The payload type for create operations (defaults to Partial<TBase>)
 * @typeParam TUpdate    - The payload type for update operations (defaults to Partial<TBase>)
 * @typeParam TListRaw   - Raw API list response shape (defaults to VSDefaultPaginatedResponse<TBase>)
 * @typeParam TSingleRaw - Raw API single-item response shape (defaults to VSDefaultSingleResponse<TDetail>)
 *
 * @example
 * import { ResourceService } from '@void-snippets/client';
 * import type { Contact } from './contacts.types';
 *
 * export class ContactsApiService extends ResourceService<
 *   Contact.Id,
 *   Contact.Base,
 *   Contact.WithCreatedBy,
 *   Contact.Apis.CreatePayload,
 *   Contact.Apis.UpdatePayload
 * > {
 *   constructor() {
 *     super('/contacts');
 *   }
 * }
 *
 * export const ContactsApis = new ContactsApiService();
 */
export class ResourceService<
  TId,
  TBase,
  TDetail = TBase,
  TCreate = Partial<TBase>,
  TUpdate = Partial<TBase>,
  TListRaw = VSDefaultPaginatedResponse<TBase>,
  TSingleRaw = VSDefaultSingleResponse<TDetail>,
> extends BaseApiService {
  declare readonly __types: {
    id: TId;
    base: TBase;
    detail: TDetail;
    create: TCreate;
    update: TUpdate;
    listRaw: TListRaw;
    singleRaw: TSingleRaw;
  };

  constructor(endpoint: string) {
    super(endpoint);
  }

  async list(params?: VSQueryParams): Promise<TListRaw> {
    try {
      const { data } = await this.http.get<TListRaw>(this.getFullUrl(""), {
        params,
      });
      return data;
    } catch (error) {
      handleApiError(error);
    }
  }

  async get(id: TId): Promise<TSingleRaw> {
    try {
      const { data } = await this.http.get<TSingleRaw>(
        `${this.getFullUrl("")}/${String(id)}`
      );
      return data;
    } catch (error) {
      handleApiError(error);
    }
  }

  async create(payload: TCreate): Promise<TSingleRaw> {
    try {
      const { data } = await this.http.post<TSingleRaw>(
        this.getFullUrl(""),
        payload
      );
      return data;
    } catch (error) {
      handleApiError(error);
    }
  }

  async update(id: TId, payload: TUpdate): Promise<TSingleRaw> {
    try {
      const { data } = await this.http.patch<TSingleRaw>(
        `${this.getFullUrl("")}/${String(id)}`,
        payload
      );
      return data;
    } catch (error) {
      handleApiError(error);
    }
  }

  async delete(id: TId): Promise<TSingleRaw> {
    try {
      const { data } = await this.http.delete<TSingleRaw>(
        `${this.getFullUrl("")}/${String(id)}`
      );
      return data;
    } catch (error) {
      handleApiError(error);
    }
  }
}
