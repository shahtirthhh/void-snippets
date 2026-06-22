import { generatePath } from "react-router";
import { useParams, useSearchParams } from "react-router";

// ============================================================================
// INTERNAL TYPE UTILITIES
// ============================================================================

/**
 * Recursively extracts named path parameters from a route path string using
 * TypeScript template literal inference. Handles both required and optional
 * segments, and composes correctly across nested slashes.
 *
 *   '/users/:userId/posts/:postId' → { userId: string | number; postId: string | number }
 *   '/files/:path?'               → { path?: string | number }
 */
type ExtractRouteParams<T extends string> =
  // :param/ — parameter followed by more segments
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? (Param extends `${infer P}?`
        ? { [K in P]?: string | number }  // optional param
        : { [K in Param]: string | number }) // required param
      & ExtractRouteParams<`/${Rest}`>      // recurse into the remaining path
    // :param — parameter at the end of the path
    : T extends `${infer _Start}:${infer Param}`
    ? Param extends `${infer P}?`
      ? { [K in P]?: string | number }  // optional terminal param
      : { [K in Param]: string | number } // required terminal param
    : {}; // no params

/** Collapses intersection types into a single object for cleaner IDE tooltips. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** All named path parameters for a given route path literal. */
type RouteParams<Path extends string> = Prettify<ExtractRouteParams<Path>>;

/**
 * Route params as they actually arrive at runtime — `useParams()` always
 * returns strings, regardless of how `build()` types them (`string | number`).
 * Optional path segments (`:param?`) remain optional here too.
 *
 *   '/inbox/conversations/:conversationId' → { conversationId: string }
 *   '/files/:path?'                        → { path?: string }
 */
type StringifiedRouteParams<Path extends string> = {
  [K in keyof RouteParams<Path>]: string;
};

/** True when the path string contains at least one named parameter. */
type HasParams<Path extends string> =
  keyof RouteParams<Path> extends never ? false : true;

/**
 * True when Search is the `never` type — meaning no search params were
 * declared on this route. Array wrapping avoids distributive evaluation.
 */
type SearchIsAbsent<Search> = [Search] extends [never] ? true : false;

/**
 * True when Search has at least one required (non-optional) key.
 *   { page: number; sort?: string } → true  (page is required)
 *   { sort?: string }               → false (all optional)
 *   never                           → false
 */
type HasRequiredSearchKeys<Search> =
  [Search] extends [never] ? false : {} extends Search ? false : true;

// ---- Build option part types ------------------------------------------------

/** Params portion of the build() argument. Empty object when path has no params. */
type ParamsPart<Path extends string> =
  HasParams<Path> extends true ? { params: RouteParams<Path> } : {};

/**
 * Search portion of the build() argument.
 * Absent when Search is never.
 * Required when Search has at least one required key.
 * Optional when all Search keys are optional.
 */
type SearchPart<Search> =
  SearchIsAbsent<Search> extends true
    ? {}
    : HasRequiredSearchKeys<Search> extends true
    ? { search: Search }
    : { search?: Search };

/** Full combined build() options, flattened for IDE readability. */
type BuildArgs<Path extends string, Search> = Prettify<
  ParamsPart<Path> & SearchPart<Search>
>;

/**
 * True when build() can be called with zero arguments:
 * no path params AND (no search OR all search keys are optional).
 */
type ArgIsOptional<Path extends string, Search> =
  HasParams<Path> extends true
    ? false // path params are always required
    : SearchIsAbsent<Search> extends true
    ? true // no search at all
    : HasRequiredSearchKeys<Search> extends true
    ? false // a required search key exists
    : true; // search exists but all keys are optional

/**
 * True when BuildArgs produces an empty object — meaning build()
 * takes no arguments whatsoever (no params, no search).
 */
type BuildArgIsEmpty<Path extends string, Search> =
  HasParams<Path> extends false
    ? SearchIsAbsent<Search> extends true
    ? true
    : false
    : false;

/**
 * The fully conditioned build() function signature.
 *
 * Four cases:
 *   no params + no search            → () => string
 *   no params + all-optional search  → (options?: { search?: S }) => string
 *   params (+ optional search)       → (options: { params: P; search?: S }) => string
 *   required search key              → (options: { search: S }) => string
 */
type BuildFn<Path extends string, Search> =
  BuildArgIsEmpty<Path, Search> extends true
    ? () => string
    : ArgIsOptional<Path, Search> extends true
    ? (options?: BuildArgs<Path, Search>) => string
    : (options: BuildArgs<Path, Search>) => string;

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/** Optional metadata that can be attached to any route definition. */
export interface RouteMetadata {
  /**
   * Permission identifiers required to access this route.
   * Read via the `handle` property in your React Router config.
   *
   * @example
   * permissions: ['ADMIN', 'SUPER_ADMIN']
   */
  permissions?: string[];

