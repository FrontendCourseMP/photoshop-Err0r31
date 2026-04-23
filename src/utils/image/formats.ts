export const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gb7"] as const;

export function fileNameHasExtension(fileName: string, extension: string): boolean {
  return fileName.toLowerCase().endsWith(extension);
}

export function isGb7FileName(fileName: string): boolean {
  return fileNameHasExtension(fileName, ".gb7");
}
