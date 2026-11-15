// The characters and props of the street: the beggar, five passers-by, the
// bins and the small things lying around. Each is a pixel matrix painted at 2x
// so one matrix pixel is a 2x2 block in the world.

import { pixelTexture } from './pixel.js';
import {
  PAL_PLAYER,
  PAL_SUIT,
  PAL_LADY,
  PAL_DRUNK,
  PAL_RICH,
  PAL_GANG,
  PAL_OLD,
  PAL_VEG,
  PAL_SNACK,
  PAL_WIRE,
  PAL_STICK,
  PAL_BRICK,
  PAL_BATTERY,
  PAL_CUP,
  PAL_FLYER,
  PAL_RECEIPT,
  PAL_CLOTH,
  PAL_WINE,
  PAL_WATER,
  PAL_PIPE,
  PAL_WALLET,
  PAL_PHONE,
  PAL_CIGS,
  PAL_SNACKBAR,
  PAL_GLOVE,
  PAL_BLADE,
  PAL_BOOZE,
  PAL_PERFUME,
  PAL_BIN,
  PAL_CAN,
  PAL_BOTTLE,
  PAL_CARD,
  PAL_NEWS,
  PAL_COIN,
  PAL_BOWL,
  PAL_PATROL,
  PAL_TOOL,
  PAL_GUARD,
  PAL_BATON,
  PAL_CRAFT,
  PAL_PLAYER_SHIRT,
  PAL_PLAYER_SUIT,
  PAL_PLAYER_COAT,
  PAL_ITEM_SHIRT,
  PAL_ITEM_SUIT,
  PAL_ITEM_COAT,
  PAL_ITEM_DRUG,
  PAL_ITEM_BLUEPRINT
} from './palette.js';

const PLAYER_IDLE = [
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...kHHHHHHHHk...',
  '...kkkkkkkkkk...',
  '....kssssssk....',
  '....kssksksk....',
  '....ksbbbbsk....',
  '..kkcccccckk....',
  '..kccccccccck...',
  '..kccccccccck...',
  '..kccdccccdck...',
  '..kccdccccdck...',
  '..kscdcccccks...',
  '..kccccccccck...',
  '..kccccccccck...',
  '..kdddddddddk...',
  '...kccccccck....',
  '...kccccccck....',
  '...kppkkpppk....',
  '...kppkkpppk....',
  '...kbbkkbbbk....',
  '...kkkkkkkkk....'
];

// Sitting on the cardboard, bowl in front. Padded at the top so the figure
// still stands on the same line as the walking sprite.
const PLAYER_SIT = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...kHHHHHHHHk...',
  '...kkkkkkkkkk...',
  '....kssssssk....',
  '....kssksksk....',
  '....ksbbbbsk....',
  '..kkcccccckk....',
  '..kccccccccck...',
  '..kccccccccck...',
  '..kscdcccccks...',
  '..kdddddddddk...',
  '..kpppkkkpppk...',
  '..kpppkkkpppk...',
  '..kbbbbbbbbbk...',
  '..kkkkkkkkkkk...',
  '................'
];

const PLAYER_DOWN = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....kkkkk......',
  '....khhhhhk.....',
  '....kssssk......',
  '..kkcccccckk....',
  '.kcccccccccccck.',
  '.kddddddddddddk.',
  '..kppppppkpppk..',
  '..kbbbbbbkbbbk..',
  '...kkkkkkkkkk...',
  '................'
];

const PED = [
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '....khhhhhhk....',
  '....kssssssk....',
  '....kssksksk....',
  '....kSssssSk....',
  '....kSssssSk....',
  '.....ksssk......',
  '...kkcccckk.....',
  '..kccccccccck...',
  '..kccccccccck...',
  '..kscccccccck...',
  '..kscccccccks...',
  '..kccccccccck...',
  '...kccccccck....',
  '...kccccccck....',
  '...kdddddddk....',
  '....kpppppk.....',
  '....kppppppk....',
  '....kppppk......',
  '....kppkppk.....',
  '....kBBkBBk.....',
  '....kkkkkkk.....'
];

