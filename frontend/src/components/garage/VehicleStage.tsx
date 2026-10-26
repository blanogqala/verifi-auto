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

function FallbackArt({ photo, onRetry }: { photo?: string; onRetry?: () => void }) {
  return (
    <div className="vehicle-fallback" aria-label="3D showroom unavailable in this browser">
      {photo ? (
        <img className="garage-photo-fallback" src={photo}
          alt="Photo supplied by vehicle owner; not a rotatable 3D model" />
      ) : (
        <svg viewBox="0 0 220 90" className="vehicle-fallback-art" aria-hidden="true">
          <path d="M20 62h180" />
          <path d="M38 62l18-24h78l28 24" />
          <rect x="78" y="34" width="52" height="16" />
          <circle cx="70" cy="64" r="12" />
          <circle cx="160" cy="64" r="12" />
        </svg>
      )}
      <p className="muted">3D is unavailable here. This fallback does not rotate.</p>
      {onRetry ? (
        <button className="secondary" type="button" onClick={onRetry}>Try the 3D view again</button>
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
  const asset = resolution.status === 'exact' || resolution.status === 'approximate'
    ? resolution.asset : null;
  useEffect(() => {
    setFailed(false);
    setWebgl(webglAvailable());
  }, [vehicle?.id, asset?.id, asset?.src]);
  const paintColor = typeof vehicle?.paintColor === 'string' ? vehicle.paintColor : '';
  const previewStyle = resolution.modelView?.bodyStyle || vehicle?.bodyStyle || 'other';
  const verified = Boolean(asset?.src && resolution.status === 'exact');
  const sceneLabel = verified
    ? 'Verified 3D model for this vehicle'
    : 'Interactive 3D body-style preview — not an exact manufacturer model';
  let view = <RoadLoader label="Loading 3D garage" />;
  if (webgl === false || failed) {
    view = (
      <FallbackArt photo={vehicle?.photo} onRetry={() => {
        setFailed(false);
        setWebgl(webglAvailable());
      }} />
    );
  } else if (webgl) {
    view = (
      <Suspense fallback={<RoadLoader label="Loading 3D garage" />}>
        <VehicleModelViewer
          src={asset?.src}
          previewStyle={previewStyle}
          paintColor={paintColor}
          paintMaterials={asset?.paintMaterials || emptyPaint}
          label={sceneLabel}
          onFail={() => setFailed(true)}
        />
      </Suspense>
    );
  }

  return (
    <div className={'vehicle-stage' + (compact ? ' vehicle-stage-compact' : '')}>
      {view}
      <div className="vehicle-stage-meta">
        <p className="model-caption">{sceneLabel}</p>
        <p className="model-caption vehicle-showroom-hint">
          Drag left or right to rotate · Use the left and right arrow keys
        </p>
        {asset?.source && (
          <a className="model-credits" href={asset.source} target="_blank"
            rel="noreferrer" aria-label={asset.attribution || '3D model source'}>3D model credits</a>
        )}
        {vehicle?.photo && (
          <div className="showroom-owner-photo">
            <img src={vehicle.photo} alt="Photo of the owner's actual vehicle" />
            <span>Actual vehicle photograph</span>
          </div>
        )}
      </div>
    </div>
  );
}
