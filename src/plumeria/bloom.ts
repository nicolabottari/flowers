// The bloom is presentation, not the flower, so it lives apart from the
// render: the default plumeria ships settled, and turning the animation on
// is one option. Petals open in scale only (any per-petal rotation would
// open a dark sliver of backdrop between neighbours mid-flight); the rotary
// feel comes from one shared twist of the whole corolla. They climb the
// stack from the bottom up, petal 0 first, each laid over the one before,
// and the hub fades in with the last petal as the corolla closes. A
// consumer who wants a different entrance can ignore this and drive the
// petal group ids (`<uid>g0` .. `<uid>g4`) with their own CSS.

export type Bloom = {
  style: string;
  petal: (i: number) => string;
  fade: string;
  openTag: string;
  closeTag: string;
};

export const still: Bloom = {
  style: "",
  petal: () => "",
  fade: "",
  openTag: "",
  closeTag: "",
};

export const bloom = (
  uid: string,
  center: number,
  cy: number,
  petals: number
): Bloom => {
  // Each contact shadow and the closing wedge ride the caster's delay, so
  // nothing ever shows before the petal that throws or closes it.
  const delayOf = (i: number) => 30 + i * 60;
  const hubDelay = delayOf(petals - 1) / 1000;

  const style =
    "<style>" +
    `@keyframes ${uid}b{from{opacity:0;transform:scale(.93)}45%{opacity:1}to{opacity:1;transform:none}}` +
    `@keyframes ${uid}s{from{transform:rotate(-6deg)}to{transform:none}}` +
    `@keyframes ${uid}f{from{opacity:0}to{opacity:1}}` +
    `.${uid}b{animation:${uid}b .7s cubic-bezier(.3,.8,.35,1) both;transform-origin:${center}px ${cy}px}` +
    `.${uid}s{animation:${uid}s .95s cubic-bezier(.25,.8,.3,1) both;transform-origin:${center}px ${cy}px}` +
    `.${uid}f{animation:${uid}f .4s ease-out ${hubDelay}s both}` +
    `@media (prefers-reduced-motion:reduce){.${uid}b,.${uid}s,.${uid}f{animation:none}}` +
    "</style>";

  return {
    style,
    petal: (i) => ` class="${uid}b" style="animation-delay:${delayOf(i)}ms"`,
    fade: ` class="${uid}f"`,
    openTag: `<g class="${uid}s">`,
    closeTag: "</g>",
  };
};
