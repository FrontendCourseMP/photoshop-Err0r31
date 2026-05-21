import { useEffect, useRef } from "react";
import styles from "./HistogramCanvas.module.scss";

type HistogramCanvasProps = {
  data: Uint32Array | null;
  color: string;
  logScale: boolean;
};

export default function HistogramCanvas({
  data,
  color,
  logScale,
}: HistogramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    if (!data) return;

    let maxVal = 0;
    let totalPixels = 0;
    for (let i = 0; i < 256; i++) {
      if (data[i] > maxVal) {
        maxVal = data[i];
      }
      totalPixels += data[i];
    }

    if (maxVal === 0) return;

    ctx.fillStyle = color;

    const barWidth = width / 256;

    for (let i = 0; i < 256; i++) {
      const val = data[i];
      if (val === 0) continue;

      let normalizedHeight = 0;
      if (logScale) {
        const s = Math.log(1 + val);
        const maxS = Math.log(1 + maxVal);
        normalizedHeight = s / maxS;
      } else {
        const p_r = val / totalPixels;
        const max_p_r = maxVal / totalPixels;
        normalizedHeight = p_r / max_p_r;
      }

      const barHeight = normalizedHeight * height;
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [data, color, logScale]);

  return <canvas ref={canvasRef} className={styles.histogramCanvas} />;
}
