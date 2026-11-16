// The beggar gangs of the city: who they are, where they sit, and the small
// jobs they hand out. Standing with a gang is the third road to the crown: do
// what they ask, and when the street counts you one of their own they put you
// up for election.

export const GANGS = {
  crow: {
    id: 'crow',
    name: '老鸦帮',
    leader: '老鸦',
    speaker: 'crow',
    district: 'alley',
    spot: { x: 200, y: 980 },
    story: [
      '后巷这只火桶，是我烧了六年的。你是新来的吧。',
      '这条巷子里的桶，一半归我管。想在这儿翻东西，先跟我说句话。',
      '你办事挺利索。街面上这些事，我一句话比十个人喊都管用。'
    ],
    idle: '今天没什么事，明儿再来。',
    quests: [
      { kind: 'item', id: 'wire', need: 3, reward: 16 },
      { kind: 'money', need: 12, reward: 12 },
      {
        kind: 'tell',
        district: 'market',
        need: 1,
        reward: 15,
        message: '东头那车纸板是我老鸦先看见的，让老刘别动。'
      }
    ]
  },
  tin: {
    id: 'tin',
    name: '铁皮队',
    leader: '铁皮',
    speaker: 'tin',
    district: 'slum',
    word: '黑街',
    spot: { x: 200, y: 1000 },
    story: [
      '黑街没什么规矩，除了我这条。',
      '要在这儿待，就得有点用。空手来的，我这儿不留。',
      '你办的事我记着。黑街的人记性都好。',
      '行，这街面上，你可以说是我的人。'
    ],
    idle: '今天没活儿，去别处转转。',
    quests: [
      { kind: 'item', id: 'pipe', need: 2, reward: 18 },
      { kind: 'money', need: 15, reward: 14 },
      { kind: 'item', id: 'wire', need: 3, reward: 16 },
      {
        kind: 'tell',
        district: 'park',
        need: 1,
        reward: 14,
        message: '黑街这批货不往你们公园过，让老刘别多问。'
      }
    ]
  },
  bench: {
    id: 'bench',
    name: '长椅会',
    speaker: 'bench',
    leader: '老丁',
    district: 'park',
    spot: { x: 240, y: 1150 },
    story: ['公园这几张椅子，是我们先坐下的。', '不闹事、不抢碗，我们就当你是自己人。'],
    idle: '今天没什么事，坐下歇会儿吧。',
    quests: [
      { kind: 'item', id: 'newspaper', need: 3, need2: 2, needId2: 'cardboard', reward: 15 },
      { kind: 'money', need: 9, reward: 12 },
      {
        kind: 'tell',
        district: 'alley',
        need: 1,
        reward: 13,
        message: '公园这几张椅子我们不挪，人也别往这边带。'
      }
    ]
  }
};

// Reputation at which the street will put the beggar up for the crown.
export const GANG_CROWN = 60;

export function emptyGangs() {
  return { crow: 0, tin: 0, bench: 0 };
}

export function gangStanding(run, id) {
  return (run && run.gangs && run.gangs[id]) || 0;
}

export function addStanding(run, id, n) {
  if (!run) return 0;

  run.gangs = run.gangs || {};
  run.gangs[id] = Math.min(100, (run.gangs[id] || 0) + (n || 0));

  return run.gangs[id];
}

export function gangHonour(run, id) {
  const standing = gangStanding(run, id);

  if (standing >= GANG_CROWN) return '他们认你';
  if (standing >= 40) return '算是自己人';
  if (standing >= 15) return '混个脸熟';

  return '陌生人';
}

// A gang only has so much face to give out in one day: past this, another
// envelope of cash is just money, and the street notices nothing new.
export const GANG_DAILY_CAP = 12;

/// Standing with a ceiling on how much of it one day can buy.
export function addDailyStanding(run, id, n) {
  if (!run) return 0;

  run.gangDay = run.gangDay || {};

  const today = run.gangDay[id];
  if (!today || today.day !== run.day) run.gangDay[id] = { day: run.day, gain: 0 };

  const used = run.gangDay[id].gain;
  const add = Math.min(Math.max(0, GANG_DAILY_CAP - used), Math.max(0, n || 0));

  run.gangDay[id].gain = used + add;

  return addStanding(run, id, add);
}

/// How much more this gang will think of the beggar today.
export function gangGainLeft(run, id) {
  const today = run.gangDay && run.gangDay[id];
  if (!today || today.day !== run.day) return GANG_DAILY_CAP;

  return Math.max(0, GANG_DAILY_CAP - today.gain);
}

/// One job from the gang's list, ready to be written onto the run.
export function pickGangQuest(gang) {
  if (!gang || !gang.quests || !gang.quests.length) return null;

  const pick = gang.quests[Math.floor(Math.random() * gang.quests.length)];

  return {
    gang: gang.id,
    kind: pick.kind,
    id: pick.id || null,
    district: pick.district || null,
    message: pick.message || null,
    need: pick.need,
    reward: pick.reward
  };
}

export function gangById(id) {
  return GANGS[id] || null;
}
