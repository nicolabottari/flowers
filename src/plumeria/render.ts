// A plumeria is five petals overlapping like a pinwheel, a cycle no
// painter's order can close. The first four overlaps come for free from
// draw order; the last one is the first petal redrawn clipped inside the
// last, with a contact shadow under every covering edge so petals separate
// without a single drawn outline. Color works in layers, all clipped to
// the petal: an OKLCH-sampled body ramp, anisotropic petal grain, a throat
// in two registers (a steady shared core plus a flame ellipse per petal,
// so the gold reads as a star) torn at the edges by turbulence
// displacement, vein fans, a blush, a sheen, and a margin tint that frays
// into the petal. Themes only re-tone the structure; ids embed the theme
// so a light and a dark flower can share one document.

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

  // Warm paper washes pale petals out by simultaneous contrast, so the
  // light theme gets the chroma push; on dark the colors glow unaided
  const themed = (t: Tone): Tone =>
    theme === "dark"
      ? { c: t.c * 1.02, h: t.h, l: t.l * 0.99 }
      : { c: t.c * 1.07, h: t.h, l: t.l * 0.985 };
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
  const shadowOpacity = 0.26;
  const rimOpacity = theme === "dark" ? 0.26 : 0.15;
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

  // On paper the flower rests in its own warm shade; on dark it floats on a
  // faint glow of its throat color instead
  const groundHex =
    theme === "dark"
      ? hex(throat.tone)
      : toHex(mixTone(body.base, { c: 0.05, h: 55, l: 0.25 }, 0.8));
  const groundPeak = theme === "dark" ? 0.1 : 0.15;
  const ambientStops = [
    stop(0, groundHex, groundPeak),
    stop(0.7, groundHex, groundPeak * 0.66),
    stop(1, groundHex, 0),
  ];

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
    `<radialGradient id="${id("ambient")}">${ambientStops.join("")}</radialGradient>`,
    // Contact shadows fade out near the hub: in a real corolla the center
    // glows, it never sits in its own shade
    `<mask id="${id("hubmask")}" maskUnits="userSpaceOnUse" x="${fmt(-1.1 * L)}" y="${fmt(-1.1 * L)}" width="${fmt(2.2 * L)}" height="${fmt(2.2 * L)}"><rect x="${fmt(-1.1 * L)}" y="${fmt(-1.1 * L)}" width="${fmt(2.2 * L)}" height="${fmt(2.2 * L)}" fill="${url("hub")}"/></mask>`,
    `<filter id="${id("soft")}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.8"/></filter>`,
    `<filter id="${id("near")}" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="2.5"/></filter>`,
    `<filter id="${id("fine")}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1"/></filter>`,
    `<filter id="${id("contact")}" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="6"/></filter>`,
    `<radialGradient id="${id("sheen")}">${stop(0, "#fff", 0.5)}${stop(0.7, "#fff", 0.18)}${stop(1, "#fff", 0)}</radialGradient>`,
    // The iris-fiber field flows under a displacement far gentler than the
    // flame's tear, so fine strokes survive it
    `<filter id="${id("flow")}" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="${flowSeed}"/><feDisplacementMap in="SourceGraphic" scale="12"/></filter>`,
    `<filter id="${id("grain")}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.09 0.004" numOctaves="2" seed="${intBetween(rng, 1, 999999)}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.16 0 0 0 -0.03"/><feComposite in2="SourceGraphic" operator="in"/></filter>`,
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
    const fiberDark: Tone = {
      c: body.base.c + 0.015,
      h: body.base.h,
      l: body.base.l - 0.075,
    };
    const fiberLight: Tone = {
      c: Math.max(0.005, body.base.c - 0.005),
      h: body.base.h,
      l: Math.min(0.98, body.base.l + 0.045),
    };
    const crypts = Array.from({ length: 2 }, () => {
      const t = between(rng, 0.14, 0.3);
      const off = between(rng, -0.55, 0.55) * form.over.width;
      return `<ellipse cx="${fmt(form.bend * L * t * t + off)}" cy="${fmt(-L * t)}" rx="${fmt(between(rng, 2, 3.6))}" ry="${fmt(between(rng, 3, 5.5))}" fill="${hex(fiberDark)}" opacity="0.12"/>`;
    }).join("");
    const fibers =
      `<g filter="${url("flow")}">` +
      `<path d="${veinsPath(form, rng, intBetween(rng, 7, 10), 0.9, 1.04)}" fill="none" stroke="${hex(fiberDark)}" stroke-width="1.1" stroke-linecap="round" opacity="0.15"/>` +
      `<path d="${veinsPath(form, rng, intBetween(rng, 6, 9), 0.92, 1.08)}" fill="none" stroke="${hex(fiberLight)}" stroke-width="1" stroke-linecap="round" opacity="0.16"/>` +
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
    const lightOpacity = facing > 0 ? 0.085 * facing : 0.075 * -facing;
    const light =
      lightOpacity < 0.008
        ? ""
        : `<use ${href("p")} fill="${facing > 0 ? "#fff" : "#000"}" opacity="${fmt(lightOpacity)}"/>`;

    const [hx, hy] = midrib(form, 0.55);
    const sheen = `<ellipse transform="translate(${fmt(hx)} ${fmt(hy)}) rotate(${fmt(Math.atan(2 * form.bend * 0.55) * (180 / Math.PI))})" rx="${fmt(0.3 * L * between(rng, 0.85, 1.1))}" ry="${fmt(0.16 * L * between(rng, 0.85, 1.1))}" fill="${url("sheen")}" opacity="${fmt(0.07 + 0.12 * Math.max(0, facing) + between(rng, 0, 0.04))}"/>`;

    petals.push(
      `<g${anim.petal(i)}>` +
        `<g id="${id(`g${i}`)}" transform="translate(${CENTER} ${fmt(CY)}) rotate(${fmt(angles[i])})" clip-path="${url("c")}">` +
        `<use ${href("p")} fill="${url("ramp")}"/>` +
        `<use ${href("p")} fill="#000" filter="${url("grain")}" opacity="${theme === "dark" ? 0.3 : 0.4}"/>` +
        core +
        `<g filter="${url(`f${i}`)}">${flameLayers.join("")}</g>` +
        fibers +
        haloLayer +
        stripeLayer +
        blush2Layer +
        `<path d="${midribPath(form)}" fill="none" stroke="${url("crease")}" stroke-width="8" filter="${url("soft")}"/>` +
        veinLayer +
        billows +
        marginLayer +
        `<ellipse transform="translate(${fmt(bx)} ${fmt(by)}) rotate(${fmt(tilt)})" rx="${fmt(blushRx)}" ry="${fmt(blushRx * between(rng, 0.55, 0.8))}" fill="${url("blush")}" opacity="${fmt(Math.min(1, 0.75 * blush.strength * blushBoost))}"/>` +
        sheen +
        `<use ${href("p")} fill="none" stroke="${hex(rimTone)}" stroke-width="2.4" opacity="${fmt(rimOpacity + 0.18 * Math.max(0, facing))}"/>` +
        light +
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

  const ambient =
    theme === "dark"
      ? `<ellipse cx="${CENTER}" cy="${fmt(CY)}" rx="${fmt(L * 1.18)}" ry="${fmt(L * 1.12)}" fill="${url("ambient")}"${anim.fade}/>`
      : `<ellipse cx="${CENTER}" cy="${fmt(CY + 10)}" rx="${fmt(L * 0.95)}" ry="${fmt(L * 0.88)}" fill="${url("ambient")}"${anim.fade}/>`;
  const tube = `<circle cx="${CENTER}" cy="${fmt(CY)}" r="${fmt(0.1 * L)}" fill="${url("tube")}"${anim.fade}/>`;
  const eye = `<circle cx="${CENTER}" cy="${fmt(CY)}" r="${fmt(between(rng, 3, 4.5))}" fill="${hex(eyeTone)}"${anim.fade}/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="${size}" height="${size}" role="img" aria-label="A ${genome.cultivar} plumeria"><defs>${defs.join("")}</defs>${anim.style}${ambient}${anim.openTag}${petals.join("")}${wedge}${anim.closeTag}${tube}${eye}</svg>`;
}
