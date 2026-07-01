const DEFAULT_MAX_INPUT_SIZE = 20 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 1024;
const DEFAULT_QUALITY = 0.82;

const loadImage = (fileOrUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    let objectUrl = null;

    image.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal membaca gambar'));
    };

    if (typeof fileOrUrl === 'string') {
      image.crossOrigin = 'anonymous';
      image.src = fileOrUrl;
    } else {
      objectUrl = URL.createObjectURL(fileOrUrl);
      image.src = objectUrl;
    }
  });

const canvasToWebpBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Browser gagal mengonversi gambar ke WebP'));
      },
      'image/webp',
      quality
    );
  });

export const validateAvatarInput = (file, maxSize = DEFAULT_MAX_INPUT_SIZE) => {
  if (!file) return { valid: false, message: 'Pilih foto terlebih dahulu' };
  if (!file.type?.startsWith('image/')) return { valid: false, message: 'File harus berupa gambar' };
  if (file.size > maxSize) return { valid: false, message: 'Maksimal 20MB' };
  return { valid: true };
};

export const convertAvatarToWebp = async (
  file,
  {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
    outputName = 'avatar',
  } = {}
) => {
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await canvasToWebpBlob(canvas, quality);
  const safeName = (outputName || 'avatar').replace(/\.[^.]+$/, '');
  return new File([blob], `${safeName}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
};

export const AVATAR_MAX_SIZE_TEXT = '20MB';