  /**
   * Human-readable label used for breadcrumb navigation.
   * Read via the `handle` property in your React Router config.
   */
  breadcrumb?: string;

  /**
   * Document title for the page.
   * Read via the `handle` property in your React Router config.
   */
  title?: string;

  /**
   * Arbitrary custom metadata — analytics tags, loader IDs, feature flags, etc.
   * Read via the `handle` property in your React Router config.
   *
   * @example
   * meta: { analyticsId: 'user-detail-view', loaderKey: 'userLoader' }
   */
  meta?: Record<string, unknown>;
}

/**
 * The intermediate type returned by `defineRoute()`.
 * Consumed directly by `createRouteContract()` — you do not use this type
 * directly in application code.
 *
 * @internal
 */
export type RouteDefinition<
  Path extends string = string,
  Search = never,
> = RouteMetadata & {
  readonly path: Path;
  readonly _search: Search; // phantom — @internal
  search<S>(): RouteDefinition<Path, S>;
};

/**
 * A fully processed route node produced by `createRouteContract()`.
 * This is the type you interact with throughout the application.
 */
export type ProcessedRoute<
  Path extends string = string,
  Search = never,
> = RouteMetadata & {
  readonly path: Path;
  readonly _search: Search; // phantom — @internal
  readonly build: BuildFn<Path, Search>;
};

/** The input shape `createRouteContract` accepts. */
type RouteTree = {
  [K: string]: RouteDefinition<string, any> | RouteTree;
};

/** Maps a RouteTree recursively to a tree of ProcessedRoutes. */
type ProcessedTree<T> = {
  [K in keyof T]: T[K] extends RouteDefinition<infer Path, infer Search>
    ? ProcessedRoute<Path, Search>
    : T[K] extends RouteTree
    ? ProcessedTree<T[K]>
    : never;
};

// ============================================================================
// RUNTIME: TYPE GUARD
// ============================================================================

function isRouteDefinition(node: unknown): node is RouteDefinition {
  if (node === null || typeof node !== "object") return false;
  const n = node as Record<string, unknown>;
  return (
    typeof n["path"] === "string" &&
    "_search" in n &&
    typeof n["search"] === "function"
  );
}

// ============================================================================
// RUNTIME: defineRoute
// ============================================================================

/**
 * Defines a single route. Pass directly to `createRouteContract()`.
 *
 * The second argument is purely metadata — permissions, breadcrumbs, titles.
 * Chain `.search<SearchType>()` to declare typed search parameters for the route.
 *
 * Use absolute paths. Concatenating parent/child paths via template literals
 * causes TypeScript server slowdowns on large apps.
 *
 * @example
 * defineRoute('/dashboard', { breadcrumb: 'Home', title: 'Dashboard' })
 *
 * defineRoute('/users', { permissions: ['ADMIN'] })
 *   .search<{ page: number; sort?: 'asc' | 'desc' }>()
 *
 * defineRoute('/users/:userId', { breadcrumb: 'User Detail' })
 *   .search<{ tab?: 'profile' | 'settings' }>()
 */
export function defineRoute<Path extends string>(
  path: Path,
  config?: RouteMetadata,
): RouteDefinition<Path, never> {
  const definition: RouteDefinition<Path, never> = {
    ...config,
    path,
    _search: undefined as unknown as never,
    search<S>(): RouteDefinition<Path, S> {
      return definition as unknown as RouteDefinition<Path, S>;
    },
  };
  return definition;
}

// ============================================================================
// RUNTIME: createRouteContract
// ============================================================================

/**
 * Processes a tree of `defineRoute()` definitions into a fully typed contract.
 *
 * Every route leaf gains a type-safe `build()` function. Nested groups are
 * preserved as plain objects. All metadata flows through unchanged.
 *
 * Call once at module level and export as `AppRoutes`.
 *
 * @example
 * export const AppRoutes = createRouteContract({
 *   auth: {
 *     login: defineRoute('/auth/login').search<{ redirect?: string }>(),
 *   },
 *   inbox: {
 *     conversation: defineRoute('/inbox/conversations/:conversationId'),
 *   },
 * });
 */
