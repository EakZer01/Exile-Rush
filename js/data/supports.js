'use strict';
// ============================================================
//  SUPPORT GEMS — socket into a skill to modify it
//  req:      skill must have at least one of these tags (empty = any)
//  excl:     skill must NOT have any of these tags
//  conflicts: cannot be linked together with these supports
//  addTags:  tags the support grants to the linked skill
//  apply(s): mutate the stat block (see stats.js for field list)
// ============================================================
const SUPPORTS = {};
function defSupport(d) {
  d.req = d.req || []; d.excl = d.excl || []; d.conflicts = d.conflicts || []; d.addTags = d.addTags || [];
  SUPPORTS[d.id] = d;
}

// ---- Projectile ----
defSupport({
  id: 'multiple_projectiles', name: 'Multiple Projectiles', th: 'กระสุนหลายลูก', gem: 'g', req: ['Projectile'],
  conflicts: ['gmp'], desc: '+2 Projectiles · ดาเมจ 25% less',
  apply(s) { s.proj += 2; s.more *= 0.75; },
});
defSupport({
  id: 'gmp', name: 'Greater Multiple Projectiles', th: 'กระสุนหลายลูก (ใหญ่)', gem: 'g', req: ['Projectile'],
  conflicts: ['multiple_projectiles'], desc: '+4 Projectiles · ดาเมจ 35% less',
  apply(s) { s.proj += 4; s.more *= 0.65; },
});
defSupport({
  id: 'pierce', name: 'Pierce', th: 'ทะลุทะลวง', gem: 'g', req: ['Projectile'],
  desc: 'ทะลุศัตรูเพิ่ม +3 ตัว · ดาเมจ Projectile 15% more',
  apply(s) { s.pierce += 3; s.more *= 1.15; },
});
defSupport({
  id: 'chain', name: 'Chain', th: 'กระโดดต่อ', gem: 'g', req: ['Projectile', 'Chaining'],
  desc: 'กระโดดไปหาศัตรูตัวใหม่ +2 ครั้ง · ดาเมจ 15% less',
  apply(s) { s.chain += 2; s.more *= 0.85; },
});
defSupport({
  id: 'fork', name: 'Fork', th: 'แตกแขนง', gem: 'g', req: ['Projectile'],
  desc: 'กระสุนแตกออกเป็น 2 ลูกเมื่อโดนศัตรู · ลูกที่แตกแล้วไม่แตกซ้ำ · ดาเมจ 10% more',
  apply(s) { s.fork = true; s.more *= 1.1; },
});
defSupport({
  id: 'faster_projectiles', name: 'Faster Projectiles', th: 'กระสุนเร็ว', gem: 'g', req: ['Projectile'],
  desc: 'ความเร็วกระสุน +50% · ดาเมจ 20% more',
  apply(s) { s.projSpeedInc += 0.5; s.more *= 1.2; },
});

// ---- Area ----
defSupport({
  id: 'inc_aoe', name: 'Increased Area of Effect', th: 'ขยายพื้นที่', gem: 'b', req: ['AoE'],
  conflicts: ['concentrated'], desc: 'พื้นที่ +50% increased · ดาเมจ 5% more',
  apply(s) { s.areaInc += 0.5; s.more *= 1.05; },
});
defSupport({
  id: 'concentrated', name: 'Concentrated Effect', th: 'รวมศูนย์', gem: 'b', req: ['AoE'],
  conflicts: ['inc_aoe'], desc: 'พื้นที่ 30% less · ดาเมจ 55% more',
  apply(s) { s.areaMore *= 0.7; s.more *= 1.55; },
});

