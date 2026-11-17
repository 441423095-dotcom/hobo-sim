// The counters of the city: what happens when the beggar buys something, sells
// something, or eats something out of his own bag.
//
// This used to be a stretch of StreetScene.js — the food counter, the junk stall,
// the pawn shop, the shop fronts and the recycler, all in one run of about two
// hundred lines in the middle of a seven-thousand line file. It lives here now so
// that changing a price, a rule or a new kind of shop row means opening this file
// and nothing else.
//
// Every function takes the street scene as `scene`, so `scene.run`, `scene.player`
// and the scene's own helpers (`floatText`, `refreshBagCount`, `progressGoal`,
// `sellMul`, `addFavor`, `applyOutfit`) are all still in reach. The scene keeps a
// one-line method of the same name for each, so callers elsewhere are unchanged.

import { FOODS } from './food.js';
import { JUNK_ITEMS, JUNK_ORDER, TOOLS, junkPrice } from './trade.js';
import { LOOT_ITEMS, LOOT_ORDER, lootPrice } from './loot.js';
import { recipeById } from './craft.js';
import { TOOL_KITS, giveTool, fixTool, partsReady, takeParts } from './repair.js';
import { playSfx } from './audio.js';
import { haptic } from './feedback.js';
import { UI } from './style.js';

/// Something off a menu, eaten on the spot.
export function buyFood(scene, id) {
  const food = FOODS.find((f) => f.id === id);
  if (!food || scene.run.over) return false;
  if (scene.run.money < food.price) return false;

  scene.run.money -= food.price;
  scene.run.hunger = Math.min(scene.hungerMax, scene.run.hunger + food.restore);
  scene.run.energy = Math.min(scene.energyMax, scene.run.energy + (food.energy || 0));

  playSfx('eat');
  haptic('buy');
  scene.floatText(scene.player.x, scene.player.y - 46, `${food.name} +${food.restore}`, '#a8d98a');

  // Chapter one: the first proper meal of the run ends the day.
  if (id === 'bread' && scene.run.story === 2) scene.storyAfterBread();

  return true;
}

/// One piece of rubbish over the stall or the pawn shop's counter.
export function sellJunk(scene, id, atPawn) {
  if (!JUNK_ITEMS[id]) return false;
  if (!scene.run.items[id] || scene.run.items[id] <= 0) return false;

  const price = Math.max(1, Math.round(junkPrice(id, atPawn) * scene.sellMul()));

  scene.run.items[id] -= 1;
  scene.run.money += price;
  scene.run.soldIncome += price;
  scene.progressGoal('sell', price);
  scene.addFavor(atPawn ? 'chen' : 'stall', 8);
  scene.refreshBagCount();
  scene.floatText(scene.player.x, scene.player.y - 46, `+${price} 元`, UI.gold);

  return true;
}

/// One thing out of somebody's pocket, sold the same way.
export function sellLoot(scene, id, atPawn) {
  if (!LOOT_ITEMS[id]) return false;
  if (!scene.run.loot[id] || scene.run.loot[id] <= 0) return false;

  const price = Math.max(1, Math.round(lootPrice(id, atPawn) * scene.sellMul()));

  scene.run.loot[id] -= 1;
  scene.run.money += price;
  scene.run.soldIncome += price;
  scene.progressGoal('sell', price);
  scene.addFavor(atPawn ? 'chen' : 'stall', 8);
  scene.refreshBagCount();
  scene.floatText(scene.player.x, scene.player.y - 46, `+${price} 元`, UI.gold);

  return true;
}

