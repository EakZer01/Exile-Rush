'use strict';
// ============================================================
//  ATLAS — maps (biomes), tiers and map mods
//  A run is played on a map: biome sets the look and monster mix,
//  tier scales monsters and rewards, mods add danger for more loot.
//  Clearing a map (killing the final boss) unlocks the next tier, and
//  every new biome+tier cleared adds a Legacy Tree point.
// ============================================================
const MAX_MAP_TIER = 10;
const ARENA = 2200;                   // the map is a square from -ARENA to +ARENA
const ATLAS_POINT_CAP = 15;           // max bonus Legacy Tree points from the Atlas
const MAP_REROLL_COST = 3;            // Ancient Shards to reroll mods

// tint: multiplied over ground/props · dark: colour of the night layer
// mult: monster weight multipliers · add: extra monsters from minute 1.5
const BIOMES = {
  graveyard: { name: 'Cursed Graveyard', th: 'สุสานต้องสาป', color: '#c8a860', minTier: 1, tint: null, dark: '6,4,12',
    desc: 'ดินแดนเริ่มต้น มอนสเตอร์ผสมทุกชนิด', mult: {}, add: {} },
  ashen: { name: 'Ashen Wastes', th: 'ทุ่งเถ้าถ่าน', color: '#ff7a3a', minTier: 1, tint: '#ffb08a', dark: '18,4,2',
    desc: 'แผ่นดินไหม้เกรียม Volatile, Brute และ Ash Ghoul ชุกชุม', mult: { volatile: 2.5, brute: 1.4, ghoul: 1.6, mortar: 2, charger: 1.5 }, add: { volatile: 1.5, mortar: 0.8 },
    boss: 'Cinder Colossus (7:30)', bosses: { 1: bossVariant(1, { id: 'colossus_cinder', name: 'Cinder Colossus', th: 'ยักษ์ถ่านเพลิง', color: '#b8401a', glow: '#ff8a3a', ptype: 'fire', summon: 'volatile' }) } },
  frozen: { name: 'Frozen Hollow', th: 'โพรงน้ำแข็ง', color: '#8ad8ff', minTier: 2, tint: '#b8d8ff', dark: '2,8,18',
    desc: 'หุบเขาเยือกแข็ง Frost Wraith ออกล่าตั้งแต่ต้น', mult: { wraith: 2.2, skeleton: 1.4, stalker: 1.6, guardian: 1.5 }, add: { wraith: 2, stalker: 0.8 },
    boss: 'Rime Herald (11:15)', bosses: { 2: bossVariant(2, { id: 'herald_rime', name: 'Rime Herald', th: 'ผู้ประกาศน้ำค้างแข็ง', color: '#3a8ab8', glow: '#a8ecff', ptype: 'cold', summon: 'wraith' }) } },
  marsh: { name: 'Toxic Marsh', th: 'บึงพิษ', color: '#8fdc4a', minTier: 3, tint: '#b8e09a', dark: '4,12,4',
    desc: 'หนองน้ำเน่า ซากศพ Bile Spitter และ Cultist เต็มไปหมด', mult: { zombie: 2, cultist: 1.5, spitter: 2, bloater: 2.2, broodmother: 2, necromancer: 1.6 }, add: { cultist: 0.6, spitter: 1, bloater: 1 },
    boss: 'Bog Leviathan (7:30)', bosses: { 1: bossVariant(1, { id: 'colossus_bog', name: 'Bog Leviathan', th: 'อสูรบึงเน่า', color: '#4a7a2a', glow: '#a8f060', ptype: 'chaos', summon: 'spitter' }) } },
  void: { name: 'Void Sanctum', th: 'วิหารความว่างเปล่า', color: '#b060ff', minTier: 5, tint: '#c8a8ff', dark: '10,2,18', hpMul: 1.15,
    desc: 'ใจกลางความมืด มอนสเตอร์แข็งแกร่งขึ้น 15% · Golem และ Bone Shaman ปรากฏเร็ว', mult: { cultist: 2, golem: 2, shaman: 1.6, stalker: 2, guardian: 1.8, necromancer: 1.6 }, add: { golem: 0.6, cultist: 1, shaman: 0.8, stalker: 1, guardian: 0.5 },
    boss: 'Herald of the Void (11:15)', bosses: { 2: bossVariant(2, { id: 'herald_void', name: 'Herald of the Void', th: 'ผู้ประกาศความว่างเปล่า', color: '#4a1a7a', glow: '#c070ff', ptype: 'chaos', summon: 'shaman' }) } },
};

// tier scaling (tier 1 = the base game)
const tierHp = (t) => 1 + 0.25 * (t - 1);
const tierDmg = (t) => 1 + 0.08 * (t - 1);
const tierReward = (t) => 1 + 0.15 * (t - 1);
// resistance penalty: -8% per tier above 1 (Tier 8 = -56%), gear has to make it up
const resPenalty = (t) => Math.min(0.6, 0.08 * (t - 1));

