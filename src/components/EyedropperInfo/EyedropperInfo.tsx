import { useMemo } from "react";
import type { PixelInfo } from "../../types/image";
import { rgbToCieLab } from "../../utils/image/colorConvert";
import styles from "./EyedropperInfo.module.scss";

type EyedropperInfoProps = {
  pixel: PixelInfo;
};

export default function EyedropperInfo({ pixel }: EyedropperInfoProps) {
  const { x, y, r, g, b } = pixel;
  const lab = useMemo(() => rgbToCieLab(r, g, b), [r, g, b]);

  return (
    <div className={styles.eyedropperInfo}>
      <div className={styles.eyedropperInfo__header}>Пипетка</div>
      <div className={styles.eyedropperInfo__body}>
        <div className={styles.eyedropperInfo__row}>
          <span className={styles.eyedropperInfo__label}>x:</span>
          <span className={styles.eyedropperInfo__value}>{x}</span>
          <span className={styles.eyedropperInfo__label}>y:</span>
          <span className={styles.eyedropperInfo__value}>{y}</span>
        </div>
        <div className={styles.eyedropperInfo__row}>
          <span className={styles.eyedropperInfo__label}>rgb:</span>
          <span className={styles.eyedropperInfo__value}>
            {r}, {g}, {b}
          </span>
        </div>
        <div className={styles.eyedropperInfo__row}>
          <span className={styles.eyedropperInfo__label}>lab:</span>
          <span className={styles.eyedropperInfo__value}>
            {lab.L.toFixed(2)}, {lab.a.toFixed(2)}, {lab.b.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
