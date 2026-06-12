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
| [`@void-snippets/react`](./packages/react) | `0.3.0` | TanStack Query v5 hook factory + general-purpose React hooks |

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
│           └── hooks/
│               ├── createResourceHooks.ts  # TanStack Query hook factory
│               ├── useAlertMessage.ts      # Alert / toast state
│               ├── useAsyncState.ts        # Generic async state machine
│               ├── useCallTimer.ts         # Elapsed-time formatter
│               ├── useModal.ts             # Modal state with data payload
│               └── usePagination.ts        # Pagination state manager
├── package.json                 # Root scripts (build, publish, version)
├── pnpm-workspace.yaml          # pnpm workspace config
└── tsconfig.base.json           # Shared TypeScript compiler options
```

---

## Package Dependency Graph

```
@void-snippets/react
    ├── @void-snippets/core      (direct dep)
    ├── @void-snippets/client    (peer dep ≥0.1.0)
    └── @tanstack/react-query    (^5.0.0)

@void-snippets/client
    └── @void-snippets/core      (workspace:*)

@void-snippets/core
    └── (no runtime dependencies)
```

---

## Installation

Install the full stack in a React project:

```bash
pnpm add @void-snippets/core @void-snippets/client @void-snippets/react
# also requires peer dependencies:
pnpm add axios @tanstack/react-query
```

Install only what you need:

```bash
# Non-React / Node.js projects
pnpm add @void-snippets/client axios

# Types and utilities only
pnpm add @void-snippets/core

# npm / yarn equivalents work the same
npm install @void-snippets/react @void-snippets/client @tanstack/react-query axios
yarn add @void-snippets/react @void-snippets/client @tanstack/react-query axios
```

**Peer / minimum requirements:**

| Peer | Minimum |
|---|---|
| `react` | `>=17.0.0` |
| `@void-snippets/client` | `>=0.1.0` |
| `axios` | `^1.6.0` |
| `@tanstack/react-query` | `^5.0.0` |
| TypeScript | `^5.4.0` |

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

Each package's `dist/` directory exposes three entry points via `exports`:

```json
{
  "main":   "./dist/index.js",    // CJS
  "module": "./dist/index.mjs",   // ESM
  "types":  "./dist/index.d.ts"   // TypeScript declarations
}
```

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

| Option | Effect |
|---|---|
| `"strict": true` | Enables all strict type-checks (null checks, implicit any, etc.) |
| `"declaration": true` | Emits `.d.ts` files for consumers |
| `"declarationMap": true` | Emits `.d.ts.map` for source-map-aware IDE navigation |
| `"moduleResolution": "Bundler"` | Matches Vite/tsup resolution semantics |

---

## Package: `@void-snippets/core`

Shared foundation — zero runtime dependencies.

**Exports:**

```ts
import type { VSId, VSPagination, VSQueryParams, VSDefaultPaginatedData,
              VSDefaultPaginatedResponse, VSDefaultSingleResponse,
              VSListResult, VSAdapters } from '@void-snippets/core';

import { stringToId, catchError, createDefaultAdapters } from '@void-snippets/core';
```

---

### Branded ID Types

#### `VSId<K, T>`

```ts
export type VSId<K, T> = K & { __brand: T };
```

Creates a **nominal / branded type** from a primitive. Prevents accidental mixing of structurally identical but semantically different ID types at compile time.

| Type Parameter | Description |
|---|---|
| `K` | The underlying primitive type — usually `string` |
| `T` | A unique brand tag (use a string literal, e.g. `'Contact'`) |

```ts
import type { VSId } from '@void-snippets/core';

type ContactId = VSId<string, 'Contact'>;
type UserId    = VSId<string, 'User'>;

declare const contactId: ContactId;
declare let   userId: UserId;

userId = contactId;
// ❌ Type error — "Type 'ContactId' is not assignable to type 'UserId'"
// Even though both are strings at runtime, TypeScript blocks the assignment.
```

> **Why this matters:** Route params, query strings, and API responses all hand you raw `string`s. Branding forces you to explicitly cast at the boundary (using `stringToId`) and ensures compiler errors if you pass, e.g., a `UserId` where a `ContactId` is expected.

---

#### `stringToId<T>(id: string): T`

```ts
export const stringToId = <T extends VSId<string, unknown>>(id: string): T =>
  id as unknown as T;
```

Casts a raw runtime `string` to a branded `VSId` type. Use at system boundaries where you receive untyped strings (URL params, `localStorage`, raw API payloads).

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | The raw string to cast |

**Returns:** `T` — the branded ID type you specify.

```ts
import type { VSId } from '@void-snippets/core';
import { stringToId } from '@void-snippets/core';

type ContactId = VSId<string, 'Contact'>;

