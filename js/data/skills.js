'use strict';
// ============================================================
//  SKILL GEMS  (active skills — fire automatically, survivor style)
//  gem colour: r = Strength, g = Dexterity, b = Intelligence
//  base.* fields are read by stats.js -> buildSkillStats()
// ============================================================
const MAX_GEM_LEVEL = 20;
const MAX_SKILLS = 6;
const START_SOCKETS = 2;   // support sockets a new skill has (a "3-link")
const MAX_SOCKETS = 5;     // a "6-link"

const SKILLS = {};
function defSkill(d) { d.tags = d.tags.concat(['Damage']); SKILLS[d.id] = d; }

defSkill({
  id: 'fireball', name: 'Fireball', th: 'ลูกไฟ', gem: 'b', icon: '✹',
  tags: ['Spell', 'Projectile', 'Fire', 'AoE'],
  desc: 'ยิงลูกไฟใส่ศัตรูที่ใกล้ที่สุด ระเบิดเป็นวงเมื่อกระทบ มีโอกาสทำให้ติดไฟ (Ignite)',
  behavior: 'projectile',
  base: { dmg: 17, types: { fire: 1 }, cd: 1.05, proj: 1, speed: 430, life: 1.3, size: 8, spread: 0.2, area: 44, explode: true, ignite: 0.25, aim: 'nearest' },
  scale(s, l) { s.proj += Math.floor(l / 5); s.area *= 1 + 0.02 * (l - 1); },
  levelNote: 'ทุก 5 เลเวล: +1 ลูก',
  color: '#ff8a3d', core: '#fff0b0',
});

defSkill({
  id: 'ice_nova', name: 'Ice Nova', th: 'โนวาน้ำแข็ง', gem: 'b', icon: '❄',
  tags: ['Spell', 'AoE', 'Cold', 'Nova'],
  desc: 'ปล่อยคลื่นน้ำแข็งรอบตัว ทำให้ศัตรูช้าลง (Chill) และอาจแช่แข็ง (Freeze)',
  behavior: 'nova',
  base: { dmg: 15, types: { cold: 1 }, cd: 2.0, area: 115 },
  scale(s, l) { s.area *= 1 + 0.025 * (l - 1); s.cd *= 1 - 0.015 * (l - 1); },
  levelNote: 'ทุกเลเวล: วงกว้างขึ้น, ร่ายเร็วขึ้น',
  color: '#7fd8ff', core: '#e8fbff',
});

defSkill({
  id: 'arc', name: 'Arc', th: 'สายฟ้าลูกโซ่', gem: 'b', icon: 'ϟ',
  tags: ['Spell', 'Lightning', 'Chaining'],
  desc: 'สายฟ้ากระโดดไปมาระหว่างศัตรูหลายตัว มีโอกาสทำให้ช็อก (Shock = รับดาเมจเพิ่ม)',
  behavior: 'chain',
  base: { dmg: 13, types: { lightning: 1 }, cd: 0.8, chain: 3, range: 360, chainRange: 210, shock: 0.25 },
  scale(s, l) { s.chain += Math.floor(l / 4); },
  levelNote: 'ทุก 4 เลเวล: +1 การกระโดด',
  color: '#a8c8ff', core: '#ffffff',
});

defSkill({
  id: 'spark', name: 'Spark', th: 'ประกายไฟฟ้า', gem: 'b', icon: '✦',
  tags: ['Spell', 'Projectile', 'Lightning', 'Duration'],
  desc: 'ปล่อยประกายไฟฟ้าหลายลูกที่วิ่งซิกแซกแบบสุ่ม เหมาะกับการเคลียร์ฝูง',
  behavior: 'projectile',
  base: { dmg: 8, types: { lightning: 1 }, cd: 0.95, proj: 3, speed: 290, life: 2.2, size: 6, spread: 0.35, shock: 0.12, wander: true, aim: 'nearest', duration: 2.2 },
  scale(s, l) { s.proj += Math.floor(l / 5); },
  levelNote: 'ทุก 5 เลเวล: +1 ลูก',
  color: '#9ad2ff', core: '#ffffff',
});

