// What a passer-by carries in a pocket, and what it is good for once it is in
// the beggar's hands. The valuables are worth real money, the cigarettes and the
// snack can also be used on the spot instead of sold.

export const LOOT_ITEMS = {
  cigarettes: {
    name: '香烟',
    tex: 'item-cigarettes',
    price: 9,
    kind: 'smoke',
    energy: 18,
    use: '抽一根回精力'
  },
  snackbar: {
    name: '小零食',
    tex: 'item-snackbar',
    price: 6,
    kind: 'food',
    hunger: 14,
    energy: 8,
    use: '吃下去顶饱'
  },
  wallet: {
    name: '皮夹子',
    tex: 'item-wallet',
    price: 24,
    kind: 'value',
    use: '只能卖钱'
  },
  phone: {
    name: '手机',
    tex: 'item-phone',
    price: 38,
    kind: 'value',
    use: '只能卖钱'
  },
  // Not from a pocket but from a bin: half a box of somebody's dinner, still
  // wrapped. It goes in the bag and is eaten from there.
  leftover: {
    name: '剩菜饭',
    tex: 'item-snackbar',
    price: 1,
    kind: 'food',
    hunger: 16,
    energy: 6,
    use: '垃圾桶里捡的，还能吃'
  }
};

// The cheap things first, so they sit at the top of the pocket in the panel.
export const LOOT_ORDER = ['leftover', 'cigarettes', 'snackbar', 'wallet', 'phone'];

/// The stall gives the listed price; the pawn shop knows what a stolen phone is
/// worth and pays a few coins more.
export function lootPrice(id, atPawn) {
  const item = LOOT_ITEMS[id];
  if (!item) return 0;
  return atPawn ? item.price + 3 : item.price;
}
