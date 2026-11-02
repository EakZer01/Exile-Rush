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
  volatile: { name: 'Volatile Spawn', hp: 10, speed: 92, dmg: 20, r: 10, xp: 1, color: '#ff6a1a', shape: 'circle', explode: true, elem: 'fire' },
  wraith:   { name: 'Frost Wraith', hp: 45, speed: 78, dmg: 12, r: 14, xp: 2, color: '#57b7d0', shape: 'tri', elem: 'cold' },
  cultist:  { name: 'Void Cultist', hp: 38, speed: 55, dmg: 11, r: 13, xp: 3, color: '#6b3fa0', shape: 'diamond', elem: 'chaos',
              ranged: { range: 340, cd: 3.2, speed: 200, dmg: 14, color: '#c080ff', burst: 3 } },
  golem:    { name: 'Stone Golem', hp: 260, speed: 38, dmg: 22, r: 28, xp: 10, color: '#8a8478', shape: 'square' },
  // leaps at the player after a short crouch
  ghoul:    { name: 'Ash Ghoul', hp: 30, speed: 56, dmg: 12, r: 13, xp: 2, color: '#9a9488', shape: 'circle',
              leap: { range: 270, cd: 3.6, speed: 540, dur: 0.32, windup: 0.4 } },
  // lobs bile that leaves a poison pool
  spitter:  { name: 'Bile Spitter', hp: 34, speed: 48, dmg: 9, r: 13, xp: 3, color: '#7ac040', shape: 'diamond', elem: 'chaos',
              ranged: { range: 330, cd: 3.4, speed: 190, dmg: 8, color: '#9be05a', pool: true } },
  // empowers nearby monsters — kill it first
  shaman:   { name: 'Bone Shaman', hp: 26, speed: 50, dmg: 6, r: 11, xp: 4, color: '#a070e0', shape: 'diamond', elem: 'lightning',
              support: { cd: 4.5, r: 210, dur: 4 } },
  // ---- expansion: monsters that each ask for a different answer ----
  // raises skeletons from the ground and stays out of reach
  necromancer: { name: 'Grave Caller', hp: 42, speed: 46, dmg: 6, r: 13, xp: 6, color: '#7a6aa0', shape: 'diamond', elem: 'chaos',
              summoner: { cd: 5.5, n: 3, type: 'skeleton' } },
  // lowers its head, then charges in a straight (telegraphed) line
  charger:  { name: 'Bristleback Charger', hp: 70, speed: 50, dmg: 17, r: 18, xp: 4, color: '#a0603a', shape: 'square', scale: 0.9,
              charge: { range: 400, cd: 4.2, windup: 0.65, speed: 660, dur: 0.5 } },
  // slow and fat — bursts into a lingering poison pool when killed
  bloater:  { name: 'Plague Bloater', hp: 95, speed: 34, dmg: 10, r: 19, xp: 4, color: '#8ab040', shape: 'circle', elem: 'chaos', scale: 1.45,
              deathPool: { r: 95, dur: 5 } },
  // shells the ground where you're headed (circles on the floor)
  mortar:   { name: 'Ember Mortar', hp: 46, speed: 36, dmg: 15, r: 15, xp: 4, color: '#c8502a', shape: 'square', elem: 'fire', scale: 0.6,
              mortar: { range: 500, cd: 3.8, warn: 1.15, r: 70 } },
  // shields every monster around it: kill it first or hit for half
  guardian: { name: 'Aegis Sentinel', hp: 125, speed: 40, dmg: 12, r: 18, xp: 6, color: '#6a9ad0', shape: 'square', scale: 0.72,
              guard: { cd: 6, r: 210, dur: 4 } },
  // fades out and reappears right behind you
  stalker:  { name: 'Void Stalker', hp: 34, speed: 72, dmg: 14, r: 12, xp: 3, color: '#9050d0', shape: 'tri', elem: 'chaos', scale: 0.85,
              blink: { cd: 3.6, range: 560 } },
  // splits into a swarm of scuttlers when it dies
  broodmother: { name: 'Carrion Broodmother', hp: 110, speed: 40, dmg: 12, r: 20, xp: 6, color: '#7a6a3a', shape: 'square',
              brood: { n: 6, type: 'scuttler' } },
  scuttler: { name: 'Carrion Scuttler', hp: 6, speed: 135, dmg: 5, r: 8, xp: 0.5, color: '#a08a50', shape: 'tri', flutter: true, scale: 0.75, noWave: true },
};
// Codex text for every monster
const MONSTER_TH = {
  zombie: 'ซากศพเดินช้า แต่มาเป็นฝูง', skeleton: 'โครงกระดูกเร็วปานกลาง', bat: 'ค้างคาวบินเร็ว ส่ายไปมา', archer: 'ยิงธนูจากระยะไกล',
  brute: 'ตัวใหญ่ ถึก ตีแรง', volatile: 'วิ่งเข้าหาแล้วระเบิด — เห็นวงส้มให้รีบหนี', wraith: 'วิญญาณน้ำแข็ง ตีเป็นธาตุน้ำแข็ง',
  cultist: 'ยิงลูกเวทเคออสเป็นชุด 3 ลูก', golem: 'หินยักษ์ ชีวิตเยอะมาก', ghoul: 'ย่อตัวแล้วกระโจนใส่',
  spitter: 'พ่นแอ่งพิษลงพื้นตรงที่คุณยืน', shaman: 'บัฟมอนสเตอร์รอบตัวให้เร็วและแรงขึ้น — ฆ่าก่อน',
  necromancer: 'อัญเชิญโครงกระดูก 3 ตัวทุก 5 วิ และหนีไม่ให้เข้าใกล้ — ไล่ฆ่าก่อนกองทัพจะใหญ่',
  charger: 'ก้มหัวแล้วพุ่งชาร์จเป็นเส้นตรง (มีเส้นเตือน) — ก้าวหลบด้านข้าง',
  bloater: 'ตัวอ้วนเดินช้า ตายแล้วแตกเป็นแอ่งพิษใหญ่ 5 วิ — อย่าฆ่าตอนอยู่ติดตัว',
  mortar: 'ยิงกระสุนครกไฟลงตรงที่คุณกำลังจะเดินไป (มีวงเตือน) — เปลี่ยนทิศ',
  guardian: 'สร้างเกราะให้มอนสเตอร์รอบตัว รับดาเมจแค่ครึ่งเดียว (วงสีฟ้า) — ฆ่าก่อน',
  stalker: 'หายตัวแล้วโผล่ข้างหลังคุณ — ระวังเวลายืนนิ่ง',
  broodmother: 'ตายแล้วแตกเป็นฝูง Scuttler 6 ตัว', scuttler: 'ลูกแมลงตัวเล็ก วิ่งเร็วมาก',
};