defSkill({
  id: 'split_arrow', name: 'Split Arrow', th: 'ลูกธนูแยก', gem: 'g', icon: '➶',
  tags: ['Attack', 'Projectile', 'Physical', 'Bow'],
  desc: 'ยิงลูกธนูกระจายเป็นรูปพัดใส่ศัตรูที่ใกล้ที่สุด',
  behavior: 'projectile',
  base: { dmg: 12, types: { physical: 1 }, cd: 0.85, proj: 3, speed: 680, life: 0.85, size: 5, spread: 0.2, crit: 0.07, aim: 'nearest', arrow: true },
  scale(s, l) { s.proj += Math.floor(l / 4); },
  levelNote: 'ทุก 4 เลเวล: +1 ลูก',
  color: '#e8d6a0', core: '#ffffff',
});

defSkill({
  id: 'caustic_arrow', name: 'Caustic Arrow', th: 'ธนูพิษ', gem: 'g', icon: '☣',
  tags: ['Attack', 'Projectile', 'Chaos', 'AoE', 'Duration', 'DoT', 'Bow'],
  desc: 'ยิงลูกธนูพิษ เมื่อกระทบจะทิ้งหมอกพิษไว้บนพื้น ทำดาเมจต่อเนื่อง (Chaos DoT)',
  behavior: 'projectile',
  base: { dmg: 9, types: { chaos: 1 }, cd: 1.3, proj: 1, speed: 520, life: 0.85, size: 6, spread: 0.3, area: 62, duration: 3.2, cloudDps: 0.9, poison: 0.3, aim: 'random', arrow: true, cloud: true },
  scale(s, l) { s.area *= 1 + 0.025 * (l - 1); s.cloudDps *= 1 + 0.04 * (l - 1); },
  levelNote: 'ทุกเลเวล: หมอกกว้างขึ้นและแรงขึ้น',
  color: '#8fdc4a', core: '#e6ffb0',
});

defSkill({
  id: 'ethereal_knives', name: 'Ethereal Knives', th: 'มีดวิญญาณ', gem: 'g', icon: '✧',
  tags: ['Spell', 'Projectile', 'Physical'],
  desc: 'ปล่อยมีดวิญญาณพุ่งออกรอบตัวเป็นวงกลม',
  behavior: 'projectile',
  base: { dmg: 10, types: { physical: 1 }, cd: 1.2, proj: 8, speed: 540, life: 0.7, size: 5, crit: 0.08, pattern: 'ring', arrow: true },
  scale(s, l) { s.proj += 2 * Math.floor(l / 5); },
  levelNote: 'ทุก 5 เลเวล: +2 มีด',
  color: '#c9b8ff', core: '#ffffff',
});

defSkill({
  id: 'blade_vortex', name: 'Blade Vortex', th: 'ใบมีดวน', gem: 'g', icon: '✺',
  tags: ['Spell', 'Physical', 'AoE', 'Duration', 'Orbit'],
  desc: 'สร้างใบมีดหมุนวนรอบตัว ยิ่งร่ายบ่อย ยิ่งมีใบมีดมาก (สะสมได้)',
  behavior: 'orbit',
  base: { dmg: 7, types: { physical: 1 }, cd: 0.85, duration: 4.5, maxCount: 3, area: 82, size: 12, hitCd: 0.33, crit: 0.06 },
  scale(s, l) { s.maxCount += Math.floor(l / 4); },
  levelNote: 'ทุก 4 เลเวล: +1 ใบมีดสูงสุด',
  color: '#d8e0f0', core: '#ffffff',
});

defSkill({
  id: 'firestorm', name: 'Firestorm', th: 'พายุอุกกาบาต', gem: 'b', icon: '☄',
  tags: ['Spell', 'AoE', 'Fire', 'Duration'],
  desc: 'เรียกลูกไฟตกจากฟ้าใส่บริเวณที่มีศัตรู',
  behavior: 'ground',
  base: { dmg: 19, types: { fire: 1 }, cd: 2.3, count: 4, area: 42, range: 340, duration: 1.0, ignite: 0.3 },
  scale(s, l) { s.count += Math.floor(l / 3); },
  levelNote: 'ทุก 3 เลเวล: +1 ลูกอุกกาบาต',
  color: '#ff6a2a', core: '#ffd27a',
});

