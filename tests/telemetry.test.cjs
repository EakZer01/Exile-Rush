const test = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

// a game with working storage and a fake fetch that records requests
function statsGame() {
  const g = game();
  g.run(`const _ls = {}; localStorage.getItem = (k) => (k in _ls ? _ls[k] : null); localStorage.setItem = (k, v) => { _ls[k] = String(v); };
    SENT = []; fetch = (url, o) => { SENT.push({ url, o }); return Promise.resolve({ ok: true, status: 201 }); };
    G.settings = Object.assign({}, SETTINGS_DEFAULT);`);
  return g;
}

test('run record matches the table: ids, result, main skill, name only when opted in', () => {
  const { run } = statsGame();
  run(`const Q = G.player; G.time = 412; Q.killedBy = 'Bone Husk'; Q.skills[0].dmgDealt = 900;
    const b = newSkillInstance('arc'); b.dmgDealt = 5000; b.supports = ['inc_aoe']; Q.skills.push(b);
    R = runRecord(false);`);
  assert.equal(run('R.result'), 'dead');
  assert.equal(run('R.cls'), 'marauder');
  assert.equal(run('R.time_s'), 412);
  assert.equal(run('R.main_skill'), 'arc');
  assert.equal(run('R.killer'), 'Bone Husk');
  assert.equal(run('R.build'), run('GAME_BUILD'));
  assert.deepEqual(Array.from(run('R.skills[1].sup')), ['inc_aoe']);
  assert.match(run('R.player'), /^p[a-z0-9]{6,}$/);
  assert.equal(run('R.player'), run('runRecord(false).player'));   // stable per browser
  assert.equal(run('R.name'), null);   // anonymous until the player sets a display name
  run(`G.settings.displayName = 'Mek';`);
  assert.equal(run('runRecord(true).name'), 'Mek');
  run(`G.settings.displayName = 'x'.repeat(30);`);
  assert.equal(run('runRecord(true).name').length, 20);   // capped at the schema limit
});

test('nothing is sent without a configured project, when switched off, or for very short deaths', () => {
  const { run } = statsGame();
  run(`STATS_CONFIG.url = ''; G.time = 300;`);
  assert.equal(run(`sendRunStats(false)`), false);
  run(`STATS_CONFIG.url = 'https://x.supabase.co'; STATS_CONFIG.key = 'anon';`);
  assert.equal(run(`location = { hostname: 'localhost' }; sendRunStats(false)`), false);
  run(`location = undefined;`);
  assert.equal(run(`G.settings.shareStats = false; sendRunStats(false)`), false);
  assert.equal(run(`G.settings.shareStats = true; G.time = 10; sendRunStats(false)`), false);
  assert.equal(run('SENT.length'), 0);
});

test('a finished run is posted to the runs table and leaves the queue once accepted', async () => {
  const { run } = statsGame();
  run(`STATS_CONFIG.url = 'https://x.supabase.co/'; STATS_CONFIG.key = 'anon'; G.time = 905; S1 = sendRunStats(true);`);
  assert.equal(run('S1'), true);
  assert.equal(run('SENT.length'), 1);
  assert.equal(run('SENT[0].url'), 'https://x.supabase.co/rest/v1/runs');
  assert.equal(run('JSON.parse(SENT[0].o.body)[0].result'), 'win');
  assert.equal(run('SENT[0].o.headers.apikey'), 'anon');
  await new Promise((r) => setImmediate(r));
  assert.equal(run('statsQueue().length'), 0);
});

test('unsent runs wait in the queue when offline and go out with the next one', async () => {
  const { run } = statsGame();
  run(`STATS_CONFIG.url = 'https://x.supabase.co'; STATS_CONFIG.key = 'anon';
    fetch = () => Promise.reject(new Error('offline')); G.time = 300; sendRunStats(false);`);
  await new Promise((r) => setImmediate(r));
  assert.equal(run('statsQueue().length'), 1);
  run(`fetch = (url, o) => { SENT.push({ url, o }); return Promise.resolve({ ok: true, status: 201 }); }; sendRunStats(false);`);
  assert.equal(run('JSON.parse(SENT[0].o.body).length'), 2);
  await new Promise((r) => setImmediate(r));
  assert.equal(run('statsQueue().length'), 0);
});
