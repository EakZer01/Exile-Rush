'use strict';
// Build 44. Survivor adaptations of familiar archetypes, not PoE balance data.
const SPECIALIST_SKILLS = [
  { id: 'power_siphon', name: 'Power Siphon', th: 'ดูดพลัง', gem: 'b', icon: '✦', weapons: ['wand'],
    tags: ['Attack', 'Projectile', 'Lightning', 'Critical'], behavior: 'projectile',
    desc: 'ไม้กายสิทธิ์ยิงกระสุนสายฟ้าคริสูง กระโดดต่อ 1 ครั้ง และประหารเป้าที่เหลือชีวิตต่ำกว่า 10%',
    base: { dmg: 38, types: { physical: 0.3, lightning: 0.7 }, cd: 0.9, proj: 1, speed: 700, life: 0.9, size: 6, chain: 1, cull: 0.1, attackCritBonus: 0.035 },
    scale(s, l) { s.proj += Math.floor(l / 8); }, levelNote: 'ทุก 8 เลเวล: กระสุน +1', color: '#ead67e', core: '#fff8d5' },
  { id: 'kinetic_bolt', name: 'Kinetic Bolt', th: 'ศรพลังจิต', gem: 'b', icon: 'ϟ', weapons: ['wand'],
    tags: ['Attack', 'Projectile', 'Physical'], behavior: 'projectile',
    desc: 'ศรพลังจิตกายภาพ แตกแขนงครั้งเดียวเมื่อชนเป้า เหมาะกับเพิ่มกระสุนและแปลงธาตุ',
    base: { dmg: 60, types: { physical: 1 }, cd: 0.85, proj: 1, speed: 590, life: 1.0, size: 6, fork: true },
    scale(s, l) { s.speed *= 1 + 0.01 * (l - 1); }, levelNote: 'ทุกเลเวล: กระสุนเร็วขึ้น', color: '#c4b0ef', core: '#f7eaff' },
  { id: 'cobra_lash', name: 'Cobra Lash', th: 'คมเขี้ยวงู', gem: 'g', icon: '§', weapons: ['dagger'],
    tags: ['Attack', 'Projectile', 'Chaos', 'Physical'], behavior: 'projectile',
    desc: 'ขว้างคมมีดพิษกระโดดผ่านฝูง 3 ครั้ง โอกาส Poison สูง',
    base: { dmg: 29.9, types: { physical: 0.4, chaos: 0.6 }, cd: 0.85, proj: 1, speed: 550, life: 1.2, size: 7, chain: 3, poison: 0.65 },
    scale(s, l) { s.chain += Math.floor(l / 8); }, levelNote: 'ทุก 8 เลเวล: กระโดด +1', color: '#a5dc75', core: '#f1ffd6' },
  { id: 'venom_gyre', name: 'Venom Gyre', th: 'วังวนคมพิษ', gem: 'g', icon: '⟳', weapons: ['dagger'],
    tags: ['Attack', 'Projectile', 'Chaos', 'Physical'], behavior: 'projectile',
    desc: 'ขว้างคมมีดพิษ 2 เล่ม ทะลุเป้าแล้วบินกลับมาหาผู้เล่นได้หนึ่งรอบ โดยไม่สร้างมีดใหม่เมื่อกลับ',
    base: { dmg: 20, types: { physical: 0.5, chaos: 0.5 }, cd: 1.0, proj: 2, speed: 560, life: 0.65, size: 6, spread: 0.25, pierce: 1, poison: 0.45, returning: true },
    scale(s, l) { s.pierce += Math.floor(l / 8); }, levelNote: 'ทุก 8 เลเวล: ทะลุ +1', color: '#88ddaf', core: '#e1ffed' },
  { id: 'wintertide_brand', name: 'Wintertide Brand', th: 'ตราเหมันต์', gem: 'b', icon: '❄',
    tags: ['Spell', 'Brand', 'Cold', 'AoE', 'DoT', 'Duration'], behavior: 'brand',
    desc: 'ตราเย็นทำดาเมจต่อเนื่องรอบเป้าและหน่วงการเดิน ตราหนึ่งดวงมีรัศมี 70 · ไม่ Hit ไม่คริ และไม่สร้าง Ailment',
    base: { dmg: 10, types: { cold: 1 }, cd: 1.5, duration: 5, maxCount: 2, area: 70, range: 420, hitCd: 0.35, brand: 'dot' },
    scale(s, l) { s.area *= 1 + 0.012 * (l - 1); }, levelNote: 'ทุกเลเวล: พื้นที่ตรากว้างขึ้น', color: '#9bdaf4', core: '#eaffff' },
  { id: 'lightning_tendrils', name: 'Lightning Tendrils', th: 'สายฟ้าเลื้อย', gem: 'b', icon: 'ϟ', weapons: CASTER_WEAPONS,
    tags: ['Spell', 'Channelling', 'Lightning', 'AoE'], behavior: 'beam',
    desc: 'ปล่อยสายฟ้าระยะสั้นแต่กว้าง ทุกการกระตุ้นครั้งที่ 4 แรงขึ้นเป็นสองเท่า',
    base: { dmg: 6, types: { lightning: 1 }, cd: 0.24, range: 235, size: 38, shock: 0.3, strongPulse: 4 },
    scale(s, l) { s.range *= 1 + 0.012 * (l - 1); }, levelNote: 'ทุกเลเวล: สายฟ้าไกลขึ้น', color: '#b2c7ff', core: '#fff9c5' },
  { id: 'skeletal_mages', name: 'Summon Skeletal Mages', th: 'อัญเชิญจอมเวทกระดูก', gem: 'b', icon: '☠',
    tags: ['Spell', 'Minion', 'Projectile', 'Cold', 'Duration'], behavior: 'minion',
    desc: 'อัญเชิญจอมเวทกระดูกยิงกระสุนน้ำแข็งจากระยะไกล มินเนียนไม่มีเลือดตามระบบเดิม ไม่ต้องใช้ศพ',
    base: { dmg: 26, types: { cold: 1 }, cd: 1.6, maxCount: 3, duration: 12, speed: 155, hitCd: 0.9, size: 6, minionSprite: 'skeleton', rangedMinion: true, rangedSpeed: 470, proj: 1, life: 1.1 },
    scale(s, l) { s.maxCount += Math.floor(l / 10); }, levelNote: 'Lv 10 / 20: มินเนียนสูงสุด +1', color: '#accbf5', core: '#efffff' },
];
for (const d of SPECIALIST_SKILLS) defSkill(d);

