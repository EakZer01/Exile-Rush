'use strict';
// These are survivor adaptations. Life costs use the same half-life floor as Buildcraft.
const ARCHETYPE_SKILLS = [
  ['exsanguinate', 'Exsanguinate', 'เส้นโลหิต', ['Spell', 'Physical', 'Chaining', 'DoT', 'Duration'], 'bloodchain', 32, 1.2, { chain: 2, duration: 2, range: 400, area: 40 }, 'ใช้ชีวิต 2% ร่ายเส้นโลหิตกระโดด 2 ครั้ง พร้อม Physical DoT สูงสุด 3 ชั้นต่อสกิล/เป้า ไม่ใช่ Bleed'],
  ['reap', 'Reap', 'เคียวโลหิต', ['Spell', 'Physical', 'AoE', 'DoT', 'Duration'], 'reap', 48, 1.5, { duration: 2.5, range: 300, area: 115 }, 'เคียวกวาดพร้อม Physical DoT · เป้ารอดได้ Blood Charge สูงสุด 5 เพิ่มดาเมจและต้นทุนชีวิต · ฆ่าด้วยเคียว/DoT ลด Charge'],
  ['forbidden_rite', 'Forbidden Rite', 'พิธีต้องห้าม', ['Spell', 'Chaos', 'Projectile', 'AoE'], 'rite', 20, 1.5, { types: { chaos: 1 }, proj: 3, speed: 400, life: 1.2, explode: true, area: 60 }, 'กระสุนเคออสระเบิด · เพิ่มดาเมจฐานจาก 6% ชีวิตสูงสุด + 3% ES สูงสุด · ร่ายเสียชีวิต 8% ลดด้วย Chaos Resistance (CI ยกเว้นต้นทุน)'],
  ['eye_of_winter', 'Eye of Winter', 'ดวงตาเหมันต์', ['Spell', 'Cold', 'Projectile', 'Duration'], 'eye', 30, 2.0, { types: { cold: 1 }, proj: 1, speed: 170, life: 1.5, size: 6, range: 500, projectileEmitter: true }, 'ดวงตาเคลื่อนที่ปล่อยสะเก็ดเป็นเกลียว · สิ้นสุดปล่อยอีก 8 ลูก · จำนวนกระสุนเพิ่มเฉพาะชุดสุดท้าย ความเร็วเปลี่ยนจุดจบของดวงตา'],
  ['tempest_bell', 'Tempest Bell', 'ระฆังพายุ', ['Attack', 'Melee', 'AoE', 'Duration'], 'bell', 42, 0.6, { range: 220, area: 120, duration: 6 }, 'ต้องถือคทายาว · Attack ของคุณครบ 4 Hit (นับได้ทุก 0.15 วิ) วางระฆัง · Attack ที่ Hit ใกล้ระฆังทำให้ปล่อยคลื่นสูงสุด 10 ครั้ง รับธาตุจาก Hit ที่กระตุ้น'],
  ['herald_of_plague', 'Herald of Plague', 'ผู้ประกาศโรคระบาด', ['Spell', 'Herald', 'Chaos', 'AoE', 'Duration'], 'plague', 1, 1, { types: { chaos: 1 }, area: 150, duration: 4 }, 'เมื่อศัตรูติด Poison ตาย แพร่ Poison ที่แรงที่สุดไปใกล้เคียงสูงสุด 6 ตัวด้วยพลัง 75% · จำกัดการแพร่ต่อ 3 ทอด ไม่สร้าง Poison เริ่มต้นเอง'],
];
for (const [id, name, th, tags, archetype, dmg, cd, fields, desc] of ARCHETYPE_SKILLS) {
  defSkill({ id, name, th, tags, gem: archetype === 'bell' ? 'g' : 'b', icon: '✧',
    behavior: archetype === 'rite' ? 'projectile' : archetype === 'plague' ? 'herald' : 'archetype',
    weapons: archetype === 'bell' ? ['staff'] : archetype === 'plague' ? undefined : CASTER_WEAPONS,
    color: ['bloodchain', 'reap'].includes(archetype) ? '#da6c79' : archetype === 'eye' ? '#8ad7fa' : '#ae8ee5', core: '#fff1eb', desc,
    base: { dmg, cd, types: { physical: 1 }, range: 450, area: 90, duration: 4, archetype, ...fields, ...(archetype === 'plague' ? { herald: 'plague' } : {}) },
    scale(s, l) { s.area *= 1 + 0.008 * (l - 1); }, levelNote: 'ทุกเลเวล: ดาเมจและพื้นที่เพิ่ม' });
  EVOLUTIONS[id] = { name: 'Vaal ' + name, req: archetype === 'plague' ? ['herald_amplification', 'inc_aoe', 'inc_duration'] : archetype === 'bloodchain' ? ['chain', 'inc_duration', 'controlled_destruction'] : archetype === 'eye' || archetype === 'rite' ? ['gmp', 'inc_crit', 'added_cold'] : ['inc_aoe', 'inc_crit', 'inc_duration'],
    desc: archetype === 'plague' ? 'พลัง Poison ที่แพร่ 20% more · พื้นที่ +20%' : 'ร่าง survivor: ดาเมจ 20% more และพื้นที่ +20%', apply(s) { s.more *= 1.2; s.area *= 1.2; if (s.archetype === 'plague') s.plagueAmplify = 1.2; } };
}
// A granted skill is inspectable in Codex but never rolls in level-up cards or class starters.
defSkill({ id: 'icestorm', name: 'Icestorm', th: 'พายุน้ำแข็งจากอาวุธ', itemOnly: true, gem: 'b', icon: '❄',
  tags: ['Spell', 'Cold', 'AoE', 'Duration'], behavior: 'archetype', weapons: ['staff'],
  desc: 'ได้จาก The Whispering Ice เท่านั้น ไม่ใช้ช่องสกิล/Support · ทุก 3 วิสร้างพายุ 3 วิที่จุดเป้า อาวุธอยู่จึงทำงาน รับโบนัส Spell/Cold/AoE ของคุณ',
  color: '#95d7ee', core: '#f2ffff', base: { dmg: 18, types: { cold: 1 }, cd: 3, range: 500, area: 115, duration: 3, archetype: 'icestorm' } });
