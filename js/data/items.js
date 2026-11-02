'use strict';
// ============================================================
//  ITEMS — equipment found during a run (reset every run)
//  PoE-style: 10 equipment slots + 5 flask slots, base types with
//  defences (Armour / Evasion / Energy Shield) or weapon stats,
//  Prefix / Suffix affixes with tiers gated by item level,
//  quality and corruption. Support sockets belong to skills, not equipment.
//  Items are plain data and become player mods through the tables.
// ============================================================
const ITEM_SLOTS = ['weapon', 'offhand', 'helm', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'ring2'];
const JEWELLERS = {
  jeweller3: { sockets: 3, name: "Jeweller's Orb 3", th: 'เพิ่มช่อง Support ของสกิลเป็น 3 ช่อง', icon: '⬡', color: '#c8d0db', w: 6, rarity: 'พบบ่อย' },
  jeweller4: { sockets: 4, name: "Jeweller's Orb 4", th: 'เพิ่มช่อง Support ของสกิลเป็น 4 ช่อง', icon: '⬡', color: '#8ab4ff', w: 1.8, rarity: 'พบน้อย' },
  jeweller5: { sockets: 5, name: "Jeweller's Orb 5", th: 'เพิ่มช่อง Support ของสกิลเป็น 5 ช่อง', icon: '⬡', color: '#ffe28a', w: 0.35, rarity: 'หายาก' },
  jeweller6: { sockets: 6, name: "Jeweller's Orb 6", th: 'เพิ่มช่อง Support ของสกิลเป็น 6 ช่อง', icon: '⬡', color: '#eea0ff', w: 0.04, rarity: 'หายากมาก' },
};
const randomJeweller = () => weightedSample(Object.keys(JEWELLERS), 1, (id) => JEWELLERS[id].w)[0];
function stripEquipmentSockets(it) {
  if (it && it.slot !== 'jewel') { delete it.sockets; delete it.links; }
  return it;
}
const FLASK_SLOTS = 5;
const SLOT_NAME = { jewel: 'Jewel', weapon: 'อาวุธ', offhand: 'มือรอง', helm: 'หมวก', body: 'เกราะ', gloves: 'ถุงมือ', boots: 'รองเท้า', belt: 'เข็มขัด',
  amulet: 'สร้อยคอ', ring: 'แหวน', ring2: 'แหวน', flask: 'ฟลาสก์' };
const RARITY_COLOR = { normal: '#c8c8c8', magic: '#8a8cff', rare: '#ffe866', unique: '#e8883a' };
const RARITY_NAME = { normal: 'Normal', magic: 'Magic', rare: 'Rare', unique: 'Unique' };
const GRID_W = 12, GRID_H = 5;
const SALVAGE_SHARDS = { normal: 0, magic: 1, rare: 3, unique: 8 };
const WEAPON_TYPE = { bow: 'ธนู', staff: 'คทายาว', wand: 'ไม้กายสิทธิ์', sceptre: 'คทา', sword: 'ดาบ', axe: 'ขวาน', dagger: 'มีดสั้น', mace: 'กระบอง' };

