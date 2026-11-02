'use strict';
// ============================================================
//  Rendering: world + HUD on a single canvas
//  Pass A: the lit world (ground, decals, props, bodies)
//  Darkness: lighting.js punches light holes into a dark layer
//  Pass B: glowing things & in-world UI (spells, loot, eyes, text)
// ============================================================
const GEM_COLOR = { r: '#e0413a', g: '#4fd05a', b: '#4a7cff' };
let _bgPattern = null;

function makeBackground(ctx) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#342b20';
  g.fillRect(0, 0, 512, 512);
  // mottled dirt
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = rand(8, 46);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const tone = Math.random() < 0.5 ? '70,58,42' : '30,26,21';
    grd.addColorStop(0, `rgba(${tone},${rand(0.15, 0.4)})`);
    grd.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = grd;
    // wrap so the tile is seamless
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.save(); g.translate(ox, oy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  }
  // flagstone patches
  for (let i = 0; i < 5; i++) {
    const bx = Math.random() * 512, by = Math.random() * 512;
    for (let k = 0; k < 8; k++) {
      const x = bx + rand(-40, 40), y = by + rand(-30, 30), w = rand(14, 26), h = rand(10, 18);
      g.fillStyle = `rgba(${randi(80, 98)},${randi(72, 88)},${randi(62, 76)},0.6)`;
      g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
    }
  }
  // stones
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = rand(1.5, 5);
    g.fillStyle = `rgba(${randi(85, 115)},${randi(78, 100)},${randi(62, 82)},${rand(0.4, 0.8)})`;
    g.beginPath(); g.ellipse(x, y, r, r * rand(0.6, 1), rand(0, TAU), 0, TAU); g.fill();
  }
  // cracks
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    let x = Math.random() * 512, y = Math.random() * 512;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += rand(-18, 18); y += rand(-18, 18); g.lineTo(x, y); }
    g.stroke();
  }
  // biome colour grade
  const tint = G.map && BIOMES[G.map.biome].tint;
  if (tint) { g.globalCompositeOperation = 'multiply'; g.fillStyle = tint; g.fillRect(0, 0, 512, 512); g.globalCompositeOperation = 'source-over'; }
  _bgPattern = ctx.createPattern(c, 'repeat');
}

// ---- lights for everything that glows this frame ----
function collectLights(P, inView) {
  addLight(P.x, P.y, 330 + Math.sin(G.time * 7) * 6, 1);
  if (P.flaskFx.move > 0 || P.dashT > 0) addLight(P.x, P.y, 140, 0.6);
  for (const inst of P.skills) {
    if (inst.st.behavior === 'aura') addLight(P.x, P.y, inst.st.radius * 1.6 + Math.sin(G.time * 13) * 8, 0.8);
  }
  for (const p of G.projectiles) {
    if (!inView(p.x, p.y, 60)) continue;
    addLight(p.x, p.y, p.s.arrow ? 45 : Math.max(70, p.r * 10), p.s.arrow ? 0.35 : 0.75);
  }
  for (const n of G.novas) addLight(n.x, n.y, n.r * 1.3 + 40, 0.55);
  for (const m of G.meteors) if (m.delay < m.fall) addLight(m.x, m.y, 90, 0.6);
  for (const fx of G.effects) {
    const a = 1 - fx.t / fx.dur;
    if (fx.kind === 'boom') addLight(fx.x, fx.y, fx.r * 2.4, a);
    else if (fx.kind === 'bolt') for (const pt of fx.pts) addLight(pt[0], pt[1], 110, a * 0.9);
    else if (fx.kind === 'spin') addLight(fx.x, fx.y, fx.r * 1.4, a * 0.4);
  }
  for (const m of G.minions) addLight(m.x, m.y, 80, 0.7);
  for (const g of G.grounds) if (inView(g.x, g.y, g.r)) addLight(g.x, g.y, g.r * 1.4, 0.35);
  for (const s of G.shrines) addLight(s.x, s.y, 170, 0.8);
  if (G.breach && G.breach.state === 'placed') addLight(G.breach.x, G.breach.y, 150, 0.8);
  else if (G.breach && G.breach.state === 'open') addLight(G.breach.x, G.breach.y, G.breach.r * 1.1, 0.35);
  for (const it of G.pickups) addLight(it.x, it.y, 70, 0.6);
  if (G.league) {
    for (const b of G.league.boxes) addLight(b.x, b.y, 120, 0.7);
    for (const R of G.league.rituals) if (R.state === 'placed' || R.state === 'active') addLight(R.x, R.y, R.state === 'active' ? LEAGUE.ritualR * 1.2 : 120, 0.6);
    if (G.league.deli.state === 'placed') addLight(G.league.deli.x, G.league.deli.y, 130, 0.8);
  }
  for (const g of G.items) addLight(g.x, g.y, g.item.rarity === 'unique' ? 120 : 70, 0.6);
  for (const p of G.eproj) if (inView(p.x, p.y, 40)) addLight(p.x, p.y, 50, 0.5);
  for (const h of G.hazards) addLight(h.x, h.y, h.r * 1.4, 0.25 + 0.5 * (h.t / h.warn));
  let ign = 0;
  for (const e of G.enemies) {
    if (e.rarity === 3) addLight(e.x, e.y, e.r * 4, 0.6);
    else if (e.ign.t > 0 && ign < 50 && inView(e.x, e.y, 40)) { ign++; addLight(e.x, e.y, 55, 0.45); }
  }
}

