// Sound, without a single audio file. Every noise in the game is built from
// oscillators and filtered white noise on the Web Audio API, because the project
// ships no audio and nothing can be downloaded.
//
// The music is a slow, sparse city groove. It follows the district (each one has
// its own root note and ladder) and the time of day, and it tightens when the
// beggar is digging through a bin, when an officer has spotted them, or when
// somebody is running them down: the tempo climbs and a low bowed note comes in
// underneath. The effects are short and dry, so a bin sounds like a bin.
//
// Everything is driven from the street's update(), so nothing here starts a
// timer of its own.

const BASE_TENSION = 0.15;

// Each district sounds like itself: a different root and a different ladder.
const MOODS = {
  market: { root: 98, scale: [0, 3, 5, 7, 10] },
  square: { root: 110, scale: [0, 2, 3, 7, 9] },
  alley: { root: 87.31, scale: [0, 3, 5, 6, 10] },
  park: { root: 103.83, scale: [0, 2, 4, 7, 9] },
  camp: { root: 92.5, scale: [0, 3, 5, 7, 10] },
  slum: { root: 77.78, scale: [0, 1, 5, 6, 10] },
  commerce: { root: 116.54, scale: [0, 3, 7, 10, 14] }
};

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let noiseBuffer = null;

let droneA = null;
let droneB = null;
let droneFilter = null;
let droneGain = null;

let musicOn = false;
let nextBeatAt = 0;
let beatIndex = 0;

let muted = false;
let ambience = null;
let ambienceGain = null;
let ambienceKind = null;

let tension = BASE_TENSION;
let nightness = 0;
let root = MOODS.market.root;
let scale = MOODS.market.scale.slice();

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/// The desk is closed until a thumb touches the screen: browsers only allow
/// audio after a gesture, so the scenes call this from their first tap.
export function initAudio() {
  if (typeof window === 'undefined') return null;

  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;

  try {
    ctx = new Ctor();
  } catch (err) {
    ctx = null;
    return null;
  }

  master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  musicBus = ctx.createGain();
  musicBus.gain.value = 0.5;
  musicBus.connect(master);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);

  noiseBuffer = buildNoise();

  buildDrone();

  musicOn = true;
  beatIndex = 0;
  nextBeatAt = ctx.currentTime + 0.3;

  if (ctx.state === 'suspended') ctx.resume();

  return ctx;
}

export function audioReady() {
  return !!ctx;
}

/// The whole desk on or off, from the tester panel.
export function setAudioMuted(value) {
  muted = !!value;

  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.1);
}

export function audioMuted() {
  return muted;
}

/// A bed of rain or wind under the street, or nothing at all.
export function setWeatherSound(kind) {
  if (!ctx || !noiseBuffer) return;
  if (kind === ambienceKind) return;

  ambienceKind = kind;

  if (!ambience) {
    ambience = ctx.createBufferSource();
    ambience.buffer = noiseBuffer;
    ambience.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 0.6;

    ambienceGain = ctx.createGain();
    ambienceGain.gain.value = 0.0001;

    ambience.connect(filter);
    filter.connect(ambienceGain);
    ambienceGain.connect(master);
    ambience.start();
  }

  const target = kind === 'rain' ? 0.05 : kind === 'snow' ? 0.025 : 0.0001;

  ambienceGain.gain.setTargetAtTime(target, ctx.currentTime, 0.8);
}

/// Two seconds of white noise, reused by every effect that needs a scrape, a
/// rustle or a thump.
function buildNoise() {
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  return buffer;
}

function buildDrone() {
  droneFilter = ctx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 300;
  droneFilter.Q.value = 4;

  droneGain = ctx.createGain();
  droneGain.gain.value = 0.0001;
  droneFilter.connect(droneGain);
  droneGain.connect(musicBus);

  droneA = ctx.createOscillator();
  droneA.type = 'sawtooth';
  droneA.frequency.value = root / 2;

  droneB = ctx.createOscillator();
  droneB.type = 'sawtooth';
  droneB.frequency.value = (root / 2) * 1.007;

  droneA.connect(droneFilter);
  droneB.connect(droneFilter);
  droneA.start();
  droneB.start();

  droneGain.gain.setTargetAtTime(0.05, ctx.currentTime, 1.5);
}

