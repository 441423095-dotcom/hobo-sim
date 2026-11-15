// The panel is a phone-shaped viewport whose size is not fixed. The game fills
// all of it: there is no control band, only the HUD drawn over the top of the
// street, so the playfield is simply the whole panel.

export function layoutFor(width, height) {
  return {
    width,
    height,
    bandH: 0,
    playH: Math.max(120, height)
  };
}
