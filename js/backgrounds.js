// Pixel-art location backgrounds (192x144), with time-of-day grading.
(function (global) {
  'use strict';
  const { Buf, shade, tint, mix } = PX;
  const BW = 192, BH = 144;

  const SKIES = [
    ['#8fd0ff', '#b4e1ff', '#d8f1ff'], // morning
    ['#5aa8f0', '#7fc0f8', '#aad8ff'], // noon
    ['#6a5aa8', '#e07a8a', '#ffb07a'], // evening
    ['#141634', '#1f2350', '#2e3266'], // night
  ];
  const GRADE = [
    { c: '#fff0d8', a: 0.08 },
    null,
    { c: '#ff9070', a: 0.22 },
    { c: '#1a1e4a', a: 0.5 },
  ];

  function checker(b, x, y, w, h, c1, c2) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.set(x + i, y + j, (i + j) % 2 ? c2 : c1);
  }

  function sky(b, t, h = 80) {
    const s = SKIES[t];
    const band = Math.ceil(h / 3);
    for (let k = 0; k < 3; k++) {
      b.rect(0, k * band, BW, band, s[k]);
      if (k > 0) for (let i = 0; i < BW; i += 2) b.set(i + ((k * band) % 2), k * band, s[k - 1]);
    }
    if (t === 3) {
      for (let i = 0; i < 40; i++) b.set((i * 73) % BW, (i * 37) % (h - 10), i % 5 ? '#c8ccff' : '#ffffff');
      b.ellipse(158, 16, 7, 7, '#fff6d6');
      b.ellipse(161, 14, 6, 6, s[0]);
    } else if (t === 2) {
      b.ellipse(150, h - 12, 12, 12, '#ffd08a');
    } else {
      b.ellipse(160, 16, 8, 8, '#fff7c8');
      cloud(b, 30, 18, '#ffffff');
      cloud(b, 105, 30, '#f4fbff');
    }
    if (t !== 3) cloud(b, 70, 12, t === 2 ? '#f7b8a8' : '#ffffff');
  }

  function cloud(b, x, y, c) {
    b.ellipse(x, y, 10, 4, c);
    b.ellipse(x + 8, y - 3, 7, 5, c);
    b.ellipse(x - 7, y + 1, 6, 3, c);
    b.rect(x - 12, y + 3, 26, 1, shade(c, 0.08));
  }

  function planks(b, y, c) {
    b.rect(0, y, BW, BH - y, c);
    for (let j = y + 6; j < BH; j += 7) b.rect(0, j, BW, 1, shade(c, 0.18));
    for (let j = y, r = 0; j < BH; j += 7, r++) {
      for (let i = (r * 23) % 40; i < BW; i += 40) b.rect(i, j, 1, 6, shade(c, 0.14));
    }
    b.rect(0, y, BW, 1, shade(c, 0.3));
  }

  function windowFrame(b, x, y, w, h, t, frame = '#f4efe6') {
    const s = SKIES[t];
    b.rect(x, y, w, h, frame);
    b.rect(x + 2, y + 2, w - 4, h - 4, s[1]);
    b.rect(x + 2, y + 2, w - 4, Math.floor((h - 4) / 2), s[0]);
    if (t === 3) { b.set(x + 6, y + 5, '#fff'); b.set(x + w - 8, y + 8, '#fff'); b.ellipse(x + w - 9, y + 6, 2, 2, '#fff6d6'); }
    else { b.ellipse(x + 10, y + h - 8, 6, 3, '#ffffff'); }
    b.rect(x + Math.floor(w / 2) - 1, y, 2, h, frame);
    b.rect(x, y + Math.floor(h / 2) - 1, w, 2, frame);
    b.rect(x, y + h, w, 2, shade(frame, 0.25));
    b.line(x + 5, y + 8, x + 9, y + 4, tint(s[0], 0.5));
  }

  function plant(b, x, y) {
    b.rect(x, y, 8, 7, '#c86a4a');
    b.rect(x, y, 8, 1, '#e08a62');
    b.ellipse(x + 4, y - 4, 6, 5, '#4f9a5a');
    b.ellipse(x + 1, y - 7, 3, 3, '#6cbf6a');
    b.ellipse(x + 7, y - 8, 3, 3, '#3f8048');
  }

  function sakura(b, x, y, petals) {
    b.rect(x - 2, y, 5, 40, '#6e4a3a');
    b.line(x, y + 6, x - 10, y - 4, '#6e4a3a');
    b.line(x + 1, y + 4, x + 12, y - 6, '#6e4a3a');
    b.ellipse(x, y - 10, 20, 13, '#f6b8cc');
    b.ellipse(x - 14, y - 2, 11, 8, '#f6b8cc');
    b.ellipse(x + 14, y - 2, 11, 8, '#efa2bb');
    b.ellipse(x + 4, y - 16, 12, 7, '#fbd2df');
    for (let i = 0; i < petals; i++) b.set(x - 18 + ((i * 13) % 38), y - 18 + ((i * 7) % 24), '#ffffff');
  }

  function lantern(b, x, y) {
    b.rect(x, y, 6, 3, '#9a9aa6');
    b.rect(x + 1, y + 3, 4, 5, '#b6b6c0');
    b.rect(x + 2, y + 4, 2, 2, '#ffe08a');
    b.rect(x - 1, y + 8, 8, 2, '#8a8a96');
    b.rect(x + 2, y + 10, 2, 8, '#9a9aa6');
    b.rect(x, y + 18, 6, 2, '#8a8a96');
  }

  // ---------------------------------------------------------------- scenes
  const SCENES = {};

  SCENES.home = (b, t, L) => {
    b.rect(0, 0, BW, 98, '#c9b8e0');
    for (let i = 0; i < BW; i += 12) b.rect(i, 0, 1, 98, '#bda9d6');
    b.rect(0, 92, BW, 6, '#f2ead8');
    windowFrame(b, 72, 16, 48, 36, t);
    b.rect(66, 12, 60, 3, '#8a6a4a');
    b.rect(66, 14, 8, 44, '#f28aa0'); b.rect(118, 14, 8, 44, '#f28aa0');
    b.rect(68, 14, 2, 44, '#f7aabc'); b.rect(120, 14, 2, 44, '#d86a84');
    planks(b, 98, '#c48a5a');
    // rug
    b.ellipse(96, 124, 40, 10, '#7f9ae0');
    b.ellipse(96, 124, 34, 7, '#a2b8f2');
    // bed
    b.rect(136, 70, 54, 36, '#8a5a3a');
    b.rect(138, 74, 52, 20, '#ffffff');
    b.rect(138, 84, 52, 18, '#6fa8e8');
    b.rect(138, 84, 52, 2, '#9cc6f4');
    b.rect(142, 76, 16, 7, '#fff3f6');
    b.rect(136, 104, 4, 6, '#6a4028');
    // desk + laptop
    b.rect(6, 70, 46, 5, '#a8724a');
    b.rect(8, 75, 3, 28, '#8a5a3a'); b.rect(47, 75, 3, 28, '#8a5a3a');
    b.rect(16, 58, 22, 12, '#3a3a4a'); b.rect(18, 60, 18, 8, '#7ad0ff');
    b.rect(14, 69, 26, 2, '#5a5a6a');
    if (t !== 3) b.rect(19, 61, 8, 1, '#ffffff');
    plant(b, 44, 63);
    // posters
    b.rect(20, 22, 22, 28, '#ffffff'); b.rect(22, 24, 18, 24, '#ff9fb8');
    b.ellipse(31, 32, 5, 5, '#fff3a0'); b.rect(24, 42, 14, 3, '#ffffff');
    b.rect(150, 24, 24, 18, '#f4e6c8'); b.rect(152, 26, 20, 14, '#8fd6a6');
    L.push(() => { if (t === 3) b.rect(18, 60, 18, 8, '#bfe8ff'); });
  };

  SCENES.cafe = (b, t, L) => {
    b.rect(0, 0, BW, 96, '#e8c9a0');
    for (let i = 0; i < BW; i += 8) b.rect(i, 60, 1, 36, '#c9a27a');
    b.rect(0, 58, BW, 3, '#8a5a3a');
    b.rect(0, 60, BW, 36, '#b88a62');
    for (let i = 4; i < BW; i += 8) b.rect(i, 62, 4, 32, '#c99a70');
    windowFrame(b, 10, 10, 44, 40, t, '#6a4a32');
    // chalkboard menu
    b.rect(112, 8, 58, 38, '#7a5236'); b.rect(115, 11, 52, 32, '#2f3a34');
    b.rect(120, 15, 22, 1, '#f4f4f4'); b.rect(120, 21, 30, 1, '#f4c4d4'); b.rect(120, 27, 26, 1, '#f4f4f4'); b.rect(120, 33, 34, 1, '#c4e4f4');
    b.ellipse(158, 17, 3, 3, '#f4c4d4');
    // pendant lamps
    for (const x of [70, 92]) { b.rect(x, 0, 1, 14, '#3a2a22'); b.poly([[x - 6, 20], [x + 7, 20], [x + 3, 14], [x - 2, 14]], '#2f6a5a'); b.rect(x - 2, 20, 5, 2, '#ffe9a8'); }
    planks(b, 96, '#9a6a44');
    // counter
    b.rect(104, 70, 88, 34, '#7a4e30'); b.rect(104, 68, 88, 4, '#d8b48a');
    for (let i = 108; i < BW; i += 14) b.rect(i, 76, 10, 22, '#8a5c3a');
    b.rect(150, 52, 22, 16, '#c0c4cc'); b.rect(152, 54, 18, 6, '#9aa0aa'); b.rect(158, 62, 4, 4, '#3a3a3a');
    b.rect(126, 60, 8, 8, '#f4f0ea'); b.rect(127, 58, 6, 2, '#ffffff');
    b.ellipse(116, 64, 5, 3, '#f7c6d4'); b.rect(111, 66, 10, 2, '#ffffff');
    // table + chairs
    b.ellipse(48, 110, 18, 4, '#f4efe6'); b.rect(46, 112, 4, 18, '#5a3a2a'); b.rect(38, 128, 20, 3, '#5a3a2a');
    b.rect(44, 102, 6, 6, '#ffffff'); b.rect(45, 103, 4, 2, '#8a5a3a');
    b.rect(18, 104, 12, 3, '#c84a4a'); b.rect(22, 107, 4, 24, '#4a3a32');
    b.rect(66, 104, 12, 3, '#c84a4a'); b.rect(70, 107, 4, 24, '#4a3a32');
    L.push(() => {
      for (const x of [70, 92]) { b.ellipse(x, 24, 8, 3, t >= 2 ? '#fff4c0' : '#fff7d6'); }
    });
  };

  SCENES.school = (b, t, L) => {
    b.rect(0, 0, BW, 100, '#dfe6d8');
    b.rect(0, 0, BW, 6, '#c8d2c0');
    // bookshelves
    const shelf = (x) => {
      b.rect(x, 14, 44, 84, '#7a4e30');
      for (let r = 0; r < 4; r++) {
        const y = 18 + r * 20;
        b.rect(x + 3, y, 38, 16, '#4a2e1c');
        for (let i = 0, bx = x + 4; bx < x + 40; i++) {
          const w = 2 + ((i * 7 + r * 3 + x) % 3);
          const h = 11 + ((i * 5 + r) % 5);
          const cols = ['#c84a4a', '#4a7ac8', '#e0b04a', '#4aa070', '#9a5ac8', '#e08a5a'];
          b.rect(bx, y + 16 - h, w, h, cols[(i + r + x) % cols.length]);
          b.rect(bx, y + 16 - h + 2, w, 1, '#f4efe0');
          bx += w + 1;
        }
        b.rect(x + 2, y + 16, 40, 2, '#9a6a44');
      }
    };
    shelf(4); shelf(146);
    windowFrame(b, 66, 16, 60, 40, t);
    b.rect(64, 60, 64, 3, '#c8d2c0');
    b.rect(84, 66, 24, 18, '#ffffff'); b.rect(86, 68, 20, 2, '#4a4a5a'); b.rect(86, 72, 16, 1, '#8a8a9a'); b.rect(86, 76, 18, 1, '#8a8a9a');
    planks(b, 100, '#b89a7a');
    b.rect(52, 106, 88, 6, '#a8724a'); b.rect(56, 112, 4, 22, '#7a4e30'); b.rect(132, 112, 4, 22, '#7a4e30');
    b.rect(62, 100, 14, 6, '#4a7ac8'); b.rect(62, 100, 14, 1, '#ffffff');
    b.rect(110, 98, 6, 8, '#f4efe6'); b.rect(116, 100, 2, 3, '#f4efe6');
  };

  SCENES.park = (b, t, L) => {
    sky(b, t, 78);
    b.ellipse(40, 86, 70, 18, '#7cc47a');
    b.ellipse(150, 88, 70, 16, '#6ab06a');
    b.rect(0, 84, BW, 60, '#86cc6e');
    checker(b, 0, 84, BW, 1, '#86cc6e', '#7cc47a');
    // path
    b.poly([[70, 144], [122, 144], [104, 90], [90, 90]], '#e8d8b0');
    b.line(90, 90, 70, 144, '#cdb98e'); b.line(104, 90, 122, 144, '#cdb98e');
    sakura(b, 28, 64, 16);
    sakura(b, 164, 60, 14);
    // bench
    b.rect(130, 104, 40, 3, '#a8724a'); b.rect(130, 98, 40, 3, '#a8724a');
    b.rect(133, 107, 2, 10, '#4a3a32'); b.rect(165, 107, 2, 10, '#4a3a32');
    // lamp post
    b.rect(60, 70, 2, 46, '#3a3a4a'); b.rect(57, 66, 8, 5, '#3a3a4a'); b.rect(58, 67, 6, 3, '#fff2b0');
    for (let i = 0; i < 30; i++) b.set((i * 41) % BW, 96 + ((i * 17) % 46), i % 3 ? '#a8de8a' : '#f6b8cc');
    for (let i = 0; i < 10; i++) b.set(20 + ((i * 29) % 150), 40 + ((i * 11) % 50), '#fbd2df');
    L.push(() => { if (t >= 2) { b.rect(58, 67, 6, 3, '#fff7c8'); b.ellipse(61, 74, 5, 2, '#fff2b0'); } });
  };

  SCENES.beach = (b, t, L) => {
    sky(b, t, 70);
    const sea = t === 3 ? ['#1a2a5a', '#24366c'] : t === 2 ? ['#5a6ab0', '#7a7ac0'] : ['#3aa0e0', '#5ab8f0'];
    b.rect(0, 64, BW, 30, sea[0]);
    for (let j = 66; j < 94; j += 4) for (let i = (j * 7) % 16; i < BW; i += 16) b.rect(i, j, 6, 1, sea[1]);
    for (let i = 0; i < BW; i += 9) b.rect(i, 92, 5, 1, '#ffffff');
    b.rect(0, 94, BW, 50, '#f4dca0');
    checker(b, 0, 94, BW, 2, '#f4dca0', '#ffffff');
    for (let i = 0; i < 40; i++) b.set((i * 37) % BW, 100 + ((i * 13) % 44), '#e0c088');
    // umbrella
    b.rect(150, 74, 2, 42, '#f4f4f4');
    b.poly([[128, 82], [174, 82], [166, 72], [151, 66], [136, 72]], '#f05a6a');
    b.poly([[146, 82], [156, 82], [154, 70], [151, 66], [148, 70]], '#ffffff');
    b.rect(136, 112, 30, 4, '#5ab8f0'); b.rect(136, 112, 30, 1, '#9ad8ff');
    // palm
    b.poly([[22, 120], [28, 120], [32, 70], [28, 70]], '#a8724a');
    for (let j = 74; j < 120; j += 5) b.rect(26 + Math.floor((120 - j) / 12), j, 4, 1, '#8a5a3a');
    b.poly([[30, 68], [6, 72], [12, 66]], '#4aa060'); b.poly([[30, 68], [52, 74], [46, 64]], '#4aa060');
    b.poly([[30, 68], [18, 56], [26, 58]], '#5ab870'); b.poly([[30, 68], [44, 54], [38, 62]], '#5ab870');
    // shells & ball
    b.ellipse(100, 128, 6, 6, '#ffffff'); b.ellipse(100, 128, 6, 2, '#f05a6a'); b.rect(96, 126, 2, 4, '#5ab8f0');
    b.rect(70, 116, 3, 2, '#f7b8c8'); b.rect(120, 134, 3, 2, '#f7d8a8');
    L.push(() => { if (t === 3) for (let i = 0; i < BW; i += 11) b.rect(i, 70 + (i % 20), 3, 1, '#fff6d6'); });
  };

  SCENES.mall = (b, t, L) => {
    sky(b, t, 30);
    const shop = (x, w, wall, awn, sign) => {
      b.rect(x, 18, w, 80, wall);
      b.rect(x, 18, w, 3, shade(wall, 0.2));
      b.rect(x + 4, 26, w - 8, 10, sign);
      b.rect(x + 8, 30, w - 16, 2, '#ffffff');
      for (let i = 0; i < w; i += 6) b.rect(x + i, 40, 6, 8, i % 12 ? '#ffffff' : awn);
      b.rect(x, 48, w, 1, shade(awn, 0.3));
      b.rect(x + 4, 52, w - 8, 30, '#a8d8f0'); b.rect(x + 4, 52, w - 8, 2, '#d8f0ff');
      b.line(x + 8, 78, x + 18, 56, '#d8f0ff');
      b.rect(x + w / 2 - 6, 70, 12, 28, '#5a3a2a'); b.rect(x + w / 2 - 5, 72, 10, 24, '#7a5a3a');
    };
    shop(0, 62, '#f4e0c8', '#f05a6a', '#f05a6a');
    shop(64, 64, '#dff0e6', '#4aa070', '#4aa070');
    shop(130, 62, '#e8def8', '#7a6ae0', '#7a6ae0');
    // items in windows
    b.ellipse(14, 72, 5, 5, '#f7b8c8'); b.ellipse(22, 74, 4, 4, '#ffffff'); b.rect(15, 76, 10, 6, '#4aa070');
    b.rect(76, 66, 8, 12, '#c84a4a'); b.rect(86, 64, 6, 14, '#4a7ac8');
    b.ellipse(146, 70, 6, 6, '#f0c060'); b.rect(166, 64, 10, 10, '#f05a6a');
    b.rect(0, 98, BW, 46, '#d8d0c8');
    for (let j = 98; j < BH; j += 8) for (let i = (j / 8) % 2 ? 0 : 8; i < BW; i += 16) b.rect(i, j, 8, 8, '#c8beb4');
    b.rect(0, 98, BW, 2, '#a89e94');
    plant(b, 56, 104); plant(b, 124, 104);
    L.push(() => {
      if (t >= 2) {
        b.rect(4, 26, 54, 10, '#ff7a8a'); b.rect(68, 26, 56, 10, '#6ae0a0'); b.rect(134, 26, 54, 10, '#a89aff');
        b.rect(4, 52, 54, 30, '#fff0b0'); b.rect(68, 52, 56, 30, '#fff0b0'); b.rect(134, 52, 54, 30, '#fff0b0');
      }
    });
  };

  SCENES.arcade = (b, t, L) => {
    b.rect(0, 0, BW, BH, '#1e1832');
    for (let i = 0; i < BW; i += 16) b.rect(i, 0, 8, 96, '#241d3c');
    b.rect(0, 96, BW, 48, '#2a2040');
    for (let j = 96; j < BH; j += 6) for (let i = (j / 6) % 2 ? 0 : 6; i < BW; i += 12) b.rect(i, j, 6, 6, '#32284c');
    const cab = (x, c, scr) => {
      b.rect(x, 40, 30, 70, c);
      b.rect(x + 2, 40, 26, 8, shade(c, 0.3));
      b.rect(x + 4, 52, 22, 18, '#0a0a14');
      b.rect(x + 6, 54, 18, 14, scr);
      b.rect(x, 72, 30, 6, shade(c, 0.2));
      b.ellipse(x + 9, 74, 2, 2, '#f05a6a'); b.rect(x + 17, 73, 3, 3, '#5ab8f0'); b.rect(x + 22, 73, 3, 3, '#f0d05a');
    };
    cab(8, '#5a3ac8', '#40d0a0');
    cab(44, '#c83a7a', '#f0a040');
    // claw machine
    b.rect(124, 26, 50, 86, '#f05a8a');
    b.rect(128, 32, 42, 44, '#b8e8ff');
    b.rect(128, 64, 42, 12, '#f7c6d4');
    b.ellipse(138, 64, 5, 4, '#f0d05a'); b.ellipse(150, 63, 5, 4, '#8ad0f0'); b.ellipse(161, 65, 5, 4, '#c8a0f0');
    b.rect(148, 32, 2, 14, '#c0c4cc'); b.poly([[144, 46], [154, 46], [152, 50], [146, 50]], '#c0c4cc');
    b.rect(124, 80, 50, 4, '#ffffff'); b.rect(140, 90, 18, 10, '#2a2040');
    b.rect(128, 20, 42, 8, '#ffe066'); b.rect(132, 23, 34, 2, '#f05a8a');
    L.push(() => {
      // neon signs glow regardless of time
      b.rect(84, 14, 32, 2, '#ff6ad5'); b.rect(84, 22, 32, 2, '#ff6ad5'); b.rect(84, 14, 2, 10, '#ff6ad5'); b.rect(114, 14, 2, 10, '#ff6ad5');
      b.rect(89, 18, 22, 2, '#6af0ff');
      b.rect(14, 54, 18, 14, '#40d0a0'); b.rect(50, 54, 18, 14, '#f0a040');
      b.rect(16, 58, 4, 4, '#ffffff'); b.rect(58, 60, 6, 2, '#ffffff');
    });
  };

  SCENES.shrine = (b, t, L) => {
    sky(b, t, 70);
    // forest behind
    for (let i = -10; i < BW + 10; i += 18) b.ellipse(i, 66, 14, 16, i % 36 ? '#3f8048' : '#4f9a5a');
    b.rect(0, 70, BW, 20, '#3f8048');
    // shrine hall
    b.rect(70, 44, 52, 40, '#f4efe6');
    b.rect(74, 52, 44, 32, '#c84a3a');
    b.rect(86, 58, 20, 26, '#5a2a22');
    b.poly([[60, 46], [132, 46], [120, 32], [72, 32]], '#4a4a5a');
    b.rect(58, 44, 76, 3, '#5a5a6a');
    b.rect(90, 36, 12, 6, '#f2d36b');
    // stone path & ground
    b.rect(0, 84, BW, 60, '#c8b890');
    checker(b, 0, 84, BW, 1, '#c8b890', '#b8a880');
    b.poly([[80, 144], [112, 144], [104, 84], [88, 84]], '#a8a8b0');
    for (let j = 90; j < BH; j += 8) b.rect(84, j, 24, 1, '#8a8a96');
    // torii gate
    b.rect(36, 30, 120, 6, '#d8343c'); b.rect(30, 28, 132, 3, '#2a2a2a');
    b.rect(44, 42, 104, 4, '#d8343c');
    b.rect(48, 36, 6, 100, '#d8343c'); b.rect(138, 36, 6, 100, '#d8343c');
    b.rect(48, 126, 6, 10, '#2a2a2a'); b.rect(138, 126, 6, 10, '#2a2a2a');
    b.rect(92, 36, 8, 6, '#2a2a2a');
    b.rect(50, 36, 2, 90, '#f05a5a');
    lantern(b, 20, 104); lantern(b, 166, 104);
    // rope with paper streamers
    b.line(54, 50, 138, 50, '#e8d8a0');
    for (const x of [70, 96, 122]) { b.rect(x, 51, 3, 6, '#ffffff'); b.rect(x + 1, 57, 2, 3, '#ffffff'); }
    L.push(() => { if (t >= 2) { b.rect(22, 108, 2, 2, '#fff2a0'); b.rect(168, 108, 2, 2, '#fff2a0'); } });
  };

  SCENES.dojo = (b, t, L) => {
    b.rect(0, 0, BW, 98, '#e8d4a8');
    for (let i = 0; i < BW; i += 32) b.rect(i, 0, 4, 98, '#7a4e30');
    b.rect(0, 0, BW, 6, '#7a4e30'); b.rect(0, 60, BW, 3, '#7a4e30');
    // shoji windows
    for (const x of [8, 136]) {
      b.rect(x, 12, 48, 44, '#7a4e30'); b.rect(x + 2, 14, 44, 40, '#f8f2e0');
      for (let i = x + 2; i < x + 46; i += 11) b.rect(i, 14, 1, 40, '#b89a6a');
      for (let j = 14; j < 54; j += 10) b.rect(x + 2, j, 44, 1, '#b89a6a');
    }
    // hanging scroll
    b.rect(84, 8, 24, 2, '#5a3a2a'); b.rect(86, 10, 20, 44, '#f8f2e0'); b.rect(84, 54, 24, 2, '#5a3a2a');
    b.rect(94, 16, 4, 4, '#2a2a2a'); b.rect(92, 22, 8, 2, '#2a2a2a'); b.rect(95, 24, 2, 10, '#2a2a2a'); b.rect(91, 36, 10, 2, '#2a2a2a'); b.rect(93, 40, 6, 6, '#2a2a2a');
    b.ellipse(100, 48, 2, 2, '#d8343c');
    // weapon rack
    b.rect(62, 66, 68, 3, '#5a3a2a'); b.rect(62, 82, 68, 3, '#5a3a2a');
    for (let x = 66; x < 128; x += 8) b.rect(x, 62, 2, 28, '#c89a60');
    planks(b, 98, '#d8b07a');
    b.rect(30, 110, 132, 30, '#c8c090'); b.rect(30, 110, 132, 1, '#a8a070');
    b.rect(96, 110, 1, 30, '#a8a070'); b.rect(30, 125, 132, 1, '#a8a070');
  };

  SCENES.flowers = (b, t, L) => {
    sky(b, t, 70);
    b.ellipse(50, 78, 80, 16, '#7cc47a'); b.ellipse(160, 80, 70, 14, '#6ab06a');
    b.rect(0, 76, BW, 68, '#86cc6e');
    // windmill on the hill
    b.poly([[140, 40], [152, 40], [156, 78], [136, 78]], '#f4efe6'); b.poly([[138, 42], [154, 42], [146, 32]], '#c84a3a');
    b.rect(143, 66, 6, 12, '#8a5a3a');
    b.line(146, 38, 128, 22, '#7a4e30'); b.line(146, 38, 164, 22, '#7a4e30'); b.line(146, 38, 128, 54, '#7a4e30'); b.line(146, 38, 164, 54, '#7a4e30');
    b.poly([[146, 38], [128, 20], [132, 18]], '#f8f2e0'); b.poly([[146, 38], [166, 24], [166, 28]], '#f8f2e0');
    b.poly([[146, 38], [126, 52], [130, 56]], '#f8f2e0'); b.poly([[146, 38], [164, 56], [160, 58]], '#f8f2e0');
    // rows of flowers getting bigger toward the front
    const cols = ['#ff6a9a', '#ffe066', '#ffffff', '#b070f0', '#ff9a4a', '#6ab8f0'];
    for (let row = 0; row < 9; row++) {
      const y = 82 + row * 7, r = 1 + row * 0.35;
      for (let x = (row * 7) % 11; x < BW; x += 9 - Math.min(5, row % 4)) {
        b.rect(Math.round(x), Math.round(y + r), 1, Math.ceil(r * 2), '#4a9a4a');
        b.ellipse(x, y, r, r, cols[(x * 3 + row) % cols.length]);
      }
    }
    b.poly([[86, 144], [106, 144], [100, 80], [94, 80]], '#dcc398');
  };

  SCENES.cape = (b, t, L) => {
    sky(b, t, 80);
    const sea = t === 3 ? ['#1a2a5a', '#24366c'] : t === 2 ? ['#5a6ab0', '#7a7ac0'] : ['#3aa0e0', '#5ab8f0'];
    b.rect(0, 72, BW, 72, sea[0]);
    for (let j = 76; j < BH; j += 5) for (let i = (j * 11) % 20; i < BW; i += 20) b.rect(i, j, 7, 1, sea[1]);
    // grassy cliff
    b.poly([[0, 96], [120, 90], [150, 100], [150, 144], [0, 144]], '#7cc47a');
    b.poly([[120, 90], [150, 100], [150, 144], [138, 144], [128, 110]], '#8a7a6a');
    b.rect(0, 96, 150, 2, '#9ad88a');
    // lighthouse
    b.poly([[52, 28], [68, 28], [72, 96], [48, 96]], '#ffffff');
    for (const y of [42, 62, 82]) b.poly([[50, y], [70, y], [71, y + 8], [49, y + 8]], '#d8343c');
    b.rect(50, 18, 20, 11, '#3a3a4a'); b.rect(52, 20, 16, 7, '#ffe9a0'); b.poly([[48, 18], [72, 18], [60, 6]], '#d8343c');
    b.rect(46, 28, 28, 2, '#3a3a4a'); b.rect(57, 84, 6, 12, '#5a3a2a');
    // railing + rocks
    for (let x = 4; x < 110; x += 10) b.rect(x, 104, 2, 10, '#a8724a');
    b.rect(2, 104, 110, 2, '#c48a5a');
    b.ellipse(170, 120, 14, 8, '#8a8a96'); b.ellipse(182, 132, 10, 6, '#7a7a86');
    for (let i = 0; i < BW; i += 13) b.rect(i, 72 + (i % 9), 4, 1, '#ffffff');
    L.push(() => { if (t >= 2) { b.poly([[62, 22], [192, 4], [192, 30]], '#fff4c0'); b.rect(52, 20, 16, 7, '#fffce0'); } });
  };

  SCENES.onsen = (b, t, L) => {
    sky(b, t, 60);
    // bamboo fence and pines behind the open-air bath
    for (let i = -10; i < BW + 10; i += 18) b.ellipse(i, 50, 14, 14, i % 36 ? '#3f8048' : '#4f9a5a');
    b.rect(0, 46, BW, 34, '#c8b070');
    for (let x = 0; x < BW; x += 6) { b.rect(x, 46, 5, 34, x % 12 ? '#b8a060' : '#d0bc80'); b.rect(x, 56, 5, 1, '#8a7a4a'); b.rect(x, 68, 5, 1, '#8a7a4a'); }
    b.rect(0, 44, BW, 3, '#6a5a3a');
    // stone floor and the steaming pool
    b.rect(0, 80, BW, 64, '#8a8a96');
    for (let j = 82; j < BH; j += 9) for (let i = (j % 18); i < BW; i += 18) b.rect(i, j, 15, 7, '#9a9aa6');
    b.ellipse(96, 118, 92, 26, '#6a6a76');
    b.ellipse(96, 118, 86, 22, '#5ab0d0');
    b.ellipse(96, 114, 78, 14, '#7ac8e0');
    for (const [x, y] of [[20, 100], [168, 98], [8, 128], [182, 126]]) { b.ellipse(x, y, 12, 8, '#7a7a86'); b.ellipse(x - 2, y - 2, 7, 4, '#9a9aa6'); }
    lantern(b, 150, 70);
    // steam
    L.push(() => {
      for (let i = 0; i < 9; i++) { const x = 18 + i * 20, y = 96 - (i % 3) * 6; b.ellipse(x, y, 8, 3, '#e8f4fa'); b.ellipse(x + 4, y - 6, 5, 2, '#f4fafc'); }
      if (t >= 2) b.rect(152, 74, 2, 2, '#fff2a0');
    });
  };

  SCENES.title = (b, t, L) => {
    SCENES.park(b, 2, L);
  };

  // ---------------------------------------------------------------- render
  const cache = new Map();

  function render(id, t) {
    t = Math.max(0, Math.min(3, t | 0));
    const key = id + '|' + t;
    if (cache.has(key)) return cache.get(key);
    const b = new Buf(BW, BH);
    const lights = [];
    (SCENES[id] || SCENES.home)(b, t, lights);
    const g = id === 'arcade' ? null : GRADE[t];
    if (g) for (let i = 0; i < b.d.length; i++) if (b.d[i]) b.d[i] = mix(b.d[i], g.c, g.a);
    lights.forEach((f) => f());
    const cv = b.toCanvas(1);
    cache.set(key, cv);
    return cv;
  }

  global.BACKGROUNDS = { render, BW, BH, SCENES };
})(window);
