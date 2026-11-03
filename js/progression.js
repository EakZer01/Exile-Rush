'use strict';
// ============================================================
//  Endgame runtime (data in js/data/endgame.js):
//  permanent bonuses, Scarabs, source uniques, Gem Mastery, the Vault,
//  Heirlooms, Challenges, Voidstones, Atlas tier completion — and the
//  Altar / Map Device panels that show them.
// ============================================================

// ---------------- permanent bonuses: Unique collection + Challenge milestones ----------------
const foundCount = () => Object.keys(loadMeta().found || {}).length;
const chalCount = () => Object.keys(loadMeta().chal).length;
function permanentFx(f) {
  const found = foundCount(), done = chalCount();
  for (const b of COLLECTION_BONUS) if (found >= b.n && b.fx) b.fx(f);
  for (const b of CHAL_MILESTONES) if (done >= b.n && b.fx) b.fx(f);
}
function permanentMods(m) {
  const found = foundCount(), done = chalCount();
  for (const b of COLLECTION_BONUS) if (found >= b.n && b.mods) b.mods(m);
  for (const b of CHAL_MILESTONES) if (done >= b.n && b.mods) b.mods(m);
}

// ---------------- per-map bonuses: slotted Scarabs and Voidstones ----------------
const voidCount = () => Object.keys(loadMeta().voids).length;
const voidActive = (tier) => (tier >= VOIDSTONE_MIN_TIER ? voidCount() : 0);
function applyMapBonuses(f, fx, map) {
  for (const id of map.scarabs || []) { const s = SCARABS[id]; s.a(f); if (s.map) s.map(fx); }
  const n = voidActive(map.tier);
  if (!n) return;
  fx.monHp *= VOID_FX.monHp ** n; fx.monDmg *= VOID_FX.monDmg ** n;
  f.itemQty *= VOID_FX.itemQty ** n; f.uniqueMul *= VOID_FX.uniqueMul ** n;
  f.shardMul *= VOID_FX.shardMul ** n; f.scarabDrop *= VOID_FX.scarabDrop ** n;
}
const scarabSlots = () => atlasFx().scarabSlots;

// ---------------- in-run drops: Scarabs and source-only uniques ----------------
function dropScarab(x, y) { spawnPickup(x + rand(-12, 12), y + rand(-12, 12), 'scarab', { scarab: randomScarab() }); }
function maybeScarab(x, y, p) { if (Math.random() < p * G.atlasFx.scarabDrop) dropScarab(x, y); }
function collectScarab(id) {
  G.runScarabs.push(id);
  lootLog('Scarab: ' + SCARABS[id].name, SCARABS[id].color);
  showTip('scarab');
}
function dropSourceUnique(x, y, src) { dropItem(x, y, 'unique', null, src); }
const srcChance = (p) => Math.random() < Math.min(0.95, p * G.atlasFx.srcUnique);
// monsters: scarabs from Rares and bosses (called by killEnemy)
function rollScarabDrops(e) {
  if (e.rarity === 2) maybeScarab(e.x, e.y, 0.03);
  else if (e.rarity === 3) {
    maybeScarab(e.x - 50, e.y, e.final ? 0.7 : e.bossDef.echo ? 0.5 : 0.25);
    if (e.final) maybeScarab(e.x + 50, e.y, 0.3);
  }
}
// bosses: the unique each boss guards (called by bossDefeated)
function rollBossUniques(e) {
  const t = G.map.tier, x = e.x, y = e.y + 70;
  if (e.bossDef.pinnacle) {
    if (srcChance(0.6)) dropSourceUnique(x, y, 'pinnacle');
    if (G.atlasFx.srcBossSure || srcChance(0.25)) dropSourceUnique(x + 40, y, 'boss_' + G.map.biome);
  } else if (e.final) {
    if (G.atlasFx.srcBossSure || srcChance(0.3 + 0.05 * (t - 1))) dropSourceUnique(x, y, 'boss_' + G.map.biome);
  } else if (e.bossDef.echo && srcChance(0.3)) dropSourceUnique(x, y, 'echo');
}

