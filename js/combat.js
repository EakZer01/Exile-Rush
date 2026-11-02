'use strict';
// ============================================================
//  Combat: hits, ailments (Ignite/Chill/Freeze/Shock/Poison),
//  damage over time, death & loot, player damage
// ============================================================

function isBoss(e) { return e.rarity === 3; }

// Conditional "more" multipliers from ascendancy / Vaal surge that depend
// on the target or the player's current state.
function situationalMore(e, inst) {
  const P = G.player, m = P.mods, ks = m.ks;
  let k = 1;
  if (e.ign.t > 0) k *= m.vsIgnited;
  if (e.rarity >= 2) k *= m.moreVsRare;
  if (ks.lowLifeDmg && P.life < P.maxLife * 0.5) k *= 1.4;
  if (ks.flaskDmg && anyFlaskActive(P)) k *= 1.35;
  k *= P.flaskFx.dmgMore;
  if (ks.rage) k *= 1 + P.rage * 0.01;
  if (P.frenzyT > 0) k *= 1.4;
  if (ks.hexField && dist2(e.x, e.y, P.x, P.y) < 220 * 220) k *= 1.2;
  if (inst && inst.vaalT > 0) k *= 1.5;
  return k;
}

// A "hit" from a skill. mult = situational multiplier (point blank, etc.)
function hitEnemy(e, s, inst, mult, fromX, fromY) {
  if (e.dead) return 0;
  if (e.immuneT > G.time) { if (Math.random() < 0.05) addText(e.x, e.y - e.r - 10, 'IMMUNE', '#c8c8c8', 0.8); return 0; }
  const P = G.player, ks = P.mods.ks;
  let crit = false;
  if (!ks.resolute) {
    const cc = s.critChance * P.flaskFx.critMul;
    crit = G.buffs.diamond > 0 || P.critT > 0 || Math.random() < cc || (ks.luckyCrit && Math.random() < cc);
  }
  let m = (mult || 1) * situationalMore(e, inst);
  if (crit) m *= s.critMulti;
  else if (ks.nonCritLess) m *= 0.85;
  if (e.shock.t > 0) m *= 1 + e.shock.eff;
  if ((e.chill.t > 0 || e.freeze > 0) && s.vsChilled !== 1) m *= s.vsChilled;
  if (ks.painAttune && s.tags.has('Spell') && P.life < P.maxLife * 0.5) m *= 1.4;
  m *= e.dmgTakenMul;
  if (e.guardT > G.time) m *= 0.5;                         // Aegis Sentinel shield

  if (inst && inst.rt.ruthT > G.time) m *= 2;
  if (s.closeCombat && dist2(e.x, e.y, P.x, P.y) < 160 * 160) m *= 1.35;
  if (s.fortify && !s.proc) P.fortifyT = G.time + 4;
  const curse = e.curse && e.curse.t > G.time ? e.curse : null;
  const eeType = ks.ee && e.ee && e.ee.t > G.time ? e.ee.type : null;
  let total = 0, fire = 0, cold = 0, light = 0, chaos = 0, phys = 0, mainType = 'physical', mainAmt = 0;
  for (const t in s.hit) {
    // penetration and Elemental Weakness lower resistance (not below -50%)
    let res = e.res[t] - (s.pen ? s.pen[t] || 0 : 0);
    let k = 1;
    if (curse) {
      if (curse.type === 'ele' && ELE[t]) res -= curse.eff;
      else if (curse.type === 'vuln' && t === 'physical') k *= 1 + curse.eff;
      else if (curse.type === 'despair' && t === 'chaos') k *= 1 + curse.eff;
    }
    if (eeType && ELE[t] && t !== eeType) k *= 1.3;
    const d = s.hit[t] * m * k * (1 - Math.max(-0.5, res));
    total += d;
    if (d > mainAmt) { mainAmt = d; mainType = t; }
    if (t === 'fire') fire = d; else if (t === 'cold') cold = d; else if (t === 'lightning') light = d; else if (t === 'chaos') chaos = d; else phys = d;
  }

  // ailments
  if (!s.noAilment && !e.ailImmune) {
    const boss = isBoss(e), agony = crit && ks.agony ? 1.8 : 1;
    if (fire > 0 && (crit || Math.random() < s.ignite)) {
      const dps = fire * 0.75 * s.burnMore * s.dotMul * (s.ailMore || 1) * agony;
      if (e.ign.t <= 0 || dps >= e.ign.dps) { e.ign.dps = dps; e.ign.src = inst; }
      e.ign.t = 4 * s.ailmentDur;
    }
    if (cold > 0) {
      const eff = clamp(0.3 * s.chillEff, 0, 0.6) * (boss ? 0.5 : 1);
      if (eff >= e.chill.eff || e.chill.t <= 0) e.chill.eff = eff;
      e.chill.t = 2 * s.ailmentDur;
      if (cold >= e.maxHp * (boss ? 0.12 : 0.22)) {
        if (e.freeze <= 0) emit('shard', e.x, e.y, 6);
        e.freeze = Math.max(e.freeze, boss ? 0.2 : 0.7);
      }
    }
    if (light > 0 && (crit || Math.random() < s.shock)) {
      e.shock.eff = Math.min(0.5, (boss ? 0.15 : 0.25) * (s.shockEff || 1)); e.shock.t = 3 * s.ailmentDur;
    }
    if (chaos > 0 && Math.random() < s.poison) {
      if (e.poison.length < 40) e.poison.push({ dps: chaos * 0.3 * s.dotMul * (s.ailMore || 1) * P.mods.poisonMore * agony, t: 2.5 * s.ailmentDur, src: inst });
    }
    // Bleed: physical damage over time, up to 8 stacks kept (the weakest drops off)
    if (phys > 0 && s.bleed > 0 && Math.random() < s.bleed) {
      if (e.bleeds.length >= 8) { let lo = 0; for (let i = 1; i < 8; i++) if (e.bleeds[i].dps < e.bleeds[lo].dps) lo = i; e.bleeds.splice(lo, 1); }
      e.bleeds.push({ dps: phys * 0.7 * s.dotMul * (s.ailMore || 1) * s.bleedMore * agony, t: 4 * s.ailmentDur, src: inst, burst: !!s.bloodBurst });
    }
  }

  // knockback
  if (s.knock && !isBoss(e) && fromX !== undefined) {
    const a = Math.atan2(e.y - fromY, e.x - fromX);
    const k = s.knock * (14 / e.r);
    e.kx += Math.cos(a) * k * 3; e.ky += Math.sin(a) * k * 3;
  }

  if (s.prolif && !s.proc) proliferate(e, s.prolif);
  if (s.curse) e.curse = { type: s.curse, eff: 0.25 * (1 + P.mods.curseEff), t: G.time + (ks.hexMaster ? 1e9 : 4 * s.ailmentDur) };
  if (ks.ee && ELE[mainType] && total > 0) e.ee = { type: mainType, t: G.time + 4 };
  if (s.contagion) e.contagion = { s, inst, t: G.time + 4 * s.ailmentDur };
  total *= s.hitMul || 1;
  if (s.leech) P.leechPool += total * s.leech;
  fxHit(e, mainType, crit, fromX, fromY);
  dealDamage(e, total, inst, crit, mainType);
  const impC = Math.max(ks.impale ? 0.3 : 0, s.impale || 0);
  if (impC && !e.dead && !s.proc && s.hit.physical && Math.random() < impC) {
    const amt = s.hit.physical * m * (1 - e.res.physical) * 0.6;
    G.delayed.push({ t: 0.4, fn: () => { if (!e.dead) { emit('phys', e.x, e.y, 4); dealDamage(e, amt, inst, false, 'physical'); } } });
  }
  const cullAt = Math.max(s.cull, ks.critCull && crit && !isBoss(e) ? 0.3 : 0);
  if (!e.dead && cullAt && e.hp < e.maxHp * cullAt && !(isBoss(e) && e.final)) {
    addText(e.x, e.y - e.r - 10, 'CULL', '#ff4040', 1.1);
    dealDamage(e, e.hp + 1, inst, false, mainType, true);
  }
  return total;
}