// fx keys are combined by mapFx(): numbers multiply (or add for *Add), booleans OR
const MAP_MODS = {
  m_life:    { name: 'Hardened', th: 'มอนสเตอร์มีชีวิต 40% more', qty: 12, fx: { monHp: 1.4 } },
  m_dmg:     { name: 'Savage', th: 'มอนสเตอร์ทำดาเมจ 25% more', qty: 12, fx: { monDmg: 1.25 } },
  m_speed:   { name: 'Fleet', th: 'มอนสเตอร์เคลื่อนที่เร็วขึ้น 20%', qty: 10, fx: { monSpeed: 1.2 } },
  m_pack:    { name: 'Swarming', th: 'มอนสเตอร์เกิดมากขึ้น 30%', qty: 15, fx: { spawn: 1.3 } },
  m_rare:    { name: 'Elite', th: 'มอนสเตอร์ Rare เกิดบ่อยขึ้น 2 เท่า', qty: 15, fx: { rareRate: 2 } },
  m_magic:   { name: 'Arcane Packs', th: 'กลุ่มมอนสเตอร์ Magic เกิดบ่อยขึ้น 50%', qty: 8, fx: { magicRate: 1.5 } },
  m_res:     { name: 'Warded', th: 'มอนสเตอร์ต้านธาตุ +25%', qty: 10, fx: { eleResAdd: 0.25 } },
  m_armour:  { name: 'Armoured', th: 'มอนสเตอร์ต้านกายภาพ +25%', qty: 10, fx: { physResAdd: 0.25 } },
  m_boom:    { name: 'Volatile', th: 'มอนสเตอร์ 12% ระเบิดเมื่อตาย', qty: 12, fx: { deathBoomAdd: 0.12 } },
  m_boss:    { name: 'Empowered', th: 'บอสมีชีวิต 60% more และทำดาเมจ 25% more', qty: 12, fx: { bossHp: 1.6, bossDmg: 1.25 } },
  p_regen:   { name: 'Withering Air', th: 'ผู้เล่นฟื้นชีวิตและดูดชีวิตได้ 50% less', qty: 10, fx: { pRegen: 0.5 } },
  p_flask:   { name: 'Drought', th: 'ฟลาสก์ได้ชาร์จ 40% less', qty: 8, fx: { pFlask: 0.6 } },
  p_life:    { name: 'Frailty', th: 'ผู้เล่นมีชีวิตสูงสุด 15% less', qty: 10, fx: { pLife: 0.85 } },
  h_ground:  { name: 'Burning Ground', th: 'พื้นลุกเป็นไฟใกล้ผู้เล่นเป็นระยะ', qty: 12, fx: { hazard: true } },
  h_dark:    { name: 'Lightless', th: 'ความมืดหนาขึ้นมาก', qty: 6, fx: { darkAdd: 0.07 } },
  h_shrine:  { name: 'Desecrated', th: 'ไม่มีศาลเจ้า (Shrine) เกิด', qty: 6, fx: { noShrine: true } },
  p_maxres:  { name: 'Smothering', th: 'ผู้เล่นค่าต้านทานสูงสุด -10%', qty: 10, fx: { pMaxRes: 0.1 } },
  m_elem:    { name: 'Elemental Fury', th: 'มอนสเตอร์กายภาพครึ่งหนึ่งโจมตีเป็นธาตุแทน', qty: 10, fx: { eleConvert: true } },
};

const MAP_FX_DEFAULT = {
  monHp: 1, monDmg: 1, monSpeed: 1, spawn: 1, rareRate: 1, magicRate: 1, eleResAdd: 0, physResAdd: 0, deathBoomAdd: 0,
  bossHp: 1, bossDmg: 1, pRegen: 1, pFlask: 1, pLife: 1, hazard: false, darkAdd: 0, noShrine: false, pMaxRes: 0, eleConvert: false,
  pChoicesLess: 0,
};

// mods rolled by "Alchemy": 3 at tier 1–3, 4 at tier 4–7, 5 at tier 8+
const mapModCount = (tier) => 3 + Math.floor(tier / 4);

function rollMapMods(tier) { return shuffle(Object.keys(MAP_MODS)).slice(0, mapModCount(tier)); }

