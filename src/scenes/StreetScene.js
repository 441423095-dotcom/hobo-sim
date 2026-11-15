// One district of the city at a time. The street always looks the same underneath
// — pavement, road and buildings — but each district brings its own bins,
// litter, walkers, colour and landmarks, and the city map lets the beggar move
// between them from the exits at either end of the street.

import { createGameArt } from '../art/index.js';
import { layoutFor } from '../layout.js';
import { haptic } from '../haptics.js';
import { FOODS } from '../food.js';
import { JUNK_ITEMS, JUNK_ORDER, TOOLS, junkPrice } from '../trade.js';
import { LOOT_ITEMS, LOOT_ORDER, lootPrice } from '../loot.js';
import { RECIPES, recipeById, amountOf, spendMaterial } from '../craft.js';
import { SHOPS, OUTFITS } from '../shops.js';
import { FURNITURE, HOME_SCENE_COMFORT } from '../home.js';
import { SEGMENTS, STEPS_PER_DAY, segmentOf, segmentName } from '../time.js';
import { COFFEE_PRICE, COFFEE_ENERGY, KICK_ENERGY, KICK_WANTED, SEEN_WANTED, BIN_SEARCH_MS } from '../vending.js';
import { SLOT_COST, SLOT_SYMBOLS, rollSlot } from '../gamble.js';
import {
  STREET_ORDER,
  STREET_WIDTH,
  STREET_HEIGHT,
  CITY_COLS,
  CITY_ROWS,
  SEAM,
  SEAM_WIDTH,
  cellOf,
  districtAt,
  neighbourOf
} from '../streets.js';
import {
  DISTRICTS,
  DISTRICT_ORDER,
  START_DISTRICT,
  STARTING_UNLOCKED
} from '../districts.js';
import { FONT, UI } from '../style.js';
import {
  WORLD,
  LEFT_BUILDINGS,
  RIGHT_BUILDINGS,
  STALL,
  WORKBENCH,
  PAWN,
  PED_LANES
} from '../world.js';

const SPEED = 134;
const HUNGER_MAX = 100;
const HUNGER_DRAIN = 0.42; // hunger points per second
const BEG_RADIUS = 100;
const TRADE_RADIUS = 80;

// Stealing: reach, how close a walker has to be before they get suspicious,
// and how long the hands stay still after an attempt.
const STEAL_RANGE = 60;
const SEEN_RANGE = 88;
const STEAL_COOLDOWN = 2200;
const FAIL_COOLDOWN = 3600;

// A hand caught in a pocket costs more than a hand caught on a purse: the
// walker keeps hold of it, and people remember the face.
const STEAL_ITEM_FAIL_ENERGY = 18;
const STEAL_ITEM_FAIL_WANTED = 6;

// Sneaking: the stick is pushed only a little, the player moves slowly, and
// nobody gets suspicious.
const SNEAK_MAG = 0.55;
const SNEAK_SPEED = 58;

// Energy: spent by running and by being caught, regained by food and by resting
// on the cardboard.
const ENERGY_MAX = 100;
const RUN_DRAIN = 1.25;
const SIT_RECOVER = 3.5;
const STEAL_FAIL_ENERGY = 12;
const CAUGHT_ENERGY = 15;

// The police on the beat: they walk their lane and see in a fan ahead of them.
const COP_SIGHT = 155;
const COP_HALF_ANGLE = 0.42;
const COP_SPEED = 42;
const COP_CHASE_SPEED = 118;
const COP_CHASE_TIME = 8000;
const COP_ALERT_RANGE = 320;

// Gang members take over a stretch of the black street: come close and they
// come for you, and catching you costs money and breath.
const GANG_AGGRO = 240;
const GANG_LEASH = 520;
const GANG_SPEED = 96;
const GANG_GRAB = 26;
const GANG_COOLDOWN = 9000;
const GANG_ENERGY = 12;

// How long the player can stand in the cold night before freezing.
const NIGHT_GRACE = 30000;

// The ends of the street, where the city map opens and the player can leave.
const EXIT_ZONES = {
  top: { x: 0, y: 16, w: WORLD.width, h: 96 },
  bottom: { x: 0, y: WORLD.height - 112, w: WORLD.width, h: 96 }
};

// Each kind of passer-by carries a different wallet, notices the player at a
// different rate, and is a different gamble to rob.
const PED_KINDS = {
  suit: {
    id: 'suit',
    tex: 'ped-suit',
    purse: [6, 16],
    base: 0.45,
    watch: 0.34,
    speed: [18, 27],
    loot: ['wallet', 'phone']
  },
  lady: {
    id: 'lady',
    tex: 'ped-lady',
    purse: [4, 12],
    base: 0.5,
    watch: 0.26,
    speed: [14, 22],
    loot: ['phone', 'wallet']
  },
  drunk: {
    id: 'drunk',
    tex: 'ped-drunk',
    purse: [2, 8],
    base: 0.7,
    watch: 0.14,
    speed: [9, 16],
    loot: ['cigarettes', 'snackbar']
  },
  rich: {
    id: 'rich',
    tex: 'ped-rich',
    purse: [18, 42],
    base: 0.3,
    watch: 0.42,
    speed: [20, 29],
    loot: ['phone', 'wallet']
  },
  gang: {
    id: 'gang',
    tex: 'ped-gang',
    purse: [3, 9],
    base: 0.35,
    watch: 0.5,
    speed: [16, 24],
    loot: ['cigarettes'],
    hostile: true
  }
};

// What some of the crowd are thinking while they walk.
const PED_THOUGHTS = {
  suit: ['今天的会又开不完了。', '老板还在群里 @ 我。', '工资什么时候到账。'],
  lady: ['这双鞋磨脚。', '晚上吃什么好呢。', '他昨天没回我消息。'],
  drunk: ['再来一瓶……', '我当年也阔过。', '这地怎么在晃。'],
  rich: ['又是没意义的一天。', '该换辆车了。', '这条街真脏。'],
  gang: ['这条街归我管。', '看什么看。', '今晚得收点东西。']
};

export class StreetScene extends Phaser.Scene {
  constructor() {
    super('Street');
  }

  /// A travel between districts restarts the scene with the district to build,
  /// the run state to carry over, and which end of the street to appear at.
  init(data) {
    const payload = data || {};

    this.pendingDistrict = payload.district || null;
    this.carriedRun = payload.run || null;
    this.spawnAt = payload.spawn === 'top' ? 'top' : 'bottom';
  }

