// The shops of the city: where they stand, what they sell, and what each thing
// does when the player buys it.

import { FOODS } from './food.js';
import { JUNK_ITEMS } from './trade.js';
import { RECIPES } from './craft.js';

export const SHOPS = [
  {
    id: 'convenience',
    name: '便利店',
    owner: '看店的老张',
    blurb: '热食和烟酒，什么时候都开着',
    district: 'market',
    tex: 'shopfront',
    x: 500,
    y: 288,
    doorX: 518,
    doorY: 400,
    radius: 78
  },
  {
    id: 'grocery',
    name: '杂货铺',
    owner: '老板娘',
    blurb: '吃的，还有做手工用的材料',
    district: 'market',
    tex: 'grocerystore',
    x: 0,
    y: 236,
    doorX: 124,
    doorY: 322,
    radius: 76
  },
  {
    id: 'clothes',
    name: '服装店',
    owner: '裁缝',
    blurb: '买一身像样的衣服，别再看谁都躲着你',
    district: 'market',
    tex: 'clothesstore',
    x: 0,
    y: 720,
    doorX: 124,
    doorY: 806,
    radius: 76
  },
  {
    id: 'black',
    name: '黑市',
    owner: '戴帽子的',
    blurb: '别问来路，钱放下就拿走',
    district: 'slum',
    tex: 'blackmarket',
    x: 528,
    y: 96,
    doorX: 516,
    doorY: 180,
    radius: 76
  }
];

export const OUTFITS = [
  { id: 'rags', name: '破衣服', icon: 'item-rag', clean: 0, price: 0, blurb: '本来就是这一身' },
  {
    id: 'shirt',
    name: '干净衬衫',
    icon: 'item-shirt',
    clean: 0.45,
    price: 32,
    blurb: '干净一点，讨钱也体面些'
  },
  { id: 'suit', name: '旧西装', icon: 'item-suitwear', clean: 0.7, price: 80, blurb: '看着像个上班的' },
  {
    id: 'coat',
    name: '体面大衣',
    icon: 'item-overcoat',
    clean: 1,
    price: 150,
    blurb: '没人会当你是乞丐'
  }
];

/// The list of things a shop has on the counter right now. `owned` marks what
/// the player already carries, so the panel can grey it out.
export function stockFor(shopId, run) {
  if (shopId === 'convenience') {
    return FOODS.map((f) => ({
      key: `food:${f.id}`,
      kind: 'food',
      refId: f.id,
      name: f.name,
      desc: `饱腹 +${f.restore} · 精力 +${f.energy}`,
      icon: `icon-${f.icon}`,
      price: f.price,
      owned: false
    }));
  }

  if (shopId === 'grocery') {
    const items = [];

    for (const id of ['bread', 'water']) {
      const f = FOODS.find((food) => food.id === id);
      if (!f) continue;
      items.push({
        key: `food:${f.id}`,
        kind: 'food',
        refId: f.id,
        name: f.name,
        desc: `饱腹 +${f.restore} · 精力 +${f.energy}`,
        icon: `icon-${f.icon}`,
        price: f.price,
        owned: false
      });
    }

    for (const id of ['can', 'newspaper', 'cardboard']) {
      items.push({
        key: `mat:${id}`,
        kind: 'material',
        refId: id,
        name: `${JUNK_ITEMS[id].name} ×3`,
        desc: '做手工要用的材料',
        icon: JUNK_ITEMS[id].tex,
        price: id === 'can' ? 5 : 4,
        owned: false
      });
    }

    return items;
  }

  if (shopId === 'clothes') {
    return OUTFITS.filter((o) => o.id !== 'rags').map((o) => ({
      key: `outfit:${o.id}`,
      kind: 'outfit',
      refId: o.id,
      name: o.name,
      desc: run && run.outfit === o.id ? '正穿在身上' : o.blurb,
      icon: o.icon,
      price: o.price,
      owned: !!(run && run.outfit === o.id)
    }));
  }

  if (shopId === 'black') {
    const items = [];

    items.push({
      key: 'tool:lockpick',
      kind: 'tool',
      refId: 'lockpick',
      name: '开锁器',
      desc: '偷窃时绿区更大',
      icon: 'item-lockpick',
      price: 22,
      owned: !!(run && run.tools.lockpick)
    });

    items.push({
      key: 'tool:glove',
      kind: 'stealth',
      refId: 'glove',
      name: '破旧手套',
      desc: '偷窃绿区宽 20%',
      icon: 'item-glove',
      price: 40,
      owned: !!(run && run.tools.glove)
    });

    items.push({
      key: 'tool:blade',
      kind: 'stealth',
      refId: 'blade',
      name: '锋利刀片',
      desc: '多一段金色完美区：收益翻倍，还不惊动人',
      icon: 'item-blade',
      price: 65,
      owned: !!(run && run.tools.blade)
    });

    for (const rec of RECIPES) {
      if (!rec.blueprint) continue;
      items.push({
        key: `bp:${rec.id}`,
        kind: 'blueprint',
        refId: rec.id,
        name: `${rec.name}图纸`,
        desc: `解锁「${rec.name}」的合成配方`,
        icon: 'item-blueprint',
        price: rec.blueprintPrice || 30,
        owned: !!(run && run.blueprints[rec.id])
      });
    }

    items.push({
      key: 'drug:drug',
      kind: 'drug',
      refId: 'drug',
      name: '迷幻药',
      desc: '精力 +45，但更饿（饱腹 -12）',
      icon: 'item-drug',
      price: 12,
      owned: false
    });

    items.push({
      key: 'use:booze',
      kind: 'booze',
      refId: 'booze',
      name: '烈酒',
      desc: '当场喝下，下一次 QTE 指针慢 30%',
      icon: 'item-booze',
      price: 28,
      owned: !!(run && run.booze > 0)
    });

    return items;
  }

  return [];
}
