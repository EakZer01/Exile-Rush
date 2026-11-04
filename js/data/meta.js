'use strict';
// ============================================================
//  META-PROGRESSION — persists between runs (localStorage)
//  Ancient Shards are earned at the end of every run and spent at the
//  Altar of Legacy on the Legacy Tree: a passive web where you can
//  only take nodes next to ones you already own, with a point cap so
//  every build has to choose a direction. Six branches radiate from the centre;
//  six outer regions join each neighbouring pair and end in their own keystone. Some classes and skill gems
//  start locked: each unlocks by an achievement, or can be bought.
// ============================================================
const META_KEY = 'exile_meta';
const TREE_POINTS = 40;                                   // max nodes allocated (start node is free)
const TREE_COST = { small: 24, notable: 70, keystone: 140, jewel: 50 };
const TREE_COST_STEP = 5;   // each node already allocated makes the next one dearer
// the first ~10 points fit in one run; all 40 take about 11 runs at ~530 Shards a run
const treeNodeCost = (n, allocated) => TREE_COST[n.kind] + TREE_COST_STEP * allocated;

// ---- node helpers: apply(m) mutates player mods, start(P) runs at run start ----
const tSmall = (desc, apply, start) => ({ kind: 'small', desc, apply, start });
const tNotable = (name, th, desc, apply, start) => ({ kind: 'notable', name, th, desc, apply, start });
const tKey = (name, th, desc, apply) => ({ kind: 'keystone', name, th, desc, apply });

