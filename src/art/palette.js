// Palettes for the pixel sprites. One entry per character used in a matrix;
// anything the matrix writes that the palette does not define is left clear.

const SKIN = '#d9a67a';
const SKIN_SHADOW = '#b9805a';

export const PAL_PLAYER = {
  k: '#171310',
  h: '#8f3f34',
  H: '#b2503f',
  s: SKIN,
  S: SKIN_SHADOW,
  w: '#ece0cc',
  b: '#4f3d29',
  c: '#6b5236',
  d: '#4c3a26',
  p: '#3a3630',
  B: '#211e1a'
};

export const PAL_SUIT = {
  k: '#171310',
  h: '#2a2118',
  s: SKIN,
  S: SKIN_SHADOW,
  c: '#3d4a63',
  d: '#2a3346',
  p: '#2c2d33',
  B: '#14161a'
};

export const PAL_LADY = {
  k: '#171310',
  h: '#cfc7bb',
  s: '#e2b891',
  S: '#bd9068',
  c: '#7b5b86',
  d: '#5b4366',
  p: '#4b4551',
  B: '#241f26'
};

export const PAL_DRUNK = {
  k: '#171310',
  h: '#6b5535',
  s: '#cf9a72',
  S: '#a8724f',
  c: '#6f7a3f',
  d: '#525c2e',
  p: '#454339',
  B: '#1d1c19'
};

// Old Zhou, who waits by the tent: white hair, a faded coat that has seen a
// dozen winters, and boots worn through at the toe.
export const PAL_OLD = {
  k: '#171310',
  h: '#d5d0c4',
  s: '#c9a382',
  S: '#a87f5e',
  c: '#6a5a3e',
  d: '#4e4230',
  p: '#3b3830',
  B: '#1b1814'
};

// The moneyed crowd of the commercial district: a camel overcoat and shoes
// that have never touched a puddle.
export const PAL_RICH = {
  k: '#171310',
  h: '#2e2620',
  s: SKIN,
  S: SKIN_SHADOW,
  c: '#7a6440',
  d: '#5a4a30',
  p: '#26262c',
  B: '#121214'
};

// A student with a backpack and a bright hoodie; a kid in a school jacket and
// shorts; an old woman in a faded cardigan; and a street sweeper in a hi-vis
// vest. Same figure, different people.
export const PAL_STUDENT = {
  k: '#171310',
  h: '#2a2118',
  s: SKIN,
  S: SKIN_SHADOW,
  c: '#4d7a8a',
  d: '#365a67',
  p: '#2d3a44',
  B: '#1a2630'
};

export const PAL_KID = {
  k: '#171310',
  h: '#1f1a16',
  s: '#e8bd97',
  S: '#c2946c',
  c: '#c86a4e',
  d: '#9a4c36',
  p: '#3a4a6a',
  B: '#241a16'
};

export const PAL_OLDLADY = {
  k: '#171310',
  h: '#d8d2c6',
  s: '#dcb693',
  S: '#bb9169',
  c: '#7d6f5e',
  d: '#5f5446',
  p: '#4a443c',
  B: '#221f1a'
};

export const PAL_WORKER = {
  k: '#171310',
  h: '#3a2f22',
  s: '#cf9a72',
  S: '#a8724f',
  c: '#d08a2a',
  d: '#a86a1c',
  p: '#3c4038',
  B: '#1c1a16'
};

// The gang members of the black street: a dark hood and a red bandana.
export const PAL_GANG = {
  k: '#141110',
  g: '#232028',
  r: '#b03a2e',
  s: '#c08f68',
  S: '#966a4a',
  c: '#35363c',
  d: '#26272c',
  p: '#2f2b28',
  B: '#131211'
};

export const PAL_BIN = {
  k: '#171310',
  g: '#3f5b46',
  G: '#54785a',
  m: '#8f8f8c',
  w: '#2a2a28'
};

export const PAL_CAN = {
  k: '#171310',
  m: '#b9bec4',
  M: '#e2e6ea',
  r: '#b8442f'
};

export const PAL_BOTTLE = {
  k: '#171310',
  g: '#4f7a55',
  G: '#7aa97e',
  C: '#c9c2b0',
  l: '#e8e0cd'
};

export const PAL_CARD = {
  k: '#171310',
  b: '#a07c4f',
  B: '#c19a68'
};

export const PAL_NEWS = {
  k: '#171310',
  w: '#d8d2c2',
  W: '#b3ac9c',
  l: '#6b6459'
};

export const PAL_COIN = {
  k: '#171310',
  y: '#d9a83c',
  Y: '#f2d27a'
};

export const PAL_BOWL = {
  k: '#171310',
  w: '#cfc6b2',
  W: '#8f8877'
};

export const PAL_PATROL = {
  k: '#141210',
  h: '#1a2233',
  s: SKIN,
  S: SKIN_SHADOW,
  c: '#2c3d5c',
  d: '#1f2c44',
  p: '#232a36',
  B: '#101214'
};

export const PAL_TOOL = {
  k: '#141210',
  m: '#b8bcc2',
  M: '#e8ecf0',
  g: '#8a6a44',
  c: '#6a5236',
  d: '#4c3a26'
};

