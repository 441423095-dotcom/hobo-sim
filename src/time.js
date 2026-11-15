// The shape of a day: four segments of eight steps, and big actions push the
// clock forward one step at a time. A day is long enough to cross the city,
// work a bin or two and still get home before dark.
export const SEGMENTS = ['清晨', '白天', '傍晚', '深夜'];
export const STEPS_PER_DAY = 32;
export const STEPS_PER_SEGMENT = STEPS_PER_DAY / SEGMENTS.length;

export function segmentOf(step) {
  const index = Math.floor(Math.max(0, step) / STEPS_PER_SEGMENT);
  return Math.min(SEGMENTS.length - 1, index);
}

export function segmentName(step) {
  return SEGMENTS[segmentOf(step)];
}
