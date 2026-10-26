import { lazy, Suspense, useEffect, useState } from 'react';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import { RoadLoader } from '../ui/RoadLoader';

const VehicleModelViewer = lazy(() => import('./VehicleModelViewer'));
const emptyPaint: string[] = [];

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
  resolved,
}: {
  vehicle: any;
  compact?: boolean;
  resolved?: any;
}) {
  const resolution = resolved || resolveVehicleAsset(vehicle);
  const [failed, setFailed] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const asset = resolution.asset;
  useEffect(() => {
    setFailed(false);
    setWebgl(webglAvailable());
  }, [vehicle?.id, asset?.id]);
  const paintColor = typeof vehicle?.paintColor === 'string' ? vehicle.paintColor : '';
  // An owner-supplied real photograph takes precedence over all 3D previews
  // and approximate demonstration models. Do not pretend a concept car is theirs.
  if (vehicle?.photo) return (
    <div className={'vehicle-stage' + (compact ? ' vehicle-stage-compact' : '')}>
      <div className="garage-real-photo">
        <img src={vehicle.photo} alt={`Photograph of ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}`} />
      </div>
      <div className="vehicle-stage-meta">
        <p className="model-caption">Photo uploaded by vehicle owner · Actual vehicle</p>
      </div>
    </div>
  );
  let view = <RoadLoader label="Loading vehicle model" />;
  if (resolution.status === 'ambiguous') {
    view = (
      <div className="vehicle-choice">
        <FallbackArt />
        <p className="model-caption">Choose a body style when you edit this vehicle.</p>
      </div>
    );
  } else if (webgl === false || failed || !asset?.src) {
    view = (
      <FallbackArt
        onRetry={
          asset?.src
            ? () => {
                setFailed(false);
                setWebgl(webglAvailable());
              }
            : undefined
        }
      />
    );
  } else if (webgl && asset) {
    view = (
      <Suspense fallback={<RoadLoader label="Loading vehicle model" />}>
        <VehicleModelViewer
          src={asset.src}
          paintColor={paintColor}
          paintMaterials={asset.paintMaterials || emptyPaint}
          label={resolution.label || `${vehicle?.make || ''} ${vehicle?.model || 'Vehicle'}`.trim()}
          onFail={() => setFailed(true)}
        />
      </Suspense>
    );
  }

  return (
    <div className={'vehicle-stage' + (compact ? ' vehicle-stage-compact' : '')}>
      {view}
      <div className="vehicle-stage-meta">
        {resolution.label ? <p className="model-caption">{resolution.label}</p> : null}
        {asset ? (
          <a
            className="model-credits"
            href={asset.source}
            target="_blank"
            rel="noreferrer"
            aria-label={asset.attribution}
          >
            Credits
          </a>
        ) : null}
      </div>
    </div>
  );
}
