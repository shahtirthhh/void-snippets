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
  - [BaseApiService](#baseapiservice)
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
| [`@void-snippets/react`](./packages/react) | `0.5.0` | TanStack Query v5 hook factory, Socket.IO hook factory, and general-purpose React hooks |

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
│   │       ├── types/
│   │       │   └── index.ts     # All shared interfaces + createDefaultAdapters()
│   │       └── utils/
│   │           └── catch-error.ts  # catchError() Go-style error handling
│   ├── client/                  # @void-snippets/client
│   │   └── src/
│   │       ├── configure.ts     # configure() / getConfiguredInstance()
│   │       ├── index.ts         # public barrel exports
│   │       ├── services/
│   │       │   ├── base-api.service.ts      # BaseApiService (abstract)
│   │       │   └── resource-api.service.ts  # ResourceService<…> (generic CRUD)
│   │       └── utils/
│   │           └── handle-api-error.ts  # handleApiError() normalizer
│   └── react/                   # @void-snippets/react
│       └── src/
│           ├── index.ts         # public barrel exports
│           ├── hooks/
│           │   ├── createResourceHooks.ts  # TanStack Query hook factory
│           │   ├── useAlertMessage.ts      # Alert / toast state
│           │   ├── useAsyncState.ts        # Generic async state machine
│           │   ├── useCallTimer.ts         # Elapsed-time formatter
│           │   ├── useModal.ts             # Modal state with data payload
│           │   └── usePagination.ts        # Pagination state manager
│           └── socket/
│               └── createSocketHooks.ts    # Socket.IO hook factory
├── package.json                 # Root scripts (build, publish, version)
├── pnpm-workspace.yaml          # pnpm workspace config
└── tsconfig.base.json           # Shared TypeScript compiler options
```

---

## Package Dependency Graph

```
@void-snippets/react
    ├── @void-snippets/core       (direct dep)
    ├── @void-snippets/client     (peer dep ≥0.1.0)
    ├── @tanstack/react-query     (^5.0.0)
    └── socket.io-client          (peer dep ≥4.6.0, optional)

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

For Socket.IO support, add the optional peer dependency:

```bash
pnpm add socket.io-client
```

Install only what you need:

```bash
# Non-React / Node.js projects
pnpm add @void-snippets/client axios

# Types and utilities only
pnpm add @void-snippets/core
```

**Peer / minimum requirements:**

| Peer | Minimum | Required for |
|---|---|---|
| `react` | `>=17.0.0` | All React hooks |
| `@void-snippets/client` | `>=0.1.0` | `createResourceHooks` |
| `axios` | `^1.6.0` | `@void-snippets/client` |
| `@tanstack/react-query` | `^5.0.0` | `createResourceHooks` |
| `socket.io-client` | `>=4.6.0` | `createSocketHooks` (optional) |
| TypeScript | `^5.4.0` | All packages |

---

## Build System

Each package uses [tsup](https://tsup.egoist.dev/) to produce dual CJS + ESM outputs with full declaration maps.

| Script (root) | Description |
|---|---|
| `pnpm build` | Build all packages in dependency order |
| `pnpm build:core` | Build `@void-snippets/core` only |
| `pnpm build:client` | Build `@void-snippets/client` only |
| `pnpm build:react` | Build `@void-snippets/react` only |
| `pnpm dev` | Watch mode for all packages |
| `pnpm publish:all` | Publish all packages to npm (public, no git checks) |
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
import type { VSId, VSPagination, VSQueryParams, VSDefaultPaginatedResponse,
              VSDefaultSingleResponse, VSListResult, VSAdapters } from '@void-snippets/core';

import { stringToId, catchError, createDefaultAdapters } from '@void-snippets/core';
```

---

### Branded ID Types

#### `VSId<K, T>`

```ts
export type VSId<K, T> = K & { __brand: T };
```

Creates a nominal / branded type from a primitive. Prevents accidental mixing of structurally identical but semantically different ID types at compile time.

```ts
type ContactId = VSId<string, 'Contact'>;
type UserId    = VSId<string, 'User'>;

declare const contactId: ContactId;
declare let   userId: UserId;

userId = contactId; // ❌ Type error — brands don't match
```

#### `stringToId<T>(id: string): T`

Casts a raw runtime `string` to a branded `VSId`. Use at system boundaries (URL params, API responses).

```ts
type ContactId = VSId<string, 'Contact'>;
const id = stringToId<ContactId>(params.contactId); // ContactId ✅
```

---

### Core Types Reference

#### `VSPagination`

```ts
export interface VSPagination {
  page:           number; // Current page (1-based)
  limit:          number; // Items per page
  totalPages:     number;
  totalDocuments: number;
}
```

#### `VSQueryParams`

```ts
export interface VSQueryParams {
  page?:  number;
  limit?: number;
  [key: string]: unknown; // Any additional filter / sort params
}
```

#### `VSDefaultPaginatedResponse<T>`

Default list response shape. Your API must match this to use zero-config adapters:

```json
{ "data": { "items": [...], "page": 1, "limit": 10, "totalPages": 5, "totalDocuments": 42 } }
```

#### `VSDefaultSingleResponse<T>`

Default single-item response shape: `{ "data": { ... } }`.

#### `VSListResult<TBase>`

```ts
export interface VSListResult<TBase> {
  items:      TBase[];
  pagination: VSPagination;
}
```

The normalised internal list result produced by the `fromList` adapter.

---

### Adapter System

#### `VSAdapters<TListRaw, TBase, TSingleRaw, TDetail>`

```ts
export interface VSAdapters<TListRaw, TBase, TSingleRaw, TDetail> {
  fromList:   (raw: TListRaw)   => VSListResult<TBase>;
  fromSingle: (raw: TSingleRaw) => TDetail;
}
```

#### `createDefaultAdapters<TBase, TDetail>()`

Returns pre-built adapters for the default response shapes. No configuration needed if your API matches.

---

### Utilities

#### `catchError<T>(promise: Promise<T>)`

Go-style error handling — wraps a Promise in a `[error, null] | [null, data]` tuple.

```ts
const [err, user] = await catchError(fetchUser(id));
if (err) { console.error(err.message); return; }
console.log(user.name); // user is T, not T | null
```

---

## Package: `@void-snippets/client`

Framework-agnostic HTTP resource service.

```ts
import { configure, BaseApiService, ResourceService, handleApiError } from '@void-snippets/client';
```

---

### Configuration

#### `configure(instance: AxiosInstance): void`

Registers an axios instance globally. Must be called once at your app entry point.

```ts
import axios from 'axios';
import { configure } from '@void-snippets/client';

configure(axios.create({
  baseURL: 'https://api.example.com',
  headers: { 'Content-Type': 'application/json' },
}));
```

---

### ResourceService

```ts
export class ResourceService<
  TId, TBase,
  TDetail    = TBase,
  TCreate    = Partial<TBase>,
  TUpdate    = Partial<TBase>,
  TListRaw   = VSDefaultPaginatedResponse<TBase>,
  TSingleRaw = VSDefaultSingleResponse<TDetail>,
> extends BaseApiService
```

Generic CRUD base class. All five methods normalise errors through `handleApiError`.

| Method | HTTP | Returns |
|---|---|---|
| `list(params?)` | `GET {endpoint}` | `Promise<TListRaw>` |
| `get(id)` | `GET {endpoint}/{id}` | `Promise<TSingleRaw>` |
| `create(payload)` | `POST {endpoint}` | `Promise<TSingleRaw>` |
| `update(id, payload)` | `PATCH {endpoint}/{id}` | `Promise<TSingleRaw>` |
| `delete(id)` | `DELETE {endpoint}/{id}` | `Promise<TSingleRaw>` |

#### Defining a Resource Service

```ts
// contacts/contacts.api.ts
import { ResourceService } from '@void-snippets/client';
import type { Contact } from './contacts.types';

export class ContactsApiService extends ResourceService<
  Contact.Id,
  Contact.Base,
  Contact.WithCreatedBy,
  Contact.Apis.CreatePayload,
  Contact.Apis.UpdatePayload
> {
  constructor() { super('/contacts'); }
}

export const ContactsApis = new ContactsApiService();
```

---

### Error Handling

#### `handleApiError(error: unknown): never`

Normalises axios and generic errors into a standard `Error`. Always throws.

| Error type | Behaviour |
|---|---|
| `AxiosError` with `response.data.message` | Throws `new Error(serverMessage)` |
| `AxiosError` without server message | Throws `new Error(error.message)` |
| `Error` (non-axios) | Re-throws as-is |
| Any other value | Throws `new Error("An unexpected error occurred.")` |

---

## Package: `@void-snippets/react`

TanStack Query v5 hooks factory, Socket.IO hooks factory, and five standalone React utility hooks.

```ts
import {
  createResourceHooks,
  createSocketHooks,
  useAlertMessage, useAsyncState, useCallTimer, useModal, usePagination,
} from '@void-snippets/react';

import type {
  VSUseListReturn, VSUseGetReturn,
  VSResourceHooksOptions, VSOptimisticHandlers, VSOptimisticOperation,
  VSSocketConnectionReturn,
  VSAlertVariant, VSAlertState,
  VSAsyncStatus, VSUseAsyncStateReturn,
  VSModalReturn, VSPaginationReturn,
} from '@void-snippets/react';
```

---

### Setup

```ts
// 1. Configure axios at app entry
import axios from 'axios';
import { configure } from '@void-snippets/client';
configure(axios.create({ baseURL: 'https://api.example.com' }));

// 2. Wrap app with QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
```

---

### `createResourceHooks` — Factory

Creates a set of four TanStack Query hooks scoped to a single resource. All type parameters are **fully inferred** from `apiService` — you never write generics at the call site.

#### `VSResourceHooksOptions`

```ts
export interface VSResourceHooksOptions<
  TListRaw, TBase, TSingleRaw, TDetail,
  TId = unknown, TUpdate = unknown, TCreate = unknown
> {
  adapters?:      VSAdapters<TListRaw, TBase, TSingleRaw, TDetail>;
  defaultParams?: VSQueryParams;  // default: { page: 1, limit: 10 }
  optimistic?:    VSOptimisticHandlers<TBase, TId, TUpdate, TCreate, TDetail>;
}
```

```ts
export const contactHooks = createResourceHooks('contacts', ContactsApis);
```

---

#### `useList(params?: VSQueryParams)`

**Return type: `VSUseListReturn<TBase>`**

```ts
export interface VSUseListReturn<TBase> {
  list:         TBase[];
  pagination:   VSPagination;
  isLoading:    boolean; // First fetch only — no cached data. Render full skeleton here.
  isFetching:   boolean; // Any fetch in progress. Use for a subtle progress indicator.
  isRefetching: boolean; // Background refetch with cached data. Use for a refresh badge.
  isError:      boolean;
  error:        Error | null;
  refetch:      () => Promise<unknown>; // Retry this query — use in error states.
  invalidate:   () => void;             // Bust the whole prefix.
}
```

> **`isLoading` vs `isFetching`** — `isLoading` is true only on the very first fetch (no cached data). It does NOT become true when cache is invalidated after a mutation — that produces `isRefetching: true`. Use `isLoading` for full-page spinners and `isRefetching` for a lightweight overlay on existing data.

**Cache key:** `[queryKeyPrefix, params]`

```tsx
const { list, isLoading, isRefetching, isError, error, pagination, refetch } =
  contactHooks.useList({ page: 1, limit: 20, search: 'john' });

if (isLoading)  return <Skeleton />;
if (isError)    return <ErrorState message={error?.message} onRetry={refetch} />;

return (
  <>
    {isRefetching && <RefreshBadge />}
    {list.map(c => <ContactCard key={c._id} contact={c} />)}
  </>
);
```

---

#### `useGet(id: TId, staleTime?: number)`

Query is **disabled** when `id` is `undefined`, `null`, or `""`.

**Return type: `VSUseGetReturn<TDetail>`**

```ts
export interface VSUseGetReturn<TDetail> {
  item:         TDetail | undefined;
  isLoading:    boolean;
  isFetching:   boolean;
  isRefetching: boolean;
  isError:      boolean;
  error:        Error | null;
  refetch:      () => Promise<unknown>;
}
```

**Cache key:** `[queryKeyPrefix, id]` — `staleTime` defaults to `30_000` ms.

---

#### `useMutations()`

```ts
useMutations(): {
  create: UseMutationResult<TDetail, Error, TCreate>;
  update: UseMutationResult<TDetail, Error, { _id: TId; payload: TUpdate }>;
  remove: UseMutationResult<TDetail, Error, TId>;
}
```

> `remove` not `delete` — `delete` is a reserved keyword in JavaScript.

All three mutations call `queryClient.invalidateQueries({ queryKey: [prefix] })` on settlement.

```tsx
const { create, update, remove } = contactHooks.useMutations();

// Always await for complex forms — keeps the modal open on error
const handleSave = async (data) => {
  try {
    await create.mutateAsync(data)
    modal.closeModal()        // only reaches here on API success
    toast.success('Created!')
  } catch (error) {
    toast.error(error.message) // modal still open, form data intact
  }
}
```

---

#### `useInfinite(params?: VSQueryParams)`

Wraps TanStack Query's `useInfiniteQuery`. **Cache key:** `[queryKeyPrefix, "INFINITE", params]`

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  contactHooks.useInfinite({ limit: 20 });

const all = data?.pages.flatMap(p => p.items) ?? [];
```

`getNextPageParam` returns `page + 1` while `page < totalPages`, and `undefined` on the last page.

---

### Custom API Adapters

Pass `adapters` when your API returns a different shape than the defaults:

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

Provide cache transform functions in `optimistic` to get instant UI feedback before the server responds. The library applies them to all active `useList`, `useInfinite`, and `useGet` caches simultaneously, maintains correct concurrent ordering via an `effectiveBase` stack, auto-rollbacks on error, and defers server invalidation until all in-flight mutations settle.

#### Configuration

```ts
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  optimistic: {
    // _id comes from mutation args — it is NOT in payload
    update: (cache, { _id, payload }) =>
      cache.map(item => item._id === _id ? { ...item, ...payload } : item),

    remove: (cache, id) =>
      cache.filter(item => item._id !== id),

    create: (cache, { payload, tempId }) => [
      { ...payload, _id: tempId as Contact.Id },
      ...cache,
    ],

    onError: (error, operation) => {
      toast.error(`Failed to ${operation.kind}: ${error.message}`)
    },

    onSuccess: (operation) => {
      if (operation.kind === 'create') analytics.track('contact_created')
    },
  },
});
```

#### `VSOptimisticHandlers`

```ts
export interface VSOptimisticHandlers<TBase, TId, TUpdate, TCreate, TDetail> {
  update?:       (cache: TBase[], args: { _id: TId; payload: TUpdate }) => TBase[];
  updateSingle?: (current: TDetail, payload: TUpdate) => TDetail;
  remove?:       (cache: TBase[], id: TId) => TBase[];
  create?:       (cache: TBase[], args: { payload: TCreate; tempId: string }) => TBase[];
  onError?:      (error: Error, operation: VSOptimisticOperation<TId, TCreate, TUpdate>) => void;
  onSuccess?:    (operation: VSOptimisticOperation<TId, TCreate, TUpdate>) => void;
}
```

#### `VSOptimisticOperation`

```ts
export type VSOptimisticOperation<TId, TCreate, TUpdate> =
  | { kind: 'create'; payload: TCreate; tempId: string }
  | { kind: 'update'; _id: TId; payload: TUpdate }
  | { kind: 'remove'; _id: TId }
```

#### Handler rules

| Handler | What it does | Affects |
|---|---|---|
| `update` | Transforms the matched item | `useList`, `useInfinite` (all pages), `useGet` (auto shallow-merge) |
| `updateSingle` | Overrides the `useGet` merge for deep structures | `useGet` only |
| `remove` | Filters the item out + auto-patches pagination | `useList`, `useInfinite`, `useGet` (staled) |
| `create` | Inserts the optimistic item + auto-patches pagination | `useList`, `useInfinite` (first page only) |
| `onError` | Fires after rollback — cache is consistent when called | — |
| `onSuccess` | Fires after `effectiveBase` advances for this operation | — |

> **Complex forms** — never close a modal before `await mutateAsync()` resolves when the form has many fields. The optimistic list update still fires instantly behind the open modal. If the API fails, the item disappears and the modal remains with all fields intact.

---

### `createSocketHooks` — Factory

Creates three type-safe Socket.IO hooks bound to a specific socket instance. Requires `socket.io-client ≥4.6.0`.

Call once at module level — the returned hooks close over the socket and both event-map generics, so **no type parameters are needed at call sites**.

#### Setup

**1. Define your event protocol (project-level, not the library's concern)**

```ts
// socket-protocols.d.ts
import type { Import } from '@/api/imports/imports.types';

declare global {
  interface IClientToServerEvents {
    'join-room':       (roomId: string) => void;
    'send-message':    (msg: { text: string; roomId: string }) => void;
    'update-profile':  (name: string, callback: (response: { status: 'ok' | 'error' }) => void) => void;
  }

  interface IServerToClientEvents {
    'new-message':      (data: TSocketResponseEnvelope<NewMessagePayload>) => void;
    'import:progress':  (data: TSocketResponseEnvelope<Import.ProgressEvent>) => void;
    'user-joined':      (userId: string) => void;
    error:              (code: number, msg: string) => void;
  }
}
```

**2. Create the socket instance and the hooks (written once, exported everywhere)**

```ts
// services/socket-hooks.ts
import { createSocketHooks } from '@void-snippets/react';
import { io } from 'socket.io-client';

// You own the socket — configure reconnection, auth, transports here
const socket = io(import.meta.env.VITE_SOCKET_HOST, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

export const { useSocketEmit, useSocketListener, useSocketConnection } =
  createSocketHooks<IClientToServerEvents, IServerToClientEvents>(socket);
```

---

#### `useSocketEmit()`

Returns two functions for type-safe event emission. Both functions are stable references (no re-creation on render).

```ts
useSocketEmit(): {
  emit:        <K extends keyof TClientEvents>(event: K, ...args: PayloadArgs<K>) => void;
  emitWithAck: <K extends AckEventKeys>(event: K, ...args: PayloadArgs<K>) => Promise<AckResponse<K>>;
}
```

**`emit(event, ...args): void`**

Fire-and-forget. Throws synchronously if the socket is not connected. Callable on any event regardless of its signature — TypeScript strips the ACK callback from the args so you never pass one manually.

```tsx
const { emit } = useSocketEmit();

emit('join-room', roomId);
// TypeScript knows args is [string] — no callback expected

emit('send-message', { text: 'Hello', roomId });
// TypeScript knows args is [{ text: string; roomId: string }]
```

**`emitWithAck(event, ...args): Promise<AckResponse>`**

Emits and returns a `Promise` that resolves with the server's acknowledgement response. TypeScript will **error at compile time** if called on an event whose type has no trailing callback — the constraint is enforced statically, not at runtime.

Returns a rejected `Promise` if the socket is not connected.

```tsx
const { emitWithAck } = useSocketEmit();

const result = await emitWithAck('update-profile', name);
// result is inferred as { status: 'ok' | 'error' }

if (result.status === 'ok') {
  toast.success('Profile updated!')
}

// ❌ TypeScript error — 'join-room' has no ACK callback in its type
const bad = await emitWithAck('join-room', roomId);
```

Requires `socket.io-client ≥4.6.0` (uses the native `socket.emitWithAck` internally).

---

#### `useSocketListener(event, handler, options?)`

Subscribes to a server event for the lifetime of the calling component.

```ts
function useSocketListener<K extends keyof TServerEvents>(
  event:    K,
  handler:  TServerEvents[K],
  options?: { enabled?: boolean },
): void
```

**Stale closure safety** — a ref pattern ensures the latest version of `handler` is always called without re-registering the listener. Inline arrow functions are safe; no `useCallback` required at the call site.

**`options.enabled`** (default `true`) — when `false`, the listener is not attached. Flip it dynamically to conditionally subscribe without unmounting the component.

```tsx
// Basic usage — always active
useSocketListener('new-message', (data) => {
  setMessages(prev => [...prev, data]);
});

// Handler with access to latest closure state — no useCallback needed
useSocketListener('import:progress', (data) => {
  setProgress(data.percent);   // always reads the latest setter
});

// Conditional — only listen after joining a room
useSocketListener('user-joined', (userId) => {
  setParticipants(prev => [...prev, userId]);
}, { enabled: isConnected && !!activeRoomId });
```

---

#### `useSocketConnection()`

Reactively tracks socket connection state and exposes connect/disconnect controls. Safe to call from multiple components simultaneously — each instance independently subscribes to the same socket events.

```ts
useSocketConnection(): VSSocketConnectionReturn
```

**`VSSocketConnectionReturn`**

```ts
export interface VSSocketConnectionReturn {
  /** True when the socket has an active, confirmed connection. */
  isConnected:  boolean;

  /**
   * True while a connection or reconnection attempt is in progress.
   * Resets to false when `connect` or `connect_error` fires.
   */
  isConnecting: boolean;

  /** The socket ID assigned by the server. Undefined when disconnected. */
  socketId:     string | undefined;

  /** The error from the last failed connection attempt. Null before any attempt or after success. */
  error:        Error | null;

  /** Initiates a connection. No-op if already connected. */
  connect:      () => void;

  /** Gracefully closes the connection and stops reconnection attempts. */
  disconnect:   () => void;
}
```

**Events tracked internally:**

| Source | Event | Effect on state |
|---|---|---|
| `socket` | `connect` | `isConnected → true`, `isConnecting → false`, `socketId` updated |
| `socket` | `disconnect` | `isConnected → false`, `isConnecting → false`, `socketId → undefined` |
| `socket` | `connect_error` | `isConnected → false`, `isConnecting → false`, `error` set |
| `socket.io` (Manager) | `reconnect_attempt` | `isConnecting → true` |
| `socket.io` (Manager) | `reconnect_failed` | `isConnecting → false`, `error` set |

All five listeners are removed on component unmount.

```tsx
function AppShell() {
  const { connect, disconnect, isConnected, isConnecting, error, socketId } =
    useSocketConnection();

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  if (isConnecting) return <Banner>Connecting to server…</Banner>;
  if (error)        return <Banner type="error">Connection failed: {error.message}</Banner>;

  return (
    <div>
      {isConnected && <StatusDot green label={`Connected (${socketId})`} />}
      <YourApp />
    </div>
  );
}
```

---

#### Full Socket.IO usage example

```tsx
// ChatRoom.tsx
import { useSocketEmit, useSocketListener, useSocketConnection }
  from '@/services/socket-hooks';

function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);

  const { isConnected, isConnecting, error, connect, disconnect } =
    useSocketConnection();

  const { emit, emitWithAck } = useSocketEmit();

  // Connect when the component mounts
  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  // Join the room once connected
  useEffect(() => {
    if (!isConnected) return;
    emit('join-room', roomId);
  }, [isConnected, roomId]);

  // Listen for incoming messages — always active while mounted
  useSocketListener('new-message', (data) => {
    setMessages(prev => [...prev, data.payload]);
  });

  // Only listen for participant events when inside a room
  useSocketListener('user-joined', (userId) => {
    setParticipants(prev => [...prev, userId]);
  }, { enabled: isConnected });

  const handleSend = async (text: string) => {
    emit('send-message', { text, roomId });
  };

  const handleRenameProfile = async (name: string) => {
    // TypeScript infers result: { status: 'ok' | 'error' }
    const result = await emitWithAck('update-profile', name);
    if (result.status === 'ok') toast.success('Name updated!');
    else toast.error('Failed to update name.');
  };

  if (isConnecting) return <Spinner label="Connecting…" />;
  if (error)        return <ErrorState message={error.message} onRetry={connect} />;

  return (
    <div>
      <MessageList messages={messages} />
      <ParticipantsList participants={participants} />
      <MessageInput onSend={handleSend} disabled={!isConnected} />
      <button onClick={() => handleRenameProfile('New Name')}>
        Update Profile
      </button>
    </div>
  );
}
```

---

#### Migrating from a global socket pattern

If you currently use module-level event hooks (`socket.on` / `socket.emit` called directly), the migration requires only one new file:

```ts
// Before — direct socket imports scattered across files
import { socket } from '@/services/socket';
socket.on('new-message', handler);
socket.emit('join-room', roomId);

// After — one factory file replaces all direct usage
// services/socket-hooks.ts
import { createSocketHooks } from '@void-snippets/react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_HOST, { autoConnect: false });

export const { useSocketEmit, useSocketListener, useSocketConnection } =
  createSocketHooks<IClientToServerEvents, IServerToClientEvents>(socket);

// In components — import the hooks, not the socket
import { useSocketEmit, useSocketListener } from '@/services/socket-hooks';
```

The raw `socket` instance can still be exported from the factory file if you need direct access in non-React code (e.g., middleware, sagas).

---

### `useAlertMessage(autoHideDuration?: number)`

Manages alert / toast notification state.

```ts
function useAlertMessage(autoHideDuration?: number): {
  alert:     VSAlertState;   // { message, type, isVisible }
  showAlert: (message: ReactNode | string, type?: VSAlertVariant) => void;
  hideAlert: () => void;
}
```

**`VSAlertVariant`:** `"success" | "info" | "error"` — `autoHideDuration` defaults to `3000` ms, pass `0` to disable.

```tsx
const { alert, showAlert, hideAlert } = useAlertMessage(4000);
showAlert('Saved!', 'success');
{alert.isVisible && <Alert variant={alert.type} onClose={hideAlert}>{alert.message}</Alert>}
```

---

### `useAsyncState<T>(initialData?: T | null)`

Generic async state machine.

**`VSAsyncStatus`:** `"idle" | "pending" | "success" | "error"`

```ts
export interface VSUseAsyncStateReturn<T> {
  data:      T | null;
  status:    VSAsyncStatus;
  error:     Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError:   boolean;
  setData:   (data: T | null) => void;
  setError:  (error: Error | null) => void;
  reset:     () => void;
  execute:   (
    asyncFn: () => Promise<T>,
    options?: { onSuccess?: (data: T) => void; onError?: (error: Error) => void }
  ) => Promise<[Error, null] | [null, T]>;
}
```

`execute` manages all state transitions and returns a `catchError`-style tuple.

```tsx
const { isLoading, execute } = useAsyncState<Contact.WithCreatedBy>();
const [err, contact] = await execute(() => ContactsApis.create(formData), {
  onSuccess: () => showAlert('Created!', 'success'),
  onError:   (e) => showAlert(e.message, 'error'),
});
```

---

### `useCallTimer(startedAt?: number | null)`

Elapsed time from a Unix timestamp, updated every second, formatted as `"MM:SS"`. Cleans up interval on unmount.

```tsx
const duration = useCallTimer(call.startedAt); // "02:45"
const duration = useCallTimer(null);            // "00:00"
```

---

### `useModal<T = unknown>()`

Modal open/close state, data payload, and loading flag for create and edit patterns.

```ts
export interface VSModalReturn<T> {
  isOpen:          boolean;
  data:            T | null; // null = create mode, T = edit mode
  isLoading:       boolean;
  openCreateModal: () => void;
  openEditModal:   (editData: T) => void;
  setLoading:      (loading: boolean) => void;
  closeModal:      () => void;
  setModal:        (open: boolean, editData?: T | null) => void;
}
```

```tsx
const modal = useModal<Contact.Base>();
modal.openCreateModal();      // data → null (create mode)
modal.openEditModal(contact); // data → contact (edit mode)
if (modal.data) { /* edit */ } else { /* create */ }
```

---

### `usePagination(initialPage?: number, initialLimit?: number)`

Pagination state with a `queryParams` object ready for `useList`.

```ts
export interface VSPaginationReturn {
  page:               number;
  limit:              number;
  queryParams:        VSQueryParams;  // { page, limit } — pass directly to useList()
  onPaginationChange: (newPage: number, newLimit: number) => void;
  resetPagination:    () => void;     // resets to page 1 — call when filters change
  setPage:            (page: number) => void;
  setLimit:           (limit: number) => void;
}
```

```tsx
const { queryParams, onPaginationChange, resetPagination } = usePagination(1, 20);
const { list, pagination } = contactHooks.useList(queryParams);
```

---

## End-to-End Workflow Example

```ts
// contacts/contacts.hooks.ts
import { createResourceHooks } from '@void-snippets/react';
import { ContactsApis } from './contacts.api';

export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  optimistic: {
    update: (cache, { _id, payload }) =>
      cache.map(item => item._id === _id ? { ...item, ...payload } : item),
    remove: (cache, id) =>
      cache.filter(item => item._id !== id),
    create: (cache, { payload, tempId }) => [
      { ...payload, _id: tempId as Contact.Id, createdAt: new Date().toISOString() },
      ...cache,
    ],
    onError: (error, operation) => {
      console.error(`[contacts] optimistic ${operation.kind} failed:`, error.message)
    },
  },
});
```

```tsx
// contacts/ContactsPage.tsx
export function ContactsPage() {
  const { queryParams, onPaginationChange } = usePagination(1, 20);

  const { list, isLoading, isRefetching, isError, error, refetch, pagination } =
    contactHooks.useList(queryParams);

  const { create, update, remove } = contactHooks.useMutations();
  const modal   = useModal<Contact.Base>();
  const { alert, showAlert, hideAlert } = useAlertMessage(4000);

  const handleSubmit = async (
    formData: Contact.Apis.CreatePayload | Contact.Apis.UpdatePayload,
  ) => {
    try {
      if (modal.data) {
        await update.mutateAsync({ _id: modal.data._id, payload: formData as Contact.Apis.UpdatePayload })
      } else {
        await create.mutateAsync(formData as Contact.Apis.CreatePayload)
      }
      modal.closeModal()
      showAlert(modal.data ? 'Contact updated!' : 'Contact created!', 'success')
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Something went wrong', 'error')
    }
  }

  if (isLoading) return <Spinner />;
  if (isError)   return <ErrorState message={error?.message} onRetry={refetch} />;

  return (
    <>
      {alert.isVisible && <Alert type={alert.type} onClose={hideAlert}>{alert.message}</Alert>}
      <button onClick={modal.openCreateModal}>+ New Contact</button>
      {isRefetching && <RefreshBadge />}
      {list.map(c => (
        <ContactCard
          key={c._id}
          contact={c}
          onEdit={() => modal.openEditModal(c)}
          onDelete={() => remove.mutate(c._id)}
        />
      ))}
      <Pagination
        current={pagination.page}
        total={pagination.totalDocuments}
        pageSize={pagination.limit}
        onChange={onPaginationChange}
      />
      <ContactModal
        open={modal.isOpen}
        data={modal.data}
        isSaving={create.isPending || update.isPending}
        onSubmit={handleSubmit}
        onClose={modal.closeModal}
      />
    </>
  );
}
```

---

## Contributing / Development

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8

### Setup

```bash
git clone https://github.com/shahtirthhh/void-snippets.git
cd void-snippets
pnpm install
```

### Development

```bash
pnpm dev            # all packages in parallel watch mode
pnpm build:react    # rebuild react only after changes
```

### Build

```bash
pnpm build          # all packages in dependency order
```

### Versioning & Publishing

```bash
# Bump only the changed package
pnpm --filter @void-snippets/react exec npm version minor

# Publish changed package
pnpm --filter @void-snippets/react publish --access public --no-git-checks

# Publish all packages
pnpm publish:all
```

---

## License

MIT © [shahtirthhh](https://github.com/shahtirthhh/void-snippets)