// ---- Added damage ----
defSupport({
  id: 'added_fire', name: 'Added Fire Damage', th: 'เพิ่มดาเมจไฟ', gem: 'r', addTags: ['Fire'],
  desc: 'เพิ่มดาเมจไฟ = 40% ของดาเมจพื้นฐาน · โอกาส Ignite +10%',
  apply(s) { s.added.fire += 0.4; s.ignite += 0.1; },
});
defSupport({
  id: 'added_cold', name: 'Added Cold Damage', th: 'เพิ่มดาเมจน้ำแข็ง', gem: 'g', addTags: ['Cold'],
  desc: 'เพิ่มดาเมจน้ำแข็ง = 40% ของดาเมจพื้นฐาน (Chill ศัตรู)',
  apply(s) { s.added.cold += 0.4; },
});
defSupport({
  id: 'added_lightning', name: 'Added Lightning Damage', th: 'เพิ่มดาเมจสายฟ้า', gem: 'b', addTags: ['Lightning'],
  desc: 'เพิ่มดาเมจสายฟ้า = 40% ของดาเมจพื้นฐาน · โอกาส Shock +10%',
  apply(s) { s.added.lightning += 0.4; s.shock += 0.1; },
});
defSupport({
  id: 'added_chaos', name: 'Added Chaos Damage', th: 'เพิ่มดาเมจเคออส', gem: 'b', addTags: ['Chaos'],
  desc: 'เพิ่มดาเมจเคออส = 35% ของดาเมจพื้นฐาน · โอกาส Poison +30%',
  apply(s) { s.added.chaos += 0.35; s.poison += 0.3; },
});
defSupport({
  id: 'elemental_focus', name: 'Elemental Focus', th: 'โฟกัสธาตุ', gem: 'g', req: ['Fire', 'Cold', 'Lightning'],
  desc: 'ดาเมจธาตุ 50% more · ไม่สามารถทำให้ติดสถานะ (Ignite/Chill/Shock) ได้',
  apply(s) { s.moreEle *= 1.5; s.noAilment = true; },
});
defSupport({
  id: 'controlled_destruction', name: 'Controlled Destruction', th: 'ทำลายอย่างควบคุม', gem: 'b', req: ['Spell'],
  desc: 'ดาเมจ Spell 40% more · โอกาสคริติคอล 60% less',
  apply(s) { s.more *= 1.4; s.critMore *= 0.4; },
});
defSupport({
  id: 'melee_physical', name: 'Melee Physical Damage', th: 'ดาเมจกายภาพระยะประชิด', gem: 'r', req: ['Melee'],
  desc: 'ดาเมจกายภาพ 50% more · Knockback เพิ่ม',
  apply(s) { s.morePhys *= 1.5; s.knock += 30; },
});

// ---- Speed ----
defSupport({
  id: 'faster_casting', name: 'Faster Casting', th: 'ร่ายเร็ว', gem: 'b', req: ['Spell'], excl: ['Aura', 'Herald'],
  desc: 'ความเร็วร่าย +40% (คูลดาวน์สั้นลง)',
  apply(s) { s.speedInc += 0.4; },
});
defSupport({
  id: 'faster_attacks', name: 'Faster Attacks', th: 'โจมตีเร็ว', gem: 'g', req: ['Attack'],
  desc: 'ความเร็วโจมตี +40% (คูลดาวน์สั้นลง)',
  apply(s) { s.speedInc += 0.4; },
});
defSupport({
  id: 'spell_echo', name: 'Spell Echo', th: 'เสียงสะท้อนเวท', gem: 'b', req: ['Spell'], excl: ['Aura', 'Orbit', 'Minion', 'Herald', 'Channelling'],
  desc: 'ร่ายซ้ำอีก 1 ครั้งทันที · ดาเมจ 10% less',
  apply(s) { s.echo += 1; s.more *= 0.9; },
});

// ---- Crit ----
defSupport({
  id: 'inc_crit', name: 'Increased Critical Strikes', th: 'เพิ่มโอกาสคริ', gem: 'b', excl: ['Aura'],
  desc: 'โอกาสคริติคอล +2% (base) และ +100% increased',
  apply(s) { s.crit += 0.02; s.critInc += 1.0; },
});
defSupport({
  id: 'inc_crit_dmg', name: 'Increased Critical Damage', th: 'เพิ่มดาเมจคริ', gem: 'b', excl: ['Aura'],
  desc: 'ตัวคูณคริติคอล +80%',
  apply(s) { s.critMulti += 0.8; },
});

