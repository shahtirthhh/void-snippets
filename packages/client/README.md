# @void-snippets/client

Framework-agnostic HTTP resource service for TypeScript projects. Provides a generic CRUD base class powered by axios — works in any TypeScript environment (React, Vue, Node.js, etc.).

## Installation

```bash
npm install @void-snippets/client axios
```

---

## Quick Start

### 1. Configure axios once at your app entry point

```ts
// src/main.ts
import axios from 'axios';
import { configure } from '@void-snippets/client';

const axiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});

configure(axiosInstance); // registers globally — call this once
```

### 2. Define a resource service

```ts
// contacts/contacts.api.ts
import { ResourceService } from '@void-snippets/client';
import type { Contact } from './contacts.types';

export class ContactsApiService extends ResourceService<
  Contact.Id,              // key type (used in get/update/delete)
  Contact.Base,            // list item type
  Contact.WithCreatedBy,   // single item type (detail view)
  Contact.Apis.CreatePayload,
  Contact.Apis.UpdatePayload
> {
  constructor() {
    super('/contacts'); // axios is auto-injected from configure()
  }
}

export const ContactsApis = new ContactsApiService();
```

### 3. Use it anywhere

```ts
const list   = await ContactsApis.list({ page: 1, limit: 20 });
const item   = await ContactsApis.get(id);
const created = await ContactsApis.create({ name: 'John' });
const updated = await ContactsApis.update(id, { name: 'Jane' });
const deleted = await ContactsApis.delete(id);
```

---

## Generic Parameters

`ResourceService<TId, TBase, TDetail, TCreate, TUpdate, TListRaw, TSingleRaw>`

| Parameter | Default | Description |
|---|---|---|
| `TId` | — | ID type (e.g. `string`) |
| `TBase` | — | List item shape |
| `TDetail` | `TBase` | Single item shape (detail view) |
| `TCreate` | `Partial<TBase>` | Create payload |
| `TUpdate` | `Partial<TBase>` | Update payload |
| `TListRaw` | `VoidSnippetDefaultPaginatedResponse<TBase>` | Raw list response from API |
| `TSingleRaw` | `VoidSnippetDefaultSingleResponse<TDetail>` | Raw single-item response from API |

The last two are only needed if your API returns a non-standard response shape — see `@void-snippets/react` for how adapters work.

---

## Part of the `@void-snippets` ecosystem

| Package | Description |
|---|---|
| `@void-snippets/core` | Shared types and utilities |
| `@void-snippets/client` | This package |
| `@void-snippets/react` | TanStack Query v5 hooks + general-purpose React hooks |

## License

MIT