// A hooded figure with a bandana across the face: the gang of the black street.
const GANG = [
  '................',
  '.....kkkkkk.....',
  '....kggggggk....',
  '....kggggggk....',
  '....kssssssk....',
  '....kssksksk....',
  '....kSssssSk....',
  '....krrrrrrk....',
  '.....ksssk......',
  '...kkcccckk.....',
  '..kccccccckk....',
  '..kccccccck.....',
  '..kscccccccck...',
  '..kscccccccks...',
  '..kccccccccck...',
  '...kccccccck....',
  '...kccccccck....',
  '...kdddddddk....',
  '....kpppppk.....',
  '....kppppppk....',
  '....kppppk......',
  '....kppkppk.....',
  '....kBBkBBk.....',
  '....kkkkkkk.....'
];

const BIN = [
  '..................',
  '.....kkkkkkkk.....',
  '....kmmmmmmmmk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '....kGgggggggk....',
  '....kGgggggggk....',
  '....kggggggggk....',
  '....kgggkkgggk....',
  '....kgggkkgggk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '....kggggggggk....',
  '...kkggggggggkk...',
  '...kwkggggggkwk...',
  '...kwwkkkkkkwwk...',
  '....kkkkkkkkkk....'
];

const CAN = [
  '..kkkk..',
  '.kmmmmk.',
  '.kMMMMk.',
  '.kmmmmk.',
  '.krrrrk.',
  '.krrrrk.',
  '.kmmmmk.',
  '.kmmmmk.',
  '.kmmmmk.',
  '..kkkk..'
];

const BOTTLE = [
  '..kkkk..',
  '..kCCk..',
  '..kggk..',
  '..kggk..',
  '.kggGgk.',
  '.kggggk.',
  '.kllllk.',
  '.kllllk.',
  '.kggggk.',
  '.kgGggk.',
  '.kggggk.',
  '.kkkkkk.'
];

const CARD = [
  'kkkkkkkkkkkk',
  'kbbbbbbbbbbk',
  'kBbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kbbbbkkbbbbk',
  'kbbbbbbbbbbk',
  'kBBbbbbbbBBk',
  'kkkkkkkkkkkk'
];

const NEWS = [
  '.kkkkkkkk.',
  '.kwwwwwwk.',
  '.kwllllwk.',
  '.kwwwwwwk.',
  '.kwllllwk.',
  '.kwwwwwwk.',
  '.kwllllwk.',
  '.kwWwwWwk.',
  '.kwwwwwwk.',
  '.kkkkkkkk.'
];

// The junk that only turns up in one stretch of the street.
const VEG = [
  '............',
  '...kkkk.....',
  '..kggggk....',
  '.kggGGggk...',
  '.kgGGGGgk...',
  'kggGGGGggk..',
  'kgggGGgggk..',
  '.kgggggggk..',
  '..kgggggk...',
  '...kkkkk....',
  '............'
];

const SNACK = [
  '............',
  '..kkkkkkkk..',
  '.kwwwwwwwwk.',
  '.kwccccccwk.',
  '.kwcwwwwcwk.',
  '.kwcwwwwcwk.',
  '.kwcwwwwcwk.',
  '.kwccccccwk.',
  '.kwwwwwwwwk.',
  '..kkkkkkkk..',
  '............'
];

const WIRE = [
  '............',
  '..kkkkkkkk..',
  '.kcccccccck.',
  '.kCkkkkkkCk.',
  '.kcCCCCCCck.',
  '.kcccccccck.',
  '..kCCCCCCk..',
  '...kkkkkk...',
  '............'
];

const STICK = [
  '............',
  '..........kk',
  '.........kbk',
  '........kbk.',
  '.......kbk..',
  '......kbk...',
  '.....kbk....',
  '....kbk.....',
  '...kbk......',
  '..kbbk......',
  '...kk.......',
  '............'
];

const BRICK = [
  '............',
  '..rrrrrrrr..',
  '.rRRRRRRRRr.',
  '.rRrrrrrrRr.',
  '.rRrrrrrrRr.',
  '.rRRRRRRRRr.',
  '.rrrrrrrrrr.',
  '..kkkkkkkk..',
  '............'
];

const BATTERY = [
  '..........',
  '..kkkkkk..',
  '..kMMMMk..',
  '..kMmmMk..',
  '..kMmmMk..',
  '..kMyMyk..',
  '..kMmmMk..',
  '..kMMMMk..',
  '..kkkkkk..',
  '..........'
];

