import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ResourceService } from "@void-snippets/client";
import type {
  ResourceAdapters,
  ResourceListResult,
  TPagination,
  TQueryParams,
  TDefaultPaginatedResponse,
  TDefaultSingleResponse,
} from "@void-snippets/core";
import { createDefaultAdapters } from "@void-snippets/core";

// ============================================================================
// TYPE HELPERS
// ============================================================================

type CapitalizeStr<S extends string> = S extends `${infer F}${infer Rest}`
  ? `${Uppercase<F>}${Rest}`
  : S;

const DEFAULT_PAGINATION: TQueryParams = {
  page: 1,
  limit: 10,
};

// ============================================================================
// PHANTOM TYPE CONSTRAINT
//
// We constrain S only on the __types phantom property (which is readonly,
// i.e. covariant) so that ResourceService<string, ...> is assignable to
// WithResourceTypes. This avoids the variance issue that arises when
// constraining against method parameter types (contravariant positions).
//
// Inside the function we cast apiService once to a fully-typed ResourceService
// using the phantom generics — this is safe because S IS a ResourceService.
// ============================================================================

interface WithResourceTypes {
  readonly __types: {
    id: unknown;
    base: unknown;
    detail: unknown;
    create: unknown;
    update: unknown;
    listRaw: unknown;
    singleRaw: unknown;
  };
}

// Aliases for reading phantom types from S — keeps the function body readable
type Id<S extends WithResourceTypes>        = S["__types"]["id"];
type Base<S extends WithResourceTypes>      = S["__types"]["base"];
type Detail<S extends WithResourceTypes>    = S["__types"]["detail"];
type Create<S extends WithResourceTypes>    = S["__types"]["create"];
type Update<S extends WithResourceTypes>    = S["__types"]["update"];
type ListRaw<S extends WithResourceTypes>   = S["__types"]["listRaw"];
type SingleRaw<S extends WithResourceTypes> = S["__types"]["singleRaw"];

// ============================================================================
// RETURN TYPE — useList
// Dynamically named keys based on the queryKeyPrefix (e.g. "contacts"):
//   { contacts: TBase[], isContactsLoading: boolean, contactsError: Error | null, invalidateContacts: () => void }
// ============================================================================

export type UseListReturn<K extends string, TBase> = {
  [P in K]: TBase[];
} & {
  pagination: TPagination;
} & {
  [P in `is${CapitalizeStr<K>}Loading`]: boolean;
} & {
  [P in `${K}Error`]: Error | null;
} & {
  [P in `invalidate${CapitalizeStr<K>}`]: () => void;
};

// ============================================================================
// OPTIONS
// ============================================================================

export interface CreateResourceHooksOptions<
  TListRaw,
  TBase,
  TSingleRaw,
  TDetail,
