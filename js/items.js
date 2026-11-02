'use strict';
// ============================================================
//  Item runtime: drops, ground loot, grid backpack, equip rules,
//  skill gems hosted in item sockets, flasks
// ============================================================

// chance of an item drop and its rarity weights per monster rarity
const ITEM_DROP = {
  0: { chance: 0.0004, w: { magic: 85, rare: 15, unique: 0 } },
  1: { chance: 0.03, w: { magic: 72, rare: 26, unique: 2 } },
  2: { chance: 0.38, w: { magic: 35, rare: 58, unique: 7 } },
};
const DROP_SLOT_W = { weapon: 1.3, offhand: 0.7, helm: 1, body: 1, gloves: 1, boots: 1, belt: 0.8, amulet: 0.6, ring: 1.2, flask: 1.1 };

function rollRarity(w) {
  return weightedSample(Object.keys(w).filter((k) => w[k] > 0), 1, (k) => w[k])[0];
}
function dropItem(x, y, rarity, slot) {
  slot = slot || weightedSample(Object.keys(DROP_SLOT_W), 1, (k) => DROP_SLOT_W[k])[0];
  if (slot === 'flask' && rarity === 'unique') slot = 'ring';
  const item = makeItem(rarity, slot, G.time, G.map.tier);
  G.items.push({ x: x + rand(-14, 14), y: y + rand(-14, 14), item, t: 0 });
  if (rarity === 'unique') Sfx.play('boss');
}
function rollItemDrop(e) {
  if (e.rarity === 3) {
    dropItem(e.x - 40, e.y + 20, 'rare');
    dropItem(e.x + 40, e.y + 20, Math.random() < 0.6 ? 'unique' : 'rare');
    return;
  }
  const d = ITEM_DROP[e.rarity];
  if (!d) return;
  // map quantity raises drop chance, higher tiers favour rarer items
  const qty = 1 + mapQuantity(G.map) / 100, t = G.map.tier - 1;
  if (Math.random() < d.chance * qty * (1 + 0.08 * t)) {
    dropItem(e.x, e.y, rollRarity({ magic: d.w.magic, rare: d.w.rare * (1 + 0.1 * t), unique: d.w.unique * (1 + 0.2 * t) }));
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
  const links = it.links && it.links.length ? Math.max(...it.links) : 0;
  lootLog(it.name + (links >= 5 ? ` (${links}L!)` : ''), RARITY_COLOR[it.rarity]);
  showTip('item');
  if (it.unique) {
    announce(it.name, 'Unique ' + SLOT_NAME[it.slot] + ' — ' + UNIQUES[it.unique].th, RARITY_COLOR.unique);
    const M = loadMeta();
    if (!M.found) M.found = {};
    if (!M.found[it.unique]) { M.found[it.unique] = true; saveMeta(); lootLog('Unique ใหม่เข้าคลัง!', RARITY_COLOR.unique); }
  }
  if (links >= 5) announce(`${links}-Link!`, it.name, '#ffe866');
}

// ---------------- sockets & links: skills live in item sockets ----------------
// Each socketed gear slot can host one skill in its largest link group.
// A hosted skill uses the item's sockets when they offer more support
// sockets than the skill's own base links (Orb of Fusing cards); then
// supports must match a socket colour (white = any) or they go inactive.
function linkGroups(it) {
  if (!it || !it.sockets || !it.sockets.length) return [];
  const out = []; let i = 0;
  for (const n of it.links) { out.push(it.sockets.slice(i, i + n)); i += n; }
  return out;
}
function bestGroup(it) { return linkGroups(it).reduce((b, g) => (g.length > b.length ? g : b), []); }
function hostOf(inst) {
  const P = G.player;
  if (!P || !P.hosts) return null;
  for (const k in P.hosts) if (P.hosts[k] === inst.uid) return k;
  return null;
}
// keep valid hosts, give unhosted skills the free slot with the biggest group
function reassignHosts() {
  const P = G.player;
  if (!P.hosts) P.hosts = {};
  for (const k in P.hosts) if (!P.equip[k] || bestGroup(P.equip[k]).length < 2 || !P.skills.some((s) => s.uid === P.hosts[k])) delete P.hosts[k];
  for (const inst of P.skills) {
    if (hostOf(inst)) continue;
    let best = null, bs = 1;
    for (const k of SOCKET_SLOTS) {
      if (P.hosts[k] || !P.equip[k]) continue;
      const n = bestGroup(P.equip[k]).length;
      if (n > bs) { bs = n; best = k; }
    }
    if (best) P.hosts[best] = inst.uid;
  }
}
function setHost(inst, key) {
  const P = G.player, cur = hostOf(inst);
  if (cur) delete P.hosts[cur];
  if (key) { const other = P.hosts[key]; P.hosts[key] = inst.uid; if (other && cur) P.hosts[cur] = other; }
  recomputePlayer();
}
const GEM_SOCKET = { r: 'R', g: 'G', b: 'B' };
function skillSockets(inst) {
  const bare = { cap: inst.sockets, colors: Array(inst.sockets).fill('W'), host: null, item: false, link: inst.sockets + 1 };
  if (!G.player || !G.player.equip) return bare;
  const host = hostOf(inst);
  if (!host) return bare;
  const grp = bestGroup(G.player.equip[host]).slice();
  bare.host = host;
  if (grp.length - 1 <= inst.sockets) return bare;
  // one socket of the group holds the skill gem itself
  const own = GEM_SOCKET[SKILLS[inst.id].gem];
  let k = grp.indexOf(own); if (k < 0) k = grp.indexOf('W'); if (k < 0) k = 0;
  grp.splice(k, 1);
  return { cap: grp.length, colors: grp, host, item: true, link: grp.length + 1 };
}
// which socketed supports actually work right now
function activeSupports(inst) {
  const so = skillSockets(inst), free = so.colors.slice(), active = [], inactive = [];
  for (const sid of inst.supports) {
    if (active.length >= so.cap) { inactive.push(sid); continue; }
    const c = GEM_SOCKET[SUPPORTS[sid].gem];
    let k = free.indexOf(c); if (k < 0) k = free.indexOf('W');
    if (k < 0) { inactive.push(sid); continue; }
    free.splice(k, 1); active.push(sid);
  }
  return { active, inactive, free, so };
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
  const fx = { move: 0, speed: 0, armour: 0, armourMul: 1, evasion: 0, evMul: 1, dmgMore: 1, critMul: 1 };
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
    if (st.kind === 'life') { P.life += (P.maxLife * 0.55 * eff / st.dur) * dt; if (Math.random() < 0.4) emit('heal', P.x, P.y, 1, { jitter: 12 }); }
    else if (st.kind === 'quick') fx.move += 0.4 * eff;
    else if (st.kind === 'granite') { fx.armourMul += 1 * eff; fx.armour += 300 * eff; }
    else if (st.kind === 'jade') { fx.evMul += 1 * eff; fx.evasion += 300 * eff; }
    else if (st.kind === 'silver') fx.speed += 0.2 * eff;
    else if (st.kind === 'sulphur') fx.dmgMore *= 1 + 0.25 * eff;
    else if (st.kind === 'diamond') fx.critMul *= 2;
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
  const acc = (150 + (G.time / 60) * 35) * (1 + 0.08 * (G.map.tier - 1));
  return Math.min(0.75, P.mods.evade + Math.min(0.6, ev / (ev + acc * 1.5)));
}
const armourReduction = (A, dmg) => (A > 0 ? Math.min(0.75, A / (A + 5 * dmg)) : 0);

// ---------------- art ----------------
function itemSpriteId(it) {
  const b = BASES[it.base];
  if (b.flask) return 'item_flask_' + b.flask.kind;
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
    // loot beam for rare / unique / 5+ links
    const big = it.links && it.links.length && Math.max(...it.links) >= 5;
    if (it.rarity === 'rare' || it.rarity === 'unique' || big) {
      const h = it.rarity === 'unique' || big ? 150 : 90, w = it.rarity === 'unique' || big ? 14 : 9, bc = big && it.rarity !== 'unique' ? '#ffffff' : col;
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
    ctx.strokeStyle = hexA(col, 0.8); ctx.lineWidth = 1; ctx.strokeRect(g.x - tw / 2, g.y - 34, tw, 16);
    ctx.fillStyle = col; ctx.fillText(it.name, g.x, g.y - 22);
  }
}
