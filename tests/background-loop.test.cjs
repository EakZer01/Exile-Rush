const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test('losing focus clears all held controls without pausing or changing Flicker preference', () => {
  const { run } = game();
  run(`
    for (const k in G.input) G.input[k] = true;
    G.input.joy = {x:1,y:0}; G.input.joyOrigin = {x:50,y:50};
    let released = false; G.releaseTouch = () => { released = true; };
    P.flickerPaused = true; document.focused = false; onGameBlur();
  `);
  assert.equal(run('G.state'), 'play');
  assert.equal(run('Object.values(G.input).every(v => v === false || v === null)'), true);
  assert.equal(run('released'), true);
  assert.equal(run('P.flickerPaused'), true);
});

test('background timer advances combat and banks choices with no animation frames', () => {
  const { run, clock, timers } = game();
  run(`
    document.hidden = true; document.focused = false;
    G.pendingLevels = 2; G.pendingChests = 1; G.pendingAscend = 1; G.pendingRitual = true;
    startBackgroundClock();
  `);
  assert.equal(timers.size, 1);
  const pulse = [...timers.values()][0].fn;
  for (let i = 1; i <= 30; i++) { clock.now = i * 100; pulse(); }
  assert.ok(run('G.time') > 2.8);
  assert.ok(run('inst.dmgDealt') > 0);
  assert.equal(run('G.state'), 'play');
  assert.equal(run('G.pendingLevels'), 2);
  assert.equal(run('G.pendingChests'), 1);
  assert.equal(run('G.pendingAscend'), 1);
  assert.equal(run('G.pendingRitual'), true);
  run('G.pendingRitual = false; G.pendingAscend = 0; G.pendingChests = 0; document.hidden = false; document.focused = true; onGameVisibilityChange();');
  clock.now += 20;
  run('advanceGame(performance.now());');
  assert.equal(run('G.state'), 'levelup');
});

test('animation frames and background ticks share time without double counting or clock reversal', () => {
  const { run } = game();
  run('update = dt => { G.time += dt; }; advanceGame(1000); advanceGame(1000); advanceGame(990);');
  near(run('G.time'), 1);
  assert.equal(run('G.lastTs'), 1000);
  run('advanceGame(2000);');
  near(run('G.time'), 2);
});

test('a throttled timer retains elapsed time and catches up with bounded physics steps', () => {
  const { run } = game();
  run(`
    const steps = []; update = dt => { steps.push(dt); G.time += dt; };
    advanceGame(10000);
  `);
  near(run('G.time'), 4);
  near(run('G.simDebt'), 6);
  run('advanceGame(10000); advanceGame(10000);');
  near(run('G.time'), 10);
  near(run('G.simDebt'), 0);
  assert.equal(run('steps.every(dt => dt > 0 && dt <= 1/60)'), true);
});

test('hit-stop slows only its actual duration during a delayed tick', () => {
  const { run } = game();
  run('update = dt => { G.time += dt; }; G.hitStop = 0.1; advanceGame(200);');
  near(run('G.time'), 0.115);
  near(run('G.hitStop'), 0);
});

test('manual pause and decision screens remain paused, and resume excludes time spent paused', () => {
  const { run, clock } = game();
  run('update = dt => { G.time += dt; };');
  for (const state of ['paused', 'inventory', 'levelup', 'socket', 'ritual', 'settings', 'victory']) {
    clock.now += 60000;
    run(`G.state = '${state}'; advanceGame(performance.now());`);
    near(run('G.time'), 0);
    near(run('G.simDebt'), 0);
  }
  run("G.state = 'paused'; resume();");
  clock.now += 100;
  run('advanceGame(performance.now());');
  near(run('G.time'), 0.1);
});

test('changing state during a catch-up stops immediately and clears remaining debt', () => {
  const { run } = game();
  run("update = dt => { G.time += dt; G.state = 'levelup'; }; advanceGame(10000);");
  near(run('G.time'), 1/60);
  near(run('G.simDebt'), 0);
});

test('returning with delayed ticks catches up before showing a banked level-up', () => {
  const { run } = game();
  run('G.pendingLevels = 1; updateSpawner = () => {}; advanceGame(10000);');
  assert.equal(run('G.state'), 'play');
  near(run('G.time'), 4);
  run('advanceGame(10000); advanceGame(10000);');
  assert.equal(run('G.state'), 'levelup');
  assert.ok(run('G.time') > 9.9);
});

test('tab-switch shortcuts do not open pause or toggle skills, but bare Tab still pauses', () => {
  const { run } = game();
  run(`
    let prevented = false;
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) onKey({code:'Tab', [modifier]:true, preventDefault(){prevented=true;}}, true);
    onKey({code:'KeyT', ctrlKey:true, preventDefault(){}}, true);
  `);
  assert.equal(run('G.state'), 'play');
  assert.equal(run('P.flickerPaused'), false);
  assert.equal(run('prevented'), false);
  run('key("Tab");');
  assert.equal(run('G.state'), 'paused');
});

test('worker lifecycle starts and stops its timer with visibility and falls back safely on error', () => {
  const { run, timers } = game();
  run(`
    globalThis.Blob = class {};
    let revoked = 0;
    globalThis.URL = {createObjectURL: () => 'blob:clock', revokeObjectURL() {revoked++;}};
    globalThis.Worker = class { constructor() {this.messages=[];this.stopped=false;} postMessage(v){this.messages.push(v);} terminate(){this.stopped=true;} };
    startBackgroundClock(); const worker = _backgroundClock.worker;
    document.focused = false; onGameBlur();
    document.focused = true; onGameVisibilityChange();
  `);
  assert.deepEqual(Array.from(run('worker.messages')), [false, true, false]);
  assert.equal(run('revoked'), 1);
  run('worker.onerror({preventDefault(){}}); startBackgroundClock();');
  assert.equal(run('worker.stopped'), true);
  assert.equal(run('_backgroundClock.worker'), null);
  assert.equal(timers.size, 1);
});

test('failed worker creation falls back once, and foreground ignores background pulses', () => {
  const { run, clock, timers } = game();
  run(`
    globalThis.Blob = class {};
    globalThis.URL = {createObjectURL: () => 'blob:clock', revokeObjectURL(){}};
    globalThis.Worker = class {constructor(){throw Error('blocked');}};
    startBackgroundClock(); startBackgroundClock();
  `);
  assert.equal(timers.size, 1);
  clock.now = 1000;
  [...timers.values()][0].fn();
  near(run('G.time'), 0);
  run('update = dt => { G.time += dt; }; advanceGame(performance.now());');
  near(run('G.time'), 1);
});
