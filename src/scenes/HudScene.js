// The layer over the street: the money, hunger and bag readout along the top,
// the touch controls in the band beneath the playfield, the corner shop panel
// and the end-of-run card. It reads the street's run state every frame instead
// of being told about it, so a restarted street needs no rewiring.

import { registerIcons } from '../icons.js';
import { haptic } from '../haptics.js';
import { layoutFor } from '../layout.js';
import { FOODS } from '../food.js';
import { JUNK_ITEMS, JUNK_ORDER, TOOLS, junkPrice } from '../trade.js';
import { LOOT_ITEMS, LOOT_ORDER, lootPrice } from '../loot.js';
import { DISTRICTS, DISTRICT_ORDER, QUEST_TARGET } from '../districts.js';
import { STREET_ORDER, CITY_COLS, CITY_ROWS, cellOf, neighbourOf } from '../streets.js';
import { SHOPS, stockFor } from '../shops.js';
import { FURNITURE } from '../home.js';
import { COFFEE_PRICE, COFFEE_ENERGY, KICK_WANTED } from '../vending.js';
import { SLOT_COST, SLOT_SYMBOLS } from '../gamble.js';
import { RECIPES, amountOf, materialLabel } from '../craft.js';
import { FONT, UI } from '../style.js';

const DEPTH = {
  band: 10,
  control: 12,
  hud: 20,
  panel: 100,
  overlay: 200
};

const ROW_WIDTH = 300;
const ROW_HEIGHT = 56;

// Control sizes are fixed rather than derived per frame: the band is tall
// enough for them at its smallest, and leaving the circles alone keeps their
// stroke widths consistent.
const STICK_RADIUS = 62;
const KNOB_RADIUS = 26;
const STICK_THROW = 46;

const TRADE_ROW_WIDTH = 300;
const TRADE_ROW_HEIGHT = 42;
const TRADE_MAX_ROWS = 10;

