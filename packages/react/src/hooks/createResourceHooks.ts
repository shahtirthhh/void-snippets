import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
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

const DEFAULT_PAGINATION: VSQueryParams = { page: 1, limit: 10 };

interface WithResourceTypes {
  readonly __types: {
    id:      unknown;
    base:    unknown;
    detail:  unknown;
    create:  unknown;
    update:  unknown;
    listRaw:   unknown;
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
  list:       TBase[];
  pagination: VSPagination;

  /**
   * True only on the very first fetch when there is no cached data yet.
   * Use this to render a full-page spinner or skeleton.
   * Does NOT become true during background refetches — for that see `isRefetching`.
   */
  isLoading:    boolean;

  /**
   * True during any fetch in progress — initial load or background refetch.
   * Use for a subtle progress indicator that doesn't blank out the list.
   */
  isFetching:   boolean;

  /**
   * True during a background refetch while cached data is already present.
   * Equivalent to `isFetching && !isLoading`.
   * Use for a lightweight "Refreshing…" badge overlaid on the existing list.
   */
  isRefetching: boolean;

  /** True when the last fetch attempt resulted in an error. */
  isError: boolean;
  error:   Error | null;

  /**
   * Re-runs this specific query. Wire to a retry button in your error state.
   * Narrower than `invalidate` — only refetches this exact param variant.
   */
  refetch:    () => Promise<unknown>;

  /**
   * Marks all active queries under this resource prefix as stale and
   * triggers a background refetch. Broader than `refetch` — affects every
   * mounted param variant of this resource simultaneously.
   */
  invalidate: () => void;
}

export interface VSUseGetReturn<TDetail> {
  item: TDetail | undefined;

  /** True only on the first fetch when no cached data exists. */
  isLoading:    boolean;

  /** True during any fetch in progress. */
  isFetching:   boolean;

  /** True during a background refetch while cached data is already present. */
  isRefetching: boolean;

  /** True when the last fetch attempt resulted in an error. */
  isError: boolean;
  error:   Error | null;

