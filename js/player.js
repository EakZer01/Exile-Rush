'use strict';
// ============================================================
//  Player: stats, movement, Flame Dash, flasks, pickups, XP
// ============================================================
function defaultMods() {
  return {
    lifeInc: 0, lifeMore: 1, moveInc: 0, moveMore: 1,
    incSpell: 0, incAttack: 0, incProj: 0, incAoE: 0, incMinion: 0,
    incPhys: 0, incEle: 0, incChaos: 0, incDot: 0,
    critAdd: 0, critMulti: 0, speedInc: 0, areaInc: 0, durInc: 0, projSpeedInc: 0,
    regen: 0.002, pickupInc: 0, xpInc: 0, dmgTaken: 1, evade: 0, leech: 0, minionSpeed: 0,
    flaskCharge: 0, flaskEff: 0, ks: {},
    // ascendancy
    projAdd: 0, pierceAdd: 0, chainAdd: 0, igniteAdd: 0, shockAdd: 0, poisonAdd: 0, ailDurInc: 0, shockEffInc: 0,
    burnMore: 1, moreEle: 1, dotMore: 1, moreMinion: 1, moreAll: 1, moreVsRare: 1, vsIgnited: 1,
    minionCount: 0, minionLeech: 0, cullAdd: 0, dmgCap: 0, leechCap: 1, flaskRegen: 0, dashCdMul: 1,
    lifeOnKill: 0, skillSlots: 0, extraChoices: 0,
    // legacy tree keystones
    evolveLevelAdd: 0, vaalSoulMul: 1, unevolvedMore: 1, nonMinionMore: 1,
    gemLevel: 0, flaskGainMore: 1,
    // run-path masteries
    projReturn: false, noAilment: false, ailMore: 1, ailDurMore: 1, spellSpeed: 0, attackSpeed: 0, physMore: 1,
    incFire: 0, incCold: 0, incLight: 0, curseEff: 0,
    // unique item hooks
    brandAdd: 0, brandSpeed: 0, heraldMore: 1, beamRange: 0, beamMore: 1, summonAdd: 0, poisonMore: 1, aftershockAdd: 0,
    skillHooks: [], keystoneAdd: 0,
    // gear defences
    lifeFlat: 0, armour: 0, evasion: 0, es: 0, esInc: 0, block: 0, esRechargeInc: 0,
    // resistances (fractions) and their caps
    resFire: 0, resCold: 0, resLight: 0, resChaos: 0, maxRes: 0, maxResChaos: 0,
  };
}

// about 40–50 levels per run: early levels come quickly, later ones take longer
const xpReq = (lv) => Math.floor((5 + (lv - 1) * 5 + Math.pow(lv - 1, 2) * 0.32) * Math.min(6, 1.8 + (lv - 1) * 0.28));
const LIFE_PER_LEVEL = 7;

function createPlayer(cls) {
  return {
    x: 0, y: 0, vx: 0, vy: 0, r: 14, cls, baseLife: cls.life, life: cls.life, maxLife: cls.life,
    facing: 0, flickerPaused: false, flickerIdle: 0, skills: [], passives: {}, keystones: {}, level: 1, xp: 0, xpNext: xpReq(1),
    mods: defaultMods(), iframes: 0, dashCd: 0, dashT: 0, dashVx: 0, dashVy: 0, hurtFlash: 0, leechPool: 0,
    flasks: [null, null, null, null, null],
    flaskFx: { move: 0, speed: 0, armour: 0, armourMul: 1, evasion: 0, evMul: 1, dmgMore: 1, critMul: 1 },
    armour: 0, evasion: 0, es: 0, maxES: 0, esDelay: 0, block: 0, weapon: null,
    resRaw: { fire: 0, cold: 0, lightning: 0, chaos: 0 }, resCap: { fire: 0.75, cold: 0.75, lightning: 0.75, chaos: 0.75 },
    currency: { chaos: 3, jeweller3: 0, jeweller4: 0, jeweller5: 0, jeweller6: 0, regal: 0, exalt: 0, divine: 0, annul: 0, whetstone: 0, scrap: 0, vaal: 0 }, dead: false, moveSpeed: 200, pickupR: 75, killedBy: '',
    // ascendancy state
    asc: null, ascNodes: [], rage: 0, rageDecay: 0, aegis: 0, aegisCd: 0, retaliateCd: 0, thunderT: 2.5,
    critT: 0, frenzyT: 0, revives: 0, masteries: [], extraSlots: 0,
    essences: {},
    equip: { weapon: null, offhand: null, helm: null, body: null, gloves: null, boots: null, belt: null, amulet: null, ring: null, ring2: null }, backpack: [], newItems: 0,
  };
}

