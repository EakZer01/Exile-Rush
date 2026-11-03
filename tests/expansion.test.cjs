const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

test('every expansion skill can deal damage, evolve, render an icon and use matching weapons', () => {
  const { run } = game();
  const results = run(`(() => {
    const out = [];
    for (const d of EXPANSION_SKILLS) {
      startGame(CLASSES[0]);
      const p = G.player, i = newSkillInstance(d.id); i.level = 12; i.evo = true; p.skills = [i];
      if (d.weapons) p.equip.weapon = makeNormal(Object.keys(BASES).find(k => BASES[k].w && d.weapons.includes(BASES[k].w.type)));
      recomputePlayer();
      for (let k = 0; k < 8; k++) { const e = makeEnemy('zombie', 65 + k * 20, (k % 3 - 1) * 15, 0); e.hp = e.maxHp = 1e8; e.speed = 0; e.dmg = 0; G.enemies.push(e); }
      for (let k = 0; k < 240; k++) { p.life = p.maxLife; update(1/60); }
      skillIcon(d.id); render();
      out.push({ id: d.id, valid: !i.st.disabled && Number.isFinite(i.dmgDealt) && i.dmgDealt > 0 && EVOLUTIONS[d.id].req.every(s => SUPPORTS[s]) });
    } return out;
  })()`);
  assert.equal(results.length, 12);
  assert.deepEqual(Array.from(results).filter(r => !r.valid), []);
});

test('Spell Totem and Multiple Totems work in either order, reject bow skills and apply Ancestral Bond', () => {
  const { run } = game();
  for (const order of [['spell_totem', 'multiple_totems'], ['multiple_totems', 'spell_totem']]) {
    run(`startGame(CLASSES[0]); G.player.skills[0].supports = ${JSON.stringify(order)}; recomputePlayer();`);
    assert.equal(run('G.player.skills[0].st.totemMax'), 3);
    assert.equal(run('activeSupports(G.player.skills[0]).active.length'), 2);
    run(`G.player.keystones.ancestral_bond = 1; recomputePlayer();`);
    assert.equal(run('G.player.skills[0].st.totemMax'), 4);
  }
  assert.notEqual(run(`supportBlockReason('spell_totem', newSkillInstance('split_arrow'), true)`), '');
  run(`const bow = newSkillInstance('split_arrow'); bow.supports = ['spell_totem'];`);
  assert.equal(run('activeSupports(bow).active.length'), 0);
});

test('conversion moves existing damage and Brutality still removes converted damage', () => {
  const { run } = game();
  run(`startGame(CLASSES[0]); const s = newSkillInstance('ice_spear'); s.supports = ['cold_to_fire']; G.player.skills = [s]; recomputePlayer();`);
  assert.equal(run('s.st.hit.fire > 0 && s.st.hit.cold > 0'), true);
  run(`s.id = 'ethereal_knives'; s.supports = ['physical_to_lightning']; recomputePlayer();`);
  assert.ok(Math.abs(run('s.st.hit.physical - s.st.hit.lightning')) < 1e-6);
  run(`s.supports.push('brutality'); recomputePlayer();`);
  assert.equal(run('s.st.hit.lightning || 0'), 0);
});

test('Ancestral Call hits exactly two extra targets; Life Gain on Hit is rate limited', () => {
  const { run } = game();
  run(`startGame(CLASSES[2]); const p = G.player, i = newSkillInstance('heavy_strike'); i.supports = ['ancestral_call', 'life_gain_on_hit']; p.skills = [i]; recomputePlayer();
    const es = []; G.enemies = []; for (let n = 0; n < 8; n++) { const e = makeEnemy('zombie', 70 + n * 3, 0, 0); e.hp = e.maxHp = 1e9; es.push(e); G.enemies.push(e); }
    G.hash.clear(); for (const e of es) G.hash.insert(e); p.life = p.maxLife / 2; castStrike(i, i.st);`);
  assert.equal(run('es.filter(e => e.hp < e.maxHp).length'), 3);
  run(`for (let n = 0; n < 30; n++) hitEnemy(es[0], i.st, i, 1, p.x, p.y);`);
  assert.ok(Math.abs(run('p.life / p.maxLife') - 0.55) < 1e-9);
  run(`G.time += 1.01; hitEnemy(es[0], i.st, i, 1, p.x, p.y);`);
  assert.ok(Math.abs(run('p.life / p.maxLife') - 0.56) < 1e-9);
});

test('Infernal Blow bursts use skill damage and do not mark secondary targets', () => {
  const { run } = game();
  run(`startGame(CLASSES[2]); const i = newSkillInstance('infernal_blow'); G.player.skills = [i]; recomputePlayer();
    G.enemies = []; const a = makeEnemy('zombie', 70, 0, 0), b = makeEnemy('zombie', 100, 0, 0); a.hp = 1; b.hp = b.maxHp = 1e9; G.enemies.push(a, b); G.hash.clear(); G.hash.insert(a); G.hash.insert(b);
    hitEnemy(a, i.st, i, 1, 0, 0); for (const d of G.delayed.splice(0)) d.fn();`);
  assert.equal(run('b.hp < b.maxHp'), true);
  assert.equal(run('!!b.infernal'), false);
});

test('Precise Technique prevents even forced critical hits on attacks but allows spell crits', () => {
  const { run } = game();
  run(`startGame(CLASSES[2]); G.player.keystones.precise_technique = 1; G.player.skills = [newSkillInstance('heavy_strike'), newSkillInstance('fireball')]; recomputePlayer();`);
  assert.equal(run('G.player.skills[0].st.critChance'), 0);
  assert.ok(run('G.player.skills[1].st.critChance') > 0);
  // Diamond buffs cannot bypass noCrit at hit time.
  run(`const p = G.player, i = p.skills[0]; const a = enemy(80, 0); a.res.physical = 0; G.buffs.diamond = 5; const before = a.hp; hitEnemy(a, i.st, i, 1, 0, 0);`);
  assert.ok(Math.abs(run('before - a.hp - i.st.hitTotal')) < 1e-4);
});

test('new passives join their Mastery paths and all new Supports have icon symbols', () => {
  const { run } = game();
  assert.equal(run(`EXPANSION_PASSIVES.every(([id, name, th, icon, path]) => PASSIVES[id] && PASSIVE_PATH[id] === path && RUN_PATHS[path].passives.includes(id))`), true);
  assert.equal(run(`EXPANSION_SUPPORTS.every(s => SUPPORT_ICON[s.id] && (supportIcon(s.id), true))`), true);
  run(`startGame(CLASSES[0]); G.player.passives.heart_of_ice = 3; G.player.passives.arcane_focus = 2; recomputePlayer();`);
  assert.ok(run('G.player.mods.incCold') >= 0.36);
  assert.ok(run('G.player.mods.esInc') >= 0.4);
});