// wave table: from minute `t`, these monster weights apply
const WAVES = [
  { t: 0,  w: { zombie: 6, skeleton: 3 } },
  { t: 1,  w: { zombie: 5, skeleton: 4, bat: 3 } },
  { t: 2.5, w: { zombie: 4, skeleton: 4, bat: 3, archer: 2, charger: 0.8 } },
  { t: 3,  w: { zombie: 3, skeleton: 4, bat: 3, archer: 2, ghoul: 1.5, charger: 1, stalker: 0.6 } },
  { t: 4,  w: { zombie: 3, skeleton: 4, bat: 3, archer: 2, brute: 1.5, volatile: 1, ghoul: 1.5, charger: 1, bloater: 0.8, necromancer: 0.5, stalker: 0.8 } },
  { t: 6,  w: { skeleton: 3, bat: 4, archer: 2, brute: 2, volatile: 2, wraith: 2, ghoul: 2, spitter: 1, charger: 1.2, bloater: 1, mortar: 0.8, stalker: 1.2, broodmother: 0.6, necromancer: 0.6 } },
  { t: 8,  w: { skeleton: 2, bat: 3, archer: 2, brute: 2, volatile: 2, wraith: 3, cultist: 1, ghoul: 2, spitter: 1.5, shaman: 0.8, charger: 1.5, bloater: 1.2, mortar: 1, stalker: 1.5, broodmother: 0.8, guardian: 0.5, necromancer: 0.7 } },
  { t: 11, w: { bat: 3, archer: 2, brute: 3, volatile: 2, wraith: 4, cultist: 2, golem: 0.6, ghoul: 2, spitter: 2, shaman: 1, charger: 1.8, bloater: 1.5, mortar: 1.3, stalker: 2, broodmother: 1, guardian: 0.8, necromancer: 0.9 } },
  { t: 14, w: { bat: 3, brute: 3, volatile: 3, wraith: 4, cultist: 3, golem: 1, ghoul: 2.5, spitter: 2, shaman: 1.2, charger: 2, bloater: 1.8, mortar: 1.6, stalker: 2.4, broodmother: 1.2, guardian: 1, necromancer: 1 } },
  { t: 17, w: { bat: 4, brute: 3, volatile: 3, wraith: 4, cultist: 3, golem: 1.5, ghoul: 3, spitter: 2.5, shaman: 1.5, charger: 2.4, bloater: 2, mortar: 2, stalker: 2.8, broodmother: 1.5, guardian: 1.2, necromancer: 1.2 } },
];

