'use strict';
// ============================================================
//  Between-run loot: map items, jewels, the Stash, loadouts,
//  the Atlas passive tree, Hardcore and the Daily challenge
// ============================================================

// ---------------- in-run drops ----------------
function dropJewel(x, y) { G.items.push({ x: x + rand(-14, 14), y: y + rand(-14, 14), item: makeJewel(), t: 0 }); }
// jewels from monsters (called by killEnemy)
function rollLeagueDrops(e) {
  if (e.rarity === 3) { if (Math.random() < 0.35) dropJewel(e.x - 30, e.y - 30); }
  else if (e.rarity === 2 && Math.random() < 0.04) dropJewel(e.x, e.y);
}

// ---------------- loadout: stash items brought into a run ----------------
function giveLoadoutItem(P, it) {
  stripEquipmentSockets(it);
  it.uid = uid();
  if (it.slot === 'flask') { const i = P.flasks.findIndex((f) => !f); if (i >= 0) { it.charges = flaskStats(it).max * 0.5; it.active = 0; P.flasks[i] = it; return; } }
  else if (it.slot !== 'jewel') {
    const key = defaultKeyFor(it);
    if (!canEquip(it, key)) { const old = P.equip[key]; P.equip[key] = it; if (old) bagAdd(old); return; }
  }
  bagAdd(it);
}

// ---------------- game over: choose what to keep ----------------
let overPick = null;
// heirlooms go home on their own, so the keep-list leaves them out unless asked
function runItems(withHeir) {
  const P = G.player;
  return ITEM_SLOTS.map((k) => P.equip[k]).concat(P.flasks, P.backpack).filter((it) => it && it.slot !== 'jewel' && (withHeir || !it.heir));
}
function renderOverStash(r) {
  const box = $('over-stash');
  const limit = stashKeepLimit(r), items = runItems(), M = loadMeta();
  if (!overPick) overPick = { sel: new Set(), done: false, view: null };
  if (G.daily || G.weekly) { box.innerHTML = `<div class="muted">${G.daily ? 'Daily' : 'Weekly'} Challenge: เก็บของเข้า Stash ไม่ได้</div>`; return; }
  if (!limit) { box.innerHTML = '<div class="bad">Hardcore: ตายแล้ว — เก็บของเข้า Stash ไม่ได้</div>'; return; }
  if (overPick.done) { box.innerHTML = `<div class="ok">เก็บเข้า Stash แล้ว ${overPick.sel.size} ชิ้น ✓</div>`; return; }
  if (!items.length) { box.innerHTML = '<div class="muted">ไม่มีไอเทมให้เก็บ (Heirloom กลับเข้า Stash เองแล้ว)</div>'; return; }
  const room = STASH_CAP - M.stash.length;
  const picked = [...overPick.sel].map((i) => items[i]);
  box.innerHTML = `<div class="os-head"><span class="bv-title">เก็บเข้า Stash</span><span class="muted">เลือก ${Math.min(limit, room)} ชิ้น · ${overPick.sel.size}/${Math.min(limit, room)}</span></div>
    <div class="stash-grid small">${items.map((it, i) => stashCellHtml(it, 'op', i, overPick.sel.has(i))).join('')}</div>
    ${picked.length ? `<div class="os-picked">${picked.map((it) => `<span style="color:${RARITY_COLOR[it.rarity]}">${it.name}</span>`).join(' · ')}</div>` : ''}`;
  box.innerHTML += `
    ${overPick.view !== null ? itemCardHtml(items[overPick.view]) : '<div class="muted">แตะไอเทมเพื่อดูและเลือก</div>'}
    <div class="inv-actions"><button class="btn btn-small" id="btn-keep" ${overPick.sel.size ? '' : 'disabled'}>เก็บ ${overPick.sel.size} ชิ้น</button>
    <span class="muted">Stash ${M.stash.length}/${STASH_CAP}</span></div>`;
  box.querySelectorAll('[data-op]').forEach((el) => {
    el.onclick = () => {
      const i = +el.dataset.op;
      if (overPick.view === i) { if (overPick.sel.has(i)) overPick.sel.delete(i); else if (overPick.sel.size < Math.min(limit, room)) overPick.sel.add(i); }
      overPick.view = i; renderOverStash(r);
    };
  });
  $('btn-keep').onclick = () => {
    for (const i of overPick.sel) stashAdd(items[i]);
    saveMeta(); overPick.done = true; Sfx.play('currency'); renderOverStash(r);
  };
}
function stashCellHtml(it, key, i, sel) {
  return `<div class="stash-cell r-${it.rarity}${sel ? ' sel' : ''}${it.heir ? ' heir' : ''}" data-${key}="${i}" title="${it.name}"><img src="${itemIconURL(it)}" alt="" draggable="false">${it.heir ? `<span class="heir-badge">❖${heirLevel(it.heir.xp)}</span>` : ''}</div>`;
}

