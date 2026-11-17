// The shopkeepers' own business, lifted out of the street scene.
//
// Every counter on the street has somebody behind it with one job they cannot do
// themselves, and that job is a chain of three steps: walk somewhere at the right
// hour, carry something back, hand it over. The steps themselves are data in
// errands.js; this file is the machinery that watches the hour, the weather and
// the wanted level for them, settles a hand-in at the counter, and hands back the
// reward when the last step is done.
//
// It lives here rather than inside StreetScene.js so that adding or changing a
// job means editing errands.js (and, for a reward that changes the run, one more
// line in grantErrandReward below) instead of hunting through a seven-thousand
// line scene. Every function takes the street scene as `scene`, so `scene.run`,
// `scene.player` and the scene's own helpers are all still in reach.

import {
  ERRANDS,
  errandForShop,
  errandState,
  errandStep,
  errandReady,
  errandMet,
  errandHandIn,
  errandById,
  takeForStep,
  advanceErrand,
  markErrandStarted
} from './errands.js';
import { segmentOf } from './time.js';
import { playSfx } from './audio.js';
import { haptic } from './feedback.js';
import { giveTool } from './repair.js';
import { UI } from './style.js';

/// The job hanging off a shop's counter, ready for the HUD to read out.
export function errandFor(scene, shopId) {
  const errand = errandForShop(shopId);
  if (!errand) return null;

  return {
    errand,
    state: errandState(scene.run, errand.id),
    step: errandStep(scene.run, errand.id),
    ready: errandReady(scene.run, errand.id)
  };
}

/// Where the beggar is, when he is there, and what the weather is doing: what a
/// step that finishes by itself is judged against.
export function errandContext(scene) {
  return {
    district: scene.district ? scene.district.id : null,
    segment: segmentOf(scene.run.step),
    weather: scene.cityFx && scene.cityFx.weather ? scene.cityFx.weather.id : null,
    wanted: scene.run.wanted || 0
  };
}

/// Jobs that finish on their own — the right street at the right hour, the rain,
/// or a wanted level low enough for the 城管 to look past — are watched here
/// rather than handed over at a counter.
export function updateErrands(scene) {
  const run = scene.run;
  if (!run || run.over) return;

  if (scene.time.now < (scene.errandAt || 0)) return;
  scene.errandAt = scene.time.now + 500;

  const ctx = errandContext(scene);

  for (const errand of ERRANDS) {
    const state = errandState(run, errand.id);
    if (!state.started) continue;

    const step = errandStep(run, errand.id);
    if (!step || (step.kind !== 'go' && step.kind !== 'wanted')) continue;
    if (!errandMet(step, ctx)) continue;

    scene.completeErrandStep(errand.id);
    return;
  }
}

/// The beggar took the job on: from here the street watches the hour, the place
/// and the weather for him.
export function beginErrand(scene, id) {
  if (!scene.run) return;

  markErrandStarted(scene.run, id);
  scene.saveNow();
}

/// Take what a hand-in step asked for and move the job on.
export function handErrandIn(scene, id) {
  const step = errandStep(scene.run, id);
  if (!errandHandIn(step)) return false;
  if (!errandReady(scene.run, id)) return false;
  if (!takeForStep(scene.run, step)) return false;

  scene.refreshBagCount();
  scene.completeErrandStep(id);

  return true;
}

export function completeErrandStep(scene, id) {
  const errand = errandById(id);
  if (!errand) return;

  const state = advanceErrand(scene.run, id);
  if (!state) return;

  scene.addFavor(errand.speaker, 10);
  playSfx('unlock');
  haptic('unlock');

  if (state.done) {
    grantErrandReward(scene, errand);
    return;
  }

  const next = errandStep(scene.run, id);

  scene.floatText(
    scene.player.x,
    scene.player.y - 50,
    `${errand.title} ${state.step}/${errand.steps.length}`,
    UI.cream
  );

  const hud = scene.scene.get('Hud');
  if (hud && hud.showToast && next) hud.showToast(`${errand.owner}：${next.short}。`);

  scene.saveNow();
}

/// What the shopkeeper hands back: never money, always a door left open. The
/// free bowl and the grocery price are read off the job list itself, so only the
/// ones that change the run need writing down here.
export function grantErrandReward(scene, errand) {
  const run = scene.run;

  if (errand.id === 'decent') {
    run.tools.lockpick = true;
    run.tools.lockpick2 = true;
    giveTool(run, 'lockpick');
    run.perfume = (run.perfume || 0) + 1;
    scene.refreshBagCount();
  }

  // The fitter's own pick, ground by hand, and his bench open to the beggar at
  // half price from here on.
  if (errand.id === 'xiu') {
    run.neverBreak = true;
    run.tools.lockpick = true;
    giveTool(run, 'lockpick');
  }

  scene.floatText(scene.player.x, scene.player.y - 56, `办成了 · ${errand.reward}`, '#a8d98a');

  const hud = scene.scene.get('Hud');
  if (hud && hud.showToast) hud.showToast(`${errand.owner}：${errand.done}`);

  playSfx('jackpot');
  haptic('jackpot');
  scene.saveNow();
}
