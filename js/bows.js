'use strict';
// Pending bow entities are owned by the run, never by global delayed closures.
const BOW_FUSE_CAP = 64, BOW_SEED_CAP = 64, BOW_NOVA_CAP = 24;
function bowSourceLive(inst) { return G.player && G.player.skills.includes(inst) && inst.st && !inst.st.disabled; }

function attachBowFuse(p, target, mult) {
  const list = G.bowFuses;
  if (!list || target.immuneT > G.time) return;
  let f = list.find(f => f.inst === p.inst && f.target === target);
  if (!f) {
    if (list.length >= BOW_FUSE_CAP) detonateBowFuse(list[0]);
    f = { inst: p.inst, target, s: p.s, x: target.x, y: target.y, count: 0,
      t: 0, dur: Math.max(0.15, p.s.durFinal), hit: {} };
    list.push(f);
  }
  f.count++;
  // Store each arrow's actual compiled damage (including the mirage's scaling).
  for (const type in p.s.hit) f.hit[type] = (f.hit[type] || 0) + p.s.hit[type] * mult * 0.85;
  if (f.count >= 12) detonateBowFuse(f);
}
function detonateBowFuse(f) {
  const index = G.bowFuses.indexOf(f);
  if (index < 0) return;
  G.bowFuses.splice(index, 1); // remove before applying damage: detonations cannot recurse
  if (!bowSourceLive(f.inst)) return;
  f.x = f.target.x; f.y = f.target.y;
  const s = Object.assign({}, f.s, { hit: f.hit, hitTotal: Object.values(f.hit).reduce((a, b) => a + b, 0), fuseArrow: false });
  const r = Math.min(240, s.radius + f.count * 3);
  for (const e of enemiesInRadius(f.x, f.y, r, [])) hitEnemy(e, s, f.inst, 1, f.x, f.y);
  addEffect({ kind: 'boom', x: f.x, y: f.y, r, t: 0, dur: 0.35, color: s.color });
  fxExplosion(f.x, f.y, r, 'fire'); Sfx.play('boom');
}
function queueBowSeed(seed) {
  // Drop the oldest secondary seed at the cap to bound very high fire-rate builds.
  if (G.bowSeeds.length >= BOW_SEED_CAP) G.bowSeeds.shift();
  G.bowSeeds.push(seed);
}
function queueArrowNova(inst, s, x, y, target) {
  queueBowSeed({ kind: 'nova', x: target.x, y: target.y, a: angleTo(x, y, target.x, target.y),
    inst, s, originX: x, originY: y, t: 0, dur: 0.4 });
  addEffect({ kind: 'bolt', pts: [[x, y - 10], [target.x, target.y - 60]], t: 0, dur: 0.12, color: s.color });
}
function plantScourgePods(inst, s, x, y, a, distance) {
  const n = Math.min(8, s.pods);
  for (let k = 0; k < n; k++) {
    const d = Math.min(420, Math.max(100, distance)) * (k + 1) / n;
    queueBowSeed({ kind: 'pod', x: clampArena(x + Math.cos(a) * d, 18), y: clampArena(y + Math.sin(a) * d, 18),
      a, inst, s, t: 0, dur: Math.max(0.15, s.durFinal) });
  }
}
function updateBowEntities(dt) {
  for (let k = G.bowFuses.length - 1; k >= 0; k--) {
    const f = G.bowFuses[k];
    if (!bowSourceLive(f.inst)) { G.bowFuses.splice(k, 1); continue; }
    f.t += dt; f.x = f.target.x; f.y = f.target.y;
    if (f.t >= f.dur || f.target.dead) detonateBowFuse(f);
  }
  for (let k = G.bowSeeds.length - 1; k >= 0; k--) {
    const p = G.bowSeeds[k];
    if (!bowSourceLive(p.inst)) { G.bowSeeds.splice(k, 1); continue; }
    p.t += dt;
    if (p.t < p.dur) continue;
    G.bowSeeds.splice(k, 1);
    if (p.kind === 'nova') {
      const n = Math.min(BOW_NOVA_CAP, Math.max(1, p.s.proj));
      for (let j = 0; j < n; j++) {
        spawnProjectile(p.inst, p.s, p.x, p.y, p.a + j * TAU / n, null);
        const arrow = G.projectiles[G.projectiles.length - 1];
        // Range-based damage still measures from the original shooter.
        arrow.ox = p.originX; arrow.oy = p.originY;
      }
      if (p.s.scourge) plantScourgePods(p.inst, p.s, p.x, p.y, p.a, 250);
      addEffect({ kind: 'ring', x: p.x, y: p.y, r: 45, t: 0, dur: 0.2, color: p.s.color });
    } else {
      const s = scaledStats(p.s, 0.45);
      s.scourge = false; s.arrowNova = false;
      const target = nearestEnemy(p.x, p.y, 600), a = target ? angleTo(p.x, p.y, target.x, target.y) : p.a;
      const n = Math.min(8, p.s.thorns || 3);
      for (let j = 0; j < n; j++) {
        spawnProjectile(p.inst, s, p.x, p.y, a + (j - (n - 1) / 2) * 0.22, null);
        const thorn = G.projectiles[G.projectiles.length - 1];
        thorn.child = true; thorn.life = Math.min(0.8, thorn.life); thorn.r = 4;
      }
      emit('bubble', p.x, p.y, 7);
      addEffect({ kind: 'ring', x: p.x, y: p.y, r: 26, t: 0, dur: 0.25, color: p.s.color });
    }
  }
}
function drawBowEntities(ctx, inView) {
  for (const f of G.bowFuses || []) {
    if (!inView(f.x, f.y, 40)) continue;
    const p = Math.min(1, f.t / f.dur);
    ctx.strokeStyle = '#ffb350'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(f.x, f.y, 15 + f.count * 0.5, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffdf9a';
    ctx.fillText(f.count, f.x, f.y - 24);
  }
  for (const p of G.bowSeeds || []) {
    if (!inView(p.x, p.y, 35)) continue;
    const t = Math.min(1, p.t / p.dur), r = p.kind === 'pod' ? 8 + 7 * t : 26;
    ctx.fillStyle = hexA(p.s.color, 0.15 + 0.18 * t); ctx.strokeStyle = hexA(p.s.color, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r, p.kind === 'pod' ? r * 0.7 : r, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * t); ctx.stroke();
    if (p.kind === 'pod') {
      ctx.beginPath(); ctx.moveTo(p.x - 4, p.y + 2); ctx.lineTo(p.x, p.y - r - 3); ctx.lineTo(p.x + 4, p.y + 2); ctx.stroke();
    }
  }
}

Object.assign(PASSIVE_TAGS, { heavy_draw: ['Bow'], king_of_the_hill: ['Bow'], ballistic_mastery: ['Bow'], watchtowers: ['Bow', 'Totem'] });
Object.assign(KS_NEED, { lone_archer: ['Bow'], siege_doctrine: ['Bow'] });
Object.assign(SUPPORT_ICON, { volley: ['proj'], arrow_nova: ['area'], maim: ['drop', 'blood'], deadly_draw: ['blade', 'blood'] });
Object.assign(SYMBOLS, {
  burning_arrow(g) { SYMBOLS.sup_pierce(g); g.beginPath(); g.moveTo(3, -18); g.quadraticCurveTo(15, -10, 8, -4); g.quadraticCurveTo(-1, -7, 3, -18); g.fill(); },
  explosive_arrow(g) { SYMBOLS.sup_pierce(g); g.lineWidth = 2; g.beginPath(); g.arc(8, -9, 8, 0, TAU); g.stroke(); for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.moveTo(8 + Math.cos(a) * 10, -9 + Math.sin(a) * 10); g.lineTo(8 + Math.cos(a) * 14, -9 + Math.sin(a) * 14); g.stroke(); } },
  puncture(g) { SYMBOLS.sup_pierce(g); g.beginPath(); g.moveTo(7, 3); g.quadraticCurveTo(-1, 13, 7, 17); g.quadraticCurveTo(15, 13, 7, 3); g.fill(); },
  scourge_arrow(g) { g.lineWidth = 2; for (let k = 0; k < 3; k++) { const x = (k - 1) * 11; g.beginPath(); g.ellipse(x, 6 - k * 4, 5, 8, -0.3, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x, -2 - k * 4); g.lineTo(x + 4, -12 - k * 3); g.stroke(); } },
});
COMBOS.push(
  { name: 'Cinder Hunter', parts: ['burning_arrow', 'combustion', 'elemental_attacks', 'herald_of_ash'], desc: 'ธนูจุด Ignite แล้ว Herald of Ash ลามไฟต่อ เหมาะกับ Lone Archer เมื่อยิงเอง' },
  { name: 'Siege Fuses', parts: ['explosive_arrow', 'ballista_totem', 'faster_attacks', 'multiple_totems'], desc: 'ป้อมยิงสะสมชนวนบนบอส · Siege Doctrine เพิ่มพลังป้อม · ตัวจับเวลาไม่รีเซ็ตเมื่อยิงซ้ำ' },
  { name: 'Bloodline Archer', parts: ['puncture', 'deadly_draw', 'crimson_bleed', 'maim'], desc: 'Bleed แน่นอน ยิงหนักพร้อมหน่วงศัตรู ใช้ Heavy Draw เสริมเลือดไหล' },
  { name: 'Spore Garden', parts: ['scourge_arrow', 'arrow_nova', 'chance_to_poison', 'void_manipulation'], desc: 'ธนูวงสร้างฝักหนึ่งชุดที่จุดตก ฝักยิงหนามพิษโดยไม่สร้างฝักลูกต่อ' },
);