// Each branch: trunk (2 small → notable) splits into two arms (2 small →
// notable) that meet again at the keystone. Bridges link neighbouring
// trunk notables into an inner ring, so there are several routes out.
const TREE_BRANCHES = [
  { id: 'arcane', name: 'Arcane', th: 'สายเวท', color: '#6a8cff', icon: '✧', angle: -90,
    trunk: [tSmall('+5% ดาเมจ Spell', (m) => { m.incSpell += 0.05; }), tSmall('+5% ดาเมจ Spell', (m) => { m.incSpell += 0.05; })],
    hub: tNotable('Arcane Mind', 'จิตอาคม', '+10% ดาเมจ Spell · +8% พื้นที่', (m) => { m.incSpell += 0.1; m.areaInc += 0.08; }),
    armA: [tSmall('+5% ดาเมจธาตุ', (m) => { m.incEle += 0.05; }), tSmall('+5% ดาเมจธาตุ', (m) => { m.incEle += 0.05; })],
    notA: tNotable('Elemental Attunement', 'ประสานธาตุ', '+12% ดาเมจธาตุ · โอกาส Ignite และ Shock +8% ทุกสกิล', (m) => { m.incEle += 0.12; m.igniteAdd += 0.08; m.shockAdd += 0.08; }),
    armB: [tSmall('+3% ความเร็วร่าย/โจมตี', (m) => { m.speedInc += 0.03; }), tSmall('สกิลเริ่มต้นเลเวล +1', null, (P) => { for (const s of P.skills) s.level = Math.min(MAX_GEM_LEVEL, s.level + 1); })],
    notB: tNotable('Arcane Flow', 'กระแสอาคม', '+8% ความเร็วร่าย/โจมตี · +12% ระยะเวลาสกิล', (m) => { m.speedInc += 0.08; m.durInc += 0.12; }),
    key: tKey('Specialist', 'ผู้เชี่ยวชาญ', 'ช่องสกิล -1 (เริ่ม 3 สกิล) · ทุกสกิลทำดาเมจ 40% more', (m) => { m.skillSlots -= 1; m.moreAll *= 1.4; }) },
  { id: 'shadow', name: 'Shadow', th: 'สายเงา', color: '#4fc6c0', icon: '✪', angle: -30,
    trunk: [tSmall('+0.5% โอกาสคริ (base)', (m) => { m.critAdd += 0.005; }), tSmall('+10% ตัวคูณคริ', (m) => { m.critMulti += 0.1; })],
    hub: tNotable('Lethality', 'ความร้ายกาจ', '+1% โอกาสคริ (base) · +20% ตัวคูณคริ', (m) => { m.critAdd += 0.01; m.critMulti += 0.2; }),
    armA: [tSmall('+12% ตัวคูณคริ', (m) => { m.critMulti += 0.12; }), tSmall('+0.5% โอกาสคริ (base)', (m) => { m.critAdd += 0.005; })],
    notA: tNotable("Assassin's Mark", 'เครื่องหมายนักฆ่า', '+1% โอกาสคริ (base) · +30% ตัวคูณคริ', (m) => { m.critAdd += 0.01; m.critMulti += 0.3; }),
    armB: [tSmall('+6% ดาเมจเคออส · +4% DoT', (m) => { m.incChaos += 0.06; m.incDot += 0.04; }), tSmall('+6% ดาเมจเคออส · +4% DoT', (m) => { m.incChaos += 0.06; m.incDot += 0.04; })],
    notB: tNotable('Virulence', 'พิษร้าย', '+15% ดาเมจเคออส · โอกาส Poison +12% ทุกสกิล', (m) => { m.incChaos += 0.15; m.poisonAdd += 0.12; }),
    key: tKey('Glass Cannon', 'ปืนใหญ่แก้ว', 'ทุกสกิลทำดาเมจ 30% more · ชีวิตสูงสุด 25% less', (m) => { m.moreAll *= 1.3; m.lifeMore *= 0.75; }) },
  { id: 'ranger', name: 'Hunt', th: 'สายนักล่า', color: '#5fd16a', icon: '➶', angle: 30,
    trunk: [tSmall('+5% ดาเมจ Projectile', (m) => { m.incProj += 0.05; }), tSmall('+5% ดาเมจ Projectile', (m) => { m.incProj += 0.05; })],
    hub: tNotable('Marksman', 'พลแม่นปืน', '+10% ดาเมจ Projectile · +12% ความเร็วกระสุน', (m) => { m.incProj += 0.1; m.projSpeedInc += 0.12; }),
    armA: [tSmall('+3% ความเร็วเคลื่อนที่', (m) => { m.moveInc += 0.03; }), tSmall('+3% ความเร็วเคลื่อนที่', (m) => { m.moveInc += 0.03; })],
    notA: tNotable('Fleetness', 'ฝีเท้าลม', '+6% ความเร็วเคลื่อนที่ · หลบการโจมตี 6%', (m) => { m.moveInc += 0.06; m.evade += 0.06; }),
    armB: [tSmall('+5% ดาเมจ Projectile', (m) => { m.incProj += 0.05; }), tSmall('+5% ดาเมจ Projectile', (m) => { m.incProj += 0.05; })],
    notB: tNotable('Barrage', 'ห่าธนู', 'Projectile ทะลุ +1 · +10% ดาเมจ Projectile', (m) => { m.pierceAdd += 1; m.incProj += 0.1; }),
    key: tKey('Collector', 'นักสะสม', 'ช่องสกิล +2 (รวมทุกโบนัสสูงสุด 6 สกิล) · ทุกสกิลทำดาเมจ 15% less', (m) => { m.skillSlots += 2; m.moreAll *= 0.85; }) },
  { id: 'warden', name: 'Bastion', th: 'สายป้อมปราการ', color: '#e05a4a', icon: '❤', angle: 90,
    trunk: [tSmall('+5% ชีวิตสูงสุด', (m) => { m.lifeInc += 0.05; }), tSmall('+5% ชีวิตสูงสุด', (m) => { m.lifeInc += 0.05; })],
    hub: tNotable('Vitality', 'พลังชีวิต', '+12% ชีวิตสูงสุด · ฟื้นชีวิต +0.3%/วิ', (m) => { m.lifeInc += 0.12; m.regen += 0.003; }),
    armA: [tSmall('+6% ต้านทานธาตุทั้งหมด · รับดาเมจ 1% less', (m) => { m.resFire += 0.06; m.resCold += 0.06; m.resLight += 0.06; m.dmgTaken *= 0.99; }),
      tSmall('+8% ต้านทานเคออส · รับดาเมจ 1% less', (m) => { m.resChaos += 0.08; m.dmgTaken *= 0.99; })],
    notA: tNotable('Bulwark', 'กำแพงเหล็ก', 'รับดาเมจ 5% less · +1% ต้านทานธาตุสูงสุด · +4% ชีวิตสูงสุด', (m) => { m.dmgTaken *= 0.95; m.maxRes += 0.01; m.lifeInc += 0.04; }),
    armB: [tSmall('ฟลาสก์ได้ชาร์จ +12%', (m) => { m.flaskCharge += 0.12; }), tSmall('ฟลาสก์ฟื้นฟูมากขึ้น 12% · เริ่มรอบด้วยฟลาสก์เต็ม', (m) => { m.flaskEff += 0.12; }, (P) => { for (const f of P.flasks) if (f) f.charges = flaskStats(f).max; })],
    notB: tNotable('Second Wind', 'ลมหายใจที่สอง', 'เมื่อตาย ฟื้นคืนชีพ 1 ครั้งต่อรอบ (ชีวิต 50%)', null, (P) => { P.revives = 1; }),
    key: tKey('Born Ascendant', 'กำเนิดผู้ยิ่งใหญ่', 'เลือก Ascendancy ได้ตั้งแต่เริ่มรอบ (บอสทุกตัวให้โหนดเพิ่ม) · ชีวิตสูงสุด 15% less', (m) => { m.ks.bornAscendant = true; m.lifeMore *= 0.85; }) },
  { id: 'warrior', name: 'Warfare', th: 'สายนักรบ', color: '#e0a050', icon: '⚔', angle: 150,
    trunk: [tSmall('+5% ดาเมจ Attack', (m) => { m.incAttack += 0.05; }), tSmall('+5% ดาเมจ Attack', (m) => { m.incAttack += 0.05; })],
    hub: tNotable("Warrior's Might", 'พลังนักรบ', '+10% ดาเมจ Attack · +8% ดาเมจกายภาพ', (m) => { m.incAttack += 0.1; m.incPhys += 0.08; }),
    armA: [tSmall('+5% พื้นที่', (m) => { m.areaInc += 0.05; }), tSmall('+5% พื้นที่', (m) => { m.areaInc += 0.05; })],
    notA: tNotable('Shockwave', 'คลื่นกระแทก', '+15% พื้นที่ · +8% ดาเมจ AoE', (m) => { m.areaInc += 0.15; m.incAoE += 0.08; }),
    armB: [tSmall('+6% ดาเมจกายภาพ', (m) => { m.incPhys += 0.06; }), tSmall('+6% ดาเมจกายภาพ', (m) => { m.incPhys += 0.06; })],
    notB: tNotable('Brutal Force', 'พลังป่าเถื่อน', '+15% ดาเมจกายภาพ · +5% ความเร็วโจมตี/ร่าย', (m) => { m.incPhys += 0.15; m.speedInc += 0.05; }),
    key: tKey('Gem Savant', 'ปราชญ์แห่งเจม', 'เจมวิวัฒน์ได้ที่ Lv 8 · Vaal ใช้วิญญาณน้อยลง 30% · สกิลที่ยังไม่วิวัฒน์ทำดาเมจ 15% less', (m) => { m.evolveLevelAdd -= 2; m.vaalSoulMul *= 0.7; m.unevolvedMore *= 0.85; }) },
  { id: 'occult', name: 'Occult', th: 'สายไสยเวท', color: '#b56cff', icon: '☠', angle: 210,
    trunk: [tSmall('+6% ดาเมจมินเนียน', (m) => { m.incMinion += 0.06; }), tSmall('+6% ดาเมจมินเนียน', (m) => { m.incMinion += 0.06; })],
    hub: tNotable('Necromancy', 'วิชาปลุกผี', '+15% ดาเมจมินเนียน · มินเนียนเร็วขึ้น 10%', (m) => { m.incMinion += 0.15; m.minionSpeed += 0.1; }),
    armA: [tSmall('+6% ดาเมจ DoT', (m) => { m.incDot += 0.06; }), tSmall('โอกาส Ignite +5% ทุกสกิล', (m) => { m.igniteAdd += 0.05; })],
    notA: tNotable('Kindling', 'เชื้อเพลิง', 'ดาเมจเผาไหม้ 15% more · +10% ดาเมจ DoT', (m) => { m.burnMore *= 1.15; m.incDot += 0.1; }),
    armB: [tSmall('+6% ค่าประสบการณ์', (m) => { m.xpInc += 0.06; }), tSmall('+12% ระยะดูดของ · เริ่มรอบด้วย Chaos Orb +1', (m) => { m.pickupInc += 0.12; }, (P) => { P.currency.chaos += 1; })],
    notB: tNotable('Foresight', 'มองการณ์ไกล', "ตัวเลือกตอนเลเวลอัพ +1 ใบ · เริ่มรอบด้วย Jeweller's Orb 3 ×1", (m) => { m.extraChoices += 1; }, (P) => { P.currency.jeweller3 += 1; }),
    key: tKey('Minion Lord', 'จ้าวแห่งวิญญาณ', 'มินเนียนสูงสุด +1 · มินเนียนทำดาเมจ 30% more · สกิลที่ไม่ใช่มินเนียนทำดาเมจ 20% less', (m) => { m.minionCount += 1; m.moreMinion *= 1.3; m.nonMinionMore *= 0.8; }) },
];

