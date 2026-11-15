// The bridge nook the player calls home: the furniture that can go in it, what
// each piece costs, and how much comfort it adds.

export const HOME_SLOTS = ['bed', 'table', 'fireplace', 'rug'];

export const FURNITURE = [
  {
    id: 'bed',
    slot: 'bed',
    name: '纸箱床',
    tex: 'furn-bed',
    comfort: 3,
    price: 0,
    need: { cardboard: 4, rag: 1 },
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
    blurb: '从旧货摊搬来的木箱'
  },
  {
    id: 'fireplace',
    slot: 'fireplace',
    name: '铁桶壁炉',
    tex: 'furn-fire',
    comfort: 4,
    price: 90,
    need: null,
    blurb: '钻了孔的油桶，烧炭取暖'
  },
  {
    id: 'rug',
    slot: 'rug',
    name: '旧地毯',
    tex: 'furn-rug',
    comfort: 2,
    price: 0,
    need: { newspaper: 3, cardboard: 2 },
    blurb: '把废纸压平了铺在地上'
  }
];

// Once the nook is this comfortable, a small scene plays in the panel.
export const HOME_SCENE_COMFORT = 8;
