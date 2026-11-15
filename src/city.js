// The weather and the city's moods.
//
// A day comes with one kind of weather and, most days, one thing the city is up
// to: a wave of people off a train, a street sweep by the 城管, a night market
// opening up, or water standing in the road after a downpour. Everything else
// reads the multipliers in cityEffects() — begging, selling, how far the police
// can see, how fast the cold gets in.

export const WEATHERS = {
  clear: { id: 'clear', name: '晴', pedMul: 1, begMul: 1, coldExtra: 0, heat: 0 },
  rain: { id: 'rain', name: '雨', pedMul: 0.7, begMul: 0.7, coldExtra: 0.35, heat: 0 },
  snow: { id: 'snow', name: '雪', pedMul: 0.55, begMul: 0.55, coldExtra: 0.6, heat: 0 },
  hot: { id: 'hot', name: '闷热', pedMul: 0.85, begMul: 0.85, coldExtra: -0.2, heat: 0.5 }
};

export const EVENTS = {
  crowd: {
    id: 'crowd',
    name: '车站客流高峰',
    minutes: 180,
    pedMul: 1.5,
    begMul: 1.25,
    sellMul: 1,
    police: 1
  },
  sweep: {
    id: 'sweep',
    name: '城管清查',
    minutes: 120,
    pedMul: 0.8,
    begMul: 0.4,
    sellMul: 1,
    police: 1.35
  },
  market: {
    id: 'market',
    name: '夜市开张',
    minutes: 240,
    pedMul: 1.3,
    begMul: 1,
    sellMul: 1.25,
    police: 0.85
  },
  flood: {
    id: 'flood',
    name: '暴雨积水',
    minutes: 150,
    pedMul: 0.5,
    begMul: 0.3,
    sellMul: 1,
    police: 1
  }
};

export function rollWeather() {
  const r = Math.random();

  if (r < 0.45) return 'clear';
  if (r < 0.7) return 'rain';
  if (r < 0.85) return 'snow';
  return 'hot';
}

export function rollEvents() {
  const pool = Object.keys(EVENTS);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = pool[i];
    pool[i] = pool[j];
    pool[j] = swap;
  }

  const roll = Math.random();
  const count = roll < 0.3 ? 0 : roll < 0.85 ? 1 : 2;
  const out = [];

  for (let i = 0; i < count; i++) {
    const id = pool[i];
    const from = 120 + Math.floor(Math.random() * 780);

    out.push({ id, from, to: from + EVENTS[id].minutes });
  }

  return out;
}

export function makeCity(day) {
  return { day, weather: rollWeather(), events: rollEvents() };
}

/// The next morning's weather, rolled once a day and kept on the run.
export function ensureCity(run) {
  if (!run.city || run.city.day !== run.day) run.city = makeCity(run.day);

  return run.city;
}

export function activeEvent(city, minute) {
  if (!city || !Array.isArray(city.events)) return null;

  for (const ev of city.events) {
    if (minute >= ev.from && minute < ev.to) return ev;
  }

  return null;
}

export function cityEffects(city, minute) {
  const weather = (city && WEATHERS[city.weather]) || WEATHERS.clear;
  const ev = activeEvent(city, minute);
  const event = ev ? EVENTS[ev.id] || null : null;

  return {
    weather,
    event,
    pedMul: weather.pedMul * (event ? event.pedMul : 1),
    begMul: weather.begMul * (event ? event.begMul : 1),
    sellMul: event ? event.sellMul : 1,
    police: event ? event.police : 1,
    coldExtra: weather.coldExtra,
    heat: weather.heat
  };
}

/// "雨 · 城管清查"
export function cityLabel(city, minute) {
  const weather = (city && WEATHERS[city.weather]) || WEATHERS.clear;
  const ev = activeEvent(city, minute);

  return ev ? `${weather.name} · ${EVENTS[ev.id].name}` : weather.name;
}
