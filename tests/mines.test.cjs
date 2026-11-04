const test = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

// player far away so no mine is stepped on
function mineGame() {
  const g = game();
  g.run(`startGame(CLASSES[0]); G.player.x = 2000; G.player.y = 2000; G.hazards.length = 0;
    const mines = () => G.hazards.filter((h) => h.mine);`);
  return g;
}

test('mines fizzle after their lifetime instead of piling up forever', () => {
  const { run } = mineGame();
  run(`addMine(0, 0, 80, 1.2, 10, 'test', null); updateHazards(MINE_LIFE - 0.1);`);
  assert.equal(run('mines().length'), 1);
  run('updateHazards(0.2);');
  assert.equal(run('mines().length'), 0);
});

test('at most MINE_MAX mines exist; the oldest makes room', () => {
  const { run } = mineGame();
  run(`for (let i = 0; i < 30; i++) addMine(i * 10, 0, 80, 1.2, 10, 'test', null);`);
  assert.equal(run('mines().length'), run('MINE_MAX'));
  assert.equal(run('mines()[0].x'), (30 - run('MINE_MAX')) * 10);
});

test('one Doom Sapper keeps at most MINE_PER_OWNER mines, others are untouched', () => {
  const { run } = mineGame();
  run(`addMine(-500, 0, 80, 1.2, 10, 'field', null);
    for (let i = 0; i < 6; i++) addMine(i * 10, 0, 80, 1.2, 10, 'sapper', 7);`);
  assert.equal(run('mines().filter((h) => h.owner === 7).length'), run('MINE_PER_OWNER'));
  assert.equal(run('mines().filter((h) => h.owner === null).length'), 1);
});

test('mines no longer use up the space boss attacks need', () => {
  const { run } = mineGame();
  run(`for (let i = 0; i < 100; i++) addMine(i, 0, 80, 1.2, 10, 'test', null);
    addHazard(0, 0, 100, 1, 10, '#fff', 'boss', 'fire');`);
  assert.equal(run('G.hazards.filter((h) => !h.mine).length'), 1);
  assert.ok(run('G.hazards.length') <= run('MINE_MAX') + 1);
});
