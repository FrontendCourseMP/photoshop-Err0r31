import { useState, useEffect, useRef, useMemo } from "react";
import type { ChannelMode } from "../../types/image";
import type { HistogramChannel } from "../../utils/image/levelsUtils";
import {
  computeHistogram,
  applyLevelsLUT,
  INITIAL_CONFIGS,
} from "../../utils/image/levelsUtils";
import HistogramCanvas from "./HistogramCanvas";
import LevelsSlider from "./LevelsSlider";
import styles from "./LevelsDialog.module.scss";

type LevelsDialogProps = {
  isOpen: boolean;
  channelMode: ChannelMode | null;
  originalImageData: ImageData | null;
  onClose: () => void;
  onApply: (newData: ImageData) => void;
};

const CHANNEL_OPTIONS: { value: HistogramChannel; label: string }[] = [
  { value: "master", label: "RGB" },
  { value: "red", label: "Красный (Red)" },
  { value: "green", label: "Зеленый (Green)" },
  { value: "blue", label: "Синий (Blue)" },
  { value: "alpha", label: "Альфа (Alpha)" },
];

export default function LevelsDialog({
  isOpen,
  channelMode,
  originalImageData,
  onClose,
  onApply,
}: LevelsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [activeChannel, setActiveChannel] = useState<HistogramChannel>("master");
  const [configs, setConfigs] = useState(INITIAL_CONFIGS);
  const [logScale, setLogScale] = useState(false);
  const [preview, setPreview] = useState(true);
  const [thumbnailData, setThumbnailData] = useState<ImageData | null>(null);

  useEffect(() => {
    if (channelMode && channelMode.startsWith("gray")) {
      if (activeChannel !== "master" && activeChannel !== "alpha") {
        setActiveChannel("master");
      }
    }
  }, [channelMode, activeChannel]);

  const histograms = useMemo(() => {
    if (!originalImageData) return null;
    return {
      master: computeHistogram(originalImageData, "master"),
      red: computeHistogram(originalImageData, "red"),
      green: computeHistogram(originalImageData, "green"),
      blue: computeHistogram(originalImageData, "blue"),
      alpha: computeHistogram(originalImageData, "alpha"),
    };
  }, [originalImageData]);

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
    if (!originalImageData) {
      setThumbnailData(null);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const bitmap = await createImageBitmap(originalImageData);
        if (!isMounted) {
          bitmap.close();
          return;
        }

        const maxW = 400;
        const maxH = 400;
        const scale = Math.min(1, maxW / originalImageData.width, maxH / originalImageData.height);
        const tW = Math.max(1, Math.floor(originalImageData.width * scale));
        const tH = Math.max(1, Math.floor(originalImageData.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = tW;
        canvas.height = tH;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, tW, tH);
          setThumbnailData(ctx.getImageData(0, 0, tW, tH));
        }
        bitmap.close();
      } catch (e) {
        console.error("Failed to create thumbnail", e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [originalImageData]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!isOpen || !thumbnailData || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!preview) {
      ctx.putImageData(thumbnailData, 0, 0);
      return;
    }

    let rAF = requestAnimationFrame(() => {
      const newData = applyLevelsLUT(thumbnailData, configs);
      ctx.putImageData(newData, 0, 0);
    });

    return () => cancelAnimationFrame(rAF);
  }, [configs, preview, isOpen, thumbnailData]);

  if (!isOpen) return null;

  const handleSliderChange = (black: number, white: number, gamma: number) => {
    setConfigs((prev) => ({
      ...prev,
      [activeChannel]: { black, white, gamma },
    }));
  };

  const handleReset = () => {
    setConfigs(INITIAL_CONFIGS);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleApply = () => {
    if (!originalImageData) return;
    const newData = applyLevelsLUT(originalImageData, configs);
    onApply(newData);
    onClose();
  };

  const currentConfig = configs[activeChannel];
  const currentHistogram = histograms ? histograms[activeChannel] : null;

  let histogramColor = "#fff";
  if (activeChannel === "red") histogramColor = "#f85149";
  if (activeChannel === "green") histogramColor = "#3fb950";
  if (activeChannel === "blue") histogramColor = "#4aa3ff";
  if (activeChannel === "alpha") histogramColor = "#a9a9a9";

  return (
    <dialog ref={dialogRef} className={styles.levelsDialog} onCancel={(e) => { e.preventDefault(); handleCancel(); }}>
      <div className={styles.levelsDialog__header}>
        <h2>Уровни (Levels)</h2>
        <button className={styles.levelsDialog__close} onClick={handleCancel}>
          &times;
        </button>
      </div>

      <div className={styles.levelsDialog__body}>
        {thumbnailData && (
          <div className={styles.levelsDialog__previewContainer}>
            <canvas
              ref={previewCanvasRef}
              width={thumbnailData.width}
              height={thumbnailData.height}
              className={styles.levelsDialog__previewCanvas}
            />
          </div>
        )}

        <div className={styles.levelsDialog__row}>
          <label>Канал:</label>
          <select
            value={activeChannel}
            onChange={(e) => setActiveChannel(e.target.value as HistogramChannel)}
            className={styles.levelsDialog__select}
          >
            {CHANNEL_OPTIONS.filter(opt => {
              if (channelMode && channelMode.startsWith("gray")) {
                return opt.value === "master" || (channelMode === "gray+alpha" && opt.value === "alpha");
              }
              if (channelMode === "rgb") {
                return opt.value !== "alpha";
              }
              return true;
            }).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.levelsDialog__histogramContainer}>
          <HistogramCanvas
            data={currentHistogram}
            color={histogramColor}
            logScale={logScale}
          />
        </div>

        <div className={styles.levelsDialog__rowRight}>
          <label className={styles.levelsDialog__checkbox}>
            <input
              type="checkbox"
              checked={logScale}
              onChange={(e) => setLogScale(e.target.checked)}
            />
            Логарифмический масштаб
          </label>
        </div>

        <div className={styles.levelsDialog__sliderContainer}>
          <div className={styles.levelsDialog__label}>Входные значения:</div>
          <LevelsSlider
            black={currentConfig.black}
            white={currentConfig.white}
            gamma={currentConfig.gamma}
            onChange={handleSliderChange}
          />
        </div>
      </div>

      <div className={styles.levelsDialog__footer}>
        <label className={styles.levelsDialog__checkbox}>
          <input
            type="checkbox"
            checked={preview}
            onChange={(e) => setPreview(e.target.checked)}
          />
          Предпросмотр
        </label>
        
        <div className={styles.levelsDialog__actions}>
          <button className={styles.levelsDialog__button} onClick={handleReset}>
            Сброс
          </button>
          <button className={styles.levelsDialog__button} onClick={handleCancel}>
            Отмена
          </button>
          <button className={`${styles.levelsDialog__button} ${styles.levelsDialog__buttonPrimary}`} onClick={handleApply}>
            Применить
          </button>
        </div>
      </div>
    </dialog>
  );
}
