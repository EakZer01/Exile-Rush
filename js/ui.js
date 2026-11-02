'use strict';
// ============================================================
//  DOM UI: class select, level-up cards, socket picker,
//  build/pause panel, game over
// ============================================================
const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove('hidden');
const hide = (id) => $(id).classList.add('hidden');

function skillGemHtml(id, small, vaal) {
  return `<img class="gem-img${small ? ' gem-sm' : ''}${vaal ? ' gem-vaal' : ''}" src="${skillIconURL(id)}" alt="${SKILLS[id].name}">`;
}
function evolveHintHtml(id) {
  const ev = EVOLUTIONS[id];
  if (!ev) return '';
  return `<div class="card-note evo-hint">✦ วิวัฒน์เป็น <b>${ev.name}</b>: Lv ${evolveLevel()}+ และลิงก์ ${ev.req.map((r) => SUPPORTS[r].name).join(' / ')}</div>`;
}
function supportGemHtml(gem, small) {
  return `<img class="gem-img${small ? ' gem-sm' : ''}" src="${supportIconURL(gem)}" alt="Support">`;
}
function tagsHtml(tags) {
  return '<div class="tags">' + [...tags].filter((t) => t !== 'Damage').map((t) => `<span class="tag tag-${t.toLowerCase()}">${t}</span>`).join('') + '</div>';
}
function socketsHtml(inst) {
  let h = '<span class="sockets">';
  for (let i = 0; i < inst.sockets; i++) {
    const sup = inst.supports[i];
    h += sup ? `<span class="sock sock-${SUPPORTS[sup].gem}${inst.awakened.includes(sup) ? ' sock-awk' : ''}" title="${supportDisplayName(inst, sup)}"></span>` : '<span class="sock sock-empty"></span>';
  }
  return h + '</span>';
}

// ---------------- Class select ----------------
function buildMenu() {
  const list = $('class-list');
  list.innerHTML = '';
  const M = loadMeta();
  for (const c of CLASSES) {
    const sk = c.start ? SKILLS[c.start] : null;
    const lock = isLocked('class', c.id) ? UNLOCKS.find((u) => u.kind === 'class' && u.ref === c.id) : null;
    const el = document.createElement('div');
    el.className = 'class-card' + (lock ? ' locked' : '');
    el.style.setProperty('--cc', c.color);
    el.innerHTML = `
      <div class="class-portrait"><img class="class-sprite" src="${spriteURL('cls_' + c.id, 4)}" alt="${c.name}">${sk ? `<img class="class-skill" src="${skillIconURL(sk.id)}" alt="${sk.name}" title="${sk.name}">` : ''}</div>
      <div class="class-name">${c.name}</div>
      <div class="class-th">${c.th}</div>
      <div class="class-desc">${c.desc}</div>
      <div class="class-bonus">${c.bonus}</div>
      <div class="class-life">❤ ${c.life}</div>
      ${lock ? `<div class="class-lock">🔒 ${lock.req}<br><span>หรือปลดล็อกด้วย ${lock.cost} ✦ ที่แท่นบูชา</span></div>` : ''}`;
    el.onclick = () => { Sfx.init(); if (lock) openAltar(); else openMapDevice(c); };
    list.appendChild(el);
  }
  $('meta-shards').innerHTML = `✦ Ancient Shards: <b>${M.shards}</b>`;
  const best = loadBest();
  $('best-run').innerHTML = best ? `สถิติดีที่สุด: รอด <b>${fmtTime(best.time)}</b> · Lv ${best.level} · ฆ่า ${best.kills} (${best.cls})${best.win ? ' · <span class="win">ชนะ!</span>' : ''}` : '';
}
function loadBest() { try { return JSON.parse(localStorage.getItem('exile_best') || 'null'); } catch (e) { return null; } }
function saveBest(rec) {
  try {
    const b = loadBest();
    if (!b || rec.time > b.time || (rec.win && !b.win)) localStorage.setItem('exile_best', JSON.stringify(rec));
  } catch (e) { /* storage may be blocked */ }
}

// ---------------- Level-up choices ----------------
function generateChoices(n) {
  const P = G.player, owned = new Set(P.skills.map((s) => s.id));
  const cats = { skill: [], level: [], support: [], passive: [], keystone: [], fusing: [] };
  if (P.skills.length < MAX_SKILLS + P.mods.skillSlots) for (const id in SKILLS) if (!owned.has(id) && !G.banned.has(id) && !isLocked('gem', id)) cats.skill.push({ type: 'skill', id });
  for (const inst of P.skills) if (inst.level < MAX_GEM_LEVEL) cats.level.push({ type: 'level', inst });
  for (const id in SUPPORTS) {
    const fits = P.skills.filter((inst) => !supportBlockReason(id, inst, true));
    const free = fits.some((inst) => inst.supports.length < inst.sockets);
    if (fits.length && free) cats.support.push({ type: 'support', id });
  }
  for (const id in PASSIVES) if ((P.passives[id] || 0) < PASSIVES[id].max) cats.passive.push({ type: 'passive', id });
  if (P.level >= 8 && Object.keys(P.keystones).length < MAX_KEYSTONES) for (const id in KEYSTONES) if (!P.keystones[id]) cats.keystone.push({ type: 'keystone', id });
  if (P.skills.some((s) => s.sockets < MAX_SOCKETS)) cats.fusing.push({ type: 'fusing' });
  cats.awaken = [];
  if (P.level >= 12) {
    const all = [];
    for (const inst of P.skills) for (const sid of inst.supports) if (!inst.awakened.includes(sid)) all.push({ type: 'awaken', inst, id: sid });
    cats.awaken = weightedSample(all, Math.min(3, all.length), () => 1);
  }

  const cw = {
    skill: P.skills.length <= 2 ? 3.2 : 1.6, level: 3.2, support: 3.0,
    passive: 2.0, keystone: 0.45, fusing: 0.45, awaken: 0.5,
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    const avail = Object.keys(cats).filter((k) => cats[k].length);
    if (!avail.length) break;
    const cat = weightedSample(avail, 1, (k) => cw[k])[0];
    const idx = Math.floor(Math.random() * cats[cat].length);
    out.push(cats[cat][idx]); cats[cat].splice(idx, 1);
  }
  // guarantee a support if a skill has a free socket and none rolled
  if (!out.some((c) => c.type === 'support') && cats.support.length && P.skills.some((s) => s.supports.length < s.sockets) && Math.random() < 0.5) {
    out[out.length - 1] = pick(cats.support);
  }
  // an evolution is always offered once its recipe is met
  const evo = P.skills.find(evolveRecipeMet);
  if (evo) { if (out.length >= n) out.pop(); out.unshift({ type: 'evolve', inst: evo }); }
  if (!out.length) out.push({ type: 'heal' });
  return out;
}

