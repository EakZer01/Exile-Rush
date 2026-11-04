'use strict';
// ============================================================
//  Enemies: spawning director, AI, ailments ticking, bosses,
//  hazards (telegraphed boss attacks), shrines, events
// ============================================================

function makeEnemy(type, x, y, rarity) {
  const d = MONSTERS[type];
  const min = gameMin();
  const hpMul = hpScale(min) * (rarity === 1 ? 3.2 : rarity === 2 ? 9 : 1);
  const M = G.map, fx = G.mapFx;
  const mapHp = tierHp(M.tier) * fx.monHp * (BIOMES[M.biome].hpMul || 1);
  const e = {
    id: uid(), type, def: d, x, y, kx: 0, ky: 0,
    r: d.r * (rarity === 2 ? 1.4 : rarity === 1 ? 1.15 : 1),
    hp: d.hp * hpMul * mapHp * endHp(), maxHp: d.hp * hpMul * mapHp * endHp(),
    speed: d.speed * rand(0.9, 1.1) * fx.monSpeed * speedScale(min), dmg: d.dmg * dmgScale(min) * tierDmg(M.tier) * fx.monDmg * endDmg(),
    color: d.color, shape: d.shape, xp: d.xp * (rarity === 1 ? 4 : rarity === 2 ? 25 : 1),
    rarity, mods: [], name: null, elem: d.elem || 'physical',
    res: { physical: 0, fire: 0, cold: 0, lightning: 0, chaos: 0 }, dmgTakenMul: 1, regen: 0,
    ign: { dps: 0, t: 0, src: null }, chill: { eff: 0, t: 0 }, freeze: 0, shock: { eff: 0, t: 0 }, poison: [], bleeds: [],
    hitCd: {}, contactCd: 0, flash: 0, dotAcc: 0, dotShowT: 0, rcd: rand(1, 2.5), wob: rand(0, TAU), dead: false,
  };
  if (fx.eleResAdd) e.res.fire = e.res.cold = e.res.lightning = fx.eleResAdd;
  if (fx.physResAdd) e.res.physical = fx.physResAdd;
  if (fx.deathBoomAdd && Math.random() < fx.deathBoomAdd) e.deathBoom = true;
  if (fx.eleConvert && e.elem === 'physical' && Math.random() < 0.5) e.elem = pick(['fire', 'cold', 'lightning']);
  // deep-tier monsters always carry their own mechanic; the deep map mods share them with the rest
  if (d.carapace) e.carapaceHp = e.carapaceMax = d.carapace.hits;
  else if (fx.chitinousAdd && Math.random() < fx.chitinousAdd) e.carapaceHp = e.carapaceMax = 3;
  if (d.enrage) e.enrageFx = d.enrage;
  else if (fx.enrageAdd && Math.random() < fx.enrageAdd) e.enrageFx = { speed: 0.012, dmg: 0.01, cap: 1.6 };
  if (fx.vortexAdd && !d.vortex && Math.random() < fx.vortexAdd) e.vortexFx = { r: 240, pull: 55 };
  if (fx.juggernautAdd && !d.unstoppable && Math.random() < fx.juggernautAdd) e.unstoppable = true;
  if (e.unstoppable || d.unstoppable) { e.unstoppable = true; e.ailImmune = true; }
  if (rarity === 1) {
    addMod(e, pick(MAGIC_MODS));
  } else if (rarity === 2) {
    e.name = rareName();
    const keys = shuffle(Object.keys(MONSTER_MODS)).slice(0, randi(2, 3) + (min > 9 ? 1 : 0) + (fx.rareModAdd || 0));
    for (const k of keys) addMod(e, k);
  }
  return e;
}
function addMod(e, k) { e.mods.push(k); MONSTER_MODS[k].apply(e); }
// the mechanics a monster runs: its own def flags first, then the deep-mod rolls
function mech(e, k) {
  if (e.def[k]) return e.def[k];
  if (k === 'vortex') return e.vortexFx;
  if (k === 'enrage') return e.enrageFx;
  return null;
}

const MAX_ENEMIES = 520;
function spawnEnemy(type, x, y, rarity) {
  const e = makeEnemy(type, x, y, rarity || 0);
  deliriumBuff(e);
  G.enemies.push(e);
  return e;
}

function viewRadius() { return Math.hypot(G.W, G.H) / 2 / G.zoom; }
// ---- the arena: everything stays inside the square map ----
const inArena = (x, y, m) => Math.abs(x) <= ARENA - (m || 0) && Math.abs(y) <= ARENA - (m || 0);
const clampArena = (v, m) => clamp(v, -ARENA + (m || 0), ARENA - (m || 0));
// a random point d0..d1 away from (cx, cy) that lies inside the arena
function arenaPoint(cx, cy, d0, d1, margin) {
  for (let i = 0; i < 14; i++) {
    const a = rand(0, TAU), d = rand(d0, d1), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    if (inArena(x, y, margin)) return [x, y];
  }
  const a = rand(0, TAU), d = rand(d0, d1);
  return [clampArena(cx + Math.cos(a) * d, margin), clampArena(cy + Math.sin(a) * d, margin)];
}
function spawnPoint(extra) {
  const P = G.player, d = viewRadius() + 40 + (extra || 0);
  return arenaPoint(P.x, P.y, d, d + 60, 30);
}
function waveType() {
  const min = gameMin(), B = BIOMES[G.map.biome];
  let base = WAVES[0].w;
  for (const wv of WAVES) if (min >= wv.t) base = wv.w;
  // the biome reweights the wave and brings its own monsters in early
  const w = Object.assign({}, base);
  if (min >= 1.5) for (const k in B.add) w[k] = Math.max(w[k] || 0, B.add[k]);
  for (const k in B.mult) if (w[k]) w[k] *= B.mult[k];
  const keys = Object.keys(w).filter((k) => !MONSTERS[k].noWave);
  return weightedSample(keys, 1, (k) => w[k])[0];
}

