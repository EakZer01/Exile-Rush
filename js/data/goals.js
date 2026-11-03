'use strict';
// ============================================================
//  GOALS DATA — the beginner quest chain, Corruption (player-picked
//  difficulty for more rewards) and cosmetics. Runtime: js/goals.js.
// ============================================================

// ---------------- Beginner quests: one at a time, in order ----------------
// test(r, M): r is the finished run's record (null when checked from the menu)
const QUESTS = [
  { id: 'boss1', name: 'ก้าวแรก', desc: 'โค่นบอสตัวแรกของรอบ (3:45)', test: (r) => r && r.bosses >= 1, reward: { shards: 40 } },
  { id: 'asc', name: 'คลาสย่อย', desc: 'เลือก Ascendancy หลังโค่นบอสตัวแรก', test: (r) => r && r.asc, reward: { shards: 40 } },
  { id: 'tree', name: 'มรดกแรก', desc: 'จัดสรรโหนดแรกบน Legacy Tree ที่ Altar of Legacy', test: (r, M) => Object.keys(M.alloc).length >= 1, reward: { shards: 30 } },
  { id: 'jeweller', name: 'ช่องที่สาม', desc: "ใช้ Jeweller's Orb เพิ่มช่อง Support ให้สกิล (กด I → ช่อง Support)", test: (r) => r && r.jeweller, reward: { shards: 50 } },
  { id: 'mastery', name: 'เส้นทางของฉัน', desc: 'ลง Passive สายเดียวกันจนปลด Mastery ได้ในรอบเดียว', test: (r) => r && r.masteries >= 1, reward: { shards: 60 } },
  { id: 'win1', name: 'ผู้รอดชีวิต', desc: 'ชนะแผนที่ — โค่นบอสสุดท้ายที่ 15:00', test: (r) => r && r.win, reward: { shards: 100, scarabs: 2 } },
  { id: 'scarab', name: 'ด้วงนำทาง', desc: 'ใส่ Scarab ที่ Map Device แล้วเปิดแผนที่', test: (r) => r && r.scarabs >= 1, reward: { shards: 40, scarabs: ['vault'] } },
  { id: 'win3', name: 'ลึกกว่าเดิม', desc: 'ชนะแผนที่ Tier 3 ขึ้นไป', test: (r) => r && r.win && r.tier >= 3, reward: { shards: 120 } },
  { id: 'altq', name: 'เจมแปรสภาพ', desc: 'เลือก Alternate Quality ให้เจม (Gem Mastery Lv 3 ที่ Altar)', test: (r, M) => Object.values(M.gems).some((g) => g.alt), reward: { shards: 80 } },
  { id: 'corrupt', name: 'ท้าทายความมืด', desc: 'ชนะแผนที่ด้วย Corruption 3 แต้มขึ้นไป', test: (r) => r && r.win && r.heat >= 3, reward: { shards: 150, scarabs: 2, cosmetic: 'title_initiate' } },
];

// ---------------- Corruption: stack hardships for better rewards ----------------
// each rank adds `pts` heat; fx(f, map fx, n) applies n ranks
const CORRUPTION = {
  bloated:  { name: 'Bloated', th: 'มอนสเตอร์ชีวิต +20%', max: 3, pts: 1, fx(f, m, n) { m.monHp *= 1 + 0.2 * n; } },
  savage:   { name: 'Savagery', th: 'มอนสเตอร์ทำดาเมจ +12%', max: 3, pts: 1, fx(f, m, n) { m.monDmg *= 1 + 0.12 * n; } },
  haste:    { name: 'Haste', th: 'มอนสเตอร์เคลื่อนที่เร็ว +10%', max: 2, pts: 1, fx(f, m, n) { m.monSpeed *= 1 + 0.1 * n; } },
  horde:    { name: 'Horde', th: 'มอนสเตอร์เกิดมากขึ้น +15%', max: 3, pts: 1, fx(f, m, n) { m.spawn *= 1 + 0.15 * n; } },
  elites:   { name: 'Elites', th: 'มอนสเตอร์ Rare บ่อยขึ้น +40%', max: 2, pts: 1, fx(f, m, n) { m.rareRate *= 1 + 0.4 * n; } },
  thirst:   { name: 'Thirst', th: 'ฟลาสก์ได้ชาร์จ -25%', max: 2, pts: 1, fx(f, m, n) { m.pFlask *= 1 - 0.25 * n; } },
  blight:   { name: 'Blight', th: 'ฟื้นฟูและดูดชีวิต -30%', max: 2, pts: 1, fx(f, m, n) { m.pRegen *= 1 - 0.3 * n; } },
  tyrant:   { name: 'Tyrant', th: 'บอสชีวิต +30% และดาเมจ +10%', max: 3, pts: 2, fx(f, m, n) { m.bossHp *= 1 + 0.3 * n; m.bossDmg *= 1 + 0.1 * n; } },
  exposure: { name: 'Exposure', th: 'ค่าต้านทานสูงสุด -5%', max: 2, pts: 2, fx(f, m, n) { m.pMaxRes += 0.05 * n; } },
  restraint: { name: 'Restraint', th: 'การ์ดเลเวลอัป / หีบบอส ให้เลือกน้อยลง 1 ใบ', max: 1, pts: 3, fx(f, m, n) { m.pChoicesLess = (m.pChoicesLess || 0) + n; } },
};
// rewards per heat point, applied to the run's atlas effects
const HEAT_REWARD = { shardMul: 0.06, uniqueMul: 0.04, itemQty: 0.03, vaultLuck: 0.02 };
const HEAT_VAULT_CARD_AT = [10, 20];          // an extra Vault card at these totals