// Paragon draws from every other subclass; everyone else from their own
function ascNodeChoices() {
  const P = G.player, asc = ASCENDANCY[P.asc];
  let pool;
  if (asc.pool === 'any') {
    pool = [];
    for (const id in ASCENDANCY) if (id !== P.asc) for (const n of ASCENDANCY[id].nodes) if (!n.grant && !P.ascNodes.includes(n.id)) pool.push(n);
    pool = weightedSample(pool, 3, () => 1);
  } else pool = asc.nodes.filter((n) => !P.ascNodes.includes(n.id));
  return pool.map((n) => ({ type: 'ascnode', id: n.id }));
}

function cardHtml(c, idx) {
  const P = G.player;
  const key = `<span class="card-key">${idx + 1}</span>`;
  if (c.type === 'skill') {
    const d = SKILLS[c.id];
    return `<div class="card card-skill">${key}
      <div class="card-head">${skillGemHtml(d.id)}<div><div class="card-name">${d.name}</div><div class="card-th">${d.th} · Skill Gem</div></div><div class="badge badge-new">ใหม่!</div></div>
      ${tagsHtml(d.tags)}<div class="card-desc">${d.desc}</div><div class="card-note">${d.levelNote}</div>${evolveHintHtml(d.id)}</div>`;
  }
  if (c.type === 'evolve') {
    const d = SKILLS[c.inst.id], ev = EVOLUTIONS[c.inst.id];
    return `<div class="card card-evolve">${key}
      <div class="card-head">${skillGemHtml(d.id, false, true)}<div><div class="card-name">${ev.name}</div><div class="card-th">วิวัฒนาการเจม ${d.name}</div></div><div class="badge badge-vaal">EVOLVE</div></div>
      <div class="card-desc">${ev.desc}</div>
      <div class="card-note">+ ท่าไม้ตาย Vaal: ฆ่าศัตรูเก็บวิญญาณ ${vaalSouls()} ดวง แล้วกด <b>V</b> (มือถือ: แตะไอคอนสกิล) ระเบิดรอบตัวแรง ×4 แล้วร่ายเร็วขึ้น 2.5 เท่า ${VAAL_SURGE} วิ</div></div>`;
  }
  if (c.type === 'awaken') {
    const d = SUPPORTS[c.id], b = AWAKEN_BONUS[c.id];
    return `<div class="card card-awaken">${key}
      <div class="card-head">${supportGemHtml(d.gem)}<div><div class="card-name">Awakened ${d.name}</div><div class="card-th">ปลุกพลัง Support บน ${skillDisplayName(c.inst)}</div></div><div class="badge badge-awk">AWAKEN</div></div>
      <div class="card-desc">ดาเมจ 20% more${b ? ' · ' + b.desc : ''}<br><span class="muted">${d.desc}</span></div></div>`;
  }
  if (c.type === 'ascclass') {
    const a = ASCENDANCY[c.id];
    return `<div class="card card-asc" style="--cc:${a.color}">${key}
      <div class="card-head"><span class="node node-asc">${a.icon}</span><div><div class="card-name">${a.name}</div><div class="card-th">${a.th} · Ascendancy</div></div></div>
      <div class="card-desc">${a.desc}</div>
      <div class="asc-nodes">${a.nodes.map((n, i) => `<div class="asc-node${i === 0 ? ' asc-first' : ''}"><b>${n.icon} ${n.name}</b>${i === 0 ? ' <span class="badge">ได้ทันที</span>' : ''}<br><span>${n.desc}</span></div>`).join('')}
      <div class="asc-node"><span class="muted">${a.pool === 'any' ? 'บอสตัวต่อไปแต่ละตัว: สุ่มโหนดจาก Ascendancy คลาสอื่น 3 อันให้เลือก' : 'บอสตัวต่อไปแต่ละตัว: เลือกปลดล็อกอีก 1 โหนด'}</span></div></div></div>`;
  }
  if (c.type === 'ascnode') {
    const n = ASC_NODES[c.id], a = ASCENDANCY[n.asc];
    return `<div class="card card-asc" style="--cc:${a.color}">${key}
      <div class="card-head"><span class="node node-asc">${n.icon}</span><div><div class="card-name">${n.name}</div><div class="card-th">${a.name} · Ascendancy</div></div></div>
      <div class="card-desc">${n.desc}</div></div>`;
  }
  if (c.type === 'level') {
    const d = SKILLS[c.inst.id];
    const now = c.inst.st, nxt = buildSkillStats(Object.assign({}, c.inst, { level: c.inst.level + 1 }), P);
    const lines = [];
    const dmgNow = now.behavior === 'aura' ? now.auraDps : now.hitTotal, dmgN = nxt.behavior === 'aura' ? nxt.auraDps : nxt.hitTotal;
    lines.push(`ดาเมจ ${fmtNum(dmgNow)} → <b>${fmtNum(dmgN)}</b>`);
    if (nxt.proj !== now.proj) lines.push(`กระสุน ${now.proj} → <b>${nxt.proj}</b>`);
    if (nxt.chain !== now.chain) lines.push(`กระโดด ${now.chain} → <b>${nxt.chain}</b>`);
    if (nxt.pierce !== now.pierce) lines.push(`ทะลุ ${now.pierce} → <b>${nxt.pierce}</b>`);
    if (nxt.maxCount !== now.maxCount) lines.push(`จำนวนสูงสุด ${now.maxCount} → <b>${nxt.maxCount}</b>`);
    if (nxt.count !== now.count) lines.push(`อุกกาบาต ${now.count} → <b>${nxt.count}</b>`);
    if (Math.round(nxt.radius) !== Math.round(now.radius)) lines.push(`รัศมี ${Math.round(now.radius)} → <b>${Math.round(nxt.radius)}</b>`);
    if (nxt.cdFinal < now.cdFinal - 0.005) lines.push(`คูลดาวน์ ${now.cdFinal.toFixed(2)} → <b>${nxt.cdFinal.toFixed(2)}s</b>`);
    return `<div class="card card-level">${key}
      <div class="card-head">${skillGemHtml(d.id, false, c.inst.evo)}<div><div class="card-name">${skillDisplayName(c.inst)}</div><div class="card-th">เลเวลอัพเจม</div></div><div class="badge">Lv ${c.inst.level} → ${c.inst.level + 1}</div></div>
      <div class="card-desc">${lines.join('<br>')}</div><div class="card-note">${d.levelNote}</div>${c.inst.evo ? '' : evolveHintHtml(d.id)}</div>`;
  }
  if (c.type === 'support') {
    const d = SUPPORTS[c.id];
    const fits = P.skills.filter((inst) => !supportBlockReason(c.id, inst));
    return `<div class="card card-support">${key}
      <div class="card-head">${supportGemHtml(d.gem)}<div><div class="card-name">${d.name}</div><div class="card-th">${d.th} · Support Gem</div></div></div>
      ${d.req.length ? tagsHtml(d.req) : '<div class="tags"><span class="tag">ใช้ได้ทุกสกิล</span></div>'}
      <div class="card-desc">${d.desc}</div>
      <div class="card-note">ใส่ได้กับ: ${fits.map((i) => skillDisplayName(i)).join(', ')}</div>${evoUseHtml(c.id)}</div>`;
  }
  if (c.type === 'passive') {
    const d = PASSIVES[c.id], r = P.passives[c.id] || 0;
    return `<div class="card card-passive">${key}
      <div class="card-head"><span class="node">${d.icon}</span><div><div class="card-name">${d.name}</div><div class="card-th">${d.th} · Passive</div></div><div class="badge">${r}/${d.max}</div></div>
      <div class="card-desc">${d.desc}</div></div>`;
  }
  if (c.type === 'keystone') {
    const d = KEYSTONES[c.id];
    return `<div class="card card-keystone">${key}
      <div class="card-head"><span class="node node-key">${d.icon}</span><div><div class="card-name">${d.name}</div><div class="card-th">${d.th} · Keystone</div></div><div class="badge badge-key">KEYSTONE</div></div>
      <div class="card-desc">${d.desc}</div><div class="card-note">Keystone ${Object.keys(P.keystones).length + 1}/${MAX_KEYSTONES} ของรอบนี้ — เลือกให้ดี!</div></div>`;
  }
  if (c.type === 'fusing') {
    return `<div class="card card-currency">${key}
      <div class="card-head"><span class="node node-cur">◈</span><div><div class="card-name">Orb of Fusing</div><div class="card-th">Currency</div></div></div>
      <div class="card-desc">เพิ่มซ็อกเก็ต Support +1 ให้สกิลที่เลือก (สูงสุด ${MAX_SOCKETS} = 6-Link)</div></div>`;
  }
  return `<div class="card card-passive">${key}<div class="card-head"><span class="node">❤</span><div><div class="card-name">Life Potion</div><div class="card-th">ฟื้นฟู</div></div></div><div class="card-desc">ฟื้นชีวิต 50%</div></div>`;
}

