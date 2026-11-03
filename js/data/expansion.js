'use strict';
// Build 42: PoE-inspired mechanics adapted for automatic survivor combat.
// These descriptions and values describe this game, not PoE's original balance.
const EXPANSION_SKILLS = [
  { id: 'cleave', name: 'Cleave', th: 'ฟันกวาด', gem: 'r', icon: '◒', tags: ['Attack', 'Melee', 'AoE', 'Physical'], behavior: 'cone',
    desc: 'ฟันกวาดเป็นครึ่งวงไปทางศัตรู เหมาะกับดาบและขวาน', weapons: ['sword', 'axe'], color: '#e8c090', core: '#fff4dd',
    base: { dmg: 20, types: { physical: 1 }, cd: 0.85, range: 160, area: 160, coneArc: 2.6, knock: 15 },
    scale(s, l) { s.area *= 1 + 0.015 * (l - 1); }, levelNote: 'ทุกเลเวล: แนวฟันไกลขึ้น' },
  { id: 'heavy_strike', name: 'Heavy Strike', th: 'ฟาดหนัก', gem: 'r', icon: '⚒', tags: ['Attack', 'Melee', 'Strike', 'Physical'], behavior: 'strike',
    desc: 'ฟาดเป้าเดียวอย่างหนักและผลักกระเด็น ใช้ Melee Splash เพื่อกวาดฝูง', weapons: ['sword', 'axe', 'mace', 'staff', 'sceptre'], color: '#e0b080', core: '#fff2d8',
    base: { dmg: 35, types: { physical: 1 }, cd: 1.05, range: 140, knock: 80 },
    scale(s, l) { s.knock += l; }, levelNote: 'ทุกเลเวล: ผลักแรงขึ้น' },
  { id: 'glacial_hammer', name: 'Glacial Hammer', th: 'ค้อนธารน้ำแข็ง', gem: 'r', icon: '❆', tags: ['Attack', 'Melee', 'Strike', 'Cold', 'Physical'], behavior: 'strike',
    desc: 'ค้อนน้ำแข็งตีแรงและเพิ่มผล Chill เพื่อควบคุมศัตรูประชิด', weapons: ['mace', 'staff', 'sceptre'], color: '#9fdfff', core: '#ffffff',
    base: { dmg: 25, types: { physical: 0.3, cold: 0.7 }, cd: 0.85, range: 140, chillEff: 1.5, knock: 18 },
    scale(s, l) { s.chillEff += 0.015 * l; }, levelNote: 'ทุกเลเวล: Chill แรงขึ้น' },
  { id: 'infernal_blow', name: 'Infernal Blow', th: 'หมัดเพลิงระเบิด', gem: 'r', icon: '✹', tags: ['Attack', 'Melee', 'Strike', 'AoE', 'Fire'], behavior: 'strike',
    desc: 'ฟาดแล้วประทับตราเพลิง 4 วิ เป้าตายจะระเบิดด้วยพลังของสกิล (ไม่ใช้เปอร์เซ็นต์เลือดศัตรู)', weapons: ['sword', 'axe', 'mace', 'staff', 'sceptre'], color: '#ff9356', core: '#fff0c0',
    base: { dmg: 19, types: { physical: 0.4, fire: 0.6 }, cd: 0.75, range: 135, area: 95, ignite: 0.25, infernal: true },
    scale(s, l) { s.area *= 1 + 0.015 * (l - 1); }, levelNote: 'ทุกเลเวล: ระเบิดกว้างขึ้น' },
  { id: 'sweep', name: 'Sweep', th: 'กวาดรอบตัว', gem: 'r', icon: '⟳', tags: ['Attack', 'Melee', 'AoE', 'Physical'], behavior: 'spin',
    desc: 'เหวี่ยงอาวุธหนักเป็นวงรอบตัว จังหวะช้าแต่กว้างและผลักศัตรู', weapons: ['staff', 'axe', 'mace'], color: '#dec9a2', core: '#fff8e8',
    base: { dmg: 24, types: { physical: 1 }, cd: 1.25, area: 165, knock: 38 },
    scale(s, l) { s.area *= 1 + 0.015 * (l - 1); }, levelNote: 'ทุกเลเวล: วงกวาดกว้างขึ้น' },
  { id: 'sunder', name: 'Sunder', th: 'คลื่นแยกปฐพี', gem: 'r', icon: '≋', tags: ['Attack', 'Melee', 'Slam', 'AoE', 'Physical', 'Duration'], behavior: 'ground',
    desc: 'ส่งระเบิดพื้นต่อกันเป็นแนวยาว จุดสุดท้ายแรงขึ้น เหมาะกับโจมตีฝูงจากระยะกลาง', weapons: ['axe', 'mace', 'staff', 'sceptre'], color: '#cdb18a', core: '#fff0d0',
    base: { dmg: 18, types: { physical: 1 }, cd: 1.45, count: 4, area: 42, range: 360, duration: 0.4, line: true, knock: 22 },
    scale(s, l) { s.count += Math.floor(l / 6); }, levelNote: 'ทุก 6 เลเวล: คลื่น +1 จุด' },
  { id: 'rolling_magma', name: 'Rolling Magma', th: 'แมกมากระเด้ง', gem: 'b', icon: '●', tags: ['Spell', 'Projectile', 'AoE', 'Fire'], behavior: 'projectile',
    desc: 'ลูกแมกมาระเบิดเมื่อกระทบ แล้วกระเด้งไปหาเป้าถัดไปได้ 2 ครั้ง', weapons: CASTER_WEAPONS, color: '#ff9a48', core: '#fff0ab',
    base: { dmg: 16, types: { fire: 1 }, cd: 1.15, proj: 1, speed: 420, life: 1.1, size: 10, area: 65, explode: true, chain: 2, chainRange: 190, ignite: 0.2 },
    scale(s, l) { s.area *= 1 + 0.015 * (l - 1); }, levelNote: 'ทุกเลเวล: ระเบิดกว้างขึ้น' },
  { id: 'blazing_salvo', name: 'Blazing Salvo', th: 'ห่ากระสุนเพลิง', gem: 'b', icon: '⋔', tags: ['Spell', 'Projectile', 'AoE', 'Fire'], behavior: 'projectile',
    desc: 'กระสุนเพลิงหลายลูกแผ่เป็นพัด แต่ละลูกระเบิดเล็กๆ', weapons: CASTER_WEAPONS, color: '#ffb065', core: '#fff4ca',
    base: { dmg: 7, types: { fire: 1 }, cd: 1.35, proj: 4, spread: 0.18, speed: 490, life: 0.9, size: 5, area: 34, explode: true, ignite: 0.15 },
    scale(s, l) { s.proj += Math.floor(l / 7); }, levelNote: 'ทุก 7 เลเวล: กระสุน +1' },
  { id: 'ice_spear', name: 'Ice Spear', th: 'หอกน้ำแข็ง', gem: 'b', icon: '➶', tags: ['Spell', 'Projectile', 'Cold', 'Critical'], behavior: 'projectile',
    desc: 'หอกน้ำแข็งพุ่งเร็ว ทะลุศัตรู และมีโอกาสคริติคอลสูง', weapons: CASTER_WEAPONS, color: '#adeaff', core: '#ffffff',
    base: { dmg: 18, types: { cold: 1 }, cd: 1.05, proj: 1, speed: 850, life: 0.85, size: 5, pierce: 3, crit: 0.12 },
    scale(s, l) { s.crit += 0.002 * l; }, levelNote: 'ทุกเลเวล: โอกาสคริสูงขึ้น' },
  { id: 'soulrend', name: 'Soulrend', th: 'ฉีกวิญญาณ', gem: 'b', icon: '☽', tags: ['Spell', 'Projectile', 'Chaos', 'DoT', 'Duration'], behavior: 'projectile',
    desc: 'กระสุนเคออสไล่เป้า ทะลุศัตรู และทิ้งหมอกเคออสเมื่อกระทบ', weapons: CASTER_WEAPONS, color: '#c68aff', core: '#f6dcff',
    base: { dmg: 11, types: { chaos: 1 }, cd: 1.4, proj: 1, speed: 310, life: 1.5, size: 9, pierce: 2, seek: true, cloud: true, area: 55, duration: 1.8, cloudDps: 0.45, poison: 0.25 },
    scale(s, l) { s.duration *= 1 + 0.02 * (l - 1); }, levelNote: 'ทุกเลเวล: หมอกอยู่นานขึ้น' },
  { id: 'incinerate', name: 'Incinerate', th: 'เผาผลาญ', gem: 'b', icon: '♨', tags: ['Spell', 'Channelling', 'AoE', 'Fire'], behavior: 'beam',
    desc: 'พ่นลำเพลิงสั้นแต่กว้างขึ้นเรื่อยๆ ขณะยืนนิ่ง เดินเพื่อเริ่มสะสมพลังใหม่', weapons: CASTER_WEAPONS, color: '#ff8850', core: '#ffe5ac',
    base: { dmg: 5, types: { fire: 1 }, cd: 0.18, range: 290, size: 20, ignite: 0.3 },
    scale(s, l) { s.size += 0.3 * l; }, levelNote: 'ทุกเลเวล: ลำเพลิงกว้างขึ้น' },
  { id: 'raise_zombie', name: 'Raise Zombie', th: 'ปลุกซอมบี้', gem: 'b', icon: '☠', tags: ['Spell', 'Minion', 'Physical', 'Duration'], behavior: 'minion',
    desc: 'เรียกซอมบี้หนักๆ เคลื่อนที่ช้าแต่ตีแรง อยู่ได้นาน (มินเนียนในเกมนี้ไม่มีระบบเลือด)', color: '#a3bb85', core: '#efffd7',
    base: { dmg: 24, types: { physical: 1 }, cd: 1.8, maxCount: 3, duration: 18, speed: 150, hitCd: 1.05, size: 17, knock: 18, minionSprite: 'zombie' },
    scale(s, l) { s.maxCount += Math.floor(l / 10); }, levelNote: 'Lv 10 / 20: ซอมบี้สูงสุด +1' },
];
for (const d of EXPANSION_SKILLS) defSkill(d);

