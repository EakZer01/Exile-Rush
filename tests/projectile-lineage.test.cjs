const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

function tornado(supports = ['fork'], evolved = false) {
  const g = game();
  g.run(`
    inst.id = 'tornado_shot'; inst.evo = ${evolved}; inst.level = ${evolved ? 20 : 1};
    P.equip.weapon = makeNormal('short_bow');
    inst.supports = ${JSON.stringify(supports)};
    P.currency.jeweller6 = 1; G.state = 'inventory'; useSkillJeweller(inst, 'jeweller6'); G.state = 'play';
    const s = inst.st;
    let born = 0;
    const originalSpawn = spawnProjectile;
    spawnProjectile = (...args) => { born++; return originalSpawn(...args); };
    function projectile() { return G.projectiles[G.projectiles.length - 1]; }
    function hit(p) { const e = enemy(200 + born, 0); onProjectileHit(p, e); return e; }
  `);
  return g;
}

test('Fork descendants of Tornado Shot remain secondary arrows and cannot split again', () => {
  const { run } = tornado();
  run('spawnProjectile(inst, s, 0, 0, 0); const primary = projectile(); hit(primary); const secondary = projectile(); hit(secondary); const forkChild = projectile();');
  assert.equal(run('forkChild.child'), true);
  assert.equal(run('forkChild.forked'), true);
  assert.equal(run('born'), run('1 + s.split + 2'));
  run('const before = born; hit(forkChild);');
  assert.equal(run('born'), run('before'));
  assert.equal(run('forkChild.dead'), true);
});

test('forks preserve spent return, chain and lifetime budgets from their parent', () => {
  const { run } = tornado(['fork', 'returning', 'chain']);
  run(`
    spawnProjectile(inst, s, 0, 0, 0); const primary = projectile(); hit(primary);
    const secondary = projectile(); secondary.returned = true; secondary.chain = 1; secondary.t = 0.2;
    hit(secondary); const forkChild = projectile();
  `);
  assert.equal(run('forkChild.returned'), true);
  assert.equal(run('forkChild.chain'), 1);
  assert.equal(run('forkChild.life'), run('secondary.life'));
  assert.equal(run('forkChild.t'), 0.2);
});

test('Tornado Shot splitting is idempotent and secondary arrows cannot start another split', () => {
  const { run } = tornado();
  run('spawnProjectile(inst, s, 0, 0, 0); const primary = projectile(); splitProjectile(primary); const secondary = projectile(); const before = born; splitProjectile(primary); splitProjectile(secondary);');
  assert.equal(run('born'), run('before'));
});

test('ordinary Fork still creates two terminal branches and preserves already-hit targets', () => {
  const { run } = tornado();
  run(`
    inst.id = 'split_arrow'; inst.evo = false; recomputePlayer();
    spawnProjectile(inst, inst.st, 0, 0, 0); const primary = projectile(); const first = hit(primary);
    const branch = projectile(); const before = born; hit(branch);
  `);
  assert.equal(run('before'), 3);
  assert.equal(run('born'), 3);
  assert.equal(run('branch.forked'), true);
  assert.equal(run('branch.child'), false);
  assert.equal(run('branch.hit.has(first.id)'), true);
});

test('a returning primary splits only once on expiry and its children cannot return again', () => {
  const { run } = tornado(['fork', 'returning']);
  run(`
    G.enemies = []; G.hash.clear();
    spawnProjectile(inst, s, 0, 0, 0); const primary = projectile();
    primary.t = primary.life; updateProjectiles(1/120);
  `);
  assert.equal(run('primary.returned'), true);
  run('primary.t = primary.life; updateProjectiles(1/120);');
  assert.equal(run('born'), run('1 + s.split'));
  assert.equal(run('G.projectiles.every(p => p.child && p.returned)'), true);
  run('for (let k = 0; k < 120; k++) updateProjectiles(1/120);');
  assert.equal(run('G.projectiles.length'), 0);
});

test('one cast stays bounded and all projectiles expire after firing stops, including Vaal and support combinations', () => {
  const combos = [[], ['fork'], ['fork', 'returning'], ['fork', 'chain'], ['fork', 'pierce'], ['fork', 'gmp'], ['fork', 'returning', 'chain', 'gmp'], ['fork', 'returning', 'chain', 'pierce', 'gmp'], ['fork', 'returning', 'chain', 'pierce', 'gmp', 'faster_projectiles']];
  for (const evolved of [false, true]) for (const supports of combos) {
    const { run } = tornado(supports, evolved);
    assert.equal(run('activeSupports(inst).active.length'), supports.length);
    const stats = run(`(() => {
      G.enemies = [];
      for (let x = 40; x <= 280; x += 24) for (let y = -144; y <= 144; y += 24) enemy(x, y);
      G.hash.clear(); for (const e of G.enemies) G.hash.insert(e);
      castProjectiles(inst, s);
      let peak = G.projectiles.length;
      for (let k = 0; k < 1800; k++) { G.time += 1/120; updateProjectiles(1/120); peak = Math.max(peak, G.projectiles.length); }
      return { born, peak, remaining: G.projectiles.length, damage: inst.dmgDealt, budget: s.proj * (1 + s.split * (s.fork ? 3 : 1)) };
    })()`);
    const label = `${evolved ? 'Vaal' : 'normal'} [${supports}]`;
    assert.ok(stats.born <= stats.budget, `${label}: ${stats.born} > ${stats.budget}`);
    assert.equal(stats.remaining, 0, `${label}: arrows never expired`);
    assert.ok(stats.damage > 0, `${label}: skill stopped dealing damage`);
  }
});
