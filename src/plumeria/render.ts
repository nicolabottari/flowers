// A plumeria is five petals overlapping like a pinwheel, a cycle no
// painter's order can close. The first four overlaps come for free from
// draw order; the last one is the first petal redrawn clipped inside the
// last, with a contact shadow under every covering edge so petals separate
// without a single drawn outline. Color works in layers, all clipped to
// the petal: an OKLCH-sampled body ramp, anisotropic grain, a throat in two
// registers (a steady shared core plus a flame ellipse per petal, so the
// gold reads as a star) torn by turbulence displacement, a warm glow rising
// from the hub, radial iris fibers, vein fans, a blush, a margin tint that
// frays into the petal, a cool tip shade and a soft inner edge that hold
// pale petals against light paper, a satin sheen, one key light cast as a
// per-petal gradient for volume, and a waxy rim. A final grade over the
// whole flower lifts contrast, saturation, and light. Themes re-tone the
// structure; ids embed the theme so a light and a dark flower share one
// document.

import { mixTone, type Tone, toHex } from "../shared/color";
import { fullMoon } from "../shared/moon";
import { between, createRng, intBetween } from "../shared/prng";
import { type Bloom, bloom as makeBloom, still } from "./bloom";
import { sampleGenome } from "./genome";
import {
  marginBand,
  midrib,
  midribPath,
  petalForm,
  petalOutline,
  veinsPath,
} from "./petal";

export type Theme = "light" | "dark";

export type PlumeriaOptions = {
  seed: string;
  /** ISO day (YYYY-MM-DD); the full moon of that day pales the bloom */
  date?: string;
  /** true adds the opening animation; the default is the settled flower */
  bloom?: boolean;
  /** true rests the flower on a soft ground glow; the default is bare */
  glow?: boolean;
  theme?: Theme;
  size?: number;
};

const VIEWBOX = 480;
const CENTER = VIEWBOX / 2;
const PETALS = 5;
const PETAL_STEP = 360 / PETALS;
// Screen light falls from the top left; a petal pointing at -45° in
// rotate-space faces it
const LIGHT_AT = -45;

function fmt(value: number): number {
  return Math.round(value * 100) / 100;
}

function stop(offset: number, color: string, opacity?: number): string {
  return `<stop offset="${fmt(offset)}" stop-color="${color}"${opacity === undefined ? "" : ` stop-opacity="${fmt(opacity)}"`}/>`;
}

// The cultivar a seed will grow, without rendering it. Draws the same rng
// prefix as plumeria(), so keep the two in step.
export function cultivar({ seed }: Pick<PlumeriaOptions, "seed">): string {
  const rng = createRng(seed);
  rng();
  return sampleGenome(rng).cultivar;
}