const EXPANSION_SUPPORTS = [
  { id: 'slower_projectiles', name: 'Slower Projectiles', th: 'กระสุนช้าทรงพลัง', gem: 'g', req: ['Projectile'], conflicts: ['faster_projectiles'], desc: 'ความเร็วกระสุน 30% less · ดาเมจ 25% more', apply(s) { s.speed *= 0.7; s.more *= 1.25; } },
  { id: 'less_duration', name: 'Less Duration', th: 'ระยะเวลาสั้น', gem: 'r', req: ['Duration'], conflicts: ['inc_duration'], desc: 'ระยะเวลา 40% less · ดาเมจ 25% more', apply(s) { s.durMore *= 0.6; s.more *= 1.25; } },
  { id: 'chance_to_poison', name: 'Chance to Poison', th: 'อาบพิษ', gem: 'g', excl: ['Aura'], addTags: ['Chaos'], desc: 'เพิ่มเคออส 20% ของดาเมจเจม · โอกาส Poison +40%', apply(s) { s.added.chaos += 0.2; s.poison += 0.4; } },
  { id: 'cold_to_fire', name: 'Cold to Fire', th: 'น้ำแข็งเป็นไฟ', gem: 'r', req: ['Cold'], addTags: ['Fire'], desc: 'แปลงดาเมจน้ำแข็ง 50% เป็นไฟ · ดาเมจธาตุ 15% more', apply(s) { s.convertCold = 0.5; s.moreEle *= 1.15; } },
  { id: 'physical_to_lightning', name: 'Physical to Lightning', th: 'กายภาพเป็นสายฟ้า', gem: 'b', req: ['Physical'], addTags: ['Lightning'], desc: 'แปลงดาเมจกายภาพ 50% เป็นสายฟ้า · โอกาส Shock +15%', apply(s) { s.convertPhys = 0.5; s.shock += 0.15; } },
  { id: 'elemental_attacks', name: 'Elemental Damage with Attacks', th: 'โจมตีธาตุ', gem: 'r', req: ['Attack'], desc: 'ดาเมจธาตุของสกิล Attack 35% more', apply(s) { s.moreEle *= 1.35; } },
  { id: 'spell_totem', name: 'Spell Totem', th: 'ป้อมเวท', gem: 'r', req: ['Projectile'], all: ['Spell'], excl: ['Attack', 'Minion', 'Herald', 'Aura'], conflicts: ['ballista_totem', 'mirage_archer'], addTags: ['Totem'], desc: 'เวทกระสุนยิงจากป้อมแทนตัวคุณ สูงสุด 2 ป้อม นาน 8 วิ · ดาเมจ 35% less', apply(s) { s.totem = true; s.more *= 0.65; } },
  { id: 'multiple_totems', name: 'Multiple Totems', th: 'ป้อมหลายต้น', gem: 'r', req: ['Totem'], desc: 'ป้อมสูงสุด +1 · ดาเมจ 20% less (ต้องมี Support ป้อม)', apply(s) { s.totemBonus = 1; s.more *= 0.8; } },
  { id: 'life_gain_on_hit', name: 'Life Gain on Hit', th: 'ชีวิตเมื่อโจมตีโดน', gem: 'r', req: ['Attack'], excl: ['Totem'], desc: 'Hit ฟื้นชีวิต 1% สูงสุดรวม 5% ต่อวินาทีต่อสกิล · ดาเมจ 10% less', apply(s) { s.lifeGain = 0.01; s.more *= 0.9; } },
  { id: 'ancestral_call', name: 'Ancestral Call', th: 'เรียกบรรพชน', gem: 'r', req: ['Strike'], desc: 'Strike โจมตีศัตรูเพิ่มอีก 2 ตัวใกล้เป้า · ดาเมจ 20% less', apply(s) { s.ancestral = 2; s.more *= 0.8; } },
  { id: 'unbound_ailments', name: 'Unbound Ailments', th: 'อาการไร้พันธนาการ', gem: 'b', req: ['Fire', 'Cold', 'Lightning', 'Chaos', 'Physical'], desc: 'Ailment นานขึ้น 35% · ดาเมจ Ailment 20% more', apply(s) { s.ailDurationBonus = 0.35; s.ailMore *= 1.2; } },
  { id: 'combustion', name: 'Combustion', th: 'จุดสันดาป', gem: 'b', req: ['Fire'], desc: 'โอกาส Ignite +25% · เจาะต้านทานไฟ 15%', apply(s) { s.ignite += 0.25; s.pen.fire += 0.15; } },
];
for (const d of EXPANSION_SUPPORTS) defSupport(d);
// Conflicts must behave the same whichever gem is inserted first.
for (const d of EXPANSION_SUPPORTS) for (const id of d.conflicts) if (!SUPPORTS[id].conflicts.includes(d.id)) SUPPORTS[id].conflicts.push(d.id);

