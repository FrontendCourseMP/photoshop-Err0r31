import type { ExportFormat, OpenedImage } from "../../types/image";
import { encodeGb7 } from "./encodeGb7";

function getFileBaseName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    return fileName;
  }
  return fileName.slice(0, lastDotIndex);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Не удалось сформировать файл изображения."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function exportOpenedImage(image: OpenedImage, format: ExportFormat): Promise<void> {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Не удалось получить 2D-контекст для экспорта.");
  }

  if (format === "jpg") {
    // JPEG has no alpha channel, so fill with white background first.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, image.width, image.height);
  }

  context.drawImage(image.bitmap, 0, 0);
  const fileBaseName = getFileBaseName(image.fileName);

  if (format === "png") {
    const blob = await toBlob(canvas, "image/png");
    downloadBlob(blob, `${fileBaseName}.png`);
    return;
  }

  if (format === "jpg") {
    const blob = await toBlob(canvas, "image/jpeg", 0.92);
    downloadBlob(blob, `${fileBaseName}.jpg`);
    return;
  }

  const imageData = context.getImageData(0, 0, image.width, image.height);
  const gb7Bytes = await encodeGb7(imageData);
  const gb7Buffer = new ArrayBuffer(gb7Bytes.byteLength);
  new Uint8Array(gb7Buffer).set(gb7Bytes);
  downloadBlob(new Blob([gb7Buffer], { type: "application/octet-stream" }), `${fileBaseName}.gb7`);
}