// ---------------- base types ----------------
// def: base Armour / Evasion / Energy Shield · w: weapon stats · size: [w, h] grid cells
const BASES = {};
function defBase(id, d) { d.id = id; d.size = d.size || [2, 2]; BASES[id] = d; }
// weapons — pd: physical damage, aps: attacks per second, crit (%), hands
defBase('short_bow',      { slot: 'weapon', name: 'Short Bow', size: [2, 3], w: { type: 'bow', hands: 2, pd: 10, aps: 1.4, crit: 5 } });
defBase('long_bow',       { slot: 'weapon', name: 'Long Bow', size: [2, 4], w: { type: 'bow', hands: 2, pd: 14, aps: 1.2, crit: 6 }, imp: ['proj', 8] });
defBase('gnarled_staff',  { slot: 'weapon', name: 'Gnarled Staff', size: [2, 4], w: { type: 'staff', hands: 2, pd: 12, aps: 1.2, crit: 6 }, imp: ['spell', 16] });
defBase('driftwood_wand', { slot: 'weapon', name: 'Driftwood Wand', size: [1, 3], w: { type: 'wand', hands: 1, pd: 5, aps: 1.4, crit: 7 }, imp: ['spell', 10] });
defBase('driftwood_sceptre', { slot: 'weapon', name: 'Driftwood Sceptre', size: [1, 3], w: { type: 'sceptre', hands: 1, pd: 8, aps: 1.25, crit: 6 }, imp: ['ele', 10] });
defBase('rusted_sword',   { slot: 'weapon', name: 'Rusted Sword', size: [1, 3], w: { type: 'sword', hands: 1, pd: 9, aps: 1.5, crit: 5 }, imp: ['attack', 8] });
defBase('woodsplitter',   { slot: 'weapon', name: 'Woodsplitter', size: [2, 4], w: { type: 'axe', hands: 2, pd: 16, aps: 1.15, crit: 5 } });
defBase('glass_shank',    { slot: 'weapon', name: 'Glass Shank', size: [1, 2], w: { type: 'dagger', hands: 1, pd: 6, aps: 1.5, crit: 7.5 }, imp: ['critmulti', 20] });
defBase('driftwood_club', { slot: 'weapon', name: 'Driftwood Club', size: [2, 3], w: { type: 'mace', hands: 1, pd: 9, aps: 1.3, crit: 5 }, imp: ['area', 8] });
// off-hands
defBase('tower_shield',   { slot: 'offhand', name: 'Splintered Tower Shield', size: [2, 3], def: { ar: 40 }, block: 22 });
defBase('buckler',        { slot: 'offhand', name: 'Goathide Buckler', size: [2, 2], def: { ev: 35 }, block: 20 });
defBase('spirit_shield',  { slot: 'offhand', name: 'Twig Spirit Shield', size: [2, 2], def: { es: 18 }, block: 18, imp: ['spell', 6] });
defBase('quiver',         { slot: 'offhand', name: 'Serrated Arrow Quiver', size: [2, 3], quiver: true, imp: ['proj', 10] });
// armour: Armour (str) / Evasion (dex) / Energy Shield (int) / hybrids
defBase('iron_hat',       { slot: 'helm', name: 'Iron Hat', def: { ar: 20 } });
defBase('leather_cap',    { slot: 'helm', name: 'Leather Cap', def: { ev: 20 } });
defBase('silk_hood',      { slot: 'helm', name: 'Silk Hood', def: { es: 12 } });
defBase('soldier_helm',   { slot: 'helm', name: 'Soldier Helmet', def: { ar: 12, ev: 12 } });
defBase('plate_vest',     { slot: 'body', name: 'Plate Vest', size: [2, 3], def: { ar: 45 } });
defBase('leather_tunic',  { slot: 'body', name: 'Shabby Jerkin', size: [2, 3], def: { ev: 45 } });
defBase('silk_robe',      { slot: 'body', name: 'Simple Robe', size: [2, 3], def: { es: 28 } });
defBase('scale_doublet',  { slot: 'body', name: 'Scale Vest', size: [2, 3], def: { ar: 25, ev: 25 } });
defBase('chain_tunic',    { slot: 'body', name: 'Chainmail Vest', size: [2, 3], def: { ar: 25, es: 15 } });
defBase('iron_gauntlets', { slot: 'gloves', name: 'Iron Gauntlets', def: { ar: 15 } });
defBase('leather_gloves', { slot: 'gloves', name: 'Rawhide Gloves', def: { ev: 15 } });
defBase('silk_gloves',    { slot: 'gloves', name: 'Wool Gloves', def: { es: 9 } });
defBase('fish_gauntlets', { slot: 'gloves', name: 'Fishscale Gauntlets', def: { ar: 9, ev: 9 } });
defBase('iron_greaves',   { slot: 'boots', name: 'Iron Greaves', def: { ar: 16 } });
defBase('leather_boots',  { slot: 'boots', name: 'Rawhide Boots', def: { ev: 16 } });
defBase('silk_slippers',  { slot: 'boots', name: 'Wool Shoes', def: { es: 10 } });
defBase('chain_boots',    { slot: 'boots', name: 'Chain Boots', def: { ar: 9, es: 6 } });
// jewellery
defBase('leather_belt',   { slot: 'belt', name: 'Leather Belt', size: [2, 1], imp: ['lifeflat', 25] });
defBase('heavy_belt',     { slot: 'belt', name: 'Heavy Belt', size: [2, 1], imp: ['flatar', 60] });
defBase('chain_belt',     { slot: 'belt', name: 'Chain Belt', size: [2, 1], imp: ['flates', 15] });
defBase('rustic_sash',    { slot: 'belt', name: 'Rustic Sash', size: [2, 1], imp: ['flask', 15] });
defBase('jade_amulet',    { slot: 'amulet', name: 'Jade Amulet', size: [1, 1], imp: ['alldmg', 6] });
defBase('coral_amulet',   { slot: 'amulet', name: 'Coral Amulet', size: [1, 1], imp: ['regen', 0.2] });
defBase('amber_amulet',   { slot: 'amulet', name: 'Amber Amulet', size: [1, 1], imp: ['phys', 10] });
defBase('lapis_amulet',   { slot: 'amulet', name: 'Lapis Amulet', size: [1, 1], imp: ['spell', 10] });
defBase('iron_ring',      { slot: 'ring', name: 'Iron Ring', size: [1, 1], imp: ['phys', 6] });
defBase('ruby_ring',      { slot: 'ring', name: 'Ruby Ring', size: [1, 1], imp: ['fireres', 20] });
defBase('sapphire_ring',  { slot: 'ring', name: 'Sapphire Ring', size: [1, 1], imp: ['coldres', 20] });
defBase('topaz_ring',     { slot: 'ring', name: 'Topaz Ring', size: [1, 1], imp: ['lightres', 20] });
defBase('amethyst_ring',  { slot: 'ring', name: 'Amethyst Ring', size: [1, 1], imp: ['chaosres', 15] });
defBase('prismatic_ring', { slot: 'ring', name: 'Prismatic Ring', size: [1, 1], imp: ['allres', 8], rare: true });
defBase('coral_ring',     { slot: 'ring', name: 'Coral Ring', size: [1, 1], imp: ['lifeflat', 20] });
defBase('two_stone_ring', { slot: 'ring', name: 'Two-Stone Ring', size: [1, 1], imp: ['ele', 12], rare: true });
defBase('turquoise_amulet', { slot: 'amulet', name: 'Turquoise Amulet', size: [1, 1], imp: ['allres', 6] });
// jewels — socketed into the Legacy Tree between runs (colour biases their mods)
defBase('crimson_jewel',  { slot: 'jewel', name: 'Crimson Jewel', size: [1, 1], jewel: 'R' });
defBase('viridian_jewel', { slot: 'jewel', name: 'Viridian Jewel', size: [1, 1], jewel: 'G' });
defBase('cobalt_jewel',   { slot: 'jewel', name: 'Cobalt Jewel', size: [1, 1], jewel: 'B' });
// flasks — kind decides the effect while active
defBase('life_flask',     { slot: 'flask', name: 'Life Flask', size: [1, 2], flask: { kind: 'life', max: 60, use: 20, dur: 2.5 } });
defBase('quicksilver',    { slot: 'flask', name: 'Quicksilver Flask', size: [1, 2], flask: { kind: 'quick', max: 50, use: 25, dur: 4 } });
defBase('granite_flask',  { slot: 'flask', name: 'Granite Flask', size: [1, 2], flask: { kind: 'granite', max: 50, use: 25, dur: 4.5 } });
defBase('jade_flask',     { slot: 'flask', name: 'Jade Flask', size: [1, 2], flask: { kind: 'jade', max: 50, use: 25, dur: 4.5 } });
defBase('silver_flask',   { slot: 'flask', name: 'Silver Flask', size: [1, 2], flask: { kind: 'silver', max: 60, use: 30, dur: 4 } });
defBase('sulphur_flask',  { slot: 'flask', name: 'Sulphur Flask', size: [1, 2], flask: { kind: 'sulphur', max: 60, use: 30, dur: 4 } });
defBase('diamond_flask',  { slot: 'flask', name: 'Diamond Flask', size: [1, 2], flask: { kind: 'diamond', max: 60, use: 30, dur: 4 } });
defBase('ruby_flask',     { slot: 'flask', name: 'Ruby Flask', size: [1, 2], flask: { kind: 'ruby', max: 50, use: 25, dur: 4.5 } });
defBase('sapphire_flask', { slot: 'flask', name: 'Sapphire Flask', size: [1, 2], flask: { kind: 'sapphire', max: 50, use: 25, dur: 4.5 } });
defBase('topaz_flask',    { slot: 'flask', name: 'Topaz Flask', size: [1, 2], flask: { kind: 'topaz', max: 50, use: 25, dur: 4.5 } });
defBase('amethyst_flask', { slot: 'flask', name: 'Amethyst Flask', size: [1, 2], flask: { kind: 'amethyst', max: 50, use: 25, dur: 4.5 } });
const FLASK_DESC = {
  life: 'ฟื้นชีวิต 55% ใน 2.5 วิ', quick: 'เคลื่อนที่เร็วขึ้น 40%', granite: '+Armour 100% และ +300 Armour', jade: '+Evasion 100% และ +300 Evasion',
  silver: 'ร่าย/โจมตีเร็วขึ้น 20% (Onslaught)', sulphur: 'ทุกสกิลทำดาเมจ 25% more', diamond: 'โอกาสคริ ×2 (Lucky)',
  ruby: '+40% ต้านทานไฟ · +5% ต้านทานไฟสูงสุด', sapphire: '+40% ต้านทานน้ำแข็ง · +5% ต้านทานน้ำแข็งสูงสุด',
  topaz: '+40% ต้านทานสายฟ้า · +5% ต้านทานสายฟ้าสูงสุด', amethyst: '+35% ต้านทานเคออส',
};
const FLASK_COLOR = { life: '#d0302a', quick: '#9ad2ff', granite: '#a89a80', jade: '#4fd08a', silver: '#e8e8f0', sulphur: '#f0d040', diamond: '#c0f0ff',
  ruby: '#ff4a3a', sapphire: '#3a7aff', topaz: '#ffd83a', amethyst: '#b04aff' };

// item level: rises through the run and with map tier — gates affix tiers
function itemLevel(time, tier) { return Math.max(1, Math.min(86, Math.floor(1 + (time / 60) * GAME_PACE * 3.2 + ((tier || 1) - 1) * 5))); }
const defScale = (ilvl) => 1 + ilvl / 35;
const pdScale = (ilvl) => 1 + ilvl / 60;