// The run lasts 15 minutes, but monsters scale on "difficulty minutes":
// 1 real minute = GAME_PACE difficulty minutes, so 15:00 is as hard as the old 20:00.
const GAME_PACE = 4 / 3;
const gameMin = () => (G.time / 60) * GAME_PACE;

// Health multiplier over time (minutes)
// steeper late game: builds come online around 8–12 min, monsters keep pace
const hpScale = (min) => 1 + min * 0.45 + min * min * 0.08;
const dmgScale = (min) => 1 + min * 0.18 + min * min * 0.008;
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
  // hits deal an element instead of physical — resistances matter
  flame_touched: { name: 'Flame-Touched', th: 'โจมตีเป็นไฟ', apply(e) { e.elem = 'fire'; e.dmg *= 1.15; } },
  frost_touched: { name: 'Frost-Touched', th: 'โจมตีเป็นน้ำแข็ง', apply(e) { e.elem = 'cold'; e.dmg *= 1.15; } },
  storm_touched: { name: 'Storm-Touched', th: 'โจมตีเป็นสายฟ้า', apply(e) { e.elem = 'lightning'; e.dmg *= 1.15; } },
  void_touched:  { name: 'Void-Touched', th: 'โจมตีเป็นเคออส', apply(e) { e.elem = 'chaos'; e.dmg *= 1.1; } },
};
const MAGIC_MODS = ['hasted', 'armoured', 'berserk', 'ele_res', 'phys_res', 'regen', 'flame_touched', 'frost_touched', 'storm_touched'];
const ELEM_COLOR = { physical: '#e6e0d0', fire: '#ff8a3d', cold: '#7fd8ff', lightning: '#fff27a', chaos: '#b56cff' };
const ELEM_TH = { physical: 'กายภาพ', fire: 'ไฟ', cold: 'น้ำแข็ง', lightning: 'สายฟ้า', chaos: 'เคออส' };

const RARE_PREFIX = ['Gloom', 'Blood', 'Doom', 'Grim', 'Ash', 'Rot', 'Dread', 'Night', 'Storm', 'Bone', 'Venom', 'Woe', 'Hate', 'Corpse', 'Pain'];
const RARE_SUFFIX = ['Gnaw', 'Howl', 'Ripper', 'Maw', 'Spawn', 'Bane', 'Thirst', 'Scourge', 'Feast', 'Wound', 'Shriek', 'Grinder', 'Fang', 'Wail'];
const rareName = () => pick(RARE_PREFIX) + ' ' + pick(RARE_SUFFIX);