function announce(text, sub, color) {
  G.announce = { text, sub: sub || '', color: color || '#e8c870', t: 0, dur: 3 };
}

// ---------------- Spawn director ----------------
function updateSpawner(dt) {
  const S = G.spawn, min = gameMin();
  const bossAlive = G.enemies.some((e) => e.rarity === 3 && !e.dead);
  const fx = G.mapFx;
  const target = Math.min((28 + min * 25) * fx.spawn, 410 * Math.min(1.2, fx.spawn)) * (bossAlive ? 0.6 : 1);
  const rate = (2.2 + min * 1.4) * fx.spawn * (bossAlive ? 0.5 : 1) * (1 + 0.6 * deliP());
  if (G.enemies.length < target) {
    S.acc += rate * dt * (G.enemies.length < target * 0.4 ? 3 : 1);
    while (S.acc >= 1) {
      S.acc -= 1;
      const [x, y] = spawnPoint();
      spawnEnemy(waveType(), x, y, 0);
    }
  }

  // magic pack
  S.magicT -= dt;
  if (S.magicT <= 0 && min >= 1) {
    S.magicT = rand(12, 17) / fx.magicRate;
    const [x, y] = spawnPoint(30), type = waveType(), n = randi(3, 5) + (min > 8 ? 2 : 0);
    for (let i = 0; i < n; i++) spawnEnemy(type, x + rand(-40, 40), y + rand(-40, 40), 1);
  }
  // rare monster
  S.rareT -= dt;
  if (S.rareT <= 0 && min >= 1.5) {
    S.rareT = rand(23, 32) / fx.rareRate;
    const [x, y] = spawnPoint(30);
    const e = spawnEnemy(waveType(), x, y, 2);
    for (let i = 0; i < 4 + (fx.rareEscortAdd || 0); i++) spawnEnemy(e.type, x + rand(-50, 50), y + rand(-50, 50), 0);
    announce('มอนสเตอร์ Rare ปรากฏตัว!', e.name, '#ffd84a');
  }
  // horde ring
  S.hordeT -= dt;
  if (S.hordeT <= 0 && min >= 2 && G.enemies.length < MAX_ENEMIES - 80) {
    S.hordeT = rand(52, 68);
    const P = G.player, type = pick(['zombie', 'skeleton', 'bat', 'wraith', 'brute']);
    const n = Math.floor(24 + min * 3), R = viewRadius() * 0.85;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const e = spawnEnemy(type, P.x + Math.cos(a) * R, P.y + Math.sin(a) * R, 0);
      e.speed *= 0.8;
    }
    announce('ฝูงมอนสเตอร์ล้อมกรอบ!', 'Horde', '#ff6a5a');
  }
  // shrines
  S.shrineT -= dt;
  if (S.shrineT <= 0 && !fx.noShrine) {
    S.shrineT = rand(30, 42);
    const P = G.player, [sx, sy] = arenaPoint(P.x, P.y, 350, 600, 80);
    G.shrines.push({ x: sx, y: sy, kind: pick(Object.keys(SHRINES)), t: 0 });
  }
  // bosses
  const nb = bossForSlot(S.bossIdx);
  if (nb && G.time >= nb.at) {
    S.bossIdx++;
    spawnBoss(nb);
  }
  // Endgame: a stronger Echo boss every ENDGAME_ECHO seconds
  if (G.endless && G.time >= G.nextEcho && !bossAlive) {
    G.nextEcho = G.time + ENDGAME_ECHO;
    spawnBoss(echoBoss(G.stats.echoes || 0));
  }
}