/// Called when the beggar walks into another district.
export function setDistrictMood(id) {
  const mood = MOODS[id] || MOODS.market;
  root = mood.root;
  scale = mood.scale.slice();

  if (!ctx || !droneA || !droneB) return;

  const low = root / 2;
  droneA.frequency.setTargetAtTime(low, ctx.currentTime, 0.8);
  droneB.frequency.setTargetAtTime(low * 1.007, ctx.currentTime, 0.8);
}

/// An oscillator with an envelope, optionally through a filter.
function playOsc(o) {
  if (!ctx) return;

  const at = o.at === undefined ? ctx.currentTime : o.at;
  const dur = o.dur === undefined ? 0.12 : o.dur;
  const attack = o.attack === undefined ? 0.005 : o.attack;
  const peak = o.gain === undefined ? 0.15 : o.gain;

  const node = ctx.createOscillator();
  node.type = o.type || 'sine';
  node.frequency.setValueAtTime(Math.max(20, o.from || 440), at);
  if (o.to) node.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), at + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  let tail = node;

  if (o.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = o.filter.type || 'lowpass';
    filter.frequency.setValueAtTime(o.filter.freq || 1200, at);
    if (o.filter.to) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.filter.to), at + dur);
    }
    filter.Q.value = o.filter.q === undefined ? 1 : o.filter.q;
    node.connect(filter);
    tail = filter;
  }

  tail.connect(gain);
  gain.connect(o.bus || sfxBus);

  node.start(at);
  node.stop(at + dur + 0.03);
}

/// A burst of filtered noise: footsteps, scrapes, rubbish, wind.
function playNoise(o) {
  if (!ctx || !noiseBuffer) return;

  const at = o.at === undefined ? ctx.currentTime : o.at;
  const dur = o.dur === undefined ? 0.15 : o.dur;
  const peak = o.gain === undefined ? 0.12 : o.gain;
  const attack = o.attack === undefined ? 0.01 : o.attack;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  src.playbackRate.value = o.rate || 1;

  const filter = ctx.createBiquadFilter();
  filter.type = o.type || 'bandpass';
  filter.frequency.setValueAtTime(o.freq || 900, at);
  if (o.to) filter.frequency.exponentialRampToValueAtTime(Math.max(60, o.to), at + dur);
  filter.Q.value = o.q === undefined ? 1 : o.q;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(o.bus || sfxBus);

  src.start(at);
  src.stop(at + dur + 0.03);
}

// One drum of the city: a soft pulse on the beat, a brushed tick, and now and
// then a note from the district's ladder. The busier the street, the more of
// them land.
function scheduleBeat(at, index) {
  if (index % 4 === 0) {
    playOsc({ at, dur: 0.34, type: 'sine', from: 74, to: 46, gain: 0.16, bus: musicBus });
  }

  if (index % 2 === 1) {
    playNoise({ at, dur: 0.06, gain: 0.03, type: 'highpass', freq: 5200, bus: musicBus });
  }

  const chance = 0.2 + tension * 0.5;
  if (Math.random() < chance) {
    const step = scale[Math.floor(Math.random() * scale.length)];
    const octave = Math.random() < 0.3 ? 2 : 1;
    const freq = root * octave * Math.pow(2, step / 12);

    playOsc({
      at,
      dur: 0.5 + Math.random() * 0.5,
      type: 'triangle',
      from: freq,
      gain: 0.045 + tension * 0.05,
      attack: 0.02,
      bus: musicBus,
      filter: { type: 'lowpass', freq: 2200, q: 0.6 }
    });
  }

  // Under a chase: a bowed low note, half a beat behind the pulse.
  if (tension > 0.55 && index % 2 === 0) {
    playOsc({
      at,
      dur: 0.45,
      type: 'sawtooth',
      from: root * 0.75,
      gain: 0.04 + tension * 0.035,
      attack: 0.03,
      bus: musicBus,
      filter: { type: 'lowpass', freq: 420 }
    });
  }
}