defSkill({
  id: 'righteous_fire', name: 'Righteous Fire', th: 'เพลิงชอบธรรม', gem: 'r', icon: '♨',
  tags: ['Spell', 'AoE', 'Fire', 'Aura', 'DoT'],
  desc: 'ห่อหุ้มตัวด้วยเปลวไฟ เผาศัตรูรอบตัวตลอดเวลา (Burning DoT ไม่ใช่ Hit)',
  behavior: 'aura',
  base: { dmg: 22, types: { fire: 1 }, area: 100 },
  scale(s, l) { s.area *= 1 + 0.02 * (l - 1); },
  levelNote: 'ทุกเลเวล: วงไฟกว้างขึ้น',
  color: '#ff7b22', core: '#ffd080',
});

defSkill({
  id: 'raging_spirit', name: 'Summon Raging Spirit', th: 'วิญญาณคลั่ง', gem: 'r', icon: '☠',
  tags: ['Spell', 'Minion', 'Fire', 'Duration'],
  desc: 'อัญเชิญหัวกะโหลกเพลิงที่บินไล่ฟันศัตรูอย่างบ้าคลั่ง (Minion)',
  behavior: 'minion',
  base: { dmg: 10, types: { fire: 1, physical: 0 }, cd: 0.9, maxCount: 4, duration: 6, speed: 320, hitCd: 0.42, size: 9, ignite: 0.1 },
  scale(s, l) { s.maxCount += Math.floor(l / 3); },
  levelNote: 'ทุก 3 เลเวล: +1 วิญญาณสูงสุด',
  color: '#ff5a3a', core: '#ffe08a',
});

defSkill({
  id: 'cyclone', name: 'Cyclone', th: 'พายุหมุน', gem: 'r', icon: '⟳',
  tags: ['Attack', 'Melee', 'AoE', 'Physical'],
  desc: 'หมุนอาวุธรอบตัวต่อเนื่อง ฟันศัตรูรอบตัวพร้อมผลักออก',
  behavior: 'spin',
  base: { dmg: 15, types: { physical: 1 }, cd: 0.42, area: 92, crit: 0.05, knock: 40 },
  scale(s, l) { s.area *= 1 + 0.02 * (l - 1); },
  levelNote: 'ทุกเลเวล: วงฟันกว้างขึ้น',
  color: '#e0e0e0', core: '#ffffff',
});

defSkill({
  id: 'frostbolt', name: 'Frostbolt', th: 'ลูกศรน้ำแข็ง', gem: 'b', icon: '❅',
  tags: ['Spell', 'Projectile', 'Cold'],
  desc: 'ยิงลูกน้ำแข็งเคลื่อนช้าที่ทะลุศัตรูได้ ทำให้ Chill ทุกตัวที่โดน',
  behavior: 'projectile',
  base: { dmg: 15, types: { cold: 1 }, cd: 1.1, proj: 1, speed: 260, life: 2.0, size: 11, spread: 0.25, pierce: 4, aim: 'nearest' },
  scale(s, l) { s.proj += Math.floor(l / 6); s.pierce += Math.floor(l / 4); },
  levelNote: 'ทุก 4 เลเวล: +1 ทะลุ, ทุก 6 เลเวล: +1 ลูก',
  color: '#66c8ff', core: '#e0f6ff',
});

