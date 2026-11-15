// Old Zhou's work for the day.
//
// Every morning the old man beside the tent hands over one to three jobs, and
// the first day's list is the tutorial: dig, beg, lift, sell, sleep, in that
// order, so a new beggar is walked through the loop instead of guessing at it.
//
// A goal is plain data: what to count (kind), how much (need), how it reads,
// and what it pays. The street counts the actions as they happen; the HUD only
// reads the list.

const TUTORIAL_GOALS = [
  {
    kind: 'bins',
    need: 1,
    label: '去翻一个垃圾桶',
    tip: '走到垃圾桶旁边，点右下角那只手的按钮。',
    reward: { money: 5 }
  },
  {
    kind: 'beg',
    need: 3,
    label: '坐下讨到 3 元',
    tip: '找一块乞讨的纸板坐下，等路人往碗里丢钱。',
    reward: { money: 5 }
  },
  {
    kind: 'steal',
    need: 1,
    label: '顺手摸一次口袋',
    tip: '贴着路人走，右下角的按钮就能拿他的钱袋，点一下看准时机。',
    reward: { money: 8 }
  },
  {
    kind: 'sell',
    need: 5,
    label: '把废品卖掉换 5 元',
    tip: '去市场街的旧货摊或当铺，把包里的废品卖掉。',
    reward: { money: 8 }
  },
  {
    kind: 'home',
    need: 1,
    label: '回城郊帐篷睡一觉',
    tip: '天黑前走回城郊营地，进帐篷躺下，明天再来看老周。',
    reward: { money: 10 }
  }
];

const DAY_POOL = [
  {
    kind: 'bins',
    amounts: [3, 4],
    label: (need) => `翻 ${need} 个垃圾桶`,
    tip: '后巷和市场街的桶最多。',
    reward: { money: 8, items: { cardboard: 2 } }
  },
  {
    kind: 'beg',
    amounts: [8, 12, 16],
    label: (need) => `乞讨凑到 ${need} 元`,
    tip: '火车站广场人多，钱也好讨。',
    reward: { money: 6 }
  },
  {
    kind: 'steal',
    amounts: [1, 2],
    label: (need) => `摸 ${need} 次钱包`,
    tip: '挑落单的、走路慢的，别在警察眼皮底下动手。',
    reward: { money: 12 }
  },
  {
    kind: 'sell',
    amounts: [20, 30, 40],
    label: (need) => `卖废品换 ${need} 元`,
    tip: '当铺给价高一些，旧货摊出手快。',
    reward: { money: 12 }
  }
];

const HOME_GOAL = {
  kind: 'home',
  need: 1,
  label: '天黑前回帐篷生火睡觉',
  tip: '帐篷里有壁炉就不怕冻，没有就早点回去。',
  reward: { money: 10 }
};

/// The day's list. Day one is the tutorial, fixed and in order; after that he
/// picks one to three jobs from the pool, sometimes with the tent on the list.
export function makeGoalsForDay(day) {
  if (day <= 1) {
    return TUTORIAL_GOALS.map((goal) => ({
      kind: goal.kind,
      need: goal.need,
      label: goal.label,
      tip: goal.tip,
      reward: { ...goal.reward },
      progress: 0,
      done: false
    }));
  }

  const order = DAY_POOL.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }

  const count = 1 + Math.floor(Math.random() * 3);
  const picks = order.slice(0, count);

  if (picks.length < 3 && Math.random() < 0.55) picks.push(HOME_GOAL);

  return picks.map((entry) => {
    const need = entry.amounts
      ? entry.amounts[Math.floor(Math.random() * entry.amounts.length)]
      : entry.need;

    return {
      kind: entry.kind,
      need,
      label: entry.amounts ? entry.label(need) : entry.label,
      tip: entry.tip || null,
      reward: {
        ...entry.reward,
        items: entry.reward.items ? { ...entry.reward.items } : undefined
      },
      progress: 0,
      done: false
    };
  });
}