  create() {
    createGameArt(this);

    this.district =
      DISTRICTS[this.pendingDistrict] ||
      DISTRICTS[this.registry.get('district')] ||
      DISTRICTS[START_DISTRICT];
    this.registry.set('district', this.district.id);

    this.run =
      this.carriedRun || {
        money: 0,
        hunger: HUNGER_MAX,
        day: 1,
        step: 0,
        dayStart: { begging: 0, scavenge: 0, stolen: 0, sold: 0 },
        wanted: 0,
        vendingKicked: {},
        energy: ENERGY_MAX,
        bag: 0,
        items: JUNK_ORDER.reduce((bagOfJunk, id) => {
          bagOfJunk[id] = 0;
          return bagOfJunk;
        }, {}),
        loot: LOOT_ORDER.reduce((pocket, id) => {
          pocket[id] = 0;
          return pocket;
        }, {}),
        goods: { scrap: 0, rope: 0, rag: 0, knife: 0, crowbar: 0 },
        blueprints: {},
        outfit: 'rags',
        tools: { lockpick: false, coat: false, glove: false, blade: false },
        booze: 0,
        perfume: 0,
        beggingIncome: 0,
        scavengeIncome: 0,
        stolenIncome: 0,
        soldIncome: 0,
        elapsed: 0,
        survived: 0,
        over: false,
        sitting: false
      };
    this.carriedRun = null;
    if (typeof this.run.elapsed !== 'number') this.run.elapsed = 0;
    if (typeof this.run.energy !== 'number') this.run.energy = ENERGY_MAX;
    if (!this.run.goods) {
      this.run.goods = { scrap: 0, rope: 0, rag: 0, knife: 0, crowbar: 0 };
    }
    if (!this.run.items) this.run.items = {};
    for (const id of JUNK_ORDER) {
      if (typeof this.run.items[id] !== 'number') this.run.items[id] = 0;
    }
    if (!this.run.loot) this.run.loot = {};
    for (const id of LOOT_ORDER) {
      if (typeof this.run.loot[id] !== 'number') this.run.loot[id] = 0;
    }
    if (!this.run.tools) this.run.tools = {};
    for (const id of ['lockpick', 'coat', 'glove', 'blade']) {
      if (typeof this.run.tools[id] !== 'boolean') this.run.tools[id] = false;
    }
    if (typeof this.run.booze !== 'number') this.run.booze = 0;
    if (typeof this.run.perfume !== 'number') this.run.perfume = 0;
    if (!this.run.blueprints) this.run.blueprints = {};
    if (!this.run.outfit) this.run.outfit = 'rags';
    if (typeof this.run.day !== 'number') this.run.day = 1;
    if (typeof this.run.step !== 'number') this.run.step = 0;
    if (!this.run.dayStart) {
      this.run.dayStart = {
        begging: this.run.beggingIncome || 0,
        scavenge: this.run.scavengeIncome || 0,
        stolen: this.run.stolenIncome || 0,
        sold: this.run.soldIncome || 0
      };
    }
    this.collapsing = false;
    this.searching = null;
    this.benchSpot = null;
    this.benchTime = 0;
    this.benchAsleep = false;
    if (typeof this.run.wanted !== 'number') this.run.wanted = 0;
    if (!this.run.vendingKicked) this.run.vendingKicked = {};

    this.layout = layoutFor(this.scale.width, this.scale.height);
    this.axes = { x: 0, y: 0 };
    this.peds = [];
    this.interactables = [];
    this.nearest = null;
    this.stealTarget = null;
    this.patrol = null;
    this.stealReadyAt = 0;
    this.walkT = 0;
    this.mapArmed = true;
    this.atExit = null;
    this.cops = [];
    this.qtePed = null;
    this.sneaking = false;
    this.energyWarned = false;
    this.alertExplained = false;
    this.loadHome();

    // The city is a grid of blocks: each district fills one cell, and the
    // streets of touching cells run into each other.
    this.pair = true;
    this.strips = STREET_ORDER.map((id, index) => {
      const cell = cellOf(id);

      return {
        id,
        index,
        col: cell.col,
        row: cell.row,
        x0: cell.col * STREET_WIDTH,
        y0: cell.row * STREET_HEIGHT,
        district: DISTRICTS[id]
      };
    });
    this.worldWidth = CITY_COLS * STREET_WIDTH;
    this.worldHeight = CITY_ROWS * STREET_HEIGHT;

    // Every left-right pair of blocks is joined by a passage through the
    // buildings; north-south neighbours share the street itself.
    this.passages = [];
    for (const strip of this.strips) {
      if (!neighbourOf(strip.id, 'east')) continue;

      this.passages.push({
        x: strip.x0 + STREET_WIDTH,
        y: strip.y0 + SEAM.y0
      });
    }

    this.edgeHint = '';
    this.deadEndUntil = 0;
    this.pedMs = this.district.pedMs;

    this.buildScenery();
    this.buildWalls();
    this.buildBins();
    this.buildLitter();
    this.buildMats();
    this.buildPlayer();
    this.buildCops();
    this.buildGangs();
    this.buildLandmarks();
    this.buildExits();
    this.buildStoreFronts();
    this.buildHome();
    this.buildVending();
    this.buildSlotMachines();
    this.buildBenches();
    if (this.strips.some((strip) => strip.district.shops)) this.buildShops();
    this.buildPrompt();

    this.nightDeadline = 0;
    this.lastSegment = segmentOf(this.run.step);
    this.applyNight();
    if (this.lastSegment === 3) this.nightDeadline = this.time.now + NIGHT_GRACE;

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.bins);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldWidth, this.worldHeight);
    cam.setBackgroundColor(0x191510);
    cam.startFollow(this.player, true, 0.14, 0.14);
    cam.centerOn(this.player.x, this.player.y);

    this.applyLayout();

    const onResize = (gameSize) => {
      this.layout = layoutFor(gameSize.width, gameSize.height);
      this.applyLayout();
    };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    this.time.addEvent({
      delay: this.pedMs,
      loop: true,
      callback: () => this.spawnPed(false)
    });
    for (let i = 0; i < 5; i++) this.spawnPed(true);

    this.registerVisit();

    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
  }

  // ---------------------------------------------------------------- building

  buildScenery() {
    for (const strip of this.strips) {
      this.add.image(strip.x0, strip.y0, 'ground').setOrigin(0, 0).setDepth(-40);
      this.add
        .image(strip.x0 + LEFT_BUILDINGS.x, strip.y0, 'bld-left')
        .setOrigin(0, 0)
        .setDepth(-30);
      this.add
        .image(strip.x0 + RIGHT_BUILDINGS.x, strip.y0, 'bld-right')
        .setOrigin(0, 0)
        .setDepth(-30);

      if (strip.district.tintAlpha > 0) {
        this.add
          .rectangle(
            strip.x0,
            strip.y0,
            STREET_WIDTH,
            STREET_HEIGHT,
            strip.district.tint,
            strip.district.tintAlpha
          )
          .setOrigin(0, 0)
          .setDepth(-26);
      }
    }

    // The holes in the grid are painted too, so the camera never looks out onto
    // nothing when the player stands at the edge of the city.
    for (let row = 0; row < CITY_ROWS; row++) {
      for (let col = 0; col < CITY_COLS; col++) {
        if (districtAt(col, row)) continue;

        const x = col * STREET_WIDTH;
        const y = row * STREET_HEIGHT;

        this.add.image(x, y, 'ground').setOrigin(0, 0).setDepth(-40);
        this.add
          .rectangle(x, y, STREET_WIDTH, STREET_HEIGHT, 0x0b0906, 0.85)
          .setOrigin(0, 0)
          .setDepth(-24);
      }
    }

    // The passages cut through the buildings between left and right blocks.
    for (const passage of this.passages) {
      this.add
        .image(passage.x - SEAM_WIDTH / 2, passage.y, 'passage')
        .setOrigin(0, 0)
        .setDepth(-29);
    }

    // The police sight fans are painted on the ground, under everyone else.
    this.coneGfx = this.add.graphics().setDepth(-6);

    // The bin-search progress bar, drawn above whatever is being searched.
    this.searchBarGfx = this.add.graphics().setDepth(5600);

    // Cold light of the evening and the night, over the whole city.
    this.nightOverlay = this.add
      .rectangle(0, 0, this.worldWidth, this.worldHeight, 0x0a1428, 0)
      .setOrigin(0, 0)
      .setDepth(-25);
  }

  stripFor(id) {
    return this.strips.find((strip) => strip.id === id) || null;
  }

  /// The block a point of the world is standing in.
  stripAt(x, y) {
    const col = Phaser.Math.Clamp(Math.floor(x / STREET_WIDTH), 0, CITY_COLS - 1);
    const row = Phaser.Math.Clamp(Math.floor(y / STREET_HEIGHT), 0, CITY_ROWS - 1);
    const id = districtAt(col, row);

    return (id && this.stripFor(id)) || this.strips[0];
  }

  /// A building wall runs the whole block unless a passage cuts through it.
  addBuildingWall(add, x, y0, w, gap) {
    if (!gap) {
      add(x, y0, w, STREET_HEIGHT);
      return;
    }

    add(x, y0, w, SEAM.y0);
    add(x, y0 + SEAM.y1, w, STREET_HEIGHT - SEAM.y1);
  }

  buildWalls() {
    this.walls = [];

    const add = (x, y, w, h) => {
      const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
      this.physics.add.existing(rect, true);
      this.walls.push(rect);
      return rect;
    };

    for (const strip of this.strips) {
      const leftGap = !!neighbourOf(strip.id, 'west');
      const rightGap = !!neighbourOf(strip.id, 'east');

      this.addBuildingWall(
        add,
        strip.x0 + LEFT_BUILDINGS.x,
        strip.y0,
        LEFT_BUILDINGS.width,
        leftGap
      );
      this.addBuildingWall(
        add,
        strip.x0 + RIGHT_BUILDINGS.x,
        strip.y0,
        RIGHT_BUILDINGS.width,
        rightGap
      );
    }

    // The junk stall's table is solid, so the player has to stand at the front
    // of it to trade.
    const market = this.stripFor('market');
    if (market) {
      add(STALL.x + market.x0 - 34, STALL.y + market.y0 - 26, 68, 26);
    }

    // The workbench outside the tent is solid too.
    const camp = this.stripFor('camp');
    if (camp) {
      add(WORKBENCH.x + camp.x0 - 30, WORKBENCH.y + camp.y0 - 26, 60, 26);
      add(camp.x0 + 240, camp.y0 + 432, 160, 92);
    }

    // Gates close off every way into a district that has not been unlocked yet.
    this.gates = [];
    const unlocked = this.unlockedList();
    const walkX = LEFT_BUILDINGS.x + LEFT_BUILDINGS.width;
    const walkW = RIGHT_BUILDINGS.x - walkX;

    // Where the city ends, the street ends too: a wall across the block so the
    // beggar cannot walk off into the void between blocks.
    for (const strip of this.strips) {
      if (!neighbourOf(strip.id, 'north')) {
        add(strip.x0 + walkX, strip.y0 - 8, walkW, 16);
      }

      if (!neighbourOf(strip.id, 'south')) {
        add(strip.x0 + walkX, strip.y0 + STREET_HEIGHT - 8, walkW, 16);
      }
    }

    for (const strip of this.strips) {
      if (unlocked.includes(strip.id)) continue;

      const gates = [];

      if (neighbourOf(strip.id, 'north')) {
        gates.push(add(strip.x0 + walkX, strip.y0 - 8, walkW, 16));
      }

      if (neighbourOf(strip.id, 'south')) {
        gates.push(add(strip.x0 + walkX, strip.y0 + STREET_HEIGHT - 8, walkW, 16));
      }

      if (neighbourOf(strip.id, 'west')) {
        gates.push(add(strip.x0 - 8, strip.y0 + SEAM.y0, 16, SEAM.y1 - SEAM.y0));
      }

      if (neighbourOf(strip.id, 'east')) {
        gates.push(
          add(strip.x0 + STREET_WIDTH - 8, strip.y0 + SEAM.y0, 16, SEAM.y1 - SEAM.y0)
        );
      }

      for (const rect of gates) this.gates.push({ id: strip.id, rect });
    }
  }

  /// Opening a district's gate when it unlocks.
  releaseGates(ids) {
    if (!this.gates || !ids.length) return;

    const remaining = [];
    for (const gate of this.gates) {
      if (ids.includes(gate.id)) {
        gate.rect.destroy();
        this.walls = this.walls.filter((wall) => wall !== gate.rect);
      } else {
        remaining.push(gate);
      }
    }
    this.gates = remaining;
  }

  buildBins() {
    this.bins = this.physics.add.staticGroup();

    for (const strip of this.strips) {
      for (const spot of strip.district.bins) {
        const x = spot.x + strip.x0;
        const y = spot.y + strip.y0;
        const bin = this.bins.create(x, y, 'bin');
        bin.setDepth(bin.y);
        bin.setData('charges', Phaser.Math.Between(2, 3));
        bin.setData('strip', strip.id);

        this.addInteractable({
          x,
          y,
          label: '翻垃圾桶',
          flash: () => this.flashSprite(bin),
          enabled: () => bin.getData('charges') > 0,
          use: () => this.searchBin(bin)
        });
      }
    }
  }

  buildLitter() {
    for (const strip of this.strips) {
      for (const spot of strip.district.litter) {
        const kind = JUNK_ITEMS[spot.kind];
        if (!kind) continue;

        const x = spot.x + strip.x0;
        const y = spot.y + strip.y0;
        const sprite = this.add.image(x, y, kind.tex).setDepth(y);

        this.tweens.add({
          targets: sprite,
          y: y - 3,
          duration: 1300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        const def = {
          x,
          y,
          label: `捡起${kind.name}·${kind.place}`,
          flash: () => this.flashSprite(sprite),
          use: () => this.pickUpLitter(sprite, def, { ...spot, x, y })
        };
        this.addInteractable(def);
      }
    }
  }

  buildMats() {
    for (const strip of this.strips) {
      for (const spot of strip.district.mats) {
        const x = spot.x + strip.x0;
        const y = spot.y + strip.y0;
        this.add.image(x, y, 'beg-mat').setDepth(y - 20);
        this.addInteractable({
          x,
          y,
          radius: 74,
          label: '坐下乞讨',
          use: () => this.sitDown({ ...spot, x, y })
        });
      }
    }
  }

  buildLandmarks() {
    for (const strip of this.strips) {
      for (const mark of strip.district.landmarks) {
        const ox = mark.ox === undefined ? 0.5 : mark.ox;
        const oy = mark.oy === undefined ? 1 : mark.oy;
        const y = mark.y + strip.y0;
        const depth = mark.depth === undefined ? y : mark.depth;

        this.add.image(mark.x + strip.x0, y, mark.tex).setOrigin(ox, oy).setDepth(depth);
      }
    }
  }

  buildPlayer() {
    const strip = this.stripFor(this.district.id) || this.strips[0];
    const spawnX = strip.x0 + 200;
    const spawnY = strip.y0 + (this.spawnAt === 'top' ? 150 : 1180);

    this.playerShadow = this.add.image(spawnX, spawnY + 18, 'shadow').setDepth(1);

    this.player = this.physics.add.sprite(spawnX, spawnY, this.poseTex('idle'));
    this.player.body.setSize(20, 14);
    this.player.body.setOffset(6, 32);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(this.player.y);

    this.bowl = this.add.image(0, 0, 'bowl').setVisible(false).setDepth(5);

    this.zzz = this.add
      .text(0, 0, 'z z z', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#cfc6b2',
        stroke: '#100d09',
        strokeThickness: 3
      })
      .setOrigin(0.5, 0.5)
      .setDepth(7000)
      .setVisible(false);

    // Every walker's suspicion is drawn here in one pass, above the crowd.
    this.alertGfx = this.add.graphics().setDepth(5500);
  }

  /// The officers on the beat for this district, each walking a lane and
  /// watching a fan ahead of them.
  buildCops() {
    this.cops = [];

    for (const strip of this.strips) {
      const count = strip.district.cops || 0;

      for (let i = 0; i < count; i++) {
        const laneX = strip.x0 + PED_LANES[i % PED_LANES.length];
        const y = strip.y0 + 300 + i * 300;

        const sprite = this.add.image(laneX, y, 'guard').setDepth(y);
        const baton = this.add.image(laneX + 11, y + 6, 'baton').setDepth(y + 1);
        const mark = this.add
          .text(laneX, y - 40, '!', {
            fontFamily: FONT,
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffe08a',
            stroke: '#100d09',
            strokeThickness: 4
          })
          .setOrigin(0.5, 0.5)
          .setDepth(8000)
          .setVisible(false);

        this.cops.push({
          sprite,
          baton,
          mark,
          laneX,
          stripId: strip.id,
          yMin: strip.y0 + 200,
          yMax: strip.y0 + 1240,
          dir: i % 2 === 0 ? 1 : -1,
          faceAngle: i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2,
          chasing: false,
          chaseUntil: 0
        });
      }
    }
  }

  buildExits() {
    // The seamless street has no exit gates: you simply walk across.
    if (this.pair) {
      this.exitZones = {};
      return;
    }

    this.exitZones = EXIT_ZONES;

    const zoneStyle = { fontFamily: FONT, fontSize: '12px', color: UI.creamDim };
    const labels = [
      { y: EXIT_ZONES.top.y + EXIT_ZONES.top.h / 2 },
      { y: EXIT_ZONES.bottom.y + EXIT_ZONES.bottom.h / 2 }
    ];

    for (const spot of labels) {
      this.add
        .rectangle(WORLD.width / 2, spot.y, WORLD.width, 96, 0xf2c46a, 0.05)
        .setDepth(1);
      this.add
        .text(WORLD.width / 2, spot.y, '街区出口 · 走到这里打开地图', zoneStyle)
        .setOrigin(0.5, 0.5)
        .setDepth(2)
        .setAlpha(0.65);
    }
  }

  buildShops() {
    const strip = this.stripFor('market');
    if (!strip) return;

    const ox = strip.x0;
    const oy = strip.y0;

    this.add.image(PAWN.x + ox, PAWN.y + oy, 'pawnshop').setOrigin(0, 0).setDepth(-28);
    this.add.image(STALL.x + ox, STALL.y + oy, 'stall').setOrigin(0.5, 1).setDepth(STALL.y + oy);
    this.add
      .image(STALL.vendorX + ox, STALL.vendorY + oy, 'ped-lady')
      .setDepth(STALL.vendorY + oy);

    this.addInteractable({
      x: STALL.x + ox,
      y: STALL.y + oy - 30,
      radius: TRADE_RADIUS,
      label: '旧货摊·卖废品',
      use: () => this.openTrade('stall')
    });

    this.addInteractable({
      x: PAWN.doorX + ox,
      y: PAWN.doorY + oy,
      radius: TRADE_RADIUS,
      label: '当铺·卖废品和工具',
      use: () => this.openTrade('pawn')
    });
  }

  /// Every shop front in this street, each with a door of its own on the
  /// pavement side.
  buildStoreFronts() {
    for (const strip of this.strips) {
      for (const shop of SHOPS) {
        if (shop.district !== strip.id) continue;

        this.add
          .image(shop.x + strip.x0, shop.y + strip.y0, shop.tex)
          .setOrigin(0, 0)
          .setDepth(-28);

        this.addInteractable({
          x: shop.doorX + strip.x0,
          y: shop.doorY + strip.y0,
          radius: shop.radius,
          label: `进${shop.name}`,
          use: () => this.openStore(shop.id)
        });
      }
    }
  }

  buildPrompt() {
    this.prompt = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.cream,
        backgroundColor: 'rgba(18,14,10,0.78)',
        padding: { x: 7, y: 4 }
      })
      .setOrigin(0.5, 1)
      .setDepth(6000)
      .setVisible(false);
  }

  addInteractable(def) {
    if (!def.radius) def.radius = 62;
    this.interactables.push(def);
  }

  // ------------------------------------------------------------------ public

  /// The HUD sticks its joystick here every time the thumb moves.
  setAxes(x, y) {
    if (this.run.over || this.run.sitting || this.benchSpot) {
      this.axes.x = 0;
      this.axes.y = 0;
      return;
    }
    this.axes.x = x;
    this.axes.y = y;
  }

  /// What the interact button would do, for the HUD's hint line.
  getHint() {
    if (this.run.over) return '';
    if (this.qtePed) return '';
    if (this.benchSpot) return this.benchAsleep ? '正在睡着…点一下起身' : '起身';
    if (this.run.sitting) return '起身';
    if (this.nearest) return this.nearest.label;
    if (this.seenByPolice()) return '警察正看着你，别动手';

    if (this.stealTarget) {
      if (this.run.energy <= 0) return '累得手都在抖，先歇会儿';
      if (this.time.now < this.stealReadyAt) return '刚动过手，先别急';
      return `偷钱袋（${this.stealTarget.purse} 元） · 轻拖靠近`;
    }

    if (this.atExit) return '街区出口 · 打开城市地图';

    return '沿路走走，轻拖可以潜行';
  }

  tryInteract() {
    if (this.run.over || this.searching) return;

    if (this.benchSpot) {
      this.standFromBench();
      haptic('ui');
      return;
    }

    if (this.run.sitting) {
      this.standUp();
      haptic('ui');
      return;
    }

    if (!this.nearest) {
      haptic('refuse');
      return;
    }

    if (this.nearest.flash) this.nearest.flash();
    this.nearest.use();
  }

  /// A quick white blink on whatever the player just used.
  flashSprite(sprite) {
    if (!sprite || !sprite.setTintFill) return;

    sprite.setTintFill(0xffffff);

    this.time.delayedCall(80, () => {
      if (sprite.active) sprite.clearTint();
    });
  }

  canSteal() {
    if (this.run.over || this.run.sitting || this.searching || this.benchSpot) return false;
    if (this.qtePed) return false;
    if (this.run.energy <= 0) return false;
    if (this.time.now < this.stealReadyAt) return false;
    if (this.seenByPolice() && !this.run.tools.blade) return false;
    return !!this.stealTarget;
  }

  /// The green window of the QTE. A hand slid into a pocket is the easier lift —
  /// a wider, slower window — while a jumpy walker closes either one, and the
  /// tools bought at the pawn shop widen them.
  stealZone(ped, mode) {
    const district = (ped.strip && ped.strip.district) || this.district;
    const asItem = mode === 'item';

    let width = (asItem ? 0.46 : 0.34) - ped.alert * 0.2;
    if (this.run.tools.lockpick) width += 0.1;
    if (this.run.tools.coat) width += 0.04;

    // The torn glove makes every window a fifth wider.
    if (this.run.tools.glove) width *= 1.2;

    // A watched street closes the window: the commercial district is nearly
    // hopeless, the slum a touch easier than the rest.
    width *= district.stealZone || 1;
    width = Phaser.Math.Clamp(width, 0.1, asItem ? 0.6 : 0.5);

    const start = Phaser.Math.FloatBetween(0.1, Math.max(0.12, 0.9 - width));

    // The blade opens a golden sliver in the middle of the window.
    const perfectWidth = this.run.tools.blade ? width * 0.4 : 0;
    const perfectStart = perfectWidth > 0 ? start + (width - perfectWidth) / 2 : 0;

    let speed = (0.8 + ped.alert * 0.9) * (district.stealSpeed || 1) * (asItem ? 0.82 : 1);

    // A shot of liquor steadies the next hand, and only the next one.
    if (this.run.booze > 0) speed *= 0.7;

    return {
      mode: asItem ? 'item' : 'money',
      zoneStart: start,
      zoneWidth: width,
      perfectStart,
      perfectWidth,
      speed
    };
  }

  /// What can be taken off the passer-by right now, for the HUD's choice panel.
  stealOptions() {
    const ped = this.stealTarget;
    if (!ped) return null;

    return {
      purse: ped.purse,
      loot: ped.loot && !ped.lootTaken ? ped.loot : null
    };
  }

  /// Reaching for a wallet or into a pocket opens the QTE panel; the HUD calls
  /// back with the result of the player's tap.
  trySteal(mode) {
    if (this.run.over || this.run.sitting || this.qtePed || this.searching) return;

    if (this.seenByPolice() && !this.run.tools.blade) {
      haptic('refuse');
      this.floatText(this.player.x, this.player.y - 44, '警察正看着你', '#f0a08a');
      return;
    }

    if (this.run.energy <= 0) {
      haptic('refuse');
      this.floatText(this.player.x, this.player.y - 44, '太累了，手在抖', UI.creamDim);
      return;
    }

    if (this.time.now < this.stealReadyAt) {
      haptic('refuse');
      return;
    }

    const ped = this.stealTarget;
    if (!ped) {
      haptic('refuse');
      return;
    }

    const asItem = mode === 'item';

    if (asItem && (!ped.loot || ped.lootTaken)) {
      haptic('refuse');
      this.floatText(ped.sprite.x, ped.sprite.y - 34, '口袋里空了', UI.creamDim);
      return;
    }

    if (!asItem && ped.purse <= 0) {
      haptic('refuse');
      this.floatText(ped.sprite.x, ped.sprite.y - 34, '钱袋已经瘪了', UI.creamDim);
      return;
    }

    const hud = this.scene.get('Hud');
    if (!hud || !hud.startQte || !this.scene.isActive('Hud')) return;

    this.stealMode = asItem ? 'item' : 'money';
    this.qtePed = ped;

    const zone = this.stealZone(ped, this.stealMode);

    if (this.run.booze > 0) {
      this.run.booze = 0;
      this.floatText(this.player.x, this.player.y - 52, '酒劲上来，手稳了些', '#c9a8e6');
    }

    hud.startQte(zone);
  }

  /// A bottle of perfume skips the QTE entirely: the mark's eyes go soft and
  /// everything worth taking goes with the beggar.
  perfumeSteal() {
    if (this.run.over || !this.run.perfume) return false;

    const ped = this.stealTarget;
    if (!ped) return false;
    if (this.time.now < this.stealReadyAt) return false;

    const hadMoney = ped.purse > 0;
    const lootId = ped.loot && !ped.lootTaken ? ped.loot : null;
    if (!hadMoney && !lootId) return false;

    this.run.perfume -= 1;
    this.stealReadyAt = this.time.now + STEAL_COOLDOWN;
    ped.alert = 1;

    if (hadMoney) {
      const amount = ped.purse;
      ped.purse = 0;
      this.run.money += amount;
      this.run.stolenIncome += amount;
    }

    if (lootId) {
      ped.lootTaken = true;
      this.addLoot(lootId, ped.sprite.x, ped.sprite.y - 10);
    }

    this.advanceTime(1);
    haptic('steal');
    this.floatText(ped.sprite.x, ped.sprite.y - 34, '香水一散，他眼神就软了', '#c9a8e6');
    return true;
  }

  resolveSteal(result) {
    const ped = this.qtePed;
    const mode = this.stealMode || 'money';
    const perfect = result === 'perfect';
    const success = result === 'perfect' || result === 'good';

    this.qtePed = null;
    this.stealMode = null;

    if (!ped || this.run.over) return;

    this.advanceTime(1);

    if (success && mode === 'item') {
      const id = ped.loot;

      ped.lootTaken = true;
      ped.alert = 1;
      this.stealReadyAt = this.time.now + STEAL_COOLDOWN;
      this.addLoot(id, ped.sprite.x, ped.sprite.y - 10);

      // A clean cut through a pocket takes the purse along with it.
      if (perfect && ped.purse > 0) {
        const extra = ped.purse;
        ped.purse = 0;
        this.run.money += extra;
        this.run.stolenIncome += extra;
        this.floatText(ped.sprite.x, ped.sprite.y - 46, `连钱包一起 ${extra} 元`, UI.gold);
      }

      if (perfect) this.stayQuiet(ped);
      haptic('steal');
      return;
    }

    if (success) {
      const amount = perfect ? ped.purse * 2 : ped.purse;
      ped.purse = 0;
      ped.alert = 1;

      this.run.money += amount;
      this.run.stolenIncome += amount;
      this.stealReadyAt = this.time.now + STEAL_COOLDOWN;

      const coin = this.add.image(ped.sprite.x, ped.sprite.y - 10, 'coin').setDepth(7000);
      this.tweens.add({
        targets: coin,
        x: this.player.x,
        y: this.player.y + 8,
        duration: 320,
        ease: 'Quad.easeIn',
        onComplete: () => coin.destroy()
      });

      this.floatText(
        ped.sprite.x,
        ped.sprite.y - 30,
        perfect ? `完美一刀 ${amount} 元` : `摸到 ${amount} 元`,
        UI.gold
      );

      if (perfect) this.stayQuiet(ped);
      else this.caughtInTheAct();

      haptic('steal');
      return;
    }

    if (mode === 'item') {
      // A hand in a pocket is caught at the wrist: the walker keeps hold of it
      // and shouts, and the whole street turns to look.
      this.stealReadyAt = this.time.now + FAIL_COOLDOWN;
      ped.alert = 1;
      this.run.energy = Math.max(0, this.run.energy - STEAL_ITEM_FAIL_ENERGY);
      this.addWanted(STEAL_ITEM_FAIL_WANTED);

      this.floatText(ped.sprite.x, ped.sprite.y - 34, '被抓住了手腕！', '#f0b0a0');
      haptic('caught');

      for (const other of this.peds) {
        if (other !== ped) other.alert = Math.min(1, other.alert + 0.35);
      }

      if (this.startPursuit()) return;

      this.floatText(this.player.x, this.player.y - 42, '没得手', UI.creamDim);
      return;
    }

    this.stealReadyAt = this.time.now + FAIL_COOLDOWN;
    ped.alert = 1;
    ped.startled = true;
    this.run.energy = Math.max(0, this.run.energy - STEAL_FAIL_ENERGY);

    this.floatText(ped.sprite.x, ped.sprite.y - 34, '干什么！', '#f0b0a0');
    haptic('stealFail');

    for (const other of this.peds) {
      if (other !== ped) other.alert = Math.min(1, other.alert + 0.35);
    }

    // A botched lift in front of an officer turns into a chase right away.
    if (this.startPursuit()) return;

    this.floatText(this.player.x, this.player.y - 42, '没得手', UI.creamDim);
  }

  /// The blade's perfect cut: nobody in the crowd noticed, and no officer on the
  /// beat is any the wiser.
  stayQuiet(ped) {
    for (const other of this.peds) {
      if (other === ped) continue;
      other.alert = Math.max(0, other.alert - 0.2);
    }
  }

  /// A lift that went through in full view: the money is the beggar's, the walk
  /// away from it is not.
  caughtInTheAct() {
    if (this.seenByPolice()) this.startPursuit();
  }

  buyFood(id) {
    const food = FOODS.find((f) => f.id === id);
    if (!food || this.run.over) return false;
    if (this.run.money < food.price) return false;

    this.run.money -= food.price;
    this.run.hunger = Math.min(HUNGER_MAX, this.run.hunger + food.restore);
    this.run.energy = Math.min(ENERGY_MAX, this.run.energy + (food.energy || 0));
    haptic('buy');
    this.floatText(this.player.x, this.player.y - 46, `${food.name} +${food.restore}`, '#a8d98a');
    return true;
  }

  sellJunk(id, atPawn) {
    if (!JUNK_ITEMS[id]) return false;
    if (!this.run.items[id] || this.run.items[id] <= 0) return false;

    const price = junkPrice(id, atPawn);
    this.run.items[id] -= 1;
    this.run.money += price;
    this.run.soldIncome += price;
    this.refreshBagCount();
    this.floatText(this.player.x, this.player.y - 46, `+${price} 元`, UI.gold);
    return true;
  }

  /// Something lifted out of a pocket goes into the bag, not into coins.
  addLoot(id, x, y) {
    const item = LOOT_ITEMS[id];
    if (!item) return;

    this.run.loot[id] = (this.run.loot[id] || 0) + 1;
    this.refreshBagCount();
    haptic('pickup');
    this.floatText(x, y, `顺手：${item.name}`, '#e8dcc2');
  }

  sellLoot(id, atPawn) {
    if (!LOOT_ITEMS[id]) return false;
    if (!this.run.loot[id] || this.run.loot[id] <= 0) return false;

    const price = lootPrice(id, atPawn);
    this.run.loot[id] -= 1;
    this.run.money += price;
    this.run.soldIncome += price;
    this.refreshBagCount();
    this.floatText(this.player.x, this.player.y - 46, `+${price} 元`, UI.gold);
    return true;
  }

  /// Cigarettes and food out of a pocket can be used on the spot instead of
  /// being carried to the stall.
  useLoot(id) {
    const item = LOOT_ITEMS[id];
    if (!item || this.run.over) return false;
    if (!this.run.loot[id] || this.run.loot[id] <= 0) return false;
    if (!item.hunger && !item.energy) return false;

    this.run.loot[id] -= 1;

    if (item.hunger) this.run.hunger = Math.min(HUNGER_MAX, this.run.hunger + item.hunger);
    if (item.energy) this.run.energy = Math.min(ENERGY_MAX, this.run.energy + item.energy);

    this.refreshBagCount();
    this.floatText(this.player.x, this.player.y - 46, `${item.name} · ${item.use}`, '#a8d98a');
    return true;
  }

  sellAllJunk(atPawn) {
    let total = 0;

    for (const id of JUNK_ORDER) {
      while (this.run.items[id] > 0) {
        this.run.items[id] -= 1;
        total += junkPrice(id, atPawn);
      }
    }

    if (total > 0) {
      this.run.money += total;
      this.run.soldIncome += total;
      this.refreshBagCount();
      this.floatText(this.player.x, this.player.y - 46, `+${total} 元`, UI.gold);
    }

    return total;
  }

  buyTool(id) {
    const tool = TOOLS.find((t) => t.id === id);
    if (!tool || this.run.over) return false;
    if (this.run.tools[id]) return false;
    if (this.run.money < tool.price) return false;

    this.run.money -= tool.price;
    this.run.tools[id] = true;
    haptic('buy');
    this.floatText(this.player.x, this.player.y - 46, `买下${tool.name}`, '#a8d98a');
    return true;
  }

  restartRun() {
    this.scene.restart();
  }

  // ---------------------------------------------------------------- crafting

  /// True when the recipe is known and the bag holds everything it needs.
  canCraft(rec) {
    if (rec.blueprint && !this.run.blueprints[rec.id]) return false;
    for (const id of Object.keys(rec.need)) {
      if (amountOf(this.run, id) < rec.need[id]) return false;
    }
    return true;
  }

  /// Returns 'ok', 'locked' or 'short' so the panel can say what happened.
  craft(id) {
    const rec = recipeById(id);
    if (!rec || this.run.over) return 'locked';
    if (rec.blueprint && !this.run.blueprints[rec.id]) return 'locked';

    for (const mat of Object.keys(rec.need)) {
      if (amountOf(this.run, mat) < rec.need[mat]) return 'short';
    }

    for (const mat of Object.keys(rec.need)) {
      spendMaterial(this.run, mat, rec.need[mat]);
    }

    this.run.goods[rec.id] = (this.run.goods[rec.id] || 0) + 1;
    this.refreshBagCount();
    this.floatText(this.player.x, this.player.y - 46, `合成了 ${rec.name}`, '#a8d98a');
    return 'ok';
  }

  sellGood(id) {
    const rec = recipeById(id);
    if (!rec) return false;
    if (!this.run.goods[id] || this.run.goods[id] <= 0) return false;

    this.run.goods[id] -= 1;
    this.run.money += rec.value;
    this.run.soldIncome += rec.value;
    this.floatText(this.player.x, this.player.y - 46, `+${rec.value} 元`, UI.gold);
    return true;
  }

  openCraft() {
    const hud = this.scene.get('Hud');
    if (hud && hud.openCraft && this.scene.isActive('Hud')) hud.openCraft();
  }

  // -------------------------------------------------------------- the city

  unlockedList() {
    const stored = this.registry.get('unlocked');
    if (Array.isArray(stored)) return stored;

    const initial = STARTING_UNLOCKED.slice();
    this.registry.set('unlocked', initial);
    return initial;
  }

  /// Arriving in a district marks it visited, and a visit unlocks whatever the
  /// city data hangs off it.
  registerVisit() {
    const unlocked = this.unlockedList();

    const visited = Array.isArray(this.registry.get('visited'))
      ? this.registry.get('visited')
      : [];
    if (!visited.includes(this.district.id)) visited.push(this.district.id);
    this.registry.set('visited', visited);

    const newly = [];
    for (const id of DISTRICT_ORDER) {
      const data = DISTRICTS[id];
      if (!data.unlockAfter) continue;
      if (unlocked.includes(id)) continue;
      if (visited.includes(data.unlockAfter)) newly.push(id);
    }

    if (!newly.length) return;

    unlocked.push(...newly);
    this.registry.set('unlocked', unlocked);
    this.releaseGates(newly);

    this.time.delayedCall(500, () => {
      const hud = this.scene.get('Hud');
      const names = newly.map((id) => DISTRICTS[id].name).join('、');
      if (hud && hud.showToast) hud.showToast(`新区域解锁：${names}`);
    });

    haptic('unlock');
  }

  /// Called by the city map when a district is picked.
  travelTo(id) {
    if (!DISTRICTS[id] || id === this.district.id) return;
    if (!this.unlockedList().includes(id)) return;

    this.scene.restart({
      district: id,
      run: this.run,
      spawn: this.atExit === 'top' ? 'top' : 'bottom'
    });
  }

  checkExit() {
    if (this.run.over || this.run.sitting) return;

    if (this.pair) {
      this.checkSeam();
      return;
    }

    let inside = null;
    for (const id of Object.keys(this.exitZones)) {
      const zone = this.exitZones[id];
      if (
        this.player.x >= zone.x &&
        this.player.x <= zone.x + zone.w &&
        this.player.y >= zone.y &&
        this.player.y <= zone.y + zone.h
      ) {
        inside = id;
        break;
      }
    }

    if (!inside) {
      this.atExit = null;
      this.mapArmed = true;
      return;
    }

    this.atExit = inside;

    if (!this.mapArmed) return;
    this.mapArmed = false;

    const hud = this.scene.get('Hud');
    if (hud && hud.openMap && this.scene.isActive('Hud')) hud.openMap();
  }

  /// The block of the city the player is standing in.
  currentStrip() {
    return this.stripAt(this.player.x, this.player.y);
  }

  isSeamless() {
    return true;
  }

  getEdgeHint() {
    return this.edgeHint || '';
  }

  /// Keeps the HUD's district name in step with the block the beggar is in,
  /// names the way through to the next block, and complains when they walk
  /// into the edge of the city.
  checkSeam() {
    const px = this.player.x;
    const py = this.player.y;

    const nearEnd =
      px < 132 || px > this.worldWidth - 132 || py < 132 || py > this.worldHeight - 132;

    if (nearEnd && this.time.now > this.deadEndUntil) {
      this.deadEndUntil = this.time.now + 6000;
      const hud = this.scene.get('Hud');
      if (hud && hud.showToast) hud.showToast('前面是死胡同，走不通了。');
    }

    const strip = this.currentStrip();
    if (strip && strip.district !== this.district) this.district = strip.district;

    this.edgeHint = '';
    if (!strip) return;

    const reach = 150;
    const toX = px - strip.x0;
    const toY = py - strip.y0;

    if (toX < reach) {
      const id = neighbourOf(strip.id, 'west');
      if (id) this.edgeHint = `⬅️ 前往${DISTRICTS[id].name}`;
    } else if (toX > STREET_WIDTH - reach) {
      const id = neighbourOf(strip.id, 'east');
      if (id) this.edgeHint = `➡️ 前往${DISTRICTS[id].name}`;
    } else if (toY < reach) {
      const id = neighbourOf(strip.id, 'north');
      if (id) this.edgeHint = `⬆️ 前往${DISTRICTS[id].name}`;
    } else if (toY > STREET_HEIGHT - reach) {
      const id = neighbourOf(strip.id, 'south');
      if (id) this.edgeHint = `⬇️ 前往${DISTRICTS[id].name}`;
    }
  }

  // --------------------------------------------------------------- gameplay

  pickUpLitter(sprite, def, spot) {
    this.interactables = this.interactables.filter((d) => d !== def);
    this.tweens.killTweensOf(sprite);
    sprite.destroy();
    this.addToBag(spot.kind, spot.x, spot.y - 20);
  }

  addToBag(id, x, y) {
    const item = JUNK_ITEMS[id];
    if (!item) return;

    this.run.items[id] += 1;
    this.refreshBagCount();
    haptic('pickup');
    this.floatText(x, y, `+${item.name}·${item.place}`, '#e8dcc2');
  }

  refreshBagCount() {
    this.run.bag =
      JUNK_ORDER.reduce((total, id) => total + this.run.items[id], 0) +
      LOOT_ORDER.reduce((total, id) => total + (this.run.loot[id] || 0), 0);
  }

  sitDown(spot) {
    if (this.run.sitting || this.run.over) return;

    this.run.sitting = true;
    this.advanceTime(1);
    this.axes.x = 0;
    this.axes.y = 0;
    this.player.body.setVelocity(0, 0);
    this.player.setPosition(spot.x, spot.y - 12);
    this.player.setTexture(this.poseTex('sit'));
    this.player.setFlipX(false);
    this.player.setDepth(this.player.y);

    this.bowl
      .setPosition(spot.x + 16, spot.y + 8)
      .setVisible(true)
      .setDepth(spot.y + 1);

    haptic('ui');
  }

  standUp() {
    if (!this.run.sitting) return;

    this.run.sitting = false;
    this.player.setTexture(this.poseTex('idle'));
    this.bowl.setVisible(false);
  }

  /// The bridge nook only exists in the back alley: a curtained opening under
  /// the bridge you can crawl into.
  buildSlotMachines() {
    for (const strip of this.strips) {
      for (const spot of strip.district.slots || []) {
        const x = spot.x + strip.x0;
        const y = spot.y + strip.y0;

        this.add.image(x, y, 'slotmachine').setOrigin(0.5, 1).setDepth(y);

        this.addInteractable({
          x: x - 6,
          y: y - 30,
          radius: 70,
          label: '老虎机·拉一把 10 元',
          use: () => this.openSlot()
        });
      }
    }
  }

  buildBenches() {
    for (const strip of this.strips) {
      for (const spot of strip.district.benches || []) {
        const x = spot.x + strip.x0;
        const y = spot.y + strip.y0;

        this.add.image(x, y, 'bench').setOrigin(0.5, 1).setDepth(y);

        this.addInteractable({
          x,
          y: y - 14,
          radius: 70,
          label: '长椅·坐一会儿',
          use: () => this.sitOnBench({ ...spot, x, y })
        });
      }
    }
  }

  // ------------------------------------------------------------ the slot machine

  openSlot() {
    const hud = this.scene.get('Hud');
    if (hud && hud.openSlot && this.scene.isActive('Hud')) hud.openSlot();
  }

  /// Rolls a pull that has not been paid for yet; the HUD animates the reels.
  spinSlot() {
    if (this.run.money < SLOT_COST) return null;
    return rollSlot();
  }

  settleSlot(result) {
    if (!result) return false;

    this.run.money -= SLOT_COST;
    this.run.money += result.payout;

    if (result.payout > 0) {
      this.floatText(this.player.x, this.player.y - 46, `中奖 +${result.payout} 元`, UI.gold);
      haptic(result.tier === 'jackpot' ? 'jackpot' : 'coin');
    } else {
      haptic('refuse');
    }

    return true;
  }

  // ----------------------------------------------------------------- the bench

  sitOnBench(spot) {
    if (this.run.over || this.run.sitting || this.benchSpot) return;

    this.benchSpot = spot;
    this.benchTime = 0;
    this.benchAsleep = false;
    this.axes.x = 0;
    this.axes.y = 0;
    if (this.player.body) this.player.body.setVelocity(0, 0);
    this.player.setPosition(spot.x, spot.y - 10);
    this.player.setTexture(this.poseTex('sit'));
    haptic('ui');
  }

  standFromBench() {
    if (!this.benchSpot) return;

    this.benchSpot = null;
    this.benchAsleep = false;
    this.benchTime = 0;
    this.zzz.setVisible(false);
    this.player.setTexture(this.poseTex('idle'));
  }

  /// Asleep on a bench with your pockets open: someone always walks past.
  checkBenchTheft(dt) {
    for (const ped of this.peds) {
      if (ped.robbed || ped.startled) continue;

      const d = Phaser.Math.Distance.Between(
        ped.sprite.x,
        ped.sprite.y,
        this.player.x,
        this.player.y
      );
      if (d > 80) continue;
      if (Math.random() > dt * 1.1) continue;

      ped.robbed = true;
      const amount = Math.floor(this.run.money * 0.3);
      this.run.money -= amount;
      this.benchAsleep = false;
      this.benchTime = 0;
      this.zzz.setVisible(false);
      this.floatText(
        this.player.x,
        this.player.y - 44,
        amount > 0 ? `被摸走 ${amount} 元` : '有人在翻你的口袋',
        '#f0a08a'
      );
      haptic('refuse');
      return;
    }
  }

  buildVending() {
    this.vendingMachines = [];

    for (const strip of this.strips) {
      for (const spot of strip.district.vending || []) {
        const x = spot.x + strip.x0;
        const y = spot.y + strip.y0;

        this.add.image(x, y, 'vending').setOrigin(0.5, 1).setDepth(y);

        const key = `${strip.id}:${spot.x}:${spot.y}`;
        this.vendingMachines.push({ key, x, y });

        this.addInteractable({
          x: x - 8,
          y: y - 34,
          radius: 70,
          label: '自动售货机',
          use: () => this.openVending(key)
        });
      }
    }
  }

  /// The bin search: two seconds of digging, broken off the moment an officer's
  /// sight fan touches the player.
  searchBin(bin) {
    if (this.searching) return;

    const charges = bin.getData('charges') || 0;
    if (charges <= 0) {
      haptic('refuse');
      return;
    }

    this.searching = { bin, endAt: this.time.now + BIN_SEARCH_MS };
    this.axes.x = 0;
    this.axes.y = 0;
    if (this.player.body) this.player.body.setVelocity(0, 0);
    haptic('dig');
  }

  finishBin(bin) {
    this.searching = null;
    this.searchBarGfx.clear();

    const charges = bin.getData('charges') || 0;
    if (charges <= 0) return;

    bin.setData('charges', charges - 1);
    this.advanceTime(1);

    this.tweens.add({
      targets: bin,
      angle: 4,
      duration: 90,
      yoyo: true,
      repeat: 2,
      onComplete: () => bin.setAngle(0)
    });

    if (this.run.over) return;

    // Now and then a blueprint is stuffed in with the rubbish.
    const locked = RECIPES.filter((r) => r.blueprint && !this.run.blueprints[r.id]);
    if (locked.length && Math.random() < 0.12) {
      const rec = locked[Math.floor(Math.random() * locked.length)];
      this.run.blueprints[rec.id] = true;
      this.floatText(bin.x, bin.y - 36, `找到图纸：${rec.name}`, UI.gold);
      const hud = this.scene.get('Hud');
      if (hud && hud.showToast) hud.showToast(`找到图纸：${rec.name}`);
      haptic('coin');
      return;
    }

    const roll = Math.random();

    if (roll < 0.2) {
      this.run.energy = Math.min(ENERGY_MAX, this.run.energy + 18);
      this.floatText(bin.x, bin.y - 36, '半块面包 +精力', '#a8d98a');
      haptic('pickup');
      return;
    }

    if (roll < 0.54) {
      const amount = Phaser.Math.Between(1, 3);
      this.run.money += amount;
      this.run.scavengeIncome += amount;
      this.floatText(bin.x, bin.y - 36, `翻到 ${amount} 元`, UI.gold);
      haptic('coin');
      return;
    }

    // What a bin holds depends on the stretch of street it stands on.
    const strip = this.stripFor(bin.getData('strip')) || this.currentStrip();
    const pool = (strip && strip.district.junk) || JUNK_ORDER;
    const loot = pool[Math.floor(Math.random() * pool.length)];

    this.addToBag(loot, bin.x, bin.y - 36);
  }

  interruptBinSearch() {
    if (!this.searching) return;

    this.searching = null;
    this.searchBarGfx.clear();
    this.addWanted(SEEN_WANTED);
    this.floatText(this.player.x, this.player.y - 46, '警察看过来了！', '#f0a08a');
    haptic('refuse');
  }

  drawSearchBar() {
    const g = this.searchBarGfx;
    g.clear();

    if (!this.searching) return;

    const bin = this.searching.bin;
    const left = Math.max(0, this.searching.endAt - this.time.now);
    const progress = Phaser.Math.Clamp(1 - left / BIN_SEARCH_MS, 0, 1);
    const x = bin.x - 24;
    const y = bin.y - 64;

    g.fillStyle(0x14110d, 0.85);
    g.fillRoundedRect(x - 2, y - 2, 52, 12, 4);
    g.fillStyle(0xf2c46a, 1);
    g.fillRoundedRect(x, y, 48 * progress, 8, 3);
  }

  // ------------------------------------------------------------ the machines

  openVending(key) {
    const hud = this.scene.get('Hud');
    if (hud && hud.openVending && this.scene.isActive('Hud')) hud.openVending(key);
  }

  buyCoffee(key) {
    if (this.run.over) return false;
    if (this.run.money < COFFEE_PRICE) return false;

    this.run.money -= COFFEE_PRICE;
    this.run.energy = Math.min(ENERGY_MAX, this.run.energy + COFFEE_ENERGY);
    this.floatText(this.player.x, this.player.y - 46, '一罐咖啡下肚', '#a8d98a');
    haptic('buy');
    return true;
  }

  kickVending(key) {
    if (this.run.over) return false;
    if (this.run.vendingKicked[key]) return false;

    this.run.vendingKicked[key] = true;
    this.run.energy = Math.min(ENERGY_MAX, this.run.energy + KICK_ENERGY);
    this.addWanted(KICK_WANTED);
    this.cameras.main.shake(160, 0.004);
    this.floatText(this.player.x, this.player.y - 46, '白拿了一罐饮料', '#a8d98a');
    haptic('impact');

    // The racket brings any officer nearby running.
    this.startPursuit();
    return true;
  }

  addWanted(amount) {
    this.run.wanted = Phaser.Math.Clamp((this.run.wanted || 0) + amount, 0, 100);
  }

  /// How far the police can actually see: a wanted man draws their eye.
  copSight() {
    return COP_SIGHT * (1 + (this.run.wanted || 0) / 150);
  }

  buildHome() {
    const strip = this.stripFor('camp');
    if (!strip) return;

    const x = strip.x0 + 320;
    const oy = strip.y0;

    this.add.image(x, 560 + oy, 'tent').setOrigin(0.5, 1).setDepth(560 + oy);

    this.addInteractable({
      x,
      y: 544 + oy,
      radius: 84,
      label: '进帐篷（家）',
      use: () => this.openHome()
    });

    // The workbench stands just outside the tent door.
    const benchX = strip.x0 + WORKBENCH.x;

    this.add
      .image(benchX, WORKBENCH.y + oy, 'workbench')
      .setOrigin(0.5, 1)
      .setDepth(WORKBENCH.y + oy);

    this.addInteractable({
      x: benchX - 5,
      y: WORKBENCH.y + oy - 32,
      radius: 76,
      label: '工作台·合成',
      use: () => this.openCraft()
    });
  }

  loadHome() {
    const stored = this.registry.get('homePlaced');
    this.homePlaced = stored && typeof stored === 'object' ? { ...stored } : {};

    // A beggar always starts with a bed: a flattened cardboard box on the
    // floor of the tent, worth almost nothing but enough to lie down on.
    for (const item of FURNITURE) {
      if (item.starter && !this.homePlaced[item.slot]) this.homePlaced[item.slot] = item.id;
    }

    this.registry.set('homePlaced', { ...this.homePlaced });
  }

  homeComfort() {
    return FURNITURE.reduce(
      (total, item) => total + (this.homePlaced[item.slot] === item.id ? item.comfort : 0),
      0
    );
  }

  /// What the house can do with a piece of furniture right now.
  furnitureState(item) {
    if (this.homePlaced[item.slot] === item.id) return 'owned';

    if (item.price > 0) return this.run.money >= item.price ? 'ok' : 'poor';

    for (const id of Object.keys(item.need)) {
      if (amountOf(this.run, id) < item.need[id]) return 'short';
    }
    return 'ok';
  }

  placeFurniture(item) {
    if (this.run.over) return 'short';

    const state = this.furnitureState(item);
    if (state !== 'ok') return state;

    if (item.price > 0) {
      this.run.money -= item.price;
    } else {
      for (const id of Object.keys(item.need)) {
        spendMaterial(this.run, id, item.need[id]);
      }
      this.refreshBagCount();
    }

    this.homePlaced[item.slot] = item.id;
    this.registry.set('homePlaced', { ...this.homePlaced });
    haptic('craft');
    this.floatText(this.player.x, this.player.y - 46, `摆好了${item.name}`, '#a8d98a');

    // Enough furniture turns the nook into something worth calling home.
    if (!this.registry.get('homeScene') && this.homeComfort() >= HOME_SCENE_COMFORT) {
      this.registry.set('homeScene', true);
      haptic('unlock');

      const hud = this.scene.get('Hud');
      if (hud && hud.showToast) {
        hud.showToast('火堆噼啪响着，你第一次觉得这个帐篷像个家。');
      }
    }

    return 'ok';
  }

  /// True once the evening sets in: that is when the cold bites.
  isColdNight() {
    return segmentOf(this.run.step) >= 2;
  }

  hasFire() {
    return this.homePlaced.fireplace === 'fireplace';
  }

  /// What a night in the tent would do right now. Cold nights without a fire
  /// are the whole point of the fireplace: rest barely helps and hunger gets
  /// worse.
  sleepPreview() {
    const comfort = this.homeComfort();
    const fire = this.hasFire();
    const cold = this.isColdNight() && !fire;

    let energy = 30 + comfort * 6;
    let hunger = 18 + comfort * 3;

    if (cold) {
      energy = Math.min(energy, 8 + comfort * 2);
      hunger -= 12;
    }

    return { energy: Math.round(energy), hunger: Math.round(hunger), comfort, fire, cold };
  }

  /// Sleeping is the only way to get real rest: comfort decides how much, and a
  /// cold tent without a fire takes most of it back.
  sleepAtHome() {
    const rest = this.sleepPreview();

    this.run.energy = Math.min(ENERGY_MAX, this.run.energy + rest.energy);
    this.run.hunger = Math.max(0, Math.min(HUNGER_MAX, this.run.hunger + rest.hunger));
    this.run.sitting = false;

    // Settle the day's books, then start the next morning.
    const start = this.run.dayStart || { begging: 0, scavenge: 0, stolen: 0, sold: 0 };
    const summary = {
      begging: this.run.beggingIncome - start.begging,
      scavenge: this.run.scavengeIncome - start.scavenge,
      stolen: this.run.stolenIncome - start.stolen,
      sold: this.run.soldIncome - start.sold
    };
    this.run.dayStart = {
      begging: this.run.beggingIncome,
      scavenge: this.run.scavengeIncome,
      stolen: this.run.stolenIncome,
      sold: this.run.soldIncome
    };

    this.run.day += 1;
    this.run.step = 0;
    this.nightDeadline = 0;
    this.lastSegment = 0;
    this.applyNight();

    if (rest.cold) {
      haptic('refuse');
      this.floatText(this.player.x, this.player.y - 46, '冻醒了好几次', '#8ab4d9');

      const hud = this.scene.get('Hud');
      if (hud && hud.showToast) {
        hud.showToast('没有火，寒气顺着地面爬上来，这一夜几乎没睡着。');
      }
    } else {
      haptic('sleep');
      this.floatText(this.player.x, this.player.y - 46, '睡了一觉', '#a8d98a');
    }

    return { ...rest, summary, day: this.run.day };
  }

  /// Big actions push the clock forward: bins, begging, theft, a morning of work.
  advanceTime(steps = 1) {
    if (this.run.over) return;
    this.run.step = Math.min(STEPS_PER_DAY, this.run.step + steps);
    this.updateSegment();
  }

  getClockText() {
    return `第 ${this.run.day} 天 · ${segmentName(this.run.step)}`;
  }

  applyNight() {
    if (!this.nightOverlay) return;
    const alphas = [0, 0, 0.16, 0.38];
    this.nightOverlay.setAlpha(alphas[segmentOf(this.run.step)] || 0);
  }

  updateSegment() {
    const segment = segmentOf(this.run.step);
    this.applyNight();

    if (segment === this.lastSegment) return;
    this.lastSegment = segment;

    const hud = this.scene.get('Hud');
    const toast = (text) => {
      if (hud && hud.showToast) hud.showToast(text);
    };

    if (segment === 2) toast('天快黑了，该回营地的帐篷睡觉了');
    if (segment === 3) {
      toast('街上没人了，再待下去会冻僵');
      this.nightDeadline = this.time.now + NIGHT_GRACE;
    }
  }

  /// Frozen on the street or flat out on your feet: part of the money and the
  /// bag are gone and you wake up in the alley at the start of a new day.
  collapse(reason) {
    if (this.run.over || this.collapsing) return;
    this.collapsing = true;

    const run = this.run;
    const lostMoney = Math.floor(run.money * 0.4);
    run.money -= lostMoney;

    for (const id of JUNK_ORDER) {
      run.items[id] = Math.floor(run.items[id] / 2);
    }
    this.refreshBagCount();

    run.energy = 40;
    run.hunger = Math.max(0, run.hunger - 10);
    run.day += 1;
    run.step = 0;
    run.dayStart = {
      begging: run.beggingIncome,
      scavenge: run.scavengeIncome,
      stolen: run.stolenIncome,
      sold: run.soldIncome
    };

    haptic('collapse');

    const hud = this.scene.get('Hud');
    if (hud && hud.showToast) {
      hud.showToast(
        reason === 'cold'
          ? '你冻晕在街上，醒来时钱少了一截'
          : '你眼前一黑，被人摸走了钱'
      );
    }

    this.scene.restart({ district: 'camp', run, spawn: 'bottom' });
  }

  homeSceneReached() {
    return this.homeComfort() >= HOME_SCENE_COMFORT;
  }

  openHome() {
    const hud = this.scene.get('Hud');
    if (hud && hud.openHome && this.scene.isActive('Hud')) hud.openHome();
  }

  openStore(id) {
    const hud = this.scene.get('Hud');
    if (hud && hud.openStore && this.scene.isActive('Hud')) hud.openStore(id);
  }

  /// Buys one line off a shop counter. Food, tools and material bundles talk to
  /// the same systems as before; blueprints, the drug and clothes are new.
  buyStock(entry) {
    if (!entry || this.run.over || entry.owned) return false;
    if (this.run.money < entry.price) return false;

    switch (entry.kind) {
      case 'food':
        return this.buyFood(entry.refId);

      case 'material': {
        this.run.money -= entry.price;
        this.run.items[entry.refId] = (this.run.items[entry.refId] || 0) + 3;
        this.refreshBagCount();
        this.floatText(
          this.player.x,
          this.player.y - 46,
          `+3 ${JUNK_ITEMS[entry.refId].name}`,
          '#e8dcc2'
        );
        return true;
      }

      case 'tool':
        return this.buyTool(entry.refId);

      case 'stealth': {
        if (this.run.tools[entry.refId]) return false;
        this.run.money -= entry.price;
        this.run.tools[entry.refId] = true;
        this.floatText(this.player.x, this.player.y - 46, `买下${entry.name}`, '#a8d98a');
        return true;
      }

      case 'booze': {
        this.run.money -= entry.price;
        this.run.booze = 1;
        this.floatText(this.player.x, this.player.y - 46, '一口闷了，手有点稳', '#c9a8e6');
        return true;
      }

      case 'perfume': {
        this.run.money -= entry.price;
        this.run.perfume = (this.run.perfume || 0) + 1;
        this.floatText(this.player.x, this.player.y - 46, '收好那瓶香水', '#c9a8e6');
        return true;
      }

      case 'blueprint': {
        const rec = recipeById(entry.refId);
        if (!rec || this.run.blueprints[entry.refId]) return false;
        this.run.money -= entry.price;
        this.run.blueprints[entry.refId] = true;
        this.floatText(this.player.x, this.player.y - 46, `买下图纸：${rec.name}`, '#f2c46a');
        return true;
      }

      case 'drug': {
        this.run.money -= entry.price;
        this.run.energy = Math.min(ENERGY_MAX, this.run.energy + 45);
        this.run.hunger = Math.max(0, this.run.hunger - 12);
        this.floatText(this.player.x, this.player.y - 46, '脑袋轻飘飘的', '#c9a8e6');
        return true;
      }

      case 'outfit': {
        if (this.run.outfit === entry.refId) return false;
        this.run.money -= entry.price;
        this.run.outfit = entry.refId;
        this.applyOutfit();
        this.floatText(this.player.x, this.player.y - 46, `换上了${entry.name}`, '#a8d98a');
        return true;
      }

      default:
        return false;
    }
  }

  /// How presentable the player looks, 0 for rags and 1 for the best coat.
  cleanLevel() {
    const outfit = OUTFITS.find((o) => o.id === this.run.outfit);
    return outfit ? outfit.clean : 0;
  }

  /// The sprite for a pose, with the suffix of whatever the player is wearing.
  poseTex(pose) {
    const id = this.run.outfit && this.run.outfit !== 'rags' ? this.run.outfit : '';
    return id ? `beggar-${pose}-${id}` : `beggar-${pose}`;
  }

  applyOutfit() {
    this.player.setTexture(this.poseTex(this.run.sitting ? 'sit' : 'idle'));
  }

  openTrade(mode) {
    const hud = this.scene.get('Hud');
    if (hud && hud.openTrade && this.scene.isActive('Hud')) hud.openTrade(mode);
  }

  // -------------------------------------------------------------------- police

  /// True when an officer has the player in their sight fan, or is already
  /// running them down.
  seenByPolice() {
    if (!this.cops.length) return false;

    const px = this.player.x;
    const py = this.player.y;
    const sight = this.copSight();
    const half = COP_HALF_ANGLE * (1 + (this.run.wanted || 0) / 200);

    for (const cop of this.cops) {
      if (cop.chasing) return true;

      const dx = px - cop.sprite.x;
      const dy = py - cop.sprite.y;
      if (Math.hypot(dx, dy) > sight) continue;

      const angle = Math.atan2(dy, dx);
      const delta = Math.abs(Phaser.Math.Angle.Wrap(angle - cop.faceAngle));
      if (delta <= half) return true;
    }

    return false;
  }

  nearbyCop() {
    let best = null;
    let bestD = COP_ALERT_RANGE;

    for (const cop of this.cops) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        cop.sprite.x,
        cop.sprite.y
      );
      if (d < bestD) {
        best = cop;
        bestD = d;
      }
    }

    return best;
  }

  /// A failed lift in front of an officer sends that officer straight after the
  /// player. Returns whether anyone took up the chase.
  startPursuit() {
    const cop = this.nearbyCop();
    if (!cop) return false;

    cop.chasing = true;
    cop.chaseUntil = this.time.now + COP_CHASE_TIME;
    cop.mark.setVisible(true);

    this.floatText(this.player.x, this.player.y - 52, '有人报警了！', '#f0a08a');
    haptic('alarm');
    return true;
  }

  stopChases() {
    for (const cop of this.cops) {
      cop.chasing = false;
      if (cop.mark) cop.mark.setVisible(false);
    }
  }

  updateCops(dt) {
    const px = this.player.x;
    const py = this.player.y;

    for (const cop of this.cops) {
      if (cop.chasing) {
        const dx = px - cop.sprite.x;
        const dy = py - cop.sprite.y;
        const dist = Math.hypot(dx, dy) || 1;

        cop.sprite.x += (dx / dist) * COP_CHASE_SPEED * dt;
        cop.sprite.y += (dy / dist) * COP_CHASE_SPEED * dt;
        cop.faceAngle = Math.atan2(dy, dx);

        if (dist < 30) {
          this.finePlayer();
          cop.chasing = false;
          cop.mark.setVisible(false);
        } else if (this.time.now > cop.chaseUntil) {
          cop.chasing = false;
          cop.mark.setVisible(false);
        }
      } else {
        cop.sprite.y += cop.dir * COP_SPEED * dt;

        if (cop.sprite.y > cop.yMax) {
          cop.sprite.y = cop.yMax;
          cop.dir = -1;
        } else if (cop.sprite.y < cop.yMin) {
          cop.sprite.y = cop.yMin;
          cop.dir = 1;
        }

        cop.sprite.x = cop.laneX;
        cop.faceAngle = cop.dir > 0 ? Math.PI / 2 : -Math.PI / 2;

        // Step around the junk stall's table instead of through it.
        if (cop.stripId === 'market' && cop.sprite.y > 560 && cop.sprite.y < 680) {
          cop.sprite.x = cop.laneX + 54;
        }
      }

      const facingLeft = cop.chasing ? Math.cos(cop.faceAngle) < 0 : cop.dir < 0;
      const side = facingLeft ? -11 : 11;

      cop.sprite.setFlipX(facingLeft);
      cop.sprite.setDepth(cop.sprite.y);

      cop.baton
        .setPosition(cop.sprite.x + side, cop.sprite.y + 6)
        .setRotation(facingLeft ? -0.4 : 0.4)
        .setFlipX(facingLeft)
        .setDepth(cop.sprite.y + 1);

      cop.mark
        .setPosition(cop.sprite.x, cop.sprite.y - 36)
        .setAlpha(0.6 + Math.abs(Math.sin(this.time.now / 220)) * 0.4);
    }
  }

  drawCones() {
    const g = this.coneGfx;
    g.clear();
    if (!this.cops.length) return;

    const sight = this.copSight();
    const half = COP_HALF_ANGLE * (1 + (this.run.wanted || 0) / 200);

    for (const cop of this.cops) {
      const angle = cop.faceAngle;

      g.fillStyle(cop.chasing ? 0xd9563f : 0xe0b45a, cop.chasing ? 0.24 : 0.13);
      g.beginPath();
      g.moveTo(cop.sprite.x, cop.sprite.y);
      g.arc(cop.sprite.x, cop.sprite.y, sight, angle - half, angle + half, false);
      g.closePath();
      g.fillPath();
    }
  }

  finePlayer() {
    const fine = Math.min(this.run.money, Phaser.Math.Between(6, 12));
    this.run.money -= fine;
    this.run.energy = Math.max(0, this.run.energy - CAUGHT_ENERGY);
    this.stealReadyAt = this.time.now + 5000;
    this.cameras.main.flash(240, 120, 30, 30);

    if (fine > 0) {
      this.floatText(this.player.x, this.player.y - 46, `罚款 ${fine} 元`, '#f08a7a');
    } else {
      this.floatText(this.player.x, this.player.y - 46, '被训了一顿', '#f08a7a');
    }

    haptic('caught');
  }

  fallDown() {
    if (this.run.over) return;

    this.run.over = true;
    this.run.sitting = false;
    this.run.survived = Math.round(this.run.elapsed);

    this.axes.x = 0;
    this.axes.y = 0;
    if (this.player.body) this.player.body.setVelocity(0, 0);
    this.player.setTexture(this.poseTex('down'));
    this.player.setScale(1, 1);
    this.bowl.setVisible(false);
    this.prompt.setVisible(false);
    this.stopChases();

    haptic('collapse');
  }

  dropCoin(from) {
    const boost = this.district.begBoost || 1;
    const bonus = this.cleanLevel() > 0.8 ? 1 : 0;
    const amount = Math.max(1, Math.round((Phaser.Math.Between(1, 2) + bonus) * boost));
    const coin = this.add.image(from.x, from.y - 6, 'coin').setDepth(from.y + 1);

    const tx = this.run.sitting ? this.bowl.x : this.player.x;
    const ty = this.run.sitting ? this.bowl.y : this.player.y + 16;

    this.tweens.add({
      targets: coin,
      x: tx,
      y: ty,
      duration: 460,
      ease: 'Quad.easeIn',
      onComplete: () => {
        coin.destroy();
        if (this.run.over) return;
        this.run.money += amount;
        this.run.beggingIncome += amount;
        this.advanceTime(1);
        this.floatText(tx, ty - 26, `+${amount} 元`, UI.gold);
        haptic('coin');
      }
    });
  }

  floatText(x, y, text, colour) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: '14px',
        color: colour || UI.cream,
        stroke: '#100d09',
        strokeThickness: 3
      })
      .setOrigin(0.5, 0.5)
      .setDepth(7000);

    this.tweens.add({
      targets: label,
      y: y - 30,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  // ------------------------------------------------------------------ walkers

  spawnPed(initial) {
    if (this.run.over) return;

    // A walker turns up somewhere in one of the city's blocks and wanders from
    // there, crossing the road on the way.
    const strip = this.strips[Phaser.Math.Between(0, this.strips.length - 1)];
    const spot = this.pedSpotIn(strip);

    const kinds = strip.district.pedKinds;
    const kindId = kinds[Phaser.Math.Between(0, kinds.length - 1)];

    this.makePed(strip, spot.x, spot.y, kindId);
  }

  /// A point on the pavement or the road of a block.
  pedSpotIn(strip) {
    return {
      x: Phaser.Math.Between(strip.x0 + 150, strip.x0 + 490),
      y: Phaser.Math.Between(strip.y0 + 120, strip.y0 + STREET_HEIGHT - 120)
    };
  }

  /// How far a walker roams inside their own block.
  pedBounds(strip) {
    return {
      x0: strip.x0 + 150,
      x1: strip.x0 + 490,
      y0: strip.y0 + 110,
      y1: strip.y0 + STREET_HEIGHT - 110
    };
  }

  /// The gang members of a district, standing on their stretch of street until
  /// somebody worth shaking down walks past.
  buildGangs() {
    for (const strip of this.strips) {
      const count = strip.district.gangs || 0;

      for (let i = 0; i < count; i++) {
        const spot = this.pedSpotIn(strip);
        this.makePed(strip, spot.x, spot.y, 'gang');
      }
    }
  }

  /// One walker on the street, whether they strolled in or were standing there
  /// when the player arrived.
  makePed(strip, x, y, kindId) {
    const kind = PED_KINDS[kindId] || PED_KINDS.suit;
    const sprite = this.add.image(x, y, kind.tex).setDepth(y);

    this.tweens.add({
      targets: sprite,
      scaleY: 0.97,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const angle = Math.random() * Math.PI * 2;

    const ped = {
      sprite,
      strip,
      vx: Math.cos(angle),
      vy: Math.sin(angle),
      speed: Phaser.Math.FloatBetween(kind.speed ? kind.speed[0] : 16, kind.speed ? kind.speed[1] : 26),
      turnAt: 0,
      ttl: Phaser.Math.Between(30000, 70000),
      thoughtAt: this.time.now + Phaser.Math.Between(8000, 20000),
      canGive: !kind.hostile && Math.random() < 0.62 + this.cleanLevel() * 0.3,
      gave: false,
      kind,
      hostile: !!kind.hostile,
      chasing: false,
      angerUntil: 0,
      loot: this.pickLoot(kind),
      lootTaken: false,
      purse: Phaser.Math.Between(kind.purse[0], kind.purse[1]),
      alert: 0,
      startled: false
    };

    this.peds.push(ped);
    return ped;
  }

  /// Walks a passer-by in whatever direction they happen to be going, turning
  /// now and then, and never off their own block.
  walkPed(ped, dt) {
    const now = this.time.now;
    const b = this.pedBounds(ped.strip);

    if (now > ped.turnAt) {
      ped.turnAt = now + Phaser.Math.Between(1400, 3600);

      const angle = Math.atan2(ped.vy, ped.vx) + Phaser.Math.FloatBetween(-1.5, 1.5);
      ped.vx = Math.cos(angle);
      ped.vy = Math.sin(angle);
    }

    const speed = ped.startled ? ped.speed * 2.6 : ped.speed;

    ped.sprite.x += ped.vx * speed * dt;
    ped.sprite.y += ped.vy * speed * dt;

    if (ped.sprite.x < b.x0) {
      ped.sprite.x = b.x0;
      ped.vx = Math.abs(ped.vx);
    } else if (ped.sprite.x > b.x1) {
      ped.sprite.x = b.x1;
      ped.vx = -Math.abs(ped.vx);
    }

    if (ped.sprite.y < b.y0) {
      ped.sprite.y = b.y0;
      ped.vy = Math.abs(ped.vy);
    } else if (ped.sprite.y > b.y1) {
      ped.sprite.y = b.y1;
      ped.vy = -Math.abs(ped.vy);
    }

    ped.sprite.setDepth(ped.sprite.y);
  }

  /// One thing out of the pocket of a passer-by, or nothing at all.
  pickLoot(kind) {
    const pool = kind.loot || [];
    if (!pool.length) return null;
    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  /// A gang member keeps to his stretch of street until the player comes close,
  /// then comes for them and takes what he can.
  gangTick(ped, dt) {
    const player = this.player;
    const now = this.time.now;
    const d = Phaser.Math.Distance.Between(ped.sprite.x, ped.sprite.y, player.x, player.y);

    if (ped.chasing) {
      if (d > GANG_LEASH) {
        ped.chasing = false;
        ped.angerUntil = now + GANG_COOLDOWN;
        return;
      }

      if (d < GANG_GRAB) {
        this.gangShakedown(ped);
        ped.chasing = false;
        ped.angerUntil = now + GANG_COOLDOWN;
        return;
      }

      const dx = player.x - ped.sprite.x;
      const dy = player.y - ped.sprite.y;
      const len = Math.hypot(dx, dy) || 1;

      ped.sprite.x += (dx / len) * GANG_SPEED * dt;
      ped.sprite.y += (dy / len) * GANG_SPEED * dt;
      ped.sprite.setDepth(ped.sprite.y);
      return;
    }

    this.walkPed(ped, dt);

    if (this.run.over || this.run.sitting || ped.startled) return;
    if (now < ped.angerUntil || d > GANG_AGGRO) return;

    ped.chasing = true;
    this.floatText(ped.sprite.x, ped.sprite.y - 34, '喂，站住', '#f0a08a');
    haptic('ui');
  }

  /// What a gang member does when he catches you: takes whatever is loose in
  /// your pockets and leaves you winded.
  gangShakedown(ped) {
    if (this.run.over) return 0;

    const take = Math.min(this.run.money, Math.max(3, Math.round(4 + this.run.money * 0.12)));

    this.run.money -= take;
    this.run.energy = Math.max(0, this.run.energy - GANG_ENERGY);

    this.cameras.main.shake(180, 0.005);
    haptic('impact');
    this.floatText(
      this.player.x,
      this.player.y - 48,
      take > 0 ? `-${take} 元` : '被推了一把',
      '#f0a08a'
    );

    const hud = this.scene.get('Hud');
    if (hud && hud.showToast) {
      hud.showToast(
        take > 0
          ? `黑街的人把你抵在墙上，摸走了 ${take} 元。`
          : '黑街的人翻了你的口袋，什么也没有，骂骂咧咧地推了你一把。'
      );
    }

    return take;
  }

  updatePeds(dt) {
    const player = this.player;

    for (const ped of this.peds) {
      const frozen = ped === this.qtePed;

      if (ped.hostile) {
        if (!frozen) this.gangTick(ped, dt);
      } else if (!frozen) {
        this.walkPed(ped, dt);
      }

      const near = Phaser.Math.Distance.Between(
        ped.sprite.x,
        ped.sprite.y,
        player.x,
        player.y
      );

      if (!this.run.over && !frozen && !ped.hostile) {
        if (!this.run.sitting && !this.sneaking && near < SEEN_RANGE) {
          const coat = this.run.tools.coat ? 0.55 : 1;
          const clean = 1 - this.cleanLevel() * 0.5;
          const jump = ped.startled ? 2 : 1;
          const watch = (ped.kind.watch || 0) * ((ped.strip && ped.strip.district.watch) || 1);
          ped.alert = Math.min(1, ped.alert + watch * coat * clean * jump * dt);
        } else {
          ped.alert = Math.max(0, ped.alert - 0.22 * dt);
        }

        if (ped.alert > 0.5 && !this.alertExplained) {
          this.alertExplained = true;

          const hud = this.scene.get('Hud');
          if (hud && hud.showToast) {
            hud.showToast('他注意到你了：头顶的黄条是警戒，越满越难下手。');
          }
        }
      }

      // Now and then a passer-by says what they are thinking.
      if (!ped.hostile && !ped.startled && near < 620 && this.time.now > ped.thoughtAt) {
        ped.thoughtAt = this.time.now + Phaser.Math.Between(18000, 34000);

        const lines = PED_THOUGHTS[ped.kind.id];
        if (lines && lines.length) {
          const line = lines[Phaser.Math.Between(0, lines.length - 1)];
          this.floatText(ped.sprite.x, ped.sprite.y - 44, line, '#cfc3ae');
        }
      }

      ped.ttl -= dt * 1000;

      const away = Phaser.Math.Distance.Between(
        ped.sprite.x,
        ped.sprite.y,
        player.x,
        player.y
      );

      if ((ped.ttl <= 0 && away > 700) || away > 2400) {
        ped.dead = true;
        continue;
      }

      if (
        this.run.sitting &&
        !this.run.over &&
        !ped.hostile &&
        ped.canGive &&
        !ped.gave &&
        !ped.startled
      ) {
        if (near < BEG_RADIUS) {
          ped.gave = true;
          this.dropCoin(ped.sprite);
        }
      }
    }

    const alive = [];
    for (const ped of this.peds) {
      if (ped.dead) {
        this.tweens.killTweensOf(ped.sprite);
        ped.sprite.destroy();
      } else {
        alive.push(ped);
      }
    }
    this.peds = alive;
  }

  drawAlerts() {
    const g = this.alertGfx;
    g.clear();

    for (const ped of this.peds) {
      if (ped.hostile || ped.alert <= 0.04) continue;

      const x = ped.sprite.x - 13;
      const y = ped.sprite.y - 34;

      g.fillStyle(0x14110d, 0.8);
      g.fillRect(x - 1, y - 1, 28, 6);

      const colour = ped.alert > 0.66 ? 0xd9563f : ped.alert > 0.33 ? 0xe0a23c : 0xcfc6a8;
      g.fillStyle(colour, 1);
      g.fillRect(x, y, 26 * ped.alert, 4);
    }
  }

  findStealTarget() {
    if (this.run.over || this.run.sitting) return null;

    let best = null;
    let bestD = STEAL_RANGE;

    for (const ped of this.peds) {
      if (ped.startled) continue;
      if (ped.purse <= 0 && (!ped.loot || ped.lootTaken)) continue;

      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        ped.sprite.x,
        ped.sprite.y
      );
      if (d < bestD) {
        best = ped;
        bestD = d;
      }
    }

    return best;
  }

  updateNearest() {
    if (this.run.over || this.run.sitting || this.qtePed || this.searching || this.benchSpot) {
      this.nearest = null;
      this.stealTarget = null;
      this.prompt.setVisible(false);
      return;
    }

    let best = null;
    let bestD = Infinity;

    for (const def of this.interactables) {
      if (def.enabled && !def.enabled()) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, def.x, def.y);
      if (d <= def.radius && d < bestD) {
        best = def;
        bestD = d;
      }
    }

    this.nearest = best;
    this.stealTarget = best ? null : this.findStealTarget();

    if (best) {
      if (this.prompt.text !== best.label) this.prompt.setText(best.label);
      this.prompt.setPosition(best.x, best.y - 30).setVisible(true);
      return;
    }

    if (this.stealTarget) {
      const ped = this.stealTarget;
      const parts = [];

      if (ped.purse > 0) parts.push(`钱袋 ${ped.purse} 元`);
      if (ped.loot && !ped.lootTaken) parts.push(LOOT_ITEMS[ped.loot].name);

      const label = `偷：${parts.join(' · ')}`;
      if (this.prompt.text !== label) this.prompt.setText(label);
      this.prompt.setPosition(ped.sprite.x, ped.sprite.y - 40).setVisible(true);
      return;
    }

    this.prompt.setVisible(false);
  }

  // -------------------------------------------------------------------- frame

  update(time, delta) {
    const dt = Math.min(delta, 60) / 1000;
    const run = this.run;

    if (!run.over) {
      run.hunger = Math.max(0, run.hunger - HUNGER_DRAIN * dt);
      run.elapsed += dt;
      if (run.hunger <= 0) this.fallDown();
    }

    // Digging in a bin pins the player in place until it is done or seen.
    if (!run.over && this.searching) {
      if (this.seenByPolice()) this.interruptBinSearch();
      else if (this.time.now >= this.searching.endAt) this.finishBin(this.searching.bin);
    }

    if (!run.over && run.wanted > 0) {
      run.wanted = Math.max(0, run.wanted - 0.25 * dt);
    }

    if (this.benchSpot && !run.over) {
      run.energy = Math.min(ENERGY_MAX, run.energy + 2 * dt);
      this.benchTime += dt;

      if (!this.benchAsleep && this.benchTime > 9) {
        this.benchAsleep = true;
        this.floatText(this.player.x, this.player.y - 42, '你睡着了……', UI.creamDim);
        haptic('sleep');
      }

      if (this.benchAsleep) this.checkBenchTheft(dt);
    }

    this.zzz.setVisible(this.benchAsleep);
    if (this.benchAsleep) this.zzz.setPosition(this.player.x + 18, this.player.y - 34);

    const mag = Math.min(1, Math.hypot(this.axes.x, this.axes.y));
    const busy = !!this.searching;
    const moving = !run.over && !run.sitting && !busy && !this.benchSpot && mag > 0.08;
    this.sneaking = moving && mag < SNEAK_MAG;

    const exhausted = run.energy <= 0;
    if (exhausted && moving && !this.energyWarned) {
      this.energyWarned = true;
      this.floatText(this.player.x, this.player.y - 48, '一点力气都没有了', UI.creamDim);
    }

    // The night is cold: standing in it drains what little warmth is left.
    const hudPanels = this.scene.get('Hud');
    const paused =
      hudPanels &&
      (hudPanels.shopOpen ||
        hudPanels.tradeOpen ||
        hudPanels.craftOpen ||
        hudPanels.homeOpen ||
        hudPanels.vendingOpen ||
        hudPanels.slotOpen ||
        hudPanels.mapOpen ||
        hudPanels.qte ||
        hudPanels.overOpen);

    const segment = segmentOf(run.step);
    const coldDrain = segment === 3 ? 1.2 : segment === 2 ? 0.4 : 0;
    if (!run.over && !paused && coldDrain > 0) {
      run.energy = Math.max(0, run.energy - coldDrain * dt);
    }

    if (!run.over && run.energy <= 0) {
      this.collapse('exhausted');
      return;
    }

    if (!run.over && !paused && this.nightDeadline > 0 && this.time.now > this.nightDeadline) {
      this.nightDeadline = 0;
      this.collapse('cold');
      return;
    }

    if (moving) {
      const len = Math.hypot(this.axes.x, this.axes.y) || 1;
      const nx = this.axes.x / len;
      const ny = this.axes.y / len;
      const speed = this.sneaking || exhausted ? SNEAK_SPEED : SPEED;

      if (this.player.body) this.player.body.setVelocity(nx * speed, ny * speed);
      if (Math.abs(nx) > 0.05) this.player.setFlipX(nx < 0);
      this.walkT += dt * (this.sneaking ? 6 : 12);

      if (!this.sneaking) run.energy = Math.max(0, run.energy - RUN_DRAIN * dt);
    } else {
      if (this.player.body) this.player.body.setVelocity(0, 0);
      this.walkT = 0;
    }

    if (run.sitting && !run.over) {
      run.energy = Math.min(ENERGY_MAX, run.energy + SIT_RECOVER * dt);
    }
    if (run.energy > 0) this.energyWarned = false;

    const bob = moving ? Math.sin(this.walkT) * 0.03 : 0;
    this.player.setScale(1, 1 + bob);
    this.player.setDepth(this.player.y);
    this.playerShadow.setPosition(this.player.x, this.player.y + 22).setDepth(this.player.y - 0.5);

    this.updatePeds(dt);
    this.updateCops(dt);
    this.drawCones();
    this.updateNearest();
    this.checkExit();
    this.drawAlerts();
    this.drawSearchBar();
  }

  // ------------------------------------------------------------------ layout

  applyLayout() {
    const { width, playH } = this.layout;
    const cam = this.cameras.main;

    cam.setViewport(0, 0, width, playH);
    cam.setSize(width, playH);

    // A wide panel must not show past the end of the street: zooming in keeps
    // the visible slice of the world narrower than the world itself.
    cam.setZoom(Math.max(1, width / 560));
  }
}