function dealDamage(e, amount, inst, crit, type, silent) {
  if (e.dead || amount <= 0 || e.immuneT > G.time) return;
  e.hp -= amount;
  if (e.phases && e.phases.length && e.hp < e.maxHp * e.phases[0]) bossPhase(e);
  e.flash = 0.07;
  if (inst) inst.dmgDealt += amount;
  G.stats.dmg += amount;
  if (!silent && G.settings.dmgNumbers) {
    if (crit) addText(e.x + rand(-6, 6), e.y - e.r - 6, fmtNum(amount) + '!', '#ffe14a', 1.25);
    else if (G.texts.length < 90) addText(e.x + rand(-6, 6), e.y - e.r - 4, fmtNum(amount), TYPE_COLOR[type] || '#fff', 0.85);
  }
  if (e.hp <= 0) killEnemy(e, inst);
}

// damage over time (no hit) — RF, clouds, ignite, poison
// ail = true for ignite/poison, whose dps already includes the hit's multipliers
function dotDamage(e, amount, inst, color, ail) {
  if (e.dead || amount <= 0 || e.immuneT > G.time) return;
  amount *= e.dmgTakenMul * (e.guardT > G.time ? 0.5 : 1) * (e.shock.t > 0 ? 1 + e.shock.eff : 1) * (ail ? 1 : situationalMore(e, inst));
  if (e.curse && e.curse.t > G.time && e.curse.type !== 'ele') amount *= 1 + e.curse.eff * 0.6;
  e.hp -= amount;
  if (e.phases && e.phases.length && e.hp < e.maxHp * e.phases[0]) bossPhase(e);
  e.dotAcc += amount;
  if (inst) inst.dmgDealt += amount;
  G.stats.dmg += amount;
  if (e.dotShowT <= 0 && e.dotAcc > 0) {
    if (G.settings.dmgNumbers && G.texts.length < 90) addText(e.x + rand(-8, 8), e.y - e.r - 2, fmtNum(e.dotAcc), color || '#ff9a5a', 0.7);
    e.dotAcc = 0; e.dotShowT = 0.5;
  }
  if (e.hp <= 0) killEnemy(e, inst);
}