const CUP = [
  '............',
  '..kkkkkkkk..',
  '..kwwwwwwk..',
  '.kwwwwwwwwk.',
  '.kwwcwwcwwk.',
  '.kwwwwwwwwk.',
  '..kWWWWWWk..',
  '..kWWWWWWk..',
  '...kWWWWk...',
  '....kkkk....',
  '............'
];

// What turns up in a pocket rather than in the rubbish.
const WALLET = [
  '............',
  '.kkkkkkkkkk.',
  '.kbbbbbbbbk.',
  '.kbbbbbbBkk.',
  '.kbbbbbkkBk.',
  '.kbBBbBbbbk.',
  '.kbbbbbbbbk.',
  '.kkkkkkkkkk.',
  '............'
];

const PHONE = [
  '..........',
  '..kkkkkk..',
  '..kMMMMk..',
  '..kMCCMk..',
  '..kMCCMk..',
  '..kMCCMk..',
  '..kMMMMk..',
  '..kMmmMk..',
  '..kMMMMk..',
  '..kkkkkk..',
  '..........'
];

const CIGS = [
  '............',
  '.kkkkkkkkkk.',
  '.kwwwwwwwwk.',
  '.kwwwwwwwwk.',
  '.krrrrrrrrk.',
  '.kwwwwwwwwk.',
  '.kwwwwwwwwk.',
  '.kkkkkkkkkk.',
  '............'
];

const SNACKBAR = [
  '............',
  '..kkkkkkkk..',
  '.kwWWWWWWwk.',
  '.kwWccccWwk.',
  '.kwWccccWwk.',
  '.kwWWWWWWwk.',
  '..kkkkkkkk..',
  '............'
];

// A hand that has been doing this a while.
const GLOVE = [
  '............',
  '..kkkkkkkk..',
  '.kddddddddk.',
  '.kddddddddk.',
  '.kddddddddk.',
  '.kkkkkkkkkk.',
  '..kdkkkkdk..',
  '..kdk..kdk..',
  '..kkk..kkk..',
  '............'
];

const BLADE = [
  '............',
  '..kkkkkkkk..',
  '.kMMMMMMMMk.',
  '.kMmmmmmmMk.',
  '.kMMMMMMMMk.',
  '..kkkkkkkk..',
  '............',
  '............'
];

const COIN = [
  '..kkkk..',
  '.kyYYyk.',
  'kyYyyYyk',
  'kyyyyyyk',
  'kyyyyyyk',
  'kyYyyYyk',
  '.kyYYyk.',
  '..kkkk..'
];

const BOWL = [
  '..............',
  '.kkkkkkkkkkkk.',
  '.kwwwwwwwwwwk.',
  '.kWwwwwwwwwWk.',
  '..kWWWWWWWWk..',
  '...kkkkkkkk...',
  '..............',
  '..............'
];

const LOCKPICK = [
  '............',
  '....kkkk....',
  '...kmmmmk...',
  '...kmkkmk...',
  '....kmkk....',
  '....kmk.....',
  '...kmk......',
  '..kmk.......',
  '..kmk.......',
  '...kk.......',
  '............',
  '............'
];

const COAT = [
  '..............',
  '...kkkkkkkk...',
  '..kcccccccck..',
  '.kcccdddcccck.',
  '.kcccdddcccck.',
  'kccddddddddcck',
  'kccddddddddcck',
  '.kkddddddddkk.',
  '...kkkkkkkk...',
  '...kggggggk...',
  '...kkkkkkkk...',
  '..............'
];

// The patrol guard: peaked cap with a band, a bright badge on the shoulder,
// and boots. The baton is a separate sprite so it can be held at an angle.
const GUARD = [
  '................',
  '....kkkkkkkk....',
  '...kHHHHHHHHk...',
  '...khhhhhhhhk...',
  '..kkkkkkkkkkkk..',
  '....kssssssk....',
  '....kssksksk....',
  '....kSssssSk....',
  '.....ksssk......',
  '...kkccyycckk...',
  '..kccccccccck...',
  '..kccccccccck...',
  '..kccdccccdck...',
  '..kccdccccdck...',
  '..ksccccccccks..',
  '..kccccccccck...',
  '..kccccccccck...',
  '..kdddddddddk...',
  '...kccccccck....',
  '...kpppppppk....',
  '...kppkkpppk....',
  '...kppkkpppk....',
  '...kBBkkBBBk....',
  '...kkkkkkkkk....'
];

