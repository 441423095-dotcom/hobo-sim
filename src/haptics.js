// Every haptic the game plays, by name.
//
// THIS FILE IS A FIXED CONTRACT, like src/icons.js. FreeMilk reads it to list the
// game's haptics, and it is written by the set_haptic and remove_haptic tools —
// not by hand. Three things must stay true:
//
//   1. the file stays at src/haptics.js
//   2. the export stays named HAPTICS
//   3. every value is a plain object literal (no function calls, no variables)
//
// There are no canned effects. An effect is a pattern you describe: a list of
// events on a timeline, in seconds.
//
//   type       'transient' (an instantaneous tap) or 'continuous' (a buzz)
//   time       when it fires, relative to the start
//   intensity  0-1, how hard it hits
//   sharpness  0-1, a dull thud at 0, a crisp tick at 1
//   duration   continuous events only, seconds
//
// Events also take an envelope — attackTime, decayTime, releaseTime, sustained
// — for how they rise, hold and fall.
//
// A pattern may carry curves, which ramp intensity or sharpness smoothly rather
// than in steps, and may loop, set a playbackRate, or be marked sustained so the
// game can change it with hapticUpdate() while it runs.
//
// There is no web haptics API on iOS: this goes through the app to the Taptic
// Engine, so it does nothing when the game is opened in a plain browser.