// From a URL param (e.g. React Router)
const raw = params.contactId; // string
const id  = stringToId<ContactId>(raw); // ContactId ✅
```

---

### Core Types Reference

#### `VSPagination`

```ts
export interface VSPagination {
  page:           number;  // Current page (1-based)
  limit:          number;  // Items per page
  totalPages:     number;  // Total number of pages
  totalDocuments: number;  // Total record count across all pages
}
```

Represents pagination metadata returned by the server and surfaced through `useList`.

---

#### `VSQueryParams`

```ts
export interface VSQueryParams {
  page?:  number;              // Page to fetch (optional)
  limit?: number;              // Items per page (optional)
  [key: string]: unknown;      // Any additional query params (filters, sorts, etc.)
}
```

An open-ended query param bag passed to `ResourceService.list()` and the `useList` / `useInfinite` hooks. The index signature allows arbitrary extra fields for filtering and sorting.

---

#### `VSDefaultPaginatedData<T>`

```ts
export interface VSDefaultPaginatedData<T> {
  items:          T[];
  page:           number;
  limit:          number;
  totalPages:     number;
  totalDocuments: number;
}
```

The shape of the `data` field inside a paginated API response when using the default (zero-config) adapter.

---

#### `VSDefaultPaginatedResponse<T>`

```ts
export interface VSDefaultPaginatedResponse<T> {
  data: VSDefaultPaginatedData<T>;
}
```

The expected top-level list response shape when using out-of-the-box adapters. Your API must return:

```json
{
  "data": {
    "items": [...],
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "totalDocuments": 42
  }
}
```

---

#### `VSDefaultSingleResponse<T>`

```ts
export interface VSDefaultSingleResponse<T> {
  data: T;
}
```

The expected top-level single-item response shape. Your API must return:

```json
{ "data": { "_id": "...", "name": "..." } }
```

---

#### `VSListResult<TBase>`

```ts
export interface VSListResult<TBase> {
  items:      TBase[];
  pagination: VSPagination;
}
```

The normalised internal list result produced by the `fromList` adapter after transforming any raw API response. This is the shape that `useList` and `useInfinite` work with internally.

---

### Adapter System

#### `VSAdapters<TListRaw, TBase, TSingleRaw, TDetail>`

```ts
export interface VSAdapters<TListRaw, TBase, TSingleRaw, TDetail> {
  fromList:   (raw: TListRaw)   => VSListResult<TBase>;
  fromSingle: (raw: TSingleRaw) => TDetail;
}
```

The adapter contract. Implement both methods to translate any API response shape into the library's internal format.

| Method | Input | Output | Description |
|---|---|---|---|
| `fromList` | `TListRaw` | `VSListResult<TBase>` | Transforms a raw list response into `{ items, pagination }` |
| `fromSingle` | `TSingleRaw` | `TDetail` | Extracts the item from a raw single-item response |

---

#### `createDefaultAdapters<TBase, TDetail>()`

```ts
export function createDefaultAdapters<TBase, TDetail>(): VSAdapters<
  VSDefaultPaginatedResponse<TBase>,
  TBase,
  VSDefaultSingleResponse<TDetail>,
  TDetail
>
```

Factory that returns pre-built adapters matching the library's default response shapes. **No configuration needed** if your API follows the default shapes.

**Returns:** `VSAdapters` with:
- `fromList` — reads `raw.data.items`, `raw.data.page`, `raw.data.limit`, `raw.data.totalPages`, `raw.data.totalDocuments`
- `fromSingle` — returns `raw.data`

```ts
import { createDefaultAdapters } from '@void-snippets/core';

const adapters = createDefaultAdapters<User, UserDetail>();
// adapters.fromList(rawApiResponse) → VSListResult<User>
// adapters.fromSingle(rawApiResponse) → UserDetail
```

---

### Utilities

#### `catchError<T>(promise: Promise<T>)`

```ts
export async function catchError<T>(
  promise: Promise<T>
): Promise<[Error, null] | [null, T]>
```

Go-style error handling for TypeScript. Wraps a Promise in a `[error, null] | [null, data]` tuple — eliminates nested `try/catch` at call sites.

| Parameter | Type | Description |
|---|---|---|
| `promise` | `Promise<T>` | Any promise to wrap |

**Returns:** `Promise<[Error, null] | [null, T]>`

- On success: `[null, T]` — `T` is the resolved value, fully typed.
- On failure: `[Error, null]` — non-`Error` rejections are coerced via `new Error(String(rejection))`.

```ts
import { catchError } from '@void-snippets/core';

const [err, user] = await catchError(fetchUser(id));
if (err) {
  console.error(err.message);
  return;
}
// TypeScript narrows: user is T here, not T | null
console.log(user.name);
```

> **Used internally** by `useAsyncState.execute()` in `@void-snippets/react`.

---

## Package: `@void-snippets/client`

Framework-agnostic HTTP resource service. Works in React, Vue, Node.js, or any TypeScript environment.

**Exports:**

```ts
import { configure, BaseApiService, ResourceService, handleApiError }
  from '@void-snippets/client';
```

---

### Configuration

#### `configure(instance: AxiosInstance): void`

Registers an axios instance globally. **Must be called once** at your application's entry point before any `ResourceService` method is invoked.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `AxiosInstance` | A configured axios instance |

**Returns:** `void`

**Throws:** Nothing. Throws deferred until the first HTTP call if not called.

```ts
// src/main.ts  (or src/index.ts)
import axios from 'axios';
import { configure } from '@void-snippets/client';

const axiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  headers: { 'Content-Type': 'application/json' },
});

// Attach interceptors for auth, logging, etc.
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

