export type CieLabColor = {
  L: number;
  a: number;
  b: number;
};

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

const Xn = 0.95047;
const Yn = 1.0;
const Zn = 1.08883;

const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;

function labF(t: number): number {
  return t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
}

export function rgbToCieLab(r: number, g: number, b: number): CieLabColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  const fx = labF(x / Xn);
  const fy = labF(y / Yn);
  const fz = labF(z / Zn);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}
