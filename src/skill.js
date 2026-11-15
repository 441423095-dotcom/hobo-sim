// What the beggar gets good at by doing it. Stealing and peddling both start
// hopeless — a narrow green window, a sale nobody believes — and the only way
// out is practice: every attempt counts, every few attempts is a level, and a
// level widens the odds. A bought book gives the same kind of push, once.

export const SKILLS = {
  steal: {
    name: '偷窃',
    perLevel: 8,
    maxLevel: 10,
    blurb: '每级绿区更宽'
  },
  peddle: {
    name: '兜售',
    perLevel: 8,
    maxLevel: 10,
    blurb: '每级成交率更高'
  }
};

export function emptySkills() {
  return { steal: 0, peddle: 0 };
}

/// The level a run has reached in one trade, 0 to 10.
export function skillLevel(run, id) {
  const info = SKILLS[id];
  if (!info) return 0;

  const points = (run && run.skills && run.skills[id]) || 0;

  return Math.min(info.maxLevel, Math.floor(points / info.perLevel));
}

/// One more go at it. Returns the level it left the trade at.
export function addSkill(run, id, n) {
  if (!run) return 0;

  run.skills = run.skills || emptySkills();
  run.skills[id] = (run.skills[id] || 0) + (n || 1);

  return skillLevel(run, id);
}

/// What the level is worth: four per cent of the thing it governs, each level.
export function skillBonus(run, id) {
  return skillLevel(run, id) * 0.04;
}

/// A bought book is worth two levels, once.
export function bookBonus(run, id) {
  return run && run.books && run.books[id] ? 0.08 : 0;
}

export function skillLabel(run, id) {
  const info = SKILLS[id];
  if (!info) return '';

  return `${info.name} Lv.${skillLevel(run, id)}`;
}
