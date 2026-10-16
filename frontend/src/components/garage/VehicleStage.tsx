import { lazy, Suspense, useEffect, useState } from 'react';
import { modelForVehicle } from '../../features/garage/vehicleModels';
import { RoadLoader } from '../ui/RoadLoader';

const VehicleModelViewer = lazy(() => import('./VehicleModelViewer'));

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
    <div className="vehicle-fallback" aria-label="Illustrated vehicle">
      <svg viewBox="0 0 220 90" className="vehicle-fallback-art" aria-hidden="true">
        <path d="M20 62h180" />
        <path d="M38 62l18-24h78l28 24" />
        <rect x="78" y="34" width="52" height="16" />
        <circle cx="70" cy="64" r="12" />
        <circle cx="160" cy="64" r="12" />
      </svg>
      {onRetry ? (
        <button className="secondary" type="button" onClick={onRetry}>
          Try the 3D view again
        </button>
      ) : null}
    </div>
  );
}

export function VehicleStage({ vehicle }: { vehicle: any }) {
  const model = modelForVehicle(vehicle);
  const [failed, setFailed] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => {
    setWebgl(webglAvailable());
  }, [vehicle?.id]);
  let view = <RoadLoader label="Loading vehicle model" />;
  if (webgl === false || failed) {
    view = (
      <FallbackArt
        onRetry={() => {
          setFailed(false);
          setWebgl(webglAvailable());
        }}
      />
    );
  } else if (webgl) {
    view = (
      <Suspense fallback={<RoadLoader label="Loading vehicle model" />}>
        <VehicleModelViewer label={model.label} onFail={() => setFailed(true)} />
      </Suspense>
    );
  }
  return (
    <div className="vehicle-stage">
      {view}
      <p className="model-caption">{model.label}</p>
      {model.illustrative ? <p className="muted model-attribution">{model.attribution}</p> : null}
    </div>
  );
}