function mapFx(cfg) {
  const fx = Object.assign({}, MAP_FX_DEFAULT);
  for (const id of cfg.mods) {
    for (const [k, v] of Object.entries(MAP_MODS[id].fx)) {
      if (typeof v === 'boolean') fx[k] = fx[k] || v;
      else if (k.endsWith('Add') || k === 'pMaxRes') fx[k] += v;
      else fx[k] *= v;
    }
  }
  return fx;
}
// total item quantity bonus (%) and the shard/item multiplier of a map
function mapQuantity(cfg) { return cfg.mods.reduce((a, id) => a + MAP_MODS[id].qty, 0); }
function mapRewardMult(cfg) { return tierReward(cfg.tier) * (1 + mapQuantity(cfg) / 100); }
function mapLabel(cfg) { return `${BIOMES[cfg.biome].name} · T${cfg.tier}`; }

// the cost to make a map without owning one (only tiers you've reached)
const mapBuyCost = (tier) => (tier <= 1 ? 0 : 8 * tier);

// ---------------- Atlas passive tree: steer which league content shows up ----------------
// each branch is a chain: take nodes in order. Points = maps cleared + 1 per 8 bosses killed.
const ATLAS_TREE = [
  { id: 'box', name: 'Strongbox', color: '#c8b08a', icon: '▣', nodes: [
    { d: 'Strongbox เกิดบ่อยขึ้น 25%', a(f) { f.boxRate *= 1.25; } },
    { d: 'Strongbox เกิดบ่อยขึ้น 25%', a(f) { f.boxRate *= 1.25; } },
    { n: 'Fortune Favours', d: 'Strongbox ดรอปของเพิ่ม · เกิดบ่อยขึ้น 15%', a(f) { f.boxBonus = true; f.boxRate *= 1.15; } }] },
  { id: 'ess', name: 'Essence', color: '#c0a0ff', icon: '◆', nodes: [
    { d: 'Essence เกิดบ่อยขึ้น 25%', a(f) { f.essRate *= 1.25; } },
    { d: 'Essence เกิดบ่อยขึ้น 25%', a(f) { f.essRate *= 1.25; } },
    { n: 'Crystal Resonance', d: 'มอนสเตอร์ Essence 35% มี Essence 2 อัน', a(f) { f.essDouble = true; } }] },
  { id: 'ritual', name: 'Ritual', color: '#ff5a5a', icon: 'ᛟ', nodes: [
    { d: 'ได้ Tribute เพิ่ม 20%', a(f) { f.tribute *= 1.2; } },
    { d: 'ได้ Tribute เพิ่ม 20%', a(f) { f.tribute *= 1.2; } },
    { n: 'Blood Rite', d: 'มี Ritual ครั้งที่ 3 (ช่วง 13:00)', a(f) { f.ritualExtra = true; } }] },
  { id: 'deli', name: 'Delirium', color: '#e8eef8', icon: '◐', nodes: [
    { d: 'หมอก Delirium อยู่นานขึ้น 25%', a(f) { f.deliDur *= 1.25; } },
    { d: 'รางวัล Delirium เพิ่มขึ้น 30%', a(f) { f.deliReward *= 1.3; } },
    { n: 'Shattered Mirror', d: 'กระจก Delirium ปรากฏอีกครั้งหลังหมอกจาง', a(f) { f.deliTwice = true; } }] },
  { id: 'breach', name: 'Breach', color: '#c070ff', icon: '◎', nodes: [
    { d: 'Breach เกิดบ่อยขึ้น 20%', a(f) { f.breachRate *= 1.2; } },
    { d: 'Breach เกิดบ่อยขึ้น 20%', a(f) { f.breachRate *= 1.2; } },
    { n: 'Rift Hoard', d: 'รางวัล Breach เพิ่ม 50%', a(f) { f.breachLoot *= 1.5; } }] },
  { id: 'carto', name: 'Cartography', color: '#8ad8a8', icon: '▦', nodes: [
    { d: 'ไอเทมดรอปเพิ่ม 8%', a(f) { f.itemQty *= 1.08; } },
    { d: 'Shards เพิ่ม 5% · ไอเทมดรอปเพิ่ม 5%', a(f) { f.shardMul *= 1.05; f.itemQty *= 1.05; } },
    { n: 'Wanderer', d: 'เก็บของเข้า Stash ได้ +1 ชิ้น · พกเข้ารอบได้ +1 ชิ้น · ไอเทมดรอปเพิ่ม 10%', a(f) { f.stashAdd += 1; f.itemQty *= 1.1; } }] },
];
const ATLAS_FX_DEFAULT = { boxRate: 1, boxBonus: false, essRate: 1, essDouble: false, tribute: 1, ritualExtra: false, deliDur: 1, deliReward: 1, deliTwice: false,
  breachRate: 1, breachLoot: 1, itemQty: 1, stashAdd: 0,
  // endgame: scarabs, voidstones, collection and challenge bonuses
  uniqueMul: 1, srcUnique: 1, srcBossSure: false, shardMul: 1, scarabDrop: 1, vaultExtra: 0, vaultLuck: 0, scarabSlots: 2 };
const DEFAULT_MAP = { biome: 'graveyard', tier: 1, mods: [] };
