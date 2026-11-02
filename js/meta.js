'use strict';
// ============================================================
//  Meta-progression runtime: save/load, Legacy Tree allocation,
//  applying the tree to a run and settling rewards when a run ends.
// ============================================================
let Meta = null;

function freshMeta() {
  return { v: 2, shards: 0, alloc: {}, unlocked: {}, found: {}, atlas: { maxTier: 1, done: {} }, lastMap: null, life: { runs: 0, wins: 0, kills: 0, bosses: 0, time: 0 } };
}

function loadMeta() {
  if (Meta) return Meta;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch (e) { saved = null; }
  if (saved && (saved.v === 1 || saved.v === 2)) {
    Meta = Object.assign(freshMeta(), saved);
    if (saved.v === 1) {
      // v1 had flat upgrades: refund everything spent so it can go into the tree
      Meta.shards += saved.spent || 0;
      delete Meta.up; delete Meta.spent;
      Meta.v = 2; Meta.alloc = {};
      saveMeta();
    }
  } else {
    Meta = freshMeta();
    // players from before meta-progression keep what their best run earned
    const best = loadBest();
    if (best) {
      const r = { time: best.time, level: best.level, kills: best.kills, win: !!best.win, bosses: best.win ? 4 : Math.min(3, Math.floor(best.time / 300)) };
      Meta.life.kills = best.kills;
      for (const u of UNLOCKS) if (u.test(r, Meta.life)) Meta.unlocked[u.id] = true;
    }
    saveMeta();
  }
  // drop nodes that no longer exist (tree changed between versions)
  for (const id in Meta.alloc) if (!TREE_NODES[id]) { Meta.shards += Meta.alloc[id]; delete Meta.alloc[id]; }
  return Meta;
}
function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(Meta)); } catch (e) { /* storage may be blocked */ }
}

function isLocked(kind, ref) {
  const u = UNLOCKS.find((x) => x.kind === kind && x.ref === ref);
  return !!u && !loadMeta().unlocked[u.id];
}
function buyUnlock(id) {
  const u = UNLOCKS.find((x) => x.id === id);
  if (!u || Meta.unlocked[id] || Meta.shards < u.cost) return false;
  Meta.shards -= u.cost; Meta.unlocked[id] = true;
  saveMeta();
  return true;
}

// ---- Legacy Tree ----
const treeAllocated = (id) => id === TREE_START || !!loadMeta().alloc[id];
const treePointsUsed = () => Object.keys(loadMeta().alloc).length;
const treeNextCost = (id) => treeNodeCost(TREE_NODES[id], treePointsUsed());

// '' if the node can be taken now, else why not (Thai)
function treeAllocReason(id) {
  if (treeAllocated(id)) return 'จัดสรรแล้ว';
  if (!TREE_NODES[id].links.some(treeAllocated)) return 'ต้องเชื่อมกับโหนดที่จัดสรรแล้ว';
  if (treePointsUsed() >= treePointCap()) return `แต้มเต็มแล้ว (${treePointCap()})`;
  if (loadMeta().shards < treeNextCost(id)) return 'Shards ไม่พอ';
  return '';
}
function treeAllocate(id) {
  if (treeAllocReason(id)) return false;
  const cost = treeNextCost(id);
  Meta.shards -= cost; Meta.alloc[id] = cost;
  saveMeta();
  return true;
}
// a node can be refunded only if everything else stays connected to the start
function treeCanRefund(id) {
  if (id === TREE_START || !loadMeta().alloc[id]) return false;
  const seen = new Set([TREE_START]), stack = [TREE_START];
  while (stack.length) {
    for (const l of TREE_NODES[stack.pop()].links) {
      if (l === id || seen.has(l) || !Meta.alloc[l]) continue;
      seen.add(l); stack.push(l);
    }
  }
  return Object.keys(Meta.alloc).every((a) => a === id || seen.has(a));
}
function treeRefund(id) {
  if (!treeCanRefund(id)) return false;
  Meta.shards += Meta.alloc[id]; delete Meta.alloc[id];
  saveMeta();
  return true;
}
function treeRespec() {
  loadMeta();
  for (const id in Meta.alloc) Meta.shards += Meta.alloc[id];
  Meta.alloc = {};
  saveMeta();
}

// ---- hooks used by the run ----
function applyMetaMods(m) {
  for (const id in loadMeta().alloc) { const n = TREE_NODES[id]; if (n.apply) n.apply(m); }
}
function applyMetaStart(P) {
  for (const id in loadMeta().alloc) { const n = TREE_NODES[id]; if (n.start) n.start(P); }
}

// settle a finished run: shards + lifetime stats + achievement unlocks
function settleRun(r) {
  const M = loadMeta();
  const reward = shardReward(r);
  if (r.map) {
    const mult = mapRewardMult(r.map);
    if (mult > 1) { const bonus = Math.round(reward.total * (mult - 1)); reward.parts.push(['โบนัสแผนที่', bonus]); reward.total += bonus; }
  }
  M.shards += reward.total;
  let atlas = null;
  if (r.win && r.map) atlas = completeMap(r.map);
  M.life.runs++; M.life.kills += r.kills; M.life.bosses += r.bosses; M.life.time += r.time;
  if (r.win) M.life.wins++;
  const newly = [];
  for (const u of UNLOCKS) if (!M.unlocked[u.id] && u.test(r, M.life)) { M.unlocked[u.id] = true; newly.push(u); }
  saveMeta();
  return { reward, newly, atlas };
}

function unlockLabel(u) { return u.kind === 'class' ? CLASSES.find((c) => c.id === u.ref).name : SKILLS[u.ref].name; }

// ---- Atlas ----
function atlasData() { const M = loadMeta(); if (!M.atlas) M.atlas = { maxTier: 1, done: {} }; return M.atlas; }
const atlasDoneCount = () => Object.keys(atlasData().done).length;
function atlasBonusPoints() { return Math.min(ATLAS_POINT_CAP, atlasDoneCount()); }
function treePointCap() { return TREE_POINTS + atlasBonusPoints(); }
const biomeOpen = (id) => atlasData().maxTier >= BIOMES[id].minTier;
// winning a map: record it, unlock the next tier
function completeMap(cfg) {
  const A = atlasData(), key = cfg.biome + '_' + cfg.tier, out = { first: !A.done[key], tierUp: false };
  A.done[key] = true;
  if (cfg.tier >= A.maxTier && A.maxTier < MAX_MAP_TIER) { A.maxTier = cfg.tier + 1; out.tierUp = true; }
  out.maxTier = A.maxTier;
  return out;
}
