import { lazy, Suspense, useEffect, useState } from 'react';
import { catalogueModel } from '../../features/garage/vehicleModels';
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

export function VehicleStage({ vehicle }: { vehicle: any }) {
  const model = catalogueModel(vehicle);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [webgl, setWebgl] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setWebgl(webglAvailable());
  }, []);
  if (!model || failed || reduced || !webgl) {
    return (
      <div className="vehicle-fallback" aria-label="Illustrated vehicle">
        <svg viewBox="0 0 220 90" className="vehicle-fallback-art" aria-hidden="true">
          <path d="M20 62h180" />
          <path d="M38 62l18-24h78l28 24" />
          <circle cx="70" cy="64" r="12" />
          <circle cx="160" cy="64" r="12" />
        </svg>
        <p>
          {model?.illustrative
            ? 'Illustrative model. This is not an exact model of this vehicle.'
            : 'Illustrated preview. An exact 3D model is not available for this vehicle.'}
        </p>
      </div>
    );
  }
  return (
    <Suspense fallback={<RoadLoader label="Loading vehicle model" />}>
      <VehicleModelViewer model={model} onFail={() => setFailed(true)} />
    </Suspense>
  );
}
