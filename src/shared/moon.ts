// The synodic month is regular enough (29.53 days, drifting seconds per
// century) that one known new moon anchors every phase we will ever need:
// no API, no almanac, just arithmetic on the date.

const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_DAYS = 29.53058867;
const DAY_MS = 86_400_000;

// 0 = new, 0.5 = full, measured at noon UTC so the whole day agrees
const phase = (isoDate: string): number => {
  const noon = Date.parse(`${isoDate}T12:00:00Z`);
  const lunations = (noon - KNOWN_NEW_MOON) / DAY_MS / SYNODIC_DAYS;
  return lunations - Math.floor(lunations);
};

// 1 on the night of the full moon, fading to 0 a day either side
export const fullMoon = (isoDate: string): number => {
  const offset = Math.abs(phase(isoDate) - 0.5);
  return Math.max(0, 1 - offset / 0.034);
};
