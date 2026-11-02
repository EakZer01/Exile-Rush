'use strict';
// ============================================================
//  Codex: in-menu reference for every gem, passive, ascendancy,
//  unique and map mod, plus hand-picked combos.
// ============================================================
const COMBOS = [
  { name: 'Shatter Chain', parts: ['herald_of_ice', 'ice_nova', 'hypothermia', 'elemental_prolif'],
    desc: 'Ice Nova แช่แข็งฝูง → Herald of Ice ทำให้ศพแตกระเบิดต่อกันเป็นทอดๆ · Elemental Proliferation กระจาย Chill ให้ทั่ว' },
  { name: 'Flicker Frenzy', parts: ['flicker_strike', 'multistrike', 'close_combat', 'fortify'],
    desc: 'ตัวจริงวาร์ปชุดละ 3 ครั้ง · Multistrike ฟันซ้ำที่จุดวาร์ป · Close Combat แรงขึ้นตอนประชิด · Fortify ลดดาเมจที่รับ · เดินเพื่อหยุด หรือ T เปิด/พัก' },
  { name: 'Prismatic Smite', parts: ['smite', 'added_cold', 'trinity', 'elemental_prolif'],
    desc: 'Smite มีทั้งกายภาพ/สายฟ้า + Added Cold = 2 ธาตุ → Trinity 35% more · Prolif แพร่ Shock/Chill' },
  { name: 'Shard Storm', parts: ['frost_blades', 'gmp', 'pierce', 'herald_of_ice'],
    desc: 'ใบมีดน้ำแข็งพุ่งทะลุฝูงจนติด Chill → ฆ่าแล้ว Herald of Ice ระเบิดต่อเป็นลูกโซ่' },
  { name: 'Plague Bearer', parts: ['contagion', 'essence_drain', 'deadly_ailments', 'void_manipulation'],
    desc: 'Contagion แปะเชื้อ ศัตรูตายแล้วแพร่ต่อ · Essence Drain ทำพิษแรงและดูดเลือด · Deadly Ailments ขยายดาเมจพิษ' },
  { name: 'Rune Lord', parts: ['storm_brand', 'armageddon_brand', 'chain', 'inc_duration'],
    desc: 'ตราสองแบบทำงานพร้อมกัน · เลือก Keystone Runebinder เพื่อติดตราเพิ่มและทำงานเร็วขึ้น' },
  { name: 'Elemental Equilibrium', parts: ['fireball', 'arc', 'frostbolt', 'curse_ele'],
    desc: 'ตีสลับหลายธาตุ — Keystone Elemental Equilibrium ทำให้ธาตุถัดไปแรงขึ้น 30% · Elemental Weakness ลดต้านธาตุ' },
  { name: 'Earthbreaker', parts: ['earthquake', 'multistrike', 'brutality', 'melee_physical'],
    desc: 'ทุบพื้นซ้ำ 3 ครั้ง แต่ละครั้งมี Aftershock แรงกว่าเดิม · สายกายภาพล้วน (อย่าใช้กับ Avatar of Fire)' },
  { name: 'Bone Army', parts: ['summon_skeletons', 'raging_spirit', 'minion_damage', 'minion_speed'],
    desc: 'กองทัพมินเนียนสองแบบ · Ascendancy Bonecaller / Keystone Minion Lord บน Legacy Tree ช่วยเต็มที่' },
  { name: 'Storm Archer', parts: ['lightning_arrow', 'tornado_shot', 'gmp', 'light_pen'],
    desc: 'ลูกธนูสายฟ้าฟาดรอบเป้า + ลูกธนูย่อยกระจาย · Penetration ทะลุมอนสเตอร์ต้านธาตุในแผนที่ Tier สูง' },
  { name: 'Blood Dancer', parts: ['lacerate', 'chance_to_bleed', 'crimson_bleed', 'multistrike'],
    desc: 'ฟันไขว้ทำให้ทั้งฝูง Bleed · Crimson Bleed ทำให้ศพแตกเป็นเลือดต่อเนื่อง · เลือก Keystone Crimson Dance ให้ Bleed ซ้อนได้ 8 ชั้น' },
  { name: 'Frost Volley', parts: ['ice_shot', 'gmp', 'hypothermia', 'herald_of_ice'],
    desc: 'ลูกธนูน้ำแข็งแตกเป็นกรวยทำให้ทั้งแนว Chill · Herald of Ice ระเบิดศัตรูที่ติด Chill ตายต่อเป็นลูกโซ่' },
  { name: 'Wildfire', parts: ['herald_of_ash', 'fireball', 'burning_damage', 'elemental_prolif'],
    desc: 'Fireball ทำให้ฝูงติด Ignite → ตัวที่ตายปะทุไฟให้ตัวข้างๆ ติด Ignite ต่อเป็นทอดๆ · Burning Damage เพิ่มดาเมจเผา' },
  { name: 'Storm Caller', parts: ['herald_of_thunder', 'arc', 'added_lightning', 'light_pen'],
    desc: 'Arc กระโดดทำให้ทั้งฝูงติด Shock → Herald of Thunder ผ่าลงตัวที่ Shock อยู่ทุกช่วงเวลา แม้ไม่ได้ร่ายเอง' },
  { name: 'Burning Beam', parts: ['scorching_ray', 'infused_channelling', 'burning_damage', 'fire_pen'],
    desc: 'ลำแสงเผาต่อเนื่อง ยิ่งยืนยิงยิ่งร้อน · Infused Channelling ลดดาเมจที่ได้รับขณะยิง' },
];

