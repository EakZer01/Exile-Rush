'use strict';
// ============================================================
//  Between-run loot: map items, jewels, the Stash, loadouts,
//  the Atlas passive tree, Hardcore and the Daily challenge
// ============================================================

// ---------------- in-run drops ----------------
function dropMapItem(x, y, tier) { spawnPickup(x, y, 'map', { map: makeMapItem(tier) }); }
function dropJewel(x, y) { G.items.push({ x: x + rand(-14, 14), y: y + rand(-14, 14), item: makeJewel(), t: 0 }); }
// maps and jewels from monsters (called by killEnemy)
function rollLeagueDrops(e) {
  const AF = G.atlasFx, t = G.map.tier;
  if (e.rarity === 3) {
    if (e.final) { dropMapItem(e.x, e.y - 40, t + 1); dropMapItem(e.x + 30, e.y - 40, t); }
    else if (Math.random() < 0.5 * AF.mapDrop) dropMapItem(e.x, e.y - 40, t);
    if (Math.random() < 0.35) dropJewel(e.x - 30, e.y - 30);
  } else if (e.rarity === 2) {
    if (Math.random() < 0.05 * AF.mapDrop) dropMapItem(e.x, e.y, t + (Math.random() < 0.25 ? 1 : 0));
    if (Math.random() < 0.04) dropJewel(e.x, e.y);
  } else if (e.rarity === 1 && Math.random() < 0.004 * AF.mapDrop) dropMapItem(e.x, e.y, t);
}
function collectMap(m) {
  G.runMaps.push(m);
  lootLog(`แผนที่ T${m.tier}: ${m.name}`, RARITY_COLOR[m.rarity]);
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
  if (G.daily) { box.innerHTML = '<div class="muted">Daily Challenge: เก็บของเข้า Stash ไม่ได้</div>'; return; }
  if (!limit) { box.innerHTML = '<div class="bad">Hardcore: ตายแล้ว — เก็บของเข้า Stash ไม่ได้</div>'; return; }
  if (overPick.done) { box.innerHTML = `<div class="ok">เก็บเข้า Stash แล้ว ${overPick.sel.size} ชิ้น ✓</div>`; return; }
  if (!items.length) { box.innerHTML = '<div class="muted">ไม่มีไอเทมให้เก็บ (Heirloom กลับเข้า Stash เองแล้ว)</div>'; return; }
  const room = STASH_CAP - M.stash.length;
  box.innerHTML = `<div class="bv-title">📦 เลือกไอเทมเก็บเข้า Stash (${overPick.sel.size}/${Math.min(limit, room)})</div>
    <div class="stash-grid small">${items.map((it, i) => stashCellHtml(it, 'op', i, overPick.sel.has(i))).join('')}</div>
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
function mapEntryCost() { return mapCfg.itemUid ? 0 : mapBuyCost(mapCfg.tier); }
function renderMapExtras() {
  const M = loadMeta(), A = atlasData();
  // owned map items
  $('map-owned-n').textContent = `(${M.maps.length}/${MAP_ITEM_CAP})`;
  $('map-owned').innerHTML = M.maps.map((m) => `<div class="map-item r-${m.rarity}${mapCfg.itemUid === m.uid ? ' sel' : ''}" data-mi="${m.uid}" style="--cc:${BIOMES[m.biome].color}">
      <b>T${m.tier}</b> ${BIOMES[m.biome].name}<br><span class="muted">${m.rarity === 'normal' ? 'ไม่มี mod' : m.mods.length + ' mod'}</span></div>`).join('')
    || '<div class="muted">ยังไม่มีแผนที่ — ดรอปจากบอส / มอนสเตอร์ Rare / Strongbox / Ritual</div>';
  $('mapdev').querySelectorAll('[data-mi]').forEach((el) => {
    el.onclick = () => {
      const m = M.maps.find((x) => x.uid === +el.dataset.mi);
      if (!m) return;
      if (mapCfg.itemUid === m.uid) { mapCfg.itemUid = null; }
      else mapCfg = { biome: m.biome, tier: m.tier, mods: m.mods.slice(), itemUid: m.uid };
      openMapDevice();
    };
  });
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
  $('btn-map-start').textContent = mapCfg.itemUid ? `🗺 เปิดแผนที่ (ใช้แผนที่ T${mapCfg.tier})${loadoutCost() ? ` · ${loadoutCost()} ✦` : ''}` : cost ? `🗺 ซื้อและเปิดแผนที่ (${cost} ✦)` : '🗺 เปิดแผนที่';
  $('btn-map-start').disabled = M.shards < cost;
  $('map-atlas').textContent = `Atlas: ผ่านแล้ว ${atlasDoneCount()} แผนที่ · Tier สูงสุด ${A.maxTier} · แต้ม Legacy Tree จาก Atlas +${atlasBonusPoints()}/${ATLAS_POINT_CAP} · แต้ม Atlas Tree ${atlasUsed()}/${atlasPoints()} · ✦ ${M.shards}`;
  renderMapScarabs();
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
// keep a selected map item's mods in sync with Alchemy / Chaos / clear
function syncMapItem() {
  if (!mapCfg.itemUid) return;
  const m = loadMeta().maps.find((x) => x.uid === mapCfg.itemUid);
  if (m) { m.mods = mapCfg.mods.slice(); if (m.mods.length && m.rarity === 'normal') m.rarity = 'rare'; saveMeta(); }
}

// pay for the map / loadout, then start
function mapStartPaid() {
  const M = loadMeta(), cost = mapEntryCost() + loadoutCost();
  if (M.shards < cost) return;
  M.shards -= cost;
  if (mapCfg.itemUid) M.maps = M.maps.filter((m) => m.uid !== mapCfg.itemUid);
  const loadout = [...mapLoadout].sort((a, b) => b - a).map((i) => M.stash.splice(i, 1)[0]).filter(Boolean);
  mapLoadout = new Set();
  const cfg = { biome: mapCfg.biome, tier: mapCfg.tier, mods: mapCfg.mods.slice(), hc: mapHC, loadout, scarabs: spendMapScarabs() };
  M.lastMap = { biome: cfg.biome, tier: cfg.tier, mods: cfg.mods.slice() };
  mapCfg.itemUid = null;
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
  return `📅 Daily ${String(d.key).slice(6)}/${String(d.key).slice(4, 6)}: ${d.cls.name} · ${mapLabel(d.map)}` + (D ? ` · ดีที่สุด ${fmtTime(Math.min(D.best, RUN_LENGTH))}${D.best > RUN_LENGTH ? ' (ชนะ!)' : ''} · เล่น ${D.tries} ครั้ง` : '');
}