function killEnemy(e, inst) {
  if (e.dead) return;
  e.dead = true;
  G.stats.kills++;
  if (inst) inst.kills++;
  const P = G.player;
  Sfx.play('kill');
  if (inst && inst.st && inst.st.onslaught) P.onslaughtT = G.time + 4;

  // flask charges
  const fc = (e.rarity === 3 ? 30 : e.rarity === 2 ? 6 : e.rarity === 1 ? 2 : 0.5) * (1 + P.mods.flaskCharge) * P.mods.flaskGainMore;
  flaskGain(P, fc);

  // experience
  // the run is shorter than its difficulty curve, so experience is scaled to match
  const minute = gameMin();
  const xpv = e.xp * (1 + minute * 0.09) * GAME_PACE;
  spawnOrb(e.x, e.y, xpv);

  // loot
  // crafting orbs
  if (e.rarity === 3) { spawnPickup(e.x + 20, e.y + 30, randomCraftOrb()); spawnPickup(e.x - 20, e.y + 30, randomCraftOrb()); }
  else if (e.rarity === 2 && Math.random() < 0.2) spawnPickup(e.x - 10, e.y + 10, randomCraftOrb());
  else if ((e.rarity === 1 || e.breach) && Math.random() < 0.012) spawnPickup(e.x, e.y, randomCraftOrb());
  onBreachKill(e);
  onLeagueKill(e);
  if (e.rarity === 2) {
    spawnPickup(e.x + 10, e.y, 'chest');
    if (Math.random() < 0.35) spawnPickup(e.x - 12, e.y + 6, randomJeweller());
    if (Math.random() < 0.22) spawnPickup(e.x, e.y - 12, 'chaos');
  } else if (e.rarity === 1) {
    if (Math.random() < 0.06) spawnPickup(e.x, e.y, 'chaos');
    if (Math.random() < 0.08) spawnPickup(e.x + 8, e.y, 'life');
  } else if (e.rarity === 0) {
    const r = Math.random();
    if (r < 0.0025) spawnPickup(e.x, e.y, 'life');
    else if (r < 0.0035) spawnPickup(e.x, e.y, 'chaos');
    else if (r < 0.0040) spawnPickup(e.x, e.y, 'magnet');
  }
  if (e.rarity === 3) bossDefeated(e);
  if (e.bleeds && e.bleeds.length) bloodBurst(e);
  rollItemDrop(e);
  rollLeagueDrops(e);
  rollScarabDrops(e);
  onKillAscendancy(e, inst);
  onKillSkills(e);

  // death effects
  const fused = e.def.explode && e.fuse !== undefined && e.fuse <= 0;
  if (e.deathBoom || fused) {
    const rare = e.rarity === 2, R = fused || !rare ? 60 : 85;
    addEffect({ kind: 'boom', x: e.x, y: e.y, r: R, t: 0, dur: 0.35, color: '#ff7a2a' });
    fxExplosion(e.x, e.y, R, 'fire'); addDecal('scorch', e.x, e.y, R / 30);
    if (dist2(e.x, e.y, P.x, P.y) < (R + P.r) * (R + P.r)) hurtPlayer(e.dmg * (fused ? 1 : rare ? 0.6 : 0.45), fused ? 'Volatile Spawn (ระเบิด)' : rare ? 'Volatile (Rare)' : 'ศพระเบิด (Map mod)', 'area', 'fire');
    Sfx.play('boom');
  }
  // Plague Bloater: a lingering poison pool · Broodmother: a swarm of scuttlers
  if (e.def.deathPool && G.epools.length < 30) {
    G.epools.push({ x: e.x, y: e.y, r: e.def.deathPool.r * (e.rarity ? 1.25 : 1), t: 0, dur: e.def.deathPool.dur, dps: e.dmg * 1.3, tick: 0.3, src: 'แอ่งพิษ (Plague Bloater)' });
    emit('bubble', e.x, e.y, 10);
  }
  if (e.def.brood && G.enemies.length < MAX_ENEMIES - 10) {
    for (let i = 0; i < e.def.brood.n + (e.rarity ? 3 : 0); i++) { const s = spawnEnemy(e.def.brood.type, e.x + rand(-25, 25), e.y + rand(-25, 25), 0); s.xp *= 0.5; }
  }
  if (e.deathSplit && G.enemies.length < MAX_ENEMIES) {
    for (let i = 0; i < 4; i++) spawnEnemy('bat', e.x + rand(-20, 20), e.y + rand(-20, 20), 0);
  }
  fxDeath(e);
}

