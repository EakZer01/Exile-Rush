'use strict';
// ============================================================
//  Item runtime: drops, ground loot, grid backpack, equip rules,
//  skill support slots, tiered Jewellers and flasks
// ============================================================

// chance of an item drop and its rarity weights per monster rarity
const ITEM_DROP = {
  0: { chance: 0.0004, w: { magic: 85, rare: 15, unique: 0 } },
  1: { chance: 0.03, w: { magic: 72, rare: 26, unique: 2 } },
  2: { chance: 0.38, w: { magic: 35, rare: 58, unique: 7 } },
};
const DROP_SLOT_W = { weapon: 1.3, offhand: 0.7, helm: 1, body: 1, gloves: 1, boots: 1, belt: 0.8, amulet: 0.6, ring: 1.2, flask: 1.1 };

// Loot filter: hidden drops are salvaged straight into shards.
// Uniques, jewels and maps always show.
const LOOT_FILTERS = [
  { name: 'แสดงทั้งหมด', desc: 'เห็นทุกไอเทม', show: () => true },
  { name: 'ซ่อน Normal', desc: 'ซ่อนไอเทมสีขาว', show: (it) => it.rarity !== 'normal' },
  { name: 'Rare ขึ้นไป', desc: 'ซ่อน Normal และ Magic (ยกเว้นฟลาสก์ Magic)', show: (it) => it.rarity === 'rare' || it.rarity === 'unique' || it.slot === 'flask' && it.rarity === 'magic' },
  { name: 'เข้มงวด', desc: 'เฉพาะ Rare ที่มีค่าต้านทาน / ชีวิต', show: (it) => it.rarity === 'unique' || it.rarity === 'rare' && (hasResMod(it) || it.affixes.some((a) => a.id === 'lifeflat' || a.id === 'life')) },
];
const RES_MODS = ['fireres', 'coldres', 'lightres', 'allres', 'chaosres'];
const hasResMod = (it) => (it.affixes || []).some((a) => RES_MODS.includes(a.id)) || !!(it.implicit && RES_MODS.includes(it.implicit.id));
function lootVisible(it) {
  if (it.unique || it.slot === 'jewel') return true;
  return LOOT_FILTERS[G.settings.lootFilter || 0].show(it);
}

function rollRarity(w) {
  return weightedSample(Object.keys(w).filter((k) => w[k] > 0), 1, (k) => w[k])[0];
}
// src: drop a unique from that source's pool (bosses, Breach, Ritual...)
function dropItem(x, y, rarity, slot, src) {
  if (!src) slot = slot || weightedSample(Object.keys(DROP_SLOT_W), 1, (k) => DROP_SLOT_W[k])[0];
  if (slot === 'flask' && rarity === 'unique') slot = 'ring';
  const item = makeItem(rarity, slot, G.time, G.map.tier, src);
  if (!lootVisible(item)) { G.stats.salvage += SALVAGE_SHARDS[item.rarity] || 0; G.stats.filtered = (G.stats.filtered || 0) + 1; return; }
  G.items.push({ x: x + rand(-14, 14), y: y + rand(-14, 14), item, t: 0 });
  if (rarity === 'unique') Sfx.play('unique');
  else if (rarity === 'rare') Sfx.play('rare');
}
function rollItemDrop(e) {
  if (e.rarity === 3) {
    dropItem(e.x - 40, e.y + 20, 'rare');
    dropItem(e.x + 40, e.y + 20, Math.random() < Math.min(0.9, 0.6 * G.atlasFx.uniqueMul) ? 'unique' : 'rare');
    return;
  }
  const d = ITEM_DROP[e.rarity];
  if (!d) return;
  // map quantity raises drop chance, higher tiers favour rarer items
  const qty = 1 + mapQuantity(G.map) / 100, t = G.map.tier - 1;
  if (Math.random() < d.chance * qty * GAME_PACE * (1 + 0.08 * t) * (e.deli ? 1 + 2 * deliP() : 1) * (G.atlasFx.itemQty || 1)) {
    dropItem(e.x, e.y, rollRarity({ magic: d.w.magic, rare: d.w.rare * (1 + 0.1 * t), unique: d.w.unique * (1 + 0.2 * t) * G.atlasFx.uniqueMul }));
  }
}

function lootLog(text, color) {
  G.lootLog.unshift({ text, color, t: 0 });
  if (G.lootLog.length > 5) G.lootLog.pop();
}