// ---------------- Stash window ----------------
let stashView = null;
function openStash() {
  const M = loadMeta();
  hide('menu');
  $('stash-sub').textContent = `${M.stash.length}/${STASH_CAP} ชิ้น · Jewel ใส่ได้ที่ Legacy Tree · ไอเทมอื่นพกเข้ารอบได้ที่ Map Device · ✦ ${M.shards}`;
  $('stash-grid').innerHTML = M.stash.map((it, i) => stashCellHtml(it, 'si', i, stashView === i)).join('') || '<div class="muted">Stash ว่าง — จบรอบแล้วเลือกไอเทมเก็บได้</div>';
  const it = M.stash[stashView];
  const canBind = it && !it.heir && it.slot !== 'jewel';
  $('stash-detail').innerHTML = it ? itemCardHtml(it) + `<div class="inv-actions">
      ${canBind ? `<button class="btn btn-small" id="btn-stash-heir" ${M.shards < HEIR_BIND_COST || heirCount() >= HEIR_MAX ? 'disabled' : ''} title="ไอเทมโตขึ้นทุกครั้งที่พกเข้ารอบ และกลับเข้า Stash เอง">❖ ผูกเป็น Heirloom (${HEIR_BIND_COST} ✦ · ${heirCount()}/${HEIR_MAX})</button>` : ''}
      ${it.heir ? '' : `<button class="btn btn-small btn-dim" id="btn-stash-salv">ย่อย (+${SALVAGE_SHARDS[it.rarity] || 1} ✦)</button>`}</div>` : '<div class="muted inv-help">แตะไอเทมเพื่อดูรายละเอียด · ไอเทมที่ผูกเป็น ❖ Heirloom จะเก่งขึ้นทุกครั้งที่พกเข้ารอบ</div>';
  $('stash').querySelectorAll('[data-si]').forEach((el) => { el.onclick = () => { stashView = +el.dataset.si; openStash(); }; });
  if (it && !it.heir) $('btn-stash-salv').onclick = () => { M.shards += SALVAGE_SHARDS[it.rarity] || 1; M.stash.splice(stashView, 1); stashView = null; saveMeta(); Sfx.play('pickup'); openStash(); };
  if (canBind) $('btn-stash-heir').onclick = () => { if (heirBind(stashView)) { Sfx.play('levelup'); openStash(); } };
  show('stash');
}
function closeStash() { hide('stash'); buildMenu(); show('menu'); }

