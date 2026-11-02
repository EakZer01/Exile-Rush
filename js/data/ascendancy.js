'use strict';
// ============================================================
//  ASCENDANCY — subclasses chosen after the first boss falls.
//  Each class has two; each subclass has 4 nodes. Node 0 is granted
//  on choosing, later bosses each grant one pick from the rest.
//  apply(m) mutates player.mods like passives; flags go in m.ks.
//  The Scion's Paragon draws its picks from every other subclass.
// ============================================================
const ASCENDANCY = {};
const ASC_NODES = {};
function defAsc(d) {
  ASCENDANCY[d.id] = d;
  for (const n of d.nodes) { n.asc = d.id; ASC_NODES[n.id] = n; }
}

// ---- Witch ----
defAsc({ id: 'pyromancer', cls: 'witch', name: 'Pyromancer', th: 'นักเวทเพลิง', color: '#ff7a3a', icon: '♨',
  desc: 'สายธาตุไฟ เผาทุกอย่างให้ลุกลาม',
  nodes: [
    { id: 'kindled_soul', name: 'Kindled Soul', icon: '✹', desc: '+25% ดาเมจธาตุ · ทุกสกิลมีโอกาส Ignite +15%', apply(m) { m.incEle += 0.25; m.igniteAdd += 0.15; } },
    { id: 'wildfire', name: 'Wildfire', icon: '☄', desc: 'ศัตรูที่ติด Ignite ตายแล้วระเบิด ทำดาเมจไฟ 20% ของชีวิตสูงสุดของมันรอบตัว', apply(m) { m.ks.igniteBurst = true; } },
    { id: 'searing_focus', name: 'Searing Focus', icon: '◉', desc: 'ดาเมจ Hit ใส่ศัตรูที่ติด Ignite 30% more', apply(m) { m.vsIgnited *= 1.3; } },
    { id: 'inner_inferno', name: 'Inner Inferno', icon: '♨', desc: 'ดาเมจเผาไหม้ (Ignite / Burning) 50% more · Ailment นานขึ้น 30%', apply(m) { m.burnMore *= 1.5; m.ailDurInc += 0.3; } },
  ] });
defAsc({ id: 'bonecaller', cls: 'witch', name: 'Bonecaller', th: 'ผู้ปลุกวิญญาณ', color: '#a070ff', icon: '☠',
  desc: 'สายมินเนียน กองทัพหัวกะโหลกรับใช้',
  nodes: [
    { id: 'grave_command', name: 'Grave Command', icon: '☠', desc: 'ได้ Summon Raging Spirit Lv 3 ฟรี (ถ้ามีแล้ว +3 เลเวล) · มินเนียนสูงสุด +1', grant: 'raging_spirit', apply(m) { m.minionCount += 1; } },
    { id: 'bone_legion', name: 'Bone Legion', icon: '⚔', desc: 'ดาเมจมินเนียน 40% more · มินเนียนเร็วขึ้น 20%', apply(m) { m.moreMinion *= 1.4; m.minionSpeed += 0.2; } },
    { id: 'soul_tether', name: 'Soul Tether', icon: '♥', desc: 'ดูดชีวิต 3% ของดาเมจมินเนียน · รับดาเมจ 15% less ขณะมีมินเนียน 3 ตัวขึ้นไป', apply(m) { m.minionLeech += 0.03; m.ks.minionGuard = true; } },
    { id: 'pyre_rite', name: 'Pyre Rite', icon: '✷', desc: 'ศัตรูที่ถูกมินเนียนฆ่าจะระเบิดเป็นไฟ ทำดาเมจรอบตัว', apply(m) { m.ks.minionKillBoom = true; } },
  ] });

// ---- Ranger ----
defAsc({ id: 'hawkeye', cls: 'ranger', name: 'Hawkeye', th: 'ตาเหยี่ยว', color: '#8ae06a', icon: '➶',
  desc: 'สาย Projectile ยิงไกล ยิงเยอะ',
  nodes: [
    { id: 'volley', name: 'Volley', icon: '➶', desc: '+1 Projectile ให้ทุกสกิล Projectile', apply(m) { m.projAdd += 1; } },
    { id: 'far_shot', name: 'Far Shot', icon: '◎', desc: 'Projectile ทำดาเมจมากขึ้นตามระยะที่บิน (สูงสุด 40% more)', apply(m) { m.ks.farShot = true; } },
    { id: 'piercing_gale', name: 'Piercing Gale', icon: '➹', desc: 'Projectile ทะลุ +2 · ความเร็วกระสุน +30%', apply(m) { m.pierceAdd += 2; m.projSpeedInc += 0.3; } },
    { id: 'hunters_rhythm', name: "Hunter's Rhythm", icon: '⏱', desc: 'ความเร็วโจมตี/ร่าย +20% · เคลื่อนที่ +10%', apply(m) { m.speedInc += 0.2; m.moveInc += 0.1; } },
  ] });
