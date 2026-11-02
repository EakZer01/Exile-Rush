'use strict';
// ============================================================
//  PASSIVE NODES (repeatable) and KEYSTONES (one-time, build-defining)
//  apply(m) mutates player.mods (see player.js defaultMods)
// ============================================================
const PASSIVES = {};
function defPassive(d) { d.max = d.max || 5; PASSIVES[d.id] = d; }

defPassive({ id: 'life', name: 'Constitution', th: 'ร่างกายแกร่ง', icon: '❤', desc: '+15% พลังชีวิตสูงสุด', apply(m) { m.lifeInc += 0.15; } });
defPassive({ id: 'move', name: 'Fleet Foot', th: 'เท้าไว', icon: '➹', desc: '+7% ความเร็วเคลื่อนที่', apply(m) { m.moveInc += 0.07; } });
defPassive({ id: 'spell', name: 'Arcane Potency', th: 'พลังเวท', icon: '✧', desc: '+18% ดาเมจ Spell', apply(m) { m.incSpell += 0.18; } });
defPassive({ id: 'attack', name: 'Martial Mastery', th: 'ศิลปะการต่อสู้', icon: '⚔', desc: '+18% ดาเมจ Attack', apply(m) { m.incAttack += 0.18; } });
defPassive({ id: 'proj', name: 'Ballistics', th: 'วิถีกระสุน', icon: '➶', desc: '+15% ดาเมจ Projectile, +10% ความเร็วกระสุน', apply(m) { m.incProj += 0.15; m.projSpeedInc += 0.1; } });
defPassive({ id: 'area', name: 'Blast Radius', th: 'รัศมีระเบิด', icon: '◎', desc: '+12% พื้นที่ (AoE), +8% ดาเมจ AoE', apply(m) { m.areaInc += 0.12; m.incAoE += 0.08; } });
defPassive({ id: 'speed', name: 'Quickening', th: 'เร่งความเร็ว', icon: '⏱', desc: '+8% ความเร็วร่าย/โจมตี', apply(m) { m.speedInc += 0.08; } });
defPassive({ id: 'ele', name: 'Elemental Adept', th: 'ผู้ชำนาญธาตุ', icon: '☀', desc: '+16% ดาเมจธาตุ (ไฟ/น้ำแข็ง/สายฟ้า)', apply(m) { m.incEle += 0.16; } });
defPassive({ id: 'phys', name: 'Brutality', th: 'ความโหดเหี้ยม', icon: '✊', desc: '+18% ดาเมจกายภาพ', apply(m) { m.incPhys += 0.18; } });
defPassive({ id: 'chaos', name: 'Toxic Mastery', th: 'ปรมาจารย์พิษ', icon: '☣', desc: '+18% ดาเมจเคออส, +15% ดาเมจ DoT', apply(m) { m.incChaos += 0.18; m.incDot += 0.15; } });
defPassive({ id: 'crit', name: 'Precision', th: 'ความแม่นยำ', icon: '✪', desc: '+1.5% โอกาสคริ (base), +25% ตัวคูณคริ', apply(m) { m.critAdd += 0.015; m.critMulti += 0.25; } });
defPassive({ id: 'regen', name: 'Regeneration', th: 'ฟื้นฟู', icon: '✚', desc: 'ฟื้นชีวิต 0.5% ต่อวินาที', apply(m) { m.regen += 0.005; } });
defPassive({ id: 'armour', name: 'Iron Skin', th: 'ผิวเหล็ก', icon: '⛨', desc: 'รับดาเมจ 7% less', apply(m) { m.dmgTaken *= 0.93; } });
defPassive({ id: 'duration', name: 'Persistence', th: 'ความคงทน', icon: '⧗', desc: '+15% ระยะเวลาสกิล', apply(m) { m.durInc += 0.15; } });
defPassive({ id: 'minion', name: 'Necromantic Aegis', th: 'ผู้คุมวิญญาณ', icon: '☠', desc: '+20% ดาเมจมินเนียน, +10% ความเร็วมินเนียน', apply(m) { m.incMinion += 0.2; m.minionSpeed += 0.1; } });
defPassive({ id: 'pickup', name: 'Magnetism', th: 'แม่เหล็ก', icon: '⊛', max: 3, desc: '+40% ระยะดูดของ', apply(m) { m.pickupInc += 0.4; } });
defPassive({ id: 'wisdom', name: 'Wisdom', th: 'ปัญญา', icon: '✎', max: 3, desc: '+12% ค่าประสบการณ์ที่ได้รับ', apply(m) { m.xpInc += 0.12; } });
defPassive({ id: 'inferno', name: 'Inferno', th: 'นรกเพลิง', icon: '♨', desc: '+18% ดาเมจไฟ', apply(m) { m.incFire += 0.18; } });
defPassive({ id: 'winter', name: 'Heart of Winter', th: 'หัวใจเหมันต์', icon: '❆', desc: '+18% ดาเมจน้ำแข็ง', apply(m) { m.incCold += 0.18; } });
defPassive({ id: 'thunder', name: 'Thunderous', th: 'เสียงฟ้าคำราม', icon: 'ϟ', desc: '+18% ดาเมจสายฟ้า', apply(m) { m.incLight += 0.18; } });
defPassive({ id: 'affliction', name: 'Lingering Affliction', th: 'ทรมานยาวนาน', icon: '⧖', desc: 'Ailment นานขึ้น 12% · +10% ดาเมจ DoT', apply(m) { m.ailDurInc += 0.12; m.incDot += 0.1; } });
defPassive({ id: 'bloodletting', name: 'Bloodletting', th: 'ปล่อยเลือด', icon: '❣', desc: '+8% โอกาส Bleed (Attack) · +15% ดาเมจ Bleed', apply(m) { m.bleedAdd += 0.08; m.bleedInc += 0.15; } });
defPassive({ id: 'ricochet', name: 'Ricochet', th: 'กระดอน', icon: '⟲', max: 2, desc: 'สกิล Projectile และ Chaining กระโดดเพิ่ม +1', apply(m) { m.chainAdd += 1; } });
defPassive({ id: 'piercing', name: 'Piercing Shots', th: 'ยิงทะลุ', icon: '➵', max: 2, desc: 'Projectile ทะลุเพิ่ม +1 · +5% ดาเมจ Projectile', apply(m) { m.pierceAdd += 1; m.incProj += 0.05; } });
defPassive({ id: 'malediction', name: 'Malediction', th: 'คำแช่ง', icon: '☾', max: 3, desc: 'ผลของคำสาป (Hextouch) แรงขึ้น 20%', apply(m) { m.curseEff += 0.2; } });
defPassive({ id: 'vampirism', name: 'Vampirism', th: 'แวมไพร์', icon: '♥', max: 3, desc: 'ดูดชีวิต 0.4% ของดาเมจทุกสกิล', apply(m) { m.leech += 0.004; } });
defPassive({ id: 'flask', name: 'Alchemist', th: 'นักเล่นแร่แปรธาตุ', icon: '⚗', max: 3, desc: 'ฟลาสก์ได้ชาร์จเพิ่ม 30%, ฟื้นฟูมากขึ้น 20%', apply(m) { m.flaskCharge += 0.3; m.flaskEff += 0.2; } });

