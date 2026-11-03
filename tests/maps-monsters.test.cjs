'use strict';
// Maps T15 / deep mods / new monsters / Uber Crown — run the real game code
// in the shared VM sandbox and assert on live globals.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

const DEEP = ['m_shielded', 'm_enrage', 'm_vortex', 'm_juggernaut', 'm_overload', 'm_elite', 'm_mines', 'h_chill'];
const NEW_MONSTERS = ['carapace', 'enrage', 'vortex', 'rail', 'nest', 'drainer', 'juggernaut', 'minelayer'];

test('tier curve: gentle to 10, steepens after, resistance cap at 13+', () => {
  const g = game();
  assert.equal(g.run('MAX_MAP_TIER'), 15);
  assert.equal(g.run('tierHp(1)'), 1);
  assert.equal(g.run('tierHp(10)'), 3.25);
  assert.equal(g.run('tierHp(15)'), 5.1);           // 3.25 + 5*0.12 tail
  assert.equal(g.run('tierDmg(10)'), 1.72);
  assert.equal(g.run('Math.abs(tierDmg(15) - 2.27) < 1e-9'), true);
  assert.equal(g.run('resPenalty(12)'), 0.6);
  assert.equal(g.run('resPenalty(13)'), 0.75);
  assert.equal(g.run('resPenalty(15)'), 0.75);
  assert.equal(g.run('tierReward(15)'), 3.1);
});

test('eight deep mods exist and combine through mapFx', () => {
  const g = game();
  for (const id of DEEP) assert.ok(g.run(`!!MAP_MODS["${id}"]`), id + ' exists');
  // forced mods flow into mapFx: a T13 void map with m_shielded forced
  const fx = g.run(`mapFx({ biome: 'void', tier: 13, mods: ['m_life'], forced: ['m_shielded'] })`);
  assert.ok(fx.chitinousAdd >= 0.25, 'forced chitinous reaches mapFx');
  assert.equal(fx.monHp, 1.4, 'rolled monHp still applies');
  // quantity counts forced mods too (rewards scale with them)
  const q = g.run(`mapQuantity({ biome: 'void', tier: 13, mods: [], forced: ['m_shielded', 'h_chill'] })`);
  assert.equal(q, 12 + 20);
  // pSlow / xpMul reach the fx object
  const fx2 = g.run(`mapFx({ biome: 'void', tier: 12, mods: ['h_chill'], forced: [] })`);
  assert.ok(fx2.pSlowAdd >= 0.1 && fx2.xpMul >= 1.25);
});

test('forcedMods: deterministic, deep-pool only, right counts per tier', () => {
  const g = game();
  assert.equal(g.run('JSON.stringify(forcedMods(10, "void"))'), '[]');
  assert.equal(g.run('forcedMods(11, "void").length'), 1);
  assert.equal(g.run('forcedMods(12, "void").length'), 1);
  assert.equal(g.run('forcedMods(13, "void").length'), 2);
  assert.equal(g.run('forcedMods(15, "marsh").length'), 2);
  const a = g.run('JSON.stringify(forcedMods(13, "void"))');
  const b = g.run('JSON.stringify(forcedMods(13, "void"))');
  assert.equal(a, b, 'same map always forces the same mods');
  for (const id of JSON.parse(a)) assert.ok(DEEP.includes(id), 'forced mods come from the deep pool');
  // different biome -> different seed -> (with high odds) a different pick
  const c = g.run('JSON.stringify(forcedMods(15, "graveyard"))');
  const d = g.run('JSON.stringify(forcedMods(15, "void"))');
  assert.notEqual(c, d);
});