const BATON = [
  'kkkk',
  'kwwk',
  'kWwk',
  'kwwk',
  'kwwk',
  'kwwk',
  'kwwk',
  'kwwk',
  'kwwk',
  'kwwk',
  'kwwk',
  'kwwk',
  'kggk',
  'kkkk'
];

const SCRAP = [
  '............',
  '..kkkkkkkk..',
  '.kmMMMMMmmk.',
  '.kmmMMmmmMk.',
  '.kmmmkkmmmk.',
  '.krmmmmkmmk.',
  '.krrkkkmmmk.',
  '.krrrrrkkrk.',
  '..kkkkkkkk..',
  '............'
];

const ROPE = [
  '..........',
  '..kkkkkk..',
  '.kwWwWwWk.',
  '.kWwWwWwk.',
  '.kwWwWwWk.',
  '.kWwWwWwk.',
  '.kwWwWwWk.',
  '.kWwWwWwk.',
  '.kwWwWwWk.',
  '..kkkkkk..',
  '..........',
  '..........'
];

const RAG = [
  '............',
  '..kkkkkkkk..',
  '.kwWWWWWWwk.',
  '.kwwWWWWwwk.',
  '.kwwwWwwwwk.',
  '.kwWWWWWWwk.',
  '.kwwwkkwwwk.',
  '..kwwwwwwk..',
  '...kkkkkk...',
  '............'
];

const KNIFE = [
  '................',
  '.kkkkkkkkkk.....',
  '.kMMMMMMMmmkkk..',
  '.kmmmmmmmmmkkkk.',
  '.kkkkkkkkkkkkkk.',
  '................',
  '................',
  '................'
];

const CROWBAR = [
  '..kk..',
  '.kMMk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMmk.',
  '.kMMk.',
  'kmmk..',
  'kkk...'
];

// A folded garment, used for every tier of clothing with its own palette.
const FOLD = [
  '............',
  '..kkkkkkkk..',
  '.kcccccccck.',
  '.kcccccccck.',
  '..kddddddk..',
  '..kcccccck..',
  '..kcccccck..',
  '...kkkkkk...',
  '............',
  '............'
];

const VIAL = [
  '..kkkk..',
  '..kMMk..',
  '..kCCk..',
  '.kCCCCk.',
  '.kCCCCk.',
  '.kCCCCk.',
  '.kCCCCk.',
  '.kCCCCk.',
  '.kCCCCk.',
  '..kCCk..',
  '..kkkk..',
  '........'
];

const SHEET = [
  '............',
  '..kkkkkkkk..',
  '.kMMMMMMMMk.',
  '.kMkkkkkkMk.',
  '.kMMMMMMMMk.',
  '.kMkkkkkkMk.',
  '.kMMMMMMMMk.',
  '.kMkkkkkkMk.',
  '..kMMMMMMk..',
  '..kkkkkkkk..'
];

