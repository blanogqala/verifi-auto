export function RoadLoader({ label }: { label: string }) {
  return (
    <div className="road-loader" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <span className="road-loader-scene" aria-hidden="true">
        <span className="road-loader-car" />
        <span className="road-loader-road" />
      </span>
      <span className="road-loader-label">{label}</span>
      <span className="page-skeleton" aria-hidden="true" />
    </div>
  );
}
