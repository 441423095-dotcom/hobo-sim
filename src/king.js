// How the run ends: becoming the king of the hobos.
//
// Two roads lead there. One is favour: the people who matter on this street —
// the old man by the tent, the pawnbroker, the shopkeeper, the stall boss and the
// man in the hat — each decide at some point that you are worth backing, and the
// old man calls the election once enough of them are on your side. The other is
// money: ten thousand times a coin in the bowl, and nobody argues.

export const KING = {
  moneyGoal: 100000,
  favorGoal: 50,
  supportersNeeded: 4
};

export const PATRONS = [
  { id: 'zhou', name: '老周', where: '城郊营地' },
  { id: 'chen', name: '老陈 · 当铺', where: '市场街' },
  { id: 'zhang', name: '老张 · 便利店', where: '市场街' },
  { id: 'stall', name: '小吃摊主', where: '各条街口' },
  { id: 'cap', name: '戴帽子的 · 黑市', where: '黑街' }
];

export function patronById(id) {
  return PATRONS.find((p) => p.id === id) || null;
}

export function favorOf(run, id) {
  const favor = (run && run.favor) || {};
  return favor[id] || 0;
}

/// Everyone whose favour has reached the point where they would back you.
export function supporters(run) {
  return PATRONS.filter((p) => favorOf(run, p.id) >= KING.favorGoal);
}

export function kingProgress(run) {
  const backers = supporters(run);
  const money = (run && run.money) || 0;

  return {
    supporters: backers.length,
    needed: KING.supportersNeeded,
    money,
    moneyGoal: KING.moneyGoal,
    canElect: backers.length >= KING.supportersNeeded,
    canBuy: money >= KING.moneyGoal
  };
}
