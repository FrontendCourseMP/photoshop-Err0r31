import { useEffect, useRef } from "react";
import type { ActiveTool, ChannelMode, PixelInfo } from "../../types/image";
import {
  areAllChannelsEnabled,
  renderWithChannels,
} from "../../utils/image/channelUtils";
import { imageDataRegistry } from "../../utils/image/imageRegistry";
import { INTERPOLATION_ALGORITHMS } from "../../utils/image/interpolation";
import styles from "./CanvasArea.module.scss";

type CanvasAreaProps = {
  bitmap: ImageBitmap | null;
  width: number;
  height: number;
  channelMode: ChannelMode | null;
  enabledChannels: Set<string>;
  activeTool: ActiveTool;
  onPixelPick: (pixel: PixelInfo) => void;
  visualScale: number;
  layoutScale: number;
  visualAlgorithmId: string;
  onScaleChange: (scale: number, immediate?: boolean) => void;
  fitTrigger: number;
};

export default function CanvasArea({
  bitmap,
  width,
  height,
  channelMode,
  enabledChannels,
  activeTool,
  onPixelPick,
  visualScale,
  layoutScale,
  visualAlgorithmId,
  onScaleChange,
  fitTrigger,
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bitmap) {
      const viewport = viewportRef.current;
      if (viewport) {
        const rect = viewport.getBoundingClientRect();
        const maxW = Math.max(rect.width - 100, 50);
        const maxH = Math.max(rect.height - 100, 50);

        let fitScale = Math.min(maxW / width, maxH / height);
        fitScale = Math.min(Math.max(fitScale, 0.12), 3.0);

        onScaleChange(Math.round(fitScale * 100) / 100, true);
      }
    }
  }, [bitmap, width, height, fitTrigger, onScaleChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap || !channelMode) {
      return;
    }

    const originalImageData = imageDataRegistry.get(bitmap);
    if (!originalImageData) {
      return;
    }

    const allEnabled = areAllChannelsEnabled(enabledChannels, channelMode);
    const srcImageData = allEnabled
      ? originalImageData
      : renderWithChannels(originalImageData, enabledChannels, channelMode);

    const zoomedWidth = Math.max(Math.round(width * visualScale), 1);
    const zoomedHeight = Math.max(Math.round(height * visualScale), 1);

    canvas.width = zoomedWidth;
    canvas.height = zoomedHeight;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    const algo =
      INTERPOLATION_ALGORITHMS[visualAlgorithmId] ||
      INTERPOLATION_ALGORITHMS.bilinear;

    let finalImageData = srcImageData;
    if (zoomedWidth !== width || zoomedHeight !== height) {
      finalImageData = algo.scale(srcImageData, zoomedWidth, zoomedHeight);
    }

    context.putImageData(finalImageData, 0, 0);
  }, [bitmap, width, height, enabledChannels, channelMode, visualScale, visualAlgorithmId]);

  function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool !== "eyedropper") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !bitmap) {
      return;
    }

    const originalImageData = imageDataRegistry.get(bitmap);
    if (!originalImageData) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    const zoomedWidth = canvas.width;
    const zoomedHeight = canvas.height;

    const x = Math.min(
      Math.max(Math.floor((clickX / zoomedWidth) * width), 0),
      width - 1,
    );
    const y = Math.min(
      Math.max(Math.floor((clickY / zoomedHeight) * height), 0),
      height - 1,
    );

    const idx = (y * width + x) * 4;
    const r = originalImageData.data[idx];
    const g = originalImageData.data[idx + 1];
    const b = originalImageData.data[idx + 2];
    const a = originalImageData.data[idx + 3];

    onPixelPick({ x, y, r, g, b, a });
  }

  const hasImage = Boolean(bitmap);
  const isEyedropper = activeTool === "eyedropper" && hasImage;

  const layoutWidth = Math.max(Math.round(width * layoutScale), 1);
  const layoutHeight = Math.max(Math.round(height * layoutScale), 1);

  const canvasStyle = hasImage
    ? {
      width: `${layoutWidth}px`,
      height: `${layoutHeight}px`,
    }
    : undefined;

  return (
    <div className={styles.canvasArea}>
      <div className={styles.canvasArea__viewport} ref={viewportRef}>
        {hasImage ? (
          <div className={styles.canvasArea__content}>
            <canvas
              ref={canvasRef}
              className={`${styles.canvasArea__canvas} ${isEyedropper ? styles.canvasArea__canvasEyedropper : ""}`}
              style={canvasStyle}
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