defAsc({ id: 'wildwarden', cls: 'ranger', name: 'Wildwarden', th: 'ผู้พิทักษ์ป่า', color: '#5fb88a', icon: '⚗',
  desc: 'สายฟลาสก์และพิษ อยู่รอดด้วยยาวิเศษ',
  nodes: [
    { id: 'herbalist', name: 'Herbalist', icon: '⚗', desc: 'ฟลาสก์ได้ชาร์จ +60% · ฟื้นฟูมากขึ้น 40% · ฟลาสก์ชาร์จเองช้าๆ', apply(m) { m.flaskCharge += 0.6; m.flaskEff += 0.4; m.flaskRegen += 1; } },
    { id: 'natures_fury', name: "Nature's Fury", icon: '❦', desc: 'ขณะฟลาสก์ใดๆ ทำงาน: ดาเมจ 35% more', apply(m) { m.ks.flaskDmg = true; } },
    { id: 'thornhide', name: 'Thornhide', icon: '⛨', desc: 'ขณะฟลาสก์ใดๆ ทำงาน: รับดาเมจ 30% less', apply(m) { m.ks.flaskGuard = true; } },
    { id: 'venom_craft', name: 'Venom Craft', icon: '☣', desc: '+30% ดาเมจเคออส · ทุกสกิลมีโอกาส Poison +20%', apply(m) { m.incChaos += 0.3; m.poisonAdd += 0.2; } },
  ] });

// ---- Marauder ----
defAsc({ id: 'ironclad', cls: 'marauder', name: 'Ironclad', th: 'ร่างเหล็ก', color: '#c0c4d0', icon: '⛊',
  desc: 'สายถึก ไม่มีอะไรล้มได้',
  nodes: [
    { id: 'iron_body', name: 'Iron Body', icon: '⛊', desc: '+30% ชีวิตสูงสุด · รับดาเมจ 10% less', apply(m) { m.lifeInc += 0.3; m.dmgTaken *= 0.9; } },
    { id: 'unbreakable', name: 'Unbreakable', icon: '⛨', desc: 'ดาเมจที่ได้รับต่อครั้งไม่เกิน 12% ของชีวิตสูงสุด', apply(m) { m.dmgCap = 0.12; } },
    { id: 'undying', name: 'Undying', icon: '✚', desc: 'ฟื้นชีวิต +1%/วิ · ฟื้นเร็วขึ้น 3 เท่าเมื่อชีวิตต่ำกว่า 35%', apply(m) { m.regen += 0.01; m.ks.lowRegen = true; } },
    { id: 'earthshaker', name: 'Earthshaker', icon: '◎', desc: '+25% พื้นที่ · +25% ดาเมจ AoE', apply(m) { m.areaInc += 0.25; m.incAoE += 0.25; } },
  ] });
defAsc({ id: 'bloodrager', cls: 'marauder', name: 'Bloodrager', th: 'ผู้คลั่งโลหิต', color: '#e03a3a', icon: '✊',
  desc: 'สาย Rage ยิ่งฆ่ายิ่งแรง',
  nodes: [
    { id: 'rage', name: 'Rage', icon: '✊', desc: 'ฆ่าศัตรูได้ Rage (สูงสุด 30 ค่อยๆ ลดเมื่อไม่ได้ฆ่า) · แต่ละแต้ม ดาเมจ 1% more และความเร็ว +0.5%', apply(m) { m.ks.rage = true; } },
    { id: 'blood_frenzy', name: 'Blood Frenzy', icon: '⚔', desc: 'ความเร็วโจมตี/ร่าย +25% · +25% ดาเมจ Attack', apply(m) { m.speedInc += 0.25; m.incAttack += 0.25; } },
    { id: 'crimson_thirst', name: 'Crimson Thirst', icon: '♥', desc: 'ดูดชีวิต 2% ของดาเมจทุกสกิล · ดูดได้เร็วขึ้น 2 เท่า', apply(m) { m.leech += 0.02; m.leechCap *= 2; } },
    { id: 'death_wish', name: 'Death Wish', icon: '☠', desc: 'ดาเมจ 40% more เมื่อชีวิตต่ำกว่า 50%', apply(m) { m.ks.lowLifeDmg = true; } },
  ] });

