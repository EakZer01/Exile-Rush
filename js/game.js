'use strict';
// ============================================================
//  Main: state, loop, input, run start/end
// ============================================================
const G = {
  state: 'menu', canvas: null, ctx: null, W: 0, H: 0, dpr: 1, zoom: 1,
  time: 0, lastTs: 0, simDebt: 0, player: null, cam: { x: 0, y: 0 }, shake: 0,
  enemies: [], projectiles: [], eproj: [], novas: [], meteors: [], grounds: [], minions: [],
  orbs: [], pickups: [], effects: [], texts: [], hazards: [], shrines: [], delayed: [], items: [], lootLog: [], epools: [], breach: null,
  map: { biome: 'graveyard', tier: 1, mods: [] }, mapFx: null,
  hash: new SpatialHash(64), buffs: {}, spawn: null, stats: null, announce: null,
  pendingLevels: 0, pendingChests: 0, choices: [], banned: new Set(), bossRef: null, victoryT: 0,
  settings: { dmgNumbers: true, fx: true, lighting: true },
  decals: [], hitStop: 0, worldSeed: 1,
  pendingAscend: 0, choiceKind: 'level',
  input: { up: false, down: false, left: false, right: false, dash: false, flask0: false, flask1: false, flask2: false, flask3: false, flask4: false, vaal: false, joy: null, joyOrigin: null },
  showTiers: false,
};

const SIM_STEP = 1 / 60;
const _backgroundClock = { worker: null, timer: null, running: null };

function gameInBackground() {
  return !!document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus());
}
function resetGameClock() {
  G.lastTs = performance.now(); G.simDebt = 0;
}
function clearGameInput() {
  for (const k in G.input) G.input[k] = typeof G.input[k] === 'boolean' ? false : null;
  if (G.releaseTouch) G.releaseTouch();
  cancelFlicker();
}