EVOLUTIONS.icestorm = { name: 'Icestorm', req: [], desc: 'สกิลจากอาวุธ ไม่วิวัฒน์', apply() {} };

const ARCHETYPE_SUPPORTS = [
  { id: 'coursing_current', name: 'Coursing Current', th: 'กระแสเย็นช็อก', gem: 'b', req: ['Cold', 'Lightning'],
    desc: 'Hit ที่ทำให้ Chill ทำ Shock ตามความแรง Chill และ Hit ที่ทำ Shock ทำ Chill ตามความแรง Shock · ไม่ทำงานเมื่อห้าม Ailment', apply(s) { s.coursingCurrent = true; } },
  { id: 'crystalfall', name: 'Crystalfall', th: 'ผลึกถล่ม', gem: 'r', req: ['Slam'],
    desc: 'Slam ของคุณ Hit กระตุ้นผลึกตกที่เป้าหลัง 0.5 วิ ดาเมจ 90% ของสกิล รัศมี 100 · คูลดาวน์ 1.5 วิ · ผลึกไม่กระตุ้นต่อ', apply(s) { s.crystalfall = true; } },
  { id: 'communion', name: 'Communion', th: 'ร่วมพลังบริวาร', gem: 'b', req: ['Spell'], excl: ['Minion', 'Aura', 'Herald'],
    desc: 'Hit ของเวทที่คุณใช้: ดาเมจเพิ่ม 6% more ต่อมินเนียนที่ยังเหลืออายุเกิน 2 วิ สูงสุด 8 ตัว · ไม่นับแมงมุม/Phantasm · ฉบับ survivor ใช้อายุแทนมินเนียนถาวร', apply(s) { s.communion = true; } },
];
for (const d of ARCHETYPE_SUPPORTS) defSupport(d);
Object.assign(UNIQUES, {
  whispering_ice: { name: 'The Whispering Ice', th: 'เสียงกระซิบเหมันต์', slot: 'weapon', base: 'gnarled_staff', src: 'boss_frozen', flavor: 'หิมะจดจำตำแหน่งที่เจ้าชี้',
    lines: ['มอบ Icestorm ไม่ใช้ช่องสกิล: ทุก 3 วิสร้างพายุที่จุดเป้า 3 วิ', 'พายุอิงเลเวลผู้เล่น (สูงสุดเจม Lv 20) รับโบนัส Spell/Cold/AoE ไม่มีช่อง Support', 'ถอดอาวุธแล้วพายุหาย · ดาเมจสกิลอื่นของคุณ 15% less', 'ฉบับ survivor ไม่มีระบบ Intelligence Stacking'],
    apply(m) { m.ks.whisperingIce = true; }, skill(s, id) { if (id !== 'icestorm') s.more *= 0.85; } },
  voltaxic_rift: { name: 'Voltaxic Rift', th: 'รอยแยกอัสนีเคออส', slot: 'weapon', base: 'long_bow', src: 'breach', flavor: 'สายฟ้าดับลง ทว่ารอยแผลยังเรืองแสง', local: { lphys: 20 },
    lines: ['แปลง Lightning Damage ของสกิลทั้งหมดเป็น Chaos 100%', 'Chaos Hit ของคุณทำ Shock ได้ · โอกาส Shock +20%', 'สกิลสายฟ้านับแท็ก Chaos เพื่อใช้ Support ได้ · ดาเมจรวม 15% less', 'ฉบับ survivor ไม่กลับค่าต้านทานศัตรู'],
    apply(m) { m.ks.voltaxic = true; }, skill(s) { s.convertLightning = 1; s.chaosCanShock = true; s.shock += 0.2; s.more *= 0.85; } },
  doryanis_prototype: { name: "Doryani's Prototype", th: 'ต้นแบบโดริอานี', slot: 'body', base: 'chain_tunic', src: 'boss_void', flavor: 'ความอ่อนแอของเจ้าจะเป็นของพวกมันด้วย',
    lines: ['ทำดาเมจได้เฉพาะ Lightning · ศัตรูในระยะ 220 ใช้ Lightning Resistance เท่าของคุณ (ต่ำสุด -50%)', 'รับ Lightning Hit แบบประชิด/กระสุน: ใช้ Armour แทน Lightning Resistance', 'Lightning แบบพื้นที่ยังใช้ค่าต้านทานปกติ · Lightning Resistance -30% · Armour +120', 'ฉบับ survivor: เข้าใกล้เพื่อใช้ค่าต้านทานติดลบเป็นอาวุธ'],
    apply(m) { m.ks.prototype = true; m.resLight -= 0.3; m.armour += 120; } },
});
