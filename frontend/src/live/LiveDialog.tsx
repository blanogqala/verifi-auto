import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

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
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    document.documentElement.classList.add('scroll-lock');
    const root = ref.current;
    const focusables = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button,a[href],input,select,textarea,summary,[tabindex="0"]',
        ) || [],
      ).filter((element) => !element.hasAttribute('disabled'));
    focusables()[0]?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.documentElement.classList.remove('scroll-lock');
      document.removeEventListener('keydown', key);
    };
  }, [onClose]);
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