// ---- Player damage ----
// kind: 'phys' (melee / contact), 'proj' (projectiles), 'area' (explosions, ground)
// elem: physical | fire | cold | lightning | chaos
// Block and Evasion stop attacks (not area damage), Armour reduces physical
// hits (better against small hits), resistances reduce elemental / chaos,
// Energy Shield soaks damage before life.
function effRes(P, t) {
  const fx = P.flaskFx;
  if (t === 'chaos' && P.mods.ks.ci) return 1;
  return Math.min(P.resCap[t] + (fx.maxResT ? fx.maxResT[t] || 0 : 0), P.resRaw[t] + (fx.res ? fx.res[t] || 0 : 0));
}
function logHurt(src, elem, raw, taken, how) {
  const L = G.dmgLog || (G.dmgLog = []);
  L.push({ t: G.time, src, elem, raw, taken, how });
  if (L.length > 60) L.shift();
}
function hurtPlayer(amount, src, kind, elem) {
  const P = G.player;
  kind = kind || 'phys'; elem = elem || 'physical';
  if (P.dead || P.iframes > 0) return;
  if (kind !== 'area') {
    let ev = evadeChance(P);
    if (P.mods.ks.arrowDance) ev = kind === 'proj' ? Math.min(0.9, ev + 0.4) : ev * 0.5;
    if (P.block > 0 && Math.random() < P.block) {
      addText(P.x, P.y - 24, 'Block', '#e8d8a8', 0.8); P.iframes = Math.max(P.iframes, 0.1); logHurt(src, elem, amount, 0, 'block'); return;
    }
    if (Math.random() < ev) { addText(P.x, P.y - 24, 'Evade', '#9ad2ff', 0.8); logHurt(src, elem, amount, 0, 'evade'); return; }
  }
  const ks = P.mods.ks;
  if (P.aegis) {
    P.aegis = 0; P.aegisCd = 6;
    addText(P.x, P.y - 24, 'Aegis', '#ffe9a0', 0.9);
    addEffect({ kind: 'ring', x: P.x, y: P.y, r: 40, t: 0, dur: 0.3, color: '#ffe9a0' });
    P.iframes = Math.max(P.iframes, 0.25);
    logHurt(src, elem, amount, 0, 'aegis');
    return;
  }
  let d = amount * P.mods.dmgTaken;
  if (elem === 'physical') { if (kind !== 'area') d *= 1 - armourReduction(effArmour(P), d); }
  else d *= 1 - effRes(P, elem);
  if (G.buffs.resistance > 0) d *= 0.4;
  if (ks.minionGuard && G.minions.length >= 3) d *= 0.85;
  if (ks.flaskGuard && anyFlaskActive(P)) d *= 0.7;
  if (P.fortifyT > G.time) d *= 0.8;
  if (P.skills.some((sk) => sk.st.channelGuard && sk.rt.beamT > G.time)) d *= 0.9;
  if (P.mods.dmgCap) d = Math.min(d, (P.maxLife + P.maxES) * P.mods.dmgCap);
  if (d <= 0) { logHurt(src, elem, amount, 0, 'immune'); return; }
  logHurt(src, elem, amount, d, 'hit');
  P.esDelay = 2;
  if (P.es > 0) { const a = Math.min(P.es, d); P.es -= a; d -= a; }
  if (ks.retaliate && P.retaliateCd <= 0) {
    P.retaliateCd = 1;
    burstAt(P.x, P.y, 160, procStats('retaliate'), null, '#ffe9a0');
  }
  P.life -= d;
  P.iframes = Math.max(P.iframes, 0.12);
  emit('blood', P.x, P.y, 6, { color: elem === 'physical' ? '#b01818' : ELEM_COLOR[elem], speed: 1.2 });
  P.hurtFlash = 0.18;
  G.shake = Math.min(8, G.shake + 2 + d * 0.05);
  Sfx.play('hurt');
  if (P.life <= 0) { P.life = 0; P.dead = true; P.killedBy = src; P.killedElem = elem; }
}