// ---- Templar ----
defAsc({ id: 'stormherald', cls: 'templar', name: 'Stormherald', th: 'ผู้ประกาศพายุ', color: '#ffe96a', icon: 'ϟ',
  desc: 'สายสายฟ้า ฟ้าผ่าลงมาเองทุกจังหวะ',
  nodes: [
    { id: 'conductor', name: 'Conductor', icon: 'ϟ', desc: 'ทุกสกิลมีโอกาส Shock +20% · ผล Shock แรงขึ้น 50%', apply(m) { m.shockAdd += 0.2; m.shockEffInc += 0.5; } },
    { id: 'forked_lightning', name: 'Forked Lightning', icon: '⟟', desc: 'สกิล Projectile และ Chaining กระโดดเพิ่ม +1', apply(m) { m.chainAdd += 1; } },
    { id: 'thunderclap', name: 'Thunderclap', icon: '☇', desc: 'ทุก 2.5 วิ ฟ้าผ่าศัตรู 4 ตัวรอบตัว (ดาเมจสายฟ้าตามเลเวล)', apply(m) { m.ks.thunder = true; } },
    { id: 'elemental_mastery', name: 'Elemental Mastery', icon: '❂', desc: 'ดาเมจธาตุ 20% more', apply(m) { m.moreEle *= 1.2; } },
  ] });
defAsc({ id: 'oathkeeper', cls: 'templar', name: 'Oathkeeper', th: 'ผู้รักษาคำสาบาน', color: '#f0d890', icon: '✟',
  desc: 'สายศักดิ์สิทธิ์ โล่และการตอบโต้',
  nodes: [
    { id: 'divine_aegis', name: 'Divine Aegis', icon: '◈', desc: 'ทุก 6 วิ ได้โล่ศักดิ์สิทธิ์ที่กันดาเมจได้ 1 ครั้ง', apply(m) { m.ks.aegis = true; } },
    { id: 'retribution', name: 'Retribution', icon: '✸', desc: 'เมื่อโดนโจมตี ปล่อยคลื่นแสงรอบตัว ทำดาเมจไฟ (คูลดาวน์ 1 วิ)', apply(m) { m.ks.retaliate = true; } },
    { id: 'zealot', name: 'Zealot', icon: '✧', desc: '+30% ดาเมจ Spell · +15% ชีวิตสูงสุด', apply(m) { m.incSpell += 0.3; m.lifeInc += 0.15; } },
    { id: 'martyrs_grace', name: "Martyr's Grace", icon: '✚', desc: 'ฟื้นชีวิต +0.8%/วิ · รับดาเมจ 10% less', apply(m) { m.regen += 0.008; m.dmgTaken *= 0.9; } },
  ] });

// ---- Shadow ----
defAsc({ id: 'nightblade', cls: 'shadow', name: 'Nightblade', th: 'ใบมีดรัตติกาล', color: '#6ad0d0', icon: '✦',
  desc: 'สายคริติคอล ปลิดชีพในพริบตา',
  nodes: [
    { id: 'assassinate', name: 'Assassinate', icon: '✪', desc: '+3% โอกาสคริ (base) · +50% ตัวคูณคริ', apply(m) { m.critAdd += 0.03; m.critMulti += 0.5; } },
    { id: 'executioner', name: 'Executioner', icon: '☠', desc: 'คริใส่ศัตรูที่ไม่ใช่บอสที่ชีวิตต่ำกว่า 30% = ตายทันที', apply(m) { m.ks.critCull = true; } },
    { id: 'opportunist', name: 'Opportunist', icon: '◉', desc: 'ดาเมจใส่ Rare และบอส 30% more', apply(m) { m.moreVsRare *= 1.3; } },
    { id: 'shadowstep', name: 'Shadowstep', icon: '↯', desc: 'คูลดาวน์ Dash 40% สั้นลง · หลัง Dash คริแน่นอน 1.5 วิ', apply(m) { m.dashCdMul *= 0.6; m.ks.shadowstep = true; } },
  ] });
defAsc({ id: 'hexbinder', cls: 'shadow', name: 'Hexbinder', th: 'ผู้ผูกคำสาป', color: '#b56cff', icon: '☣',
  desc: 'สายเคออสและคำสาป ศัตรูเน่าตายเอง',
  nodes: [
    { id: 'withering', name: 'Withering', icon: '☣', desc: '+30% ดาเมจเคออส · ทุกสกิลมีโอกาส Poison +25%', apply(m) { m.incChaos += 0.3; m.poisonAdd += 0.25; } },
    { id: 'plague_burst', name: 'Plague Burst', icon: '✷', desc: 'ศัตรูที่ติด Poison ตายแล้วระเบิด กระจายพิษไปรอบๆ', apply(m) { m.ks.poisonBurst = true; } },
    { id: 'hex_field', name: 'Hex Field', icon: '◌', desc: 'ศัตรูในระยะ 220 รอบตัวรับดาเมจ 20% more', apply(m) { m.ks.hexField = true; } },
    { id: 'entropy', name: 'Entropy', icon: '⧗', desc: 'ดาเมจต่อเนื่อง (DoT ทุกชนิด) 40% more', apply(m) { m.dotMore *= 1.4; } },
  ] });

