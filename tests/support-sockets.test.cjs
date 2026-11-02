const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

function socketsGame() {
  const g = game();
  g.run(`
    function upgrade(tier) { G.state = 'inventory'; return useSkillJeweller(inst, 'jeweller' + tier); }
    function insert(sid, index) {
      G.state = 'socket'; G.pendingLevels = 1; G.levelIsChest = false; G.choiceKind = 'level';
      G.socketCtx = { mode: 'support', supId: sid }; return applySocket(inst, index);
    }
  `);
  return g;
}

test('every new skill starts with two independent slots, including every class starter', () => {
  const { run } = game();
  assert.equal(run('Object.keys(SKILLS).every(id => skillSockets(newSkillInstance(id)).cap === 2)'), true);
  assert.equal(run('CLASSES.every(cls => { startGame(cls); return G.player.skills.every(s => s.sockets === 2); })'), true);
});

test('each Jeweller sets a two-slot skill directly to its tier and consumes only one matching orb', () => {
  for (const tier of [3, 4, 5, 6]) {
    const { run } = socketsGame();
    run('for (const id in JEWELLERS) P.currency[id] = 2;');
    assert.equal(run(`upgrade(${tier})`), true);
    assert.equal(run('skillSockets(inst).cap'), tier);
    assert.equal(run(`P.currency.jeweller${tier}`), 1);
    assert.equal(run(`Object.keys(JEWELLERS).filter(id => id !== 'jeweller${tier}').every(id => P.currency[id] === 2)`), true);
  }
});

test('2 → 3 → 4 → 5 → 6 progression works and repeat clicks cannot consume another orb', () => {
  const { run } = socketsGame();
  run('for (const id in JEWELLERS) P.currency[id] = 2;');
  for (const tier of [3, 4, 5, 6]) {
    assert.equal(run(`upgrade(${tier})`), true);
    assert.equal(run(`upgrade(${tier})`), false);
    assert.equal(run(`P.currency.jeweller${tier}`), 1);
    assert.equal(run('inst.sockets'), tier);
  }
});

test('a lower or missing Jeweller never downgrades a skill or consumes currency', () => {
  const { run } = socketsGame();
  assert.equal(run('upgrade(6)'), false);
  run('P.currency.jeweller5 = 1; P.currency.jeweller3 = 2; P.currency.jeweller4 = 2;');
  assert.equal(run('upgrade(5)'), true);
  assert.equal(run('upgrade(3)'), false);
  assert.equal(run('upgrade(4)'), false);
  assert.equal(run('P.currency.jeweller3'), 2);
  assert.equal(run('P.currency.jeweller4'), 2);
  assert.equal(run('inst.sockets'), 5);
});

test('Jewellers require a valid owned skill, tier and paused inventory action', () => {
  const { run } = socketsGame();
  run('P.currency.jeweller6 = 1; G.state = "play";');
  assert.equal(run("useSkillJeweller(inst, 'jeweller6')"), false);
  run('G.state = "inventory";');
  assert.equal(run("useSkillJeweller(newSkillInstance('fireball'), 'jeweller6')"), false);
  assert.equal(run("useSkillJeweller(inst, 'jeweller9')"), false);
  assert.equal(run("useSkillJeweller(undefined, 'jeweller6')"), false);
  assert.equal(run('P.currency.jeweller6'), 1);
});

test('upgrading one skill leaves other skills at two slots and survives equipment swaps', () => {
  const { run } = socketsGame();
  run("const second = newSkillInstance('fireball'); P.skills.push(second); P.currency.jeweller6 = 1;");
  assert.equal(run('upgrade(6)'), true);
  run("P.equip.weapon = makeNormal('short_bow'); P.equip.body = makeNormal('plate_vest'); recomputePlayer();");
  assert.equal(run('skillSockets(inst).cap'), 6);
  assert.equal(run('skillSockets(second).cap'), 2);
  run('for (const k of ITEM_SLOTS) P.equip[k] = null; recomputePlayer();');
  assert.equal(run('skillSockets(inst).cap'), 6);
  assert.equal(run('skillSockets(second).cap'), 2);
});

test('supports of any color work together while skill tag requirements still apply', () => {
  const { run } = socketsGame();
  assert.equal(run("insert('added_lightning')"), true);
  assert.equal(run("insert('melee_physical')"), true);
  assert.equal(run("insert('added_cold')"), false);
  assert.equal(run('activeSupports(inst).active.length'), 2);
  run('P.currency.jeweller4 = 1;');
  assert.equal(run('upgrade(4)'), true);
  assert.equal(run("insert('added_cold')"), true);
  assert.equal(run("insert('added_fire')"), true);
  assert.equal(run("insert('spell_echo', 0)"), false);
  assert.equal(run('activeSupports(inst).active.length'), 4);
});