// ---------------- affixes ----------------
// P = prefix, S = suffix · tiers T1 (best) .. T7 gated by item level
// slots: equipment types that can roll it · def: needs that defence on the base
// wk: 'caster' only on wands / sceptres / staves · local: modifies the item itself
const TIER_ILVL = [72, 58, 44, 32, 20, 10, 1];
const TIER_MULT = [2.2, 1.95, 1.7, 1.5, 1.3, 1.15, 1];
const AFFIXES = {
  lifeflat:  { type: 'P', t: '+{v} ชีวิตสูงสุด', nm: 'Healthy', slots: 'helm body gloves boots belt amulet ring offhand', lo: 10, hi: 20, w: 10, apply(m, v) { m.lifeFlat += v; } },
  life:      { type: 'P', t: '+{v}% ชีวิตสูงสุด', nm: 'Robust', slots: 'body belt amulet', lo: 3, hi: 6, w: 5, apply(m, v) { m.lifeInc += v / 100; } },
  flatar:    { type: 'P', t: '+{v} Armour', nm: 'Lacquered', slots: 'helm body gloves boots offhand belt', def: 'ar', lo: 20, hi: 45, w: 7, apply(m, v) { m.armour += v; } },
  flatev:    { type: 'P', t: '+{v} Evasion', nm: 'Agile', slots: 'helm body gloves boots offhand ring', def: 'ev', lo: 20, hi: 45, w: 7, apply(m, v) { m.evasion += v; } },
  flates:    { type: 'P', t: '+{v} Energy Shield', nm: 'Shining', slots: 'helm body gloves boots offhand belt amulet ring', def: 'es', lo: 8, hi: 16, w: 7, apply(m, v) { m.es += v; } },
  ldef:      { type: 'P', t: '+{v}% Armour / Evasion / ES ของไอเทมนี้', nm: 'Reinforced', slots: 'helm body gloves boots offhand', local: true, lo: 15, hi: 30, w: 8, apply() {} },
  lphys:     { type: 'P', t: '+{v}% ดาเมจกายภาพของอาวุธ', nm: 'Heavy', slots: 'weapon', local: true, lo: 15, hi: 30, w: 9, apply() {} },
  lflat:     { type: 'P', t: 'อาวุธ +{v} ดาเมจกายภาพ', nm: 'Glinting', slots: 'weapon', local: true, lo: 2, hi: 4, w: 7, apply() {} },
  spell:     { type: 'P', t: '+{v}% ดาเมจ Spell', nm: 'Apprentice\'s', slots: 'weapon helm gloves amulet ring offhand', wk: 'caster', lo: 8, hi: 16, w: 7, apply(m, v) { m.incSpell += v / 100; } },
  attack:    { type: 'P', t: '+{v}% ดาเมจ Attack', nm: 'Martial', slots: 'gloves amulet ring offhand', lo: 8, hi: 16, w: 6, apply(m, v) { m.incAttack += v / 100; } },
  proj:      { type: 'P', t: '+{v}% ดาเมจ Projectile', nm: 'Archer\'s', slots: 'gloves amulet ring offhand', lo: 8, hi: 16, w: 6, apply(m, v) { m.incProj += v / 100; } },
  ele:       { type: 'P', t: '+{v}% ดาเมจธาตุ', nm: 'Prismatic', slots: 'weapon gloves amulet ring helm', wk: 'caster', lo: 8, hi: 16, w: 7, apply(m, v) { m.incEle += v / 100; } },
  phys:      { type: 'P', t: '+{v}% ดาเมจกายภาพ', nm: 'Cruel', slots: 'gloves amulet ring belt', lo: 8, hi: 16, w: 6, apply(m, v) { m.incPhys += v / 100; } },
  chaos:     { type: 'P', t: '+{v}% ดาเมจเคออส', nm: 'Vile', slots: 'amulet ring body weapon', lo: 8, hi: 16, w: 5, apply(m, v) { m.incChaos += v / 100; } },
  minion:    { type: 'P', t: '+{v}% ดาเมจมินเนียน', nm: 'Commanding', slots: 'helm amulet ring weapon', wk: 'caster', lo: 10, hi: 18, w: 5, apply(m, v) { m.incMinion += v / 100; } },
  gemlevel:  { type: 'P', t: '+{v} เลเวลเจมสกิลทั้งหมด', nm: 'Exalted', slots: 'amulet weapon', wk: 'caster', lo: 1, hi: 1, fixed: true, w: 1.5, rareOnly: true, apply(m, v) { m.gemLevel += v; } },
  projcount: { type: 'P', t: '+{v} Projectile', nm: 'Splitting', slots: 'gloves offhand', lo: 1, hi: 1, fixed: true, w: 1.2, rareOnly: true, apply(m, v) { m.projAdd += v; } },
  move:      { type: 'S', t: '+{v}% ความเร็วเคลื่อนที่', nm: 'of the Hare', slots: 'boots', lo: 5, hi: 10, w: 12, apply(m, v) { m.moveInc += v / 100; } },
  speed:     { type: 'S', t: '+{v}% ความเร็วร่าย/โจมตี', nm: 'of Skill', slots: 'gloves ring amulet weapon offhand', lo: 4, hi: 8, w: 7, apply(m, v) { m.speedInc += v / 100; } },
  laspd:     { type: 'S', t: '+{v}% ความเร็วโจมตีของอาวุธ', nm: 'of Mastery', slots: 'weapon', local: true, lo: 6, hi: 11, w: 7, apply() {} },
  lcrit:     { type: 'S', t: '+{v}% โอกาสคริของอาวุธ', nm: 'of Needling', slots: 'weapon', local: true, lo: 10, hi: 20, w: 6, apply() {} },
  crit:      { type: 'S', t: '+{v}% โอกาสคริ (base)', nm: 'of Precision', slots: 'helm gloves amulet ring', lo: 0.4, hi: 0.9, dec: 1, w: 5, apply(m, v) { m.critAdd += v / 100; } },
  critmulti: { type: 'S', t: '+{v}% ตัวคูณคริ', nm: 'of Ire', slots: 'amulet ring gloves weapon offhand', lo: 10, hi: 20, w: 5, apply(m, v) { m.critMulti += v / 100; } },
  regen:     { type: 'S', t: 'ฟื้นชีวิต +{v}%/วิ', nm: 'of the Troll', slots: 'helm body amulet ring belt', lo: 0.1, hi: 0.25, dec: 2, w: 5, apply(m, v) { m.regen += v / 100; } },
  dot:       { type: 'S', t: '+{v}% ดาเมจ DoT', nm: 'of Decay', slots: 'amulet ring body weapon', lo: 8, hi: 15, w: 5, apply(m, v) { m.incDot += v / 100; } },
  area:      { type: 'S', t: '+{v}% พื้นที่', nm: 'of Expanse', slots: 'helm amulet weapon', lo: 5, hi: 10, w: 5, apply(m, v) { m.areaInc += v / 100; } },
  duration:  { type: 'S', t: '+{v}% ระยะเวลาสกิล', nm: 'of Lasting', slots: 'helm body belt', lo: 6, hi: 12, w: 4, apply(m, v) { m.durInc += v / 100; } },
  xp:        { type: 'S', t: '+{v}% ค่าประสบการณ์', nm: 'of Wisdom', slots: 'helm amulet', lo: 4, hi: 8, w: 4, apply(m, v) { m.xpInc += v / 100; } },
  pickup:    { type: 'S', t: '+{v}% ระยะดูดของ', nm: 'of the Magpie', slots: 'boots ring belt', lo: 10, hi: 20, w: 4, apply(m, v) { m.pickupInc += v / 100; } },
  flask:     { type: 'S', t: 'ฟลาสก์ได้ชาร์จ +{v}%', nm: 'of the Brewer', slots: 'body boots belt', lo: 10, hi: 20, w: 4, apply(m, v) { m.flaskCharge += v / 100; } },
  leech:     { type: 'S', t: 'ดูดชีวิต {v}% ของดาเมจ', nm: 'of the Leech', slots: 'gloves ring weapon', lo: 0.3, hi: 0.6, dec: 1, w: 4, apply(m, v) { m.leech += v / 100; } },
  evadepct:  { type: 'S', t: 'หลบการโจมตี +{v}%', nm: 'of Shadows', slots: 'body boots gloves', lo: 2, hi: 4, w: 4, apply(m, v) { m.evade += v / 100; } },
  block:     { type: 'S', t: '+{v}% โอกาส Block', nm: 'of the Wall', slots: 'offhand', lo: 3, hi: 5, w: 6, apply(m, v) { m.block += v / 100; } },
  esrecharge:{ type: 'S', t: 'ES ฟื้นเร็วขึ้น {v}%', nm: 'of Recharge', slots: 'helm body gloves boots offhand', def: 'es', lo: 15, hi: 30, w: 4, apply(m, v) { m.esRechargeInc += v / 100; } },
  // resistances: the most common suffixes, like PoE
  fireres:   { type: 'S', t: '+{v}% ต้านทานไฟ', nm: 'of the Drake', slots: 'helm body gloves boots belt amulet ring offhand', lo: 8, hi: 14, w: 9, apply(m, v) { m.resFire += v / 100; } },
  coldres:   { type: 'S', t: '+{v}% ต้านทานน้ำแข็ง', nm: 'of the Penguin', slots: 'helm body gloves boots belt amulet ring offhand', lo: 8, hi: 14, w: 9, apply(m, v) { m.resCold += v / 100; } },
  lightres:  { type: 'S', t: '+{v}% ต้านทานสายฟ้า', nm: 'of the Squall', slots: 'helm body gloves boots belt amulet ring offhand', lo: 8, hi: 14, w: 9, apply(m, v) { m.resLight += v / 100; } },
  allres:    { type: 'S', t: '+{v}% ต้านทานธาตุทั้งหมด', nm: 'of the Prism', slots: 'amulet ring offhand', lo: 4, hi: 7, w: 3, apply(m, v) { m.resFire += v / 100; m.resCold += v / 100; m.resLight += v / 100; } },
  chaosres:  { type: 'S', t: '+{v}% ต้านทานเคออส', nm: 'of the Lost', slots: 'body belt amulet ring', lo: 5, hi: 10, w: 3, apply(m, v) { m.resChaos += v / 100; } },
  maxres:    { type: 'P', t: '+{v}% ต้านทานธาตุสูงสุด', nm: 'Unassailable', slots: 'body offhand', lo: 1, hi: 1, fixed: true, w: 0.6, rareOnly: true, apply(m, v) { m.maxRes += v / 100; } },
  // implicit-only
  alldmg:    { t: '+{v}% ดาเมจ Spell / Attack / มินเนียน', slots: '', lo: 6, hi: 6, apply(m, v) { m.incSpell += v / 100; m.incAttack += v / 100; m.incMinion += v / 100; } },
};