function bossForSlot(i) {
  if (!BOSSES[i]) return null;
  if (i === BOSSES.length - 1 && G.map.tier >= 13) return UBER_CROWN;   // the deep-tier Uber Pinnacle
  if (i === BOSSES.length - 1 && G.map.tier >= 8) return PINNACLE;
  const B = BIOMES[G.map.biome];
  return (B.bosses && B.bosses[i]) || BOSSES[i];
}
// boss phase transition: brief immunity, a summon wave and a shockwave ring
function bossPhase(e) {
  const thr = e.phases.shift();
  e.hp = e.maxHp * thr;
  e.immuneT = G.time + 2.5;
  const n = e.phases.length;
  announce(`${e.name} — ระยะที่ ${e.bossDef.phases.length - n + 1}`, 'บอสอมตะชั่วครู่และเรียกลูกน้อง!', e.bossDef.glow);
  Sfx.play('boss'); G.shake = Math.max(G.shake, 8);
  const type = e.bossDef.summon || 'volatile';
  for (let i = 0; i < 10 && G.enemies.length < MAX_ENEMIES; i++) { const a = (i / 10) * TAU; spawnEnemy(type, e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, i % 5 ? 0 : 1); }
  for (let k = 0; k < 16; k++) enemyShoot(e.x, e.y, (k / 16) * TAU, 210, e.dmg * 0.6, e.bossDef.glow, 0, e.elem);
  // and a ring of death the player must dodge into the boss to survive
  addHazard(e.x, e.y, 380, 1.8, e.dmg * 1.4, e.bossDef.glow, e.name, e.elem, { shape: 'ring', r0: 120 });
}
function spawnBoss(def) {
  const [x, y] = spawnPoint(-80);
  const min = gameMin();
  const e = makeEnemy('golem', x, y, 0);
  Object.assign(e, {
    rarity: 3, bossDef: def, name: def.name, r: def.r, hp: def.hp * bossHpMul(), maxHp: def.hp * bossHpMul(), speed: def.speed,
    dmg: def.dmg * (1 + min * 0.03) * tierDmg(G.map.tier) * G.mapFx.monDmg * G.mapFx.bossDmg,
    color: def.color, shape: 'boss', xp: 400, final: !!def.final, deathBoom: false, phases: (def.phases || []).slice(), immuneT: 0, elem: def.ptype || 'physical',
    boss: { cd: 2.5, state: 'chase', st: 0, spiral: 0, spiralA: 0, cvx: 0, cvy: 0 },
  });
  G.enemies.push(e);
  G.bossRef = e;
  Sfx.play('boss');
  announce(def.name, def.th, def.glow);
}

function bossDefeated(e) {
  spawnPickup(e.x, e.y, 'chest', { boss: true });
  spawnPickup(e.x + 30, e.y, 'chest');
  spawnPickup(e.x - 30, e.y, randomJeweller());
  spawnPickup(e.x, e.y + 30, 'chaos');
  spawnPickup(e.x, e.y - 30, 'life');
  for (let i = 0; i < 12; i++) spawnOrb(e.x + rand(-60, 60), e.y + rand(-60, 60), 8 + gameMin() * 2);
  G.stats.bosses++;
  if (G.bossRef === e) G.bossRef = null;
  if (e.bossDef.pinnacle) G.stats.pinnacle = true;
  // the Uber Crown always pays its own pinnacle-source unique
  if (e.bossDef.uber) dropSourceUnique(e.x + rand(-40, 40), e.y + rand(-40, 40), 'pinnacle');
  rollBossUniques(e);
  if (e.final) { G.victoryT = 2.5; announce('ชัยชนะ!', `คุณโค่น ${e.name} ได้แล้ว`, '#ffd84a'); }
  else if (e.bossDef.echo) {
    const before = G.stats.echoes || 0;
    G.stats.echoes = before + 1;
    spawnPickup(e.x + 40, e.y, randomCraftOrb()); spawnPickup(e.x - 40, e.y, randomCraftOrb());
    if (Math.random() < 0.5) dropItem(e.x, e.y + 50, 'unique');
    const ms = ECHO_MILESTONES.find((m) => before < m.n && G.stats.echoes >= m.n);
    announce(`${e.name} พ่ายแพ้`, ms ? `Echo ${G.stats.echoes} — ${ms.th}` : `Echo ${G.stats.echoes} · ตัวถัดไปแข็งแกร่งกว่าเดิม`, ms ? '#b060ff' : '#ffd84a');
    if (ms && ms.src) dropSourceUnique(e.x, e.y - 60, ms.src);
  } else {
    G.pendingAscend++;
    announce('การทดสอบ Ascendancy สำเร็จ!', G.player.asc ? 'ปลดล็อกโหนด Ascendancy ใหม่' : 'เลือกคลาสย่อยของคุณ', '#ffd84a');
  }
}