// Bosses — patterns used by enemies.js boss AI
const BOSSES = [
  { at: 225, id: 'warden', name: 'Infernal Warden', th: 'ผู้คุมนรกเพลิง', hp: 3300, speed: 72, dmg: 22, r: 36,
    color: '#c43a1a', glow: '#ff7a2a', patterns: ['radial', 'charge', 'ring', 'cone'], ptype: 'fire' },
  { at: 450, id: 'colossus', name: 'Frostbound Colossus', th: 'ยักษ์น้ำแข็งนิรันดร์', hp: 20000, speed: 60, dmg: 36, r: 44,
    color: '#3a7fb8', glow: '#9fe0ff', patterns: ['ring', 'radial', 'slam', 'summon', 'donut', 'meteor'], ptype: 'cold' },
  { at: 675, id: 'herald', name: 'Herald of Storms', th: 'ผู้ประกาศพายุ', hp: 120000, speed: 85, dmg: 44, r: 40,
    color: '#b8a03a', glow: '#fff07a', patterns: ['strike', 'radial', 'charge', 'summon', 'beam', 'cone'], ptype: 'lightning' },
  { at: 900, id: 'sovereign', name: 'The Void Sovereign', th: 'จักรพรรดิแห่งความว่างเปล่า', hp: 600000, speed: 70, dmg: 50, r: 54,
    color: '#3a1a5a', glow: '#b060ff', patterns: ['spiral', 'strike', 'ring', 'radial', 'summon', 'charge', 'beam', 'donut', 'meteor'], ptype: 'chaos', final: true },
];
BOSSES[0].phases = [0.5];
for (let i = 1; i < BOSSES.length; i++) BOSSES[i].phases = [0.66, 0.33];

// a boss with some fields replaced (biome bosses, pinnacle)
function bossVariant(i, o) { return Object.assign({}, BOSSES[i], o); }
// Pinnacle boss: replaces the final boss on Tier 8+ maps
const PINNACLE = bossVariant(3, { id: 'sovereign_crown', name: 'The Hollow Crown', th: 'มงกุฎกลวง — จ้าวแห่ง Atlas',
  hp: 450000, dmg: 64, r: 60, color: '#6a5a1a', glow: '#ffd84a', ptype: 'fire', summon: 'shaman', phases: [0.75, 0.5, 0.25], pinnacle: true });

const RUN_LENGTH = 900; // seconds — final boss spawns at 15:00, then Endgame (optional)

// Endgame: after the final boss you may stay. Echo bosses arrive every ENDGAME_ECHO seconds,
// each one stronger than the last, and the reward grows with every minute survived.
const ENDGAME_ECHO = 100;
// every Endgame minute compounds monster life and damage on top of the normal curve
const endMin = () => (G.endless ? (G.time - G.endStart) / 60 : 0);
const endHp = () => Math.pow(1.18, endMin());
const endDmg = () => Math.pow(1.12, endMin());
function echoBoss(k) {
  const base = BOSSES[k % BOSSES.length];
  return bossVariant(k % BOSSES.length, { id: base.id, name: 'Echo of ' + base.name, th: `เงาสะท้อนครั้งที่ ${k + 1}`,
    hp: 260000 * Math.pow(1.4, k), dmg: 52 * (1 + 0.15 * k), final: false, echo: true, phases: [0.5],
    patterns: base.patterns.concat(['beam', 'donut', 'meteor']).filter((p, i, a) => a.indexOf(p) === i), summon: base.summon || 'shaman' });
}

// Shrines (PoE style temporary buffs)
const SHRINES = {
  diamond:      { name: 'Diamond Shrine', th: 'ศาลเพชร', desc: 'ทุกการโจมตีเป็นคริติคอล', color: '#bfefff', dur: 12 },
  acceleration: { name: 'Acceleration Shrine', th: 'ศาลเร่งความเร็ว', desc: 'เคลื่อนที่/ร่ายเร็วขึ้น 40%', color: '#7aff9a', dur: 15 },
  resistance:   { name: 'Resistance Shrine', th: 'ศาลต้านทาน', desc: 'รับดาเมจ 60% less', color: '#ffd24a', dur: 15 },
  covetous:     { name: 'Covetous Shrine', th: 'ศาลโลภ', desc: 'ดูดลูกแก้วประสบการณ์ทั้งหมดบนแผนที่', color: '#ff7ad8', dur: 0 },
  echoing:      { name: 'Echoing Shrine', th: 'ศาลก้องสะท้อน', desc: 'ทุกสกิลร่ายซ้ำ 1 ครั้ง', color: '#9a8aff', dur: 12 },
};
