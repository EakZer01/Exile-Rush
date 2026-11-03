'use strict';
// ============================================================
//  ENDGAME DATA — what keeps runs worth playing after the Legacy Tree
//  is full: unique drop sources and build-changing uniques, Scarabs,
//  Gem Mastery + alternate qualities, the reward Vault, Heirlooms,
//  Challenges, Voidstones, Atlas tier completion and the Unique
//  collection bonus. Runtime lives in js/progression.js.
// ============================================================

// ---------------- where a unique can drop ----------------
// Uniques with a source drop ONLY there; the rest drop anywhere.
const UNIQUE_SOURCES = {
  any:            { th: 'ทั่วไป', where: 'Rare, บอส, Strongbox, Breach, Ritual, Delirium' },
  boss_graveyard: { th: 'บอสสุดท้าย Cursed Graveyard', where: 'โค่นบอสตัวสุดท้ายในสุสานต้องสาป' },
  boss_ashen:     { th: 'Cinder Colossus', where: 'บอสสุดท้ายของ Ashen Wastes' },
  boss_frozen:    { th: 'Rime Herald', where: 'บอสสุดท้ายของ Frozen Hollow' },
  boss_marsh:     { th: 'Bog Leviathan', where: 'บอสสุดท้ายของ Toxic Marsh' },
  boss_void:      { th: 'Herald of the Void', where: 'บอสสุดท้ายของ Void Sanctum' },
  pinnacle:       { th: 'The Hollow Crown', where: 'Pinnacle Boss (แผนที่ Tier 8 ขึ้นไป)' },
  echo:           { th: 'Echo บอส', where: 'บอสที่มาทุก 100 วิใน Endgame ∞' },
  echo15:         { th: 'Echo ลึก', where: 'รางวัลการันตีเมื่อโค่น Echo บอสตัวที่ 15 ในรอบเดียว' },
  breach:         { th: 'Breach', where: 'ปิด Breach โดยฆ่าได้ 60 ตัวขึ้นไป' },
  ritual:         { th: 'Ritual', where: 'แลกด้วย Tribute ในวงพิธี (บางครั้งมีขาย)' },
  delirium:       { th: 'Delirium', where: 'ฆ่า 60 ตัวขึ้นไปในหมอก Delirium' },
  strongbox:      { th: 'Strongbox', where: 'เปิด Strongbox ทุกชนิด' },
};
const UNIQUE_SRC = {
  bone_king: 'boss_graveyard', crown_of_cinders: 'boss_ashen', glacier_heart: 'boss_frozen',
  plague_shroud: 'boss_marsh', plaguebringer: 'boss_marsh', eye_of_void: 'boss_void',
  glass_sage: 'echo', stormstring: 'breach', runeweaver: 'ritual', ouroboros: 'ritual',
  executioners_hood: 'delirium', girdle_plenty: 'strongbox',
};

// move one damage type onto another (base and added damage)
function convertDamage(s, from, to) {
  s.types[to] = (s.types[to] || 0) + (s.types[from] || 0); delete s.types[from];
  s.added[to] += s.added[from]; s.added[from] = 0;
}

