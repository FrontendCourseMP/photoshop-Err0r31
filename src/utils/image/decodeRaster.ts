import type { ImageColorDepth, OpenedImage } from "../../types/image";

function detectColorDepthFromMimeType(fileType: string): ImageColorDepth {
  return fileType === "image/jpeg" ? 24 : 32;
}

export async function decodeRasterBrowserFile(file: File): Promise<OpenedImage> {
  const bitmap = await createImageBitmap(file);

  return {
    fileName: file.name,
    width: bitmap.width,
    height: bitmap.height,
    colorDepth: detectColorDepthFromMimeType(file.type),
    bitmap,
  };
}