// ---- Duration / DoT ----
defSupport({
  id: 'inc_duration', name: 'Increased Duration', th: 'เพิ่มระยะเวลา', gem: 'r', req: ['Duration'],
  desc: 'ระยะเวลาสกิล +50%',
  apply(s) { s.durInc += 0.5; },
});
defSupport({
  id: 'burning_damage', name: 'Burning Damage', th: 'ดาเมจเผาไหม้', gem: 'r', req: ['Fire'],
  desc: 'ดาเมจเผาไหม้ (Ignite / Burning) 70% more · โอกาส Ignite +10%',
  apply(s) { s.burnMore *= 1.7; s.ignite += 0.1; },
});
defSupport({
  id: 'chance_to_bleed', name: 'Chance to Bleed', th: 'เลือดไหล', gem: 'r', req: ['Attack'],
  desc: 'โอกาส Bleed +30% (Bleed: ดาเมจกายภาพต่อเนื่อง 70% ของ Hit ต่อวินาที นาน 4 วิ) · ดาเมจ Bleed 20% more',
  apply(s) { s.bleed += 0.3; s.bleedMore *= 1.2; },
});
defSupport({
  id: 'crimson_bleed', name: 'Crimson Bleed', th: 'เลือดแดงฉาน', gem: 'r', req: ['Physical'],
  desc: 'ดาเมจ Bleed 35% more · ศัตรูที่ Bleed ตายแล้วแตกเป็นเลือด ทำดาเมจกายภาพรอบตัว 50% ของ Bleed ที่เหลือ',
  apply(s) { s.bleedMore *= 1.35; s.bloodBurst = true; },
});
defSupport({
  id: 'onslaught', name: 'Onslaught', th: 'บุกตะลุย', gem: 'g',
  desc: 'ฆ่าศัตรูด้วยสกิลนี้ได้ Onslaught 4 วิ: ทุกสกิลร่าย/โจมตีเร็วขึ้น 20% · เคลื่อนที่เร็วขึ้น 15% · ดาเมจ 8% less',
  apply(s) { s.onslaught = true; s.more *= 0.92; },
});
defSupport({
  id: 'melee_splash', name: 'Melee Splash', th: 'ฟันกระจาย', gem: 'r', req: ['Strike'],
  desc: 'Strike โดนศัตรูรอบเป้าหมาย (รัศมี 90 ขยายตามพื้นที่) ด้วยดาเมจ 60% · ดาเมจ 10% less',
  apply(s) { s.splash = 90; s.more *= 0.9; },
});
defSupport({
  id: 'mirage_archer', name: 'Mirage Archer', th: 'นักธนูมายา', gem: 'g', req: ['Bow'], conflicts: ['ballista_totem'],
  desc: 'ยิงแล้วเรียกร่างเงาขึ้นข้างหลังคุณ ร่างเงายิงสกิลนี้เองนาน 4 วิ ด้วยดาเมจ 60% (1 ร่างต่อสกิล)',
  apply(s) { s.mirage = true; },
});
defSupport({
  id: 'ballista_totem', name: 'Ballista Totem', th: 'ป้อมธนู', gem: 'g', req: ['Projectile'], excl: ['Spell', 'Melee'], conflicts: ['mirage_archer'], addTags: ['Totem'],
  desc: 'คุณไม่ยิงสกิลนี้เอง แต่วางป้อมยิงอัตโนมัติ สูงสุด 2 ป้อม อยู่ได้ 8 วิ (วิ่งห่างแล้ววางใหม่ตามคุณ) · ดาเมจ 30% less',
  apply(s) { s.totem = true; s.totemMax = 2; s.totemDur = 8; s.more *= 0.7; },
});
defSupport({
  id: 'swift_affliction', name: 'Swift Affliction', th: 'ทรมานรวดเร็ว', gem: 'g', req: ['DoT', 'Fire', 'Chaos'],
  desc: 'ดาเมจต่อเนื่อง (DoT ทุกชนิด) 45% more · ระยะเวลา 20% less',
  apply(s) { s.dotMore *= 1.45; s.durMore *= 0.8; },
});
defSupport({
  id: 'hypothermia', name: 'Hypothermia', th: 'ภาวะเยือกแข็ง', gem: 'g', req: ['Cold'],
  desc: 'ผล Chill แรงขึ้น 30% · ดาเมจใส่ศัตรูที่ติด Chill 30% more',
  apply(s) { s.chillEff += 0.3; s.vsChilled *= 1.3; },
});
defSupport({
  id: 'void_manipulation', name: 'Void Manipulation', th: 'ควบคุมความว่างเปล่า', gem: 'b', req: ['Chaos'],
  desc: 'ดาเมจเคออส 40% more · โอกาส Poison +20%',
  apply(s) { s.moreChaos *= 1.4; s.poison += 0.2; },
});

