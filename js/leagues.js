'use strict';
// ============================================================
//  LEAGUE MECHANICS — extra encounters during a run (besides Breach)
//  Strongbox : stand next to it to crack it open, guards pour out, loot drops
//  Essence   : a Rare monster sealed in crystal; free it, kill it, get an Essence
//  Ritual    : stand in the circle, survive the rite, spend Tribute on rewards
//  Delirium  : touch the mirror — fog follows you, monsters grow stronger
//              and loot richer the longer it lasts
//  The Atlas tree (G.atlasFx) changes how often each one shows up.
// ============================================================
const STRONGBOXES = {
  arcanist:     { name: "Arcanist's Strongbox", th: 'กล่องนักเวท — Orb คราฟต์', color: '#7aa8ff' },
  armourer:     { name: "Armourer's Strongbox", th: 'กล่องช่างเกราะ — ชุดเกราะ Rare', color: '#c8b08a' },
  jeweller:     { name: "Jeweller's Strongbox", th: 'กล่องช่างอัญมณี — แหวน/สร้อย/Jewel', color: '#ffd84a' },
  cartographer: { name: "Cartographer's Strongbox", th: 'กล่องนักทำแผนที่ — แผนที่', color: '#8ad8a8' },
  gemcutter:    { name: "Gemcutter's Strongbox", th: 'กล่องช่างเจียระไน — เจมสกิล +1 เลเวล', color: '#5ae0c0' },
};

// Essences: craft a guaranteed mod onto an item (Normal/Magic → Rare, Rare → reforged)
const ESSENCES = {
  greed:   { name: 'Essence of Greed', mod: 'lifeflat', color: '#e05050' },
  woe:     { name: 'Essence of Woe', mod: 'flates', color: '#6a8cff' },
  zeal:    { name: 'Essence of Zeal', mod: 'speed', color: '#e0e060' },
  anger:   { name: 'Essence of Anger', mod: 'fireres', color: '#ff7a3a' },
  hatred:  { name: 'Essence of Hatred', mod: 'coldres', color: '#7fd8ff' },
  wrath:   { name: 'Essence of Wrath', mod: 'lightres', color: '#fff27a' },
  spite:   { name: 'Essence of Spite', mod: 'chaosres', color: '#b56cff' },
  haste:   { name: 'Essence of Haste', mod: 'move', color: '#9ad2ff' },
  torment: { name: 'Essence of Torment', mod: 'crit', color: '#ffb0d0' },
  scorn:   { name: 'Essence of Scorn', mod: 'critmulti', color: '#ff9ab0' },
  envy:    { name: 'Essence of Envy', mod: 'spell', color: '#c0a0ff' },
  rage:    { name: 'Essence of Rage', mod: 'attack', color: '#ffa060' },
};
// an Essence mod always rolls at least Tier 3
function essenceCan(id, it) {
  if (!it || it.corrupted || it.unique || it.slot === 'flask' || it.slot === 'jewel') return false;
  return affixAllowed(ESSENCES[id].mod, Object.assign({}, it, { rarity: 'rare' }));
}
function essenceUse(id, it) {
  const mod = ESSENCES[id].mod;
  it.rarity = 'rare'; it.affixes = [];
  const a = rollAffix(mod, Math.max(it.ilvl, 44)), best = AFFIXES[mod].fixed ? 1 : Math.min(a.tier, 3);
  if (a.tier !== best) Object.assign(a, rollAffixAtTier(mod, best));
  it.affixes.push(a);
  const n = 3 + (Math.random() < 0.4 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0);
  for (let i = 0; i < n; i++) addRandomAffix(it);
  it.name = itemRareName(it.slot);
}
function rollAffixAtTier(id, tier) {
  const d = AFFIXES[id], p = Math.pow(10, d.dec || 0);
  return { id, tier, v: Math.max(d.dec ? 1 / p : 1, Math.round((d.lo + Math.random() * (d.hi - d.lo)) * TIER_MULT[tier - 1] * p) / p) };
}

const LEAGUE = { boxFirst: 65, boxGap: [75, 115], essFirst: 140, essGap: [130, 190], ritualAt: [330, 760], ritualR: 170, ritualDur: 20,
  deliWin: [150, 520], deliDur: 45 };

