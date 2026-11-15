// What the workbench can turn the street's scrap into. Recipes either consume
// raw junk straight out of the bag or use something an earlier recipe produced,
// so the last two are where the money is.

import { JUNK_ITEMS } from './trade.js';

export const RECIPES = [
  {
    id: 'scrap',
    name: '废铁块',
    tex: 'item-scrap',
    value: 8,
    blueprint: false,
    need: { can: 3 }
  },
  {
    id: 'rope',
    name: '绳子',
    tex: 'item-rope',
    value: 6,
    blueprint: false,
    need: { newspaper: 2 }
  },
  {
    id: 'rag',
    name: '破布',
    tex: 'item-rag',
    value: 5,
    blueprint: false,
    need: { cardboard: 2 }
  },
  {
    id: 'knife',
    name: '简易刀具',
    tex: 'item-knife',
    value: 30,
    blueprint: true,
    blueprintPrice: 24,
    need: { scrap: 1, rag: 1 }
  },
  {
    id: 'crowbar',
    name: '撬棍',
    tex: 'item-crowbar',
    value: 52,
    blueprint: true,
    blueprintPrice: 38,
    need: { scrap: 2, rope: 1 }
  }
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || null;
}

/// How many of a material the run holds, whether it is raw junk or something
/// already crafted.
export function amountOf(run, id) {
  if (run.items && typeof run.items[id] === 'number') return run.items[id];
  if (run.goods && typeof run.goods[id] === 'number') return run.goods[id];
  return 0;
}

/// Take a material back out of whichever bag holds it.
export function spendMaterial(run, id, count) {
  if (run.items && typeof run.items[id] === 'number') {
    run.items[id] -= count;
    return;
  }
  if (run.goods && typeof run.goods[id] === 'number') {
    run.goods[id] -= count;
  }
}

export function materialLabel(id) {
  if (JUNK_ITEMS[id]) return JUNK_ITEMS[id].name;
  const recipe = recipeById(id);
  return recipe ? recipe.name : id;
}

/// "易拉罐×3 · 纸板×1"
export function needLabel(need) {
  return Object.keys(need)
    .map((id) => `${materialLabel(id)}×${need[id]}`)
    .join(' · ');
}
