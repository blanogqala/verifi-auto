import { lazy, Suspense, useEffect, useState } from 'react';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import { RoadLoader } from '../ui/RoadLoader';

const VehicleModelViewer = lazy(() => import('./VehicleModelViewer'));
const emptyPaint: string[] = [];

const swatches = [
  { name: 'White', value: '#f2f2f2' },
  { name: 'Silver', value: '#c5c8ce' },
  { name: 'Grey', value: '#6d727a' },
  { name: 'Black', value: '#1b1d21' },
  { name: 'Blue', value: '#1d4e89' },
  { name: 'Red', value: '#8e1d2c' },
  { name: 'Green', value: '#1f6b45' },
];

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

function FallbackArt({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="vehicle-fallback" aria-label="Still illustration of a vehicle">
      <svg viewBox="0 0 220 90" className="vehicle-fallback-art" aria-hidden="true">
        <path d="M20 62h180" />
        <path d="M38 62l18-24h78l28 24" />
        <rect x="78" y="34" width="52" height="16" />
        <circle cx="70" cy="64" r="12" />
        <circle cx="160" cy="64" r="12" />
      </svg>
      <p className="muted">Still illustration. This view does not rotate.</p>
      {onRetry ? (
        <button className="secondary" type="button" onClick={onRetry}>
          Try the 3D view again
        </button>
      ) : null}
    </div>
  );
}

export function VehicleStage({
  vehicle,
  compact = false,
  onPaint,
  onBodyStyle,
}: {
  vehicle: any;
  compact?: boolean;
  onPaint?: (color: string) => void;
  onBodyStyle?: (bodyStyle: string, variant: string) => void;
}) {
  const resolution = resolveVehicleAsset(vehicle);
  const [failed, setFailed] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const asset = resolution.asset;
  useEffect(() => {
    setFailed(false);
    setWebgl(webglAvailable());
  }, [vehicle?.id, asset?.id]);
  const canPaint = !!asset?.paintMaterials.length && !!onPaint && resolution.status !== 'ambiguous';
  let view = <RoadLoader label="Loading vehicle model" />;
  if (resolution.status === 'ambiguous') {
    view = (
      <div className="vehicle-choice">
        <p>{resolution.reason}</p>
        <div className="viewer-controls">
          {resolution.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="secondary"
              onClick={() => onBodyStyle?.(choice.bodyStyle, choice.variant)}
            >
              {choice.bodyStyle} · {choice.yearFrom}–{choice.yearTo}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (webgl === false || failed || !asset?.src) {
    view = (
      <FallbackArt
        onRetry={() => {
          setFailed(false);
          setWebgl(webglAvailable());
        }}
      />
    );
  } else if (webgl && asset) {
    view = (
      <Suspense fallback={<RoadLoader label="Loading vehicle model" />}>
        <VehicleModelViewer
          src={asset.src}
          paintColor={typeof vehicle?.paintColor === 'string' ? vehicle.paintColor : ''}
          paintMaterials={asset.paintMaterials || emptyPaint}
          label={resolution.label || vehicle?.model || 'Vehicle'}
          onFail={() => setFailed(true)}
        />
      </Suspense>
    );
  }

  return (
    <div className={'vehicle-stage' + (compact ? ' vehicle-stage-compact' : '')}>
      {view}
      {resolution.label ? <p className="model-caption">{resolution.label}</p> : null}
      {asset && resolution.status !== 'ambiguous' ? <p className="model-attribution">{asset.attribution}</p> : null}
      {canPaint ? (
        <div className="paint-panel">
          <p className="muted">Colour is a visual approximation of the real paint finish.</p>
          <div className="paint-swatches" role="group" aria-label="Body colour">
            {swatches.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                className="paint-swatch"
                style={{ background: swatch.value }}
                aria-label={swatch.name}
                aria-pressed={vehicle?.paintColor === swatch.value}
                onClick={() => onPaint?.(swatch.value)}
              />
            ))}
            <label className="paint-custom">
              Custom
              <input
                type="color"
                value={vehicle?.paintColor || '#f2f2f2'}
                aria-label="Custom body colour"
                onChange={(event) => onPaint?.(event.target.value)}
              />
            </label>
            <button type="button" className="secondary" onClick={() => onPaint?.('')}>
              Reset to original colour
            </button>
          </div>
        </div>
      ) : null}
      {asset && !asset.paintMaterials.length ? (
        <p className="muted">This model cannot be recolored without tinting glass, tyres, or trim.</p>
      ) : null}
    </div>
  );
}