// does this support complete an evolution recipe for an owned skill?
function evoUseHtml(supId) {
  const hits = G.player.skills.filter((i) => !i.evo && EVOLUTIONS[i.id] && EVOLUTIONS[i.id].req.includes(supId));
  return hits.length ? `<div class="card-note evo-hint">✦ ใช้วิวัฒน์ ${hits.map((i) => SKILLS[i.id].name).join(', ')} ได้</div>` : '';
}

function choiceCount(isChest) { return (isChest ? 5 : 4) + G.player.mods.extraChoices; }
function setLevelupButtons(on) {
  $('btn-reroll').style.display = on ? '' : 'none';
  $('btn-skip').style.display = on ? '' : 'none';
}
function openLevelUp(isChest) {
  G.state = 'levelup';
  G.levelIsChest = isChest;
  G.choiceKind = isChest ? 'chest' : 'level';
  setLevelupButtons(true);
  G.choices = generateChoices(choiceCount(isChest));
  $('levelup-title').textContent = isChest ? 'หีบสมบัติ!' : 'LEVEL UP!';
  $('levelup-sub').textContent = isChest ? 'เลือกของ 1 อย่างจากหีบ' : `เลเวล ${G.player.level - G.pendingLevels + 1} — เลือก 1 อย่าง`;
  renderCards();
  Sfx.play('levelup');
  show('levelup');
}
function renderCards() {
  const wrap = $('cards');
  wrap.innerHTML = G.choices.map((c, i) => cardHtml(c, i)).join('');
  [...wrap.children].forEach((el, i) => { el.onclick = () => chooseCard(i); });
  $('chaos-count').textContent = G.player.currency.chaos;
  $('btn-reroll').disabled = G.player.currency.chaos <= 0;
}
function reroll() {
  if (G.state !== 'levelup' || G.player.currency.chaos <= 0) return;
  G.player.currency.chaos--;
  G.choices = generateChoices(choiceCount(G.levelIsChest));
  renderCards();
}

// Ascendancy: the first trial picks the subclass, later ones unlock a node
function openAscend() {
  const P = G.player;
  G.state = 'levelup';
  G.choiceKind = 'asc';
  G.levelIsChest = false;
  if (!P.asc) {
    G.choices = Object.values(ASCENDANCY).filter((a) => a.cls === P.cls.id).map((a) => ({ type: 'ascclass', id: a.id }));
    $('levelup-sub').textContent = 'ผ่านการทดสอบแล้ว! เลือกคลาสย่อย (เลือกได้ครั้งเดียวต่อรอบ)';
  } else {
    G.choices = ascNodeChoices();
    $('levelup-sub').textContent = `${ASCENDANCY[P.asc].name} — เลือกปลดล็อก 1 โหนด`;
  }
  if (!G.choices.length) { G.pendingAscend = 0; G.state = 'play'; return; }
  $('levelup-title').textContent = 'ASCENDANCY';
  setLevelupButtons(false);
  const wrap = $('cards');
  wrap.innerHTML = G.choices.map((c, i) => cardHtml(c, i)).join('');
  [...wrap.children].forEach((el, i) => { el.onclick = () => chooseCard(i); });
  Sfx.play('levelup');
  show('levelup');
}
function grantAscNode(id) {
  const P = G.player, n = ASC_NODES[id];
  P.ascNodes.push(id);
  if (n.grant) {
    const have = P.skills.find((s) => s.id === n.grant);
    if (have) have.level = Math.min(MAX_GEM_LEVEL, have.level + 3);
    else { const inst = newSkillInstance(n.grant); inst.level = 3; P.skills.push(inst); }
  }
  if (n.instant === 'gems2') for (const s of P.skills) s.level = Math.min(MAX_GEM_LEVEL, s.level + 2);
  if (n.instant === 'fusing2') P.currency.fusing += 2;
  if (n.instant === 'chaos3') P.currency.chaos += 3;
  if (n.id === 'divine_aegis') P.aegis = 1;
  recomputePlayer();
}
function skipLevel() {
  if (G.state !== 'levelup') return;
  const P = G.player;
  P.life = Math.min(P.maxLife, P.life + P.maxLife * 0.2);
  finishChoice();
}