test('tag-dependent supports activate regardless of their position after a replacement', () => {
  const { run } = socketsGame();
  assert.equal(run("insert('inc_aoe')"), true);
  assert.equal(run("insert('added_fire')"), true);
  assert.equal(run("insert('fire_pen', 0)"), true);
  assert.equal(run('activeSupports(inst).active.length'), 2);
  assert.ok(run('inst.st.pen.fire') > 0);
  run('const beforePen = inst.st.pen.fire; inst.supports.reverse(); recomputePlayer();');
  assert.equal(run('inst.st.pen.fire'), run('beforePen'));
});

test('already-owned supports cannot be offered as replacements or lose their awakening', () => {
  const { run } = socketsGame();
  assert.equal(run("insert('added_fire')"), true);
  run("inst.awakened = ['added_fire']; recomputePlayer(); const beforeHit = inst.st.hitTotal;");
  assert.equal(run("canSocketSupport('added_fire', inst)"), false);
  assert.equal(run("insert('added_fire', 0)"), false);
  assert.equal(run('G.pendingLevels'), 1);
  assert.equal(run("inst.awakened.includes('added_fire')"), true);
  assert.equal(run('inst.st.hitTotal'), run('beforeHit'));
});

test('inactive supports still occupy sockets and cannot permit an extra appended gem', () => {
  const { run } = socketsGame();
  assert.equal(run("insert('inc_aoe')"), true);
  assert.equal(run("insert('added_cold')"), true);
  assert.equal(run("insert('hypothermia', 0)"), true);
  assert.equal(run("insert('added_fire', 1)"), true);
  assert.equal(run('activeSupports(inst).active.length'), 1);
  assert.equal(run("insert('fortify')"), false);
  assert.equal(run('inst.supports.length'), 2);
  assert.equal(run('G.pendingLevels'), 1);
  assert.equal(run("insert('fire_pen', 0)"), true);
  assert.equal(run('activeSupports(inst).active.length'), 2);
  assert.ok(run('inst.st.pen.fire') > 0);
});

test('legacy gems outside actual slots cannot supply tags or consume replacement rewards', () => {
  const { run } = socketsGame();
  run("inst.supports = ['inc_aoe', 'fortify', 'added_fire']; recomputePlayer();");
  assert.equal(run("skillTags(inst).has('Fire')"), false);
  assert.equal(run("insert('fire_pen', 0)"), false);
  assert.equal(run("insert('added_lightning', 2)"), false);
  assert.equal(run('G.pendingLevels'), 1);
  run('P.currency.jeweller3 = 1;');
  assert.equal(run('upgrade(3)'), true);
  assert.equal(run("insert('fire_pen', 0)"), true);
  assert.equal(run('activeSupports(inst).active.length'), 3);
  assert.ok(run('inst.st.pen.fire') > 0);
});

test('six-slot skills accept exactly six supports and block overflow, duplicates and stale clicks', () => {
  const { run } = socketsGame();
  run('P.currency.jeweller6 = 1;');
  assert.equal(run('upgrade(6)'), true);
  for (const sid of ['inc_aoe', 'added_fire', 'added_cold', 'melee_physical', 'fortify', 'added_lightning']) assert.equal(run(`insert('${sid}')`), true);
  assert.equal(run("insert('added_chaos')"), false);
  assert.equal(run("insert('added_fire')"), false);
  assert.equal(run("insert('added_chaos', 0)"), true);
  assert.equal(run('applySocket(inst, 0)'), false);
  assert.equal(run('G.pendingLevels'), 0);
  assert.equal(run('inst.supports.length'), 6);
  assert.equal(run('activeSupports(inst).active.length'), 6);
});

test('legacy excess supports stay inactive until slots are upgraded; malformed counts never exceed six', () => {
  const { run } = socketsGame();
  run("inst.supports = ['inc_aoe', 'added_fire', 'added_cold', 'melee_physical', 'fortify', 'added_lightning']; recomputePlayer();");
  assert.equal(run('activeSupports(inst).active.length'), 2);
  assert.equal(run('activeSupports(inst).inactive.length'), 4);
  run('P.currency.jeweller6 = 1;');
  assert.equal(run('upgrade(6)'), true);
  assert.equal(run('activeSupports(inst).active.length'), 6);
  run("inst.sockets = 999; inst.supports.push('added_chaos'); recomputePlayer();");
  assert.equal(run('skillSockets(inst).cap'), 6);
  assert.equal(run('activeSupports(inst).active.length'), 6);
  run('inst.sockets = NaN;');
  assert.equal(run('skillSockets(inst).cap'), 2);
});