> {
  /**
   * Adapters map your API's raw response shapes to the library's internal
   * format. Omit this entirely if your API matches the default shape:
   * List:   { data: { items, page, limit, totalPages, totalDocuments } }
   * Single: { data: <item> }
   *
   * @example
   * createResourceHooks("contacts", ContactsApis, {
   *   adapters: {
   *     fromList: (raw) => ({
   *       items: raw.results,
   *       pagination: {
   *         page: raw.meta.page,
   *         limit: raw.meta.perPage,
   *         totalPages: raw.meta.lastPage,
   *         totalDocuments: raw.meta.total,
   *       },
   *     }),
   *     fromSingle: (raw) => raw.payload,
   *   },
   * })
   */
  adapters?: ResourceAdapters<TListRaw, TBase, TSingleRaw, TDetail>;

  /**
   * Default params passed to useList and useInfinite when none are provided.
   * @default { page: 1, limit: 10 }
   */
  defaultParams?: TQueryParams;
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Creates a set of TanStack Query hooks for a resource.
 * All types are fully inferred from the `apiService` instance — no generics
 * need to be passed manually.
 *
 * @param queryKeyPrefix  - TanStack Query cache key prefix and the base name
 *                          for the returned hook properties.
 *                          e.g. "contacts" → { contacts, isContactsLoading, ... }
 * @param apiService      - An instance of ResourceService (or a subclass).
 * @param options         - Optional adapters and default params.
 *
 * @example
 * // contacts.hooks.ts
 * import { createResourceHooks } from '@void-snippets/react';
 * import { ContactsApis } from './contacts.api';
 *
 * // No generics needed — all types are inferred from ContactsApis
 * export const contactHooks = createResourceHooks('contacts', ContactsApis);
 *
 * // In a component:
 * const { contacts, isContactsLoading } = contactHooks.useList();
 * const { data } = contactHooks.useGet(id);  // data: Contact.WithCreatedBy
 * const { create, update, delete: remove } = contactHooks.useMutations();
 */
export function createResourceHooks<
  K extends string,
  S extends WithResourceTypes,
>(
  queryKeyPrefix: K,
  apiService: S,
  options: CreateResourceHooksOptions<
    ListRaw<S>,
    Base<S>,
    SingleRaw<S>,
    Detail<S>
  > = {},
) {
  // One safe cast: S is guaranteed to be a ResourceService subclass because
  // __types is only present on ResourceService. Casting here lets us call
  // the service methods with the correct types extracted from the phantom.
  const service = apiService as unknown as ResourceService<
    Id<S>,
    Base<S>,
    Detail<S>,
    Create<S>,
    Update<S>,
    ListRaw<S>,
    SingleRaw<S>
  >;

  const {
    adapters = createDefaultAdapters<Base<S>, Detail<S>>() as ResourceAdapters<
      TDefaultPaginatedResponse<Base<S>>,
      Base<S>,
      TDefaultSingleResponse<Detail<S>>,
      Detail<S>
    > as ResourceAdapters<ListRaw<S>, Base<S>, SingleRaw<S>, Detail<S>>,
    defaultParams = DEFAULT_PAGINATION,
  } = options;

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);
  const capPrefix = capitalize(queryKeyPrefix);

  return {
    // -------------------------------------------------------------------------
    // useList — paginated list with invalidation helper
    // -------------------------------------------------------------------------
    useList: (
      params: TQueryParams = defaultParams,
    ): UseListReturn<K, Base<S>> => {
      const queryClient = useQueryClient();
      const queryKey = [queryKeyPrefix, params];

      const query = useQuery<ResourceListResult<Base<S>>, Error>({
        queryKey,
        queryFn: async () => {
          const raw = await service.list(params);
          return adapters.fromList(raw as ListRaw<S>);
        },
      });

      const items = query.data?.items ?? [];
      const pagination: TPagination = query.data?.pagination ?? {
        page: 1,
        limit: defaultParams.limit ?? 10,
        totalPages: 0,
        totalDocuments: 0,
      };

      return {
        [queryKeyPrefix]: items,
        pagination,
        [`is${capPrefix}Loading`]: query.isLoading || query.isFetching,
        [`${queryKeyPrefix}Error`]: query.error,
        [`invalidate${capPrefix}`]: () =>
          queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] }),
      } as UseListReturn<K, Base<S>>;
    },

    // -------------------------------------------------------------------------
    // useGet — single item by id
    // -------------------------------------------------------------------------
    useGet: (id: Id<S>, staleTime = 30_000) => {
      const query = useQuery<Detail<S>, Error>({
        queryKey: [queryKeyPrefix, id],
        queryFn: async () => {
          const raw = await service.get(id);
          return adapters.fromSingle(raw as SingleRaw<S>);
        },
        enabled: id !== undefined && id !== null && id !== "",
        staleTime,
      });

      return {
        data: query.data,
        isLoading: query.isLoading || query.isFetching,
        error: query.error,
        refetch: query.refetch,
      };
    },

    // -------------------------------------------------------------------------
    // useMutations — create / update / delete with auto-invalidation
    // -------------------------------------------------------------------------
    useMutations: () => {
      const queryClient = useQueryClient();
      const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });

      const createMutation = useMutation<Detail<S>, Error, Create<S>>({
        mutationFn: async (payload) => {
          const raw = await service.create(payload);
          return adapters.fromSingle(raw as SingleRaw<S>);
        },
        onSuccess: invalidate,
      });

      const updateMutation = useMutation<
        Detail<S>,
        Error,
        { _id: Id<S>; payload: Update<S> }
      >({
        mutationFn: async ({ _id, payload }) => {
          const raw = await service.update(_id, payload);
          return adapters.fromSingle(raw as SingleRaw<S>);
        },
        onSuccess: invalidate,
      });

      const deleteMutation = useMutation<Detail<S>, Error, Id<S>>({
        mutationFn: async (_id) => {
          const raw = await service.delete(_id);
          return adapters.fromSingle(raw as SingleRaw<S>);
        },
        onSuccess: invalidate,
      });

      return {
        create: createMutation,
        update: updateMutation,
        delete: deleteMutation,
      };
    },

    // -------------------------------------------------------------------------
    // useInfinite — infinite scroll / load more
    // -------------------------------------------------------------------------
    useInfinite: (params: TQueryParams = defaultParams) => {
      return useInfiniteQuery<ResourceListResult<Base<S>>, Error>({
        queryKey: [queryKeyPrefix, "INFINITE", params],
        queryFn: async ({ pageParam }) => {
          const raw = await service.list({
            ...params,
            page: pageParam as number,
            limit: params.limit ?? 20,
          });
          return adapters.fromList(raw as ListRaw<S>);
        },
        getNextPageParam: (lastPage) => {
          const { page, totalPages } = lastPage.pagination;
          return page < totalPages ? page + 1 : undefined;
        },
        initialPageParam: 1,
      });
    },
  };
}
