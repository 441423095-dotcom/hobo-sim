// The layer over the street: the money, hunger and bag readout along the top,
// the touch controls in the band beneath the playfield, the corner shop panel
// and the end-of-run card. It reads the street's run state every frame instead
// of being told about it, so a restarted street needs no rewiring.

import { registerIcons } from '../icons.js';
import { haptic, setHapticsEnabled, hapticsEnabled } from '../feedback.js';
import { playSfx, setAudioMuted, audioMuted } from '../audio.js';
import { layoutFor } from '../layout.js';
import { FOODS } from '../food.js';
import { JUNK_ITEMS, JUNK_ORDER, TOOLS, junkPrice } from '../trade.js';
import { LOOT_ITEMS, LOOT_ORDER, lootPrice } from '../loot.js';
import { DISTRICTS, DISTRICT_ORDER, QUEST_TARGET } from '../districts.js';
import { STREET_ORDER, CITY_COLS, CITY_ROWS, cellOf, neighbourOf } from '../streets.js';
import { SHOPS, stockFor, sellListFor } from '../shops.js';
import { FURNITURE, FURNITURE_RECIPES, HOME_SLOTS, furnitureById } from '../home.js';
import { savedInfo } from '../save.js';
import { KING, PATRONS, kingProgress, supporters } from '../king.js';
import { SPEAKERS, shopTalk, tradeTalk, zhouLore } from '../dialogue.js';
import { COFFEE_PRICE, COFFEE_ENERGY, KICK_WANTED } from '../vending.js';
import { SLOT_COST, SLOT_SYMBOLS } from '../gamble.js';
import { RECIPES, amountOf, materialLabel } from '../craft.js';
import { seasonName } from '../city.js';
import { skillLabel } from '../skill.js';
import { FONT, UI } from '../style.js';

const DEPTH = {
  band: 10,
  control: 12,
  hud: 20,
  panel: 100,
  overlay: 200
};

const ROW_WIDTH = 300;
const ROW_HEIGHT = 66;

// Control sizes are fixed rather than derived per frame: the band is tall
// enough for them at its smallest, and leaving the circles alone keeps their
// stroke widths consistent.
const STICK_RADIUS = 62;
const KNOB_RADIUS = 26;
const STICK_THROW = 46;
const ACTION_RADIUS = 45;

const TRADE_ROW_WIDTH = 300;
const TRADE_ROW_HEIGHT = 54;
const TRADE_MAX_ROWS = 10;

const PEDDLE_ROWS = 4;

const CRAFT_ROW_HEIGHT = 54;

/// Chinese has no spaces, so a canvas word wrap sees one enormous word and
/// never breaks it: every line ran straight out of its panel. This folds a
/// string into lines that fit a width, counting a Chinese glyph as a full
/// character and a Latin one as a little over half.
function foldText(value, width, fontSize) {
  const budget = Math.max(4, width / Math.max(8, fontSize));
  const out = [];

  let line = '';
  let used = 0;

  for (const ch of String(value == null ? '' : value)) {
    if (ch === '\n') {
      out.push(line);
      line = '';
      used = 0;
      continue;
    }

    const w = ch.charCodeAt(0) < 128 ? 0.55 : 1;

    if (line && used + w > budget) {
      out.push(line);
      line = '';
      used = 0;
    }

    line += ch;
    used += w;
  }

  if (line) out.push(line);

  return out.join('\n');
}