// build-changing uniques: skill(s, id) reshapes one gem, apply(m) the rest
Object.assign(UNIQUES, {
  stormheart_fang: { slot: 'weapon', base: 'rusted_sword', name: 'Stormheart Fang', th: 'เขี้ยวหัวใจพายุ', src: 'breach', flavor: 'มันไม่ได้ฟันเนื้อ มันฟันฟ้า',
    lines: ['อาวุธ +40% ดาเมจกายภาพ', 'Flicker Strike: ดาเมจกายภาพทั้งหมดแปลงเป็นสายฟ้า', 'Flicker Strike: โอกาส Shock +40% · ดาเมจ 15% more', '+20% ดาเมจสายฟ้า'],
    local: { lphys: 40 }, apply(m) { m.incLight += 0.2; },
    skill(s, id) { if (id === 'flicker_strike') { convertDamage(s, 'physical', 'lightning'); s.shock += 0.4; s.more *= 1.15; s.color = '#fff27a'; } } },
  gale_focus: { slot: 'weapon', base: 'long_bow', name: 'Eye of the Gale', th: 'ดวงตาแห่งวายุ', src: 'pinnacle', flavor: 'พายุที่รวมเป็นหนึ่ง ไม่มีกำแพงใดต้าน',
    lines: ['อาวุธ +30% ดาเมจกายภาพ', 'Tornado Shot: ลูกธนูย่อยพุ่งไปข้างหน้าเป็นแนวแคบ แทนการกระจายรอบทิศ', 'Tornado Shot: ลูกธนูย่อย +2 · ดาเมจ 40% more', '(เน้นบอส แลกกับการกวาดฝูง)'],
    local: { lphys: 30 }, apply() {},
    skill(s, id) { if (id === 'tornado_shot') { s.splitFocus = true; s.split += 2; s.more *= 1.4; } } },
  pale_engine: { slot: 'weapon', base: 'gnarled_staff', name: 'The Pale Engine', th: 'จักรกลซีดเผือด', src: 'boss_frozen', flavor: 'เปลวไฟที่ลืมความร้อนของตัวเอง',
    lines: ['Fireball: ไฟทั้งหมดแปลงเป็นน้ำแข็ง (Chill / Freeze แทน Ignite)', 'Fireball: +1 ลูก · ระเบิดกว้างขึ้น 25%', '+20% ดาเมจน้ำแข็ง', '+15% ดาเมจ Spell'],
    apply(m) { m.incCold += 0.2; m.incSpell += 0.15; },
    skill(s, id) { if (id === 'fireball') { convertDamage(s, 'fire', 'cold'); s.ignite = 0; s.proj += 1; s.area *= 1.25; s.color = '#7fd8ff'; s.core = '#e8fbff'; } } },
  earthbreaker: { slot: 'weapon', base: 'driftwood_club', name: 'Earthbreaker Maul', th: 'ค้อนทลายพิภพ', src: 'boss_ashen', flavor: 'ภูเขาจำรอยของมันได้',
    lines: ['อาวุธ +50% ดาเมจกายภาพ', 'Earthquake: Aftershock +2 · พื้นที่ +30%', 'Earthquake: โจมตีช้าลง 15%'],
    local: { lphys: 50 }, apply() {},
    skill(s, id) { if (id === 'earthquake') { s.aftershocks = (s.aftershocks || 0) + 2; s.areaInc += 0.3; s.speedInc -= 0.15; } } },
  ossuary_mandate: { slot: 'helm', base: 'silk_hood', name: 'Ossuary Mandate', th: 'ราชโองการโกศกระดูก', src: 'boss_graveyard', flavor: 'กองทัพที่ไม่ต้องกิน ไม่ต้องนอน ไม่ต้องหายใจ',
    lines: ['Summon Skeletons: สูงสุด +3 · อัญเชิญเพิ่มครั้งละ +2', 'Summon Skeletons: ดาเมจ 15% less', '+20% ดาเมจมินเนียน'],
    apply(m) { m.incMinion += 0.2; },
    skill(s, id) { if (id === 'summon_skeletons') { s.maxCount += 3; if (s.summonN) s.summonN += 2; s.more *= 0.85; } } },
  voidweave_coil: { slot: 'ring', base: 'amethyst_ring', name: 'Voidweave Coil', th: 'ขดทอความว่างเปล่า', src: 'boss_void', flavor: 'สายฟ้าที่ตกลงสู่ความว่างเปล่า ไม่เคยกลับมาเป็นแสง',
    lines: ['Arc: สายฟ้าทั้งหมดแปลงเป็นเคออส · ติด Poison 40%', 'Arc: กระโดดเพิ่ม +3 · ไม่ทำ Shock', '+15% ดาเมจเคออส'],
    apply(m) { m.incChaos += 0.15; },
    skill(s, id) { if (id === 'arc') { convertDamage(s, 'lightning', 'chaos'); s.poison += 0.4; s.shock = 0; s.chain += 3; s.color = '#b56cff'; } } },
  hollow_crown: { slot: 'helm', base: 'iron_hat', name: 'Crown of the Hollow King', th: 'มงกุฎราชันกลวง', src: 'pinnacle', flavor: 'มงกุฎว่างเปล่า รอศีรษะที่กล้าพอ',
    lines: ['เลือก Keystone ได้สูงสุด +1 ต่อรอบ (4 อัน)', '+1 เลเวลเจมสกิลทั้งหมด', 'ชีวิตสูงสุด 8% less'],
    apply(m) { m.keystoneAdd += 1; m.gemLevel += 1; m.lifeMore *= 0.92; } },
  dreamshard_edge: { slot: 'weapon', base: 'glass_shank', name: 'Dreamshard Edge', th: 'คมเศษฝัน', src: 'delirium', flavor: 'ทุกใบมีดคือความฝันที่ไม่มีวันตื่น',
    lines: ['Blade Vortex: ใบมีด +4 · หมุนกว้างขึ้น 20%', 'Blade Vortex: แต่ละใบทำดาเมจ 20% less', '+20% ตัวคูณคริ'],
    apply(m) { m.critMulti += 0.2; },
    skill(s, id) { if (id === 'blade_vortex') { s.maxCount += 4; s.areaInc += 0.2; s.more *= 0.8; } } },
  blood_censer: { slot: 'amulet', base: 'amber_amulet', name: 'Censer of Blood Rites', th: 'กระถางพิธีโลหิต', src: 'ritual', flavor: 'ไฟศักดิ์สิทธิ์ต้องการเลือดเป็นเชื้อ',
    lines: ['Righteous Fire: รัศมี +40% · ดาเมจเผา 30% more', 'ฟื้นชีวิต 1% ต่อวินาที', '+10% ชีวิตสูงสุด'],
    apply(m) { m.regen += 0.01; m.lifeInc += 0.1; },
    skill(s, id) { if (id === 'righteous_fire') { s.areaInc += 0.4; s.burnMore *= 1.3; } } },
  sovereign_echo: { slot: 'amulet', base: 'jade_amulet', name: 'Echo of the Sovereign', th: 'เสียงก้องแห่งจักรพรรดิ', src: 'echo15', flavor: 'ราชันผู้ล่วงลับพูดซ้ำในห้วงว่างเปล่า — คราวนี้มันตอบกลับมา',
    lines: ['ดูดชีวิต 1% ของดาเมจ', '+12% ความเร็วร่าย/โจมตี', 'Vaal Soul ชาร์จเร็วขึ้น 25%'],
    apply(m) { m.leech += 0.01; m.speedInc += 0.12; m.vaalSoulMul = (m.vaalSoulMul || 1) * 1.25; } },
});
for (const id in UNIQUE_SRC) UNIQUES[id].src = UNIQUE_SRC[id];
const uniqueSrc = (id) => UNIQUES[id].src || 'any';