const KEYSTONES = {};
const MAX_KEYSTONES = 3;   // per run — each one is a real build decision
function defKeystone(d) { d.max = 1; d.keystone = true; KEYSTONES[d.id] = d; }

defKeystone({ id: 'elemental_overload', name: 'Elemental Overload', th: 'ธาตุล้นพลัง', icon: '❂',
  desc: 'ดาเมจธาตุ 40% more · คริติคอลไม่ทำดาเมจเพิ่ม', apply(m) { m.ks.eo = true; } });
defKeystone({ id: 'point_blank', name: 'Point Blank', th: 'ระยะเผาขน', icon: '◉',
  desc: 'Projectile ทำดาเมจสูงสุด 50% more ในระยะใกล้ แต่ลดลงเมื่อไกล (ต่ำสุด 30% less)', apply(m) { m.ks.pointBlank = true; } });
defKeystone({ id: 'acrobatics', name: 'Acrobatics', th: 'กายกรรม', icon: '↯',
  desc: 'หลบการโจมตีได้ 30% · พลังชีวิตสูงสุด 20% less', apply(m) { m.evade += 0.3; m.lifeMore *= 0.8; } });
defKeystone({ id: 'pain_attunement', name: 'Pain Attunement', th: 'ผูกพันความเจ็บปวด', icon: '♥',
  desc: 'ดาเมจ Spell 40% more เมื่อชีวิตต่ำกว่า 50%', apply(m) { m.ks.painAttune = true; } });
defKeystone({ id: 'avatar_of_fire', name: 'Avatar of Fire', th: 'อวตารเพลิง', icon: '❋',
  desc: 'ดาเมจทุกชนิดเปลี่ยนเป็นไฟ · ดาเมจไฟ 25% more', apply(m) { m.ks.avatarFire = true; } });
defKeystone({ id: 'vaal_pact', name: 'Vaal Pact', th: 'พันธสัญญาวาล', icon: '♆',
  desc: 'ดูดชีวิต 1.5% ของดาเมจทุกสกิล (ลิมิตสูงขึ้นเป็น 20%/วิ) · ไม่ฟื้นชีวิตตามธรรมชาติ', apply(m) { m.leech += 0.015; m.ks.vaalPact = true; } });
defKeystone({ id: 'resolute_technique', name: 'Resolute Technique', th: 'เทคนิคมั่นคง', icon: '⚒',
  desc: 'ไม่สามารถคริติคอลได้ · ดาเมจ Hit 35% more', apply(m) { m.ks.resolute = true; } });
defKeystone({ id: 'iron_reflexes', name: 'Iron Reflexes', th: 'ปฏิกิริยาเหล็ก', icon: '⛊',
  desc: 'รับดาเมจ 25% less · ความเร็วเคลื่อนที่ 10% less', apply(m) { m.dmgTaken *= 0.75; m.moveMore *= 0.9; } });
