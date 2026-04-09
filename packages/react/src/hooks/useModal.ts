import { useCallback, useState } from "react";

export interface VSModalReturn<T> {
  isOpen: boolean;
  data: T | null;
  isLoading: boolean;
  openCreateModal: () => void;
  openEditModal: (editData: T) => void;
  setLoading: (loading: boolean) => void;
  closeModal: () => void;
  setModal: (open: boolean, editData?: T | null) => void;
}

/**
 * Manages modal open/close state with optional data payload and loading state.
 * Works for both create and edit modals — pass data to distinguish the mode.
 *
 * @typeParam T - The type of data the modal operates on (e.g. a Contact, User, etc.)
 *
 * @example
 * const modal = useModal<Contact.Base>();
 *
 * modal.openCreateModal();      // data → null (create mode)
 * modal.openEditModal(contact); // data → contact (edit mode)
 *
 * if (modal.data) {
 *   // Edit mode — modal.data is Contact.Base
 * } else {
 *   // Create mode
 * }
 */
export function useModal<T = unknown>(): VSModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openCreateModal = useCallback(() => {
    setIsOpen(true);
    setData(null);
  }, []);

  const openEditModal = useCallback((editData: T) => {
    setIsOpen(true);
    setData(editData);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const setModal = useCallback((open: boolean, editData?: T | null) => {
    setIsOpen(open);
    setData(editData ?? null);
  }, []);

  return {
    isOpen,
    data,
    isLoading,
    openCreateModal,
    openEditModal,
    setLoading,
    closeModal,
    setModal,
  };
}
