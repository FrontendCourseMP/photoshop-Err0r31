export type ImageColorDepth = 7 | 24 | 32;
export type ExportFormat = "png" | "jpg" | "gb7";

export type OpenedImage = {
  fileName: string;
  width: number;
  height: number;
  colorDepth: ImageColorDepth;
  bitmap: ImageBitmap;
};
