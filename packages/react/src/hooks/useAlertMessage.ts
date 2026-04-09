import { type ReactNode, useCallback, useState } from "react";

export type VSAlertVariant = "success" | "info" | "error";

export interface VSAlertState {
  message: ReactNode | string;
  type: VSAlertVariant;
  isVisible: boolean;
}

/**
 * Manages alert/toast message state with optional auto-hide.
 *
 * @param autoHideDuration - ms before alert hides automatically. Pass 0 to disable. Default: 3000
 *
 * @example
 * const { alert, showAlert, hideAlert } = useAlertMessage();
 * showAlert('Saved successfully!', 'success');
 * showAlert(<b>Something went wrong</b>, 'error');
 */
export function useAlertMessage(autoHideDuration = 3000) {
  const [alert, setAlert] = useState<VSAlertState>({
    message: null,
    type: "info",
    isVisible: false,
  });

  const showAlert = useCallback(
    (message: ReactNode | string, type: VSAlertVariant = "info") => {
      setAlert({ message, type, isVisible: true });
      if (autoHideDuration) {
        setTimeout(() => {
          setAlert((prev) => ({ ...prev, isVisible: false }));
        }, autoHideDuration);
      }
    },
    [autoHideDuration]
  );

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, isVisible: false }));
  }, []);

  return { alert, showAlert, hideAlert };
}
