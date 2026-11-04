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
  syncFlickerButton();
  if (!_bgPattern) makeBackground(ctx);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0d0b09';
  ctx.fillRect(0, 0, W, H);
  if (!P) return;

  const z = G.zoom;
  const shk = G.settings.shake === false ? 0 : G.shake;
  const st = performance.now() / 16;
  const sx = shk > 0 ? shk * (Math.sin(st * 1.7) * 0.6 + Math.sin(st * 3.1 + 1.3) * 0.4) : 0;
  const sy = shk > 0 ? shk * (Math.sin(st * 2.3 + 0.7) * 0.6 + Math.sin(st * 2.9 + 2.1) * 0.4) : 0;
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
  drawArenaEdge(ctx, vx0, vy0, vx1, vy1);

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
  drawBuildcraft(ctx);
  drawReactions(ctx);
  drawArchetypes(ctx);
  ctx.imageSmoothingEnabled = true;

  // Ballista totems and Mirage Archers
  for (const inst of P.skills) {
    for (const t of inst.rt.totems || []) {
      ctx.drawImage(shadowSprite(), t.x - 12, t.y + 6, 24, 8);
      ctx.fillStyle = '#5a4a30'; ctx.fillRect(t.x - 7, t.y - 6, 14, 14);
      ctx.strokeStyle = '#c8a870'; ctx.lineWidth = 2; ctx.strokeRect(t.x - 7, t.y - 6, 14, 14);
      ctx.strokeStyle = inst.st.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(t.x, t.y - 10, 9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y + 1, 15, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(t.t / inst.st.totemDur, 0, 1)); ctx.stroke();
    }
    const m = inst.rt.mirage;
    if (m) {
      ctx.globalAlpha = 0.45 * clamp(m.t / 0.5, 0, 1); ctx.imageSmoothingEnabled = false;
      drawSprite(ctx, 'cls_' + P.cls.id, 0, m.flip, '', 'white', m.x, m.y + 14, 2);
      ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
    }
  }
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
    } else ctx.drawImage(orbIcon(def.color, def.icon), it.x - 12, it.y - 12 + bob, 24, 24);
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
  drawBowEntities(ctx, inView);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.projectiles) {
    if (!inView(p.x, p.y, 30)) continue;
    const s = p.s;
    const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp;
    if (s.arrow) {
      const L = p.r * 3.4, T = Math.min(p.r * 9, sp * 0.05);
      ctx.strokeStyle = hexA(s.color, 0.25); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x - ux * (L + T), p.y - uy * (L + T)); ctx.lineTo(p.x - ux * L, p.y - uy * L); ctx.stroke();
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(p.x - ux * L, p.y - uy * L); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.drawImage(glowSprite(s.color, p.r * 2.2), p.x - p.r * 2.2, p.y - p.r * 2.2);
    } else {
      // tapered tail along the flight path, then the glowing head
      const T = Math.min(p.r * 5, sp * 0.045);
      ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(s.color, 0.3); ctx.lineWidth = p.r * 1.6;
      ctx.beginPath(); ctx.moveTo(p.x - ux * T, p.y - uy * T); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = hexA(s.core || '#ffffff', 0.35); ctx.lineWidth = p.r * 0.6;
      ctx.beginPath(); ctx.moveTo(p.x - ux * T * 0.6, p.y - uy * T * 0.6); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.lineCap = 'butt';
      const gr = p.r * 3;
      ctx.drawImage(glowSprite(s.color, gr), p.x - gr, p.y - gr);
      ctx.fillStyle = s.core;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, TAU); ctx.fill();
    }
  }
  drawSkillExtras(ctx, P);
  // novas
  for (const n of G.novas) {
    const k = clamp(n.r / (n.maxR || 1), 0, 1), na = 1 - k * 0.75;
    ctx.fillStyle = hexA(n.s.color, 0.1 * (1 - k));
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(n.s.color, 0.7 * na); ctx.lineWidth = 16 * (1 - k * 0.55);
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = hexA('#ffffff', 0.75 * na); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke();
  }
  // meteors falling
  for (const m of G.meteors) {
    if (m.d0 === undefined) m.d0 = m.delay;
    if (m.delay > m.fall) {
      const k = clamp(1 - (m.delay - m.fall) / Math.max(0.01, m.d0 - m.fall), 0, 1);
      ctx.strokeStyle = hexA(m.s.color, 0.3 + 0.3 * k); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = hexA(m.s.color, 0.06 + 0.12 * k);
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * k, 0, TAU); ctx.fill();
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
    const a = 1 - t.t / t.dur, pop = t.t < 0.12 ? 1 + (1 - t.t / 0.12) * 0.45 : 1;
    ctx.globalAlpha = Math.min(1, a * 2);
    ctx.font = `700 ${Math.round(14 * t.scale * pop)}px Sarabun, sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(t.str, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // vignettes (cached per screen size)
  ctx.drawImage(vignette(W, H, '0,0,0', 0.55, 0.35), 0, 0, W, H);
  const lowLife = P.life < P.maxLife * 0.3 ? 0.75 + Math.sin(G.time * 6) * 0.2 : 0;
  const red = Math.max(lowLife, Math.min(1, P.hurtFlash * 3.5));
  if (red > 0) { ctx.globalAlpha = red; ctx.drawImage(vignette(W, H, '150,0,0', 0.5, 0.25), 0, 0, W, H); ctx.globalAlpha = 1; }
  if (P.hurtFlash > 0) { ctx.fillStyle = `rgba(160,0,0,${P.hurtFlash * 0.35})`; ctx.fillRect(0, 0, W, H); }

  drawDeliriumFog(ctx, W, H);
  drawHUD(ctx, W, H, P);
}

const _vigCache = new Map();
function vignette(W, H, rgb, alpha, inner) {
  const key = W + 'x' + H + rgb + alpha + inner;
  let c = _vigCache.get(key);
  if (c) return c;
  if (_vigCache.size > 8) _vigCache.clear();
  c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W / 2)); c.height = Math.max(1, Math.round(H / 2));
  const g = c.getContext('2d');
  if (g && g.createRadialGradient) {
    const w = c.width, h = c.height, vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * inner, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, `rgba(${rgb},0)`); vg.addColorStop(1, `rgba(${rgb},${alpha})`);
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }
  _vigCache.set(key, c);
  return c;
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
  const px = boss ? (e.r * 2.3) / 24 : def.px * (e.r / MONSTERS[e.type].r) * (MONSTERS[e.type].scale || 1);
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
  if (e.guardT > G.time) {
    ctx.strokeStyle = hexA('#7ab8ff', 0.55 + Math.sin(G.time * 8 + e.id) * 0.2); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, TAU); ctx.stroke();
  }
  if (e.chS === 'wind') {
    ctx.fillStyle = 'rgba(255,140,90,0.9)'; ctx.font = '700 16px Sarabun, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('!', x, top - 4);
  }
  if (e.buffT > G.time) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
    ctx.drawImage(glowSprite('#c060ff', r * 1.3), x - r * 1.3, y - r * 1.3);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  // ---- deep-tier monster overlays ----
  if (e.carapaceMax) {
    // the shell: a full arc when intact, cracking away as hits eat it
    const k = e.carapaceHp / e.carapaceMax;
    ctx.strokeStyle = hexA('#8ab89a', 0.5 + 0.4 * k); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r * 1.18, -Math.PI * 0.85, -Math.PI * 0.85 + TAU * (0.25 + 0.75 * k)); ctx.stroke();
    if (k < 1) { ctx.strokeStyle = hexA('#24402c', 0.85); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * 1.18, -Math.PI * 0.85 + TAU * (0.25 + 0.75 * k) + 0.15, -Math.PI * 0.85 + TAU * 0.98); ctx.stroke(); }
  }
  if ((e.enrageStack || 0) > 0 && (e.enrageUntil || 0) > G.time) {
    const heat = Math.min(1, (e.enrageMul || 1) - 1);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.35 * heat;
    ctx.drawImage(glowSprite('#ff5a2a', r * 1.4), x - r * 1.4, y - r * 1.4);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (mech(e, 'vortex')) {
    // the well: a slowly rotating spiral ring at pull range
    const V = mech(e, 'vortex');
    ctx.strokeStyle = hexA('#b060ff', 0.25 + 0.12 * Math.sin(G.time * 4 + e.id)); ctx.lineWidth = 1.5;
    ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.arc(x, y, V.r, G.time * 0.7 + e.id, G.time * 0.7 + e.id + TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (mech(e, 'drain') && (e.drGlow || 0) > G.time - 0.4) {
    ctx.strokeStyle = hexA('#c0a0ff', 0.6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, (mech(e, 'drain')).r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = hexA('#e0d0ff', 0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, (mech(e, 'drain')).r * 0.94, 0, TAU); ctx.stroke();
  }
  if (e.unstoppable && !e.bossDef) {
    ctx.strokeStyle = hexA('#c8d0da', 0.5 + Math.sin(G.time * 6 + e.id) * 0.15); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r * 1.3, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 1.3, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
  }
  if (e.curse && e.curse.t > G.time) {
    ctx.strokeStyle = e.curse.type === 'ele' ? '#c8a0ff' : e.curse.type === 'vuln' ? '#ff6a5a' : '#9a5aff';
    ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r * 1.1, r * 0.4, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (e.bleeds.length) {
    ctx.fillStyle = 'rgba(210,30,30,0.85)';
    for (let i = 0; i < Math.min(3, e.bleeds.length); i++) {
      const ph = (G.time * 1.6 + i * 0.37 + e.id * 0.13) % 1;
      ctx.beginPath(); ctx.arc(x + (i - 1) * r * 0.5, y - r * 0.2 + ph * r * 1.2, 2.2, 0, TAU); ctx.fill();
    }
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
  drawCosmeticAura(ctx, P);
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

// ---- minimap: the whole arena; the HUD picks where it goes ----
function drawMinimap(ctx, P, x0, y0, S) {
  if (!G.settings.minimap) { G.minimapRect = null; return; }
  const k = S / (ARENA * 2);
  const mx = (x) => x0 + (x + ARENA) * k, my = (y) => y0 + (y + ARENA) * k;
  // forged frame: dark gap ring, then a thin bronze line
  ctx.fillStyle = HUD.line2; ctx.fillRect(x0 - 4, y0 - 4, S + 8, S + 8);
  ctx.fillStyle = HUD.screen; ctx.fillRect(x0 - 3, y0 - 3, S + 6, S + 6);
  ctx.fillStyle = 'rgba(6,10,8,0.85)'; ctx.fillRect(x0, y0, S, S);
  ctx.strokeStyle = HUD.frame; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, S - 1, S - 1);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, S, S); ctx.clip();
  // what's on screen
  const hw = G.W / 2 / G.zoom, hh = G.H / 2 / G.zoom;
  ctx.strokeStyle = 'rgba(255,240,200,0.22)'; ctx.lineWidth = 1;
  ctx.strokeRect(mx(G.cam.x - hw), my(G.cam.y - hh), hw * 2 * k, hh * 2 * k);
  const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(mx(x), my(y), r / 2, 0, TAU); ctx.fill(); };
  for (const e of G.enemies) {
    if (e.dead || e.rarity === 3) continue;
    if (e.rarity === 2) dot(e.x, e.y, 4, '#ffd84a'); else if (e.rarity === 1) dot(e.x, e.y, 3, '#8a8cff'); else dot(e.x, e.y, 2, 'rgba(224,65,58,0.85)');
  }
  for (const g of G.items) if (g.item.rarity === 'unique' || g.item.rarity === 'rare') dot(g.x, g.y, 4, RARITY_COLOR[g.item.rarity]);
  for (const s of G.shrines) dot(s.x, s.y, 5, SHRINES[s.kind].color);
  // league content as rings so it stands out
  const ring = (x, y, c) => { ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx(x), my(y), 5, 0, TAU); ctx.stroke(); };
  const B = G.breach; if (B && (B.state === 'placed' || B.state === 'open')) ring(B.x, B.y, '#c070ff');
  const L = G.league;
  if (L) {
    for (const b of L.boxes) if (b.state === 'closed') ring(b.x, b.y, STRONGBOXES[b.kind].color);
    for (const R of L.rituals) if (R.state === 'placed' || R.state === 'active') ring(R.x, R.y, '#ff5a5a');
    if (L.deli.state === 'placed') ring(L.deli.x, L.deli.y, '#e8eef8');
    for (const e of G.enemies) if (e.encased && !e.dead) ring(e.x, e.y, ESSENCES[e.essence].color);
  }
  const boss = G.bossRef && !G.bossRef.dead ? G.bossRef : null;
  if (boss) { dot(boss.x, boss.y, 8, boss.bossDef.glow); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(mx(boss.x) - 4.5, my(boss.y) - 4.5, 9, 9); }
  // the player: white diamond with a facing tick
  const px = mx(P.x), py = my(P.y);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(P.facing) * 9, py + Math.sin(P.facing) * 9); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(px, py - 5); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 5); ctx.lineTo(px - 5, py); ctx.closePath(); ctx.fill();
  ctx.restore();
  // area name, top-left
  const name = BIOMES[G.map.biome].name.toLowerCase();
  let fs = S < 120 ? 10 : 12;
  ctx.textAlign = 'left'; ctx.font = `600 ${fs}px Cinzel, Sarabun, serif`;
  while (fs > 7 && ctx.measureText(name).width > S - 14) { fs--; ctx.font = `600 ${fs}px Cinzel, Sarabun, serif`; }
  ctx.fillStyle = HUD.faint; ctx.fillText(name, x0 + 7, y0 + (S < 120 ? 14 : 18));
  G.minimapRect = { x: x0, y: y0, w: S, h: S };
}

// outside the map: near-black ground and a wall line along the border
function drawArenaEdge(ctx, vx0, vy0, vx1, vy1) {
  const A = ARENA;
  if (vx0 > -A && vx1 < A && vy0 > -A && vy1 < A) return;
  ctx.fillStyle = 'rgba(5,4,3,0.94)';
  if (vx0 < -A) ctx.fillRect(vx0, vy0, -A - vx0, vy1 - vy0);
  if (vx1 > A) ctx.fillRect(A, vy0, vx1 - A, vy1 - vy0);
  const x0 = Math.max(vx0, -A), x1 = Math.min(vx1, A);
  if (vy0 < -A) ctx.fillRect(x0, vy0, x1 - x0, -A - vy0);
  if (vy1 > A) ctx.fillRect(x0, A, x1 - x0, vy1 - A);
  ctx.strokeStyle = '#4a3a26'; ctx.lineWidth = 14; ctx.strokeRect(-A - 7, -A - 7, A * 2 + 14, A * 2 + 14);
  ctx.strokeStyle = 'rgba(200,160,90,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(-A, -A, A * 2, A * 2);
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
  if (h.mine) {
    // proximity mine: a thin ring at its trigger radius and a softly pulsing core, no filled disc.
    // Mines close to the player stand out as a warning, far ones fade; all fade out before they fizzle.
    const P = G.player, rr = h.r * 0.9, edge = Math.hypot(P.x - h.x, P.y - h.y) - rr;
    const near = clamp(1 - (edge - 40) / 260, 0.3, 1), fade = clamp((MINE_LIFE - h.t) / MINE_FADE, 0, 1);
    const armed = h.t >= h.arm, close = armed && edge < 60, pulse = 0.5 + 0.5 * Math.sin(G.time * 4 + h.x);
    const col = armed ? '#ff4a3a' : h.color;
    ctx.save(); ctx.globalAlpha *= fade * near;
    if (close) { ctx.fillStyle = hexA(col, 0.08 + 0.08 * pulse); ctx.beginPath(); ctx.arc(h.x, h.y, rr, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = hexA(col, armed ? 0.75 : 0.4); ctx.lineWidth = close ? 2 : 1.2;
    if (!armed) ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(h.x, h.y, rr, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = hexA(armed ? col : '#ffd84a', 0.55 + 0.35 * pulse);
    ctx.beginPath(); ctx.arc(h.x, h.y, armed ? 3.5 + 1.5 * pulse : 3, 0, TAU); ctx.fill();
    ctx.restore();
    return;
  }
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
    case 'afterimage': {
      // The real player has left this position; only a brief trail remains.
      ctx.globalAlpha = 0.75 * a; ctx.imageSmoothingEnabled = false;
      drawSprite(ctx, 'cls_' + G.player.cls.id, 1, fx.flip, '', 'white', fx.x, fx.y + 14, 2);
      ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
      break;
    }
    case 'boom': {
      const r = fx.r * (0.5 + 0.5 * Math.min(1, p * 3));
      ctx.fillStyle = hexA(fx.color, 0.45 * a);
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = hexA(fx.color, 0.8 * a); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, TAU); ctx.stroke();
      if (p < 0.25) { ctx.fillStyle = hexA('#ffffff', 0.45 * (1 - p / 0.25)); ctx.beginPath(); ctx.arc(fx.x, fx.y, r * 0.5, 0, TAU); ctx.fill(); }
      break;
    }
    case 'ring': {
      const e = 1 - (1 - p) ** 3;
      ctx.strokeStyle = hexA(fx.color, 0.7 * a); ctx.lineWidth = 5 * (1 - p * 0.6);
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.8 + 0.25 * e), 0, TAU); ctx.stroke();
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
    case 'slash': {
      const x1 = fx.x + Math.cos(fx.a) * fx.r, y1 = fx.y + Math.sin(fx.a) * fx.r;
      ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(fx.color, 0.35 * a); ctx.lineWidth = fx.w * 2 * (1 - p * 0.5);
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = hexA('#ffffff', 0.8 * a); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.lineCap = 'butt';
      break;
    }
    case 'cone': {
      const r = fx.r * (0.4 + p * 0.6);
      ctx.fillStyle = hexA(fx.color, 0.3 * a);
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.arc(fx.x, fx.y, r, fx.a - fx.arc / 2, fx.a + fx.arc / 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hexA(fx.color, 0.85 * a); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, fx.a - fx.arc / 2, fx.a + fx.arc / 2); ctx.stroke();
      break;
    }
    case 'bolt': {
      // one jagged path per frame, stroked as glow → colour → white core so the layers line up
      const path = [];
      for (let i = 0; i < fx.pts.length - 1; i++) {
        const [x0, y0] = fx.pts[i], [x1, y1] = fx.pts[i + 1];
        if (!i) path.push([x0, y0]);
        for (let k = 1; k <= 5; k++) { const t = k / 5, j = k === 5 ? 0 : 12; path.push([lerp(x0, x1, t) + rand(-j, j), lerp(y0, y1, t) + rand(-j, j)]); }
      }
      for (const [w, col, al] of [[9, fx.color, 0.25], [3, fx.color, 1], [1.2, '#ffffff', 1]]) {
        ctx.strokeStyle = hexA(col, al * a); ctx.lineWidth = w;
        ctx.beginPath(); path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
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
  if (P.onslaughtT > G.time) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glowSprite('#ffb040', 34), P.x - 34, P.y - 34);
    ctx.globalCompositeOperation = 'source-over';
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
      if (inst.id === 'lightning_tendrils') { drawTendrils(ctx, inst, s); continue; }
      const a = inst.rt.beamA, L = s.range, w = s.size * Math.sqrt((1 + s.areaInc) * s.areaMore) * (1 + (inst.rt.incStages || 0) * 0.07);
      const x1 = P.x + Math.cos(a) * L, y1 = P.y + Math.sin(a) * L;
      ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(s.color, 0.35 + Math.sin(G.time * 40) * 0.08); ctx.lineWidth = w * 2;
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = hexA(s.core, inst.rt.strongFlash > G.time ? 1 : 0.8); ctx.lineWidth = w * (inst.rt.strongFlash > G.time ? 0.85 : 0.5);
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.lineCap = 'butt';
      if (Math.random() < 0.5) emit('ember', x1 + rand(-10, 10), y1 + rand(-10, 10), 1);
      addLight((P.x + x1) / 2, (P.y + y1) / 2, L * 0.7, 0.5);
    }
  }
}

// ---------------- HUD ----------------
function syncFlickerButton() {
  const b = $('btn-flicker'), P = G.player;
  const visible = G.state === 'play' && P && P.skills.some((i) => i.st && i.st.behavior === 'flicker');
  b.hidden = !visible;
  if (!visible) return;
  const state = P.flickerPaused ? 'พัก' : flickerMovementIntent() ? 'รอหยุดเดิน' : P.flickerIdle < 0.3 ? 'เตรียมวาร์ป' : 'เปิด';
  const label = `Flicker: ${state} · T`;
  if (b.textContent !== label) b.textContent = label;
  b.setAttribute('aria-pressed', String(!P.flickerPaused));
  b.title = P.flickerPaused ? 'เปิด Flicker (T)' : 'พัก Flicker (T) · กดเดินเพื่อหยุดวาร์ปทันที';
}
// Forged HUD palette (same tokens as css/style.css :root)
const HUD = { screen: '#0b0908', void: '#050404', frame: '#5a4a36', line: '#3a2e1e', line2: '#3a3022', gold: '#c8a860', goldHi: '#f0d890',
  cream: '#e8dcc0', time: '#f0e0b0', muted: '#b8a888', faint: '#8a7f6c', lvlup: '#ffd84a', es: '#7ab8ff', esText: '#9fd0ff', boss: '#d8622a' };
const RARITY_FRAME = { normal: '#6a6a6a', magic: '#5a5cc0', rare: '#b8a030', unique: '#c06a2a' };

function hudSpacing(ctx, px) { ctx.letterSpacing = px + 'px'; }
// one line made of differently coloured parts: [[text, colour], ...]
function hudRun(ctx, parts, x, y, align) {
  const ws = parts.map(([t]) => ctx.measureText(t).width), total = ws.reduce((a, w) => a + w, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  parts.forEach(([t, c], i) => { ctx.fillStyle = c; ctx.fillText(t, cx, y); cx += ws[i]; });
  return total;
}
// text with a dark halo so it reads over the game
function hudText(ctx, t, x, y, color, halo) {
  ctx.lineWidth = halo || 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(t, x, y);
  ctx.fillStyle = color; ctx.fillText(t, x, y);
}
// flask silhouette: rounded shoulders, nearly square base
function flaskPath(ctx, x, y, w, h) {
  const rt = Math.min(10, w / 2), rb = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + rt); ctx.arcTo(x, y, x + rt, y, rt); ctx.lineTo(x + w - rt, y); ctx.arcTo(x + w, y, x + w, y + rt, rt);
  ctx.lineTo(x + w, y + h - rb); ctx.arcTo(x + w, y + h, x + w - rb, y + h, rb); ctx.lineTo(x + rb, y + h); ctx.arcTo(x, y + h, x, y + h - rb, rb);
  ctx.closePath();
}
function diamondPath(ctx, cx, cy, half) {
  ctx.beginPath(); ctx.moveTo(cx, cy - half); ctx.lineTo(cx + half, cy); ctx.lineTo(cx, cy + half); ctx.lineTo(cx - half, cy); ctx.closePath();
}

// left column: shrine buffs, Rage and Second Wind as underlined coloured words
function hudBuffs(P) {
  const out = [];
  for (const k in G.buffs) if (G.buffs[k] > 0) out.push([SHRINES[k].name.replace(' Shrine', '') + ' ' + Math.ceil(G.buffs[k]) + 's', SHRINES[k].color]);
  if (P.mods.ks.rage) out.push(['Rage ' + Math.floor(P.rage), P.rage > 0 ? '#ff7a6a' : '#7a4a40']);
  if (P.revives > 0) out.push(['✟ Second Wind', '#fff0c0']);
  return out;
}
function drawBuffRow(ctx, list, x, y, size) {
  ctx.font = `600 ${size}px Sarabun, sans-serif`; ctx.textAlign = 'left';
  for (const [t, c] of list) {
    const w = ctx.measureText(t).width;
    hudText(ctx, t, x, y, c, 2);
    ctx.fillStyle = c; ctx.fillRect(x, y + 4, w, 1);
    x += w + 14;
  }
}
// "pick a card" call-out; also the tap target for banked level-ups
function drawCardButton(ctx, x, y, mobile, waiting) {
  const txt = mobile ? `⬆ แตะเลือกการ์ด ×${waiting}` : `⬆ เลือกการ์ด ×${waiting} · U`;
  ctx.font = `700 ${mobile ? 13 : 14}px Sarabun, sans-serif`;
  const padX = 12, h = mobile ? 44 : 28, w = ctx.measureText(txt).width + padX * 2;
  ctx.fillStyle = 'rgba(40,30,8,0.85)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = hexA(HUD.lvlup, 0.65 + Math.sin(G.time * 6) * 0.35); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffe9a0'; ctx.fillText(txt, x + padX, y + h / 2 + 5);
  G.lvlRect = { x, y, w, h };
}
// boss name, phase counter and a bar with ticks at the real phase thresholds
function drawBossBar(ctx, boss, x, y, w, mobile) {
  const def = boss.bossDef, phases = def.phases || [];
  ctx.textAlign = 'left'; ctx.font = `700 ${mobile ? 15 : 18}px Cinzel, Sarabun, serif`;
  hudSpacing(ctx, mobile ? 1 : 2); hudText(ctx, boss.name, x, y, '#f8e8c0'); hudSpacing(ctx, 0);
  if (phases.length) {
    ctx.textAlign = 'right'; ctx.font = '600 12px Sarabun, sans-serif';
    hudText(ctx, `เฟส ${phases.length - boss.phases.length + 1} / ${phases.length + 1}`, x + w, y, HUD.faint, 2);
  }
  const by = y + (mobile ? 6 : 8), bh = mobile ? 6 : 8;
  ctx.fillStyle = HUD.void; ctx.fillRect(x, by, w, bh);
  ctx.fillStyle = boss.immuneT > 0 ? '#f0b080' : HUD.boss; ctx.fillRect(x, by, w * clamp(boss.hp / boss.maxHp, 0, 1), bh);
  ctx.strokeStyle = HUD.frame; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, by - 0.5, w + 1, bh + 1);
  ctx.fillStyle = HUD.goldHi;
  for (const t of phases) ctx.fillRect(Math.round(x + w * t), by - 3, 1, bh + 6);
  return by + bh;
}
// life globe with the Energy Shield as a thin ring outside it
function drawLifeGlobe(ctx, P, cx, cy, r, mobile) {
  // ring: dark gap then a bronze line (box-shadow 0 0 0 3px bg, 0 0 0 4px frame)
  ctx.fillStyle = HUD.frame; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, TAU); ctx.fill();
  ctx.fillStyle = HUD.screen; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0a0505'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const lr = clamp(P.life / P.maxLife, 0, 1), top = cy + r - r * 2 * lr;
  const lg = ctx.createLinearGradient(0, top, 0, cy + r);
  lg.addColorStop(0, '#e0402e'); lg.addColorStop(0.6, '#7a0c0c'); lg.addColorStop(1, '#2a0404');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.moveTo(cx - r, cy + r);
  for (let i = 0; i <= 16; i++) ctx.lineTo(cx - r + (i / 16) * r * 2, top + Math.sin(G.time * 3 + i * 0.8) * 1.5);
  ctx.lineTo(cx + r, cy + r); ctx.closePath(); ctx.fill();
  const sh = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.44, 0, cx - r * 0.32, cy - r * 0.44, r * 2);
  sh.addColorStop(0, 'rgba(255,255,255,0.28)'); sh.addColorStop(0.34, 'rgba(255,255,255,0)'); sh.addColorStop(0.92, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = sh; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = HUD.gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r + 0.5, 0, TAU); ctx.stroke();
  const es = P.maxES > 0;
  if (es) {
    const er = r + 7;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(60,80,120,0.3)'; ctx.beginPath(); ctx.arc(cx, cy, er, 0, TAU); ctx.stroke();
    ctx.strokeStyle = HUD.es; ctx.beginPath(); ctx.arc(cx, cy, er, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(P.es / P.maxES, 0, 1)); ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.font = `700 ${mobile ? 14 : 17}px Sarabun, sans-serif`;
  const ty = es ? cy + 2 : cy + 6;
  hudText(ctx, Math.ceil(P.life) + ' / ' + Math.round(P.maxLife), cx, ty, '#fff');
  if (es) { ctx.font = `700 ${mobile ? 11 : 12}px Sarabun, sans-serif`; hudText(ctx, 'ES ' + Math.ceil(P.es), cx, ty + 16, HUD.esText); }
}
// five flasks: frame by rarity, fill = charges, dim when a use isn't ready
function drawFlasks(ctx, P, x, y, fw, fh, gap, mobile) {
  G.flaskRects = [];
  for (let i = 0; i < FLASK_SLOTS; i++) {
    const f = P.flasks[i], fx = x + i * (fw + gap);
    G.flaskRects.push({ x: fx, y, w: fw, h: fh, i });
    flaskPath(ctx, fx, y, fw, fh); ctx.fillStyle = HUD.void; ctx.fill();
    if (f) {
      const st = flaskStats(f), ratio = clamp(f.charges / st.max, 0, 1);
      ctx.save(); flaskPath(ctx, fx, y, fw, fh); ctx.clip();
      ctx.globalAlpha = f.charges >= st.use ? 1 : 0.45;
      ctx.fillStyle = FLASK_COLOR[st.kind]; ctx.fillRect(fx, y + fh - fh * ratio, fw, fh * ratio);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (let c = st.use; c < st.max; c += st.use) ctx.fillRect(fx, Math.round(y + fh - fh * (c / st.max)), fw, 1);
      if (f.active > 0) { ctx.fillStyle = 'rgba(255,246,192,0.22)'; ctx.fillRect(fx, y, fw, fh * clamp(f.active / st.dur, 0, 1)); }
      ctx.restore();
    }
    flaskPath(ctx, fx + 0.5, y + 0.5, fw - 1, fh - 1);
    ctx.strokeStyle = f && f.active > 0 ? '#fff6c0' : f ? RARITY_FRAME[f.rarity] : '#3a2e1c'; ctx.lineWidth = f && f.active > 0 ? 2 : 1; ctx.stroke();
    ctx.textAlign = 'center';
    if (mobile) { ctx.font = '700 10px Sarabun, sans-serif'; hudText(ctx, String(i + 1), fx + fw / 2, y + 13, HUD.cream, 2); }
    else { ctx.font = '600 12px Cinzel, serif'; ctx.fillStyle = f ? HUD.faint : '#4a4034'; ctx.fillText(String(i + 1), fx + fw / 2, y + fh + 16); }
  }
}
// Flame Dash: ember disc that refills clockwise
function drawDash(ctx, P, cx, cy, r, mobile) {
  const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.3, 0, cx, cy, r);
  g.addColorStop(0, '#f09a5a'); g.addColorStop(1, '#7a300c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  const cd = clamp(P.dashCd / 3, 0, 1);
  if (cd > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, -Math.PI / 2 + TAU * (1 - cd), -Math.PI / 2 + TAU); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = HUD.gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r + 0.5, 0, TAU); ctx.stroke();
  ctx.textAlign = 'center'; ctx.font = `700 ${mobile ? 11 : 10}px Sarabun, sans-serif`;
  hudText(ctx, 'DASH', cx, cy + 4, '#fff', 2);
  if (!mobile) { ctx.font = '600 12px Cinzel, serif'; ctx.fillStyle = HUD.faint; ctx.fillText('space', cx, cy + r + 18); }
  G.dashRect = mobile ? { x: cx - r - 6, y: cy - r - 6, w: r * 2 + 12, h: r * 2 + 12 } : null;
}
// one skill: a diamond socket with the gem art in a round window
function drawSkillSlot(ctx, inst, cx, cy, size, mobile) {
  const half = size / Math.SQRT2, gr = size / 2 - (mobile ? 6 : 8);
  const ready = inst.evo && inst.souls >= vaalSouls();
  diamondPath(ctx, cx, cy, half); ctx.fillStyle = '#0a0908'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, gr, 0, TAU); ctx.clip();
  ctx.drawImage(skillIcon(inst.id), cx - gr * 1.25, cy - gr * 1.25, gr * 2.5, gr * 2.5);
  const shade = ctx.createRadialGradient(cx - gr * 0.3, cy - gr * 0.4, 0, cx, cy, gr);
  shade.addColorStop(0, 'rgba(255,255,255,0.22)'); shade.addColorStop(0.45, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = shade; ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
  if (inst.st.disabled) { ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2); }
  else if (inst.st.behavior !== 'aura' && inst.timer > 0 && inst.st.cdFinal > 0.3) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, gr, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(inst.timer / inst.st.cdFinal, 0, 1)); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#2a2014'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, gr, 0, TAU); ctx.stroke();
  // Vaal: soul gauge around the gem, red frame that pulses when ready
  if (inst.evo) {
    ctx.strokeStyle = ready ? '#ff4040' : '#a01818'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, gr + 2, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(inst.souls / vaalSouls(), 0, 1)); ctx.stroke();
  }
  if (inst.st.disabled) {
    ctx.strokeStyle = '#e04040'; ctx.lineWidth = 2.5; const d = gr * 0.55;
    ctx.beginPath(); ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d); ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d); ctx.stroke();
  }
  diamondPath(ctx, cx, cy, half - 0.5);
  ctx.strokeStyle = inst.vaalT > 0 ? '#ff6060' : ready ? hexA('#ff4040', 0.6 + Math.sin(G.time * 8) * 0.4) : inst.evo ? '#c02828' : '#8a6a3a';
  ctx.lineWidth = ready || inst.vaalT > 0 ? 2 : 1; ctx.stroke();
  if (ready) {
    ctx.font = '700 13px Cinzel, serif';
    if (mobile) { ctx.textAlign = 'right'; hudText(ctx, 'VAAL', cx - half - 6, cy + 5, '#ff6060'); }
    else { ctx.textAlign = 'center'; hudText(ctx, 'vaal · V', cx, cy - half - 8, '#ff6060'); }
  }
}
// support pips under a skill: small diamonds, filled per socketed support
function drawPips(ctx, inst, cx, y) {
  const total = skillSockets(inst).cap, slots = activeSupports(inst).slots, s = 3.5, step = 9;
  let x = cx - ((total - 1) * step) / 2;
  for (let i = 0; i < total; i++) {
    const sup = slots[i], awk = sup && inst.awakened.includes(sup);
    diamondPath(ctx, x, y, s);
    ctx.fillStyle = sup ? '#d8be82' : '#17120d'; ctx.fill();
    ctx.strokeStyle = awk ? '#fff0a0' : sup ? '#f0dba6' : '#6a5a3a'; ctx.lineWidth = 1; ctx.stroke();
    x += step;
  }
}
function drawSkillBar(ctx, P, W, H, mobile, left, right) {
  const n = P.skills.length;
  if (!n) { G.skillBarRect = null; return; }
  if (mobile) {
    // vertical column on the right, above the dash button
    const sz = 34, step = sz + 18, cx = W - 16 - sz / 2;
    let cy = H - 150 - sz / 2;
    G.skillBarRect = { x: cx - 30, y: cy - (n - 1) * step - 30, w: 60, h: (n - 1) * step + 60 };
    for (let i = n - 1; i >= 0; i--) { drawSkillSlot(ctx, P.skills[i], cx, cy, sz, true); cy -= step; }
    return;
  }
  // centred between the flasks and the minimap; lifted above them when the screen is too narrow
  const sz = 50, gap = 22, totalW = n * sz + (n - 1) * gap, fits = right - left >= totalW;
  const x0 = fits ? clamp((W - totalW) / 2, left, right - totalW) : (W - totalW) / 2;
  const cy = H - (fits ? 34 : 190) - 6 - 22 - 12 - sz / 2;
  G.skillBarRect = { x: x0 - 12, y: cy - sz / 2 - 14, w: totalW + 24, h: H - (cy - sz / 2 - 14) - 24 };
  P.skills.forEach((inst, i) => {
    const cx = x0 + i * (sz + gap) + sz / 2;
    drawSkillSlot(ctx, inst, cx, cy, sz, false);
    ctx.textAlign = 'center'; ctx.font = '700 12px Sarabun, sans-serif';
    hudText(ctx, String(inst.level), cx, cy + sz / 2 + 22, HUD.cream, 2);
    drawPips(ctx, inst, cx, cy + sz / 2 + 33);
  });
}
// currency ledger + bag line (also the tap target that opens the bag)
function drawLedger(ctx, P, W, y, mobile) {
  const jew = Object.keys(JEWELLERS).reduce((n, k) => n + (P.currency[k] || 0), 0);
  const orbs = ['regal', 'exalt', 'divine', 'annul', 'whetstone', 'scrap', 'vaal'].reduce((a, k) => a + (P.currency[k] || 0), 0);
  const bagCol = P.newItems > 0 ? hexA('#ffe866', 0.7 + Math.sin(G.time * 6) * 0.3) : HUD.muted;
  if (mobile) {
    const x = W - 16;
    ctx.textAlign = 'right'; ctx.font = '600 12px Sarabun, sans-serif';
    hudText(ctx, 'Chaos ' + P.currency.chaos, x, y + 12, '#d0c8ff', 2);
    hudText(ctx, 'Jeweller ' + jew, x, y + 30, '#9fe3ff', 2);
    hudText(ctx, 'กระเป๋า ' + P.backpack.length + (P.newItems > 0 ? ' · ' + P.newItems + ' ใหม่' : ''), x, y + 48, bagCol, 2);
    G.bagRect = { x: W - 130, y: y + 34, w: 130, h: 22 };
    return y + 54;
  }
  const w = 200, x1 = W - 22, x0 = x1 - w;
  const rows = [['Chaos', P.currency.chaos, '#d0c8ff'], ['Jeweller', jew, '#9fe3ff'], ['Orb คราฟต์', orbs, '#c8b8e8']];
  ctx.font = '600 14px Sarabun, sans-serif';
  let ry = y + 14;
  for (const [k, v, c] of rows) {
    ctx.textAlign = 'left'; hudText(ctx, k, x0, ry, c, 2);
    ctx.textAlign = 'right'; hudText(ctx, String(v), x1, ry, '#fff', 2);
    ctx.fillStyle = HUD.line; ctx.fillRect(x0, ry + 5, w, 1);
    ry += 24;
  }
  ctx.textAlign = 'left'; hudText(ctx, 'กระเป๋า (I)', x0, ry, bagCol, 2);
  ctx.textAlign = 'right'; hudText(ctx, P.backpack.length + (P.newItems > 0 ? ' · ' + P.newItems + ' ใหม่' : ''), x1, ry, bagCol, 2);
  G.bagRect = { x: x0, y: ry - 16, w, h: 22 };
  return ry + 8;
}
// last three pickups, coloured by rarity, fading out
function drawLootFeed(ctx, x, y, size) {
  ctx.font = `700 ${size}px Sarabun, sans-serif`; ctx.textAlign = 'right';
  let n = 0;
  for (const l of G.lootLog) {
    if (n >= 3) break;
    const a = clamp(4 - l.t, 0, 1);
    if (a <= 0) continue;
    ctx.globalAlpha = a; hudText(ctx, l.text, x, y + n * (size + 4), l.color);
    n++;
  }
  ctx.globalAlpha = 1;
  return y + 3 * (size + 4);
}
function drawEdgeArrows(ctx, W, H) {
  const arrow = (x, y, c, len) => {
    const dx = (x - G.cam.x) * G.zoom, dy = (y - G.cam.y) * G.zoom;
    if (Math.abs(dx) < W / 2 - 20 && Math.abs(dy) < H / 2 - 20) return;
    const a = Math.atan2(dy, dx), m = Math.min((W / 2 - 34) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 34) / Math.abs(Math.sin(a) || 1e-6));
    ctx.save(); ctx.translate(W / 2 + Math.cos(a) * m, H / 2 + Math.sin(a) * m); ctx.rotate(a);
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(len, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  const B = G.breach;
  if (B && B.state === 'placed') arrow(B.x, B.y, '#c070ff', 15);
  for (const s of G.shrines) arrow(s.x, s.y, SHRINES[s.kind].color, 12);
}

function drawHUD(ctx, W, H, P) {
  const mobile = W < 700, boss = G.bossRef && !G.bossRef.dead ? G.bossRef : null;
  const waiting = G.state === 'play' ? G.pendingLevels + G.pendingChests : 0;
  const xpPct = clamp(P.xp / P.xpNext, 0, 1);
  // XP: a thin gold seam across the top
  const xh = mobile ? 4 : 5;
  ctx.fillStyle = HUD.void; ctx.fillRect(0, 0, W, xh);
  ctx.fillStyle = HUD.gold; ctx.fillRect(0, 0, W * xpPct, xh);
  ctx.fillStyle = HUD.frame; ctx.fillRect(0, xh, W, 1);

  const a = P.asc ? ASCENDANCY[P.asc] : null;
  const sub = [G.cos && G.cos.title ? `「${G.cos.title.name}」` : '', G.heat ? `☠${G.heat}` : ''].filter(Boolean);
  const kills = G.stats.kills.toLocaleString('en-US');
  const biome = BIOMES[G.map.biome];
  let centerY, rightY;

  if (mobile) {
    const top = 16 + xh;
    // left: level + class
    ctx.textAlign = 'left'; ctx.font = '600 28px Cinzel, serif'; hudText(ctx, String(P.level), 16, top + 24, HUD.goldHi);
    ctx.font = '600 12px Sarabun, sans-serif';
    hudText(ctx, [a ? a.name : P.cls.name].concat(sub).join(' · '), 16, top + 42, a ? a.color : HUD.faint, 2);
    // centre: time + kills · tier
    ctx.textAlign = 'center'; ctx.font = '600 28px Cinzel, serif'; hudText(ctx, fmtTime(G.time), W / 2, top + 24, HUD.time);
    ctx.font = '600 11px Sarabun, sans-serif';
    hudRun(ctx, [[kills + ' · ', HUD.faint], ['T' + G.map.tier, biome.color]].concat(G.speed > 1 ? [[' · ⏩×' + G.speed, HUD.goldHi]] : []), W / 2, top + 40, 'center');
    rightY = drawLedger(ctx, P, W, top, true);
    centerY = top + 64;
    if (boss) centerY = drawBossBar(ctx, boss, 16, centerY + 12, W - 32, true) + 12;
  } else {
    // left column: level, class · ascendancy, title · corruption · XP
    const lx = 22;
    ctx.textAlign = 'left'; ctx.font = '600 34px Cinzel, serif';
    hudText(ctx, String(P.level), lx, 22 + 28, HUD.goldHi);
    const lw = ctx.measureText(String(P.level)).width;
    ctx.font = '600 17px Cinzel, Sarabun, serif'; hudSpacing(ctx, 1);
    hudRun(ctx, a ? [[P.cls.name + ' · ', HUD.cream], [a.name, a.color]] : [[P.cls.name, HUD.cream]], lx + lw + 10, 22 + 28, 'left');
    hudSpacing(ctx, 0);
    ctx.font = '600 12px Sarabun, sans-serif';
    hudText(ctx, sub.concat('ประสบการณ์ ' + Math.floor(xpPct * 100) + '%').join(' · '), lx, 22 + 50, HUD.faint, 2);
    // centre: timer, kills · map · mods, boss
    ctx.textAlign = 'center'; ctx.font = '600 36px Cinzel, serif'; hudSpacing(ctx, 3);
    hudText(ctx, fmtTime(G.time), W / 2, 20 + 30, HUD.time); hudSpacing(ctx, 0);
    ctx.font = '600 13px Sarabun, sans-serif';
    const parts = [[`สังหาร ${kills} · `, HUD.faint], [mapLabel(G.map), biome.color]];
    if (G.map.mods.length) parts.push([` · ${G.map.mods.length} mods`, HUD.faint]);
    if (G.speed > 1) parts.push([` · ⏩ ×${G.speed}`, HUD.goldHi]);
    hudRun(ctx, parts, W / 2, 20 + 50, 'center');
    centerY = 20 + 62;
    if (boss) { const bw = Math.min(600, W - 2 * 250); centerY = drawBossBar(ctx, boss, (W - bw) / 2, centerY + 22, bw, false) + 22; }
    rightY = drawLedger(ctx, P, W, 22, false);
  }

  // endgame line + breach/league counters stack under the centre column
  ctx.textAlign = 'center';
  if (G.endless) {
    ctx.font = `700 ${mobile ? 12 : 13}px Cinzel, Sarabun, serif`;
    hudText(ctx, `ENDGAME ∞ ${fmtTime(G.time - G.endStart)} · Echo ${G.stats.echoes || 0} · ตัวถัดไป ${Math.max(0, Math.ceil(G.nextEcho - G.time))}s`, W / 2, centerY + 14, '#ff6a5a');
    centerY += 20;
  }
  const B = G.breach;
  let ly = centerY + 16;
  if (B && B.state === 'open') {
    ctx.textAlign = 'center'; ctx.font = '700 16px Cinzel, serif';
    hudText(ctx, `BREACH ${Math.max(0, B.t).toFixed(1)}s · ☠ ${B.kills}`, W / 2, ly, '#d8a0ff'); ly += 20;
  }
  drawLeagueHUD(ctx, W, H, ly);
  drawEdgeArrows(ctx, W, H);

  // left column, lower part: buffs and the card call-out
  const buffs = hudBuffs(P);
  G.lvlRect = null;
  if (mobile) {
    let y = centerY + 4;
    if (waiting > 0) { drawCardButton(ctx, 16, y, true, waiting); y += 58; }
    if (buffs.length) drawBuffRow(ctx, buffs, 16, y + 4, 12);
    const fy = drawLootFeed(ctx, W - 16, Math.max(rightY, centerY) + 16, 12);
    drawMinimap(ctx, P, W - 16 - 96, fy, 96);
  } else {
    let y = 22 + 76;
    if (buffs.length) { drawBuffRow(ctx, buffs, 22, y, 13); y += 22; }
    if (waiting > 0) drawCardButton(ctx, 22, y, false, waiting);
    drawLootFeed(ctx, W - 22, rightY + 18, 13);
    drawMinimap(ctx, P, W - 22 - 190, H - 22 - 190, 190);
  }

  // announcement
  if (G.announce) {
    const an = G.announce, al = an.t < 0.3 ? an.t / 0.3 : an.t > an.dur - 0.6 ? (an.dur - an.t) / 0.6 : 1;
    ctx.globalAlpha = clamp(al, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = `700 ${mobile ? 22 : 30}px Cinzel, Sarabun, serif`; hudSpacing(ctx, 2);
    hudText(ctx, an.text, W / 2, H * 0.24, an.color, 4); hudSpacing(ctx, 0);
    if (an.sub) { ctx.font = '600 16px Sarabun, sans-serif'; hudText(ctx, an.sub, W / 2, H * 0.24 + 26, HUD.cream, 4); }
    ctx.globalAlpha = 1;
  }

  // bottom-left: life globe, flasks, dash; skills; dash on the right for touch
  if (mobile) {
    const gr = 50, gx = 16 + gr, gy = H - 28 - gr;
    drawLifeGlobe(ctx, P, gx, gy, gr, true);
    const fw = clamp((W - 16 - gr * 2 - 12 - 12 - 60 - 16 - 4 * 6) / 5, 20, 30), fh = 58;
    drawFlasks(ctx, P, gx + gr + 12, H - 28 - fh, fw, fh, 6, true);
    drawDash(ctx, P, W - 16 - 30, H - 30 - 30, 30, true);
  } else {
    const gr = 64, gx = 22 + gr, gy = H - 22 - gr;
    drawLifeGlobe(ctx, P, gx, gy, gr, false);
    const fx = gx + gr + (P.maxES > 0 ? 24 : 16), fh = 60, fy = H - 22 - 4 - 20 - fh;
    drawFlasks(ctx, P, fx, fy, 24, fh, 6, false);
    const dx = fx + 5 * 24 + 4 * 6 + 16 + 22;
    drawDash(ctx, P, dx, fy + fh - 22, 22, false);
    drawSkillBar(ctx, P, W, H, false, dx + 22 + 24, W - 22 - (G.settings.minimap ? 190 + 24 : 0));
  }
  if (mobile) drawSkillBar(ctx, P, W, H, true);

  // touch joystick
  if (G.input.joyOrigin) {
    const o = G.input.joyOrigin, j = G.input.joy || { x: 0, y: 0 };
    ctx.strokeStyle = 'rgba(232,220,192,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(o.x, o.y, 50, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(200,168,96,0.3)';
    ctx.beginPath(); ctx.arc(o.x + j.x * 50, o.y + j.y * 50, 20, 0, TAU); ctx.fill();
  }
}
