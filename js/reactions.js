'use strict';
const REACTION_LIMITS = { walls: 28, grenades: 18, clouds: 6, blasts: 12, spiders: 8 };
function reactionState() {
  return G.reactions || (G.reactions = { walls: [], grenades: [], clouds: [], blasts: [], spiders: [], hammerAt: 0, spiderAt: 0, bossHits: 0 });
}
function reactionEquipped(id) { return Object.values(G.player.equip).some(it => it && it.unique === id); }
function reactionAdd(list, entity, cap) { if (list.length >= cap) list.shift(); list.push(entity); }
function reactionCast(i, s) {
  if (s.behavior !== 'reaction') return null;
  const p = G.player, state = reactionState(), target = nearestEnemy(p.x, p.y, s.range);
  if (!target) return false;
  if (s.reaction === 'wall') {
    const a = angleTo(p.x, p.y, target.x, target.y), d = Math.min(150, Math.hypot(target.x - p.x, target.y - p.y) * 0.65);
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    for (let n = 0; n < Math.min(9, s.crystals); n++) {
      const offset = (n - (s.crystals - 1) / 2) * 30;
      reactionAdd(state.walls, { id: uid(), i, s, x: clampArena(x - Math.sin(a) * offset, 20), y: clampArena(y + Math.cos(a) * offset, 20), r: 16, hp: Math.max(1, s.hitTotal * 0.6), ttl: s.durFinal, born: G.time }, REACTION_LIMITS.walls);
    }
    return true;
  }
  if (s.reaction === 'gas') {
    // Extra projectiles add coverage, not multiple simultaneous clouds on one spot.
    const count = Math.min(5, Math.max(1, s.proj));
    for (let n = 0; n < count; n++) reactionAdd(state.grenades, { i, s, x: clampArena(target.x + (n - (count - 1) / 2) * 85, 10), y: target.y, ttl: 0.8 }, REACTION_LIMITS.grenades);
    return true;
  }
  const arrows = craftState().nodes.filter(n => n.kind === 'rain' && craftLive(n.i) && dist2(n.x, n.y, p.x, p.y) <= s.range ** 2)
    .sort((a, b) => dist2(a.x, a.y, target.x, target.y) - dist2(b.x, b.y, target.x, target.y)).slice(0, Math.min(8, s.count));
  if (!arrows.length) return false;
  const consumed = new Set(arrows);
  G.craft.nodes = G.craft.nodes.filter(n => !consumed.has(n));
  for (const n of arrows) reactionAdd(state.blasts, { i, s, x: n.x, y: n.y, ttl: 0.35 }, REACTION_LIMITS.blasts);
  return true;
}
function reactionSecondary(s, k = 1) { return { ...craftSecondary(s, k), environmentSecondary: true }; }
function reactionShatter(wall, playerHit) {
  const list = reactionState().walls, at = list.indexOf(wall);
  if (at < 0) return;
  list.splice(at, 1); // Consume first: secondary explosions cannot recurse.
  if (craftLive(wall.i)) craftBurst(wall.i, reactionSecondary(wall.i.st), wall.x, wall.y, wall.i.st.radius, playerHit ? 1 : 0.45);
}
function reactionIgnite(cloud) {
  const list = reactionState().clouds, at = list.indexOf(cloud);
  if (at < 0 || !craftLive(cloud.i)) return;
  list.splice(at, 1);
  const s = reactionSecondary(buildSkillStats(cloud.i, G.player, { fire: 1 }), 1.6);
  s.poison = 0; s.ignite = Math.max(0.25, s.ignite);
  craftBurst(cloud.i, s, cloud.x, cloud.y, cloud.i.st.radius * 1.25);
  addEffect({ kind: 'boom', x: cloud.x, y: cloud.y, r: cloud.i.st.radius * 1.25, t: 0, dur: 0.45, color: '#ff914c' });
}
// Called by player hits, bursts, and swept projectile segments. Environment damage is bounded.
function reactionImpact(i, s, x, y, r, damage) {
  if (!i || s.environmentSecondary || !craftLive(i)) return;
  const state = reactionState();
  for (const w of state.walls.slice()) {
    if (w.i === i || G.time - w.born < 0.12 || dist2(w.x, w.y, x, y) > (w.r + r) ** 2) continue;
    w.hp -= Math.max(0, damage);
    if (w.hp <= 0) reactionShatter(w, true);
  }
  if (s.hit.fire > 0) for (const c of state.clouds.slice()) {
    if (dist2(c.x, c.y, x, y) <= (c.i.st.radius + r) ** 2) reactionIgnite(c);
  }
}
function reactionProjectile(p, oldX, oldY) {
  if (p.s.environmentSecondary || !craftLive(p.inst)) return;
  const state = reactionState(), dx = p.x - oldX, dy = p.y - oldY, length2 = dx * dx + dy * dy;
  for (const w of state.walls.slice()) {
    const t = length2 ? clamp(((w.x - oldX) * dx + (w.y - oldY) * dy) / length2, 0, 1) : 0;
    if (dist2(w.x, w.y, oldX + dx * t, oldY + dy * t) > (w.r + p.r) ** 2 || w.i === p.inst || G.time - w.born < 0.12) continue;
    const key = 'wall:' + w.id;
    if (p.hit.has(key)) continue;
    p.hit.add(key); w.hp -= p.s.hitTotal * (p.s.hitMul || 1);
    if (w.hp <= 0) reactionShatter(w, true);
    // Crystals are destructible targets, but don't consume projectile pierce/chain budgets.
  }
  if (p.s.hit.fire > 0) for (const c of state.clouds.slice()) {
    const t = length2 ? clamp(((c.x - oldX) * dx + (c.y - oldY) * dy) / length2, 0, 1) : 0;
    if (dist2(c.x, c.y, oldX + dx * t, oldY + dy * t) <= (c.i.st.radius + p.r) ** 2) reactionIgnite(c);
  }
}
function reactionBlockEnemy(e, oldX, oldY, dt) {
  for (const w of reactionState().walls.slice()) {
    if (dist2(e.x, e.y, w.x, w.y) >= (w.r + e.r) ** 2) continue;
    if (isBoss(e) || e.unstoppable) { reactionShatter(w, false); continue; }
    const fallback = angleTo(G.player.x, G.player.y, w.x, w.y);
    const centered = Math.hypot(oldX - w.x, oldY - w.y) < 0.01;
    const ax = centered ? Math.cos(fallback) : oldX - w.x, ay = centered ? Math.sin(fallback) : oldY - w.y, d = Math.hypot(ax, ay);
    // Slide sideways along the wall instead of trapping a crowd forever.
    const side = e.id % 2 ? 1 : -1;
    e.x = clampArena(w.x + ax / d * (w.r + e.r + 1) - ay / d * side * e.speed * dt, e.r);
    e.y = clampArena(w.y + ay / d * (w.r + e.r + 1) + ax / d * side * e.speed * dt, e.r);
  }
}
function reactionSpiderSource(i) {
  const p = G.player, factor = (1 + p.mods.incMinion) * p.mods.moreMinion;
  const s = reactionSecondary(i.st);
  s.tags = new Set(['Minion', 'Chaos']); s.hit = { chaos: p.mods.ks.prototype ? 0 : (7 + p.level * 1.5) * factor };
  s.hitTotal = s.hit.chaos; s.mainType = 'chaos'; s.poison = 1; s.bleed = 0; s.curse = null; s.infernal = false; s.leech = 0; s.cull = 0;
  return s;
}
function reactionOnHit(e, s, i) {
  if (!i || s.proc || s.totem || s.delivery || !s.tags.has('Attack') || s.tags.has('Minion')) return;
  const state = reactionState();
  if (s.triggerMode === 'mjolner' && reactionEquipped('mjolner') && G.time >= state.hammerAt) {
    const target = craftTriggerTarget(i);
    if (target) { state.hammerAt = G.time + 0.8; craftOrigin(e.x, e.y, () => castSkill(target, craftSecondary(target.st, 0.7))); }
  }
  if (!reactionEquipped('arakaalis_fang')) return;
  if (isBoss(e)) state.bossHits++;
  if (state.spiders.length >= REACTION_LIMITS.spiders || G.time < state.spiderAt) return;
  const corpse = e.dead && craftState().corpses.find(c => dist2(c.x, c.y, e.x, e.y) < 80 ** 2);
  if (!corpse && !(isBoss(e) && state.bossHits >= 6)) return;
  if (corpse) craftState().corpses.splice(craftState().corpses.indexOf(corpse), 1);
  state.spiderAt = G.time + 1; state.bossHits = 0;
  for (let n = 0; n < (corpse ? 2 : 1) && state.spiders.length < REACTION_LIMITS.spiders; n++) state.spiders.push({ i, x: e.x + n * 12, y: e.y, ttl: 8, act: 0 });
}
function updateReactions(dt) {
  const state = reactionState(), p = G.player;
  for (const key of ['walls', 'grenades', 'clouds', 'blasts']) {
    const list = state[key];
    for (const n of list.slice()) {
      if (!craftLive(n.i)) { list.splice(list.indexOf(n), 1); continue; }
      n.ttl -= dt;
      if (n.ttl > 0) continue;
      list.splice(list.indexOf(n), 1);
      if (key === 'grenades') reactionAdd(state.clouds, { ...n, ttl: n.i.st.durFinal, tick: 0 }, REACTION_LIMITS.clouds);
      if (key === 'blasts') craftBurst(n.i, reactionSecondary(n.i.st), n.x, n.y, n.i.st.radius);
      // Expired crystals dissolve harmlessly, so waiting is not a free detonation.
    }
  }
  for (const cloud of state.clouds.slice()) {
    const s = cloud.i.st;
    const burning = G.enemies.some(e => !e.dead && e.ign.t > 0 && dist2(e.x, e.y, cloud.x, cloud.y) <= s.radius ** 2) ||
      p.skills.some(i => i.st && !i.st.disabled && i.st.behavior === 'aura' && i.st.hit.fire > 0 && dist2(p.x, p.y, cloud.x, cloud.y) < (i.st.radius + s.radius) ** 2) ||
      craftState().nodes.some(n => n.kind === 'rf' && craftLive(n.i) && dist2(n.x, n.y, cloud.x, cloud.y) < (n.i.st.radius + s.radius) ** 2) ||
      G.grounds.some(g => g.s && craftLive(g.inst) && g.s.hit.fire > 0 && dist2(g.x, g.y, cloud.x, cloud.y) < (g.s.radius + s.radius) ** 2);
    if (burning) { reactionIgnite(cloud); continue; }
    cloud.tick -= dt;
    if (cloud.tick > 0) continue;
    cloud.tick = 0.5;
    for (const e of enemiesInRadius(cloud.x, cloud.y, s.radius, [])) {
      const key = 'gas:' + cloud.i.uid;
      if ((e[key] || 0) > G.time) continue;
      e[key] = G.time + 0.49;
      dotDamage(e, s.hitTotal * s.dotMul * 0.35 * (1 - Math.max(-0.5, e.res.chaos)), cloud.i, s.color);
    }
  }
  for (let n = state.spiders.length - 1; n >= 0; n--) {
    const spider = state.spiders[n]; spider.ttl -= dt; spider.act -= dt;
    if (spider.ttl <= 0 || !reactionEquipped('arakaalis_fang') || !craftLive(spider.i)) { state.spiders.splice(n, 1); continue; }
    const target = nearestEnemy(spider.x, spider.y, 450), dest = target || p;
    const d = Math.hypot(dest.x - spider.x, dest.y - spider.y), speed = 250 * (1 + p.mods.minionSpeed);
    if (d > 20) { const step = Math.min(d - 20, speed * dt); spider.x += (dest.x - spider.x) / d * step; spider.y += (dest.y - spider.y) / d * step; }
    if (target && d < target.r + 28 && spider.act <= 0) { hitEnemy(target, reactionSpiderSource(spider.i), spider.i, 1, spider.x, spider.y); spider.act = 0.65 / (1 + p.mods.minionSpeed); }
  }
}
function drawReactions(ctx) {
  const state = reactionState(); ctx.save();
  for (const w of state.walls) {
    ctx.fillStyle = '#386381'; ctx.strokeStyle = '#a0d9eb'; ctx.beginPath(); ctx.moveTo(w.x, w.y - 25); ctx.lineTo(w.x + 14, w.y + 9); ctx.lineTo(w.x, w.y + 15); ctx.lineTo(w.x - 14, w.y + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#75b5ce'; ctx.beginPath(); ctx.moveTo(w.x, w.y - 25); ctx.lineTo(w.x + 5, w.y + 4); ctx.lineTo(w.x, w.y + 15); ctx.lineTo(w.x - 4, w.y + 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c8f6ff'; ctx.beginPath(); ctx.moveTo(w.x, w.y - 21); ctx.lineTo(w.x + 3, w.y + 4); ctx.stroke();
  }
  for (const c of state.clouds) {
    const radius = c.i.st.radius;
    const haze = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
    haze.addColorStop(0, 'rgba(126,164,51,0.28)'); haze.addColorStop(0.7, 'rgba(105,143,37,0.16)'); haze.addColorStop(1, 'rgba(97,128,39,0)');
    ctx.fillStyle = haze; ctx.beginPath(); ctx.arc(c.x, c.y, radius, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(174,196,94,0.45)'; ctx.beginPath(); ctx.arc(c.x, c.y, radius * 0.95, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(163,192,82,0.15)';
    for (let n = 0; n < 6; n++) { const a = n * TAU / 6 + G.time * 0.17, r = radius * (0.35 + 0.12 * Math.sin(n + G.time)); ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, radius * 0.24, 0, TAU); ctx.fill(); }
  }
  for (const g of state.grenades) { ctx.fillStyle = '#d6ef8b'; ctx.beginPath(); ctx.arc(g.x, g.y, 7, 0, TAU); ctx.fill(); }
  for (const b of state.blasts) { ctx.strokeStyle = '#e1a5ff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.i.st.radius * (1 - b.ttl / 0.35), 0, TAU); ctx.stroke(); }
  for (const m of state.spiders) { ctx.strokeStyle = '#a7d56a'; ctx.lineWidth = 2; for (let j = -1; j <= 1; j += 2) for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(m.x, m.y + k * 3); ctx.lineTo(m.x + j * 10, m.y + k * 8); ctx.stroke(); } ctx.fillStyle = '#627d37'; ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, TAU); ctx.fill(); }
  ctx.restore();
}
const beforeReactionSupportReason = supportUseReason;
supportUseReason = function(id, d, tags, enabled = [], mods = G.player && G.player.mods) {
  if (d.behavior === 'reaction') {
    const allowed = new Set(['inc_aoe', 'concentrated', 'inc_duration', 'less_duration', 'faster_casting', 'faster_attacks', 'inc_crit', 'inc_crit_dmg', 'added_fire', 'added_cold', 'added_lightning', 'added_chaos', 'elemental_focus', 'controlled_destruction', 'hypothermia', 'void_manipulation', 'fire_pen', 'cold_pen', 'light_pen', 'elemental_attacks', 'arcane_surge', 'spell_echo', 'unleash', 'life_leech', 'culling_strike', 'curse_ele', 'curse_vuln', 'curse_despair', 'elemental_prolif', 'combustion', 'knockback', 'trinity']);
    if (d.base.reaction === 'gas') for (const sid of ['gmp', 'multiple_projectiles', 'vicious_projectiles']) allowed.add(sid);
    if (!allowed.has(id)) return 'กลไกสนามนี้ไม่รองรับผลหลักของ Support นี้';
  }
  return beforeReactionSupportReason(id, d, tags, enabled, mods);
};
Object.assign(SYMBOLS, {
  frost_wall(g) { g.lineWidth = 3; for (let n = -1; n <= 1; n++) { g.beginPath(); g.moveTo(n * 13 - 5, 13); g.lineTo(n * 13, -15); g.lineTo(n * 13 + 5, 13); g.stroke(); } },
  gas_grenade(g) { SYMBOLS.sup_drop(g); g.beginPath(); g.arc(0, 3, 15, 0, TAU); g.stroke(); },
  magnetic_salvo(g) { SYMBOLS.sup_proj(g); g.beginPath(); g.arc(0, 0, 19, 0.2, Math.PI - 0.2); g.stroke(); },
});
COMBOS.push(
  { name: 'Shatter Corridor', parts: ['frost_wall', 'ice_spear', 'hypothermia'], desc: 'ผลึกขวางทาง แล้วยิงทำลายผลึกให้ระเบิดน้ำแข็ง' },
  { name: 'Gas Ignition', parts: ['gas_grenade', 'fireball', 'inc_aoe'], desc: 'วางแก๊สเพื่อ DoT หรือยิงไฟผ่านเพื่อระเบิดทันที' },
  { name: 'Magnetic Harvest', parts: ['storm_rain', 'magnetic_salvo', 'light_pen'], desc: 'เก็บตาข่ายสายฟ้าไว้คุมฝูง แล้วกินลูกธนูค้างเพื่อระเบิด' },
);
