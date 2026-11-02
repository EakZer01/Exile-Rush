'use strict';
// ============================================================
//  BREACH — league-style event during a run.
//  A small purple rift appears near the player. Step into it and it
//  tears open: the circle grows while breach monsters pour out. Each
//  kill buys a little more time. When it closes, survivors vanish and
//  the haul (orbs, items, a chest) drops at the centre.
// ============================================================
const BREACH = { first: 85, gap: [100, 135], open: 11, maxAge: 24, perKill: 0.2, r0: 70, rMax: 440, grow: 34 };

function resetBreach() { G.breach = { state: 'wait', t: BREACH.first / G.atlasFx.breachRate, x: 0, y: 0, r: 0, kills: 0, age: 0, acc: 0, idle: 0 }; }

function updateBreach(dt) {
  const B = G.breach, P = G.player;
  if (!B) return;
  const bossUp = G.bossRef && !G.bossRef.dead;
  if (B.state === 'wait') {
    B.t -= dt;
    if (B.t <= 0 && !bossUp) {
      const a = rand(0, TAU), d = rand(380, 560);
      Object.assign(B, { state: 'placed', x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, idle: 0 });
      announce('Breach ปรากฏตัว!', 'เดินเข้าไปในรอยแยกสีม่วงเพื่อเปิด', '#c070ff');
    }
  } else if (B.state === 'placed') {
    B.idle += dt;
    if (dist2(B.x, B.y, P.x, P.y) < 70 * 70) {
      Object.assign(B, { state: 'open', t: BREACH.open, r: BREACH.r0, kills: 0, age: 0, acc: 0 });
      Sfx.play('boss'); G.shake = Math.max(G.shake, 6);
      announce('BREACH เปิดแล้ว!', 'ฆ่ามอนสเตอร์ Breach เพื่อยืดเวลา', '#c070ff');
      showTip('breach');
    } else if (B.idle > 75 || bossUp) closeBreach(false);
  } else if (B.state === 'open') {
    B.t -= dt; B.age += dt;
    B.r = Math.min(BREACH.rMax, B.r + BREACH.grow * dt);
    // pour monsters out of the rift
    B.acc += (5 + gameMin() * 0.45) * dt;
    while (B.acc >= 1) {
      B.acc -= 1;
      if (G.enemies.length >= MAX_ENEMIES) break;
      const a = rand(0, TAU), d = B.r * Math.sqrt(rand(0.15, 1));
      let x = B.x + Math.cos(a) * d, y = B.y + Math.sin(a) * d;
      if (dist2(x, y, P.x, P.y) < 140 * 140) { x = B.x + Math.cos(a + Math.PI) * d; y = B.y + Math.sin(a + Math.PI) * d; }
      const e = spawnEnemy(waveType(), x, y, Math.random() < 0.06 ? 1 : 0);
      e.breach = true; e.hp *= 1.3; e.maxHp *= 1.3; e.xp *= 2; e.speed *= 1.1;
      emit('wisp', x, y, 6);
    }
    if (Math.random() < 0.6) { const a = rand(0, TAU); emit('wisp', B.x + Math.cos(a) * B.r, B.y + Math.sin(a) * B.r, 1); }
    if (B.t <= 0 || B.age >= BREACH.maxAge) closeBreach(true);
  }
}

function onBreachKill(e) {
  const B = G.breach;
  if (!e.breach || !B || B.state !== 'open') return;
  B.kills++;
  B.t = Math.min(B.t + BREACH.perKill, BREACH.maxAge - B.age);
}

function closeBreach(opened) {
  const B = G.breach;
  if (opened) {
    // remaining breach monsters are pulled back into the rift
    for (const e of G.enemies) if (e.breach && !e.dead) { e.dead = true; emit('wisp', e.x, e.y, 4); }
    const k = Math.round(B.kills * G.atlasFx.breachLoot);
    const orbs = Math.min(6, 1 + Math.floor(k / 30));
    for (let i = 0; i < orbs; i++) spawnPickup(B.x + rand(-50, 50), B.y + rand(-50, 50), randomCraftOrb());
    if (k >= 20) spawnPickup(B.x, B.y, 'chest');
    if (k >= 40) dropItem(B.x + 30, B.y, k >= 80 && Math.random() < 0.3 ? 'unique' : 'rare');
    addEffect({ kind: 'ring', x: B.x, y: B.y, r: B.r, t: 0, dur: 0.6, color: '#c070ff' });
    announce('Breach ปิดแล้ว', `สังหาร ${k} ตัว · รางวัลตกอยู่ที่ใจกลาง`, '#c070ff');
    G.stats.breaches = (G.stats.breaches || 0) + 1;
  }
  Object.assign(B, { state: 'wait', t: rand(BREACH.gap[0], BREACH.gap[1]) / G.atlasFx.breachRate, r: 0 });
}

// ---- rendering (pass B, glows in the dark) ----
function drawBreach(ctx) {
  const B = G.breach;
  if (!B || B.state === 'wait') return;
  ctx.globalCompositeOperation = 'lighter';
  if (B.state === 'placed') {
    const p = 0.7 + Math.sin(G.time * 5) * 0.3;
    ctx.globalAlpha = p; ctx.drawImage(glowSprite('#b060ff', 60), B.x - 60, B.y - 60); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#d8a0ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(B.x, B.y, 26, 40 + Math.sin(G.time * 3) * 4, 0, 0, TAU); ctx.stroke();
    ctx.font = '700 13px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e0c0ff';
    ctx.fillText('BREACH', B.x, B.y - 52);
  } else {
    const grd = ctx.createRadialGradient(B.x, B.y, B.r * 0.6, B.x, B.y, B.r);
    grd.addColorStop(0, 'rgba(120,40,200,0)'); grd.addColorStop(1, 'rgba(160,70,255,0.22)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(B.x, B.y, B.r, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(210,150,255,0.8)'; ctx.lineWidth = 3;
    ctx.setLineDash([18, 10]); ctx.lineDashOffset = G.time * 40;
    ctx.beginPath(); ctx.arc(B.x, B.y, B.r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalCompositeOperation = 'source-over';
}
