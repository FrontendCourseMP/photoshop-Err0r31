import { useState, useEffect, useRef } from "react";
import type { ChannelMode } from "../../types/image";
import { getChannelNames, getChannelLabel } from "../../utils/image/channelUtils";
import { applyConvolution3x3, CONVOLUTION_PRESETS } from "../../utils/image/convolution";
import styles from "./FilterDialog.module.scss";

type FilterDialogProps = {
  isOpen: boolean;
  channelMode: ChannelMode | null;
  originalImageData: ImageData | null;
  onClose: () => void;
  onApply: (newData: ImageData) => void;
};

export default function FilterDialog({
  isOpen,
  channelMode,
  originalImageData,
  onClose,
  onApply,
}: FilterDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [presetId, setPresetId] = useState<string>("identity");
  const [kernelStrings, setKernelStrings] = useState<string[]>(
    CONVOLUTION_PRESETS.identity.kernel.map((v) => v.toString())
  );
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [edgeStrategy, setEdgeStrategy] = useState<"black" | "white" | "clamp">("clamp");
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [thumbnailData, setThumbnailData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const kernel = kernelStrings.map((s) => parseFloat(s) || 0);

  useEffect(() => {
    if (isOpen && channelMode) {
      setSelectedChannels(new Set(getChannelNames(channelMode)));
    }
  }, [isOpen, channelMode]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!originalImageData || !isOpen) {
      setThumbnailData(null);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = originalImageData.width;
    canvas.height = originalImageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(originalImageData, 0, 0);

    const scale = Math.min(1, 300 / originalImageData.width, 200 / originalImageData.height);
    const tW = Math.max(1, Math.floor(originalImageData.width * scale));
    const tH = Math.max(1, Math.floor(originalImageData.height * scale));

    const scaleCanvas = document.createElement("canvas");
    scaleCanvas.width = tW;
    scaleCanvas.height = tH;
    const sCtx = scaleCanvas.getContext("2d");
    if (!sCtx) return;

    sCtx.drawImage(canvas, 0, 0, tW, tH);
    setThumbnailData(sCtx.getImageData(0, 0, tW, tH));
  }, [originalImageData, isOpen]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !thumbnailData || !channelMode) return;

    if (!showPreview) {
      canvas.width = thumbnailData.width;
      canvas.height = thumbnailData.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.putImageData(thumbnailData, 0, 0);
      }
      return;
    }

    const kernelSum = kernel.reduce((sum, val) => sum + val, 0);
    const posSum = kernel.reduce((sum, val) => val > 0 ? sum + val : sum, 0);
    const divisor = kernelSum !== 0 ? kernelSum : (posSum !== 0 ? posSum : 1);

    const { width, height } = thumbnailData;
    const target = new ImageData(width, height);

    const pw = width + 2;
    const ph = height + 2;
    const padded = new ImageData(pw, ph);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = ((y + 1) * pw + (x + 1)) * 4;
        padded.data[dstIdx] = thumbnailData.data[srcIdx];
        padded.data[dstIdx + 1] = thumbnailData.data[srcIdx + 1];
        padded.data[dstIdx + 2] = thumbnailData.data[srcIdx + 2];
        padded.data[dstIdx + 3] = thumbnailData.data[srcIdx + 3];
      }
    }

    const copyPixel = (srcX: number, srcY: number, dstX: number, dstY: number, forceColor?: number) => {
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (dstY * pw + dstX) * 4;
      if (forceColor !== undefined) {
        padded.data[dstIdx] = forceColor;
        padded.data[dstIdx + 1] = forceColor;
        padded.data[dstIdx + 2] = forceColor;
      } else {
        padded.data[dstIdx] = thumbnailData.data[srcIdx];
        padded.data[dstIdx + 1] = thumbnailData.data[srcIdx + 1];
        padded.data[dstIdx + 2] = thumbnailData.data[srcIdx + 2];
      }
      padded.data[dstIdx + 3] = thumbnailData.data[srcIdx + 3];
    };

    const colorVal = edgeStrategy === "black" ? 0 : edgeStrategy === "white" ? 255 : undefined;

    copyPixel(0, 0, 0, 0, colorVal);
    copyPixel(width - 1, 0, pw - 1, 0, colorVal);
    copyPixel(0, height - 1, 0, ph - 1, colorVal);
    copyPixel(width - 1, height - 1, pw - 1, ph - 1, colorVal);

    for (let x = 0; x < width; x++) {
      copyPixel(x, 0, x + 1, 0, colorVal);
      copyPixel(x, height - 1, x + 1, ph - 1, colorVal);
    }

    for (let y = 0; y < height; y++) {
      copyPixel(0, y, 0, y + 1, colorVal);
      copyPixel(width - 1, y, pw - 1, y + 1, colorVal);
    }

    const isGray = channelMode.startsWith("gray");
    const hasAlpha = channelMode === "rgba" || channelMode === "gray+alpha";

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const px = x + 1;
        const py = y + 1;

        if (isGray) {
          if (selectedChannels.has("gray")) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
                const valIdx = ((py + ky) * pw + (px + kx)) * 4;
                sum += kVal * padded.data[valIdx];
              }
            }
            const val = kernelSum === 0
              ? Math.min(Math.max(Math.round(Math.abs(sum / divisor)), 0), 255)
              : Math.min(Math.max(Math.round(sum / divisor), 0), 255);
            target.data[idx] = val;
            target.data[idx + 1] = val;
            target.data[idx + 2] = val;
          } else {
            target.data[idx] = thumbnailData.data[idx];
            target.data[idx + 1] = thumbnailData.data[idx + 1];
            target.data[idx + 2] = thumbnailData.data[idx + 2];
          }

          if (hasAlpha) {
            if (selectedChannels.has("alpha")) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
                  const valIdx = ((py + ky) * pw + (px + kx)) * 4;
                  sum += kVal * padded.data[valIdx + 3];
                }
              }
              const val = kernelSum === 0
                ? Math.min(Math.max(Math.round(Math.abs(sum / divisor)), 0), 255)
                : Math.min(Math.max(Math.round(sum / divisor), 0), 255);
              target.data[idx + 3] = val;
            } else {
              target.data[idx + 3] = thumbnailData.data[idx + 3];
            }
          } else {
            target.data[idx + 3] = 255;
          }
        } else {
          for (let c = 0; c < 3; c++) {
            const chName = c === 0 ? "red" : c === 1 ? "green" : "blue";
            if (selectedChannels.has(chName)) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
                  const valIdx = ((py + ky) * pw + (px + kx)) * 4 + c;
                  sum += kVal * padded.data[valIdx];
                }
              }
              const val = kernelSum === 0
                ? Math.min(Math.max(Math.round(Math.abs(sum / divisor)), 0), 255)
                : Math.min(Math.max(Math.round(sum / divisor), 0), 255);
              target.data[idx + c] = val;
            } else {
              target.data[idx + c] = thumbnailData.data[idx + c];
            }
          }

          if (hasAlpha) {
            if (selectedChannels.has("alpha")) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
                  const valIdx = ((py + ky) * pw + (px + kx)) * 4 + 3;
                  sum += kVal * padded.data[valIdx];
                }
              }
              const val = kernelSum === 0
                ? Math.min(Math.max(Math.round(Math.abs(sum / divisor)), 0), 255)
                : Math.min(Math.max(Math.round(sum / divisor), 0), 255);
              target.data[idx + 3] = val;
            } else {
              target.data[idx + 3] = thumbnailData.data[idx + 3];
            }
          } else {
            target.data[idx + 3] = 255;
          }
        }
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.putImageData(target, 0, 0);
    }
  }, [thumbnailData, kernelStrings, edgeStrategy, selectedChannels, showPreview, channelMode]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setPresetId(id);
    if (id !== "custom") {
      const preset = CONVOLUTION_PRESETS[id as keyof typeof CONVOLUTION_PRESETS];
      if (preset) {
        setKernelStrings(preset.kernel.map((v) => v.toString()));
      }
    }
  };

  const handleCellChange = (index: number, val: string) => {
    setPresetId("custom");
    setKernelStrings((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleToggleChannel = (channel: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  };

  const handleReset = () => {
    setPresetId("identity");
    setKernelStrings(CONVOLUTION_PRESETS.identity.kernel.map((v) => v.toString()));
    if (channelMode) {
      setSelectedChannels(new Set(getChannelNames(channelMode)));
    }
    setEdgeStrategy("clamp");
    setShowPreview(true);
  };

  const handleApply = async () => {
    if (!originalImageData || !channelMode || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const result = await applyConvolution3x3(
        originalImageData,
        kernel,
        edgeStrategy,
        selectedChannels,
        channelMode,
        setProgress
      );
      onApply(result);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Не удалось применить фильтр.");
    } finally {
      setIsProcessing(false);
    }
  };

  const channels = channelMode ? getChannelNames(channelMode) : [];

  return (
    <dialog ref={dialogRef} className={styles.filterDialog} onClose={onClose}>
      <div className={styles.filterDialog__header}>
        <h2>Фильтры свертки</h2>
        <button
          className={styles.filterDialog__close}
          onClick={onClose}
          disabled={isProcessing}
        >
          ×
        </button>
      </div>

      <div className={styles.filterDialog__body}>
        <div className={styles.previewContainer}>
          <canvas ref={previewCanvasRef} className={styles.previewCanvas} />
        </div>

        <div className={styles.row}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
              disabled={isProcessing}
            />
            Предпросмотр
          </label>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="filter-preset">Готовые пресеты:</label>
          <select
            id="filter-preset"
            value={presetId}
            onChange={handlePresetChange}
            className={styles.select}
            disabled={isProcessing}
          >
            <option value="identity">Тождественное отображение</option>
            <option value="sharpen">Повышение резкости</option>
            <option value="gaussian">Фильтр Гаусса (3х3)</option>
            <option value="boxblur">Прямоугольное размытие</option>
            <option value="prewittH">Оператор Прюитта (X)</option>
            <option value="prewittV">Оператор Прюитта (Y)</option>
            <option value="custom">Пользовательский...</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Ядро свертки (3х3):</label>
          <div className={styles.matrixGrid}>
            {kernelStrings.map((val, idx) => (
              <input
                key={idx}
                type="number"
                value={val}
                onChange={(e) => handleCellChange(idx, e.target.value)}
                className={styles.matrixInput}
                disabled={isProcessing}
                step="any"
              />
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Применить к каналам:</label>
          <div className={styles.channelsRow}>
            {channels.map((channel) => (
              <label key={channel} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selectedChannels.has(channel)}
                  onChange={() => handleToggleChannel(channel)}
                  disabled={isProcessing}
                />
                {getChannelLabel(channel)}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="edge-strategy">Обработка краев:</label>
          <select
            id="edge-strategy"
            value={edgeStrategy}
            onChange={(e) =>
              setEdgeStrategy(e.target.value as "black" | "white" | "clamp")
            }
            className={styles.select}
            disabled={isProcessing}
          >
            <option value="clamp">Копирование крайних пикселей</option>
            <option value="black">Заполнение черным цветом</option>
            <option value="white">Заполнение белым цветом</option>
          </select>
        </div>

        {isProcessing && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className={styles.progressText}>Обработка... {progress}%</div>
          </div>
        )}
      </div>

      <div className={styles.filterDialog__footer}>
        <div className={styles.filterDialog__actions}>
          <button
            className={styles.filterDialog__button}
            onClick={handleReset}
            disabled={isProcessing}
          >
            Сброс
          </button>
          <button
            className={styles.filterDialog__button}
            onClick={onClose}
            disabled={isProcessing}
          >
            Отмена
          </button>
          <button
            className={`${styles.filterDialog__button} ${styles.filterDialog__buttonPrimary}`}
            onClick={handleApply}
            disabled={isProcessing || selectedChannels.size === 0}
          >
            Применить
          </button>
        </div>
      </div>
    </dialog>
  );
}
