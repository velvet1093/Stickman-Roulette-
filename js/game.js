// Sakura Hearts — open-world life sim: state, clock, NPC routines, movement,
// rendering, dialogue and UI.
(function () {
  'use strict';
  const { DAYS, STAGES, CAPS, LOCATIONS, ACTIVITIES, ITEMS, FORTUNES, GIRLS, GIRL_ORDER, WEATHER, RAIN_SHELTER, INTERACTIONS, WALK_LINES, SLEEPOVER, FOODS, CITY, PAIRS, HAREM, LIFE, LIFE_FX, COSPLAYS, POSES, VS, YUMEKO_CARDS, CHAT, VARIETY } = DATA;
  const LEGACY_SAVE_KEY = 'sakura-hearts-save-v2';
  const SLOT_COUNT = 3;
  const SETTINGS_KEY = 'sakura-hearts-settings';
  const BW = BACKGROUNDS.BW, BH = BACKGROUNDS.BH;
  const T = WORLD.T;
  const DAY_START = 360, DAY_END = 1560; // 6:00am .. 2:00am
  const MS_PER_MIN = 450;               // real milliseconds per game minute
  const WALK = 72, NPC_WALK = 40;       // pixels per second
  const RUN = 1.8;                      // running speed multiplier

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  // Like rand, but never the same pick twice in a row for the same key.
  const lastPick = {};
  function pickNew(arr, key) {
    if (arr.length < 2) return arr[0];
    let i;
    do i = Math.floor(Math.random() * arr.length); while (i === lastPick[key]);
    lastPick[key] = i;
    return arr[i];
  }
  // A girl's own version of a common line (see DATA.VARIETY).
  // A girl's own version of a common line (see DATA.VARIETY): a pool of
  // [expr, text] pairs or strings is picked from; a single pair is as-is.
  function vary(id, key) {
    const v = VARIETY[id] && VARIETY[id][key];
    const single = Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string' && /^[a-z]+$/.test(v[0]);
    return single ? v : pickNew(v, id + ':' + key);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ============================================================ settings
  let settings = { sound: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* ignore */ }
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }

  // =============================================================== sound
  const SFX = (() => {
    let ac = null;
    function ctx() {
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(freq, dur, type = 'square', vol = 0.05, when = 0) {
      if (!settings.sound) return;
      const a = ctx(); if (!a) return;
      const t = a.currentTime + when;
      const o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t); o.stop(t + dur + 0.02);
    }
    return {
      blip: () => tone(880 + Math.random() * 120, 0.03, 'square', 0.015),
      click: () => tone(660, 0.05, 'square', 0.03),
      door: () => { tone(392, 0.08, 'triangle', 0.06); tone(523, 0.1, 'triangle', 0.06, 0.07); },
      heart: () => { tone(784, 0.12, 'triangle', 0.08); tone(988, 0.12, 'triangle', 0.08, 0.08); tone(1319, 0.2, 'triangle', 0.08, 0.16); },
      sad: () => { tone(330, 0.15, 'triangle', 0.08); tone(262, 0.25, 'triangle', 0.08, 0.12); },
      coin: () => { tone(988, 0.06, 'square', 0.04); tone(1319, 0.15, 'square', 0.04, 0.06); },
      day: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, i * 0.1)); },
      win: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, i * 0.12)); },
      thunder: () => {
        if (!settings.sound) return;
        const a = ctx(); if (!a) return;
        const len = Math.floor(a.sampleRate * 1.4);
        const buf = a.createBuffer(1, len, a.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
        f.type = 'lowpass'; f.frequency.value = 320; g.gain.value = 0.5;
        src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start();
      },
      msg: () => { tone(1175, 0.08, 'triangle', 0.05); tone(1568, 0.12, 'triangle', 0.05, 0.09); },
    };
  })();

  // =============================================================== state
  let S = null;
  let mode = 'title'; // title | world | interior | busy

  function newState(name) {
    const girls = {};
    for (const id of GIRL_ORDER) {
      girls[id] = { met: false, aff: 0, dates: 0, events: 0, gf: false, seen: [], known: {}, knownDates: {}, reqKnown: false, life: girlLife(id) };
    }
    return {
      v: 2, name, day: 1, time: DAY_START, money: 100, energy: 100,
      stats: { charm: 5, smarts: 5, fitness: 5 }, offerings: 0,
      inv: {}, girls, daily: {}, endingsSeen: [],
      inside: 'home', px: INTERIORS.home.wake[0] * T + 8, py: INTERIORS.home.wake[1] * T + 12, dir: 'down', mapV: 2,
      weather: 'sunny', forecast: rollWeather(), invites: [], msgs: [], chatV: 1, wardrobe: {}, photos: [],
      pacifist: false, life: newLife(),
    };
  }

  const dow = () => (S.day - 1) % 7;
  const isWeekend = () => dow() >= 5;
  function clockStr(t = S.time) {
    const m = Math.floor(t) % 1440;
    let h = Math.floor(m / 60);
    const mm = Math.floor((m % 60) / 10) * 10;
    const ap = h >= 12 && h < 24 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${String(mm).padStart(2, '0')}${ap}`;
  }
  const dayLabel = () => `Day ${S.day} · ${DAYS[dow()]} · ${clockStr()} ${WEATHER[S.weather] ? WEATHER[S.weather].icon : ''}`;
  const isWet = () => !!(WEATHER[S.weather] && WEATHER[S.weather].wet);
  const isBirthday = (id) => S.day % 28 === GIRLS[id].birthday;
  function rollWeather() {
    const entries = Object.entries(WEATHER);
    let r = Math.random() * entries.reduce((a, [, w]) => a + w.weight, 0);
    for (const [k, w] of entries) { r -= w.weight; if (r <= 0) return k; }
    return 'sunny';
  }
  const slotOf = (t = S.time) => (t < 720 ? 0 : t < 1020 ? 1 : t < 1260 ? 2 : 3);

  function isOpen(bid, t = S.time) {
    const L = LOCATIONS[bid];
    if (!L || L.outdoor) return true;
    if (L.weekdaysOnly && isWeekend()) return false;
    return t >= L.open && t < L.close;
  }

  function stageOf(g) {
    if (g.gf) return 'Girlfriend ♥';
    if (!g.met) return 'Stranger';
    let s = STAGES[0].label;
    for (const st of STAGES) if (g.aff >= st.min) s = st.label;
    return s;
  }
  function capOf(g) {
    let cap = CAPS[0].cap;
    for (const c of CAPS) if (g.dates >= c.dates) cap = c.cap;
    return cap;
  }
  function reqMet(id) {
    const r = GIRLS[id].req;
    return Object.keys(r).every((k) => (k === 'offerings' ? S.offerings : S.stats[k]) >= r[k]);
  }
  const fmt = (s) => s.replace(/\{name\}/g, S ? S.name : 'you');

  // ============================================================== saving
  // Three save slots. The slot you're playing autosaves all the time: to
  // this browser right away, and to your private cloud save (the artifact's
  // db, under data/users/<you>/) every ~20s and when you leave the page.
  // Loading picks whichever copy of a slot is newer.
  const SAVE = {
    slot: null,          // slot being played
    db: null, uid: null, // cloud, when available
    cloud: {},           // slot -> last cloud record seen
    cloudErr: null,
    lastSaved: 0,        // ms timestamp of the newest save of the active slot
    localTimer: null, cloudTimer: null, writing: false, again: false,
    ready: null,
  };
  const localKey = (n) => 'sakura-hearts-slot-' + n;
  function readLocal(n) {
    try { const r = localStorage.getItem(localKey(n)); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function writeLocal(n, rec) {
    try { localStorage.setItem(localKey(n), JSON.stringify(rec)); return true; } catch (e) { return false; }
  }
  const slotDoc = (n) => SAVE.db.collection('data/users/' + SAVE.uid).doc('slot' + n);

  // Newest copy of a slot (cloud or this browser), or null when empty.
  function slotRecord(n) {
    const a = readLocal(n), b = SAVE.cloud[n];
    const pick = !a ? b : !b ? a : (b.savedAt > a.savedAt ? b : a);
    return pick && pick.state && !pick.deleted ? pick : null;
  }

  function connectCloud() {
    SAVE.ready = (async () => {
      try {
        if (!window.claude || typeof window.claude.use !== 'function') return;
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (!db || !user) return;
        const uid = await user.id();
        if (!uid) return;
        SAVE.db = db; SAVE.uid = uid;
        for (let n = 1; n <= SLOT_COUNT; n++) {
          try { const snap = await slotDoc(n).get(); if (snap.exists) SAVE.cloud[n] = JSON.parse(JSON.stringify(snap.data())); } catch (e) { /* keep local */ }
        }
        if (mode === 'title') title();
      } catch (e) { /* local saves still work */ }
    })();
  }

  async function writeCloud() {
    if (!SAVE.db || SAVE.slot == null || !S) return;
    if (SAVE.writing) { SAVE.again = true; return; }
    SAVE.writing = true;
    const n = SAVE.slot;
    const rec = { v: 3, savedAt: Date.now(), state: JSON.parse(JSON.stringify(S)) };
    try {
      await slotDoc(n).set(rec);
      SAVE.cloud[n] = rec;
      SAVE.cloudErr = null;
    } catch (e) {
      SAVE.cloudErr = (e && e.code) || 'unavailable';
      if (SAVE.cloudErr === 'unavailable' || SAVE.cloudErr === 'resource_exhausted') SAVE.again = true;
    }
    SAVE.writing = false;
    if (SAVE.again) { SAVE.again = false; scheduleCloud(8000); }
  }
  function scheduleCloud(ms) {
    if (SAVE.cloudTimer) return;
    SAVE.cloudTimer = setTimeout(() => { SAVE.cloudTimer = null; writeCloud(); }, ms);
  }

  // Called on every state change. `now` writes immediately (new day,
  // endings, leaving the page); otherwise writes are coalesced.
  function autosave(now) {
    if (!S || SAVE.slot == null) return;
    const writeNow = () => {
      SAVE.localTimer = null;
      if (!S || SAVE.slot == null) return;
      const rec = { v: 3, savedAt: Date.now(), state: S };
      writeLocal(SAVE.slot, rec);
      SAVE.lastSaved = rec.savedAt;
    };
    if (now) {
      clearTimeout(SAVE.localTimer);
      writeNow();
      clearTimeout(SAVE.cloudTimer); SAVE.cloudTimer = null;
      writeCloud();
    } else {
      if (!SAVE.localTimer) SAVE.localTimer = setTimeout(writeNow, 1200);
      scheduleCloud(20000);
    }
  }
  window.addEventListener('pagehide', () => autosave(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') autosave(true); });

  function deleteSlot(n) {
    try { localStorage.removeItem(localKey(n)); } catch (e) { /* ignore */ }
    if (SAVE.db) {
      SAVE.cloud[n] = null;
      slotDoc(n).delete().catch(() => {});
    }
  }

  // Older builds kept one save under a single key: move it into slot 1.
  (function importLegacySave() {
    try {
      const raw = localStorage.getItem(LEGACY_SAVE_KEY);
      if (raw && !readLocal(1)) writeLocal(1, { v: 3, savedAt: Date.now() - 1000, state: JSON.parse(raw) });
    } catch (e) { /* ignore */ }
  })();

  function timeAgo(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 10) return 'just now';
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
  function slotSummary(rec) {
    const st = rec.state;
    const gfs = GIRL_ORDER.filter((k) => st.girls && st.girls[k] && st.girls[k].gf).length;
    const met = GIRL_ORDER.filter((k) => st.girls && st.girls[k] && st.girls[k].met).length;
    const d = (st.day - 1) % 7;
    return `${esc(st.name)} · Day ${st.day} (${DAYS[d]}) · ${clockStr(st.time || DAY_START)} · ♥ ${gfs}/${GIRL_ORDER.length} · met ${met}/${GIRL_ORDER.length}`;
  }

  function migrate(s) {
    const out = Object.assign(newState(s.name), s);
    if (out.mapV !== 2) {
      out.mapV = 2;
      if (out.inside && INTERIORS[out.inside]) { const sp = INTERIORS[out.inside].spawn; out.px = sp[0] * T + 8; out.py = sp[1] * T + 12; }
    }
    for (const id of GIRL_ORDER) {
      const old = (s.girls || {})[id] || {};
      out.girls[id] = Object.assign(newState('x').girls[id], old);
      out.girls[id].life = Object.assign(girlLife(id), old.life || {});
    }
    out.life = Object.assign(newLife(), s.life || {});
    out.life.last = 0;
    // girls who left the game (Rei): drop her from old saves
    const gone = (k) => k && !GIRLS[k] && k !== 'player' && k !== 'me' && k !== 'landlord' && k !== 'group';
    for (const k of Object.keys(out.girls)) if (!GIRLS[k]) delete out.girls[k];
    out.invites = (out.invites || []).filter((v) => !gone(v.id));
    out.msgs = (out.msgs || []).filter((m) => !gone(m.chat || m.from) && !gone(m.from));
    out.photos = (out.photos || []).filter((ph) => !(ph.ids || []).some(gone));
    out.endingsSeen = (out.endingsSeen || []).filter((k) => GIRLS[k]);
    for (const k of Object.keys(out.wardrobe || {})) if (gone(k)) delete out.wardrobe[k];
    if (out.chatV !== 1) { out.chatV = 1; for (const m of out.msgs || []) { m.read = true; m.chat = m.chat || m.from; } }
    out.chatTyping = null;
    if (out.inside && !LOCATIONS[out.inside]) {
      // saved mid-sleepover at her place (or on the train): start outside
      const b = out.inside === 'train' ? WORLD.B.station : WORLD.B[homeOf(String(out.inside).replace('room_', ''))] || WORLD.B.home;
      out.inside = null; out.px = b.mat.x * T + 8; out.py = b.mat.y * T + 12;
    }
    return out;
  }

  // Where she lives: the last stop of her weekday routine.
  const homeOf = (id) => (GIRLS[id] ? GIRLS[id].schedule.weekday.slice(-1)[0][1] : 'home');

  // ======================================================== girl routines
  function scheduleGoal(id) {
    const sched = GIRLS[id].schedule[isWeekend() ? 'weekend' : 'weekday'];
    let g = sched[0][1];
    for (const [t, place] of sched) if (S.time >= t) g = place;
    return g;
  }
  function activeInvite(id) {
    return (S.invites || []).find((v) => v.id === id && !v.done && S.time >= v.start && S.time < v.end) || null;
  }
  // Where a girl wants to be right now: an invite beats her routine, and
  // the weather can send her indoors (rain) or out to the park (blossoms).
  function goalFor(id) {
    const inv = activeInvite(id);
    if (inv) return inv.place;
    const lg = lifeGoal(id);
    if (lg) return lg;
    let g = scheduleGoal(id);
    if (isWet() && RAIN_SHELTER[g]) g = RAIN_SHELTER[g];
    else if (S.weather === 'blossom' && S.time >= 900 && S.time < 1080 && g !== 'apartments' && g !== 'shrinehall') g = 'park';
    return g;
  }
  function placeName(place) {
    if (place === 'apartments' || place === 'shrinehall' || place === 'dorm') return 'home';
    return (LOCATIONS[place] || WORLD.AREAS[place] || WORLD.B[place]).name;
  }

  const npcs = {};
  const tileCenter = (tx, ty) => ({ x: tx * T + 8, y: ty * T + 12 });
  const tileOf = (x, y) => ({ x: Math.floor(x / T), y: Math.floor((y - 1) / T) });

  function placeTarget(place) {
    if (WORLD.B[place]) return { tile: WORLD.B[place].mat, bld: place };
    return { tile: WORLD.randomTileIn(place), area: place };
  }

  function setGoal(n, goal, teleport) {
    n.goal = goal;
    const tg = placeTarget(goal);
    n.bld = tg.bld || null;
    n.area = tg.area || null;
    if (teleport) {
      const c = tileCenter(tg.tile.x, tg.tile.y);
      n.x = c.x; n.y = c.y; n.path = []; n.inside = tg.bld || null; n.idle = Math.random() * 3; n.dir = 'down';
      return;
    }
    if (n.inside) {
      const m = WORLD.B[n.inside].mat;
      const c = tileCenter(m.x, m.y);
      n.x = c.x; n.y = c.y; n.inside = null; n.dir = 'down';
    }
    const s = tileOf(n.x, n.y);
    const p = WORLD.findPath(s.x, s.y, tg.tile.x, tg.tile.y);
    if (p === null) setGoal(n, goal, true); else n.path = p;
  }

  function initNPCs() {
    cityDate = null;
    for (const id of GIRL_ORDER) {
      npcs[id] = npcs[id] || { id, x: 0, y: 0, dir: 'down', path: [], dist: 0 };
      npcs[id].follow = null; npcs[id].room = null;
      setGoal(npcs[id], goalFor(id), true);
    }
  }
  function syncNPCs() {
    for (const id of GIRL_ORDER) {
      if (npcs[id].follow) continue;
      if (npcs[id].goal !== goalFor(id)) { npcs[id].room = null; setGoal(npcs[id], goalFor(id), true); }
    }
  }

  // Inside the room the player is in, girls get room coordinates and
  // wander (or stand at their spot); elsewhere they're just "inside".
  function roomStation(id, room) {
    const st = room.stations[id];
    if (!st) return null;
    if (id === 'nami' && room.id === 'cafe' && !(S.time >= 450 && S.time < 900)) return null; // only on shift
    return st;
  }
  function initRoomNPC(n, room, fromDoor) {
    const st = roomStation(n.id, room);
    const dest = st ? { x: st[0], y: st[1] } : room.randomTile();
    n.room = { id: room.id, x: 0, y: 0, path: [], idle: 1 + Math.random() * 3, station: !!st, leaving: false, dir: 'down', dist: 0 };
    if (fromDoor) {
      const c = tileCenter(room.door, room.MH - 1);
      n.room.x = c.x; n.room.y = c.y;
      n.room.path = room.findPath(room.door, room.MH - 1, dest.x, dest.y) || [];
    } else {
      const c = tileCenter(dest.x, dest.y);
      n.room.x = c.x; n.room.y = c.y;
    }
  }
  function stepAlong(o, speed, dt) {
    const [tx, ty] = o.path[0];
    const c = tileCenter(tx, ty);
    const dx = c.x - o.x, dy = c.y - o.y;
    const d = Math.hypot(dx, dy);
    const stepLen = speed * dt;
    if (d <= stepLen) { o.x = c.x; o.y = c.y; o.path.shift(); }
    else { o.x += (dx / d) * stepLen; o.y += (dy / d) * stepLen; }
    if (d > 0.01) o.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    o.dist = (o.dist || 0) + stepLen;
  }

  function updateNPCs(dt) {
    const room = S.inside ? INTERIORS[S.inside] : null;
    for (const id of GIRL_ORDER) {
      const n = npcs[id];
      if (n.follow) { updateFollower(n, dt); continue; }
      const goal = goalFor(id);
      // she's in the room with you: walk to the door before leaving
      if (room && n.inside === room.id) {
        if (!n.room || n.room.id !== room.id) initRoomNPC(n, room, false);
        const r = n.room;
        if (goal !== n.goal && !r.leaving) {
          r.leaving = true;
          const t = tileOf(r.x, r.y);
          r.path = room.findPath(t.x, t.y, room.door, room.MH - 1) || [];
        }
        if (r.path.length) { stepAlong(r, NPC_WALK, dt); continue; }
        if (r.leaving) { n.room = null; setGoal(n, goal, false); continue; }
        if (!r.station) {
          r.idle -= dt;
          if (r.idle <= 0) {
            const t = room.randomTile(), cur = tileOf(r.x, r.y);
            r.path = room.findPath(cur.x, cur.y, t.x, t.y) || [];
            r.idle = 3 + Math.random() * 6;
          }
        } else r.dir = 'down';
        continue;
      }
      if (goal !== n.goal) setGoal(n, goal, false);
      if (n.inside) continue;
      n.room = null;
      if (n.path.length) {
        stepAlong(n, NPC_WALK, dt);
      } else if (n.bld) {
        n.inside = n.bld;
        if (room && room.id === n.bld) initRoomNPC(n, room, true);
      } else if (n.area) {
        n.idle -= dt;
        if (n.idle <= 0) {
          const t = WORLD.randomTileIn(n.area);
          const s = tileOf(n.x, n.y);
          n.path = WORLD.findPath(s.x, s.y, t.x, t.y) || [];
          n.idle = 2 + Math.random() * 5;
        }
      }
    }
  }

  // ---- walking together: she follows your footsteps around town
  // (on a city date she follows you into the shops too)
  const trail = [];
  let cityDate = null; // { ids: [girls on the trip], done: { 'id:place': true } }
  const MAX_PARTY = 3;
  const party = () => GIRL_ORDER.filter((k) => npcs[k] && npcs[k].follow);
  const namesOf = (ids) => { const n = ids.map((k) => GIRLS[k].name); return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1]; };
  function startFollow(id) {
    const n = npcs[id];
    const others = party();
    const until = Math.max(S.time + 120, ...others.map((k) => npcs[k].follow.until));
    for (const k of others) npcs[k].follow.until = until;
    n.follow = { until, favDone: false, lastAff: S.time, date: others.length ? !!npcs[others[0]].follow.date : false };
    n.inside = null; n.path = []; n.room = null;
    if (!others.length) trail.length = 0;
    else { n.x = S.px; n.y = S.py + 14 * (others.length + 1); tick.lastBanter = S.time - 15; }
  }
  async function endFollow(id, why) {
    const n = npcs[id];
    if (!n.follow) return;
    n.follow = null;
    n.goal = null; // re-plan from where she is
    toast(why || `${GIRLS[id].name} had a lovely walk with you ♥`, 'good');
  }
  function updateFollower(n, dt) {
    const f = n.follow;
    if (S.time >= f.until) { endFollow(n.id); return; }
    // walk to a point ~18px back along the player's trail
    const gap = 18 * (party().indexOf(n.id) + 1);
    let tx = S.px, ty = S.py, acc = 0, onTrail = false;
    for (let i = trail.length - 1; i > 0; i--) {
      acc += Math.hypot(trail[i][0] - trail[i - 1][0], trail[i][1] - trail[i - 1][1]);
      if (acc >= gap) { tx = trail[i - 1][0]; ty = trail[i - 1][1]; onTrail = true; break; }
    }
    const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
    // no trail yet (you just arrived somewhere): keep a step's distance
    if (d > (onTrail ? 1 : 16 * (gap / 18))) {
      const step = Math.min(d, (d > 40 ? WALK * 1.4 : WALK) * (running() ? RUN : 1) * dt);
      n.x += (dx / d) * step; n.y += (dy / d) * step;
      n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      n.dist = (n.dist || 0) + step;
      n.walking = true;
    } else n.walking = false;
    if (S.time - f.lastAff >= 30) { f.lastAff = S.time; addAff(n.id, 1); if (n.id === party()[0]) applyLife({ fun: 3 }); }
    if (!f.favDone && !S.inside) {
      const t = tileOf(S.px, S.py);
      if (WORLD.areaAt(t.x, t.y) === WALK_LINES[n.id].favArea) { f.favDone = true; walkFavMoment(n.id); }
    }
  }
  // Two girls together: their own little exchange (once a day per pair).
  const pairKey = (a, b) => (GIRL_ORDER.indexOf(a) < GIRL_ORDER.indexOf(b) ? `${a}|${b}` : `${b}|${a}`);
  async function pairScene(a, b, andResume = true) {
    busy();
    const key = pairKey(a, b);
    S.daily['pair_' + key] = true;
    const pa = actorPos(a), pb = actorPos(b);
    await cutscene({
      actors: { [a]: { dirEnd: facing(pa, pb) }, [b]: { dirEnd: facing(pb, pa) } },
      focus: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 - 8 }, dur: 700,
      emotes: [{ who: a, kind: '!', at: 0, dur: 800 }, { who: b, kind: 'note', at: 300, dur: 1000 }],
    });
    for (const [who, expr, text] of PAIRS[key]) { if (who === 'n') await narrate(text); else await play(who, [[expr, text]]); }
    if (S.girls[a].gf && S.girls[b].gf) { await play(a, [HAREM[a].pair]); await play(b, [HAREM[b].pair]); }
    addAff(a, 2); addAff(b, 2);
    endCut();
    if (andResume) resume();
  }
  // While you hang out with two or more of them, they chat now and then.
  function maybeBanter() {
    const p = party();
    if (p.length < 2 || S.time - (tick.lastBanter || 0) < 25) return false;
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      if (S.daily['pair_' + pairKey(p[i], p[j])]) continue;
      tick.lastBanter = S.time;
      pairScene(p[i], p[j]);
      return true;
    }
    return false;
  }
  // Another girl standing close by when you talk to one of them.
  function nearbyFriend(id) {
    const me = actorPos(id);
    for (const a of actorsHere()) {
      if (a.id === id || npcs[a.id].follow || !S.girls[a.id].met || S.daily['pair_' + pairKey(id, a.id)]) continue;
      if (Math.hypot(a.x - me.x, a.y - me.y) < 40) return a.id;
    }
    return null;
  }

  async function walkFavMoment(id) {
    busy();
    const g = actorPos(id);
    await cutscene({ actors: { player: { dirEnd: facing(actorPos('player'), g) }, [id]: { dirEnd: facing(g, actorPos('player')) } }, focus: { x: (S.px + g.x) / 2, y: (S.py + g.y) / 2 }, dur: 1200, fx: [{ kind: 'hearts', x: (S.px + g.x) / 2, y: Math.min(S.py, g.y) - 26 }], emotes: [{ who: id, kind: 'heart', at: 200, dur: 2400 }] });
    showRel(id);
    await showLine(id, WALK_LINES[id].fav[1]);
    addAff(id, 4);
    endCut();
    resume();
  }

  function girlNearPlayer(id, r = 96) {
    const n = npcs[id];
    if (n.follow) return true;
    if (S.inside) return n.inside === S.inside;
    return !n.inside && Math.hypot(n.x - S.px, n.y - S.py) < r;
  }
  // Swimsuits on the beach sand, towels inside the onsen.
  function outfitAt(inside, x, y) {
    if (view.forceOutfit && view.scene === 'world') return view.forceOutfit === 'normal' ? null : view.forceOutfit;
    if (inside === 'onsen') return 'towel';
    if (!inside && x !== undefined) {
      const t = tileOf(x, y);
      if (WORLD.areaAt(t.x, t.y) === 'beach' || (WORLD.tiles[t.y] && WORLD.tiles[t.y][t.x] === '~')) return 'swim';
    }
    return null;
  }
  // Wardrobe choices for a character (or null for defaults).
  const wopts = (id) => {
    const o = S && S.wardrobe && S.wardrobe[id] && Object.keys(S.wardrobe[id]).length ? S.wardrobe[id] : null;
    if (id === 'marin' && S && S.daily && S.daily.cosplay) return Object.assign({}, o, { cos: S.daily.cosplay });
    return o;
  };
  const cosplayNow = (id) => id === 'marin' && !!S && !!((S.daily && S.daily.cosplay) || (wopts(id) && wopts(id).daily === 'cosplay' && wopts(id).cos));
  // Date clothes: on a city trip, in the fancy restaurant (dress code), or
  // every day if the wardrobe says so.
  function casualNow(id) {
    if (!S) return false;
    if (S.inside === 'fancy') return true;
    if (cityDate && (id === 'player' || cityDate.ids.includes(id))) return true;
    const o = wopts(id);
    return !!(o && o.daily === 'casual');
  }
  const outfitFor = (id, inside, x, y) => outfitAt(inside, x, y) || (cosplayNow(id) ? 'cosplay' : casualNow(id) ? 'casual' : null);
  function girlOutfit(id) {
    if (view.forceOutfit) return view.forceOutfit === 'normal' ? null : view.forceOutfit;
    const n = npcs[id];
    if (!n) return null;
    return n.follow ? outfitFor(id, S.inside, n.x, n.y) : outfitFor(id, n.inside, n.x, n.y);
  }

  // The map the player is walking on, and the girls on it with positions.
  const curMap = () => (S && S.inside ? INTERIORS[S.inside] : WORLD);
  function actorsHere() {
    const out = [];
    for (const id of GIRL_ORDER) {
      const n = npcs[id];
      if (!n) continue;
      if (S.inside) {
        if (n.inside === S.inside && n.room && n.room.id === S.inside) out.push({ id, x: n.room.x, y: n.room.y, dir: n.room.dir, dist: n.room.dist || 0, moving: n.room.path.length > 0 });
        else if (n.follow) out.push({ id, x: n.x, y: n.y, dir: n.dir, dist: n.dist || 0, moving: !!n.walking });
      } else if (!n.inside) out.push({ id, x: n.x, y: n.y, dir: n.dir, dist: n.dist || 0, moving: n.follow ? !!n.walking : n.path.length > 0 });
    }
    return out;
  }

  // ============================================================== canvas
  const canvas = $('scene');
  const cx = canvas.getContext('2d');
  // Layout (device pixels). The town is drawn full screen at worldK zoom
  // (VW x VH logical pixels); background scenes are drawn into a 192x144
  // box at sceneK zoom, with the menu panel below it (or beside it in landscape).
  const L = { dpr: 1, worldK: 3, VW: 192, VH: 144, sceneK: 2, sx: 0, sy: 0 };

  const view = {
    scene: 'park', t: 2,   // 'world' or a background id
    dark: 0,               // lights-out overlay in the world (0..1)
    flash: 0,              // camera-flash overlay (purikura)
    girls: [],             // girls standing in a background scene
    focus: null,           // { id, expr, since }
    fx: [], petals: [], rain: 0,
  };
  const blinkAt = {};

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    L.dpr = dpr;
    // town zoom: ~210 logical pixels across the short side of the screen
    L.worldK = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) / 210));
    L.VW = Math.ceil(canvas.width / L.worldK);
    L.VH = Math.ceil(canvas.height / L.worldK);
    const hudH = $('hud').hidden ? 0 : $('hud').getBoundingClientRect().height;
    const top = hudH * dpr;
    const landscape = w > h * 1.15;
    if (landscape) {
      L.sceneK = Math.max(1, Math.floor(Math.min((canvas.width * 0.6) / BW, (canvas.height - top) / BH)));
      L.sx = Math.round(Math.max(0, (canvas.width * 0.6 - BW * L.sceneK) / 2));
      L.sy = Math.round(top + Math.max(0, (canvas.height - top - BH * L.sceneK) / 2));
    } else {
      L.sceneK = Math.max(1, Math.floor(Math.min(canvas.width / BW, (canvas.height * 0.5) / BH)));
      L.sx = Math.round((canvas.width - BW * L.sceneK) / 2);
      L.sy = Math.round(top);
    }
    L.landscape = landscape;
    L.panelTop = landscape ? top : L.sy + BH * L.sceneK;
    L.panelLeft = landscape ? L.sx * 2 + BW * L.sceneK : 0;
    const st = $('app').style;
    const css = (v) => (v / dpr) + 'px';
    st.setProperty('--hud-h', hudH + 'px');
    st.setProperty('--scene-top', css(L.sy));
    st.setProperty('--scene-left', css(L.sx));
    st.setProperty('--scene-w', css(BW * L.sceneK));
    st.setProperty('--scene-h', css(BH * L.sceneK));
    st.setProperty('--panel-top', landscape ? hudH + 'px' : css(L.sy + BH * L.sceneK));
    st.setProperty('--panel-left', landscape ? css(L.sx * 2 + BW * L.sceneK) : '0px');
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe($('hud'));
  document.addEventListener('fullscreenchange', resize);

  const heartImg = SPRITES.heart('#ff6b8a');
  const sadHeartImg = SPRITES.heart('#6a7ad8');

  function spawnHearts(n, sad) {
    for (let i = 0; i < n; i++) {
      view.fx.push({ x: 66 + Math.random() * 60, y: 60 + Math.random() * 30, vy: sad ? 0.25 : -0.35 - Math.random() * 0.3, vx: (Math.random() - 0.5) * 0.2, life: 1, sad, delay: i * 6 });
    }
  }

  function isBlinking(id, now) {
    if (!blinkAt[id]) blinkAt[id] = now + 1000 + Math.random() * 3000;
    if (now > blinkAt[id] + 140) blinkAt[id] = now + 2000 + Math.random() * 3500;
    return now >= blinkAt[id];
  }

  function drawLabel(text, x, y, color) {
    cx.font = '7px DotGothic16, monospace';
    cx.textAlign = 'center';
    cx.textBaseline = 'top';
    cx.fillStyle = 'rgba(20,14,30,.6)';
    const w = cx.measureText(text).width + 6;
    cx.fillRect(Math.round(x - w / 2), y - 1, Math.round(w), 9);
    cx.fillStyle = color || '#f0e8f8';
    cx.fillText(text, x, y);
  }

  // --- world
  const worldDrawables = WORLD.drawables();
  const windowLights = WORLD.windowLights();

  // Snap a logical coordinate to the nearest device pixel, so things move
  // in smooth screen-pixel steps instead of jumping a whole game pixel.
  const snap = (v) => Math.round(v * L.worldK) / L.worldK;

  // The camera is locked to the player's snapped position, so the player
  // stays perfectly still on screen while the town scrolls under them.
  function camera() {
    const M = curMap();
    const mw = M.MW * T, mh = M.MH * T + (S.inside ? 8 : 0);
    const half = (n) => Math.floor(n / 2) / L.worldK;
    if (view.cut) {
      const f = view.cut.focus || { x: S.px, y: S.py };
      const ax = L.landscape ? L.panelLeft / L.worldK / 2 : L.VW / 2;
      const ay = L.landscape ? L.VH / 2 : L.panelTop / L.worldK / 2 + 10;
      const cxw = mw <= L.VW ? (mw - L.VW) / 2 : clamp(f.x - ax, 0, mw - L.VW);
      const cyw = mh <= L.VH ? f.y - ay : clamp(f.y - ay, 0, mh - L.VH);
      return { x: snap(cxw), y: snap(cyw) };
    }
    return {
      x: snap(mw <= L.VW ? (mw - L.VW) / 2 : clamp(snap(S.px) - half(canvas.width), 0, mw - L.VW)),
      y: snap(mh <= L.VH ? (mh - L.VH) / 2 : clamp(snap(S.py) - 6 - half(canvas.height), 0, mh - L.VH)),
    };
  }

  function nightFactor(t) {
    if (t < 420) return clamp((420 - t) / 60, 0, 1) * 0.5;
    if (t < 1080) return 0;
    if (t < 1260) return (t - 1080) / 180;
    return 1;
  }
  function tintColor(t) {
    const n = nightFactor(t);
    const eve = t >= 960 && t < 1200 ? Math.sin(((t - 960) / 240) * Math.PI) : 0;
    let c = PX.mix('#ffffff', '#ffb894', eve * 0.6);
    c = PX.mix(c, '#4a5098', n * 0.85);
    return c;
  }

  function drawBubble(x, y, kind) {
    x = Math.round(x); y = Math.round(y);
    cx.fillStyle = '#2a1828';
    cx.fillRect(x - 5, y - 1, 11, 9);
    cx.fillStyle = '#ffffff';
    cx.fillRect(x - 4, y, 9, 7);
    cx.fillRect(x - 1, y + 7, 3, 1);
    cx.fillStyle = kind === 'girl' ? '#ff6b8a' : '#5a4a6c';
    if (kind === 'girl') { cx.fillRect(x - 2, y + 2, 2, 2); cx.fillRect(x + 1, y + 2, 2, 2); cx.fillRect(x - 1, y + 4, 3, 1); cx.fillRect(x, y + 5, 1, 1); }
    else { cx.fillRect(x, y + 1, 1, 3); cx.fillRect(x, y + 5, 1, 1); }
  }

  let target = null;

  // ---- weather particles (screen space, logical pixels)
  const wx = { drops: [], petals: [], flash: 0, nextBolt: 0 };
  function drawWeather(now, dt) {
    const w = S.weather;
    if (w === 'cloudy' || w === 'rain' || w === 'storm') {
      cx.globalCompositeOperation = 'multiply';
      cx.fillStyle = w === 'cloudy' ? '#d4d8e4' : w === 'rain' ? '#a8b0cc' : '#8890b0';
      cx.fillRect(0, 0, L.VW, L.VH);
      cx.globalCompositeOperation = 'source-over';
    }
    if (w === 'rain' || w === 'storm') {
      const want = Math.round((L.VW * L.VH) / (w === 'storm' ? 420 : 700));
      while (wx.drops.length < want) wx.drops.push({ x: Math.random() * (L.VW + 40), y: Math.random() * L.VH, v: 160 + Math.random() * 80 });
      cx.fillStyle = 'rgba(210,225,255,.55)';
      for (const d of wx.drops) {
        d.y += d.v * dt; d.x -= d.v * 0.25 * dt;
        if (d.y > L.VH) { d.y = -6; d.x = Math.random() * (L.VW + 40); }
        cx.fillRect(Math.round(d.x), Math.round(d.y), 1, 4);
      }
      if (w === 'storm') {
        if (now > wx.nextBolt) { wx.flash = 1; wx.nextBolt = now + 6000 + Math.random() * 9000; setTimeout(() => SFX.thunder(), 300 + Math.random() * 700); }
        if (wx.flash > 0) { cx.fillStyle = `rgba(255,255,255,${wx.flash * 0.55})`; cx.fillRect(0, 0, L.VW, L.VH); wx.flash -= dt * 2.5; }
      }
    } else wx.drops.length = 0;
    if (w === 'blossom') {
      const want = Math.round((L.VW * L.VH) / 900);
      while (wx.petals.length < want) wx.petals.push({ x: Math.random() * L.VW, y: Math.random() * L.VH, v: 14 + Math.random() * 14, p: Math.random() * 6 });
      cx.fillStyle = '#ffc6d8';
      for (const q of wx.petals) {
        q.y += q.v * dt; q.x += (Math.sin(now / 800 + q.p) * 10 - 6) * dt;
        if (q.y > L.VH) { q.y = -3; q.x = Math.random() * (L.VW + 20); }
        if (q.x < -4) q.x = L.VW + 2;
        cx.fillRect(Math.round(q.x), Math.round(q.y), 2, 1);
        cx.fillRect(Math.round(q.x) + 1, Math.round(q.y) + 1, 1, 1);
      }
    } else wx.petals.length = 0;
  }

  function drawWorld(now, dt) {
    const M = curMap();
    const town = M === WORLD;
    const cam = camera();
    cx.fillStyle = town ? '#3f8048' : '#1a1424';
    cx.fillRect(0, 0, L.VW, L.VH);
    cx.drawImage(M.staticCanvas(), -cam.x, -cam.y);

    if (town) {
      // sea shimmer
      cx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 14; i++) {
        const sx = (i * 61 + Math.floor(now / 90)) % (WORLD.MW * T);
        const sy = 37 * T + ((i * 23) % 44);
        if (sx > cam.x && sx < cam.x + L.VW && sy > cam.y && sy < cam.y + L.VH) cx.fillRect(sx - cam.x, sy - cam.y, 3, 1);
      }
    }

    if (M.spec && M.spec.scenery) drawScenery(M, cam, now);
    const list = [];
    if (M.spec && M.spec.traffic) list.push(...carsAt(M, now));
    for (const d of (town ? worldDrawables : M.drawables())) {
      if (d.x + d.img.width < cam.x || d.x > cam.x + L.VW || d.top > cam.y + L.VH || d.top + d.img.height < cam.y) continue;
      list.push(d);
    }
    const cut = view.cut;
    const actors = actorsHere();
    for (const a of actors) {
      if (cut && cut.actors[a.id]) continue;
      const fr = a.moving && mode === 'world' ? 1 + (Math.floor(a.dist / 6) % 2) : 0;
      const of = S.inside ? outfitFor(a.id, S.inside) : outfitFor(a.id, null, a.x, a.y);
      list.push({ y: a.y, img: WALKERS.get(a.id, a.dir, fr, of, wopts(a.id)), x: snap(a.x) - 8, top: snap(a.y) - 23, actor: true });
    }
    const pfr = player.moving ? 1 + (Math.floor(player.dist / 7) % 2) : 0;
    if (!(cut && cut.actors.player)) list.push({ y: S.py, img: WALKERS.get('player', S.dir, pfr, outfitFor('player', S.inside, S.px, S.py), wopts('player')), x: snap(S.px) - 8, top: snap(S.py) - 23, actor: true });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) {
      if (d.actor) {
        cx.fillStyle = 'rgba(20,10,30,.25)';
        cx.fillRect(d.x + 3 - cam.x, d.top + 22 - cam.y, 10, 2);
      }
      cx.drawImage(d.img, d.x - cam.x, d.top - cam.y);
    }
    if (cut) drawCut(cam, now);
    if (M.spec && M.spec.outdoor) {
      const tc = tintColor(S.time);
      if (tc !== '#ffffff') { cx.globalCompositeOperation = 'multiply'; cx.fillStyle = tc; cx.fillRect(0, 0, L.VW, L.VH); cx.globalCompositeOperation = 'source-over'; }
      for (const pr of M.spec.props) {
        if (!pr.sign) continue;
        const mx = pr.door * T + 8, my = (pr.y + pr.h) * T;
        if (Math.hypot(mx - S.px, my - S.py) > 44) continue;
        const open = !pr.enter || isOpen(pr.enter);
        drawLabel(pr.sign + (open ? '' : ' · closed'), mx - cam.x, my - cam.y - 30, open ? '#ffe9a8' : '#c8b8d8');
      }
    }
    if (!cut && view.dark > 0) drawDark();
    if (view.flash > 0) { cx.fillStyle = `rgba(255,255,255,${view.flash.toFixed(2)})`; cx.fillRect(0, 0, L.VW, L.VH); view.flash = Math.max(0, view.flash - dt * 2.5); }

    if (town) {
      // time-of-day grading and night lights
      const tc = tintColor(S.time);
      if (tc !== '#ffffff') {
        cx.globalCompositeOperation = 'multiply';
        cx.fillStyle = tc;
        cx.fillRect(0, 0, L.VW, L.VH);
        cx.globalCompositeOperation = 'source-over';
      }
      drawWeather(now, dt);
      const nf = Math.max(nightFactor(S.time), isWet() ? 0.35 : 0);
      if (nf > 0.05) {
        cx.globalCompositeOperation = 'lighter';
        cx.globalAlpha = nf * 0.55;
        cx.fillStyle = '#6a5020';
        for (const l of windowLights) cx.fillRect(l.x - cam.x, l.y - cam.y, l.w, l.h);
        for (const l of WORLD.LAMPS) {
          const x = l.x - cam.x, y = l.y - cam.y;
          if (x < -30 || x > L.VW + 30 || y < -30 || y > L.VH + 40) continue;
          const g = cx.createRadialGradient(x, y + 4, 1, x, y + 8, 26);
          g.addColorStop(0, 'rgba(255,220,140,.9)');
          g.addColorStop(1, 'rgba(255,200,120,0)');
          cx.fillStyle = g;
          cx.fillRect(x - 28, y - 22, 56, 60);
        }
        cx.globalAlpha = 1;
        cx.globalCompositeOperation = 'source-over';
      }
      // building labels near their doors
      for (const b of Object.values(WORLD.B)) {
        const mx = b.mat.x * T + 8, my = b.mat.y * T;
        if (Math.hypot(mx - S.px, my - S.py) > 44) continue;
        const open = !b.enter || isOpen(b.id);
        drawLabel(b.name + (b.enter && !open ? ' · closed' : ''), mx - cam.x, my - cam.y - 28, open ? '#ffe9a8' : '#c8b8d8');
      }
    }

    // girls standing together chat: little speech bubbles take turns
    if (!cut) {
      const idle = actors.filter((a) => !a.moving && !npcs[a.id].follow && S.girls[a.id].met);
      for (let i = 0; i < idle.length; i++) for (let j = i + 1; j < idle.length; j++) {
        const a = idle[i], b = idle[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) > 30) continue;
        const beat = Math.floor(now / 1400 + i * 3 + j);
        if (beat % 3 === 2) continue;
        const who = beat % 2 ? a : b;
        const kinds = ['note', 'dots', 'heart', '!', 'note', '?'];
        drawEmote(kinds[(beat + GIRL_ORDER.indexOf(who.id)) % kinds.length], who.x - cam.x, who.y - cam.y - 36);
      }
    }
    // names over nearby girls
    for (const a of actors) {
      if (view.cut || Math.hypot(a.x - S.px, a.y - S.py) > 70) continue;
      const known = S.girls[a.id].met;
      drawLabel(known ? GIRLS[a.id].name.toLowerCase() : '???', a.x - cam.x, a.y - cam.y - 34, known ? GIRLS[a.id].color : '#d8cce8');
    }
    if (target && mode === 'world') {
      const bob = Math.floor(now / 400) % 2;
      if (target.kind === 'girl') { const a = actors.find((q) => q.id === target.id); if (a) drawBubble(a.x - cam.x, a.y - cam.y - 45 - bob, 'girl'); }
      else if (target.pos) drawBubble(target.pos.x - cam.x, target.pos.y - cam.y - bob, 'obj');
    }
  }

  // --- scenes (interiors, dates, title)
  function drawSceneGirls(now) {
    const n = view.girls.length;
    const xs = n === 1 ? [72] : n === 2 ? [36, 108] : n === 3 ? [12, 72, 132] : [0, 48, 96, 144];
    view.girls.forEach((id, i) => {
      const x = xs[i];
      const bob = Math.floor(now / 650 + i * 0.5) % 2;
      cx.fillStyle = 'rgba(20,10,30,.28)';
      cx.fillRect(x + 14, 127, 20, 2);
      cx.fillRect(x + 16, 129, 16, 1);
      const expr = S && S.girls[id].gf ? 'love' : 'smile';
      cx.drawImage(SPRITES.get(id, expr, isBlinking(id, now)), x, 66 + bob);
      const known = !S || S.girls[id].met;
      drawLabel(known ? GIRLS[id].name.toLowerCase() : '???', x + 24, 133, known ? '#f0e8f8' : '#b9a9d0');
    });
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (mode === 'title' && view.titleRotate) { const k = Math.floor(now / 4500) % Math.ceil(GIRL_ORDER.length / 4); view.girls = GIRL_ORDER.slice(k * 4, k * 4 + 4); }
    const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
    frame.last = now;
    if (mode === 'world' && S) tick(dt);
    if (view.cut && S) updateCut(now, dt);

    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.imageSmoothingEnabled = false;
    const sceneT = () => cx.setTransform(L.sceneK, 0, 0, L.sceneK, L.sx, L.sy);
    if (view.scene === 'world' && S) {
      cx.setTransform(L.worldK, 0, 0, L.worldK, 0, 0);
      cx.imageSmoothingEnabled = false;
      drawWorld(now, dt);
      if (view.focus) { cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = 'rgba(24,16,36,.6)'; cx.fillRect(0, 0, canvas.width, canvas.height); }
      sceneT();
    } else {
      cx.fillStyle = '#1a1424';
      cx.fillRect(0, 0, canvas.width, canvas.height);
      sceneT();
      cx.drawImage(BACKGROUNDS.render(view.scene, view.t), 0, 0);
      const outdoorBlossom = view.scene === 'park' || view.scene === 'shrine';
      if (outdoorBlossom && view.petals.length < 18 && Math.random() < 0.08) view.petals.push({ x: Math.random() * BW, y: -4, s: Math.random() * 0.4 + 0.2, p: Math.random() * 6 });
      cx.fillStyle = '#ffc6d8';
      view.petals = view.petals.filter((p) => {
        p.y += p.s; p.x += Math.sin(now / 700 + p.p) * 0.3;
        cx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
        cx.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 1, 1, 1);
        return p.y < BH && outdoorBlossom;
      });
      if (!view.focus) drawSceneGirls(now);
    }

    if (view.focus) {
      const f = view.focus;
      const spr = SPRITES.get(f.id, f.expr, isBlinking(f.id, now), S ? girlOutfit(f.id) : null, wopts(f.id));
      const t = Math.min(1, (now - f.since) / 220);
      const bob = Math.floor(now / 700) % 2;
      cx.globalAlpha = t;
      cx.fillStyle = 'rgba(20,10,30,.25)';
      cx.fillRect(66, 140, 60, 3);
      cx.drawImage(spr, 48, 16 + bob + Math.round((1 - t) * 6), 96, 128);
      cx.globalAlpha = 1;
    }

    if (view.rain && Math.random() < 0.15) view.fx.push({ x: Math.random() * BW, y: -6, vy: 0.4 + Math.random() * 0.3, vx: 0, life: 2.2, rainy: true, delay: 0 });
    view.fx = view.fx.filter((p) => {
      if (p.delay > 0) { p.delay--; return true; }
      p.x += p.vx; p.y += p.vy; p.life -= p.rainy ? 0.004 : 0.012;
      cx.globalAlpha = clamp(p.life, 0, 1);
      cx.drawImage(p.sad ? sadHeartImg : heartImg, Math.round(p.x), Math.round(p.y));
      cx.globalAlpha = 1;
      return p.life > 0 && p.y < BH + 8;
    });
  }

  function setFocus(id, expr) {
    if (!id) { view.focus = null; return; }
    if (view.focus && view.focus.id === id) view.focus.expr = expr || view.focus.expr;
    else view.focus = { id, expr: expr || 'neutral', since: performance.now() };
  }

  // ============================================================ cutscenes
  // Short in-world animations: actors walk to spots and strike poses (sitting,
  // soaking, swimming, swinging…) while emotes, hearts, steam or splashes
  // play around them. Time and controls pause while one runs.
  const CUT_WALK = 60;
  const P = (tx, ty) => [tx * T + 8, ty * T + 12];

  function actorPos(id) {
    if (id === 'player') return { x: S.px, y: S.py, dir: S.dir };
    const n = npcs[id];
    if (n.follow) return { x: n.x, y: n.y, dir: n.dir };
    if (S.inside) return n.room ? { x: n.room.x, y: n.room.y, dir: n.room.dir } : { x: S.px + 14, y: S.py, dir: 'left' };
    return { x: n.x, y: n.y, dir: n.dir };
  }
  // Walking route between two pixel spots inside a room, around furniture
  // and through doorways. The last waypoint is the exact target (which may
  // be inside a bed, a tub or a shower stall).
  function route(from, to) {
    const M = curMap();
    if (M === WORLD) return [to];
    const a = tileOf(from[0], from[1]), b = tileOf(to[0], to[1]);
    const pts = (M.findPath(a.x, a.y, b.x, b.y) || []).map(([x, y]) => [x * T + 8, y * T + 12]);
    if (pts.length) pts.pop();
    pts.push(to);
    return pts;
  }
  const roomProp = (type) => (S.inside ? INTERIORS[S.inside].spec.props.find((q) => q.type === type) : null);
  const facing = (from, to) => (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? (to.x < from.x ? 'left' : 'right') : (to.y < from.y ? 'up' : 'down'));

  // c = { actors: { id: { path, start, pose, poseEnd, dir, dirEnd, speed, blanket } },
  //       dur, focus, after: [x, y] (where you stand afterwards),
  //       fx: [{ kind, x, y, w, h }], emotes: [{ who, kind, at, dur }],
  //       popups: [{ who, text, at, color }] }
  function cutscene(c) {
    return new Promise((resolve) => {
      const actors = {};
      for (const [id, a] of Object.entries(c.actors)) {
        const p = actorPos(id);
        const start = a.start || [p.x, p.y];
        actors[id] = { id, x: start[0], y: start[1], dir: a.dir || p.dir, pose: a.pose || null, path: (a.path || []).map((q) => q.slice()), poseEnd: a.poseEnd, dirEnd: a.dirEnd, speed: a.speed || CUT_WALK, dist: 0, blanket: a.blanket, outfit: a.outfit };
      }
      view.cut = Object.assign({ dur: 2000, fx: [], emotes: [], popups: [] }, c, { actors, t0: performance.now(), arrived: null, resolve, parts: [] });
      mode = 'busy';
      keys.clear(); releaseJoy();
      $('world-ui').hidden = true;
      $('panel').hidden = true;
      setFocus(null);
    });
  }
  function endCut() {
    const c = view.cut;
    view.cut = null;
    if (!c) return;
    // you stay where the scene left you, unless that's inside the bath or the sea
    const a = c.actors.player;
    if (c.after && S) { S.px = c.after[0]; S.py = c.after[1]; S.dir = 'down'; }
    else if (a && S && !solidAt(a.x, a.y) && outfitAt(S.inside, a.x, a.y) === outfitAt(S.inside, S.px, S.py)) { S.px = a.x; S.py = a.y; S.dir = a.dir; }
    if (c.resolve) c.resolve();
  }

  function updateCut(now, dt) {
    const c = view.cut;
    let moving = false;
    for (const a of Object.values(c.actors)) {
      if (!a.path.length) continue;
      moving = true;
      const [tx, ty] = a.path[0];
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), step = a.speed * dt;
      if (d > 0.5) a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      if (d <= step) { a.x = tx; a.y = ty; a.path.shift(); } else { a.x += (dx / d) * step; a.y += (dy / d) * step; }
      a.dist += step;
      if (!a.path.length) { if (a.poseEnd !== undefined) a.pose = a.poseEnd; if (a.dirEnd) a.dir = a.dirEnd; }
    }
    if (!moving && c.arrived === null) c.arrived = now;
    const since = c.arrived === null ? -1 : now - c.arrived;
    // particles
    for (const f of c.fx) {
      if (since < (f.at || 0)) continue;
      const rate = { steam: 0.25, hearts: 0.08, splash: 0.3, sparkle: 0.2, flowers: 0.25, stars: 0.15, ripple: 0.05, sweat: 0.05, bubbles: 0.3, shower: 0.7 }[f.kind] || 0.1;
      if (Math.random() < rate) {
        const x = f.x + (f.w ? Math.random() * f.w : (Math.random() - 0.5) * 10), y = f.y + (f.h ? Math.random() * f.h : 0);
        const P0 = { kind: f.kind, x, y, vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 10, life: 1 };
        if (f.kind === 'splash') { P0.vy = -25 - Math.random() * 15; P0.vx = (Math.random() - 0.5) * 30; }
        if (f.kind === 'flowers') { P0.vy = -20 - Math.random() * 20; P0.vx = (Math.random() - 0.5) * 30; }
        if (f.kind === 'stars') { P0.vx = 0; P0.vy = 0; }
        if (f.kind === 'ripple') { P0.vx = 0; P0.vy = 0; }
        if (f.kind === 'sweat') { P0.vy = 6; }
        if (f.kind === 'shower') { P0.vx = 0; P0.vy = 45 + Math.random() * 15; P0.life = 0.55; }
        c.parts.push(P0);
      }
    }
    c.parts = c.parts.filter((q) => {
      q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt * (q.kind === 'steam' ? 0.5 : 0.8);
      if (q.kind === 'splash' || q.kind === 'flowers') q.vy += 60 * dt;
      return q.life > 0;
    });
    if (c.arrived !== null && since >= c.dur && c.resolve) { const r = c.resolve; c.resolve = null; r(); }
  }

  function drawPosed(a, cam, now) {
    const moving = a.path.length > 0;
    let fr = moving ? 1 + (Math.floor(a.dist / 6) % 2) : 0;
    if (!moving && a.pose === 'swing') fr = 1 + (Math.floor(now / 170) % 2);
    if (!moving && a.pose === 'run') fr = 1 + (Math.floor(now / 90) % 2);
    const of = a.outfit || outfitFor(a.id, S.inside, a.x, a.y);
    const img = WALKERS.get(a.id, a.dir, fr, of, wopts(a.id));
    const x = snap(a.x) - 8 - cam.x, y = snap(a.y) - 23 - cam.y;
    const pose = moving ? null : a.pose;
    if (pose === 'sleep') {
      const head = WALKERS.get(a.id, 'down', 0, of, wopts(a.id));
      const breathe = Math.floor(now / 1300 + a.x) % 2;
      cx.drawImage(head, 0, 0, 16, 13, x, y, 16, 13);
      const c = a.blanket || '#6fa8e8';
      cx.fillStyle = c; cx.fillRect(x, y + 11 - breathe, 16, 33 + breathe);
      cx.fillStyle = PX.tint(c, 0.35); cx.fillRect(x, y + 11 - breathe, 16, 2);
      return;
    }
    if (pose === 'sofa') {
      const body = WALKERS.get(a.id, 'down', 0, of, wopts(a.id));
      const px = snap(a.x) - cam.x, py = snap(a.y) - 8 - cam.y;
      cx.save(); cx.translate(px, py); cx.rotate(-Math.PI / 2); cx.drawImage(body, -8, -12); cx.restore();
      cx.fillStyle = a.blanket || '#e8e0f0'; cx.fillRect(px - 2, py - 6, 14, 13);
      cx.fillStyle = '#ffffff'; cx.fillRect(px - 2, py - 6, 2, 13);
      return;
    }
    if (pose === 'bath' || pose === 'swim') {
      const bob = pose === 'swim' ? Math.round(Math.sin(now / 280 + a.x)) : Math.round(Math.sin(now / 900 + a.x) * 0.6);
      cx.drawImage(img, 0, 0, 16, 14, x, y + 9 + bob, 16, 14);
      cx.fillStyle = 'rgba(255,255,255,.75)';
      const w = Math.floor(now / 300) % 2;
      cx.fillRect(x - 1 + w, y + 22 + bob, 4, 1); cx.fillRect(x + 12 - w, y + 22 + bob, 4, 1);
      return;
    }
    cx.fillStyle = 'rgba(20,10,30,.25)';
    cx.fillRect(x + 3, y + 22, 10, 2);
    if (pose === 'sit' || pose === 'crouch') {
      const drop = pose === 'crouch' ? 5 : 3;
      cx.drawImage(img, 0, 0, 16, 18, x, y + drop, 16, 18);
      cx.drawImage(img, 0, 21, 16, 3, x, y + 18 + drop, 16, 3);
      return;
    }
    let lift = 0;
    if (pose === 'jump') lift = Math.abs(Math.round(Math.sin(now / 150) * 3));
    cx.drawImage(img, x, y - lift);
    if (pose === 'swing') {
      const up = fr === 1;
      const hx = a.dir === 'left' ? x + 3 : x + 13;
      const tipX = a.dir === 'left' ? hx - (up ? 4 : 7) : hx + (up ? 4 : 7);
      cx.fillStyle = '#c89a60';
      const steps = 6;
      for (let i = 0; i <= steps; i++) cx.fillRect(Math.round(hx + (tipX - hx) * i / steps), Math.round(y + 15 + ((up ? -10 : 6)) * i / steps), 1, 1);
    }
  }

  // Cars driving along the city road (two lanes, looping).
  const CAR_COLORS = ['#e05a4a', '#5a8ad8', '#f4c83a', '#f4f4f8', '#4aa070', '#2a2a36'];
  const carImgs = CAR_COLORS.map((c, i) => {
    const b = new PX.Buf(26, 14);
    b.rect(1, 3, 24, 8, c); b.rect(6, 0, 13, 5, c); b.rect(7, 1, 5, 3, '#a8d8f0'); b.rect(13, 1, 5, 3, '#a8d8f0');
    b.rect(24, 5, 2, 2, '#fff2b0'); b.rect(0, 5, 1, 2, '#e0303a');
    b.ellipse(6, 11, 2.5, 2.5, '#1a1a22'); b.ellipse(19, 11, 2.5, 2.5, '#1a1a22');
    if (i === 3) b.rect(1, 6, 24, 1, '#e05a4a');
    b.outline(0.5);
    return [b.toCanvas(1), (() => { const f = new PX.Buf(26, 14); for (let y = 0; y < 14; y++) for (let x = 0; x < 26; x++) f.d[y * 26 + (25 - x)] = b.d[y * 26 + x]; return f.toCanvas(1); })()];
  });
  function carsAt(M, now) {
    const road = M.spec.props.find((q) => q.type === 'road');
    const span = M.MW * T + 80, out = [];
    for (let i = 0; i < 4; i++) {
      const east = i % 2 === 0, speed = 46 + i * 7;
      const pos = ((now / 1000) * speed + i * 211) % span - 40;
      const x = east ? pos : M.MW * T - pos;
      const y = road.y * T + (east ? 30 : 12);
      out.push({ y, img: carImgs[i % carImgs.length][east ? 0 : 1], x: Math.round(x) - 13, top: y - 12 });
    }
    return out;
  }
  // Hills, houses and poles sliding past the train windows.
  function drawScenery(M, cam, now) {
    const off = now / 14;
    const sky = PX.mix('#9ad0f4', '#3a4078', nightFactor(S.time) * 0.8);
    for (const d of M.spec.wallDecor) {
      if (d.type !== 'trainwindow') continue;
      const x = d.x * T + 3 - cam.x, y = 6 - cam.y;
      cx.save();
      cx.beginPath(); cx.rect(x, y, 26, 14); cx.clip();
      cx.fillStyle = sky; cx.fillRect(x, y, 26, 14);
      for (let k = -1; k < 3; k++) {
        const hx = x + ((k * 40 - off * 0.4) % 80 + 80) % 80 - 26;
        cx.fillStyle = '#7ab87a'; cx.beginPath(); cx.ellipse(hx + 20, y + 15, 22, 7, 0, 0, Math.PI * 2); cx.fill();
      }
      for (let k = -1; k < 4; k++) {
        const bx = x + ((k * 23 - off) % 92 + 92) % 92 - 30;
        cx.fillStyle = ['#f4e6d0', '#e8d0d8', '#d8e4f4'][(k + 3) % 3]; cx.fillRect(bx, y + 7, 9, 7);
        cx.fillStyle = ['#c84a4a', '#5a7ad8', '#8a5a3a'][(k + 3) % 3]; cx.fillRect(bx - 1, y + 5, 11, 2);
      }
      const px = x + ((-off * 3) % 60 + 60) % 60 - 4;
      cx.fillStyle = '#5a5a6a'; cx.fillRect(px, y, 2, 14);
      cx.restore();
    }
  }

  function drawDark() {
    cx.fillStyle = `rgba(14,10,40,${view.dark.toFixed(3)})`;
    cx.fillRect(0, 0, L.VW, L.VH);
  }
  function fade(to, ms = 500) {
    return new Promise((resolve) => {
      const from = view.dark, t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        view.dark = from + (to - from) * k;
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      step();
    });
  }

  // Tiny speech-bubble emotes drawn above a character.
  const EMOTES = {
    heart: { c: '#ff6b8a', px: ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'] },
    '!': { c: '#e0303a', px: ['..x..', '..x..', '..x..', '.....', '..x..'] },
    '?': { c: '#3a6fd0', px: ['.xxx.', '...x.', '..x..', '.....', '..x..'] },
    note: { c: '#7a4ae0', px: ['..xxx', '..x.x', '..x..', 'xxx..', 'xx...'] },
    zzz: { c: '#5a6ab0', px: ['xxxx.', '..x..', '.x...', 'xxxx.', '.....'] },
    anger: { c: '#e0303a', px: ['x.x.x', '.....', 'x...x', '.....', 'x.x.x'] },
    dots: { c: '#5a4a6c', px: ['.....', '.....', 'x.x.x', '.....', '.....'] },
    sweat: { c: '#5ab8f0', px: ['..x..', '.xxx.', '.xxx.', '..x..', '.....'] },
  };
  function drawEmote(kind, x, y) {
    const e = EMOTES[kind] || EMOTES['!'];
    x = Math.round(x); y = Math.round(y);
    cx.fillStyle = '#2a1828'; cx.fillRect(x - 5, y - 1, 11, 9);
    cx.fillStyle = '#ffffff'; cx.fillRect(x - 4, y, 9, 7); cx.fillRect(x - 1, y + 7, 3, 1);
    cx.fillStyle = e.c;
    e.px.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'x') cx.fillRect(x - 2 + i, y + 1 + j, 1, 1); });
  }

  function drawCut(cam, now) {
    const c = view.cut;
    const list = Object.values(c.actors).sort((a, b) => a.y - b.y);
    for (const a of list) drawPosed(a, cam, now);
    for (const q of c.parts) {
      const x = q.x - cam.x, y = q.y - cam.y;
      cx.globalAlpha = clamp(q.life, 0, 1);
      if (q.kind === 'hearts') cx.drawImage(heartImg, Math.round(x) - 3, Math.round(y));
      else if (q.kind === 'steam') { cx.fillStyle = '#ffffff'; cx.fillRect(Math.round(x), Math.round(y), 3, 2); cx.fillRect(Math.round(x) + 1, Math.round(y) - 1, 2, 1); }
      else if (q.kind === 'splash') { cx.fillStyle = '#d8f0ff'; cx.fillRect(Math.round(x), Math.round(y), 1, 2); }
      else if (q.kind === 'sparkle' || q.kind === 'stars') { cx.fillStyle = Math.floor(now / 120 + q.x) % 2 ? '#ffffff' : '#ffe066'; cx.fillRect(Math.round(x), Math.round(y), 1, 1); cx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); cx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); }
      else if (q.kind === 'flowers') { cx.fillStyle = ['#ff6a9a', '#ffe066', '#ffffff', '#b070f0'][Math.floor(q.x) % 4]; cx.fillRect(Math.round(x), Math.round(y), 2, 2); }
      else if (q.kind === 'ripple') { cx.fillStyle = '#d8f0ff'; const r = Math.round((1 - q.life) * 6); cx.fillRect(Math.round(x) - r, Math.round(y), r * 2 + 1, 1); }
      else if (q.kind === 'shower') { cx.fillStyle = '#9ad8ff'; cx.fillRect(Math.round(x), Math.round(y), 1, 3); }
      else if (q.kind === 'bubbles') { cx.fillStyle = '#ff9ad0'; cx.fillRect(Math.round(x), Math.round(y), 2, 2); cx.fillStyle = '#ffffff'; cx.fillRect(Math.round(x), Math.round(y), 1, 1); }
      else if (q.kind === 'sweat') { cx.fillStyle = '#9ad8ff'; cx.fillRect(Math.round(x), Math.round(y), 1, 2); }
      cx.globalAlpha = 1;
    }
    if (view.dark > 0) drawDark();
    const since = c.arrived === null ? -1 : now - c.arrived;
    for (const e of c.emotes) {
      if (since < e.at || since > e.at + (e.dur || 1400)) continue;
      const a = c.actors[e.who];
      if (!a) continue;
      const sitDrop = a.pose === 'bath' || a.pose === 'swim' ? 9 : a.pose === 'sit' ? 3 : a.pose === 'sleep' ? 14 : a.pose === 'sofa' ? 16 : 0;
      drawEmote(e.kind, a.x - cam.x, a.y - cam.y - 36 + sitDrop - Math.floor((since - e.at) / 400) % 2);
    }
    for (const pp of c.popups) {
      if (since < pp.at || since > pp.at + 1600) continue;
      const a = c.actors[pp.who];
      if (!a) continue;
      drawLabel(pp.text, a.x - cam.x, a.y - cam.y - 46 - (since - pp.at) / 80, pp.color || '#ffe9a8');
    }
  }

  // ---- animations for activities (in town or inside a room)
  function nearestObj(type) {
    let best = null, bd = 1e9;
    for (const o of WORLD.objects) {
      if (o.type !== type) continue;
      const d = Math.hypot(o.x * T + 8 - S.px, o.y * T + 8 - S.py);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function activityCut(a, gainText) {
    const here = { x: S.px, y: S.py };
    const pop = gainText ? [{ who: 'player', text: gainText, at: 300 }] : [];
    const room = S.inside;
    switch (a.id) {
      case 'soak':
        if (room !== 'onsen') return null;
        return { actors: { player: { path: [P(5, 5), [88, 62]], poseEnd: 'bath', dirEnd: 'down' } }, focus: { x: 96, y: 56 }, dur: 2600, fx: [{ kind: 'steam', x: 52, y: 40, w: 88, h: 36 }], emotes: [{ who: 'player', kind: 'note', at: 400 }], popups: pop };
      case 'swim': {
        const tx = S.px, ty = 38 * T + 4;
        const c = { actors: { player: { path: [[tx, ty]], poseEnd: 'swim', dirEnd: 'down' } }, focus: { x: tx, y: ty - 16 }, dur: 2600, fx: [{ kind: 'splash', x: tx, y: ty - 6 }], emotes: [{ who: 'player', kind: 'note', at: 500 }], popups: pop };
        if (S.girls.nami.met && girlNearPlayer('nami', 140)) { c.actors.nami = { path: [[tx + 22, ty]], poseEnd: 'swim', dirEnd: 'left' }; c.emotes.push({ who: 'nami', kind: 'heart', at: 900 }); c.fx.push({ kind: 'splash', x: tx + 22, y: ty - 6 }); }
        return c;
      }
      case 'sunbathe': {
        const o = nearestObj('umbrella');
        if (!o) return null;
        const spot = [o.x * T + 22, o.y * T + 14];
        return { actors: { player: { path: [spot], poseEnd: 'sit', dirEnd: 'down' } }, focus: { x: spot[0], y: spot[1] - 10 }, dur: 2800, emotes: [{ who: 'player', kind: 'zzz', at: 700, dur: 2000 }], popups: pop };
      }
      case 'bench': case 'stars': {
        const o = nearestObj('bench');
        if (!o) return null;
        const spot = [o.x * T + 8, o.y * T + 14];
        const c = { actors: { player: { path: [[spot[0], spot[1] + 10], spot], poseEnd: 'sit', dirEnd: 'down' } }, focus: { x: spot[0], y: spot[1] - 24 }, dur: 2800, emotes: [{ who: 'player', kind: a.id === 'stars' ? 'heart' : 'note', at: 600 }], popups: pop, fx: [] };
        if (a.id === 'stars') c.fx.push({ kind: 'stars', x: spot[0] - 70, y: spot[1] - 90, w: 140, h: 50 });
        return c;
      }
      case 'fish': {
        const spot = P(67, 5);
        return { actors: { player: { path: [P(66, 6), P(67, 6), spot], poseEnd: 'sit', dirEnd: 'right' } }, focus: { x: spot[0] + 16, y: spot[1] - 8 }, dur: 3000, fx: [{ kind: 'ripple', x: 69 * T + 6, y: 5 * T + 8 }], emotes: [{ who: 'player', kind: 'dots', at: 200, dur: 1400 }, { who: 'player', kind: '!', at: 1800 }], popups: pop };
      }
      case 'train': {
        if (room !== 'dojo') return null;
        const c = { actors: { player: { path: [P(9, 4)], poseEnd: 'swing', dirEnd: 'right' } }, focus: { x: 150, y: 64 }, dur: 2600, fx: [{ kind: 'sparkle', x: 10 * T + 8, y: 4 * T + 2, at: 300 }], emotes: [{ who: 'player', kind: '!', at: 1300 }], popups: pop };
        return c;
      }
      case 'jog': {
        const s = [here.x, here.y];
        return { actors: { player: { path: [[s[0] + 40, s[1]], [s[0] + 40, s[1] + 28], [s[0] - 10, s[1] + 28], [s[0] - 10, s[1]], s], speed: 90, poseEnd: null } }, focus: { x: s[0] + 15, y: s[1] }, dur: 700, emotes: [{ who: 'player', kind: 'sweat', at: 0 }], popups: pop };
      }
      case 'flowerpick':
        return { actors: { player: { poseEnd: 'crouch', pose: 'crouch' } }, focus: here, dur: 2000, fx: [{ kind: 'flowers', x: here.x, y: here.y - 6 }], emotes: [{ who: 'player', kind: 'heart', at: 900 }], popups: [{ who: 'player', text: '+1 💐', at: 500 }] };
      case 'work': case 'serve': {
        if (room !== 'cafe' && room !== 'maidcafe') return null;
        return { actors: { player: { start: P(2, 2), path: [P(5, 2), P(2, 2), P(4, 2)], dirEnd: 'down' } }, focus: { x: 64, y: 56 }, dur: 700, emotes: [{ who: 'player', kind: 'note', at: 0 }], popups: pop };
      }
      case 'rhythm':
        return { actors: { player: { pose: 'jump', poseEnd: 'jump', dirEnd: 'up' } }, focus: here, dur: 2200, emotes: [{ who: 'player', kind: 'note', at: 0, dur: 2200 }], fx: [{ kind: 'sparkle', x: here.x, y: here.y - 30 }], popups: pop };
      case 'cook': {
        const st = roomProp('stove');
        if (!st) return null;
        const spot = [st.x * T + 8, (st.y + 1) * T + 12];
        return { actors: { player: { path: route([here.x, here.y], spot), dirEnd: 'up', speed: 100 } }, focus: { x: spot[0], y: spot[1] - 12 }, dur: 2600, fx: [{ kind: 'steam', x: st.x * T + 3, y: st.y * T - 8, w: 10, h: 2 }, { kind: 'sparkle', x: st.x * T + 8, y: st.y * T - 4, at: 1600 }], emotes: [{ who: 'player', kind: 'note', at: 300, dur: 1200 }, { who: 'player', kind: 'heart', at: 1700 }], popups: pop };
      }
      case 'shower': {
        const sh = roomProp('shower');
        if (!sh) return null;
        const spot = [sh.x * T + 8, (sh.y + 1) * T + 8];
        return { actors: { player: { path: route([here.x, here.y], spot), dirEnd: 'down', outfit: 'towel', speed: 100 } }, focus: { x: spot[0], y: spot[1] - 12 }, dur: 2600, after: [(sh.x + 1) * T + 8, (sh.y + 1) * T + 12], fx: [{ kind: 'shower', x: sh.x * T + 3, y: sh.y * T - 10, w: 10, h: 2 }, { kind: 'steam', x: sh.x * T + 2, y: sh.y * T - 6, w: 12, h: 10, at: 600 }], emotes: [{ who: 'player', kind: 'note', at: 500, dur: 1800 }], popups: pop };
      }
      case 'homebath': {
        const tb = roomProp('tub');
        if (!tb) return null;
        const spot = [tb.x * T + tb.w * 8, tb.y * T + 22];
        return { actors: { player: { path: route([here.x, here.y], spot), poseEnd: 'bath', dirEnd: 'down', outfit: 'towel', speed: 100 } }, focus: { x: spot[0], y: spot[1] - 12 }, dur: 2800, after: [tb.x * T - 8, (tb.y + tb.h) * T + 12], fx: [{ kind: 'steam', x: tb.x * T + 2, y: tb.y * T - 4, w: tb.w * T - 4, h: 16 }], emotes: [{ who: 'player', kind: 'zzz', at: 600, dur: 2000 }], popups: pop };
      }
      case 'rest': {
        const so = roomProp('sofa');
        if (!so) return null;
        const spot = [(so.x + so.w / 2) * T, so.y * T + 10];
        return { actors: { player: { path: route([here.x, here.y], spot), poseEnd: 'sofa', dirEnd: 'down', speed: 100 } }, focus: { x: spot[0], y: spot[1] - 12 }, dur: 2800, after: [(so.x + 1) * T + 8, (so.y + 1) * T + 12], emotes: [{ who: 'player', kind: 'zzz', at: 400, dur: 2200 }], popups: pop };
      }
      case 'study': case 'homestudy': case 'wfh': case 'readmagic': case 'puzzle': case 'tinker': case 'bakeclass':
        return { actors: { player: { dirEnd: S.dir } }, focus: here, dur: 2200, emotes: [{ who: 'player', kind: 'dots', at: 0, dur: 1200 }, { who: 'player', kind: '!', at: 1300 }], fx: a.id === 'readmagic' || a.id === 'tinker' ? [{ kind: 'sparkle', x: here.x, y: here.y - 26, at: 1200 }] : [], popups: pop };
      case 'claw': case 'vending': case 'fortune': case 'offer': case 'lighthouse': case 'clockview': case 'boutique':
        return { actors: { player: { dirEnd: S.dir, pose: a.id === 'boutique' ? 'jump' : null } }, focus: here, dur: 1600, emotes: [{ who: 'player', kind: a.id === 'claw' ? '!' : a.id === 'offer' ? 'heart' : 'note', at: 0 }], fx: a.id === 'boutique' || a.id === 'offer' ? [{ kind: 'sparkle', x: here.x, y: here.y - 24 }] : [], popups: pop };
      case 'omurice': case 'honeytoast': case 'coffee': case 'milk': case 'massage':
        return { actors: { player: { dirEnd: S.dir, pose: a.id === 'massage' ? 'sit' : null } }, focus: here, dur: 1600, emotes: [{ who: 'player', kind: 'heart', at: 0 }], popups: pop };
      default:
        return null;
    }
  }

  // ======================================================= player & input
  const player = { moving: false, dist: 0 };
  const keys = new Set();
  const joy = { id: null, x: 0, y: 0, ox: 0, oy: 0 }; // analog stick, x/y in -1..1
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (!$('modal').hidden) { if (e.key === 'Escape' && modalClosable) closeModal(); return; }
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); if (mode === 'world') e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter' || e.code === 'KeyE') {
      if (advance || typing) { e.preventDefault(); onAdvance(); }
      else if (mode === 'world') { e.preventDefault(); doInteract(); }
    }
    if (mode === 'world' && e.code === 'KeyM') openMap();
  });
  document.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); if (e.key === 'Shift') shiftRun = false; });
  // Running: hold Shift, or toggle the run button.
  let runToggle = false, shiftRun = false;
  const running = () => runToggle || shiftRun;
  document.addEventListener('keydown', (e) => { if (e.key === 'Shift') shiftRun = true; });
  $('btn-run').addEventListener('click', (e) => { e.stopPropagation(); runToggle = !runToggle; $('btn-run').classList.toggle('on', runToggle); $('btn-run').setAttribute('aria-pressed', String(runToggle)); SFX.click(); });
  window.addEventListener('blur', () => { keys.clear(); releaseJoy(); shiftRun = false; });

  // Floating joystick: press anywhere on the town view and drag.
  const JOY_R = 52;
  function releaseJoy() {
    joy.id = null; joy.x = 0; joy.y = 0;
    const j = $('joy');
    j.classList.remove('active');
    j.style.left = ''; j.style.top = '';
    $('knob').style.transform = '';
  }
  $('touch-layer').addEventListener('pointerdown', (e) => {
    if (mode !== 'world') return;
    e.preventDefault();
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
    $('touch-layer').setPointerCapture(e.pointerId);
    const j = $('joy');
    j.classList.add('active');
    j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px';
    $('joy-hint').hidden = true;
  });
  $('touch-layer').addEventListener('pointermove', (e) => {
    if (e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) { dx *= JOY_R / d; dy *= JOY_R / d; }
    joy.x = dx / JOY_R; joy.y = dy / JOY_R;
    $('knob').style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const endJoy = (e) => { if (e.pointerId === joy.id) releaseJoy(); };
  $('touch-layer').addEventListener('pointerup', endJoy);
  $('touch-layer').addEventListener('pointercancel', endJoy);
  $('touch-layer').addEventListener('contextmenu', (e) => e.preventDefault());

  function solidAt(x, y) { return curMap().isSolid(Math.floor(x / T), Math.floor(y / T)); }
  function blockedBox(x, y) {
    return solidAt(x - 5, y - 4) || solidAt(x + 5, y - 4) || solidAt(x - 5, y - 0.5) || solidAt(x + 5, y - 0.5);
  }

  function tick(dt) {
    // clock
    tick.acc = (tick.acc || 0) + dt * 1000;
    const before = Math.floor(S.time / 10);
    while (tick.acc >= MS_PER_MIN) { tick.acc -= MS_PER_MIN; S.time += 1; }
    if (Math.floor(S.time / 10) !== before) updateHud();
    if (S.time >= DAY_END) { passOut(); return; }

    // movement: keyboard (digital) or joystick (analog)
    let vx = 0, vy = 0;
    if (keys.has('left')) vx -= 1;
    if (keys.has('right')) vx += 1;
    if (keys.has('up')) vy -= 1;
    if (keys.has('down')) vy += 1;
    if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
    const jm = Math.hypot(joy.x, joy.y);
    if (!vx && !vy && jm > 0.2) { const k = Math.min(1, (jm - 0.2) / 0.6) / jm; vx = joy.x * k; vy = joy.y * k; }
    player.moving = vx !== 0 || vy !== 0;
    if (player.moving) {
      S.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      const step = WALK * (running() ? RUN : 1) * dt;
      const nx = S.px + vx * step, ny = S.py + vy * step;
      let moved = false;
      if (!blockedBox(nx, S.py)) { S.px = nx; moved = true; }
      if (!blockedBox(S.px, ny)) { S.py = ny; moved = true; }
      if (moved) {
        player.dist += step * Math.hypot(vx, vy);
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(last[0] - S.px, last[1] - S.py) > 2) { trail.push([S.px, S.py]); if (trail.length > 60) trail.shift(); }
      }
      // walk out through a room's doorway
      if (S.inside) {
        const room = INTERIORS[S.inside];
        if (S.py > room.MH * T + 3) { leaveBuilding(); return; }
      }
      // bump into a city storefront's door to go in
      if (S.inside && S.dir === 'up') {
        const ft = tileOf(S.px, S.py - 6);
        const pr = INTERIORS[S.inside].objectAt(ft.x, ft.y);
        if (pr && pr.type === 'storefront' && ft.x === pr.door && ft.y === pr.y + pr.h - 1 && Math.abs(S.px - (pr.door * T + 8)) < 7) { useProp(pr); return; }
      }
      // bump into a door to enter
      if (!S.inside && S.dir === 'up') {
        const ft = tileOf(S.px, S.py - 6);
        for (const b of Object.values(WORLD.B)) {
          if (ft.x === b.door && ft.y === b.y + b.h - 1 && Math.abs(S.px - (b.door * T + 8)) < 7) {
            enterBuilding(b.id);
            return;
          }
        }
      }
    }
    if (S.inside && S.inside !== 'home' && !isOpen(S.inside)) {
      toast(`${LOCATIONS[S.inside].name} is closing — time to head out.`, 'info');
      leaveBuilding();
      return;
    }
    updateNPCs(dt);
    if (cityDate && S.time >= 1380 && S.inside !== 'train') { lateTrain(); return; }
    if (maybeBanter()) return;
    if (lifeCheck()) return;
    if (checkEncounter()) return;
    const nt = findTarget();
    tick.promptAt = (tick.promptAt || 0) + dt;
    if (!sameTarget(nt, target) || tick.promptAt > 0.5) { target = nt; tick.promptAt = 0; updatePrompt(); }
  }

  function sameTarget(a, b) {
    if (!a || !b) return a === b;
    return a.kind === b.kind && a.key === b.key;
  }

  function findTarget() {
    const [dx, dy] = DIRV[S.dir];
    const fx = S.px + dx * 12, fy = S.py - 4 + dy * 10;
    let best = null, bd = S.inside ? 24 : 20;
    for (const a of actorsHere()) {
      if (npcs[a.id].follow) continue;
      const d = Math.min(Math.hypot(a.x - fx, a.y - 4 - fy), Math.hypot(a.x - S.px, a.y - S.py) + 4);
      if (d < bd) { bd = d; best = { kind: 'girl', id: a.id, key: a.id }; }
    }
    if (best) return best;
    const tx = Math.floor(fx / T), ty = Math.floor(fy / T);
    if (S.inside) {
      const room = INTERIORS[S.inside];
      const ptx = Math.floor(S.px / T), pty = Math.floor((S.py - 1) / T);
      if (S.dir === 'down' && ptx === room.door && pty === room.MH - 1) return { kind: 'exit', key: 'exit', pos: { x: room.door * T + 8, y: (room.MH - 1) * T - 14 } };
      const p = room.objectAt(tx, ty);
      if (p) return { kind: 'prop', p, key: 'prop' + p.act + tx + ',' + ty, pos: { x: tx * T + 8, y: Math.min(ty, p.y !== undefined ? p.y : 1) * T - 14 } };
      return null;
    }
    for (const b of Object.values(WORLD.B)) {
      if (tx === b.door && ty === b.y + b.h - 1) return { kind: 'door', id: b.id, key: 'door' + b.id, pos: { x: b.door * T + 8, y: (b.y + b.h - 1) * T - 4 } };
    }
    for (const o of WORLD.objects) {
      if (o.interact && o.x === tx && o.y === ty) return { kind: 'obj', o, key: 'obj' + o.x + ',' + o.y, pos: { x: o.x * T + 8, y: o.y * T - (o.type === 'fortune' ? 18 : 10) } };
    }
    const tile = WORLD.tiles[ty] && WORLD.tiles[ty][tx];
    if (tile === '~' && !(tx >= 36 && tx <= 37)) return { kind: 'sea', key: 'sea', pos: { x: tx * T + 8, y: ty * T - 6 } };
    if (tile === 'p') return { kind: WORLD.areaAt(tx, ty) === 'lake' ? 'lake' : 'pond', key: 'pond' + tx, pos: { x: tx * T + 8, y: ty * T - 6 } };
    return null;
  }

  function targetLabel(t) {
    if (!t) return '';
    if (t.kind === 'girl') return S.girls[t.id].met ? `Talk to ${GIRLS[t.id].name}` : `Talk to ${GIRLS[t.id].stranger}`;
    if (t.kind === 'exit') return 'Go outside';
    if (t.kind === 'prop') return t.p.label;
    if (t.kind === 'door') {
      const b = WORLD.B[t.id];
      if (!b.enter) return b.name;
      return isOpen(t.id) ? `Enter ${b.name}` : `${b.name} (closed)`;
    }
    if (t.kind === 'obj') {
      const o = t.o;
      if (o.interact === 'sign') return 'Read sign';
      if (o.interact === 'bench') return S.time >= 1260 ? 'Stargaze from the bench' : 'Sit on the bench';
      if (o.interact === 'swim') return 'Go for a swim';
      return o.label;
    }
    if (t.kind === 'sea') return 'Go for a swim';
    if (t.kind === 'pond') return 'Look at the pond';
    if (t.kind === 'lake') return 'Sit by the lake';
    return '';
  }

  // A girl you know sometimes comes up to you when you cross paths in town.
  function checkEncounter() {
    if (S.inside) return false;
    for (const a of actorsHere()) {
      const g = S.girls[a.id];
      if (!g.met || g.aff < 10 || npcs[a.id].follow || S.daily['enc_' + a.id]) continue;
      if (Math.hypot(a.x - S.px, a.y - S.py) > 40) continue;
      S.daily['enc_' + a.id] = true;
      if (Math.random() < 0.4) { encounter(a.id); return true; }
    }
    return false;
  }
  async function encounter(id) {
    busy();
    const n = npcs[id];
    const dx = S.px - n.x, dy = S.py - n.y;
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    S.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'right' : 'left') : (dy < 0 ? 'down' : 'up');
    showRel(id);
    const side = n.x < S.px ? -1 : 1;
    await cutscene({ actors: { [id]: { path: [[S.px + side * 14, S.py]], speed: 80, dirEnd: side < 0 ? 'right' : 'left' }, player: { dirEnd: side < 0 ? 'left' : 'right' } }, focus: { x: S.px, y: S.py }, dur: 600, emotes: [{ who: id, kind: '!', at: 0, dur: 900 }] });
    n.x = S.px + side * 14; n.y = S.py;
    endCut();
    const e = rand(GIRLS[id].encounters);
    await play(id, e.lines);
    if (e.item) { S.inv[e.item] = (S.inv[e.item] || 0) + 1; toast(`Got ${ITEMS[e.item].icon} ${ITEMS[e.item].name}`, 'info'); }
    addAff(id, 2);
    await wait(250);
    resume();
  }

  // ========================================================== toast & HUD
  function toast(msg, kind = 'info') {
    const t = el('div', 'toast-item ' + kind, msg);
    $('toast').appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }

  function updateHud() {
    if (!S) return;
    $('hud').hidden = false;
    $('hud-day').textContent = dayLabel();
    $('hud-money').textContent = '¥' + S.money;
    $('hud-energy').style.width = clamp(S.energy, 0, 100) + '%';
    $('hud-energy-num').textContent = S.energy;
    $('hud-stats').innerHTML = `<span>✨<b>${S.stats.charm}</b></span><span>📖<b>${S.stats.smarts}</b></span><span>💪<b>${S.stats.fitness}</b></span>`;
    lifeUpdate();
    const nd = $('hud-needs');
    nd.hidden = !lifeOn();
    if (lifeOn()) nd.innerHTML = needsHtml();
    autosave();
  }

  function heartsHtml(g) {
    const n = g.gf ? 10 : Math.floor(g.aff / 10);
    let s = '';
    for (let i = 0; i < 10; i++) s += i < n ? '♥' : '<span class="off">♥</span>';
    return s;
  }

  function showRel(id) {
    const rb = $('relbar');
    if (!id) { rb.hidden = true; return; }
    const g = S.girls[id];
    rb.hidden = false;
    rb.innerHTML = `<span style="color:${GIRLS[id].color}">${GIRLS[id].name}</span><span class="hearts">${heartsHtml(g)}</span><span>${stageOf(g)}</span>`;
  }

  // ============================================================== dialogue
  let advance = null;
  let typing = null;

  function onAdvance() {
    if (typing) { typing.finish(); return; }
    if (advance) { const a = advance; advance = null; SFX.click(); a(); }
  }
  $('dialog').addEventListener('click', onAdvance);
  canvas.addEventListener('click', onAdvance);

  function showLine(speaker, text, opts = {}) {
    $('dialog').hidden = false;
    $('world-ui').hidden = true;
    $('panel').hidden = false;
    const sp = $('speaker');
    const tx = $('text');
    if (speaker === 'p') { sp.textContent = S.name; sp.style.color = '#ffd36b'; tx.className = ''; }
    else if (speaker && speaker !== 'n') { sp.textContent = GIRLS[speaker].name; sp.style.color = GIRLS[speaker].color; tx.className = ''; }
    else { sp.textContent = ''; tx.className = 'narration'; }
    const full = fmt(text);
    $('next').classList.remove('show');
    return new Promise((resolve) => {
      let i = 0;
      let timer = null;
      const done = () => {
        clearInterval(timer);
        tx.textContent = full;
        typing = null;
        if (opts.wait === false) { resolve(); return; }
        $('next').classList.add('show');
        advance = () => { $('next').classList.remove('show'); resolve(); };
      };
      typing = { finish: done };
      tx.textContent = '';
      timer = setInterval(() => {
        i += 1;
        tx.textContent = full.slice(0, i);
        if (i % 3 === 0 && full[i] !== ' ') SFX.blip();
        if (i >= full.length) done();
      }, 18);
    });
  }

  async function play(gid, lines, holdLast = false) {
    for (let k = 0; k < lines.length; k++) {
      const [e, text] = lines[k];
      const last = holdLast && k === lines.length - 1;
      if (e === 'n' || e === 'p') await showLine(e, text, { wait: !last });
      else { setFocus(gid, e); await showLine(gid, text, { wait: !last }); }
    }
  }
  const narrate = (text, hold) => showLine('n', text, { wait: !hold });

  function clearMenu() { $('menu').innerHTML = ''; }

  function button({ icon = '', label, note = '', onClick, disabled = false, cls = '', color }) {
    const b = el('button', 'btn ' + cls);
    b.innerHTML = `<span class="ico">${icon}</span><span class="lbl">${label}</span>${note ? `<span class="note">${note}</span>` : ''}`;
    b.disabled = disabled;
    if (color) b.style.setProperty('--gc', color);
    b.addEventListener('click', (e) => { e.stopPropagation(); SFX.click(); onClick && onClick(); });
    return b;
  }

  function choose(options) {
    clearMenu();
    return new Promise((resolve) => {
      options.forEach((o, i) => {
        $('menu').appendChild(button({ icon: o.icon || '▸', label: esc(fmt(o.t)), note: o.note || '', cls: 'choice', disabled: o.disabled, onClick: () => { clearMenu(); resolve(i); } }));
      });
    });
  }

  // ================================================================ life
  // Life mode, Sims-style: you get hungry, need the toilet, get grubby and
  // bored, and pay rent every Monday. Starve or run out of energy and your
  // health drops; collapse and the clinic bills you (collapse while broke,
  // or miss rent three weeks running, and it's game over). Each girl has a
  // job, savings, rent and a hobby to pay for, plus hunger, energy and fun
  // that steer her day. Pacifist mode switches all of it off.
  const lifeOn = () => !!(S && S.life && !S.pacifist);
  const NEEDS = [['hunger', '🍔', 'Hunger'], ['bladder', '🚽', 'Bladder'], ['hygiene', '🧼', 'Hygiene'], ['fun', '🎉', 'Fun'], ['health', '💗', 'Health']];
  const WARN = {
    hunger: "🍔 Your stomach is growling. Eat something!", bladder: '🚽 You really need a toilet!', hygiene: '🧼 You could really use a shower.',
    fun: "🎉 You're bored stiff. Do something fun!", health: "💗 You don't feel well... eat properly and rest!",
  };
  const RENT = 100, HOSPITAL = 150, GROCERIES = 24;
  const FOOD_PLACES = ['cafe', 'bakery', 'maidcafe'];
  const FUN_PLACES = ['arcade', 'park', 'beach', 'flowers', 'cape', 'lake', 'plaza', 'mall', 'onsen'];
  let lifeCheckpoint = null; // this morning's state, for "retry"
  const nowMin = () => S.day * 1440 + S.time;
  function newLife() { return { hunger: 90, bladder: 90, hygiene: 90, fun: 80, health: 100, groceries: 3, overdue: 0, warned: {}, last: 0, drain: 0, over: null }; }
  function girlLife(id) { return { money: LIFE[id].start, hunger: 80, energy: 80, fun: 70, earned: 0, eating: false, resting: false }; }

  function applyLife(fx) {
    if (!lifeOn() || !fx) return;
    for (const [k, v] of Object.entries(fx)) S.life[k] = clamp(S.life[k] + v, 0, 100);
  }

  // Needs drain as the clock runs (walking around, activities, dates...).
  function lifeUpdate() {
    if (!S || !S.life) return;
    const L = S.life, t = nowMin();
    if (!L.last || t < L.last || t - L.last > 600) { L.last = t; return; }
    const d = t - L.last;
    if (d <= 0) return;
    L.last = t;
    if (!lifeOn()) return;
    L.hunger = clamp(L.hunger - 0.09 * d, 0, 100);
    L.bladder = clamp(L.bladder - 0.16 * d, 0, 100);
    L.hygiene = clamp(L.hygiene - 0.035 * d, 0, 100);
    L.fun = clamp(L.fun - 0.06 * d, 0, 100);
    if (L.hunger <= 0) L.health -= 0.15 * d;
    if (S.energy <= 0) L.health -= 0.1 * d;
    if (L.hunger > 40 && S.energy > 20) L.health += 0.03 * d;
    L.health = clamp(L.health, 0, 100);
    if (L.hunger < 15) { L.drain += 0.03 * d; if (L.drain >= 1) { S.energy = clamp(S.energy - Math.floor(L.drain), 0, 100); L.drain %= 1; } }
    girlsLife(d);
  }

  // The girls' day: work earns money, home restores energy, food places
  // and mealtimes at home fill them up, fun places (and you) cheer them up.
  function girlsLife(d) {
    for (const id of GIRL_ORDER) {
      const n = npcs[id], G = S.girls[id].life, J = LIFE[id];
      if (!n || !G) continue;
      const place = n.follow ? 'party' : n.goal;
      const home = place === homeOf(id), working = place === J.work, meal = (S.time >= 420 && S.time < 500) || (S.time >= 1140 && S.time < 1260);
      if (working && G.earned < J.wage * 1.5) { const pay = Math.min(J.wage / 240 * d, J.wage * 1.5 - G.earned); G.money += pay; G.earned += pay; }
      G.energy += (home ? 0.4 : working ? -0.08 : -0.05) * d;
      G.hunger += (FOOD_PLACES.includes(place) || (home && meal) ? 1.2 : -0.07) * d;
      G.fun += (FUN_PLACES.includes(place) || place === 'party' ? 0.6 : working ? -0.04 : -0.03) * d;
      for (const k of ['energy', 'hunger', 'fun']) G[k] = clamp(G[k], 0, 100);
      if (G.hunger < 25) G.eating = true; else if (G.hunger > 85) G.eating = false;
      if (G.energy < 15) G.resting = true; else if (G.energy > 75) G.resting = false;
    }
  }
  // Life changes a girl's plans: hungry → a café, exhausted → home, broke → extra shifts.
  function lifeGoal(id) {
    if (!lifeOn() || !S.girls[id].life) return null;
    const G = S.girls[id].life;
    if (G.eating) { const f = FOOD_PLACES.find((p) => isOpen(p)); if (f) return f; }
    if (G.resting) return homeOf(id);
    const w = LIFE[id].work;
    if (G.money < 0 && w && isOpen(w) && S.time >= 480 && S.time < 1260) return w;
    return null;
  }
  function girlMood(id) {
    const G = S.girls[id].life;
    if (!lifeOn() || !G) return 'okay';
    let m = (G.hunger + G.energy + G.fun) / 3;
    if (G.money < 0) m -= 30;
    return m >= 65 ? 'happy' : m < 35 ? 'stressed' : 'okay';
  }
  const MOOD = { happy: '😊 Happy', okay: '🙂 Okay', stressed: '😟 Stressed' };

  // Overnight: sleep restores you, then the bills come in.
  function lifeMorning(news) {
    if (!S.life) return;
    const L = S.life;
    L.last = nowMin();
    if (!lifeOn()) return;
    L.hunger = clamp(L.hunger - 15, 0, 100); L.bladder = 30; L.hygiene = clamp(L.hygiene - 10, 0, 100);
    L.fun = clamp(L.fun + 10, 0, 100); L.health = clamp(L.health + 20, 0, 100);
    if (L.overdue > 0 && S.money >= RENT * L.overdue) {
      S.money -= RENT * L.overdue;
      news.push({ text: `🏠 You paid ¥${RENT * L.overdue} of overdue rent. The landlord is relieved.`, kind: 'info' });
      L.overdue = 0;
    }
    if (dow() === 0 && S.day > 1) {
      if (S.money >= RENT) { S.money -= RENT; news.push({ text: `🏠 Rent day: ¥${RENT} paid.`, kind: 'info' }); }
      else {
        L.overdue += 1;
        chatPush('landlord', { text: `🏠 Landlord: Rent is overdue (${L.overdue} week${L.overdue > 1 ? 's' : ''}). ${L.overdue >= 2 ? 'One more and you are OUT.' : 'Please pay soon.'}` });
        news.push({ text: `🏠 You couldn't pay rent! Overdue: ${L.overdue}/3 weeks.`, kind: 'bad', sfx: true });
      }
    }
    for (const id of GIRL_ORDER) {
      const G = S.girls[id].life, J = LIFE[id];
      if (!G) continue;
      G.money -= 15 + J.hobby[1] + J.rent / 7;
      if (J.dividend) G.money += J.dividend;
      if (J.gamble) G.money += Math.round((Math.random() - 0.45) * 60);
      G.money = Math.round(G.money);
      G.earned = 0;
      G.energy = clamp(G.energy + 50, 0, 100); G.hunger = clamp(G.hunger - 10, 0, 100);
      if (G.money < 0 && S.girls[id].met && Math.random() < 0.5) news.push({ text: `💸 ${GIRLS[id].name} is short on money and picking up extra shifts.`, kind: 'info' });
    }
  }

  // Checked while you walk around: accidents, collapsing, warnings.
  function lifeCheck() {
    if (!lifeOn() || mode !== 'world') return false;
    const L = S.life;
    if (L.over) { gameOver(L.over); return true; }
    if (L.health <= 0) { collapse(); return true; }
    if (L.bladder <= 0) { accident(); return true; }
    for (const [k] of NEEDS) {
      if (L[k] < 20 && !L.warned[k]) { L.warned[k] = true; toast(WARN[k], 'bad'); }
      else if (L[k] > 40) L.warned[k] = false;
    }
    return false;
  }

  async function useToilet() {
    busy();
    if (!lifeOn()) { await narrate(rand(['...You take care of business. Moving on.', 'The toilet lid is down. As it should be.'])); resume(); return; }
    await cutscene({ actors: { player: { dirEnd: S.dir } }, focus: { x: S.px, y: S.py - 10 }, dur: 900, emotes: [{ who: 'player', kind: 'dots', at: 0, dur: 500 }, { who: 'player', kind: 'note', at: 500, dur: 500 }] });
    S.life.bladder = 100;
    endCut();
    toast('🚽 Ahh, much better.', 'good');
    S.time += 5;
    updateHud();
    resume();
  }

  async function accident() {
    busy();
    const p = party();
    await cutscene({ actors: { player: { pose: 'crouch', dirEnd: 'down' } }, focus: { x: S.px, y: S.py - 10 }, dur: 1000, emotes: [{ who: 'player', kind: 'sweat', at: 0, dur: 1000 }], fx: [{ kind: 'sweat', x: S.px, y: S.py - 26 }] });
    await narrate("Oh no... You couldn't hold it any longer. 😳 You need a shower and a change of clothes, fast.");
    Object.assign(S.life, { bladder: 100, hygiene: 0, fun: Math.max(0, S.life.fun - 25) });
    for (const k of p) { await play(k, [vary(k, 'oops')]); addAff(k, -5); }
    endCut();
    updateHud();
    resume();
  }

  async function collapse() {
    busy();
    clearMenu();
    for (const k of party()) endFollow(k, `${GIRLS[k].name} rushes off to call for help.`);
    await narrate('Your vision blurs. Your legs give out... You collapse.');
    if (S.money <= 0) { await gameOver('collapsed'); return; }
    S.money -= HOSPITAL;
    await narrate(`You wake up in Sakuragaoka Clinic. "Eat properly and get some rest," the doctor scolds. (Hospital bill: ¥${HOSPITAL})`);
    Object.assign(S.life, { health: 40, hunger: Math.max(S.life.hunger, 60), bladder: 80 });
    await newDay(60);
  }

  const OVER = {
    evicted: ['🏚️ Evicted', "Three weeks of unpaid rent. The landlord changes the locks, and your life in Sakuragaoka is over."],
    collapsed: ['💀 Game Over', "You collapsed with no money for the clinic. Nobody found you in time... Your life in Sakuragaoka is over."],
  };
  async function gameOver(cause) {
    busy();
    clearMenu();
    S.life.over = cause;
    autosave(true);
    const [title, text] = OVER[cause] || OVER.collapsed;
    const gfs = GIRL_ORDER.filter((k) => S.girls[k].gf);
    openModal(title, (body) => {
      const box = el('div', 'ending');
      box.appendChild(el('h2', '', title));
      box.appendChild(el('p', '', esc(text)));
      box.appendChild(el('p', '', `<span style="color:#b9a9d0">You lived ${S.day} day${S.day > 1 ? 's' : ''} in Sakuragaoka${gfs.length ? ` · girlfriends: ${esc(namesOf(gfs))}` : ''}.</span>`));
      if (lifeCheckpoint) box.appendChild(button({ icon: '↺', label: 'Try again from this morning', cls: 'primary', onClick: () => { S = migrate(JSON.parse(lifeCheckpoint)); S.life.over = null; S.life.last = 0; initNPCs(); closeModal(); autosave(true); resume(); toast('↺ Back to this morning. Take better care of yourself!', 'info'); } }));
      box.appendChild(button({ icon: '🕊️', label: 'Keep playing in Pacifist mode', onClick: () => {
        S.pacifist = true;
        Object.assign(S.life, { over: null, overdue: 0, health: 100, hunger: 80, bladder: 80, hygiene: 80, fun: 80 });
        S.money = Math.max(S.money, 0);
        closeModal(); autosave(true); newDay(100); toast('🕊️ Pacifist mode: no needs, no rent. Live happily!', 'good');
      } }));
      box.appendChild(button({ icon: '🏠', label: 'Back to title', onClick: () => { modalReturn = null; closeModal(); title(); } }));
      body.appendChild(box);
    }, false);
  }

  // Helping her out (life mode): lend money, or buy her a snack.
  async function lendMoney(id) {
    clearMenu();
    S.money -= 50; S.girls[id].life.money += 50; SFX.coin(); updateHud();
    await play(id, [LIFE[id].broke]);
    addAff(id, 4);
    renderGirlMenu(id);
  }
  async function treatSnack(id) {
    clearMenu();
    S.money -= 15; SFX.coin();
    const G = S.girls[id].life;
    G.hunger = clamp(G.hunger + 45, 0, 100); G.fun = clamp(G.fun + 5, 0, 100); G.eating = false;
    updateHud();
    await play(id, [LIFE[id].hungry]);
    addAff(id, 3);
    renderGirlMenu(id);
  }

  function needsHtml() {
    return NEEDS.map(([k, icon, name]) => { const v = Math.round(S.life[k]); return `<span class="need${v < 20 ? ' low' : v < 45 ? ' mid' : ''}" title="${name} ${v}%">${icon}<span class="bar"><span style="width:${v}%"></span></span></span>`; }).join('');
  }

  // ============================================================ affection
  // o.ignoreCap: the love potion pushes past the date-based limits.
  function addAff(id, v, o = {}) {
    const g = S.girls[id];
    const beforeStage = stageOf(g);
    const before = g.aff;
    let gain = v;
    if (v > 0) gain += S.stats.charm >= 60 ? 2 : S.stats.charm >= 30 ? 1 : 0;
    if (v > 0 && lifeOn()) {
      if (S.life.hygiene < 25) { gain = Math.max(1, Math.ceil(gain / 2)); if (!S.daily.smelly) { S.daily.smelly = true; setTimeout(() => toast(`😷 ${GIRLS[id].name} noticed you haven't showered...`, 'bad'), 900); } }
      const mood = girlMood(id);
      if (mood === 'happy') gain += 1; else if (mood === 'stressed') gain = Math.max(1, gain - 1);
    }
    const cap = o.ignoreCap ? 100 : capOf(g);
    g.aff = clamp(g.aff + gain, 0, Math.max(cap, before));
    const delta = g.aff - before;
    if (delta > 0) {
      SFX.heart();
      spawnHearts(Math.min(6, 1 + Math.ceil(delta / 2)));
      toast(`${GIRLS[id].name} ♥ +${delta}`, 'good');
    } else if (delta < 0) {
      SFX.sad();
      spawnHearts(2, true);
      toast(`${GIRLS[id].name} ♥ ${delta}`, 'bad');
    }
    if (v > 0 && g.aff >= cap && cap < 100 && before + gain > cap) {
      toast(g.dates === 0 ? `Ask ${GIRLS[id].name} on a date to grow closer!` : `More dates with ${GIRLS[id].name} will deepen your bond.`, 'info');
    }
    autosave();
    const afterStage = stageOf(g);
    if (afterStage !== beforeStage && delta > 0) setTimeout(() => toast(`${GIRLS[id].name} now sees you as: ${afterStage}!`, 'good'), 600);
    showRel(id);
  }

  async function runChoice(gid, opts) {
    const order = opts.map((o, i) => i).sort(() => Math.random() - 0.5);
    const pick = await choose(order.map((i) => ({ t: opts[i].t })));
    const o = opts[order[pick]];
    await showLine('p', o.t);
    await play(gid, o.r);
    addAff(gid, o.v);
  }

  // ================================================================= time
  function spend(energy = 0, money = 0) {
    S.energy = clamp(S.energy - energy, 0, 100);
    S.money -= money;
    updateHud();
  }

  // Jump the clock forward (activities, talks, dates). Returns false if the
  // day ended because of it.
  async function advanceTime(mins) {
    S.time += mins;
    if (S.time >= DAY_END) { await passOut(); return false; }
    syncNPCs();
    updateHud();
    if (S.inside && S.inside !== 'home' && !isOpen(S.inside)) {
      toast(`${LOCATIONS[S.inside].name} is closing.`, 'info');
      const e = exitOf(S.inside);
      S.inside = e.inside;
      S.px = e.x; S.py = e.y; S.dir = 'down';
      placeCompanion();
    }
    for (const id of GIRL_ORDER) if (npcs[id].follow && S.time >= npcs[id].follow.until) endFollow(id);
    return true;
  }

  async function passOut() {
    busy();
    clearMenu();
    if (S.inside === 'home') { await narrate('You fall asleep at your desk...'); await newDay(100); return; }
    const lost = Math.min(S.money, Math.floor(S.money * 0.1));
    S.money -= lost;
    await narrate(`It's 2am... You collapse from exhaustion. Someone kindly carries you home.${lost ? ` (Lost ¥${lost})` : ''}`);
    await newDay(70);
  }

  async function newDay(energy = 100, opt = {}) {
    endCut();
    lifeUpdate();
    mode = 'busy';
    S.day += 1;
    S.time = DAY_START;
    S.energy = energy;
    S.daily = {};
    S.weather = S.forecast || 'sunny';
    S.forecast = rollWeather();
    S.inside = 'home';
    const wake = INTERIORS.home.wake;
    S.px = wake[0] * T + 8; S.py = wake[1] * T + 12; S.dir = 'down';
    if (opt.at) { S.inside = opt.at.inside; S.px = opt.at.x; S.py = opt.at.y; }
    const news = morningNews();
    lifeMorning(news);
    initNPCs();
    if (S.life && lifeOn() && S.life.overdue >= 3) S.life.over = 'evicted';
    lifeCheckpoint = S.life && !S.life.over ? JSON.stringify(S) : null;
    updateHud();
    autosave(true);
    SFX.day();
    const card = $('daycard');
    card.hidden = false;
    const W = WEATHER[S.weather];
    card.innerHTML = `Day ${S.day}<small>${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dow()]} · 6:00am · ${W.icon} ${W.name}</small>`;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    setTimeout(() => { card.hidden = true; }, 1600);
    await wait(900);
    if (opt.morning) { await opt.morning(); if (!S) return; }
    view.dark = 0;
    enterWorld();
    news.forEach((n, i) => setTimeout(() => { toast(n.text, n.kind); if (n.sfx) SFX.msg(); }, 900 + i * 900));
  }

  // Missed meet-ups, new invitations by text, and birthdays.
  function morningNews() {
    const news = [];
    const msg = (from, text) => chatPush(from, { text });
    for (const v of S.invites || []) {
      if (v.done) continue;
      const g = S.girls[v.id];
      g.aff = clamp(g.aff - 4, 0, 100);
      msg(v.id, GIRLS[v.id].inviteMissed);
      news.push({ text: `📱 ${GIRLS[v.id].name} sent a message...`, kind: 'bad', sfx: true });
    }
    S.invites = [];
    const candidates = GIRL_ORDER.filter((id) => S.girls[id].met && S.girls[id].aff >= 30).sort(() => Math.random() - 0.5);
    for (const id of candidates.slice(0, 2)) {
      if (Math.random() > 0.4) continue;
      const G = GIRLS[id];
      let place = rand(G.invitePlaces);
      if (isWet() && RAIN_SHELTER[place]) place = RAIN_SHELTER[place];
      const start = (14 + Math.floor(Math.random() * 4)) * 60;
      S.invites.push({ id, place, start, end: start + 120, done: false });
      msg(id, fmt(G.invite.replace('{place}', placeName(place)).replace('{time}', clockStr(start))));
      news.push({ text: `📱 New message from ${G.name}!`, kind: 'good', sfx: true });
    }
    for (const id of GIRL_ORDER) if (S.girls[id].met && isBirthday(id)) news.push({ text: `🎂 It's ${GIRLS[id].name}'s birthday today!`, kind: 'good' });
    if (WEATHER[S.weather].wet) news.push({ text: `${WEATHER[S.weather].icon} ${WEATHER[S.weather].name} today — everyone will be indoors.`, kind: 'info' });
    if (S.weather === 'blossom') news.push({ text: '🌸 A sakura blizzard! Everyone will be at the park from 3 to 6pm.', kind: 'info' });
    return news;
  }

  // ======================================================== world mode UI
  // Back to walking around (in town, or inside the building you're in).
  function enterWorld() {
    if (!S) return;
    mode = 'world';
    endCut();
    view.forceOutfit = null;
    view.scene = 'world';
    view.girls = [];
    setFocus(null);
    showRel(null);
    $('dialog').hidden = true;
    $('title-logo').hidden = true;
    clearMenu();
    $('world-ui').hidden = false;
    $('panel').hidden = true;
    target = findTarget();
    updatePrompt();
    updateHud();
  }

  function updatePrompt() {
    const p = $('prompt');
    if (!S || mode !== 'world') return;
    const label = targetLabel(target);
    const tile = tileOf(S.px, S.py);
    const area = S.inside ? null : WORLD.areaAt(tile.x, tile.y);
    const where = S.inside ? INTERIORS[S.inside].name : area ? WORLD.AREAS[area].name : 'Sakuragaoka';
    const walker = GIRL_ORDER.find((id) => npcs[id].follow);
    p.innerHTML = label
      ? `<span class="key">A</span>${esc(label)}`
      : `<span class="where">${esc(where)}</span>${walker ? ` · <span style="color:${GIRLS[walker].color}">walking with ${GIRLS[walker].name} ♥</span>` : ''}`;
    $('btn-a').disabled = !label;
  }

  if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
    $('btn-fs').hidden = false;
    $('btn-fs').addEventListener('click', () => {
      SFX.click();
      const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      if (p && p.catch) p.catch(() => toast('Fullscreen is not available here', 'info'));
    });
  }
  $('btn-a').addEventListener('click', (e) => { e.stopPropagation(); if (mode === 'world') doInteract(); });
  $('btn-map').addEventListener('click', () => { SFX.click(); openMap(); });
  $('btn-phone').addEventListener('click', () => { SFX.click(); openPhone('contacts'); });
  $('btn-bag').addEventListener('click', () => { SFX.click(); openBag(); });

  function busy() {
    mode = 'busy';
    keys.clear();
    releaseJoy();
    $('world-ui').hidden = true;
    $('panel').hidden = false;
  }

  // Return to walking around wherever the player is.
  function resume() {
    if (!S) return;
    enterWorld();
  }

  async function doInteract() {
    const t = findTarget();
    if (!t) return;
    SFX.click();
    if (t.kind === 'girl') { girlMenu(t.id); return; }
    if (t.kind === 'door') { enterBuilding(t.id); return; }
    if (t.kind === 'exit') { leaveBuilding(); return; }
    if (t.kind === 'prop') { useProp(t.p); return; }
    busy();
    if (t.kind === 'pond') { await narrate('Colorful koi swim lazily around the pond.'); resume(); return; }
    if (t.kind === 'lake') { await outdoorActivity('fish'); return; }
    if (t.kind === 'sea') { await outdoorActivity('swim'); return; }
    const o = t.o;
    if (o.interact === 'sign') { await narrate(`The sign reads: "${o.text}"`); resume(); return; }
    if (o.interact === 'wc') { await useToilet(); return; }
    if (o.interact === 'bench') { await outdoorActivity(S.time >= 1260 ? 'stars' : 'bench'); return; }
    await outdoorActivity(o.interact);
  }

  // ============================================================ buildings
  async function enterBuilding(bid) {
    const b = WORLD.B[bid];
    busy();
    if (!b.enter) { await narrate(b.msg); S.py += 2; resume(); return; }
    if (!isOpen(bid)) {
      const L = LOCATIONS[bid];
      await narrate(L.weekdaysOnly && isWeekend() ? `${b.name} is closed on weekends.` : `${b.name} is closed. Open ${clockStr(L.open)} – ${clockStr(L.close)}.`);
      S.py += 2;
      resume();
      return;
    }
    SFX.door();
    if (bid === 'station') { await trainMenu('city'); return; }
    enterRoom(bid);
  }

  // Where you end up when you walk out of a room: city shops open onto the
  // city street, everything else onto the town.
  function exitOf(inside) {
    const R = INTERIORS[inside];
    if (R && R.spec.parent) return { inside: R.spec.parent, x: R.spec.exitAt[0] * T + 8, y: R.spec.exitAt[1] * T + 12 };
    const b = WORLD.B[townBuilding(inside)];
    return { inside: null, x: b.mat.x * T + 8, y: b.mat.y * T + 12 };
  }
  // The town building a place belongs to (for the map and for exits).
  function townBuilding(inside) {
    if (WORLD.B[inside]) return inside;
    if (String(inside).startsWith('room_')) return homeOf(inside.slice(5));
    return 'station'; // the city, its shops and the train
  }
  // keep your date right behind you when you change rooms
  function placeCompanion() {
    trail.length = 0;
    const back = { up: [0, 14], down: [0, -14], left: [14, 0], right: [-14, 0] }[S.dir] || [0, 14];
    // first one right behind you, the others fanned out to either side
    const side = [back[1] ? 1 : 0, back[0] ? 1 : 0];
    party().forEach((k, i) => {
      const n = npcs[k], sw = i === 0 ? 0 : i === 1 ? -12 : 12;
      n.x = S.px + back[0] + side[0] * sw; n.y = S.py + back[1] + side[1] * sw - (i ? Math.sign(back[1]) * 4 : 0);
      n.dir = S.dir; n.walking = false;
    });
  }

  function leaveBuilding() {
    const e = exitOf(S.inside);
    S.inside = e.inside;
    S.px = e.x; S.py = e.y; S.dir = 'down';
    SFX.door();
    enterWorld();
    placeCompanion();
  }

  function enterRoom(bid) {
    const room = INTERIORS[bid];
    S.inside = bid;
    S.px = room.spawn[0] * T + 8; S.py = room.spawn[1] * T + 12; S.dir = 'up';
    for (const id of GIRL_ORDER) if (npcs[id].inside === bid) initRoomNPC(npcs[id], room, false);
    enterWorld();
    placeCompanion();
    toast(`${LOCATIONS[bid].icon} ${LOCATIONS[bid].name}${LOCATIONS[bid].close < DAY_END ? ' · open until ' + clockStr(LOCATIONS[bid].close) : ''}`, 'info');
  }

  // ------------------------------------------------- furniture you can use
  const DAY_SPECIALS = ['Tangerine tart', 'Matcha roll cake', 'Strawberry shortcake', 'Honey toast', 'Sakura mochi latte', 'Lemon cheesecake', 'Chocolate parfait'];
  const findAct = (bid, id) => (ACTIVITIES[bid] || []).find((a) => a.id === id);

  async function useProp(p) {
    busy();
    const bid = S.inside;
    const say = async (text) => { await narrate(text); resume(); };
    const offer = async (question, opts) => {
      await narrate(question, true);
      const loo = lifeOn() && bid && bid !== 'home';
      const pick = await choose([...opts.map((a) => ({ icon: a.icon, t: a.label, note: blocked(a) || costNote(a), disabled: !!blocked(a) })), ...(loo ? [{ icon: '🚻', t: 'Use the restroom' }] : []), { icon: '↩', t: 'Never mind' }]);
      if (loo && pick === opts.length) { await useToilet(); return; }
      if (pick === opts.length + (loo ? 1 : 0)) { resume(); return; }
      await runActivity(opts[pick]);
    };
    switch (p.act) {
      case 'bed': return offer('Your bed. Soft, warm, and calling your name.', [findAct('home', 'sleep'), findAct('home', 'rest')]);
      case 'desk': return offer('Your desk, with your laptop and a stack of textbooks.', [findAct('home', 'homestudy'), findAct('home', 'wfh')]);
      case 'tv': {
        await narrate('The TV, with your game console plugged in.', true);
        const tvp = await choose([{ icon: '📺', t: 'Watch the weather news' }, { icon: '🎮', t: 'Play video games' }, { icon: '↩', t: 'Never mind' }]);
        if (tvp === 2) { resume(); return; }
        if (tvp === 1) return pickConsoleGame();
        const W = WEATHER[S.weather], F = WEATHER[S.forecast];
        const tip = { rain: 'Bring an umbrella!', storm: 'Thunder expected — stay safe indoors.', blossom: 'A sakura blizzard is coming! Perfect for hanami in the park.', sunny: 'Great day to head outside!', cloudy: 'A mild, grey day.' }[S.forecast];
        return say(`📺 Weather news: Today is ${W.icon} ${W.name}. Tomorrow: ${F.icon} ${F.name}. ${tip}`);
      }
      case 'fridge':
        if (lifeOn()) {
          if (S.life.groceries < 1) return say('The fridge is empty. Buy groceries at the bakery or the gift shop.');
          S.life.groceries -= 1; applyLife({ hunger: 20 }); updateHud();
          return say(`You grab a quick snack from the fridge. (+20 Hunger · ${S.life.groceries} groceries left)`);
        }
        if (S.daily.snack) return say('The fridge is almost empty. You already had a snack today.');
        S.daily.snack = true; S.energy = clamp(S.energy + 10, 0, 100); updateHud();
        return say('You grab a pudding cup from the fridge. Sweet! (+10 Energy)');
      case 'wardrobe': resume(); openWardrobe(); return;
      case 'sofa': return offer('The sofa. It\'s very comfy. Maybe too comfy.', [findAct('home', 'rest')]);
      case 'stove': return offer('The stove, with a pot and a frying pan ready to go.', [findAct('home', 'cook')]);
      case 'shower': return offer('The shower. The water pressure here is amazing.', [findAct('home', 'shower')]);
      case 'tub': return offer('A deep bathtub. You could fill it with hot water...', [findAct('home', 'homebath')]);
      case 'sink': return say(rand(['You wash the dishes. Sparkling!', 'A drippy faucet. You tighten it. Victory.', 'You fill a glass of water and drink it in one go.']));
      case 'dining': return say(rand(['A little table for two. One day, maybe someone will sit across from you here.', 'You wipe down the table and straighten the chairs.']));
      case 'basin': return say(rand(['You brush your teeth and fix your hair in the mirror. Looking sharp.', 'You splash cold water on your face. Wide awake!']));
      case 'toilet': case 'restroom': return useToilet();
      case 'washer': return say(rand(['You do a load of laundry. Your white coat is spotless again.', 'The washing machine hums. Your socks spin around in a little whirlpool.']));
      // the city
      case 'enter': {
        if (!isOpen(p.enter)) { const L = LOCATIONS[p.enter]; S.py += 2; return say(`${L.name} is closed. Open ${clockStr(L.open)} – ${clockStr(L.close)}.`); }
        SFX.door();
        enterRoom(p.enter);
        return;
      }
      case 'train': return trainMenu('town');
      case 'order': return orderFood(bid);
      case 'crepe': return orderFood('crepe');
      case 'mallfashion': return mallFashion();
      case 'purikura': return purikura();
      case 'cityshop': openShop('city'); resume(); return;
      case 'fancy': return fancyDinner();
      case 'piano': return playPiano();
      case 'citybench': return say(cityDate ? `You sit on the bench with ${namesOf(cityDate.ids)} and watch the city rush past.${cityDate.ids.length === 1 ? ' She leans on your shoulder.' : ' Everyone squeezes in.'}` : 'You sit and people-watch for a while. Everyone in the city walks so fast.');
      case 'cityfountain': {
        if (S.money < 1) return say('A wishing fountain. You don\'t even have a coin to throw.');
        S.money -= 1; updateHud();
        if (cityDate && !cityDate.done.fountain) { cityDate.done.fountain = true; for (const k of cityDate.ids) addAff(k, 2); return say(`You and ${namesOf(cityDate.ids)} each toss a coin and make a wish. Nobody will tell you theirs.`); }
        return say('You toss a coin into the fountain and make a wish.');
      }
      case 'nightstand': return say('A reading lamp and your alarm clock, set for 6:00am sharp.');
      case 'boxes': return say(rand(['Still unpacking... You find an old photo album and smile.', 'A box labeled "IMPORTANT". It\'s full of snacks. Very important.', 'You unpack a few more things. It\'s starting to feel like home.']));
      case 'counter': return offer('The café counter. The espresso machine hisses happily.', [findAct('cafe', 'work'), findAct('cafe', 'coffee')]);
      case 'menu': return say(`Today's special: ${DAY_SPECIALS[S.day % DAY_SPECIALS.length]}. Underneath, in small letters: "Tips appreciated ♥ — N."`);
      case 'table': return say(rand(['You sit for a while and people-watch. Someone is writing a love letter at the next table.', 'The table still smells faintly of cinnamon.', 'A regular is reading the newspaper upside down. You decide not to mention it.']));
      case 'cakes': return say('The cakes look amazing. The tangerine tart has a "SOLD OUT" sign. Again.');
      case 'books': case 'study': return offer(p.act === 'books' ? 'Rows and rows of books. Where to start?' : 'A quiet study table.', [findAct('school', 'study')]);
      case 'notice': {
        const bdays = GIRL_ORDER.filter((id) => S.girls[id].met).map((id) => `${GIRLS[id].name} (day ${GIRLS[id].birthday || 28})`).join(', ');
        return say(`The notice board: "Library closes at 6pm." "Lost: one goldfish (answers to 'Lord Bubbles')." ${bdays ? 'Someone has pinned a birthday list: ' + bdays + ' of each month.' : ''}`);
      }
      case 'librarian': return say('The librarian looks up and whispers, "Shh." You weren\'t even talking.');
      case 'globe': return say('You spin the globe. Your finger lands on a tiny island. Nami would know where that is.');
      case 'shop': openShop('gift'); resume(); return;
      // maid café
      case 'maidcounter': return offer('"Welcome home!" The maid café counter is spotless.', [findAct('maidcafe', 'omurice'), findAct('maidcafe', 'serve')]);
      case 'maidmenu': return say('Menu: Love-Love Omurice ¥15 · Magic Parfait · "Moe Moe Kyun" tea. A note: "All dishes drawn with a heart by Rem ♥"');
      case 'maidtable': return say(rand(['A tiny bell sits on the table. You ring it. Somewhere, a maid sighs happily.', 'The table is decorated with a blue rose in a vase.', 'Someone left a drawing of a cat on a napkin.']));
      // bakery
      case 'bakecounter': return offer('Fresh bread, honey toast and jars of golden honey.', [findAct('bakery', 'honeytoast'), findAct('bakery', 'bakeryshop')]);
      case 'bakeclass': return offer('Today\'s class: honey madeleines!', [findAct('bakery', 'bakeclass')]);
      case 'oven': return say('The brick oven glows warm. It smells like heaven in here.');
      // antiques
      case 'curio': return offer('Shelves of dusty antiques, pocket watches and old grimoires.', [findAct('antiques', 'antiqueshop')]);
      case 'lectern': return offer('A grimoire lies open: "Spell to Find Lost Socks".', [findAct('antiques', 'readmagic')]);
      case 'crystal': return say(rand(['You gaze into the crystal ball. It shows... your own face, slightly confused.', 'The crystal ball glows faintly. A tag says "Not for sale. Probably cursed."']));
      case 'mimic':
        S.energy = clamp(S.energy - 5, 0, 100); updateHud();
        return say('You open the chest. It BITES you! It\'s a mimic! (−5 Energy) ...A note inside says: "Ha. — F."');
      case 'oldmap': return say('An ancient map of the region. Sakuragaoka is drawn as a tiny fishing village.');
      // clock tower
      case 'tinker': return offer('Huge brass gears turn slowly. Some look loose.', [findAct('clocktower', 'tinker')]);
      case 'clockview': return offer('Through the clock face you can see the whole town.', [findAct('clocktower', 'clockview')]);
      case 'stairs': return say('The spiral stairs lead up to the bells. A sign says "Staff only (Kurumi)".');
      // onsen
      case 'bath': return offer('Steam rises from the hot spring. It looks wonderful.', [findAct('onsen', 'soak')]);
      case 'milkfridge': return offer('Ice-cold coffee milk. The best thing after a bath.', [findAct('onsen', 'milk')]);
      case 'massage': return offer('A massage chair. It hums ominously.', [findAct('onsen', 'massage')]);
      case 'lockers': return say('Rows of wooden lockers. One is labeled "002 — honey, do not touch".');
      case 'display': return say(rand(['Shelves of cute gifts. A tag reads: "Everyone loves flowers! (Probably.)"', 'Tiny cat figurines stare at you judgmentally.', 'A display of lucky dice. Very shiny.']));
      case 'boutique': return offer('Try on something new?', [findAct('mall', 'boutique')]);
      case 'puzzle': return videoGame('stack', 5);
      case 'rhythm': return videoGame('rhythm', 5);
      case 'claw': return offer('The claw machine is full of fluffy cat plushies.', [findAct('arcade', 'claw')]);
      case 'fighter': return videoGame('mash', 5);
      case 'racer': return videoGame('kart', 5);
      case 'slots': return casinoSlots();
      case 'blackjack': return casinoBlackjack();
      case 'casinobar': {
        await narrate('🍹 The bartender slides a menu over: "Lucky Seven Sunrise" mocktail, ¥10.', true);
        const bp = await choose([{ icon: '🍹', t: 'Order a mocktail', note: '¥10 · +fun', disabled: S.money < 10 }, ...(lifeOn() ? [{ icon: '🚻', t: 'Use the restroom' }] : []), { icon: '↩', t: 'Never mind' }]);
        if (bp === 0) { S.money -= 10; SFX.coin(); applyLife({ fun: 10, hunger: 5, bladder: -10 }); updateHud(); return say('Sweet, fizzy and bright orange. You feel lucky already.'); }
        if (bp === 1 && lifeOn()) return useToilet();
        resume(); return;
      }
      case 'prizes': return say('The prize counter: 1,000 tickets for a plushie. You have 12 tickets.');
      case 'train': return offer('The training dummy waits patiently.', [findAct('dojo', 'train')]);
      case 'swords': return say('A row of well-worn bokken, polished by years of practice.');
      case 'drum': SFX.thunder(); return say('BOOM! The taiko drum echoes through the dojo. That felt great.');
      case 'scroll': return say('The scroll reads: "Strength protects what you love." The brushstrokes are elegant.');
      default: return say('Nothing special here.');
    }
  }

  function costNote(a) {
    const parts = [];
    if (a.money > 0) parts.push('¥' + a.money);
    if (a.energy > 0) parts.push('⚡' + a.energy);
    if (a.gain) parts.push(Object.entries(a.gain).map(([k, v]) => `+${v} ${k[0].toUpperCase() + k.slice(1)}`).join(' '));
    if (a.note) parts.push(a.note);
    if (a.mins) parts.push(a.mins >= 60 ? `${a.mins / 60}h` : `${a.mins}m`);
    return parts.join(' · ');
  }

  function blocked(a) {
    if (a.id === 'sleep' || a.id === 'shop' || a.id === 'bakeryshop' || a.id === 'antiqueshop') return '';
    if (a.money > 0 && S.money < a.money) return 'Not enough money';
    if (a.energy > 0 && S.energy < a.energy) return 'Too tired';
    if (a.daily && S.daily[a.id]) return 'Done for today';
    if (a.id === 'cook') {
      if (lifeOn() && S.life.groceries < 1) return 'No groceries (bakery or gift shop)';
      if (!lifeOn() && S.daily.cook) return 'Done for today';
    }
    return '';
  }

  // ============================================================ activities
  const SYNERGY = {
    work: { girl: 'nami', v: 2, text: 'Nami cheers you on between orders. "Smile for the customers!"' },
    study: { girl: 'yumeko', v: 2, text: 'Yumeko sits across from you, watching you study with an amused smile.' },
    train: { girl: 'zerotwo', v: 2, text: 'Zero Two grabs the other bokken. "Spar with me, darling!" You learn fast. (+1 Fitness)', bonus: { fitness: 1 } },
    jog: { girl: 'zerotwo', v: 2, text: 'Zero Two sprints past you, then jogs backwards in front of you, grinning. "Too slow, darling!"' },
    offer: { girl: 'aqua', v: 3, text: 'Aqua beams. "A devoted worshipper! The goddess is pleased!"' },
    swim: { girl: 'nami', v: 2, text: 'Nami races you to the buoy. She wins by a mile.' },
    rhythm: { girl: 'aqua', v: 2, text: 'Aqua joins in on the second player pad, flailing wildly.' },
    puzzle: { girl: 'yumeko', v: 2, text: 'Yumeko leans over your shoulder. "Ufufu, not that piece~"' },
    serve: { girl: 'rem', v: 3, text: 'Rem works beside you, fixing your apron. "Rem is happy working with {name}-kun!"' },
    omurice: { girl: 'rem', v: 2, text: 'Rem draws an extra little heart next to yours, then hurries away.' },
    bakeclass: { girl: 'zerotwo', v: 2, text: 'Zero Two steals a madeleine off your tray. "Tax, darling."' },
    readmagic: { girl: 'frieren', v: 3, text: 'Frieren reads over your shoulder. "That spell is useless. ...I love it."' },
    tinker: { girl: 'kurumi', v: 3, text: 'Kurumi watches you work, chin in hand. "Ufufu, you have nice hands."' },
    soak: { girl: 'zerotwo', v: 2, text: 'From the other side of the bamboo wall: "Darling~ Is that you?"' },
    flowerpick: { girl: 'frieren', v: 3, text: 'Frieren kneels beside you and adds a blue flower to your bouquet.' },
    lighthouse: { girl: 'kurumi', v: 2, text: 'Kurumi leans on the railing beside you, her hair streaming in the wind.' },
  };

  function gainStats(gain) {
    const parts = [];
    for (const [k, v0] of Object.entries(gain || {})) {
      const v = lifeOn() && S.life.fun < 20 ? Math.max(1, Math.floor(v0 / 2)) : v0;
      S.stats[k] = clamp(S.stats[k] + v, 0, 99);
      parts.push(`+${v} ${k[0].toUpperCase() + k.slice(1)}`);
    }
    return parts.join(', ');
  }

  async function outdoorActivity(id) {
    const a = ACTIVITIES.outdoor[id];
    busy();
    if (isWet() && ['swim', 'sunbathe', 'jog', 'bench', 'stars', 'flowerpick', 'fish', 'lighthouse'].includes(id)) {
      await narrate(S.weather === 'storm' ? "Thunder rumbles overhead. Better not — let's find somewhere indoors." : "It's pouring! Maybe another day.");
      resume();
      return;
    }
    if (id === 'stars' && S.weather === 'cloudy') { await narrate('Clouds cover the whole sky tonight. No stars to see.'); resume(); return; }
    if ((id === 'swim' || id === 'sunbathe') && (S.time < 420 || S.time >= 1140)) {
      await narrate(id === 'swim' ? "It's too dark to swim safely right now." : 'The sun is not out. Maybe come back during the day.');
      resume();
      return;
    }
    const why = blocked(a);
    const note = costNote(a);
    await narrate(`${a.label}?${note ? ` (${note})` : ''}`, true);
    const pick = await choose([{ icon: '✓', t: why ? `${a.label} — ${why}` : 'Yes', disabled: !!why }, { icon: '↩', t: 'Not now' }]);
    if (pick === 1) { resume(); return; }
    await runActivity(a);
  }

  async function runActivity(a) {
    if (a.id === 'shop' || a.id === 'bakeryshop' || a.id === 'antiqueshop') { openShop({ shop: 'gift', bakeryshop: 'bakery', antiqueshop: 'antiques' }[a.id]); resume(); return; }
    busy();
    clearMenu();
    if (a.id === 'sleep') {
      await narrate(S.time < 1200 ? 'You turn in early and sleep like a log.' : 'You crawl into bed. What a day.');
      await newDay(100);
      return;
    }
    const money = a.money || 0;
    if (money > 0) spend(0, money); else if (money < 0) { S.money -= money; SFX.coin(); }
    S.energy = clamp(S.energy - (a.energy || 0), 0, 100);
    if (a.daily || (a.id === 'cook' && !lifeOn())) S.daily[a.id] = true;
    updateHud();
    const gainBits = [];
    if (a.energy < 0) gainBits.push(`+${-a.energy}⚡`);
    if (a.money < 0) gainBits.push(`+¥${-a.money}`);
    for (const [k, v] of Object.entries(a.gain || {})) gainBits.push(`+${v} ${k[0].toUpperCase() + k.slice(1)}`);
    const anim = view.scene === 'world' ? activityCut(a, gainBits.join(' ')) : null;

    let msg = '';
    switch (a.id) {
      case 'rest': msg = 'You curl up on the couch for a cozy nap. (+35 Energy)'; break;
      case 'homestudy': msg = `You hit the books at your desk. (${gainStats(a.gain)})`; break;
      case 'wfh': { const earn = 40 + Math.floor(S.stats.smarts / 3); S.money += earn; msg = rand([`You fix bugs for a client in another city. (+¥${earn})`, `You translate a manga chapter for a publisher. (+¥${earn})`, `You design a logo for the bakery's new honey line. (+¥${earn})`]); break; }
      case 'cook': msg = rand(['You whip up curry rice from scratch. Delicious! (+25 Energy)', 'A fluffy omelette and miso soup. You feel like a real adult. (+25 Energy)', 'Stir-fried veggies and rice. Simple, but perfect. (+25 Energy)']); break;
      case 'shower': msg = `A hot shower. You come out fresh and smelling great. (${gainStats(a.gain)}, +10 Energy)`; break;
      case 'homebath': msg = 'You sink into a hot bath up to your chin. Bliss. (+30 Energy)'; break;
      case 'work': msg = 'You serve coffee and cake for three hours. Tips were good! (+¥60)'; break;
      case 'coffee': msg = 'A warm latte. You feel more awake. (+15 Energy)'; break;
      case 'study': msg = `The library is quiet. You learn a lot. (${gainStats(a.gain)})`; break;
      case 'jog': msg = `You jog laps under the cherry blossoms. (${gainStats(a.gain)})`; break;
      case 'bench': msg = 'You sit and watch the petals fall for a while. (+10 Energy)'; break;
      case 'stars': msg = `The stars are beautiful tonight. You feel a little more poetic. (${gainStats(a.gain)})`; break;
      case 'swim': msg = `The water is cold but refreshing! (${gainStats(a.gain)})`; break;
      case 'sunbathe': msg = `You soak up the sun under the umbrella. (${gainStats(a.gain)}, +10 Energy)`; break;
      case 'boutique': msg = `A new haircut and a stylish outfit. Looking good! (${gainStats(a.gain)})`; break;
      case 'rhythm': msg = `You dance your heart out to the beat! (${gainStats(a.gain)})`; break;
      case 'puzzle': msg = `Falling blocks, falling blocks... (${gainStats(a.gain)})`; break;
      case 'train': msg = `One hundred swings. Your arms burn. (${gainStats(a.gain)})`; break;
      case 'vending': S.inv.soda = (S.inv.soda || 0) + 1; msg = 'Clunk! A 🥤 Fancy Soda drops out. Someone at the shrine would love this...'; SFX.coin(); break;
      case 'claw': {
        if (Math.random() < 0.35) { S.inv.plushie = (S.inv.plushie || 0) + 1; msg = 'The claw grabs a fluffy cat plushie... and drops it in the chute! You won a 🐱 Cat Plushie!'; SFX.win(); }
        else msg = rand(['The claw slips right off. So close!', 'The plushie wobbles... and falls back. Rigged!', 'You grab a plushie by the ear — it drops. Again!']);
        break;
      }
      case 'offer': S.offerings += 1; msg = `You toss a coin into the offering box and clap twice. (Offerings: ${S.offerings}, ${gainStats({ charm: 1 })})`; break;
      case 'omurice': msg = 'A fluffy omurice arrives. Rem draws a ketchup heart on top. "Moe moe kyun!" (+25 Energy)'; break;
      case 'serve': msg = 'You help serve tables for three hours. "Welcome home, master!" (+¥70)'; break;
      case 'honeytoast': msg = 'Thick toast drizzled with honey. Perfect. (+20 Energy)'; break;
      case 'bakeclass': msg = `You bake slightly lopsided honey madeleines. Delicious anyway! (${gainStats(a.gain)})`; break;
      case 'readmagic': msg = `You learn a spell to make tea slightly warmer. Useless, yet fascinating. (${gainStats(a.gain)})`; break;
      case 'tinker': msg = `You oil the gears and fix a loose spring. The tower ticks more smoothly. (${gainStats(a.gain)})`; break;
      case 'clockview': msg = `The whole town glitters below the clock face. (${gainStats(a.gain)}, +5 Energy)`; break;
      case 'soak': msg = 'You sink into the hot spring. Every muscle melts. Pure bliss. (+40 Energy)'; break;
      case 'milk': msg = 'You drink a coffee milk with one hand on your hip, as tradition demands. (+10 Energy)'; break;
      case 'massage': msg = `The massage chair attacks your back with surprising force. You feel great. (${gainStats(a.gain)}, +15 Energy)`; break;
      case 'flowerpick': S.inv.flowers = (S.inv.flowers || 0) + 1; msg = 'You pick a little bouquet of wildflowers. (+1 💐 Flower Bouquet)'; break;
      case 'fish': msg = `You sit on the dock and watch dragonflies skim the lake. Peaceful. (${gainStats(a.gain)}, +10 Energy)`; break;
      case 'lighthouse': msg = `You watch ships on the horizon through the telescope. (${gainStats(a.gain)})`; break;
      case 'fortune': { const f = rand(FORTUNES); const g = gainStats(f[1]); msg = `Your fortune: "${f[0]}"${g ? ' (' + g + ')' : ''}`; break; }
      default: msg = 'You spend some time here.';
    }
    if (anim) {
      await cutscene(anim);
      toast(msg.length > 90 ? msg.slice(0, 88) + '…' : msg, 'info');
    } else await narrate(msg);

    applyLife(LIFE_FX[a.id]);
    if (a.id === 'cook' && lifeOn()) S.life.groceries -= 1;
    const syn = SYNERGY[a.id];
    if (syn && S.girls[syn.girl].met && girlNearPlayer(syn.girl)) {
      if (syn.bonus) gainStats(syn.bonus);
      if (!anim) setFocus(syn.girl, 'smile');
      showRel(syn.girl);
      await narrate(syn.text);
      addAff(syn.girl, syn.v);
      await wait(400);
    }
    endCut();
    updateHud();
    if (a.mins && !(await advanceTime(a.mins))) return;
    resume();
  }

  // ======================================================== girl interaction
  const GREET = {
    nami: ['Hey hey, {name}! Here to spend money?', "Oh! {name}! Perfect timing, I'm on break.", "Yo! What's up?"],
    aqua: ['Ah, my loyal worshipper approaches!', 'Mortal! You may speak.', '{name}! Did you bring soda? ...No? Okay.'],
    yumeko: ["Ufufu, I knew you'd come.", 'Good timing, {name}. I was getting bored.', 'Oh? Feeling lucky today?'],
    kurumi: ['Ara ara~ {name}. What a pleasant surprise.', 'Ufufu, there you are.', 'Good day, {name}. Shall we spend some time together?'],
    rem: ['Welcome, {name}-kun!', '{name}-kun! Rem was hoping to see you.', 'Good day, {name}-kun.'],
    zerotwo: ['Darling! ...I mean, hey.', 'Hmm? Oh, it\'s you~', 'Found you, {name}!'],
    frieren: ['...Oh. {name}. Hello.', 'Hm. You again. ...That\'s good.', '...Did I fall asleep? Oh, hello.'],
    marin: ['{name}! Hiii!', "Oh! It's you! Perfect timing!", "Yo yo! What's up?"],
    krul: ['Ah. The human.', 'You again? ...Good.', 'Speak, {name}. The queen is listening.'],
  };
  const GF_GREET = {
    nami: ['{name}! My favorite person! ♥'],
    aqua: ['My beloved has arrived! ♥'],
    yumeko: ["There's my darling~ ♥"],
    kurumi: ['My darling {name}~ ♥'],
    rem: ['{name}-kun! Rem missed you! ♥'],
    zerotwo: ['DARLING! ♥'],
    frieren: ['...{name}. I was waiting for you. ♥'],
    marin: ['My favorite person!! ♥'],
    krul: ['My human. You may approach. ♥'],
  };

  async function girlMenu(id) {
    const friend = S.girls[id].met && !/quiet/.test(location.search) ? nearbyFriend(id) : null;
    if (friend && Math.random() < 0.6) { await pairScene(id, friend, false); if (!S) return; }
    const g = S.girls[id];
    busy();
    clearMenu();
    view.girls = [];
    const n = npcs[id];
    const pos = S.inside ? n.room : n;
    if (pos) {
      const dx = S.px - pos.x, dy = S.py - pos.y;
      pos.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    }
    showRel(g.met ? id : null);
    if (!g.met) {
      await play(id, GIRLS[id].intro);
      g.met = true;
      g.aff = 5;
      showRel(id);
      toast(`You met ${GIRLS[id].full}!`, 'good');
      SFX.heart();
    }
    setFocus(id, g.gf ? 'love' : 'smile');
    await specialMoments(id);
    setFocus(id, g.gf ? 'love' : 'smile');
    await showLine(id, rand(g.gf ? GF_GREET[id] : GREET[id]), { wait: false });
    renderGirlMenu(id);
  }

  // Things that happen the first time you see her today: a meet-up she
  // invited you to, her birthday, or a reaction to the weather.
  async function specialMoments(id) {
    const g = S.girls[id];
    const G = GIRLS[id];
    const inv = activeInvite(id);
    const n = npcs[id];
    const t = tileOf(n.x, n.y);
    const there = inv && (WORLD.B[inv.place] ? n.inside === inv.place : !n.inside && WORLD.areaAt(t.x, t.y) === inv.place);
    if (inv && there) {
      inv.done = true;
      toast(`💌 Meet-up with ${G.name}!`, 'good');
      await play(id, G.inviteMeet);
      addAff(id, 8);
    }
    if (isBirthday(id) && !S.daily['bday_' + id]) {
      S.daily['bday_' + id] = true;
      await play(id, [vary(id, 'bday')]);
    }
    const wl = G.weather && G.weather[S.weather];
    if (wl && !S.daily['wx_' + id]) {
      S.daily['wx_' + id] = true;
      await play(id, wl);
      addAff(id, (G.weatherBonus && G.weatherBonus[S.weather]) || 2);
    }
  }

  function renderGirlMenu(id) {
    if (!S) return;
    const g = S.girls[id];
    const m = $('menu');
    clearMenu();
    const talked = S.daily['talk_' + id];
    const tired = S.energy < 10;
    m.appendChild(button({ icon: '💬', label: talked ? 'Chat' : 'Talk', note: talked ? 'Talked today' : tired ? 'Too tired' : '⚡10 · 20m', disabled: !talked && tired, onClick: () => talk(id) }));
    const items = Object.keys(S.inv).filter((k) => S.inv[k] > 0);
    const gifted = S.daily['gift_' + id];
    m.appendChild(button({ icon: '🎁', label: 'Give a gift', note: gifted ? 'Already today' : items.length ? '' : 'Bag is empty', disabled: gifted || !items.length, onClick: () => giveGift(id) }));
    let dateNote = '¥30 · ⚡25 · 3h';
    let dateOk = true;
    if (S.daily['date_' + id]) { dateNote = 'Already today'; dateOk = false; }
    else if (S.time < 720 || S.time >= 1260) { dateNote = '12pm – 9pm only'; dateOk = false; }
    else if (S.money < 30 && id !== 'kurumi') { dateNote = 'Need ¥30'; dateOk = false; }
    else if (id === 'kurumi') dateNote = '💎 Kurumi pays · ⚡25 · 3h';
    else if (S.energy < 25) { dateNote = 'Too tired'; dateOk = false; }
    const acted = S.daily['act_' + id];
    m.appendChild(button({ icon: '✨', label: 'Interact…', note: acted ? 'Done today' : 'compliment, joke, hug…', disabled: !!acted, onClick: () => interactMenu(id) }));
    const grp = party();
    const joining = grp.length > 0 && !npcs[id].follow;
    let walkNote = joining ? `Join ${namesOf(grp)} (${grp.length + 1}/${MAX_PARTY})` : 'Stroll around town · 2h';
    let walkOk = true;
    if (S.inside) { walkNote = 'Only outside'; walkOk = false; }
    else if (joining && grp.length >= MAX_PARTY) { walkNote = `Group is full (${MAX_PARTY})`; walkOk = false; }
    else if (!g.gf && g.aff < 20) { walkNote = 'Become friends first'; }
    else if (S.daily['walk_' + id]) { walkNote = 'Already today'; walkOk = false; }
    else if (isWet()) { walkNote = 'Not in this weather'; walkOk = false; }
    m.appendChild(button({ icon: joining ? '👭' : '🚶', label: joining ? 'Invite to hang out' : 'Walk together', note: walkNote, disabled: !walkOk, onClick: () => (!g.gf && g.aff < 20 ? refuse(id, 'walkEarly') : walkTogether(id)) }));
    m.appendChild(button({ icon: '🌸', label: 'Ask on a date', note: dateNote, disabled: !dateOk, onClick: () => askDate(id) }));
    if (S.inside === 'onsen') {
      let soakNote = '¥10 · 1h · +30 energy';
      let soakOk = true;
      if (!closeEnough(g)) { soakNote = 'Needs Close Friend'; soakOk = false; }
      else if (S.daily['soak_' + id]) { soakNote = 'Already today'; soakOk = false; }
      else if (S.money < 10) { soakNote = 'Need ¥10'; soakOk = false; }
      m.appendChild(button({ icon: '♨️', label: 'Soak together', note: soakNote, disabled: !soakOk, cls: soakOk ? 'primary' : '', onClick: () => soakTogether(id) }));
    }
    {
      let note = 'Stay the night · until morning';
      let ok = true;
      const early = !g.gf && g.aff < 65;
      if (S.time < 1200 || S.time >= 1500) { note = '8pm – 1am only'; ok = false; }
      else if (early) note = 'Needs Close Friend';
      m.appendChild(button({ icon: '🌙', label: 'Spend the night…', note, disabled: !ok, onClick: () => (early ? refuse(id, 'nightEarly') : sleepover(id)) }));
    }
    if (lifeOn() && g.met && g.life) {
      if (g.life.money < 20) m.appendChild(button({ icon: '💴', label: 'Lend her ¥50', note: `She's broke (¥${Math.round(g.life.money)})`, disabled: S.money < 50, onClick: () => lendMoney(id) }));
      if (g.life.hunger < 40) m.appendChild(button({ icon: '🍙', label: 'Treat her to a snack', note: "¥15 · she's hungry", disabled: S.money < 15, onClick: () => treatSnack(id) }));
    }
    if (id === 'yumeko' && g.met) {
      const where = S.inside === 'casino' ? "at her table" : S.inside === 'arcade' ? 'blackjack' : 'high or low';
      m.appendChild(button({ icon: '🎴', label: 'Play cards', note: S.daily.yumekoCards ? 'Already today' : g.aff < 10 ? 'Become friends first' : where, disabled: !!S.daily.yumekoCards || g.aff < 10, onClick: () => yumekoCards() }));
    }
    if (id === 'marin' && g.met) m.appendChild(button({ icon: '🎭', label: 'Cosplay photoshoot', note: S.daily.cosplayShoot ? 'Already today' : g.aff < 20 ? 'Become friends first' : '1h · pick her costume', disabled: !!S.daily.cosplayShoot || g.aff < 20, onClick: () => cosplayShoot() }));
    if (id === 'kurumi' && g.met && S.money < 100 && g.aff >= 45 && S.kurumiWeek !== Math.floor((S.day - 1) / 7)) m.appendChild(button({ icon: '💎', label: 'Ask Kurumi for help', note: "You're short on money", onClick: () => kurumiHelp() }));
    if (id === 'frieren') m.appendChild(button({ icon: '🧪', label: 'Buy a Love Potion', note: `¥${ITEMS.lovepotion.price} · Frieren's brew`, onClick: () => buyPotion(id) }));
    if (!g.gf && g.aff >= 90 && g.events >= 2) {
      m.appendChild(button({ icon: '💌', label: 'Confess your feelings', cls: 'primary', onClick: () => confess(id) }));
    }
    m.appendChild(button({ icon: '↩', label: 'Goodbye', onClick: resume }));
  }

  // How each interaction looks in the world: who stands where, and the emotes.
  function interactionCut(id, kind, v) {
    const g = actorPos(id), p = actorPos('player');
    const side = p.x <= g.x ? -1 : 1;
    const gap = { hug: 7, kiss: 7, hands: 11, pat: 10 }[kind] || 14;
    const spot = [g.x + side * gap, g.y];
    const toward = side < 0 ? 'right' : 'left', back = side < 0 ? 'left' : 'right';
    const c = {
      actors: { player: { path: [spot], dirEnd: kind === 'hands' ? 'down' : toward }, [id]: { dirEnd: kind === 'hands' ? 'down' : back } },
      focus: { x: g.x + side * gap / 2, y: g.y - 8 }, dur: 1500, fx: [], emotes: [],
    };
    const mid = { x: g.x + side * gap / 2, y: g.y - 30 };
    const good = v > 0;
    switch (kind) {
      case 'compliment': c.emotes.push({ who: id, kind: good ? 'heart' : 'dots', at: 300 }); break;
      case 'joke': c.emotes.push({ who: 'player', kind: 'note', at: 0, dur: 600 }, { who: id, kind: good ? '!' : 'dots', at: 600, dur: 600 }); if (good) c.emotes.push({ who: id, kind: 'note', at: 1200 }); c.dur = 1800; break;
      case 'tease': c.emotes.push({ who: id, kind: good ? 'heart' : 'anger', at: 300 }); break;
      case 'pat': c.emotes.push({ who: id, kind: 'heart', at: 400 }); c.fx.push({ kind: 'sparkle', x: g.x, y: g.y - 24, at: 200 }); break;
      case 'hands': c.emotes.push({ who: id, kind: 'heart', at: 300 }, { who: 'player', kind: 'heart', at: 700 }); c.fx.push({ kind: 'hearts', x: mid.x, y: mid.y + 14, at: 400 }); break;
      case 'hug': c.fx.push({ kind: 'hearts', x: mid.x, y: mid.y + 8, at: 100 }); c.emotes.push({ who: id, kind: 'heart', at: 500 }); c.dur = 1900; break;
      case 'kiss': c.fx.push({ kind: 'hearts', x: mid.x, y: mid.y + 6, at: 0 }, { kind: 'sparkle', x: mid.x, y: mid.y, at: 300 }); c.emotes.push({ who: id, kind: 'heart', at: 600 }); c.dur = 2000; break;
    }
    return c;
  }

  async function interactMenu(id) {
    const g = S.girls[id];
    const G = GIRLS[id];
    const avail = INTERACTIONS.map((it) => {
      const ok = it.gf ? g.gf : g.gf || g.aff >= it.min;
      const need = it.gf ? 'Girlfriends only' : `Needs ${STAGES.slice().reverse().find((st) => st.min <= it.min).label}`;
      return { icon: it.icon, t: it.label, note: ok ? '' : need, disabled: !ok, it };
    });
    const pick = await choose([...avail, { icon: '↩', t: 'Never mind' }]);
    if (pick === avail.length) { renderGirlMenu(id); return; }
    const it = avail[pick].it;
    S.daily['act_' + id] = true;
    applyLife({ fun: 3 });
    spend(5, 0);
    let r = G.react[it.id];
    if (it.id === 'joke') r = Math.random() < 0.65 ? r.ok : r.fail;
    await cutscene(interactionCut(id, it.id, r[2]));
    await showLine('p', { compliment: 'You look really nice today.', joke: 'Want to hear a joke?', tease: "You're kind of a dork, you know that?", pat: '(You gently pat her head.)', hands: '(You take her hand.)', hug: '(You pull her into a hug.)', kiss: '(You kiss her softly.)' }[it.id]);
    await showLine(id, r[1]);
    addAff(id, r[2]);
    await wait(400);
    endCut();
    setFocus(id, r[2] > 0 ? 'smile' : 'sad');
    S.time += 10;
    updateHud();
    renderGirlMenu(id);
    await showLine(id, fmt(vary(id, 'anythingElse')), { wait: false });
  }

  // ========================================================= games & fun
  // Video games on the console at home and the arcade machines (alone or
  // against a girl who's with you), the casino, Yumeko's card games,
  // Marin's cosplay shoots.
  function miniGame(title, kind, opts = {}) {
    return new Promise((resolve) => openModal(title, (body) => { MINIGAMES.play(body, kind, opts).then((r) => { closeModal(); resolve(r); }); }, false));
  }
  const wallet = { get: () => S.money, add: (d) => { S.money += d; updateHud(); } };
  const GAME_STAT = { kart: { fitness: 1 }, stack: { smarts: 1 }, rhythm: { charm: 1 }, mash: { fitness: 1 } };
  // girls you can play with: the ones with you, or in the same room
  const playmates = () => GIRL_ORDER.filter((k) => S.girls[k].met && (npcs[k].follow || (S.inside && npcs[k].inside === S.inside && npcs[k].room)));
  const kurumiPays = () => !!(cityDate && cityDate.ids.includes('kurumi'));

  async function videoGame(kind, cost = 0) {
    busy();
    const G = MINIGAMES.SKILL_GAMES[kind];
    const mates = playmates();
    await narrate(`${G.icon} ${G.name}${cost ? ` · ¥${cost} a game` : ''}. Who's playing?`, true);
    const pick = await choose([
      { icon: '🎮', t: 'Play alone', note: cost && S.money < cost ? `Need ¥${cost}` : '', disabled: S.money < cost },
      ...mates.map((k) => ({ icon: '👭', t: `Play against ${GIRLS[k].name}`, note: cost ? `¥${cost * 2} for two` : '', disabled: S.money < cost * 2 })),
      { icon: '↩', t: 'Never mind' },
    ]);
    if (pick === mates.length + 1) { resume(); return; }
    const rid = pick > 0 ? mates[pick - 1] : null;
    if (cost) { S.money -= cost * (rid ? 2 : 1); SFX.coin(); updateHud(); }
    if (rid) await play(rid, [['smile', vary(rid, 'vsStart')]]);
    const res = await miniGame(`${G.icon} ${G.name}`, kind, rid ? { rival: { name: GIRLS[rid].name, color: GIRLS[rid].color, skill: VS[rid].skill[kind] } } : {});
    applyLife({ fun: 20 });
    if (!S.daily['game_' + kind]) { S.daily['game_' + kind] = true; toast(`🎮 ${gainStats(GAME_STAT[kind])}`, 'good'); }
    if (rid) {
      await play(rid, [res.won ? VS[rid].lose : VS[rid].win]);
      addAff(rid, res.won ? 3 : 4);
      if (S.girls[rid].life) S.girls[rid].life.fun = clamp(S.girls[rid].life.fun + 20, 0, 100);
    }
    S.time += 20;
    updateHud();
    resume();
  }
  async function pickConsoleGame() {
    const kinds = Object.keys(MINIGAMES.SKILL_GAMES);
    await narrate('🎮 Your game console. Which game?', true);
    const g = await choose([...kinds.map((k) => ({ icon: MINIGAMES.SKILL_GAMES[k].icon, t: MINIGAMES.SKILL_GAMES[k].name })), { icon: '↩', t: 'Never mind' }]);
    if (g === kinds.length) { resume(); return; }
    await videoGame(kinds[g]);
  }

  async function afterGamble(net) {
    toast(net > 0 ? `💰 You won ¥${net}!` : net < 0 ? `💸 You lost ¥${-net}.` : 'You broke even.', net > 0 ? 'good' : net < 0 ? 'bad' : 'info');
    applyLife({ fun: 15 });
    S.time += 30;
    updateHud();
    if (S.girls.yumeko.met && girlNearPlayer('yumeko') && !S.daily.yumekoWatch) {
      S.daily.yumekoWatch = true;
      await play('yumeko', [net > 0 ? ['love', 'Ufufu, I saw that! Lady Luck likes you tonight.'] : ['smug', "Losing is part of the thrill. ...Shall I teach you how to win?"]]);
      addAff('yumeko', 2);
    }
    resume();
  }
  async function casinoSlots() { busy(); const r = await miniGame('🎰 Lucky Sevens', 'slots', { wallet }); await afterGamble(r.net); }
  async function casinoBlackjack() { busy(); const r = await miniGame('🃏 Blackjack', 'blackjack', { wallet, dealer: 'Dealer', bets: [10, 50, 100] }); await afterGamble(r.net); }

  async function yumekoCards() {
    clearMenu();
    const key = S.inside === 'casino' ? 'casino' : S.inside === 'arcade' ? 'arcade' : S.inside === 'school' ? 'school' : 'any';
    const Y = YUMEKO_CARDS[key];
    S.daily.yumekoCards = true;
    await play('yumeko', [Y.intro]);
    let won;
    if (Y.game === 'blackjack') {
      const r = await miniGame(`🃏 ${Y.title}`, 'blackjack', { wallet, dealer: 'Yumeko', bets: Y.bets, onRound: (res) => (res === 'lose' || res === 'bust' ? ' Yumeko: "Ufufu~"' : res === 'win' || res === 'blackjack' ? ' Yumeko: "Ooh, how thrilling!"' : '') });
      won = r.net > 0;
    } else {
      const r = await miniGame(`🎴 ${Y.title}`, 'highlow', { rival: { name: 'Yumeko' } });
      won = r.streak >= 5;
    }
    await play('yumeko', [won ? Y.win : Y.lose]);
    addAff('yumeko', won ? 6 : 3);
    applyLife({ fun: 15 });
    S.time += 30;
    updateHud();
    renderGirlMenu('yumeko');
  }

  // A cosplay photoshoot with Marin: she changes into a costume (and keeps
  // it on for the rest of the day), you direct the poses.
  async function cosplayShoot() {
    const id = 'marin';
    clearMenu();
    await play(id, [['happy', 'A photoshoot?! YES! Which cosplay should I wear?']], true);
    const keys = Object.keys(COSPLAYS);
    const pick = await choose([...keys.map((k) => ({ icon: '🎭', t: COSPLAYS[k].name, note: COSPLAYS[k].series })), { icon: '↩', t: 'Maybe later' }]);
    if (pick === keys.length) { renderGirlMenu(id); return; }
    const c = keys[pick], C = COSPLAYS[c];
    S.daily.cosplayShoot = true;
    setFocus(null);
    await narrate('Marin dashes off with a huge bag of wigs and costume parts...');
    await fade(1, 300);
    S.daily.cosplay = c;
    await fade(0, 300);
    const g = actorPos(id), pl = actorPos('player');
    const flashes = () => { for (const t of [0, 350, 700]) setTimeout(() => { view.flash = 0.8; SFX.click(); }, t); };
    setTimeout(flashes, 700);
    await cutscene({ actors: { [id]: { pose: 'jump', dirEnd: 'down' }, player: { dirEnd: facing(pl, g) } }, focus: { x: (g.x + pl.x) / 2, y: (g.y + pl.y) / 2 - 8 }, dur: 1800, fx: [{ kind: 'sparkle', x: g.x, y: g.y - 28 }], emotes: [{ who: id, kind: 'heart', at: 300, dur: 1400 }, { who: 'player', kind: '!', at: 0, dur: 600 }] });
    await play(id, [C.intro], true);
    const pp = await choose(POSES.map(([, t]) => ({ icon: '📸', t })));
    const best = POSES[pp][0] === C.best;
    await play(id, [best ? ['love', "YES! That's exactly the pose! Click click click!"] : ['happy', 'Like this? Ooh, that works too!']]);
    flashes();
    await wait(900);
    await play(id, [C.done]);
    addAff(id, best ? 7 : 4);
    applyLife({ fun: 20 });
    S.photos = S.photos || [];
    S.photos.push({ ids: [id], cos: c, day: S.day });
    autosave();
    endCut();
    await new Promise((res) => openModal('📸 Cosplay photo', (body) => {
      const box = el('div', 'ending');
      box.appendChild(purikuraCanvas([id], 1.2, c));
      box.appendChild(el('p', '', `Marin as ${esc(C.name)} (${esc(C.series)}) · Day ${S.day}. Saved to your bag.`));
      box.appendChild(button({ icon: '💕', label: 'Amazing!', cls: 'primary', onClick: () => { closeModal(); res(); } }));
      body.appendChild(box);
    }));
    if (!(await advanceTime(60))) return;
    resume();
  }

  // Kurumi is rich: once a week she helps you out if you're short.
  async function kurumiHelp() {
    clearMenu();
    S.kurumiWeek = Math.floor((S.day - 1) / 7);
    await play('kurumi', [['smug', 'Ara ara, short on money? How adorable.'], ['smile', "Here. Consider it a gift from the Tokisaki family. ...Pay me back with your time, {name}."]]);
    S.money += 300; SFX.coin(); updateHud();
    toast('💎 Kurumi gave you ¥300', 'good');
    renderGirlMenu('kurumi');
  }

  // ======================================================= the city
  // Sakuragaoka Station <-> Hoshimachi City by train. Alone you can eat,
  // shop and look around. On a city date (or a group trip with up to three
  // girls) they follow you everywhere, and each place you share (a
  // restaurant, the boutique, the purikura booth, a candlelit dinner) is
  // its own little date scene.
  const FARE = 20;
  async function trainMenu(to) {
    busy();
    const group = cityDate ? cityDate.ids : to === 'city' ? party() : [];
    const fare = group.includes('kurumi') ? 0 : FARE * (1 + group.length);
    const withThem = group.length ? ` with ${namesOf(group)}` : '';
    if (to === 'city') {
      await narrate('🚉 Sakuragaoka Station. The next train to Hoshimachi City leaves in a few minutes.', true);
      const late = S.time >= 1440;
      const pick = await choose([{ icon: '🚆', t: `Ride to Hoshimachi City${withThem}`, note: late ? 'Last train left at midnight' : `¥${fare} · 30m`, disabled: late || S.money < fare }, { icon: '↩', t: 'Never mind' }]);
      if (pick === 1) { S.py += 2; resume(); return; }
      if (group.length && !cityDate) {
        // the group you were walking with comes along: a group date
        for (const k of group) {
          npcs[k].follow.date = true; npcs[k].follow.until = Infinity;
          if (!S.daily['date_' + k]) { S.daily['date_' + k] = true; S.girls[k].dates += 1; }
        }
        cityDate = { ids: group.slice(), done: {} };
      }
    } else {
      await narrate('🚉 Hoshimachi Station. Trains back to Sakuragaoka run until 2am.', true);
      // you can always get home: short on money, you pay what you have
      const pick = await choose([{ icon: '🚆', t: `Ride home${withThem || ' to Sakuragaoka'}`, note: S.money < fare ? `¥${S.money} (all you have)` : `¥${fare} · 30m` }, { icon: '↩', t: 'Look around a bit more' }]);
      if (pick === 1) { S.py += 2; resume(); return; }
    }
    S.money -= Math.min(S.money, fare); SFX.coin(); updateHud();
    await rideTrain(to);
  }

  // The ride itself: everyone sits down, scenery slides past.
  async function rideTrain(to) {
    const ids = cityDate ? cityDate.ids : [];
    busy();
    await fade(1, 400);
    S.inside = 'train';
    const R = INTERIORS.train;
    const door = [R.door * T + 8, (R.MH - 1) * T + 12];
    S.px = door[0]; S.py = door[1]; S.dir = 'up';
    view.scene = 'world';
    $('dialog').hidden = true;
    const seatX = [4, 5, 3, 2];
    const actors = { player: { start: door, path: route(door, [seatX[0] * T + 8, 2 * T + 12]), poseEnd: 'sit', dirEnd: 'down' } };
    ids.forEach((k, i) => { actors[k] = { start: [door[0], door[1] + 14 * (i + 1)], path: [door, ...route(door, [seatX[i + 1] * T + 8, 2 * T + 12])], poseEnd: 'sit', dirEnd: 'down' }; });
    const ride = cutscene({ actors, focus: { x: 4 * T, y: 3 * T }, dur: 2200, emotes: ids.length ? ids.map((k, i) => ({ who: k, kind: i % 2 ? 'note' : 'heart', at: 500 + i * 300, dur: 1400 })) : [{ who: 'player', kind: 'note', at: 600 }] });
    SFX.door();
    await fade(0, 400);
    await ride;
    for (const k of ids) await play(k, [to === 'city' ? CITY[k].train : CITY[k].bye]);
    await narrate(to === 'city' ? 'The train rattles past rice fields and rooftops. Thirty minutes later, the skyline of Hoshimachi rises ahead.' : 'The city lights shrink behind you. Thirty minutes later, the train pulls into sleepy Sakuragaoka.');
    S.time += 30;
    if (S.time >= DAY_END) { endCut(); await passOut(); return; }
    await fade(1, 300);
    endCut();
    if (to === 'city') {
      S.inside = 'city';
      const sp = INTERIORS.city.spawn;
      S.px = sp[0] * T + 8; S.py = sp[1] * T + 12; S.dir = 'down';
    } else {
      S.inside = null;
      const m = WORLD.B.station.mat;
      S.px = m.x * T + 8; S.py = m.y * T + 12; S.dir = 'down';
    }
    syncNPCs();
    enterWorld();
    placeCompanion();
    fade(0, 400);
    if (to !== 'city' && ids.length) endCityDate();
  }

  async function startCityDate(id) {
    const G = GIRLS[id], g = S.girls[id];
    spend(15, 0);
    S.daily['date_' + id] = true;
    g.dates += 1;
    g.knownDates.city = Object.values(CITY[id].prefs).includes('loved') ? 'loved' : 'ok';
    await narrate(`You and ${G.name} head to Sakuragaoka Station together. (Train fare for two: ¥${FARE * 2})`);
    if (id !== 'kurumi') { S.money -= FARE * 2; updateHud(); } else toast('💎 Kurumi pays for the first-class tickets.', 'info');
    for (const k of GIRL_ORDER) if (npcs[k].follow) endFollow(k);
    const n = npcs[id];
    n.follow = { until: Infinity, date: true, favDone: true, lastAff: S.time };
    n.inside = null; n.path = []; n.room = null;
    cityDate = { ids: [id], done: {} };
    addAff(id, 4);
    await rideTrain('city');
    setTimeout(() => toast(`💕 Eat together, try on clothes, take purikura photos or have a candlelit dinner with ${G.name}. Take the train home when you're done.`, 'info'), 1200);
  }
  function endCityDate() {
    if (!cityDate) return;
    const ids = cityDate.ids;
    cityDate = null;
    for (const k of ids) { addAff(k, 3); endFollow(k, `${GIRLS[k].name} waves goodbye at the station ♥`); }
  }
  async function lateTrain() {
    busy();
    await play(cityDate.ids[0], [['sad', "It's getting late... We should catch a train home before the last one leaves."]]);
    await rideTrain('town');
  }

  // Seats for you and n companions: chairs at the nearest tables (two per
  // table) or stools at the sushi counter, closest first.
  function seatsNear(n, only) {
    const seats = [];
    for (const q of INTERIORS[S.inside].spec.props) {
      if (only && q.type !== only) continue;
      if (q.seat) seats.push({ at: [q.x * T + 8, q.y * T + 10], dir: 'up' });
      else if (q.type === 'table') seats.push({ at: [q.x * T - 4, q.y * T + 13], dir: 'right', t: q }, { at: [q.x * T + 20, q.y * T + 13], dir: 'left', t: q });
      else if (q.type === 'finetable') seats.push({ at: [q.x * T + 4, q.y * T + 13], dir: 'right', t: q }, { at: [q.x * T + 28, q.y * T + 13], dir: 'left', t: q });
    }
    const d = (s) => Math.hypot(s.at[0] - S.px, s.at[1] - S.py);
    // keep pairs at the same table together
    const tables = [...new Set(seats.map((s) => s.t))];
    if (tables[0]) {
      tables.sort((a, b) => Math.min(...seats.filter((s) => s.t === a).map(d)) - Math.min(...seats.filter((s) => s.t === b).map(d)));
      return tables.flatMap((t) => seats.filter((s) => s.t === t)).slice(0, n + 1);
    }
    return seats.sort((a, b) => d(a) - d(b)).slice(0, n + 1);
  }
  // Everyone sits down: you first, then each girl on the trip.
  function seatedCut(seats, extra) {
    const ids = cityDate ? cityDate.ids : [];
    const c = Object.assign({ actors: {}, dur: 2200, emotes: [], popups: [], fx: [] }, extra);
    c.actors.player = { path: route([S.px, S.py], seats[0].at), poseEnd: 'sit', dirEnd: seats[0].dir, speed: 90 };
    ids.forEach((k, i) => {
      const n = npcs[k], st = seats[i + 1] || seats[seats.length - 1];
      c.actors[k] = { start: [n.x, n.y], path: route([n.x, n.y], st.at), poseEnd: 'sit', dirEnd: st.dir, speed: 90 };
      c.emotes.push({ who: k, kind: 'heart', at: 800 + i * 250, dur: 1200 });
    });
    const xs = seats.map((s) => s.at[0]), ys = seats.map((s) => s.at[1]);
    c.focus = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 - 10 };
    if (ids.length) c.fx.push({ kind: 'hearts', x: c.focus.x, y: c.focus.y - 10, at: 700 });
    return c;
  }

  // A date moment at a city spot: each girl reacts according to how much
  // she likes it (once per spot per trip).
  async function dateMoment(place, gain = { loved: 8, ok: 5, meh: 2 }) {
    if (!cityDate) return;
    for (const id of cityDate.ids) {
      if (cityDate.done[id + ':' + place]) continue;
      cityDate.done[id + ':' + place] = true;
      const pref = CITY[id].prefs[place] || 'ok';
      await play(id, [CITY[id].lines[place]]);
      addAff(id, gain[pref]);
    }
  }

  async function orderFood(place) {
    const ids = cityDate ? cityDate.ids : [];
    const menu = FOODS[place];
    await narrate(ids.length ? `What will you order? (${namesOf(ids)} ${ids.length > 1 ? 'get' : 'gets'} the same)` : 'What will you order?', true);
    const mult = 1 + ids.length;
    const loo = lifeOn() && place !== 'crepe';
    const pick = await choose([...menu.map(([, label, price, en]) => ({ icon: '🍽️', t: label, note: kurumiPays() ? `💎 Kurumi pays · +${en}⚡` : `¥${price * mult} · +${en}⚡`, disabled: !kurumiPays() && S.money < price * mult })), ...(loo ? [{ icon: '🚻', t: 'Use the restroom' }] : []), { icon: '↩', t: 'Never mind' }]);
    if (loo && pick === menu.length) { await useToilet(); return; }
    if (pick >= menu.length) { resume(); return; }
    const [fid, label, price, en] = menu[pick];
    if (kurumiPays()) toast('💎 Kurumi pays with a black card.', 'info'); else { S.money -= price * mult; SFX.coin(); }
    applyLife({ hunger: en * 2, fun: 5 });
    for (const k of ids) { const G = S.girls[k].life; G.hunger = clamp(G.hunger + en * 2, 0, 100); G.eating = false; }
    S.energy = clamp(S.energy + en, 0, 100); updateHud();
    if (fid === 'kidsmeal') { S.inv.toy = (S.inv.toy || 0) + mult; setTimeout(() => toast(`🪀 Got ${mult > 1 ? mult + ' toys' : 'a toy'}!`, 'good'), 900); }
    let c;
    if (place === 'crepe') {
      c = { actors: { player: { dirEnd: S.dir } }, focus: { x: S.px, y: S.py - 10 }, dur: 1800, emotes: [{ who: 'player', kind: 'note', at: 300 }], fx: [], popups: [] };
      ids.forEach((k, i) => { const n = npcs[k]; c.actors[k] = { start: [n.x, n.y], dirEnd: n.dir }; c.emotes.push({ who: k, kind: 'heart', at: 600 + i * 250 }); });
    } else c = seatedCut(seatsNear(ids.length), { emotes: [{ who: 'player', kind: 'note', at: 500, dur: 1200 }] });
    c.popups.push({ who: 'player', text: `+${en}⚡`, at: 300 });
    await cutscene(c);
    await narrate(rand([`The ${label.toLowerCase()} is hot and delicious.`, `You dig into the ${label.toLowerCase()}. Perfect.`, `Mmm... ${label.toLowerCase()}. Exactly what you needed.`]));
    if (place === 'crepe') {
      for (const k of ids) {
        if (cityDate.done[k + ':crepe']) continue;
        cityDate.done[k + ':crepe'] = true;
        await play(k, [vary(k, 'crepe')]);
        addAff(k, 3);
      }
    } else await dateMoment(place);
    endCut();
    placeCompanion();
    if (!(await advanceTime(30))) return;
    resume();
  }

  async function mallFashion() {
    const ids = cityDate ? cityDate.ids : [];
    if (!ids.length) {
      await narrate('Racks of trendy city clothes. The mirror is very flattering.', true);
      const opts = [{ icon: '✨', t: 'Try on outfits', note: S.daily.cityfashion ? 'Done for today' : '+1 Charm · 30m', disabled: !!S.daily.cityfashion }, { icon: '👗', t: 'Open the wardrobe' }, { icon: '↩', t: 'Never mind' }];
      const pick = await choose(opts);
      if (pick === 2) { resume(); return; }
      if (pick === 1) { resume(); openWardrobe('player', 'casual'); return; }
      S.daily.cityfashion = true;
      applyLife({ fun: 10 });
      S.stats.charm += 1;
      await cutscene({ actors: { player: { pose: 'jump', dirEnd: 'down' } }, focus: { x: S.px, y: S.py - 10 }, dur: 1600, fx: [{ kind: 'sparkle', x: S.px, y: S.py - 24 }], popups: [{ who: 'player', text: '+1 Charm', at: 300 }] });
      await narrate('You find a jacket that fits perfectly. Looking sharp! (+1 Charm)');
      endCut();
      if (!(await advanceTime(30))) return;
      resume();
      return;
    }
    const mirror = INTERIORS[S.inside].spec.props.find((q) => q.type === 'mirror');
    const spot = [mirror.x * T + 8, (mirror.y + 1) * T + 12];
    const actors = { player: { path: route([S.px, S.py], [spot[0] + 24, spot[1] + 10]), dirEnd: 'left', speed: 90 } };
    ids.forEach((k, i) => { const n = npcs[k]; const at = [spot[0] + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 14, spot[1] + (i ? 4 : 0)]; actors[k] = { start: [n.x, n.y], path: route([n.x, n.y], at), poseEnd: 'jump', dirEnd: 'down', speed: 90 }; });
    await cutscene({ actors, focus: { x: spot[0] + 8, y: spot[1] - 6 }, dur: 1800, fx: [{ kind: 'sparkle', x: spot[0], y: spot[1] - 26 }], emotes: [{ who: 'player', kind: '!', at: 300 }, ...ids.map((k, i) => ({ who: k, kind: 'heart', at: 700 + i * 300 }))] });
    await dateMoment('fashion');
    const cost = 60 * ids.length;
    await narrate(`${namesOf(ids)} ${ids.length > 1 ? 'twirl' : 'twirls'} in front of the mirror.`, true);
    const pick = await choose([{ icon: '🛍️', t: ids.length > 1 ? 'Buy everyone their outfit' : 'Buy it for her', note: S.money < cost ? `Need ¥${cost}` : `¥${cost}`, disabled: S.money < cost }, { icon: '💬', t: ids.length > 1 ? '"You all look amazing."' : '"You look amazing."' }]);
    if (pick === 0) {
      S.money -= cost; SFX.coin(); updateHud();
      for (const k of ids) { await play(k, [vary(k, 'outfit')]); addAff(k, 4); }
    } else {
      await play(ids[0], [['blush', rand(['...You think so? Hehe.', "Stop it, you're making me blush."])]]);
    }
    endCut();
    placeCompanion();
    if (!(await advanceTime(30))) return;
    resume();
  }

  // Purikura: a photo booth sticker of everyone, kept in your bag.
  function purikuraCanvas(who, scale = 1, cos = null) {
    const ids = Array.isArray(who) ? who : [who];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 96;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#ff9ad0'; x.fillRect(0, 0, 128, 96);
    x.fillStyle = '#ffe4f0'; x.fillRect(4, 4, 120, 88);
    for (let i = 0; i < 10; i++) { x.fillStyle = ['#ffffff', '#ffe066', '#9ad8ff'][i % 3]; x.fillRect((i * 37) % 120 + 4, (i * 23) % 84 + 6, 2, 2); }
    const people = cos ? ids : ['player', ...ids];
    const w = Math.min(cos ? 66 : 60, Math.floor(120 / people.length)), h = Math.round(w * 4 / 3);
    people.forEach((k, i) => x.drawImage(cos ? SPRITES.get(k, 'happy', false, 'cosplay', { cos }) : SPRITES.get(k, k === 'player' ? 'smile' : 'love', false, null, wopts(k)), 4 + i * w + (120 - w * people.length) / 2, 86 - h, w, h));
    x.drawImage(heartImg, 58, 8, 14, 12); x.drawImage(heartImg, 106, 70, 14, 12); x.drawImage(heartImg, 8, 72, 10, 9);
    x.fillStyle = '#f05a8a'; x.fillRect(4, 84, 120, 8);
    c.style.cssText = `image-rendering:pixelated;width:${128 * scale * 2}px;height:${96 * scale * 2}px;border:2px solid #5b4c78`;
    return c;
  }
  async function purikura() {
    const ids = cityDate ? cityDate.ids : [];
    if (!ids.length) { await narrate('A purikura photo booth covered in hearts. "Couples welcome!" ...Maybe bring someone next time.'); resume(); return; }
    if (ids.every((k) => cityDate.done[k + ':purikura'])) { await play(ids[0], [['smile', "One photo is perfect. Any more and it won't be special."]]); resume(); return; }
    if (S.money < 10) { await narrate("The booth costs ¥10. You don't have enough."); resume(); return; }
    S.money -= 10; SFX.coin(); updateHud();
    const booth = INTERIORS[S.inside].spec.props.find((q) => q.type === 'purikura');
    const front = [booth.x * T + 10, (booth.y + booth.h) * T + 10];
    const actors = { player: { path: route([S.px, S.py], front), dirEnd: 'up', speed: 90 } };
    ids.forEach((k, i) => { const n = npcs[k]; actors[k] = { start: [n.x, n.y], path: route([n.x, n.y], [front[0] + [12, -12, 24][i], front[1] + (i === 2 ? 2 : 0)]), dirEnd: 'up', speed: 90 }; });
    await cutscene({ actors, focus: { x: front[0] + 6, y: front[1] - 14 }, dur: 1600, fx: [{ kind: 'sparkle', x: front[0] + 6, y: front[1] - 30, at: 600 }], emotes: ids.map((k, i) => ({ who: k, kind: 'note', at: i * 200, dur: 600 })) });
    for (const t of [0, 450, 900]) setTimeout(() => { view.flash = 0.9; SFX.click(); }, t);
    await wait(1300);
    await dateMoment('purikura');
    S.photos = S.photos || [];
    S.photos.push({ ids: ids.slice(), day: S.day });
    applyLife({ fun: 15 });
    autosave();
    endCut();
    placeCompanion();
    await new Promise((res) => openModal('📸 Purikura', (body) => {
      const box = el('div', 'ending');
      box.appendChild(purikuraCanvas(ids, 1.2));
      box.appendChild(el('p', '', `You and ${esc(namesOf(ids))} · Day ${S.day}. Saved to your bag.`));
      box.appendChild(button({ icon: '💕', label: 'So cute!', cls: 'primary', onClick: () => { closeModal(); res(); } }));
      body.appendChild(box);
    }));
    if (!(await advanceTime(15))) return;
    resume();
  }

  // Le Ciel Étoilé: a candlelit tasting menu (dinner from 5pm).
  async function fancyDinner() {
    const ids = cityDate ? cityDate.ids : [];
    if (S.time < 1020) { await narrate('The maître d\' bows. "Dinner service begins at 5pm. We look forward to seeing you."'); resume(); return; }
    const price = kurumiPays() ? 0 : 50 * (1 + ids.length);
    await narrate(ids.length ? `"A table for ${ids.length + 1}? Right this way." The tasting menu is ¥${price} for everyone.` : '"A table for one?" The tasting menu is ¥50.', true);
    const pick = await choose([{ icon: '🍷', t: 'Order the tasting menu', note: `¥${price} · +30⚡ · 1h`, disabled: S.money < price }, { icon: '↩', t: 'Maybe another time' }]);
    if (pick === 1) { resume(); return; }
    S.money -= price; SFX.coin(); S.energy = clamp(S.energy + 30, 0, 100);
    applyLife({ hunger: 70, fun: 20 });
    for (const k of ids) { const G = S.girls[k].life; G.hunger = 100; G.fun = clamp(G.fun + 20, 0, 100); G.eating = false; }
    updateHud();
    const seats = seatsNear(ids.length, 'finetable');
    const c = seatedCut(seats, { dur: 2800, emotes: [{ who: 'player', kind: 'note', at: 400, dur: 1400 }] });
    for (const t of new Set(seats.map((s) => s.t))) if (t) c.fx.push({ kind: 'sparkle', x: t.x * T + 16, y: t.y * T - 4, w: 2, h: 2 });
    c.popups.push({ who: 'player', text: '+30⚡', at: 300 });
    await cutscene(c);
    await narrate('Course after course arrives: a tiny soup, a tinier fish, and a chocolate dessert shaped like a swan. A pianist plays softly by the window.');
    if (ids.length) await dateMoment('fancy', { loved: 12, ok: 8, meh: 4 });
    else if (!S.daily.fancySolo) { S.daily.fancySolo = true; S.stats.charm += 1; toast('A refined evening. +1 Charm', 'good'); }
    endCut();
    placeCompanion();
    if (!(await advanceTime(60))) return;
    resume();
  }
  async function playPiano() {
    const ids = cityDate ? cityDate.ids : [];
    const pi = INTERIORS[S.inside].spec.props.find((q) => q.type === 'piano');
    const seat = [(pi.x + 1) * T + 8, (pi.y + pi.h) * T + 8];
    const actors = { player: { path: route([S.px, S.py], seat), poseEnd: 'sit', dirEnd: 'up', speed: 90 } };
    ids.forEach((k, i) => { const n = npcs[k]; actors[k] = { start: [n.x, n.y], path: route([n.x, n.y], [seat[0] + 18 + i * 14, seat[1] + 6]), dirEnd: 'left', speed: 90 }; });
    await cutscene({ actors, focus: { x: seat[0] + 10, y: seat[1] - 12 }, dur: 2400, emotes: [{ who: 'player', kind: 'note', at: 0, dur: 2400 }, ...ids.map((k, i) => ({ who: k, kind: 'heart', at: 900 + i * 300 }))], fx: [{ kind: 'sparkle', x: seat[0], y: seat[1] - 30 }] });
    if (!S.daily.piano) { S.daily.piano = true; S.stats.charm += 1; toast('+1 Charm', 'good'); }
    applyLife({ fun: 10 });
    await narrate(ids.length ? `You play a slow, simple love song. ${namesOf(ids)} ${ids.length > 1 ? 'listen' : 'listens'} with shining eyes.` : 'You play a slow, simple tune. A few diners clap politely.');
    for (const k of ids) if (!cityDate.done[k + ':piano']) { cityDate.done[k + ':piano'] = true; addAff(k, 2); }
    endCut();
    placeCompanion();
    if (!(await advanceTime(15))) return;
    resume();
  }

  // ========================================================== sleepovers
  // At your place once she's a Close Friend, at hers once she's your
  // girlfriend. Pajamas on, a late-night talk on the rug, lights out, and a
  // morning scene. Girlfriends share the bed; otherwise you take the sofa.
  async function sleepover(id) {
    const g = S.girls[id];
    const G = GIRLS[id];
    const SL = SLEEPOVER[id];
    clearMenu();
    const pick = await choose([
      { icon: '🏠', t: 'Stay at my place' },
      { icon: '🌙', t: `Stay at ${G.name}'s place`, note: g.gf ? '' : 'Girlfriends only', disabled: !g.gf },
      { icon: '↩', t: 'Never mind' },
    ]);
    if (pick === 2) { renderGirlMenu(id); return; }
    const hers = pick === 1;
    await play(id, [hers ? SL.hers : SL.mine]);
    for (const k of GIRL_ORDER) if (npcs[k].follow) endFollow(k);
    setFocus(null);
    await fade(1, 400);

    // the room's layout decides where everyone sits, sleeps and cooks
    const room = hers ? 'room_' + id : 'home';
    const R = INTERIORS[room];
    const prop = (type, f = () => true) => R.spec.props.find((q) => q.type === type && f(q));
    const bed = prop('bed'), rug = prop('rug', (q) => q.sit), sofa = prop('sofa'), stove = prop('stove');
    const blanket = bed.color || '#6fa8e8';
    const shared = g.gf;
    const door = [R.door * T + 8, (R.MH - 1) * T + 12];
    const rc = [(rug.x + rug.w / 2) * T, (rug.y + rug.h / 2) * T + 4];
    const seat = [[rc[0] - 8, rc[1]], [rc[0] + 8, rc[1]]];
    S.inside = room;
    S.px = door[0]; S.py = door[1]; S.dir = 'up';
    view.scene = 'world';
    view.forceOutfit = 'pajama';
    $('dialog').hidden = true;

    // 1. come in and sit down on the rug together
    const arrive = cutscene({
      actors: {
        player: { start: door, path: route(door, seat[0]), poseEnd: 'sit', dirEnd: 'right' },
        [id]: { start: [door[0], door[1] + 16], path: [door, ...route(door, seat[1])], poseEnd: 'sit', dirEnd: 'left' },
      },
      focus: { x: rc[0], y: rc[1] - 8 }, dur: 900,
      emotes: [{ who: id, kind: 'note', at: 200 }],
    });
    await fade(0, 500);
    await arrive;
    await play(id, [hers ? SL.room : SL.arrive]);
    await play(id, SL.talk.q, true);
    await runChoice(id, SL.talk.opts);
    await play(id, [shared ? SL.nightGf : SL.night]);

    // 2. lights out: girlfriends share the bed, otherwise you take the sofa
    const by = bed.y * T + 24;
    const spots = shared
      ? { player: { at: [bed.x * T + 8, by], pose: 'sleep' }, [id]: { at: [bed.x * T + 24, by], pose: 'sleep' } }
      : { player: sofa ? { at: [(sofa.x + sofa.w / 2) * T, sofa.y * T + 10], pose: 'sofa' } : { at: [rc[0], rc[1] + 2], pose: 'sofa', blanket: '#e8e0f0' }, [id]: { at: [bed.x * T + 16, by], pose: 'sleep' } };
    const pb = spots.player.pose === 'sleep' ? blanket : spots.player.blanket;
    const night = cutscene({
      actors: {
        player: { start: seat[0], path: route(seat[0], spots.player.at), poseEnd: spots.player.pose, blanket: pb, dirEnd: 'down' },
        [id]: { start: seat[1], path: route(seat[1], spots[id].at), poseEnd: 'sleep', blanket, dirEnd: 'down' },
      },
      focus: { x: (spots.player.at[0] + spots[id].at[0]) / 2, y: (spots.player.at[1] + spots[id].at[1]) / 2 }, dur: 2600,
      emotes: [{ who: id, kind: 'zzz', at: 900, dur: 1700 }, { who: 'player', kind: shared ? 'heart' : 'zzz', at: 300, dur: 2200 }],
      fx: shared ? [{ kind: 'hearts', x: bed.x * T + 16, y: by - 16, at: 200 }] : [],
    });
    setTimeout(() => { if (view.cut) fade(0.7, 900); }, 1200);
    await night;
    await narrate(shared
      ? rand([`You fall asleep side by side, listening to ${G.name}'s breathing slow down.`, `${G.name} curls up against you. The room is warm and quiet.`])
      : rand([`From the sofa, you hear ${G.name} whisper "good night" into the dark.`, `${G.name} wraps herself in your blanket. You fall asleep smiling.`]));

    // 3. morning: she gets up first and makes breakfast in the kitchen
    const stand = spots.player.pose === 'sofa' && sofa ? [(sofa.x + 1) * T + 8, (sofa.y + 1) * T + 12] : [(bed.x + bed.w) * T + 8, (bed.y + 2) * T + 12];
    const cook = [stove.x * T + 8, (stove.y + 1) * T + 12];
    await newDay(100, {
      at: { inside: room, x: stand[0], y: stand[1] },
      morning: async () => {
        view.forceOutfit = 'pajama';
        view.dark = 0.7;
        const asleep = cutscene({
          actors: {
            player: { start: spots.player.at, pose: spots.player.pose, blanket: pb, dir: 'down' },
            [id]: { start: spots[id].at, pose: 'sleep', blanket, dir: 'down' },
          },
          focus: { x: (spots.player.at[0] + spots[id].at[0]) / 2, y: by }, dur: 1400,
          emotes: [{ who: id, kind: 'note', at: 700, dur: 900 }],
        });
        await fade(0, 1200);
        await asleep;
        const pFrom = [spots.player.at[0], spots.player.at[1] + (spots.player.pose === 'sleep' ? 22 : 10)];
        const gFrom = [spots[id].at[0], spots[id].at[1] + 22];
        await cutscene({
          actors: {
            player: { start: pFrom, path: route(pFrom, stand), dirEnd: 'right' },
            [id]: { start: gFrom, path: route(gFrom, cook), dirEnd: 'up' },
          },
          focus: { x: (stand[0] + cook[0]) / 2, y: (stand[1] + cook[1]) / 2 }, dur: 1800,
          fx: [{ kind: 'steam', x: stove.x * T + 3, y: stove.y * T - 8, w: 10, h: 2 }],
          emotes: [{ who: id, kind: 'note', at: 300, dur: 1400 }],
        });
        await play(id, [SL.morning]);
        applyLife({ hunger: 40, fun: 25 });
        addAff(id, g.gf ? 4 : 6);
        await wait(300);
        if (hers) {
          await narrate(`After breakfast, ${G.name} walks you to the door in her pajamas and waves until you turn the corner.`);
          endCut();
          const b = WORLD.B[homeOf(id)] || WORLD.B.home;
          S.inside = null;
          S.px = b.mat.x * T + 8; S.py = b.mat.y * T + 12; S.dir = 'down';
        } else {
          await cutscene({
            actors: { player: { start: stand, dir: 'down' }, [id]: { start: cook, path: [...route(cook, door), [door[0], door[1] + 20]] } },
            focus: { x: (stand[0] + door[0]) / 2, y: (stand[1] + door[1]) / 2 }, dur: 200,
            emotes: [{ who: 'player', kind: 'heart', at: 0, dur: 900 }],
          });
          await narrate(`${G.name} leaves you a plate of breakfast and heads home to change. The house still smells faintly of her shampoo.`);
          endCut();
          S.px = stand[0]; S.py = stand[1]; S.dir = 'down';
        }
        view.forceOutfit = null;
      },
    });
  }

  async function soakTogether(id) {
    const G = GIRLS[id];
    clearMenu();
    S.daily['soak_' + id] = true;
    spend(-30, 10);
    await cutscene({
      actors: { player: { path: [P(5, 5), [88, 62]], poseEnd: 'bath', dirEnd: 'right' }, [id]: { path: [P(6, 5), [106, 62]], poseEnd: 'bath', dirEnd: 'left' } },
      focus: { x: 97, y: 56 }, dur: 2400,
      fx: [{ kind: 'steam', x: 52, y: 40, w: 88, h: 36 }, { kind: 'hearts', x: 97, y: 46, at: 900 }],
      emotes: [{ who: id, kind: 'heart', at: 500, dur: 1800 }, { who: 'player', kind: 'note', at: 1200 }],
      popups: [{ who: 'player', text: '+30⚡', at: 300 }],
    });
    showRel(id);
    await showLine(id, G.dateLines.onsen[1]);
    await showLine('n', rand(['The warm water melts every worry away. Neither of you says anything for a long, comfortable while.', `${G.name} rests her head on the smooth rocks and sighs happily.`, 'Somewhere outside, a cicada sings. The water ripples softly.']));
    addAff(id, 6);
    applyLife({ hygiene: 100, fun: 15 });
    await wait(500);
    endCut();
    if (!(await advanceTime(60))) return;
    resume();
  }

  // She turns you down in her own words.
  async function refuse(id, key) {
    clearMenu();
    await play(id, [vary(id, key)]);
    renderGirlMenu(id);
  }

  async function walkTogether(id) {
    clearMenu();
    S.daily['walk_' + id] = true;
    const grp = party();
    await play(id, [WALK_LINES[id].start]);
    startFollow(id);
    resume();
    if (grp.length) toast(`👭 ${GIRLS[id].name} joins ${namesOf(grp)}! (${grp.length + 1}/${MAX_PARTY})`, 'good');
    else toast(`🚶 ${GIRLS[id].name} is walking with you. Visit her favorite spot, or invite others along (up to ${MAX_PARTY}).`, 'good');
  }

  async function talk(id) {
    const g = S.girls[id];
    const G = GIRLS[id];
    clearMenu();
    if (S.daily['talk_' + id]) {
      await play(id, [pickNew(G.small, 'small_' + id)]);
      renderGirlMenu(id);
      return;
    }
    S.daily['talk_' + id] = true;
    spend(10, 0);
    applyLife({ fun: 4 });
    if (lifeOn() && girlMood(id) === 'stressed' && Math.random() < 0.5) await play(id, [LIFE[id].stressed]);
    if (g.gf) {
      await play(id, [rand(G.gfLines)]);
      addAff(id, 2);
    } else if ((g.events === 0 && g.aff >= 35) || (g.events === 1 && g.aff >= 65)) {
      const ev = G.events[g.events];
      toast(`♥ Heart Event: ${ev.title}`, 'good');
      await play(id, ev.lines, true);
      await runChoice(id, ev.opts);
      g.events += 1;
      if (g.events === 2) { g.reqKnown = true; setTimeout(() => toast(`${G.name}'s heart is almost yours...`, 'good'), 800); }
    } else {
      const avail = G.topics.map((t, i) => i).filter((i) => G.topics[i].min <= g.aff && !g.seen.includes(i));
      if (avail.length) {
        const i = avail[0];
        g.seen.push(i);
        await play(id, G.topics[i].q, true);
        await runChoice(id, G.topics[i].opts);
      } else {
        await play(id, [pickNew(G.small, 'small_' + id)]);
        await narrate(vary(id, 'chatAbout'));
        addAff(id, 2);
      }
    }
    await wait(300);
    if (!(await advanceTime(20))) return;
    resume();
  }

  async function giveGift(id) {
    const items = Object.keys(S.inv).filter((k) => S.inv[k] > 0);
    const idx = await choose([...items.map((k) => ({ icon: ITEMS[k].icon, t: ITEMS[k].name, note: '×' + S.inv[k] })), { icon: '↩', t: 'Never mind' }]);
    if (idx === items.length) { renderGirlMenu(id); return; }
    const k = items[idx];
    S.inv[k] -= 1;
    S.daily['gift_' + id] = true;
    if (k === 'lovepotion') { await drinkPotion(id); return; }
    const pref = GIRLS[id].gifts[k] || 'neutral';
    S.girls[id].known[k] = pref;
    await narrate(`You give ${GIRLS[id].name} the ${ITEMS[k].icon} ${ITEMS[k].name}.`);
    await play(id, GIRLS[id].giftLines[pref]);
    let v = { loved: 10, liked: 5, neutral: 2, disliked: -5 }[pref];
    if (isBirthday(id) && v > 0) {
      await play(id, GIRLS[id].birthdayLines);
      v *= 2;
      toast('🎂 Birthday gift — double affection!', 'good');
    }
    addAff(id, v);
    renderGirlMenu(id);
    await showLine(id, fmt(vary(id, 'anythingElse')), { wait: false });
    setFocus(id, pref === 'disliked' ? 'sad' : 'smile');
  }

  // Frieren's love potion: she drinks it, hearts go everywhere, and her
  // feelings jump past whatever the dates would normally allow.
  async function drinkPotion(id) {
    const G = GIRLS[id];
    const g = S.girls[id];
    g.known.lovepotion = 'loved';
    await narrate(`You hand ${G.name} a little bottle of 🧪 Love Potion. It glows a suspicious pink.`);
    await play(id, id === 'frieren'
      ? [['surprised', '...This is my own potion. You want me to drink it?'], ['calm', "I've lived a thousand years and never tried one. ...Fine. For research."]]
      : [vary(id, 'potionDrink')]);
    const p = actorPos(id);
    await cutscene({
      actors: { [id]: { pose: 'jump', dirEnd: 'down' } },
      focus: { x: p.x, y: p.y - 8 }, dur: 2200,
      fx: [{ kind: 'bubbles', x: p.x - 6, y: p.y - 26, w: 12, h: 4 }, { kind: 'hearts', x: p.x, y: p.y - 30, at: 500 }, { kind: 'sparkle', x: p.x, y: p.y - 20, at: 200 }],
      emotes: [{ who: id, kind: '!', at: 0, dur: 600 }, { who: id, kind: 'heart', at: 700, dur: 1500 }],
      popups: [{ who: id, text: '♥♥♥', at: 900, color: '#ff6b8a' }],
    });
    await play(id, id === 'frieren'
      ? [['blush', '...Oh. My heart is beating very fast. That is... a strong side effect.'], ['love', "I should've sold this for more."]]
      : [vary(id, 'potionLove')]);
    addAff(id, 20, { ignoreCap: true });
    await wait(300);
    endCut();
    renderGirlMenu(id);
    setFocus(id, 'love');
  }

  async function buyPotion(id) {
    clearMenu();
    const price = ITEMS.lovepotion.price;
    await play(id, [['calm', rand(['A love potion. One drop and hearts skip ahead a few chapters.', 'I brewed these from a spell in an old grimoire. Mostly harmless.'])], ['neutral', `¥${price}. No refunds. Do not give it to a mimic.`]], true);
    const pick = await choose([{ icon: '🧪', t: `Buy one (¥${price})`, note: S.inv.lovepotion ? 'own ' + S.inv.lovepotion : '', disabled: S.money < price }, { icon: '↩', t: 'Maybe later' }]);
    if (pick === 0) {
      S.money -= price;
      S.inv.lovepotion = (S.inv.lovepotion || 0) + 1;
      SFX.coin(); updateHud(); autosave();
      toast('Bought 🧪 Love Potion', 'info');
      await showLine(id, rand(['Use it wisely. Or don\'t. I won\'t judge.', 'Give it to someone and watch. It is very effective.']));
    } else await showLine(id, 'Suit yourself.');
    renderGirlMenu(id);
  }

  const DATE_SPOTS = ['city', 'cafe', 'park', 'beach', 'mall', 'arcade', 'shrine', 'flowers', 'cape', 'onsen'];
  const closeEnough = (g) => g.gf || g.aff >= 65;

  async function askDate(id) {
    const g = S.girls[id];
    const G = GIRLS[id];
    clearMenu();
    if (!g.gf && g.aff < 20) {
      await play(id, [vary(id, 'dateEarly')]);
      renderGirlMenu(id);
      return;
    }
    await play(id, [vary(id, 'dateYes')], true);
    const cityNote = S.money < FARE * 2 ? `Need ¥${FARE * 2}` : `¥${FARE * 2} train fare · stay as long as you like`;
    const idx = await choose([...DATE_SPOTS.map((s) => {
      if (s === 'city') return { icon: '🚆', t: 'Hoshimachi City (by train)', note: cityNote, disabled: S.money < FARE * 2 };
      const locked = s === 'onsen' && !closeEnough(g);
      const shut = !isOpen(s);
      const known = g.knownDates[s] ? { loved: '♥ loves it', ok: 'likes it', meh: "isn't a fan" }[g.knownDates[s]] : '';
      return { icon: LOCATIONS[s].icon, t: LOCATIONS[s].name + (s === 'onsen' ? ' (bathe together)' : ''), note: locked ? 'Needs Close Friend' : shut ? 'Closed now' : known, disabled: locked || shut };
    }), { icon: '↩', t: 'Never mind' }]);
    if (idx === DATE_SPOTS.length) { renderGirlMenu(id); return; }
    const spot = DATE_SPOTS[idx];
    if (spot === 'city') { await startCityDate(id); return; }
    spend(25, id === 'kurumi' ? 0 : 30);
    if (id === 'kurumi') toast('💎 Kurumi insists on paying for everything.', 'info');
    S.daily['date_' + id] = true;
    view.scene = spot;
    view.t = slotOf();
    view.girls = [];
    view.forceOutfit = spot === 'beach' ? 'swim' : spot === 'onsen' ? 'towel' : 'casual';
    setFocus(null);
    await narrate(`You and ${G.name} spend a few hours together at ${LOCATIONS[spot].name}.`);
    let pref = G.dates[spot] || 'ok';
    g.knownDates[spot] = pref;
    const outdoor = LOCATIONS[spot].outdoor;
    if (outdoor && isWet()) {
      await play(id, [vary(id, 'dateRain')]);
      pref = 'ok';
    } else if (outdoor && S.weather === 'blossom') {
      await play(id, [vary(id, 'dateBlossom')]);
      pref = 'loved';
    } else {
      const [expr, line] = G.dateLines[spot];
      await play(id, [[expr, line]]);
    }
    addAff(id, { loved: 10, ok: 6, meh: 2 }[pref]);
    applyLife({ fun: 30, hunger: 15, hygiene: -5 });
    if (S.girls[id].life) { const GL = S.girls[id].life; GL.fun = clamp(GL.fun + 30, 0, 100); GL.hunger = clamp(GL.hunger + 15, 0, 100); }
    g.dates += 1;
    const mo = G.moments[(g.dates - 1) % G.moments.length];
    await play(id, mo.q, true);
    await runChoice(id, mo.opts);
    await narrate(rand([`The date comes to an end. ${G.name} waves goodbye with a smile.`, `Time flies. ${G.name} says she had a great time.`, `As you part ways, ${G.name} glances back at you twice.`]));
    // you end up wherever the date was
    S.inside = null;
    const tile = WORLD.B[spot] ? WORLD.B[spot].mat : WORLD.randomTileIn(spot);
    S.px = tile.x * T + 8; S.py = tile.y * T + 12; S.dir = 'down';
    if (!(await advanceTime(180))) return;
    resume();
  }

  async function confess(id) {
    const g = S.girls[id];
    const G = GIRLS[id];
    clearMenu();
    await play(id, G.confess.ask);
    if (!reqMet(id)) {
      await play(id, G.confess.no);
      g.reqKnown = true;
      toast(`Needs: ${G.reqText}`, 'info');
      if (!(await advanceTime(30))) return;
      resume();
      return;
    }
    await play(id, G.confess.yes);
    if (GIRL_ORDER.some((k) => k !== id && S.girls[k].gf)) await play(id, [HAREM[id].confess]);
    g.gf = true;
    g.aff = 100;
    showRel(id);
    SFX.win();
    spawnHearts(10);
    await ending(id);
  }

  async function ending(id) {
    const G = GIRLS[id];
    view.scene = 'park';
    view.t = 2;
    setFocus(id, 'love');
    view.rain = 1;
    if (!S.endingsSeen.includes(id)) S.endingsSeen.push(id);
    autosave(true);
    const all = GIRL_ORDER.every((k) => S.girls[k].gf);
    await wait(1200);
    openModal('♥ Ending ♥', (body) => {
      const box = el('div', 'ending');
      box.appendChild(el('h2', '', esc(G.full)));
      box.appendChild(el('div', '', 'is now your girlfriend!'));
      const big = document.createElement('canvas');
      big.width = 192; big.height = 128;
      const bx = big.getContext('2d');
      bx.imageSmoothingEnabled = false;
      bx.drawImage(SPRITES.get('player', 'calm', false, null, wopts('player')), 0, 0, 96, 128);
      bx.drawImage(SPRITES.get(id, 'love'), 96, 0, 96, 128);
      bx.drawImage(heartImg, 89, 8, 14, 12);
      big.style.cssText = 'image-rendering:pixelated;margin:0 auto;width:192px;height:128px';
      box.appendChild(big);
      box.appendChild(el('p', '', esc(fmt(G.ending))));
      const gfs = GIRL_ORDER.filter((k) => S.girls[k].gf);
      if (gfs.length > 1) box.appendChild(el('p', '', `💞 Your girlfriends: <b style="color:#ffd36b">${esc(namesOf(gfs))}</b>`));
      if (all) box.appendChild(el('p', '', '✿ <b style="color:#ffd36b">True Ending</b> ✿<br>You won every heart in Sakuragaoka. What a life!'));
      box.appendChild(el('p', '', `<span style="color:#b9a9d0">Endings: ${S.endingsSeen.length}/${GIRL_ORDER.length} · Day ${S.day}</span>`));
      box.appendChild(button({ icon: '🌸', label: 'Continue your life in Sakuragaoka', cls: 'primary', onClick: async () => { closeModal(); view.rain = 0; if (await advanceTime(30)) resume(); } }));
      body.appendChild(box);
    }, false);
  }

  // ================================================================ modals
  let modalClosable = true;
  let modalReturn = null;
  function openModal(title, build, closable = true) {
    if (mode === 'world') { modalReturn = 'world'; busy(); }
    $('modal-title').textContent = title;
    const body = $('modal-body');
    body.innerHTML = '';
    build(body);
    modalClosable = closable;
    $('modal-close').style.visibility = closable ? 'visible' : 'hidden';
    $('modal').hidden = false;
  }
  function closeModal() {
    $('modal').hidden = true;
    chatView = null;
    if (modalReturn === 'world') { modalReturn = null; enterWorld(); }
  }
  $('modal-close').addEventListener('click', () => { SFX.click(); closeModal(); });
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal') && modalClosable) closeModal(); });

  function openMap() {
    openModal('🗺️ Town map', (body) => {
      const s = 6;
      const mm = WORLD.minimap(s);
      const c = mm.getContext('2d');
      const dot = (x, y, color, r = 4) => { c.fillStyle = '#1a1424'; c.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2); c.fillStyle = color; c.fillRect(x - r, y - r, r * 2, r * 2); };
      c.font = '10px DotGothic16, monospace';
      c.textAlign = 'center';
      for (const b of Object.values(WORLD.B)) {
        c.fillStyle = 'rgba(20,14,30,.7)';
        const label = b.short || b.name;
        const w = c.measureText(label).width + 6;
        c.fillRect((b.x + b.w / 2) * s - w / 2, (b.y + b.h / 2) * s - 7, w, 13);
        c.fillStyle = '#fff6e0';
        c.fillText(label, (b.x + b.w / 2) * s, (b.y + b.h / 2) * s + 3);
      }
      const lines = [];
      for (const id of GIRL_ORDER) {
        if (!S.girls[id].met) continue;
        const n = npcs[id];
        if (n.inside) {
          const b = WORLD.B[n.inside];
          dot((b.door + 0.5) * s, (b.y + b.h - 0.5) * s, GIRLS[id].color, 3);
          lines.push(`<span style="color:${GIRLS[id].color}">■ ${GIRLS[id].name}</span> — inside ${placeName(n.inside)}`);
        } else {
          dot((n.x / T) * s, (n.y / T) * s, GIRLS[id].color);
          const tl = tileOf(n.x, n.y);
          const a = WORLD.areaAt(tl.x, tl.y);
          const status = n.bld ? 'walking to ' + placeName(n.goal) : a === n.area ? 'at ' + WORLD.AREAS[a].name : 'heading to ' + placeName(n.goal);
          lines.push(`<span style="color:${GIRLS[id].color}">■ ${GIRLS[id].name}</span> — ${status}`);
        }
      }
      const pb = S.inside ? WORLD.B[townBuilding(S.inside)] : null;
      dot(pb ? (pb.door + 0.5) * s : (S.px / T) * s, pb ? (pb.y + pb.h - 0.5) * s : (S.py / T) * s, '#ffffff', 4);
      mm.style.cssText = 'width:100%;image-rendering:pixelated;border:2px solid #5b4c78';
      body.appendChild(mm);
      body.appendChild(el('div', 'loc-desc', '⬜ You' + (S.inside ? ` (${LOCATIONS[S.inside] ? (S.inside === 'city' ? 'in ' : 'inside ') + LOCATIONS[S.inside].name : 'on the train'})` : '')));
      if (lines.length) lines.forEach((l) => body.appendChild(el('div', 'statline', `<span>${l}</span>`)));
      else body.appendChild(el('div', 'loc-desc', 'People you meet will show up here. Try the café in the morning, or the shrine up north.'));
    });
  }

  function openBag() {
    openModal('🎒 Bag', (body) => {
      const items = Object.keys(S.inv).filter((k) => S.inv[k] > 0);
      if (!items.length) body.appendChild(el('div', 'loc-desc', 'Your bag is empty. Buy gifts at the Gift Shop, a soda from the vending machine, or try the arcade claw machine!'));
      for (const k of items) body.appendChild(el('div', 'statline', `<span>${ITEMS[k].icon} ${ITEMS[k].name}</span><span>×${S.inv[k]}</span>`));
      body.appendChild(el('div', 'statline', `<span>🪙 Shrine offerings made</span><span>${S.offerings}</span>`));
      const photos = S.photos || [];
      if (photos.length) {
        body.appendChild(el('div', 'statline', `<span>📸 Photos</span><span>${photos.length}</span>`));
        const row = el('div', 'chips');
        for (const ph of photos.slice(-8).reverse()) { const ids = ph.ids || [ph.id]; const c = purikuraCanvas(ids, 0.5, ph.cos); c.title = `${namesOf(ids)}${ph.cos ? ' (cosplay)' : ''} · day ${ph.day}`; row.appendChild(c); }
        body.appendChild(row);
      }
    });
  }

  const SHOPS = { gift: '🎁 Gift Shop', bakery: '🍯 Honey Bakery', antiques: '⌚ Grimoire Antiques', city: '🛍️ Megamall Gift Boutique' };
  function openShop(kind = 'gift') {
    openModal(SHOPS[kind], (body) => {
      const render = () => {
        body.innerHTML = '';
        body.appendChild(el('div', 'statline', `<span>Your money</span><span style="color:#7ee0a0">¥${S.money}</span>`));
        if (kind === 'antiques') body.appendChild(el('div', 'loc-desc', '🧪 Looking for a love potion? Frieren brews them — ask her directly.'));
        if (lifeOn() && (kind === 'bakery' || kind === 'gift')) {
          body.appendChild(button({ icon: '🛒', label: 'Groceries (3 meals)', note: `¥${GROCERIES} · have ${S.life.groceries}`, disabled: S.money < GROCERIES, onClick: () => { S.money -= GROCERIES; S.life.groceries += 3; SFX.coin(); updateHud(); render(); toast('🛒 Groceries for 3 home-cooked meals', 'info'); } }));
        }
        for (const [k, it] of Object.entries(ITEMS)) {
          if (it.special || (it.shop || 'gift') !== kind) continue;
          body.appendChild(button({
            icon: it.icon, label: it.name + (it.desc ? `<br><span class="muted" style="font-size:12px">${it.desc}</span>` : ''), note: `¥${it.price}${S.inv[k] ? ' · own ' + S.inv[k] : ''}`,
            disabled: S.money < it.price,
            onClick: () => { S.money -= it.price; S.inv[k] = (S.inv[k] || 0) + 1; SFX.coin(); updateHud(); render(); toast(`Bought ${it.icon} ${it.name}`, 'info'); },
          }));
        }
      };
      render();
    });
  }

  // ============================================================ wardrobe
  // Pick what you and the girls wear: your coat colour and beachwear, her
  // one-piece or bikini, swimsuit and towel colours. Stored in S.wardrobe.
  const SWATCH = {
    coat: ['#f4f2ec', '#2a2a3a', '#6a2a3a', '#2a3a6a', '#3a5a3a', '#e8d8b0'],
    suit: ['#d83c4c', '#ff8ab0', '#f4b847', '#5ab85a', '#3b78e0', '#7a4ae0', '#1e1a24', '#f4f4f8'],
    towel: ['#ffffff', '#ffe0b8', '#d0ecff', '#f4d0d8', '#e4f4ec', '#e0d0f4'],
    pj: ['#ffffff', '#c4e0ff', '#ffd0e0', '#e4f4ec', '#fff0b0', '#c8303a', '#3a4a8a', '#2a2832'],
    cas: ['#ffffff', '#1e1a24', '#c83a3a', '#f08ab0', '#f4c83a', '#5ab85a', '#4a6a9a', '#c8b8e8'],
  };
  const PART_COLORS = ['#ffffff', '#f4e8c8', '#c8c4d0', '#5a5664', '#1e1a24', '#d0303a', '#8a1e2e', '#f08ab0', '#f0902a', '#f4d03a', '#d0a040', '#8a5a3a', '#4ab060', '#2a6a3a', '#3ab0b0', '#8ec5f0', '#3b5fc8', '#2a3060', '#8a4ad0', '#c8b0e8'];
  let wardPart = null;
  function openWardrobe(who = 'player', look = 'swim') {
    const wasWorld = mode === 'world' || modalReturn === 'world';
    openModal('👗 Wardrobe', (body) => {
      const ids = ['player', ...GIRL_ORDER.filter((k) => S.girls[k].met)];
      const o = Object.assign({}, S.wardrobe[who] || {});
      const commit = () => {
        const clean = {};
        for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null) clean[k] = v;
        if (Object.keys(clean).length) S.wardrobe[who] = clean; else delete S.wardrobe[who];
        autosave();
        openWardrobe(who, look);
      };
      const set = (k, v) => { o[k] = v; commit(); };

      const chips = el('div', 'chips');
      for (const id of ids) {
        const b = el('button', 'chip' + (id === who ? ' on' : ''));
        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        const x = c.getContext('2d');
        x.imageSmoothingEnabled = false;
        x.drawImage(SPRITES.get(id, 'smile', false, null, wopts(id)), 8, 4, 32, 32, 0, 0, 32, 32);
        b.appendChild(c);
        b.appendChild(el('span', '', id === 'player' ? esc(S.name) : GIRLS[id].name));
        b.addEventListener('click', () => { SFX.click(); openWardrobe(id, look); });
        chips.appendChild(b);
      }
      body.appendChild(chips);
      if (ids.length === 1) body.appendChild(el('div', 'loc-desc', 'Girls you meet will show up here too.'));

      const tabs = el('div', 'tabs');
      [['normal', '👕 Daily'], ['casual', '💃 Date'], ['swim', '🏖️ Beach'], ['towel', '♨️ Onsen'], ['pajama', '🌙 Night']].forEach(([k, label]) => {
        tabs.appendChild(button({ label, cls: k === look ? 'on' : '', onClick: () => openWardrobe(who, k) }));
      });
      body.appendChild(tabs);

      // preview: portrait plus the four walking directions
      const pv = document.createElement('canvas');
      pv.width = 196; pv.height = 64;
      const px = pv.getContext('2d');
      px.imageSmoothingEnabled = false;
      const outfit = look === 'normal' ? (o.daily === 'casual' || o.daily === 'cosplay' ? o.daily : null) : look;
      const oo = Object.keys(o).length ? o : null;
      px.drawImage(SPRITES.get(who, 'smile', false, outfit, oo), 0, 0);
      ['down', 'left', 'right', 'up'].forEach((d, i) => px.drawImage(WALKERS.get(who, d, 0, outfit, oo), 52 + i * 36, 12, 32, 48));
      pv.className = 'wardrobe-preview';
      body.appendChild(pv);

      const row = (label, opts) => {
        const r = el('div', 'wrow');
        r.appendChild(el('div', 'wlabel', label));
        const box = el('div', 'wopts');
        opts.forEach((x) => box.appendChild(x));
        r.appendChild(box);
        body.appendChild(r);
      };
      const pill = (label, on, fn) => { const b = el('button', 'pill' + (on ? ' on' : ''), label); b.addEventListener('click', () => { SFX.click(); fn(); }); return b; };
      const swatches = (key, list) => [
        pill('Default', o[key] === undefined, () => set(key, undefined)),
        ...list.map((c) => { const b = el('button', 'swatch' + (o[key] === c ? ' on' : '')); b.style.background = c; b.title = c; b.addEventListener('click', () => { SFX.click(); set(key, c); }); return b; }),
      ];

      if (look === 'normal') {
        row('Everyday look', [pill(who === 'player' ? 'Usual coat' : 'Her usual outfit', !o.daily, () => set('daily', undefined)), pill('Date clothes', o.daily === 'casual', () => set('daily', 'casual')),
          ...(who === 'marin' ? [pill('🎭 Cosplay', o.daily === 'cosplay', () => { o.cos = o.cos || 'shizuku'; set('daily', 'cosplay'); })] : [])]);
        if (who === 'marin' && o.daily === 'cosplay') row('Costume', Object.keys(COSPLAYS).map((k) => pill(COSPLAYS[k].name, o.cos === k, () => set('cos', k))));
        if (who === 'player' && o.daily !== 'casual') row('Coat', swatches('coat', SWATCH.coat));
      } else if (look === 'casual') {
        const C = SPRITES.CASUAL[who];
        const styles = who === 'player' ? SPRITES.CASUAL_PLAYER : Object.keys(SPRITES.CASUAL_STYLES).filter((k) => !['denim', 'smart'].includes(k));
        row('Date outfit', [
          pill(`${who === 'player' ? 'Default' : 'Her pick'} (${SPRITES.CASUAL_STYLES[C.pick].toLowerCase()})`, o.cas === undefined, () => set('cas', undefined)),
          ...styles.filter((k) => k !== C.pick).map((k) => pill(who === 'player' && k === 'hoodie' ? 'Hoodie & jeans' : SPRITES.CASUAL_STYLES[k], o.cas === k, () => set('cas', k))),
        ]);
        row('Colour', [
          pill('Default', o.casColor === undefined, () => set('casColor', undefined)),
          ...SWATCH.cas.map((c) => { const b = el('button', 'swatch' + (o.casColor === c ? ' on' : '')); b.style.background = c; b.title = c; b.addEventListener('click', () => { SFX.click(); set('casColor', c); }); return b; }),
        ]);
      } else if (look === 'swim') {
        if (who === 'player') {
          row('Beachwear', [pill('Shirt + trunks', o.shirt !== false, () => set('shirt', undefined)), pill('Trunks only', o.shirt === false, () => set('shirt', false))]);
          row('Trunks', swatches('trunks', SWATCH.suit));
        } else {
          const pick = SPRITES.SWIM[who].pick;
          row('Swimsuit', [
            pill(`Her pick (${pick === 'bikini' ? 'bikini' : 'one-piece'})`, o.swim === undefined, () => set('swim', undefined)),
            pill('One-piece', o.swim === 'one', () => set('swim', 'one')),
            pill('Bikini', o.swim === 'bikini', () => set('swim', 'bikini')),
          ]);
          row('Colour', swatches('color', SWATCH.suit));
        }
      } else if (look === 'towel') {
        row('Towel', swatches('towel', SWATCH.towel));
      } else {
        const P = SPRITES.PAJAMA[who];
        const styles = who === 'player' ? SPRITES.PJ_PLAYER : Object.keys(SPRITES.PJ_STYLES);
        row('Sleepwear', [
          pill(`${who === 'player' ? 'Default' : 'Her pick'} (${SPRITES.PJ_STYLES[P.pick].toLowerCase()})`, o.pj === undefined, () => set('pj', undefined)),
          ...styles.filter((k) => k !== P.pick).map((k) => pill(SPRITES.PJ_STYLES[k], o.pj === k, () => set('pj', k))),
        ]);
        row('Colour', [
          pill('Default', o.pjColor === undefined, () => set('pjColor', undefined)),
          ...SWATCH.pj.map((c) => { const b = el('button', 'swatch' + (o.pjColor === c ? ' on' : '')); b.style.background = c; b.title = c; b.addEventListener('click', () => { SFX.click(); set('pjColor', c); }); return b; }),
        ]);
        const capOn = SPRITES.pjLook(who, o).cap;
        row('Nightcap', [pill('On', capOn, () => set('cap', P.cap ? undefined : true)), pill('Off', !capOn, () => set('cap', P.cap ? false : undefined))]);
      }
      // every part of the outfit can take its own colour
      const lk = SPRITES.lookKey(outfit, o);
      const ps = SPRITES.parts(who, outfit, oo);
      if (ps.length) {
        const tint = (o.tint && o.tint[lk]) || {};
        const setTint = (key, c) => {
          const t = Object.assign({}, o.tint || {});
          const mm = Object.assign({}, t[lk] || {});
          if (c) mm[key] = c; else if (key) delete mm[key]; else for (const k of Object.keys(mm)) delete mm[k];
          if (Object.keys(mm).length) t[lk] = mm; else delete t[lk];
          o.tint = Object.keys(t).length ? t : undefined;
          commit();
        };
        if (!ps.some((pt) => pt.key === wardPart)) wardPart = ps[0].key;
        row('🎨 Part colours (tap a part)', ps.map((pt) => {
          const b = el('button', 'pill part' + (pt.key === wardPart ? ' on' : ''), `<span class="pdot" style="background:${tint[pt.key] || pt.color}"></span>${pt.label}`);
          b.addEventListener('click', () => { SFX.click(); wardPart = pt.key; openWardrobe(who, look); });
          return b;
        }));
        const sel = ps.find((pt) => pt.key === wardPart);
        const cur = tint[sel.key];
        const picker = document.createElement('input');
        picker.type = 'color'; picker.className = 'cpick'; picker.value = cur || sel.color; picker.title = 'Any colour';
        picker.addEventListener('change', () => setTint(sel.key, picker.value));
        row(`Colour: ${sel.label}`, [
          pill('Original', !cur, () => setTint(sel.key, null)),
          ...PART_COLORS.map((c) => { const b = el('button', 'swatch' + (cur === c ? ' on' : '')); b.style.background = c; b.title = c; b.addEventListener('click', () => { SFX.click(); setTint(sel.key, c); }); return b; }),
          picker,
        ]);
        if (Object.keys(tint).length) row('', [pill('↺ Original colours for this outfit', false, () => setTint(null, null))]);
      }
      body.appendChild(el('div', 'loc-desc', look === 'swim' ? 'Beachwear is worn on the sand, in the sea and on beach dates.' : look === 'towel' ? 'Towels are worn inside Sakura Onsen and on onsen dates.' : look === 'pajama' ? 'Pajamas are worn when you spend the night together.' : look === 'casual' ? 'Date clothes are worn on dates, on city trips and at Le Ciel Étoilé (dress code!). Choose "Date clothes" on the Daily tab to wear them every day.' : 'Your everyday look around town.'));
      if (S.wardrobe[who]) body.appendChild(button({ icon: '↺', label: 'Reset to default', onClick: () => { delete S.wardrobe[who]; autosave(); openWardrobe(who, look); } }));
    });
    if (wasWorld) modalReturn = 'world';
  }

  function faceCanvas(id, met) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(SPRITES.get(id, met ? 'smile' : 'neutral'), 6, 2, 36, 36, 0, 0, 64, 64);
    if (!met) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#241c30'; x.fillRect(0, 0, 64, 64); }
    return c;
  }

  // ======================================================== WhatsUp (chat app)
  // Texts live in S.msgs: { day, from, text, t, me?, read?, chat? }. `chat`
  // is the thread ('group' for the girlfriends' group chat), else `from`.
  const CHAT_MAX = 240;
  let chatView = null;
  const chatOf = (x) => x.chat || x.from;
  function chatPush(chat, m) {
    S.msgs.push(Object.assign({ day: S.day, t: S.time, from: chat, chat }, m));
    while (S.msgs.length > CHAT_MAX) S.msgs.shift();
  }
  const chatText = (x) => (x.me || !GIRLS[x.from] && x.from !== 'landlord' ? x.text : x.text.replace(/^\S+ [^:]{1,12}: /, (m) => (m.includes((chatWho(x.from) || {}).name + ':') ? '' : m)));
  const chatWho = (k) => (k === 'landlord' ? { name: 'Landlord', color: '#c9b8a0', icon: '🏠' } : k === 'group' ? { name: 'Girlfriends', color: '#ff9ccf', icon: '💞' } : GIRLS[k]);
  const gfIds = () => GIRL_ORDER.filter((k) => S.girls[k].gf);
  function chatAvatar(k) {
    if (GIRLS[k]) { const c = faceCanvas(k, true); c.className = 'wa-av'; return c; }
    return el('div', 'wa-av wa-icon', chatWho(k).icon);
  }

  function chatApp(body, open) {
    const wrap = el('div', 'wa');
    body.appendChild(wrap);
    const threads = [];
    for (const id of GIRL_ORDER) if (S.girls[id].met) threads.push(id);
    if (gfIds().length >= 2) threads.unshift('group');
    if (S.msgs.some((x) => chatOf(x) === 'landlord')) threads.push('landlord');
    const last = (k) => S.msgs.filter((x) => chatOf(x) === k).slice(-1)[0];
    threads.sort((a, b) => { const la = last(a), lb = last(b); return (lb ? lb.day * 2000 + (lb.t || 0) : -1) - (la ? la.day * 2000 + (la.t || 0) : -1); });
    if (!open || !threads.includes(open)) {
      chatView = null;
      wrap.appendChild(el('div', 'wa-bar', '<b>WhatsUp</b><span>💬 chats</span>'));
      if (!threads.length) wrap.appendChild(el('div', 'loc-desc', 'No contacts yet. Meet people around town and they will show up here.'));
      for (const k of threads) {
        const W = chatWho(k), lm = last(k);
        const unread = S.msgs.filter((x) => chatOf(x) === k && !x.me && !x.read).length;
        const row = el('button', 'wa-row');
        row.appendChild(chatAvatar(k));
        const inv = (S.invites || []).find((v) => v.id === k && !v.done && S.time < v.end);
        row.appendChild(el('div', 'wa-mid', `<b style="color:${W.color}">${esc(W.name)}</b><span>${lm ? (lm.me ? '✓✓ ' : '') + esc(chatText(lm)) : '<i>Say hi!</i>'}</span>`));
        row.appendChild(el('div', 'wa-meta', `<span>${lm ? (lm.day === S.day ? clockStr(lm.t || 360) : 'day ' + lm.day) : ''}</span>${unread ? `<span class="wa-badge">${unread}</span>` : inv ? '<span class="wa-badge pin">📍</span>' : ''}`));
        row.addEventListener('click', () => { SFX.click(); openPhone('msgs', k); });
        wrap.appendChild(row);
      }
      return;
    }
    chatView = open;
    const W = chatWho(open);
    for (const x of S.msgs) if (chatOf(x) === open) x.read = true;
    const head = el('div', 'wa-bar');
    const back = el('button', 'wa-back', '‹');
    back.addEventListener('click', () => { SFX.click(); openPhone('msgs'); });
    head.appendChild(back);
    head.appendChild(chatAvatar(open));
    const status = GIRLS[open] ? (S.chatTyping === open ? 'typing…' : npcs[open] && npcs[open].goal ? 'at ' + placeName(npcs[open].goal) : 'online') : open === 'group' ? gfIds().map((k) => GIRLS[k].name).join(', ') : '';
    head.appendChild(el('div', 'wa-mid', `<b style="color:${W.color}">${esc(W.name)}</b><span>${esc(status)}</span>`));
    wrap.appendChild(head);
    const log = el('div', 'wa-log');
    let day = null;
    for (const x of S.msgs.filter((m) => chatOf(m) === open).slice(-40)) {
      if (x.day !== day) { day = x.day; log.appendChild(el('div', 'wa-day', x.day === S.day ? 'Today' : x.day === S.day - 1 ? 'Yesterday' : 'Day ' + x.day)); }
      const b = el('div', 'wa-msg ' + (x.me ? 'out' : 'in'));
      const who = open === 'group' && !x.me && GIRLS[x.from] ? `<b style="color:${GIRLS[x.from].color}">${GIRLS[x.from].name}</b>` : '';
      b.innerHTML = `${who}<span>${esc(chatText(x))}</span><i>${clockStr(x.t || 360)}${x.me ? ' <em>✓✓</em>' : ''}</i>`;
      log.appendChild(b);
    }
    for (const v of S.invites || []) {
      if (v.id !== open) continue;
      const st = v.done ? '✓ met up' : S.time >= v.end ? 'missed' : S.time >= v.start ? 'now!' : 'later today';
      log.appendChild(el('div', 'wa-pin', `📍 ${placeName(v.place)} · ${clockStr(v.start)}–${clockStr(v.end)} · <b>${st}</b>`));
    }
    if (S.chatTyping === open) log.appendChild(el('div', 'wa-msg in typing', '<span>• • •</span>'));
    wrap.appendChild(log);
    setTimeout(() => { log.scrollTop = log.scrollHeight; }, 0);
    if (open === 'landlord') return;
    const quick = el('div', 'wa-quick');
    const say = (text, fn) => {
      const b = el('button', 'wa-chip', text);
      b.disabled = !!S.chatTyping;
      b.addEventListener('click', () => { SFX.click(); chatSend(open, text, fn); });
      quick.appendChild(b);
    };
    if (open === 'group') {
      say('👋 Morning, everyone!', 'group');
      say('🍰 Who wants to hang out?', 'group');
    } else {
      say('👋 Hey! How\'s your day?', 'hey');
      if (!(S.invites || []).some((v) => v.id === open && !v.done && S.time < v.end)) say('📍 Want to meet up later?', 'meet');
      if (S.girls[open].gf) say('❤️ Thinking of you', 'love');
      if (S.time >= 1200 || S.time < 360) say('🌙 Good night', 'night');
    }
    wrap.appendChild(quick);
    // or type anything: she answers in her own words (js/chatbot.js)
    const form = el('form', 'wa-input');
    const input = document.createElement('input');
    input.type = 'text'; input.maxLength = 200; input.placeholder = open === 'group' ? 'Message the group…' : `Message ${W.name}…`;
    input.autocomplete = 'off'; input.enterKeyHint = 'send';
    input.disabled = !!S.chatTyping;
    const send = el('button', 'wa-send', '➤');
    send.type = 'submit'; send.disabled = !!S.chatTyping; send.setAttribute('aria-label', 'Send');
    form.appendChild(input); form.appendChild(send);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.replace(/\s+/g, ' ').trim();
      if (!text || S.chatTyping) return;
      SFX.click();
      chatSend(open, text, 'free');
    });
    wrap.appendChild(form);
    if (chatFocus) setTimeout(() => { if (!input.disabled) input.focus(); }, 0);
  }
  let chatFocus = false;
  function chatCtx(id) {
    S.chatMem = S.chatMem || {};
    const n = npcs[id];
    return {
      name: S.name, aff: S.girls[id].aff, gf: S.girls[id].gf,
      place: n && n.goal ? placeName(n.goal) : 'home', hour: Math.floor(S.time / 60) % 24,
      weather: WEATHER[S.weather].name.toLowerCase(), mood: lifeOn() && S.girls[id].life ? girlMood(id) : 'okay',
      job: LIFE[id] ? LIFE[id].job : '', mem: (S.chatMem[id] = S.chatMem[id] || {}),
      others: GIRL_ORDER.filter((k) => k !== id && S.girls[k].met).map((k) => ({ id: k, name: GIRLS[k].name })),
    };
  }
  // a typed message: the local chat engine decides what she says back
  function freeReply(k, text) {
    if (k === 'group') {
      const ids = gfIds().sort(() => Math.random() - 0.5).slice(0, 2);
      return ids.map((id) => [id, CHATBOT.reply(id, text, chatCtx(id)).lines[0]]);
    }
    const r = CHATBOT.reply(k, text, chatCtx(k));
    if (r.invite) return chatReplies(k, 'meet');
    const used = S.daily['chataff_' + k] || 0;
    if (r.aff > 0 && used < 4) { const v = Math.min(r.aff, 4 - used); S.daily['chataff_' + k] = used + v; addAff(k, v); }
    else if (r.aff < 0) addAff(k, r.aff);
    return r.lines.map((l) => [k, l]);
  }

  // Send a quick reply, then she types back after a moment.
  function chatSend(k, text, kind) {
    chatPush(k, { from: 'me', text, me: true, read: true });
    S.chatTyping = k;
    chatFocus = kind === 'free';
    const refresh = () => { if (S && !$('modal').hidden && chatView === k) openPhone('msgs', k); };
    refresh();
    setTimeout(() => {
      if (!S) return;
      S.chatTyping = null;
      const replies = kind === 'free' ? freeReply(k, text) : chatReplies(k, kind);
      for (const [from, t] of replies) chatPush(k, { from, text: fmt(t), read: chatView === k });
      SFX.msg();
      if (chatView !== k) toast(`💬 ${chatWho(k).name} replied`, 'info');
      autosave();
      refresh();
    }, kind === 'free' ? Math.min(2200, 700 + text.length * 20) : 1100);
  }

  function chatReplies(k, kind) {
    if (k === 'group') {
      const ids = gfIds().sort(() => Math.random() - 0.5).slice(0, 3);
      if (!S.daily.chatgroup) { S.daily.chatgroup = true; for (const id of gfIds()) addAff(id, 1); }
      return ids.map((id) => [id, kind === 'group' && Math.random() < 0.5 ? HAREM[id].pair[1] : rand(CHAT[id].hey)]);
    }
    const C = CHAT[k], g = S.girls[k];
    const day = (key) => { const d = S.daily[key + k]; S.daily[key + k] = true; return !d; };
    if (kind === 'hey') {
      if (day('chathey_')) addAff(k, 2);
      return [[k, rand(C.hey)]];
    }
    if (kind === 'meet') {
      const free = day('chatmeet_') && g.aff >= 20 && S.time < 1200 && (!lifeOn() || girlMood(k) !== 'stressed');
      if (!free) return [[k, C.no]];
      let place = rand(GIRLS[k].invitePlaces);
      if (isWet() && RAIN_SHELTER[place]) place = RAIN_SHELTER[place];
      const start = Math.ceil((S.time + 60) / 30) * 30;
      S.invites.push({ id: k, place, start, end: start + 120, done: false });
      return [[k, C.yes], [k, `📍 ${placeName(place)}, ${clockStr(start)}!`]];
    }
    if (kind === 'love') { if (day('chatlove_')) addAff(k, 2); return [[k, C.love]]; }
    return [[k, C.night]];
  }

  // ======================================================== walkthrough
  const GUIDE_TIPS = {
    nami: 'Loves money talk and the sea. Work café shifts with her for easy hearts.',
    aqua: 'Flatter the goddess and give offerings at the shrine. She is always broke: lend her money in life mode.',
    yumeko: 'Play cards with her: blackjack at the casino or arcade, high-low anywhere else (from 1 heart). Win or lose, she loves the thrill.',
    kurumi: 'The richest girl in town: she lives in Tokisaki Mansion, pays for every date and meal, and will help you out with ¥300 once a week when you are broke (from 4½ hearts).',
    rem: 'Kind, honest answers. She works at the maid café; eat there to see her.',
    zerotwo: 'Bold, teasing answers and honey sweets. Race her on the console!',
    frieren: 'Patient answers and grimoires from Grimoire Antiques. She sleeps in late.',
    marin: 'Be her photographer: from 2 hearts, ask for a cosplay photoshoot (once a day). Match the pose to the costume for bonus hearts. Gift her a wig!',
    krul: 'A night owl: she only goes out after dark. Bring tomato juice.',
  };
  function openGuide(tab = 'basics') {
    const wasWorld = mode === 'world' || modalReturn === 'world';
    openModal('📖 Walkthrough & guide', (body) => {
      const tabs = el('div', 'tabs');
      [['basics', '🌸 Start'], ['girls', '💗 Girls'], ['life', '🏠 Life'], ['fun', '🎮 Fun']].forEach(([k, label]) => tabs.appendChild(button({ label, cls: k === tab ? 'on' : '', onClick: () => openGuide(k) })));
      body.appendChild(tabs);
      const h = el('div', 'help guide');
      const list = (title, items) => `<p><b>${title}</b></p><ol>${items.map((x) => `<li>${x}</li>`).join('')}</ol>`;
      if (tab === 'basics') {
        h.innerHTML = list('Your first week', [
          'Walk around town and talk to everyone. Each girl gets a ♥ meter once you meet her.',
          'Talk to each girl <b>once a day</b> and pick the reply that suits her personality.',
          'Buy gifts at the gift shop, bakery or city stores. The 📱 Hearts tab remembers which gifts she loved.',
          'At 4½ hearts, feelings stall until your <b>first date</b>; at 7½ hearts, until your <b>third</b>.',
          'At 3½ and 6½ hearts, talking to her starts a <b>heart event</b>.',
          'At 9 hearts with both events seen and her requirement met (Charm, Smarts or Fitness), <b>confess</b>.',
        ]) + list('Raising stats', [
          '✨ Charm: shower, the boutique, gym mirror, makeovers.',
          '📖 Smarts: study at the library or your desk.',
          '💪 Fitness: jog, swim, train at the dojo.',
        ]) + '<p><b>Harem route</b>: every girl can be your girlfriend at once. Invite up to three to hang out together, and they will chat with each other.</p>';
      } else if (tab === 'girls') {
        for (const id of GIRL_ORDER) {
          const G = GIRLS[id], g = S && S.girls[id];
          const gifts = Object.entries(G.gifts).filter(([, v]) => v === 'loved').map(([k]) => `${ITEMS[k].icon} ${ITEMS[k].name}`).join(', ');
          const dates = Object.entries(G.dates).filter(([, v]) => v === 'loved').map(([k]) => `${LOCATIONS[k].icon} ${LOCATIONS[k].name}`).join(', ');
          const d = document.createElement('details');
          d.className = 'guide-girl';
          d.innerHTML = `<summary><b style="color:${G.color}">${G.full}</b>${g ? ` <span class="muted">${g.gf ? '💞 girlfriend' : g.met ? stageOf(g) : 'not met yet'}</span>` : ''}</summary>
            <div class="muted">${G.bio}</div>
            <div>📍 ${scheduleText(id)}</div>
            <div>🎁 Loves: ${gifts || '—'}</div>
            <div>💑 Favourite dates: ${dates || '—'}</div>
            <div>💌 To confess: ${G.reqText}</div>
            <div>🎂 Birthday: day ${G.birthday || 28} (gifts count double)</div>
            <div style="color:#ffd36b">💡 ${GUIDE_TIPS[id]}</div>`;
          h.appendChild(d);
        }
      } else if (tab === 'life') {
        h.innerHTML = list('Staying alive (life mode)', [
          '🍔 Hunger: cook at home with groceries (bakery or gift shop), or eat out.',
          '🚽 Bladder: toilets at home, in shops, and the blue public restrooms.',
          '🧼 Hygiene: shower or bathe. Girls notice if you stink!',
          '🎉 Fun: games, the arcade, the beach, dates, the casino.',
          `🏠 Rent is ¥${RENT} every Monday. Miss three weeks and you are evicted.`,
          `💗 Health drops when you are starving or exhausted. Collapse and the clinic bills ¥${HOSPITAL}.`,
        ]) + '<p>The girls have needs and money too. Lend them cash or buy a snack when they are struggling. Pacifist mode (📱 ⚙️) switches all of this off.</p>' + list('Making money', [
          '☕ Café Lumière shifts and 🎀 maid café shifts pay the most per hour.',
          '💻 <b>Work from home</b> at your desk: 3 hours of freelance work, +¥40 plus a Smarts bonus.',
          '🎰 The casino can double your money... or empty your wallet.',
          '💎 Date Kurumi: she pays for dates, train fares and city meals, and helps out once a week if you are broke.',
        ]);
      } else {
        h.innerHTML = list('Games & fun', [
          '🎮 <b>Video games</b>: use the TV at home. Play solo, or with any girl who is with you (walk together, sleepover). Kart Dash, Block Stack, Rhythm Hearts and Brawl Mash.',
          '🕹️ <b>Arcade</b>: each cabinet is a real minigame (¥5). Bring a girl along to play versus.',
          '🎰 <b>Lucky Seven Casino</b> (east of the antique shop, 4pm–2am): slots (¥10/50/100) and blackjack. Yumeko is a regular in the evenings.',
          '🎴 <b>Cards with Yumeko</b>: blackjack at the casino (big stakes) or arcade, high-low at school or anywhere else.',
          '🎭 <b>Cosplay shoots</b> with Marin: three costumes (Shizuku-tan, Rizu-kyun, Magical Girl). Pick the pose that suits the costume.',
          '💬 <b>WhatsUp</b> (📱): type anything to a girl and she replies in her own voice. She remembers what you tell her, and you can ask her to meet up later. With two girlfriends there is a group chat.',
          '🎨 <b>Wardrobe</b>: every outfit part can take its own colour.',
          '🏃‍♀ <b>Run</b> with the RUN button or Shift.',
          '🚆 Take the train to Hoshimachi City for fast food, the Megamall, purikura and a fancy restaurant.',
        ]);
      }
      body.appendChild(h);
    });
    if (wasWorld) modalReturn = 'world';
  }

  function scheduleText(id) {
    const sc = GIRLS[id].schedule;
    const fmtS = (arr) => arr.map(([t, p]) => `${clockStr(t)} ${placeName(p)}`).join(' → ');
    return `<b>Weekdays</b> ${fmtS(sc.weekday)}<br><b>Weekends</b> ${fmtS(sc.weekend)}`;
  }

  function openPhone(tab, chatId) {
    const wasWorld = mode === 'world' || modalReturn === 'world';
    chatView = null;
    openModal('📱 Phone', (body) => {
      const tabs = el('div', 'tabs');
      const unread = (S.msgs || []).filter((x) => !x.me && !x.read).length;
      [['contacts', '💗 Hearts'], ['msgs', `💬 WhatsUp${unread ? ' (' + unread + ')' : ''}`], ['stats', '📊 Me'], ['system', '⚙️']].forEach(([k, label]) => {
        tabs.appendChild(button({ label, cls: k === tab ? 'on' : '', onClick: () => openPhone(k) }));
      });
      body.appendChild(tabs);

      if (tab === 'contacts') {
        for (const id of GIRL_ORDER) {
          const g = S.girls[id];
          const G = GIRLS[id];
          const card = el('div', 'card');
          card.appendChild(faceCanvas(id, g.met));
          const info = el('div', 'info');
          if (!g.met) {
            info.innerHTML = `<div class="name">???</div><div class="muted">Someone you haven't met yet. Explore the town!</div>`;
          } else {
            const known = Object.entries(g.known).map(([k, p]) => `<span class="tag ${p}">${ITEMS[k].icon} ${p}</span>`).join('');
            const dates = Object.entries(g.knownDates).map(([k, p]) => `<span class="tag ${p === 'ok' ? 'liked' : p === 'meh' ? 'disliked' : 'loved'}">${LOCATIONS[k].icon} ${p === 'ok' ? 'liked' : p === 'meh' ? 'meh' : 'loved'}</span>`).join('');
            let goal;
            if (g.gf) goal = '💞 Your girlfriend!';
            else if (g.aff >= capOf(g) && capOf(g) < 100) goal = g.dates === 0 ? '🌸 Ask her on a date to grow closer.' : `🌸 Go on more dates (${g.dates}/3).`;
            else if (g.aff >= 90 && g.events >= 2) goal = reqMet(id) ? "💌 She's waiting for your confession!" : `💌 Before confessing: ${G.reqText}.`;
            else goal = 'Talk every day, give gifts and go on dates.';
            info.innerHTML = `
              <div class="name" style="color:${G.color}">${G.full}</div>
              <div><span class="stage">${stageOf(g)}</span> · <span class="hearts">${heartsHtml(g)}</span></div>
              <div class="muted">${G.bio}</div>
              <div class="muted">${scheduleText(id)}</div>
              <div>Dates: ${g.dates} · Heart events: ${g.events}/2${S.daily['talk_' + id] ? ' · Talked today ✓' : ''}</div>
              <div>🎂 Birthday: day ${G.birthday || 28} of each month${isBirthday(id) ? ' — <b style="color:#ffd36b">today!</b>' : ''}</div>
              ${lifeOn() && g.life ? `<div>💼 ${LIFE[id].job} · ¥${LIFE[id].wage}/day · 💴 savings ¥${Math.round(g.life.money)} · ${MOOD[girlMood(id)]}</div>
              <div class="needbars"><span class="need">🍔<span class="bar"><span style="width:${Math.round(g.life.hunger)}%"></span></span></span><span class="need">⚡<span class="bar"><span style="width:${Math.round(g.life.energy)}%"></span></span></span><span class="need">🎉<span class="bar"><span style="width:${Math.round(g.life.fun)}%"></span></span></span></div>` : ''}
              ${g.reqKnown && !g.gf ? `<div>Needs: ${G.reqText} ${reqMet(id) ? '✓' : ''}</div>` : ''}
              ${known ? `<div>Gifts: ${known}</div>` : ''}
              ${dates ? `<div>Date spots: ${dates}</div>` : ''}
              <div style="color:#ffd36b">${goal}</div>`;
          }
          card.appendChild(info);
          body.appendChild(card);
        }
      } else if (tab === 'msgs') {
        chatApp(body, chatId);
      } else if (tab === 'stats') {
        const lines = [
          ['👤 Name', esc(S.name)], ['📅 Day', `${S.day} (${DAYS[dow()]}) ${clockStr()}`], ['💴 Money', '¥' + S.money], ['⚡ Energy', S.energy],
          ['✨ Charm', S.stats.charm], ['📖 Smarts', S.stats.smarts], ['💪 Fitness', S.stats.fitness], ['🪙 Offerings', S.offerings],
          ['💞 Girlfriends', `${GIRL_ORDER.filter((k) => S.girls[k].gf).length}/${GIRL_ORDER.length}`],
          ['🌤️ Weather', `${WEATHER[S.weather].icon} ${WEATHER[S.weather].name} (tomorrow: check the TV)`],
        ];
        if (lifeOn()) {
          lines.push(...NEEDS.map(([k, icon, name]) => [`${icon} ${name}`, `${Math.round(S.life[k])}%`]));
          lines.push(['🛒 Groceries', `${S.life.groceries} meal${S.life.groceries === 1 ? '' : 's'}`], ['🏠 Rent', `¥${RENT} every Monday${S.life.overdue ? ` · <b style="color:#ff8a8a">${S.life.overdue}/3 weeks overdue</b>` : ''}`]);
        } else lines.push(['🕊️ Mode', 'Pacifist (no needs or rent)']);
        for (const [a, b] of lines) body.appendChild(el('div', 'statline', `<span>${a}</span><span>${b}</span>`));
        body.appendChild(el('div', 'loc-desc', lifeOn() ? 'Eat (cook with groceries, or eat out), use a toilet, shower and have fun. Starving or exhaustion hurts your health. Work at the café or maid café to pay the rent.' : 'Charm 30+ and 60+ make every good conversation a little sweeter.'));
      } else {
        const cloudLine = SAVE.db
          ? (SAVE.cloudErr ? '⚠ Cloud save unavailable right now — saving on this device.' : '☁ Also backed up to your private cloud save.')
          : '📱 Saving on this device (open the game from its claude.ai link to back it up to the cloud).';
        body.appendChild(el('div', 'save-status', `<b>Auto-save is on</b> · Slot ${SAVE.slot} · saved ${SAVE.lastSaved ? timeAgo(SAVE.lastSaved) : 'just now'}<br><span>${cloudLine}</span>`));
        body.appendChild(button({ icon: '💾', label: 'Save now', onClick: () => { autosave(true); toast(`Saved to slot ${SAVE.slot} ✓`, 'info'); openPhone('system'); } }));
        body.appendChild(button({ icon: '📂', label: 'Save to another slot…', onClick: () => slotPicker('save') }));
        body.appendChild(button({ icon: '📥', label: 'Load a slot…', onClick: () => slotPicker('load') }));
        body.appendChild(button({ icon: settings.sound ? '🔊' : '🔇', label: 'Sound: ' + (settings.sound ? 'On' : 'Off'), onClick: () => { settings.sound = !settings.sound; saveSettings(); openPhone('system'); } }));
        body.appendChild(button({ icon: S.pacifist ? '🕊️' : '🏠', label: 'Game mode: ' + (S.pacifist ? 'Pacifist' : 'Life sim'), note: S.pacifist ? 'no needs, rent or game over' : 'needs, rent, bills', onClick: () => {
          S.pacifist = !S.pacifist;
          if (!S.pacifist) { S.life.last = 0; S.life.warned = {}; }
          autosave(true); updateHud(); openPhone('system');
          toast(S.pacifist ? '🕊️ Pacifist mode: needs and rent are switched off.' : '🏠 Life mode: eat, sleep, shower, pay rent. Good luck!', 'info');
        } }));
        body.appendChild(button({ icon: '👗', label: 'Wardrobe', onClick: () => openWardrobe() }));
        body.appendChild(button({ icon: '❓', label: 'How to play', onClick: help }));
        body.appendChild(button({ icon: '📖', label: 'Walkthrough & guide', onClick: () => openGuide() }));
        body.appendChild(button({ icon: '🏠', label: 'Save & return to title', onClick: () => { autosave(true); modalReturn = null; closeModal(); title(); } }));
      }
    });
    if (wasWorld) modalReturn = 'world';
  }

  function help() {
    const wasWorld = mode === 'world' || modalReturn === 'world';
    openModal('❓ How to play', (body) => {
      const h = el('div', 'help');
      h.innerHTML = `
        <p>Welcome to <b>Sakuragaoka</b>! Explore the town, build your life, and win the heart of the girl (or girls ♥) you like.</p>
        <p><b>Moving</b> — Touch and drag anywhere on the screen to use the joystick, or use the arrow keys / WASD. Walk up to a person, door or object and press <b>A</b> (or E / Space). Walk into a door to go inside. ⛶ in the top bar switches to fullscreen.</p>
        <p><b>Time</b> — The clock runs while you're out walking, from 6am until 2am. Activities, talks and dates also take time. Go to bed at home before 2am, or you'll pass out!</p>
        <p><b>The girls</b> — Each girl has her own daily routine: she walks around town, works, studies and goes home at night. Your 📱 Phone shows her routine once you've met her, and the 🗺️ Map shows where she is right now.</p>
        <p><b>Affection ♥</b> — Talk to each girl once a day and pick the replies she'd like. Give gifts she loves. Ask her on dates to places she enjoys.</p>
        <p><b>Dates</b> — Feelings stall at 4½ hearts until your first date, and at 7½ hearts until your third.</p>
        <p><b>Heart events</b> — At 3½ and 6½ hearts, talking to her triggers a special scene.</p>
        <p><b>Confession</b> — At 9 hearts after both heart events, you can confess. Each girl wants someone who meets her standards — build your ✨Charm, 📖Smarts or 💪Fitness!</p>
        <p><b>Town</b> — Sakuragaoka stretches east past the Clock Tower, Sakura Onsen and Forest Lake, to the maid café, Honey Bakery, Grimoire Antiques, the Flower Field and Lighthouse Cape.</p>
        <p><b>Life mode</b> — The bars under the clock are your 🍔 hunger, 🚽 bladder, 🧼 hygiene, 🎉 fun and 💗 health. Cook at home with groceries (bakery or gift shop) or eat out, use toilets (home, shops, the blue public restrooms), shower, and have fun. Rent is ¥${RENT} every Monday. Starving or exhaustion hurts your health; collapse and the clinic bills you. Collapse with no money, or miss rent three weeks running, and it's game over. The girls have jobs, savings and needs too: lend them money or buy them a snack when times are hard. Pacifist mode (📱 ⚙️) turns all of this off.</p>
        <p><b>More than one</b> — You can have as many girlfriends as you like. Walk together with one girl, then use <b>Invite to hang out</b> to bring up to three along. They chat with each other, and the whole group can ride the train to the city.</p>
        <p><b>The city</b> — Sakuragaoka Station has trains to Hoshimachi City (¥20, 30 minutes): fast food, sushi, a Megamall with a purikura booth, and city-only gifts. Ask a girl on a date to the city and she'll come along everywhere.</p>
        <p><b>Your house</b> — Cook at the stove (+energy), shower (+charm), soak in the bath (each once a day), or nap on the sofa.</p>
        <p><b>Buildings</b> — Walk inside and use the furniture: your bed and TV at home, the café counter, library shelves, arcade machines, the dojo's training dummy and more. Walk out through the doorway at the bottom.</p>
        <p><b>Getting closer</b> — Besides talking, try <b>Interact</b> (compliments, jokes, head pats, holding hands, hugs…), <b>Walk together</b> around town, and look out for her texts inviting you to meet up. Birthday gifts count double!</p>
        <p><b>Staying the night</b> — From 8pm to 1am, a Close Friend may stay over at your place. Once she's your girlfriend, you can stay at hers too. Change everyone's pajamas in the 👗 Wardrobe.</p>
        <p><b>Weather</b> — Rain and storms send everyone indoors; a sakura blizzard brings everyone to the park. The TV at home shows tomorrow's forecast.</p>
        <p><b>Games</b> — Play video games on the TV at home, or the arcade cabinets, alone or against a girl who's with you. The Lucky Seven Casino (far east, 4pm–2am) has slots and blackjack. Ask Yumeko to play cards, and Marin for a cosplay photoshoot.</p>
        <p><b>WhatsUp</b> — Text the girls from your 📱 Phone. Type anything and she answers in her own words, remembers what you tell her, and can agree to meet up later. Chat with all your girlfriends in the group.</p>
        <p><b>Running</b> — Tap RUN (or hold Shift) to run.</p>
        <p><b>Money</b> — Work shifts at Café Lumière or the maid café, or work from home at your desk. Spend it on gifts, dates and makeovers. Kurumi is rich: she pays for dates and city trips.</p>
        <p>Stuck? Open the 📖 <b>Walkthrough & guide</b> for every girl's routine, favourite gifts and tips.</p>`;
      body.appendChild(h);
    });
    if (wasWorld) modalReturn = 'world';
  }

  // ========================================================== title & intro
  function title() {
    endCut();
    view.dark = 0;
    S = null;
    mode = 'title';
    $('hud').hidden = true;
    $('dialog').hidden = true;
    $('world-ui').hidden = true;
    $('panel').hidden = false;
    showRel(null);
    $('title-logo').hidden = false;
    view.scene = 'park';
    view.t = 2;
    view.girls = GIRL_ORDER.slice(0, 4);
    view.titleRotate = true;
    view.focus = null;
    view.rain = 0;
    clearMenu();
    const m = $('menu');
    SAVE.slot = null;
    let latest = null;
    for (let n = 1; n <= SLOT_COUNT; n++) {
      const r = slotRecord(n);
      if (r && (!latest || r.savedAt > latest.rec.savedAt)) latest = { n, rec: r };
    }
    if (latest) m.appendChild(button({ icon: '▶', label: 'Continue', note: `Slot ${latest.n} · ${esc(latest.rec.state.name)} · Day ${latest.rec.state.day}`, cls: 'primary', onClick: () => loadSlot(latest.n) }));
    m.appendChild(button({ icon: '📥', label: 'Load game', disabled: !latest, onClick: () => slotPicker('load') }));
    m.appendChild(button({ icon: '🌸', label: 'New game', cls: latest ? '' : 'primary', onClick: () => slotPicker('new') }));
    m.appendChild(button({ icon: '❓', label: 'How to play', onClick: help }));
    m.appendChild(button({ icon: '📖', label: 'Walkthrough & guide', onClick: () => openGuide() }));
    m.appendChild(button({ icon: settings.sound ? '🔊' : '🔇', label: 'Sound: ' + (settings.sound ? 'On' : 'Off'), onClick: () => { settings.sound = !settings.sound; saveSettings(); title(); } }));
  }

  // Slot screen for 'load', 'save' (save current game into a slot) and 'new'.
  function slotPicker(kind) {
    const titles = { load: '📥 Load game', save: '📂 Save to slot', new: '🌸 New game — pick a slot' };
    const wasWorld = mode === 'world' || modalReturn === 'world';
    openModal(titles[kind], (body) => {
      let armed = null; // slot waiting for a second tap to confirm
      const render = () => {
        body.innerHTML = '';
        if (kind === 'save') body.appendChild(el('div', 'loc-desc', 'Saves your current progress into the slot you pick, and keeps playing there.'));
        for (let n = 1; n <= SLOT_COUNT; n++) {
          const rec = slotRecord(n);
          const card = el('div', 'slot-card' + (n === SAVE.slot ? ' current' : ''));
          card.appendChild(el('div', 'slot-head', `<b>Slot ${n}</b>${n === SAVE.slot ? ' <span class="tag liked">playing</span>' : ''}<span class="slot-time">${rec ? 'saved ' + timeAgo(rec.savedAt) : ''}</span>`));
          card.appendChild(el('div', 'slot-info', rec ? slotSummary(rec) : '<span class="muted">Empty slot</span>'));
          const row = el('div', 'row');
          const confirmWord = armed === n;
          if (kind === 'load') {
            row.appendChild(button({ icon: '▶', label: 'Load', disabled: !rec || (n === SAVE.slot && !!S), cls: 'primary', onClick: () => { closeModal(); modalReturn = null; loadSlot(n); } }));
            if (rec) row.appendChild(button({ icon: '🗑️', label: confirmWord ? 'Tap again to delete' : 'Delete', disabled: n === SAVE.slot && !!S, onClick: () => { if (confirmWord) { deleteSlot(n); armed = null; toast(`Slot ${n} deleted`, 'info'); } else armed = n; render(); } }));
          } else if (kind === 'save') {
            row.appendChild(button({ icon: '💾', label: n === SAVE.slot ? 'Save here' : rec && !confirmWord ? 'Overwrite' : rec ? 'Tap again to overwrite' : 'Save here', cls: 'primary', onClick: () => {
              if (rec && n !== SAVE.slot && !confirmWord) { armed = n; render(); return; }
              SAVE.slot = n; autosave(true); toast(`Saved to slot ${n} ✓`, 'info'); closeModal();
            } }));
          } else {
            row.appendChild(button({ icon: '🌸', label: rec ? (confirmWord ? 'Tap again to start over' : 'Start here (overwrite)') : 'Start here', cls: 'primary', onClick: () => {
              if (rec && !confirmWord) { armed = n; render(); return; }
              closeModal(); newGame(n);
            } }));
          }
          card.appendChild(row);
          body.appendChild(card);
        }
        body.appendChild(el('div', 'loc-desc', SAVE.db ? '☁ Slots are backed up to your private cloud save, so they stay between updates and devices.' : '📱 Slots are saved in this browser.'));
      };
      render();
    });
    if (wasWorld && kind !== 'load') modalReturn = 'world';
  }

  async function loadSlot(n) {
    // give the cloud copy a moment to arrive so we don't load a stale one
    if (SAVE.ready) await Promise.race([SAVE.ready, wait(3000)]);
    const rec = slotRecord(n);
    if (!rec) { toast(`Slot ${n} is empty`, 'info'); return; }
    S = migrate(rec.state);
    SAVE.slot = n;
    SAVE.lastSaved = rec.savedAt;
    initNPCs();
    resume();
    toast(`Loaded slot ${n} — Day ${S.day}`, 'info');
  }

  function newGame(slot) {
    openModal('🌸 New game', (body) => {
      const pv = document.createElement('canvas');
      pv.width = 96; pv.height = 128;
      const px = pv.getContext('2d');
      px.imageSmoothingEnabled = false;
      px.drawImage(SPRITES.get('player', 'calm'), 0, 0, 96, 128);
      pv.style.cssText = 'image-rendering:pixelated;width:96px;height:128px;margin:0 auto;display:block;background:#3b3349;border:2px solid #5b4c78';
      body.appendChild(pv);
      body.appendChild(el('div', 'loc-desc', 'What is your name?'));
      const input = el('input', 'name');
      input.id = 'player-name';
      input.maxLength = 14;
      input.value = 'Yuu';
      input.setAttribute('aria-label', 'Your name');
      body.appendChild(input);
      let pacifist = false;
      const modes = el('div', 'tabs');
      const drawModes = () => {
        modes.innerHTML = '';
        modes.appendChild(button({ icon: '🏠', label: 'Life sim', cls: pacifist ? '' : 'on', onClick: () => { pacifist = false; drawModes(); } }));
        modes.appendChild(button({ icon: '🕊️', label: 'Pacifist', cls: pacifist ? 'on' : '', onClick: () => { pacifist = true; drawModes(); } }));
        modeDesc.textContent = pacifist ? 'Pacifist: no hunger, toilets, rent or game over. Just life and love.' : 'Life sim: eat, sleep, use the toilet, shower and pay rent to stay alive. The girls have jobs and bills too.';
      };
      const modeDesc = el('div', 'loc-desc', '');
      body.appendChild(el('div', 'loc-desc', 'Game mode (change it any time in 📱 ⚙️):'));
      body.appendChild(modes); body.appendChild(modeDesc); drawModes();
      body.appendChild(el('div', 'loc-desc', `Saving to slot ${slot}. The game saves automatically as you play.`));
      const go = () => {
        const name = input.value.trim().slice(0, 14) || 'Yuu';
        closeModal();
        startIntro(name, slot, pacifist);
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      body.appendChild(button({ icon: '▶', label: 'Begin', cls: 'primary', onClick: go }));
      setTimeout(() => input.select(), 50);
    });
  }

  async function startIntro(name, slot, pacifist = false) {
    S = newState(name);
    S.pacifist = pacifist;
    SAVE.slot = slot;
    autosave(true);
    initNPCs();
    mode = 'busy';
    $('title-logo').hidden = true;
    view.girls = [];
    view.scene = 'home';
    view.t = 0;
    updateHud();
    clearMenu();
    await narrate('Spring. You have just moved into a little house in the seaside town of Sakuragaoka.');
    await narrate('The cherry blossoms are in full bloom, and the whole town is waking up.');
    await narrate('They say this town is full of interesting people... Maybe this spring, your heart will find a home here too.');
    await narrate('Tip: step outside and explore! Drag anywhere on the screen to walk (or use arrow keys / WASD) and press A to talk or interact. Café Lumière opens at 7am. Your game saves automatically.');
    if (!S.pacifist) await narrate(`Life mode: keep an eye on the bars under the clock. Eat, use the toilet, shower and have fun, and pay ¥${RENT} rent every Monday (work shifts at Café Lumière). There are 3 groceries in your fridge.`);
    autosave(true);
    enterWorld();
  }

  // Test hook for automated play-tests: open index.html?debug
  if (/[?&]debug\b/.test(location.search)) {
    window.__SH = {
      get state() { return S; }, set state(v) { S = v; }, get mode() { return mode; }, get cut() { return view.cut; },
      screenPos() { const c = camera(); return [(snap(S.px) - c.x) * L.worldK, (snap(S.py) - c.y) * L.worldK, c.x * L.worldK, c.y * L.worldK]; },
      SAVE, slotRecord, loadSlot, autosave,
      npcs, initNPCs, resume, enterWorld, enterRoom, girlMenu, newState, advanceTime, startFollow, newDay, runActivity, openWardrobe, outfitFor, openShop, goalFor,
      useProp, openPhone, openGuide, chatPush, cosplayShoot, yumekoCards, renderGirlMenu, playmates,
      get cityDate() { return cityDate; },
    };
  }

  // ================================================================= boot
  function boot() {
    resize();
    requestAnimationFrame(frame);
    connectCloud();
    title();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  }
  boot();
})();
