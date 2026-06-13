// A petal lives in its own frame: base at the origin (the flower's
// center), tip pointing up at -y, midrib bending along x = bend·L·t².
// Each flank is a Beta kernel t^a·(1-t)^b offset along the midrib normal.
// `over` is the broad shoulder that will cover the next petal, `under` the
// slimmer flank that tucks beneath the previous one. That built-in
// asymmetry is what makes five rotated copies read as a pinwheel instead
// of a star.

import { lerp } from "../shared/math";
import { between, type Rng } from "../shared/prng";
import type { Genome } from "./genome";

type Flank = { a: number; b: number; phase: number; width: number };

export type PetalForm = {
  bend: number;
  // radians the raw geometry leans off vertical; every emitted point is
  // counter-rotated by it, so the petal stands straight in its own frame
  lean: number;
  length: number;
  over: Flank;
  under: Flank;
  wave: number;
};

export function petalForm(form: Genome["form"], rng: Rng): PetalForm {
  const length = form.length * between(rng, 0.95, 1.05);
  const flank = (a: number, b: number, width: number): Flank => ({
    a: a * between(rng, 0.92, 1.08),
    b: b * between(rng, 0.92, 1.08),
    phase: between(rng, 0, Math.PI * 2),
    width: length * width * between(rng, 0.96, 1.04),
  });

  const raw: PetalForm = {
    bend: form.bend * between(rng, 0.85, 1.15),
    lean: 0,
    length,
    over: flank(
      0.9,
      lerp(0.7, 1.08, form.taper),
      lerp(0.3, 0.48, form.fullness)
    ),
    under: flank(
      1.15,
      lerp(0.76, 1.14, form.taper),
      lerp(0.21, 0.39, form.fullness)
    ),
    wave: between(rng, 0.9, 1.7),
  };

  // Born straight: measure where the raw geometry leans, then bake the
  // counter-rotation into the form itself, no correction downstream
  raw.lean = (tipLean(raw) * Math.PI) / 180;
  return raw;
}

// Normalized so the kernel peaks at 1 regardless of the exponents:
// the peak sits at t* = a/(a+b), in closed form
function kernel(t: number, { a, b }: Flank): number {
  const peak = a / (a + b);
  return (t ** a * (1 - t) ** b) / (peak ** a * (1 - peak) ** b);
}

function aligned(f: PetalForm, x: number, y: number): [number, number] {
  const cos = Math.cos(-f.lean);
  const sin = Math.sin(-f.lean);
  return [x * cos - y * sin, x * sin + y * cos];
}

export function midrib(f: PetalForm, t: number): [number, number] {
  return aligned(f, f.bend * f.length * t * t, -f.length * t);
}

function normal(f: PetalForm, t: number): [number, number] {
  const slope = 2 * f.bend * t;
  const len = Math.hypot(1, slope);
  return aligned(f, 1 / len, slope / len);
}

// Real margins undulate: a 2.5-wave ripple keeps the outline from reading
// as laser-cut. Damped where the kernel peaks: the shoulder carries the
// flower's silhouette and a bump there reads as a deformity, while the same
// wave on the rising and falling edge reads as nature.
function ripple(f: PetalForm, flank: Flank, t: number): number {
  return (
    f.wave *
    Math.sin(t * 5 * Math.PI + flank.phase) *
    Math.sin(Math.PI * t) *
    (1 - 0.65 * kernel(t, flank) ** 2)
  );
}

function flankPoint(
  f: PetalForm,
  flank: Flank,
  side: 1 | -1,
  t: number,
  inset = 0
): [number, number] {
  const [mx, my] = midrib(f, t);
  const [nx, ny] = normal(f, t);
  const w =
    side * (flank.width * kernel(t, flank) + ripple(f, flank, t) - inset);
  return [mx + nx * w, my + ny * w];
}

function fmt(value: number): number {
  return Math.round(value * 10) / 10;
}

function closedPath(points: [number, number][]): string {
  const n = points.length;
  const at = (i: number) => points[((i % n) + n) % n];
  let d = `M ${fmt(points[0][0])} ${fmt(points[0][1])}`;

  for (let i = 0; i < n; i++) {
    const [p0x, p0y] = at(i - 1);
    const [p1x, p1y] = at(i);
    const [p2x, p2y] = at(i + 1);
    const [p3x, p3y] = at(i + 2);

    d += ` C ${fmt(p1x + (p2x - p0x) / 6)} ${fmt(p1y + (p2y - p0y) / 6)} ${fmt(p2x - (p3x - p1x) / 6)} ${fmt(p2y - (p3y - p1y) / 6)} ${fmt(p2x)} ${fmt(p2y)}`;
  }

  return `${d} Z`;
}

export function petalOutline(f: PetalForm, samples = 20): string {
  const points: [number, number][] = [];

  // Cosine spacing clusters samples at base and tip, where the Beta kernel
  // curves hardest
  const ease = (i: number) => (1 - Math.cos((Math.PI * i) / samples)) / 2;

  for (let i = 0; i <= samples; i++) {
    points.push(flankPoint(f, f.over, 1, ease(i)));
  }
  for (let i = samples - 1; i >= 1; i--) {
    points.push(flankPoint(f, f.under, -1, ease(i)));
  }

  return closedPath(points);
}

