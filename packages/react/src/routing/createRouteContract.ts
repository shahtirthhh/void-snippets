import { generatePath } from "react-router";
import { useSearchParams } from "react-router";

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
  /** The absolute path string for this route. */
  readonly path: Path;

  /**
   * Phantom type anchor — carries the Search type for downstream inference.
   * Always `undefined` at runtime. Do not read or write this directly.
   * @internal
   */
  readonly _search: Search;

  /**
   * Declares typed search parameters for this route. Chain immediately after
   * `defineRoute()`. The generic type argument is the only input — no value
   * needs to be passed.
   *
   * @example
   * defineRoute('/users').search<{ page: number; sort?: 'asc' | 'desc' }>()
   */
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
  /** The absolute path string — use this in `createBrowserRouter`. */
  readonly path: Path;

  /**
   * Phantom type anchor — used by `useTypedSearchParams` to infer `Search`.
   * Always `undefined` at runtime. Do not read or write this directly.
   * @internal
   */
  readonly _search: Search;

  /**
   * Builds a fully qualified URL for this route.
   *
   * TypeScript enforces at compile time that:
   * - `params` is provided and fully satisfied when the path has dynamic segments.
   * - `search` matches the exact shape declared via `.search<T>()`.
   * - No argument is needed for routes with neither params nor required search.
   */
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

/**
 * Differentiates a RouteDefinition leaf from a plain route group object.
 * Checks for the three properties that only `defineRoute()` produces:
 * `path` (string), `_search` (phantom), and `search` (type-setting method).
 */
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
 * **Use absolute paths.** Concatenating parent/child paths via template literals
 * causes TypeScript server slowdowns on large apps. Be explicit.
 *
 * @example
 * // Plain route — no params, no search
 * defineRoute('/dashboard', { breadcrumb: 'Home', title: 'Dashboard' })
 *
 * // Route with typed search params
 * defineRoute('/users', { permissions: ['ADMIN'] })
 *   .search<{ page: number; sort?: 'asc' | 'desc' }>()
 *
 * // Route with path params and optional search
 * defineRoute('/users/:userId', { breadcrumb: 'User Detail' })
 *   .search<{ tab?: 'profile' | 'settings' }>()
 *
 * // Route with path params, no search
 * defineRoute('/users/:userId/posts/:postId')
 */
