// The people behind the counters, in their own words.
//
// Each of them gets a portrait and a few lines when the beggar walks up. What
// they say depends on whether it is the first time, on the hour, and on how much
// they have come to like him — a stranger gets the cold version, a regular gets
// the warm one.

import { segmentOf } from './time.js';

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

function met(run, id) {
  return !!(run && run.met && run.met[id]);
}

function seg(run) {
  return run ? segmentOf(run.step) : 1;
}

/// A first meeting, or one line for the hour plus the warmer one once they know
/// him. Never more than three lines in the box at once.
function compose(intro, byHour, friendly, run, id) {
  if (!met(run, id)) return intro.slice(0, 3);

  const lines = [];
  const timed = byHour[seg(run)];

  if (timed) lines.push(timed);

  if (warm(run, id) && friendly.length) {
    lines.push(friendly[lines.length % friendly.length]);
  } else if (lines.length === 0) {
    lines.push(intro[0]);
  }

  return lines.slice(0, 3);
}

const TALKS = {
  convenience: {
    speaker: 'zhang',
    intro: ['新面孔啊。买东西？', '热食在最下面那层，自己看价签。', '别在门口杵着，挡生意。'],
    byHour: {
      0: '这么早就来买？热包子刚上。',
      1: '中午人多，挑得快一点。',
      2: '天要黑了，买完早点回去。',
      3: '这个点还开着，就我一个了。'
    },
    friendly: ['来啦，老样子？热水刚烧上。', '你这几天老在我这儿买东西，我都记着账呢。']
  },

  grocery: {
    speaker: 'boss',
    intro: ['杂货都在这儿，纸箱绳子按捆卖。', '手别抖，碰倒了算你的。'],
    byHour: {
      0: '刚开门，货还没码齐。',
      1: '要什么喊一声，我在里屋。',
      2: '快收摊了，挑完给钱。',
      3: '这么晚还出来买绳子？'
    },
    friendly: ['老熟人了，零头给你抹了。', '袋子自己拿，别跟我客气。']
  },

  clothes: {
    speaker: 'tailor',
    intro: ['换身干净的吧，这一身我看着都替你难受。', '干净衣服讨钱也体面，人靠衣装嘛。'],
    byHour: {
      0: '早上凉，先看外套。',
      1: '照着镜子挑，别把泥蹭柜子上。',
      2: '天黑前挑好，我要关门了。',
      3: '都这个点了还来挑衣服？'
    },
    friendly: ['你穿那件挺合身，我看着都顺眼。', '下次来我给你留一件。']
  },

  black: {
    speaker: 'cap',
    intro: ['帽檐底下打量了他一眼。', '别问来路，钱放下就拿走。', '出去以后，别说来过这儿。'],
    byHour: {
      0: '这么早？黑市还没醒。',
      1: '白天别在这儿久留。',
      2: '太阳下去，生意才开张。',
      3: '夜里的黑街，才是黑街。'
    },
    friendly: ['你倒是常客了。', '东西照旧，出去了也别说见过我。']
  },

  vendor: {
    speaker: 'vendor',
    intro: ['热汤面，站着吃完再走。', '排后面，别插队。'],
    byHour: {
      0: '头一锅汤，最鲜。',
      1: '中午加一勺辣子？',
      2: '天黑前最后一锅。',
      3: '收摊了，就剩这些。'
    },
    friendly: ['还是老一份？给你多加点汤。', '看你来得勤，今天算你便宜点。']
  }
};

export function shopTalk(shopId, run) {
  if (shopId && shopId.indexOf('stall-') === 0) {
    const talk = TALKS.vendor;
    return {
      speaker: talk.speaker,
      lines: compose(talk.intro, talk.byHour, talk.friendly, run, 'stall')
    };
  }

  const talk = TALKS[shopId];
  if (!talk) return null;

  const who = {
    black: 'cap',
    convenience: 'zhang',
    grocery: 'boss',
    clothes: 'tailor'
  };

  const id = who[shopId] || shopId;

  return { speaker: talk.speaker, lines: compose(talk.intro, talk.byHour, talk.friendly, run, id) };
}

export function tradeTalk(mode, run) {
  if (mode === 'pawn') {
    return {
      speaker: 'chen',
      lines: met(run, 'chen')
        ? warm(run, 'chen')
          ? ['来了。你这些货我认得，给你个好价。', '别拿次品糊我，大家都是老交情了。']
          : ['东西放下，我看看成色。', '来路我不管，价钱我说了算。']
        : ['第一次来？东西放下，我看看成色。', '来路我不管，价钱我说了算。', '卖就卖，不卖别耽误别人。']
    };
  }

  return {
    speaker: 'vendor',
    lines: met(run, 'stall')
      ? warm(run, 'stall')
        ? ['哟，又是你，包里的都拿来吧。', '你这些瓶瓶罐罐，我照单全收。']
        : ['废品放台子上，论斤称。', '别把垃圾倒我摊位前头。']
      : ['收废品的。瓶子、纸板、铁皮，都收。', '别把垃圾倒我摊位前头。']
  };
}

/// Old Zhou's opener, before he gets to the advice.
export function zhouGreeting(run) {
  if (!met(run, 'zhou')) return '你就是新来的那个？行，坐下说。';

  const byHour = {
    0: '这么早就起来了。',
    1: '日头正好，别老蹲在阴影里。',
    2: '天要黑了，手里还有事吗？',
    3: '这么晚还没回去？'
  };

  return byHour[seg(run)] || '来了。';
}
