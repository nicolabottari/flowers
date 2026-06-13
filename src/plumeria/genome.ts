// Every flower is grown from a genome: a liveried palette sampled from one
// of eight cultivar recipes (or, sometimes, a hybrid of two) plus a shared
// morphology and a per-bloom exposure. Recipes are modeled on real
// frangipani: Celadine, Rainbow, Pink Pearl, Sunset, Fuchsia, Gold, Candy
// Stripe, Carmine. All tones live in OKLCH so every sampled value stays in
// the same perceptual neighborhood as its recipe.

import { mixTone, type Tone } from "../shared/color";
import { lerp } from "../shared/math";
import { between, intBetween, type Rng } from "../shared/prng";

type Span = readonly [number, number];
type ToneSpan = { c: Span; h: Span; l: Span };

export type Genome = {
  accent: number;
  blush: { at: number; strength: number; tone: Tone };
  cultivar: string;
  body: { base: Tone; tip: Tone };
  form: {
    bend: number;
    fullness: number;
    length: number;
    taper: number;
  };
  margin: { strength: number; tone: Tone };
  throat: { flame: number; rays: number; reach: number; tone: Tone };
  veins: { strength: number; tone: Tone };
};

type Palette = Omit<Genome, "accent" | "cultivar" | "form">;

type Recipe = {
  blush: { at: Span; strength: Span; tone: ToneSpan };
  name: string;
  body: { base: ToneSpan; tip: ToneSpan };
  margin: { strength: Span; tone: ToneSpan };
  throat: { flame: Span; rays: Span; reach: Span; tone: ToneSpan };
  veins: { strength: Span; tone: ToneSpan };
  weight: number;
};

