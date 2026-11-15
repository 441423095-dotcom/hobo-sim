// The shopkeepers' own business.
//
// Every counter on the street has somebody behind it with one thing they cannot
// do themselves: a daughter's tuition, a ledger somebody walked off with, a bolt
// of good cloth, a watch that has to come off a rich man's wrist. Three small
// jobs each, and what they hand back is never money — it is a door left open for
// good.
//
// The steps ask for nothing the street does not already ask of a beggar: walk
// somewhere at the right hour, carry something back, lift a pocket, keep out of
// the 城管's way, wait for the rain. Plain data, so a save keeps it.

import { JUNK_ITEMS } from './trade.js';
import { LOOT_ITEMS } from './loot.js';

export const ERRAND_STEPS = 3;

export const ERRANDS = [
  {
    id: 'noodle',
    shop: 'stall-market',
    speaker: 'vendor',
    owner: '拉面摊老板',
    title: '女儿的学费',
    steps: [
      {
        kind: 'go',
        district: 'market',
        segment: 2,
        short: '天黑后去市场街的夜市看一眼',
        ask: '市场街口晚上有夜市。你去替我看看，靠墙那块儿还有没有空位。'
      },
      {
        kind: 'bring',
        from: 'items',
        id: 'cardboard',
        need: 3,
        short: '带三块纸板给拉面摊',
        ask: '摊子底下得垫点东西。给我带三块干纸板回来，湿的压不住。'
      },
      {
        kind: 'pay',
        need: 20,
        short: '替拉面摊垫二十元学费',
        ask: '学费还差二十。你先替我垫上，这钱我记你身上。'
      }
    ],
    done: '行，往后你哪天来，这碗面我都给你留着。别声张，让人知道我给人免单，都得来蹭。',
    reward: '每天一碗免费面'
  },

  {
    id: 'ledger',
    shop: 'grocery',
    speaker: 'boss',
    owner: '杂货铺老板娘',
    title: '被顺走的账本',
    steps: [
      {
        kind: 'go',
        district: 'alley',
        segment: 2,
        short: '天黑后去后巷问账本的下落',
        ask: '账本叫人顺走了。有人看见那人往后巷去了，那边天黑以后才有人。你先去问一句，别动手。'
      },
      {
        kind: 'bring',
        from: 'loot',
        id: 'wallet',
        need: 1,
        short: '顺一个皮夹子回来',
        ask: '账本夹在那人的皮夹子里。你手快，把皮夹子给我拿回来，剩下我自己想办法。'
      },
      {
        kind: 'pay',
        need: 18,
        short: '交十八元赎回账页',
        ask: '有账页被后巷那伙人撕下去了，他们要十八块才肯还我。'
      }
    ],
    done: '账对上了。往后你在我这儿拿货按进货价，别跟外头说，我这价连自己伙计都不给。',
    reward: '杂货铺按进货价'
  },

  {
    id: 'cloth',
    shop: 'clothes',
    speaker: 'tailor',
    owner: '裁缝',
    title: '一匹好布',
    steps: [
      {
        kind: 'bring',
        from: 'items',
        id: 'cloth',
        need: 3,
        short: '带三块布头给裁缝',
        ask: '先给我拿三块布头来，粗的也行，我打个底。'
      },
      {
        kind: 'wanted',
        district: 'alley',
        need: 10,
        short: '去后巷躲到通缉降到十以下',
        ask: '布车叫城管扣了。你先去后巷躲着，等通缉的风声降到十以下再来找我，不然连你一块儿扣。'
      },
      {
        kind: 'pay',
        need: 25,
        short: '交二十五元买好布',
        ask: '好布要二十五，我不赚你的，就让这身衣服往后有个着落。'
      }
    ],
    done: '往后衣服破了、脏了自己来，我给你补，不用再掏钱买新的。街上没几个人有这个情分。',
    reward: '衣服能补，不用重买'
  },

  {
    id: 'decent',
    shop: 'black',
    speaker: 'cap',
    owner: '戴帽子的',
    title: '一件体面货',
    steps: [
      {
        kind: 'go',
        district: 'commerce',
        segment: 1,
        short: '白天去商业区看体面货',
        ask: '白天去商业区看看，那些体面人手腕上戴的都是什么成色。看准了再回来跟我说。'
      },
      {
        kind: 'bring',
        from: 'loot',
        id: 'watch',
        need: 1,
        short: '顺一块好表回来',
        ask: '我要一块真表，不要镀的。从他们手腕上顺，别从店里拿。'
      },
      {
        kind: 'go',
        district: 'alley',
        segment: 2,
        weather: ['rain', 'snow'],
        short: '下雨或下雪的夜里送到后巷',
        ask: '挑一个下雨或是下雪的夜里，把东西送到后巷桥洞底下。别走大街，城管这几天正盯着这条街。'
      }
    ],
    done: '货我收了。你那把开锁器我改过，往后手更稳；香水也给你留了一瓶，别拿去送人。',
    reward: '香水一瓶 · 开锁器改过'
  }
];

export function emptyErrands() {
  return {};
}

export function errandById(id) {
  return ERRANDS.find((e) => e.id === id) || null;
}