function chooseCard(i) {
  const c = G.choices[i], P = G.player;
  if (!c) return;
  if (c.type === 'skill') { P.skills.push(newSkillInstance(c.id)); recomputePlayer(); finishChoice(); }
  else if (c.type === 'level') { c.inst.level++; recomputePlayer(); finishChoice(); }
  else if (c.type === 'passive') { P.passives[c.id] = (P.passives[c.id] || 0) + 1; recomputePlayer(); finishChoice(); }
  else if (c.type === 'keystone') { P.keystones[c.id] = 1; recomputePlayer(); finishChoice(); }
  else if (c.type === 'evolve') {
    c.inst.evo = true; recomputePlayer();
    announce(EVOLUTIONS[c.inst.id].name, 'เจมวิวัฒนาการแล้ว! เก็บวิญญาณแล้วกด V', '#ff5050');
    finishChoice();
  }
  else if (c.type === 'awaken') { c.inst.awakened.push(c.id); recomputePlayer(); finishChoice(); }
  else if (c.type === 'ascclass') {
    P.asc = c.id; grantAscNode(ASCENDANCY[c.id].nodes[0].id);
    announce(ASCENDANCY[c.id].name, ASCENDANCY[c.id].th, ASCENDANCY[c.id].color);
    finishChoice();
  }
  else if (c.type === 'ascnode') { grantAscNode(c.id); finishChoice(); }
  else if (c.type === 'support') openSocketPicker('support', c.id);
  else if (c.type === 'fusing') openSocketPicker('fusing');
  else { P.life = Math.min(P.maxLife, P.life + P.maxLife * 0.5); finishChoice(); }
}

function finishChoice() {
  hide('levelup'); hide('socket');
  if (G.choiceKind === 'asc') G.pendingAscend--;
  else if (G.levelIsChest) G.pendingChests--; else G.pendingLevels--;
  G.state = 'play';
  G.lastTs = performance.now();
}

// ---------------- Socket picker ----------------
// mode 'support': socket support `supId` into a skill
// mode 'fusing' : add a socket (from a level-up card)
// mode 'fusingItem': add a socket using an Orb of Fusing from inventory (from build panel)
function openSocketPicker(mode, supId) {
  const P = G.player;
  G.socketCtx = { mode, supId };
  hide('levelup');
  const list = $('socket-list');
  list.innerHTML = '';
  if (mode === 'support') {
    const d = SUPPORTS[supId];
    $('socket-title').innerHTML = `${supportGemHtml(d.gem, true)} ${d.name}`;
    $('socket-sub').textContent = 'เลือกสกิลที่จะใส่ Support Gem นี้ (ถ้าซ็อกเก็ตเต็ม คลิกเจมเดิมเพื่อแทนที่)';
  } else {
    $('socket-title').textContent = '◈ Orb of Fusing';
    $('socket-sub').textContent = 'เลือกสกิลที่จะเพิ่มซ็อกเก็ต +1';
  }
  for (const inst of P.skills) {
    const d = SKILLS[inst.id];
    const row = document.createElement('div');
    row.className = 'socket-row';
    let status = '', ok = false, replace = false;
    if (mode === 'support') {
      const r = supportBlockReason(supId, inst);
      const rFull = supportBlockReason(supId, inst, true);
      ok = !r;
      replace = !ok && !rFull; // only blocked by full sockets
      status = ok ? '<span class="ok">ใส่ได้</span>' : replace ? '<span class="warn">เต็ม — คลิกเจมเพื่อแทนที่' + (P.currency.fusing ? ' หรือใช้ Fusing' : '') + '</span>' : `<span class="bad">${r}</span>`;
    } else {
      ok = inst.sockets < MAX_SOCKETS;
      status = ok ? `<span class="ok">${inst.sockets + 1}-Link → ${inst.sockets + 2}-Link</span>` : '<span class="bad">ซ็อกเก็ตเต็มแล้ว</span>';
    }
    row.innerHTML = `${skillGemHtml(d.id, false, inst.evo)}<div class="socket-info"><div class="card-name">${skillDisplayName(inst)} <small>Lv ${inst.level}</small></div>
      <div class="sup-chips">${inst.supports.map((s, i) => `<span class="chip chip-${SUPPORTS[s].gem}${inst.awakened.includes(s) ? ' chip-awk' : ''}${replace ? ' chip-rep' : ''}" data-i="${i}">${supportDisplayName(inst, s)}</span>`).join('') || '<span class="muted">ยังไม่มี Support</span>'}</div>
      <div>${socketsHtml(inst)} ${status}</div></div>`;
    if (!ok && !replace) row.classList.add('disabled');
    if (ok) row.onclick = () => applySocket(inst);
    if (replace) {
      row.classList.add('replace');
      row.querySelectorAll('.chip-rep').forEach((ch) => {
        ch.onclick = (ev) => {
          ev.stopPropagation();
          const old = inst.supports.splice(+ch.dataset.i, 1, supId)[0];
          inst.awakened = inst.awakened.filter((a) => a !== old);
          recomputePlayer(); finishChoice();
        };
      });
      if (P.currency.fusing > 0) {
        const b = document.createElement('button');
        b.className = 'btn btn-small'; b.textContent = '◈ ใช้ Fusing แล้วใส่';
        b.onclick = (ev) => { ev.stopPropagation(); P.currency.fusing--; inst.sockets++; applySocket(inst); };
        row.querySelector('.socket-info').appendChild(b);
      }
    }
    list.appendChild(row);
  }
  show('socket');
}
function applySocket(inst) {
  const ctx = G.socketCtx, P = G.player;
  if (ctx.mode === 'support') inst.supports.push(ctx.supId);
  else if (ctx.mode === 'fusing') inst.sockets++;
  else if (ctx.mode === 'fusingItem') { inst.sockets++; P.currency.fusing--; recomputePlayer(); hide('socket'); openPause(); return; }
  recomputePlayer();
  finishChoice();
}
function socketBack() {
  hide('socket');
  if (G.socketCtx && G.socketCtx.mode === 'fusingItem') { openPause(); return; }
  show('levelup');
}