function resetLeagues() {
  const AF = G.atlasFx || {};
  G.league = {
    boxT: LEAGUE.boxFirst / (AF.boxRate || 1), boxes: [],
    essT: LEAGUE.essFirst / (AF.essRate || 1),
    rituals: LEAGUE.ritualAt.concat(AF.ritualExtra ? [1050] : []).map((t) => ({ at: t + rand(-30, 30), state: 'wait' })),
    tribute: 0,
    deli: { state: AF.deliOff ? 'none' : 'wait', at: rand(LEAGUE.deliWin[0], LEAGUE.deliWin[1]), x: 0, y: 0, t: 0, kills: 0, dur: LEAGUE.deliDur * (AF.deliDur || 1) },
  };
}
const leaguePos = (d0, d1) => { const P = G.player, a = rand(0, TAU), d = rand(d0, d1); return [P.x + Math.cos(a) * d, P.y + Math.sin(a) * d]; };
const bossUp = () => !!(G.bossRef && !G.bossRef.dead);

function updateLeagues(dt) {
  const L = G.league, P = G.player, AF = G.atlasFx || {};
  if (!L) return;
  // ---- strongboxes ----
  L.boxT -= dt;
  if (L.boxT <= 0 && !bossUp()) {
    L.boxT = rand(LEAGUE.boxGap[0], LEAGUE.boxGap[1]) / (AF.boxRate || 1);
    const [x, y] = leaguePos(320, 520);
    const kinds = Object.keys(STRONGBOXES);
    L.boxes.push({ x, y, kind: pick(kinds), state: 'closed', prog: 0, t: 0, wave: 0 });
  }
  for (let i = L.boxes.length - 1; i >= 0; i--) {
    const b = L.boxes[i];
    b.t += dt;
    if (b.state === 'closed') {
      if (dist2(b.x, b.y, P.x, P.y) < 70 * 70) b.prog += dt; else b.prog = Math.max(0, b.prog - dt * 0.5);
      if (b.prog >= 1.1) { b.state = 'open'; b.t = 0; Sfx.play('shrine'); announce(STRONGBOXES[b.kind].name, 'ผู้พิทักษ์ปรากฏตัว!', STRONGBOXES[b.kind].color); }
      else if (b.t > 80) L.boxes.splice(i, 1);
    } else {
      // three waves of guards, then the loot
      while (b.wave < 3 && b.t >= b.wave * 1.6) {
        const n = 5 + Math.floor(G.time / 120), type = waveType();
        for (let k = 0; k < n && G.enemies.length < MAX_ENEMIES; k++) {
          const a = (k / n) * TAU + b.wave, e = spawnEnemy(type, b.x + Math.cos(a) * 110, b.y + Math.sin(a) * 110, k === 0 && b.wave === 2 ? 2 : 1);
          emit('gold', e.x, e.y, 4, { color: STRONGBOXES[b.kind].color });
        }
        b.wave++;
      }
      if (b.wave >= 3 && !b.paid) { b.paid = true; strongboxLoot(b); if (G.atlasFx.boxBonus) dropItem(b.x, b.y - 30, 'rare'); }
      if (b.t > 8) L.boxes.splice(i, 1);
    }
  }
  // ---- essences ----
  L.essT -= dt;
  if (L.essT <= 0 && !bossUp() && G.time > 60) {
    L.essT = rand(LEAGUE.essGap[0], LEAGUE.essGap[1]) / (AF.essRate || 1);
    const [x, y] = leaguePos(330, 520);
    const e = spawnEnemy(waveType(), x, y, 2);
    e.encased = true; e.essence = pick(Object.keys(ESSENCES)); e.essProg = 0; e.encT = 0;
    if (AF.essDouble && Math.random() < 0.35) e.essence2 = pick(Object.keys(ESSENCES));
    announce('Essence!', 'มอนสเตอร์ Rare ถูกผนึกในคริสตัล — เดินเข้าไปปลดผนึก', ESSENCES[e.essence].color);
  }
  for (const e of G.enemies) {
    if (!e.encased || e.dead) continue;
    e.encT += dt;
    if (dist2(e.x, e.y, P.x, P.y) < 90 * 90) e.essProg += dt; else e.essProg = Math.max(0, e.essProg - dt);
    if (e.essProg >= 1) {
      e.encased = false; e.hp *= 1.4; e.maxHp *= 1.4; e.dmg *= 1.15;
      addEffect({ kind: 'ring', x: e.x, y: e.y, r: 90, t: 0, dur: 0.5, color: ESSENCES[e.essence].color });
      emit('shard', e.x, e.y, 16); Sfx.play('boss');
    } else if (e.encT > 90) e.dead = true;
  }
  updateRituals(dt);
  updateDelirium(dt);
}

