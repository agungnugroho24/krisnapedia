export type CoverCropTransform = {
  zoom: number;
  offsetX: number;
  offsetY: number;
  frameWidth: number;
  frameHeight: number;
};

const COVER_EXPORT_MAX_BYTES = 500 * 1024;
const COVER_EXPORT_WIDTH = 1024;
const COVER_EXPORT_HEIGHT = 768;
const COVER_CROP_RATIO = COVER_EXPORT_WIDTH / COVER_EXPORT_HEIGHT;
export const COVER_CROP_OVERSCAN = 1;

type RenderContext = {
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  drawWidth: number;
  drawHeight: number;
  translateX: number;
  translateY: number;
  maxOffsetX: number;
  maxOffsetY: number;
};

export function getCoverRenderContext(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  transform: CoverCropTransform,
): RenderContext {
  const safeViewportWidth = Math.max(viewportWidth, 1);
  const safeViewportHeight = Math.max(viewportHeight, 1);
  const scaleToCover = Math.max(safeViewportWidth / imageWidth, safeViewportHeight / imageHeight);
  const scale = scaleToCover * transform.zoom * COVER_CROP_OVERSCAN;
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const maxOffsetX = Math.max(0, (drawWidth - safeViewportWidth) / (2 * safeViewportWidth));
  const maxOffsetY = Math.max(0, (drawHeight - safeViewportHeight) / (2 * safeViewportHeight));

  return {
    viewportWidth: safeViewportWidth,
    viewportHeight: safeViewportHeight,
    scale,
    drawWidth,
    drawHeight,
    translateX: safeViewportWidth / 2 + transform.offsetX * safeViewportWidth,
    translateY: safeViewportHeight / 2 + transform.offsetY * safeViewportHeight,
    maxOffsetX,
    maxOffsetY,
  };
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal memuat gambar cover."));
    image.src = url;
  });
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await loadImageFromUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function blobToFile(blob: Blob, sourceName: string) {
  const normalizedName = sourceName.replace(/\.[^.]+$/, "");
  return new File([blob], `${normalizedName || "cover"}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Gagal membuat file cover."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function getOutputSize() {
  return { width: COVER_EXPORT_WIDTH, height: COVER_EXPORT_HEIGHT };
}

function drawCroppedCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  transform: CoverCropTransform,
  viewportWidth: number,
  viewportHeight: number,
) {
  const { translateX, translateY, scale } = getCoverRenderContext(
    image.naturalWidth,
    image.naturalHeight,
    viewportWidth,
    viewportHeight,
    transform,
  );

  ctx.save();
  ctx.translate(translateX, translateY);
  ctx.scale(scale, scale);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.restore();
}

export async function exportCroppedCover(
  file: File,
  transform: CoverCropTransform,
  maxBytes = COVER_EXPORT_MAX_BYTES,
) {
  const image = await loadImageFromFile(file);
  const baseSize = getOutputSize();
  const resizeSteps = [1, 0.92, 0.84, 0.76, 0.68];
  const qualitySteps = [0.92, 0.84, 0.76, 0.68, 0.6, 0.54];

  for (const resizeFactor of resizeSteps) {
    const width = Math.max(640, Math.round(baseSize.width * resizeFactor));
    const height = Math.max(480, Math.round(baseSize.height * resizeFactor));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Browser tidak mendukung pemrosesan cover.");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    drawCroppedCover(ctx, image, transform, width, height);

    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= maxBytes) {
        return blobToFile(blob, file.name);
      }
    }
  }

  throw new Error("Cover hasil crop masih melebihi 500 KB. Coba kurangi zoom atau gunakan gambar yang lebih kecil.");
}


