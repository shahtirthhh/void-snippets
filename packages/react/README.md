# @void-snippets/react

TanStack Query v5 resource hooks factory + general-purpose React hooks. All fully typed, zero boilerplate.

## Installation

```bash
npm install @void-snippets/react @void-snippets/client @tanstack/react-query axios
```

---

## Setup

### Configure axios once

```ts
import axios from 'axios';
import { configure } from '@void-snippets/client';
configure(axios.create({ baseURL: 'https://api.example.com' }));
```

### Wrap your app with QueryClientProvider

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
function App() {
  return <QueryClientProvider client={queryClient}><YourApp /></QueryClientProvider>;
}
```

---

## Resource Hooks — `createResourceHooks`

Define a service once, get all hooks free — fully typed, no generics needed.

```ts
// contacts.api.ts
export class ContactsApiService extends ResourceService<
  Contact.Id, Contact.Base, Contact.WithCreatedBy,
  Contact.Apis.CreatePayload, Contact.Apis.UpdatePayload
> {
  constructor() { super('/contacts'); }
}
export const ContactsApis = new ContactsApiService();

// contacts.hooks.ts
export const contactHooks = createResourceHooks('contacts', ContactsApis);
```

### `useList(params?)`

```tsx
const { list, isLoading, pagination, error, invalidate } =
  contactHooks.useList({ page: 1, limit: 20 });
// list is typed as Contact.Base[] ✅
```

| Key | Type |
|---|---|
| `list` | `TBase[]` |
| `pagination` | `VSPagination` |
| `isLoading` | `boolean` |
| `error` | `Error \| null` |
| `invalidate` | `() => void` |

### `useGet(id, staleTime?)`

```tsx
const { item, isLoading, error, refetch } = contactHooks.useGet(id);
// item is typed as Contact.WithCreatedBy ✅
```

### `useMutations()`

```tsx
const { create, update, remove } = contactHooks.useMutations();

create.mutate({ name: 'John' });
update.mutate({ _id: id, payload: { name: 'Jane' } });
remove.mutate(id);
```

### `useInfinite(params?)`

```tsx
const { data, fetchNextPage, hasNextPage } = contactHooks.useInfinite({ limit: 20 });
const all = data?.pages.flatMap(p => p.items) ?? [];
```

### Custom API shapes

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

## General-Purpose Hooks

### `useAlertMessage(autoHideDuration?)`

```tsx
const { alert, showAlert, hideAlert } = useAlertMessage(3000);

showAlert('Saved!', 'success');
showAlert('Something went wrong', 'error');
showAlert(<b>Custom JSX</b>, 'info');
// alert.isVisible, alert.message, alert.type
```

Variants: `"success" | "info" | "error"`

---

### `useAsyncState<T>(initialData?)`

```tsx
const { data, isLoading, isError, execute } = useAsyncState<User>();

const [err, user] = await execute(() => fetchUser(id), {
  onSuccess: (u) => showAlert(`Welcome ${u.name}`, 'success'),
  onError: (e) => showAlert(e.message, 'error'),
});
```

Status values: `"idle" | "pending" | "success" | "error"`

---

### `useCallTimer(startedAt?)`

```tsx
const duration = useCallTimer(call.startedAt); // "02:45"
const duration = useCallTimer(null);           // "00:00"
```

---

### `useModal<T>()`

```tsx
const modal = useModal<Contact.Base>();

modal.openCreateModal();      // data → null
modal.openEditModal(contact); // data → contact

if (modal.data) { /* edit mode */ } else { /* create mode */ }
```

---

### `usePagination(initialPage?, initialLimit?)`

```tsx
const { queryParams, onPaginationChange } = usePagination(1, 20);

// Wire directly to useList
const { list } = contactHooks.useList(queryParams);

// Wire to your pagination UI
<Pagination onChange={onPaginationChange} total={pagination.totalDocuments} />
```

---

## Part of the `@void-snippets` ecosystem

| Package | Description |
|---|---|
| `@void-snippets/core` | Shared types and utilities |
| `@void-snippets/client` | Framework-agnostic CRUD resource service (axios) |
| `@void-snippets/react` | This package |

## License

MIT