  /** Re-runs this query. */
  refetch: () => Promise<unknown>;
}

// ============================================================================
// OPTIMISTIC TYPES
// ============================================================================

/**
 * The operation context passed to `onError` and `onSuccess` callbacks.
 * Discriminate by `kind` to handle each mutation type differently.
 */
export type VSOptimisticOperation<TId, TCreate, TUpdate> =
  | { kind: "create"; payload: TCreate; tempId: string }
  | { kind: "update"; _id: TId; payload: TUpdate }
  | { kind: "remove"; _id: TId };

export interface VSOptimisticHandlers<
  TBase,
  TId,
  TUpdate,
  TCreate = Partial<TBase>,
  TDetail = TBase
> {
  /**
   * Optimistically transforms the list when `update.mutate()` fires.
   * `_id` is the mutation target — it is **separate** from `payload`.
   * Applied to every active `useList` and `useInfinite` cache.
   * The `useGet` cache is shallow-merged automatically; override with `updateSingle`.
   * Return a new array — never mutate `cache` in place.
   *
   * @example
   * update: (cache, { _id, payload }) =>
   *   cache.map(item => item._id === _id ? { ...item, ...payload } : item)
   */
  update?: (cache: TBase[], args: { _id: TId; payload: TUpdate }) => TBase[];

  /**
   * Overrides the default `{ ...current, ...payload }` shallow-merge for the
   * `useGet` cache. Only needed when `TDetail` has nested objects requiring
   * a deep merge. Ignored if `update` is not also provided.
   */
  updateSingle?: (current: TDetail, payload: TUpdate) => TDetail;

  /**
   * Optimistically removes an item when `remove.mutate()` fires.
   * `totalDocuments` / `totalPages` are patched automatically from the diff.
   * The matching `useGet` entry is staled (keeps showing data until confirmed).
   * Return a new array — never mutate `cache` in place.
   *
   * @example
   * remove: (cache, id) => cache.filter(item => item._id !== id)
   */
  remove?: (cache: TBase[], id: TId) => TBase[];

  /**
   * Optimistically inserts an item when `create.mutate()` fires.
   * Applied to every `useList` cache and the **first page** of every
   * `useInfinite` cache. `totalDocuments` / `totalPages` are patched automatically.
   * `tempId` is a library-generated UUID — use it to set `_id` on the item.
   * Return a new array — never mutate `cache` in place.
   *
   * @example
   * create: (cache, { payload, tempId }) => [
   *   { ...payload, _id: tempId as Contact.Id },
   *   ...cache,
   * ]
   */
  create?: (cache: TBase[], args: { payload: TCreate; tempId: string }) => TBase[];

  /**
   * Called after the optimistic rollback completes when a mutation fails.
   * The cache is already restored to the correct state when this fires.
   * Use for resource-level error notifications across all call sites.
   *
   * @example
   * onError: (error, operation) => {
   *   toast.error(`Failed to ${operation.kind} item: ${error.message}`)
   * }
   */
  onError?: (
    error: Error,
    operation: VSOptimisticOperation<TId, TCreate, TUpdate>,
  ) => void;

  /**
   * Called after `effectiveBase` has been advanced for this operation.
   * Fires once per successfully confirmed mutation, before the final
   * invalidation when all pending operations have settled.
   *
   * @example
   * onSuccess: (operation) => {
   *   if (operation.kind === 'create') analytics.track('item_created')
   * }
   */
  onSuccess?: (operation: VSOptimisticOperation<TId, TCreate, TUpdate>) => void;
}

// ============================================================================
// OPTIONS
// ============================================================================

export interface VSResourceHooksOptions<
  TListRaw,
  TBase,
  TSingleRaw,
  TDetail,
  TId    = unknown,
  TUpdate = unknown,
  TCreate = unknown
> {
  adapters?:      VSAdapters<TListRaw, TBase, TSingleRaw, TDetail>;
  defaultParams?: VSQueryParams;
  optimistic?:    VSOptimisticHandlers<TBase, TId, TUpdate, TCreate, TDetail>;
}

// ============================================================================
// INTERNAL: OPTIMISTIC STACK
// ============================================================================

type PendingOp<TId, TUpdate, TCreate> =
  | { id: symbol; kind: "update"; _id: TId; payload: TUpdate }
  | { id: symbol; kind: "remove"; _id: TId }
  | { id: symbol; kind: "create"; payload: TCreate; tempId: string };

interface OptimisticStack<TBase, TId, TUpdate, TCreate, TDetail> {
  pendingOps: PendingOp<TId, TUpdate, TCreate>[];
  effectiveBaseListSnapshots:     [QueryKey, VSListResult<TBase> | undefined][];
  effectiveBaseInfiniteSnapshots: [QueryKey, InfiniteData<VSListResult<TBase>> | undefined][];
  effectiveBaseGet: Map<string, TDetail | undefined>;
}

type MutationContext = { operationId: symbol };

/** Strips the internal `id: symbol` field to produce the public operation shape. */
function toOperation<TId, TUpdate, TCreate>(
  op: PendingOp<TId, TUpdate, TCreate>,
): VSOptimisticOperation<TId, TCreate, TUpdate> {
  if (op.kind === "create") return { kind: "create", payload: op.payload, tempId: op.tempId };
  if (op.kind === "update") return { kind: "update", _id: op._id, payload: op.payload };
  return { kind: "remove", _id: op._id };
}

// ============================================================================
// INTERNAL: STACK STORAGE
// WeakMap<QueryClient> → no leaks on client destruction, SSR-safe isolation
// ============================================================================

const _stacks = new WeakMap<
  object,
  Map<string, OptimisticStack<any, any, any, any, any>>
>();

function getStack<TBase, TId, TUpdate, TCreate, TDetail>(
  client: QueryClient,
  prefix: string,
): OptimisticStack<TBase, TId, TUpdate, TCreate, TDetail> {
  if (!_stacks.has(client)) _stacks.set(client, new Map());
  const map = _stacks.get(client)!;
  if (!map.has(prefix)) {
    map.set(prefix, {
      pendingOps: [],
      effectiveBaseListSnapshots: [],
      effectiveBaseInfiniteSnapshots: [],
      effectiveBaseGet: new Map(),
    });
  }
  return map.get(prefix)! as OptimisticStack<TBase, TId, TUpdate, TCreate, TDetail>;
}

// ============================================================================
// INTERNAL: QUERY KEY DISCRIMINATOR
// useList    → [prefix, VSQueryParams]  key[1] is a plain object
// useGet     → [prefix, TId]            key[1] is a string
// useInfinite→ [prefix, "INFINITE", …]  length > 2
// ============================================================================

function isListQueryKey(query: { queryKey: readonly unknown[] }): boolean {
  const key = query.queryKey;
  return (
    key.length === 2 &&
    key[1] !== null &&
    typeof key[1] === "object" &&
    !Array.isArray(key[1])
  );
}

// ============================================================================
// INTERNAL: TEMP ID GENERATOR
// ============================================================================

function generateTempId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// INTERNAL: PAGINATION PATCH
// ============================================================================

function patchPagination(pagination: VSPagination, delta: number): VSPagination {
  if (delta === 0) return pagination;
  const newTotal = Math.max(0, pagination.totalDocuments + delta);
  return {
    ...pagination,
    totalDocuments: newTotal,
    totalPages: Math.ceil(newTotal / pagination.limit),
  };
}

// ============================================================================
// INTERNAL: CACHE APPLICATION HELPERS
// ============================================================================

function applyUpdateToAllCaches<TBase, TId, TUpdate>(
  client: QueryClient,
  prefix: string,
  _id: TId,
  payload: TUpdate,
  handler: (cache: TBase[], args: { _id: TId; payload: TUpdate }) => TBase[],
): void {
  client.setQueriesData<VSListResult<TBase>>(
    { queryKey: [prefix], predicate: isListQueryKey as any },
    (old) => old ? { ...old, items: handler(old.items, { _id, payload }) } : old,
  );
  client.setQueriesData<InfiniteData<VSListResult<TBase>>>(
    { queryKey: [prefix, "INFINITE"] },
    (old) =>
      old
        ? { ...old, pages: old.pages.map((p) => ({ ...p, items: handler(p.items, { _id, payload }) })) }
        : old,
  );
}

function applyRemoveFromAllCaches<TBase, TId>(
  client: QueryClient,
  prefix: string,
  _id: TId,
  handler: (cache: TBase[], id: TId) => TBase[],
): void {
  client.setQueriesData<VSListResult<TBase>>(
    { queryKey: [prefix], predicate: isListQueryKey as any },
    (old) => {
      if (!old) return old;
      const newItems = handler(old.items, _id);
      return { ...old, items: newItems, pagination: patchPagination(old.pagination, newItems.length - old.items.length) };
    },
  );
  client.setQueriesData<InfiniteData<VSListResult<TBase>>>(
    { queryKey: [prefix, "INFINITE"] },
    (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((p) => {
              const newItems = handler(p.items, _id);
              return { ...p, items: newItems, pagination: patchPagination(p.pagination, newItems.length - p.items.length) };
            }),
          }
        : old,
  );
}

function applyCreateToAllCaches<TBase, TCreate>(
  client: QueryClient,
  prefix: string,
  payload: TCreate,
  tempId: string,
  handler: (cache: TBase[], args: { payload: TCreate; tempId: string }) => TBase[],
): void {
  client.setQueriesData<VSListResult<TBase>>(
    { queryKey: [prefix], predicate: isListQueryKey as any },
    (old) => {
      if (!old) return old;
      const newItems = handler(old.items, { payload, tempId });
      return { ...old, items: newItems, pagination: patchPagination(old.pagination, newItems.length - old.items.length) };
    },
  );
  // First page only — new items belong at the top of the feed, not duplicated
  client.setQueriesData<InfiniteData<VSListResult<TBase>>>(
    { queryKey: [prefix, "INFINITE"] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((p, i) => {
          if (i !== 0) return p;
          const newItems = handler(p.items, { payload, tempId });
          return { ...p, items: newItems, pagination: patchPagination(p.pagination, newItems.length - p.items.length) };
        }),
      };
    },
  );
}