// ---- Floating text & effects ----
function addText(x, y, str, color, scale) {
  G.texts.push({ x, y, str, color, scale: scale || 1, t: 0, dur: 0.75, vy: -38 });
}
function addEffect(fx) { if (G.effects.length < 400) G.effects.push(fx); }

// ---- Drops ----
function spawnOrb(x, y, v) {
  if (G.orbs.length > 450) {
    // merge into an existing orb to keep things fast
    const o = G.orbs[Math.floor(Math.random() * G.orbs.length)];
    o.v += v; return;
  }
  G.orbs.push({ x: x + rand(-4, 4), y: y + rand(-4, 4), v, vx: 0, vy: 0, pull: false });
}
const PICKUPS = {
  chaos:  { name: 'Chaos Orb', th: 'สุ่มตัวเลือกเลเวลอัพใหม่ได้ 1 ครั้ง', color: '#d4b45a', icon: '✪' },
  life:   { name: 'Life Orb', th: 'ฟื้นชีวิต 30%', color: '#ff3a3a', icon: '❤' },
  magnet: { name: 'Orb of Gathering', th: 'ดูดลูกแก้วประสบการณ์ทั้งหมด', color: '#4ad0ff', icon: '⊛' },
  chest:  { name: 'Treasure Chest', th: 'สมบัติจากมอนสเตอร์ Rare', color: '#ffcf4a', icon: '▣' },
  regal:  { name: 'Regal Orb', color: '#7aa8ff', icon: '♛', craft: true },
  exalt:  { name: 'Exalted Orb', color: '#ffe8a0', icon: '✷', craft: true },
  divine: { name: 'Divine Orb', color: '#ffc8ff', icon: '✧', craft: true },
  annul:  { name: 'Orb of Annulment', color: '#c0c0d8', icon: '⊘', craft: true },
  whetstone: { name: "Blacksmith's Whetstone", color: '#d8c8a8', icon: '⚒', craft: true },
  scrap:  { name: "Armourer's Scrap", color: '#c8c0b0', icon: '⛨', craft: true },
  vaal:   { name: 'Vaal Orb', color: '#e04040', icon: '◉', craft: true },
};
for (const [id, def] of Object.entries(JEWELLERS)) PICKUPS[id] = { ...def, craft: true };
function spawnPickup(x, y, kind, extra) { G.pickups.push(Object.assign({ x, y, kind, t: 0 }, extra)); }
const pickupDef = (it) => (it.kind === 'essence' ? { name: ESSENCES[it.ess].name, color: ESSENCES[it.ess].color, icon: '◆' }
  : it.kind === 'scarab' ? { name: SCARABS[it.scarab].name, color: SCARABS[it.scarab].color, icon: '✲' }
  : it.kind === 'map' ? { name: `แผนที่ T${it.map.tier}`, color: RARITY_COLOR[it.map.rarity], icon: '▦' } : PICKUPS[it.kind]);