// ---------------- Scarabs: slotted into the Map Device, consumed per map ----------------
// a(f) changes the run's atlas effects, map(fx) the map's monster effects
const SCARABS = {
  breach:    { name: 'Breach Scarab', th: 'Breach เกิดบ่อยขึ้น 60% · รางวัล Breach +30%', color: '#c070ff', w: 10, a(f) { f.breachRate *= 1.6; f.breachLoot *= 1.3; } },
  box:       { name: 'Strongbox Scarab', th: 'Strongbox เกิดบ่อยขึ้น 60% และดรอปของเพิ่ม', color: '#c8b08a', w: 10, a(f) { f.boxRate *= 1.6; f.boxBonus = true; } },
  essence:   { name: 'Essence Scarab', th: 'Essence เกิดบ่อยขึ้น 70% · บางตัวมี Essence 2 อัน', color: '#c0a0ff', w: 10, a(f) { f.essRate *= 1.7; f.essDouble = true; } },
  ritual:    { name: 'Ritual Scarab', th: 'Tribute +40% · มี Ritual ครั้งที่ 3', color: '#ff5a5a', w: 9, a(f) { f.tribute *= 1.4; f.ritualExtra = true; } },
  delirium:  { name: 'Delirium Scarab', th: 'หมอก Delirium นานขึ้น 30% · รางวัล +40%', color: '#e8eef8', w: 9, a(f) { f.deliDur *= 1.3; f.deliReward *= 1.4; } },
  gilded:    { name: 'Gilded Scarab', th: 'ไอเทมดรอป +25% · Shards +15%', color: '#ffd84a', w: 7, a(f) { f.itemQty *= 1.25; f.shardMul *= 1.15; } },
  elite:     { name: 'Scarab of Elites', th: 'มอนสเตอร์ Rare บ่อยขึ้น 50% (ยากขึ้น) · Scarab ดรอป ×2', color: '#ff9a5a', w: 6, a(f) { f.scarabDrop *= 2; }, map(fx) { fx.rareRate *= 1.5; } },
  reliquary: { name: 'Reliquary Scarab', th: 'โอกาส Unique ×2 · Unique เฉพาะแหล่งบ่อยขึ้น 50%', color: '#e8883a', w: 3, rare: true, a(f) { f.uniqueMul *= 2; f.srcUnique *= 1.5; } },
  hunted:    { name: 'Scarab of the Hunted', th: 'บอสสุดท้ายดรอป Unique ประจำพื้นที่แน่นอน', color: '#ff4a4a', w: 2, rare: true, a(f) { f.srcBossSure = true; } },
  vault:     { name: 'Vault Scarab', th: 'ห้องรางวัลหลังชนะ: การ์ด +1 · ระดับตำนานบ่อยขึ้น', color: '#fff0a0', w: 3, rare: true, a(f) { f.vaultExtra += 1; f.vaultLuck += 0.15; } },
};
const SCARAB_PRICE = 45;                      // Shards for a random scarab at the Map Device
const randomScarab = () => weightedSample(Object.keys(SCARABS), 1, (k) => SCARABS[k].w)[0];

