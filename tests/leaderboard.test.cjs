'use strict';
// Leaderboard / Weekly / Echo-capstone tests — run the real game code in the
// shared VM sandbox (tests/helpers/game.cjs) and assert on live globals.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

test('weeklyKey is stable, well-formed and follows ISO weeks', () => {
  const g = game();
  g.run(`
    const RealDate = Date;
    globalThis.withDate = (iso, fn) => {
      const Fixed = class extends RealDate {
        constructor(...a) { super(...(a.length ? a : [iso])); }
        static now() { return new RealDate(iso).getTime(); }
      };
      const D = Date; Date = Fixed;
      try { return fn(); } finally { Date = D; }
    };
  `);
  // the same clock always yields the same key
  const a = g.run('weeklyKey()'), b = g.run('weeklyKey()');
  assert.equal(a, b);
  assert.equal(typeof a, 'number');
  assert.ok(a >= 202601 && a <= 202699, 'key looks like year*100+week');
  // one day apart inside the same ISO week -> same key; next ISO week -> key+1
  assert.equal(g.run(`withDate('2026-11-04T10:00:00', weeklyKey)`), g.run(`withDate('2026-11-05T08:00:00', weeklyKey)`));
  assert.equal(g.run(`withDate('2026-11-04T10:00:00', weeklyKey)`) + 1, g.run(`withDate('2026-11-10T10:00:00', weeklyKey)`));
  // 2026-01-01 is a Thursday: ISO week 1 of 2026
  assert.equal(g.run(`withDate('2026-01-01T12:00:00', weeklyKey)`), 202601);
});

test('weeklySetup is deterministic and spicier than the daily', () => {
  const g = game();
  const once = g.run('JSON.stringify(weeklySetup())');
  const again = g.run('JSON.stringify(weeklySetup())');
  assert.equal(once, again);
  const w = JSON.parse(once);
  assert.ok(w.map.tier >= 3 && w.map.tier <= 5, 'weekly tier is 3-5');
  assert.ok(w.map.mods.length >= 1);
  // same seed -> the same map label every time this week
  assert.equal(g.run('mapLabel(weeklySetup().map)'), g.run('mapLabel(weeklySetup().map)'));
});

test('first weekly win of the week pays shards exactly once', () => {
  const g = game();
  const first = g.run(`
    (() => { const res = settleRun({ win: true, hc: false, daily: 0, weekly: weeklyKey(), time: 900,
      kills: 500, bosses: 4, tier: 3, shardMul: 1, jewels: [], map: null, endless: 0, echoes: 0 });
      return { total: res.reward.total, parts: res.reward.parts }; })()
  `);
  const part = first.parts.find((p) => /Weekly/.test(p[0]));
  assert.ok(part, 'settlement mentions the weekly reward');
  assert.equal(part[1], 150);
  // a second win the same week must not pay again
  const second = g.run(`
    (() => { const res = settleRun({ win: true, hc: false, daily: 0, weekly: weeklyKey(), time: 600,
      kills: 300, bosses: 4, tier: 3, shardMul: 1, jewels: [], map: null, endless: 0, echoes: 0 });
      return res.reward.parts.filter((p) => /Weekly/.test(p[0])).length; })()
  `);
  assert.equal(second, 0);
});

test('runRecord carries weekly, name and echoes for the leaderboard', () => {
  const g = game();
  g.run(`G.weekly = weeklyKey(); G.settings.displayName = 'Tester'; G.stats.echoes = 7;`);
  const rec = g.run('runRecord(true)');
  assert.equal(rec.weekly, g.run('weeklyKey()'));
  assert.equal(rec.name, 'Tester');
  assert.equal(rec.echoes, 7);
});

