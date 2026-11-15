// The tent the player calls home: the furniture that can go in it, what each
// piece costs or takes to make, how much comfort it adds, and how long it lasts.
//
// Anything made at the workbench is set down in the tent the moment it is
// finished. Flimsy things nailed together out of cardboard and newspaper fall
// apart after a few nights; the real furniture wears out and has to be mended.

export const HOME_SLOTS = ['bed', 'table', 'fireplace', 'rug'];

export const FURNITURE = [
  {
    id: 'bed',
    slot: 'bed',
    name: '破旧的纸板床',
    tex: 'furn-bed',
    comfort: 3,
    price: 0,
    need: { cardboard: 4, rag: 1 },
    craft: { cardboard: 4, rag: 1 },
    durability: 8,
    repair: { cardboard: 2 },
    starter: true,
    blurb: '捡来的纸板压平，垫上破布'
  },
  {
    id: 'table',
    slot: 'table',
    name: '木箱桌',
    tex: 'furn-table',
    comfort: 2,
    price: 55,
    need: null,
    craft: { cardboard: 5, can: 2 },
    durability: 10,
    repair: { cardboard: 2, can: 1 },
    blurb: '从旧货摊搬来的木箱，自己也能钉一个'
  },
  {
    id: 'fireplace',
    slot: 'fireplace',
    name: '铁桶壁炉',
    tex: 'furn-fire',
    comfort: 4,
    price: 90,
    need: null,
    craft: { can: 3, brick: 2, scrap: 1 },
    durability: 12,
    repair: { scrap: 1, brick: 1 },
    blurb: '钻了孔的油桶，烧炭取暖'
  },
  {
    id: 'rug',
    slot: 'rug',
    name: '旧报纸铺',
    tex: 'furn-rug',
    comfort: 2,
    price: 0,
    need: { newspaper: 3, cardboard: 2 },
    craft: { newspaper: 3, cardboard: 2 },
    durability: 3,
    repair: { newspaper: 2 },
    temp: true,
    blurb: '把废报纸压平铺在地上，几天就散'
  }
];

// Once the nook is this comfortable, a small scene plays in the panel.
export const HOME_SCENE_COMFORT = 8;

/// What the workbench can build for the tent. The recipe id carries the piece it
/// makes, and crafting one puts it straight into its place by the canvas wall.
export const FURNITURE_RECIPES = FURNITURE.filter((item) => item.craft).map((item) => ({
  id: `furn:${item.id}`,
  name: item.name,
  tex: item.tex,
  value: 0,
  blueprint: false,
  need: { ...item.craft },
  furniture: item.id
}));

export function furnitureById(id) {
  return FURNITURE.find((item) => item.id === id) || null;
}