// ============================================================================
// INTERNAL: EFFECTIVE BASE OPERATIONS
// ============================================================================

function restoreEffectiveBase<TBase, TId, TUpdate, TCreate, TDetail>(
  client: QueryClient,
  prefix: string,
  stack: OptimisticStack<TBase, TId, TUpdate, TCreate, TDetail>,
): void {
  stack.effectiveBaseListSnapshots.forEach(([key, data]) => client.setQueryData(key, data));
  stack.effectiveBaseInfiniteSnapshots.forEach(([key, data]) => client.setQueryData(key, data));
  stack.effectiveBaseGet.forEach((data, idStr) => client.setQueryData([prefix, idStr], data));
}

function advanceEffectiveBase<TBase, TId, TUpdate, TCreate, TDetail>(
  stack: OptimisticStack<TBase, TId, TUpdate, TCreate, TDetail>,
  op: PendingOp<TId, TUpdate, TCreate>,
  optimistic: VSOptimisticHandlers<TBase, TId, TUpdate, TCreate, TDetail>,
): void {
  if (op.kind === "update" && optimistic.update) {
    stack.effectiveBaseListSnapshots = stack.effectiveBaseListSnapshots.map(([key, data]) =>
      data ? [key, { ...data, items: optimistic.update!(data.items, { _id: op._id, payload: op.payload }) }] : [key, data],
    );
    stack.effectiveBaseInfiniteSnapshots = stack.effectiveBaseInfiniteSnapshots.map(([key, data]) =>
      data
        ? [key, { ...data, pages: data.pages.map((p) => ({ ...p, items: optimistic.update!(p.items, { _id: op._id, payload: op.payload }) })) }]
        : [key, data],
    );
    const baseEntry = stack.effectiveBaseGet.get(String(op._id));
    if (baseEntry !== undefined) {
      const advanced = optimistic.updateSingle
        ? optimistic.updateSingle(baseEntry, op.payload)
        : ({ ...baseEntry, ...(op.payload as object) } as TDetail);
      stack.effectiveBaseGet.set(String(op._id), advanced);
    }
    return;
  }

  if (op.kind === "remove" && optimistic.remove) {
    stack.effectiveBaseListSnapshots = stack.effectiveBaseListSnapshots.map(([key, data]) => {
      if (!data) return [key, data];
      const newItems = optimistic.remove!(data.items, op._id);
      return [key, { ...data, items: newItems, pagination: patchPagination(data.pagination, newItems.length - data.items.length) }];
    });
    stack.effectiveBaseInfiniteSnapshots = stack.effectiveBaseInfiniteSnapshots.map(([key, data]) =>
      data
        ? [
            key,
            {
              ...data,
              pages: data.pages.map((p) => {
                const newItems = optimistic.remove!(p.items, op._id);
                return { ...p, items: newItems, pagination: patchPagination(p.pagination, newItems.length - p.items.length) };
              }),
            },
          ]
        : [key, data],
    );
    stack.effectiveBaseGet.delete(String(op._id));
    return;
  }
  // create: effectiveBase intentionally not advanced.
  // The temp item is replaced by server data when all ops settle and invalidation fires.
}