const CRAFT_ROW_HEIGHT = 56;

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
      'factory'
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
      edge: null
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
    this.buildQte();
    this.buildStealChoice();
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
  }

  buildHud() {
    this.chipGfx = this.add.graphics().setDepth(DEPTH.hud - 1);

    this.coinIcon = this.add.image(0, 0, 'icon-coins').setDepth(DEPTH.hud);
    this.moneyText = this.add
      .text(0, 0, '0 元', {
        fontFamily: FONT,
        fontSize: '15px',
        color: UI.gold,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);

    this.bagIcon = this.add.image(0, 0, 'icon-backpack').setDepth(DEPTH.hud);
    this.bagText = this.add
      .text(0, 0, '0', {
        fontFamily: FONT,
        fontSize: '15px',
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
        fontSize: '13px',
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

    this.mapBtn.on('pointerdown', () => this.openMap());

    this.districtText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.creamDim
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.hud);

    this.toastText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '14px',
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
        fontSize: '12px',
        color: UI.creamDim,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);

    this.wantedText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#f0a08a'
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.hud)
      .setVisible(false);

    this.edgeText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: UI.cream,
        backgroundColor: 'rgba(20,16,12,0.78)',
        padding: { x: 8, y: 4 }
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.hud)
      .setVisible(false);
  }

  /// One panel serves every shop: the owner and the stock change, the shape
  /// stays the same.
  buildStore() {
    this.storeLayer = this.add.container(0, 0).setDepth(DEPTH.panel).setVisible(false);

    this.storeBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.storeBackdrop.on('pointerdown', () => this.closeStore());

    this.storePanelGfx = this.add.graphics();

    this.storeTitle = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.storeSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.storeCloseBtn = this.add
      .circle(0, 0, 17, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.storeCloseIcon = this.add.image(0, 0, 'icon-x');
    this.storeCloseBtn.on('pointerdown', () => this.closeStore());

    this.storeLayer.add([
      this.storeBackdrop,
      this.storePanelGfx,
      this.storeTitle,
      this.storeSub,
      this.storeCloseBtn,
      this.storeCloseIcon
    ]);

    this.storeRows = [];

    for (let i = 0; i < 8; i++) {
      const bg = this.add
        .rectangle(0, 0, ROW_WIDTH, ROW_HEIGHT, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(0, 0, 'icon-sandwich');
      const name = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
        .setOrigin(0, 0.5);
      const price = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '16px',
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
    this.tradeBackdrop.on('pointerdown', () => this.closeTrade());

    this.tradePanelGfx = this.add.graphics();

    this.tradeTitle = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.tradeSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
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
        .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
        .setOrigin(0, 0.5);
      const price = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '15px',
          color: UI.gold,
          fontStyle: 'bold'
        })
        .setOrigin(1, 0.5);

      const useBtn = this.add
        .rectangle(0, 0, 34, 24, 0x3a4a2c, 1)
        .setStrokeStyle(1.5, UI.good, 0.85)
        .setInteractive()
        .setVisible(false);
      const useText = this.add
        .text(0, 0, '用', {
          fontFamily: FONT,
          fontSize: '12px',
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
        fontSize: '14px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);
    this.sellAllBtn.on('pointerdown', () => this.sellAll());

    this.tradeCloseBtn = this.add
      .circle(0, 0, 17, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.tradeCloseIcon = this.add.image(0, 0, 'icon-x');
    this.tradeCloseBtn.on('pointerdown', () => this.closeTrade());

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
    this.qteBackdrop.on('pointerdown', () => this.resolveQte());

    this.qteGfx = this.add.graphics();

    this.qteTitle = this.add
      .text(0, 0, '扒钱包', {
        fontFamily: FONT,
        fontSize: '15px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.qteTip = this.add
      .text(0, 0, '滑块进绿区时点击', {
        fontFamily: FONT,
        fontSize: '12px',
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
    this.stealChoiceBackdrop.on('pointerdown', () => this.closeStealChoice());

    this.stealChoiceGfx = this.add.graphics();

    this.stealChoiceTitle = this.add
      .text(0, 0, '要偷什么？', {
        fontFamily: FONT,
        fontSize: '14px',
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

    const modes = ['money', 'item', 'perfume'];

    for (let i = 0; i < modes.length; i++) {
      const bg = this.add
        .rectangle(0, 0, 1, 1, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(
        0,
        0,
        i === 0 ? 'icon-hand-coins' : i === 1 ? 'icon-hand' : 'icon-zap'
      );
      const name = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '14px',
          color: UI.cream,
          fontStyle: 'bold'
        })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
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

    const purse = options ? options.purse : 0;
    const loot = options && options.loot ? LOOT_ITEMS[options.loot] : null;
    const perfume = this.street && this.street.run ? this.street.run.perfume || 0 : 0;

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
        icon: 'icon-zap',
        name: '迷幻香水',
        info: perfume > 0 ? `${perfume} 瓶 · 直接得手，不用 QTE` : '没有香水',
        ok: perfume > 0
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
      this.stealChoiceOpen
    )
      return;

    const options =
      this.street && this.street.stealOptions ? this.street.stealOptions() : null;

    if (!options || (options.purse <= 0 && !options.loot)) {
      haptic('refuse');
      return;
    }

    this.stealChoiceOpen = true;
    this.stealChoiceLayer.setVisible(true);
    this.setLayerInput(this.stealChoiceLayer, true);
    this.releaseStick();
    this.layoutStealChoice();
    this.refreshStealChoice();
    haptic('ui');
  }

  closeStealChoice() {
    if (!this.stealChoiceOpen) return;
    this.stealChoiceOpen = false;
    this.stealChoiceLayer.setVisible(false);
    this.setLayerInput(this.stealChoiceLayer, false);
    haptic('ui');
  }

  pickStealMode(row) {
    if (!row.enabled) {
      haptic('refuse');
      return;
    }

    const mode = row.mode;
    this.closeStealChoice();

    if (mode === 'perfume') {
      if (this.street && !this.street.perfumeSteal()) haptic('refuse');
      return;
    }

    if (this.street) this.street.trySteal(mode);
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
        fontSize: '22px',
        color: '#f4e9d4',
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);

    this.overSub = this.add
      .text(0, 0, '街上没人理会你。', {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.creamDim
      })
      .setOrigin(0.5, 0.5);

    this.overStats = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: UI.cream,
        align: 'center',
        lineSpacing: 6
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
        fontSize: '15px',
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

    g.fillStyle(0x1a1611, 0.82);
    g.fillRoundedRect(12, 26, 108, 30, 10);
    g.fillRoundedRect(w - 92, 26, 80, 30, 10);
    g.fillRoundedRect(12, 60, 150, 24, 8);
    g.fillRoundedRect(12, 88, 150, 24, 8);

    const iconScale = 26 / 96;

    this.coinIcon.setPosition(30, 41).setScale(iconScale);
    this.moneyText.setPosition(46, 41);

    this.bagIcon.setPosition(w - 70, 41).setScale(iconScale);
    this.bagText.setPosition(w - 24, 41);

    this.hungerIcon.setPosition(28, 72).setScale(22 / 96);

    const barX = 42;
    const barW = 108;
    this.barScale = barW / 118;

    this.hungerTrack.setPosition(barX, 72).setScale(this.barScale, 1);
    this.hungerFill.setPosition(barX, 72).setScale(this.barScale, 1);

    this.energyIcon.setPosition(28, 100).setScale(22 / 96);
    this.energyTrack.setPosition(barX, 100).setScale(this.barScale, 1);
    this.energyFill.setPosition(barX, 100).setScale(this.barScale, 1);

    this.hintText.setPosition(w / 2, playH - 12);

    this.mapBtn.setPosition(w - 34, 84);
    this.mapIcon.setPosition(w - 34, 84);
    this.districtText.setPosition(w / 2, 41);
    this.clockText.setPosition(14, 13);
    this.wantedText.setPosition(w - 34, 118);
    this.edgeText.setPosition(w / 2, 116);
    this.toastText.setPosition(w / 2, playH * 0.28);
  }

  layoutControls() {
    this.releaseStick();
    if (this.edgeFlash) this.edgeFlash.setSize(this.w, this.h).setPosition(0, 0);
  }

  /// Panels live inside containers, and a hidden container's children can still
  /// answer taps, so their input is switched off with the panel.
  setLayerInput(layer, enabled) {
    layer.list.forEach((child) => {
      if (child.input) child.input.enabled = enabled;
    });
  }

  layoutStore() {
    const w = this.w;
    const count = Math.max(1, this.storeEntries.length);
    const rowH = ROW_HEIGHT;
    const gap = 8;
    const pw = Math.min(w - 32, ROW_WIDTH + 24);
    const ph = 56 + count * (rowH + gap) + 20;
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
    this.storeSub.setPosition(px + 18, py + 36);

    this.storeCloseBtn.setPosition(px + pw - 26, py + 26);
    this.storeCloseIcon.setPosition(px + pw - 26, py + 26).setScale(17 / 96);

    const rowW = pw - 24;
    const rowX = px + 12;
    const rowScale = rowW / ROW_WIDTH;

    this.storeRows.forEach((row, i) => {
      const ry = py + 56 + rowH / 2 + i * (rowH + gap);

      row.bg.setScale(rowScale, 1).setPosition(rowX, ry);
      row.icon.setPosition(rowX + 26, ry).setScale(24 / 96);
      row.name.setPosition(rowX + 48, ry - 8);
      row.info.setPosition(rowX + 48, ry + 11);
      row.price.setPosition(rowX + rowW - 12, ry);
    });
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
    this.tradeCloseIcon.setPosition(px + pw - 26, py + 24).setScale(17 / 96);

    const rowW = pw - 24;
    const rowX = px + 12;
    const rowScale = rowW / TRADE_ROW_WIDTH;

    this.tradeRows.forEach((row, i) => {
      const ry = py + 46 + TRADE_ROW_HEIGHT / 2 + i * (TRADE_ROW_HEIGHT + gap);

      row.bg.setScale(rowScale, 1).setPosition(rowX, ry);
      row.icon.setPosition(rowX + 26, ry);
      row.name.setPosition(rowX + 50, ry - 8);
      row.info.setPosition(rowX + 50, ry + 11);
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
    const ph = 264;
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
      this.stealChoiceOpen
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
      this.stealChoiceOpen
    )
      return;

    if (!this.street) return;

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

    if (!reachable && !this.street.stealTarget) {
      haptic('refuse');
      return;
    }

    this.tapFlash(pointer.x, pointer.y);

    if (!this.street.nearest && this.street.stealTarget) {
      this.openStealChoice();
      return;
    }

    this.flashEdges();
    haptic('ui');
    this.street.tryInteract();
  }

  /// A white ring where the tap landed.
  tapFlash(x, y) {
    const ring = this.add
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

  // --------------------------------------------------------------------- shop

  openStore(id) {
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
    this.storeLayer.setVisible(true);
    this.setLayerInput(this.storeLayer, true);
    this.releaseStick();
    this.shown.storeSig = null;
    this.layoutStore();
    this.refreshStore();
    haptic('ui');
  }

  closeStore() {
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

    if (this.tradeMode === 'pawn') {
      for (const tool of TOOLS) entries.push({ kind: 'tool', id: tool.id });
    }

    for (const id of LOOT_ORDER) {
      if (run && (run.loot[id] || 0) > 0) entries.push({ kind: 'loot', id });
    }

    // Only what is actually in the bag: every district drops its own litter, so
    // the full list would never fit the panel.
    for (const id of JUNK_ORDER) {
      if (run && (run.items[id] || 0) > 0) entries.push({ kind: 'junk', id });
    }

    if (run) {
      for (const rec of RECIPES) {
        if ((run.goods[rec.id] || 0) > 0) entries.push({ kind: 'good', id: rec.id });
      }
    }

    return entries.slice(0, TRADE_MAX_ROWS);
  }

  openTrade(mode) {
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
    this.tradeLayer.setVisible(true);
    this.setLayerInput(this.tradeLayer, true);
    this.releaseStick();
    this.shown.tradeSig = null;
    this.layoutTrade();
    this.refreshTrade();
    haptic('ui');
  }

  closeTrade() {
    if (!this.tradeOpen) return;
    this.tradeOpen = false;
    this.tradeLayer.setVisible(false);
    this.setLayerInput(this.tradeLayer, false);
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
    this.craftBackdrop.on('pointerdown', () => this.closeCraft());

    this.craftPanelGfx = this.add.graphics();

    this.craftTitle = this.add
      .text(0, 0, '工作台 · 合成', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.craftSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.craftCloseBtn = this.add
      .circle(0, 0, 17, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.craftCloseIcon = this.add.image(0, 0, 'icon-x');
    this.craftCloseBtn.on('pointerdown', () => this.closeCraft());

    this.craftHint = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
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

    this.craftRows = RECIPES.map((rec) => {
      const bg = this.add
        .rectangle(0, 0, ROW_WIDTH, CRAFT_ROW_HEIGHT, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(0, 0, rec.tex);
      const name = this.add
        .text(0, 0, rec.name, { fontFamily: FONT, fontSize: '14px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
        .setOrigin(0, 0.5);
      const value = this.add
        .text(0, 0, `${rec.value} 元`, {
          fontFamily: FONT,
          fontSize: '14px',
          color: UI.gold,
          fontStyle: 'bold'
        })
        .setOrigin(1, 0.5);
      const state = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
        .setOrigin(1, 0.5);

      bg.on('pointerdown', () => this.craftRecipe(rec));
      this.craftLayer.add([bg, icon, name, info, value, state]);

      return { bg, icon, name, info, value, state, rec };
    });
  }

  layoutCraft() {
    const w = this.w;
    const count = this.craftRows.length;
    const gap = 6;
    const pw = Math.min(w - 32, ROW_WIDTH + 24);
    const ph = 56 + count * (CRAFT_ROW_HEIGHT + gap) + 24;
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
    this.craftCloseIcon.setPosition(px + pw - 26, py + 26).setScale(17 / 96);
    this.craftHint.setPosition(w / 2, py + ph - 14);

    const rowW = pw - 24;
    const rowX = px + 12;
    const rowScale = rowW / ROW_WIDTH;

    this.craftRows.forEach((row, i) => {
      const ry = py + 56 + CRAFT_ROW_HEIGHT / 2 + i * (CRAFT_ROW_HEIGHT + gap);

      row.bg.setScale(rowScale, 1).setPosition(rowX, ry);
      row.icon.setPosition(rowX + 26, ry).setScale(1.2);
      row.name.setPosition(rowX + 48, ry - 9);
      row.info.setPosition(rowX + 48, ry + 10);
      row.value.setPosition(rowX + rowW - 12, ry - 9);
      row.state.setPosition(rowX + rowW - 12, ry + 10);
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
    this.craftLayer.setVisible(true);
    this.setLayerInput(this.craftLayer, true);
    this.releaseStick();
    this.shown.craftSig = null;
    this.layoutCraft();
    this.refreshCraft();
    haptic('ui');
  }

  closeCraft() {
    if (!this.craftOpen) return;
    this.craftOpen = false;
    this.craftLayer.setVisible(false);
    this.setLayerInput(this.craftLayer, false);
    haptic('ui');
  }

  refreshCraft() {
    const run = this.street && this.street.run ? this.street.run : null;

    if (run) {
      const held = JUNK_ORDER.filter((id) => (run.items[id] || 0) > 0)
        .map((id) => `${JUNK_ITEMS[id].name} ${run.items[id]}`)
        .join(' · ');

      this.craftSub.setText(held || '包里没有废品');
      this.shown.craftSig = `${run.bag}|${Object.values(run.goods).join(',')}|${
        Object.keys(run.blueprints).length
      }`;
    }

    for (const row of this.craftRows) {
      const rec = row.rec;
      const locked = rec.blueprint && !(run && run.blueprints[rec.id]);
      const enough =
        !!run &&
        Object.keys(rec.need).every((id) => amountOf(run, id) >= rec.need[id]);

      const needs = Object.keys(rec.need)
        .map((id) => `${materialLabel(id)} ${run ? amountOf(run, id) : 0}/${rec.need[id]}`)
        .join(' · ');

      row.info.setText(needs);
      row.info.setColor(enough ? UI.creamDim : '#8a7a66');
      row.name.setColor(locked ? '#8a8070' : UI.cream);

      if (locked) {
        row.state.setText('需要图纸').setColor('#b0705e');
      } else if (enough) {
        row.state.setText('可合成').setColor('#8fd07a');
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
      this.craftHint.setText(`合成了 ${rec.name}`);
      return;
    }

    haptic('refuse');
    this.craftHint.setText(result === 'locked' ? `还没有 ${rec.name} 的图纸` : '材料不够');
  }

  // ---------------------------------------------------------------- the nook

  buildHome() {
    this.homeLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.homeBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.homeBackdrop.on('pointerdown', () => this.closeHome());

    this.homePanelGfx = this.add.graphics();
    this.homeRoomGfx = this.add.graphics();

    this.homeTitle = this.add
      .text(0, 0, '城郊营地 · 家', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.homeSub = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.homeCloseBtn = this.add
      .circle(0, 0, 17, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.homeCloseIcon = this.add.image(0, 0, 'icon-x');
    this.homeCloseBtn.on('pointerdown', () => this.closeHome());

    this.slotLabels = FURNITURE.map((item) =>
      this.add
        .text(0, 0, item.name, {
          fontFamily: FONT,
          fontSize: '10px',
          color: '#6b6257'
        })
        .setOrigin(0.5, 0.5)
    );

    this.homeItems = FURNITURE.map((item) =>
      this.add.image(0, 0, item.tex).setVisible(false)
    );

    this.sleepBtn = this.add
      .rectangle(0, 0, 200, 40, 0x4a3a24, 1)
      .setStrokeStyle(2, UI.amberBright, 0.9)
      .setInteractive();
    this.sleepText = this.add
      .text(0, 0, '睡一觉', {
        fontFamily: FONT,
        fontSize: '14px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);
    this.sleepBtn.on('pointerdown', () => this.sleepHome());

    this.homeHint = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: UI.creamDim,
        align: 'center',
        wordWrap: { width: 300 }
      })
      .setOrigin(0.5, 0);

    this.homeLayer.add([
      this.homeBackdrop,
      this.homePanelGfx,
      this.homeRoomGfx,
      this.homeTitle,
      this.homeSub,
      this.homeCloseBtn,
      this.homeCloseIcon,
      ...this.slotLabels,
      ...this.homeItems,
      this.sleepBtn,
      this.sleepText,
      this.homeHint
    ]);

    this.homeRows = FURNITURE.map((item) => {
      const bg = this.add
        .rectangle(0, 0, ROW_WIDTH, 46, UI.panelRow, 1)
        .setOrigin(0, 0.5)
        .setInteractive();
      const icon = this.add.image(0, 0, item.tex);
      const name = this.add
        .text(0, 0, item.name, { fontFamily: FONT, fontSize: '14px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
        .setOrigin(0, 0.5);
      const state = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '12px', color: UI.creamDim })
        .setOrigin(1, 0.5);

      bg.on('pointerdown', () => this.placeFurnitureItem(item));
      this.homeLayer.add([bg, icon, name, info, state]);

      return { bg, icon, name, info, state, item };
    });
  }

  layoutHome() {
    const w = this.w;
    const count = this.homeRows.length;
    const roomH = 132;
    const rowH = 46;
    const gap = 6;
    const ph = 52 + roomH + 12 + count * (rowH + gap) + 52 + 20;
    const pw = Math.min(w - 32, 340);
    const px = (w - pw) / 2;
    const py = Math.max(44, (this.playH - ph) / 2);

    this.homeBackdrop.setScale(w, this.h).setPosition(0, 0);

    const g = this.homePanelGfx;
    g.clear();
    g.fillStyle(UI.panel, 0.97);
    g.fillRoundedRect(px, py, pw, ph, 16);
    g.lineStyle(2, UI.amber, 0.6);
    g.strokeRoundedRect(px, py, pw, ph, 16);

    this.homeTitle.setPosition(px + 18, py + 14);
    this.homeSub.setPosition(px + 18, py + 34);
    this.homeCloseBtn.setPosition(px + pw - 26, py + 26);
    this.homeCloseIcon.setPosition(px + pw - 26, py + 26).setScale(17 / 96);

    const room = { x: px + 16, y: py + 52, w: pw - 32, h: roomH };
    this.homeRoom = room;

    const rg = this.homeRoomGfx;
    rg.clear();
    rg.fillStyle(0x241d16, 1);
    rg.fillRoundedRect(room.x, room.y, room.w, room.h, 10);
    rg.fillStyle(0x2f261c, 1);
    rg.fillRect(room.x + 4, room.y + 4, room.w - 8, room.h * 0.62);
    rg.fillStyle(0x1c1610, 1);
    rg.fillRect(room.x + 4, room.y + room.h * 0.66, room.w - 8, room.h * 0.3);
    rg.lineStyle(1, 0x3a2f24, 1);
    for (let y = room.y + 16; y < room.y + room.h * 0.6; y += 14) {
      rg.lineBetween(room.x + 4, y, room.x + room.w - 4, y);
    }

    // A lived-in corner: workbench, shelf, pile of scrap.
    const benchX = room.x + 10;
    const benchY = room.y + 20;
    rg.fillStyle(0x4a3a26, 1);
    rg.fillRect(benchX, benchY + 12, 12, 14);
    rg.fillRect(benchX + 46, benchY + 12, 12, 14);
    rg.fillStyle(0x7a5c3a, 1);
    rg.fillRect(benchX, benchY, 58, 13);
    rg.fillStyle(0x8d6a44, 1);
    rg.fillRect(benchX, benchY, 58, 5);
    rg.fillStyle(0x8a8f96, 1);
    rg.fillRect(benchX + 6, benchY - 6, 12, 8);
    rg.fillStyle(0xc6ccd4, 1);
    rg.fillRect(benchX + 40, benchY - 4, 10, 6);

    const shelfX = room.x + room.w - 48;
    rg.fillStyle(0x3f3222, 1);
    rg.fillRect(shelfX, benchY - 6, 40, 44);
    rg.fillStyle(0x2a2218, 1);
    rg.fillRect(shelfX + 3, benchY - 3, 34, 17);
    rg.fillRect(shelfX + 3, benchY + 18, 34, 17);
    rg.fillStyle(0x8a7a5a, 1);
    rg.fillRect(shelfX + 6, benchY + 2, 8, 9);
    rg.fillStyle(0x6f7a3f, 1);
    rg.fillRect(shelfX + 18, benchY + 1, 6, 10);
    rg.fillStyle(0xa8483a, 1);
    rg.fillRect(shelfX + 8, benchY + 22, 9, 9);
    rg.fillStyle(0x6a5236, 1);
    rg.fillRect(shelfX + 22, benchY + 23, 10, 8);

    // Scrap in the corner.
    rg.fillStyle(0x6a4a2c, 1);
    rg.fillRect(room.x + 8, room.y + room.h - 24, 32, 14);
    rg.fillStyle(0x8a6a44, 1);
    rg.fillRect(room.x + 12, room.y + room.h - 29, 26, 10);
    rg.fillStyle(0x9a5a3f, 1);
    rg.fillRect(room.x + 42, room.y + room.h - 19, 12, 10);

    rg.lineStyle(2, UI.amber, 0.35);
    rg.strokeRoundedRect(room.x, room.y, room.w, room.h, 10);

    const slotPos = (nx, ny) => ({
      x: room.x + room.w * nx,
      y: room.y + room.h * ny
    });
    const spots = [slotPos(0.2, 0.62), slotPos(0.5, 0.58), slotPos(0.82, 0.5), slotPos(0.5, 0.9)];

    FURNITURE.forEach((item, i) => {
      this.slotLabels[i].setPosition(spots[i].x, spots[i].y);
      this.homeItems[i].setPosition(spots[i].x, spots[i].y);
    });

    const rowX = px + 12;
    const rowW = pw - 24;
    const rowScale = rowW / ROW_WIDTH;
    const rowsTop = room.y + room.h + 12;

    this.homeRows.forEach((row, i) => {
      const ry = rowsTop + rowH / 2 + i * (rowH + gap);

      row.bg.setScale(rowScale, 1).setPosition(rowX, ry);
      row.icon.setPosition(rowX + 24, ry).setScale(0.8);
      row.name.setPosition(rowX + 46, ry - 8);
      row.info.setPosition(rowX + 46, ry + 10);
      row.state.setPosition(rowX + rowW - 10, ry);
    });

    const btnY = rowsTop + count * (rowH + gap) + 22;
    this.sleepBtn.setScale(rowW / 200, 1).setPosition(w / 2, btnY);
    this.sleepText.setPosition(w / 2, btnY);
    this.homeHint.setPosition(w / 2, btnY + 26);
    this.homeHint.setWordWrapWidth(rowW - 20);
  }

  openHome() {
    if (this.overOpen || this.shopOpen || this.tradeOpen || this.mapOpen || this.craftOpen || this.qte)
      return;

    this.homeOpen = true;
    this.homeLayer.setVisible(true);
    this.setLayerInput(this.homeLayer, true);
    this.releaseStick();
    this.shown.homeSig = null;
    this.layoutHome();
    this.refreshHome();
    haptic('ui');
  }

  closeHome() {
    if (!this.homeOpen) return;
    this.homeOpen = false;
    this.homeLayer.setVisible(false);
    this.setLayerInput(this.homeLayer, false);
    haptic('ui');
  }

  refreshHome() {
    const street = this.street;
    const run = street && street.run ? street.run : null;
    const comfort = street && street.homeComfort ? street.homeComfort() : 0;

    this.shown.homeSig = run
      ? `${run.money}|${run.bag}|${Object.values(run.goods).join(',')}|${comfort}`
      : '';

    const placedCount = FURNITURE.filter(
      (item) => street && street.homePlaced[item.slot] === item.id
    ).length;

    this.homeSub.setText(`舒适度 ${comfort} · 摆好 ${placedCount}/${FURNITURE.length}`);

    this.homeRows.forEach((row, i) => {
      const item = row.item;
      const state = street ? street.furnitureState(item) : 'short';
      const placed = state === 'owned';

      this.homeItems[i].setVisible(placed);
      this.slotLabels[i].setVisible(!placed);

      let cost;
      if (item.price > 0) {
        cost = `${item.price} 元`;
      } else {
        cost = Object.keys(item.need)
          .map((id) => `${materialLabel(id)} ${run ? amountOf(run, id) : 0}/${item.need[id]}`)
          .join(' · ');
      }
      row.info.setText(cost);

      if (placed) {
        row.state.setText('已摆好').setColor(UI.gold);
      } else if (state === 'ok') {
        row.state.setText('可以放').setColor('#8fd07a');
      } else if (state === 'poor') {
        row.state.setText('钱不够').setColor('#8a8070');
      } else {
        row.state.setText('材料不够').setColor('#8a8070');
      }

      row.name.setColor(placed || state === 'ok' ? UI.cream : '#8a8070');
      row.info.setColor(placed || state === 'ok' ? UI.creamDim : '#736a5c');
      row.bg.setFillStyle(placed ? UI.panelRowDim : UI.panelRow, 1);
    });

    if (comfort >= 8) {
      this.homeHint.setText('火堆噼啪响着，你第一次觉得这个帐篷像个家。');
    } else {
      this.homeHint.setText(
        `睡一觉：进入下一天，精力 +${35 + comfort * 7} · 饱食 +${20 + comfort * 4}`
      );
    }
  }

  placeFurnitureItem(item) {
    if (!this.street) return;

    const result = this.street.placeFurniture(item);
    if (result === 'owned') {
      haptic('refuse');
      this.homeHint.setText('这件已经摆好了');
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

    this.shown.homeSig = null;
    this.refreshHome();
    this.homeHint.setText(
      `第 ${rest.day} 天 · 精力 +${Math.round(rest.energy)} · 饱食 +${Math.round(
        rest.hunger
      )}\n昨天：乞讨 ${s.begging} · 拾荒 ${s.scavenge} · 偷 ${s.stolen} · 卖 ${s.sold} 元`
    );
  }

  // ----------------------------------------------------------- the vending box

  buildVending() {
    this.vendingLayer = this.add.container(0, 0).setDepth(DEPTH.panel + 1).setVisible(false);

    this.vendingBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x0b0906, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.vendingBackdrop.on('pointerdown', () => this.closeVending());

    this.vendingPanelGfx = this.add.graphics();

    this.vendingTitle = this.add
      .text(0, 0, '自动售货机', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.vendingSub = this.add
      .text(0, 0, '投币买一罐，或者踹一脚', {
        fontFamily: FONT,
        fontSize: '11px',
        color: UI.creamDim
      })
      .setOrigin(0, 0);

    this.vendingCloseBtn = this.add
      .circle(0, 0, 17, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.vendingCloseIcon = this.add.image(0, 0, 'icon-x');
    this.vendingCloseBtn.on('pointerdown', () => this.closeVending());

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
        .text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: UI.cream })
        .setOrigin(0, 0.5);
      const info = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
        .setOrigin(0, 0.5);
      const price = this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: '15px',
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
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
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
    this.vendingCloseIcon.setPosition(px + pw - 26, py + 26).setScale(17 / 96);

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
    this.vendingLayer.setVisible(true);
    this.setLayerInput(this.vendingLayer, true);
    this.releaseStick();
    this.layoutVending();
    this.refreshVending();
    haptic('ui');
  }

  closeVending() {
    if (!this.vendingOpen) return;
    this.vendingOpen = false;
    this.vendingLayer.setVisible(false);
    this.setLayerInput(this.vendingLayer, false);
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
    this.slotBackdrop.on('pointerdown', () => this.closeSlot());

    this.slotPanelGfx = this.add.graphics();

    this.slotTitle = this.add
      .text(0, 0, '老虎机', {
        fontFamily: FONT,
        fontSize: '16px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0, 0);

    this.slotSub = this.add
      .text(0, 0, `拉一次 ${SLOT_COST} 元，三个一样就中`, {
        fontFamily: FONT,
        fontSize: '11px',
        color: UI.creamDim
      })
      .setOrigin(0, 0);

    this.slotCloseBtn = this.add
      .circle(0, 0, 17, 0x3a3128, 0.95)
      .setStrokeStyle(2, UI.amber, 0.8)
      .setInteractive();
    this.slotCloseIcon = this.add.image(0, 0, 'icon-x');
    this.slotCloseBtn.on('pointerdown', () => this.closeSlot());

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
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: UI.gold })
      .setOrigin(0.5, 0.5);

    this.slotPullBtn = this.add
      .rectangle(0, 0, 200, 40, 0x4a3a24, 1)
      .setStrokeStyle(2, UI.amberBright, 0.9)
      .setInteractive();
    this.slotPullText = this.add
      .text(0, 0, '拉一把', {
        fontFamily: FONT,
        fontSize: '14px',
        color: UI.cream,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5);
    this.slotPullBtn.on('pointerdown', () => this.pullSlot());

    this.slotHint = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
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
    this.slotCloseIcon.setPosition(px + pw - 26, py + 26).setScale(17 / 96);

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
    this.slotLayer.setVisible(true);
    this.setLayerInput(this.slotLayer, true);
    this.releaseStick();
    this.shown.slotMoney = null;
    this.layoutSlot();
    this.refreshSlot();
    haptic('ui');
  }

  closeSlot() {
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
    this.mapBackdrop.on('pointerdown', () => this.closeMap());

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
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
      .setOrigin(0, 0);

    this.mapHint = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: UI.creamDim })
      .setOrigin(0.5, 0.5);

    this.mapCloseBtn = this.add
      .circle(0, 0, 17, 0x1a1510, 0.95)
      .setStrokeStyle(1.5, 0xd8c8a8, 0.6)
      .setInteractive();
    this.mapCloseIcon = this.add.image(0, 0, 'icon-x');
    this.mapCloseBtn.on('pointerdown', () => this.closeMap());

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
          fontSize: '12px',
          color: UI.cream,
          fontStyle: 'bold'
        })
        .setOrigin(0.5, 0);

      const status = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '10px', color: UI.creamDim })
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
        fontSize: '11px',
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
    this.mapCloseIcon.setPosition(px + pw - 26, py + 26).setScale(16 / 96);
    this.mapHint.setPosition(w / 2, py + ph - 22);

    for (const id of DISTRICT_ORDER) {
      const block = this.mapBlocks[id];
      const c = this.blockCentre(id);

      block.plate.setPosition(c.x, c.y);
      block.icon.setPosition(c.x, c.y);
      block.label.setPosition(c.x, c.y + 30);
      block.status.setPosition(c.x, c.y + 46);
      block.lock.setPosition(c.x + 19, c.y - 19);
      block.star.setPosition(c.x - 19, c.y - 19);
      block.zone.setScale(104, 104).setPosition(c.x, c.y + 8);
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
      block.status
        .setText(current ? '我在这里' : locked ? '还没解锁' : '走过去就行')
        .setColor(current ? '#8fd07a' : locked ? '#5a554c' : UI.creamDim);

      block.lock.setVisible(locked).setTint(0x8a8070);
      block.star.setVisible(id === QUEST_TARGET.district).setTint(0xf2c46a);
    }

    const here = this.blockCentre(currentId);
    this.mapRing.setPosition(here.x, here.y);
    this.mapHereTag.setPosition(here.x, here.y - 40);

    this.mapSub.setText('你的城市 · 顺着街道一直走');
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
    this.mapLayer.setVisible(true);
    this.setLayerInput(this.mapLayer, true);
    this.releaseStick();
    this.refreshMap();
    haptic('ui');
  }

  closeMap() {
    if (!this.mapOpen) return;
    this.mapOpen = false;
    this.mapLayer.setVisible(false);
    this.setLayerInput(this.mapLayer, false);
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
      this.mapHint.setText(`${DISTRICTS[id].name}还锁着`);
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
    this.tradeSub.setText(
      atPawn ? '废品给价高，也卖些趁手的家伙' : '把包里的废品换成零钱'
    );

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

        row.icon.setTexture(item.tex).setScale(1.2);
        row.name.setText(item.name);
        row.info.setText(`持有 ${have} · ${item.use}`);
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

        row.icon.setTexture(item.tex).setScale(1.2);
        row.name.setText(item.name);
        row.info.setText(`${item.place} · ${item.use} · 持有 ${have}`);
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

        row.icon.setTexture(rec.tex).setScale(1.2);
        row.name.setText(rec.name);
        row.info.setText(`持有 ${have} 个 · 单价 ${rec.value} 元`);
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

      row.icon.setTexture(tool.tex).setScale(1.2);
      row.name.setText(tool.name);
      row.info.setText(owned ? '已经在身上了' : tool.blurb);
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

    haptic('sell');
    this.refreshTrade();
  }

  refreshStore() {
    const run = this.street && this.street.run ? this.street.run : null;
    const shop = SHOPS.find((s) => s.id === this.storeId);

    this.storeTitle.setText(shop ? shop.name : '');
    this.storeSub.setText(shop ? `${shop.owner}：${shop.blurb}` : '');

    this.storeEntries = stockFor(this.storeId, run);

    this.shown.storeSig = run
      ? `${run.money}|${run.outfit}|${Object.keys(run.blueprints).length}|${
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

      const affordable = !!run && run.money >= entry.price;

      row.icon.setTexture(entry.icon);
      row.name.setText(entry.name);
      row.info.setText(entry.desc);
      row.price.setText(entry.owned ? '已拥有' : `${entry.price} 元`);

      row.name.setColor(entry.owned || affordable ? UI.cream : '#8a8070');
      row.info.setColor(entry.owned || affordable ? UI.creamDim : '#736a5c');
      row.price.setColor(entry.owned ? '#8a7a55' : affordable ? UI.gold : '#8a7a55');
      row.bg.setFillStyle(entry.owned ? UI.panelRowDim : UI.panelRow, 1);
    });
  }

  buyStock(row) {
    if (!this.street || !row.entry) return;

    const entry = row.entry;
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

    haptic('buy');
    this.shown.storeSig = null;
    this.refreshStore();
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
    this.tradeLayer.setVisible(false);
    this.setLayerInput(this.tradeLayer, false);
    this.craftOpen = false;
    this.craftLayer.setVisible(false);
    this.setLayerInput(this.craftLayer, false);
    this.homeOpen = false;
    this.homeLayer.setVisible(false);
    this.setLayerInput(this.homeLayer, false);
    this.vendingOpen = false;
    this.vendingLayer.setVisible(false);
    this.setLayerInput(this.vendingLayer, false);
    this.slotOpen = false;
    this.slotSpin = null;
    this.slotLayer.setVisible(false);
    this.setLayerInput(this.slotLayer, false);
    this.mapOpen = false;
    this.mapLayer.setVisible(false);
    this.setLayerInput(this.mapLayer, false);
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
        `背包物品  ${run.bag} 件`,
        `在街上撑了  ${clock}`
      ].join('\n')
    );

    this.overLayer.setVisible(true);
    this.setLayerInput(this.overLayer, true);
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
    if (this.qte) this.updateQte(dt);
    if (this.slotOpen) {
      this.updateSlot(dt);
      const money = street.run.money;
      if (money !== this.shown.slotMoney) this.refreshSlot();
    }

    const run = street.run;

    if (run.money !== this.shown.money) {
      this.shown.money = run.money;
      this.moneyText.setText(`${run.money} 元`);
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
      this.clockText.setColor(clock.includes('深夜') ? '#f0a08a' : UI.creamDim);
    }

    const wanted = Math.round(run.wanted || 0);
    if (wanted !== this.shown.wanted) {
      this.shown.wanted = wanted;
      this.wantedText.setText(`通缉 ${wanted}%`).setVisible(wanted > 0);
    }

    const edge = street.getEdgeHint ? street.getEdgeHint() : '';
    if (edge !== this.shown.edge) {
      this.shown.edge = edge;
      this.edgeText.setText(edge).setVisible(edge.length > 0);
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
