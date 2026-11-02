const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

test('standing still starts three real teleports, with a recovery gap and unchanged burst damage', () => {
  const { run } = game();
  run('tick(17)');
  assert.equal(run('P.x'), 0);
  assert.equal(run('strikes()'), 0);
  run('tick(25)');
  assert.equal(run('strikes()'), 3);
  assert.ok(run('P.x > 80'));
  assert.equal(run('G.delayed.length'), 0);
  assert.equal(run('inst.st.flickers'), 3);
  run(`
    const baseDamage = inst.st.hitTotal * 3;
    SKILLS.flicker_strike.behavior = 'strike';
    const previousStats = buildSkillStats(inst, P);
    SKILLS.flicker_strike.behavior = 'flicker';
  `);
  assert.ok(Math.abs(run('baseDamage - previousStats.hitTotal * previousStats.flickers')) < 1e-8);
  run('tick(6)');
  assert.equal(run('strikes()'), 3);
});

test('movement cancels remaining warps and release requires a fresh idle delay', () => {
  const { run } = game();
  run('tick(19); const before = P.x; key("KeyD"); tick(30)');
  assert.equal(run('strikes()'), 1);
  assert.ok(run('P.x > before + 90'));
  run('key("KeyD", false); tick(17)');
  assert.equal(run('strikes()'), 1);
  run('tick(10)');
  assert.ok(run('strikes() > 1'));
});

test('T pauses indefinitely, ignores key repeat, and resumes after the idle delay', () => {
  const { run, elements } = game();
  run('tick(19); key("KeyT"); key("KeyT", true, true); tick(180); syncFlickerButton()');
  assert.equal(run('P.flickerPaused'), true);
  assert.equal(run('strikes()'), 1);
  assert.equal(elements.get('btn-flicker')['aria-pressed'], 'false');
  assert.ok(elements.get('btn-flicker').textContent.includes('พัก'));
  run('key("KeyT"); tick(17)');
  assert.equal(run('strikes()'), 1);
  run('tick(20)');
  assert.equal(run('strikes()'), 4);
});

test('joystick and Dash interrupt even when attack speed and Vaal are high', () => {
  for (const input of ['G.input.joy = {x: 0.5, y: 0}', 'key("Space")']) {
    const { run } = game();
    run('inst.vaalT = 6; P.flaskFx.speed = 3; tick(19)');
    run(input + '; tick(8)');
    assert.equal(run('strikes()'), 1);
    assert.equal(run('inst.rt.flickerRemaining'), 0);
  }
});

test('Multistrike and evolution add damage without queued or extra teleports', () => {
  const { run } = game();
  run(`
    inst.level = 14; inst.evo = true; 
    inst.supports = ['multistrike']; recomputePlayer();
    const normal = inst.st.hitTotal;
    let hitCount = 0, damage = 0;
    hitEnemy = (e, s) => { hitCount++; damage += s.hitTotal; };
    tick(42);
  `);
  assert.equal(run('strikes()'), 3);
  assert.equal(run('hitCount'), 9);
  assert.equal(run('G.delayed.length'), 0);
  assert.ok(Math.abs(run('damage - normal * 9')) < 1e-8);
  run('key("KeyT"); tick(120)');
  assert.equal(run('hitCount'), 9);
});

test('targets ahead are preferred and a burst stays inside its starting range and arena', () => {
  const { run } = game();
  run('G.enemies = []; P.x = ARENA - 160; P.y = 0; P.facing = 0; enemy(P.x + 100, 0); enemy(P.x - 90, 0); const startX = P.x; tick(19)');
  assert.ok(run('P.x > startX'));
  assert.ok(run('inArena(P.x, P.y, P.r)'));
  run('tick(25)');
  assert.ok(run('dist2(startX, 0, P.x, P.y) <= 340 * 340'));
  assert.ok(run('inArena(P.x, P.y, P.r)'));
});

test('empty packs and paused screens cannot cause a teleport', () => {
  const { run, elements } = game();
  run('target.dead = true; tick(120)');
  assert.equal(run('P.x'), 0);
  assert.equal(run('strikes()'), 0);
  run('target.dead = false; G.state = "paused"; tick(60); syncFlickerButton()');
  assert.equal(run('strikes()'), 0);
  assert.equal(elements.get('btn-flicker').hidden, true);
});

test('other melee skills retain their normal delayed Multistrike repeats', () => {
  const { run } = game();
  run(`
    inst.id = 'molten_strike'; inst.supports = ['multistrike'];
    recomputePlayer(); target.x = 40; tick(1);
  `);
  assert.equal(run('G.delayed.length'), 2);
});