// ---------------- Build / pause panel ----------------
function buildViewHtml(final) {
  const P = G.player, m = P.mods;
  const total = P.skills.reduce((a, s) => a + s.dmgDealt, 0) || 1;
  let h = '<div class="bv-skills">';
  for (const inst of P.skills) {
    const d = SKILLS[inst.id], s = inst.st;
    h += `<div class="bv-skill">
      <div class="bv-head">${skillGemHtml(d.id, false, inst.evo)}<div><div class="card-name">${skillDisplayName(inst)} <small>Lv ${inst.level}/${MAX_GEM_LEVEL}${m.gemLevel ? ` (+${m.gemLevel})` : ''}</small></div>${tagsHtml(s.tags)}</div></div>
      <div>${socketsHtml(inst)} <span class="muted">${inst.sockets + 1}-Link</span>
      ${!final && P.currency.fusing > 0 && inst.sockets < MAX_SOCKETS ? `<button class="btn btn-small" data-fuse="${inst.uid}">◈ ใช้ Fusing</button>` : ''}</div>
      <div class="sup-chips">${inst.supports.map((sid) => `<span class="chip chip-${SUPPORTS[sid].gem}${inst.awakened.includes(sid) ? ' chip-awk' : ''}" title="${SUPPORTS[sid].desc}">${supportDisplayName(inst, sid)}</span>`).join('') || '<span class="muted">ไม่มี Support</span>'}</div>
      <div class="bv-stats">${describeStats(s).join(' · ')}</div>
      ${inst.evo ? `<div class="bv-vaal">Vaal: วิญญาณ ${inst.souls}/${vaalSouls()}${inst.souls >= vaalSouls() ? ' — <b>พร้อม! กด V</b>' : ''}</div>` : evolveHintHtml(inst.id)}
      <div class="bv-dmg"><div class="bar"><div style="width:${(inst.dmgDealt / total) * 100}%"></div></div>ดาเมจรวม ${fmtNum(inst.dmgDealt)} (${Math.round((inst.dmgDealt / total) * 100)}%) · ฆ่า ${inst.kills}</div>
    </div>`;
  }
  h += '</div><div class="bv-side">';
  h += `<div class="bv-box"><div class="bv-title">ตัวละคร — ${P.cls.name}</div>
    ❤ ชีวิต ${Math.ceil(P.life)}/${Math.round(P.maxLife)}<br>
    ➹ ความเร็ว ${Math.round(P.moveSpeed)}<br>
    ✚ ฟื้นฟู ${(m.regen * 100).toFixed(1)}%/วิ${m.ks.vaalPact ? ' (ปิดโดย Vaal Pact)' : ''}<br>
    ⛨ รับดาเมจ ×${m.dmgTaken.toFixed(2)}${m.evade ? ' · หลบ ' + pct(m.evade) : ''}<br>
    ✪ Chaos ${P.currency.chaos} · ◈ Fusing ${P.currency.fusing}${m.ks.rage ? '<br>✊ Rage ' + Math.floor(P.rage) + '/30' : ''}</div>`;
  const ps = Object.keys(P.passives);
  h += '<div class="bv-box"><div class="bv-title">Passive</div>' + (ps.length ? ps.map((id) => `${PASSIVES[id].icon} ${PASSIVES[id].name} <b>${P.passives[id]}</b>/${PASSIVES[id].max}`).join('<br>') : '<span class="muted">ยังไม่มี</span>') + '</div>';
  h += `<div class="bv-box"><div class="bv-title" style="color:${BIOMES[G.map.biome].color}">🗺 ${mapLabel(G.map)}</div>` +
    (G.map.mods.length ? G.map.mods.map((id) => `<div class="muted">${MAP_MODS[id].th}</div>`).join('') : '<span class="muted">ไม่มี map mod</span>') + '</div>';
  const eq = ITEM_SLOTS.filter((sl) => P.equip[sl]);
  if (eq.length) h += '<div class="bv-box bv-items"><div class="bv-title">อุปกรณ์</div>' +
    eq.map((sl) => `<div>${SLOT_NAME[sl]}: <span style="color:${RARITY_COLOR[P.equip[sl].rarity]}">${P.equip[sl].name}</span></div>`).join('') + '</div>';
  if (P.asc) {
    const a = ASCENDANCY[P.asc];
    h += `<div class="bv-box bv-asc" style="--cc:${a.color}"><div class="bv-title">${a.icon} ${a.name} <span class="muted">${a.th}</span></div>` +
      P.ascNodes.map((id) => `<b>${ASC_NODES[id].name}</b><br><span class="muted">${ASC_NODES[id].desc}</span>`).join('<br>') + '</div>';
  } else if (!final) h += '<div class="bv-box"><div class="bv-title">Ascendancy</div><span class="muted">โค่นบอสตัวแรก (5:00) เพื่อเลือกคลาสย่อย</span></div>';
  const ks = Object.keys(P.keystones);
  if (ks.length) h += '<div class="bv-box bv-key"><div class="bv-title">Keystone</div>' + ks.map((id) => `<b>${KEYSTONES[id].name}</b><br><span class="muted">${KEYSTONES[id].desc}</span>`).join('<br>') + '</div>';
  h += '</div>';
  return h;
}

function openPause() {
  if (G.state !== 'play' && G.state !== 'paused') return;
  G.state = 'paused';
  $('pause-title').textContent = 'หยุดเกม — บิวของคุณ';
  $('build-view').innerHTML = buildViewHtml(false);
  $('build-view').querySelectorAll('[data-fuse]').forEach((b) => {
    b.onclick = () => {
      const inst = G.player.skills.find((s) => s.uid === +b.dataset.fuse);
      if (inst && G.player.currency.fusing > 0) { G.player.currency.fusing--; inst.sockets++; recomputePlayer(); openPause(); }
    };
  });
  show('pause');
}
function resume() {
  if (G.state !== 'paused') return;
  hide('pause');
  G.state = 'play';
  G.lastTs = performance.now();
}

function showGameOver(win) {
  G.state = 'over';
  const P = G.player;
  $('over-title').textContent = win ? 'ชัยชนะ! คุณรอดจากดินแดนต้องสาป' : 'คุณตายแล้ว';
  $('over-title').className = 'panel-title ' + (win ? 'win' : 'dead');
  const rec = { time: G.time, level: P.level, kills: G.stats.kills, cls: P.asc ? ASCENDANCY[P.asc].name : P.cls.name, win };
  saveBest(rec);
  let metaHtml = '';
  if (!G.settled) {
    G.settled = true;
    const res = settleRun(Object.assign({ bosses: G.stats.bosses, salvage: G.stats.salvage, map: G.map }, rec));
    metaHtml = `<div class="over-meta"><div class="over-shards">+${res.reward.total} ✦ Ancient Shards</div>
      <div class="muted">${res.reward.parts.filter((p) => p[1] > 0).map((p) => `${p[0]} +${p[1]}`).concat(`รวมมี ${Meta.shards} ✦`).join(' · ')}</div>
      ${res.atlas ? `<div class="over-unlock">🗺 ผ่านแผนที่ ${mapLabel(G.map)}${res.atlas.first ? ' ครั้งแรก! (+1 แต้ม Legacy Tree)' : ''}${res.atlas.tierUp ? ` · ปลดล็อก Tier ${res.atlas.maxTier}` : ''}</div>` : ''}
      ${res.newly.map((u) => `<div class="over-unlock">🔓 ปลดล็อก${u.kind === 'class' ? 'คลาส' : 'เจม'}: <b>${unlockLabel(u)}</b></div>`).join('')}</div>`;
  }
  $('over-stats').innerHTML = `<div class="over-summary">
      ⏱ รอด <b>${fmtTime(G.time)}</b> · Lv <b>${P.level}</b> · ☠ ฆ่า <b>${G.stats.kills}</b> · บอส <b>${G.stats.bosses}</b> · ดาเมจรวม <b>${fmtNum(G.stats.dmg)}</b>
      ${!win && P.killedBy ? `<br><span class="muted">ถูกฆ่าโดย: ${P.killedBy}</span>` : ''}</div>` + metaHtml + buildViewHtml(true);
  show('gameover');
}