// ---------------- grid backpack (12 × 5, PoE-style item sizes) ----------------
const itemSize = (it) => BASES[it.base].size;
function gridFits(it, x, y, ignore) {
  const [w, h] = itemSize(it);
  if (x < 0 || y < 0 || x + w > GRID_W || y + h > GRID_H) return false;
  for (const o of G.player.backpack) {
    if (o === it || o === ignore) continue;
    const [ow, oh] = itemSize(o);
    if (x < o.gx + ow && x + w > o.gx && y < o.gy + oh && y + h > o.gy) return false;
  }
  return true;
}
// fills top-left first, column by column (like PoE)
function bagAdd(it) {
  const [w, h] = itemSize(it);
  for (let x = 0; x <= GRID_W - w; x++) for (let y = 0; y <= GRID_H - h; y++) {
    if (gridFits(it, x, y)) { it.gx = x; it.gy = y; G.player.backpack.push(it); return true; }
  }
  return false;
}
function bagRemove(it) { G.player.backpack = G.player.backpack.filter((b) => b !== it); }
function bagMove(it, x, y) { if (!gridFits(it, x, y)) return false; it.gx = x; it.gy = y; return true; }
function sortBag() {
  const P = G.player, items = P.backpack.slice().sort((a, b) => itemSize(b)[0] * itemSize(b)[1] - itemSize(a)[0] * itemSize(a)[1]);
  P.backpack = [];
  for (const it of items) if (!bagAdd(it)) { it.gx = 0; it.gy = 0; P.backpack.push(it); }
}
// drop an item that no longer fits anywhere at the player's feet
function dropAtPlayer(it) { G.items.push({ x: G.player.x + rand(-30, 30), y: G.player.y + rand(-30, 30), item: it, t: 0 }); }
const bagOrDrop = (it) => { if (!bagAdd(it)) dropAtPlayer(it); };

// ---------------- equipment rules ----------------
const equipSlotOf = (key) => (key === 'ring2' ? 'ring' : key);
function canEquip(it, key) {
  const P = G.player;
  if (it.slot === 'jewel') return 'Jewel ใส่ที่ Legacy Tree';
  if (it.slot === 'flask') return 'ฟลาสก์ใส่ในช่องฟลาสก์';
  if (equipSlotOf(key) !== it.slot) return `ใส่ในช่อง${SLOT_NAME[key]}ไม่ได้`;
  if (key === 'offhand') {
    const w = P.equip.weapon && BASES[P.equip.weapon.base].w, b = BASES[it.base];
    if (b.quiver && (!w || w.type !== 'bow')) return 'Quiver ใช้กับธนูเท่านั้น';
    if (!b.quiver && w && w.hands === 2) return 'อาวุธสองมือใช้โล่ไม่ได้';
  }
  return '';
}
function defaultKeyFor(it) {
  const P = G.player;
  if (it.slot === 'ring') return !P.equip.ring ? 'ring' : !P.equip.ring2 ? 'ring2' : 'ring';
  return it.slot;
}
// equip (from the bag or the ground); returns '' or why not
function equipItem(it, key) {
  const P = G.player;
  key = key || defaultKeyFor(it);
  const why = canEquip(it, key);
  if (why) return why;
  bagRemove(it);
  const old = P.equip[key];
  P.equip[key] = it;
  if (old) bagOrDrop(old);
  // a two-hander or a non-bow pushes an incompatible off-hand back into the bag
  if (key === 'weapon' && P.equip.offhand) {
    const w = BASES[it.base].w, oh = BASES[P.equip.offhand.base];
    if ((oh.quiver && w.type !== 'bow') || (!oh.quiver && w.hands === 2)) { bagOrDrop(P.equip.offhand); P.equip.offhand = null; }
  }
  recomputePlayer();
  return '';
}
function unequipItem(key, gx, gy) {
  const P = G.player, it = P.equip[key];
  if (!it) return false;
  if (gx !== undefined) { if (!gridFits(it, gx, gy)) return false; it.gx = gx; it.gy = gy; P.backpack.push(it); }
  else if (!bagAdd(it)) return false;
  P.equip[key] = null;
  recomputePlayer();
  return true;
}
function equipFlask(it, i) {
  const P = G.player;
  if (it.slot !== 'flask') return 'ใส่ได้เฉพาะฟลาสก์';
  if (i === undefined) i = P.flasks.findIndex((f) => !f);
  if (i < 0) i = 0;
  bagRemove(it);
  const old = P.flasks[i];
  P.flasks[i] = it;
  if (old) bagOrDrop(old);
  return '';
}
function unequipFlask(i, gx, gy) {
  const P = G.player, it = P.flasks[i];
  if (!it) return false;
  if (gx !== undefined) { if (!gridFits(it, gx, gy)) return false; it.gx = gx; it.gy = gy; P.backpack.push(it); }
  else if (!bagAdd(it)) return false;
  P.flasks[i] = null;
  return true;
}
function whereIs(it) {
  const P = G.player;
  for (const k of ITEM_SLOTS) if (P.equip[k] === it) return { equip: k };
  const fi = P.flasks.indexOf(it);
  if (fi >= 0) return { flask: fi };
  if (P.backpack.includes(it)) return { bag: true };
  return null;
}
// destroy an item for Ancient Shards (paid out with the run's reward)
function salvageItem(it) {
  const P = G.player, w = whereIs(it);
  if (!w) return;
  if (w.equip) P.equip[w.equip] = null;
  else if (w.flask !== undefined) P.flasks[w.flask] = null;
  else bagRemove(it);
  G.stats.salvage += SALVAGE_SHARDS[it.rarity];
  recomputePlayer();
}