// Both dedicated choices and their tradeoffs are consumed by the runtime.
const SPECIALIST_SUPPORTS = [
  { id: 'swiftbrand', name: 'Swiftbrand', th: 'ตรารวดเร็ว', gem: 'b', req: ['Brand'], conflicts: ['brand_persistence'],
    desc: 'ตราทำงานถี่ขึ้น 45% · อายุของตรา 35% less', apply(s) { s.brandRate = (s.brandRate || 1) * 1.45; s.durMore *= 0.65; } },
  { id: 'brand_persistence', name: 'Brand Persistence', th: 'ตรายั่งยืน', gem: 'b', req: ['Brand'], conflicts: ['swiftbrand'],
    desc: 'ตราอยู่นานขึ้น 60% · ช่วงห่างการทำงานนานขึ้น 15% (Support ดัดแปลง)', apply(s) { s.durInc += 0.6; s.brandRate = (s.brandRate || 1) / 1.15; } },
  { id: 'brand_relay', name: 'Brand Relay', th: 'ถ่ายทอดตรา', gem: 'b', req: ['Brand'],
    desc: 'เมื่อเป้าตาย ตราย้ายไปหาเป้าใหม่ได้ไกลขึ้น 80% และกระตุ้นทันที · ดาเมจ 10% less', apply(s) { s.brandRelay = true; s.more *= 0.9; } },
  { id: 'herald_amplification', name: 'Herald Amplification', th: 'ขยายพลังผู้ประกาศ', gem: 'b', req: ['Herald'],
    desc: 'Herald ทำดาเมจ 25% more · พื้นที่ระเบิด Ice/Ash หรือระยะเล็ง Thunder กว้างขึ้น 25%', apply(s) { s.more *= 1.25; s.area *= 1.25; s.range *= 1.25; } },
  { id: 'herald_echo', name: 'Herald Echo', th: 'เสียงสะท้อนผู้ประกาศ', gem: 'b', req: ['Herald'],
    desc: 'Herald กระตุ้นซ้ำอีก 1 ครั้ง ดาเมจของครั้งซ้ำ 45% · ครั้งซ้ำไม่สร้างเสียงสะท้อนต่อ', apply(s) { s.heraldEcho = true; } },
  { id: 'herald_catalyst', name: 'Herald Catalyst', th: 'ผู้ประกาศเร่งปฏิกิริยา', gem: 'g', req: ['Herald'],
    desc: 'Ice/Ash กระตุ้นจากศพใดก็ได้ในระยะ 420 (ยกเว้นศพที่ Herald ฆ่าเอง) · Thunder ผ่าได้ +1 ตัวเมื่อมี Shock · ดาเมจ 25% less', apply(s) { s.heraldAnyKill = true; s.bolts = (s.bolts || 0) + 1; s.more *= 0.75; } },
  { id: 'channel_intensity', name: 'Channel Intensity', th: 'รวมพลังต่อเนื่อง', gem: 'b', req: ['Channelling'], conflicts: ['mobile_channel'],
    desc: 'ยืนนิ่งยิงลำแสงต่อเนื่อง: ดาเมจเพิ่มทีละ 8% สูงสุด 40% more · เดินหรือหยุดยิงจะรีเซ็ต', apply(s) { s.channelIntensity = true; } },
  { id: 'mobile_channel', name: 'Mobile Channel', th: 'ร่ายขณะเคลื่อนที่', gem: 'g', req: ['Channelling'], conflicts: ['channel_intensity'],
    desc: 'หันลำแสงได้ไวขึ้น · ขณะเคลื่อนที่ร่ายเร็วขึ้น 25% · ดาเมจ 10% less', apply(s) { s.mobileChannel = true; s.more *= 0.9; } },
  { id: 'channel_fan', name: 'Channel Fan', th: 'ลำแสงแผ่พัด', gem: 'b', req: ['Channelling'],
    desc: 'ลำแสงกว้างขึ้น 60% · ระยะสั้นลง 20% · ดาเมจ 10% less', apply(s) { s.size *= 1.6; s.range *= 0.8; s.more *= 0.9; } },
];
for (const d of SPECIALIST_SUPPORTS) defSupport(d);

