'use strict';
// ============================================================
//  Item comparison: "what would change if I wore this instead?"
//  Builds the player's numbers with another item in a slot — without
//  touching the real player — and scores the difference so the bag can
//  show ▲ better / ▼ worse / ● about the same.
// ============================================================

// the numbers that matter, for a given set of equipment
function statSnapshot(equip) {
  const P = G.player, m = buildPlayerMods(equip), fx = G.mapFx;
  let life = (P.baseLife + LIFE_PER_LEVEL * (P.level - 1) + m.lifeFlat) * (1 + m.lifeInc) * m.lifeMore;
  let es = m.es * (1 + m.esInc);
  if (m.ks.ci) { es += life * 1.3; life = 1; }
  const pen = resPenalty(G.map.tier), capE = 0.75 + m.maxRes - fx.pMaxRes;
  const res = {
    fire: Math.min(capE, m.resFire - pen), cold: Math.min(capE, m.resCold - pen), lightning: Math.min(capE, m.resLight - pen),
    chaos: m.ks.ci ? 1 : Math.min(0.75 + m.maxResChaos - fx.pMaxRes, m.resChaos - pen),
  };
  // damage index: every skill's average hit (crits included) per second
  const fake = { mods: m, equip, weapon: equip.weapon ? itemProps(equip.weapon) : null };
  let dps = 0;
  for (const inst of P.skills) {
    const s = buildSkillStats(inst, fake);
    if (s.behavior === 'aura') dps += s.auraDps;
    else if (s.behavior !== 'herald') dps += (avgHit(s) / Math.max(0.1, s.cdFinal)) * Math.max(1, s.proj || 1) * (1 + (s.echo || 0));
  }
  return { life, es, armour: m.armour, evasion: m.evasion, block: Math.min(0.5, m.block), res, move: 200 * (1 + m.moveInc) * m.moveMore, dps };
}

const _pct = (a, b) => (a > 0 ? ((b - a) / a) * 100 : b > 0 ? 100 : 0);
const RES_LABEL = { fire: 'ต้านไฟ', cold: 'ต้านน้ำแข็ง', lightning: 'ต้านสายฟ้า', chaos: 'ต้านเคออส' };
// lines: [label, text, good?] · score > 0 means better
function diffSnap(a, b) {
  const lines = [];
  const add = (label, d, txt) => { if (Math.abs(d) >= 0.5) lines.push([label, (d > 0 ? '+' : '') + txt, d > 0]); };
  const dpsP = _pct(a.dps, b.dps), lifeD = b.life - a.life, esD = b.es - a.es;
  add('DPS', dpsP, Math.round(dpsP) + '%');
  add('ชีวิต', lifeD, Math.round(lifeD));
  add('Energy Shield', esD, Math.round(esD));
  add('Armour', b.armour - a.armour, Math.round(b.armour - a.armour));
  add('Evasion', b.evasion - a.evasion, Math.round(b.evasion - a.evasion));
  add('Block', (b.block - a.block) * 100, Math.round((b.block - a.block) * 100) + '%');
  let resSum = 0;
  for (const t of ['fire', 'cold', 'lightning', 'chaos']) {
    const d = (b.res[t] - a.res[t]) * 100;
    resSum += t === 'chaos' ? d * 0.5 : d;
    add(RES_LABEL[t], d, Math.round(d) + '%');
  }
  const moveP = _pct(a.move, b.move);
  add('ความเร็ว', moveP, Math.round(moveP) + '%');
  const pool = Math.max(1, a.life + a.es);
  const score = dpsP + ((lifeD + esD * 0.8) / pool) * 100 * 0.8 + resSum * 0.5
    + ((b.armour - a.armour) / (a.armour + 300)) * 10 + ((b.evasion - a.evasion) / (a.evasion + 300)) * 10 + (b.block - a.block) * 50 + moveP * 0.6;
  return { lines, score, verdict: score > 1.5 ? 'up' : score < -1.5 ? 'down' : 'side' };
}

// compare a bag item with what's worn in its slot (rings: the better of the two)
let _cmpBase = null;
function compareReset() { _cmpBase = null; }
function compareItem(it) {
  const P = G.player;
  if (!P || !it || it.slot === 'flask' || it.slot === 'jewel') return null;
  if (!_cmpBase) _cmpBase = statSnapshot(P.equip);
  let best = null;
  for (const k of it.slot === 'ring' ? ['ring', 'ring2'] : [it.slot]) {
    if (P.equip[k] === it || canEquip(it, k)) continue;
    const eq = Object.assign({}, P.equip, { [k]: it });
    // a two-hander (or a non-bow with a quiver) pushes the off-hand out
    if (k === 'weapon' && P.equip.offhand) {
      const w = BASES[it.base].w, oh = BASES[P.equip.offhand.base];
      if ((oh.quiver && w.type !== 'bow') || (!oh.quiver && w.hands === 2)) eq.offhand = null;
    }
    const d = diffSnap(_cmpBase, statSnapshot(eq));
    if (!best || d.score > best.score) best = Object.assign(d, { key: k, empty: !P.equip[k] });
  }
  return best || { blocked: canEquip(it, it.slot === 'ring' ? 'ring' : it.slot) };
}
const VERDICT = { up: ['▲', 'ดีกว่าที่สวมอยู่', 'v-up'], down: ['▼', 'แย่กว่าที่สวมอยู่', 'v-down'], side: ['●', 'ใกล้เคียงของเดิม', 'v-side'] };
