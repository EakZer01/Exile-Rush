'use strict';
// ============================================================
//  ATLAS — maps (biomes), tiers and map mods
//  A run is played on a map: biome sets the look and monster mix,
//  tier scales monsters and rewards, mods add danger for more loot.
//  Clearing a map (killing the final boss) unlocks the next tier, and
//  every new biome+tier cleared adds a Legacy Tree point.
// ============================================================
const MAX_MAP_TIER = 10;
const ATLAS_POINT_CAP = 15;           // max bonus Legacy Tree points from the Atlas
const MAP_REROLL_COST = 3;            // Ancient Shards to reroll mods

// tint: multiplied over ground/props · dark: colour of the night layer
// mult: monster weight multipliers · add: extra monsters from minute 1.5
const BIOMES = {
  graveyard: { name: 'Cursed Graveyard', th: 'สุสานต้องสาป', color: '#c8a860', minTier: 1, tint: null, dark: '6,4,12',
    desc: 'ดินแดนเริ่มต้น มอนสเตอร์ผสมทุกชนิด', mult: {}, add: {} },
  ashen: { name: 'Ashen Wastes', th: 'ทุ่งเถ้าถ่าน', color: '#ff7a3a', minTier: 1, tint: '#ffb08a', dark: '18,4,2',
    desc: 'แผ่นดินไหม้เกรียม Volatile และ Brute ชุกชุม', mult: { volatile: 2.5, brute: 1.4 }, add: { volatile: 1.5 } },
  frozen: { name: 'Frozen Hollow', th: 'โพรงน้ำแข็ง', color: '#8ad8ff', minTier: 2, tint: '#b8d8ff', dark: '2,8,18',
    desc: 'หุบเขาเยือกแข็ง Frost Wraith ออกล่าตั้งแต่ต้น', mult: { wraith: 2.2, skeleton: 1.4 }, add: { wraith: 2 } },
  marsh: { name: 'Toxic Marsh', th: 'บึงพิษ', color: '#8fdc4a', minTier: 3, tint: '#b8e09a', dark: '4,12,4',
    desc: 'หนองน้ำเน่า ซากศพและ Void Cultist เต็มไปหมด', mult: { zombie: 2, cultist: 1.5 }, add: { cultist: 0.6 } },
  void: { name: 'Void Sanctum', th: 'วิหารความว่างเปล่า', color: '#b060ff', minTier: 5, tint: '#c8a8ff', dark: '10,2,18', hpMul: 1.15,
    desc: 'ใจกลางความมืด มอนสเตอร์แข็งแกร่งขึ้น 15% · Golem ปรากฏเร็ว', mult: { cultist: 2, golem: 2 }, add: { golem: 0.6, cultist: 1 } },
};

// tier scaling (tier 1 = the base game)
const tierHp = (t) => 1 + 0.25 * (t - 1);
const tierDmg = (t) => 1 + 0.08 * (t - 1);
const tierReward = (t) => 1 + 0.15 * (t - 1);

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
};

const MAP_FX_DEFAULT = {
  monHp: 1, monDmg: 1, monSpeed: 1, spawn: 1, rareRate: 1, magicRate: 1, eleResAdd: 0, physResAdd: 0, deathBoomAdd: 0,
  bossHp: 1, bossDmg: 1, pRegen: 1, pFlask: 1, pLife: 1, hazard: false, darkAdd: 0, noShrine: false,
};

// mods rolled by "Alchemy": 3 at tier 1–3, 4 at tier 4–7, 5 at tier 8+
const mapModCount = (tier) => 3 + Math.floor(tier / 4);

function rollMapMods(tier) { return shuffle(Object.keys(MAP_MODS)).slice(0, mapModCount(tier)); }

function mapFx(cfg) {
  const fx = Object.assign({}, MAP_FX_DEFAULT);
  for (const id of cfg.mods) {
    for (const [k, v] of Object.entries(MAP_MODS[id].fx)) {
      if (typeof v === 'boolean') fx[k] = fx[k] || v;
      else if (k.endsWith('Add')) fx[k] += v;
      else fx[k] *= v;
    }
  }
  return fx;
}
// total item quantity bonus (%) and the shard/item multiplier of a map
function mapQuantity(cfg) { return cfg.mods.reduce((a, id) => a + MAP_MODS[id].qty, 0); }
function mapRewardMult(cfg) { return tierReward(cfg.tier) * (1 + mapQuantity(cfg) / 100); }
function mapLabel(cfg) { return `${BIOMES[cfg.biome].name} · T${cfg.tier}`; }
const DEFAULT_MAP = { biome: 'graveyard', tier: 1, mods: [] };
