// ============================================================================
// PAGINATION
// ============================================================================

export interface TPagination {
  page: number;
  limit: number;
  totalPages: number;
  totalDocuments: number;
}

export interface TQueryParams {
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

// ============================================================================
// DEFAULT API RESPONSE SHAPES
// These are the shapes the library uses out-of-the-box.
// If your API returns a different shape, provide custom adapters.
// ============================================================================

export interface TDefaultPaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalDocuments: number;
}

export interface TDefaultPaginatedResponse<T> {
  data: TDefaultPaginatedData<T>;
}

export interface TDefaultSingleResponse<T> {
  data: T;
}

// ============================================================================
// ADAPTER INTERFACES
// Adapters decouple the library from any specific API response shape.
// Pass them to createResourceHooks() if your API shape differs from the default.
//
// Example:
//   const adapters: ResourceAdapters<MyListRes, User, MySingleRes, UserDetail> = {
//     fromList: (raw) => ({ items: raw.results, pagination: { ... } }),
//     fromSingle: (raw) => raw.payload,
//   };
// ============================================================================

export interface ResourceListResult<TBase> {
  items: TBase[];
  pagination: TPagination;
}

export interface ResourceAdapters<TListRaw, TBase, TSingleRaw, TDetail> {
  fromList: (raw: TListRaw) => ResourceListResult<TBase>;
  fromSingle: (raw: TSingleRaw) => TDetail;
}

// ============================================================================
// DEFAULT ADAPTERS FACTORY
// Works out-of-the-box if your API matches TDefaultPaginatedResponse /
// TDefaultSingleResponse. Zero configuration needed in that case.
// ============================================================================

export function createDefaultAdapters<TBase, TDetail>(): ResourceAdapters<
  TDefaultPaginatedResponse<TBase>,
  TBase,
  TDefaultSingleResponse<TDetail>,
  TDetail
> {
  return {
    fromList: (raw) => ({
      items: raw.data.items,
      pagination: {
        page: raw.data.page,
        limit: raw.data.limit,
        totalPages: raw.data.totalPages,
        totalDocuments: raw.data.totalDocuments,
      },
    }),
    fromSingle: (raw) => raw.data,
  };
}
