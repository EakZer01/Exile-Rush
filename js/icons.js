'use strict';
// ============================================================
//  Gem icons drawn with canvas paths (no image files).
//  skillIcon(id) / supportIcon(gem) return cached 64px canvases;
//  *URL versions give data URLs for the DOM menus.
// ============================================================
const GEM_RGB = { r: ['#ffd0c0', '#e0413a', '#3a0806'], g: ['#d6ffd0', '#4fd05a', '#08300c'], b: ['#d0e0ff', '#4a7cff', '#081640'] };
const _iconCache = new Map();

function gemBase(g, gem) {
  const [hi, mid, lo] = GEM_RGB[gem];
  // faceted gem body
  const grd = g.createRadialGradient(-9, -10, 2, 0, 0, 30);
  grd.addColorStop(0, hi); grd.addColorStop(0.35, mid); grd.addColorStop(1, lo);
  g.fillStyle = grd;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    const x = Math.cos(a) * 28, y = Math.sin(a) * 28;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2; g.stroke();
  // facet lines
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    g.moveTo(Math.cos(a) * 28, Math.sin(a) * 28); g.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
  }
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill();
}

// symbol painters — drawn in a ~±18 box, white
const SYMBOLS = {
  fireball(g) {
    g.beginPath(); g.arc(5, -5, 8, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-1, -11); g.quadraticCurveTo(-10, -4, -16, 14); g.quadraticCurveTo(-4, 4, 11, 1); g.closePath(); g.fill();
  },
  ice_nova(g) {
    g.lineWidth = 2.6; g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate((i * TAU) / 6);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -16); g.moveTo(0, -10); g.lineTo(-5, -14); g.moveTo(0, -10); g.lineTo(5, -14); g.stroke();
      g.restore();
    }
  },
  arc(g) {
    g.beginPath(); g.moveTo(4, -18); g.lineTo(-8, 1); g.lineTo(-1, 1); g.lineTo(-6, 18); g.lineTo(9, -3); g.lineTo(2, -3); g.lineTo(9, -18); g.closePath(); g.fill();
  },
  spark(g) {
    const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
    star(-6, -6, 10); star(9, 2, 7); star(-2, 11, 6);
  },
  split_arrow(g) {
    g.lineWidth = 2.4; g.lineCap = 'round';
    for (const a of [-0.45, 0, 0.45]) {
      g.save(); g.rotate(a - Math.PI / 4);
      g.beginPath(); g.moveTo(0, 16); g.lineTo(0, -12); g.stroke();
      g.beginPath(); g.moveTo(0, -18); g.lineTo(-5, -10); g.lineTo(5, -10); g.closePath(); g.fill();
      g.restore();
    }
  },
  caustic_arrow(g) {
    g.lineWidth = 2.6; g.lineCap = 'round';
    g.save(); g.rotate(-Math.PI / 4);
    g.beginPath(); g.moveTo(0, 18); g.lineTo(0, -10); g.stroke();
    g.beginPath(); g.moveTo(0, -18); g.lineTo(-5, -9); g.lineTo(5, -9); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = '#c8ff8a';
    g.beginPath(); g.moveTo(-9, 2); g.quadraticCurveTo(-16, 11, -9, 15); g.quadraticCurveTo(-2, 11, -9, 2); g.fill();
  },
  ethereal_knives(g) {
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate((i * TAU) / 6);
      g.beginPath(); g.moveTo(0, -19); g.lineTo(3, -9); g.lineTo(0, -6); g.lineTo(-3, -9); g.closePath(); g.fill();
      g.restore();
    }
    g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill();
  },
  blade_vortex(g) {
    for (let i = 0; i < 3; i++) {
      g.save(); g.rotate((i * TAU) / 3);
      g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(14, -10, 8, -19); g.quadraticCurveTo(4, -10, -3, -6); g.closePath(); g.fill();
      g.restore();
    }
  },
  firestorm(g) {
    const met = (x, y, r) => {
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(x - r, y - r * 0.2); g.lineTo(x - r * 3, y - r * 3); g.lineTo(x + r * 0.2, y - r); g.closePath(); g.fill();
    };
    met(8, 10, 5); met(-6, 4, 4); met(10, -8, 3.5);
  },
  righteous_fire(g) {
    g.beginPath(); g.moveTo(0, 18); g.bezierCurveTo(-16, 16, -14, -2, -4, -8); g.bezierCurveTo(-6, -2, -2, 0, 0, -4);
    g.bezierCurveTo(0, -12, 4, -16, 2, -20); g.bezierCurveTo(14, -10, 16, 14, 0, 18); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.moveTo(0, 15); g.bezierCurveTo(-7, 13, -6, 4, 0, 0); g.bezierCurveTo(6, 4, 7, 13, 0, 15); g.fill();
  },
  raging_spirit(g) {
    g.beginPath(); g.arc(0, -3, 13, Math.PI * 0.9, Math.PI * 0.1); g.lineTo(8, 10); g.lineTo(-8, 10); g.closePath(); g.fill();
    g.fillRect(-6, 10, 12, 5);
    g.fillStyle = '#2a0a04';
    g.beginPath(); g.arc(-5, -2, 3.5, 0, TAU); g.arc(5, -2, 3.5, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(0, 3); g.lineTo(-2, 7); g.lineTo(2, 7); g.closePath(); g.fill();
  },
  cyclone(g) {
    g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath();
    for (let t = 0; t < 1; t += 0.02) {
      const a = t * TAU * 2.2, r = 2 + t * 16;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (t === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  },
  frostbolt(g) {
    g.save(); g.rotate(Math.PI / 4);
    g.beginPath(); g.moveTo(0, -19); g.lineTo(6, -2); g.lineTo(0, 19); g.lineTo(-6, -2); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,40,80,0.35)';
    g.beginPath(); g.moveTo(0, -19); g.lineTo(6, -2); g.lineTo(0, 19); g.closePath(); g.fill();
    g.restore();
  },
  ball_lightning(g) {
    g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
    g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      g.beginPath(); g.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      g.lineTo(Math.cos(a + 0.25) * 14, Math.sin(a + 0.25) * 14); g.lineTo(Math.cos(a - 0.1) * 19, Math.sin(a - 0.1) * 19); g.stroke();
    }
  },
  freezing_pulse(g) {
    g.beginPath(); g.moveTo(16, 0); g.lineTo(-4, -11); g.quadraticCurveTo(-18, 0, -4, 11); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,40,80,0.35)';
    g.beginPath(); g.moveTo(16, 0); g.lineTo(-4, 11); g.quadraticCurveTo(-10, 0, 0, 0); g.closePath(); g.fill();
  },
  lightning_arrow(g) {
    g.lineWidth = 2.4; g.lineCap = 'round';
    g.save(); g.rotate(-Math.PI / 4);
    g.beginPath(); g.moveTo(0, 18); g.lineTo(0, -10); g.stroke();
    g.beginPath(); g.moveTo(0, -18); g.lineTo(-5, -10); g.lineTo(5, -10); g.closePath(); g.fill();
    g.restore();
    g.beginPath(); g.moveTo(10, -2); g.lineTo(4, 7); g.lineTo(8, 7); g.lineTo(5, 16); g.lineTo(14, 4); g.lineTo(10, 4); g.lineTo(14, -2); g.closePath(); g.fill();
  },
  tornado_shot(g) {
    g.lineWidth = 2.2; g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      g.save(); g.rotate((i / 5) * TAU);
      g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -15); g.stroke();
      g.beginPath(); g.moveTo(0, -19); g.lineTo(-3.5, -13); g.lineTo(3.5, -13); g.closePath(); g.fill();
      g.restore();
    }
    g.beginPath(); g.arc(0, 0, 3.5, 0, TAU); g.fill();
  },
  toxic_rain(g) {
    g.lineWidth = 2; g.lineCap = 'round';
    for (const [x, y] of [[-10, -14], [0, -18], [10, -12]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 14); g.stroke(); }
    g.fillStyle = '#c8ff8a';
    g.beginPath(); g.ellipse(0, 12, 15, 5, 0, 0, TAU); g.fill();
  },
  contagion(g) {
    g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
    for (let i = 0; i < 3; i++) {
      g.save(); g.rotate((i / 3) * TAU);
      g.beginPath(); g.arc(0, -12, 7, 0, TAU); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(0, -13, 3.5, 0, TAU); g.fill();
      g.restore();
    }
  },
  essence_drain(g) {
    g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath();
    for (let x = -16; x <= 12; x += 2) g.lineTo(x, Math.sin(x * 0.45) * 6);
    g.stroke();
    g.beginPath(); g.moveTo(18, 0); g.lineTo(10, -6); g.lineTo(10, 6); g.closePath(); g.fill();
  },
  storm_brand(g) {
    g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(3, -12); g.lineTo(-6, 1); g.lineTo(0, 1); g.lineTo(-3, 12); g.lineTo(7, -2); g.lineTo(1, -2); g.lineTo(5, -12); g.closePath(); g.fill();
  },
  armageddon_brand(g) {
    g.lineWidth = 2;
    g.beginPath(); g.arc(0, 4, 15, 0, TAU); g.stroke();
    g.beginPath(); g.arc(4, 2, 6, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(0, -2); g.lineTo(-12, -18); g.lineTo(6, -4); g.closePath(); g.fill();
  },
  molten_strike(g) {
    g.beginPath(); g.moveTo(-14, 14); g.lineTo(-4, -2); g.lineTo(2, 4); g.closePath(); g.fill();
    for (const [x, y, r] of [[4, -10, 4], [12, -2, 3.5], [10, -16, 3]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  },
  earthquake(g) {
    g.fillRect(-18, 6, 36, 4);
    g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-2, 6); g.lineTo(-6, -2); g.lineTo(0, -8); g.lineTo(-3, -16); g.stroke();
    g.beginPath(); g.moveTo(6, 6); g.lineTo(10, 0); g.lineTo(7, -6); g.stroke();
    g.beginPath(); g.moveTo(-10, 6); g.lineTo(-13, 1); g.stroke();
  },
  scorching_ray(g) {
    g.beginPath(); g.arc(-12, 6, 5, 0, TAU); g.fill();
    g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-10, 4); g.lineTo(16, -12); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.5; g.strokeStyle = 'rgba(80,20,0,0.5)';
    g.beginPath(); g.moveTo(-10, 4); g.lineTo(16, -12); g.stroke();
  },
  herald_of_ice(g) {
    g.beginPath(); g.moveTo(0, -18); g.lineTo(7, -4); g.lineTo(0, 18); g.lineTo(-7, -4); g.closePath(); g.fill();
    g.lineWidth = 2;
    for (const a of [-0.9, 0.9, -2.2, 2.2]) { g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); g.stroke(); }
  },
  herald_of_ash(g) {
    g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(12, -4, 8, 8); g.quadraticCurveTo(4, 16, 0, 16); g.quadraticCurveTo(-4, 16, -8, 8); g.quadraticCurveTo(-12, -4, 0, -18); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(0, 8, 5, 0, TAU); g.fill();
  },
  herald_of_thunder(g) {
    g.beginPath(); g.moveTo(4, -18); g.lineTo(-8, 2); g.lineTo(0, 2); g.lineTo(-4, 18); g.lineTo(9, -4); g.lineTo(1, -4); g.closePath(); g.fill();
    g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 17, -2.6, -0.6); g.stroke(); g.beginPath(); g.arc(0, 0, 17, 0.5, 2.5); g.stroke();
  },
  summon_skeletons(g) {
    g.beginPath(); g.arc(0, -8, 8, 0, TAU); g.fill();
    g.fillRect(-4, 0, 8, 4);
    g.fillRect(-1.5, 4, 3, 12); g.fillRect(-8, 7, 16, 2.5); g.fillRect(-8, 11, 16, 2.5);
    g.fillStyle = '#1a1a2a';
    g.beginPath(); g.arc(-3, -8, 2.2, 0, TAU); g.arc(3, -8, 2.2, 0, TAU); g.fill();
  },
  flicker_strike(g) {
    g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-16, 12); g.lineTo(-6, 2); g.lineTo(-10, -2); g.lineTo(4, -12); g.stroke();
    g.beginPath(); g.moveTo(2, 14); g.lineTo(16, -14); g.stroke();
    g.fillRect(4, 6, 8, 3);
  },
  smite(g) {
    g.fillRect(-14, -14, 14, 8); g.fillRect(-9, -6, 4, 18);
    g.beginPath(); g.moveTo(10, -16); g.lineTo(4, -2); g.lineTo(10, -2); g.lineTo(4, 14); g.lineTo(16, -6); g.lineTo(10, -6); g.closePath(); g.fill();
  },
  frost_blades(g) {
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(-14 * k, 14); g.lineTo(10 * k, -14); g.lineTo(14 * k, -10); g.lineTo(-10 * k, 16); g.closePath(); g.fill(); }
  },
  kinetic_blast(g) {
    g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.6; g.beginPath(); g.arc(Math.cos(a) * 15, Math.sin(a) * 15, 4, 0, TAU); g.fill(); }
  },
  glacial_cascade(g) {
    for (const [x, h] of [[-12, 10], [-2, 16], [9, 22]]) { g.beginPath(); g.moveTo(x - 4, 14); g.lineTo(x, 14 - h - 4); g.lineTo(x + 4, 14); g.closePath(); g.fill(); }
  },
  shock_nova(g) {
    g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(2, -10); g.lineTo(-4, 1); g.lineTo(1, 1); g.lineTo(-2, 10); g.lineTo(5, -2); g.lineTo(0, -2); g.closePath(); g.fill();
  },
  lacerate(g) {
    g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-15, 12); g.lineTo(13, -14); g.moveTo(-13, -12); g.lineTo(15, 13); g.stroke();
    g.beginPath(); g.arc(6, 14, 3, 0, TAU); g.fill();
  },
  viper_strike(g) {
    g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-14, 10); g.quadraticCurveTo(-6, -8, 2, 2); g.quadraticCurveTo(8, 10, 14, -10); g.stroke();
    g.beginPath(); g.moveTo(14, -16); g.lineTo(9, -7); g.lineTo(18, -9); g.closePath(); g.fill();
  },
  ground_slam(g) {
    g.beginPath(); g.moveTo(0, 14); g.arc(0, 14, 26, -Math.PI * 0.8, -Math.PI * 0.2); g.closePath(); g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
    g.fillRect(-4, -16, 8, 18); g.fillRect(-10, -18, 20, 7);
  },
  ice_shot(g) {
    g.lineWidth = 3; g.beginPath(); g.moveTo(-16, 0); g.lineTo(4, 0); g.stroke();
    g.beginPath(); g.moveTo(10, 0); g.lineTo(3, -5); g.lineTo(3, 5); g.closePath(); g.fill();
    for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(12, 0); g.lineTo(12 + Math.cos(a) * 9, Math.sin(a) * 9); g.stroke(); }
  },
  rain_of_arrows(g) {
    g.lineWidth = 2.5;
    for (const [x, y] of [[-10, -12], [0, -6], [10, -14], [-4, 4], [8, 6]]) { g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x, y + 5); g.stroke(); g.beginPath(); g.moveTo(x - 3, y + 3); g.lineTo(x, y + 8); g.lineTo(x + 3, y + 3); g.closePath(); g.fill(); }
  },
  support(g) {
    // two linked sockets — "support"
    g.lineWidth = 3;
    g.beginPath(); g.arc(-7, 0, 7, 0, TAU); g.stroke();
    g.beginPath(); g.arc(7, 0, 7, 0, TAU); g.stroke();
    g.fillRect(-4, -1.5, 8, 3);
  },
};

function makeIcon(key, gem, symbol) {
  let c = _iconCache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64;
  _iconCache.set(key, c);
  const g = c.getContext('2d');
  if (!g || !g.beginPath) return c;
  g.translate(32, 32);
  gemBase(g, gem);
  g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff';
  g.shadowColor = 'rgba(255,255,255,0.8)'; g.shadowBlur = 6;
  (SYMBOLS[symbol] || SYMBOLS.support)(g);
  g.shadowBlur = 0;
  return c;
}
const skillIcon = (id) => makeIcon('s:' + id, SKILLS[id].gem, id);
const supportIcon = (gem) => makeIcon('sup:' + gem, gem, 'support');

const _urlCache = new Map();
function iconURL(canvas, key) {
  let u = _urlCache.get(key);
  if (!u) { try { u = canvas.toDataURL(); } catch (e) { u = ''; } _urlCache.set(key, u); }
  return u;
}
const skillIconURL = (id) => iconURL(skillIcon(id), 's:' + id);
const supportIconURL = (gem) => iconURL(supportIcon(gem), 'sup:' + gem);
