'use strict';
// ---------- Math helpers ----------
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// pick n distinct items by weight
function weightedSample(items, n, wfn) {
  const pool = items.slice(), out = [];
  while (out.length < n && pool.length) {
    let total = 0;
    for (const it of pool) total += wfn(it);
    if (total <= 0) break;
    let r = Math.random() * total, idx = 0;
    for (; idx < pool.length; idx++) { r -= wfn(pool[idx]); if (r <= 0) break; }
    idx = Math.min(idx, pool.length - 1);
    out.push(pool[idx]); pool.splice(idx, 1);
  }
  return out;
}

function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return Math.round(n).toString();
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
const pct = (v) => Math.round(v * 100) + '%';

let _uid = 1;
const uid = () => _uid++;

// ---------- Spatial hash for enemies ----------
class SpatialHash {
  constructor(cell) { this.cell = cell; this.map = new Map(); this.pool = []; }
  key(cx, cy) { return ((cx + 32768) << 16) | ((cy + 32768) & 0xffff); }
  clear() {
    for (const arr of this.map.values()) { arr.length = 0; this.pool.push(arr); }
    this.map.clear();
  }
  insert(e) {
    const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
    let arr = this.map.get(k);
    if (!arr) { arr = this.pool.pop() || []; this.map.set(k, arr); }
    arr.push(e);
  }
  // returns enemies whose cell overlaps the circle (caller does precise check)
  query(x, y, r, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const arr = this.map.get(this.key(cx, cy));
      if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
    }
    return out;
  }
}

// ---------- Glow sprite cache (cheap additive glow) ----------
const _glowCache = new Map();
function glowSprite(color, radius) {
  const r = Math.max(2, Math.round(radius));
  const key = color + '|' + r;
  let c = _glowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, color);
  grd.addColorStop(0.35, hexA(color, 0.55));
  grd.addColorStop(1, hexA(color, 0));
  g.fillStyle = grd;
  g.fillRect(0, 0, r * 2, r * 2);
  _glowCache.set(key, c);
  return c;
}
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------- Tiny synth audio ----------
const Sfx = {
  ctx: null, muted: false, last: {},
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  play(name) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const def = SFX_DEFS[name];
    if (!def) return;
    if (this.last[name] && now - this.last[name] < (def.gap || 0.05)) return;
    this.last[name] = now;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = def.type || 'sine';
    o.frequency.setValueAtTime(def.f0, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, def.f1), now + def.dur);
    g.gain.setValueAtTime(def.vol || 0.08, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + def.dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(now); o.stop(now + def.dur + 0.02);
  },
};
const SFX_DEFS = {
  levelup: { f0: 440, f1: 1320, dur: 0.35, type: 'triangle', vol: 0.12, gap: 0.2 },
  hurt: { f0: 180, f1: 60, dur: 0.18, type: 'sawtooth', vol: 0.07, gap: 0.15 },
  pickup: { f0: 900, f1: 1400, dur: 0.06, type: 'sine', vol: 0.03, gap: 0.04 },
  currency: { f0: 1200, f1: 2400, dur: 0.25, type: 'triangle', vol: 0.1, gap: 0.1 },
  boss: { f0: 90, f1: 40, dur: 1.2, type: 'sawtooth', vol: 0.15, gap: 1 },
  dash: { f0: 300, f1: 900, dur: 0.15, type: 'square', vol: 0.04, gap: 0.1 },
  flask: { f0: 500, f1: 250, dur: 0.2, type: 'sine', vol: 0.08, gap: 0.1 },
  shrine: { f0: 300, f1: 1200, dur: 0.6, type: 'triangle', vol: 0.12, gap: 0.5 },
  kill: { f0: 220, f1: 110, dur: 0.05, type: 'square', vol: 0.015, gap: 0.03 },
  boom: { f0: 120, f1: 40, dur: 0.25, type: 'sawtooth', vol: 0.05, gap: 0.08 },
};
