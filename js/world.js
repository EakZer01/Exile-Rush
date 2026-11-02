'use strict';
// ============================================================
//  Decorative world props (rocks, graves, dead trees, ruins, braziers).
//  The world is split into chunks; each chunk's props come from a seeded
//  RNG so the same place always looks the same. Props don't collide.
// ============================================================
const CHUNK = 640;
const _chunks = new Map();
const _propCache = new Map();

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROP_KINDS = [
  ['rock', 30], ['grass', 22], ['bones', 16], ['tomb', 12], ['tree', 10], ['pillar', 7], ['ruin', 6], ['brazier', 4],
];
const PROP_TOTAL = PROP_KINDS.reduce((a, k) => a + k[1], 0);

function chunkProps(cx, cy) {
  const key = cx * 100003 + cy;
  let list = _chunks.get(key);
  if (list) return list;
  const rng = mulberry32((cx * 73856093) ^ (cy * 19349663) ^ G.worldSeed);
  list = [];
  const n = 3 + Math.floor(rng() * 5);
  let braziers = 0;
  for (let i = 0; i < n; i++) {
    let r = rng() * PROP_TOTAL, kind = 'rock';
    for (const [k, w] of PROP_KINDS) { r -= w; if (r <= 0) { kind = k; break; } }
    if (kind === 'brazier' && braziers++) kind = 'rock';
    // keep the spawn point clear
    const x = cx * CHUNK + rng() * CHUNK, y = cy * CHUNK + rng() * CHUNK;
    if (Math.abs(x) < 120 && Math.abs(y) < 120) continue;
    list.push({ kind, x, y, v: Math.floor(rng() * 3), s: 0.8 + rng() * 0.5, flip: rng() < 0.5, seed: rng() * 100 });
  }
  list.sort((a, b) => a.y - b.y);
  _chunks.set(key, list);
  if (_chunks.size > 260) {
    // forget far-away chunks
    const pcx = Math.floor(G.cam.x / CHUNK), pcy = Math.floor(G.cam.y / CHUNK);
    for (const k of _chunks.keys()) {
      const kx = Math.round(k / 100003), ky = k - kx * 100003;
      if (Math.abs(kx - pcx) > 6 || Math.abs(ky - pcy) > 6) _chunks.delete(k);
    }
  }
  return list;
}

