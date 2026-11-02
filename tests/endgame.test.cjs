const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

test('gems only fire with their weapons; universal gems work with anything', () => {
  const { run } = game();
  run(`startGame(CLASSES[0]); P2 = G.player; P2.skills.push(newSkillInstance('split_arrow'), newSkillInstance('ice_nova')); recomputePlayer();`);
  assert.deepEqual(Array.from(run('P2.skills.map(s => s.st.disabled)')), [false, true, false]);
  run(`P2.equip.weapon = makeNormal('short_bow'); recomputePlayer();`);
  assert.deepEqual(Array.from(run('P2.skills.map(s => s.st.disabled)')), [true, false, false]);
  // a silenced gem never casts
  run(`P2.skills[0].timer = 0; for (let k = 0; k < 30; k++) updateSkills(1/60);`);
  assert.equal(run('P2.skills[0].rt.rc || 0'), 0);
  // new-skill cards only offer gems the held weapon can use
  assert.equal(run(`(() => { let bad = 0; for (let i = 0; i < 200; i++) for (const c of regularChoices(4)) if (c.type === 'skill' && !skillWeaponOk(c.id, P2.weapon)) bad++; return bad; })()`), 0);
});

test('every class (and every Scion roll) starts with a gem its weapon can use', () => {
  const { run } = game();
  assert.equal(run(`(() => { for (let i = 0; i < 30; i++) for (const c of CLASSES) { startGame(c); if (G.player.skills[0].st.disabled) return c.id; } return 'ok'; })()`), 'ok');
});

test('a full path offers both Mastery sides at the next Milestone and the pick applies', () => {
  const { run } = game();
  run(`P.passives = { proj: 4, piercing: 2 }; recomputePlayer();`);
  assert.deepEqual(Array.from(run(`milestoneChoices(3).slice(0, 2).map(c => c.id)`)), ['boomerang', 'close_quarters']);
  run(`G.choices = milestoneChoices(3); G.levelIsChest = false; G.pendingLevels = 1; chooseCard(0);`);
  assert.deepEqual(Array.from(run('P.masteries')), ['boomerang']);
  assert.equal(run(`readyMasteryPath(P)`), null);
  run(`P.skills = [newSkillInstance('ethereal_knives')]; P.equip.weapon = makeNormal('glass_shank'); recomputePlayer();`);
  assert.equal(run('P.skills[0].st.returning'), true);
});

test('source uniques drop only from their source', () => {
  const { run } = game();
  assert.equal(run(`Array.from({ length: 400 }, () => makeItem('unique', null, 0, 1)).filter(it => UNIQUES[it.unique].src).length`), 0);
  assert.equal(run(`Array.from({ length: 50 }, () => makeItem('unique', null, 0, 1, 'pinnacle')).every(it => UNIQUES[it.unique].src === 'pinnacle')`), true);
  run(`startGame(CLASSES[0], { biome: 'frozen', tier: 3, mods: [], scarabs: ['hunted'] }); G.items = [];
    rollBossUniques({ x: 0, y: 0, final: true, bossDef: {} });`);
  assert.equal(run(`G.items.length === 1 && UNIQUES[G.items[0].item.unique].src === 'boss_frozen'`), true);
});

test('build-changing uniques reshape their gem', () => {
  const { run } = game();
  run(`startGame(CLASSES[0]); const it = makeNormal('gnarled_staff'); it.rarity = 'unique'; it.unique = 'pale_engine'; G.player.equip.weapon = it;
    G.player.skills = [newSkillInstance('fireball')]; recomputePlayer();`);
  assert.deepEqual(Object.keys(run('G.player.skills[0].st.hit')), ['cold']);
  assert.equal(run('G.player.skills[0].st.ignite'), 0);
});

test('Scarabs are spent at the Map Device and change the run', () => {
  const { run } = game();
  run(`const M = loadMeta(); M.scarabs = { breach: 1 }; mapCls = CLASSES[0]; mapCfg = { biome: 'graveyard', tier: 1, mods: [] }; mapScarabs = ['breach']; mapStartPaid();`);
  assert.equal(run('loadMeta().scarabs.breach'), 0);
  assert.equal(run('G.atlasFx.breachRate'), 1.6);
});

test('Vault rewards land in the save and Heirlooms come home stronger', () => {
  const { run } = game();
  run(`const M = loadMeta(); M.shards = 0; startGame(CLASSES[0], { biome: 'graveyard', tier: 2, mods: [] }); G.time = 900;`);
  run(`claimVault(vaultCard('shards', 'rare'))`);
  assert.equal(run('loadMeta().shards'), 180);
  run(`const M2 = loadMeta(); M2.shards = 100; M2.stash = [makeItem('rare', 'boots', 100, 2)]; heirBind(0);
    startGame(CLASSES[0], { biome: 'graveyard', tier: 3, mods: [], loadout: [M2.stash.splice(0, 1)[0]] }); G.time = 900;`);
  assert.equal(run('runItems().some(it => it.heir)'), false);
  run('settleProgression(true, 0)');
  assert.deepEqual(Array.from(run('loadMeta().stash.filter(it => it.heir).map(it => it.heir.xp)')), [3]);
});

test('Gem Mastery levels, unlocks alternate qualities and adds damage', () => {
  const { run } = game();
  const base = run(`startGame(CLASSES[0]); G.player.skills[0].st.hitTotal`);
  run(`gemAddXp('fireball', 400); recomputePlayer();`);
  assert.equal(run(`gemLv('fireball')`), 4);
  assert.deepEqual(Array.from(run(`gemAltsOpen('fireball')`)), ['anomalous']);
  assert.ok(run('G.player.skills[0].st.hitTotal') > base);
  assert.equal(run(`gemSetAlt('fireball', 'phantasmal')`), false);
  run(`gemSetAlt('fireball', 'anomalous'); recomputePlayer();`);
  assert.equal(run('G.player.skills[0].st.proj'), 2);
});
