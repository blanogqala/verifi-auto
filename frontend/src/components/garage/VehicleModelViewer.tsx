import { useEffect } from 'react';

/**
 * Loads only when a catalogue entry has an asset URL.
 * A licensed model parser is not bundled. A failed or unreadable asset reports failure
 * so the page can use the illustrated fallback. The WebGL context is released on leave.
 */
export default function VehicleModelViewer({
  model,
  onFail,
}: {
  model: { src: string };
  onFail: () => void;
}) {
  useEffect(() => {
    let live = true;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
      onFail();
      return;
    }
    let dragging = false;
    const down = () => {
      dragging = true;
    };
    const up = () => {
      dragging = false;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    fetch(model.src)
      .then((response) => {
        if (!response.ok) throw Error('The vehicle model could not be loaded.');
        return response.arrayBuffer();
      })
      .then(() => {
        if (live) onFail();
      })
      .catch(() => {
        if (live) onFail();
      });
    return () => {
      live = false;
      dragging = false;
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [model.src, onFail]);
  return <p className="muted">Loading the licensed vehicle model.</p>;
}
