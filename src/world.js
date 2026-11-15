// The street, in world pixels. The art module draws these regions and the
// street scene places walls, bins and walkers against the same numbers, so the
// pavement, the road and the shop line up.

export const WORLD = { width: 640, height: 1440 };

export const LEFT_BUILDINGS = { x: 0, width: 112 };
export const LEFT_PAVEMENT = { x: 112, width: 160 };
export const ROAD = { x: 272, width: 96 };
export const RIGHT_PAVEMENT = { x: 368, width: 160 };
export const RIGHT_BUILDINGS = { x: 528, width: 112 };

// The shop front hangs a little over the pavement so the awning reads, and its
// door sits right on the pavement side where the player can reach it.
export const SHOP = {
  x: 500,
  y: 288,
  width: 128,
  height: 176,
  doorX: 514,
  doorY: 400
};

// The junk stall in the corner of the market, beside the pawn shop, and the
// pawn shop set into the left building near the bottom of the block.
export const STALL = { x: 200, y: 1330, vendorX: 252, vendorY: 1308 };

// The workbench stands right at the tent door, in the camp; there is no bench
// out on the street.
export const WORKBENCH = { x: 292, y: 596 };
export const PAWN = { x: 0, y: 700, width: 112, height: 176, doorX: 124, doorY: 786 };

// Where pedestrians walk: one lane down each pavement.
export const PED_LANES = [196, 444];
