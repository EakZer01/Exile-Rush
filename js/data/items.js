'use strict';
// ============================================================
//  ITEMS — equipment found during a run (reset every run)
//  6 slots. Magic items roll 1–2 affixes, Rares 3–4, Uniques have
//  fixed mods plus a build-defining effect. Affix values scale with
//  how late in the run the item dropped (item level).
//  Items are stored as plain data ({slot, rarity, affixes:[{id,v}]})
//  and turned into player mods through the tables below.
// ============================================================
const ITEM_SLOTS = ['helm', 'body', 'gloves', 'boots', 'amulet', 'ring'];
const SLOT_NAME = { helm: 'หมวก', body: 'เกราะ', gloves: 'ถุงมือ', boots: 'รองเท้า', amulet: 'สร้อยคอ', ring: 'แหวน' };
const RARITY_COLOR = { magic: '#8a8cff', rare: '#ffe866', unique: '#e8883a' };
const RARITY_NAME = { magic: 'Magic', rare: 'Rare', unique: 'Unique' };
const BACKPACK_SIZE = 12;
const SALVAGE_SHARDS = { magic: 1, rare: 3, unique: 8 };

// base types: one implicit each (rings pick one of three bases)
const ITEM_BASES = {
  helm: [{ name: 'Warden Helm', imp: 'life', iv: 5 }],
  body: [{ name: 'Plate Vest', imp: 'armour', iv: 4 }],
  gloves: [{ name: 'Leather Gloves', imp: 'speed', iv: 4 }],
  boots: [{ name: 'Leather Boots', imp: 'move', iv: 5 }],
  amulet: [{ name: 'Jade Amulet', imp: 'alldmg', iv: 6 }],
  ring: [{ name: 'Iron Ring', imp: 'phys', iv: 6 }, { name: 'Sapphire Ring', imp: 'ele', iv: 6 }, { name: 'Amethyst Ring', imp: 'chaos', iv: 8 }],
};