// ---------------- Gem Mastery ----------------
function gemData(id) { const M = loadMeta(); return M.gems[id] || (M.gems[id] = { xp: 0, lv: 0, alt: null }); }
const gemLv = (id) => { const g = loadMeta().gems[id]; return g ? g.lv : 0; };
// mastery of a gem for stat building, or null when it has none yet
function gemMastery(id) { const g = loadMeta().gems[id]; return g && (g.lv || g.alt) ? g : null; }
const gemStartBonus = (id) => (gemLv(id) >= GEM_HEAD_START_AT ? 2 : 0);
const gemAltsOpen = (id) => Object.keys(GEM_ALT_AT).filter((a) => gemLv(id) >= GEM_ALT_AT[a]);
function gemAddXp(id, n) {
  const g = gemData(id);
  let up = 0;
  g.xp += n;
  while (g.xp >= GEM_XP_REQ(g.lv)) { g.xp -= GEM_XP_REQ(g.lv); g.lv++; up++; }
  return up;
}
function gemInfuse(id) {
  const M = loadMeta(), cost = gemInfuseCost(gemLv(id));
  if (M.shards < cost) return false;
  M.shards -= cost; gemAddXp(id, GEM_INFUSE_XP); saveMeta();
  return true;
}
function gemSetAlt(id, alt) {
  const g = gemData(id);
  if (alt && !gemAltsOpen(id).includes(alt)) return false;
  g.alt = g.alt === alt ? null : alt; saveMeta();
  return true;
}
// xp each gem earned this run: kills, its share of the damage, and winning
function runGemXp(win) {
  const P = G.player, total = P.skills.reduce((a, s) => a + s.dmgDealt, 0) || 1;
  return P.skills.map((inst) => ({ id: inst.id, xp: Math.round(5 + inst.kills / 60 + (inst.dmgDealt / total) * (G.time / 12) + (win ? 15 : 0)) }));
}

// ---------------- Heirlooms ----------------
function heirCount() { return loadMeta().stash.filter((it) => it.heir).length; }
function heirBind(i) {
  const M = loadMeta(), it = M.stash[i];
  if (!it || it.heir || it.slot === 'jewel' || M.shards < HEIR_BIND_COST || heirCount() >= HEIR_MAX) return false;
  M.shards -= HEIR_BIND_COST; it.heir = { xp: 0 }; it.locked = true; saveMeta();
  return true;
}
function heirLineHtml(it) {
  if (!it.heir) return '';
  const lv = heirLevel(it.heir.xp), next = HEIR_XP[lv];
  return `<div class="pt-heir">❖ Heirloom Lv ${lv}/5${next ? ` <span class="muted">(${it.heir.xp}/${next})</span>` : ''}<br>
    ทุกสกิลทำดาเมจ ${3 * lv}% more · +${3 * lv}% ชีวิตสูงสุด${lv >= 5 ? ' · +1 เลเวลเจมทั้งหมด' : ''}<br>
    <span class="muted">พกเข้ารอบแล้วกลับเข้า Stash เองเมื่อจบรอบ · ชนะได้ XP มากกว่า · ตายใน Hardcore = หาย</span></div>`;
}