function strongboxLoot(b) {
  const x = b.x, y = b.y;
  if (b.kind === 'arcanist') for (let i = 0; i < 5; i++) spawnPickup(x + rand(-50, 50), y + rand(-50, 50), randomCraftOrb());
  else if (b.kind === 'armourer') {
    for (const sl of shuffle(['helm', 'body', 'gloves', 'boots', 'offhand']).slice(0, 2)) dropItem(x + rand(-40, 40), y + rand(-30, 30), 'rare', sl);
    spawnPickup(x, y + 30, 'scrap'); spawnPickup(x + 20, y + 30, 'whetstone');
  } else if (b.kind === 'jeweller') {
    dropItem(x - 30, y, Math.random() < 0.12 ? 'unique' : 'rare', pick(['ring', 'amulet', 'belt']));
    dropJewel(x + 30, y);
    spawnPickup(x, y + 30, 'jeweller'); spawnPickup(x + 20, y + 30, 'chroma');
  } else if (b.kind === 'cartographer') {
    dropMapItem(x, y, Math.min(MAX_MAP_TIER, G.map.tier + (Math.random() < 0.4 ? 1 : 0)));
    if (Math.random() < 0.5) dropMapItem(x + 30, y, G.map.tier);
  } else if (b.kind === 'gemcutter') {
    const P = G.player, ok = P.skills.filter((s) => s.level < MAX_GEM_LEVEL);
    if (ok.length) { const s = pick(ok); s.level++; recomputePlayer(); announce('Gemcutter', `${SKILLS[s.id].name} +1 เลเวล (Lv ${s.level})`, '#5ae0c0'); }
    else spawnPickup(x, y, 'chest');
  }
  addEffect({ kind: 'ring', x, y, r: 120, t: 0, dur: 0.6, color: STRONGBOXES[b.kind].color });
}