// every modifier source for a given set of equipment (the item comparison uses other sets)
function buildPlayerMods(equip) {
  const P = G.player, m = defaultMods();
  P.cls.apply(m);
  applyMetaMods(m);
  for (const id in P.passives) for (let i = 0; i < P.passives[id]; i++) PASSIVES[id].apply(m);
  for (const id in P.keystones) KEYSTONES[id].apply(m);
  for (const id of P.ascNodes) ASC_NODES[id].apply(m);
  for (const id of P.masteries) MASTERY_OPT[id].apply(m);
  m.skillSlots += P.extraSlots;
  for (const slot of ITEM_SLOTS) if (equip[slot]) applyItem(equip[slot], m);
  const fx = G.mapFx;
  m.lifeMore *= fx.pLife; m.regen *= fx.pRegen; m.leechCap *= fx.pRegen; m.flaskGainMore *= fx.pFlask;
  return m;
}

function recomputePlayer() {
  const P = G.player;
  const ratio = P.maxLife > 0 ? P.life / P.maxLife : 1;
  const m = buildPlayerMods(P.equip), fx = G.mapFx;
  P.mods = m;
  P.weapon = P.equip.weapon ? itemProps(P.equip.weapon) : null;
  P.armour = m.armour; P.evasion = m.evasion; P.block = Math.min(0.5, m.block);
  const esRatio = P.maxES > 0 ? P.es / P.maxES : 1;
  P.maxES = m.es * (1 + m.esInc);
  P.maxLife = (P.baseLife + LIFE_PER_LEVEL * (P.level - 1) + m.lifeFlat) * (1 + m.lifeInc) * m.lifeMore;
  // Chaos Inoculation: life becomes Energy Shield, chaos can't touch you
  if (m.ks.ci) { P.maxES += P.maxLife * 1.3; P.maxLife = 1; }
  // keep the same fraction of Energy Shield when the maximum changes (level-ups, gear swaps)
  P.es = Math.min(P.maxES, esRatio * P.maxES);
  P.life = Math.min(P.maxLife, ratio * P.maxLife);
  // resistances: map tier lowers them (like PoE's act penalty), capped at 75% + max res
  const pen = resPenalty(G.map.tier), capE = 0.75 + m.maxRes - fx.pMaxRes;
  P.resRaw = { fire: m.resFire - pen, cold: m.resCold - pen, lightning: m.resLight - pen, chaos: m.resChaos - pen };
  P.resCap = { fire: capE, cold: capE, lightning: capE, chaos: 0.75 + m.maxResChaos - fx.pMaxRes };
  P.moveSpeed = 200 * (1 + m.moveInc) * m.moveMore;
  P.pickupR = 90 * (1 + m.pickupInc);
  for (const inst of P.skills) inst.st = buildSkillStats(inst, P);
}