// ---------------- Vault: one pick after the final boss ----------------
function rollVault() {
  const f = G.atlasFx, t = G.map.tier, n = 3 + f.vaultExtra;
  const leg = Math.min(0.5, 0.04 + 0.02 * t + 0.01 * G.map.mods.length + f.vaultLuck);
  const heir = runItems(true).some((it) => it.heir);
  const kinds = { shards: 3, scarab: 3, map: 2, jewel: 2, gemxp: 2, unique: 1.4, heir: heir ? 1.5 : 0 };
  const picked = weightedSample(Object.keys(kinds).filter((k) => kinds[k] > 0), Math.min(n, 6), (k) => kinds[k]);
  return picked.map((kind) => {
    const r = Math.random(), rarity = r < leg ? 'legendary' : r < leg + 0.3 ? 'rare' : 'common';
    return vaultCard(kind, kind === 'unique' && rarity === 'common' ? 'rare' : rarity);
  });
}
function vaultCard(kind, rarity) {
  const t = G.map.tier, k = VAULT_RARITY[rarity].k, c = { kind, rarity };
  if (kind === 'shards') { c.n = Math.round((50 + 20 * t) * k); c.label = `${c.n} ✦ Ancient Shards`; }
  else if (kind === 'scarab') { c.ids = Array.from({ length: rarity === 'legendary' ? 3 : rarity === 'rare' ? 2 : 1 }, randomScarab); if (rarity === 'legendary') c.ids[0] = pick(Object.keys(SCARABS).filter((id) => SCARABS[id].rare)); c.label = c.ids.map((id) => SCARABS[id].name).join(' · '); }
  else if (kind === 'map') { const tier = Math.min(MAX_MAP_TIER, t + (rarity === 'legendary' ? 2 : 1)); c.maps = Array.from({ length: rarity === 'common' ? 1 : 2 }, () => makeMapItem(tier, null, 'rare')); c.label = `แผนที่ Rare T${tier} ×${c.maps.length}`; }
  else if (kind === 'jewel') { c.items = Array.from({ length: rarity === 'legendary' ? 2 : 1 }, () => makeJewel(rarity === 'common' ? 'magic' : 'rare')); c.label = `Jewel ${rarity === 'common' ? 'Magic' : 'Rare'} ×${c.items.length} (เข้า Stash)`; }
  else if (kind === 'gemxp') { const top = G.player.skills.reduce((b, s) => (!b || s.dmgDealt > b.dmgDealt ? s : b), null); c.gem = top.id; c.n = Math.round(40 * k); c.label = `Gem Mastery XP +${c.n} ให้ ${SKILLS[top.id].name}`; }
  else if (kind === 'unique') {
    const src = rarity === 'legendary' ? 'boss_' + G.map.biome : null;
    c.items = [makeItem('unique', null, G.time, t, src)];
    c.label = rarity === 'legendary' ? `Unique ประจำพื้นที่: ${c.items[0].name}` : `Unique: ${c.items[0].name}`;
  } else if (kind === 'heir') { c.n = rarity === 'legendary' ? 4 : rarity === 'rare' ? 2 : 1; c.label = `Heirloom XP +${c.n} (ทุกชิ้นที่พกมา)`; }
  return c;
}
// rewards land in the persistent save right away
function claimVault(c) {
  const M = loadMeta();
  if (c.kind === 'shards') M.shards += c.n;
  else if (c.kind === 'scarab') for (const id of c.ids) M.scarabs[id] = (M.scarabs[id] || 0) + 1;
  else if (c.kind === 'map') { M.maps.push(...c.maps); M.maps.sort((a, b) => b.tier - a.tier); M.maps.length = Math.min(M.maps.length, MAP_ITEM_CAP); }
  else if (c.kind === 'jewel' || c.kind === 'unique') for (const it of c.items) { if (!stashAdd(it)) M.shards += 30; if (it.unique) M.found[it.unique] = true; }
  else if (c.kind === 'gemxp') gemAddXp(c.gem, c.n);
  else if (c.kind === 'heir') for (const it of runItems(true)) if (it.heir) it.heir.xp += c.n;
  saveMeta();
}
function renderVault() {
  const V = G.vault, box = $('vic-vault');
  box.innerHTML = `<div class="bv-title">🗝 ห้องรางวัล — เลือก 1 จาก ${V.cards.length}</div><div class="cards vault-cards">${V.cards.map((c, i) => {
    const R = VAULT_RARITY[c.rarity];
    return `<div class="card vault-card v-${c.rarity}${V.pick === i ? ' picked' : ''}${V.pick !== null && V.pick !== i ? ' dim' : ''}" data-vault="${i}" style="--cc:${R.color}">
      <div class="badge" style="color:${R.color}">${R.th}</div><div class="card-name">${VAULT_ICON[c.kind]} ${c.label}</div>
      ${V.pick === i ? '<div class="ok">ได้รับแล้ว ✓</div>' : ''}</div>`;
  }).join('')}</div>`;
  box.querySelectorAll('[data-vault]').forEach((el) => {
    el.onclick = () => {
      if (V.pick !== null) return;
      V.pick = +el.dataset.vault; claimVault(V.cards[V.pick]); Sfx.play(V.cards[V.pick].rarity === 'legendary' ? 'unique' : V.cards[V.pick].rarity === 'rare' ? 'rare' : 'currency');
      renderVault(); setVictoryButtons();
    };
  });
}
const VAULT_ICON = { shards: '✦', scarab: '✲', map: '🗺', jewel: '⬡', gemxp: '💎', unique: '★', heir: '❖' };
function setVictoryButtons() {
  const off = G.vault && G.vault.pick === null;
  $('btn-vic-leave').classList.toggle('disabled', off); $('btn-vic-endless').classList.toggle('disabled', off);
  $('vic-hint').textContent = off ? 'เลือกรางวัลจากห้องรางวัลก่อน แล้วจึงออกหรืออยู่ต่อ' : '';
}