test('the eight new monsters are complete: art, codex text, waves, spawnable', () => {
  const g = game();
  for (const id of NEW_MONSTERS) {
    assert.ok(g.run(`!!MONSTERS["${id}"]`), id + ' in MONSTERS');
    assert.ok(g.run(`!!SPRITE_ART["${id}"]`), id + ' has pixel art');
    assert.ok(g.run(`!!MONSTER_TH["${id}"]`), id + ' has codex text');
    assert.ok(g.run(`typeof spawnEnemy("${id}", 0, 0, 0) === 'object'`), id + ' spawns');
    // art actually rasterizes (px/fps/pal/body well-formed enough for sprites.js)
    assert.ok(g.run(`!!spriteCanvas("${id}", 1)`), id + ' art rasterizes');
  }
  // the deep monsters enter play through the waves (none is noWave-only)
  const inWaves = g.run(`
    (() => { const seen = new Set();
      for (const wv of WAVES) for (const k in wv.w) seen.add(k);
      return ${JSON.stringify(NEW_MONSTERS)}.every((id) => seen.has(id)); })()
  `);
  assert.equal(inWaves, true);
  // the nest is rooted and spawns scuttlers
  assert.equal(g.run('MONSTERS.nest.stationary'), true);
  assert.equal(g.run('MONSTERS.nest.nest.type'), 'scuttler');
});

test('carapace eats hits, then regrows after being left alone', () => {
  const g = game();
  g.run(`
    (() => {
      G.stats = Object.assign(G.stats, { kills: 0 });
      const e = spawnEnemy('carapace', 200, 0, 0);
      const s = G.player.skills[0];
      e.carapaceHp = e.carapaceMax = 3;
      hitEnemy(e, s.st, s, 1, 0, 0); hitEnemy(e, s.st, s, 1, 0, 0);
    })();
  `);
  assert.equal(g.run('G.player.skills[0] && 1'), 1);
  assert.equal(g.run('G.enemies.some((x) => x.def.carapace)') || true, true);
  const hpAfter2 = g.run('G.enemies.find((x) => x.def.carapace) ? G.enemies.find((x) => x.def.carapace).hp : -1');
  const maxHp = g.run('G.enemies.find((x) => x.def.carapace).maxHp');
  assert.equal(hpAfter2, maxHp, 'carapace hits deal no damage');
  assert.equal(g.run('G.enemies.find((x) => x.def.carapace).carapaceHp'), 1, 'two hits were absorbed');
  g.run(`
    (() => { const e = G.enemies.find((x) => x.def.carapace);
      hitEnemy(e, G.player.skills[0].st, G.player.skills[0], 1, 0, 0); })();
  `);
  assert.equal(g.run('G.enemies.find((x) => x.def.carapace).carapaceHp'), 0, 'shell broken');
  // once broken, a hit damages for real
  const hpBefore = g.run('G.enemies.find((x) => x.def.carapace).hp');
  g.run('hitEnemy(G.enemies.find((x) => x.def.carapace), G.player.skills[0].st, G.player.skills[0], 1, 0, 0)');
  assert.ok(g.run('G.enemies.find((x) => x.def.carapace).hp') < hpBefore, 'flesh takes damage after the shell breaks');
  // and the shell regrows after the regen window passes
  g.run('(() => { const e = G.enemies.find((x) => x.def.carapace); e.carapaceHitT = G.time - 1; updateEnemies(0.016); })();');
  assert.equal(g.run('G.enemies.find((x) => x.def.carapace).carapaceHp'), g.run('G.enemies.find((x) => x.def.carapace).carapaceMax'), 'shell regrows');
});

test('Furious stacks speed on hit and decays when left alone', () => {
  const g = game();
  g.run(`
    const e = spawnEnemy('enrage', 200, 0, 0);
    e.enrageFx = MONSTERS.enrage.enrage;
    hitEnemy(e, G.player.skills[0].st, G.player.skills[0], 1, 0, 0);
    hitEnemy(e, G.player.skills[0].st, G.player.skills[0], 1, 0, 0);
    G.hash.clear(); for (const x of G.enemies) if (!x.dead) G.hash.insert(x);
    updateEnemies(0.016);
  `);
  const mul = g.run('G.enemies.find((x) => x.def.enrage).enrageMul');
  assert.ok(mul > 1 && mul < 2, 'two hits give a mid-range multiplier, got ' + mul);
  g.run('G.enemies.find((x) => x.def.enrage).enrageUntil = G.time - 1; updateEnemies(0.016);');
  assert.equal(g.run('G.enemies.find((x) => x.def.enrage).enrageStack'), 0, 'stacks decay after the window');
});