// flask affixes (magic flasks only, 1 prefix + 1 suffix)
const FLASK_AFFIXES = {
  ample:     { type: 'P', t: 'ชาร์จสูงสุด +{v}%', nm: 'Ample', lo: 30, hi: 60 },
  experimenter: { type: 'P', t: 'ระยะเวลา +{v}%', nm: "Experimenter's", lo: 20, hi: 40 },
  chemist:   { type: 'P', t: 'ใช้ชาร์จน้อยลง {v}%', nm: "Chemist's", lo: 15, hi: 25 },
  fending:   { type: 'S', t: '+{v} Armour ขณะใช้งาน', nm: 'of Fending', lo: 200, hi: 450 },
  reflexes:  { type: 'S', t: '+{v} Evasion ขณะใช้งาน', nm: 'of Reflexes', lo: 200, hi: 450 },
  adrenaline:{ type: 'S', t: '+{v}% ความเร็วเคลื่อนที่ขณะใช้งาน', nm: 'of Adrenaline', lo: 12, hi: 22 },
  rapidity:  { type: 'S', t: '+{v}% ร่าย/โจมตีเร็วขึ้นขณะใช้งาน', nm: 'of Rapidity', lo: 6, hi: 12 },
};

// jewel mods: c = jewel colour that can roll it ('' = any)
const JEWEL_MODS = {
  j_life:     { t: '+{v}% ชีวิตสูงสุด', c: 'R', lo: 4, hi: 7, apply(m, v) { m.lifeInc += v / 100; } },
  j_armour:   { t: '+{v} Armour', c: 'R', lo: 40, hi: 80, apply(m, v) { m.armour += v; } },
  j_phys:     { t: '+{v}% ดาเมจกายภาพ', c: 'R', lo: 10, hi: 16, apply(m, v) { m.incPhys += v / 100; } },
  j_attack:   { t: '+{v}% ดาเมจ Attack', c: 'R', lo: 10, hi: 16, apply(m, v) { m.incAttack += v / 100; } },
  j_area:     { t: '+{v}% พื้นที่', c: 'R', lo: 5, hi: 9, apply(m, v) { m.areaInc += v / 100; } },
  j_fireres:  { t: '+{v}% ต้านทานไฟ', c: 'R', lo: 10, hi: 15, apply(m, v) { m.resFire += v / 100; } },
  j_proj:     { t: '+{v}% ดาเมจ Projectile', c: 'G', lo: 10, hi: 16, apply(m, v) { m.incProj += v / 100; } },
  j_critm:    { t: '+{v}% ตัวคูณคริ', c: 'G', lo: 12, hi: 20, apply(m, v) { m.critMulti += v / 100; } },
  j_move:     { t: '+{v}% ความเร็วเคลื่อนที่', c: 'G', lo: 2, hi: 4, apply(m, v) { m.moveInc += v / 100; } },
  j_evasion:  { t: '+{v} Evasion', c: 'G', lo: 40, hi: 80, apply(m, v) { m.evasion += v; } },
  j_coldres:  { t: '+{v}% ต้านทานน้ำแข็ง', c: 'G', lo: 10, hi: 15, apply(m, v) { m.resCold += v / 100; } },
  j_spell:    { t: '+{v}% ดาเมจ Spell', c: 'B', lo: 10, hi: 16, apply(m, v) { m.incSpell += v / 100; } },
  j_ele:      { t: '+{v}% ดาเมจธาตุ', c: 'B', lo: 10, hi: 16, apply(m, v) { m.incEle += v / 100; } },
  j_es:       { t: '+{v} Energy Shield', c: 'B', lo: 15, hi: 30, apply(m, v) { m.es += v; } },
  j_minion:   { t: '+{v}% ดาเมจมินเนียน', c: 'B', lo: 10, hi: 16, apply(m, v) { m.incMinion += v / 100; } },
  j_lightres: { t: '+{v}% ต้านทานสายฟ้า', c: 'B', lo: 10, hi: 15, apply(m, v) { m.resLight += v / 100; } },
  j_speed:    { t: '+{v}% ความเร็วร่าย/โจมตี', c: '', lo: 3, hi: 5, apply(m, v) { m.speedInc += v / 100; } },
  j_dot:      { t: '+{v}% ดาเมจ DoT', c: '', lo: 10, hi: 16, apply(m, v) { m.incDot += v / 100; } },
  j_chaos:    { t: '+{v}% ดาเมจเคออส', c: '', lo: 10, hi: 16, apply(m, v) { m.incChaos += v / 100; } },
  j_chaosres: { t: '+{v}% ต้านทานเคออส', c: '', lo: 7, hi: 12, apply(m, v) { m.resChaos += v / 100; } },
  j_allres:   { t: '+{v}% ต้านทานธาตุทั้งหมด', c: '', lo: 5, hi: 8, apply(m, v) { m.resFire += v / 100; m.resCold += v / 100; m.resLight += v / 100; } },
};
function makeJewel(rarity) {
  const base = pick(['crimson_jewel', 'viridian_jewel', 'cobalt_jewel']), col = BASES[base].jewel;
  rarity = rarity || (Math.random() < 0.35 ? 'rare' : 'magic');
  const pool = Object.keys(JEWEL_MODS).filter((k) => !JEWEL_MODS[k].c || JEWEL_MODS[k].c === col);
  const n = rarity === 'rare' ? randi(3, 4) : randi(1, 2);
  const affixes = shuffle(pool).slice(0, n).map((id) => { const d = JEWEL_MODS[id]; return { id, v: Math.round(d.lo + Math.random() * (d.hi - d.lo)), jewel: true }; });
  return { uid: uid(), rarity, slot: 'jewel', base, ilvl: 1, affixes, quality: 0, name: rarity === 'rare' ? itemRareName('jewel') : BASES[base].name };
}

// ---------------- crafting bench: one fixed "crafted" mod per item ----------------
const BENCH = [
  { id: 'lifeflat', v: 30, cost: { scrap: 2 } },
  { id: 'fireres', v: 20, cost: { chaos: 1 } },
  { id: 'coldres', v: 20, cost: { chaos: 1 } },
  { id: 'lightres', v: 20, cost: { chaos: 1 } },
  { id: 'chaosres', v: 13, cost: { regal: 1 } },
  { id: 'flates', v: 22, cost: { scrap: 2 } },
  { id: 'speed', v: 7, cost: { whetstone: 2 } },
  { id: 'move', v: 12, cost: { regal: 1 } },
  { id: 'spell', v: 16, cost: { divine: 1 } },
  { id: 'attack', v: 16, cost: { divine: 1 } },
  { id: 'critmulti', v: 20, cost: { annul: 1 } },
  { id: 'lphys', v: 35, cost: { whetstone: 3 } },
];
function benchCan(b, it) {
  if (!it || it.corrupted || it.unique || it.slot === 'flask' || it.slot === 'jewel' || (it.rarity !== 'magic' && it.rarity !== 'rare')) return false;
  if (it.affixes.some((a) => a.crafted || a.id === b.id)) return false;
  const a = AFFIXES[b.id];
  if (!a.slots.split(' ').includes(it.slot) || !openSides(it)[a.type]) return false;
  return affixAllowed(b.id, Object.assign({}, it, { rarity: 'rare' }));
}
const benchAfford = (b, cur) => Object.entries(b.cost).every(([k, n]) => (cur[k] || 0) >= n);
function benchUse(b, it, cur) {
  for (const [k, n] of Object.entries(b.cost)) cur[k] -= n;
  it.affixes.push({ id: b.id, v: b.v, tier: 0, crafted: true });
}