// ---------------- expansion: more archetypes ----------------
defSkill({
  id: 'ball_lightning', name: 'Ball Lightning', th: 'ลูกบอลสายฟ้า', gem: 'b', icon: '◍',
  tags: ['Spell', 'Projectile', 'Lightning', 'AoE'],
  desc: 'ลูกบอลสายฟ้าลอยช้าๆ ทะลุทุกอย่าง และช็อตศัตรูรอบตัวเป็นระยะระหว่างทาง',
  behavior: 'projectile',
  base: { dmg: 6, types: { lightning: 1 }, cd: 1.4, proj: 1, speed: 150, life: 2.6, size: 10, spread: 0.3, pierce: 99, area: 75, zap: true, zapCd: 0.25, zapN: 3, shock: 0.12, aim: 'nearest' },
  scale(s, l) { s.proj += Math.floor(l / 7); s.zapN += Math.floor(l / 6); },
  levelNote: 'ทุก 6 เลเวล: ช็อตเพิ่ม +1 ตัว · ทุก 7 เลเวล: +1 ลูก',
  color: '#b8a8ff', core: '#ffffff',
});
defSkill({
  id: 'freezing_pulse', name: 'Freezing Pulse', th: 'คลื่นเยือกแข็ง', gem: 'b', icon: '❆',
  tags: ['Spell', 'Projectile', 'Cold'],
  desc: 'ยิงคลื่นน้ำแข็งเร็วที่ทะลุทุกตัว ยิ่งบินไกลยิ่งเบาลง ระยะใกล้แรงมากและแช่แข็งง่าย',
  behavior: 'projectile',
  base: { dmg: 22, types: { cold: 1 }, cd: 0.75, proj: 1, speed: 560, life: 0.7, size: 9, spread: 0.25, pierce: 99, decay: true, aim: 'nearest' },
  scale(s, l) { s.proj += Math.floor(l / 6); },
  levelNote: 'ทุก 6 เลเวล: +1 ลูก',
  color: '#8ae0ff', core: '#ffffff',
});
defSkill({
  id: 'lightning_arrow', name: 'Lightning Arrow', th: 'ธนูสายฟ้า', gem: 'g', icon: '↯',
  tags: ['Attack', 'Projectile', 'Lightning', 'AoE', 'Bow'],
  desc: 'ลูกธนูที่โดนเป้าแล้วเรียกสายฟ้าฟาดศัตรูรอบๆ อีกหลายตัว',
  behavior: 'projectile',
  base: { dmg: 13, types: { lightning: 1 }, cd: 0.9, proj: 1, speed: 720, life: 0.8, size: 5, spread: 0.2, area: 140, strikes: 3, shock: 0.2, aim: 'nearest', arrow: true },
  scale(s, l) { s.strikes += Math.floor(l / 5); s.proj += Math.floor(l / 8); },
  levelNote: 'ทุก 5 เลเวล: +1 สายฟ้า · ทุก 8 เลเวล: +1 ลูก',
  color: '#c8e0ff', core: '#ffffff',
});
defSkill({
  id: 'tornado_shot', name: 'Tornado Shot', th: 'ธนูพายุ', gem: 'g', icon: '⤨',
  tags: ['Attack', 'Projectile', 'Physical', 'Bow'],
  desc: 'ลูกธนูที่แตกเป็นลูกธนูย่อยกระจายรอบทิศเมื่อโดนเป้าหรือสุดระยะ',
  behavior: 'projectile',
  base: { dmg: 13, types: { physical: 1 }, cd: 1.0, proj: 1, speed: 640, life: 0.75, size: 5, spread: 0.2, split: 3, crit: 0.07, aim: 'nearest', arrow: true },
  scale(s, l) { s.split += Math.floor(l / 4); },
  levelNote: 'ทุก 4 เลเวล: ลูกธนูย่อย +1',
  color: '#e8e0c8', core: '#ffffff',
});
defSkill({
  id: 'toxic_rain', name: 'Toxic Rain', th: 'ฝนพิษ', gem: 'g', icon: '⁂',
  tags: ['Attack', 'Chaos', 'AoE', 'DoT', 'Bow', 'Duration'],
  desc: 'ยิงธนูขึ้นฟ้าให้ตกลงเป็นฝน ทุกดอกทิ้งหมอกพิษไว้บนพื้น',
  behavior: 'ground',
  base: { dmg: 6, types: { chaos: 1 }, cd: 1.6, count: 5, area: 42, range: 320, duration: 0.6, cloud: true, cloudDps: 0.8, cloudDur: 3, poison: 0.3 },
  scale(s, l) { s.count += Math.floor(l / 4); s.cloudDps *= 1 + 0.03 * (l - 1); },
  levelNote: 'ทุก 4 เลเวล: +1 ดอก · ทุกเลเวล: หมอกแรงขึ้น',
  color: '#8fdc4a', core: '#e6ffb0',
});
defSkill({
  id: 'contagion', name: 'Contagion', th: 'โรคระบาด', gem: 'b', icon: '☣',
  tags: ['Spell', 'Chaos', 'AoE', 'DoT', 'Duration', 'Nova'],
  desc: 'คลื่นเคออสวางพิษทุกตัวที่โดน ศัตรูที่ตายขณะติดเชื้อจะแพร่เชื้อต่อให้ตัวรอบๆ',
  behavior: 'nova',
  base: { dmg: 9, types: { chaos: 1 }, cd: 2.2, area: 120, poison: 1, contagion: true },
  scale(s, l) { s.area *= 1 + 0.02 * (l - 1); },
  levelNote: 'ทุกเลเวล: วงกว้างขึ้น · คอมโบกับ Essence Drain',
  color: '#a8e05a', core: '#e0ffb0',
});
defSkill({
  id: 'essence_drain', name: 'Essence Drain', th: 'สูบแก่นชีวิต', gem: 'b', icon: '♒',
  tags: ['Spell', 'Projectile', 'Chaos', 'DoT', 'Duration'],
  desc: 'ยิงพลังเคออสที่ทำให้ติดพิษรุนแรงทุกครั้ง และดูดชีวิตกลับมาให้ผู้ร่าย',
  behavior: 'projectile',
  base: { dmg: 10, types: { chaos: 1 }, cd: 0.9, proj: 1, speed: 480, life: 1.1, size: 7, spread: 0.25, poison: 1, aim: 'nearest' },
  scale(s, l) { s.leech += 0.02; s.dotMore *= 1.5; s.proj += Math.floor(l / 7); },
  levelNote: 'ทุก 7 เลเวล: +1 ลูก · พิษแรงกว่าปกติ 50% · ดูดชีวิต 2%',
  color: '#9a5aff', core: '#e0c8ff',
});
defSkill({
  id: 'storm_brand', name: 'Storm Brand', th: 'ตราพายุ', gem: 'b', icon: '⌁',
  tags: ['Spell', 'Brand', 'Lightning', 'Chaining', 'Duration'],
  desc: 'ประทับตราบนศัตรู ตราจะปล่อยสายฟ้ากระโดดไปหาศัตรูรอบๆ ซ้ำๆ ตราย้ายไปตัวใหม่เมื่อเป้าตาย',
  behavior: 'brand',
  base: { dmg: 8, types: { lightning: 1 }, cd: 1.2, duration: 4, maxCount: 2, chain: 2, chainRange: 180, hitCd: 0.45, range: 420, shock: 0.2, brand: 'chain' },
  scale(s, l) { s.chain += Math.floor(l / 5); s.maxCount += Math.floor(l / 8); },
  levelNote: 'ทุก 5 เลเวล: +1 กระโดด · ทุก 8 เลเวล: +1 ตรา',
  color: '#a8c8ff', core: '#ffffff',
});
defSkill({
  id: 'armageddon_brand', name: 'Armageddon Brand', th: 'ตราวันสิ้นโลก', gem: 'r', icon: '☄',
  tags: ['Spell', 'Brand', 'Fire', 'AoE', 'Duration'],
  desc: 'ประทับตราบนศัตรู ตราจะเรียกอุกกาบาตเพลิงลงใส่ตำแหน่งนั้นซ้ำๆ',
  behavior: 'brand',
  base: { dmg: 18, types: { fire: 1 }, cd: 1.8, duration: 5, maxCount: 2, area: 55, hitCd: 0.9, range: 420, ignite: 0.25, brand: 'meteor' },
  scale(s, l) { s.area *= 1 + 0.02 * (l - 1); s.maxCount += Math.floor(l / 8); },
  levelNote: 'ทุกเลเวล: ระเบิดกว้างขึ้น · ทุก 8 เลเวล: +1 ตรา',
  color: '#ff7a2a', core: '#ffe0a0',
});
defSkill({
  id: 'molten_strike', name: 'Molten Strike', th: 'หมัดหลอมเหลว', gem: 'r', icon: '✸',
  tags: ['Attack', 'Melee', 'Projectile', 'Fire', 'AoE'],
  desc: 'ฟาดศัตรูระยะประชิด แล้วพ่นลูกลาวาออกไปตกระเบิดรอบเป้าหมาย (Support กระสุนเพิ่มจำนวนลูกลาวา)',
  behavior: 'strike',
  base: { dmg: 15, types: { fire: 1, physical: 0.3 }, cd: 0.7, range: 120, balls: 3, area: 38, ignite: 0.15, knock: 20 },
  scale(s, l) { s.balls += Math.floor(l / 4); },
  levelNote: 'ทุก 4 เลเวล: +1 ลูกลาวา',
  color: '#ff8a3d', core: '#ffe0a0',
});
defSkill({
  id: 'earthquake', name: 'Earthquake', th: 'แผ่นดินไหว', gem: 'r', icon: '⩘',
  tags: ['Attack', 'Melee', 'AoE', 'Duration', 'Physical'],
  desc: 'ทุบพื้นรอบตัว แล้วเกิดแรงสั่นสะเทือนซ้ำ (Aftershock) ที่จุดเดิมแรงกว่าเดิม 60%',
  behavior: 'slam',
  base: { dmg: 16, types: { physical: 1 }, cd: 1.3, area: 110, duration: 0.9, aftershocks: 1, knock: 25, crit: 0.06 },
  scale(s, l) { s.area *= 1 + 0.02 * (l - 1); },
  levelNote: 'ทุกเลเวล: วงกว้างขึ้น',
  color: '#c8a070', core: '#fff0c0',
});
defSkill({
  id: 'scorching_ray', name: 'Scorching Ray', th: 'ลำแสงแผดเผา', gem: 'r', icon: '⟶',
  tags: ['Spell', 'Fire', 'Channelling', 'AoE'],
  desc: 'ยิงลำแสงเพลิงต่อเนื่องไปหาศัตรู เผาทุกตัวที่อยู่ในแนวลำแสง (Channelling)',
  behavior: 'beam',
  base: { dmg: 6, types: { fire: 1 }, cd: 0.13, range: 270, size: 16, ignite: 0.12, crit: 0.04 },
  scale(s, l) { s.range *= 1 + 0.02 * (l - 1); },
  levelNote: 'ทุกเลเวล: ลำแสงยาวขึ้น',
  color: '#ff9a3a', core: '#fff0c0',
});
defSkill({
  id: 'herald_of_ice', name: 'Herald of Ice', th: 'ผู้ประกาศน้ำแข็ง', gem: 'b', icon: '❄',
  tags: ['Spell', 'Cold', 'AoE', 'Herald'],
  desc: 'ไม่ต้องร่าย: ศัตรูที่ตายขณะติด Chill หรือ Freeze จะแตกระเบิดเป็นน้ำแข็งใส่ตัวรอบๆ (ระเบิดต่อเนื่องได้)',
  behavior: 'herald',
  base: { dmg: 12, types: { cold: 1 }, cd: 0, area: 75, herald: 'ice' },
  scale(s, l) { s.area *= 1 + 0.015 * (l - 1); },
  levelNote: 'ทุกเลเวล: ระเบิดกว้างขึ้น · คอมโบกับสกิลน้ำแข็ง',
  color: '#9fe0ff', core: '#ffffff',
});
defSkill({
  id: 'summon_skeletons', name: 'Summon Skeletons', th: 'อัญเชิญโครงกระดูก', gem: 'b', icon: '☠',
  tags: ['Spell', 'Minion', 'Duration', 'Physical'],
  desc: 'อัญเชิญโครงกระดูกนักดาบทีละ 2 ตัว ฝูงใหญ่แต่ตัวเล็ก (Minion)',
  behavior: 'minion',
  base: { dmg: 7, types: { physical: 1 }, cd: 0.7, maxCount: 6, duration: 8, speed: 210, hitCd: 0.6, size: 10, knock: 10, summonN: 2, minionSprite: 'skeleton' },
  scale(s, l) { s.maxCount += Math.floor(l / 3); },
  levelNote: 'ทุก 3 เลเวล: +1 โครงกระดูกสูงสุด',
  color: '#e8dcc0', core: '#ffffff',
});