// ---------------- Gem Mastery: every gem levels up across runs ----------------
const GEM_XP_REQ = (lv) => 50 + 20 * lv;     // xp from level lv to lv + 1
const GEM_ALT_AT = { anomalous: 3, divergent: 6, phantasmal: 10 };
const GEM_HEAD_START_AT = 15;                 // from this mastery level the gem arrives +2 levels
const GEM_INFUSE_XP = 25;
const gemInfuseCost = (lv) => 20 + 4 * lv;   // Shards per infusion, rises forever
// damage bonus of a mastery level: +2% each up to 20, then +0.5% each (no cap)
const gemMasteryMore = (lv) => 1 + 0.02 * Math.min(lv, 20) + 0.005 * Math.max(0, lv - 20);
const ALT_QUALITY = {
  anomalous: { name: 'Anomalous', th: 'แปรปรวน' },
  divergent: { name: 'Divergent', th: 'แตกแขนง' },
  phantasmal: { name: 'Phantasmal', th: 'มายา' },
};
// what an alternate quality does depends on the gem's tags
function altQualityDesc(alt, id) {
  const t = SKILLS[id].tags, main = Object.keys(SKILLS[id].base.types)[0];
  if (alt === 'anomalous') {
    if (t.includes('Projectile')) return '+1 Projectile · ดาเมจ 12% less';
    if (t.includes('Minion')) return 'มินเนียนสูงสุด +1 · ดาเมจ 10% less';
    if (t.includes('AoE')) return '+30% พื้นที่ · ดาเมจ 10% less';
    return 'เร็วขึ้น 20% · ดาเมจ 10% less';
  }
  if (alt === 'divergent') {
    const ail = { fire: 'Ignite', cold: 'Chill แรงขึ้น', lightning: 'Shock', chaos: 'Poison', physical: 'Bleed' }[main];
    return `โอกาส ${ail} +30% · ดาเมจ Ailment 25% more · ดาเมจ Hit 10% less`;
  }
  return '+5% โอกาสคริ (base) · +40% ตัวคูณคริ · ช้าลง 10%';
}
function applyAltQuality(s, alt, id) {
  const t = SKILLS[id].tags, main = Object.keys(SKILLS[id].base.types)[0];
  if (alt === 'anomalous') {
    if (t.includes('Projectile')) { s.proj += 1; s.more *= 0.88; }
    else if (t.includes('Minion')) { s.maxCount += 1; s.more *= 0.9; }
    else if (t.includes('AoE')) { s.areaInc += 0.3; s.more *= 0.9; }
    else { s.speedInc += 0.2; s.more *= 0.9; }
  } else if (alt === 'divergent') {
    if (main === 'fire') s.ignite += 0.3; else if (main === 'cold') s.chillEff *= 1.5;
    else if (main === 'lightning') s.shock += 0.3; else if (main === 'physical') s.bleed += 0.3; else s.poison += 0.3;
    s.ailMore *= 1.25; s.more *= 0.9;
  } else if (alt === 'phantasmal') { s.crit += 0.05; s.critMulti += 0.4; s.speedInc -= 0.1; }
}