// ---------------- Enemy update ----------------
const _sep = [];
function updateEnemies(dt) {
  const P = G.player, far = viewRadius() * 1.6;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.encased) { e.immuneT = G.time + 0.2; continue; }   // sealed Essence monster
    // ailments
    if (e.ign.t > 0) { e.ign.t -= dt; dotDamage(e, e.ign.dps * dt, e.ign.src, '#ff8a3d', true); if (e.dead) continue; }
    if (e.poison.length) {
      let dps = 0, src = null;
      for (let i = e.poison.length - 1; i >= 0; i--) {
        const p = e.poison[i]; p.t -= dt; dps += p.dps; src = p.src;
        if (p.t <= 0) e.poison.splice(i, 1);
      }
      dotDamage(e, dps * dt, src, '#9be05a', true); if (e.dead) continue;
    }
    // Bleed: only the strongest stack hurts, unless Crimson Dance lets every stack hit at 50%
    if (e.bleeds.length) {
      let top = null, sum = 0;
      for (let i = e.bleeds.length - 1; i >= 0; i--) {
        const b = e.bleeds[i]; b.t -= dt;
        if (b.t <= 0) { e.bleeds.splice(i, 1); continue; }
        sum += b.dps; if (!top || b.dps > top.dps) top = b;
      }
      if (top) { dotDamage(e, (P.mods.ks.crimsonDance ? sum * 0.5 : top.dps) * dt, top.src, '#d83030', true); if (e.dead) continue; }
    }
    if (e.chill.t > 0) e.chill.t -= dt;
    if (e.shock.t > 0) e.shock.t -= dt;
    if (e.freeze > 0) e.freeze -= dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.punch > 0) e.punch -= dt;
    if (e.dotShowT > 0) e.dotShowT -= dt;
    if (e.contactCd > 0) e.contactCd -= dt;
    if (e.fuse) { e.fuse -= dt; if (e.fuse <= 0) { killEnemy(e, null); continue; } }
    if (e.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
    // Carapace regrows after being left alone for a while
    if (e.carapaceMax && e.carapaceHp < e.carapaceMax && (e.carapaceHitT || 0) < G.time) e.carapaceHp = e.carapaceMax;

    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;

    // relocate stragglers (survivor-genre convention) — breach monsters stay in their rift
    if (d > far && e.rarity < 3 && !e.breach && !e.ritual) {
      const [nx, ny] = spawnPoint();
      e.x = nx; e.y = ny; continue;
    }

    const buffed = e.buffT > G.time;
    let spd = e.speed * (1 - (e.chill.t > 0 ? e.chill.eff : 0)) * (buffed ? 1.3 : 1);
    if (e.freeze > 0 || e.fuse) spd = 0;
    if (e.def.stationary) spd = 0;
    if (e.unstoppable) { e.kx = 0; e.ky = 0; }   // cannot be knocked around
    let mx = dx / d, my = dy / d;

    // Void Maw: drags the player toward it while it lives (frozen maws pull weakly)
    const V = mech(e, 'vortex');
    if (V) {
      if (d < V.r && d > 24 && !P.dead) {
        const pull = V.pull * (e.rarity === 2 ? 1.3 : 1) * (e.freeze > 0 ? 0.5 : 1);
        P.x += ((e.x - P.x) / d) * pull * dt; P.y += ((e.y - P.y) / d) * pull * dt;
        if (Math.random() < 0.05) emit('wisp', P.x + rand(-10, 10), P.y + rand(-10, 10), 1);
      }
    }
    // Soul Leech: bleeds the player inside its radius and heals itself
    const L = mech(e, 'drain');
    if (L) {
      if (d < L.r && !P.dead) {
        e.drTick = (e.drTick || 0) + dt;
        if (e.drTick >= 0.5) {
          e.drTick -= 0.5;
          const amt = P.maxLife * L.dps * 0.5;
          P.life = Math.max(0, P.life - amt);
          e.hp = Math.min(e.maxHp, e.hp + amt * 0.5);
          e.drGlow = G.time + 0.6;
          emit('wisp', P.x + rand(-8, 8), P.y + rand(-8, 8), 2);
          if (P.life <= 0 && !P.dead) { P.dead = true; P.killedBy = e.name || e.def.name; P.killedElem = 'chaos'; }
        }
      }
    }
    // Furious: taking hits builds speed and damage for a while
    if (e.enrageFx) {
      if ((e.enrageUntil || 0) < G.time) e.enrageStack = 0;
      if ((e.enrageStack || 0) > 0) {
        e.enrageMul = Math.min(e.enrageFx.cap, 1 + (e.enrageFx.speed + e.enrageFx.dmg) * e.enrageStack);
        spd *= e.enrageMul;
        if (Math.random() < 0.12) emit('ember', e.x, e.y - 6, 1);
      }
    }
    if (e.def.leap && e.freeze <= 0) {
      // Ash Ghoul: crouch, then pounce in a straight line
      const L = e.def.leap;
      e.leapCd = (e.leapCd === undefined ? rand(1, L.cd) : e.leapCd) - dt;
      if (e.leapS === 'wind') { spd = 0; e.leapT -= dt; if (e.leapT <= 0) { e.leapS = 'jump'; e.leapT = L.dur; e.lvx = mx; e.lvy = my; } }
      else if (e.leapS === 'jump') { mx = e.lvx; my = e.lvy; spd = L.speed; e.leapT -= dt; if (e.leapT <= 0) e.leapS = null; }
      else if (e.leapCd <= 0 && d < L.range && d > 60) { e.leapS = 'wind'; e.leapT = L.windup; e.leapCd = L.cd * rand(0.85, 1.2); }
    }
    if (e.def.support) {
      // Bone Shaman: periodically empowers monsters around it
      e.supT = (e.supT === undefined ? rand(1, 3) : e.supT) - dt;
      if (e.supT <= 0 && e.freeze <= 0) {
        const S = e.def.support;
        e.supT = S.cd;
        for (const o of enemiesInRadius(e.x, e.y, S.r, [])) if (o.rarity < 3) o.buffT = G.time + S.dur;
        addEffect({ kind: 'ring', x: e.x, y: e.y, r: S.r, t: 0, dur: 0.45, color: '#c080ff' });
      }
      if (d < 200) { mx = -mx; my = -my; }   // keeps its distance
    }

    const D = e.def;
    if (e.rarity < 3 && e.freeze <= 0) {
      if (D.summoner) {
        // Grave Caller: raise skeletons, keep away
        e.sumT = (e.sumT === undefined ? rand(1.5, 3) : e.sumT) - dt;
        if (e.sumT <= 0 && G.enemies.length < MAX_ENEMIES - 10) {
          e.sumT = D.summoner.cd;
          for (let k = 0; k < D.summoner.n; k++) {
            const a = rand(0, TAU), m = spawnEnemy(D.summoner.type, e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, 0);
            m.xp *= 0.3; emit('wisp', m.x, m.y, 4);
          }
          addEffect({ kind: 'ring', x: e.x, y: e.y, r: 60, t: 0, dur: 0.4, color: '#a08ad0' });
        }
        if (d < 260) { mx = -mx; my = -my; }
      }
      if (D.charge) {
        // Bristleback Charger: wind up (lane is telegraphed), then rush in a straight line
        const C = D.charge;
        e.chCd = (e.chCd === undefined ? rand(1.5, C.cd) : e.chCd) - dt;
        if (e.chS === 'wind') { spd = 0; e.chT -= dt; if (e.chT <= 0) { e.chS = 'go'; e.chT = C.dur; } }
        else if (e.chS === 'go') { mx = e.cvx; my = e.cvy; spd = C.speed; e.chT -= dt; if (e.chT <= 0) e.chS = null; if (Math.random() < 0.4) emit('phys', e.x, e.y, 1); }
        else if (e.chCd <= 0 && d < C.range && d > 90) {
          e.chS = 'wind'; e.chT = C.windup; e.chCd = C.cd * rand(0.85, 1.2); e.cvx = mx; e.cvy = my;
          if (G.hazards.length < 80) addHazard(e.x, e.y, e.r * 0.8, C.windup, 0, '#ff9a6a', '', 'physical', { shape: 'line', a: Math.atan2(my, mx), len: C.speed * C.dur, ghost: true });
        }
      }
      if (D.mortar) {
        // Ember Mortar: keep range, shell where the player is heading
        const M = D.mortar;
        e.moT = (e.moT === undefined ? rand(1, M.cd) : e.moT) - dt;
        if (d < M.range * 0.55) { mx = -mx; my = -my; } else if (d < M.range * 0.9) spd *= 0.15;
        if (e.moT <= 0 && d < M.range && G.hazards.length < 80) {
          e.moT = M.cd * rand(0.85, 1.15);
          addHazard(P.x + P.vx * 0.55 + rand(-30, 30), P.y + P.vy * 0.55 + rand(-30, 30), M.r, M.warn, e.dmg * (buffed ? 1.2 : 1), '#ff7a2a', e.name || D.name, e.elem);
          emit('ember', e.x, e.y - 12, 6, { dir: -Math.PI / 2, spread: 0.4, speed: 1.5 });
        }
      }
      if (D.guard) {
        // Aegis Sentinel: shield nearby monsters (half damage taken)
        e.gT = (e.gT === undefined ? rand(1, 3) : e.gT) - dt;
        if (e.gT <= 0) {
          e.gT = D.guard.cd;
          for (const o of enemiesInRadius(e.x, e.y, D.guard.r, [])) if (o.rarity < 3) o.guardT = G.time + D.guard.dur;
          addEffect({ kind: 'ring', x: e.x, y: e.y, r: D.guard.r, t: 0, dur: 0.45, color: '#7ab8ff' });
        }
      }
      if (D.blink) {
        // Void Stalker: vanish and reappear behind the player
        e.bkT = (e.bkT === undefined ? rand(1.5, D.blink.cd) : e.bkT) - dt;
        if (e.bkT <= 0 && d > 140 && d < D.blink.range) {
          e.bkT = D.blink.cd * rand(0.85, 1.2);
          emit('wisp', e.x, e.y, 8);
          const mv = Math.hypot(P.vx, P.vy) > 20, a = (mv ? Math.atan2(P.vy, P.vx) + Math.PI : rand(0, TAU)) + rand(-0.7, 0.7);
          e.x = P.x + Math.cos(a) * 75; e.y = P.y + Math.sin(a) * 75;
          e.contactCd = Math.max(e.contactCd, 0.45); e.blinkT = G.time + 0.45;
          emit('wisp', e.x, e.y, 8);
        }
      }
      if (D.rail) {
        // Storm Bearer: paint a lightning sightline, then fire a heavy beam down it
        const R = D.rail;
        e.railCd = (e.railCd === undefined ? rand(1.5, R.cd) : e.railCd) - dt;
        if (e.railS === 'aim') {
          spd = 0; e.railT -= dt;
          if (e.railT <= 0) {
            e.railS = null; e.railCd = R.cd * rand(0.85, 1.2);
            if (G.hazards.length < 80) addHazard(e.x, e.y, e.r * 0.7, 0.01, e.dmg * 1.6, '#fff27a', e.name || D.name, 'lightning', { shape: 'line', a: e.railA, len: R.len });
            Sfx.play('boom'); G.shake = Math.max(G.shake, 2);
          }
        } else if (e.railCd <= 0 && d < R.range && d > 120) {
          e.railS = 'aim'; e.railT = R.warn; e.railA = Math.atan2(my, mx);
          if (G.hazards.length < 80) addHazard(e.x, e.y, 3, R.warn, 0, '#fff27a', '', 'lightning', { shape: 'line', a: e.railA, len: R.len, ghost: true });
        }
      }
      if (D.nest) {
        // Flesh Nest: rooted, endlessly spawns a swarm
        const N = D.nest;
        e.nestT = (e.nestT === undefined ? rand(1, N.cd) : e.nestT) - dt;
        if (e.nestT <= 0 && G.enemies.length < MAX_ENEMIES - 10) {
          e.nestT = N.cd * rand(0.85, 1.15);
          for (let k = 0; k < N.n; k++) {
            const a = rand(0, TAU), m = spawnEnemy(N.type, e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34, 0);
            m.xp *= 0.3; emit('bubble', m.x, m.y, 4);
          }
          addEffect({ kind: 'ring', x: e.x, y: e.y, r: 52, t: 0, dur: 0.4, color: '#c88a5a' });
        }
      }
      if (D.mines) {
        // Doom Sapper: plants proximity mines behind itself
        const M = D.mines;
        e.mnT = (e.mnT === undefined ? rand(1, M.cd) : e.mnT) - dt;
        if (e.mnT <= 0 && d < 500) {
          e.mnT = M.cd * rand(0.85, 1.15);
          addMine(e.x + rand(-18, 18), e.y + rand(-18, 18), M.boomR, M.fuse, e.dmg * 1.5, e.name || D.name, e.id);
        }
      }
    }
    if (e.rarity === 3) {
      const r = updateBoss(e, dt, d, mx, my);
      if (r) { mx = r[0]; my = r[1]; spd = r[2]; if (e.freeze > 0) spd *= 0.3; }
    } else if (e.def.ranged) {
      const R = e.def.ranged;
      if (d < R.range * 0.75) { const t = mx; mx = -my * 0.6 - mx * 0.4; my = t * 0.6 - my * 0.4; }
      e.rcd -= dt;
      if (e.rcd <= 0 && d < R.range * 1.15 && e.freeze <= 0) {
        e.rcd = R.cd * rand(0.85, 1.15);
        const a = Math.atan2(dy, dx), n = R.burst || 1;
        const dmg = R.dmg * dmgScale(gameMin()) * endDmg() * tierDmg(G.map.tier) * G.mapFx.monDmg * (e.rarity === 2 ? 1.5 : 1) * (buffed ? 1.2 : 1) * (e.enrageMul || 1);
        for (let i = 0; i < n; i++) enemyShoot(e.x, e.y, a + (i - (n - 1) / 2) * 0.18, R.speed, dmg, e.elem === e.def.elem || !e.def.elem && e.elem === 'physical' ? R.color : ELEM_COLOR[e.elem], R.pool ? d : 0, e.elem);
      }
    }
    if (e.def.flutter) { e.wob += dt * 8; mx += Math.cos(e.wob) * 0.5; my += Math.sin(e.wob) * 0.5; }

    if (e.maimUntil > G.time) spd *= isBoss(e) ? 0.85 : 0.7;
    if (e.winterSlowUntil > G.time) spd *= isBoss(e) ? 0.9 : 0.8;
    const oldX = e.x, oldY = e.y;
    e.x = clampArena(e.x + mx * spd * dt + e.kx * dt, e.r);
    e.y = clampArena(e.y + my * spd * dt + e.ky * dt, e.r);
    const kd = Math.exp(-9 * dt); e.kx *= kd; e.ky *= kd;

    // separation (cheap, a handful of neighbours)
    G.hash.query(e.x, e.y, e.r * 2, _sep);
    let pushed = 0;
    for (const o of _sep) {
      if (o === e || o.dead) continue;
      const ox = e.x - o.x, oy = e.y - o.y, rr = e.r + o.r;
      const dd = ox * ox + oy * oy;
      if (dd < rr * rr && dd > 0.01) {
        const dl = Math.sqrt(dd), push = (rr - dl) * 0.5 * (o.rarity === 3 ? 2 : e.rarity === 3 ? 0 : 1);
        e.x += (ox / dl) * push; e.y += (oy / dl) * push;
        if (++pushed > 5) break;
      }
    }

    reactionBlockEnemy(e, oldX, oldY, dt);

    // contact
    const cr = e.r + P.r - 2;
    if (d < cr && e.dmg > 0 && e.contactCd <= 0 && e.freeze <= 0) {
      if (e.def.explode && e.rarity < 3) { if (!e.fuse) e.fuse = 0.55; continue; }
      hurtPlayer(e.dmg * (e.enrageMul || 1) * (buffed ? 1.2 : 1) * (e.chS === 'go' ? 1.5 : 1), e.name || e.def.name, 'phys', e.elem);
      e.contactCd = e.rarity === 3 ? 0.6 : 0.8;
    }
  }
  // compact dead
  let j = 0;
  for (let i = 0; i < G.enemies.length; i++) { const e = G.enemies[i]; if (!e.dead) G.enemies[j++] = e; }
  G.enemies.length = j;
}

