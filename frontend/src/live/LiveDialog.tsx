import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
/** Native modal supplies focus containment, Escape and focus restoration. */
export function LiveDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal workspace-dialog live-vehicle-dialog"
      aria-label={title}
      onCancel={onClose}
      onClose={onClose}
    >
      <button type="button" className="close" aria-label="Close dialog" onClick={onClose}>
        <X />
      </button>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
