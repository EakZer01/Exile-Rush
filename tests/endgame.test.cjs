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

test('runs start with 4 skill slots; late Milestones can open up to 2 more', () => {
  const { run } = game();
  run(`startGame(CLASSES[0]); P3 = G.player; while (P3.skills.length < 4) P3.skills.push(newSkillInstance(['ice_nova', 'arc', 'spark', 'frostbolt'][P3.skills.length - 1])); recomputePlayer();`);
  assert.equal(run(`(() => { for (let i = 0; i < 100; i++) if (regularChoices(4).some(c => c.type === 'skill')) return true; return false; })()`), false);
  // no slot card before level 30
  run(`P3.level = 20; G.pendingLevels = 1;`);
  assert.equal(run(`(() => { for (let i = 0; i < 100; i++) if (milestoneChoices(4).some(c => c.type === 'slot')) return true; return false; })()`), false);
  run(`P3.level = 30;`);
  assert.equal(run(`(() => { for (let i = 0; i < 100; i++) if (milestoneChoices(4).some(c => c.type === 'slot')) return true; return false; })()`), true);
  run(`G.choices = [{ type: 'slot' }, { type: 'slot' }]; G.levelIsChest = false; G.pendingLevels = 2; chooseCard(0); chooseCard(1);`);
  assert.equal(run('MAX_SKILLS + P3.mods.skillSlots'), 6);
  assert.equal(run(`(() => { for (let i = 0; i < 200; i++) if (milestoneChoices(4).some(c => c.type === 'slot')) return true; return false; })()`), false);
  assert.equal(run(`(() => { for (let i = 0; i < 100; i++) if (regularChoices(4).some(c => c.type === 'skill')) return true; return false; })()`), true);
});

test('Bleed stacks hurt only at their strongest, unless Crimson Dance', () => {
  const { run } = game();
  run(`startGame(CLASSES[5]); P4 = G.player; P4.skills = [newSkillInstance('lacerate')]; P4.skills[0].st = null; recomputePlayer();
    E4 = makeEnemy('zombie', 2000, 2000, 0); E4.hp = E4.maxHp = 1e9; E4.speed = 0; E4.dmg = 0; E4.res.physical = 0; G.enemies = [E4];
    E4.bleeds = [{ dps: 100, t: 10, src: null }, { dps: 60, t: 10, src: null }];
    function tickE(n) { for (let k = 0; k < n; k++) updateEnemies(0.1); }`);
  const hp0 = run('E4.hp'); run('tickE(10)');
  assert.ok(Math.abs(hp0 - run('E4.hp') - 100) < 1);
  run(`P4.keystones.crimson_dance = 1; recomputePlayer();`);
  const hp1 = run('E4.hp'); run('tickE(10)');
  assert.ok(Math.abs(hp1 - run('E4.hp') - 80) < 1);
});

test('Lacerate and Ground Slam hit along their shapes and apply Bleed', () => {
  const { run } = game();
  run(`startGame(CLASSES[5]); P5 = G.player; P5.x = P5.y = 0; P5.skills = [newSkillInstance('lacerate')]; recomputePlayer();
    const s5 = P5.skills[0].st; s5.bleed = 1;
    E5 = []; for (const [x, y] of [[100, 0], [170, 0], [0, 150], [-120, 0]]) { const e = makeEnemy('zombie', x, y, 0); e.hp = e.maxHp = 1e9; e.speed = 0; G.enemies.push(e); E5.push(e); }
    G.hash.clear(); for (const e of G.enemies) G.hash.insert(e);
    castSkill(P5.skills[0], s5);`);
  assert.deepEqual(Array.from(run('E5.map(e => e.bleeds.length > 0)')), [true, true, false, false]);
  run(`P5.equip.weapon = makeNormal('driftwood_club'); P5.skills = [newSkillInstance('ground_slam')]; recomputePlayer(); for (const e of E5) { e.bleeds = []; e.hp = 1e9; }
    castSkill(P5.skills[0], P5.skills[0].st);`);
  assert.deepEqual(Array.from(run('E5.map(e => e.hp < 1e9)')), [true, true, false, false]);
});

test('Crimson Bleed corpses burst onto nearby enemies', () => {
  const { run } = game();
  run(`startGame(CLASSES[5]); const a = makeEnemy('zombie', 500, 500, 0), b = makeEnemy('zombie', 540, 500, 0);
    b.hp = b.maxHp = 1e9; b.res.physical = 0; G.enemies = [a, b]; A6 = a; B6 = b; G.hash.clear(); G.hash.insert(a); G.hash.insert(b);
    a.bleeds = [{ dps: 200, t: 2, src: G.player.skills[0], burst: true }]; killEnemy(a, null);
    for (const d of G.delayed.splice(0)) d.fn();`);
  assert.ok(run('B6.maxHp - B6.hp') >= 199);
});

function supportGame(cls, skill, sup, weapon) {
  const g = game();
  g.run(`startGame(CLASSES[${cls}]); P7 = G.player; P7.x = P7.y = 0; ${weapon ? `P7.equip.weapon = makeNormal('${weapon}');` : ''}
    I7 = newSkillInstance('${skill}'); I7.supports = ['${sup}']; P7.skills = [I7]; recomputePlayer();
    function foe(x, y) { const e = makeEnemy('zombie', x, y, 0); e.hp = e.maxHp = 1e9; e.speed = 0; e.dmg = 0; G.enemies.push(e); return e; }
    function step(n) { for (let k = 0; k < n; k++) { G.time += 1/60; G.hash.clear(); for (const e of G.enemies) if (!e.dead) G.hash.insert(e); updateSkills(1/60); updateProjectiles(1/60); for (const d of G.delayed.splice(0)) d.fn(); } }`);
  return g;
}

test('Ballista Totem: the player stops firing and totems fire instead', () => {
  const { run } = supportGame(1, 'split_arrow', 'ballista_totem');
  run(`foe(300, 0); step(30);`);
  assert.equal(run('(I7.rt.totems || []).length'), 1);
  assert.equal(run('G.projectiles.every(p => Math.hypot(p.ox - I7.rt.totems[0].x, p.oy - I7.rt.totems[0].y) < 1)'), true);
  // walk far away: the oldest totem follows once the cap is reached
  run(`step(80); P7.x = 1500; G.enemies[0].x = 1700; step(120);`);
  assert.ok(run('I7.rt.totems.some(t => Math.hypot(t.x - P7.x, t.y - P7.y) < 60)'));
});

test('Mirage Archer: a ghost appears and fires at reduced damage', () => {
  const { run } = supportGame(1, 'split_arrow', 'mirage_archer');
  run(`foe(300, 0); step(70);`);
  assert.ok(run('!!I7.rt.mirage'));
  assert.ok(run('G.projectiles.some(p => p.s._src === I7.st && Math.abs(p.s.hitTotal - I7.st.hitTotal * 0.6) < 1e-6)'));
});

test('Melee Splash hits around the target; Onslaught speeds you up on kill', () => {
  const { run } = supportGame(2, 'smite', 'melee_splash', 'driftwood_club');
  run(`I7.st.bolts = 0; const a = foe(80, 0), b = foe(140, 0), c = foe(500, 0); A7 = [a, b, c]; step(60);`);
  assert.deepEqual(Array.from(run('A7.map(e => e.hp < 1e9)')), [true, true, false]);
  const g2 = supportGame(2, 'smite', 'onslaught', 'driftwood_club');
  g2.run(`const w = foe(80, 0); w.hp = w.maxHp = 1; step(60);`);
  assert.ok(g2.run('P7.onslaughtT > G.time'));
});
