const test = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

const cls = (id) => `CLASSES.find((c) => c.id === '${id}')`;

test('every class with a fixed start offers three working gems, its classic start first', () => {
  const { run } = game();
  for (const id of ['witch', 'ranger', 'marauder', 'templar', 'shadow', 'duelist']) {
    const opts = Array.from(run(`startOptions(${cls(id)})`));
    assert.equal(opts.length, 3, id);
    assert.equal(opts[0], run(`${cls(id)}.start`), id);
    for (const s of opts) assert.equal(run(`canStartWith('${s}')`), true, s);
  }
  assert.deepEqual(Array.from(run(`startOptions(${cls('scion')})`)), []);
});

test('the picked gem starts the run, with a weapon it can use', () => {
  const { run } = game();
  run(`setStartPick(${cls('marauder')}, 'boneshatter'); startGame(${cls('marauder')});`);
  assert.equal(run('G.player.skills[0].id'), 'boneshatter');
  assert.equal(run('G.player.skills[0].st.disabled'), false);
  // a dagger gem on a class that starts with a wand gets a dagger-compatible weapon
  run(`setStartPick(${cls('shadow')}, 'viper_strike'); startGame(${cls('shadow')});`);
  assert.equal(run('G.player.skills[0].id'), 'viper_strike');
  assert.ok(run(`SKILLS.viper_strike.weapons.includes(G.player.weapon.wtype)`));
  assert.equal(run('G.player.skills[0].st.disabled'), false);
});

test('Daily and Weekly ignore the pick; unknown or locked picks fall back to the classic start', () => {
  const { run } = game();
  run(`setStartPick(${cls('witch')}, 'raise_zombie');`);
  assert.equal(run(`startSkillFor(${cls('witch')}, { daily: 20261104 })`), 'fireball');
  assert.equal(run(`startSkillFor(${cls('witch')}, { weekly: 202645 })`), 'fireball');
  assert.equal(run(`startSkillFor(${cls('witch')})`), 'raise_zombie');
  assert.equal(run(`setStartPick(${cls('witch')}, 'cyclone')`), false);   // not one of the witch's options
  run(`loadMeta().startPick.witch = 'not_a_gem';`);
  assert.equal(run(`startSkillFor(${cls('witch')})`), 'fireball');
});

test('a gem mastered to Lv 10 joins the options of classes that share its colour', () => {
  const { run } = game();
  assert.equal(run('STARTER_MASTERY_LV'), 10);
  run(`gemData('ice_spear').lv = STARTER_MASTERY_LV - 1;`);
  assert.equal(run(`startOptions(${cls('witch')}).includes('ice_spear')`), false);   // Lv 9 is not enough
  run(`gemData('ice_spear').lv = STARTER_MASTERY_LV;`);
  assert.equal(run(`startOptions(${cls('witch')}).includes('ice_spear')`), true);     // blue gem, Witch is blue
  assert.equal(run(`startOptions(${cls('marauder')}).includes('ice_spear')`), false); // Marauder is red
  run(`gemData('detonate_dead').lv = STARTER_MASTERY_LV;`);
  assert.equal(run(`startOptions(${cls('witch')}).includes('detonate_dead')`), false); // can't work alone
});