// ---------- prop sprites (drawn once, cached) ----------
function propSprite(kind, v) {
  const tint = G.map && BIOMES[G.map.biome].tint;
  const key = kind + v + (tint || '');
  let c = _propCache.get(key);
  if (c) return c;
  const S = 128;
  c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  _propCache.set(key, c);
  if (!g || !g.beginPath) return c;
  g.translate(S / 2, S * 0.72); // anchor = base of the prop
  const shadow = (rx, ry) => { g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(4, 2, rx, ry, 0, 0, TAU); g.fill(); };
  const stone = (base) => { const k = randi(-8, 8); return `rgb(${base[0] + k},${base[1] + k},${base[2] + k})`; };

  if (kind === 'rock') {
    const R = 10 + v * 5;
    shadow(R * 1.1, R * 0.45);
    g.fillStyle = stone([74, 68, 60]);
    g.beginPath();
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI, rr = R * rand(0.75, 1.1);
      const x = Math.cos(a) * rr * 1.2, y = Math.sin(a) * rr * 0.9;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,210,0.12)';
    g.beginPath(); g.ellipse(-R * 0.3, -R * 0.55, R * 0.5, R * 0.22, -0.3, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.stroke();
  } else if (kind === 'grass') {
    for (let k = 0; k < 3 + v; k++) {
      const ox = rand(-14, 14), oy = rand(-4, 4);
      for (let i = 0; i < 7; i++) {
        g.strokeStyle = `rgb(${randi(70, 105)},${randi(68, 90)},${randi(38, 52)})`; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox + rand(-4, 4), oy - 6, ox + rand(-7, 7), oy - rand(8, 16)); g.stroke();
      }
    }
  } else if (kind === 'bones') {
    shadow(16, 5);
    const bone = (x, y, a, L) => {
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = '#cfc6ad'; g.fillRect(-L / 2, -1.5, L, 3);
      for (const sx of [-L / 2, L / 2]) { g.beginPath(); g.arc(sx, -1.5, 2.2, 0, TAU); g.arc(sx, 1.5, 2.2, 0, TAU); g.fill(); }
      g.restore();
    };
    for (let i = 0; i < 3 + v; i++) bone(rand(-14, 14), rand(-6, 2), rand(0, TAU), rand(10, 18));
    // skull
    g.fillStyle = '#ddd4ba'; g.beginPath(); g.arc(rand(-6, 6), -5, 6, 0, TAU); g.fill();
    g.fillStyle = '#1a1612'; g.fillRect(-3, -6, 2, 2); g.fillRect(1, -6, 2, 2);
  } else if (kind === 'tomb') {
    shadow(14, 5);
    g.fillStyle = stone([92, 88, 80]); g.strokeStyle = '#1e1b17'; g.lineWidth = 2;
    if (v === 2) { // cross
      g.fillRect(-3, -34, 6, 34); g.fillRect(-11, -26, 22, 6);
      g.strokeRect(-3, -34, 6, 34);
    } else {
      g.beginPath(); g.moveTo(-11, 0); g.lineTo(-11, -22); g.arc(0, -22, 11, Math.PI, 0); g.lineTo(11, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,240,210,0.1)'; g.fillRect(-8, -26, 6, 22);
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-4, -20); g.lineTo(4, -20); g.moveTo(0, -25); g.lineTo(0, -12); g.stroke();
      if (v === 1) { g.beginPath(); g.moveTo(6, -28); g.lineTo(2, -18); g.lineTo(5, -10); g.stroke(); }
    }
    g.fillStyle = 'rgba(40,36,30,0.9)'; g.fillRect(-14, -2, 28, 4);
  } else if (kind === 'tree') {
    shadow(22, 7);
    const branch = (x, y, a, L, w, depth) => {
      const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L;
      g.strokeStyle = '#2a2018'; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      if (depth > 0) {
        branch(x2, y2, a - rand(0.3, 0.7), L * rand(0.55, 0.75), w * 0.65, depth - 1);
        branch(x2, y2, a + rand(0.3, 0.7), L * rand(0.55, 0.75), w * 0.65, depth - 1);
      }
    };
    branch(0, 0, -Math.PI / 2 + rand(-0.15, 0.15), 26 + v * 4, 6, 3);
  } else if (kind === 'pillar') {
    shadow(16, 6);
    const h = 26 + v * 10;
    g.fillStyle = stone([108, 102, 92]); g.fillRect(-10, -h, 20, h);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(4, -h, 6, h);
    g.fillStyle = 'rgba(255,240,210,0.1)'; g.fillRect(-8, -h, 4, h);
    // broken top
    g.fillStyle = stone([124, 118, 106]);
    g.beginPath(); g.moveTo(-10, -h); g.lineTo(-4, -h - 6); g.lineTo(2, -h - 2); g.lineTo(10, -h - 8); g.lineTo(10, -h); g.closePath(); g.fill();
    g.fillStyle = stone([90, 84, 76]); g.fillRect(-13, -4, 26, 5);
    g.fillStyle = stone([100, 94, 84]); g.fillRect(14, -3, 7, 4); g.fillRect(-22, -2, 5, 3);
  } else if (kind === 'ruin') {
    shadow(30, 6);
    for (let row = 0; row < 3; row++) {
      const n = 4 - row - (v === 2 && row > 0 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        g.fillStyle = stone([86, 80, 72]); g.strokeStyle = '#1a1814'; g.lineWidth = 1;
        const x = -28 + i * 14 + row * 5, y = -8 - row * 8;
        g.fillRect(x, y, 13, 7); g.strokeRect(x, y, 13, 7);
      }
    }
  } else if (kind === 'brazier') {
    shadow(12, 5);
    g.strokeStyle = '#2a2622'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(-8, 0); g.lineTo(-3, -16); g.moveTo(8, 0); g.lineTo(3, -16); g.moveTo(0, 0); g.lineTo(0, -16); g.stroke();
    g.fillStyle = '#3a342c'; g.beginPath(); g.ellipse(0, -18, 12, 5, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#1a0e08'; g.beginPath(); g.ellipse(0, -18, 12, 4, 0, 0, TAU); g.fill();
  }
  // biome colour grade
  if (tint) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.4; g.fillStyle = tint; g.fillRect(0, 0, S, S); }
  return c;
}

const _braziers = [];
function drawProps(ctx, vx0, vy0, vx1, vy1) {
  _braziers.length = 0;
  const c0 = Math.floor(vx0 / CHUNK), c1 = Math.floor(vx1 / CHUNK);
  const r0 = Math.floor(vy0 / CHUNK), r1 = Math.floor(vy1 / CHUNK);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    for (const p of chunkProps(cx, cy)) {
      if (p.x < vx0 - 80 || p.x > vx1 + 80 || p.y < vy0 - 80 || p.y > vy1 + 120) continue;
      const spr = propSprite(p.kind, p.v), s = 128 * p.s;
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.flip) ctx.scale(-1, 1);
      ctx.drawImage(spr, -s / 2, -s * 0.72, s, s);
      ctx.restore();
      if (p.kind === 'brazier') {
        _braziers.push(p);
        addLight(p.x, p.y - 18 * p.s, 190 + Math.sin(G.time * 11 + p.seed) * 12, 0.85);
      }
    }
  }
}

// flames drawn after the darkness pass so they glow
function drawBrazierFlames(ctx) {
  if (!_braziers.length) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const p of _braziers) {
    const fx = p.x, fy = p.y - 20 * p.s;
    ctx.drawImage(glowSprite('#ff7a22', 34), fx - 34, fy - 40);
    for (let i = 0; i < 3; i++) {
      const fl = Math.sin(G.time * 13 + p.seed + i * 2) * 3;
      ctx.drawImage(glowSprite(i ? '#ffb040' : '#fff0b0', 9 - i), fx - 9 + i + (i - 1) * 4 + fl * 0.3, fy - 14 - i * 3 + fl);
    }
    if (Math.random() < 0.25) emit('ember', fx + rand(-5, 5), fy - 6, 1, { dir: -Math.PI / 2, spread: 0.5 });
  }
  ctx.globalCompositeOperation = 'source-over';
}
