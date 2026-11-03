'use strict';
// Bow expansion: survivor adaptations; no manual channel button is required.
const BOW_SKILLS = [
  { id: 'burning_arrow', name: 'Burning Arrow', th: 'ธนูเพลิง', gem: 'g', icon: '➶', weapons: ['bow'],
    tags: ['Attack', 'Projectile', 'Bow', 'Fire'], behavior: 'projectile',
    desc: 'ยิงธนูไฟแรงเป้าเดียว มีโอกาส Ignite สูง เหมาะกับ Herald of Ash',
    base: { dmg: 29, types: { physical: 0.2, fire: 0.8 }, cd: 1.05, proj: 1, speed: 720, life: 0.85, size: 5, arrow: true, ignite: 0.65 },
    scale(s, l) { s.ignite += 0.01 * l; }, levelNote: 'ทุกเลเวล: โอกาส Ignite สูงขึ้น', color: '#ff9c4c', core: '#fff0c5' },
  { id: 'explosive_arrow', name: 'Explosive Arrow', th: 'ธนูชนวนระเบิด', gem: 'g', icon: '✹', weapons: ['bow'],
    tags: ['Attack', 'Projectile', 'Bow', 'Fire', 'AoE', 'Duration'], behavior: 'projectile',
    desc: 'Hit แรกทำดาเมจ 15% ที่เหลือ 85% สะสมเป็นชนวนบนเป้า ระเบิดหลัง 1.2 วิจากดอกแรกหรือครบ 12 ดอก ไม่ต่อเวลาจากการยิงซ้ำ',
    base: { dmg: 23, types: { fire: 1 }, cd: 0.62, proj: 1, speed: 670, life: 0.9, size: 5, arrow: true, area: 72, duration: 1.2, fuseArrow: true, ignite: 0.3 },
    scale(s, l) { s.area *= 1 + 0.015 * (l - 1); }, levelNote: 'ทุกเลเวล: ระเบิดกว้างขึ้น · เพิ่มความเร็วโจมตีเพื่อสะสมดอก', color: '#ffb34c', core: '#fff7d5' },
  { id: 'puncture', name: 'Puncture', th: 'ธนูเจาะเลือด', gem: 'g', icon: '➵', weapons: ['bow'],
    tags: ['Attack', 'Projectile', 'Bow', 'Physical', 'DoT'], behavior: 'projectile',
    desc: 'ธนูหนักยิงช้า ทะลุ 3 ตัว และทำให้ Bleed แน่นอนหากศัตรูไม่ป้องกัน Ailment',
    base: { dmg: 30, types: { physical: 1 }, cd: 1.35, proj: 1, speed: 820, life: 0.85, size: 5, arrow: true, pierce: 3, bleed: 1 },
    scale(s, l) { s.bleedMore *= 1 + 0.015 * (l - 1); }, levelNote: 'ทุกเลเวล: Bleed แรงขึ้น', color: '#e47171', core: '#ffe0dc' },
  { id: 'scourge_arrow', name: 'Scourge Arrow', th: 'ธนูฝักพิษ', gem: 'g', icon: '☣', weapons: ['bow'],
    tags: ['Attack', 'Projectile', 'Bow', 'Chaos', 'Physical', 'Duration'], behavior: 'projectile',
    desc: 'ยิงอัตโนมัติพร้อมวางฝักพิษ 3 ฝักตามแนวยิง แต่ละฝักโต 0.7 วิแล้วแตกยิงหนามหาเป้า ดาเมจหนาม 45% ของสกิล ไม่มีการกดชาร์จ',
    base: { dmg: 14, types: { physical: 0.4, chaos: 0.6 }, cd: 1.65, proj: 1, speed: 520, life: 1.0, size: 7, arrow: true, pierce: 1, poison: 0.55, duration: 0.7, scourge: true, pods: 3, thorns: 3 },
    scale(s, l) { s.pods += Math.floor(l / 7); }, levelNote: 'ทุก 7 เลเวล: ฝัก +1 · หนึ่งชุดฝักต่อการร่าย ไม่คูณตามจำนวนกระสุน', color: '#9cdb68', core: '#eaffc7' },
];
for (const d of BOW_SKILLS) defSkill(d);

const BOW_SUPPORTS = [
  { id: 'volley', name: 'Volley', th: 'ธนูแนวขนาน', gem: 'g', req: ['Projectile'], all: ['Bow'], conflicts: ['arrow_nova'],
    desc: '+2 ลูกธนู ยิงเป็นแนวขนานจากหลายตำแหน่ง · ดาเมจ 20% less (ใช้กับธนูแบบกระสุน)', apply(s) { s.proj += 2; s.volley = true; s.more *= 0.8; } },
  { id: 'arrow_nova', name: 'Arrow Nova', th: 'ธนูวงระเบิด', gem: 'g', req: ['Projectile'], all: ['Bow'], conflicts: ['volley'],
    desc: 'ยิงขึ้นฟ้าไปยังเป้า หลัง 0.4 วิลูกธนูกระจายรอบจุดตก · ลูกธนู +4 · ดาเมจ 30% less', apply(s) { s.arrowNova = true; s.proj += 4; s.more *= 0.7; } },
  { id: 'maim', name: 'Maim', th: 'บาดแผลหน่วง', gem: 'r', req: ['Attack'], excl: ['Aura'],
    desc: 'Hit ทำให้ Maim 2 วิ: เดินช้าลง 30% (บอส 15%) · ดาเมจกายภาพ 10% more', apply(s) { s.maim = true; s.morePhys *= 1.1; } },
  { id: 'deadly_draw', name: 'Deadly Draw', th: 'น้าวสายมรณะ', gem: 'g', req: ['Bow'],
    desc: 'Hit 25% more · Bleed 35% more · คูลดาวน์นานขึ้น 25% (Support ที่ออกแบบสำหรับเกมนี้)', apply(s) { s.hitMul *= 1.25; s.bleedMore *= 1.35; s.cd *= 1.25; } },
];
for (const d of BOW_SUPPORTS) defSupport(d);