export function createRouteContract<T extends RouteTree>(
  tree: T,
): ProcessedTree<T> {
  const result: Record<string, unknown> = {};

  for (const key in tree) {
    const node = tree[key];

    if (isRouteDefinition(node)) {
      const {
        _search: _phantom,
        search: _searchFn,
        ...metadata
      } = node as RouteDefinition & Record<string, unknown>;

      result[key] = {
        ...metadata,
        _search: undefined as unknown as never,

        build(
          options: {
            params?: Record<string, string | number>;
            search?: Record<string, unknown>;
          } = {},
        ): string {
          const { params, search } = options;

          const pathname: string = params
            ? generatePath(
                node.path,
                Object.fromEntries(
                  Object.entries(params).map(([k, v]) => [k, String(v)]),
                ),
              )
            : node.path;

          if (search) {
            const defined = Object.entries(search).filter(
              ([, v]) => v !== undefined && v !== null,
            );
            if (defined.length > 0) {
              const qs = new URLSearchParams(
                defined.map(([k, v]) => [k, String(v)]),
              ).toString();
              return `${pathname}?${qs}`;
            }
          }

          return pathname;
        },
      };
    } else {
      result[key] = createRouteContract(node as RouteTree);
    }
  }

  return result as ProcessedTree<T>;
}

// ============================================================================
// RUNTIME: useTypedParams
// ============================================================================

/**
 * Returns the current URL path parameters typed to the `:segments` declared
 * in the route's path string. TypeScript extracts the param names directly
 * from the path literal — no manual type annotation needed.
 *
 * This is the path-param counterpart to `useTypedSearchParams`.
 *
 * - `useTypedParams`       → reads `:conversationId` from the path
 * - `useTypedSearchParams` → reads `?page=1&sort=asc` from the query string
 *
 * All values are `string` at runtime (React Router's `useParams` always
 * returns strings). Use `stringToId<T>()` from `@void-snippets/core` to
 * convert to a branded ID.
 *
 * @example
 * // Route: defineRoute('/inbox/conversations/:conversationId')
 * const { conversationId } = useTypedParams(AppRoutes.inbox.conversation);
 * // conversationId: string — TypeScript inferred from the path, not guessed
 *
 * // Cast to a branded ID immediately after reading
 * const id = stringToId<Conversation.Id>(conversationId);
 *
 * // Works with multiple params too
 * // Route: defineRoute('/orgs/:orgId/projects/:projectId')
 * const { orgId, projectId } = useTypedParams(AppRoutes.orgs.project);
 */
export function useTypedParams<P extends string, S>(
  // Only used for TypeScript to infer P from ProcessedRoute<P, S>.
  // The route value itself is never read at runtime.
  _route: ProcessedRoute<P, S>,
): StringifiedRouteParams<P> {
  const params = useParams();
  // useParams() returns Readonly<Record<string, string | undefined>>.
  // We cast to StringifiedRouteParams<P> — the param names are guaranteed
  // correct because the route and the router config share the same path string.
  return params as unknown as StringifiedRouteParams<P>;
}

// ============================================================================
// RUNTIME: useTypedSearchParams
// ============================================================================

/**
 * Returns the current URL search params typed to the shape declared on the
 * route via `.search<T>()`, plus a type-safe setter and clear function.
 *
 * `setSearch` **merges** — pass only the keys you want to change.
 * Set a key to `undefined` to remove it from the URL.
 *
 * ⚠️ All values are strings at runtime (React Router returns everything from
 * the URL as a string). Coerce numeric types explicitly: `Number(search.page ?? 1)`.
 *
 * @example
 * const { search, setSearch, clearSearch } =
 *   useTypedSearchParams(AppRoutes.inbox.list);
 *
 * setSearch({ page: 2 })         // updates page, keeps everything else
 * setSearch({ filter: undefined }) // removes filter from the URL
 * clearSearch()                   // wipes all search params
 */
export function useTypedSearchParams<P extends string, S>(
  _route: ProcessedRoute<P, S>,
): {
  readonly search: Readonly<Partial<S>>;
  setSearch: (update: Partial<S>) => void;
  clearSearch: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = Object.fromEntries(searchParams.entries()) as Partial<S>;

  function setSearch(update: Partial<S>): void {
    setSearchParams((prev) => {
      const next: Record<string, string> = Object.fromEntries(prev.entries());
      for (const [k, v] of Object.entries(update as Record<string, unknown>)) {
        if (v === undefined || v === null) {
          delete next[k];
        } else {
          next[k] = String(v);
        }
      }
      return next;
    });
  }

  function clearSearch(): void {
    setSearchParams({});
  }

  return { search, setSearch, clearSearch } as const;
}
