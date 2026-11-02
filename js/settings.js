'use strict';
// ============================================================
//  Settings (saved), background music, adaptive quality, tips
// ============================================================
const SETTINGS_KEY = 'exile_settings';
const SETTINGS_DEFAULT = { sfx: 0.7, music: 0.45, lighting: true, fx: true, dmgNumbers: true, shake: true, quality: 'auto', lootFilter: 0, hlRes: true, levelMode: 'boss', minimap: true };

function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (e) { s = {}; }
  G.settings = Object.assign({}, SETTINGS_DEFAULT, s);
  applySettings();
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); } catch (e) { /* storage may be blocked */ }
}
function applySettings() {
  Sfx.vol = G.settings.sfx;
  Music.setVolume(G.settings.music);
  if (!G.settings.fx) _parts.length = 0;
}
function toggleSetting(k) { G.settings[k] = !G.settings[k]; applySettings(); saveSettings(); }

// ---------------- Music: procedural dark ambient ----------------
// A detuned drone through a slowly sweeping low-pass, plus a sparse
// minor-scale pluck melody. Boss fights double the tempo and add a pulse.
const MUSIC_SCALE = [0, 3, 5, 7, 8, 10, 12, 15];
const Music = {
  gain: null, nextT: 0, step: 0, vol: 0.45,
  start() {
    const c = Sfx.ctx;
    if (!c || this.gain) return;
    this.gain = c.createGain(); this.gain.gain.value = this.vol * 0.5; this.gain.connect(c.destination);
    const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 380; filter.Q.value = 3;
    filter.connect(this.gain);
    for (const [f, type, v] of [[55, 'sawtooth', 0.05], [55.4, 'sawtooth', 0.05], [82.4, 'triangle', 0.04]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f; g.gain.value = v;
      o.connect(g); g.connect(filter); o.start();
    }
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.06; lg.gain.value = 200;
    lfo.connect(lg); lg.connect(filter.frequency); lfo.start();
    this.nextT = c.currentTime + 0.5;
  },
  setVolume(v) { this.vol = v; if (this.gain) this.gain.gain.value = v * 0.5; },
  update() {
    const c = Sfx.ctx;
    if (!c || !this.gain || this.vol <= 0) return;
    const playing = G.state === 'play', boss = playing && G.bossRef && !G.bossRef.dead;
    const beat = boss ? 0.25 : 0.55;
    if (this.nextT < c.currentTime) this.nextT = c.currentTime + 0.05;
    while (this.nextT < c.currentTime + 0.25) {
      if (playing && (boss || Math.random() < 0.55)) this.pluck(this.nextT, boss);
      if (boss && this.step % 4 === 0) this.kick(this.nextT);
      this.nextT += beat; this.step++;
    }
  },
  pluck(t, boss) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain();
    const semi = MUSIC_SCALE[Math.floor(Math.random() * MUSIC_SCALE.length)] + (Math.random() < 0.3 ? 12 : 0);
    o.type = boss ? 'square' : 'triangle';
    o.frequency.value = 220 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(boss ? 0.025 : 0.045, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (boss ? 0.3 : 0.9));
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 1);
  },
  kick(t) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 0.25);
  },
};

// ---------------- Adaptive quality ----------------
// 'auto' watches frame cost; when it stays high, particles and the
// light layer resolution are cut back (and restored when it recovers).
const Perf = { avg: 8, low: false, t: 0 };
function perfSample(ms, dt) {
  Perf.avg = Perf.avg * 0.95 + ms * 0.05;
  const q = G.settings.quality;
  const wantLow = q === 'low' || (q === 'auto' && (Perf.low ? Perf.avg > 12 : Perf.avg > 20));
  Perf.t = wantLow === Perf.low ? 0 : Perf.t + dt;
  if (Perf.t > (q === 'auto' ? 2 : 0)) {
    Perf.low = wantLow; Perf.t = 0;
    Lighting.scale = Perf.low ? 0.33 : 0.5;
  }
}
const particleCap = () => (Perf.low ? 350 : MAX_PARTICLES);

