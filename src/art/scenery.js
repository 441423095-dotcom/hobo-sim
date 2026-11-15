// The street itself: the painted ground, the building facades on both sides,
// the corner shop and the cardboard begging mat. All of it is drawn once into
// canvas textures at startup.

import { canvasTexture, seeded } from './pixel.js';
import { WORLD, LEFT_PAVEMENT, ROAD, RIGHT_PAVEMENT, SHOP } from '../world.js';

const LEFT_BUILDING_WIDTH = 112;
const RIGHT_BUILDING_WIDTH = 112;

export function buildWorldArt(scene) {
  canvasTexture(scene, 'ground', WORLD.width, WORLD.height, drawGround);

  // Every district builds its own two sides of the street, so the market is
  // brick and shop awnings, the station is pale stone, the business district is
  // glass, and the camp and the black street are patched tin and boarded walls.
  for (const id of FACADE_DISTRICTS) {
    canvasTexture(scene, `bld-${id}-left`, LEFT_BUILDING_WIDTH, WORLD.height, (ctx, w, h) =>
      drawFacade(ctx, w, h, facadeSeed(id, false), false, id)
    );
    canvasTexture(scene, `bld-${id}-right`, RIGHT_BUILDING_WIDTH, WORLD.height, (ctx, w, h) =>
      drawFacade(ctx, w, h, facadeSeed(id, true), true, id)
    );
  }

  canvasTexture(scene, 'shopfront', SHOP.width, SHOP.height, drawShopfront);
  canvasTexture(scene, 'stall', 76, 56, drawStall);
  canvasTexture(scene, 'pawnshop', 112, 176, drawPawnshop);
  canvasTexture(scene, 'grocerystore', 112, 176, (ctx, w, h) =>
    drawStoreFront(ctx, w, h, {
      wall: '#2c2a1e',
      awning: ['#6f8a4a', '#d8c8a8'],
      sign: '#1d2416',
      glyph: '杂',
      glyphColour: '#dfe8c4',
      window: '#4a6a3a',
      door: '#3a2e1c'
    })
  );
  canvasTexture(scene, 'clothesstore', 112, 176, (ctx, w, h) =>
    drawStoreFront(ctx, w, h, {
      wall: '#2e2434',
      awning: ['#7b5b86', '#e0d4e8'],
      sign: '#1f1a26',
      glyph: '衣',
      glyphColour: '#f0dcff',
      window: '#5a4468',
      door: '#332a3a'
    })
  );
  canvasTexture(scene, 'blackmarket', 112, 176, (ctx, w, h) =>
    drawStoreFront(ctx, w, h, {
      wall: '#1a1614',
      awning: ['#3a1f1a', '#2a1a16'],
      sign: '#160f0d',
      glyph: '黑',
      glyphColour: '#d9563f',
      window: '#2a1a18',
      door: '#241a14',
      doorLeft: true,
      lantern: true
    })
  );
  canvasTexture(scene, 'workbench', 68, 44, drawWorkbench);
  canvasTexture(scene, 'tree', 40, 58, drawTree);
  canvasTexture(scene, 'stationclock', 48, 120, drawStationClock);
  canvasTexture(scene, 'bridge', 640, 100, drawBridge);
  canvasTexture(scene, 'beg-mat', 40, 24, drawBegMat);
  canvasTexture(scene, 'shadow', 40, 18, drawShadow);

  canvasTexture(scene, 'homearch', 130, 96, drawHomeArch);
  canvasTexture(scene, 'tent', 180, 130, drawTent);
  canvasTexture(scene, 'passage', 224, 200, drawPassage);

  // The alleys cut between two blocks, and what is left lying in them.
  canvasTexture(scene, 'alley', 224, 78, drawAlley);
  canvasTexture(scene, 'fence', 96, 78, drawFence);
  canvasTexture(scene, 'cardboardpile', 56, 36, drawCardboardPile);
  canvasTexture(scene, 'trashbags', 48, 34, drawTrashBags);
  canvasTexture(scene, 'shack', 86, 64, drawShack);
  canvasTexture(scene, 'backdoor', 40, 56, drawBackdoor);

  // Street furniture: crossings, lights, parked cars, works and awnings.
  canvasTexture(scene, 'crosswalk', 96, 54, drawCrosswalk);
  canvasTexture(scene, 'trafficlight', 22, 64, drawTrafficLight);
  canvasTexture(scene, 'parkedcar', 54, 96, drawParkedCar);
  canvasTexture(scene, 'hoarding', 200, 46, drawHoarding);
  canvasTexture(scene, 'awning', 120, 26, drawAwning);
  canvasTexture(scene, 'streetlamp', 22, 88, drawStreetLamp);
  canvasTexture(scene, 'stationcanopy', 200, 92, drawStationCanopy);
  canvasTexture(scene, 'hedge', 96, 34, drawHedge);
  canvasTexture(scene, 'neonsign', 26, 96, drawNeonSign);
  canvasTexture(scene, 'vending', 44, 74, drawVending);
  canvasTexture(scene, 'slotmachine', 48, 64, drawSlotMachine);
  canvasTexture(scene, 'bench', 66, 34, drawBench);
  canvasTexture(scene, 'slot-cherry', 20, 20, (ctx, w, h) => drawSlotSymbol(ctx, w, h, 'cherry'));
  canvasTexture(scene, 'slot-bell', 20, 20, (ctx, w, h) => drawSlotSymbol(ctx, w, h, 'bell'));
  canvasTexture(scene, 'slot-star', 20, 20, (ctx, w, h) => drawSlotSymbol(ctx, w, h, 'star'));
  canvasTexture(scene, 'slot-seven', 20, 20, (ctx, w, h) => drawSlotSymbol(ctx, w, h, 'seven'));
  canvasTexture(scene, 'furn-bed', 72, 44, drawFurnBed);
  canvasTexture(scene, 'furn-table', 62, 44, drawFurnTable);
  canvasTexture(scene, 'furn-fire', 56, 62, drawFurnFire);
  canvasTexture(scene, 'furn-rug', 96, 30, drawFurnRug);
}