function render() {
  const ctx = G.ctx, W = G.W, H = G.H, dpr = G.dpr, P = G.player;
  if (!_bgPattern) makeBackground(ctx);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0d0b09';
  ctx.fillRect(0, 0, W, H);
  if (!P) return;

  const z = G.zoom;
  const shk = G.settings.shake === false ? 0 : G.shake;
  const sx = shk > 0 ? rand(-shk, shk) : 0, sy = shk > 0 ? rand(-shk, shk) : 0;
  const camX = G.cam.x, camY = G.cam.y;
  const worldTransform = () => { ctx.save(); ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(z, z); ctx.translate(-camX, -camY); };

  // view bounds for culling
  const hw = W / 2 / z + 80, hh = H / 2 / z + 80;
  const vx0 = camX - hw, vx1 = camX + hw, vy0 = camY - hh, vy1 = camY + hh;
  const inView = (x, y, r) => x + r > vx0 && x - r < vx1 && y + r > vy0 && y - r < vy1;

  // ================= PASS A: lit world =================
  worldTransform();
  ctx.fillStyle = _bgPattern;
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  drawDecals(ctx, inView);
  drawProps(ctx, vx0, vy0, vx1, vy1);

  // caustic clouds
  for (const g of G.grounds) {
    if (!inView(g.x, g.y, g.r)) continue;
    const a = Math.min(1, (g.dur - g.t) / 0.5) * 0.5;
    const grd = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
    grd.addColorStop(0, `rgba(120,200,60,${a * 0.7})`);
    grd.addColorStop(0.7, `rgba(80,160,40,${a * 0.45})`);
    grd.addColorStop(1, 'rgba(60,120,30,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.fill();
  }

  // poison pools (Bile Spitter)
  for (const p of G.epools) {
    if (!inView(p.x, p.y, p.r)) continue;
    const a = Math.min(1, (p.dur - p.t) / 0.6) * 0.55;
    ctx.fillStyle = `rgba(110,190,40,${a})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.55, 0, 0, TAU); ctx.fill();
  }

  // shrine bodies
  for (const s of G.shrines) {
    if (!inView(s.x, s.y, 60)) continue;
    const def = SHRINES[s.kind];
    ctx.fillStyle = '#2a2620'; ctx.strokeStyle = def.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 8, 26, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a443a'; ctx.fillRect(s.x - 7, s.y - 30, 14, 38);
    ctx.fillStyle = 'rgba(255,240,210,0.12)'; ctx.fillRect(s.x - 6, s.y - 30, 4, 38);
  }

  ctx.imageSmoothingEnabled = false;
  for (const e of G.enemies) if (inView(e.x, e.y, e.r + 30)) drawEnemy(ctx, e, P);
  drawPlayer(ctx, P);
  ctx.imageSmoothingEnabled = true;

  // blade vortex
  for (const inst of P.skills) {
    if (inst.st.behavior !== 'orbit' || !inst.rt.blades) continue;
    const br = inst.st.size * Math.sqrt((1 + inst.st.areaInc) * inst.st.areaMore);
    for (const b of inst.rt.blades) {
      if (b.x === undefined) continue;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a + G.time * 14);
      ctx.fillStyle = '#e8eef8'; ctx.strokeStyle = '#7a8aa0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-br, 0); ctx.lineTo(0, -br * 0.35); ctx.lineTo(br, 0); ctx.lineTo(0, br * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  drawParticles(ctx, false, inView);
  ctx.restore();

  // ================= DARKNESS =================
  collectLights(P, inView);
  renderDarkness(ctx, W, H, camX, camY, z, sx, sy);

  // ================= PASS B: glowing things =================
  worldTransform();

  // hazards (boss telegraphs): outline = where it lands, fill grows until it hits
  for (const h of G.hazards) drawHazard(ctx, h, Math.min(1, h.t / h.warn), false);

  drawBrazierFlames(ctx);
  if (G.settings.lighting) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07;
    ctx.drawImage(glowSprite('#ffb060', 240), P.x - 240, P.y - 240);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // shrine glow + label
  for (const s of G.shrines) {
    if (!inView(s.x, s.y, 60)) continue;
    const def = SHRINES[s.kind], pulse = 0.6 + Math.sin(G.time * 4) * 0.2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = pulse; ctx.drawImage(glowSprite(def.color, 70), s.x - 70, s.y - 70); ctx.globalAlpha = 1;
    ctx.drawImage(glowSprite(def.color, 14), s.x - 14, s.y - 48);
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '600 12px Sarabun, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = def.color; ctx.fillText(def.name, s.x, s.y + 32);
    if (Math.random() < 0.3) emit('gold', s.x + rand(-20, 20), s.y, 1, { color: def.color, dir: -Math.PI / 2, spread: 0.3 });
  }

  // xp orbs (glowing gems)
  ctx.globalCompositeOperation = 'lighter';
  for (const o of G.orbs) {
    if (!inView(o.x, o.y, 8)) continue;
    const big = o.v >= 20, mid = o.v >= 5;
    const col = big ? '#ff5a5a' : mid ? '#5aff8a' : '#5ab4ff';
    ctx.drawImage(glowSprite(col, big ? 14 : 9), o.x - (big ? 14 : 9), o.y - (big ? 14 : 9));
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const o of G.orbs) {
    if (!inView(o.x, o.y, 8)) continue;
    const big = o.v >= 20, mid = o.v >= 5;
    const col = big ? '#ff8a8a' : mid ? '#8affaa' : '#8ad0ff';
    const r = big ? 6 : mid ? 5 : 3.5;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(o.x, o.y - r * 1.3); ctx.lineTo(o.x + r, o.y); ctx.lineTo(o.x, o.y + r * 1.3); ctx.lineTo(o.x - r, o.y); ctx.closePath(); ctx.fill();
  }
  // pickups
  for (const it of G.pickups) {
    if (!inView(it.x, it.y, 20)) continue;
    const def = pickupDef(it), bob = Math.sin(it.t * 4) * 3;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glowSprite(def.color, 26), it.x - 26, it.y - 26 + bob);
    ctx.globalCompositeOperation = 'source-over';
    if (it.kind === 'chest') {
      ctx.imageSmoothingEnabled = false;
      drawSprite(ctx, 'chest', 0, false, 'dark', '', it.x, it.y + 10 + bob, 2.2);
      ctx.imageSmoothingEnabled = true;
    } else {
      ctx.fillStyle = def.color;
      ctx.font = '700 18px Sarabun, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, it.x, it.y + bob);
      ctx.textBaseline = 'alphabetic';
    }
  }

  drawGroundItems(ctx, inView);
  drawBreach(ctx);
  drawLeagues(ctx, inView);

  // Righteous Fire aura
  for (const inst of P.skills) {
    if (inst.st.behavior !== 'aura') continue;
    const R = inst.st.radius;
    ctx.globalCompositeOperation = 'lighter';
    const grd = ctx.createRadialGradient(P.x, P.y, R * 0.2, P.x, P.y, R);
    grd.addColorStop(0, 'rgba(255,120,30,0.02)');
    grd.addColorStop(0.75, `rgba(255,110,20,${0.12 + Math.sin(G.time * 9) * 0.03})`);
    grd.addColorStop(1, 'rgba(255,80,10,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // minions: flaming skulls
  ctx.globalCompositeOperation = 'lighter';
  for (const m of G.minions) if (!m.inst.st.minionSprite) ctx.drawImage(glowSprite('#ff5a2a', 22), m.x - 22, m.y - 22);
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false;
  for (const m of G.minions) {
    const spr = m.inst.st.minionSprite;
    if (spr) drawSprite(ctx, spr, Math.floor(G.time * 6 + m.t) % spriteFrameCount(spr), m.vx < 0, 'magic', '', m.x, m.y + 10, 1.5);
    else drawSprite(ctx, 'skull', 0, false, 'dark', '', m.x, m.y + 8, 1.6);
  }
  ctx.imageSmoothingEnabled = true;

  // player projectiles
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.projectiles) {
    if (!inView(p.x, p.y, 30)) continue;
    const s = p.s;
    if (s.arrow) {
      const ang = Math.atan2(p.vy, p.vx), L = p.r * 3.4;
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(p.x - Math.cos(ang) * L, p.y - Math.sin(ang) * L); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.drawImage(glowSprite(s.color, p.r * 2.2), p.x - p.r * 2.2, p.y - p.r * 2.2);
    } else {
      const gr = p.r * 3;
      ctx.drawImage(glowSprite(s.color, gr), p.x - gr, p.y - gr);
      ctx.fillStyle = s.core;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, TAU); ctx.fill();
    }
  }
  drawSkillExtras(ctx, P);
  // novas
  for (const n of G.novas) {
    ctx.strokeStyle = hexA(n.s.color, 0.7); ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = hexA('#ffffff', 0.7); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke();
  }
  // meteors falling
  for (const m of G.meteors) {
    if (m.delay > m.fall) {
      ctx.strokeStyle = hexA(m.s.color, 0.35); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.stroke();
      continue;
    }
    const f = m.delay / m.fall;
    const mx = m.x - 120 * f, my = m.y - 260 * f;
    ctx.drawImage(glowSprite(m.s.color, 26), mx - 26, my - 26);
    ctx.strokeStyle = hexA(m.s.color, 0.5); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(mx - 40, my - 86); ctx.lineTo(mx, my); ctx.stroke();
    ctx.fillStyle = '#fff0c0'; ctx.beginPath(); ctx.arc(mx, my, 5, 0, TAU); ctx.fill();
  }
  // effects
  for (const fx of G.effects) drawEffect(ctx, fx);
  ctx.globalCompositeOperation = 'source-over';
  drawParticles(ctx, true, inView);

  // enemy projectiles
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.eproj) {
    if (!inView(p.x, p.y, 20)) continue;
    ctx.drawImage(glowSprite(p.color, 16), p.x - 16, p.y - 16);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const p of G.eproj) {
    if (!inView(p.x, p.y, 20)) continue;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
  }

  ctx.imageSmoothingEnabled = false;
  drawSpriteEmissive(ctx, 'cls_' + P.cls.id, P._sf || 0, !!P._faceLeft, P.x, P.y + 14 + (P._bob || 0), 2);
  ctx.imageSmoothingEnabled = true;
  drawAscendancyAuras(ctx, P);

  // enemy overlays: glowing eyes, ailments, health bars, names
  for (const e of G.enemies) if (inView(e.x, e.y, e.r + 30)) drawEnemyOverlay(ctx, e, P);

  // floating texts
  ctx.textAlign = 'center';
  for (const t of G.texts) {
    const a = 1 - t.t / t.dur;
    ctx.globalAlpha = Math.min(1, a * 2);
    ctx.font = `700 ${Math.round(14 * t.scale)}px Sarabun, sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(t.str, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (P.hurtFlash > 0) { ctx.fillStyle = `rgba(160,0,0,${P.hurtFlash * 1.2})`; ctx.fillRect(0, 0, W, H); }
  if (P.life < P.maxLife * 0.3) {
    const lv = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    lv.addColorStop(0, 'rgba(120,0,0,0)'); lv.addColorStop(1, `rgba(120,0,0,${0.35 + Math.sin(G.time * 6) * 0.1})`);
    ctx.fillStyle = lv; ctx.fillRect(0, 0, W, H);
  }

  drawDeliriumFog(ctx, W, H);
  drawHUD(ctx, W, H, P);
}

let _shadowSpr = null;
function shadowSprite() {
  if (_shadowSpr) return _shadowSpr;
  const c = document.createElement('canvas'); c.width = 64; c.height = 24;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 12, 2, 32, 12, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.7, 'rgba(0,0,0,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.save(); g.scale(1, 12 / 32); g.beginPath(); g.arc(32, 32, 32, 0, TAU); g.fill(); g.restore();
  return (_shadowSpr = c);
}

function enemySpriteId(e) { return e.rarity === 3 ? e.bossDef.id : e.type; }

// Sprite placement is stored on the enemy so pass B can draw the
// glowing (emissive) layer exactly on top without recomputing it.
function drawEnemy(ctx, e, P) {
  const id = enemySpriteId(e), def = SPRITE_ART[id];
  const boss = e.rarity === 3;
  const px = boss ? (e.r * 2.3) / 24 : def.px * (e.r / MONSTERS[e.type].r);
  const k = 1 + (e.punch > 0 ? e.punch * (boss ? 0.5 : 1.6) : 0);
  const n = spriteFrameCount(id);
  const frame = n > 1 && e.freeze <= 0 ? Math.floor(G.time * (def.fps || 5) + e.id * 0.37) % n : 0;
  const flip = !def.sym && P.x < e.x;
  const bob = def.float ? Math.sin(G.time * 3 + e.id) * 2.5 : 0;
  const foot = e.y + e.r * 0.9 + bob;
  ctx.drawImage(shadowSprite(), e.x - e.r * 1.05, e.y + e.r * 0.62, e.r * 2.1, e.r * 0.8);
  const outline = e.rarity === 2 ? 'rare' : e.rarity === 1 ? 'magic' : 'dark';
  const crouch = e.leapS === 'wind' ? 0.8 : 1;
  const h = drawSprite(ctx, id, frame, flip, outline, e.freeze > 0 ? 'frost' : e.breach ? 'breach' : '', e.x, foot, px * k * crouch);
  // hit flash / volatile fuse: white overlay on top so the art stays readable
  const blink = e.fuse && Math.floor(G.time * 16) % 2;
  if (e.flash > 0 || blink) {
    ctx.globalAlpha = blink ? 0.85 : boss ? 0.25 : e.rarity === 2 ? 0.4 : 0.6;
    drawSprite(ctx, id, frame, flip, outline, 'white', e.x, foot, px * k);
    ctx.globalAlpha = 1;
  }
  e._sf = frame; e._sfl = flip; e._sfoot = foot; e._spx = px * k; e._stop = foot - h;
}

// drawn after darkness so threats stay readable in the dark
function drawEnemyOverlay(ctx, e, P) {
  const x = e.x, y = e.y, r = e.r;
  const top = e._stop !== undefined ? Math.min(y - r, e._stop) : y - r;

  if (e.rarity === 3) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45 + Math.sin(G.time * 3) * 0.15;
    ctx.drawImage(glowSprite(e.bossDef.glow, r * 2.2), x - r * 2.2, y - r * 2.2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.5) emit('ember', x + rand(-r, r), y + rand(-r, r), 1, { color: e.bossDef.glow });
  }
  if (e.fuse) {
    const R = 60, k = 1 - e.fuse / 0.55;
    ctx.strokeStyle = 'rgba(255,90,30,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(255,90,30,${0.1 + k * 0.25})`;
    ctx.beginPath(); ctx.arc(x, y, R * k, 0, TAU); ctx.fill();
  }

  // glowing parts of the sprite (eyes, lava, magic) shine through the dark
  if (e._sfoot !== undefined) {
    ctx.imageSmoothingEnabled = false;
    drawSpriteEmissive(ctx, enemySpriteId(e), e._sf, e._sfl, x, e._sfoot, e._spx);
    ctx.imageSmoothingEnabled = true;
  }

  // ailment overlays
  if (e.ign.t > 0) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55;
    ctx.drawImage(glowSprite('#ff6a1a', r * 1.1), x - r * 1.1, y - r * 1.3 + Math.sin(G.time * 20 + e.id) * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.12) emit('ember', x + rand(-r, r) * 0.6, y - r * 0.3, 1, { dir: -Math.PI / 2, spread: 0.5 });
  }
  if (e.chill.t > 0 && e.freeze <= 0) {
    ctx.strokeStyle = 'rgba(140,220,255,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.stroke();
  }
  if (e.shock.t > 0) {
    ctx.strokeStyle = 'rgba(255,240,120,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = rand(0, TAU);
      ctx.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4);
      ctx.lineTo(x + Math.cos(a + 0.3) * r * 1.2, y + Math.sin(a + 0.3) * r * 1.2);
    }
    ctx.stroke();
  }
  if (e.immuneT > G.time) {
    ctx.strokeStyle = hexA('#fff0c0', 0.6 + Math.sin(G.time * 12) * 0.3); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r * 1.25, 0, TAU); ctx.stroke();
  }
  if (e.buffT > G.time) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
    ctx.drawImage(glowSprite('#c060ff', r * 1.3), x - r * 1.3, y - r * 1.3);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (e.curse && e.curse.t > G.time) {
    ctx.strokeStyle = e.curse.type === 'ele' ? '#c8a0ff' : e.curse.type === 'vuln' ? '#ff6a5a' : '#9a5aff';
    ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r * 1.1, r * 0.4, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (e.poison.length) {
    ctx.fillStyle = 'rgba(140,230,80,0.8)';
    for (let i = 0; i < Math.min(4, e.poison.length); i++) {
      const a = G.time * 3 + i * 1.6 + e.id;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.9, y - r * 0.4 + Math.sin(a * 1.3) * r * 0.5, 2, 0, TAU); ctx.fill();
    }
  }

  // health bar & name
  if ((e.rarity >= 1 && e.rarity < 3) || (e.hp < e.maxHp && e.maxHp > 120)) {
    const bw = Math.max(26, r * 2), bx = x - bw / 2, by = top - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
    ctx.fillStyle = e.rarity === 2 ? '#e8b030' : e.rarity === 1 ? '#6a7aff' : '#c03030';
    ctx.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), 3);
  }
  if (e.rarity === 2) {
    ctx.font = '700 12px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(e.name, x, top - 11); ctx.fillStyle = '#ffd84a'; ctx.fillText(e.name, x, top - 11);
  }
}

