'use strict';
const ARCHETYPE_LIMITS = { eyes: 6, bells: 2, dots: 96, falling: 12, storms: 3 };
function archetypeState() {
  return G.archetypes || (G.archetypes = { eyes: [], bells: [], dots: [], falling: [], storms: [], combo: 0, comboAt: -1, plagueAt: -1, plagueBudget: 32, ice: null });
}
function archetypeGrantLive(i) { return i && i.grantedOwner === G.player && reactionEquipped('whispering_ice'); }
function archetypeLive(i) { return craftLive(i) || archetypeGrantLive(i); }
function archetypeDot(i, s, e, k) {
  if (e.dead) return;
  const state = archetypeState(), own = state.dots.filter(d => d.i === i && d.target === e);
  if (own.length >= 3) state.dots.splice(state.dots.indexOf(own.reduce((a, b) => a.ttl < b.ttl ? a : b)), 1);
  reactionAdd(state.dots, { i, target: e, ttl: s.durFinal, dps: (s.hit.physical || 0) * s.dotMul * k }, ARCHETYPE_LIMITS.dots);
}
function archetypeCast(i, s) {
  const p = G.player, state = archetypeState();
  if (s.archetype === 'rite') {
    if (!nearestEnemy(p.x, p.y, 650)) return false;
    craftLifeCost(0.08 * Math.max(0, 1 - effRes(p, 'chaos')));
    return null; // Uses the real projectile pipeline, including fork/chain/return.
  }
  if (s.behavior !== 'archetype') return null;
  const e = nearestEnemy(p.x, p.y, s.range);
  if (!e) return false;
  if (s.archetype === 'bloodchain') {
    craftLifeCost(0.02);
    let target = e; const used = new Set(), pts = [[p.x, p.y]];
    for (let n = 0; target && n < Math.min(12, s.chain + 1); n++) {
      used.add(target.id); pts.push([target.x, target.y]);
      hitEnemy(target, s, i, 1, p.x, p.y); archetypeDot(i, s, target, 0.6);
      target = nearestEnemy(target.x, target.y, 200, used);
    }
    addEffect({ kind: 'bolt', pts, t: 0, dur: 0.25, color: s.color }); return true;
  }
  if (s.archetype === 'reap') {
    const charges = i.rt.bloodCharges || 0, k = 1 + charges * 0.15;
    craftLifeCost(0.025 * (1 + charges * 0.2));
    const targets = enemiesInRadius(e.x, e.y, s.radius, []);
    let killed = false;
    for (const target of targets) { hitEnemy(target, s, i, k, p.x, p.y); killed ||= target.dead; archetypeDot(i, s, target, 0.65 * k); }
    i.rt.bloodCharges = killed ? Math.max(0, charges - 1) : Math.min(5, charges + 1);
    addEffect({ kind: 'spin', x: e.x, y: e.y, r: s.radius, t: 0, dur: 0.3, color: s.color }); return true;
  }
  if (s.archetype === 'eye') {
    reactionAdd(state.eyes, { i, s, x: p.x, y: p.y, a: angleTo(p.x, p.y, e.x, e.y), ttl: s.lifeFinal, age: 0, act: 0 }, ARCHETYPE_LIMITS.eyes); return true;
  }
  if (s.archetype === 'bell') {
    if (state.combo < 4) return false;
    state.combo -= 4;
    reactionAdd(state.bells, { i, x: e.x, y: e.y, ttl: s.durFinal, uses: 10, next: -1, elements: new Set() }, ARCHETYPE_LIMITS.bells);
    craftBurst(i, reactionSecondary(s), e.x, e.y, s.radius, 0.6); return true;
  }
  if (s.archetype === 'icestorm') { reactionAdd(state.storms, { i, x: e.x, y: e.y, ttl: s.durFinal, act: 0 }, ARCHETYPE_LIMITS.storms); return true; }
  return false;
}
function archetypeAfterHit(e, s, i) {
  if (!i || !archetypeLive(i)) return;
  if (s.coursingCurrent && !s.noAilment && !e.ailImmune) {
    if (e.chill.t > 0 && (s.hit.cold || 0) > 0) { e.shock.eff = Math.max(e.shock.eff, Math.min(0.4, e.chill.eff)); e.shock.t = Math.max(e.shock.t, e.chill.t); }
    if (e.shock.t > 0 && ((s.hit.lightning || 0) > 0 || s.chaosCanShock)) { e.chill.eff = Math.max(e.chill.eff, Math.min(0.3, e.shock.eff)); e.chill.t = Math.max(e.chill.t, e.shock.t); }
  }
  if (s.proc || s.totem || s.delivery || s.tags.has('Minion')) return;
  const state = archetypeState();
  if (s.crystalfall && G.time >= (i.rt.crystalAt ?? -1)) {
    i.rt.crystalAt = G.time + 1.5;
    reactionAdd(state.falling, { i, s: reactionSecondary(s, 0.9), x: e.x, y: e.y, ttl: 0.5 }, ARCHETYPE_LIMITS.falling);
  }
  if (!s.tags.has('Attack') || !G.player.weapon || G.player.weapon.wtype !== 'staff') return;
  if (G.time - state.comboAt >= 0.15) { state.combo = Math.min(8, state.combo + 1); state.comboAt = G.time; }
  for (const bell of state.bells) {
    if (!craftLive(bell.i) || bell.uses <= 0 || G.time < bell.next || dist2(bell.x, bell.y, e.x, e.y) > 100 ** 2) continue;
    bell.next = G.time + 0.18; bell.uses--;
    for (const t of ['fire', 'cold', 'lightning']) if (s.hit[t] > 0) bell.elements.add(t);
    const pulse = reactionSecondary(bell.i.st, 0.7);
    for (const t of bell.elements) pulse.hit[t] = (pulse.hit[t] || 0) + bell.i.st.hitTotal * 0.2;
    craftBurst(bell.i, pulse, bell.x, bell.y, bell.i.st.radius);
  }
}
function archetypeOnKill(e, source) {
  if (source && source.rt && source.st && source.st.archetype === 'reap') source.rt.bloodCharges = Math.max(0, (source.rt.bloodCharges || 0) - 1);
  if (!e.poison.length) return;
  const state = archetypeState();
  if (G.time - state.plagueAt >= 1 || state.plagueAt < 0) { state.plagueAt = G.time; state.plagueBudget = 32; }
  const poison = e.poison.filter(p => p.t > 0 && (p.plagueHop || 0) < 3).sort((a, b) => b.dps - a.dps)[0];
  if (!poison) return;
  for (const i of G.player.skills) if (i.st && !i.st.disabled && i.st.archetype === 'plague') {
    let count = 0;
    for (const target of enemiesInRadius(e.x, e.y, i.st.radius, [])) {
      if (count >= 6 || state.plagueBudget <= 0) break;
      if (target.ailImmune || target.poison.length >= 40) continue;
      const dps = poison.dps * 0.75 * G.player.mods.heraldMore * (i.st.plagueAmplify || 1), prior = target.poison.find(p => p.plagueOwner === i.uid);
      if (prior && prior.dps >= dps) continue;
      if (prior) target.poison.splice(target.poison.indexOf(prior), 1);
      target.poison.push({ dps, t: Math.min(poison.t, i.st.durFinal), src: i, plagueOwner: i.uid, plagueHop: (poison.plagueHop || 0) + 1 });
      state.plagueBudget--; count++;
    }
    addEffect({ kind: 'ring', x: e.x, y: e.y, r: i.st.radius, t: 0, dur: 0.25, color: '#91bc65' });
  }
}
function archetypeShards(eye, final) {
  const s = eye.i.st, count = final ? Math.min(24, 8 + s.proj) : 2;
  const shard = { ...craftSecondary(s, 0.45), speedFinal: 480 * (1 + s.projSpeedInc), lifeFinal: 0.8, size: 5, pierce: s.pierce, chain: s.chain, fork: s.fork, returning: s.returning, explode: false };
  for (let n = 0; n < count; n++) craftProjectile(eye.i, shard, eye.x, eye.y, eye.age * 9 + n * TAU / count);
}
function updateArchetypes(dt) {
  const p = G.player, state = archetypeState();
  if (G.time - state.comboAt > 4) state.combo = 0;
  for (let n = state.dots.length - 1; n >= 0; n--) {
    const dot = state.dots[n];
    if (!craftLive(dot.i) || dot.target.dead || dot.ttl <= 0) { state.dots.splice(n, 1); continue; }
    const step = Math.min(dt, dot.ttl); dot.ttl -= step;
    dotDamage(dot.target, dot.dps * step * (1 - Math.max(-0.5, dot.target.res.physical)), dot.i, '#cf6a7a');
  }
  for (let n = state.eyes.length - 1; n >= 0; n--) {
    const eye = state.eyes[n];
    if (!craftLive(eye.i)) { state.eyes.splice(n, 1); continue; }
    eye.ttl -= dt; eye.age += dt; eye.act -= dt;
    eye.x = clampArena(eye.x + Math.cos(eye.a) * eye.i.st.speedFinal * dt, 10);
    eye.y = clampArena(eye.y + Math.sin(eye.a) * eye.i.st.speedFinal * dt, 10);
    if (eye.ttl <= 0 || Math.abs(eye.x) >= ARENA - 10 || Math.abs(eye.y) >= ARENA - 10) { archetypeShards(eye, true); state.eyes.splice(n, 1); }
    else if (eye.act <= 0) { eye.act = 0.18; archetypeShards(eye, false); }
  }
  for (let n = state.bells.length - 1; n >= 0; n--) { const b = state.bells[n]; b.ttl -= dt; if (!craftLive(b.i) || b.ttl <= 0 || b.uses <= 0) state.bells.splice(n, 1); }
  for (let n = state.falling.length - 1; n >= 0; n--) { const c = state.falling[n]; c.ttl -= dt; if (!craftLive(c.i)) { state.falling.splice(n, 1); continue; } if (c.ttl <= 0) { state.falling.splice(n, 1); craftBurst(c.i, c.s, c.x, c.y, 100); } }
  if (p.mods.ks.whisperingIce) {
    if (!state.ice) { const i = newSkillInstance('icestorm'); i.grantedOwner = p; state.ice = i; }
    const i = state.ice, level = Math.min(20, Math.max(1, Math.ceil(p.level / 3)));
    if (i.level !== level || i.cachedMods !== p.mods || !i.st) { i.level = level; i.st = buildSkillStats(i, p); i.cachedMods = p.mods; }
    i.timer -= dt;
    if (i.timer <= 0 && !i.st.disabled && archetypeCast(i, i.st)) i.timer = i.st.cdFinal;
  } else { state.ice = null; state.storms.length = 0; }
  for (let n = state.storms.length - 1; n >= 0; n--) {
    const storm = state.storms[n]; storm.ttl -= dt; storm.act -= dt;
    if (!archetypeGrantLive(storm.i) || storm.ttl <= 0) { state.storms.splice(n, 1); continue; }
    if (storm.act <= 0) { storm.act = 0.5; craftBurst(storm.i, reactionSecondary(storm.i.st, 0.55), storm.x, storm.y, storm.i.st.radius); }
  }
}
function drawArchetypes(ctx) {
  const state = archetypeState(); ctx.save();
  for (const eye of state.eyes) { ctx.strokeStyle = '#90d8f4'; ctx.fillStyle = '#36627a'; ctx.beginPath(); ctx.ellipse(eye.x, eye.y, 13, 7, eye.age * 3, 0, TAU); ctx.fill(); ctx.stroke(); }
  for (const bell of state.bells) { ctx.fillStyle = '#ac884e'; ctx.strokeStyle = '#f2d797'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bell.x - 16, bell.y + 12); ctx.quadraticCurveTo(bell.x - 12, bell.y - 22, bell.x, bell.y - 22); ctx.quadraticCurveTo(bell.x + 12, bell.y - 22, bell.x + 16, bell.y + 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff3c5'; ctx.fillText(String(bell.uses), bell.x - 4, bell.y + 5); }
  for (const c of state.falling) { ctx.strokeStyle = '#b6b8e8'; ctx.beginPath(); ctx.arc(c.x, c.y, 100 * (1 - c.ttl / 0.5), 0, TAU); ctx.stroke(); }
  for (const storm of state.storms) {
    const radius = storm.i.st.radius;
    ctx.strokeStyle = 'rgba(126,207,240,0.5)'; ctx.beginPath(); ctx.arc(storm.x, storm.y, radius, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#addfee'; ctx.lineWidth = 2;
    for (let n = 0; n < 9; n++) { const a = n * 2.399, r = radius * Math.sqrt((n + 1) / 10), y = storm.y + Math.sin(a) * r, fall = (G.time * 80 + n * 17) % 55; ctx.beginPath(); ctx.moveTo(storm.x + Math.cos(a) * r, y - 55 + fall); ctx.lineTo(storm.x + Math.cos(a) * r - 3, y - 45 + fall); ctx.stroke(); }
  }
  ctx.restore();
}
const priorArchetypeSupportReason = supportUseReason;
supportUseReason = function(id, d, tags, enabled = [], mods = G.player && G.player.mods) {
  if (mods && mods.ks.voltaxic) {
    if (id === 'light_pen') return 'Voltaxic แปลงสายฟ้าเป็น Chaos แล้ว เจาะต้านทานสายฟ้าจึงไม่เพิ่มดาเมจ';
    if (['trinity', 'elemental_attacks', 'elemental_focus'].includes(id) && !(d.base.types.fire > 0 || d.base.types.cold > 0 || enabled.includes('added_fire') || enabled.includes('added_cold'))) return 'หลังแปลงด้วย Voltaxic ต้องมี Fire/Cold จึงได้ประโยชน์จาก Support ธาตุนี้';
  }
  if (d.base.archetype === 'rite' && DELIVERY_SUPPORTS.includes(id)) return 'พิธีต้องห้ามต้องจ่ายต้นทุนจากตัวผู้เล่น ไม่รองรับการร่ายผ่านป้อม/ทุ่น/กับดัก';
  if (d.base.archetype === 'plague' && !['inc_aoe', 'inc_duration', 'herald_amplification'].includes(id)) return 'Herald นี้แพร่ Poison เดิม ไม่มี Hit หรือระเบิดให้ Support นี้เพิ่ม';
  if (id === 'coursing_current' && (d.behavior === 'aura' || d.behavior === 'herald' || d.base.brand === 'dot')) return 'ต้องเป็นสกิลที่ Hit และสร้าง Chill/Shock ได้';
  if (id === 'communion' && (d.behavior === 'aura' || d.behavior === 'herald' || d.base.brand === 'dot')) return 'Communion ต้องมี Hit ของเวท';
  if (id === 'crystalfall' && enabled.some(s => DELIVERY_SUPPORTS.includes(s))) return 'ผลึกต้องมาจาก Slam ที่คุณใช้เอง';
  if (d.behavior === 'archetype') {
    const allowed = new Set(['inc_aoe', 'concentrated', 'inc_duration', 'less_duration', 'faster_casting', 'faster_attacks', 'inc_crit', 'inc_crit_dmg', 'added_fire', 'added_cold', 'added_lightning', 'added_chaos', 'controlled_destruction', 'elemental_focus', 'hypothermia', 'brutality', 'cold_pen', 'fire_pen', 'light_pen', 'life_leech', 'culling_strike', 'curse_ele', 'curse_vuln', 'curse_despair', 'elemental_prolif', 'coursing_current', 'communion', 'swift_affliction', 'spell_echo', 'unleash']);
    if (d.base.archetype === 'bloodchain') allowed.add('chain');
    if (d.base.archetype === 'bell') for (const x of ['melee_physical', 'elemental_attacks']) allowed.add(x);
    if (d.base.archetype === 'eye') for (const x of ['gmp', 'multiple_projectiles', 'pierce', 'chain', 'fork', 'returning', 'faster_projectiles', 'slower_projectiles', 'vicious_projectiles']) allowed.add(x);
    if (!allowed.has(id)) return 'กลไกสกิลนี้ไม่รองรับผลหลักของ Support นี้';
    if (d.base.archetype === 'bloodchain' && id === 'chain') return '';
    if (d.base.archetype === 'eye' && ['pierce', 'chain', 'fork', 'returning', 'faster_projectiles', 'slower_projectiles'].includes(id)) return '';
  }
  return priorArchetypeSupportReason(id, d, tags, enabled, mods);
};
const originalPlagueAmplification = SUPPORTS.herald_amplification.apply;
SUPPORTS.herald_amplification.apply = function(s) { originalPlagueAmplification(s); if (s.archetype === 'plague') s.plagueAmplify = (s.plagueAmplify || 1) * 1.25; };
for (const [id] of ARCHETYPE_SKILLS) SYMBOLS[id] = g => SYMBOLS[id === 'tempest_bell' ? 'sup_tower' : id === 'herald_of_plague' ? 'sup_drop' : 'sup_echo'](g);
SYMBOLS.exsanguinate = g => { g.lineWidth = 3; for (let n = -1; n <= 1; n++) { g.beginPath(); g.moveTo(-16, 12); g.bezierCurveTo(2, 14, -3, -n * 12, 17, n * 13); g.stroke(); } };
SYMBOLS.reap = g => { g.lineWidth = 3; g.beginPath(); g.moveTo(-10, 18); g.lineTo(6, -15); g.quadraticCurveTo(22, -9, 15, 5); g.quadraticCurveTo(16, -8, 2, -10); g.stroke(); };
SYMBOLS.eye_of_winter = g => { g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 19, 10, -0.3, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); };
SYMBOLS.tempest_bell = g => { g.lineWidth = 3; g.beginPath(); g.moveTo(-15, 12); g.quadraticCurveTo(-13, -16, 0, -16); g.quadraticCurveTo(13, -16, 15, 12); g.closePath(); g.stroke(); g.fillRect(-3, 13, 6, 5); };
SYMBOLS.icestorm = g => SYMBOLS.firestorm(g);
for (const d of ARCHETYPE_SUPPORTS) SUPPORT_ICON[d.id] = ['echo'];
function archetypeGrantedHtml() {
  const i = archetypeState().ice;
  if (!G.player.mods.ks.whisperingIce) return '';
  return '<div class="bv-skill"><div class="bv-head">' + skillGemHtml('icestorm', false) + '<div><b>Icestorm</b><div class="muted">จาก The Whispering Ice · ไม่ใช้ช่องสกิล/Support</div></div></div><div class="bv-stats">พายุทุก 3 วิ · รับโบนัส Spell / Cold / AoE</div><div class="bv-dmg">ดาเมจรวม ' + fmtNum(i ? i.dmgDealt : 0) + '</div></div>';
}
COMBOS.push(
  { name: 'Blood Choir', parts: ['exsanguinate', 'reap', 'chain'], desc: 'เส้นเลือดแพร่ DoT · Reap สะสมพลังใส่บอส ต้องมีการฟื้นฟูชีวิต' },
  { name: 'Winter Current', parts: ['frostbolt', 'coursing_current', 'lightning_conduit'], desc: 'น้ำแข็งสร้าง Chill และ Shock จากนั้น Conduit กิน Shock' },
  { name: 'Bell Conductor', parts: ['heavy_strike', 'tempest_bell', 'added_lightning'], desc: 'ถือคทายาว ตีสะสม Combo แล้วตีระฆังปล่อยคลื่นสายฟ้า' },
  { name: 'Plague Caravan', parts: ['cobra_lash', 'herald_of_plague', 'chance_to_poison'], desc: 'สร้าง Poison หนักแล้วแพร่จากการฆ่า' },
  { name: 'Living Communion', parts: ['raise_zombie', 'ethereal_knives', 'communion'], desc: 'เลี้ยงมินเนียนอายุยาวเพื่อเสริม Hit ของเวทที่คุณร่าย' },
);
