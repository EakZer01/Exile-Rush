const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

function skillGame(id, supports = []) {
  const g = game();
  g.run(`startGame(CLASSES[0]); const sp = G.player, si = newSkillInstance('${id}'); si.sockets = 6; si.supports = ${JSON.stringify(supports)}; sp.skills = [si];
    const ws = SKILLS[si.id].weapons; if (ws) sp.equip.weapon = makeNormal(Object.keys(BASES).find(k => BASES[k].w && ws.includes(BASES[k].w.type))); recomputePlayer();
    G.enemies = []; function foe(x, y = 0) { const e = makeEnemy('zombie', x, y, 0); e.hp = e.maxHp = 1e8; e.speed = 0; e.dmg = 0; G.enemies.push(e); return e; }
    function hash() { G.hash.clear(); for (const e of G.enemies) if (!e.dead) G.hash.insert(e); }
    function step(n) { for (let j = 0; j < n; j++) { G.time += 1/60; hash(); updateSkills(1/60); updateProjectiles(1/60); updateMinions(1/60); for (let k = G.delayed.length - 1; k >= 0; k--) { G.delayed[k].t -= 1/60; if (G.delayed[k].t <= 0) G.delayed.splice(k, 1)[0].fn(); } } }
    function drainDelayed() { for (const d of G.delayed.splice(0)) d.fn(); }
  `);
  return g;
}

test('no-hit Supports are rejected by cards, Codex and sockets; legacy gems stay stored and inactive', () => {
  const { run } = skillGame('righteous_fire');
  const blocked = ['deadly_ailments', 'unbound_ailments', 'combustion', 'elemental_prolif', 'fire_pen'];
  for (const id of blocked) {
    assert.notEqual(run(`supportBlockReason('${id}', si, true)`), '');
    assert.equal(run(`supportTargets('${id}').includes('righteous_fire')`), false);
  }
  run(`const before = si.st.auraDps; si.supports = ${JSON.stringify(blocked)}; recomputePlayer();`);
  assert.equal(run('si.supports.length'), 5);
  assert.equal(run('activeSupports(si).active.length'), 0);
  assert.equal(run('si.st.auraDps'), run('before'));
  assert.equal(run('Object.values(activeSupports(si).reasons).every(s => s.length > 0)'), true);
  run('si.supports = [];');
  assert.equal(run(`Array.from({length: 200}, () => regularChoices(4)).flat().some(c => c.type === 'support' && ${JSON.stringify(blocked)}.includes(c.id))`), false);
});

test('unsupported flight/cascade mechanics cannot be socketed just because a tag matches', () => {
  const { run } = skillGame('molten_strike');
  for (const id of ['chain', 'pierce', 'fork', 'faster_projectiles', 'returning', 'barrage']) assert.notEqual(run(`supportBlockReason('${id}', si, true)`), '');
  assert.equal(run(`supportBlockReason('gmp', si, true)`), '');
  assert.notEqual(run(`supportBlockReason('spell_cascade', newSkillInstance('cleave'), true)`), '');
  assert.notEqual(run(`supportBlockReason('returning', newSkillInstance('venom_gyre'), true)`), '');
  assert.notEqual(run(`supportBlockReason('fork', newSkillInstance('kinetic_bolt'), true)`), '');
});

test('effect enablers resolve in either socket order without granting tags from inactive gems', () => {
  for (const supports of [['elemental_army', 'added_cold'], ['added_cold', 'elemental_army']]) {
    const { run } = skillGame('raise_zombie', supports);
    assert.equal(run('activeSupports(si).active.length'), 2);
  }
  for (const supports of [['unbound_ailments', 'crimson_bleed', 'chance_to_bleed'], ['chance_to_bleed', 'crimson_bleed', 'unbound_ailments']]) {
    const { run } = skillGame('heavy_strike', supports);
    assert.equal(run('activeSupports(si).active.length'), 3);
  }
  const { run } = skillGame('heavy_strike', ['unbound_ailments', 'crimson_bleed']);
  assert.equal(run('activeSupports(si).active.length'), 0);
});

test('all specialist skills have valid evolved forms/icons and deal damage', () => {
  for (const id of ['power_siphon', 'kinetic_bolt', 'cobra_lash', 'venom_gyre', 'wintertide_brand', 'lightning_tendrils', 'skeletal_mages']) {
    const { run } = skillGame(id);
    run(`si.level = 12; si.evo = true; recomputePlayer(); for (let j = 0; j < 6; j++) foe(90 + j * 25, j % 2 * 15); step(240); skillIcon(si.id); render();`);
    assert.ok(run('si.dmgDealt') > 0, id);
    assert.equal(run('Number.isFinite(si.dmgDealt) && !si.st.disabled && EVOLUTIONS[si.id].req.every(id => SUPPORTS[id])'), true);
  }
});

test('Power Siphon uses weapon crit plus its intrinsic bonus and culls low-life targets', () => {
  const { run } = skillGame('power_siphon');
  assert.ok(run('si.st.critChance') > run('sp.weapon.crit / 100'));
  run(`const e = foe(100); e.maxHp = 1000; e.hp = 100.01; e.res.lightning = e.res.physical = 0; const s = scaledStats(si.st, 0.01); s.critChance = 0; hitEnemy(e, s, si, 1, 0, 0);`);
  assert.equal(run('e.dead'), true);
});