function updatePlayer(dt) {
  const P = G.player;
  const inp = G.input;
  if (flickerMovementIntent() || P.flickerPaused) cancelFlicker();
  else P.flickerIdle = Math.min(0.3, P.flickerIdle + dt);
  let ix = 0, iy = 0;
  if (inp.left) ix -= 1; if (inp.right) ix += 1; if (inp.up) iy -= 1; if (inp.down) iy += 1;
  if (inp.joy) { ix = inp.joy.x; iy = inp.joy.y; }
  const il = Math.hypot(ix, iy);
  if (il > 1) { ix /= il; iy /= il; }
  if (il > 0.1) P.facing = Math.atan2(iy, ix);

  let spd = P.moveSpeed;
  spd *= 1 + P.flaskFx.move;
  if (G.buffs.acceleration > 0) spd *= 1.4;

  if (P.dashT > 0) {
    P.dashT -= dt;
    P.vx = P.dashVx; P.vy = P.dashVy;
    if (Math.random() < 0.8) addEffect({ kind: 'trail', x: P.x, y: P.y, r: 12, t: 0, dur: 0.35, color: '#ff8a3d' });
    emit('ember', P.x, P.y, 2, { jitter: 6 });
  } else {
    P.vx = ix * spd; P.vy = iy * spd;
  }
  P.x = clampArena(P.x + P.vx * dt, P.r); P.y = clampArena(P.y + P.vy * dt, P.r);

  if (P.iframes > 0) P.iframes -= dt;
  if (P.dashCd > 0) P.dashCd -= dt;
  if (P.hurtFlash > 0) P.hurtFlash -= dt;

  // Flame Dash
  if (inp.dash && P.dashCd <= 0) {
    inp.dash = false;
    const a = il > 0.1 ? Math.atan2(iy, ix) : P.facing;
    P.dashVx = Math.cos(a) * 1100; P.dashVy = Math.sin(a) * 1100;
    P.dashT = 0.16; P.iframes = 0.3; P.dashCd = 3 * P.mods.dashCdMul;
    if (P.mods.ks.shadowstep) P.critT = 1.5;
    emit('ember', P.x, P.y, 14, { speed: 1.5 });
    Sfx.play('dash');
  }
  inp.dash = false;

  updateFlasks(dt);
  // Energy Shield recharges after 2 s without taking damage
  if (P.esDelay > 0) P.esDelay -= dt;
  else if (P.es < P.maxES) P.es = Math.min(P.maxES, P.es + P.maxES * 0.25 * (1 + P.mods.esRechargeInc) * dt);

  // regen + leech
  const lowRegen = P.mods.ks.lowRegen && P.life < P.maxLife * 0.35 ? 3 : 1;
  // under Chaos Inoculation, regeneration and leech refill Energy Shield instead of life
  const ci = P.mods.ks.ci, pool = ci ? P.maxES : P.maxLife;
  if (!P.mods.ks.vaalPact) { const r = pool * P.mods.regen * lowRegen * dt; if (ci) P.es = Math.min(P.maxES, P.es + r); else P.life += r; }
  if (P.leechPool > 0) {
    const cap = pool * (P.mods.ks.vaalPact ? 0.2 : 0.08) * P.mods.leechCap * dt;
    const amt = Math.min(P.leechPool, cap);
    if (ci) P.es = Math.min(P.maxES, P.es + amt); else P.life += amt;
    P.leechPool -= amt;
    P.leechPool = Math.min(P.leechPool, pool * 0.5);
  }
  if (P.life > P.maxLife) P.life = P.maxLife;

  updateAscendancy(dt);
  updatePickups(dt);
  updateItems(dt);
}

function updatePickups(dt) {
  const P = G.player;
  const R2 = P.pickupR * P.pickupR;
  for (let i = G.orbs.length - 1; i >= 0; i--) {
    const o = G.orbs[i];
    const d2 = dist2(o.x, o.y, P.x, P.y);
    if (!o.pull && d2 < R2) o.pull = true;
    if (o.pull) {
      // fly straight at the player, speeding up — steering (not accelerating sideways) so orbs never orbit
      const d = Math.sqrt(d2) || 1;
      o.sp = Math.min(1400, (o.sp || 250) + 1800 * dt);
      const step = o.sp * dt;
      if (d <= step + P.r + 8) { o.x = P.x; o.y = P.y; } else { o.x += ((P.x - o.x) / d) * step; o.y += ((P.y - o.y) / d) * step; }
      if (d <= step + P.r + 8) {
        gainXp(o.v);
        Sfx.play('pickup');
        G.orbs[i] = G.orbs[G.orbs.length - 1]; G.orbs.pop();
      }
    }
  }
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const it = G.pickups[i];
    it.t += dt;
    const d2 = dist2(it.x, it.y, P.x, P.y);
    if (d2 < (P.pickupR * 0.6) * (P.pickupR * 0.6)) {
      const d = Math.sqrt(d2) || 1;
      it.x += ((P.x - it.x) / d) * 380 * dt; it.y += ((P.y - it.y) / d) * 380 * dt;
    }
    if (d2 < (P.r + 12) * (P.r + 12)) {
      collectPickup(it.kind, it.x, it.y, it);
      G.pickups.splice(i, 1);
    }
  }
}