// ---------------- Atlas tier completion ----------------
// tiers where every biome open at that tier has been cleared
function atlasCompletedTiers() {
  const A = atlasData(), out = [];
  for (let t = 1; t <= MAX_MAP_TIER; t++) if (Object.keys(BIOMES).filter((b) => BIOMES[b].minTier <= t).every((b) => A.done[b + '_' + t])) out.push(t);
  return out;
}
function atlasTierProgress(t) {
  const A = atlasData(), open = Object.keys(BIOMES).filter((b) => BIOMES[b].minTier <= t);
  return { done: open.filter((b) => A.done[b + '_' + t]).length, of: open.length };
}

// ---------------- end of run: everything persistent beyond Shards ----------------
function settleProgression(win, endT) {
  const M = loadMeta(), P = G.player, out = { gems: [], heirs: [], chal: [], voids: [], tiers: [], scarabs: 0 };
  const lostRun = G.hc && !win;
  // Scarabs picked up (Hardcore deaths lose them)
  if (!lostRun) for (const id of G.runScarabs) { M.scarabs[id] = (M.scarabs[id] || 0) + 1; out.scarabs++; }
  // Gem Mastery
  for (const g of runGemXp(win)) { const up = gemAddXp(g.id, g.xp); out.gems.push({ id: g.id, xp: g.xp, up, lv: gemLv(g.id) }); }
  // Heirlooms come home on their own and grow
  let heirMax = 0;
  for (const it of runItems(true).filter((x) => x.heir)) {
    if (lostRun) { out.heirs.push({ name: it.name, lost: true }); continue; }
    const before = heirLevel(it.heir.xp);
    it.heir.xp += win ? 2 + Math.floor(G.map.tier / 3) : 1;
    const lv = heirLevel(it.heir.xp); heirMax = Math.max(heirMax, lv);
    stripEquipmentSockets(it); M.stash.push(it);
    out.heirs.push({ name: it.name, lv, up: lv > before });
  }
  // lifetime records used by challenges and voidstones
  M.life.echoes = (M.life.echoes || 0) + (G.stats.echoes || 0);
  if (win) M.winCls[P.cls.id] = true;
  // Atlas tier completion (map completion was recorded by settleRun)
  for (const t of atlasCompletedTiers()) if (!M.atlasTiers[t]) {
    M.atlasTiers[t] = true; out.tiers.push(t);
    for (let i = 0; i < ATLAS_TIER_SCARABS; i++) { const id = randomScarab(); M.scarabs[id] = (M.scarabs[id] || 0) + 1; }
  }
  // Challenges
  const r = { win, tier: G.map.tier, mods: G.map.mods.length, hc: G.hc, daily: !!G.daily, ci: !!P.keystones.chaos_inoculation,
    skills: P.skills.length, keystones: Object.keys(P.keystones).length, endless: endT, echoes: G.stats.echoes || 0,
    masteries: P.masteries.length, evolved: P.skills.filter((s) => s.evo).length, awakened: P.skills.reduce((a, s) => a + s.awakened.length, 0),
    kills: G.stats.kills, level: P.level, breaches: G.stats.breaches || 0, scarabs: (G.map.scarabs || []).length, pinnacle: !!G.stats.pinnacle, heirMax,
    bosses: G.stats.bosses, asc: !!P.asc, jeweller: !!G.stats.jeweller, heat: G.heat || 0, cls: P.cls.id };
  out.r = r;
  const before = chalCount();
  for (const c of CHALLENGES) if (!M.chal[c.id] && c.test(r, M)) { M.chal[c.id] = true; M.shards += c.shards; out.chal.push(c); }
  out.milestones = CHAL_MILESTONES.filter((b) => b.n > before && b.n <= chalCount());
  // Voidstones
  for (const v of VOIDSTONES) if (!M.voids[v.id] && v.test(r, M)) { M.voids[v.id] = true; out.voids.push(v); }
  saveMeta();
  return out;
}
function progressionSummaryHtml(o) {
  const lines = [];
  if (o.scarabs) lines.push(`✲ ได้ Scarab ${o.scarabs} อัน (ใช้ที่ Map Device)`);
  const ups = o.gems.filter((g) => g.up);
  lines.push(`💎 Gem Mastery: ${o.gems.map((g) => `${SKILLS[g.id].name} +${g.xp} XP${g.up ? ` <b class="ok">→ Lv ${g.lv}!</b>` : ''}`).join(' · ')}`);
  if (ups.some((g) => Object.values(GEM_ALT_AT).includes(g.lv) || g.lv === GEM_HEAD_START_AT)) lines.push('<span class="ok">ปลดล็อกความสามารถใหม่ของเจม — เลือกได้ที่ Altar → Gem Mastery</span>');
  for (const h of o.heirs) lines.push(h.lost ? `❖ Heirloom <b>${h.name}</b> สูญหาย (Hardcore)` : `❖ Heirloom <b>${h.name}</b> กลับเข้า Stash · Lv ${h.lv}${h.up ? ' <b class="ok">เลเวลอัป!</b>' : ''}`);
  for (const t of o.tiers) lines.push(`🗺 Atlas Tier ${t} ครบทุกพื้นที่! +1 แต้ม Atlas Tree · +${ATLAS_TIER_SCARABS} Scarab`);
  for (const c of o.chal) lines.push(`🏅 Challenge สำเร็จ: <b>${c.name}</b> — ${c.desc} (+${c.shards} ✦)`);
  for (const b of o.milestones) lines.push(`🏅 Challenge ครบ ${b.n}: <b>${b.desc}</b> (ถาวร)`);
  for (const v of o.voids) lines.push(`◈ ได้ <b>${v.name}</b>! แผนที่ Tier ${VOIDSTONE_MIN_TIER}+ ยากขึ้นและดรอปดีขึ้น`);
  return lines.map((l) => `<div class="over-unlock">${l}</div>`).join('');
}