defKeystone({ id: 'elemental_equilibrium', name: 'Elemental Equilibrium', th: 'สมดุลธาตุ', icon: '☯',
  desc: 'Hit ธาตุใดก็ตาม ทำให้ศัตรูรับดาเมจจากธาตุอื่น 30% more นาน 4 วิ (ผสมหลายธาตุให้คุ้ม)', apply(m) { m.ks.ee = true; } });
defKeystone({ id: 'runebinder', name: 'Runebinder', th: 'ผู้ผูกอักขระ', icon: '⌘',
  desc: 'สกิล Brand ติดตราได้เพิ่ม +1 · ตราทำงานเร็วขึ้น 20%', apply(m) { m.ks.runebinder = true; } });
defKeystone({ id: 'hex_master', name: 'Hex Master', th: 'จอมคำสาป', icon: '☾',
  desc: 'คำสาปไม่มีวันหมดเวลา · ผลของคำสาปแรงขึ้น 20%', apply(m) { m.ks.hexMaster = true; m.curseEff += 0.2; } });
defKeystone({ id: 'minion_instability', name: 'Minion Instability', th: 'มินเนียนไม่เสถียร', icon: '✷',
  desc: 'มินเนียนระเบิดเมื่อหมดเวลา ทำดาเมจไฟรอบตัว', apply(m) { m.ks.minionBoom = true; } });

// ---- expansion 2: defences & resistances ----
defPassive({ id: 'prismatic', name: 'Prismatic Skin', th: 'ผิวปริซึม', icon: '◈', desc: '+12% ต้านทานธาตุทั้งหมด', apply(m) { m.resFire += 0.12; m.resCold += 0.12; m.resLight += 0.12; } });
defPassive({ id: 'purity_flesh', name: 'Purity of Flesh', th: 'กายบริสุทธิ์', icon: '☣', max: 3, desc: '+15% ต้านทานเคออส', apply(m) { m.resChaos += 0.15; } });
defPassive({ id: 'fortress', name: 'Elemental Fortress', th: 'ป้อมธาตุ', icon: '⛫', max: 2, desc: '+2% ต้านทานธาตุสูงสุด · +6% ต้านทานธาตุทั้งหมด', apply(m) { m.maxRes += 0.02; m.resFire += 0.06; m.resCold += 0.06; m.resLight += 0.06; } });
defPassive({ id: 'ironwood', name: 'Ironwood', th: 'ไม้เหล็ก', icon: '⛨', desc: '+120 Armour · +4% ชีวิตสูงสุด', apply(m) { m.armour += 120; m.lifeInc += 0.04; } });
defPassive({ id: 'phase', name: 'Phase Walk', th: 'ก้าวเงา', icon: '❖', desc: '+120 Evasion · +3% ความเร็วเคลื่อนที่', apply(m) { m.evasion += 120; m.moveInc += 0.03; } });
defPassive({ id: 'barrier', name: 'Arcane Barrier', th: 'ม่านอาคม', icon: '◇', desc: '+30 Energy Shield · ES ฟื้นเร็วขึ้น 15%', apply(m) { m.es += 30; m.esRechargeInc += 0.15; } });
defPassive({ id: 'shieldwall', name: 'Shield Wall', th: 'กำแพงโล่', icon: '▣', max: 3, desc: '+4% โอกาส Block', apply(m) { m.block += 0.04; } });
defPassive({ id: 'blade_dance', name: 'Blade Dance', th: 'ระบำดาบ', icon: '⚔', desc: '+15% ดาเมจ Attack · +6% พื้นที่', apply(m) { m.incAttack += 0.15; m.areaInc += 0.06; } });

defKeystone({ id: 'chaos_inoculation', name: 'Chaos Inoculation', th: 'ภูมิคุ้มกันเคออส', icon: '☤',
  desc: 'ชีวิตสูงสุดเหลือ 1 · ได้ Energy Shield เพิ่ม 130% ของชีวิตเดิม · อมตะต่อดาเมจเคออส · การฟื้นชีวิต, ดูดชีวิต และ Life Flask เติม ES แทน', apply(m) { m.ks.ci = true; } });
defKeystone({ id: 'perfect_agony', name: 'Perfect Agony', th: 'ทรมานสมบูรณ์', icon: '✶',
  desc: 'Ignite และ Poison จากคริติคอลแรงขึ้น 80% · ดาเมจ Hit 20% less', apply(m) { m.ks.agony = true; } });
defKeystone({ id: 'arrow_dancing', name: 'Arrow Dancing', th: 'ระบำหลบธนู', icon: '➷',
  desc: 'หลบ Projectile ได้เพิ่ม 40% · หลบการโจมตีระยะประชิดได้แค่ครึ่งเดียว', apply(m) { m.ks.arrowDance = true; } });
defKeystone({ id: 'crimson_dance', name: 'Crimson Dance', th: 'ระบำโลหิต', icon: '♦',
  desc: 'Bleed ซ้อนกันได้ 8 ชั้น แต่ละชั้นทำดาเมจ 50% (ปกติทำงานเฉพาะชั้นที่แรงที่สุด)', apply(m) { m.ks.crimsonDance = true; } });
