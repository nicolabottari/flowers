// OKLCH to sRGB hex, so flowers can pick colors in a perceptually uniform
// space (equal lightness steps look equal) and still render anywhere a hex
// color does, OG images included. Out-of-gamut colors are mapped back by
// walking chroma down until the color fits.

export type Tone = { l: number; c: number; h: number };

type LinearRgb = [number, number, number];

const oklabToLinearSrgb = (l: number, a: number, b: number): LinearRgb => {
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
};

const inGamut = ([r, g, b]: LinearRgb): boolean => {
  const eps = 1e-6;
  return (
    r >= -eps &&
    r <= 1 + eps &&
    g >= -eps &&
    g <= 1 + eps &&
    b >= -eps &&
    b <= 1 + eps
  );
};

const gammaEncode = (channel: number): number => {
  const c = Math.min(1, Math.max(0, channel));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

const toHexChannel = (channel: number): string =>
  Math.round(gammaEncode(channel) * 255)
    .toString(16)
    .padStart(2, "0");

export const oklch = (
  lightness: number,
  chroma: number,
  hue: number
): string => {
  const hr = (((hue % 360) + 360) % 360) * (Math.PI / 180);
  let c = Math.max(0, chroma);
  let rgb = oklabToLinearSrgb(lightness, c * Math.cos(hr), c * Math.sin(hr));

  while (c > 0 && !inGamut(rgb)) {
    c = Math.max(0, c - 0.004);
    rgb = oklabToLinearSrgb(lightness, c * Math.cos(hr), c * Math.sin(hr));
  }

  return `#${rgb.map(toHexChannel).join("")}`;
};

export const toHex = ({ l, c, h }: Tone): string => oklch(l, c, h);

// Hue takes the shortest arc, so a white to pink blend never detours
// through green the way a naive numeric lerp would
export const mixTone = (a: Tone, b: Tone, t: number): Tone => {
  const arc = (((b.h - a.h) % 360) + 540) % 360;
  return {
    c: a.c + (b.c - a.c) * t,
    h: a.h + (arc - 180) * t,
    l: a.l + (b.l - a.l) * t,
  };
};