// ---------------- Ritual ----------------
function updateRituals(dt) {
  const L = G.league, P = G.player;
  for (const R of L.rituals) {
    if (R.state === 'wait') {
      if (G.time >= R.at && !bossUp()) {
        const [x, y] = leaguePos(300, 460);
        Object.assign(R, { state: 'placed', x, y, idle: 0 });
        announce('Ritual Altar', 'ยืนในวงพิธีเพื่อเริ่ม Ritual — ฆ่ามอนสเตอร์เพื่อสะสม Tribute', '#ff5a5a');
      }
    } else if (R.state === 'placed') {
      R.idle += dt;
      if (dist2(R.x, R.y, P.x, P.y) < 60 * 60) {
        Object.assign(R, { state: 'active', t: LEAGUE.ritualDur, acc: 0, got: 0, age: 0 });
        Sfx.play('boss'); announce('RITUAL เริ่มแล้ว!', `อยู่ในวงพิธี ${LEAGUE.ritualDur} วินาที`, '#ff5a5a');
      } else if (R.idle > 90 || bossUp()) R.state = 'done';
    } else if (R.state === 'active') {
      R.t -= dt;
      R.acc += (3.2 + G.time / 120) * dt;
      while (R.acc >= 1 && G.enemies.length < MAX_ENEMIES) {
        R.acc -= 1;
        const a = rand(0, TAU), e = spawnEnemy(waveType(), R.x + Math.cos(a) * LEAGUE.ritualR, R.y + Math.sin(a) * LEAGUE.ritualR, Math.random() < 0.08 ? 1 : 0);
        e.ritual = R; e.hp *= 1.25; e.maxHp *= 1.25;
        emit('blood', e.x, e.y, 4, { color: '#ff3a3a' });
      }
      // stepping out of the circle pauses the rite (monsters keep coming) — but never past 2.5× its length
      R.age = (R.age || 0) + dt;
      if (dist2(R.x, R.y, P.x, P.y) > LEAGUE.ritualR * LEAGUE.ritualR) R.t += dt;
      if (R.t <= 0 || R.age >= LEAGUE.ritualDur * 2.5) finishRitual(R);
    }
  }
}
function onLeagueKill(e) {
  const L = G.league;
  if (!L) return;
  if (e.ritual && e.ritual.state === 'active') {
    const v = e.rarity === 2 ? 12 : e.rarity === 1 ? 4 : 1.2;
    L.tribute += v * G.atlasFx.tribute; e.ritual.got += v;
  }
  if (e.essence) {
    spawnPickup(e.x, e.y, 'essence', { ess: e.essence });
    if (e.essence2) spawnPickup(e.x + 20, e.y, 'essence', { ess: e.essence2 });
  }
  if (e.deli && L.deli.state === 'active') L.deli.kills++;
}
function finishRitual(R) {
  R.state = 'done';
  for (const e of G.enemies) if (e.ritual === R && !e.dead) { e.dead = true; emit('blood', e.x, e.y, 6, { color: '#ff3a3a' }); }
  addEffect({ kind: 'ring', x: R.x, y: R.y, r: LEAGUE.ritualR, t: 0, dur: 0.6, color: '#ff5a5a' });
  G.ritualOffers = ritualOffers();
  G.pendingRitual = true;
}
function ritualOffers() {
  const t = G.map.tier;
  const pool = [
    { kind: 'item', rarity: 'rare', cost: 55, label: 'ไอเทม Rare สุ่ม' },
    { kind: 'item', rarity: 'rare', slot: pick(['ring', 'amulet', 'belt']), cost: 60, label: 'เครื่องประดับ Rare' },
    { kind: 'item', rarity: 'unique', cost: 170, label: 'ไอเทม Unique สุ่ม' },
    { kind: 'orbs', n: 3, cost: 45, label: 'Orb คราฟต์ ×3' },
    { kind: 'cur', cur: 'chaos', n: 3, cost: 30, label: 'Chaos Orb ×3' },
    { kind: 'cur', cur: 'fusing', n: 2, cost: 40, label: 'Orb of Fusing ×2' },
    { kind: 'cur', cur: 'vaal', n: 1, cost: 35, label: 'Vaal Orb' },
    { kind: 'cur', cur: 'exalt', n: 1, cost: 50, label: 'Exalted Orb' },
    { kind: 'ess', cost: 40, label: 'Essence สุ่ม' },
    { kind: 'map', tier: Math.min(MAX_MAP_TIER, t + 1), cost: 65, label: `แผนที่ Tier ${Math.min(MAX_MAP_TIER, t + 1)}` },
    { kind: 'jewel', cost: 70, label: 'Jewel สุ่ม' },
    { kind: 'chest', cost: 50, label: 'หีบสมบัติ (เลือกการ์ด)' },
  ];
  return shuffle(pool).slice(0, 6).map((o) => Object.assign({ bought: false }, o, { cost: Math.round(o.cost * (0.9 + Math.random() * 0.3)) }));
}
function buyRitual(o) {
  const L = G.league, P = G.player;
  if (o.bought || L.tribute < o.cost) return false;
  L.tribute -= o.cost; o.bought = true;
  const x = P.x, y = P.y + 30;
  if (o.kind === 'item') dropItem(x + rand(-30, 30), y, o.rarity, o.slot);
  else if (o.kind === 'orbs') for (let i = 0; i < o.n; i++) spawnPickup(x + rand(-40, 40), y, randomCraftOrb());
  else if (o.kind === 'cur') P.currency[o.cur] = (P.currency[o.cur] || 0) + o.n;
  else if (o.kind === 'ess') spawnPickup(x, y, 'essence', { ess: pick(Object.keys(ESSENCES)) });
  else if (o.kind === 'map') dropMapItem(x, y, o.tier);
  else if (o.kind === 'jewel') dropJewel(x, y);
  else if (o.kind === 'chest') G.pendingChests++;
  return true;
}