configure(axiosInstance); // ← single call, globally registered
```

> **Important:** `configure()` stores the instance in module-level state (`_instance`). The axios instance is lazily accessed at request time, so service classes can be instantiated (e.g., `new ContactsApiService()`) before `configure()` is called — as long as `configure()` is called before the first actual HTTP request.

#### `getConfiguredInstance(): AxiosInstance` _(internal)_

Used internally by `BaseApiService`. Not part of the public API. Throws a descriptive `Error` if called before `configure()`:

```
[@void-snippets/client] No axios instance configured.
Call configure(axiosInstance) once at your app entry point before using any resource service.
```

---

### BaseApiService

```ts
export abstract class BaseApiService {
  protected readonly endpoint: string;
  protected get http(): AxiosInstance;
  protected getFullUrl(path: string): string;
}
```

Abstract base class for all resource services. Extend `ResourceService` (which extends this) rather than `BaseApiService` directly.

| Member | Type | Visibility | Description |
|---|---|---|---|
| `endpoint` | `string` | `protected readonly` | The API path prefix passed to `constructor` (e.g. `'/contacts'`) |
| `http` | `AxiosInstance` | `protected` getter | Lazily returns the globally configured axios instance |
| `getFullUrl(path)` | `(string) => string` | `protected` | Concatenates `endpoint + path` |

---

### ResourceService

```ts
export class ResourceService<
  TId,
  TBase,
  TDetail  = TBase,
  TCreate  = Partial<TBase>,
  TUpdate  = Partial<TBase>,
  TListRaw = VSDefaultPaginatedResponse<TBase>,
  TSingleRaw = VSDefaultSingleResponse<TDetail>,
> extends BaseApiService
```

Generic CRUD base class. Extend it per API resource with strongly-typed generics.

#### Type Parameters

| Parameter | Default | Description |
|---|---|---|
| `TId` | _(required)_ | The resource identifier type — typically `string` or a branded `VSId` |
| `TBase` | _(required)_ | The entity shape returned in list responses |
| `TDetail` | `TBase` | The detailed entity shape returned in single-item responses (can differ from `TBase`) |
| `TCreate` | `Partial<TBase>` | The payload shape for create operations |
| `TUpdate` | `Partial<TBase>` | The payload shape for update operations |
| `TListRaw` | `VSDefaultPaginatedResponse<TBase>` | Raw response type from the list endpoint |
| `TSingleRaw` | `VSDefaultSingleResponse<TDetail>` | Raw response type from single-item endpoints |

> **Note:** `__types` is a `declare readonly` phantom property on `ResourceService`. It is never present at runtime but allows `createResourceHooks` to infer all type parameters from a service instance without requiring explicit generics at the call site.

#### Methods

##### `list(params?: VSQueryParams): Promise<TListRaw>`

Sends `GET {endpoint}` with `params` as query string.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `params` | `VSQueryParams` | No | Query params: `page`, `limit`, plus any custom filters |

**Returns:** `Promise<TListRaw>` — the raw API list response (before adapter transformation).

```ts
const raw = await ContactsApis.list({ page: 2, limit: 20, search: 'john' });
```

---

##### `get(id: TId): Promise<TSingleRaw>`

Sends `GET {endpoint}/{id}`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `TId` | Yes | The resource identifier |

**Returns:** `Promise<TSingleRaw>` — the raw API single-item response.

```ts
const raw = await ContactsApis.get(contactId);
```

---

##### `create(payload: TCreate): Promise<TSingleRaw>`

Sends `POST {endpoint}` with `payload` as the request body.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `payload` | `TCreate` | Yes | The create payload |

**Returns:** `Promise<TSingleRaw>` — the newly created item (raw).

```ts
const raw = await ContactsApis.create({ name: 'John Doe', email: 'john@example.com' });
```

---

##### `update(id: TId, payload: TUpdate): Promise<TSingleRaw>`

Sends `PATCH {endpoint}/{id}` with `payload` as the request body.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `TId` | Yes | The resource identifier |
| `payload` | `TUpdate` | Yes | Fields to update (partial) |

**Returns:** `Promise<TSingleRaw>` — the updated item (raw).

```ts
const raw = await ContactsApis.update(contactId, { name: 'Jane Doe' });
```

---

##### `delete(id: TId): Promise<TSingleRaw>`

Sends `DELETE {endpoint}/{id}`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `TId` | Yes | The resource identifier |

**Returns:** `Promise<TSingleRaw>` — the deleted item or server confirmation (raw).

```ts
const raw = await ContactsApis.delete(contactId);
```

---

#### Defining a Resource Service

```ts
// contacts/contacts.types.ts
import type { VSId } from '@void-snippets/core';

export namespace Contact {
  export type Id = VSId<string, 'Contact'>;

  export interface Base {
    _id:   Id;
    name:  string;
    email: string;
  }

  export interface WithCreatedBy extends Base {
    createdBy: { _id: string; name: string };
    createdAt: string;
  }

  export namespace Apis {
    export interface CreatePayload { name: string; email: string; }
    export interface UpdatePayload { name?: string; email?: string; }
  }
}

// contacts/contacts.api.ts
import { ResourceService } from '@void-snippets/client';
import type { Contact } from './contacts.types';

export class ContactsApiService extends ResourceService<
  Contact.Id,                    // TId
  Contact.Base,                  // TBase
  Contact.WithCreatedBy,         // TDetail
  Contact.Apis.CreatePayload,    // TCreate
  Contact.Apis.UpdatePayload     // TUpdate
  // TListRaw and TSingleRaw use defaults → no need to specify
> {
  constructor() {
    super('/contacts');
  }
}

export const ContactsApis = new ContactsApiService();
```

---

### Error Handling

#### `handleApiError(error: unknown): never`

Normalises axios errors and generic `Error` objects into a standard `Error`. **Always throws** — the return type is `never`.

| Error type | Behaviour |
|---|---|
| `AxiosError` with a `response.data.message` | Throws `new Error(serverMessage)` |
| `AxiosError` without a server message | Throws `new Error(error.message)` |
| `Error` (non-axios) | Re-throws as-is |
| Any other value | Throws `new Error("An unexpected error occurred.")` |

Used internally inside every `ResourceService` method. You typically don't call this directly, but it's exported for custom service methods:

```ts
import { handleApiError, BaseApiService } from '@void-snippets/client';