// ---------------- Heirlooms: stash items that grow every time they come home ----------------
const HEIR_XP = [2, 5, 9, 14, 20];           // total xp for heirloom level 1..5
const HEIR_BIND_COST = 80;
const HEIR_MAX = 4;                           // heirlooms you can own at once
const heirLevel = (xp) => HEIR_XP.filter((n) => xp >= n).length;

// ---------------- Vault: pick one reward after clearing a map ----------------
const VAULT_RARITY = { common: { th: 'ธรรมดา', color: '#c8c8c8', k: 1 }, rare: { th: 'หายาก', color: '#ffe866', k: 2 }, legendary: { th: 'ตำนาน', color: '#e8883a', k: 3.5 } };

// ---------------- Challenges: goals that pay out and stack permanent bonuses ----------------
// test(r, M) runs at the end of every run; r is the run record built in progression.js
const CHALLENGES = [
  { id: 'win3', name: 'นักสำรวจ', desc: 'ชนะแผนที่ Tier 3 ขึ้นไป', shards: 60, test: (r) => r.win && r.tier >= 3 },
  { id: 'win6', name: 'ผู้พิชิต', desc: 'ชนะแผนที่ Tier 6 ขึ้นไป', shards: 120, test: (r) => r.win && r.tier >= 6 },
  { id: 'win10', name: 'สุดขอบแผนที่', desc: 'ชนะแผนที่ Tier 10', shards: 250, test: (r) => r.win && r.tier >= 10 },
  { id: 'crown', name: 'ปลงพระชนม์', desc: 'โค่น The Hollow Crown', shards: 200, test: (r) => r.pinnacle },
  { id: 'mods5', name: 'ท้าทายโชคชะตา', desc: 'ชนะแผนที่ที่มี mod 5 อันขึ้นไป', shards: 120, test: (r) => r.win && r.mods >= 5 },
  { id: 'hc', name: 'ชีวิตเดียว', desc: 'ชนะแผนที่ใน Hardcore', shards: 150, test: (r) => r.win && r.hc },
  { id: 'ci', name: 'ไร้เลือด', desc: 'ชนะโดยใช้ Keystone Chaos Inoculation', shards: 120, test: (r) => r.win && r.ci },
  { id: 'trio', name: 'เรียบง่าย', desc: 'ชนะโดยมีสกิลไม่เกิน 3 สกิล', shards: 120, test: (r) => r.win && r.skills <= 3 },
  { id: 'nokey', name: 'ไม่พึ่ง Keystone', desc: 'ชนะโดยไม่เลือก Keystone เลย', shards: 100, test: (r) => r.win && r.keystones === 0 },
  { id: 'endless5', name: 'ไม่รู้จบ', desc: 'รอดใน Endgame ∞ ได้ 5 นาที', shards: 150, test: (r) => r.endless >= 300 },
  { id: 'echo3', name: 'เสียงสะท้อน', desc: 'โค่น Echo บอส 3 ตัวในรอบเดียว', shards: 150, test: (r) => r.echoes >= 3 },
  { id: 'mastery3', name: 'ผู้ชำนาญหลายสาย', desc: 'ปลด Mastery 3 สายในรอบเดียว', shards: 100, test: (r) => r.masteries >= 3 },
  { id: 'evo2', name: 'วิวัฒนาการคู่', desc: 'วิวัฒน์เจม Vaal 2 อันในรอบเดียว', shards: 100, test: (r) => r.evolved >= 2 },
  { id: 'awaken3', name: 'ตื่นรู้', desc: 'Awaken Support 3 อันในรอบเดียว', shards: 100, test: (r) => r.awakened >= 3 },
  { id: 'kills5k', name: 'เครื่องจักรสังหาร', desc: 'ฆ่า 5,000 ตัวในรอบเดียว', shards: 80, test: (r) => r.kills >= 5000 },
  { id: 'lv60', name: 'ตำนานที่มีชีวิต', desc: 'ถึงเลเวล 60 ในรอบเดียว', shards: 100, test: (r) => r.level >= 60 },
  { id: 'breach3', name: 'นักปิดรอยแยก', desc: 'ปิด Breach 3 ครั้งในรอบเดียว', shards: 80, test: (r) => r.breaches >= 3 },
  { id: 'scarab2', name: 'นักเล่นแร่ด้วงทอง', desc: 'ชนะแผนที่ที่ใส่ Scarab 2 อันขึ้นไป', shards: 80, test: (r) => r.win && r.scarabs >= 2 },
  { id: 'allcls', name: 'ทายาททุกสาย', desc: 'ชนะด้วยทุกคลาส (สะสม)', shards: 300, test: (r, M) => CLASSES.every((c) => M.winCls && M.winCls[c.id]) },
  { id: 'uniq20', name: 'นักสะสม', desc: 'ค้นพบ Unique 20 ชิ้น (สะสม)', shards: 150, test: (r, M) => Object.keys(M.found || {}).length >= 20 },
  { id: 'atlas25', name: 'นักทำแผนที่', desc: 'ผ่านแผนที่ใหม่ 25 แผนที่ (สะสม)', shards: 150, test: (r, M) => Object.keys(M.atlas.done).length >= 25 },
  { id: 'gem10', name: 'ปรมาจารย์เจม', desc: 'Gem Mastery ของเจมใดก็ได้ถึงเลเวล 10', shards: 120, test: (r, M) => Object.values(M.gems || {}).some((g) => g.lv >= 10) },
  { id: 'heir5', name: 'มรดกตกทอด', desc: 'Heirloom ถึงเลเวล 5', shards: 120, test: (r, M) => r.heirMax >= 5 },
  { id: 'daily', name: 'ประจำวัน', desc: 'ชนะ Daily Challenge', shards: 80, test: (r) => r.win && r.daily },
];
// completed-challenge milestones: permanent bonuses that stack
const CHAL_MILESTONES = [
  { n: 4, desc: '+1 ช่อง Scarab', fx(f) { f.scarabSlots += 1; } },
  { n: 8, desc: 'เก็บของเข้า Stash / พกเข้ารอบ +1 ชิ้น', fx(f) { f.stashAdd += 1; } },
  { n: 12, desc: '+10% Shards ทุกรอบ', fx(f) { f.shardMul *= 1.1; } },
  { n: 16, desc: 'ห้องรางวัลหลังชนะ: การ์ด +1', fx(f) { f.vaultExtra += 1; } },
  { n: 20, desc: 'ทุกสกิลทำดาเมจ 5% more · +5% ชีวิตสูงสุด', mods(m) { m.moreAll *= 1.05; m.lifeInc += 0.05; } },
  { n: 24, desc: 'Unique ดรอปบ่อยขึ้น 30%', fx(f) { f.uniqueMul *= 1.3; } },
];

