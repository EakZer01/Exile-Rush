// Loads the real game scripts into a vm sandbox (no DOM, no rendering) for headless simulation.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');

function loadGame(seed = 1) {
  const noop = () => {};
  const elements = new Map();
  const ctx = new Proxy({}, { get: (_, key) => {
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient' || key === 'createPattern') return () => ({ addColorStop: noop });
    if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return noop;
  } });
  const element = () => ({ classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    style: { setProperty: noop }, dataset: {}, children: [], innerHTML: '', textContent: '', hidden: false,
    setAttribute(k, v) { this[k] = v; }, appendChild: noop, addEventListener: noop, blur: noop, focus: noop,
    querySelectorAll: () => [], querySelector: () => element(), getContext: () => ctx, toDataURL: () => 'data:image/png;base64,' });
  const clock = { now: 0 };
  const sandbox = vm.createContext({ console, performance: { now: () => clock.now },
    setTimeout: noop, clearTimeout: noop, requestAnimationFrame: noop, setInterval: noop, clearInterval: noop,
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    document: { hidden: false, focused: true, hasFocus() { return true; }, addEventListener: noop,
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, createElement: element },
    window: { addEventListener: noop, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1 } });
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const [, file] of html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"/g)) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
  }
  const run = (code) => vm.runInContext(code, sandbox);
  run(`
    G.canvas = $('game'); G.ctx = G.canvas.getContext('2d'); G.W = 1280; G.H = 720; G.zoom = 1;
    // everything unlocked so every gem can be tested, silent audio, deterministic RNG
    isLocked = () => false;
    Sfx.play = () => {}; Sfx.init = () => {};
    restoreRandom = () => { Math.random = mulberry32(${seed}); };
    Math.random = mulberry32(${seed});
    showTip = () => {}; announce = () => {};
  `);
  return { run, sandbox };
}

module.exports = { loadGame, root };
