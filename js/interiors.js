// Walk-around building interiors. Each room is a small tile map (16px tiles)
// with the same interface the town map exposes to the game: collision,
// pathfinding, a pre-rendered floor/wall canvas, y-sorted props and
// interactable furniture.
(function (global) {
  'use strict';
  const { Buf, shade, tint } = PX;
  const T = 16;

  // ---------------------------------------------------------- room specs
  // Rows 0-1 are the back wall. `door` is the column of the exit in the
  // bottom row. Props: { type, x, y, w, h, act, label, walk } — `walk`
  // props (rugs, mats) are floor decorations you can stand on.
  const ROOMS = {
    // Your house: bedroom (left), living room with the front door (middle),
    // open kitchen (top right) and a walled bathroom (bottom right).
    home: {
      name: 'Your House', w: 18, h: 12, door: 9, floor: 'wood', wall: ['#c9b8e0', '#bda9d6'],
      spawn: [9, 10], wake: [3, 4],
      wallDecor: [{ type: 'window', x: 2 }, { type: 'clock', x: 8 }, { type: 'poster', x: 10 }, { type: 'backsplash', x: 13, w: 5 }],
      props: [
        { type: 'tilefloor', x: 13, y: 2, w: 5, h: 5, walk: true, color: 'kitchen' },
        { type: 'tilefloor', x: 13, y: 8, w: 5, h: 4, walk: true },
        { type: 'rug', x: 1, y: 6, w: 3, h: 2, walk: true, color: '#f0a8c0' },
        { type: 'rug', x: 7, y: 4, w: 4, h: 3, walk: true, sit: true },
        { type: 'bathmat', x: 14, y: 10, w: 2, h: 1, walk: true },
        { type: 'wall', x: 6, y: 2, w: 1, h: 5 },
        { type: 'wall', x: 6, y: 8, w: 1, h: 4 },
        { type: 'wall', x: 12, y: 7, w: 6, h: 1 },
        { type: 'wall', x: 12, y: 8, w: 1, h: 1 },
        { type: 'wall', x: 12, y: 10, w: 1, h: 2 },
        // bedroom
        { type: 'bed', x: 1, y: 2, w: 2, h: 3, act: 'bed', label: 'Bed' },
        { type: 'nightstand', x: 3, y: 2, w: 1, h: 1, act: 'nightstand', label: 'Nightstand' },
        { type: 'wardrobe', x: 5, y: 2, w: 1, h: 1, act: 'wardrobe', label: 'Wardrobe' },
        { type: 'desk', x: 1, y: 9, w: 2, h: 1, act: 'desk', label: 'Desk' },
        { type: 'plant', x: 5, y: 11, w: 1, h: 1 },
        // living room
        { type: 'tv', x: 8, y: 2, w: 2, h: 1, act: 'tv', label: 'TV' },
        { type: 'sofa', x: 8, y: 8, w: 3, h: 1, act: 'sofa', label: 'Sofa' },
        { type: 'plant', x: 11, y: 2, w: 1, h: 1 },
        { type: 'boxes', x: 11, y: 11, w: 1, h: 1, act: 'boxes', label: 'Moving boxes' },
        // kitchen
        { type: 'kcounter', x: 13, y: 2, w: 1, h: 1 },
        { type: 'sink', x: 14, y: 2, w: 1, h: 1, act: 'sink', label: 'Kitchen sink' },
        { type: 'stove', x: 15, y: 2, w: 1, h: 1, act: 'stove', label: 'Stove' },
        { type: 'kcounter', x: 16, y: 2, w: 1, h: 1 },
        { type: 'fridge', x: 17, y: 2, w: 1, h: 1, act: 'fridge', label: 'Fridge' },
        { type: 'dining', x: 14, y: 4, w: 2, h: 1, act: 'dining', label: 'Dining table' },
        // bathroom
        { type: 'basin', x: 14, y: 8, w: 1, h: 1, act: 'basin', label: 'Washbasin' },
        { type: 'toilet', x: 15, y: 8, w: 1, h: 1, act: 'toilet', label: 'Toilet' },
        { type: 'tub', x: 16, y: 8, w: 2, h: 2, act: 'tub', label: 'Bathtub' },
        { type: 'shower', x: 13, y: 10, w: 1, h: 2, act: 'shower', label: 'Shower' },
        { type: 'washer', x: 17, y: 11, w: 1, h: 1, act: 'washer', label: 'Washing machine' },
      ],
    },
    cafe: {
      name: 'Café Lumière', w: 14, h: 10, door: 7, floor: 'planks', wall: ['#e8c9a0', '#dcb88c'],
      spawn: [7, 8],
      stations: { nami: [3, 2] },
      wallDecor: [{ type: 'window', x: 2 }, { type: 'chalkboard', x: 9, act: 'menu', label: 'Menu board' }, { type: 'window', x: 12 }],
      props: [
        { type: 'counter', x: 1, y: 3, w: 6, h: 1, act: 'counter', label: 'Counter' },
        { type: 'espresso', x: 5, y: 3, w: 1, h: 1, act: 'counter', label: 'Counter', overlay: true },
        { type: 'table', x: 9, y: 4, w: 1, h: 1, act: 'table', label: 'Table' },
        { type: 'table', x: 12, y: 4, w: 1, h: 1, act: 'table', label: 'Table' },
        { type: 'table', x: 9, y: 7, w: 1, h: 1, act: 'table', label: 'Table' },
        { type: 'table', x: 12, y: 7, w: 1, h: 1, act: 'table', label: 'Table' },
        { type: 'plant', x: 1, y: 8, w: 1, h: 1 },
        { type: 'plant', x: 13, y: 2, w: 1, h: 1 },
        { type: 'cakecase', x: 1, y: 5, w: 2, h: 1, act: 'cakes', label: 'Cake display' },
      ],
    },
    school: {
      name: 'Academy Library', w: 14, h: 10, door: 7, floor: 'lightwood', wall: ['#dfe6d8', '#cfd8c6'],
      spawn: [7, 8],
      stations: { yumeko: [4, 6] },
      wallDecor: [{ type: 'window', x: 6 }, { type: 'board', x: 8, act: 'notice', label: 'Notice board' }],
      props: [
        { type: 'shelf', x: 1, y: 2, w: 2, h: 1, act: 'books', label: 'Bookshelf' },
        { type: 'shelf', x: 3, y: 2, w: 2, h: 1, act: 'books', label: 'Bookshelf' },
        { type: 'shelf', x: 10, y: 2, w: 2, h: 1, act: 'books', label: 'Bookshelf' },
        { type: 'shelf', x: 12, y: 2, w: 2, h: 1, act: 'books', label: 'Bookshelf' },
        { type: 'studytable', x: 3, y: 5, w: 3, h: 1, act: 'study', label: 'Study table' },
        { type: 'studytable', x: 8, y: 5, w: 3, h: 1, act: 'study', label: 'Study table' },
        { type: 'librarian', x: 10, y: 8, w: 2, h: 1, act: 'librarian', label: 'Librarian desk' },
        { type: 'globe', x: 1, y: 8, w: 1, h: 1, act: 'globe', label: 'Globe' },
        { type: 'plant', x: 13, y: 8, w: 1, h: 1 },
      ],
    },
    mall: {
      name: 'Gift Shop', w: 12, h: 9, door: 6, floor: 'pink', wall: ['#fff0f4', '#f8dce6'],
      spawn: [6, 7],
      wallDecor: [{ type: 'window', x: 5 }, { type: 'sale', x: 8 }],
      props: [
        { type: 'shopcounter', x: 1, y: 3, w: 3, h: 1, act: 'shop', label: 'Shop counter' },
        { type: 'display', x: 6, y: 2, w: 2, h: 1, act: 'display', label: 'Gift shelf' },
        { type: 'display', x: 9, y: 2, w: 2, h: 1, act: 'display', label: 'Gift shelf' },
        { type: 'giftable', x: 5, y: 5, w: 2, h: 1, act: 'display', label: 'Gift table' },
        { type: 'mirror', x: 10, y: 5, w: 1, h: 1, act: 'boutique', label: 'Fitting mirror' },
        { type: 'rack', x: 8, y: 6, w: 2, h: 1, act: 'boutique', label: 'Clothes rack' },
        { type: 'plant', x: 1, y: 7, w: 1, h: 1 },
      ],
    },
    arcade: {
      name: 'Star Arcade', w: 12, h: 9, door: 6, floor: 'arcade', wall: ['#2a2048', '#241c3e'],
      spawn: [6, 7],
      wallDecor: [{ type: 'neon', x: 4 }, { type: 'neon2', x: 8 }],
      props: [
        { type: 'cabinet', x: 1, y: 2, w: 1, h: 1, act: 'puzzle', label: 'Puzzle game', color: '#5a3ac8' },
        { type: 'cabinet', x: 2, y: 2, w: 1, h: 1, act: 'puzzle', label: 'Puzzle game', color: '#3a8ac8' },
        { type: 'cabinet', x: 3, y: 2, w: 1, h: 1, act: 'fighter', label: 'Fighting game', color: '#c83a5a' },
        { type: 'dance', x: 5, y: 2, w: 2, h: 1, act: 'rhythm', label: 'Dance machine' },
        { type: 'dancepad', x: 5, y: 3, w: 2, h: 1, walk: true },
        { type: 'claw', x: 9, y: 2, w: 2, h: 1, act: 'claw', label: 'Claw machine' },
        { type: 'cabinet', x: 1, y: 5, w: 1, h: 1, act: 'racer', label: 'Racing game', color: '#c8903a' },
        { type: 'cabinet', x: 1, y: 6, w: 1, h: 1, act: 'racer', label: 'Racing game', color: '#3ac890' },
        { type: 'prizes', x: 9, y: 6, w: 2, h: 1, act: 'prizes', label: 'Prize counter' },
      ],
    },
    dojo: {
      name: 'Shirogane Dojo', w: 12, h: 9, door: 6, floor: 'dojo', wall: ['#e8d4a8', '#d8c090'],
      spawn: [6, 7],
      wallDecor: [{ type: 'shoji', x: 2 }, { type: 'scroll', x: 6, act: 'scroll', label: 'Hanging scroll' }, { type: 'shoji', x: 9 }],
      props: [
        { type: 'tatami', x: 3, y: 3, w: 6, h: 4, walk: true },
        { type: 'rack', x: 1, y: 2, w: 2, h: 1, act: 'swords', label: 'Bokken rack', dojo: true },
        { type: 'dummy', x: 10, y: 4, w: 1, h: 1, act: 'train', label: 'Training dummy' },
        { type: 'drum', x: 10, y: 2, w: 1, h: 1, act: 'drum', label: 'Taiko drum' },
        { type: 'plant', x: 1, y: 7, w: 1, h: 1 },
      ],
    },
    maidcafe: {
      name: 'Café Blue Rose', w: 12, h: 9, door: 6, floor: 'pink', wall: ['#e8f0ff', '#d8e4fa'],
      spawn: [6, 7],
      stations: { rem: [3, 2] },
      wallDecor: [{ type: 'window', x: 7 }, { type: 'heartsign', x: 9, act: 'maidmenu', label: 'Menu' }, { type: 'poster', x: 1 }],
      props: [
        { type: 'counter', x: 1, y: 3, w: 5, h: 1, act: 'maidcounter', label: 'Counter', color: 'blue' },
        { type: 'table', x: 8, y: 4, w: 1, h: 1, act: 'maidtable', label: 'Table' },
        { type: 'table', x: 10, y: 6, w: 1, h: 1, act: 'maidtable', label: 'Table' },
        { type: 'table', x: 3, y: 6, w: 1, h: 1, act: 'maidtable', label: 'Table' },
        { type: 'plant', x: 11, y: 2, w: 1, h: 1 },
        { type: 'plant', x: 1, y: 7, w: 1, h: 1 },
      ],
    },
    bakery: {
      name: 'Honey Bakery', w: 12, h: 9, door: 6, floor: 'planks', wall: ['#fff0d0', '#f4e0b0'],
      spawn: [6, 7],
      wallDecor: [{ type: 'window', x: 2 }, { type: 'breadsign', x: 7 }],
      props: [
        { type: 'oven', x: 9, y: 2, w: 2, h: 1, act: 'oven', label: 'Brick oven' },
        { type: 'cakecase', x: 1, y: 3, w: 2, h: 1, act: 'bakecounter', label: 'Bread counter' },
        { type: 'counter', x: 3, y: 3, w: 3, h: 1, act: 'bakecounter', label: 'Bread counter' },
        { type: 'studytable', x: 7, y: 5, w: 3, h: 1, act: 'bakeclass', label: 'Baking table' },
        { type: 'honeyshelf', x: 10, y: 5, w: 1, h: 1, act: 'bakecounter', label: 'Honey shelf' },
        { type: 'plant', x: 1, y: 7, w: 1, h: 1 },
      ],
    },
    antiques: {
      name: 'Grimoire Antiques', w: 12, h: 9, door: 6, floor: 'lightwood', wall: ['#c8b898', '#b8a888'],
      spawn: [6, 7],
      stations: { frieren: [8, 4] },
      wallDecor: [{ type: 'window', x: 5 }, { type: 'map', x: 9, act: 'oldmap', label: 'Old map' }],
      props: [
        { type: 'shelf', x: 1, y: 2, w: 2, h: 1, act: 'curio', label: 'Curio shelf' },
        { type: 'shelf', x: 3, y: 2, w: 2, h: 1, act: 'curio', label: 'Curio shelf' },
        { type: 'lectern', x: 8, y: 3, w: 1, h: 1, act: 'lectern', label: 'Grimoire lectern' },
        { type: 'crystal', x: 3, y: 5, w: 1, h: 1, act: 'crystal', label: 'Crystal ball' },
        { type: 'chest', x: 10, y: 6, w: 1, h: 1, act: 'mimic', label: 'Treasure chest' },
        { type: 'globe', x: 1, y: 7, w: 1, h: 1, act: 'globe', label: 'Globe' },
        { type: 'librarian', x: 9, y: 2, w: 2, h: 1, act: 'curio', label: 'Shop counter' },
      ],
    },
    clocktower: {
      name: 'Clock Tower', w: 10, h: 9, door: 5, floor: 'stone', wall: ['#8a7a6a', '#7a6a5a'],
      spawn: [5, 7],
      stations: { kurumi: [5, 3] },
      wallDecor: [{ type: 'clockface', x: 4, act: 'clockview', label: 'Clock face window' }],
      props: [
        { type: 'gear', x: 1, y: 2, w: 2, h: 2, act: 'tinker', label: 'Brass gears' },
        { type: 'gear', x: 7, y: 2, w: 2, h: 2, act: 'tinker', label: 'Brass gears' },
        { type: 'workbench', x: 1, y: 6, w: 2, h: 1, act: 'tinker', label: 'Workbench' },
        { type: 'stairs', x: 8, y: 6, w: 1, h: 2, act: 'stairs', label: 'Spiral stairs' },
      ],
    },
    onsen: {
      name: 'Sakura Onsen', w: 12, h: 9, door: 6, floor: 'tile', wall: ['#e8d8c0', '#d8c4a8'],
      spawn: [6, 7],
      wallDecor: [{ type: 'onsensign', x: 5 }, { type: 'shoji', x: 1 }, { type: 'shoji', x: 9 }],
      props: [
        { type: 'bath', x: 3, y: 2, w: 6, h: 3, act: 'bath', label: 'Hot spring' },
        { type: 'lockers', x: 1, y: 5, w: 1, h: 2, act: 'lockers', label: 'Lockers' },
        { type: 'milkfridge', x: 10, y: 5, w: 1, h: 1, act: 'milkfridge', label: 'Milk fridge' },
        { type: 'massage', x: 10, y: 7, w: 1, h: 1, act: 'massage', label: 'Massage chair' },
        { type: 'plant', x: 1, y: 7, w: 1, h: 1 },
      ],
    },
  };

  // ---------------------------------------------------------- pathfinding
  function findPathGrid(isSolid, MW, sx, sy, gx, gy) {
    if (sx === gx && sy === gy) return [];
    const key = (x, y) => y * MW + x;
    const open = [[sx, sy]];
    const g = new Map([[key(sx, sy), 0]]);
    const f = new Map([[key(sx, sy), Math.abs(gx - sx) + Math.abs(gy - sy)]]);
    const from = new Map();
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

  // ---------------------------------------------------------- floor & wall
  function drawFloor(b, kind, w, h) {
    const W = w * T, H = h * T;
    const fills = {
      wood: ['#c48a5a', '#b07a4c'], planks: ['#9a6a44', '#8a5c3a'], lightwood: ['#c8aa82', '#b89a72'],
      pink: ['#f8e4ea', '#f0d0dc'], arcade: ['#2a2040', '#32284c'], dojo: ['#d8b07a', '#c8a06a'],
      tile: ['#d8ecf0', '#c4dce4'], stone: ['#9a9aa6', '#8a8a96'],
      carpet: ['#7a1e2e', '#8a2a38'], sidewalk: ['#cfcac4', '#b8b2ac'], diner: ['#f4efe4', '#e4d8c4'], marble: ['#f2f0f6', '#e2deea'], train: ['#8a94a8', '#7a8498'],
    };
    const [a, c] = fills[kind];
    b.rect(0, 2 * T, W, H - 2 * T, a);
    if (kind === 'sidewalk') {
      for (let y = 2 * T; y < H; y += 8) b.rect(0, y, W, 1, c);
      for (let y = 2 * T, r = 0; y < H; y += 8, r++) for (let x = (r % 2) * 8; x < W; x += 16) b.rect(x, y, 1, 8, c);
      return;
    }
    if (kind === 'carpet') {
      for (let y = 2 * T; y < H; y += 16) for (let x = 0; x < W; x += 16) { b.rect(x + 7, y + 3, 2, 10, c); b.rect(x + 3, y + 7, 10, 2, c); b.set(x + 8, y + 8, '#d6aa44'); }
      b.rect(0, 2 * T, W, 2, '#d6aa44');
      return;
    }
    if (kind === 'train') { for (let x = 0; x < W; x += 24) b.rect(x, 2 * T, 1, H - 2 * T, c); b.rect(0, H - 6, W, 1, '#c8a030'); return; }
    if (kind === 'pink' || kind === 'arcade' || kind === 'tile' || kind === 'stone' || kind === 'diner' || kind === 'marble') {
      for (let y = 2; y < h; y++) for (let x = 0; x < w; x++) if ((x + y) % 2) b.rect(x * T, y * T, T, T, c);
      if (kind === 'arcade') for (let i = 0; i < 40; i++) b.set((i * 53) % W, 2 * T + ((i * 31) % (H - 2 * T)), ['#ff6ad5', '#6af0ff', '#ffe066'][i % 3]);
    } else {
      for (let y = 2 * T + 7; y < H; y += 8) b.rect(0, y, W, 1, c);
      for (let y = 2 * T, r = 0; y < H; y += 8, r++) for (let x = (r * 19) % 32; x < W; x += 32) b.rect(x, y, 1, 7, c);
    }
  }

  function drawSkyline(b, room) {
    const W = room.w * T;
    b.rect(0, 0, W, 2 * T, '#9ad0f4'); b.rect(0, 0, W, 8, '#7ab8ec'); b.rect(0, 24, W, 8, '#b8e0f8');
    for (let x = 0, i = 0; x < W; i++) {
      const bw = 12 + ((i * 7) % 4) * 6, bh = 10 + ((i * 13) % 5) * 4;
      const col = i % 2 ? '#7a8ab0' : '#8a9ac0';
      b.rect(x, 2 * T - bh, bw, bh, col);
      for (let yy = 2 * T - bh + 3; yy < 2 * T - 3; yy += 4) for (let xx = x + 2; xx < x + bw - 2; xx += 4) if (((xx + yy + i) >> 2) % 3) b.set(xx, yy, '#c8d8f0');
      if (i % 5 === 2) { b.rect(x + bw / 2 - 1, 2 * T - bh - 8, 2, 8, '#6a7aa0'); b.set(x + bw / 2 - 1, 2 * T - bh - 9, '#e05a4a'); }
      x += bw + 1;
    }
  }

  function drawWall(b, room) {
    if (room.skyline) return drawSkyline(b, room);
    const W = room.w * T;
    const [a, c] = room.wall;
    b.rect(0, 0, W, 2 * T, a);
    for (let x = 0; x < W; x += 8) b.rect(x, 0, 1, 2 * T - 4, c);
    b.rect(0, 2 * T - 4, W, 4, shade(a, 0.35));
    b.rect(0, 2 * T - 4, W, 1, tint(a, 0.3));
    for (const d of room.wallDecor) {
      const x = d.x * T;
      switch (d.type) {
        case 'window':
          b.rect(x + 1, 4, 30, 20, '#f4efe6'); b.rect(x + 3, 6, 26, 16, '#9ad0f4'); b.rect(x + 3, 6, 26, 7, '#c4e6fb');
          b.rect(x + 15, 6, 2, 16, '#f4efe6'); b.line(x + 6, 18, x + 11, 9, '#e4f4ff');
          break;
        case 'clock':
          b.ellipse(x + 8, 12, 6, 6, '#f4efe6'); b.ellipse(x + 8, 12, 5, 5, '#ffffff'); b.line(x + 8, 12, x + 8, 8, '#3a3a4a'); b.line(x + 8, 12, x + 11, 12, '#3a3a4a');
          break;
        case 'poster':
          b.rect(x + 2, 4, 26, 20, '#ffffff'); b.rect(x + 4, 6, 22, 16, '#ff9fb8'); b.ellipse(x + 15, 12, 4, 4, '#fff3a0'); b.rect(x + 7, 18, 16, 2, '#ffffff');
          break;
        case 'chalkboard':
          b.rect(x, 3, 32, 22, '#7a5236'); b.rect(x + 2, 5, 28, 18, '#2f3a34');
          b.rect(x + 5, 8, 14, 1, '#f4f4f4'); b.rect(x + 5, 12, 20, 1, '#f4c4d4'); b.rect(x + 5, 16, 16, 1, '#c4e4f4'); b.ellipse(x + 25, 9, 2, 2, '#f4c4d4');
          break;
        case 'board':
          b.rect(x, 4, 32, 20, '#a8724a'); b.rect(x + 2, 6, 28, 16, '#d8b48a');
          b.rect(x + 4, 8, 8, 6, '#ffffff'); b.rect(x + 14, 8, 6, 8, '#fff3a0'); b.rect(x + 22, 9, 6, 6, '#c4e4f4'); b.set(x + 8, 8, '#f05a6a'); b.set(x + 17, 8, '#f05a6a');
          break;
        case 'sale':
          b.rect(x, 5, 32, 14, '#f05a8a'); b.rect(x + 2, 7, 28, 10, '#ffffff'); b.rect(x + 5, 10, 22, 4, '#f05a8a');
          break;
        case 'neon':
          b.rect(x, 6, 48, 2, '#ff6ad5'); b.rect(x, 18, 48, 2, '#ff6ad5'); b.rect(x, 6, 2, 14, '#ff6ad5'); b.rect(x + 46, 6, 2, 14, '#ff6ad5'); b.rect(x + 6, 11, 36, 3, '#6af0ff');
          break;
        case 'neon2':
          b.ellipse(x + 8, 13, 7, 7, '#ffe066'); b.ellipse(x + 8, 13, 5, 5, '#2a2048'); b.rect(x + 7, 8, 2, 10, '#ffe066');
          break;
        case 'shoji':
          b.rect(x, 2, 32, 24, '#7a4e30'); b.rect(x + 2, 4, 28, 20, '#f8f2e0');
          for (let i = x + 2; i < x + 30; i += 7) b.rect(i, 4, 1, 20, '#b89a6a');
          b.rect(x + 2, 13, 28, 1, '#b89a6a');
          break;
        case 'heartsign':
          b.rect(x, 4, 32, 20, '#5a8ad8'); b.rect(x + 2, 6, 28, 16, '#ffffff');
          b.ellipse(x + 12, 12, 3, 3, '#f05a8a'); b.ellipse(x + 17, 12, 3, 3, '#f05a8a'); b.poly([[x + 9, 13], [x + 20, 13], [x + 14.5, 20]], '#f05a8a');
          b.rect(x + 22, 9, 6, 1, '#5a8ad8'); b.rect(x + 22, 13, 5, 1, '#5a8ad8');
          break;
        case 'breadsign':
          b.rect(x, 5, 32, 18, '#8a5a3a'); b.ellipse(x + 16, 14, 11, 6, '#e0a050'); b.line(x + 10, 12, x + 13, 15, '#c07a30'); b.line(x + 16, 11, x + 19, 15, '#c07a30');
          break;
        case 'map':
          b.rect(x, 4, 32, 20, '#e8d4a0'); b.rect(x + 2, 6, 28, 16, '#f4e8c0'); b.poly([[x + 5, 10], [x + 14, 8], [x + 18, 14], [x + 8, 18]], '#8ac07a'); b.ellipse(x + 23, 14, 4, 3, '#7ab0d8'); b.set(x + 12, 12, '#d8343c');
          break;
        case 'clockface':
          b.ellipse(x + 16, 13, 13, 12, '#d6aa44'); b.ellipse(x + 16, 13, 11, 10, '#f8e8c0');
          for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.set(Math.round(x + 16 + Math.cos(a) * 8), Math.round(13 + Math.sin(a) * 8), '#3a3a4a'); }
          b.line(x + 16, 13, x + 16, 6, '#3a3a4a'); b.line(x + 16, 13, x + 21, 15, '#3a3a4a');
          break;
        case 'onsensign':
          b.rect(x, 3, 32, 22, '#2a3a6a'); b.rect(x + 3, 6, 26, 16, '#ffffff');
          b.ellipse(x + 16, 17, 7, 3, '#d8343c'); for (const dx of [-4, 0, 4]) b.line(x + 16 + dx, 14, x + 16 + dx + 1, 8, '#d8343c');
          break;
        case 'painting':
          b.rect(x - 2, 3, 20, 20, '#d6aa44'); b.rect(x, 5, 16, 16, '#2a3a5a'); b.ellipse(x + 11, 10, 3, 3, '#f4e8c0'); b.poly([[x, 21], [x + 6, 13], [x + 10, 17], [x + 16, 11], [x + 16, 21]], '#3a5a4a');
          break;
        case 'menuboard': {
          const w = (d.w || 3) * T;
          b.rect(x, 3, w, 22, '#2a2a32'); b.rect(x + 2, 5, w - 4, 18, d.color || '#d8342c');
          for (let i = 0; i < Math.floor((w - 8) / 14); i++) {
            const ix = x + 6 + i * 14;
            if (d.food === 'chicken') { b.ellipse(ix + 4, 12, 4, 3.5, '#d08a3a'); b.rect(ix + 6, 14, 3, 2, '#f4efe6'); b.set(ix + 2, 10, '#e8a858'); }
            else if (d.food === 'sushi') { b.rect(ix, 12, 9, 4, '#ffffff'); b.rect(ix, 10, 9, 3, '#f08060'); b.rect(ix + 3, 10, 1, 6, '#2a3a2a'); }
            else { b.ellipse(ix + 4, 10, 4, 2, '#e0a050'); b.rect(ix, 11, 9, 2, '#5aa84a'); b.rect(ix, 13, 9, 2, '#7a4a2a'); b.ellipse(ix + 4, 15, 4, 1.5, '#e0a050'); }
            b.rect(ix, 18, 9, 2, '#ffe066');
          }
          break;
        }
        case 'stripes': {
          const w = (d.w || 4) * T;
          for (let xx = x; xx < x + w; xx += 8) b.rect(xx, 0, 4, 2 * T - 4, d.color || '#d8342c');
          break;
        }
        case 'trainwindow':
          b.rect(x + 1, 4, 30, 18, '#c8ccd4'); b.rect(x + 3, 6, 26, 14, '#9ad0f4'); b.rect(x + 1, 0, 2, 4, '#a8acb4'); b.rect(x + 29, 0, 2, 4, '#a8acb4');
          b.ellipse(x + 16, 2, 3, 2, '#e8c040');
          break;
        case 'backsplash': {
          const w = (d.w || 3) * T;
          b.rect(x, 8, w, 24, '#f4f4f0');
          for (let yy = 8; yy < 32; yy += 6) b.rect(x, yy, w, 1, '#d8d8d0');
          for (let yy = 8, r = 0; yy < 32; yy += 6, r++) for (let xx = x + (r % 2) * 4; xx < x + w; xx += 8) b.rect(xx, yy, 1, 6, '#d8d8d0');
          b.rect(x + 2, 6, w - 4, 2, '#8a5a3a');
          for (let i = 0; i < Math.floor(w / 12); i++) b.rect(x + 5 + i * 12, 1, 5, 5, ['#e05a4a', '#f4c84a', '#5aa86a', '#f4f4f0'][i % 4]);
          break;
        }
        case 'scroll':
          b.rect(x - 2, 2, 20, 2, '#5a3a2a'); b.rect(x, 4, 16, 22, '#f8f2e0'); b.rect(x - 2, 26, 20, 2, '#5a3a2a');
          b.rect(x + 6, 7, 4, 3, '#2a2a2a'); b.rect(x + 5, 12, 6, 2, '#2a2a2a'); b.rect(x + 7, 14, 2, 8, '#2a2a2a'); b.ellipse(x + 12, 22, 2, 2, '#d8343c');
          break;
      }
    }
  }

  // ------------------------------------------------- city storefronts
  // Parody shops: McRonald's (burgers), Kentucky Fried Kitsune (chicken),
  // Kura-Kura Sushi (conveyor sushi), the Megamall and the station.
  function storefront(p, w, h) {
    const R = p.style === 'megamall' ? 30 : 20;
    const b = new Buf(w, h + R);
    const dX = (p.door - p.x) * T + 3, dY = h + R - 15;
    const glass = (x, y, gw, gh, frame) => { b.rect(x - 1, y - 1, gw + 2, gh + 2, frame); b.rect(x, y, gw, gh, '#a8d8f0'); b.rect(x, y, gw, 3, '#d8f0ff'); for (let i = x + 10; i < x + gw; i += 12) b.rect(i, y, 1, gh, frame); };
    const door = (frame, fill = '#a8d8f0') => { b.rect(dX - 1, dY - 1, 12, 15, frame); b.rect(dX, dY, 10, 13, fill); b.rect(dX + 4, dY, 1, 13, frame); };
    switch (p.style) {
      case 'mcronalds': {
        const red = '#d8342c', yel = '#ffcc1a', cx = w / 2;
        b.rect(0, 8, w, h + R - 8, red); b.rect(0, 8, w, 3, '#b02a24'); b.rect(0, h + R - 3, w, 3, '#8a1e1a');
        b.ellipse(cx - 6, 14, 6, 10, yel); b.ellipse(cx + 6, 14, 6, 10, yel); b.ellipse(cx - 6, 16, 2.5, 9, red); b.ellipse(cx + 6, 16, 2.5, 9, red);
        b.rect(cx - 13, 14, 26, 14, red); b.rect(cx - 12, 12, 3, 14, yel); b.rect(cx - 1, 12, 2, 14, yel); b.rect(cx + 9, 12, 3, 14, yel);
        b.rect(0, R + 12, w, 2, yel);
        glass(4, R + 18, dX - 8, 22, '#8a1e1a'); glass(dX + 14, R + 18, w - dX - 18, 22, '#8a1e1a');
        door('#8a1e1a');
        break;
      }
      case 'kitsune': {
        b.rect(0, 8, w, h + R - 8, '#ffffff'); b.rect(0, h + R - 3, w, 3, '#c8c0c0');
        for (let x = 0; x < w; x += 8) b.rect(x, 8, 4, 16, '#c8342c');
        b.rect(0, 24, w, 2, '#8a2a24');
        const cx = w / 2;
        b.ellipse(cx, 12, 10, 10, '#c8342c'); b.ellipse(cx, 12, 8, 8, '#ffffff');
        b.poly([[cx - 6, 6], [cx - 2, 10], [cx + 2, 10], [cx + 6, 6], [cx + 5, 14], [cx, 19], [cx - 5, 14]], '#f08a2a');
        b.poly([[cx - 3, 14], [cx + 3, 14], [cx, 19]], '#ffffff'); b.set(cx - 3, 12, '#2a1a10'); b.set(cx + 3, 12, '#2a1a10');
        glass(4, R + 14, dX - 8, 24, '#8a2a24'); glass(dX + 14, R + 14, w - dX - 18, 24, '#8a2a24');
        door('#8a2a24');
        break;
      }
      case 'sushi': {
        b.rect(0, 10, w, h + R - 10, '#a8724a'); b.rect(0, h + R - 3, w, 3, '#6a4028');
        b.poly([[-2, 14], [w + 2, 14], [w - 6, 4], [6, 4]], '#3a3a4a'); for (let x = 6; x < w - 6; x += 4) b.rect(x, 6, 2, 8, '#4a4a5a');
        b.rect(w / 2 - 16, 16, 32, 10, '#f8f2e0'); b.ellipse(w / 2 - 2, 21, 8, 3, '#5a8ad8'); b.poly([[w / 2 + 5, 21], [w / 2 + 11, 17], [w / 2 + 11, 25]], '#5a8ad8'); b.set(w / 2 - 7, 20, '#ffffff');
        for (const lx of [6, w - 10]) { b.ellipse(lx + 2, R + 22, 4, 6, '#e0303a'); b.rect(lx - 1, R + 16, 6, 1, '#2a2a2a'); b.rect(lx - 1, R + 27, 6, 1, '#2a2a2a'); }
        glass(12, R + 16, dX - 16, 18, '#5a3a2a');
        b.rect(dX - 3, dY - 4, 16, 8, '#2a3a6a'); for (let x = dX - 3; x < dX + 13; x += 4) b.rect(x + 3, dY - 4, 1, 8, '#f4f4f4');
        door('#5a3a2a', '#3a2a22');
        break;
      }
      case 'megamall': {
        b.rect(0, 0, w, h + R, '#9ac8e8'); b.rect(0, 0, w, 3, '#6a8ab0');
        for (let y = 6; y < h + R - 20; y += 10) b.rect(0, y, w, 2, '#7aa8d0');
        for (let x = 8; x < w; x += 12) b.rect(x, 3, 1, h + R - 24, '#7aa8d0');
        b.rect(6, 12, w - 12, 12, '#f05a8a'); for (let x = 12; x < w - 12; x += 8) b.rect(x, 15, 5, 6, '#ffffff');
        b.rect(0, h + R - 22, w, 22, '#e8e4ec'); b.rect(0, h + R - 22, w, 2, '#c8c4d0'); b.rect(0, h + R - 3, w, 3, '#b8b4c0');
        for (const bx of [8, w - 20]) { b.rect(bx, h + R - 40, 12, 18, ['#ffe066', '#5ab8f0'][bx === 8 ? 0 : 1]); b.rect(bx + 2, h + R - 36, 8, 2, '#ffffff'); }
        b.rect(dX - 9, dY - 3, 28, 18, '#5a6a8a'); b.rect(dX - 7, dY - 1, 11, 16, '#a8d8f0'); b.rect(dX + 6, dY - 1, 11, 16, '#a8d8f0');
        break;
      }
      case 'fancy': {
        const navy = '#1e2a48', gold = '#d6aa44';
        b.rect(0, 8, w, h + R - 8, navy); b.rect(0, 8, w, 3, gold); b.rect(0, h + R - 3, w, 3, '#141c30');
        b.rect(w / 2 - 22, 13, 44, 9, '#141c30'); b.rect(w / 2 - 20, 15, 40, 5, gold); for (let x = w / 2 - 18; x < w / 2 + 18; x += 5) b.rect(x, 16, 3, 3, '#141c30');
        b.ellipse(w / 2, 11, 3, 3, '#ffe8a0');
        for (const wx of [6, w - 22]) { b.rect(wx - 1, R + 9, 18, 26, gold); b.rect(wx, R + 10, 16, 24, '#ffd890'); b.ellipse(wx + 8, R + 11, 8, 4, '#ffd890'); b.rect(wx + 7, R + 10, 2, 24, gold); b.rect(wx, R + 22, 16, 1, gold); }
        b.rect(dX - 3, R + 6, 16, 5, '#7a1e2e'); for (let x = dX - 3; x < dX + 13; x += 4) b.rect(x, R + 10, 2, 2, '#7a1e2e');
        door(gold, '#5a2a22'); b.set(dX + 8, dY + 7, gold);
        b.rect(dX - 2, h + R - 2, 14, 2, '#c8343c');
        for (const tx of [dX - 9, dX + 15]) { b.ellipse(tx + 2, h + R - 12, 4, 5, '#3f8048'); b.rect(tx, h + R - 7, 5, 5, '#8a8a96'); }
        break;
      }
      case 'station': {
        b.rect(0, 10, w, h + R - 10, '#e4e8ee'); b.rect(0, 6, w, 8, '#3a5a8a'); b.rect(0, 6, w, 2, '#5a7aaa'); b.rect(0, h + R - 3, w, 3, '#a8b0bc');
        b.rect(w / 2 - 30, 18, 60, 10, '#2a4a8a'); b.rect(w / 2 - 26, 21, 22, 4, '#ffffff'); b.rect(w / 2 + 2, 21, 24, 4, '#ffffff');
        b.ellipse(w / 2, R + 10, 6, 6, '#ffffff'); b.line(w / 2, R + 10, w / 2, R + 6, '#3a3a4a'); b.line(w / 2, R + 10, w / 2 + 3, R + 11, '#3a3a4a');
        glass(6, R + 20, 20, 16, '#4a5a6a'); glass(w - 26, R + 20, 20, 16, '#4a5a6a');
        b.rect(dX - 14, dY - 6, 38, 4, '#5a6a7a');
        door('#4a5a6a'); b.rect(dX + 12, dY, 10, 13, '#a8d8f0'); b.rect(dX + 11, dY - 1, 1, 15, '#4a5a6a');
        break;
      }
    }
    b.outline(0.5);
    return { b, ox: 0, oy: -R };
  }

  // ---------------------------------------------------------- prop sprites
  // Each returns { b, ox, oy }: a Buf and its offset from the footprint's
  // top-left pixel (negative oy = the sprite rises above its footprint).
  function propSprite(p, spec = {}) {
    const w = p.w * T, h = p.h * T;
    let b;
    const out = (buf, ox = 0, oy = 0, noOutline) => { if (!noOutline) buf.outline(0.5); return { b: buf, ox, oy }; };
    switch (p.type) {
      case 'bed':
        b = new Buf(w, h + 8);
        b.rect(0, 0, w, 14, '#8a5a3a'); b.rect(2, 2, w - 4, 8, '#a8724a');
        b.rect(1, 12, w - 2, h - 6, '#ffffff'); b.rect(4, 14, w - 8, 8, '#fff3f6');
        { const c = p.color || '#6fa8e8'; b.rect(1, 24, w - 2, h - 18, c); b.rect(1, 24, w - 2, 2, tint(c, 0.3)); b.rect(1, h + 4, w - 2, 2, shade(c, 0.2)); }
        return out(b, 0, -8);
      case 'rug':
        b = new Buf(w, h);
        { const c = p.color || '#7f9ae0'; b.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, c); b.ellipse(w / 2, h / 2, w / 2 - 6, h / 2 - 6, tint(c, 0.3)); }
        return out(b, 0, 0, true);
      case 'tv':
        b = new Buf(w, h + 14);
        b.rect(2, 0, w - 4, 16, '#2a2a36'); b.rect(4, 2, w - 8, 12, '#5ab8f0'); b.rect(5, 3, 8, 2, '#c4e6fb');
        b.rect(0, 16, w, h - 2, '#7a4e30'); b.rect(1, 17, w - 2, 3, '#9a6a44');
        return out(b, 0, -14);
      case 'desk':
        b = new Buf(w, h + 12);
        b.rect(0, 10, w, 6, '#a8724a'); b.rect(1, 16, 3, h - 4, '#7a4e30'); b.rect(w - 4, 16, 3, h - 4, '#7a4e30');
        b.rect(6, 0, 14, 10, '#3a3a4a'); b.rect(7, 1, 12, 7, '#7ad0ff'); b.rect(4, 9, 18, 2, '#5a5a6a');
        b.rect(24, 6, 5, 5, '#f4efe6');
        return out(b, 0, -12);
      case 'fridge':
        b = new Buf(16, 32);
        b.rect(1, 0, 14, 31, '#e8eef4'); b.rect(1, 12, 14, 1, '#b8c0c8'); b.rect(12, 4, 1, 6, '#8a929a'); b.rect(12, 15, 1, 8, '#8a929a');
        b.rect(4, 3, 4, 3, '#f7c6d4'); b.rect(5, 17, 3, 3, '#ffe066');
        return out(b, 0, -16);
      case 'sofa':
        b = new Buf(w, h + 8);
        b.rect(0, 0, w, 10, '#c86a8a'); b.rect(0, 8, w, h, '#e08aa8'); b.rect(0, 2, 4, h + 4, '#c86a8a'); b.rect(w - 4, 2, 4, h + 4, '#c86a8a');
        b.rect(6, 10, w / 2 - 8, 6, '#f0a8c0'); b.rect(w / 2 + 2, 10, w / 2 - 8, 6, '#f0a8c0');
        return out(b, 0, -8);
      case 'plant':
        b = new Buf(16, 26);
        b.rect(4, 17, 8, 8, '#c86a4a'); b.rect(4, 17, 8, 1, '#e08a62');
        b.ellipse(8, 10, 7, 8, '#4f9a5a'); b.ellipse(5, 7, 3, 4, '#6cbf6a'); b.ellipse(11, 12, 3, 3, '#3f8048');
        return out(b, 0, -10);
      case 'boxes':
        b = new Buf(16, 22);
        b.rect(0, 8, 16, 14, '#c89a60'); b.rect(0, 8, 16, 2, '#dcb070'); b.rect(7, 8, 2, 14, '#e8d4a0');
        b.rect(3, 0, 11, 9, '#b88a50'); b.rect(3, 0, 11, 2, '#d0a468');
        return out(b, 0, -6);
      case 'counter':
        b = new Buf(w, h + 10);
        b.rect(0, 0, w, 8, p.color === 'blue' ? '#ffffff' : '#d8b48a'); b.rect(0, 8, w, h + 2, p.color === 'blue' ? '#5a8ad8' : '#7a4e30');
        for (let i = 4; i < w - 4; i += 16) b.rect(i, 11, 10, h - 4, p.color === 'blue' ? '#7aa4e8' : '#8a5c3a');
        b.rect(20, -1 + 1, 8, 6, '#f4f0ea'); b.ellipse(40, 3, 5, 3, '#f7c6d4');
        return out(b, 0, -10);
      case 'espresso':
        b = new Buf(16, 16);
        b.rect(1, 0, 14, 10, '#c0c4cc'); b.rect(2, 1, 12, 4, '#9aa0aa'); b.rect(6, 6, 4, 4, '#3a3a3a');
        return out(b, 0, -14);
      case 'table':
        b = new Buf(32, 24);
        b.rect(1, 12, 6, 8, '#c84a4a'); b.rect(25, 12, 6, 8, '#c84a4a'); // chairs
        b.ellipse(16, 8, 9, 5, '#f4efe6'); b.rect(14, 12, 4, 10, '#5a3a2a'); b.rect(10, 21, 12, 2, '#5a3a2a');
        b.rect(13, 4, 5, 4, '#ffffff'); b.rect(14, 5, 3, 2, '#8a5a3a');
        return out(b, -8, -8);
      case 'cakecase':
        b = new Buf(w, h + 10);
        b.rect(0, 0, w, h + 10, '#d8f0ff'); b.rect(0, 0, w, 2, '#ffffff'); b.rect(0, h + 6, w, 4, '#a8724a');
        b.ellipse(7, 10, 5, 4, '#f7c6d4'); b.ellipse(19, 10, 5, 4, '#ffe8b0'); b.rect(4, 6, 6, 1, '#ff6a8a'); b.ellipse(26, 14, 4, 3, '#8a5a3a');
        return out(b, 0, -10);
      case 'shelf': {
        b = new Buf(w, h + 24);
        b.rect(0, 0, w, h + 24, '#7a4e30');
        const cols = ['#c84a4a', '#4a7ac8', '#e0b04a', '#4aa070', '#9a5ac8', '#e08a5a'];
        for (let r = 0; r < 3; r++) {
          const y = 3 + r * 12;
          b.rect(2, y, w - 4, 10, '#4a2e1c');
          for (let i = 0, x = 3; x < w - 4; i++) { const bw = 2 + ((i + r + p.x) % 2); b.rect(x, y + 1 + ((i + r) % 3), bw, 9 - ((i + r) % 3), cols[(i * 3 + r + p.x) % cols.length]); x += bw + 1; }
        }
        return out(b, 0, -24);
      }
      case 'studytable':
        b = new Buf(w, h + 6);
        b.rect(0, 4, w, 8, '#a8724a'); b.rect(0, 4, w, 2, '#c48a5a'); b.rect(2, 12, 3, h - 6, '#7a4e30'); b.rect(w - 5, 12, 3, h - 6, '#7a4e30');
        b.rect(6, 2, 10, 5, '#4a7ac8'); b.rect(6, 2, 10, 1, '#ffffff'); b.rect(28, 3, 8, 4, '#f4efe6');
        return out(b, 0, -6);
      case 'librarian':
        b = new Buf(w, h + 10);
        b.rect(0, 2, w, h + 8, '#8a5a3a'); b.rect(0, 2, w, 4, '#a8724a'); b.rect(4, 0, 8, 4, '#f4efe6'); b.rect(20, -2 + 2, 6, 3, '#d8343c');
        return out(b, 0, -10);
      case 'globe':
        b = new Buf(16, 26);
        b.rect(7, 16, 2, 8, '#7a4e30'); b.rect(3, 23, 10, 2, '#5a3a2a'); b.ellipse(8, 9, 7, 7, '#5ab8f0'); b.ellipse(6, 7, 3, 2, '#4aa070'); b.ellipse(10, 12, 2, 2, '#4aa070');
        return out(b, 0, -10);
      case 'shopcounter':
        b = new Buf(w, h + 12);
        b.rect(0, 2, w, h + 10, '#f05a8a'); b.rect(0, 2, w, 5, '#ffffff'); b.rect(4, 9, w - 8, h - 2, '#f88aaa');
        b.rect(30, -2 + 2, 12, 7, '#5a5a6a'); b.rect(32, 1, 8, 3, '#7ad0ff'); b.ellipse(10, 2, 4, 3, '#f7c6d4');
        return out(b, 0, -12);
      case 'display':
        b = new Buf(w, h + 18);
        b.rect(0, 0, w, h + 18, '#ffffff'); b.rect(1, 1, w - 2, h + 16, '#f4e0e8');
        for (let r = 0; r < 2; r++) { b.rect(1, 12 + r * 12, w - 2, 1, '#d8b0c0'); for (let i = 0; i < 4; i++) b.rect(3 + i * 7, 5 + r * 12, 5, 6, ['#f05a6a', '#5ab8f0', '#ffe066', '#4aa070', '#c8a0f0'][(i + r + p.x) % 5]); }
        return out(b, 0, -18);
      case 'giftable':
        b = new Buf(w, h + 6);
        b.rect(0, 4, w, h + 2, '#c89a60'); b.rect(0, 4, w, 3, '#dcb070');
        b.rect(4, 0, 7, 7, '#f05a8a'); b.rect(7, 0, 1, 7, '#ffe066'); b.rect(15, 1, 6, 6, '#5ab8f0'); b.rect(24, 0, 5, 7, '#ffe066');
        return out(b, 0, -6);
      // ---- the city: storefronts, street furniture
      case 'storefront': return storefront(p, w, h);
      case 'road':
        b = new Buf(w, h);
        b.rect(0, 0, w, h, '#4a4a54'); b.rect(0, 0, w, 2, '#8a8a94'); b.rect(0, h - 2, w, 2, '#8a8a94');
        for (let x = 4; x < w; x += 16) b.rect(x, h / 2 - 1, 8, 2, '#f4c83a');
        return out(b, 0, 0, true);
      case 'crosswalk':
        b = new Buf(w, h);
        for (let y = 4; y < h - 4; y += 6) b.rect(2, y, w - 4, 3, '#f4f4f4');
        return out(b, 0, 0, true);
      case 'plazatile': {
        b = new Buf(w, h);
        for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) { b.rect(x, y, 16, 16, ((x + y) / 16) % 2 ? '#e4d8c8' : '#d8ccb8'); b.rect(x + 6, y + 6, 4, 4, '#f0e8dc'); }
        return out(b, 0, 0, true);
      }
      case 'wcbooth':
        b = new Buf(16, 28);
        b.rect(1, 4, 14, 24, '#6a9ad8'); b.rect(0, 2, 16, 3, '#3a5a9a'); b.rect(4, 12, 8, 16, '#3a5a9a'); b.rect(5, 13, 6, 14, '#5a8ac8');
        b.rect(3, 6, 10, 5, '#ffffff'); b.rect(4, 7, 2, 3, '#3a5ad8'); b.rect(10, 7, 2, 3, '#e05a6a'); b.rect(7, 7, 2, 3, '#3a3a4a');
        return out(b, 0, -12);
      case 'citytree':
        b = new Buf(16, 34);
        b.rect(1, 24, 14, 8, '#8a8a96'); b.rect(1, 24, 14, 2, '#a8a8b4'); b.rect(7, 14, 2, 10, '#7a4e30');
        b.ellipse(8, 10, 8, 9, '#4f9a5a'); b.ellipse(5, 7, 4, 4, '#6cbf6a'); b.ellipse(11, 12, 3, 3, '#3f8048');
        return out(b, 0, -18);
      case 'streetlamp':
        b = new Buf(16, 40);
        b.rect(7, 8, 2, 30, '#3a3a4a'); b.rect(5, 37, 6, 3, '#2a2a36'); b.rect(3, 3, 10, 6, '#3a3a4a'); b.rect(4, 4, 8, 4, '#fff2b0'); b.rect(7, 0, 2, 3, '#3a3a4a');
        return out(b, 0, -24);
      case 'citybench':
        b = new Buf(w, 18);
        b.rect(0, 2, w, 4, '#a8724a'); b.rect(0, 8, w, 4, '#c48a5a'); b.rect(2, 12, 2, 6, '#3a3a4a'); b.rect(w - 4, 12, 2, 6, '#3a3a4a');
        return out(b, 0, -2);
      case 'cityfountain':
        b = new Buf(w, h + 18);
        b.ellipse(w / 2, h / 2 + 14, w / 2 - 1, h / 2, '#b8b8c4'); b.ellipse(w / 2, h / 2 + 14, w / 2 - 4, h / 2 - 3, '#5ab8f0'); b.ellipse(w / 2, h / 2 + 14, w / 2 - 7, h / 2 - 6, '#7ac8f8');
        b.rect(w / 2 - 3, 4, 6, h / 2 + 10, '#c8c8d4'); b.ellipse(w / 2, 6, 7, 3, '#b8b8c4'); b.rect(w / 2 - 1, 0, 2, 5, '#d8f0ff');
        return out(b, 0, -18);
      case 'foodtruck':
        b = new Buf(w, h + 16);
        b.rect(0, 4, w, h + 6, '#f8a8c8'); b.rect(0, 4, w, 3, '#ffffff'); b.rect(4, 10, w - 18, 12, '#3a2a3a'); b.rect(5, 11, w - 20, 10, '#ffe8c0');
        for (let i = 0; i < w - 18; i += 6) b.rect(4 + i, 8, 6, 3, (i / 6) % 2 ? '#ffffff' : '#f05a8a');
        b.rect(w - 12, 10, 9, 10, '#a8d8f0'); b.ellipse(10, h + 10, 4, 4, '#2a2a32'); b.ellipse(w - 10, h + 10, 4, 4, '#2a2a32');
        b.poly([[w / 2 - 6, 0], [w / 2 + 6, 0], [w / 2, 6]], '#e0a050'); b.ellipse(w / 2, 0, 5, 3, '#ffffff'); b.set(w / 2, -1 + 1, '#f05a8a');
        return out(b, 0, -16);
      // ---- inside the restaurants, the mall and the train
      case 'fastcounter':
        b = new Buf(w, h + 12);
        b.rect(0, 2, w, 8, '#f4f0ea'); b.rect(0, 10, w, h + 2, p.color || '#d8342c'); b.rect(0, 10, w, 2, PX.shade(p.color || '#d8342c', 0.2));
        for (let x = 6; x < w - 8; x += 24) { b.rect(x, 0, 10, 6, '#3a3a44'); b.rect(x + 1, 1, 8, 3, '#7ad0ff'); }
        for (let x = 20; x < w - 6; x += 24) { b.ellipse(x, 5, 3, 2, '#e0a050'); b.rect(x - 3, 5, 6, 1, '#5aa84a'); }
        return out(b, 0, -12);
      case 'conveyor':
        b = new Buf(w, h + 8);
        b.rect(0, 0, w, h + 8, '#8a5a3a'); b.rect(0, 2, w, 8, '#c0c4cc'); b.rect(0, 5, w, 1, '#a8acb4');
        for (let x = 4, i = 0; x < w - 6; x += 12, i++) { b.ellipse(x + 4, 6, 4, 2.5, ['#f05a6a', '#ffe066', '#5ab8f0', '#4aa070'][i % 4]); b.ellipse(x + 4, 5, 2.5, 1.5, i % 2 ? '#f8a088' : '#ffffff'); }
        return out(b, 0, -8);
      case 'stool':
        b = new Buf(16, 16);
        b.ellipse(8, 5, 5, 3, '#d8343c'); b.rect(7, 7, 2, 7, '#5a5a6a'); b.rect(4, 14, 8, 2, '#5a5a6a');
        return out(b, 0, -2);
      case 'escalator':
        b = new Buf(w, h + 16);
        b.poly([[2, h + 16], [w - 2, h + 16], [w - 2, 0], [2, 8]], '#9aa0b0');
        for (let y = 10; y < h + 14; y += 4) b.rect(5, y, w - 10, 2, '#5a6070');
        b.rect(0, 6, 3, h + 10, '#3a3a4a'); b.rect(w - 3, 0, 3, h + 16, '#3a3a4a');
        return out(b, 0, -16);
      case 'purikura':
        b = new Buf(w, h + 18);
        b.rect(0, 0, w, h + 18, '#f05a8a'); b.rect(2, 2, w - 4, 10, '#ffffff'); b.ellipse(w / 2, 7, 6, 3, '#ff9ad0');
        b.rect(4, 14, w - 8, h, '#ffd0e4'); for (let x = 5; x < w - 5; x += 4) b.rect(x, 14, 2, h, '#ff9ad0');
        b.ellipse(8, h + 8, 3, 3, '#ffe066'); b.ellipse(w - 8, h + 6, 2, 2, '#9ad8ff');
        return out(b, 0, -18);
      case 'slotmachine':
        b = new Buf(16, 30);
        b.rect(1, 2, 14, 26, '#c8203a'); b.rect(1, 2, 14, 3, '#ffe066'); b.rect(3, 8, 10, 7, '#ffffff');
        b.rect(4, 9, 2, 5, '#d8343c'); b.rect(7, 9, 2, 5, '#3a5ad8'); b.rect(10, 9, 2, 5, '#d8343c');
        b.rect(3, 18, 10, 3, '#3a3a4a'); b.rect(14, 10, 2, 8, '#a8a8b4'); b.ellipse(15, 9, 2, 2, '#ff5a5a');
        for (let x = 2; x < 14; x += 3) b.set(x, 3, '#ffffff');
        return out(b, 0, -14);
      case 'bjtable':
        b = new Buf(w, h + 6);
        b.ellipse(w / 2, 6, w / 2 - 1, h, '#6a3a22'); b.ellipse(w / 2, 6, w / 2 - 3, h - 3, '#1e7a4a');
        b.rect(0, 0, w, 6, '#000000'); b.rect(0, 0, w, 6, null);
        for (const cx of [10, 18, 26, 34]) { b.rect(cx, 10, 5, 7, '#ffffff'); b.set(cx + 1, 11, '#d8343c'); }
        b.rect(w / 2 - 8, 2, 16, 5, '#2a2a36'); b.rect(w / 2 - 6, 3, 4, 3, '#ffffff'); b.rect(w / 2 + 2, 3, 4, 3, '#ffffff');
        for (const cx of [8, 40]) { b.ellipse(cx, 20, 2, 1.5, '#ffe066'); b.ellipse(cx, 19, 2, 1.5, '#ff5a5a'); }
        return out(b, 0, 0);
      case 'finetable':
        b = new Buf(w, h + 12);
        for (const cxp of [1, w - 7]) { b.rect(cxp, 6, 6, 4, '#5a2a22'); b.rect(cxp, 10, 6, 8, '#7a3a2a'); b.rect(cxp + 1, 10, 4, 2, '#9a4a3a'); }
        b.rect(7, 6, w - 14, h, '#ffffff'); b.rect(7, h + 4, w - 14, 2, '#d8d8e0'); b.rect(9, 8, 5, 3, '#f4f0ea'); b.rect(w - 14, 8, 5, 3, '#f4f0ea');
        b.rect(w / 2 - 1, 1, 2, 6, '#f4f0d8'); b.set(w / 2 - 1, 0, '#ffd060'); b.set(w / 2, 0, '#ffe8a0');
        b.ellipse(w / 2 + 4, 11, 2, 2, '#d8343c'); b.set(w / 2 + 4, 13, '#4aa070');
        return out(b, 0, -6);
      case 'piano':
        b = new Buf(w, h + 12);
        b.poly([[2, 4], [w - 4, 2], [w - 2, h + 2], [10, h + 4], [2, h - 4]], '#1a1a22'); b.line(4, 6, w - 8, 4, '#4a4a5a');
        b.rect(4, h + 2, w - 10, 5, '#1a1a22'); b.rect(5, h + 3, w - 12, 3, '#ffffff'); for (let x = 6; x < w - 8; x += 3) b.rect(x, h + 3, 1, 2, '#1a1a22');
        b.rect(6, h + 7, 2, 5, '#1a1a22'); b.rect(w - 10, h + 7, 2, 5, '#1a1a22'); b.rect(14, h + 9, 14, 3, '#5a2a22');
        return out(b, 0, -8);
      case 'podium':
        b = new Buf(16, 26);
        b.rect(3, 8, 10, 16, '#5a2a22'); b.rect(2, 6, 12, 3, '#7a3a2a'); b.rect(5, 2, 7, 5, '#f4f0ea'); b.rect(6, 3, 5, 1, '#3a3a4a'); b.rect(6, 5, 3, 1, '#3a3a4a');
        b.rect(3, 22, 10, 2, '#d6aa44');
        return out(b, 0, -10);
      case 'trainseat':
        b = new Buf(w, h + 6);
        b.rect(0, 0, w, 8, '#3a5a9a'); b.rect(0, 6, w, h - 2, '#4a6ab0'); b.rect(0, 6, w, 2, '#6a8ad0'); b.rect(0, h + 2, w, 4, '#5a5a6a');
        for (let x = 15; x < w; x += 16) b.rect(x, 1, 1, h + 2, '#2a4a8a');
        return out(b, 0, -6);
      // ---- houses: partitions, kitchen and bathroom
      case 'wall': {
        const [a, c] = p.color ? [p.color, shade(p.color, 0.1)] : spec.wall || ['#c9b8e0', '#bda9d6'];
        b = new Buf(w, h + 10);
        const capH = h - 6;
        b.rect(0, 0, w, capH, shade(a, 0.45)); b.rect(0, 0, w, 1, tint(a, 0.2));
        b.rect(0, capH, w, 16, a); for (let x = 0; x < w; x += 8) b.rect(x, capH, 1, 13, c);
        b.rect(0, capH + 13, w, 3, shade(a, 0.35));
        return out(b, 0, -10, true);
      }
      case 'tilefloor': {
        b = new Buf(w, h);
        const [a, c] = p.color === 'kitchen' ? ['#efe6d2', '#e0d2b8'] : ['#dcecf2', '#c6dce6'];
        for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) b.rect(x, y, 8, 8, (x + y) % 16 ? c : a);
        return out(b, 0, 0, true);
      }
      case 'bathmat':
        b = new Buf(w, h);
        b.rect(2, 3, w - 4, h - 6, p.color || '#8ac8e8'); for (let x = 3; x < w - 3; x += 2) { b.set(x, 2, p.color || '#8ac8e8'); b.set(x, h - 3, p.color || '#8ac8e8'); }
        b.rect(4, 5, w - 8, 1, '#ffffff');
        return out(b, 0, 0, true);
      case 'kcounter': case 'sink': case 'stove': {
        b = new Buf(16, 26);
        b.rect(0, 0, 16, 9, '#e8e0d4'); b.rect(0, 0, 16, 1, '#ffffff');
        b.rect(0, 9, 16, 17, p.color || '#8ab0c8'); b.rect(1, 11, 14, 13, tint(p.color || '#8ab0c8', 0.18)); b.rect(7, 16, 2, 2, '#d6aa44');
        if (p.type === 'sink') { b.rect(2, 2, 12, 6, '#a8b4c0'); b.rect(3, 3, 10, 4, '#d0e4f0'); b.rect(7, 0, 2, 3, '#8a929a'); b.set(9, 1, '#8a929a'); }
        else if (p.type === 'stove') {
          b.rect(1, 1, 14, 7, '#2a2a32'); b.ellipse(4.5, 4.5, 2.5, 2, '#5a5a64'); b.ellipse(11.5, 4.5, 2.5, 2, '#5a5a64');
          b.rect(9, 0, 6, 4, '#c0c4cc'); b.rect(8, 1, 1, 1, '#c0c4cc'); // pot
          b.rect(1, 11, 14, 9, '#3a3a44'); b.rect(3, 13, 10, 5, '#5a5a6a'); b.rect(3, 12, 10, 1, '#c0c4cc');
        } else { b.rect(3, 3, 7, 4, '#c89a60'); b.ellipse(12, 4, 2, 2, '#e05a4a'); }
        return out(b, 0, -10);
      }
      case 'dining':
        b = new Buf(w, h + 14);
        for (const x of [4, w - 12]) { b.rect(x, 0, 8, 6, '#a8724a'); b.rect(x, h + 8, 8, 6, '#a8724a'); b.rect(x + 1, h + 8, 6, 2, '#c48a5a'); }
        b.rect(0, 5, w, h - 1, '#c48a5a'); b.rect(0, 5, w, 2, '#d8a070'); b.rect(1, h + 4, w - 2, 2, '#8a5a3a');
        b.rect(2, h + 6, 2, 4, '#7a4e30'); b.rect(w - 4, h + 6, 2, 4, '#7a4e30');
        b.ellipse(9, 11, 4, 3, '#ffffff'); b.ellipse(w - 9, 11, 4, 3, '#ffffff'); b.ellipse(w / 2, 9, 2, 2, '#f05a8a'); b.rect(w / 2 - 1, 10, 2, 3, '#4aa070');
        return out(b, 0, -6);
      case 'shower':
        b = new Buf(16, h + 18);
        b.rect(0, 0, 16, h + 18, '#b8c0c8');
        b.rect(1, 1, 14, h + 16, '#dcecf2'); for (let y = 2; y < h + 16; y += 6) b.rect(1, y, 14, 1, '#c6dce6');
        b.rect(7, 2, 2, 5, '#8a929a'); b.rect(5, 6, 6, 2, '#a8b0b8');
        b.rect(1, 18, 14, h - 3, '#c4e4f4'); b.rect(1, 18, 1, h - 3, '#e8f6ff');
        b.line(3, h + 14, 12, 20, '#e8f6ff'); b.rect(1, h + 14, 14, 2, '#a8b0b8');
        return out(b, 0, -18);
      case 'basin':
        b = new Buf(16, 34);
        b.rect(2, 0, 12, 14, '#d6aa44'); b.rect(3, 1, 10, 12, '#c4e6fb'); b.line(5, 11, 10, 3, '#ffffff');
        b.rect(1, 16, 14, 6, '#ffffff'); b.rect(3, 17, 10, 3, '#d0e4f0'); b.rect(7, 14, 2, 3, '#a8b0b8');
        b.rect(6, 22, 4, 10, '#f4f4f8'); b.rect(4, 31, 8, 2, '#e0e0e8');
        return out(b, 0, -18);
      case 'toilet':
        b = new Buf(16, 24);
        b.rect(2, 0, 12, 9, '#ffffff'); b.rect(2, 0, 12, 2, '#e8eef4'); b.rect(10, 3, 3, 1, '#a8b0b8');
        b.ellipse(8, 15, 6, 6, '#ffffff'); b.ellipse(8, 15, 4, 4, '#d0e4f0'); b.rect(5, 20, 6, 3, '#e8eef4');
        return out(b, 0, -8);
      case 'tub':
        b = new Buf(w, h + 6);
        b.rect(0, 0, w, h + 6, '#ffffff'); b.rect(0, h + 3, w, 3, '#d8dce4');
        b.rect(3, 3, w - 6, h - 4, '#8ad0f0'); b.rect(3, 3, w - 6, 3, '#b8e4f8');
        for (let i = 0; i < 4; i++) b.ellipse(8 + i * 6, 12 + (i % 2) * 6, 2.5, 1.5, '#e4f6ff');
        b.rect(w - 6, 0, 3, 4, '#a8b0b8');
        return out(b, 0, -6);
      case 'washer':
        b = new Buf(16, 24);
        b.rect(1, 0, 14, 24, '#f4f4f8'); b.rect(1, 0, 14, 5, '#e0e4ec'); b.rect(3, 2, 4, 1, '#5ab8f0'); b.set(11, 2, '#e05a4a');
        b.ellipse(8, 14, 5, 5, '#a8b0b8'); b.ellipse(8, 14, 4, 4, '#7ab0d8'); b.ellipse(7, 13, 1.5, 1.5, '#c4e6fb');
        return out(b, 0, -8);
      case 'mannequin':
        b = new Buf(16, 30);
        b.rect(7, 22, 2, 6, '#5a5a6a'); b.rect(4, 27, 8, 2, '#5a5a6a'); b.ellipse(8, 3, 3, 3, '#e8d8c8');
        b.poly([[4, 6], [12, 6], [11, 12], [14, 22], [2, 22], [5, 12]], '#f05a8a'); b.rect(4, 12, 8, 1, '#ffffff');
        for (let x = 3; x < 14; x += 2) b.set(x, 22, '#ffffff'); b.ellipse(8, 8, 1.5, 1.5, '#ffe066');
        return out(b, 0, -14);
      case 'nightstand':
        b = new Buf(16, 26);
        b.rect(1, 12, 14, 14, '#a8724a'); b.rect(1, 12, 14, 2, '#c48a5a'); b.rect(3, 17, 10, 1, '#7a4e30'); b.set(8, 20, '#d6aa44');
        b.rect(7, 6, 2, 6, '#8a6a3a'); b.poly([[3, 7], [13, 7], [11, 1], [5, 1]], p.color || '#ffe0a0'); b.rect(11, 9, 3, 3, '#f4efe6');
        return out(b, 0, -10);
      case 'mirror':
        b = new Buf(16, 32);
        b.rect(1, 0, 14, 30, '#d6aa44'); b.rect(3, 2, 10, 26, '#c4e6fb'); b.line(5, 24, 11, 6, '#ffffff'); b.rect(2, 30, 12, 2, '#8a6a3a');
        return out(b, 0, -16);
      case 'rack':
        if (p.dojo) {
          b = new Buf(w, h + 16);
          b.rect(0, 2, w, 3, '#5a3a2a'); b.rect(0, 14, w, 3, '#5a3a2a'); b.rect(1, 2, 2, h + 14, '#5a3a2a'); b.rect(w - 3, 2, 2, h + 14, '#5a3a2a');
          for (let x = 6; x < w - 4; x += 6) b.rect(x, 0, 2, h + 12, '#c89a60');
          return out(b, 0, -16);
        }
        b = new Buf(w, h + 16);
        b.rect(1, 0, w - 2, 2, '#8a8a96'); b.rect(1, 0, 2, h + 16, '#8a8a96'); b.rect(w - 3, 0, 2, h + 16, '#8a8a96');
        for (let i = 0; i < 5; i++) b.rect(4 + i * 5, 2, 4, 14, ['#f05a6a', '#5ab8f0', '#ffffff', '#c8a0f0', '#4aa070'][i]);
        return out(b, 0, -16);
      case 'cabinet': {
        b = new Buf(16, 32);
        const c = p.color || '#5a3ac8';
        b.rect(1, 0, 14, 31, c); b.rect(2, 1, 12, 4, shade(c, 0.3)); b.rect(3, 6, 10, 9, '#0a0a14'); b.rect(4, 7, 8, 7, tint(c, 0.5));
        b.rect(1, 17, 14, 4, shade(c, 0.2)); b.set(5, 18, '#f05a6a'); b.set(9, 18, '#5ab8f0'); b.set(11, 18, '#f0d05a');
        return out(b, 0, -16);
      }
      case 'dance':
        b = new Buf(w, h + 22);
        b.rect(2, 0, w - 4, h + 22, '#c83a7a'); b.rect(5, 3, w - 10, 12, '#0a0a14'); b.rect(6, 4, w - 12, 10, '#40d0a0'); b.rect(8, 7, 4, 4, '#ffffff'); b.rect(18, 6, 4, 6, '#ffe066');
        b.rect(2, 18, w - 4, 3, '#ff6ad5');
        return out(b, 0, -22);
      case 'dancepad':
        b = new Buf(w, h);
        b.rect(0, 0, w, h, '#3a3a5a');
        [[4, 2], [24, 2], [14, 0], [14, 10]].forEach(([x, y], i) => b.rect(x, y + 1, 5, 5, ['#ff6ad5', '#6af0ff', '#ffe066', '#7ee0a0'][i]));
        return out(b, 0, 0, true);
      case 'claw':
        b = new Buf(w, h + 26);
        b.rect(0, 0, w, h + 26, '#f05a8a'); b.rect(3, 4, w - 6, 20, '#b8e8ff'); b.rect(3, 18, w - 6, 6, '#f7c6d4');
        b.ellipse(9, 18, 3, 3, '#f0d05a'); b.ellipse(16, 17, 3, 3, '#8ad0f0'); b.ellipse(23, 18, 3, 3, '#c8a0f0');
        b.rect(15, 4, 2, 7, '#c0c4cc'); b.rect(13, 10, 6, 2, '#c0c4cc'); b.rect(0, 26, w, 2, '#ffffff'); b.rect(10, 32, 12, 6, '#2a2040');
        return out(b, 0, -26);
      case 'prizes':
        b = new Buf(w, h + 14);
        b.rect(0, 4, w, h + 10, '#5a3ac8'); b.rect(0, 4, w, 4, '#ffe066');
        b.ellipse(6, 3, 4, 3, '#f7c6d4'); b.ellipse(16, 2, 4, 4, '#8ad0f0'); b.ellipse(26, 3, 4, 3, '#f0d05a');
        return out(b, 0, -14);
      case 'tatami':
        b = new Buf(w, h);
        b.rect(0, 0, w, h, '#c8c090'); b.rect(0, 0, w, 1, '#a8a070'); b.rect(0, h - 1, w, 1, '#a8a070');
        for (let x = 0; x < w; x += 32) b.rect(x, 0, 1, h, '#a8a070');
        b.rect(0, h / 2, w, 1, '#a8a070');
        return out(b, 0, 0, true);
      case 'wardrobe':
        b = new Buf(16, 34);
        b.rect(0, 0, 16, 33, '#8a5a3a'); b.rect(0, 0, 16, 2, '#a8724a'); b.rect(7, 2, 2, 30, '#6a4028');
        b.rect(2, 3, 5, 28, '#a8724a'); b.rect(9, 3, 5, 28, '#a8724a'); b.set(6, 16, '#d6aa44'); b.set(9, 16, '#d6aa44');
        b.rect(2, 31, 2, 2, '#5a3a2a'); b.rect(12, 31, 2, 2, '#5a3a2a');
        return out(b, 0, -18);
      case 'honeyshelf':
        b = new Buf(16, 28);
        b.rect(0, 0, 16, 28, '#8a5a3a'); for (const y of [3, 13]) for (const x of [2, 9]) { b.rect(x, y, 5, 7, '#f2b84a'); b.rect(x, y, 5, 2, '#c8803a'); }
        return out(b, 0, -12);
      case 'oven':
        b = new Buf(w, h + 20);
        b.rect(0, 0, w, h + 20, '#a84a3a'); for (let y = 2; y < h + 18; y += 5) b.rect(0, y, w, 1, '#8a3a2a');
        b.ellipse(w / 2, 20, 9, 7, '#2a1a1a'); b.ellipse(w / 2, 22, 6, 4, '#f08a2a'); b.ellipse(w / 2, 23, 3, 2, '#ffe066');
        return out(b, 0, -20);
      case 'lectern':
        b = new Buf(16, 28);
        b.rect(6, 12, 4, 14, '#5a3a2a'); b.rect(3, 25, 10, 3, '#4a2e1c');
        b.poly([[0, 6], [16, 2], [16, 12], [0, 14]], '#7a4e30'); b.poly([[2, 6], [8, 5], [8, 11], [2, 12]], '#f4e8c0'); b.poly([[8, 5], [14, 4], [14, 10], [8, 11]], '#efe0b0');
        b.set(4, 8, '#3a5a8a'); b.set(11, 7, '#d8343c');
        return out(b, 0, -12);
      case 'crystal':
        b = new Buf(16, 24);
        b.rect(4, 17, 8, 6, '#5a3a2a'); b.ellipse(8, 11, 6, 6, '#b8a0f0'); b.ellipse(6, 9, 2, 2, '#ffffff'); b.ellipse(9, 12, 2, 2, '#e0d0ff');
        return out(b, 0, -8);
      case 'chest':
        b = new Buf(16, 16);
        b.rect(1, 4, 14, 11, '#8a5a3a'); b.rect(1, 4, 14, 4, '#a8724a'); b.rect(1, 7, 14, 1, '#d6aa44'); b.rect(6, 7, 4, 4, '#d6aa44');
        return out(b, 0, -2);
      case 'gear': {
        b = new Buf(w, h + 8);
        const g1 = (cx, cy, r, c) => { b.ellipse(cx, cy, r, r, c); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.rect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 3, 3, c); } b.ellipse(cx, cy, r / 3, r / 3, '#5a4a3a'); };
        g1(12, 12, 9, '#d6aa44'); g1(22, 24, 7, '#b88a30');
        return out(b, 0, -8);
      }
      case 'workbench':
        b = new Buf(w, h + 8);
        b.rect(0, 6, w, 6, '#7a4e30'); b.rect(1, 12, 3, h - 6, '#5a3a2a'); b.rect(w - 4, 12, 3, h - 6, '#5a3a2a');
        b.ellipse(8, 5, 4, 3, '#d6aa44'); b.rect(16, 3, 8, 3, '#8a8a96'); b.rect(26, 2, 2, 5, '#c0c4cc');
        return out(b, 0, -8);
      case 'stairs':
        b = new Buf(16, 32);
        for (let i = 0; i < 6; i++) b.rect(1, 2 + i * 5, 14, 4, i % 2 ? '#7a6a5a' : '#8a7a6a');
        b.rect(0, 0, 2, 32, '#5a4a3a');
        return out(b, 0, 0);
      case 'bath':
        b = new Buf(w, h);
        b.rect(0, 0, w, h, '#7a7a86'); b.rect(3, 3, w - 6, h - 6, '#6ab8d8'); b.rect(3, 3, w - 6, 3, '#9ad8f0');
        for (let i = 0; i < 6; i++) b.ellipse(10 + i * 14, 18 + (i % 2) * 8, 4, 2, '#c4ecff');
        for (let x = 0; x < w; x += 8) b.rect(x, 0, 6, 2, '#9a9aa6');
        return out(b, 0, 0);
      case 'lockers':
        b = new Buf(16, h + 12);
        b.rect(1, 0, 14, h + 12, '#a8724a'); for (let y = 2; y < h + 10; y += 9) { b.rect(2, y, 12, 7, '#c48a5a'); b.set(11, y + 3, '#d6aa44'); }
        return out(b, 0, -12);
      case 'milkfridge':
        b = new Buf(16, 28);
        b.rect(1, 0, 14, 27, '#e8eef4'); b.rect(3, 3, 10, 14, '#c4e6fb'); for (const x of [4, 8]) { b.rect(x, 5, 3, 5, '#f4e0c0'); b.rect(x, 11, 3, 5, '#ffffff'); }
        return out(b, 0, -12);
      case 'massage':
        b = new Buf(16, 24);
        b.rect(2, 0, 12, 14, '#3a3a4a'); b.rect(0, 12, 16, 8, '#4a4a5a'); b.rect(1, 20, 3, 4, '#2a2a36'); b.rect(12, 20, 3, 4, '#2a2a36'); b.rect(4, 2, 8, 9, '#5a5a6a');
        return out(b, 0, -8);
      case 'dummy':
        b = new Buf(16, 32);
        b.rect(7, 12, 2, 19, '#7a4e30'); b.rect(3, 29, 10, 3, '#5a3a2a'); b.rect(2, 12, 12, 3, '#7a4e30');
        b.ellipse(8, 7, 5, 6, '#e8d4a0'); b.rect(4, 16, 8, 10, '#e8d4a0'); b.line(5, 19, 11, 23, '#c84a4a');
        return out(b, 0, -16);
      case 'drum':
        b = new Buf(16, 22);
        b.ellipse(8, 8, 7, 4, '#f4efe6'); b.rect(1, 8, 14, 10, '#c84a3a'); b.rect(1, 11, 14, 1, '#f2d36b'); b.ellipse(8, 18, 7, 3, '#a83a2a');
        b.rect(2, 19, 2, 3, '#5a3a2a'); b.rect(12, 19, 2, 3, '#5a3a2a');
        return out(b, 0, -6);
      default:
        return null;
    }
  }

  // ---------------------------------------------------------- build rooms
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

  function makeRoom(id, spec) {
    const MW = spec.w, MH = spec.h;
    const solid = [];
    for (let y = 0; y < MH; y++) solid.push(new Array(MW).fill(y < 2));
    for (const p of spec.props) {
      if (p.walk || p.overlay) continue;
      for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) solid[p.y + j][p.x + i] = true;
    }
    const isSolid = (tx, ty) => {
      if (tx < 0 || tx >= MW || ty < 0) return true;
      if (ty >= MH) return !(tx === spec.door && ty === MH); // the doorway leads out
      return solid[ty][tx];
    };

    let staticCv = null;
    const sprites = [];
    function build() {
      const b = new Buf(MW * T, MH * T + 4);
      drawFloor(b, spec.floor, MW, MH);
      drawWall(b, spec);
      // floor decorations (rugs, mats) are part of the floor
      for (const p of spec.props) {
        if (!p.walk) continue;
        const s = propSprite(p, spec);
        if (s) b.draw(s.b, p.x * T + s.ox, p.y * T + s.oy);
      }
      // bottom edge + doorway with a mat
      b.rect(0, MH * T, MW * T, 4, '#1a1424');
      if (spec.door >= 0) {
        b.rect(spec.door * T + 2, MH * T - 6, T - 4, 6, '#a8543a');
        b.rect(spec.door * T + 3, MH * T - 5, T - 6, 1, '#d8845a');
        b.rect(spec.door * T, MH * T, T, 4, shade(spec.wall[0], 0.4));
      }
      staticCv = fastCanvas(b);
      for (const p of spec.props) {
        if (p.walk) continue;
        const s = propSprite(p, spec);
        if (!s) continue;
        const footY = (p.y + p.h) * T - (p.overlay ? -1 : 2);
        sprites.push({ y: footY, img: s.b.toCanvas(1), x: p.x * T + s.ox, top: p.y * T + s.oy });
      }
    }

    function randomTile(rnd = Math.random) {
      for (let k = 0; k < 60; k++) {
        const x = Math.floor(rnd() * MW), y = 2 + Math.floor(rnd() * (MH - 3));
        if (!isSolid(x, y)) return { x, y };
      }
      return { x: spec.spawn[0], y: spec.spawn[1] };
    }

    // what's at a tile: an interactable prop or wall decoration
    function objectAt(tx, ty) {
      for (const p of spec.props) {
        if (!p.act || p.walk) continue;
        if (tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) return p;
      }
      if (ty === 1) for (const d of spec.wallDecor) if (d.act && tx >= d.x && tx < d.x + 2) return d;
      return null;
    }

    return {
      id, name: spec.name, T, MW, MH, spec, isSolid,
      door: spec.door, spawn: spec.spawn, wake: spec.wake, stations: spec.stations || {},
      findPath: (sx, sy, gx, gy) => findPathGrid(isSolid, MW, sx, sy, gx, gy),
      randomTile, objectAt,
      staticCanvas() { if (!staticCv) build(); return staticCv; },
      drawables() { if (!staticCv) build(); return sprites; },
    };
  }

  // The girls' bedrooms, only visited when you stay the night at her place.
  // Same layout for everyone (bed top-left, rug in the middle), decorated
  // to suit her.
  // ------------------------------------------------- Hoshimachi City
  // Reached by train. An open-air street (skyline instead of a back wall):
  // shops along the top, a road with crosswalks, a plaza below. The shops
  // are rooms of their own; walking out of one puts you back on the street.
  const shop = (style, x, w, door, enter, label) => ({ type: 'storefront', style, x, y: 2, w, h: 4, door, enter, act: enter ? 'enter' : 'train', label, sign: label });
  ROOMS.city = {
    name: 'Hoshimachi City', w: 36, h: 20, door: -1, floor: 'sidewalk', wall: ['#9ad0f4', '#8ac0e4'], skyline: true, outdoor: true, traffic: true,
    spawn: [3, 6], wake: [3, 6], wallDecor: [],
    props: [
      { type: 'road', x: 0, y: 8, w: 36, h: 3, walk: true },
      { type: 'crosswalk', x: 31, y: 8, w: 2, h: 3, walk: true },
      { type: 'crosswalk', x: 10, y: 8, w: 2, h: 3, walk: true },
      { type: 'crosswalk', x: 21, y: 8, w: 2, h: 3, walk: true },
      { type: 'plazatile', x: 5, y: 13, w: 20, h: 6, walk: true },
      shop('station', 1, 6, 3, null, 'Hoshimachi Station'),
      shop('mcronalds', 8, 5, 10, 'mcronalds', "McRonald's"),
      shop('kitsune', 14, 4, 15, 'kitsune', 'Kentucky Fried Kitsune'),
      shop('sushi', 19, 4, 20, 'sushi', 'Kura-Kura Sushi'),
      shop('megamall', 24, 6, 26, 'megamall', 'Hoshimachi Megamall'),
      shop('fancy', 31, 5, 33, 'fancy', 'Le Ciel Étoilé'),
      ...[[7, 7], [13, 7], [18, 7], [23, 7], [30, 7], [4, 12], [12, 12], [18, 12], [26, 12], [33, 12]].map(([x, y]) => ({ type: 'streetlamp', x, y, w: 1, h: 1 })),
      { type: 'cityfountain', x: 13, y: 15, w: 4, h: 2, act: 'cityfountain', label: 'Fountain' },
      ...[[8, 14], [20, 14], [8, 18], [20, 18]].map(([x, y]) => ({ type: 'citybench', x, y, w: 2, h: 1, act: 'citybench', label: 'Bench' })),
      ...[[2, 13], [2, 17], [28, 13], [28, 18], [6, 16], [23, 17], [31, 15], [34, 17]].map(([x, y]) => ({ type: 'citytree', x, y, w: 1, h: 1 })),
      { type: 'foodtruck', x: 25, y: 15, w: 3, h: 2, act: 'crepe', label: 'Crêpe truck' },
      { type: 'wcbooth', x: 33, y: 15, w: 1, h: 1, act: 'restroom', label: 'Public restroom' },
    ],
  };
  ROOMS.mcronalds = {
    name: "McRonald's", w: 12, h: 8, door: 6, floor: 'diner', wall: ['#ffd84a', '#f4c83a'], spawn: [6, 6],
    wallDecor: [{ type: 'menuboard', x: 1, w: 5, color: '#d8342c' }, { type: 'window', x: 7 }, { type: 'window', x: 9 }],
    props: [
      { type: 'fastcounter', x: 1, y: 3, w: 5, h: 1, act: 'order', label: 'Order counter', color: '#d8342c' },
      { type: 'table', x: 8, y: 4, w: 1, h: 1 }, { type: 'table', x: 10, y: 6, w: 1, h: 1 }, { type: 'table', x: 2, y: 6, w: 1, h: 1 },
      { type: 'plant', x: 11, y: 2, w: 1, h: 1 },
    ],
  };
  ROOMS.kitsune = {
    name: 'Kentucky Fried Kitsune', w: 12, h: 8, door: 6, floor: 'diner', wall: ['#ffffff', '#f4ecec'], spawn: [6, 6],
    wallDecor: [{ type: 'stripes', x: 0, w: 12, color: '#c8342c' }, { type: 'menuboard', x: 1, w: 4, color: '#8a2a24', food: 'chicken' }, { type: 'window', x: 8 }],
    props: [
      { type: 'fastcounter', x: 1, y: 3, w: 4, h: 1, act: 'order', label: 'Order counter', color: '#c8342c' },
      { type: 'table', x: 8, y: 4, w: 1, h: 1 }, { type: 'table', x: 10, y: 6, w: 1, h: 1 }, { type: 'table', x: 2, y: 6, w: 1, h: 1 },
      { type: 'plant', x: 11, y: 2, w: 1, h: 1 },
    ],
  };
  ROOMS.sushi = {
    name: 'Kura-Kura Sushi', w: 12, h: 8, door: 6, floor: 'planks', wall: ['#e8d8b8', '#d8c8a8'], spawn: [6, 6],
    wallDecor: [{ type: 'shoji', x: 1 }, { type: 'scroll', x: 5 }, { type: 'menuboard', x: 7, w: 4, color: '#2a3a6a', food: 'sushi' }],
    props: [
      { type: 'conveyor', x: 1, y: 2, w: 10, h: 1, act: 'order', label: 'Sushi conveyor' },
      ...[2, 4, 6, 8].map((x) => ({ type: 'stool', x, y: 3, w: 1, h: 1, seat: true })),
      { type: 'table', x: 10, y: 6, w: 1, h: 1 }, { type: 'plant', x: 11, y: 4, w: 1, h: 1 },
    ],
  };
  ROOMS.megamall = {
    name: 'Hoshimachi Megamall', w: 18, h: 12, door: 9, floor: 'marble', wall: ['#f4e8f0', '#e8d8e4'], spawn: [9, 10],
    wallDecor: [{ type: 'sale', x: 1 }, { type: 'window', x: 4 }, { type: 'neon', x: 11 }],
    props: [
      { type: 'rack', x: 1, y: 3, w: 2, h: 1, act: 'mallfashion', label: 'Fashion boutique' },
      { type: 'mirror', x: 4, y: 2, w: 1, h: 1, act: 'mallfashion', label: 'Fitting mirror' },
      { type: 'rack', x: 1, y: 5, w: 2, h: 1, act: 'mallfashion', label: 'Fashion boutique' },
      { type: 'escalator', x: 8, y: 2, w: 2, h: 3 },
      { type: 'purikura', x: 14, y: 2, w: 2, h: 2, act: 'purikura', label: 'Purikura photo booth' },
      { type: 'shopcounter', x: 12, y: 7, w: 3, h: 1, act: 'cityshop', label: 'Gift boutique' },
      { type: 'display', x: 15, y: 7, w: 2, h: 1, act: 'cityshop', label: 'Gift boutique' },
      { type: 'cityfountain', x: 5, y: 7, w: 3, h: 2 },
      { type: 'citybench', x: 1, y: 9, w: 2, h: 1, act: 'citybench', label: 'Bench' },
      { type: 'plant', x: 0, y: 11, w: 1, h: 1 }, { type: 'plant', x: 17, y: 11, w: 1, h: 1 }, { type: 'plant', x: 11, y: 2, w: 1, h: 1 },
    ],
  };
  ROOMS.fancy = {
    name: 'Le Ciel Étoilé', w: 14, h: 9, door: 7, floor: 'carpet', wall: ['#3a2438', '#2e1c2e'], spawn: [7, 7],
    wallDecor: [{ type: 'painting', x: 5 }, { type: 'window', x: 8 }, { type: 'window', x: 10 }, { type: 'painting', x: 12 }],
    props: [
      { type: 'piano', x: 1, y: 2, w: 3, h: 2, act: 'piano', label: 'Grand piano' },
      { type: 'finetable', x: 6, y: 3, w: 2, h: 1, act: 'fancy', label: 'Candlelit table' },
      { type: 'finetable', x: 10, y: 3, w: 2, h: 1, act: 'fancy', label: 'Candlelit table' },
      { type: 'finetable', x: 6, y: 6, w: 2, h: 1, act: 'fancy', label: 'Candlelit table' },
      { type: 'finetable', x: 10, y: 6, w: 2, h: 1, act: 'fancy', label: 'Candlelit table' },
      { type: 'podium', x: 4, y: 7, w: 1, h: 1, act: 'fancy', label: "Maître d'" },
      { type: 'plant', x: 0, y: 8, w: 1, h: 1 }, { type: 'plant', x: 13, y: 8, w: 1, h: 1 }, { type: 'plant', x: 13, y: 2, w: 1, h: 1 },
    ],
  };
  // Lucky Seven Casino (in town, east district)
  ROOMS.casino = {
    name: 'Lucky Seven Casino', w: 14, h: 10, door: 7, floor: 'carpet', wall: ['#1e1430', '#180f28'], spawn: [7, 8],
    stations: { yumeko: [9, 7] },
    wallDecor: [{ type: 'neon', x: 1 }, { type: 'neon2', x: 5 }, { type: 'neon', x: 8 }],
    props: [
      ...[1, 2, 3, 4, 5].map((x) => ({ type: 'slotmachine', x, y: 2, w: 1, h: 1, act: 'slots', label: 'Slot machine' })),
      { type: 'bjtable', x: 8, y: 4, w: 3, h: 2, act: 'blackjack', label: 'Blackjack table' },
      { type: 'counter', x: 11, y: 2, w: 3, h: 1, act: 'casinobar', label: 'Bar' },
      { type: 'plant', x: 0, y: 9, w: 1, h: 1 }, { type: 'plant', x: 13, y: 9, w: 1, h: 1 },
      { type: 'citybench', x: 1, y: 6, w: 2, h: 1, act: 'citybench', label: 'Lounge sofa' },
    ],
  };
  // the train between Sakuragaoka and the city (scenery scrolls past)
  ROOMS.train = {
    name: 'Train', w: 14, h: 6, door: 7, floor: 'train', wall: ['#e8ecf0', '#d8dce4'], spawn: [7, 4], scenery: true,
    wallDecor: [{ type: 'trainwindow', x: 1 }, { type: 'trainwindow', x: 4 }, { type: 'trainwindow', x: 8 }, { type: 'trainwindow', x: 11 }],
    props: [
      { type: 'trainseat', x: 1, y: 2, w: 5, h: 1 },
      { type: 'trainseat', x: 8, y: 2, w: 5, h: 1 },
    ],
  };
  for (const p of ROOMS.city.props) if (p.enter) Object.assign(ROOMS[p.enter], { parent: 'city', exitAt: [p.door, p.y + p.h] });

  // The girls' apartments, only visited when you stay the night at her place:
  // bedroom and living space on the left, kitchenette top right, bathroom
  // bottom right. Same plan for everyone, decorated to suit her.
  const girlRoom = (name, o) => ({
    name, w: 14, h: 10, door: 5, floor: o.floor, wall: o.wall, spawn: [5, 8], wake: [3, 4], bedroom: true,
    wallDecor: [...o.decor, { type: 'backsplash', x: 9, w: 5 }],
    props: [
      { type: 'tilefloor', x: 9, y: 2, w: 5, h: 3, walk: true, color: 'kitchen' },
      { type: 'tilefloor', x: 9, y: 6, w: 5, h: 4, walk: true },
      { type: 'rug', x: 3, y: 5, w: 3, h: 2, walk: true, color: o.rug, sit: true },
      { type: 'bathmat', x: 10, y: 8, w: 2, h: 1, walk: true, color: o.mat || PX.tint(o.blanket, 0.3) },
      { type: 'wall', x: 8, y: 5, w: 6, h: 1 },
      { type: 'wall', x: 8, y: 6, w: 1, h: 1 },
      { type: 'wall', x: 8, y: 8, w: 1, h: 2 },
      { type: 'bed', x: 1, y: 2, w: 2, h: 3, color: o.blanket },
      { type: 'nightstand', x: 3, y: 2, w: 1, h: 1, color: o.lamp },
      { type: 'kcounter', x: 9, y: 2, w: 1, h: 1, color: o.cab },
      { type: 'sink', x: 10, y: 2, w: 1, h: 1, color: o.cab },
      { type: 'stove', x: 11, y: 2, w: 1, h: 1, color: o.cab },
      { type: 'kcounter', x: 12, y: 2, w: 1, h: 1, color: o.cab },
      { type: 'fridge', x: 13, y: 2, w: 1, h: 1 },
      { type: 'basin', x: 10, y: 6, w: 1, h: 1 },
      { type: 'toilet', x: 11, y: 6, w: 1, h: 1 },
      { type: 'tub', x: 12, y: 6, w: 2, h: 2 },
      { type: 'shower', x: 9, y: 8, w: 1, h: 2 },
      ...o.props,
    ],
  });
  const BEDROOMS = {
    nami: girlRoom("Nami's Room", { floor: 'wood', wall: ['#ffe4c4', '#f6d4ac'], blanket: '#f2913d', rug: '#5aa8f0', cab: '#5aa8f0', decor: [{ type: 'map', x: 4 }, { type: 'window', x: 6 }], props: [{ type: 'desk', x: 5, y: 2, w: 2, h: 1 }, { type: 'plant', x: 7, y: 2, w: 1, h: 1 }, { type: 'boxes', x: 7, y: 8, w: 1, h: 1 }] }),
    aqua: girlRoom("Aqua's Room", { floor: 'lightwood', wall: ['#e4f2ff', '#d0e6f8'], blanket: '#3b78e0', rug: '#8fd3f7', cab: '#8fd3f7', decor: [{ type: 'shoji', x: 4 }, { type: 'scroll', x: 7 }], props: [{ type: 'tatami', x: 4, y: 7, w: 3, h: 2, walk: true }, { type: 'drum', x: 6, y: 2, w: 1, h: 1 }, { type: 'plant', x: 7, y: 8, w: 1, h: 1 }] }),
    yumeko: girlRoom("Yumeko's Room", { floor: 'planks', wall: ['#6a2a36', '#5a222c'], blanket: '#c8303a', rug: '#2a2232', cab: '#2a2232', lamp: '#ffb0a0', decor: [{ type: 'window', x: 4 }, { type: 'poster', x: 6 }], props: [{ type: 'table', x: 6, y: 3, w: 1, h: 1 }, { type: 'cabinet', x: 5, y: 2, w: 1, h: 1, color: '#c8303a' }, { type: 'plant', x: 7, y: 8, w: 1, h: 1 }] }),
    kurumi: girlRoom("Kurumi's Room", { floor: 'planks', wall: ['#3e2c40', '#322236'], blanket: '#d8343c', rug: '#1e1a24', cab: '#3a2a3a', lamp: '#ff8a8a', decor: [{ type: 'clockface', x: 4 }, { type: 'clock', x: 6 }, { type: 'clock', x: 7 }], props: [{ type: 'gear', x: 5, y: 2, w: 2, h: 2 }, { type: 'plant', x: 7, y: 8, w: 1, h: 1 }] }),
    rem: girlRoom("Rem's Room", { floor: 'pink', wall: ['#e4eeff', '#d4e2f8'], blanket: '#7cb4f0', rug: '#ffffff', cab: '#ffffff', decor: [{ type: 'window', x: 4 }, { type: 'heartsign', x: 6 }], props: [{ type: 'table', x: 6, y: 3, w: 1, h: 1 }, { type: 'plant', x: 7, y: 2, w: 1, h: 1 }, { type: 'plant', x: 7, y: 8, w: 1, h: 1 }] }),
    zerotwo: girlRoom("Zero Two's Room", { floor: 'wood', wall: ['#ffe4ec', '#f8d2de'], blanket: '#d83c4c', rug: '#f4a6c0', cab: '#d83c4c', decor: [{ type: 'window', x: 4 }, { type: 'window', x: 6 }], props: [{ type: 'honeyshelf', x: 6, y: 2, w: 1, h: 1 }, { type: 'plant', x: 7, y: 8, w: 1, h: 1 }] }),
    krul: girlRoom("Krul's Attic", { floor: 'planks', wall: ['#2e1a2a', '#241422'], blanket: '#8a1e2e', rug: '#3a1a2a', cab: '#2a1a24', lamp: '#ff6a7a', decor: [{ type: 'clockface', x: 4 }, { type: 'painting', x: 6 }], props: [{ type: 'mirror', x: 5, y: 2, w: 1, h: 1 }, { type: 'chest', x: 6, y: 2, w: 1, h: 1 }, { type: 'cabinet', x: 7, y: 2, w: 1, h: 1, color: '#8a1e2e' }, { type: 'plant', x: 7, y: 8, w: 1, h: 1 }] }),
    marin: girlRoom("Marin's Room", { floor: 'pink', wall: ['#fff0f6', '#f8e0ec'], blanket: '#f05a8a', rug: '#ffd0e0', cab: '#f8a8c8', lamp: '#ffb0d0', decor: [{ type: 'poster', x: 4 }, { type: 'window', x: 6 }], props: [{ type: 'rack', x: 5, y: 2, w: 2, h: 1 }, { type: 'mannequin', x: 7, y: 3, w: 1, h: 1 }, { type: 'mirror', x: 4, y: 7, w: 1, h: 1 }, { type: 'plant', x: 7, y: 8, w: 1, h: 1 }] }),
    frieren: girlRoom("Frieren's Room", { floor: 'lightwood', wall: ['#c8b898', '#b8a888'], blanket: '#e4f4ec', rug: '#6a8a6a', cab: '#6a8a6a', decor: [{ type: 'window', x: 4 }, { type: 'scroll', x: 7 }], props: [{ type: 'shelf', x: 5, y: 2, w: 2, h: 1 }, { type: 'lectern', x: 7, y: 3, w: 1, h: 1 }, { type: 'crystal', x: 6, y: 7, w: 1, h: 1 }, { type: 'chest', x: 7, y: 8, w: 1, h: 1 }] }),
  };
  for (const [id, spec] of Object.entries(BEDROOMS)) ROOMS['room_' + id] = spec;

  const MAPS = {};
  for (const [id, spec] of Object.entries(ROOMS)) MAPS[id] = makeRoom(id, spec);

  global.INTERIORS = MAPS;
})(window);
