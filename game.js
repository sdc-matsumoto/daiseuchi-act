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
  const SAVE_KEY = "daiseuchi-act-v2";
  const params = new URLSearchParams(location.search);
  const DEBUG = params.has("debug");

  const SOLID = new Set(["#", "I", "F", "C", "!", "S", "="]);
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
    return [
      {
        name: "1面　歓迎の氷",
        lie: "まっすぐ行くだけや",
        rows: makeMap(170, 18, (m) => {
          m.rect(0, 0, 1, 18, "#");
          m.rect(169, 0, 1, 18, "#");
          m.rect(0, 15, 170, 3, "#");
          m.set(4, 14, "A");
          pit(m, 14, 2, 15, 18);
          pit(m, 22, 2, 15, 18);
          m.set(20, 13, "R");
          m.set(20, 14, "R");
          m.rect(30, 15, 8, 3, ".");
          m.rect(30, 15, 8, 1, "=");
          m.rect(30, 17, 8, 1, "^");
          m.rect(27, 12, 16, 1, "#");
          m.set(27, 9, "Y");
          m.set(46, 13, "R");
          m.set(46, 14, "R");
          m.rect(52, 13, 14, 1, "v");
          pit(m, 58, 3, 15, 18);
          m.rect(58, 15, 3, 1, "I");
          m.set(70, 13, "R");
          m.set(70, 14, "R");
          pit(m, 74, 2, 15, 18);
          m.set(78, 14, "B");
          m.rect(90, 11, 24, 1, "v");
          m.set(96, 12, "t");
          m.set(104, 12, "t");
          m.set(112, 12, "t");
          m.set(122, 13, "R");
          m.set(122, 14, "R");
          pit(m, 128, 5, 15, 18);
          m.rect(128, 10, 5, 1, "v");
          m.set(130, 12, "t");
          m.rect(140, 15, 3, 1, "!");
          m.rect(140, 16, 3, 2, ".");
          m.rect(140, 17, 3, 1, "^");
          m.set(150, 14, "B");
          m.set(158, 13, "R");
          m.set(158, 14, "R");
          for (let y = 10; y <= 14; y++) m.set(164, y, "G");
        }),
      },
      {
        name: "2面　急がなくてええ氷",
        lie: "急がんでええ。足場は待ってくれる",
        rows: makeMap(176, 20, (m) => {
          m.rect(0, 0, 1, 20, "#");
          m.rect(175, 0, 1, 20, "#");
          m.rect(0, 16, 176, 4, "#");
          m.set(4, 15, "A");
          m.set(12, 14, "R");
          m.set(12, 15, "R");
          pit(m, 18, 2, 16, 20);
          m.rect(26, 16, 3, 4, ".");
          m.rect(26, 16, 3, 1, "F");
          m.rect(26, 18, 3, 2, "^");
          m.set(34, 16, "C");
          m.rect(34, 17, 1, 3, ".");
          m.rect(34, 18, 1, 2, "^");
          m.set(36, 12, "a");
          m.set(42, 14, "R");
          m.set(42, 15, "R");
          pit(m, 46, 1, 16, 20);
          pit(m, 63, 2, 16, 20);
          m.set(52, 15, "N");
          m.set(66, 14, "R");
          m.set(66, 15, "R");
          m.set(70, 15, "X");
          m.set(73, 12, "Y");
          m.rect(72, 11, 3, 4, "^");
          m.set(76, 16, "S");
          m.rect(78, 16, 90, 4, ".");
          m.rect(78, 18, 90, 2, "^");
          m.rect(78, 12, 82, 1, "#");
          m.rect(96, 8, 66, 1, "v");
          m.set(104, 9, "t");
          m.set(114, 9, "t");
          m.set(124, 9, "t");
          m.rect(130, 12, 4, 1, ".");
          m.set(131, 9, "t");
          m.set(142, 10, "R");
          m.set(142, 11, "R");
          m.set(150, 10, "t");
          m.rect(156, 12, 2, 1, "!");
          for (let y = 8; y <= 11; y++) m.set(166, y, "G");
        }),
      },
      {
        name: "3面　空と海",
        lie: "鳥は飾り、海は泳げる",
        rows: makeMap(168, 18, (m) => {
          m.rect(0, 0, 1, 18, "#");
          m.rect(167, 0, 1, 18, "#");
          m.rect(0, 14, 168, 4, "#");
          m.set(4, 13, "A");
          pit(m, 12, 2, 14, 18);
          m.set(13, 10, "U");
          pit(m, 20, 2, 14, 18);
          m.set(21, 10, "U");
          m.set(26, 12, "R");
          m.set(26, 13, "R");
          m.rect(32, 14, 6, 4, ".");
          m.rect(32, 15, 2, 3, "~");
          m.rect(36, 15, 2, 3, "~");
          m.rect(34, 14, 2, 1, "#");
          m.set(34, 16, "O");
          m.set(30, 10, "Z");
          m.set(42, 13, "X");
          m.set(52, 12, "R");
          m.set(52, 13, "R");
          pit(m, 58, 2, 14, 18);
          m.set(64, 13, "B");
          pit(m, 74, 2, 14, 18);
          m.set(78, 10, "U");
          m.set(84, 12, "R");
          m.set(84, 13, "R");
          m.rect(90, 14, 2, 1, "!");
          m.rect(90, 15, 2, 3, ".");
          m.rect(90, 16, 2, 2, "^");
          m.set(100, 12, "R");
          m.set(100, 13, "R");
          m.rect(106, 10, 40, 1, "v");
          m.set(112, 11, "t");
          m.set(120, 11, "t");
          m.set(128, 11, "t");
          pit(m, 136, 4, 14, 18);
          m.set(136, 11, "U");
          m.rect(146, 14, 4, 4, ".");
          m.rect(146, 14, 4, 1, "=");
          m.rect(146, 16, 4, 2, "^");
          m.set(154, 12, "X");
          m.set(158, 13, "B");
          for (let y = 9; y <= 13; y++) m.set(164, y, "G");
        }),
      },
      {
        name: "4面　わしの本懐",
        lie: "見えてる旗がゴールや",
        rows: makeMap(188, 22, (m) => {
          m.rect(0, 0, 1, 22, "#");
          m.rect(187, 0, 1, 22, "#");
          m.rect(0, 16, 188, 6, "#");
          m.set(4, 15, "A");
          pit(m, 12, 2, 16, 22);
          m.set(18, 14, "R");
          m.set(18, 15, "R");
          m.set(22, 12, "Y");
          m.rect(24, 16, 4, 6, ".");
          m.rect(24, 16, 4, 1, "I");
          m.rect(24, 19, 4, 3, "^");
          m.set(31, 11, "Y");
          m.rect(34, 16, 5, 6, ".");
          m.rect(34, 19, 5, 3, "^");
          m.rect(28, 13, 16, 1, "#");
          m.set(48, 14, "R");
          m.set(48, 15, "R");
          pit(m, 54, 16, 16, 22);
          m.rect(58, 13, 7, 1, "v");
          m.set(56, 12, "a");
          m.set(74, 14, "R");
          m.set(74, 15, "R");
          m.set(80, 13, "Z");
          m.rect(83, 16, 2, 3, ".");
          m.rect(83, 17, 96, 2, ".");
          m.rect(100, 16, 70, 1, "v");
          m.set(108, 15, "t");
          m.set(118, 15, "t");
          m.set(128, 15, "t");
          m.set(148, 17, "R");
          m.set(148, 18, "R");
          m.set(158, 15, "t");
          for (let y = 17; y <= 18; y++) m.set(172, y, "G");
          m.rect(88, 14, 6, 2, "#");
          m.rect(96, 12, 6, 4, "#");
          m.rect(104, 10, 8, 6, "#");
          for (let y = 6; y <= 9; y++) m.set(108, y, "g");
          m.set(108, 5, "U");
        }),
        movers: [
          {
            x: 51 * TILE,
            y: 16 * TILE,
            w: 3 * TILE,
            h: 12,
            minX: 51 * TILE,
            maxX: 65 * TILE,
            speed: 70,
            dir: 1,
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
    snapCamera(true);
    persist();
  }

  function markerSpawn(tx, ty) {
    return {
      x: tx * TILE + (TILE - PW) / 2,
      y: feetRowFromMarker(ty) * TILE - PH,
    };
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
    };
  }

  function updateDrop(e, dt) {
    if (e.state === "wait") {
      const pcx = player.x + PW / 2;
      const ecx = e.x + e.w / 2;
      if (Math.abs(pcx - ecx) < 20 && player.y > e.y) {
        e.state = "fall";
        e.vy = 260;
      }
      return;
    }
    if (e.state === "rest") return;
    e.vy = Math.min(e.vy + G * dt, 980);
    e.y += e.vy * dt;
    const tx = Math.floor((e.x + e.w / 2) / TILE);
    const under = Math.floor((e.y + e.h) / TILE);
    if (e.vy > 0 && solidAt(tx, under)) {
      e.y = under * TILE - e.h;
      e.vy = 0;
      e.state = "rest";
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
      } else if (e.kind === "mover") {
        e.x = e.homeX;
        e.prevX = e.homeX;
        e.dx = 0;
        e.dir = 1;
      }
    }
    player = makePlayer(spawn.x, spawn.y);
    mode = "play";
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
      if (ch === "S") sprung = true;
    }
    return sprung;
  }

  function updatePlayer(dt) {
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
        sfx("jump");
        burst(player.x + PW / 2, player.y + PH, "#d7f6ff", 5);
      }
    }

    const grav = (!jumpHeld() && player.vy < 0 && !player.boost) ? G * 2.7 : G;
    player.vy = Math.min(player.vy + grav * dt, 980);
    if (player.springLock > 0) player.springLock -= dt;

    if (player.riding) {
      player.x += player.riding.dx;
      player.riding = null;
    }

    player.grounded = false;
    sweep(player, "x", player.vx * dt);
    const yBefore = player.y;
    const hitY = sweep(player, "y", player.vy * dt);
    player._dy = player.y - yBefore;
    if (hitY === "pos") {
      player.vy = 0;
      player.grounded = true;
    }
    if (hitY === "neg") player.vy = 0;

    if (player.grounded) {
      const sprung = armUnderFeet();
      if (sprung && player.springLock <= 0) {
        player.vy = SPRING_V;
        player.grounded = false;
        player.coyote = 0;
        player.springLock = 0.12;
        player.boost = true;
        player.air = 1;
        sfx("spring");
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

    if (player.y > H * TILE + 8) kill("底がない");
  }

  function stickPlatforms() {
    for (const p of entities) {
      if (p.kind !== "mover") continue;
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
      if (e.kind !== "mover" && player.alive && rects(player, e)) {
        const name = { bear: "熊に会うた", penguin: "ペンギンや", gull: "鳥に突かれた", orca: "シャチや", drop: "氷が落ちてきた" }[e.kind];
        kill(name || "当てられた");
      }
    }
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
    for (const e of entities) if (e.kind === "mover") updateMover(e, dt);
    updatePlayer(dt);
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
        if (ch === "=" || ch === "#" || ch === "F" || ch === "C" || ch === "!" || ch === "S" || (ch === "I" && (revealed.has(`${tx},${ty}`) || DEBUG))) {
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
            if (ch === "S") {
              ctx.strokeStyle = "#d4534a";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(x + 8, y + 8);
              ctx.lineTo(x + 24, y + 14);
              ctx.lineTo(x + 8, y + 20);
              ctx.lineTo(x + 24, y + 26);
              ctx.stroke();
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
        if (DEBUG && ch === "I" && !revealed.has(`${tx},${ty}`)) {
          ctx.globalAlpha = 0.45;
          drawIce(x, y, TILE, TILE, 0);
          ctx.globalAlpha = 1;
        }
      }
    }
    for (const d of debris) drawIce(d.x, d.y, d.w, d.h, 0);
    for (const e of entities) {
      if (e.kind === "mover") {
        drawIce(e.x, e.y, e.w, e.h, 0);
        ctx.fillStyle = "#8fd0ea";
        ctx.fillRect(e.x + 6, e.y + 4, e.w - 12, 3);
      }
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
    g.addColorStop(0, "#8ecae6");
    g.addColorStop(1, "#e7f6ef");
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
      if (e.kind === "mover") continue;
      if (e.kind === "bear") drawActor("bear", e, e.dir > 0);
      if (e.kind === "penguin") drawActor("penguin", e, e.dir > 0);
      if (e.kind === "gull") drawActor("gull", e, e.dir > 0);
      if (e.kind === "orca") drawActor("orca", e, e.flip);
      if (e.kind === "drop") drawIcicle(e);
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
    ctx.fillText("足場も、旗も、ゴールも、信用するな", VW / 2, 196);
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
      ok(`stage${i} has cp`, baseGrid.some((r) => r.includes("R")));
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