const SPECIALIST_EVOLUTIONS = {
  power_siphon: { req: ['chain', 'inc_crit', 'added_lightning'], desc: 'กระสุน +2 · ประหารเมื่อชีวิตต่ำกว่า 15%', apply(s) { s.proj += 2; s.cull = 0.15; } },
  kinetic_bolt: { req: ['multiple_projectiles', 'physical_to_lightning', 'faster_attacks'], desc: 'กระสุน +2 · ดาเมจ 15% more', apply(s) { s.proj += 2; s.more *= 1.15; } },
  cobra_lash: { req: ['chain', 'chance_to_poison', 'deadly_ailments'], desc: 'กระโดด +3 · โอกาส Poison +25%', apply(s) { s.chain += 3; s.poison += 0.25; } },
  venom_gyre: { req: ['gmp', 'pierce', 'chance_to_poison'], desc: 'กระสุน +2 · ทะลุ +2', apply(s) { s.proj += 2; s.pierce += 2; } },
  wintertide_brand: { req: ['swiftbrand', 'brand_persistence', 'inc_aoe'], desc: 'ตราสูงสุด +1 · ดาเมจต่อเนื่อง 20% more', apply(s) { s.maxCount += 1; s.more *= 1.2; } },
  lightning_tendrils: { req: ['infused_channelling', 'channel_intensity', 'channel_fan'], desc: 'ระยะ +20% · พัลส์แรงทุกครั้งที่ 3', apply(s) { s.range *= 1.2; s.strongPulse = 3; } },
  skeletal_mages: { req: ['minion_damage', 'minion_speed', 'multiple_projectiles'], desc: 'มินเนียนสูงสุด +1 · กระสุน +1', apply(s) { s.maxCount += 1; s.proj += 1; } },
};
for (const d of SPECIALIST_SKILLS) EVOLUTIONS[d.id] = { name: 'Vaal ' + d.name, ...SPECIALIST_EVOLUTIONS[d.id] };

