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
  return `<div class="card-note evo-hint">✦ วิวัฒน์เป็น <b>${ev.name}</b>: Lv ${evolveLevel()}+ และใส่ ${ev.req.map((r) => SUPPORTS[r].name).join(' / ')}</div>`;
}
function supportGemHtml(gem, small) {
  return `<img class="gem-img${small ? ' gem-sm' : ''}" src="${supportIconURL(gem)}" alt="Support">`;
}
function tagsHtml(tags) {
  return '<div class="tags">' + [...tags].filter((t) => t !== 'Damage').map((t) => `<span class="tag tag-${t.toLowerCase()}">${t}</span>`).join('') + '</div>';
}
// Neutral slots belong to the skill itself; gem color never restricts insertion.
function socketsHtml(inst) {
  const act = activeSupports(inst);
  let h = '<span class="sockets">';
  act.slots.forEach((sup, i) => {
    h += sup ? `<span class="sock skill-slot filled${inst.awakened.includes(sup) ? ' sock-awk' : ''}" title="ช่อง ${i + 1}: ${supportDisplayName(inst, sup)}"></span>`
      : `<span class="sock skill-slot" title="ช่อง ${i + 1}: ว่าง · ไม่จำกัดสี"></span>`;
  });
  return h + '</span>';
}

// ---------------- Class select ----------------
function buildMenu() {
  restoreRandom();
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
  $('best-run').innerHTML = (best ? `สถิติดีที่สุด: รอด <b>${fmtTime(best.time)}</b> · Lv ${best.level} · ฆ่า ${best.kills} (${best.cls})${best.win ? ' · <span class="win">ชนะ!</span>' : ''}<br>` : '') + dailyMenuHtml();
}
function loadBest() { try { return JSON.parse(localStorage.getItem('exile_best') || 'null'); } catch (e) { return null; } }
function saveBest(rec) {
  try {
    const b = loadBest();
    if (!b || rec.time > b.time || (rec.win && !b.win)) localStorage.setItem('exile_best', JSON.stringify(rec));
  } catch (e) { /* storage may be blocked */ }
}

// ---------------- Level-up choices ----------------
// Regular level: 3 cards. Every 10th level is a MILESTONE with big choices
// (Keystone, Awaken, Empower +3 gem levels). Rare-monster chests open instantly.
const MILESTONE_EVERY = 10;
const isMilestone = (lv) => lv > 0 && lv % MILESTONE_EVERY === 0;
const KS_NEED = { runebinder: ['Brand'], minion_instability: ['Minion'], point_blank: ['Projectile'], pain_attunement: ['Spell'],
  elemental_overload: ['Fire', 'Cold', 'Lightning'], elemental_equilibrium: ['Fire', 'Cold', 'Lightning'], avatar_of_fire: ['Fire', 'Physical', 'Cold', 'Lightning'],
  hex_master: ['Spell', 'Attack'], perfect_agony: ['Fire', 'Chaos'] };
const PASSIVE_RANKS = 2;      // a passive card gives two ranks
const GEM_LEVELS = 2;         // a gem level-up card gives two levels

// tags of the skills doing the work (≥20% of damage, or every skill early on)
function buildTags() {
  const P = G.player, total = P.skills.reduce((a, s) => a + s.dmgDealt, 0), set = new Set();
  for (const s of P.skills) if (!total || s.dmgDealt / total >= 0.2) for (const t of s.st.tags) set.add(t);
  return set;
}
const PASSIVE_TAGS = { spell: ['Spell'], attack: ['Attack'], proj: ['Projectile'], area: ['AoE'], ele: ['Fire', 'Cold', 'Lightning'], phys: ['Physical'],
  chaos: ['Chaos'], minion: ['Minion'], inferno: ['Fire'], winter: ['Cold'], thunder: ['Lightning'], duration: ['Duration'], affliction: ['Chaos', 'Fire'],
  ricochet: ['Projectile', 'Chaining'], piercing: ['Projectile'], blade_dance: ['Attack', 'Melee'], malediction: [], crit: ['Attack', 'Spell'], speed: ['Attack', 'Spell'] };
// does this card fit the build? (shown as ★)
function cardFits(c) {
  const P = G.player, tags = buildTags();
  if (c.type === 'support') {
    if (P.skills.some((i) => !i.evo && EVOLUTIONS[i.id] && EVOLUTIONS[i.id].req.includes(c.id))) return true;
    const top = P.skills.reduce((b, s) => (!b || s.dmgDealt > b.dmgDealt ? s : b), null);
    return !!top && !supportBlockReason(c.id, top, true) && SUPPORTS[c.id].req.length > 0;
  }
  if (c.type === 'passive') {
    if (['prismatic', 'fortress'].includes(c.id)) return ['fire', 'cold', 'lightning'].some((t) => P.resRaw[t] < 0.5);
    if (c.id === 'purity_flesh') return P.resRaw.chaos < 0.2;
    return (PASSIVE_TAGS[c.id] || []).some((t) => tags.has(t));
  }
  if (c.type === 'level') { const total = P.skills.reduce((a, s) => a + s.dmgDealt, 0); return total > 0 && c.inst.dmgDealt / total >= 0.35; }
  return false;
}