// Endgame Echo milestones: one-time rewards as the endless ladder deepens
// (th = in-run announcement, teaser = the "next goals" line on the menu)
const ECHO_MILESTONES = [
  { n: 5,  th: 'ปลดล็อกออร่า "เสียงก้อง"', teaser: 'ปลดออร่า "เสียงก้อง"' },
  { n: 10, th: 'ปลดล็อกฉายา "ผู้ข้ามห้วง"', teaser: 'ปลดฉายา "ผู้ข้ามห้วง"' },
  { n: 15, th: 'รางวัล Unique เสียงก้องแห่งจักรพรรดิ — ดรอปตรงนี้!', teaser: 'การันตี Unique "เสียงก้องแห่งจักรพรรดิ"', src: 'echo15' },
  { n: 20, th: 'ปลดล็อกฉายา "ราชาห้วงว่าง" · Shards ถาวร +10%', teaser: 'ปลดฉายา "ราชาห้วงว่าง" + Shards ถาวร +10%' },
];

// ---------------- Unique collection: every 5 found adds a permanent bonus ----------------
const COLLECTION_BONUS = [
  { n: 5, desc: '+5% Shards ทุกรอบ', fx(f) { f.shardMul *= 1.05; } },
  { n: 10, desc: '+4% ชีวิตสูงสุด', mods(m) { m.lifeInc += 0.04; } },
  { n: 15, desc: 'ทุกสกิลทำดาเมจ 5% more', mods(m) { m.moreAll *= 1.05; } },
  { n: 20, desc: 'Unique ดรอปบ่อยขึ้น 20%', fx(f) { f.uniqueMul *= 1.2; } },
  { n: 25, desc: '+1 ช่อง Scarab', fx(f) { f.scarabSlots += 1; } },
  { n: 30, desc: '+5% ชีวิตสูงสุด · ทุกสกิลทำดาเมจ 5% more', mods(m) { m.lifeInc += 0.05; m.moreAll *= 1.05; } },
  { n: 40, desc: 'Unique เฉพาะแหล่งบ่อยขึ้น 50% · Shards +10%', fx(f) { f.srcUnique *= 1.5; f.shardMul *= 1.1; } },
];

