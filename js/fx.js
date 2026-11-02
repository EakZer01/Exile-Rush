'use strict';
// ============================================================
//  Visual FX: particles, ground decals, hit-stop.
//  Purely cosmetic — gameplay never reads anything from here.
// ============================================================
const MAX_PARTICLES = 900;
const MAX_DECALS = 220;

// particle presets: colour palette, speed, life, size, drag, additive, etc.
const PART = {
  ember:  { cols: ['#ff9a3a', '#ffcf5a', '#ff6a1a'], sp: [20, 90], life: [0.4, 0.9], size: [1.5, 3], drag: 2.5, rise: 40, add: true },
  spark:  { cols: ['#fff6a0', '#cfe0ff', '#ffffff'], sp: [150, 380], life: [0.12, 0.3], size: [1, 2], drag: 6, streak: true, add: true },
  phys:   { cols: ['#f0e8d8', '#ffffff', '#d8c8a8'], sp: [120, 300], life: [0.1, 0.22], size: [1, 1.8], drag: 8, streak: true, add: true },
  shard:  { cols: ['#bfefff', '#e8fbff', '#7fd8ff'], sp: [60, 200], life: [0.35, 0.7], size: [2, 4], drag: 4, spin: true, add: false },
  wisp:   { cols: ['#c58aff', '#9a5aff', '#e0c0ff'], sp: [15, 60], life: [0.5, 1.0], size: [2, 4], drag: 2, rise: 25, add: true },
  bubble: { cols: ['#9be05a', '#c8ff8a', '#6ab030'], sp: [5, 25], life: [0.6, 1.2], size: [1.5, 3.5], drag: 1, rise: 30, add: false, ring: true },
  chunk:  { cols: null, sp: [60, 220], life: [0.4, 0.8], size: [2, 4.5], drag: 5, spin: true, add: false },
  blood:  { cols: null, sp: [40, 170], life: [0.3, 0.6], size: [1.5, 3], drag: 6, add: false },
  smoke:  { cols: ['#2a2622', '#3a342e'], sp: [10, 40], life: [0.6, 1.2], size: [6, 12], drag: 1.5, rise: 15, add: false, grow: 14, soft: true },
  gold:   { cols: ['#ffe9a0', '#ffd24a', '#ffffff'], sp: [30, 140], life: [0.6, 1.2], size: [1.5, 3], drag: 2, rise: 50, add: true },
  heal:   { cols: ['#ff6a6a', '#ff9a8a'], sp: [10, 40], life: [0.5, 0.9], size: [1.5, 2.5], drag: 2, rise: 45, add: true },
};

// what an enemy leaves behind when it dies
const GORE = {
  zombie:   { chunk: '#5a6a40', blood: '#3a4a1e', decal: '#2e3a18' },
  skeleton: { chunk: '#d6cfb6', blood: '#8a8270', decal: null },
  bat:      { chunk: '#6a3a80', blood: '#6a0a14', decal: '#4a0810' },
  archer:   { chunk: '#c6b88a', blood: '#8a8270', decal: null },
  brute:    { chunk: '#6a4630', blood: '#7a0a0a', decal: '#4a0606' },
  volatile: { chunk: '#ff8a3a', blood: '#ffb04a', decal: 'scorch' },
  wraith:   { chunk: '#57b7d0', blood: '#2a6a80', decal: '#1a4a5a' },
  cultist:  { chunk: '#6b3fa0', blood: '#5a0a3a', decal: '#3a0828' },
  golem:    { chunk: '#8a8478', blood: '#5a564e', decal: 'rubble' },
  ghoul:    { chunk: '#8a8478', blood: '#4a4440', decal: '#2e2a26' },
  spitter:  { chunk: '#7ac040', blood: '#6ab030', decal: '#3a5a18' },
  shaman:   { chunk: '#a070e0', blood: '#6a3aa0', decal: null },
};

const _parts = [];
function emit(kind, x, y, n, opt) {
  const d = PART[kind];
  if (!d || !G.settings.fx) return;
  const room = particleCap() - _parts.length;
  if (room <= 0) return;
  if (n > room) n = room;
  const o = opt || {};
  for (let i = 0; i < n; i++) {
    const a = o.dir !== undefined ? o.dir + rand(-(o.spread || 0.6), o.spread || 0.6) : rand(0, TAU);
    const sp = rand(d.sp[0], d.sp[1]) * (o.speed || 1);
    _parts.push({
      d, x: x + (o.jitter ? rand(-o.jitter, o.jitter) : 0), y: y + (o.jitter ? rand(-o.jitter, o.jitter) : 0),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rand(d.life[0], d.life[1]) * (o.life || 1),
      size: rand(d.size[0], d.size[1]) * (o.size || 1), color: o.color || pick(d.cols),
      rot: rand(0, TAU), vr: d.spin ? rand(-12, 12) : 0,
    });
  }
}

