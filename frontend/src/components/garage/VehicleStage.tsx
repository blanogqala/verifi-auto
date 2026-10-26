import { lazy, Suspense, useEffect, useState } from 'react';
import { Box, Camera, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import { RoadLoader } from '../ui/RoadLoader';

const VehicleModelViewer = lazy(() => import('./VehicleModelViewer'));
const emptyPaint: string[] = [];

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Image-first showroom: the actual owner's compressed photo costs no model download.
 * Only a published, accurately labelled GLB may be launched in 3D. No fabricated
 * mesh or concept car is presented as the customer's make/model.
 */
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
  const asset = (resolution.status === 'exact' || resolution.status === 'approximate')
    && typeof resolution.asset?.src === 'string' && resolution.asset.src
      ? resolution.asset
      : null;
  const exact = resolution.status === 'exact' && Boolean(asset);
  const photo = typeof vehicle?.photo === 'string' ? vehicle.photo : '';
  const [mode, setMode] = useState<'photo' | '3d'>('photo');
  const [failed, setFailed] = useState(false);
  const [canRender, setCanRender] = useState<boolean | null>(null);

  useEffect(() => {
    // Switching vehicles never reuses the prior vehicle's 3D scene or photo.
    setMode('photo');
    setFailed(false);
    setCanRender(null);
  }, [vehicle?.id, asset?.src]);

  const modelLabel = exact
    ? 'Verified model for this vehicle'
    : resolution.status === 'approximate' && asset
      ? 'Similar 3D reference — not an exact vehicle match'
      : 'A matching 3D model has not been published for this vehicle';
  const show3d = mode === '3d' && Boolean(asset) && canRender !== false && !failed;

  function open3d() {
    const supported = webglAvailable();
    setCanRender(supported);
    setFailed(!supported);
    if (supported) setMode('3d');
  }

  return (
    <div className={'vehicle-stage vehicle-stage-premium' + (compact ? ' vehicle-stage-compact' : '')}>
      <div className="showroom-display" aria-label="Vehicle showroom display">
        {show3d && asset ? (
          <Suspense fallback={<RoadLoader label="Loading interactive vehicle showroom" />}>
            <VehicleModelViewer
              src={asset.src}
              paintColor={vehicle?.paintColor || ''}
              paintMaterials={asset.paintMaterials || emptyPaint}
              label={modelLabel}
              onFail={() => {
                setFailed(true);
                setMode('photo');
              }}
            />
          </Suspense>
        ) : photo ? (
          <figure className="showroom-photograph">
            <img
              src={photo}
              alt={'Actual vehicle photograph: ' + [vehicle?.make, vehicle?.model].filter(Boolean).join(' ')}
              loading="eager"
              decoding="async"
            />
            <figcaption>YOUR ACTUAL VEHICLE</figcaption>
          </figure>
        ) : (
          <div className="showroom-no-asset">
            <span className="showroom-no-asset-icon"><Camera size={36} strokeWidth={1.4} /></span>
            <strong>Make this garage yours</strong>
            <p>Add a photograph of your vehicle to give your personal showroom a real-life view.</p>
            <span>Your bookings and service history are already safe.</span>
          </div>
        )}
        {show3d ? <div className="showroom-3d-pill"><Box size={14} /> INTERACTIVE 3D</div> : null}
      </div>

      <div className="showroom-display-footer">
        <div className="showroom-display-note">
          {exact ? <ShieldCheck size={16} aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
          <span>
            {mode === '3d' && asset ? modelLabel : photo ? 'Photo of your actual vehicle' : modelLabel}
          </span>
        </div>
        <div className="showroom-display-actions">
          {mode === '3d' && photo ? (
            <button className="showroom-mode-button" type="button" onClick={() => setMode('photo')}>
              <ImageIcon size={16} /> Your photo
            </button>
          ) : null}
          {asset && mode !== '3d' ? (
            <button className="showroom-mode-button showroom-mode-primary" type="button" onClick={open3d}>
              <Box size={16} /> {exact ? 'Explore in 3D' : 'View similar 3D reference'}
            </button>
          ) : null}
        </div>
      </div>
      {(failed || canRender === false) ? (
        <p className="showroom-status" role="status">
          The 3D preview could not open on this device. Your photo and all vehicle records remain available.
          {asset ? <button className="text-link" type="button" onClick={open3d}>Try again</button> : null}
        </p>
      ) : null}
      {!asset ? (
        <p className="showroom-stage-disclaimer">
          A vehicle-specific 3D model is not available yet. We won't show a different car and call it yours.
        </p>
      ) : (
        <div className="showroom-stage-disclaimer">
          {mode === '3d' ? 'Drag to rotate · Scroll or use the controls to zoom · Keyboard arrows supported' : '3D loads only when you choose to open it to save mobile data.'}
          {asset.source ? (
            <a href={asset.source} target="_blank" rel="noreferrer" className="model-credits" aria-label={asset.attribution || '3D model credits'}>3D model credits</a>
          ) : null}
        </div>
      )}
    </div>
  );
}
