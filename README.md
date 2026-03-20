# @void-snippets

A monorepo of TypeScript utilities for building clean, scalable applications.

## Packages

| Package | Description |
|---|---|
| [`@void-snippets/core`](./packages/core) | Shared types and adapter interfaces |
| [`@void-snippets/client`](./packages/client) | Framework-agnostic CRUD resource services (axios) |
| [`@void-snippets/react`](./packages/react) | TanStack Query v5 hook factory for React |

---

## Quick Start

### 1. Install

```bash
# Install all three packages
pnpm add @void-snippets/core @void-snippets/client @void-snippets/react

# Or just what you need
pnpm add @void-snippets/client         # backend / non-React projects
pnpm add @void-snippets/react          # React projects (includes client + core)
```

---

### 2. Configure axios (once, at app entry point)

```ts
// src/main.ts or src/index.ts
import axios from 'axios';
import { configure } from '@void-snippets/client';

const axiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  headers: { 'Content-Type': 'application/json' },
});

// Attach your interceptors, auth tokens, etc.
axiosInstance.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});

configure(axiosInstance); // <-- registers it globally
```

---

### 3. Define a resource service

```ts
// contacts/contacts.api.ts
import { ResourceService } from '@void-snippets/client';
import type { Contact } from './contacts.types';

export class ContactsApiService extends ResourceService<
  Contact.Id,             // key type
  Contact.Base,           // list item type
  Contact.WithCreatedBy,  // single item type (detail)
  Contact.Apis.CreatePayload,
  Contact.Apis.UpdatePayload
> {
  constructor() {
    super('/contacts'); // just the endpoint — axios is auto-injected
  }
}

export const ContactsApis = new ContactsApiService();
```

---

### 4. Create hooks (React)

```ts
// contacts/contacts.hooks.ts
import { createResourceHooks } from '@void-snippets/react';
import { ContactsApis } from './contacts.api';

export const contactHooks = createResourceHooks('contacts', ContactsApis);
```

---

### 5. Use in components

```tsx
// ContactsList.tsx
export function ContactsList() {
  const { contacts, isContactsLoading, pagination } = contactHooks.useList({ page: 1, limit: 20 });
  const { create, update, delete: deleteContact } = contactHooks.useMutations();

  if (isContactsLoading) return <Spinner />;

  return (
    <>
      {contacts.map(c => <ContactCard key={c._id} contact={c} />)}
    </>
  );
}

// ContactDetail.tsx
export function ContactDetail({ id }: { id: string }) {
  const { data, isLoading } = contactHooks.useGet(id);
  // data is typed as Contact.WithCreatedBy ✅
}

// Infinite scroll
export function ContactsInfiniteList() {
  const { data, fetchNextPage, hasNextPage } = contactHooks.useInfinite({ limit: 20 });
  const allContacts = data?.pages.flatMap(p => p.items) ?? [];
  // ...
}
```

---

## Custom API Response Shapes

By default the library expects this response shape from your API:

```json
// List response
{ "data": { "items": [], "page": 1, "limit": 10, "totalPages": 5, "totalDocuments": 42 } }

// Single item response
{ "data": { "_id": "...", "name": "..." } }
```

If your API looks different, pass adapters:

```ts
export const contactHooks = createResourceHooks('contacts', ContactsApis, {
  adapters: {
    fromList: (raw) => ({
      items: raw.results,
      pagination: {
        page: raw.meta.currentPage,
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

## License

MIT
