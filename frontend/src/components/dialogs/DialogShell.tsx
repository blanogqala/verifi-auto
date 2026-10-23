import { useModalScrollLock } from './useModalBehaviour';
import { createPortal } from 'react-dom';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** The demo's modal surface, with native focus containment and Escape handling. */
export function DialogShell({
  label,
  onClose,
  children,
  workspace = true,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  workspace?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useModalScrollLock();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  const content = (
    <dialog
      ref={ref}
      className="modal-backdrop native-dialog-host"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={'modal' + (workspace ? ' workspace-dialog' : '')}>
        <button type="button" className="close" aria-label="Close dialog" onClick={onClose}>
          <X />
        </button>
        {children}
      </section>
    </dialog>
  );
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