// Crimson Bleed: a bleeding corpse bursts for half of the bleed it had left
let _burstBudget = 40, _burstT = 0;
function bloodBurst(e) {
  let left = 0, src = null;
  for (const b of e.bleeds) if (b.burst) { left += b.dps * b.t; src = b.src; }
  if (!src || left <= 0) return;
  if (G.time - _burstT > 1 || G.time < _burstT) { _burstT = G.time; _burstBudget = 40; }
  if (_burstBudget-- <= 0) return;
  const x = e.x, y = e.y, amt = left * 0.5;
  addEffect({ kind: 'boom', x, y, r: 70, t: 0, dur: 0.3, color: '#c02020' });
  emit('blood', x, y, 12, { color: '#c02020' });
  G.delayed.push({ t: 0.05, fn: () => { for (const o of enemiesInRadius(x, y, 70, [])) dealDamage(o, amt * (1 - o.res.physical), src, false, 'physical'); } });
}

// ---- Ascendancy on-kill effects + Vaal souls ----
function burstAt(x, y, r, s, inst, color) {
  for (const e of enemiesInRadius(x, y, r, [])) hitEnemy(e, s, inst, 1, x, y);
  addEffect({ kind: 'boom', x, y, r, t: 0, dur: 0.3, color });
}
function onKillAscendancy(e, inst) {
  const P = G.player, m = P.mods, ks = m.ks;
  const souls = e.rarity === 3 ? 30 : e.rarity === 2 ? 5 : 1;
  for (const sk of P.skills) if (sk.evo && sk.souls < vaalSouls()) sk.souls = Math.min(vaalSouls(), sk.souls + souls);
  if (ks.rage) { P.rage = Math.min(30, P.rage + 1); P.rageDecay = 2; }
  if (m.lifeOnKill) { if (ks.ci) P.es = Math.min(P.maxES, P.es + P.maxES * m.lifeOnKill); else P.life = Math.min(P.maxLife, P.life + P.maxLife * m.lifeOnKill); }
  if (ks.headsman && e.rarity >= 2) { P.frenzyT = 12; addText(P.x, P.y - 30, 'Arena Champion!', '#ffd84a', 1); }
  // death bursts are delayed a beat so chain reactions ripple outward
  const x = e.x, y = e.y, R = 60 + e.r;
  if (ks.igniteBurst && e.ign.t > 0) {
    const dmg = e.maxHp * 0.2;
    G.delayed.push({ t: 0.06, fn: () => { burstAt(x, y, R, procStats('burst', dmg), null, '#ff7a2a'); fxExplosion(x, y, R, 'fire'); } });
  }
  if (ks.poisonBurst && e.poison.length) {
    const dmg = e.maxHp * 0.12;
    G.delayed.push({ t: 0.06, fn: () => { burstAt(x, y, R + 10, procStats('poison', dmg), null, '#8fdc4a'); fxExplosion(x, y, R + 10, 'chaos'); } });
  }
  if (ks.minionKillBoom && inst && SKILLS[inst.id].behavior === 'minion') {
    const dmg = inst.st.hitTotal * 1.5;
    G.delayed.push({ t: 0.06, fn: () => { burstAt(x, y, 70, procStats('burst', dmg), inst, '#ff7a2a'); fxExplosion(x, y, 70, 'fire'); } });
  }
}

