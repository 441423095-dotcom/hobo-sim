// What the junk in the bag is worth, where on the street it came from, and
// whether it is good for anything but a few coins. Every district drops its own
// litter, so what the beggar is carrying tells the story of where they dug it up.

export const JUNK_ITEMS = {
  // 市场街：菜场边上，纸箱多，瓶子多。
  cardboard: { name: '纸板', tex: 'item-card', price: 1, place: '市场街', use: '合成材料' },
  bottle: { name: '玻璃瓶', tex: 'item-bottle', price: 2, place: '市场街', use: '只能卖钱' },
  veg: { name: '烂菜叶', tex: 'item-veg', price: 1, place: '市场街', use: '只能卖钱' },

  // 火车站广场：传单、易拉罐、旅客吃剩的零食。
  can: { name: '易拉罐', tex: 'item-can', price: 1, place: '火车站广场', use: '合成材料' },
  flyer: { name: '传单', tex: 'item-flyer', price: 1, place: '火车站广场', use: '只能卖钱' },
  snack: { name: '袋装零食', tex: 'item-snack', price: 3, place: '火车站广场', use: '只能卖钱' },

  // 后巷：电线、破布、谁没喝完的酒。
  wire: { name: '铜线', tex: 'item-wire', price: 4, place: '后巷', use: '只能卖钱' },
  cloth: { name: '破布头', tex: 'item-cloth', price: 2, place: '后巷', use: '只能卖钱' },
  wine: { name: '半瓶酒', tex: 'item-wine', price: 5, place: '后巷', use: '只能卖钱' },

  // 小公园：长椅上丢的报纸和空水瓶。
  newspaper: { name: '旧报纸', tex: 'item-news', price: 1, place: '小公园', use: '合成材料' },
  water: { name: '矿泉水瓶', tex: 'item-water', price: 2, place: '小公园', use: '只能卖钱' },

  // 城郊营地：荒地上的干树枝和碎砖头。
  stick: { name: '干树枝', tex: 'item-stick', price: 1, place: '城郊营地', use: '只能卖钱' },
  brick: { name: '碎砖头', tex: 'item-brick', price: 1, place: '城郊营地', use: '只能卖钱' },

  // 黑街：拆迁楼里翻出来的铁管和废电池。
  pipe: { name: '半截铁管', tex: 'item-pipe', price: 5, place: '黑街', use: '只能卖钱' },
  battery: { name: '废电池', tex: 'item-battery', price: 3, place: '黑街', use: '只能卖钱' },

  // 车底下、井盖里翻出来的东西：拆下来的旧零件。
  part: { name: '车零件', tex: 'item-pipe', price: 6, place: '街角', use: '只能卖钱' },

  // 商业区：写字楼底下的碎纸和咖啡杯。
  receipt: { name: '长小票', tex: 'item-receipt', price: 2, place: '商业区', use: '只能卖钱' },
  cup: { name: '空咖啡杯', tex: 'item-cup', price: 4, place: '商业区', use: '只能卖钱' }
};

// In street order, from the camp east, so the bag and the stall read the way
// the city is laid out.
export const JUNK_ORDER = [
  'stick',
  'brick',
  'cardboard',
  'bottle',
  'veg',
  'newspaper',
  'water',
  'can',
  'flyer',
  'snack',
  'wire',
  'cloth',
  'wine',
  'part',
  'pipe',
  'battery',
  'receipt',
  'cup'
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
