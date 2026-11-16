// The shops of the city: where they stand, what they sell, and what each thing
// does when the player buys it.

import { FOODS } from './food.js';
import { JUNK_ITEMS, JUNK_ORDER, junkPrice } from './trade.js';
import { LOOT_ITEMS, LOOT_ORDER, lootPrice } from './loot.js';
import { RECIPES } from './craft.js';
import { errandDone } from './errands.js';

export const SHOPS = [
  {
    id: 'convenience',
    name: '便利店',
    owner: '看店的老张',
    blurb: '热食和烟酒，什么时候都开着',
    buyBack: true,
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
    blurb: '材料、干粮和袋子，做手工的都来这儿',
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
  },
  // Street-food carts, parked at the kerb in the middle of each block. They are
  // drawn in the street rather than on the building, so they sort with the world.
  {
    id: 'stall-market',
    name: '兰州拉面',
    owner: '拉面摊老板',
    blurb: '一碗热汤面，站着就吃完了',
    district: 'market',
    tex: 'foodstall-兰州拉面',
    x: 214,
    y: 612,
    doorX: 236,
    doorY: 718,
    radius: 80,
    ground: true
  },
  {
    id: 'stall-square',
    name: '沙县小吃',
    owner: '出站口的小店',
    blurb: '蒸饺、拌面，赶车的人都在排',
    district: 'square',
    tex: 'foodstall-沙县小吃',
    x: 214,
    y: 812,
    doorX: 236,
    doorY: 918,
    radius: 80,
    ground: true
  },
  {
    id: 'stall-alley',
    name: '烧烤摊',
    owner: '光膀子的师傅',
    blurb: '炭火一旺，半条巷子都闻得到',
    district: 'alley',
    tex: 'foodstall-烧烤摊',
    x: 214,
    y: 912,
    doorX: 236,
    doorY: 1018,
    radius: 80,
    ground: true
  },
  {
    id: 'stall-camp',
    name: '盒饭',
    owner: '骑三轮的大姐',
    blurb: '十块钱一份，菜码随便加',
    district: 'camp',
    tex: 'foodstall-盒饭',
    x: 214,
    y: 932,
    doorX: 236,
    doorY: 1038,
    radius: 80,
    ground: true
  },
  {
    id: 'stall-slum',
    name: '麻辣烫',
    owner: '黑街的老板娘',
    blurb: '一锅汤底从早滚到晚',
    district: 'slum',
    tex: 'foodstall-麻辣烫',
    x: 214,
    y: 712,
    doorX: 236,
    doorY: 818,
    radius: 80,
    ground: true
  },
  {
    id: 'stall-park',
    name: '煎饼摊',
    owner: '推车的老师傅',
    blurb: '薄脆现炸，排队的人也肯等',
    district: 'park',
    tex: 'foodstall-煎饼摊',
    x: 398,
    y: 1032,
    doorX: 418,
    doorY: 1138,
    radius: 80,
    ground: true
  },
  {
    id: 'stall-commerce',
    name: '奶茶',
    owner: '连锁店的小妹',
    blurb: '一杯二十，加料另算',
    district: 'commerce',
    tex: 'foodstall-奶茶',
    x: 398,
    y: 812,
    doorX: 418,
    doorY: 918,
    radius: 80,
    ground: true
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
    sprite: 'shirt',
    blurb: '洗干净了，讨钱也体面些'
  },
  {
    id: 'work',
    name: '工装外套',
    icon: 'item-shirt',
    clean: 0.55,
    price: 45,
    sprite: 'shirt',
    blurb: '脏是脏点，好歹像干活的'
  },
  {
    id: 'suit',
    name: '旧西装',
    icon: 'item-suitwear',
    clean: 0.7,
    price: 80,
    sprite: 'suit',
    blurb: '看着像个上班的'
  },
  {
    id: 'uniform',
    name: '旧制服',
    icon: 'item-suitwear',
    clean: 0.85,
    price: 115,
    sprite: 'suit',
    blurb: '不知道从哪个单位顺出来的'
  },
  {
    id: 'coat',
    name: '体面大衣',
    icon: 'item-overcoat',
    clean: 1,
    price: 150,
    sprite: 'coat',
    blurb: '没人会当你是乞丐'
  }
];

/// What each food cart actually cooks. The cart's sign and its menu are the
/// same three things.
const STALL_MENUS = {
  'stall-market': ['noodle', 'coldnoodle', 'teaegg'],
  'stall-square': ['dumpling', 'mixnoodle', 'soup'],
  'stall-alley': ['skewer', 'eggplant', 'bunslice'],
  'stall-camp': ['boxlunch', 'hotdog', 'teaegg'],
  'stall-slum': ['malatang', 'bingfen', 'teaegg'],
  'stall-park': ['jianbing', 'soymilk', 'teaegg'],
  'stall-commerce': ['milktea', 'bubbletea', 'lemonade']
};

