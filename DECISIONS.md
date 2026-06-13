# Decisions

Every consequential choice made while growing this thing, with the
alternative that lost and why. Companion to the [README](README.md), which
describes what is; this file remembers what was decided.

## Architecture

**Genotype is not the render.** `genome.ts` produces an abstract phenotype
(OKLCH tones, reaches, fullness); `render.ts` is one interpreter of it. The
genome is the score, a renderer is a performance. Keeping them apart is what
will let a flower outlive this particular SVG.

**One id namespace per theme.** Two flowers of the same seed can share one
document, and SVG resolves `url(#...)` against the whole of it, so same-seed
flowers collided and the dark one silently painted with the light palette.
Ids embed the theme. Found as a live bug, locked by a test.

## Geometry

**Beta-kernel flanks on a parabolic midrib, not the superformula.** Gielis
curves draw radially symmetric silhouettes; they cannot do imbrication,
asymmetric flanks, or the pinwheel. The working grammar is botanical
vocabulary: lamina, midrib, throat, fibers, margin. Other species will be
configurations of the same vocabulary, not new equations.

**The pinwheel closes with a clipped redraw.** Painter's order cannot close
a cycle of five mutual overlaps. Petal 0 is drawn again, clipped inside
petal 4's silhouette, contact shadow first.

**Wedge clip inflated 1.2%.** A clip tracing petal 4's exact outline leaves
a 1px antialiasing seam where petal 4's bright rim bleeds through; past the
edge the redraw lands on identical pixels and the seam dissolves.

**One shared petal form per flower.** Real corollas grow five copies of one
genetic program. Per-petal jittered shapes (length, bend) read as a crooked
flower, not as nature. Per-petal life lives in paint only. It also halves
the defs.

**Born straight, by the fifth harmonic.** A five-petal corolla has
five-fold symmetry, so how far it is turned is exactly the phase of the
fifth angular harmonic of its mass. Rotating every petal by a turns the
whole flower by a (the five 72° copies factor out), so the lean that zeroes
that phase stands the flower upright: the straightener and the ruler that
checks it are the same mathematics, with no constant to tune. It is
measured on the union of the five petals (the fused bases near the hub
cancel, the separated tips that carry the orientation dominate) via the
star-shaped identity that the radius cube is the jacobian, not a weight.
The lean is baked into the petal's own frame, so the corolla is pure
`rotate(i·72°)`. Earlier tries lost: the head centroid left the bent tip
turned, and a calibrated overlap constant was a fudge. Posture carries no
random jitter; variety lives in shape and color.

**Edge ripple, damped at the shoulder.** A 2.5-wave ripple keeps outlines
from reading laser-cut, but at the kernel's peak the shoulder carries the
flower's silhouette and a bump there reads as deformity. Damp factor
`1 - 0.65·kernel²`.

**Slender corollas are as common as plump ones.** Fullness draws concave
(`1 - rng^0.8·0.9`); flank widths reach down to 0.30/0.21 of length; tips
are usually round (taper floor 0), pointed ones the exception. Photo albums
prove nature does both.

**The visual mass is centered, not the hub.** A five-pointed star reaches
`L` up but only `cos 36° · L ≈ 0.81·L` down; centering the hub leaves every
flower sitting high in its box. The whole corolla shifts down by `0.0955·L`
so the bounding mass centers.

## Color

**OKLCH everywhere, hex only at the edge.** sRGB ramps detour through grey;
OKLCH geodesics pass through warm orange the way petals fade. Gradient stops
are sampled along the geodesic and converted last, with gamut mapping by
walking chroma down.

**The light theme gets the chroma push** (inverted from the first attempt).
Warm paper washes pale petals out by simultaneous contrast; on dark the
colors glow unaided. The original code boosted dark instead, and a
side-by-side harness exposed it.

**Eight cultivar recipes, plus hybrids, as OKLCH spans.** Celadine,
Rainbow, Pink Pearl, Sunset, Fuchsia, Gold, Candy Stripe, Carmine. Hybrids
22% of the time, with dominant-parent naming. A ninth, a lavender
"Moonlit", lived one day and was retired: it never looked like a plumeria.

**Exposure and hue drift make recipes infinite.** Every bloom prints at its
own exposure (pale and milky through deep and saturated, biased gentle:
punch centered below 1) and the whole palette drifts together, so harmony
survives but no pink repeats. The throat follows at 0.35 strength: even the
palest bloom keeps its golden anchor.

**Full moons bloom pale and silvery.** With a `date`, the moon is
arithmetic on it (one known new moon plus the synodic month). It only pales
the exposure; an earlier version picked a lavender cultivar and another
summoned a luna moth, both retired.

## Paint

**No outlines, anywhere.** Petals separate as in photographs: a double
contact shadow (crisp line opening into penumbra) under every covering
edge, a thin rim of light on the waxy margin, one directional light across
the corolla.

**The hub never sits in its own shade.** Contact shadows fade out near the
center through a radial mask with a progressive roll-off; the first
version's three-stop ramp ended dead and the eye drew a circle (mach
banding). Same lesson on the throat core's tail.

**The tube was the phantom ring.** The milky disc that fused petal bases
washed the center and stopped on a visible rim. Found by layer-toggling
(full, no-shadows, no-core, no-tube, no-grain); now a small funnel glow
with a long quiet tail.

**Throat in two registers, starred.** A steady shared core the displacement
never touches, plus a flame ellipse per petal so the gold reads as a star
(one radial circle cannot follow five petals), its edge torn by per-petal
turbulence.

**Thin strokes never ride the strong displacement.** The flame's tear
(scale 34 to 84) smears veins into fog. Veins get a whisper of blur outside
it; the iris-fiber field flows under its own gentle filter (scale 12).
Fibers in two registers plus light beams and throat crypts are what make
petals read like living tissue up close.

**The margin is geometry, not a filtered stroke.** A displaced stroke
frayed into what read as random stains. Now a ring between the outline and
a wandering inset (neighbor-averaged noise, so it curves instead of
stepping), pooling at the head, dying along the flanks.

**Anisotropic grain runs lengthwise.** High frequency across the petal, low
along it; one shared filter that each petal rotates into a new pattern.

## Motion

**Petals open in scale only; rotation belongs to the corolla.** Any
per-petal rotation opens a dark sliver of backdrop between neighbors
mid-flight (the "black wedge" bug; it looked like a shadow, it was
geometry). Petals fade and scale from the hub, fully opaque by 45% of the
timeline, and one shared -6° twist of the whole corolla carries the rotary
feel. Gapless by construction.

**Entrance climbs the stack, bottom up.** Petal 0 opens first and each new
petal is laid over the one before, the way a hand would stack them. A
contact shadow belongs to the petal that casts it, not the one it falls on,
so each seam's shadow rides its caster's delay and never appears before the
petal that throws it. The closing wedge (petal 0 over petal 4) enters with
petal 4, the last to bloom, since the seam cannot close until both edges
are on stage.

**The settled flower is the default; bloom is opt-in.** A library should
not impose presentation. `plumeria` returns the still flower; `bloom: true`
adds the entrance. The animation lives in its own module, kept out of the
render, and the petal group ids are exposed so a different entrance can be
driven from outside.

## Species

**Species are append-only, Unicode-style.** A species freezes when declared
done; improvements become its next version for new seeds, and old seeds
keep rendering under the version they were born with, so the past never
changes. A new flower is a new species beside the old, not a new equation
inside it. Official versus community is curation, never governance:
conformance is decided by test-vectors, automatically.
