'use strict';
// ============================================================
//  Pixel-art sprite engine.
//  Art lives in js/data/sprite_art.js as text grids: one character per
//  pixel, '.' = transparent, other characters looked up in the palette.
//  At first use each (sprite, frame, facing, outline, tint) combination is
//  rasterised once into a small canvas and cached; drawing is then a
//  single drawImage. Characters listed in `emit` also go into a separate
//  "emissive" canvas that is drawn after the darkness pass, so eyes,
//  lava cracks and magic glows shine in the dark.
// ============================================================
const OUTLINE = { dark: '#120e0b', magic: '#7a8cff', rare: '#ffd84a', unique: '#e8883a' };
const _sprCache = new Map();

// rows for each animation frame (mirrors left halves of symmetric art)
function spriteFrames(def) {
  if (def._frames) return def._frames;
  let frames = def.frames ? def.frames.map((f) => f.slice()) : def.anim ? def.anim.map((legs) => def.body.concat(legs)) : [def.body.slice()];
  if (def.sym) frames = frames.map((rows) => rows.map((r) => r + r.split('').reverse().join('')));
  def._frames = frames;
  def.w = frames[0][0].length;
  def.h = frames[0].length;
  return frames;
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// tint: '' | 'white' | 'frost'; emitOnly: only emissive pixels, no outline
function spriteCanvas(id, frame, flip, outline, tint, emitOnly) {
  const key = id + '|' + frame + '|' + (flip ? 1 : 0) + '|' + outline + '|' + tint + '|' + (emitOnly ? 1 : 0);
  let c = _sprCache.get(key);
  if (c) return c;
  const def = SPRITE_ART[id];
  const rows = spriteFrames(def)[frame % def._frames.length];
  const w = def.w, h = def.h, W = w + 2, H = h + 2;
  c = document.createElement('canvas'); c.width = W; c.height = H;
  _sprCache.set(key, c);
  const g = c.getContext('2d');
  const img = g && g.createImageData ? g.createImageData(W, H) : null;
  if (!img || !img.data) return c;
  const d = img.data;
  const emit = def.emit || '';
  const solid = new Uint8Array(W * H);
  const put = (x, y, rgb, a) => { const i = (y * W + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a; };
  const frost = [191, 232, 255];
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || ch === undefined) continue;
      if (emitOnly && emit.indexOf(ch) < 0) continue;
      const col = def.pal[ch];
      if (!col) continue;
      let rgb = hexRgb(col);
      if (tint === 'white') rgb = [255, 255, 255];
      else if (tint === 'frost') rgb = rgb.map((v, i) => Math.round(v * 0.35 + frost[i] * 0.65));
      const px = (flip ? w - 1 - x : x) + 1, py = y + 1;
      put(px, py, rgb, 255);
      solid[py * W + px] = 1;
    }
  }
  if (!emitOnly) {
    const oc = hexRgb(OUTLINE[outline] || OUTLINE.dark);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (solid[y * W + x]) continue;
      if ((x > 0 && solid[y * W + x - 1]) || (x < W - 1 && solid[y * W + x + 1]) || (y > 0 && solid[(y - 1) * W + x]) || (y < H - 1 && solid[(y + 1) * W + x])) put(x, y, oc, 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function spriteFrameCount(id) { return spriteFrames(SPRITE_ART[id]).length; }

// world-space draw: bottom-centre anchored at (x, footY), `px` world units per art pixel
function drawSprite(ctx, id, frame, flip, outline, tint, x, footY, px) {
  const c = spriteCanvas(id, frame, flip, outline, tint, false);
  const w = c.width * px, h = c.height * px;
  ctx.drawImage(c, x - w / 2, footY - h, w, h);
  return h;
}
function drawSpriteEmissive(ctx, id, frame, flip, x, footY, px) {
  if (!SPRITE_ART[id].emit) return;
  const c = spriteCanvas(id, frame, flip, 'dark', '', true);
  const w = c.width * px, h = c.height * px;
  ctx.drawImage(c, x - w / 2, footY - h, w, h);
}

// data URL of a sprite for the DOM menus
const _sprUrl = new Map();
function spriteURL(id, scale) {
  const key = id + '@' + scale;
  let u = _sprUrl.get(key);
  if (u !== undefined) return u;
  const src = spriteCanvas(id, 0, false, 'dark', '', false);
  const c = document.createElement('canvas');
  c.width = src.width * scale; c.height = src.height * scale;
  const g = c.getContext('2d');
  try {
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    u = c.toDataURL();
  } catch (e) { u = ''; }
  _sprUrl.set(key, u);
  return u;
}