class ContactsApiService extends ResourceService<...> {
  async bulkDelete(ids: Contact.Id[]): Promise<void> {
    try {
      await this.http.post(this.getFullUrl('/bulk-delete'), { ids });
    } catch (error) {
      handleApiError(error); // normalises and throws
    }
  }
}
```

---

## Package: `@void-snippets/react`

TanStack Query v5 hooks factory plus five standalone React utility hooks.

**Exports:**

```ts
import { createResourceHooks } from '@void-snippets/react';
import { useAlertMessage }     from '@void-snippets/react';
import { useAsyncState }       from '@void-snippets/react';
import { useCallTimer }        from '@void-snippets/react';
import { useModal }            from '@void-snippets/react';
import { usePagination }       from '@void-snippets/react';

// Re-exported types
import type {
  VSUseListReturn, VSUseGetReturn,
  VSResourceHooksOptions,
  VSAlertVariant, VSAlertState,
  VSAsyncStatus, VSUseAsyncStateReturn,
  VSModalReturn,
  VSPaginationReturn,
} from '@void-snippets/react';
```

---

### Setup

#### 1. Configure axios (app entry point)

```ts
import axios from 'axios';
import { configure } from '@void-snippets/client';

configure(axios.create({ baseURL: 'https://api.example.com' }));
```

#### 2. Wrap your app with `QueryClientProvider`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

---

### `createResourceHooks` — Factory

```ts
function createResourceHooks<K extends string, S extends WithResourceTypes>(
  queryKeyPrefix: K,
  apiService:     S,
  options?:       VSResourceHooksOptions<ListRaw<S>, Base<S>, SingleRaw<S>, Detail<S>>
): {
  useList:      (params?: VSQueryParams) => VSUseListReturn<Base<S>>;
  useGet:       (id: Id<S>, staleTime?: number) => VSUseGetReturn<Detail<S>>;
  useMutations: () => { create, update, remove };
  useInfinite:  (params?: VSQueryParams) => UseInfiniteQueryResult<...>;
}
```

Creates a set of four TanStack Query hooks scoped to a single resource. All type parameters are **fully inferred** from `apiService` — you never write generics at the call site.

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `queryKeyPrefix` | `string` | Yes | TanStack Query cache key prefix (e.g. `"contacts"`). Scopes the cache and drives auto-invalidation on mutations. |
| `apiService` | `S extends WithResourceTypes` | Yes | An instance of `ResourceService` (or a subclass) |
| `options` | `VSResourceHooksOptions` | No | Optional adapters and default query params |

#### `VSResourceHooksOptions<TListRaw, TBase, TSingleRaw, TDetail>`

```ts
export interface VSResourceHooksOptions<TListRaw, TBase, TSingleRaw, TDetail> {
  adapters?:      VSAdapters<TListRaw, TBase, TSingleRaw, TDetail>;
  defaultParams?: VSQueryParams;
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `adapters` | `VSAdapters<…>` | `createDefaultAdapters()` | Custom adapter pair for non-standard API shapes |
| `defaultParams` | `VSQueryParams` | `{ page: 1, limit: 10 }` | Fallback params used when none are provided to `useList` or `useInfinite` |

```ts
// contacts/contacts.hooks.ts
import { createResourceHooks } from '@void-snippets/react';
import { ContactsApis } from './contacts.api';

export const contactHooks = createResourceHooks('contacts', ContactsApis);
// contactHooks.useList     → returns Contact.Base[]
// contactHooks.useGet      → returns Contact.WithCreatedBy
// contactHooks.useMutations → typed for Contact.Apis.CreatePayload, etc.
```

---

#### `useList(params?: VSQueryParams)`

Fetches a paginated list. Wraps TanStack Query's `useQuery`.

**Signature:**
```ts
useList(params?: VSQueryParams): VSUseListReturn<TBase>
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `params` | `VSQueryParams` | `defaultParams` from options | Query params — page, limit, and any custom filters |

**Return type: `VSUseListReturn<TBase>`**

```ts
export interface VSUseListReturn<TBase> {
  list:       TBase[];        // The array of items for the current page
  pagination: VSPagination;   // { page, limit, totalPages, totalDocuments }
  isLoading:  boolean;        // true while fetching (initial load OR background refetch)
  error:      Error | null;   // Error object if the query failed, else null
  invalidate: () => void;     // Calls queryClient.invalidateQueries({ queryKey: [prefix] })
}
```

| Field | Type | Description |
|---|---|---|
| `list` | `TBase[]` | Current page items. Empty array (`[]`) while loading or on error — never `undefined`. |
| `pagination` | `VSPagination` | Defaults to `{ page:1, limit:10, totalPages:0, totalDocuments:0 }` before data arrives. |
| `isLoading` | `boolean` | `true` when `query.isLoading || query.isFetching` — covers both initial load and background refreshes. |
| `error` | `Error \| null` | The error object if the query threw; `null` otherwise. |
| `invalidate` | `() => void` | Invalidates all queries sharing `queryKeyPrefix` — triggers a refetch everywhere the resource is used. |

**Cache key:** `[queryKeyPrefix, params]`

```tsx
const { list, isLoading, pagination, error, invalidate } =
  contactHooks.useList({ page: 1, limit: 20, search: 'john' });

if (isLoading) return <Spinner />;
if (error)     return <ErrorMessage message={error.message} />;

return (
  <>
    {list.map(c => <ContactCard key={c._id} contact={c} />)}
    <Pagination
      current={pagination.page}
      total={pagination.totalDocuments}
      pageSize={pagination.limit}
    />
    <button onClick={invalidate}>Refresh</button>
  </>
);
```

---

#### `useGet(id: TId, staleTime?: number)`

Fetches a single item by ID. Wraps TanStack Query's `useQuery`.

**Signature:**
```ts
useGet(id: Id<S>, staleTime?: number): VSUseGetReturn<TDetail>
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `id` | `TId` | _(required)_ | The resource ID. Query is **disabled** when `id` is `undefined`, `null`, or `""`. |
| `staleTime` | `number` | `30000` (30 s) | How long the data is considered fresh (ms). Pass `0` to always refetch. |

**Return type: `VSUseGetReturn<TDetail>`**

```ts
export interface VSUseGetReturn<TDetail> {
  item:      TDetail | undefined;  // The fetched item, or undefined before data arrives
  isLoading: boolean;              // true while fetching (initial or background)
  error:     Error | null;         // Error if the query failed, else null
  refetch:   () => void;           // Manually trigger a refetch
}
```

| Field | Type | Description |
|---|---|---|
| `item` | `TDetail \| undefined` | The fetched item. `undefined` before data arrives or if the query is disabled. |
| `isLoading` | `boolean` | `true` when `query.isLoading \|\| query.isFetching`. |
| `error` | `Error \| null` | Error object on failure; `null` otherwise. |
| `refetch` | `() => void` | Imperatively triggers a refetch without invalidating the cache. |

**Cache key:** `[queryKeyPrefix, id]`

```tsx
const { item, isLoading, error, refetch } = contactHooks.useGet(contactId);
// item is typed as Contact.WithCreatedBy | undefined ✅

if (isLoading) return <Skeleton />;
if (!item)     return null;

return <ContactDetail contact={item} onRefresh={refetch} />;
```

> **Auto-disabling:** The query sets `enabled: id !== undefined && id !== null && id !== ""`. Safe to call unconditionally even when the ID is not yet known.

---

#### `useMutations()`

Returns three TanStack Query mutation objects for create, update, and delete.

**Signature:**
```ts
useMutations(): {
  create: UseMutationResult<TDetail, Error, TCreate>;
  update: UseMutationResult<TDetail, Error, { _id: TId; payload: TUpdate }>;
  remove: UseMutationResult<TDetail, Error, TId>;
}
```

> **Note:** The method is named `remove` (not `delete`) because `delete` is a reserved keyword in JavaScript.

**Auto-invalidation:** All three mutations call `queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] })` on success — all `useList` and `useGet` queries for that resource will automatically refetch.

**`create`**

| Input type | `TCreate` — the create payload |
|---|---|
| Output type | `TDetail` — the created item (after adapter transformation) |

```ts
create.mutate({ name: 'John', email: 'john@example.com' });
create.mutateAsync({ name: 'John' }).then(item => console.log(item._id));

create.isPending // true while the request is in-flight
create.isSuccess // true after success
create.isError   // true on failure
create.error     // Error | null
create.data      // TDetail | undefined — the result of the last successful call
```

**`update`**

Input is an object `{ _id: TId; payload: TUpdate }`.

```ts
update.mutate({ _id: contactId, payload: { name: 'Jane' } });
```

**`remove`**

Input is `TId` directly.

```ts
remove.mutate(contactId);
```

**Full example:**

```tsx
function ContactActions({ contact }: { contact: Contact.Base }) {
  const { create, update, remove } = contactHooks.useMutations();

  const handleDuplicate = () => {
    create.mutate({ name: `${contact.name} (copy)`, email: contact.email });
  };

  const handleRename = (name: string) => {
    update.mutate({ _id: contact._id, payload: { name } });
  };

  const handleDelete = () => {
    remove.mutate(contact._id);
  };

  return (
    <>
      <button onClick={handleDuplicate} disabled={create.isPending}>Duplicate</button>
      <button onClick={() => handleRename('New Name')} disabled={update.isPending}>Rename</button>
      <button onClick={handleDelete} disabled={remove.isPending}>Delete</button>
      {remove.isError && <p>{remove.error?.message}</p>}
    </>
  );
}
```

---

#### `useInfinite(params?: VSQueryParams)`

Infinite-scroll / load-more query. Wraps TanStack Query's `useInfiniteQuery`.

**Signature:**
```ts
useInfinite(params?: VSQueryParams): UseInfiniteQueryResult<VSListResult<TBase>, Error>
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `params` | `VSQueryParams` | `defaultParams` | Base query params. `page` is overridden per-fetch; `limit` defaults to `20`. |

**Returns:** The full `UseInfiniteQueryResult` from TanStack Query v5:

| Key field | Type | Description |
|---|---|---|
| `data.pages` | `VSListResult<TBase>[]` | Array of fetched pages, each with `{ items, pagination }` |
| `data.pageParams` | `number[]` | Array of page numbers fetched so far |
| `fetchNextPage` | `() => void` | Fetches the next page (disabled when `!hasNextPage`) |
| `hasNextPage` | `boolean` | `true` when `pagination.page < pagination.totalPages` |
| `isFetchingNextPage` | `boolean` | `true` while the next page is being fetched |
| `isLoading` | `boolean` | `true` on the initial load |
| `error` | `Error \| null` | Error on failure |

**Cache key:** `[queryKeyPrefix, "INFINITE", params]`

**`getNextPageParam` logic:**
```ts
(lastPage) => {
  const { page, totalPages } = lastPage.pagination;
  return page < totalPages ? page + 1 : undefined;
}
// Returns undefined when on the last page → hasNextPage becomes false
```

```tsx
function ContactsInfiniteList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    contactHooks.useInfinite({ limit: 20 });