// ---------------- uniques ----------------
// base: which base type it uses (defences / weapon stats / size)
const UNIQUES = {
  crown_of_cinders: { slot: 'helm', base: 'iron_hat', name: 'Crown of Cinders', th: 'มงกุฎเถ้าถ่าน', flavor: 'ไฟไม่เคยลืมสิ่งที่มันเผา',
    lines: ['+6% ชีวิตสูงสุด', 'ทุกสกิลมีโอกาส Ignite +25%', 'ดาเมจเผาไหม้ 20% more', 'ศัตรูที่ติด Ignite ตายแล้วระเบิด (Wildfire)'],
    apply(m) { m.lifeInc += 0.06; m.igniteAdd += 0.25; m.burnMore *= 1.2; m.ks.igniteBurst = true; } },
  bone_king: { slot: 'helm', base: 'silk_hood', name: 'Diadem of the Bone King', th: 'มงกุฎราชากระดูก', flavor: 'ผู้ตายไม่เคยปฏิเสธคำสั่งของเขา',
    lines: ['+20% ดาเมจมินเนียน', 'มินเนียนสูงสุด +1', 'ศัตรูที่ถูกมินเนียนฆ่าระเบิดเป็นไฟ (Pyre Rite)'],
    apply(m) { m.incMinion += 0.2; m.minionCount += 1; m.ks.minionKillBoom = true; } },
  executioners_hood: { slot: 'helm', base: 'leather_cap', name: "Executioner's Hood", th: 'ผ้าคลุมเพชฌฆาต', flavor: 'หนึ่งคมดาบ หนึ่งคำตัดสิน',
    lines: ['+1% โอกาสคริ (base)', '+25% ตัวคูณคริ', 'คริใส่ศัตรูที่ไม่ใช่บอสชีวิตต่ำกว่า 30% = ตายทันที'],
    apply(m) { m.critAdd += 0.01; m.critMulti += 0.25; m.ks.critCull = true; } },
  sunfire_lens: { slot: 'helm', base: 'soldier_helm', name: 'Sunfire Lens', th: 'เลนส์ตะวันเพลิง', flavor: 'มองผ่านมัน แล้วโลกจะลุกเป็นไฟ',
    lines: ['ลำแสง (Channelling) ยาวขึ้น 30%', 'ลำแสงทำดาเมจ 25% more', '+15% ดาเมจไฟ'],
    apply(m) { m.beamRange += 0.3; m.beamMore *= 1.25; m.incFire += 0.15; } },
  heart_of_mountain: { slot: 'body', base: 'plate_vest', name: 'Heart of the Mountain', th: 'ใจกลางขุนเขา', flavor: 'ภูเขาไม่หลบ ภูเขารอ',
    lines: ['+40% ชีวิตสูงสุด', '+150 Armour', 'ความเร็วเคลื่อนที่ 6% less'],
    apply(m) { m.lifeInc += 0.4; m.armour += 150; m.moveMore *= 0.94; } },
  sanctified_plate: { slot: 'body', base: 'chain_tunic', name: 'Sanctified Plate', th: 'เกราะศักดิ์สิทธิ์', flavor: 'ทุกบาดแผลคือคำอธิษฐาน',
    lines: ['+8% ชีวิตสูงสุด', 'ทุก 6 วิ ได้โล่กันดาเมจ 1 ครั้ง (Divine Aegis)', 'โดนโจมตีแล้วปล่อยคลื่นแสง (Retribution)'],
    apply(m) { m.lifeInc += 0.08; m.ks.aegis = true; m.ks.retaliate = true; } },
  glass_sage: { slot: 'body', base: 'silk_robe', name: 'Robe of the Glass Sage', th: 'เสื้อคลุมปราชญ์แก้ว', flavor: 'ความรู้ทำให้แข็งแกร่ง แต่เปราะบาง',
    lines: ['ทุกสกิลทำดาเมจ 25% more', '+10% ความเร็วร่าย/โจมตี', 'ชีวิตสูงสุด 20% less'],
    apply(m) { m.moreAll *= 1.25; m.speedInc += 0.1; m.lifeMore *= 0.8; } },
  plague_shroud: { slot: 'body', base: 'leather_tunic', name: 'Plague Shroud', th: 'ผ้าห่อศพโรคระบาด', flavor: 'ความเน่าเปื่อยคือการเกิดใหม่',
    lines: ['+25% ดาเมจเคออส', 'ทุกสกิลมีโอกาส Poison +20%', 'ศัตรูที่ติด Poison ตายแล้วระเบิด (Plague Burst)'],
    apply(m) { m.incChaos += 0.25; m.poisonAdd += 0.2; m.ks.poisonBurst = true; } },
  glacier_heart: { slot: 'body', base: 'scale_doublet', name: 'Heart of the Glacier', th: 'หัวใจธารน้ำแข็ง', flavor: 'ความเย็นไม่เคยรีบ แต่ไม่เคยพลาด',
    lines: ['ระเบิดของ Herald 50% more', '+20% ดาเมจน้ำแข็ง', '+8% ชีวิตสูงสุด'],
    apply(m) { m.heraldMore *= 1.5; m.incCold += 0.2; m.lifeInc += 0.08; } },
  stormcallers_grip: { slot: 'gloves', base: 'silk_gloves', name: "Stormcaller's Grip", th: 'ถุงมือผู้เรียกพายุ', flavor: 'ฟ้าร้องตอบรับทุกครั้งที่กำหมัด',
    lines: ['+10% ดาเมจธาตุ', 'ทุกสกิลมีโอกาส Shock +15%', 'ทุก 2.5 วิ ฟ้าผ่าศัตรู 4 ตัวรอบตัว (Thunderclap)'],
    apply(m) { m.incEle += 0.1; m.shockAdd += 0.15; m.ks.thunder = true; } },
  butchers_mitts: { slot: 'gloves', base: 'iron_gauntlets', name: "Butcher's Mitts", th: 'ถุงมือคนขายเนื้อ', flavor: 'ไม่มีอะไรเสียเปล่า',
    lines: ['+20% ดาเมจกายภาพ', '+6% ความเร็วร่าย/โจมตี', 'Hit กายภาพ 30% Impale (ดาเมจซ้ำ 60%)'],
    apply(m) { m.incPhys += 0.2; m.speedInc += 0.06; m.ks.impale = true; } },
  hydra_hands: { slot: 'gloves', base: 'leather_gloves', name: 'Hands of the Hydra', th: 'มือไฮดรา', flavor: 'ตัดหนึ่ง งอกสอง',
    lines: ['+1 Projectile ให้ทุกสกิล Projectile', '+10% ความเร็วกระสุน', 'ทุกสกิลทำดาเมจ 10% less'],
    apply(m) { m.projAdd += 1; m.projSpeedInc += 0.1; m.moreAll *= 0.9; } },
  gravecaller: { slot: 'gloves', base: 'fish_gauntlets', name: "Gravecaller's Grip", th: 'ถุงมือผู้ปลุกหลุมศพ', flavor: 'ดินเรียกคืนสิ่งที่เป็นของมันเสมอ',
    lines: ['มินเนียนสูงสุด +1', 'อัญเชิญมินเนียนเพิ่มครั้งละ +1', 'มินเนียนเร็วขึ้น 25%'],
    apply(m) { m.minionCount += 1; m.summonAdd += 1; m.minionSpeed += 0.25; } },
  windwalker: { slot: 'boots', base: 'leather_boots', name: 'Windwalker Treads', th: 'รองเท้าเดินลม', flavor: 'เงาของเขามาถึงก่อนตัว',
    lines: ['+20% ความเร็วเคลื่อนที่', 'คูลดาวน์ Dash 40% สั้นลง', 'หลัง Dash คริแน่นอน 1.5 วิ (Shadowstep)'],
    apply(m) { m.moveInc += 0.2; m.dashCdMul *= 0.6; m.ks.shadowstep = true; } },
  bloodied_greaves: { slot: 'boots', base: 'iron_greaves', name: 'Bloodied Greaves', th: 'แข้งเปื้อนเลือด', flavor: 'ยิ่งใกล้ความตาย ยิ่งใกล้ชัยชนะ',
    lines: ['+10% ความเร็วเคลื่อนที่', 'ดูดชีวิต 1% ของดาเมจ', 'ดาเมจ 40% more เมื่อชีวิตต่ำกว่า 50% (Death Wish)'],
    apply(m) { m.moveInc += 0.1; m.leech += 0.01; m.ks.lowLifeDmg = true; } },
  tectonic: { slot: 'boots', base: 'chain_boots', name: 'Tectonic Greaves', th: 'แข้งแผ่นเปลือกโลก', flavor: 'ทุกก้าวคือแผ่นดินไหว',
    lines: ['สกิล Slam มี Aftershock เพิ่ม +1', '+8% ความเร็วเคลื่อนที่', '+15% พื้นที่'],
    apply(m) { m.aftershockAdd += 1; m.moveInc += 0.08; m.areaInc += 0.15; } },
  eye_of_void: { slot: 'amulet', base: 'jade_amulet', name: 'Eye of the Void', th: 'ดวงตาแห่งความว่างเปล่า', flavor: 'เมื่อจ้องความว่างเปล่า มันก็สอนเจ้า',
    lines: ['+2 เลเวลเจมสกิลทั้งหมด', 'ชีวิตสูงสุด 10% less'],
    apply(m) { m.gemLevel += 2; m.lifeMore *= 0.9; } },
  bloodstone: { slot: 'amulet', base: 'amber_amulet', name: 'Bloodstone Pendant', th: 'จี้หินโลหิต', flavor: 'มันเต้นตามจังหวะการฆ่า',
    lines: ['+15% ดาเมจ Attack', 'ดูดชีวิต 1% ของดาเมจ', 'ฆ่าศัตรูได้ Rage (สูงสุด 30)'],
    apply(m) { m.incAttack += 0.15; m.leech += 0.01; m.ks.rage = true; } },
  heralds_sigil: { slot: 'amulet', base: 'lapis_amulet', name: "Herald's Sigil", th: 'ตราผู้ประกาศ', flavor: 'ธาตุทั้งสี่ก้มหัวให้ผู้ถือ',
    lines: ['+1 เลเวลเจมสกิลทั้งหมด', 'ดาเมจธาตุ 15% more', '+10% พื้นที่'],
    apply(m) { m.gemLevel += 1; m.moreEle *= 1.15; m.areaInc += 0.1; } },
  runeweaver: { slot: 'amulet', base: 'lapis_amulet', name: "Runeweaver's Sigil", th: 'ตราช่างทออักขระ', flavor: 'ทุกอักษรคือคำสั่งที่ไม่มีใครขัดได้',
    lines: ['สกิล Brand ติดตราได้เพิ่ม +1', 'ตราทำงานเร็วขึ้น 25%', '+10% ดาเมจ Spell'],
    apply(m) { m.brandAdd += 1; m.brandSpeed += 0.25; m.incSpell += 0.1; } },
  endless_night: { slot: 'ring', base: 'amethyst_ring', name: 'Band of Endless Night', th: 'แหวนรัตติกาลนิรันดร์', flavor: 'ความมืดกระซิบชื่อของศัตรู',
    lines: ['+15% ดาเมจเคออส', '+10% ดาเมจ DoT', 'ศัตรูในระยะ 220 รับดาเมจ 20% more (Hex Field)'],
    apply(m) { m.incChaos += 0.15; m.incDot += 0.1; m.ks.hexField = true; } },
  ouroboros: { slot: 'ring', base: 'iron_ring', name: 'Ouroboros Loop', th: 'วงแหวนงูกินหาง', flavor: 'จุดจบคือจุดเริ่ม',
    lines: ['Vaal ใช้วิญญาณน้อยลง 40%', '+10% ระยะเวลาสกิล'],
    apply(m) { m.vaalSoulMul *= 0.6; m.durInc += 0.1; } },
  plaguebringer: { slot: 'ring', base: 'amethyst_ring', name: "Plaguebringer's Coil", th: 'ขดแหวนผู้นำโรค', flavor: 'โรคร้ายไม่เลือกหน้า',
    lines: ['ดาเมจ Poison 35% more', '+15% ดาเมจเคออส', 'ทุกสกิลมีโอกาส Poison +10%'],
    apply(m) { m.poisonMore *= 1.35; m.incChaos += 0.15; m.poisonAdd += 0.1; } },
  hunters_signet: { slot: 'ring', base: 'iron_ring', name: "Hunter's Signet", th: 'แหวนนักล่า', flavor: 'เหยื่อที่ไกลที่สุดหวานที่สุด',
    lines: ['+15% ดาเมจ Projectile', '+10% ความเร็วกระสุน', 'Projectile แรงขึ้นตามระยะ (Far Shot)'],
    apply(m) { m.incProj += 0.15; m.projSpeedInc += 0.1; m.ks.farShot = true; } },
  // weapons / off-hands / belt
  stormstring: { slot: 'weapon', base: 'long_bow', name: 'Stormstring', th: 'สายธนูพายุ', flavor: 'สายธนูนี้ไม่เคยเงียบ',
    lines: ['อาวุธ +60% ดาเมจกายภาพ', 'ทุกสกิลมีโอกาส Shock +20%', '+1 Projectile', '+20% ดาเมจสายฟ้า'],
    local: { lphys: 60 }, apply(m) { m.shockAdd += 0.2; m.projAdd += 1; m.incLight += 0.2; } },
  pyre_staff: { slot: 'weapon', base: 'gnarled_staff', name: 'Pyre of the Ancients', th: 'กองไฟบรรพกาล', flavor: 'ไฟแรกของโลกยังไม่ดับ',
    lines: ['+1 เลเวลเจมสกิลทั้งหมด', '+30% ดาเมจไฟ', 'ดาเมจเผาไหม้ 25% more'],
    apply(m) { m.gemLevel += 1; m.incFire += 0.3; m.burnMore *= 1.25; } },
  oathbreaker: { slot: 'weapon', base: 'rusted_sword', name: 'Oathbreaker', th: 'ผู้ผิดคำสาบาน', flavor: 'คำสาบานแตกหักง่ายกว่าดาบ',
    lines: ['อาวุธ +80% ดาเมจกายภาพ', 'อาวุธ +15% ความเร็วโจมตี', 'ทุกสกิลมี Culling Strike 10%', 'ดูดชีวิต 1%'],
    local: { lphys: 80, laspd: 15 }, apply(m) { m.cullAdd = Math.max(m.cullAdd, 0.1); m.leech += 0.01; } },
  bastion_echoes: { slot: 'offhand', base: 'tower_shield', name: 'Bastion of Echoes', th: 'ป้อมแห่งเสียงสะท้อน', flavor: 'ทุกการโจมตีที่ถูกกั้น จะถูกส่งคืน',
    lines: ['+8% โอกาส Block', 'โดนโจมตีแล้วปล่อยคลื่นแสง (Retribution)', '+60 Armour'],
    apply(m) { m.block += 0.08; m.ks.retaliate = true; m.armour += 60; } },
  tempest_ward: { slot: 'offhand', base: 'spirit_shield', name: 'Ward of the Tempest', th: 'โล่แห่งพายุ', flavor: 'ธาตุทั้งสามหักเหเมื่อกระทบผิวมัน',
    lines: ['+20% ต้านทานธาตุทั้งหมด', '+2% ต้านทานธาตุสูงสุด', '+12% ดาเมจ Spell'],
    apply(m) { m.resFire += 0.2; m.resCold += 0.2; m.resLight += 0.2; m.maxRes += 0.02; m.incSpell += 0.12; } },
  stillwater: { slot: 'body', base: 'silk_robe', name: 'Stillwater Vestment', th: 'อาภรณ์น้ำนิ่ง', flavor: 'น้ำที่นิ่งที่สุด สะท้อนทุกสิ่งกลับคืน',
    lines: ['+70 Energy Shield', 'ES ฟื้นเร็วขึ้น 50%', '+25% ต้านทานเคออส'],
    apply(m) { m.es += 70; m.esRechargeInc += 0.5; m.resChaos += 0.25; } },
  girdle_plenty: { slot: 'belt', base: 'rustic_sash', name: 'Girdle of Plenty', th: 'สายคาดแห่งความอุดม', flavor: 'ขวดไม่เคยว่าง ท้องไม่เคยหิว',
    lines: ['ฟลาสก์ได้ชาร์จ +50%', 'ผลของฟลาสก์ +30%', '+30 ชีวิตสูงสุด'],
    apply(m) { m.flaskCharge += 0.5; m.flaskEff += 0.3; m.lifeFlat += 30; } },
};

