const test = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

test('every Legacy Tree node is reachable from the start and links both ways', () => {
  const { run } = game();
  const r = run(`(() => {
    const seen = new Set([TREE_START]), stack = [TREE_START];
    while (stack.length) for (const l of TREE_NODES[stack.pop()].links) if (!seen.has(l)) { seen.add(l); stack.push(l); }
    const oneWay = Object.keys(TREE_NODES).filter((id) => TREE_NODES[id].links.some((l) => !TREE_NODES[l].links.includes(id)));
    return { total: Object.keys(TREE_NODES).length, reached: seen.size, oneWay: oneWay.length };
  })()`);
  assert.equal(r.reached, r.total);
  assert.equal(r.oneWay, 0);
  assert.equal(run(`Object.values(TREE_NODES).filter((n) => n.kind === 'keystone').length`), 12);
});

test('each outer region is entered from both neighbouring branches and ends in its keystone', () => {
  const { run } = game();
  for (const [i, id] of ['spellblade', 'venom', 'trailblazer', 'juggernaut', 'bonecrusher', 'sage'].entries()) {
    const b = run(`TREE_BRANCHES[${i}].id`), c = run(`TREE_BRANCHES[${(i + 1) % 6}].id`);
    assert.ok(run(`TREE_NODES['${id}_xa'].links.includes('${b}_nb')`), id);
    assert.ok(run(`TREE_NODES['${id}_xb'].links.includes('${c}_na')`), id);
    assert.deepEqual(Array.from(run(`TREE_NODES['${id}_key'].links`)), [id + '_xk']);
  }
});

test('every node effect applies to the player without errors or NaN', () => {
  const { run } = game();
  const bad = run(`(() => {
    const out = [];
    for (const id in TREE_NODES) {
      const n = TREE_NODES[id], m = defaultMods();
      if (n.apply) n.apply(m);
      for (const k in m) if (typeof m[k] === 'number' && !Number.isFinite(m[k])) out.push(id + ':' + k);
    }
    return out;
  })()`);
  assert.deepEqual(Array.from(bad), []);
  // allocating a new keystone changes the live player (Heavy Hitter: physical more, slower)
  run(`const M = loadMeta(); M.alloc.juggernaut_key = 1; startGame(CLASSES[2]);`);
  assert.ok(run('G.player.mods.physMore') > 1.3);
  assert.ok(run('G.player.mods.speedInc') < 0);
});

test('node prices rise by TREE_COST_STEP per allocated node; a full 40-point tree is a long-term goal', () => {
  const { run } = game();
  assert.equal(run(`treeNodeCost({ kind: 'small' }, 0)`), 24);
  assert.equal(run(`treeNodeCost({ kind: 'keystone' }, 30)`), 140 + 5 * 30);
  // 26 small, 9 notable, 3 keystone, 2 jewel bought in that order
  const full = run(`(() => { const mix = [...Array(26).fill('small'), ...Array(9).fill('notable'), ...Array(3).fill('keystone'), ...Array(2).fill('jewel')];
    return mix.reduce((a, k, i) => a + treeNodeCost({ kind: k }, i), 0); })()`);
  assert.equal(full, 5674);
});
