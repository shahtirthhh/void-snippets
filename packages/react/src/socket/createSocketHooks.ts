import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

// ============================================================================
// INTERNAL TYPE UTILITIES
// ============================================================================

// All runtime parameters of an event handler
type EventParams<TEvents, K extends keyof TEvents> =
  TEvents[K] extends (...args: infer P) => void ? P : never;

// True when the last element of a tuple is callable (an ACK callback)
type LastIsCallback<P extends readonly unknown[]> =
  P extends [...infer _Rest, infer Last]
    ? Last extends (...args: any[]) => void
      ? true
      : false
    : false;

// Params with the trailing ACK callback stripped off.
// For events that have no callback, all params are returned unchanged.
//   join-room(roomId: string)                         → [string]
//   send-message(msg: { text; roomId })               → [{ text; roomId }]
//   update-profile(name: string, cb: (r) => void)     → [string]
type NoAckArgs<TEvents, K extends keyof TEvents> =
  EventParams<TEvents, K> extends [...infer Rest, infer Last]
    ? Last extends (...args: any[]) => void
      ? Rest
      : EventParams<TEvents, K>
    : EventParams<TEvents, K>;

// Keys of TClientEvents whose last param is an ACK callback.
// TypeScript will error at compile time if emitWithAck is called on any other key.
type AckEventKeys<TEvents> = {
  [K in keyof TEvents]: LastIsCallback<
    TEvents[K] extends (...args: infer P) => void ? P : never
  > extends true
    ? K
    : never;
}[keyof TEvents];

// The first argument of the ACK callback — what the server sends back.
//   update-profile(name, (r: { status: "ok" | "error" }) => void)
//   → AckResponseType = { status: "ok" | "error" }
type AckResponseType<TEvents, K extends keyof TEvents> =
  EventParams<TEvents, K> extends [...infer _Rest, infer Last]
    ? Last extends (arg: infer R, ...rest: any[]) => void
      ? R
      : never
    : never;

// ============================================================================
// PUBLIC RETURN TYPES
// ============================================================================

export interface VSSocketConnectionReturn {
  /** True when the socket has an active, confirmed connection. */
  isConnected: boolean;

  /**
   * True while a connection or reconnection attempt is in progress.
   * Resets to false when `connect` or `connect_error` fires.
   */
  isConnecting: boolean;

  /** The socket ID assigned by the server. Undefined when disconnected. */
  socketId: string | undefined;

  /** The error from the last failed connection attempt. Null on success or before any attempt. */
  error: Error | null;

  /**
   * Initiates a connection. No-op if already connected.
   * Sets `isConnecting: true` until `connect` or `connect_error` fires.
   */
  connect: () => void;