// corrupted implicits (Vaal Orb)
const CORRUPT_MODS = [
  { t: '+1 เลเวลเจมสกิลทั้งหมด', slots: 'amulet weapon', apply(m) { m.gemLevel += 1; } },
  { t: '+6% ชีวิตสูงสุด', slots: 'body belt helm', apply(m) { m.lifeInc += 0.06; } },
  { t: '+6% ความเร็วร่าย/โจมตี', slots: 'gloves ring weapon', apply(m) { m.speedInc += 0.06; } },
  { t: '+6% ความเร็วเคลื่อนที่', slots: 'boots', apply(m) { m.moveInc += 0.06; } },
  { t: 'มินเนียนสูงสุด +1', slots: 'helm', apply(m) { m.minionCount += 1; } },
  { t: 'ทุกสกิลทำดาเมจ 6% more', slots: 'ring amulet weapon', apply(m) { m.moreAll *= 1.06; } },
  { t: '+5% โอกาส Block', slots: 'offhand', apply(m) { m.block += 0.05; } },
  { t: '+1% โอกาสคริ (base)', slots: 'gloves helm', apply(m) { m.critAdd += 0.01; } },
  { t: '+1% ต้านทานธาตุสูงสุด', slots: 'helm body boots offhand', apply(m) { m.maxRes += 0.01; } },
  { t: '+15% ต้านทานเคออส', slots: 'ring amulet belt boots', apply(m) { m.resChaos += 0.15; } },
];

