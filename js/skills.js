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
  const speedMul = (G.buffs.acceleration > 0 ? 1.4 : 1) * (P.mods.ks.rage ? 1 + P.rage * 0.005 : 1) * (1 + P.flaskFx.speed);
  if (G.input.vaal) { G.input.vaal = false; unleashVaal(); }
  else if (P.skills.some((s) => s.evo && s.souls >= vaalSouls())) showTip('vaal');
  for (const inst of P.skills) {
    const s = inst.st;
    if (inst.vaalT > 0) inst.vaalT -= dt;
    if (s.behavior === 'aura') { tickAura(inst, s, dt); continue; }
    if (s.behavior === 'herald') continue;          // works through on-kill only
    if (s.behavior === 'orbit') updateOrbit(inst, s, dt);
    if (s.behavior === 'brand') updateBrands(inst, s, dt);
    if (s.behavior === 'spin') inst.rt.spin = (inst.rt.spin || 0) + dt * 12;
    inst.timer -= dt * speedMul * (inst.vaalT > 0 ? 2.5 : 1);
    if (inst.timer <= 0) {
      // Ruthless: every 3rd attack is a Ruthless Blow (its hits land within this instant)
      if (s.ruthless && (inst.rt.rc || 0) % 3 === 2) inst.rt.ruthT = G.time + 0.12;
      if (castSkill(inst, s)) {
        inst.rt.rc = (inst.rt.rc || 0) + 1;
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
    case 'strike': return castStrike(inst, s);
    case 'slam': return castSlam(inst, s);
    case 'beam': return castBeam(inst, s);
  }
  return false;
}

// ---------------- Projectiles ----------------
function castProjectiles(inst, s) {
  const P = G.player;
  let base;
  if (s.pattern === 'ring') {
    if (!nearestEnemy(P.x, P.y, 420)) return false;
    base = P.facing;
  } else {
    const tgt = s.aim === 'random' ? (randomEnemyNear(P.x, P.y, 480) || nearestEnemy(P.x, P.y, 650)) : nearestEnemy(P.x, P.y, 650);
    if (!tgt) return false;
    base = angleTo(P.x, P.y, tgt.x, tgt.y);
  }
  const n = s.proj;
  for (let i = 0; i < n; i++) {
    let a;
    if (s.pattern === 'ring') a = base + (i * TAU) / n;
    else if (n === 1) a = base;
    else {
      const total = Math.min(s.spread * (n - 1), s.wander ? 2.6 : 1.8);
      a = base - total / 2 + (total * i) / (n - 1);
    }
    if (s.wander) a += rand(-0.15, 0.15);
    spawnProjectile(inst, s, P.x, P.y, a, null);
  }
  return true;
}

function spawnProjectile(inst, s, x, y, a, hitSet) {
  const sp = s.speedFinal;
  G.projectiles.push({
    x, y, ox: x, oy: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a, t: 0, life: s.lifeFinal, r: s.size,
    pierce: s.pierce, chain: s.chain, forked: false, hit: hitSet ? new Set(hitSet) : new Set(),
    inst, s, wt: 0, dead: false, zt: 0, child: false, returned: false,
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
    if (p.s.wander) {
      p.wt -= dt;
      if (p.wt <= 0) {
        p.wt = 0.1 + Math.random() * 0.1;
        const sp = Math.hypot(p.vx, p.vy);
        const tgt = p.s.seek ? nearestEnemy(p.x, p.y, 320) : null;
        if (tgt) p.a = angleTo(p.x, p.y, tgt.x, tgt.y) + rand(-0.45, 0.45);
        else p.a += rand(-0.9, 0.9);
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
  if (!G.player.mods.ks.pointBlank) return 1;
  const d = Math.hypot(p.x - p.ox, p.y - p.oy);
  return clamp(1.5 - (d / 500) * 0.8, 0.7, 1.5);
}

function onProjectileHit(p, e) {
  const s = p.s;
  p.hit.add(e.id);
  // Freezing Pulse fades with distance travelled
  const mult = (s.tags.has('Projectile') ? pointBlankMult(p) : 1) * (s.decay ? Math.max(0.25, 1 - p.t / p.life) : 1);
  if (s.explode) explodeAt(p, p.x, p.y, mult);
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
    }
    p.dead = true; p.noExplodeOnExpire = true;
    return;
  }
  if (p.chain > 0) {
    const nxt = nearestEnemy(p.x, p.y, 320, p.hit);
    if (nxt) {
      p.chain--;
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
  for (let i = 0; i < p.s.split; i++) {
    spawnProjectile(p.inst, p.s, p.x, p.y, rand(0, TAU), p.hit);
    const np = G.projectiles[G.projectiles.length - 1];
    np.child = true; np.life = p.s.lifeFinal * 0.6; np.ox = p.ox; np.oy = p.oy;
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
    if (!b.target || b.target.dead) b.target = nearestEnemy(b.x, b.y, 260);
    if (b.target) { b.x = b.target.x; b.y = b.target.y; }
    b.act -= dt * (1 + s.speedInc * 0.5);
    if (b.act > 0 || !b.target) continue;
    b.act = s.hitCd;
    if (s.brand === 'chain') {
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
  addEffect({ kind: 'spark', x: tgt.x, y: tgt.y, r: 22, t: 0, dur: 0.18, color: s.color });
  const n = s.balls + s.proj;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), d = rand(30, 110);
    G.meteors.push({ x: tgt.x + Math.cos(a) * d, y: tgt.y + Math.sin(a) * d, delay: 0.25 + i * 0.03, fall: 0.25, r: s.radius, inst, s, mult: 0.6 });
  }
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
  inst.rt.beamA = cur + clamp(da, -0.6, 0.6);           // sweeps instead of snapping
  inst.rt.beamT = G.time + 0.25;
  const ax = Math.cos(inst.rt.beamA), ay = Math.sin(inst.rt.beamA), L = s.range;
  const w = s.size * Math.sqrt((1 + s.areaInc) * s.areaMore);
  G.hash.query(P.x + ax * L / 2, P.y + ay * L / 2, L / 2 + 40, _beamList);
  for (const e of _beamList) {
    if (e.dead) continue;
    const rx = e.x - P.x, ry = e.y - P.y, along = rx * ax + ry * ay;
    if (along < 0 || along > L) continue;
    if (Math.abs(rx * ay - ry * ax) < w + e.r) hitEnemy(e, s, inst, 1, P.x, P.y);
  }
  return true;
}
