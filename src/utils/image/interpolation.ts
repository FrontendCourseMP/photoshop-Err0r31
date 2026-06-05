import { yieldToBrowserFrame } from "../scheduler";

export interface InterpolationAlgorithm {
  id: string;
  name: string;
  description: string;
  advantages: string;
  scale(source: ImageData, targetWidth: number, targetHeight: number): Promise<ImageData>;
}

export function nearestNeighborScaleSync(
  source: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const srcWidth = source.width;
  const srcHeight = source.height;
  const srcData = source.data;
  const target = new ImageData(targetWidth, targetHeight);
  const targetData = target.data;

  const src32 = new Uint32Array(srcData.buffer);
  const target32 = new Uint32Array(targetData.buffer);

  const scaleX = srcWidth / targetWidth;
  const scaleY = srcHeight / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const srcYReal = (y + 0.5) * scaleY;
    const srcY = Math.min(Math.max(Math.floor(srcYReal), 0), srcHeight - 1);
    const srcYOffset = srcY * srcWidth;
    const targetYOffset = y * targetWidth;

    for (let x = 0; x < targetWidth; x++) {
      const srcXReal = (x + 0.5) * scaleX;
      const srcX = Math.min(Math.max(Math.floor(srcXReal), 0), srcWidth - 1);
      target32[targetYOffset + x] = src32[srcYOffset + srcX];
    }
  }

  return target;
}

export async function nearestNeighborScale(
  source: ImageData,
  targetWidth: number,
  targetHeight: number
): Promise<ImageData> {
  const srcWidth = source.width;
  const srcHeight = source.height;
  const srcData = source.data;
  const target = new ImageData(targetWidth, targetHeight);
  const targetData = target.data;

  const src32 = new Uint32Array(srcData.buffer);
  const target32 = new Uint32Array(targetData.buffer);

  const scaleX = srcWidth / targetWidth;
  const scaleY = srcHeight / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    if (y > 0 && y % 100 === 0) {
      await yieldToBrowserFrame();
    }

    const srcYReal = (y + 0.5) * scaleY;
    const srcY = Math.min(Math.max(Math.floor(srcYReal), 0), srcHeight - 1);
    const srcYOffset = srcY * srcWidth;
    const targetYOffset = y * targetWidth;

    for (let x = 0; x < targetWidth; x++) {
      const srcXReal = (x + 0.5) * scaleX;
      const srcX = Math.min(Math.max(Math.floor(srcXReal), 0), srcWidth - 1);
      target32[targetYOffset + x] = src32[srcYOffset + srcX];
    }
  }

  return target;
}

export async function bilinearScale(
  source: ImageData,
  targetWidth: number,
  targetHeight: number
): Promise<ImageData> {
  const srcWidth = source.width;
  const srcHeight = source.height;
  const srcData = source.data;
  const target = new ImageData(targetWidth, targetHeight);
  const targetData = target.data;

  const scaleX = srcWidth / targetWidth;
  const scaleY = srcHeight / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    if (y > 0 && y % 50 === 0) {
      await yieldToBrowserFrame();
    }

    const srcYReal = (y + 0.5) * scaleY - 0.5;
    const y0 = Math.floor(srcYReal);
    const y1 = y0 + 1;
    const dy = srcYReal - y0;

    const y0Clamped = Math.min(Math.max(y0, 0), srcHeight - 1);
    const y1Clamped = Math.min(Math.max(y1, 0), srcHeight - 1);

    const y0Offset = y0Clamped * srcWidth * 4;
    const y1Offset = y1Clamped * srcWidth * 4;
    const targetYOffset = y * targetWidth * 4;

    for (let x = 0; x < targetWidth; x++) {
      const srcXReal = (x + 0.5) * scaleX - 0.5;
      const x0 = Math.floor(srcXReal);
      const x1 = x0 + 1;
      const dx = srcXReal - x0;

      const x0Clamped = Math.min(Math.max(x0, 0), srcWidth - 1);
      const x1Clamped = Math.min(Math.max(x1, 0), srcWidth - 1);

      const idx00 = y0Offset + x0Clamped * 4;
      const idx10 = y0Offset + x1Clamped * 4;
      const idx01 = y1Offset + x0Clamped * 4;
      const idx11 = y1Offset + x1Clamped * 4;

      const targetIdx = targetYOffset + x * 4;

      const w00 = (1 - dx) * (1 - dy);
      const w10 = dx * (1 - dy);
      const w01 = (1 - dx) * dy;
      const w11 = dx * dy;

      targetData[targetIdx] =
        srcData[idx00] * w00 +
        srcData[idx10] * w10 +
        srcData[idx01] * w01 +
        srcData[idx11] * w11;

      targetData[targetIdx + 1] =
        srcData[idx00 + 1] * w00 +
        srcData[idx10 + 1] * w10 +
        srcData[idx01 + 1] * w01 +
        srcData[idx11 + 1] * w11;

      targetData[targetIdx + 2] =
        srcData[idx00 + 2] * w00 +
        srcData[idx10 + 2] * w10 +
        srcData[idx01 + 2] * w01 +
        srcData[idx11 + 2] * w11;

      targetData[targetIdx + 3] =
        srcData[idx00 + 3] * w00 +
        srcData[idx10 + 3] * w10 +
        srcData[idx01 + 3] * w01 +
        srcData[idx11 + 3] * w11;
    }
  }

  return target;
}

export const INTERPOLATION_ALGORITHMS: Record<string, InterpolationAlgorithm> = {
  bilinear: {
    id: "bilinear",
    name: "Билинейная интерполяция",
    description: "Рассчитывает цвет пикселя на основе средневзвешенного значения четырех ближайших пикселей.",
    advantages: "Сглаживает неровности и ступеньки на границах объектов, давая более мягкое изображение по сравнению с методом ближайшего соседа.",
    scale: bilinearScale,
  },
  nearest: {
    id: "nearest",
    name: "Ближайший сосед",
    description: "Просто выбирает цвет ближайшего пикселя из исходного изображения.",
    advantages: "Максимально быстрый метод. Идеален для пиксель-арта, так как сохраняет четкие жесткие границы пикселей без какого-либо размытия.",
    scale: nearestNeighborScale,
  },
};