export function defineRoute<Path extends string>(
  path: Path,
  config?: RouteMetadata,
): RouteDefinition<Path, never> {
  const definition: RouteDefinition<Path, never> = {
    ...config,
    path,
    // Phantom anchor — undefined at runtime, typed as `never` for the base definition.
    // The search<S>() method changes this to `S` at the TypeScript level only.
    _search: undefined as unknown as never,
    search<S>(): RouteDefinition<Path, S> {
      // Pure type-level operation. The runtime object is returned unchanged.
      // TypeScript sees the return type as RouteDefinition<Path, S> and uses
      // that for all downstream generic inference.
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
 * Every route leaf gains a `build()` function whose signature is automatically
 * conditioned on the presence of path params and search params. Nested groups
 * are preserved as plain objects. All metadata (`path`, `permissions`,
 * `breadcrumb`, `title`, `meta`) flows through to the output unchanged.
 *
 * Call once at module level and export. Import `AppRoutes` wherever you need
 * to build a URL, wire up the router, or access route metadata.
 *
 * @example
 * // routes.ts
 * export const AppRoutes = createRouteContract({
 *   auth: {
 *     login:    defineRoute('/auth/login').search<{ redirect?: string }>(),
 *     register: defineRoute('/auth/register'),
 *   },
 *   dashboard: {
 *     root: defineRoute('/dashboard', { breadcrumb: 'Home', title: 'Dashboard' }),
 *     users: {
 *       list: defineRoute('/dashboard/users', {
 *         permissions: ['ADMIN'],
 *         breadcrumb:  'Users',
 *       }).search<{ page: number; sort?: 'asc' | 'desc' }>(),
 *       detail: defineRoute('/dashboard/users/:userId', {
 *         permissions: ['ADMIN'],
 *         breadcrumb:  'User Detail',
 *       }).search<{ tab?: 'profile' | 'settings' }>(),
 *     },
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
      // Strip the phantom _search and the type-only search() method.
      // They exist only for TypeScript — the processed node doesn't expose them.
      const {
        _search: _phantom,
        search: _searchFn,
        ...metadata
      } = node as RouteDefinition & Record<string, unknown>;

      result[key] = {
        ...metadata,
        // Preserve the phantom anchor on the ProcessedRoute for useTypedSearchParams.
        _search: undefined as unknown as never,

        build(
          options: {
            params?: Record<string, string | number>;
            search?: Record<string, unknown>;
          } = {},
        ): string {
          const { params, search } = options;

          // 1. Resolve path params via React Router's battle-tested generatePath.
          //    Handles :param, :param?, and wildcard segments correctly.
          const pathname: string = params
            ? generatePath(node.path, params as Record<string, string | number>)
            : node.path;

          // 2. Serialize search params into a query string.
          //    undefined and null values are silently dropped.
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
      // Recurse into nested route groups — they are plain objects without
      // `path`, `_search`, or `search`, so isRouteDefinition returns false.
      result[key] = createRouteContract(node as RouteTree);
    }
  }

  return result as ProcessedTree<T>;
}

// ============================================================================
// RUNTIME: useTypedSearchParams
// ============================================================================

/**
 * Returns the current URL search params typed to the shape declared on the
 * route, plus a type-safe setter and a clear function.
 *
 * Pass any processed route that was created with `.search<T>()`. TypeScript
 * infers `T` automatically — no generics needed at the call site.
 *
 * **`setSearch` merges** — it does not replace the entire query string.
 * Pass only the keys you want to change; everything else is preserved.
 * Set a key to `undefined` or `null` to remove it from the URL.
 *
 * ⚠️  **Runtime coercion note:** React Router's `useSearchParams` returns all
 * values as strings. If you declare `page: number`, `search.page` will be
 * the string `"1"` at runtime even though TypeScript types it as `number`.
 * Coerce where needed: `Number(search.page)`. This is a deliberate trade-off
 * that avoids requiring a runtime schema library.
 *
 * @example
 * // Inside the /dashboard/users page component
 * const { search, setSearch, clearSearch } =
 *   useTypedSearchParams(AppRoutes.dashboard.users.list);
 *
 * // search.page is typed as `number | undefined`
 * // but is a string at runtime — coerce explicitly:
 * const page = Number(search.page ?? 1);
 *
 * setSearch({ page: 2 })              // keeps sort, q; updates page
 * setSearch({ page: 1, sort: 'asc' }) // updates page and sort; keeps q
 * setSearch({ sort: undefined })      // removes sort from the URL
 * clearSearch()                        // wipes all search params
 */
export function useTypedSearchParams<P extends string, S>(
  // Only used for TypeScript to infer S from ProcessedRoute<P, S>.
  // The runtime value is not read — the hook uses useSearchParams directly.
  _route: ProcessedRoute<P, S>,
): {
  /** Current search params, typed as a partial of the declared search shape. */
  readonly search: Readonly<Partial<S>>;
  /**
   * Merges the given partial update into the current search params and
   * pushes a new URL entry. Set a key to `undefined` to remove it.
   */
  setSearch: (update: Partial<S>) => void;
  /** Removes all search parameters from the URL. */
  clearSearch: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  // Cast URLSearchParams entries to the declared type.
  // Values are strings at runtime — documented in the JSDoc above.
  const search = Object.fromEntries(searchParams.entries()) as Partial<S>;

  function setSearch(update: Partial<S>): void {
    setSearchParams((prev) => {
      const next: Record<string, string> = Object.fromEntries(prev.entries());

      for (const [k, v] of Object.entries(
        update as Record<string, unknown>,
      )) {
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
