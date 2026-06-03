import { useState, useEffect } from "react";
import styles from "./StatusBar.module.scss";

type StatusBarProps = {
  fileName: string | null;
  width: number;
  height: number;
  colorDepth: number;
  displayScale: number;
  onScaleChange: (scale: number, immediate?: boolean) => void;
  visualAlgorithmId: string;
  onAlgorithmChange: (algoId: string) => void;
  onAutoFit: () => void;
};

export default function StatusBar({
  fileName,
  width,
  height,
  colorDepth,
  displayScale,
  onScaleChange,
  visualAlgorithmId,
  onAlgorithmChange,
  onAutoFit,
}: StatusBarProps) {
  const [inputValue, setInputValue] = useState(
    Math.round(displayScale * 100).toString(),
  );

  useEffect(() => {
    setInputValue(Math.round(displayScale * 100).toString());
  }, [displayScale]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const commitScaleValue = () => {
    let parsed = parseInt(inputValue, 10);
    if (isNaN(parsed)) {
      setInputValue(Math.round(displayScale * 100).toString());
      return;
    }
    parsed = Math.min(Math.max(parsed, 12), 300);
    onScaleChange(parsed / 100, true);
    setInputValue(parsed.toString());
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitScaleValue();
      e.currentTarget.blur();
    }
  };

  return (
    <div className={styles.statusBar}>
      <div className={styles.statusBar__item}>
        Файл: {fileName ?? "нет"}
      </div>

      <div className={styles.statusBar__item}>
        Размер: {width} × {height}
      </div>

      <div className={styles.statusBar__item}>
        Глубина: {colorDepth} бит
      </div>

      {fileName && (
        <>
          <div className={styles.statusBar__item}>Масштаб:</div>

          <div className={styles.statusBar__item}>
            <input
              type="range"
              min="12"
              max="300"
              value={Math.round(displayScale * 100)}
              onChange={(e) =>
                onScaleChange(parseInt(e.target.value, 10) / 100, false)
              }
              className={styles.statusBar__slider}
            />
          </div>

          <div className={styles.statusBar__item}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onBlur={commitScaleValue}
              className={styles.statusBar__input}
            />
            <span style={{ marginLeft: "2px" }}>%</span>
          </div>

          <div className={styles.statusBar__item}>
            <button
              onClick={onAutoFit}
              className={styles.statusBar__button}
            >
              По размеру
            </button>
          </div>

          <div className={styles.statusBar__item}>
            Интерполяция:
            <select
              value={visualAlgorithmId}
              onChange={(e) => onAlgorithmChange(e.target.value)}
              className={styles.statusBar__select}
            >
              <option value="bilinear">Билинейная</option>
              <option value="nearest">Ближайший сосед</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}