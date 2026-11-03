'use strict';
// ============================================================
//  Goals runtime (data in js/data/goals.js): the beginner quest chain,
//  "next goals" on the main menu, Corruption at the Map Device and
//  cosmetics (aura / footstep trail / title).
// ============================================================

// ---------------- shared helpers ----------------
function heatBest(M) { const v = Object.values(M.heat || {}); return v.length ? Math.max(...v) : 0; }
const questsDone = (M) => QUESTS.every((q) => M.quests[q.id]);
const currentQuest = (M) => QUESTS.find((q) => !M.quests[q.id]) || null;
function rewardText(rw) {
  const out = [];
  if (rw.shards) out.push(`+${rw.shards} ✦`);
  if (rw.scarabs) out.push(Array.isArray(rw.scarabs) ? rw.scarabs.map((id) => SCARABS[id].name).join(', ') : `Scarab ×${rw.scarabs}`);
  if (rw.cosmetic) out.push(`${COSMETIC_KIND[COSMETICS[rw.cosmetic].kind]} "${COSMETICS[rw.cosmetic].name}"`);
  return out.join(' · ');
}
function grantReward(rw, M) {
  if (rw.shards) M.shards += rw.shards;
  const ids = !rw.scarabs ? [] : Array.isArray(rw.scarabs) ? rw.scarabs : Array.from({ length: rw.scarabs }, randomScarab);
  for (const id of ids) M.scarabs[id] = (M.scarabs[id] || 0) + 1;
}

// ---------------- beginner quests ----------------
// completes the current quest (and any following ones already met)
function questCheck(r) {
  const M = loadMeta(), done = [];
  for (let q = currentQuest(M); q && q.test(r, M); q = currentQuest(M)) { M.quests[q.id] = true; grantReward(q.reward, M); done.push(q); }
  if (done.length) saveMeta();
  return done;
}

// ---------------- Corruption ----------------
const corruptionOpen = () => loadMeta().life.wins >= 1;
const heatOf = (sel) => Object.entries(sel || {}).reduce((a, [id, n]) => a + (CORRUPTION[id] ? CORRUPTION[id].pts * n : 0), 0);
// apply the chosen hardships to the map and their rewards to the run; returns total heat
function applyCorruption(f, fx, sel) {
  const H = heatOf(sel);
  if (!H) return 0;
  for (const id in sel) if (sel[id] && CORRUPTION[id]) CORRUPTION[id].fx(f, fx, sel[id]);
  f.shardMul *= 1 + HEAT_REWARD.shardMul * H; f.uniqueMul *= 1 + HEAT_REWARD.uniqueMul * H;
  f.itemQty *= 1 + HEAT_REWARD.itemQty * H; f.vaultLuck += HEAT_REWARD.vaultLuck * H;
  f.vaultExtra += HEAT_VAULT_CARD_AT.filter((n) => H >= n).length;
  return H;
}
function renderMapCorruption() {
  const M = loadMeta(), box = $('map-heat');
  if (!corruptionOpen()) { $('map-heat-n').textContent = ''; box.innerHTML = '<div class="muted">🔒 ชนะแผนที่ครั้งแรกเพื่อปลด Corruption — เลือกความโหดเองเพื่อรางวัลที่ดีขึ้น</div>'; return; }
  const sel = M.heatSel, H = heatOf(sel), best = M.heat[mapCls.id] || 0;
  $('map-heat-n').textContent = `(Corruption ${H} · สถิติ ${mapCls.name} ${best} · สูงสุดทุกคลาส ${heatBest(M)})`;
  box.innerHTML = `<div class="heat-grid">${Object.entries(CORRUPTION).map(([id, c]) => {
    const n = sel[id] || 0;
    return `<div class="heat-row${n ? ' on' : ''}"><div><b>${c.name}</b> <span class="muted">+${c.pts}/ระดับ</span><br><span class="muted">${c.th}${c.max > 1 ? ' ต่อระดับ' : ''}</span></div>
      <div class="heat-ctl"><button class="btn btn-small" data-heat="${id}:-1" ${n ? '' : 'disabled'}>−</button><b>${n}/${c.max}</b><button class="btn btn-small" data-heat="${id}:1" ${n < c.max ? '' : 'disabled'}>+</button></div></div>`;
  }).join('')}</div>
    <div class="muted">${H ? `รางวัล: Shards +${Math.round(HEAT_REWARD.shardMul * H * 100)}% · Unique +${Math.round(HEAT_REWARD.uniqueMul * H * 100)}% · ไอเทม +${Math.round(HEAT_REWARD.itemQty * H * 100)}% · ห้องรางวัลระดับตำนานบ่อยขึ้น${HEAT_VAULT_CARD_AT.filter((x) => H >= x).length ? ` · การ์ดห้องรางวัล +${HEAT_VAULT_CARD_AT.filter((x) => H >= x).length}` : ''}` : 'ยังไม่ได้เลือก — กด + เพื่อเพิ่มความโหด แต่ละแต้มเพิ่มรางวัล'} · ชนะเพื่อบันทึกสถิติและปลดของตกแต่ง</div>`;
  box.querySelectorAll('[data-heat]').forEach((b) => {
    b.onclick = () => {
      const [id, d] = b.dataset.heat.split(':'), c = CORRUPTION[id];
      sel[id] = clamp((sel[id] || 0) + +d, 0, c.max); if (!sel[id]) delete sel[id];
      saveMeta(); openMapDevice();
    };
  });
}

