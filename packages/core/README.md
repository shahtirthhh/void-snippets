# @void-snippets/core

Core types and utilities shared across the `@void-snippets` packages. Use this directly if you need the types or branded ID utilities in your own TypeScript project.

## Installation

```bash
npm install @void-snippets/core
```

---

## Branded IDs

Prevent accidental mixing of structurally identical but semantically different IDs at compile time.

```ts
import type { Id } from '@void-snippets/core';
import { stringToId } from '@void-snippets/core';

type ContactId = Id<string, 'Contact'>;
type UserId    = Id<string, 'User'>;

// Convert a raw string (e.g. from a URL param) to a branded ID
const id = stringToId<ContactId>('abc-123'); // ContactId ✅

// TypeScript prevents mixing brands
declare const contactId: ContactId;
declare let   userId: UserId;
userId = contactId; // ✅ Error — brands don't match
```

---

## API Response Types

Default response shapes the library works with out-of-the-box.

```ts
import type {
  TPagination,
  TQueryParams,
  TDefaultPaginatedResponse,
  TDefaultSingleResponse,
} from '@void-snippets/core';
```

| Type | Description |
|---|---|
| `TPagination` | `{ page, limit, totalPages, totalDocuments }` |
| `TQueryParams` | `{ page?, limit?, ...rest }` |
| `TDefaultPaginatedResponse<T>` | `{ data: { items: T[], page, limit, totalPages, totalDocuments } }` |
| `TDefaultSingleResponse<T>` | `{ data: T }` |

---

## Adapter Types

Use these if you are building a custom integration with a non-standard API shape.

```ts
import type { ResourceAdapters, ResourceListResult } from '@void-snippets/core';
import { createDefaultAdapters } from '@void-snippets/core';

// createDefaultAdapters() returns adapters for the default response shapes above
const adapters = createDefaultAdapters<User, UserDetail>();

// Or define your own for a custom API shape
const myAdapters: ResourceAdapters<MyListResponse, User, MySingleResponse, UserDetail> = {
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
| `@void-snippets/core` | This package — types and utilities |
| `@void-snippets/client` | Framework-agnostic CRUD resource service (axios) |
| `@void-snippets/react` | TanStack Query v5 hooks factory for React |

## License

MIT
