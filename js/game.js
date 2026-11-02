'use strict';
// ============================================================
//  Main: state, loop, input, run start/end
// ============================================================
const G = {
  state: 'menu', canvas: null, ctx: null, W: 0, H: 0, dpr: 1, zoom: 1,
  time: 0, lastTs: 0, player: null, cam: { x: 0, y: 0 }, shake: 0,
  enemies: [], projectiles: [], eproj: [], novas: [], meteors: [], grounds: [], minions: [],
  orbs: [], pickups: [], effects: [], texts: [], hazards: [], shrines: [], delayed: [], items: [], lootLog: [],
  map: { biome: 'graveyard', tier: 1, mods: [] }, mapFx: null,
  hash: new SpatialHash(64), buffs: {}, spawn: null, stats: null, announce: null,
  pendingLevels: 0, pendingChests: 0, choices: [], banned: new Set(), bossRef: null, victoryT: 0,
  settings: { dmgNumbers: true, fx: true, lighting: true },
  decals: [], hitStop: 0, worldSeed: 1,
  pendingAscend: 0, choiceKind: 'level',
  input: { up: false, down: false, left: false, right: false, dash: false, flask0: false, flask1: false, vaal: false, joy: null, joyOrigin: null },
};

function resize() {
  G.dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.W = window.innerWidth; G.H = window.innerHeight;
  G.canvas.width = Math.floor(G.W * G.dpr); G.canvas.height = Math.floor(G.H * G.dpr);
  G.canvas.style.width = G.W + 'px'; G.canvas.style.height = G.H + 'px';
  G.zoom = clamp(Math.min(G.W, G.H * 1.4) / 1050, 0.6, 1.1);
}

function startGame(cls, map) {
  G.map = map ? { biome: map.biome, tier: map.tier, mods: map.mods.slice() } : Object.assign({}, DEFAULT_MAP, { mods: [] });
  G.mapFx = mapFx(G.map);
  G.lastMap = G.map;
  G.mapHazT = 4;
  _bgPattern = null;
  hide('menu'); hide('gameover'); hide('pause'); hide('levelup'); hide('socket');
  Object.assign(G, {
    time: 0, enemies: [], projectiles: [], eproj: [], novas: [], meteors: [], grounds: [], minions: [],
    orbs: [], pickups: [], effects: [], texts: [], hazards: [], shrines: [], delayed: [], items: [], lootLog: [],
    buffs: { diamond: 0, acceleration: 0, resistance: 0, echoing: 0 }, announce: null,
    pendingLevels: 0, pendingChests: 0, pendingAscend: 0, bossRef: null, victoryT: 0, shake: 0, banned: new Set(),
    decals: [], hitStop: 0, worldSeed: Math.floor(Math.random() * 1e9),
    spawn: { acc: 0, magicT: 25, rareT: 75, hordeT: 110, shrineT: 25, bossIdx: 0 },
    stats: { kills: 0, dmg: 0, bosses: 0, salvage: 0 }, settled: false,
  });
  G.lastClass = cls;
  _parts.length = 0; _chunks.clear();
  const P = createPlayer(cls);
  G.player = P;
  // Scion's random start must be a skill that deals damage on its own (not a Herald)
  const startId = cls.start || pick(Object.keys(SKILLS).filter((id) => !isLocked('gem', id) && SKILLS[id].behavior !== 'herald'));
  P.skills.push(newSkillInstance(startId));
  if (cls.id === 'scion') P.currency.fusing++;
  applyMetaStart(P);
  recomputePlayer();
  if (P.mods.ks.bornAscendant) G.pendingAscend = 1;
  P.life = P.maxLife;
  G.cam.x = P.x; G.cam.y = P.y;
  G.state = 'play';
  G.lastTs = performance.now();
  announce('ดินแดนต้องสาป', 'เอาชีวิตรอด 20 นาที และโค่นบอสสุดท้าย', '#e8c870');
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

  // spatial hash of live enemies
  G.hash.clear();
  for (const e of G.enemies) if (!e.dead) G.hash.insert(e);

  updateSpawner(dt);
  updateSkills(dt);
  updateProjectiles(dt);
  updateNovas(dt);
  updateMeteors(dt);
  updateGrounds(dt);
  updateMinions(dt);
  updateEnemies(dt);
  updateEnemyProjectiles(dt);
  updateHazards(dt);
  updateMapHazards(dt);
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
  if (P.dead) { setTimeout(() => showGameOver(false), 50); G.state = 'dying'; return; }
  if (G.victoryT > 0) { G.victoryT -= dt; if (G.victoryT <= 0) { G.state = 'dying'; showGameOver(true); return; } }

  if (G.pendingAscend > 0) openAscend();
  else if (G.pendingLevels > 0) openLevelUp(false);
  else if (G.pendingChests > 0) openLevelUp(true);
}

