// The app's haptics, with a switch in front of them: the tester panel can turn
// the Taptic Engine off without every scene having to know about it.

import { haptic as play, hapticUpdate, hapticStop } from './haptics.js';

let enabled = true;

export function setHapticsEnabled(value) {
  enabled = !!value;
  if (!enabled) hapticStop();
}

export function hapticsEnabled() {
  return enabled;
}

export function haptic(name, id) {
  if (!enabled) return;
  play(name, id);
}

export { hapticUpdate, hapticStop };