function drawGround(ctx, w, h) {
  ctx.fillStyle = '#1b1814';
  ctx.fillRect(0, 0, w, h);

  pavement(ctx, LEFT_PAVEMENT.x, LEFT_PAVEMENT.width, h, seeded(3));
  pavement(ctx, RIGHT_PAVEMENT.x, RIGHT_PAVEMENT.width, h, seeded(5));

  drawRoad(ctx, h, seeded(7));

  // Kerbs either side of the road.
  ctx.fillStyle = '#9a9487';
  ctx.fillRect(ROAD.x - 4, 0, 4, h);
  ctx.fillRect(ROAD.x + ROAD.width, 0, 4, h);

  // Warm light spilling out of the shop.
  const glow = ctx.createRadialGradient(SHOP.doorX, SHOP.doorY, 8, SHOP.doorX, SHOP.doorY, 130);
  glow.addColorStop(0, 'rgba(242,196,106,0.32)');
  glow.addColorStop(1, 'rgba(242,196,106,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(SHOP.doorX, SHOP.doorY, 130, 0, Math.PI * 2);
  ctx.fill();
}

function pavement(ctx, x, w, h, r) {
  ctx.fillStyle = '#8b8577';
  ctx.fillRect(x, 0, w, h);

  for (let y = 0; y < h; y += 32) {
    ctx.fillStyle = 'rgba(30,26,20,0.16)';
    ctx.fillRect(x, y, w, 2);
  }

  for (let row = 0; row * 32 < h; row++) {
    const offset = (row % 2) * 40;
    for (let px = x - offset; px < x + w; px += 80) {
      const startX = Math.max(x, px);
      if (startX < x + w) {
        ctx.fillStyle = 'rgba(30,26,20,0.13)';
        ctx.fillRect(startX, row * 32, 2, 32);
      }
    }
  }

  for (let i = 0; i < 420; i++) {
    const px = x + Math.floor(r() * w);
    const py = Math.floor(r() * h);
    ctx.fillStyle = r() > 0.5 ? 'rgba(120,114,100,0.5)' : 'rgba(58,53,46,0.32)';
    ctx.fillRect(px, py, 4, 4);
  }

  // A few cracks, so the slabs do not read as a flat grid.
  for (let i = 0; i < 7; i++) {
    let cx = x + r() * w;
    let cy = r() * h;
    ctx.strokeStyle = 'rgba(35,31,25,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let k = 0; k < 5; k++) {
      cx += (r() - 0.5) * 26;
      cy += 12 + r() * 18;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Puddles catching the sky.
  for (let i = 0; i < 3; i++) {
    const px = x + 20 + r() * (w - 40);
    const py = r() * h;
    ctx.fillStyle = 'rgba(40,46,48,0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py, 16 + r() * 14, 6 + r() * 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,160,158,0.12)';
    ctx.beginPath();
    ctx.ellipse(px - 3, py - 2, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoad(ctx, h, r) {
  ctx.fillStyle = '#474541';
  ctx.fillRect(ROAD.x, 0, ROAD.width, h);

  for (let i = 0; i < 900; i++) {
    const x = ROAD.x + r() * ROAD.width;
    const y = r() * h;
    ctx.fillStyle = r() > 0.5 ? '#3f3d39' : '#514e49';
    ctx.fillRect(Math.floor(x), Math.floor(y), 4, 4);
  }

  ctx.fillStyle = '#b9a45f';
  for (let y = 10; y < h; y += 58) {
    ctx.fillRect(ROAD.x + ROAD.width / 2 - 4, y, 8, 28);
  }

  // A manhole and a couple of drains.
  ctx.fillStyle = '#3a3835';
  ctx.beginPath();
  ctx.arc(ROAD.x + ROAD.width / 2, 704, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2825';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ROAD.x + ROAD.width / 2, 704, 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#2d2b28';
  ctx.fillRect(ROAD.x + 6, 520, 16, 26);
  ctx.fillRect(ROAD.x + ROAD.width - 22, 1120, 16, 26);
}

// The two sides of the street are not one long wall: each stretch along them is
// a building of its own, with its own age, height, colour and window type.
// Blocks are set back from the back of the strip by a few pixels, which is what
// reads as a lower roof standing against the dark behind it, so the skyline is
// uneven the whole way down the street and old buildings sit next to new ones.

const FACADE_DISTRICTS = ['market', 'square', 'alley', 'park', 'camp', 'slum', 'commerce'];

const FACADES = {
  market: {
    back: '#14100c',
    walls: ['#5a4433', '#6a5040', '#4c3a2c', '#74604b'],
    roof: '#33261c',
    windows: ['#232830', '#2b3038'],
    lit: ['#c99a4e', '#d8b06a'],
    style: 'brick',
    awning: ['#8a3a2e', '#c8b48a']
  },
  square: {
    back: '#101318',
    walls: ['#5c5b54', '#6b6a62', '#4e4d47', '#76746a'],
    roof: '#3a3a38',
    windows: ['#232830', '#2b3038'],
    lit: ['#d9c07a', '#efe0a8'],
    style: 'stone'
  },
  alley: {
    back: '#0d0d0b',
    walls: ['#3b3630', '#46403a', '#302c27', '#4f463c'],
    roof: '#232019',
    windows: ['#1c2024', '#22262a'],
    lit: ['#b98a48', '#8a7448'],
    style: 'grim'
  },
  park: {
    back: '#12150f',
    walls: ['#6d6552', '#7a715c', '#5c5648', '#847a64'],
    roof: '#3b3630',
    windows: ['#252a30', '#2d3238'],
    lit: ['#d8c48a', '#e8d8a8'],
    style: 'plaster'
  },
  camp: {
    back: '#14110b',
    walls: ['#4a4436', '#544c3c', '#3e3830', '#5c5342'],
    roof: '#2e2a20',
    windows: ['#232018', '#2a2620'],
    lit: ['#b89a58', '#8a7a48'],
    style: 'tin'
  },
  slum: {
    back: '#0f0b09',
    walls: ['#3a2e28', '#463832', '#2e2620', '#4f4038'],
    roof: '#221a16',
    windows: ['#1a1a1c', '#201e1c'],
    lit: ['#a87a44', '#7a5a38'],
    style: 'slum'
  },
  commerce: {
    back: '#0c1016',
    walls: ['#2c3440', '#343e4c', '#262e38', '#3c4654'],
    roof: '#1c2230',
    windows: ['#1a2430', '#202a36'],
    lit: ['#9fd4e8', '#cfe8f4'],
    style: 'glass'
  }
};

function facadeSeed(id, isRight) {
  let seed = 41 + (isRight ? 613 : 0);
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) % 9929;
  return seed;
}

function drawFacade(ctx, w, h, seed, isRight, district) {
  const r = seeded(seed);
  const look = FACADES[district] || FACADES.market;

  // The dark air the roofs stand against.
  ctx.fillStyle = look.back;
  ctx.fillRect(0, 0, w, h);

  let y = -26;
  while (y < h) {
    const height = 132 + Math.floor(r() * 168);
    drawBuilding(ctx, w, y, height, isRight, look, r, district);
    y += height + 3;
  }

  // Dirt and smoke ground into the top of the strip.
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = 'rgba(8,7,5,0.22)';
    ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 6 + Math.floor(r() * 10), 4);
  }
}

/// One building: wall, roof parapet, windows, and whatever it has grown on it.
function drawBuilding(ctx, w, y, height, isRight, look, r, district) {
  // Set back from the back of the strip: the leftover is the air above a roof
  // lower than its neighbours'.
  const inset = r() < 0.42 ? 0 : 6 + Math.floor(r() * 16);
  const wallX = isRight ? 0 : inset;
  const wallW = w - inset;

  ctx.fillStyle = look.walls[Math.floor(r() * look.walls.length)];
  ctx.fillRect(wallX, y, wallW, height);

  drawWallPattern(ctx, wallX, y, wallW, height, look, r);

  // The roof on top of the block.
  ctx.fillStyle = look.roof;
  ctx.fillRect(wallX, y, wallW, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(wallX, y + 8, wallW, 3);

  // The back of the block is in shadow; the pavement side catches the light.
  ctx.fillStyle = 'rgba(10,8,6,0.42)';
  ctx.fillRect(isRight ? wallX + wallW - 5 : wallX, y, 5, height);
  ctx.fillStyle = 'rgba(255,226,180,0.05)';
  ctx.fillRect(isRight ? wallX : wallX + wallW - 3, y, 3, height);

  const colA = isRight ? wallX + 10 : wallX + wallW - 48;
  const colB = isRight ? wallX + 52 : wallX + wallW - 90;
  const cols = [colA, colB].filter((x) => x >= wallX + 2 && x + 38 <= wallX + wallW - 2);

  const rows = Math.max(1, Math.floor((height - 28) / 46));
  for (let row = 0; row < rows; row++) {
    const wy = y + 22 + row * 46;
    if (wy + 34 > y + height - 4) break;
    for (const wx of cols) drawWindow(ctx, wx, wy, 38, 34, look, r, district);
  }

  const streetX = isRight ? wallX + 8 : wallX + wallW - 46;

  // A tank on the roof of the odd block, a fire escape down the side of another.
  if (r() < 0.34) drawRoofTank(ctx, wallX, wallW, y, isRight);
  if (r() < 0.32 && height > 168) drawFireEscape(ctx, wallX, wallW, y, height, isRight);

  // An air conditioner under a window, dripping down the wall.
  if (cols.length && r() < 0.45 && height > 130) {
    const ax = cols[0] + 4;
    const ay = y + 62 + Math.floor(r() * Math.max(1, height - 100));

    ctx.fillStyle = '#8a8d8a';
    ctx.fillRect(ax, ay, 20, 11);
    ctx.fillStyle = '#5a5d5a';
    ctx.fillRect(ax + 2, ay + 3, 16, 4);
    ctx.fillStyle = 'rgba(40,50,40,0.35)';
    ctx.fillRect(ax + 6, ay + 11, 8, 6);
  }

  // A shop awning over the pavement in the market: red and cream stripes.
  if (look.awning && r() < 0.46) {
    const aw = 26;
    const ax = isRight ? wallX : wallX + wallW - aw;
    const ay = y + 40 + Math.floor(r() * Math.max(1, height - 90));

    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = look.awning[(Math.floor(r() * 2) + i) % 2];
      ctx.fillRect(ax, ay + i * 6, aw, 6);
    }

    ctx.fillStyle = 'rgba(12,10,8,0.4)';
    ctx.fillRect(ax, ay + 30, aw, 3);
  }

  if (district === 'slum' || district === 'alley') {
    if (r() < 0.5) drawGraffiti(ctx, wallX, wallW, y, height, r, isRight);
    if (r() < 0.4) {
      // Somebody's washing strung across the street side of the wall.
      const ly = y + 50 + Math.floor(r() * Math.max(1, height - 90));
      const lx = isRight ? wallX + 4 : wallX + wallW - 26;

      ctx.strokeStyle = 'rgba(180,170,150,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 22, ly + 3);
      ctx.stroke();

      const cloth = ['#8a8070', '#5a6a70', '#7a5a52'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cloth[Math.floor(r() * cloth.length)];
        ctx.fillRect(lx + 3 + i * 7, ly + 2, 5, 9);
      }
    }
  }

  if (district === 'park') {
    // Ivy climbing the pavement side, and a window box or two above it.
    const vx = isRight ? wallX + 2 : wallX + wallW - 14;

    for (let i = 0; i < Math.floor(height / 22); i++) {
      if (r() < 0.45) continue;
      ctx.fillStyle = r() > 0.5 ? '#3f6a3a' : '#4f7d42';
      ctx.fillRect(vx + Math.floor(r() * 10), y + 14 + i * 22, 4, 4);
    }
  }

  if (district === 'commerce') {
    // A strip of neon down the pavement side of the tower.
    if (r() < 0.4) {
      const nx = isRight ? wallX + 6 : wallX + wallW - 12;
      const ny = y + 30 + Math.floor(r() * Math.max(1, height - 80));

      ctx.fillStyle = r() > 0.5 ? 'rgba(120,220,240,0.75)' : 'rgba(240,140,200,0.7)';
      ctx.fillRect(nx, ny, 5, 46);
      ctx.fillStyle = 'rgba(120,220,240,0.16)';
      ctx.fillRect(nx - 4, ny - 4, 13, 54);
    }
  }

  if (district === 'square' && r() < 0.4) {
    // Pilasters, so the station front reads as stone rather than brick.
    ctx.fillStyle = 'rgba(255,240,210,0.06)';
    ctx.fillRect(streetX + 46, y + 10, 5, height - 14);
    ctx.fillStyle = 'rgba(10,10,12,0.22)';
    ctx.fillRect(streetX + 51, y + 10, 2, height - 14);
  }
}

function drawWallPattern(ctx, x, y, w, h, look, r) {
  if (look.style === 'brick' || look.style === 'slum') {
    ctx.strokeStyle = 'rgba(20,15,12,0.26)';
    ctx.lineWidth = 1;

    let row = 0;
    for (let by = y + 8; by < y + h; by += 9, row++) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by);
      ctx.stroke();

      const offset = row % 2 ? 8 : 0;
      for (let bx = x + offset; bx < x + w; bx += 16) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, Math.min(by + 9, y + h));
        ctx.stroke();
      }
    }

    if (look.style === 'slum') {
      // Damp patches and a boarded-up ground floor.
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(20,14,10,0.35)';
        ctx.fillRect(x + Math.floor(r() * w * 0.6), y + Math.floor(r() * h), 20, 14);
      }
    }

    return;
  }

  if (look.style === 'stone') {
    ctx.strokeStyle = 'rgba(20,20,22,0.22)';
    ctx.lineWidth = 1;

    for (let by = y + 14; by < y + h; by += 14) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by);
      ctx.stroke();
    }

    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(240,236,220,0.05)';
      ctx.fillRect(x + Math.floor(r() * w), y + Math.floor(r() * h), 14, 6);
    }

    return;
  }

  if (look.style === 'plaster') {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(240,236,220,0.05)' : 'rgba(30,28,20,0.12)';
      ctx.fillRect(x + Math.floor(r() * w), y + Math.floor(r() * h), 16, 10);
    }

    return;
  }

  if (look.style === 'tin') {
    for (let bx = x; bx < x + w; bx += 5) {
      ctx.fillStyle = (Math.floor((bx - x) / 5) % 2 ? 'rgba(0,0,0,0.16)' : 'rgba(255,240,200,0.04)');
      ctx.fillRect(bx, y, 2, h);
    }

    ctx.strokeStyle = 'rgba(30,26,20,0.5)';
    ctx.lineWidth = 2;
    for (let by = y + 26; by < y + h; by += 52) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by);
      ctx.stroke();
    }

    return;
  }

  if (look.style === 'glass') {
    ctx.strokeStyle = 'rgba(10,14,20,0.45)';
    ctx.lineWidth = 1;

    for (let bx = x + 14; bx < x + w; bx += 14) {
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx, y + h);
      ctx.stroke();
    }

    for (let by = y + 18; by < y + h; by += 18) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by);
      ctx.stroke();
    }

    return;
  }

  // grim: exposed brick under years of soot.
  ctx.strokeStyle = 'rgba(14,12,10,0.3)';
  ctx.lineWidth = 1;
  for (let by = y + 10; by < y + h; by += 12) {
    ctx.beginPath();
    ctx.moveTo(x, by);
    ctx.lineTo(x + w, by);
    ctx.stroke();
  }
}

