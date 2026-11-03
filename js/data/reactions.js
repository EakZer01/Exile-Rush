'use strict';
// PoE-inspired survivor adaptations. Gas Grenade uses bows/wands until crossbows exist.
const REACTION_SKILLS = [
  { id: 'frost_wall', name: 'Frost Wall', th: 'กำแพงผลึกน้ำแข็ง', gem: 'b', icon: '❄',
    tags: ['Spell', 'Cold', 'AoE', 'Duration'], behavior: 'reaction', weapons: CASTER_WEAPONS,
    desc: 'สร้างผลึก 5 ก้อนขวางศัตรูทั่วไป 6 วิ · โจมตีผลึกด้วย Hit ของคุณเพื่อระเบิดน้ำแข็ง · บอสเดินบดผลึกได้ · ผลึกไม่ขวางคุณ',
    color: '#85dfff', core: '#eaffff', base: { dmg: 35, types: { cold: 1 }, cd: 3.8, area: 82, range: 340, duration: 6, crystals: 5, reaction: 'wall' },
    scale(s, l) { s.area *= 1 + (l - 1) * 0.01; }, levelNote: 'ทุกเลเวล: ระเบิดกว้างขึ้น' },
  { id: 'gas_grenade', name: 'Gas Grenade', th: 'ระเบิดแก๊ส', gem: 'g', icon: '☣',
    tags: ['Attack', 'Projectile', 'Chaos', 'Fire', 'AoE', 'Duration'], behavior: 'reaction', weapons: ['bow', 'wand'],
    desc: 'ขว้างชนวนไปหาเป้า ระเบิดหลัง 0.8 วิเป็นหมอกเคออส 5 วิ · Hit ไฟ/พื้นไฟ/ศัตรูติด Ignite จุดแก๊สเป็นระเบิดไฟแล้วกินหมอก · สูงสุด 6 หมอก ไม่บวก DoT จากหมอกเดียวกันที่ทับกัน',
    color: '#9ec85c', core: '#efffc7', base: { dmg: 32, types: { chaos: 1 }, cd: 2.5, area: 105, range: 440, duration: 5, proj: 1, projectileEmitter: true, reaction: 'gas' },
    scale(s, l) { s.area *= 1 + (l - 1) * 0.008; }, levelNote: 'ทุกเลเวล: หมอกกว้างขึ้น' },
  { id: 'magnetic_salvo', name: 'Magnetic Salvo', th: 'ห่าศรแม่เหล็ก', gem: 'g', icon: 'ϟ',
    tags: ['Attack', 'Bow', 'Lightning', 'AoE'], behavior: 'reaction', weapons: ['bow'],
    desc: 'กินลูกธนูค้างจาก Storm Rain สูงสุด 4 จุดในระยะ 550 แล้วระเบิดสายฟ้าหลัง 0.35 วิ · ถ้าไม่มีลูกธนูค้างจะไม่ยิง · เสียตาข่ายเดิมเพื่อแลกดาเมจชุดใหญ่',
    color: '#dbb6ff', core: '#fff2ff', base: { dmg: 65, types: { lightning: 1 }, cd: 2.6, area: 115, range: 550, count: 4, shock: 0.35, reaction: 'salvo' },
    scale(s, l) { s.area *= 1 + (l - 1) * 0.008; }, levelNote: 'ทุกเลเวล: ระเบิดกว้างขึ้น' },
];
for (const d of REACTION_SKILLS) defSkill(d);
EVOLUTIONS.frost_wall = { name: 'Vaal Frost Wall', req: ['inc_aoe', 'inc_duration', 'hypothermia'], desc: 'ผลึก +2 · ระเบิดกว้างขึ้น 20%', apply(s) { s.crystals += 2; s.area *= 1.2; } };
EVOLUTIONS.gas_grenade = { name: 'Vaal Gas Grenade', req: ['inc_aoe', 'inc_duration', 'added_fire'], desc: 'หมอกกว้างขึ้น 20% · ดาเมจ 20% more', apply(s) { s.area *= 1.2; s.more *= 1.2; } };
EVOLUTIONS.magnetic_salvo = { name: 'Vaal Magnetic Salvo', req: ['inc_aoe', 'light_pen', 'elemental_attacks'], desc: 'กินจุดเพิ่มได้ 2 จุด · ดาเมจ 15% more', apply(s) { s.count += 2; s.more *= 1.15; } };

Object.assign(UNIQUES, {
  mjolner: { name: 'Mjölner', th: 'ค้อนเรียกอัสนี', slot: 'weapon', base: 'driftwood_club', src: 'boss_void',
    flavor: 'สายฟ้าตอบรับทุกจังหวะค้อน', local: { lphys: 25 },
    lines: ['Attack ที่คุณใช้เอง Hit กระตุ้น Spell สายฟ้าที่เลือกเชื่อม · คูลดาวน์ร่วม 0.8 วิ', 'เวทที่เชื่อมหยุดร่ายเอง · ดาเมจเวทที่กระตุ้น 30% less', 'ดาเมจ Attack ของคุณ 20% less · อาวุธ +25% ดาเมจกายภาพ', 'เลือกเวทที่หน้าสถิติ / I → ช่อง Support · ฉบับ survivor'],
    apply() {}, skill(s) { if (s.tags.has('Attack') && !s.tags.has('Minion') && !s.delivery && !s.totem && !s.triggerMode) { s.triggerMode = 'mjolner'; s.more *= 0.8; } } },
  arakaalis_fang: { name: "Arakaali's Fang", th: 'เขี้ยวราชินีแมงมุม', slot: 'weapon', base: 'glass_shank', src: 'boss_marsh',
    flavor: 'อาหารของลูก ๆ คือชัยชนะของเจ้า', local: { lphys: 20 },
    lines: ['Attack ของคุณฆ่าศัตรู: กินศพใกล้จุดฆ่า เรียกแมงมุมพิษ 2 ตัว นาน 8 วิ สูงสุด 8 ตัว', 'Hit บอสด้วย Attack ของคุณครบ 6 ครั้ง: เรียก 1 ตัวโดยไม่ใช้ศพ (ร่วมคูลดาวน์ 1 วิ)', 'แมงมุมติดตามตัวและตีพิษ · รับโบนัส Minion Damage/Speed ของคุณ', 'ดาเมจ Attack ของคุณ 20% less · ถอดมีดแล้วแมงมุมหาย · ฉบับ survivor'],
    apply(m) { m.ks.spiderFang = true; }, skill(s) { if (s.tags.has('Attack') && !s.tags.has('Minion')) s.more *= 0.8; } },
  sire_of_shards: { name: 'Sire of Shards', th: 'บิดาแห่งเศษเสี้ยว', slot: 'weapon', base: 'gnarled_staff', src: 'boss_frozen',
    flavor: 'ทุกทิศล้วนเป็นทิศข้างหน้า',
    lines: ['เวทกระสุนที่ยิงจากตัวคุณ: ยิงเป็นวงรอบตัวแทนเล็งเป้า · กระสุน +4', 'ดาเมจเวทที่เปลี่ยนรูปแบบ 25% less', 'ไม่เปลี่ยนทุ่น กับดัก ป้อม มินเนียน หรือกระสุนย่อย · ฉบับ survivor'],
    apply() {}, skill(s) { if (s.behavior === 'projectile' && s.tags.has('Spell') && !s.tags.has('Minion') && !s.delivery && !s.totem) { s.pattern = 'ring'; s.proj += 4; s.more *= 0.75; s.shardCircle = true; } } },
});
