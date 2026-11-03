'use strict';
// ============================================================
//  Skill runtime: auto-casting & all skill behaviours
//  projectile · nova · chain · orbit · ground · aura · minion · spin
// ============================================================
const _q = [];   // shared query buffer

function nearestEnemy(x, y, maxR, exclude) {
  let best = null, bd = maxR * maxR;
  for (const e of G.enemies) {
    if (e.dead || (exclude && exclude.has(e.id))) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function randomEnemyNear(x, y, r) {
  G.hash.query(x, y, r, _q);
  const list = _q.filter((e) => !e.dead && dist2(x, y, e.x, e.y) < r * r);
  return list.length ? pick(list) : null;
}
function enemiesInRadius(x, y, r, out) {
  G.hash.query(x, y, r + 40, _q);
  out.length = 0;
  for (const e of _q) {
    if (e.dead) continue;
    const rr = r + e.r;
    if (dist2(x, y, e.x, e.y) < rr * rr) out.push(e);
  }
  return out;
}

function updateSkills(dt) {
  const P = G.player;
  const speedMul = (G.buffs.acceleration > 0 ? 1.4 : 1) * (P.mods.ks.rage ? 1 + P.rage * 0.005 : 1) * (1 + P.flaskFx.speed) * (P.onslaughtT > G.time ? 1.2 : 1);
  if (G.input.vaal) { G.input.vaal = false; unleashVaal(); }
  else if (P.skills.some((s) => s.evo && s.souls >= vaalSouls())) showTip('vaal');
  for (const inst of P.skills) {
    const s = inst.st;
    if (inst.vaalT > 0) inst.vaalT -= dt;
    if (s.disabled) { if (inst.rt.blades) inst.rt.blades.length = 0; inst.rt.beamT = 0; inst.rt.totems = null; inst.rt.mirage = null; continue; }
    if (inst.rt.mirage) updateMirage(inst, s, dt, speedMul);
    if (s.totem) { updateTotems(inst, s, dt, speedMul * (inst.vaalT > 0 ? 2.5 : 1)); continue; }
    if (s.behavior === 'flicker') { updateFlicker(inst, s, dt, speedMul); continue; }
    if (s.behavior === 'aura') { tickAura(inst, s, dt); continue; }
    if (s.behavior === 'herald') {                   // Ice / Ash work through on-kill only
      if (s.herald === 'thunder') { inst.timer -= dt * speedMul; if (inst.timer <= 0) inst.timer = heraldThunder(inst, s) ? s.cdFinal : 0.2; }
      continue;
    }
    if (s.behavior === 'orbit') updateOrbit(inst, s, dt);
    if (s.behavior === 'brand') updateBrands(inst, s, dt);
    if (s.behavior === 'spin') inst.rt.spin = (inst.rt.spin || 0) + dt * 12;
    inst.timer -= dt * speedMul * (inst.vaalT > 0 ? 2.5 : 1) * (s.mobileChannel && channelMoving() ? 1.25 : 1);
    if (inst.timer <= 0) {
      // Ruthless: every 3rd attack is a Ruthless Blow (its hits land within this instant)
      if (s.ruthless && (inst.rt.rc || 0) % 3 === 2) inst.rt.ruthT = G.time + 0.12;
      if (castSkill(inst, s)) {
        inst.rt.rc = (inst.rt.rc || 0) + 1;
        if (s.behavior !== 'orbit' && s.behavior !== 'minion') Sfx.play('cast_' + s.mainType);
        if (s.mirage && !inst.rt.mirage) summonMirage(inst);
        inst.timer = Math.max(inst.timer + s.cdFinal, s.cdFinal * 0.5);
        const echoes = s.echo + (G.buffs.echoing > 0 && s.behavior !== 'orbit' && s.behavior !== 'minion' ? 1 : 0);
        for (let i = 0; i < echoes; i++) G.delayed.push({ t: 0.14 * (i + 1), fn: () => castSkill(inst, inst.st) });
      } else { inst.timer = 0.12; inst.rt.ruthT = 0; }
    }
  }
}

function castSkill(inst, s) {
  const P = G.player;
  switch (s.behavior) {
    case 'projectile': return castProjectiles(inst, s);
    case 'nova': {
      const near = nearestEnemy(P.x, P.y, s.radius * 1.25);
      if (!near) return false;
      const pulse = () => {
        for (const [cx, cy] of cascadePoints(s, P.x, P.y)) G.novas.push({ x: cx, y: cy, r: 0, maxR: s.radius, speed: s.radius / 0.28, hit: new Set(), inst, s });
        for (let i = 0; i < 28; i++) emit(TYPE_PART[s.mainType] || 'shard', P.x, P.y, 1, { dir: (i / 28) * TAU, spread: 0.08, speed: s.radius / 110 });
      };
      pulse();
      for (let i = 1; i < (s.novaPulses || 1); i++) G.delayed.push({ t: 0.32 * i, fn: pulse });
      return true;
    }
    case 'chain': return castArc(inst, s);
    case 'orbit': {
      const blades = inst.rt.blades || (inst.rt.blades = []);
      if (blades.length < s.maxCount) blades.push({ id: uid(), t: s.durFinal });
      else { let o = blades[0]; for (const b of blades) if (b.t < o.t) o = b; o.t = s.durFinal; }
      return true;
    }
    case 'ground': {
      if (s.line) return castLine(inst, s);
      if (!nearestEnemy(P.x, P.y, s.range)) return false;
      const count = s.count + (s.cascade ? Math.ceil(s.count * 0.5) : 0);
      for (let i = 0; i < count; i++) {
        const e = randomEnemyNear(P.x, P.y, s.range);
        const tx = e ? e.x + rand(-25, 25) : P.x + rand(-s.range, s.range);
        const ty = e ? e.y + rand(-25, 25) : P.y + rand(-s.range, s.range);
        G.meteors.push({ x: tx, y: ty, delay: (i / count) * s.durFinal + 0.3, fall: 0.3, r: s.radius, inst, s });
      }
      return true;
    }
    case 'spin': {
      const list = enemiesInRadius(P.x, P.y, s.radius, []);
      if (!list.length) return false;
      for (const e of list) hitEnemy(e, s, inst, 1, P.x, P.y);
      for (const [cx, cy] of cascadePoints(s, P.x, P.y).slice(1)) {
        for (const e of enemiesInRadius(cx, cy, s.radius * 0.8, [])) hitEnemy(e, s, inst, 1, cx, cy);
        addEffect({ kind: 'spin', x: cx, y: cy, r: s.radius * 0.8, t: 0, dur: 0.22, color: s.color });
      }
      addEffect({ kind: 'spin', x: P.x, y: P.y, r: s.radius, t: 0, dur: 0.22, color: s.color });
      for (let i = 0; i < 8; i++) { const a = rand(0, TAU); emit('phys', P.x + Math.cos(a) * s.radius * 0.9, P.y + Math.sin(a) * s.radius * 0.9, 1, { dir: a + Math.PI / 2, spread: 0.2 }); }
      return true;
    }
    case 'minion': {
      const mine = G.minions.filter((m) => m.inst === inst);
      if (mine.length >= s.maxCount) return false;
      for (let k = 0; k < Math.min(s.summonN || 1, s.maxCount - mine.length); k++) {
        const a = rand(0, TAU);
        G.minions.push({ x: P.x + Math.cos(a) * 20, y: P.y + Math.sin(a) * 20, vx: 0, vy: 0, t: s.durFinal, inst, atkCd: 0, target: null, retarget: 0 });
      }
      return true;
    }
    case 'brand': return castBrand(inst, s);
    case 'flicker': return castFlicker(inst, s);
    case 'strike': return s.slashes ? castSlashes(inst, s) : castStrike(inst, s);
    case 'cone': return castCone(inst, s);
    case 'slam': return castSlam(inst, s);
    case 'beam': return castBeam(inst, s);
  }
  return false;
}

// ---------------- Projectiles ----------------
// (ox, oy): fire from somewhere other than the player (totems, mirages)
function castProjectiles(inst, s, ox, oy) {
  const P = G.player, x = ox === undefined ? P.x : ox, y = oy === undefined ? P.y : oy;
  const aimRange = 650 * (s.totem ? 1 + (s.totemRangeInc || 0) : 1);
  if (s.arrowNova) {
    const target = nearestEnemy(x, y, aimRange);
    if (!target) return false;
    queueArrowNova(inst, s, x, y, target); return true;
  }
  let base;
  let distance = 300;
  if (s.pattern === 'ring') {
    if (!nearestEnemy(x, y, 420)) return false;
    base = P.facing;
  } else {
    const tgt = s.aim === 'random' ? (randomEnemyNear(x, y, 480) || nearestEnemy(x, y, aimRange)) : nearestEnemy(x, y, aimRange);
    if (!tgt) return false;
    base = angleTo(x, y, tgt.x, tgt.y);
    distance = Math.hypot(tgt.x - x, tgt.y - y);
  }
  const n = s.proj;
  for (let i = 0; i < n; i++) {
    let a;
    if (s.pattern === 'ring') a = base + (i * TAU) / n;
    else if (n === 1 || s.volley) a = base;
    else {
      const total = Math.min(s.spread * (n - 1), s.wander ? 2.6 : 1.8);
      a = base - total / 2 + (total * i) / (n - 1);
    }
    if (s.wander) a += rand(-0.15, 0.15);
    const offset = s.volley ? (i - (n - 1) / 2) * 22 : 0;
    spawnProjectile(inst, s, clampArena(x - Math.sin(base) * offset, 5), clampArena(y + Math.cos(base) * offset, 5), a, null);
  }
  if (s.scourge) plantScourgePods(inst, s, x, y, base, distance);
  return true;
}

function spawnProjectile(inst, s, x, y, a, hitSet) {
  const sp = s.speedFinal;
  G.projectiles.push({
    x, y, ox: x, oy: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a, t: 0, life: s.lifeFinal, r: s.size,
    pierce: s.pierce, chain: s.chain, forked: false, hit: hitSet ? new Set(hitSet) : new Set(),
    inst, s, wt: 0, dead: false, zt: 0, child: false, splitDone: false, returned: false,
  });
}

function updateProjectiles(dt) {
  const list = G.projectiles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.t += dt;
    // Returning Projectiles: fly back toward the player once, able to hit again
    if (!p.dead && p.t >= p.life && p.s.returning && !p.returned) {
      p.returned = true; p.t = 0; p.hit.clear();
      const sp = Math.hypot(p.vx, p.vy); p.a = angleTo(p.x, p.y, G.player.x, G.player.y);
      p.vx = Math.cos(p.a) * sp; p.vy = Math.sin(p.a) * sp;
    }
    if (p.dead || p.t >= p.life) {
      if (!p.dead && p.s.split && !p.child) splitProjectile(p);
      if (!p.dead && p.s.cloud) spawnCloud(p.inst, p.s, p.x, p.y);
      if (!p.dead && p.s.explode) explodeAt(p, p.x, p.y);
      list[i] = list[list.length - 1]; list.pop();
      continue;
    }
    if (p.s.wander || p.s.seek) {
      p.wt -= dt;
      if (p.wt <= 0) {
        p.wt = 0.1 + Math.random() * 0.1;
        const sp = Math.hypot(p.vx, p.vy);
        const tgt = p.s.seek ? nearestEnemy(p.x, p.y, 320) : null;
        if (tgt) p.a = angleTo(p.x, p.y, tgt.x, tgt.y) + rand(-0.45, 0.45);
        else if (p.s.wander) p.a += rand(-0.9, 0.9);
        p.vx = Math.cos(p.a) * sp; p.vy = Math.sin(p.a) * sp;
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    fxTrail(p);
    if (p.s.zap) zapAround(p, dt);

    G.hash.query(p.x, p.y, p.r + 32, _q);
    for (const e of _q) {
      if (e.dead || p.hit.has(e.id)) continue;
      const rr = p.r + e.r;
      if (dist2(p.x, p.y, e.x, e.y) < rr * rr) {
        onProjectileHit(p, e);
        if (p.dead) break;
      }
    }
  }
}

function pointBlankMult(p) {
  const ks = G.player.mods.ks;
  if (!ks.pointBlank && !ks.closeRange) return 1;
  const d = Math.hypot(p.x - p.ox, p.y - p.oy);
  let k = 1;
  if (ks.pointBlank) k *= clamp(1.5 - (d / 500) * 0.8, 0.7, 1.5);
  if (ks.closeRange) k *= clamp(1.4 - (d / 500) * 0.65, 0.75, 1.4);   // Close Quarters mastery
  return k;
}

function onProjectileHit(p, e) {
  if (p.dead || e.dead || p.hit.has(e.id)) return;
  const s = p.s;
  p.hit.add(e.id);
  // Freezing Pulse fades with distance travelled
  const mult = (s.tags.has('Projectile') ? pointBlankMult(p) : 1) * (s.decay ? Math.max(0.25, 1 - p.t / p.life) : 1);
  if (s.fuseArrow) { attachBowFuse(p, e, mult); hitEnemy(e, s, p.inst, mult * 0.15, p.x, p.y); }
  else if (s.explode) explodeAt(p, p.x, p.y, mult);
  else hitEnemy(e, s, p.inst, mult, p.x - p.vx * 0.05, p.y - p.vy * 0.05);
  if (s.cloud) spawnCloud(p.inst, s, e.x, e.y);
  addEffect({ kind: 'spark', x: p.x, y: p.y, r: 8, t: 0, dur: 0.15, color: s.color });
  if (s.strikes && !p.child) lightningStrikes(p, e);
  if (s.split && !p.child) { splitProjectile(p); p.dead = true; return; }

  if (p.pierce > 0) { p.pierce--; return; }
  if (s.fork && !p.forked) {
    for (const da of [-0.55, 0.55]) {
      spawnProjectile(p.inst, s, p.x, p.y, p.a + da, p.hit);
      const np = G.projectiles[G.projectiles.length - 1];
      np.forked = true; np.pierce = 0; np.chain = p.chain; np.ox = p.ox; np.oy = p.oy;
      // A fork is a continuation of this arrow, not a fresh Tornado Shot primary.
      np.child = p.child; np.splitDone = p.splitDone; np.returned = p.returned;
      np.life = p.life; np.t = p.t;
    }
    p.dead = true; p.noExplodeOnExpire = true;
    return;
  }
  if (p.chain > 0) {
    const nxt = nearestEnemy(p.x, p.y, 320, p.hit);
    if (nxt) {
      p.chain--;
      if (s.id === 'rolling_magma') p.exploded = false;
      p.a = angleTo(p.x, p.y, nxt.x, nxt.y);
      const sp = Math.hypot(p.vx, p.vy);
      p.vx = Math.cos(p.a) * sp; p.vy = Math.sin(p.a) * sp;
      p.t = Math.min(p.t, p.life * 0.4);
      return;
    }
  }
  p.dead = true;
}

const _boomList = [];
function explodeAt(p, x, y, mult) {
  if (p.exploded) return;
  p.exploded = true;
  const s = p.s;
  enemiesInRadius(x, y, s.radius, _boomList);
  for (const e of _boomList) hitEnemy(e, s, p.inst, mult || 1, x, y);
  addEffect({ kind: 'boom', x, y, r: s.radius, t: 0, dur: 0.3, color: s.color });
  fxExplosion(x, y, s.radius, s.mainType);
  if (s.mainType === 'fire' && Math.random() < 0.35) addDecal('scorch', x, y, s.radius / 34);
  // Kinetic Blast: smaller explosions scatter around the first
  if (s.cluster) {
    for (let k = 0; k < s.cluster; k++) {
      const cx = x + rand(-75, 75), cy = y + rand(-75, 75), r = s.radius * 0.75;
      G.delayed.push({ t: 0.1 * (k + 1), fn: () => {
        for (const e of enemiesInRadius(cx, cy, r, [])) hitEnemy(e, s, p.inst, 0.6, cx, cy);
        addEffect({ kind: 'boom', x: cx, y: cy, r, t: 0, dur: 0.25, color: s.color });
      } });
    }
  }
}

// ---------------- Caustic cloud ----------------
function spawnCloud(inst, s, x, y) {
  if (G.grounds.length > 60) G.grounds.shift();
  const dur = s.cloudDur ? s.cloudDur * (1 + s.durInc) * s.durMore : s.durFinal;
  G.grounds.push({ x, y, r: s.radius, t: 0, dur, dps: s.cloudDpsFinal, tick: 0, inst, s, color: s.color });
}
const _cloudList = [];
function updateGrounds(dt) {
  for (let i = G.grounds.length - 1; i >= 0; i--) {
    const g = G.grounds[i];
    g.t += dt; g.tick -= dt;
    if (g.t >= g.dur) { G.grounds.splice(i, 1); continue; }
    if (g.tick <= 0) {
      g.tick = 0.25;
      for (let k = 0; k < 2; k++) { const a = rand(0, TAU), d = g.r * Math.sqrt(Math.random()); emit('bubble', g.x + Math.cos(a) * d, g.y + Math.sin(a) * d, 1); }
      enemiesInRadius(g.x, g.y, g.r, _cloudList);
      for (const e of _cloudList) dotDamage(e, g.dps * 0.25, g.inst, '#a8f060');
    }
  }
}

// ---------------- Nova ----------------
const _novaList = [];
function updateNovas(dt) {
  for (let i = G.novas.length - 1; i >= 0; i--) {
    const n = G.novas[i];
    n.r += n.speed * dt;
    enemiesInRadius(n.x, n.y, Math.min(n.r, n.maxR), _novaList);
    for (const e of _novaList) {
      if (n.hit.has(e.id)) continue;
      n.hit.add(e.id);
      hitEnemy(e, n.s, n.inst, 1, n.x, n.y);
    }
    if (n.r >= n.maxR) { addEffect({ kind: 'ring', x: n.x, y: n.y, r: n.maxR, t: 0, dur: 0.25, color: n.s.color }); G.novas.splice(i, 1); }
  }
}

// ---------------- Arc ----------------
function castArc(inst, s) {
  const P = G.player;
  let tgt = nearestEnemy(P.x, P.y, s.range);
  if (!tgt) return false;
  const hit = new Set(), pts = [[P.x, P.y]];
  let jumps = s.chain + 1;
  while (tgt && jumps-- > 0) {
    hit.add(tgt.id);
    pts.push([tgt.x, tgt.y]);
    hitEnemy(tgt, s, inst, 1, tgt.x, tgt.y);
    G.hash.query(tgt.x, tgt.y, s.chainRange, _q);
    let best = null, bd = s.chainRange * s.chainRange;
    for (const e of _q) {
      if (e.dead || hit.has(e.id)) continue;
      const d = dist2(tgt.x, tgt.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    tgt = best;
  }
  addEffect({ kind: 'bolt', pts, t: 0, dur: 0.18, color: s.color });
  for (let i = 1; i < pts.length; i++) emit('spark', pts[i][0], pts[i][1], 3);
  return true;
}

// ---------------- Blade Vortex ----------------
const _orbList = [];
function updateOrbit(inst, s, dt) {
  const blades = inst.rt.blades || (inst.rt.blades = []);
  for (let i = blades.length - 1; i >= 0; i--) { blades[i].t -= dt; if (blades[i].t <= 0) blades.splice(i, 1); }
  if (!blades.length) return;
  const P = G.player;
  inst.rt.ang = (inst.rt.ang || 0) + dt * 4.2;
  const n = blades.length, R = s.radius;
  const br = s.size * Math.sqrt((1 + s.areaInc) * s.areaMore);
  for (let i = 0; i < n; i++) {
    const a = inst.rt.ang + (i * TAU) / n;
    // blades breathe in and out so they sweep the whole area, not just a ring
    const rr = R * (0.6 + 0.4 * Math.sin(G.time * 2.2 + i * 2.4));
    const bx = P.x + Math.cos(a) * rr, by = P.y + Math.sin(a) * rr;
    blades[i].x = bx; blades[i].y = by; blades[i].a = a;
    enemiesInRadius(bx, by, br, _orbList);
    for (const e of _orbList) {
      const key = blades[i].id;
      if ((e.hitCd[key] || 0) > G.time) continue;
      e.hitCd[key] = G.time + s.hitCd;
      hitEnemy(e, s, inst, 1, P.x, P.y);
    }
  }
}

// ---------------- Righteous Fire ----------------
const _auraList = [];
function tickAura(inst, s, dt) {
  inst.rt.tick = (inst.rt.tick || 0) - dt;
  if (inst.rt.tick > 0) return;
  inst.rt.tick = 0.2;
  const P = G.player;
  for (let i = 0; i < 7; i++) { const a = rand(0, TAU), d = s.radius * Math.sqrt(Math.random()); emit('ember', P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, 1, { dir: -Math.PI / 2, spread: 0.6 }); }
  enemiesInRadius(P.x, P.y, s.radius, _auraList);
  for (const e of _auraList) dotDamage(e, s.auraDps * 0.2, inst, '#ff8a3d');
}

// ---------------- Firestorm ----------------
const _metList = [];
function updateMeteors(dt) {
  for (let i = G.meteors.length - 1; i >= 0; i--) {
    const m = G.meteors[i];
    m.delay -= dt;
    if (m.delay > 0) continue;
    enemiesInRadius(m.x, m.y, m.r, _metList);
    for (const e of _metList) hitEnemy(e, m.s, m.inst, m.mult || 1, m.x, m.y);
    if (m.s.cloud) spawnCloud(m.inst, m.s, m.x, m.y);
    addEffect({ kind: 'boom', x: m.x, y: m.y, r: m.r, t: 0, dur: 0.35, color: m.s.color });
    fxExplosion(m.x, m.y, m.r, m.s.mainType);
    if (Math.random() < 0.5) addDecal('scorch', m.x, m.y, m.r / 30);
    G.shake = Math.max(G.shake, 2);
    G.meteors.splice(i, 1);
  }
}

// ---------------- Raging Spirits ----------------
function updateMinions(dt) {
  const P = G.player;
  for (let i = G.minions.length - 1; i >= 0; i--) {
    const m = G.minions[i];
    const s = m.inst.st;
    if (!P.skills.includes(m.inst)) { G.minions.splice(i, 1); continue; }
    m.t -= dt; m.atkCd -= dt; m.retarget -= dt;
    if (m.t <= 0) {
      if (P.mods.ks.minionBoom || s.minionBoom) {
        const list = enemiesInRadius(m.x, m.y, 75, []);
        for (const e of list) hitEnemy(e, s, m.inst, 2, m.x, m.y);
        addEffect({ kind: 'boom', x: m.x, y: m.y, r: 75, t: 0, dur: 0.3, color: '#ff7a2a' });
      }
      G.minions.splice(i, 1); continue;
    }
    if (m.retarget <= 0 || !m.target || m.target.dead) {
      m.target = nearestEnemy(m.x, m.y, 520); m.retarget = 0.35;
    }
    if (s.rangedMinion) { updateRangedMage(m, s, dt); continue; }
    const sp = s.speed * s.minionSpeedMul;
    let tx, ty;
    if (m.target) { tx = m.target.x; ty = m.target.y; }
    else { const a = G.time * 2 + i; tx = P.x + Math.cos(a) * 60; ty = P.y + Math.sin(a) * 60; }
    const a = Math.atan2(ty - m.y, tx - m.x);
    m.vx = lerp(m.vx, Math.cos(a) * sp, Math.min(1, dt * 6));
    m.vy = lerp(m.vy, Math.sin(a) * sp, Math.min(1, dt * 6));
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (Math.random() < 0.35) emit('ember', m.x, m.y, 1, { speed: 0.4 });
    if (m.target && m.atkCd <= 0) {
      const rr = m.target.r + s.size + 4;
      if (dist2(m.x, m.y, m.target.x, m.target.y) < rr * rr) {
        hitEnemy(m.target, s, m.inst, 1, m.x, m.y);
        m.atkCd = s.hitCd / s.minionSpeedMul;
        addEffect({ kind: 'spark', x: m.target.x, y: m.target.y, r: 10, t: 0, dur: 0.15, color: s.color });
      }
    }
  }
}

// ---------------- Vaal ultimate ----------------
// Every evolved skill with a full soul gauge releases a huge blast of its
// own damage around the player and then casts 2.5x faster for a while.
function vaalReady() { return G.player.skills.filter((s) => s.evo && s.souls >= vaalSouls()); }
function unleashVaal() {
  const P = G.player, ready = vaalReady();
  if (!ready.length) return false;
  Sfx.play('vaal');
  for (const inst of ready) {
    const s = inst.st;
    inst.souls = 0; inst.vaalT = VAAL_SURGE;
    const R = 340, mult = s.behavior === 'aura' ? 3 : 4;
    for (const e of enemiesInRadius(P.x, P.y, R, [])) hitEnemy(e, s, inst, mult, P.x, P.y);
    addEffect({ kind: 'ring', x: P.x, y: P.y, r: R, t: 0, dur: 0.5, color: s.color });
    addEffect({ kind: 'boom', x: P.x, y: P.y, r: R * 0.6, t: 0, dur: 0.45, color: '#ff3030' });
    fxExplosion(P.x, P.y, R * 0.7, s.mainType);
    addText(P.x, P.y - 40, EVOLUTIONS[inst.id].name + '!', '#ff5050', 1.4);
  }
  G.shake = Math.max(G.shake, 8);
  hitStop(0.12);
  Sfx.play('boss');
  return true;
}

// ---------------- expansion behaviours ----------------
// Spell Cascade: extra copies of an area skill around the main one
function cascadePoints(s, x, y) {
  const pts = [[x, y]];
  if (s.cascade) {
    const a = rand(0, TAU);
    for (let i = 0; i < s.cascade; i++) { const b = a + (i * TAU) / s.cascade; pts.push([x + Math.cos(b) * s.radius * 0.9, y + Math.sin(b) * s.radius * 0.9]); }
  }
  return pts;
}

// Ball Lightning: zap a few nearby enemies every zapCd while flying
function zapAround(p, dt) {
  p.zt -= dt;
  if (p.zt > 0) return;
  p.zt = p.s.zapCd;
  const list = enemiesInRadius(p.x, p.y, p.s.radius, []);
  for (let i = 0; i < p.s.zapN && list.length; i++) {
    const e = list.splice(Math.floor(Math.random() * list.length), 1)[0];
    hitEnemy(e, p.s, p.inst, 1, p.x, p.y);
    addEffect({ kind: 'bolt', pts: [[p.x, p.y], [(p.x + e.x) / 2 + rand(-8, 8), (p.y + e.y) / 2 + rand(-8, 8)], [e.x, e.y]], t: 0, dur: 0.12, color: p.s.color });
  }
}

// Lightning Arrow: bolts from the sky on enemies around the impact
function lightningStrikes(p, hitE) {
  const list = enemiesInRadius(hitE.x, hitE.y, p.s.radius, []).filter((e) => e !== hitE);
  for (let i = 0; i < p.s.strikes && list.length; i++) {
    const e = list.splice(Math.floor(Math.random() * list.length), 1)[0];
    hitEnemy(e, p.s, p.inst, 0.7, e.x, e.y - 10);
    addEffect({ kind: 'bolt', pts: [[e.x + rand(-15, 15), e.y - 200], [e.x + rand(-10, 10), e.y - 90], [e.x, e.y]], t: 0, dur: 0.16, color: p.s.color });
  }
}

// Tornado Shot: secondary arrows burst out in random directions
function splitProjectile(p) {
  if (p.child || p.splitDone || !p.s.split) return;
  p.splitDone = true;
  const n = p.s.split, dir = Math.atan2(p.vy, p.vx);
  for (let i = 0; i < n; i++) {
    // Eye of the Gale: a tight forward line instead of a ring
    spawnProjectile(p.inst, p.s, p.x, p.y, p.s.splitFocus ? dir + (i - (n - 1) / 2) * (p.s.splitSpread || 0.08) : rand(0, TAU), p.hit);
    const np = G.projectiles[G.projectiles.length - 1];
    np.child = true; np.life = p.s.lifeFinal * 0.6; np.ox = p.ox; np.oy = p.oy;
    np.splitDone = true; np.forked = p.forked; np.returned = p.returned;
    np.chain = p.chain; np.pierce = p.pierce;
  }
}

// Brands: attach to an enemy, activate on a timer, move to a new host when it dies
function castBrand(inst, s) {
  const P = G.player, brands = inst.rt.brands || (inst.rt.brands = []);
  const taken = new Set(brands.map((b) => b.target && b.target.id));
  let tgt = null, bd = s.range * s.range;
  for (const e of G.enemies) {
    if (e.dead || taken.has(e.id)) continue;
    const d = dist2(P.x, P.y, e.x, e.y);
    if (d < bd) { bd = d; tgt = e; }
  }
  if (!tgt) tgt = nearestEnemy(P.x, P.y, s.range);
  if (!tgt) return false;
  const b = { target: tgt, x: tgt.x, y: tgt.y, t: s.durFinal, act: 0.2 };
  if (brands.length < s.maxCount) brands.push(b);
  else { let o = brands[0]; for (const x of brands) if (x.t < o.t) o = x; Object.assign(o, b); }
  addEffect({ kind: 'ring', x: tgt.x, y: tgt.y, r: 30, t: 0, dur: 0.25, color: s.color });
  return true;
}
function updateBrands(inst, s, dt) {
  const brands = inst.rt.brands;
  if (!brands) return;
  for (let i = brands.length - 1; i >= 0; i--) {
    const b = brands[i];
    b.t -= dt;
    if (b.t <= 0) { brands.splice(i, 1); continue; }
    if (!b.target || b.target.dead) {
      b.target = nearestEnemy(b.x, b.y, s.brandRelay ? 468 : 260);
      if (b.target && s.brandRelay) { b.act = 0; addEffect({ kind: 'ring', x: b.target.x, y: b.target.y, r: 24, t: 0, dur: 0.2, color: s.color }); }
    }
    if (b.target) { b.x = b.target.x; b.y = b.target.y; }
    b.act -= dt * (1 + s.speedInc * 0.5);
    if (b.act > 0 || !b.target) continue;
    b.act = s.hitCd / (s.brandRate || 1);
    if (s.brand === 'dot') {
      for (const e of enemiesInRadius(b.x, b.y, s.radius, [])) {
        dotDamage(e, s.auraDps * s.hitCd, inst, s.color);
        e.winterSlowUntil = G.time + 0.7;
      }
      addEffect({ kind: 'ring', x: b.x, y: b.y, r: s.radius, t: 0, dur: 0.22, color: s.color });
    } else if (s.brand === 'chain') {
      // lightning from the brand jumping between enemies
      let tgt = b.target; const hit = new Set(), pts = [[b.x, b.y - 14]];
      for (let j = 0; j <= s.chain && tgt; j++) {
        hit.add(tgt.id); pts.push([tgt.x, tgt.y]);
        hitEnemy(tgt, s, inst, 1, b.x, b.y);
        let best = null, bd = s.chainRange * s.chainRange;
        G.hash.query(tgt.x, tgt.y, s.chainRange, _q);
        for (const e of _q) { if (e.dead || hit.has(e.id)) continue; const d = dist2(tgt.x, tgt.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
        tgt = best;
      }
      addEffect({ kind: 'bolt', pts, t: 0, dur: 0.15, color: s.color });
    } else {
      G.meteors.push({ x: b.x + rand(-10, 10), y: b.y + rand(-10, 10), delay: 0.3, fall: 0.3, r: s.radius, inst, s });
    }
  }
}

// Molten Strike: melee hit on the nearest enemy + lava balls around it
function castStrike(inst, s) {
  const P = G.player, tgt = nearestEnemy(P.x, P.y, s.range);
  if (!tgt) return false;
  hitEnemy(tgt, s, inst, 1, P.x, P.y);
  if (s.ancestral) {
    // Extra targets receive one strike, not another full cast (no recursion).
    const extra = enemiesInRadius(tgt.x, tgt.y, 120, []).filter(e => e !== tgt && dist2(e.x, e.y, P.x, P.y) <= (s.range + 100) ** 2).slice(0, s.ancestral);
    for (const e of extra) {
      hitEnemy(e, s, inst, 1, P.x, P.y);
      addEffect({ kind: 'bolt', pts: [[tgt.x, tgt.y], [e.x, e.y]], t: 0, dur: 0.12, color: s.color });
    }
  }
  addEffect({ kind: 'spark', x: tgt.x, y: tgt.y, r: 22, t: 0, dur: 0.18, color: s.color });
  // Melee Splash: the blow also lands around the target
  if (s.splash) {
    const R = s.splash * Math.sqrt(Math.max(0.1, (1 + s.areaInc) * s.areaMore));
    for (const e of enemiesInRadius(tgt.x, tgt.y, R, [])) if (e !== tgt) hitEnemy(e, s, inst, 0.6, tgt.x, tgt.y);
    addEffect({ kind: 'ring', x: tgt.x, y: tgt.y, r: R, t: 0, dur: 0.2, color: s.color });
  }
  // Smite: lightning bolts on enemies around the target
  if (s.bolts) {
    const list = enemiesInRadius(tgt.x, tgt.y, s.boltR, []);
    for (let k = 0; k < s.bolts && list.length; k++) {
      const e = list.splice(Math.floor(Math.random() * list.length), 1)[0];
      hitEnemy(e, s, inst, 0.7, e.x, e.y - 10);
      addEffect({ kind: 'bolt', pts: [[e.x + rand(-20, 20), e.y - 240], [e.x + rand(-12, 12), e.y - 110], [e.x, e.y]], t: 0, dur: 0.18, color: s.color });
      emit('spark', e.x, e.y, 5);
    }
    Sfx.play('zap');
  }
  // Frost Blades: icy blades fly on from the target
  if (s.blades) {
    const n = s.blades + s.proj, a0 = angleTo(P.x, P.y, tgt.x, tgt.y), hs = new Set([tgt.id]);
    for (let k = 0; k < n; k++) spawnProjectile(inst, s, tgt.x, tgt.y, a0 + (k - (n - 1) / 2) * s.spread, hs);
  }
  const n = s.balls ? s.balls + s.proj : 0;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), d = rand(30, 110);
    G.meteors.push({ x: tgt.x + Math.cos(a) * d, y: tgt.y + Math.sin(a) * d, delay: 0.25 + i * 0.03, fall: 0.25, r: s.radius, inst, s, mult: 0.6 });
  }
  return true;
}

// Herald of Thunder: bolts on shocked enemies around you (one bolt when none is shocked)
function heraldThunder(inst, s) {
  const P = G.player, list = enemiesInRadius(P.x, P.y, s.range, []);
  if (!list.length) return false;
  const shocked = list.filter((e) => e.shock.t > 0);
  const pool = shocked.length ? shocked : [list[Math.floor(Math.random() * list.length)]];
  for (let k = 0; k < s.bolts && pool.length; k++) {
    const e = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    hitEnemy(e, s, inst, 1, e.x, e.y - 10);
    addEffect({ kind: 'bolt', pts: [[e.x + rand(-20, 20), e.y - 260], [e.x + rand(-12, 12), e.y - 120], [e.x, e.y]], t: 0, dur: 0.2, color: s.color });
    emit('spark', e.x, e.y, 5);
  }
  Sfx.play('zap');
  echoHeraldThunder(inst, s);
  return true;
}

// a copy of a stat block that hits for k× damage (mirages)
function scaledStats(s, k) {
  const o = Object.assign({}, s, { hit: {}, mirage: false, totem: false, _src: s });
  for (const t in s.hit) o.hit[t] = s.hit[t] * k;
  o.hitTotal = s.hitTotal * k; o.cloudDpsFinal = s.cloudDpsFinal * k;
  return o;
}
// Mirage Archer: a ghost behind you that fires the skill on its own for a few seconds
function summonMirage(inst) {
  const P = G.player;
  inst.rt.mirage = { x: P.x - Math.cos(P.facing) * 45, y: P.y - Math.sin(P.facing) * 45, t: 4, timer: 0.3, flip: !!P._faceLeft };
  emit('wisp', inst.rt.mirage.x, inst.rt.mirage.y, 8);
}
function updateMirage(inst, s, dt, speedMul) {
  const m = inst.rt.mirage;
  m.t -= dt; m.timer -= dt * speedMul;
  if (m.t <= 0) { inst.rt.mirage = null; return; }
  if (m.timer > 0) return;
  const ms = inst.rt.mirS && inst.rt.mirS._src === s ? inst.rt.mirS : (inst.rt.mirS = scaledStats(s, 0.6));
  const ok = s.behavior === 'projectile' ? castProjectiles(inst, ms, m.x, m.y) : castSkill(inst, ms);
  m.timer = ok ? s.cdFinal : 0.15;
}
// Ballista Totem: totems placed where you stand fire the skill instead of you
function updateTotems(inst, s, dt, speedMul) {
  const P = G.player, T = inst.rt.totems || (inst.rt.totems = []);
  for (let i = T.length - 1; i >= 0; i--) {
    const t = T[i];
    t.t -= dt; t.timer -= dt * speedMul;
    if (t.t <= 0) { T.splice(i, 1); continue; }
    if (t.timer > 0) continue;
    if (castProjectiles(inst, s, t.x, t.y)) {
      t.timer = s.cdFinal; inst.rt.rc = (inst.rt.rc || 0) + 1;
      for (let k = 0; k < s.echo; k++) G.delayed.push({ t: 0.14 * (k + 1), fn: () => castProjectiles(inst, inst.st, t.x, t.y) });
    } else t.timer = 0.15;
  }
  inst.timer -= dt;
  if (inst.timer > 0 || !nearestEnemy(P.x, P.y, 520 * (1 + (s.totemRangeInc || 0)))) return;
  // once every totem is far behind, the oldest one is moved to you
  const far = T.every((t) => dist2(t.x, t.y, P.x, P.y) > 350 * 350);
  if (T.length >= s.totemMax) { if (!far) return; T.shift(); }
  const x = clampArena(P.x + rand(-20, 20), 20), y = clampArena(P.y + rand(-20, 20), 20);
  T.push({ x, y, t: s.totemDur, timer: 0.25, id: uid() });
  addEffect({ kind: 'ring', x, y, r: 26, t: 0, dur: 0.35, color: s.color });
  inst.timer = 1.2 / (1 + (s.totemPlaceInc || 0));
}

// enemies on a line from (x, y) at angle a, length L, half-width w
const _lineList = [];
function enemiesOnLine(x, y, a, L, w) {
  const ax = Math.cos(a), ay = Math.sin(a), out = [];
  G.hash.query(x + ax * L / 2, y + ay * L / 2, L / 2 + 40, _lineList);
  for (const e of _lineList) {
    if (e.dead) continue;
    const rx = e.x - x, ry = e.y - y, along = rx * ax + ry * ay;
    if (along >= 0 && along <= L + e.r && Math.abs(rx * ay - ry * ax) < w + e.r) out.push(e);
  }
  return out;
}
// Lacerate: slashes that cross on the nearest enemy, each one hits everything on its line
function castSlashes(inst, s) {
  const P = G.player, tgt = nearestEnemy(P.x, P.y, s.range);
  if (!tgt) return false;
  const a0 = angleTo(P.x, P.y, tgt.x, tgt.y), n = s.slashes, L = s.radius, w = s.size;
  for (let k = 0; k < n; k++) {
    const a = a0 + (n === 1 ? 0 : (k / (n - 1) - 0.5) * 2 * s.slashAng);
    const x0 = tgt.x - Math.cos(a) * L / 2, y0 = tgt.y - Math.sin(a) * L / 2;
    for (const e of enemiesOnLine(x0, y0, a, L, w)) hitEnemy(e, s, inst, 1, P.x, P.y);
    addEffect({ kind: 'slash', x: x0, y: y0, a, r: L, w, t: 0, dur: 0.2, color: s.color });
  }
  emit('blood', tgt.x, tgt.y, 6, { color: '#c02020' });
  return true;
}
// Ground Slam: a cone-shaped shockwave towards the nearest enemy
function castCone(inst, s) {
  const P = G.player, tgt = nearestEnemy(P.x, P.y, s.radius * 1.05);
  if (!tgt) return false;
  const a0 = angleTo(P.x, P.y, tgt.x, tgt.y), half = Math.min(Math.PI, s.coneArc / 2), R = s.radius;
  for (const e of enemiesInRadius(P.x, P.y, R, [])) {
    const da = Math.abs(((angleTo(P.x, P.y, e.x, e.y) - a0 + Math.PI * 3) % TAU) - Math.PI);
    if (da <= half + e.r / Math.max(30, Math.hypot(e.x - P.x, e.y - P.y))) hitEnemy(e, s, inst, 1, P.x, P.y);
  }
  addEffect({ kind: 'cone', x: P.x, y: P.y, a: a0, arc: half * 2, r: R, t: 0, dur: 0.3, color: s.color });
  for (let i = 0; i < 10; i++) { const a = a0 + rand(-half, half), d = rand(0.3, 1) * R; emit('phys', P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, 1, { dir: a, spread: 0.2 }); }
  G.shake = Math.max(G.shake, 3);
  return true;
}

// Earthquake: slam now, aftershock(s) at the same spot later
function castSlam(inst, s) {
  const P = G.player;
  if (!nearestEnemy(P.x, P.y, s.radius * 1.15)) return false;
  for (const [x, y] of cascadePoints(s, P.x, P.y)) {
    for (const e of enemiesInRadius(x, y, s.radius, [])) hitEnemy(e, s, inst, 1, x, y);
    addEffect({ kind: 'ring', x, y, r: s.radius, t: 0, dur: 0.3, color: s.color });
    emit('phys', x, y, 10, { speed: 1.4 });
    for (let k = 1; k <= (s.aftershocks || 1); k++) {
      G.delayed.push({ t: s.durFinal * k, fn: () => {
        for (const e of enemiesInRadius(x, y, s.radius * 1.1, [])) hitEnemy(e, s, inst, 1.6, x, y);
        addEffect({ kind: 'boom', x, y, r: s.radius * 1.1, t: 0, dur: 0.35, color: s.color });
        addDecal('scorch', x, y, s.radius / 40);
        G.shake = Math.max(G.shake, 4);
      } });
    }
  }
  G.shake = Math.max(G.shake, 2);
  return true;
}

// Scorching Ray: a channelled beam, each "cast" is one damage tick
const _beamList = [];
function castBeam(inst, s) {
  const P = G.player, tgt = nearestEnemy(P.x, P.y, s.range);
  if (!tgt) return false;
  const want = angleTo(P.x, P.y, tgt.x, tgt.y);
  const cur = inst.rt.beamA === undefined ? want : inst.rt.beamA;
  let da = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
  const turn = s.mobileChannel ? 1.2 : 0.6;
  inst.rt.beamA = cur + clamp(da, -turn, turn);
  inst.rt.beamT = G.time + 0.25;
  if (inst.id === 'incinerate') {
    const rt = inst.rt, moving = Math.hypot(P.vx, P.vy) > 10 || P.dashT > 0;
    rt.incStages = moving || rt.incLast === undefined || G.time - rt.incLast > 0.4 ? 0 : Math.min(8, (rt.incStages || 0) + 1);
    rt.incLast = G.time;
  }
  const ax = Math.cos(inst.rt.beamA), ay = Math.sin(inst.rt.beamA), L = s.range;
  const channelMult = channelPulseMultiplier(inst, s);
  if (s.strongPulse && ((inst.rt.rc || 0) + 1) % s.strongPulse === 0) inst.rt.strongFlash = G.time + 0.12;
  const w = s.size * Math.sqrt((1 + s.areaInc) * s.areaMore) * (1 + (inst.rt.incStages || 0) * 0.07);
  G.hash.query(P.x + ax * L / 2, P.y + ay * L / 2, L / 2 + 40, _beamList);
  for (const e of _beamList) {
    if (e.dead) continue;
    const rx = e.x - P.x, ry = e.y - P.y, along = rx * ax + ry * ay;
    if (along < 0 || along > L) continue;
    if (Math.abs(rx * ay - ry * ax) < w + e.r) hitEnemy(e, s, inst, channelMult, P.x, P.y);
  }
  return true;
}

// Flicker owns its three-hit burst here, never through uncancellable delayed casts.
function flickerMovementIntent() {
  const i = G.input, P = G.player;
  return i.up || i.down || i.left || i.right || i.dash ||
    (i.joy && Math.hypot(i.joy.x, i.joy.y) > 0.1) || (P && P.dashT > 0);
}
function cancelFlicker() {
  const P = G.player;
  if (!P) return;
  P.flickerIdle = 0;
  for (const inst of P.skills) if (inst.st && inst.st.behavior === 'flicker') {
    if (inst.rt.flickerRemaining > 0) inst.rt.flickerRest = 0.25;
    inst.rt.flickerRemaining = 0;
  }
}
function toggleFlicker() {
  const P = G.player;
  if (G.state !== 'play' || !P || !P.skills.some((i) => i.st && i.st.behavior === 'flicker')) return;
  P.flickerPaused = !P.flickerPaused;
  cancelFlicker();
  syncFlickerButton();
}
function flickerReady() {
  const P = G.player;
  return G.state === 'play' && P && !P.dead && !P.flickerPaused &&
    P.flickerIdle >= 0.3 && !flickerMovementIntent();
}
function updateFlicker(inst, s, dt, speedMul) {
  const rt = inst.rt, rate = speedMul * (inst.vaalT > 0 ? 2.5 : 1);
  inst.timer -= dt * rate;
  rt.flickerRest = Math.max(0, (rt.flickerRest || 0) - dt);
  if (!flickerReady()) { rt.flickerRemaining = 0; return; }
  if (rt.flickerRemaining > 0) {
    rt.flickerNext -= dt;
    if (rt.flickerNext > 0) return;
    if (!castFlicker(inst, s)) rt.flickerRemaining = 0;
    else rt.flickerRemaining--;
    rt.flickerNext = Math.max(0.045, 0.09 / rate);
    if (!rt.flickerRemaining) rt.flickerRest = 0.25;
    return;
  }
  if (inst.timer > 0 || rt.flickerRest > 0) return;
  rt.flickerOrigin = { x: G.player.x, y: G.player.y };
  rt.flickerFacing = G.player.facing;
  if (s.ruthless && (rt.rc || 0) % 3 === 2) rt.ruthT = G.time + 0.3;
  if (!castFlicker(inst, s)) { inst.timer = 0.12; rt.ruthT = 0; return; }
  rt.rc = (rt.rc || 0) + 1;
  rt.flickerRemaining = s.flickers - 1;
  rt.flickerNext = Math.max(0.045, 0.09 / rate);
  inst.timer = s.cdFinal;
}

// Real player teleport. Prefer nearby targets ahead and keep the entire burst local.
function castFlicker(inst, s) {
  const P = G.player;
  if (!flickerReady()) return false;
  const origin = inst.rt.flickerOrigin || P, facing = inst.rt.flickerFacing ?? P.facing;
  let tgt = null, landing = null, best = Infinity;
  for (const e of enemiesInRadius(P.x, P.y, Math.min(240, s.range), [])) {
    if (e.dead || e.encased) continue;
    const dx = e.x - P.x, dy = e.y - P.y, distance = Math.hypot(dx, dy);
    const a = Math.atan2(-dy, -dx), offset = e.r + P.r + 4;
    const nx = clampArena(e.x + Math.cos(a) * offset, P.r), ny = clampArena(e.y + Math.sin(a) * offset, P.r);
    if (dist2(P.x, P.y, nx, ny) > 240 * 240 || dist2(origin.x, origin.y, nx, ny) > s.range * s.range) continue;
    const forward = distance > 0 ? (dx * Math.cos(facing) + dy * Math.sin(facing)) / distance : 1;
    const score = distance * (1 + (1 - forward) * 0.7) * (e.rarity >= 2 ? 0.9 : 1);
    if (score < best) { best = score; tgt = e; landing = { x: nx, y: ny }; }
  }
  if (!tgt) return false;
  addEffect({ kind: 'afterimage', x: P.x, y: P.y, flip: P._faceLeft, t: 0, dur: 0.18, color: s.color });
  addEffect({ kind: 'bolt', pts: [[P.x, P.y], [landing.x, landing.y]], t: 0, dur: 0.1, color: s.color });
  P.x = landing.x; P.y = landing.y;
  P.vx = 0; P.vy = 0;
  P._faceLeft = tgt.x < P.x;
  P.iframes = Math.max(P.iframes, 0.06);
  // Supports repeat the strike at this landing instead of queuing extra teleports.
  const hits = 1 + (s.echo || 0) + (G.buffs.echoing > 0 ? 1 : 0);
  const list = enemiesInRadius(tgt.x, tgt.y, s.radius, []);
  for (let k = 0; k < hits; k++) for (const e of list) if (!e.dead) hitEnemy(e, s, inst, 1, P.x, P.y);
  addEffect({ kind: 'spin', x: tgt.x, y: tgt.y, r: s.radius, t: 0, dur: 0.2, color: s.color });
  emit('phys', tgt.x, tgt.y, 8, { speed: 1.3 });
  return true;
}

// Glacial Cascade: bursts erupt one after another in a line toward the nearest enemy
function castLine(inst, s) {
  const P = G.player, tgt = nearestEnemy(P.x, P.y, s.range);
  if (!tgt) return false;
  const a = angleTo(P.x, P.y, tgt.x, tgt.y), n = s.count + (s.cascade ? 2 : 0), step = Math.max(s.radius * 1.1, (s.range * 0.9) / n);
  for (let i = 0; i < n; i++) {
    G.meteors.push({ x: P.x + Math.cos(a) * step * (i + 0.6), y: P.y + Math.sin(a) * step * (i + 0.6), delay: 0.06 * i + 0.1, fall: 0.1,
      r: s.radius * (1 + i * 0.05), inst, s, mult: i === n - 1 ? 1.5 : 1 });
  }
  return true;
}
