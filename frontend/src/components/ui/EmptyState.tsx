import { Card } from './Card';

import { FileText } from 'lucide-react';
export function EmptyState({ title, text }: any) {
  return (
    <Card as="div" className="empty">
      <FileText size={26} />
      <h3>{title}</h3>
      <p>{text}</p>
    </Card>
  );
}