function replayPendingOps<TBase, TId, TUpdate, TCreate, TDetail>(
  client: QueryClient,
  prefix: string,
  stack: OptimisticStack<TBase, TId, TUpdate, TCreate, TDetail>,
  optimistic: VSOptimisticHandlers<TBase, TId, TUpdate, TCreate, TDetail>,
): void {
  for (const op of stack.pendingOps) {
    if (op.kind === "update" && optimistic.update) {
      applyUpdateToAllCaches(client, prefix, op._id, op.payload, optimistic.update);
      const current = client.getQueryData<TDetail>([prefix, String(op._id)]);
      if (current !== undefined) {
        const updated = optimistic.updateSingle
          ? optimistic.updateSingle(current, op.payload)
          : ({ ...current, ...(op.payload as object) } as TDetail);
        client.setQueryData([prefix, String(op._id)], updated);
      }
    } else if (op.kind === "remove" && optimistic.remove) {
      applyRemoveFromAllCaches(client, prefix, op._id, optimistic.remove);
      client.invalidateQueries({ queryKey: [prefix, String(op._id)], refetchType: "none" });
    } else if (op.kind === "create" && optimistic.create) {
      applyCreateToAllCaches(client, prefix, op.payload, op.tempId, optimistic.create);
    }
  }
}