// pool > 0: a lobbed blob that bursts into a poison pool where the player stood
function enemyShoot(x, y, a, speed, dmg, color, pool, elem) {
  G.eproj.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: pool ? 8 : 6, dmg, color, t: 0, life: pool ? pool / speed : 4, pool: !!pool, elem: elem || 'physical' });
}
function updatePools(dt) {
  const P = G.player;
  for (let i = G.epools.length - 1; i >= 0; i--) {
    const p = G.epools[i];
    p.t += dt; p.tick -= dt;
    if (p.t >= p.dur) { G.epools.splice(i, 1); continue; }
    if (Math.random() < 0.15) emit('bubble', p.x + rand(-p.r, p.r) * 0.7, p.y + rand(-p.r, p.r) * 0.4, 1);
    if (p.tick <= 0 && dist2(p.x, p.y, P.x, P.y) < p.r * p.r) { p.tick = 0.35; hurtPlayer(p.dps * 0.35, p.src || 'แอ่งพิษ (Bile Spitter)', 'area', 'chaos'); }
  }
}
function updateEnemyProjectiles(dt) {
  const P = G.player;
  for (let i = G.eproj.length - 1; i >= 0; i--) {
    const p = G.eproj[i];
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const rr = p.r + P.r - 3;
    if (dist2(p.x, p.y, P.x, P.y) < rr * rr) { hurtPlayer(p.dmg, p.src || 'กระสุนศัตรู', 'proj', p.elem); p.t = 99; }
    if (p.t > p.life) {
      if (p.pool && G.epools.length < 30) G.epools.push({ x: p.x, y: p.y, r: 55, t: 0, dur: 4, dps: p.dmg * 1.2, tick: 0 });
      G.eproj[i] = G.eproj[G.eproj.length - 1]; G.eproj.pop();
    }
  }
}

