'use strict';
// ============================================================
//  Run statistics: one anonymous record per finished run, sent to the
//  shared table so builds that win (or lose) too often show up on stats.html.
//  Opt-out in Settings. Unsent runs wait in localStorage and retry next time.
// ============================================================
const STATS_QUEUE_KEY = 'exile_stats_queue', STATS_ID_KEY = 'exile_player_id';
const STATS_QUEUE_MAX = 20;
const STATS_MIN_TIME = 30;     // shorter deaths are usually quits or misclicks

// test games on a local dev server stay out of the shared numbers
const statsDevHost = () => typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const statsEnabled = () => !!(STATS_CONFIG.url && STATS_CONFIG.key && G.settings && G.settings.shareStats) && !statsDevHost();

// random per-browser id so one player's many runs can be told apart (never a name)
function statsPlayerId() {
  let id = null;
  try { id = localStorage.getItem(STATS_ID_KEY); } catch (e) { /* storage may be blocked */ }
  if (!id) {
    id = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    try { localStorage.setItem(STATS_ID_KEY, id); } catch (e) { /* keep it for this session only */ }
  }
  return id;
}

// the record for the run that just ended (columns of supabase/schema.sql)
function runRecord(win) {
  const P = G.player;
  const skills = P.skills.map((s) => ({ id: s.id, lv: s.level, evo: !!s.evo, sup: s.supports.slice(), dmg: Math.round(s.dmgDealt) }));
  const granted = G.archetypes && G.archetypes.ice;
  if (granted && granted.dmgDealt > 0) skills.push({ id: granted.id, lv: granted.level, evo: false, sup: [], dmg: Math.round(granted.dmgDealt) });
  const main = skills.slice().sort((a, b) => b.dmg - a.dmg)[0];
  return {
    build: GAME_BUILD, player: statsPlayerId(), cls: P.cls.id, asc_class: P.asc || null,
    result: G.endless ? 'endgame' : win ? 'win' : 'dead',
    time_s: Math.round(G.time), level: P.level, tier: G.map.tier || 1, heat: G.heat || 0, hc: !!G.hc, daily: !!G.daily,
    weekly: G.weekly || 0, name: (G.settings.displayName || '').slice(0, 20) || null, echoes: G.stats.echoes || 0,
    kills: G.stats.kills, bosses: G.stats.bosses, killer: !win && P.killedBy ? String(P.killedBy).slice(0, 80) : null,
    main_skill: main ? main.id : null, weapon: P.weapon ? P.weapon.wtype : null,
    skills, keystones: Object.keys(P.keystones), masteries: P.masteries.slice(),
  };
}

function statsQueue() {
  try { const q = JSON.parse(localStorage.getItem(STATS_QUEUE_KEY) || '[]'); return Array.isArray(q) ? q : []; } catch (e) { return []; }
}
function saveStatsQueue(q) {
  try { localStorage.setItem(STATS_QUEUE_KEY, JSON.stringify(q.slice(-STATS_QUEUE_MAX))); } catch (e) { /* storage may be blocked */ }
}

// called once per run from showGameOver
function sendRunStats(win) {
  if (!statsEnabled()) return false;
  if (!win && !G.endless && G.time < STATS_MIN_TIME) return false;
  const q = statsQueue();
  q.push(runRecord(win));
  saveStatsQueue(q);
  flushRunStats();
  return true;
}

let _statsSending = false;
function flushRunStats() {
  if (_statsSending || !statsEnabled() || typeof fetch !== 'function') return;
  const q = statsQueue();
  if (!q.length) return;
  _statsSending = true;
  fetch(STATS_CONFIG.url.replace(/\/$/, '') + '/rest/v1/runs', {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json', apikey: STATS_CONFIG.key, Authorization: 'Bearer ' + STATS_CONFIG.key, Prefer: 'return=minimal' },
    body: JSON.stringify(q),
  }).then((res) => {
    // sent, or rejected as invalid (would fail forever): drop those runs either way
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
      saveStatsQueue(statsQueue().slice(q.length));
    }
  }).catch(() => { /* offline: keep the queue for next time */ })
    .finally(() => { _statsSending = false; });
}