// ---------------- Delirium ----------------
function updateDelirium(dt) {
  const D = G.league.deli, P = G.player;
  if (D.state === 'wait' && G.time >= D.at && !bossUp()) {
    const [x, y] = leaguePos(300, 460);
    Object.assign(D, { state: 'placed', x, y, idle: 0 });
    announce('Delirium Mirror', 'แตะกระจกเพื่อปล่อยหมอกแห่งความเพ้อคลั่ง', '#d8d8e8');
  } else if (D.state === 'placed') {
    D.idle = (D.idle || 0) + dt;
    if (dist2(D.x, D.y, P.x, P.y) < 55 * 55) {
      Object.assign(D, { state: 'active', t: 0, kills: 0 });
      Sfx.play('boss'); G.shake = Math.max(G.shake, 5);
      announce('DELIRIUM', 'มอนสเตอร์แข็งแกร่งขึ้นเรื่อยๆ แต่ของดีขึ้นเรื่อยๆ', '#e8e8f0');
    } else if (D.idle > 100) D.state = 'none';
  } else if (D.state === 'active') {
    D.t += dt;
    if (D.t >= D.dur) endDelirium(D);
  }
}
// 0 → 1 over the fog's lifetime
const deliP = () => { const D = G.league && G.league.deli; return D && D.state === 'active' ? Math.min(1, D.t / D.dur) : 0; };
// called for every spawned monster while the fog is up
function deliriumBuff(e) {
  const p = deliP();
  if (!p || e.rarity === 3) return;
  e.deli = true; e.hp *= 1 + p; e.maxHp *= 1 + p; e.dmg *= 1 + p * 0.5; e.xp *= 1.5;
}
function endDelirium(D) {
  D.state = 'none';
  if (G.atlasFx.deliTwice && !D.again) { D.again = true; D.state = 'wait'; D.at = G.time + rand(120, 200); }
  const P = G.player, k = D.kills;
  const n = Math.min(10, Math.round((1 + Math.floor(k / 35)) * G.atlasFx.deliReward));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, x = P.x + Math.cos(a) * 60, y = P.y + Math.sin(a) * 60;
    const r = Math.random();
    if (r < 0.35) spawnPickup(x, y, randomCraftOrb());
    else if (r < 0.55) dropItem(x, y, Math.random() < 0.1 ? 'unique' : 'rare');
    else if (r < 0.7) dropJewel(x, y);
    else if (r < 0.82) dropMapItem(x, y, Math.min(MAX_MAP_TIER, G.map.tier + 1));
    else spawnPickup(x, y, 'chest');
  }
  announce('หมอกจางลง', `สังหาร ${k} ตัวในหมอก · รางวัล ${n} ชิ้น`, '#e8e8f0');
  G.stats.delirium = (G.stats.delirium || 0) + 1;
}

