(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const VW = 960;
  const VH = 540;
  const TILE = 32;
  const G = 2100;
  const JUMP_V = -740;
  const RUN = 205;
  const ACCEL = 2600;
  const AIR = 1700;
  const FRICTION = 2200;
  const PW = 22;
  const PH = 31;
  const SPRING_V = -860;
  const SAVE_KEY = "daiseuchi-act-v5";
  const params = new URLSearchParams(location.search);
  const DEBUG = params.has("debug");

  const SOLID = new Set(["#", "I", "F", "C", "!", "S", "Q", "="]);
  const ASSETS = {
    idle: "assets/daiseuchi-idle.png",
    walkA: "assets/daiseuchi-walk-a.png",
    walkB: "assets/daiseuchi-walk-b.png",
    jumpR: "assets/daiseuchi-jump-right.png",
    jumpL: "assets/daiseuchi-jump-left.png",
    hurt: "assets/daiseuchi-hurt.png",
    bear: "assets/enemy-bear.png",
    gull: "assets/enemy-gull.png",
    orca: "assets/enemy-orca.png",
    penguin: "assets/enemy-penguin.png",
  };

  const input = new Set();
  const pressed = new Set();
  let soundOn = true;
  let actx = null;

  const QUIPS = [
    "わしはまだ終わりやない",
    "今のは膝が折れきらんかった",
    "床がわしを嫌っとる",
    "もう一回や",
    "見えた道が危ない道や",
  ];

  const sprites = {};
  const cam = { x: 0, y: 0, shake: 0 };
  const snow = Array.from({ length: 80 }, () => ({
    x: Math.random() * 1400,
    y: Math.random() * VH,
    s: 1 + Math.random() * 2.4,
    v: 18 + Math.random() * 36,
  }));
  const particles = [];
  const floaters = [];
  const ui = { buttons: [] };

  let mode = "title";
  let timer = 0;
  let stageIndex = 0;
  let deaths = 0;
  let quip = "";
  let reason = "";
  let grid = [];
  let baseGrid = [];
  let W = 0;
  let H = 0;
  let entities = [];
  let traps = [];
  let spawn = { x: 64, y: 64 };
  let revealed = new Set();
  let armed = new Map();
  let debris = [];
  let stage = null;
  let player = null;
  let deathPose = null;
  let clearedFlash = 0;
  let cpId = "";
  const levels = buildLevels();

  function makePlayer(x, y) {
    return {
      x, y, vx: 0, vy: 0, w: PW, h: PH,
      grounded: false, coyote: 0, buffer: 0, face: 1, air: 1,
      riding: null, runT: 0, alive: true, springLock: 0, boost: false,
    };
  }

  function makeMap(w, h, draw) {
    const rows = Array.from({ length: h }, () => Array(w).fill("."));
    const api = {
      rect(x, y, rw, rh, ch) {
        for (let j = y; j < y + rh; j++) {
          for (let i = x; i < x + rw; i++) {
            if (rows[j] && rows[j][i] !== undefined) rows[j][i] = ch;
          }
        }
      },
      set(x, y, ch) { this.rect(x, y, 1, 1, ch); },
    };
    draw(api);
    return rows.map((r) => r.join(""));
  }

  function pit(m, x, w, floor, height) {
    m.rect(x, floor, w, height - floor, ".");
    const sy = Math.min(height - 1, floor + 2);
    m.rect(x, sy, w, height - sy, "^");
  }

  function buildLevels() {
    const T = 32;
    return [
      {
        name: "一枚の氷",
        lie: "右へ行けば、あたたかい",
        rows: makeMap(196, 48, (m) => {
          m.rect(0, 0, 1, 48, "#");
          m.rect(195, 0, 1, 48, "#");
          m.rect(0, 47, 196, 1, "#");

          m.rect(1, 40, 24, 7, "#");
          m.set(5, 39, "A");
          m.set(8, 39, "p");
          m.set(11, 39, "h");
          m.set(14, 37, "c");
          m.set(17, 39, "f");
          m.rect(17, 41, 2, 2, "^");

          m.set(22, 37, "Y");
          m.rect(26, 41, 14, 6, "^");
          m.rect(30, 40, 4, 1, "#");
          m.set(31, 39, "N");

          m.rect(18, 37, 8, 1, "#");
          m.rect(24, 34, 12, 1, "#");
          m.rect(30, 31, 52, 1, "#");
          m.rect(42, 28, 12, 1, "v");
          m.rect(64, 31, 2, 1, ".");
          m.rect(32, 35, 44, 1, "^");
          m.rect(50, 35, 3, 1, ".");
          m.rect(40, 33, 6, 1, "v");
          m.set(46, 29, "b");

          m.rect(76, 34, 14, 1, "#");
          m.rect(84, 37, 16, 1, "#");
          m.set(86, 36, "p");
          m.set(89, 36, "h");
          m.rect(90, 40, 18, 7, "#");

          m.rect(108, 40, 14, 7, ".");
          m.rect(108, 42, 14, 5, "~");
          m.rect(108, 41, 14, 1, "^");
          m.rect(122, 40, 10, 7, "#");
          m.rect(132, 40, 2, 7, ".");
          m.rect(132, 42, 2, 5, "~");
          m.rect(132, 41, 2, 1, "^");
          m.rect(134, 40, 28, 7, "#");
          m.set(126, 39, "p");
          m.set(128, 37, "b");
          m.set(138, 39, "f");
          m.rect(138, 41, 2, 2, "^");
          m.set(144, 39, "h");

          m.rect(154, 37, 18, 1, "#");
          m.rect(146, 34, 24, 1, "#");
          m.rect(154, 31, 18, 1, "#");
          m.rect(146, 28, 24, 1, "#");
          m.rect(154, 25, 20, 1, "#");
          m.set(158, 36, "p");
          m.set(150, 33, "h");
          m.set(166, 24, "p");

          m.rect(182, 29, 10, 1, "#");
          m.rect(182, 30, 10, 8, "~");
          for (let y = 24; y <= 28; y++) m.set(188, y, "g");

          m.rect(58, 22, 103, 1, "#");
          m.rect(70, 19, 12, 1, "v");
          m.set(78, 21, "p");
          m.set(82, 21, "h");
          m.set(150, 20, "Y");

          m.rect(48, 26, 64, 1, "#");
          m.set(56, 25, "p");
          m.set(96, 25, "h");

          m.rect(96, 30, 44, 1, "#");
          m.rect(124, 30, 3, 1, ".");
          m.set(124, 30, "Q");
          m.rect(125, 31, 2, 3, "^");
          m.set(116, 29, "d");
          m.set(120, 29, "p");
          m.set(140, 29, "h");
          for (let y = 24; y <= 29; y++) m.set(136, y, "G");
        }),
        shies: [
          { x: 64 * T, y: 31 * T, w: 2 * T, h: 12 },
        ],
        carts: [
          { x: 50 * T, y: 35 * T, w: 3 * T, h: 12, minX: 40 * T, speed: 220 },
        ],
        movers: [
          {
            x: 100 * T, y: 40 * T, w: 3 * T, h: 12,
            minX: 100 * T, maxX: 120 * T, speed: 68, dir: 1,
          },
          {
            x: 132 * T, y: 40 * T, w: T, h: 12,
            minX: 131 * T, maxX: 135 * T, speed: 250, dir: 1, slip: true,
          },
        ],
      },
    ];
  }

  function get(tx, ty) {
    if (tx < 0 || tx >= W || ty < 0) return "#";
    if (ty >= H) return ".";
    return grid[ty][tx];
  }

  function setTile(tx, ty, ch) {
    if (grid[ty] && grid[ty][tx] !== undefined) grid[ty][tx] = ch;
  }

  function isSolidCh(ch) { return SOLID.has(ch); }

  function solidAt(tx, ty) { return isSolidCh(get(tx, ty)); }

  function hitsSolid(b) {
    const x0 = Math.floor(b.x / TILE);
    const y0 = Math.floor(b.y / TILE);
    const x1 = Math.floor((b.x + b.w - 0.01) / TILE);
    const y1 = Math.floor((b.y + b.h - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (solidAt(tx, ty)) return true;
      }
    }
    return false;
  }

  function sweep(b, axis, dist) {
    const sign = Math.sign(dist);
    if (!sign) return null;
    let left = Math.abs(dist);
    while (left > 0) {
      const step = Math.min(4, left);
      b[axis] += sign * step;
      if (hitsSolid(b)) {
        b[axis] -= sign * step;
        for (let i = 0; i < 4; i++) {
          b[axis] += sign;
          if (hitsSolid(b)) {
            b[axis] -= sign;
            break;
          }
        }
        return sign > 0 ? "pos" : "neg";
      }
      left -= step;
    }
    return null;
  }

  function ac() {
    if (!soundOn) return null;
    if (!actx) actx = new AudioContext();
    if (actx.state === "suspended") actx.resume();
    return actx;
  }

  function tone(freq, dur, type, vol, delay = 0) {
    const a = ac();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t0 = a.currentTime + delay;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function sfx(kind) {
    if (kind === "jump") tone(620, 0.07, "square", 0.04);
    if (kind === "spring") {
      tone(220, 0.12, "square", 0.05);
      tone(660, 0.14, "square", 0.04, 0.06);
    }
    if (kind === "die") {
      tone(220, 0.18, "sawtooth", 0.05);
      tone(110, 0.28, "square", 0.05, 0.06);
    }
    if (kind === "cp") {
      tone(523, 0.08, "square", 0.04);
      tone(659, 0.08, "square", 0.04, 0.07);
      tone(784, 0.12, "square", 0.04, 0.14);
    }
    if (kind === "clear") {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, "square", 0.05, i * 0.1));
    }
    if (kind === "warn") tone(160, 0.1, "triangle", 0.05);
    if (kind === "fall") tone(90, 0.16, "square", 0.04);
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * 140;
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: 0.4 + Math.random() * 0.4, color, s: 2 + Math.random() * 3,
      });
    }
  }

  function floatText(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 1.3 });
  }

  function kill(why) {
    if (mode !== "play" || !player.alive) return;
    player.alive = false;
    deaths += 1;
    reason = why;
    quip = QUIPS[deaths % QUIPS.length];
    mode = "dead";
    timer = 0.72;
    cam.shake = 12;
    deathPose = { x: player.x, y: player.y, face: player.face };
    burst(player.x + PW / 2, player.y + PH / 2, "#ffffff", 16);
    sfx("die");
    persist();
  }

  function persist() {
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({
        stage: stageIndex,
        deaths,
        cleared: mode === "ending",
      }));
    } catch { /* private mode */ }
  }

  function readSave() {
    try { return JSON.parse(sessionStorage.getItem(SAVE_KEY) || "null"); }
    catch { return null; }
  }

  function clearSave() {
    try { sessionStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  }

  function feetRowFromMarker(ty) { return ty + 1; }

  function loadStage(index, resetDeaths) {
    stageIndex = index;
    stage = levels[index];
    if (resetDeaths) deaths = 0;
    baseGrid = stage.rows.map((r) => r.split(""));
    W = baseGrid[0].length;
    H = baseGrid.length;
    revealed = new Set();
    armed = new Map();
    debris = [];
    entities = [];
    let ax = 2;
    let ay = 2;
    const scan = baseGrid.map((r) => r.slice());
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ch = scan[y][x];
        if (ch === "t") {
          scan[y][x] = ".";
          entities.push(makeDrop(x, y));
          continue;
        }
        if (ch === "f") {
          scan[y][x] = ".";
          entities.push(makeFish(x, y));
          continue;
        }
        if ("ABNUP".includes(ch) === false && ch !== "O") continue;
        scan[y][x] = ".";
        if (ch === "A") { ax = x; ay = y; }
        if (ch === "B") entities.push(makeWalker("bear", x, y, 44, 30, 58));
        if (ch === "N") entities.push(makeWalker("penguin", x, y, 40, 22, 96));
        if (ch === "U") entities.push(makeGull(x, y));
        if (ch === "O") entities.push(makeOrca(x, y));
      }
    }
    if (stage.movers) {
      for (const mv of stage.movers) {
        if (mv.maxX <= mv.minX) continue;
        entities.push({
          kind: "mover",
          x: mv.x, y: mv.y, w: mv.w, h: mv.h,
          minX: mv.minX, maxX: mv.maxX, speed: mv.speed, dir: mv.dir || 1,
          prevX: mv.x, dx: 0,
          slip: !!mv.slip,
        });
      }
    }
    if (stage.shies) {
      for (const s of stage.shies) {
        entities.push({
          kind: "shy",
          x: s.x, y: s.y, w: s.w, h: s.h,
          state: "home", dir: 1, wait: 0.7,
          prevX: s.x, dx: 0,
        });
      }
    }
    if (stage.carts) {
      for (const c of stage.carts) {
        entities.push({
          kind: "cart",
          x: c.x, y: c.y, w: c.w, h: c.h || 12,
          minX: c.minX, speed: c.speed || 150,
          state: "idle", dir: -1,
          prevX: c.x, dx: 0,
        });
      }
    }
    baseGrid = scan;
    grid = baseGrid.map((r) => r.slice());
    const sp = markerSpawn(ax, ay);
    spawn = { x: sp.x, y: sp.y };
    cpId = "";
    player = makePlayer(spawn.x, spawn.y);
    mode = "intro";
    timer = 1.25;
    reason = "";
    rememberHomes();
    traps = compileTraps(stage.traps);
    primeTraps();
    snapCamera(true);
    persist();
  }

  function markerSpawn(tx, ty) {
    return {
      x: tx * TILE + (TILE - PW) / 2,
      y: feetRowFromMarker(ty) * TILE - PH,
    };
  }

  function makeFish(tx, ty) {
    return {
      kind: "fish",
      tx, ty,
      x: tx * TILE + 4,
      y: (ty + 1) * TILE - 14,
      w: 24,
      h: 14,
      state: "sit",
    };
  }

  function eatFish(e) {
    if (e.state !== "sit" || !player.grounded || !rects(player, e)) return;
    e.state = "ate";
    const ty = e.ty + 1;
    for (let i = -1; i <= 2; i++) {
      const tx = e.tx + i;
      const ch = get(tx, ty);
      if (ch === "#" || ch === "=" || ch === "F") setTile(tx, ty, ".");
    }
    sfx("fall");
    cam.shake = Math.max(cam.shake, 8);
  }

  function makeDrop(tx, ty) {
    return {
      kind: "drop",
      x: tx * TILE + 8,
      y: ty * TILE + 2,
      w: 16,
      h: 26,
      vy: 0,
      state: "wait",
      hot: true,
    };
  }

  function spawnNeedle(tx, row, delay) {
    entities.push({
      kind: "drop",
      spawned: true,
      hot: false,
      x: tx * TILE + 8,
      y: row * TILE + 2,
      w: 16,
      h: 26,
      vy: 0,
        state: "delay",
        delay,
        vy0: 480,
      });
  }

  function updateDrop(e, dt) {
    if (e.state === "wait") {
      const pcx = player.x + PW / 2;
      const ecx = e.x + e.w / 2;
      if (Math.abs(pcx - ecx) < 20 && player.y > e.y) {
        e.state = "fall";
        e.vy = 260;
        e.hot = true;
      }
      return;
    }
    if (e.state === "delay") {
      e.delay -= dt;
      if (e.delay <= 0) {
        e.state = "fall";
        e.vy = e.vy0 || 480;
        e.hot = true;
      }
      return;
    }
    if (e.state !== "fall") return;
    e.vy = Math.min(e.vy + G * dt, 1100);
    const next = e.y + e.vy * dt;
    const tx = Math.floor((e.x + e.w / 2) / TILE);
    const under = Math.floor((next + e.h) / TILE);
    if (e.vy > 0 && solidAt(tx, under)) {
      burst(e.x + e.w / 2, under * TILE, "#e7f6ff", 6);
      e.state = "gone";
      e.hot = false;
      return;
    }
    e.y = next;
  }

  function compileTraps(list) {
    return (list || []).map((t) => ({
      type: t.type,
      at: t.at ?? 0,
      back: t.back ?? 0,
      x0: t.x0 ?? 0,
      x1: t.x1 ?? 0,
      hold: t.hold ?? 0.75,
      held: 0,
      row: t.row ?? 4,
      spread: t.spread ?? 0,
      follow: !!t.follow,
      feetMin: t.feetMin ?? null,
      feetMax: t.feetMax ?? null,
      drops: (t.drops || []).map((d) => ({ tx: d.tx, row: d.row, delay: d.delay || 0 })),
      tiles: (t.tiles || []).map((s) => ({ tx: s.tx, ty: s.ty, ch: s.ch })),
      armed: false,
      done: false,
    }));
  }

  function feetTile() {
    return Math.floor((player.y + player.h) / TILE);
  }

  function feetOk(t) {
    const feet = feetTile();
    if (t.feetMin != null && feet < t.feetMin) return false;
    if (t.feetMax != null && feet > t.feetMax) return false;
    return true;
  }

  function releaseTrap(t) {
    if (t.done) return;
    t.done = true;
    if (t.follow) {
      const tx = Math.floor((player.x + PW / 2) / TILE);
      const sp = t.spread || 0;
      for (let i = -sp; i <= sp; i++) spawnNeedle(tx + i, t.row, Math.abs(i) * 0.03);
    }
    for (const d of t.drops) spawnNeedle(d.tx, d.row, d.delay);
    sfx("warn");
    cam.shake = Math.max(cam.shake, 6);
  }

  function primeTraps() {
    const tx = Math.floor((player.x + PW / 2) / TILE);
    for (const t of traps) {
      t.done = false;
      t.armed = false;
      t.held = 0;
      if (!feetOk(t)) continue;
      if ((t.type === "cross" || t.type === "seal") && tx >= t.at) {
        t.done = true;
        if (t.type === "seal") {
          for (const s of t.tiles) setTile(s.tx, s.ty, s.ch);
        }
      }
      if (t.type === "back" && tx >= t.at) t.armed = true;
      if ((t.type === "jump" || t.type === "still" || t.type === "spring") && player.x > t.x1) t.done = true;
    }
  }

  function updateTraps(dt) {
    if (!player.alive || mode !== "play") return;
    const tx = Math.floor((player.x + PW / 2) / TILE);
    const pcx = player.x + PW / 2;
    for (const t of traps) {
      if (t.done) continue;
      if (t.type === "cross") {
        if (tx >= t.at && feetOk(t)) releaseTrap(t);
      } else if (t.type === "back") {
        if (!t.armed && tx >= t.at && feetOk(t)) t.armed = true;
        if (t.armed && tx <= t.back && feetOk(t)) releaseTrap(t);
      } else if (t.type === "jump") {
        if (player.justJumped && pcx >= t.x0 && pcx <= t.x1 && feetOk(t)) releaseTrap(t);
      } else if (t.type === "spring") {
        if (player.justSprung && pcx >= t.x0 && pcx <= t.x1 && feetOk(t)) releaseTrap(t);
      } else if (t.type === "still") {
        const inside = pcx >= t.x0 && pcx <= t.x1 && feetOk(t);
        if (inside && player.grounded && Math.abs(player.vx) < 28) {
          t.held += dt;
          if (t.held >= t.hold) releaseTrap(t);
        } else if (!inside) t.held = 0;
      } else if (t.type === "seal") {
        if (tx >= t.at && feetOk(t)) {
          for (const s of t.tiles) setTile(s.tx, s.ty, s.ch);
          t.done = true;
          sfx("warn");
          cam.shake = Math.max(cam.shake, 8);
        }
      }
    }
  }

  function makeWalker(kind, tx, ty, w, h, speed) {
    const feet = (ty + 1) * TILE;
    return {
      kind, w, h, speed,
      x: tx * TILE + (TILE - w) / 2,
      y: feet - h,
      vx: -speed,
      vy: 0,
      dir: -1,
      alive: true,
    };
  }

  function makeGull(tx, ty) {
    return {
      kind: "gull",
      x: tx * TILE,
      y: ty * TILE,
      baseY: ty * TILE,
      w: 30,
      h: 22,
      dir: tx % 2 === 0 ? 1 : -1,
      speed: 78 + (tx % 3) * 16,
      minX: (tx - 3) * TILE,
      maxX: (tx + 3) * TILE,
      t: (tx * 1.7) % 6,
      freq: 2.2 + (ty % 2) * 0.4,
      phase: tx,
      amp: 16,
    };
  }

  function makeOrca(tx, ty) {
    return {
      kind: "orca",
      x: tx * TILE + 4,
      y: ty * TILE,
      homeY: ty * TILE,
      w: 48,
      h: 28,
      vy: 0,
      state: "idle",
      timer: 0,
      cd: 0.6,
      flip: false,
    };
  }

  function resetToCheckpoint() {
    grid = baseGrid.map((r) => r.slice());
    armed.clear();
    debris = [];
    entities = entities.filter((e) => !e.spawned);
    for (const e of entities) {
      if (e.kind === "bear" || e.kind === "penguin") {
        e.x = e.homeX;
        e.y = e.homeY;
        e.vx = -e.speed;
        e.vy = 0;
        e.dir = -1;
      } else if (e.kind === "gull") {
        e.x = e.homeX;
        e.t = e.homeT;
        e.dir = e.homeDir;
        e.y = e.baseY;
      } else if (e.kind === "orca") {
        e.y = e.homeY;
        e.vy = 0;
        e.state = "idle";
        e.cd = 0.4;
        e.timer = 0;
      } else if (e.kind === "drop") {
        e.x = e.homeX;
        e.y = e.homeY;
        e.vy = 0;
        e.state = "wait";
        e.hot = true;
      } else if (e.kind === "mover" || e.kind === "shy" || e.kind === "cart") {
        e.x = e.homeX;
        e.prevX = e.homeX;
        e.dx = 0;
        e.dir = e.kind === "cart" ? -1 : 1;
        e.state = e.kind === "cart" ? "idle" : (e.kind === "shy" ? "home" : e.state);
        e.wait = 0.7;
      } else if (e.kind === "fish") {
        e.state = "sit";
      }
    }
    player = makePlayer(spawn.x, spawn.y);
    mode = "play";
    traps = compileTraps(stage.traps);
    primeTraps();
  }

  function rememberHomes() {
    for (const e of entities) {
      e.homeX = e.x;
      e.homeY = e.y;
      e.homeT = e.t || 0;
      e.homeDir = e.dir || 1;
    }
  }

  function jumpHeld() {
    return input.has(" ") || input.has("z") || input.has("x") || input.has("arrowup") || input.has("w");
  }

  function horiz() {
    let d = 0;
    if (input.has("arrowleft") || input.has("a")) d -= 1;
    if (input.has("arrowright") || input.has("d")) d += 1;
    return d;
  }

  function consumeJump() {
    if (pressed.has(" ") || pressed.has("z") || pressed.has("x") || pressed.has("arrowup") || pressed.has("w")) {
      return true;
    }
    return false;
  }

  function rects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function revealNear() {
    const x0 = Math.floor((player.x - 2) / TILE);
    const y0 = Math.floor((player.y - 2) / TILE);
    const x1 = Math.floor((player.x + player.w + 2) / TILE);
    const y1 = Math.floor((player.y + player.h + 2) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (get(tx, ty) === "I") revealed.add(`${tx},${ty}`);
      }
    }
  }

  function updateArmed(dt) {
    for (const [key, item] of armed) {
      item.t -= dt;
      if (item.t > 0) continue;
      const [tx, ty] = key.split(",").map(Number);
      const ch = get(tx, ty);
      if (ch === "!") setTile(tx, ty, "^");
      else if (ch === "F" || ch === "C" || ch === "=") {
        shatter(tx, ty);
        setTile(tx, ty, ".");
      }
      armed.delete(key);
    }
  }

  function shatter(tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    for (let i = 0; i < 3; i++) {
      debris.push({
        x: x + i * 10,
        y: y + 4,
        w: 12,
        h: 10,
        vx: (i - 1) * 90,
        vy: -50 - i * 30,
        life: 0.65,
        harm: false,
      });
    }
    sfx("fall");
  }

  function collapseRun(tx, ty) {
    let l = tx;
    let r = tx;
    while (get(l - 1, ty) === "=") l -= 1;
    while (get(r + 1, ty) === "=") r += 1;
    for (let x = l; x <= r; x++) {
      const key = `${x},${ty}`;
      if (armed.has(key)) continue;
      const delay = 0.32 + Math.abs(x - tx) * 0.04;
      armed.set(key, { t: delay, max: delay });
    }
  }

  function armUnderFeet() {
    const left = Math.floor(player.x / TILE);
    const right = Math.floor((player.x + player.w - 0.01) / TILE);
    const ty = Math.floor((player.y + player.h + 1) / TILE);
    let sprung = false;
    for (let tx = left; tx <= right; tx++) {
      const ch = get(tx, ty);
      if ((ch === "F" || ch === "C" || ch === "!") && !armed.has(`${tx},${ty}`)) {
        const delay = ch === "C" ? 0.2 : ch === "!" ? 0.22 : 0.5;
        armed.set(`${tx},${ty}`, { t: delay, max: delay });
      }
      if (ch === "=" && !armed.has(`${tx},${ty}`)) collapseRun(tx, ty);
      if (ch === "S" || ch === "Q") sprung = true;
    }
    return sprung;
  }

  function updatePlayer(dt) {
    player.justJumped = false;
    player.justSprung = false;
    const dir = horiz();
    const accel = player.grounded ? ACCEL : AIR;
    if (dir !== 0) {
      player.vx += dir * accel * dt;
      player.face = dir;
    } else if (player.grounded) {
      const s = Math.sign(player.vx);
      const drop = FRICTION * dt;
      if (Math.abs(player.vx) <= drop) player.vx = 0;
      else player.vx -= s * drop;
    }
    player.vx = Math.max(-RUN, Math.min(RUN, player.vx));
    if (consumeJump()) player.buffer = 0.12;
    else player.buffer = Math.max(0, player.buffer - dt);

    if (player.buffer > 0 && player.springLock <= 0) {
      const fromGround = player.grounded || player.coyote > 0;
      if (fromGround || player.air > 0) {
        player.vy = JUMP_V;
        player.grounded = false;
        player.coyote = 0;
        player.buffer = 0;
        player.air = fromGround ? 1 : player.air - 1;
        player.boost = false;
        player.justJumped = true;
        sfx("jump");
        burst(player.x + PW / 2, player.y + PH, "#d7f6ff", 5);
      }
    }

    const grav = (!jumpHeld() && player.vy < 0 && !player.boost) ? G * 2.7 : G;
    player.vy = Math.min(player.vy + grav * dt, 980);
    if (player.springLock > 0) player.springLock -= dt;

    if (player.riding && !player.riding.slip) player.x += player.riding.dx;
    player.riding = null;

    player.grounded = false;
    sweep(player, "x", player.vx * dt);
    const yBefore = player.y;
    const hitY = sweep(player, "y", player.vy * dt);
    player._dy = player.y - yBefore;
    if (hitY === "pos") {
      player.vy = 0;
      player.grounded = true;
    }
    if (hitY === "neg") {
      player.vy = 0;
      if (player.rocket) kill("飛んでった");
    }

    if (player.grounded) {
      const sprung = armUnderFeet();
      if (sprung && player.springLock <= 0) {
        let yeet = false;
        const left = Math.floor(player.x / TILE);
        const right = Math.floor((player.x + player.w - 0.01) / TILE);
        const ty = Math.floor((player.y + player.h + 1) / TILE);
        for (let tx = left; tx <= right; tx++) if (get(tx, ty) === "Q") yeet = true;
        player.vy = yeet ? -1680 : SPRING_V;
        player.vx = yeet ? 420 : player.vx;
        player.grounded = false;
        player.coyote = 0;
        player.springLock = 0.12;
        player.boost = true;
        player.justSprung = true;
        player.rocket = yeet;
        player.air = 1;
        sfx(yeet ? "warn" : "spring");
      }
    }

    stickPlatforms();
    if (player.grounded) {
      player.coyote = 0.07;
      player.air = 1;
    }
    else player.coyote -= dt;
    if (player.grounded) player.boost = false;

    if (Math.abs(player.vx) > 20 && player.grounded) player.runT += dt * 6;
    revealNear();
    if (player.grounded) player.rocket = false;
    if (player.y < -160) kill("飛んでった");

    if (player.y > H * TILE + 8) kill("底がない");
  }

  function stickPlatforms() {
    for (const p of entities) {
      if (p.kind !== "mover" && p.kind !== "shy" && p.kind !== "cart") continue;
      if (p.kind === "shy" && p.state === "flee") continue;
      const feet = player.y + player.h;
      const prevFeet = feet - (player._dy || 0);
      const overlapX = player.x + player.w > p.x + 4 && player.x < p.x + p.w - 4;
      if (player.vy >= 0 && overlapX && prevFeet <= p.y + 6 && feet >= p.y && feet <= p.y + p.h + 8) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.grounded = true;
        player.riding = p;
      }
    }
  }

  function updateDebris(dt) {
    for (const d of debris) {
      d.vy = Math.min(d.vy + G * dt, 900);
      d.x += (d.vx || 0) * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.harm !== false && mode === "play" && rects(player, d)) kill("氷に潰された");
    }
    debris = debris.filter((d) => d.life > 0 && d.y < H * TILE + 40);
  }

  function updateWalker(e, dt) {
    e.vy = Math.min(e.vy + G * dt, 900);
    e.vx = e.dir * e.speed;
    const hitX = sweep(e, "x", e.vx * dt);
    if (hitX) e.dir *= -1;
    const hitY = sweep(e, "y", e.vy * dt);
    if (hitY === "pos") e.vy = 0;
    if (hitY === "neg") e.vy = 0;
    if (!hitX && hitY === "pos") {
      const dir = e.dir || 1;
      const fx = dir > 0 ? e.x + e.w + 1 : e.x - 1;
      const fy = e.y + e.h + 3;
      if (!solidAt(Math.floor(fx / TILE), Math.floor(fy / TILE))) e.dir *= -1;
    }
  }

  function updateGull(e, dt) {
    e.t += dt;
    e.x += e.dir * e.speed * dt;
    if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
    if (e.x > e.maxX) { e.x = e.maxX; e.dir = -1; }
    e.y = e.baseY + Math.sin(e.t * e.freq + e.phase) * e.amp;
  }

  function updateOrca(e, dt) {
    const pcx = player.x + player.w / 2;
    const ecx = e.x + e.w / 2;
    e.flip = pcx > ecx;
    if (e.state === "idle") {
      e.y += (e.homeY - e.y) * Math.min(1, dt * 8);
      if (e.cd > 0) e.cd -= dt;
      else if (Math.abs(pcx - ecx) < 150 && player.y + player.h <= e.homeY + 4) {
        e.state = "windup";
        e.timer = 0.42;
        sfx("warn");
      }
    } else if (e.state === "windup") {
      e.timer -= dt;
      e.y = e.homeY + Math.sin(e.timer * 46) * 3;
      if (e.timer <= 0) {
        e.state = "leap";
        e.vy = -760;
      }
    } else {
      e.vy += G * 0.8 * dt;
      e.y += e.vy * dt;
      if (e.vy > 0 && e.y >= e.homeY) {
        e.y = e.homeY;
        e.vy = 0;
        e.state = "idle";
        e.cd = 2.5;
        burst(ecx, e.homeY, "#b9e6ff", 8);
      }
    }
  }

  function updateMover(e, dt) {
    e.prevX = e.x;
    e.x += e.dir * e.speed * dt;
    if (e.x <= e.minX) { e.x = e.minX; e.dir = 1; }
    if (e.x >= e.maxX) { e.x = e.maxX; e.dir = -1; }
    e.dx = e.x - e.prevX;
  }

  function updateShy(e, dt) {
    e.prevX = e.x;
    if (e.state === "home") {
      const near = player.x + player.w > e.x - 40 && player.x < e.x + e.w + 40;
      const above = player.y + player.h < e.y + 10;
      if (!player.grounded && near && above) {
        e.state = "flee";
        e.dir = (player.x + player.w / 2 < e.x + e.w / 2) ? 1 : -1;
        e.wait = 0.85;
        sfx("warn");
      }
    } else if (e.state === "flee") {
      e.x += e.dir * 280 * dt;
      e.wait -= dt;
      if (e.wait <= 0) e.state = "back";
    } else {
      const dx = e.homeX - e.x;
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), 80 * dt);
      if (Math.abs(e.x - e.homeX) < 1) { e.x = e.homeX; e.state = "home"; }
    }
    e.dx = e.x - e.prevX;
  }

  function updateCart(e, dt) {
    e.prevX = e.x;
    if (e.state === "idle") {
      const feet = player.y + player.h;
      const on = player.grounded && player.x + player.w > e.x + 2 && player.x < e.x + e.w - 2 && Math.abs(feet - e.y) < 10;
      if (on) {
        e.state = "go";
        sfx("warn");
      }
    } else if (e.x > e.minX) {
      e.x = Math.max(e.minX, e.x - e.speed * dt);
    }
    e.dx = e.x - e.prevX;
  }

  function hazardTiles(b) {
    const spikeBody = { x: b.x - 6, y: b.y - 10, w: b.w + 12, h: b.h + 12 };
    const x0 = Math.floor(spikeBody.x / TILE);
    const y0 = Math.floor(spikeBody.y / TILE);
    const x1 = Math.floor((spikeBody.x + spikeBody.w - 0.01) / TILE);
    const y1 = Math.floor((Math.max(b.y + b.h, spikeBody.y + spikeBody.h) - 0.01) / TILE);
    const found = [];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const ch = get(tx, ty);
        if ("^v<>".includes(ch)) {
          if (spikeOverlap(spikeBody, tx, ty, ch)) found.push({ tx, ty, ch });
        } else if ("XgRG~".includes(ch) && rects(b, { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE })) {
          found.push({ tx, ty, ch });
        }
      }
    }
    return found;
  }

  function spikeOverlap(b, tx, ty, ch) {
    if (!"^v<>".includes(ch)) return false;
    const x = tx * TILE;
    const y = ty * TILE;
    let r;
    if (ch === "^") r = { x: x + 3, y: y + 4, w: TILE - 6, h: TILE - 4 };
    else if (ch === "v") r = { x: x + 3, y: y, w: TILE - 6, h: TILE - 4 };
    else if (ch === "<") r = { x: x + 4, y: y + 3, w: TILE - 4, h: TILE - 6 };
    else r = { x: x, y: y + 3, w: TILE - 4, h: TILE - 6 };
    return rects(b, r);
  }

  function handleHazards() {
    for (const hit of hazardTiles(player)) {
      if (hit.ch === "^" || hit.ch === "v" || hit.ch === "<" || hit.ch === ">") {
        kill("トゲや");
        return;
      }
      if (hit.ch === "~") {
        kill("泳がれへん");
        return;
      }
      if (hit.ch === "X") {
        kill("それはセーブとちゃう");
        return;
      }
      if (hit.ch === "g") {
        kill("そっちはゴールとちゃう");
        return;
      }
    }
    if (mode !== "play") return;
    let goal = false;
    for (const hit of hazardTiles(player)) {
      if (hit.ch === "R" && player.grounded) {
        const id = `${hit.tx},${hit.ty}`;
        const col = hit.tx;
        let baseY = hit.ty;
        while (get(col, baseY + 1) === "R") baseY += 1;
        const nx = col * TILE + (TILE - PW) / 2;
        const ny = (baseY + 1) * TILE - PH;
        const nid = `${Math.round(nx)},${Math.round(ny)}`;
        if (nid !== cpId) {
          spawn = { x: nx, y: ny };
          cpId = nid;
          sfx("cp");
          floatText(nx, ny - 10, "ここにいるで", "#16324a");
          burst(nx + PW / 2, ny + PH, "#7eb6ff", 8);
        }
        void id;
      }
      if (hit.ch === "G") goal = true;
    }
    if (goal && player.alive && mode === "play") {
      mode = "clear";
      timer = 1.35;
      clearedFlash = 1;
      sfx("clear");
      burst(player.x + PW / 2, player.y, "#ffe27a", 20);
    }
  }

  function updateEntities(dt) {
    for (const e of entities) {
      if (e.kind === "bear" || e.kind === "penguin") updateWalker(e, dt);
      else if (e.kind === "gull") updateGull(e, dt);
      else if (e.kind === "orca") updateOrca(e, dt);
      else if (e.kind === "drop") updateDrop(e, dt);
      else if (e.kind === "fish") eatFish(e);
      if (e.kind !== "mover" && e.kind !== "fish" && e.kind !== "shy" && e.kind !== "cart" && e.hot !== false && e.state !== "delay" && e.state !== "gone" && player.alive && rects(player, e)) {
        const name = { bear: "熊に会うた", penguin: "ペンギンや", gull: "鳥に突かれた", orca: "シャチや", drop: "氷が落ちてきた" }[e.kind];
        kill(name || "当てられた");
      }
    }
    entities = entities.filter((e) => e.state !== "gone");
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.vy += 400 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
    for (const f of floaters) {
      f.life -= dt;
      f.y -= 18 * dt;
    }
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1);
  }

  function snapCamera(instant) {
    const tx = player.x + PW / 2 - VW * 0.38;
    const ty = player.y + PH / 2 - VH * 0.62;
    const maxX = Math.max(0, W * TILE - VW);
    const maxY = Math.max(0, H * TILE - VH);
    const cx = Math.max(0, Math.min(maxX, tx));
    const cy = Math.max(0, Math.min(maxY, ty));
    if (instant) { cam.x = cx; cam.y = cy; }
    else {
      cam.x += (cx - cam.x) * 0.12;
      cam.y += (cy - cam.y) * 0.12;
    }
  }

  function update(dt) {
    if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 28);
    updateParticles(dt);
    for (const s of snow) {
      s.y += s.v * dt;
      s.x += 12 * dt;
      if (s.y > VH + 8) { s.y = -8; s.x = Math.random() * VW; }
    }
    if (mode === "intro") {
      timer -= dt;
      if (timer <= 0) mode = "play";
      snapCamera(false);
      return;
    }
    if (mode === "dead") {
      timer -= dt;
      if (timer <= 0) resetToCheckpoint();
      return;
    }
    if (mode === "clear") {
      timer -= dt;
      player.vx = 0;
      if (timer <= 0) {
        if (stageIndex + 1 >= levels.length) {
          mode = "ending";
          persist();
        } else {
          loadStage(stageIndex + 1, false);
        }
      }
      return;
    }
    if (mode !== "play") return;
    if (pressed.has("r")) {
      pressed.delete("r");
      kill("自分でやりなおした");
      return;
    }
    updateArmed(dt);
    for (const e of entities) {
      if (e.kind === "mover") updateMover(e, dt);
      else if (e.kind === "shy") updateShy(e, dt);
      else if (e.kind === "cart") updateCart(e, dt);
    }
    updatePlayer(dt);
    updateTraps(dt);
    updateDebris(dt);
    updateEntities(dt);
    if (mode === "play") handleHazards();
    snapCamera(false);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawIce(x, y, w, h, shake) {
    ctx.fillStyle = "#e7f8ff";
    ctx.fillRect(x, y + shake, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y + shake, w, 7);
    ctx.fillStyle = "#b7e4f6";
    ctx.fillRect(x, y + h - 8 + shake, w, 8);
    ctx.strokeStyle = "#1c4664";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1 + shake, w - 2, h - 2);
  }

  function drawIcicle(e) {
    const x = e.x;
    const y = e.y;
    ctx.fillStyle = "#f4fbff";
    ctx.strokeStyle = "#1b3348";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + e.w, y);
    ctx.lineTo(x + e.w / 2, y + e.h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawSpike(tx, ty, ch) {
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = "#f7fbff";
    ctx.strokeStyle = "#1b3348";
    ctx.lineWidth = 2;
    const tri = (pts) => {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    if (ch === "^") {
      tri([x + 4, y + TILE, x + 12, y + 6, x + 16, y + TILE]);
      tri([x + 16, y + TILE, x + 24, y + 8, x + 28, y + TILE]);
    } else if (ch === "v") {
      tri([x + 4, y, x + 12, y + TILE - 6, x + 16, y]);
      tri([x + 16, y, x + 24, y + TILE - 8, x + 28, y]);
    } else if (ch === "<") {
      tri([x + TILE, y + 4, x + 6, y + 16, x + TILE, y + 28]);
    } else {
      tri([x, y + 4, x + TILE - 6, y + 16, x, y + 28]);
    }
  }

  function drawFlag(x, y, fake) {
    void fake;
    ctx.strokeStyle = "#1b3348";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + TILE);
    ctx.lineTo(x + 16, y - 28);
    ctx.stroke();
    ctx.fillStyle = "#2f8fe0";
    ctx.strokeStyle = "#1b3348";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 28);
    ctx.lineTo(x + 40, y - 18);
    ctx.lineTo(x + 16, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 12px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillText("D", x + 22, y - 12);
  }

  function drawFlower(x, y) {
    const cx = x + TILE / 2;
    ctx.strokeStyle = "#2f8a45";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, y + TILE - 2);
    ctx.lineTo(cx, y + 10);
    ctx.stroke();
    ctx.fillStyle = "#ff8fb3";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - 0.4;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 7, y + 10 + Math.sin(a) * 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffe27a";
    ctx.beginPath();
    ctx.arc(cx, y + 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLantern(x, y) {
    ctx.strokeStyle = "#5a3b22";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + TILE / 2, y + 2);
    ctx.lineTo(x + TILE / 2, y + 10);
    ctx.stroke();
    ctx.fillStyle = "#ffd15c";
    ctx.strokeStyle = "#c47a22";
    roundRect(x + 8, y + 10, 16, 16, 3);
    ctx.fill();
    ctx.stroke();
  }

  function drawFish(e) {
    ctx.fillStyle = "#ff8a4a";
    roundRect(e.x, e.y + 3, e.w - 8, 9, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.x + e.w - 10, e.y + 7);
    ctx.lineTo(e.x + e.w, e.y + 2);
    ctx.lineTo(e.x + e.w, e.y + 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(e.x + 6, e.y + 6, 3, 3);
  }

  function drawCart(e) {
    ctx.fillStyle = "#8a5a32";
    roundRect(e.x + 2, e.y, e.w - 4, 18, 3);
    ctx.fill();
    ctx.fillStyle = "#f3d29a";
    ctx.fillRect(e.x + 6, e.y + 4, e.w - 12, 8);
    ctx.fillStyle = "#1b3348";
    ctx.beginPath();
    ctx.arc(e.x + 12, e.y + 18, 5, 0, Math.PI * 2);
    ctx.arc(e.x + e.w - 12, e.y + 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSign(x, y, text) {
    const w = Math.max(TILE, text.length * 13 + 8);
    const left = x + TILE / 2 - w / 2;
    ctx.fillStyle = "#f3d29a";
    ctx.strokeStyle = "#5a3b22";
    ctx.lineWidth = 2;
    roundRect(left, y + 4, w, 22, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5a3b22";
    ctx.font = "700 12px Yu Gothic UI, Meiryo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, x + TILE / 2, y + 20);
    ctx.textAlign = "left";
  }

  function drawWorld() {
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const x1 = Math.min(W - 1, Math.floor((cam.x + VW) / TILE) + 1);
    const y1 = Math.min(H - 1, Math.floor((cam.y + VH) / TILE) + 1);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const ch = get(tx, ty);
        const x = tx * TILE;
        const y = ty * TILE;
        if (ch === "~") {
          ctx.fillStyle = "#1d74b8";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(x, y + 4 + Math.sin(performance.now() / 300 + tx) * 2, TILE, 3);
          continue;
        }
        if (ch === "=" || ch === "#" || ch === "F" || ch === "C" || ch === "!" || ch === "S" || ch === "Q" || (ch === "I" && (revealed.has(`${tx},${ty}`) || DEBUG))) {
          const arm = armed.get(`${tx},${ty}`);
          const breaking = arm && (ch === "=" || ch === "F" || ch === "C");
          if (ch === "I" && !revealed.has(`${tx},${ty}`)) {
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = "#39f";
            ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
            ctx.globalAlpha = 1;
          } else {
            if (breaking) {
              const p = Math.max(0, Math.min(1, 1 - arm.t / arm.max));
              const dy = Math.sin(performance.now() / 40) * (1 + p * 2);
              drawIce(x, y, TILE, TILE, dy);
              ctx.fillStyle = `rgba(255,255,255,${0.12 + p * 0.3})`;
              ctx.fillRect(x, y + dy, TILE, TILE);
              drawCracks(x, y + dy, TILE, TILE, p);
            } else {
              const dy = arm ? Math.sin(performance.now() / 40) * 1.4 : 0;
              drawIce(x, y, TILE, TILE, dy);
            }
            if (ch === "S" || ch === "Q") {
              ctx.strokeStyle = ch === "Q" ? "#ff5d8f" : "#d4534a";
              ctx.lineWidth = ch === "Q" ? 4 : 3;
              ctx.beginPath();
              ctx.moveTo(x + 6, y + 8);
              ctx.lineTo(x + 26, y + 14);
              ctx.lineTo(x + 6, y + 20);
              ctx.lineTo(x + 26, y + 28);
              ctx.stroke();
              if (ch === "Q") {
                ctx.fillStyle = "#ff5d8f";
                ctx.beginPath();
                ctx.arc(x + 16, y + 8, 4, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
        if ("^v<>".includes(ch)) drawSpike(tx, ty, ch);
        if (ch === "R" || ch === "X") {
          if (get(tx, ty + 1) !== ch) drawFlag(x, y, ch === "X");
        }
        if (ch === "G" || ch === "g") {
          ctx.fillStyle = "#1b3348";
          ctx.fillRect(x + 14, y, 4, TILE);
          if (get(tx, ty - 1) !== ch) {
            ctx.fillStyle = "#ffd15c";
            ctx.strokeStyle = "#1b3348";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 18, y + 4);
            ctx.lineTo(x + 42, y + 14);
            ctx.lineTo(x + 18, y + 24);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
        if (ch === "Y") drawSign(x, y, "右へ");
        if (ch === "Z") drawSign(x, y, "落ちるな");
        if (ch === "a") drawSign(x, y, "→");
        if (ch === "u") drawSign(x, y, "↑");
        if (ch === "b") drawSign(x, y, "乗れ");
        if (ch === "c") drawSign(x, y, "食べて");
        if (ch === "d") drawSign(x, y, "ジャンプ");
        if (ch === "p") drawFlower(x, y);
        if (ch === "h") drawLantern(x, y);
        if (DEBUG && ch === "I" && !revealed.has(`${tx},${ty}`)) {
          ctx.globalAlpha = 0.45;
          drawIce(x, y, TILE, TILE, 0);
          ctx.globalAlpha = 1;
        }
      }
    }
    for (const d of debris) drawIce(d.x, d.y, d.w, d.h, 0);
    for (const e of entities) {
      if (e.kind === "mover" || e.kind === "shy") {
        drawIce(e.x, e.y, e.w, e.h, 0);
        ctx.fillStyle = e.kind === "shy" ? "#ffd0e0" : "#8fd0ea";
        ctx.fillRect(e.x + 6, e.y + 4, e.w - 12, 3);
        if (e.slip) {
          ctx.fillStyle = "#ff8fb3";
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2, e.y - 6, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (e.kind === "cart") drawCart(e);
    }
  }

  function drawCracks(x, y, w, h, p) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, w - 2, h - 2);
    ctx.clip();
    ctx.strokeStyle = "#0c2436";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.55 + p * 0.45;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 3);
    ctx.lineTo(x + 13, y + h * 0.55);
    ctx.lineTo(x + 8, y + h - 3);
    ctx.moveTo(x + 13, y + h * 0.55);
    ctx.lineTo(x + 24, y + h * 0.3);
    ctx.lineTo(x + w - 3, y + h - 4);
    ctx.stroke();
    ctx.restore();
  }

  function drawSprite(img, x, y, w, h, flip) {
    if (!img) return;
    ctx.save();
    if (flip) {
      ctx.translate(x + w / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, y, w, h);
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
  }

  function drawActor(kind, b, flip) {
    const img = sprites[kind];
    if (!img) return;
    let dw = b.w + 10;
    let dh = b.h + 8;
    if (kind === "idle" || kind === "walkA" || kind === "walkB" || kind === "jumpR" || kind === "jumpL" || kind === "hurt") {
      dh = 58;
      dw = dh * (img.width / img.height);
      drawSprite(img, b.x + b.w / 2 - dw / 2, b.y + b.h - dh, dw, dh, flip);
      return;
    }
    if (kind === "gull") { dw = 46; dh = 40; }
    if (kind === "bear") { dw = 58; dh = 42; }
    if (kind === "penguin") { dw = 54; dh = 32; }
    if (kind === "orca") { dw = 64; dh = 40; }
    drawSprite(img, b.x + b.w / 2 - dw / 2, b.y + b.h - dh, dw, dh, flip);
  }

  function playerKind(body) {
    if (!body.grounded) return body.face < 0 ? "jumpL" : "jumpR";
    if (Math.abs(body.vx) > 20) return Math.floor(body.runT) % 2 === 0 ? "walkA" : "walkB";
    return "idle";
  }

  function drawPlayerBody(body, kind, face) {
    const flip = kind === "walkA" || kind === "walkB" || kind === "idle" || kind === "hurt";
    drawActor(kind, body, flip && face < 0);
  }

  function drawHud() {
    ctx.fillStyle = "rgba(7,16,24,0.45)";
    roundRect(16, 14, 168, 44, 10);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 22px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillText(`死  ${deaths}`, 28, 44);
    ctx.font = "700 16px Yu Gothic UI, Meiryo, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(stage ? stage.name : "", VW - 20, 36);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(7,16,24,0.45)";
    roundRect(16, 64, 430, 24, 8);
    ctx.fill();
    ctx.fillStyle = "#f4fbff";
    ctx.font = "12px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillText("←→ 移動　　Z は地面と空中でもう一度　　R やりなおし", 28, 81);
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 2));
      ctx.fillStyle = f.color;
      ctx.font = "700 16px Yu Gothic UI, Meiryo, sans-serif";
      ctx.fillText(f.text, f.x - cam.x, f.y - cam.y);
      ctx.globalAlpha = 1;
    }
  }

  function drawBanner(title, sub) {
    ctx.fillStyle = "rgba(7,16,24,0.55)";
    ctx.fillRect(0, VH / 2 - 78, VW, 150);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "700 42px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillText(title, VW / 2, VH / 2 - 16);
    ctx.font = "700 20px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillStyle = "#ffe7a3";
    ctx.fillText(sub, VW / 2, VH / 2 + 24);
    ctx.textAlign = "left";
  }

  function button(x, y, w, h, label, id) {
    ui.buttons.push({ x, y, w, h, id });
    ctx.fillStyle = "#ffe08a";
    ctx.strokeStyle = "#1b3348";
    ctx.lineWidth = 3;
    roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1b3348";
    ctx.font = "700 22px Yu Gothic UI, Meiryo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + h / 2 + 8);
    ctx.textAlign = "left";
  }

  function render() {
    ui.buttons.length = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VW, VH);
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, "#f6c6d6");
    g.addColorStop(0.42, "#b9e3f6");
    g.addColorStop(1, "#e8f7df");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    for (const s of snow) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }

    if (mode === "title") {
      drawTitle();
      return;
    }
    if (mode === "ending") {
      drawEnding();
      return;
    }

    const sx = (Math.random() - 0.5) * cam.shake;
    const sy = (Math.random() - 0.5) * cam.shake;
    ctx.save();
    ctx.translate(-Math.floor(cam.x) + sx, -Math.floor(cam.y) + sy);
    drawBackdrop();
    drawWorld();
    for (const e of entities) {
      if (e.kind === "mover" || e.kind === "shy" || e.kind === "cart") continue;
      if (e.kind === "bear") drawActor("bear", e, e.dir > 0);
      if (e.kind === "penguin") drawActor("penguin", e, e.dir > 0);
      if (e.kind === "gull") drawActor("gull", e, e.dir > 0);
      if (e.kind === "orca") drawActor("orca", e, e.flip);
      if (e.kind === "drop" && e.state !== "delay" && e.state !== "gone") drawIcicle(e);
      if (e.kind === "fish" && e.state === "sit") drawFish(e);
      if (DEBUG) {
        ctx.strokeStyle = "#f33";
        ctx.strokeRect(e.x, e.y, e.w, e.h);
      }
    }
    if (mode === "dead" && deathPose) {
      drawPlayerBody(deathPose, "hurt", deathPose.face);
    } else if (player) {
      drawPlayerBody(player, playerKind(player), player.face);
      if (DEBUG) {
        ctx.strokeStyle = "#0a0";
        ctx.strokeRect(player.x, player.y, player.w, player.h);
      }
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    drawHud();
    if (mode === "intro" && stage) drawBanner(stage.name, stage.lie);
    if (mode === "dead") drawBanner("死んだ", `${reason}　${quip}`);
    if (mode === "clear") drawBanner("ゴールや", "次へ進むで");
  }

  function drawBackdrop() {
    ctx.fillStyle = "#d5ebc8";
    for (let i = 0; i < 6; i++) {
      const bx = i * 420 - (cam.x * 0.25 % 420);
      ctx.beginPath();
      ctx.moveTo(bx, 430);
      ctx.lineTo(bx + 90, 300);
      ctx.lineTo(bx + 180, 430);
      ctx.fill();
    }
  }

  function drawTitle() {
    ctx.fillStyle = "#1b3348";
    ctx.textAlign = "center";
    ctx.font = "700 64px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillText("ダイセーウチ ACT", VW / 2, 150);
    ctx.font = "700 22px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillStyle = "#204866";
    ctx.fillText("心があったかくなる氷や", VW / 2, 196);
    if (sprites.idle) {
      const ih = 180;
      const iw = ih * (sprites.idle.width / sprites.idle.height);
      ctx.drawImage(sprites.idle, VW / 2 - iw / 2, 210, iw, ih);
    }
    const save = readSave();
    let by = 430;
    if (save && save.cleared) {
      ctx.font = "700 18px Yu Gothic UI, Meiryo, sans-serif";
      ctx.fillStyle = "#204866";
      ctx.fillText(`このタブで、死に数 ${save.deaths} でクリアした`, VW / 2, 410);
      by = 440;
    }
    if (save && !save.cleared && save.stage > 0) {
      button(VW / 2 - 280, by, 250, 58, `${save.stage + 1}面の最初から`, "continue");
      button(VW / 2 + 30, by, 250, 58, "最初から", "new");
    } else {
      button(VW / 2 - 130, by, 260, 58, "はじめる", "new");
    }
    ctx.font = "14px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillStyle = "#204866";
    ctx.fillText("Zは地面と空中で二回。押しっぱなしで高く。旗はページを閉じると消える。", VW / 2, 520);
    ctx.textAlign = "left";
  }

  function drawEnding() {
    ctx.fillStyle = "#1b3348";
    ctx.textAlign = "center";
    ctx.font = "700 48px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillText("わしの勝ちや", VW / 2, 150);
    ctx.font = "700 24px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillText(`死に数　${deaths}`, VW / 2, 200);
    if (sprites.idle) {
      const ih = 170;
      const iw = ih * (sprites.idle.width / sprites.idle.height);
      ctx.drawImage(sprites.idle, VW / 2 - iw / 2, 230, iw, ih);
    }
    button(VW / 2 - 130, 430, 260, 58, "もう一度", "new");
    ctx.textAlign = "left";
  }

  function resize() {
    const scale = Math.min(window.innerWidth / VW, window.innerHeight / VH);
    canvas.style.width = `${VW * scale}px`;
    canvas.style.height = `${VH * scale}px`;
  }

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (VW / r.width),
      y: (e.clientY - r.top) * (VH / r.height),
    };
  }

  function onPress(e) {
    const key = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase()) || e.key === " ") {
      e.preventDefault();
    }
    input.add(key === " " ? " " : key);
    if (!e.repeat) pressed.add(key === " " ? " " : key);
    if ((mode === "title" || mode === "ending") && (key === "enter" || key === "z" || key === " ")) {
      const save = readSave();
      if (mode === "title" && save && !save.cleared && save.stage > 0 && key === "enter") startGame(true);
      else startGame(false);
    }
  }

  function onRelease(e) {
    const key = e.key.toLowerCase();
    input.delete(key === " " ? " " : key);
  }

  function startGame(cont) {
    const save = readSave();
    if (cont && save && !save.cleared) {
      deaths = save.deaths || 0;
      deaths = save.deaths || 0;
      loadStage(save.stage || 0, false);
      deaths = save.deaths || 0;
    } else {
      clearSave();
      loadStage(0, true);
    }
    rememberHomes();
  }

  function clickUi(e) {
    const p = pointerPos(e);
    for (const b of ui.buttons) {
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
        if (b.id === "new") startGame(false);
        if (b.id === "continue") startGame(true);
      }
    }
  }

  function holdButton(id, key, down) {
    const el = document.getElementById(id);
    const set = (on, ev) => {
      ev.preventDefault();
      if (on) input.add(key);
      else input.delete(key);
      if (on && key === "z") pressed.add("z");
    };
    el.addEventListener("pointerdown", (ev) => set(true, ev));
    el.addEventListener("pointerup", (ev) => set(false, ev));
    el.addEventListener("pointerleave", (ev) => set(false, ev));
    el.addEventListener("pointercancel", (ev) => set(false, ev));
  }

  function removeChroma(img) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ictx = c.getContext("2d", { willReadFrequently: true });
    ictx.drawImage(img, 0, 0);
    const image = ictx.getImageData(0, 0, c.width, c.height);
    const d = image.data;
    const sample = (x, y) => {
      const i = (y * c.width + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    };
    const corners = [sample(2, 2), sample(c.width - 3, 2), sample(2, c.height - 3), sample(c.width - 3, c.height - 3)];
    const br = corners.reduce((s, p) => s + p[0], 0) / 4;
    const bg = corners.reduce((s, p) => s + p[1], 0) / 4;
    const bb = corners.reduce((s, p) => s + p[2], 0) / 4;
    let minX = c.width;
    let minY = c.height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const dr = d[i] - br;
        const dg = d[i + 1] - bg;
        const db = d[i + 2] - bb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        const hot = d[i] > 210 && d[i + 2] > 180 && d[i + 1] < 90;
        if (hot || dist < 72) d[i + 3] = 0;
        else if (dist < 120) d[i + 3] = Math.min(d[i + 3], Math.floor(((dist - 72) / 48) * 255));
        if (d[i + 3] > 20) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    ictx.putImageData(image, 0, 0);
    if (maxX <= minX || maxY <= minY) return c;
    const pad = 2;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(c.width - 1, maxX + pad);
    maxY = Math.min(c.height - 1, maxY + pad);
    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d").drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(removeChroma(img));
      img.onerror = reject;
      img.src = src;
    });
  }

  let last = performance.now();
  let simPause = false;
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (!simPause) update(dt);
    render();
    pressed.clear();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", onPress);
  window.addEventListener("keyup", onRelease);
  canvas.addEventListener("pointerdown", clickUi);
  window.addEventListener("resize", resize);
  holdButton("bL", "arrowleft");
  holdButton("bR", "arrowright");
  holdButton("bJ", "z");
  resize();

  Promise.all(Object.entries(ASSETS).map(async ([k, src]) => {
    sprites[k] = await loadImage(src);
  })).then(() => {
    if (params.has("test")) runTests();
    render();
    requestAnimationFrame(frame);
  }).catch((err) => {
    console.error(err);
    ctx.fillStyle = "#fff";
    ctx.font = "20px sans-serif";
    ctx.fillText("画像を読めへんかった", 40, 80);
  });

  function runTests() {
    const logs = [];
    const ok = (name, cond) => logs.push(`${cond ? "OK" : "NG"} ${name}`);
    for (let i = 0; i < levels.length; i++) {
      loadStage(i, true);
      rememberHomes();
      mode = "play";
      ok(`stage${i} spawn free`, !hitsSolid(player));
      ok(`stage${i} has goal`, baseGrid.some((r) => r.includes("G")));
      ok(`stage${i} no mid flag`, !baseGrid.some((r) => r.includes("R")));
      for (let f = 0; f < 40; f++) update(1 / 60);
      ok(`stage${i} still alive`, player.alive && mode === "play");
      ok(`stage${i} supported`, player.grounded);
    }
    loadStage(0, true);
    mode = "title";
    const fails = logs.filter((l) => l.startsWith("NG"));
    console.log(logs.join("\n"));
    window.__testLogs = logs;
    window.__testFails = fails;
  }

  if (DEBUG) {
    window.__D = {
      input,
      load: (i) => { loadStage(i, false); },
      snap: () => ({
        mode, stage: stageIndex, deaths, reason,
        x: player && Math.round(player.x), y: player && Math.round(player.y),
        vx: player && Math.round(player.vx), vy: player && Math.round(player.vy),
        grounded: player && player.grounded, alive: player && player.alive,
        tileX: player && Math.floor((player.x + PW / 2) / TILE),
        tileY: player && Math.floor((player.y + PH) / TILE),
        cp: cpId,
        traps: traps.map((t) => ({ k: t.type, at: t.at, done: t.done ? 1 : 0, arm: t.armed ? 1 : 0, held: Math.round(t.held * 100) })),
        ents: entities.map((e) => ({
          k: e.kind,
          x: Math.round(e.x),
          y: Math.round(e.y),
          dir: e.dir || 0,
        })),
      }),
      tap: (key) => { input.add(key); pressed.add(key); },
      release: (key) => { input.delete(key); },
      place: (tx, floorTy) => {
        player.x = tx * TILE + 2;
        player.y = floorTy * TILE - PH;
        player.vx = 0;
        player.vy = 0;
        player.grounded = true;
        snapCamera(true);
        render();
        return window.__D.snap();
      },
      step: (n = 1) => {
        simPause = true;
        for (let i = 0; i < n; i++) {
          update(1 / 60);
          pressed.clear();
        }
        render();
        return window.__D.snap();
      },
    };
  }
})();
