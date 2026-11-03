'use strict';
function channelMoving() {
  return flickerMovementIntent() || Math.hypot(G.player.vx, G.player.vy) > 10;
}
function channelPulseMultiplier(inst, s) {
  const rt = inst.rt, gap = Math.max(0.45, s.cdFinal * 1.6);
  if (channelMoving() || rt.channelLast === undefined || G.time - rt.channelLast > gap) rt.channelStacks = 0;
  else rt.channelStacks = Math.min(5, (rt.channelStacks || 0) + 1);
  rt.channelLast = G.time;
  let k = s.channelIntensity ? 1 + (rt.channelStacks || 0) * 0.08 : 1;
  if (s.strongPulse && ((rt.rc || 0) + 1) % s.strongPulse === 0) k *= 2;
  return k;
}
function drawTendrils(ctx, inst, s) {
  const p = G.player, a = inst.rt.beamA, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const w = s.size * Math.sqrt((1 + s.areaInc) * s.areaMore), strong = inst.rt.strongFlash > G.time;
  // Faint coverage behind thin filaments keeps enemies and telegraphs readable.
  ctx.lineCap = 'round'; ctx.strokeStyle = hexA(s.color, strong ? 0.12 : 0.07); ctx.lineWidth = w * 2;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + ux * s.range, p.y + uy * s.range); ctx.stroke();
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    for (let j = 1; j <= 7; j++) {
      const t = j / 7, offset = k * w * 0.7 * t + Math.sin(G.time * 35 + j * 2.7 + k) * 7;
      ctx.lineTo(p.x + ux * s.range * t + nx * offset, p.y + uy * s.range * t + ny * offset);
    }
    ctx.strokeStyle = hexA(s.color, strong ? 0.8 : 0.45); ctx.lineWidth = strong ? 6 : 4; ctx.stroke();
    ctx.strokeStyle = hexA(s.core, strong ? 0.95 : 0.7); ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function updateRangedMage(m, s, dt) {
  const p = G.player, target = m.target;
  const distance = target ? Math.hypot(target.x - m.x, target.y - m.y) : Infinity;
  let tx = p.x, ty = p.y;
  if (target) {
    const a = angleTo(target.x, target.y, m.x, m.y);
    tx = target.x + Math.cos(a) * 220; ty = target.y + Math.sin(a) * 220;
  }
  const d = Math.hypot(tx - m.x, ty - m.y), speed = s.speed * s.minionSpeedMul;
  m.vx = d > 15 ? (tx - m.x) / d * speed : 0;
  m.vy = d > 15 ? (ty - m.y) / d * speed : 0;
  m.x = clampArena(m.x + m.vx * dt, 12); m.y = clampArena(m.y + m.vy * dt, 12);
  if (!target || distance > 400 || m.atkCd > 0 || s.disabled) return;
  // Actor movement speed and missile speed are deliberately separate.
  const ps = Object.assign({}, s, { speedFinal: s.rangedSpeed * (1 + s.projSpeedInc) });
  const a = angleTo(m.x, m.y, target.x, target.y), n = Math.min(12, Math.max(1, s.proj));
  for (let k = 0; k < n; k++) spawnProjectile(m.inst, ps, m.x, m.y, a + (k - (n - 1) / 2) * 0.2, null);
  m.atkCd = s.hitCd / s.minionSpeedMul;
  addEffect({ kind: 'spark', x: m.x, y: m.y, r: 8, t: 0, dur: 0.14, color: s.color });
}
function heraldSourceLive(inst, owner) { return G.player === owner && owner.skills.includes(inst) && !inst.st.disabled; }
function emitHeraldBurst(inst, s, x, y, echo = false) {
  const owner = G.player;
  if (!heraldSourceLive(inst, owner)) return;
  for (const n of enemiesInRadius(x, y, s.radius, [])) hitEnemy(n, s, inst, 1, x, y);
  addEffect({ kind: 'boom', x, y, r: s.radius, t: 0, dur: 0.3, color: s.color });
  emit(s.herald === 'ice' ? 'shard' : 'ember', x, y, 8);
  Sfx.play(s.herald === 'ice' ? 'shatter' : 'boom');
  if (s.heraldEcho && !echo) {
    const repeated = scaledStats(s, 0.45); repeated.heraldEcho = false;
    G.delayed.push({ t: 0.18, fn: () => { if (heraldSourceLive(inst, owner)) emitHeraldBurst(inst, repeated, x, y, true); } });
  }
}
function echoHeraldThunder(inst, s) {
  if (!s.heraldEcho) return;
  const owner = G.player, repeated = scaledStats(s, 0.45); repeated.heraldEcho = false;
  G.delayed.push({ t: 0.18, fn: () => { if (heraldSourceLive(inst, owner)) heraldThunder(inst, repeated); } });
}