  const allContacts = data?.pages.flatMap(p => p.items) ?? [];

  if (isLoading) return <Spinner />;

  return (
    <div>
      {allContacts.map(c => <ContactCard key={c._id} contact={c} />)}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
```

---

### Custom API Adapters

If your API returns a different response shape than the defaults, pass `adapters` to `createResourceHooks`:

```ts
// Your API returns:
// List:   { results: Contact[], meta: { currentPage, perPage, lastPage, total } }
// Single: { payload: Contact }

export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  adapters: {
    fromList: (raw) => ({
      items: raw.results,
      pagination: {
        page:           raw.meta.currentPage,
        limit:          raw.meta.perPage,
        totalPages:     raw.meta.lastPage,
        totalDocuments: raw.meta.total,
      },
    }),
    fromSingle: (raw) => raw.payload,
  },
  defaultParams: { page: 1, limit: 25 },
});
```

The TypeScript types for `raw` inside both adapters are fully inferred from `ResourceService`'s `TListRaw` and `TSingleRaw` type parameters — if you define them on your service class, you get autocomplete and type checking inside the adapter.

---

### `useAlertMessage(autoHideDuration?: number)`

Manages alert / toast notification state. Supports JSX content and optional auto-hide.

**Signature:**
```ts
function useAlertMessage(autoHideDuration?: number): {
  alert:     VSAlertState;
  showAlert: (message: ReactNode | string, type?: VSAlertVariant) => void;
  hideAlert: () => void;
}
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `autoHideDuration` | `number` | `3000` | Milliseconds before the alert auto-hides. Pass `0` to disable auto-hide entirely. |

