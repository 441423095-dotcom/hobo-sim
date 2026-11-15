// The city is a grid of blocks. Each district fills one block: a street running
// north to south between two rows of buildings, 640 by 1440 world pixels.
// Blocks that touch share their street, so passing north or south needs no door
// at all; left and right neighbours are joined by a passage cut through the
// buildings.

export const STREET_WIDTH = 640;

export const STREET_HEIGHT = 1440;

// The band of y (inside a block) where the passages between left and right
// neighbours are cut.
export const SEAM = { y0: 520, y1: 720 };

export const SEAM_WIDTH = 224;

export const CITY_COLS = 3;
export const CITY_ROWS = 3;

// Where each district sits in the 3×3 grid of the city:
//
//   camp      market    square
//   commerce  alley     park
//             slum
export const CITY = {
  camp: { col: 0, row: 0 },
  market: { col: 1, row: 0 },
  square: { col: 2, row: 0 },
  commerce: { col: 0, row: 1 },
  alley: { col: 1, row: 1 },
  park: { col: 2, row: 1 },
  slum: { col: 1, row: 2 }
};

export const STREET_ORDER = Object.keys(CITY);

export function cellOf(id) {
  return CITY[id] || { col: 0, row: 0 };
}

/// The district that fills a cell, or null for a hole in the city.
export function districtAt(col, row) {
  for (const id of STREET_ORDER) {
    const cell = CITY[id];
    if (cell.col === col && cell.row === row) return id;
  }

  return null;
}

/// The district next to `id` in a direction ('north', 'south', 'east', 'west'),
/// or null where the city ends.
export function neighbourOf(id, dir) {
  const cell = CITY[id];
  if (!cell) return null;

  const dc = dir === 'east' ? 1 : dir === 'west' ? -1 : 0;
  const dr = dir === 'south' ? 1 : dir === 'north' ? -1 : 0;

  return districtAt(cell.col + dc, cell.row + dr);
}
