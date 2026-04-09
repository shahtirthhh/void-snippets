import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ResourceService } from "@void-snippets/client";
import type {
  VSAdapters,
  VSListResult,
  VSPagination,
  VSQueryParams,
  VSDefaultPaginatedResponse,
  VSDefaultSingleResponse,
} from "@void-snippets/core";
import { createDefaultAdapters } from "@void-snippets/core";

// ============================================================================
// TYPE HELPERS
// ============================================================================

const DEFAULT_PAGINATION: VSQueryParams = {
  page: 1,
  limit: 10,
};

// ============================================================================
// PHANTOM TYPE CONSTRAINT
//
// We constrain S only on the __types phantom property (readonly = covariant)
// so ResourceService<string, ...> is always assignable to WithResourceTypes.
// This avoids the variance issue from constraining method parameter types.
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

type Id<S extends WithResourceTypes>        = S["__types"]["id"];
type Base<S extends WithResourceTypes>      = S["__types"]["base"];
type Detail<S extends WithResourceTypes>    = S["__types"]["detail"];
type Create<S extends WithResourceTypes>    = S["__types"]["create"];
type Update<S extends WithResourceTypes>    = S["__types"]["update"];
type ListRaw<S extends WithResourceTypes>   = S["__types"]["listRaw"];
type SingleRaw<S extends WithResourceTypes> = S["__types"]["singleRaw"];

// ============================================================================
// RETURN TYPES
// ============================================================================

export interface VSUseListReturn<TBase> {
  list: TBase[];
  pagination: VSPagination;
  isLoading: boolean;
  error: Error | null;
  invalidate: () => void;
}

export interface VSUseGetReturn<TDetail> {
  item: TDetail | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// OPTIONS
// ============================================================================

export interface VSResourceHooksOptions<TListRaw, TBase, TSingleRaw, TDetail> {
  /**
   * Adapters map your API's raw response to the library's internal format.
   * Omit if your API matches the default shape:
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
  adapters?: VSAdapters<TListRaw, TBase, TSingleRaw, TDetail>;

  /**
   * Default params passed to useList and useInfinite when none are provided.
   * @default { page: 1, limit: 10 }
   */
  defaultParams?: VSQueryParams;
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Creates a set of TanStack Query hooks for a resource.
 * All types are fully inferred from the `apiService` instance — no generics needed.
 *
 * @param queryKeyPrefix  - TanStack Query cache key. Used to scope the cache
 *                          and for auto-invalidation. e.g. "contacts"
 * @param apiService      - An instance of ResourceService (or a subclass).
 * @param options         - Optional adapters and default params.
 *
 * @example
 * export const contactHooks = createResourceHooks('contacts', ContactsApis);
 *
 * // useList — generic fixed shape
 * const { list, isLoading, pagination, error, invalidate } = contactHooks.useList();
 * // list is typed as Contact.Base[] ✅
 *
 * // useGet
 * const { item, isLoading, error, refetch } = contactHooks.useGet(id);
 * // item is typed as Contact.WithCreatedBy ✅
 *
 * // useMutations
 * const { create, update, remove } = contactHooks.useMutations();
 */
export function createResourceHooks<
  K extends string,
  S extends WithResourceTypes,
>(
  queryKeyPrefix: K,
  apiService: S,
  options: VSResourceHooksOptions<
    ListRaw<S>,
    Base<S>,
    SingleRaw<S>,
    Detail<S>
  > = {},
) {
  const service = apiService as unknown as ResourceService<
    Id<S>, Base<S>, Detail<S>, Create<S>, Update<S>, ListRaw<S>, SingleRaw<S>
  >;

  const {
    adapters = createDefaultAdapters<Base<S>, Detail<S>>() as VSAdapters<
      VSDefaultPaginatedResponse<Base<S>>,
      Base<S>,
      VSDefaultSingleResponse<Detail<S>>,
      Detail<S>
    > as VSAdapters<ListRaw<S>, Base<S>, SingleRaw<S>, Detail<S>>,
    defaultParams = DEFAULT_PAGINATION,
  } = options;

  return {
    // -------------------------------------------------------------------------
    // useList — fixed generic shape: { list, isLoading, pagination, error, invalidate }
    // -------------------------------------------------------------------------
    useList: (
      params: VSQueryParams = defaultParams,
    ): VSUseListReturn<Base<S>> => {
      const queryClient = useQueryClient();

      const query = useQuery<VSListResult<Base<S>>, Error>({
        queryKey: [queryKeyPrefix, params],
        queryFn: async () => {
          const raw = await service.list(params);
          return adapters.fromList(raw as ListRaw<S>);
        },
      });

      return {
        list: query.data?.items ?? [],
        pagination: query.data?.pagination ?? {
          page: 1,
          limit: defaultParams.limit ?? 10,
          totalPages: 0,
          totalDocuments: 0,
        },
        isLoading: query.isLoading || query.isFetching,
        error: query.error,
        invalidate: () =>
          queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] }),
      };
    },

    // -------------------------------------------------------------------------
    // useGet — { item, isLoading, error, refetch }
    // -------------------------------------------------------------------------
    useGet: (id: Id<S>, staleTime = 30_000): VSUseGetReturn<Detail<S>> => {
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
        item: query.data,
        isLoading: query.isLoading || query.isFetching,
        error: query.error,
        refetch: query.refetch,
      };
    },

    // -------------------------------------------------------------------------
    // useMutations — create / update / remove (not delete — reserved keyword)
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

      const removeMutation = useMutation<Detail<S>, Error, Id<S>>({
        mutationFn: async (_id) => {
          const raw = await service.delete(_id);
          return adapters.fromSingle(raw as SingleRaw<S>);
        },
        onSuccess: invalidate,
      });

      return {
        create: createMutation,
        update: updateMutation,
        remove: removeMutation,
      };
    },

    // -------------------------------------------------------------------------
    // useInfinite — infinite scroll / load more
    // -------------------------------------------------------------------------
    useInfinite: (params: VSQueryParams = defaultParams) => {
      return useInfiniteQuery<VSListResult<Base<S>>, Error>({
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