// Hue spans are written as continuous numbers (348..372 means pink across
// the 0° seam); rendering wraps them, mixTone already takes the short arc.
const CULTIVARS: readonly Recipe[] = [
  // white petals, a wide cadmium heart
  {
    blush: {
      at: [0.7, 0.9],
      strength: [0, 0.3],
      tone: { c: [0.03, 0.07], h: [350, 375], l: [0.9, 0.94] },
    },
    body: {
      base: { c: [0.015, 0.035], h: [85, 110], l: [0.945, 0.965] },
      tip: { c: [0.006, 0.018], h: [85, 110], l: [0.95, 0.968] },
    },
    margin: {
      strength: [0.12, 0.3],
      tone: { c: [0.02, 0.05], h: [82, 100], l: [0.92, 0.95] },
    },
    name: "celadine",
    throat: {
      flame: [0.55, 0.85],
      rays: [0, 0.3],
      reach: [0.48, 0.68],
      tone: { c: [0.165, 0.19], h: [86, 96], l: [0.87, 0.9] },
    },
    veins: {
      strength: [0, 0.22],
      tone: { c: [0.09, 0.13], h: [82, 94], l: [0.86, 0.9] },
    },
    weight: 3,
  },
  // cream body, orange heart, red rays, pink rim
  {
    blush: {
      at: [0.5, 0.78],
      strength: [0.25, 0.55],
      tone: { c: [0.06, 0.1], h: [348, 368], l: [0.86, 0.9] },
    },
    body: {
      base: { c: [0.02, 0.05], h: [60, 90], l: [0.93, 0.96] },
      tip: { c: [0.06, 0.12], h: [348, 372], l: [0.88, 0.94] },
    },
    margin: {
      strength: [0.45, 0.75],
      tone: { c: [0.07, 0.12], h: [348, 368], l: [0.82, 0.88] },
    },
    name: "rainbow",
    throat: {
      flame: [0.65, 1],
      rays: [0.5, 0.9],
      reach: [0.5, 0.68],
      tone: { c: [0.16, 0.19], h: [55, 72], l: [0.78, 0.84] },
    },
    veins: {
      strength: [0.4, 0.7],
      tone: { c: [0.12, 0.16], h: [35, 52], l: [0.72, 0.8] },
    },
    weight: 3,
  },
  // rose all over, small golden heart
  {
    blush: {
      at: [0.4, 0.7],
      strength: [0.2, 0.5],
      tone: { c: [0.09, 0.12], h: [350, 365], l: [0.78, 0.84] },
    },
    body: {
      base: { c: [0.09, 0.14], h: [352, 372], l: [0.84, 0.9] },
      tip: { c: [0.1, 0.15], h: [348, 368], l: [0.8, 0.87] },
    },
    margin: {
      strength: [0.35, 0.65],
      tone: { c: [0.1, 0.15], h: [346, 362], l: [0.74, 0.82] },
    },
    name: "pink pearl",
    throat: {
      flame: [0.5, 0.8],
      rays: [0.15, 0.5],
      reach: [0.36, 0.5],
      tone: { c: [0.155, 0.185], h: [55, 75], l: [0.74, 0.8] },
    },
    veins: {
      strength: [0.25, 0.55],
      tone: { c: [0.11, 0.15], h: [350, 365], l: [0.6, 0.7] },
    },
    weight: 2.2,
  },
  // peach fading to coral, gold heart, pale rim
  {
    blush: {
      at: [0.5, 0.75],
      strength: [0.25, 0.5],
      tone: { c: [0.08, 0.11], h: [18, 35], l: [0.82, 0.87] },
    },
    body: {
      base: { c: [0.1, 0.14], h: [38, 58], l: [0.86, 0.91] },
      tip: { c: [0.1, 0.15], h: [12, 35], l: [0.78, 0.86] },
    },
    margin: {
      strength: [0.25, 0.5],
      tone: { c: [0.04, 0.08], h: [45, 70], l: [0.9, 0.94] },
    },
    name: "sunset",
    throat: {
      flame: [0.6, 0.9],
      rays: [0.25, 0.55],
      reach: [0.4, 0.58],
      tone: { c: [0.155, 0.185], h: [58, 74], l: [0.74, 0.8] },
    },
    veins: {
      strength: [0.18, 0.45],
      tone: { c: [0.11, 0.14], h: [38, 55], l: [0.66, 0.76] },
    },
    weight: 1.8,
  },
  // magenta petals, ember heart, light washed center
  {
    blush: {
      at: [0.55, 0.8],
      strength: [0.3, 0.55],
      tone: { c: [0.03, 0.06], h: [348, 370], l: [0.9, 0.94] },
    },
    body: {
      base: { c: [0.13, 0.18], h: [344, 358], l: [0.7, 0.79] },
      tip: { c: [0.1, 0.14], h: [340, 355], l: [0.76, 0.85] },
    },
    margin: {
      strength: [0.3, 0.6],
      tone: { c: [0.05, 0.09], h: [340, 355], l: [0.85, 0.91] },
    },
    name: "fuchsia",
    throat: {
      flame: [0.5, 0.8],
      rays: [0.35, 0.7],
      reach: [0.34, 0.48],
      tone: { c: [0.15, 0.185], h: [42, 60], l: [0.72, 0.78] },
    },
    veins: {
      strength: [0.3, 0.6],
      tone: { c: [0.13, 0.17], h: [344, 360], l: [0.5, 0.62] },
    },
    weight: 1.5,
  },
  // saturated yellow body rimmed in cream
  {
    blush: {
      at: [0.45, 0.7],
      strength: [0.12, 0.35],
      tone: { c: [0.06, 0.09], h: [55, 72], l: [0.86, 0.9] },
    },
    body: {
      base: { c: [0.12, 0.16], h: [86, 98], l: [0.89, 0.93] },
      tip: { c: [0.03, 0.06], h: [92, 105], l: [0.94, 0.97] },
    },
    margin: {
      strength: [0.4, 0.7],
      tone: { c: [0.01, 0.03], h: [95, 115], l: [0.95, 0.975] },
    },
    name: "gold",
    throat: {
      flame: [0.55, 0.85],
      rays: [0.2, 0.5],
      reach: [0.5, 0.7],
      tone: { c: [0.16, 0.19], h: [68, 82], l: [0.8, 0.85] },
    },
    veins: {
      strength: [0.12, 0.35],
      tone: { c: [0.11, 0.14], h: [72, 85], l: [0.8, 0.86] },
    },
    weight: 1.5,
  },
  // white star, yellow midrib reaching far, fuchsia rim
  {
    blush: {
      at: [0.75, 0.95],
      strength: [0.18, 0.4],
      tone: { c: [0.07, 0.1], h: [348, 365], l: [0.82, 0.87] },
    },
    body: {
      base: { c: [0.015, 0.03], h: [78, 100], l: [0.935, 0.96] },
      tip: { c: [0.02, 0.05], h: [0, 20], l: [0.92, 0.95] },
    },
    margin: {
      strength: [0.55, 0.85],
      tone: { c: [0.12, 0.17], h: [344, 360], l: [0.66, 0.75] },
    },
    name: "candy stripe",
    throat: {
      flame: [0.3, 0.55],
      rays: [0.1, 0.4],
      reach: [0.62, 0.82],
      tone: { c: [0.15, 0.18], h: [84, 94], l: [0.84, 0.88] },
    },
    veins: {
      strength: [0.08, 0.3],
      tone: { c: [0.06, 0.1], h: [350, 365], l: [0.78, 0.84] },
    },
    weight: 1,
  },
  // carmine: saturated seaside red, small fiery heart, pale rosy rim
  {
    blush: {
      at: [0.6, 0.85],
      strength: [0.2, 0.45],
      tone: { c: [0.06, 0.1], h: [350, 370], l: [0.8, 0.88] },
    },
    body: {
      base: { c: [0.18, 0.22], h: [12, 26], l: [0.55, 0.66] },
      tip: { c: [0.15, 0.19], h: [8, 20], l: [0.6, 0.72] },
    },
    margin: {
      strength: [0.25, 0.5],
      tone: { c: [0.08, 0.12], h: [355, 372], l: [0.78, 0.86] },
    },
    name: "carmine",
    throat: {
      flame: [0.45, 0.7],
      rays: [0.4, 0.7],
      reach: [0.22, 0.35],
      tone: { c: [0.17, 0.2], h: [40, 55], l: [0.7, 0.76] },
    },
    veins: {
      strength: [0.3, 0.6],
      tone: { c: [0.16, 0.2], h: [10, 24], l: [0.42, 0.52] },
    },
    weight: 1.2,
  },
];

