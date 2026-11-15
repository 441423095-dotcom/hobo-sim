// Short things that happen on the street, out of nowhere.
//
// None of them is a fight or a job: a drunk who wants an audience, a 城管
// checkpoint, a reporter with a camera, a kid whose dog will not stop barking.
// Each is a line of scene and two or three ways to answer it, and each answer
// costs or pays in money, time, breath or the street's memory.
//
// Which one comes up depends on where the beggar is and what hour it is: the
// drunk is a night thing, the checkpoint is a market thing, the reporter likes
// daylight, the dog belongs to the park.

export const ENCOUNTERS = [
  {
    id: 'drunk',
    title: '醉汉拉住你',
    body: '一个满身酒气的男人扶着电线杆，非叫你听他讲以前在厂里的事，讲两句就问你是不是看不起他。',
    options: [
      { id: 'listen', label: '听他讲完', info: '耗半小时，他说不定会塞你点钱' },
      { id: 'walk', label: '挣开走人', info: '他大概会骂两句' },
      { id: 'booze', label: '给他买瓶酒（4 元）', info: '他把兜里的东西掏给你' }
    ],
    weight: (ctx) => (ctx.segment >= 2 ? 3 : 1)
  },
  {
    id: 'cordon',
    title: '城管临时设卡',
    body: '两个穿蓝马甲的在路口支了张桌子，挨个查证件和包，路过的人都在绕。',
    options: [
      { id: 'cooperate', label: '老实配合', info: '耽误一会儿，包可能被翻' },
      { id: 'slip', label: '绕进巷子', info: '走掉最好，走不掉会被记住' },
      { id: 'bribe', label: '递五块钱', info: '他们当没看见你' }
    ],
    weight: (ctx) =>
      (ctx.district === 'market' || ctx.district === 'square' || ctx.district === 'commerce'
        ? 3
        : 1) + (ctx.wanted > 20 ? 1 : 0)
  },
  {
    id: 'reporter',
    title: '记者想采访两句',
    body: '一个挂着相机的年轻人蹲在你袋子边上，说想做一期「城市边缘」，问你愿不愿意说两句。',
    options: [
      { id: 'truth', label: '说实话', info: '他请你吃份热乎的' },
      { id: 'sob', label: '编个惨故事', info: '钱更多，城管也可能找上门' },
      { id: 'refuse', label: '摆摆手', info: '他不纠缠' }
    ],
    weight: (ctx) => (ctx.segment <= 1 ? 2 : 1)
  },
  {
    id: 'dog',
    title: '小孩的狗冲你叫',
    body: '一个小孩牵着条土狗，狗冲着你的袋子叫个不停，小孩两只手都拉不住。',
    options: [
      { id: 'pet', label: '蹲下摸摸它', info: '可能就熟了，也可能挨一口' },
      { id: 'around', label: '贴着墙绕过去', info: '省事' },
      { id: 'growl', label: '冲它呲牙', info: '看谁先怂' }
    ],
    weight: (ctx) => (ctx.district === 'park' || ctx.district === 'camp' ? 2 : 1)
  }
];

/// One event for the moment, weighted by where and when it is. Null when
/// nothing fits.
export function pickEncounter(ctx) {
  const pool = [];
  let total = 0;

  for (const event of ENCOUNTERS) {
    const weight = Math.max(0, event.weight ? event.weight(ctx) : 1);
    if (weight <= 0) continue;

    pool.push({ event, at: total });
    total += weight;
  }

  if (!total) return null;

  const roll = Math.random() * total;
  let picked = pool[0].event;

  for (const entry of pool) {
    if (roll >= entry.at) picked = entry.event;
  }

  return picked;
}
