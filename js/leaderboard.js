'use strict';
// ============================================================
//  Leaderboard: top runs from the shared Supabase table that
//  telemetry already fills. Read-only through the same public
//  (anon) key stats.html uses. Three boards:
//    daily   — today's Daily runs   (highest score wins)
//    weekly  — this week's Weekly   (same seeded map for everyone)
//    endgame — the deepest Endgame  (most Echo bosses killed)
//  A run is scored like the Daily: time_s + 600 for a win.
// ============================================================
const LB_CACHE_TTL = 60000;
let lbCat = 'daily';
const lbCache = {};
const LB_CATS = [
  ['daily', 'Daily วันนี้'],
  ['weekly', 'Weekly สัปดาห์นี้'],
  ['endgame', 'Endgame ลึกสุด'],
];

const lbDisabled = () => !STATS_CONFIG.url || !STATS_CONFIG.key || statsDevHost();
const lbScore = (r) => r.time_s + (r.result !== 'dead' ? 600 : 0);
// a named player shows the name; everyone else gets "Class-xxxx" from their anonymous id
const lbName = (r) => r.name || `${r.cls || '?'}-${String(r.player || '').slice(-4)}`;

function lbTodayIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

// one fetch per category (≤500 rows), cached briefly so tab-switching is instant
async function lbFetch(cat) {
  const hit = lbCache[cat];
  if (hit && Date.now() - hit.at < LB_CACHE_TTL) return hit.rows;
  const base = STATS_CONFIG.url.replace(/\/$/, '') + '/rest/v1/runs';
  const cols = 'build,player,name,cls,asc_class,result,time_s,level,tier,heat,hc,daily,weekly,echoes,kills,created_at';
  let url = base + '?select=' + cols;
  if (cat === 'daily') url += '&daily=eq.true&created_at=gte.' + encodeURIComponent(lbTodayIso());
  else if (cat === 'weekly') url += '&weekly=eq.' + weeklyKey();
  else url += '&result=eq.endgame';
  url += '&order=id.desc&limit=500';
  const res = await fetch(url, { headers: { apikey: STATS_CONFIG.key, Authorization: 'Bearer ' + STATS_CONFIG.key } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const rows = await res.json();
  rows.sort(cat === 'endgame'
    ? (a, b) => (b.echoes || 0) - (a.echoes || 0) || b.time_s - a.time_s
    : (a, b) => lbScore(b) - lbScore(a));
  lbCache[cat] = { at: Date.now(), rows };
  return rows;
}

// the shell rendered synchronously into the records page
function leaderboardHtml() {
  if (lbDisabled()) {
    return `<div class="muted lb-note">Leaderboard ปิดใช้งานบนเครื่องนี้ (รันบน localhost หรือยังไม่ได้ตั้งค่า Supabase ใน js/stats-config.js) · ดูสถิติรวมได้ที่ <a href="stats.html" target="_blank" rel="noopener">stats.html</a></div>`;
  }
  const cat = LB_CATS.find((c) => c[0] === lbCat) || LB_CATS[0];
  const w = weeklySetup();
  const sub = lbCat === 'weekly'
    ? `${w.cls.name} · ${mapLabel(w.map)} — ทุกคนเจอแผนที่เดียวกันทั้งสัปดาห์ · ชนะครั้งแรกได้ ✦${WEEKLY_WIN_SHARDS}`
    : lbCat === 'endgame'
      ? 'คัดจากจำนวน Echo บอสที่โค่นได้ใน Endgame ∞ (ตายใน Endgame ก็ยังนับว่าชนะ)'
      : 'คะแนน = เวลาที่รอด + 600 ถ้าชนะ · รีเซ็ตทุกวัน';
  return `<div class="lb-cats">${LB_CATS.map(([id, label]) => `<button class="btn btn-small${lbCat === id ? ' lb-on' : ''}" data-lb="${id}">${label}</button>`).join('')}</div>
    <div class="muted lb-sub">${sub}</div>
    <div id="lb-body" class="lb-body"><div class="muted" style="padding:16px;text-align:center">กำลังโหลด…</div></div>`;
}

// async fill of #lb-body (bails if the user left the page or switched category)
let lbSeq = 0;
function lbLoad() {
  if (lbDisabled()) return;
  const seq = ++lbSeq, cat = lbCat;
  lbFetch(cat).then((rows) => {
    if (seq !== lbSeq || altarTab !== 'lb' || !$('lb-body')) return;
    $('lb-body').innerHTML = lbRowsHtml(rows);
  }).catch((e) => {
    if (seq !== lbSeq || altarTab !== 'lb' || !$('lb-body')) return;
    $('lb-body').innerHTML = `<div class="bad lb-note">โหลด Leaderboard ไม่สำเร็จ (${esc(e.message)}) — ถ้าเพิ่งอัปเดตเกม ให้รัน supabase/migrate_leaderboard.sql บน Supabase ก่อน</div>`;
  });
}

function lbRowsHtml(rows) {
  if (!rows.length) return '<div class="muted lb-note">ยังไม่มีสถิติในหมวดนี้ — เป็นคนแรกที่ทำได้เลย!</div>';
  const me = statsPlayerId();
  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1));
  const line = (r, i) => {
    const clsName = (CLASSES.find((c) => c.id === r.cls) || {}).name || '?';
    const sub = [clsName, r.asc_class, r.hc ? '☠ Hardcore' : '', r.heat ? `☢ Corruption ${r.heat}` : ''].filter(Boolean).join(' · ');
    const stat = r.result === 'endgame'
      ? `Echo ${r.echoes || 0} · ${fmtTime(r.time_s)} · ฆ่า ${fmtNum(r.kills)}`
      : `${fmtTime(r.time_s)} · T${r.tier} · คะแนน ${fmtNum(lbScore(r))}`;
    const flag = r.result === 'endgame' ? '<span class="lb-flag end">ENDGAME</span>'
      : r.result === 'win' ? '<span class="lb-flag win">ชนะ!</span>'
      : '<span class="lb-flag">ล้ม</span>';
    return `<div class="lb-row${r.player === me ? ' me' : ''}">
      <span class="lb-rank">${medal(i)}</span>
      <span class="lb-main"><b>${esc(lbName(r))}</b><span class="muted"> ${esc(sub)}</span></span>
      ${flag}
      <span class="lb-stat">${stat}</span></div>`;
  };
  const top = rows.slice(0, 20).map(line).join('');
  const myIdx = rows.findIndex((r) => r.player === me);
  const mine = myIdx >= 20 ? `<div class="lb-sep muted">… ของคุณ …</div>` + line(rows[myIdx], myIdx) : '';
  return top + mine;
}

// called from renderAltarProgress once the shell is in the DOM
function lbBind() {
  const box = $('altar-prog');
  box.querySelectorAll('[data-lb]').forEach((b) => { b.onclick = () => { if (lbCat !== b.dataset.lb) { lbCat = b.dataset.lb; openRecords('lb'); } }; });
  lbLoad();
}