/// The job hanging off a shop's counter, if that shopkeeper has one.
export function errandForShop(shopId) {
  return ERRANDS.find((e) => e.shop === shopId) || null;
}

/// Where a job stands: which of the three steps is in hand, whether the beggar
/// has actually taken it on, and whether it is done for good. Nothing is watched
/// until the shopkeeper has told him about it.
export function errandState(run, id) {
  const all = (run && run.errands) || {};
  const state = all[id];
  const step = state && typeof state.step === 'number' ? state.step : 0;

  return { step, done: !!(state && state.done), started: !!(state && state.started) };
}

/// Taking the job on: from here the street watches for the right hour, place and
/// weather on its own.
export function markErrandStarted(run, id) {
  if (!run) return null;

  run.errands = run.errands || {};

  const state = run.errands[id];
  if (state && state.started) return state;

  run.errands[id] = {
    step: (state && state.step) || 0,
    done: !!(state && state.done),
    started: true
  };

  return run.errands[id];
}

export function errandDone(run, id) {
  return errandState(run, id).done;
}

/// The step in hand, with its own data, or null when the job is finished.
export function errandStep(run, id) {
  const errand = errandById(id);
  if (!errand) return null;

  const state = errandState(run, id);
  if (state.done || state.step >= errand.steps.length) return null;

  const step = errand.steps[state.step];

  return { ...step, index: state.step, total: errand.steps.length };
}

/// Something in the shopkeeper's mouth when the beggar walks up, whether the job
/// is untouched, half done or finished.
export function errandHookLine(errand, state, step) {
  if (!errand) return '';

  if (state && state.done) return `${errand.owner}：「${errand.title}」那件事，说好的，我记着。`;

  if (!state || !state.started) {
    return `${errand.owner}压低声音：「${errand.title}」——你要是得空，跟我这儿说一声。`;
  }

  if (!step) return '';

  return `${errand.owner}压低声音：「${errand.title}」——${step.short}。`;
}

/// What the shopkeeper says when the beggar asks about that private business.
export function errandAskLines(errand, state, step) {
  if (!errand) return [];

  if (!state || state.done) return [errand.done, `（${errand.reward}）`];
  if (!step) return [];

  return [step.ask, `第 ${state.step + 1}/${errand.steps.length} 步 · ${step.short}`];
}

/// Whether the step in hand is something carried to the counter and handed over.
export function errandHandIn(step) {
  return !!step && (step.kind === 'bring' || step.kind === 'pay');
}

function held(run, step) {
  if (!step) return 0;

  if (step.kind === 'pay') return (run && run.money) || 0;

  const bag = step.from === 'loot' ? (run && run.loot) || {} : (run && run.items) || {};

  return bag[step.id] || 0;
}

/// Everything a hand-in step asked for is in the bag or the pocket.
export function errandReady(run, id) {
  const step = errandStep(run, id);
  if (!errandHandIn(step)) return false;

  return held(run, step) >= step.need;
}

/// "纸板 ×3" / "交 18 元"
export function stepNeedText(step) {
  if (!step) return '';

  if (step.kind === 'pay') return `交 ${step.need} 元`;

  if (step.kind === 'bring') {
    const table = step.from === 'loot' ? LOOT_ITEMS : JUNK_ITEMS;
    const item = table[step.id];

    return `${item ? item.name : step.id} ×${step.need}`;
  }

  return step.short || '';
}

/// A step that finishes by itself the moment the street is right: the hour, the
/// place, the weather, or a wanted level the 城管 can walk past.
export function errandMet(step, ctx) {
  if (!step || !ctx) return false;

  if (step.kind === 'wanted') {
    if (step.district && ctx.district !== step.district) return false;
    if (typeof step.segment === 'number' && (ctx.segment || 0) < step.segment) return false;

    return (ctx.wanted || 0) <= step.need;
  }

  if (step.kind !== 'go') return false;

  if (step.district && ctx.district !== step.district) return false;
  if (typeof step.segment === 'number' && (ctx.segment || 0) < step.segment) return false;

  if (step.weather) {
    const list = Array.isArray(step.weather) ? step.weather : [step.weather];
    if (list.indexOf(ctx.weather) < 0) return false;
  }

  return true;
}

/// Take what a bring/pay step asked for. False when it is not there.
export function takeForStep(run, step) {
  if (!run || !step) return false;

  if (step.kind === 'pay') {
    if ((run.money || 0) < step.need) return false;
    run.money -= step.need;
    return true;
  }

  if (step.kind !== 'bring') return false;
  if (held(run, step) < step.need) return false;

  const bag = step.from === 'loot' ? run.loot : run.items;
  if (!bag) return false;

  bag[step.id] -= step.need;
  return true;
}

/// Move the job on one step, and mark it finished at the end. Returns the state.
export function advanceErrand(run, id) {
  const errand = errandById(id);
  if (!run || !errand) return null;

  run.errands = run.errands || {};

  const state = run.errands[id] || { step: 0, done: false };
  state.step = Math.min(errand.steps.length, (state.step || 0) + 1);

  if (state.step >= errand.steps.length) state.done = true;

  run.errands[id] = state;

  return state;
}
