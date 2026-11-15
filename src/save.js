// One save slot, kept on the device. The run, the district and the tent's
// furniture are plain data, so a save is just JSON in localStorage; anything that
// cannot be stored (or a browser that refuses) simply means no save, never a
// broken game.

const KEY = 'hobosim.save.v1';

export function saveGame(payload) {
  if (!payload || !payload.run) return false;

  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || !data.run || data.run.over) return null;

    return data;
  } catch (err) {
    return null;
  }
}

export function clearGame() {
  try {
    window.localStorage.removeItem(KEY);
  } catch (err) {
    // Nothing to clear, or storage is closed.
  }
}

export function hasGame() {
  return !!loadGame();
}

/// Just enough about the save to show a line in the tester panel.
export function savedInfo() {
  const data = loadGame();
  if (!data) return null;

  return {
    day: data.run.day || 1,
    step: data.run.step || 0,
    district: data.district || '',
    savedAt: data.savedAt || 0
  };
}