// RAF and the background timer share one monotonic clock, so time is never counted twice.
function advanceGame(ts) {
  if (!Number.isFinite(ts)) return;
  const elapsed = Math.max(0, (ts - G.lastTs) / 1000);
  G.lastTs = Math.max(G.lastTs, ts);
  if (G.state !== 'play') { G.simDebt = 0; return; }
  G.simDebt += elapsed;
  const started = performance.now();
  // Keep delayed ticks as debt; replay small physics steps without blocking the page.
  for (let n = 0; G.simDebt + 1e-9 >= SIM_STEP && G.state === 'play' && n < 240; n++) {
    G.simDebt = Math.max(0, G.simDebt - SIM_STEP);
    const stopped = Math.min(SIM_STEP, Math.max(0, G.hitStop));
    G.hitStop = Math.max(0, G.hitStop - SIM_STEP);
    update(SIM_STEP - stopped * 0.85);
    if (performance.now() - started > 12) break;
  }
  if (G.state !== 'play') G.simDebt = 0;
}
function backgroundPulse() {
  if (!gameInBackground()) return;
  Music.update();
  advanceGame(performance.now());
}
function startBackgroundFallback() {
  if (_backgroundClock.timer === null) _backgroundClock.timer = setInterval(backgroundPulse, 100);
}
function syncBackgroundClock() {
  const running = gameInBackground();
  if (_backgroundClock.worker && running !== _backgroundClock.running) _backgroundClock.worker.postMessage(running);
  _backgroundClock.running = running;
}
function startBackgroundClock() {
  if (_backgroundClock.worker || _backgroundClock.timer !== null) return;
  try {
    const blob = new Blob([`let timer = null;
      self.onmessage = ({ data: running }) => {
        if (running && timer === null) timer = setInterval(() => self.postMessage(0), 50);
        else if (!running && timer !== null) { clearInterval(timer); timer = null; }
      };`], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    try { _backgroundClock.worker = new Worker(url); }
    finally { URL.revokeObjectURL(url); }
    _backgroundClock.worker.onmessage = backgroundPulse;
    _backgroundClock.worker.onerror = (event) => {
      event.preventDefault();
      _backgroundClock.worker.terminate(); _backgroundClock.worker = null;
      startBackgroundFallback();
    };
  } catch (_) { startBackgroundFallback(); }
  syncBackgroundClock();
}
function onGameBlur() {
  clearGameInput();
  syncBackgroundClock();
}
function onGameVisibilityChange() {
  if (gameInBackground()) clearGameInput();
  syncBackgroundClock();
  advanceGame(performance.now());
}

function resize() {
  G.dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.W = window.innerWidth; G.H = window.innerHeight;
  G.canvas.width = Math.floor(G.W * G.dpr); G.canvas.height = Math.floor(G.H * G.dpr);
  G.canvas.style.width = G.W + 'px'; G.canvas.style.height = G.H + 'px';
  G.zoom = clamp(Math.min(G.W, G.H * 1.4) / 1050, 0.6, 1.1);
}

function startGame(cls, map) {
  G.craft = { nodes: [], corpses: [], blades: [] };
  G.map = map ? { biome: map.biome, tier: map.tier, mods: map.mods.slice(), forced: (map.forced || []).slice(), scarabs: (map.scarabs || []).slice(), heat: Object.assign({}, map.heat) } : Object.assign({}, DEFAULT_MAP, { mods: [], forced: [], scarabs: [], heat: {} });
  G.hc = !!(map && map.hc); G.daily = (map && map.daily) || 0; G.weekly = (map && map.weekly) || 0; G.runScarabs = []; G.vault = null;
  if (!G.daily && !G.weekly) restoreRandom();
  G.mapFx = mapFx(G.map);
  G.atlasFx = atlasFx();
  applyMapBonuses(G.atlasFx, G.mapFx, G.map);
  G.heat = applyCorruption(G.atlasFx, G.mapFx, G.map.heat);
  G.cos = runCosmetics();
  G.lastMap = G.map;
  G.mapHazT = 4;
  resetBreach();
  _bgPattern = null;
  hide('menu'); hide('gameover'); hide('pause'); hide('levelup'); hide('socket');
  Object.assign(G, {
    time: 0, enemies: [], projectiles: [], eproj: [], novas: [], meteors: [], grounds: [], minions: [], bowFuses: [], bowSeeds: [],
    orbs: [], pickups: [], effects: [], texts: [], hazards: [], shrines: [], delayed: [], items: [], lootLog: [], epools: [],
    buffs: { diamond: 0, acceleration: 0, resistance: 0, echoing: 0 }, announce: null,
    pendingLevels: 0, pendingChests: 0, pendingAscend: 0, bossRef: null, victoryT: 0, shake: 0, banned: new Set(),
    decals: [], hitStop: 0, worldSeed: Math.floor(Math.random() * 1e9),
    spawn: { acc: 0, magicT: 19, rareT: 56, hordeT: 82, shrineT: 19, bossIdx: 0 }, endless: false, endStart: 0, nextEcho: 0,
    stats: { kills: 0, dmg: 0, bosses: 0, salvage: 0 }, settled: false, dmgLog: [], dpsT: 0,
  });
  resetLeagues();
  G.pendingRitual = false;
  G.lastClass = cls;
  _parts.length = 0; _chunks.clear();
  const P = createPlayer(cls);
  G.player = P;
  // Scion's random start must be a skill that deals damage on its own (not a Herald)
  // and that works with the class's starting weapon
  const startW = BASES[START_WEAPON[cls.id] || 'rusted_sword'].w.type;
  const startId = cls.start || pick(Object.keys(SKILLS).filter((id) => !['shield_crush','shield_throw','holy_relic','lightning_conduit','detonate_dead','volatile_dead','cremation'].includes(id) && !isLocked('gem', id) && SKILLS[id].behavior !== 'herald'
    && (!SKILLS[id].weapons || SKILLS[id].weapons.includes(startW))));
  P.skills.push(newSkillInstance(startId));
  P.skills[0].level += gemStartBonus(startId);
  if (cls.id === 'scion') P.currency.jeweller3++;
  giveStartingGear(P);
  applyMetaStart(P);
  if (map && map.loadout) for (const it of map.loadout) giveLoadoutItem(P, it);
  recomputePlayer();
  if (P.mods.ks.bornAscendant) G.pendingAscend = 1;
  P.life = P.maxLife;
  G.cam.x = P.x; G.cam.y = P.y;
  G.state = 'play';
  resetGameClock();
  announce('ดินแดนต้องสาป', 'เอาชีวิตรอด 15 นาที และโค่นบอสสุดท้าย', '#e8c870');
  showTip('start');
}

function update(dt) {
  G.time += dt;
  const P = G.player;

  for (const k in G.buffs) if (G.buffs[k] > 0) G.buffs[k] -= dt;
  for (let i = G.delayed.length - 1; i >= 0; i--) {
    const d = G.delayed[i]; d.t -= dt;
    if (d.t <= 0) { G.delayed.splice(i, 1); d.fn(); }
  }

  updatePlayer(dt);
  if (G.time >= G.dpsT) {
    G.dpsT = G.time + 1;
    for (const inst of P.skills) { const h = inst.rt.dh || (inst.rt.dh = []); h.push(inst.dmgDealt); if (h.length > 11) h.shift(); }
  }

  // spatial hash of live enemies
  G.hash.clear();
  for (const e of G.enemies) if (!e.dead) G.hash.insert(e);

  updateSpawner(dt);
  updateSkills(dt);
  updateBuildcraft(dt);
  updateProjectiles(dt);
  updateBowEntities(dt);
  updateNovas(dt);
  updateMeteors(dt);
  updateGrounds(dt);
  updateMinions(dt);
  updateEnemies(dt);
  updateEnemyProjectiles(dt);
  updateHazards(dt);
  updateMapHazards(dt);
  updatePools(dt);
  updateBreach(dt);
  updateLeagues(dt);
  updateShrines(dt);
  updateParticles(dt);

  // effects & texts
  for (let i = G.effects.length - 1; i >= 0; i--) { const f = G.effects[i]; f.t += dt; if (f.t >= f.dur) { G.effects[i] = G.effects[G.effects.length - 1]; G.effects.pop(); } }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.t += dt; t.y += t.vy * dt; if (t.t >= t.dur) G.texts.splice(i, 1); }
  if (G.announce) { G.announce.t += dt; if (G.announce.t >= G.announce.dur) G.announce = null; }
  G.shake = Math.max(0, G.shake - dt * 30);

  // camera
  G.cam.x = lerp(G.cam.x, P.x, Math.min(1, dt * 10));
  G.cam.y = lerp(G.cam.y, P.y, Math.min(1, dt * 10));

  if (P.dead && P.revives > 0) secondWind(P);
  // dying in the Endgame still counts as a win: the map was already cleared
  if (P.dead) { setTimeout(() => showGameOver(G.endless), 50); G.state = 'dying'; return; }
  if (G.victoryT > 0) { G.victoryT -= dt; if (G.victoryT <= 0) { openVictory(); return; } }

  // level-ups can wait (setting): during boss fights, or until the player presses U
  // Defer automatic choices while away, including while delayed simulation catches up.
  if (gameInBackground() || G.simDebt > SIM_STEP * 2) { G.input.levelUp = false; return; }
  const mode = G.settings.levelMode || 'auto';
  const bank = mode === 'manual' || (mode === 'boss' && G.bossRef && !G.bossRef.dead);
  const want = G.input.levelUp; G.input.levelUp = false;
  if (G.pendingRitual) openRitual();
  else if (G.pendingAscend > 0) openAscend();
  else if (bank && !want) return;
  else if (G.pendingLevels > 0) openLevelUp(false);
  else if (G.pendingChests > 0) openLevelUp(true);
}

