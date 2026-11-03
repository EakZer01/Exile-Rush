const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

function bowGame(id, supports = []) {
  const g = game();
  g.run(`startGame(CLASSES[1]); const bp = G.player; bp.x = bp.y = 0;
    const bi = newSkillInstance('${id}'); bi.sockets = 6; bi.supports = ${JSON.stringify(supports)}; bp.skills = [bi]; recomputePlayer(); G.enemies = [];
    function foe(x, y = 0) { const e = makeEnemy('zombie', x, y, 0); e.hp = e.maxHp = 1e9; e.speed = 0; e.dmg = 0; G.enemies.push(e); return e; }
    function hash() { G.hash.clear(); for (const e of G.enemies) if (!e.dead) G.hash.insert(e); }
    function shootAt(e, stats = bi.st) { spawnProjectile(bi, stats, e.x, e.y, 0); const p = G.projectiles[G.projectiles.length - 1]; onProjectileHit(p, e); return p; }
    function step(n) { for (let k = 0; k < n; k++) { G.time += 1/60; hash(); updateSkills(1/60); updateProjectiles(1/60); updateBowEntities(1/60); for (let j = G.delayed.length - 1; j >= 0; j--) { G.delayed[j].t -= 1/60; if (G.delayed[j].t <= 0) G.delayed.splice(j, 1)[0].fn(); } } }
  `);
  return g;
}

test('all four evolved bow skills deal real damage with matching weapons and have icons/recipes', () => {
  for (const id of ['burning_arrow', 'explosive_arrow', 'puncture', 'scourge_arrow']) {
    const { run } = bowGame(id);
    run(`bi.level = 12; bi.evo = true; recomputePlayer(); for (let j = 0; j < 8; j++) foe(80 + j * 20, (j % 3 - 1) * 15); step(240); skillIcon(bi.id); render();`);
    assert.ok(run('bi.dmgDealt') > 0, id);
    assert.equal(run('Number.isFinite(bi.dmgDealt) && !bi.st.disabled && EVOLUTIONS[bi.id].req.every(id => SUPPORTS[id])'), true);
    run(`bp.equip.weapon = makeNormal('rusted_sword'); recomputePlayer();`);
    assert.equal(run('bi.st.disabled'), true);
  }
});

test('Explosive Arrow damage accumulates without refreshing the first fuse timer', () => {
  const { run } = bowGame('explosive_arrow');
  run(`const e = foe(100); e.res.fire = 0; bi.st.critChance = 0; hash(); const baseHit = bi.st.hitTotal;
    shootAt(e); updateBowEntities(0.5); shootAt(e);`);
  assert.equal(run('G.bowFuses.length'), 1);
  assert.equal(run('G.bowFuses[0].count'), 2);
  assert.equal(run('G.bowFuses[0].t'), 0.5);
  assert.ok(Math.abs(run('bi.dmgDealt - baseHit * 0.3')) < 1e-5);
  run('updateBowEntities(0.71);');
  assert.equal(run('G.bowFuses.length'), 0);
  assert.ok(Math.abs(run('bi.dmgDealt - baseHit * 2')) < 1e-5);
});

test('Explosive Arrow detonates at 12 charges and preserves reduced mirage damage', () => {
  const { run } = bowGame('explosive_arrow');
  run(`const e = foe(100); hash(); bi.st.critChance = 0; const baseHit = bi.st.hitTotal; shootAt(e); shootAt(e, scaledStats(bi.st, 0.6));`);
  assert.ok(Math.abs(run('G.bowFuses[0].hit.fire - baseHit * 0.85 * 1.6')) < 1e-5);
  run('for (let n = 0; n < 10; n++) shootAt(e);');
  assert.equal(run('G.bowFuses.length'), 0);
  assert.equal(run(`G.effects.filter(e => e.kind === 'boom').length`), 1);
});

test('fuses detonate on dead targets and do not carry into a new run', () => {
  const { run } = bowGame('explosive_arrow');
  run(`const a = foe(100), b = foe(130); hash(); shootAt(a); const hp = b.hp; a.dead = true; hash(); updateBowEntities(0.01);`);
  assert.equal(run('b.hp < hp'), true);
  run(`shootAt(b); startGame(CLASSES[1]);`);
  assert.equal(run('G.bowFuses.length + G.bowSeeds.length'), 0);
});

test('Volley is parallel, Arrow Nova is delayed and incompatible supports cannot stack', () => {
  const { run } = bowGame('burning_arrow', ['volley']);
  run(`foe(300); hash(); castProjectiles(bi, bi.st);`);
  assert.equal(run('G.projectiles.length'), 3);
  assert.equal(run('new Set(G.projectiles.map(p => p.a)).size'), 1);
  assert.equal(run('new Set(G.projectiles.map(p => p.y)).size'), 3);
  assert.notEqual(run(`supportBlockReason('arrow_nova', bi, true)`), '');
  run(`bi.supports = ['arrow_nova']; recomputePlayer(); G.projectiles = []; castProjectiles(bi, bi.st, -60, 0);`);
  assert.equal(run('G.projectiles.length'), 0);
  assert.equal(run('G.bowSeeds.length'), 1);
  run('updateBowEntities(0.41);');
  assert.equal(run('G.projectiles.length'), 5);
  assert.equal(run('new Set(G.projectiles.map(p => p.a)).size'), 5);
  assert.equal(run('G.projectiles.every(p => p.ox === -60 && p.oy === 0)'), true);
  assert.notEqual(run(`supportBlockReason('arrow_nova', newSkillInstance('rain_of_arrows'), true)`), '');
});

