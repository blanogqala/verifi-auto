export function StatusBadge({ value }: any) {
  return (
    <span className={'status status-' + value.toLowerCase().replaceAll(' ', '-')}>{value}</span>
  );
}