// ---- Utility ----
defSupport({
  id: 'life_leech', name: 'Life Leech', th: 'ดูดเลือด', gem: 'r', excl: ['Aura'],
  desc: 'ดูดชีวิต 2% ของดาเมจที่ทำ (จำกัด 8% ชีวิตสูงสุด/วิ)',
  apply(s) { s.leech += 0.02; },
});
defSupport({
  id: 'culling_strike', name: 'Culling Strike', th: 'ประหาร', gem: 'g', excl: ['Aura'],
  desc: 'ฆ่าศัตรูทันทีเมื่อเลือดต่ำกว่า 10%',
  apply(s) { s.cull = Math.max(s.cull, 0.1); },
});
defSupport({
  id: 'knockback', name: 'Knockback', th: 'กระแทก', gem: 'g', excl: ['Aura'],
  desc: 'ผลักศัตรูถอยหลังเมื่อโดนโจมตี · ดาเมจ 5% more',
  apply(s) { s.knock += 90; s.more *= 1.05; },
});
defSupport({
  id: 'minion_damage', name: 'Minion Damage', th: 'ดาเมจมินเนียน', gem: 'r', req: ['Minion'],
  desc: 'ดาเมจมินเนียน 60% more',
  apply(s) { s.more *= 1.6; },
});
defSupport({
  id: 'minion_speed', name: 'Minion Speed', th: 'ความเร็วมินเนียน', gem: 'g', req: ['Minion'],
  desc: 'มินเนียนเคลื่อนที่และโจมตีเร็วขึ้น 40%',
  apply(s) { s.minionSpeed += 0.4; },
});

