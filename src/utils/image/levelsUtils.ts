export type HistogramChannel = "master" | "red" | "green" | "blue" | "alpha";

export type LevelsConfig = {
  black: number;
  white: number;
  gamma: number;
};

export const DEFAULT_LEVELS: LevelsConfig = {
  black: 0,
  white: 255,
  gamma: 1.0,
};

export const INITIAL_CONFIGS: Record<HistogramChannel, LevelsConfig> = {
  master: { ...DEFAULT_LEVELS },
  red: { ...DEFAULT_LEVELS },
  green: { ...DEFAULT_LEVELS },
  blue: { ...DEFAULT_LEVELS },
  alpha: { ...DEFAULT_LEVELS },
};

export function generateLUT(config: LevelsConfig): Uint8Array {
  const { black, white, gamma } = config;
  const lut = new Uint8Array(256);

  const range = white - black;
  const safeRange = range === 0 ? 1 : range;

  for (let i = 0; i <= 255; i++) {
    if (i <= black) {
      lut[i] = 0;
    } else if (i >= white) {
      lut[i] = 255;
    } else {
      const normalized = (i - black) / safeRange;
      const val = Math.pow(normalized, 1 / gamma);
      lut[i] = Math.max(0, Math.min(255, Math.round(val * 255)));
    }
  }
  return lut;
}


export function generateCombinedLUTs(configs: Record<HistogramChannel, LevelsConfig>) {
  const masterLUT = generateLUT(configs.master);
  const rLUT = generateLUT(configs.red);
  const gLUT = generateLUT(configs.green);
  const bLUT = generateLUT(configs.blue);
  const aLUT = generateLUT(configs.alpha);

  const finalRLUT = new Uint8Array(256);
  const finalGLUT = new Uint8Array(256);
  const finalBLUT = new Uint8Array(256);

  for (let i = 0; i <= 255; i++) {
    finalRLUT[i] = masterLUT[rLUT[i]];
    finalGLUT[i] = masterLUT[gLUT[i]];
    finalBLUT[i] = masterLUT[bLUT[i]];
  }

  return { r: finalRLUT, g: finalGLUT, b: finalBLUT, a: aLUT };
}

/**
 * Creates a new ImageData with the levels applied.
 * Original data is not mutated.
 */
export function applyLevelsLUT(
  source: ImageData,
  configs: Record<HistogramChannel, LevelsConfig>,
): ImageData {
  const { width, height, data } = source;
  const result = new ImageData(width, height);
  const out = result.data;

  const luts = generateCombinedLUTs(configs);

  for (let i = 0; i < data.length; i += 4) {
    out[i] = luts.r[data[i]];
    out[i + 1] = luts.g[data[i + 1]];
    out[i + 2] = luts.b[data[i + 2]];
    out[i + 3] = luts.a[data[i + 3]];
  }

  return result;
}

/**
 * Computes a 256-bin histogram for the specified channel.
 * Master uses Luma (0.299R + 0.587G + 0.114B).
 */
export function computeHistogram(
  imageData: ImageData,
  channel: HistogramChannel,
): Uint32Array {
  const data = imageData.data;
  const hist = new Uint32Array(256);

  if (channel === "master") {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      if (luma < 0) luma = 0;
      if (luma > 255) luma = 255;
      hist[luma]++;
    }
  } else {
    let offset = 0;
    if (channel === "green") offset = 1;
    else if (channel === "blue") offset = 2;
    else if (channel === "alpha") offset = 3;

    for (let i = offset; i < data.length; i += 4) {
      hist[data[i]]++;
    }
  }

  return hist;
}
