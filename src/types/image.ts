export type ImageColorDepth = 7 | 8 | 24 | 32;
export type ExportFormat = "png" | "jpg" | "gb7";

export type ChannelMode = "gray" | "gray+alpha" | "rgb" | "rgba";
export type ActiveTool = "none" | "eyedropper";

export type PixelInfo = {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
};

export type OpenedImage = {
  fileName: string;
  width: number;
  height: number;
  colorDepth: ImageColorDepth;
  bitmap: ImageBitmap;
  channelMode: ChannelMode;
};
