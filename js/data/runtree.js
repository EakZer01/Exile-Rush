'use strict';
// ============================================================
//  RUN PATHS + MASTERY (in-run passive tree)
//  Every passive card belongs to a path. Put enough ranks into a path
//  and the next MILESTONE (every 10 levels) offers that path's Mastery:
//  two cards, pick one — each changes how the build plays.
//  Mastery options use apply(m) for player mods, take(P) for one-off effects.
// ============================================================
const RUN_PATHS = {
  proj: { name: 'Projectile', th: 'สายกระสุน', icon: '➶', color: '#e8d6a0', need: 6, passives: ['proj', 'ricochet', 'piercing'],
    mastery: [
      { id: 'boomerang', name: 'Boomerang Mastery', desc: 'Projectile ทุกสกิลบินย้อนกลับมาหาคุณเมื่อสุดระยะ และโดนศัตรูซ้ำได้อีกรอบ', apply(m) { m.projReturn = true; } },
      { id: 'close_quarters', name: 'Close Quarters', desc: 'Projectile แรงขึ้นสูงสุด 40% more ในระยะใกล้ แต่อ่อนลงสูงสุด 25% less เมื่อบินไกล', apply(m) { m.ks.closeRange = true; } },
    ] },
  crit: { name: 'Critical', th: 'สายคริติคอล', icon: '✪', color: '#ffd84a', need: 6, passives: ['crit', 'speed'],
    mastery: [
      { id: 'assassin', name: "Assassin's Edge", desc: '+60% ตัวคูณคริ · Hit ที่ไม่คริทำดาเมจ 15% less', apply(m) { m.critMulti += 0.6; m.ks.nonCritLess = true; } },
      { id: 'lucky', name: 'Lucky Strikes', desc: 'ทอยโอกาสคริ 2 ครั้ง เลือกผลที่ดีกว่า (Lucky)', apply(m) { m.ks.luckyCrit = true; } },
    ] },
  ailment: { name: 'Ailment', th: 'สายอาการผิดปกติ', icon: '☣', color: '#8fdc4a', need: 6, passives: ['affliction', 'chaos', 'inferno', 'winter', 'thunder', 'malediction'],
    mastery: [
      { id: 'prolonged', name: 'Prolonged Suffering', desc: 'Ailment (Ignite / Poison / Shock / Chill) นานขึ้น 50% · ดาเมจ Ailment 10% more', apply(m) { m.ailDurInc += 0.5; m.ailMore *= 1.1; } },
      { id: 'swift', name: 'Swift Affliction', desc: 'ดาเมจ Ignite / Poison 50% more · Ailment สั้นลง 35%', apply(m) { m.ailMore *= 1.5; m.ailDurMore *= 0.65; } },
    ] },
  defence: { name: 'Defence', th: 'สายป้องกัน', icon: '⛨', color: '#c8b8a0', need: 8,
    passives: ['life', 'regen', 'armour', 'vampirism', 'flask', 'prismatic', 'purity_flesh', 'fortress', 'ironwood', 'phase', 'barrier', 'shieldwall'],
    mastery: [
      { id: 'bulwark', name: 'Bulwark', desc: 'รับดาเมจ 12% less · ความเร็วเคลื่อนที่ 6% less', apply(m) { m.dmgTaken *= 0.88; m.moveMore *= 0.94; } },
      { id: 'undying', name: 'Undying Will', desc: 'ฟื้นคืนชีพได้ 1 ครั้งในรอบนี้ (Second Wind) · +10% ชีวิตสูงสุด', apply(m) { m.lifeInc += 0.1; }, take(P) { P.revives++; } },
    ] },
  caster: { name: 'Caster', th: 'สายเวท', icon: '✧', color: '#6a8cff', need: 6, passives: ['spell', 'ele', 'area'],
    mastery: [
      { id: 'ele_focus', name: 'Elemental Focus', desc: 'ดาเมจธาตุ 30% more · ทำ Ailment ไม่ได้เลย', apply(m) { m.moreEle *= 1.3; m.noAilment = true; } },
      { id: 'arcane_surge', name: 'Arcane Surge', desc: 'สกิล Spell ร่ายเร็วขึ้น 18% · +10% พื้นที่', apply(m) { m.spellSpeed += 0.18; m.areaInc += 0.1; } },
    ] },
  warfare: { name: 'Warfare', th: 'สายนักรบ', icon: '⚔', color: '#e05a4a', need: 6, passives: ['attack', 'phys', 'blade_dance'],
    mastery: [
      { id: 'brutal', name: 'Brutal Force', desc: 'ดาเมจกายภาพ 25% more · สกิล Attack ช้าลง 8%', apply(m) { m.physMore *= 1.25; m.attackSpeed -= 0.08; } },
      { id: 'fervour', name: 'Fervour', desc: 'สกิล Attack เร็วขึ้น 12% · +6% ความเร็วเคลื่อนที่ · ฆ่าศัตรูฟื้นชีวิต 0.4%', apply(m) { m.attackSpeed += 0.12; m.moveInc += 0.06; m.lifeOnKill += 0.004; } },
    ] },
  minion: { name: 'Minion', th: 'สายมินเนียน', icon: '☠', color: '#b090e0', need: 6, passives: ['minion', 'duration'],
    mastery: [
      { id: 'legion', name: 'Legion', desc: 'มินเนียนสูงสุด +1 · อัญเชิญเพิ่มครั้งละ +1', apply(m) { m.minionCount += 1; m.summonAdd += 1; } },
      { id: 'commander', name: 'Commander', desc: 'มินเนียนทำดาเมจ 35% more · เร็วขึ้น 15%', apply(m) { m.moreMinion *= 1.35; m.minionSpeed += 0.15; } },
    ] },
};
const PASSIVE_PATH = {};
for (const pid in RUN_PATHS) for (const id of RUN_PATHS[pid].passives) PASSIVE_PATH[id] = pid;
const MASTERY_OPT = {};
for (const pid in RUN_PATHS) for (const o of RUN_PATHS[pid].mastery) { o.path = pid; MASTERY_OPT[o.id] = o; }