// ---------------- Voidstones: raise every map from Tier 6 up, for more loot ----------------
const VOIDSTONE_MIN_TIER = 6;
const VOIDSTONES = [
  { id: 'crown', name: 'Crowned Voidstone', req: 'โค่น The Hollow Crown', test: (r) => r.pinnacle },
  { id: 'atlas', name: 'Cartographer Voidstone', req: 'ผ่านครบทุกพื้นที่ใน Tier ใดก็ได้ตั้งแต่ Tier 6 ขึ้นไป', test: (r, M) => atlasCompletedTiers().some((t) => t >= 6) },
  { id: 'echo', name: 'Echoing Voidstone', req: 'โค่น Echo บอสรวม 10 ตัว (สะสม)', test: (r, M) => (M.life.echoes || 0) >= 10 },
  { id: 'hc', name: 'Deathless Voidstone', req: 'ชนะแผนที่ Tier 8 ขึ้นไปใน Hardcore', test: (r) => r.win && r.hc && r.tier >= 8 },
];
// per voidstone, on maps of VOIDSTONE_MIN_TIER and up
const VOID_FX = { monHp: 1.15, monDmg: 1.08, itemQty: 1.12, uniqueMul: 1.15, shardMul: 1.1, scarabDrop: 1.15 };

// ---------------- Atlas tier completion ----------------
const ATLAS_TIER_SCARABS = 2;                 // scarabs granted the first time a tier is complete
