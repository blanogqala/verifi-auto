import { lazy, Suspense, useEffect, useState } from 'react';
import { Box, Camera, ShieldCheck, WifiOff } from 'lucide-react';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import { RoadLoader } from '../ui/RoadLoader';

const VehicleModelViewer = lazy(() => import('./VehicleModelViewer'));
const emptyPaint: string[] = [];

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function onDataSavingConnection() {
  try {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    return Boolean(connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType || ''));
  } catch {
    return false;
  }
}

/**
 * Automatic showroom matching is asset-driven, not a geometry generator:
 * - A reviewed matching model is displayed automatically on normal connections.
 * - A CC BY generation-level reference is labelled approximate (never exact).
 * - Data Saver/2G avoids automatic 3D downloads; visitors may opt in.
 * - Unmatched vehicles show uploaded photos, or a clean no-model state.
 * - Nothing about vehicle records, appointments or API persistence changes.
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
  const candidate = resolution.status === 'exact' || resolution.status === 'approximate'
    ? resolution.asset : null;
  const asset = candidate?.embedUrl || candidate?.src ? candidate : null;
  const exact = Boolean(asset && resolution.status === 'exact');
  const photo = typeof vehicle?.photo === 'string' ? vehicle.photo : '';
  const [mode, setMode] = useState<'auto' | 'photo' | '3d'>('auto');
  const [lowData, setLowData] = useState(onDataSavingConnection);
  const [failed, setFailed] = useState(false);
  const [canRender, setCanRender] = useState<boolean | null>(null);

  useEffect(() => {
    setMode('auto');
    setFailed(false);
    setCanRender(null);
    setLowData(onDataSavingConnection());
  }, [vehicle?.id, candidate?.src, candidate?.embedUrl]);

  const requested3d = Boolean(asset && (mode === '3d' || (mode === 'auto' && !lowData)));
  const show3d = requested3d && !failed && canRender !== false;
  const modelLabel = exact
    ? 'Verified 3D vehicle model'
    : asset
      ? (resolution.label || 'Generation-level 3D reference — not an exact vehicle match')
      : 'No verified 3D model found for these vehicle details';

  function open3d() {
    setFailed(false);
    if (!asset) return;
    if (asset.embedUrl) {
      setCanRender(null);
      setMode('3d');
      return;
    }
    const ready = supportsWebGL();
    setCanRender(ready);
    setFailed(!ready);
    if (ready) setMode('3d');
  }

  const showPhoto = Boolean(photo && !show3d);
  return (
    <div className={'vehicle-stage vehicle-stage-premium' + (compact ? ' vehicle-stage-compact' : '')}>
      <div className="showroom-display" aria-label="Vehicle showroom display">
        {show3d && asset?.embedUrl ? (
          <iframe
            key={asset.id}
            className="showroom-external-3d"
            src={asset.embedUrl}
            title={modelLabel + ' - interactive 3D model by ' + asset.author}
            loading="lazy"
            allow="fullscreen; autoplay; xr-spatial-tracking"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onError={() => {
              setFailed(true);
              setMode('photo');
            }}
          />
        ) : show3d && asset?.src ? (
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
        ) : showPhoto ? (
          <figure className="showroom-photograph">
            <img
              src={photo}
              alt={'Uploaded photograph associated with ' + [vehicle?.make, vehicle?.model].filter(Boolean).join(' ')}
              loading="eager"
              decoding="async"
            />
            <figcaption>UPLOADED REFERENCE PHOTO</figcaption>
          </figure>
        ) : (
          <div className="showroom-no-asset">
            <span className="showroom-no-asset-icon"><Camera size={36} strokeWidth={1.4} /></span>
            <strong>{asset ? 'Your 3D showroom is ready' : '3D model not available yet'}</strong>
            <p>{asset
              ? 'The 3D preview is paused to save data. Choose Explore 3D to rotate the available vehicle reference.'
              : 'Check the make, model, year and variant. We’ll show a real vehicle model when a suitable 3D asset is available.'}</p>
            <span>{asset ? modelLabel : 'Photo upload is optional. All vehicle records stay available.'}</span>
          </div>
        )}
        {show3d ? <div className="showroom-3d-pill"><Box size={14} /> {exact ? 'VERIFIED 3D MODEL' : '3D GENERATION REFERENCE'}</div> : null}
      </div>
      <div className="showroom-display-footer">
        <div className="showroom-display-note">
          {exact ? <ShieldCheck size={16} aria-hidden="true" /> : lowData && asset && !show3d
            ? <WifiOff size={16} aria-hidden="true" /> : <Box size={16} aria-hidden="true" />}
          <span>{show3d ? modelLabel : lowData && asset && mode !== 'photo'
            ? 'Data Saver detected — 3D paused to protect your data'
            : showPhoto ? 'Uploaded photo (not verified as your actual vehicle)'
            : modelLabel}</span>
        </div>
        <div className="showroom-display-actions">
          {asset && !show3d ? (
            <button className="showroom-mode-button showroom-mode-primary" type="button" onClick={open3d}>
              <Box size={16} /> Explore 3D
            </button>
          ) : null}
          {show3d && asset ? (
            <button className="showroom-mode-button" type="button" onClick={() => setMode('photo')}>
              <Camera size={16} /> {photo ? 'Use photo / save data' : 'Pause 3D'}
            </button>
          ) : null}
        </div>
      </div>
      {failed ? (
        <p className="showroom-status" role="status">
          The 3D preview could not open here. Your vehicle details and records are safe.
          {asset ? <button className="text-link" type="button" onClick={open3d}>Try again</button> : null}
        </p>
      ) : null}
      <div className="showroom-stage-disclaimer">
        <span>
          {asset
            ? exact
              ? 'Rotate, zoom and inspect your matched vehicle model.'
              : (resolution.reason || 'This real 3D reference is not an exact match to your year and trim.')
            : 'No suitable 3D asset for this model yet. We never substitute a generic car as an exact match.'}
          {show3d && asset?.embedUrl ? ' · Drag to rotate inside the viewer.' : ''}
        </span>
        {asset?.source ? <a href={asset.source} className="model-credits" target="_blank"
          rel="noopener noreferrer" aria-label={asset.attribution || '3D model credits'}>
          3D source and licence ({asset.licence || 'details'})
        </a> : null}
      </div>
    </div>
  );
}
