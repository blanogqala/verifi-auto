import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useModalBehaviour } from '../components/dialogs/useModalBehaviour';

/** Original modal shell. Focus, Escape, and the blurred backdrop match the approved dialog. */
export function LiveDialog({
  title,
  onClose,
  children,
  heading = true,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  heading?: boolean;
}) {
  const ref = useModalBehaviour(onClose);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={ref}
        className="modal workspace-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close" type="button" aria-label="Close dialog" onClick={onClose}>
          <X />
        </button>
        {heading && title ? <h2>{title}</h2> : null}
        {children}
      </section>
    </div>
  );
}