// ---- expansion: ailments, curses, penetration, mechanics ----
defSupport({
  id: 'elemental_prolif', name: 'Elemental Proliferation', th: 'แพร่กระจายธาตุ', gem: 'b', req: ['Fire', 'Cold', 'Lightning'],
  desc: 'Ignite / Chill / Shock ที่ทำให้ศัตรู จะแพร่ไปยังศัตรูรอบๆ (รัศมี 90) · ดาเมจ 10% less',
  apply(s) { s.prolif = 90; s.more *= 0.9; },
});
defSupport({
  id: 'curse_ele', name: 'Hextouch: Elemental Weakness', th: 'คำสาปธาตุอ่อนแอ', gem: 'b', excl: ['Aura', 'Herald'],
  conflicts: ['curse_vuln', 'curse_despair'],
  desc: 'Hit สาปศัตรู 4 วิ: ต้านทานธาตุ -25% (รับดาเมจธาตุมากขึ้น)',
  apply(s) { s.curse = 'ele'; },
});
defSupport({
  id: 'curse_vuln', name: 'Hextouch: Vulnerability', th: 'คำสาปเปราะบาง', gem: 'r', excl: ['Aura', 'Herald'],
  conflicts: ['curse_ele', 'curse_despair'],
  desc: 'Hit สาปศัตรู 4 วิ: รับดาเมจกายภาพ 25% more และ DoT 15% more',
  apply(s) { s.curse = 'vuln'; },
});
defSupport({
  id: 'curse_despair', name: 'Hextouch: Despair', th: 'คำสาปสิ้นหวัง', gem: 'b', excl: ['Aura', 'Herald'],
  conflicts: ['curse_ele', 'curse_vuln'],
  desc: 'Hit สาปศัตรู 4 วิ: รับดาเมจเคออส 25% more และ DoT 15% more',
  apply(s) { s.curse = 'despair'; },
});
defSupport({
  id: 'fire_pen', name: 'Fire Penetration', th: 'เจาะไฟ', gem: 'r', req: ['Fire'],
  desc: 'ดาเมจไฟเจาะต้านทาน 30% (ทะลุ mod ต้านธาตุ/Warded) · ดาเมจ 10% more',
  apply(s) { s.pen.fire += 0.3; s.more *= 1.1; },
});
defSupport({
  id: 'cold_pen', name: 'Cold Penetration', th: 'เจาะน้ำแข็ง', gem: 'b', req: ['Cold'],
  desc: 'ดาเมจน้ำแข็งเจาะต้านทาน 30% · ดาเมจ 10% more',
  apply(s) { s.pen.cold += 0.3; s.more *= 1.1; },
});
defSupport({
  id: 'light_pen', name: 'Lightning Penetration', th: 'เจาะสายฟ้า', gem: 'b', req: ['Lightning'],
  desc: 'ดาเมจสายฟ้าเจาะต้านทาน 30% · ดาเมจ 10% more',
  apply(s) { s.pen.lightning += 0.3; s.more *= 1.1; },
});
defSupport({
  id: 'returning', name: 'Returning Projectiles', th: 'กระสุนย้อนกลับ', gem: 'g', req: ['Projectile'],
  desc: 'กระสุนบินกลับมาหาผู้เล่นเมื่อสุดระยะ และโดนศัตรูซ้ำได้อีกรอบ · ดาเมจ 10% less',
  apply(s) { s.returning = true; s.more *= 0.9; },
});
defSupport({
  id: 'ruthless', name: 'Ruthless', th: 'ไร้ปรานี', gem: 'r', req: ['Attack'],
  desc: 'ทุกการโจมตีครั้งที่ 3 เป็น Ruthless Blow: ดาเมจ 100% more',
  apply(s) { s.ruthless = true; },
});
defSupport({
  id: 'brutality', name: 'Brutality', th: 'ความป่าเถื่อน', gem: 'r', req: ['Physical'],
  desc: 'ดาเมจกายภาพ 50% more · ไม่ทำดาเมจธาตุและเคออสเลย (ระวังใช้กับ Avatar of Fire)',
  apply(s) { s.morePhys *= 1.5; s.brutality = true; },
});
defSupport({
  id: 'deadly_ailments', name: 'Deadly Ailments', th: 'สภาวะมรณะ', gem: 'g', req: ['Fire', 'Chaos', 'DoT'],
  desc: 'ดาเมจ Ignite, Poison และ Bleed 60% more · ดาเมจ Hit 25% less',
  apply(s) { s.ailMore *= 1.6; s.hitMul *= 0.75; },
});
defSupport({
  id: 'infused_channelling', name: 'Infused Channelling', th: 'ส่งพลังต่อเนื่อง', gem: 'b', req: ['Channelling'],
  desc: 'ดาเมจ 35% more · รับดาเมจ 10% less ขณะลำแสงทำงาน',
  apply(s) { s.more *= 1.35; s.channelGuard = true; },
});
defSupport({
  id: 'spell_cascade', name: 'Spell Cascade', th: 'เวทน้ำตก', gem: 'b', req: ['AoE'], excl: ['Aura', 'Orbit', 'Minion', 'Brand', 'Herald', 'Projectile', 'Channelling'],
  desc: 'สกิลวงกว้าง (Nova / Slam / Firestorm) เกิดเพิ่มอีก 2 จุดรอบๆ · ดาเมจ 25% less',
  apply(s) { s.cascade = 2; s.more *= 0.75; },
});
defSupport({
  id: 'multistrike', name: 'Multistrike', th: 'ฟันหลายครั้ง', gem: 'r', req: ['Melee'],
  desc: 'โจมตีซ้ำอีก 2 ครั้งติดกัน · ดาเมจ 25% less',
  apply(s) { s.echo += 2; s.more *= 0.75; },
});

