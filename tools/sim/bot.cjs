// Auto-play bot: full 15-minute runs with the real game loop.
// usage: node bot.cjs <jobs.json> <shard> <shards> <out.jsonl>
// job: { cls, skill?, weapon?, mono?, seed, tier? }
const fs = require('node:fs');
const { loadGame } = require('./loader.cjs');
const [jobsFile, shard = 0, shards = 1, out = 'bot.jsonl'] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));

const BOT = `
  const noop = () => {};
  showGameOver = () => { BOT.over = 'dead'; };
  openVictory = () => { BOT.over = 'win'; };
  const WEAPON_BASE = { bow: 'short_bow', staff: 'gnarled_staff', wand: 'driftwood_wand', sceptre: 'driftwood_sceptre',
    sword: 'rusted_sword', axe: 'woodsplitter', dagger: 'glass_shank', mace: 'driftwood_club' };
  var BOT = {};
  const MELEE = new Set(['spin', 'strike', 'cone', 'slam', 'flicker']);
  function mainInst() { const P = G.player; if (BOT.mono || G.time < 60) return P.skills.find((s) => s.id === BOT.main) || P.skills[0]; return P.skills.slice().sort((a, b) => b.dmgDealt - a.dmgDealt)[0]; }
  // ---------- movement: score 16 directions, take the safest that still does the job ----------
  function steer() {
    const P = G.player, inp = G.input;
    const main = mainInst(), s = main && main.st;
    const melee = s && (MELEE.has(s.behavior) || (s.behavior === 'orbit') || s.behavior === 'aura');
    const want = melee ? Math.max(30, (s.radius || 60) * 0.55) : 170;
    const lifeF = P.life / P.maxLife;
    const near = [];
    let nearest = null, nd = 1e9;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - P.x, e.y - P.y);
      if (d < 420) near.push([e, d]);
      if (d < nd) { nd = d; nearest = e; }
    }
    let goal = null;
    // pickups first when calm, else the fight
    if (lifeF > 0.45) {
      let best = null, bd = 380;
      for (const o of G.orbs) { const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < bd) { bd = d; best = o; } }
      for (const o of G.pickups) { const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < bd + 80) { bd = d; best = o; } }
      for (const o of G.items) { const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < bd) { bd = d; best = o; } }
      if (best && near.filter(([, d]) => d < 120).length < 6) goal = best;
    }
    let bx = 0, by = 0, bs = -1e18;
    const look = 0.35 * P.moveSpeed;
    for (let k = 0; k < 17; k++) {
      const a = (k / 16) * Math.PI * 2, still = k === 16;
      const x = still ? P.x : P.x + Math.cos(a) * look, y = still ? P.y : P.y + Math.sin(a) * look;
      let sc = 0;
      for (const [e, d0] of near) {
        const d = Math.max(4, Math.hypot(e.x - x, e.y - y) - e.r);
        const w = (e.rarity === 2 ? 2 : e.rarity === 1 ? 1.4 : 1) * (e.boss || e.final || e.phases ? 3 : 1);
        if (d < want + 10) sc -= w * 900 / d;
        else sc -= w * 40 / d;
      }
      for (const h of G.hazards) if (inHazard(h, x, y, P.r + 6)) sc -= 4000;
      for (const p of G.epools) if (Math.hypot(p.x - x, p.y - y) < p.r + P.r + 8) sc -= 4000;
      for (const p of G.eproj) { const d = Math.hypot(p.x - x, p.y - y); if (d < 70) sc -= 600 / Math.max(10, d); }
      const edge = ARENA - Math.max(Math.abs(x), Math.abs(y));
      if (edge < 300) sc -= (300 - edge) * 2;
      if (goal) sc -= Math.hypot(goal.x - x, goal.y - y) * 0.6;
      else if (nearest && lifeF > 0.35) { const d = Math.hypot(nearest.x - x, nearest.y - y); if (d > want) sc -= (d - want) * (melee ? 1.2 : 0.4); }
      else sc -= Math.hypot(x, y) * 0.02;   // drift to the middle when nothing is around
      if (sc > bs) { bs = sc; bx = still ? 0 : Math.cos(a); by = still ? 0 : Math.sin(a); }
    }
    inp.joy = { x: bx, y: by };
    // dash out when boxed in
    const close = near.filter(([, d]) => d < 45).length;
    if (P.dashCd <= 0 && (close >= 5 || (lifeF < 0.35 && close >= 2))) inp.dash = true;
    // flasks
    for (let i = 0; i < P.flasks.length; i++) {
      const f = P.flasks[i]; if (!f || f.active > 0) continue;
      const st = flaskStats(f);
      if (st.kind === 'life' ? lifeF < 0.55 : f.charges >= st.use && near.length > 8) inp['flask' + i] = true;
    }
    if (G.bossRef && !G.bossRef.dead) inp.vaal = true;
  }
  // ---------- choices ----------
  function supportTarget(id) {
    const P = G.player;
    const m = mainInst(), order = P.skills.slice().sort((a, b) => (b === m) - (a === m) || b.dmgDealt - a.dmgDealt);
    return order.find((inst) => !supportBlockReason(id, inst)) || null;
  }
  function cardScore(c) {
    const P = G.player, main = mainInst();
    switch (c.type) {
      case 'evolve': return 100;
      case 'mastery': return 90;
      case 'ascclass': case 'ascnode': return 50;
      case 'slot': return BOT.mono ? 5 : 80;
      case 'skill': {
        if (BOT.mono) return -100;
        const d = SKILLS[c.id];
        if (d.behavior === 'herald' && P.skills.length < 2) return 10;
        return P.skills.length < 3 ? 64 : 35;
      }
      case 'level': return c.inst === main ? 66 : 52;
      case 'empower': return c.inst === main ? 70 : 50;
      case 'support': { const t = supportTarget(c.id); return t ? (t === main ? 60 : 45) : -50; }
      case 'awaken': return c.inst === main ? 58 : 45;
      case 'keystone': return 48;
      case 'passive': return 44;
      default: return 1;
    }
  }
  function decide() {
    if (G.state === 'ritual') { closeRitual(); return; }
    if (G.state === 'socket') {
      const t = supportTarget(G.socketCtx.supId);
      if (!t || !applySocket(t)) { socketBack(); skipLevel(); }
      return;
    }
    if (G.state !== 'levelup') return;
    let bi = -1, bs = -1e9;
    G.choices.forEach((c, i) => { const s = cardScore(c) + Math.random() * 12; if (s > bs) { bs = s; bi = i; } });
    if (bs < 0 && G.choiceKind !== 'asc') { skipLevel(); return; }
    const before = G.state;
    chooseCard(bi);
    if (G.state === before && G.state === 'levelup' && G.choices[bi] && G.choices[bi].type !== 'support') skipLevel();
  }
  // ---------- housekeeping: jewellers into the main skill, better gear on ----------
  function housekeep() {
    const P = G.player, keep = G.state; G.state = 'paused';
    const order = ['jeweller6', 'jeweller5', 'jeweller4', 'jeweller3'].filter((k) => JEWELLERS[k]);
    for (const k of order) {
      while (P.currency[k] > 0) {
        const t = [mainInst()].concat(P.skills).find((inst) => !jewellerBlockReason(inst, k));
        if (!t || !useSkillJeweller(t, k)) break;
      }
    }
    G.state = keep;
    const base = statSnapshot(P.equip);
    for (const it of P.backpack.slice()) {
      if (it.slot === 'flask' || it.slot === 'jewel') continue;
      const keys = it.slot === 'ring' ? ['ring', 'ring2'] : [it.slot];
      for (const key of keys) {
        if (canEquip(it, key)) continue;
        const eq = Object.assign({}, P.equip, { [key]: it });
        const d = diffSnap(base, statSnapshot(eq));
        if (d.score > 3) { equipItem(it, key); BOT.equips++; return; }
      }
    }
    // keep the bag from filling up
    if (P.backpack.length > 14) P.backpack.splice(0, P.backpack.length - 10);
  }
  function runBot(job) {
    restoreRandom = () => { Math.random = mulberry32(job.seed * 7919 + 17); };
    restoreRandom();
    BOT = { over: null, main: null, mono: !!job.mono, equips: 0, hp: [] };
    const cls = CLASSES.find((c) => c.id === job.cls);
    const map = job.tier ? Object.assign({}, DEFAULT_MAP, { tier: job.tier, mods: [] }) : null;
    startGame(cls, map);
    const P = G.player;
    if (job.weapon) { P.equip.weapon = makeNormal(WEAPON_BASE[job.weapon]); }
    if (job.skill) { const inst = newSkillInstance(job.skill); inst.level = 1 + gemStartBonus(job.skill); P.skills = [inst]; }
    recomputePlayer(); P.life = P.maxLife;
    BOT.main = P.skills[0].id;
    let n = 0, lowest = 1, nb = 0; const bossT = [];
    const dt = 1 / 60, limit = 60 * 60 * 20;
    while (!BOT.over && n < limit) {
      if (G.state === 'play') { steer(); update(dt); n++; }
      else if (G.state === 'dying') { BOT.over = 'dead'; break; }
      else decide();
      if (n % 300 === 0) housekeep();
      if (n % 3600 === 0) BOT.hp.push(Math.round(P.life / P.maxLife * 100));
      lowest = Math.min(lowest, P.life / P.maxLife);
      if (G.stats.bosses > nb) { nb = G.stats.bosses; bossT.push(Math.round(G.time)); }
    }
    const dmg = {}; for (const s of P.skills) dmg[s.id] = Math.round(s.dmgDealt);
    return { result: BOT.over || 'timeout', t: Math.round(G.time), level: P.level, kills: G.stats.kills, bosses: G.stats.bosses,
      skills: P.skills.map((s) => s.id + ':' + s.level + (s.evo ? '*' : '') + '[' + s.supports.join(',') + ']'),
      dmg, asc: P.asc, ks: Object.keys(P.keystones), masteries: P.masteries, life: Math.round(P.maxLife), es: Math.round(P.maxES || 0),
      equips: BOT.equips, weapon: P.equip.weapon && P.equip.weapon.base, lowest: +lowest.toFixed(2),
      killer: P.killedBy || '', bossT, bossLeft: G.bossRef && !G.bossRef.dead ? +(G.bossRef.hp / G.bossRef.maxHp).toFixed(2) : null };
  }
`;

const g = loadGame(1);
g.run(BOT);
for (let j = +shard; j < jobs.length; j += +shards) {
  const job = jobs[j], t0 = Date.now();
  let row;
  try { row = Object.assign({}, job, JSON.parse(g.run(`JSON.stringify(runBot(${JSON.stringify(job)}))`))); }
  catch (err) { row = Object.assign({}, job, { err: String(err && err.stack || err).split('\n').slice(0, 4).join(' | ') }); }
  row.ms = Date.now() - t0;
  fs.appendFileSync(out, JSON.stringify(row) + '\n');
}
