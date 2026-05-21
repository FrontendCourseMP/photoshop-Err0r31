import { useState, useRef, useEffect } from "react";
import styles from "./LevelsSlider.module.scss";

type LevelsSliderProps = {
  black: number;
  white: number;
  gamma: number;
  onChange: (black: number, white: number, gamma: number) => void;
};

export default function LevelsSlider({
  black,
  white,
  gamma,
  onChange,
}: LevelsSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"black" | "white" | "gamma" | null>(
    null,
  );

  const getGammaVisualT = (g: number) => {
    return Math.max(0, Math.min(1, 0.5 - Math.log10(g) / 2));
  };

  const getGammaFromVisualT = (t: number) => {
    const clampedT = Math.max(0.01, Math.min(0.99, t));
    const g = Math.pow(10, 2 * (0.5 - clampedT));
    return Math.max(0.1, Math.min(9.99, Number(g.toFixed(2))));
  };

  const t = getGammaVisualT(gamma);
  const blackPerc = (black / 255) * 100;
  const whitePerc = (white / 255) * 100;
  const gammaPerc = blackPerc + t * (whitePerc - blackPerc);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      let pos = (e.clientX - rect.left) / rect.width;
      pos = Math.max(0, Math.min(1, pos));

      if (dragging === "black") {
        let newBlack = Math.round(pos * 255);
        if (newBlack >= white) newBlack = Math.max(0, white - 1);
        onChange(newBlack, white, gamma);
      } else if (dragging === "white") {
        let newWhite = Math.round(pos * 255);
        if (newWhite <= black) newWhite = Math.min(255, black + 1);
        onChange(black, newWhite, gamma);
      } else if (dragging === "gamma") {
        const visualPosInActiveRange =
          (pos * 255 - black) / Math.max(1, white - black);
        const newGamma = getGammaFromVisualT(visualPosInActiveRange);
        onChange(black, white, newGamma);
      }
    };

    const handleMouseUp = () => {
      if (dragging) setDragging(null);
    };

    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, black, white, gamma, onChange]);

  return (
    <div className={styles.levelsSlider}>
      <div className={styles.levelsSlider__trackContainer} ref={trackRef}>
        <div className={styles.levelsSlider__track} />
        <div
          className={styles.levelsSlider__activeRange}
          style={{
            left: `${blackPerc}%`,
            width: `${whitePerc - blackPerc}%`,
          }}
        />

        <div
          className={`${styles.levelsSlider__handle} ${styles.levelsSlider__handleBlack}`}
          style={{ left: `${blackPerc}%` }}
          onMouseDown={() => setDragging("black")}
        />

        <div
          className={`${styles.levelsSlider__handle} ${styles.levelsSlider__handleGamma}`}
          style={{ left: `${gammaPerc}%` }}
          onMouseDown={() => setDragging("gamma")}
        />

        <div
          className={`${styles.levelsSlider__handle} ${styles.levelsSlider__handleWhite}`}
          style={{ left: `${whitePerc}%` }}
          onMouseDown={() => setDragging("white")}
        />
      </div>

      <div className={styles.levelsSlider__inputs}>
        <label className={styles.levelsSlider__inputGroup}>
          <span className={styles.levelsSlider__inputLabel}>Черный</span>
          <input
            type="number"
            min={0}
            max={white - 1}
            value={black}
            onChange={(e) => {
              const v = Math.min(white - 1, Math.max(0, parseInt(e.target.value) || 0));
              onChange(v, white, gamma);
            }}
            className={styles.levelsSlider__input}
          />
        </label>
        <label className={styles.levelsSlider__inputGroup}>
          <span className={styles.levelsSlider__inputLabel}>Гамма</span>
          <input
            type="number"
            min={0.1}
            max={9.99}
            step={0.01}
            value={gamma}
            onChange={(e) => {
              const v = Math.min(9.99, Math.max(0.1, parseFloat(e.target.value) || 1.0));
              onChange(black, white, v);
            }}
            className={styles.levelsSlider__input}
          />
        </label>
        <label className={styles.levelsSlider__inputGroup}>
          <span className={styles.levelsSlider__inputLabel}>Белый</span>
          <input
            type="number"
            min={black + 1}
            max={255}
            value={white}
            onChange={(e) => {
              const v = Math.min(255, Math.max(black + 1, parseInt(e.target.value) || 255));
              onChange(black, v, gamma);
            }}
            className={styles.levelsSlider__input}
          />
        </label>
      </div>
    </div>
  );
}