/// Cigarettes and food out of a pocket can be used on the spot instead of being
/// carried to the stall.
export function useLoot(scene, id) {
  const item = LOOT_ITEMS[id];
  if (!item || scene.run.over) return false;
  if (!scene.run.loot[id] || scene.run.loot[id] <= 0) return false;
  if (!item.hunger && !item.energy) return false;

  scene.run.loot[id] -= 1;

  if (item.hunger) {
    scene.run.hunger = Math.min(scene.hungerMax, scene.run.hunger + item.hunger);
  }
  if (item.energy) {
    scene.run.energy = Math.min(scene.energyMax, scene.run.energy + item.energy);
  }

  scene.refreshBagCount();
  scene.floatText(scene.player.x, scene.player.y - 46, `${item.name} · ${item.use}`, '#a8d98a');

  return true;
}

/// The whole bag of rubbish at once, for the stall that weighs it by the pile.
export function sellAllJunk(scene, atPawn) {
  let total = 0;
  const mul = scene.sellMul();

  for (const id of JUNK_ORDER) {
    while (scene.run.items[id] > 0) {
      scene.run.items[id] -= 1;
      total += Math.max(1, Math.round(junkPrice(id, atPawn) * mul));
    }
  }

  if (total > 0) {
    scene.run.money += total;
    scene.run.soldIncome += total;
    scene.progressGoal('sell', total);
    scene.addFavor(atPawn ? 'chen' : 'stall', 8);
    scene.refreshBagCount();
    scene.floatText(scene.player.x, scene.player.y - 46, `+${total} 元`, UI.gold);
  }

  return total;
}

/// The two tools the pawn shop keeps behind the counter.
export function buyTool(scene, id) {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool || scene.run.over) return false;
  if (scene.run.tools[id]) return false;
  if (scene.run.money < tool.price) return false;

  scene.run.money -= tool.price;
  scene.run.tools[id] = true;
  giveTool(scene.run, id);

  playSfx('buy');
  haptic('buy');
  scene.floatText(scene.player.x, scene.player.y - 46, `买下${tool.name}`, '#a8d98a');

  return true;
}