export const PAL_GUARD = {
  k: '#0f1116',
  h: '#1b2b4a',
  H: '#2c4470',
  s: SKIN,
  S: SKIN_SHADOW,
  y: '#e0b040',
  c: '#2c3d5c',
  d: '#1f2c44',
  p: '#232a36',
  B: '#101214'
};

export const PAL_BATON = {
  k: '#141210',
  w: '#5a4632',
  W: '#7a6047',
  g: '#3a2f24'
};

export const PAL_CRAFT = {
  k: '#141210',
  m: '#8a8f96',
  M: '#c6ccd4',
  r: '#9a5a3f',
  c: '#6a5236',
  d: '#4c3a26',
  w: '#cdc3ac',
  W: '#a89a80'
};

// The player in nicer clothes: same figure, cleaner palette.
export const PAL_PLAYER_SHIRT = {
  k: '#171310',
  h: '#4a3a2a',
  H: '#6a5236',
  s: SKIN,
  S: SKIN_SHADOW,
  w: '#ece0cc',
  b: '#4f3d29',
  c: '#7fa7c9',
  d: '#5a7f9e',
  p: '#3b4a5a',
  B: '#2a2620'
};

export const PAL_PLAYER_SUIT = {
  k: '#171310',
  h: '#2a2118',
  H: '#3a2c1f',
  s: SKIN,
  S: SKIN_SHADOW,
  w: '#ece0cc',
  b: '#4f3d29',
  c: '#2f3a4a',
  d: '#222a36',
  p: '#26303c',
  B: '#141414'
};

export const PAL_PLAYER_COAT = {
  k: '#171310',
  h: '#5a3a2a',
  H: '#7a4a32',
  s: SKIN,
  S: SKIN_SHADOW,
  w: '#ece0cc',
  b: '#4f3d29',
  c: '#8a5a3f',
  d: '#6a4230',
  p: '#3a332c',
  B: '#1e1a16'
};

export const PAL_ITEM_SHIRT = { k: '#141210', c: '#8fb4d4', d: '#5f7fa0' };
export const PAL_ITEM_SUIT = { k: '#141210', c: '#3a4658', d: '#26303c' };
export const PAL_ITEM_COAT = { k: '#141210', c: '#8a5a3f', d: '#6a4230' };
export const PAL_ITEM_DRUG = { k: '#141210', M: '#d8e6ea', C: '#9a7fd0' };
export const PAL_ITEM_BLUEPRINT = { k: '#141210', M: '#4a7fa0' };


// The district junk. Shapes that are close enough to an existing prop reuse
// its matrix with one of the recolours below; the rest have their own matrix.
export const PAL_VEG = { k: '#171310', g: '#4d6b32', G: '#7aa044' };
export const PAL_SNACK = { k: '#171310', w: '#e6d7b4', c: '#b8442f' };
export const PAL_WIRE = { k: '#171310', c: '#a8682e', C: '#d9a24f' };
export const PAL_STICK = { k: '#171310', b: '#6b5236' };
export const PAL_BRICK = { k: '#171310', r: '#8a4a3a', R: '#a8604a' };
export const PAL_BATTERY = { k: '#171310', M: '#5d6168', m: '#2f3236', y: '#d9a83c' };
export const PAL_CUP = { k: '#171310', w: '#efe8d8', W: '#c8bfa8', c: '#6b5a44' };

export const PAL_FLYER = { k: '#171310', w: '#f4efe2', W: '#ddd6c4', l: '#c0453a' };
export const PAL_RECEIPT = { k: '#171310', w: '#f7f3e8', W: '#ded8c8', l: '#8a8070' };
export const PAL_CLOTH = { k: '#141110', w: '#6b5a44', W: '#8a7659' };
export const PAL_WINE = { k: '#171310', C: '#8a6430', g: '#5a3f1e', G: '#7a5628', l: '#c99a52' };
export const PAL_WATER = { k: '#171310', C: '#7aa9c8', g: '#3f6a8a', G: '#5f8aa8', l: '#dce8f0' };
export const PAL_PIPE = { k: '#141210', M: '#9aa0a6', m: '#6b7178' };


// What the pickpocket brings back.
export const PAL_WALLET = { k: '#141210', b: '#6a4a30', B: '#c9a24f' };
export const PAL_PHONE = { k: '#141210', M: '#2a2d33', m: '#171a1f', C: '#6aa8c8' };
export const PAL_CIGS = { k: '#141210', w: '#f2efe6', r: '#b03a2e' };
export const PAL_SNACKBAR = { k: '#141210', w: '#c8b48a', W: '#e0cfa0', c: '#6b4a2a' };


// The black market's kit for a steadier hand.
export const PAL_GLOVE = { k: '#141210', d: '#4a3a28' };
export const PAL_BLADE = { k: '#141210', M: '#cfd6dc', m: '#9aa0a6' };
export const PAL_BOOZE = { k: '#141210', C: '#8a6430', g: '#7a2f22', G: '#9a4a30', l: '#d9a24f' };
export const PAL_PERFUME = { k: '#141210', M: '#e0c8dc', C: '#b05a9a' };
