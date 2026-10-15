const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function photoFileError(file: { type?: string; size?: number } | null) {
  if (!file) return 'Choose a JPG, PNG, or WebP image.';
  if (!photoTypes.includes(file.type || '')) return 'Choose a JPG, PNG, or WebP image.';
  if (!file.size || file.size > 8 * 1024 * 1024) return 'Choose an image smaller than 8 MB.';
  return '';
}

/** Resize a selected image for browser-local preview storage. This is not a server upload. */
export function readProfilePhoto(file: File) {
  const error = photoFileError(file);
  if (error) return Promise.reject(new Error(error));
  return file
    .arrayBuffer()
    .then((buffer) => {
      const blob = new Blob([buffer], { type: file.type });
      const url = URL.createObjectURL(blob);
      return loadImage(url).finally(() => URL.revokeObjectURL(url));
    })
    .then((image) => compressImage(image))
    .catch((reason) => {
      if (reason instanceof Error && reason.message) throw reason;
      throw new Error('This image could not be read. Try a different JPG, PNG, or WebP.');
    });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('This image could not be read. Try a different JPG, PNG, or WebP.'));
    image.src = url;
  });
}

function compressImage(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  const max = 320;
  const longest = Math.max(image.width, image.height) || 1;
  const scale = Math.min(1, max / longest);
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This image could not be read. Try a different JPG, PNG, or WebP.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.72;
  let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > 120000 && quality > 0.45) {
    quality = Math.round((quality - 0.1) * 100) / 100;
    result = canvas.toDataURL('image/jpeg', quality);
  }
  if (!result.startsWith('data:image/jpeg') || result.length > 120000) {
    throw new Error('This image is still too large to keep in this browser preview. Try a smaller photo.');
  }
  return result;
}
