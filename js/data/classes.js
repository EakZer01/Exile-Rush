'use strict';
// ============================================================
//  CLASSES — starting skill gem + starting passives
// ============================================================
const CLASSES = [
  { id: 'witch', name: 'Witch', th: 'แม่มด', color: '#6a8cff', start: 'fireball', life: 95,
    desc: 'ผู้ใช้เวทธาตุ เริ่มด้วย Fireball', bonus: '+20% ดาเมจ Spell', apply(m) { m.incSpell += 0.2; } },
  { id: 'ranger', name: 'Ranger', th: 'นักธนู', color: '#5fd16a', start: 'split_arrow', life: 100,
    desc: 'นักธนูว่องไว เริ่มด้วย Split Arrow', bonus: '+12% ความเร็วเคลื่อนที่', apply(m) { m.moveInc += 0.12; } },
  { id: 'marauder', name: 'Marauder', th: 'นักรบเถื่อน', color: '#e05a4a', start: 'cyclone', life: 140,
    desc: 'นักรบบึกบึน เริ่มด้วย Cyclone', bonus: '+0.6% ฟื้นชีวิต/วิ', apply(m) { m.regen += 0.006; } },
  { id: 'templar', name: 'Templar', th: 'นักบวช', color: '#e8c35a', start: 'arc', life: 115,
    desc: 'นักบวชสายฟ้า เริ่มด้วย Arc', bonus: '+15% ดาเมจธาตุ, รับดาเมจ 5% less', apply(m) { m.incEle += 0.15; m.dmgTaken *= 0.95; } },
  { id: 'shadow', name: 'Shadow', th: 'นักฆ่าเงา', color: '#4fc6c0', start: 'ethereal_knives', life: 95,
    desc: 'นักฆ่าคริติคอล เริ่มด้วย Ethereal Knives', bonus: '+2% โอกาสคริ, +40% ตัวคูณคริ', apply(m) { m.critAdd += 0.02; m.critMulti += 0.4; } },
  { id: 'duelist', name: 'Duelist', th: 'นักดาบ', color: '#d88a3a', start: 'blade_vortex', life: 115,
    desc: 'นักดาบกลางเวที เริ่มด้วย Blade Vortex', bonus: '+15% ดาเมจกายภาพ, +5% ความเร็ว', apply(m) { m.incPhys += 0.15; m.speedInc += 0.05; } },
  { id: 'scion', name: 'Scion', th: 'ทายาท', color: '#e0e0e0', start: null, life: 110,
    desc: "เริ่มด้วยสกิลสุ่ม + ได้ Jeweller's Orb 3 ×1", bonus: '+8% ทุกอย่างนิดหน่อย', apply(m) {
      m.incSpell += 0.08; m.incAttack += 0.08; m.moveInc += 0.04; m.lifeInc += 0.08; } },
];