function drawWindow(ctx, x, y, w, h, look, r, district) {
  const lit = r() > (district === 'slum' || district === 'alley' ? 0.72 : 0.55);

  ctx.fillStyle = 'rgba(12,10,8,0.9)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

  ctx.fillStyle = lit
    ? look.lit[Math.floor(r() * look.lit.length)]
    : look.windows[Math.floor(r() * look.windows.length)];
  ctx.fillRect(x, y, w, h);

  if (district === 'commerce') {
    ctx.fillStyle = 'rgba(8,10,14,0.5)';
    for (let gy = y + 8; gy < y + h; gy += 9) ctx.fillRect(x, gy, w, 2);
    ctx.fillRect(x + w - 2, y, 2, h);
    ctx.fillStyle = 'rgba(200,230,255,0.08)';
    ctx.fillRect(x + 3, y + 2, w * 0.35, h - 4);
    return;
  }

  if (lit) {
    // A room behind the glass: a curtain, a lamp, somebody still up.
    ctx.fillStyle = 'rgba(60,40,20,0.28)';
    ctx.fillRect(x + 3, y + 3, w * 0.4, h - 6);
    ctx.fillStyle = 'rgba(255,236,190,0.22)';
    ctx.fillRect(x + w * 0.5, y + 4, w * 0.34, h - 10);
  } else {
    ctx.fillStyle = 'rgba(120,140,160,0.1)';
    ctx.fillRect(x + 2, y + 2, w * 0.3, h - 6);
  }

  ctx.fillStyle = 'rgba(12,10,8,0.85)';
  ctx.fillRect(x + w / 2 - 1, y, 2, h);

  if ((district === 'slum' || district === 'alley') && r() > 0.55) {
    // Boards across a window nobody has paid to fix.
    ctx.fillStyle = '#3a2c20';
    ctx.fillRect(x - 3, y + 7, w + 6, 6);
    ctx.fillRect(x - 3, y + 20, w + 6, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - 3, y + 13, w + 6, 2);
  }

  if (district === 'park' && r() > 0.6) {
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(x - 2, y + h, w + 4, 6);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = r() > 0.5 ? '#c25a72' : '#d8b45a';
      ctx.fillRect(x + 2 + i * 7, y + h - 1, 4, 4);
    }
  }
}

function drawFireEscape(ctx, wallX, wallW, y, height, isRight) {
  const x = isRight ? wallX + 2 : wallX + wallW - 20;

  ctx.strokeStyle = 'rgba(28,26,24,0.9)';
  ctx.lineWidth = 2;

  for (let ly = y + 40; ly < y + height - 30; ly += 60) {
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + 18, ly);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 2, ly);
    ctx.lineTo(x + 16, ly + 60);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(20,18,16,0.9)';
  ctx.fillRect(x, y + 40, 2, height - 70);
}

function drawRoofTank(ctx, wallX, wallW, y, isRight) {
  const x = isRight ? wallX + wallW - 34 : wallX + 10;

  ctx.fillStyle = '#3a3630';
  ctx.fillRect(x, y - 16, 24, 14);
  ctx.fillStyle = '#4a453c';
  ctx.fillRect(x + 2, y - 14, 20, 4);
  ctx.fillStyle = '#2a2620';
  ctx.fillRect(x + 4, y - 2, 3, 7);
  ctx.fillRect(x + 17, y - 2, 3, 7);
}

