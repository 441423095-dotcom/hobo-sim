// The alley slot machine: five symbols, ten yuan a pull, and no promises.

export const SLOT_COST = 10;

export const SLOT_SYMBOLS = [
  { id: 'cherry', tex: 'slot-cherry', name: '樱桃' },
  { id: 'bell', tex: 'slot-bell', name: '铃铛' },
  { id: 'star', tex: 'slot-star', name: '星星' },
  { id: 'seven', tex: 'slot-seven', name: '七' }
];

/// A pull has already been paid for by the time this runs; it only rolls.
export function rollSlot() {
  const pick = () => Math.floor(Math.random() * SLOT_SYMBOLS.length);
  const symbols = [pick(), pick(), pick()];
  const [a, b, c] = symbols;

  if (a === b && b === c) {
    const jackpot = SLOT_SYMBOLS[a].id === 'seven';
    return { symbols, payout: jackpot ? 200 : 50, tier: jackpot ? 'jackpot' : 'big' };
  }

  if (a === b || b === c || a === c) {
    return { symbols, payout: 8, tier: 'small' };
  }

  return { symbols, payout: 0, tier: 'none' };
}
