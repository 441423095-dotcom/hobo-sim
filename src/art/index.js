// Every texture the game uses, drawn in code. Safe to call from any scene:
// keys that already exist are left alone.

import { buildWorldArt } from './scenery.js';
import { buildSpriteArt } from './sprites.js';

export function createGameArt(scene) {
  buildWorldArt(scene);
  buildSpriteArt(scene);
}