function flushStack<TBase, TId, TUpdate, TCreate, TDetail>(
  client: QueryClient,
  prefix: string,
  stack: OptimisticStack<TBase, TId, TUpdate, TCreate, TDetail>,
): void {
  stack.pendingOps = [];
  stack.effectiveBaseListSnapshots = [];
  stack.effectiveBaseInfiniteSnapshots = [];
  stack.effectiveBaseGet.clear();
  client.invalidateQueries({ queryKey: [prefix] });
}

// ============================================================================
// INTERNAL: SHARED MUTATION LIFECYCLE HANDLERS
// ============================================================================

function handleOptimisticError<TBase, TId, TUpdate, TCreate, TDetail>(
  client: QueryClient,
  prefix: string,
  error: Error,
  context: MutationContext | undefined,
  optimistic: VSOptimisticHandlers<TBase, TId, TUpdate, TCreate, TDetail>,
): void {
  if (!context) return;

  const stack = getStack<TBase, TId, TUpdate, TCreate, TDetail>(client, prefix);

  // Find the failed op before removing it — needed for the onError callback
  const failedOp = stack.pendingOps.find((op) => op.id === context.operationId);

  stack.pendingOps = stack.pendingOps.filter((op) => op.id !== context.operationId);
  restoreEffectiveBase(client, prefix, stack);
  replayPendingOps(client, prefix, stack, optimistic);

  // Fire AFTER rollback — cache is consistent when developer code runs.
  // Wrapped in try/catch so a throwing user callback cannot corrupt internal state.
  if (failedOp && optimistic.onError) {
    try {
      optimistic.onError(error, toOperation(failedOp));
    } catch {
      // Swallow — developer callbacks must not interrupt library lifecycle
    }
  }
}

