// What the junk in the bag is worth, where on the street it came from, and
// whether it is good for anything but a few coins. Every district drops its own
// litter, so what the beggar is carrying tells the story of where he dug it up.
//
// The list is deliberately short: every item here is either eaten, fed to a fire,
// used at the workbench, or taken back by the vending machine. Nothing exists
// only to be sold.

export const JUNK_ITEMS = {
  // 市场街：菜场边上，纸箱多，瓶子多。
  cardboard: { name: '纸板', tex: 'item-card', price: 1, place: '市场街', use: '合成绳子' },
  bottle: { name: '玻璃瓶', tex: 'item-bottle', price: 2, place: '市场街', use: '卖钱，或塞回售货机' },
  veg: { name: '烂菜叶', tex: 'item-veg', price: 1, place: '市场街', use: '能吃，垫垫肚子', eat: { hunger: 5 } },

  // 火车站广场：传单、易拉罐、旅客吃剩的零食。
  can: { name: '易拉罐', tex: 'item-can', price: 1, place: '火车站广场', use: '合成废铁块' },
  snack: {
    name: '袋装零食',
    tex: 'item-snack',
    price: 3,
    place: '火车站广场',
    use: '能吃，撕开就嚼',
    eat: { hunger: 8, energy: 3 }
  },

  // 后巷：电线、破布、谁没喝完的酒。
  wire: { name: '铜线', tex: 'item-wire', price: 4, place: '后巷', use: '合成刀具要它' },
  cloth: { name: '破布头', tex: 'item-cloth', price: 2, place: '后巷', use: '合成破布' },
  wine: {
    name: '半瓶酒',
    tex: 'item-wine',
    price: 5,
    place: '后巷',
    use: '能喝，暖一阵子',
    eat: { energy: 14, hunger: 2 }
  },

  // 小公园：长椅上丢的报纸和空水瓶。
  newspaper: { name: '旧报纸', tex: 'item-news', price: 1, place: '小公园', use: '合成绳子，也能生火' },
  water: {
    name: '矿泉水瓶',
    tex: 'item-water',
    price: 2,
    place: '小公园',
    use: '能喝，还剩半瓶',
    eat: { hunger: 4 }
  },

  // 黑街：拆迁楼里翻出来的铁管。
  pipe: { name: '半截铁管', tex: 'item-pipe', price: 5, place: '黑街', use: '合成撬棍要它' }
};

// In street order, from the camp east, so the bag and the stall read the way
// the city is laid out.
export const JUNK_ORDER = [
  'cardboard',
  'bottle',
  'veg',
  'newspaper',
  'water',
  'can',
  'snack',
  'wire',
  'cloth',
  'wine',
  'pipe'
];

export const TOOLS = [
  {
    id: 'lockpick',
    name: '开锁器',
    tex: 'item-lockpick',
    price: 22,
    blurb: '偷窃成功率 +15%'
  },
  {
    id: 'coat',
    name: '旧外套',
    tex: 'item-coat',
    price: 16,
    blurb: '警戒涨得更慢'
  }
];

/// The roadside stall pays the listed price; the pawn shop knows what it is
/// buying and pays a coin more for the same junk.
export function junkPrice(id, atPawn) {
  const item = JUNK_ITEMS[id];
  if (!item) return 0;
  return atPawn ? item.price + 1 : item.price;
}