// starting gear: a plain weapon that fits the class plus two flasks
const START_WEAPON = { witch: 'driftwood_wand', ranger: 'short_bow', marauder: 'woodsplitter', templar: 'driftwood_sceptre',
  shadow: 'glass_shank', duelist: 'rusted_sword', scion: 'rusted_sword' };
function giveStartingGear(P) {
  P.equip.weapon = makeNormal(START_WEAPON[P.cls.id] || 'rusted_sword');
  P.flasks[0] = makeNormal('life_flask'); P.flasks[0].charges = 45;
  P.flasks[1] = makeNormal('quicksilver'); P.flasks[1].charges = 30;
}

// ---------------- pickup ----------------
function updateItems(dt) {
  const P = G.player;
  for (const l of G.lootLog) l.t += dt;
  for (let i = G.items.length - 1; i >= 0; i--) {
    const g = G.items[i];
    g.t += dt;
    if (dist2(g.x, g.y, P.x, P.y) > 34 * 34) continue;
    const it = g.item;
    let took = false;
    if (it.slot === 'flask' && P.flasks.some((f) => !f)) { equipFlask(it); took = true; }
    else if (it.slot !== 'flask' && !P.equip[defaultKeyFor(it)] && !canEquip(it, defaultKeyFor(it))) { equipItem(it); took = true; }
    else if (bagAdd(it)) { P.newItems++; took = true; }
    if (!took) { if (g.t > (g.fullMsg || 0)) { addText(P.x, P.y - 30, 'กระเป๋าเต็ม (กด I)', '#ff8a6a', 0.9); g.fullMsg = g.t + 2; } continue; }
    G.items.splice(i, 1);
    onItemPickup(it);
  }
}

function onItemPickup(it) {
  const P = G.player;
  Sfx.play('currency');
  emit('gold', P.x, P.y, 12, { color: RARITY_COLOR[it.rarity] });
  lootLog(it.name, RARITY_COLOR[it.rarity]);
  showTip('item');
  if (it.unique) {
    announce(it.name, 'Unique ' + SLOT_NAME[it.slot] + ' — ' + UNIQUES[it.unique].th, RARITY_COLOR.unique);
    const M = loadMeta();
    if (!M.found) M.found = {};
    if (!M.found[it.unique]) {
      M.found[it.unique] = true; saveMeta(); lootLog('Unique ใหม่เข้าคลัง!', RARITY_COLOR.unique);
      const n = Object.keys(M.found).length, b = COLLECTION_BONUS.find((x) => x.n === n);
      if (b) announce(`Unique Collection ${n}`, 'โบนัสถาวร: ' + b.desc, RARITY_COLOR.unique);
    }
  }
}