// lo/hi = roll range at the start of a run (scaled up to ×1.8 by 20:00)
// dec = decimals shown · w = weight · rareOnly = can't roll on Magic items
const AFFIXES = {
  life:      { t: '+{v}% ชีวิตสูงสุด', adj: 'Hale', slots: 'helm body gloves boots amulet ring', lo: 4, hi: 8, w: 10, apply(m, v) { m.lifeInc += v / 100; } },
  regen:     { t: 'ฟื้นชีวิต +{v}%/วิ', adj: 'Mending', slots: 'helm body amulet ring', lo: 0.1, hi: 0.3, dec: 2, w: 5, apply(m, v) { m.regen += v / 100; } },
  armour:    { t: 'รับดาเมจ {v}% less', adj: 'Stalwart', slots: 'helm body gloves', lo: 2, hi: 5, w: 7, apply(m, v) { m.dmgTaken *= 1 - v / 100; } },
  evade:     { t: 'หลบการโจมตี {v}%', adj: 'Evasive', slots: 'body boots gloves', lo: 2, hi: 5, w: 5, apply(m, v) { m.evade += v / 100; } },
  move:      { t: '+{v}% ความเร็วเคลื่อนที่', adj: 'Swift', slots: 'boots', lo: 5, hi: 12, w: 12, apply(m, v) { m.moveInc += v / 100; } },
  spell:     { t: '+{v}% ดาเมจ Spell', adj: 'Arcane', slots: 'helm gloves amulet ring', lo: 8, hi: 18, w: 8, apply(m, v) { m.incSpell += v / 100; } },
  attack:    { t: '+{v}% ดาเมจ Attack', adj: 'Martial', slots: 'gloves amulet ring', lo: 8, hi: 18, w: 7, apply(m, v) { m.incAttack += v / 100; } },
  proj:      { t: '+{v}% ดาเมจ Projectile', adj: 'Archer\'s', slots: 'gloves amulet ring', lo: 8, hi: 18, w: 7, apply(m, v) { m.incProj += v / 100; } },
  ele:       { t: '+{v}% ดาเมจธาตุ', adj: 'Prismatic', slots: 'gloves amulet ring helm', lo: 8, hi: 18, w: 8, apply(m, v) { m.incEle += v / 100; } },
  phys:      { t: '+{v}% ดาเมจกายภาพ', adj: 'Cruel', slots: 'gloves amulet ring', lo: 8, hi: 18, w: 7, apply(m, v) { m.incPhys += v / 100; } },
  chaos:     { t: '+{v}% ดาเมจเคออส', adj: 'Vile', slots: 'amulet ring body', lo: 8, hi: 18, w: 6, apply(m, v) { m.incChaos += v / 100; } },
  minion:    { t: '+{v}% ดาเมจมินเนียน', adj: 'Commanding', slots: 'helm amulet ring', lo: 10, hi: 20, w: 6, apply(m, v) { m.incMinion += v / 100; } },
  dot:       { t: '+{v}% ดาเมจ DoT', adj: 'Festering', slots: 'amulet ring body', lo: 8, hi: 16, w: 6, apply(m, v) { m.incDot += v / 100; } },
  area:      { t: '+{v}% พื้นที่', adj: 'Vast', slots: 'helm amulet', lo: 5, hi: 12, w: 6, apply(m, v) { m.areaInc += v / 100; } },
  speed:     { t: '+{v}% ความเร็วร่าย/โจมตี', adj: 'Quick', slots: 'gloves ring amulet', lo: 4, hi: 9, w: 7, apply(m, v) { m.speedInc += v / 100; } },
  crit:      { t: '+{v}% โอกาสคริ (base)', adj: 'Keen', slots: 'helm gloves amulet ring', lo: 0.4, hi: 1, dec: 1, w: 5, apply(m, v) { m.critAdd += v / 100; } },
  critmulti: { t: '+{v}% ตัวคูณคริ', adj: 'Lethal', slots: 'amulet ring gloves', lo: 10, hi: 25, w: 5, apply(m, v) { m.critMulti += v / 100; } },
  duration:  { t: '+{v}% ระยะเวลาสกิล', adj: 'Lasting', slots: 'helm body', lo: 6, hi: 15, w: 5, apply(m, v) { m.durInc += v / 100; } },
  xp:        { t: '+{v}% ค่าประสบการณ์', adj: 'Wise', slots: 'helm amulet', lo: 4, hi: 10, w: 4, apply(m, v) { m.xpInc += v / 100; } },
  pickup:    { t: '+{v}% ระยะดูดของ', adj: 'Magnetic', slots: 'boots ring', lo: 10, hi: 25, w: 4, apply(m, v) { m.pickupInc += v / 100; } },
  flask:     { t: 'ฟลาสก์ได้ชาร์จ +{v}%', adj: 'Brewer\'s', slots: 'body boots', lo: 10, hi: 25, w: 4, apply(m, v) { m.flaskCharge += v / 100; } },
  leech:     { t: 'ดูดชีวิต {v}% ของดาเมจ', adj: 'Vampiric', slots: 'gloves ring', lo: 0.3, hi: 0.8, dec: 1, w: 4, apply(m, v) { m.leech += v / 100; } },
  gemlevel:  { t: '+{v} เลเวลเจมสกิลทั้งหมด', adj: 'Exalted', slots: 'amulet', lo: 1, hi: 1, fixed: true, w: 2, rareOnly: true, apply(m, v) { m.gemLevel += v; } },
  projcount: { t: '+{v} Projectile', adj: 'Splitting', slots: 'gloves', lo: 1, hi: 1, fixed: true, w: 1.5, rareOnly: true, apply(m, v) { m.projAdd += v; } },
  // implicit-only
  alldmg:    { t: '+{v}% ดาเมจ Spell / Attack / มินเนียน', slots: '', lo: 6, hi: 6, apply(m, v) { m.incSpell += v / 100; m.incAttack += v / 100; m.incMinion += v / 100; } },
};