export const HAPTICS = {
  tick: { events: [{ intensity: 0.5, sharpness: 0.8, time: 0, type: 'transient' }] },

  impact: { events: [{ intensity: 1, sharpness: 0.9, time: 0, type: 'transient' }, { duration: 0.28, intensity: 0.55, sharpness: 0.2, time: 0.02, type: 'continuous' }] },

  charge: { curves: [{ parameter: 'intensity', points: [{ time: 0, value: 0.1 }, { time: 0.6, value: 1 }, { time: 0.8, value: 0 }], time: 0 }], events: [{ duration: 0.8, intensity: 0.4, sharpness: 0.3, time: 0, type: 'continuous' }] },

  coin: { events: [{ intensity: 0.45, sharpness: 0.95, time: 0, type: 'transient' }, { intensity: 0.28, sharpness: 0.8, time: 0.045, type: 'transient' }] },

  pickup: { events: [{ intensity: 0.32, sharpness: 0.35, time: 0, type: 'transient' }, { duration: 0.1, intensity: 0.2, sharpness: 0.1, time: 0.01, type: 'continuous' }, { intensity: 0.22, sharpness: 0.5, time: 0.12, type: 'transient' }] },

  dig: { curves: [{ parameter: 'intensity', points: [{ time: 0.03, value: 0.15 }, { time: 0.16, value: 0.4 }, { time: 0.37, value: 0 }], time: 0.03 }], events: [{ intensity: 0.4, sharpness: 0.15, time: 0, type: 'transient' }, { attackTime: 0.04, decayTime: 0.3, duration: 0.34, intensity: 0.3, sharpness: 0.05, time: 0.03, type: 'continuous' }] },

  buy: { events: [{ intensity: 0.5, sharpness: 0.7, time: 0, type: 'transient' }, { intensity: 0.65, sharpness: 0.55, time: 0.1, type: 'transient' }] },

  refuse: { events: [{ intensity: 0.35, sharpness: 0.2, time: 0, type: 'transient' }, { intensity: 0.25, sharpness: 0.15, time: 0.08, type: 'transient' }] },

  collapse: { curves: [{ parameter: 'intensity', points: [{ time: 0.03, value: 0.6 }, { time: 0.3, value: 0.35 }, { time: 0.78, value: 0 }], time: 0.03 }], events: [{ intensity: 1, sharpness: 0.2, time: 0, type: 'transient' }, { attackTime: 0.02, decayTime: 0.7, duration: 0.75, intensity: 0.55, sharpness: 0.08, time: 0.03, type: 'continuous' }] },

  ui: { events: [{ intensity: 0.18, sharpness: 0.75, time: 0, type: 'transient' }] },

  steal: { events: [{ intensity: 0.55, sharpness: 0.95, time: 0, type: 'transient' }, { intensity: 0.35, sharpness: 0.85, time: 0.05, type: 'transient' }] },

  stealFail: { curves: [{ parameter: 'intensity', points: [{ time: 0.02, value: 0.45 }, { time: 0.25, value: 0 }], time: 0.02 }], events: [{ intensity: 0.7, sharpness: 0.25, time: 0, type: 'transient' }, { attackTime: 0.02, decayTime: 0.24, duration: 0.26, intensity: 0.4, sharpness: 0.05, time: 0.02, type: 'continuous' }] },

  caught: { curves: [{ parameter: 'intensity', points: [{ time: 0.03, value: 0.7 }, { time: 0.35, value: 0.35 }, { time: 0.7, value: 0 }], time: 0.03 }], events: [{ intensity: 1, sharpness: 0.35, time: 0, type: 'transient' }, { attackTime: 0.02, decayTime: 0.65, duration: 0.68, intensity: 0.6, sharpness: 0.15, time: 0.03, type: 'continuous' }] },

  alarm: { events: [{ intensity: 0.6, sharpness: 0.9, time: 0, type: 'transient' }, { intensity: 0.5, sharpness: 0.9, time: 0.14, type: 'transient' }, { intensity: 0.4, sharpness: 0.85, time: 0.28, type: 'transient' }] },

  sell: { events: [{ intensity: 0.4, sharpness: 0.9, time: 0, type: 'transient' }, { intensity: 0.3, sharpness: 0.85, time: 0.06, type: 'transient' }, { intensity: 0.22, sharpness: 0.8, time: 0.13, type: 'transient' }, { intensity: 0.16, sharpness: 0.75, time: 0.19, type: 'transient' }] },

  unlock: { events: [{ intensity: 0.35, sharpness: 0.7, time: 0, type: 'transient' }, { intensity: 0.5, sharpness: 0.85, time: 0.12, type: 'transient' }, { intensity: 0.6, sharpness: 0.95, time: 0.24, type: 'transient' }] },

  travel: { events: [{ attackTime: 0.06, decayTime: 0.3, duration: 0.36, intensity: 0.3, sharpness: 0.15, time: 0, type: 'continuous' }] },

  craft: { events: [{ intensity: 0.45, sharpness: 0.3, time: 0, type: 'transient' }, { intensity: 0.6, sharpness: 0.5, time: 0.08, type: 'transient' }, { intensity: 0.75, sharpness: 0.8, time: 0.18, type: 'transient' }] },

  sleep: { events: [{ attackTime: 0.35, duration: 0.9, intensity: 0.22, releaseTime: 0.4, sharpness: 0.05, time: 0, type: 'continuous' }] },

  jackpot: { curves: [{ parameter: 'intensity', points: [{ time: 0, value: 0.4 }, { time: 0.25, value: 0.95 }, { time: 0.7, value: 0.6 }, { time: 1.1, value: 0 }], time: 0 }], events: [{ intensity: 0.6, sharpness: 0.8, time: 0, type: 'transient' }, { intensity: 0.8, sharpness: 0.7, time: 0.14, type: 'transient' }, { duration: 1.1, intensity: 0.7, sharpness: 0.25, time: 0.14, type: 'continuous' }, { intensity: 0.9, sharpness: 0.9, time: 0.34, type: 'transient' }] }
};

const channel =
  typeof window !== 'undefined' &&
  window.webkit &&
  window.webkit.messageHandlers &&
  window.webkit.messageHandlers.milqHaptics;

function send(payload) {
  if (channel) channel.postMessage(payload);
}

/// Plays a named haptic. Unknown names are ignored rather than throwing, so a
/// renamed effect never crashes a scene mid-frame.
///
/// Pass an id for an effect you intend to change or stop while it runs —
/// looping and sustained effects only. One-shots need no id.
export function haptic(name, id) {
  const effect = HAPTICS[name];
  if (!effect) return;
  send(id ? { ...effect, action: 'play', id } : effect);
}

/// Changes an effect that is already playing: intensity, sharpness, volume or
/// playbackRate. Only reaches effects started with an id.
export function hapticUpdate(id, params) {
  send({ action: 'update', id, ...params });
}

/// Stops one running effect, or every one when called with no id.
export function hapticStop(id) {
  send({ action: 'stop', id });
}

/// Plays an effect without naming it. Prefer named entries in HAPTICS — those
/// are the ones FreeMilk can list and the user can find.
export function hapticNow(effect, id) {
  if (!effect) return;
  send(id ? { ...effect, action: 'play', id } : effect);
}