// ---------------- neutral support slots and tiered Jeweller's Orbs ----------------
function skillSockets(inst) {
  const count = Number.isFinite(inst.sockets) ? Math.floor(inst.sockets) : START_SOCKETS;
  return { cap: clamp(count, START_SOCKETS, MAX_SOCKETS) };
}
function jewellerBlockReason(inst, id) {
  const P = G.player, def = JEWELLERS[id];
  if (!P || !P.skills.includes(inst) || !def) return 'ไม่พบสกิลหรือ Jeweller ระดับนี้';
  if (skillSockets(inst).cap >= def.sockets) return 'สกิลมีช่องเท่ากันหรือมากกว่าแล้ว';
  if (!(P.currency[id] > 0)) return 'ยังไม่มี Jeweller ระดับนี้';
  return '';
}
function useSkillJeweller(inst, id) {
  if (!['inventory', 'paused'].includes(G.state) || jewellerBlockReason(inst, id)) return false;
  G.player.currency[id]--;
  inst.sockets = JEWELLERS[id].sockets;
  G.stats.jeweller = true;
  recomputePlayer();
  return true;
}
function activeSupports(inst, p = G.player) {
  const so = skillSockets(inst), active = [], inactive = [], slots = Array(so.cap).fill(null), reasons = {};
  const tags = new Set(SKILLS[inst.id].tags), candidates = [], seen = new Set(), enabled = new Set();
  if (p && p.mods && p.mods.ks.voltaxic && tags.has('Lightning')) tags.add('Chaos');
  for (const [index, sid] of inst.supports.entries()) {
    if (index >= so.cap) { inactive.push(sid); reasons[sid] = 'ช่อง Support ไม่พอ · ใช้ Jeweller เพิ่มช่อง'; continue; }
    if (!SUPPORTS[sid] || seen.has(sid)) { inactive.push(sid); reasons[sid] = 'เจมไม่ถูกต้องหรือใส่ซ้ำ'; continue; }
    seen.add(sid); candidates.push(sid);
  }
  // Resolve granted tags before declaring dependents inactive, independent of slot order.
  for (let pass = 0; pass < candidates.length && enabled.size < so.cap; pass++) {
    let changed = false;
    for (const sid of candidates) {
      if (enabled.has(sid) || enabled.size >= so.cap) continue;
      const sup = SUPPORTS[sid];
      if (sup.all && !sup.all.every((t) => tags.has(t))) continue;
      if (supportUseReason(sid, SKILLS[inst.id], tags, [...enabled], p && p.mods)) continue;
      if ((sup.req.length && !sup.req.some((t) => tags.has(t))) || sup.excl.some((t) => tags.has(t)) || sup.conflicts.some((s) => enabled.has(s))) continue;
      enabled.add(sid); changed = true;
      for (const tag of sup.addTags) tags.add(tag);
      if (p && p.mods && p.mods.ks.voltaxic && tags.has('Lightning')) tags.add('Chaos');
    }
    if (!changed) break;
  }
  for (const sid of candidates) {
    if (enabled.has(sid)) { slots[inst.supports.indexOf(sid)] = sid; active.push(sid); }
    else {
      inactive.push(sid);
      reasons[sid] = supportUseReason(sid, SKILLS[inst.id], tags, [...enabled], p && p.mods) || (enabled.size >= so.cap ? 'ช่อง Support ไม่พอ · ใช้ Jeweller เพิ่มช่อง' : 'แท็กสกิลไม่ตรง หรือขัดกับ Support ที่ทำงานอยู่');
    }
  }
  return { active, inactive, slots, so, reasons };
}

// ---------------- flasks ----------------
function flaskStats(f) {
  const b = BASES[f.base].flask, a = {};
  for (const x of f.affixes) a[x.id] = x.v;
  return { kind: b.kind, max: Math.round(b.max * (1 + (a.ample || 0) / 100)), use: Math.round(b.use * (1 - (a.chemist || 0) / 100)),
    dur: b.dur * (1 + (a.experimenter || 0) / 100), a };
}
const anyFlaskActive = (P) => P.flasks.some((f) => f && f.active > 0);
// combined buffs of all active flasks, refreshed every frame
function updateFlasks(dt) {
  const P = G.player, inp = G.input, eff = 1 + P.mods.flaskEff;
  const fx = { move: 0, speed: 0, armour: 0, armourMul: 1, evasion: 0, evMul: 1, dmgMore: 1, critMul: 1, res: { fire: 0, cold: 0, lightning: 0, chaos: 0 }, maxResT: {} };
  for (let i = 0; i < FLASK_SLOTS; i++) {
    const f = P.flasks[i];
    if (inp['flask' + i]) { inp['flask' + i] = false; if (f) f.wantUse = true; }
    if (!f) continue;
    const st = flaskStats(f);
    if (f.wantUse) {
      f.wantUse = false;
      if (f.charges >= st.use && f.active <= 0) { f.charges -= st.use; f.active = st.dur; Sfx.play('flask'); }
    }
    if (f.active <= 0) continue;
    f.active -= dt;
    if (st.kind === 'life') {
      // under Chaos Inoculation the life flask refills Energy Shield instead
      if (P.mods.ks.ci) P.es = Math.min(P.maxES, P.es + (P.maxES * 0.4 * eff / st.dur) * dt);
      else P.life += (P.maxLife * 0.55 * eff / st.dur) * dt;
      if (Math.random() < 0.4) emit('heal', P.x, P.y, 1, { jitter: 12 });
    }
    else if (st.kind === 'quick') fx.move += 0.4 * eff;
    else if (st.kind === 'granite') { fx.armourMul += 1 * eff; fx.armour += 300 * eff; }
    else if (st.kind === 'jade') { fx.evMul += 1 * eff; fx.evasion += 300 * eff; }
    else if (st.kind === 'silver') fx.speed += 0.2 * eff;
    else if (st.kind === 'sulphur') fx.dmgMore *= 1 + 0.25 * eff;
    else if (st.kind === 'diamond') fx.critMul *= 2;
    else if (st.kind === 'ruby' || st.kind === 'sapphire' || st.kind === 'topaz') {
      const t = { ruby: 'fire', sapphire: 'cold', topaz: 'lightning' }[st.kind];
      fx.res[t] += 0.4 * eff; fx.maxResT[t] = 0.05;
    } else if (st.kind === 'amethyst') fx.res.chaos += 0.35 * eff;
    const a = st.a;
    if (a.fending) fx.armour += a.fending;
    if (a.reflexes) fx.evasion += a.reflexes;
    if (a.adrenaline) fx.move += a.adrenaline / 100;
    if (a.rapidity) fx.speed += a.rapidity / 100;
  }
  P.flaskFx = fx;
}
function flaskGain(P, amount) {
  for (const f of P.flasks) if (f) f.charges = Math.min(flaskStats(f).max, f.charges + amount);
}