// ---------------- Map Device additions ----------------
let mapLoadout = new Set(), mapHC = false, atlasOpen = false;
function loadoutCost() { const M = loadMeta(); let c = 0; for (const i of mapLoadout) if (M.stash[i]) c += LOADOUT_COST[M.stash[i].rarity] || 1; return c; }
function mapEntryCost() { return mapBuyCost(mapCfg.tier); }
function renderMapExtras() {
  const M = loadMeta(), A = atlasData();
  // loadout
  const stash = M.stash.map((it, i) => [it, i]).filter(([it]) => it.slot !== 'jewel');
  const lim = loadoutLimit();
  $('map-loadout-n').textContent = `(${mapLoadout.size}/${lim}) · ราคา ${loadoutCost()} ✦`;
  $('map-loadout').innerHTML = stash.map(([it, i]) => stashCellHtml(it, 'lo', i, mapLoadout.has(i))).join('') || '<div class="muted">Stash ว่าง</div>';
  $('mapdev').querySelectorAll('[data-lo]').forEach((el) => {
    el.onclick = () => { const i = +el.dataset.lo; if (mapLoadout.has(i)) mapLoadout.delete(i); else if (mapLoadout.size < lim) mapLoadout.add(i); openMapDevice(); };
    el.title = M.stash[+el.dataset.lo].name + ` (${LOADOUT_COST[M.stash[+el.dataset.lo].rarity]} ✦)`;
  });
  $('map-hc').checked = mapHC;
  $('map-hc').onchange = () => { mapHC = $('map-hc').checked; openMapDevice(); };
  if (mapHC && [...mapLoadout].some((i) => M.stash[i] && M.stash[i].heir)) $('map-loadout-n').textContent += ' · ⚠ Hardcore: ตายแล้ว Heirloom หาย';
  // start button shows what it costs
  const cost = mapEntryCost() + loadoutCost();
  $('btn-map-start').textContent = cost ? `เปิดแผนที่ · ${cost} ✦` : 'เปิดแผนที่';
  $('btn-map-start').disabled = M.shards < cost;
  $('map-atlas').textContent = `Atlas: ผ่านแล้ว ${atlasDoneCount()} แผนที่ · Tier สูงสุด ${A.maxTier} · แต้ม Legacy Tree จาก Atlas +${atlasBonusPoints()}/${ATLAS_POINT_CAP} · แต้ม Atlas Tree ${atlasUsed()}/${atlasPoints()} · ✦ ${M.shards}`;
  renderMapScarabs();
  renderMapCorruption();
  $('map-atlas').innerHTML += '<br>' + voidAtlasHtml(mapCfg.tier);
  renderAtlasTree();
}
function renderAtlasTree() {
  const box = $('map-atlastree'), A = loadMeta().atlasAlloc;
  box.classList.toggle('hidden', !atlasOpen);
  if (!atlasOpen) return;
  box.innerHTML = `<div class="bv-title">🌐 Atlas Passive Tree — แต้ม ${atlasUsed()}/${atlasPoints()} <span class="muted">(แต้ม = แผนที่ที่ผ่าน + บอสสะสมทุก 8 ตัว · คืนแต้มฟรีจากปลายสาย)</span></div>
    <div class="atlas-cols">${ATLAS_TREE.map((B) => `<div class="atlas-col" style="--cc:${B.color}"><div class="atlas-h">${B.icon} ${B.name}</div>
      ${B.nodes.map((n, i) => { const on = !!A[B.id + '_' + i], ok = on || (i === 0 || A[B.id + '_' + (i - 1)]);
        return `<button class="atlas-node${on ? ' on' : ''}${n.n ? ' notable' : ''}" data-an="${B.id}:${i}" ${ok ? '' : 'disabled'}>${n.n ? `<b>${n.n}</b><br>` : ''}${n.d}</button>`; }).join('')}</div>`).join('')}</div>`;
  box.querySelectorAll('[data-an]').forEach((el) => {
    el.onclick = () => { const [b, i] = el.dataset.an.split(':'); if (atlasToggle(b, +i)) { Sfx.play('levelup'); openMapDevice(); } };
  });
}
function toggleAtlasTree() { atlasOpen = !atlasOpen; openMapDevice(); }

// pay for the map tier / loadout, then start
function mapStartPaid() {
  const M = loadMeta(), cost = mapEntryCost() + loadoutCost();
  if (M.shards < cost) return;
  M.shards -= cost;
  const loadout = [...mapLoadout].sort((a, b) => b - a).map((i) => M.stash.splice(i, 1)[0]).filter(Boolean);
  mapLoadout = new Set();
  const cfg = { biome: mapCfg.biome, tier: mapCfg.tier, mods: mapCfg.mods.slice(), hc: mapHC, loadout, scarabs: spendMapScarabs(), heat: corruptionOpen() ? Object.assign({}, M.heatSel) : {} };
  M.lastMap = { biome: cfg.biome, tier: cfg.tier, mods: cfg.mods.slice() };
  saveMeta();
  hide('mapdev');
  startGame(mapCls, cfg);
}