/// One line off a shop counter, whatever kind of line it is. Everything the
/// shop panel can list ends up here.
export function buyStock(scene, entry) {
  const run = scene.run;

  if (!entry || run.over || entry.owned) return false;
  if (run.money < entry.price) return false;

  const say = (text, colour) => scene.floatText(scene.player.x, scene.player.y - 46, text, colour);

  switch (entry.kind) {
    case 'food':
      return buyFood(scene, entry.refId);

    case 'material': {
      run.money -= entry.price;
      run.items[entry.refId] = (run.items[entry.refId] || 0) + 3;
      scene.refreshBagCount();
      say(`+3 ${JUNK_ITEMS[entry.refId].name}`, '#e8dcc2');
      return true;
    }

    case 'tool':
      return buyTool(scene, entry.refId);

    case 'stealth': {
      if (run.tools[entry.refId]) return false;
      run.money -= entry.price;
      run.tools[entry.refId] = true;
      giveTool(run, entry.refId);
      say(`买下${entry.name}`, '#a8d98a');
      return true;
    }

    case 'booze': {
      run.money -= entry.price;
      run.booze = 1;
      say('一口闷了，手有点稳', '#c9a8e6');
      return true;
    }

    case 'perfume': {
      run.money -= entry.price;
      run.perfume = (run.perfume || 0) + 1;
      say('收好那瓶香水', '#c9a8e6');
      return true;
    }

    case 'charm': {
      run.money -= entry.price;
      run.charm = run.charm || {};
      run.charm[entry.refId] = (run.charm[entry.refId] || 0) + 1;
      say(`买下${entry.name}`, '#a8d98a');
      return true;
    }

    case 'bagup': {
      run.money -= entry.price;
      run.bagUp = entry.refId;
      giveTool(run, entry.refId);
      say(`换上${entry.name}`, '#a8d98a');
      return true;
    }

    case 'blueprint': {
      const rec = recipeById(entry.refId);
      if (!rec || run.blueprints[entry.refId]) return false;
      run.money -= entry.price;
      run.blueprints[entry.refId] = true;
      say(`买下图纸：${rec.name}`, '#f2c46a');
      return true;
    }

    case 'drug': {
      run.money -= entry.price;
      run.energy = Math.min(scene.energyMax, run.energy + 45);
      run.hunger = Math.max(0, run.hunger - 12);
      say('脑袋轻飘飘的', '#c9a8e6');
      return true;
    }

    case 'outfit': {
      if (run.outfit === entry.refId) return false;
      run.money -= entry.price;
      run.outfit = entry.refId;
      scene.applyOutfit();
      say(`换上了${entry.name}`, '#a8d98a');
      return true;
    }

    // Not a sale but a collection: the shop takes the bottles and the cardboard
    // back off the beggar's hands.
    case 'recycle': {
      const paid = recycleJunk(scene, entry.refId);
      if (paid <= 0) return false;

      say(`回收 +${paid} 元`, UI.gold);
      return true;
    }

    // A little manual that teaches the trade once and for all.
    case 'book': {
      run.books = run.books || {};
      if (run.books[entry.refId]) return false;

      run.money -= entry.price;
      run.books[entry.refId] = true;
      say(`读完了${entry.name}`, '#a8d98a');
      return true;
    }

    case 'umbrella': {
      if (run.umbrella) return false;

      run.money -= entry.price;
      run.umbrella = true;
      say('撑开伞试了试，还能用', '#a8d98a');
      return true;
    }

    // The fitter's bench: money and a part off the street, and the tool is whole
    // again instead of being bought over.
    case 'fix': {
      if (!partsReady(run, entry.refId)) {
        say('零件不够，老修不肯动手', '#f0a08a');
        return false;
      }

      run.money -= entry.price;
      takeParts(run, entry.refId);
      fixTool(run, entry.refId);
      scene.refreshBagCount();

      say(`修好了${TOOL_KITS[entry.refId].name}`, '#a8d98a');
      return true;
    }

    // The pick he ground himself, given away rather than sold: nothing to pay,
    // and nothing to break.
    case 'unbreakable': {
      if (run.neverBreak) return false;

      run.neverBreak = true;
      run.tools.lockpick = true;
      giveTool(run, 'lockpick');

      say('这把用不坏', '#f2c46a');
      return true;
    }

    default:
      return false;
  }
}

/// The convenience shop takes the bottles and the cardboard back by the crate:
/// one tap, the whole stack, at the counter price.
export function recycleJunk(scene, kind) {
  const run = scene.run;
  const have = run.items[kind] || 0;
  if (have <= 0) return 0;

  const each = Math.max(1, Math.round(junkPrice(kind, false) * scene.sellMul()));
  const total = each * have;

  run.items[kind] = 0;
  run.money += total;
  run.soldIncome += total;
  run.bag = Math.max(0, run.bag - have);

  scene.progressGoal('sell', total);
  scene.refreshBagCount();
  playSfx('sell');
  haptic('sell');

  return total;
}

/// Sells a whole stack over the counter: one tap, one price. Junk goes through
/// the recycling tally, pockets and craft goods at their own rates.
export function sellBatch(scene, kind, id) {
  const run = scene.run;

  if (run.over) return 0;
  if (kind === 'junk') return recycleJunk(scene, id);

  const have = kind === 'loot' ? run.loot[id] || 0 : run.goods[id] || 0;
  if (have <= 0) return 0;

  let each = 0;
  if (kind === 'loot') each = lootPrice(id, false);
  if (kind === 'good') {
    const rec = recipeById(id);
    each = rec ? rec.value : 0;
  }

  each = Math.max(1, Math.round(each * scene.sellMul()));
  const total = each * have;

  if (kind === 'loot') run.loot[id] = 0;
  else run.goods[id] = 0;

  run.money += total;
  run.soldIncome += total;
  run.bag = Math.max(0, run.bag - have);

  scene.progressGoal('sell', total);
  scene.refreshBagCount();
  playSfx('sell');
  haptic('sell');

  return total;
}