// ---------------- defences ----------------
const effArmour = (P) => (P.armour + P.flaskFx.armour) * P.flaskFx.armourMul;
const effEvasion = (P) => (P.evasion + P.flaskFx.evasion) * P.flaskFx.evMul;
// monster accuracy grows with time and map tier
function evadeChance(P) {
  const ev = effEvasion(P);
  if (ev <= 0) return P.mods.evade;
  const acc = (150 + gameMin() * 35) * (1 + 0.08 * (G.map.tier - 1));
  return Math.min(0.75, P.mods.evade + Math.min(0.6, ev / (ev + acc * 1.5)));
}
const armourReduction = (A, dmg) => (A > 0 ? Math.min(0.75, A / (A + 5 * dmg)) : 0);

// ---------------- art ----------------
function itemSpriteId(it) {
  const b = BASES[it.base];
  if (b.flask) return 'item_flask_' + b.flask.kind;
  if (b.jewel) return 'item_jewel_' + b.jewel;
  if (b.w) return { bow: 'item_bow', staff: 'item_staff', wand: 'item_wand', sceptre: 'item_wand' }[b.w.type] || 'item_sword';
  if (b.quiver) return 'item_quiver';
  if (it.slot === 'offhand') return 'item_shield';
  return 'item_' + it.slot;
}

// ---- ground loot rendering (pass B: always readable in the dark) ----
function drawGroundItems(ctx, inView) {
  for (const g of G.items) {
    if (!inView(g.x, g.y, 60)) continue;
    const it = g.item, col = RARITY_COLOR[it.rarity], bob = Math.sin(g.t * 3) * 2;
    // loot beam for rare and unique equipment
    if (it.rarity === 'rare' || it.rarity === 'unique') {
      const h = it.rarity === 'unique' ? 150 : 90, w = it.rarity === 'unique' ? 14 : 9, bc = col;
      const grd = ctx.createLinearGradient(0, g.y - h, 0, g.y);
      grd.addColorStop(0, hexA(bc, 0)); grd.addColorStop(1, hexA(bc, 0.45 + Math.sin(g.t * 4) * 0.1));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grd; ctx.fillRect(g.x - w / 2, g.y - h, w, h);
      ctx.drawImage(glowSprite(bc, 30), g.x - 30, g.y - 30);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.imageSmoothingEnabled = false;
    drawSprite(ctx, itemSpriteId(it), 0, false, it.rarity === 'normal' ? 'dark' : it.rarity, '', g.x, g.y + 10 + bob, 1.5);
    ctx.imageSmoothingEnabled = true;
    // name label
    ctx.font = '700 12px Sarabun, sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(it.name).width + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(g.x - tw / 2, g.y - 34, tw, 16);
    const hl = G.settings.hlRes && hasResMod(it);
    ctx.strokeStyle = hl ? '#5aff7a' : hexA(col, 0.8); ctx.lineWidth = hl ? 2 : 1; ctx.strokeRect(g.x - tw / 2, g.y - 34, tw, 16);
    ctx.fillStyle = col; ctx.fillText(it.name, g.x, g.y - 22);
  }
}