function frame(ts) {
  requestAnimationFrame(frame);
  const t0 = performance.now();
  Music.update();
  advanceGame(ts);
  if (!document.hidden) render();
  if (G.state === 'play') perfSample(performance.now() - t0, 1 / 60);
}

// ---------------- Input ----------------
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};
function onKey(e, down) {
  if (down) Sfx.init();       // browsers only start audio after a user gesture
  // Leave browser/window shortcuts (Ctrl+Tab, Alt+Tab, Ctrl+T, etc.) to the browser.
  if (down && (e.ctrlKey || e.metaKey || e.altKey) && e.code !== 'AltLeft' && e.code !== 'AltRight') return;
  const k = KEYMAP[e.code];
  if (k) { G.input[k] = down; if (down) cancelFlicker(); e.preventDefault(); return; }
  if (!down) return;
  if (e.code === 'Space') { G.input.dash = true; cancelFlicker(); e.preventDefault(); }
  else if (e.code === 'KeyT' && !e.repeat) toggleFlicker();
  else if (e.code === 'KeyQ') G.input.flask0 = true;
  else if (e.code === 'KeyE') G.input.flask1 = true;
  else if (G.state === 'play' && /^Digit[1-5]$/.test(e.code)) G.input['flask' + (+e.code.slice(5) - 1)] = true;
  else if (e.code === 'AltLeft' || e.code === 'AltRight') { if (G.state === 'inventory') { G.showTiers = !G.showTiers; renderInvDetail(); e.preventDefault(); } }
  else if (e.code === 'KeyV') G.input.vaal = true;
  else if (e.code === 'KeyI') { if (G.state === 'play' || G.state === 'paused') openInventory(); else if (G.state === 'inventory') closeInventory(); }
  else if (e.code === 'KeyU') G.input.levelUp = true;
  else if (e.code === 'KeyZ') toggleSetting('minimap');
  else if (e.code === 'KeyC') { if (G.state === 'play') openPause(); else if (G.state === 'paused') resume(); }
  else if (e.code === 'KeyM') { Sfx.muted = !Sfx.muted; Music.setVolume(Sfx.muted ? 0 : G.settings.music); }
  else if (e.code === 'KeyN') toggleSetting('dmgNumbers');
  else if (e.code === 'KeyL') toggleSetting('lighting');
  else if (e.code === 'KeyF') toggleSetting('fx');

  if (G.state === 'levelup') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= G.choices.length) chooseCard(n - 1);
    else if (e.code === 'KeyR') reroll();
  } else if (G.state === 'play') {
    if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Tab') { openPause(); e.preventDefault(); }
  } else if (G.state === 'paused') {
    if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Tab') { resume(); e.preventDefault(); }
  } else if (G.state === 'inventory') {
    if (e.code === 'Escape' || e.code === 'Tab') { closeInventory(); e.preventDefault(); }
  }
  if (e.code === 'Tab') e.preventDefault();
}