// The parabola x = bend·L·t², y = -L·t is exactly a quadratic Bézier with
// control point (0, -L/2); Béziers are rotation-invariant, so the
// straightened midrib is just its control points re-aligned
export function midribPath(f: PetalForm): string {
  const [cx, cy] = aligned(f, 0, -f.length / 2);
  const [ex, ey] = aligned(f, f.bend * f.length, -f.length);
  return `M 0 0 Q ${fmt(cx)} ${fmt(cy)} ${fmt(ex)} ${fmt(ey)}`;
}

// The corolla is five 72°-rotated copies of one petal, and what the eye
// reads as "how far the flower is turned" is the phase of the fifth angular
// harmonic of that union's mass. Rotating every petal by δ turns the whole
// flower by δ (the copies factor out), so the lean that zeroes that phase
// stands the flower upright: the straightener and the ruler that checks it
// are one and the same, with no constant to tune.
//
// A petal is star-shaped from the hub, so its silhouette is one reach R(ψ)
// per direction. Sample that profile, take the five-fold union reach, and
// integrate: because ∫∫ r·e^{i5φ} dA = ∫ e^{i5φ}·R³/3 dφ, the radius cube
// is exact. The hub-side base is noisy but reaches little, so R³ all but
// erases it; the separated tips, which carry the orientation, dominate.
export function tipLean(f: PetalForm): number {
  const reach = new Float64Array(360);
  const cast = (x: number, y: number) => {
    const deg = (Math.round((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
    const r = Math.hypot(x, y);
    if (r > reach[deg]) reach[deg] = r;
  };
  for (let i = 0; i <= 160; i++) cast(...flankPoint(f, f.over, 1, i / 160));
  for (let i = 0; i <= 160; i++) cast(...flankPoint(f, f.under, -1, i / 160));
  // close single-bin gaps the sampling skipped, so the profile is whole
  for (let d = 0; d < 360; d++)
    if (!reach[d] && reach[(d + 359) % 360] && reach[(d + 1) % 360])
      reach[d] = (reach[(d + 359) % 360] + reach[(d + 1) % 360]) / 2;

  let re = 0;
  let im = 0;
  for (let d = 0; d < 360; d++) {
    let r = 0;
    for (let k = 0; k < 5; k++) r = Math.max(r, reach[(d + 72 * k) % 360]);
    const a5 = (5 * d * Math.PI) / 180;
    const w = r * r * r;
    re += w * Math.cos(a5);
    im += w * Math.sin(a5);
  }

  // phase/5 gives a petal angle; +18° (= 90°/5) measures it off straight-up
  // (-y), folded into (-36°, 36°].
  const lean = (Math.atan2(im, re) * 180) / Math.PI / 5 + 18;
  return ((((lean + 36) % 72) + 72) % 72) - 36;
}

// The colored margin of a real petal is no parallel band: it pools at the
// head, thins away down the flanks, and its inner border wanders. Built as
// a ring between the outline and a wandering inset of it.
export function marginBand(f: PetalForm, rng: Rng, strength: number): string {
  const from = 0.3;
  const steps = 14;
  const depth = f.length * (0.045 + 0.075 * strength);
  const raw = Array.from({ length: steps + 1 }, () => between(rng, 0.45, 1.55));
  // neighbor-averaged so the border wanders in curves, not steps
  const wander = raw.map(
    (v, i) => (v + raw[Math.max(0, i - 1)] + raw[Math.min(steps, i + 1)]) / 3
  );

  const outer: [number, number][] = [];
  const inner: [number, number][] = [];

  for (const [flank, side] of [
    [f.under, -1],
    [f.over, 1],
  ] as const) {
    for (let i = 0; i <= steps; i++) {
      const k = side === -1 ? i : steps - i;
      const t = from + ((1 - from) * k) / steps;
      const head = Math.min(1, (t - from) / (0.96 - from)) ** 1.6;

      outer.push(flankPoint(f, flank, side, t));
      inner.push(flankPoint(f, flank, side, t, depth * head * wander[k]));
    }
  }

  const ring = [...outer, ...inner.reverse()];
  return `${ring
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${fmt(x)} ${fmt(y)}`)
    .join(" ")} Z`;
}

// A fan of veins per flank: each starts on the midrib near the base and
// peels away toward its flank, dying out before `reach`. Drawn as
// quadratics through three sampled points.
export function veinsPath(
  f: PetalForm,
  rng: Rng,
  perFlank: number,
  reach: number,
  spread: number
): string {
  const parts: string[] = [];

  for (const side of [1, -1] as const) {
    const flank = side === 1 ? f.over : f.under;

    for (let k = 1; k <= perFlank; k++) {
      const tEnd = Math.min(0.9, reach * between(rng, 0.78, 1.06));
      const frac = (spread * (k - between(rng, 0, 0.35))) / (perFlank + 0.5);

      const vein = (t: number): [number, number] => {
        const [mx, my] = midrib(f, t);
        const [nx, ny] = normal(f, t);
        const w =
          side *
          flank.width *
          kernel(t, flank) *
          frac ** 0.85 *
          (t / tEnd) ** 0.6;
        return [mx + nx * w, my + ny * w];
      };

      const [sx, sy] = vein(0.05);
      const [mx, my] = vein(tEnd * 0.55);
      const [ex, ey] = vein(tEnd);

      parts.push(
        `M ${fmt(sx)} ${fmt(sy)} Q ${fmt(2 * mx - (sx + ex) / 2)} ${fmt(2 * my - (sy + ey) / 2)} ${fmt(ex)} ${fmt(ey)}`
      );
    }
  }

  return parts.join(" ");
}
