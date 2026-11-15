// The shape of a day: four segments of four steps, and big actions push the
// clock forward one step at a time.

export const SEGMENTS = ['清晨', '白天', '傍晚', '深夜'];
export const STEPS_PER_DAY = 16;
export const STEPS_PER_SEGMENT = STEPS_PER_DAY / SEGMENTS.length;

export function segmentOf(step) {
  const index = Math.floor(Math.max(0, step) / STEPS_PER_SEGMENT);
  return Math.min(SEGMENTS.length - 1, index);
}

export function segmentName(step) {
  return SEGMENTS[segmentOf(step)];
}
