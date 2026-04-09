import { useCallback, useState } from "react";
import type { VSQueryParams } from "@void-snippets/core";

export interface VSPaginationReturn {
  page: number;
  limit: number;
  onPaginationChange: (newPage: number, newLimit: number) => void;
  resetPagination: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  /** Ready-to-use query params object — pass directly to useList() */
  queryParams: VSQueryParams;
}

/**
 * Manages pagination state and produces a ready-to-use queryParams object
 * compatible with createResourceHooks' useList() and useInfinite().
 *
 * @param initialPage  - Starting page. Default: 1
 * @param initialLimit - Items per page. Default: 10
 *
 * @example
 * const { queryParams, onPaginationChange } = usePagination(1, 20);
 *
 * const { list, isLoading } = contactHooks.useList(queryParams);
 *
 * <Pagination onChange={onPaginationChange} total={pagination.totalDocuments} />
 */
export function usePagination(
  initialPage = 1,
  initialLimit = 10
): VSPaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const onPaginationChange = useCallback(
    (newPage: number, newLimit: number) => {
      setPage(newPage);
      setLimit(newLimit);
    },
    []
  );

  const resetPagination = useCallback(() => {
    setPage(1);
  }, []);

  return {
    page,
    limit,
    onPaginationChange,
    resetPagination,
    setPage,
    setLimit,
    queryParams: { page, limit },
  };
}