function drawPlayer(ctx, P) {
  const x = P.x, y = P.y;
  ctx.drawImage(shadowSprite(), x - 14, y + 8, 28, 10);
  for (const f of P.flasks) {
    if (!f || f.active <= 0) continue;
    const c = FLASK_COLOR[BASES[f.base].flask.kind];
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glowSprite(c, 28), x - 28, y - 28);
    ctx.globalCompositeOperation = 'source-over';
  }
  // facing & walk cycle
  if (Math.abs(Math.cos(P.facing)) > 0.2) P._faceLeft = Math.cos(P.facing) < 0;
  const moving = Math.hypot(P.vx, P.vy) > 10;
  const id = 'cls_' + P.cls.id, def = SPRITE_ART[id];
  P._sf = moving ? Math.floor(G.time * def.fps) % spriteFrameCount(id) : 0;
  P._bob = moving && P._sf === 1 ? -1 : 0;
  ctx.globalAlpha = P.iframes > 0.15 ? 0.55 : 1;
  drawSprite(ctx, id, P._sf, !!P._faceLeft, 'dark', '', x, y + 14 + P._bob, 2);
  if (P.hurtFlash > 0.1) {
    ctx.globalAlpha = 0.45;
    drawSprite(ctx, id, P._sf, !!P._faceLeft, 'dark', 'white', x, y + 14 + P._bob, 2);
  }
  ctx.globalAlpha = 1;
  // cyclone spin
  for (const inst of P.skills) {
    if (inst.st.behavior !== 'spin') continue;
    const R = inst.st.radius, a0 = inst.rt.spin || 0;
    ctx.strokeStyle = 'rgba(230,230,230,0.35)'; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.arc(x, y, R * (0.6 + k * 0.15), a0 + k * 2.1, a0 + k * 2.1 + 1.2); ctx.stroke();
    }
  }
}