  /** Gracefully closes the connection and stops all reconnection attempts. */
  disconnect: () => void;
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Creates three type-safe Socket.IO hooks bound to a specific socket instance.
 *
 * Call once at module level — the returned hooks close over the socket and both
 * event-map generics, so no type parameters are needed at individual call sites.
 *
 * Requires socket.io-client ≥4.6.0 (for native `socket.emitWithAck` support).
 *
 * @example
 * // socket-hooks.ts  (create once, export and use everywhere)
 * import { createSocketHooks } from '@void-snippets/react';
 * import { io } from 'socket.io-client';
 *
 * const socket = io(process.env.SOCKET_URL, { autoConnect: false });
 *
 * export const { useSocketEmit, useSocketListener, useSocketConnection } =
 *   createSocketHooks<IClientToServerEvents, IServerToClientEvents>(socket);
 */
export function createSocketHooks<
  TClientEvents extends Record<string, (...args: any[]) => void>,
  TServerEvents extends Record<string, (...args: any[]) => void>,
>(socket: Socket<TServerEvents, TClientEvents>) {

  // -------------------------------------------------------------------------
  // useSocketEmit
  // -------------------------------------------------------------------------

  /**
   * Returns two functions for type-safe event emission.
   *
   * **`emit(event, ...args)`** — fire and forget, no acknowledgement.
   * Callable on any event regardless of its signature. Throws synchronously
   * if the socket is not connected.
   *
   * **`emitWithAck(event, ...args)`** — emits and returns a `Promise` that
   * resolves with the server's acknowledgement response. TypeScript will error
   * at compile time if called on an event whose type has no callback.
   * Returns a rejected `Promise` if the socket is not connected.
   *
   * @example
   * const { emit, emitWithAck } = useSocketEmit();
   *
   * emit('join-room', roomId);
   *
   * const result = await emitWithAck('update-profile', name);
   * // result is { status: "ok" | "error" } — inferred from the event type
   */
  function useSocketEmit() {
    const emit = useCallback(
      <K extends keyof TClientEvents>(
        event: K,
        ...args: NoAckArgs<TClientEvents, K>
      ): void => {
        if (!socket.connected) {
          throw new Error(
            `[@void-snippets/react] Cannot emit "${String(event)}" — socket is not connected.`,
          );
        }
        // Cast required: TypeScript cannot spread-infer our stripped tuple
        // against socket.emit's overloaded generic signature.
        // The call is equivalent at runtime.
        (socket as any).emit(event, ...(args as unknown[]));
      },
      [],
    );

    const emitWithAck = useCallback(
      <K extends AckEventKeys<TClientEvents>>(
        event: K,
        ...args: NoAckArgs<TClientEvents, K>
      ): Promise<AckResponseType<TClientEvents, K>> => {
        if (!socket.connected) {
          return Promise.reject(
            new Error(
              `[@void-snippets/react] Cannot emit "${String(event)}" — socket is not connected.`,
            ),
          );
        }
        // socket.emitWithAck is available from socket.io-client ≥4.6.
        return (socket as any).emitWithAck(
          event,
          ...(args as unknown[]),
        ) as Promise<AckResponseType<TClientEvents, K>>;
      },
      [],
    );

    return { emit, emitWithAck };
  }

  // -------------------------------------------------------------------------
  // useSocketListener
  // -------------------------------------------------------------------------

  /**
   * Subscribes to a server event for the lifetime of the calling component.
   *
   * A ref pattern ensures the **latest** version of `handler` is always invoked
   * without re-registering the listener on every render. This means inline arrow
   * functions are safe — no `useCallback` needed at the call site.
   *
   * @param event   The server event name to listen for.
   * @param handler Called whenever the event fires. Always reflects the latest reference.
   * @param options
   *   `enabled` (default `true`) — when `false`, the listener is not attached.
   *   Flip dynamically to activate/deactivate without unmounting the component.
   *
   * @example
   * useSocketListener('new-message', (data) => {
   *   setMessages(prev => [...prev, data]);
   * });
   *
   * // Conditional — only listen when a room is selected
   * useSocketListener('user-joined', (userId) => { ... }, { enabled: !!roomId });
   */
  function useSocketListener<K extends keyof TServerEvents>(
    event: K,
    handler: TServerEvents[K],
    options?: { enabled?: boolean },
  ): void {
    const enabled = options?.enabled ?? true;

    // Tracks the latest handler without triggering re-registration in the listener effect
    const savedHandler = useRef<TServerEvents[K]>(handler);
    useEffect(() => {
      savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
      if (!enabled) return;

      const listener = ((...args: Parameters<TServerEvents[K]>) => {
        (
          savedHandler.current as (
            ...a: Parameters<TServerEvents[K]>
          ) => void
        )(...args);
      }) as TServerEvents[K];

      (socket as any).on(event, listener);

      return () => {
        (socket as any).off(event, listener);
      };

      // `handler` intentionally excluded: the ref update effect handles
      // staleness without re-registering the listener on every render.
    }, [event, enabled]);
  }

  // -------------------------------------------------------------------------
  // useSocketConnection
  // -------------------------------------------------------------------------

  /**
   * Reactively tracks socket connection state and exposes connect/disconnect controls.
   *
   * Safe to mount from multiple components simultaneously — each instance
   * independently subscribes to the same underlying socket events and reflects
   * the same connection state via local React state.
   *
   * Listens to `connect`, `disconnect`, `connect_error` on the socket, and
   * `reconnect_attempt` / `reconnect_failed` on the Manager (`socket.io`).
   * All listeners are removed on unmount.
   *
   * @example
   * function AppShell() {
   *   const { isConnected, isConnecting, error, connect, disconnect } =
   *     useSocketConnection();
   *
   *   useEffect(() => { connect(); }, []);
   *
   *   return (
   *     <>
   *       {isConnecting && <Banner>Connecting…</Banner>}
   *       {error && <Banner type="error">{error.message}</Banner>}
   *       <YourApp />
   *     </>
   *   );
   * }
   */
  function useSocketConnection(): VSSocketConnectionReturn {
    const [isConnected,  setIsConnected]  = useState<boolean>(socket.connected);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [socketId,     setSocketId]     = useState<string | undefined>(socket.id);
    const [error,        setError]        = useState<Error | null>(null);

    useEffect(() => {
      function onConnect() {
        setIsConnected(true);
        setIsConnecting(false);
        setSocketId(socket.id);
        setError(null);
      }

      function onDisconnect() {
        setIsConnected(false);
        setIsConnecting(false);
        setSocketId(undefined);
      }

      function onConnectError(err: Error) {
        setIsConnected(false);
        setIsConnecting(false);
        setError(err);
      }

      // Manager-level events — socket.io is the underlying Manager instance.
      // These fire during reconnection cycles managed by socket.io-client internally.
      function onReconnectAttempt() {
        setIsConnecting(true);
      }

      function onReconnectFailed() {
        setIsConnecting(false);
        setError(
          new Error(
            "[@void-snippets/react] Socket reconnection failed — maximum attempts exceeded.",
          ),
        );
      }

      socket.on("connect",       onConnect);
      socket.on("disconnect",    onDisconnect);
      socket.on("connect_error", onConnectError);

      // Cast: Manager event types vary across socket.io-client minor versions.
      (socket.io as any).on("reconnect_attempt", onReconnectAttempt);
      (socket.io as any).on("reconnect_failed",  onReconnectFailed);

      return () => {
        socket.off("connect",       onConnect);
        socket.off("disconnect",    onDisconnect);
        socket.off("connect_error", onConnectError);
        (socket.io as any).off("reconnect_attempt", onReconnectAttempt);
        (socket.io as any).off("reconnect_failed",  onReconnectFailed);
      };
    }, []);

    const connect = useCallback((): void => {
      if (!socket.connected) {
        setIsConnecting(true);
        socket.connect();
      }
    }, []);

    const disconnect = useCallback((): void => {
      socket.disconnect();
    }, []);

    return {
      isConnected,
      isConnecting,
      socketId,
      error,
      connect,
      disconnect,
    };
  }

  return {
    useSocketEmit,
    useSocketListener,
    useSocketConnection,
  };
}
