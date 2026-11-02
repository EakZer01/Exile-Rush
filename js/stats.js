'use strict';
// ============================================================
//  Skill stat compilation: base gem + gem level + supports + passives
//  The result (a "stat block") is cached on the skill instance and
//  rebuilt whenever the build changes.
// ============================================================
const DMG_TYPES = ['physical', 'fire', 'cold', 'lightning', 'chaos'];
const ELE = { fire: true, cold: true, lightning: true };
const TYPE_COLOR = { physical: '#e6e0d0', fire: '#ff8a3d', cold: '#7fd8ff', lightning: '#fff27a', chaos: '#b56cff' };

function newSkillInstance(id) {
  return { id, uid: uid(), level: 1, supports: [], sockets: START_SOCKETS, timer: 0.3, dmgDealt: 0, kills: 0, st: null, rt: {},
    evo: false, awakened: [], souls: 0, vaalT: 0 };
}

function skillTags(inst, p = G.player) {
  const set = new Set(SKILLS[inst.id].tags);
  for (const sid of activeSupports(inst, p).active) for (const t of SUPPORTS[sid].addTags) set.add(t);
  return set;
}

// Can support `supId` be socketed into skill `inst`? returns '' if ok, else a reason (Thai)
function supportBlockReason(supId, inst, ignoreSockets) {
  const sup = SUPPORTS[supId];
  if (!sup) return 'ไม่พบ Support นี้';
  if (inst.supports.includes(supId)) return 'ใส่ไว้แล้ว';
  for (const c of sup.conflicts) if (inst.supports.includes(c)) return 'ใช้ร่วมกับ ' + SUPPORTS[c].name + ' ไม่ได้';
  const tags = skillTags(inst);
  if (sup.req.length && !sup.req.some((t) => tags.has(t))) return 'ต้องมีแท็ก ' + sup.req.join(' / ');
  if (sup.excl.some((t) => tags.has(t))) return 'ใช้กับสกิล ' + sup.excl.filter((t) => tags.has(t)).join('/') + ' ไม่ได้';
  if (!ignoreSockets) {
    const act = activeSupports(inst);
    if (inst.supports.length >= MAX_SOCKETS) return 'เต็มเพดาน 6 Support แล้ว · เลือกแทนที่เจมเดิม';
    if (inst.supports.length >= act.so.cap) return `เต็ม ${act.so.cap} ช่อง · ใช้ Jeweller ระดับสูงกว่าที่ I → ช่อง Support หรือเลือกแทนที่เจมเดิม`;
  }
  return '';
}