const BOW_PASSIVES = [
  ['heavy_draw', 'Heavy Draw', 'น้าวธนูหนัก', '➶', 'ailment', 'สกิล Bow: กายภาพ 10% more · Bleed 10% more', m => m.skillHooks.push(s => { if (s.tags.has('Bow')) { s.morePhys *= 1.1; s.bleedMore *= 1.1; } })],
  ['king_of_the_hill', 'King of the Hill', 'ราชาแห่งเนิน', '♛', 'crit', 'สกิล Bow: โอกาสคริ +0.5% · คริผลักเพิ่ม 18 หน่วย (ไม่ผลักบอส)', m => m.skillHooks.push(s => { if (s.tags.has('Bow')) { s.crit += 0.005; s.critKnock = (s.critKnock || 0) + 18; } })],
  ['ballistic_mastery', 'Ballistic Mastery', 'ชำนาญวิถีธนู', '➵', 'proj', 'สกิล Bow: ความเร็วสกิล +4% · ความเร็วกระสุน +8%', m => m.skillHooks.push(s => { if (s.tags.has('Bow')) { s.speedInc += 0.04; s.projSpeedInc += 0.08; } })],
  ['watchtowers', 'Watchtowers', 'หอคอยเฝ้าระวัง', '♜', 'proj', 'ป้อมธนู: ความเร็ววางป้อม +12% · ระยะเล็ง +10%', m => m.skillHooks.push(s => { if (s.totem && s.tags.has('Bow')) { s.totemPlaceInc = (s.totemPlaceInc || 0) + 0.12; s.totemRangeInc = (s.totemRangeInc || 0) + 0.1; } })],
];
for (const [id, name, th, icon, path, desc, apply] of BOW_PASSIVES) {
  defPassive({ id, name, th, icon, desc, apply, max: 3 });
  RUN_PATHS[path].passives.push(id); PASSIVE_PATH[id] = path;
}
defKeystone({ id: 'lone_archer', name: 'Lone Archer', th: 'นักธนูเดียวดาย', icon: '➶', conflicts: ['siege_doctrine'],
  desc: 'ธนูที่ยิงเองทำดาเมจ 35% more · สกิลธนูที่ใส่ Ballista หรือ Mirage Archer หยุดทำงาน (เปลี่ยน Support เมื่อได้การ์ดใหม่เพื่อใช้สกิล)',
  apply(m) { m.ks.loneArcher = true; m.skillHooks.push(s => { if (s.tags.has('Bow')) { if (s.totem || s.mirage) { s.disabled = true; s.disableReason = 'Lone Archer: เปลี่ยน Ballista / Mirage Archer เป็น Support อื่นเพื่อยิงเอง'; } else s.more *= 1.35; } }); } });
defKeystone({ id: 'siege_doctrine', name: 'Siege Doctrine', th: 'หลักการล้อมเมือง', icon: '♜', conflicts: ['lone_archer'],
  desc: 'ป้อมธนูทำดาเมจ 40% more และอยู่นานขึ้น 50% · ธนูที่ยิงเองและ Mirage Archer ทำดาเมจ 30% less',
  apply(m) { m.skillHooks.push(s => { if (s.tags.has('Bow')) { if (s.totem) { s.more *= 1.4; s.totemDurationInc = (s.totemDurationInc || 0) + 0.5; } else s.more *= 0.7; } }); } });

const BOW_EVOLUTIONS = {
  burning_arrow: { req: ['combustion', 'burning_damage', 'elemental_attacks'], desc: 'ดาเมจ 25% more · Ignite +25%', apply(s) { s.more *= 1.25; s.ignite += 0.25; } },
  explosive_arrow: { req: ['ballista_totem', 'faster_attacks', 'combustion'], desc: 'ระเบิดกว้างขึ้น 25% · ดาเมจ 20% more', apply(s) { s.area *= 1.25; s.more *= 1.2; } },
  puncture: { req: ['deadly_draw', 'crimson_bleed', 'vicious_projectiles'], desc: 'ทะลุ +3 · Bleed 40% more', apply(s) { s.pierce += 3; s.bleedMore *= 1.4; } },
  scourge_arrow: { req: ['chance_to_poison', 'void_manipulation', 'pierce'], desc: 'ฝัก +2 · โอกาส Poison +25%', apply(s) { s.pods += 2; s.poison += 0.25; } },
};
for (const d of BOW_SKILLS) EVOLUTIONS[d.id] = { name: 'Vaal ' + d.name, ...BOW_EVOLUTIONS[d.id] };
