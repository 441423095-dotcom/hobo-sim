// One district of the city at a time. The street always looks the same underneath
// — pavement, road and buildings — but each district brings its own bins,
// litter, walkers, colour and landmarks, and the city map lets the beggar move
// between them from the exits at either end of the street.

import { createGameArt } from '../art/index.js';
import { layoutFor } from '../layout.js';
import { haptic } from '../feedback.js';
import { initAudio, playSfx, setDistrictMood, updateAudio, setWeatherSound } from '../audio.js';
import { ensureCity, cityEffects, forecastOf, seasonOf, WEATHERS, EVENTS } from '../city.js';
import { FOODS } from '../food.js';
import { JUNK_ITEMS, JUNK_ORDER, TOOLS, junkPrice } from '../trade.js';
import { LOOT_ITEMS, LOOT_ORDER, lootPrice } from '../loot.js';
import { RECIPES, recipeById, amountOf, spendMaterial } from '../craft.js';
import { makeGoalsForDay } from '../goals.js';
import {
  ERRANDS,
  errandById,
  errandForShop,
  errandState,
  errandStep,
  errandReady,
  errandMet,
  errandHandIn,
  takeForStep,
  advanceErrand,
  markErrandStarted,
  emptyErrands
} from '../errands.js';
import { saveGame, loadGame, clearGame } from '../save.js';
import { KING, patronById, favorOf, kingProgress } from '../king.js';
import {
  GANGS,
  GANG_CROWN,
  gangStanding,
  addStanding,
  addDailyStanding,
  gangGainLeft,
  pickGangQuest
} from '../gangs.js';
import { SKILLS, addSkill, skillLevel, skillBonus, bookBonus } from '../skill.js';
import { zhouGreeting } from '../dialogue.js';
import { STORY_LINES } from '../story.js';
import {
  begGiveLine,
  begRefuseLine,
  stealNoticedLine,
  stealCaughtLine,
  peddleBuyLine,
  peddleRefuseLine,
  zhouAdvice
} from '../lines.js';
import { SHOPS, OUTFITS } from '../shops.js';
import { FURNITURE, HOME_SLOTS, HOME_SCENE_COMFORT, furnitureById } from '../home.js';
import { DAY_LENGTH, darknessAt, minutesToClock, segmentOf, segmentName } from '../time.js';
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
  LEFT_PAVEMENT,
  ROAD,
  RIGHT_BUILDINGS,
  STALL,
  WORKBENCH,
  PAWN,
  PED_LANES
} from '../world.js';

const SPEED = 134;
const HUNGER_MAX = 100;
const BRAZIER_BURN_MS = 30000;
const BRAZIER_FEED_MS = 25000;
const BRAZIER_REGEN = 1.6;

// Rain with nothing over his head soaks the beggar through: an umbrella or a
// shop awning is the difference between a bad day and a lost one.
const RAIN_DRAIN = 0.45;

const HUNGER_DRAIN = 0.3; // hunger points per second
const BEG_RADIUS = 100;
const TRADE_RADIUS = 80;

// Stealing: reach, how close a walker has to be before they get suspicious,
// and how long the hands stay still after an attempt.
const STEAL_RANGE = 84;
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
const RUN_DRAIN = 0.85;
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

// Narrow alleys cut through the buildings between two blocks. The low one is
// open to anyone; the high one is fenced until somebody picks the lock.
const ALLEYS = [
  { y: 240, locked: false },
  { y: 1200, locked: true }
];
const ALLEY_H = 78;

// What each district puts on its street: crossings and traffic lights, a car or
// two at the kerb and the odd awning. Nothing here may cover a bin, a begging
// mat, a door or a machine — buildStreetDetail asks before it places anything.
const STREET_DECOR = {
  camp: { crosswalks: [560], cars: [420], awnings: [] },
  market: { crosswalks: [520, 1040], cars: [360, 880], awnings: [330] },
  square: { crosswalks: [420, 1120], cars: [300], awnings: [520] },
  commerce: { crosswalks: [600], cars: [420, 960], awnings: [300] },
  alley: { crosswalks: [520], cars: [], awnings: [] },
  park: { crosswalks: [700], cars: [], awnings: [] },
  slum: { crosswalks: [860], cars: [300], awnings: [] }
};

// How long the player can stand in the cold night before freezing.
const NIGHT_GRACE = 30000;

// The body complains before it gives out. Below this much food or breath the
// heart starts to be heard, and the beggar says what it feels like; under the
// critical line the lines get shorter and the beats get faster.
const WARN_AT = 26;
const CRIT_AT = 11;

const HUNGRY_LINES = [
  '肚子在叫……先找点吃的。',
  '有点发虚，得垫一口了。',
  '再不吃东西，腿要软了。'
];
const STARVING_LINES = ['眼前发黑了……', '真的要饿死在街上吗。', '胃里空得发疼。'];
const TIRED_LINES = ['腿有点沉。', '走不动了，找个地方坐坐。', '眼皮一直往下掉。'];
const SPENT_LINES = ['一点力气都没有了……', '再走下去真要倒了。', '手在抖，站不稳。'];

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
    label: '上班族',
    tex: 'ped-suit',
    purse: [6, 16],
    base: 0.45,
    watch: 0.34,
    speed: [18, 27],
    loot: ['wallet', 'phone', 'cigarettes', 'vape']
  },
  lady: {
    id: 'lady',
    label: '阿姨',
    tex: 'ped-lady',
    purse: [4, 12],
    base: 0.5,
    watch: 0.26,
    speed: [14, 22],
    loot: ['phone', 'wallet', 'gum', 'perfume']
  },
  drunk: {
    id: 'drunk',
    label: '醉汉',
    tex: 'ped-drunk',
    purse: [2, 8],
    base: 0.7,
    watch: 0.14,
    speed: [9, 16],
    loot: ['cigarettes', 'snackbar', 'lighter', 'gum']
  },
  rich: {
    id: 'rich',
    label: '有钱人',
    tex: 'ped-rich',
    purse: [18, 42],
    base: 0.3,
    watch: 0.42,
    speed: [20, 29],
    loot: ['watch', 'phone', 'perfume', 'earbuds']
  },
  student: {
    id: 'student',
    label: '学生',
    tex: 'ped-student',
    purse: [3, 9],
    base: 0.52,
    watch: 0.24,
    speed: [16, 25],
    loot: ['gum', 'earbuds', 'phone']
  },
  kid: {
    id: 'kid',
    label: '小孩',
    tex: 'ped-kid',
    purse: [1, 5],
    base: 0.8,
    watch: 0.1,
    speed: [20, 30],
    loot: ['gum', 'snackbar'],
    scale: 0.82
  },
  oldlady: {
    id: 'oldlady',
    label: '老太太',
    tex: 'ped-oldlady',
    purse: [3, 10],
    base: 0.5,
    watch: 0.2,
    speed: [10, 17],
    loot: ['gum', 'snackbar', 'watch'],
    scale: 0.94
  },
  worker: {
    id: 'worker',
    label: '环卫工',
    tex: 'ped-worker',
    purse: [2, 7],
    base: 0.66,
    watch: 0.16,
    speed: [11, 18],
    loot: ['lighter', 'cigarettes']
  },
  gang: {
    id: 'gang',
    label: '混子',
    tex: 'ped-gang',
    purse: [3, 9],
    base: 0.35,
    watch: 0.5,
    speed: [16, 24],
    loot: ['cigarettes', 'lighter'],
    hostile: true
  }
};