// ---------------- Altar of Legacy: the Legacy Tree ----------------
const TREE_KIND = { start: 'จุดเริ่มต้น', small: 'โหนดเล็ก', notable: 'Notable', keystone: 'Keystone' };
const TREE_R = { start: 20, small: 11, notable: 18, keystone: 25 };
let altarSel = null;

function openAltar() {
  const M = loadMeta();
  hide('menu');
  $('altar-shards').innerHTML = `✦ <b>${M.shards}</b> Ancient Shards`;
  const used = treePointsUsed();
  $('altar-points').innerHTML = `แต้ม <b>${used}</b>/${treePointCap()}${atlasBonusPoints() ? ` <span class="muted">(Atlas +${atlasBonusPoints()})</span>` : ''}`;
  $('altar-next').textContent = `ราคาถัดไป: เล็ก ${treeNodeCost({ kind: 'small' }, used)} · Notable ${treeNodeCost({ kind: 'notable' }, used)} · Keystone ${treeNodeCost({ kind: 'keystone' }, used)} ✦`;
  renderTree();
  renderTreeInfo();
  renderTreeSummary();
  $('altar-unlocks').innerHTML = UNLOCKS.map((u) => {
    const done = !!M.unlocked[u.id];
    return `<div class="meta-unlock${done ? ' done' : ''}">
      <span class="ul-icon">${done ? '🔓' : '🔒'}</span>
      <div class="ul-text"><b>${u.kind === 'class' ? 'คลาส' : 'เจม'} ${unlockLabel(u)}</b><br><span class="muted">${u.req}</span></div>
      ${done ? '<span class="ok">ปลดล็อกแล้ว</span>' : `<button class="btn btn-small" data-unlock="${u.id}" ${M.shards < u.cost ? 'disabled' : ''}>${u.cost} ✦</button>`}</div>`;
  }).join('');
  const found = M.found || {}, ids = Object.keys(UNIQUES);
  $('altar-uniques-h').innerHTML = `คลัง Unique <span class="muted">${ids.filter((u) => found[u]).length}/${ids.length} ที่ค้นพบ</span>`;
  $('altar-uniques').innerHTML = ids.map((u) => found[u]
    ? `<div class="uq found" title="${UNIQUES[u].lines.join(' · ')}">${UNIQUES[u].name}<br><span class="muted">${SLOT_NAME[UNIQUES[u].slot]} · ${UNIQUES[u].th}</span></div>`
    : `<div class="uq"><span class="muted">??? · ${SLOT_NAME[UNIQUES[u].slot]}</span></div>`).join('');
  const L = M.life;
  $('altar-life').innerHTML = `เล่นทั้งหมด ${L.runs} รอบ · ชนะ ${L.wins} · ฆ่ารวม ${fmtNum(L.kills)} · บอสรวม ${L.bosses}`;
  $('altar').querySelectorAll('[data-unlock]').forEach((b) => { b.onclick = () => { if (buyUnlock(b.dataset.unlock)) { Sfx.play('currency'); openAltar(); } }; });
  const wasHidden = $('altar').classList.contains('hidden');
  show('altar');
  if (wasHidden) { const w = $('tree-wrap'); w.scrollLeft = (w.scrollWidth - w.clientWidth) / 2; w.scrollTop = (w.scrollHeight - w.clientHeight) / 2; }
}

function treeNodeState(id) {
  if (treeAllocated(id)) return 'on';
  return TREE_NODES[id].links.some(treeAllocated) ? 'avail' : 'off';
}

function renderTree() {
  let edges = '', nodes = '', labels = '';
  for (const id in TREE_NODES) {
    const n = TREE_NODES[id];
    for (const l of n.links) {
      if (l < id) continue;
      const m = TREE_NODES[l], on = treeAllocated(id), on2 = treeAllocated(l);
      edges += `<line class="edge${on && on2 ? ' on' : on || on2 ? ' reach' : ''}" x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${m.x.toFixed(1)}" y2="${m.y.toFixed(1)}"/>`;
    }
    const r = TREE_R[n.kind], st = treeNodeState(id);
    nodes += `<g class="tn tn-${n.kind} ${st}${altarSel === id ? ' sel' : ''}" data-id="${id}" style="--c:${n.color}" transform="translate(${n.x.toFixed(1)},${n.y.toFixed(1)})">
      <circle class="hit" r="${Math.max(r + 8, 22)}"/>
      ${n.kind === 'keystone' ? `<circle class="outer" r="${r + 6}"/>` : ''}
      <circle class="body" r="${r}"/>
      <text class="ic" dy="${r * 0.36}" font-size="${r * 1.05}">${n.icon}</text></g>`;
    if (n.kind === 'keystone') labels += `<text class="tl" x="${n.x.toFixed(1)}" y="${(n.y + r + 26).toFixed(1)}">${n.name}</text>`;
    if (n.kind === 'notable') labels += `<text class="tl tl-n" x="${n.x.toFixed(1)}" y="${(n.y + r + 18).toFixed(1)}">${n.name}</text>`;
  }
  const svg = $('tree-svg');
  svg.innerHTML = `<g>${edges}</g><g>${labels}</g><g>${nodes}</g>`;
  svg.querySelectorAll('.tn').forEach((g) => {
    const id = g.dataset.id;
    g.onmouseenter = () => { if (altarSel !== id) { altarSel = id; markTreeSel(); renderTreeInfo(); } };
    g.onclick = () => {
      // first tap selects (touch has no hover), a tap on the selected node acts
      if (altarSel !== id) { altarSel = id; markTreeSel(); renderTreeInfo(); return; }
      treeAct(id);
    };
  });
}
function markTreeSel() { $('tree-svg').querySelectorAll('.tn').forEach((g) => g.classList.toggle('sel', g.dataset.id === altarSel)); }

function treeAct(id) {
  if (treeAllocated(id)) { if (treeRefund(id)) Sfx.play('pickup'); }
  else if (treeAllocate(id)) { Sfx.play('levelup'); emitAltarFlash(id); }
  openAltar();
}
function emitAltarFlash(id) {
  const g = $('tree-svg').querySelector(`[data-id="${id}"]`);
  if (g) g.classList.add('flash');
}

