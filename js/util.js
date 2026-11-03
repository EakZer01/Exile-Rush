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
// called many times per frame: parsed colours and finished strings are cached
// (alpha rounded to 1/100, which is finer than the eye can tell)
const _hexRgb = new Map(), _hexA = new Map();
function hexA(hex, a) {
  a = Math.round(clamp(a, 0, 1) * 100) / 100;
  const key = hex + a;
  let out = _hexA.get(key);
  if (out) return out;
  let rgb = _hexRgb.get(hex);
  if (!rgb) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    _hexRgb.set(hex, rgb);
  }
  out = `rgba(${rgb},${a})`;
  if (_hexA.size > 4000) _hexA.clear();
  _hexA.set(key, out);
  return out;
}
// escape a player-provided string for safe use inside HTML attributes/text
function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Synth audio ----------
// Every sound is a few layers of oscillators or filtered noise, mixed into
// one bus with a compressor so dozens of overlapping sounds never clip.
// A layer: { osc | noise, f0 → f1 (Hz, or filter sweep for noise), dur,
// vol, at (delay), filter: 'lowpass' | 'highpass' | 'bandpass', q }.
const Sfx = {
  ctx: null, bus: null, noise: null, muted: false, last: {}, vol: 0.7, voices: [],
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    if (!this.ctx) return;
    const c = this.ctx, comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(c.destination);
    this.bus = c.createGain(); this.bus.gain.value = 1; this.bus.connect(comp);
    // one second of white noise, reused by every noisy layer
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (typeof Music !== 'undefined') Music.start();
  },
  play(name, k) {
    if (this.muted || !this.ctx || this.vol <= 0) return;
    const def = SFX_DEFS[name], now = this.ctx.currentTime;
    if (!def) return;
    if (this.last[name] && now - this.last[name] < (def.gap || 0.05)) return;
    // keep the mix readable: at most 20 sounds at once, small ones give way first
    this.voices = this.voices.filter((t) => t > now);
    if (this.voices.length >= 20 && !def.important) return;
    this.last[name] = now;
    const pitch = (k || 1) * (def.jitter ? 1 + (Math.random() * 2 - 1) * def.jitter : 1);
    let end = now;
    for (const L of def.layers) end = Math.max(end, this.layer(L, now + (L.at || 0), pitch));
    this.voices.push(end);
  },
  layer(L, t, pitch) {
    const c = this.ctx, g = c.createGain(), vol = (L.vol || 0.08) * this.vol * 1.4;
    let src, out = g;
    if (L.noise) {
      src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const f = c.createBiquadFilter(); f.type = L.filter || 'bandpass'; f.Q.value = L.q || 1;
      f.frequency.setValueAtTime(L.f0 * pitch, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, L.f1 * pitch), t + L.dur);
      src.connect(f); f.connect(g);
    } else {
      src = c.createOscillator(); src.type = L.type || 'sine';
      src.frequency.setValueAtTime(L.f0 * pitch, t); src.frequency.exponentialRampToValueAtTime(Math.max(20, L.f1 * pitch), t + L.dur);
      if (L.filter) { const f = c.createBiquadFilter(); f.type = L.filter; f.frequency.value = L.cut || 1200; src.connect(f); f.connect(g); } else src.connect(g);
    }
    // short attack avoids clicks, exponential tail sounds natural
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (L.atk || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + L.dur);
    out.connect(this.bus);
    src.start(t); src.stop(t + L.dur + 0.03);
    return t + L.dur;
  },
};
const tone = (f0, f1, dur, vol, type, at) => ({ f0, f1, dur, vol, type, at });
const hiss = (f0, f1, dur, vol, filter, at, q) => ({ noise: true, f0, f1, dur, vol, filter, at, q });
// a rising chord: notes as semitones above f
const arp = (f, semis, step, dur, vol, type) => semis.map((s, i) => tone(f * 2 ** (s / 12), f * 2 ** (s / 12), dur, vol, type, i * step));
const SFX_DEFS = {
  // ---- player ----
  levelup: { gap: 0.2, important: true, layers: [...arp(523, [0, 4, 7, 12], 0.07, 0.35, 0.07, 'triangle'), hiss(4000, 9000, 0.4, 0.015, 'highpass', 0.1)] },
  hurt: { gap: 0.15, important: true, layers: [tone(200, 70, 0.16, 0.08, 'sawtooth'), hiss(900, 200, 0.12, 0.06, 'lowpass')] },
  dash: { gap: 0.1, layers: [hiss(500, 2600, 0.18, 0.07, 'bandpass', 0, 2), tone(260, 520, 0.12, 0.02, 'triangle')] },
  flask: { gap: 0.1, layers: [tone(420, 300, 0.12, 0.06), tone(560, 380, 0.1, 0.04, 'sine', 0.06), hiss(1800, 900, 0.18, 0.02, 'bandpass', 0, 4)] },
  heal: { gap: 0.2, layers: arp(660, [0, 7], 0.06, 0.25, 0.05, 'sine') },
  death: { important: true, gap: 1, layers: [tone(330, 110, 1.2, 0.09, 'triangle'), tone(247, 82, 1.4, 0.07, 'sawtooth', 0.15), hiss(600, 80, 1.2, 0.05, 'lowpass')] },
  // ---- skills (by damage type), kept quiet: they fire all the time ----
  cast_fire: { gap: 0.11, jitter: 0.08, layers: [hiss(300, 1400, 0.16, 0.035, 'lowpass'), tone(140, 90, 0.12, 0.02, 'sine')] },
  cast_cold: { gap: 0.11, jitter: 0.1, layers: [tone(1700, 2300, 0.09, 0.018, 'triangle'), hiss(5000, 7000, 0.1, 0.015, 'highpass')] },
  cast_lightning: { gap: 0.1, jitter: 0.1, layers: [hiss(3000, 1200, 0.08, 0.035, 'bandpass', 0, 3), tone(900, 300, 0.06, 0.012, 'square')] },
  cast_chaos: { gap: 0.12, jitter: 0.08, layers: [tone(180, 120, 0.2, 0.025, 'sawtooth'), tone(184, 118, 0.2, 0.02, 'sawtooth')] },
  cast_physical: { gap: 0.09, jitter: 0.12, layers: [hiss(900, 2400, 0.09, 0.035, 'bandpass', 0, 1.5)] },
  crit: { gap: 0.07, jitter: 0.05, layers: [tone(1900, 1400, 0.08, 0.035, 'square'), hiss(2500, 1500, 0.06, 0.03, 'bandpass', 0, 2)] },
  zap: { gap: 0.08, jitter: 0.1, layers: [hiss(4000, 900, 0.14, 0.05, 'bandpass', 0, 2), tone(1200, 200, 0.1, 0.02, 'sawtooth')] },
  shatter: { gap: 0.07, jitter: 0.12, layers: [tone(2600, 1800, 0.1, 0.025, 'triangle'), hiss(6000, 3000, 0.12, 0.03, 'highpass')] },
  boom: { gap: 0.08, jitter: 0.1, layers: [hiss(700, 60, 0.32, 0.09, 'lowpass'), tone(110, 40, 0.25, 0.06, 'sine')] },
  vaal: { gap: 1, important: true, layers: [tone(80, 160, 0.8, 0.1, 'sawtooth'), hiss(200, 3000, 0.8, 0.06, 'lowpass'), ...arp(220, [0, 3, 7, 12], 0.1, 0.6, 0.05, 'square')] },
  kill: { gap: 0.03, jitter: 0.2, layers: [tone(240, 110, 0.05, 0.012, 'square')] },
  // ---- loot ----
  pickup: { gap: 0.04, jitter: 0.06, layers: [tone(900, 1400, 0.06, 0.03)] },
  currency: { gap: 0.1, layers: [tone(1320, 1320, 0.12, 0.05, 'triangle'), tone(1980, 1980, 0.2, 0.04, 'triangle', 0.06)] },
  rare: { gap: 0.15, layers: arp(880, [0, 7], 0.08, 0.3, 0.05, 'triangle') },
  unique: { gap: 0.3, important: true, layers: [...arp(523, [0, 4, 7, 11, 14], 0.08, 0.5, 0.06, 'triangle'), hiss(6000, 10000, 0.8, 0.02, 'highpass', 0.1)] },
  // ---- world / UI ----
  boss: { gap: 1, important: true, layers: [tone(90, 40, 1.2, 0.13, 'sawtooth'), hiss(300, 60, 1.4, 0.07, 'lowpass')] },
  shrine: { gap: 0.5, layers: [tone(300, 1200, 0.6, 0.08, 'triangle'), hiss(3000, 8000, 0.6, 0.02, 'highpass')] },
  select: { gap: 0.05, layers: [tone(660, 880, 0.08, 0.04, 'triangle')] },
  victory: { gap: 2, important: true, layers: [...arp(392, [0, 4, 7], 0.12, 0.4, 0.07, 'triangle'), ...arp(523, [0, 4, 7, 12], 0.12, 0.9, 0.06, 'square').map((l) => Object.assign(l, { at: l.at + 0.4 }))] },
};