const TOTAL_WEIGHT = CULTIVARS.reduce((sum, c) => sum + c.weight, 0);

function pickCultivar(rng: Rng): Recipe {
  let target = rng() * TOTAL_WEIGHT;

  for (const cultivar of CULTIVARS) {
    target -= cultivar.weight;
    if (target <= 0) return cultivar;
  }

  // rng() < 1 and the weights sum to TOTAL_WEIGHT, so the loop always
  // returns; this line only satisfies the return type.
  return CULTIVARS[0];
}

function sampleTone(rng: Rng, span: ToneSpan): Tone {
  return {
    c: between(rng, ...span.c),
    h: between(rng, ...span.h),
    l: between(rng, ...span.l),
  };
}

function samplePalette(rng: Rng, recipe: Recipe): Palette {
  return {
    blush: {
      at: between(rng, ...recipe.blush.at),
      strength: between(rng, ...recipe.blush.strength),
      tone: sampleTone(rng, recipe.blush.tone),
    },
    body: {
      base: sampleTone(rng, recipe.body.base),
      tip: sampleTone(rng, recipe.body.tip),
    },
    margin: {
      strength: between(rng, ...recipe.margin.strength),
      tone: sampleTone(rng, recipe.margin.tone),
    },
    throat: {
      flame: between(rng, ...recipe.throat.flame),
      rays: between(rng, ...recipe.throat.rays),
      reach: between(rng, ...recipe.throat.reach),
      tone: sampleTone(rng, recipe.throat.tone),
    },
    veins: {
      strength: between(rng, ...recipe.veins.strength),
      tone: sampleTone(rng, recipe.veins.tone),
    },
  };
}