function hazardPath(ctx, h, k) {
  ctx.beginPath();
  if (h.shape === 'line') {
    const ax = Math.cos(h.a), ay = Math.sin(h.a), nx = -ay * h.r, ny = ax * h.r, L = h.len * k;
    ctx.moveTo(h.x + nx, h.y + ny); ctx.lineTo(h.x + nx + ax * L, h.y + ny + ay * L);
    ctx.lineTo(h.x - nx + ax * L, h.y - ny + ay * L); ctx.lineTo(h.x - nx, h.y - ny); ctx.closePath();
  } else if (h.shape === 'cone') {
    ctx.moveTo(h.x, h.y); ctx.arc(h.x, h.y, h.r * k, h.a - h.arc / 2, h.a + h.arc / 2); ctx.closePath();
  } else if (h.shape === 'ring') {
    ctx.arc(h.x, h.y, h.r0 + (h.r - h.r0) * k, 0, TAU); ctx.arc(h.x, h.y, h.r0, 0, TAU, true);
  } else ctx.arc(h.x, h.y, h.r * k, 0, TAU);
}
function drawHazard(ctx, h, p, burst) {
  ctx.strokeStyle = hexA(h.color, burst ? 0.9 * (1 - p) : 0.85); ctx.lineWidth = h.ghost ? 1.5 : 2.5;
  if (h.ghost) ctx.setLineDash([10, 8]);
  hazardPath(ctx, h, 1); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = hexA(h.color, burst ? 0.5 * (1 - p) : h.ghost ? 0.08 : 0.1 + 0.28 * p);
  hazardPath(ctx, h, burst ? 1 : h.shape === 'ring' ? 1 : p); ctx.fill('evenodd');
}

