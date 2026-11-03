'use strict';
// Registration is done after the UI/icon modules exist, before game initialization.
Object.assign(KS_NEED, { precise_technique: ['Attack'], ancestral_bond: ['Totem'], iron_grip: ['Projectile'] });
Object.assign(PASSIVE_TAGS, {
  heart_of_flame: ['Fire'], heart_of_ice: ['Cold'], heart_of_thunder: ['Lightning'], fatal_toxins: ['Chaos'],
  harrier: ['Attack', 'Spell'], lethal_assault: ['Attack'], master_fletcher: ['Bow'], longshot: ['Projectile'],
  spiritual_command: ['Minion'], enduring_bond: ['Minion'], shamanistic_fury: ['Totem'], runesmith: ['Brand'],
});
Object.assign(SUPPORT_ICON, {
  slower_projectiles: ['proj'], less_duration: ['hourglass'], chance_to_poison: ['drop', 'chaos'],
  cold_to_fire: ['tri', 'fire'], physical_to_lightning: ['tri', 'lightning'], elemental_attacks: ['blade', 'fire'],
  spell_totem: ['tower', 'cold'], multiple_totems: ['tower', 'curse'], life_gain_on_hit: ['heart', 'life'],
  ancestral_call: ['echo'], unbound_ailments: ['drop', 'curse'], combustion: ['flame', 'fire'],
});
// Familiar silhouettes plus small identity details stay legible in the 44px HUD.
const EXPANSION_SYMBOLS = {
  cleave: 'sup_blade', heavy_strike: 'sup_blade', glacial_hammer: 'sup_blade', infernal_blow: 'sup_flame',
  sweep: 'sup_return', sunder: 'glacial_cascade', rolling_magma: 'fireball', blazing_salvo: 'sup_proj',
  ice_spear: 'sup_pierce', soulrend: 'sup_drop', incinerate: 'scorching_ray', raise_zombie: 'sup_skull',
};
for (const [id, symbol] of Object.entries(EXPANSION_SYMBOLS)) SYMBOLS[id] = g => {
  SYMBOLS[symbol](g);
  // Distinguish otherwise related silhouettes without relying on colour alone.
  if (id === 'heavy_strike' || id === 'glacial_hammer') { g.fillRect(-12, -15, 24, 6); if (id === 'glacial_hammer') { g.lineWidth = 2; g.beginPath(); g.moveTo(-17, 1); g.lineTo(-9, 9); g.moveTo(-17, 9); g.lineTo(-9, 1); g.stroke(); } }
  if (id === 'soulrend') { g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 17, -1, 2); g.stroke(); }
  if (id === 'rolling_magma') { g.beginPath(); g.arc(-12, 13, 3, 0, TAU); g.fill(); }
};
COMBOS.push(
  { name: 'Ancestral Furnace', parts: ['infernal_blow', 'ancestral_call', 'combustion', 'herald_of_ash'], desc: 'ตีหลายเป้าพร้อมประทับตราเพลิง → ศพปะทุและ Herald ลาม Ignite' },
  { name: 'Frozen Battery', parts: ['ice_spear', 'spell_totem', 'multiple_totems', 'cold_pen'], desc: 'ป้อมเวทยิงหอกน้ำแข็งทะลุฝูง · ใส่ Multiple Totems เพิ่มป้อมได้ทั้งสองลำดับ' },
  { name: 'Undead Legion', parts: ['raise_zombie', 'minion_damage', 'feeding_frenzy', 'inc_duration'], desc: 'ซอมบี้อยู่นาน ใช้ Spiritual Command / Enduring Bond เสริมกองทัพ' },
);
