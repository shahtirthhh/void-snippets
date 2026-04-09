// ============================================================================
// PAGINATION
// ============================================================================

export interface VSPagination {
  page: number;
  limit: number;
  totalPages: number;
  totalDocuments: number;
}

export interface VSQueryParams {
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

// ============================================================================
// DEFAULT API RESPONSE SHAPES
// These are the shapes the library uses out-of-the-box.
// If your API returns a different shape, provide custom adapters.
// ============================================================================

export interface VSDefaultPaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalDocuments: number;
}

export interface VSDefaultPaginatedResponse<T> {
  data: VSDefaultPaginatedData<T>;
}

export interface VSDefaultSingleResponse<T> {
  data: T;
}

// ============================================================================
// ADAPTER INTERFACES
// Adapters decouple the library from any specific API response shape.
// Pass them to createResourceHooks() if your API shape differs from defaults.
//
// @example
//   const adapters: VSAdapters<MyListRes, User, MySingleRes, UserDetail> = {
//     fromList: (raw) => ({ items: raw.results, pagination: { ... } }),
//     fromSingle: (raw) => raw.payload,
//   };
// ============================================================================

export interface VSListResult<TBase> {
  items: TBase[];
  pagination: VSPagination;
}

export interface VSAdapters<TListRaw, TBase, TSingleRaw, TDetail> {
  fromList: (raw: TListRaw) => VSListResult<TBase>;
  fromSingle: (raw: TSingleRaw) => TDetail;
}

// ============================================================================
// DEFAULT ADAPTERS FACTORY
// Works out-of-the-box if your API matches VSDefaultPaginatedResponse /
// VSDefaultSingleResponse. Zero config needed in that case.
// ============================================================================

export function createDefaultAdapters<TBase, TDetail>(): VSAdapters<
  VSDefaultPaginatedResponse<TBase>,
  TBase,
  VSDefaultSingleResponse<TDetail>,
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
