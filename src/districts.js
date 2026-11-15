// The districts of the city, and what each one is made of. The city is a 3×3
// grid of blocks (see streets.js): each district fills one block, and the blocks
// that touch share their streets, so the whole thing is walkable at any angle.

export const DISTRICT_ORDER = ['market', 'square', 'alley', 'park', 'camp', 'slum', 'commerce'];

// The city map marks home, the tent out at the edge of town.
export const QUEST_TARGET = { district: 'camp', x: 320, y: 520, label: '你的帐篷' };

export const DISTRICTS = {
  market: {
    id: 'market',
    name: '市场街',
    icon: 'store',
    blurb: '吃的、废品和当铺都在这条街上',
    mapPos: { x: 0.76, y: 0.217 },
    mapColour: 0x5a4432,
    tint: 0x000000,
    tintAlpha: 0,
    shops: true,
    unlockAfter: null,
    cops: 1,
    pedKinds: ['suit', 'lady', 'drunk'],
    pedMs: 1700,
    junk: ['cardboard', 'bottle', 'veg'],
    bins: [
      { x: 134, y: 214 },
      { x: 148, y: 706 },
      { x: 254, y: 452 },
      { x: 238, y: 1128 },
      { x: 384, y: 236 },
      { x: 398, y: 862 },
      { x: 512, y: 640 },
      { x: 502, y: 1272 }
    ],
    litter: [
      { x: 176, y: 344, kind: 'cardboard' },
      { x: 236, y: 546, kind: 'bottle' },
      { x: 142, y: 806, kind: 'veg' },
      { x: 208, y: 968, kind: 'cardboard' },
      { x: 258, y: 1308, kind: 'bottle' },
      { x: 404, y: 186, kind: 'veg' },
      { x: 486, y: 486, kind: 'bottle' },
      { x: 430, y: 560, kind: 'cardboard' },
      { x: 416, y: 730, kind: 'veg' },
      { x: 470, y: 1104, kind: 'cardboard' },
      { x: 396, y: 1338, kind: 'bottle' }
    ],
    mats: [
      { x: 156, y: 1058 },
      { x: 490, y: 928 }
    ],
    vending: [{ x: 512, y: 530 }],
    slots: [],
    benches: [],
    landmarks: []
  },

  square: {
    id: 'square',
    name: '火车站广场',
    icon: 'train-front',
    blurb: '人多、钱多，眼睛也多',
    mapPos: { x: 0.24, y: 0.353 },
    mapColour: 0x46586f,
    tint: 0x1f3350,
    tintAlpha: 0.18,
    shops: false,
    unlockAfter: null,
    cops: 2,
    pedKinds: ['suit', 'lady'],
    pedMs: 1250,
    junk: ['can', 'flyer', 'snack'],
    bins: [
      { x: 140, y: 300 },
      { x: 400, y: 560 },
      { x: 505, y: 980 }
    ],
    litter: [
      { x: 190, y: 240, kind: 'can' },
      { x: 250, y: 420, kind: 'flyer' },
      { x: 430, y: 320, kind: 'can' },
      { x: 470, y: 700, kind: 'snack' },
      { x: 180, y: 900, kind: 'flyer' },
      { x: 420, y: 1080, kind: 'can' },
      { x: 250, y: 1220, kind: 'snack' }
    ],
    mats: [
      { x: 160, y: 760 },
      { x: 495, y: 430 }
    ],
    vending: [{ x: 510, y: 380 }],
    slots: [],
    benches: [],
    landmarks: [{ tex: 'stationclock', x: 150, y: 262 }]
  },

  alley: {
    id: 'alley',
    name: '后巷',
    icon: 'trash-2',
    blurb: '垃圾桶最多，人影最少',
    mapPos: { x: 0.76, y: 0.49 },
    mapColour: 0x3d4a3a,
    tint: 0x1c2a22,
    tintAlpha: 0.32,
    shops: false,
    unlockAfter: 'square',
    cops: 0,
    pedKinds: ['drunk'],
    pedMs: 2500,
    junk: ['wire', 'cloth', 'wine'],
    bins: [
      { x: 132, y: 180 },
      { x: 150, y: 380 },
      { x: 136, y: 600 },
      { x: 152, y: 820 },
      { x: 140, y: 1040 },
      { x: 148, y: 1260 },
      { x: 392, y: 240 },
      { x: 404, y: 470 },
      { x: 396, y: 700 },
      { x: 500, y: 1140 }
    ],
    litter: [
      { x: 190, y: 260, kind: 'wire' },
      { x: 230, y: 430, kind: 'cloth' },
      { x: 170, y: 560, kind: 'wine' },
      { x: 240, y: 660, kind: 'wire' },
      { x: 160, y: 900, kind: 'cloth' },
      { x: 210, y: 1000, kind: 'wine' },
      { x: 250, y: 1140, kind: 'wire' },
      { x: 420, y: 320, kind: 'cloth' },
      { x: 460, y: 520, kind: 'wine' },
      { x: 440, y: 760, kind: 'wire' },
      { x: 400, y: 1060, kind: 'cloth' },
      { x: 480, y: 1300, kind: 'wine' }
    ],
    mats: [
      { x: 168, y: 640 },
      { x: 486, y: 860 }
    ],
    vending: [],
    slots: [{ x: 490, y: 980 }],
    benches: [],
    landmarks: [{ tex: 'bridge', x: 0, y: 250, ox: 0, oy: 0, depth: -22 }]
  },

  park: {
    id: 'park',
    name: '小公园',
    icon: 'trees',
    blurb: '树底下安静，能讨到几个安生钱',
    mapPos: { x: 0.76, y: 0.763 },
    mapColour: 0x3f5a3c,
    tint: 0x1e3a22,
    tintAlpha: 0.24,
    shops: false,
    unlockAfter: 'alley',
    cops: 1,
    pedKinds: ['lady', 'suit'],
    pedMs: 1900,
    junk: ['newspaper', 'water'],
    bins: [
      { x: 150, y: 520 },
      { x: 488, y: 880 }
    ],
    litter: [
      { x: 180, y: 320, kind: 'newspaper' },
      { x: 250, y: 480, kind: 'water' },
      { x: 160, y: 900, kind: 'newspaper' },
      { x: 430, y: 260, kind: 'water' },
      { x: 460, y: 760, kind: 'newspaper' },
      { x: 400, y: 1080, kind: 'newspaper' }
    ],
    mats: [
      { x: 200, y: 700 },
      { x: 470, y: 1180 }
    ],
    vending: [{ x: 508, y: 430 }],
    slots: [],
    benches: [
      { x: 330, y: 620 },
      { x: 300, y: 980 },
      { x: 160, y: 1250 }
    ],
    landmarks: [
      { tex: 'tree', x: 132, y: 300 },
      { tex: 'tree', x: 136, y: 760 },
      { tex: 'tree', x: 130, y: 1160 },
      { tex: 'tree', x: 508, y: 240 },
      { tex: 'tree', x: 512, y: 680 },
      { tex: 'tree', x: 506, y: 1100 },
      { tex: 'tree', x: 250, y: 520 },
      { tex: 'tree', x: 420, y: 900 }
    ]
  },

  camp: {
    id: 'camp',
    name: '城郊营地',
    icon: 'tent',
    blurb: '城边的一小片荒地，你的帐篷扎在这儿',
    mapPos: { x: 0.24, y: 0.08 },
    mapColour: 0x4a4436,
    tint: 0x3a2f1f,
    tintAlpha: 0.22,
    shops: false,
    unlockAfter: null,
    cops: 0,
    pedKinds: ['drunk'],
    pedMs: 3200,
    junk: ['stick', 'brick'],
    bins: [
      { x: 140, y: 300 },
      { x: 400, y: 900 }
    ],
    litter: [
      { x: 200, y: 500, kind: 'stick' },
      { x: 460, y: 700, kind: 'brick' },
      { x: 250, y: 1100, kind: 'stick' }
    ],
    mats: [{ x: 150, y: 800 }],
    vending: [],
    slots: [],
    benches: [],
    landmarks: [
      { tex: 'tree', x: 120, y: 380 },
      { tex: 'tree', x: 520, y: 520 },
      { tex: 'tree', x: 130, y: 1180 },
      { tex: 'tree', x: 510, y: 1000 }
    ]
  },

  slum: {
    id: 'slum',
    name: '黑街',
    icon: 'factory',
    blurb: '贫民窟，黑市在这条街上，帮派的人也在这儿',
    mapPos: { x: 0.24, y: 0.627 },
    mapColour: 0x4a3a34,
    tint: 0x2a1410,
    tintAlpha: 0.4,
    shops: false,
    unlockAfter: 'alley',
    cops: 1,
    gangs: 3,
    watch: 0.8,
    stealZone: 0.95,
    stealSpeed: 1,
    begBoost: 0.6,
    pedKinds: ['drunk'],
    pedMs: 2400,
    junk: ['pipe', 'battery'],
    bins: [
      { x: 134, y: 200 },
      { x: 148, y: 420 },
      { x: 138, y: 660 },
      { x: 152, y: 900 },
      { x: 142, y: 1140 },
      { x: 150, y: 1320 },
      { x: 394, y: 280 },
      { x: 408, y: 540 },
      { x: 398, y: 800 },
      { x: 502, y: 1180 }
    ],
    litter: [
      { x: 186, y: 300, kind: 'pipe' },
      { x: 236, y: 500, kind: 'battery' },
      { x: 166, y: 700, kind: 'pipe' },
      { x: 244, y: 880, kind: 'battery' },
      { x: 172, y: 1060, kind: 'pipe' },
      { x: 214, y: 1240, kind: 'battery' },
      { x: 424, y: 360, kind: 'battery' },
      { x: 462, y: 620, kind: 'pipe' },
      { x: 436, y: 980, kind: 'battery' },
      { x: 478, y: 1300, kind: 'pipe' }
    ],
    mats: [
      { x: 158, y: 620 },
      { x: 472, y: 1120 }
    ],
    vending: [],
    slots: [],
    benches: [],
    landmarks: []
  },

  commerce: {
    id: 'commerce',
    name: '商业区',
    icon: 'building-2',
    blurb: '橱窗和人流，钱多的地方眼睛也多',
    mapPos: { x: 0.24, y: 0.9 },
    mapColour: 0x4a5a72,
    tint: 0x2a3550,
    tintAlpha: 0.14,
    shops: false,
    unlockAfter: 'square',
    cops: 4,
    gangs: 0,
    watch: 1.7,
    stealZone: 0.62,
    stealSpeed: 1.3,
    begBoost: 2.2,
    pedKinds: ['rich', 'rich', 'suit', 'lady'],
    pedMs: 950,
    junk: ['receipt', 'cup'],
    bins: [
      { x: 142, y: 340 },
      { x: 506, y: 1020 }
    ],
    litter: [
      { x: 200, y: 420, kind: 'receipt' },
      { x: 430, y: 640, kind: 'cup' },
      { x: 232, y: 980, kind: 'receipt' },
      { x: 468, y: 1200, kind: 'cup' }
    ],
    mats: [{ x: 452, y: 620 }],
    vending: [
      { x: 512, y: 420 },
      { x: 132, y: 1080 }
    ],
    slots: [],
    benches: [{ x: 300, y: 800 }],
    landmarks: []
  }
};

export const START_DISTRICT = 'market';
export const STARTING_UNLOCKED = ['market', 'square', 'camp'];
