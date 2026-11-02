const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');

function game() {
  const noop = () => {};
  const elements = new Map();
  const clock = { now: 0 }, timers = new Map();
  let nextTimer = 1;
  const ctx = new Proxy({}, { get: (_, key) => {
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop: noop });
    return noop;
  } });
  const element = () => ({ classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    style: { setProperty: noop }, dataset: {}, children: [], innerHTML: '', textContent: '', hidden: false,
    setAttribute(k, v) { this[k] = v; }, appendChild: noop, addEventListener: noop, blur: noop,
    querySelectorAll: () => [], querySelector: () => element(), getContext: () => ctx, toDataURL: () => 'data:image/png;base64,' });
  const sandbox = vm.createContext({ console, performance: { now: () => clock.now },
    setTimeout: noop, clearTimeout: noop, requestAnimationFrame: noop,
    setInterval(fn, ms) { const id = nextTimer++; timers.set(id, { fn, ms }); return id; },
    clearInterval(id) { timers.delete(id); },
    localStorage: { getItem: () => null, setItem: noop },
    document: { hidden: false, focused: true, hasFocus() { return this.focused; }, addEventListener: noop,
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, createElement: element },
    window: { addEventListener: noop, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1 } });
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const [, file] of html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"/g)) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
  }
  const run = (code) => vm.runInContext(code, sandbox);
  run(`
    G.canvas = $('game'); G.ctx = G.canvas.getContext('2d'); G.W = 1280; G.H = 720; G.zoom = 1;
    startGame(CLASSES[2]);
    const P = G.player;
    const inst = newSkillInstance('flicker_strike');
    P.skills = [inst]; recomputePlayer(); inst.timer = 0;
    function enemy(x, y) {
      const e = makeEnemy('zombie', x, y, 0);
      e.hp = e.maxHp = 1e9; e.speed = 0; e.dmg = 0;
      G.enemies.push(e); return e;
    }
    const target = enemy(150, 0);
    function tick(n = 1, dt = 1/60) {
      for (let k = 0; k < n; k++) {
        G.time += dt; updatePlayer(dt);
        G.hash.clear(); for (const e of G.enemies) if (!e.dead) G.hash.insert(e);
        updateSkills(dt);
      }
    }
    function key(code, down = true, repeat = false) { onKey({code, key: '', repeat, preventDefault() {}}, down); }
    function strikes() { return G.effects.filter(e => e.kind === 'spin').length; }
  `);
  return { run, elements, clock, timers };
}

module.exports = { game };
