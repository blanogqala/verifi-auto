/** A centred, reduced-motion-friendly progress illustration shared by all live views. */
export function RoadLoader({ label }: { label: string }) {
  return (
    <div className="road-loader" role="status" aria-label={label} aria-live="polite">
      <span className="road-loader-scene" aria-hidden="true">
        <span className="road-loader-glow" />
        <span className="road-loader-car">
          <svg viewBox="0 0 184 82" focusable="false">
            {/* Rounded hatchback silhouette, sloped windscreen, bonnet and spoiler. */}
            <path className="road-loader-body"
              d="M11 48 19 43 34 40 53 23c5-6 11-9 22-9h50c10 0 16 4 21 11l13 17 12 3c7 2 10 7 10 14v5h-12c-2-9-9-15-18-15s-16 6-18 15H55c-2-9-9-15-18-15S21 55 19 64H9v-9c0-3 1-5 2-7Z" />
            <path className="road-loader-windows" d="M64 25c4-4 8-6 15-6h18v21H47Zm39-6h22c7 0 11 3 15 9l9 12h-46Z" />
            <path className="road-loader-detail" d="M101 19v21M67 45h9M117 45h10M26 45l14-4M150 44l17 3" />
            <path className="road-loader-light" d="m164 46 11 3-1 5h-11z" />
            <path className="road-loader-taillight" d="m13 47 10-4v7H12z" />
            <circle className="road-loader-tyre" cx="37" cy="64" r="14" />
            <circle className="road-loader-rim" cx="37" cy="64" r="7" />
            <circle className="road-loader-tyre" cx="151" cy="64" r="14" />
            <circle className="road-loader-rim" cx="151" cy="64" r="7" />
            <path className="road-loader-reflection" d="M59 48h72" />
          </svg>
        </span>
        <span className="road-loader-track">
          <span className="road-loader-track-stripes" />
        </span>
      </span>
      <span className="road-loader-label">{label}</span>
      <span className="road-loader-caption" aria-hidden="true">Getting everything ready for your journey</span>
    </div>
  );
}