// Uniques: fixed lines (text + apply) — all original designs
const UNIQUES = {
  crown_of_cinders: { slot: 'helm', name: 'Crown of Cinders', th: 'มงกุฎเถ้าถ่าน', flavor: 'ไฟไม่เคยลืมสิ่งที่มันเผา',
    lines: ['+6% ชีวิตสูงสุด', 'ทุกสกิลมีโอกาส Ignite +25%', 'ดาเมจเผาไหม้ 20% more', 'ศัตรูที่ติด Ignite ตายแล้วระเบิด (Wildfire)'],
    apply(m) { m.lifeInc += 0.06; m.igniteAdd += 0.25; m.burnMore *= 1.2; m.ks.igniteBurst = true; } },
  bone_king: { slot: 'helm', name: 'Diadem of the Bone King', th: 'มงกุฎราชากระดูก', flavor: 'ผู้ตายไม่เคยปฏิเสธคำสั่งของเขา',
    lines: ['+20% ดาเมจมินเนียน', 'มินเนียนสูงสุด +1', 'ศัตรูที่ถูกมินเนียนฆ่าระเบิดเป็นไฟ (Pyre Rite)'],
    apply(m) { m.incMinion += 0.2; m.minionCount += 1; m.ks.minionKillBoom = true; } },
  executioners_hood: { slot: 'helm', name: "Executioner's Hood", th: 'ผ้าคลุมเพชฌฆาต', flavor: 'หนึ่งคมดาบ หนึ่งคำตัดสิน',
    lines: ['+1% โอกาสคริ (base)', '+25% ตัวคูณคริ', 'คริใส่ศัตรูที่ไม่ใช่บอสชีวิตต่ำกว่า 30% = ตายทันที'],
    apply(m) { m.critAdd += 0.01; m.critMulti += 0.25; m.ks.critCull = true; } },
  heart_of_mountain: { slot: 'body', name: 'Heart of the Mountain', th: 'ใจกลางขุนเขา', flavor: 'ภูเขาไม่หลบ ภูเขารอ',
    lines: ['+40% ชีวิตสูงสุด', 'รับดาเมจ 10% less', 'ความเร็วเคลื่อนที่ 6% less'],
    apply(m) { m.lifeInc += 0.4; m.dmgTaken *= 0.9; m.moveMore *= 0.94; } },
  sanctified_plate: { slot: 'body', name: 'Sanctified Plate', th: 'เกราะศักดิ์สิทธิ์', flavor: 'ทุกบาดแผลคือคำอธิษฐาน',
    lines: ['+8% ชีวิตสูงสุด', 'ทุก 6 วิ ได้โล่กันดาเมจ 1 ครั้ง (Divine Aegis)', 'โดนโจมตีแล้วปล่อยคลื่นแสง (Retribution)'],
    apply(m) { m.lifeInc += 0.08; m.ks.aegis = true; m.ks.retaliate = true; } },
  glass_sage: { slot: 'body', name: 'Robe of the Glass Sage', th: 'เสื้อคลุมปราชญ์แก้ว', flavor: 'ความรู้ทำให้แข็งแกร่ง แต่เปราะบาง',
    lines: ['ทุกสกิลทำดาเมจ 25% more', '+10% ความเร็วร่าย/โจมตี', 'ชีวิตสูงสุด 20% less'],
    apply(m) { m.moreAll *= 1.25; m.speedInc += 0.1; m.lifeMore *= 0.8; } },
  plague_shroud: { slot: 'body', name: 'Plague Shroud', th: 'ผ้าห่อศพโรคระบาด', flavor: 'ความเน่าเปื่อยคือการเกิดใหม่',
    lines: ['+25% ดาเมจเคออส', 'ทุกสกิลมีโอกาส Poison +20%', 'ศัตรูที่ติด Poison ตายแล้วระเบิด (Plague Burst)'],
    apply(m) { m.incChaos += 0.25; m.poisonAdd += 0.2; m.ks.poisonBurst = true; } },
  stormcallers_grip: { slot: 'gloves', name: "Stormcaller's Grip", th: 'ถุงมือผู้เรียกพายุ', flavor: 'ฟ้าร้องตอบรับทุกครั้งที่กำหมัด',
    lines: ['+10% ดาเมจธาตุ', 'ทุกสกิลมีโอกาส Shock +15%', 'ทุก 2.5 วิ ฟ้าผ่าศัตรู 4 ตัวรอบตัว (Thunderclap)'],
    apply(m) { m.incEle += 0.1; m.shockAdd += 0.15; m.ks.thunder = true; } },
  butchers_mitts: { slot: 'gloves', name: "Butcher's Mitts", th: 'ถุงมือคนขายเนื้อ', flavor: 'ไม่มีอะไรเสียเปล่า',
    lines: ['+20% ดาเมจกายภาพ', '+6% ความเร็วร่าย/โจมตี', 'Hit กายภาพ 30% Impale (ดาเมจซ้ำ 60%)'],
    apply(m) { m.incPhys += 0.2; m.speedInc += 0.06; m.ks.impale = true; } },
  hydra_hands: { slot: 'gloves', name: 'Hands of the Hydra', th: 'มือไฮดรา', flavor: 'ตัดหนึ่ง งอกสอง',
    lines: ['+1 Projectile ให้ทุกสกิล Projectile', '+10% ความเร็วกระสุน', 'ทุกสกิลทำดาเมจ 10% less'],
    apply(m) { m.projAdd += 1; m.projSpeedInc += 0.1; m.moreAll *= 0.9; } },
  windwalker: { slot: 'boots', name: 'Windwalker Treads', th: 'รองเท้าเดินลม', flavor: 'เงาของเขามาถึงก่อนตัว',
    lines: ['+20% ความเร็วเคลื่อนที่', 'คูลดาวน์ Dash 40% สั้นลง', 'หลัง Dash คริแน่นอน 1.5 วิ (Shadowstep)'],
    apply(m) { m.moveInc += 0.2; m.dashCdMul *= 0.6; m.ks.shadowstep = true; } },
  bloodied_greaves: { slot: 'boots', name: 'Bloodied Greaves', th: 'แข้งเปื้อนเลือด', flavor: 'ยิ่งใกล้ความตาย ยิ่งใกล้ชัยชนะ',
    lines: ['+10% ความเร็วเคลื่อนที่', 'ดูดชีวิต 1% ของดาเมจ', 'ดาเมจ 40% more เมื่อชีวิตต่ำกว่า 50% (Death Wish)'],
    apply(m) { m.moveInc += 0.1; m.leech += 0.01; m.ks.lowLifeDmg = true; } },
  eye_of_void: { slot: 'amulet', name: 'Eye of the Void', th: 'ดวงตาแห่งความว่างเปล่า', flavor: 'เมื่อจ้องความว่างเปล่า มันก็สอนเจ้า',
    lines: ['+2 เลเวลเจมสกิลทั้งหมด', 'ชีวิตสูงสุด 10% less'],
    apply(m) { m.gemLevel += 2; m.lifeMore *= 0.9; } },
  bloodstone: { slot: 'amulet', name: 'Bloodstone Pendant', th: 'จี้หินโลหิต', flavor: 'มันเต้นตามจังหวะการฆ่า',
    lines: ['+15% ดาเมจ Attack', 'ดูดชีวิต 1% ของดาเมจ', 'ฆ่าศัตรูได้ Rage (สูงสุด 30)'],
    apply(m) { m.incAttack += 0.15; m.leech += 0.01; m.ks.rage = true; } },
  heralds_sigil: { slot: 'amulet', name: "Herald's Sigil", th: 'ตราผู้ประกาศ', flavor: 'ธาตุทั้งสี่ก้มหัวให้ผู้ถือ',
    lines: ['+1 เลเวลเจมสกิลทั้งหมด', 'ดาเมจธาตุ 15% more', '+10% พื้นที่'],
    apply(m) { m.gemLevel += 1; m.moreEle *= 1.15; m.areaInc += 0.1; } },
  endless_night: { slot: 'ring', name: 'Band of Endless Night', th: 'แหวนรัตติกาลนิรันดร์', flavor: 'ความมืดกระซิบชื่อของศัตรู',
    lines: ['+15% ดาเมจเคออส', '+10% ดาเมจ DoT', 'ศัตรูในระยะ 220 รับดาเมจ 20% more (Hex Field)'],
    apply(m) { m.incChaos += 0.15; m.incDot += 0.1; m.ks.hexField = true; } },
  ouroboros: { slot: 'ring', name: 'Ouroboros Loop', th: 'วงแหวนงูกินหาง', flavor: 'จุดจบคือจุดเริ่ม',
    lines: ['Vaal ใช้วิญญาณน้อยลง 40%', '+10% ระยะเวลาสกิล'],
    apply(m) { m.vaalSoulMul *= 0.6; m.durInc += 0.1; } },
  hunters_signet: { slot: 'ring', name: "Hunter's Signet", th: 'แหวนนักล่า', flavor: 'เหยื่อที่ไกลที่สุดหวานที่สุด',
    lines: ['+15% ดาเมจ Projectile', '+10% ความเร็วกระสุน', 'Projectile แรงขึ้นตามระยะ (Far Shot)'],
    apply(m) { m.incProj += 0.15; m.projSpeedInc += 0.1; m.ks.farShot = true; } },
};

