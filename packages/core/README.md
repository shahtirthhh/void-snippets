# @void-snippets/core

Core types, utilities, and helpers shared across the `@void-snippets` packages. Use this directly if you need the types, branded ID utilities, or `catchError` in your own TypeScript project.

## Installation

```bash
npm install @void-snippets/core
```

---

## Branded IDs

Prevent accidental mixing of structurally identical but semantically different IDs at compile time.

```ts
import type { VSId } from '@void-snippets/core';
import { stringToId } from '@void-snippets/core';

type ContactId = VSId<string, 'Contact'>;
type UserId    = VSId<string, 'User'>;

// Convert a raw string (e.g. from a URL param) to a branded ID
const id = stringToId<ContactId>('abc-123'); // ContactId ✅

// TypeScript prevents mixing brands
declare const contactId: ContactId;
declare let   userId: UserId;
userId = contactId; // ✅ Error — brands don't match
```

---

## catchError

Go-style error handling for TypeScript. Wraps any Promise and returns a `[error, null] | [null, data]` tuple — no try/catch needed at the call site.

```ts
import { catchError } from '@void-snippets/core';

const [err, data] = await catchError(fetchUser(id));
if (err) {
  console.error(err.message);
  return;
}
console.log(data.name); // data is typed correctly here
```

---

## API Response Types

```ts
import type {
  VSPagination,
  VSQueryParams,
  VSDefaultPaginatedResponse,
  VSDefaultSingleResponse,
} from '@void-snippets/core';
```

| Type | Description |
|---|---|
| `VSPagination` | `{ page, limit, totalPages, totalDocuments }` |
| `VSQueryParams` | `{ page?, limit?, ...rest }` |
| `VSDefaultPaginatedResponse<T>` | `{ data: { items: T[], page, limit, totalPages, totalDocuments } }` |
| `VSDefaultSingleResponse<T>` | `{ data: T }` |

---

## Adapter Types

```ts
import type { VSAdapters } from '@void-snippets/core';
import { createDefaultAdapters } from '@void-snippets/core';

// Default adapters — works if your API matches the shapes above
const adapters = createDefaultAdapters<User, UserDetail>();

// Custom adapters — for any other API shape
const myAdapters: VSAdapters<MyListResponse, User, MySingleResponse, UserDetail> = {
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
};
```

---

## Part of the `@void-snippets` ecosystem

| Package | Description |
|---|---|
| `@void-snippets/core` | This package |
| `@void-snippets/client` | Framework-agnostic CRUD resource service (axios) |
| `@void-snippets/react` | TanStack Query v5 hooks + general-purpose React hooks |

## License

MIT
