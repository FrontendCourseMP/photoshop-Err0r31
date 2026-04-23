import { useEffect, useRef } from "react";
import styles from "./CanvasArea.module.scss";

type CanvasAreaProps = {
  bitmap: ImageBitmap | null;
  width: number;
  height: number;
};

export default function CanvasArea({ bitmap, width, height }: CanvasAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) {
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0);
  }, [bitmap, width, height]);

  return (
    <div className={styles.canvasArea}>
      <div className={styles.canvasArea__viewport}>
        {bitmap ? (
          <div className={styles.canvasArea__content}>
            <canvas
              ref={canvasRef}
              className={styles.canvasArea__canvas}
              width={width}
              height={height}
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