function updateParticles(dt) {
  for (let i = _parts.length - 1; i >= 0; i--) {
    const p = _parts[i];
    p.t += dt;
    if (p.t >= p.life) { _parts[i] = _parts[_parts.length - 1]; _parts.pop(); continue; }
    const k = Math.exp(-p.d.drag * dt);
    p.vx *= k; p.vy *= k;
    if (p.d.rise) p.vy -= p.d.rise * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  for (let i = G.decals.length - 1; i >= 0; i--) {
    const dc = G.decals[i];
    dc.t += dt;
    if (dc.t >= dc.life) G.decals.splice(i, 1);
  }
}

// additive = false → drawn before lighting (lit like the world); true → glowing, after lighting
function drawParticles(ctx, additive, inView) {
  if (additive) ctx.globalCompositeOperation = 'lighter';
  for (const p of _parts) {
    const d = p.d;
    if (!!d.add !== additive || !inView(p.x, p.y, 20)) continue;
    const f = p.t / p.life, a = 1 - f;
    ctx.globalAlpha = d.soft ? a * 0.45 : a;
    const s = p.size + (d.grow ? d.grow * f : 0);
    if (d.streak) {
      ctx.strokeStyle = p.color; ctx.lineWidth = s;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
    } else if (additive) {
      const r = s * 2.5;
      ctx.drawImage(glowSprite(p.color, r), p.x - r, p.y - r);
    } else if (d.ring) {
      ctx.strokeStyle = p.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.stroke();
    } else if (d.soft) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill();
    } else if (d === PART.shard) {
      // a thin diamond pointing along its motion, no save/restore needed
      const c = Math.cos(p.rot) * s, sn = Math.sin(p.rot) * s;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.moveTo(p.x + c, p.y + sn); ctx.lineTo(p.x - sn * 0.4, p.y + c * 0.4); ctx.lineTo(p.x - c, p.y - sn); ctx.lineTo(p.x + sn * 0.4, p.y - c * 0.4); ctx.fill();
    } else {
      ctx.fillStyle = p.color; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------- Event hooks (called from combat/skills) ----------------
const TYPE_PART = { fire: 'ember', cold: 'shard', lightning: 'spark', chaos: 'wisp', physical: 'phys' };

function fxHit(e, type, crit, fromX, fromY) {
  if (!G.settings.fx) return;
  const kind = TYPE_PART[type] || 'phys';
  const dir = fromX !== undefined ? Math.atan2(e.y - fromY, e.x - fromX) : undefined;
  const busy = _parts.length > 600 || G.enemies.length > 300;
  emit(kind, e.x, e.y, busy ? 1 : crit ? 7 : 3, { dir, spread: 1.0, size: crit ? 1.4 : 1 });
  if (type === 'physical' && !busy) {
    const g = GORE[e.type];
    if (g) emit('blood', e.x, e.y, 2, { dir, spread: 0.7, color: g.blood });
  }
  e.punch = 0.1;
}

function fxDeath(e) {
  const g = GORE[e.type] || GORE.zombie;
  const big = e.rarity >= 2;
  const n = Math.min(14, Math.round(e.r * 0.45)) * (big ? 2 : 1);
  emit('chunk', e.x, e.y, _parts.length > 600 ? 2 : n, { color: g.chunk, jitter: e.r * 0.4, size: e.r / 12 });
  emit('blood', e.x, e.y, _parts.length > 600 ? 1 : 4, { color: g.blood, jitter: 4 });
  if (e.ign.t > 0) emit('ember', e.x, e.y, 5, { jitter: e.r * 0.5 });
  if (e.freeze > 0) emit('shard', e.x, e.y, 8, { speed: 1.4 });
  if (g.decal && Math.random() < (big ? 1 : 0.55)) addDecal(g.decal === 'scorch' ? 'scorch' : g.decal === 'rubble' ? 'rubble' : 'splat', e.x, e.y, e.r / 12 * (big ? 1.5 : 1), g.decal);
  if (e.rarity === 3) {
    emit('gold', e.x, e.y, 60, { speed: 2.2, jitter: 20 });
    emit('ember', e.x, e.y, 50, { speed: 2.5, jitter: 20, color: e.bossDef.glow });
    addDecal('scorch', e.x, e.y, 4);
    G.shake = Math.max(G.shake, 14);
    hitStop(0.35);
  } else if (e.rarity === 2) {
    emit('gold', e.x, e.y, 18, { speed: 1.4 });
    hitStop(0.06);
  }
}

function fxExplosion(x, y, r, type) {
  if (!G.settings.fx) return;
  const n = Math.min(26, 6 + Math.round(r / 5));
  emit(TYPE_PART[type] || 'ember', x, y, n, { speed: r / 45, jitter: r * 0.2 });
  if (type === 'fire') { emit('smoke', x, y, 3, { jitter: r * 0.3 }); }
}

// ---------------- Decals ----------------
const _decalCache = new Map();
function decalSprite(kind, color, variant) {
  const key = kind + color + variant;
  let c = _decalCache.get(key);
  if (c) return c;
  const S = 64;
  c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  if (!g || !g.beginPath) { _decalCache.set(key, c); return c; }
  g.translate(S / 2, S / 2);
  if (kind === 'splat') {
    g.fillStyle = color;
    g.globalAlpha = 0.85;
    g.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU, rr = rand(8, 14);
      if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.fill();
    for (let i = 0; i < 9; i++) {
      const a = rand(0, TAU), d = rand(12, 26), rr = rand(1, 3.5);
      g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, TAU); g.fill();
    }
  } else if (kind === 'scorch') {
    const grd = g.createRadialGradient(0, 0, 2, 0, 0, 30);
    grd.addColorStop(0, 'rgba(10,6,4,0.85)'); grd.addColorStop(0.6, 'rgba(25,14,8,0.5)'); grd.addColorStop(1, 'rgba(25,14,8,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const a = rand(0, TAU); g.beginPath(); g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      g.lineTo(Math.cos(a + rand(-0.3, 0.3)) * rand(18, 30), Math.sin(a + rand(-0.3, 0.3)) * rand(18, 30)); g.stroke();
    }
  } else if (kind === 'rubble') {
    for (let i = 0; i < 10; i++) {
      g.fillStyle = `rgba(${randi(90, 130)},${randi(85, 120)},${randi(75, 105)},0.9)`;
      const x = rand(-16, 16), y = rand(-16, 16), s = rand(2, 6);
      g.fillRect(x, y, s, s * rand(0.6, 1));
    }
  } else if (kind === 'frost') {
    const grd = g.createRadialGradient(0, 0, 2, 0, 0, 30);
    grd.addColorStop(0, 'rgba(190,235,255,0.35)'); grd.addColorStop(1, 'rgba(190,235,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
  }
  _decalCache.set(key, c);
  return c;
}

function addDecal(kind, x, y, scale, color) {
  if (!G.settings.fx) return;
  if (G.decals.length >= MAX_DECALS) G.decals.shift();
  G.decals.push({ kind, x, y, scale: scale || 1, color: color || '#000', rot: rand(0, TAU), variant: randi(0, 2), t: 0, life: kind === 'scorch' ? 14 : 22 });
}

function drawDecals(ctx, inView) {
  for (const dc of G.decals) {
    const s = 64 * dc.scale;
    if (!inView(dc.x, dc.y, s)) continue;
    ctx.globalAlpha = Math.min(1, (dc.life - dc.t) / 3);
    ctx.save(); ctx.translate(dc.x, dc.y); ctx.rotate(dc.rot);
    ctx.drawImage(decalSprite(dc.kind, dc.color, dc.variant), -s / 2, -s / 2, s, s);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// brief slow-motion on big moments (boss kill, rare kill)
function hitStop(sec) { G.hitStop = Math.max(G.hitStop || 0, sec); }

// projectile trails, by damage type
function fxTrail(p) {
  if (!G.settings.fx || _parts.length > 700) return;
  const s = p.s;
  if (s.cloud) { if (Math.random() < 0.35) emit('bubble', p.x, p.y, 1); return; }
  if (s.arrow) return;
  const kind = TYPE_PART[s.mainType] || 'phys';
  const chance = kind === 'ember' ? 0.7 : kind === 'spark' ? 0.35 : 0.45;
  if (Math.random() < chance) emit(kind, p.x, p.y, 1, { speed: 0.25, jitter: p.r * 0.5, size: p.r / 8 });
}