const CODEX_TABS = [['skills', 'Skill Gem'], ['supports', 'Support Gem'], ['passives', 'Passive / Keystone'], ['ascend', 'Ascendancy'], ['uniques', 'Unique'], ['maps', 'Map Mods'], ['scarabs', 'Scarab'], ['monsters', 'มอนสเตอร์'], ['combos', 'คอมโบแนะนำ']];
let codexTab = 'skills', codexFilter = '', codexSearch = '';

function openCodex() {
  hide('menu');
  $('codex-tabs').innerHTML = CODEX_TABS.map(([id, label]) => `<button class="btn btn-small${codexTab === id ? ' sel' : ''}" data-ctab="${id}">${label}</button>`).join('');
  $('codex').querySelectorAll('[data-ctab]').forEach((b) => { b.onclick = () => { codexTab = b.dataset.ctab; codexFilter = ''; openCodex(); }; });
  const search = $('codex-search');
  search.value = codexSearch;
  search.oninput = () => { codexSearch = search.value; renderCodexBody(); };
  renderCodexBody();
  show('codex');
}
function closeCodex() { hide('codex'); buildMenu(); show('menu'); }

const codexMatch = (...texts) => !codexSearch || texts.join(' ').toLowerCase().includes(codexSearch.toLowerCase());

// skills a support can be linked to (fresh level-1 instance, ignoring socket count)
function supportTargets(supId) {
  return Object.keys(SKILLS).filter((id) => !supportBlockReason(supId, newSkillInstance(id), true));
}

