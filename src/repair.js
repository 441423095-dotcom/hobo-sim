// 老修's bench behind the roller door in the back alley, and the tools that wear
// out on the street.
//
// Nothing the beggar buys lasts forever: a lockpick bends, a blade goes dull, the
// cart's wheels go square on the kerbs. Every tool keeps a count of the uses left
// in it, and when that count runs out the thing simply stops working until the
// old fitter puts it right — for money and a part off the street, which is always
// cheaper than buying it over again.
//
// Plain data on the run, so a save keeps it.

export const TOOL_KITS = {
  lockpick: {
    id: 'lockpick',
    name: '开锁器',
    tex: 'item-lockpick',
    uses: 12,
    fee: 9,
    parts: { wire: 1 },
    broke: '开锁器弯了，锁眼里一拧就打滑'
  },
  blade: {
    id: 'blade',
    name: '锋利刀片',
    tex: 'item-blade',
    uses: 10,
    fee: 11,
    parts: { wire: 1 },
    broke: '刀片卷了刃，划不开口袋了'
  },
  cart: {
    id: 'cart',
    name: '手推车',
    tex: 'item-scrap',
    uses: 6,
    fee: 15,
    parts: { cardboard: 2 },
    broke: '推车的轮子歪了，只能先换回编织袋'
  }
};

// The order the shop lists them in.
export const TOOL_ORDER = ['lockpick', 'blade', 'cart'];

const PART_NAMES = { wire: '铜线', pipe: '半截铁管', cardboard: '纸板' };

export function kitOf(id) {
  return TOOL_KITS[id] || null;
}

export function emptyToolWear() {
  return {};
}

/// A tool that has just been bought, found or handed over starts at full
/// strength.
export function giveTool(run, id) {
  const kit = kitOf(id);
  if (!run || !kit) return 0;

  run.toolWear = run.toolWear || {};
  run.toolWear[id] = kit.uses;

  return kit.uses;
}

/// Uses left in the tool, or null when it has never been in his hands.
export function wearOf(run, id) {
  const kit = kitOf(id);
  if (!run || !kit || !run.toolWear) return null;

  const left = run.toolWear[id];

  return typeof left === 'number' ? left : null;
}

/// True while the tool is his and no longer at full strength.
export function needsFix(run, id) {
  const kit = kitOf(id);
  const left = wearOf(run, id);

  if (!kit || left === null) return false;

  return left < kit.uses;
}

/// One use gone. True when that use was the last one, so the caller knows the
/// tool has just given out.
export function spendTool(run, id, n) {
  const kit = kitOf(id);
  const left = wearOf(run, id);

  if (!kit || left === null) return false;

  const after = Math.max(0, left - (n || 1));
  run.toolWear[id] = after;

  return after <= 0;
}

/// What the bench wants besides money, e.g. { wire: 1 } for a lockpick.
export function partsOf(id) {
  const kit = kitOf(id);

  return kit ? kit.parts : {};
}

/// Whether the parts are in the bag already.
export function partsReady(run, id) {
  if (!run) return false;

  const parts = partsOf(id);

  for (const key of Object.keys(parts)) {
    if (((run.items && run.items[key]) || 0) < parts[key]) return false;
  }

  return true;
}

/// Off the bag and onto the bench.
export function takeParts(run, id) {
  if (!run || !partsReady(run, id)) return false;

  const parts = partsOf(id);

  for (const key of Object.keys(parts)) {
    run.items[key] = Math.max(0, (run.items[key] || 0) - parts[key]);
  }

  return true;
}

/// A badly worn tool costs more to put right; the old fitter's own job halves the
/// bill for good.
export function repairCost(run, id, cheap) {
  const kit = kitOf(id);
  const left = wearOf(run, id);

  if (!kit || left === null) return 0;

  const missing = 1 - left / kit.uses;
  const fee = Math.round(kit.fee * (0.5 + missing));

  return cheap ? Math.max(3, Math.round(fee / 2)) : Math.max(3, fee);
}

/// "零件：铜线 1（身上 2）" — what the bench wants, and what he is carrying.
export function partsText(run, id) {
  const parts = partsOf(id);
  const bits = [];

  for (const key of Object.keys(parts)) {
    const have = (run && run.items && run.items[key]) || 0;
    bits.push(`${PART_NAMES[key] || key} ${parts[key]}（身上 ${have}）`);
  }

  return bits.length ? `零件：${bits.join('、')}` : '不用零件';
}

/// Back to full strength: the tool in his hands again, the cart back on its
/// wheels.
export function fixTool(run, id) {
  const kit = kitOf(id);
  if (!run || !kit) return false;

  run.toolWear = run.toolWear || {};
  run.toolWear[id] = kit.uses;

  if (id === 'cart') run.bagUp = 'cart';
  else run.tools[id] = true;

  return true;
}
