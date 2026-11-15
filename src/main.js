// Entry point: the Phaser game configuration and nothing else. Gameplay lives
// in scenes under src/scenes/.

import { StreetScene } from './scenes/StreetScene.js';
import { HudScene } from './scenes/HudScene.js';

// On window so the running game can be inspected from outside the module graph.
window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  backgroundColor: '#191510',

  // Every texture in this game is drawn in code at a chunky pixel size, so
  // nearest-neighbour filtering keeps the sprite edges crisp.
  render: {
    pixelArt: true
  },

  scale: {
    // The runtime is a phone-shaped panel that can change size, so the game
    // fills whatever it is given rather than assuming a fixed resolution.
    // Scenes read this.scale.gameSize instead of hardcoding width and height.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  // Arcade physics is used for the player against the walls and the bins only,
  // so gravity stays at zero: this is a top-down street.
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },

  input: {
    // Phaser tracks one pointer by default, which silently breaks on-screen
    // controls: holding the stick and tapping interact is two fingers down at
    // once, and the second tap would never register.
    activePointers: 3
  },

  // The street runs first and launches the HUD over itself.
  scene: [StreetScene, HudScene]
});