test('Echo milestone: announcement, guaranteed unique drop and echoBest', () => {
  const g = game();
  // crossing Echo 5 announces the cosmetic milestone (no drop), Echo 15 drops the unique
  g.run(`
    G.stats.echoes = 4;
    const e5 = makeEnemy('golem', 0, 0, 0);
    e5.bossDef = { echo: true }; e5.name = 'Echo of the Warden';
    bossDefeated(e5);
  `);
  assert.equal(g.run('G.stats.echoes'), 5);
  assert.ok(/ปลดล็อกออร่า/.test(g.run('G.announce.sub')), 'milestone 5 announced: ' + g.run('G.announce.sub'));
  // random uniques may still drop on any echo kill — the guarantee is only about the echo15 one
  assert.equal(g.run(`G.items.filter((it) => it.item && it.item.name === 'Echo of the Sovereign').length`), 0, 'no sovereign_echo at Echo 5');
  g.run(`
    G.items.length = 0;
    G.stats.echoes = 14;                 // ten more echo kills happened off-screen
    const e15 = makeEnemy('golem', 0, 0, 0);
    e15.bossDef = { echo: true }; e15.name = 'Echo of the Colossus';
    bossDefeated(e15);
  `);
  assert.equal(g.run('G.stats.echoes'), 15);
  assert.ok(/รางวัล Unique/.test(g.run('G.announce.sub')), 'milestone 15 announced: ' + g.run('G.announce.sub'));
  assert.ok(g.run(`G.items.some((it) => it.item && it.item.name === 'Echo of the Sovereign')`), 'the echo15 unique drops');
  // the unique only comes from its own source
  assert.equal(g.run('uniqueSrc("sovereign_echo")'), 'echo15');
});

test('settleProgression records echoBest and unlocks the aura cosmetic', () => {
  const g = game();
  g.run(`G.stats.echoes = 6; settleProgression(true, 300);`);
  assert.ok(g.run('loadMeta().echoBest') >= 6);
  assert.equal(g.run('COSMETICS.aura_echo.test(loadMeta())'), true);
  assert.equal(g.run('COSMETICS.title_voidwalker.test(loadMeta())'), false);
  assert.equal(g.run('cosmeticOpen("aura_echo")'), true);
});

test('Echo 20 capstone gives the permanent shard multiplier', () => {
  const g = game();
  g.run('loadMeta().echoBest = 20; saveMeta();');
  const mul = g.run('atlasFx().shardMul');
  assert.ok(Math.abs(mul - 1.1) < 1e-9, 'shardMul is exactly ×1.1 with a fresh save, got ' + mul);
});

test('leaderboard helpers: scoring, fallback names and rendering', () => {
  const g = game();
  assert.equal(g.run(`lbScore({ time_s: 100, result: 'win' })`), 700);
  assert.equal(g.run(`lbScore({ time_s: 100, result: 'dead' })`), 100);
  assert.equal(g.run(`lbScore({ time_s: 500, result: 'endgame' })`), 1100);
  assert.equal(g.run(`lbName({ name: null, cls: 'witch', player: 'pabcdef1234' })`), 'witch-1234');
  assert.equal(g.run(`lbName({ name: 'Mek', cls: 'witch', player: 'pabcdef1234' })`), 'Mek');
  // the shell renders with category chips; rows render medals and highlight "me"
  const shell = g.run('leaderboardHtml()');
  assert.ok(shell.includes('data-lb="daily"') && shell.includes('data-lb="weekly"') && shell.includes('data-lb="endgame"'));
  const rows = g.run(`
    (() => { statsPlayerId = () => 'ptest12345678';       // the test sandbox has no persistent storage
      return lbRowsHtml([
        { player: 'ptest12345678', name: 'Mek', cls: 'witch', asc_class: null, result: 'win', time_s: 800, tier: 5, echoes: 0, kills: 900, hc: false, heat: 0 },
        { player: 'pother123456', name: null, cls: 'ranger', asc_class: 'deadeye', result: 'dead', time_s: 200, tier: 2, echoes: 0, kills: 100, hc: false, heat: 0 },
      ]); })()
  `);
  assert.ok(rows.includes('🥇') && rows.includes('Mek') && rows.includes('ranger-3456'), rows);
  assert.ok(rows.includes('class="lb-row me"'));
  assert.ok(g.run(`lbRowsHtml([])`).includes('คนแรก'));
});

test('victory screen advertises the next Echo milestone', () => {
  const g = game();
  g.run('loadMeta().echoBest = 0; saveMeta();');
  g.run('G.vault = { cards: [], pick: 0 };');
  g.run('setVictoryButtons()');
  assert.ok(/Echo ถัดไปที่ 5/.test(g.run('$("vic-hint").textContent')), g.run('$("vic-hint").textContent'));
});