function buildSkillStats(inst, p) {
  const def = SKILLS[inst.id], b = def.base, m = p.mods;
  const tags = skillTags(inst, p);
  const s = {
    id: inst.id, uid: inst.uid, behavior: def.behavior, tags, color: def.color, core: def.core,
    dmg: b.dmg, types: Object.assign({}, b.types),
    added: { physical: 0, fire: 0, cold: 0, lightning: 0, chaos: 0 },
    cd: b.cd || 0, proj: b.proj || 0, speed: b.speed || 0, life: b.life || 0, size: b.size || 6,
    spread: b.spread !== undefined ? b.spread : 0.2, pierce: b.pierce || 0, chain: b.chain || 0, fork: false,
    area: b.area || 0, duration: b.duration || 0, range: b.range || 0, chainRange: b.chainRange || 0,
    maxCount: b.maxCount || 0, count: b.count || 0, hitCd: b.hitCd || 0, knock: b.knock || 0,
    crit: b.crit !== undefined ? b.crit : 0.05, critInc: 0, critMore: 1, critMulti: 1.5,
    ignite: b.ignite || 0, shock: b.shock || 0, poison: b.poison || 0, chillEff: 1, noAilment: false,
    more: 1, moreEle: 1, moreChaos: 1, morePhys: 1, burnMore: 1, dotMore: 1, vsChilled: 1,
    speedInc: 0, areaInc: 0, areaMore: 1, durInc: 0, durMore: 1, projSpeedInc: 0,
    echo: 0, leech: 0, cull: 0, minionSpeed: 0, cloudDps: b.cloudDps || 0,
    explode: !!b.explode, wander: !!b.wander, aim: b.aim || 'nearest', pattern: b.pattern || 'fan',
    arrow: !!b.arrow, cloud: !!b.cloud,
    pen: { physical: 0, fire: 0, cold: 0, lightning: 0, chaos: 0 }, ailMore: 1, hitMul: 1,
  };
  // skill-specific base fields (zap, split, brand, beam...) pass straight through
  for (const k in b) if (!(k in s)) s[k] = b[k];
  const lvl = inst.level + m.gemLevel;
  if (def.scale) def.scale(s, lvl);
  s.dmg *= 1 + 0.16 * (lvl - 1);
  if (inst.evo) EVOLUTIONS[inst.id].apply(s);
  // Attack skills hit with the equipped weapon (≈1× for a starter weapon)
  if (tags.has('Attack') && p && p.equip) {
    const wm = attackWeaponMul(tags, p.weapon);
    s.more *= wm;
    if (p.weapon) s.crit = p.weapon.crit / 100;
    s.weaponMul = wm;
  }
  for (const sid of activeSupports(inst, p).active) {
    SUPPORTS[sid].apply(s);
    if (inst.awakened && inst.awakened.includes(sid)) {
      s.more *= 1.2;
      if (AWAKEN_BONUS[sid]) AWAKEN_BONUS[sid].apply(s);
    }
  }

  // player-wide modifiers
  s.crit += m.critAdd; s.critMulti += m.critMulti; s.speedInc += m.speedInc; s.areaInc += m.areaInc;
  s.durInc += m.durInc; s.projSpeedInc += m.projSpeedInc; s.leech += m.leech; s.minionSpeed += m.minionSpeed;

  // ascendancy modifiers
  if (s.behavior === 'projectile') { s.proj += m.projAdd; s.pierce += m.pierceAdd; }
  if (tags.has('Projectile') || tags.has('Chaining')) s.chain += m.chainAdd;
  if (tags.has('Minion')) { s.maxCount += m.minionCount; s.more *= m.moreMinion; s.leech += m.minionLeech; }
  s.ignite += m.igniteAdd; s.shock += m.shockAdd; s.poison += m.poisonAdd;
  s.burnMore *= m.burnMore; s.moreEle *= m.moreEle; s.dotMore *= m.dotMore; s.more *= m.moreAll;
  s.cull = Math.max(s.cull, m.cullAdd);
  if (s.behavior === 'brand' && m.ks.runebinder) { s.maxCount += 1; s.hitCd /= 1.2; }
  if (s.behavior === 'brand') { s.maxCount += m.brandAdd; s.hitCd /= 1 + m.brandSpeed; }
  if (s.behavior === 'herald') s.more *= m.heraldMore;
  if (s.behavior === 'beam') { s.range *= 1 + m.beamRange; s.more *= m.beamMore; }
  if (s.summonN) s.summonN += m.summonAdd;
  if (s.aftershocks) s.aftershocks += m.aftershockAdd;
  if (!inst.evo) s.more *= m.unevolvedMore;
  if (!tags.has('Minion')) s.more *= m.nonMinionMore;
  s.shockEff = 1 + m.shockEffInc;
  // Redistribute the existing burst damage across exactly three controllable warps.
  if (s.behavior === 'flicker') { s.more *= s.flickers / 3; s.flickers = 3; }

  let inc = 0;
  if (tags.has('Spell')) inc += m.incSpell;
  if (tags.has('Attack')) inc += m.incAttack;
  if (tags.has('Projectile')) inc += m.incProj;
  if (tags.has('AoE')) inc += m.incAoE;
  if (tags.has('Minion')) inc += m.incMinion;
  const typeInc = { physical: m.incPhys, fire: m.incEle + m.incFire, cold: m.incEle + m.incCold, lightning: m.incEle + m.incLight, chaos: m.incChaos };
  const typeMore = { physical: s.morePhys, fire: s.moreEle, cold: s.moreEle, lightning: s.moreEle, chaos: s.moreChaos };

  // base + added damage per type
  const raw = {};
  for (const t of DMG_TYPES) raw[t] = (s.types[t] || 0) * s.dmg + s.added[t] * s.dmg;
  if (s.brutality) for (const t of DMG_TYPES) if (t !== 'physical') raw[t] = 0;
  if (m.ks.avatarFire) {
    let sum = 0; for (const t of DMG_TYPES) { sum += raw[t]; raw[t] = 0; }
    raw.fire = sum;
  }
  s.hit = {}; s.hitTotal = 0;
  for (const t of DMG_TYPES) {
    if (raw[t] <= 0) continue;
    let v = raw[t] * (1 + inc + typeInc[t]) * s.more * typeMore[t];
    if (m.ks.eo && ELE[t]) v *= 1.4;
    if (m.ks.avatarFire && t === 'fire') v *= 1.25;
    if (m.ks.resolute && s.behavior !== 'aura') v *= 1.35;
    s.hit[t] = v; s.hitTotal += v;
  }

  // Trinity: more elemental damage, even more with two or more elements
  if (s.trinity) {
    const n = ['fire', 'cold', 'lightning'].filter((t) => s.hit[t] > 0).length, k = n >= 2 ? 1.35 : 1.15;
    for (const t of ['fire', 'cold', 'lightning']) if (s.hit[t]) { s.hitTotal += s.hit[t] * (k - 1); s.hit[t] *= k; }
  }
  if (m.ks.agony) s.hitMul *= 0.8;
  s.mainType = 'physical';
  { let best = 0; for (const t in s.hit) if (s.hit[t] > best) { best = s.hit[t]; s.mainType = t; } }
  s.critChance = m.ks.resolute ? 0 : clamp(s.crit * (1 + s.critInc) * s.critMore, 0, 0.95);
  if (m.ks.eo) s.critMulti = 1;
  s.cdFinal = s.cd / (1 + s.speedInc);
  s.radius = s.area * Math.sqrt(Math.max(0.1, (1 + s.areaInc) * s.areaMore));
  s.durFinal = s.duration * (1 + s.durInc) * s.durMore;
  s.speedFinal = s.speed * (1 + s.projSpeedInc);
  s.lifeFinal = s.life * (s.wander ? (1 + s.durInc) * s.durMore : 1);
  s.dotMul = s.dotMore * (1 + m.incDot);
  s.auraDps = s.hitTotal * s.burnMore * s.dotMul;           // Righteous Fire style
  s.cloudDpsFinal = s.hitTotal * s.cloudDps * s.dotMul;     // Caustic cloud
  s.ailmentDur = (1 + s.durInc * 0.5 + m.ailDurInc) * s.durMore;
  s.minionSpeedMul = 1 + s.minionSpeed;
  return s;
}