function setupTouch() {
  const c = G.canvas, inp = G.input;
  let id = null, lastTap = 0;
  G.releaseTouch = () => { id = null; lastTap = 0; inp.joy = null; inp.joyOrigin = null; };
  c.addEventListener('touchstart', (e) => {
    Sfx.init();
    const t = e.changedTouches[0], dr = G.dashRect;
    // the DASH button handles its own tap and must not start the joystick
    if (dr && t.clientX >= dr.x && t.clientX <= dr.x + dr.w && t.clientY >= dr.y && t.clientY <= dr.y + dr.h) { e.preventDefault(); return; }
    const now = performance.now();
    if (now - lastTap < 280) inp.dash = true; // double tap = dash
    lastTap = now;
    if (id === null) { id = t.identifier; inp.joyOrigin = { x: t.clientX, y: t.clientY }; inp.joy = { x: 0, y: 0 }; }
    e.preventDefault();
  }, { passive: false });
  c.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === id) {
      let dx = (t.clientX - inp.joyOrigin.x) / 50, dy = (t.clientY - inp.joyOrigin.y) / 50;
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      inp.joy = { x: dx, y: dy };
    }
    e.preventDefault();
  }, { passive: false });
  const end = (e) => { for (const t of e.changedTouches) if (t.identifier === id) { id = null; inp.joy = null; inp.joyOrigin = null; } };
  c.addEventListener('touchend', end); c.addEventListener('touchcancel', end);
  // tap the flask area on the HUD
  c.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    for (const r of G.flaskRects || []) if (t.clientX >= r.x - 4 && t.clientX <= r.x + r.w + 4 && t.clientY >= r.y - 14 && t.clientY <= r.y + r.h) inp['flask' + r.i] = true;
    // tap the skill bar to unleash Vaal skills
    const dr = G.dashRect;
    if (dr && t.clientX >= dr.x && t.clientX <= dr.x + dr.w && t.clientY >= dr.y && t.clientY <= dr.y + dr.h) { inp.dash = true; return; }
    const lr = G.lvlRect;
    if (lr && t.clientX >= lr.x && t.clientX <= lr.x + lr.w && t.clientY >= lr.y && t.clientY <= lr.y + lr.h) { inp.levelUp = true; return; }
    const bg = G.bagRect;
    if (bg && G.state === 'play' && t.clientX >= bg.x && t.clientY >= bg.y && t.clientY <= bg.y + bg.h) { openInventory(); return; }
    const sb = G.skillBarRect;
    if (sb && t.clientX >= sb.x && t.clientX <= sb.x + sb.w && t.clientY >= sb.y && t.clientY <= sb.y + sb.h) inp.vaal = true;
  });
}