function renderCodexBody() {
  const body = $('codex-body');
  let filters = '', h = '';
  if (codexTab === 'skills' || codexTab === 'supports') {
    const tags = new Set();
    if (codexTab === 'skills') for (const id in SKILLS) for (const t of SKILLS[id].tags) tags.add(t);
    else for (const id in SUPPORTS) for (const t of SUPPORTS[id].req) tags.add(t);
    tags.delete('Damage');
    filters = `<div class="codex-filters"><span class="tag${!codexFilter ? ' on' : ''}" data-cf="">ทั้งหมด</span>${[...tags].sort().map((t) => `<span class="tag tag-${t.toLowerCase()}${codexFilter === t ? ' on' : ''}" data-cf="${t}">${t}</span>`).join('')}</div>`;
  }
  if (codexTab === 'skills') {
    for (const id in SKILLS) {
      const d = SKILLS[id], ev = EVOLUTIONS[id];
      if (codexFilter && !d.tags.includes(codexFilter)) continue;
      if (!codexMatch(d.name, d.th, d.desc, d.tags.join(' '))) continue;
      const lock = isLocked('gem', id) ? UNLOCKS.find((u) => u.ref === id) : null;
      h += `<div class="codex-card">${skillGemHtml(id)}<div class="codex-info">
        <div class="card-name">${d.name} <small class="muted">${d.th}</small>${lock ? ` <span class="bad">🔒 ${lock.req}</span>` : ''}</div>
        ${tagsHtml(d.tags)}<div class="card-desc">${d.desc}</div><div class="card-note">${d.levelNote}</div>
        <div class="card-note muted">🗡 ใช้กับ: ${weaponReqText(id)}${gemLv(id) ? ` · 💎 Gem Mastery Lv ${gemLv(id)}` : ''}</div>
        ${ev ? `<div class="card-note evo-hint">✦ ${ev.name} (Lv ${EVOLVE_LEVEL}+ ใส่ ${ev.req.map((r) => SUPPORTS[r].name).join(' / ')}): ${ev.desc}</div>` : ''}</div></div>`;
    }
  } else if (codexTab === 'monsters') {
    for (const id in MONSTERS) {
      const d = MONSTERS[id], el = d.elem || 'physical';
      if (!codexMatch(d.name, MONSTER_TH[id] || '', ELEM_TH[el])) continue;
      h += `<div class="codex-card"><img class="codex-mon" src="${spriteURL(id, 3)}" alt=""><div class="codex-info">
        <div class="card-name">${d.name} <small style="color:${ELEM_COLOR[el]}">${ELEM_TH[el]}</small></div>
        <div class="card-desc">${MONSTER_TH[id] || ''}</div><div class="card-note muted">ชีวิต ${d.hp} · ดาเมจ ${d.dmg} · ความเร็ว ${d.speed}</div></div></div>`;
    }
    h += '<div class="codex-card"><div class="codex-info"><div class="card-name">Rare / Magic mods</div><div class="card-desc">' +
      Object.values(MONSTER_MODS).map((m) => `<b>${m.name}</b> ${m.th}`).join(' · ') + '</div></div></div>';
  } else if (codexTab === 'supports') {
    for (const id in SUPPORTS) {
      const d = SUPPORTS[id];
      if (codexFilter && !d.req.includes(codexFilter)) continue;
      if (!codexMatch(d.name, d.th, d.desc)) continue;
      const fits = supportTargets(id);
      h += `<div class="codex-card">${supportGemHtml(id)}<div class="codex-info">
        <div class="card-name">${d.name} <small class="muted">${d.th}</small></div>
        ${d.req.length ? tagsHtml(d.req) : '<div class="tags"><span class="tag">ใช้ได้ทุกสกิล</span></div>'}
        <div class="card-desc">${d.desc}</div>
        <div class="card-note">ใช้กับ: ${fits.length === Object.keys(SKILLS).length ? 'ทุกสกิล' : fits.map((s) => SKILLS[s].name).join(', ') || '-'}</div>
        ${AWAKEN_BONUS[id] ? `<div class="card-note">Awakened: ดาเมจ 20% more · ${AWAKEN_BONUS[id].desc}</div>` : ''}</div></div>`;
    }
  } else if (codexTab === 'passives') {
    h += '<h3 class="altar-h">Keystone (สูงสุด ' + MAX_KEYSTONES + ' อันต่อรอบ)</h3>';
    for (const id in KEYSTONES) { const d = KEYSTONES[id]; if (codexMatch(d.name, d.th, d.desc)) h += `<div class="codex-row"><span class="node node-key">${d.icon}</span><div><b>${d.name}</b> <small class="muted">${d.th}</small><br>${d.desc}</div></div>`; }
    h += '<h3 class="altar-h">สาย Passive + Mastery <span class="muted">(ลง Passive ในสายเดียวกันครบตามจำนวน แล้ว Milestone ถัดไปจะให้เลือก Mastery 1 ใน 2)</span></h3>';
    for (const pid in RUN_PATHS) {
      const p = RUN_PATHS[pid];
      if (!codexMatch(p.name, p.th, p.mastery.map((o) => o.name + o.desc).join(' '), p.passives.map((id) => PASSIVES[id].name).join(' '))) continue;
      h += `<div class="codex-row"><span class="node" style="color:${p.color}">${p.icon}</span><div><b style="color:${p.color}">${p.name}</b> <small class="muted">${p.th} · ต้องการ ${p.need} ระดับ · ${p.passives.map((id) => PASSIVES[id].name).join(', ')}</small>
        ${p.mastery.map((o) => `<br>◆ <b>${o.name}</b> — ${o.desc}`).join('')}</div></div>`;
    }
    h += '<h3 class="altar-h">Passive</h3>';
    for (const id in PASSIVES) { const d = PASSIVES[id]; if (codexMatch(d.name, d.th, d.desc)) h += `<div class="codex-row"><span class="node">${d.icon}</span><div><b>${d.name}</b> <small class="muted">${d.th} · สูงสุด ${d.max}</small><br>${d.desc}</div></div>`; }
  } else if (codexTab === 'ascend') {
    for (const id in ASCENDANCY) {
      const a = ASCENDANCY[id], cls = CLASSES.find((c) => c.id === a.cls);
      if (!codexMatch(a.name, a.th, a.desc, a.nodes.map((n) => n.name + n.desc).join(' '))) continue;
      h += `<div class="codex-asc" style="--cc:${a.color}"><div class="card-name" style="color:${a.color}">${a.icon} ${a.name} <small class="muted">${a.th} · ${cls.name}</small></div><div class="muted">${a.desc}</div>
        ${a.nodes.map((n, i) => `<div class="asc-node${i === 0 ? ' asc-first' : ''}"><b>${n.icon} ${n.name}</b>${i === 0 ? ' <span class="badge">ได้ทันที</span>' : ''} — ${n.desc}</div>`).join('')}</div>`;
    }
  } else if (codexTab === 'uniques') {
    const found = loadMeta().found || {};
    filters = `<div class="codex-filters"><span class="tag${!codexFilter ? ' on' : ''}" data-cf="">ทุกแหล่ง</span>${Object.keys(UNIQUE_SOURCES).map((s) => `<span class="tag${codexFilter === s ? ' on' : ''}" data-cf="${s}">${UNIQUE_SOURCES[s].th}</span>`).join('')}</div>`;
    h += `<div class="muted" style="margin-bottom:8px">ค้นพบแล้ว ${Object.keys(UNIQUES).filter((u) => found[u]).length}/${Object.keys(UNIQUES).length} — Unique ที่ยังไม่เจอจะแสดงเป็น ??? แต่บอกแหล่งดรอปให้ไปฟาร์ม${codexFilter ? `<br><b>${UNIQUE_SOURCES[codexFilter].th}</b>: ${UNIQUE_SOURCES[codexFilter].where}` : ''}</div><div class="codex-uniques">`;
    for (const id in UNIQUES) {
      const u = UNIQUES[id];
      if (codexFilter && uniqueSrc(id) !== codexFilter) continue;
      if (!found[id]) { h += `<div class="poe-tip"><div class="pt-head" style="color:#6a5a40">???</div><div class="pt-body"><div class="pt-prop">Unique ${SLOT_NAME[u.slot]}</div><div class="pt-src">แหล่งดรอป: ${UNIQUE_SOURCES[uniqueSrc(id)].th}</div></div></div>`; continue; }
      if (codexMatch(u.name, u.th, u.lines.join(' '))) h += itemCardHtml({ rarity: 'unique', slot: u.slot, unique: id, name: u.name, affixes: [] });
    }
    h += '</div>';
  } else if (codexTab === 'maps') {
    h += '<h3 class="altar-h">พื้นที่</h3>' + Object.values(BIOMES).map((b) => `<div class="codex-row"><span class="node" style="color:${b.color}">🗺</span><div><b style="color:${b.color}">${b.name}</b> <small class="muted">${b.th} · เริ่ม Tier ${b.minTier}</small><br>${b.desc}${b.boss ? `<br><span class="muted">บอสประจำพื้นที่: ${b.boss}</span>` : ''}</div></div>`).join('');
    h += '<h3 class="altar-h">Map Mods</h3>' + Object.values(MAP_MODS).filter((m) => codexMatch(m.name, m.th)).map((m) => `<div class="codex-row"><span class="node">⚠</span><div><b>${m.name}</b> — ${m.th} <span class="muted">(Item Quantity +${m.qty}%)</span></div></div>`).join('');
  } else if (codexTab === 'scarabs') {
    h += `<div class="muted" style="margin-bottom:8px">ใส่ Scarab ที่ Map Device ก่อนเปิดแผนที่ (ช่องเริ่มต้น 2 ช่อง) · ใช้แล้วหมดไป · ดรอปจากบอส, Rare, Breach, Strongbox, Delirium, Ritual และห้องรางวัล หรือซื้อสุ่ม ${SCARAB_PRICE} ✦</div>`;
    for (const id in SCARABS) { const s = SCARABS[id]; if (codexMatch(s.name, s.th)) h += `<div class="codex-row"><span class="node" style="color:${s.color}">✲</span><div><b style="color:${s.color}">${s.name}</b>${s.rare ? ' <span class="badge">หายาก</span>' : ''}<br>${s.th}</div></div>`; }
  } else if (codexTab === 'combos') {
    for (const c of COMBOS) {
      if (!codexMatch(c.name, c.desc)) continue;
      h += `<div class="codex-combo"><div class="card-name">${c.name}</div><div class="combo-parts">${c.parts.map((p) => SKILLS[p]
        ? `<span class="combo-part">${skillGemHtml(p, true)} ${SKILLS[p].name}</span>` : `<span class="combo-part">${supportGemHtml(p, true)} ${SUPPORTS[p].name}</span>`).join('<span class="muted">+</span>')}</div>
        <div class="card-desc">${c.desc}</div></div>`;
    }
  }
  body.innerHTML = filters + (h || '<div class="muted">ไม่พบข้อมูลที่ค้นหา</div>');
  body.querySelectorAll('[data-cf]').forEach((t) => { t.onclick = () => { codexFilter = t.dataset.cf; renderCodexBody(); }; });
}