// ---------------- expansion 2: movement, melee hybrids, more spells ----------------
defSkill({
  id: 'flicker_strike', name: 'Flicker Strike', th: 'ฟาดวาร์ป', gem: 'g', icon: '⚡',
  tags: ['Attack', 'Melee', 'AoE', 'Movement', 'Physical'],
  desc: 'วาร์ปไปหาศัตรูแล้วฟาดเป็นวงทันที — ตัวละครจะถูกพาเข้ากลางฝูงเอง (ชอบเล็ง Rare) · อมตะชั่วครู่ทุกครั้งที่วาร์ป',
  behavior: 'flicker',
  base: { dmg: 19, types: { physical: 1 }, cd: 0.8, range: 430, area: 70, crit: 0.06, knock: 15, flickers: 1 },
  scale(s, l) { s.flickers += Math.floor(l / 7); s.area *= 1 + 0.015 * (l - 1); },
  levelNote: 'ทุก 7 เลเวล: วาร์ปต่อเนื่อง +1 ครั้ง',
  color: '#d0f0ff', core: '#ffffff',
});
defSkill({
  id: 'smite', name: 'Smite', th: 'ทัณฑ์สายฟ้า', gem: 'r', icon: 'ϟ',
  tags: ['Attack', 'Melee', 'AoE', 'Lightning'],
  desc: 'ฟาดศัตรูที่ใกล้ที่สุด แล้วเรียกสายฟ้าลงใส่ศัตรูรอบๆ เป้าหมาย 3 ตัว',
  behavior: 'strike',
  base: { dmg: 14, types: { physical: 0.5, lightning: 1 }, cd: 0.6, range: 120, balls: 0, bolts: 3, boltR: 220, area: 30, shock: 0.25 },
  scale(s, l) { s.bolts += Math.floor(l / 5); },
  levelNote: 'ทุก 5 เลเวล: +1 สายฟ้า',
  color: '#fff27a', core: '#ffffff',
});
defSkill({
  id: 'frost_blades', name: 'Frost Blades', th: 'ใบมีดน้ำแข็ง', gem: 'g', icon: '❆',
  tags: ['Attack', 'Melee', 'Projectile', 'Cold'],
  desc: 'ฟันศัตรูที่ใกล้ที่สุด แล้วใบมีดน้ำแข็งพุ่งทะลุต่อจากเป้าหมาย (Support กระสุนเพิ่มจำนวนใบมีด)',
  behavior: 'strike',
  base: { dmg: 13, types: { physical: 0.4, cold: 1 }, cd: 0.6, range: 120, balls: 0, blades: 3, speed: 620, life: 0.6, size: 6, spread: 0.3, pierce: 1 },
  scale(s, l) { s.blades += Math.floor(l / 6); s.pierce += Math.floor(l / 5); },
  levelNote: 'ทุก 6 เลเวล: +1 ใบมีด · ทุก 5 เลเวล: ทะลุ +1',
  color: '#9fe0ff', core: '#ffffff',
});
defSkill({
  id: 'kinetic_blast', name: 'Kinetic Blast', th: 'ระเบิดจลน์', gem: 'g', icon: '✺',
  tags: ['Attack', 'Projectile', 'AoE', 'Physical'],
  desc: 'ยิงกระสุนพลังงานที่ระเบิดเมื่อกระทบ แล้วแตกเป็นระเบิดย่อยรอบๆ อีก 2 ลูก',
  behavior: 'projectile',
  base: { dmg: 10, types: { physical: 1 }, cd: 0.9, proj: 1, speed: 560, life: 0.75, size: 7, spread: 0.2, area: 46, explode: true, cluster: 2, aim: 'nearest' },
  scale(s, l) { s.cluster += Math.floor(l / 6); },
  levelNote: 'ทุก 6 เลเวล: +1 ระเบิดย่อย',
  color: '#c8a0ff', core: '#f8f0ff',
});
defSkill({
  id: 'glacial_cascade', name: 'Glacial Cascade', th: 'ธารน้ำแข็งถล่ม', gem: 'b', icon: '⩙',
  tags: ['Spell', 'AoE', 'Cold', 'Physical'],
  desc: 'แท่งน้ำแข็งพุ่งขึ้นจากพื้นเป็นแนวตรงไปหาศัตรู ลูกสุดท้ายแรงที่สุด',
  behavior: 'ground',
  base: { dmg: 13, types: { cold: 1, physical: 0.4 }, cd: 1.2, count: 5, area: 40, range: 340, duration: 0.5, line: true },
  scale(s, l) { s.count += Math.floor(l / 5); s.area *= 1 + 0.015 * (l - 1); },
  levelNote: 'ทุก 5 เลเวล: +1 แท่งน้ำแข็ง',
  color: '#a8e8ff', core: '#ffffff',
});
defSkill({
  id: 'shock_nova', name: 'Shock Nova', th: 'โนวาช็อก', gem: 'b', icon: '◎',
  tags: ['Spell', 'AoE', 'Lightning', 'Nova'],
  desc: 'ปล่อยวงสายฟ้ากว้างรอบตัว มีโอกาส Shock สูง',
  behavior: 'nova',
  base: { dmg: 14, types: { lightning: 1 }, cd: 2.1, area: 130, shock: 0.4 },
  scale(s, l) { s.area *= 1 + 0.02 * (l - 1); },
  levelNote: 'ทุกเลเวล: วงกว้างขึ้น',
  color: '#fff27a', core: '#ffffff',
});
