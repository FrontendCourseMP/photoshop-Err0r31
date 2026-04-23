import type { OpenedImage } from "../types/image";
import { decodeGb7File } from "./image/decodeGb7";
import { decodeRasterBrowserFile } from "./image/decodeRaster";
import { SUPPORTED_IMAGE_EXTENSIONS, fileNameHasExtension, isGb7FileName } from "./image/formats";

export function isSupportedRasterFile(file: File): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.some((extension) =>
    fileNameHasExtension(file.name, extension),
  );
}

export async function decodeRasterFile(file: File): Promise<OpenedImage> {
  if (isGb7FileName(file.name)) {
    return decodeGb7File(file);
  }

  return decodeRasterBrowserFile(file);
}