function drawEffect(ctx, fx) {
  const p = fx.t / fx.dur, a = 1 - p;
  switch (fx.kind) {
    case 'hzfire': drawHazard(ctx, fx.h, p, true); break;
    case 'boom': {
      const r = fx.r * (0.5 + 0.5 * Math.min(1, p * 3));
      ctx.fillStyle = hexA(fx.color, 0.45 * a);
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = hexA(fx.color, 0.8 * a); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, TAU); ctx.stroke();
      break;
    }
    case 'ring': {
      ctx.strokeStyle = hexA(fx.color, 0.6 * a); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 + p * 0.1), 0, TAU); ctx.stroke();
      break;
    }
    case 'spark': case 'trail': {
      ctx.globalAlpha = a;
      const r = fx.r * (fx.kind === 'trail' ? 1 : 1 + p);
      ctx.drawImage(glowSprite(fx.color, r * 1.6), fx.x - r * 1.6, fx.y - r * 1.6);
      ctx.globalAlpha = 1;
      break;
    }
    case 'death': {
      ctx.fillStyle = hexA(fx.color, 0.5 * a);
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 + p * 0.8), 0, TAU); ctx.fill();
      break;
    }
    case 'spin': {
      ctx.strokeStyle = hexA(fx.color, 0.55 * a); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.85 + p * 0.15), 0, TAU); ctx.stroke();
      break;
    }
    case 'bolt': {
      ctx.strokeStyle = hexA(fx.color, a); ctx.lineWidth = 3;
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let i = 0; i < fx.pts.length - 1; i++) {
          const [x0, y0] = fx.pts[i], [x1, y1] = fx.pts[i + 1];
          ctx.moveTo(x0, y0);
          const segs = 5;
          for (let k = 1; k <= segs; k++) {
            const t = k / segs;
            const j = k === segs ? 0 : 12;
            ctx.lineTo(lerp(x0, x1, t) + rand(-j, j), lerp(y0, y1, t) + rand(-j, j));
          }
        }
        ctx.stroke();
        ctx.strokeStyle = hexA('#ffffff', a); ctx.lineWidth = 1.2;
      }
      break;
    }
  }
}

function drawAscendancyAuras(ctx, P) {
  const ks = P.mods.ks;
  if (ks.hexField) {
    ctx.strokeStyle = hexA('#b56cff', 0.18 + Math.sin(G.time * 2) * 0.05); ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]); ctx.lineDashOffset = -G.time * 20;
    ctx.beginPath(); ctx.arc(P.x, P.y, 220, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (P.aegis) {
    ctx.strokeStyle = hexA('#ffe9a0', 0.55 + Math.sin(G.time * 5) * 0.15); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(P.x, P.y - 2, 26, 0, TAU); ctx.stroke();
  }
  if (P.skills.some((s) => s.vaalT > 0)) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glowSprite('#ff2a2a', 64), P.x - 64, P.y - 64, 128, 128);
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.5) emit('ember', P.x + rand(-16, 16), P.y + rand(-10, 14), 1, { color: '#ff3030' });
  }
}

