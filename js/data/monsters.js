'use strict';
// ============================================================
//  MONSTERS, WAVES, RARE MODIFIERS, BOSSES
// ============================================================
const MONSTERS = {
  zombie:   { name: 'Rotting Corpse', hp: 22, speed: 46, dmg: 8, r: 13, xp: 1, color: '#6f7d58', shape: 'circle' },
  skeleton: { name: 'Bone Husk', hp: 16, speed: 68, dmg: 7, r: 11, xp: 1, color: '#d6cfb6', shape: 'circle' },
  bat:      { name: 'Blood Bat', hp: 9, speed: 120, dmg: 5, r: 9, xp: 1, color: '#8e4fb0', shape: 'tri', flutter: true },
  archer:   { name: 'Bone Archer', hp: 15, speed: 58, dmg: 9, r: 11, xp: 2, color: '#c6b88a', shape: 'diamond',
              ranged: { range: 300, cd: 2.8, speed: 200, dmg: 7, color: '#e8dcb0' } },
  brute:    { name: 'Goatman Brute', hp: 85, speed: 44, dmg: 14, r: 21, xp: 4, color: '#7a5236', shape: 'square' },
  volatile: { name: 'Volatile Spawn', hp: 10, speed: 92, dmg: 20, r: 10, xp: 1, color: '#ff6a1a', shape: 'circle', explode: true },
  wraith:   { name: 'Frost Wraith', hp: 45, speed: 78, dmg: 12, r: 14, xp: 2, color: '#57b7d0', shape: 'tri' },
  cultist:  { name: 'Void Cultist', hp: 38, speed: 55, dmg: 11, r: 13, xp: 3, color: '#6b3fa0', shape: 'diamond',
              ranged: { range: 340, cd: 3.2, speed: 200, dmg: 14, color: '#c080ff', burst: 3 } },
  golem:    { name: 'Stone Golem', hp: 260, speed: 38, dmg: 22, r: 28, xp: 10, color: '#8a8478', shape: 'square' },
  // leaps at the player after a short crouch
  ghoul:    { name: 'Ash Ghoul', hp: 30, speed: 56, dmg: 12, r: 13, xp: 2, color: '#9a9488', shape: 'circle',
              leap: { range: 270, cd: 3.6, speed: 540, dur: 0.32, windup: 0.4 } },
  // lobs bile that leaves a poison pool
  spitter:  { name: 'Bile Spitter', hp: 34, speed: 48, dmg: 9, r: 13, xp: 3, color: '#7ac040', shape: 'diamond',
              ranged: { range: 330, cd: 3.4, speed: 190, dmg: 8, color: '#9be05a', pool: true } },
  // empowers nearby monsters — kill it first
  shaman:   { name: 'Bone Shaman', hp: 26, speed: 50, dmg: 6, r: 11, xp: 4, color: '#a070e0', shape: 'diamond',
              support: { cd: 4.5, r: 210, dur: 4 } },
};

// wave table: from minute `t`, these monster weights apply
const WAVES = [
  { t: 0,  w: { zombie: 6, skeleton: 3 } },
  { t: 1,  w: { zombie: 5, skeleton: 4, bat: 3 } },
  { t: 2.5, w: { zombie: 4, skeleton: 4, bat: 3, archer: 2 } },
  { t: 3,  w: { zombie: 3, skeleton: 4, bat: 3, archer: 2, ghoul: 1.5 } },
  { t: 4,  w: { zombie: 3, skeleton: 4, bat: 3, archer: 2, brute: 1.5, volatile: 1, ghoul: 1.5 } },
  { t: 6,  w: { skeleton: 3, bat: 4, archer: 2, brute: 2, volatile: 2, wraith: 2, ghoul: 2, spitter: 1 } },
  { t: 8,  w: { skeleton: 2, bat: 3, archer: 2, brute: 2, volatile: 2, wraith: 3, cultist: 1, ghoul: 2, spitter: 1.5, shaman: 0.8 } },
  { t: 11, w: { bat: 3, archer: 2, brute: 3, volatile: 2, wraith: 4, cultist: 2, golem: 0.6, ghoul: 2, spitter: 2, shaman: 1 } },
  { t: 14, w: { bat: 3, brute: 3, volatile: 3, wraith: 4, cultist: 3, golem: 1, ghoul: 2.5, spitter: 2, shaman: 1.2 } },
  { t: 17, w: { bat: 4, brute: 3, volatile: 3, wraith: 4, cultist: 3, golem: 1.5, ghoul: 3, spitter: 2.5, shaman: 1.5 } },
];

// Health multiplier over time (minutes)
// steeper late game: builds come online around 8–12 min, monsters keep pace
const hpScale = (min) => 1 + min * 0.45 + min * min * 0.08;
const dmgScale = (min) => 1 + min * 0.15 + min * min * 0.006;
const speedScale = (min) => 1 + min * 0.01;

