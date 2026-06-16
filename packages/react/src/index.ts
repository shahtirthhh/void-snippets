// Resource hooks factory
export { createResourceHooks } from "./hooks/createResourceHooks";
export type {
  VSUseListReturn,
  VSUseGetReturn,
  VSResourceHooksOptions,
  VSOptimisticHandlers,
  VSOptimisticOperation,
} from "./hooks/createResourceHooks";

// Socket.IO hooks factory
export { createSocketHooks } from "./socket/createSocketHooks";
export type { VSSocketConnectionReturn } from "./socket/createSocketHooks";

// Route contract factory
export {
  createRouteContract,
  defineRoute,
  useTypedSearchParams,
} from "./routing/createRouteContract";
export type {
  RouteMetadata,
  RouteDefinition,
  ProcessedRoute,
} from "./routing/createRouteContract";

// General-purpose React hooks
export { useAlertMessage } from "./hooks/useAlertMessage";
export type { VSAlertVariant, VSAlertState } from "./hooks/useAlertMessage";

export { useAsyncState } from "./hooks/useAsyncState";
export type {
  VSAsyncStatus,
  VSUseAsyncStateReturn,
} from "./hooks/useAsyncState";

export { useCallTimer } from "./hooks/useCallTimer";

export { useModal } from "./hooks/useModal";
export type { VSModalReturn } from "./hooks/useModal";

export { usePagination } from "./hooks/usePagination";
export type { VSPaginationReturn } from "./hooks/usePagination";