// Outer regions: one between each pair of neighbouring branches (TREE_BRANCHES[i] → [i + 1]).
// Each reaches in from both branches' arm notables (xa from the first, xb from the second),
// meets at a hybrid notable and leads out to a keystone with a real trade-off.
const TREE_OUTER = [
  { id: 'spellblade', name: 'Spellblade', th: 'สายดาบเวท', color: '#8a9cff', icon: '✦',
    xa: tSmall('+6% ดาเมจ Spell · +0.3% โอกาสคริ (base)', (m) => { m.incSpell += 0.06; m.critAdd += 0.003; }),
    xb: tSmall('+10% ตัวคูณคริ · +3% ดาเมจ Spell', (m) => { m.critMulti += 0.1; m.incSpell += 0.03; }),
    not: tNotable('Arcane Assassin', 'นักฆ่าอาคม', '+1% โอกาสคริ (base) · +15% ดาเมจ Spell · +15% ตัวคูณคริ', (m) => { m.critAdd += 0.01; m.incSpell += 0.15; m.critMulti += 0.15; }),
    xk: tSmall('Spell ร่ายเร็วขึ้น 4%', (m) => { m.spellSpeed += 0.04; }),
    key: tKey('Spellweaver', 'ผู้ถักทอเวท', 'Spell ร่ายเร็วขึ้น 20% · ดาเมจ Attack -40%', (m) => { m.spellSpeed += 0.2; m.incAttack -= 0.4; }) },
  { id: 'venom', name: 'Venom Archer', th: 'สายนักธนูพิษ', color: '#52cb95', icon: '☣',
    xa: tSmall('โอกาส Poison +5% ทุกสกิล · +5% ดาเมจ Projectile', (m) => { m.poisonAdd += 0.05; m.incProj += 0.05; }),
    xb: tSmall('+3% ความเร็วเคลื่อนที่ · หลบการโจมตี 2%', (m) => { m.moveInc += 0.03; m.evade += 0.02; }),
    not: tNotable('Toxic Volley', 'ห่าศรพิษ', '+12% ดาเมจ Projectile · +12% ดาเมจเคออส · โอกาส Poison +8% ทุกสกิล', (m) => { m.incProj += 0.12; m.incChaos += 0.12; m.poisonAdd += 0.08; }),
    xk: tSmall('+4% ความเร็วเคลื่อนที่', (m) => { m.moveInc += 0.04; }),
    key: tKey('Wind Dancer', 'นักเต้นสายลม', 'หลบการโจมตี 15% · +10% ความเร็วเคลื่อนที่ · รับดาเมจ 10% more', (m) => { m.evade += 0.15; m.moveInc += 0.1; m.dmgTaken *= 1.1; }) },
  { id: 'trailblazer', name: 'Trailblazer', th: 'สายนักบุกเบิก', color: '#a6b65a', icon: '⛰',
    xa: tSmall('+4% ชีวิตสูงสุด · +2% ความเร็วเคลื่อนที่', (m) => { m.lifeInc += 0.04; m.moveInc += 0.02; }),
    xb: tSmall('ฟลาสก์ได้ชาร์จ +8% · +3% ชีวิตสูงสุด', (m) => { m.flaskCharge += 0.08; m.lifeInc += 0.03; }),
    not: tNotable("Ranger's Endurance", 'ความอึดของพราน', '+8% ชีวิตสูงสุด · +6% ความเร็วเคลื่อนที่ · ฟื้นชีวิต 0.2% ทุกครั้งที่ฆ่า', (m) => { m.lifeInc += 0.08; m.moveInc += 0.06; m.lifeOnKill += 0.002; }),
    xk: tSmall('รับดาเมจ 2% less', (m) => { m.dmgTaken *= 0.98; }),
    key: tKey('Unbreakable', 'ไม่มีวันแตกหัก', 'รับดาเมจ 15% less · ความเร็วเคลื่อนที่ 10% less', (m) => { m.dmgTaken *= 0.85; m.moveMore *= 0.9; }) },
  { id: 'juggernaut', name: 'Juggernaut', th: 'สายยักษ์เหล็ก', color: '#e07d4d', icon: '⛨',
    xa: tSmall('+150 Armour · +3% ชีวิตสูงสุด', (m) => { m.armour += 150; m.lifeInc += 0.03; }),
    xb: tSmall('+6% ดาเมจกายภาพ · +3% ดาเมจ Attack', (m) => { m.incPhys += 0.06; m.incAttack += 0.03; }),
    not: tNotable('Iron Skin', 'หนังเหล็ก', '+300 Armour · +12% ดาเมจกายภาพ · โอกาส Bleed +6% (Attack)', (m) => { m.armour += 300; m.incPhys += 0.12; m.bleedAdd += 0.06; }),
    xk: tSmall('+8% ดาเมจกายภาพ', (m) => { m.incPhys += 0.08; }),
    key: tKey('Heavy Hitter', 'หมัดหนัก', 'ดาเมจกายภาพ 35% more · ความเร็วร่าย/โจมตี -15%', (m) => { m.physMore *= 1.35; m.speedInc -= 0.15; }) },
  { id: 'bonecrusher', name: 'Bonecrusher', th: 'สายทุบกระดูก', color: '#ca8690', icon: '☗',
    xa: tSmall('+5% ดาเมจ Attack · +5% ดาเมจมินเนียน', (m) => { m.incAttack += 0.05; m.incMinion += 0.05; }),
    xb: tSmall('+6% ดาเมจมินเนียน · +4% พื้นที่', (m) => { m.incMinion += 0.06; m.areaInc += 0.04; }),
    not: tNotable('Blood Rite', 'พิธีเลือด', 'ดูดเลือด 1% ของดาเมจทุกสกิล · +10% ดาเมจ Attack · +10% ดาเมจมินเนียน', (m) => { m.leech += 0.01; m.incAttack += 0.1; m.incMinion += 0.1; }),
    xk: tSmall('มินเนียนดูดเลือด 1% ของดาเมจ', (m) => { m.minionLeech += 0.01; }),
    key: tKey('Vampiric Pact', 'สัญญาแวมไพร์', 'ดูดเลือด 2% ของดาเมจทุกสกิล · ฟลาสก์ได้ชาร์จ 50% less', (m) => { m.leech += 0.02; m.flaskGainMore *= 0.5; }) },
  { id: 'sage', name: 'Sage', th: 'สายปราชญ์', color: '#907cff', icon: '❖',
    xa: tSmall('+5% ค่าประสบการณ์ · +4% ดาเมจ DoT', (m) => { m.xpInc += 0.05; m.incDot += 0.04; }),
    xb: tSmall('+5% ดาเมจ Spell · +5% ระยะเวลาสกิล', (m) => { m.incSpell += 0.05; m.durInc += 0.05; }),
    not: tNotable('Soul Siphon', 'ดูดวิญญาณ', '+12% ดาเมจ DoT · +10% ดาเมจ Spell · ฟื้นชีวิต 0.2% ทุกครั้งที่ฆ่า', (m) => { m.incDot += 0.12; m.incSpell += 0.1; m.lifeOnKill += 0.002; }),
    xk: tSmall('+6% ค่าประสบการณ์', (m) => { m.xpInc += 0.06; }),
    key: tKey('Scholar', 'ผู้รอบรู้', '+25% ค่าประสบการณ์ · การ์ดเลเวลอัป +1 ใบ · ทุกสกิลทำดาเมจ 10% less', (m) => { m.xpInc += 0.25; m.extraChoices += 1; m.moreAll *= 0.9; }) },
];

