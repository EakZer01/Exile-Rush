'use strict';
// ============================================================
//  Item runtime: drops, ground loot, pickup, equip / salvage
// ============================================================

// chance of an item drop and its rarity weights per monster rarity
const ITEM_DROP = {
  0: { chance: 0.0004, w: { magic: 85, rare: 15, unique: 0 } },
  1: { chance: 0.03, w: { magic: 72, rare: 26, unique: 2 } },
  2: { chance: 0.38, w: { magic: 35, rare: 58, unique: 7 } },
};

function rollRarity(w) {
  return weightedSample(Object.keys(w).filter((k) => w[k] > 0), 1, (k) => w[k])[0];
}
function dropItem(x, y, rarity, slot) {
  const item = makeItem(rarity, slot, G.time);
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

function updateItems(dt) {
  const P = G.player;
  for (const l of G.lootLog) l.t += dt;
  for (let i = G.items.length - 1; i >= 0; i--) {
    const g = G.items[i];
    g.t += dt;
    const d2 = dist2(g.x, g.y, P.x, P.y);
    if (d2 > 34 * 34) continue;
    if (!P.equip[g.item.slot]) { equipItem(g.item); G.items.splice(i, 1); }
    else if (P.backpack.length < BACKPACK_SIZE) { P.backpack.push(g.item); P.newItems++; G.items.splice(i, 1); }
    else { if (g.t > (g.fullMsg || 0)) { addText(P.x, P.y - 30, 'กระเป๋าเต็ม (กด I)', '#ff8a6a', 0.9); g.fullMsg = g.t + 2; } continue; }
    onItemPickup(g.item);
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
    if (!M.found[it.unique]) { M.found[it.unique] = true; saveMeta(); lootLog('Unique ใหม่เข้าคลัง!', RARITY_COLOR.unique); }
  }
}

// put an item on; the replaced one goes to the backpack
function equipItem(it) {
  const P = G.player, old = P.equip[it.slot];
  P.backpack = P.backpack.filter((b) => b !== it);
  P.equip[it.slot] = it;
  if (old) P.backpack.push(old);
  recomputePlayer();
}
function unequipItem(slot) {
  const P = G.player, it = P.equip[slot];
  if (!it || P.backpack.length >= BACKPACK_SIZE) return false;
  P.equip[slot] = null; P.backpack.push(it);
  recomputePlayer();
  return true;
}
// destroy an item for Ancient Shards (paid out with the run's reward)
function salvageItem(it) {
  const P = G.player;
  if (P.equip[it.slot] === it) P.equip[it.slot] = null;
  P.backpack = P.backpack.filter((b) => b !== it);
  G.stats.salvage += SALVAGE_SHARDS[it.rarity];
  recomputePlayer();
}

// ---- ground loot rendering (pass B: always readable in the dark) ----
function drawGroundItems(ctx, inView) {
  for (const g of G.items) {
    if (!inView(g.x, g.y, 60)) continue;
    const it = g.item, col = RARITY_COLOR[it.rarity], bob = Math.sin(g.t * 3) * 2;
    // loot beam for rare / unique
    if (it.rarity !== 'magic') {
      const h = it.rarity === 'unique' ? 150 : 90, w = it.rarity === 'unique' ? 14 : 9;
      const grd = ctx.createLinearGradient(0, g.y - h, 0, g.y);
      grd.addColorStop(0, hexA(col, 0)); grd.addColorStop(1, hexA(col, 0.45 + Math.sin(g.t * 4) * 0.1));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grd; ctx.fillRect(g.x - w / 2, g.y - h, w, h);
      ctx.drawImage(glowSprite(col, 30), g.x - 30, g.y - 30);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.imageSmoothingEnabled = false;
    drawSprite(ctx, 'item_' + it.slot, 0, false, it.rarity, '', g.x, g.y + 10 + bob, 1.6);
    ctx.imageSmoothingEnabled = true;
    // name label
    ctx.font = '700 12px Sarabun, sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(it.name).width + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(g.x - tw / 2, g.y - 34, tw, 16);
    ctx.strokeStyle = hexA(col, 0.8); ctx.lineWidth = 1; ctx.strokeRect(g.x - tw / 2, g.y - 34, tw, 16);
    ctx.fillStyle = col; ctx.fillText(it.name, g.x, g.y - 22);
  }
}