test('Kinetic Bolt forks once and Venom Gyre can return without spawning endless descendants', () => {
  const { run } = skillGame('kinetic_bolt');
  run(`const e = foe(100); hash(); spawnProjectile(si, si.st, e.x, e.y, 0); const p = G.projectiles[0]; onProjectileHit(p, e);`);
  assert.equal(run('si.st.fork && G.projectiles.length === 3'), true);
  run('si.timer = 999; step(300);');
  assert.equal(run('G.projectiles.length'), 0);
  const g = skillGame('venom_gyre');
  g.run(`spawnProjectile(si, si.st, 0, 0, 0); const p = G.projectiles[0]; p.t = p.life; updateProjectiles(0.01);`);
  assert.equal(g.run('p.returned'), true);
  g.run('si.timer = 999; step(300);');
  assert.equal(g.run('G.projectiles.length'), 0);
});

test('Wintertide Brand uses DoT instead of crit/ailment hits; Swiftbrand trades life for tick frequency', () => {
  const base = skillGame('wintertide_brand');
  base.run(`const e = foe(100); hash(); castBrand(si, si.st); si.timer = 999; step(120);`);
  const damage = base.run('si.dmgDealt');
  assert.ok(damage > 0);
  assert.equal(base.run('e.chill.t + e.freeze + e.shock.t + e.poison.length'), 0);
  assert.equal(base.run('e.winterSlowUntil > G.time'), true);
  const fast = skillGame('wintertide_brand', ['swiftbrand']);
  fast.run(`foe(100); hash(); castBrand(si, si.st); si.timer = 999; step(120);`);
  assert.ok(fast.run('si.dmgDealt') > damage * 1.2);
  assert.ok(fast.run('si.st.durFinal') < base.run('si.st.durFinal'));
  const lasting = skillGame('wintertide_brand', ['brand_persistence']);
  assert.ok(lasting.run('si.st.durFinal') > base.run('si.st.durFinal'));
  assert.notEqual(fast.run(`supportBlockReason('brand_persistence', si, true)`), '');
});

test('Brand Relay reaches farther and activates immediately when its host dies', () => {
  const { run } = skillGame('wintertide_brand', ['brand_relay']);
  run(`const a = foe(100), b = foe(450); hash(); castBrand(si, si.st); si.rt.brands[0].act = 9; a.dead = true; hash(); updateBrands(si, si.st, 0.01);`);
  assert.equal(run('si.rt.brands[0].target === b'), true);
  assert.ok(run('b.hp < b.maxHp'));
});

test('Herald Amplification grows real range/area and Echo repeats once at reduced damage', () => {
  const { run } = skillGame('herald_of_ice', ['herald_echo', 'herald_amplification']);
  run(`const e = foe(40); e.res.cold = 0; hash(); si.st.critChance = 0; const hit = si.st.hitTotal; emitHeraldBurst(si, si.st, 40, 0); drainDelayed();`);
  assert.ok(Math.abs(run('si.dmgDealt / hit') - 1.45) < 1e-6);
  assert.equal(run('G.delayed.length'), 0);
  assert.ok(run('si.st.radius') > 75);
  const t = skillGame('herald_of_thunder', ['herald_echo', 'herald_amplification']);
  t.run(`const e = foe(440); hash(); heraldThunder(si, si.st); drainDelayed();`);
  assert.ok(t.run('e.hp < e.maxHp'));
  assert.equal(t.run('G.delayed.length'), 0);
});

test('Herald Catalyst changes the trigger condition without allowing kills across the entire map', () => {
  for (const id of ['herald_of_ice', 'herald_of_ash']) {
    const { run } = skillGame(id, ['herald_catalyst']);
    run(`const a = foe(100), b = foe(120); a.dead = true; hash(); onKillSkills(a); drainDelayed();`);
    assert.ok(run('b.hp < b.maxHp'));
    run(`G.delayed = []; const far = foe(1200); far.dead = true; onKillSkills(far);`);
    assert.equal(run('G.delayed.length'), 0);
  }
});

test('Channel supports change movement cadence, stationary buildup and actual beam width', () => {
  const { run } = skillGame('lightning_tendrils', ['channel_intensity']);
  run(`foe(100); step(120);`);
  assert.equal(run('si.rt.channelStacks'), 5);
  run('G.input.right = true; castBeam(si, si.st);');
  assert.equal(run('si.rt.channelStacks'), 0);
  const mobile = skillGame('lightning_tendrils', ['mobile_channel']);
  mobile.run(`foe(100); G.input.right = true; step(120);`);
  const normal = skillGame('lightning_tendrils');
  normal.run(`foe(100); G.input.right = true; step(120);`);
  assert.ok(mobile.run('si.rt.rc') > normal.run('si.rt.rc'));
  const wide = skillGame('lightning_tendrils', ['channel_fan']);
  wide.run(`foe(80); const side = foe(120, 65); hash(); castBeam(si, si.st);`);
  assert.ok(wide.run('side.hp < side.maxHp'));
  assert.ok(wide.run('si.st.range') < normal.run('si.st.range'));
});

test('ranged minions shoot from themselves and accept projectile supports', () => {
  const { run } = skillGame('skeletal_mages', ['multiple_projectiles', 'minion_speed']);
  run(`foe(300); step(50);`);
  assert.ok(run('G.minions.length') > 0);
  assert.ok(run('G.projectiles.length') >= 3);
  assert.equal(run('G.projectiles.some(p => p.ox !== sp.x || p.oy !== sp.y)'), true);
  assert.equal(run('si.st.proj'), 3);
  assert.equal(run('activeSupports(si).active.length'), 2);
});