// Short human-readable stat lines for UI
function describeStats(s) {
  const out = [];
  const typeStr = DMG_TYPES.filter((t) => s.hit[t]).map((t) => `<span style="color:${TYPE_COLOR[t]}">${fmtNum(s.hit[t])} ${t}</span>`).join(' + ');
  if (s.behavior === 'aura') out.push('ดาเมจเผา/วิ: <b>' + fmtNum(s.auraDps) + '</b>');
  else if (s.behavior === 'herald') out.push('ระเบิดเมื่อศัตรูติด Chill ตาย: ' + typeStr);
  else out.push('ดาเมจต่อครั้ง: ' + typeStr);
  if (s.curse) out.push('คำสาป: ' + { ele: 'Elemental Weakness', vuln: 'Vulnerability', despair: 'Despair' }[s.curse]);
  if (s.cloud) out.push('หมอกพิษ/วิ: <b>' + fmtNum(s.cloudDpsFinal) + '</b>');
  if (s.behavior === 'beam') out.push('ลำแสงยาว ' + Math.round(s.range) + ' · ' + (1 / s.cdFinal).toFixed(1) + ' ครั้ง/วิ');
  else if (s.behavior !== 'aura' && s.behavior !== 'herald') out.push('คูลดาวน์: ' + s.cdFinal.toFixed(2) + 's');
  if (s.brand) out.push('ตราสูงสุด: ' + s.maxCount + ' · ทำงานทุก ' + s.hitCd.toFixed(2) + 's');
  if (s.split) out.push('ลูกธนูย่อย: ' + s.split);
  if (s.flickers) out.push('วาร์ปต่อชุด: 3 · พักอย่างน้อย 0.25s · เดินเพื่อหยุด · T เปิด/พัก');
  if (s.bolts) out.push('สายฟ้า: ' + s.bolts);
  if (s.blades) out.push('ใบมีด: ' + (s.blades + s.proj));
  if (s.cluster) out.push('ระเบิดย่อย: ' + s.cluster);
  if (s.strikes) out.push('สายฟ้าฟาด: ' + s.strikes);
  if (s.balls) out.push('ลูกลาวา: ' + (s.balls + s.proj));
  if (s.proj) out.push('กระสุน: ' + s.proj + (s.pierce ? ' · ทะลุ ' + s.pierce : '') + (s.chain ? ' · กระโดด ' + s.chain : '') + (s.fork ? ' · Fork' : ''));
  else if (s.chain) out.push('กระโดด: ' + s.chain);
  if (s.radius) out.push('รัศมี: ' + Math.round(s.radius));
  if (s.maxCount) out.push('จำนวนสูงสุด: ' + s.maxCount);
  if (s.count) out.push('อุกกาบาต: ' + s.count);
  if (s.duration) out.push('ระยะเวลา: ' + s.durFinal.toFixed(1) + 's');
  if (s.behavior !== 'aura') out.push('คริ: ' + pct(s.critChance) + ' ×' + s.critMulti.toFixed(2));
  if (s.echo) out.push((s.behavior === 'flicker' ? 'ฟันซ้ำ ณ จุดวาร์ป: +' : 'ร่ายซ้ำ: +') + s.echo);
  return out;
}

// damage multiplier an Attack skill gets from the equipped weapon
// (bow skills need a bow, melee with a bow is clumsy, unarmed is weak)
function attackWeaponMul(tags, w) {
  let wm = w ? weaponPower(w) : 0.6;
  if (tags.has('Bow') && (!w || w.wtype !== 'bow')) wm *= 0.6;
  if (tags.has('Melee') && w && w.wtype === 'bow') wm *= 0.7;
  return wm;
}