function frame(ts) {
  requestAnimationFrame(frame);
  if (G.state === 'play') {
    let dt = (ts - G.lastTs) / 1000;
    G.lastTs = ts;
    if (dt > 0.1) dt = 0.1;
    if (G.hitStop > 0) { G.hitStop -= dt; dt *= 0.15; }
    if (dt > 0) {
      // sub-step when frames are long so fast projectiles don't tunnel
      const steps = dt > 0.034 ? 2 : 1;
      for (let i = 0; i < steps && G.state === 'play'; i++) update(dt / steps);
    }
  } else {
    G.lastTs = ts;
  }
  render();
}

// ---------------- Input ----------------
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};
function onKey(e, down) {
  const k = KEYMAP[e.code];
  if (k) { G.input[k] = down; e.preventDefault(); return; }
  if (!down) return;
  if (e.code === 'Space') { G.input.dash = true; e.preventDefault(); }
  else if (e.code === 'KeyQ' || e.code === 'Digit1' && G.state === 'play') G.input.flask0 = true;
  else if (e.code === 'KeyE' || e.code === 'Digit2' && G.state === 'play') G.input.flask1 = true;
  else if (e.code === 'KeyV') G.input.vaal = true;
  else if (e.code === 'KeyI') { if (G.state === 'play' || G.state === 'paused') openInventory(); else if (G.state === 'inventory') closeInventory(); }
  else if (e.code === 'KeyM') Sfx.muted = !Sfx.muted;
  else if (e.code === 'KeyN') G.settings.dmgNumbers = !G.settings.dmgNumbers;
  else if (e.code === 'KeyL') G.settings.lighting = !G.settings.lighting;
  else if (e.code === 'KeyF') { G.settings.fx = !G.settings.fx; if (!G.settings.fx) _parts.length = 0; }

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
  c.addEventListener('touchstart', (e) => {
    Sfx.init();
    const t = e.changedTouches[0];
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
    if (t.clientY > G.H - 90 && t.clientX < 230) {
      if (t.clientX < 120) inp.flask0 = true; else inp.flask1 = true;
    }
    // tap the skill bar to unleash Vaal skills
    const bg = G.bagRect;
    if (bg && G.state === 'play' && t.clientX >= bg.x && t.clientY >= bg.y && t.clientY <= bg.y + bg.h) { openInventory(); return; }
    const sb = G.skillBarRect;
    if (sb && t.clientX >= sb.x && t.clientX <= sb.x + sb.w && t.clientY >= sb.y && t.clientY <= sb.y + sb.h) inp.vaal = true;
  });
}

function init() {
  G.canvas = $('game');
  G.ctx = G.canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('blur', () => { for (const k of ['up', 'down', 'left', 'right']) G.input[k] = false; if (G.state === 'play') openPause(); });
  setupTouch();

  $('btn-reroll').onclick = reroll;
  $('btn-altar').onclick = () => { Sfx.init(); openAltar(); };
  $('btn-map-alch').onclick = mapAlchemy;
  $('btn-map-chaos').onclick = mapChaos;
  $('btn-map-clear').onclick = mapClear;
  $('btn-map-start').onclick = mapStart;
  $('btn-map-back').onclick = mapBack;
  $('btn-altar-back').onclick = closeAltar;
  $('btn-respec').onclick = () => { treeRespec(); altarSel = null; openAltar(); };
  $('btn-skip').onclick = skipLevel;
  $('btn-socket-back').onclick = socketBack;
  $('btn-resume').onclick = resume;
  $('btn-inv').onclick = openInventory;
  $('btn-inv-close').onclick = closeInventory;
  $('btn-quit').onclick = () => { hide('pause'); G.state = 'menu'; G.player = null; buildMenu(); show('menu'); };
  $('btn-retry').onclick = () => { hide('gameover'); startGame(G.lastClass, G.lastMap); };
  $('btn-menu').onclick = () => { hide('gameover'); G.state = 'menu'; G.player = null; buildMenu(); show('menu'); };

  buildMenu();
  requestAnimationFrame(frame);
}
window.addEventListener('load', init);

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