function mixPalette(a: Palette, b: Palette, t: number): Palette {
  return {
    blush: {
      at: lerp(a.blush.at, b.blush.at, t),
      strength: lerp(a.blush.strength, b.blush.strength, t),
      tone: mixTone(a.blush.tone, b.blush.tone, t),
    },
    body: {
      base: mixTone(a.body.base, b.body.base, t),
      tip: mixTone(a.body.tip, b.body.tip, t),
    },
    margin: {
      strength: lerp(a.margin.strength, b.margin.strength, t),
      tone: mixTone(a.margin.tone, b.margin.tone, t),
    },
    throat: {
      flame: lerp(a.throat.flame, b.throat.flame, t),
      rays: lerp(a.throat.rays, b.throat.rays, t),
      reach: lerp(a.throat.reach, b.throat.reach, t),
      tone: mixTone(a.throat.tone, b.throat.tone, t),
    },
    veins: {
      strength: lerp(a.veins.strength, b.veins.strength, t),
      tone: mixTone(a.veins.tone, b.veins.tone, t),
    },
  };
}

// One recipe never prints twice: exposure (pale and milky through deep and
// saturated, biased gentle) plus a whole-flower hue drift, so harmony
// survives but no pink repeats
function expose(
  palette: Palette,
  sun: number,
  punch: number,
  drift: number
): Palette {
  const tone = (t: Tone, k = 1): Tone => ({
    c: t.c * (1 + (punch - 1) * k),
    h: t.h + drift * k,
    l: Math.min(0.978, Math.max(0.3, t.l + sun * k)),
  });

  return {
    blush: { ...palette.blush, tone: tone(palette.blush.tone) },
    body: { base: tone(palette.body.base), tip: tone(palette.body.tip) },
    margin: { ...palette.margin, tone: tone(palette.margin.tone) },
    // the throat barely follows: even the palest bloom keeps its anchor
    throat: { ...palette.throat, tone: tone(palette.throat.tone, 0.35) },
    veins: { ...palette.veins, tone: tone(palette.veins.tone) },
  };
}

// `moon` is how full tonight's moon is, 0..1. Full-moon blooms come out
// pale and silvery.
export function sampleGenome(rng: Rng, moon = 0): Genome {
  const recipe = pickCultivar(rng);
  const palette = samplePalette(rng, recipe);
  let cultivar = recipe.name;
  let hybrid = palette;

  if (rng() < 0.22) {
    const mate = pickCultivar(rng);
    const matePalette = samplePalette(rng, mate);
    const t = between(rng, 0.3, 0.7);
    hybrid = mixPalette(palette, matePalette, t);

    if (mate.name !== recipe.name) {
      // dominant parent first
      cultivar =
        t < 0.5
          ? `${recipe.name} × ${mate.name}`
          : `${mate.name} × ${recipe.name}`;
    }
  }

  const exposed = expose(
    hybrid,
    between(rng, -0.045, 0.045) + 0.035 * moon,
    between(rng, 0.72, 1.12) * (1 - 0.14 * moon),
    between(rng, -6, 6)
  );

  // Concave draw: slender corollas as common as plump ones, nature grows
  // both, photo albums prove it
  const fullness = 1 - rng() ** 0.8 * 0.9;

  return {
    ...exposed,
    accent: rng() < 0.35 ? intBetween(rng, 0, 4) : -1,
    cultivar,
    form: {
      bend:
        lerp(0.26, 0.09, fullness) *
        between(rng, 0.8, 1.2) *
        (rng() < 0.5 ? -1 : 1),
      fullness,
      // Plump corollas wear shorter petals, and no flower fills the frame
      // to its edge
      length: between(rng, 172, 212) - 14 * fullness,
      // The plumper the corolla, the more its tips must assert: with none,
      // full overlap melts the silhouette into a circle
      taper: Math.max(
        rng() < 0.22 ? between(rng, 0.4, 0.8) : between(rng, 0, 0.35),
        0.24 * fullness
      ),
    },
  };
}