// ---------------- rendering ----------------
function drawLeagues(ctx, inView) {
  const L = G.league;
  if (!L) return;
  ctx.font = '700 12px Cinzel, serif'; ctx.textAlign = 'center';
  for (const b of L.boxes) {
    if (!inView(b.x, b.y, 80)) continue;
    const S = STRONGBOXES[b.kind];
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + Math.sin(G.time * 4) * 0.2; ctx.drawImage(glowSprite(S.color, 50), b.x - 50, b.y - 50); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    drawSprite(ctx, 'chest', 0, false, 'dark', '', b.x, b.y + 12, b.state === 'open' ? 2.6 : 3);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = S.color; ctx.fillText(S.name, b.x, b.y - 34);
    if (b.state === 'closed' && b.prog > 0) progressRing(ctx, b.x, b.y, 44, b.prog / 1.1, S.color);
  }
  for (const e of G.enemies) {
    if (!e.encased || e.dead || !inView(e.x, e.y, 80)) continue;
    const c = ESSENCES[e.essence].color, r = e.r + 14;
    ctx.fillStyle = hexA(c, 0.22); ctx.strokeStyle = hexA(c, 0.9); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3, rr = r * (k % 2 ? 1.25 : 1); ctx[k ? 'lineTo' : 'moveTo'](e.x + Math.cos(a) * rr, e.y - 8 + Math.sin(a) * rr * 1.3); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c; ctx.fillText(ESSENCES[e.essence].name, e.x, e.y - r * 1.4 - 8);
    if (e.essProg > 0) progressRing(ctx, e.x, e.y, r + 18, e.essProg, c);
  }
  for (const R of L.rituals) {
    if ((R.state !== 'placed' && R.state !== 'active') || !inView(R.x, R.y, LEAGUE.ritualR + 20)) continue;
    const act = R.state === 'active';
    ctx.strokeStyle = act ? 'rgba(255,60,60,0.85)' : 'rgba(255,90,90,0.6)'; ctx.lineWidth = act ? 3 : 2;
    ctx.setLineDash(act ? [] : [12, 8]);
    ctx.beginPath(); ctx.arc(R.x, R.y, act ? LEAGUE.ritualR : 60, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // runes around the circle
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + G.time * (act ? 0.6 : 0.2), rr = act ? LEAGUE.ritualR : 60;
      ctx.fillStyle = '#ff6a5a'; ctx.fillText('ᛟ', R.x + Math.cos(a) * rr, R.y + Math.sin(a) * rr + 4);
    }
    ctx.fillStyle = '#ff8a7a'; ctx.fillRect(R.x - 5, R.y - 26, 10, 26);
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ff3a2a', 26), R.x - 26, R.y - 44); ctx.globalCompositeOperation = 'source-over';
    if (!act) { ctx.fillStyle = '#ff8a7a'; ctx.fillText('RITUAL', R.x, R.y - 50); }
  }
  const D = L.deli;
  if (D.state === 'placed' && inView(D.x, D.y, 60)) {
    ctx.fillStyle = 'rgba(200,210,230,0.25)'; ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(D.x, D.y - 20, 18, 34, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8eef8'; ctx.fillText('DELIRIUM', D.x, D.y - 64);
    if (Math.random() < 0.3) emit('wisp', D.x + rand(-20, 20), D.y - 20, 1);
  }
}
function progressRing(ctx, x, y, r, p, c) {
  ctx.strokeStyle = hexA(c, 0.9); ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, p)); ctx.stroke();
}
// screen-space fog for Delirium (drawn after the darkness pass)
function drawDeliriumFog(ctx, W, H) {
  const p = deliP();
  if (!p) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.15, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, 'rgba(210,215,230,0)'); g.addColorStop(1, `rgba(200,205,220,${0.25 + p * 0.25})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// HUD lines + off-screen arrows for league objects
function drawLeagueHUD(ctx, W, H, y0) {
  const L = G.league;
  if (!L) return y0;
  ctx.textAlign = 'center'; ctx.font = '700 15px Cinzel, serif';
  for (const R of L.rituals) if (R.state === 'active') { ctx.fillStyle = '#ff7a6a'; ctx.fillText(`RITUAL ${Math.max(0, R.t).toFixed(1)}s · Tribute ${Math.floor(L.tribute)}`, W / 2, y0); y0 += 20; }
  const D = L.deli;
  if (D.state === 'active') { ctx.fillStyle = '#e8eef8'; ctx.fillText(`DELIRIUM ${Math.round(deliP() * 100)}% · ☠ ${D.kills}`, W / 2, y0); y0 += 20; }
  const targets = L.boxes.filter((b) => b.state === 'closed').map((b) => [b.x, b.y, STRONGBOXES[b.kind].color])
    .concat(L.rituals.filter((R) => R.state === 'placed').map((R) => [R.x, R.y, '#ff5a5a']))
    .concat(D.state === 'placed' ? [[D.x, D.y, '#e8eef8']] : [])
    .concat(G.enemies.filter((e) => e.encased && !e.dead).map((e) => [e.x, e.y, ESSENCES[e.essence].color]));
  for (const [x, y, c] of targets) edgeArrow(ctx, W, H, x, y, c);
  ctx.textAlign = 'right'; ctx.font = '600 14px Sarabun, sans-serif';
  return y0;
}
function edgeArrow(ctx, W, H, x, y, c) {
  const dx = (x - G.cam.x) * G.zoom, dy = (y - G.cam.y) * G.zoom;
  if (Math.abs(dx) < W / 2 - 20 && Math.abs(dy) < H / 2 - 20) return;
  const a = Math.atan2(dy, dx), m = Math.min((W / 2 - 34) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 34) / Math.abs(Math.sin(a) || 1e-6));
  ctx.save(); ctx.translate(W / 2 + Math.cos(a) * m, H / 2 + Math.sin(a) * m); ctx.rotate(a);
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-7, -9); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------------- Ritual reward window ----------------
function openRitual() {
  G.pendingRitual = false;
  G.state = 'ritual';
  renderRitual();
  show('ritual');
}
function renderRitual() {
  const L = G.league;
  $('ritual-tribute').textContent = `Tribute: ${Math.floor(L.tribute)} (เหลือใช้ต่อได้ใน Ritual ถัดไป)`;
  $('ritual-offers').innerHTML = G.ritualOffers.map((o, i) => `<div class="card ritual-offer${o.bought ? ' bought' : ''}${!o.bought && L.tribute < o.cost ? ' poor' : ''}" data-ro="${i}">
    <div class="card-name">${o.label}</div><div class="card-th">${o.bought ? '✓ ซื้อแล้ว' : `${o.cost} Tribute`}</div></div>`).join('');
  $('ritual').querySelectorAll('[data-ro]').forEach((el) => {
    el.onclick = () => { const o = G.ritualOffers[+el.dataset.ro]; if (buyRitual(o)) { Sfx.play('currency'); renderRitual(); } };
  });
}
function closeRitual() {
  hide('ritual');
  G.state = 'play';
  G.lastTs = performance.now();
}
