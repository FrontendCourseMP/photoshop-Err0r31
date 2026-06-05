import { useState, useEffect, useRef } from "react";
import { Link, Link2Off } from "lucide-react";
import { INTERPOLATION_ALGORITHMS } from "../../utils/image/interpolation";
import styles from "./ResizeDialog.module.scss";

type ResizeDialogProps = {
  isOpen: boolean;
  originalImageData: ImageData | null;
  onClose: () => void;
  onApply: (newData: ImageData) => void;
};

export default function ResizeDialog({
  isOpen,
  originalImageData,
  onClose,
  onApply,
}: ResizeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const origWidth = originalImageData?.width ?? 0;
  const origHeight = originalImageData?.height ?? 0;
  const aspect = origWidth && origHeight ? origWidth / origHeight : 1;

  const [unit, setUnit] = useState<"px" | "percent">("px");
  const [widthInput, setWidthInput] = useState<string>("");
  const [heightInput, setHeightInput] = useState<string>("");
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [algorithmId, setAlgorithmId] = useState<string>("bilinear");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && originalImageData) {
      if (unit === "px") {
        setWidthInput(origWidth.toString());
        setHeightInput(origHeight.toString());
      } else {
        setWidthInput("100");
        setHeightInput("100");
      }
    }
  }, [isOpen, originalImageData, unit, origWidth, origHeight]);

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

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextUnit = e.target.value as "px" | "percent";
    if (nextUnit === unit) return;

    const wNum = parseFloat(widthInput);
    const hNum = parseFloat(heightInput);

    if (nextUnit === "percent") {
      if (isNaN(wNum) || isNaN(hNum) || origWidth === 0 || origHeight === 0) {
        setWidthInput("100");
        setHeightInput("100");
      } else {
        const wPercent = (wNum / origWidth) * 100;
        const hPercent = (hNum / origHeight) * 100;
        setWidthInput(wPercent.toFixed(1));
        setHeightInput(hPercent.toFixed(1));
      }
    } else {
      if (isNaN(wNum) || isNaN(hNum)) {
        setWidthInput(origWidth.toString());
        setHeightInput(origHeight.toString());
      } else {
        const wPixels = Math.round((wNum / 100) * origWidth);
        const hPixels = Math.round((hNum / 100) * origHeight);
        setWidthInput(wPixels.toString());
        setHeightInput(hPixels.toString());
      }
    }

    setUnit(nextUnit);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWidthInput(val);

    if (lockRatio) {
      if (val === "") {
        setHeightInput("");
        return;
      }
      const parsedVal = parseFloat(val);
      if (!isNaN(parsedVal)) {
        if (unit === "percent") {
          setHeightInput(val);
        } else {
          const calculatedH = parsedVal === 0 ? 0 : Math.max(Math.round(parsedVal / aspect), 1);
          setHeightInput(calculatedH.toString());
        }
      }
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHeightInput(val);

    if (lockRatio) {
      if (val === "") {
        setWidthInput("");
        return;
      }
      const parsedVal = parseFloat(val);
      if (!isNaN(parsedVal)) {
        if (unit === "percent") {
          setWidthInput(val);
        } else {
          const calculatedW = parsedVal === 0 ? 0 : Math.max(Math.round(parsedVal * aspect), 1);
          setWidthInput(calculatedW.toString());
        }
      }
    }
  };

  let validationError = "";
  const w = parseFloat(widthInput);
  const h = parseFloat(heightInput);

  if (!widthInput || !heightInput) {
    validationError = "Пожалуйста, введите ширину и высоту.";
  } else if (isNaN(w) || isNaN(h)) {
    validationError = "Значения должны быть числами.";
  } else if (w <= 0 || h <= 0) {
    validationError = "Значения должны быть строго больше 0.";
  } else if (unit === "px") {
    if (!Number.isInteger(w) || !Number.isInteger(h)) {
      validationError = "Значения в пикселях должны быть целыми числами.";
    } else if (w < 1 || h < 1) {
      validationError = "Размеры должны быть не менее 1px.";
    } else if (w > 10000 || h > 10000) {
      validationError = "Размеры ограничены 10,000 пикселями для предотвращения сбоя.";
    }
  } else if (unit === "percent") {
    if (w < 1 || h < 1) {
      validationError = "Масштаб должен быть не менее 1%.";
    } else if (w > 1000 || h > 1000) {
      validationError = "Масштаб не должен превышать 1000%.";
    }
  }

  let targetWidth = 0;
  let targetHeight = 0;
  if (!validationError) {
    if (unit === "px") {
      targetWidth = Math.round(w);
      targetHeight = Math.round(h);
    } else {
      targetWidth = Math.max(Math.round((w / 100) * origWidth), 1);
      targetHeight = Math.max(Math.round((h / 100) * origHeight), 1);
    }
  }

  const origMP = ((origWidth * origHeight) / 1000000).toFixed(2);
  const newMP = !validationError
    ? ((targetWidth * targetHeight) / 1000000).toFixed(2)
    : "0.00";

  const selectedAlgo =
    INTERPOLATION_ALGORITHMS[algorithmId] || INTERPOLATION_ALGORITHMS.bilinear;

  const handleApply = async () => {
    if (validationError || !originalImageData) return;

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 30));

    try {
      const resizedData = await selectedAlgo.scale(
        originalImageData,
        targetWidth,
        targetHeight,
      );
      onApply(resizedData);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Не удалось изменить размер изображения.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.resizeDialog}
      onClose={onClose}
    >
      <div className={styles.resizeDialog__header}>
        <h2>Размер изображения</h2>
        <button
          className={styles.resizeDialog__close}
          onClick={onClose}
          disabled={isProcessing}
        >
          ×
        </button>
      </div>

      <div className={styles.resizeDialog__body}>
        <div className={styles.infoBox}>
          <div className={styles.infoBox__item}>
            <span>Исходный размер:</span>
            <strong>
              {origWidth} × {origHeight} px ({origMP} MP)
            </strong>
          </div>
          <div className={styles.infoBox__item}>
            <span>Новый размер:</span>
            <strong>
              {!validationError
                ? `${targetWidth} × ${targetHeight} px (${newMP} MP)`
                : "-"}
            </strong>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="unit-select">Единицы измерения:</label>
          <select
            id="unit-select"
            value={unit}
            onChange={handleUnitChange}
            className={styles.select}
            disabled={isProcessing}
          >
            <option value="px">Пиксели (px)</option>
            <option value="percent">Проценты (%)</option>
          </select>
        </div>

        <div className={styles.dimensionsRow}>
          <div className={styles.inputsColumn}>
            <div className={styles.formGroupInline}>
              <label htmlFor="width-input">Ширина:</label>
              <input
                id="width-input"
                type="number"
                value={widthInput}
                onChange={handleWidthChange}
                className={styles.input}
                disabled={isProcessing}
                step={unit === "px" ? "1" : "0.1"}
              />
              <span className={styles.unitSuffix}>
                {unit === "px" ? "px" : "%"}
              </span>
            </div>

            <div className={styles.formGroupInline}>
              <label htmlFor="height-input">Высота:</label>
              <input
                id="height-input"
                type="number"
                value={heightInput}
                onChange={handleHeightChange}
                className={styles.input}
                disabled={isProcessing}
                step={unit === "px" ? "1" : "0.1"}
              />
              <span className={styles.unitSuffix}>
                {unit === "px" ? "px" : "%"}
              </span>
            </div>
          </div>

          <div className={styles.lockColumn}>
            <button
              type="button"
              onClick={() => setLockRatio(!lockRatio)}
              className={`${styles.lockButton} ${lockRatio ? styles.lockButtonActive : ""}`}
              disabled={isProcessing}
              title={
                lockRatio ? "Сохранять пропорции" : "Не сохранять пропорции"
              }
              aria-label="Связь сторон"
            >
              {lockRatio ? <Link size={16} /> : <Link2Off size={16} />}
            </button>
            <span className={styles.lockText}>Связать пропорции</span>
          </div>
        </div>

        {validationError && (
          <div className={styles.errorText} role="alert">
            {validationError}
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="algo-select">Репликация/Интерполяция:</label>
          <select
            id="algo-select"
            value={algorithmId}
            onChange={(e) => setAlgorithmId(e.target.value)}
            className={styles.select}
            disabled={isProcessing}
          >
            <option value="bilinear">Билинейная интерполяция</option>
            <option value="nearest">Ближайший сосед</option>
          </select>
        </div>

        <div className={styles.tooltipCard}>
          <div className={styles.tooltipCard__title}>
            {selectedAlgo.name}
          </div>
          <p className={styles.tooltipCard__desc}>
            {selectedAlgo.description}
          </p>
          <div className={styles.tooltipCard__advantages}>
            <strong>Преимущество: </strong>
            {selectedAlgo.advantages}
          </div>
        </div>
      </div>

      <div className={styles.resizeDialog__footer}>
        <div className={styles.resizeDialog__actions}>
          <button
            className={styles.resizeDialog__button}
            onClick={onClose}
            disabled={isProcessing}
          >
            Отмена
          </button>
          <button
            className={`${styles.resizeDialog__button} ${styles.resizeDialog__buttonPrimary}`}
            onClick={handleApply}
            disabled={!!validationError || isProcessing}
          >
            {isProcessing ? "Обработка..." : "Применить"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