// ---------------- First-time tips ----------------
const TIPS = {
  start: 'สกิลร่ายเองอัตโนมัติ — คุณแค่เดินหลบ (WASD) · Space = Dash อมตะชั่วครู่ · Q/E = ฟลาสก์',
  levelup: 'เลเวลอัพ: เลือก 1 การ์ด — สกิลใหม่, เลเวลเจม, Support, Passive · Chaos Orb (R) สุ่มการ์ดใหม่ได้',
  support: 'Support Gem ต้องใส่ในซ็อกเก็ตของสกิลที่มีแท็กตรงกัน (เช่น Projectile) · ซ็อกเก็ตเต็มใช้ Orb of Fusing เพิ่มได้',
  keystone: 'Keystone เปลี่ยนแนวบิวมาก มีทั้งข้อดีและข้อเสีย · เลือกได้สูงสุด 3 อันต่อรอบ',
  evolve: 'เจมนี้วิวัฒน์ได้แล้ว! ร่าง Vaal แรงขึ้นและได้ท่าไม้ตาย: ฆ่าศัตรูเก็บวิญญาณแล้วกด V',
  vaal: 'วิญญาณเต็มแล้ว — กด V (มือถือ: แตะแถบสกิล) ปล่อยท่าไม้ตาย Vaal',
  item: 'ได้ไอเทม! ถ้าช่องว่างจะสวมให้อัตโนมัติ · กด I เพื่อเปรียบเทียบ สวมใส่ ย่อย หรือคราฟต์ด้วย Orb',
  ascend: 'Ascendancy: เลือกคลาสย่อยได้ครั้งเดียวต่อรอบ บอสตัวถัดไปให้โหนดเพิ่ม',
  breach: 'Breach เปิดแล้ว! เดินเข้าไปในวงม่วง ฆ่ามอนสเตอร์ Breach ให้มากที่สุดก่อนวงปิด เพื่อรับรางวัลใหญ่',
  craft: 'ได้ Orb คราฟต์ไอเทม! กด I เลือกไอเทมแล้วใช้ Regal / Exalted / Divine / Annulment / Chaos ปรับ mod',
  codex: 'ดูข้อมูลเจม คอมโบ และ Unique ทั้งหมดได้ที่ "Codex" ในเมนูหลัก',
  essence: 'ได้ Essence! กด I เลือกไอเทม (Normal/Magic/Rare) แล้วใช้ Essence เพื่อสร้าง Rare ที่การันตี mod นั้น (Tier 3 ขึ้นไป)',
  res: 'แผนที่ Tier สูงลดค่าต้านทานของคุณ · ดูค่าต้านทานได้ที่หน้าสถิติ (C) · หาไอเทม/ฟลาสก์ที่มีค่าต้านทาน',
  stash: 'จบรอบแล้วเลือกไอเทมเก็บเข้า Stash ได้ · Jewel เก็บอัตโนมัติ · พกไอเทมจาก Stash เข้ารอบได้ที่ Map Device',
};
const TIPS_KEY = 'exile_tips';
let _tipsSeen = null, _tipTimer = null;
function tipsSeen() {
  if (_tipsSeen) return _tipsSeen;
  try { _tipsSeen = JSON.parse(localStorage.getItem(TIPS_KEY) || '{}') || {}; } catch (e) { _tipsSeen = {}; }
  return _tipsSeen;
}
function showTip(id) {
  const seen = tipsSeen();
  if (seen[id] || !TIPS[id]) return;
  seen[id] = true;
  try { localStorage.setItem(TIPS_KEY, JSON.stringify(seen)); } catch (e) { /* ignore */ }
  const el = $('tip');
  el.innerHTML = `<b>TIP</b> ${TIPS[id]} <button class="tip-x" aria-label="ปิด">×</button>`;
  el.querySelector('.tip-x').onclick = () => hide('tip');
  show('tip');
  clearTimeout(_tipTimer);
  _tipTimer = setTimeout(() => hide('tip'), 9000);
}
function resetTips() { _tipsSeen = {}; try { localStorage.removeItem(TIPS_KEY); } catch (e) { /* ignore */ } }
