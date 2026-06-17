# @void-snippets

> Stop rewriting the same loading states, error handlers, and URL builders. Define your data shape once — get typed API hooks, sockets, routing contracts, and UI helpers for free.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-blue)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange)](https://pnpm.io/)

---

## What problem does this solve?

Every CRUD feature you build ends up with roughly the same boilerplate: fetch the list, track `isLoading`, handle the error, invalidate the cache after a mutation, build a URL string, parse query params... The code is not difficult, just repetitive. And every time you copy it, you risk a slightly different naming convention, a missed edge case, or a type that's `any` because it was 3am.

`@void-snippets` is that boilerplate, extracted once and made fully typed. You describe the shape of your data — one file — and the library generates the hooks, cache management, URL builders, and state machines for you.

---

## Packages

| Package | Version | What's inside |
|---|---|---|
| [`@void-snippets/core`](#package-void-snippetscore) | `0.3.0` | Branded ID types, shared interfaces, the `catchError` helper |
| [`@void-snippets/client`](#package-void-snippetsclient) | `0.3.0` | Generic typed HTTP service — extend once per resource, get CRUD for free |
| [`@void-snippets/react`](#package-void-snippetsreact) | `0.6.0` | TanStack Query hooks factory, Socket.IO hooks factory, routing contract, and everyday UI hooks |

---

## Table of Contents

- [Installation](#installation)
- [core — Foundation Types and Utilities](#package-void-snippetscore)
  - [VSId — Branded IDs](#vsid--branded-ids)
  - [stringToId — Cast raw strings safely](#stringtoid)
  - [catchError — Tuple-style error handling](#catcherror)
  - [Shared Types](#shared-types)
  - [Adapters — Translating API responses](#adapters)
- [client — HTTP Service Layer](#package-void-snippetsclient)
  - [configure — Register your axios instance](#configure)
  - [ResourceService — Generic CRUD base class](#resourceservice)
  - [handleApiError — Normalised error handling](#handleapierror)
- [react — React Hooks and Factories](#package-void-snippetsreact)
  - [createResourceHooks](#createresourcehooks)
    - [useList](#uselist)
    - [useGet](#useget)
    - [useMutations](#usemutations)
    - [useInfinite](#useinfinite)
    - [Optimistic Updates](#optimistic-updates)
  - [createSocketHooks](#createsockethooks)
    - [useSocketEmit](#usesocketemit)
    - [useSocketListener](#usesocketlistener)
    - [useSocketConnection](#usesocketconnection)
  - [createRouteContract](#createroutecontract)
    - [defineRoute](#defineroute)
    - [build()](#build)
    - [useTypedSearchParams](#usetypedsearchparams)
  - [useAlertMessage](#usealertmessage)
  - [useAsyncState](#useasyncstate)
  - [useCallTimer](#usecalltimer)
  - [useModal](#usemodal)
  - [usePagination](#usepagination)
- [Full Example — Contacts Feature from Scratch](#full-example)
- [Build and Publish](#build-and-publish)
- [License](#license)

---

## Installation

```bash
# The full React stack
pnpm add @void-snippets/core @void-snippets/client @void-snippets/react
pnpm add axios @tanstack/react-query

# Optional — only if you use socket hooks
pnpm add socket.io-client

# Optional — only if you use the routing contract
pnpm add react-router
```

**Peer dependency minimum versions:**

| Peer | Min version | Needed for |
|---|---|---|
| `react` | `>=17.0.0` | All React hooks |
| `axios` | `^1.6.0` | `@void-snippets/client` |
| `@tanstack/react-query` | `^5.0.0` | `createResourceHooks` |
| `socket.io-client` | `>=4.6.0` | `createSocketHooks` |
| `react-router` | `>=7.0.0` | `createRouteContract` |
| TypeScript | `^5.4.0` | Everything |

---

## Package: `@void-snippets/core`

The foundation layer. No runtime dependencies — just types and pure utility functions that everything else builds on.

```ts
import { stringToId, catchError, createDefaultAdapters } from '@void-snippets/core';
import type { VSId, VSPagination, VSQueryParams, VSListResult, VSAdapters } from '@void-snippets/core';
```

---

### `VSId` — Branded IDs

**The problem it solves:** In TypeScript, `ContactId` and `UserId` are both just `string` under the hood. Nothing stops you from accidentally passing a user's ID where a contact's ID is expected — they're structurally identical, so TypeScript won't complain.

`VSId` fixes this by attaching an invisible compile-time "brand" to a string. Two branded IDs with different brands are incompatible, even though both are still plain strings at runtime.

**Type signature:**

```ts
type VSId<K, T> = K & { __brand: T };
// K = the underlying primitive (usually string)
// T = the brand tag (a string literal that names the ID)
```

**How to declare your ID types:**

```ts
// contacts/contacts.types.ts
import type { VSId } from '@void-snippets/core';

export type ContactId = VSId<string, 'Contact'>;
export type UserId    = VSId<string, 'User'>;
```

**What this gives you:**

```ts
function deleteContact(id: ContactId): Promise<void> { ... }

const contactId: ContactId = '...' as ContactId;
const userId: UserId       = '...' as UserId;

deleteContact(contactId); // ✅ correct
deleteContact(userId);    // ❌ TypeScript error — 'User' brand is not 'Contact' brand
deleteContact('raw-string'); // ❌ TypeScript error — plain string is not ContactId
```

Runtime behaviour is unchanged — it's still just a string. The brand only lives in the type system.

---

### `stringToId`

**The problem it solves:** You have a `VSId` type in your app, but raw strings come in from URL params, API responses, and localStorage. You need one safe, explicit place to cross that boundary.

**Signature:**

```ts
function stringToId<T>(id: string): T
```

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Any raw string — URL param, API response field, stored value |

**Output:** `T` — the branded ID type you specify as the generic

**Example:**

```ts
import { stringToId } from '@void-snippets/core';

// In a React Router component, params.contactId is just `string`
const { contactId: rawId } = useParams();

// Cast it once at the boundary — now it's typed everywhere downstream
const contactId = stringToId<ContactId>(rawId);

loadContact(contactId); // ✅ TypeScript is satisfied
```

---

### `catchError`

**The problem it solves:** `try/catch` blocks break the linear flow of async code, especially when you need the result in the same scope as the error. You end up either nesting logic inside the `try`, or declaring a `let result` above it. Neither is clean.

`catchError` wraps any Promise in a `[error, data]` tuple — the same pattern Go uses. Success and failure are both handled in one line.

**Signature:**

```ts
async function catchError<T>(promise: Promise<T>): Promise<[Error, null] | [null, T]>
```

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `promise` | `Promise<T>` | Any Promise — API call, file read, anything async |

**Output:** `Promise<[Error, null] | [null, T]>`

| Outcome | First element | Second element |
|---|---|---|
| Success | `null` | `T` — fully typed, not `T \| undefined` |
| Failure | `Error` | `null` — non-Error rejections are coerced automatically |

**Before and after:**

```ts
// ❌ Before — try/catch forces you to declare result before the block
async function saveContact(data: Contact.Apis.Create) {
  let contact: Contact.Detail | undefined;
  try {
    contact = await ContactsApis.create(data);
    toast.success('Created!');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unknown error');
    return;
  }
  navigate(`/contacts/${contact._id}`); // contact could still be undefined here for TS
}

// ✅ After — linear, no variable leaking, TypeScript knows exactly what contact is
async function saveContact(data: Contact.Apis.Create) {
  const [err, contact] = await catchError(ContactsApis.create(data));
  if (err) { toast.error(err.message); return; }
  toast.success('Created!');
  navigate(`/contacts/${contact._id}`); // contact is Contact.Detail — not undefined
}
```

---

### Shared Types

These interfaces are the common language between all three packages.

#### `VSPagination` — pagination metadata

```ts
interface VSPagination {
  page:           number; // current page, 1-based
  limit:          number; // items per page
  totalPages:     number; // total number of pages available
  totalDocuments: number; // total record count across all pages
}
```

#### `VSQueryParams` — list query input

```ts
interface VSQueryParams {
  page?:  number;
  limit?: number;
  [key: string]: unknown; // add any filter, sort, or search params you need
}
```

#### `VSListResult<T>` — normalised list response

```ts
interface VSListResult<T> {
  items:      T[];           // the items for the current page
  pagination: VSPagination;  // page metadata
}
```

This is the internal format `useList` and `useInfinite` work with after the adapter transforms your raw API response.

---

### Adapters

**The problem they solve:** Your API returns data in its own shape. The library works with a standard internal shape. Adapters are the one-time translation layer between the two.

#### What shape does the library expect by default?

```json
// List endpoint
{ "data": { "items": [...], "page": 1, "limit": 10, "totalPages": 5, "totalDocuments": 42 } }

// Single item endpoint
{ "data": { "_id": "...", "name": "..." } }
```

If your API matches this, you don't write any adapters at all — the defaults just work.

#### `createDefaultAdapters<TBase, TDetail>()`

Returns a pre-built adapter pair for the default response shapes.

**Signature:**

```ts
function createDefaultAdapters<TBase, TDetail>(): VSAdapters<
  VSDefaultPaginatedResponse<TBase>,
  TBase,
  VSDefaultSingleResponse<TDetail>,
  TDetail
>
```

**Input:** No runtime arguments. Pass your two type parameters.

**Output:** `VSAdapters` — an object with `fromList` and `fromSingle` functions ready to use

#### Writing a custom adapter

If your API returns something different, implement `VSAdapters` yourself:

```ts
interface VSAdapters<TListRaw, TBase, TSingleRaw, TDetail> {
  fromList:   (raw: TListRaw)   => VSListResult<TBase>;  // map your list response → internal format
  fromSingle: (raw: TSingleRaw) => TDetail;              // map your single response → your detail type
}
```

```ts
// Example: API returns { results: [...], meta: { currentPage, perPage, lastPage, total } }
import type { VSAdapters, VSListResult } from '@void-snippets/core';

const contactAdapters: VSAdapters<ApiListResponse, Contact.Base, ApiSingleResponse, Contact.Detail> = {
  fromList: (raw): VSListResult<Contact.Base> => ({
    items: raw.results,
    pagination: {
      page:           raw.meta.currentPage,
      limit:          raw.meta.perPage,
      totalPages:     raw.meta.lastPage,
      totalDocuments: raw.meta.total,
    },
  }),
  fromSingle: (raw): Contact.Detail => raw.data,
};

// Then pass it to createResourceHooks:
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  adapters: contactAdapters,
});
```

---

## Package: `@void-snippets/client`

The HTTP layer. Works anywhere TypeScript runs — React, Vue, Node, plain scripts.

```ts
import { configure, ResourceService, handleApiError } from '@void-snippets/client';
```

---

### `configure`

**What it does:** Registers a single axios instance that all your `ResourceService` subclasses will share. Call this once — at your app's entry point — and every service you write picks it up automatically.

**Signature:**

```ts
function configure(instance: AxiosInstance): void
```

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `instance` | `AxiosInstance` | Your configured axios instance — base URL, headers, interceptors already attached |

**Output:** `void`

**Example:**

```ts
// main.ts — run this before anything else
import axios from 'axios';
import { configure } from '@void-snippets/client';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Attach auth token to every request
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
httpClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) window.location.href = '/auth/login';
    return Promise.reject(err);
  },
);

configure(httpClient); // ← done. All services are wired up.
```

---

### `ResourceService`

**What it does:** A generic base class. You extend it once per API resource, pass the URL prefix in the constructor, and get five typed HTTP methods for free. No more writing the same `axios.get('/contacts')`, `axios.post('/contacts')`, etc., for every resource.

**Class signature:**

```ts
class ResourceService<
  TId,                                              // the resource's ID type  (e.g. Contact.Id)
  TBase,                                            // shape in list responses (e.g. Contact.Base)
  TDetail    = TBase,                               // shape in single responses (e.g. Contact.Detail)
  TCreate    = Partial<TBase>,                      // create payload shape
  TUpdate    = Partial<TBase>,                      // update payload shape
  TListRaw   = VSDefaultPaginatedResponse<TBase>,   // raw API list response
  TSingleRaw = VSDefaultSingleResponse<TDetail>     // raw API single response
>
```

**Methods:**

| Method | Input | Output | HTTP call |
|---|---|---|---|
| `list(params?)` | `VSQueryParams` | `Promise<TListRaw>` | `GET /endpoint?page=1&limit=10&...` |
| `get(id)` | `TId` | `Promise<TSingleRaw>` | `GET /endpoint/:id` |
| `create(payload)` | `TCreate` | `Promise<TSingleRaw>` | `POST /endpoint` |
| `update(id, payload)` | `TId, TUpdate` | `Promise<TSingleRaw>` | `PATCH /endpoint/:id` |
| `delete(id)` | `TId` | `Promise<TSingleRaw>` | `DELETE /endpoint/:id` |

All five methods normalise errors through `handleApiError` — so you always get a plain `Error` object with a readable `.message`, never a raw axios error.

**Example — defining a resource service:**

Start with your type definitions. Using a namespace keeps everything tidy:

```ts
// contacts/contacts.types.ts
import type { VSId } from '@void-snippets/core';

export namespace Contact {
  export type Id = VSId<string, 'Contact'>;

  // Shape returned in list endpoints (lean — just what the table needs)
  export interface Base {
    _id:   Id;
    name:  string;
    email: string;
    phone: string;
  }

  // Shape returned in single-item endpoints (richer — full detail page)
  export interface Detail extends Base {
    createdBy: { _id: string; name: string };
    notes:     string;
    createdAt: string;
    updatedAt: string;
  }

  // Payload shapes for mutations
  export namespace Apis {
    export interface CreatePayload {
      name:  string;
      email: string;
      phone: string;
    }
    export interface UpdatePayload {
      name?:  string;
      email?: string;
      phone?: string;
      notes?: string;
    }
  }
}
```

Then the service:

```ts
// contacts/contacts.api.ts
import { ResourceService } from '@void-snippets/client';
import type { Contact } from './contacts.types';

export class ContactsApiService extends ResourceService<
  Contact.Id,                  // TId
  Contact.Base,                // TBase   — list shape
  Contact.Detail,              // TDetail — single-item shape
  Contact.Apis.CreatePayload,  // TCreate
  Contact.Apis.UpdatePayload   // TUpdate
> {
  constructor() {
    super('/contacts'); // base path — list is GET /contacts, single is GET /contacts/:id
  }
}

// Export one shared instance
export const ContactsApis = new ContactsApiService();
```

You can now call `ContactsApis.list({ page: 1 })`, `ContactsApis.get(id)`, etc., with full type safety anywhere in your app.

---

### `handleApiError`

**What it does:** Normalises any error thrown by axios into a clean, standard `Error` object. It's called automatically inside every `ResourceService` method, but you can also use it directly if you make axios calls outside of a service.

**Signature:**

```ts
function handleApiError(error: unknown): never
```

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `error` | `unknown` | Anything — an AxiosError, a plain Error, a string, anything thrown |

**Output:** `never` — this function always throws. It never returns.

**What it throws:**

| What was caught | What gets thrown |
|---|---|
| `AxiosError` with `response.data.message` | `new Error(serverMessage)` — the message your API sent |
| `AxiosError` without a server message | `new Error(axiosError.message)` — the axios network message |
| A standard `Error` | Re-throws the same error unchanged |
| Anything else (string, object, etc.) | `new Error("An unexpected error occurred.")` |

**Example — using it directly:**

```ts
import axios from 'axios';
import { handleApiError } from '@void-snippets/client';

async function uploadFile(file: File) {
  try {
    const res = await axios.post('/upload', formData);
    return res.data;
  } catch (err) {
    handleApiError(err); // always throws a clean Error with a readable message
  }
}
```

---

## Package: `@void-snippets/react`

Everything React-specific lives here. Three factories that generate typed hooks from your definitions, plus five standalone utility hooks.

```ts
import {
  createResourceHooks,
  createSocketHooks,
  createRouteContract, defineRoute, useTypedSearchParams,
  useAlertMessage, useAsyncState, useCallTimer, useModal, usePagination,
} from '@void-snippets/react';
```

**One-time setup** before using the resource hooks:

```ts
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// Wrap your app
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

---

### `createResourceHooks`

**What it does:** The main factory. Give it your `ResourceService` instance and a cache key prefix, and it returns four fully typed TanStack Query hooks — `useList`, `useGet`, `useMutations`, and `useInfinite`. All types flow from your service definition, so you never write a generic at the call site.

**Signature:**

```ts
function createResourceHooks<K extends string, S extends ResourceService>(
  queryKeyPrefix: K,
  apiService:     S,
  options?:       VSResourceHooksOptions,
): { useList, useGet, useMutations, useInfinite }
```

**Input:**

| Argument | Type | Description |
|---|---|---|
| `queryKeyPrefix` | `string` | The TanStack Query cache namespace for this resource. Typically the resource name in lowercase: `'contacts'`, `'users'`. |
| `apiService` | `ResourceService` subclass instance | Your service. Types for all four hooks are inferred from this. |
| `options` | `VSResourceHooksOptions` (optional) | Adapters, default pagination params, and optimistic update handlers. |

**`VSResourceHooksOptions`:**

```ts
interface VSResourceHooksOptions {
  adapters?:      VSAdapters;          // override the default response-shape adapters
  defaultParams?: VSQueryParams;       // default page/limit used when none are passed (default: { page: 1, limit: 10 })
  optimistic?:    VSOptimisticHandlers; // optimistic update functions (covered in the Optimistic Updates section)
}
```

**Output:** `{ useList, useGet, useMutations, useInfinite }` — all described below.

**Example:**

```ts
// contacts/contacts.hooks.ts
import { createResourceHooks } from '@void-snippets/react';
import { ContactsApis } from './contacts.api';

// Minimal — no options needed if your API matches the default shape
export const contactHooks = createResourceHooks('contacts', ContactsApis);

// With options
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  defaultParams: { page: 1, limit: 25 },
  optimistic: {
    remove: (cache, id) => cache.filter(c => c._id !== id),
    // ... more handlers
  },
});
```

---

#### `useList`

**What it does:** Fetches a paginated list for the resource. Separates three different kinds of "loading" so you can show the right UI for each one.

**Signature:**

```ts
contactHooks.useList(params?: VSQueryParams): VSUseListReturn<Contact.Base>
```

**Input:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `params` | `VSQueryParams` | `defaultParams` | Page, limit, and any extra filters your API accepts (`search`, `status`, `sortBy`, etc.) |

**Output — `VSUseListReturn<TBase>`:**

| Field | Type | Description |
|---|---|---|
| `list` | `TBase[]` | The items for the current page. Always an array — never `undefined`. |
| `pagination` | `VSPagination` | Page metadata — `{ page, limit, totalPages, totalDocuments }` |
| `isLoading` | `boolean` | `true` only on the **very first fetch** when there is no cached data yet. Use this for full-page skeletons. |
| `isFetching` | `boolean` | `true` during **any** network request — including background refetches. Use for a subtle loading bar at the top. |
| `isRefetching` | `boolean` | `true` during a **background refetch** while data is already showing. Use for a small "Refreshing…" badge. |
| `isError` | `boolean` | `true` when the most recent fetch threw an error |
| `error` | `Error \| null` | The error itself — check `error.message` |
| `refetch` | `() => Promise` | Manually fire this specific query again. Great for "Try again" buttons. |
| `invalidate` | `() => void` | Marks the whole resource cache as stale. TanStack Query refetches every mounted `useList` and `useGet` for this resource in the background. |

> **Why three loading states?**
> `isLoading` going true will blank out your whole page — only use it when there's genuinely nothing to show yet. `isRefetching` is true after a mutation invalidates the cache (data is still showing, just potentially stale). `isFetching` covers both. Using `isFetching` as a full-page spinner guard will cause your table to disappear and reappear after every create/delete — which looks broken.

**Example:**

```tsx
function ContactsPage() {
  const { queryParams, onPaginationChange } = usePagination(1, 20);
  const [search, setSearch] = useState('');

  const { list, pagination, isLoading, isRefetching, isError, error, refetch } =
    contactHooks.useList({ ...queryParams, search });

  if (isLoading) return <TableSkeleton />;

  if (isError) return (
    <EmptyState
      icon={<AlertIcon />}
      title="Could not load contacts"
      description={error?.message}
      action={<Button onClick={refetch}>Try again</Button>}
    />
  );

  return (
    <>
      {/* Linear progress bar — only shows on background refetch, not first load */}
      {isRefetching && <LinearProgress />}

      <SearchInput value={search} onChange={setSearch} />

      {list.map(contact => <ContactRow key={contact._id} contact={contact} />)}

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

#### `useGet`

**What it does:** Fetches a single item by its ID. Automatically skips the request when the ID isn't ready yet — no conditional hook calls, no `if (id)` guards.

**Signature:**

```ts
contactHooks.useGet(id: Contact.Id | undefined | null | '', staleTime?: number): VSUseGetReturn<Contact.Detail>
```

**Input:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `id` | `TId \| undefined \| null \| ''` | required | The item's ID. Query is automatically disabled when this is falsy. |
| `staleTime` | `number` (ms) | `30_000` | How long the cached result is considered fresh before a background refetch is triggered. |

**Output — `VSUseGetReturn<TDetail>`:**

| Field | Type | Description |
|---|---|---|
| `item` | `TDetail \| undefined` | The fetched item. `undefined` on first load, while loading, or if the query is disabled. |
| `isLoading` | `boolean` | `true` on the first fetch when there's no cached data |
| `isFetching` | `boolean` | `true` during any network request for this item |
| `isRefetching` | `boolean` | `true` during a background refetch while `item` is already showing |
| `isError` | `boolean` | `true` when the last fetch failed |
| `error` | `Error \| null` | The error from the last failed fetch |
| `refetch` | `() => Promise` | Manually re-fetch this item |

**Example:**

```tsx
function ContactDetailPage() {
  const { contactId } = useParams();

  // stringToId converts the URL string to a branded ContactId
  // When contactId is undefined (first render), the query stays disabled
  const { item: contact, isLoading, isError, error, refetch } = contactHooks.useGet(
    contactId ? stringToId<Contact.Id>(contactId) : undefined,
  );

  if (isLoading) return <DetailSkeleton />;
  if (isError)   return <ErrorBanner message={error?.message} onRetry={refetch} />;
  if (!contact)  return null;

  return (
    <div>
      <h1>{contact.name}</h1>
      <p>Email: {contact.email}</p>
      <p>Phone: {contact.phone}</p>
      <p>Created by: {contact.createdBy.name}</p>
      <p>Notes: {contact.notes}</p>
    </div>
  );
}
```

---

#### `useMutations`

**What it does:** Returns three mutation objects — `create`, `update`, and `remove`. When any mutation completes (success or error), TanStack Query automatically invalidates the cache for this resource and triggers a background refetch.

**Signature:**

```ts
contactHooks.useMutations(): {
  create: UseMutationResult<Contact.Detail, Error, Contact.Apis.CreatePayload>;
  update: UseMutationResult<Contact.Detail, Error, { _id: Contact.Id; payload: Contact.Apis.UpdatePayload }>;
  remove: UseMutationResult<Contact.Detail, Error, Contact.Id>;
}
```

> `remove` is named `remove` instead of `delete` because `delete` is a reserved keyword in JavaScript.

**Each mutation object has these fields:**

| Field | Type | Description |
|---|---|---|
| `mutate(variables)` | `(vars) => void` | Fire and forget. Errors are caught internally unless you pass `onError`. Good for simple actions like delete buttons. |
| `mutateAsync(variables)` | `(vars) => Promise<TDetail>` | Returns a Promise. Use with `await` and `try/catch` when you need sequential control — like closing a modal only after success. |
| `isPending` | `boolean` | `true` while the request is in flight. Use to disable and show loading on buttons. |
| `isSuccess` | `boolean` | `true` after the last call completed successfully |
| `isError` | `boolean` | `true` after the last call threw an error |
| `error` | `Error \| null` | The error from the last failed call |
| `data` | `TDetail \| undefined` | The server response from the last successful call |
| `reset()` | `() => void` | Resets `isSuccess`, `isError`, and `error` back to the idle state |

**The key pattern — `await` before closing a modal:**

```tsx
function ContactsPage() {
  const modal = useModal<Contact.Base>();
  const { create, update, remove } = contactHooks.useMutations();

  const handleSave = async (formData: Contact.Apis.CreatePayload | Contact.Apis.UpdatePayload) => {
    try {
      if (modal.data) {
        // edit mode
        await update.mutateAsync({
          _id:     modal.data._id,
          payload: formData as Contact.Apis.UpdatePayload,
        });
      } else {
        // create mode
        await create.mutateAsync(formData as Contact.Apis.CreatePayload);
      }

      // Only runs if the request succeeded
      modal.closeModal();
      toast.success(modal.data ? 'Contact updated' : 'Contact created');

    } catch (err) {
      // Modal stays open — all form fields still there
      // User only needs to fix the one thing that was wrong
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <>
      <Button onClick={modal.openCreateModal}>+ New</Button>

      {list.map(contact => (
        <ContactRow
          key={contact._id}
          contact={contact}
          onEdit={()   => modal.openEditModal(contact)}
          onDelete={() => remove.mutate(contact._id)} // fire and forget — list refreshes automatically
        />
      ))}

      <ContactModal
        open={modal.isOpen}
        data={modal.data}
        isSaving={create.isPending || update.isPending}
        onSave={handleSave}
        onClose={modal.closeModal}
      />
    </>
  );
}
```

---

#### `useInfinite`

**What it does:** Loads a paginated list where each new page is fetched on demand — "Load more" or infinite scroll. Internally uses TanStack Query's `useInfiniteQuery`.

**Signature:**

```ts
contactHooks.useInfinite(params?: VSQueryParams): UseInfiniteQueryResult<VSListResult<Contact.Base>, Error>
```

**Input:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `params` | `VSQueryParams` | `defaultParams` | Filters and limit. The `page` is managed internally — don't pass it. |

**Key output fields:**

| Field | Type | Description |
|---|---|---|
| `data.pages` | `VSListResult<TBase>[]` | Array of all fetched pages. Each has `items` and `pagination`. |
| `fetchNextPage()` | `() => void` | Fetches the next page. Only does anything when `hasNextPage` is `true`. |
| `hasNextPage` | `boolean` | `false` when you've reached the last page |
| `isFetchingNextPage` | `boolean` | `true` while the next page is loading |
| `isLoading` | `boolean` | `true` on the very first fetch |
| `isError` | `boolean` | `true` when a fetch failed |

**Example — "Load more" button:**

```tsx
function ContactsFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    contactHooks.useInfinite({ limit: 15 });

  // Flatten all pages into one array for rendering
  const contacts = data?.pages.flatMap(page => page.items) ?? [];

  if (isLoading) return <Spinner />;

  return (
    <div>
      {contacts.map(contact => (
        <ContactCard key={contact._id} contact={contact} />
      ))}

      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          loading={isFetchingNextPage}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}

      {!hasNextPage && contacts.length > 0 && (
        <p className="text-muted">You've seen all {contacts.length} contacts.</p>
      )}
    </div>
  );
}
```

---

### Optimistic Updates

**What it does:** Makes create, update, and delete feel instant by applying the change to the UI cache immediately — before the API responds. If the request fails, the change is automatically rolled back. If it succeeds, the server data replaces the optimistic version.

You configure this by passing an `optimistic` object to `createResourceHooks`. Each handler is a pure function that takes the current cached list and returns a new one.

**Configuration:**

```ts
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  optimistic: {
    update: (cache, { _id, payload }) =>
      cache.map(item => item._id === _id ? { ...item, ...payload } : item),

    remove: (cache, id) =>
      cache.filter(item => item._id !== id),

    create: (cache, { payload, tempId }) => [
      {
        ...payload,
        _id:       tempId as Contact.Id, // library-generated UUID, replaced by real ID on success
        createdAt: new Date().toISOString(),
      },
      ...cache,
    ],

    // Called after rollback completes — cache is already restored when this fires
    onError: (error, operation) => {
      toast.error(`Failed to ${operation.kind}: ${error.message}`);
    },

    // Called after the server confirms the operation
    onSuccess: (operation) => {
      if (operation.kind === 'create') analytics.track('contact_created');
    },
  },
});
```

**Handler reference — `VSOptimisticHandlers`:**

| Handler | Input | Output | What it does |
|---|---|---|---|
| `update(cache, { _id, payload })` | `TBase[]`, `{ _id: TId, payload: TUpdate }` | `TBase[]` | Apply the update to the matching item. Return a new array — never mutate in place. |
| `updateSingle(current, payload)` | `TDetail`, `TUpdate` | `TDetail` | Override the default shallow-merge on the `useGet` cache. Use when `TDetail` has nested objects that need deep merging. |
| `remove(cache, id)` | `TBase[]`, `TId` | `TBase[]` | Filter out the item. Pagination totals are adjusted automatically. |
| `create(cache, { payload, tempId })` | `TBase[]`, `{ payload: TCreate, tempId: string }` | `TBase[]` | Insert the new item. `tempId` is a UUID — use it as `_id`. Pagination totals are adjusted automatically. |
| `onError(error, operation)` | `Error`, `VSOptimisticOperation` | `void` | Notification after rollback. Cache is already correct when this fires. |
| `onSuccess(operation)` | `VSOptimisticOperation` | `void` | Notification after server confirmation. |

**`VSOptimisticOperation` — passed to `onError` and `onSuccess`:**

```ts
type VSOptimisticOperation<TId, TCreate, TUpdate> =
  | { kind: 'create'; payload: TCreate; tempId: string }
  | { kind: 'update'; _id: TId; payload: TUpdate }
  | { kind: 'remove'; _id: TId }
```

Check `operation.kind` to handle each mutation type differently in your callbacks.

**How concurrent rollback works:**

The library keeps an ordered stack of pending operations and a "before" snapshot of the cache. If you delete item A, rename item B, and create item C all at the same time, and B's rename fails:
1. Item B's rename is removed from the stack
2. The cache is restored to the original "before" snapshot
3. The delete for A and the create for C are replayed in order

None of A's or C's in-flight changes are lost.

---

### `createSocketHooks`

**What it does:** Generates three typed hooks — `useSocketEmit`, `useSocketListener`, and `useSocketConnection` — bound to a specific Socket.IO socket instance. Your event type definitions are passed once to the factory, so every hook call site is fully typed without generics.

Requires `socket.io-client ≥4.6.0`.

**Signature:**

```ts
function createSocketHooks<TClientEvents, TServerEvents>(
  socket: Socket<TServerEvents, TClientEvents>
): { useSocketEmit, useSocketListener, useSocketConnection }
```

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `socket` | `Socket<TServerEvents, TClientEvents>` | A socket.io-client `Socket` instance — you own it and configure it |

**Output:** `{ useSocketEmit, useSocketListener, useSocketConnection }`

**Setup — two files, done once:**

```ts
// 1. Declare your event types (global, project-level)
// socket-protocols.d.ts
declare global {
  interface IClientToServerEvents {
    'join-room':      (roomId: string) => void;
    'send-message':   (msg: { text: string; roomId: string }) => void;
    'update-profile': (name: string, callback: (res: { status: 'ok' | 'error' }) => void) => void;
  }
  interface IServerToClientEvents {
    'new-message':  (data: { text: string; from: string; roomId: string }) => void;
    'user-joined':  (userId: string) => void;
    error:          (code: number, msg: string) => void;
  }
}
```

```ts
// 2. Create the socket and the hooks
// services/socket-hooks.ts
import { createSocketHooks } from '@void-snippets/react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  autoConnect:          false, // you call connect() explicitly — don't auto-connect on import
  reconnectionAttempts: 5,
  reconnectionDelay:    2000,
});

export const { useSocketEmit, useSocketListener, useSocketConnection } =
  createSocketHooks<IClientToServerEvents, IServerToClientEvents>(socket);
```

Import `useSocketEmit`, `useSocketListener`, and `useSocketConnection` from this file throughout your app.

---

#### `useSocketEmit`

**What it does:** Returns two functions for sending events to the server. Both are stable references — they don't re-create on re-renders.

**Signature:**

```ts
useSocketEmit(): { emit, emitWithAck }
```

**`emit(event, ...args): void`**

Sends an event without waiting for the server to respond. Throws synchronously if the socket is not connected.

| Input | Type | Description |
|---|---|---|
| `event` | `keyof TClientEvents` | The event name — autocompleted from your interface |
| `...args` | Inferred from event type | The event arguments, minus any trailing ACK callback |

| Output | Type |
|---|---|
| Return value | `void` |

```ts
const { emit } = useSocketEmit();

// TypeScript knows join-room takes one string argument
emit('join-room', roomId);

// TypeScript knows send-message takes { text, roomId }
emit('send-message', { text: 'Hello everyone!', roomId });

// ❌ TypeScript error — wrong argument shape
emit('send-message', 'just a string');
```

**`emitWithAck(event, ...args): Promise<AckResponse>`**

Sends an event and waits for the server to acknowledge with a response. Returns a rejected `Promise` if the socket is not connected. TypeScript gives a compile-time error if you call this on an event that has no callback in its type signature.

| Input | Type | Description |
|---|---|---|
| `event` | Keys of `TClientEvents` that end with a callback | Only events declared with a trailing callback function |
| `...args` | Inferred from event type | The event arguments, minus the callback |

| Output | Type | Description |
|---|---|---|
| Return value | `Promise<AckResponse>` | Resolves with the first argument of the callback — inferred from your event type |

```ts
const { emitWithAck } = useSocketEmit();

// update-profile is declared as: (name: string, callback: (res: { status: 'ok' | 'error' }) => void) => void
// emitWithAck strips the callback and returns Promise<{ status: 'ok' | 'error' }>
const result = await emitWithAck('update-profile', 'New Name');

if (result.status === 'ok') toast.success('Name updated!');
else toast.error('Server rejected the update');

// ❌ TypeScript error — join-room has no callback in its type
await emitWithAck('join-room', roomId);
```

---

#### `useSocketListener`

**What it does:** Subscribes to a server event for the lifetime of the component. The listener is added when the component mounts and removed when it unmounts — no manual cleanup. Uses a ref internally to always call the latest version of your handler, so inline arrow functions are safe.

**Signature:**

```ts
useSocketListener(
  event:    keyof TServerEvents,
  handler:  TServerEvents[typeof event],
  options?: { enabled?: boolean }
): void
```

**Input:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `event` | `keyof TServerEvents` | required | The event name to listen for |
| `handler` | Inferred function type | required | Called every time the event fires. Always uses the latest version — no `useCallback` needed. |
| `options.enabled` | `boolean` | `true` | Pass `false` to deactivate the listener without unmounting. Flip dynamically. |

**Output:** `void` — setup and cleanup are handled automatically.

**Example:**

```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { isConnected } = useSocketConnection();

  // This handler is always active while the component is mounted.
  // The inline arrow function is fine — the ref pattern ensures it's always current.
  useSocketListener('new-message', (data) => {
    setMessages(prev => [...prev, { text: data.text, from: data.from }]);
  });

  // Only active once we're actually connected and in a room
  useSocketListener('user-joined', (userId) => {
    toast.info(`${userId} joined the room`);
  }, { enabled: isConnected && !!roomId });

  return <MessageList messages={messages} />;
}
```

---

#### `useSocketConnection`

**What it does:** Tracks the socket's connection state reactively and exposes `connect`/`disconnect` controls. Safe to call from multiple components simultaneously.

**Signature:**

```ts
useSocketConnection(): VSSocketConnectionReturn
```

**Output — `VSSocketConnectionReturn`:**

| Field | Type | Description |
|---|---|---|
| `isConnected` | `boolean` | `true` when the socket has an active confirmed connection |
| `isConnecting` | `boolean` | `true` during the initial connection attempt or while trying to reconnect |
| `socketId` | `string \| undefined` | The server-assigned socket ID. `undefined` when disconnected. |
| `error` | `Error \| null` | The most recent connection error. `null` when connected or before any attempt. |
| `connect()` | `() => void` | Initiates a connection. No-op if already connected. |
| `disconnect()` | `() => void` | Gracefully closes the connection and stops reconnection attempts. |

**Events tracked internally:**

| Event | Source | What changes |
|---|---|---|
| `connect` | socket | `isConnected → true`, `isConnecting → false`, `socketId` updated, `error → null` |
| `disconnect` | socket | `isConnected → false`, `isConnecting → false`, `socketId → undefined` |
| `connect_error` | socket | `isConnected → false`, `isConnecting → false`, `error` set |
| `reconnect_attempt` | Manager | `isConnecting → true` |
| `reconnect_failed` | Manager | `isConnecting → false`, `error` set |

**Example:**

```tsx
function AppShell() {
  const { connect, disconnect, isConnected, isConnecting, error } =
    useSocketConnection();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return (
    <>
      {isConnecting && (
        <Banner color="blue">Connecting to server…</Banner>
      )}
      {error && !isConnecting && (
        <Banner color="red">
          Connection failed: {error.message}
          <Button size="sm" onClick={connect}>Retry</Button>
        </Banner>
      )}
      <App />
    </>
  );
}
```

---

### `createRouteContract`

**What it does:** Converts a tree of `defineRoute()` definitions into a typed route contract. Every route gets a `build()` function that TypeScript checks at compile time — missing path params, wrong types in search params, forgotten required fields are all caught before the code runs.

Requires `react-router ≥7.0.0`.

**Signature:**

```ts
function createRouteContract<T extends RouteTree>(tree: T): ProcessedTree<T>
```

**Input:** A nested object of `defineRoute()` calls.

**Output:** The same tree shape, with every route leaf replaced by a `ProcessedRoute` that has `path`, your metadata fields, and `build()`.

**Setup — one file, imported everywhere:**

```ts
// routes.ts
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
    }),
  },
});
```

---

#### `defineRoute`

**What it does:** Defines a single route with a path and optional metadata. Chain `.search<T>()` immediately after to declare the route's URL search parameter types.

**Signature:**

```ts
function defineRoute(path: string, config?: RouteMetadata): RouteDefinition
```

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `path` | `string` | The route's absolute URL path. **Must be absolute** — see note below. |
| `config` | `RouteMetadata` (optional) | Metadata that flows through to the processed route. |

**`RouteMetadata` fields:**

| Field | Type | Description |
|---|---|---|
| `permissions` | `string[]` | Access control identifiers. Read via `route.handle` in your React Router config. |
| `breadcrumb` | `string` | Human-readable label for breadcrumb navigation. |
| `title` | `string` | Page title — great for `<head>` management. |
| `meta` | `Record<string, unknown>` | Any custom metadata — loader IDs, analytics events, feature flags. |

**`.search<T>()` — adding typed search params:**

Chain immediately after `defineRoute()`. The generic type argument declares what search params this route accepts. No value is passed — it's a pure TypeScript operation.

```ts
// No search params at all — build() takes no arguments
defineRoute('/dashboard/settings')

// All search params optional — build() argument is optional
defineRoute('/auth/login').search<{ redirect?: string }>()

// Mixed — page is required, others are optional
defineRoute('/dashboard/users').search<{ page: number; sort?: 'asc' | 'desc' }>()

// Path params + optional search — TypeScript extracts :userId automatically
defineRoute('/dashboard/users/:userId').search<{ tab?: 'profile' | 'settings' }>()

// Path params only, no search
defineRoute('/dashboard/users/:userId/posts/:postId')
```

> **Use absolute paths.** Write `/dashboard/users` not `` `${DASHBOARD}/${USERS}` ``. TypeScript extracts path parameter names (``:userId``) using template literal type inference, and parent+child string concatenation causes exponential type-checking work as your app grows. Absolute paths keep your IDE fast.

---

#### `build()`

**What it does:** Constructs the full URL string for the route. The function signature is automatically shaped by what the route has — TypeScript tells you exactly what arguments are required or optional.

**Four possible signatures:**

| Route shape | Signature | Example |
|---|---|---|
| No params, no search | `build() → string` | `'/dashboard/settings'` |
| No params, all-optional search | `build(options?) → string` | `'/auth/login'` or `'/auth/login?redirect=%2F'` |
| Required path params | `build({ params }) → string` | `'/users/123'` |
| Required search key | `build({ search }) → string` | `'/users?page=1'` |

**Examples:**

```ts
// Simple — no arguments needed at all
AppRoutes.dashboard.settings.build()
// → '/dashboard/settings'

// Optional search — you can call it with or without
AppRoutes.auth.login.build()
// → '/auth/login'
AppRoutes.auth.login.build({ search: { redirect: '/dashboard' } })
// → '/auth/login?redirect=%2Fdashboard'

// Required path param
AppRoutes.dashboard.users.detail.build({ params: { userId: '123' } })
// → '/dashboard/users/123'

// Required path param + optional search
AppRoutes.dashboard.users.detail.build({ params: { userId: '123' }, search: { tab: 'settings' } })
// → '/dashboard/users/123?tab=settings'

// Required search key (page is not optional)
AppRoutes.dashboard.users.list.build({ search: { page: 1 } })
// → '/dashboard/users?page=1'
AppRoutes.dashboard.users.list.build({ search: { page: 2, sort: 'asc', q: 'john' } })
// → '/dashboard/users?page=2&sort=asc&q=john'

// TypeScript catches these at compile time — before the browser ever runs
AppRoutes.dashboard.users.detail.build()                          // ❌ params required
AppRoutes.dashboard.users.detail.build({ params: {} })            // ❌ userId required
AppRoutes.dashboard.users.list.build()                            // ❌ search.page required
AppRoutes.dashboard.users.list.build({ search: { page: '1' } })  // ❌ page must be number
```

**Wiring up React Router — one source of truth:**

```ts
// router.tsx
import { createBrowserRouter } from 'react-router';
import { AppRoutes } from './routes';

const router = createBrowserRouter([
  {
    path:    AppRoutes.auth.login.path,
    element: <LoginPage />,
  },
  {
    path:    AppRoutes.dashboard.root.path,
    element: <DashboardLayout />,
    handle: {
      title:      AppRoutes.dashboard.root.title,
      breadcrumb: AppRoutes.dashboard.root.breadcrumb,
    },
    children: [
      {
        path:    AppRoutes.dashboard.users.list.path,
        element: <UsersListPage />,
        handle:  {
          permissions: AppRoutes.dashboard.users.list.permissions,
          breadcrumb:  AppRoutes.dashboard.users.list.breadcrumb,
        },
      },
      {
        path:    AppRoutes.dashboard.users.detail.path,  // '/dashboard/users/:userId'
        element: <UserDetailPage />,
        handle:  { permissions: AppRoutes.dashboard.users.detail.permissions },
      },
    ],
  },
]);
```

**Navigating:**

```tsx
// Programmatic navigation
const navigate = useNavigate();
navigate(AppRoutes.dashboard.users.detail.build({ params: { userId: contact._id } }));

// Link component
<Link to={AppRoutes.auth.login.build({ search: { redirect: location.pathname } })}>
  Log in
</Link>
```

---

#### `useTypedSearchParams`

**What it does:** Reads URL search params as a typed object matching the shape you declared on the route. Gives you a type-safe setter that merges updates into the existing URL without losing other params.

**Signature:**

```ts
function useTypedSearchParams<P extends string, S>(
  route: ProcessedRoute<P, S>
): {
  search:      Readonly<Partial<S>>;
  setSearch:   (update: Partial<S>) => void;
  clearSearch: () => void;
}
```

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `route` | `ProcessedRoute<P, S>` | Any route from your `AppRoutes`. TypeScript infers `S` automatically — no generic needed. |

**Output:**

| Field | Type | Description |
|---|---|---|
| `search` | `Readonly<Partial<S>>` | Current search params as a typed object. `Partial` because the URL might not have every declared key. |
| `setSearch(update)` | `(update: Partial<S>) => void` | Merges the given keys into the URL. Keys you don't mention are left unchanged. Pass `undefined` for a key to remove it. |
| `clearSearch()` | `() => void` | Removes all search params from the URL. |

> ⚠️ **All URL values are strings at runtime.** React Router's `useSearchParams` returns everything as a string. If you declare `page: number`, `search.page` will be `"1"` (a string) at runtime even though TypeScript says it's a `number`. Coerce where needed: `Number(search.page ?? 1)`. This is a deliberate trade-off — adding a runtime schema library like Zod would be a much heavier dependency for a marginal gain.

**Example:**

```tsx
// This component lives at /dashboard/users
// The route is: .search<{ page: number; sort?: 'asc' | 'desc'; q?: string }>()
function UsersListPage() {
  const { queryParams, onPaginationChange, resetPagination } = usePagination(1, 20);
  const { search, setSearch, clearSearch } = useTypedSearchParams(AppRoutes.dashboard.users.list);

  // Coerce page from string → number (URL values are always strings at runtime)
  const page = Number(search.page ?? 1);

  const { list, pagination, isLoading } = contactHooks.useList({
    page,
    limit:  queryParams.limit,
    sort:   search.sort,
    search: search.q,
  });

  return (
    <div>
      <div className="toolbar">
        <input
          placeholder="Search contacts…"
          value={search.q ?? ''}
          onChange={e => {
            // Update q, reset to page 1 — other params (sort) are preserved
            setSearch({ q: e.target.value || undefined, page: 1 });
            resetPagination();
          }}
        />
        <select
          value={search.sort ?? ''}
          onChange={e => setSearch({ sort: e.target.value as 'asc' | 'desc' || undefined })}
        >
          <option value="">Default</option>
          <option value="asc">A → Z</option>
          <option value="desc">Z → A</option>
        </select>
        <Button variant="ghost" onClick={clearSearch}>Clear all filters</Button>
      </div>

      {isLoading ? <Spinner /> : (
        <ContactsTable contacts={list} />
      )}

      <Pagination
        current={pagination.page}
        pageSize={pagination.limit}
        total={pagination.totalDocuments}
        onChange={(page, limit) => {
          onPaginationChange(page, limit);
          // Merge page into URL — sort and q are preserved
          setSearch({ page });
        }}
      />
    </div>
  );
}
```

---

### `useAlertMessage`

**What it does:** Manages the lifecycle of a single alert or notification — text, severity, and visibility. You own the UI component; this hook owns the state. The alert hides itself automatically after a configurable delay.

**Signature:**

```ts
function useAlertMessage(autoHideDuration?: number): {
  alert:     VSAlertState;
  showAlert: (message: ReactNode | string, type?: VSAlertVariant) => void;
  hideAlert: () => void;
}
```

**Input:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `autoHideDuration` | `number` (ms) | `3000` | How long the alert stays visible before auto-hiding. Pass `0` to never auto-hide. |

**Output:**

| Field | Type | Description |
|---|---|---|
| `alert.message` | `ReactNode \| string` | The text or element to display in the alert |
| `alert.type` | `'success' \| 'info' \| 'error'` | Severity — use to pick the alert colour |
| `alert.isVisible` | `boolean` | Whether to render the alert |
| `showAlert(message, type?)` | function | Show the alert. `type` defaults to `'info'` if not provided. |
| `hideAlert()` | function | Immediately hide the alert without waiting for the timer. |

**Example:**

```tsx
function ContactFormPage() {
  // 4 seconds then auto-hides
  const { alert, showAlert, hideAlert } = useAlertMessage(4000);

  const handleSubmit = async (data: Contact.Apis.CreatePayload) => {
    const [err] = await catchError(ContactsApis.create(data));
    if (err) {
      showAlert(err.message, 'error');
    } else {
      showAlert('Contact created successfully!', 'success');
    }
  };

  return (
    <>
      {alert.isVisible && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
          <button onClick={hideAlert}>✕</button>
        </div>
      )}
      <ContactForm onSubmit={handleSubmit} />
    </>
  );
}
```

---

### `useAsyncState`

**What it does:** A lightweight state machine for any async operation. Tracks four states — idle, pending, success, error — and provides an `execute` function that manages all transitions. Useful when you need to track loading/error state for something that isn't an API resource managed by TanStack Query.

**Signature:**

```ts
function useAsyncState<T>(initialData?: T | null): VSUseAsyncStateReturn<T>
```

**Input:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `initialData` | `T \| null` | `null` | An optional pre-populated starting value for `data`. |

**Output — `VSUseAsyncStateReturn<T>`:**

| Field | Type | Description |
|---|---|---|
| `data` | `T \| null` | The result of the last successful `execute` call |
| `status` | `'idle' \| 'pending' \| 'success' \| 'error'` | Current state of the machine |
| `error` | `Error \| null` | The error from the last failed `execute` |
| `isLoading` | `boolean` | Shorthand for `status === 'pending'` |
| `isSuccess` | `boolean` | Shorthand for `status === 'success'` |
| `isError` | `boolean` | Shorthand for `status === 'error'` |
| `execute(fn, options?)` | async function | Runs your async function, manages state transitions, returns a `catchError` tuple |
| `setData(value)` | function | Manually set `data` — also sets `status` to `'success'` |
| `setError(error)` | function | Manually set `error` — also sets `status` to `'error'` |
| `reset()` | function | Returns everything to `{ status: 'idle', data: null, error: null }` |

**`execute` signature:**

```ts
execute(
  asyncFn: () => Promise<T>,
  options?: {
    onSuccess?: (data: T)        => void;
    onError?:   (error: Error)   => void;
  }
): Promise<[Error, null] | [null, T]>
```

Returns a `catchError`-style tuple so you can act on the result in the same scope.

**Example:**

```tsx
function ExportPage() {
  const { isLoading, isSuccess, isError, error, execute, reset } =
    useAsyncState<{ downloadUrl: string }>();

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const [err, result] = await execute(
      () => ContactsApis.export({ format }),
      {
        onSuccess: (res) => toast.success('Export ready!'),
        onError:   (err) => toast.error(err.message),
      },
    );

    // Can also act on the tuple directly
    if (result) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  return (
    <div>
      <h2>Export Contacts</h2>

      {isError && (
        <ErrorBanner message={error?.message}>
          <Button onClick={reset}>Try again</Button>
        </ErrorBanner>
      )}

      {isSuccess && (
        <SuccessBanner>Your file is ready. It will open automatically.</SuccessBanner>
      )}

      <Button onClick={() => handleExport('csv')}  loading={isLoading}>Export CSV</Button>
      <Button onClick={() => handleExport('xlsx')} loading={isLoading}>Export Excel</Button>
    </div>
  );
}
```

---

### `useCallTimer`

**What it does:** Displays how long something has been running as a live `"MM:SS"` string. Updates every second. Cleans up its interval automatically when the component unmounts — no memory leaks.

**Signature:**

```ts
function useCallTimer(startedAt?: number | null): string
```

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `startedAt` | `number \| null \| undefined` | A Unix timestamp in milliseconds — e.g. `Date.now()` or the value stored on your call object. Pass `null` or `undefined` to display `"00:00"`. |

**Output:**

| Type | Format | Example |
|---|---|---|
| `string` | `"MM:SS"` | `"00:00"` → `"00:01"` → ... → `"04:23"` |

**Example:**

```tsx
function CallBanner({ call }: { call: ActiveCall | null }) {
  const elapsed = useCallTimer(call?.startedAt ?? null);

  if (!call) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white rounded-lg p-4 flex items-center gap-3">
      <PhoneIcon className="animate-pulse" />
      <div>
        <p className="font-medium">Active call — {call.contactName}</p>
        <p className="text-sm opacity-80">{elapsed}</p>  {/* "04:23" */}
      </div>
      <Button variant="destructive" onClick={() => endCall(call.id)}>
        End
      </Button>
    </div>
  );
}
```

---

### `useModal`

**What it does:** Manages modal state for both "create" and "edit" flows from a single hook instance. Tracks whether the modal is open, what data it's editing (null in create mode, the entity in edit mode), and a loading flag for the save button.

**Signature:**

```ts
function useModal<T = unknown>(): VSModalReturn<T>
```

**Generic `T`:** The type of the entity being edited. `data` is `T | null` — `null` means create mode, `T` means edit mode.

**Output — `VSModalReturn<T>`:**

| Field | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Whether the modal is currently visible |
| `data` | `T \| null` | `null` in create mode; the entity in edit mode |
| `isLoading` | `boolean` | Loading flag — wire to your save button's `loading` prop |
| `openCreateModal()` | `() => void` | Opens the modal with `data = null` |
| `openEditModal(entity)` | `(entity: T) => void` | Opens the modal with `data = entity` |
| `closeModal()` | `() => void` | Closes the modal and resets `data` to `null` |
| `setLoading(bool)` | `(loading: boolean) => void` | Manually control the loading flag |
| `setModal(open, data?)` | `(open: boolean, data?: T \| null) => void` | Low-level — set open state and data in one call |

**Example:**

```tsx
function UsersPage() {
  const modal = useModal<User>();

  // Distinguish create vs edit from modal.data
  const isEditing = modal.data !== null;

  return (
    <>
      <Button onClick={modal.openCreateModal}>+ New User</Button>

      <UserTable
        onEdit={(user) => modal.openEditModal(user)}
      />

      <UserModal
        isOpen={modal.isOpen}
        title={isEditing ? `Edit ${modal.data?.name}` : 'New User'}
        // null = empty form fields; User = pre-filled fields
        initialData={modal.data}
        isSaving={modal.isLoading}
        onSave={async (formData) => {
          modal.setLoading(true);
          try {
            if (isEditing) {
              await updateUser(modal.data!._id, formData);
              toast.success('User updated');
            } else {
              await createUser(formData);
              toast.success('User created');
            }
            modal.closeModal();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed');
          } finally {
            modal.setLoading(false);
          }
        }}
        onClose={modal.closeModal}
      />
    </>
  );
}
```

---

### `usePagination`

**What it does:** Manages page and limit state and produces a ready-to-use `queryParams` object for `useList`. Also handles the common pattern of resetting to page 1 when a filter changes.

**Signature:**

```ts
function usePagination(initialPage?: number, initialLimit?: number): VSPaginationReturn
```

**Input:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `initialPage` | `number` | `1` | The starting page number |
| `initialLimit` | `number` | `10` | The starting page size |

**Output — `VSPaginationReturn`:**

| Field | Type | Description |
|---|---|---|
| `page` | `number` | Current page number |
| `limit` | `number` | Current items-per-page |
| `queryParams` | `{ page, limit }` | Ready to spread into `useList()` |
| `onPaginationChange(page, limit)` | function | Updates both page and limit at once — wire to your `Pagination` component |
| `resetPagination()` | function | Resets to page 1. Call this whenever a filter or search term changes. |
| `setPage(page)` | function | Update just the page number |
| `setLimit(limit)` | function | Update just the page size |

**Example:**

```tsx
function ContactsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('all');

  const { queryParams, onPaginationChange, resetPagination } = usePagination(1, 25);

  const { list, pagination, isLoading } = contactHooks.useList({
    ...queryParams,
    search,
    status: status === 'all' ? undefined : status,
  });

  // Reset to page 1 when search or filter changes — otherwise you could be on
  // page 5 of a result set that now only has 1 page
  const handleSearchChange = (value: string) => {
    setSearch(value);
    resetPagination();
  };

  const handleStatusChange = (value: typeof status) => {
    setStatus(value);
    resetPagination();
  };

  return (
    <>
      <SearchInput value={search} onChange={handleSearchChange} />
      <StatusFilter value={status} onChange={handleStatusChange} />

      <ContactsTable contacts={list} loading={isLoading} />

      <Pagination
        currentPage={pagination.page}
        pageSize={pagination.limit}
        total={pagination.totalDocuments}
        onChange={onPaginationChange}
      />
    </>
  );
}
```

---

## Full Example

A complete contacts feature, built from scratch with every layer shown.

**Step 1 — Types**

```ts
// contacts/contacts.types.ts
import type { VSId } from '@void-snippets/core';

export namespace Contact {
  export type Id = VSId<string, 'Contact'>;
  export interface Base  { _id: Id; name: string; email: string; phone: string; }
  export interface Detail extends Base { createdBy: { name: string }; notes: string; createdAt: string; }
  export namespace Apis {
    export interface Create { name: string; email: string; phone: string; }
    export interface Update { name?: string; email?: string; phone?: string; notes?: string; }
  }
}
```

**Step 2 — HTTP service**

```ts
// contacts/contacts.api.ts
import { ResourceService } from '@void-snippets/client';
import type { Contact } from './contacts.types';

export class ContactsApiService extends ResourceService<
  Contact.Id, Contact.Base, Contact.Detail, Contact.Apis.Create, Contact.Apis.Update
> { constructor() { super('/contacts'); } }

export const ContactsApis = new ContactsApiService();
```

**Step 3 — React hooks**

```ts
// contacts/contacts.hooks.ts
import { createResourceHooks } from '@void-snippets/react';
import { ContactsApis } from './contacts.api';
import type { Contact } from './contacts.types';

export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  optimistic: {
    update: (cache, { _id, payload }) => cache.map(c => c._id === _id ? { ...c, ...payload } : c),
    remove: (cache, id) => cache.filter(c => c._id !== id),
    create: (cache, { payload, tempId }) => [
      { ...payload, _id: tempId as Contact.Id },
      ...cache,
    ],
    onError: (err, op) => toast.error(`Failed to ${op.kind}: ${err.message}`),
  },
});
```

**Step 4 — Routes**

```ts
// routes.ts
import { createRouteContract, defineRoute } from '@void-snippets/react';

export const AppRoutes = createRouteContract({
  contacts: {
    list: defineRoute('/contacts', {
      breadcrumb: 'Contacts',
      title: 'Contact Management',
    }).search<{ page: number; sort?: 'asc' | 'desc'; q?: string }>(),

    detail: defineRoute('/contacts/:contactId', {
      breadcrumb: 'Contact Detail',
    }),
  },
});
```

**Step 5 — The page component**

```tsx
// ContactsPage.tsx
import { contactHooks } from './contacts.hooks';
import { AppRoutes } from '@/routes';

export function ContactsPage() {
  const navigate  = useNavigate();
  const modal     = useModal<Contact.Base>();
  const { alert, showAlert, hideAlert } = useAlertMessage(4000);
  const { queryParams, onPaginationChange, resetPagination } = usePagination(1, 20);
  const { search, setSearch, clearSearch } = useTypedSearchParams(AppRoutes.contacts.list);

  const { list, pagination, isLoading, isRefetching, isError, error, refetch } =
    contactHooks.useList({
      ...queryParams,
      sort: search.sort,
      q:    search.q,
    });

  const { create, update, remove } = contactHooks.useMutations();

  const handleSave = async (formData: Contact.Apis.Create | Contact.Apis.Update) => {
    try {
      if (modal.data) {
        await update.mutateAsync({ _id: modal.data._id, payload: formData as Contact.Apis.Update });
        showAlert('Contact updated!', 'success');
      } else {
        await create.mutateAsync(formData as Contact.Apis.Create);
        showAlert('Contact created!', 'success');
      }
      modal.closeModal();
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
  };

  if (isLoading) return <TableSkeleton />;
  if (isError)   return <ErrorState message={error?.message} onRetry={refetch} />;

  return (
    <>
      {alert.isVisible && (
        <Alert severity={alert.type} onClose={hideAlert}>{alert.message}</Alert>
      )}

      <PageHeader title="Contacts">
        <Button onClick={modal.openCreateModal}>+ New Contact</Button>
      </PageHeader>

      <Toolbar>
        <SearchInput
          value={search.q ?? ''}
          onChange={q => { setSearch({ q: q || undefined, page: 1 }); resetPagination(); }}
          placeholder="Search contacts…"
        />
        <SortSelect
          value={search.sort}
          onChange={sort => setSearch({ sort })}
        />
        {(search.q || search.sort) && (
          <Button variant="ghost" size="sm" onClick={clearSearch}>Clear filters</Button>
        )}
      </Toolbar>

      {isRefetching && <LinearProgress />}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map(contact => (
            <TableRow key={contact._id}>
              <TableCell>{contact.name}</TableCell>
              <TableCell>{contact.email}</TableCell>
              <TableCell>{contact.phone}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(
                    AppRoutes.contacts.detail.build({ params: { contactId: contact._id } })
                  )}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  onClick={() => modal.openEditModal(contact)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  loading={remove.isPending}
                  onClick={() => remove.mutate(contact._id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        currentPage={pagination.page}
        pageSize={pagination.limit}
        total={pagination.totalDocuments}
        onChange={(page, limit) => {
          onPaginationChange(page, limit);
          setSearch({ page });
        }}
      />

      <ContactModal
        open={modal.isOpen}
        mode={modal.data ? 'edit' : 'create'}
        initialData={modal.data}
        isSaving={create.isPending || update.isPending}
        onSave={handleSave}
        onClose={modal.closeModal}
      />
    </>
  );
}
```

---

## Build and Publish

```bash
pnpm install         # install all workspace dependencies
pnpm dev             # watch mode — rebuilds all packages on change
pnpm build           # production build for all packages
pnpm build:react     # build @void-snippets/react only

# Version and publish a single package
pnpm --filter @void-snippets/react exec npm version minor
pnpm --filter @void-snippets/react publish --access public --no-git-checks

# Publish all packages at once
pnpm publish:all
```

```
void-snippets/
├── packages/
│   ├── core/src/
│   ├── client/src/
│   └── react/src/
│       ├── hooks/     — createResourceHooks, useAlertMessage, useAsyncState, useCallTimer, useModal, usePagination
│       ├── socket/    — createSocketHooks
│       └── routing/   — createRouteContract, defineRoute, useTypedSearchParams
└── pnpm-workspace.yaml
```

---

## License

MIT © [shahtirthhh](https://github.com/shahtirthhh/void-snippets)