// brands (rotating runes on their host) and channelled beams
function drawSkillExtras(ctx, P) {
  for (const inst of P.skills) {
    const s = inst.st;
    if (inst.rt.brands) for (const b of inst.rt.brands) {
      ctx.save(); ctx.translate(b.x, b.y + 4); ctx.rotate(G.time * 2.5);
      ctx.strokeStyle = hexA(s.color, 0.85); ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) { const a = (i * 2 * TAU) / 5; ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    if (s.behavior === 'beam' && inst.rt.beamT > G.time) {
      const a = inst.rt.beamA, L = s.range, w = s.size * Math.sqrt((1 + s.areaInc) * s.areaMore);
      const x1 = P.x + Math.cos(a) * L, y1 = P.y + Math.sin(a) * L;
      ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(s.color, 0.35 + Math.sin(G.time * 40) * 0.08); ctx.lineWidth = w * 2;
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = hexA(s.core, 0.8); ctx.lineWidth = w * 0.5;
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.lineCap = 'butt';
      if (Math.random() < 0.5) emit('ember', x1 + rand(-10, 10), y1 + rand(-10, 10), 1);
      addLight((P.x + x1) / 2, (P.y + y1) / 2, L * 0.7, 0.5);
    }
  }
}

// ---------------- HUD ----------------
function drawHUD(ctx, W, H, P) {
  const mobile = W < 700;
  // XP bar
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, 12);
  const xg = ctx.createLinearGradient(0, 0, 0, 12);
  xg.addColorStop(0, '#7ad0ff'); xg.addColorStop(1, '#2a6ab0');
  ctx.fillStyle = xg; ctx.fillRect(0, 1, W * clamp(P.xp / P.xpNext, 0, 1), 10);
  ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, 12);

  ctx.textAlign = 'left'; ctx.fillStyle = '#e8d8a8';
  ctx.font = '700 15px Cinzel, serif';
  ctx.fillText('Lv ' + P.level, 10, 32);
  if (P.asc) {
    const a = ASCENDANCY[P.asc];
    ctx.font = '700 12px Cinzel, serif'; ctx.fillStyle = a.color;
    ctx.fillText(a.icon + ' ' + a.name, 10, 50);
  }
  if (P.revives > 0) {
    ctx.font = '700 13px Sarabun, sans-serif'; ctx.fillStyle = '#fff0c0';
    ctx.fillText('✟ Second Wind', 10, P.mods.ks.rage ? 86 : 68);
  }
  if (P.mods.ks.rage) {
    ctx.font = '700 13px Sarabun, sans-serif'; ctx.fillStyle = P.rage > 0 ? '#ff5a4a' : '#7a4a40';
    ctx.fillText('✊ Rage ' + Math.floor(P.rage), 10, 68);
  }

  // timer
  ctx.textAlign = 'center';
  ctx.font = '700 26px Cinzel, serif';
  ctx.fillStyle = '#f0e0b0';
  ctx.fillText(fmtTime(G.time), W / 2, 42);
  ctx.font = '600 13px Sarabun, sans-serif'; ctx.fillStyle = '#b8a888';
  ctx.fillText('☠ ' + G.stats.kills, W / 2, 60);
  if (G.endless) {
    ctx.font = '700 13px Cinzel, serif'; ctx.fillStyle = '#ff6a5a';
    ctx.fillText(`ENDGAME ∞ ${fmtTime(G.time - G.endStart)} · Echo ${G.stats.echoes || 0} · ตัวถัดไป ${Math.max(0, Math.ceil(G.nextEcho - G.time))}s`, W / 2, G.bossRef && !G.bossRef.dead ? 134 : 92);
  }
  if (G.map.tier > 1 || G.map.biome !== 'graveyard' || G.map.mods.length) {
    ctx.fillStyle = BIOMES[G.map.biome].color; ctx.font = '600 12px Cinzel, Sarabun, serif';
    ctx.fillText(mapLabel(G.map) + (G.map.mods.length ? ` · ${G.map.mods.length} mods` : ''), W / 2, G.bossRef && !G.bossRef.dead ? 116 : 76);
  }

  // currency
  ctx.textAlign = 'right'; ctx.font = '600 14px Sarabun, sans-serif';
  ctx.fillStyle = PICKUPS.chaos.color; ctx.fillText('✪ Chaos ×' + P.currency.chaos, W - 12, 32);
  ctx.fillStyle = PICKUPS.fusing.color; ctx.fillText('◈ Fusing ×' + P.currency.fusing, W - 12, 50);
  ctx.fillStyle = P.newItems > 0 ? hexA('#ffe866', 0.7 + Math.sin(G.time * 6) * 0.3) : '#b8a888';
  ctx.fillText(`🎒 ${mobile ? 'แตะ' : 'I'} กระเป๋า (${P.backpack.length})`, W - 12, 68);
  const orbs = ['regal', 'exalt', 'divine', 'annul', 'jeweller', 'chroma', 'whetstone', 'scrap', 'vaal'].reduce((a, k) => a + (P.currency[k] || 0), 0);
  if (orbs > 0) { ctx.fillStyle = '#c8b8e8'; ctx.fillText(`Orb คราฟต์ ×${orbs}`, W - 12, 86); }
  const B = G.breach;
  let ly = G.bossRef && !G.bossRef.dead ? 134 : 96;
  if (B && B.state === 'open') {
    ctx.textAlign = 'center'; ctx.font = '700 16px Cinzel, serif'; ctx.fillStyle = '#d8a0ff';
    ctx.fillText(`BREACH ${Math.max(0, B.t).toFixed(1)}s · ☠ ${B.kills}`, W / 2, ly); ly += 20;
    ctx.textAlign = 'right'; ctx.font = '600 14px Sarabun, sans-serif';
  }
  drawLeagueHUD(ctx, W, H, ly);
  if (B && B.state === 'placed') {
    const dx = (B.x - G.cam.x) * G.zoom, dy = (B.y - G.cam.y) * G.zoom;
    if (Math.abs(dx) > W / 2 - 20 || Math.abs(dy) > H / 2 - 20) {
      const a = Math.atan2(dy, dx), m = Math.min((W / 2 - 34) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 34) / Math.abs(Math.sin(a) || 1e-6));
      ctx.save(); ctx.translate(W / 2 + Math.cos(a) * m, H / 2 + Math.sin(a) * m); ctx.rotate(a);
      ctx.fillStyle = '#c070ff'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  G.bagRect = { x: W - 150, y: 54, w: 150, h: 20 };
  // loot log (recent pickups)
  ctx.font = '700 13px Sarabun, sans-serif';
  G.lootLog.forEach((l, i) => {
    const a = clamp(4 - l.t, 0, 1);
    if (a <= 0) return;
    ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(l.text, W - 12, 106 + i * 17); ctx.fillStyle = l.color; ctx.fillText(l.text, W - 12, 106 + i * 17);
  });
  ctx.globalAlpha = 1;

  // boss bar
  const boss = G.bossRef && !G.bossRef.dead ? G.bossRef : null;
  if (boss) {
    const bw = Math.min(520, W - 40), bx = (W - bw) / 2, by = 72;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 16);
    ctx.fillStyle = boss.bossDef.glow; ctx.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 12);
    ctx.strokeStyle = '#c8a860'; ctx.strokeRect(bx - 2, by - 2, bw + 4, 16);
    ctx.textAlign = 'center'; ctx.font = '700 14px Cinzel, serif'; ctx.fillStyle = '#f8e8c0';
    ctx.fillText(boss.name, W / 2, by + 30);
  }

  // announcement
  if (G.announce) {
    const an = G.announce, a = an.t < 0.3 ? an.t / 0.3 : an.t > an.dur - 0.6 ? (an.dur - an.t) / 0.6 : 1;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = `700 ${mobile ? 22 : 30}px Cinzel, Sarabun, serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = '#000';
    ctx.strokeText(an.text, W / 2, H * 0.24); ctx.fillStyle = an.color; ctx.fillText(an.text, W / 2, H * 0.24);
    if (an.sub) {
      ctx.font = '600 16px Sarabun, sans-serif';
      ctx.strokeText(an.sub, W / 2, H * 0.24 + 26); ctx.fillStyle = '#e8e0d0'; ctx.fillText(an.sub, W / 2, H * 0.24 + 26);
    }
    ctx.globalAlpha = 1;
  }

  // life globe
  const gr = mobile ? 40 : 54, gx = gr + 16, gy = H - gr - 16;
  ctx.fillStyle = '#0a0606';
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(gx, gy, gr - 3, 0, TAU); ctx.clip();
  const lr = clamp(P.life / P.maxLife, 0, 1);
  const top = gy + gr - (gr * 2) * lr;
  const lg = ctx.createLinearGradient(0, gy - gr, 0, gy + gr);
  lg.addColorStop(0, '#ff4a3a'); lg.addColorStop(1, '#6a0808');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.moveTo(gx - gr, gy + gr);
  for (let i = 0; i <= 20; i++) { const xx = gx - gr + (i / 20) * gr * 2; ctx.lineTo(xx, top + Math.sin(G.time * 3 + i * 0.7) * 2.5); }
  ctx.lineTo(gx + gr, gy + gr); ctx.closePath(); ctx.fill();
  const sh = ctx.createRadialGradient(gx - gr * 0.35, gy - gr * 0.4, 2, gx, gy, gr);
  sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(0.4, 'rgba(255,255,255,0.03)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = sh; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  ctx.restore();
  ctx.strokeStyle = '#8a7040'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.stroke();
  ctx.textAlign = 'center'; ctx.font = '700 14px Sarabun, sans-serif';
  ctx.lineWidth = 3; ctx.strokeStyle = '#000';
  const lt = Math.ceil(P.life) + '/' + Math.round(P.maxLife);
  ctx.strokeText(lt, gx, gy + 5); ctx.fillStyle = '#fff'; ctx.fillText(lt, gx, gy + 5);
  // Energy Shield: blue ring around the life globe
  if (P.maxES > 0) {
    ctx.strokeStyle = 'rgba(40,60,120,0.6)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(gx, gy, gr + 5, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#7ab8ff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(gx, gy, gr + 5, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(P.es / P.maxES, 0, 1)); ctx.stroke();
    ctx.font = '700 11px Sarabun, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    const es = 'ES ' + Math.ceil(P.es);
    ctx.strokeText(es, gx, gy + 21); ctx.fillStyle = '#9fd0ff'; ctx.fillText(es, gx, gy + 21);
  }

  // flasks
  let fx0 = gx + gr + (P.maxES > 0 ? 20 : 14);
  G.flaskRects = [];
  for (let i = 0; i < FLASK_SLOTS; i++) {
    const f = P.flasks[i], fw = mobile ? 18 : 20, fh = mobile ? 44 : 56, fy = H - fh - 18;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(fx0, fy, fw, fh);
    G.flaskRects.push({ x: fx0, y: fy, w: fw, h: fh, i });
    if (f) {
      const st = flaskStats(f), ratio = clamp(f.charges / st.max, 0, 1);
      ctx.fillStyle = FLASK_COLOR[st.kind];
      ctx.globalAlpha = f.charges >= st.use ? 1 : 0.4;
      ctx.fillRect(fx0 + 2, fy + fh - 2 - (fh - 4) * ratio, fw - 4, (fh - 4) * ratio);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      for (let c = st.use; c < st.max; c += st.use) { const yy = fy + fh - 2 - (fh - 4) * (c / st.max); ctx.beginPath(); ctx.moveTo(fx0 + 2, yy); ctx.lineTo(fx0 + fw - 2, yy); ctx.stroke(); }
      if (f.active > 0) { ctx.fillStyle = 'rgba(255,246,192,0.25)'; ctx.fillRect(fx0, fy, fw, fh * clamp(f.active / st.dur, 0, 1)); }
    }
    ctx.strokeStyle = f && f.active > 0 ? '#fff6c0' : f && f.rarity === 'magic' ? '#6a6cc0' : '#8a7040'; ctx.lineWidth = f && f.active > 0 ? 3 : 2;
    ctx.strokeRect(fx0, fy, fw, fh);
    ctx.font = '700 11px Sarabun, sans-serif'; ctx.fillStyle = f ? '#e8d8a8' : '#5a4a30'; ctx.textAlign = 'center';
    ctx.fillText(i + 1, fx0 + fw / 2, fy - 4);
    fx0 += fw + 5;
  }
  fx0 += 4;
  // dash
  {
    const dr = 18, dx = fx0 + dr + 2, dy = H - 36;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.arc(dx, dy, dr, 0, TAU); ctx.fill();
    ctx.fillStyle = P.dashCd <= 0 ? '#ff8a3d' : '#5a3a20';
    ctx.beginPath(); ctx.moveTo(dx, dy); ctx.arc(dx, dy, dr - 3, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - clamp(P.dashCd / 3, 0, 1))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a7040'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dx, dy, dr, 0, TAU); ctx.stroke();
    ctx.font = '700 10px Sarabun, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(mobile ? 'Dash' : 'Space', dx, dy + 4);
  }

  // skill bar
  const n = P.skills.length, sz = mobile ? 34 : 44, gap = mobile ? 8 : 14;
  const totalW = n * sz + (n - 1) * gap;
  let sx = mobile ? W - totalW - 12 : (W - totalW) / 2;
  const sy = H - sz - (mobile ? 104 : 40);
  G.skillBarRect = { x: sx, y: sy, w: totalW, h: sz };
  for (const inst of P.skills) {
    ctx.fillStyle = '#100c08'; ctx.fillRect(sx, sy, sz, sz);
    ctx.drawImage(skillIcon(inst.id), sx + 1, sy + 1, sz - 2, sz - 2);
    const ready = inst.evo && inst.souls >= vaalSouls();
    if (inst.evo) {
      // Vaal: red frame, soul gauge filling up the left edge, pulse when ready
      ctx.fillStyle = 'rgba(160,0,0,0.25)'; ctx.fillRect(sx + 1, sy + 1, sz - 2, sz - 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 7, sy, 5, sz);
      ctx.fillStyle = ready ? '#ff4040' : '#a01818';
      const fh = sz * clamp(inst.souls / vaalSouls(), 0, 1);
      ctx.fillRect(sx - 7, sy + sz - fh, 5, fh);
    }
    ctx.strokeStyle = inst.vaalT > 0 ? '#ff6060' : ready ? hexA('#ff4040', 0.6 + Math.sin(G.time * 8) * 0.4) : inst.evo ? '#b02a2a' : '#8a7040';
    ctx.lineWidth = ready || inst.vaalT > 0 ? 3 : 2; ctx.strokeRect(sx, sy, sz, sz);
    if (ready) {
      ctx.font = '700 12px Cinzel, serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
      const lbl = mobile ? 'VAAL' : 'V';
      ctx.strokeText(lbl, sx + sz / 2, sy - 6); ctx.fillStyle = '#ff6060'; ctx.fillText(lbl, sx + sz / 2, sy - 6);
    }
    // cooldown
    if (inst.st.behavior !== 'aura' && inst.timer > 0 && inst.st.cdFinal > 0.3) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.moveTo(sx + sz / 2, sy + sz / 2);
      ctx.arc(sx + sz / 2, sy + sz / 2, sz / 2, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(inst.timer / inst.st.cdFinal, 0, 1));
      ctx.closePath(); ctx.fill();
    }
    ctx.font = '700 11px Sarabun, sans-serif'; ctx.textAlign = 'right';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(inst.level, sx + sz, sy + sz); ctx.fillStyle = '#fff'; ctx.fillText(inst.level, sx + sz, sy + sz);
    // sockets
    const ss = mobile ? 4 : 5, total = skillSockets(inst).cap;
    const rowW = total * ss * 2 + (total - 1) * 3;
    let ox = sx + sz / 2 - rowW / 2 + ss;
    const oy = sy + sz + ss + 4;
    ctx.strokeStyle = '#c8a860'; ctx.lineWidth = 2;
    if (total > 1) { ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + (total - 1) * (ss * 2 + 3), oy); ctx.stroke(); }
    for (let i = 0; i < total; i++) {
      const sup = activeSupports(inst).active[i];
      ctx.fillStyle = sup ? GEM_COLOR[SUPPORTS[sup].gem] : '#1a1612';
      const awk = sup && inst.awakened.includes(sup);
      ctx.strokeStyle = awk ? '#fff0a0' : '#6a5a3a'; ctx.lineWidth = awk ? 2 : 1;
      ctx.beginPath(); ctx.arc(ox, oy, ss, 0, TAU); ctx.fill(); ctx.stroke();
      ox += ss * 2 + 3;
    }
    sx += sz + gap;
  }

  // buffs
  let bxp = mobile ? 12 : W / 2 - 120, byp = mobile ? 80 : sy - 26;
  ctx.textAlign = 'left'; ctx.font = '600 12px Sarabun, sans-serif';
  for (const k in G.buffs) {
    if (G.buffs[k] <= 0) continue;
    const def = SHRINES[k];
    ctx.fillStyle = def.color;
    ctx.fillText(def.name.replace(' Shrine', '') + ' ' + Math.ceil(G.buffs[k]) + 's', bxp, byp);
    bxp += ctx.measureText(def.name).width - 10;
  }

  // shrine arrows (offscreen)
  for (const s of G.shrines) {
    const dx = (s.x - G.cam.x) * G.zoom, dy = (s.y - G.cam.y) * G.zoom;
    if (Math.abs(dx) < W / 2 - 20 && Math.abs(dy) < H / 2 - 20) continue;
    const a = Math.atan2(dy, dx), m = Math.min((W / 2 - 30) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 30) / Math.abs(Math.sin(a) || 1e-6));
    const ax = W / 2 + Math.cos(a) * m, ay = H / 2 + Math.sin(a) * m;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
    ctx.fillStyle = SHRINES[s.kind].color;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // touch joystick
  if (G.input.joyOrigin) {
    const o = G.input.joyOrigin, j = G.input.joy || { x: 0, y: 0 };
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(o.x, o.y, 50, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(o.x + j.x * 50, o.y + j.y * 50, 20, 0, TAU); ctx.fill();
  }
}
