import { useEffect, useRef } from "react";
import type { ActiveTool, ChannelMode, PixelInfo } from "../../types/image";
import {
  areAllChannelsEnabled,
  renderWithChannels,
} from "../../utils/image/channelUtils";
import { imageDataRegistry } from "../../utils/image/imageRegistry";
import styles from "./CanvasArea.module.scss";

type CanvasAreaProps = {
  bitmap: ImageBitmap | null;
  width: number;
  height: number;
  channelMode: ChannelMode | null;
  enabledChannels: Set<string>;
  activeTool: ActiveTool;
  onPixelPick: (pixel: PixelInfo) => void;
};

export default function CanvasArea({
  bitmap,
  width,
  height,
  channelMode,
  enabledChannels,
  activeTool,
  onPixelPick,
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap || !channelMode) {
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    const imageData = bitmap ? imageDataRegistry.get(bitmap) : null;
    const allEnabled = areAllChannelsEnabled(enabledChannels, channelMode);
    if (allEnabled) {
      if (bitmap) {
        context.clearRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0);
      } else if (imageData) {
        context.putImageData(imageData, 0, 0);
      }
    } else {
      if (imageData) {
        const filtered = renderWithChannels(
          imageData,
          enabledChannels,
          channelMode,
        );
        context.putImageData(filtered, 0, 0);
      }
    }
  }, [bitmap, width, height, enabledChannels, channelMode]);

  function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool !== "eyedropper") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !bitmap) {
      return;
    }

    const imageData = imageDataRegistry.get(bitmap);
    if (!imageData) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);

    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      return;
    }

    const idx = (y * canvas.width + x) * 4;
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];
    const a = imageData.data[idx + 3];

    onPixelPick({ x, y, r, g, b, a });
  }

  const hasImage = Boolean(bitmap);
  const isEyedropper = activeTool === "eyedropper" && hasImage;

  return (
    <div className={styles.canvasArea}>
      <div className={styles.canvasArea__viewport}>
        {hasImage ? (
          <div className={styles.canvasArea__content}>
            <canvas
              ref={canvasRef}
              className={`${styles.canvasArea__canvas} ${isEyedropper ? styles.canvasArea__canvasEyedropper : ""}`}
              width={width}
              height={height}
              onClick={handleCanvasClick}
            />
          </div>
        ) : (
          <div className={styles.canvasArea__placeholder}>
            Холст готов к загрузке изображения
          </div>
        )}
      </div>
    </div>
  );
}