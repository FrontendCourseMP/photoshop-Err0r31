import type { OpenedImage } from "../../types/image";
import { yieldToBrowserFrame } from "../scheduler";

const GB7_SIGNATURE = [0x47, 0x42, 0x37, 0x1d];
const GB7_HEADER_SIZE = 12;
const GB7_VERSION = 0x01;
const YIELD_EVERY_PIXELS = 250_000;

function readUint16BE(view: DataView, offset: number): number {
  return view.getUint16(offset, false);
}

function validateSignature(bytes: Uint8Array): void {
  for (let index = 0; index < GB7_SIGNATURE.length; index += 1) {
    if (bytes[index] !== GB7_SIGNATURE[index]) {
      throw new Error("GB7: неверная сигнатура файла.");
    }
  }
}

export async function decodeGb7File(file: File): Promise<OpenedImage> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  if (bytes.length < GB7_HEADER_SIZE) {
    throw new Error("GB7: файл слишком короткий, заголовок поврежден.");
  }

  validateSignature(bytes);

  const version = bytes[4];
  if (version !== GB7_VERSION) {
    throw new Error(`GB7: неподдерживаемая версия ${version}.`);
  }

  const flags = bytes[5];
  if ((flags & 0b1111_1110) !== 0) {
    throw new Error("GB7: зарезервированные биты флага должны быть равны 0.");
  }
  const hasMask = (flags & 0b0000_0001) === 1;

  const width = readUint16BE(view, 6);
  const height = readUint16BE(view, 8);
  if (width === 0 || height === 0) {
    throw new Error("GB7: ширина и высота должны быть больше 0.");
  }

  const reserved = readUint16BE(view, 10);
  if (reserved !== 0) {
    throw new Error("GB7: резервное поле заголовка должно быть 0x0000.");
  }

  const pixelCount = width * height;
  const expectedLength = GB7_HEADER_SIZE + pixelCount;
  if (bytes.length !== expectedLength) {
    throw new Error(
      `GB7: некорректный размер файла. Ожидается ${expectedLength} байт, получено ${bytes.length}.`,
    );
  }

  const rgba = new Uint8ClampedArray(pixelCount * 4);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (pixelIndex > 0 && pixelIndex % YIELD_EVERY_PIXELS === 0) {
      await yieldToBrowserFrame();
    }

    const packedValue = bytes[GB7_HEADER_SIZE + pixelIndex];
    const gray7 = packedValue & 0x7f;
    const gray8 = Math.round((gray7 / 127) * 255);
    const alpha = hasMask ? ((packedValue & 0x80) !== 0 ? 255 : 0) : 255;

    const rgbaOffset = pixelIndex * 4;
    rgba[rgbaOffset] = gray8;
    rgba[rgbaOffset + 1] = gray8;
    rgba[rgbaOffset + 2] = gray8;
    rgba[rgbaOffset + 3] = alpha;
  }

  const bitmap = await createImageBitmap(new ImageData(rgba, width, height));

  return {
    fileName: file.name,
    width,
    height,
    colorDepth: 7,
    bitmap,
  };
}
