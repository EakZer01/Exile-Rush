const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

function setup() {
  const g = game();
  g.run(`const collector = Object.values(TREE_NODES).find(n => n.name === 'Collector').id;
    const specialist = Object.values(TREE_NODES).find(n => n.name === 'Specialist').id;
    const wanderlust = Object.keys(ASC_NODES).find(id => ASC_NODES[id].name === 'Wanderlust');
    const grave = Object.keys(ASC_NODES).find(id => ASC_NODES[id].name === 'Grave Command');
    function fillSkills(n) { G.player.skills = ['fireball', 'ice_nova', 'arc', 'spark', 'frostbolt', 'contagion'].slice(0, n).map(newSkillInstance); recomputePlayer(); }
  `);
  return g;
}

test('Collector, Wanderlust and Milestone bonuses never exceed six slots in any combination', () => {
  const { run } = setup();
  for (const collector of [false, true]) for (const wanderlust of [false, true]) for (const extra of [0, 1, 2]) {
    run(`loadMeta().alloc = {}; ${collector ? 'loadMeta().alloc[collector] = 70;' : ''} startGame(CLASSES[0]); G.player.extraSlots = ${extra}; ${wanderlust ? 'G.player.ascNodes.push(wanderlust);' : ''} recomputePlayer();`);
    assert.equal(run('skillCapacity()'), Math.min(6, 4 + (collector ? 2 : 0) + (wanderlust ? 1 : 0) + extra));
    assert.ok(run('MAX_SKILLS + G.player.mods.skillSlots') <= 6);
  }
  run('loadMeta().alloc = { [specialist]: 70 }; startGame(CLASSES[0]);');
  assert.equal(run('skillCapacity()'), 3);
});

test('a six-slot Collector never receives useless slot cards or seventh-skill cards', () => {
  const { run } = setup();
  run(`loadMeta().alloc[collector] = 70; startGame(CLASSES[0]); fillSkills(6); G.player.level = 40; G.pendingLevels = 1;`);
  assert.equal(run('canExpandSkills()'), false);
  assert.equal(run(`Array.from({length: 200}, () => milestoneChoices(4)).flat().some(c => c.type === 'slot')`), false);
  assert.equal(run(`Array.from({length: 200}, () => regularChoices(4)).flat().some(c => c.type === 'skill')`), false);
});

test('acquiring stale skill and slot cards cannot bypass the limit or consume the choice', () => {
  const { run } = setup();
  run(`loadMeta().alloc[collector] = 70; startGame(CLASSES[0]); fillSkills(6);
    G.pendingLevels = 1; G.choices = [{ type: 'skill', id: 'soulrend' }, { type: 'slot' }];
    chooseCard(0); chooseCard(1);`);
  assert.equal(run('G.player.skills.length'), 6);
  assert.equal(run('G.player.extraSlots'), 0);
  assert.equal(run('G.pendingLevels'), 1);
});

test('Wanderlust allows one Milestone slot, then keeps its movement bonus without opening a seventh', () => {
  const { run } = setup();
  run(`startGame(CLASSES[0]); grantAscNode(wanderlust); G.pendingLevels = 2; G.levelIsChest = false;
    G.choices = [{ type: 'slot' }, { type: 'slot' }]; chooseCard(0); chooseCard(1);`);
  assert.equal(run('skillCapacity()'), 6);
  assert.equal(run('G.player.extraSlots'), 1);
  assert.equal(run('G.pendingLevels'), 1);
  assert.ok(run('G.player.mods.moveInc') >= 0.08);
});

test('Grave Command grants a skill only when a slot is available, otherwise upgrades an existing gem', () => {
  const { run } = setup();
  run(`startGame(CLASSES[0]); grantAscNode(grave);`);
  assert.equal(run(`G.player.skills.find(s => s.id === 'raging_spirit').level`), 3);
  run(`loadMeta().alloc[collector] = 70; startGame(CLASSES[0]); fillSkills(6); G.player.skills[2].dmgDealt = 100; grantAscNode(grave);`);
  assert.equal(run('G.player.skills.length'), 6);
  assert.equal(run('G.player.skills[2].level'), 4);
  assert.equal(run('G.player.mods.minionCount'), 1);
  run('grantAscNode(grave);');
  assert.equal(run('G.player.skills[2].level'), 4);
});

test('a full bar prioritizes an existing minion for the fallback and respects level 20', () => {
  const { run } = setup();
  run(`startGame(CLASSES[0]); fillSkills(4); G.player.skills[1] = newSkillInstance('summon_skeletons'); G.player.skills[1].level = 19; grantAscNode(grave);`);
  assert.equal(run('G.player.skills.length'), 4);
  assert.equal(run('G.player.skills[1].level'), 20);
  run(`startGame(CLASSES[0]); G.player.skills.push(newSkillInstance('raging_spirit')); fill = G.player.skills[1]; fill.level = 19; grantAscNode(grave);`);
  assert.equal(run('G.player.skills.length'), 2);
  assert.equal(run('fill.level'), 20);
});