export function buildSpriteArt(scene) {
  pixelTexture(scene, 'beggar-idle', PLAYER_IDLE, PAL_PLAYER);
  pixelTexture(scene, 'beggar-sit', PLAYER_SIT, PAL_PLAYER);
  pixelTexture(scene, 'beggar-down', PLAYER_DOWN, PAL_PLAYER);

  pixelTexture(scene, 'ped-suit', PED, PAL_SUIT);
  pixelTexture(scene, 'ped-lady', PED, PAL_LADY);
  pixelTexture(scene, 'ped-drunk', PED, PAL_DRUNK);
  pixelTexture(scene, 'ped-rich', PED, PAL_RICH);
  pixelTexture(scene, 'ped-gang', GANG, PAL_GANG);
  pixelTexture(scene, 'ped-patrol', PED, PAL_PATROL);
  pixelTexture(scene, 'guard', GUARD, PAL_GUARD);
  pixelTexture(scene, 'oldzhou', PED, PAL_OLD);
  pixelTexture(scene, 'baton', BATON, PAL_BATON);

  pixelTexture(scene, 'item-scrap', SCRAP, PAL_CRAFT);
  pixelTexture(scene, 'item-rope', ROPE, PAL_CRAFT);
  pixelTexture(scene, 'item-rag', RAG, PAL_CRAFT);
  pixelTexture(scene, 'item-knife', KNIFE, PAL_CRAFT);
  pixelTexture(scene, 'item-crowbar', CROWBAR, PAL_CRAFT);

  // The player in each set of clothes: same figure, cleaner palette.
  const outfits = [
    ['shirt', PAL_PLAYER_SHIRT],
    ['suit', PAL_PLAYER_SUIT],
    ['coat', PAL_PLAYER_COAT]
  ];

  for (const [id, palette] of outfits) {
    pixelTexture(scene, `beggar-idle-${id}`, PLAYER_IDLE, palette);
    pixelTexture(scene, `beggar-sit-${id}`, PLAYER_SIT, palette);
    pixelTexture(scene, `beggar-down-${id}`, PLAYER_DOWN, palette);
  }

  pixelTexture(scene, 'item-shirt', FOLD, PAL_ITEM_SHIRT);
  pixelTexture(scene, 'item-suitwear', FOLD, PAL_ITEM_SUIT);
  pixelTexture(scene, 'item-overcoat', FOLD, PAL_ITEM_COAT);
  pixelTexture(scene, 'item-drug', VIAL, PAL_ITEM_DRUG);
  pixelTexture(scene, 'item-blueprint', SHEET, PAL_ITEM_BLUEPRINT);

  pixelTexture(scene, 'item-lockpick', LOCKPICK, PAL_TOOL);
  pixelTexture(scene, 'item-coat', COAT, PAL_TOOL);

  pixelTexture(scene, 'bin', BIN, PAL_BIN);

  pixelTexture(scene, 'item-can', CAN, PAL_CAN);
  pixelTexture(scene, 'item-bottle', BOTTLE, PAL_BOTTLE);
  pixelTexture(scene, 'item-card', CARD, PAL_CARD);
  pixelTexture(scene, 'item-news', NEWS, PAL_NEWS);

  // One junk texture per district's litter.
  pixelTexture(scene, 'item-veg', VEG, PAL_VEG);
  pixelTexture(scene, 'item-flyer', NEWS, PAL_FLYER);
  pixelTexture(scene, 'item-snack', SNACK, PAL_SNACK);
  pixelTexture(scene, 'item-wire', WIRE, PAL_WIRE);
  pixelTexture(scene, 'item-cloth', RAG, PAL_CLOTH);
  pixelTexture(scene, 'item-wine', BOTTLE, PAL_WINE);
  pixelTexture(scene, 'item-water', BOTTLE, PAL_WATER);
  pixelTexture(scene, 'item-stick', STICK, PAL_STICK);
  pixelTexture(scene, 'item-brick', BRICK, PAL_BRICK);
  pixelTexture(scene, 'item-pipe', CROWBAR, PAL_PIPE);
  pixelTexture(scene, 'item-battery', BATTERY, PAL_BATTERY);
  pixelTexture(scene, 'item-receipt', NEWS, PAL_RECEIPT);
  pixelTexture(scene, 'item-cup', CUP, PAL_CUP);

  // Picked pockets.
  pixelTexture(scene, 'item-wallet', WALLET, PAL_WALLET);
  pixelTexture(scene, 'item-phone', PHONE, PAL_PHONE);
  pixelTexture(scene, 'item-cigarettes', CIGS, PAL_CIGS);
  pixelTexture(scene, 'item-snackbar', SNACKBAR, PAL_SNACKBAR);

  // The black market's kit for a steadier hand.
  pixelTexture(scene, 'item-glove', GLOVE, PAL_GLOVE);
  pixelTexture(scene, 'item-blade', BLADE, PAL_BLADE);
  pixelTexture(scene, 'item-booze', BOTTLE, PAL_BOOZE);
  pixelTexture(scene, 'item-perfume', VIAL, PAL_PERFUME);

  pixelTexture(scene, 'coin', COIN, PAL_COIN);
  pixelTexture(scene, 'bowl', BOWL, PAL_BOWL);
}
