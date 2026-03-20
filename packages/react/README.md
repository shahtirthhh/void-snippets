# @void-snippets/react

TanStack Query v5 hook factory for React. Generates a fully-typed set of hooks (`useList`, `useGet`, `useMutations`, `useInfinite`) from a `ResourceService` instance — with zero manual type annotations required.

## Installation

```bash
npm install @void-snippets/react @void-snippets/client @tanstack/react-query axios
```

---

## Quick Start

### 1. Configure axios once at your app entry point

```ts
// src/main.ts
import axios from 'axios';
import { configure } from '@void-snippets/client';

const axiosInstance = axios.create({ baseURL: 'https://api.example.com' });
configure(axiosInstance);
```

### 2. Set up TanStack Query

```tsx
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

### 3. Define a resource service

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
  constructor() {
    super('/contacts');
  }
}

export const ContactsApis = new ContactsApiService();
```

### 4. Create hooks

```ts
// contacts/contacts.hooks.ts
import { createResourceHooks } from '@void-snippets/react';
import { ContactsApis } from './contacts.api';

// All types are inferred from ContactsApis — no generics needed
export const contactHooks = createResourceHooks('contacts', ContactsApis);
```

### 5. Use in components

```tsx
// List with pagination
function ContactsList() {
  const { contacts, isContactsLoading, pagination } = contactHooks.useList({
    page: 1,
    limit: 20,
  });

  if (isContactsLoading) return <Spinner />;
  return contacts.map(c => <ContactCard key={c._id} contact={c} />);
}

// Single item
function ContactDetail({ id }: { id: Contact.Id }) {
  const { data, isLoading } = contactHooks.useGet(id);
  // data is typed as Contact.WithCreatedBy ✅
}

// Mutations (auto-invalidate the list on success)
function CreateContactForm() {
  const { create, update, delete: remove } = contactHooks.useMutations();

  return (
    <button onClick={() => create.mutate({ name: 'John' })}>
      Create
    </button>
  );
}

// Infinite scroll
function InfiniteContactsList() {
  const { data, fetchNextPage, hasNextPage } = contactHooks.useInfinite({ limit: 20 });
  const all = data?.pages.flatMap(p => p.items) ?? [];
}
```

---

## Custom API Response Shapes

By default the library expects this shape from your API:

```json
// List:   { "data": { "items": [], "page": 1, "limit": 10, "totalPages": 5, "totalDocuments": 42 } }
// Single: { "data": { "_id": "...", "name": "..." } }
```

If your API looks different, pass adapters as a third argument:

```ts
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  adapters: {
    fromList: (raw) => ({
      items: raw.results,
      pagination: {
        page: raw.meta.page,
        limit: raw.meta.perPage,
        totalPages: raw.meta.lastPage,
        totalDocuments: raw.meta.total,
      },
    }),
    fromSingle: (raw) => raw.payload,
  },
});
```

---

## Hook Reference

### `useList(params?)`
| Returned key | Type | Description |
|---|---|---|
| `[prefix]` | `TBase[]` | e.g. `contacts` for prefix `"contacts"` |
| `pagination` | `TPagination` | `{ page, limit, totalPages, totalDocuments }` |
| `is[Prefix]Loading` | `boolean` | e.g. `isContactsLoading` |
| `[prefix]Error` | `Error \| null` | e.g. `contactsError` |
| `invalidate[Prefix]` | `() => void` | e.g. `invalidateContacts` |

### `useGet(id, staleTime?)`
Returns `{ data, isLoading, error, refetch }`. Skips the query if `id` is empty.

### `useMutations()`
Returns `{ create, update, delete }` — each is a TanStack `UseMutationResult`. All auto-invalidate the list cache on success.

### `useInfinite(params?)`
Returns the standard TanStack `useInfiniteQuery` result with `items` and `pagination` per page.

---

## Part of the `@void-snippets` ecosystem

| Package | Description |
|---|---|
| `@void-snippets/core` | Shared types and utilities |
| `@void-snippets/client` | Framework-agnostic CRUD resource service (axios) |
| `@void-snippets/react` | This package |

## License

MIT