#### Types

**`VSAlertVariant`**
```ts
type VSAlertVariant = "success" | "info" | "error";
```

**`VSAlertState`**
```ts
interface VSAlertState {
  message:   ReactNode | string;  // Alert content — plain text or JSX
  type:      VSAlertVariant;      // Alert severity
  isVisible: boolean;             // Whether the alert should be shown
}
```

#### Return Value

| Field | Type | Description |
|---|---|---|
| `alert` | `VSAlertState` | Current alert state — bind to your alert/toast UI component |
| `showAlert` | `(message, type?) => void` | Sets `isVisible: true` and schedules auto-hide if `autoHideDuration > 0` |
| `hideAlert` | `() => void` | Immediately sets `isVisible: false` |

**Initial state:** `{ message: null, type: "info", isVisible: false }`

```tsx
function MyPage() {
  const { alert, showAlert, hideAlert } = useAlertMessage(4000);

  const handleSave = async () => {
    const [err] = await execute(() => ContactsApis.create(form));
    if (err) {
      showAlert(err.message, 'error');
    } else {
      showAlert('Contact saved successfully!', 'success');
    }
  };

  return (
    <>
      {alert.isVisible && (
        <Alert variant={alert.type} onClose={hideAlert}>
          {alert.message}
        </Alert>
      )}
      <button onClick={handleSave}>Save</button>
    </>
  );
}
```

---

### `useAsyncState<T>(initialData?: T | null)`

Generic async state machine that tracks `data`, `status`, and `error` for any async operation — not just HTTP calls.

**Signature:**
```ts
function useAsyncState<T>(initialData?: T | null): VSUseAsyncStateReturn<T>
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `initialData` | `T \| null` | `null` | Optional initial value for `data` |

#### Types

**`VSAsyncStatus`**
```ts
type VSAsyncStatus = "idle" | "pending" | "success" | "error";
```

| Status | Meaning |
|---|---|
| `"idle"` | Not yet executed, or reset |
| `"pending"` | Execution in progress |
| `"success"` | Last execution succeeded |
| `"error"` | Last execution failed |

**`VSUseAsyncStateReturn<T>`**

```ts
export interface VSUseAsyncStateReturn<T> {
  // State
  data:      T | null;
  status:    VSAsyncStatus;
  error:     Error | null;

  // Derived boolean flags (memoised)
  isLoading: boolean;    // status === "pending"
  isSuccess: boolean;    // status === "success"
  isError:   boolean;    // status === "error"

  // Imperative setters
  setData:  (data: T | null) => void;    // Transition to "success" and set data
  setError: (error: Error | null) => void; // Transition to "error" and set error
  reset:    () => void;                  // Restore to initialData, status "idle", error null

  // Primary executor
  execute: (
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (data: T)    => void;
      onError?:  (error: Error) => void;
    }
  ) => Promise<[Error, null] | [null, T]>;
}
```

#### `execute` method

```ts
execute(asyncFn, options?) => Promise<[Error, null] | [null, T]>
```

Runs `asyncFn`, updates state transitions, and returns a `catchError`-style tuple. Allows inline result handling without `try/catch`.

| Lifecycle | State transition |
|---|---|
| Called | `status → "pending"`, `error → null` |
| Resolved | `status → "success"`, `data → result` |
| Rejected | `status → "error"`, `error → Error` |

| Parameter | Type | Description |
|---|---|---|
| `asyncFn` | `() => Promise<T>` | The async operation to execute |
| `options.onSuccess` | `(data: T) => void` | Called with the result on success |
| `options.onError` | `(error: Error) => void` | Called with the error on failure |

**Returns:** `Promise<[Error, null] | [null, T]>` — same tuple as `catchError`.

```tsx
function CreateContactForm() {
  const { isLoading, execute } = useAsyncState<Contact.WithCreatedBy>();
  const { showAlert } = useAlertMessage();

  const handleSubmit = async (formData: Contact.Apis.CreatePayload) => {
    const [err, contact] = await execute(
      () => ContactsApis.create(formData),
      {
        onSuccess: () => showAlert('Contact created!', 'success'),
        onError: (e)  => showAlert(e.message, 'error'),
      }
    );

    if (err) return; // already handled by onError
    console.log('New contact ID:', contact._id);
  };

  return <Form onSubmit={handleSubmit} loading={isLoading} />;
}
```

> `setData`, `setError`, and `reset` are useful for seeding state from a parent component or clearing state on unmount.

---

### `useCallTimer(startedAt?: number | null)`

Tracks elapsed wall-clock time from a start timestamp. Updates every second via `setInterval`.

**Signature:**
```ts
function useCallTimer(startedAt?: number | null): string
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `startedAt` | `number \| null \| undefined` | `undefined` | Unix timestamp in milliseconds (e.g. `Date.now()` at call start). Pass `null` or `undefined` to reset. |