// ---------------- Map Device: Scarab slots ----------------
let mapScarabs = [];
function renderMapScarabs() {
  const M = loadMeta(), slots = scarabSlots();
  mapScarabs = mapScarabs.filter((id) => (M.scarabs[id] || 0) > 0).slice(0, slots);
  const owned = Object.keys(SCARABS).filter((id) => M.scarabs[id] > 0);
  $('map-scarab-n').textContent = `(ใส่ ${mapScarabs.length}/${slots} ช่อง · ใช้แล้วหมดไป)`;
  $('map-scarabs').innerHTML = (owned.length ? owned.map((id) => {
    const s = SCARABS[id], on = mapScarabs.includes(id);
    return `<button class="scarab${on ? ' on' : ''}${s.rare ? ' rare' : ''}" data-scarab="${id}" style="--cc:${s.color}" title="${s.th}">✲ <b>${s.name}</b> ×${M.scarabs[id]}<br><span class="muted">${s.th}</span></button>`;
  }).join('') : '<div class="muted">ยังไม่มี Scarab — ดรอปจากบอส / Rare / Breach / Strongbox / Delirium / ห้องรางวัล</div>')
    + `<button class="btn btn-small" id="btn-buy-scarab" ${M.shards < SCARAB_PRICE ? 'disabled' : ''}>ซื้อ Scarab สุ่ม (${SCARAB_PRICE} ✦)</button>`;
  $('map-scarabs').querySelectorAll('[data-scarab]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.scarab;
      if (mapScarabs.includes(id)) mapScarabs = mapScarabs.filter((x) => x !== id);
      else if (mapScarabs.length < slots) mapScarabs.push(id);
      openMapDevice();
    };
  });
  $('btn-buy-scarab').onclick = () => {
    if (M.shards < SCARAB_PRICE) return;
    const id = randomScarab(); M.shards -= SCARAB_PRICE; M.scarabs[id] = (M.scarabs[id] || 0) + 1; saveMeta();
    Sfx.play('currency'); openMapDevice();
  };
}
// the selected scarabs are spent when the map opens
function spendMapScarabs() {
  const M = loadMeta(), used = mapScarabs.filter((id) => (M.scarabs[id] || 0) > 0);
  for (const id of used) M.scarabs[id]--;
  mapScarabs = [];
  return used;
}
function voidAtlasHtml(tier) {
  const n = voidCount(), done = atlasCompletedTiers();
  let h = `◈ Voidstone ${n}/${VOIDSTONES.length}`;
  if (n) h += voidActive(tier) ? ` <span class="ok">(ทำงานใน Tier นี้: มอนสเตอร์แข็งขึ้น · ไอเทม/Unique/Shards/Scarab เพิ่มขึ้น)</span>` : ` <span class="muted">(ทำงานตั้งแต่ Tier ${VOIDSTONE_MIN_TIER})</span>`;
  const p = atlasTierProgress(tier);
  h += ` · Atlas Tier ${tier}: ${done.includes(tier) ? '<span class="ok">ครบแล้ว ✓</span>' : `${p.done}/${p.of} พื้นที่ (ครบ = +1 แต้ม Atlas Tree, +${ATLAS_TIER_SCARABS} Scarab)`}`;
  return h;
}

