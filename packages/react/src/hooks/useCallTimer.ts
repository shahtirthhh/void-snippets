import { useEffect, useState } from "react";

/**
 * Tracks elapsed time from a given start timestamp — useful for call durations,
 * countdowns, or any elapsed-time display.
 *
 * @param startedAt - Unix timestamp in ms (e.g. Date.now()). Pass null/undefined to reset.
 * @returns Formatted duration string "MM:SS"
 *
 * @example
 * const duration = useCallTimer(call.startedAt);
 * // duration → "02:45"
 *
 * // Reset when no active call
 * const duration = useCallTimer(activeCall ? activeCall.startedAt : null);
 */
export function useCallTimer(startedAt?: number | null): string {
  const [duration, setDuration] = useState("00:00");

  useEffect(() => {
    if (!startedAt) {
      setDuration("00:00");
      return;
    }

    const interval = setInterval(() => {
      const diffInSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const minutes = Math.floor(diffInSeconds / 60).toString().padStart(2, "0");
      const seconds = (diffInSeconds % 60).toString().padStart(2, "0");
      setDuration(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return duration;
}