**Returns:** `string` — a formatted `"MM:SS"` elapsed duration string.

| `startedAt` value | Return value |
|---|---|
| `null` / `undefined` | `"00:00"` (timer reset) |
| A past Unix timestamp | `"MM:SS"` e.g. `"02:45"` (updates every second) |

**Internals:**
- Uses `setInterval` with a 1000 ms tick.
- Cleans up the interval on unmount or when `startedAt` changes (via `useEffect` cleanup).
- The diff is computed as `Math.floor((Date.now() - startedAt) / 1000)` — no drift accumulation.

```tsx
function ActiveCallBanner({ call }: { call: ActiveCall | null }) {
  const duration = useCallTimer(call?.startedAt ?? null);

  if (!call) return null;

  return (
    <div className="call-banner">
      <span>On a call with {call.contactName}</span>
      <span className="timer">{duration}</span>  {/* "04:22" */}
    </div>
  );
}
```

---

### `useModal<T = unknown>()`

Manages modal open/close state, optional data payload, and a loading flag. Designed to serve both create and edit modal patterns through a single hook instance.

**Signature:**
```ts
function useModal<T = unknown>(): VSModalReturn<T>
```

**Type parameter:**

| Parameter | Default | Description |
|---|---|---|
| `T` | `unknown` | The type of data the modal operates on (e.g. `Contact.Base`) |

#### Return type: `VSModalReturn<T>`

```ts
export interface VSModalReturn<T> {
  isOpen:          boolean;
  data:            T | null;
  isLoading:       boolean;
  openCreateModal: () => void;
  openEditModal:   (editData: T) => void;
  setLoading:      (loading: boolean) => void;
  closeModal:      () => void;
  setModal:        (open: boolean, editData?: T | null) => void;
}
```

| Field / Method | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Whether the modal is open |
| `data` | `T \| null` | Payload associated with the modal. `null` in create mode; `T` in edit mode. |
| `isLoading` | `boolean` | Internal loading flag — useful to disable the modal's submit button during async operations |
| `openCreateModal()` | `() => void` | Sets `isOpen: true`, `data: null` (create mode) |
| `openEditModal(editData)` | `(T) => void` | Sets `isOpen: true`, `data: editData` (edit mode) |
| `setLoading(loading)` | `(boolean) => void` | Manually control the loading state |
| `closeModal()` | `() => void` | Sets `isOpen: false`, `data: null` |
| `setModal(open, editData?)` | `(boolean, T?) => void` | Low-level setter — directly controls `isOpen` and `data` in one call |

**Pattern — create vs edit detection:**

```ts
if (modal.data) {
  // Edit mode — modal.data is T
} else {
  // Create mode — modal.data is null
}
```

```tsx
function ContactsPage() {
  const modal = useModal<Contact.Base>();
  const { create, update } = contactHooks.useMutations();

  const handleSubmit = async (form: Contact.Apis.CreatePayload | Contact.Apis.UpdatePayload) => {
    modal.setLoading(true);
    if (modal.data) {
      await update.mutateAsync({ _id: modal.data._id, payload: form });
    } else {
      await create.mutateAsync(form as Contact.Apis.CreatePayload);
    }
    modal.closeModal();
  };

  return (
    <>
      <button onClick={modal.openCreateModal}>+ New Contact</button>

      {list.map(c => (
        <ContactCard
          key={c._id}
          contact={c}
          onEdit={() => modal.openEditModal(c)}
        />
      ))}

      <ContactModal
        open={modal.isOpen}
        data={modal.data}               // null → create form, Contact → edit form
        loading={modal.isLoading}
        onSubmit={handleSubmit}
        onClose={modal.closeModal}
      />
    </>
  );
}
```

---

### `usePagination(initialPage?: number, initialLimit?: number)`

Manages client-side pagination state and produces a `queryParams` object ready to pass directly to `useList`.