function renderTreeInfo() {
  const box = $('tree-info');
  const id = altarSel;
  if (!id) { box.innerHTML = '<div class="bv-title">Legacy Tree</div><span class="muted">ชี้หรือแตะโหนดเพื่อดูรายละเอียด · คลิก/แตะซ้ำเพื่อจัดสรร · ต้องเชื่อมต่อจากโหนดที่มีอยู่</span>'; return; }
  const n = TREE_NODES[id];
  const title = n.name || (n.branch ? n.branch.name : 'Bridge');
  let action = '';
  if (id === TREE_START) action = '<span class="muted">จุดเริ่มต้น — เส้นทางทุกสายเริ่มจากที่นี่</span>';
  else if (treeAllocated(id)) action = treeCanRefund(id)
    ? `<button class="btn btn-small" id="tree-act">คืนแต้ม (+${Meta.alloc[id]} ✦)</button>`
    : '<span class="muted">คืนแต้มไม่ได้: มีโหนดอื่นต่อจากโหนดนี้</span>';
  else {
    const why = treeAllocReason(id);
    action = why ? `<span class="bad">${why}</span> <span class="muted">(${treeNextCost(id)} ✦)</span>` : `<button class="btn btn-small" id="tree-act">จัดสรร (${treeNextCost(id)} ✦)</button>`;
  }
  box.innerHTML = `<div class="bv-title" style="color:${n.color}">${n.icon} ${title}</div>
    <div class="muted">${TREE_KIND[n.kind]}${n.branch ? ' · ' + n.branch.th : ''}${n.th ? ' · ' + n.th : ''}</div>
    <div class="tree-desc${n.kind === 'keystone' ? ' ks' : ''}">${n.desc}</div><div>${action}</div>`;
  const b = $('tree-act');
  if (b) b.onclick = () => treeAct(id);
}

function renderTreeSummary() {
  const M = loadMeta(), keys = [], nots = [], smalls = {};
  for (const id in M.alloc) {
    const n = TREE_NODES[id];
    if (n.kind === 'keystone') keys.push(n); else if (n.kind === 'notable') nots.push(n); else smalls[n.desc] = (smalls[n.desc] || 0) + 1;
  }
  let h = '<div class="bv-title">โบนัสที่ได้รับ</div>';
  if (!keys.length && !nots.length && !Object.keys(smalls).length) h += '<span class="muted">ยังไม่ได้จัดสรรโหนด</span>';
  h += keys.map((n) => `<div class="ts-key" style="color:${n.color}">◆ ${n.name}<br><span>${n.desc}</span></div>`).join('');
  h += nots.map((n) => `<div class="ts-not"><b style="color:${n.color}">${n.name}</b> — ${n.desc}</div>`).join('');
  h += Object.entries(smalls).map(([d, c]) => `<div class="ts-small">${d}${c > 1 ? ` <b>×${c}</b>` : ''}</div>`).join('');
  $('tree-summary').innerHTML = h;
}
function closeAltar() { hide('altar'); buildMenu(); show('menu'); }

// ---------------- Inventory / equipment ----------------
let invSel = null;   // selected item object
function itemIconURL(it) { return spriteURL('item_' + it.slot, 3); }
function itemCardHtml(it, label) {
  const col = RARITY_COLOR[it.rarity];
  let h = `<div class="item-card r-${it.rarity}">${label ? `<div class="ic-label">${label}</div>` : ''}
    <div class="ic-head" style="color:${col}">${it.name}</div>
    <div class="ic-base">${it.unique ? UNIQUES[it.unique].th + ' · ' : it.base + ' · '}${RARITY_NAME[it.rarity]} ${SLOT_NAME[it.slot]}</div><div class="ic-sep"></div>`;
  if (it.implicit) h += `<div class="ic-imp">${affixText(it.implicit)}</div><div class="ic-sep"></div>`;
  h += itemLines(it).map((l) => `<div class="ic-mod"${it.unique ? ' style="color:#c8b0ff"' : ''}>${l}</div>`).join('');
  if (it.unique) h += `<div class="ic-flavor">"${UNIQUES[it.unique].flavor}"</div>`;
  return h + '</div>';
}
function openInventory() {
  if (G.state !== 'play' && G.state !== 'paused' && G.state !== 'inventory') return;
  hide('pause');
  G.state = 'inventory';
  const P = G.player;
  P.newItems = 0;
  $('inv-equip').innerHTML = ITEM_SLOTS.map((sl) => {
    const it = P.equip[sl];
    return it ? `<div class="inv-slot r-${it.rarity}${invSel === it ? ' sel' : ''}" data-eq="${sl}"><img src="${itemIconURL(it)}" alt=""><span style="color:${RARITY_COLOR[it.rarity]}">${it.name}</span></div>`
      : `<div class="inv-slot empty"><span class="muted">${SLOT_NAME[sl]}</span><span class="muted">ว่าง</span></div>`;
  }).join('');
  let bag = '';
  for (let i = 0; i < BACKPACK_SIZE; i++) {
    const it = P.backpack[i];
    bag += it ? `<div class="inv-cell r-${it.rarity}${invSel === it ? ' sel' : ''}" data-bag="${i}" title="${it.name}"><img src="${itemIconURL(it)}" alt=""></div>` : '<div class="inv-cell empty"></div>';
  }
  $('inv-bag').innerHTML = bag;
  $('inv-count').textContent = `${P.backpack.length}/${BACKPACK_SIZE}`;
  $('inventory').querySelectorAll('[data-eq]').forEach((el) => { el.onclick = () => { invSel = P.equip[el.dataset.eq]; openInventory(); }; });
  $('inventory').querySelectorAll('[data-bag]').forEach((el) => { el.onclick = () => { invSel = P.backpack[+el.dataset.bag]; openInventory(); }; });
  renderInvDetail();
  show('inventory');
}
function renderInvDetail() {
  const P = G.player, it = invSel, box = $('inv-detail');
  const owned = it && (P.backpack.includes(it) || P.equip[it.slot] === it);
  if (!owned) { invSel = null; box.innerHTML = '<span class="muted">เลือกไอเทมเพื่อดูรายละเอียด · ไอเทมดรอปจาก Rare และบอส (Unique มีลำแสงสีส้ม)</span>'; return; }
  const worn = P.equip[it.slot] === it, cur = P.equip[it.slot];
  let h = itemCardHtml(it, worn ? 'สวมใส่อยู่' : 'ในกระเป๋า');
  h += '<div class="inv-actions">';
  if (worn) h += `<button class="btn btn-small" id="inv-btn-unequip" ${P.backpack.length >= BACKPACK_SIZE ? 'disabled' : ''}>ถอดเก็บ</button>`;
  else h += `<button class="btn btn-small" id="inv-btn-equip">สวมใส่${cur ? ' (สลับ)' : ''}</button>`;
  h += `<button class="btn btn-small btn-dim" id="inv-btn-salvage">ย่อย (+${SALVAGE_SHARDS[it.rarity]} ✦)</button></div>`;
  if (!worn && cur) h += itemCardHtml(cur, 'เทียบกับที่สวมอยู่');
  box.innerHTML = h;
  const eq = $('inv-btn-equip'), un = $('inv-btn-unequip'), sv = $('inv-btn-salvage');
  if (eq) eq.onclick = () => { equipItem(it); Sfx.play('flask'); openInventory(); };
  if (un) un.onclick = () => { unequipItem(it.slot); openInventory(); };
  if (sv) sv.onclick = () => { salvageItem(it); invSel = null; Sfx.play('pickup'); openInventory(); };
}
function closeInventory() {
  if (G.state !== 'inventory') return;
  hide('inventory');
  G.state = 'play';
  G.lastTs = performance.now();
}

