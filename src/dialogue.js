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
  vendor: { name: '摊主', portrait: 'ped-lady' },
  crow: { name: '老鸦', portrait: 'ped-gang' },
  tin: { name: '铁皮', portrait: 'ped-gang' },
  bench: { name: '老刘', portrait: 'ped-oldlady' },
  sun: { name: '老孙', portrait: 'ped-drunk' },
  pang: { name: '胖姐', portrait: 'ped-lady' }
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

// What Old Zhou will talk about when there is no work to hand out. This is where
// the city's backstory lives: the street, its rules, the people who keep it, and
// the ones who did not last.

const LORE = [
  {
    id: 'street',
    label: '这条街',
    minDay: 1,
    lines: [
      '这条街没有名字，地图上就写着“市场街”。',
      '往东是火车站，往西是城郊，中间夹着后巷和小公园。',
      '二十年前路两边都是国营厂，后来厂子散了，人也就散了。'
    ]
  },
  {
    id: 'rules',
    label: '街上的规矩',
    minDay: 1,
    lines: [
      '要饭有要饭的规矩：谁先坐下的地儿，就是谁的。',
      '碗摆前头，别追着人跑，追一次丢一个月的脸。',
      '也别在同一个门口待太久，店家烦了就叫城管。'
    ]
  },
  {
    id: 'zhou',
    label: '老周以前',
    minDay: 1,
    favor: 10,
    lines: [
      '我？以前在城东修自行车，铺子叫“老周车行”。',
      '后来路修宽了，车都换成电的，没人再来修。',
      '老婆走得早，儿子去了南方，说好过年回来。',
      '帐篷边上那块地是我给你留的，别嫌偏。'
    ]
  },
  {
    id: 'police',
    label: '城管与警察',
    minDay: 2,
    lines: [
      '穿蓝马甲的不是警察，是城管，管摊子、也管睡在街上的人。',
      '警察管偷抢。城管管你碍不碍眼。',
      '城管来了就挪，别讲理，讲理他们更来劲。'
    ]
  },
  {
    id: 'shelter',
    label: '收容站',
    minDay: 2,
    lines: [
      '城东有个收容站，冬天才开，管一顿饭一张床。',
      '进去要登记，出来的时候身上的东西得留一半。',
      '真冻得受不了就去，别硬扛，硬扛的人我送走过好几个。'
    ]
  },
  {
    id: 'station',
    label: '火车站',
    minDay: 2,
    lines: [
      '车站的人一波一波：早班车七点，末班车十一点。',
      '赶上客流高峰，一个钟头能讨到平时一天的钱。',
      '候车室不能过夜，巡夜的会拿手电照你。'
    ]
  },
  {
    id: 'slum',
    label: '黑街',
    minDay: 3,
    lines: [
      '黑街以前是屠宰场，荒了以后剩下的人自己立了规矩。',
      '那儿东西便宜，来路也脏；钱在那边不算钱，命更不算。',
      '戴帽子的那个是黑街上说话算数的人，别欠他的。'
    ]
  },
  {
    id: 'king',
    label: '谁当过王',
    minDay: 3,
    favor: 25,
    lines: [
      '这条街出过一个“王”，叫老疤。',
      '他不用讨，坐着就有人送钱来——因为他认识所有人。',
      '后来一个冬天他没熬过去，王位就空到现在。',
      '想坐上去，得让这条街上的人认你，不是让碗里多点钱。'
    ]
  }
];

/// The few things he has to tell today: unread stories first, then the rest.
export function zhouLore(run) {
  const seen = (run && run.lore) || {};
  const favor = favorOf(run, 'zhou');
  const day = (run && run.day) || 1;

  const open = LORE.filter((t) => day >= (t.minDay || 1) && favor >= (t.favor || 0));
  const unread = open.filter((t) => !seen[t.id]);
  const heard = open.filter((t) => seen[t.id]);

  return unread.concat(heard).slice(0, 5);
}