// ---------------- Boss AI ----------------
function updateBoss(e, dt, d, mx, my) {
  const b = e.boss, P = G.player, def = e.bossDef;
  const glow = def.glow, fin = e.final;
  if (e.freeze > 0) return null;
  // enrage below 40%
  const enr = e.hp < e.maxHp * 0.4 ? 1.3 : 1;
  if (b.spiral > 0) {
    b.spiral -= dt; b.spiralT = (b.spiralT || 0) - dt;
    if (b.spiralT <= 0) {
      b.spiralT = 0.07; b.spiralA += 0.33;
      for (let k = 0; k < 3; k++) enemyShoot(e.x, e.y, b.spiralA + (k * TAU) / 3, 180, e.dmg * 0.5, glow, 0, e.elem);
    }
  }
  if (b.state === 'windup') {
    b.st -= dt;
    if (b.st <= 0) { b.state = 'charge'; b.st = 0.55; const a = Math.atan2(P.y - e.y, P.x - e.x); b.cvx = Math.cos(a); b.cvy = Math.sin(a); }
    return [0, 0, 0];
  }
  if (b.state === 'charge') {
    b.st -= dt;
    if (b.st <= 0) b.state = 'chase';
    if (Math.random() < 0.5) addEffect({ kind: 'spark', x: e.x, y: e.y, r: e.r, t: 0, dur: 0.25, color: glow });
    return [b.cvx, b.cvy, 620];
  }
  b.cd -= dt * enr;
  if (b.cd <= 0) {
    b.cd = rand(2.3, 3.4) * (fin ? 0.75 : 1);
    const pat = pick(def.patterns);
    const dmg = e.dmg, el = e.elem, src = e.name;
    const shoot = (a, sp, k) => enemyShoot(e.x, e.y, a, sp, dmg * k, glow, 0, el);
    const toP = Math.atan2(P.y - e.y, P.x - e.x);
    if (pat === 'radial') {
      const n = fin ? 28 : 18, off = rand(0, TAU);
      for (let i = 0; i < n; i++) shoot(off + (i * TAU) / n, 210, 0.55);
    } else if (pat === 'ring') {
      const n = fin ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, rr = rand(0, 140);
        addHazard(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr, 60, 1.0, dmg * 0.9, glow, src, el);
      }
      addHazard(P.x, P.y, 60, 1.0, dmg * 0.9, glow, src, el);
    } else if (pat === 'charge') {
      b.state = 'windup'; b.st = 0.7;
      // the charge lane is telegraphed so it can be side-stepped
      addHazard(e.x, e.y, e.r * 0.9, 0.7, 0, glow, src, el, { shape: 'line', a: toP, len: 380, ghost: true });
    } else if (pat === 'slam') {
      addHazard(e.x, e.y, 190, 1.0, dmg * 1.4, glow, src, el);
    } else if (pat === 'strike') {
      const n = fin ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const px = P.x + P.vx * 0.5 * (i / n) + rand(-40, 40), py = P.y + P.vy * 0.5 * (i / n) + rand(-40, 40);
        addHazard(px, py, 55, 0.8 + i * 0.2, dmg * 0.9, glow, src, el);
      }
    } else if (pat === 'summon' && G.enemies.length < MAX_ENEMIES - 20) {
      const type = def.summon || (def.ptype === 'cold' ? 'wraith' : def.ptype === 'lightning' ? 'cultist' : 'volatile');
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; spawnEnemy(type, e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, 0); }
    } else if (pat === 'spiral') {
      b.spiral = 2.2;
    } else if (pat === 'beam') {
      // three sweeping beams: a fan aimed at the player
      for (let k = -1; k <= 1; k++) addHazard(e.x, e.y, 26, 1.1 + Math.abs(k) * 0.25, dmg * 1.1, glow, src, el, { shape: 'line', a: toP + k * 0.5, len: 620 });
    } else if (pat === 'cone') {
      // frontal cleave, then a second one behind
      addHazard(e.x, e.y, 260, 0.9, dmg * 1.3, glow, src, el, { shape: 'cone', a: toP, arc: 1.4 });
      addHazard(e.x, e.y, 260, 1.7, dmg * 1.3, glow, src, el, { shape: 'cone', a: toP + Math.PI, arc: 1.4 });
    } else if (pat === 'donut') {
      // safe only close to the boss: a wide ring of death
      addHazard(e.x, e.y, 420, 1.4, dmg * 1.5, glow, src, el, { shape: 'ring', r0: 130 });
    } else if (pat === 'meteor') {
      // a huge marker that follows the player, then drops
      addHazard(P.x, P.y, 120, 1.6, dmg * 2, glow, src, el, { follow: true });
    }
  }
  return [mx, my, e.speed * enr];
}