// ---- expansion 2 ----
defSupport({
  id: 'fortify', name: 'Fortify', th: 'ป้อมปราการ', gem: 'r', req: ['Melee'],
  desc: 'Hit ระยะประชิดให้ Fortify 4 วิ: รับดาเมจ 20% less · ดาเมจ 10% more',
  apply(s) { s.fortify = true; s.more *= 1.1; },
});
defSupport({
  id: 'close_combat', name: 'Close Combat', th: 'ประชิดตัว', gem: 'g', req: ['Melee', 'Attack'],
  desc: 'ดาเมจ 35% more กับศัตรูในระยะ 160 รอบตัว',
  apply(s) { s.closeCombat = true; },
});
defSupport({
  id: 'impale_sup', name: 'Impale', th: 'เสียบทะลุ', gem: 'r', req: ['Physical'], excl: ['Aura'],
  desc: 'Hit กายภาพ 40% Impale: ดาเมจกายภาพซ้ำอีก 60% หลังจากนั้นครู่หนึ่ง',
  apply(s) { s.impale = 0.4; },
});
defSupport({
  id: 'trinity', name: 'Trinity', th: 'ตรีเอกธาตุ', gem: 'b', req: ['Fire', 'Cold', 'Lightning'],
  desc: 'ดาเมจธาตุ 15% more · ถ้าสกิลมีธาตุตั้งแต่ 2 ชนิดขึ้นไป เป็น 35% more (ใช้กับ Added Damage)',
  apply(s) { s.trinity = true; },
});
defSupport({
  id: 'arcane_surge', name: 'Arcane Surge', th: 'คลื่นอาคม', gem: 'b', req: ['Spell'], excl: ['Aura', 'Herald'],
  desc: 'ดาเมจ Spell 20% more · ร่ายเร็วขึ้น 10%',
  apply(s) { s.more *= 1.2; s.speedInc += 0.1; },
});
defSupport({
  id: 'vicious_projectiles', name: 'Vicious Projectiles', th: 'กระสุนโหด', gem: 'g', req: ['Projectile'],
  desc: 'ดาเมจกายภาพ 35% more · ดาเมจ DoT 20% more · กระสุนช้าลง 10%',
  apply(s) { s.morePhys *= 1.35; s.dotMore *= 1.2; s.projSpeedInc -= 0.1; },
});
defSupport({
  id: 'unleash', name: 'Unleash', th: 'ปลดปล่อย', gem: 'b', req: ['Spell'], excl: ['Aura', 'Orbit', 'Minion', 'Herald', 'Channelling', 'Brand'],
  desc: 'ร่ายซ้ำ +1 ครั้ง · คูลดาวน์นานขึ้น 30% · ดาเมจ 10% less',
  apply(s) { s.echo += 1; s.cd *= 1.3; s.more *= 0.9; },
});
defSupport({
  id: 'barrage', name: 'Barrage', th: 'ห่ากระสุน', gem: 'g', req: ['Projectile'], excl: ['Melee'],
  desc: '+2 Projectile ยิงเป็นแนวเดียวกัน (กระจุกใส่ศัตรูตัวเดียว) · ดาเมจ 25% less',
  apply(s) { s.proj += 2; s.spread *= 0.2; s.more *= 0.75; },
});
defSupport({
  id: 'pulverise', name: 'Pulverise', th: 'บดขยี้', gem: 'r', req: ['Melee'],
  desc: 'พื้นที่ +30% · ดาเมจ 20% more · ความเร็วโจมตี 10% less',
  apply(s) { s.areaInc += 0.3; s.more *= 1.2; s.speedInc -= 0.1; },
});
defSupport({
  id: 'feeding_frenzy', name: 'Feeding Frenzy', th: 'คลั่งกิน', gem: 'g', req: ['Minion'],
  desc: 'มินเนียนทำดาเมจ 15% more และเร็วขึ้น 20%',
  apply(s) { s.more *= 1.15; s.minionSpeed += 0.2; },
});
defSupport({
  id: 'elemental_army', name: 'Elemental Army', th: 'กองทัพธาตุ', gem: 'b', req: ['Minion'],
  desc: 'มินเนียนทำดาเมจธาตุ 30% more และเจาะต้านทานธาตุ 15%',
  apply(s) { s.moreEle *= 1.3; s.pen.fire += 0.15; s.pen.cold += 0.15; s.pen.lightning += 0.15; },
});