function init() {
  G.canvas = $('game');
  G.ctx = G.canvas.getContext('2d');
  loadSettings();
  $('game-version').textContent = 'Build ' + GAME_BUILD;
  flushRunStats();       // runs that could not be sent last time
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('blur', onGameBlur);
  window.addEventListener('focus', onGameVisibilityChange);
  document.addEventListener('visibilitychange', onGameVisibilityChange);
  startBackgroundClock();
  setupTouch();

  $('btn-reroll').onclick = reroll;
  $('btn-flicker').onclick = () => { toggleFlicker(); $('btn-flicker').blur(); };
  $('btn-altar').onclick = () => { Sfx.init(); openAltar(); };
  for (const [id, tab] of [['btn-gems', 'gems'], ['btn-chal', 'chal'], ['btn-atlas', 'void'], ['btn-uniques', 'coll'], ['btn-cosmetic', 'cos'], ['btn-lb', 'lb']]) $(id).onclick = () => { Sfx.init(); openRecords(tab); };
  $('btn-records-back').onclick = closeRecords;
  $('btn-codex').onclick = () => { Sfx.init(); openCodex(); };
  $('btn-codex-close').onclick = closeCodex;
  $('btn-settings').onclick = () => { Sfx.init(); openSettings('menu'); };
  $('btn-pause-settings').onclick = () => openSettings('pause');
  $('btn-settings-close').onclick = closeSettings;
  $('btn-map-alch').onclick = mapAlchemy;
  $('btn-map-chaos').onclick = mapChaos;
  $('btn-map-clear').onclick = mapClear;
  $('btn-map-start').onclick = mapStartPaid;
  $('btn-map-back').onclick = mapBack;
  $('btn-altar-back').onclick = closeAltar;
  $('btn-respec').onclick = () => { treeRespec(); altarSel = null; openAltar(); };
  $('btn-skip').onclick = skipLevel;
  $('btn-socket-back').onclick = socketBack;
  $('btn-resume').onclick = resume;
  $('btn-inv').onclick = openInventory;
  $('btn-ritual-close').onclick = closeRitual;
  $('btn-vic-leave').onclick = () => { if (G.vault && G.vault.pick === null) return; hide('victory'); G.state = 'dying'; showGameOver(true); };
  $('btn-vic-endless').onclick = startEndgame;
  $('btn-inv-close').onclick = closeInventory;
  $('btn-quit').onclick = () => { hide('pause'); G.state = 'menu'; G.player = null; buildMenu(); show('menu'); };
  $('btn-retry').onclick = retryRun;
  $('btn-stash').onclick = () => { Sfx.init(); stashView = null; openStash(); };
  $('btn-stash-close').onclick = closeStash;
  $('btn-daily').onclick = () => { Sfx.init(); startDaily(); };
  $('btn-weekly').onclick = () => { Sfx.init(); startWeekly(); };
  $('btn-map-atlas').onclick = toggleAtlasTree;
  $('btn-menu').onclick = () => { hide('gameover'); G.state = 'menu'; G.player = null; buildMenu(); show('menu'); };

  buildMenu();
  requestAnimationFrame(frame);
}
window.addEventListener('load', init);

// retrying a bought / dropped map sends you back to the Map Device (maps are consumed)
function retryRun() {
  hide('gameover');
  if (G.daily) startDaily();
  else if (G.weekly) startWeekly();
  else if (G.lastMap.tier > 1 || G.hc) { G.state = 'menu'; G.player = null; openMapDevice(G.lastClass); }
  // scarabs were spent on the first try: a quick retry runs without them
  else startGame(G.lastClass, Object.assign({}, G.lastMap, { scarabs: [] }));
}

// ---- after the final boss: leave with the win, or stay for the Endgame ----
function openVictory() {
  G.state = 'victory';
  $('vic-sub').textContent = `เคลียร์ ${mapLabel(G.map)} ใน ${fmtTime(G.time)} · ออกไปรับรางวัลตอนนี้ หรืออยู่ต่อใน Endgame`;
  // the Vault is rolled once per cleared map (the Daily and Weekly have none)
  if (!G.vault && !G.daily && !G.weekly) G.vault = { cards: rollVault(), pick: null };
  if (G.vault) renderVault(); else $('vic-vault').innerHTML = '';
  Sfx.play('victory');
  setVictoryButtons();
  show('victory');
}
function startEndgame() {
  if (G.vault && G.vault.pick === null) return;
  hide('victory');
  Object.assign(G, { endless: true, endStart: G.time, nextEcho: G.time + 40, state: 'play' });
  resetGameClock();
  announce('ENDGAME ∞', 'มอนสเตอร์แข็งขึ้นไม่สิ้นสุด · Echo บอสทุก ' + ENDGAME_ECHO + ' วิ · ตายแล้วยังนับว่าชนะ', '#ff5a5a');
  Sfx.play('boss');
}

// Second Wind (meta upgrade): get back up once, blasting enemies away
function secondWind(P) {
  P.revives--; P.dead = false; P.killedBy = '';
  P.life = P.maxLife * 0.5; P.iframes = 2.5;
  for (const e of G.enemies) {
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
    if (d < 280 && !isBoss(e)) { e.kx += (dx / d) * 700; e.ky += (dy / d) * 700; }
  }
  G.eproj.length = 0;
  addEffect({ kind: 'ring', x: P.x, y: P.y, r: 280, t: 0, dur: 0.6, color: '#fff0c0' });
  emit('gold', P.x, P.y, 40, { speed: 2, jitter: 10 });
  hitStop(0.3);
  announce('Second Wind', 'ฟื้นคืนชีพ!', '#fff0c0');
}