const ITEM_PREFIX = ['Doom', 'Storm', 'Grim', 'Blood', 'Dusk', 'Rune', 'Shadow', 'Ember', 'Gloom', 'Wraith', 'Dread', 'Pale', 'Hate', 'Soul', 'Bone', 'Viper'];
const ITEM_SUFFIX = {
  weapon: ['Bane', 'Song', 'Fang', 'Edge', 'Thirst'], offhand: ['Bulwark', 'Ward', 'Guard', 'Aegis'], helm: ['Crown', 'Visage', 'Cowl', 'Brow'],
  body: ['Shell', 'Coat', 'Carapace', 'Hide'], gloves: ['Grip', 'Fist', 'Clutch', 'Talons'], boots: ['Stride', 'Tread', 'Spur', 'March'],
  belt: ['Cord', 'Lash', 'Girdle', 'Strap'], amulet: ['Charm', 'Locket', 'Talisman', 'Heart'], ring: ['Loop', 'Band', 'Coil', 'Knot'],
  jewel: ['Eye', 'Spark', 'Star', 'Shard', 'Prism'],
};
const itemRareName = (slot) => `${pick(ITEM_PREFIX)} ${pick(ITEM_SUFFIX[slot] || ITEM_SUFFIX.ring)}`;

// ---------------- generation ----------------
const isCaster = (base) => base.w && ['wand', 'sceptre', 'staff'].includes(base.w.type);
function affixAllowed(id, it) {
  const a = AFFIXES[id], base = BASES[it.base];
  if (!a.type || !a.slots.split(' ').includes(it.slot)) return false;
  if (a.rareOnly && it.rarity !== 'rare') return false;
  if (a.wk === 'caster' && it.slot === 'weapon' && !isCaster(base)) return false;
  if (a.def && !(base.def && base.def[a.def])) return false;
  if (it.slot === 'offhand' && base.quiver && (a.def || id === 'block' || id === 'ldef')) return false;
  return true;
}
const maxAffix = (it) => (it.rarity === 'rare' ? 3 : it.rarity === 'magic' ? 1 : 0);
function openSides(it) {
  const p = it.affixes.filter((a) => AFFIXES[a.id].type === 'P').length, s = it.affixes.length - p, mx = maxAffix(it);
  return { P: p < mx, S: s < mx };
}
function rollAffix(id, ilvl) {
  const a = AFFIXES[id];
  const tiers = [];
  for (let k = 1; k <= 7; k++) if (ilvl >= TIER_ILVL[k - 1]) tiers.push(k);
  const tier = weightedSample(tiers, 1, (k) => k)[0];       // better tiers are rarer
  const mult = TIER_MULT[tier - 1];
  const raw = a.fixed ? a.lo : (a.lo + Math.random() * (a.hi - a.lo)) * mult;
  const p = Math.pow(10, a.dec || 0);
  return { id, v: Math.max(a.dec ? 1 / p : 1, Math.round(raw * p) / p), tier: a.fixed ? 1 : tier };
}
function addRandomAffix(it) {
  const open = openSides(it), have = new Set(it.affixes.map((a) => a.id));
  const pool = Object.keys(AFFIXES).filter((id) => !have.has(id) && affixAllowed(id, it) && open[AFFIXES[id].type]);
  if (!pool.length) return false;
  const id = weightedSample(pool, 1, (k) => AFFIXES[k].w)[0];
  it.affixes.push(rollAffix(id, it.ilvl));
  return true;
}
function magicName(it) {
  const pre = it.affixes.find((a) => AFFIXES[a.id].type === 'P'), suf = it.affixes.find((a) => AFFIXES[a.id].type === 'S');
  return `${pre ? AFFIXES[pre.id].nm + ' ' : ''}${BASES[it.base].name}${suf ? ' ' + AFFIXES[suf.id].nm : ''}`;
}

function pickBase(slot) {
  const pool = Object.values(BASES).filter((b) => b.slot === slot);
  return weightedSample(pool, 1, (b) => (b.rare ? 0.3 : 1))[0];
}
function rollFlaskAffixes(it, n) {
  const ids = shuffle(Object.keys(FLASK_AFFIXES));
  const p = ids.find((id) => FLASK_AFFIXES[id].type === 'P'), s = ids.find((id) => FLASK_AFFIXES[id].type === 'S');
  const pick2 = n >= 2 ? [p, s] : [Math.random() < 0.5 ? p : s];
  it.affixes = pick2.map((id) => { const a = FLASK_AFFIXES[id]; return { id, v: Math.round(a.lo + Math.random() * (a.hi - a.lo)), flask: true }; });
}
function makeFlask(baseId, rarity, ilvl) {
  const b = BASES[baseId];
  const it = { uid: uid(), rarity, slot: 'flask', base: baseId, ilvl, affixes: [], quality: 0, charges: b.flask.max * 0.5, active: 0 };
  if (rarity === 'magic') rollFlaskAffixes(it, Math.random() < 0.5 ? 2 : 1);
  it.name = rarity === 'magic' ? magicFlaskName(it) : b.name;
  return it;
}
function magicFlaskName(it) {
  const p = it.affixes.find((a) => FLASK_AFFIXES[a.id].type === 'P'), s = it.affixes.find((a) => FLASK_AFFIXES[a.id].type === 'S');
  return `${p ? FLASK_AFFIXES[p.id].nm + ' ' : ''}${BASES[it.base].name}${s ? ' ' + FLASK_AFFIXES[s.id].nm : ''}`;
}

function makeItem(rarity, slot, time, tier) {
  const ilvl = itemLevel(time || 0, tier || 1);
  if (slot === 'flask') return makeFlask(pick(Object.keys(BASES).filter((k) => BASES[k].slot === 'flask')), rarity === 'normal' ? 'normal' : 'magic', ilvl);
  if (rarity === 'unique') {
    const pool = Object.keys(UNIQUES).filter((u) => !slot || UNIQUES[u].slot === slot);
    const id = pick(pool.length ? pool : Object.keys(UNIQUES)), u = UNIQUES[id];
    const it = { uid: uid(), rarity, slot: u.slot, base: u.base, unique: id, name: u.name, ilvl, affixes: [], quality: 0 };
    return it;
  }
  const base = pickBase(slot), it = { uid: uid(), rarity, slot, base: base.id, ilvl, affixes: [], quality: 0 };
  if (base.imp) it.implicit = { id: base.imp[0], v: base.imp[1] };
  const n = rarity === 'rare' ? 4 + (Math.random() < 0.4 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0) : rarity === 'magic' ? 1 + (Math.random() < 0.5 ? 1 : 0) : 0;
  for (let i = 0; i < n; i++) addRandomAffix(it);
  it.name = rarity === 'rare' ? itemRareName(slot) : rarity === 'magic' ? magicName(it) : base.name;
  return it;
}
// a plain white item of a given base (starting gear)
function makeNormal(baseId) {
  const b = BASES[baseId];
  if (b.flask) return makeFlask(baseId, 'normal', 1);
  const it = { uid: uid(), rarity: 'normal', slot: b.slot, base: baseId, ilvl: 1, affixes: [], quality: 0, name: b.name };
  if (b.imp) it.implicit = { id: b.imp[0], v: b.imp[1] };
  return it;
}

