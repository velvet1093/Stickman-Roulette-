// The open-world town of Sakuragaoka: a 76x40 tile map (16px tiles) with
// buildings, trees, props, collision, A* pathfinding and pre-rendered art.
(function (global) {
  'use strict';
  const { Buf, shade, tint } = PX;
  const T = 16, MW = 90, MH = 40;

  // ----------------------------------------------------------- tile layout
  // . grass  , flowers  = stone road  : dirt path  g gravel  _ sand
  // ~ sea  p pond  d pier boards  w wildflower meadow
  const tiles = [];
  for (let y = 0; y < MH; y++) tiles.push(new Array(MW).fill('.'));
  const fill = (x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (tiles[j] && i >= 0 && i < MW) tiles[j][i] = t; };

  fill(16, 1, 16, 8, 'g');              // shrine grounds
  fill(23, 8, 2, 25, '=');               // main north-south road
  fill(1, 10, MW - 2, 2, '=');           // north road
  fill(1, 20, MW - 2, 2, '=');           // south road
  fill(19, 12, 10, 8, '=');              // plaza
  fill(1, 31, MW - 2, 2, '=');           // promenade
  fill(0, 33, MW, 4, '_');               // beach
  fill(0, 37, MW, 3, '~');               // sea
  fill(36, 33, 2, 7, 'd');               // pier
  fill(28, 24, 6, 3, 'p');               // park pond
  // park dirt loop
  fill(12, 23, 1, 7, ':'); fill(35, 23, 1, 7, ':'); fill(12, 23, 11, 1, ':'); fill(25, 23, 11, 1, ':');
  fill(12, 29, 11, 1, ':'); fill(25, 29, 11, 1, ':');
  // ---- east side of town
  fill(64, 12, 1, 8, '=');               // lane between the bakery and the antique shop
  fill(55, 22, 20, 9, 'w');              // flower field
  fill(55, 26, 20, 1, ':'); fill(64, 22, 1, 9, ':');
  fill(68, 3, 5, 4, 'p');                // forest lake
  fill(67, 4, 1, 2, 'd');                // little dock
  fill(66, 6, 1, 4, ':'); fill(66, 6, 2, 1, ':');
  // flowers sprinkled on grass
  for (let i = 0; i < 120; i++) {
    const x = (i * 37 + 11) % MW, y = (i * 23 + 5) % MH;
    if (tiles[y][x] === '.') tiles[y][x] = ',';
  }

  // -------------------------------------------------------------- buildings
  // door is the column of the door on the building's bottom row; the
  // "mat" tile just below it is where you stand to go in.
  const B = {
    shrinehall: { short: 'Shrine', name: 'Mizu Shrine', x: 21, y: 1, w: 6, h: 4, door: 23, style: 'shrine', enter: false, msg: "The shrine hall. This is where Aqua lives — it's not polite to barge in." },
    school: { name: 'Academy', x: 2, y: 3, w: 10, h: 6, door: 6, style: 'school', enter: true },
    dojo: { name: 'Dojo', x: 36, y: 3, w: 8, h: 6, door: 39, style: 'dojo', enter: true },
    home: { name: 'Home', x: 2, y: 13, w: 6, h: 5, door: 4, style: 'home', enter: true },
    cafe: { short: 'Café', name: 'Café Lumière', x: 10, y: 13, w: 7, h: 5, door: 13, style: 'cafe', enter: true },
    mall: { short: 'Shop', name: 'Gift Shop', x: 30, y: 13, w: 8, h: 5, door: 33, style: 'shop', enter: true },
    arcade: { short: 'Arcade', name: 'Star Arcade', x: 40, y: 13, w: 6, h: 5, door: 42, style: 'arcade', enter: true },
    apartments: { short: 'Apts', name: 'Sakura Apts.', x: 2, y: 23, w: 7, h: 6, door: 5, style: 'apartments', enter: false, msg: 'Sakura Apartments. Nami, Yumeko and Marin live here.' },
    onsen: { short: 'Onsen', name: 'Sakura Onsen', x: 49, y: 3, w: 7, h: 6, door: 52, style: 'onsen', enter: true },
    clocktower: { short: 'Clock', name: 'Clock Tower', x: 59, y: 1, w: 5, h: 8, door: 61, style: 'clocktower', enter: true },
    maidcafe: { short: 'Maid Café', name: 'Café Blue Rose', x: 49, y: 13, w: 7, h: 5, door: 52, style: 'maidcafe', enter: true },
    bakery: { short: 'Bakery', name: 'Honey Bakery', x: 58, y: 13, w: 6, h: 5, door: 60, style: 'bakery', enter: true },
    antiques: { short: 'Antiques', name: 'Grimoire Antiques', x: 66, y: 13, w: 7, h: 5, door: 69, style: 'antiques', enter: true },
    dorm: { short: 'Dorm', name: 'Seaside Dorm', x: 49, y: 23, w: 6, h: 6, door: 51, style: 'dorm', enter: false, msg: "Seaside Dorm. Zero Two's room is the one with honey jars stacked in the window." },
    station: { short: 'Station', name: 'Sakuragaoka Station', x: 38, y: 23, w: 7, h: 5, door: 41, style: 'station', enter: true },
    // the east district
    casino: { short: 'Casino', name: 'Lucky Seven Casino', x: 78, y: 13, w: 8, h: 5, door: 81, style: 'casino', enter: true },
    mansion: { short: 'Mansion', name: 'Tokisaki Mansion', x: 78, y: 23, w: 8, h: 6, door: 81, style: 'mansion', enter: false, msg: "Tokisaki Mansion. A butler peers out at you from behind a velvet curtain. Kurumi lives here, among four hundred clocks." },
  };
  for (const [id, b] of Object.entries(B)) {
    b.id = id;
    b.mat = { x: b.door, y: b.y + b.h };
    fill(b.door, b.y + b.h, 1, 1, tiles[b.y + b.h][b.door] === '.' || tiles[b.y + b.h][b.door] === ',' ? ':' : tiles[b.y + b.h][b.door]);
  }
  // little paths from doors to the roads
  fill(6, 9, 1, 1, ':'); fill(39, 9, 1, 1, ':');
  for (const id of ['home', 'cafe', 'mall', 'arcade', 'maidcafe', 'bakery', 'antiques']) fill(B[id].door, 18, 1, 2, ':');
  fill(5, 29, 1, 2, ':'); fill(51, 29, 1, 2, ':'); fill(41, 29, 1, 2, ':');
  fill(81, 18, 1, 2, ':'); fill(81, 29, 1, 2, ':');
  fill(76, 12, 1, 8, '=');               // lane into the east district
  fill(36, 22, 10, 1, 'r');               // railway behind the station

  // ---------------------------------------------------------------- objects
  // interact: name of the activity it triggers. Solid by default.
  const objects = [];
  const obj = (type, x, y, extra = {}) => objects.push(Object.assign({ type, x, y, solid: true }, extra));

  obj('offering', 25, 5, { interact: 'offer', label: 'Offering box' });
  obj('fortune', 19, 5, { interact: 'fortune', label: 'Fortune stand' });
  obj('lantern', 18, 7); obj('lantern', 29, 7);
  obj('torii', 22, 8, { w: 4 }); // pillars at 22 and 25
  obj('fountain', 22, 14, { w: 4, h: 3 });
  obj('sign', 16, 22, { interact: 'sign', text: '↑ Café · Home · Academy   → Shrine (north)   ↓ Sakura Park · Beach' });
  obj('sign', 37, 9, { interact: 'sign', text: 'Shirogane Dojo — "Strength protects what you love."' });
  obj('board', 21, 23, { interact: 'jog', label: 'Running course' });
  for (const [x, y] of [[15, 26], [19, 27], [31, 28]]) obj('bench', x, y, { interact: 'bench', label: 'Bench' });
  for (const [x, y] of [[12, 34], [30, 34]]) obj('umbrella', x, y, { interact: 'sunbathe', label: 'Beach umbrella' });
  obj('sign', 20, 33, { interact: 'swim', label: 'Swim spot', text: 'Swimming area' });
  for (const [x, y] of [[9, 12], [19, 12], [28, 12], [38, 12], [9, 19], [18, 19], [29, 19], [39, 19], [10, 30], [22, 30], [26, 30], [40, 30]]) obj('lamp', x, y);
  for (const [x, y] of [[20, 13], [27, 13], [20, 18], [27, 18]]) obj('flowerbed', x, y);
  obj('mailbox', 8, 17);
  obj('wc', 29, 17, { interact: 'wc', label: 'Public restroom' });
  obj('wc', 46, 34, { interact: 'wc', label: 'Beach restroom' });
  obj('vending', 17, 17, { interact: 'vending', label: 'Vending machine' });
  // east side
  obj('sign', 47, 22, { interact: 'sign', text: '→ Flower Field · Seaside Dorm · Lighthouse Cape' });
  obj('sign', 57, 9, { interact: 'sign', text: '↑ Sakura Onsen · Clock Tower · Forest Lake' });
  obj('windmill', 71, 23);
  obj('gazebo', 59, 28, { w: 2 });
  for (const [x, y] of [[58, 24], [69, 28], [73, 25]]) obj('flowerpatch', x, y, { interact: 'flowerpick', label: 'Wildflowers' });
  obj('lighthouse', 72, 33);
  obj('telescope', 69, 33, { interact: 'lighthouse', label: 'Telescope' });
  for (const [x, y] of [[66, 34], [74, 35], [70, 36]]) obj('rock', x, y);
  obj('bench', 62, 34, { interact: 'bench', label: 'Bench' });
  for (const [x, y] of [[48, 12], [57, 12], [65, 12], [73, 12], [48, 19], [57, 19], [65, 19], [73, 19], [56, 30], [67, 30]]) obj('lamp', x, y);
  obj('mailbox', 56, 28);
  obj('sign', 77, 21, { interact: 'sign', text: '↑ Lucky Seven Casino (from 4pm)   ↓ Tokisaki Mansion (private)' });
  for (const [x, y] of [[79, 12], [86, 12], [79, 19], [86, 19], [79, 30], [86, 30]]) obj('lamp', x, y);

  const trees = [];
  const tree = (x, y, kind = 'oak') => trees.push({ x, y, kind });
  for (let x = 0; x < MW; x += 2) tree(x, 0, x % 4 ? 'pine' : 'oak');
  for (let y = 2; y < 32; y += 2) { tree(0, y, 'pine'); tree(MW - 1, y, 'pine'); }
  // forest around the lake, a few trees around the east side
  [[65, 2], [66, 4], [73, 2], [74, 4], [65, 8], [73, 7], [70, 8], [71, 1], [67, 1], [57, 2], [57, 6], [47, 4], [47, 7]].forEach(([x, y]) => tree(x, y, 'pine'));
  [[56, 23], [74, 29], [47, 13], [47, 16], [55, 29]].forEach(([x, y]) => tree(x, y, 'oak'));
  [[62, 23], [67, 24], [77, 24], [87, 24], [77, 27], [87, 27]].forEach(([x, y]) => tree(x, y, 'sakura'));
  [[83, 2], [80, 5], [86, 6], [78, 8], [88, 3]].forEach(([x, y]) => tree(x, y, 'pine'));
  [[14, 2], [14, 5], [33, 2], [33, 5], [16, 9], [31, 9], [20, 1], [28, 1]].forEach(([x, y]) => tree(x, y, 'pine'));
  [[14, 24], [17, 25], [20, 26], [14, 27], [27, 28], [33, 28], [17, 28], [26, 25], [34, 26], [21, 27]].forEach(([x, y]) => tree(x, y, 'sakura'));
  [[12, 3], [13, 7], [34, 7], [46, 25], [11, 26], [9, 27]].forEach(([x, y]) => tree(x, y, 'oak'));

  // ------------------------------------------------------------- collision
  const solid = [];
  for (let y = 0; y < MH; y++) solid.push(tiles[y].map((t) => t === '~' || t === 'p' || t === 'r'));
  for (let y = 33; y < MH; y++) for (let x = 36; x < 38; x++) solid[y][x] = false; // pier over water
  for (let y = 4; y < 6; y++) solid[y][67] = false; // lake dock
  for (const b of Object.values(B)) for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) solid[j][i] = true;
  for (const o of objects) {
    if (o.type === 'torii') { solid[o.y][o.x] = true; solid[o.y][o.x + 3] = true; continue; }
    if (o.type === 'fountain') { for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) solid[o.y + j][o.x + i] = true; continue; }
    if (o.type === 'umbrella') { solid[o.y][o.x] = true; continue; }
    if (o.type === 'gazebo') { solid[o.y][o.x] = true; solid[o.y][o.x + 1] = true; continue; }
    if (o.solid) solid[o.y][o.x] = true;
  }
  for (const t of trees) if (solid[t.y]) solid[t.y][t.x] = true;

  function isSolid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
    return solid[ty][tx];
  }

  // ------------------------------------------------------------------ areas
  const AREAS = {
    park: { name: 'Sakura Park', x: 11, y: 22, w: 25, h: 9, bg: 'park' },
    beach: { name: 'Seaside Beach', x: 1, y: 33, w: 62, h: 4, bg: 'beach' },
    cape: { name: 'Lighthouse Cape', x: 63, y: 33, w: 26, h: 4, bg: 'cape' },
    flowers: { name: 'Flower Field', x: 55, y: 22, w: 20, h: 9, bg: 'flowers' },
    lake: { name: 'Forest Lake', x: 64, y: 1, w: 11, h: 9, bg: 'park' },
    shrine: { name: 'Mizu Shrine', x: 16, y: 5, w: 16, h: 4, bg: 'shrine' },
    plaza: { name: 'Town Plaza', x: 19, y: 12, w: 10, h: 8, bg: 'park' },
  };
  function areaAt(tx, ty) {
    for (const [id, a] of Object.entries(AREAS)) if (tx >= a.x && ty >= a.y && tx < a.x + a.w && ty < a.y + a.h) return id;
    return null;
  }
  function randomTileIn(areaId, rnd = Math.random) {
    const a = AREAS[areaId];
    for (let k = 0; k < 60; k++) {
      const x = a.x + Math.floor(rnd() * a.w), y = a.y + Math.floor(rnd() * a.h);
      if (!isSolid(x, y)) return { x, y };
    }
    return { x: 23, y: a.y + 1 };
  }

  // ---------------------------------------------------------------- A* path
  function findPath(sx, sy, gx, gy) {
    if (sx === gx && sy === gy) return [];
    const key = (x, y) => y * MW + x;
    const open = [[sx, sy]];
    const g = new Map([[key(sx, sy), 0]]);
    const from = new Map();
    const f = new Map([[key(sx, sy), Math.abs(gx - sx) + Math.abs(gy - sy)]]);
    const closed = new Set();
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f.get(key(...open[i])) < f.get(key(...open[bi]))) bi = i;
      const [cx, cy] = open.splice(bi, 1)[0];
      const ck = key(cx, cy);
      if (cx === gx && cy === gy) {
        const path = [[cx, cy]];
        let k = ck;
        while (from.has(k)) { k = from.get(k); path.push([k % MW, Math.floor(k / MW)]); }
        path.pop();
        return path.reverse();
      }
      closed.add(ck);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, nk = key(nx, ny);
        if (closed.has(nk) || (isSolid(nx, ny) && !(nx === gx && ny === gy))) continue;
        const ng = g.get(ck) + 1;
        if (!g.has(nk) || ng < g.get(nk)) {
          g.set(nk, ng);
          f.set(nk, ng + Math.abs(gx - nx) + Math.abs(gy - ny));
          from.set(nk, ck);
          if (!open.some(([ox, oy]) => ox === nx && oy === ny)) open.push([nx, ny]);
        }
      }
    }
    return null;
  }

  // ------------------------------------------------------------- tile art
  const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

  const GROUND = {
    '.': '#86cc6e', ',': '#86cc6e', 'w': '#8ad070', '=': '#d8d0c4', ':': '#dcc398', 'g': '#e4dccc', '_': '#f4dca0', '~': '#3aa0e0', 'p': '#4ab0e0', 'd': '#b88a5a', 'r': '#9a948a',
  };

  function drawTile(b, t, x, y) {
    const ox = x * T, oy = y * T;
    const base = GROUND[t] || GROUND['.'];
    b.rect(ox, oy, T, T, base);
    const r = hash(x, y);
    if (t === 'w') {
      const cols = ['#ffffff', '#f6b8cc', '#ffe066', '#b8c8ff', '#ff8aa8', '#c8a0f0'];
      for (let i = 0; i < 9; i++) {
        const px = ox + Math.floor(hash(x * 7 + i, y) * 15), py = oy + Math.floor(hash(x, y * 5 + i) * 15);
        b.set(px, py + 1, '#5aa04a');
        b.set(px, py, cols[(i + x + y) % cols.length]);
        if (i % 2) b.set(px + 1, py, cols[(i + x * 3) % cols.length]);
      }
    } else if (t === '.' || t === ',') {
      for (let i = 0; i < 5; i++) {
        const px = ox + Math.floor(hash(x + i * 7, y) * 15), py = oy + Math.floor(hash(x, y + i * 11) * 14);
        b.set(px, py, '#6fb85c'); b.set(px + 1, py - 1, '#6fb85c');
      }
      if (r > 0.8) { b.set(ox + 4, oy + 9, '#a8de8a'); b.set(ox + 11, oy + 4, '#a8de8a'); }
      if (t === ',') {
        const fc = ['#ffffff', '#f6b8cc', '#ffe066', '#b8c8ff'][Math.floor(r * 4)];
        [[3, 4], [10, 10], [12, 3], [6, 12]].forEach(([dx, dy], i) => { if (hash(x * 3 + i, y) > 0.35) { b.set(ox + dx, oy + dy, fc); b.set(ox + dx + 1, oy + dy, '#f2d36b'); } });
      }
    } else if (t === '=') {
      b.rect(ox, oy + 7, T, 1, '#c4bab0'); b.rect(ox, oy + 15, T, 1, '#c4bab0');
      const off = y % 2 ? 0 : 8;
      b.rect(ox + off, oy, 1, 7, '#c4bab0'); b.rect(ox + (off + 8) % 16, oy + 8, 1, 7, '#c4bab0');
      if (r > 0.7) b.set(ox + 4, oy + 3, '#e8e2d8');
    } else if (t === ':') {
      for (let i = 0; i < 4; i++) b.set(ox + Math.floor(hash(x, y + i) * 15), oy + Math.floor(hash(x + i, y) * 15), '#c4a878');
    } else if (t === 'g') {
      for (let i = 0; i < 8; i++) b.set(ox + Math.floor(hash(x + i, y * 3) * 16), oy + Math.floor(hash(x * 5, y + i) * 16), i % 2 ? '#cfc6b4' : '#f4efe4');
    } else if (t === '_') {
      for (let i = 0; i < 4; i++) b.set(ox + Math.floor(hash(x + i, y) * 16), oy + Math.floor(hash(x, y + i * 3) * 16), '#e4c888');
      if (r > 0.93) { b.rect(ox + 6, oy + 7, 3, 2, '#f7c8d8'); }
    } else if (t === '~' || t === 'p') {
      b.rect(ox + ((x * 5) % 10), oy + 4, 5, 1, t === '~' ? '#5ab8f0' : '#6ac8f0');
      b.rect(ox + ((x * 3 + 6) % 10), oy + 11, 4, 1, t === '~' ? '#5ab8f0' : '#6ac8f0');
    } else if (t === 'r') {
      for (let i = 0; i < T; i += 4) b.rect(ox + i, oy + 2, 2, 12, '#7a4e30');
      b.rect(ox, oy + 4, T, 2, '#c0c4cc'); b.rect(ox, oy + 10, T, 2, '#c0c4cc'); b.rect(ox, oy + 4, T, 1, '#e8eaf0'); b.rect(ox, oy + 10, T, 1, '#e8eaf0');
    } else if (t === 'd') {
      for (let j = 0; j < T; j += 4) b.rect(ox, oy + j, T, 1, '#8a5a3a');
      b.rect(ox + (x % 2 ? 15 : 0), oy, 1, T, '#6a4028');
    }
  }

  // soft edges where paths, sand and water meet grass
  function drawEdges(b) {
    const isGrass = (t) => t === '.' || t === ',' || t === 'w';
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const t = tiles[y][x];
      if (isGrass(t)) continue;
      const ox = x * T, oy = y * T;
      const edge = t === '~' ? '#2a80c0' : t === 'p' ? '#3a90c0' : t === '_' ? '#e0c080' : shade(GROUND[t], 0.18);
      if (y > 0 && isGrass(tiles[y - 1][x])) b.rect(ox, oy, T, 1, edge);
      if (y < MH - 1 && isGrass(tiles[y + 1][x])) b.rect(ox, oy + T - 1, T, 1, edge);
      if (x > 0 && isGrass(tiles[y][x - 1])) b.rect(ox, oy, 1, T, edge);
      if (x < MW - 1 && isGrass(tiles[y][x + 1])) b.rect(ox + T - 1, oy, 1, T, edge);
      if (t === '~' && y > 0 && tiles[y - 1][x] === '_') { b.rect(ox, oy, T, 2, '#ffffff'); b.rect(ox + 3, oy + 2, 6, 1, '#d8f0ff'); }
    }
  }

  // ------------------------------------------------------------ buildings
  const STYLES = {
    home: { roof: '#5a7ad8', wall: '#f4e6d0', trim: '#8a5a3a' },
    cafe: { roof: '#8a4a3a', wall: '#f4e0c0', trim: '#5a3a2a', awning: '#4aa070' },
    shop: { roof: '#c84a6a', wall: '#fff0f4', trim: '#8a3a5a', awning: '#f05a8a' },
    arcade: { roof: '#4a3a8a', wall: '#6a5ac8', trim: '#2a2050', awning: '#ff6ad5' },
    school: { roof: '#4a6a8a', wall: '#ece4d4', trim: '#7a6a5a' },
    dojo: { roof: '#5a5a6a', wall: '#8a5a3a', trim: '#4a2e1c' },
    shrine: { roof: '#3a3a4a', wall: '#d8343c', trim: '#f4efe6' },
    apartments: { roof: '#7a7a8a', wall: '#d8d4e4', trim: '#5a5a6a' },
    onsen: { roof: '#4a4a6a', wall: '#e8d8c0', trim: '#7a4e30' },
    clocktower: { roof: '#3e4a6a', wall: '#c8b8a0', trim: '#6a5a4a' },
    maidcafe: { roof: '#f08ab0', wall: '#ffffff', trim: '#5a8ad8', awning: '#5a8ad8' },
    bakery: { roof: '#c8803a', wall: '#fff0d0', trim: '#8a5a3a', awning: '#f2b84a' },
    antiques: { roof: '#3a5a4a', wall: '#b8a888', trim: '#4a3a2a' },
    dorm: { roof: '#5a8ab0', wall: '#f0e8e0', trim: '#6a6a7a' },
    casino: { roof: '#2a1a3a', wall: '#3a2448', trim: '#d6aa44', awning: '#c8203a' },
    mansion: { roof: '#7a1e2e', wall: '#f4efe6', trim: '#d6aa44' },
    station: { roof: '#3a5a8a', wall: '#e4e8ee', trim: '#4a5a6a' },
  };

  function drawBuilding(b, bd) {
    const s = STYLES[bd.style];
    const X = bd.x * T, Y = bd.y * T, Wp = bd.w * T, Hp = bd.h * T;
    const roofH = Math.floor(Hp * (bd.style === 'clocktower' ? 0.22 : bd.style === 'school' || bd.style === 'apartments' || bd.style === 'dorm' ? 0.34 : 0.48));
    const wallY = Y + roofH;
    // walls
    b.rect(X + 2, wallY, Wp - 4, Hp - roofH, s.wall);
    b.rect(X + 2, Y + Hp - 3, Wp - 4, 3, shade(s.wall, 0.25));
    if (bd.style === 'dojo') for (let i = X + 6; i < X + Wp - 4; i += 10) b.rect(i, wallY, 2, Hp - roofH, '#6a4028');
    // roof
    if (bd.style === 'shrine' || bd.style === 'dojo') {
      b.poly([[X - 4, Y + roofH + 2], [X + Wp + 4, Y + roofH + 2], [X + Wp - 6, Y + 4], [X + 6, Y + 4]], s.roof);
      b.rect(X + 4, Y + 2, Wp - 8, 4, shade(s.roof, 0.2));
      b.rect(X - 4, Y + roofH, Wp + 8, 3, shade(s.roof, 0.3));
      if (bd.style === 'shrine') { b.rect(X + Wp / 2 - 6, Y + 8, 12, 8, '#f2d36b'); b.rect(X + Wp / 2 - 4, Y + 10, 8, 4, '#d6aa44'); }
    } else {
      b.rect(X, Y + 2, Wp, roofH, s.roof);
      for (let j = Y + 6; j < Y + roofH; j += 5) b.rect(X, j, Wp, 1, shade(s.roof, 0.2));
      b.rect(X, Y + 2, Wp, 2, tint(s.roof, 0.25));
      b.rect(X - 1, Y + roofH, Wp + 2, 2, shade(s.roof, 0.35));
    }
    if (bd.style === 'home') { b.rect(X + Wp - 20, Y - 4, 8, 12, '#a8724a'); b.rect(X + Wp - 21, Y - 5, 10, 2, '#7a4e30'); }
    if (bd.style === 'clocktower') {
      // pointed spire and a big clock face
      b.poly([[X - 2, Y + roofH + 2], [X + Wp / 2, Y - 14], [X + Wp + 2, Y + roofH + 2]], s.roof);
      b.line(X + Wp / 2, Y - 14, X + Wp / 2, Y - 20, '#d6aa44');
      const cy = Y + roofH + 18;
      b.ellipse(X + Wp / 2, cy, 17, 17, '#d6aa44'); b.ellipse(X + Wp / 2, cy, 15, 15, '#fffaf0');
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.set(Math.round(X + Wp / 2 + Math.cos(a) * 12), Math.round(cy + Math.sin(a) * 12), '#3a3a4a'); }
      b.line(X + Wp / 2, cy, X + Wp / 2, cy - 10, '#3a3a4a'); b.line(X + Wp / 2, cy, X + Wp / 2 + 7, cy + 3, '#3a3a4a');
      for (const wy of [cy + 26, cy + 46]) { b.rect(X + Wp / 2 - 4, wy, 8, 10, '#6a5a4a'); b.rect(X + Wp / 2 - 3, wy + 1, 6, 8, '#a8d8f0'); }
    }
    if (bd.style === 'onsen') {
      b.rect(X + Wp - 22, Y - 8, 8, 14, '#8a8a96'); b.rect(X + Wp - 23, Y - 9, 10, 2, '#6a6a76');
      b.ellipse(X + Wp - 18, Y - 14, 5, 3, '#f4f4f8'); b.ellipse(X + Wp - 14, Y - 19, 4, 3, '#e8e8f0');
      b.rect(X + 8, wallY + 2, 18, 10, '#2a3a6a'); b.rect(X + 11, wallY + 4, 12, 6, '#ffffff'); b.rect(X + 14, wallY + 5, 6, 4, '#d8343c');
    }
    if (bd.style === 'casino') {
      // neon marquee, slot-machine sevens, a red carpet to the door
      b.rect(X + 4, wallY + 7, Wp - 8, 9, '#1a1024'); b.rect(X + 5, wallY + 8, Wp - 10, 7, '#ff5aa0');
      for (let i = X + 9; i < X + Wp - 9; i += 8) b.rect(i, wallY + 10, 4, 3, '#ffe066');
      for (let i = X + 2; i < X + Wp - 2; i += 4) b.set(i, Y + 3, i % 8 ? '#ffe066' : '#ff5aa0');
      for (const sx of [X + 8, X + Wp - 20]) { b.rect(sx, wallY + 20, 12, 14, '#d6aa44'); b.rect(sx + 2, wallY + 22, 8, 6, '#ffffff'); b.rect(sx + 3, wallY + 23, 2, 4, '#d8343c'); b.rect(sx + 6, wallY + 23, 2, 4, '#d8343c'); }
    }
    if (bd.style === 'mansion') {
      // white columns, a gold crest and a wrought-iron fence
      for (let i = X + 6; i < X + Wp - 4; i += 18) b.rect(i, wallY, 4, Hp - roofH - 3, '#ffffff');
      b.ellipse(X + Wp / 2, Y + roofH / 2 + 2, 7, 6, '#d6aa44'); b.ellipse(X + Wp / 2, Y + roofH / 2 + 2, 4, 4, '#7a1e2e');
      b.rect(X - 2, Y + Hp - 6, Wp + 4, 1, '#2a2a36'); for (let i = X - 2; i < X + Wp + 2; i += 4) { if (Math.abs(i - (bd.door * T + 8)) < 10) continue; b.rect(i, Y + Hp - 10, 1, 8, '#2a2a36'); b.set(i, Y + Hp - 11, '#d6aa44'); }
    }
    if (bd.style === 'station') {
      // canopy over the entrance, a round clock and a little train at the platform
      b.rect(X + Wp / 2 - 22, wallY + 2, 44, 4, '#5a6a7a'); b.rect(X + Wp / 2 - 22, wallY + 6, 44, 1, '#3a4a5a');
      b.ellipse(X + Wp / 2, Y + roofH / 2 + 2, 7, 7, '#ffffff'); b.ellipse(X + Wp / 2, Y + roofH / 2 + 2, 5, 5, '#f4efe6');
      b.line(X + Wp / 2, Y + roofH / 2 + 2, X + Wp / 2, Y + roofH / 2 - 2, '#3a3a4a'); b.line(X + Wp / 2, Y + roofH / 2 + 2, X + Wp / 2 + 3, Y + roofH / 2 + 3, '#3a3a4a');
      b.rect(X + 6, wallY + 9, 26, 7, '#2a4a8a'); b.rect(X + 8, wallY + 11, 22, 3, '#ffffff');
      const tx = X + Wp - 30, ty = Y - 6;
      b.rect(tx, ty, 34, 14, '#f4f4f8'); b.rect(tx, ty + 9, 34, 3, '#5ab85a'); b.rect(tx + 3, ty + 2, 6, 5, '#a8d8f0'); b.rect(tx + 12, ty + 2, 6, 5, '#a8d8f0'); b.rect(tx + 21, ty + 2, 6, 5, '#a8d8f0');
      b.rect(tx + 30, ty + 2, 4, 7, '#2a2a36');
    }
    if (bd.style === 'maidcafe') { b.ellipse(X + Wp - 12, wallY + 16, 5, 5, '#f08ab0'); b.ellipse(X + Wp - 12, wallY + 16, 2, 2, '#ffffff'); }
    if (bd.style === 'bakery') { b.ellipse(X + 12, wallY + 15, 6, 4, '#e0a050'); b.rect(X + 7, wallY + 14, 10, 2, '#f2d36b'); }
    if (bd.style === 'antiques') { b.rect(X + Wp - 18, wallY + 8, 10, 12, '#d6aa44'); b.ellipse(X + Wp - 13, wallY + 14, 3, 3, '#3a5a4a'); }
    if (bd.style === 'school') { b.ellipse(X + Wp / 2, Y + roofH / 2 + 2, 8, 8, '#ffffff'); b.ellipse(X + Wp / 2, Y + roofH / 2 + 2, 6, 6, '#f4efe6'); b.line(X + Wp / 2, Y + roofH / 2 + 2, X + Wp / 2, Y + roofH / 2 - 3, '#3a3a4a'); b.line(X + Wp / 2, Y + roofH / 2 + 2, X + Wp / 2 + 3, Y + roofH / 2 + 2, '#3a3a4a'); }

    // windows
    const lights = [];
    const winRows = bd.style === 'school' || bd.style === 'apartments' || bd.style === 'dorm' ? 2 : bd.style === 'clocktower' ? 0 : 1;
    const rowH = (Hp - roofH - 6) / winRows;
    for (let r = 0; r < winRows; r++) {
      for (let wx = X + 8; wx < X + Wp - 14; wx += 18) {
        if (r === winRows - 1 && Math.abs(wx + 5 - (bd.door * T + 8)) < 14) continue;
        const wy = Math.floor(wallY + 5 + r * rowH);
        if (bd.style === 'shrine' || bd.style === 'dojo') { b.rect(wx, wy, 10, 9, '#f8f2e0'); b.rect(wx + 5, wy, 1, 9, '#b89a6a'); b.rect(wx, wy + 4, 10, 1, '#b89a6a'); }
        else { b.rect(wx - 1, wy - 1, 12, 11, s.trim); b.rect(wx, wy, 10, 9, '#a8d8f0'); b.rect(wx, wy, 10, 2, '#d8f0ff'); b.rect(wx + 5, wy, 1, 9, s.trim); }
        lights.push({ x: wx, y: wy, w: 10, h: 9 });
      }
    }
    // awning
    if (s.awning) {
      for (let i = 0; i < Wp - 4; i += 6) b.rect(X + 2 + i, wallY, 6, 5, (i / 6) % 2 ? '#ffffff' : s.awning);
      b.rect(X + 2, wallY + 5, Wp - 4, 1, shade(s.awning, 0.3));
    }
    // door
    const dx = bd.door * T + 3, dy = Y + Hp - 15;
    if (bd.style === 'shrine') { b.rect(dx - 2, dy - 2, 14, 15, '#5a2a22'); b.rect(dx, dy, 10, 13, '#7a3a2a'); }
    else if (bd.style === 'onsen') { b.rect(dx - 1, dy - 1, 12, 15, s.trim); b.rect(dx, dy, 10, 13, '#3a2a22'); b.rect(dx - 1, dy - 1, 5, 7, '#d8343c'); b.rect(dx + 6, dy - 1, 5, 7, '#2a4ac8'); }
    else {
      b.rect(dx - 1, dy - 1, 12, 15, s.trim);
      b.rect(dx, dy, 10, 13, bd.style === 'arcade' ? '#1e1832' : '#a8724a');
      if (bd.style !== 'arcade') { b.rect(dx + 1, dy + 1, 8, 4, '#c8945e'); b.set(dx + 8, dy + 7, '#f2d36b'); }
      else b.rect(dx + 2, dy + 2, 6, 9, '#3a2a6a');
    }
    if (bd.style === 'arcade') { b.rect(X + 6, wallY + 7, Wp - 12, 5, '#ff6ad5'); b.rect(X + 10, wallY + 8, Wp - 20, 3, '#6af0ff'); }
    if (bd.style === 'cafe') { b.ellipse(X + Wp - 10, wallY + 14, 5, 5, '#f4efe6'); b.rect(X + Wp - 12, wallY + 12, 4, 4, '#8a5a3a'); }
    if (bd.style === 'shop') { b.ellipse(X + 12, wallY + 16, 4, 4, '#f6b8cc'); b.rect(X + 10, wallY + 19, 4, 3, '#4aa070'); }
    bd.lights = lights;
  }

  // ---------------------------------------------------------------- props
  function propSprite(o) {
    let b;
    switch (o.type) {
      case 'lamp':
        b = new Buf(16, 32);
        b.rect(7, 8, 2, 22, '#3a3a4a'); b.rect(5, 29, 6, 2, '#2a2a36');
        b.rect(4, 3, 8, 6, '#3a3a4a'); b.rect(5, 4, 6, 4, '#fff2b0');
        b.rect(6, 1, 4, 2, '#3a3a4a');
        return { b, ox: 0, oy: -16 };
      case 'bench':
        b = new Buf(16, 16);
        b.rect(0, 3, 16, 3, '#a8724a'); b.rect(0, 8, 16, 3, '#c48a5a'); b.rect(1, 11, 2, 4, '#4a3a32'); b.rect(13, 11, 2, 4, '#4a3a32');
        b.outline(0.5); return { b, ox: 0, oy: 0 };
      case 'sign':
        b = new Buf(16, 16);
        b.rect(7, 8, 2, 8, '#7a4e30'); b.rect(1, 1, 14, 8, '#c89a60'); b.rect(3, 3, 10, 1, '#7a4e30'); b.rect(3, 5, 7, 1, '#7a4e30');
        b.outline(0.5); return { b, ox: 0, oy: 0 };
      case 'board':
        b = new Buf(16, 16);
        b.rect(2, 9, 2, 7, '#7a4e30'); b.rect(12, 9, 2, 7, '#7a4e30'); b.rect(0, 1, 16, 9, '#5a8ad8'); b.rect(2, 3, 12, 5, '#ffffff'); b.rect(3, 5, 4, 1, '#f05a6a'); b.rect(8, 4, 4, 3, '#4aa070');
        b.outline(0.5); return { b, ox: 0, oy: 0 };
      case 'offering':
        b = new Buf(16, 16);
        b.rect(1, 5, 14, 10, '#8a5a3a'); b.rect(0, 3, 16, 3, '#6a4028'); for (let i = 2; i < 14; i += 3) b.rect(i, 7, 2, 1, '#2a1a10'); b.rect(5, 10, 6, 3, '#f2d36b');
        b.outline(0.5); return { b, ox: 0, oy: 0 };
      case 'fortune':
        b = new Buf(16, 24);
        b.rect(1, 4, 14, 18, '#d8343c'); b.rect(3, 7, 10, 8, '#f8f2e0'); b.rect(5, 9, 6, 1, '#2a2a2a'); b.rect(5, 12, 4, 1, '#2a2a2a'); b.rect(0, 2, 16, 3, '#3a3a4a');
        b.outline(0.5); return { b, ox: 0, oy: -8 };
      case 'lantern':
        b = new Buf(16, 24);
        b.rect(4, 2, 8, 3, '#9a9aa6'); b.rect(5, 5, 6, 6, '#b6b6c0'); b.rect(6, 6, 4, 3, '#ffe08a'); b.rect(3, 11, 10, 2, '#8a8a96'); b.rect(6, 13, 4, 8, '#9a9aa6'); b.rect(4, 21, 8, 3, '#8a8a96');
        b.outline(0.5); return { b, ox: 0, oy: -8 };
      case 'torii':
        b = new Buf(64, 48);
        b.rect(2, 4, 60, 5, '#d8343c'); b.rect(0, 2, 64, 3, '#2a2a2a'); b.rect(6, 14, 52, 4, '#d8343c');
        b.rect(4, 8, 8, 40, '#d8343c'); b.rect(52, 8, 8, 40, '#d8343c'); b.rect(6, 8, 2, 40, '#f05a5a'); b.rect(54, 8, 2, 40, '#f05a5a');
        b.rect(4, 43, 8, 5, '#2a2a2a'); b.rect(52, 43, 8, 5, '#2a2a2a'); b.rect(28, 8, 8, 6, '#2a2a2a');
        b.outline(0.5); return { b, ox: 0, oy: -32 };
      case 'fountain':
        b = new Buf(64, 48);
        b.ellipse(32, 30, 31, 16, '#b8b8c4'); b.ellipse(32, 30, 27, 13, '#5ab8f0'); b.ellipse(32, 30, 24, 10, '#7ac8f8');
        b.rect(29, 8, 6, 24, '#c8c8d4'); b.ellipse(32, 10, 9, 4, '#b8b8c4'); b.ellipse(32, 9, 7, 3, '#7ac8f8');
        b.rect(31, 2, 2, 6, '#d8f0ff'); b.set(28, 5, '#d8f0ff'); b.set(36, 5, '#d8f0ff');
        b.outline(0.5); return { b, ox: 0, oy: 0 };
      case 'umbrella':
        b = new Buf(32, 40);
        b.rect(15, 10, 2, 30, '#f4f4f4'); b.poly([[0, 14], [32, 14], [26, 6], [16, 2], [6, 6]], '#f05a6a'); b.poly([[12, 14], [20, 14], [18, 5], [16, 2], [14, 5]], '#ffffff');
        b.rect(2, 34, 26, 4, '#5ab8f0'); b.rect(2, 34, 26, 1, '#9ad8ff');
        b.outline(0.5); return { b, ox: -8, oy: -24 };
      case 'flowerbed':
        b = new Buf(16, 16);
        b.rect(0, 4, 16, 12, '#8a5a3a'); b.rect(1, 5, 14, 10, '#5a3a2a');
        for (let i = 0; i < 8; i++) { b.set(2 + (i * 5) % 12, 6 + (i * 3) % 8, ['#ff8aa8', '#ffe066', '#ffffff', '#b8a0ff'][i % 4]); b.set(3 + (i * 5) % 12, 6 + (i * 3) % 8, '#4f9a5a'); }
        b.outline(0.5); return { b, ox: 0, oy: 0 };
      case 'wc':
        b = new Buf(16, 28);
        b.rect(1, 4, 14, 24, '#6a9ad8'); b.rect(0, 2, 16, 3, '#3a5a9a'); b.rect(4, 12, 8, 16, '#3a5a9a'); b.rect(5, 13, 6, 14, '#5a8ac8');
        b.rect(3, 6, 10, 5, '#ffffff'); b.rect(4, 7, 2, 3, '#3a5ad8'); b.rect(10, 7, 2, 3, '#e05a6a'); b.rect(7, 7, 2, 3, '#3a3a4a');
        b.set(10, 20, '#d6aa44');
        b.outline(0.5); return { b, ox: 0, oy: -12 };
      case 'mailbox':
        b = new Buf(16, 16);
        b.rect(7, 8, 2, 8, '#5a5a6a'); b.rect(3, 2, 10, 7, '#d8343c'); b.rect(3, 2, 10, 2, '#f05a5a'); b.rect(6, 5, 4, 1, '#2a2a2a');
        b.outline(0.5); return { b, ox: 0, oy: 0 };
      case 'windmill':
        b = new Buf(48, 64);
        b.poly([[18, 22], [30, 22], [34, 62], [14, 62]], '#f4efe6'); b.rect(14, 60, 20, 4, '#c8b8a0');
        b.poly([[16, 24], [32, 24], [24, 14]], '#c84a3a');
        b.rect(21, 48, 6, 14, '#8a5a3a'); b.rect(22, 34, 4, 5, '#a8d8f0');
        b.line(24, 20, 4, 4, '#7a4e30'); b.line(24, 20, 44, 4, '#7a4e30'); b.line(24, 20, 6, 38, '#7a4e30'); b.line(24, 20, 42, 38, '#7a4e30');
        b.poly([[24, 20], [6, 2], [10, 1]], '#f8f2e0'); b.poly([[24, 20], [44, 6], [45, 10]], '#f8f2e0'); b.poly([[24, 20], [4, 34], [7, 38]], '#f8f2e0'); b.poly([[24, 20], [42, 36], [38, 39]], '#f8f2e0');
        b.ellipse(24, 20, 3, 3, '#5a3a2a');
        b.outline(0.5); return { b, ox: -16, oy: -48 };
      case 'gazebo':
        b = new Buf(32, 40);
        b.poly([[0, 16], [32, 16], [16, 2]], '#c84a6a'); b.rect(0, 15, 32, 3, '#a83a5a');
        b.rect(2, 18, 3, 20, '#f4efe6'); b.rect(27, 18, 3, 20, '#f4efe6'); b.rect(0, 36, 32, 4, '#c8b8a0');
        b.rect(14, 0, 4, 3, '#d6aa44');
        b.outline(0.5); return { b, ox: 0, oy: -24 };
      case 'flowerpatch':
        b = new Buf(16, 16);
        for (let i = 0; i < 10; i++) { const x = 2 + (i * 5) % 12, y = 3 + (i * 7) % 10; b.rect(x, y + 1, 1, 3, '#4a9a4a'); b.ellipse(x, y, 1.6, 1.6, ['#ff6a9a', '#ffe066', '#ffffff', '#b070f0', '#ff9a4a'][i % 5]); }
        return { b, ox: 0, oy: 0 };
      case 'lighthouse':
        b = new Buf(32, 88);
        b.poly([[9, 20], [23, 20], [27, 84], [5, 84]], '#ffffff');
        for (const y of [32, 52, 72]) b.poly([[7, y], [25, y], [26, y + 8], [6, y + 8]], '#d8343c');
        b.rect(7, 12, 18, 9, '#3a3a4a'); b.rect(9, 13, 14, 7, '#ffe9a0'); b.poly([[6, 12], [26, 12], [16, 2]], '#d8343c');
        b.rect(4, 20, 24, 2, '#3a3a4a'); b.rect(13, 74, 6, 10, '#5a3a2a'); b.rect(2, 84, 28, 4, '#8a8a96');
        b.outline(0.5); return { b, ox: -8, oy: -72 };
      case 'telescope':
        b = new Buf(16, 24);
        b.line(8, 10, 3, 23, '#5a5a6a'); b.line(8, 10, 13, 23, '#5a5a6a'); b.line(8, 10, 8, 23, '#5a5a6a');
        b.poly([[2, 4], [14, 8], [13, 11], [1, 7]], '#d6aa44'); b.rect(1, 4, 2, 4, '#3a3a4a');
        b.outline(0.5); return { b, ox: 0, oy: -8 };
      case 'rock':
        b = new Buf(16, 16);
        b.ellipse(8, 10, 7, 5, '#8a8a96'); b.ellipse(6, 8, 4, 3, '#a8a8b4'); b.set(5, 7, '#c8c8d4');
        b.outline(0.5); return { b, ox: 0, oy: 0 };
      case 'vending':
        b = new Buf(16, 24);
        b.rect(1, 1, 14, 23, '#e8e8f0'); b.rect(3, 3, 10, 10, '#9ad8ff'); for (let i = 0; i < 3; i++) { b.rect(4 + i * 3, 5, 2, 3, ['#f05a6a', '#4aa070', '#f2d36b'][i]); b.rect(4 + i * 3, 9, 2, 3, ['#5a8ad8', '#f05a8a', '#ffffff'][i]); } b.rect(4, 16, 8, 3, '#3a3a4a');
        b.outline(0.5); return { b, ox: 0, oy: -8 };
      default:
        return null;
    }
  }

  function treeSprite(kind) {
    const b = new Buf(32, 44);
    b.rect(13, 30, 6, 12, '#7a4e30'); b.rect(14, 30, 2, 12, '#9a6a44');
    b.ellipse(16, 42, 8, 2, '#5a3a2a');
    if (kind === 'pine') {
      b.poly([[16, 0], [28, 18], [22, 18], [30, 32], [2, 32], [10, 18], [4, 18]], '#3f8048');
      b.poly([[16, 2], [22, 14], [16, 12]], '#5aa060');
      b.poly([[16, 16], [24, 28], [16, 26]], '#5aa060');
    } else {
      const c = kind === 'sakura' ? ['#f6b8cc', '#fbd2df', '#e895b0'] : ['#4f9a5a', '#6cbf6a', '#3f8048'];
      b.ellipse(16, 18, 15, 13, c[0]);
      b.ellipse(10, 14, 7, 6, c[1]);
      b.ellipse(22, 24, 7, 5, c[2]);
      b.ellipse(19, 10, 5, 4, c[1]);
      if (kind === 'sakura') for (let i = 0; i < 8; i++) b.set(4 + (i * 7) % 24, 8 + (i * 5) % 18, '#ffffff');
    }
    b.outline(0.5);
    return b.toCanvas(1);
  }

  // ---------------------------------------------------------------- render
  let staticCv = null;
  const propCache = new Map();
  const treeCache = {};

  function staticCanvas() {
    if (staticCv) return staticCv;
    const b = new Buf(MW * T, MH * T);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) drawTile(b, tiles[y][x], x, y);
    drawEdges(b);
    const bb = new Buf(MW * T, MH * T);
    for (const bd of Object.values(B)) drawBuilding(bb, bd);
    bb.outline(0.55);
    b.draw(bb);
    staticCv = fastCanvas(b);
    return staticCv;
  }

  // Large buffers: write through ImageData instead of per-pixel fillRect.
  function fastCanvas(b) {
    const cv = document.createElement('canvas');
    cv.width = b.w; cv.height = b.h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(b.w, b.h);
    const memo = new Map();
    for (let i = 0; i < b.d.length; i++) {
      const v = b.d[i];
      if (!v) continue;
      let rgb = memo.get(v);
      if (!rgb) { rgb = PX.hexToRgb(v); memo.set(v, rgb); }
      img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // Tall things that need y-sorting with characters.
  function drawables() {
    const out = [];
    for (const t of trees) {
      if (!treeCache[t.kind]) treeCache[t.kind] = treeSprite(t.kind);
      out.push({ y: t.y * T + 15, img: treeCache[t.kind], x: t.x * T - 8, top: t.y * T - 28 });
    }
    for (const o of objects) {
      if (!propCache.has(o.type)) { const p = propSprite(o); propCache.set(o.type, p && { cv: p.b.toCanvas(1), ox: p.ox, oy: p.oy }); }
      const p = propCache.get(o.type);
      if (!p) continue;
      const footY = o.type === 'fountain' ? (o.y + o.h) * T - 2 : o.type === 'torii' ? o.y * T + 15 : o.y * T + 14;
      out.push({ y: footY, img: p.cv, x: o.x * T + p.ox, top: o.y * T + p.oy });
    }
    return out;
  }

  const LAMPS = objects.filter((o) => o.type === 'lamp' || o.type === 'lantern').map((o) => ({ x: o.x * T + 8, y: o.y * T + (o.type === 'lamp' ? -10 : 0) }));

  function windowLights() {
    staticCanvas();
    const out = [];
    for (const bd of Object.values(B)) for (const l of bd.lights || []) out.push(l);
    return out;
  }

  function minimap(s = 3) {
    const cv = document.createElement('canvas');
    cv.width = MW * s; cv.height = MH * s;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      ctx.fillStyle = GROUND[tiles[y][x]] || GROUND['.'];
      ctx.fillRect(x * s, y * s, s, s);
    }
    for (const t of trees) { ctx.fillStyle = t.kind === 'sakura' ? '#e895b0' : '#3f8048'; ctx.fillRect(t.x * s, t.y * s, s, s); }
    for (const bd of Object.values(B)) { ctx.fillStyle = STYLES[bd.style].roof; ctx.fillRect(bd.x * s, bd.y * s, bd.w * s, bd.h * s); }
    return cv;
  }

  global.WORLD = { T, MW, MH, tiles, B, AREAS, objects, trees, isSolid, findPath, randomTileIn, areaAt, staticCanvas, drawables, LAMPS, windowLights, minimap };
})(window);
