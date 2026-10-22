import { useEffect, useRef } from 'react';

const stack: number[] = [];
let locks = 0;
let sequence = 0;

function focusable(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => {
    if (element.hasAttribute('disabled')) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.closest('[hidden], [inert]')) return false;
    if (element instanceof HTMLInputElement && element.type === 'hidden') return false;
    return element.getClientRects().length > 0;
  });
}

/** One keyboard, focus, and scroll-lock behaviour for every approved modal. */
export function useModalBehaviour(onClose: () => void) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const id = ++sequence;
    stack.push(id);
    locks += 1;
    document.documentElement.classList.add('scroll-lock');
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    const items = focusable(root);
    if (items[0]) items[0].focus();
    else if (root) {
      root.tabIndex = -1;
      root.focus();
    }
    function onKey(event: KeyboardEvent) {
      if (stack[stack.length - 1] !== id) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      event.stopPropagation();
      const controls = focusable(ref.current);
      if (!controls.length) {
        event.preventDefault();
        root?.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      const inside = root?.contains(document.activeElement);
      if (!inside || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => {
      const index = stack.lastIndexOf(id);
      if (index >= 0) stack.splice(index, 1);
      locks = Math.max(0, locks - 1);
      if (locks === 0) document.documentElement.classList.remove('scroll-lock');
      document.removeEventListener('keydown', onKey, true);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);
  return ref;
}