// ---------------- Altar panels: Gem Mastery, Challenges, Voidstones, Collection ----------------
let altarTab = 'gems';
function renderAltarProgress() {
  const box = $('altar-prog');
  const tabs = [['gems', '💎 Gem Mastery'], ['chal', `🏅 Challenges ${chalCount()}/${CHALLENGES.length}`], ['void', `◈ Voidstone & Atlas`], ['coll', `★ Unique Collection ${foundCount()}/${Object.keys(UNIQUES).length}`], ['cos', '✨ Cosmetic']];
  let h = `<div class="codex-tabs">${tabs.map(([id, l]) => `<button class="btn btn-small${altarTab === id ? ' sel' : ''}" data-atab="${id}">${l}</button>`).join('')}</div>`;
  if (altarTab === 'gems') h += gemMasteryHtml();
  else if (altarTab === 'chal') h += challengesHtml();
  else if (altarTab === 'void') h += voidPanelHtml();
  else if (altarTab === 'cos') h += cosmeticsHtml();
  else h += collectionHtml();
  box.innerHTML = h;
  box.querySelectorAll('[data-atab]').forEach((b) => { b.onclick = () => { altarTab = b.dataset.atab; renderAltarProgress(); }; });
  box.querySelectorAll('[data-infuse]').forEach((b) => { b.onclick = () => { if (gemInfuse(b.dataset.infuse)) { Sfx.play('currency'); openAltar(); } }; });
  bindCosmetics(box);
  box.querySelectorAll('[data-alt]').forEach((b) => { b.onclick = () => { const [id, alt] = b.dataset.alt.split(':'); if (gemSetAlt(id, alt)) { Sfx.play('levelup'); renderAltarProgress(); } }; });
}
function gemMasteryHtml() {
  const M = loadMeta();
  const ids = Object.keys(SKILLS).filter((id) => !isLocked('gem', id)).sort((a, b) => (gemLv(b) - gemLv(a)) || ((M.gems[b] || {}).xp || 0) - ((M.gems[a] || {}).xp || 0));
  let h = `<div class="muted">เจมที่ใช้ในรอบได้ XP ตามการฆ่าและดาเมจ · ทุกเลเวล +2% ดาเมจ (หลัง Lv 20: +0.5% ไม่จำกัด) · Lv ${GEM_ALT_AT.anomalous}/${GEM_ALT_AT.divergent}/${GEM_ALT_AT.phantasmal} ปลด Alternate Quality · Lv ${GEM_HEAD_START_AT}: ได้เจมนี้เริ่ม +2 เลเวล · ใช้ Shards เติม XP ได้ไม่จำกัด</div><div class="gm-grid">`;
  for (const id of ids) {
    const g = M.gems[id] || { xp: 0, lv: 0, alt: null }, req = GEM_XP_REQ(g.lv), alts = gemAltsOpen(id), cost = gemInfuseCost(g.lv);
    h += `<div class="gm-card${g.lv ? '' : ' fresh'}">${skillGemHtml(id, true)} <b>${SKILLS[id].name}</b> <span class="gm-lv">Lv ${g.lv}</span>
      <div class="bar gm-bar"><div style="width:${(g.xp / req) * 100}%"></div></div><div class="muted">${g.xp}/${req} XP · ดาเมจ +${Math.round((gemMasteryMore(g.lv) - 1) * 1000) / 10}%</div>
      <div class="gm-alts">${Object.keys(ALT_QUALITY).map((a) => alts.includes(a)
        ? `<button class="btn btn-small${g.alt === a ? ' sel' : ''}" data-alt="${id}:${a}" title="${altQualityDesc(a, id)}">${ALT_QUALITY[a].name}</button>`
        : `<span class="gm-lock" title="${altQualityDesc(a, id)}">🔒 ${ALT_QUALITY[a].name} (Lv ${GEM_ALT_AT[a]})</span>`).join('')}</div>
      ${g.alt ? `<div class="gm-altdesc">${ALT_QUALITY[g.alt].name}: ${altQualityDesc(g.alt, id)}</div>` : ''}
      <button class="btn btn-small btn-dim" data-infuse="${id}" ${M.shards < cost ? 'disabled' : ''}>เติม +${GEM_INFUSE_XP} XP (${cost} ✦)</button></div>`;
  }
  return h + '</div>';
}
function challengesHtml() {
  const M = loadMeta(), done = chalCount();
  let h = `<div class="chal-ms">${CHAL_MILESTONES.map((b) => `<span class="${done >= b.n ? 'ok' : 'muted'}">${done >= b.n ? '✓' : '○'} ${b.n}: ${b.desc}</span>`).join('')}</div><div class="chal-grid">`;
  for (const c of CHALLENGES) h += `<div class="chal${M.chal[c.id] ? ' done' : ''}"><b>${M.chal[c.id] ? '🏅' : '○'} ${c.name}</b> <span class="muted">+${c.shards} ✦</span><br><span class="muted">${c.desc}</span></div>`;
  return h + '</div>';
}
function voidPanelHtml() {
  const M = loadMeta(), done = atlasCompletedTiers();
  let h = `<div class="muted">Voidstone แต่ละอัน: แผนที่ Tier ${VOIDSTONE_MIN_TIER} ขึ้นไปมีมอนสเตอร์ชีวิต ×${VOID_FX.monHp} ดาเมจ ×${VOID_FX.monDmg} แต่ไอเทม ×${VOID_FX.itemQty} · Unique ×${VOID_FX.uniqueMul} · Shards ×${VOID_FX.shardMul} · Scarab ×${VOID_FX.scarabDrop}</div><div class="chal-grid">`;
  for (const v of VOIDSTONES) h += `<div class="chal${M.voids[v.id] ? ' done' : ''}"><b>${M.voids[v.id] ? '◈' : '◇'} ${v.name}</b><br><span class="muted">${v.req}</span></div>`;
  h += '</div><h3 class="altar-h">Atlas Tier Completion <span class="muted">(ครบทุกพื้นที่ใน Tier = +1 แต้ม Atlas Tree + Scarab)</span></h3><div class="atlas-tiers">';
  for (let t = 1; t <= MAX_MAP_TIER; t++) { const p = atlasTierProgress(t); h += `<span class="${done.includes(t) ? 'ok' : 'muted'}">T${t} ${done.includes(t) ? '✓' : `${p.done}/${p.of}`}</span>`; }
  return h + '</div>';
}
function collectionHtml() {
  const M = loadMeta(), n = foundCount();
  let h = `<div class="chal-ms">${COLLECTION_BONUS.map((b) => `<span class="${n >= b.n ? 'ok' : 'muted'}">${n >= b.n ? '✓' : '○'} ${b.n}: ${b.desc}</span>`).join('')}</div>`;
  for (const src in UNIQUE_SOURCES) {
    const ids = Object.keys(UNIQUES).filter((id) => uniqueSrc(id) === src), got = ids.filter((id) => M.found[id]).length;
    h += `<div class="coll-src"><b>${UNIQUE_SOURCES[src].th}</b> <span class="muted">${got}/${ids.length} · ${UNIQUE_SOURCES[src].where}</span><div class="altar-uniques">${ids.map((id) => M.found[id]
      ? `<div class="uq found" title="${UNIQUES[id].lines.join(' · ')}">${UNIQUES[id].name}<br><span class="muted">${SLOT_NAME[UNIQUES[id].slot]}</span></div>`
      : `<div class="uq"><span class="muted">??? · ${SLOT_NAME[UNIQUES[id].slot]}</span></div>`).join('')}</div></div>`;
  }
  return h;
}
