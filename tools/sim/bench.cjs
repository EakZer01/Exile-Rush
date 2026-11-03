// Skill benchmark: every skill x every weapon type it allows, no supports, no class bonus.
// Scenarios: single target dummy, a pack of 15 dummies, and a 60 s stream of real monsters (kills).
// usage: node bench.cjs <shard> <shards> <out.jsonl> [skillFilter]
const fs = require('node:fs');
const { loadGame } = require('./loader.cjs');
const [shard = 0, shards = 1, out = 'bench.jsonl', only] = process.argv.slice(2);
const g = loadGame(7);
g.run(`
  const noop = () => {};
  updateSpawner = noop; updateMapHazards = noop; updateBreach = noop; updateLeagues = noop; updateShrines = noop;
  showGameOver = noop; openVictory = noop; openLevelUp = noop; openAscend = noop; openRitual = noop;
  const WEAPON_BASE = { bow: 'short_bow', staff: 'gnarled_staff', wand: 'driftwood_wand', sceptre: 'driftwood_sceptre',
    sword: 'rusted_sword', axe: 'woodsplitter', dagger: 'glass_shank', mace: 'driftwood_club' };
  const NEUTRAL = Object.assign({}, CLASSES.find((c) => c.id === 'scion'), { apply() {} });
  function setup(id, wtype, lvl, t) {
    restoreRandom();
    startGame(CLASSES.find((c) => c.id === 'scion'));
    const P = G.player;
    P.cls = NEUTRAL;
    P.equip.weapon = makeNormal(WEAPON_BASE[wtype]);
    if (id.split('+').some((x) => SKILLS[x].base.mode === 'shield' || x === 'shield_throw')) P.equip.offhand = makeNormal('tower_shield');
    P.skills = id.split('+').map((x) => { const i = newSkillInstance(x); i.level = lvl; return i; });
    const inst = P.skills[0];
    recomputePlayer(); P.life = P.maxLife;
    G.time = t; G.enemies.length = 0; PINNED = [];
    return inst;
  }
  function keepAlive() {
    const P = G.player;
    P.life = P.maxLife; P.dead = false; G.pendingLevels = 0; G.pendingChests = 0; G.pendingAscend = 0; G.pendingRitual = false;
    G.state = 'play';
    for (const d of PINNED) { d.x = d.px; d.y = d.py; d.kx = d.ky = 0; }
  }
  let PINNED = [];
  function dummy(x, y) {
    const e = makeEnemy('zombie', x, y, 0);
    e.hp = e.maxHp = 1e9; e.speed = 0; e.dmg = 0; e.px = x; e.py = y;
    G.enemies.push(e); PINNED.push(e); return e;
  }
  const lost = (es) => es.reduce((a, e) => a + (e.maxHp - e.hp), 0);
  function step(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { keepAlive(); update(1 / 60); } }
  function single(id, w, lvl, t) {
    setup(id, w, lvl, t); const P = G.player;
    const d = dummy(P.x + 70, P.y);
    step(20); return lost([d]) / 20;
  }
  function pack(id, w, lvl, t) {
    setup(id, w, lvl, t); const P = G.player, es = [];
    for (let i = 0; i < 15; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 70; es.push(dummy(P.x + 110 + Math.cos(a) * r, P.y + Math.sin(a) * r)); }
    step(20); return lost(es) / 20;
  }
  const WAVE = ['skeleton', 'zombie', 'skeleton', 'zombie', 'skeleton'];
  function clear(id, w, lvl, t) {
    setup(id, w, lvl, t); const P = G.player;
    const k0 = G.stats.kills;
    for (let s = 0; s < 60 * 60; s++) {
      const live = G.enemies.filter((e) => !e.dead).length;
      for (let k = live; k < 80; k++) {
        const a = Math.random() * TAU, e = makeEnemy(pick(WAVE), P.x + Math.cos(a) * 320, P.y + Math.sin(a) * 320, 0);
        e.dmg = 0; e.hp = e.maxHp *= 2; G.enemies.push(e);
      }

      keepAlive(); update(1 / 60);
    }
    return G.stats.kills - k0;
  }
`);
if (process.env.MULT) g.run(`for (const [id, m] of Object.entries(${process.env.MULT})) SKILLS[id].base.dmg *= m;`);
const skills = JSON.parse(g.run(`JSON.stringify(Object.keys(SKILLS))`));
const jobs = [];
if (only && only.includes(':')) for (const j of only.split(',')) jobs.push(j.split(':'));
else for (const id of skills) {
  if (only && !only.split(',').includes(id)) continue;
  const ws = JSON.parse(g.run(`JSON.stringify(SKILLS['${id}'].weapons || Object.keys(WEAPON_BASE))`));
  for (const w of ws) jobs.push([id, w]);
}
const LEVELS = [[3, 90], [10, 300], [20, 600]];
for (let j = +shard; j < jobs.length; j += +shards) {
  const [id, w] = jobs[j], row = { id, w };
  const t0 = Date.now();
  for (const [lvl, t] of LEVELS) {
    try {
      row['st' + lvl] = Math.round(g.run(`single('${id}', '${w}', ${lvl}, ${t})`));
      row['pk' + lvl] = Math.round(g.run(`pack('${id}', '${w}', ${lvl}, ${t})`));
      row['cl' + lvl] = g.run(`clear('${id}', '${w}', ${lvl}, ${t})`);
    } catch (err) { row.err = String(err && err.stack || err).split('\n').slice(0, 3).join(' | '); }
  }
  row.ms = Date.now() - t0;
  fs.appendFileSync(out, JSON.stringify(row) + '\n');
}