// ---------------- cosmetics ----------------
const cosmeticOpen = (id) => !!COSMETICS[id].test(loadMeta());
const equippedCosmetic = (kind) => { const id = loadMeta().cos[kind]; return id && COSMETICS[id] && cosmeticOpen(id) ? COSMETICS[id] : null; };
function cosmeticToggle(id) {
  const M = loadMeta(), c = COSMETICS[id];
  if (!cosmeticOpen(id)) return false;
  M.cos[c.kind] = M.cos[c.kind] === id ? null : id; saveMeta();
  return true;
}
// what the run shows: picked once at run start so the render loop never reads the save
function runCosmetics() { return { aura: equippedCosmetic('aura'), trail: equippedCosmetic('trail'), title: equippedCosmetic('title') }; }
function cosmeticTrail(P, dt) {
  const t = G.cos && G.cos.trail;
  if (!t || Math.hypot(P.vx, P.vy) < 20) return;
  P.trailT = (P.trailT || 0) - dt;
  if (P.trailT > 0) return;
  P.trailT = 0.05;
  emit(t.part, P.x + rand(-6, 6), P.y + 12, 1, { speed: 0.3, color: t.color });
}
function drawCosmeticAura(ctx, P) {
  const a = G.cos && G.cos.aura;
  if (!a) return;
  const pulse = 0.55 + Math.sin(G.time * 3) * 0.15;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pulse;
  ctx.drawImage(glowSprite(a.color, 30), P.x - 30, P.y - 22);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = hexA(a.color, 0.55 * pulse); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(P.x, P.y + 13, 17, 6, 0, 0, TAU); ctx.stroke();
}
function cosmeticsHtml() {
  const M = loadMeta();
  let h = '<div class="muted">ของตกแต่งไม่เพิ่มพลัง — โชว์ว่าผ่านอะไรมาแล้ว · คลิกเพื่อใส่ / ถอด (ใส่ได้อย่างละ 1)</div>';
  for (const kind in COSMETIC_KIND) {
    h += `<h3 class="altar-h">${COSMETIC_KIND[kind]}</h3><div class="cos-grid">`;
    for (const [id, c] of Object.entries(COSMETICS).filter(([, x]) => x.kind === kind)) {
      const open = cosmeticOpen(id), on = M.cos[kind] === id;
      h += `<button class="cos${open ? '' : ' locked'}${on ? ' on' : ''}" data-cos="${id}" ${open ? '' : 'disabled'} style="--cc:${c.color || '#e8c870'}">
        ${kind === 'title' ? `<b>「${c.name}」</b>` : `<span class="cos-dot"></span> <b>${c.name}</b>`}<br><span class="muted">${open ? (on ? 'ใส่อยู่ ✓' : 'คลิกเพื่อใส่') : '🔒 ' + c.src}</span></button>`;
    }
    h += '</div>';
  }
  return h;
}
function bindCosmetics(box) {
  box.querySelectorAll('[data-cos]').forEach((b) => { b.onclick = () => { if (cosmeticToggle(b.dataset.cos)) { Sfx.play('select'); renderAltarProgress(); } }; });
}

