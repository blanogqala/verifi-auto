import { Card } from './Card';

export function MetricCard({ label, value, note, Icon }: any) {
  return (
    <Card as="div" className="metric">
      <span>
        {label}
        <Icon size={18} />
      </span>
      <strong>{value}</strong>
      <small>{note}</small>
    </Card>
  );
}