// ---------------- Settings panel ----------------
let settingsFrom = 'menu';
function openSettings(from) {
  settingsFrom = from || 'menu';
  hide('menu'); hide('pause');
  const S = G.settings;
  const check = (k, label) => `<label class="set-row"><input type="checkbox" data-sk="${k}" ${S[k] ? 'checked' : ''}> ${label}</label>`;
  const slider = (k, label) => `<label class="set-row">${label} <input type="range" min="0" max="100" value="${Math.round(S[k] * 100)}" data-sv="${k}"> <span id="sv-${k}">${Math.round(S[k] * 100)}%</span></label>`;
  $('settings-body').innerHTML = slider('sfx', '🔊 เสียงเอฟเฟกต์') + slider('music', '🎵 เพลง') +
    check('lighting', 'ระบบแสงเงา (L)') + check('fx', 'อนุภาคและเอฟเฟกต์ (F)') + check('dmgNumbers', 'ตัวเลขดาเมจ (N)') + check('shake', 'จอสั่น') + check('minimap', 'มินิแมพ (Z)') +
    `<label class="set-row">คุณภาพกราฟิก <select data-sq="1">${[['auto', 'อัตโนมัติ (ลดเองเมื่อเครื่องช้า)'], ['high', 'สูง'], ['low', 'ต่ำ (ประหยัด)']].map(([v, t]) => `<option value="${v}"${S.quality === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="set-row">เลเวลอัป <select data-sl="1">${[['auto', 'เปิดการ์ดทันที'], ['boss', 'เปิดทันที ยกเว้นตอนสู้บอส'], ['manual', 'เก็บไว้ — กด U เมื่อพร้อม']].map(([v, t]) => `<option value="${v}"${S.levelMode === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="set-row">Loot Filter <select data-sf="1">${LOOT_FILTERS.map((f, i) => `<option value="${i}"${S.lootFilter === i ? ' selected' : ''}>${f.name}</option>`).join('')}</select></label>
    <div class="muted set-row">${LOOT_FILTERS[S.lootFilter].desc} · ของที่ถูกซ่อนจะย่อยเป็น Shard อัตโนมัติ</div>` +
    check('hlRes', 'ไฮไลต์ไอเทมที่มีค่าต้านทาน (กรอบเขียว)') +
    `<div class="set-row"><button class="btn btn-small" id="btn-tips-reset">แสดงคำแนะนำ (Tips) อีกครั้ง</button></div>`;
  const root = $('settings');
  root.querySelectorAll('[data-sk]').forEach((el) => { el.onchange = () => { G.settings[el.dataset.sk] = el.checked; applySettings(); saveSettings(); }; });
  root.querySelectorAll('[data-sv]').forEach((el) => { el.oninput = () => { G.settings[el.dataset.sv] = el.value / 100; $('sv-' + el.dataset.sv).textContent = el.value + '%'; applySettings(); saveSettings(); }; });
  root.querySelector('[data-sq]').onchange = (ev) => { G.settings.quality = ev.target.value; saveSettings(); };
  root.querySelector('[data-sl]').onchange = (ev) => { G.settings.levelMode = ev.target.value; saveSettings(); };
  root.querySelector('[data-sf]').onchange = (ev) => { G.settings.lootFilter = +ev.target.value; saveSettings(); openSettings(settingsFrom); };
  $('btn-tips-reset').onclick = () => { resetTips(); $('btn-tips-reset').textContent = 'รีเซ็ตแล้ว ✓'; };
  show('settings');
}
function closeSettings() {
  hide('settings');
  if (settingsFrom === 'pause' && G.player) { G.state = 'play'; openPause(); } else { buildMenu(); show('menu'); }
}
