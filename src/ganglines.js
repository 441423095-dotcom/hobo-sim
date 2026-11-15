// Three short stories, one for each gang.
//
// Every gang wants the same thing told in its own words: somebody who will do
// one small thing after another until they say the beggar is one of theirs. The
// shape is shared — who is asking, what they want, where it happens, what comes
// back — and the last step is always the same: the gang's vote.
//
// Steps use the same handful of kinds as the shopkeepers' errands: walk
// somewhere at the right hour ('go'), bring something back ('bring'), hand over
// money ('pay'), or stay out of the 城管's books ('wanted').

export const GANG_LINES = [
  {
    id: 'crow',
    gang: 'crow',
    speaker: 'crow',
    owner: '老鸦',
    title: '被扣的一箱货',
    steps: [
      {
        kind: 'go',
        district: 'square',
        segment: 1,
        short: '白天去火车站广场打听那箱货',
        ask: '我那一箱铜线叫车站那片儿的人扣了，说是没票。白天你去广场打听打听，看是哪个队扣的。'
      },
      {
        kind: 'pay',
        need: 20,
        short: '交二十元把货赎出来',
        ask: '保管费二十。你先替我垫上，货拿回来，这个情我记着。'
      },
      {
        kind: 'go',
        district: 'alley',
        short: '带话回后巷，让街面知道你办成了',
        ask: '货回来以后，人得在后巷露个面，让街面上知道这箱子是我老鸦的。'
      }
    ],
    done: '行。箱子回来了，往后这条巷子你说话，我给你撑着。选票的事，我认你。',
    reward: '老鸦帮的选票'
  },

  {
    id: 'tin',
    gang: 'tin',
    speaker: 'tin',
    owner: '铁皮',
    title: '摆一场给人看',
    steps: [
      {
        kind: 'bring',
        from: 'items',
        id: 'cardboard',
        need: 3,
        short: '带三块纸板来铺场子',
        ask: '摆场子得先铺地。三块纸板，别拿湿的。'
      },
      {
        kind: 'bring',
        from: 'items',
        id: 'bottle',
        need: 2,
        short: '带两个瓶子摆在场子上',
        ask: '场子上的瓶子也不能少，两个就够，别是空的。'
      },
      {
        kind: 'go',
        district: 'market',
        segment: 2,
        short: '天黑去市场街夜市口站一回',
        ask: '天黑去市场街夜市口站一回，让那帮做买卖的知道黑街还有铁皮队。'
      },
      {
        kind: 'go',
        district: 'slum',
        short: '回黑街的火桶边报个信',
        ask: '办完回来报个信，我在火桶边等你。'
      }
    ],
    done: '场子立起来了，街面上都看见了。往后黑街的事，我算你一份——票给你。',
    reward: '铁皮队的选票'
  },

  {
    id: 'bench',
    gang: 'bench',
    speaker: 'bench',
    owner: '老丁',
    title: '公园不让人清',
    steps: [
      {
        kind: 'go',
        district: 'square',
        segment: 1,
        short: '白天去广场听城管的清查表',
        ask: '城管那边最近在排清查的表。白天去广场听一耳朵，看我们公园排在哪天。'
      },
      {
        kind: 'bring',
        from: 'items',
        id: 'newspaper',
        need: 2,
        short: '带两张旧报纸把长椅盖上',
        ask: '把长椅拿报纸盖上，看着像没人坐，他们就不那么上心。两张就够。'
      },
      {
        kind: 'wanted',
        district: 'park',
        need: 10,
        short: '在公园安分躲到通缉十以下',
        ask: '这几天你别惹事——通缉降到十以下，再回公园坐着。'
      }
    ],
    done: '公园保住了，椅子还是我们的。老丁他们几个都说，这一票给你。',
    reward: '长椅会的选票'
  }
];

export function gangLineForGang(gangId) {
  return GANG_LINES.find((line) => line.gang === gangId) || null;
}

export function gangLineState(run, id) {
  const all = (run && run.gangLines) || {};
  const state = all[id];
  const step = state && typeof state.step === 'number' ? state.step : 0;

  return { step, done: !!(state && state.done), started: !!(state && state.started) };
}

/// The step in hand, or null once the line is finished.
export function gangLineStep(run, id) {
  const line = GANG_LINES.find((entry) => entry.id === id);
  if (!line) return null;

  const state = gangLineState(run, id);
  if (state.done || state.step >= line.steps.length) return null;

  return { ...line.steps[state.step], index: state.step, total: line.steps.length };
}

function held(run, step) {
  if (!step) return 0;
  if (step.kind === 'pay') return (run && run.money) || 0;

  const bag = step.from === 'loot' ? (run && run.loot) || {} : (run && run.items) || {};

  return bag[step.id] || 0;
}

/// A hand-in step is ready when what it asked for is in the bag or the pocket.
export function gangLineReady(run, id) {
  const step = gangLineStep(run, id);
  if (!step || (step.kind !== 'bring' && step.kind !== 'pay')) return false;

  return held(run, step) >= step.need;
}

export function gangLineHandIn(step) {
  return !!step && (step.kind === 'bring' || step.kind === 'pay');
}

/// Take what a step asked for. False when it is not there.
export function takeGangStep(run, step) {
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

/// Take the line on, and move it on one step.
export function markGangLineStarted(run, id) {
  if (!run) return null;

  run.gangLines = run.gangLines || {};

  const state = run.gangLines[id];
  if (state && state.started) return state;

  run.gangLines[id] = {
    step: (state && state.step) || 0,
    done: !!(state && state.done),
    started: true
  };

  return run.gangLines[id];
}

export function advanceGangLine(run, id) {
  const line = GANG_LINES.find((entry) => entry.id === id);
  if (!run || !line) return null;

  run.gangLines = run.gangLines || {};

  const state = run.gangLines[id] || { step: 0, done: false, started: true };
  state.step = Math.min(line.steps.length, (state.step || 0) + 1);
  state.started = true;

  if (state.step >= line.steps.length) state.done = true;

  run.gangLines[id] = state;

  return state;
}

/// A line in the leader's mouth when the beggar walks up.
export function gangLineHook(line, state, step) {
  if (!line) return '';

  if (state && state.done) return `${line.owner}：「${line.title}」那事办完了，我认你。`;

  if (!state || !state.started) {
    return `${line.owner}：「${line.title}」——我这儿有件小事，你要是有胆，坐下来听。`;
  }

  return step ? `${line.owner}：「${line.title}」——${step.short}。` : '';
}

/// What the leader says when the beggar asks about the story.
export function gangLineAsk(line, state, step) {
  if (!line) return [];

  if (!state || state.done) return [line.done, `（${line.reward}）`];
  if (!step) return [];

  return [step.ask, `第 ${state.step + 1}/${line.steps.length} 步 · ${step.short}`];
}
