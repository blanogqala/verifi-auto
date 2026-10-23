import type { ReactNode } from 'react';
import { DialogShell } from '../components/dialogs/DialogShell';

export function LiveDialog({
  title,
  onClose,
  children,
  showTitle = true,
  workspace = true,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  showTitle?: boolean;
  workspace?: boolean;
}) {
  return (
    <DialogShell label={title} onClose={onClose} workspace={workspace}>
      {showTitle ? <h2>{title}</h2> : null}
      {children}
    </DialogShell>
  );
}