test('Scourge pods do not multiply with GMP, forked arrows, returning arrows or their own thorns', () => {
  for (const supports of [['gmp', 'fork', 'returning'], ['arrow_nova', 'gmp', 'fork', 'returning']]) {
    const { run } = bowGame('scourge_arrow', supports);
    run(`foe(200); hash(); castProjectiles(bi, bi.st);`);
    if (supports.includes('arrow_nova')) run('updateBowEntities(0.41);');
    assert.equal(run(`G.bowSeeds.filter(p => p.kind === 'pod').length`), 3);
    run('bi.timer = 999; step(600);');
    assert.equal(run('G.bowSeeds.length'), 0);
    assert.equal(run('G.projectiles.length'), 0);
    assert.ok(run('bi.dmgDealt') > 0);
  }
});

test('Maim slows walking then expires, and Puncture guarantees Bleed', () => {
  const { run } = bowGame('puncture', ['maim']);
  run(`const e = foe(400); e.speed = 100; hash(); shootAt(e); const x0 = e.x; updateEnemies(0.1); const maimDistance = x0 - e.x;
    e.x = x0; G.time = 2.1; updateEnemies(0.1); const normalDistance = x0 - e.x;`);
  assert.ok(run('e.bleeds.length') > 0);
  assert.ok(Math.abs(run('maimDistance / normalDistance') - 0.7) < 1e-5);
});

test('Lone Archer and Siege Doctrine have distinct tradeoffs and cannot be offered together', () => {
  const { run } = bowGame('burning_arrow');
  run('const base = bi.st.hitTotal; bp.keystones.lone_archer = 1; recomputePlayer();');
  assert.ok(Math.abs(run('bi.st.hitTotal / base') - 1.35) < 1e-9);
  assert.notEqual(run(`supportBlockReason('ballista_totem', bi, true)`), '');
  run(`bi.supports = ['mirage_archer']; recomputePlayer();`);
  assert.equal(run('bi.st.disabled && !!bi.st.disableReason'), true);
  run(`bi.supports = ['combustion']; recomputePlayer();`);
  assert.equal(run('bi.st.disabled'), false);
  assert.equal(run(`Array.from({length: 100}, () => milestoneChoices(4)).flat().some(c => c.id === 'siege_doctrine')`), false);
  run(`bp.keystones = { siege_doctrine: 1 }; bi.supports = ['ballista_totem']; recomputePlayer(); const siege = bi.st.hitTotal;
    bp.keystones = {}; recomputePlayer(); const plain = bi.st.hitTotal;`);
  assert.ok(Math.abs(run('siege / plain') - 1.4) < 1e-9);
  run(`bp.keystones.siege_doctrine = 1; recomputePlayer();`);
  assert.equal(run('bi.st.totemDur'), 12);
});

test('Watchtowers changes placement/range; King of the Hill adds crit knockback; all passives join Mastery', () => {
  const { run } = bowGame('burning_arrow', ['ballista_totem']);
  run(`bp.passives.watchtowers = 3; bp.passives.king_of_the_hill = 1; recomputePlayer(); foe(650); hash(); updateSkills(0.3);`);
  assert.equal(run('bi.rt.totems.length'), 1);
  assert.ok(run('bi.timer') < 1.2);
  run(`bi.supports = []; recomputePlayer(); const e = foe(100); bi.st.knock = 0; G.buffs.diamond = 2; hitEnemy(e, bi.st, bi, 1, 0, 0);`);
  assert.ok(run('e.kx') > 0);
  assert.equal(run(`BOW_PASSIVES.every(([id, name, th, icon, path]) => PASSIVE_PATH[id] === path && RUN_PATHS[path].passives.includes(id))`), true);
});

test('bow secondary entities remain capped and disappear when their skill is disabled', () => {
  const { run } = bowGame('explosive_arrow');
  run(`for (let k = 0; k < 80; k++) { const e = foe(100 + k, 0); shootAt(e); }
    const fuseCount = G.bowFuses.length;
    bi.id = 'scourge_arrow'; recomputePlayer(); for (let k = 0; k < 60; k++) plantScourgePods(bi, bi.st, 0, 0, 0, 300);
    const podCount = G.bowSeeds.length; bp.equip.weapon = makeNormal('rusted_sword'); recomputePlayer(); updateBowEntities(0.01);`);
  assert.ok(run('fuseCount') <= 64);
  assert.ok(run('podCount') <= 64);
  assert.equal(run('G.bowFuses.length + G.bowSeeds.length'), 0);
});

test('Deadly Draw increases displayed hit and Bleed while its cooldown balances hit DPS', () => {
  const { run } = bowGame('puncture');
  run(`const baseHit = avgHit(bi.st), baseBleed = bi.st.bleedMore, baseCd = bi.st.cdFinal;
    bi.supports = ['deadly_draw']; recomputePlayer();`);
  assert.ok(Math.abs(run('avgHit(bi.st) / baseHit') - 1.25) < 1e-9);
  assert.ok(Math.abs(run('bi.st.bleedMore / baseBleed') - 1.35) < 1e-9);
  assert.ok(Math.abs(run('bi.st.cdFinal / baseCd') - 1.25) < 1e-9);
});