// Passive effects use existing modifier sources so comparison and recomputation agree.
const EXPANSION_PASSIVES = [
  ['heart_of_flame', 'Heart of Flame', 'หัวใจเพลิง', '♨', 'ailment', '+12% ดาเมจไฟ · Ignite +6%', m => { m.incFire += 0.12; m.igniteAdd += 0.06; }],
  ['heart_of_ice', 'Heart of Ice', 'หัวใจน้ำแข็ง', '❄', 'caster', '+12% ดาเมจน้ำแข็ง · สกิล Cold เจาะต้านทานน้ำแข็ง 3%', m => { m.incCold += 0.12; m.skillHooks.push(s => { if (s.tags.has('Cold')) s.pen.cold += 0.03; }); }],
  ['heart_of_thunder', 'Heart of Thunder', 'หัวใจสายฟ้า', 'ϟ', 'ailment', '+12% ดาเมจสายฟ้า · Shock +6%', m => { m.incLight += 0.12; m.shockAdd += 0.06; }],
  ['fatal_toxins', 'Fatal Toxins', 'พิษมรณะ', '☣', 'ailment', '+10% ดาเมจเคออส · Poison +8%', m => { m.incChaos += 0.1; m.poisonAdd += 0.08; }],
  ['blood_siphon', 'Blood Siphon', 'สูบเลือด', '♥', 'defence', '+6% ชีวิตสูงสุด · ฆ่าฟื้นชีวิต 0.2%', m => { m.lifeInc += 0.06; m.lifeOnKill += 0.002; }],
  ['written_in_blood', 'Written in Blood', 'จารึกโลหิต', '❣', 'defence', '+8% ชีวิตสูงสุด · +8% Energy Shield', m => { m.lifeInc += 0.08; m.esInc += 0.08; }],
  ['arcane_focus', 'Arcane Focus', 'จุดรวมอาคม', '◇', 'defence', '+20% Energy Shield · +10% ความเร็วฟื้น ES', m => { m.esInc += 0.2; m.esRechargeInc += 0.1; }],
  ['sanctuary', 'Sanctuary', 'เขตศักดิ์สิทธิ์', '⛨', 'defence', '+2% Block · ต้านทานธาตุ +4%', m => { m.block += 0.02; m.resFire += 0.04; m.resCold += 0.04; m.resLight += 0.04; }],
  ['harrier', 'Harrier', 'นักล่าเร็ว', '➹', 'crit', '+4% ความเร็วสกิล · +3% ความเร็วเดิน', m => { m.speedInc += 0.04; m.moveInc += 0.03; }],
  ['lethal_assault', 'Lethal Assault', 'จู่โจมถึงตาย', '⚔', 'warfare', '+10% ดาเมจ Attack · Attack เร็วขึ้น 3%', m => { m.incAttack += 0.1; m.attackSpeed += 0.03; }],
  ['master_fletcher', 'Master Fletcher', 'ช่างธนูชั้นครู', '➶', 'proj', 'สกิล Bow: +12% ดาเมจ · +8% ความเร็วกระสุน', m => { m.skillHooks.push(s => { if (s.tags.has('Bow')) { s.more *= 1.12; s.projSpeedInc += 0.08; } }); }],
  ['longshot', 'Longshot', 'ยิงไกล', '➵', 'proj', '+10% ดาเมจกระสุน · +12% ความเร็วกระสุน', m => { m.incProj += 0.1; m.projSpeedInc += 0.12; }],
  ['spiritual_command', 'Spiritual Command', 'คำสั่งวิญญาณ', '☠', 'minion', '+12% ดาเมจมินเนียน · มินเนียนเร็วขึ้น 8%', m => { m.incMinion += 0.12; m.minionSpeed += 0.08; }],
  ['enduring_bond', 'Enduring Bond', 'พันธะยั่งยืน', '⌘', 'minion', 'สกิล Minion: ระยะเวลา +15% · ดาเมจ 8% more', m => { m.skillHooks.push(s => { if (s.tags.has('Minion')) { s.durInc += 0.15; s.more *= 1.08; } }); }],
  ['shamanistic_fury', 'Shamanistic Fury', 'โทสะหมอผี', '♜', 'caster', 'สกิล Totem: ดาเมจ 10% more · เร็วขึ้น 5%', m => { m.skillHooks.push(s => { if (s.totem) { s.more *= 1.1; s.speedInc += 0.05; } }); }],
  ['runesmith', 'Runesmith', 'ช่างอักขระ', '⌁', 'caster', 'สกิล Brand ทำงานเร็วขึ้น 8% · ระยะเวลา +10%', m => { m.brandSpeed += 0.08; m.skillHooks.push(s => { if (s.behavior === 'brand') s.durInc += 0.1; }); }],
];
for (const [id, name, th, icon, path, desc, apply] of EXPANSION_PASSIVES) {
  defPassive({ id, name, th, icon, desc, apply, max: 3 });
  RUN_PATHS[path].passives.push(id); PASSIVE_PATH[id] = path;
}
defKeystone({ id: 'precise_technique', name: 'Precise Technique', th: 'เทคนิคแม่นยำ', icon: '✥', desc: 'สกิล Attack ทำดาเมจ 35% more แต่ Attack คริไม่ได้ (เวทยังคริได้)', apply(m) { m.skillHooks.push(s => { if (s.tags.has('Attack')) { s.more *= 1.35; s.noCrit = true; } }); } });
defKeystone({ id: 'ancestral_bond', name: 'Ancestral Bond', th: 'พันธะบรรพชน', icon: '♜', desc: 'ป้อมสูงสุด +1 · สกิลที่ไม่ใช่ Totem ทำดาเมจ 30% less', apply(m) { m.skillHooks.push(s => { if (s.totem) s.totemBonus = (s.totemBonus || 0) + 1; else s.more *= 0.7; }); } });
defKeystone({ id: 'iron_grip', name: 'Iron Grip', th: 'กำมือเหล็ก', icon: '✊', desc: 'Attack แบบ Projectile ทำดาเมจกายภาพ 35% more · เดินช้าลง 8%', apply(m) { m.moveMore *= 0.92; m.skillHooks.push(s => { if (s.tags.has('Attack') && s.tags.has('Projectile')) s.morePhys *= 1.35; }); } });

// Evolved forms are adaptations; they are not claims of official Vaal gem variants.
for (const d of EXPANSION_SKILLS) {
  const req = d.tags.includes('Minion') ? ['minion_damage', 'minion_speed'] : d.tags.includes('Channelling') ? ['infused_channelling', 'combustion'] : d.tags.includes('Strike') ? ['ancestral_call', 'multistrike'] : d.tags.includes('Projectile') ? ['slower_projectiles', 'pierce'] : ['inc_aoe', 'concentrated'];
  EVOLUTIONS[d.id] = { name: 'Vaal ' + d.name, req, desc: 'ร่างดัดแปลงของเกมนี้: ดาเมจ 25% more และเพิ่มจุดเด่นของสกิล', apply(s) {
    s.more *= 1.25;
    if (s.behavior === 'minion') s.maxCount += 1;
    else if (s.behavior === 'projectile') s.proj += 1;
    else if (s.behavior === 'ground') s.count += 2;
    else if (s.behavior === 'beam') s.range *= 1.25;
    else if (s.behavior === 'strike') s.echo += 1;
    else s.area *= 1.2;
  } };
}