// Magic (blue) and Rare (yellow) monster modifiers
const MONSTER_MODS = {
  hasted:      { name: 'Hasted', th: 'เร่งความเร็ว', apply(e) { e.speed *= 1.45; } },
  armoured:    { name: 'Armoured', th: 'เกราะหนา', apply(e) { e.dmgTakenMul *= 0.6; } },
  regen:       { name: 'Regenerating', th: 'ฟื้นฟู', apply(e) { e.regen = 0.04; } },
  berserk:     { name: 'Berserker', th: 'คลุ้มคลั่ง', apply(e) { e.dmg *= 1.6; } },
  ele_res:     { name: 'Elemental Resistant', th: 'ต้านธาตุ', apply(e) { e.res.fire = e.res.cold = e.res.lightning = 0.5; } },
  phys_res:    { name: 'Ironclad', th: 'ต้านกายภาพ', apply(e) { e.res.physical = 0.5; } },
  volatile:    { name: 'Volatile', th: 'ระเบิดเมื่อตาย', apply(e) { e.deathBoom = true; } },
  splitter:    { name: 'Summoner', th: 'แยกร่างเมื่อตาย', apply(e) { e.deathSplit = true; } },
  freeze_imm:  { name: 'Unwavering', th: 'ไม่หวั่นไหว', apply(e) { e.ailImmune = true; } },
  vampiric:    { name: 'Vampiric', th: 'ดูดเลือด', apply(e) { e.dmg *= 1.2; e.regen = Math.max(e.regen || 0, 0.02); } },
};
const MAGIC_MODS = ['hasted', 'armoured', 'berserk', 'ele_res', 'phys_res', 'regen'];

const RARE_PREFIX = ['Gloom', 'Blood', 'Doom', 'Grim', 'Ash', 'Rot', 'Dread', 'Night', 'Storm', 'Bone', 'Venom', 'Woe', 'Hate', 'Corpse', 'Pain'];
const RARE_SUFFIX = ['Gnaw', 'Howl', 'Ripper', 'Maw', 'Spawn', 'Bane', 'Thirst', 'Scourge', 'Feast', 'Wound', 'Shriek', 'Grinder', 'Fang', 'Wail'];
const rareName = () => pick(RARE_PREFIX) + ' ' + pick(RARE_SUFFIX);

// Bosses — patterns used by enemies.js boss AI
const BOSSES = [
  { at: 300, id: 'warden', name: 'Infernal Warden', th: 'ผู้คุมนรกเพลิง', hp: 3300, speed: 72, dmg: 22, r: 36,
    color: '#c43a1a', glow: '#ff7a2a', patterns: ['radial', 'charge', 'ring'], ptype: 'fire' },
  { at: 600, id: 'colossus', name: 'Frostbound Colossus', th: 'ยักษ์น้ำแข็งนิรันดร์', hp: 20000, speed: 60, dmg: 36, r: 44,
    color: '#3a7fb8', glow: '#9fe0ff', patterns: ['ring', 'radial', 'slam', 'summon'], ptype: 'cold' },
  { at: 900, id: 'herald', name: 'Herald of Storms', th: 'ผู้ประกาศพายุ', hp: 120000, speed: 85, dmg: 44, r: 40,
    color: '#b8a03a', glow: '#fff07a', patterns: ['strike', 'radial', 'charge', 'summon'], ptype: 'lightning' },
  { at: 1200, id: 'sovereign', name: 'The Void Sovereign', th: 'จักรพรรดิแห่งความว่างเปล่า', hp: 600000, speed: 70, dmg: 50, r: 54,
    color: '#3a1a5a', glow: '#b060ff', patterns: ['spiral', 'strike', 'ring', 'radial', 'summon', 'charge'], ptype: 'chaos', final: true },
];
BOSSES[0].phases = [0.5];
for (let i = 1; i < BOSSES.length; i++) BOSSES[i].phases = [0.66, 0.33];

// a boss with some fields replaced (biome bosses, pinnacle)
function bossVariant(i, o) { return Object.assign({}, BOSSES[i], o); }
// Pinnacle boss: replaces the final boss on Tier 8+ maps
const PINNACLE = bossVariant(3, { id: 'sovereign_crown', name: 'The Hollow Crown', th: 'มงกุฎกลวง — จ้าวแห่ง Atlas',
  hp: 450000, dmg: 64, r: 60, color: '#6a5a1a', glow: '#ffd84a', ptype: 'fire', summon: 'shaman', phases: [0.75, 0.5, 0.25], pinnacle: true });

const RUN_LENGTH = 1200; // seconds — final boss spawns at 20:00

// Shrines (PoE style temporary buffs)
const SHRINES = {
  diamond:      { name: 'Diamond Shrine', th: 'ศาลเพชร', desc: 'ทุกการโจมตีเป็นคริติคอล', color: '#bfefff', dur: 12 },
  acceleration: { name: 'Acceleration Shrine', th: 'ศาลเร่งความเร็ว', desc: 'เคลื่อนที่/ร่ายเร็วขึ้น 40%', color: '#7aff9a', dur: 15 },
  resistance:   { name: 'Resistance Shrine', th: 'ศาลต้านทาน', desc: 'รับดาเมจ 60% less', color: '#ffd24a', dur: 15 },
  covetous:     { name: 'Covetous Shrine', th: 'ศาลโลภ', desc: 'ดูดลูกแก้วประสบการณ์ทั้งหมดบนแผนที่', color: '#ff7ad8', dur: 0 },
  echoing:      { name: 'Echoing Shrine', th: 'ศาลก้องสะท้อน', desc: 'ทุกสกิลร่ายซ้ำ 1 ครั้ง', color: '#9a8aff', dur: 12 },
};