// ---- build the graph: ids, positions (SVG units), links ----
const TREE_NODES = {};
const TREE_START = 'origin';
(function buildTree() {
  const add = (id, def, r, angDeg, branch) => {
    const a = (angDeg * Math.PI) / 180;
    TREE_NODES[id] = Object.assign({ id, x: Math.cos(a) * r, y: Math.sin(a) * r, links: [], branch }, def);
    return id;
  };
  const link = (a, b) => { TREE_NODES[a].links.push(b); TREE_NODES[b].links.push(a); };
  add(TREE_START, { kind: 'start', name: "Exile's Origin", th: 'จุดเริ่มต้น', desc: 'จุดเริ่มต้นของ Legacy Tree' }, 0, 0, null);
  for (const B of TREE_BRANCHES) {
    const t = B.angle, p = B.id;
    const t1 = add(p + '_t1', B.trunk[0], 75, t, B), t2 = add(p + '_t2', B.trunk[1], 135, t, B);
    const hub = add(p + '_hub', B.hub, 200, t, B);
    link(TREE_START, t1); link(t1, t2); link(t2, hub);
    for (const [side, arm, not] of [[-1, B.armA, B.notA], [1, B.armB, B.notB]]) {
      const a1 = add(p + (side < 0 ? '_a1' : '_b1'), arm[0], 265, t + side * 11, B);
      const a2 = add(p + (side < 0 ? '_a2' : '_b2'), arm[1], 325, t + side * 13, B);
      const nt = add(p + (side < 0 ? '_na' : '_nb'), not, 390, t + side * 12, B);
      link(hub, a1); link(a1, a2); link(a2, nt);
    }
    add(p + '_key', B.key, 465, t, B);
    add(p + '_jewel', { kind: 'jewel', name: 'Jewel Socket', th: 'ช่องใส่ Jewel', desc: 'ใส่ Jewel จาก Stash เพื่อรับ mod ของ Jewel ในทุกรอบ' }, 292, t, B);
    link(hub, p + '_jewel');
    link(p + '_na', p + '_key'); link(p + '_nb', p + '_key');
  }
  // inner ring bridges between neighbouring hubs
  TREE_BRANCHES.forEach((B, i) => {
    const C = TREE_BRANCHES[(i + 1) % TREE_BRANCHES.length];
    const id = add('bridge_' + B.id, tSmall('+4% ดาเมจ Spell / Attack / มินเนียน · +3% ชีวิตสูงสุด', (m) => {
      m.incSpell += 0.04; m.incAttack += 0.04; m.incMinion += 0.04; m.lifeInc += 0.03; }), 215, B.angle + 30, null);
    link(B.id + '_hub', id); link(id, C.id + '_hub');
  });
  // outer regions: reached from both neighbouring branches, keystone at the rim
  TREE_OUTER.forEach((O, i) => {
    const B = TREE_BRANCHES[i], C = TREE_BRANCHES[(i + 1) % TREE_BRANCHES.length], t = B.angle;
    const xa = add(O.id + '_xa', O.xa, 430, t + 20, O), xb = add(O.id + '_xb', O.xb, 430, t + 40, O);
    const nt = add(O.id + '_n', O.not, 480, t + 30, O), xk = add(O.id + '_xk', O.xk, 528, t + 30, O);
    add(O.id + '_key', O.key, 580, t + 30, O);
    link(B.id + '_nb', xa); link(xa, nt); link(C.id + '_na', xb); link(xb, nt); link(nt, xk); link(xk, O.id + '_key');
  });
  for (const id in TREE_NODES) { const n = TREE_NODES[id]; n.icon = n.kind === 'start' ? '✦' : n.kind === 'jewel' ? '⬡' : n.branch ? n.branch.icon : '◇'; n.color = n.branch ? n.branch.color : '#c8a860'; }
})();