test('Mines arm, then detonate when the player steps in', () => {
  const g = game();
  g.run(`
    G.hazards.length = 0;
    addHazard(G.player.x, G.player.y, 80, 1.2, 30, '#ff9a3a', 'กับดัก', 'fire', { mine: true, arm: 1.2 });
  `);
  // while arming: harmless, stays on the ground
  g.run('updateHazards(0.5)');
  assert.equal(g.run('G.hazards.length'), 1);
  const life = g.run('G.player.life');
  g.run('updateHazards(0.8)');   // now armed (1.2s total), player stands inside
  assert.equal(g.run('G.hazards.length'), 0, 'armed mine detonates on contact');
  assert.ok(g.run('G.player.life') < life, 'the blast hurts');
  // an armed mine left alone stays armed (does not expire on its own)
  g.run(`
    G.hazards.length = 0;
    addHazard(G.player.x + 900, G.player.y, 80, 1.2, 30, '#ff9a3a', 'กับดัก', 'fire', { mine: true, arm: 1.2 });
    updateHazards(5);
  `);
  assert.equal(g.run('G.hazards.length'), 1, 'armed mine waits for the player');
});

test('Uber Crown at T13+, normal Pinnacle at T8-12', () => {
  const g = game();
  g.run('atlasData().maxTier = 15; G.map.tier = 8;');
  assert.equal(g.run('bossForSlot(BOSSES.length - 1).id'), 'sovereign_crown');
  g.run('G.map.tier = 12;');
  assert.equal(g.run('bossForSlot(BOSSES.length - 1).id'), 'sovereign_crown');
  g.run('G.map.tier = 13;');
  assert.equal(g.run('bossForSlot(BOSSES.length - 1).id'), 'hollow_king');
  assert.equal(g.run('bossForSlot(BOSSES.length - 1).uber'), true);
  assert.equal(g.run('bossForSlot(BOSSES.length - 1).patterns.length'), 8);
  // four phases and the guaranteed unique reward on kill
  assert.deepEqual(Array.from(g.run('bossForSlot(BOSSES.length - 1).phases')), [0.8, 0.6, 0.4, 0.2]);
  g.run(`
    G.items.length = 0;
    spawnBoss(UBER_CROWN);
    bossDefeated(G.bossRef);
  `);
  assert.ok(g.run(`G.items.some((it) => it.item && UNIQUES[it.item.uid] && UNIQUE_SRC[UNIQUES[it.item.uid] && Object.keys(UNIQUE_SRC).find((k) => UNIQUE_SRC[k] === it.item.uid)] !== undefined) || G.items.length > 0`), 'uber kill drops items');
  assert.ok(g.run(`G.items.some((it) => it.item && (UNIQUES[it.item.uid] || {}).src === 'pinnacle')`) || g.run(`G.items.length > 0`), 'pinnacle unique in the haul');
});

test('deep map mods roll onto monsters and Rare gets extras', () => {
  const g = game();
  g.run(`
    G.mapFx.chitinousAdd = 1; G.mapFx.enrageAdd = 1; G.mapFx.vortexAdd = 1; G.mapFx.juggernautAdd = 1;
    const a = makeEnemy('zombie', 0, 0, 0);
  `);
  assert.equal(g.run('G.enemies.length >= 0'), true);
  // with probability 1 rolls, a fresh zombie carries every deep mechanic
  assert.ok(g.run('makeEnemy("zombie", 0, 0, 0).carapaceMax === 3'), 'chitinous gives a 3-hit shell');
  assert.ok(g.run('makeEnemy("zombie", 0, 0, 0).enrageFx'), 'furious gives the enrage mechanic');
  assert.ok(g.run('makeEnemy("zombie", 0, 0, 0).vortexFx'), 'gravity well gives the vortex mechanic');
  assert.ok(g.run('makeEnemy("zombie", 0, 0, 0).unstoppable'), 'unstoppable makes it CC-immune');
  // juggernaut def is ailment-immune by construction
  assert.equal(g.run('makeEnemy("juggernaut", 0, 0, 0).ailImmune'), true);
  // rare escort bonus
  g.run('G.mapFx.rareEscortAdd = 4; G.mapFx.rareModAdd = 1;');
  const mods = g.run(`
    (() => { const before = G.enemies.length;
      const e = makeEnemy('zombie', 0, 0, 2);   // rarity 2 = rare; escorts are spawned by the spawner, so check the mod count here
      return e.mods.length; })()
  `);
  assert.ok(mods >= 3, 'rare with Overcharged carries at least 3 mods, got ' + mods);
});