// ---------------- end of run ----------------
function settleGoals(r) {
  const M = loadMeta(), out = { quests: [], heat: null, cosmetics: [] };
  if (r.win && r.heat > 0 && !G.daily) {
    const before = M.heat[r.cls] || 0;
    if (r.heat > before) { M.heat[r.cls] = r.heat; out.heat = { from: before, to: r.heat }; }
  }
  saveMeta();
  out.quests = questCheck(r);
  for (const id in COSMETICS) if (!M.cosSeen[id] && COSMETICS[id].test(M)) { M.cosSeen[id] = true; out.cosmetics.push(COSMETICS[id]); }
  saveMeta();
  return out;
}
function goalsSummaryHtml(o) {
  const lines = [];
  if (o.heat) lines.push(`☠ สถิติ Corruption ใหม่ของคลาสนี้: <b>${o.heat.from} → ${o.heat.to}</b>`);
  for (const q of o.quests) lines.push(`📜 ภารกิจสำเร็จ: <b>${q.name}</b> — ${rewardText(q.reward)}`);
  for (const c of o.cosmetics) lines.push(`✨ ปลดของตกแต่ง: ${COSMETIC_KIND[c.kind]} <b>${c.name}</b> (ใส่ได้ที่ Altar → Cosmetic)`);
  return lines.map((l) => `<div class="over-unlock">${l}</div>`).join('');
}