const ITEM_PREFIX = ['Doom', 'Storm', 'Grim', 'Blood', 'Dusk', 'Rune', 'Shadow', 'Ember', 'Gloom', 'Wraith', 'Dread', 'Pale', 'Hate', 'Soul', 'Bone', 'Viper'];
const ITEM_SUFFIX = {
  helm: ['Crown', 'Visage', 'Cowl', 'Brow'], body: ['Shell', 'Coat', 'Carapace', 'Hide'], gloves: ['Grip', 'Fist', 'Clutch', 'Talons'],
  boots: ['Stride', 'Tread', 'Spur', 'March'], amulet: ['Charm', 'Locket', 'Talisman', 'Heart'], ring: ['Loop', 'Band', 'Coil', 'Knot'],
};

// item level factor: early drops roll ×1, drops at 20:00 roll ×1.8
function itemScale(time) { return 1 + Math.min(1, time / 1200) * 0.8; }

function rollAffix(id, scale) {
  const a = AFFIXES[id];
  const raw = a.fixed ? a.lo : (a.lo + Math.random() * (a.hi - a.lo)) * scale;
  const p = Math.pow(10, a.dec || 0);
  return { id, v: Math.max(a.dec ? 1 / p : 1, Math.round(raw * p) / p) };
}

function makeItem(rarity, slot, time) {
  slot = slot || pick(ITEM_SLOTS);
  if (rarity === 'unique') {
    const pool = Object.keys(UNIQUES).filter((u) => UNIQUES[u].slot === slot);
    const id = pick(pool.length ? pool : Object.keys(UNIQUES));
    return { uid: uid(), rarity, slot: UNIQUES[id].slot, unique: id, name: UNIQUES[id].name, base: '', affixes: [] };
  }
  const base = pick(ITEM_BASES[slot]), scale = itemScale(time);
  const n = rarity === 'rare' ? 3 + (Math.random() < 0.45 ? 1 : 0) : 1 + (Math.random() < 0.5 ? 1 : 0);
  const pool = Object.keys(AFFIXES).filter((id) => AFFIXES[id].slots.split(' ').includes(slot) && (rarity === 'rare' || !AFFIXES[id].rareOnly));
  const ids = weightedSample(pool, Math.min(n, pool.length), (id) => AFFIXES[id].w);
  const affixes = ids.map((id) => rollAffix(id, scale));
  const name = rarity === 'rare'
    ? `${pick(ITEM_PREFIX)} ${pick(ITEM_SUFFIX[slot])}`
    : `${AFFIXES[ids[0]].adj} ${base.name}`;
  return { uid: uid(), rarity, slot, name, base: base.name, implicit: { id: base.imp, v: base.iv }, affixes };
}

// human-readable mod lines for UI
function affixText(a) { return AFFIXES[a.id].t.replace('{v}', a.v); }
function itemLines(it) {
  if (it.unique) return UNIQUES[it.unique].lines.slice();
  return it.affixes.map(affixText);
}
function applyItem(it, m) {
  if (it.unique) { UNIQUES[it.unique].apply(m); return; }
  if (it.implicit) AFFIXES[it.implicit.id].apply(m, it.implicit.v);
  for (const a of it.affixes) AFFIXES[a.id].apply(m, a.v);
}
