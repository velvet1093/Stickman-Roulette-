// Chibi pixel-art characters, built from layered shapes on a 48x64 grid.
// Each layer gets its own outline pass so hair, face and clothes read as
// separate pieces, like hand-drawn chibi sprites.
(function (global) {
  'use strict';
  const { Buf, shade, tint } = PX;
  const W = 48, H = 64;

  // Mirror helpers around the sprite's vertical centre line.
  const mx = (x) => W - x;
  const mirrorPts = (pts) => pts.map(([x, y]) => [mx(x), y]);
  function rectSym(b, x, y, w, h, c) {
    b.rect(x, y, w, h, c);
    b.rect(W - x - w, y, w, h, c);
  }
  function polySym(b, pts, c) {
    b.poly(pts, c);
    b.poly(mirrorPts(pts), c);
  }

  const SKIN = { base: '#fde3cc', shade: '#f0c3a3', blush: '#f59aa6', mouth: '#a8424e', tongue: '#e8737f' };

  // ---------------------------------------------------------------- face
  const EYES = {
    open: [
      '.kkkkk',
      'kkkkkk',
      'wpphhp',
      'wpiihp',
      'wpiiip',
      '.illl.',
    ],
    blink: [
      '......',
      '......',
      '......',
      '.kkkkk',
      'kk...k',
      '......',
    ],
    happy: [
      '......',
      '......',
      '.kkkk.',
      'kk..kk',
      'k....k',
      '......',
    ],
    sad: [
      '......',
      'kk....',
      '.kkkkk',
      'wpiihp',
      'wpiiip',
      '.illl.',
    ],
    wide: [
      '.kkkk.',
      'kwwwwk',
      'wwphhw',
      'wwpihw',
      'wwiiiw',
      '.wllw.',
    ],
    calm: [
      '......',
      'kkkkkk',
      'kpphhp',
      'wpiihp',
      '.illl.',
      '......',
    ],
    smug: [
      '......',
      '......',
      'kkkkkk',
      'wpiihp',
      'wpiiip',
      '.illl.',
    ],
  };

  const MOUTHS = {
    neutral: ['.mm.'],
    smile: ['m..m', '.mm.'],
    open: ['mmmm', 'mttm', '.mm.'],
    pout: ['.mm.', 'm..m'],
    o: ['.m.', 'm.m', '.m.'],
    wavy: ['m.m.', '.m.m'],
  };

  const EXPRESSIONS = {
    neutral: { eyes: 'open', mouth: 'neutral' },
    happy: { eyes: 'happy', mouth: 'open' },
    smile: { eyes: 'open', mouth: 'smile' },
    blush: { eyes: 'open', mouth: 'wavy', blush: true },
    love: { eyes: 'happy', mouth: 'smile', blush: true },
    sad: { eyes: 'sad', mouth: 'pout' },
    surprised: { eyes: 'wide', mouth: 'o' },
    smug: { eyes: 'smug', mouth: 'smile' },
    calm: { eyes: 'calm', mouth: 'neutral' },
  };

  function drawHead(b) {
    b.poly([[13, 14], [35, 14], [36, 26], [33, 31], [28, 34], [20, 34], [15, 31], [12, 26]], SKIN.base);
  }

  function drawFace(b, look, exprName, blink) {
    const ex = EXPRESSIONS[exprName] || EXPRESSIONS.neutral;
    const pal = {
      k: look.lash || '#2a1828',
      w: '#ffffff',
      p: look.eye[0],
      i: look.eye[1],
      l: look.eye[2],
      h: '#ffffff',
      s: SKIN.base,
    };
    const eyes = blink && (ex.eyes === 'open' || ex.eyes === 'wide' || ex.eyes === 'sad' || ex.eyes === 'calm') ? 'blink' : ex.eyes;
    b.map(14, 21, EYES[eyes], pal, false);
    b.map(28, 21, EYES[eyes], pal, true);
    if (ex.blush || look.alwaysBlush) {
      const c = SKIN.blush;
      [[15, 28], [17, 28], [16, 29], [31, 28], [33, 28], [32, 29]].forEach(([x, y]) => b.set(x, y, c));
    }
    const m = MOUTHS[ex.mouth];
    const mw = m[0].length;
    b.map(24 - Math.ceil(mw / 2), 30, m, { m: SKIN.mouth, t: SKIN.tongue });
    // soft chin shadow where the head meets the neck
    b.set(22, 33, SKIN.shade); b.set(25, 33, SKIN.shade);
  }

  // ------------------------------------------------------- shared bodies
  function neck(b) {
    b.rect(21, 33, 6, 3, SKIN.shade);
  }
  function bareArms(b, y0 = 36, len = 9) {
    rectSym(b, 13, y0, 3, len, SKIN.base);
    rectSym(b, 13, y0 + len, 3, 2, SKIN.base);
    rectSym(b, 15, y0, 1, len, SKIN.shade);
  }
  function bareLegs(b, y0 = 50, len = 7) {
    rectSym(b, 18, y0, 4, len, SKIN.base);
    rectSym(b, 21, y0, 1, len, SKIN.shade);
  }

  // Highlight stripe that follows the top of the hair cap (anime "halo" shine).
  function hairShine(b, c, y = 10) {
    b.clip = true;
    for (let x = 15; x <= 32; x++) {
      const dy = Math.round(Math.pow((x - 23.5) / 9, 2) * 3);
      if ((x + dy) % 4 !== 0) b.set(x, y + dy, c);
    }
    b.clip = false;
  }

  // ---------------------------------------------------------------- girls
  const LOOKS = {};

  // Nami — orange side ponytail, blue floral sundress, sunny sash.
  LOOKS.nami = {
    eye: ['#6a3420', '#a5582f', '#d9925e'],
    hair: { base: '#f2913d', light: '#fbbd6c', dark: '#cf6a22' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 13.5, 12.5, h.base);
      // big side ponytail with spiky ends
      b.poly([[31, 7], [38, 9], [43, 15], [45, 21], [43, 23], [47, 28], [43, 30], [45, 36], [41, 36], [42, 42], [38, 39], [35, 33], [34, 24]], h.base);
      b.poly([[12, 12], [9, 22], [10, 31], [14, 32], [15, 20]], h.base);
      b.clip = true;
      b.poly([[37, 12], [42, 18], [41, 22], [44, 28], [40, 30], [41, 35], [38, 33], [36, 22]], h.dark);
      b.line(39, 14, 43, 21, h.light);
      b.line(40, 26, 43, 31, h.light);
      b.clip = false;
    },
    hairFront(b) {
      const h = this.hair;
      b.poly([[11, 22], [12, 13], [17, 7], [24, 5], [31, 7], [36, 13], [37, 24], [35, 20], [33, 16], [32, 21], [29, 15], [27, 19], [25, 14], [21, 21], [19, 16], [17, 21], [16, 17], [14, 24], [13, 28]], h.base);
      hairShine(b, h.light, 9);
      b.clip = true;
      b.line(30, 14, 34, 19, h.dark);
      b.line(18, 15, 15, 20, h.dark);
      b.clip = false;
      // scrunchie
      b.rect(32, 6, 4, 3, '#3f63c9');
      b.set(33, 6, '#7c9cf0');
    },
    body(b) {
      neck(b);
      bareArms(b, 36, 9);
      // sundress top
      b.poly([[16, 35], [32, 35], [31, 44], [17, 44]], '#8ec5f0');
      b.rect(21, 35, 6, 2, SKIN.shade);
      b.rect(22, 35, 4, 1, SKIN.base);
      b.rect(16, 35, 2, 1, '#5a96d6'); b.rect(30, 35, 2, 1, '#5a96d6');
      // checkered sash
      b.rect(15, 43, 18, 2, '#f4b847');
      for (let x = 15; x < 33; x += 2) b.set(x, 43, '#fff3c4');
      // flowing sash ends
      b.poly([[15, 43], [9, 47], [4, 53], [6, 56], [8, 54], [9, 57], [12, 51], [16, 47]], '#f4b847');
      b.poly([[33, 43], [39, 47], [44, 53], [42, 56], [40, 54], [39, 57], [36, 51], [32, 47]], '#f4b847');
      b.clip = true;
      b.line(14, 46, 7, 53, '#fbd77c');
      b.line(34, 46, 41, 53, '#d08a2a');
      b.clip = false;
      // skirt
      b.poly([[16, 45], [32, 45], [34, 51], [14, 51]], '#8ec5f0');
      b.rect(14, 50, 20, 1, '#5a96d6');
      [[18, 38], [27, 40], [22, 41], [17, 47], [22, 48], [27, 47], [31, 49]].forEach(([x, y]) => {
        b.set(x, y, '#ffffff'); b.set(x + 1, y, '#f08aa8'); b.set(x + 1, y - 1, '#ffffff'); b.set(x + 2, y, '#ffffff'); b.set(x + 1, y + 1, '#ffffff');
      });
      bareLegs(b, 51, 6);
      rectSym(b, 17, 57, 6, 1, '#3a5fc0');
      rectSym(b, 16, 58, 7, 1, '#d7b77a');
    },
  };

  // Aqua — long aqua hair with a hair loop, blue & white shrine outfit.
  LOOKS.aqua = {
    eye: ['#1f4fae', '#3f86e0', '#8cc4ff'],
    hair: { base: '#8fd3f7', light: '#d0f1ff', dark: '#53a5dc' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 13.5, 12.5, h.base);
      b.poly([[12, 10], [36, 10], [39, 22], [41, 48], [42, 57], [37, 58], [34, 54], [24, 56], [14, 54], [11, 58], [6, 57], [7, 48], [9, 22]], h.base);
      // hair loop on top
      b.ellipse(24, 4, 4, 4, h.base);
      b.ellipse(24, 3.5, 1.6, 1.8, null);
      b.clip = true;
      b.line(9, 30, 8, 55, h.dark); b.line(39, 30, 40, 55, h.dark);
      b.line(11, 34, 11, 52, h.light); b.line(37, 34, 37, 52, h.light);
      b.clip = false;
    },
    hairFront(b) {
      const h = this.hair;
      b.poly([[11, 24], [12, 13], [17, 8], [24, 6], [31, 8], [36, 13], [37, 24], [34, 18], [32, 21], [30, 16], [27, 20], [24, 15], [21, 20], [18, 16], [16, 21], [14, 18]], h.base);
      // long locks in front of the shoulders
      polySym(b, [[11, 16], [10, 30], [11, 44], [13, 47], [15, 42], [15, 26], [14, 18]], h.base);
      hairShine(b, h.light, 9);
      b.clip = true;
      b.line(24, 7, 24, 14, h.dark);
      b.line(12, 30, 13, 44, h.dark); b.line(35, 30, 34, 44, h.dark);
      b.clip = false;
      b.rect(21, 7, 6, 2, '#3a6fd0');
      b.set(23, 7, '#7fa8f5');
    },
    body(b) {
      neck(b);
      // white detached sleeves with blue cuffs
      polySym(b, [[16, 36], [12, 38], [11, 46], [15, 46], [16, 41]], '#f4f7ff');
      rectSym(b, 11, 45, 5, 1, '#3a6fd0');
      rectSym(b, 12, 46, 3, 2, SKIN.base);
      // vest
      b.poly([[16, 35], [32, 35], [31, 45], [17, 45]], '#3b5fc8');
      b.rect(21, 35, 6, 3, '#f4f7ff');
      b.rect(19, 37, 4, 2, '#5ccf8a'); b.rect(25, 37, 4, 2, '#5ccf8a'); b.rect(23, 37, 2, 2, '#2f9a5c');
      b.rect(23, 39, 2, 5, '#f2d36b');
      b.set(18, 40, '#5d82e0'); b.set(29, 40, '#2a4596');
      // skirt with gold hem
      b.poly([[17, 45], [31, 45], [34, 51], [14, 51]], '#3b5fc8');
      b.rect(14, 50, 20, 1, '#f2d36b');
      for (let x = 17; x < 32; x += 3) b.line(x, 46, x - 1, 49, '#2a4596');
      // white stockings & blue boots
      rectSym(b, 18, 51, 4, 3, SKIN.base);
      rectSym(b, 18, 54, 4, 3, '#f4f7ff');
      rectSym(b, 18, 54, 4, 1, '#3a6fd0');
      rectSym(b, 17, 57, 6, 2, '#2f4fb0');
    },
  };

  // Yumeko — long black hime-cut hair, red blazer, plaid skirt.
  LOOKS.yumeko = {
    eye: ['#7a1424', '#bf3043', '#ea7b82'],
    hair: { base: '#2f2943', light: '#5b5584', dark: '#1d1829' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 13.5, 12.5, h.base);
      b.poly([[11, 9], [37, 9], [40, 18], [41, 59], [36, 59], [35, 52], [13, 52], [12, 59], [7, 59], [8, 18]], h.base);
      b.clip = true;
      for (const x of [9, 13, 35, 39]) b.line(x, 24, x, 57, h.dark);
      b.line(11, 28, 11, 50, h.light); b.line(37, 28, 37, 50, h.light);
      b.clip = false;
    },
    hairFront(b) {
      const h = this.hair;
      // blunt hime bangs + straight side locks
      b.poly([[12, 20], [12, 13], [17, 8], [24, 6], [31, 8], [36, 13], [36, 20]], h.base);
      polySym(b, [[11, 15], [11, 36], [16, 36], [16, 20]], h.base);
      hairShine(b, h.light, 9);
      b.clip = true;
      for (const x of [17, 21, 27, 31]) b.set(x, 19, h.dark);
      b.clip = false;
    },
    body(b) {
      neck(b);
      // blazer sleeves
      polySym(b, [[16, 35], [12, 38], [12, 46], [16, 46]], '#c8303a');
      rectSym(b, 12, 46, 4, 2, SKIN.base);
      b.poly([[16, 35], [32, 35], [32, 46], [16, 46]], '#c8303a');
      // shirt + tie
      b.poly([[21, 35], [27, 35], [24, 42]], '#f4f0f0');
      b.rect(23, 36, 2, 6, '#2a2030');
      b.set(23, 42, '#2a2030');
      b.line(20, 35, 23, 43, '#902028'); b.line(28, 35, 25, 43, '#902028');
      b.set(18, 41, '#f2d36b');
      b.rect(15, 37, 1, 8, '#e05058');
      // plaid skirt
      b.poly([[16, 46], [32, 46], [34, 52], [14, 52]], '#4a4458');
      for (let x = 15; x < 34; x += 3) b.line(x, 46, x, 51, '#6a6478');
      b.rect(14, 49, 20, 1, '#6a6478');
      // tights & loafers
      rectSym(b, 18, 52, 4, 5, '#2e2838');
      rectSym(b, 17, 57, 6, 2, '#8a4a2a');
      rectSym(b, 18, 57, 2, 1, '#b56a3e');
    },
  };


  // The player — long silver hair with an ahoge, crimson eyes, white
  // gold-trimmed coat with a blue cravat, white gloves, dark trousers.
  LOOKS.player = {
    eye: ['#5e1220', '#a42a38', '#dc6a74'],
    hair: { base: '#e6e6ee', light: '#ffffff', dark: '#aeb0c4' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 14, 13, h.base);
      // long hair flowing down the back, wider at the tips
      b.poly([[11, 12], [37, 12], [41, 30], [43, 46], [40, 52], [37, 48], [35, 54], [31, 44], [17, 44], [13, 54], [11, 48], [8, 52], [5, 46], [7, 30]], h.base);
      // ahoge
      b.poly([[22, 6], [20, 1], [23, -1], [27, 0], [25, 2], [23, 2], [25, 6]], h.base);
      b.clip = true;
      b.line(9, 30, 7, 46, h.dark); b.line(39, 30, 41, 46, h.dark);
      b.line(12, 34, 11, 48, h.light); b.line(36, 34, 37, 48, h.light);
      b.clip = false;
    },
    hairFront(b) {
      const h = this.hair;
      // messy, spiky bangs that fall between the eyes
      b.poly([[10, 26], [11, 13], [17, 7], [24, 5], [31, 7], [37, 13], [38, 27], [35, 21], [34, 25], [31, 17], [29, 22], [27, 16], [25, 23], [23, 15], [20, 21], [18, 15], [16, 22], [14, 18], [13, 25]], h.base);
      polySym(b, [[11, 16], [10, 32], [12, 40], [14, 34], [15, 22]], h.base);
      hairShine(b, h.light, 9);
      b.clip = true;
      b.line(23, 15, 21, 20, h.dark); b.line(29, 17, 31, 21, h.dark);
      b.line(12, 26, 12, 36, h.dark); b.line(36, 26, 36, 36, h.dark);
      b.clip = false;
    },
    body(b, o = {}) {
      const coat = o.coat || COAT, coatShade = PX.shade(o.coat || COAT, 0.12), gold = '#d6aa44', goldL = '#f2d36b';
      neck(b);
      // coat tails falling behind the legs
      b.poly([[15, 44], [33, 44], [35, 55], [31, 52], [28, 56], [20, 56], [17, 52], [13, 55]], coat);
      b.line(13, 55, 15, 45, gold); b.line(35, 55, 33, 45, gold);
      // sleeves with gold cuffs + white gloves
      polySym(b, [[16, 35], [12, 38], [11, 46], [16, 46]], coat);
      rectSym(b, 11, 44, 5, 2, gold);
      rectSym(b, 11, 46, 5, 3, '#ffffff');
      // coat body
      b.poly([[16, 35], [32, 35], [32, 46], [16, 46]], coat);
      b.poly([[21, 35], [27, 35], [26, 44], [22, 44]], '#f8f6f0');
      b.line(21, 35, 22, 45, gold); b.line(27, 35, 26, 45, gold);
      b.line(17, 37, 19, 44, goldL); b.line(31, 37, 29, 44, gold);
      b.set(23, 41, gold); b.set(23, 43, gold);
      // blue cravat with a gold pin
      b.rect(22, 35, 4, 2, '#2f4fb0'); b.rect(23, 37, 2, 3, '#2f4fb0'); b.set(23, 36, goldL);
      b.rect(16, 45, 16, 1, coatShade);
      // trousers & shoes
      rectSym(b, 18, 46, 5, 11, '#2c2834');
      rectSym(b, 21, 47, 1, 9, '#3c3646');
      rectSym(b, 17, 57, 6, 2, '#1c1820');
      rectSym(b, 18, 57, 2, 1, '#3a3442');
    },
  };

  // Kurumi — long black low twin tails, one eye hidden under her bangs,
  // black blazer with a red ribbon, blue pleated skirt.
  LOOKS.kurumi = {
    eye: ['#7a1020', '#c8283a', '#f07078'],
    hair: { base: '#2a2432', light: '#56506c', dark: '#18141e' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 13.5, 12.5, h.base);
      b.poly([[11, 12], [9, 30], [11, 36], [16, 36], [15, 18]], h.base);
      b.poly([[37, 12], [39, 30], [37, 36], [32, 36], [33, 18]], h.base);
      // low twin tails flowing to her knees
      b.poly([[10, 30], [6, 40], [4, 52], [6, 58], [10, 54], [11, 44], [14, 34]], h.base);
      b.poly([[38, 30], [42, 40], [44, 52], [42, 58], [38, 54], [37, 44], [34, 34]], h.base);
      b.clip = true;
      b.line(7, 42, 6, 54, h.light); b.line(41, 42, 42, 54, h.dark);
      b.clip = false;
      b.rect(9, 30, 5, 3, '#d6aa44'); b.rect(34, 30, 5, 3, '#d6aa44');
    },
    hairFront(b) {
      const h = this.hair;
      b.poly([[11, 24], [12, 13], [17, 7], [24, 5], [31, 7], [36, 13], [37, 24], [34, 19], [31, 21], [29, 16], [26, 20], [24, 15], [21, 20], [19, 16], [16, 21], [14, 18]], h.base);
      // a long lock sweeping over her (viewer's) right eye
      b.poly([[24, 13], [31, 12], [36, 16], [36, 30], [33, 28], [30, 31], [28, 26], [27, 20]], h.base);
      polySym(b, [[11, 16], [10, 32], [12, 36], [15, 30], [15, 20]], h.base);
      hairShine(b, h.light, 9);
      b.clip = true;
      b.line(30, 15, 32, 27, h.dark); b.line(12, 22, 12, 32, h.dark);
      b.clip = false;
    },
    body(b) {
      neck(b);
      const jacket = '#2a2832', trim = '#d8d8e4';
      polySym(b, [[16, 35], [12, 38], [12, 46], [16, 46]], jacket);
      rectSym(b, 12, 46, 4, 2, SKIN.base);
      b.poly([[16, 35], [32, 35], [32, 46], [16, 46]], jacket);
      b.poly([[21, 35], [27, 35], [24, 41]], '#f4f0f0');
      b.line(20, 35, 23, 43, trim); b.line(28, 35, 25, 43, trim);
      b.rect(22, 36, 4, 2, '#d8343c'); b.line(23, 38, 21, 41, '#d8343c'); b.line(24, 38, 26, 41, '#d8343c');
      b.set(24, 42, '#c0c0cc'); b.set(24, 44, '#c0c0cc');
      b.set(29, 39, '#d8343c');
      b.poly([[16, 46], [32, 46], [34, 52], [14, 52]], '#4a58b8');
      for (let x = 15; x < 34; x += 3) b.line(x, 47, x, 51, '#36428e');
      rectSym(b, 18, 52, 4, 5, '#1e1a24');
      rectSym(b, 17, 57, 6, 2, '#141018');
    },
  };

  // Rem — short blue bob over one eye, maid headdress, flower clip,
  // black-and-white maid dress with an apron.
  LOOKS.rem = {
    eye: ['#1e4aa8', '#3c7ce0', '#8cc0ff'],
    hair: { base: '#7cb4f0', light: '#c4e0ff', dark: '#4a84cc' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 13.5, 12.5, h.base);
      b.poly([[11, 12], [10, 26], [12, 32], [16, 32], [16, 20]], h.base);
      b.poly([[37, 12], [38, 26], [36, 32], [32, 32], [32, 20]], h.base);
    },
    hairFront(b) {
      const h = this.hair;
      b.poly([[11, 27], [12, 13], [17, 7], [24, 5], [31, 7], [36, 13], [37, 27], [35, 21], [33, 24], [31, 17], [28, 20], [26, 15], [24, 19], [22, 15], [20, 19]], h.base);
      // bangs covering her (viewer's) left eye
      b.poly([[11, 14], [22, 12], [23, 20], [20, 28], [17, 27], [14, 30], [12, 26]], h.base);
      hairShine(b, h.light, 9);
      b.clip = true;
      b.line(16, 15, 15, 26, h.dark); b.line(20, 14, 20, 24, h.light);
      b.clip = false;
      // maid headdress
      b.rect(15, 4, 18, 3, '#ffffff');
      for (let x = 15; x < 33; x += 3) b.set(x, 3, '#ffffff');
      b.rect(15, 6, 18, 1, '#2a2832');
      // x-clip and purple flower ribbon
      b.line(31, 11, 34, 14, '#f07ab0'); b.line(34, 11, 31, 14, '#f07ab0');
      b.ellipse(35, 17, 2.5, 2.5, '#b070d8'); b.set(35, 17, '#f4d0ff');
      b.line(35, 19, 36, 26, '#b070d8');
    },
    body(b) {
      neck(b);
      const black = '#2e2c38', white = '#ffffff';
      // detached black sleeves with white frills
      polySym(b, [[16, 36], [12, 38], [10, 47], [16, 47]], black);
      rectSym(b, 10, 46, 6, 1, white);
      rectSym(b, 12, 47, 3, 2, SKIN.base);
      // white frilly collar + black ribbon
      b.rect(20, 34, 8, 3, white);
      b.set(23, 36, black); b.set(24, 36, black); b.line(23, 37, 22, 40, black); b.line(24, 37, 25, 40, black);
      // bodice: white top, black corset with white bows
      b.poly([[16, 37], [32, 37], [31, 41], [17, 41]], white);
      b.poly([[18, 41], [30, 41], [30, 46], [18, 46]], black);
      for (const y of [42, 44]) { b.set(23, y, white); b.set(25, y, white); b.set(24, y, white); }
      // black skirt, white apron, purple flaps
      b.poly([[16, 46], [32, 46], [36, 53], [12, 53]], black);
      b.rect(12, 52, 24, 1, white);
      b.poly([[19, 46], [29, 46], [31, 52], [17, 52]], white);
      b.rect(17, 52, 14, 1, '#e8e8f0');
      b.poly([[12, 53], [15, 53], [13, 57]], '#a070d0'); b.poly([[33, 53], [36, 53], [35, 57]], '#a070d0');
      // white stockings, black shoes
      rectSym(b, 18, 53, 4, 4, white);
      rectSym(b, 17, 57, 6, 2, '#1e1a24');
    },
  };

  // Zero Two — long pink hair, little red horns and a white hairband,
  // red uniform coat with gold buttons, black tights, white boots.
  LOOKS.zerotwo = {
    eye: ['#1e6e5a', '#34a888', '#7ad8b8'],
    hair: { base: '#f4a6c0', light: '#ffd4e2', dark: '#d87898' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 13.5, 12.5, h.base);
      b.poly([[12, 10], [36, 10], [39, 22], [41, 46], [42, 55], [37, 56], [34, 52], [14, 52], [11, 56], [6, 55], [7, 46], [9, 22]], h.base);
      b.clip = true;
      b.line(9, 28, 8, 52, h.dark); b.line(39, 28, 40, 52, h.dark);
      b.line(11, 32, 11, 50, h.light); b.line(37, 32, 37, 50, h.light);
      b.clip = false;
    },
    hairFront(b) {
      const h = this.hair;
      b.poly([[11, 25], [12, 13], [17, 8], [24, 6], [31, 8], [36, 13], [37, 25], [35, 19], [32, 21], [30, 17], [27, 20], [25, 16], [22, 20], [19, 16], [16, 21], [14, 18]], h.base);
      polySym(b, [[11, 16], [10, 34], [12, 42], [15, 36], [15, 22]], h.base);
      hairShine(b, h.light, 9);
      b.clip = true;
      b.line(12, 26, 12, 38, h.dark); b.line(36, 26, 36, 38, h.dark);
      b.clip = false;
      // white hairband
      b.poly([[14, 9], [24, 6], [34, 9], [34, 10], [24, 8], [14, 10]], '#ffffff');
      // little red horns
      b.poly([[16, 8], [15, 2], [19, 6]], '#d83c4c'); b.poly([[32, 8], [33, 2], [29, 6]], '#d83c4c');
      b.set(15, 3, '#ff8a90'); b.set(33, 3, '#ff8a90');
    },
    body(b) {
      neck(b);
      const red = '#c83a3a', gold = '#e6c04a';
      polySym(b, [[16, 35], [12, 38], [12, 47], [16, 47]], red);
      rectSym(b, 12, 46, 4, 1, '#f4f0f0');
      rectSym(b, 12, 47, 4, 2, SKIN.base);
      // coat down to mid-thigh
      b.poly([[16, 35], [32, 35], [33, 52], [15, 52]], red);
      b.rect(21, 34, 6, 3, '#f4f0f0');
      b.rect(23, 36, 2, 5, '#f08a2a'); b.set(23, 41, '#f08a2a');
      for (const y of [40, 44, 48]) { b.set(20, y, gold); b.set(27, y, gold); }
      b.rect(16, 45, 16, 1, '#2a2832');
      b.rect(16, 35, 2, 3, '#e8e0d0'); b.rect(30, 35, 2, 3, '#e8e0d0');
      b.line(24, 42, 24, 51, '#a02a2a');
      // black tights, white boots
      rectSym(b, 18, 52, 4, 3, '#1e1a24');
      rectSym(b, 17, 55, 6, 4, '#f4f4f8');
      rectSym(b, 17, 58, 6, 1, '#c0c0cc');
    },
  };

  // Frieren — silver twin tails, pointed elf ears, white coat with gold
  // trim over a striped shirt, black tights, brown boots, and her staff.
  LOOKS.frieren = {
    eye: ['#2a6a56', '#4aa080', '#9ad8c0'],
    hair: { base: '#eceef6', light: '#ffffff', dark: '#b4b8cc' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 13.5, 12.5, h.base);
      // high twin tails sweeping out to the sides
      b.poly([[12, 9], [6, 12], [2, 22], [1, 36], [4, 46], [7, 40], [6, 28], [9, 18], [14, 14]], h.base);
      b.poly([[36, 9], [42, 12], [46, 22], [47, 36], [44, 46], [41, 40], [42, 28], [39, 18], [34, 14]], h.base);
      b.clip = true;
      b.line(4, 20, 3, 40, h.dark); b.line(44, 20, 45, 40, h.dark);
      b.clip = false;
      b.rect(11, 8, 3, 3, '#d6aa44'); b.rect(34, 8, 3, 3, '#d6aa44');
    },
    hairFront(b) {
      const h = this.hair;
      b.poly([[12, 24], [12, 13], [17, 8], [24, 6], [31, 8], [36, 13], [36, 24], [34, 18], [31, 21], [29, 16], [26, 20], [24, 15], [22, 20], [19, 16], [16, 21], [14, 18]], h.base);
      polySym(b, [[12, 16], [11, 30], [13, 33], [15, 28], [15, 20]], h.base);
      hairShine(b, h.light, 9);
      // pointed elf ears
      b.poly([[12, 22], [5, 18], [8, 22], [12, 26]], SKIN.base);
      b.poly([[36, 22], [43, 18], [40, 22], [36, 26]], SKIN.base);
      b.set(9, 25, '#d8343c'); b.set(39, 25, '#d8343c');
    },
    body(b) {
      neck(b);
      const white = '#f6f4ee', gold = '#d6aa44';
      polySym(b, [[16, 35], [12, 38], [12, 47], [16, 47]], white);
      rectSym(b, 12, 45, 4, 1, gold);
      rectSym(b, 12, 47, 4, 2, SKIN.base);
      // coat and capelet
      b.poly([[16, 37], [32, 37], [34, 51], [14, 51]], white);
      b.rect(14, 50, 20, 1, gold);
      b.rect(21, 37, 6, 6, '#2a2832'); for (const y of [38, 40, 42]) b.rect(21, y, 6, 1, '#f4f4f4');
      b.rect(16, 43, 16, 2, '#2a2832'); b.rect(23, 43, 2, 2, '#c0c0cc');
      b.poly([[14, 35], [34, 35], [35, 40], [13, 40]], white);
      b.rect(13, 39, 22, 1, gold);
      b.rect(21, 34, 6, 2, white); b.set(24, 35, '#d8343c');
      // tights + boots
      rectSym(b, 18, 51, 4, 3, '#24223a');
      rectSym(b, 17, 54, 6, 5, '#9a6a3a');
      rectSym(b, 17, 54, 6, 1, '#b88a50');
    },
    extra(b) {
      // staff held across her body: red shaft, gold crescent, red gem
      b.line(38, 30, 10, 58, '#a8343a');
      b.line(39, 31, 11, 59, '#c84a4a');
      b.ellipse(40, 27, 4, 4, '#d6aa44'); b.ellipse(41, 26, 2.5, 2.5, null);
      b.ellipse(40, 28, 1.6, 1.6, '#e0303a');
      b.rect(32, 36, 3, 3, '#b8343a');
    },
  };


  // Marin — long blonde hair fading to pink at the tips, a black choker,
  // white shirt with rolled sleeves knotted at the waist, a loose blue tie,
  // light-blue plaid skirt, black socks and brown loafers.
  LOOKS.marin = {
    eye: ['#9a2a48', '#e0507a', '#ffa0bc'],
    hair: { base: '#f6da7c', light: '#fff4c0', dark: '#d8b454', tip: '#f4a6bc', tipDark: '#e07a9a' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 13.5, 12.5, h.base);
      b.poly([[12, 10], [36, 10], [39, 22], [41, 44], [42, 57], [37, 58], [34, 52], [14, 52], [11, 58], [6, 57], [7, 44], [9, 22]], h.base);
      b.clip = true;
      b.rect(0, 44, 48, 6, PX.mix(h.base, h.tip, 0.55));
      b.rect(0, 50, 48, 10, h.tip);
      b.line(9, 28, 8, 56, h.dark); b.line(39, 28, 40, 56, h.dark);
      b.line(11, 32, 11, 54, h.light); b.line(37, 32, 37, 54, h.light);
      b.line(8, 50, 8, 56, h.tipDark); b.line(40, 50, 40, 56, h.tipDark);
      b.clip = false;
    },
    hairFront(b) {
      const h = this.hair;
      b.poly([[11, 25], [12, 13], [17, 7], [24, 5], [31, 7], [36, 13], [37, 26], [35, 18], [32, 20], [31, 15], [28, 19], [26, 13], [22, 19], [20, 14], [17, 20], [14, 17]], h.base);
      // long side locks down to the chest, pink at the ends
      polySym(b, [[11, 16], [9, 34], [10, 46], [13, 48], [15, 38], [15, 22]], h.base);
      b.clip = true;
      b.rect(0, 40, 48, 4, PX.mix(h.base, h.tip, 0.5)); b.rect(0, 44, 48, 6, h.tip);
      b.line(12, 26, 11, 42, h.dark); b.line(36, 26, 37, 42, h.dark);
      b.clip = false;
      hairShine(b, h.light, 9);
      // little earrings peeking out
      b.set(12, 29, '#ff8ab0'); b.set(36, 29, '#ff8ab0');
    },
    body(b) {
      neck(b);
      const shirt = '#fbfaf6', shade = '#dedcd4', tie = '#5a7088', skirt = '#a8cce6', plaid = '#7aa4c8';
      // rolled sleeves, forearms, a black bracelet
      polySym(b, [[16, 35], [12, 38], [12, 42], [16, 42]], shirt);
      rectSym(b, 12, 41, 4, 2, shade);
      rectSym(b, 13, 43, 3, 4, SKIN.base); rectSym(b, 13, 47, 3, 2, SKIN.base);
      b.rect(32, 45, 3, 1, '#1e1a24');
      // open collar shirt knotted at the waist
      b.poly([[16, 35], [32, 35], [32, 44], [16, 44]], shirt);
      b.poly([[21, 35], [24, 39], [27, 35]], SKIN.base);
      b.line(16, 40, 18, 44, shade); b.line(32, 40, 30, 44, shade);
      b.rect(19, 44, 10, 2, SKIN.base); b.rect(24, 44, 1, 2, SKIN.shade);
      b.poly([[22, 43], [26, 43], [27, 46], [25, 48], [23, 48], [21, 46]], shirt); b.poly([[25, 46], [29, 50], [27, 50], [24, 47]], shirt);
      b.line(23, 44, 25, 47, shade);
      // choker with a little charm
      b.rect(21, 35, 6, 1, '#1e1a24'); b.set(24, 36, '#d6aa44');
      // loose tie
      b.rect(23, 36, 3, 2, tie); b.poly([[23, 38], [26, 38], [26, 43], [24, 45], [23, 43]], tie); b.set(24, 37, '#7a90a8');
      // plaid skirt
      b.poly([[16, 46], [32, 46], [35, 53], [13, 53]], skirt);
      for (let x = 15; x < 35; x += 4) b.line(x, 46, x - 1, 53, plaid);
      b.rect(14, 49, 20, 1, plaid); b.rect(14, 51, 20, 1, '#c87a6a');
      b.rect(13, 52, 22, 1, PX.shade(skirt, 0.2));
      // legs, black socks, loafers
      bareLegs(b, 53, 3);
      rectSym(b, 18, 56, 4, 2, '#1e1a24');
      rectSym(b, 17, 57, 6, 2, '#7a4a2a'); rectSym(b, 17, 57, 6, 1, '#9a6a40');
    },
  };

  // Krul — the vampire queen: long pink twin tails with black bat-wing
  // ornaments, red eyes, pointed ears and a fang, red choker with a gold
  // brooch, black off-shoulder dress with gold buttons and red bows, a
  // white frilly petticoat, huge black sleeves, a red-lined black cape and
  // thigh-high boots.
  LOOKS.krul = {
    eye: ['#8a1020', '#d0203a', '#ff8090'],
    hair: { base: '#f4b0c8', light: '#ffd8e6', dark: '#d888a8' },
    hairBack(b) {
      const h = this.hair;
      b.ellipse(24, 17, 13.5, 12.5, h.base);
      // long twin tails down to her knees
      b.poly([[12, 9], [6, 13], [3, 24], [2, 40], [4, 54], [8, 57], [9, 44], [8, 30], [10, 18], [14, 14]], h.base);
      b.poly([[36, 9], [42, 13], [45, 24], [46, 40], [44, 54], [40, 57], [39, 44], [40, 30], [38, 18], [34, 14]], h.base);
      b.poly([[13, 12], [35, 12], [37, 30], [35, 44], [13, 44], [11, 30]], h.base);
      b.clip = true;
      b.line(5, 20, 4, 52, h.dark); b.line(43, 20, 44, 52, h.dark);
      b.line(7, 24, 7, 48, h.light); b.line(41, 24, 41, 48, h.light);
      b.clip = false;
    },
    hairFront(b) {
      const h = this.hair;
      b.poly([[12, 24], [12, 13], [17, 8], [24, 6], [31, 8], [36, 13], [36, 25], [34, 18], [31, 22], [29, 15], [26, 21], [24, 14], [22, 21], [19, 15], [16, 21], [14, 18]], h.base);
      polySym(b, [[12, 16], [10, 32], [12, 36], [15, 29], [15, 20]], h.base);
      hairShine(b, h.light, 9);
      // pointed vampire ears and a little fang
      b.poly([[12, 23], [7, 20], [9, 24], [12, 26]], SKIN.base);
      b.poly([[36, 23], [41, 20], [39, 24], [36, 26]], SKIN.base);
      b.set(25, 31, '#ffffff');
      // black bat-wing hair ornaments
      for (const [x, d] of [[12, -1], [36, 1]]) {
        b.poly([[x, 10], [x + d * 6, 3], [x + d * 5, 7], [x + d * 8, 6], [x + d * 4, 12]], '#1e1a24');
        b.set(x + d * 2, 9, '#5a2a3a');
      }
      b.set(17, 11, '#1e1a24'); b.set(31, 11, '#1e1a24');
    },
    body(b) {
      neck(b);
      const black = '#1e1a24', red = '#c8203a', dred = '#7a1424', gold = '#d6aa44', white = '#f6f4f0';
      // cape flowing behind her legs (red lining, black outside)
      b.poly([[14, 45], [34, 45], [41, 59], [7, 59]], black);
      b.poly([[16, 46], [32, 46], [37, 59], [11, 59]], dred);
      b.poly([[18, 47], [30, 47], [33, 59], [15, 59]], red);
      // bare shoulders, huge black sleeves hanging from the upper arms
      rectSym(b, 13, 36, 4, 3, SKIN.base);
      polySym(b, [[16, 38], [10, 40], [7, 50], [9, 52], [15, 49]], black);
      rectSym(b, 9, 49, 6, 1, white);
      b.line(9, 42, 8, 49, '#3a3240'); b.line(39, 42, 40, 49, '#3a3240');
      // bodice with crossed straps and two rows of gold buttons
      b.poly([[17, 37], [31, 37], [31, 46], [17, 46]], black);
      b.line(18, 37, 24, 33, black); b.line(30, 37, 24, 33, black);
      for (const y of [39, 41, 43]) { b.set(21, y, gold); b.set(27, y, gold); }
      // red choker with a bow, a gold brooch and a trailing ribbon
      b.rect(21, 34, 6, 1, red); b.poly([[21, 35], [24, 36], [21, 37]], red); b.poly([[27, 35], [24, 36], [27, 37]], red); b.set(24, 36, gold);
      b.line(25, 37, 26, 46, red);
      b.poly([[19, 33], [21, 35], [19, 36]], white); b.poly([[29, 33], [27, 35], [29, 36]], white);
      // red bows at the waist, ruffled skirt over a white petticoat
      for (const x of [19, 29]) { b.poly([[x - 2, 44], [x, 45], [x - 2, 46]], red); b.poly([[x + 2, 44], [x, 45], [x + 2, 46]], red); }
      b.poly([[15, 50], [33, 50], [35, 53], [13, 53]], white);
      for (let x = 13; x < 36; x += 2) b.set(x, 53, '#d8d8e0');
      b.poly([[16, 46], [32, 46], [34, 51], [14, 51]], black);
      for (let x = 15; x < 34; x += 3) b.set(x, 51, '#3a3240');
      // a peek of leg, then thigh-high boots
      rectSym(b, 18, 53, 4, 2, SKIN.base);
      rectSym(b, 17, 55, 6, 4, '#141018'); rectSym(b, 17, 55, 6, 1, '#3a3240');
      b.poly([[18, 55], [20, 56], [22, 55]], '#3a3240'); b.poly([[26, 55], [28, 56], [30, 55]], '#3a3240');
    },
  };

  // --------------------------------------------------------------- builder
  const cache = new Map();

  // ------------------------------------------------- beach & onsen outfits
  // Swimsuits: 'one' = one-piece (optional frill skirt), 'bikini' = top and
  // a wrap sarong. Towels are wrapped chest to thigh (waist only for the
  // player). Everything stays modest and chibi.
  // Each girl has a one-piece and a bikini; `pick` is what she wears unless
  // the wardrobe says otherwise. Bikinis can come with a sarong or a frill skirt.
  const SWIM = {
    player: { trunks: '#2f4fb0', shirt: '#f4f4f8', print: '#5ab8f0' },
    nami: { pick: 'bikini', one: { suit: '#5aa8f0', trim: '#ffffff' }, bikini: { suit: '#5aa8f0', trim: '#ffffff', sarong: '#f4b847' } },
    aqua: { pick: 'one', one: { suit: '#3b78e0', trim: '#ffffff', frill: true }, bikini: { suit: '#3b78e0', trim: '#ffffff', skirt: true } },
    yumeko: { pick: 'one', one: { suit: '#2a2232', trim: '#d8343c' }, bikini: { suit: '#d8343c', trim: '#2a2232' } },
    kurumi: { pick: 'one', one: { suit: '#1e1a24', trim: '#d8343c', frill: true }, bikini: { suit: '#1e1a24', trim: '#d8343c', skirt: true } },
    rem: { pick: 'one', one: { suit: '#4a84cc', trim: '#ffffff', frill: true }, bikini: { suit: '#ffffff', trim: '#4a84cc', skirt: true } },
    zerotwo: { pick: 'one', one: { suit: '#d83c4c', trim: '#ffffff' }, bikini: { suit: '#d83c4c', trim: '#ffffff' } },
    frieren: { pick: 'one', one: { suit: '#f4f4f8', trim: '#d6aa44', frill: true }, bikini: { suit: '#f4f4f8', trim: '#d6aa44', skirt: true } },
    marin: { pick: 'bikini', one: { suit: '#1e1a24', trim: '#f4a6bc' }, bikini: { suit: '#f05a8a', trim: '#ffffff' } },
    krul: { pick: 'one', one: { suit: '#1e1a24', trim: '#c8203a', frill: true }, bikini: { suit: '#c8203a', trim: '#1e1a24', skirt: true } },
  };
  const TOWEL = { player: '#e8eef8', nami: '#ffe0b8', aqua: '#d0ecff', yumeko: '#f4d0d8', kurumi: '#f0d0e0', rem: '#d8e8ff', zerotwo: '#ffd8e4', frieren: '#e4f4ec', marin: '#fff0c8', krul: '#f8d0dc' };
  const COAT = '#f4f2ec';

  // Resolve a character's beach look from the wardrobe options.
  // o: { swim: 'one'|'bikini', color, towel, coat, shirt (player: false = trunks only), trunks }
  function swimLook(id, o = {}) {
    const sw = SWIM[id];
    const style = o.swim || sw.pick;
    const look = Object.assign({ style }, sw[style]);
    if (o.color) { look.suit = o.color; if (look.sarong && style === 'bikini' && id === 'nami') look.sarong = look.sarong; }
    return look;
  }
  const towelColor = (id, o = {}) => o.towel || TOWEL[id] || '#ffffff';

  // ------------------------------------------------------------ pajamas
  // Each girl sleeps in something that suits her: Nami and Aqua in a baggy
  // tee and shorts, Yumeko in red silk, Kurumi in a
  // frilly gothic nightgown, Rem in polka dots, Zero Two in an oversized
  // shirt, Frieren in a plain gown and nightcap. The wardrobe can swap styles.
  const PJ_STYLES = { tee: 'Tee & shorts', set: 'Pajama set', yukata: 'Sleeping yukata', gown: 'Nightgown', bigshirt: 'Oversized shirt' };
  const PJ_PLAYER = ['set', 'tee', 'yukata'];
  const PAJAMA = {
    player: { pick: 'set', set: { c: '#3a4a8a', trim: '#f4f4f8', pattern: 'stripes' }, slip: '#5a6ab0' },
    nami: { pick: 'tee', tee: { c: '#ffffff', trim: '#f2913d', alt: '#5aa8f0' }, slip: '#f4b847' },
    aqua: { pick: 'tee', tee: { c: '#8fd3f7', trim: '#ffffff', alt: '#3b5fc8' }, slip: '#5ab8f0' },
    yumeko: { pick: 'set', set: { c: '#c8303a', trim: '#f4e0e0' }, slip: '#2a2232' },
    kurumi: { pick: 'gown', gown: { c: '#2a2832', trim: '#d8343c', frill: true }, slip: '#1e1a24' },
    rem: { pick: 'set', set: { c: '#c4e0ff', trim: '#ffffff', pattern: 'dots' }, slip: '#ffffff' },
    zerotwo: { pick: 'bigshirt', bigshirt: { c: '#f4f4f8', trim: '#d83c4c' }, slip: null },
    frieren: { pick: 'gown', gown: { c: '#e4f4ec', trim: '#d6aa44' }, cap: true, capC: '#7cc49a', slip: '#e4f4ec' },
    marin: { pick: 'tee', tee: { c: '#ffd0e0', trim: '#f05a8a', alt: '#2a2a36' }, slip: '#f8a8c8' },
    krul: { pick: 'gown', gown: { c: '#3a1a2a', trim: '#c8203a', frill: true }, slip: '#1e1a24' },
  };
  // o: { pj: style, pjColor, cap: true|false }
  function pjLook(id, o = {}) {
    const pj = PAJAMA[id];
    let style = o.pj || pj.pick;
    if (id === 'player' && !PJ_PLAYER.includes(style)) style = pj.pick;
    const mine = pj[pj.pick];
    const look = Object.assign({ style, slip: pj.slip }, pj[style] || { c: mine.c, trim: mine.trim, frill: style === 'gown' });
    if (o.pjColor) { look.c = o.pjColor; delete look.alt; }
    if (!look.alt) look.alt = style === 'tee' ? PX.shade(look.c, 0.25) : look.c;
    look.cap = o.cap !== undefined ? !!o.cap : !!pj.cap;
    look.capC = o.pjColor ? PX.shade(o.pjColor, 0.2) : pj.capC || PX.shade(look.c, 0.2);
    return look;
  }

  function slippers(b, c) {
    if (!c) { rectSym(b, 17, 57, 6, 2, SKIN.base); rectSym(b, 21, 57, 1, 2, SKIN.shade); return; }
    rectSym(b, 16, 57, 7, 2, c); rectSym(b, 17, 57, 5, 1, PX.tint(c, 0.4));
  }

  function pajamaBody(b, id, o = {}) {
    const pj = pjLook(id, o);
    const { c, trim, alt } = pj;
    const sh = PX.shade(c, 0.14);
    const dots = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y += 3) for (let x = x0 + ((y / 3) % 2 ? 1 : 0); x < x1; x += 3) b.set(x, y, trim); };
    const stripes = (x0, y0, x1, y1) => { for (let x = x0; x < x1; x += 3) b.rect(x, y0, 1, y1 - y0, PX.tint(c, 0.25)); };
    neck(b);
    switch (pj.style) {
      case 'tee':
        bareArms(b, 36, 9);
        polySym(b, [[16, 35], [12, 38], [12, 42], [16, 42]], c);
        b.poly([[16, 35], [32, 35], [33, 49], [15, 49]], c);
        b.rect(21, 35, 6, 1, sh); b.line(17, 41, 17, 48, sh);
        b.ellipse(24, 42, 3, 2.5, trim); b.set(24, 40, PX.shade(trim, 0.2));
        b.poly([[16, 48], [32, 48], [32, 52], [25, 52], [24, 50], [23, 52], [16, 52]], alt);
        bareLegs(b, 52, 5);
        break;
      case 'set':
        polySym(b, [[16, 35], [12, 38], [12, 46], [16, 46]], c);
        rectSym(b, 12, 45, 4, 1, PX.shade(c, 0.2)); rectSym(b, 12, 46, 4, 2, SKIN.base);
        b.poly([[16, 35], [32, 35], [32, 48], [16, 48]], c);
        rectSym(b, 17, 47, 7, 10, alt);
        if (pj.pattern === 'dots') { dots(16, 37, 32, 48); dots(17, 49, 31, 57); }
        if (pj.pattern === 'stripes') { stripes(17, 36, 32, 48); stripes(18, 48, 31, 57); }
        b.rect(24, 49, 1, 8, PX.shade(alt, 0.2));
        b.poly([[20, 35], [24, 39], [24, 35]], trim); b.poly([[28, 35], [24, 39], [24, 35]], PX.shade(trim, 0.08));
        b.rect(24, 39, 1, 9, sh); for (const y of [41, 44]) b.set(23, y, trim);
        b.rect(16, 47, 16, 1, sh);
        break;
      case 'yukata':
        polySym(b, [[16, 35], [11, 38], [11, 47], [16, 46]], c);
        rectSym(b, 13, 47, 3, 2, SKIN.base);
        b.poly([[16, 35], [32, 35], [33, 57], [15, 57]], c);
        for (const [x, y] of [[18, 40], [29, 38], [21, 50], [28, 53], [13, 42], [34, 44], [17, 54]]) b.set(x, y, alt);
        b.line(20, 35, 27, 44, sh);
        b.line(21, 35, 24, 39, trim); b.line(27, 35, 24, 39, trim);
        b.rect(15, 44, 18, 3, trim); b.rect(15, 44, 18, 1, PX.tint(trim, 0.3));
        rectSym(b, 18, 57, 4, 1, SKIN.base);
        break;
      case 'gown':
        bareArms(b, 38, 7);
        polySym(b, [[16, 35], [13, 37], [13, 40], [16, 40]], c);
        b.poly([[17, 35], [31, 35], [32, 44], [35, 56], [13, 56]], c);
        b.rect(17, 35, 14, 1, trim); b.ellipse(24, 37.5, 2, 1.2, trim);
        b.line(19, 45, 16, 55, sh); b.line(29, 45, 32, 55, sh);
        if (pj.frill) { b.rect(13, 54, 23, 2, PX.tint(c, 0.25)); for (let x = 13; x < 36; x += 2) b.set(x, 56, trim); b.rect(16, 43, 16, 1, trim); }
        rectSym(b, 18, 56, 4, 1, SKIN.base);
        break;
      case 'bigshirt':
        bareArms(b, 36, 9);
        polySym(b, [[16, 35], [12, 38], [12, 43], [16, 43]], c);
        rectSym(b, 12, 42, 4, 1, PX.shade(c, 0.12));
        b.poly([[16, 35], [32, 35], [34, 52], [24, 53], [14, 52]], c);
        b.poly([[20, 35], [24, 38], [24, 35]], PX.shade(c, 0.08)); b.poly([[28, 35], [24, 38], [24, 35]], PX.shade(c, 0.08));
        b.rect(24, 38, 1, 14, sh); for (const y of [41, 45, 49]) b.set(23, y, trim);
        b.rect(26, 39, 4, 3, PX.tint(trim, 0.2));
        bareLegs(b, 52, 5);
        break;
    }
    slippers(b, pj.slip);
  }


  // ------------------------------------------------------ casual / date
  // What everyone wears on dates (and every day, if the wardrobe says so).
  const CASUAL_STYLES = { sundress: 'Sundress', hoodie: 'Hoodie & skirt', blouse: 'Blouse & long skirt', sweater: 'Knit sweater', jacket: 'Jacket & shorts', croptop: 'Crop top & denim', denim: 'Denim jacket', smart: 'Blazer & slacks' };
  const CASUAL_PLAYER = ['denim', 'smart', 'hoodie'];
  const CASUAL = {
    player: { pick: 'denim', denim: { c: '#4a6a9a', in: '#ffffff', alt: '#2a2a36' }, smart: { c: '#2a3a5a', in: '#ffffff', alt: '#2a3a5a' }, hoodie: { c: '#8a8a96', trim: '#ffffff', alt: '#2a2a36' }, shoe: '#e8e8ec' },
    nami: { pick: 'sundress', sundress: { c: '#ffffff', trim: '#f2913d' }, shoe: '#d7b77a' },
    aqua: { pick: 'hoodie', hoodie: { c: '#8fd3f7', trim: '#ffffff', alt: '#ffffff' }, shoe: '#ffffff' },
    yumeko: { pick: 'blouse', blouse: { c: '#ffffff', trim: '#2a2232', alt: '#c8303a' }, shoe: '#2a2232' },
    kurumi: { pick: 'sundress', sundress: { c: '#2a2832', trim: '#d8343c', frill: true }, shoe: '#141018' },
    rem: { pick: 'blouse', blouse: { c: '#e4f0ff', trim: '#4a84cc', alt: '#ffffff' }, shoe: '#ffffff' },
    zerotwo: { pick: 'jacket', jacket: { c: '#c83a3a', in: '#1e1a24', alt: '#1e1a24' }, shoe: '#f4f4f8' },
    frieren: { pick: 'sweater', sweater: { c: '#c8b8e8', trim: '#a898d0', alt: '#f4f4f8' }, shoe: '#9a6a3a' },
    marin: { pick: 'croptop', croptop: { c: '#1e1a24', trim: '#f4a6bc', alt: '#6a8ac0' }, shoe: '#ffffff' },
    krul: { pick: 'hoodie', hoodie: { c: '#2a1a24', trim: '#c8203a', alt: '#8a1e2e' }, shoe: '#141018' },
  };
  // o: { cas: style, casColor }
  function casualLook(id, o = {}) {
    const cs = CASUAL[id];
    let style = o.cas || cs.pick;
    if (id === 'player' && !CASUAL_PLAYER.includes(style)) style = cs.pick;
    if (id !== 'player' && CASUAL_PLAYER.includes(style) && style !== 'hoodie') style = cs.pick;
    const mine = cs[cs.pick];
    const look = Object.assign({ style, shoe: cs.shoe }, cs[style] || { c: mine.c, trim: mine.trim || PX.shade(mine.c, 0.2), alt: mine.alt || PX.shade(mine.c, 0.3), in: mine.in || '#ffffff' });
    if (o.casColor) look.c = o.casColor;
    look.trim = look.trim || PX.shade(look.c, 0.2);
    look.alt = look.alt || PX.shade(look.c, 0.3);
    look.in = look.in || '#ffffff';
    return look;
  }
  function casualBody(b, id, o = {}) {
    const k = casualLook(id, o);
    const { c, trim, alt } = k;
    const sh = PX.shade(c, 0.14);
    const shoes = () => { rectSym(b, 17, 57, 6, 2, k.shoe); rectSym(b, 17, 57, 6, 1, PX.tint(k.shoe, 0.3)); };
    const longSleeves = (col) => { polySym(b, [[16, 35], [11, 38], [11, 46], [16, 46]], col); rectSym(b, 12, 46, 4, 2, SKIN.base); };
    neck(b);
    switch (k.style) {
      case 'sundress':
        bareArms(b, 36, 9);
        b.poly([[17, 35], [31, 35], [32, 43], [35, 53], [13, 53]], c);
        b.rect(18, 35, 2, 1, trim); b.rect(28, 35, 2, 1, trim);
        b.rect(16, 42, 16, 2, trim); b.ellipse(29, 43, 2, 1.5, trim);
        for (const [x, y] of [[20, 38], [27, 39], [18, 47], [24, 49], [30, 48], [21, 51]]) { b.set(x, y, trim); b.set(x + 1, y, PX.tint(trim, 0.4)); }
        if (k.frill) { b.rect(13, 52, 23, 1, PX.tint(c, 0.3)); for (let x = 13; x < 36; x += 2) b.set(x, 53, trim); }
        bareLegs(b, 53, 4);
        break;
      case 'hoodie':
        longSleeves(c);
        b.poly([[16, 35], [32, 35], [33, 47], [15, 47]], c);
        b.rect(18, 34, 12, 2, sh); b.line(22, 36, 22, 40, trim); b.line(26, 36, 26, 40, trim);
        b.rect(19, 42, 10, 4, sh); b.rect(15, 46, 18, 1, sh);
        if (id === 'player') { rectSym(b, 17, 47, 7, 10, alt); b.rect(24, 49, 1, 8, PX.shade(alt, 0.2)); }
        else { b.poly([[16, 47], [32, 47], [34, 53], [14, 53]], alt); for (let x = 17; x < 33; x += 4) b.line(x, 47, x - 1, 53, PX.shade(alt, 0.12)); bareLegs(b, 53, 4); }
        break;
      case 'blouse':
        bareArms(b, 38, 7);
        polySym(b, [[16, 35], [12, 37], [12, 41], [16, 41]], c);
        b.poly([[16, 35], [32, 35], [32, 45], [16, 45]], c);
        b.poly([[21, 36], [24, 38], [21, 40]], trim); b.poly([[27, 36], [24, 38], [27, 40]], trim); b.rect(23, 37, 2, 2, PX.shade(trim, 0.2));
        b.poly([[16, 44], [32, 44], [35, 57], [13, 57]], alt); b.rect(16, 44, 16, 2, PX.shade(alt, 0.18));
        b.line(20, 47, 18, 56, PX.shade(alt, 0.1)); b.line(28, 47, 30, 56, PX.shade(alt, 0.1));
        break;
      case 'sweater':
        polySym(b, [[15, 35], [10, 38], [10, 47], [16, 47]], c); rectSym(b, 12, 47, 3, 1, SKIN.base);
        b.poly([[15, 35], [33, 35], [34, 48], [14, 48]], c);
        b.rect(20, 33, 8, 3, c); b.rect(20, 33, 8, 1, PX.tint(c, 0.2));
        for (let x = 16; x < 33; x += 3) b.line(x, 37, x, 47, sh);
        b.rect(14, 47, 20, 1, trim);
        b.poly([[16, 48], [32, 48], [34, 56], [14, 56]], alt); b.rect(18, 56, 4, 1, SKIN.base); b.rect(26, 56, 4, 1, SKIN.base);
        break;
      case 'jacket':
        b.poly([[16, 35], [32, 35], [32, 46], [16, 46]], k.in);
        longSleeves(c);
        polySym(b, [[16, 35], [21, 35], [21, 47], [15, 47]], c); b.line(21, 36, 21, 46, sh); b.line(27, 36, 27, 46, sh);
        rectSym(b, 11, 45, 5, 1, PX.tint(c, 0.3)); rectSym(b, 15, 46, 6, 1, PX.tint(c, 0.3));
        b.poly([[16, 46], [32, 46], [32, 50], [25, 50], [24, 48], [23, 50], [16, 50]], alt);
        bareLegs(b, 50, 7);
        break;
      case 'croptop':
        bareArms(b, 36, 9);
        b.poly([[17, 35], [31, 35], [31, 42], [17, 42]], c); b.rect(17, 41, 14, 1, trim);
        b.ellipse(24, 38.5, 2, 1.5, trim); b.rect(24, 42, 1, 2, SKIN.shade);
        b.poly([[16, 44], [32, 44], [32, 49], [25, 49], [24, 47], [23, 49], [16, 49]], alt);
        b.rect(16, 44, 16, 1, '#3a3a4a'); b.set(24, 44, '#d6aa44');
        for (const x of [17, 31]) b.line(x, 45, x, 48, PX.tint(alt, 0.25));
        bareLegs(b, 49, 8);
        break;
      case 'denim': case 'smart':
        b.poly([[16, 35], [32, 35], [31, 48], [17, 48]], k.in);
        longSleeves(c);
        polySym(b, [[16, 35], [21, 35], [20, 48], [16, 48]], c);
        if (k.style === 'smart') { b.poly([[21, 35], [24, 41], [21, 41]], PX.shade(c, 0.2)); b.poly([[27, 35], [24, 41], [27, 41]], PX.shade(c, 0.2)); b.rect(23, 36, 2, 5, '#d8343c'); }
        else { b.rect(17, 40, 3, 2, sh); b.rect(28, 40, 3, 2, sh); for (const y of [38, 42, 46]) { b.set(20, y, '#d6aa44'); b.set(27, y, '#d6aa44'); } }
        rectSym(b, 17, 48, 7, 9, alt); b.rect(24, 50, 1, 7, PX.shade(alt, 0.2));
        break;
    }
    shoes();
  }


  // ------------------------------------------------------------ cosplay
  // Marin's costumes: Shizuku-tan (gothic black-lily maid: black bob wig,
  // purple eyes, grey ruffled apron, poofy black dress, lace tights),
  // Rizu-kyun (succubus: red twin tails, black curled horns, bat wings and
  // a devil tail, black puffy shrug with a white frilly collar), and a pink
  // magical girl with a star wand (her own hair).
  const COSPLAY_NAMES = { shizuku: 'Shizuku-tan', rizu: 'Rizu-kyun', magical: 'Magical Girl' };
  const COSPLAY = {
    shizuku: {
      eye: ['#4a3a7a', '#8a7ad0', '#c8b8f8'],
      hairBack(b) {
        const c = '#2a2236';
        b.ellipse(24, 17, 13.5, 12.5, c);
        b.poly([[11, 12], [37, 12], [38, 32], [34, 37], [14, 37], [10, 32]], c);
      },
      hairFront(b) {
        const c = '#2a2236', l = '#4a4060';
        b.poly([[11, 26], [12, 13], [17, 8], [24, 6], [31, 8], [36, 13], [37, 26], [35, 21], [35, 18], [13, 18], [13, 21]], c);
        b.rect(13, 16, 22, 4, c);
        hairShine(b, l, 9);
        polySym(b, [[11, 16], [10, 33], [13, 35], [15, 24]], c);
        // black lace headdress with ribbons
        b.poly([[14, 9], [24, 5], [34, 9], [33, 11], [24, 8], [15, 11]], '#1e1a24');
        for (const x of [15, 33]) { b.rect(x - 2, 8, 4, 4, '#1e1a24'); b.line(x, 12, x - (x < 24 ? 2 : -2), 22, '#1e1a24'); }
      },
      body(b) {
        neck(b);
        const blk = '#1e1a24', gry = '#a8a0b4', wht = '#f4f2f8';
        // long black sleeves, grey ruffled shoulders
        polySym(b, [[16, 36], [11, 39], [11, 47], [16, 46]], blk); rectSym(b, 12, 47, 4, 2, SKIN.base);
        polySym(b, [[15, 35], [10, 37], [12, 40], [17, 38]], gry);
        // bodice with a ribbon tie, grey apron down the front
        b.poly([[17, 35], [31, 35], [31, 44], [17, 44]], blk);
        b.rect(21, 34, 6, 2, blk); b.set(24, 35, '#d6aa44'); b.line(24, 36, 23, 42, '#3a3240'); b.line(24, 36, 25, 42, '#3a3240');
        b.poly([[20, 38], [28, 38], [27, 44], [21, 44]], '#3a3240');
        // poofy skirt with a white petticoat
        b.poly([[16, 44], [32, 44], [38, 54], [10, 54]], blk);
        b.poly([[20, 44], [28, 44], [29, 52], [19, 52]], gry);
        b.rect(10, 53, 28, 2, wht); for (let x = 10; x < 38; x += 2) b.set(x, 55, wht);
        // lace tights
        rectSym(b, 18, 55, 4, 4, '#2a2632'); for (const [x, y] of [[19, 56], [20, 58], [27, 56], [28, 58]]) b.set(x, y, '#4a4458');
      },
    },
    rizu: {
      eye: ['#2a5a3a', '#5aa868', '#a8e0b0'],
      wings: true,
      hairBack(b) {
        const c = '#e0304a', d = '#a81e34';
        // bat wings behind everything
        for (const s of [-1, 1]) {
          const x = 24 + s * 12;
          b.poly([[x, 37], [x + s * 18, 28], [x + s * 22, 33], [x + s * 17, 34], [x + s * 18, 40], [x + s * 12, 39], [x + s * 10, 44]], '#1e1a24');
          b.line(x, 37, x + s * 18, 28, '#3a3240');
        }
        // devil tail
        b.line(30, 48, 41, 54, '#1e1a24'); b.line(41, 54, 44, 50, '#1e1a24'); b.poly([[43, 47], [47, 49], [44, 52]], '#1e1a24');
        b.ellipse(24, 17, 13.5, 12.5, c);
        b.poly([[12, 9], [6, 13], [4, 24], [4, 38], [7, 44], [9, 36], [10, 22], [14, 14]], c);
        b.poly([[36, 9], [42, 13], [44, 24], [44, 38], [41, 44], [39, 36], [38, 22], [34, 14]], c);
        b.clip = true; b.line(6, 20, 6, 40, d); b.line(42, 20, 42, 40, d); b.clip = false;
      },
      hairFront(b) {
        const c = '#e0304a', l = '#ff7088';
        b.poly([[12, 24], [12, 13], [17, 8], [24, 6], [31, 8], [36, 13], [36, 24], [34, 18], [31, 21], [29, 15], [26, 20], [24, 14], [22, 20], [19, 15], [16, 21], [14, 18]], c);
        polySym(b, [[12, 16], [11, 30], [13, 33], [15, 26], [15, 20]], c);
        hairShine(b, l, 9);
        b.poly([[12, 23], [7, 20], [9, 24], [12, 26]], SKIN.base); b.poly([[36, 23], [41, 20], [39, 24], [36, 26]], SKIN.base);
        b.set(25, 31, '#ffffff');
        // curled black horns
        for (const s of [-1, 1]) { const x = 24 + s * 9; b.ellipse(x, 7, 3, 3, '#1e1a24'); b.poly([[x, 4], [x + s * 4, 1], [x + s * 3, 5]], '#1e1a24'); b.set(x - s, 6, '#4a4458'); }
      },
      body(b) {
        neck(b);
        const blk = '#1e1a24', wht = '#f4f2f8';
        // puffy black shrug sleeves with white cuffs
        polySym(b, [[16, 36], [10, 39], [10, 46], [16, 45]], blk); rectSym(b, 10, 45, 6, 1, wht); rectSym(b, 12, 46, 4, 2, SKIN.base);
        // frilly white collar
        b.poly([[18, 34], [30, 34], [32, 38], [16, 38]], wht); for (let x = 16; x < 33; x += 2) b.set(x, 38, '#d8d8e0');
        b.ellipse(24, 37, 2, 1.2, '#c8b8e8');
        // black top and frilly bottoms (modest, chibi)
        b.poly([[17, 38], [31, 38], [31, 42], [17, 42]], SKIN.base);
        b.rect(18, 38, 12, 4, blk); b.rect(18, 42, 12, 1, '#5a5464');
        b.rect(17, 43, 14, 3, SKIN.base); b.set(24, 44, SKIN.shade);
        b.poly([[16, 46], [32, 46], [33, 50], [15, 50]], blk); for (let x = 15; x < 34; x += 2) b.set(x, 50, '#5a5464');
        bareLegs(b, 50, 6);
        rectSym(b, 17, 56, 6, 3, blk); rectSym(b, 17, 56, 6, 1, '#5a5464');
      },
    },
    magical: {
      hairLook: 'marin',
      body(b) {
        neck(b);
        const pk = '#f88ab8', wh = '#ffffff', gd = '#f4c83a';
        polySym(b, [[16, 35], [12, 37], [12, 41], [16, 40]], wh);
        rectSym(b, 12, 41, 4, 6, wh); rectSym(b, 12, 47, 4, 2, wh);
        b.poly([[17, 35], [31, 35], [31, 44], [17, 44]], pk);
        b.poly([[21, 36], [24, 39], [21, 41]], wh); b.poly([[27, 36], [24, 39], [27, 41]], wh); b.ellipse(24, 39, 1.5, 1.5, gd);
        b.poly([[16, 44], [32, 44], [36, 53], [12, 53]], pk);
        b.poly([[16, 44], [32, 44], [34, 49], [14, 49]], wh); b.rect(12, 52, 24, 1, wh);
        for (let x = 13; x < 36; x += 4) b.set(x, 50, gd);
        bareLegs(b, 53, 3);
        rectSym(b, 17, 56, 6, 3, pk); rectSym(b, 17, 56, 6, 1, wh);
      },
      extra(b) {
        b.line(37, 30, 33, 50, '#f4c83a'); b.ellipse(38, 28, 3, 3, '#ffe066'); b.set(38, 24, '#ffe066'); b.set(42, 28, '#ffe066'); b.set(34, 28, '#ffe066'); b.set(38, 32, '#ffe066');
        b.ellipse(24, 6, 3, 2, '#f88ab8'); b.rect(20, 5, 8, 2, '#f88ab8');
      },
    },
  };

  function nightcap(b, c) {
    b.poly([[13, 13], [35, 13], [32, 6], [25, 2], [18, 4]], c);
    b.poly([[28, 4], [36, 6], [40, 13], [37, 12], [31, 8]], c);
    b.rect(13, 11, 22, 3, PX.tint(c, 0.4));
    b.line(19, 6, 30, 5, PX.shade(c, 0.1));
    b.ellipse(39, 14, 2.4, 2.4, '#ffffff');
  }

  function sandals(b) {
    rectSym(b, 17, 57, 6, 1, SKIN.base);
    rectSym(b, 16, 58, 7, 1, '#c8a070');
    rectSym(b, 19, 57, 1, 1, '#a87a4a');
  }

  function outfitBody(b, id, outfit, o = {}) {
    neck(b);
    if (outfit === 'towel') {
      const c = towelColor(id, o);
      bareArms(b, 36, 9);
      if (id === 'player') {
        b.poly([[16, 35], [32, 35], [31, 45], [17, 45]], SKIN.base);
        b.line(20, 39, 23, 40, SKIN.shade); b.line(28, 39, 25, 40, SKIN.shade); b.rect(24, 42, 1, 3, SKIN.shade);
        b.poly([[16, 44], [32, 44], [33, 52], [15, 52]], c);
        b.rect(16, 44, 16, 1, PX.tint(c, 0.4)); b.line(28, 45, 30, 51, PX.shade(c, 0.12));
      } else {
        b.poly([[16, 37], [32, 37], [34, 51], [14, 51]], c);
        b.rect(16, 37, 16, 2, PX.tint(c, 0.5));
        b.line(29, 39, 31, 50, PX.shade(c, 0.15)); b.set(30, 39, PX.shade(c, 0.25)); b.set(31, 40, PX.shade(c, 0.25));
        for (const y of [42, 46]) b.rect(15, y, 18, 1, PX.shade(c, 0.08));
        b.rect(14, 50, 20, 1, PX.shade(c, 0.15));
      }
      bareLegs(b, id === 'player' ? 52 : 51, id === 'player' ? 5 : 6);
      rectSym(b, 17, 57, 6, 2, SKIN.base);
      rectSym(b, 21, 57, 1, 2, SKIN.shade);
      return;
    }
    bareArms(b, 36, 9);
    if (id === 'player') {
      const sw = SWIM.player;
      const trunks = o.trunks || sw.trunks;
      b.poly([[16, 35], [32, 35], [31, 45], [17, 45]], SKIN.base);
      b.line(20, 39, 23, 40, SKIN.shade); b.line(28, 39, 25, 40, SKIN.shade);
      if (o.shirt !== false) {
        // open short-sleeved beach shirt
        polySym(b, [[16, 35], [12, 37], [12, 41], [16, 41]], sw.shirt);
        polySym(b, [[16, 35], [20, 35], [20, 45], [16, 45]], sw.shirt);
        [[13, 38], [18, 37], [17, 42], [33, 39], [30, 37], [31, 43]].forEach(([x, y]) => b.set(x, y, sw.print));
      } else b.rect(24, 42, 1, 3, SKIN.shade);
      b.poly([[16, 44], [32, 44], [32, 51], [25, 51], [24, 48], [23, 51], [16, 51]], trunks);
      b.rect(16, 44, 16, 1, '#ffffff'); b.rect(30, 46, 1, 5, '#ffffff');
      bareLegs(b, 51, 6);
      sandals(b);
      return;
    }
    const sw = swimLook(id, o);
    if (sw.style === 'bikini') {
      b.poly([[16, 35], [32, 35], [31, 47], [17, 47]], SKIN.base);
      b.rect(18, 38, 5, 3, sw.suit); b.rect(25, 38, 5, 3, sw.suit); b.rect(23, 39, 2, 1, sw.trim);
      b.line(19, 37, 21, 35, sw.suit); b.line(28, 37, 27, 35, sw.suit);
      b.rect(24, 44, 1, 1, SKIN.shade);
      if (sw.sarong) {
        // wrap sarong tied at the hip
        b.poly([[16, 46], [32, 46], [34, 52], [26, 53], [14, 51]], sw.sarong);
        b.line(17, 47, 25, 52, PX.shade(sw.sarong, 0.18)); b.ellipse(31, 47, 2, 1.5, PX.shade(sw.sarong, 0.2));
        [[19, 49], [28, 49], [22, 51]].forEach(([x, y]) => b.set(x, y, '#ffffff'));
        bareLegs(b, 52, 5);
      } else if (sw.skirt) {
        b.poly([[16, 46], [32, 46], [34, 51], [14, 51]], sw.suit);
        b.rect(16, 46, 16, 1, sw.trim);
        for (let x = 15; x < 34; x += 3) b.set(x, 51, sw.trim);
        bareLegs(b, 51, 6);
      } else {
        b.poly([[17, 46], [31, 46], [29, 50], [19, 50]], sw.suit);
        b.rect(17, 46, 14, 1, sw.trim);
        bareLegs(b, 50, 7);
      }
    } else {
      b.poly([[17, 36], [31, 36], [31, 46], [28, 49], [20, 49], [17, 46]], sw.suit);
      b.rect(18, 35, 2, 2, sw.suit); b.rect(28, 35, 2, 2, sw.suit);
      b.rect(17, 36, 14, 1, sw.trim);
      b.line(20, 48, 17, 46, sw.trim); b.line(28, 48, 31, 46, sw.trim);
      b.set(24, 37, sw.trim);
      if (sw.frill) {
        b.poly([[16, 45], [32, 45], [34, 50], [14, 50]], sw.suit);
        for (let x = 15; x < 34; x += 3) b.set(x, 50, sw.trim);
        b.rect(16, 45, 16, 1, sw.trim);
      }
      bareLegs(b, sw.frill ? 50 : 49, sw.frill ? 7 : 8);
    }
    sandals(b);
  }


  // ---------------------------------------------------------- part colours
  // The wardrobe can recolour every part of an outfit. Parts are found
  // automatically: the outfit layer's colours are grouped into families
  // (a base colour plus its shades), skin excluded. o.tint[lookKey] maps a
  // family's base colour to the colour picked for it; shading is kept.
  const hsl = (hex) => {
    const [r, g, b] = PX.hexToRgb(hex).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, sat, l];
  };
  const fromHsl = (h, sat, l) => {
    const f = (n) => { const k = (n + h / 30) % 12, a = sat * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return PX.rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  };
  const rgbDist = (a, b) => { const A = PX.hexToRgb(a), B = PX.hexToRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  const SKINS = [SKIN.base, SKIN.shade, SKIN.blush, '#efc3a2', '#f6d3b8', '#ffeee0'];
  const isSkin = (c) => SKINS.some((k) => rgbDist(k, c) < 9);
  const sameFamily = (a, b) => {
    if (rgbDist(a, b) < 48) return true;
    const A = hsl(a), B = hsl(b);
    const grayA = A[1] < 0.16 || A[2] > 0.93 || A[2] < 0.08, grayB = B[1] < 0.16 || B[2] > 0.93 || B[2] < 0.08;
    if (grayA || grayB) return grayA && grayB && Math.abs(A[2] - B[2]) < 0.22;
    const dh = Math.min(Math.abs(A[0] - B[0]), 360 - Math.abs(A[0] - B[0]));
    return dh < 22 && Math.abs(A[2] - B[2]) < 0.3 && Math.abs(A[1] - B[1]) < 0.45;
  };
  // body areas of the 48x64 portrait (and the walker keys that live there)
  const BANDS = ['Top', 'Waist', 'Legs', 'Shoes'];
  const bandOfY = (y) => (y < 41 ? 0 : y < 49 ? 1 : y < 57 ? 2 : 3);
  function familiesOf(bufs) {
    const stats = new Map();
    for (const b of bufs) for (let i = 0; i < b.d.length; i++) {
      const c = b.d[i];
      if (!c || isSkin(c)) continue;
      const st = stats.get(c) || { n: 0, bands: [0, 0, 0, 0] };
      st.n += 1; st.bands[bandOfY(Math.floor(i / b.w))] += 1;
      stats.set(c, st);
    }
    const fams = [];
    for (const [c, st] of [...stats].sort((x, y) => y[1].n - x[1].n)) {
      const f = fams.find((q) => sameFamily(q.base, c));
      if (f) { f.members.push(c); f.n += st.n; st.bands.forEach((v, k) => { f.bands[k] += v; }); }
      else fams.push({ base: c, members: [c], n: st.n, bands: st.bands.slice() });
    }
    return fams.filter((f) => f.n >= 3);
  }
  const COLOR_NAMES = [['red', '#d0303a'], ['pink', '#f08ab0'], ['orange', '#f0902a'], ['yellow', '#f4d03a'], ['gold', '#d0a040'], ['green', '#4ab060'], ['teal', '#3ab0b0'], ['sky blue', '#8ec5f0'], ['blue', '#3b5fc8'], ['navy', '#2a3060'], ['purple', '#8a4ad0'], ['lilac', '#c8b0e8'], ['brown', '#8a5a3a'], ['cream', '#f4e8c8'], ['white', '#f8f8f8'], ['grey', '#8a8a96'], ['black', '#1e1a24']];
  const colorName = (c) => COLOR_NAMES.reduce((best, [n, h]) => (rgbDist(h, c) < best[1] ? [n, rgbDist(h, c)] : best), ['colour', 1e9])[0];
  const lookKey = (outfit, o) => (outfit === 'cosplay' ? 'cosplay-' + ((o && o.cos) || 'shizuku') : outfit || 'normal');
  const partsCache = new Map();
  // An outfit's colour families, each split by body area into parts.
  function partInfo(id, outfit, o) {
    const clean = Object.assign({}, o || {}); delete clean.tint;
    const ck = id + '|' + (outfit || '') + '|' + JSON.stringify(clean);
    if (partsCache.has(ck)) return partsCache.get(ck);
    const bufs = layers(id, outfit, clean).clothes;
    const fams = familiesOf(bufs);
    const famOf = new Map();
    fams.forEach((f) => f.members.forEach((m) => famOf.set(m, f)));
    // connected pieces of each colour family: a garment is one piece, the
    // same colour somewhere else (socks under a white shirt) is another
    const comps = [];
    const pix = bufs.map((b) => new Array(b.d.length).fill(null));
    bufs.forEach((b, bi) => {
      for (let i = 0; i < b.d.length; i++) {
        const f = famOf.get(b.d[i]);
        if (!f || pix[bi][i]) continue;
        const comp = { f, px: [], ySum: 0 };
        const stack = [i];
        pix[bi][i] = comp;
        while (stack.length) {
          const j = stack.pop();
          comp.px.push([bi, j]); comp.ySum += Math.floor(j / b.w);
          const x = j % b.w;
          for (const q of [j - b.w, j + b.w, x > 0 ? j - 1 : -1, x < b.w - 1 ? j + 1 : -1]) {
            if (q < 0 || q >= b.d.length || pix[bi][q] || famOf.get(b.d[q]) !== f) continue;
            pix[bi][q] = comp; stack.push(q);
          }
        }
        comps.push(comp);
      }
    });
    const parts = new Map();
    for (const f of fams) {
      const mine = comps.filter((c) => c.f === f);
      let big = mine.filter((c) => c.px.length >= 10);
      if (!big.length) big = [mine.reduce((m, c) => (c.px.length > m.px.length ? c : m), mine[0])];
      for (const c of mine) {
        const cy = c.ySum / c.px.length;
        const host = big.reduce((m, q) => (Math.abs(q.ySum / q.px.length - cy) < Math.abs(m.ySum / m.px.length - cy) ? q : m), big[0]);
        const band = bandOfY(host.ySum / host.px.length);
        const key = f.base + '@' + band;
        c.key = key;
        const pt = parts.get(key) || { key, color: f.base, members: f.members, band, n: 0 };
        pt.n += c.px.length;
        parts.set(key, pt);
      }
    }
    const list = [...parts.values()];
    list.forEach((pt) => { pt.label = `${pt.n < 12 ? 'Details' : BANDS[pt.band]} · ${colorName(pt.color)}`; });
    list.sort((x, y) => x.band - y.band || y.n - x.n);
    const info = { fams, list, pixKeys: pix.map((row) => row.map((c) => (c ? c.key : null))) };
    partsCache.set(ck, info);
    return info;
  }
  // The recolourable parts of an outfit: [{ key, color, label, band }]
  const parts = (id, outfit = null, o = null) => partInfo(id, outfit, o).list;
  const shiftTo = (c, base, to) => {
    const C = hsl(c), B = hsl(base), Tt = hsl(to);
    const sat = B[1] > 0.06 ? Math.min(1, Tt[1] * (C[1] / B[1] || 1)) : Tt[1];
    return fromHsl(Tt[0], sat, Math.max(0, Math.min(1, Tt[2] + (C[2] - B[2]))));
  };
  function applyTint(buf, keys, tint) {
    for (let i = 0; i < buf.d.length; i++) {
      const to = keys[i] && tint[keys[i]];
      if (!to) continue;
      const base = keys[i].split('@')[0];
      buf.d[i] = shiftTo(buf.d[i], base, to);
    }
  }
  // For the walking sprites: the closest family for a flat colour, in the
  // body area that walker colour is drawn in.
  const WALK_BAND = { top: 0, trim: 0, sleeves: 0, tie: 0, ribbon: 0, accent: 0, band: 0, nightcap: 0, headTowel: 0, bikini: 0, openShirt: 0, stripes: 1, dots: 1, sash: 1, belt: 1, apron: 1, bottomC: 1, gownTrim: 2, legs: 2, shoes: 3 };
  function tintFlat(id, outfit, o, c, key) {
    const tint = o && o.tint && o.tint[lookKey(outfit, o)];
    if (!tint || !c || isSkin(c)) return c;
    const info = partInfo(id, outfit, o);
    let best = null, bd = 80;
    for (const f of info.fams) for (const m of f.members) { const d = rgbDist(m, c); if (d < bd) { bd = d; best = f; } }
    if (!best) return c;
    const want = WALK_BAND[key] !== undefined ? WALK_BAND[key] : 1;
    const opts = info.list.filter((pt) => pt.color === best.base);
    const pt = opts.reduce((m, q) => (Math.abs(q.band - want) < Math.abs(m.band - want) ? q : m), opts[0]);
    const to = pt && tint[pt.key];
    return to ? shiftTo(c, best.base, to) : c;
  }

  // The layers of a portrait: hair behind, the outfit, the head, bangs, and
  // outfit extras (props, caps, towels). `clothes` are the recolourable ones.
  function layers(id, outfit, o) {
    const cos = outfit === 'cosplay' ? COSPLAY[o.cos] || COSPLAY.shizuku : null;
    const base = LOOKS[id];
    const hairOf = cos && cos.hairLook ? LOOKS[cos.hairLook] : cos || base;
    const look = Object.assign({}, base, { eye: (cos && cos.eye) || base.eye, hairBack: hairOf.hairBack, hairFront: hairOf.hairFront, hair: hairOf.hair || base.hair });
    const body = new Buf(W, H);
    if (cos) cos.body(body);
    else if (outfit === 'pajama') pajamaBody(body, id, o);
    else if (outfit === 'casual') casualBody(body, id, o);
    else if (outfit === 'swim' || outfit === 'towel') outfitBody(body, id, outfit, o); else look.body(body, o);
    const extras = [];
    if (look.extra && !outfit) { const e = new Buf(W, H); look.extra(e); extras.push(e); }
    if (cos && cos.extra) { const e = new Buf(W, H); cos.extra(e); extras.push(e); }
    if (outfit === 'pajama') {
      const pj = pjLook(id, o);
      if (pj.cap) { const t = new Buf(W, H); nightcap(t, pj.capC); extras.push(t); }
    }
    if (outfit === 'towel' && id !== 'player') {
      // a little folded towel resting on her head
      const t = new Buf(W, H);
      const c = towelColor(id, o);
      t.rect(18, 3, 12, 3, c); t.rect(18, 3, 12, 1, PX.tint(c, 0.5)); t.rect(19, 6, 10, 1, PX.shade(c, 0.12));
      extras.push(t);
    }
    return { look, body, extras, clothes: [body, ...extras] };
  }

  function buildBuf(id, expr = 'neutral', blink = false, outfit = null, o = {}) {
    const L = layers(id, outfit, o);
    const tint = o.tint && o.tint[lookKey(outfit, o)];
    if (tint) { const info = partInfo(id, outfit, o); L.clothes.forEach((b, bi) => applyTint(b, info.pixKeys[bi], tint)); }
    const look = L.look;
    const back = new Buf(W, H); look.hairBack(back); back.outline(0.55);
    L.body.outline(0.55);
    const head = new Buf(W, H); drawHead(head); head.outline(0.45); drawFace(head, look, expr, blink);
    const front = new Buf(W, H); look.hairFront(front); front.outline(0.55);
    const out = new Buf(W, H);
    out.draw(back).draw(L.body).draw(head).draw(front);
    for (const e of L.extras) { e.outline(0.6); out.draw(e); }
    return out;
  }

  function get(id, expr = 'neutral', blink = false, outfit = null, o = null) {
    const key = id + '|' + expr + '|' + blink + '|' + (outfit || '') + '|' + (o ? JSON.stringify(o) : '');
    if (!cache.has(key)) cache.set(key, buildBuf(id, expr, blink, outfit, o || {}).toCanvas(1));
    return cache.get(key);
  }

  // Small heart icon used for affection meters and floating hearts.
  function heart(fill = '#ff6b8a', empty = false) {
    const b = new Buf(7, 6);
    const rows = ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'];
    b.map(0, 0, rows, { x: empty ? '#5a4a66' : fill });
    if (!empty) { b.set(1, 1, '#ffd0dc'); b.set(2, 1, '#ffffff'); }
    return b.toCanvas(1);
  }

  global.SPRITES = { get, heart, W, H, LOOKS, EXPRESSIONS, SWIM, TOWEL, COAT, swimLook, towelColor, PAJAMA, PJ_STYLES, PJ_PLAYER, pjLook, CASUAL, CASUAL_STYLES, CASUAL_PLAYER, casualLook, COSPLAY_NAMES, parts, tintFlat, lookKey };
})(window);