function drawGraffiti(ctx, wallX, wallW, y, height, r, isRight) {
  const gx = isRight ? wallX + 14 : wallX + wallW - 60;
  const gy = y + 30 + Math.floor(r() * Math.max(1, height - 70));
  const colours = ['#8a3a5a', '#3a6a7a', '#b8a04a'];

  ctx.strokeStyle = colours[Math.floor(r() * colours.length)];
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.quadraticCurveTo(gx + 10, gy - 12, gx + 22, gy + 4);
  ctx.quadraticCurveTo(gx + 32, gy + 14, gx + 44, gy - 2);
  ctx.stroke();
}

function drawShopfront(ctx, w, h) {
  ctx.fillStyle = '#2b2119';
  ctx.fillRect(0, 0, w, h);

  // Striped awning over the pavement.
  const stripes = ['#c8b48a', '#9e4032'];
  for (let i = 0; i * 16 < w; i++) {
    ctx.fillStyle = stripes[i % 2];
    ctx.fillRect(i * 16, 0, 16, 30);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 30, w, 6);

  // Sign board: lettering suggested with bars rather than words.
  ctx.fillStyle = '#161310';
  ctx.fillRect(8, 40, w - 16, 24);
  ctx.fillStyle = '#f2c46a';
  ctx.fillRect(18, 50, 24, 5);
  ctx.fillRect(48, 50, 16, 5);
  ctx.fillRect(70, 50, 30, 5);

  // Door on the pavement side, where the player can reach it.
  ctx.fillStyle = '#141110';
  ctx.fillRect(12, 70, 40, 92);
  ctx.fillStyle = '#f0c977';
  ctx.fillRect(16, 76, 32, 34);
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(16, 116, 32, 42);
  ctx.fillStyle = '#d9b26a';
  ctx.fillRect(42, 132, 4, 10);

  // Lit shop window with goods on the shelves.
  ctx.fillStyle = '#1a1611';
  ctx.fillRect(66, 70, 54, 74);
  ctx.fillStyle = '#e8b95e';
  ctx.fillRect(70, 74, 46, 66);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(70, 74, 46, 10);
  ctx.fillStyle = 'rgba(40,28,18,0.55)';
  ctx.fillRect(70, 98, 46, 3);
  ctx.fillRect(70, 120, 46, 3);

  const goods = ['#b8442f', '#4f7a55', '#3d4a63', '#a07c4f', '#c9c2b0', '#6b5236'];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = goods[i];
    ctx.fillRect(74 + i * 7, 88, 5, 8);
    ctx.fillRect(74 + i * 7, 108, 5, 8);
  }

  ctx.fillStyle = '#544a3d';
  ctx.fillRect(0, h - 14, w, 14);
}

function drawStall(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 6, w / 2 - 2, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Poles holding the tarp up.
  ctx.fillStyle = '#5a4432';
  ctx.fillRect(6, 14, 4, 40);
  ctx.fillRect(w - 10, 14, 4, 40);

  // Striped awning.
  for (let i = 0; i * 10 < w; i++) {
    ctx.fillStyle = i % 2 ? '#d8c8a8' : '#a8483a';
    ctx.fillRect(i * 10, 0, 10, 16);
  }
  ctx.fillStyle = '#8a3a2e';
  ctx.fillRect(0, 16, w, 4);

  // Table with a pile of scrap on it.
  ctx.fillStyle = '#8d6a44';
  ctx.fillRect(2, 30, w - 4, 5);
  ctx.fillStyle = '#6f5233';
  ctx.fillRect(2, 35, w - 4, 14);

  const junk = ['#b8442f', '#4f7a55', '#c9c2b0', '#a07c4f', '#6b5236', '#8a8f96'];
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = junk[i % junk.length];
    ctx.fillRect(8 + i * 9, 22 + (i % 2) * 4, 6, 7);
  }

  // Crates under the table.
  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(8, 38, 18, 14);
  ctx.fillStyle = '#5d4528';
  ctx.fillRect(8, 44, 18, 2);
  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(46, 40, 22, 12);
}