// ---------------- Legacy Tree: jewel sockets ----------------
function jewelSocketInfoHtml(id) {
  const M = loadMeta(), j = M.jewels[id];
  if (!treeAllocated(id)) return '<div class="muted">จัดสรรโหนดนี้ก่อน แล้วจึงใส่ Jewel ได้</div>';
  let h = j ? itemCardHtml(j, 'ใส่อยู่') + '<button class="btn btn-small btn-dim" id="btn-unsock">ถอด Jewel</button>' : '<div class="muted">ช่องว่าง — เลือก Jewel จาก Stash</div>';
  const list = M.stash.map((it, i) => [it, i]).filter(([it]) => it.slot === 'jewel');
  h += list.length ? `<div class="stash-grid small">${list.map(([it, i]) => stashCellHtml(it, 'js', i, false)).join('')}</div>` : '<div class="muted">ไม่มี Jewel ใน Stash (ดรอปจากบอส/Rare/Strongbox · เก็บอัตโนมัติเมื่อจบรอบ)</div>';
  return h;
}
function bindJewelSocket(id) {
  const b = $('btn-unsock');
  if (b) b.onclick = () => { unsocketJewel(id); openAltar(); };
  $('tree-info').querySelectorAll('[data-js]').forEach((el) => {
    el.onmouseenter = () => { el.title = loadMeta().stash[+el.dataset.js].affixes.map(affixText).join(' · '); };
    el.onclick = () => { if (socketJewel(id, +el.dataset.js)) { Sfx.play('currency'); openAltar(); } };
  });
}

// ---------------- Daily challenge ----------------
function startDaily() {
  const d = dailySetup();
  hide('menu');
  seedRandom(d.key);
  startGame(d.cls, Object.assign({}, d.map, { daily: d.key }));
  announce('Daily Challenge', `${d.cls.name} · ${mapLabel(d.map)} · ${d.map.mods.length} mod — ทุกคนเจอเหมือนกันวันนี้`, '#ffd84a');
}
function dailyMenuHtml() {
  const d = dailySetup(), M = loadMeta(), D = M.daily && M.daily.key === d.key ? M.daily : null;
  return `<div class="daily-box"><div class="daily-h">DAILY · ${String(d.key).slice(6)}/${String(d.key).slice(4, 6)}</div>
    <div class="daily-run">${d.cls.name} · ${mapLabel(d.map)}${d.map.mods.length ? ` · ${d.map.mods.length} mods` : ''}</div>
    <div class="daily-best">${D ? `ดีที่สุด ${fmtTime(Math.min(D.best, RUN_LENGTH))}${D.best > RUN_LENGTH ? ' (ชนะ!)' : ''} · เล่น ${D.tries} ครั้ง` : 'ยังไม่ได้เล่นวันนี้ · กดปุ่ม Daily'}</div></div>`;
}

// ---------------- Weekly challenge: harder map, first win pays shards ----------------
function startWeekly() {
  const w = weeklySetup();
  hide('menu');
  seedRandom(w.key * 31 + 7);
  startGame(w.cls, Object.assign({}, w.map, { weekly: w.key }));
  announce('Weekly Challenge', `${w.cls.name} · ${mapLabel(w.map)} · ${w.map.mods.length} mods — เทียบอันดับกับทุกคนที่ Leaderboard`, '#ffd84a');
}
function weeklyMenuHtml() {
  const w = weeklySetup(), M = loadMeta(), W = M.weekly && M.weekly.key === w.key ? M.weekly : null;
  return `<div class="daily-box"><div class="daily-h">WEEKLY · สัปดาห์ที่ ${String(w.key).slice(4)}/${String(w.key).slice(0, 4)}</div>
    <div class="daily-run">${w.cls.name} · ${mapLabel(w.map)}${w.map.mods.length ? ` · ${w.map.mods.length} mods` : ''}</div>
    <div class="daily-best">${W ? `ดีที่สุด ${fmtTime(Math.min(W.best, RUN_LENGTH))}${W.best > RUN_LENGTH ? ' (ชนะ!)' : ''} · เล่น ${W.tries} ครั้ง${W.winClaimed ? ' · ✦ รางวัลแล้ว' : ''}` : `ยังไม่ได้เล่น · ชนะครั้งแรกได้ ✦${WEEKLY_WIN_SHARDS}`}</div></div>`;
}