// ---------------- Map Device (Atlas) ----------------
let mapCls = null, mapCfg = null;
function openMapDevice(cls) {
  const M = loadMeta(), A = atlasData();
  if (cls) mapCls = cls;
  if (!mapCfg) {
    const last = M.lastMap;
    mapCfg = last && BIOMES[last.biome] && biomeOpen(last.biome) && last.tier <= A.maxTier ? { biome: last.biome, tier: last.tier, mods: last.mods.slice() } : { biome: 'graveyard', tier: 1, mods: [] };
  }
  hide('menu');
  $('map-class').textContent = `${mapCls.name} — เลือกแผนที่`;
  $('map-biomes').innerHTML = Object.entries(BIOMES).map(([id, b]) => {
    const open = biomeOpen(id), done = Object.keys(A.done).filter((k) => k.startsWith(id + '_')).length;
    return `<div class="map-biome${mapCfg.biome === id ? ' sel' : ''}${open ? '' : ' locked'}" data-biome="${id}" style="--cc:${b.color}">
      <div class="card-name">${b.name}</div><div class="card-th">${b.th}</div>
      <div class="card-desc">${open ? b.desc : `🔒 ปลดล็อกเมื่อถึง Tier ${b.minTier}`}</div>
      <div class="muted">${open ? `ผ่านแล้ว ${done} tier` + (b.minTier > 1 ? ` · เริ่มที่ Tier ${b.minTier}` : '') : ''}</div></div>`;
  }).join('');
  const minT = BIOMES[mapCfg.biome].minTier;
  let tiers = '';
  for (let t = 1; t <= MAX_MAP_TIER; t++) {
    const ok = t <= A.maxTier && t >= minT, done = A.done[mapCfg.biome + '_' + t];
    tiers += `<button class="tier-btn${mapCfg.tier === t ? ' sel' : ''}${done ? ' done' : ''}" data-tier="${t}" ${ok ? '' : 'disabled'}>${t}</button>`;
  }
  $('map-tiers').innerHTML = tiers;
  const qty = mapQuantity(mapCfg), mult = mapRewardMult(mapCfg);
  $('map-mods').innerHTML = (mapCfg.mods.length ? mapCfg.mods.map((id) => `<div class="map-mod"><b>${MAP_MODS[id].name}</b> — ${MAP_MODS[id].th} <span class="muted">(+${MAP_MODS[id].qty}%)</span></div>`).join('')
    : '<div class="muted">แผนที่ธรรมดา (Normal) — ไม่มี mod · ใช้ Alchemy เพื่อเพิ่มความยากและรางวัล</div>');
  $('map-summary').innerHTML = `มอนสเตอร์: ชีวิต ×${(tierHp(mapCfg.tier) * (BIOMES[mapCfg.biome].hpMul || 1)).toFixed(2)} · ดาเมจ ×${tierDmg(mapCfg.tier).toFixed(2)}<br>
    รางวัล: Item Quantity +${qty}% · Shards ×${mult.toFixed(2)}${A.done[mapCfg.biome + '_' + mapCfg.tier] ? '' : '<br><span class="ok">ยังไม่เคยผ่าน — ชนะเพื่อรับ +1 แต้ม Legacy Tree' + (mapCfg.tier >= A.maxTier && A.maxTier < MAX_MAP_TIER ? ` และปลดล็อก Tier ${mapCfg.tier + 1}` : '') + '</span>'}`;
  $('map-atlas').textContent = `Atlas: ผ่านแล้ว ${atlasDoneCount()} แผนที่ · Tier สูงสุด ${A.maxTier} · แต้ม Legacy Tree จาก Atlas +${atlasBonusPoints()}/${ATLAS_POINT_CAP} · ✦ ${M.shards}`;
  $('btn-map-alch').disabled = mapCfg.mods.length > 0;
  $('btn-map-chaos').disabled = !mapCfg.mods.length || M.shards < MAP_REROLL_COST;
  $('btn-map-chaos').textContent = `สุ่ม mod ใหม่ (${MAP_REROLL_COST} ✦)`;
  $('btn-map-clear').disabled = !mapCfg.mods.length;
  $('mapdev').querySelectorAll('[data-biome]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.biome;
      if (!biomeOpen(id)) return;
      mapCfg.biome = id; mapCfg.tier = Math.max(mapCfg.tier, BIOMES[id].minTier);
      openMapDevice();
    };
  });
  $('mapdev').querySelectorAll('[data-tier]').forEach((el) => {
    el.onclick = () => {
      const t = +el.dataset.tier;
      // more mods roll on higher tiers: re-roll so the count matches
      if (mapCfg.mods.length && mapModCount(t) !== mapModCount(mapCfg.tier)) mapCfg.mods = rollMapMods(t);
      mapCfg.tier = t; openMapDevice();
    };
  });
  show('mapdev');
}
function mapAlchemy() { mapCfg.mods = rollMapMods(mapCfg.tier); Sfx.play('currency'); openMapDevice(); }
function mapChaos() {
  const M = loadMeta();
  if (M.shards < MAP_REROLL_COST) return;
  M.shards -= MAP_REROLL_COST; saveMeta();
  mapCfg.mods = rollMapMods(mapCfg.tier); Sfx.play('currency'); openMapDevice();
}
function mapClear() { mapCfg.mods = []; openMapDevice(); }
function mapStart() {
  const M = loadMeta();
  M.lastMap = { biome: mapCfg.biome, tier: mapCfg.tier, mods: mapCfg.mods.slice() }; saveMeta();
  hide('mapdev');
  startGame(mapCls, mapCfg);
}
function mapBack() { hide('mapdev'); buildMenu(); show('menu'); }