function drawPawnshop(ctx, w, h) {
  ctx.fillStyle = '#2a2119';
  ctx.fillRect(0, 0, w, h);

  // Sign board with the shop's mark.
  ctx.fillStyle = '#3b1f1a';
  ctx.fillRect(6, 8, w - 12, 46);
  ctx.strokeStyle = '#c9a45c';
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 11, w - 18, 40);

  ctx.fillStyle = '#f2c46a';
  ctx.font = 'bold 32px "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('当', w / 2, 32);

  // The three hanging balls every pawn shop is supposed to have.
  ctx.fillStyle = '#5a4020';
  ctx.fillRect(34, 56, 48, 4);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = '#5a4020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40 + i * 16, 60);
    ctx.lineTo(40 + i * 16, 66);
    ctx.stroke();

    ctx.fillStyle = '#e0b040';
    ctx.beginPath();
    ctx.arc(40 + i * 16, 72, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Barred window.
  ctx.fillStyle = '#141110';
  ctx.fillRect(14, 92, 44, 54);
  ctx.fillStyle = '#2f4a44';
  ctx.fillRect(18, 96, 36, 46);
  ctx.fillStyle = 'rgba(20,30,28,0.9)';
  for (let i = 0; i < 3; i++) ctx.fillRect(20 + i * 10, 96, 3, 46);

  // Door on the pavement side.
  ctx.fillStyle = '#141110';
  ctx.fillRect(70, 88, 34, 76);
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(74, 92, 26, 68);
  ctx.fillStyle = '#d9b26a';
  ctx.fillRect(94, 128, 4, 8);

  ctx.fillStyle = 'rgba(242,196,106,0.22)';
  ctx.beginPath();
  ctx.arc(87, 84, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#544a3d';
  ctx.fillRect(0, h - 14, w, 14);
}

function drawTree(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 4, w * 0.3, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a3a28';
  ctx.fillRect(w / 2 - 4, h * 0.6, 8, h * 0.4);
  ctx.fillStyle = '#3a2d1f';
  ctx.fillRect(w / 2 - 4, h * 0.6, 3, h * 0.4);

  ctx.fillStyle = '#2f4a2c';
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.36, w * 0.44, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3d5c37';
  ctx.beginPath();
  ctx.arc(w * 0.32, h * 0.45, w * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.7, h * 0.44, w * 0.32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4d7044';
  ctx.beginPath();
  ctx.arc(w * 0.44, h * 0.24, w * 0.24, 0, Math.PI * 2);
  ctx.fill();
}

function drawStationClock(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 6, w * 0.34, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3a3f45';
  ctx.fillRect(w / 2 - 4, 26, 8, h - 30);
  ctx.fillStyle = '#4e555c';
  ctx.fillRect(w / 2 - 4, 26, 3, h - 30);

  ctx.fillStyle = '#1c2126';
  ctx.beginPath();
  ctx.arc(w / 2, 26, 21, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e8e2d0';
  ctx.beginPath();
  ctx.arc(w / 2, 26, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c2126';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, 26, 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#1c2126';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2, 26);
  ctx.lineTo(w / 2, 16);
  ctx.moveTo(w / 2, 26);
  ctx.lineTo(w / 2 + 8, 30);
  ctx.stroke();
}

function drawBridge(ctx, w, h) {
  // Stone band across the street, with the dark underpass beneath it.
  ctx.fillStyle = '#14110d';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#4a463f';
  ctx.fillRect(0, 0, w, 26);
  ctx.fillStyle = '#5c574e';
  ctx.fillRect(0, 0, w, 8);

  ctx.strokeStyle = 'rgba(20,17,13,0.45)';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 26);
    ctx.stroke();
  }

  // Buttresses holding the span up.
  ctx.fillStyle = '#3f3b35';
  ctx.fillRect(0, 0, 120, h);
  ctx.fillRect(w - 120, 0, 120, h);
  ctx.fillStyle = 'rgba(10,8,6,0.55)';
  ctx.fillRect(0, 26, 120, h - 26);
  ctx.fillRect(w - 120, 26, 120, h - 26);

  // Moss and stains on the stone.
  ctx.fillStyle = 'rgba(60,90,60,0.22)';
  ctx.fillRect(60, 4, 90, 14);
  ctx.fillRect(300, 6, 120, 12);
  ctx.fillRect(470, 2, 70, 16);
}

function drawStoreFront(ctx, w, h, o) {
  ctx.fillStyle = o.wall;
  ctx.fillRect(0, 0, w, h);

  // Striped awning.
  for (let i = 0; i * 16 < w; i++) {
    ctx.fillStyle = o.awning[i % 2];
    ctx.fillRect(i * 16, 0, 16, 30);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 30, w, 6);

  // Sign board with the shop's mark.
  ctx.fillStyle = o.sign;
  ctx.fillRect(8, 40, w - 16, 26);
  ctx.strokeStyle = 'rgba(220,200,160,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 42, w - 20, 22);

  ctx.fillStyle = o.glyphColour;
  ctx.font = 'bold 18px "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(o.glyph, w / 2, 54);

  const doorX = o.doorLeft ? 10 : 68;
  const winX = o.doorLeft ? 50 : 14;

  // Window with goods behind it.
  ctx.fillStyle = '#141110';
  ctx.fillRect(winX - 3, 76, 48, 60);
  ctx.fillStyle = o.window;
  ctx.fillRect(winX, 79, 42, 54);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(winX, 79, 42, 10);
  ctx.fillStyle = 'rgba(20,17,13,0.6)';
  ctx.fillRect(winX, 100, 42, 3);
  ctx.fillRect(winX, 118, 42, 3);

  const goods = ['#d8c8a8', '#8a6a44', '#c9c2b0', '#a8483a'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = goods[i];
    ctx.fillRect(winX + 4 + i * 9, 90, 6, 8);
    ctx.fillRect(winX + 6 + i * 9, 108, 6, 8);
  }

  // Door, set on the pavement side.
  ctx.fillStyle = '#141110';
  ctx.fillRect(doorX - 4, 76, 40, 74);
  ctx.fillStyle = o.door;
  ctx.fillRect(doorX, 80, 32, 66);
  ctx.fillStyle = 'rgba(242,196,106,0.22)';
  ctx.fillRect(doorX + 2, 84, 28, 22);
  ctx.fillStyle = '#d9b26a';
  ctx.fillRect(doorX + 26, 124, 4, 8);

  if (o.lantern) {
    const lx = o.doorLeft ? 26 : w - 26;
    ctx.fillStyle = 'rgba(217,86,63,0.25)';
    ctx.beginPath();
    ctx.arc(lx, 74, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9563f';
    ctx.beginPath();
    ctx.ellipse(lx, 74, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c46a';
    ctx.fillRect(lx - 1, 62, 2, 4);
  }

  ctx.fillStyle = '#544a3d';
  ctx.fillRect(0, h - 14, w, 14);
}

function drawWorkbench(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 4, w / 2 - 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs.
  ctx.fillStyle = '#3a2d1f';
  ctx.fillRect(6, 20, 7, 22);
  ctx.fillRect(w - 13, 20, 7, 22);

  // Bench top with planks.
  ctx.fillStyle = '#8d6a44';
  ctx.fillRect(0, 12, w, 12);
  ctx.fillStyle = '#7a5b3a';
  ctx.fillRect(0, 20, w, 4);
  ctx.fillStyle = 'rgba(40,28,18,0.5)';
  ctx.fillRect(22, 12, 2, 12);
  ctx.fillRect(46, 12, 2, 12);

  // A vice bolted to the left end.
  ctx.fillStyle = '#6f7378';
  ctx.fillRect(2, 4, 14, 10);
  ctx.fillStyle = '#9aa0a6';
  ctx.fillRect(2, 4, 14, 4);
  ctx.fillStyle = '#3a3e42';
  ctx.fillRect(15, 7, 6, 4);

  // Tools and shavings on top.
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(30, 6, 16, 3);
  ctx.fillStyle = '#c6ccd4';
  ctx.fillRect(44, 5, 10, 3);
  ctx.fillStyle = '#9a5a3f';
  ctx.fillRect(26, 9, 6, 3);
  ctx.fillRect(55, 8, 5, 4);

  // Scrap box on the ground.
  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(20, 30, 26, 12);
  ctx.fillStyle = '#5d4528';
  ctx.fillRect(20, 35, 26, 2);
}

function drawVending(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 3, w / 2 - 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body.
  ctx.fillStyle = '#8a3a32';
  ctx.fillRect(2, 2, w - 4, h - 6);
  ctx.fillStyle = '#a8483a';
  ctx.fillRect(4, 4, w - 8, h - 12);

  // Lit glass front with cans behind it.
  ctx.fillStyle = '#141110';
  ctx.fillRect(7, 10, w - 14, 34);
  ctx.fillStyle = '#d8e6ea';
  ctx.fillRect(9, 12, w - 18, 30);
  const cans = ['#b8442f', '#4f7a55', '#c9a45c', '#3d4a63'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = cans[i];
    ctx.fillRect(11 + (i % 2) * 13, 15 + Math.floor(i / 2) * 14, 9, 11);
  }

  // Button row and coin slot.
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(7, 48, w - 14, 8);
  ctx.fillStyle = '#f2c46a';
  ctx.fillRect(10, 50, 6, 4);
  ctx.fillStyle = '#d8e6ea';
  ctx.fillRect(w - 16, 50, 6, 4);

  // Cup slot at the bottom.
  ctx.fillStyle = '#141110';
  ctx.fillRect(11, h - 18, w - 22, 10);
  ctx.fillStyle = '#3a2c22';
  ctx.fillRect(13, h - 16, w - 26, 6);
}

function drawSlotMachine(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 3, w / 2 - 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2a2018';
  ctx.fillRect(3, 2, w - 10, h - 6);
  ctx.fillStyle = '#4a2f3a';
  ctx.fillRect(5, 4, w - 14, h - 10);

  // Reel window.
  ctx.fillStyle = '#141110';
  ctx.fillRect(9, 12, w - 22, 22);
  ctx.fillStyle = '#e8e2d0';
  ctx.fillRect(11, 14, w - 26, 18);
  ctx.fillStyle = 'rgba(30,24,18,0.55)';
  ctx.fillRect(11 + (w - 26) / 3, 14, 1, 18);
  ctx.fillRect(11 + ((w - 26) / 3) * 2, 14, 2, 18);

  // Coin slot and tray.
  ctx.fillStyle = '#f2c46a';
  ctx.fillRect(12, 40, 10, 4);
  ctx.fillStyle = '#141110';
  ctx.fillRect(11, h - 20, w - 26, 8);
  ctx.fillStyle = '#3a2c22';
  ctx.fillRect(13, h - 18, w - 30, 4);

  // Pull lever on the right.
  ctx.fillStyle = '#8a8f96';
  ctx.fillRect(w - 8, 18, 4, 26);
  ctx.fillStyle = '#d9563f';
  ctx.beginPath();
  ctx.arc(w - 6, 16, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBench(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 3, w / 2 - 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs.
  ctx.fillStyle = '#3a2d1f';
  ctx.fillRect(6, 18, 5, 14);
  ctx.fillRect(w - 11, 18, 5, 14);

  // Backrest and seat slats.
  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(2, 2, w - 4, 7);
  ctx.fillStyle = '#8d6a44';
  ctx.fillRect(2, 11, w - 4, 8);
  ctx.fillStyle = 'rgba(40,28,18,0.5)';
  ctx.fillRect(2, 9, w - 4, 2);
  ctx.fillRect(2, 19, w - 4, 2);
}

function drawSlotSymbol(ctx, w, h, kind) {
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  if (kind === 'cherry') {
    ctx.strokeStyle = '#4f7a55';
    ctx.beginPath();
    ctx.moveTo(w / 2, 6);
    ctx.lineTo(w / 2 - 4, 12);
    ctx.moveTo(w / 2, 6);
    ctx.lineTo(w / 2 + 4, 12);
    ctx.stroke();

    ctx.fillStyle = '#b8442f';
    ctx.beginPath();
    ctx.arc(w / 2 - 5, 15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w / 2 + 5, 15, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (kind === 'bell') {
    ctx.fillStyle = '#e0b040';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 7, 15);
    ctx.quadraticCurveTo(w / 2 - 7, 5, w / 2, 5);
    ctx.quadraticCurveTo(w / 2 + 7, 5, w / 2 + 7, 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(w / 2 - 9, 15, 18, 3);
    ctx.fillStyle = '#8a6a44';
    ctx.beginPath();
    ctx.arc(w / 2, 19, 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (kind === 'star') {
    ctx.fillStyle = '#f2c46a';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 9 : 4;
      const x = w / 2 + Math.cos(angle) * r;
      const y = h / 2 + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.fillStyle = '#d9563f';
  ctx.font = 'bold 18px "PingFang SC", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('7', w / 2, h / 2 + 1);
}

function drawTent(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 5, w / 2 - 8, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Guy ropes.
  ctx.strokeStyle = '#5a4a34';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, h - 10);
  ctx.lineTo(w / 2 - 46, 22);
  ctx.moveTo(w - 18, h - 10);
  ctx.lineTo(w / 2 + 46, 22);
  ctx.stroke();

  // Canvas body.
  ctx.fillStyle = '#8a7a5a';
  ctx.beginPath();
  ctx.moveTo(w / 2, 10);
  ctx.lineTo(w - 12, h - 14);
  ctx.lineTo(12, h - 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#9d8b68';
  ctx.beginPath();
  ctx.moveTo(w / 2, 10);
  ctx.lineTo(w / 2 + 34, h - 14);
  ctx.lineTo(w / 2, h - 14);
  ctx.closePath();
  ctx.fill();

  // Patches and seams.
  ctx.fillStyle = 'rgba(90,70,48,0.55)';
  ctx.fillRect(w / 2 - 34, 52, 22, 18);
  ctx.fillRect(w / 2 + 22, 76, 16, 14);
  ctx.strokeStyle = 'rgba(70,55,38,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, 10);
  ctx.lineTo(w / 2, h - 14);
  ctx.stroke();

  // Flap opening, tied back.
  ctx.fillStyle = '#221c14';
  ctx.beginPath();
  ctx.moveTo(w / 2, 54);
  ctx.lineTo(w / 2 + 30, h - 14);
  ctx.lineTo(w / 2 - 30, h - 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#6a5a3f';
  ctx.beginPath();
  ctx.moveTo(w / 2 - 30, 56);
  ctx.lineTo(w / 2 - 8, h - 14);
  ctx.lineTo(w / 2 - 34, h - 14);
  ctx.closePath();
  ctx.fill();

  // Ridge pole and a little warmth spilling out.
  ctx.strokeStyle = '#4a3a26';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2, 6);
  ctx.lineTo(w / 2, 20);
  ctx.stroke();

  ctx.fillStyle = 'rgba(242,196,106,0.18)';
  ctx.beginPath();
  ctx.arc(w / 2, h - 16, 30, 0, Math.PI * 2);
  ctx.fill();
}

function drawPassage(ctx, w, h) {
  // A dirt cross-street cut through the building band.
  ctx.fillStyle = '#5a4f3f';
  ctx.fillRect(0, 0, w, h);

  const r = seeded(41);
  for (let i = 0; i < 700; i++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h);
    ctx.fillStyle = r() > 0.5 ? 'rgba(60,50,38,0.5)' : 'rgba(130,116,94,0.4)';
    ctx.fillRect(x, y, 4, 4);
  }

  // Kerbs along the top and bottom.
  ctx.fillStyle = '#9a9487';
  ctx.fillRect(0, 0, w, 6);
  ctx.fillRect(0, h - 6, w, 6);
  ctx.fillStyle = 'rgba(20,17,13,0.35)';
  ctx.fillRect(0, 6, w, 3);
  ctx.fillRect(0, h - 9, w, 3);

  // Arrows painted on the ground, pointing both ways.
  ctx.strokeStyle = 'rgba(216,200,168,0.6)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const base = side < 0 ? 74 : w - 74;
    for (const off of [0, 40]) {
      const tip = base - side * off;
      ctx.beginPath();
      ctx.moveTo(tip + side * 26, h / 2 - 42);
      ctx.lineTo(tip, h / 2);
      ctx.lineTo(tip + side * 26, h / 2 + 42);
      ctx.stroke();
    }
  }

  // A lamp at each mouth of the passage.
  for (const x of [18, w - 18]) {
    ctx.fillStyle = 'rgba(242,196,106,0.22)';
    ctx.beginPath();
    ctx.arc(x, 26, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3f45';
    ctx.fillRect(x - 2, 14, 4, 22);
    ctx.fillStyle = '#f2c46a';
    ctx.beginPath();
    ctx.arc(x, 12, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHomeArch(ctx, w, h) {
  // A dark opening under the bridge, screened with a ragged blanket.
  ctx.fillStyle = '#100d0a';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#3f3b35';
  ctx.fillRect(0, 0, w, 12);
  ctx.fillStyle = '#4a463f';
  ctx.fillRect(0, 0, w, 5);

  // The doorway itself.
  ctx.fillStyle = '#070605';
  ctx.beginPath();
  ctx.moveTo(20, h);
  ctx.lineTo(20, 46);
  ctx.quadraticCurveTo(w / 2, 8, w - 20, 46);
  ctx.lineTo(w - 20, h);
  ctx.closePath();
  ctx.fill();

  // Curtain in front of it.
  ctx.fillStyle = '#5a4432';
  ctx.beginPath();
  ctx.moveTo(28, h - 6);
  ctx.lineTo(30, 52);
  ctx.lineTo(52, 40);
  ctx.lineTo(66, 50);
  ctx.lineTo(84, 38);
  ctx.lineTo(102, 52);
  ctx.lineTo(102, h - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6d5340';
  ctx.fillRect(30, 52, 12, h - 58);
  ctx.fillRect(58, 46, 10, h - 52);
  ctx.fillRect(86, 50, 12, h - 56);

  ctx.fillStyle = 'rgba(242,196,106,0.16)';
  ctx.beginPath();
  ctx.arc(w / 2, h - 18, 22, 0, Math.PI * 2);
  ctx.fill();
}

function drawFurnBed(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 3, w / 2 - 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a07c4f';
  ctx.fillRect(2, h - 24, w - 4, 22);
  ctx.fillStyle = '#c19a68';
  ctx.fillRect(2, h - 24, w - 4, 5);
  ctx.fillStyle = 'rgba(60,42,22,0.5)';
  ctx.fillRect(2, h - 12, w - 4, 2);

  // Blanket and pillow.
  ctx.fillStyle = '#7b5b86';
  ctx.fillRect(10, h - 21, w - 20, 15);
  ctx.fillStyle = '#8f6c9c';
  ctx.fillRect(14, h - 19, w - 28, 6);
  ctx.fillStyle = '#cdc3ac';
  ctx.fillRect(w - 24, h - 22, 16, 9);
}

function drawFurnTable(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 3, w / 2 - 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(4, 12, w - 8, h - 16);
  ctx.fillStyle = '#8d6a44';
  ctx.fillRect(4, 12, w - 8, 6);
  ctx.fillStyle = 'rgba(50,34,18,0.55)';
  ctx.fillRect(w / 2 - 1, 18, 2, h - 22);

  // A stub of candle on top.
  ctx.fillStyle = '#e8e2d0';
  ctx.fillRect(w / 2 - 3, 4, 6, 9);
  ctx.fillStyle = '#f2c46a';
  ctx.beginPath();
  ctx.ellipse(w / 2, 2, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFurnFire(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 3, w / 2 - 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Barrel.
  ctx.fillStyle = '#4a463f';
  ctx.fillRect(6, 22, w - 12, h - 24);
  ctx.fillStyle = '#5c574e';
  ctx.fillRect(6, 30, w - 12, 4);
  ctx.fillRect(6, h - 14, w - 12, 4);

  // Fire inside.
  ctx.fillStyle = '#2a1a12';
  ctx.fillRect(12, 26, w - 24, 12);
  ctx.fillStyle = '#d9563f';
  ctx.beginPath();
  ctx.moveTo(w / 2 - 12, 38);
  ctx.quadraticCurveTo(w / 2 - 4, 12, w / 2, 22);
  ctx.quadraticCurveTo(w / 2 + 6, 10, w / 2 + 12, 38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2c46a';
  ctx.beginPath();
  ctx.moveTo(w / 2 - 6, 38);
  ctx.quadraticCurveTo(w / 2 - 1, 22, w / 2 + 1, 30);
  ctx.quadraticCurveTo(w / 2 + 5, 22, w / 2 + 6, 38);
  ctx.closePath();
  ctx.fill();
}

function drawFurnRug(ctx, w, h) {
  ctx.fillStyle = '#6a4230';
  ctx.fillRect(0, 4, w, h - 8);
  ctx.fillStyle = '#8a5a3f';
  ctx.fillRect(3, 7, w - 6, h - 14);
  ctx.fillStyle = '#a8785a';
  ctx.fillRect(6, 10, w - 12, 3);
  ctx.fillRect(6, h - 13, w - 12, 3);

  ctx.fillStyle = 'rgba(40,26,16,0.4)';
  for (let x = 12; x < w - 12; x += 14) {
    ctx.fillRect(x, 15, 2, h - 30);
  }
}

function drawBegMat(ctx, w, h) {
  ctx.fillStyle = '#8d6c43';
  ctx.fillRect(2, 6, w - 4, h - 10);
  ctx.fillStyle = '#a6835a';
  ctx.fillRect(4, 8, w - 8, h - 16);
  ctx.fillStyle = 'rgba(40,30,18,0.35)';
  ctx.fillRect(2, h - 8, w - 4, 4);

  // A bowl left out for coins.
  ctx.fillStyle = '#171310';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 9, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cfc6b2';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 10, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c46a';
  ctx.fillRect(w / 2 - 2, h - 12, 4, 2);
}

function drawShadow(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}


// ------------------------------------------------------------- the alleys

function drawAlley(ctx, w, h) {
  ctx.fillStyle = '#12100d';
  ctx.fillRect(0, 0, w, h);

  // Cobbles, wet with something.
  const r = seeded(41);
  for (let y = 0; y < h; y += 9) {
    for (let x = ((y / 9) % 2) * 8; x < w; x += 16) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(58,52,44,0.5)' : 'rgba(44,39,33,0.5)';
      ctx.fillRect(x, y, 14, 7);
    }
  }

  // A puddle catching the far light.
  ctx.fillStyle = 'rgba(90,127,168,0.16)';
  ctx.beginPath();
  ctx.ellipse(w * 0.42, h * 0.62, 30, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Brick edges where the buildings were cut.
  ctx.fillStyle = '#2a211a';
  ctx.fillRect(0, 0, 6, h);
  ctx.fillRect(w - 6, 0, 6, h);

  // A lamp at the far end.
  const glow = ctx.createRadialGradient(w * 0.82, h * 0.3, 4, w * 0.82, h * 0.3, 44);
  glow.addColorStop(0, 'rgba(242,196,106,0.22)');
  glow.addColorStop(1, 'rgba(242,196,106,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.3, 44, 0, Math.PI * 2);
  ctx.fill();

  // Something scrawled on the wall.
  ctx.strokeStyle = 'rgba(196,85,63,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.16, h * 0.32);
  ctx.lineTo(w * 0.24, h * 0.52);
  ctx.lineTo(w * 0.2, h * 0.56);
  ctx.moveTo(w * 0.24, h * 0.34);
  ctx.lineTo(w * 0.17, h * 0.54);
  ctx.stroke();
}

function drawFence(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  // Rails.
  ctx.fillStyle = '#4c525a';
  ctx.fillRect(0, h * 0.16, w, 5);
  ctx.fillRect(0, h * 0.7, w, 5);

  // Bars.
  for (let x = 4; x < w - 4; x += 11) {
    ctx.fillStyle = x % 22 === 4 ? '#565d66' : '#4a5058';
    ctx.fillRect(x, h * 0.05, 4, h * 0.86);

    // A rust fleck here and there.
    if (x % 33 === 4) {
      ctx.fillStyle = 'rgba(150,90,50,0.55)';
      ctx.fillRect(x, h * 0.35, 4, 6);
    }
  }

  // Spiked tops.
  ctx.fillStyle = '#5b626b';
  for (let x = 4; x < w - 4; x += 11) {
    ctx.beginPath();
    ctx.moveTo(x - 1, h * 0.06);
    ctx.lineTo(x + 2, h * 0.0);
    ctx.lineTo(x + 5, h * 0.06);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCardboardPile(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const boxes = [
    { x: 2, y: h - 22, w: 26, h: 20 },
    { x: 26, y: h - 18, w: 22, h: 16 },
    { x: 10, y: h - 38, w: 24, h: 18 }
  ];

  for (const box of boxes) {
    ctx.fillStyle = '#6b5236';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = '#8a6a44';
    ctx.fillRect(box.x + 2, box.y + 2, box.w - 4, box.h * 0.4);
    ctx.fillStyle = 'rgba(30,24,16,0.45)';
    ctx.fillRect(box.x + box.w * 0.5 - 1, box.y, 2, box.h);
  }
}

function drawTrashBags(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const bags = [
    { x: w * 0.3, y: h * 0.66, rx: 15, ry: 13 },
    { x: w * 0.66, y: h * 0.72, rx: 12, ry: 11 },
    { x: w * 0.5, y: h * 0.44, rx: 11, ry: 10 }
  ];

  for (const bag of bags) {
    ctx.fillStyle = '#26262a';
    ctx.beginPath();
    ctx.ellipse(bag.x, bag.y, bag.rx, bag.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(120,130,140,0.22)';
    ctx.beginPath();
    ctx.ellipse(bag.x - bag.rx * 0.3, bag.y - bag.ry * 0.35, bag.rx * 0.4, bag.ry * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tied neck.
    ctx.fillStyle = '#3a3a3e';
    ctx.fillRect(bag.x - 3, bag.y - bag.ry - 4, 6, 5);
  }
}

function drawShack(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  // Posts.
  ctx.fillStyle = '#3a2c1e';
  ctx.fillRect(4, h * 0.28, 5, h * 0.7);
  ctx.fillRect(w - 9, h * 0.34, 5, h * 0.64);

  // A tarp thrown over them.
  ctx.fillStyle = '#3f4a52';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.4);
  ctx.lineTo(w * 0.5, h * 0.1);
  ctx.lineTo(w, h * 0.46);
  ctx.lineTo(w, h * 0.58);
  ctx.lineTo(0, h * 0.52);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(20,26,30,0.5)';
  ctx.fillRect(0, h * 0.44, w, 4);

  // A crate inside, and a bit of bedding.
  ctx.fillStyle = '#6a5236';
  ctx.fillRect(w * 0.18, h * 0.62, 22, 18);
  ctx.fillStyle = '#8a6a44';
  ctx.fillRect(w * 0.18 + 2, h * 0.62 + 2, 18, 6);
  ctx.fillStyle = '#7a6f5c';
  ctx.fillRect(w * 0.52, h * 0.72, 30, 12);
}

function drawBackdoor(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  // The frame.
  ctx.fillStyle = '#1e1a15';
  ctx.fillRect(0, 0, w, h);

  // The steel door.
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(4, 10, w - 8, h - 10);
  ctx.fillStyle = '#4a5158';
  ctx.fillRect(6, 12, w - 12, 6);

  // Panel lines and a handle.
  ctx.strokeStyle = 'rgba(20,22,26,0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 24, w - 16, 20);
  ctx.fillStyle = '#c9c2b0';
  ctx.fillRect(w - 12, h * 0.52, 5, 3);

  // A bare bulb over it.
  ctx.fillStyle = 'rgba(242,196,106,0.85)';
  ctx.beginPath();
  ctx.arc(w * 0.5, 6, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ------------------------------------------------------- the street furniture

function drawCrosswalk(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(216,210,196,0.5)';
  for (let x = 4; x < w - 4; x += 18) {
    ctx.fillRect(x, 2, 9, h - 4);
  }
}

function drawTrafficLight(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  // Pole.
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(w * 0.5 - 2, h * 0.32, 4, h * 0.68);

  // The head.
  ctx.fillStyle = '#20242a';
  ctx.fillRect(w * 0.5 - 8, 2, 16, h * 0.36);
  ctx.strokeStyle = '#4a5158';
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.5 - 8, 2, 16, h * 0.36);

  const lights = ['#8a3a30', '#8a7a30', '#3a7a44'];
  lights.forEach((colour, i) => {
    ctx.fillStyle = i === 0 ? colour : 'rgba(60,60,64,0.9)';
    ctx.beginPath();
    ctx.arc(w * 0.5, 9 + i * 8, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawParkedCar(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  // Shadow.
  ctx.fillStyle = 'rgba(10,9,7,0.28)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.94, w * 0.44, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body.
  ctx.fillStyle = '#5a5f68';
  roundRectPath(ctx, w * 0.08, h * 0.06, w * 0.84, h * 0.84, 8);
  ctx.fill();

  // Roof and windows.
  ctx.fillStyle = '#3a3f48';
  roundRectPath(ctx, w * 0.16, h * 0.24, w * 0.68, h * 0.34, 6);
  ctx.fill();

  ctx.fillStyle = 'rgba(120,150,170,0.5)';
  roundRectPath(ctx, w * 0.2, h * 0.28, w * 0.26, h * 0.24, 4);
  ctx.fill();
  roundRectPath(ctx, w * 0.54, h * 0.28, w * 0.26, h * 0.24, 4);
  ctx.fill();

  // Wheels.
  ctx.fillStyle = '#1a1a1c';
  ctx.fillRect(w * 0.02, h * 0.22, 6, h * 0.16);
  ctx.fillRect(w * 0.92, h * 0.22, 6, h * 0.16);
  ctx.fillRect(w * 0.02, h * 0.6, 6, h * 0.16);
  ctx.fillRect(w * 0.92, h * 0.6, 6, h * 0.16);

  // Lights.
  ctx.fillStyle = 'rgba(242,196,106,0.85)';
  ctx.fillRect(w * 0.2, h * 0.08, 8, 3);
  ctx.fillRect(w * 0.72, h * 0.08, 8, 3);
}

function drawHoarding(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#3f4a52';
  ctx.fillRect(0, 0, w, h);

  // Panels.
  ctx.fillStyle = 'rgba(20,26,30,0.55)';
  for (let x = 40; x < w; x += 40) {
    ctx.fillRect(x, 0, 2, h);
  }

  // Hazard stripes along the bottom.
  for (let x = 0; x < w; x += 22) {
    ctx.fillStyle = (x / 22) % 2 === 0 ? '#d9a44a' : '#26221c';
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + 11, h);
    ctx.lineTo(x + 22, h - 12);
    ctx.lineTo(x + 11, h - 12);
    ctx.closePath();
    ctx.fill();
  }

  // A poster.
  ctx.fillStyle = '#cfc6b2';
  ctx.fillRect(w * 0.4, 8, 34, 20);
  ctx.fillStyle = 'rgba(60,52,40,0.7)';
  ctx.fillRect(w * 0.4 + 4, 12, 26, 3);
  ctx.fillRect(w * 0.4 + 4, 18, 18, 3);
}

function drawAwning(ctx, w, h) {  ctx.clearRect(0, 0, w, h);

  const colours = ['#8a4a3a', '#d8c8a8'];
  const stripe = 15;

  for (let x = 0, i = 0; x < w; x += stripe, i++) {
    ctx.fillStyle = colours[i % 2];
    ctx.fillRect(x, 0, Math.min(stripe, w - x), h - 6);
  }

  // Scalloped edge.
  for (let x = 0; x < w; x += stripe) {
    ctx.fillStyle = colours[((x / stripe) | 0) % 2];
    ctx.beginPath();
    ctx.arc(x + stripe / 2, h - 6, stripe / 2, 0, Math.PI);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(20,16,12,0.35)';
  ctx.fillRect(0, h - 3, w, 3);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}


/// The station's entrance: a steel and glass canopy on two columns, with a
/// hanging board and the clock over the doors.
function drawStationCanopy(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  // Canopy roof, seen from underneath.
  ctx.fillStyle = 'rgba(16,20,24,0.92)';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillStyle = '#3c444c';
  ctx.fillRect(0, 14, w, 4);
  ctx.fillStyle = 'rgba(150,190,210,0.16)';
  ctx.fillRect(6, 18, w - 12, 8);

  // Ribs under the glass.
  ctx.fillStyle = '#2e343a';
  for (let x = 10; x < w - 10; x += 26) ctx.fillRect(x, 14, 3, 12);

  // Columns down to the paving.
  ctx.fillStyle = '#2a3036';
  ctx.fillRect(12, 18, 7, h - 18);
  ctx.fillRect(w - 19, 18, 7, h - 18);
  ctx.fillStyle = 'rgba(255,240,210,0.08)';
  ctx.fillRect(13, 18, 2, h - 18);

  // The board hanging over the entrance, with the station's name on it.
  ctx.fillStyle = '#161a1e';
  ctx.fillRect(w / 2 - 42, 22, 84, 24);
  ctx.strokeStyle = 'rgba(200,170,110,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(w / 2 - 42, 22, 84, 24);

  ctx.fillStyle = '#efe4c8';
  ctx.font = 'bold 14px "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('火车站', w / 2, 34);

  // A hanging lamp at either end of the canopy.
  for (const lx of [34, w - 34]) {
    ctx.strokeStyle = '#2e343a';
    ctx.beginPath();
    ctx.moveTo(lx, 26);
    ctx.lineTo(lx, 46);
    ctx.stroke();

    ctx.fillStyle = '#20242a';
    ctx.fillRect(lx - 7, 46, 14, 5);
    ctx.fillStyle = 'rgba(242,196,106,0.85)';
    ctx.fillRect(lx - 5, 51, 10, 3);

    const glow = ctx.createRadialGradient(lx, 56, 2, lx, 56, 22);
    glow.addColorStop(0, 'rgba(242,196,106,0.3)');
    glow.addColorStop(1, 'rgba(242,196,106,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, 56, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // The clock on the middle column.
  ctx.fillStyle = '#e8dcc2';
  ctx.beginPath();
  ctx.arc(w / 2, 62, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a3036';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 62);
  ctx.lineTo(w / 2, 55);
  ctx.moveTo(w / 2, 62);
  ctx.lineTo(w / 2 + 6, 65);
  ctx.stroke();
}

/// A clipped hedge: the park's own kind of street furniture.
function drawHedge(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(10,9,7,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 3, w / 2 - 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#33502f';
  roundRectPath(ctx, 0, 4, w, h - 8, 8);
  ctx.fill();

  for (let i = 0; i < 90; i++) {
    const x = Math.random() * w;
    const y = 6 + Math.random() * (h - 12);
    ctx.fillStyle = i % 3 === 0 ? '#4a7040' : i % 3 === 1 ? '#2a4428' : '#5c8a4e';
    ctx.fillRect(Math.floor(x), Math.floor(y), 3, 3);
  }

  // A few flowers showing through.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d8788a' : '#e8d06a';
    ctx.fillRect(8 + i * 18, 8 + ((i * 7) % (h - 18)), 4, 4);
  }
}

/// A vertical bar sign in neon, hung off the business district's walls.
function drawNeonSign(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  // Bracket back to the wall.
  ctx.fillStyle = '#20262c';
  ctx.fillRect(0, 6, w, 6);

  // The sign board.
  ctx.fillStyle = '#12171c';
  roundRectPath(ctx, 2, 12, w - 4, h - 16, 5);
  ctx.fill();

  // The glass tube inside it.
  const colours = ['#78dce8', '#f08cc8', '#f2c46a'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(8, 24 + i * 18, w - 16, 4);
  }

  const glow = ctx.createLinearGradient(0, 12, 0, h);
  glow.addColorStop(0, 'rgba(120,220,232,0.22)');
  glow.addColorStop(1, 'rgba(240,140,200,0.18)');
  ctx.fillStyle = glow;
  roundRectPath(ctx, 0, 10, w, h - 12, 6);
  ctx.fill();
}

function drawStreetLamp(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  // Base and post.
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(w * 0.5 - 5, h - 8, 10, 8);
  ctx.fillRect(w * 0.5 - 2, h * 0.16, 4, h - 22);

  // The arm and the head.
  ctx.fillRect(w * 0.5 - 2, h * 0.16, 10, 4);

  ctx.fillStyle = '#20242a';
  ctx.fillRect(w * 0.5 + 4, h * 0.18, 14, 8);

  ctx.fillStyle = 'rgba(242,196,106,0.9)';
  ctx.fillRect(w * 0.5 + 6, h * 0.2, 10, 3);

  // A soft halo round the head.
  const glow = ctx.createRadialGradient(w * 0.75, h * 0.22, 2, w * 0.75, h * 0.22, 18);
  glow.addColorStop(0, 'rgba(242,196,106,0.35)');
  glow.addColorStop(1, 'rgba(242,196,106,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(w * 0.75, h * 0.22, 18, 0, Math.PI * 2);
  ctx.fill();
}