/// Called once a frame from the street. `state` is { tension, night }, both 0..1.
export function updateAudio(dt, state) {
  if (!ctx) return;

  const info = state || {};
  const step = Math.max(0, dt || 0);

  tension += (clamp01(info.tension) - tension) * Math.min(1, step * 2.4);
  nightness += (clamp01(info.night) - nightness) * Math.min(1, step * 1.2);

  if (droneFilter) {
    droneFilter.frequency.setTargetAtTime(
      240 + nightness * 80 + tension * 820,
      ctx.currentTime,
      0.35
    );
  }

  if (droneGain) {
    droneGain.gain.setTargetAtTime(0.045 + tension * 0.05, ctx.currentTime, 0.6);
  }

  if (!musicOn || !musicBus) return;

  const tempo = 52 + tension * 64 - nightness * 5;
  const beat = 60 / tempo;
  const now = ctx.currentTime;

  if (nextBeatAt < now) nextBeatAt = now + 0.05;

  let guard = 0;
  while (nextBeatAt < now + 0.35 && guard < 8) {
    scheduleBeat(nextBeatAt, beatIndex);
    nextBeatAt += beat;
    beatIndex += 1;
    guard += 1;
  }
}

const SFX = {
  foot(opts) {
    const at = ctx.currentTime;
    const freq = (opts && opts.freq) || 820;

    playNoise({ at, dur: 0.07, gain: 0.07, type: 'lowpass', freq, q: 0.8, attack: 0.004 });
  },

  dig() {
    const at = ctx.currentTime;

    playNoise({ at, dur: 0.16, gain: 0.15, type: 'bandpass', freq: 620, to: 280, q: 1.1 });
    playNoise({ at: at + 0.09, dur: 0.14, gain: 0.11, type: 'bandpass', freq: 900, to: 340, q: 1.4 });
    playOsc({
      at: at + 0.02,
      dur: 0.12,
      type: 'square',
      from: 320,
      to: 180,
      gain: 0.04,
      filter: { type: 'lowpass', freq: 900 }
    });
  },

  coin() {
    const at = ctx.currentTime;

    playOsc({ at, dur: 0.09, type: 'sine', from: 1568, gain: 0.065, attack: 0.002 });
    playOsc({ at: at + 0.055, dur: 0.13, type: 'sine', from: 2093, gain: 0.055, attack: 0.002 });
  },

  pickup() {
    const at = ctx.currentTime;

    playNoise({ at, dur: 0.06, gain: 0.06, type: 'highpass', freq: 2400 });
    playOsc({ at: at + 0.03, dur: 0.18, type: 'triangle', from: 520, to: 780, gain: 0.055 });
  },

  steal() {
    const at = ctx.currentTime;

    playNoise({ at, dur: 0.22, gain: 0.11, type: 'highpass', freq: 900, to: 3600, q: 0.7, attack: 0.05 });
    playOsc({ at: at + 0.16, dur: 0.1, type: 'sine', from: 1320, gain: 0.045 });
  },

  stealFail() {
    const at = ctx.currentTime;

    playOsc({
      at,
      dur: 0.2,
      type: 'square',
      from: 220,
      to: 120,
      gain: 0.08,
      filter: { type: 'lowpass', freq: 900 }
    });
    playNoise({ at, dur: 0.18, gain: 0.09, type: 'bandpass', freq: 500, q: 1.2 });
  },

  caught() {
    const at = ctx.currentTime;

    playOsc({ at, dur: 0.34, type: 'sine', from: 150, to: 48, gain: 0.28, attack: 0.005 });
    playNoise({ at, dur: 0.3, gain: 0.15, type: 'lowpass', freq: 700, to: 180, q: 0.8 });
  },

  alarm() {
    const at = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      playOsc({
        at: at + i * 0.16,
        dur: 0.12,
        type: 'square',
        from: 880,
        to: 660,
        gain: 0.055,
        filter: { type: 'bandpass', freq: 1200, q: 2 }
      });
    }
  },

  collapse() {
    const at = ctx.currentTime;

    playOsc({ at, dur: 0.9, type: 'sine', from: 120, to: 32, gain: 0.3, attack: 0.01 });
    playNoise({ at, dur: 0.8, gain: 0.15, type: 'lowpass', freq: 500, to: 90, q: 0.7, attack: 0.02 });
  },

  sleep() {
    const at = ctx.currentTime;

    playNoise({ at, dur: 1.2, gain: 0.055, type: 'lowpass', freq: 420, q: 0.6, attack: 0.4 });
    playOsc({ at, dur: 1.4, type: 'sine', from: 90, to: 70, gain: 0.04, attack: 0.3 });
  },

  heart(opts) {
    const at = ctx.currentTime;
    const level = (opts && opts.level) || 0.4;

    playOsc({ at, dur: 0.16, type: 'sine', from: 66, to: 42, gain: 0.18 + level * 0.26, attack: 0.006 });
    playOsc({ at: at + 0.17, dur: 0.2, type: 'sine', from: 58, to: 34, gain: 0.12 + level * 0.2, attack: 0.008 });
    playNoise({ at, dur: 0.1, gain: 0.03 + level * 0.04, type: 'lowpass', freq: 260, q: 0.7 });
  },

  voice() {
    const at = ctx.currentTime;

    playNoise({ at, dur: 0.55, gain: 0.05, type: 'bandpass', freq: 560, to: 420, q: 5, attack: 0.09 });
    playOsc({ at, dur: 0.4, type: 'sine', from: 168, to: 132, gain: 0.03, attack: 0.06 });
  },

  eat() {
    const at = ctx.currentTime;

    playNoise({ at, dur: 0.09, gain: 0.08, type: 'bandpass', freq: 900, q: 1.5 });
    playNoise({ at: at + 0.11, dur: 0.08, gain: 0.06, type: 'bandpass', freq: 700, q: 1.5 });
  },

  ui() {
    const at = ctx.currentTime;

    playOsc({ at, dur: 0.05, type: 'sine', from: 880, gain: 0.03, attack: 0.002 });
  },

  buy() {
    const at = ctx.currentTime;

    playOsc({ at, dur: 0.09, type: 'triangle', from: 660, gain: 0.055 });
    playOsc({ at: at + 0.08, dur: 0.12, type: 'triangle', from: 990, gain: 0.045 });
  },

  sell() {
    const at = ctx.currentTime;

    playOsc({ at, dur: 0.07, type: 'triangle', from: 1320, gain: 0.045 });
    playOsc({ at: at + 0.07, dur: 0.1, type: 'triangle', from: 880, gain: 0.045 });
    playOsc({ at: at + 0.15, dur: 0.12, type: 'triangle', from: 660, gain: 0.04 });
  },

  refuse() {
    const at = ctx.currentTime;

    playOsc({
      at,
      dur: 0.12,
      type: 'square',
      from: 180,
      to: 140,
      gain: 0.045,
      filter: { type: 'lowpass', freq: 600 }
    });
  }
};

/// Plays one of the effects above. Unknown names are ignored rather than
/// throwing, so a renamed sound can never break a frame.
export function playSfx(name, opts) {
  if (!ctx || !sfxBus) return;

  const fn = SFX[name];
  if (!fn) return;

  if (ctx.state === 'suspended') ctx.resume();

  fn(opts || {});
}
