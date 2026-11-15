// What the street says.
//
// Passers-by have their own voices: the ones who drop a coin into the bowl say
// something, the ones who walk past say something less kind, and a lift that is
// noticed gets a shout. They change with the district and with the hour, so the
// market at noon does not sound like the black street at midnight.
//
// Old Zhou reads the run and says what he would do next.

function pick(list) {
  if (!list || !list.length) return '';
  return list[Math.floor(Math.random() * list.length)];
}

/// One line out of three pools: the district's own voice half the time, the
/// hour of the day a third of the time, and the plain line the rest.
function flavour(generic, byDistrict, byTime, districtId, segment) {
  const roll = Math.random();

  if (roll < 0.5) {
    const local = byDistrict[districtId];
    if (local && local.length) return pick(local);
  } else if (roll < 0.85) {
    const timed = byTime[segment];
    if (timed && timed.length) return pick(timed);
  }

  return pick(generic);
}

const GIVE_GENERIC = [
  '拿去拿去，买个热狗吃吧，别在这挡道了。',
  '就这些了，别跟着我。',
  '年纪轻轻的……算了，拿好。',
  '我今天心情好，别问了。',
  '手伸出来。快点。'
];

const GIVE_DISTRICT = {
  market: ['菜市场剩的，拿去吧。', '看你守了一早上，给你凑个整。', '挡在摊位前面，给你两块别吭声。'],
  square: ['刚下火车，零钱你拿着。', '赶车呢，就这一把零钱。', '车站人多，别在这儿坐太久。'],
  alley: ['这条巷子就你一个人，拿着吧。', '我也不宽裕，就这几块。', '别翻后面的桶，那是我的。'],
  park: ['树底下凉快，别晒坏了。', '散完步剩的零钱，给你。', '下棋赢了，赏你两个。'],
  camp: ['路过看看你，收着。', '荒地里也有人坐着，拿去吧。', '天冷，买点热的。'],
  slum: ['别在这儿待太久。', '拿走，别跟人说见过我。', '黑街的钱不干净，你敢要就拿。'],
  commerce: ['一杯奶茶钱，拿着。', '别挡着门口，给你。', '西装口袋掏出来的，接住。']
};

const GIVE_TIME = {
  0: ['早上冷，买口热的。', '这么早就出来了？给你。'],
  1: ['中午了，去吃点东西。', '太阳这么大，拿去买水。'],
  2: ['天要黑了，早点回去。', '晚了街上不安全，收着。'],
  3: ['这么晚还在外面？拿着吧。', '大半夜的，你不冷吗。']
};

const REFUSE_GENERIC = [
  '滚开，臭要饭的！',
  '别碰我，脏死了。',
  '没零钱，走开。',
  '一边去。',
  '离我远点。'
];

const REFUSE_DISTRICT = {
  market: ['让让，挡着我挑菜了。', '这摊子的地儿，你别坐。', '晦气，走开。'],
  square: ['赶车呢，别挡道。', '车站人来人往的，你坐这儿像什么话。', '警察呢？'],
  alley: ['这儿是我的地盘，滚。', '巷子里也敢蹲？', '再不走我叫人了。'],
  park: ['保安怎么又把你放进来了。', '别把公园当你家。', '孩子看着呢。'],
  camp: ['荒地里也蹲着人。', '走远点，别在我帐篷边上。', '你自己不是有帐篷吗。'],
  slum: ['再缠着我就叫人了。', '黑街的人不施舍。', '滚，别惹麻烦。'],
  commerce: ['保安！保安！', '别碰我大衣。', '这年头什么人都有。']
};

const REFUSE_TIME = {
  0: ['一大早的，晦气。', '这么早就来讨，谁欠你的。'],
  1: ['没看见我赶时间？', '大白天的不去找活干。'],
  2: ['天都黑了还赖在外面。', '回去睡觉吧，没人给你钱。'],
  3: ['大半夜的吓我一跳。', '深更半夜蹲在这儿，想吓死谁。']
};

const STEAL_NOTICED = [
  '我钱包呢？！',
  '谁动我兜了？',
  '哎——我的钱！',
  '你手往哪儿伸呢！'
];

const STEAL_CAUGHT = [
  '你干什么！',
  '小偷！抓小偷！',
  '手往哪儿放呢你！',
  '这人有毛病吧！'
];

const PEDDLE_BUY = [
  '行吧，我买了。',
  '这东西还行，给你钱。',
  '就这个价，我要了。',
  '便宜点就便宜点，拿走吧。'
];

const PEDDLE_REFUSE = [
  '谁要你这破玩意！',
  '不要不要，别缠着我。',
  '这破东西也拿来卖？',
  '走开，我不买。'
];

/// A passer-by dropping a coin, in the voice of the district and the hour.
export function begGiveLine(districtId, segment) {
  return flavour(GIVE_GENERIC, GIVE_DISTRICT, GIVE_TIME, districtId, segment);
}

/// A passer-by who is not stopping.
export function begRefuseLine(districtId, segment) {
  return flavour(REFUSE_GENERIC, REFUSE_DISTRICT, REFUSE_TIME, districtId, segment);
}

export function stealNoticedLine() {
  return pick(STEAL_NOTICED);
}

export function stealCaughtLine() {
  return pick(STEAL_CAUGHT);
}

export function peddleBuyLine() {
  return pick(PEDDLE_BUY);
}

export function peddleRefuseLine() {
  return pick(PEDDLE_REFUSE);
}

/// What Old Zhou would say, given where the beggar stands right now.
/// `state` is { hunger, energy, money, bag, segment, clean, cold }.
export function zhouAdvice(state) {
  const s = state || {};

  if (s.segment >= 2 && s.cold) {
    return '天都黑了，帐篷里没火，寒气往骨头里钻。早点回来，别硬撑。';
  }

  if ((s.hunger || 0) < 26) {
    return '你肚子叫得这么响，先去弄口吃的，饿着肚子什么都干不成。';
  }

  if ((s.energy || 0) < 22) {
    return '腿都软了，回帐篷躺一会儿。硬撑着只会倒在街上。';
  }

  if (s.segment >= 2) {
    return '天快黑了，早点回帐篷，晚街上什么人都有。';
  }

  if ((s.bag || 0) >= 8) {
    return '包里货不少了，去当铺出了，钱压在包里又不生钱。';
  }

  if ((s.money || 0) < 6) {
    return '去后巷翻桶，那儿的废品最值钱；市场街的桶也行，人多，手脚快些。';
  }

  if (s.segment === 1 && (s.clean || 0) > 0.4) {
    return '你这一身干净，火车站人多、钱也多，今天讨钱有戏。';
  }

  if ((s.clean || 0) < 0.2) {
    return '先淘一件干净衣裳，讨钱也体面些，别让人一看就躲。';
  }

  return '顺着街走走，见人点个头，多少能讨着。别在警察眼皮底下动手。';
}