Object.assign(SUPPORT_ICON, {
  swiftbrand: ['speed', 'cold'], brand_persistence: ['hourglass', 'cold'], brand_relay: ['chain', 'cold'],
  herald_amplification: ['area', 'lightning'], herald_echo: ['echo', 'lightning'], herald_catalyst: ['star', 'lightning'],
  channel_intensity: ['focus', 'fire'], mobile_channel: ['speed', 'lightning'], channel_fan: ['area', 'cold'],
});
Object.assign(SYMBOLS, {
  power_siphon(g) { SYMBOLS.sup_star(g); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 17, 0.4, 2.8); g.stroke(); },
  kinetic_bolt(g) { SYMBOLS.sup_fork(g); g.fillRect(-2, 8, 4, 9); },
  cobra_lash(g) { SYMBOLS.sup_chain(g); g.beginPath(); g.moveTo(8, -13); g.lineTo(17, -17); g.lineTo(13, -6); g.closePath(); g.fill(); },
  venom_gyre(g) { SYMBOLS.sup_return(g); g.beginPath(); g.moveTo(0, -9); g.lineTo(7, 4); g.lineTo(-7, 4); g.closePath(); g.fill(); },
  wintertide_brand(g) { SYMBOLS.herald_of_ice(g); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.stroke(); },
  lightning_tendrils(g) { g.lineWidth = 3; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(-15, 0); g.lineTo(-3, k * 7); g.lineTo(1, k * 5 + 4); g.lineTo(16, k * 13); g.stroke(); } },
  skeletal_mages(g) { SYMBOLS.sup_skull(g); g.lineWidth = 2; g.beginPath(); g.moveTo(-18, 15); g.lineTo(-18, -13); g.stroke(); g.beginPath(); g.arc(-18, -16, 3, 0, TAU); g.fill(); },
});
COMBOS.push(
  { name: 'Wand Executioner', parts: ['power_siphon', 'chain', 'inc_crit', 'added_lightning'], desc: 'ไม้กายสิทธิ์สาย Attack ยิงกระโดด คริ และประหารเป้าเลือดน้อย' },
  { name: 'Serpent Blades', parts: ['cobra_lash', 'chance_to_poison', 'deadly_ailments', 'venom_gyre'], desc: 'มีดสั้นสายขว้างพิษ เลือกกระโดดผ่านฝูงหรือยิงกลับมาซ้ำ' },
  { name: 'Winter Relay', parts: ['wintertide_brand', 'swiftbrand', 'brand_relay', 'swift_affliction'], desc: 'ตราน้ำแข็งทำ DoT เป็นจังหวะถี่ ย้ายเป้าเมื่อศพตาย ไม่ใช้ Hit หรือ Ailment' },
  { name: 'Thunder Channel', parts: ['lightning_tendrils', 'channel_intensity', 'channel_fan', 'herald_of_thunder'], desc: 'ยืนนิ่งสะสมพลัง สลับพัลส์แรงและกระตุ้น Herald ด้วย Shock' },
  { name: 'Mage Company', parts: ['skeletal_mages', 'multiple_projectiles', 'minion_speed', 'elemental_army'], desc: 'มินเนียนยิงน้ำแข็งจากระยะไกล เพิ่มจำนวนกระสุนและความเร็วโจมตี' },
);
