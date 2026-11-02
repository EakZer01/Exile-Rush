'use strict';
// ============================================================
//  Darkness + dynamic lights.
//  A half-resolution "darkness" layer is filled each frame, every
//  light punches a soft hole in it (destination-out), then the layer
//  is stretched over the world. Glowing things are drawn afterwards.
// ============================================================
const Lighting = { c: null, g: null, sprite: null, lights: [], scale: 0.5 };

function lightSprite() {
  if (Lighting.sprite) return Lighting.sprite;
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.75, 'rgba(255,255,255,0.25)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return (Lighting.sprite = c);
}

// world-space light: radius r, strength a (0..1)
function addLight(x, y, r, a) {
  const L = Lighting.lights;
  if (L.length < 1600) L.push(x, y, r, a === undefined ? 1 : a);
}

function darknessLevel() {
  // dusk at the start, deeper night as the run goes on
  return 0.8 + Math.min(1, G.time / RUN_LENGTH) * 0.1 + (G.mapFx ? G.mapFx.darkAdd : 0);
}

function renderDarkness(ctx, W, H, camX, camY, z, ox, oy) {
  const L = Lighting.lights;
  if (!G.settings.lighting) { L.length = 0; return; }
  const sc = Lighting.scale, w = Math.ceil(W * sc), h = Math.ceil(H * sc);
  if (!Lighting.c) { Lighting.c = document.createElement('canvas'); Lighting.g = Lighting.c.getContext('2d'); }
  const c = Lighting.c, g = Lighting.g;
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, w, h);
  g.fillStyle = `rgba(${G.map ? BIOMES[G.map.biome].dark : '6,4,12'},${Math.min(0.97, darknessLevel())})`;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-out';
  const spr = lightSprite();
  for (let i = 0; i < L.length; i += 4) {
    const r = L[i + 2] * z * sc;
    const x = ((L[i] - camX) * z + W / 2 + ox) * sc, y = ((L[i + 1] - camY) * z + H / 2 + oy) * sc;
    if (x + r < 0 || y + r < 0 || x - r > w || y - r > h) continue;
    g.globalAlpha = clamp(L[i + 3], 0, 1);
    g.drawImage(spr, x - r, y - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, 0, 0, W, H);
  L.length = 0;
}
