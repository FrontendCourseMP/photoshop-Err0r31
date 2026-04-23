import styles from "./StatusBar.module.scss";

type StatusBarProps = {
  fileName: string | null;
  width: number;
  height: number;
  colorDepth: number;
};

export default function StatusBar({
  fileName,
  width,
  height,
  colorDepth,
}: StatusBarProps) {
  return (
    <div className={styles.statusBar}>
      <div className={styles.statusBar__item}>
        Файл: {fileName ?? "нет"}
      </div>

      <div className={styles.statusBar__item}>
        Размер: {width} × {height}
      </div>

      <div className={styles.statusBar__item}>
        Глубина: {colorDepth}
      </div>
    </div>
  );
}