// What some of the crowd are thinking while they walk.
const PED_THOUGHTS = {
  suit: ['今天的会又开不完了。', '老板还在群里 @ 我。', '工资什么时候到账。'],
  lady: ['这双鞋磨脚。', '晚上吃什么好呢。', '他昨天没回我消息。'],
  drunk: ['再来一瓶……', '我当年也阔过。', '这地怎么在晃。'],
  rich: ['又是没意义的一天。', '该换辆车了。', '这条街真脏。'],
  gang: ['这条街归我管。', '看什么看。', '今晚得收点东西。'],
  student: ['作业一个字没写。', '食堂今天有红烧肉。', '耳机又丢了一只。'],
  kid: ['妈妈呢……', '我想吃那个。', '学校明天体检。'],
  oldlady: ['菜又贵了两毛。', '给孙子织的毛衣还差袖子。', '腿又疼了。'],
  worker: ['这一片一天扫三遍。', '谁又把汤泼地上了。', '下班去买两斤白菜。']
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

    // A run that already ended is never carried over: the end-of-run card
    // restarts the street, and the dead run must not come back with it.
    const carried = payload.run || null;
    this.carriedRun = carried && !carried.over ? carried : null;
    this.spawnAt = payload.spawn === 'top' ? 'top' : 'bottom';
  }

  create() {
    createGameArt(this);

    // A save on the device picks the run back up where it was left. A death
    // restart or a travel passes its own run and district, and skips this.
    if (!this.carriedRun && !this.pendingDistrict) {
      const saved = loadGame();
      if (saved) {
        this.pendingDistrict = saved.district || this.pendingDistrict;
        this.carriedRun = saved.run;
        if (saved.homePlaced) this.registry.set('homePlaced', saved.homePlaced);
      }
    }

    // A brand new run opens where the story does: at the lean-to in the camp.
    const fresh = !this.carriedRun && !this.pendingDistrict;

    this.district =
      DISTRICTS[this.pendingDistrict] ||
      (fresh ? DISTRICTS.camp : null) ||
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
        openAlleys: {},
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
        charm: { cigarettes: 0, ticket: 0 },
        favor: {},
        met: {},
        lore: {},
        king: null,
        beggingIncome: 0,
        scavengeIncome: 0,
        stolenIncome: 0,
        soldIncome: 0,
        elapsed: 0,
        survived: 0,
        over: false,
        sitting: false,
        begStyle: 'plead',
        bagUp: 'pouch',
        city: null,
        goals: null
      };

    // Chapter one begins on a fresh run; an old save is already past it.
    if (!this.run.story) this.run.story = this.carriedRun ? 4 : 1;

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
    if (!this.run.charm) this.run.charm = { cigarettes: 0, ticket: 0 };
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
    if (!this.run.openAlleys) this.run.openAlleys = {};

    // The shopkeepers' private business: what has been done for them, and how
    // much wear the clothes on the beggar's back have taken.
    if (!this.run.errands) this.run.errands = emptyErrands();
    if (typeof this.run.outfitWear !== 'number') this.run.outfitWear = 0;
    if (typeof this.run.noodleDay !== 'number') this.run.noodleDay = 0;

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
    this.stealTake = 0;
    this.alertPed = null;
    this.alertValue = 0;
    this.sneaking = false;
    this.energyWarned = false;
    this.heartT = 0;
    this.warnStage = 0;
    this.stepT = 0;
    this.musicTension = 0.15;
    this.zhouAdviceAt = 0;
    this.alertExplained = false;
    this.skyFlipAt = 0;
    this.passerbyAt = 0;
    this.mugAt = 0;
    this.errandAt = 0;
    this.snowFires = false;
    this.warnedWeather = null;
    this.awnings = [];
    this.warmAt = 0;
    this.warmUntil = 0;
    this.loadHome();
    this.ensureGoals();
    ensureCity(this.run);
    this.cityFx = cityEffects(this.run.city, this.run.step);
    this.cityEventId = this.cityFx.event ? this.cityFx.event.id : null;

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
    this.buildLamps();
    this.buildWalls();
    this.buildAlleyContent();
    this.buildStreetDetail();
    this.buildBins();
    this.buildLitter();
    this.buildHides();
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
    this.buildGangCamps();
    this.buildAlleyCorners();
    this.buildBraziers();
    this.buildCover();
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

    // The street's own soundtrack. Browsers only allow audio once a thumb has
    // touched the screen, so the desk is opened on the first tap.
    setDistrictMood(this.district.id);
    this.input.once('pointerdown', () => initAudio());

    // Old Zhou says what the day's list is once the screen has settled.
    // Old Zhou says what the day's list is once the screen has settled — but on
    // the first day the story is the list.
    if (!(this.run.story >= 1 && this.run.story <= 3)) {
      this.time.delayedCall(700, () => this.announceGoals());
    }

    // Chapter one opens with him standing over the beggar.
    if (this.run.story === 1 && !this.run.storySeen) {
      this.run.storySeen = true;
      this.time.delayedCall(1200, () => this.zhouStoryLine(STORY_LINES.wake));
    }
  }

  // ------------------------------------------------------------- chapter one

  /// A line from Old Zhou, with one button to close it.
  zhouStoryLine(text, options) {
    const hud = this.scene.get('Hud');
    if (!hud || !hud.showDialogue) return;

    hud.showDialogue('zhou', [text], null, options || [{ label: '知道了' }]);
  }

  /// The bread is eaten: the day is spent, and the old man sends him home.
  storyAfterBread() {
    this.run.story = 3;
    this.run.step = Math.max(this.run.step, 660);
    this.applyNight();
    this.updateSegment();
    this.saveNow();

    const hud = this.scene.get('Hud');
    if (hud && hud.showToast) hud.showToast('天黑了，街上开始冷起来。');

    this.time.delayedCall(900, () => this.zhouStoryLine(STORY_LINES.afterBread));
  }

  /// Something edible out of a bin: a bag of snacks, half a bottle of wine.
  eatJunk(id) {
    const item = JUNK_ITEMS[id];
    if (!item || !item.eat || !this.run) return false;
    if ((this.run.items[id] || 0) <= 0) return false;

    this.run.items[id] -= 1;
    if (item.eat.hunger) this.run.hunger = Math.min(HUNGER_MAX, this.run.hunger + item.eat.hunger);
    if (item.eat.energy) this.run.energy = Math.min(ENERGY_MAX, this.run.energy + item.eat.energy);

    this.refreshBagCount();
    this.floatText(this.player.x, this.player.y - 46, `${item.name} · ${item.use}`, '#a8d98a');
    playSfx('eat');
    haptic('eat');
    return true;
  }

  /// The corners where a fire can be lit. They start cold, and they burn on
  /// whatever the beggar has to feed them — except when it snows, when somebody
  /// has already gone round and lit them.
  buildBraziers() {
    const spots = [
      { district: 'park', x: 150, y: 640 },
      // Under the bridge in the back alley, out of the weather.
      { district: 'alley', x: 300, y: 310 },
      { district: 'camp', x: 486, y: 1150 }
    ];

    this.braziers = this.braziers || [];

    for (const spot of spots) {
      const strip = this.stripFor(spot.district);
      if (!strip) continue;

      const x = strip.x0 + spot.x;
      const y = strip.y0 + spot.y;

      this.add.image(x, y, 'brazier').setOrigin(0.5, 1).setDepth(y);

      const fire = this.add
        .image(x, y - 2, 'furn-fire')
        .setOrigin(0.5, 1)
        .setDepth(y + 1)
        .setVisible(false);

      if (this.lightSpots) this.lightSpots.push({ x, y: y - 30 });

      const state = { x, y, lit: false, until: 0, fire };

      this.braziers.push(state);

      this.addInteractable({
        x,
        y: y - 10,
        radius: 70,
        label: '火盆',
        use: () => this.useBrazier(state)
      });
    }
  }

  /// Anything that catches: a match of paper, a stick, a scrap of cloth.
  brazierFuel() {
    const fuels = ['newspaper', 'cardboard', 'flyer', 'receipt', 'cloth', 'stick'];

    return fuels.find((id) => (this.run.items[id] || 0) > 0) || null;
  }

  useBrazier(state) {
    const hasLighter = (this.run.loot.lighter || 0) > 0;
    const fuel = this.brazierFuel();

    // Lit already: feed it, or just stand in the warmth.
    if (state.lit) {
      if (!fuel && !hasLighter) {
        haptic('refuse');
        this.floatText(this.player.x, this.player.y - 46, '火还烧着，先烤着吧', UI.creamDim);
        return;
      }

      if (!hasLighter) {
        this.run.items[fuel] -= 1;
        this.refreshBagCount();
      }

      // Feeding a fire the snow lit makes it the beggar's own: it burns for as
      // long as the fuel lasts, snow or no snow.
      const base =
        state.until === Number.MAX_SAFE_INTEGER
          ? this.time.now
          : Math.max(state.until, this.time.now);

      state.snowLit = false;
      state.until = base + BRAZIER_FEED_MS;

      this.floatText(this.player.x, this.player.y - 46, '添了把火，烧得更久了', '#f2c46a');
      playSfx('coin');
      haptic('buy');
      return;
    }

    if (!hasLighter && !fuel) {
      haptic('refuse');
      this.floatText(this.player.x, this.player.y - 46, '火盆是凉的，得有能点火的东西', UI.creamDim);
      return;
    }

    if (!hasLighter) {
      this.run.items[fuel] -= 1;
      this.refreshBagCount();
    }

    state.lit = true;
    state.until = this.time.now + BRAZIER_BURN_MS;
    state.fire.setVisible(true);

    this.floatText(
      this.player.x,
      this.player.y - 46,
      hasLighter ? '打火机一打，火起来了' : '塞进纸片，火起来了',
      '#f2c46a'
    );
    playSfx('coin');
    haptic('buy');
  }

  /// Standing by a burning brazier warms the beggar slowly, right up until the
  /// last of the fuel goes out.
  updateBraziers(dt) {
    if (!this.braziers || !this.braziers.length || !this.run) return;

    for (const b of this.braziers) {
      if (!b.lit) continue;

      if (this.time.now >= b.until) {
        b.lit = false;
        if (b.fire) b.fire.setVisible(false);
        continue;
      }

      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y - 10);
      if (d > 96) continue;

      this.run.energy = Math.min(ENERGY_MAX, this.run.energy + BRAZIER_REGEN * dt);
      this.warmUntil = this.time.now + 6000;
    }
  }

  /// Corners where the gangs sit out of the way: a tipped dumpster, a stack of
  /// flattened cardboard and a patch of shadow, with a couple of the boys
  /// slumped against the bin or flat out on the boxes.
  buildAlleyCorners() {
    const corners = [{ district: 'alley', x: 446, y: 1040, gang: 'crow' }];

    for (const corner of corners) {
      const strip = this.stripFor(corner.district);
      if (!strip) continue;

      const x = strip.x0 + corner.x;
      const y = strip.y0 + corner.y;

      // The shadow the corner sits in.
      this.add.rectangle(x, y - 40, 190, 150, 0x05060a, 0.4).setDepth(-23);

      this.add.image(x + 34, y, 'dumpster').setOrigin(0.5, 1).setDepth(y);
      this.add.image(x - 44, y - 4, 'cardboardpile').setOrigin(0.5, 1).setDepth(y - 2);
      this.add.image(x + 82, y - 2, 'trashbags').setOrigin(0.5, 1).setDepth(y - 1);

      // One slumped against the bin, one flat out on the cardboard.
      this.add.image(x - 10, y + 4, 'gang-sit').setDepth(y + 3);
      this.add.image(x - 52, y + 2, 'gang-lie').setDepth(y + 2);

      if (this.lightSpots) this.lightSpots.push({ x, y: y - 60 });

      this.addInteractable({
        x,
        y: y - 26,
        radius: 82,
        label: '巷子里的帮派',
        use: () => this.alleyGang(corner.gang)
      });
    }
  }

  /// The boys in the alley: a toll if they don't know him, a nod if they do.
  alleyGang(id) {
    const gang = GANGS[id];
    const hud = this.scene.get('Hud');
    if (!gang || !hud || !hud.showDialogue) return;

    const standing = gangStanding(this.run, id);
    this.run.tollPaid = this.run.tollPaid || {};

    if (standing >= 15) {
      hud.showDialogue(gang.speaker, ['自己人。火还烧着，过去烤吧。']);
      return;
    }

    // Paid already today: the corner is open to him for the rest of the day.
    if (this.run.tollPaid[id] === this.run.day) {
      hud.showDialogue(gang.speaker, ['今天交过了。过去吧，别惹事。']);
      return;
    }

    const fee = 6;

    hud.showDialogue(
      gang.speaker,
      [gang.story[0], `这条巷子是我们的。想从这儿过，留 ${fee} 块。`],
      null,
      [
        { label: `给 ${fee} 块`, onPick: () => this.payToll(id, fee) },
        { label: '绕开走' }
      ]
    );
  }

  payToll(id, fee) {
    const gang = GANGS[id];
    const hud = this.scene.get('Hud');

    this.run.tollPaid = this.run.tollPaid || {};
    if (this.run.tollPaid[id] === this.run.day) return;

    if (this.run.money < fee) {
      if (hud && hud.showToast) hud.showToast('你身上没那么多钱，他们骂了一句让你滚。');
      haptic('refuse');
      return;
    }

    this.run.money -= fee;
    this.run.tollPaid[id] = this.run.day;

    const before = gangStanding(this.run, id);
    const standing = addDailyStanding(this.run, id, 1);
    const gained = standing > before;

    this.floatText(
      this.player.x,
      this.player.y - 46,
      gained ? `交了 ${fee} 块 · 声望 ${standing}` : `交了 ${fee} 块，今天他们不会再记什么了`,
      '#f2c46a'
    );

    if (hud && hud.showToast && !gained && gangGainLeft(this.run, id) <= 0) {
      hud.showToast(`${gang.leader} 今天已经记了不少，明天再来吧。`);
    }

    haptic('buy');
    playSfx('buy');
  }

  // ----------------------------------------------------------------- the gangs
  /// The camps: a burning barrel, a pile of cardboard and two people sitting
  /// close to it, in the alley, on the black street and in the park.
  buildGangCamps() {
    for (const gang of Object.values(GANGS)) {
      const strip = this.stripFor(gang.district);
      if (!strip) continue;

      const x = strip.x0 + gang.spot.x;
      const y = strip.y0 + gang.spot.y;

      this.add.image(x, y, 'furn-fire').setOrigin(0.5, 1).setDepth(y);
      this.add.image(x - 44, y - 2, 'cardboardpile').setOrigin(0.5, 1).setDepth(y - 1);
      this.add.image(x - 26, y + 4, 'ped-drunk').setDepth(y + 1);
      this.add.image(x + 34, y + 2, 'ped-drunk').setDepth(y + 2);

      if (this.lightSpots) this.lightSpots.push({ x, y: y - 40 });

      // The gang's barrel burns all night, and anybody standing at it gets the
      // shiver out of their bones.
      this.braziers = this.braziers || [];
      this.braziers.push({ x, y, lit: true, until: Number.MAX_SAFE_INTEGER, fire: null });

      this.addInteractable({
        x,
        y: y - 12,
        radius: 84,
        label: `${gang.name}·营地`,
        use: () => this.talkGang(gang.id)
      });
    }
  }

  gangQuestOf(id) {
    this.run.gangQuest = this.run.gangQuest || {};
    return this.run.gangQuest[id] || null;
  }

  gangZoneName(id) {
    const names = {
      market: '市场街',
      square: '火车站广场',
      alley: '后巷',
      park: '小公园',
      camp: '城郊营地',
      slum: '黑街',
      commerce: '商业区'
    };

    return names[id] || '街上';
  }

  questText(quest) {
    if (!quest) return '';
    if (quest.kind === 'money') return `${quest.need} 元`;
    if (quest.kind === 'tell') return `去${this.gangZoneName(quest.district)}传个话`;

    const item = JUNK_ITEMS[quest.id];
    return `${item ? item.name : '东西'} ${quest.need} 件`;
  }

  questProgress(quest) {
    if (!quest) return 0;
    if (quest.kind === 'money') return Math.min(quest.need, this.run.money);
    if (quest.kind === 'tell') return this.district && this.district.id === quest.district ? 1 : 0;

    return Math.min(quest.need, this.run.items[quest.id] || 0);
  }

  questDone(quest) {
    return !!quest && this.questProgress(quest) >= quest.need;
  }

  talkGang(id) {
    const gang = GANGS[id];
    const hud = this.scene.get('Hud');
    if (!gang || !hud || !hud.showDialogue) return;

    const standing = gangStanding(this.run, id);
    const tier = standing >= GANG_CROWN ? 3 : standing >= 30 ? 2 : standing >= 12 ? 1 : 0;
    const lines = [gang.story[Math.min(tier, gang.story.length - 1)]];
    const quest = this.gangQuestOf(id);

    if (standing >= GANG_CROWN) {
      lines.push(`（声望 ${standing}）街面上都认你了。要不要我们把你推上去？`);
      hud.showDialogue(gang.speaker, lines, null, [
        { label: '现在就选', onPick: () => this.gangCrown(id) },
        { label: '再等等' }
      ]);
      return;
    }

    if (quest && this.questDone(quest)) {
      lines.push(
        quest.kind === 'tell' ? '话带到了。' : `要的东西齐了：${this.questText(quest)}。`
      );
      hud.showDialogue(gang.speaker, lines, null, [
        { label: '交差', onPick: () => this.finishGangQuest(id) },
        { label: '再等等' }
      ]);
      return;
    }

    if (!quest) {
      lines.push(`（声望 ${standing}）帮里有点事要人跑一趟。`);
      hud.showDialogue(gang.speaker, lines, null, [
        { label: '我接了', onPick: () => this.startGangQuest(id) },
        { label: '回头再说' }
      ]);
      return;
    }

    const detail = quest.kind === 'tell' && quest.message ? `（“${quest.message}”）` : '';
    lines.push(
      `要办的事：${this.questText(quest)}${detail}（${this.questProgress(quest)}/${quest.need}）`
    );
    hud.showDialogue(gang.speaker, lines);
  }

  startGangQuest(id) {
    const gang = GANGS[id];
    if (!gang) return;

    this.run.gangQuest = this.run.gangQuest || {};
    this.run.gangQuest[id] = pickGangQuest(gang);

    const quest = this.run.gangQuest[id];
    const hud = this.scene.get('Hud');
    const detail = quest && quest.kind === 'tell' && quest.message ? ` —— “${quest.message}”` : '';

    if (hud && hud.showToast) {
      hud.showToast(`接了${gang.name}的活：${this.questText(quest)}${detail}`);
    }
    haptic('ui');
    playSfx('ui');
  }

  /// A message carried to another district is delivered the moment the beggar
  /// walks in: the line is said, and the job is that much closer to done.
  checkTellQuests() {
    const book = this.run.gangQuest;
    if (!book || !this.district) return;

    for (const id of Object.keys(book)) {
      const quest = book[id];

      if (!quest || quest.kind !== 'tell' || quest.delivered) continue;
      if (quest.district !== this.district.id) continue;

      quest.delivered = true;

      const hud = this.scene.get('Hud');
      if (hud && hud.showToast) {
        hud.showToast(
          `你把话带到了${this.gangZoneName(quest.district)}：${quest.message || '话带到了'}`
        );
      }

      haptic('ui');
      playSfx('voice');
    }
  }

  finishGangQuest(id) {
    const gang = GANGS[id];
    const quest = this.gangQuestOf(id);
    if (!gang || !quest || !this.questDone(quest)) return;

    if (quest.kind === 'money') this.run.money -= quest.need;
    if (quest.kind === 'item') this.run.items[quest.id] = Math.max(0, (this.run.items[quest.id] || 0) - quest.need);

    this.refreshBagCount();
    const before = gangStanding(this.run, id);
    const standing = addDailyStanding(this.run, id, quest.reward);
    const gained = standing > before;
    this.run.gangQuest[id] = null;

    this.floatText(
      this.player.x,
      this.player.y - 50,
      gained ? `${gang.name} 声望 +${standing - before}` : `${gang.name} 今天记不了了`,
      '#f2c46a'
    );

    const hud = this.scene.get('Hud');
    if (hud && hud.showToast) {
      hud.showToast(
        gained
          ? `${gang.leader} 记下了你 · 声望 ${standing}/100`
          : `${gang.leader} 摆摆手：今天的事我记下了，再多也记不住。`
      );
    }
    haptic('buy');
    playSfx('buy');
  }

  /// Standing high enough in one gang: the street puts the beggar up, and the
  /// gang is the one standing behind him.
  gangCrown(id) {
    const gang = GANGS[id];
    const hud = this.scene.get('Hud');
    if (!gang || !this.run || this.run.king) return;
    if (!hud || !hud.showWin) return;

    this.run.king = {
      how: 'gang',
      gang: gang.name,
      leader: gang.leader,
      day: this.run.day,
      money: this.run.money
    };
    this.run.sitting = false;

    this.stopChases();
    haptic('jackpot');
    playSfx('buy');

    hud.showWin(this.run.king);
  }

  // ---------------------------------------------------------------- building

  buildScenery() {
    for (const strip of this.strips) {
      this.add.image(strip.x0, strip.y0, 'ground').setOrigin(0, 0).setDepth(-40);
      this.add
        .image(strip.x0 + LEFT_BUILDINGS.x, strip.y0, `bld-${strip.id}-left`)
        .setOrigin(0, 0)
        .setDepth(-30);
      this.add
        .image(strip.x0 + RIGHT_BUILDINGS.x, strip.y0, `bld-${strip.id}-right`)
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

    // The narrow alleys, floor and all.
    for (const strip of this.strips) {
      if (!neighbourOf(strip.id, 'east')) continue;

      for (const alley of ALLEYS) {
        this.add
          .image(strip.x0 + RIGHT_BUILDINGS.x, strip.y0 + alley.y, 'alley')
          .setOrigin(0, 0)
          .setDepth(-29);
      }
    }

    // The police sight fans are painted on the ground, under everyone else.
    this.coneGfx = this.add.graphics().setDepth(-6);

    // The bin-search progress bar, drawn above whatever is being searched.
    this.searchBarGfx = this.add.graphics().setDepth(5600);

    // Cold light of the evening and the night, over the whole city, and the
    // warm pools the street lamps throw once it is dark.
    this.nightOverlay = this.add
      .rectangle(0, 0, this.worldWidth, this.worldHeight, 0x0a1428, 0)
      .setOrigin(0, 0)
      .setDepth(-25);

    this.lightsGfx = this.add
      .graphics()
      .setDepth(-23)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.lightSpots = [];
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

  /// A building wall runs the whole block, split wherever an opening is cut
  /// through it: the wide passage and the narrow alleys.
  addBuildingWall(add, x, y0, w, openings) {
    const gaps = (openings || []).slice().sort((a, b) => a.y - b.y);

    let cursor = 0;

    for (const gap of gaps) {
      if (gap.y > cursor) add(x, y0 + cursor, w, gap.y - cursor);
      cursor = Math.max(cursor, gap.y + gap.h);
    }

    if (cursor < STREET_HEIGHT) add(x, y0 + cursor, w, STREET_HEIGHT - cursor);
  }

  buildWalls() {
    this.walls = [];

    const add = (x, y, w, h) => {
      const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
      this.physics.add.existing(rect, true);
      this.walls.push(rect);
      return rect;
    };

    const seamsFor = (connected) => {
      if (!connected) return [];

      const openings = [{ y: SEAM.y0, h: SEAM.y1 - SEAM.y0 }];
      for (const alley of ALLEYS) openings.push({ y: alley.y, h: ALLEY_H });

      return openings;
    };

    for (const strip of this.strips) {
      const westOpenings = seamsFor(!!neighbourOf(strip.id, 'west'));
      const eastOpenings = seamsFor(!!neighbourOf(strip.id, 'east'));

      this.addBuildingWall(
        add,
        strip.x0 + LEFT_BUILDINGS.x,
        strip.y0,
        LEFT_BUILDINGS.width,
        westOpenings
      );
      this.addBuildingWall(
        add,
        strip.x0 + RIGHT_BUILDINGS.x,
        strip.y0,
        RIGHT_BUILDINGS.width,
        eastOpenings
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

    // Fences across the narrow alleys that are still locked, and the wall that
    // backs them.
    this.alleyFences = [];
    this.openAlleys = this.run.openAlleys || {};

    for (const strip of this.strips) {
      const eastId = neighbourOf(strip.id, 'east');
      if (!eastId) continue;

      const boundaryX = strip.x0 + STREET_WIDTH;

      for (const alley of ALLEYS) {
        if (!alley.locked) continue;

        const key = `${strip.id}:${eastId}:${alley.y}`;
        if (this.openAlleys[key]) continue;

        const rect = add(boundaryX - 8, strip.y0 + alley.y, 16, ALLEY_H);

        const sprite = this.add
          .image(boundaryX - 48, strip.y0 + alley.y, 'fence')
          .setOrigin(0, 0)
          .setDepth(strip.y0 + alley.y + ALLEY_H);

        const def = {
          x: boundaryX,
          y: strip.y0 + alley.y + ALLEY_H / 2,
          radius: 76,
          label: '铁栅栏 · 需要开锁器',
          use: () => this.openAlley(key, rect, sprite, def)
        };

        this.addInteractable(def);
        this.alleyFences.push({ key, rect, sprite });
      }
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

        for (const alley of ALLEYS) {
          gates.push(add(strip.x0 - 8, strip.y0 + alley.y, 16, ALLEY_H));
        }
      }

      if (neighbourOf(strip.id, 'east')) {
        gates.push(
          add(strip.x0 + STREET_WIDTH - 8, strip.y0 + SEAM.y0, 16, SEAM.y1 - SEAM.y0)
        );

        for (const alley of ALLEYS) {
          gates.push(
            add(strip.x0 + STREET_WIDTH - 8, strip.y0 + alley.y, 16, ALLEY_H)
          );
        }
      }

      for (const rect of gates) this.gates.push({ id: strip.id, rect });
    }
  }

  /// Opening a locked alley with the lockpick: the fence comes down and stays
  /// down for the rest of the run.
  openAlley(key, rect, sprite, def) {
    if (!this.run.tools.lockpick) {
      haptic('refuse');
      this.floatText(this.player.x, this.player.y - 46, '铁链锁着，得有开锁器', UI.creamDim);
      return;
    }

    this.run.openAlleys = this.run.openAlleys || {};
    this.run.openAlleys[key] = true;

    if (rect) {
      rect.destroy();
      this.walls = this.walls.filter((wall) => wall !== rect);
    }

    if (sprite) {
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        angle: -6,
        duration: 260,
        onComplete: () => sprite.destroy()
      });
    }

    this.interactables = this.interactables.filter((d) => d !== def);

    this.advanceTime(15);
    haptic('unlock');
    this.floatText(this.player.x, this.player.y - 46, '铁栅栏开了', '#a8d98a');
  }

  /// What is lying in the alleys between blocks: piles of boxes, bags of
  /// rubbish, somebody else's shack and the shop back doors.
  buildAlleyContent() {
    for (const strip of this.strips) {
      const eastId = neighbourOf(strip.id, 'east');
      if (!eastId) continue;

      const baseX = strip.x0 + RIGHT_BUILDINGS.x;
      const junk = strip.district.junk || [];

      ALLEYS.forEach((alley, index) => {
        const y0 = strip.y0 + alley.y;
        const floorY = y0 + ALLEY_H;

        if (index === 0) {
          const pile = this.add
            .image(baseX + 16, floorY - 4, 'cardboardpile')
            .setOrigin(0, 1)
            .setDepth(floorY);

          const pileDef = {
            x: baseX + 44,
            y: floorY - 20,
            radius: 72,
            label: '翻纸箱堆',
            flash: () => this.flashSprite(pile),
            use: () => {
              this.interactables = this.interactables.filter((d) => d !== pileDef);
              pile.destroy();

              this.addToBag('cardboard', baseX + 44, floorY - 30);
              this.addToBag('cardboard', baseX + 44, floorY - 30);
              if (junk.length) {
                this.addToBag(junk[Phaser.Math.Between(0, junk.length - 1)], baseX + 44, floorY - 30);
              }

              this.advanceTime(15);
            }
          };
          this.addInteractable(pileDef);

          const bags = this.add
            .image(baseX + 108, floorY - 2, 'trashbags')
            .setOrigin(0, 1)
            .setDepth(floorY);

          const bagsDef = {
            x: baseX + 132,
            y: floorY - 16,
            radius: 70,
            label: '翻垃圾袋',
            flash: () => this.flashSprite(bags),
            use: () => {
              this.interactables = this.interactables.filter((d) => d !== bagsDef);
              bags.destroy();

              if (junk.length) {
                this.addToBag(junk[Phaser.Math.Between(0, junk.length - 1)], baseX + 132, floorY - 26);
              }

              this.advanceTime(10);
            }
          };
          this.addInteractable(bagsDef);

          this.add
            .image(baseX + 186, y0 + 6, 'backdoor')
            .setOrigin(0, 0)
            .setDepth(y0 + 1);

          this.addInteractable({
            x: baseX + 206,
            y: y0 + 38,
            radius: 64,
            label: '店铺后门 · 锁着',
            use: () => {
              haptic('refuse');
              const hud = this.scene.get('Hud');
              if (hud && hud.showToast) hud.showToast('后门从里面锁死了，敲也没人应。');
            }
          });
        } else {
          this.add
            .image(baseX + 150, floorY - 2, 'shack')
            .setOrigin(0.5, 1)
            .setDepth(floorY);

          this.addInteractable({
            x: baseX + 150,
            y: floorY - 12,
            radius: 72,
            label: '别人的窝棚',
            use: () => {
              haptic('refuse');
              const hud = this.scene.get('Hud');
              if (hud && hud.showToast) hud.showToast('窝棚里的人盯了你一眼，还是别翻了。');
            }
          });

          const pile = this.add
            .image(baseX + 14, floorY - 4, 'cardboardpile')
            .setOrigin(0, 1)
            .setDepth(floorY);

          const pileDef = {
            x: baseX + 42,
            y: floorY - 20,
            radius: 70,
            label: '翻纸箱堆',
            flash: () => this.flashSprite(pile),
            use: () => {
              this.interactables = this.interactables.filter((d) => d !== pileDef);
              pile.destroy();
              this.addToBag('cardboard', baseX + 42, floorY - 30);
              this.advanceTime(15);
            }
          };
          this.addInteractable(pileDef);
        }
      });
    }
  }

  /// True when something the player has to see or reach already stands inside
  /// this rectangle: a begging mat, a bin, a machine, a bench, a tree. Street
  /// furniture is only decoration, so it gives way.
  spotBlocked(strip, x, y, w, h) {
    const pad = 26;
    const spots = [];

    for (const s of strip.district.bins || []) spots.push([s.x, s.y]);
    for (const s of strip.district.mats || []) spots.push([s.x, s.y]);
    for (const s of strip.district.vending || []) spots.push([s.x, s.y - 24]);
    for (const s of strip.district.slots || []) spots.push([s.x, s.y]);
    for (const s of strip.district.benches || []) spots.push([s.x, s.y]);

    for (const s of strip.district.landmarks || []) {
      if (s.tex === 'tree' || s.tex === 'hedge') spots.push([s.x, s.y]);
    }

    return spots.some(
      ([px, py]) => px > x - pad && px < x + w + pad && py > y - pad && py < y + h + pad
    );
  }

  /// Street furniture: crossings and their lights, cars at the kerb, awnings
  /// over the odd door. Whatever would stand in front of something the player
  /// can reach is left out — a bin or a mat must never be hidden.
  buildStreetDetail() {
    const add = (x, y, w, h) => {
      const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
      this.physics.add.existing(rect, true);
      this.walls.push(rect);
      return rect;
    };

    for (const strip of this.strips) {
      const decor = STREET_DECOR[strip.id];
      if (!decor) continue;

      const x0 = strip.x0;
      const y0 = strip.y0;

      for (const cy of decor.crosswalks || []) {
        this.add.image(x0 + ROAD.x, y0 + cy, 'crosswalk').setOrigin(0, 0).setDepth(-35);

        this.add
          .image(x0 + ROAD.x - 14, y0 + cy + 4, 'trafficlight')
          .setOrigin(0, 0)
          .setDepth(y0 + cy);

        this.add
          .image(x0 + ROAD.x + ROAD.width + 4, y0 + cy + 4, 'trafficlight')
          .setOrigin(0, 0)
          .setDepth(y0 + cy);
      }

      (decor.cars || []).forEach((cy, i) => {
        const cx = i % 2 === 0 ? ROAD.x + 8 : ROAD.x + ROAD.width - 62;

        if (this.spotBlocked(strip, cx, cy, 54, 96)) return;

        this.add.image(x0 + cx, y0 + cy, 'parkedcar').setOrigin(0, 0).setDepth(y0 + cy + 96);
        add(x0 + cx + 4, y0 + cy + 4, 46, 88);
      });

      for (const ay of decor.awnings || []) {
        if (this.spotBlocked(strip, 392, ay, 120, 26)) continue;

        this.add.image(x0 + 392, y0 + ay, 'awning').setOrigin(0, 0).setDepth(y0 + ay);
        if (this.awnings) this.awnings.push({ x: x0 + 392, y: y0 + ay });
      }
    }
  }

  /// Everything that has something over it: the awnings over shop doors, the
  /// shopfronts themselves, and the bridge above the back alley. Standing in one
  /// of these keeps the rain off.
  buildCover() {
    this.coverRects = [];

    for (const strip of this.strips) {
      for (const shop of SHOPS) {
        if (shop.district !== strip.id || shop.ground) continue;

        // The awning over a doorway reaches out across the pavement in front
        // of it, which is where the beggar can actually stand.
        this.coverRects.push({
          x: shop.doorX + strip.x0 - 70,
          y: shop.doorY + strip.y0 - 90,
          w: 140,
          h: 126
        });
      }
    }

    for (const awning of this.awnings || []) {
      this.coverRects.push({ x: awning.x, y: awning.y - 8, w: 120, h: 54 });
    }

    const alley = this.stripFor('alley');
    if (alley) {
      this.coverRects.push({
        x: alley.x0,
        y: alley.y0 + 236,
        w: STREET_WIDTH,
        h: 124
      });
    }
  }

  /// Is there something over the beggar's head right now?
  underCover() {
    if (!this.player || !this.coverRects || !this.coverRects.length) return false;

    const px = this.player.x;
    const py = this.player.y;

    return this.coverRects.some((r) => px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h);
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

  /// Things worth a look that are not lying in the open: a manhole cover, a
  /// hedge, a shop's back door, the shade under a parked car. Each one can be
  /// turned over once a day, and what comes out comes from this street.
  buildHides() {
    const spots = {
      market: [
        { x: 150, y: 420, kind: 'manhole' },
        { x: 470, y: 980, kind: 'car' }
      ],
      square: [
        { x: 210, y: 760, kind: 'manhole' },
        { x: 500, y: 1210, kind: 'car' }
      ],
      alley: [
        { x: 455, y: 300, kind: 'backdoor' },
        { x: 150, y: 1140, kind: 'manhole' }
      ],
      park: [
        { x: 300, y: 900, kind: 'bush' },
        { x: 470, y: 320, kind: 'bush' }
      ],
      camp: [{ x: 430, y: 380, kind: 'manhole' }],
      slum: [
        { x: 150, y: 500, kind: 'manhole' },
        { x: 452, y: 1240, kind: 'backdoor' }
      ],
      commerce: [
        { x: 420, y: 520, kind: 'car' },
        { x: 200, y: 1180, kind: 'manhole' }
      ]
    };

    const labels = {
      manhole: '井盖·掀开看看',
      bush: '花丛·翻一翻',
      backdoor: '后门·摸一摸',
      car: '车底·摸一摸'
    };

    for (const strip of this.strips) {
      for (const spot of spots[strip.id] || []) {
        const x = strip.x0 + spot.x;
        const y = strip.y0 + spot.y;

        const tex =
          spot.kind === 'manhole'
            ? 'manhole'
            : spot.kind === 'bush'
              ? 'hedge'
              : spot.kind === 'backdoor'
                ? 'backdoor'
                : 'parkedcar';

        const img = this.add
          .image(x, y, tex)
          .setOrigin(0.5, 1)
          .setDepth(spot.kind === 'backdoor' ? -28 : y);

        // Searched today or not: the spot is good again tomorrow.
        img.setData('day', -1);

        this.addInteractable({
          x,
          y: y - 10,
          radius: 64,
          label: labels[spot.kind] || '翻一翻',
          enabled: () => img.getData('day') !== this.run.day,
          flash: () => this.flashSprite(img),
          use: () => this.searchHide(img)
        });
      }
    }
  }

  searchHide(img) {
    if (img.getData('day') === this.run.day) {
      haptic('refuse');
      return;
    }

    img.setData('day', this.run.day);
    this.advanceTime(15);

    // Now and then there is a coin under there, and nothing else.
    if (Math.random() < 0.2) {
      const amount = Phaser.Math.Between(1, 4);

      this.run.money += amount;
      this.run.scavengeIncome += amount;
      this.floatText(img.x, img.y - 30, `摸到 ${amount} 元`, UI.gold);
      playSfx('coin');
      haptic('coin');
      return;
    }

    // What comes out belongs to the street it was hidden in.
    const pool = (this.district && this.district.junk) || JUNK_ORDER;
    const id = pool[Math.floor(Math.random() * pool.length)];

    this.addToBag(id, img.x, img.y - 30);
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
    const intro = this.run && this.run.story === 1;
    const spawnX = strip.x0 + (intro ? 260 : 200);
    const spawnY = strip.y0 + (intro ? 640 : this.spawnAt === 'top' ? 150 : 1180);

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
    // The junk stall belongs to the market, at the bottom of the street. The
    // pawn shop sits over in the business district, where the things worth
    // pawning actually come from, so the two sellers are never in one view.
    const market = this.stripFor('market');

    if (market) {
      const ox = market.x0;
      const oy = market.y0;

      this.add.image(STALL.x + ox, STALL.y + oy, 'stall').setOrigin(0.5, 1).setDepth(STALL.y + oy);
      this.add
        .image(STALL.vendorX + ox, STALL.vendorY + oy, 'ped-lady')
        .setDepth(STALL.vendorY + oy);

      this.addInteractable({
        x: STALL.x + ox,
        y: STALL.y + oy - 30,
        radius: TRADE_RADIUS,
        label: '旧货摊·只收废品',
        use: () => this.openTrade('stall')
      });
    }

    const commerce = this.stripFor('commerce');

    if (commerce) {
      const ox = commerce.x0;
      const oy = commerce.y0;

      this.add.image(PAWN.x + ox, PAWN.y + oy, 'pawnshop').setOrigin(0, 0).setDepth(-28);

      this.addInteractable({
        x: PAWN.doorX + ox,
        y: PAWN.doorY + oy,
        radius: TRADE_RADIUS,
        label: '当铺·收值钱东西',
        use: () => this.openTrade('pawn')
      });
    }
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
          .setDepth(shop.ground ? shop.y + strip.y0 + 88 : -28);

        this.addInteractable({
          x: shop.doorX + strip.x0,
          y: shop.doorY + strip.y0,
          radius: shop.radius,
          label: shop.ground ? `${shop.name}·买点吃的` : `进${shop.name}`,
          use: () => this.openStore(shop.id)
        });

        // The shop's own light, spilling onto the pavement after dark.
        if (this.lightSpots) {
          this.lightSpots.push({
            x: shop.doorX + strip.x0 + 14,
            y: shop.doorY + strip.y0 - 26
          });
        }
      }
    }
  }

  buildPrompt() {
    this.prompt = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '15px',
        color: UI.cream,
        backgroundColor: 'rgba(18,14,10,0.82)',
        padding: { x: 9, y: 5 }
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
    if (this.seenByPolice()) return '城管正看着你，别动手';

    // Close enough to talk a passer-by into buying something.
    if (this.peddleTarget && this.peddleItems().length) {
      return `兜售：${this.peddleTarget.kind.label || '路人'}`;
    }

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
    const alert = this.encounterAlert(ped);

    let width = (asItem ? 0.5 : 0.4) - alert * 0.18;
    if (this.run.tools.lockpick) width += 0.1;
    if (this.run.tools.lockpick2) width += 0.08;
    if (this.run.tools.coat) width += 0.04;

    // The torn glove makes every window a fifth wider.
    if (this.run.tools.glove) width *= 1.2;

    // And a practiced hand makes it wider again: the first attempts are meant
    // to be bad, and only doing it again and again fixes that.
    width *= 1 + skillBonus(this.run, 'steal') + bookBonus(this.run, 'steal');

    // A watched street closes the window: the commercial district is nearly
    // hopeless, the slum a touch easier than the rest.
    width *= district.stealZone || 1;
    width = Phaser.Math.Clamp(width, 0.14, asItem ? 0.66 : 0.58);

    const start = Phaser.Math.FloatBetween(0.1, Math.max(0.12, 0.9 - width));

    // The blade opens a golden sliver in the middle of the window.
    const perfectWidth = this.run.tools.blade ? width * 0.4 : 0;
    const perfectStart = perfectWidth > 0 ? start + (width - perfectWidth) / 2 : 0;

    let speed = (0.55 + alert * 0.55) * (district.stealSpeed || 1) * (asItem ? 0.85 : 1);

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

    // Coming up to somebody is the moment the encounter is set: the odds are
    // fixed here, so standing there while they get jumpier does not close the
    // window under the player's thumb.
    this.encounterAlert(ped);

    return {
      purse: ped.purse,
      loot: ped.loot && !ped.lootTaken ? ped.loot : null
    };
  }

  /// The walker's alertness for this encounter: whatever it was when the beggar
  /// first came up to them.
  encounterAlert(ped) {
    if (!ped) return 0;
    if (this.alertPed === ped) return this.alertValue || 0;

    this.alertPed = ped;
    this.alertValue = ped.alert || 0;

    return this.alertValue;
  }

  /// Reaching for a wallet or into a pocket opens the QTE panel; the HUD calls
  /// back with the result of the player's tap.
  trySteal(mode) {
    if (this.run.over || this.run.sitting || this.qtePed || this.searching) return;

    if (this.seenByPolice() && !this.run.tools.blade) {
      haptic('refuse');
      this.floatText(this.player.x, this.player.y - 44, '城管正看着你', '#f0a08a');
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

    // What is in the purse at the moment the hand goes in is what the hand
    // comes out with, whatever happens to the walker while the window is open.
    this.stealTake = asItem ? 0 : Math.max(0, Math.round(ped.purse));

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

    this.progressGoal('steal', 1);

    if (lootId) {
      ped.lootTaken = true;
      this.addLoot(lootId, ped.sprite.x, ped.sprite.y - 10);
    }

    this.advanceTime(20);
    playSfx('steal');
    haptic('steal');
    this.sayBubble(ped, stealNoticedLine());
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
    this.alertPed = null;

    if (!ped || this.run.over) return;

    // Every hand in a pocket, clean or caught, teaches the hand something.
    this.practice('steal', 1);

    this.advanceTime(20);

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
      this.progressGoal('steal', 1);
      playSfx('steal');
      haptic('steal');
      this.sayBubble(ped, stealNoticedLine());
      return;
    }

    if (success) {
      const take = Math.max(0, Math.round(this.stealTake || ped.purse || 0));
      const amount = Math.max(1, Math.round(perfect ? take * 2 : take));

      ped.purse = Math.max(0, ped.purse - take);
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
        perfect ? `完美一刀 +${amount} 元` : `摸到 +${amount} 元`,
        UI.gold
      );

      // And the same news over the beggar's own head, so the money going up is
      // never a guess.
      this.floatText(this.player.x, this.player.y - 58, `+${amount} 元`, UI.gold);

      const hud2 = this.scene.get('Hud');
      if (hud2 && hud2.showToast) hud2.showToast(`摸到 ${amount} 元，装进兜里`);

      if (perfect) this.stayQuiet(ped);
      else this.caughtInTheAct();

      this.progressGoal('steal', 1);
      playSfx('steal');
      haptic('steal');
      this.sayBubble(ped, stealNoticedLine());

      this.stealTake = 0;
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
      this.sayBubble(ped, stealCaughtLine());
      playSfx('caught');
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
    this.sayBubble(ped, stealCaughtLine());
    playSfx('stealFail');
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
    playSfx('eat');
    haptic('buy');
    this.floatText(this.player.x, this.player.y - 46, `${food.name} +${food.restore}`, '#a8d98a');

    // Chapter one: the first proper meal of the run ends the day.
    if (id === 'bread' && this.run.story === 2) this.storyAfterBread();

    return true;
  }

  sellJunk(id, atPawn) {
    if (!JUNK_ITEMS[id]) return false;
    if (!this.run.items[id] || this.run.items[id] <= 0) return false;

    const price = Math.max(1, Math.round(junkPrice(id, atPawn) * this.sellMul()));
    this.run.items[id] -= 1;
    this.run.money += price;
    this.run.soldIncome += price;
    this.progressGoal('sell', price);
    this.addFavor(atPawn ? 'chen' : 'stall', 8);
    this.refreshBagCount();
    this.floatText(this.player.x, this.player.y - 46, `+${price} 元`, UI.gold);
    return true;
  }

  /// Something lifted out of a pocket goes into the bag, not into coins.
  addLoot(id, x, y) {
    const item = LOOT_ITEMS[id];
    if (!item) return;

    if (this.run.bag >= this.bagLimit()) {
      this.floatText(x, y, '包满了，去卖点东西', '#f0a08a');
      return;
    }

    this.run.loot[id] = (this.run.loot[id] || 0) + 1;
    this.refreshBagCount();
    playSfx('pickup');
    haptic('pickup');
    this.floatText(x, y, `顺手：${item.name}`, '#e8dcc2');
  }

  sellLoot(id, atPawn) {
    if (!LOOT_ITEMS[id]) return false;
    if (!this.run.loot[id] || this.run.loot[id] <= 0) return false;

    const price = Math.max(1, Math.round(lootPrice(id, atPawn) * this.sellMul()));
    this.run.loot[id] -= 1;
    this.run.money += price;
    this.run.soldIncome += price;
    this.progressGoal('sell', price);
    this.addFavor(atPawn ? 'chen' : 'stall', 8);
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
    const mul = this.sellMul();

    for (const id of JUNK_ORDER) {
      while (this.run.items[id] > 0) {
        this.run.items[id] -= 1;
        total += Math.max(1, Math.round(junkPrice(id, atPawn) * mul));
      }
    }

    if (total > 0) {
      this.run.money += total;
      this.run.soldIncome += total;
      this.progressGoal('sell', total);
      this.addFavor(atPawn ? 'chen' : 'stall', 8);
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
    playSfx('buy');
    haptic('buy');
    this.floatText(this.player.x, this.player.y - 46, `买下${tool.name}`, '#a8d98a');
    return true;
  }

  /// Called by the end-of-run card. The street is rebuilt with a fresh run: the
  /// payload from the last travel is deliberately not passed on, because it
  /// still points at the run that just ended.
  restartRun() {
    this.scene.restart({ district: this.district.id, spawn: 'bottom' });
  }

  /// Writes the run to the device's one save slot.
  saveNow() {
    if (!this.run || this.run.over) return false;

    return saveGame({
      district: this.district ? this.district.id : START_DISTRICT,
      run: this.run,
      homePlaced: this.homePlaced
    });
  }

  /// Reloads the saved run into a fresh street.
  loadSaved() {
    const saved = loadGame();
    if (!saved) return false;

    if (saved.homePlaced) this.registry.set('homePlaced', saved.homePlaced);

    this.scene.restart({
      district: saved.district || this.district.id,
      run: saved.run,
      spawn: 'bottom'
    });

    return true;
  }

  clearSaved() {
    clearGame();
  }

  /// What the tester panel hands out: money, a bag of junk, a full belly or a
  /// few hours on the clock.
  debugGive(kind) {
    if (!this.run || this.run.over) return;

    if (kind === 'money') {
      this.run.money += 100;
      this.floatText(this.player.x, this.player.y - 46, '+100 元', UI.gold);
    } else if (kind === 'materials') {
      for (const id of JUNK_ORDER) this.run.items[id] = (this.run.items[id] || 0) + 3;
      this.refreshBagCount();
      this.floatText(this.player.x, this.player.y - 46, '废品各 +3', '#a8d98a');
    } else if (kind === 'heal') {
      this.run.hunger = HUNGER_MAX;
      this.run.energy = ENERGY_MAX;
      this.floatText(this.player.x, this.player.y - 46, '精力饱食回满', '#a8d98a');
    } else if (kind === 'time') {
      this.advanceTime(180);
      this.floatText(this.player.x, this.player.y - 46, '时间 +3 小时', UI.creamDim);
    }

    haptic('buy');
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
    // A recipe prefixed "furn:" builds a piece of furniture and sets it down in
    // the tent there and then.
    if (typeof id === 'string' && id.indexOf('furn:') === 0) {
      return this.craftFurniture(id.slice(5));
    }

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

    const price = Math.max(1, Math.round(rec.value * this.sellMul()));

    this.run.goods[id] -= 1;
    this.run.money += price;
    this.run.soldIncome += price;
    this.progressGoal('sell', price);
    this.floatText(this.player.x, this.player.y - 46, `+${price} 元`, UI.gold);
    return true;
  }

  openCraft() {
    const hud = this.scene.get('Hud');
    if (hud && hud.openCraft && this.scene.isActive('Hud')) hud.openCraft();
  }

  // -------------------------------------------------------------- the city

  unlockedList() {
    // The whole city is open from the first day: walking it is the only gate.
    const all = DISTRICT_ORDER.slice();
    const stored = this.registry.get('unlocked');

    if (!Array.isArray(stored) || stored.length !== all.length) {
      this.registry.set('unlocked', all);
    }

    return all;
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
    if (strip && strip.district !== this.district) {
      this.district = strip.district;

      // Walking into a district is what unlocks the ones hanging off it.
      this.registerVisit();
      this.saveNow();
    }

    this.edgeHint = '';
    if (!strip) return;

    const unlocked = this.unlockedList();
    const reach = 150;
    const toX = px - strip.x0;
    const toY = py - strip.y0;

    const hintFor = (dir, arrow) => {
      const id = neighbourOf(strip.id, dir);
      if (!id) return '';

      if (unlocked.includes(id)) return `${arrow} 前往${DISTRICTS[id].name}`;

      const need = DISTRICTS[id].unlockAfter;
      if (!need) return `🔒 ${DISTRICTS[id].name} 锁着`;

      return `🔒 ${DISTRICTS[id].name} 锁着 · 先去过${DISTRICTS[need].name}`;
    };

    if (toX < reach) this.edgeHint = hintFor('west', '⬅️');
    else if (toX > STREET_WIDTH - reach) this.edgeHint = hintFor('east', '➡️');
    else if (toY < reach) this.edgeHint = hintFor('north', '⬆️');
    else if (toY > STREET_HEIGHT - reach) this.edgeHint = hintFor('south', '⬇️');
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

    if (this.run.bag >= this.bagLimit()) {
      this.floatText(x, y, '包满了，去卖点东西', '#f0a08a');
      return;
    }

    this.run.items[id] += 1;
    this.refreshBagCount();
    playSfx('pickup');
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
    this.begTick = 0;
    this.advanceTime(10);
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

    this.showBowlStyle();

    // Sitting down is also the moment to decide how to beg.
    const hud = this.scene.get('Hud');
    if (hud && hud.openBegChoice && this.scene.isActive('Hud')) hud.openBegChoice();

    haptic('ui');
  }

  standUp() {
    if (!this.run.sitting) return;

    this.run.sitting = false;
    this.player.setTexture(this.poseTex('idle'));
    this.bowl.setVisible(false);
    if (this.bowlStyle) this.bowlStyle.setVisible(false);
  }

  // ------------------------------------------------------------------ begging

  /// The label floating over the bowl: how the beggar is playing it today.
  showBowlStyle() {
    const names = { plead: '卖惨', song: '弹唱', fake: '装病' };
    const style = this.run.begStyle || 'plead';

    if (!this.bowlStyle) {
      this.bowlStyle = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '13px',
          color: '#f2c46a',
          stroke: '#100d09',
          strokeThickness: 3
        })
        .setOrigin(0.5, 1)
        .setDepth(6500);
    }

    this.bowlStyle
      .setText(names[style] || '卖惨')
      .setPosition(this.bowl.x, this.bowl.y - 14)
      .setVisible(!!this.run.sitting);
  }

  setBegStyle(id) {
    if (!this.run.sitting) return;

    this.run.begStyle = id === 'song' ? 'song' : id === 'fake' ? 'fake' : 'plead';

    this.showBowlStyle();
    haptic('ui');

    const names = { plead: '卖惨', song: '弹唱', fake: '装病' };

    this.floatText(
      this.player.x,
      this.player.y - 52,
      `改成${names[this.run.begStyle]}`,
      UI.cream
    );
  }

  /// How much a coin is worth in each style, before the district and the hour.
  begStyleMul() {
    const style = this.run.begStyle || 'plead';
    const seg = segmentOf(this.run.step);
    const district = this.district.id;

    if (style === 'song') {
      let m = 1.6;
      if (seg >= 2) m -= 0.4;
      if (district === 'slum') m -= 0.5;
      if (district === 'park' || district === 'square') m += 0.2;

      return Math.max(0.5, m);
    }

    if (style === 'fake') {
      return seg === 3 || seg === 0 ? 2.4 : 2;
    }

    return 1;
  }

  /// The price of a style that is louder or more of a con than plain begging.
  updateBegging(dt) {
    if (!this.run.sitting || this.run.over) return;

    const style = this.run.begStyle || 'plead';
    this.begTick = (this.begTick || 0) + dt;

    if (style === 'song' && this.begTick >= 8) {
      this.begTick = 0;
      this.run.wanted = Math.min(100, (this.run.wanted || 0) + 6);
      this.floatText(this.player.x, this.player.y - 58, '♪', '#f2c46a');
    } else if (style === 'fake' && this.begTick >= 9) {
      this.begTick = 0;

      if (Math.random() < 0.3 && this.run.money > 0) {
        const loss = Math.min(this.run.money, Phaser.Math.Between(1, 3));

        this.run.money -= loss;
        this.floatText(this.player.x, this.player.y - 52, `有人摸走了 ${loss} 元`, '#f0a08a');
        haptic('refuse');
      }
    }
  }

  // ------------------------------------------------------------- weather, city

  updateCity(dt) {
    const run = this.run;

    ensureCity(run);

    const fx = cityEffects(run.city, run.step);
    this.cityFx = fx;

    const eventId = fx.event ? fx.event.id : null;
    if (eventId !== this.cityEventId) {
      this.cityEventId = eventId;

      const hud = this.scene.get('Hud');
      if (eventId && hud && hud.showToast) hud.showToast(`城里：${EVENTS[eventId].name}`);
    }

    setWeatherSound(fx.weather.id);
    this.drawWeather(dt);
  }

  /// Rain streaks, snowflakes and the shimmer of a hot afternoon, over the
  /// street and under the HUD.
  drawWeather(dt) {
    if (!this.weatherGfx) this.weatherGfx = this.add.graphics().setDepth(4500);

    const g = this.weatherGfx;
    g.clear();

    const fx = this.cityFx;
    if (!fx) return;

    const kind = fx.weather.id;
    const cam = this.cameras.main.worldView;

    if (kind === 'rain' || kind === 'snow') {
      if (!this.weatherDrops) {
        this.weatherDrops = Array.from({ length: 70 }, () => ({
          x: Math.random(),
          y: Math.random(),
          s: 0.6 + Math.random() * 0.8
        }));
      }

      const fall = kind === 'rain' ? 1.8 : 0.35;

      for (const d of this.weatherDrops) {
        d.y += dt * fall * d.s;

        if (d.y > 1) {
          d.y -= 1;
          d.x = Math.random();
        }

        const x = cam.x + d.x * cam.width - (kind === 'rain' ? 40 * d.s : 0);
        const y = cam.y + d.y * cam.height;

        if (kind === 'rain') {
          g.lineStyle(1, 0xcfe8f4, 0.3);
          g.lineBetween(x, y, x - 6, y + 16 * d.s);
        } else {
          g.fillStyle(0xffffff, 0.55);
          g.fillCircle(x, y, 1.6);
        }
      }
    } else if (kind === 'hot') {
      g.fillStyle(0xf2a83c, 0.05);
      g.fillRect(cam.x, cam.y, cam.width, cam.height);
    }
  }

  // ------------------------------------------------------------------- the bag

  bagLimit() {
    if (this.run.bagUp === 'cart') return 40;
    if (this.run.bagUp === 'woven') return 24;

    return 12;
  }

  cartSpeedMul() {
    return this.run.bagUp === 'cart' ? 0.88 : 1;
  }

  discardItem(kind, id) {
    if (kind === 'loot') {
      if (!this.run.loot[id]) return false;
      this.run.loot[id] -= 1;
    } else if (kind === 'good') {
      if (!this.run.goods[id]) return false;
      this.run.goods[id] -= 1;
    } else {
      if (!this.run.items[id]) return false;
      this.run.items[id] -= 1;
    }

    this.refreshBagCount();
    haptic('refuse');

    return true;
  }

  sellMul() {
    return this.cityFx ? this.cityFx.sellMul : 1;
  }

  /// A pale ring around whatever is nearest, so nothing has to be guessed at.
  drawHighlight() {
    if (!this.highlightGfx) this.highlightGfx = this.add.graphics().setDepth(5800);

    const g = this.highlightGfx;
    g.clear();

    if (this.run.over) return;

    const pulse = 0.35 + Math.sin(this.time.now / 220) * 0.15;

    let x = 0;
    let y = 0;
    let r = 0;

    if (this.nearest) {
      x = this.nearest.x;
      y = this.nearest.y;
      r = Math.min(26, this.nearest.radius * 0.32);
    } else if (this.stealTarget) {
      x = this.stealTarget.sprite.x;
      y = this.stealTarget.sprite.y + 6;
      r = 24;
    } else if (this.peddleTarget) {
      x = this.peddleTarget.sprite.x;
      y = this.peddleTarget.sprite.y + 6;
      r = 24;
    } else {
      return;
    }

    g.lineStyle(2, 0xffffff, pulse);
    g.strokeCircle(x, y, r);
    g.lineStyle(1, 0xffffff, pulse * 0.5);
    g.strokeCircle(x, y, r + 5);
  }

  // ------------------------------------------------------------ tester extras

  debugTeleport() {
    const order = DISTRICT_ORDER;
    const i = order.indexOf(this.district.id);
    const next = order[(i + 1) % order.length];

    this.scene.restart({ district: next, run: this.run, spawn: 'bottom' });
  }

  debugCycleWeather() {
    const order = ['clear', 'rain', 'snow', 'hot'];
    const city = ensureCity(this.run);
    const i = order.indexOf(city.weather);

    city.weather = order[(i + 1) % order.length];
    playSfx('ui');
  }

  debugCycleSeason() {
    const order = ['spring', 'summer', 'autumn', 'winter'];
    const i = order.indexOf(this.run.season || 'spring');

    this.run.season = order[(i + 1) % order.length];
    playSfx('ui');
    haptic('ui');
  }

  debugSkill() {
    this.practice('steal', SKILLS.steal.perLevel);
    this.practice('peddle', SKILLS.peddle.perLevel);
    playSfx('ui');
  }

  /// The sky does not wait for tomorrow: a clear morning can turn to rain by the
  /// afternoon, and the season turns with the calendar, a week at a time.
  updateSky() {
    const run = this.run;

    if (!run.season) run.season = seasonOf(run.day);

    if (this.time.now < this.skyFlipAt) return;
    this.skyFlipAt = this.time.now + 50000;

    if (Math.random() > 0.18) return;

    const city = ensureCity(run);
    const ids = Object.keys(WEATHERS).filter((id) => id !== city.weather);
    city.weather = ids[Math.floor(Math.random() * ids.length)];

    const hud = this.scene.get('Hud');

    if (city.weather === 'rain' || city.weather === 'snow') {
      // Rain and snow say their piece in warnWeather, which also covers the
      // weather a day starts with.
      this.warnedWeather = null;
    } else if (hud && hud.showToast) {
      hud.showToast(`天变了：${WEATHERS[city.weather].name}`);
      playSfx('voice');
    }

    haptic('ui');
  }

  /// Rain and snow get a word, once a day each: they are the two kinds of
  /// weather the street can actually kill you with.
  warnWeather() {
    const fx = this.cityFx;
    if (!fx || !fx.weather) return;

    const run = this.run;
    const id = fx.weather.id;

    if (id !== 'rain' && id !== 'snow') return;

    const stamp = `${run.day}:${id}`;
    if (this.warnedWeather === stamp) return;
    this.warnedWeather = stamp;

    const hud = this.scene.get('Hud');
    if (!hud || !hud.showToast) return;

    if (id === 'rain') {
      hud.showToast(
        run.umbrella ? '下雨了 —— 伞撑着，身上干着' : '下雨了 —— 没伞要淋透，杂货铺和黑市都有卖'
      );
      playSfx('thunder');
    } else {
      hud.showToast('下雪了 —— 桥洞、后巷和营地生着火，烤一烤，别在雪里待太久');
      playSfx('voice');
    }

    haptic('ui');
  }

  /// When the snow comes down somebody has already gone round and lit the
  /// braziers; when it stops, they are left to burn out.
  updateSnowFires() {
    const snowing = !!(this.cityFx && this.cityFx.weather && this.cityFx.weather.id === 'snow');

    if (snowing === this.snowFires) return;
    this.snowFires = snowing;

    if (!this.braziers) return;

    for (const b of this.braziers) {
      // The gang's own barrel is theirs: it burns whatever the sky is doing.
      if (!b.fire) continue;

      if (snowing) {
        if (b.lit) continue;

        b.lit = true;
        b.until = Number.MAX_SAFE_INTEGER;
        b.snowLit = true;
        b.fire.setVisible(true);
      } else if (b.snowLit) {
        b.lit = false;
        b.until = 0;
        b.snowLit = false;
        b.fire.setVisible(false);
      }
    }
  }

  /// The gangs own the alleys after dark. Walk through the alley or the black
  /// street in the evening and somebody may step out of a doorway — unless they
  /// already know the beggar's face, or he is standing in the firelight.
  updateNightDanger() {
    const run = this.run;
    if (run.over || !this.district) return;

    const id = this.district.id;
    const gang = id === 'alley' ? GANGS.crow : id === 'slum' ? GANGS.tin : null;
    if (!gang) return;

    const segment = segmentOf(run.step);
    if (segment < 2) return;

    // Never while a panel is open: being robbed while reading a shop list is
    // just unfair.
    const hudPanel = this.scene.get('Hud');
    if (hudPanel && hudPanel.anyPanelOpen && hudPanel.anyPanelOpen()) return;

    if (this.time.now < this.mugAt) return;
    this.mugAt = this.time.now + 9000 + Math.random() * 9000;

    const standing = gangStanding(run, gang.id);
    if (standing >= 40) return;

    // Standing in the firelight of their own camp: left alone.
    const campStrip = this.stripFor(gang.district);
    if (campStrip) {
      const cx = campStrip.x0 + gang.spot.x;
      const cy = campStrip.y0 + gang.spot.y;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, cx, cy) < 190) return;
    }

    const chance = (segment === 3 ? 0.4 : 0.22) * (1 - Math.min(0.7, standing / 60));
    if (Math.random() > chance) return;

    this.mugPlayer();
  }

  mugPlayer() {
    const run = this.run;
    const lost = Math.floor(run.money * (0.2 + Math.random() * 0.2));

    this.mugAt = this.time.now + 55000;
    run.energy = Math.max(0, run.energy - 8);
    this.cameras.main.shake(220, 0.006);
    this.soilOutfit(0.1);

    if (lost > 0) run.money -= lost;

    if (lost > 0) {
      this.floatText(this.player.x, this.player.y - 52, `被抢走 ${lost} 元`, '#f08a7a');
    } else {
      this.floatText(this.player.x, this.player.y - 50, '身上没钱，被推了一把', '#f08a7a');
    }

    const hud = this.scene.get('Hud');
    if (hud && hud.showToast) {
      hud.showToast(
        lost > 0 ? '巷子里冲出两个人，把你按在墙上掏了兜' : '巷子里两个人翻了你的兜，什么也没翻到'
      );
    }

    playSfx('caught');
    haptic('caught');
    this.stealReadyAt = this.time.now + 4000;
  }

  /// Now and then something small happens between the beggar and one of the
  /// people walking past: a coin dropped, a snack handed over, a face turned
  /// away. None of it is a fight; it is the street being alive.
  maybePasserby() {
    const run = this.run;
    if (run.over || !this.peds || !this.peds.length) return;
    if (this.time.now < this.passerbyAt) return;

    this.passerbyAt = this.time.now + 18000 + Math.random() * 16000;

    const near = this.peds.filter((ped) => {
      const sprite = ped && ped.sprite;
      if (!sprite) return false;

      return Phaser.Math.Distance.Between(sprite.x, sprite.y, this.player.x, this.player.y) < 280;
    });

    if (!near.length) return;

    const ped = near[Math.floor(Math.random() * near.length)];
    const roll = Math.random();

    if (roll < 0.42) {
      run.money += 2;
      run.beggingIncome += 2;

      // Money off the pavement is begging income all the same, so it counts
      // towards the day's list like a coin in the bowl does.
      this.progressGoal('beg', 2);

      this.floatText(ped.sprite.x, ped.sprite.y - 44, '掉了两块钱', UI.gold);
      playSfx('coin');
      haptic('coin');
      return;
    }

    if (roll < 0.72 && run.bag < this.bagLimit()) {
      run.loot.snackbar = (run.loot.snackbar || 0) + 1;
      run.bag += 1;
      this.floatText(this.player.x, this.player.y - 46, '有人塞了个小零食', '#a8d98a');
      playSfx('pickup');
      haptic('pickup');
      return;
    }

    const lines = ['离远点。', '还没吃呢？', '别在这儿摆着了。', '这地方真晦气。'];
    this.floatText(
      ped.sprite.x,
      ped.sprite.y - 44,
      lines[Math.floor(Math.random() * lines.length)],
      UI.creamDim
    );
    playSfx('voice');
  }

  debugTriggerEvent() {
    const city = ensureCity(this.run);
    const ids = Object.keys(EVENTS);
    const id = ids[Math.floor(Math.random() * ids.length)];

    city.events = [{ id, from: this.run.step, to: this.run.step + EVENTS[id].minutes }];
    playSfx('ui');
  }

  debugEvening() {
    this.run.step = Math.max(this.run.step, 660);
    this.updateSegment();
  }

  debugNextDay() {
    this.run.day += 1;
    this.run.step = 0;
    this.run.hunger = HUNGER_MAX;
    this.run.energy = ENERGY_MAX;
    this.nightDeadline = 0;

    this.ensureGoals();
    this.saveNow();
    playSfx('ui');
  }

  debugFurniture() {
    for (const item of FURNITURE) this.setHomePiece(item.slot, item);

    this.checkHomeScene();
    playSfx('craft');
  }

  debugClearWanted() {
    this.run.wanted = 0;
    this.stopChases();
    playSfx('ui');
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
    playSfx('dig');
    haptic('dig');
  }

  finishBin(bin) {
    this.searching = null;
    this.searchBarGfx.clear();

    const charges = bin.getData('charges') || 0;
    if (charges <= 0) return;

    bin.setData('charges', charges - 1);
    this.advanceTime(25);
    this.progressGoal('bins', 1);

    if (this.run.story === 1) this.run.binsFound = (this.run.binsFound || 0) + 1;

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
      playSfx('coin');
      haptic('coin');
      return;
    }

    const roll = Math.random();

    if (roll < 0.2) {
      // Half a box of somebody's dinner, still wrapped. It goes into the bag,
      // and the beggar eats it from there when he is ready.
      if (this.run.bag < this.bagLimit()) {
        this.run.loot.leftover = (this.run.loot.leftover || 0) + 1;
        this.run.bag += 1;
        this.floatText(bin.x, bin.y - 36, '捡到半盒剩饭', '#a8d98a');
        playSfx('pickup');
        haptic('pickup');
        return;
      }

      this.run.energy = Math.min(ENERGY_MAX, this.run.energy + 18);
      this.floatText(bin.x, bin.y - 36, '半块面包 +精力', '#a8d98a');
      playSfx('pickup');
      haptic('pickup');
      return;
    }

    if (roll < 0.54) {
      const amount = Phaser.Math.Between(1, 3);
      this.run.money += amount;
      this.run.scavengeIncome += amount;
      this.floatText(bin.x, bin.y - 36, `翻到 ${amount} 元`, UI.gold);
      playSfx('coin');
      haptic('coin');
      return;
    }

    // What a bin holds depends on the stretch of street it stands on.
    const strip = this.stripFor(bin.getData('strip')) || this.currentStrip();
    const pool = (strip && strip.district.junk) || JUNK_ORDER;
    const loot = pool[Math.floor(Math.random() * pool.length)];

    // A full bag still leaves the loose change at the bottom of the bin.
    if (this.run.bag >= this.bagLimit()) {
      const amount = Phaser.Math.Between(1, 2);

      this.run.money += amount;
      this.run.scavengeIncome += amount;
      this.floatText(bin.x, bin.y - 36, `包满了，只捡到 ${amount} 元`, UI.gold);
      playSfx('coin');
      haptic('coin');
      return;
    }

    this.addToBag(loot, bin.x, bin.y - 36);
  }

  interruptBinSearch() {
    if (!this.searching) return;

    this.searching = null;
    this.searchBarGfx.clear();
    this.addWanted(SEEN_WANTED);
    this.floatText(this.player.x, this.player.y - 46, '城管看过来了！', '#f0a08a');
    playSfx('refuse');
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
    const fx = this.cityFx;
    return COP_SIGHT * (1 + (this.run.wanted || 0) / 150) * (fx ? fx.police : 1);
  }

  buildHome() {
    const strip = this.stripFor('camp');
    if (!strip) return;

    // The shelter leans into the corner between the left buildings, half in the
    // shadow of the wall, instead of standing out in the middle of the block.
    const x = strip.x0 + 170;
    const oy = strip.y0;

    this.add.image(x, 540 + oy, 'tent').setOrigin(0.5, 1).setDepth(540 + oy);

    this.addInteractable({
      x,
      y: 520 + oy,
      radius: 88,
      label: '进雨棚（家）',
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

    // Old Zhou sits by the tent and hands out the day's work. He stays there at
    // any hour, keeping his eye on the fire pit.
    const zhouX = strip.x0 + 402;
    const zhouY = 612 + oy;

    this.oldZhou = this.add.image(zhouX, zhouY, 'oldzhou').setOrigin(0.5, 1).setDepth(zhouY);

    this.add
      .text(zhouX, zhouY - 54, '老周', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#e8dcc2',
        stroke: '#100d09',
        strokeThickness: 3
      })
      .setOrigin(0.5, 1)
      .setDepth(zhouY + 1);

    this.addInteractable({
      x: zhouX,
      y: zhouY - 12,
      radius: 76,
      label: '和老周说话',
      use: () => this.talkOldZhou()
    });
  }

  // ----------------------------------------------------------------- old Zhou

  /// Today's jobs, made fresh at the start of a day if the street has not got
  /// them yet. The list lives on the run, so travelling keeps it.
  ensureGoals() {
    const run = this.run;
    if (run.goals && run.goals.day === run.day) return run.goals.list;

    run.goals = { day: run.day, list: makeGoalsForDay(run.day), announced: false };
    return run.goals.list;
  }

  todayGoals() {
    const run = this.run;
    const goals = run && run.goals;
    if (!goals || goals.day !== run.day) return [];

    return goals.list;
  }

  goalsIntro() {
    return this.run.day <= 1
      ? '老周：先跟我学，把这几件事办了。'
      : '老周：今天的活写在纸上了，办完有赏。';
  }

  /// Counts an action towards whatever today's list asks for, and pays the
  /// reward the moment a job is done.
  progressGoal(kind, amount = 1) {
    const goals = this.todayGoals();
    if (!goals.length || amount <= 0) return;

    for (const goal of goals) {
      if (goal.done || goal.kind !== kind) continue;

      goal.progress = Math.min(goal.need, goal.progress + amount);

      if (goal.progress >= goal.need) this.finishGoal(goal);
    }
  }

  finishGoal(goal) {
    if (goal.done) return;

    goal.done = true;
    goal.progress = goal.need;

    const reward = goal.reward || {};

    if (reward.money) this.run.money += reward.money;

    for (const id of Object.keys(reward.items || {})) {
      this.run.items[id] = (this.run.items[id] || 0) + reward.items[id];
    }
    this.refreshBagCount();

    const parts = [];
    if (reward.money) parts.push(`${reward.money} 元`);
    for (const id of Object.keys(reward.items || {})) {
      const junk = JUNK_ITEMS[id];
      parts.push(`${junk ? junk.name : id}×${reward.items[id]}`);
    }

    this.floatText(
      this.player.x,
      this.player.y - 54,
      parts.length ? `办成了 +${parts.join('、')}` : '办成了',
      '#a8d98a'
    );

    playSfx('coin');
    haptic('unlock');
    this.addFavor('zhou', 8);

    const hud = this.scene.get('Hud');
    if (!hud || !hud.showToast) return;

    const next = this.todayGoals().find((entry) => !entry.done);

    if (!next) {
      hud.showToast('老周：今天的活你全办完了，早点歇着吧。');
    } else if (this.run.day <= 1 && next.tip) {
      hud.showToast(`老周：好。接着来——${next.label}。${next.tip}`);
    } else {
      hud.showToast(`老周：记下了。下一件：${next.label}`);
    }
  }

  /// Old Zhou says where the day stands, and what is still on the list.
  announceGoals() {
    const hud = this.scene.get('Hud');
    if (!hud || !hud.showToast) return;

    // Once per morning: wandering between districts must not repeat him.
    const state = this.run.goals;
    if (!state || state.announced) return;
    state.announced = true;

    const goals = this.todayGoals();
    const active = goals.find((goal) => !goal.done);

    if (!active) {
      hud.showToast('老周：今天的活你全办完了，早点歇着吧。');
      return;
    }

    if (this.run.day <= 1 && active.tip) {
      hud.showToast(`老周：${active.label}。${active.tip}`);
      return;
    }

    hud.showToast(`${this.goalsIntro()}「${active.label}」`);
  }

  /// What Old Zhou would say about the state of the run right now.
  zhouAdviceLine() {
    return zhouAdvice({
      hunger: this.run.hunger,
      energy: this.run.energy,
      money: this.run.money,
      bag: this.run.bag,
      segment: segmentOf(this.run.step),
      clean: this.cleanLevel(),
      cold: this.isColdNight() && !this.hasFire()
    });
  }

  /// Walking past the tent, the old man calls out once in a while.
  zhouCheck() {
    if (!this.oldZhou || this.run.over) return;
    if (this.time.now < this.zhouAdviceAt) return;

    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.oldZhou.x,
      this.oldZhou.y
    );
    if (d > 170) return;

    this.zhouAdviceAt = this.time.now + 45000;
    this.sayBubble(this.oldZhou, this.zhouAdviceLine());
  }

  /// How much this person on the street thinks of the beggar, and the moment
  /// they decide they would back him for king.
  addFavor(id, amount) {
    if (!patronById(id) || this.run.over || amount <= 0) return;

    this.run.favor = this.run.favor || {};

    const before = favorOf(this.run, id);
    const after = Math.min(100, before + amount);

    this.run.favor[id] = after;

    if (before < KING.favorGoal && after >= KING.favorGoal) {
      const patron = patronById(id);
      const hud = this.scene.get('Hud');

      if (hud && hud.showToast) hud.showToast(`${patron.name}开始站在你这边。`);
      haptic('unlock');
    }
  }

  /// Two ways to the throne: the street's backing, or the money.
  checkKing() {
    if (!this.run || this.run.king) return;

    if (kingProgress(this.run).canBuy) this.winKing('money');
  }

  winKing(how) {
    if (!this.run || this.run.king) return;

    this.run.king = { how, day: this.run.day, money: this.run.money };
    this.run.sitting = false;

    this.stopChases();
    haptic('jackpot');

    const hud = this.scene.get('Hud');
    if (hud && hud.showWin) hud.showWin(this.run.king);
  }

  /// Tapping the old man repeats the list, with how far each job has got.
  talkOldZhou() {
    haptic('ui');

    // Chapter one comes first: the old man leads him through the first day.
    const story = this.run.story || 0;

    if (story === 1) {
      if ((this.run.binsFound || 0) < 1) {
        this.zhouStoryLine(STORY_LINES.beforeBin);
        return;
      }

      this.run.story = 2;
      this.saveNow();
      this.floatText(this.player.x, this.player.y - 48, '老周点了点头', UI.creamDim);
      this.zhouStoryLine(STORY_LINES.afterBin);
      return;
    }

    if (story === 2) {
      this.zhouStoryLine(
        (this.run.money || 0) < 4
          ? '杂货铺在市场街，面包四块。钱不够就先卖点废品。'
          : STORY_LINES.beforeBread
      );
      return;
    }

    if (story === 3) {
      this.zhouStoryLine(STORY_LINES.beforeSleep);
      return;
    }

    // Enough of the street behind him, and the old man calls the vote.
    if (kingProgress(this.run).canElect) {
      this.winKing('election');
      return;
    }

    const goals = this.todayGoals();
    if (!goals.length) return;

    const lines = goals.map((goal) =>
      goal.done ? `${goal.label}·已办` : `${goal.label}·${goal.progress}/${goal.need}`
    );

    this.floatText(this.player.x, this.player.y - 48, '和老周说了两句', UI.creamDim);

    const hud = this.scene.get('Hud');
    if (!hud || !hud.showDialogue) return;

    hud.showDialogue(
      'zhou',
      [zhouGreeting(this.run), this.zhouAdviceLine(), `今天的事——${lines.join('；')}`],
      null,
      [
        { label: '聊两句', onPick: () => hud.openLore && hud.openLore() },
        { label: '知道了' }
      ]
    );
  }

  loadHome() {
    const stored = this.registry.get('homePlaced');
    const raw = stored && typeof stored === 'object' ? stored : {};

    // Saves from before furniture had a life span kept just the piece's id.
    this.homePlaced = {};
    for (const slot of HOME_SLOTS) {
      const entry = raw[slot];
      if (!entry) continue;

      const id = typeof entry === 'string' ? entry : entry.id;
      const item = furnitureById(id);
      if (!item || item.slot !== slot) continue;

      const max = item.durability || 6;
      this.homePlaced[slot] = {
        id,
        left: typeof entry.left === 'number' ? entry.left : max,
        max,
        temp: !!item.temp
      };
    }

    // A beggar always starts with a bed: a flattened cardboard box on the
    // floor of the tent, worth almost nothing but enough to lie down on.
    for (const item of FURNITURE) {
      if (item.starter && !this.homePlaced[item.slot]) this.setHomePiece(item.slot, item);
    }

    this.registry.set('homePlaced', { ...this.homePlaced });
  }

  /// One place in the tent: the piece standing there and what is left of it.
  homePiece(slot) {
    const piece = this.homePlaced[slot];
    if (!piece) return null;

    const item = furnitureById(piece.id);
    if (!item) return null;

    return { ...piece, item, broken: (piece.left || 0) <= 0 };
  }

  setHomePiece(slot, item) {
    const max = item.durability || 6;

    this.homePlaced[slot] = { id: item.id, left: max, max, temp: !!item.temp };
    this.registry.set('homePlaced', { ...this.homePlaced });
  }

  homeComfort() {
    return HOME_SLOTS.reduce((total, slot) => {
      const piece = this.homePiece(slot);
      if (!piece || piece.broken) return total;

      return total + piece.item.comfort;
    }, 0);
  }

  /// What the house can do with a piece of furniture right now.
  furnitureState(item) {
    const piece = this.homePiece(item.slot);

    if (piece && piece.item.id === item.id) return piece.broken ? 'broken' : 'owned';

    if (item.price > 0) return this.run.money >= item.price ? 'ok' : 'poor';
    if (!item.need) return 'ok';

    for (const id of Object.keys(item.need)) {
      if (amountOf(this.run, id) < item.need[id]) return 'short';
    }
    return 'ok';
  }

  /// Mending a worn-out piece at the bench costs a small handful of material.
  repairFurniture(item) {
    const piece = this.homePiece(item.slot);
    if (!piece || !piece.broken) return 'owned';

    const need = item.repair || { cardboard: 2 };

    for (const id of Object.keys(need)) {
      if (amountOf(this.run, id) < need[id]) return 'short';
    }

    for (const id of Object.keys(need)) {
      spendMaterial(this.run, id, need[id]);
    }
    this.refreshBagCount();

    this.homePlaced[item.slot].left = piece.max;
    this.registry.set('homePlaced', { ...this.homePlaced });

    haptic('craft');
    this.floatText(this.player.x, this.player.y - 46, `修好了${item.name}`, '#a8d98a');

    return 'repaired';
  }

  placeFurniture(item) {
    if (this.run.over) return 'short';

    const state = this.furnitureState(item);
    if (state === 'broken') return this.repairFurniture(item);
    if (state !== 'ok') return state;

    if (item.price > 0) {
      this.run.money -= item.price;
    } else {
      for (const id of Object.keys(item.need)) {
        spendMaterial(this.run, id, item.need[id]);
      }
      this.refreshBagCount();
    }

    this.setHomePiece(item.slot, item);
    haptic('craft');
    this.floatText(this.player.x, this.player.y - 46, `摆好了${item.name}`, '#a8d98a');

    this.checkHomeScene();

    return 'ok';
  }

  /// Building a piece of furniture at the workbench sets it down in the tent.
  craftFurniture(id) {
    const item = furnitureById(id);
    if (!item || !item.craft || this.run.over) return 'locked';

    const piece = this.homePiece(item.slot);
    if (piece && piece.item.id === item.id) {
      if (!piece.broken) return 'owned';
      return this.repairFurniture(item);
    }

    for (const mat of Object.keys(item.craft)) {
      if (amountOf(this.run, mat) < item.craft[mat]) return 'short';
    }

    for (const mat of Object.keys(item.craft)) {
      spendMaterial(this.run, mat, item.craft[mat]);
    }
    this.refreshBagCount();

    this.setHomePiece(item.slot, item);
    haptic('craft');
    this.floatText(this.player.x, this.player.y - 46, `合成了${item.name}，摆进帐篷`, '#a8d98a');

    this.checkHomeScene();

    return 'ok';
  }

  /// Enough furniture turns the nook into something worth calling home.
  checkHomeScene() {
    if (this.registry.get('homeScene') || this.homeComfort() < HOME_SCENE_COMFORT) return;

    this.registry.set('homeScene', true);
    haptic('unlock');

    const hud = this.scene.get('Hud');
    if (hud && hud.showToast) {
      hud.showToast('火堆噼啪响着，你第一次觉得这个帐篷像个家。');
    }
  }

  /// A night in the tent wears everything in it by a day. Flimsy things made of
  /// paper and cardboard simply fall apart.
  wearFurniture() {
    const gone = [];
    const broke = [];

    for (const slot of Object.keys(this.homePlaced)) {
      const piece = this.homePlaced[slot];
      if (!piece) continue;

      const before = piece.left || 0;
      piece.left = Math.max(0, before - 1);

      const item = furnitureById(piece.id);
      if (!item) continue;

      if (piece.left <= 0 && before > 0) {
        if (piece.temp) gone.push(item.name);
        else broke.push(item.name);
      }

      if (piece.left <= 0 && piece.temp) delete this.homePlaced[slot];
    }

    this.registry.set('homePlaced', { ...this.homePlaced });

    return { gone, broke };
  }

  /// True once the evening sets in: that is when the cold bites.
  isColdNight() {
    return segmentOf(this.run.step) >= 2;
  }

  hasFire() {
    const piece = this.homePiece('fireplace');
    return !!piece && piece.item.id === 'fireplace' && !piece.broken;
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

    // The tent is on most lists: getting in before the cold counts as done.
    this.progressGoal('home', 1);

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

    const worn = this.wearFurniture();

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

    // What the night took out of the furniture.
    if (worn.gone.length || worn.broke.length) {
      const hud = this.scene.get('Hud');

      if (hud && hud.showToast) {
        const parts = [];
        if (worn.gone.length) parts.push(`${worn.gone.join('、')}散架了`);
        if (worn.broke.length) parts.push(`${worn.broke.join('、')}坏了，回工作台修`);

        hud.showToast(parts.join('；'));
      }
    }

    // A new morning, so a new list from Old Zhou.
    if (this.run.story === 3) this.run.story = 4;
    this.ensureGoals();
    this.time.delayedCall(600, () => this.announceGoals());
    this.saveNow();

    return { ...rest, summary, day: this.run.day };
  }

  /// Big actions push the clock forward: a bin takes twenty-five minutes, a lift
  /// twenty, settling down to beg ten. Walking is free.
  advanceTime(minutes = 0) {
    if (this.run.over) return;
    this.run.step = Math.min(DAY_LENGTH, this.run.step + minutes);
    this.updateSegment();
  }

  getClockText() {
    const weather = this.cityFx && this.cityFx.weather ? this.cityFx.weather.name : '晴';

    return `第${this.run.day}天 ${minutesToClock(this.run.step)} · ${weather}`;
  }

  /// Tomorrow's weather, for the night before it.
  getForecastText() {
    if (!this.run) return '';

    return forecastOf(ensureCity(this.run));
  }

  applyNight() {
    if (!this.nightOverlay) return;

    const dark = darknessAt(this.run.step);
    this.nightOverlay.setAlpha(dark * 0.55);

    const g = this.lightsGfx;
    if (!g) return;

    g.clear();

    const lit = Phaser.Math.Clamp((dark - 0.15) / 0.45, 0, 1);
    if (lit <= 0.02) return;

    for (const light of this.lightSpots || []) {
      g.fillStyle(0xf2c46a, 0.05 * lit);
      g.fillCircle(light.x, light.y, 92);
      g.fillStyle(0xf2c46a, 0.08 * lit);
      g.fillCircle(light.x, light.y, 52);
      g.fillStyle(0xffe6b0, 0.12 * lit);
      g.fillCircle(light.x, light.y, 18);
    }
  }

  /// Street lamps down both pavements, one of the pools of light that come on
  /// as the evening draws in.
  buildLamps() {
    const ys = [200, 560, 920, 1280];

    for (const strip of this.strips) {
      const decor = STREET_DECOR[strip.id] || {};
      const crossings = decor.crosswalks || [];

      ys.forEach((localY, i) => {
        // Keep the lamp clear of the crossing and its lights.
        if (crossings.some((cy) => Math.abs(cy - localY) < 130)) return;

        const localX = i % 2 === 0 ? 266 : 374;

        // And clear of anything the player has to reach down at.
        if (this.spotBlocked(strip, localX - 11, localY - 88, 22, 88)) return;

        const x = strip.x0 + localX;
        const y = strip.y0 + localY;

        this.add.image(x, y, 'streetlamp').setOrigin(0.5, 1).setDepth(y);
        this.lightSpots.push({ x, y: y - 74 });
      });
    }
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
    this.soilOutfit(0.2);
    run.day += 1;
    run.step = 0;
    run.dayStart = {
      begging: run.beggingIncome,
      scavenge: run.scavengeIncome,
      stolen: run.stolenIncome,
      sold: run.soldIncome
    };

    playSfx('collapse');
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

  // ------------------------------------------------- the shopkeepers' business

  /// The job hanging off a shop's counter, ready for the HUD to read out.
  errandFor(shopId) {
    const errand = errandForShop(shopId);
    if (!errand) return null;

    return {
      errand,
      state: errandState(this.run, errand.id),
      step: errandStep(this.run, errand.id),
      ready: errandReady(this.run, errand.id)
    };
  }

  errandContext() {
    return {
      district: this.district ? this.district.id : null,
      segment: segmentOf(this.run.step),
      weather: this.cityFx && this.cityFx.weather ? this.cityFx.weather.id : null,
      wanted: this.run.wanted || 0
    };
  }

  /// Jobs that finish on their own — the right street at the right hour, the
  /// rain, or a wanted level low enough for the 城管 to look past — are watched
  /// here rather than handed over at a counter.
  updateErrands() {
    const run = this.run;
    if (!run || run.over) return;

    if (this.time.now < (this.errandAt || 0)) return;
    this.errandAt = this.time.now + 500;

    const ctx = this.errandContext();

    for (const errand of ERRANDS) {
      const state = errandState(run, errand.id);
      if (!state.started) continue;

      const step = errandStep(run, errand.id);
      if (!step || (step.kind !== 'go' && step.kind !== 'wanted')) continue;
      if (!errandMet(step, ctx)) continue;

      this.completeErrandStep(errand.id);
      return;
    }
  }

  /// The beggar took the job on: from here the street watches the hour, the
  /// place and the weather for him.
  beginErrand(id) {
    if (!this.run) return;

    markErrandStarted(this.run, id);
    this.saveNow();
  }

  /// Take what a hand-in step asked for and move the job on.
  handErrandIn(id) {
    const step = errandStep(this.run, id);
    if (!errandHandIn(step)) return false;
    if (!errandReady(this.run, id)) return false;
    if (!takeForStep(this.run, step)) return false;

    this.refreshBagCount();
    this.completeErrandStep(id);

    return true;
  }

  completeErrandStep(id) {
    const errand = errandById(id);
    if (!errand) return;

    const state = advanceErrand(this.run, id);
    if (!state) return;

    this.addFavor(errand.speaker, 10);
    playSfx('unlock');
    haptic('unlock');

    if (state.done) {
      this.grantErrandReward(errand);
      return;
    }

    const next = errandStep(this.run, id);

    this.floatText(
      this.player.x,
      this.player.y - 50,
      `${errand.title} ${state.step}/${errand.steps.length}`,
      UI.cream
    );

    const hud = this.scene.get('Hud');
    if (hud && hud.showToast && next) hud.showToast(`${errand.owner}：${next.short}。`);

    this.saveNow();
  }

  /// What the shopkeeper hands back: never money, always a door left open. The
  /// free bowl and the grocery price are read off the job list itself, so only
  /// the two that change the run need writing down.
  grantErrandReward(errand) {
    const run = this.run;

    if (errand.id === 'decent') {
      run.tools.lockpick = true;
      run.tools.lockpick2 = true;
      run.perfume = (run.perfume || 0) + 1;
      this.refreshBagCount();
    }

    this.floatText(this.player.x, this.player.y - 56, `办成了 · ${errand.reward}`, '#a8d98a');

    const hud = this.scene.get('Hud');
    if (hud && hud.showToast) hud.showToast(`${errand.owner}：${errand.done}`);

    playSfx('jackpot');
    haptic('jackpot');
    this.saveNow();
  }

  /// One free bowl a day at any food stall, once the noodle seller's girl is in
  /// school.
  eatFreeNoodle() {
    const run = this.run;
    if (!run || run.over) return false;
    if (!errandState(run, 'noodle').done) return false;
    if (run.noodleDay === run.day) return false;

    const food = FOODS.find((f) => f.id === 'noodle');

    run.noodleDay = run.day;
    run.hunger = Math.min(HUNGER_MAX, run.hunger + (food ? food.restore : 44));
    run.energy = Math.min(ENERGY_MAX, run.energy + (food ? food.energy : 24));

    playSfx('eat');
    haptic('eat');
    this.floatText(this.player.x, this.player.y - 46, '免费的一大碗面', '#a8d98a');

    return true;
  }

  /// The tailor patches whatever the beggar is wearing, so a good coat can be
  /// kept instead of bought again.
  repairOutfit() {
    const run = this.run;
    if (!run || !run.outfitWear) return false;

    run.outfitWear = 0;
    this.applyOutfit();
    playSfx('craft');
    haptic('craft');
    this.floatText(this.player.x, this.player.y - 46, '补好了，看着又体面了', '#a8d98a');

    return true;
  }

  /// Bins, muggings and a night on the pavement all take it out of the clothes.
  soilOutfit(amount) {
    if (!this.run) return;

    this.run.outfitWear = Phaser.Math.Clamp((this.run.outfitWear || 0) + amount, 0, 0.9);
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

      case 'charm': {
        this.run.money -= entry.price;
        this.run.charm = this.run.charm || {};
        this.run.charm[entry.refId] = (this.run.charm[entry.refId] || 0) + 1;
        this.floatText(this.player.x, this.player.y - 46, `买下${entry.name}`, '#a8d98a');
        return true;
      }

      case 'bagup': {
        this.run.money -= entry.price;
        this.run.bagUp = entry.refId;
        this.floatText(this.player.x, this.player.y - 46, `换上${entry.name}`, '#a8d98a');
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

      // Not a sale but a collection: the shop takes the bottles and the
      // cardboard back off the beggar's hands.
      case 'recycle': {
        const paid = this.recycleJunk(entry.refId);
        if (paid <= 0) return false;

        this.floatText(this.player.x, this.player.y - 46, `回收 +${paid} 元`, UI.gold);
        return true;
      }

      // A little manual that teaches the trade once and for all.
      case 'book': {
        this.run.books = this.run.books || {};
        if (this.run.books[entry.refId]) return false;

        this.run.money -= entry.price;
        this.run.books[entry.refId] = true;
        this.floatText(this.player.x, this.player.y - 46, `读完了${entry.name}`, '#a8d98a');
        return true;
      }

      case 'umbrella': {
        if (this.run.umbrella) return false;

        this.run.money -= entry.price;
        this.run.umbrella = true;
        this.floatText(this.player.x, this.player.y - 46, '撑开伞试了试，还能用', '#a8d98a');
        return true;
      }

      default:
        return false;
    }
  }

  /// Sells every piece of one kind of rubbish over the counter of a shop that
  /// takes it back.
  recycleJunk(kind) {
    const have = this.run.items[kind] || 0;
    if (have <= 0) return 0;

    const each = Math.max(1, Math.round(junkPrice(kind, false) * this.sellMul()));
    const total = each * have;

    this.run.items[kind] = 0;
    this.run.money += total;
    this.run.soldIncome += total;
    this.run.bag = Math.max(0, this.run.bag - have);

    this.progressGoal('sell', total);
    this.refreshBagCount();
    playSfx('sell');
    haptic('sell');

    return total;
  }

  /// Sells a whole stack over the counter: one tap, one price. Junk goes
  /// through the recycling tally, pockets and craft goods at their own rates.
  sellBatch(kind, id) {
    if (this.run.over) return 0;
    if (kind === 'junk') return this.recycleJunk(id);

    const have = kind === 'loot' ? this.run.loot[id] || 0 : this.run.goods[id] || 0;
    if (have <= 0) return 0;

    let each = 0;
    if (kind === 'loot') each = lootPrice(id, false);
    if (kind === 'good') {
      const rec = recipeById(id);
      each = rec ? rec.value : 0;
    }

    each = Math.max(1, Math.round(each * this.sellMul()));
    const total = each * have;

    if (kind === 'loot') this.run.loot[id] = 0;
    else this.run.goods[id] = 0;

    this.run.money += total;
    this.run.soldIncome += total;
    this.run.bag = Math.max(0, this.run.bag - have);
    this.progressGoal('sell', total);
    this.refreshBagCount();
    playSfx('sell');
    haptic('sell');

    return total;
  }

  /// One more attempt at a trade, and a word to the player when it turns into a
  /// level.
  practice(id, n) {
    const info = SKILLS[id];
    if (!info) return;

    const before = skillLevel(this.run, id);
    const after = addSkill(this.run, id, n || 1);

    if (after <= before) return;

    this.floatText(this.player.x, this.player.y - 54, `${info.name} 熟练 Lv.${after}`, '#f2c46a');
    playSfx('buy');
    haptic('buy');
  }

  /// How presentable the player looks, 0 for rags and 1 for the best coat, and
  /// worn down by the street until the tailor patches it.
  cleanLevel() {
    const outfit = OUTFITS.find((o) => o.id === this.run.outfit);
    const wear = Phaser.Math.Clamp(this.run.outfitWear || 0, 0, 0.9);

    return (outfit ? outfit.clean : 0) * (1 - wear);
  }

  /// The sprite for a pose, with the suffix of whatever the player is wearing.
  poseTex(pose) {
    const outfit = OUTFITS.find((o) => o.id === this.run.outfit);
    const id = (outfit && outfit.sprite) || '';

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

    this.floatText(this.player.x, this.player.y - 52, '城管来了！', '#f0a08a');
    playSfx('alarm');
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
        if (cop.stripId === 'market' && cop.sprite.y > 1270 && cop.sprite.y < 1360) {
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
    // Caught by the 城管: a share of the money goes, a couple of things out of
    // the bag go in their bin, and the beggar is walked out of the station at
    // the square an hour later with nothing to show for it.
    const fine = Math.floor(this.run.money * 0.4);
    this.run.money -= fine;
    const taken = this.confiscate(2);

    this.run.energy = Math.max(0, this.run.energy - CAUGHT_ENERGY);
    this.stealReadyAt = this.time.now + 5000;
    this.cameras.main.flash(240, 120, 30, 30);

    playSfx('caught');
    haptic('caught');

    const hud = this.scene.get('Hud');
    if (hud && hud.showToast) {
      hud.showToast(
        `被城管带走了：扣 ${fine} 元${taken ? `，没收了${taken}` : ''}。\n在广场派出所蹲了一下午才放出来`
      );
    }

    this.stopChases();
    this.time.delayedCall(500, () => {
      this.scene.restart({ district: 'square', run: this.run, spawn: 'top' });
    });
  }

  /// Takes up to `n` things out of the bag, the scrap first. Returns a label.
  confiscate(n) {
    const names = [];

    for (let i = 0; i < n; i++) {
      const junk = JUNK_ORDER.find((id) => (this.run.items[id] || 0) > 0);

      if (junk) {
        this.run.items[junk] -= 1;
        names.push(JUNK_ITEMS[junk].name);
        continue;
      }

      const loot = LOOT_ORDER.find((id) => (this.run.loot[id] || 0) > 0);
      if (!loot) break;

      this.run.loot[loot] -= 1;
      names.push(LOOT_ITEMS[loot].name);
    }

    this.refreshBagCount();
    return names.join('、');
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

    playSfx('collapse');
    haptic('collapse');
  }

  dropCoin(from) {
    // The walker hands the coin over with a word, in the voice of the street.
    const giver = from && from.sprite ? from : null;
    const source = giver ? giver.sprite : from;

    if (giver) {
      this.sayBubble(giver, begGiveLine(this.district.id, segmentOf(this.run.step), giver.kind ? giver.kind.id : null));
    }

    const boost = this.district.begBoost || 1;
    const bonus = this.cleanLevel() > 0.8 ? 1 : 0;
    const styleMul = this.begStyleMul();
    const cityMul = this.cityFx ? this.cityFx.begMul : 1;
    const amount = Math.max(
      1,
      Math.round((Phaser.Math.Between(1, 2) + bonus) * boost * styleMul * cityMul)
    );
    const coin = this.add.image(source.x, source.y - 6, 'coin').setDepth(source.y + 1);

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
        this.advanceTime(15);
        this.progressGoal('beg', amount);
        this.floatText(tx, ty - 26, `+${amount} 元`, UI.gold);
        playSfx('coin');
        haptic('coin');
      }
    });
  }

  /// Something a passer-by says, in a bubble over their head. `who` is either a
  /// walker or a bare sprite.
  sayBubble(who, text) {
    if (!who || !text) return;

    const sprite = who.sprite || who;
    if (!sprite || !sprite.active) return;

    if (who.bubbleAt && this.time.now < who.bubbleAt) return;
    who.bubbleAt = this.time.now + 1600;

    const label = this.add
      .text(sprite.x, sprite.y - 46, text, {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#fff3d2',
        backgroundColor: 'rgba(24,18,12,0.86)',
        padding: { x: 7, y: 4 },
        align: 'center',
        wordWrap: { width: 180 }
      })
      .setOrigin(0.5, 1)
      .setDepth(6500);

    this.tweens.add({
      targets: label,
      y: sprite.y - 58,
      alpha: 0,
      duration: 1800,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy()
    });
  }

  floatText(x, y, text, colour) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: '18px',
        color: colour || UI.cream,
        stroke: '#100d09',
        strokeThickness: 4
      })
      .setOrigin(0.5, 0.5)
      .setDepth(7000);

    this.tweens.add({
      targets: label,
      y: y - 44,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  // ------------------------------------------------------------------ walkers

  spawnPed(initial) {
    if (this.run.over) return;
    if (this.cityFx && Math.random() > this.cityFx.pedMul) return;

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
    const scale = kind.scale || 1;
    const sprite = this.add.image(x, y, kind.tex).setScale(scale).setDepth(y);

    this.tweens.add({
      targets: sprite,
      scaleY: scale * 0.97,
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
          this.sayBubble(ped, line);
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
          this.dropCoin(ped);
        }
      }

      // The ones who will not stop say so, once, as they pass the bowl.
      if (
        this.run.sitting &&
        !this.run.over &&
        !ped.hostile &&
        !ped.canGive &&
        !ped.refusedShown &&
        !ped.startled &&
        near < BEG_RADIUS
      ) {
        ped.refusedShown = true;
        this.sayBubble(ped, begRefuseLine(this.district.id, segmentOf(this.run.step), ped.kind ? ped.kind.id : null));
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

  /// Anyone close enough to be talked into buying something, whether or not
  /// they still have a wallet worth lifting.
  findPeddleTarget() {
    if (this.run.over || this.run.sitting) return null;

    let best = null;
    let bestD = STEAL_RANGE;

    for (const ped of this.peds) {
      if (ped.startled) continue;

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

  /// What the beggar could offer a passer-by: the things he made at the bench and
  /// the things he lifted, never the scrap itself.
  peddleItems() {
    if (!this.run) return [];

    const items = [];

    for (const rec of RECIPES) {
      const count = this.run.goods[rec.id] || 0;
      if (count <= 0) continue;

      items.push({ id: rec.id, kind: 'good', name: rec.name, count, value: rec.value, tex: rec.tex });
    }

    for (const id of LOOT_ORDER) {
      const count = this.run.loot[id] || 0;
      if (count <= 0) continue;

      const item = LOOT_ITEMS[id];
      items.push({ id, kind: 'loot', name: item.name, count, value: item.price, tex: item.tex });
    }

    // Only the things worth stopping for: nobody haggles over half a box of
    // leftovers or a stick of gum.
    return items.filter((item) => item.value >= 8).sort((a, b) => b.value - a.value);
  }

  /// A cigarette or a lottery ticket in the pocket is worth a lot more than it
  /// costs: it gives the passer-by a reason to stop and listen.
  pickCharm() {
    const charm = this.run.charm || {};
    if ((charm.cigarettes || 0) > 0) return 'cigarettes';
    if ((charm.ticket || 0) > 0) return 'ticket';

    return null;
  }

  /// How likely the walker in front of the beggar is to buy at this price. The
  /// beggar starts out bad at this: a fair price is a coin toss at best, and
  /// asking too much sends them off.
  peddleRate(value, price, who) {
    const ped = who || this.peddleTarget || this.stealTarget;
    if (!ped) return { rate: 0, charm: null };

    const worth = Math.max(1, value);
    const over = (price - worth) / worth;

    let rate = 0.24;

    if (over <= 0) rate += Math.min(0.16, -over * 0.5);
    else rate -= Math.min(0.5, over * 0.45);

    const kind = ped.kind ? ped.kind.id : 'suit';
    if (kind === 'rich') rate += 0.1;
    else if (kind === 'suit') rate += 0.05;
    else if (kind === 'drunk') rate -= 0.06;
    else if (kind === 'gang') rate -= 0.16;

    rate += this.cleanLevel() * 0.12;
    rate += skillBonus(this.run, 'peddle') + bookBonus(this.run, 'peddle');
    rate -= Math.max(0, this.encounterAlert(ped)) * 0.2;

    const charm = this.pickCharm();
    if (charm === 'cigarettes') rate += 0.18;
    else if (charm === 'ticket') rate += 0.12;

    return { rate: Phaser.Math.Clamp(rate, 0.05, 0.92), charm };
  }

  /// One attempt at selling: the price is set by the panel. Returns 'ok', 'no'
  /// or 'none' when there is nothing to sell or nobody to sell it to.
  sellToPed(id, kind, price, who) {
    const ped = who || this.peddleTarget || this.stealTarget;
    if (!ped || this.run.over) return 'none';

    const item = kind === 'good' ? recipeById(id) : LOOT_ITEMS[id];
    if (!item) return 'none';

    const have = kind === 'good' ? this.run.goods[id] || 0 : this.run.loot[id] || 0;
    if (have <= 0) return 'none';

    const worth = kind === 'good' ? item.value : item.price;

    // Nobody pays out more than they are carrying.
    if (price > Math.max(6, (ped.purse || 0) * 3)) {
      this.advanceTime(10);
      ped.alert = Math.min(1, ped.alert + 0.2);
      this.sayBubble(ped, '太贵了，你抢钱啊。');
      haptic('refuse');

      return 'no';
    }

    // A refusal teaches the tongue as much as a sale does.
    this.practice('peddle', 1);

    const { rate, charm } = this.peddleRate(worth, price, ped);

    if (charm) {
      this.run.charm = this.run.charm || {};
      this.run.charm[charm] = Math.max(0, (this.run.charm[charm] || 0) - 1);
    }

    this.advanceTime(10);

    if (Math.random() < rate) {
      if (kind === 'good') this.run.goods[id] -= 1;
      else this.run.loot[id] -= 1;

      this.run.money += price;
      this.run.soldIncome += price;
      this.progressGoal('sell', price);
      this.refreshBagCount();

      this.floatText(ped.sprite.x, ped.sprite.y - 34, `卖出去 +${price} 元`, UI.gold);
      this.sayBubble(ped, peddleBuyLine());
      haptic('sell');
      playSfx('sell');
      ped.alert = Math.max(0, ped.alert - 0.15);
      this.alertPed = null;

      return 'ok';
    }

    // Turned down: the walker says what they think and moves on, and the street
    // hears it.
    ped.alert = 1;
    ped.startled = true;

    for (const other of this.peds) {
      if (other !== ped) other.alert = Math.min(1, other.alert + 0.18);
    }

    this.sayBubble(ped, peddleRefuseLine());
    haptic('stealFail');
    playSfx('stealFail');
    this.alertPed = null;

    return 'no';
  }

  updateNearest() {
    this.checkTellQuests();

    if (this.run.over || this.run.sitting || this.qtePed || this.searching || this.benchSpot) {
      this.nearest = null;
      this.stealTarget = null;
      this.peddleTarget = null;
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
    const steal = best ? null : this.findStealTarget();
    const peddle = best ? null : this.findPeddleTarget();

    // A different person in front of him: the odds go back to how jumpy they
    // were when he walked up, not how jumpy they have become since.
    if (steal !== this.stealTarget || peddle !== this.peddleTarget) this.alertPed = null;

    this.stealTarget = steal;
    this.peddleTarget = peddle;

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

    if (this.peddleTarget) {
      const ped = this.peddleTarget;
      const label = `兜售：${ped.kind.label || '路人'}`;
      if (this.prompt.text !== label) this.prompt.setText(label);
      this.prompt.setPosition(ped.sprite.x, ped.sprite.y - 40).setVisible(true);
      return;
    }

    this.prompt.setVisible(false);
  }

  // -------------------------------------------------------------------- frame

  /// The body complains before it gives out: a heartbeat that tightens as food
  /// and breath run out, and a line said under the breath each time the beggar
  /// slips a stage further down. Both go quiet again once there is something in
  /// the stomach.
  updateWarnings(dt) {
    const run = this.run;

    if (run.over) {
      this.heartT = 0;
      return;
    }

    const worst = Math.min(run.hunger, run.energy);
    const level = worst >= WARN_AT ? 0 : Phaser.Math.Clamp(1 - worst / WARN_AT, 0, 1);

    if (level <= 0) {
      this.heartT = 0;
      this.warnStage = 0;
      return;
    }

    this.heartT -= dt;
    if (this.heartT <= 0) {
      this.heartT = 1.05 + (0.46 - 1.05) * level;
      playSfx('heart', { level });
    }

    const stage = worst <= CRIT_AT ? 2 : 1;
    if (stage <= this.warnStage) return;

    this.warnStage = stage;

    const hungry = run.hunger <= run.energy;
    const pool = hungry
      ? stage === 2
        ? STARVING_LINES
        : HUNGRY_LINES
      : stage === 2
        ? SPENT_LINES
        : TIRED_LINES;

    this.sayLine(pool[Math.floor(Math.random() * pool.length)]);
  }

  /// Something the beggar mutters, rising from their head and fading out.
  sayLine(text) {
    playSfx('voice');

    const label = this.add
      .text(this.player.x, this.player.y - 58, `“${text}”`, {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#e8dcc2',
        stroke: '#100d09',
        strokeThickness: 4,
        align: 'center',
        wordWrap: { width: 240 }
      })
      .setOrigin(0.5, 1)
      .setDepth(7000);

    this.tweens.add({
      targets: label,
      y: label.y - 26,
      alpha: 0,
      duration: 2600,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy()
    });
  }

  update(time, delta) {
    const dt = Math.min(delta, 60) / 1000;
    const run = this.run;

    // The music is told where the beggar is and how much trouble they are in:
    // digging and a spotted officer tighten it, a chase takes it all the way up.
    let mood = 0.15;
    if (this.cops.some((cop) => cop.chasing)) mood = 1;
    else if (this.seenByPolice()) mood = 0.75;
    else if (this.searching) mood = 0.55;

    this.musicTension += (mood - this.musicTension) * Math.min(1, dt * 1.8);
    updateAudio(dt, { tension: this.musicTension, night: darknessAt(run.step) });
    this.updateCity(dt);
    this.updateSky();
    this.updateSnowFires();
    this.warnWeather();
    this.maybePasserby();
    this.updateNightDanger();
    this.updateBraziers(dt);
    this.checkKing();
    this.updateErrands();

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
        playSfx('sleep');
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
    const weatherId = this.cityFx && this.cityFx.weather ? this.cityFx.weather.id : 'clear';
    const wet = weatherId === 'rain';
    const snowing = weatherId === 'snow';
    const covered = this.underCover();
    const umbrella = wet && !!run.umbrella;

    let coldExtra = this.cityFx ? Math.max(0, this.cityFx.coldExtra) * 0.3 : 0;

    // Under an awning or an umbrella the rain never touches him; snow still
    // bites, but a roof over his head takes half of it.
    if (covered) coldExtra *= snowing ? 0.5 : 0;
    if (umbrella) coldExtra = 0;

    let coldDrain = (segment === 3 ? 1.2 : segment === 2 ? 0.4 : 0) + coldExtra;

    // A fire takes the shiver out of the bones for a while.
    if (this.time.now < (this.warmUntil || 0)) coldDrain *= 0.4;

    // Caught out in the open in the rain: an umbrella is the only thing keeping
    // it out of his clothes.
    if (wet && !covered && !umbrella) coldDrain += RAIN_DRAIN;

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
      const speed = (this.sneaking || exhausted ? SNEAK_SPEED : SPEED) * this.cartSpeedMul();

      if (this.player.body) this.player.body.setVelocity(nx * speed, ny * speed);
      if (Math.abs(nx) > 0.05) this.player.setFlipX(nx < 0);
      this.walkT += dt * (this.sneaking ? 6 : 12);

      const heat = this.cityFx ? this.cityFx.heat : 0;
      if (!this.sneaking) {
        run.energy = Math.max(0, run.energy - (RUN_DRAIN + heat * 0.2) * dt);
      }

      // A heel on the pavement, once a stride.
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = this.sneaking ? 0.62 : 0.38;
        playSfx('foot', { freq: this.sneaking ? 620 : 900 });
      }
    } else {
      if (this.player.body) this.player.body.setVelocity(0, 0);
      this.walkT = 0;
      this.stepT = 0;
    }

    if (run.sitting && !run.over) {
      run.energy = Math.min(ENERGY_MAX, run.energy + SIT_RECOVER * dt);
    }
    if (run.energy > 0) this.energyWarned = false;

    this.updateWarnings(dt);
    this.updateBegging(dt);
    this.drawHighlight();

    const bob = moving ? Math.sin(this.walkT) * 0.03 : 0;
    this.player.setScale(1, 1 + bob);
    this.player.setDepth(this.player.y);
    this.playerShadow.setPosition(this.player.x, this.player.y + 22).setDepth(this.player.y - 0.5);

    this.updatePeds(dt);
    this.updateCops(dt);
    this.drawCones();
    this.updateNearest();
    this.zhouCheck();
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
