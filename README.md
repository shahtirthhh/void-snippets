# @void-snippets

> A TypeScript-first monorepo of modular utilities for building clean, scalable full-stack and React applications.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-blue)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange)](https://pnpm.io/)

---

## Table of Contents

- [Overview](#overview)
- [Monorepo Structure](#monorepo-structure)
- [Package Dependency Graph](#package-dependency-graph)
- [Installation](#installation)
- [Build System](#build-system)
- [TypeScript Configuration](#typescript-configuration)
- [Package: `@void-snippets/core`](#package-void-snippetscore)
  - [Branded ID Types](#branded-id-types)
  - [Core Types Reference](#core-types-reference)
  - [Adapter System](#adapter-system)
  - [Utilities](#utilities)
- [Package: `@void-snippets/client`](#package-void-snippetsclient)
  - [Configuration](#configuration)
  - [ResourceService](#resourceservice)
  - [Error Handling](#error-handling)
- [Package: `@void-snippets/react`](#package-void-snippetsreact)
  - [Setup](#setup)
  - [createResourceHooks — Factory](#createresourcehooks--factory)
    - [useList](#uselistparams-vsqueryparams)
    - [useGet](#usegetid-tid-staletime-number)
    - [useMutations](#usemutations)
    - [useInfinite](#useinfiniteparams-vsqueryparams)
  - [Custom API Adapters](#custom-api-adapters)
  - [Optimistic Updates](#optimistic-updates)
  - [createSocketHooks — Factory](#createsockethooks--factory)
    - [useSocketEmit](#usesocketemit)
    - [useSocketListener](#usesocketlistenerevent-handler-options)
    - [useSocketConnection](#usesocketconnection)
  - [createRouteContract — Factory](#createroutecontract--factory)
    - [defineRoute](#defineroute)
    - [useTypedSearchParams](#usetypedsearchparams)
  - [useAlertMessage](#usealertmessageautohideduration-number)
  - [useAsyncState](#useasyncstatet-initialdata-t--null)
  - [useCallTimer](#usecalltimerstartedAt-number--null)
  - [useModal](#usemodalt--unknown)
  - [usePagination](#usepaginationinitialpage-number-initiallimit-number)
- [End-to-End Workflow Example](#end-to-end-workflow-example)
- [Contributing / Development](#contributing--development)
- [License](#license)

---

## Overview

`@void-snippets` is a pnpm monorepo that ships three tightly integrated but independently installable packages:

| Package | Version | Description |
|---|---|---|
| [`@void-snippets/core`](./packages/core) | `0.3.0` | Shared types, branded IDs, adapter interfaces, and utility functions |
| [`@void-snippets/client`](./packages/client) | `0.3.0` | Framework-agnostic generic CRUD resource service (axios-powered) |
| [`@void-snippets/react`](./packages/react) | `0.6.0` | TanStack Query factory, Socket.IO factory, type-safe routing contract, and React utility hooks |

**Design goals:**

- **Zero boilerplate** — define a resource once, get fully-typed CRUD hooks for free.
- **Strict types everywhere** — branded IDs, phantom types, and inferred generics eliminate entire classes of runtime bugs.
- **Adapter-first** — decouple from any API response shape via explicit adapter interfaces.
- **Composable** — each package is independently usable; `@void-snippets/client` works in Vue, Node, or plain TS projects without React.

---

## Monorepo Structure

```
void-snippets/
├── packages/
│   ├── core/                    # @void-snippets/core
│   │   └── src/
│   │       ├── id.ts            # VSId<K, T> branded type
│   │       ├── string-to-id.ts  # stringToId() runtime helper
│   │       ├── index.ts         # public barrel exports
│   │       ├── types/index.ts   # All shared interfaces + createDefaultAdapters()
│   │       └── utils/catch-error.ts  # catchError() Go-style error handling
│   ├── client/                  # @void-snippets/client
│   │   └── src/
│   │       ├── configure.ts           # configure() / getConfiguredInstance()
│   │       ├── index.ts               # public barrel exports
│   │       ├── services/
│   │       │   ├── base-api.service.ts      # BaseApiService (abstract)
│   │       │   └── resource-api.service.ts  # ResourceService<…> (generic CRUD)
│   │       └── utils/handle-api-error.ts    # handleApiError() normalizer
│   └── react/                   # @void-snippets/react
│       └── src/
│           ├── index.ts         # public barrel exports
│           ├── hooks/
│           │   ├── createResourceHooks.ts  # TanStack Query hook factory
│           │   ├── useAlertMessage.ts
│           │   ├── useAsyncState.ts
│           │   ├── useCallTimer.ts
│           │   ├── useModal.ts
│           │   └── usePagination.ts
│           ├── socket/
│           │   └── createSocketHooks.ts    # Socket.IO hook factory
│           └── routing/
│               └── createRouteContract.ts  # Type-safe route contract factory
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Package Dependency Graph

```
@void-snippets/react
    ├── @void-snippets/core       (direct dep)
    ├── @void-snippets/client     (peer dep ≥0.1.0)
    ├── @tanstack/react-query     (^5.0.0)
    ├── socket.io-client          (peer dep ≥4.6.0, optional)
    └── react-router              (peer dep ≥7.0.0, optional)

@void-snippets/client
    └── @void-snippets/core       (workspace:*)

@void-snippets/core
    └── (no runtime dependencies)
```

---

## Installation

Install the full stack in a React project:

```bash
pnpm add @void-snippets/core @void-snippets/client @void-snippets/react
pnpm add axios @tanstack/react-query
```

Add optional peer dependencies for the features you use:

```bash
# Socket.IO hooks
pnpm add socket.io-client

# Type-safe routing contract
pnpm add react-router
```

**Peer / minimum requirements:**

| Peer | Minimum | Required for |
|---|---|---|
| `react` | `>=17.0.0` | All React hooks |
| `@void-snippets/client` | `>=0.1.0` | `createResourceHooks` |
| `axios` | `^1.6.0` | `@void-snippets/client` |
| `@tanstack/react-query` | `^5.0.0` | `createResourceHooks` |
| `socket.io-client` | `>=4.6.0` | `createSocketHooks` (optional) |
| `react-router` | `>=7.0.0` | `createRouteContract` (optional) |
| TypeScript | `^5.4.0` | All packages |

---

## Build System

Each package uses [tsup](https://tsup.egoist.dev/) to produce dual CJS + ESM outputs with full declaration maps.

| Script (root) | Description |
|---|---|
| `pnpm build` | Build all packages in dependency order |
| `pnpm build:react` | Build `@void-snippets/react` only |
| `pnpm dev` | Watch mode for all packages |
| `pnpm publish:all` | Publish all packages to npm |
| `pnpm version:bump` | Run `npm version` across all packages |

---

## TypeScript Configuration

Root `tsconfig.base.json` (extended by each package):

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

## Package: `@void-snippets/core`

Shared foundation — zero runtime dependencies.

```ts
import type { VSId, VSPagination, VSQueryParams, VSListResult, VSAdapters } from '@void-snippets/core';
import { stringToId, catchError, createDefaultAdapters } from '@void-snippets/core';
```

### Branded ID Types

#### `VSId<K, T>`

```ts
type ContactId = VSId<string, 'Contact'>;
type UserId    = VSId<string, 'User'>;

userId = contactId; // ❌ Type error — brands don't match
```

#### `stringToId<T>(id: string): T`

Casts a raw string to a branded `VSId`. Use at system boundaries.

```ts
const id = stringToId<ContactId>(params.contactId);
```

### Core Types Reference

```ts
interface VSPagination { page: number; limit: number; totalPages: number; totalDocuments: number; }
interface VSQueryParams { page?: number; limit?: number; [key: string]: unknown; }
interface VSListResult<T> { items: T[]; pagination: VSPagination; }
```

Default API response shapes:
- **List:** `{ data: { items, page, limit, totalPages, totalDocuments } }`
- **Single:** `{ data: <item> }`

### Adapter System

```ts
interface VSAdapters<TListRaw, TBase, TSingleRaw, TDetail> {
  fromList:   (raw: TListRaw)   => VSListResult<TBase>;
  fromSingle: (raw: TSingleRaw) => TDetail;
}
```

`createDefaultAdapters<TBase, TDetail>()` — pre-built adapters for the default response shapes.

### Utilities

#### `catchError<T>(promise: Promise<T>)`

Go-style error handling. Returns `[Error, null] | [null, T]`.

```ts
const [err, user] = await catchError(fetchUser(id));
if (err) return;
console.log(user.name); // user is T here, not T | null
```

---

## Package: `@void-snippets/client`

Framework-agnostic HTTP resource service.

### Configuration

```ts
import { configure } from '@void-snippets/client';
configure(axios.create({ baseURL: 'https://api.example.com' }));
```

### ResourceService

```ts
class ResourceService<TId, TBase, TDetail = TBase, TCreate = Partial<TBase>, TUpdate = Partial<TBase>>
```

| Method | HTTP |
|---|---|
| `list(params?)` | `GET /endpoint` |
| `get(id)` | `GET /endpoint/:id` |
| `create(payload)` | `POST /endpoint` |
| `update(id, payload)` | `PATCH /endpoint/:id` |
| `delete(id)` | `DELETE /endpoint/:id` |

```ts
// contacts/contacts.api.ts
export class ContactsApiService extends ResourceService<
  Contact.Id, Contact.Base, Contact.WithCreatedBy,
  Contact.Apis.CreatePayload, Contact.Apis.UpdatePayload
> {
  constructor() { super('/contacts'); }
}
export const ContactsApis = new ContactsApiService();
```

### Error Handling

`handleApiError(error: unknown): never` — normalises axios errors into standard `Error` objects. Always throws.

---

## Package: `@void-snippets/react`

```ts
import {
  createResourceHooks,
  createSocketHooks,
  createRouteContract, defineRoute, useTypedSearchParams,
  useAlertMessage, useAsyncState, useCallTimer, useModal, usePagination,
} from '@void-snippets/react';
```

---

### Setup

```ts
// 1. Configure axios
import { configure } from '@void-snippets/client';
configure(axios.create({ baseURL: 'https://api.example.com' }));

// 2. QueryClientProvider
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
```

---

### `createResourceHooks` — Factory

Creates four TanStack Query hooks for a single resource. All types are inferred from `apiService`.

```ts
export const contactHooks = createResourceHooks('contacts', ContactsApis);
// or with options:
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  defaultParams: { page: 1, limit: 20 },
  optimistic: { ... },
});
```

#### `useList(params?: VSQueryParams)`

```ts
const { list, pagination, isLoading, isFetching, isRefetching,
        isError, error, refetch, invalidate } =
  contactHooks.useList({ page: 1, limit: 20, search: 'john' });
```

| Field | Type | When true |
|---|---|---|
| `isLoading` | `boolean` | First fetch only — no cached data. Show full-page skeleton. |
| `isFetching` | `boolean` | Any fetch in progress. Show subtle progress indicator. |
| `isRefetching` | `boolean` | Background refetch with existing data. Show lightweight overlay. |
| `refetch` | `() => Promise` | Retry button in error states — retargets this query only. |
| `invalidate` | `() => void` | Busts the entire resource prefix — refetches all active param variants. |

#### `useGet(id: TId, staleTime?: number)`

```ts
const { item, isLoading, isFetching, isRefetching, isError, error, refetch } =
  contactHooks.useGet(contactId);
// Disabled automatically when id is undefined, null, or ""
```

#### `useMutations()`

```ts
const { create, update, remove } = contactHooks.useMutations();
// Each is a full UseMutationResult from TanStack Query

// Always await for complex forms — keeps the modal open on error
const handleSave = async (data) => {
  try {
    await create.mutateAsync(data)
    modal.closeModal()           // only on success
    toast.success('Created!')
  } catch (err) {
    toast.error(err.message)     // modal still open, all fields intact
  }
}
```

#### `useInfinite(params?: VSQueryParams)`

```ts
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  contactHooks.useInfinite({ limit: 20 });
const all = data?.pages.flatMap(p => p.items) ?? [];
```

---

### Custom API Adapters

```ts
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  adapters: {
    fromList:   (raw) => ({ items: raw.results, pagination: { ... } }),
    fromSingle: (raw) => raw.payload,
  },
});
```

---

### Optimistic Updates

Provide cache transform functions for instant UI feedback before the server responds. The library applies them to all active `useList`, `useInfinite`, and `useGet` caches, maintains correct concurrent ordering via an `effectiveBase` stack, auto-rollbacks on error, and defers invalidation until all in-flight mutations settle.

```ts
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  optimistic: {
    // _id is from mutation args — NOT from payload
    update: (cache, { _id, payload }) =>
      cache.map(item => item._id === _id ? { ...item, ...payload } : item),

    remove: (cache, id) =>
      cache.filter(item => item._id !== id),

    create: (cache, { payload, tempId }) => [
      { ...payload, _id: tempId as Contact.Id },
      ...cache,
    ],

    // Fires after rollback — cache is in a consistent state
    onError: (error, operation) =>
      toast.error(`Failed to ${operation.kind}: ${error.message}`),

    // Fires after effectiveBase advances for this operation
    onSuccess: (operation) => {
      if (operation.kind === 'create') analytics.track('contact_created')
    },
  },
});
```

`VSOptimisticOperation` — the discriminated union passed to `onError` and `onSuccess`:

```ts
type VSOptimisticOperation<TId, TCreate, TUpdate> =
  | { kind: 'create'; payload: TCreate; tempId: string }
  | { kind: 'update'; _id: TId; payload: TUpdate }
  | { kind: 'remove'; _id: TId }
```

> **Complex forms** — never close a modal before `await mutateAsync()` resolves when the form has many fields. The optimistic list update fires instantly behind the open modal. On API failure, the item disappears (rollback) and the modal stays open with all fields intact.

---

### `createSocketHooks` — Factory

Creates type-safe Socket.IO hooks bound to a socket instance. Requires `socket.io-client ≥4.6.0`.

```ts
// services/socket-hooks.ts — written once, imported everywhere
import { createSocketHooks } from '@void-snippets/react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_HOST, { autoConnect: false });

export const { useSocketEmit, useSocketListener, useSocketConnection } =
  createSocketHooks<IClientToServerEvents, IServerToClientEvents>(socket);
```

#### `useSocketEmit()`

```ts
const { emit, emitWithAck } = useSocketEmit();

// Fire and forget — throws if socket not connected
emit('join-room', roomId);

// Waits for ACK — TypeScript errors at compile time if called on no-ACK event
const result = await emitWithAck('update-profile', name);
// result: { status: 'ok' | 'error' } — fully inferred from event type
```

`emitWithAck` requires `socket.io-client ≥4.6.0`.

#### `useSocketListener(event, handler, options?)`

```ts
// Inline arrow functions are safe — ref pattern prevents stale closures
useSocketListener('new-message', (data) => setMessages(p => [...p, data]));

// Conditional — only listen when needed
useSocketListener('user-joined', (userId) => addParticipant(userId), {
  enabled: isConnected && !!roomId,
});
```

#### `useSocketConnection()`

```ts
const { isConnected, isConnecting, socketId, error, connect, disconnect } =
  useSocketConnection();
```

| Field | Description |
|---|---|
| `isConnected` | True when socket has an active connection |
| `isConnecting` | True during initial connect or reconnect attempts |
| `socketId` | Server-assigned socket ID, undefined when disconnected |
| `error` | Last connection error, null otherwise |
| `connect()` | Initiates connection — no-op if already connected |
| `disconnect()` | Gracefully closes the connection |

---

### `createRouteContract` — Factory

Converts a tree of `defineRoute()` definitions into a fully typed route contract. Every route gets a `build()` function whose signature is **automatically conditioned** on the presence of path params and search params — TypeScript errors at the call site when required values are missing.

Requires `react-router ≥7.0.0`.

#### Setup

```ts
// routes.ts — written once, imported throughout the app
import { createRouteContract, defineRoute } from '@void-snippets/react';

export const AppRoutes = createRouteContract({
  auth: {
    login:    defineRoute('/auth/login').search<{ redirect?: string }>(),
    register: defineRoute('/auth/register'),
  },

  dashboard: {
    root: defineRoute('/dashboard', {
      breadcrumb: 'Home',
      title:      'Dashboard',
    }),

    users: {
      list: defineRoute('/dashboard/users', {
        permissions: ['ADMIN'],
        breadcrumb:  'Users',
        title:       'User Management',
      }).search<{ page: number; sort?: 'asc' | 'desc'; q?: string }>(),

      detail: defineRoute('/dashboard/users/:userId', {
        permissions: ['ADMIN'],
        breadcrumb:  'User Detail',
      }).search<{ tab?: 'profile' | 'settings' | 'activity' }>(),
    },

    settings: defineRoute('/dashboard/settings', {
      breadcrumb: 'Settings',
      title:      'Account Settings',
    }),
  },
});
```

---

#### `defineRoute`

```ts
defineRoute(path: string, config?: RouteMetadata): RouteDefinition
```

Defines a single route. The second argument is **metadata only** — no search-related fields.

```ts
interface RouteMetadata {
  permissions?: string[];           // access control identifiers
  breadcrumb?:  string;             // breadcrumb label
  title?:       string;             // page title
  meta?:        Record<string, unknown>; // custom metadata (loader IDs, analytics tags, etc.)
}
```

**`.search<T>()`** — chain when the route accepts URL search params. The generic type is the only input — no value is provided. TypeScript carries the type through the contract.

```ts
// Route with no params, no search
defineRoute('/dashboard/settings')

// Route with search — all keys optional
defineRoute('/auth/login').search<{ redirect?: string }>()

// Route with required search key
defineRoute('/dashboard/users').search<{ page: number; sort?: 'asc' | 'desc' }>()

// Route with path params and optional search
defineRoute('/dashboard/users/:userId').search<{ tab?: 'profile' | 'settings' }>()

// Route with path params, no search
defineRoute('/dashboard/users/:userId/posts/:postId')
```

> **Use absolute paths.** Concatenating parent/child paths via template literals causes TypeScript performance degradation on large apps. Explicit absolute paths keep autocomplete fast.

---

#### `build()` — URL construction

`build()` is added to every processed route by `createRouteContract`. Its signature adapts to the route's shape — TypeScript enforces the correct call form at compile time.

| Route shape | Signature |
|---|---|
| No params, no search | `build() → string` |
| No params, all-optional search | `build(options?: { search?: S }) → string` |
| Path params (+ optional search) | `build(options: { params: P; search?: S }) → string` |
| Required search key | `build(options: { search: S }) → string` |

```ts
// No args needed
AppRoutes.auth.register.build()
// → '/auth/register'

// Optional search arg
AppRoutes.auth.login.build()
// → '/auth/login'
AppRoutes.auth.login.build({ search: { redirect: '/dashboard' } })
// → '/auth/login?redirect=%2Fdashboard'

// Required params
AppRoutes.dashboard.users.detail.build({ params: { userId: user._id } })
// → '/dashboard/users/abc-123'

// Params + optional search
AppRoutes.dashboard.users.detail.build({
  params: { userId: '123' },
  search: { tab: 'settings' },
})
// → '/dashboard/users/123?tab=settings'

// Required search key (page)
AppRoutes.dashboard.users.list.build({ search: { page: 1 } })
// → '/dashboard/users?page=1'
AppRoutes.dashboard.users.list.build({ search: { page: 2, sort: 'asc', q: 'john' } })
// → '/dashboard/users?page=2&sort=asc&q=john'

// ❌ TypeScript compile errors — caught before runtime
AppRoutes.dashboard.users.detail.build()                        // params required
AppRoutes.dashboard.users.detail.build({ params: {} })          // userId required
AppRoutes.dashboard.users.list.build()                          // search.page required
AppRoutes.dashboard.users.list.build({ search: { page: '1' } }) // page must be number
```

---

#### React Router v7 wiring

Route `path` and metadata flow from the same source — no duplication.

```ts
import { createBrowserRouter } from 'react-router';

const router = createBrowserRouter([
  {
    path:    AppRoutes.auth.login.path,
    element: <LoginPage />,
  },
  {
    path:    AppRoutes.dashboard.root.path,
    element: <DashboardLayout />,
    handle: {
      breadcrumb: AppRoutes.dashboard.root.breadcrumb,
      title:      AppRoutes.dashboard.root.title,
    },
    children: [
      {
        path:    AppRoutes.dashboard.users.list.path,
        element: <UsersListPage />,
        handle: {
          permissions: AppRoutes.dashboard.users.list.permissions,
          breadcrumb:  AppRoutes.dashboard.users.list.breadcrumb,
        },
      },
      {
        path:    AppRoutes.dashboard.users.detail.path,
        element: <UserDetailPage />,
        handle:  { permissions: AppRoutes.dashboard.users.detail.permissions },
      },
    ],
  },
]);
```

---

#### Navigation

```ts
const navigate = useNavigate();
navigate(AppRoutes.dashboard.users.detail.build({ params: { userId: id } }));

// Link component
<Link to={AppRoutes.auth.login.build({ search: { redirect: location.pathname } })}>
  Log in
</Link>
```

---

#### `useTypedSearchParams`

```ts
useTypedSearchParams(route: ProcessedRoute<P, S>): {
  search:      Readonly<Partial<S>>;
  setSearch:   (update: Partial<S>) => void;
  clearSearch: () => void;
}
```

Wraps React Router's `useSearchParams` with the type declared on the route. Pass any processed route — TypeScript infers `S` automatically.

**`setSearch` merges** — it does not replace the full query string. Pass only the keys you want to change. Set a key to `undefined` to remove it from the URL.

```tsx
// Inside the /dashboard/users page component
const { search, setSearch, clearSearch } =
  useTypedSearchParams(AppRoutes.dashboard.users.list);

// search: Partial<{ page: number; sort?: 'asc' | 'desc'; q?: string }>

setSearch({ page: 2 })               // keeps sort, q — only updates page
setSearch({ page: 1, sort: 'asc' })  // updates page and sort — keeps q
setSearch({ q: undefined })          // removes q from the URL
clearSearch()                         // wipes all search params
```

> ⚠️ **Runtime coercion note:** React Router's `useSearchParams` returns all URL values as strings. If you declare `page: number`, `search.page` will be `"1"` (string) at runtime even though TypeScript types it as `number`. Coerce explicitly where needed: `Number(search.page ?? 1)`. This is a deliberate trade-off that avoids a runtime schema dependency.

---

#### `RouteMetadata` — full interface

```ts
export interface RouteMetadata {
  permissions?: string[];            // consumed via handle in React Router config
  breadcrumb?:  string;              // consumed via handle in React Router config
  title?:       string;              // consumed via handle in React Router config
  meta?:        Record<string, unknown>; // custom metadata (loader keys, feature flags…)
}
```

---

### `useAlertMessage(autoHideDuration?: number)`

```ts
const { alert, showAlert, hideAlert } = useAlertMessage(4000);
// alert: { message, type: 'success' | 'info' | 'error', isVisible }
showAlert('Saved!', 'success');
```

`autoHideDuration` defaults to `3000` ms. Pass `0` to disable auto-hide.

---

### `useAsyncState<T>(initialData?: T | null)`

Generic async state machine with status tracking and a `catchError`-style execute function.

```ts
const { isLoading, execute } = useAsyncState<Contact.WithCreatedBy>();
const [err, contact] = await execute(() => ContactsApis.create(formData), {
  onSuccess: () => toast.success('Created!'),
  onError:   (e) => toast.error(e.message),
});
```

**Status values:** `"idle" | "pending" | "success" | "error"`

---

### `useCallTimer(startedAt?: number | null)`

Elapsed time from a Unix timestamp, formatted as `"MM:SS"`, updated every second.

```tsx
const duration = useCallTimer(call.startedAt); // "02:45"
const duration = useCallTimer(null);            // "00:00"
```

---

### `useModal<T = unknown>()`

```ts
const modal = useModal<Contact.Base>();
modal.openCreateModal();      // data → null  (create mode)
modal.openEditModal(contact); // data → T     (edit mode)
// Discriminate: if (modal.data) { /* edit */ } else { /* create */ }
```

Full interface: `{ isOpen, data, isLoading, openCreateModal, openEditModal, setLoading, closeModal, setModal }`.

---

### `usePagination(initialPage?, initialLimit?)`

```ts
const { queryParams, onPaginationChange, resetPagination } = usePagination(1, 20);
const { list, pagination } = contactHooks.useList(queryParams);
// resetPagination() — call when a filter changes to go back to page 1
```

---

## End-to-End Workflow Example

```ts
// routes.ts
export const AppRoutes = createRouteContract({
  dashboard: {
    users: {
      list: defineRoute('/dashboard/users', {
        permissions: ['ADMIN'],
        breadcrumb:  'Users',
      }).search<{ page: number; sort?: 'asc' | 'desc' }>(),
      detail: defineRoute('/dashboard/users/:userId', {
        permissions: ['ADMIN'],
      }),
    },
  },
});
```

```ts
// contacts.hooks.ts
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  optimistic: {
    update: (cache, { _id, payload }) =>
      cache.map(item => item._id === _id ? { ...item, ...payload } : item),
    remove: (cache, id) => cache.filter(item => item._id !== id),
    create: (cache, { payload, tempId }) => [
      { ...payload, _id: tempId as Contact.Id },
      ...cache,
    ],
    onError: (error, op) => toast.error(`Failed to ${op.kind}: ${error.message}`),
  },
});
```

```tsx
// UsersListPage.tsx
export function UsersListPage() {
  const navigate = useNavigate();
  const { queryParams, onPaginationChange, resetPagination } = usePagination(1, 20);
  const { search, setSearch } = useTypedSearchParams(AppRoutes.dashboard.users.list);

  const { list, isLoading, isRefetching, isError, error, refetch, pagination } =
    contactHooks.useList({ ...queryParams, sort: search.sort });

  const { create, remove } = contactHooks.useMutations();
  const modal = useModal<Contact.Base>();

  const handleSave = async (data: Contact.Apis.CreatePayload) => {
    try {
      await create.mutateAsync(data)
      modal.closeModal()
      toast.success('Contact created!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  };

  if (isLoading) return <Skeleton />;
  if (isError)   return <ErrorState message={error?.message} onRetry={refetch} />;

  return (
    <>
      {isRefetching && <RefreshBadge />}

      <Toolbar>
        <SortSelect
          value={search.sort}
          onChange={(sort) => { setSearch({ sort }); resetPagination(); }}
        />
        <Button onClick={modal.openCreateModal}>+ New</Button>
      </Toolbar>

      {list.map(c => (
        <ContactRow
          key={c._id}
          contact={c}
          onView={() => navigate(AppRoutes.dashboard.users.detail.build({ params: { userId: c._id } }))}
          onDelete={() => remove.mutate(c._id)}
        />
      ))}

      <Pagination
        current={pagination.page}
        total={pagination.totalDocuments}
        onChange={onPaginationChange}
      />

      <ContactModal
        open={modal.isOpen}
        isSaving={create.isPending}
        onSubmit={handleSave}
        onClose={modal.closeModal}
      />
    </>
  );
}
```

---

## Contributing / Development

```bash
git clone https://github.com/shahtirthhh/void-snippets.git
cd void-snippets
pnpm install

pnpm dev            # watch mode — all packages
pnpm build          # full build
pnpm build:react    # react package only

# Versioning & publishing
pnpm --filter @void-snippets/react exec npm version minor
pnpm --filter @void-snippets/react publish --access public --no-git-checks
pnpm publish:all
```

---

## License

MIT © [shahtirthhh](https://github.com/shahtirthhh/void-snippets)