function collectPickup(kind, x, y, it) {
  const P = G.player, def = it ? pickupDef(it) : PICKUPS[kind];
  Sfx.play('currency');
  addText(x, y - 20, def.name, def.color, 1.1);
  emit('gold', x, y, 14, { color: def.color });
  if (def.craft) { P.currency[kind] = (P.currency[kind] || 0) + 1; showTip(JEWELLERS[kind] ? 'jeweller' : 'craft'); }
  else if (kind === 'chaos') P.currency.chaos++;
  else if (kind === 'life') P.life = Math.min(P.maxLife, P.life + P.maxLife * 0.3);
  else if (kind === 'magnet') for (const o of G.orbs) o.pull = true;
  else if (kind === 'chest') { if (it && it.boss) G.pendingChests++; else openChestInstant(x, y); }
  else if (kind === 'map') collectMap(it.map);
  else if (kind === 'essence') { P.essences[it.ess] = (P.essences[it.ess] || 0) + 1; lootLog(def.name, def.color); showTip('essence'); }
  else if (kind === 'scarab') collectScarab(it.scarab);
}

function gainXp(v) {
  const P = G.player;
  P.xp += v * (1 + P.mods.xpInc);
  while (P.xp >= P.xpNext) {
    P.xp -= P.xpNext;
    P.level++;
    P.xpNext = xpReq(P.level);
    G.pendingLevels++;
    emit('gold', P.x, P.y, 30, { speed: 1.5, jitter: 10 });
  }
  if (G.pendingLevels) recomputePlayer();
}

// ---- Ascendancy runtime: timers, Rage, Divine Aegis, Thunderclap ----
function updateAscendancy(dt) {
  const P = G.player, ks = P.mods.ks;
  if (P.critT > 0) P.critT -= dt;
  if (P.frenzyT > 0) P.frenzyT -= dt;
  if (P.retaliateCd > 0) P.retaliateCd -= dt;
  if (P.mods.flaskRegen) flaskGain(P, P.mods.flaskRegen * dt);
  if (ks.rage && P.rage > 0) {
    P.rageDecay -= dt;
    if (P.rageDecay <= 0) { P.rage = Math.max(0, P.rage - 6 * dt); }
  }
  if (ks.aegis && !P.aegis) {
    P.aegisCd -= dt;
    if (P.aegisCd <= 0) { P.aegis = 1; emit('gold', P.x, P.y, 12, { color: '#ffe9a0', jitter: 14 }); }
  }
  if (ks.thunder) {
    P.thunderT -= dt;
    if (P.thunderT <= 0) {
      P.thunderT = 2.5;
      const s = procStats('thunder');
      const list = enemiesInRadius(P.x, P.y, 380, []);
      for (let i = 0; i < 4 && list.length; i++) {
        const e = list.splice(Math.floor(Math.random() * list.length), 1)[0];
        hitEnemy(e, s, null, 1, e.x, e.y - 10);
        addEffect({ kind: 'bolt', pts: [[e.x + rand(-20, 20), e.y - 260], [e.x + rand(-12, 12), e.y - 120], [e.x, e.y]], t: 0, dur: 0.2, color: '#fff27a' });
        emit('spark', e.x, e.y, 6);
      }
    }
  }
}

// Synthetic stat block for damage that doesn't come from a gem
// (Thunderclap, Retribution, death bursts). Scales with level and mods.
function procStats(kind, dmgOverride) {
  const P = G.player, m = P.mods;
  const lv = P.level;
  const base = dmgOverride !== undefined ? dmgOverride : 10 + lv * 5;
  const type = kind === 'thunder' ? 'lightning' : kind === 'poison' ? 'chaos' : 'fire';
  const inc = 1 + (type === 'chaos' ? m.incChaos : m.incEle) + (kind === 'thunder' || kind === 'retaliate' ? m.incSpell : 0);
  const more = (type === 'chaos' ? 1 : m.moreEle) * m.moreAll;
  const hit = {}; hit[type] = base * (dmgOverride !== undefined ? 1 : inc * more);
  return {
    hit, tags: new Set(kind === 'thunder' ? ['Spell', 'Lightning'] : ['AoE']), critChance: 0.05, critMulti: 1.5, vsChilled: 1,
    noAilment: false, ignite: type === 'fire' ? 0.2 : 0, shock: type === 'lightning' ? 0.5 : 0, poison: type === 'chaos' ? 0.6 : 0,
    burnMore: 1, dotMul: 1 + m.incDot, ailmentDur: 1, chillEff: 1, shockEff: 1 + m.shockEffInc, knock: 0, leech: 0, cull: 0, proc: true,
  };
}
