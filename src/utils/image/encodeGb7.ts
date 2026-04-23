import { yieldToBrowserFrame } from "../scheduler";

const GB7_SIGNATURE = [0x47, 0x42, 0x37, 0x1d];
const GB7_VERSION = 0x01;
const GB7_HEADER_SIZE = 12;
const YIELD_EVERY_PIXELS = 250_000;

function toGray7(red: number, green: number, blue: number): number {
  const gray8 = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
  return Math.round((gray8 / 255) * 127);
}

export async function encodeGb7(imageData: ImageData): Promise<Uint8Array> {
  const { width, height, data } = imageData;
  if (width < 1 || height < 1 || width > 0xffff || height > 0xffff) {
    throw new Error("GB7: размеры изображения должны быть в диапазоне 1..65535.");
  }

  const pixelCount = width * height;
  const bytes = new Uint8Array(GB7_HEADER_SIZE + pixelCount);

  let hasMask = false;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (data[pixelIndex * 4 + 3] !== 255) {
      hasMask = true;
      break;
    }
  }

  bytes[0] = GB7_SIGNATURE[0];
  bytes[1] = GB7_SIGNATURE[1];
  bytes[2] = GB7_SIGNATURE[2];
  bytes[3] = GB7_SIGNATURE[3];
  bytes[4] = GB7_VERSION;
  bytes[5] = hasMask ? 0x01 : 0x00;
  bytes[6] = (width >> 8) & 0xff;
  bytes[7] = width & 0xff;
  bytes[8] = (height >> 8) & 0xff;
  bytes[9] = height & 0xff;
  bytes[10] = 0x00;
  bytes[11] = 0x00;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (pixelIndex > 0 && pixelIndex % YIELD_EVERY_PIXELS === 0) {
      await yieldToBrowserFrame();
    }

    const sourceOffset = pixelIndex * 4;
    const red = data[sourceOffset];
    const green = data[sourceOffset + 1];
    const blue = data[sourceOffset + 2];
    const alpha = data[sourceOffset + 3];
    const gray7 = toGray7(red, green, blue);

    let packed = gray7 & 0x7f;
    if (hasMask) {
      const maskBit = alpha >= 128 ? 0x80 : 0x00;
      packed |= maskBit;
    }

    bytes[GB7_HEADER_SIZE + pixelIndex] = packed;
  }

  return bytes;
}