// Known no-op pairs: the same rule is used by cards, insertion and saved sockets.
const NO_HIT_SUPPORTS = new Set(['inc_crit', 'inc_crit_dmg', 'chance_to_bleed', 'crimson_bleed', 'elemental_prolif', 'fire_pen', 'cold_pen', 'light_pen', 'deadly_ailments', 'unbound_ailments', 'combustion', 'life_leech', 'life_gain_on_hit', 'culling_strike', 'knockback', 'curse_ele', 'curse_vuln', 'curse_despair', 'chance_to_poison', 'maim', 'impale_sup', 'hypothermia']);
const FLIGHT_SUPPORTS = new Set(['pierce', 'chain', 'fork', 'faster_projectiles', 'slower_projectiles', 'returning', 'barrage', 'spell_totem', 'ballista_totem']);
function supportUseReason(id, def, tags, enabled = [], mods = G.player && G.player.mods) {
  const noHit = def.behavior === 'aura' || def.base.brand === 'dot';
  if (noHit && NO_HIT_SUPPORTS.has(id)) return 'สกิลนี้ทำดาเมจต่อเนื่องโดยไม่ Hit จึงใช้ผลนี้ไม่ได้';
  const flight = def.behavior === 'projectile' || !!def.base.blades || !!def.base.rangedMinion;
  if (FLIGHT_SUPPORTS.has(id) && !flight) return 'สกิลนี้ไม่มีลูกกระสุนที่ใช้การบิน/ชนแบบนี้';
  if (id === 'spell_cascade' && !['nova', 'ground', 'slam', 'spin'].includes(def.behavior)) return 'สกิลนี้ไม่รองรับจุดร่ายเพิ่มของ Spell Cascade';
  if (['chance_to_bleed', 'crimson_bleed'].includes(id) && (!tags.has('Attack') || !(def.base.types.physical > 0))) return 'Bleed ต้องมี Hit แบบ Attack ที่ทำดาเมจกายภาพ';
  if (id === 'returning' && def.base.returning) return 'สกิลนี้ย้อนกลับอยู่แล้ว เพิ่มรอบย้อนกลับไม่ได้';
  if (id === 'fork' && def.base.fork) return 'สกิลนี้แตกแขนงอยู่แล้ว เพิ่มการแตกซ้ำไม่ได้';
  if (id === 'elemental_army' || id === 'elemental_attacks') {
    if (!['Fire', 'Cold', 'Lightning'].some(t => tags.has(t))) return 'ต้องมีดาเมจธาตุจากสกิลหรือ Added Damage ก่อน';
  }
  if (id === 'vicious_projectiles' && !['Fire', 'Chaos', 'DoT'].some(t => tags.has(t)) && !(def.base.types.physical > 0)) return 'ต้องมีกายภาพหรือดาเมจต่อเนื่องจึงได้ประโยชน์';
  const bleed = tags.has('Attack') && def.base.types.physical > 0 &&
    (def.base.bleed > 0 || (mods && mods.bleedAdd > 0) || enabled.includes('chance_to_bleed') ||
      (gemMastery(def.id) && gemMastery(def.id).alt === 'divergent' && Object.keys(def.base.types)[0] === 'physical'));
  if (id === 'crimson_bleed' && !bleed) return 'ต้องมีโอกาส Bleed จากสกิล, Chance to Bleed หรือโบนัสตัวละครก่อน';
  if (['deadly_ailments', 'unbound_ailments'].includes(id)) {
    const poison = tags.has('Chaos') && (def.base.poison > 0 || (mods && mods.poisonAdd > 0) || enabled.some(s => ['chance_to_poison', 'added_chaos', 'void_manipulation'].includes(s)));
    if (!bleed && !poison && !['Fire', 'Cold', 'Lightning'].some(t => tags.has(t))) return 'ต้องมีอาการผิดปกติจากสกิลหรือ Support ที่ทำงานอยู่ก่อน';
  }
  return '';
}
// Splash supplies genuine area capability to single-target strikes.
SUPPORTS.melee_splash.addTags.push('AoE');
SUPPORTS.chance_to_bleed.addTags.push('DoT');
SUPPORTS.crimson_bleed.all = ['Attack'];
SUPPORTS.pulverise.all = ['AoE'];