/// The counter at the corner shop: quick food, not a restaurant menu.
const CONVENIENCE_MENU = ['bread', 'meal', 'water', 'baozi', 'teaegg'];

/// The list of things a shop has on the counter right now. `owned` marks what
/// the player already carries, so the panel can grey it out.
export function stockFor(shopId, run) {
  if (shopId === 'convenience') {
    const items = CONVENIENCE_MENU.map((id) => FOODS.find((food) => food.id === id))
      .filter(Boolean)
      .map((f) => ({
        key: `food:${f.id}`,
        kind: 'food',
        refId: f.id,
        name: f.name,
        desc: `饱腹 +${f.restore} · 精力 +${f.energy}`,
        icon: `icon-${f.icon}`,
        price: f.price,
        owned: false
      }));

    // The shop takes the two things it sells by the crate: cardboard and
    // bottles. One tap, all of it, at the counter price.
    for (const [id, label] of [
      ['cardboard', '纸板'],
      ['bottle', '玻璃瓶']
    ]) {
      const have = run && run.items ? run.items[id] || 0 : 0;
      if (have <= 0) continue;

      items.push({
        key: `recycle:${id}`,
        kind: 'recycle',
        refId: id,
        name: `回收 ${label} ×${have}`,
        desc: '一次全卖，按件算钱',
        icon: JUNK_ITEMS[id].tex,
        price: 0,
        owned: false
      });
    }

    return items;
  }

  if (shopId === 'grocery') {
    const items = [];

    // The ledger is back in her hands: everything on the shelves is hers at
    // cost now, and she never says it out loud.
    const wholesale = errandDone(run, 'ledger');
    const priceOf = (value) => (wholesale ? Math.max(1, Math.round(value * 0.65)) : value);

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
        price: priceOf(f.price),
        owned: false
      });
    }

    for (const id of ['can', 'newspaper', 'cardboard']) {
      items.push({
        key: `mat:${id}`,
        kind: 'material',
        refId: id,
        name: `${JUNK_ITEMS[id].name} ×3`,
        desc: wholesale ? '按进货价拿，别往外说' : '做手工要用的材料',
        icon: JUNK_ITEMS[id].tex,
        price: priceOf(id === 'can' ? 5 : 4),
        owned: false
      });
    }

    // Bags: the beggar starts with a pouch and works his way up.
    const bagUp = run && run.bagUp ? run.bagUp : 'pouch';

    items.push({
      key: 'bagup:woven',
      kind: 'bagup',
      refId: 'woven',
      name: '编织袋',
      desc: '背包能装 34 件',
      icon: 'item-rag',
      price: priceOf(20),
      owned: bagUp === 'woven' || bagUp === 'cart'
    });

    items.push({
      key: 'bagup:cart',
      kind: 'bagup',
      refId: 'cart',
      name: '手推车',
      desc: '能装 55 件，但推着走不快',
      icon: 'item-scrap',
      price: priceOf(60),
      owned: bagUp === 'cart'
    });

    items.push({
      key: 'book:peddle',
      kind: 'book',
      refId: 'peddle',
      name: '口才小册子',
      desc: '读完兜售成功率永久 +8%',
      icon: 'item-blueprint',
      price: priceOf(30),
      owned: !!(run && run.books && run.books.peddle)
    });

    items.push({
      key: 'umbrella',
      kind: 'umbrella',
      refId: 'umbrella',
      name: '旧伞',
      desc: '下雨时伞一撑，身上一直是干的',
      icon: 'icon-umbrella',
      price: priceOf(14),
      owned: !!(run && run.umbrella)
    });

    return items;
  }

  // The street-food carts each cook their own short menu, matching the sign
  // over the counter.
  if (shopId.indexOf('stall-') === 0) {
    const items = [];

    for (const id of STALL_MENUS[shopId] || STALL_MENUS['stall-market']) {
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

    // The noodle seller's girl is in school now, and the man keeps his word:
    // one bowl a day, on the house.
    if (run && errandDone(run, 'noodle') && run.noodleDay !== run.day) {
      items.push({
        key: 'free:noodle',
        kind: 'freenoodle',
        refId: 'noodle',
        name: '免费牛肉面',
        desc: '说好的一天一碗 · 今天还没吃',
        icon: 'icon-utensils',
        price: 0,
        owned: false
      });
    }

    return items;
  }

  if (shopId === 'clothes') {
    const items = OUTFITS.filter((o) => o.id !== 'rags').map((o) => ({
      key: `outfit:${o.id}`,
      kind: 'outfit',
      refId: o.id,
      name: o.name,
      desc:
        run && run.outfit === o.id
          ? '正穿在身上'
          : `体面 ${Math.round(o.clean * 100)}% · 乞讨更顺`,
      icon: o.icon,
      price: o.price,
      owned: !!(run && run.outfit === o.id)
    }));

    // The tailor keeps his word too: once his cloth is bought, a worn outfit is
    // patched instead of replaced.
    if (run && errandDone(run, 'cloth') && (run.outfitWear || 0) > 0.01) {
      const worn = OUTFITS.find((o) => o.id === run.outfit);

      items.unshift({
        key: 'repair:outfit',
        kind: 'repair',
        refId: 'outfit',
        name: '补衣',
        desc: `把${worn ? worn.name : '这身衣服'}补好 · 体面回来`,
        icon: worn ? worn.icon : 'item-rag',
        price: 0,
        owned: false
      });
    }

    return items;
  }

  if (shopId === 'black') {
    const items = [];

    // The hat man's watch came in, and with it a lockpick he has had his own
    // hands on.
    const tuned = errandDone(run, 'decent');

    items.push({
      key: 'tool:lockpick',
      kind: 'tool',
      refId: 'lockpick',
      name: tuned ? '开锁器（他改过）' : '开锁器',
      desc: tuned ? '黑市老板亲手磨过，手更稳' : '偷窃时绿区更大',
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
      desc: '金色完美区：翻倍、不惊动人',
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
      desc: '烈酒：下一次 QTE 指针变慢',
      icon: 'item-booze',
      price: 28,
      owned: !!(run && run.booze > 0)
    });

    items.push({
      key: 'charm:cigarettes',
      kind: 'charm',
      refId: 'cigarettes',
      name: '香烟（一包）',
      desc: '兜售时递一根：成功率 +18%',
      icon: 'item-cigarettes',
      price: 18,
      owned: false
    });

    items.push({
      key: 'charm:ticket',
      kind: 'charm',
      refId: 'ticket',
      name: '刮刮乐票',
      desc: '兜售时塞一张：成功率 +12%',
      icon: 'item-blueprint',
      price: 12,
      owned: false
    });

    items.push({
      key: 'book:steal',
      kind: 'book',
      refId: 'steal',
      name: '小偷手册',
      desc: '读完偷窃绿区永久宽 8%',
      icon: 'item-blueprint',
      price: 45,
      owned: !!(run && run.books && run.books.steal)
    });

    // A black umbrella the hat man has no further use for.
    items.push({
      key: 'umbrella',
      kind: 'umbrella',
      refId: 'umbrella',
      name: '黑伞',
      desc: '撑开就淋不着，黑市价',
      icon: 'icon-umbrella',
      price: 10,
      owned: !!(run && run.umbrella)
    });

    // A bottle of the good stuff, kept back behind the counter for the beggar
    // who brought the hat man his watch.
    if (tuned) {
      items.push({
        key: 'use:perfume',
        kind: 'perfume',
        refId: 'perfume',
        name: '小香水',
        desc: '偷东西时直接得手，不用比时机',
        icon: 'item-perfume',
        price: 25,
        owned: false
      });
    }

    return items;
  }

  return [];
}