export class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    registerIcons(this, [
      'hand',
      'backpack',
      'coins',
      'x',
      'rotate-ccw',
      'sandwich',
      'utensils',
      'cup-soda',
      'hand-coins',
      'map',
      'lock',
      'star',
      'zap',
      'footprints',
      'store',
      'train-front',
      'trash-2',
      'trees',
      'tent',
      'building-2',
      'factory',
      'list-checks'
    ]);

    this.street = this.scene.get('Street');

    this.stickId = null;
    this.shopOpen = false;
    this.overOpen = false;
    this.tradeOpen = false;
    this.craftOpen = false;
    this.homeOpen = false;
    this.vendingOpen = false;
    this.slotOpen = false;
    this.slotSpin = null;
      this.mapOpen = false;
    this.stealChoiceOpen = false;
    this.peddleOpen = false;
    this.testerOpen = false;
    this.begOpen = false;
    this.bagOpen = false;
    this.goalsOpen = false;
    this.helpOpen = false;
    this.winOpen = false;
    this.dialogueOpen = false;
    this.loreOpen = false;
    this.panelOpen = false;
    this.inputLockUntil = 0;
    this.uiSettleAt = 0;
    this.qte = null;
    this.storeId = null;
    this.storeEntries = [];
    this.tradeMode = 'pawn';
    this.barScale = 1;

    this.shown = {
      money: null,
      bag: null,
      hunger: -1,
      hint: null,
      can: null,
      canSteal: null,
      shopMoney: null,
      storeSig: null,
      tradeSig: null,
      district: null,
      energy: -1,
      stealState: null,
      craftSig: null,
      homeSig: null,
      clock: null,
      wanted: -1,
      slotMoney: null,
      edge: null,
      goals: null
    };

    this.buildBand();
    this.buildControls();
    this.buildHud();
    this.buildStore();
    this.buildTrade();
    this.buildCraft();
    this.buildHome();
    this.buildVending();
    this.buildSlot();
    this.buildMap();
    this.buildDrift();
    this.buildQte();
    this.buildStealChoice();
    this.buildPeddle();
    this.buildTester();
    this.buildBegChoice();
    this.buildBackpack();
    this.buildGoals();
    this.buildHelp();
    this.buildWin();
    this.buildDialogue();
    this.buildLore();
    this.buildOverlay();

    // The panels start closed: a hidden container can still answer taps, so
    // their controls are switched off until they are opened.
    this.setLayerInput(this.storeLayer, false);
    this.setLayerInput(this.tradeLayer, false);
    this.setLayerInput(this.craftLayer, false);
    this.setLayerInput(this.homeLayer, false);
    this.setLayerInput(this.vendingLayer, false);
    this.setLayerInput(this.slotLayer, false);
    this.setLayerInput(this.mapLayer, false);
    this.setLayerInput(this.qteLayer, false);
    this.setLayerInput(this.overLayer, false);
    this.setLayerInput(this.stealChoiceLayer, false);
    this.setLayerInput(this.peddleLayer, false);
    this.setLayerInput(this.testerLayer, false);
    this.setLayerInput(this.begLayer, false);
    this.setLayerInput(this.bagLayer, false);
    this.setLayerInput(this.goalsLayer, false);
    this.setLayerInput(this.helpLayer, false);
    this.setLayerInput(this.winLayer, false);
    this.setLayerInput(this.dialogueLayer, false);
    this.setLayerInput(this.loreLayer, false);

    // Closing is the corner button's job now: the little crosses in the panel
    // corners are gone, so there is nothing to catch by accident.
    for (const btn of [
      this.storeCloseBtn,
      this.storeCloseIcon,
      this.tradeCloseBtn,
      this.tradeCloseIcon,
      this.craftCloseBtn,
      this.craftCloseIcon,
      this.homeCloseBtn,
      this.homeCloseIcon,
      this.vendingCloseBtn,
      this.vendingCloseIcon,
      this.slotCloseBtn,
      this.slotCloseIcon,
      this.mapCloseBtn,
      this.mapCloseIcon
    ]) {
      if (btn) btn.setVisible(false);
    }

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    const onResize = (gameSize) => this.layout(gameSize.width, gameSize.height);
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => {
      this.scale.off('resize', onResize);
      this.input.off('pointerdown', this.onPointerDown, this);
      this.input.off('pointermove', this.onPointerMove, this);
      this.input.off('pointerup', this.onPointerUp, this);
      this.input.off('pointerupoutside', this.onPointerUp, this);
    });

    this.layout(this.scale.width, this.scale.height);

    // First time in the city: a card explaining the two thumbs.
    let seen = null;
    try {
      seen = window.localStorage.getItem('hobosim.help.v1');
    } catch (err) {
      seen = null;
    }

    if (!seen) this.time.delayedCall(900, () => this.openHelp());
  }

  // ------------------------------------------------------------- construction

  buildBand() {
    this.bandGfx = this.add.graphics().setDepth(DEPTH.band);
  }

  buildControls() {
    // Movement is a drag from wherever the thumb lands on the left half. The
    // plate is only drawn while a finger is down, and it pops in under the
    // thumb so the press can be felt as well as seen.
    this.stickOrigin = null;

    this.stickBase = this.add
      .circle(0, 0, STICK_RADIUS, 0x241f18, 0.34)
      .setStrokeStyle(2.5, UI.amber, 0.4)
      .setDepth(DEPTH.control)
      .setVisible(false);

    this.stickKnob = this.add
      .circle(0, 0, KNOB_RADIUS, UI.amber, 0.6)
      .setStrokeStyle(2, 0x201a13, 0.75)
      .setDepth(DEPTH.control + 1)
      .setVisible(false);

    // A white frame round the screen, flashed when a tap on the right half
    // lands on something.
    this.edgeFlash = this.add
      .rectangle(0, 0, 1, 1, 0xffffff, 0)
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0xffffff, 0.85)
      .setDepth(DEPTH.hud + 1)
      .setVisible(false);

    // One button in the corner does both jobs: it closes whatever panel is
    // open, and otherwise it acts on whatever is within reach. Faint until it
    // is pressed, so it never fights the game for attention.
    this.actionBtn = this.add
      .circle(0, 0, ACTION_RADIUS, 0x1a1611, 0.18)
      .setStrokeStyle(2, UI.amber, 0.3)
      .setDepth(DEPTH.panel + 5)
      .setInteractive();

    this.actionIcon = this.add
      .image(0, 0, 'icon-hand')
      .setScale(48 / 96)
      .setAlpha(0.4)
      .setDepth(DEPTH.panel + 6);

    this.actionBtn.on('pointerdown', () => this.pressAction());
  }

  buildHud() {
    this.chipGfx = this.add.graphics().setDepth(DEPTH.hud - 1);

    this.coinIcon = this.add.image(0, 0, 'icon-coins').setDepth(DEPTH.hud);
    this.moneyText = this.add
      .text(0, 0, '0 元', {
        fontFamily: FONT,
        fontSize: '17px',
        color: UI.gold,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);

    this.bagIcon = this.add.image(0, 0, 'icon-backpack').setDepth(DEPTH.hud);
    this.bagText = this.add
      .text(0, 0, '0', {
        fontFamily: FONT,
        fontSize: '17px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.hud);

    this.hungerIcon = this.add.image(0, 0, 'icon-utensils').setDepth(DEPTH.hud);
    this.hungerTrack = this.add
      .rectangle(0, 0, 118, 9, 0x14110d, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
    this.hungerFill = this.add
      .rectangle(0, 0, 118, 9, UI.good, 1)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 1);

    this.energyIcon = this.add.image(0, 0, 'icon-zap').setDepth(DEPTH.hud);
    this.energyTrack = this.add
      .rectangle(0, 0, 118, 9, 0x14110d, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
    this.energyFill = this.add
      .rectangle(0, 0, 118, 9, 0x5aa7d9, 1)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 1);

    this.hintText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '15px',
        color: UI.cream,
        backgroundColor: 'rgba(20,16,12,0.72)',
        padding: { x: 8, y: 4 }
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.hud)
      .setVisible(false);

    this.mapBtn = this.add
      .circle(0, 0, 22, 0x1a1611, 0.82)
      .setStrokeStyle(2, UI.amber, 0.6)
      .setDepth(DEPTH.hud)
      .setInteractive();

    this.mapIcon = this.add
      .image(0, 0, 'icon-map')
      .setScale(26 / 96)
      .setDepth(DEPTH.hud + 1);

    this.mapBtn.on('pointerdown', () => {
      this.uiSettleAt = this.time.now + 280;
      this.openMap();
    });

    this.districtText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '15px',
        color: UI.creamDim
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.hud);

    this.toastText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#fff3d2',
        backgroundColor: 'rgba(24,18,12,0.86)',
        padding: { x: 10, y: 6 }
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.panel - 1)
      .setVisible(false);

    this.clockText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#f2c46a',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);

    // The clock chip is also the tester's door, but the top-left corner is where
    // a thumb comes to rest by accident, so it takes a press held down rather
    // than a tap: resting a hand there should never open a panel.
    this.clockBtn = this.add
      .rectangle(12, 33, 192, 34, 0x000000, 0)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 2)
      .setInteractive();

    this.clockHold = null;

    this.clockBtn.on('pointerdown', (pointer) => {
      const id = pointer.id;

      if (this.clockHold) this.clockHold.remove(false);

      this.clockHold = this.time.delayedCall(600, () => {
        this.clockHold = null;

        // The finger has to still be there: a tap, or a thumb dragged off the
        // chip, is not a request for the tester.
        const held = this.input.manager.pointers.find((p) => p.id === id);
        if (!held || !held.isDown) return;
        if (this.time.now < this.inputLockUntil) return;

        this.uiSettleAt = this.time.now + 280;
        this.openTester();
      });
    });

    // The bag chip opens the backpack; the goal card opens the whole list.
    this.bagBtn = this.add
      .rectangle(0, 0, 92, 34, 0x000000, 0)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 2)
      .setInteractive();

    this.bagBtn.on('pointerdown', () => {
      this.uiSettleAt = this.time.now + 280;
      this.openBackpack();
    });

    this.goalBtn = this.add
      .rectangle(0, 0, 236, 54, 0x000000, 0)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 2)
      .setInteractive();

    this.goalBtn.on('pointerdown', () => {
      this.uiSettleAt = this.time.now + 280;
      this.openGoals();
    });

    this.wantedText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#f0a08a'
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.hud)
      .setVisible(false);

    this.edgeText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '14px',
        color: UI.cream,
        backgroundColor: 'rgba(20,16,12,0.78)',
        padding: { x: 8, y: 4 }
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.hud)
      .setVisible(false);

    // Old Zhou's list for the day: a small card under the chips with a row per
    // job and a bar for the one in hand.
    this.goalGfx = this.add.graphics().setDepth(DEPTH.hud - 1);

    this.goalIcon = this.add
      .image(0, 0, 'icon-list-checks')
      .setScale(15 / 96)
      .setDepth(DEPTH.hud);

    this.goalTitle = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: UI.gold,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);

    this.goalCount = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.hud);

    this.goalTrack = this.add
      .rectangle(0, 0, 100, 4, 0x14110d, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);

    this.goalFill = this.add
      .rectangle(0, 0, 100, 4, UI.amberBright, 1)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);

    this.goalRows = [];
    for (let i = 0; i < 3; i++) {
      const row = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: UI.cream })
        .setOrigin(0, 0.5)
        .setDepth(DEPTH.hud)
        .setVisible(false);

      this.goalRows.push(row);
    }

    this.goalRowCount = 0;
    this.goalBottom = 0;
    this.goalBarW = 0;
    this.goalPanel = { x: 12, y: 176, w: 300, h: 0 };
  }

  /// One panel serves every shop: the owner and the stock change, the shape
  /// stays the same.
  buildStore() {
    this.storeLayer = this.add.container(0, 0).setDepth(DEPTH.panel).setVisible(false);

    this.storeBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.storeBackdrop.on('pointerup', () => this.closeStore());

    this.storePanelGfx = this.add.graphics();

    this.storeTitle = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.storeSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.storeCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.storeCloseIcon = this.add.image(0, 0, 'icon-x');
    this.storeCloseBtn.on('pointerup', () => this.closeStore());

    // Shops that take things back get a second counter: one tab to buy, one to
    // sell, so the beggar never has to hunt for the pawn shop to empty his bag.
    const mkTab = (label) => {
      const bg = this.add
        .rectangle(0, 0, 64, 40, UI.panelRow, 1)
        .setStrokeStyle(1.5, UI.amber, 0.5)
        .setInteractive();
      const text = this.add
        .text(0, 0, label, { fontFamily: FONT, fontSize: '16px', color: UI.cream })
        .setOrigin(0.5, 0.5)
        .setVisible(false);

      return { bg, text };
    };

    this.storeTabBuy = mkTab('买');
    this.storeTabSell = mkTab('卖');
    this.storeTabBuy.bg.on('pointerdown', () => this.setStoreMode('buy'));
    this.storeTabSell.bg.on('pointerdown', () => this.setStoreMode('sell'));

    this.storeMode = 'buy';
    this.storeTabShown = false;

    this.storeLayer.add([
      this.storeBackdrop,
      this.storePanelGfx,
      this.storeTitle,
      this.storeSub,
      this.storeCloseBtn,
      this.storeCloseIcon,
      this.storeTabBuy.bg,
      this.storeTabBuy.text,
      this.storeTabSell.bg,
      this.storeTabSell.text
    ]);

    this.storeRows = [];

    for (let i = 0; i < 10; i++) {
      const bg = this.add
        .rectangle(0, 0, ROW_WIDTH, ROW_HEIGHT, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(0, 0, 'icon-sandwich');
      const name = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '16px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '12px',
          color: UI.creamDim,
          lineSpacing: 2,
          wordWrap: { width: 190 }
        })
        .setOrigin(0, 0.5);
      const price = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '19px',
          color: UI.gold,
          fontStyle: 'bold'
        })
        .setOrigin(1, 0.5);

      const row = { bg, icon, name, info, price, entry: null };
      bg.on('pointerdown', () => this.buyStock(row));
      this.storeLayer.add([bg, icon, name, info, price]);
      this.storeRows.push(row);
    }
  }

  buildTrade() {
    this.tradeLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.tradeBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.tradeBackdrop.on('pointerup', () => this.closeTrade());

    this.tradePanelGfx = this.add.graphics();

    this.tradeTitle = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.tradeSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.tradeLayer.add([
      this.tradeBackdrop,
      this.tradePanelGfx,
      this.tradeTitle,
      this.tradeSub
    ]);

    this.tradeRows = [];

    for (let i = 0; i < TRADE_MAX_ROWS; i++) {
      const bg = this.add
        .rectangle(0, 0, TRADE_ROW_WIDTH, TRADE_ROW_HEIGHT, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(0, 0, 'item-can');
      const name = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '16px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
        .setOrigin(0, 0.5);
      const price = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '17px',
          color: UI.gold,
          fontStyle: 'bold'
        })
        .setOrigin(1, 0.5);

      const useBtn = this.add
        .rectangle(0, 0, 56, 36, 0x3a4a2c, 1)
        .setStrokeStyle(1.5, UI.good, 0.85)
        .setInteractive()
        .setVisible(false);
      const useText = this.add
        .text(0, 0, '用', {
          fontFamily: FONT,
          fontSize: '14px',
          color: UI.cream,
          fontStyle: 'bold'
        })
        .setOrigin(0.5, 0.5)
        .setVisible(false);

      const row = { bg, icon, name, info, price, useBtn, useText, entry: null, action: null };
      bg.on('pointerdown', () => this.useTradeRow(row));
      useBtn.on('pointerdown', () => this.useLootRow(row));
      this.tradeLayer.add([bg, icon, name, info, price, useBtn, useText]);
      this.tradeRows.push(row);
    }

    this.sellAllBtn = this.add
      .rectangle(0, 0, 200, 38, 0x4a3a24, 1)
      .setStrokeStyle(2, UI.amberBright, 0.85)
      .setInteractive();
    this.sellAllText = this.add
      .text(0, 0, '废品全卖', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);
    this.sellAllBtn.on('pointerdown', () => this.sellAll());

    this.tradeCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.tradeCloseIcon = this.add.image(0, 0, 'icon-x');
    this.tradeCloseBtn.on('pointerup', () => this.closeTrade());

    this.tradeLayer.add([
      this.sellAllBtn,
      this.sellAllText,
      this.tradeCloseBtn,
      this.tradeCloseIcon
    ]);
  }

  // ------------------------------------------------------------------- the QTE

  buildQte() {
    this.qteLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 3).setVisible(false);

    this.qteBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.4)
      .setOrigin(0, 0)
      .setInteractive();
    this.qteBackdrop.on('pointerup', () => this.resolveQte());

    this.qteGfx = this.add.graphics();

    this.qteTitle = this.add
      .text(0, 0, '扒钱包', {
        fontFamily: FONT,
        fontSize: '17px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.qteTip = this.add
      .text(0, 0, '滑块进绿区时点击', {
        fontFamily: FONT,
        fontSize: '14px',
        color: UI.creamDim
      })
      .setOrigin(0.5, 0.5);

    this.qteLayer.add([this.qteBackdrop, this.qteGfx, this.qteTitle, this.qteTip]);
  }

  layoutQte() {
    const qw = Math.min(this.w - 64, 340);
    const qh = 104;
    const qx = (this.w - qw) / 2;
    const qy = Math.max(70, this.playH * 0.42 - qh / 2);

    this.qteRect = { x: qx, y: qy, w: qw, h: qh };
    this.qteBackdrop.setScale(this.w, this.h).setPosition(0, 0);
    this.qteTitle.setPosition(qx + qw / 2, qy + 22);
    this.qteTip.setPosition(qx + qw / 2, qy + 44);
  }

  /// A small card asking what to lift: the purse in the hand, or whatever is
  /// loose in a pocket. The two lifts are not the same gamble.
  buildStealChoice() {
    this.stealChoiceLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 2).setVisible(false);

    this.stealChoiceBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.5)
      .setOrigin(0, 0)
      .setInteractive();
    this.stealChoiceBackdrop.on('pointerup', () => this.closeStealChoice());

    this.stealChoiceGfx = this.add.graphics();

    this.stealChoiceTitle = this.add
      .text(0, 0, '要偷什么？', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.stealChoiceLayer.add([
      this.stealChoiceBackdrop,
      this.stealChoiceGfx,
      this.stealChoiceTitle
    ]);

    this.stealChoiceRows = [];

    const modes = ['money', 'item', 'peddle'];
    const modeIcons = ['icon-hand-coins', 'icon-hand', 'icon-backpack'];

    for (let i = 0; i < modes.length; i++) {
      const bg = this.add
        .rectangle(0, 0, 1, 1, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(0, 0, modeIcons[i]);
      const name = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '16px',
          color: UI.cream,
          fontStyle: 'bold'
        })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
        .setOrigin(0, 0.5);

      const row = {
        bg,
        icon,
        name,
        info,
        mode: modes[i],
        enabled: true
      };

      bg.on('pointerdown', () => this.pickStealMode(row));

      this.stealChoiceLayer.add([bg, icon, name, info]);
      this.stealChoiceRows.push(row);
    }
  }

  layoutStealChoice() {
    const w = this.w;
    const pw = Math.min(w - 48, 320);
    const rowH = 56;
    const ph = 62 + rowH * this.stealChoiceRows.length + 16;
    const px = (w - pw) / 2;
    const py = Math.max(56, this.playH * 0.34 - ph / 2);

    this.stealChoiceBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.stealChoiceGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.stealChoiceTitle.setPosition(w / 2, py + 24);

    const rowW = pw - 24;
    const rowX = px + 12;

    this.stealChoiceRows.forEach((row, i) => {
      const ry = py + 52 + rowH * i + rowH / 2 + 8;

      row.bg.setScale(rowW, rowH).setPosition(rowX, ry);
      row.icon.setPosition(rowX + 28, ry).setScale(0.28);
      row.name.setPosition(rowX + 52, ry - 9);
      row.info.setPosition(rowX + 52, ry + 11);
    });
  }

  refreshStealChoice() {
    const options =
      this.street && this.street.stealOptions ? this.street.stealOptions() : null;
    const goods =
      this.street && this.street.peddleItems ? this.street.peddleItems() : [];

    const purse = options ? options.purse : 0;
    const loot = options && options.loot ? LOOT_ITEMS[options.loot] : null;

    const data = [
      {
        icon: 'icon-hand-coins',
        name: '摸钱袋',
        info: purse > 0 ? `${purse} 元 · 绿区窄，被发现会喊人` : '钱袋已经空了',
        ok: purse > 0
      },
      {
        icon: 'icon-hand',
        name: '顺口袋',
        info: loot ? `${loot.name} · 绿区宽，被抓住会拖住你` : '口袋里没什么了',
        ok: !!loot
      },
      {
        icon: 'icon-backpack',
        name: '兜售背包里的货',
        info: goods.length ? `${goods.length} 件能卖的 · 自己开价` : '包里没有能卖的货',
        ok: goods.length > 0
      }
    ];

    this.stealChoiceRows.forEach((row, i) => {
      const entry = data[i];

      row.enabled = entry.ok;
      row.icon.setTexture(entry.icon).setAlpha(entry.ok ? 1 : 0.4);
      row.name.setText(entry.name).setColor(entry.ok ? UI.cream : '#8a8070');
      row.info.setText(entry.info).setColor(entry.ok ? UI.creamDim : '#736a5c');
      row.bg.setFillStyle(entry.ok ? UI.panelRow : UI.panelRowDim, 1);
    });
  }

  openStealChoice() {
    if (
      this.overOpen ||
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte ||
      this.stealChoiceOpen ||
      this.peddleOpen ||
      this.testerOpen ||
      this.begOpen ||
      this.bagOpen ||
      this.goalsOpen ||
      this.helpOpen ||
      this.winOpen ||
      this.dialogueOpen ||
      this.loreOpen
    )
      return;

    const options =
      this.street && this.street.stealOptions ? this.street.stealOptions() : null;
    const goods =
      this.street && this.street.peddleItems ? this.street.peddleItems() : [];

    const purse = options ? options.purse : 0;
    const loot = options ? options.loot : null;

    if (purse <= 0 && !loot && !goods.length) {
      haptic('refuse');
      return;
    }

    this.stealChoiceOpen = true;
    this.showPanel(this.stealChoiceLayer);
    this.releaseStick();
    this.layoutStealChoice();
    this.refreshStealChoice();
    haptic('ui');
  }

  closeStealChoice() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.stealChoiceOpen) return;
    this.stealChoiceOpen = false;
    this.hidePanel(this.stealChoiceLayer);
    haptic('ui');
  }

  pickStealMode(row) {
    if (!row.enabled) {
      haptic('refuse');
      return;
    }

    const mode = row.mode;
    this.uiSettleAt = 0;
    this.closeStealChoice();

    if (mode === 'peddle') {
      this.uiSettleAt = 0;
      this.openPeddle();
      return;
    }

    if (this.street) this.street.trySteal(mode);
  }

  // ------------------------------------------------------------ peddling

  /// The panel the beggar talks a passer-by into buying from: the pick of the
  /// bag, a price to ask, and the odds of it working.
  buildPeddle() {
    this.peddleLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 2).setVisible(false);

    this.peddleBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.peddleBackdrop.on('pointerup', () => this.closePeddle());

    this.peddleGfx = this.add.graphics();

    this.peddleTitle = this.add
      .text(0, 0, '兜售', {
        fontFamily: FONT,
        fontSize: '18px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.peddleSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0.5, 0.5);

    this.peddleLayer.add([this.peddleBackdrop, this.peddleGfx, this.peddleTitle, this.peddleSub]);

    this.peddleRows = [];
    this.peddleRowCount = 1;

    for (let i = 0; i < PEDDLE_ROWS; i++) {
      const bg = this.add
        .rectangle(0, 0, 1, 1, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const name = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '15px',
          color: UI.cream,
          fontStyle: 'bold'
        })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '12px', color: UI.creamDim })
        .setOrigin(0, 0.5);
      const value = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: UI.gold })
        .setOrigin(1, 0.5);

      const row = { bg, name, info, value, item: null };
      bg.on('pointerdown', () => this.pickPeddleRow(row));

      this.peddleLayer.add([bg, name, info, value]);
      this.peddleRows.push(row);
    }

    this.peddleMinusBtn = this.add
      .rectangle(0, 0, 46, 40, UI.panelRow, 1)
      .setStrokeStyle(1.5, UI.amber, 0.6)
      .setInteractive();
    this.peddleMinusText = this.add
      .text(0, 0, '－', { fontFamily: FONT, fontSize: '20px', color: UI.cream })
      .setOrigin(0.5, 0.5);
    this.peddleMinusBtn.on('pointerdown', () => this.bumpPeddlePrice(-1));

    this.peddlePlusBtn = this.add
      .rectangle(0, 0, 46, 40, UI.panelRow, 1)
      .setStrokeStyle(1.5, UI.amber, 0.6)
      .setInteractive();
    this.peddlePlusText = this.add
      .text(0, 0, '＋', { fontFamily: FONT, fontSize: '20px', color: UI.cream })
      .setOrigin(0.5, 0.5);
    this.peddlePlusBtn.on('pointerdown', () => this.bumpPeddlePrice(1));

    this.peddlePriceText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: UI.gold,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.peddleRateText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0.5, 0.5);

    this.peddleSellBtn = this.add
      .rectangle(0, 0, 200, 44, 0x4a3a24, 1)
      .setStrokeStyle(2, UI.amberBright, 0.9)
      .setInteractive();
    this.peddleSellText = this.add
      .text(0, 0, '开口兜售', {
        fontFamily: FONT,
        fontSize: '17px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);
    this.peddleSellBtn.on('pointerdown', () => this.doPeddle());

    this.peddleLayer.add([
      this.peddleMinusBtn,
      this.peddleMinusText,
      this.peddlePlusBtn,
      this.peddlePlusText,
      this.peddlePriceText,
      this.peddleRateText,
      this.peddleSellBtn,
      this.peddleSellText
    ]);

    this.peddleSel = null;
    this.peddlePrice = 0;
    this.peddlePed = null;
  }

  layoutPeddle() {
    const w = this.w;
    const pw = Math.min(w - 32, 330);
    const rows = Math.max(1, this.peddleRowCount || 1);
    const ph = 70 + rows * 44 + 84;
    const px = (w - pw) / 2;
    const py = Math.max(48, (this.playH - ph) / 2);

    this.peddleBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.peddleGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.peddleTitle.setPosition(w / 2, py + 20);
    this.peddleSub.setPosition(w / 2, py + 42);

    const rowW = pw - 24;
    const rowX = px + 12;

    this.peddleRows.forEach((row, i) => {
      const ry = py + 64 + 44 * i + 20;

      row.bg.setScale(rowW, 40).setPosition(rowX, ry);
      row.name.setPosition(rowX + 12, ry - 8);
      row.info.setPosition(rowX + 12, ry + 9);
      row.value.setPosition(rowX + rowW - 12, ry);
    });

    const priceY = py + 64 + rows * 44 + 22;

    this.peddleMinusBtn.setPosition(px + 40, priceY);
    this.peddleMinusText.setPosition(px + 40, priceY);
    this.peddlePlusBtn.setPosition(px + pw - 40, priceY);
    this.peddlePlusText.setPosition(px + pw - 40, priceY);
    this.peddlePriceText.setPosition(w / 2, priceY - 2);
    this.peddleRateText.setPosition(w / 2, priceY + 26);

    const btnY = py + ph - 34;
    this.peddleSellBtn.setScale((pw - 48) / 200, 1).setPosition(w / 2, btnY);
    this.peddleSellText.setPosition(w / 2, btnY);
  }

  peddleItemList() {
    return this.street && this.street.peddleItems ? this.street.peddleItems() : [];
  }

  refreshPeddle() {
    const street = this.street;
    const items = this.peddleItemList();

    this.peddleRowCount = Math.min(PEDDLE_ROWS, Math.max(1, items.length));

    const stillThere =
      this.peddleSel &&
      items.some((item) => item.id === this.peddleSel.id && item.kind === this.peddleSel.kind);

    if (!stillThere) {
      this.peddleSel = items[0] || null;
      this.peddlePrice = this.peddleSel ? this.peddleSel.value : 0;
    }

    const ped = this.peddlePed;
    const name = ped && ped.kind && ped.kind.label ? ped.kind.label : '路人';

    this.peddleTitle.setText(`兜售 · ${name}`);

    this.peddleRows.forEach((row, i) => {
      const item = items[i];

      if (!item || i >= PEDDLE_ROWS) {
        row.item = null;
        row.bg.setVisible(false);
        row.name.setVisible(false);
        row.info.setVisible(false);
        row.value.setVisible(false);
        return;
      }

      const picked =
        this.peddleSel && this.peddleSel.id === item.id && this.peddleSel.kind === item.kind;

      row.item = item;
      row.bg.setVisible(true).setFillStyle(picked ? 0x4a3a24 : UI.panelRow, 1);
      row.name
        .setVisible(true)
        .setText(`${item.name}${item.count > 1 ? `×${item.count}` : ''}`)
        .setColor(picked ? UI.cream : UI.creamDim);
      row.info.setVisible(true).setText(item.kind === 'good' ? '自己做的' : '顺来的');
      row.value.setVisible(true).setText(`${item.value} 元`);
    });

    const item = this.peddleSel;

    if (!item) {
      this.peddleSub.setText('包里没有能卖的货');
      this.peddlePriceText.setText('—');
      this.peddleRateText.setText('').setColor(UI.creamDim);
      this.peddleSellBtn.setFillStyle(0x2a241c, 1).setStrokeStyle(1.5, UI.amber, 0.3);
      this.peddleSellText.setColor('#8a8070');
      this.layoutPeddle();
      return;
    }

    const info = street.peddleRate
      ? street.peddleRate(item.value, this.peddlePrice, this.peddlePed)
      : { rate: 0, charm: null };
    const pct = Math.round(info.rate * 100);
    const charmNote =
      info.charm === 'cigarettes' ? ' · 递根烟' : info.charm === 'ticket' ? ' · 塞张彩票' : '';

    this.peddleSub.setText(`${item.name} · 值 ${item.value} 元`);
    this.peddlePriceText.setText(`${this.peddlePrice} 元`);
    this.peddleRateText
      .setText(`成算 ${pct}%${charmNote}`)
      .setColor(pct >= 60 ? '#a8d98a' : pct >= 35 ? UI.creamDim : '#f0a08a');

    this.peddleSellBtn.setFillStyle(0x4a3a24, 1).setStrokeStyle(2, UI.amberBright, 0.9);
    this.peddleSellText.setColor(UI.cream);

    this.layoutPeddle();
  }

  openPeddle() {
    if (
      this.overOpen ||
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte ||
      this.peddleOpen
    )
      return;

    if (!this.peddleItemList().length) {
      haptic('refuse');
      return;
    }

    this.peddlePed = this.street
      ? this.street.peddleTarget || this.street.stealTarget || null
      : null;

    if (!this.peddlePed) {
      haptic('refuse');
      return;
    }

    this.peddleOpen = true;
    this.showPanel(this.peddleLayer);
    // A thumb lifting from the row it just tapped must not close the panel
    // before the first choice can be made.
    this.uiSettleAt = this.time.now + 360;
    this.releaseStick();
    this.peddleSel = null;
    if (this.peddleSellBtn.input) this.peddleSellBtn.input.enabled = true;
    this.layoutPeddle();
    this.refreshPeddle();
    haptic('ui');
  }

  closePeddle() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.peddleOpen) return;

    this.peddleOpen = false;
    this.hidePanel(this.peddleLayer);
    haptic('ui');
  }

  pickPeddleRow(row) {
    if (!row.item) return;

    this.peddleSel = row.item;
    this.peddlePrice = row.item.value;
    haptic('tick');
    this.refreshPeddle();
  }

  bumpPeddlePrice(dir) {
    const item = this.peddleSel;
    if (!item) return;

    const step = item.value >= 30 ? 5 : item.value >= 12 ? 2 : 1;
    const max = Math.max(item.value * 3, item.value + 10);

    this.peddlePrice = Phaser.Math.Clamp(this.peddlePrice + dir * step, 1, max);
    haptic('tick');
    this.refreshPeddle();
  }

  doPeddle() {
    const item = this.peddleSel;
    if (!item || !this.street) {
      haptic('refuse');
      return;
    }

    const result = this.street.sellToPed(item.id, item.kind, this.peddlePrice, this.peddlePed);

    if (result === 'none') {
      haptic('refuse');
      this.uiSettleAt = 0;
      this.closePeddle();
      return;
    }

    haptic(result === 'ok' ? 'sell' : 'refuse');

    // Let the result sit for a moment instead of snapping the panel shut.
    this.peddleSub.setText(
      result === 'ok' ? `卖掉一件 · +${this.peddlePrice} 元` : '他没要，还骂了一句'
    );
    this.peddleRateText.setText('');

    if (this.peddleSellBtn.input) this.peddleSellBtn.input.enabled = false;

    this.time.delayedCall(520, () => {
      if (this.peddleSellBtn.input) this.peddleSellBtn.input.enabled = true;
      this.uiSettleAt = 0;
      this.closePeddle();
    });
  }

  // ----------------------------------------------------------- tester panel

  /// A little panel for whoever is testing the game: one save slot on the device
  /// and a few hand-outs for getting to the part you want to look at.
  buildTester() {
    this.testerLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.testerBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.testerBackdrop.on('pointerup', () => this.closeTester());

    this.testerGfx = this.add.graphics();

    this.testerTitle = this.add
      .text(0, 0, '测试面板', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.testerSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.testerCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.testerCloseIcon = this.add.image(0, 0, 'icon-x');
    this.testerCloseBtn.on('pointerup', () => this.closeTester());

    this.testerLayer.add([
      this.testerBackdrop,
      this.testerGfx,
      this.testerTitle,
      this.testerSub,
      this.testerCloseBtn,
      this.testerCloseIcon
    ]);

    const actions = [
      { id: 'save', label: '保存进度' },
      { id: 'load', label: '读取存档' },
      { id: 'wipe', label: '删除存档' },
      { id: 'money', label: '加 100 元' },
      { id: 'materials', label: '废品各 +3' },
      { id: 'heal', label: '精力饱食回满' },
      { id: 'hour', label: '时间 +1 小时' },
      { id: 'evening', label: '跳到傍晚' },
      { id: 'tomorrow', label: '跳到明天' },
      { id: 'teleport', label: '换个街区' },
      { id: 'weather', label: '换天气' },
      { id: 'season', label: '换季节' },
      { id: 'skill', label: '熟练度 +1' },
      { id: 'event', label: '触发城市事件' },
      { id: 'furniture', label: '家具全刷' },
      { id: 'wanted', label: '清通缉' },
      { id: 'favor', label: '好感各 +25' },
      { id: 'sound', label: '音效：开' },
      { id: 'haptics', label: '震动：开' }
    ];

    this.testerRows = actions.map((action) => {
      const bg = this.add
        .rectangle(0, 0, 1, 1, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const text = this.add
        .text(0, 0, action.label, { fontFamily: FONT, fontSize: '13px', color: UI.cream })
        .setOrigin(0, 0.5);

      bg.on('pointerdown', () => this.testerAction(action.id));

      this.testerLayer.add([bg, text]);
      return { bg, text, id: action.id, label: action.label };
    });
  }

  layoutTester() {
    const w = this.w;
    const rowH = 46;
    const cols = 2;
    const rows = Math.ceil(this.testerRows.length / cols);
    const pw = Math.min(w - 40, 350);
    const ph = 76 + rows * (rowH + 6) + 16;
    const px = (w - pw) / 2;
    const py = Math.max(40, (this.playH - ph) / 2);

    this.testerBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.testerGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.testerTitle.setPosition(px + 18, py + 14);
    this.testerSub.setPosition(px + 18, py + 42);
    this.testerCloseBtn.setPosition(px + pw - 26, py + 26);
    this.testerCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);

    const gap = 8;
    const cellW = (pw - 32 - gap) / 2;
    const rowX = px + 16;

    this.testerRows.forEach((row, i) => {
      const col = i % cols;
      const line = Math.floor(i / cols);
      const ry = py + 76 + rowH / 2 + line * (rowH + 6);
      const rx = rowX + col * (cellW + gap);

      row.bg.setScale(cellW, rowH).setPosition(rx, ry);
      row.text.setPosition(rx + 10, ry);
    });
  }

  openTester() {
    if (this.testerOpen || this.overOpen || this.qte) return;

    this.testerOpen = true;
    this.showPanel(this.testerLayer);
    this.releaseStick();
    this.layoutTester();
    this.refreshTester();
    haptic('ui');
  }

  closeTester() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.testerOpen) return;

    this.testerOpen = false;
    this.hidePanel(this.testerLayer);
    haptic('ui');
  }

  refreshTester() {
    const info = savedInfo();

    this.testerSub.setText(
      info ? `有存档 · 第 ${info.day} 天` : '还没有存档 · 走到帐篷睡一觉会自动存'
    );

    for (const row of this.testerRows) {
      if (row.id === 'sound') {
        row.text.setText(`音效：${audioMuted() ? '关' : '开'}`);
      } else if (row.id === 'haptics') {
        row.text.setText(`震动：${hapticsEnabled() ? '开' : '关'}`);
      }
    }
  }

  testerAction(id) {
    const street = this.street;

    const extra = [
      'sound',
      'haptics',
      'hour',
      'evening',
      'tomorrow',
      'teleport',
      'weather',
      'season',
      'skill',
      'event',
      'furniture',
      'wanted',
      'favor'
    ];

    if (extra.indexOf(id) >= 0) {
      this.testerActionMore(id);
      return;
    }

    if (id === 'save') {
      const ok = !!(street && street.saveNow && street.saveNow());
      haptic(ok ? 'buy' : 'refuse');
      this.refreshTester();

      if (ok) this.testerSub.setText(`已保存 · 第 ${street.run.day} 天`);
      return;
    }

    if (id === 'load') {
      const ok = !!(street && street.loadSaved && street.loadSaved());
      haptic(ok ? 'buy' : 'refuse');

      if (!ok) {
        this.testerSub.setText('还没有存档');
        return;
      }

      this.uiSettleAt = 0;
      this.closeTester();
      return;
    }

    if (id === 'wipe') {
      if (street && street.clearSaved) street.clearSaved();
      haptic('refuse');
      this.refreshTester();
      this.testerSub.setText('存档已删除');
      return;
    }

    if (street && street.debugGive) street.debugGive(id);
    this.refreshTester();
  }

  // --------------------------------------------------------------- tester bits

  testerActionMore(id) {
    const street = this.street;

    if (id === 'sound') {
      setAudioMuted(!audioMuted());
      this.refreshTester();
      return;
    }

    if (id === 'haptics') {
      setHapticsEnabled(!hapticsEnabled());
      this.refreshTester();
      return;
    }

    if (id === 'season') {
      if (street && street.debugCycleSeason) street.debugCycleSeason();
      this.testerSub.setText(
        street && street.run && street.run.season
          ? `现在：${seasonName(street.run.season)}天`
          : ''
      );
      this.refreshTester();
      return;
    }

    if (id === 'skill') {
      if (street && street.debugSkill) street.debugSkill();
      this.testerSub.setText(
        street && street.run
          ? `${skillLabel(street.run, 'steal')} · ${skillLabel(street.run, 'peddle')}`
          : ''
      );
      this.refreshTester();
      return;
    }

    if (id === 'hour') {
      if (street && street.debugGive) street.debugGive('time');
      this.refreshTester();
      return;
    }

    if (id === 'evening') {
      if (street && street.debugEvening) street.debugEvening();
      this.refreshTester();
      return;
    }

    if (id === 'tomorrow') {
      if (street && street.debugNextDay) street.debugNextDay();
      this.refreshTester();
      return;
    }

    if (id === 'teleport') {
      if (street && street.debugTeleport) street.debugTeleport();
      return;
    }

    if (id === 'weather') {
      if (street && street.debugCycleWeather) street.debugCycleWeather();
      return;
    }

    if (id === 'event') {
      if (street && street.debugTriggerEvent) street.debugTriggerEvent();
      return;
    }

    if (id === 'furniture') {
      if (street && street.debugFurniture) street.debugFurniture();
      this.refreshTester();
      return;
    }

    if (id === 'wanted') {
      if (street && street.debugClearWanted) street.debugClearWanted();
      this.refreshTester();
    }

    if (id === 'favor') {
      if (street && street.addFavor) {
        for (const patron of PATRONS) street.addFavor(patron.id, 25);
      }
      this.refreshTester();
    }
  }

  // ------------------------------------------------------------ begging style

  /// How to play the beggar today: plain pleading, a song, or a fake illness.
  buildBegChoice() {
    this.begLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 2).setVisible(false);

    this.begBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.5)
      .setOrigin(0, 0)
      .setInteractive();
    this.begBackdrop.on('pointerup', () => this.closeBegChoice());

    this.begGfx = this.add.graphics();

    this.begTitle = this.add
      .text(0, 0, '怎么讨？', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.begLayer.add([this.begBackdrop, this.begGfx, this.begTitle]);

    const modes = [
      {
        id: 'plead',
        name: '卖惨磕头',
        info: '稳当、不招人，但每次给得少'
      },
      {
        id: 'song',
        name: '弹唱拉琴',
        info: '给得多，吵，会引来警察'
      },
      {
        id: 'fake',
        name: '装睡装病',
        info: '单价最高，可能被人数落、摸走碗里的钱'
      }
    ];

    this.begRows = modes.map((mode) => {
      const bg = this.add
        .rectangle(0, 0, 1, 1, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const name = this.add
        .text(0, 0, mode.name, {
          fontFamily: FONT,
          fontSize: '15px',
          color: UI.cream,
          fontStyle: 'bold'
        })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, mode.info, { fontFamily: FONT, fontSize: '12px', color: UI.creamDim })
        .setOrigin(0, 0.5);

      bg.on('pointerdown', () => this.pickBegStyle(mode.id));

      this.begLayer.add([bg, name, info]);
      return { bg, name, info, id: mode.id };
    });
  }

  layoutBegChoice() {
    const w = this.w;
    const pw = Math.min(w - 48, 330);
    const rowH = 56;
    const ph = 58 + this.begRows.length * (rowH + 6) + 14;
    const px = (w - pw) / 2;
    const py = Math.max(64, this.playH * 0.36 - ph / 2);

    this.begBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.begGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.begTitle.setPosition(w / 2, py + 24);

    const rowW = pw - 24;
    const rowX = px + 12;

    this.begRows.forEach((row, i) => {
      const ry = py + 58 + rowH / 2 + i * (rowH + 6);

      row.bg.setScale(rowW, rowH).setPosition(rowX, ry);
      row.name.setPosition(rowX + 12, ry - 9);
      row.info.setPosition(rowX + 12, ry + 11);
    });
  }

  openBegChoice() {
    if (this.begOpen || this.overOpen || this.qte) return;

    this.begOpen = true;
    this.showPanel(this.begLayer);
    this.releaseStick();
    this.layoutBegChoice();
    this.uiSettleAt = this.time.now + 360;
    haptic('ui');
  }

  closeBegChoice() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.begOpen) return;

    this.begOpen = false;
    this.hidePanel(this.begLayer);
    haptic('ui');
  }

  pickBegStyle(id) {
    if (this.street && this.street.setBegStyle) this.street.setBegStyle(id);

    this.uiSettleAt = 0;
    this.closeBegChoice();
  }

  // ---------------------------------------------------------------- backpack

  buildBackpack() {
    this.bagLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.bagBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.bagBackdrop.on('pointerup', () => this.closeBackpack());

    this.bagGfx = this.add.graphics();

    this.bagTitle = this.add
      .text(0, 0, '背包', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.bagSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.bagCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.bagCloseIcon = this.add.image(0, 0, 'icon-x');
    this.bagCloseBtn.on('pointerup', () => this.closeBackpack());

    this.bagTip = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: UI.creamDim,
        align: 'center',
        lineSpacing: 3
      })
      .setOrigin(0.5, 0.5);

    this.bagLayer.add([
      this.bagBackdrop,
      this.bagGfx,
      this.bagTitle,
      this.bagSub,
      this.bagCloseBtn,
      this.bagCloseIcon,
      this.bagTip
    ]);

    this.bagRows = [];

    for (let i = 0; i < 8; i++) {
      const bg = this.add
        .rectangle(0, 0, 1, 1, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(0, 0, 'item-can').setScale(0.5);
      const name = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '12px', color: UI.creamDim })
        .setOrigin(0, 0.5);
      const count = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: UI.gold })
        .setOrigin(1, 0.5);

      const row = { bg, icon, name, info, count, entry: null };
      bg.on('pointerdown', () => this.pressBagRow(row));

      this.bagLayer.add([bg, icon, name, info, count]);
      this.bagRows.push(row);
    }
  }

  layoutBackpack() {
    const w = this.w;
    const rowH = 48;
    const pw = Math.min(w - 32, 340);
    const ph = 66 + this.bagRows.length * (rowH + 5) + 46;
    const px = (w - pw) / 2;
    const py = Math.max(40, (this.playH - ph) / 2);

    this.bagBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.bagGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.bagTitle.setPosition(px + 18, py + 12);
    this.bagSub.setPosition(px + 18, py + 38);
    this.bagCloseBtn.setPosition(px + pw - 26, py + 26);
    this.bagCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);
    this.bagTip.setPosition(w / 2, py + ph - 26);

    const rowW = pw - 24;
    const rowX = px + 12;

    this.bagRows.forEach((row, i) => {
      const ry = py + 66 + rowH / 2 + i * (rowH + 5);

      row.bg.setScale(rowW, rowH).setPosition(rowX, ry);
      row.icon.setPosition(rowX + 22, ry);
      row.name.setPosition(rowX + 44, ry - 8);
      row.info.setPosition(rowX + 44, ry + 10);
      row.count.setPosition(rowX + rowW - 12, ry);
    });
  }

  bagEntryList() {
    const run = this.street && this.street.run ? this.street.run : null;
    if (!run) return [];

    const entries = [];

    for (const id of JUNK_ORDER) {
      const count = run.items[id] || 0;
      if (count > 0) {
        entries.push({
          kind: 'junk',
          id,
          name: JUNK_ITEMS[id].name,
          info: '废品 · 能卖钱',
          icon: JUNK_ITEMS[id].tex,
          count
        });
      }
    }

    for (const id of LOOT_ORDER) {
      const count = run.loot[id] || 0;
      if (count > 0) {
        entries.push({
          kind: 'loot',
          id,
          name: LOOT_ITEMS[id].name,
          info: `${LOOT_ITEMS[id].kind === 'food' ? '能吃的' : '顺来的'} · ${LOOT_ITEMS[id].use}`,
          icon: LOOT_ITEMS[id].tex,
          count
        });
      }
    }

    for (const rec of RECIPES) {
      const count = run.goods[rec.id] || 0;
      if (count > 0) {
        entries.push({
          kind: 'good',
          id: rec.id,
          name: rec.name,
          info: '自己做的 · 能卖钱',
          icon: rec.tex,
          count
        });
      }
    }

    return entries;
  }

  refreshBackpack() {
    const run = this.street && this.street.run ? this.street.run : null;
    const entries = this.bagEntryList();
    const limit = this.street && this.street.bagLimit ? this.street.bagLimit() : 12;

    this.bagSub.setText(run ? `背着 ${run.bag}/${limit} 件` : '');
    this.bagTip.setText(
      run
        ? `${skillLabel(run, 'steal')} · ${skillLabel(run, 'peddle')}\n点食物吃掉，点别的丢掉`
        : ''
    );

    this.bagRows.forEach((row, i) => {
      const entry = entries[i];

      row.entry = entry || null;
      row.bg.setVisible(!!entry);
      row.icon.setVisible(!!entry);
      row.name.setVisible(!!entry);
      row.info.setVisible(!!entry);
      row.count.setVisible(!!entry);
      if (row.bg.input) row.bg.input.enabled = !!entry;
      if (!entry) return;

      row.icon.setTexture(entry.icon);
      row.name.setText(entry.name);
      row.info.setText(entry.info);
      row.count.setText(`×${entry.count}`);
    });
  }

  openBackpack() {
    if (this.bagOpen || this.overOpen || this.qte) return;

    this.bagOpen = true;
    this.showPanel(this.bagLayer);
    this.releaseStick();
    this.layoutBackpack();
    this.refreshBackpack();
    this.uiSettleAt = this.time.now + 320;
    haptic('ui');
  }

  closeBackpack() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.bagOpen) return;

    this.bagOpen = false;
    this.hidePanel(this.bagLayer);
    haptic('ui');
  }

  dropBagRow(row) {
    if (!row.entry || !this.street) return;

    this.street.discardItem(row.entry.kind, row.entry.id);
    this.refreshBackpack();
  }

  /// A tap on a row: what can be eaten is eaten on the spot, what cannot is
  /// thrown away.
  pressBagRow(row) {
    const entry = row.entry;
    if (!entry || !this.street) return;

    const item = entry.kind === 'loot' ? LOOT_ITEMS[entry.id] : null;

    if (item && (item.hunger || item.energy)) {
      const ok = this.street.useLoot(entry.id);

      if (ok) {
        const run = this.street.run;
        run.bag = Math.max(0, run.bag - 1);
        if (this.street.refreshBagCount) this.street.refreshBagCount();
        playSfx('eat');
      }

      haptic(ok ? 'buy' : 'refuse');
      this.refreshBackpack();
      return;
    }

    this.dropBagRow(row);
  }

  // -------------------------------------------------------------- the seasons

  /// Petals, seeds, leaves and snow, a handful at a time, drifting across the
  /// street in whatever season it is. Only decoration: nothing here touches the
  /// run, and the whole lot sits under every panel.
  buildDrift() {
    this.driftGfx = this.add.graphics().setDepth(-5);
    this.drift = [];

    for (let i = 0; i < 14; i++) {
      this.drift.push({
        x: Math.random(),
        y: Math.random(),
        vx: 0.01 + Math.random() * 0.02,
        vy: 0.04 + Math.random() * 0.05,
        size: 2 + Math.random() * 2.5,
        swing: Math.random() * Math.PI * 2
      });
    }
  }

  updateDrift(dt) {
    if (!this.driftGfx) return;

    const g = this.driftGfx;
    g.clear();

    const run = this.street && this.street.run ? this.street.run : null;
    const season = run && run.season ? run.season : 'spring';
    const w = this.w;
    const h = this.playH;

    if (!w || !h) return;

    for (const mote of this.drift) {
      mote.swing += dt;
      mote.x += mote.vx * dt + Math.sin(mote.swing) * 0.0015;
      mote.y += mote.vy * dt;

      if (mote.y > 1.02) {
        mote.y = -0.02;
        mote.x = Math.random();
      }
      if (mote.x > 1.02) mote.x = -0.02;
      if (mote.x < -0.02) mote.x = 1.02;

      const x = mote.x * w;
      const y = mote.y * h;

      if (season === 'winter') {
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(x, y, mote.size);
      } else if (season === 'autumn') {
        g.fillStyle(0xcf8a4a, 0.55);
        g.fillRect(x, y, mote.size * 1.6, mote.size);
      } else if (season === 'summer') {
        g.fillStyle(0xf2e0a0, 0.32);
        g.fillCircle(x, y, mote.size * 0.6);
      } else {
        g.fillStyle(0xe8a8bc, 0.5);
        g.fillRect(x, y, mote.size * 1.4, mote.size * 0.8);
      }
    }
  }

  // ------------------------------------------------------------- today's jobs

  buildGoals() {
    this.goalsLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.goalsBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.goalsBackdrop.on('pointerup', () => this.closeGoals());

    this.goalsGfx = this.add.graphics();

    this.goalsTitle = this.add
      .text(0, 0, "老周今天的事", {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.goalsSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.goalsCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.goalsCloseIcon = this.add.image(0, 0, 'icon-x');
    this.goalsCloseBtn.on('pointerup', () => this.closeGoals());

    this.goalsLayer.add([
      this.goalsBackdrop,
      this.goalsGfx,
      this.goalsTitle,
      this.goalsSub,
      this.goalsCloseBtn,
      this.goalsCloseIcon
    ]);

    this.goalsRows = [];

    for (let i = 0; i < 6; i++) {
      const text = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '14px',
          color: UI.cream,
          wordWrap: { width: 280 }
        })
        .setOrigin(0, 0.5);

      this.goalsLayer.add(text);
      this.goalsRows.push(text);
    }
  }

  layoutGoalsPanel() {
    const w = this.w;
    const pw = Math.min(w - 32, 340);
    const ph = 100 + this.goalsRows.length * 24 + 16;
    const px = (w - pw) / 2;
    const py = Math.max(44, (this.playH - ph) / 2);

    this.goalsBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.goalsGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.goalsTitle.setPosition(px + 18, py + 12);
    this.goalsSub.setPosition(px + 18, py + 40);
    this.goalsCloseBtn.setPosition(px + pw - 26, py + 26);
    this.goalsCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);

    this.goalsRows.forEach((row, i) => {
      row.setPosition(px + 20, py + 100 + i * 24);
    });
  }

  refreshGoalsList() {
    const run = this.street && this.street.run ? this.street.run : null;
    const goals = run && run.goals && run.goals.day === run.day ? run.goals.list : [];
    const kp = kingProgress(run);

    this.goalsSub.setText(
      goals.length
        ? `第 ${run.day} 天 · 办完有赏\n王座：好感 ${kp.supporters}/5（要 ${kp.needed}） · 存款 ${kp.money}/${kp.moneyGoal}`
        : '今天没有活'
    );

    this.goalsRows.forEach((row, i) => {
      const goal = goals[i];

      if (!goal) {
        row.setVisible(false);
        return;
      }

      row
        .setVisible(true)
        .setText(`${goal.done ? '✓' : '·'} ${goal.label}  ${goal.progress}/${goal.need}`)
        .setColor(goal.done ? '#8fb27a' : UI.cream);
    });
  }

  openGoals() {
    if (this.goalsOpen || this.overOpen || this.qte) return;

    this.goalsOpen = true;
    this.showPanel(this.goalsLayer);
    this.layoutGoalsPanel();
    this.refreshGoalsList();
    this.uiSettleAt = this.time.now + 320;
    haptic('ui');
  }

  closeGoals() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.goalsOpen) return;

    this.goalsOpen = false;
    this.hidePanel(this.goalsLayer);
    haptic('ui');
  }

  // ------------------------------------------------------------- first time in

  buildHelp() {
    this.helpLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 3).setVisible(false);

    this.helpBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.72)
      .setOrigin(0, 0)
      .setInteractive();
    this.helpBackdrop.on('pointerup', () => this.closeHelp());

    this.helpGfx = this.add.graphics();

    this.helpTitle = this.add
      .text(0, 0, '怎么在街上活着', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.helpBody = this.add
      .text(
        0,
        0,
        [
          '左半边按住拖：走路，拖得越轻走得越慢（潜行）。',
          '右半边点一下：跟最近的东西打交道——翻桶、坐下乞讨、偷、兜售。',
          '左上角时钟长按＝测试面板，右上角背包＝背包，目标卡＝今天的活。',
          '天黑前回城郊帐篷，别在街上冻着。'
        ].join('\n'),
        {
          fontFamily: FONT,
          fontSize: '14px',
          color: UI.creamDim,
          align: 'left',
          lineSpacing: 7,
          wordWrap: { width: 260 }
        }
      )
      .setOrigin(0, 0.5);

    this.helpBtn = this.add
      .rectangle(0, 0, 200, 42, 0x4a3a24, 1)
      .setStrokeStyle(2, UI.amberBright, 0.9)
      .setInteractive();
    this.helpText = this.add
      .text(0, 0, '开始', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);
    this.helpBtn.on('pointerdown', () => this.closeHelp());

    this.helpLayer.add([
      this.helpBackdrop,
      this.helpGfx,
      this.helpTitle,
      this.helpBody,
      this.helpBtn,
      this.helpText
    ]);
  }

  layoutHelp() {
    const w = this.w;
    const pw = Math.min(w - 48, 320);
    const ph = 250;
    const px = (w - pw) / 2;
    const py = Math.max(48, (this.playH - ph) / 2);

    this.helpBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.helpGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.helpTitle.setPosition(w / 2, py + 26);
    this.helpBody.setPosition(px + 22, py + 112);
    this.helpBtn.setScale((pw - 56) / 200, 1).setPosition(w / 2, py + ph - 34);
    this.helpText.setPosition(w / 2, py + ph - 34);
  }

  openHelp() {
    if (this.helpOpen) return;

    this.helpOpen = true;
    this.showPanel(this.helpLayer);
    this.layoutHelp();
    this.uiSettleAt = this.time.now + 400;
    haptic('ui');
  }

  closeHelp() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.helpOpen) return;

    this.helpOpen = false;
    this.hidePanel(this.helpLayer);
    haptic('ui');

    try {
      window.localStorage.setItem('hobosim.help.v1', '1');
    } catch (err) {
      // No storage: it will simply show again next time.
    }
  }

  // -------------------------------------------------------------- talking head

  buildDialogue() {
    this.dialogueLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 6).setVisible(false);

    this.dialogueBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.dialogueBackdrop.on('pointerdown', () => this.advanceDialogue());

    this.dialogueGfx = this.add.graphics();

    this.dialoguePortrait = this.add.image(0, 0, 'ped-suit').setOrigin(0.5, 0.5);

    this.dialogueName = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#f2c46a',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5);

    this.dialogueBody = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '15px',
        color: UI.cream,
        lineSpacing: 6,
        wordWrap: { width: 220 }
      })
      .setOrigin(0, 0);

    this.dialogueHint = this.add
      .text(0, 0, '点一下继续 ▶', { fontFamily: FONT, fontSize: '12px', color: UI.creamDim })
      .setOrigin(1, 0.5);

    this.dialogueChoiceA = this.add
      .rectangle(0, 0, 100, 34, UI.panelRow, 1)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1.5, UI.amber, 0.6)
      .setVisible(false);
    this.dialogueChoiceAText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: UI.cream })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.dialogueChoiceB = this.add
      .rectangle(0, 0, 100, 34, UI.panelRowDim, 1)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1.5, UI.amber, 0.4)
      .setVisible(false);
    this.dialogueChoiceBText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: UI.creamDim })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.dialogueChoiceA.on('pointerdown', () => this.pickDialogueOption(0));
    this.dialogueChoiceB.on('pointerdown', () => this.pickDialogueOption(1));

    this.dialogueLayer.add([
      this.dialogueBackdrop,
      this.dialogueGfx,
      this.dialoguePortrait,
      this.dialogueName,
      this.dialogueBody,
      this.dialogueHint,
      this.dialogueChoiceA,
      this.dialogueChoiceAText,
      this.dialogueChoiceB,
      this.dialogueChoiceBText
    ]);

    this.dialogueLines = [];
    this.dialogueAt = 0;
    this.dialogueDone = null;
    this.dialogueOptions = null;
  }

  /// The words of one line, folded to the width between the portrait and the
  /// edge of the panel, then the panel sized to hold them.
  setDialogueLine(value) {
    const width = Math.max(120, Math.min(this.w - 28, 360) - 132);
    this.dialogueBody.setText(foldText(value, width, 15));
    this.layoutDialogue();
  }

  layoutDialogue() {
    const w = this.w;
    const pw = Math.min(w - 28, 360);
    const px = (w - pw) / 2;

    // The width the words get, and then however tall they turn out to be: the
    // panel grows to hold the line instead of letting it run out of the box.
    const bodyW = pw - 132;
    this.dialogueBody.setWordWrapWidth(bodyW);

    const bodyH = Math.max(1, this.dialogueBody.height);
    const ph = Math.max(184, 94 + bodyH + 50);
    const py = Math.max(24, this.playH - ph - 20);

    this.dialogueBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.dialogueGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 14);
    g.lineStyle(2, UI.amber, 0.65);
    g.strokeRoundedRect(px, py, pw, ph, 14);

    // The portrait sits in its own frame, a head out of the street.
    const frameH = Math.min(140, ph - 28);
    g.fillStyle(0x11100d, 1);
    g.fillRoundedRect(px + 12, py + 14, 92, frameH, 10);
    g.lineStyle(1.5, UI.amber, 0.4);
    g.strokeRoundedRect(px + 12, py + 14, 92, frameH, 10);

    this.dialoguePortrait.setPosition(px + 58, py + 14 + frameH / 2).setScale(2.1);

    this.dialogueName.setPosition(px + 118, py + 26);
    this.dialogueBody.setPosition(px + 118, py + 44);
    this.dialogueHint.setPosition(px + pw - 14, py + ph - 14);

    const choiceW = (pw - 132 - 10) / 2;
    const choiceY = py + ph - 36;
    this.dialogueChoiceW = choiceW;

    this.dialogueChoiceA.setSize(choiceW, 46).setScale(1, 1).setPosition(px + 118, choiceY);
    this.dialogueChoiceAText.setPosition(px + 118 + choiceW / 2, choiceY);
    this.dialogueChoiceB.setSize(choiceW, 46).setScale(1, 1).setPosition(px + 128 + choiceW, choiceY);
    this.dialogueChoiceBText.setPosition(px + 128 + choiceW + choiceW / 2, choiceY);
  }

  /// Two little answers under the last line, when there is a choice to make.
  showDialogueChoices(show) {
    const options = this.dialogueOptions || [];
    const on = !!show && options.length > 0;

    this.dialogueHint.setVisible(!on);

    const pairs = [
      [this.dialogueChoiceA, this.dialogueChoiceAText, options[0]],
      [this.dialogueChoiceB, this.dialogueChoiceBText, options[1]]
    ];

    for (const [box, text, option] of pairs) {
      const visible = on && !!option;

      box.setVisible(visible);
      text.setVisible(visible);
      if (visible) {
        box.setInteractive();
        if (box.input) box.input.enabled = true;
        text.setText(option.label);
        text.setFontSize(option.label.length > 6 ? 13 : 15);
      } else if (box.input) {
        box.input.enabled = false;
      }
    }
  }

  /// An NPC speaks: portrait on the left, words on the right, tap to go on. A
  /// last line with options offers two answers instead of closing.
  showDialogue(speakerId, lines, onDone, options) {
    if (!lines || !lines.length) {
      if (onDone) onDone();
      return;
    }

    const speaker = SPEAKERS[speakerId] || { name: '路人', portrait: 'ped-suit' };

    // Whoever has been spoken to once is no longer a stranger.
    if (this.street && this.street.run) {
      this.street.run.met = this.street.run.met || {};
      this.street.run.met[speakerId] = true;
    }

    this.dialogueLines = lines.slice();
    this.dialogueAt = 0;
    this.dialogueDone = onDone || null;
    this.dialogueOptions = options && options.length ? options.slice(0, 2) : null;
    this.dialogueOpen = true;

    this.dialoguePortrait.setTexture(speaker.portrait);
    this.dialogueName.setText(speaker.name);
    this.setDialogueLine(this.dialogueLines[0]);
    this.showDialogueChoices(false);
    this.showPanel(this.dialogueLayer);
    this.releaseStick();
    this.uiSettleAt = this.time.now + 320;
    haptic('ui');
  }

  advanceDialogue() {
    if (!this.dialogueOpen) return;
    if (this.time.now < this.uiSettleAt) return;

    this.dialogueAt += 1;

    if (this.dialogueAt >= this.dialogueLines.length) {
      if (this.dialogueOptions) {
        this.showDialogueChoices(true);
        return;
      }

      this.closeDialogue();
      return;
    }

    this.setDialogueLine(this.dialogueLines[this.dialogueAt]);
    haptic('tick');
  }

  pickDialogueOption(index) {
    const option = this.dialogueOptions ? this.dialogueOptions[index] : null;
    if (!option) return;

    const done = this.dialogueDone;
    this.dialogueDone = null;

    this.closeDialogue(true);
    haptic('ui');
    this.inputLockUntil = Math.max(this.inputLockUntil, this.time.now + 260);

    if (option.onPick) option.onPick();
    else if (done) done();
  }

  closeDialogue(silent) {
    if (!this.dialogueOpen) return;

    this.dialogueOpen = false;
    this.hidePanel(this.dialogueLayer);
    this.showDialogueChoices(false);

    // The tap that answered closes the dialogue, and the same tap must not fall
    // through to the street and start the conversation all over again.
    this.uiSettleAt = Math.max(this.uiSettleAt, this.time.now + 260);
    this.inputLockUntil = Math.max(this.inputLockUntil, this.time.now + 260);

    const done = this.dialogueDone;
    this.dialogueDone = null;
    this.dialogueOptions = null;

    if (!silent && done) done();
  }

  // ------------------------------------------------------------- old Zhou's lore

  buildLore() {
    this.loreLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 5).setVisible(false);

    this.loreBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.6)
      .setOrigin(0, 0)
      .setInteractive();
    this.loreBackdrop.on('pointerup', () => this.closeLore());

    this.loreGfx = this.add.graphics();

    this.loreTitle = this.add
      .text(0, 0, '老周讲的事', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.loreSub = this.add
      .text(0, 0, '点一条，听他慢慢说', {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.creamDim
      })
      .setOrigin(0, 0);

    this.loreCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.loreCloseIcon = this.add.image(0, 0, 'icon-x');
    this.loreCloseBtn.on('pointerup', () => this.closeLore());

    this.loreLayer.add([
      this.loreBackdrop,
      this.loreGfx,
      this.loreTitle,
      this.loreSub,
      this.loreCloseBtn,
      this.loreCloseIcon
    ]);

    this.loreRows = [];

    for (let i = 0; i < 5; i++) {
      const bg = this.add
        .rectangle(0, 0, 1, 1, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const label = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: UI.cream })
        .setOrigin(0, 0.5);
      const state = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '12px', color: UI.creamDim })
        .setOrigin(1, 0.5);

      const row = { bg, label, state, topic: null };
      bg.on('pointerdown', () => this.pickLore(row));

      this.loreLayer.add([bg, label, state]);
      this.loreRows.push(row);
    }
  }

  layoutLore() {
    const w = this.w;
    const pw = Math.min(w - 32, 340);
    const ph = 80 + this.loreRows.length * 46 + 20;
    const px = (w - pw) / 2;
    const py = Math.max(48, (this.playH - ph) / 2);

    this.loreBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.loreGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.loreTitle.setPosition(px + 18, py + 12);
    this.loreSub.setPosition(px + 18, py + 40);
    this.loreCloseBtn.setPosition(px + pw - 26, py + 26);
    this.loreCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);

    const rowW = pw - 28;
    const rowX = px + 14;

    this.loreRows.forEach((row, i) => {
      const ry = py + 98 + i * 46;

      row.bg.setSize(rowW, 40).setScale(1, 1).setPosition(rowX, ry);
      row.label.setPosition(rowX + 12, ry);
      row.state.setPosition(rowX + rowW - 12, ry);
    });
  }

  refreshLore() {
    const run = this.street && this.street.run ? this.street.run : null;
    const topics = zhouLore(run);
    const seen = (run && run.lore) || {};

    this.loreRows.forEach((row, i) => {
      const topic = topics[i];

      row.topic = topic || null;
      row.bg.setVisible(!!topic);
      row.label.setVisible(!!topic);
      row.state.setVisible(!!topic);
      if (row.bg.input) row.bg.input.enabled = !!topic;
      if (!topic) return;

      row.label.setText(topic.label).setColor(seen[topic.id] ? UI.creamDim : UI.cream);
      row.state.setText(seen[topic.id] ? '听过了' : '没听过');
      row.bg.setFillStyle(seen[topic.id] ? UI.panelRowDim : UI.panelRow, 1);
    });
  }

  openLore() {
    if (this.loreOpen || this.overOpen) return;

    this.loreOpen = true;
    this.showPanel(this.loreLayer);
    this.layoutLore();
    this.refreshLore();
    this.uiSettleAt = this.time.now + 320;
    haptic('ui');
  }

  closeLore() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.loreOpen) return;

    this.loreOpen = false;
    this.hidePanel(this.loreLayer);
    haptic('ui');
  }

  pickLore(row) {
    if (!row.topic || !this.street) return;

    const topic = row.topic;
    const run = this.street.run;

    run.lore = run.lore || {};

    const fresh = !run.lore[topic.id];
    run.lore[topic.id] = true;

    // Listening to the old man is its own small kindness.
    if (fresh && this.street.addFavor) this.street.addFavor('zhou', 2);

    this.loreOpen = false;
    this.hidePanel(this.loreLayer);

    this.showDialogue('zhou', topic.lines);
  }

  // ------------------------------------------------------------ king of hobos

  buildWin() {
    this.winLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 4).setVisible(false);

    this.winBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.9)
      .setOrigin(0, 0)
      .setInteractive();

    this.winGfx = this.add.graphics();

    this.winTitle = this.add
      .text(0, 0, '流浪汉之王', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f2c46a',
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.winBody = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '15px',
        color: UI.creamDim,
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: 260 }
      })
      .setOrigin(0.5, 0);

    this.winStats = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.cream,
        align: 'center',
        lineSpacing: 5
      })
      .setOrigin(0.5, 0);

    this.winBtn = this.add
      .rectangle(0, 0, 200, 44, 0x4a3a24, 1)
      .setStrokeStyle(2, UI.amberBright, 0.9)
      .setInteractive();
    this.winBtnText = this.add
      .text(0, 0, '重新开始', {
        fontFamily: FONT,
        fontSize: '17px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);
    this.winBtn.on('pointerdown', () => this.closeWin());

    this.winLayer.add([
      this.winBackdrop,
      this.winGfx,
      this.winTitle,
      this.winBody,
      this.winStats,
      this.winBtn,
      this.winBtnText
    ]);
  }

  layoutWin() {
    const w = this.w;
    const pw = Math.min(w - 48, 320);
    const ph = 330;
    const px = (w - pw) / 2;
    const py = Math.max(52, (this.playH - ph) / 2);

    this.winBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.winGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.98);
    g.fillRoundedRect(px, py, pw, ph, 18);
    g.lineStyle(2.5, UI.amberBright, 0.85);
    g.strokeRoundedRect(px, py, pw, ph, 18);

    this.winTitle.setPosition(w / 2, py + 40);
    this.winBody.setPosition(w / 2, py + 72);
    this.winStats.setPosition(w / 2, py + 178);
    this.winBtn.setScale((pw - 56) / 200, 1).setPosition(w / 2, py + ph - 40);
    this.winBtnText.setPosition(w / 2, py + ph - 40);
  }

  /// The run has ended on top: the old man's vote, or the ten thousand.
  showWin(king) {
    if (this.winOpen || !king) return;

    const run = this.street && this.street.run ? this.street.run : null;
    const backers = run ? supporters(run) : [];

    this.winOpen = true;

    this.layoutWin();

    this.winBody.setText(
      king.how === 'election'
        ? `街上的乞丐、摊主和店家都认了你。\n老周把碗一放：以后这条街，你说了算。\n\n站在你这边的人：${backers
            .map((p) => p.name)
            .join('、')}`
        : '你把攒下的十万块拍在桌上。\n没有人再问你昨天睡在哪儿。\n\n这条街，从今天起姓你的姓。'
    );

    this.winStats.setText(
      [
        `第 ${king.day} 天登顶`,
        `身上 ${king.money} 元`,
        `支持者 ${backers.length}/5`
      ].join('\n')
    );

    this.showPanel(this.winLayer);
    haptic('jackpot');
  }

  closeWin() {
    if (!this.winOpen) return;

    this.winOpen = false;
    this.hidePanel(this.winLayer);

    this.uiSettleAt = 0;
    if (this.street) this.street.restartRun();
  }

  /// A panel coming in: a quick grow and fade, rather than a hard cut.
  showPanel(layer) {
    if (!layer) return;

    playSfx('open');
    this.tweens.killTweensOf(layer);
    layer.setVisible(true).setAlpha(0.001).setScale(0.96);

    // Whatever opens a panel — a tap on a shop, the last line of a dialogue, a
    // row in another panel — the thumb lifting from that same tap must not land
    // on the new backdrop and close it again. A moment of quiet after the panel
    // arrives, long enough for even a slow tap to have let go: one flick is all
    // it takes for a page to flash open and shut.
    this.uiSettleAt = Math.max(this.uiSettleAt, this.time.now + 420);

    this.tweens.add({
      targets: layer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Quad.easeOut'
    });

    this.setLayerInput(layer, true);
  }

  hidePanel(layer) {
    if (!layer) return;

    playSfx('close');
    this.tweens.killTweensOf(layer);
    this.setLayerInput(layer, false);

    this.tweens.add({
      targets: layer,
      alpha: 0,
      scaleX: 0.97,
      scaleY: 0.97,
      duration: 110,
      ease: 'Quad.easeIn',
      onComplete: () => layer.setVisible(false)
    });
  }

  startQte(zone) {
    if (this.qte) return;

    this.qte = {
      t: 0,
      dir: 1,
      zoneStart: zone.zoneStart,
      zoneWidth: zone.zoneWidth,
      perfectStart: zone.perfectStart || 0,
      perfectWidth: zone.perfectWidth || 0,
      speed: zone.speed,
      timeLeft: 3.4
    };

    const asItem = zone.mode === 'item';
    this.qteTitle.setText(asItem ? '顺口袋' : '摸钱袋');

    if (this.qte.perfectWidth > 0) {
      this.qteTip.setText('金色区：收益翻倍，且绝不惊动人');
    } else if (asItem) {
      this.qteTip.setText('绿区更宽，但被抓住手腕更麻烦');
    } else {
      this.qteTip.setText('滑块进绿区时点击');
    }

    this.qteLayer.setVisible(true);
    this.setLayerInput(this.qteLayer, true);
    this.releaseStick();
    this.layoutQte();
    this.drawQte();
    haptic('ui');
  }

  updateQte(dt) {
    const q = this.qte;
    if (!q) return;

    q.t += q.dir * q.speed * dt;
    if (q.t >= 1) {
      q.t = 1;
      q.dir = -1;
    } else if (q.t <= 0) {
      q.t = 0;
      q.dir = 1;
    }

    q.timeLeft -= dt;
    if (q.timeLeft <= 0) {
      this.resolveQte();
      return;
    }

    this.drawQte();
  }

  drawQte() {
    const q = this.qte;
    if (!q || !this.qteRect) return;

    const r = this.qteRect;
    const g = this.qteGfx;
    g.clear();

    g.fillStyle(0x1d1812, 0.97);
    g.fillRoundedRect(r.x, r.y, r.w, r.h, 14);
    g.lineStyle(2, UI.amber, 0.7);
    g.strokeRoundedRect(r.x, r.y, r.w, r.h, 14);

    const tx = r.x + 18;
    const ty = r.y + 66;
    const tw = r.w - 36;
    const th = 14;

    g.fillStyle(0x0f0c09, 1);
    g.fillRoundedRect(tx, ty, tw, th, 7);

    g.fillStyle(0x7dbb5a, 0.92);
    g.fillRoundedRect(tx + tw * q.zoneStart, ty, tw * q.zoneWidth, th, 6);

    if (q.perfectWidth > 0) {
      g.fillStyle(0xf2c46a, 0.95);
      g.fillRoundedRect(tx + tw * q.perfectStart, ty, tw * q.perfectWidth, th, 6);
    }

    const mx = tx + tw * q.t;
    g.fillStyle(0xf2c46a, 1);
    g.fillRect(mx - 2, ty - 8, 4, th + 16);
  }

  resolveQte() {
    const q = this.qte;
    if (!q) return;

    // Ignore a stray tap from the press that opened the panel.
    if (q.timeLeft > 3.15) return;

    let result = 'miss';

    if (q.t >= q.zoneStart && q.t <= q.zoneStart + q.zoneWidth) {
      result = 'good';

      if (
        q.perfectWidth > 0 &&
        q.t >= q.perfectStart &&
        q.t <= q.perfectStart + q.perfectWidth
      ) {
        result = 'perfect';
      }
    }

    this.qte = null;
    this.qteLayer.setVisible(false);
    this.setLayerInput(this.qteLayer, false);

    if (this.street && this.street.resolveSteal) this.street.resolveSteal(result);
  }

  buildOverlay() {
    this.overLayer = this.add.container(0, 0).setDepth(DEPTH.overlay).setVisible(false);

    this.overBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0a0805, 0.82)
      .setOrigin(0, 0)
      .setInteractive();

    this.overPanelGfx = this.add.graphics();

    this.overTitle = this.add
      .text(0, 0, '你饿晕了', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#f4e9d4',
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.overSub = this.add
      .text(0, 0, '街上没人理会你。', {
        fontFamily: FONT,
        fontSize: '15px',
        color: UI.creamDim
      })
      .setOrigin(0.5, 0.5);

    this.overStats = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '14px',
        color: UI.cream,
        align: 'center',
        lineSpacing: 2
      })
      .setOrigin(0.5, 0);

    this.restartBtn = this.add
      .rectangle(0, 0, 200, 44, 0x4a3a24, 1)
      .setStrokeStyle(2, UI.amberBright, 0.9)
      .setInteractive();
    this.restartIcon = this.add.image(0, 0, 'icon-rotate-ccw');
    this.restartText = this.add
      .text(0, 0, '重新开始', {
        fontFamily: FONT,
        fontSize: '17px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.restartBtn.on('pointerdown', () => this.restartRun());

    this.overLayer.add([
      this.overBackdrop,
      this.overPanelGfx,
      this.overTitle,
      this.overSub,
      this.overStats,
      this.restartBtn,
      this.restartIcon,
      this.restartText
    ]);
  }

  // ------------------------------------------------------------------- layout

  layout(width, height) {
    if (!width || !height) return;

    const { bandH, playH } = layoutFor(width, height);
    this.w = width;
    this.h = height;
    this.bandH = bandH;
    this.playH = playH;

    this.drawBand();
    this.layoutHud();
    this.layoutControls();
    this.layoutStore();
    this.layoutTrade();
    if (this.craftOpen) this.layoutCraft();
    if (this.homeOpen) this.layoutHome();
    if (this.vendingOpen) this.layoutVending();
    if (this.slotOpen) this.layoutSlot();
    if (this.mapOpen) this.refreshMap();
    if (this.qte) this.layoutQte();
    if (this.stealChoiceOpen) this.layoutStealChoice();
    if (this.peddleOpen) this.layoutPeddle();
    if (this.testerOpen) this.layoutTester();
    if (this.begOpen) this.layoutBegChoice();
    if (this.bagOpen) this.layoutBackpack();
    if (this.goalsOpen) this.layoutGoalsPanel();
    if (this.helpOpen) this.layoutHelp();
    if (this.winOpen) this.layoutWin();
    if (this.dialogueOpen) this.layoutDialogue();
    if (this.loreOpen) this.layoutLore();
    this.layoutOverlay();
  }

  drawBand() {
    const g = this.bandGfx;
    const w = this.w;
    const playH = this.playH;
    const bandH = this.bandH;

    g.clear();

    // The band is the pavement continuing under the controls, not a browser
    // widget bolted on underneath.
    g.fillStyle(UI.band, 1);
    g.fillRect(0, playH, w, bandH);

    g.fillStyle(UI.kerb, 1);
    g.fillRect(0, playH, w, 7);
    g.fillStyle(0x17130f, 1);
    g.fillRect(0, playH + 7, w, 3);

    g.fillStyle(0x241f18, 1);
    for (let x = 0; x < w; x += 84) {
      g.fillRect(x, playH + 10, 2, bandH - 10);
    }

    for (let i = 0; i < 26; i++) {
      const x = Math.floor(w * ((i * 0.137) % 1));
      const y = playH + 18 + Math.floor((bandH - 32) * (((i * 0.061) % 1)));
      g.fillStyle(i % 3 === 0 ? 0x352f26 : 0x211d17, 0.7);
      g.fillRect(x, y, 4, 4);
    }
  }

  layoutHud() {
    const w = this.w;
    const playH = this.playH;

    const g = this.chipGfx;
    g.clear();

    g.fillStyle(0x1a1611, 0.86);
    g.fillRoundedRect(12, 16, 192, 34, 10);
    g.fillRoundedRect(12, 58, 118, 34, 10);
    g.fillRoundedRect(w - 104, 58, 92, 34, 10);
    g.fillRoundedRect(12, 100, 154, 28, 8);
    g.fillRoundedRect(12, 134, 154, 28, 8);

    const iconScale = 26 / 96;

    this.coinIcon.setPosition(30, 75).setScale(iconScale);
    this.moneyText.setPosition(48, 75);

    this.bagIcon.setPosition(w - 82, 75).setScale(iconScale);
    this.bagText.setPosition(w - 22, 75);

    this.hungerIcon.setPosition(30, 114).setScale(22 / 96);

    const barX = 46;
    const barW = 108;
    this.barScale = barW / 118;

    this.hungerTrack.setPosition(barX, 114).setScale(this.barScale, 1);
    this.hungerFill.setPosition(barX, 114).setScale(this.barScale, 1);

    this.energyIcon.setPosition(30, 148).setScale(22 / 96);
    this.energyTrack.setPosition(barX, 148).setScale(this.barScale, 1);
    this.energyFill.setPosition(barX, 148).setScale(this.barScale, 1);

    this.layoutGoals();

    this.hintText.setPosition(w / 2, playH - 16);

    this.mapBtn.setPosition(w - 34, 33);
    this.mapIcon.setPosition(w - 34, 33);
    this.districtText.setPosition(w / 2, 75);
    this.clockText.setPosition(24, 33);
    this.wantedText.setPosition(w - 34, 104);
    this.bagBtn.setPosition(w - 104, 75);

    if (this.goalBtn) {
      this.goalBtn
        .setPosition(this.goalPanel.x, this.goalPanel.y + 27)
        .setScale(this.goalPanel.w / 236, 1)
        .setVisible(this.goalRowCount > 0);
    }

    // The list takes the space under the chips, so the hints that float in the
    // middle of the screen move below it.
    this.layoutFloaters(w, playH);
  }

  /// Hints that float over the street sit below Old Zhou's card, so the day's
  /// list never covers them.
  layoutFloaters(w, playH) {
    const below = this.goalBottom + 18;

    this.edgeText.setPosition(w / 2, Math.max(178, below));
    this.toastText.setWordWrapWidth(Math.max(160, w - 48));
    this.toastText.setPosition(w / 2, Math.max(playH * 0.28, below + 36));
  }

  /// The goal card: one line for the job in hand, with a thin bar under it. It
  /// stays small on purpose — it sits over the street, and the street has to
  /// stay readable, shops and all.
  layoutGoals() {
    const x = 12;
    const y = 172;
    const w = Math.min(this.w - 24, 236);
    const rows = this.goalRowCount;
    const h = rows > 0 ? 54 : 0;

    this.goalPanel = { x, y, w, h };
    this.goalBottom = h > 0 ? y + h : 0;

    const g = this.goalGfx;
    g.clear();

    if (!rows) {
      this.goalIcon.setVisible(false);
      this.goalTitle.setVisible(false);
      this.goalCount.setVisible(false);
      this.goalTrack.setVisible(false);
      this.goalFill.setVisible(false);
      this.goalRows.forEach((row) => row.setVisible(false));
      if (this.goalBtn) this.goalBtn.setVisible(false);
      return;
    }

    if (this.goalBtn) {
      this.goalBtn
        .setVisible(true)
        .setPosition(x, y + 27)
        .setScale(w / 236, 1);
    }

    g.fillStyle(0x1a1611, 0.8);
    g.fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(1, UI.amber, 0.28);
    g.strokeRoundedRect(x, y, w, h, 10);

    this.goalIcon.setVisible(true).setPosition(x + 17, y + 15).setScale(14 / 96);
    this.goalTitle.setVisible(true).setPosition(x + 28, y + 15);
    this.goalCount.setVisible(true).setPosition(x + w - 10, y + 15);

    this.goalRows.forEach((row, i) => {
      if (i >= rows) {
        row.setVisible(false);
        return;
      }

      row.setPosition(x + 14, y + 36);
    });

    const barW = w - 22;
    this.goalBarW = barW;
    this.goalTrack.setVisible(true).setPosition(x + 11, y + h - 8).setScale(barW / 100, 1);
    this.goalFill.setPosition(x + 11, y + h - 8);
  }

  goalsSignature(run) {
    if (!run || !run.goals || run.goals.day !== run.day) {
      return `none#${run ? run.day : 0}`;
    }

    return `${run.day}|${run.goals.list
      .map((goal) => `${goal.kind}${goal.progress}/${goal.need}${goal.done ? 'd' : ''}`)
      .join(',')}`;
  }

  refreshGoals() {
    const run = this.street && this.street.run ? this.street.run : null;
    const goals = run && run.goals && run.goals.day === run.day ? run.goals.list : [];

    this.shown.goals = this.goalsSignature(run);

    if (!goals.length) {
      this.goalRowCount = 0;
      this.layoutGoals();
      return;
    }

    const doneCount = goals.filter((goal) => goal.done).length;
    const active = goals.find((goal) => !goal.done) || goals[goals.length - 1];

    this.goalRowCount = 1;
    this.goalTitle.setText(`老周 · 第 ${run.day} 天`);
    this.goalCount.setText(`${doneCount}/${goals.length}`);

    this.goalRows.forEach((row, i) => {
      if (i > 0) {
        row.setVisible(false);
        return;
      }

      row
        .setVisible(true)
        .setText(`${active.label}  ${active.progress}/${active.need}`)
        .setColor(active.done ? '#8fb27a' : UI.cream);
    });

    this.layoutGoals();

    const barW = this.goalBarW || 0;
    const frac = active.done ? 1 : Math.max(0.03, active.progress / active.need);

    this.goalFill.setVisible(true).setScale(Math.max(0.02, (barW * frac) / 100), 1);
    this.goalFill.fillColor = active.done ? UI.good : UI.amberBright;

    if (this.w) this.layoutFloaters(this.w, this.playH);
  }

  layoutControls() {
    this.releaseStick();
    if (this.edgeFlash) this.edgeFlash.setSize(this.w, this.h).setPosition(0, 0);

    if (this.actionBtn) {
      const ax = this.w - ACTION_RADIUS - 16;
      const ay = this.h - ACTION_RADIUS - 64;

      this.actionBtn.setPosition(ax, ay);
      this.actionIcon.setPosition(ax, ay);
    }
  }

  /// Icons come from two places — 96px Lucide symbols and the small pixel
  /// sprites drawn for items — so each is scaled to the same height.
  fitIcon(image, size) {
    const height = image.height || size;
    image.setScale(size / Math.max(1, height));
    return image;
  }

  /// A list line, folded to the width it has rather than trusted to wrap.
  fitRow(text, value, width, size) {
    text.setText(foldText(value, width, size || 12));
  }

  /// Panels live inside containers, and a hidden container's children can still
  /// answer taps, so their input is switched off with the panel.
  setLayerInput(layer, enabled) {
    layer.list.forEach((child) => {
      if (child.input) child.input.enabled = enabled && child.visible !== false;
    });
  }

  layoutStore() {
    const w = this.w;
    const shop = SHOPS.find((s) => s.id === this.storeId);
    const tabs = !!(shop && shop.buyBack);

    this.storeTabShown = tabs;

    const count = Math.max(1, this.storeEntries.length);
    const rowH = ROW_HEIGHT;
    const gap = 8;
    const headH = tabs ? 104 : 56;
    const pw = Math.min(w - 32, ROW_WIDTH + 24);
    const ph = headH + count * (rowH + gap) + 20;
    const px = (w - pw) / 2;
    const py = Math.max(48, (this.playH - ph) / 2);

    this.storeBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.storePanelGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.storeTitle.setPosition(px + 18, py + 14);
    this.storeSub.setFontSize(12).setWordWrapWidth(pw - 100).setPosition(px + 18, py + 38);

    this.storeCloseBtn.setPosition(px + pw - 26, py + 26);
    this.storeCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);

    this.storeTabBuy.bg
      .setVisible(tabs)
      .setPosition(px + 50, py + 80)
      .setFillStyle(this.storeMode === 'buy' ? 0x4a3a24 : UI.panelRowDim, 1);
    this.storeTabBuy.text.setVisible(tabs).setPosition(px + 50, py + 80);
    this.storeTabSell.bg
      .setVisible(tabs)
      .setPosition(px + 124, py + 80)
      .setFillStyle(this.storeMode === 'sell' ? 0x4a3a24 : UI.panelRowDim, 1);
    this.storeTabSell.text.setVisible(tabs).setPosition(px + 124, py + 80);

    const rowW = pw - 24;
    const rowX = px + 12;
    const rowScale = rowW / ROW_WIDTH;
    this.storeInfoW = rowW - 150;

    this.storeRows.forEach((row, i) => {
      const ry = py + headH + rowH / 2 + i * (rowH + gap);

      row.bg.setScale(rowScale, 1).setPosition(rowX, ry);
      this.fitIcon(row.icon, 24).setPosition(rowX + 26, ry);
      row.name.setPosition(rowX + 48, ry - 12);
      row.info.setWordWrapWidth(rowW - 150).setPosition(rowX + 48, ry + 8);
      row.price.setPosition(rowX + rowW - 12, ry);
    });
  }

  setStoreMode(mode) {
    if (!this.shopOpen || this.storeMode === mode) return;

    this.storeMode = mode;
    this.shown.storeSig = null;
    playSfx('page');
    haptic('ui');
    this.layoutStore();
    this.refreshStore();
  }

  layoutTrade() {
    const w = this.w;
    const count = this.tradeEntryList().length;
    const gap = 6;
    const pw = Math.min(w - 32, TRADE_ROW_WIDTH + 24);
    const ph = 46 + count * (TRADE_ROW_HEIGHT + gap) + 62;
    const px = (w - pw) / 2;
    const py = Math.max(44, (this.playH - ph) / 2);

    this.tradeBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.tradePanelGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.tradeTitle.setPosition(px + 18, py + 13);
    this.tradeSub.setPosition(px + 18, py + 32);

    this.tradeCloseBtn.setPosition(px + pw - 26, py + 24);
    this.tradeCloseIcon.setPosition(px + pw - 26, py + 24).setScale(22 / 96);

    const rowW = pw - 24;
    const rowX = px + 12;
    const rowScale = rowW / TRADE_ROW_WIDTH;

    this.tradeRows.forEach((row, i) => {
      const ry = py + 46 + TRADE_ROW_HEIGHT / 2 + i * (TRADE_ROW_HEIGHT + gap);

      row.bg.setScale(rowScale, 1).setPosition(rowX, ry);
      row.icon.setPosition(rowX + 26, ry);
      row.name.setPosition(rowX + 50, ry - 11);
      row.info.setPosition(rowX + 50, ry + 13);
      row.price.setPosition(rowX + rowW - 12, ry);
      row.useBtn.setPosition(rowX + rowW - 96, ry);
      row.useText.setPosition(rowX + rowW - 96, ry);
    });

    const btnW = pw - 56;
    const btnY = py + ph - 32;
    this.sellAllBtn.setScale(btnW / 200, 1).setPosition(w / 2, btnY);
    this.sellAllText.setPosition(w / 2, btnY);
  }

  layoutOverlay() {
    const w = this.w;
    const pw = Math.min(w - 48, 300);
    const ph = 300;
    const px = (w - pw) / 2;
    const py = Math.max(60, (this.playH - ph) / 2);

    this.overBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.overPanelGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.98);
    g.fillRoundedRect(px, py, pw, ph, 18);
    g.lineStyle(2, UI.amber, 0.55);
    g.strokeRoundedRect(px, py, pw, ph, 18);

    this.overTitle.setPosition(w / 2, py + 34);
    this.overSub.setPosition(w / 2, py + 64);
    this.overStats.setPosition(w / 2, py + 92);

    const btnY = py + ph - 38;
    const btnW = pw - 56;
    this.restartBtn.setScale(btnW / 200, 1).setPosition(w / 2, btnY);
    this.restartIcon.setPosition(w / 2 - 46, btnY).setScale(22 / 96);
    this.restartText.setPosition(w / 2 + 12, btnY);
  }

  // -------------------------------------------------------------------- input

  onPointerDown(pointer) {
    // A tap that belongs to a button, or that just closed a panel, must not
    // also fall through into the world.
    if (this.time.now < this.inputLockUntil) return;

    if (
      this.shopOpen ||
      this.overOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte ||
      this.stealChoiceOpen ||
      this.peddleOpen ||
      this.testerOpen ||
      this.begOpen ||
      this.bagOpen ||
      this.goalsOpen ||
      this.helpOpen ||
      this.winOpen ||
      this.dialogueOpen ||
      this.loreOpen
    )
      return;
    // Left half: a thumb summons the movement plate. Right half: a tap does
    // whatever is within reach.
    if (pointer.x < this.w / 2) {
      if (this.stickId !== null) return;
      this.stickId = pointer.id;
      this.grabStick(pointer);
      return;
    }

    this.tapInteract(pointer);
  }

  /// Puts the plate and the knob under the thumb and pops them in.
  grabStick(pointer) {
    this.stickOrigin = { x: pointer.x, y: pointer.y };

    this.tweens.killTweensOf([this.stickBase, this.stickKnob]);

    this.stickBase
      .setPosition(pointer.x, pointer.y)
      .setVisible(true)
      .setAlpha(0.9)
      .setScale(0.6);
    this.stickKnob.setPosition(pointer.x, pointer.y).setVisible(true).setScale(0.6);

    this.tweens.add({
      targets: this.stickBase,
      scaleX: 1,
      scaleY: 1,
      duration: 170,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: this.stickKnob,
      scaleX: 1,
      scaleY: 1,
      duration: 170,
      ease: 'Back.easeOut'
    });

    haptic('tick');
  }

  onPointerMove(pointer) {
    if (pointer.id !== this.stickId) return;
    this.updateStick(pointer);
  }

  onPointerUp(pointer) {
    if (pointer.id !== this.stickId) return;
    this.releaseStick();
  }

  updateStick(pointer) {
    if (!this.stickOrigin) return;

    const bx = this.stickOrigin.x;
    const by = this.stickOrigin.y;
    const limit = STICK_THROW;

    let dx = pointer.x - bx;
    let dy = pointer.y - by;
    const len = Math.hypot(dx, dy);

    if (len > limit) {
      dx = (dx / len) * limit;
      dy = (dy / len) * limit;
    }

    this.stickKnob.setPosition(bx + dx, by + dy);

    const dead = 0.18;
    const nx = dx / limit;
    const ny = dy / limit;
    const ax = Math.abs(nx) < dead ? 0 : (nx - Math.sign(nx) * dead) / (1 - dead);
    const ay = Math.abs(ny) < dead ? 0 : (ny - Math.sign(ny) * dead) / (1 - dead);

    if (this.street) this.street.setAxes(ax, ay);
  }

  releaseStick() {
    this.stickId = null;
    this.stickOrigin = null;

    if (this.stickBase) {
      this.tweens.killTweensOf([this.stickBase, this.stickKnob]);
      this.stickBase.setVisible(false);
      this.stickKnob.setVisible(false);
    }

    if (this.street) this.street.setAxes(0, 0);
  }

  /// A tap on the right half does whatever is within reach: the bin, the stall,
  /// the tent door — or a wallet, if that is what is closest.
  tapInteract(pointer) {
    if (
      this.overOpen ||
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte ||
      this.stealChoiceOpen ||
      this.peddleOpen ||
      this.testerOpen ||
      this.begOpen ||
      this.bagOpen ||
      this.goalsOpen ||
      this.helpOpen ||
      this.winOpen ||
      this.dialogueOpen ||
      this.loreOpen
    )
      return;

    if (!this.street) return;

    // A panel opened by this tap must not be closed by the finger lifting.
    this.uiSettleAt = this.time.now + 280;

    // The little map button in the corner belongs to itself.
    if (
      this.mapBtn &&
      Math.hypot(pointer.x - this.mapBtn.x, pointer.y - this.mapBtn.y) < 26
    )
      return;

    const reachable =
      this.street.nearest ||
      this.street.benchSpot ||
      (this.street.run && this.street.run.sitting);

    if (!reachable && !this.street.stealTarget && !this.street.peddleTarget) {
      haptic('refuse');
      return;
    }

    this.tapFlash(pointer.x, pointer.y);

    if (!this.street.nearest && (this.street.stealTarget || this.street.peddleTarget)) {
      this.openStealChoice();
      return;
    }

    this.flashEdges();
    haptic('ui');
    this.street.tryInteract();
  }

  /// A white ring where the tap landed.
  tapFlash(x, y) {    const ring = this.add
      .circle(x, y, 18, 0xffffff, 0.12)
      .setStrokeStyle(2.5, 0xffffff, 0.9)
      .setDepth(DEPTH.hud + 2);

    this.tweens.add({
      targets: ring,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  /// A brief flash round the screen: the tap took effect.
  flashEdges() {
    if (!this.edgeFlash) return;

    this.tweens.killTweensOf(this.edgeFlash);
    this.edgeFlash.setAlpha(0.85).setVisible(true);

    this.tweens.add({
      targets: this.edgeFlash,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => this.edgeFlash.setVisible(false)
    });
  }

  anyPanelOpen() {
    return !!(
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.stealChoiceOpen
    );
  }

  /// The one corner button: close what is open, or act on what is in reach.
  pressAction() {
    if (this.qte || this.overOpen) return;

    this.inputLockUntil = this.time.now + 220;

    this.actionBtn.setFillStyle(0x4a3a24, 0.95).setStrokeStyle(2, UI.amberBright, 0.95);
    this.actionIcon.setAlpha(1);

    this.tweens.killTweensOf(this.actionBtn);
    this.tweens.add({
      targets: this.actionBtn,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    this.time.delayedCall(180, () => this.restoreActionBtn());

    if (this.dialogueOpen) {
      this.advanceDialogue();
      return;
    }

    if (this.stealChoiceOpen) {
      this.closeStealChoice();
      return;
    }

    if (this.peddleOpen) {
      this.closePeddle();
      return;
    }

    if (this.testerOpen) {
      this.closeTester();
      return;
    }

    if (this.begOpen) {
      this.closeBegChoice();
      return;
    }

    if (this.bagOpen) {
      this.closeBackpack();
      return;
    }

    if (this.goalsOpen) {
      this.closeGoals();
      return;
    }

    if (this.helpOpen) {
      this.closeHelp();
      return;
    }

    if (this.winOpen) {
      this.closeWin();
      return;
    }

    if (this.mapOpen) {
      this.closeMap();
      return;
    }

    if (this.shopOpen) {
      this.closeStore();
      return;
    }

    if (this.tradeOpen) {
      this.closeTrade();
      return;
    }

    if (this.craftOpen) {
      this.closeCraft();
      return;
    }

    if (this.homeOpen) {
      this.closeHome();
      return;
    }

    if (this.vendingOpen) {
      this.closeVending();
      return;
    }

    if (this.slotOpen) {
      this.closeSlot();
      return;
    }

    this.tapInteract({ x: this.actionBtn.x, y: this.actionBtn.y });
  }

  restoreActionBtn() {
    if (!this.actionBtn) return;

    const open = this.anyPanelOpen();

    this.actionBtn
      .setFillStyle(0x1a1611, open ? 0.26 : 0.18)
      .setStrokeStyle(2, UI.amber, open ? 0.45 : 0.3);
    this.actionIcon.setAlpha(open ? 0.6 : 0.4);
  }

  // --------------------------------------------------------------------- shop

  openStore(id) {
    const talk = shopTalk(id, this.street && this.street.run);

    if (talk && talk.lines && talk.lines.length) {
      this.showDialogue(talk.speaker, talk.lines, () => this.reallyOpenStore(id), [
        { label: '看看货', onPick: () => this.reallyOpenStore(id) },
        { label: '不买了' }
      ]);
      return;
    }

    this.reallyOpenStore(id);
  }

  reallyOpenStore(id) {
    if (
      this.overOpen ||
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte
    )
      return;

    const shop = SHOPS.find((s) => s.id === id);
    if (!shop) return;

    this.storeId = id;
    this.shopOpen = true;
    this.storeMode = 'buy';
    playSfx('bell');
    this.showPanel(this.storeLayer);
    this.releaseStick();
    this.shown.storeSig = null;
    this.layoutStore();
    this.refreshStore();
    haptic('ui');
  }

  closeStore() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.shopOpen) return;
    this.shopOpen = false;
    this.storeLayer.setVisible(false);
    this.setLayerInput(this.storeLayer, false);
    haptic('ui');
  }

  // --------------------------------------------------------------- the stalls

  tradeEntryList() {
    const run = this.street && this.street.run ? this.street.run : null;
    const entries = [];
    const atPawn = this.tradeMode === 'pawn';

    // The stall only weighs rubbish. The pawn takes what is worth money — what
    // came out of somebody's pocket, what was made at the bench — and lends its
    // counter to a few tools.
    if (atPawn) {
      for (const tool of TOOLS) entries.push({ kind: 'tool', id: tool.id });

      for (const id of LOOT_ORDER) {
        if (run && (run.loot[id] || 0) > 0) entries.push({ kind: 'loot', id });
      }

      if (run) {
        for (const rec of RECIPES) {
          if ((run.goods[rec.id] || 0) > 0) entries.push({ kind: 'good', id: rec.id });
        }
      }
    }

    // Only what is actually in the bag: every district drops its own litter, so
    // the full list would never fit the panel.
    for (const id of JUNK_ORDER) {
      if (run && (run.items[id] || 0) > 0) entries.push({ kind: 'junk', id });
    }

    return entries.slice(0, TRADE_MAX_ROWS);
  }

  openTrade(mode) {
    const talk = tradeTalk(mode, this.street && this.street.run);

    if (talk && talk.lines && talk.lines.length) {
      this.showDialogue(talk.speaker, talk.lines, () => this.reallyOpenTrade(mode), [
        { label: '出货', onPick: () => this.reallyOpenTrade(mode) },
        { label: '算了' }
      ]);
      return;
    }

    this.reallyOpenTrade(mode);
  }

  reallyOpenTrade(mode) {
    if (
      this.overOpen ||
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte
    )
      return;

    this.tradeOpen = true;
    this.tradeMode = mode === 'pawn' ? 'pawn' : 'stall';
    this.showPanel(this.tradeLayer);
    this.releaseStick();
    this.shown.tradeSig = null;
    this.layoutTrade();
    this.refreshTrade();
    haptic('ui');
  }

  closeTrade() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.tradeOpen) return;
    this.tradeOpen = false;
    this.hidePanel(this.tradeLayer);
    haptic('ui');
  }

  // ------------------------------------------------------------- the city map

  // ---------------------------------------------------------------- the bench

  buildCraft() {
    this.craftLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.craftBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.craftBackdrop.on('pointerup', () => this.closeCraft());

    this.craftPanelGfx = this.add.graphics();

    this.craftTitle = this.add
      .text(0, 0, '工作台 · 合成', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.craftSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.craftCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.craftCloseIcon = this.add.image(0, 0, 'icon-x');
    this.craftCloseBtn.on('pointerup', () => this.closeCraft());

    this.craftHint = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0.5, 0.5);

    this.craftLayer.add([
      this.craftBackdrop,
      this.craftPanelGfx,
      this.craftTitle,
      this.craftSub,
      this.craftCloseBtn,
      this.craftCloseIcon,
      this.craftHint
    ]);

    this.craftRows = RECIPES.concat(FURNITURE_RECIPES).map((rec) => {
      const bg = this.add
        .rectangle(0, 0, ROW_WIDTH, CRAFT_ROW_HEIGHT, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(0, 0, rec.tex);
      const name = this.add
        .text(0, 0, rec.name, { fontFamily: FONT, fontSize: '15px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '11px',
          color: UI.creamDim,
          lineSpacing: 2
        })
        .setOrigin(0, 0);
      const value = this.add
        .text(0, 0, rec.furniture ? '放进帐篷' : `${rec.value} 元`, {
          fontFamily: FONT,
          fontSize: '16px',
          color: UI.gold,
          fontStyle: 'bold'
        })
        .setOrigin(1, 0.5);
      const state = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
        .setOrigin(1, 0.5);

      bg.on('pointerdown', () => this.craftRecipe(rec));
      this.craftLayer.add([bg, icon, name, info, value, state]);

      return { bg, icon, name, info, value, state, rec };
    });
  }

  layoutCraft() {
    const w = this.w;
    const count = this.craftRows.length;
    const gap = 4;
    const pw = Math.min(w - 32, ROW_WIDTH + 24);
    const ph = 60 + count * (CRAFT_ROW_HEIGHT + gap) + 22;
    const px = (w - pw) / 2;
    const py = Math.max(40, (this.playH - ph) / 2);

    this.craftBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.craftPanelGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.craftTitle.setPosition(px + 18, py + 14);
    this.craftSub.setPosition(px + 18, py + 34);
    this.craftCloseBtn.setPosition(px + pw - 26, py + 26);
    this.craftCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);
    this.craftHint.setPosition(w / 2, py + ph - 14);

    const rowW = pw - 24;
    const rowX = px + 12;
    const rowScale = rowW / ROW_WIDTH;
    this.craftInfoW = rowW - 150;

    this.craftRows.forEach((row, i) => {
      const ry = py + 60 + CRAFT_ROW_HEIGHT / 2 + i * (CRAFT_ROW_HEIGHT + gap);

      row.bg.setScale(rowScale, 1).setPosition(rowX, ry);
      this.fitIcon(row.icon, 26).setPosition(rowX + 26, ry);
      row.name.setPosition(rowX + 48, ry - 14);
      row.info.setPosition(rowX + 48, ry - 1);
      row.value.setPosition(rowX + rowW - 12, ry - 14);
      row.state.setPosition(rowX + rowW - 12, ry + 9);
    });
  }

  openCraft() {
    if (
      this.overOpen ||
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte
    )
      return;

    this.craftOpen = true;
    this.showPanel(this.craftLayer);
    this.releaseStick();
    this.shown.craftSig = null;
    this.layoutCraft();
    this.refreshCraft();
    haptic('ui');
  }

  closeCraft() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.craftOpen) return;
    this.craftOpen = false;
    this.hidePanel(this.craftLayer);
    haptic('ui');
  }

  refreshCraft() {
    const run = this.street && this.street.run ? this.street.run : null;

    if (run) {
      const held = JUNK_ORDER.filter((id) => (run.items[id] || 0) > 0)
        .map((id) => `${JUNK_ITEMS[id].name} ${run.items[id]}`)
        .join(' · ');

      this.craftSub.setFontSize(12);
      const subW = Math.min(this.w - 32, ROW_WIDTH + 24) - 44;
      const held1 = foldText(held || '包里没有废品', subW, 12).split('\n')[0];
      this.craftSub.setText(held && held1.length < held.length ? `${held1}…` : held1);
      this.shown.craftSig = `${run.bag}|${Object.values(run.goods).join(',')}|${
        Object.keys(run.blueprints).length
      }`;
    }

    for (const row of this.craftRows) {
      const rec = row.rec;
      const locked = rec.blueprint && !(run && run.blueprints[rec.id]);

      // Furniture that is already standing in the tent only needs mending once
      // it has worn through, and that costs its repair list, not a new build.
      let needList = rec.need;
      let mending = false;

      if (rec.furniture) {
        const built = furnitureById(rec.furniture);
        const piece =
          built && this.street && this.street.homePiece
            ? this.street.homePiece(built.slot)
            : null;

        if (piece && piece.item.id === rec.furniture) {
          if (!piece.broken) {
            row.state.setText('已摆好').setColor('#8a8070');
            row.bg.setFillStyle(UI.panelRowDim, 0.8);
            row.value.setColor('#8a7a55');
            return;
          }

          needList = built.repair || { cardboard: 2 };
          mending = true;
        }
      }

      const enough =
        !!run && Object.keys(needList).every((id) => amountOf(run, id) >= needList[id]);

      const needs = Object.keys(needList)
        .map((id) => `${materialLabel(id)} ${run ? amountOf(run, id) : 0}/${needList[id]}`)
        .join(' · ');

      this.fitRow(row.info, needs, this.craftInfoW || 150, 11);
      row.info.setColor(enough ? UI.creamDim : '#8a7a66');
      row.name.setColor(locked ? '#8a8070' : UI.cream);

      if (locked) {
        row.state.setText('需要图纸').setColor('#b0705e');
      } else if (enough) {
        row.state.setText(mending ? '可修理' : '可合成').setColor('#8fd07a');
      } else {
        row.state.setText('材料不足').setColor('#8a8070');
      }

      row.bg.setFillStyle(locked ? UI.panelRowDim : UI.panelRow, locked ? 0.7 : 1);
      row.value.setColor(locked ? '#8a7a55' : UI.gold);
    }
  }

  craftRecipe(rec) {
    if (!this.street) return;

    const result = this.street.craft(rec.id);

    if (result === 'ok') {
      haptic('craft');
      this.refreshCraft();
      this.craftHint.setText(
        rec.furniture ? `把${rec.name}摆进帐篷了` : `合成了 ${rec.name}`
      );
      return;
    }

    haptic('refuse');

    if (result === 'repaired') {
      haptic('craft');
      this.refreshCraft();
      this.craftHint.setText(`修好了${rec.name}`);
      return;
    }

    if (result === 'owned') {
      this.craftHint.setText(`帐篷里已经有${rec.name}了`);
      return;
    }

    this.craftHint.setText(result === 'locked' ? `还没有 ${rec.name} 的图纸` : '材料不够');
  }

  // ---------------------------------------------------------------- the nook

  buildHome() {
    this.homeLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.homeBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.homeBackdrop.on('pointerup', () => this.closeHome());

    this.homePanelGfx = this.add.graphics();
    this.homeRoomGfx = this.add.graphics();

    this.homeTitle = this.add
      .text(0, 0, '城郊营地 · 帐篷里', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.homeSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.homeCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.homeCloseIcon = this.add.image(0, 0, 'icon-x');
    this.homeCloseBtn.on('pointerup', () => this.closeHome());

    // Each piece of furniture owns a place in the room. Tapping that place
    // builds it and sets it down, so the tent fills up in front of you.
    this.homeSlotTexts = FURNITURE.map(() =>
      this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '12px',
          color: '#8a8070',
          align: 'center',
          wordWrap: { width: 108 },
          lineSpacing: 2,
          backgroundColor: 'rgba(10,8,6,0.62)',
          padding: { x: 4, y: 2 }
        })
        .setOrigin(0.5, 0.5)
    );

    this.homeSlotZones = FURNITURE.map((item) => {
      const zone = this.add
        .rectangle(0, 0, 1, 1, 0x000000, 0)
        .setOrigin(0.5, 0.5)
        .setInteractive();

      zone.on('pointerdown', () => this.placeFurnitureItem(item));
      return zone;
    });

    this.homeNote = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.creamDim,
        align: 'center'
      })
      .setOrigin(0.5, 0.5);

    this.sleepBtn = this.add
      .rectangle(0, 0, 200, 40, 0x4a3a24, 1)
      .setStrokeStyle(2, UI.amberBright, 0.9)
      .setInteractive();
    this.sleepText = this.add
      .text(0, 0, '睡一觉', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);
    this.sleepBtn.on('pointerdown', () => this.sleepHome());

    this.homeHint = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.creamDim,
        align: 'center',
        wordWrap: { width: 300 },
        lineSpacing: 3
      })
      .setOrigin(0.5, 0);

    this.homeLayer.add([
      this.homeBackdrop,
      this.homePanelGfx,
      this.homeRoomGfx,
      ...this.homeSlotTexts,
      ...this.homeSlotZones,
      this.homeTitle,
      this.homeSub,
      this.homeNote,
      this.homeCloseBtn,
      this.homeCloseIcon,
      this.sleepBtn,
      this.sleepText,
      this.homeHint
    ]);
  }

  layoutHome() {
    const w = this.w;
    const roomH = 250;
    const pw = Math.min(w - 32, 340);
    const ph = 58 + roomH + 126;
    const px = (w - pw) / 2;
    const py = Math.max(40, (this.playH - ph) / 2);

    this.homeBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.homePanelGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.homeTitle.setPosition(px + 18, py + 14);
    this.homeSub.setPosition(px + 18, py + 36);
    this.homeCloseBtn.setPosition(px + pw - 26, py + 26);
    this.homeCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);

    const room = { x: px + 14, y: py + 58, w: pw - 28, h: roomH };
    this.homeRoom = room;

    const fracs = {
      bed: { x: 0.06, y: 0.42, w: 0.36, h: 0.32 },
      table: { x: 0.46, y: 0.24, w: 0.24, h: 0.22 },
      fireplace: { x: 0.74, y: 0.3, w: 0.22, h: 0.44 },
      rug: { x: 0.3, y: 0.74, w: 0.4, h: 0.12 }
    };

    this.homeSlots = {};

    FURNITURE.forEach((item, i) => {
      const f = fracs[item.slot];
      const slot = {
        x: room.x + room.w * f.x,
        y: room.y + room.h * f.y,
        w: room.w * f.w,
        h: room.h * f.h
      };

      this.homeSlots[item.slot] = slot;

      const cx = slot.x + slot.w / 2;
      const cy = slot.y + slot.h / 2;

      this.homeSlotTexts[i].setPosition(cx, slot.y + slot.h + 13);
      this.homeSlotZones[i].setScale(slot.w + 14, slot.h + 22).setPosition(cx, cy);
    });

    const infoY = room.y + room.h + 26;
    this.homeNote.setPosition(w / 2, infoY);

    this.sleepBtn.setScale((pw - 56) / 200, 1).setPosition(w / 2, infoY + 34);
    this.sleepText.setPosition(w / 2, infoY + 34);
    this.homeHint.setPosition(w / 2, infoY + 60);
    this.homeHint.setWordWrapWidth(pw - 30);
  }

  openHome() {
    if (this.overOpen || this.shopOpen || this.tradeOpen || this.mapOpen || this.craftOpen || this.qte)
      return;

    this.homeOpen = true;
    this.showPanel(this.homeLayer);
    this.releaseStick();
    this.shown.homeSig = null;
    this.layoutHome();
    this.refreshHome();
    haptic('ui');
  }

  closeHome() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.homeOpen) return;
    this.homeOpen = false;
    this.hidePanel(this.homeLayer);
    haptic('ui');
  }

  /// Draws the inside of the tent as it stands: a lamp, a canvas wall, a plank
  /// floor, and whatever furniture has been gathered through the day.
  refreshHome() {
    const street = this.street;
    const run = street && street.run ? street.run : null;
    const comfort = street && street.homeComfort ? street.homeComfort() : 0;

    this.shown.homeSig = run
      ? `${run.money}|${run.bag}|${Object.values(run.goods).join(',')}|${comfort}`
      : '';

    const pieceOf = (slot) => (street && street.homePiece ? street.homePiece(slot) : null);
    const placed = (item) => {
      const piece = pieceOf(item.slot);
      return !!(piece && piece.item.id === item.id);
    };

    const placedCount = FURNITURE.filter(placed).length;
    const fire = !!(street && street.hasFire ? street.hasFire() : false);
    const cold = !!(street && street.isColdNight && street.isColdNight() && !fire);

    this.homeSub.setText(`舒适度 ${comfort} · 摆好 ${placedCount}/${FURNITURE.length}`);

    const r = this.homeRoom;
    const rg = this.homeRoomGfx;
    rg.clear();

    if (!r) return;

    // The tent itself.
    rg.fillStyle(0x2a2119, 1);
    rg.fillRoundedRect(r.x, r.y, r.w, r.h, 10);
    rg.fillStyle(0x33281d, 1);
    rg.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h * 0.58);

    rg.fillStyle(0x3b2f22, 0.7);
    for (let x = r.x + 10; x < r.x + r.w - 8; x += 22) {
      rg.fillRect(x, r.y + 4, 8, r.h * 0.56);
    }

    // The plank floor.
    rg.fillStyle(0x1d1710, 1);
    rg.fillRect(r.x + 3, r.y + r.h * 0.58, r.w - 6, r.h * 0.38);
    rg.lineStyle(1, 0x2b2318, 1);
    for (let y = r.y + r.h * 0.62; y < r.y + r.h * 0.94; y += 12) {
      rg.lineBetween(r.x + 4, y, r.x + r.w - 4, y);
    }

    // The lamp on its cord.
    rg.fillStyle(0x3a2f24, 1);
    rg.fillRect(r.x + r.w * 0.5 - 1, r.y + 6, 2, 16);
    rg.fillStyle(fire ? 0xf2c46a : 0x8a8070, fire ? 0.9 : 0.5);
    rg.fillCircle(r.x + r.w * 0.5, r.y + 26, fire ? 5 : 4);

    if (fire) {
      rg.fillStyle(0xf2c46a, 0.07);
      rg.fillCircle(r.x + r.w * 0.85, r.y + r.h * 0.6, 92);
    }

    if (cold) {
      rg.fillStyle(0x5a7fa8, 0.08);
      rg.fillRoundedRect(r.x, r.y, r.w, r.h, 10);
    }

    const slotOf = (id) => this.homeSlots[id];

    // The bed: a flattened cardboard box, torn at one corner and creased down
    // the middle, with an old rag thrown over it.
    const bed = slotOf('bed');
    const bedItem = FURNITURE.find((item) => item.slot === 'bed');
    if (bed && placed(bedItem)) {
      rg.fillStyle(0x6b5236, 1);
      rg.fillRect(bed.x, bed.y + bed.h * 0.18, bed.w, bed.h * 0.72);

      rg.fillStyle(0x8a6a44, 1);
      rg.fillRect(bed.x + 2, bed.y + bed.h * 0.2, bed.w - 4, bed.h * 0.22);
      rg.fillStyle(0xa8865a, 1);
      rg.fillRect(bed.x + 4, bed.y + bed.h * 0.23, bed.w * 0.44, bed.h * 0.12);

      // Creases and the taped edge.
      rg.lineStyle(1, 0x4a3a26, 0.9);
      rg.lineBetween(bed.x + 2, bed.y + bed.h * 0.55, bed.x + bed.w - 6, bed.y + bed.h * 0.52);
      rg.lineBetween(bed.x + bed.w * 0.56, bed.y + bed.h * 0.2, bed.x + bed.w * 0.59, bed.y + bed.h * 0.9);
      rg.fillStyle(0xcfc6b2, 0.45);
      rg.fillRect(bed.x, bed.y + bed.h * 0.18, 4, bed.h * 0.72);

      // A torn-off corner, cut back to the floor.
      rg.fillStyle(0x1d1710, 1);
      rg.fillTriangle(
        bed.x + bed.w,
        bed.y + bed.h * 0.62,
        bed.x + bed.w,
        bed.y + bed.h * 0.9,
        bed.x + bed.w * 0.74,
        bed.y + bed.h * 0.9
      );

      // The rag on top.
      rg.fillStyle(0xc9b391, 0.85);
      rg.fillRect(bed.x + bed.w * 0.3, bed.y + bed.h * 0.62, bed.w * 0.42, bed.h * 0.16);
    }

    // The table: a wooden crate with the lid on.
    const table = slotOf('table');
    const tableItem = FURNITURE.find((item) => item.slot === 'table');
    if (table && placed(tableItem)) {
      rg.fillStyle(0x4a3420, 1);
      rg.fillRect(table.x + 3, table.y + table.h * 0.42, 5, table.h * 0.5);
      rg.fillRect(table.x + table.w - 8, table.y + table.h * 0.42, 5, table.h * 0.5);
      rg.fillStyle(0x7a5a36, 1);
      rg.fillRect(table.x, table.y + table.h * 0.18, table.w, table.h * 0.3);
      rg.fillStyle(0x9a7546, 1);
      rg.fillRect(table.x, table.y + table.h * 0.18, table.w, table.h * 0.09);
    }

    // The fireplace: a punched oil drum with a small fire in it.
    const fireSlot = slotOf('fireplace');
    const fireItem = FURNITURE.find((item) => item.slot === 'fireplace');
    if (fireSlot && placed(fireItem)) {
      rg.fillStyle(0x2f3236, 1);
      rg.fillRoundedRect(fireSlot.x, fireSlot.y + fireSlot.h * 0.18, fireSlot.w, fireSlot.h * 0.82, 6);
      rg.fillStyle(0x4a4f56, 1);
      rg.fillRoundedRect(
        fireSlot.x + 3,
        fireSlot.y + fireSlot.h * 0.24,
        fireSlot.w - 6,
        fireSlot.h * 0.2,
        5
      );

      const fx = fireSlot.x + fireSlot.w / 2;
      const fy = fireSlot.y + fireSlot.h * 0.42;

      rg.fillStyle(0xd9563f, 0.95);
      rg.fillCircle(fx, fy + 4, 9);
      rg.fillStyle(0xf2a83c, 1);
      rg.fillCircle(fx, fy, 6);
      rg.fillStyle(0xf7e2a0, 1);
      rg.fillCircle(fx, fy - 2, 3);
    }

    // The rug: flattened newspapers under everything.
    const rug = slotOf('rug');
    const rugItem = FURNITURE.find((item) => item.slot === 'rug');
    if (rug && placed(rugItem)) {
      rg.fillStyle(0xb9b2a0, 0.9);
      rg.fillRect(rug.x, rug.y, rug.w, rug.h);
      rg.fillStyle(0x8f8877, 0.9);
      rg.fillRect(rug.x, rug.y + rug.h * 0.3, rug.w, 2);
      rg.fillRect(rug.x, rug.y + rug.h * 0.66, rug.w, 2);
    }

    // A worn-out piece is still standing, but it reads as broken: a dark wash
    // over it and a line saying what it needs.
    HOME_SLOTS.forEach((slot) => {
      const piece = pieceOf(slot);
      const s = this.homeSlots[slot];
      if (!piece || !piece.broken || !s) return;

      rg.fillStyle(0x0b0906, 0.5);
      rg.fillRoundedRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4, 6);
    });

    rg.lineStyle(2, UI.amber, 0.35);
    rg.strokeRoundedRect(r.x, r.y, r.w, r.h, 10);

    // The labels and the states of each place.
    this.homeSlotTexts.forEach((text, i) => {
      const item = FURNITURE[i];
      const isPlaced = placed(item);
      const state = street ? street.furnitureState(item) : 'short';

      if (isPlaced) {
        const piece = pieceOf(item.slot);
        if (!piece) return;

        if (piece.broken) {
          const need = item.repair || { cardboard: 2 };
          const cost = Object.keys(need)
            .map((id) => `${materialLabel(id)} ${need[id]}`)
            .join(' · ');

          text.setText(`${item.name}\n破损 · 点一下修\n${cost}`).setColor('#f0a08a');
          return;
        }

        text.setText(`${item.name}\n耐久 ${piece.left}/${piece.max}`).setColor(UI.gold);
        return;
      }

      let cost;
      if (item.price > 0) {
        cost = `${item.price} 元`;
      } else {
        cost = Object.keys(item.need)
          .map((id) => `${materialLabel(id)} ${run ? amountOf(run, id) : 0}/${item.need[id]}`)
          .join(' · ');
      }

      const flag = state === 'ok' ? '可以放' : state === 'poor' ? '钱不够' : '材料不够';
      text.setText(`${item.name}\n${cost}\n${flag}`);
      text.setColor(state === 'ok' ? '#a8d98a' : '#7a7368');
    });

    if (cold) {
      this.homeNote.setText(`没生火 · 今晚会冻着（舒适度 ${comfort}）`).setColor('#f0a08a');
    } else if (fire) {
      this.homeNote.setText(`生着火 · 睡得踏实（舒适度 ${comfort}）`).setColor('#a8d98a');
    } else {
      this.homeNote.setText(`舒适度 ${comfort} · 生个火就不怕夜里冷了`).setColor(UI.creamDim);
    }

    const preview = street && street.sleepPreview ? street.sleepPreview() : null;

    if (preview && preview.cold) {
      this.homeHint
        .setText(
          `受冻睡一晚：精力 +${preview.energy} · 饱食 -${Math.abs(preview.hunger)}\n先去外面捡点材料把火桶做出来。`
        )
        .setColor('#f0a08a');
    } else if (preview) {
      this.homeHint
        .setText(`睡一觉：精力 +${preview.energy} · 饱食 +${preview.hunger}`)
        .setColor(UI.creamDim);
    }

    // What the morning will be like. Whether the fire is worth keeping lit is a
    // decision made right here, on the way to bed.
    const forecast = street && street.getForecastText ? street.getForecastText() : '';
    this.sleepText.setText(forecast ? `睡一觉 · 明天${forecast}` : '睡一觉');
  }

  placeFurnitureItem(item) {
    if (!this.street) return;

    const result = this.street.placeFurniture(item);

    if (result === 'owned') {
      haptic('refuse');
      this.homeHint.setText('这件已经摆好了');
      return;
    }

    if (result === 'repaired') {
      this.shown.homeSig = null;
      this.refreshHome();
      this.homeHint.setText(`修好了${item.name}`);
      return;
    }

    if (result !== 'ok') {
      haptic('refuse');
      this.homeHint.setText(result === 'poor' ? '钱不够' : '材料不够');
      return;
    }

    this.shown.homeSig = null;
    this.refreshHome();
    this.homeHint.setText(`摆好了${item.name}`);
  }

  sleepHome() {
    if (!this.street) return;

    const rest = this.street.sleepAtHome();
    const s = rest.summary || { begging: 0, scavenge: 0, stolen: 0, sold: 0 };
    const energy = `精力 ${rest.energy >= 0 ? '+' : '-'}${Math.abs(Math.round(rest.energy))}`;
    const hunger = `饱食 ${rest.hunger >= 0 ? '+' : '-'}${Math.abs(Math.round(rest.hunger))}`;
    const night = rest.cold ? '冻了一夜' : '睡到天亮';

    this.shown.homeSig = null;
    this.refreshHome();
    this.homeHint
      .setText(
        `第 ${rest.day} 天 · ${night} · ${energy} · ${hunger}\n昨天：乞讨 ${s.begging} · 拾荒 ${s.scavenge} · 偷 ${s.stolen} · 卖 ${s.sold} 元`
      )
      .setColor(rest.cold ? '#f0a08a' : UI.creamDim);
  }

  // ----------------------------------------------------------- the vending box

  buildVending() {
    this.vendingLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.vendingBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.vendingBackdrop.on('pointerup', () => this.closeVending());

    this.vendingPanelGfx = this.add.graphics();

    this.vendingTitle = this.add
      .text(0, 0, '自动售货机', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.vendingSub = this.add
      .text(0, 0, '投币买一罐，或者踹一脚', {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.creamDim
      })
      .setOrigin(0, 0);

    this.vendingCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.vendingCloseIcon = this.add.image(0, 0, 'icon-x');
    this.vendingCloseBtn.on('pointerup', () => this.closeVending());

    this.vendingLayer.add([
      this.vendingBackdrop,
      this.vendingPanelGfx,
      this.vendingTitle,
      this.vendingSub,
      this.vendingCloseBtn,
      this.vendingCloseIcon
    ]);

    this.vendingRows = [];

    for (let i = 0; i < 2; i++) {
      const bg = this.add
        .rectangle(0, 0, ROW_WIDTH, ROW_HEIGHT, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(0, 0, 'icon-cup-soda');
      const name = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '17px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
        .setOrigin(0, 0.5);
      const price = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '17px',
          color: UI.gold,
          fontStyle: 'bold'
        })
        .setOrigin(1, 0.5);

      const row = { bg, icon, name, info, price, action: null };
      bg.on('pointerdown', () => {
        if (row.action) row.action();
      });
      this.vendingLayer.add([bg, icon, name, info, price]);
      this.vendingRows.push(row);
    }

    this.vendingHint = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0.5, 0.5);
    this.vendingLayer.add(this.vendingHint);
  }

  layoutVending() {
    const w = this.w;
    const count = this.vendingRows.length;
    const gap = 8;
    const pw = Math.min(w - 32, ROW_WIDTH + 24);
    const ph = 56 + count * (ROW_HEIGHT + gap) + 20;
    const px = (w - pw) / 2;
    const py = Math.max(48, (this.playH - ph) / 2);

    this.vendingBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.vendingPanelGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.vendingTitle.setPosition(px + 18, py + 14);
    this.vendingSub.setPosition(px + 18, py + 36);
    this.vendingCloseBtn.setPosition(px + pw - 26, py + 26);
    this.vendingCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);

    const rowW = pw - 24;
    const rowX = px + 12;
    const rowScale = rowW / ROW_WIDTH;

    this.vendingRows.forEach((row, i) => {
      const ry = py + 56 + ROW_HEIGHT / 2 + i * (ROW_HEIGHT + gap);

      row.bg.setScale(rowScale, 1).setPosition(rowX, ry);
      row.icon.setPosition(rowX + 26, ry).setScale(24 / 96);
      row.name.setPosition(rowX + 48, ry - 8);
      row.info.setPosition(rowX + 48, ry + 11);
      row.price.setPosition(rowX + rowW - 12, ry);
    });

    this.vendingHint.setPosition(w / 2, py + ph - 12);
  }

  openVending(key) {
    if (
      this.overOpen ||
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte
    )
      return;

    this.vendingKey = key;
    this.vendingOpen = true;
    this.showPanel(this.vendingLayer);
    this.releaseStick();
    this.layoutVending();
    this.refreshVending();
    haptic('ui');
  }

  closeVending() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.vendingOpen) return;
    this.vendingOpen = false;
    this.hidePanel(this.vendingLayer);
    haptic('ui');
  }

  refreshVending() {
    const run = this.street && this.street.run ? this.street.run : null;
    const kicked = !!(run && run.vendingKicked && run.vendingKicked[this.vendingKey]);

    const coffee = this.vendingRows[0];
    const affordable = !!run && run.money >= COFFEE_PRICE;
    coffee.icon.setTexture('icon-cup-soda');
    coffee.name.setText('罐装咖啡').setColor(affordable ? UI.cream : '#8a8070');
    coffee.info.setText(`精力 +${COFFEE_ENERGY}`).setColor(affordable ? UI.creamDim : '#736a5c');
    coffee.price.setText(`${COFFEE_PRICE} 元`).setColor(affordable ? UI.gold : '#8a7a55');
    coffee.bg.setFillStyle(UI.panelRow, 1);
    coffee.action = () => this.buyCoffee();

    const kick = this.vendingRows[1];
    kick.icon.setTexture('icon-footprints');
    kick.name.setText('踹售货机').setColor(kicked ? '#8a8070' : UI.cream);
    kick.info
      .setText(`白拿一罐饮料，通缉 +${KICK_WANTED}`)
      .setColor(kicked ? '#736a5c' : '#c08a6a');
    kick.price.setText(kicked ? '踹过了' : '免费').setColor(kicked ? '#8a7a55' : UI.gold);
    kick.bg.setFillStyle(kicked ? UI.panelRowDim : UI.panelRow, 1);
    kick.action = kicked ? null : () => this.kickVending();
  }

  buyCoffee() {
    if (!this.street) return;

    if (!this.street.buyCoffee(this.vendingKey)) {
      haptic('refuse');
      this.vendingHint.setText('钱不够');
      return;
    }

    this.vendingHint.setText('一罐咖啡下肚，人精神了');
    this.refreshVending();
  }

  kickVending() {
    if (!this.street) return;

    if (!this.street.kickVending(this.vendingKey)) {
      haptic('refuse');
      this.vendingHint.setText('这台的货已经踹光了');
      return;
    }

    this.vendingHint.setText('咣当一声，饮料掉出来了');
    this.refreshVending();
  }

  // ------------------------------------------------------------- the slot machine

  buildSlot() {
    this.slotLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.slotBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.slotBackdrop.on('pointerup', () => this.closeSlot());

    this.slotPanelGfx = this.add.graphics();

    this.slotTitle = this.add
      .text(0, 0, '老虎机', {
        fontFamily: FONT,
        fontSize: '19px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.slotSub = this.add
      .text(0, 0, `拉一次 ${SLOT_COST} 元，三个一样就中`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.creamDim
      })
      .setOrigin(0, 0);

    this.slotCloseBtn = this.add
      .circle(0, 0, 22, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.slotCloseIcon = this.add.image(0, 0, 'icon-x');
    this.slotCloseBtn.on('pointerup', () => this.closeSlot());

    this.slotLayer.add([
      this.slotBackdrop,
      this.slotPanelGfx,
      this.slotTitle,
      this.slotSub,
      this.slotCloseBtn,
      this.slotCloseIcon
    ]);

    this.slotReels = [0, 1, 2].map(() =>
      this.add.image(0, 0, SLOT_SYMBOLS[0].tex).setScale(2.2)
    );
    for (const reel of this.slotReels) this.slotLayer.add(reel);

    this.slotResult = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: UI.gold })
      .setOrigin(0.5, 0.5);

    this.slotPullBtn = this.add
      .rectangle(0, 0, 200, 40, 0x4a3a24, 1)
      .setStrokeStyle(2, UI.amberBright, 0.9)
      .setInteractive();
    this.slotPullText = this.add
      .text(0, 0, '拉一把', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);
    this.slotPullBtn.on('pointerdown', () => this.pullSlot());

    this.slotHint = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0.5, 0.5);

    this.slotLayer.add([this.slotResult, this.slotPullBtn, this.slotPullText, this.slotHint]);
  }

  layoutSlot() {
    const w = this.w;
    const pw = Math.min(w - 32, 320);
    const ph = 230;
    const px = (w - pw) / 2;
    const py = Math.max(48, (this.playH - ph) / 2);

    this.slotBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.slotPanelGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    // Reel window.
    const winX = px + 28;
    const winY = py + 58;
    const winW = pw - 56;
    g.fillStyle(0x0f0c09, 1);
    g.fillRoundedRect(winX, winY, winW, 58, 8);

    this.slotTitle.setPosition(px + 18, py + 14);
    this.slotSub.setPosition(px + 18, py + 36);
    this.slotCloseBtn.setPosition(px + pw - 26, py + 26);
    this.slotCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);

    const step = winW / 3;
    this.slotReels.forEach((reel, i) => {
      reel.setPosition(winX + step * (i + 0.5), winY + 29);
    });

    this.slotResult.setPosition(w / 2, py + 138);
    this.slotPullBtn.setScale((pw - 56) / 200, 1).setPosition(w / 2, py + 172);
    this.slotPullText.setPosition(w / 2, py + 172);
    this.slotHint.setPosition(w / 2, py + ph - 14);
  }

  openSlot() {
    if (
      this.overOpen ||
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte
    )
      return;

    this.slotOpen = true;
    this.showPanel(this.slotLayer);
    this.releaseStick();
    this.shown.slotMoney = null;
    this.layoutSlot();
    this.refreshSlot();
    haptic('ui');
  }

  closeSlot() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.slotOpen) return;
    this.slotOpen = false;
    this.slotSpin = null;
    this.slotLayer.setVisible(false);
    this.setLayerInput(this.slotLayer, false);
    haptic('ui');
  }

  refreshSlot() {
    const run = this.street && this.street.run ? this.street.run : null;
    const money = run ? run.money : 0;
    this.shown.slotMoney = money;

    const affordable = money >= SLOT_COST;
    this.slotPullText.setText(`拉一把（${SLOT_COST} 元）`);
    this.slotPullBtn.setFillStyle(affordable ? 0x4a3a24 : 0x2c241a, 1);
    this.slotPullText.setColor(affordable ? UI.cream : '#8a8070');
    this.slotSub.setColor(affordable ? UI.creamDim : '#b0705e');
  }

  pullSlot() {
    if (!this.slotOpen || this.slotSpin) return;
    if (!this.street) return;

    const result = this.street.spinSlot();
    if (!result) {
      haptic('refuse');
      this.slotHint.setText('钱不够，一次 10 元');
      return;
    }

    this.slotSpin = { result, remain: 1.15, cycle: 0.06 };
    this.slotResult.setText('');
    this.slotHint.setText('轮盘转起来了……');
    haptic('ui');
  }

  updateSlot(dt) {
    const spin = this.slotSpin;
    if (!spin) return;

    spin.remain -= dt;
    spin.cycle -= dt;

    if (spin.cycle <= 0) {
      spin.cycle = 0.08;
      for (const reel of this.slotReels) {
        const symbol = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        reel.setTexture(symbol.tex);
      }
    }

    if (spin.remain > 0) return;

    this.slotSpin = null;
    const result = spin.result;

    result.symbols.forEach((index, i) => {
      this.slotReels[i].setTexture(SLOT_SYMBOLS[index].tex);
    });

    if (this.street) this.street.settleSlot(result);

    if (result.payout > 0) {
      this.slotResult.setText(
        result.tier === 'jackpot' ? `三个七！+${result.payout} 元` : `中奖 +${result.payout} 元`
      );
      this.slotHint.setText('运气不错，再来一把？');
    } else {
      this.slotResult.setText('空手而归');
      this.slotHint.setText('钱进了机器，机器不认人');
    }

    this.refreshSlot();
  }

  buildMap() {
    this.mapLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 2).setVisible(false);

    this.mapBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x050403, 0.82)
      .setOrigin(0, 0)
      .setInteractive();
    this.mapBackdrop.on('pointerup', () => this.closeMap());

    this.mapGfx = this.add.graphics();

    this.mapTitle = this.add
      .text(0, 0, '城市地图', {
        fontFamily: FONT,
        fontSize: '18px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.mapSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.mapHint = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.creamDim })
      .setOrigin(0.5, 0.5);

    this.mapCloseBtn = this.add
      .circle(0, 0, 22, 0x1a1510, 0.95)
      .setStrokeStyle(1.5, 0xd8c8a8, 0.6)
      .setInteractive();
    this.mapCloseIcon = this.add.image(0, 0, 'icon-x');
    this.mapCloseBtn.on('pointerup', () => this.closeMap());

    this.mapLayer.add([
      this.mapBackdrop,
      this.mapGfx,
      this.mapTitle,
      this.mapSub,
      this.mapHint,
      this.mapCloseBtn,
      this.mapCloseIcon
    ]);

    this.mapRect = { x: 0, y: 0, w: 1, h: 1 };
    this.mapBlocks = {};

    for (const id of DISTRICT_ORDER) {
      const plate = this.add.circle(0, 0, 24, 0x171512, 1);
      const icon = this.add.image(0, 0, `icon-${DISTRICTS[id].icon}`).setScale(0.3);

      const label = this.add
        .text(0, 0, DISTRICTS[id].name, {
          fontFamily: FONT,
          fontSize: '14px',
          color: UI.cream,
          fontStyle: 'bold'
        })
        .setOrigin(0.5, 0);

      const status = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '11px',
          color: UI.creamDim,
          align: 'center',
          lineSpacing: 3,
          wordWrap: { width: 100 }
        })
        .setOrigin(0.5, 0);

      const lock = this.add.image(0, 0, 'icon-lock').setScale(0.16).setVisible(false);
      const star = this.add.image(0, 0, 'icon-star').setScale(0.2).setVisible(false);

      const zone = this.add
        .rectangle(0, 0, 1, 1, 0x000000, 0)
        .setOrigin(0.5, 0.5)
        .setInteractive();
      zone.on('pointerdown', () => this.pickDistrict(id));

      this.mapLayer.add([plate, icon, label, status, lock, star, zone]);

      this.mapBlocks[id] = { plate, icon, label, status, lock, star, zone };
    }

    // "You are here", and a pulse ring just a little larger than the stop.
    this.mapHereTag = this.add
      .text(0, 0, '我在这里', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#0d1a0e',
        backgroundColor: '#8fd07a',
        padding: { x: 7, y: 3 }
      })
      .setOrigin(0.5, 0.5);

    this.mapRing = this.add
      .circle(0, 0, 32, 0x000000, 0)
      .setStrokeStyle(2, 0x8fd07a, 0.9);

    this.mapLayer.add([this.mapRing, this.mapHereTag]);

    this.tweens.add({
      targets: this.mapRing,
      alpha: 0.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  layoutMap() {
    const w = this.w;
    const h = this.h;
    const px = 12;
    const py = 28;
    const pw = w - 24;
    const ph = h - 56;

    this.mapBackdrop.setScale(w, h).setPosition(0, 0);

    const g = this.mapGfx;
    g.clear();
    g.fillStyle(0x0c0b09, 0.98);
    g.fillRoundedRect(px, py, pw, ph, 18);
    g.lineStyle(1.5, UI.amber, 0.35);
    g.strokeRoundedRect(px, py, pw, ph, 18);

    this.mapRect = { x: px + 26, y: py + 76, w: pw - 52, h: ph - 76 - 58 };
    const rect = this.mapRect;

    // Faint grid, so the map reads like a survey sheet instead of a slab.
    g.lineStyle(1, 0xf2e8d5, 0.05);
    for (let x = rect.x; x <= rect.x + rect.w; x += 30) {
      g.lineBetween(x, rect.y, x, rect.y + rect.h);
    }
    for (let y = rect.y; y <= rect.y + rect.h; y += 30) {
      g.lineBetween(rect.x, y, rect.x + rect.w, y);
    }

    this.mapTitle.setPosition(px + 20, py + 18);
    this.mapSub.setPosition(px + 20, py + 44);
    this.mapCloseBtn.setPosition(px + pw - 26, py + 26);
    this.mapCloseIcon.setPosition(px + pw - 26, py + 26).setScale(22 / 96);
    this.mapHint.setPosition(w / 2, py + ph - 22);

    for (const id of DISTRICT_ORDER) {
      const block = this.mapBlocks[id];
      const c = this.blockCentre(id);

      block.plate.setPosition(c.x, c.y);
      block.icon.setPosition(c.x, c.y);
      block.label.setPosition(c.x, c.y + 29);
      block.status
        .setWordWrapWidth(Math.max(78, this.mapRect.w / CITY_COLS - 8))
        .setPosition(c.x, c.y + 48);
      block.lock.setPosition(c.x + 19, c.y - 19);
      block.star.setPosition(c.x - 19, c.y - 19);
      block.zone.setScale(104, 104).setPosition(c.x, c.y + 10);
    }
  }

  blockCentre(id) {
    const rect = this.mapRect;
    const cell = cellOf(id);
    const cellW = rect.w / CITY_COLS;
    const cellH = rect.h / CITY_ROWS;

    return {
      x: rect.x + cellW * (cell.col + 0.5),
      y: rect.y + cellH * (cell.row + 0.5)
    };
  }

  refreshMap() {
    const street = this.street;
    const unlocked = street && street.unlockedList ? street.unlockedList() : [];
    const currentId = street && street.district ? street.district.id : 'market';

    this.layoutMap();

    const g = this.mapGfx;

    // The map is the same grid the city is: only blocks that touch are joined.
    for (const id of STREET_ORDER) {
      for (const dir of ['east', 'south']) {
        const other = neighbourOf(id, dir);
        if (!other) continue;

        const p = this.blockCentre(id);
        const q = this.blockCentre(other);
        const live = unlocked.includes(id) && unlocked.includes(other);

        this.drawRoute(g, p, q, live ? 0xf2e8d5 : 0x6b6257, live ? 0.42 : 0.18);
      }
    }

    for (const id of DISTRICT_ORDER) {
      const c = this.blockCentre(id);
      const locked = !unlocked.includes(id);
      const current = id === currentId;
      const block = this.mapBlocks[id];

      block.plate.setFillStyle(current ? 0x1d2a1b : locked ? 0x131211 : 0x171512, 1);
      block.plate.setStrokeStyle(
        current ? 2.5 : 1.5,
        current ? 0x8fd07a : locked ? 0x3a362f : 0xd8c8a8,
        current ? 1 : locked ? 0.6 : 0.8
      );

      block.icon.setTint(current ? 0xbff2a8 : locked ? 0x5a554c : 0xf2ead5);
      block.label.setColor(current ? '#a8e08a' : locked ? '#6b6257' : '#f2ead5');
      const need = DISTRICTS[id].unlockAfter;

      // What the place is like underfoot: the risk, the takings, who else is
      // out. The block is narrow, so each one is a short paragraph.
      const blurb = DISTRICTS[id].blurb || '';

      block.status
        .setText(
          locked
            ? need
              ? `先去${DISTRICTS[need].name}`
              : '还没解锁'
            : blurb
        )
        .setColor(current ? '#a8e08a' : locked ? '#5a554c' : UI.creamDim);

      block.lock.setVisible(locked).setTint(0x8a8070);
      block.star.setVisible(id === QUEST_TARGET.district).setTint(0xf2c46a);
    }

    const here = this.blockCentre(currentId);
    this.mapRing.setPosition(here.x, here.y);
    this.mapHereTag.setPosition(here.x, here.y - 40);

    this.mapSub.setText('整座城都开着，顺着街走就行');
    this.mapHint.setText('点一个街区，看看怎么走');
  }

  /// A gentle curve between two stops, drawn as even dashes.
  drawRoute(g, p, q, colour, alpha) {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const bend = 0.16;

    const mx = (p.x + q.x) / 2 - (dy / len) * len * bend;
    const my = (p.y + q.y) / 2 + (dx / len) * len * bend;

    const steps = 48;
    const pts = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const it = 1 - t;
      pts.push({
        x: it * it * p.x + 2 * it * t * mx + t * t * q.x,
        y: it * it * p.y + 2 * it * t * my + t * t * q.y
      });
    }

    g.lineStyle(2, colour, alpha);
    for (let i = 0; i < pts.length - 1; i++) {
      if (Math.floor(i / 3) % 2 === 0) {
        g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      }
    }
  }

  openMap() {
    if (
      this.overOpen ||
      this.shopOpen ||
      this.tradeOpen ||
      this.mapOpen ||
      this.craftOpen ||
      this.homeOpen ||
      this.vendingOpen ||
      this.slotOpen ||
      this.qte
    )
      return;

    this.mapOpen = true;
    this.showPanel(this.mapLayer);
    this.releaseStick();
    this.refreshMap();
    haptic('ui');
  }

  closeMap() {
    if (this.time.now < this.uiSettleAt) return;
    if (!this.mapOpen) return;
    this.mapOpen = false;
    this.hidePanel(this.mapLayer);
    haptic('ui');
  }

  pickDistrict(id) {
    const street = this.street;
    if (!street || !street.district) return;

    if (id === street.district.id) {
      haptic('refuse');
      this.mapHint.setText('你已经在这个区域了');
      return;
    }

    if (!street.unlockedList().includes(id)) {
      haptic('refuse');
      const need = DISTRICTS[id].unlockAfter;
      this.mapHint.setText(
        need ? `${DISTRICTS[id].name}还锁着 · 先去${DISTRICTS[need].name}` : `${DISTRICTS[id].name}还锁着`
      );
      return;
    }

    // The map never moves the player: the whole city is walkable, so the way
    // there is to walk it. Tapping only says where it is.
    haptic('ui');
    this.mapHint.setText(`${DISTRICTS[id].name}就在这座城里，顺着街道走过去就行`);
  }

  showToast(text) {
    if (!this.toastText) return;

    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(text).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1400,
      duration: 700,
      onComplete: () => this.toastText.setVisible(false)
    });
  }

  refreshTrade() {
    const run = this.street && this.street.run ? this.street.run : null;
    const money = run ? run.money : 0;
    const atPawn = this.tradeMode === 'pawn';

    this.tradeTitle.setText(atPawn ? '老陈当铺' : '街边旧货摊');
    this.tradeSub.setText(atPawn ? '只收值钱东西，也卖几件趁手的家伙' : '只收废品，论堆换零钱');

    this.shown.tradeSig = run
      ? `${run.money}|${run.bag}|${run.tools.lockpick}|${run.tools.coat}|${Object.values(
          run.goods
        ).join(',')}`
      : '';

    const entries = this.tradeEntryList();

    this.tradeRows.forEach((row, i) => {
      const entry = entries[i];
      const visible = !!entry;

      row.bg.setVisible(visible);
      row.icon.setVisible(visible);
      row.name.setVisible(visible);
      row.info.setVisible(visible);
      row.price.setVisible(visible);
      row.useBtn.setVisible(false);
      row.useText.setVisible(false);
      if (row.bg.input) row.bg.input.enabled = visible;
      if (row.useBtn.input) row.useBtn.input.enabled = false;

      if (!entry) return;

      row.entry = entry;

      if (entry.kind === 'loot') {
        const item = LOOT_ITEMS[entry.id];
        const have = run ? run.loot[entry.id] || 0 : 0;
        const price = lootPrice(entry.id, atPawn);
        const ok = have > 0;

        row.icon.setTexture(item.tex);
        this.fitIcon(row.icon, 26);
        row.name.setText(item.name);
        this.fitRow(row.info, `持有 ${have} · ${item.use}`, TRADE_ROW_WIDTH - 170, 12);
        row.price.setText(`${price} 元`);

        row.name.setColor(ok ? UI.cream : '#8a8070');
        row.info.setColor(ok ? UI.creamDim : '#736a5c');
        row.price.setColor(ok ? UI.gold : '#8a7a55');
        row.bg.setFillStyle(ok ? UI.panelRow : UI.panelRowDim, ok ? 1 : 0.7);
        row.action = () => this.sellLoot(entry.id);

        // Cigarettes and a snack can be used here instead of sold.
        if (ok && item.kind !== 'value') {
          row.useBtn.setVisible(true);
          row.useText.setVisible(true);
          if (row.useBtn.input) row.useBtn.input.enabled = true;
        }

        return;
      }

      if (entry.kind === 'junk') {
        const item = JUNK_ITEMS[entry.id];
        const have = run ? run.items[entry.id] : 0;
        const price = junkPrice(entry.id, atPawn);
        const ok = have > 0;

        row.icon.setTexture(item.tex);
        this.fitIcon(row.icon, 26);
        row.name.setText(item.name);
        this.fitRow(row.info, `${item.place} · ${item.use} · 持有 ${have}`, TRADE_ROW_WIDTH - 170, 12);
        row.price.setText(`${price} 元`);

        row.name.setColor(ok ? UI.cream : '#8a8070');
        row.info.setColor(ok ? UI.creamDim : '#736a5c');
        row.price.setColor(ok ? UI.gold : '#8a7a55');
        row.bg.setFillStyle(ok ? UI.panelRow : UI.panelRowDim, ok ? 1 : 0.7);
        row.action = () => this.sellJunk(entry.id);
        return;
      }

      if (entry.kind === 'good') {
        const rec = RECIPES.find((r) => r.id === entry.id);
        const have = run ? run.goods[entry.id] || 0 : 0;
        const ok = have > 0;

        row.icon.setTexture(rec.tex);
        this.fitIcon(row.icon, 26);
        row.name.setText(rec.name);
        this.fitRow(row.info, `持有 ${have} 个 · 单价 ${rec.value} 元`, TRADE_ROW_WIDTH - 170, 12);
        row.price.setText(`${rec.value} 元`);

        row.name.setColor(ok ? UI.cream : '#8a8070');
        row.info.setColor(ok ? UI.creamDim : '#736a5c');
        row.price.setColor(ok ? UI.gold : '#8a7a55');
        row.bg.setFillStyle(ok ? UI.panelRow : UI.panelRowDim, ok ? 1 : 0.7);
        row.action = () => this.sellGood(entry.id);
        return;
      }

      const tool = TOOLS.find((t) => t.id === entry.id);
      const owned = run ? !!run.tools[entry.id] : false;
      const affordable = money >= tool.price;

      row.icon.setTexture(tool.tex);
      this.fitIcon(row.icon, 26);
      row.name.setText(tool.name);
      this.fitRow(row.info, owned ? '已经在身上了' : tool.blurb, TRADE_ROW_WIDTH - 170, 12);
      row.price.setText(owned ? '已拥有' : `${tool.price} 元`);
      row.name.setColor(owned || affordable ? UI.cream : '#8a8070');
      row.info.setColor(owned || affordable ? UI.creamDim : '#736a5c');
      row.price.setColor(owned ? '#8a7a55' : affordable ? UI.gold : '#8a7a55');
      row.bg.setFillStyle(owned ? UI.panelRowDim : UI.panelRow, 1);
      row.action = () => this.buyTool(tool);
    });
  }

  useTradeRow(row) {
    if (row.action) row.action();
  }

  sellJunk(id) {
    if (!this.street) return;

    const ok = this.street.sellJunk(id, this.tradeMode === 'pawn');
    if (!ok) {
      haptic('refuse');
      return;
    }

    playSfx('sell');
    haptic('sell');
    this.refreshTrade();
  }

  sellGood(id) {
    if (!this.street) return;

    const ok = this.street.sellGood(id);
    if (!ok) {
      haptic('refuse');
      return;
    }

    playSfx('sell');
    haptic('sell');
    this.refreshTrade();
  }

  sellLoot(id) {
    if (!this.street) return;

    const ok = this.street.sellLoot(id, this.tradeMode === 'pawn');
    if (!ok) {
      haptic('refuse');
      return;
    }

    playSfx('sell');
    haptic('sell');
    this.refreshTrade();
  }

  useLootRow(row) {
    const entry = row.entry;
    if (!entry || entry.kind !== 'loot' || !this.street) return;

    const ok = this.street.useLoot(entry.id);
    if (!ok) {
      haptic('refuse');
      return;
    }

    haptic('buy');
    this.refreshTrade();
  }

  buyTool(tool) {
    if (!this.street) return;

    const ok = this.street.buyTool(tool.id);
    if (!ok) {
      haptic('refuse');
      return;
    }

    this.refreshTrade();
  }

  sellAll() {
    if (!this.street) return;

    const total = this.street.sellAllJunk(this.tradeMode === 'pawn');
    if (total <= 0) {
      haptic('refuse');
      return;
    }

    playSfx('sell');
    haptic('sell');
    this.refreshTrade();
  }

  refreshStore() {
    const run = this.street && this.street.run ? this.street.run : null;
    const shop = SHOPS.find((s) => s.id === this.storeId);
    const selling = this.storeMode === 'sell' && !!(shop && shop.buyBack);

    this.storeTitle.setText(shop ? shop.name : '');
    this.storeSub.setText(
      shop ? (selling ? '把包里的东西卖给他 · 一次一堆' : `${shop.owner}：${shop.blurb}`) : ''
    );

    this.storeEntries = selling ? sellListFor(this.storeId, run) : stockFor(this.storeId, run);

    this.shown.storeSig = run
      ? `${this.storeMode}|${run.money}|${run.outfit}|${Object.keys(run.blueprints).length}|${
          run.tools.lockpick
        }|${run.tools.glove}|${run.tools.blade}|${run.booze}|${run.perfume}|${run.bag}`
      : '';

    this.storeRows.forEach((row, i) => {
      const entry = this.storeEntries[i];
      const visible = !!entry;

      row.bg.setVisible(visible);
      row.icon.setVisible(visible);
      row.name.setVisible(visible);
      row.info.setVisible(visible);
      row.price.setVisible(visible);
      if (row.bg.input) row.bg.input.enabled = visible;

      row.entry = entry || null;
      if (!entry) return;

      const free = entry.kind === 'recycle';
      const sellable = entry.kind === 'sell';
      const affordable = !!run && (free || sellable || run.money >= entry.price);

      row.icon.setTexture(entry.icon);
      row.name.setText(entry.name);
      this.fitRow(row.info, entry.desc, this.storeInfoW || 180, 12);
      row.price.setText(entry.owned ? '已拥有' : free ? '回收' : `${entry.price} 元`);

      row.name.setColor(entry.owned || affordable ? UI.cream : '#8a8070');
      row.info.setColor(entry.owned || affordable ? UI.creamDim : '#736a5c');
      row.price.setColor(entry.owned ? '#8a7a55' : affordable ? UI.gold : '#8a7a55');
      row.bg.setFillStyle(entry.owned ? UI.panelRowDim : UI.panelRow, 1);
    });
  }

  buyStock(row) {
    if (!this.street || !row.entry) return;

    const entry = row.entry;

    if (entry.kind === 'sell') {
      const paid = this.street.sellBatch ? this.street.sellBatch(entry.via, entry.refId) : 0;

      if (paid <= 0) {
        haptic('refuse');
        return;
      }

      playSfx('sell');
      haptic('sell');
      this.shown.storeSig = null;
      this.refreshStore();
      return;
    }

    if (entry.owned) {
      haptic('refuse');
      return;
    }

    const ok = this.street.buyStock(entry);
    if (!ok) {
      haptic('refuse');
      row.bg.setFillStyle(0x5a2f24, 1);
      this.time.delayedCall(170, () => this.refreshStore());
      return;
    }

    playSfx('buy');
    haptic('buy');
    this.shown.storeSig = null;
    this.refreshStore();

    // Shopkeepers remember a customer who keeps coming back.
    if (this.street && this.street.addFavor) {
      const favorId =
        this.storeId === 'black'
          ? 'cap'
          : this.storeId && this.storeId.indexOf('stall-') === 0
            ? 'stall'
            : 'zhang';

      this.street.addFavor(favorId, 8);
    }
  }

  // ------------------------------------------------------------- end of a run

  showOverlay(run) {
    this.overOpen = true;
    if (this.qte) {
      this.qte = null;
      this.qteLayer.setVisible(false);
      this.setLayerInput(this.qteLayer, false);
    }
    this.shopOpen = false;
    this.storeLayer.setVisible(false);
    this.setLayerInput(this.storeLayer, false);
    this.tradeOpen = false;
    this.hidePanel(this.tradeLayer);
    this.craftOpen = false;
    this.hidePanel(this.craftLayer);
    this.homeOpen = false;
    this.hidePanel(this.homeLayer);
    this.vendingOpen = false;
    this.hidePanel(this.vendingLayer);
    this.slotOpen = false;
    this.slotSpin = null;
    this.slotLayer.setVisible(false);
    this.setLayerInput(this.slotLayer, false);
    this.mapOpen = false;
    this.hidePanel(this.mapLayer);
    this.peddleOpen = false;
    this.peddleLayer.setVisible(false);
    this.setLayerInput(this.peddleLayer, false);
    this.testerOpen = false;
    this.testerLayer.setVisible(false);
    this.setLayerInput(this.testerLayer, false);
    this.winOpen = false;
    this.winLayer.setVisible(false);
    this.setLayerInput(this.winLayer, false);
    this.dialogueOpen = false;
    this.dialogueLayer.setVisible(false);
    this.setLayerInput(this.dialogueLayer, false);
    this.loreOpen = false;
    this.loreLayer.setVisible(false);
    this.setLayerInput(this.loreLayer, false);

    for (const pair of [
      ['begOpen', this.begLayer],
      ['bagOpen', this.bagLayer],
      ['goalsOpen', this.goalsLayer]
    ]) {
      this[pair[0]] = false;
      pair[1].setVisible(false);
      this.setLayerInput(pair[1], false);
    }

    this.releaseStick();

    const minutes = Math.floor(run.survived / 60);
    const seconds = run.survived % 60;
    const clock = minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;

    this.overStats.setText(
      [
        `乞讨所得  ${run.beggingIncome} 元`,
        `拾荒所得  ${run.scavengeIncome} 元`,
        `偷窃所得  ${run.stolenIncome} 元`,
        `卖废品  ${run.soldIncome} 元`,
        `合计  ${
          run.beggingIncome + run.scavengeIncome + run.stolenIncome + run.soldIncome
        } 元`,
        `背包物品  ${run.bag} 件`,
        `在街上撑了  ${clock}`,
        '进度停在最近一次存档'
      ].join('\n')
    );

    this.overLayer.setVisible(true);
    this.setLayerInput(this.overLayer, true);

    // The card is the only thing left on screen, so its one button has to work
    // whatever else was open when the beggar went down.
    if (this.restartBtn.input) this.restartBtn.input.enabled = true;
  }

  hideOverlay() {
    this.overOpen = false;
    this.overLayer.setVisible(false);
    this.setLayerInput(this.overLayer, false);
  }

  restartRun() {
    haptic('ui');
    this.hideOverlay();
    this.closeStore();
    this.closeTrade();
    this.closeCraft();
    this.closeHome();
    this.closeVending();
    this.closeSlot();
    this.closeMap();
    this.closePeddle();
    this.closeTester();
    this.begOpen = false;
    this.begLayer.setVisible(false);
    this.setLayerInput(this.begLayer, false);
    this.bagOpen = false;
    this.bagLayer.setVisible(false);
    this.setLayerInput(this.bagLayer, false);
    this.goalsOpen = false;
    this.goalsLayer.setVisible(false);
    this.setLayerInput(this.goalsLayer, false);
    this.winOpen = false;
    this.winLayer.setVisible(false);
    this.setLayerInput(this.winLayer, false);
    this.dialogueOpen = false;
    this.dialogueLayer.setVisible(false);
    this.setLayerInput(this.dialogueLayer, false);
    this.loreOpen = false;
    this.loreLayer.setVisible(false);
    this.setLayerInput(this.loreLayer, false);

    this.shown.money = null;
    this.shown.bag = null;
    this.shown.hunger = -1;
    this.shown.hint = null;
    this.shown.can = null;
    this.shown.canSteal = null;
    this.shown.tradeSig = null;
    this.shown.district = null;
    this.shown.craftSig = null;
    this.shown.storeSig = null;
    this.shown.homeSig = null;
    this.shown.goals = null;

    // The tap that restarts the run must not carry on into the street once it
    // is running again.
    this.uiSettleAt = this.time.now + 320;
    this.inputLockUntil = this.time.now + 320;

    if (this.street) this.street.restartRun();
  }

  // -------------------------------------------------------------------- frame

  update(time, delta) {
    const street = this.street;
    if (!street || !street.run) return;

    // Safety net: a thumb that leaves the screen without an ending event would
    // otherwise keep the beggar walking with the last direction it gave.
    if (this.stickId !== null) {
      const held = this.input.manager.pointers.find((p) => p.id === this.stickId);
      if (!held || !held.isDown) this.releaseStick();
    }

    const dt = Math.min(delta || 16, 60) / 1000;
    this.updateDrift(dt);
    if (this.qte) this.updateQte(dt);
    if (this.slotOpen) {
      this.updateSlot(dt);
      const money = street.run.money;
      if (money !== this.shown.slotMoney) this.refreshSlot();
    }

    const run = street.run;

    if (run.money !== this.shown.money) {
      const before = this.shown.money;
      this.shown.money = run.money;
      this.moneyText.setText(`${run.money} 元`);

      // Money arriving should be seen, not just counted: the chip gives a small
      // bounce when the number goes up.
      if (typeof before === 'number' && run.money > before) {
        this.tweens.killTweensOf(this.moneyText);
        this.moneyText.setScale(1);
        this.tweens.add({
          targets: this.moneyText,
          scaleX: 1.16,
          scaleY: 1.16,
          duration: 90,
          yoyo: true,
          ease: 'Quad.easeOut'
        });
      }
    }

    if (run.bag !== this.shown.bag) {
      this.shown.bag = run.bag;
      this.bagText.setText(String(run.bag));
    }

    const hp = Phaser.Math.Clamp(run.hunger / 100, 0, 1);
    if (Math.abs(hp - this.shown.hunger) > 0.003) {
      this.shown.hunger = hp;
      this.hungerFill.scaleX = this.barScale * Math.max(hp, 0.0001);
      this.hungerFill.fillColor = hp > 0.5 ? UI.good : hp > 0.22 ? UI.warn : UI.bad;
    }

    const en = Phaser.Math.Clamp(run.energy / 100, 0, 1);
    if (Math.abs(en - this.shown.energy) > 0.003) {
      this.shown.energy = en;
      this.energyFill.scaleX = this.barScale * Math.max(en, 0.0001);
      this.energyFill.fillColor = en > 0.3 ? 0x5aa7d9 : 0xd9563f;
    }

    const hint = street.getHint ? street.getHint() : '';
    if (hint !== this.shown.hint) {
      this.shown.hint = hint;
      this.hintText.setText(hint);
      this.hintText.setVisible(hint.length > 0);
    }

    const can = !run.over && (!!street.nearest || run.sitting);
    if (can !== this.shown.can) this.shown.can = can;

    const districtName = street.district ? street.district.name : '';
    if (districtName !== this.shown.district) {
      this.shown.district = districtName;
      this.districtText.setText(districtName);
    }

    const clock = street.getClockText ? street.getClockText() : '';
    if (clock !== this.shown.clock) {
      this.shown.clock = clock;
      this.clockText.setText(clock);
      this.clockText.setColor(
        street.isColdNight && street.isColdNight() ? '#f0a08a' : '#f2c46a'
      );
    }

    const wanted = Math.round(run.wanted || 0);
    if (wanted !== this.shown.wanted) {
      this.shown.wanted = wanted;
      this.wantedText.setText(`通缉 ${wanted}%`).setVisible(wanted > 0);
    }

    const goalSig = this.goalsSignature(run);
    if (goalSig !== this.shown.goals) {
      this.shown.goals = goalSig;
      this.refreshGoals();
    }

    const edge = street.getEdgeHint ? street.getEdgeHint() : '';
    if (edge !== this.shown.edge) {
      this.shown.edge = edge;
      this.edgeText.setText(edge).setVisible(edge.length > 0);
    }

    if (this.actionBtn) {
      const show = !this.qte && !this.overOpen;
      if (this.actionBtn.visible !== show) {
        this.actionBtn.setVisible(show);
        this.actionIcon.setVisible(show);
      }

      const open = this.anyPanelOpen();
      if (open !== this.shown.panelOpen) {
        this.shown.panelOpen = open;
        this.actionIcon.setTexture(open ? 'icon-x' : 'icon-hand');
        this.restoreActionBtn();
      }
    }

    if (this.tradeOpen) {
      const sig = `${run.money}|${run.bag}|${run.tools.lockpick}|${run.tools.coat}|${Object.values(
        run.goods
      ).join(',')}`;
      if (sig !== this.shown.tradeSig) this.refreshTrade();
    }

    if (this.craftOpen) {
      const sig = `${run.bag}|${Object.values(run.goods).join(',')}|${
        Object.keys(run.blueprints).length
      }`;
      if (sig !== this.shown.craftSig) this.refreshCraft();
    }

    if (this.homeOpen) {
      const comfort = street.homeComfort ? street.homeComfort() : 0;
      const sig = `${run.money}|${run.bag}|${Object.values(run.goods).join(',')}|${comfort}`;
      if (sig !== this.shown.homeSig) this.refreshHome();
    }

    if (run.over && !this.overOpen) this.showOverlay(run);
    else if (!run.over && this.overOpen) this.hideOverlay();

    if (this.shopOpen) {
      const sig = `${run.money}|${run.outfit}|${Object.keys(run.blueprints).length}|${
        run.tools.lockpick
      }|${run.bag}`;
      if (sig !== this.shown.storeSig) this.refreshStore();
    }
  }
}
