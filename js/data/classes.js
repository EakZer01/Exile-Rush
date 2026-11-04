'use strict';
// ============================================================
//  CLASSES — starting skill gem + starting passives
// ============================================================
const CLASSES = [
  { id: 'witch', name: 'Witch', th: 'แม่มด', color: '#6a8cff', start: 'fireball', life: 95,
    desc: 'ผู้ใช้เวทธาตุ', bonus: '+20% ดาเมจ Spell', apply(m) { m.incSpell += 0.2; } },
  { id: 'ranger', name: 'Ranger', th: 'นักธนู', color: '#5fd16a', start: 'split_arrow', life: 100,
    desc: 'นักธนูว่องไว', bonus: '+12% ความเร็วเคลื่อนที่', apply(m) { m.moveInc += 0.12; } },
  { id: 'marauder', name: 'Marauder', th: 'นักรบเถื่อน', color: '#e05a4a', start: 'cyclone', life: 140,
    desc: 'นักรบบึกบึน', bonus: '+0.6% ฟื้นชีวิต/วิ', apply(m) { m.regen += 0.006; } },
  { id: 'templar', name: 'Templar', th: 'นักบวช', color: '#e8c35a', start: 'arc', life: 115,
    desc: 'นักบวชสายฟ้า', bonus: '+15% ดาเมจธาตุ, รับดาเมจ 5% less', apply(m) { m.incEle += 0.15; m.dmgTaken *= 0.95; } },
  { id: 'shadow', name: 'Shadow', th: 'นักฆ่าเงา', color: '#4fc6c0', start: 'ethereal_knives', life: 95,
    desc: 'นักฆ่าคริติคอล', bonus: '+2% โอกาสคริ, +40% ตัวคูณคริ', apply(m) { m.critAdd += 0.02; m.critMulti += 0.4; } },
  { id: 'duelist', name: 'Duelist', th: 'นักดาบ', color: '#d88a3a', start: 'blade_vortex', life: 115,
    desc: 'นักดาบกลางเวที', bonus: '+15% ดาเมจกายภาพ, +5% ความเร็ว', apply(m) { m.incPhys += 0.15; m.speedInc += 0.05; } },
  { id: 'scion', name: 'Scion', th: 'ทายาท', color: '#e0e0e0', start: null, life: 110,
    desc: "เริ่มด้วยสกิลสุ่ม + ได้ Jeweller's Orb 3 ×1", bonus: '+8% ทุกอย่างนิดหน่อย', apply(m) {
      m.incSpell += 0.08; m.incAttack += 0.08; m.moveInc += 0.04; m.lifeInc += 0.08; } },
];

// ---------------- Starting skill ----------------
// Each class picks its first gem from three themed options (the first is its classic start);
// the weapon follows the gem. Scion stays random. Daily / Weekly always use the classic start.
const STARTER_SKILLS = {
  witch: ['fireball', 'freezing_pulse', 'raise_zombie'],
  ranger: ['split_arrow', 'toxic_rain', 'galvanic_arrow'],
  marauder: ['cyclone', 'earthquake', 'boneshatter'],
  templar: ['arc', 'smite', 'storm_brand'],
  shadow: ['ethereal_knives', 'viper_strike', 'blade_vortex'],
  duelist: ['blade_vortex', 'lacerate', 'frost_blades'],
};
// a gem mastered to this level at the Altar can also start any class that shares its colour
const STARTER_MASTERY_LV = 3;
const CLASS_GEM_COLORS = { witch: 'b', ranger: 'g', marauder: 'r', templar: 'rb', shadow: 'gb', duelist: 'rg' };
// gems that do nothing on their own (need corpses, Shock, a shield, an Attack...) never start a run
const NO_SOLO_START = ['tempest_bell', 'herald_of_plague', 'magnetic_salvo', 'shield_crush', 'shield_throw', 'holy_relic',
  'lightning_conduit', 'detonate_dead', 'volatile_dead', 'cremation', 'desecrate', 'blade_blast'];