test('tiered Jewellers have strictly decreasing drop frequencies and all drops resolve to pickups', () => {
  const { run } = game();
  const counts = run(`(() => {
    Math.random = mulberry32(20261103);
    const counts = Object.fromEntries(Object.keys(JEWELLERS).map(id => [id, 0]));
    for (let i = 0; i < 100000; i++) counts[randomJeweller()]++;
    return counts;
  })()`);
  assert.ok(counts.jeweller3 > counts.jeweller4 && counts.jeweller4 > counts.jeweller5 && counts.jeweller5 > counts.jeweller6 && counts.jeweller6 > 0);
  assert.equal(run(`Array.from({length:10000}, () => randomCraftOrb()).every(id => !!PICKUPS[id])`), true);
  assert.equal(run(`['fusing','chroma','jeweller'].every(id => !CRAFT_ORBS[id] && !CRAFT[id] && !PICKUPS[id])`), true);
});

test('picking up each Jeweller credits only its own tier and Jewellers cannot craft equipment', () => {
  const { run } = game();
  for (const tier of [3, 4, 5, 6]) {
    run(`collectPickup('jeweller${tier}', 0, 0, {kind: 'jeweller${tier}'});`);
    assert.equal(run(`P.currency.jeweller${tier}`), 1);
    assert.equal(run(`CRAFT['jeweller${tier}']`), undefined);
  }
});

test('new equipment and corruption no longer create sockets or links', () => {
  const { run } = game();
  assert.equal(run(`Object.keys(BASES).every(id => { const it = makeNormal(id); return !('sockets' in it) && !('links' in it); })`), true);
  assert.equal(run(`['normal','magic','rare','unique'].every(r => ITEM_SLOTS.filter(s => s !== 'ring2').every(slot => {
    const it = makeItem(r, slot, 900, 6); corruptItem(it); return !('sockets' in it) && !('links' in it);
  }))`), true);
});

test('legacy stash sockets are migrated without changing gear stats or progress', () => {
  const { run } = game();
  run(`
    const oldItem = makeNormal('plate_vest'); oldItem.quality = 15; oldItem.sockets = ['R','B','G']; oldItem.links = [3];
    const saved = freshMeta(); saved.shards = 42; saved.stash = [oldItem];
    Meta = null; localStorage.getItem = key => key === META_KEY ? JSON.stringify(saved) : null;
    localStorage.setItem = (key, value) => { globalThis.savedMeta = value; };
    loadMeta();
  `);
  assert.equal(run('Meta.shards'), 42);
  assert.equal(run('Meta.stash[0].quality'), 15);
  assert.equal(run("'sockets' in Meta.stash[0] || 'links' in Meta.stash[0]"), false);
  assert.equal(run("'sockets' in JSON.parse(savedMeta).stash[0]"), false);
});

test('slot panel shows all four upgrades and no colored sockets or equipment host picker', () => {
  const { run } = game();
  const html = run('skillSocketsPanelHtml()');
  for (const tier of [3, 4, 5, 6]) assert.ok(html.includes(`data-jeweller="jeweller${tier}"`));
  assert.ok(!html.includes('data-host') && !html.includes('psock-R') && !html.includes('sring-'));
  assert.ok(html.includes('Support 0/2'));
});

test('all skill behaviors run with six independent slots and finite damage', () => {
  const { run } = game();
  const results = run(`(() => {
    const results = [];
    for (const id of Object.keys(SKILLS)) {
      startGame(CLASSES[2]);
      const player = G.player, skill = newSkillInstance(id); player.skills = [skill]; skill.level = 20; skill.evo = true;
      const ws = SKILLS[id].weapons; if (ws) player.equip.weapon = makeNormal(Object.keys(BASES).find(b => BASES[b].w && ws.includes(BASES[b].w.type)));
      player.currency.jeweller6 = 1; G.state = 'inventory'; useSkillJeweller(skill, 'jeweller6'); G.state = 'play';
      for (const sid of Object.keys(SUPPORTS)) if (!supportBlockReason(sid, skill)) skill.supports.push(sid);
      recomputePlayer();
      for (let k = 0; k < 12; k++) { const e = makeEnemy('zombie', 90 + k * 8, (k % 3 - 1) * 40, 0); e.hp = e.maxHp = 1e8; e.dmg = 0; e.speed = 0; G.enemies.push(e); }
      for (let k = 0; k < 120; k++) { player.life = player.maxLife; update(1/60); }
      results.push({id, valid: !skill.st.disabled && Number.isFinite(skill.dmgDealt) && Number.isFinite(skill.st.hitTotal) && activeSupports(skill).active.length <= 6});
    }
    return results;
  })()`);
  assert.equal(results.length, 33);
  assert.deepEqual(Array.from(results).filter(r => !r.valid), []);
});