// Elemental Proliferation: copy this enemy's ignite / chill / shock to its neighbours
function proliferate(e, r) {
  for (const n of enemiesInRadius(e.x, e.y, r, [])) {
    if (n === e) continue;
    if (e.ign.t > 0 && n.ign.dps < e.ign.dps) { n.ign.dps = e.ign.dps; n.ign.t = e.ign.t; n.ign.src = e.ign.src; }
    if (e.chill.t > 0 && n.chill.eff <= e.chill.eff) { n.chill.eff = e.chill.eff; n.chill.t = Math.max(n.chill.t, e.chill.t); }
    if (e.shock.t > 0 && n.shock.eff <= e.shock.eff) { n.shock.eff = e.shock.eff; n.shock.t = Math.max(n.shock.t, e.shock.t); }
  }
}

// on-kill effects of skills: Contagion spreading, Herald of Ice shatter, Herald of Ash flames
let _heraldBudget = 30, _heraldT = 0;
function heraldBudgetOk() {
  // cap herald chains so a frozen / burning horde can't stall a frame
  if (G.time - _heraldT > 1 || G.time < _heraldT) { _heraldT = G.time; _heraldBudget = 30; }
  return _heraldBudget-- > 0;
}
function onKillSkills(e) {
  if (e.contagion && e.contagion.t > G.time && G.player.skills.includes(e.contagion.inst)) {
    const c = e.contagion, x = e.x, y = e.y;
    G.delayed.push({ t: 0.08, fn: () => {
      for (const n of enemiesInRadius(x, y, 130, [])) hitEnemy(n, c.s, c.inst, 0.5, x, y);
      addEffect({ kind: 'ring', x, y, r: 130, t: 0, dur: 0.3, color: '#a8e05a' });
    } });
  }
  const ice = (e.chill.t > 0 || e.freeze > 0) && G.player.skills.find((s) => s.st.herald === 'ice' && !s.st.disabled);
  if (ice && heraldBudgetOk()) {
    const x = e.x, y = e.y, s = ice.st;
    G.delayed.push({ t: 0.07, fn: () => {
      for (const n of enemiesInRadius(x, y, s.radius, [])) hitEnemy(n, s, ice, 1, x, y);
      addEffect({ kind: 'boom', x, y, r: s.radius, t: 0, dur: 0.3, color: '#9fe0ff' });
      emit('shard', x, y, 8); Sfx.play('shatter');
    } });
  }
  // the burst always ignites, so the flames keep jumping from corpse to corpse
  const ash = e.ign.t > 0 && G.player.skills.find((s) => s.st.herald === 'ash' && !s.st.disabled);
  if (ash && heraldBudgetOk()) {
    const x = e.x, y = e.y, s = ash.st;
    G.delayed.push({ t: 0.1, fn: () => {
      for (const n of enemiesInRadius(x, y, s.radius, [])) hitEnemy(n, s, ash, 1, x, y);
      addEffect({ kind: 'boom', x, y, r: s.radius, t: 0, dur: 0.35, color: '#ff7a2a' });
      emit('ember', x, y, 12, { speed: 1.4 }); Sfx.play('boom', 1.3);
      addDecal('scorch', x, y, s.radius / 45);
    } });
  }
}
