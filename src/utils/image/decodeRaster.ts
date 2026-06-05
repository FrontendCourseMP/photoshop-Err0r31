import type { ImageColorDepth, OpenedImage } from "../../types/image";
import { colorDepthToChannelMode } from "./channelUtils";
import { imageDataRegistry } from "./imageRegistry";

function detectColorDepth(file: File): ImageColorDepth {
  const fileType = file.type.toLowerCase();
  if (fileType === "image/jpeg" || fileType === "image/jpg") {
    return 24;
  }

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
    return 24;
  }

  return 32;
}

export async function decodeRasterBrowserFile(file: File): Promise<OpenedImage> {
  const bitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Не удалось создать 2D-контекст для извлечения данных изображения.");
  }
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

  imageDataRegistry.set(bitmap, imageData);

  const colorDepth = detectColorDepth(file);

  return {
    fileName: file.name,
    width: bitmap.width,
    height: bitmap.height,
    colorDepth,
    bitmap,
    channelMode: colorDepthToChannelMode(colorDepth),
  };
}
