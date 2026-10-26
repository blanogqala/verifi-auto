/** Compress a customer-owned car photograph for persisted private garage display.
 * This picture is of their actual vehicle; it is not an OEM stock image.
 */
export async function readVehiclePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw Error('Choose a JPG, PNG or WebP photo.');
  }
  if (!file.size || file.size > 8 * 1024 * 1024) {
    throw Error('Choose a photo smaller than 8 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loaded = new Image();
      loaded.onload = () => resolve(loaded);
      loaded.onerror = () => reject(Error('This image could not be opened.'));
      loaded.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw Error('Invalid car photo.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw Error('Image processing is not available in this browser.');
    let maxDimension = 960;
    let result = '';
    while (maxDimension >= 440) {
      const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.78, 0.68, 0.58, 0.48, 0.4]) {
        result = canvas.toDataURL('image/jpeg', quality);
        if (result.length <= 210000) return result;
      }
      maxDimension = Math.floor(maxDimension * 0.78);
    }
    throw Error('This photo cannot be reduced enough. Try a simpler image.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
