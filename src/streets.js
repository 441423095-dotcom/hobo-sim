// The whole city is one continuous street: these districts sit side by side,
// left to right, with a passage through the buildings where two of them meet.

export const STREET_WIDTH = 640;

export const STREET_ORDER = ['camp', 'market', 'square', 'alley', 'slum', 'park', 'commerce'];

// The band of y where the passages between districts are cut.
export const SEAM = { y0: 520, y1: 720 };

export const SEAM_WIDTH = 224;

export function stripIndexFor(id) {
  return Math.max(0, STREET_ORDER.indexOf(id));
}