// ---------------- derived properties ----------------
// local modifiers (quality, % defences, weapon damage / speed / crit) apply to the item itself
function itemProps(it) {
  const b = BASES[it.base], q = it.quality || 0;
  const loc = Object.assign({}, it.unique ? UNIQUES[it.unique].local : null);
  for (const a of it.affixes) if (AFFIXES[a.id] && AFFIXES[a.id].local) loc[a.id] = (loc[a.id] || 0) + a.v;
  const out = {};
  if (b.def) {
    const k = defScale(it.ilvl) * (1 + ((loc.ldef || 0) + q) / 100);
    for (const d of ['ar', 'ev', 'es']) if (b.def[d]) out[d] = Math.round(b.def[d] * k);
  }
  if (b.block) out.block = b.block;
  if (b.w) {
    out.wtype = b.w.type; out.hands = b.w.hands;
    out.pd = (b.w.pd * pdScale(it.ilvl) + (loc.lflat || 0)) * (1 + ((loc.lphys || 0) + q) / 100);
    out.aps = b.w.aps * (1 + (loc.laspd || 0) / 100);
    out.crit = b.w.crit * (1 + (loc.lcrit || 0) / 100);
  }
  return out;
}
// relative damage multiplier an equipped weapon gives Attack skills (≈1 for a starter bow)
const weaponPower = (pr) => (pr.pd * pr.aps) / 13;

function affixText(a) {
  const d = a.flask ? FLASK_AFFIXES[a.id] : a.jewel ? JEWEL_MODS[a.id] : AFFIXES[a.id];
  return d.t.replace('{v}', a.v);
}
function itemLines(it) {
  if (it.unique) return UNIQUES[it.unique].lines.slice();
  return it.affixes.map(affixText);
}
function applyItem(it, m) {
  if (it.slot === 'flask' || it.slot === 'jewel') return;
  const pr = itemProps(it);
  if (pr.ar) m.armour += pr.ar;
  if (pr.ev) m.evasion += pr.ev;
  if (pr.es) m.es += pr.es;
  if (pr.block) m.block += pr.block / 100;
  if (it.corruptMod !== undefined) CORRUPT_MODS[it.corruptMod].apply(m);
  if (it.unique) { UNIQUES[it.unique].apply(m); return; }
  if (it.implicit) AFFIXES[it.implicit.id].apply(m, it.implicit.v);
  for (const a of it.affixes) AFFIXES[a.id].apply(m, a.v);
}

// ---------------- currency ----------------
const CRAFT_ORBS = {
  regal:    { name: 'Regal Orb', th: 'อัปเกรด Magic → Rare (+1 mod)', icon: '♛', color: '#7aa8ff', w: 3 },
  exalt:    { name: 'Exalted Orb', th: 'เพิ่ม mod ให้ Rare 1 อัน (ในช่อง Prefix/Suffix ที่ว่าง)', icon: '✷', color: '#ffe8a0', w: 1.3 },
  divine:   { name: 'Divine Orb', th: 'สุ่มตัวเลขของ mod ใหม่ (ในช่วงของ Tier เดิม)', icon: '✧', color: '#ffc8ff', w: 1.8 },
  annul:    { name: 'Orb of Annulment', th: 'ลบ mod แบบสุ่ม 1 อัน', icon: '⊘', color: '#c0c0d8', w: 2 },
  chaos:    { name: 'Chaos Orb', th: 'สุ่ม mod ของ Rare ใหม่ทั้งหมด (ใช้ร่วมกับการสุ่มการ์ด)', icon: '✪', color: '#d4b45a', w: 2 },
  ...JEWELLERS,
  whetstone:{ name: "Blacksmith's Whetstone", th: 'อาวุธ +5% Quality (สูงสุด 20%)', icon: '⚒', color: '#d8c8a8', w: 2 },
  scrap:    { name: "Armourer's Scrap", th: 'ชุดเกราะ/โล่ +5% Quality (สูงสุด 20%)', icon: '⛨', color: '#c8c0b0', w: 2.5 },
  vaal:     { name: 'Vaal Orb', th: 'Corrupt ไอเทม: ผลสุ่ม ดีมาก/ไม่เปลี่ยน/พัง · หลังจากนั้นแก้ไขไม่ได้อีก', icon: '◉', color: '#e04040', w: 0.9 },
};
const randomCraftOrb = () => weightedSample(Object.keys(CRAFT_ORBS), 1, (k) => CRAFT_ORBS[k].w)[0];

// can(it) → true when the orb does something; use(it) changes the item
const notLocked = (it) => !it.corrupted && it.slot !== 'flask' && it.slot !== 'jewel';
const CRAFT = {
  regal:  { can: (it) => notLocked(it) && it.rarity === 'magic', use(it) { it.rarity = 'rare'; it.name = itemRareName(it.slot); addRandomAffix(it); } },
  exalt:  { can: (it) => notLocked(it) && it.rarity === 'rare' && it.affixes.length < 6 && (openSides(it).P || openSides(it).S), use(it) { addRandomAffix(it); } },
  divine: { can: (it) => notLocked(it) && !it.unique && it.affixes.some((a) => !AFFIXES[a.id].fixed),
    use(it) { it.affixes = it.affixes.map((a) => { const d = AFFIXES[a.id], p = Math.pow(10, d.dec || 0); return d.fixed || a.crafted ? a : Object.assign({}, a, { v: Math.max(d.dec ? 1 / p : 1, Math.round((d.lo + Math.random() * (d.hi - d.lo)) * TIER_MULT[a.tier - 1] * p) / p) }); }); } },
  annul:  { can: (it) => notLocked(it) && !it.unique && it.affixes.length > 1, use(it) { it.affixes.splice(Math.floor(Math.random() * it.affixes.length), 1); } },
  chaos:  { can: (it) => notLocked(it) && it.rarity === 'rare', use(it) { it.affixes = []; const n = 4 + (Math.random() < 0.4 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0); for (let i = 0; i < n; i++) addRandomAffix(it); it.name = itemRareName(it.slot); } },
  whetstone: { can: (it) => notLocked(it) && it.slot === 'weapon' && (it.quality || 0) < 20, use(it) { it.quality = Math.min(20, (it.quality || 0) + 5); } },
  scrap:  { can: (it) => notLocked(it) && !!BASES[it.base].def && (it.quality || 0) < 20, use(it) { it.quality = Math.min(20, (it.quality || 0) + 5); } },
  vaal:   { can: (it) => notLocked(it), use(it) { return corruptItem(it); } },
};
// Vaal Orb outcomes: nothing / corrupted implicit / reroll mods / lose a mod
function corruptItem(it) {
  it.corrupted = true;
  const r = Math.random();
  if (r < 0.3) return 'ไม่มีอะไรเปลี่ยน';
  if (r < 0.58) {
    const pool = CORRUPT_MODS.map((c, i) => [c, i]).filter(([c]) => c.slots.split(' ').includes(it.slot));
    if (pool.length) { it.corruptMod = pick(pool)[1]; return 'ได้ implicit พิเศษ!'; }
    return 'ไม่มีอะไรเปลี่ยน';
  }
  if (r < 0.75 && !it.unique) { it.rarity = 'rare'; it.affixes = []; const n = 4 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) addRandomAffix(it); it.name = itemRareName(it.slot); return 'mod ถูกสุ่มใหม่ทั้งหมด'; }
  if (!it.unique && it.affixes.length) { it.affixes.splice(Math.floor(Math.random() * it.affixes.length), 1); return 'mod หายไป 1 อัน'; }
  return 'ไม่มีอะไรเปลี่ยน';
}