// ---------------- Cosmetics: looks only, never power ----------------
// test(M) decides whether it is unlocked; nothing else is stored
const COSMETICS = {
  aura_ember:   { kind: 'aura', name: 'ออร่าเถ้าถ่าน', color: '#ff7a2a', src: 'ชนะ Corruption 5', test: (M) => heatBest(M) >= 5 },
  aura_frost:   { kind: 'aura', name: 'ออร่าเหมันต์', color: '#8ad8ff', src: 'Challenge: ผู้พิชิต (ชนะ T6)', test: (M) => M.chal.win6 },
  aura_void:    { kind: 'aura', name: 'ออร่าความว่างเปล่า', color: '#b060ff', src: 'ได้ Voidstone อย่างน้อย 1 อัน', test: (M) => Object.keys(M.voids).length >= 1 },
  aura_gold:    { kind: 'aura', name: 'ออร่าราชัน', color: '#ffd84a', src: 'ชนะ Corruption 15', test: (M) => heatBest(M) >= 15 },
  aura_blood:   { kind: 'aura', name: 'ออร่าโลหิต', color: '#e02a2a', src: 'ชนะใน Hardcore', test: (M) => M.chal.hc },
  trail_ember:  { kind: 'trail', name: 'รอยเท้าประกายไฟ', part: 'ember', src: 'ทำภารกิจผู้เริ่มต้นครบ', test: (M) => questsDone(M) },
  trail_frost:  { kind: 'trail', name: 'รอยเท้าเกล็ดน้ำแข็ง', part: 'shard', src: 'Challenge ครบ 8 ข้อ', test: (M) => Object.keys(M.chal).length >= 8 },
  trail_wisp:   { kind: 'trail', name: 'รอยเท้าวิญญาณ', part: 'wisp', src: 'ชนะ Corruption 10', test: (M) => heatBest(M) >= 10 },
  trail_gold:   { kind: 'trail', name: 'รอยเท้าทองคำ', part: 'gold', src: 'ค้นพบ Unique 20 ชิ้น', test: (M) => Object.keys(M.found).length >= 20 },
  trail_blood:  { kind: 'trail', name: 'รอยเท้าเลือด', part: 'blood', color: '#c02020', src: 'ชนะ Corruption 20', test: (M) => heatBest(M) >= 20 },
  title_initiate:  { kind: 'title', name: 'ผู้ถูกกัดกร่อน', src: 'ภารกิจ: ท้าทายความมืด', test: (M) => !!M.quests.corrupt },
  title_survivor:  { kind: 'title', name: 'ผู้รอดชีวิต', src: 'ชนะแผนที่ครั้งแรก', test: (M) => M.life.wins >= 1 },
  title_conqueror: { kind: 'title', name: 'ผู้พิชิตแผนที่', src: 'ชนะแผนที่ Tier 10', test: (M) => M.chal.win10 },
  title_regicide:  { kind: 'title', name: 'ผู้โค่นราชันกลวง', src: 'โค่น The Hollow Crown', test: (M) => M.chal.crown },
  title_collector: { kind: 'title', name: 'นักสะสม', src: 'ค้นพบ Unique 30 ชิ้น', test: (M) => Object.keys(M.found).length >= 30 },
  title_corrupted: { kind: 'title', name: 'ผู้แบกความมืด', src: 'ชนะ Corruption 25', test: (M) => heatBest(M) >= 25 },
  aura_echo:       { kind: 'aura', name: 'ออร่าเสียงก้อง', color: '#7affd0', src: 'โค่น Echo บอส 5 ตัวใน Endgame เดียว', test: (M) => (M.echoBest || 0) >= 5 },
  title_voidwalker: { kind: 'title', name: 'ผู้ข้ามห้วง', src: 'โค่น Echo บอส 10 ตัวใน Endgame เดียว', test: (M) => (M.echoBest || 0) >= 10 },
  title_voidking:  { kind: 'title', name: 'ราชาห้วงว่าง', src: 'โค่น Echo บอส 20 ตัวใน Endgame เดียว · ✦ ถาวร +10%', test: (M) => (M.echoBest || 0) >= 20 },
  title_legend:    { kind: 'title', name: 'ตำนานแห่งดินแดนต้องสาป', src: 'ทำ Challenge ครบทุกข้อ', test: (M) => CHALLENGES.every((c) => M.chal[c.id]) },
};
const COSMETIC_KIND = { aura: 'ออร่า', trail: 'รอยเท้า', title: 'ฉายา' };