**Signature:**
```ts
function usePagination(initialPage?: number, initialLimit?: number): VSPaginationReturn
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `initialPage` | `number` | `1` | Starting page number |
| `initialLimit` | `number` | `10` | Starting items per page |

#### Return type: `VSPaginationReturn`

```ts
export interface VSPaginationReturn {
  page:               number;
  limit:              number;
  onPaginationChange: (newPage: number, newLimit: number) => void;
  resetPagination:    () => void;
  setPage:            (page: number) => void;
  setLimit:           (limit: number) => void;
  queryParams:        VSQueryParams;
}
```

| Field / Method | Type | Description |
|---|---|---|
| `page` | `number` | Current page (reactive) |
| `limit` | `number` | Current page size (reactive) |
| `queryParams` | `VSQueryParams` | `{ page, limit }` — pass directly to `useList()` |
| `onPaginationChange(newPage, newLimit)` | `(number, number) => void` | Updates both `page` and `limit` in one call — wire to a pagination component's `onChange` |
| `resetPagination()` | `() => void` | Resets `page` to `1` (limit is unchanged) — use after applying a new filter |
| `setPage(page)` | `(number) => void` | Directly set the current page |
| `setLimit(limit)` | `(number) => void` | Directly set the page size |

```tsx
function ContactsPage() {
  const { queryParams, pagination: pag, onPaginationChange, resetPagination } =
    usePagination(1, 20);

  const [search, setSearch] = useState('');

  // Pass queryParams (and extra filters) to useList
  const { list, isLoading, pagination } = contactHooks.useList({
    ...queryParams,
    search,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    resetPagination(); // go back to page 1 when filter changes
  };

  return (
    <>
      <SearchInput value={search} onChange={handleSearchChange} />

      {list.map(c => <ContactCard key={c._id} contact={c} />)}

      <Pagination
        current={pagination.page}
        pageSize={pagination.limit}
        total={pagination.totalDocuments}
        onChange={onPaginationChange}
      />
    </>
  );
}
```

---

## End-to-End Workflow Example

A complete, realistic example tying all three packages together.

```ts
// 1. contacts/contacts.types.ts
import type { VSId } from '@void-snippets/core';

export namespace Contact {
  export type Id = VSId<string, 'Contact'>;

  export interface Base {
    _id:   Id;
    name:  string;
    email: string;
    phone: string;
  }

  export interface WithCreatedBy extends Base {
    createdBy: { _id: string; name: string };
    createdAt: string;
    updatedAt: string;
  }

  export namespace Apis {
    export interface CreatePayload { name: string; email: string; phone: string; }
    export interface UpdatePayload { name?: string; email?: string; phone?: string; }
  }
}
```

```ts
// 2. contacts/contacts.api.ts
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

```ts
// 3. contacts/contacts.hooks.ts
import { createResourceHooks } from '@void-snippets/react';
import { ContactsApis } from './contacts.api';

export const contactHooks = createResourceHooks('contacts', ContactsApis);
```

```tsx
// 4. contacts/ContactsPage.tsx
import { stringToId }     from '@void-snippets/core';
import { useAlertMessage, useAsyncState, useModal, usePagination } from '@void-snippets/react';
import { contactHooks }   from './contacts.hooks';
import { ContactsApis }   from './contacts.api';
import type { Contact }   from './contacts.types';

export function ContactsPage() {
  // Pagination
  const { queryParams, onPaginationChange, resetPagination } = usePagination(1, 20);

  // Data fetching
  const { list, isLoading, pagination, error, invalidate } =
    contactHooks.useList(queryParams);

  // Mutations
  const { create, update, remove } = contactHooks.useMutations();

  // Modal
  const modal = useModal<Contact.Base>();

  // Alerts
  const { alert, showAlert, hideAlert } = useAlertMessage(4000);

  // Async form submission
  const { isLoading: isSubmitting, execute } =
    useAsyncState<Contact.WithCreatedBy>();

  const handleSubmit = async (
    formData: Contact.Apis.CreatePayload | Contact.Apis.UpdatePayload
  ) => {
    modal.setLoading(true);

    const [err] = modal.data
      ? await execute(() =>
          update.mutateAsync({ _id: modal.data!._id, payload: formData })
        )
      : await execute(() =>
          create.mutateAsync(formData as Contact.Apis.CreatePayload)
        );

    modal.setLoading(false);

    if (err) {
      showAlert(err.message, 'error');
      return;
    }

    showAlert(modal.data ? 'Contact updated!' : 'Contact created!', 'success');
    modal.closeModal();
  };

  const handleDelete = async (id: Contact.Id) => {
    const [err] = await execute(() => remove.mutateAsync(id));
    if (err) showAlert(err.message, 'error');
    else     showAlert('Contact deleted.', 'info');
  };

  // Convert URL param to branded ID (e.g. from useParams())
  const routeId = stringToId<Contact.Id>('abc-123');
  const { item: selectedContact } = contactHooks.useGet(routeId);

  return (
    <div>
      {alert.isVisible && (
        <Alert type={alert.type} onClose={hideAlert}>{alert.message}</Alert>
      )}

      <button onClick={modal.openCreateModal}>+ New Contact</button>
      <button onClick={invalidate}>Refresh</button>

      {isLoading && <Spinner />}
      {error && <ErrorBanner message={error.message} />}

      {list.map(contact => (
        <ContactCard
          key={contact._id}
          contact={contact}
          onEdit={() => modal.openEditModal(contact)}
          onDelete={() => handleDelete(contact._id)}
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
        loading={modal.isLoading || isSubmitting}
        onSubmit={handleSubmit}
        onClose={modal.closeModal}
      />
    </div>
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

### Development (watch mode)

```bash
pnpm dev         # all packages in parallel
pnpm build:core  # rebuild core only (e.g. after type changes)
```

### Build

```bash
pnpm build
```

Each package's output lands in `packages/{name}/dist/`.

### Versioning & Publishing

```bash
# Bump versions
pnpm version:bump

# Publish all packages to npm
pnpm publish:all
```

### Repository

- **Source:** [github.com/shahtirthhh/void-snippets](https://github.com/shahtirthhh/void-snippets)
- **Issues:** [github.com/shahtirthhh/void-snippets/issues](https://github.com/shahtirthhh/void-snippets/issues)

---

## License

MIT © [shahtirthhh](https://github.com/shahtirthhh/void-snippets)