function bossHpMul() { return tierHp(G.map.tier) * G.mapFx.bossHp * (BIOMES[G.map.biome].hpMul || 1); }
// shape: circle (default) | line {a, len} | cone {a, arc} | ring {r0} (safe inside r0)
function addHazard(x, y, r, warn, dmg, color, src, elem, shape) {
  G.hazards.push(Object.assign({ x, y, r, warn, t: 0, dmg, color, src, elem: elem || 'physical', shape: 'circle' }, shape));
}
// Proximity mines fizzle after MINE_LIFE (fading for the last MINE_FADE) and never pile up:
// at the cap the oldest one goes. owner = the Doom Sapper that planted it (null for Minefield).
const MINE_LIFE = 10, MINE_FADE = 2, MINE_MAX = 12, MINE_PER_OWNER = 3;
function addMine(x, y, r, arm, dmg, src, owner) {
  const mines = G.hazards.filter((h) => h.mine);
  const own = owner ? mines.filter((h) => h.owner === owner) : [];
  const drop = own.length >= MINE_PER_OWNER ? own[0] : mines.length >= MINE_MAX ? mines[0] : null;
  if (drop) G.hazards.splice(G.hazards.indexOf(drop), 1);
  addHazard(x, y, r, arm, dmg, '#ff9a3a', src, 'fire', { mine: true, arm, owner: owner || null });
}
function inHazard(h, px, py, pr) {
  const dx = px - h.x, dy = py - h.y, d = Math.hypot(dx, dy);
  if (h.shape === 'line') {
    const ax = Math.cos(h.a), ay = Math.sin(h.a), along = dx * ax + dy * ay;
    return along > -pr && along < h.len + pr && Math.abs(dx * ay - dy * ax) < h.r + pr * 0.5;
  }
  if (h.shape === 'cone') {
    if (d > h.r + pr * 0.5) return false;
    const da = Math.abs(((Math.atan2(dy, dx) - h.a + Math.PI * 3) % TAU) - Math.PI);
    return da < h.arc / 2;
  }
  if (h.shape === 'ring') return d > h.r0 - pr * 0.5 && d < h.r + pr * 0.5;
  return d < h.r + pr * 0.5;
}
// Burning Ground map mod: fire patches erupt near the player
function updateMapHazards(dt) {
  if (!G.mapFx.hazard || G.time < 45) return;
  G.mapHazT -= dt;
  if (G.mapHazT > 0) return;
  G.mapHazT = rand(3.5, 5.5);
  const P = G.player, a = rand(0, TAU), d = rand(0, 70);
  addHazard(P.x + Math.cos(a) * d + P.vx * 0.4, P.y + Math.sin(a) * d + P.vy * 0.4, 75, 1.2,
    (10 + G.time * GAME_PACE / 20) * tierDmg(G.map.tier), '#ff6a2a', 'พื้นลุกไหม้ (Burning Ground)', 'fire');
}
function updateHazards(dt) {
  const P = G.player;
  for (let i = G.hazards.length - 1; i >= 0; i--) {
    const h = G.hazards[i];
    h.t += dt;
    if (h.mine) {
      // Doom Sapper / Minefield: dormant while arming, then explodes when the player steps in
      if (h.t >= MINE_LIFE) { G.hazards.splice(i, 1); continue; }
      if (h.t < h.arm) continue;
      const rr = h.r * 0.9;
      if (dist2(h.x, h.y, P.x, P.y) < rr * rr) {
        hurtPlayer(h.dmg, h.src || 'กับดักระเบิด', 'area', h.elem);
        addEffect({ kind: 'boom', x: h.x, y: h.y, r: h.r, t: 0, dur: 0.3, color: h.color });
        fxExplosion(h.x, h.y, h.r, h.elem);
        G.hazards.splice(i, 1);
      }
      continue;
    }
    if (h.follow && h.t < h.warn - 0.45) { h.x += (P.x - h.x) * Math.min(1, dt * 2.2); h.y += (P.y - h.y) * Math.min(1, dt * 2.2); }
    if (h.ghost && h.t >= h.warn) { G.hazards.splice(i, 1); continue; }
    if (h.t >= h.warn) {
      if (inHazard(h, P.x, P.y, P.r)) hurtPlayer(h.dmg, h.src || 'การโจมตีของบอส', 'area', h.elem);
      if (h.shape === 'circle') addEffect({ kind: 'boom', x: h.x, y: h.y, r: h.r, t: 0, dur: 0.35, color: h.color });
      else addEffect({ kind: 'hzfire', h, t: 0, dur: 0.35, color: h.color });
      G.hazards.splice(i, 1);
    }
  }
}

// ---------------- Shrines ----------------
function updateShrines(dt) {
  const P = G.player;
  for (let i = G.shrines.length - 1; i >= 0; i--) {
    const s = G.shrines[i];
    s.t += dt;
    if (s.t > 70) { G.shrines.splice(i, 1); continue; }
    if (dist2(s.x, s.y, P.x, P.y) < 46 * 46) {
      const def = SHRINES[s.kind];
      if (s.kind === 'covetous') for (const o of G.orbs) o.pull = true;
      else G.buffs[s.kind] = def.dur;
      Sfx.play('shrine');
      announce(def.name, def.th + ' — ' + def.desc, def.color);
      addEffect({ kind: 'ring', x: s.x, y: s.y, r: 120, t: 0, dur: 0.5, color: def.color });
      G.shrines.splice(i, 1);
    }
  }
}
