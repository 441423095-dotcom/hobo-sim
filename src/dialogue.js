// The people behind the counters, in their own words.
//
// Each of them gets a portrait and a few lines when the beggar walks up: the
// shopkeeper, the pawnbroker, the stall boss and the man in the hat. What they
// say depends a little on how the day is going and how much they like him.

export const SPEAKERS = {
  zhou: { name: '老周', portrait: 'oldzhou' },
  chen: { name: '老陈', portrait: 'ped-suit' },
  zhang: { name: '老张', portrait: 'ped-suit' },
  boss: { name: '老板娘', portrait: 'ped-lady' },
  tailor: { name: '裁缝', portrait: 'ped-lady' },
  cap: { name: '戴帽子的', portrait: 'ped-gang' },
  vendor: { name: '摊主', portrait: 'ped-lady' }
};

function favorOf(run, id) {
  return (run && run.favor && run.favor[id]) || 0;
}

function warm(run, id) {
  return favorOf(run, id) >= 50;
}

export function shopTalk(shopId, run) {
  if (shopId === 'convenience') {
    return {
      speaker: 'zhang',
      lines: warm(run, 'zhang')
        ? [
            '来啦，老样子？热水刚烧上。',
            '你这几天老在我这儿买东西，我都记着账呢。',
            '别客气，挑吧。'
          ]
        : [
            '买什么？手别碰玻璃。',
            '热食在最下面那层，自己看价签。',
            '有钱就快挑，没钱的别站门口。'
          ]
    };
  }

  if (shopId === 'grocery') {
    return {
      speaker: 'boss',
      lines: [
        '杂货都在这儿了，纸箱绳子按捆卖。',
        '手别抖，碰倒了算你的。',
        '要什么喊一声，我在里屋。'
      ]
    };
  }

  if (shopId === 'clothes') {
    return {
      speaker: 'tailor',
      lines: [
        '换身干净的吧，这一身我看着都替你难受。',
        '干净衣服讨钱也体面，人靠衣装嘛。',
        '试穿可以，别把泥蹭到柜子上。'
      ]
    };
  }

  if (shopId === 'black') {
    return {
      speaker: 'cap',
      lines: warm(run, 'cap')
        ? [
            '你倒是常客了。',
            '东西照旧，别问来路，出去了也别说见过我。',
            '钱放下，人拿走。'
          ]
        : [
            '帽檐底下打量了他一眼。',
            '别问来路，钱放下就拿走。',
            '出去以后，别说来过这儿。'
          ]
    };
  }

  if (shopId && shopId.indexOf('stall-') === 0) {
    return {
      speaker: 'vendor',
      lines: warm(run, 'stall')
        ? ['还是老一份？给你多加点汤。', '看你来得勤，今天算你便宜点。']
        : ['热汤面，站着吃完再走。', '排后面，别插队。']
    };
  }

  return null;
}

export function tradeTalk(mode, run) {
  if (mode === 'pawn') {
    return {
      speaker: 'chen',
      lines: warm(run, 'chen')
        ? [
            '来了。你这些货我认得，给你个好价。',
            '别拿次品糊我，大家都是老交情了。'
          ]
        : [
            '东西放下，我看看成色。',
            '来路我不管，价钱我说了算。',
            '卖就卖，不卖别耽误别人。'
          ]
    };
  }

  return {
    speaker: 'vendor',
    lines: warm(run, 'stall')
      ? ['哟，又是你，包里的都拿来吧。', '你这些瓶瓶罐罐，我照单全收。']
      : ['废品放台子上，论斤称。', '别把垃圾倒我摊位前头。']
  };
}