// ---------------- main menu: the next few things worth chasing ----------------
function nextGoals() {
  const M = loadMeta(), out = [];
  const q = currentQuest(M);
  if (q) out.push({ pin: true, icon: '📜', text: `ภารกิจ ${QUESTS.indexOf(q) + 1}/${QUESTS.length}: <b>${q.name}</b> — ${q.desc}`, sub: 'รางวัล ' + rewardText(q.reward), p: null });
  // the gem closest to its next unlock (alternate quality or head start)
  let gem = null;
  for (const id in M.gems) {
    const g = M.gems[id], marks = [GEM_ALT_AT.anomalous, GEM_ALT_AT.divergent, GEM_ALT_AT.phantasmal, GEM_HEAD_START_AT], at = marks.find((n) => n > g.lv);
    if (!at) continue;
    let need = -g.xp; for (let l = g.lv; l < at; l++) need += GEM_XP_REQ(l);
    if (!gem || need < gem.need) gem = { id, g, at, need };
  }
  if (gem) {
    const what = gem.at === GEM_HEAD_START_AT ? 'เริ่มรอบที่ +2 เลเวล' : 'ปลด ' + ALT_QUALITY[Object.keys(GEM_ALT_AT).find((k) => GEM_ALT_AT[k] === gem.at)].name;
    out.push({ icon: '💎', text: `<b>${SKILLS[gem.id].name}</b> Gem Mastery Lv ${gem.g.lv} → ${gem.at}: ${what}`, sub: `อีก ${gem.need} XP · ใช้เจมนี้ในรอบ หรือเติมด้วย Shards ที่ Altar`, p: gem.g.xp / GEM_XP_REQ(gem.g.lv), go: 'gems' });
  }
  const found = Object.keys(M.found).length, cb = COLLECTION_BONUS.find((b) => b.n > found);
  if (cb) out.push({ icon: '★', text: `Unique Collection ${found}/${cb.n}: <b>${cb.desc}</b>`, sub: 'ดูแหล่งดรอปที่ Codex → Unique', p: found / cb.n, go: 'coll' });
  const done = Object.keys(M.chal).length, ms = CHAL_MILESTONES.find((b) => b.n > done), nextC = CHALLENGES.find((c) => !M.chal[c.id]);
  if (ms && nextC) out.push({ icon: '🏅', text: `Challenge ${done}/${ms.n}: <b>${ms.desc}</b>`, sub: `ข้อถัดไป: ${nextC.name} — ${nextC.desc}`, p: done / ms.n, go: 'chal' });
  if (corruptionOpen()) {
    const best = heatBest(M), mark = [5, 10, 15, 20, 25].find((n) => n > best);
    const cos = mark && Object.values(COSMETICS).find((c) => c.src === 'ชนะ Corruption ' + mark);
    if (mark) out.push({ icon: '☠', text: `ชนะ Corruption ${mark}${cos ? `: ปลด <b>${cos.name}</b>` : ''}`, sub: `สถิติสูงสุด ${best} · เลือกได้ที่ Map Device`, p: best / mark });
  }
  // Endgame Echo ladder: only once the player has seen the victory screen
  if (M.life.wins >= 1) {
    const best = M.echoBest || 0, ms = ECHO_MILESTONES.find((m) => m.n > best);
    if (ms) out.push({ icon: '∞', text: `Endgame Echo ${ms.n}: <b>${ms.teaser}</b>`, sub: `สถิติสูงสุด Echo ${best} · เข้า Endgame ได้หลังโค่นบอสสุดท้าย`, p: best / ms.n, go: 'lb' });
  }
  const used = treePointsUsed();
  if (used < treePointCap()) {
    const cost = treeNodeCost({ kind: 'small' }, used);
    out.push({ icon: '⛩', text: M.shards >= cost ? '<b>มี Shards พอจัดสรรโหนดใหม่</b> บน Legacy Tree' : `เก็บ Shards ให้ถึง ${cost} ✦ เพื่อโหนด Legacy Tree ถัดไป`, sub: `แต้ม ${used}/${treePointCap()}`, p: Math.min(1, M.shards / cost), go: 'tree' });
  }
  const lock = UNLOCKS.filter((u) => !M.unlocked[u.id]).sort((a, b) => a.cost - b.cost)[0];
  if (lock) out.push({ icon: '🔓', text: `ปลดล็อก${lock.kind === 'class' ? 'คลาส' : 'เจม'} <b>${unlockLabel(lock)}</b>`, sub: `${lock.req} หรือ ${lock.cost} ✦`, p: Math.min(1, M.shards / lock.cost), go: 'tree' });
  const pinned = out.filter((g) => g.pin), rest = out.filter((g) => !g.pin).sort((a, b) => (b.p ?? 0.5) - (a.p ?? 0.5));
  return pinned.concat(rest).slice(0, 4);
}
function renderMenuGoals() {
  const box = $('menu-goals'), list = nextGoals();
  box.innerHTML = list.length ? `<div class="goals-h">🎯 เป้าหมายถัดไป</div>${list.map((g) => `<div class="goal${g.go ? ' link' : ''}"${g.go ? ` data-go="${g.go}"` : ''}>
      <span class="goal-ico">${g.icon}</span><div class="goal-body"><div>${g.text}</div><div class="muted">${g.sub}</div>
      ${g.p !== null && g.p !== undefined ? `<div class="bar goal-bar"><div style="width:${Math.round(clamp(g.p, 0, 1) * 100)}%"></div></div>` : ''}</div></div>`).join('')}` : '';
  box.querySelectorAll('[data-go]').forEach((el) => {
    el.onclick = () => { Sfx.init(); if (el.dataset.go === 'tree') openAltar(); else openRecords(el.dataset.go); };
  });
}
