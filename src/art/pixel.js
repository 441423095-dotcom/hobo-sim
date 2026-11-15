// Textures drawn in code. The game ships no image files, so every sprite and
// every piece of scenery is painted onto a canvas once, at startup, and handed
// to Phaser as a normal texture.

/// A canvas texture built by a draw callback. Does nothing when the key is
/// already registered, so scenes can call it from create() freely.
export function canvasTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx, canvas.width, canvas.height);

  scene.textures.addCanvas(key, canvas);
  return key;
}

/// A pixel matrix rendered at an integer scale: one character per pixel, looked
/// up in the palette. A character the palette does not define stays clear.
export function pixelTexture(scene, key, matrix, palette, scale = 2) {
  const width = matrix[0].length;
  const height = matrix.length;

  return canvasTexture(scene, key, width * scale, height * scale, (ctx) => {
    for (let y = 0; y < height; y++) {
      const row = matrix[y];
      for (let x = 0; x < row.length; x++) {
        const colour = palette[row[x]];
        if (!colour) continue;
        ctx.fillStyle = colour;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  });
}

/// A small seeded generator, so the noise on the pavement is the same every
/// time the texture is rebuilt instead of crawling on every launch.
export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
