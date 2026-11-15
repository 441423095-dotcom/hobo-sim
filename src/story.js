// Chapter one: the first morning. Three small things, and the old man beside
// the lean-to sees the beggar through all of them.

export const STORY_STEPS = 3;

export const STORY_GOALS = {
  1: { label: '去翻找一个垃圾桶', hint: '街的两边都有垃圾桶' },
  2: { label: '去杂货铺买个隔夜面包吃', hint: '杂货铺在市场街' },
  3: { label: '回雨棚睡一觉', hint: '城郊营地的那顶雨棚' }
};

export const STORY_LINES = {
  wake: '你终于醒了。刀疤那帮人昨天又来转悠了。咱们不能坐吃山空，去街头翻翻垃圾桶，捡点能卖钱的东西吧。',
  beforeBin: '先去翻个垃圾桶，看看能捡到什么。桶就在街两边。',
  afterBin: '干得好。肚子饿了吧？去杂货铺买个隔夜面包吃，别饿晕了。',
  beforeBread: '杂货铺在市场街，隔夜面包最便宜，四个钱。',
  afterBread: '天黑了，回雨棚睡一觉吧。',
  beforeSleep: '天黑透了，街上要冷了。回雨棚睡一觉，明天再说。'
};