export function plumeria({
  seed,
  date,
  bloom = false,
  glow = false,
  theme = "light",
  size = VIEWBOX,
}: PlumeriaOptions): string {
  const rng = createRng(seed);
  // The theme is part of the id: two flowers of the same seed can share one
  // document, and SVG resolves url(#...) against the whole of it, so
  // colliding ids would paint both from one palette.
  const uid = `${theme === "dark" ? "d" : "l"}${Math.floor(rng() * 1e9).toString(36)}`;
  const genome = sampleGenome(rng, date ? fullMoon(date) : 0);
  const { blush, body, margin, throat, veins } = genome;
  const L = genome.form.length;

  // Both themes lift chroma so the colors read vivid; the light theme takes
  // more, since warm paper washes pale petals out by simultaneous contrast.
  const themed = (t: Tone): Tone =>
    theme === "dark"
      ? { c: t.c * 1.31, h: t.h, l: t.l * 0.99 }
      : { c: t.c * 1.46, h: t.h, l: t.l * 0.985 };
  const hex = (t: Tone): string => toHex(themed(t));

  // A five-pointed star reaches L upward but only cos(36°)·L ≈ 0.81·L down:
  // centering the hub leaves the flower sitting high in the box. Center the
  // visual mass instead.
  const CY = CENTER + 0.0955 * L;

  const id = (key: string) => `${uid}${key}`;
  const url = (key: string) => `url(#${id(key)})`;
  const href = (key: string) => `href="#${id(key)}"`;

  const flameMix = (t: number) => mixTone(throat.tone, body.base, t);
  const rayTone: Tone = {
    c: throat.tone.c + 0.01,
    h: throat.tone.h - 12,
    l: throat.tone.l - 0.1,
  };
  const creaseTone: Tone = {
    c: body.base.c + 0.02,
    h: body.base.h,
    l: body.base.l - 0.14,
  };
  const shadowTone: Tone = { c: 0.045, h: body.base.h, l: 0.3 };
  // Waxy petals catch light along their rim, the thin bright line that
  // separates overlapping petals without drawing an outline
  const rimTone = mixTone(body.tip, { c: 0.005, h: body.tip.h, l: 0.99 }, 0.7);
  const eyeTone: Tone = {
    c: throat.tone.c * 0.9,
    h: throat.tone.h - 25,
    l: 0.42,
  };
  // How pale the petal body is, 0..1: pale cultivars (white, yellow, light
  // pink) take a lighter contact shadow and an inner edge to separate on
  // paper; saturated bodies keep the full contact shadow their overlaps need.
  // Broad enough to catch the light pinks, not only the whites.
  const pale = Math.max(0, Math.min(1, (body.base.l - 0.8) / 0.14));
  // Pale over pale paper needs only a whisper of cast shadow at the overlaps,
  // or the petal beneath reads as a heavy crease, but only on light: on dark
  // the inner edge is off, so the contact shadow is the petals' one boundary
  // and must stay full, or pale petals merge on black.
  const shadowOpacity = theme === "dark" ? 0.34 : 0.34 * (1 - 0.42 * pale);
  const rimOpacity = theme === "dark" ? 0.32 : 0.46;
  // A white petal's far end is not warm-grey but cool-white-in-shadow: a
  // faint blue-grey deepening toward the tip pulls the pale lamina off the
  // warm paper and reads as pure white turning away, not a yellow-green cast.
  const tipCool: Tone = { c: 0.012, h: 248, l: body.tip.l - 0.08 };
  const tipShadeOp = pale * (theme === "dark" ? 0.15 : 0.28);
  // The luminous throat: a warm near-white glow pooled at the hub, bleeding a
  // little way up each petal, so the heart reads lit from within.
  const golaGlow = hex(
    mixTone(throat.tone, { c: 0.02, h: throat.tone.h, l: 0.98 }, 0.56)
  );
  // The auto-grade lifts highlights for pop, but a pale petal is already near
  // white, so a full lift blows it into the paper and the lit (top-left)
  // petals vanish. Soften the curve toward pale bodies; saturated ones keep
  // the full contrast. Pivot held near 0.43 so shadows still deepen.
  const gradeSlope = 1.2 - 0.15 * pale;
  const gradeIntercept = -0.43 * (gradeSlope - 1);
  // Low frequency + strong scale tears the throat gradient into long
  // tongues of color instead of a fine shimmer
  const baseFrequency = Math.round(between(rng, 0.008, 0.014) * 1e4) / 1e4;
  const flowSeed = intBetween(rng, 1, 999999);
  // Extra liveries, all tones derived from the genome so combinations stay
  // in the family: a picotee halo where the throat ends, rare lengthwise
  // stripes, a second harmonic blush, gilded iris beams
  const halo = rng() < 0.4 ? between(rng, 0.12, 0.22) : 0;
  const haloTone = mixTone(throat.tone, margin.tone, 0.55);
  const stripy = rng() < 0.18;
  const blush2 =
    rng() < 0.45
      ? mixTone(body.tip, throat.tone, between(rng, 0.3, 0.7))
      : null;
  const beamTone =
    rng() < 0.5
      ? "#fff"
      : hex(mixTone(throat.tone, { c: 0.02, h: throat.tone.h, l: 0.97 }, 0.45));

  // The soft ground the flower rests on, opt-in via `glow`: a warm shade on
  // paper, a faint throat-colored glow on dark. The default is bare, since a
  // library should not impose the surface its flower lands on.
  const ground = glow
    ? {
        hex:
          theme === "dark"
            ? hex(throat.tone)
            : toHex(mixTone(body.base, { c: 0.05, h: 55, l: 0.25 }, 0.8)),
        peak: theme === "dark" ? 0.06 : 0.085,
      }
    : null;

  const defs: string[] = [
    `<linearGradient id="${id("ramp")}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${fmt(-L)}">${[0, 0.3, 0.55, 0.78, 1].map((t) => stop(t, hex(mixTone(body.base, body.tip, t)))).join("")}</linearGradient>`,
    // Two-layer throat: a steady core the displacement never touches, and a
    // wider flame whose torn edge does the dancing
    `<radialGradient id="${id("core")}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${fmt(throat.reach * L * 0.5)}">${stop(0, hex(throat.tone), 1)}${stop(0.5, hex(throat.tone), 0.95)}${stop(0.8, hex(flameMix(0.15)), 0.45)}${stop(0.94, hex(flameMix(0.22)), 0.12)}${stop(1, hex(flameMix(0.25)), 0)}</radialGradient>`,
    `<radialGradient id="${id("flame")}">${stop(0, hex(throat.tone), 1)}${stop(0.5, hex(flameMix(0.08)), 1)}${stop(0.72, hex(flameMix(0.28)), 0.6)}${stop(0.9, hex(flameMix(0.5)), 0.25)}${stop(1, hex(flameMix(0.65)), 0)}</radialGradient>`,
    `<radialGradient id="${id("hub")}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${fmt(0.44 * L)}">${stop(0, "#000")}${stop(0.4, "#3a3a3a")}${stop(0.62, "#888")}${stop(0.82, "#ccc")}${stop(0.93, "#f2f2f2")}${stop(1, "#fff")}</radialGradient>`,
    `<linearGradient id="${id("crease")}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${fmt(-L)}">${stop(0, hex(creaseTone), 0.5)}${stop(0.6, hex(creaseTone), 0)}</linearGradient>`,
    `<linearGradient id="${id("veinfade")}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${fmt(-L)}">${stop(0, hex(veins.tone), 0.9)}${stop(0.5, hex(veins.tone), 0.6)}${stop(0.8, hex(veins.tone), 0)}</linearGradient>`,
    `<linearGradient id="${id("rayfade")}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${fmt(-L)}">${stop(0, hex(rayTone), 0.95)}${stop(0.55, hex(rayTone), 0.55)}${stop(0.85, hex(rayTone), 0)}</linearGradient>`,
    `<radialGradient id="${id("blush")}">${stop(0, hex(blush.tone), 0.8)}${stop(0.6, hex(blush.tone), 0.35)}${stop(1, hex(blush.tone), 0)}</radialGradient>`,
    `<radialGradient id="${id("tube")}" gradientUnits="userSpaceOnUse" cx="${CENTER}" cy="${fmt(CY)}" r="${fmt(0.1 * L)}">${stop(0, hex({ c: throat.tone.c + 0.04, h: throat.tone.h, l: throat.tone.l - 0.16 }), 1)}${stop(0.35, hex({ c: throat.tone.c + 0.02, h: throat.tone.h, l: throat.tone.l - 0.08 }), 0.7)}${stop(0.6, hex(throat.tone), 0.35)}${stop(0.85, hex(throat.tone), 0.1)}${stop(1, hex(throat.tone), 0)}</radialGradient>`,
    ground
      ? `<radialGradient id="${id("ambient")}">${stop(0, ground.hex, ground.peak)}${stop(0.7, ground.hex, ground.peak * 0.66)}${stop(1, ground.hex, 0)}</radialGradient>`
      : "",
    // Contact shadows fade out near the hub: in a real corolla the center
    // glows, it never sits in its own shade
    `<mask id="${id("hubmask")}" maskUnits="userSpaceOnUse" x="${fmt(-1.1 * L)}" y="${fmt(-1.1 * L)}" width="${fmt(2.2 * L)}" height="${fmt(2.2 * L)}"><rect x="${fmt(-1.1 * L)}" y="${fmt(-1.1 * L)}" width="${fmt(2.2 * L)}" height="${fmt(2.2 * L)}" fill="${url("hub")}"/></mask>`,
    `<filter id="${id("soft")}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.8"/></filter>`,
    `<filter id="${id("near")}" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="2.5"/></filter>`,
    `<filter id="${id("fine")}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1"/></filter>`,
    `<filter id="${id("contact")}" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="6"/></filter>`,
    `<filter id="${id("edge")}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>`,
    `<radialGradient id="${id("sheen")}">${stop(0, "#fff", 0.66)}${stop(0.42, "#fff", 0.3)}${stop(0.76, "#fff", 0.08)}${stop(1, "#fff", 0)}</radialGradient>`,
    // Cool tip shade, pooling toward the petal end (whites only via opacity)
    `<linearGradient id="${id("tipshade")}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${fmt(-L)}">${stop(0, toHex(tipCool), 0)}${stop(0.5, toHex(tipCool), 0)}${stop(0.82, toHex(tipCool), tipShadeOp * 0.5)}${stop(1, toHex(tipCool), tipShadeOp)}</linearGradient>`,
    // Luminous throat: warm near-white glow from the hub, fading up the petal
    `<radialGradient id="${id("gola")}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${fmt(0.55 * L)}">${stop(0, golaGlow, 0.64 + 0.14 * pale)}${stop(0.42, golaGlow, 0.28 + 0.06 * pale)}${stop(0.72, golaGlow, 0.07)}${stop(1, golaGlow, 0)}</radialGradient>`,
    // The iris-fiber field flows under a displacement far gentler than the
    // flame's tear, so fine strokes survive it
    `<filter id="${id("flow")}" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="${flowSeed}"/><feDisplacementMap in="SourceGraphic" scale="12"/></filter>`,
    `<filter id="${id("grain")}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.09 0.004" numOctaves="2" seed="${intBetween(rng, 1, 999999)}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.16 0 0 0 -0.03"/><feComposite in2="SourceGraphic" operator="in"/></filter>`,
    // A final auto-grade on the whole composited flower, the way a phone's
    // auto mode balances a shot: a gentle S of contrast (shadows deepen, the
    // highlights ride up so petal ends bloom toward white) and a moderate
    // saturation lift, so the corolla pops with depth instead of reading flat
    // and pale even when its whites are bright.
    `<filter id="${id("grade")}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.1"/><feComponentTransfer><feFuncR type="linear" slope="${fmt(gradeSlope)}" intercept="${fmt(gradeIntercept)}"/><feFuncG type="linear" slope="${fmt(gradeSlope)}" intercept="${fmt(gradeIntercept)}"/><feFuncB type="linear" slope="${fmt(gradeSlope)}" intercept="${fmt(gradeIntercept)}"/></feComponentTransfer><feComponentTransfer><feFuncR type="gamma" amplitude="1" exponent="0.9"/><feFuncG type="gamma" amplitude="1" exponent="0.9"/><feFuncB type="gamma" amplitude="1" exponent="0.9"/></feComponentTransfer></filter>`,
  ];

  // Real contact shade is a crisp line opening into penumbra, so every
  // covering petal casts twice: tight and wide
  const castShadow = (key: string, rotation: number): string =>
    `<use ${href(key)} transform="rotate(${fmt(rotation)})" fill="${hex(shadowTone)}" opacity="${fmt(shadowOpacity * 0.85)}" filter="${url("contact")}"/>` +
    `<use ${href(key)} transform="rotate(${fmt(rotation)})" fill="${hex(shadowTone)}" opacity="${fmt(shadowOpacity * 0.6)}" filter="${url("near")}"/>`;

  const anim: Bloom = bloom ? makeBloom(uid, CENTER, CY, PETALS) : still;

  const petals: string[] = [];

  // One form for the whole flower: real petals grow from one genetic
  // program, identical shape and size, symmetric corolla. Per-petal life
  // lives in the paint (flame, fibers, blush), never the geometry. The form
  // is born straight, so the corolla is an exact star: one petal upright,
  // the rest at clean multiples of 72°.
  const form = petalForm(genome.form, rng);
  const angles = Array.from({ length: PETALS }, (_, i) => i * PETAL_STEP);

  defs.push(
    `<path id="${id("p")}" d="${petalOutline(form)}"/>`,
    `<clipPath id="${id("c")}"><use ${href("p")}/></clipPath>`
  );

  const tipShadeLayer =
    tipShadeOp > 0.02 ? `<use ${href("p")} fill="${url("tipshade")}"/>` : "";
  const gola = `<use ${href("p")} fill="${url("gola")}"/>`;
  // A soft inner shadow hugging the petal's free edge, so a pale bloom holds
  // its outline against light paper where the near-white rim cannot. Blurred
  // and clipped, so only the inner half survives, a shade, not an outline.
  // Pale cultivars on the light theme only; colored and dark are untouched.
  const innerEdgeOp = pale * (theme === "dark" ? 0 : 0.26);
  const innerEdge =
    innerEdgeOp > 0.02
      ? `<use ${href("p")} fill="none" stroke="${toHex({ c: 0.016, h: 250, l: body.tip.l - 0.13 })}" stroke-width="14" opacity="${fmt(innerEdgeOp)}" filter="${url("edge")}"/>`
      : "";

  for (let i = 0; i < PETALS; i++) {
    const next = (i + 1) % PETALS;

    defs.push(
      `<filter id="${id(`f${i}`)}" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="3" seed="${intBetween(rng, 1, 999999)}"/><feDisplacementMap in="SourceGraphic" scale="${fmt(between(rng, 0.85, 1.15) * (34 + 50 * throat.flame))}" xChannelSelector="R" yChannelSelector="G"/></filter>`
    );

    const core = `<use ${href("p")} fill="${url("core")}"/>`;
    const flameR = throat.reach * L * between(rng, 0.94, 1.06);
    const flameLayers = [
      `<ellipse cy="${fmt(-0.42 * flameR)}" rx="${fmt(0.72 * flameR)}" ry="${fmt(0.86 * flameR)}" fill="${url("flame")}"/>`,
    ];

    if (throat.rays > 0.05) {
      flameLayers.push(
        `<path d="${veinsPath(form, rng, intBetween(rng, 2, 3), throat.reach * 1.05, 0.55)}" fill="none" stroke="${url("rayfade")}" stroke-width="4.5" stroke-linecap="round" opacity="${fmt(0.6 * throat.rays)}"/>`
      );
    }
    // Veins stay out of the displacement group: its strong warp would smear
    // thin strokes into fog, a whisper of blur is enough
    const veinLayer =
      veins.strength > 0.05
        ? `<path d="${veinsPath(form, rng, intBetween(rng, 4, 6), 0.82, 0.95)}" fill="none" stroke="${url("veinfade")}" stroke-width="2.5" stroke-linecap="round" opacity="${fmt(Math.min(0.5, 0.75 * veins.strength))}" filter="${url("fine")}"/>`
        : "";

    // Soft longitudinal billows, silk catching light, then the margin wash
    // pooling at the head
    const billows =
      `<path d="${veinsPath(form, rng, 2, 0.88, 0.85)}" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" opacity="0.055" filter="${url("soft")}"/>` +
      `<path d="${veinsPath(form, rng, 2, 0.85, 0.8)}" fill="none" stroke="${hex(creaseTone)}" stroke-width="13" stroke-linecap="round" opacity="0.05" filter="${url("soft")}"/>`;
    const marginLayer =
      margin.strength > 0.05
        ? `<path d="${marginBand(form, rng, margin.strength)}" fill="${hex(margin.tone)}" opacity="${fmt(0.28 + 0.34 * margin.strength)}" filter="${url("soft")}"/>`
        : "";

    // The iris field: fine radial fibers in two registers flowing along the
    // petal, a few wide light beams, and dark crypts near the throat, the
    // eye-like dynamism real petals carry
    // Pale bodies carry almost no fiber contrast on their own, so the iris
    // detail vanishes; deepen the dark register and lift the light one on the
    // whites and pastels to bring the radial weave back, while saturated
    // bodies keep their gentle grain (their color already reads the texture).
    const fiberDark: Tone = {
      c: body.base.c + 0.015,
      h: body.base.h,
      l: body.base.l - (0.075 + 0.05 * pale),
    };
    const fiberLight: Tone = {
      c: Math.max(0.005, body.base.c - 0.005),
      h: body.base.h,
      l: Math.min(0.98, body.base.l + 0.045 + 0.03 * pale),
    };
    const crypts = Array.from({ length: 2 }, () => {
      const t = between(rng, 0.14, 0.3);
      const off = between(rng, -0.55, 0.55) * form.over.width;
      return `<ellipse cx="${fmt(form.bend * L * t * t + off)}" cy="${fmt(-L * t)}" rx="${fmt(between(rng, 2, 3.6))}" ry="${fmt(between(rng, 3, 5.5))}" fill="${hex(fiberDark)}" opacity="0.12"/>`;
    }).join("");
    const fibers =
      `<g filter="${url("flow")}">` +
      `<path d="${veinsPath(form, rng, intBetween(rng, 7, 10), 0.9, 1.04)}" fill="none" stroke="${hex(fiberDark)}" stroke-width="1.1" stroke-linecap="round" opacity="${fmt(0.15 + 0.1 * pale)}"/>` +
      `<path d="${veinsPath(form, rng, intBetween(rng, 6, 9), 0.92, 1.08)}" fill="none" stroke="${hex(fiberLight)}" stroke-width="1" stroke-linecap="round" opacity="${fmt(0.16 + 0.07 * pale)}"/>` +
      `<path d="${veinsPath(form, rng, 2, 0.8, 0.5)}" fill="none" stroke="${beamTone}" stroke-width="5.5" stroke-linecap="round" opacity="${beamTone === "#fff" ? "0.055" : "0.09"}"/>` +
      crypts +
      `</g>`;

    const haloR = throat.reach * L * between(rng, 0.96, 1.05);
    const haloLayer = halo
      ? `<ellipse cy="${fmt(-0.42 * haloR)}" rx="${fmt(0.74 * haloR)}" ry="${fmt(0.88 * haloR)}" fill="none" stroke="${hex(haloTone)}" stroke-width="${fmt(between(rng, 8, 13))}" opacity="${fmt(halo)}" filter="${url("soft")}"/>`
      : "";
    const stripeLayer =
      stripy && rng() < 0.45
        ? (() => {
            const side = between(rng, -0.6, 0.6);
            const t = between(rng, 0.45, 0.6);
            const [sx, sy] = midrib(form, t);
            return `<ellipse transform="translate(${fmt(sx + side * form.over.width * 0.7)} ${fmt(sy)}) rotate(${fmt((Math.atan(2 * form.bend * t) - form.lean) * (180 / Math.PI))})" rx="${fmt(L * between(rng, 0.05, 0.09))}" ry="${fmt(L * between(rng, 0.28, 0.4))}" fill="${hex({ c: margin.tone.c + 0.02, h: margin.tone.h, l: margin.tone.l - 0.06 })}" opacity="${fmt(between(rng, 0.12, 0.2))}" filter="${url("soft")}"/>`;
          })()
        : "";
    const blush2Layer = blush2
      ? (() => {
          const t = between(rng, 0.35, 0.7);
          const [bx2, by2] = midrib(form, t);
          return `<ellipse transform="translate(${fmt(bx2)} ${fmt(by2)})" rx="${fmt(L * between(rng, 0.14, 0.22))}" ry="${fmt(L * between(rng, 0.09, 0.15))}" fill="${hex(blush2)}" opacity="${fmt(between(rng, 0.1, 0.2))}" filter="${url("soft")}"/>`;
        })()
      : "";

    const blushT = Math.min(0.92, blush.at * between(rng, 0.92, 1.08));
    const [bx, by] = midrib(form, blushT);
    const blushBoost = i === genome.accent ? 1.5 : 1;
    const blushRx = L * (0.16 + 0.14 * blush.strength) * between(rng, 0.9, 1.1);
    const tilt = Math.atan(2 * form.bend * blushT) * (180 / Math.PI);

    const facing = Math.cos(((angles[i] - LIGHT_AT) * Math.PI) / 180);
    // Volume: a soft light→shadow gradient per petal, all aligned to the
    // screen's top-left key light (the petal's own rotation undone), so the
    // corolla reads as one lit, rounded dome instead of five flat cut-outs.
    // The half toward the light whitens, the far half dims, the middle keeps
    // the body color. Petals facing the light get a brighter shoulder; those
    // turned away get a deeper shadow.
    const lightAngle = (angles[i] * Math.PI) / 180;
    const ux = (Math.cos(lightAngle) + Math.sin(lightAngle)) / Math.SQRT2;
    const uy = (Math.cos(lightAngle) - Math.sin(lightAngle)) / Math.SQRT2;
    const [vcx, vcy] = midrib(form, 0.45);
    const vSpan = 0.92 * L;
    // White point is theme-aware: lower in dark, where a lit tip pops hard
    // against black, a little higher in light, where warm paper swallows it.
    // Saturated bodies (carmine) take a touch less, so their tips don't go
    // chalky.
    const vHi =
      ((theme === "dark" ? 0.2 : 0.36) + 0.1 * Math.max(0, facing)) *
      (1 - 0.6 * pale);
    const vLo = (0.08 + 0.045 * Math.max(0, -facing)) * (1 - 0.6 * pale);
    defs.push(
      `<linearGradient id="${id(`v${i}`)}" gradientUnits="userSpaceOnUse" x1="${fmt(vcx - (ux * vSpan) / 2)}" y1="${fmt(vcy - (uy * vSpan) / 2)}" x2="${fmt(vcx + (ux * vSpan) / 2)}" y2="${fmt(vcy + (uy * vSpan) / 2)}">${stop(0, "#fff", vHi)}${stop(0.42, "#fff", 0)}${stop(0.6, "#000", 0)}${stop(1, "#000", vLo)}</linearGradient>`
    );
    const light = `<use ${href("p")} fill="${url(`v${i}`)}"/>`;

    const [hx, hy] = midrib(form, 0.55);
    // A faint, broad satin, just enough sheen to keep the petal from reading
    // matte. Kept low and wide so it never pools into a white halo, and no
    // local catchlight, which read as strange spots stranded on the petals.
    const sheen = `<ellipse transform="translate(${fmt(hx)} ${fmt(hy)}) rotate(${fmt(Math.atan(2 * form.bend * 0.55) * (180 / Math.PI))})" rx="${fmt(0.38 * L * between(rng, 0.85, 1.1))}" ry="${fmt(0.22 * L * between(rng, 0.85, 1.1))}" fill="${url("sheen")}" opacity="${fmt((theme === "dark" ? 0.05 : 0.12) + (theme === "dark" ? 0.07 : 0.12) * Math.max(0, facing))}"/>`;

    petals.push(
      `<g${anim.petal(i)}>` +
        `<g id="${id(`g${i}`)}" transform="translate(${CENTER} ${fmt(CY)}) rotate(${fmt(angles[i])})" clip-path="${url("c")}">` +
        `<use ${href("p")} fill="${url("ramp")}"/>` +
        `<use ${href("p")} fill="#000" filter="${url("grain")}" opacity="${fmt((theme === "dark" ? 0.3 : 0.4) * (1 - 0.45 * pale))}"/>` +
        core +
        `<g filter="${url(`f${i}`)}">${flameLayers.join("")}</g>` +
        gola +
        fibers +
        haloLayer +
        stripeLayer +
        blush2Layer +
        `<path d="${midribPath(form)}" fill="none" stroke="${url("crease")}" stroke-width="8" filter="${url("soft")}"/>` +
        veinLayer +
        billows +
        marginLayer +
        tipShadeLayer +
        `<ellipse transform="translate(${fmt(bx)} ${fmt(by)}) rotate(${fmt(tilt)})" rx="${fmt(blushRx)}" ry="${fmt(blushRx * between(rng, 0.55, 0.8))}" fill="${url("blush")}" opacity="${fmt(Math.min(1, 0.75 * blush.strength * blushBoost))}"/>` +
        sheen +
        light +
        innerEdge +
        `<use ${href("p")} fill="none" stroke="${hex(rimTone)}" stroke-width="2.7" opacity="${fmt(rimOpacity + (theme === "dark" ? 0.24 : 0.32) * Math.max(0, facing))}"/>` +
        "</g></g>"
    );

    // The contact shadow on the seam with the next petal belongs to that
    // petal (it laps over this one and casts onto it), so it enters with
    // the caster's delay, clipped to this petal and stacked just under the
    // neighbour. In a bottom-up bloom no shadow ever precedes the petal
    // that throws it. (The 4 to 0 seam is closed by the wedge below.)
    if (i < PETALS - 1) {
      petals.push(
        `<g${anim.petal(next)}>` +
          `<g transform="translate(${CENTER} ${fmt(CY)}) rotate(${fmt(angles[i])})" clip-path="${url("c")}">` +
          `<g mask="${url("hubmask")}">${castShadow("p", angles[next] - angles[i])}</g>` +
          "</g></g>"
      );
    }
  }

  // The pinwheel's missing overlap: petal 0 shown again only where it
  // crosses petal 4, shadow first, so the cycle closes seamlessly
  defs.push(
    // Slightly inflated: a clip tracing petal 4's exact outline leaves a
    // 1px antialiasing seam where petal 4's bright rim bleeds through the
    // redrawn petal 0; past the edge the redraw lands on petal 0 itself, so
    // the seam dissolves into identical pixels
    `<clipPath id="${id("wedge")}"><use ${href("p")} transform="translate(${CENTER} ${fmt(CY)}) rotate(${fmt(angles[4])}) scale(1.012)"/></clipPath>`
  );
  // Petal 0 sits over petal 4 here, so the seam can only close once both
  // are on stage: the wedge enters with petal 4, the last to bloom.
  const wedge =
    `<g${anim.petal(4)}>` +
    `<g clip-path="${url("wedge")}">` +
    `<g transform="translate(${CENTER} ${fmt(CY)})"><g mask="${url("hubmask")}">${castShadow("p", angles[0])}</g></g>` +
    `<use ${href("g0")}/>` +
    "</g></g>";

  const ambient = ground
    ? theme === "dark"
      ? `<ellipse cx="${CENTER}" cy="${fmt(CY)}" rx="${fmt(L * 1.18)}" ry="${fmt(L * 1.12)}" fill="${url("ambient")}"${anim.fade}/>`
      : `<ellipse cx="${CENTER}" cy="${fmt(CY + 10)}" rx="${fmt(L * 0.95)}" ry="${fmt(L * 0.88)}" fill="${url("ambient")}"${anim.fade}/>`
    : "";
  const tube = `<circle cx="${CENTER}" cy="${fmt(CY)}" r="${fmt(0.1 * L)}" fill="${url("tube")}"${anim.fade}/>`;
  const eye = `<circle cx="${CENTER}" cy="${fmt(CY)}" r="${fmt(between(rng, 3, 4.5))}" fill="${hex(eyeTone)}"${anim.fade}/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="${size}" height="${size}" role="img" aria-label="A ${genome.cultivar} plumeria"><defs>${defs.join("")}</defs>${anim.style}${ambient}<g filter="${url("grade")}">${anim.openTag}${petals.join("")}${wedge}${anim.closeTag}</g>${tube}${eye}</svg>`;
}
