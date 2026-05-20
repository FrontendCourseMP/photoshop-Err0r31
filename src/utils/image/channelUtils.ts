import type { ChannelMode, ImageColorDepth } from "../../types/image";

export function colorDepthToChannelMode(depth: ImageColorDepth): ChannelMode {
  switch (depth) {
    case 7:
      return "gray";
    case 8:
      return "gray+alpha";
    case 24:
      return "rgb";
    case 32:
      return "rgba";
  }
}

export function getChannelNames(mode: ChannelMode): string[] {
  switch (mode) {
    case "gray":
      return ["gray"];
    case "gray+alpha":
      return ["gray", "alpha"];
    case "rgb":
      return ["red", "green", "blue"];
    case "rgba":
      return ["red", "green", "blue", "alpha"];
  }
}

export function getChannelLabel(channel: string): string {
  switch (channel) {
    case "red":
      return "Красный";
    case "green":
      return "Зелёный";
    case "blue":
      return "Синий";
    case "alpha":
      return "Альфа";
    case "gray":
      return "Серый";
    default:
      return channel;
  }
}

export function getChannelAccentColor(channel: string): string {
  switch (channel) {
    case "red":
      return "#f85149";
    case "green":
      return "#3fb950";
    case "blue":
      return "#4aa3ff";
    case "alpha":
      return "#a9a9a9";
    case "gray":
      return "#a9a9a9";
    default:
      return "#a9a9a9";
  }
}

export function areAllChannelsEnabled(
  enabled: Set<string>,
  mode: ChannelMode,
): boolean {
  const all = getChannelNames(mode);
  return all.length > 0 && all.every((ch) => enabled.has(ch));
}

export function renderWithChannels(
  source: ImageData,
  enabledChannels: Set<string>,
  channelMode: ChannelMode,
): ImageData {
  const { width, height, data } = source;
  const result = new ImageData(width, height);
  const out = result.data;

  const isGrayMode =
    channelMode === "gray" || channelMode === "gray+alpha";
  const hasAlpha =
    channelMode === "rgba" || channelMode === "gray+alpha";

  const channels = getChannelNames(channelMode);

  const onlyAlpha =
    hasAlpha &&
    enabledChannels.has("alpha") &&
    channels.filter((c) => c !== "alpha").every((c) => !enabledChannels.has(c));

  const showRed = enabledChannels.has("red");
  const showGreen = enabledChannels.has("green");
  const showBlue = enabledChannels.has("blue");
  const showAlpha = hasAlpha && enabledChannels.has("alpha");
  const showGray = enabledChannels.has("gray");

  for (let i = 0; i < data.length; i += 4) {
    if (onlyAlpha) {
      const a = data[i + 3];
      out[i] = a;
      out[i + 1] = a;
      out[i + 2] = a;
      out[i + 3] = 255;
    } else if (isGrayMode) {
      const gray = showGray ? data[i] : 0;
      out[i] = gray;
      out[i + 1] = gray;
      out[i + 2] = gray;
      out[i + 3] = showAlpha ? data[i + 3] : 255;
    } else {
      out[i] = showRed ? data[i] : 0;
      out[i + 1] = showGreen ? data[i + 1] : 0;
      out[i + 2] = showBlue ? data[i + 2] : 0;
      out[i + 3] = showAlpha ? data[i + 3] : 255;
    }
  }

  return result;
}

function extractChannelPreview(
  source: ImageData,
  channel: string,
): ImageData {
  const { width, height, data } = source;
  const result = new ImageData(width, height);
  const out = result.data;

  for (let i = 0; i < data.length; i += 4) {
    let value: number;
    switch (channel) {
      case "red":
        value = data[i];
        break;
      case "green":
        value = data[i + 1];
        break;
      case "blue":
        value = data[i + 2];
        break;
      case "alpha":
        value = data[i + 3];
        break;
      case "gray":
        value = data[i];
        break;
      default:
        value = 0;
    }
    out[i] = value;
    out[i + 1] = value;
    out[i + 2] = value;
    out[i + 3] = 255;
  }

  return result;
}

const THUMB_MAX_WIDTH = 80;

export function generateChannelThumbnails(
  bitmap: ImageBitmap,
  channelMode: ChannelMode,
): Map<string, string> {
  const { width, height } = bitmap;

  const scale = Math.min(1, THUMB_MAX_WIDTH / width);
  const thumbW = Math.max(1, Math.round(width * scale));
  const thumbH = Math.max(1, Math.round(height * scale));

  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const thumbCtx = thumbCanvas.getContext("2d", { willReadFrequently: true })!;
  thumbCtx.drawImage(bitmap, 0, 0, thumbW, thumbH);

  const smallData = thumbCtx.getImageData(0, 0, thumbW, thumbH);
  const channels = getChannelNames(channelMode);
  const result = new Map<string, string>();

  for (const channel of channels) {
    const preview = extractChannelPreview(smallData, channel);
    thumbCtx.putImageData(preview, 0, 0);
    result.set(channel, thumbCanvas.toDataURL());
  }

  return result;
}