// r = finished run record, life = lifetime totals (already including r)
const UNLOCKS = [
  { id: 'cls_templar', kind: 'class', ref: 'templar', cost: 80, req: 'โค่นบอสตัวแรก (Infernal Warden)', test: (r) => r.bosses >= 1 },
  { id: 'cls_shadow', kind: 'class', ref: 'shadow', cost: 120, req: 'ฆ่าศัตรู 2,000 ตัวในรอบเดียว', test: (r) => r.kills >= 2000 },
  { id: 'cls_duelist', kind: 'class', ref: 'duelist', cost: 120, req: 'ถึงเลเวล 25 ในรอบเดียว', test: (r) => r.level >= 25 },
  { id: 'cls_scion', kind: 'class', ref: 'scion', cost: 400, req: 'ชนะ 1 ครั้ง (โค่น The Void Sovereign)', test: (r) => r.win },
  { id: 'gem_caustic_arrow', kind: 'gem', ref: 'caustic_arrow', cost: 60, req: 'ฆ่าศัตรูสะสม 5,000 ตัว (ทุกรอบรวมกัน)', test: (r, life) => life.kills >= 5000 },
  { id: 'gem_raging_spirit', kind: 'gem', ref: 'raging_spirit', cost: 100, req: 'ถึงเลเวล 32 ในรอบเดียว', test: (r) => r.level >= 32 },
  { id: 'gem_firestorm', kind: 'gem', ref: 'firestorm', cost: 100, req: 'โค่นบอส 2 ตัวในรอบเดียว', test: (r) => r.bosses >= 2 },
  { id: 'gem_righteous_fire', kind: 'gem', ref: 'righteous_fire', cost: 150, req: 'รอดชีวิตถึง 11:15 (บอสตัวที่ 3)', test: (r) => r.time >= 675 },
];

// Ancient Shards earned by a finished run
function shardReward(r) {
  const parts = [
    ['เวลารอด', Math.floor(Math.min(r.time, RUN_LENGTH) / 15)],
    ['ศัตรูที่ฆ่า', Math.floor(r.kills / 150)],
    ['บอส', r.bosses * 20],
    ['เลเวล', r.level],
  ];
  if (r.salvage) parts.push(['ย่อยไอเทม', r.salvage]);
  if (r.win) parts.push(['ชัยชนะ', 100]);
  if (r.pinnacle) parts.push(['Pinnacle: The Hollow Crown', 250]);
  if (r.endless > 0) parts.push(['Endgame ' + fmtTime(r.endless), Math.floor(r.endless / 60) * 15]);
  if (r.echoes) parts.push(['Echo บอส ×' + r.echoes, r.echoes * 40]);
  return { parts, total: parts.reduce((a, p) => a + p[1], 0) };
}