/// What a shop that buys things back will take off the beggar's hands, priced
/// for the whole stack: one tap, one sale.
export function sellListFor(shopId, run) {
  const shop = SHOPS.find((s) => s.id === shopId);
  if (!run || !shop || !shop.buyBack) return [];

  const items = [];

  for (const id of JUNK_ORDER) {
    const count = run.items[id] || 0;
    if (count <= 0) continue;

    const each = junkPrice(id, false);
    items.push({
      key: `sell:junk:${id}`,
      kind: 'sell',
      via: 'junk',
      refId: id,
      name: JUNK_ITEMS[id].name,
      desc: `×${count} · 一件 ${each} 元`,
      icon: JUNK_ITEMS[id].tex,
      price: each * count,
      owned: false
    });
  }

  for (const id of LOOT_ORDER) {
    const count = run.loot[id] || 0;
    if (count <= 0) continue;

    const each = lootPrice(id, false);
    items.push({
      key: `sell:loot:${id}`,
      kind: 'sell',
      via: 'loot',
      refId: id,
      name: LOOT_ITEMS[id].name,
      desc: `×${count} · 一件 ${each} 元`,
      icon: LOOT_ITEMS[id].tex,
      price: each * count,
      owned: false
    });
  }

  for (const rec of RECIPES) {
    const count = run.goods[rec.id] || 0;
    if (count <= 0) continue;

    items.push({
      key: `sell:good:${rec.id}`,
      kind: 'sell',
      via: 'good',
      refId: rec.id,
      name: rec.name,
      desc: `×${count} · 一件 ${rec.value} 元`,
      icon: rec.tex,
      price: rec.value * count,
      owned: false
    });
  }

  return items.slice(0, 10);
}