// ---- Duelist ----
defAsc({ id: 'gladiator', cls: 'duelist', name: 'Gladiator', th: 'นักสู้ในสนาม', color: '#e0a050', icon: '⚔',
  desc: 'สายกายภาพ แทงทะลุ (Impale) และโชว์ในสนาม',
  nodes: [
    { id: 'fortify', name: 'Fortify', icon: '⛨', desc: 'รับดาเมจ 15% less · +25% ดาเมจกายภาพ', apply(m) { m.dmgTaken *= 0.85; m.incPhys += 0.25; } },
    { id: 'impale', name: 'Impale', icon: '➴', desc: 'Hit กายภาพมีโอกาส 30% Impale: ทำดาเมจกายภาพ 60% ซ้ำอีกครั้งหลัง 0.4 วิ', apply(m) { m.ks.impale = true; } },
    { id: 'blade_dance', name: 'Blade Dance', icon: '✺', desc: 'ความเร็วโจมตี/ร่าย +15% · +15% พื้นที่', apply(m) { m.speedInc += 0.15; m.areaInc += 0.15; } },
    { id: 'arena_champion', name: 'Arena Champion', icon: '♛', desc: 'ฆ่า Rare หรือบอส: ดาเมจ 40% more นาน 12 วิ', apply(m) { m.ks.headsman = true; } },
  ] });
defAsc({ id: 'reaver', cls: 'duelist', name: 'Reaver', th: 'ผู้ล่าเลือด', color: '#c04040', icon: '♥',
  desc: 'สายดูดเลือดและประหาร',
  nodes: [
    { id: 'bloodlust', name: 'Bloodlust', icon: '♥', desc: 'ดูดชีวิต 2% ของดาเมจทุกสกิล', apply(m) { m.leech += 0.02; } },
    { id: 'culling_edge', name: 'Culling Edge', icon: '☠', desc: 'ทุกสกิลมี Culling Strike 15% (ฆ่าทันทีเมื่อเลือดต่ำกว่า 15%)', apply(m) { m.cullAdd = Math.max(m.cullAdd, 0.15); } },
    { id: 'overwhelm', name: 'Overwhelm', icon: '✊', desc: 'ทุกสกิลทำดาเมจ 20% more', apply(m) { m.moreAll *= 1.2; } },
    { id: 'bloodbath', name: 'Bloodbath', icon: '✚', desc: 'ฆ่าศัตรูแต่ละตัวฟื้นชีวิต 0.5% ของชีวิตสูงสุด', apply(m) { m.lifeOnKill += 0.005; } },
  ] });

// ---- Scion ----
defAsc({ id: 'paragon', cls: 'scion', name: 'Paragon', th: 'ผู้สมบูรณ์แบบ', color: '#f4f4f4', icon: '❖',
  desc: 'เลือกโหนดจาก Ascendancy ของทุกคลาส', pool: 'any',
  nodes: [
    { id: 'ascendant_path', name: 'Ascendant Path', icon: '❖', desc: 'ทุกสกิลทำดาเมจ 10% more · +10% ชีวิตสูงสุด · ทุกครั้งที่ได้แต้ม Ascendancy จะสุ่มโหนดจากคลาสอื่นมาให้เลือก', apply(m) { m.moreAll *= 1.1; m.lifeInc += 0.1; } },
  ] });
defAsc({ id: 'wayfarer', cls: 'scion', name: 'Wayfarer', th: 'ผู้พเนจร', color: '#a8c8ff', icon: '✈',
  desc: 'สายเจม สกิลเยอะ ช่วยเพิ่มช่อง Support',
  nodes: [
    { id: 'wanderlust', name: 'Wanderlust', icon: '✈', desc: 'ช่องสกิล +1 · +8% ความเร็วเคลื่อนที่', apply(m) { m.skillSlots += 1; m.moveInc += 0.08; } },
    { id: 'gem_prodigy', name: 'Gem Prodigy', icon: '◆', desc: 'เจมสกิลทุกอันเลเวล +2 ทันที', instant: 'gems2', apply() {} },
    { id: 'linkmaster', name: 'Gemsmith', icon: '⬡', desc: "ได้ Jeweller's Orb 3 ×2 · เลเวล Skill Gem ทุกอัน +1", instant: 'jeweller3x2', apply(m) { m.gemLevel += 1; } },
    { id: 'fortune', name: 'Fortune', icon: '✪', desc: 'ตัวเลือกตอนเลเวลอัพ +1 ใบ · ได้ Chaos Orb 3 ลูก', instant: 'chaos3', apply(m) { m.extraChoices += 1; } },
  ] });
