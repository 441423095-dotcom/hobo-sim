// The panel is a phone-shaped viewport whose size is not fixed, so the
// playfield and the control band beneath it are both derived from the current
// game size. The street scene and the HUD scene read the same numbers, which
// keeps the world out from under the controls at any shape.

const MIN_BAND = 148;
const MAX_BAND = 208;
const BAND_RATIO = 0.29;

export function layoutFor(width, height) {
  const bandH = Math.round(Math.min(Math.max(height * BAND_RATIO, MIN_BAND), MAX_BAND));
  return {
    width,
    height,
    bandH,
    playH: Math.max(120, height - bandH)
  };
}
