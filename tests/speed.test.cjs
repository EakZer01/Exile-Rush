const test = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

// play 0.1 s of real time and report how much game time passed
const realTenth = `(() => { G.state = 'play'; G.lastTs = 0; G.simDebt = 0; const t0 = G.time; advanceGame(100); return G.time - t0; })()`;

test('speed stays ×1 on a tier this save has never cleared, even if ×2 was picked', () => {
  const { run } = game();
  run(`G.settings.gameSpeed = 2; startGame(CLASSES[0], { biome: 'graveyard', tier: 3, mods: [] }); updateSpawner = () => {};`);
  assert.equal(run('tierCleared(3)'), false);
  assert.equal(run('G.speed'), 1);
  run('cycleGameSpeed();');
  assert.equal(run('G.speed'), 1);
});

test('a cleared tier (any area) runs at the picked speed: ×2 covers twice the game time', () => {
  const { run } = game();
  run(`atlasData().done.ashen_3 = true; G.settings.gameSpeed = 1; startGame(CLASSES[0], { biome: 'graveyard', tier: 3, mods: [] }); updateSpawner = () => {};`);
  const normal = run(realTenth);
  run(`setGameSpeed(2);`);
  assert.equal(run('G.speed'), 2);
  const fast = run(realTenth);
  assert.ok(Math.abs(fast - 2 * normal) < 1 / 60 + 1e-9, `normal ${normal} fast ${fast}`);
  run('cycleGameSpeed();');   // 2 → wraps to 1
  assert.equal(run('G.speed'), 1);
  assert.equal(run('G.settings.gameSpeed'), 1);
});

test('Daily and Weekly always run at ×1', () => {
  const { run } = game();
  run(`for (let t = 1; t <= 15; t++) atlasData().done['graveyard_' + t] = true; G.settings.gameSpeed = 2;`);
  run(`startGame(CLASSES[0], { biome: 'graveyard', tier: 3, mods: [], daily: 20261104 });`);
  assert.equal(run('G.speed'), 1);
  run(`startGame(CLASSES[0], { biome: 'graveyard', tier: 3, mods: [], weekly: 202645 });`);
  assert.equal(run('G.speed'), 1);
  run(`startGame(CLASSES[0], { biome: 'graveyard', tier: 3, mods: [] });`);
  assert.equal(run('G.speed'), 2);
});
