// One day runs from 06:00 to 02:00 the next morning. The clock only moves when
// the beggar does something: walking is free, but digging, begging and lifting
// a wallet all cost in-game minutes. That way a day is a budget of actions, and
// the clock still reads like a real clock for the story later on.

export const DAY_START = 6 * 60;
export const DAY_LENGTH = 20 * 60; // 06:00 → 02:00

const SEGMENTS = [
  { name: '清晨', from: 5, to: 9 },
  { name: '白天', from: 9, to: 17 },
  { name: '傍晚', from: 17, to: 21 },
  { name: '深夜', from: 21, to: 26 }
];

/// 'HH:MM', wrapping past midnight back to 00:00.
export function minutesToClock(minutes) {
  const total = (DAY_START + Math.max(0, minutes)) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/// The hour of the day, counted past midnight up to 26 so that the small hours
/// still sort after the evening.
export function hourOf(minutes) {
  const hour = ((DAY_START + Math.max(0, minutes)) / 60) % 24;
  return hour < DAY_START / 60 ? hour + 24 : hour;
}

export function segmentOf(minutes) {
  const hour = hourOf(minutes);

  for (let i = 0; i < SEGMENTS.length; i++) {
    if (hour >= SEGMENTS[i].from && hour < SEGMENTS[i].to) return i;
  }

  return SEGMENTS.length - 1;
}

export function segmentName(minutes) {
  return SEGMENTS[segmentOf(minutes)].name;
}