function handleOptimisticSettled<TBase, TId, TUpdate, TCreate, TDetail>(
  client: QueryClient,
  prefix: string,
  error: Error | null,
  context: MutationContext | undefined,
  optimistic: VSOptimisticHandlers<TBase, TId, TUpdate, TCreate, TDetail>,
): void {
  // onMutate threw before returning — fall back to plain invalidation
  if (!context) {
    client.invalidateQueries({ queryKey: [prefix] });
    return;
  }

  const stack = getStack<TBase, TId, TUpdate, TCreate, TDetail>(client, prefix);

  if (!error) {
    // Success path: advance the confirmed floor before removing the op
    const settledOp = stack.pendingOps.find((op) => op.id === context.operationId);
    if (settledOp) {
      advanceEffectiveBase(stack, settledOp, optimistic);

      // Fire onSuccess after advance — developer sees the confirmed cache state.
      if (optimistic.onSuccess) {
        try {
          optimistic.onSuccess(toOperation(settledOp));
        } catch {
          // Swallow — developer callbacks must not interrupt library lifecycle
        }
      }
    }
  }

  // Remove this op — idempotent on the error path since onError already removed it
  stack.pendingOps = stack.pendingOps.filter((op) => op.id !== context.operationId);

  if (stack.pendingOps.length === 0) {
    // All mutations settled — sync with server now
    flushStack(client, prefix, stack);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createResourceHooks<K extends string, S extends WithResourceTypes>(
  queryKeyPrefix: K,
  apiService: S,
  options: VSResourceHooksOptions<
    ListRaw<S>, Base<S>, SingleRaw<S>, Detail<S>, Id<S>, Update<S>, Create<S>
  > = {},
) {
  const service = apiService as unknown as ResourceService<
    Id<S>, Base<S>, Detail<S>, Create<S>, Update<S>, ListRaw<S>, SingleRaw<S>
  >;

  const {
    adapters = createDefaultAdapters<Base<S>, Detail<S>>() as VSAdapters<
      VSDefaultPaginatedResponse<Base<S>>, Base<S>, VSDefaultSingleResponse<Detail<S>>, Detail<S>
    > as VSAdapters<ListRaw<S>, Base<S>, SingleRaw<S>, Detail<S>>,
    defaultParams = DEFAULT_PAGINATION,
    optimistic,
  } = options;

  return {
    // -------------------------------------------------------------------------
    // useList
    // -------------------------------------------------------------------------
    useList: (params: VSQueryParams = defaultParams): VSUseListReturn<Base<S>> => {
      const queryClient = useQueryClient();

      const query = useQuery<VSListResult<Base<S>>, Error>({
        queryKey: [queryKeyPrefix, params],
        queryFn: async () => {
          const raw = await service.list(params);
          return adapters.fromList(raw as ListRaw<S>);
        },
      });

      return {
        list:       query.data?.items ?? [],
        pagination: query.data?.pagination ?? {
          page: 1,
          limit: defaultParams.limit ?? 10,
          totalPages: 0,
          totalDocuments: 0,
        },
        isLoading:    query.isLoading,
        isFetching:   query.isFetching,
        isRefetching: query.isRefetching,
        isError:      query.isError,
        error:        query.error,
        refetch:      query.refetch,
        invalidate:   () => queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] }),
      };
    },

    // -------------------------------------------------------------------------
    // useGet
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
        item:         query.data,
        isLoading:    query.isLoading,
        isFetching:   query.isFetching,
        isRefetching: query.isRefetching,
        isError:      query.isError,
        error:        query.error,
        refetch:      query.refetch,
      };
    },

    // -------------------------------------------------------------------------
    // useMutations
    // -------------------------------------------------------------------------
    useMutations: () => {
      const queryClient = useQueryClient();
      const invalidate  = () => queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });

      // Synchronously captures base snapshots the moment the first operation
      // fires. Called AFTER cancelQueries so the snapshot is always stable.
      function captureBaseIfFirstOp(
        stack: OptimisticStack<Base<S>, Id<S>, Update<S>, Create<S>, Detail<S>>,
      ): void {
        if (stack.pendingOps.length === 0) {
          stack.effectiveBaseListSnapshots = queryClient.getQueriesData<VSListResult<Base<S>>>({
            queryKey: [queryKeyPrefix],
            predicate: isListQueryKey as any,
          });
          stack.effectiveBaseInfiniteSnapshots = queryClient.getQueriesData<InfiniteData<VSListResult<Base<S>>>>({
            queryKey: [queryKeyPrefix, "INFINITE"],
          });
        }
      }

      // -----------------------------------------------------------------------
      // createMutation
      // -----------------------------------------------------------------------
      const createMutation = useMutation<Detail<S>, Error, Create<S>, MutationContext | undefined>({
        mutationFn: async (payload) => {
          const raw = await service.create(payload);
          return adapters.fromSingle(raw as SingleRaw<S>);
        },
        onMutate: async (payload) => {
          if (!optimistic?.create) return undefined;

          // 1. Cancel first — prevents in-flight refetches from overwriting
          //    the optimistic write after it lands.
          await queryClient.cancelQueries({ queryKey: [queryKeyPrefix] });

          const stack = getStack<Base<S>, Id<S>, Update<S>, Create<S>, Detail<S>>(
            queryClient, queryKeyPrefix,
          );

          // 2. Snapshot the now-stable cache (no fetches in flight).
          captureBaseIfFirstOp(stack);

          // 3. Register the operation.
          const tempId = generateTempId();
          const op: PendingOp<Id<S>, Update<S>, Create<S>> = {
            id: Symbol(), kind: "create", payload, tempId,
          };
          stack.pendingOps.push(op);

          // 4. Apply — fully synchronous from here, no race window.
          try {
            applyCreateToAllCaches(queryClient, queryKeyPrefix, payload, tempId, optimistic.create);
          } catch {
            stack.pendingOps = stack.pendingOps.filter((o) => o.id !== op.id);
            throw new Error("[@void-snippets/react] Optimistic create setup failed.");
          }

          return { operationId: op.id };
        },
        onError: (_err, _vars, context) => {
          if (!optimistic?.create) return;
          handleOptimisticError(queryClient, queryKeyPrefix, _err, context, optimistic);
        },
        onSettled: (_data, error, _vars, context) => {
          if (!optimistic?.create) { invalidate(); return; }
          handleOptimisticSettled(queryClient, queryKeyPrefix, error ?? null, context, optimistic);
        },
      });

      // -----------------------------------------------------------------------
      // updateMutation
      // -----------------------------------------------------------------------
      const updateMutation = useMutation<
        Detail<S>, Error, { _id: Id<S>; payload: Update<S> }, MutationContext | undefined
      >({
        mutationFn: async ({ _id, payload }) => {
          const raw = await service.update(_id, payload);
          return adapters.fromSingle(raw as SingleRaw<S>);
        },
        onMutate: async ({ _id, payload }) => {
          if (!optimistic?.update) return undefined;

          await queryClient.cancelQueries({ queryKey: [queryKeyPrefix] });

          const stack = getStack<Base<S>, Id<S>, Update<S>, Create<S>, Detail<S>>(
            queryClient, queryKeyPrefix,
          );

          captureBaseIfFirstOp(stack);

          const currentSingle = queryClient.getQueryData<Detail<S>>([queryKeyPrefix, String(_id)]);
          if (currentSingle !== undefined) {
            stack.effectiveBaseGet.set(String(_id), currentSingle);
          }

          const op: PendingOp<Id<S>, Update<S>, Create<S>> = {
            id: Symbol(), kind: "update", _id, payload,
          };
          stack.pendingOps.push(op);

          try {
            applyUpdateToAllCaches(queryClient, queryKeyPrefix, _id, payload, optimistic.update);

            if (currentSingle !== undefined) {
              const updated = optimistic.updateSingle
                ? optimistic.updateSingle(currentSingle, payload)
                : ({ ...currentSingle, ...(payload as object) } as Detail<S>);
              queryClient.setQueryData([queryKeyPrefix, String(_id)], updated);
            }
          } catch {
            stack.pendingOps = stack.pendingOps.filter((o) => o.id !== op.id);
            throw new Error("[@void-snippets/react] Optimistic update setup failed.");
          }

          return { operationId: op.id };
        },
        onError: (_err, _vars, context) => {
          if (!optimistic?.update) return;
          handleOptimisticError(queryClient, queryKeyPrefix, _err, context, optimistic);
        },
        onSettled: (_data, error, _vars, context) => {
          if (!optimistic?.update) { invalidate(); return; }
          handleOptimisticSettled(queryClient, queryKeyPrefix, error ?? null, context, optimistic);
        },
      });

      // -----------------------------------------------------------------------
      // removeMutation
      // -----------------------------------------------------------------------
      const removeMutation = useMutation<Detail<S>, Error, Id<S>, MutationContext | undefined>({
        mutationFn: async (_id) => {
          const raw = await service.delete(_id);
          return adapters.fromSingle(raw as SingleRaw<S>);
        },
        onMutate: async (_id) => {
          if (!optimistic?.remove) return undefined;

          await queryClient.cancelQueries({ queryKey: [queryKeyPrefix] });

          const stack = getStack<Base<S>, Id<S>, Update<S>, Create<S>, Detail<S>>(
            queryClient, queryKeyPrefix,
          );

          captureBaseIfFirstOp(stack);

          const currentSingle = queryClient.getQueryData<Detail<S>>([queryKeyPrefix, String(_id)]);
          if (currentSingle !== undefined) {
            stack.effectiveBaseGet.set(String(_id), currentSingle);
          }

          const op: PendingOp<Id<S>, Update<S>, Create<S>> = {
            id: Symbol(), kind: "remove", _id,
          };
          stack.pendingOps.push(op);

          try {
            applyRemoveFromAllCaches(queryClient, queryKeyPrefix, _id, optimistic.remove);

            if (currentSingle !== undefined) {
              queryClient.invalidateQueries({
                queryKey: [queryKeyPrefix, String(_id)],
                refetchType: "none",
              });
            }
          } catch {
            stack.pendingOps = stack.pendingOps.filter((o) => o.id !== op.id);
            throw new Error("[@void-snippets/react] Optimistic remove setup failed.");
          }

          return { operationId: op.id };
        },
        onError: (_err, _vars, context) => {
          if (!optimistic?.remove) return;
          handleOptimisticError(queryClient, queryKeyPrefix, _err, context, optimistic);
        },
        onSettled: (_data, error, _vars, context) => {
          if (!optimistic?.remove) { invalidate(); return; }
          handleOptimisticSettled(queryClient, queryKeyPrefix, error ?? null, context, optimistic);
        },
      });

      return { create: createMutation, update: updateMutation, remove: removeMutation };
    },

    // -------------------------------------------------------------------------
    // useInfinite
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
