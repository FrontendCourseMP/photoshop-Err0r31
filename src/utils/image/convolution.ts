import { yieldToBrowserFrame } from "../scheduler";
import type { ChannelMode } from "../../types/image";

function expandImage(
  source: ImageData,
  edgeStrategy: "black" | "white" | "clamp"
): ImageData {
  const { width: w, height: h } = source;
  const pw = w + 2;
  const ph = h + 2;
  const padded = new ImageData(pw, ph);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      const dstIdx = ((y + 1) * pw + (x + 1)) * 4;
      padded.data[dstIdx] = source.data[srcIdx];
      padded.data[dstIdx + 1] = source.data[srcIdx + 1];
      padded.data[dstIdx + 2] = source.data[srcIdx + 2];
      padded.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }

  const copyPixel = (srcX: number, srcY: number, dstX: number, dstY: number, forceColor?: number) => {
    const srcIdx = (srcY * w + srcX) * 4;
    const dstIdx = (dstY * pw + dstX) * 4;
    if (forceColor !== undefined) {
      padded.data[dstIdx] = forceColor;
      padded.data[dstIdx + 1] = forceColor;
      padded.data[dstIdx + 2] = forceColor;
    } else {
      padded.data[dstIdx] = source.data[srcIdx];
      padded.data[dstIdx + 1] = source.data[srcIdx + 1];
      padded.data[dstIdx + 2] = source.data[srcIdx + 2];
    }
    padded.data[dstIdx + 3] = source.data[srcIdx + 3];
  };

  const colorVal = edgeStrategy === "black" ? 0 : edgeStrategy === "white" ? 255 : undefined;

  copyPixel(0, 0, 0, 0, colorVal);
  copyPixel(w - 1, 0, pw - 1, 0, colorVal);
  copyPixel(0, h - 1, 0, ph - 1, colorVal);
  copyPixel(w - 1, h - 1, pw - 1, ph - 1, colorVal);

  for (let x = 0; x < w; x++) {
    copyPixel(x, 0, x + 1, 0, colorVal);
    copyPixel(x, h - 1, x + 1, ph - 1, colorVal);
  }

  for (let y = 0; y < h; y++) {
    copyPixel(0, y, 0, y + 1, colorVal);
    copyPixel(w - 1, y, pw - 1, y + 1, colorVal);
  }

  return padded;
}

export async function applyConvolution3x3(
  source: ImageData,
  kernel: number[],
  edgeStrategy: "black" | "white" | "clamp",
  enabledChannels: Set<string>,
  channelMode: ChannelMode,
  onProgress?: (progress: number) => void
): Promise<ImageData> {
  const { width, height } = source;
  const target = new ImageData(width, height);

  const kernelSum = kernel.reduce((sum, val) => sum + val, 0);
  const posSum = kernel.reduce((sum, val) => val > 0 ? sum + val : sum, 0);
  const divisor = kernelSum !== 0 ? kernelSum : (posSum !== 0 ? posSum : 1);

  const pw = width + 2;
  const padded = expandImage(source, edgeStrategy);

  const isGray = channelMode.startsWith("gray");
  const hasAlpha = channelMode === "rgba" || channelMode === "gray+alpha";

  for (let y = 0; y < height; y++) {
    if (y > 0 && y % 50 === 0) {
      if (onProgress) {
        onProgress(Math.round((y / height) * 100));
      }
      await yieldToBrowserFrame();
    }

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const px = x + 1;
      const py = y + 1;

      if (isGray) {
        if (enabledChannels.has("gray")) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
              const valIdx = ((py + ky) * pw + (px + kx)) * 4;
              sum += kVal * padded.data[valIdx];
            }
          }
          const val = kernelSum === 0
            ? Math.min(Math.max(Math.round(Math.abs(sum / divisor)), 0), 255)
            : Math.min(Math.max(Math.round(sum / divisor), 0), 255);
          target.data[idx] = val;
          target.data[idx + 1] = val;
          target.data[idx + 2] = val;
        } else {
          target.data[idx] = source.data[idx];
          target.data[idx + 1] = source.data[idx + 1];
          target.data[idx + 2] = source.data[idx + 2];
        }

        if (hasAlpha) {
          if (enabledChannels.has("alpha")) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
                const valIdx = ((py + ky) * pw + (px + kx)) * 4;
                sum += kVal * padded.data[valIdx + 3];
              }
            }
            const val = kernelSum === 0
              ? Math.min(Math.max(Math.round(Math.abs(sum / divisor)), 0), 255)
              : Math.min(Math.max(Math.round(sum / divisor), 0), 255);
            target.data[idx + 3] = val;
          } else {
            target.data[idx + 3] = source.data[idx + 3];
          }
        } else {
          target.data[idx + 3] = 255;
        }
      } else {
        for (let c = 0; c < 3; c++) {
          const chName = c === 0 ? "red" : c === 1 ? "green" : "blue";
          if (enabledChannels.has(chName)) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
                const valIdx = ((py + ky) * pw + (px + kx)) * 4 + c;
                sum += kVal * padded.data[valIdx];
              }
            }
            const val = kernelSum === 0
              ? Math.min(Math.max(Math.round(Math.abs(sum / divisor)), 0), 255)
              : Math.min(Math.max(Math.round(sum / divisor), 0), 255);
            target.data[idx + c] = val;
          } else {
            target.data[idx + c] = source.data[idx + c];
          }
        }

        if (hasAlpha) {
          if (enabledChannels.has("alpha")) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
                const valIdx = ((py + ky) * pw + (px + kx)) * 4 + 3;
                sum += kVal * padded.data[valIdx];
              }
            }
            const val = kernelSum === 0
              ? Math.min(Math.max(Math.round(Math.abs(sum / divisor)), 0), 255)
              : Math.min(Math.max(Math.round(sum / divisor), 0), 255);
            target.data[idx + 3] = val;
          } else {
            target.data[idx + 3] = source.data[idx + 3];
          }
        } else {
          target.data[idx + 3] = 255;
        }
      }
    }
  }

  if (onProgress) {
    onProgress(100);
  }
  return target;
}

export const CONVOLUTION_PRESETS = {
  identity: {
    id: "identity",
    name: "Тождественное отображение",
    kernel: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  },
  sharpen: {
    id: "sharpen",
    name: "Повышение резкости",
    kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  },
  gaussian: {
    id: "gaussian",
    name: "Фильтр Гаусса (3х3)",
    kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1],
  },
  boxblur: {
    id: "boxblur",
    name: "Прямоугольное размытие",
    kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  prewittH: {
    id: "prewittH",
    name: "Оператор Прюитта (X)",
    kernel: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
  },
  prewittV: {
    id: "prewittV",
    name: "Оператор Прюитта (Y)",
    kernel: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
  },
};