function generateChoices(n, milestone) {
  if (milestone) return milestoneChoices(n);
  return regularChoices(n);
}
function milestoneChoices(n) {
  const P = G.player, pool = [];
  // only keystones that can matter for the skills you have
  const tags = new Set(P.skills.flatMap((s) => [...s.st.tags]));
  const fits = (k) => !KS_NEED[k] || KS_NEED[k].some((t) => tags.has(t));
  if (Object.keys(P.keystones).length < MAX_KEYSTONES) for (const id of weightedSample(Object.keys(KEYSTONES).filter((k) => !P.keystones[k] && fits(k)), 2, () => 1)) pool.push({ type: 'keystone', id });
  const aw = [];
  for (const inst of P.skills) for (const sid of activeSupports(inst).active) if (!inst.awakened.includes(sid)) aw.push({ type: 'awaken', inst, id: sid });
  for (const a of weightedSample(aw, Math.min(2, aw.length), () => 1)) pool.push(a);
  for (const inst of P.skills.slice().sort((a, b) => b.dmgDealt - a.dmgDealt).slice(0, 2)) if (inst.level < MAX_GEM_LEVEL) pool.push({ type: 'empower', inst });
  const out = weightedSample(pool, Math.min(n, pool.length), (c) => (c.type === 'keystone' ? 2 : 1));
  const evo = P.skills.find(evolveRecipeMet);
  if (evo) { if (out.length >= n) out.pop(); out.unshift({ type: 'evolve', inst: evo }); }
  return out.length ? out : regularChoices(n);
}
function regularChoices(n) {
  const P = G.player, owned = new Set(P.skills.map((s) => s.id));
  const cats = { skill: [], level: [], support: [], passive: [], keystone: [] };
  if (P.skills.length < MAX_SKILLS + P.mods.skillSlots) for (const id in SKILLS) if (!owned.has(id) && !G.banned.has(id) && !isLocked('gem', id)) cats.skill.push({ type: 'skill', id });
  for (const inst of P.skills) if (inst.level < MAX_GEM_LEVEL) cats.level.push({ type: 'level', inst });
  for (const id in SUPPORTS) {
    if (P.skills.some((inst) => canSocketSupport(id, inst))) cats.support.push({ type: 'support', id });
  }
  for (const id in PASSIVES) if ((P.passives[id] || 0) < PASSIVES[id].max) cats.passive.push({ type: 'passive', id });
  // Keystones and Awakens are milestone cards now

  const cw = {
    skill: P.skills.length <= 2 ? 3.2 : 1.6, level: 3.2, support: 3.0,
    passive: 2.0, keystone: 0.45, awaken: 0.5,
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
  if (!out.some((c) => c.type === 'support') && cats.support.length && Math.random() < 0.5) {
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
  const key = `<span class="card-key">${idx + 1}</span>`, star = cardFits(c) ? '<div class="card-star">★ เข้ากับบิลด์</div>' : '';
  if (c.type === 'skill') {
    const d = SKILLS[c.id];
    return `<div class="card card-skill" title="${d.desc}">${key}
      <div class="card-head">${skillGemHtml(d.id)}<div><div class="card-name">${d.name}</div><div class="card-th">สกิลใหม่ · เริ่ม Lv ${newSkillLevel()}</div></div><div class="badge badge-new">ใหม่</div></div>
      ${tagsHtml(d.tags)}<div class="card-desc clamp">${d.desc}</div>${weaponNoteHtml(d)}</div>`;
  }
  if (c.type === 'empower') {
    const d = SKILLS[c.inst.id], to = Math.min(MAX_GEM_LEVEL, c.inst.level + 3);
    const nxt = buildSkillStats(Object.assign({}, c.inst, { level: to }), P), now = c.inst.st;
    return `<div class="card card-level card-ms">${key}
      <div class="card-head">${skillGemHtml(d.id, false, c.inst.evo)}<div><div class="card-name">Empower: ${skillDisplayName(c.inst)}</div><div class="card-th">เจมหลักของคุณ +3 เลเวล</div></div><div class="badge">Lv ${c.inst.level} → ${to}</div></div>
      <div class="card-desc">ดาเมจ ${fmtNum(now.hitTotal)} → <b>${fmtNum(nxt.hitTotal)}</b></div></div>`;
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
    return `<div class="card card-awaken card-ms">${key}
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
    const now = c.inst.st, nxt = buildSkillStats(Object.assign({}, c.inst, { level: Math.min(MAX_GEM_LEVEL, c.inst.level + GEM_LEVELS) }), P);
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
      <div class="card-head">${skillGemHtml(d.id, false, c.inst.evo)}<div><div class="card-name">${skillDisplayName(c.inst)}</div><div class="card-th">เลเวลเจม +${GEM_LEVELS}</div></div><div class="badge">Lv ${c.inst.level} → ${Math.min(MAX_GEM_LEVEL, c.inst.level + GEM_LEVELS)}</div></div>
      ${star}<div class="card-desc">${lines.join(' · ')}</div></div>`;
  }
  if (c.type === 'support') {
    const d = SUPPORTS[c.id];
    const fits = P.skills.filter((inst) => canSocketSupport(c.id, inst));
    return `<div class="card card-support" title="${d.desc}">${key}
      <div class="card-head">${supportGemHtml(d.gem)}<div><div class="card-name">${d.name}</div><div class="card-th">Support · ใส่กับ ${fits.map((i) => skillDisplayName(i)).join(', ') || '—'}</div></div></div>
      ${star}<div class="card-desc clamp">${d.desc}</div>${evoUseHtml(c.id)}</div>`;
  }
  if (c.type === 'passive') {
    const d = PASSIVES[c.id], r = P.passives[c.id] || 0;
    const to = Math.min(d.max, r + PASSIVE_RANKS);
    return `<div class="card card-passive">${key}
      <div class="card-head"><span class="node">${d.icon}</span><div><div class="card-name">${d.name}</div><div class="card-th">Passive · ระดับ ${r} → ${to}/${d.max}</div></div></div>
      ${star}<div class="card-desc">${to - r > 1 ? `×${to - r}: ` : ''}${d.desc}</div></div>`;
  }
  if (c.type === 'keystone') {
    const d = KEYSTONES[c.id];
    return `<div class="card card-keystone card-ms">${key}
      <div class="card-head"><span class="node node-key">${d.icon}</span><div><div class="card-name">${d.name}</div><div class="card-th">${d.th} · Keystone</div></div><div class="badge badge-key">KEYSTONE</div></div>
      <div class="card-desc">${d.desc}</div><div class="card-note">Keystone ${Object.keys(P.keystones).length + 1}/${MAX_KEYSTONES} ของรอบนี้ — เลือกให้ดี!</div></div>`;
  }
  return `<div class="card card-passive">${key}<div class="card-head"><span class="node">❤</span><div><div class="card-name">Life Potion</div><div class="card-th">ฟื้นฟู</div></div></div><div class="card-desc">ฟื้นชีวิต 50%</div></div>`;
}

// does this support complete an evolution recipe for an owned skill?
function evoUseHtml(supId) {
  const hits = G.player.skills.filter((i) => !i.evo && EVOLUTIONS[i.id] && EVOLUTIONS[i.id].req.includes(supId));
  return hits.length ? `<div class="card-note evo-hint">✦ ใช้วิวัฒน์ ${hits.map((i) => SKILLS[i.id].name).join(', ')} ได้</div>` : '';
}

function choiceCount(isChest) { return (isChest ? 4 : 3) + G.player.mods.extraChoices; }
const newSkillLevel = () => Math.min(10, 1 + Math.floor(G.player.level / 5));
// a rare monster's chest: a small reward right away, no pause
function openChestInstant(x, y) {
  const P = G.player, r = Math.random(), ok = P.skills.filter((s) => s.level < MAX_GEM_LEVEL);
  let txt, col = '#ffcf4a';
  if (r < 0.45 && ok.length) { const s = pick(ok); s.level++; recomputePlayer(); txt = `${skillDisplayName(s)} +1 เลเวล`; }
  else if (r < 0.7) { const k = randomCraftOrb(); P.currency[k] = (P.currency[k] || 0) + 1; txt = CRAFT_ORBS[k].name; col = CRAFT_ORBS[k].color; }
  else if (r < 0.85) { P.currency.chaos += 2; txt = 'Chaos Orb ×2'; col = PICKUPS.chaos.color; }
  else { const k = randomJeweller(); P.currency[k] = (P.currency[k] || 0) + 1; txt = JEWELLERS[k].name; col = JEWELLERS[k].color; }
  addText(x, y - 34, '▣ ' + txt, col, 1.15);
  lootLog('หีบ: ' + txt, col);
}
function setLevelupButtons(on) {
  $('btn-reroll').style.display = on ? '' : 'none';
  $('btn-skip').style.display = on ? '' : 'none';
}
function openLevelUp(isChest) {
  G.state = 'levelup';
  G.levelIsChest = isChest;
  G.choiceKind = isChest ? 'chest' : 'level';
  setLevelupButtons(true);
  const lv = G.player.level - G.pendingLevels + 1;
  G.milestone = !isChest && isMilestone(lv);
  G.choices = generateChoices(choiceCount(isChest), G.milestone);
  $('levelup').classList.toggle('ms', G.milestone);
  if (G.choices.some((c) => c.type === 'evolve')) showTip('evolve');
  else if (G.choices.some((c) => c.type === 'keystone')) showTip('keystone');
  else if (G.choices.some((c) => c.type === 'support')) showTip('support');
  else showTip('levelup');
  $('levelup-title').textContent = isChest ? 'หีบสมบัติของบอส!' : G.milestone ? `★ MILESTONE — เลเวล ${lv} ★` : 'LEVEL UP!';
  $('levelup-sub').textContent = isChest ? 'เลือกของ 1 อย่าง' : G.milestone ? 'การ์ดพิเศษทุก 10 เลเวล — Keystone, Awaken, Empower · อ่านให้ดี!'
    : `เลเวล ${lv} — เลือก 1 อย่าง${G.pendingLevels > 1 ? ` (เหลืออีก ${G.pendingLevels - 1})` : ''} · ★ = เข้ากับบิลด์`;
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
  G.choices = generateChoices(choiceCount(G.levelIsChest), G.milestone);
  renderCards();
}

// Ascendancy: the first trial picks the subclass, later ones unlock a node
function openAscend() {
  const P = G.player;
  G.state = 'levelup';
  G.choiceKind = 'asc';
  G.levelIsChest = false; G.milestone = false;
  $('levelup').classList.remove('ms');
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
  showTip('ascend');
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
  if (n.instant === 'jeweller3x2') P.currency.jeweller3 += 2;
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
  if (c.type === 'skill') { const inst = newSkillInstance(c.id); inst.level = newSkillLevel(); P.skills.push(inst); recomputePlayer(); finishChoice(); }
  else if (c.type === 'level') { c.inst.level = Math.min(MAX_GEM_LEVEL, c.inst.level + GEM_LEVELS); recomputePlayer(); finishChoice(); }
  else if (c.type === 'empower') { c.inst.level = Math.min(MAX_GEM_LEVEL, c.inst.level + 3); recomputePlayer(); finishChoice(); }
  else if (c.type === 'passive') { P.passives[c.id] = Math.min(PASSIVES[c.id].max, (P.passives[c.id] || 0) + PASSIVE_RANKS); recomputePlayer(); finishChoice(); }
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
  else { P.life = Math.min(P.maxLife, P.life + P.maxLife * 0.5); finishChoice(); }
}

function finishChoice() {
  hide('levelup'); hide('socket');
  if (G.choiceKind === 'asc') G.pendingAscend--;
  else if (G.levelIsChest) G.pendingChests--; else G.pendingLevels--;
  G.state = 'play';
  resetGameClock();
}

// ---------------- Socket picker ----------------
function supportReplacementReason(supId, inst, index) {
  if (inst.supports.includes(supId)) return 'ใส่ไว้แล้ว';
  if (!Number.isInteger(index) || index < 0 || index >= inst.supports.length) return 'ไม่พบเจมที่จะแทนที่';
  if (index >= skillSockets(inst).cap) return 'ต้องเพิ่มช่องก่อนแทนที่เจมที่ยังไม่มีช่อง';
  if (inst.supports.length > MAX_SOCKETS) return 'เกินเพดาน 6 Support';
  const trial = { ...inst, supports: inst.supports.filter((_, i) => i !== index) };
  const reason = supportBlockReason(supId, trial, true);
  if (reason) return reason;
  const next = { ...inst, supports: inst.supports.map((sid, i) => i === index ? supId : sid) };
  return activeSupports(next).active.includes(supId) ? '' : 'Support ใหม่ยังทำงานไม่ได้กับเจมที่เหลือ';
}
function canSocketSupport(supId, inst) {
  return !supportBlockReason(supId, inst) || inst.supports.some((_, i) => !supportReplacementReason(supId, inst, i));
}
function skillSocketLabel(inst) {
  const a = activeSupports(inst), so = a.so;
  return `Support ${a.active.length}/${so.cap} ช่อง · สูงสุด ${MAX_SOCKETS} · ไม่จำกัดสี`;
}
// Support choices fill existing skill slots; Jewellers upgrade slots in the inventory.
function openSocketPicker(mode, supId) {
  if (mode !== 'support' || !SUPPORTS[supId]) return false;
  const P = G.player;
  G.socketCtx = { mode, supId };
  hide('levelup');
  const list = $('socket-list');
  list.innerHTML = '';
  const support = SUPPORTS[supId];
  $('socket-title').innerHTML = `${supportGemHtml(support.gem, true)} ${support.name}`;
  $('socket-sub').textContent = 'ทุกสกิลเริ่ม 2 ช่อง · ไม่จำกัดสี · เพิ่มได้ถึง 6 ช่องด้วย Jeweller ที่ I → ช่อง Support · เต็มแล้วคลิกเจมเดิมเพื่อแทนที่';
  for (const inst of P.skills) {
    const d = SKILLS[inst.id];
    const row = document.createElement('div');
    row.className = 'socket-row';
    let status = '', ok = false, replace = false;
    const act = activeSupports(inst), r = supportBlockReason(supId, inst);
    ok = !r;
    replace = !ok && inst.supports.some((_, i) => !supportReplacementReason(supId, inst, i));
    status = ok ? '<span class="ok">ใส่ได้</span>' : replace ? '<span class="warn">คลิกเจมที่มีกรอบเพื่อแทนที่</span>' : `<span class="bad">${r}</span>`;
    row.innerHTML = `${skillGemHtml(d.id, false, inst.evo)}<div class="socket-info"><div class="card-name">${skillDisplayName(inst)} <small>Lv ${inst.level}</small></div>
      <div class="sup-chips">${inst.supports.map((s, i) => `<span class="chip chip-${SUPPORTS[s].gem}${inst.awakened.includes(s) ? ' chip-awk' : ''}${act.inactive.includes(s) ? ' chip-off' : ''}${replace && !supportReplacementReason(supId, inst, i) ? ' chip-rep' : ''}" data-i="${i}" title="${act.reasons[s] || 'ทำงาน'}">${supportDisplayName(inst, s)}</span>`).join('') || '<span class="muted">ยังไม่มี Support</span>'}</div>
      <div>${socketsHtml(inst)} ${status}</div><small>${skillSocketLabel(inst)}</small></div>`;
    if (!ok && !replace) row.classList.add('disabled');
    if (ok) row.onclick = () => applySocket(inst);
    if (replace) {
      row.classList.add('replace');
      row.querySelectorAll('.chip-rep').forEach((ch) => {
        ch.onclick = (ev) => {
          ev.stopPropagation();
          applySocket(inst, +ch.dataset.i);
        };
      });
    }
    list.appendChild(row);
  }
  show('socket');
  G.state = 'socket';
  return true;
}
function applySocket(inst, replaceIndex) {
  const ctx = G.socketCtx, P = G.player;
  if (!ctx || ctx.mode !== 'support' || G.state !== 'socket' || !P.skills.includes(inst)) return false;
  const replacing = replaceIndex !== undefined;
  const reason = replacing ? supportReplacementReason(ctx.supId, inst, replaceIndex) : supportBlockReason(ctx.supId, inst);
  if (reason) { $('socket-sub').textContent = reason; return false; }
  if (replacing) {
    const old = inst.supports.splice(replaceIndex, 1, ctx.supId)[0];
    inst.awakened = inst.awakened.filter((a) => a !== old);
  } else inst.supports.push(ctx.supId);
  G.socketCtx = null;
  recomputePlayer();
  finishChoice();
  return true;
}
function socketBack() {
  hide('socket');
  G.socketCtx = null;
  G.state = 'levelup';
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
      <div>${socketsHtml(inst)} <span class="muted">${skillSocketLabel(inst)}</span></div>
      ${!final ? `<small class="muted">Jeweller · เพิ่มช่อง Support</small><div class="inv-actions jeweller-actions">${jewellerButtonsHtml(inst)}</div>` : ''}
      <div class="sup-chips">${inst.supports.map((sid) => `<span class="chip chip-${SUPPORTS[sid].gem}${inst.awakened.includes(sid) ? ' chip-awk' : ''}${activeSupports(inst).inactive.includes(sid) ? ' chip-off' : ''}" title="${SUPPORTS[sid].desc}">${supportDisplayName(inst, sid)}</span>`).join('') || '<span class="muted">ไม่มี Support</span>'}</div>
      <div class="bv-stats">${describeStats(s).join(' · ')}</div>
      ${inst.evo ? `<div class="bv-vaal">Vaal: วิญญาณ ${inst.souls}/${vaalSouls()}${inst.souls >= vaalSouls() ? ' — <b>พร้อม! กด V</b>' : ''}</div>` : evolveHintHtml(inst.id)}
      <div class="bv-dmg"><div class="bar"><div style="width:${(inst.dmgDealt / total) * 100}%"></div></div>ดาเมจรวม ${fmtNum(inst.dmgDealt)} (${Math.round((inst.dmgDealt / total) * 100)}%) · ฆ่า ${inst.kills} · <b>DPS ${fmtNum(skillDps(inst))}</b> <span class="muted">(10 วิล่าสุด) · Hit เฉลี่ยรวมคริ ${fmtNum(avgHit(s))}</span></div>
    </div>`;
  }
  h += '</div><div class="bv-side">';
  h += `<div class="bv-box"><div class="bv-title">ตัวละคร — ${P.cls.name}</div>
    ❤ ชีวิต ${Math.ceil(P.life)}/${Math.round(P.maxLife)}<br>
    ➹ ความเร็ว ${Math.round(P.moveSpeed)}<br>
    ✚ ฟื้นฟู ${(m.regen * 100).toFixed(1)}%/วิ${m.ks.vaalPact ? ' (ปิดโดย Vaal Pact)' : ''}<br>
    ⛨ Armour ${Math.round(P.armour)} · Evasion ${Math.round(P.evasion)} (หลบ ${pct(evadeChance(P))})<br>
    ◇ Energy Shield ${Math.round(P.maxES)}${P.block ? ' · Block ' + pct(P.block) : ''} · รับดาเมจ ×${m.dmgTaken.toFixed(2)}<br>
    ☯ ต้านทาน: ${resLineHtml(P)}${G.map.tier > 1 ? ` <span class="muted">(Tier ${G.map.tier}: -${Math.round(resPenalty(G.map.tier) * 100)}%)</span>` : ''}<br>
    <span class="muted">Hit ใหญ่สุดที่รับได้: ${maxHitHtml(P)}</span><br>
    ⚔ อาวุธ: ${P.weapon ? WEAPON_TYPE[P.weapon.wtype] + ' ×' + weaponPower(P.weapon).toFixed(2) + ' (สกิล Attack)' : 'มือเปล่า ×0.60'}<br>
    ✪ Chaos ${P.currency.chaos} · ⬡ Jeweller ${Object.keys(JEWELLERS).reduce((n, k) => n + (P.currency[k] || 0), 0)}${m.ks.rage ? '<br>✊ Rage ' + Math.floor(P.rage) + '/30' : ''}</div>`;
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
  } else if (!final) h += '<div class="bv-box"><div class="bv-title">Ascendancy</div><span class="muted">โค่นบอสตัวแรก (3:45) เพื่อเลือกคลาสย่อย</span></div>';
  const ks = Object.keys(P.keystones);
  if (ks.length) h += '<div class="bv-box bv-key"><div class="bv-title">Keystone</div>' + ks.map((id) => `<b>${KEYSTONES[id].name}</b><br><span class="muted">${KEYSTONES[id].desc}</span>`).join('<br>') + '</div>';
  h += '</div>';
  return h;
}

// ---- character sheet helpers (PoB-style numbers) ----
const RES_KEYS = [['fire', 'ไฟ'], ['cold', 'น้ำแข็ง'], ['lightning', 'สายฟ้า'], ['chaos', 'เคออส']];
function resLineHtml(P) {
  return RES_KEYS.map(([t, n]) => {
    if (t === 'chaos' && P.mods.ks.ci) return `<span style="color:${ELEM_COLOR[t]}">${n} อมตะ</span>`;
    const v = effRes(P, t), raw = P.resRaw[t] + ((P.flaskFx.res && P.flaskFx.res[t]) || 0), over = raw - P.resCap[t];
    return `<span style="color:${ELEM_COLOR[t]}" title="ค่าดิบ ${Math.round(raw * 100)}% · สูงสุด ${Math.round(P.resCap[t] * 100)}%">${n} <b class="${v < 0 ? 'bad' : ''}">${Math.round(v * 100)}%</b>${over > 0 ? `<small class="muted">(+${Math.round(over * 100)})</small>` : ''}</span>`;
  }).join(' · ');
}
function maxHitHtml(P) {
  const pool = P.maxLife + P.maxES, dt = P.mods.dmgTaken;
  return [['physical', 'กายภาพ']].concat(RES_KEYS).map(([t, n]) => {
    if (t === 'chaos' && P.mods.ks.ci) return `${n} ∞`;
    const k = t === 'physical' ? 1 : 1 - effRes(P, t);
    return `<span style="color:${ELEM_COLOR[t]}">${n} ${fmtNum(pool / Math.max(0.01, dt * k))}</span>`;
  }).join(' · ');
}
// measured DPS: damage dealt over the last 10 one-second samples
function skillDps(inst) { const h = inst.rt.dh; return h && h.length > 1 ? (h[h.length - 1] - h[0]) / (h.length - 1) : 0; }
const avgHit = (s) => s.hitTotal * (1 + s.critChance * (s.critMulti - 1));

// what killed you: the last few seconds of damage, by source and element
function deathRecapHtml() {
  const P = G.player, L = (G.dmgLog || []).filter((h) => h.t > G.time - 6);
  if (!L.length) return '';
  const bySrc = {}, byEl = {}; let tot = 0, avoided = 0;
  for (const h of L) {
    if (h.how !== 'hit') { if (h.how !== 'immune') avoided++; continue; }
    const k = h.src || '?';
    (bySrc[k] = bySrc[k] || { n: 0, d: 0, el: h.elem }).n++; bySrc[k].d += h.taken;
    byEl[h.elem] = (byEl[h.elem] || 0) + h.taken; tot += h.taken;
  }
  const rows = Object.entries(bySrc).sort((a, b) => b[1].d - a[1].d).slice(0, 5)
    .map(([k, v]) => `<div>${k} <span style="color:${ELEM_COLOR[v.el]}">(${ELEM_TH[v.el]})</span> ×${v.n} — <b>${fmtNum(v.d)}</b></div>`).join('');
  const els = Object.entries(byEl).sort((a, b) => b[1] - a[1]);
  const bar = els.map(([e, d]) => `<span style="width:${(d / tot) * 100}%;background:${ELEM_COLOR[e]}" title="${ELEM_TH[e]} ${Math.round((d / tot) * 100)}%"></span>`).join('');
  let tip = '';
  if (els.length) {
    const [top, d] = els[0], share = d / tot;
    if (top !== 'physical' && share > 0.4) {
      const r = effRes(P, top);
      tip = `ดาเมจ${ELEM_TH[top]} ${Math.round(share * 100)}% · ค่าต้านทาน${ELEM_TH[top]}ของคุณ ${Math.round(r * 100)}%` + (r < 0.5 ? ` → หาไอเทม/ฟลาสก์ที่มีต้านทาน${ELEM_TH[top]}` : '');
    } else if (top === 'physical' && share > 0.5) tip = `ดาเมจกายภาพ ${Math.round(share * 100)}% → เพิ่ม Armour / Evasion / Block หรือ Granite Flask`;
  }
  return `<div class="death-recap"><div class="bv-title">☠ สรุปก่อนตาย (6 วิสุดท้าย)</div>
    <div class="dr-bar">${bar}</div><div class="muted">รับดาเมจ ${fmtNum(tot)} · หลบ/Block ได้ ${avoided} ครั้ง</div>${rows}
    ${tip ? `<div class="dr-tip">💡 ${tip}</div>` : ''}</div>`;
}

function openPause() {
  if (G.state !== 'play' && G.state !== 'paused') return;
  G.state = 'paused';
  $('pause-title').textContent = 'หยุดเกม — บิวของคุณ';
  $('build-view').innerHTML = buildViewHtml(false);
  bindJewellerButtons($('build-view'), openPause);
  show('pause');
}
function resume() {
  if (G.state !== 'paused') return;
  hide('pause');
  G.state = 'play';
  resetGameClock();
}

function showGameOver(win) {
  G.state = 'over';
  const P = G.player;
  const endT = G.endless ? G.time - G.endStart : 0;
  $('over-title').textContent = G.endless ? `Endgame จบแล้ว — รอดเพิ่ม ${fmtTime(endT)} · Echo ${G.stats.echoes || 0}` : win ? 'ชัยชนะ! คุณรอดจากดินแดนต้องสาป' : 'คุณตายแล้ว';
  $('over-title').className = 'panel-title ' + (win ? 'win' : 'dead');
  const rec = { time: G.time, level: P.level, kills: G.stats.kills, cls: P.asc ? ASCENDANCY[P.asc].name : P.cls.name, win };
  if (!G.daily) saveBest(rec);
  const runR = { win, hc: G.hc, daily: G.daily };
  showTip('codex');
  let metaHtml = '';
  if (!G.settled) {
    G.settled = true;
    overPick = null;
    const jewels = P.backpack.filter((it) => it.slot === 'jewel');
    const res = settleRun(Object.assign({ bosses: G.stats.bosses, salvage: G.stats.salvage, map: G.map, pinnacle: !!G.stats.pinnacle,
      hc: G.hc, daily: G.daily, maps: G.runMaps, jewels, endless: endT, echoes: G.stats.echoes || 0 }, rec));
    metaHtml = `<div class="over-meta"><div class="over-shards">+${res.reward.total} ✦ Ancient Shards</div>
      <div class="muted">${res.reward.parts.filter((p) => p[1] !== 0).map((p) => `${p[0]} ${p[1] > 0 ? '+' : ''}${p[1]}`).concat(`รวมมี ${Meta.shards} ✦`).join(' · ')}</div>
      ${res.maps || res.jewels ? `<div class="over-unlock">🗺 ได้แผนที่ ${res.maps} ใบ${res.jewels ? ` · ⬡ Jewel ${res.jewels} ชิ้นเข้า Stash` : ''}</div>` : ''}
      ${G.daily && Meta.daily ? `<div class="over-unlock">📅 Daily: ${Meta.daily.newBest ? 'สถิติใหม่ของวันนี้!' : `ดีที่สุดวันนี้ ${fmtTime(Math.min(Meta.daily.best, RUN_LENGTH))}`}</div>` : ''}
      ${res.atlas ? `<div class="over-unlock">🗺 ผ่านแผนที่ ${mapLabel(G.map)}${res.atlas.first ? ' ครั้งแรก! (+1 แต้ม Legacy Tree)' : ''}${res.atlas.tierUp ? ` · ปลดล็อก Tier ${res.atlas.maxTier}` : ''}</div>` : ''}
      ${res.newly.map((u) => `<div class="over-unlock">🔓 ปลดล็อก${u.kind === 'class' ? 'คลาส' : 'เจม'}: <b>${unlockLabel(u)}</b></div>`).join('')}</div>`;
  }
  $('over-stats').innerHTML = `<div class="over-summary">
      ⏱ รอด <b>${fmtTime(G.time)}</b> · Lv <b>${P.level}</b> · ☠ ฆ่า <b>${G.stats.kills}</b> · บอส <b>${G.stats.bosses}</b> · ดาเมจรวม <b>${fmtNum(G.stats.dmg)}</b>
      ${!win && P.killedBy ? `<br><span class="muted">ถูกฆ่าโดย: ${P.killedBy}</span>` : ''}</div>` + (P.dead ? deathRecapHtml() : '') + metaHtml + buildViewHtml(true);
  renderOverStash(runR);
  show('gameover');
  if (!G.daily && !G.hc) showTip('stash');
}

// ---------------- Altar of Legacy: the Legacy Tree ----------------
const TREE_KIND = { start: 'จุดเริ่มต้น', small: 'โหนดเล็ก', notable: 'Notable', keystone: 'Keystone', jewel: 'Jewel Socket' };
const TREE_R = { start: 20, small: 11, notable: 18, keystone: 25, jewel: 14 };
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
    const jw = n.kind === 'jewel' && Meta.jewels[id] && treeAllocated(id) ? BASES[Meta.jewels[id].base].jewel : '';
    nodes += `<g class="tn tn-${n.kind} ${st}${jw ? ' jw-' + jw : ''}${altarSel === id ? ' sel' : ''}" data-id="${id}" style="--c:${n.color}" transform="translate(${n.x.toFixed(1)},${n.y.toFixed(1)})">
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
    <div class="tree-desc${n.kind === 'keystone' ? ' ks' : ''}">${n.desc}</div><div>${action}</div>${n.kind === 'jewel' ? jewelSocketInfoHtml(id) : ''}`;
  const b = $('tree-act');
  if (b) b.onclick = () => treeAct(id);
  if (n.kind === 'jewel') bindJewelSocket(id);
}

function renderTreeSummary() {
  const M = loadMeta(), keys = [], nots = [], smalls = {};
  for (const id in M.alloc) {
    const n = TREE_NODES[id];
    if (n.kind === 'keystone') keys.push(n); else if (n.kind === 'notable') nots.push(n);
    else if (n.kind === 'jewel') { if (M.jewels[id]) for (const a of M.jewels[id].affixes) { const t = '⬡ ' + affixText(a); smalls[t] = (smalls[t] || 0) + 1; } }
    else smalls[n.desc] = (smalls[n.desc] || 0) + 1;
  }
  let h = '<div class="bv-title">โบนัสที่ได้รับ</div>';
  if (!keys.length && !nots.length && !Object.keys(smalls).length) h += '<span class="muted">ยังไม่ได้จัดสรรโหนด</span>';
  h += keys.map((n) => `<div class="ts-key" style="color:${n.color}">◆ ${n.name}<br><span>${n.desc}</span></div>`).join('');
  h += nots.map((n) => `<div class="ts-not"><b style="color:${n.color}">${n.name}</b> — ${n.desc}</div>`).join('');
  h += Object.entries(smalls).map(([d, c]) => `<div class="ts-small">${d}${c > 1 ? ` <b>×${c}</b>` : ''}</div>`).join('');
  $('tree-summary').innerHTML = h;
}
function closeAltar() { hide('altar'); buildMenu(); show('menu'); }

// ---------------- Inventory: paper doll, grid backpack, PoE-style tooltips ----------------
let invSel = null, invDrag = null, invMsg = '';
const invCell = () => (window.innerWidth < 700 ? 26 : 34);
const DOLL_LAYOUT = ['weapon', 'helm', 'amulet', 'offhand', 'ring', 'body', 'ring2', 'gloves', 'belt', 'boots'];
const CURRENCY_ORDER = ['chaos', ...Object.keys(JEWELLERS), 'regal', 'exalt', 'divine', 'annul', 'whetstone', 'scrap', 'vaal'];
function itemIconURL(it) { return spriteURL(itemSpriteId(it), 3); }

const tierTag = (a) => (a.crafted ? ' <span class="pt-tier">(crafted)</span>' : G.showTiers && !a.flask && !a.jewel && AFFIXES[a.id].type ? ` <span class="pt-tier">${AFFIXES[a.id].type === 'P' ? 'Prefix' : 'Suffix'} T${a.tier}</span>` : '');

// Item box: header, properties, item level, implicit and mods.
function itemCardHtml(it, label) {
  const u = it.unique && UNIQUES[it.unique], baseId = it.base || (u && u.base), base = BASES[baseId];
  const view = Object.assign({ ilvl: 60, affixes: [], quality: 0 }, it, { base: baseId });
  const col = RARITY_COLOR[it.rarity], two = it.rarity === 'rare' || it.rarity === 'unique';
  let h = `<div class="poe-tip r-${it.rarity}">${label ? `<div class="pt-label">${label}</div>` : ''}
    <div class="pt-head" style="color:${col}">${it.name}${two ? `<br>${base.name}` : ''}</div><div class="pt-body">`;
  const props = [];
  if (base.flask) {
    const st = flaskStats(view);
    props.push('ฟลาสก์', `ใช้ ${st.use} จาก ${st.max} ชาร์จ · นาน ${st.dur.toFixed(1)} วิ`, `<span class="pt-val">${FLASK_DESC[st.kind]}</span>`);
  } else {
    const pr = itemProps(view);
    if (base.w) {
      props.push(`${WEAPON_TYPE[base.w.type]} (${base.w.hands === 2 ? 'สองมือ' : 'มือเดียว'})`,
        `ดาเมจกายภาพ: <span class="pt-val">${Math.round(pr.pd * 0.8)}–${Math.round(pr.pd * 1.2)}</span>`,
        `โอกาสคริ: <span class="pt-val">${pr.crit.toFixed(1)}%</span> · โจมตี/วิ: <span class="pt-val">${pr.aps.toFixed(2)}</span>`,
        `พลังอาวุธ (สกิล Attack): <span class="pt-val">×${weaponPower(pr).toFixed(2)}</span>`);
    } else props.push(base.quiver ? 'Quiver (ใช้กับธนู)' : SLOT_NAME[it.slot]);
    if (pr.ar) props.push(`Armour: <span class="pt-val">${pr.ar}</span>`);
    if (pr.ev) props.push(`Evasion: <span class="pt-val">${pr.ev}</span>`);
    if (pr.es) props.push(`Energy Shield: <span class="pt-val">${pr.es}</span>`);
    if (pr.block) props.push(`โอกาส Block: <span class="pt-val">${pr.block}%</span>`);
  }
  if (it.quality) props.push(`Quality: <span class="pt-val">+${it.quality}%</span>`);
  h += props.map((p) => `<div class="pt-prop">${p}</div>`).join('');
  if (it.ilvl) h += `<div class="pt-sep"></div><div class="pt-prop">Item Level: <span class="pt-val">${it.ilvl}</span></div>`;
  if (it.implicit) h += `<div class="pt-sep"></div><div class="pt-imp">${affixText(it.implicit)}</div>`;
  if (it.corruptMod !== undefined) h += `<div class="pt-corrupt-imp">${CORRUPT_MODS[it.corruptMod].t}</div>`;
  const lines = u ? u.lines.map((l) => ({ t: l })) : it.affixes.map((a) => ({ t: affixText(a), a }));
  if (lines.length) h += '<div class="pt-sep"></div>' + lines.map((l) => `<div class="pt-mod${l.a && l.a.crafted ? ' pt-crafted' : ''}">${l.t}${l.a ? tierTag(l.a) : ''}</div>`).join('');
  if (it.slot === 'jewel') h += '<div class="pt-flavor">ใส่ใน Jewel Socket ของ Legacy Tree</div>';
  if (u) h += `<div class="pt-flavor">"${u.flavor}"</div>`;
  if (it.corrupted) h += '<div class="pt-corrupted">Corrupted</div>';
  return h + '</div></div>';
}

function openInventory() {
  if (G.state !== 'play' && G.state !== 'paused' && G.state !== 'inventory') return;
  hide('tip');
  hide('pause');
  G.state = 'inventory';
  const P = G.player, cell = invCell();
  P.newItems = 0;
  // compare every bag item with what's worn (▲ / ▼ / ●)
  compareReset();
  invCmp = new Map();
  for (const it of P.backpack) invCmp.set(it, compareItem(it));
  // paper doll
  $('inv-doll').innerHTML = DOLL_LAYOUT.map((k) => {
    const it = P.equip[k];
    const lock = k === 'offhand' && !it && P.equip.weapon && BASES[P.equip.weapon.base].w.hands === 2 && BASES[P.equip.weapon.base].w.type !== 'bow';
    const better = !it && P.backpack.some((b) => { const c = invCmp.get(b); return c && c.key === k && c.empty; });
    return `<div class="doll-slot ds-${k}${it ? ' r-' + it.rarity : ''}${invSel && invSel === it ? ' sel' : ''}${lock ? ' locked' : ''}${better ? ' can-fill' : ''}" data-eq="${k}">
      ${it ? `<img src="${itemIconURL(it)}" alt="" draggable="false">` : `<span class="muted">${lock ? 'สองมือ' : SLOT_NAME[k]}</span>`}</div>`;
  }).join('');
  $('inv-flasks').innerHTML = P.flasks.map((f, i) => `<div class="flask-slot${f ? ' r-' + f.rarity : ''}${invSel && invSel === f ? ' sel' : ''}" data-fl="${i}">
    ${f ? `<img src="${itemIconURL(f)}" alt="" draggable="false">` : ''}<span class="fk">${i + 1}</span></div>`).join('');
  $('inv-quick').innerHTML = quickStatsHtml();
  // grid backpack
  const grid = $('inv-grid');
  grid.style.setProperty('--cell', cell + 'px');
  grid.style.width = GRID_W * cell + 'px'; grid.style.height = GRID_H * cell + 'px';
  grid.innerHTML = P.backpack.map((it, i) => {
    const [w, h] = itemSize(it), c = invCmp.get(it), v = c && c.verdict ? VERDICT[c.empty ? 'up' : c.verdict] : null;
    return `<div class="bag-item r-${it.rarity}${invSel === it ? ' sel' : ''}${v ? ' ' + v[2] : ''}" data-bi="${i}" title="${it.name}${v ? ' — ' + (c.empty ? 'ช่องว่าง' : v[1]) : ''}"
      style="left:${it.gx * cell}px;top:${it.gy * cell}px;width:${w * cell}px;height:${h * cell}px"><img src="${itemIconURL(it)}" alt="" draggable="false">
      ${v ? `<span class="vb ${v[2]}">${v[0]}</span>` : ''}${it.locked ? '<span class="lk">🔒</span>' : ''}</div>`;
  }).join('');
  $('inv-count').textContent = `(${P.backpack.length} ชิ้น)`;
  // salvage buttons: "worse than what I wear" and "everything" (both skip locked / Unique / Jewel)
  const worse = salvageList('worse'), all = salvageList('all'), sh = (l) => l.reduce((a, it) => a + (SALVAGE_SHARDS[it.rarity] || 0), 0);
  const bw = $('btn-inv-salv-worse'), ba = $('btn-inv-salv-all');
  bw.textContent = `♻ ย่อยของที่แย่กว่า (${worse.length} · +${sh(worse)} ✦)`; bw.disabled = !worse.length;
  ba.textContent = invConfirm === 'all' ? `ยืนยัน? ย่อย ${all.length} ชิ้น (+${sh(all)} ✦)` : `♻ ย่อยทั้งหมด (${all.length})`; ba.disabled = !all.length;
  ba.classList.toggle('btn-danger', invConfirm === 'all');
  bw.onclick = () => { salvageMany(worse); };
  ba.onclick = () => { if (invConfirm !== 'all') { invConfirm = 'all'; openInventory(); } else { invConfirm = ''; salvageMany(all); } };
  $('inv-currency').innerHTML = CURRENCY_ORDER.map((k) => {
    const d = CRAFT_ORBS[k] || PICKUPS[k];
    return `<span class="cur" style="color:${d.color}" title="${d.name}${d.th ? ': ' + d.th : ''}">${d.icon} ${JEWELLERS[k] ? 'J' + d.sockets + ' ×' : ''}${P.currency[k] || 0}</span>`;
  }).join('') + Object.keys(P.essences).filter((k) => P.essences[k] > 0).map((k) => `<span class="cur" style="color:${ESSENCES[k].color}" title="${ESSENCES[k].name}: การันตี ${AFFIXES[ESSENCES[k].mod].t.replace('{v}', '#')}">◆ ${P.essences[k]}</span>`).join('');
  $('inv-links').innerHTML = skillSocketsPanelHtml();
  $('inv-links-n').textContent = `(${P.skills.length} สกิล${P.skills.some((s) => activeSupports(s).inactive.length) ? ' · ⚠ มี Support ไม่ทำงาน' : ''})`;
  $('inv-msg').textContent = invMsg; invMsg = '';
  // drag sources + hover preview (mouse only)
  const root = $('inventory'), hover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  const bindHover = (el, it) => { if (hover && it) { el.onmouseenter = () => renderInvDetail(it); el.onmouseleave = () => renderInvDetail(); } };
  root.querySelectorAll('[data-bi]').forEach((el) => { const it = P.backpack[+el.dataset.bi]; el.onpointerdown = (ev) => invPointerDown(ev, { item: it, from: 'bag' }, el); bindHover(el, it); });
  root.querySelectorAll('[data-eq]').forEach((el) => { const it = P.equip[el.dataset.eq]; if (it) { el.onpointerdown = (ev) => invPointerDown(ev, { item: it, from: 'eq', key: el.dataset.eq }, el); bindHover(el, it); } });
  root.querySelectorAll('[data-fl]').forEach((el) => { const f = P.flasks[+el.dataset.fl]; if (f) { el.onpointerdown = (ev) => invPointerDown(ev, { item: f, from: 'fl', i: +el.dataset.fl }, el); bindHover(el, f); } });
  bindJewellerButtons(root, (inst, before) => {
    invMsg = skillDisplayName(inst) + ': ' + before + ' → ' + skillSockets(inst).cap + ' ช่อง Support';
    openInventory();
  });
  $('inv-tiers').checked = G.showTiers;
  $('inv-tiers').onchange = () => { G.showTiers = $('inv-tiers').checked; renderInvDetail(); };
  $('btn-inv-sort').onclick = () => { sortBag(); openInventory(); };
  renderInvDetail();
  show('inventory');
}

let invCmp = new Map(), invConfirm = '';
// bag items the salvage buttons would destroy
function salvageList(mode) {
  return G.player.backpack.filter((it) => {
    if (it.locked || it.unique || it.slot === 'jewel') return false;
    if (mode === 'all') return true;
    if (it.slot === 'flask') return it.rarity === 'normal';
    const c = invCmp.get(it);
    return !!(c && c.verdict === 'down' && !c.empty);
  });
}
function salvageMany(list) {
  if (!list.length) return;
  let got = 0;
  for (const it of list) { got += SALVAGE_SHARDS[it.rarity] || 0; salvageItem(it); }
  if (list.includes(invSel)) invSel = null;
  invMsg = ''; Sfx.play('pickup');
  openInventory();
  $('inv-msg').innerHTML = `<span class="ok">ย่อย ${list.length} ชิ้น · +${got} ✦</span>`;
}

// the character's key numbers at a glance (updates as gear changes)
function quickStatsHtml() {
  const P = G.player, s = statSnapshot(P.equip);
  const res = RES_KEYS.map(([t, n]) => {
    const v = s.res[t], txt = t === 'chaos' && P.mods.ks.ci ? '∞' : Math.round(v * 100) + '%';
    return `<span class="qs-res${v < 0 ? ' neg' : v >= 0.75 ? ' capped' : ''}" style="--c:${ELEM_COLOR[t]}" title="ต้านทาน${ELEM_TH[t]}">${n} ${txt}</span>`;
  }).join('');
  return `<div class="qs-row"><span>❤ <b>${Math.round(s.life)}</b></span>${s.es ? `<span>◇ <b>${Math.round(s.es)}</b> ES</span>` : ''}<span>⚔ <b>${fmtNum(s.dps)}</b> ดาเมจ/วิ</span></div>
    <div class="qs-row"><span>⛨ ${Math.round(s.armour)}</span><span>➶ หลบ ${pct(evadeChance(P))}</span>${s.block ? `<span>▣ Block ${pct(s.block)}</span>` : ''}<span>➹ ${Math.round(s.move)}</span></div>
    <div class="qs-row">${res}</div>`;
}

// ▲ / ▼ banner with the exact stat changes
function verdictHtml(it) {
  const c = invCmp.get(it);
  if (!c) return '';
  if (c.blocked) return `<div class="verdict v-side"><b>⛔ ${c.blocked}</b></div>`;
  const [ic, txt, cls] = VERDICT[c.empty ? 'up' : c.verdict];
  const head = c.empty ? `▲ ช่อง${SLOT_NAME[c.key]}ว่าง — สวมได้เลย` : `${ic} ${txt}`;
  return `<div class="verdict ${cls}"><b>${head}</b>${c.empty ? '' : ` <span class="muted">(เทียบกับ${SLOT_NAME[c.key]})</span>`}
    <div class="diff">${c.lines.map(([l, t, good]) => `<span class="${good ? 'pos' : 'neg'}">${l} ${t}</span>`).join('') || '<span class="muted">ไม่เปลี่ยนค่าหลัก</span>'}</div></div>`;
}

// Skill sockets and the Jewellers that upgrade them.
function jewellerButtonsHtml(inst) {
  const cap = skillSockets(inst).cap;
  return Object.entries(JEWELLERS).map(([id, d]) => {
    const reason = jewellerBlockReason(inst, id), n = G.player.currency[id] || 0;
    return '<button class="btn btn-small jeweller-btn" data-jeweller="' + id + '" data-skill="' + inst.uid +
      '" ' + (reason ? 'disabled' : '') + ' title="' + (reason || (cap + ' → ' + d.sockets + ' ช่อง · ใช้ 1 ลูก · ' + d.rarity)) +
      '" style="--oc:' + d.color + '">⬡ ' + d.sockets + ' ช่อง ×' + n + '</button>';
  }).join('');
}
function bindJewellerButtons(root, refresh) {
  root.querySelectorAll('[data-jeweller]').forEach((b) => {
    b.onclick = () => {
      const inst = G.player.skills.find((s) => s.uid === +b.dataset.skill), before = inst && skillSockets(inst).cap;
      if (!useSkillJeweller(inst, b.dataset.jeweller)) return;
      Sfx.play('currency'); emit('gold', G.player.x, G.player.y, 10, { color: JEWELLERS[b.dataset.jeweller].color });
      refresh(inst, before);
    };
  });
}
function skillSocketsPanelHtml() {
  const P = G.player;
  return P.skills.map((inst) => {
    const act = activeSupports(inst);
    return '<div class="link-row">' + skillGemHtml(inst.id, true, inst.evo) + '<div class="link-info"><b>' + skillDisplayName(inst) +
      '</b><div class="link-socks">' + socketsHtml(inst) + '</div><small>' + skillSocketLabel(inst) + '</small>' +
      '<div class="inv-actions jeweller-actions">' + jewellerButtonsHtml(inst) + '</div>' +
      '<div class="sup-chips">' + inst.supports.map(sid => '<span class="chip chip-' + SUPPORTS[sid].gem + (act.inactive.includes(sid) ? ' chip-off' : '') +
        '" title="' + (act.reasons[sid] || 'ทำงาน') + '">' + (act.inactive.includes(sid) ? 'พัก: ' : '✓ ') + supportDisplayName(inst, sid) + '</span>').join('') + '</div>' +
      (act.inactive.length ? '<div class="bad">เก็บเจมไว้แล้ว แต่ยังไม่ทำงาน: ' + [...new Set(act.inactive.map(s => act.reasons[s]))].join(' · ') + '</div>' : '') +
      '</div></div>';
  }).join('') || '<span class="muted">ยังไม่มีสกิล</span>';
}

// pv = an item under the mouse: preview only (no buttons), otherwise the selected item
function renderInvDetail(pv) {
  const P = G.player, it = pv || invSel, box = $('inv-detail');
  const w = it && whereIs(it);
  if (!w) {
    if (!pv) invSel = null;
    box.innerHTML = `<div class="muted inv-help"><b>วิธีใช้</b><br>• ชี้ / แตะไอเทมเพื่อดูรายละเอียด · <b>ลาก</b>ไปวางที่ตัวละคร ช่องฟลาสก์ หรือกระเป๋า<br>
      • <span class="v-up-t">▲ เขียว</span> = ดีกว่าที่สวมอยู่ · <span class="v-down-t">▼ แดง</span> = แย่กว่า · <span class="muted">● เทา</span> = ใกล้เคียง (คิดจาก DPS, ชีวิต, ES, ค่าต้านทาน, ป้องกัน)<br>
      • ปุ่ม ♻ ด้านล่างย่อยของหลายชิ้นในครั้งเดียว (ไม่ย่อย Unique, Jewel และของที่ล็อก 🔒)</div>`;
    return;
  }
  let h = verdictHtml(it);
  h += itemCardHtml(it, w.equip ? 'สวมใส่อยู่' : w.flask !== undefined ? `ฟลาสก์ช่อง ${w.flask + 1}` : 'ในกระเป๋า');
  if (pv) { box.innerHTML = h; return; }
  h += '<div class="inv-actions">';
  if (it.slot === 'jewel') h += '<span class="muted">Jewel: เก็บเข้า Stash อัตโนมัติเมื่อจบรอบ แล้วใส่ที่ Legacy Tree</span>';
  else if (w.bag) h += it.slot === 'flask' ? '<button class="btn btn-small" data-act="flask">ใส่ช่องฟลาสก์</button>' : '<button class="btn btn-small" data-act="equip">สวมใส่</button>';
  else h += '<button class="btn btn-small" data-act="unequip">ถอดเก็บ</button>';
  if (w.bag) h += `<button class="btn btn-small btn-dim" data-act="lock">${it.locked ? '🔓 ปลดล็อก' : '🔒 ล็อก'}</button>`;
  h += `<button class="btn btn-small btn-dim" data-act="salvage">ย่อย (+${SALVAGE_SHARDS[it.rarity] || 0} ✦)</button></div>`;
  // crafting: orbs, essences and the bench, folded away until needed
  const orbs = Object.entries(CRAFT).filter(([, c]) => c.can(it)), ess = Object.keys(P.essences).filter((k) => P.essences[k] > 0 && essenceCan(k, it));
  const bench = BENCH.filter((b) => benchCan(b, it)), crafted = it.affixes && it.affixes.some((a) => a.crafted);
  const usable = orbs.filter(([k]) => P.currency[k] > 0).length + ess.length + bench.filter((b) => benchAfford(b, P.currency)).length;
  if (orbs.length || ess.length || bench.length || crafted) {
    h += `<details class="craft-box"${G.craftOpen ? ' open' : ''}><summary>🔨 คราฟต์ไอเทมนี้ <span class="muted">(ใช้ได้ตอนนี้ ${usable} อย่าง)</span></summary>`;
    h += '<div class="inv-actions craft-row">' + orbs.map(([k]) => {
      const n = P.currency[k] || 0;
      return `<button class="btn btn-small craft-btn" data-craft="${k}" ${n > 0 ? '' : 'disabled'} title="${CRAFT_ORBS[k].name}: ${CRAFT_ORBS[k].th}" style="--oc:${CRAFT_ORBS[k].color}">${CRAFT_ORBS[k].icon} ${CRAFT_ORBS[k].name.replace('Orb of ', '').replace(' Orb', '').replace("'s", '')} ×${n}</button>`;
    }).join('') + ess.map((k) =>
      `<button class="btn btn-small craft-btn" data-ess="${k}" style="--oc:${ESSENCES[k].color}" title="${ESSENCES[k].name}: สร้าง Rare ใหม่ การันตี ${AFFIXES[ESSENCES[k].mod].t.replace('{v}', '#')} (Tier 3+)">◆ ${ESSENCES[k].name.replace('Essence of ', '')} ×${P.essences[k]}</button>`).join('') + '</div>';
    if (bench.length || crafted) {
      h += '<div class="muted bench-h">Crafting Bench — เพิ่ม mod ได้ 1 อันต่อไอเทม</div><div class="inv-actions craft-row">' +
        bench.map((b) => `<button class="btn btn-small" data-bench="${BENCH.indexOf(b)}" ${benchAfford(b, P.currency) ? '' : 'disabled'}>${AFFIXES[b.id].t.replace('{v}', b.v)} — ${Object.entries(b.cost).map(([k, n]) => `${CRAFT_ORBS[k].icon}×${n}`).join(' ')}</button>`).join('') +
        (crafted ? '<button class="btn btn-small btn-dim" data-bench="rm">ลบ mod ที่คราฟต์ (ฟรี)</button>' : '') + '</div>';
    }
    h += '</details>';
  }
  // the item(s) worn in that slot, folded
  if (w.bag && it.slot !== 'flask' && it.slot !== 'jewel') {
    const keys = (it.slot === 'ring' ? ['ring', 'ring2'] : [it.slot]).filter((k) => P.equip[k]);
    if (keys.length) h += `<details class="cmp-eq"><summary>ดูไอเทมที่สวมอยู่ (${keys.map((k) => SLOT_NAME[k]).join(', ')})</summary>${keys.map((k) => itemCardHtml(P.equip[k], 'สวมอยู่: ' + SLOT_NAME[k])).join('')}</details>`;
  }
  box.innerHTML = h;
  box.querySelectorAll('[data-act]').forEach((b) => {
    b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'equip') invMsg = equipItem(it) || '';
      else if (a === 'flask') invMsg = equipFlask(it) || '';
      else if (a === 'unequip') { const ok = w.equip ? unequipItem(w.equip) : unequipFlask(w.flask); if (!ok) invMsg = 'กระเป๋าเต็ม'; }
      else if (a === 'lock') { it.locked = !it.locked; openInventory(); return; }
      else if (a === 'salvage') { salvageItem(it); invSel = null; Sfx.play('pickup'); }
      Sfx.play('flask'); openInventory();
    };
  });
  const cb = box.querySelector('details.craft-box');
  if (cb) cb.ontoggle = () => { G.craftOpen = cb.open; };
  box.querySelectorAll('[data-ess]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.ess;
      if (!(P.essences[k] > 0) || !essenceCan(k, it)) return;
      P.essences[k]--; essenceUse(k, it);
      if (w.equip) recomputePlayer();
      Sfx.play('currency'); emit('gold', P.x, P.y, 10, { color: ESSENCES[k].color });
      openInventory();
    };
  });
  box.querySelectorAll('[data-bench]').forEach((b) => {
    b.onclick = () => {
      if (b.dataset.bench === 'rm') it.affixes = it.affixes.filter((a) => !a.crafted);
      else { const B = BENCH[+b.dataset.bench]; if (!benchCan(B, it) || !benchAfford(B, P.currency)) return; benchUse(B, it, P.currency); }
      if (w.equip) recomputePlayer();
      Sfx.play('currency'); openInventory();
    };
  });
  box.querySelectorAll('[data-craft]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.craft;
      if (!(P.currency[k] > 0) || !CRAFT[k].can(it)) return;
      P.currency[k]--;
      const res = CRAFT[k].use(it);
      if (k === 'vaal') invMsg = 'Vaal Orb: ' + res;
      if (w.equip) recomputePlayer();
      Sfx.play(k === 'vaal' ? 'boss' : 'currency'); emit('gold', P.x, P.y, 10, { color: CRAFT_ORBS[k].color });
      openInventory();
    };
  });
}

// ---- drag & drop (mouse and touch via pointer events) ----
function invPointerDown(ev, src, el) {
  if (ev.button > 0) return;
  const r = el.getBoundingClientRect(), cell = invCell();
  invDrag = Object.assign({}, src, { x0: ev.clientX, y0: ev.clientY, moved: false, ghost: null,
    offX: src.from === 'bag' ? Math.floor((ev.clientX - r.left) / cell) : 0, offY: src.from === 'bag' ? Math.floor((ev.clientY - r.top) / cell) : 0 });
  window.addEventListener('pointermove', invPointerMove);
  window.addEventListener('pointerup', invPointerUp, { once: true });
  ev.preventDefault();
}
function invPointerMove(ev) {
  const d = invDrag;
  if (!d) return;
  if (!d.moved && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 6) return;
  if (!d.ghost) {
    d.moved = true;
    const [w, h] = itemSize(d.item), cell = invCell();
    d.ghost = document.createElement('img');
    d.ghost.src = itemIconURL(d.item); d.ghost.className = 'drag-ghost';
    d.ghost.style.width = w * cell + 'px'; d.ghost.style.height = h * cell + 'px';
    document.body.appendChild(d.ghost);
  }
  const cell = invCell();
  d.ghost.style.left = ev.clientX - d.offX * cell - cell / 2 + 'px';
  d.ghost.style.top = ev.clientY - d.offY * cell - cell / 2 + 'px';
}
function invPointerUp(ev) {
  window.removeEventListener('pointermove', invPointerMove);
  const d = invDrag; invDrag = null;
  if (!d) return;
  if (d.ghost) d.ghost.remove();
  if (!d.moved) { invSel = d.item; openInventory(); return; }
  const el = document.elementFromPoint(ev.clientX, ev.clientY);
  const eqEl = el && el.closest('[data-eq]'), flEl = el && el.closest('[data-fl]'), grid = el && el.closest('.bag-grid');
  const P = G.player;
  if (eqEl) {
    const key = eqEl.dataset.eq;
    if (d.from === 'bag') invMsg = equipItem(d.item, key) || '';
    else if (d.from === 'eq' && d.key !== key && equipSlotOf(d.key) === equipSlotOf(key)) { const t = P.equip[key]; P.equip[key] = P.equip[d.key]; P.equip[d.key] = t; recomputePlayer(); }
    else if (d.from !== 'eq' || d.key !== key) invMsg = 'ใส่ช่องนี้ไม่ได้';
  } else if (flEl) {
    const i = +flEl.dataset.fl;
    if (d.item.slot !== 'flask') invMsg = 'ช่องนี้ใส่ได้เฉพาะฟลาสก์';
    else if (d.from === 'fl') { const t = P.flasks[i]; P.flasks[i] = P.flasks[d.i]; P.flasks[d.i] = t; }
    else if (d.from === 'bag') invMsg = equipFlask(d.item, i) || '';
  } else if (grid) {
    const r = grid.getBoundingClientRect(), cell = invCell();
    const gx = Math.floor((ev.clientX - r.left) / cell) - d.offX, gy = Math.floor((ev.clientY - r.top) / cell) - d.offY;
    const ok = d.from === 'bag' ? bagMove(d.item, gx, gy) : d.from === 'eq' ? unequipItem(d.key, gx, gy) : unequipFlask(d.i, gx, gy);
    if (!ok) invMsg = 'วางตรงนี้ไม่ได้ (ชนไอเทมอื่นหรือเกินขอบ)';
  }
  invSel = d.item;
  openInventory();
}
function closeInventory() {
  if (G.state !== 'inventory') return;
  hide('inventory');
  G.state = 'play';
  resetGameClock();
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
    const ok = (t <= A.maxTier && t >= minT) || (mapCfg.itemUid && t === mapCfg.tier), done = A.done[mapCfg.biome + '_' + t];
    tiers += `<button class="tier-btn${mapCfg.tier === t ? ' sel' : ''}${done ? ' done' : ''}" data-tier="${t}" ${ok ? '' : 'disabled'}>${t}</button>`;
  }
  $('map-tiers').innerHTML = tiers;
  const qty = mapQuantity(mapCfg), mult = mapRewardMult(mapCfg);
  $('map-mods').innerHTML = (mapCfg.mods.length ? mapCfg.mods.map((id) => `<div class="map-mod"><b>${MAP_MODS[id].name}</b> — ${MAP_MODS[id].th} <span class="muted">(+${MAP_MODS[id].qty}%)</span></div>`).join('')
    : '<div class="muted">แผนที่ธรรมดา (Normal) — ไม่มี mod · ใช้ Alchemy เพื่อเพิ่มความยากและรางวัล</div>');
  $('map-summary').innerHTML = `มอนสเตอร์: ชีวิต ×${(tierHp(mapCfg.tier) * (BIOMES[mapCfg.biome].hpMul || 1)).toFixed(2)} · ดาเมจ ×${tierDmg(mapCfg.tier).toFixed(2)}<br>
    ค่าต้านทานผู้เล่น -${Math.round(resPenalty(mapCfg.tier) * 100)}% · ${mapCfg.itemUid ? '<span class="ok">ใช้แผนที่จากคลัง</span>' : mapCfg.tier > 1 ? `ซื้อแผนที่ ${mapBuyCost(mapCfg.tier)} ✦` : 'Tier 1 ฟรี'}<br>
    รางวัล: Item Quantity +${qty}% · Shards ×${mult.toFixed(2)}${A.done[mapCfg.biome + '_' + mapCfg.tier] ? '' : '<br><span class="ok">ยังไม่เคยผ่าน — ชนะเพื่อรับ +1 แต้ม Legacy Tree' + (mapCfg.tier >= A.maxTier && A.maxTier < MAX_MAP_TIER ? ` และปลดล็อก Tier ${mapCfg.tier + 1}` : '') + '</span>'}`;
  $('map-atlas').textContent = `Atlas: ผ่านแล้ว ${atlasDoneCount()} แผนที่ · Tier สูงสุด ${A.maxTier} · แต้ม Legacy Tree จาก Atlas +${atlasBonusPoints()}/${ATLAS_POINT_CAP} · ✦ ${M.shards}`;
  $('btn-map-alch').disabled = mapCfg.mods.length > 0;
  $('btn-map-chaos').disabled = !mapCfg.mods.length || M.shards < MAP_REROLL_COST;
  $('btn-map-chaos').textContent = `สุ่ม mod ใหม่ (${MAP_REROLL_COST} ✦)`;
  $('btn-map-clear').disabled = !mapCfg.mods.length;
  renderMapExtras();
  $('mapdev').querySelectorAll('[data-biome]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.biome;
      if (!biomeOpen(id)) return;
      mapCfg.itemUid = null; mapCfg.biome = id; mapCfg.tier = Math.max(Math.min(mapCfg.tier, A.maxTier), BIOMES[id].minTier);
      openMapDevice();
    };
  });
  $('mapdev').querySelectorAll('[data-tier]').forEach((el) => {
    el.onclick = () => {
      const t = +el.dataset.tier;
      // more mods roll on higher tiers: re-roll so the count matches
      if (mapCfg.mods.length && mapModCount(t) !== mapModCount(mapCfg.tier)) mapCfg.mods = rollMapMods(t);
      mapCfg.itemUid = null; mapCfg.tier = t; openMapDevice();
    };
  });
  show('mapdev');
}
function mapAlchemy() { mapCfg.mods = rollMapMods(mapCfg.tier); syncMapItem(); Sfx.play('currency'); openMapDevice(); }
function mapChaos() {
  const M = loadMeta();
  if (M.shards < MAP_REROLL_COST) return;
  M.shards -= MAP_REROLL_COST; saveMeta();
  mapCfg.mods = rollMapMods(mapCfg.tier); syncMapItem(); Sfx.play('currency'); openMapDevice();
}
function mapClear() { mapCfg.mods = []; syncMapItem(); openMapDevice(); }
function mapBack() { hide('mapdev'); buildMenu(); show('menu'); }

// Attack skill cards: how hard the skill hits with the weapon you hold now
function weaponNoteHtml(d) {
  if (!d.tags.includes('Attack') || !G.player) return '';
  const w = G.player.weapon, mul = attackWeaponMul(new Set(d.tags), w);
  const need = d.tags.includes('Bow') && (!w || w.wtype !== 'bow') ? ' — ต้องใช้ธนูถึงจะแรงเต็มที่' : '';
  return `<div class="card-note ${mul < 0.8 ? 'bad' : 'ok'}">⚔ Attack: ใช้พลังอาวุธ ×${mul.toFixed(2)} (${w ? WEAPON_TYPE[w.wtype] : 'มือเปล่า'})${need}</div>`;
}
