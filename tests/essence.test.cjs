const test = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

// a Witch next to a sealed Essence monster and nothing else
function essenceGame() {
  const g = game();
  g.run(`startGame(CLASSES[0]); updateSpawner = () => {}; G.enemies.length = 0; const Q9 = G.player;
    E9 = makeEnemy('zombie', Q9.x + 150, Q9.y, 2); E9.encased = true; E9.essence = Object.keys(ESSENCES)[0]; E9.essProg = 0; E9.encT = 0;
    G.enemies.push(E9); HP9 = E9.hp; SHOTS = 0;
    const _spawn = spawnProjectile; spawnProjectile = (...a) => { SHOTS++; return _spawn(...a); };
    function runFor(sec) { for (let i = 0; i < sec * 60; i++) { G.player.life = G.player.maxLife; update(1 / 60); } }`);
  return g;
}

test('skills ignore a sealed Essence monster: no shots, no damage', () => {
  const { run } = essenceGame();
  run('runFor(3);');
  assert.equal(run('SHOTS'), 0);
  assert.equal(run('E9.hp'), run('HP9'));
  assert.equal(run('nearestEnemy(G.player.x, G.player.y, 1000)'), null);
});

test('once the seal is opened it is a normal target again', () => {
  const { run } = essenceGame();
  run('E9.x = G.player.x + 60; runFor(1.5);');   // standing next to it breaks the seal
  assert.equal(run('E9.encased'), false);
  run('runFor(2);');
  assert.ok(run('SHOTS') > 0);
  assert.ok(run('E9.hp < E9.maxHp'));
});
