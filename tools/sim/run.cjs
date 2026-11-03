// Balance simulator — runs the real game code headless, in parallel.
//   node tools/sim/run.cjs bench              every skill x weapon: single target, pack and clear speed (~2 min)
//   node tools/sim/run.cjs bots [cls] [skill] full 15-minute bot runs: <cls> seeds per class, <skill> per solo skill (default 5 / 2)
//   node tools/sim/run.cjs report             print both reports again from tools/sim/out/
// Results land in tools/sim/out/ (git-ignored). Compare a run before and after a balance change.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const here = __dirname, outDir = path.join(here, 'out');
const BENCH = path.join(outDir, 'bench.jsonl'), BOTS = path.join(outDir, 'bots.jsonl'), JOBS = path.join(outDir, 'jobs.json');
const CLASSES = ['witch', 'ranger', 'marauder', 'templar', 'shadow', 'duelist', 'scion'];
const procs = Math.max(1, os.cpus().length - 1);
const KEYS = ['st3', 'cl3', 'st10', 'pk10', 'cl10', 'st20', 'pk20', 'cl20'];
const readRows = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []);

function parallel(script, argsFor) {
  return Promise.all(Array.from({ length: procs }, (_, i) => new Promise((done, fail) => {
    const p = spawn(process.execPath, [path.join(here, script), ...argsFor(i)], { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('exit', (code) => (code ? fail(new Error(`${script} worker ${i} exited ${code}`)) : done()));
  })));
}

// best weapon per skill = the one with the most clear at gem level 10
function bestBySkill(rows) {
  const best = {};
  for (const r of rows) if (!best[r.id] || r.cl10 + r.st10 / 10 > best[r.id].cl10 + best[r.id].st10 / 10) best[r.id] = r;
  return best;
}

function benchReport() {
  const best = bestBySkill(readRows(BENCH));
  if (!Object.keys(best).length) return console.log('no bench results yet: node tools/sim/run.cjs bench');
  const med = {};
  for (const k of KEYS) { const v = Object.values(best).map((b) => b[k]).sort((a, b) => a - b); med[k] = v[v.length >> 1]; }
  const score = (b) => Math.exp(KEYS.reduce((a, k) => a + Math.log(Math.max(b[k], 0.5) / med[k]), 0) / KEYS.length);
  const list = Object.values(best).filter((b) => !b.id.startsWith('herald')).map((b) => ({ ...b, s: score(b) })).sort((a, b) => b.s - a.s);
  console.log('\n== SKILL BENCH (x median; st = single target dps, pk = 15-dummy pack dps, cl = kills/min; number = gem level) ==');
  console.log('skill'.padEnd(20) + KEYS.map((k) => k.padStart(7)).join('') + '  weapon   score');
  for (const r of list) console.log(r.id.padEnd(20) + KEYS.map((k) => (r[k] / med[k]).toFixed(2).padStart(7)).join('') + '  ' + r.w.padEnd(8) + r.s.toFixed(2));
  console.log(`spread strongest / weakest: ${(list[0].s / list[list.length - 1].s).toFixed(1)}x  (Heralds left out: they only act on kills)`);
}

function botReport() {
  const rows = readRows(BOTS).filter((r) => !r.err);
  if (!rows.length) return console.log('no bot results yet: node tools/sim/run.cjs bots');
  const avg = (a, f) => a.reduce((s, r) => s + f(r), 0) / a.length;
  const group = (a, key) => a.reduce((m, r) => ((m[key(r)] = m[key(r)] || []).push(r), m), {});
  console.log('\n== CLASS RUNS (bot picks cards freely) ==');
  for (const [c, a] of Object.entries(group(rows.filter((r) => !r.mono), (r) => r.cls)))
    console.log(c.padEnd(9), `win ${a.filter((r) => r.result === 'win').length}/${a.length}`, `avg ${Math.round(avg(a, (r) => r.t))}s`, `lv ${Math.round(avg(a, (r) => r.level))}`);
  console.log('\n== SOLO SKILL RUNS (Scion, only that skill) ==');
  const solo = Object.entries(group(rows.filter((r) => r.mono), (r) => r.skill))
    .map(([id, a]) => ({ id, w: a[0].weapon, wins: a.filter((r) => r.result === 'win').length, n: a.length, t: avg(a, (r) => r.t), lv: avg(a, (r) => r.level) }))
    .sort((x, y) => y.wins - x.wins || y.t - x.t);
  for (const r of solo) console.log(r.id.padEnd(18), (r.w || '').padEnd(8), `win ${r.wins}/${r.n}`, `survived ${String(Math.round(r.t)).padStart(5)}s`, `lv ${Math.round(r.lv)}`);
  const deaths = rows.filter((r) => r.result === 'dead'), kc = group(deaths, (r) => r.killer || '?');
  console.log('\ntop killers:', Object.entries(kc).sort((a, b) => b[1].length - a[1].length).slice(0, 6).map(([k, a]) => `${k} ${a.length}`).join(', '));
  console.log('note: the bot dodges worse than a person; read solo results with only 2 seeds as rough.');
}

async function main() {
  const [cmd = 'report', a1, a2] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  if (cmd === 'bench') {
    fs.rmSync(BENCH, { force: true });
    console.log(`benchmarking every skill x weapon on ${procs} processes…`);
    await parallel('bench.cjs', (i) => [i, procs, BENCH]);
    benchReport();
  } else if (cmd === 'bots') {
    const perClass = +a1 || 5, perSkill = +a2 || 2;
    const best = bestBySkill(readRows(BENCH));
    const { loadGame } = require('./loader.cjs');
    const skills = JSON.parse(loadGame().run(`JSON.stringify(Object.values(SKILLS).map((s) => [s.id, (s.weapons || ['staff'])[0]]))`));
    const jobs = [];
    for (let s = 1; s <= perClass; s++) for (const cls of CLASSES) jobs.push({ cls, seed: s });
    for (let s = 1; s <= perSkill; s++) for (const [id, w] of skills) if (!id.startsWith('herald')) jobs.push({ cls: 'scion', skill: id, weapon: best[id] ? best[id].w : w, mono: true, seed: s });
    fs.writeFileSync(JOBS, JSON.stringify(jobs));
    fs.rmSync(BOTS, { force: true });
    console.log(`${jobs.length} full runs on ${procs} processes (several minutes)…`);
    await parallel('bot.cjs', (i) => [JOBS, i, procs, BOTS]);
    botReport();
  } else { benchReport(); botReport(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
