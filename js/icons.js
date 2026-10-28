// Hand-designed 16x16 pixel icons that replace emoji everywhere in the UI.
// Each icon is drawn in code like the rest of the art (no image files), then
// any emoji in the page's text is swapped for its icon as it appears.
//   ICONS.img(emoji) -> <img> or null · ICONS.list() -> [emoji]
(function (global) {
  'use strict';
  const { Buf, shade, tint } = PX;
  const S = 16;
  const INK = '#2a1828';

  // ---------------------------------------------------------- palette
  const C = {
    red: '#e0404a', redD: '#a82838', pink: '#ff8ab0', pinkL: '#ffc6d8', rose: '#f05a8a', orange: '#f59a3a', yellow: '#f8d04a', yellowL: '#fff0a0', gold: '#e0b040',
    green: '#5ac46a', greenD: '#2f8a4a', leaf: '#7ad07a', teal: '#3ab8b0', sky: '#8ed0f4', blue: '#3b78e0', blueD: '#2a4a9a', navy: '#2a3060', purple: '#9a5ae0', lilac: '#c8b0f0',
    brown: '#9a6a3a', brownD: '#6a4426', tan: '#e0b884', cream: '#fff4dc', white: '#ffffff', grey: '#a8a4b4', greyD: '#5a5664', black: '#2a2632', skin: '#fde3cc', face: '#ffd24a',
  };

  // ---------------------------------------------------------- helpers
  function mk(draw, opts = {}) {
    return () => {
      const b = new Buf(S, S);
      draw(b);
      if (opts.outline !== false) b.outline(0, INK);
      return b;
    };
  }
  const heartShape = (b, c, x = 0, y = 0, hi = true) => {
    b.map(1 + x, 2 + y, ['.xxx..xxx.', 'xxxxxxxxxx', 'xxxxxxxxxx', 'xxxxxxxxxx', '.xxxxxxxx.', '..xxxxxx..', '...xxxx...', '....xx....'].map((r) => r + '..'), { x: c });
    b.rect(x + 1, y + 2, 12, 0, c);
    if (hi) { b.set(x + 3, y + 3, tint(c, 0.6)); b.set(x + 2, y + 4, tint(c, 0.4)); }
  };
  const bigHeart = (b, c) => {
    b.map(1, 2, ['..xxx..xxx...', '.xxxxxxxxxxx.', 'xxxxxxxxxxxxx', 'xxxxxxxxxxxxx', 'xxxxxxxxxxxxx', '.xxxxxxxxxxx.', '..xxxxxxxxx..', '...xxxxxxx...', '....xxxxx....', '.....xxx.....', '......x......'], { x: c });
    b.set(3, 4, tint(c, 0.65)); b.set(4, 3, tint(c, 0.65)); b.set(3, 5, tint(c, 0.35));
  };
  // smiley faces: eyes / mouth / extras
  function face(o = {}) {
    return mk((b) => {
      b.ellipse(8, 8, 7, 7, o.base || C.face);
      b.ellipse(8, 9.5, 5.5, 4.5, o.base || C.face);
      b.set(4, 4, C.yellowL); b.set(5, 3, C.yellowL);
      const ink = INK;
      const eyes = o.eyes || 'dot';
      if (eyes === 'dot') { b.rect(5, 6, 1, 2, ink); b.rect(10, 6, 1, 2, ink); }
      else if (eyes === 'happy') { b.set(4, 7, ink); b.set(5, 6, ink); b.set(6, 7, ink); b.set(9, 7, ink); b.set(10, 6, ink); b.set(11, 7, ink); }
      else if (eyes === 'closed') { b.rect(4, 7, 3, 1, ink); b.rect(9, 7, 3, 1, ink); }
      else if (eyes === 'hearts') { for (const x of [3, 9]) { b.map(x, 5, ['x.x', 'xxx', '.x.'].map((r) => r), { x: C.red }); b.set(x + 1, 5, C.red); } b.map(3, 5, ['x.x.', 'xxxx'], { x: C.red }); }
      else if (eyes === 'wink') { b.rect(5, 6, 1, 2, ink); b.set(9, 7, ink); b.set(10, 6, ink); b.set(11, 7, ink); }
      else if (eyes === 'smug') { b.rect(4, 7, 3, 1, ink); b.rect(9, 7, 3, 1, ink); b.set(6, 6, ink); b.set(11, 6, ink); }
      else if (eyes === 'x') { b.set(4, 6, ink); b.set(6, 6, ink); b.set(5, 7, ink); b.set(4, 8, ink); b.set(6, 8, ink); b.set(9, 6, ink); b.set(11, 6, ink); b.set(10, 7, ink); b.set(9, 8, ink); b.set(11, 8, ink); }
      else if (eyes === 'wide') { b.rect(4, 5, 2, 3, C.white); b.rect(10, 5, 2, 3, C.white); b.set(5, 6, ink); b.set(10, 6, ink); }
      else if (eyes === 'shades') { b.rect(3, 6, 4, 2, C.black); b.rect(9, 6, 4, 2, C.black); b.rect(7, 6, 2, 1, C.black); b.set(4, 6, C.greyD); b.set(10, 6, C.greyD); }
      else if (eyes === 'angry') { b.set(4, 5, ink); b.set(5, 6, ink); b.set(11, 5, ink); b.set(10, 6, ink); b.rect(5, 7, 1, 1, ink); b.rect(10, 7, 1, 1, ink); }
      else if (eyes === 'sad') { b.set(4, 6, ink); b.set(5, 5, ink); b.set(11, 6, ink); b.set(10, 5, ink); b.rect(5, 7, 1, 1, ink); b.rect(10, 7, 1, 1, ink); }
      const m = o.mouth || 'smile';
      if (m === 'smile') { b.set(5, 10, ink); b.rect(6, 11, 4, 1, ink); b.set(10, 10, ink); }
      else if (m === 'grin') { b.rect(5, 10, 6, 1, ink); b.rect(5, 11, 6, 1, C.white); b.rect(6, 12, 4, 1, ink); }
      else if (m === 'open') { b.rect(6, 10, 4, 3, C.redD); b.rect(7, 12, 2, 1, C.pink); }
      else if (m === 'flat') b.rect(6, 11, 4, 1, ink);
      else if (m === 'frown') { b.rect(6, 10, 4, 1, ink); b.set(5, 11, ink); b.set(10, 11, ink); }
      else if (m === 'o') b.rect(7, 10, 2, 2, C.redD);
      else if (m === 'smirk') { b.rect(7, 11, 3, 1, ink); b.set(10, 10, ink); }
      else if (m === 'kiss') { b.set(8, 10, ink); b.set(9, 11, ink); b.set(8, 12, ink); }
      else if (m === 'wail') { b.rect(5, 10, 6, 3, C.redD); b.rect(6, 10, 4, 1, C.white); }
      else if (m === 'mask') { b.rect(3, 9, 10, 4, C.white); b.rect(3, 10, 10, 1, '#dde8f0'); }
      if (o.blush) { b.rect(3, 9, 2, 1, C.pink); b.rect(11, 9, 2, 1, C.pink); }
      if (o.tears) { b.rect(4, 8, 1, 6, C.sky); b.rect(11, 8, 1, 6, C.sky); }
      if (o.tear) b.rect(12, 8, 1, 3, C.sky);
      if (o.heart) { b.map(11, 9, ['x.x', 'xxx', '.x.'], { x: C.red }); }
      if (o.horns) { b.poly([[2, 3], [3, 0], [5, 2]], C.purple); b.poly([[11, 2], [13, 0], [14, 3]], C.purple); }
      if (o.puff) { b.rect(12, 9, 3, 2, C.white); b.rect(13, 8, 2, 1, C.white); }
      if (o.sweat) b.rect(12, 3, 2, 3, C.sky);
      if (o.zzz) { b.map(10, 0, ['xxxx', '..x.', '.x..', 'xxxx'], { x: C.blue }); }
    });
  }
  const building = (roof, wall, opts = {}) => mk((b) => {
    b.poly([[1, 7], [8, 1], [15, 7]], roof);
    b.rect(2, 7, 12, 8, wall);
    b.rect(2, 7, 12, 1, shade(wall, 0.15));
    b.rect(7, 10, 3, 5, opts.door || C.brown);
    if (opts.window !== false) { b.rect(3, 9, 3, 2, C.sky); b.rect(11, 9, 2, 2, C.sky); }
    if (opts.extra) opts.extra(b);
  });
  const glass = (liquid, opts = {}) => mk((b) => {
    b.poly([[3, 3], [13, 3], [11, 14], [5, 14]], C.white);
    b.poly([[4, 6], [12, 6], [10.6, 13], [5.4, 13]], liquid);
    b.rect(5, 7, 1, 4, tint(liquid, 0.5));
    if (opts.straw) { b.line(10, 0, 8, 8, C.red); b.line(11, 0, 9, 8, C.red); }
    if (opts.umbrella) { b.poly([[9, 3], [12, 0], [15, 3]], C.pink); b.line(12, 3, 11, 7, C.brown); }
  });
  const fruit = (c, opts = {}) => mk((b) => {
    b.ellipse(8, 9, opts.rx || 6, opts.ry || 6, c);
    b.set(5, 6, tint(c, 0.6)); b.set(6, 5, tint(c, 0.6)); b.set(5, 7, tint(c, 0.35));
    b.rect(8, 1, 1, 3, C.brownD);
    b.poly([[9, 2], [13, 1], [12, 4], [9, 4]], C.leaf);
    if (opts.dots) for (const [x, y] of [[6, 9], [9, 8], [11, 11], [7, 12], [10, 13], [4, 11]]) b.set(x, y, opts.dots);
  });
  const book = (c, opts = {}) => mk((b) => {
    b.rect(3, 1, 10, 14, c);
    b.rect(3, 1, 2, 14, shade(c, 0.25));
    b.rect(12, 2, 1, 12, C.cream);
    b.rect(6, 4, 5, 2, tint(c, 0.55));
    if (opts.open) { b.rect(1, 3, 14, 11, C.cream); b.rect(7, 3, 2, 11, shade(C.cream, 0.15)); for (let y = 5; y < 13; y += 2) { b.rect(2, y, 4, 1, C.grey); b.rect(10, y, 4, 1, C.grey); } }
  });
  const sparkle = (b, x, y, c, r = 2) => { b.rect(x - r, y, r * 2 + 1, 1, c); b.rect(x, y - r, 1, r * 2 + 1, c); };

  // ---------------------------------------------------------- the icons
  const D = {};
  const def = (keys, fn) => { for (const k of keys.split(' ')) D[k] = fn; };

  // hearts & love
  def('❤', mk((b) => bigHeart(b, C.red)));
  def('💙', mk((b) => bigHeart(b, C.blue)));
  def('🧡', mk((b) => bigHeart(b, C.orange)));
  def('💗', mk((b) => { bigHeart(b, C.pink); b.ellipse(8, 7, 2.5, 2, C.pinkL); }));
  def('💖', mk((b) => { bigHeart(b, C.rose); sparkle(b, 12, 3, C.yellowL, 1); sparkle(b, 9, 8, C.white, 1); }));
  def('💕', mk((b) => { heartShape(b, C.pink, -1, 4); heartShape(b, C.rose, 5, -2); }));
  def('💞', mk((b) => { heartShape(b, C.rose, -1, 5); heartShape(b, C.pink, 4, -1); b.line(1, 2, 3, 0, C.pinkL); }));
  def('💌', mk((b) => { b.rect(1, 4, 14, 10, C.white); b.poly([[1, 4], [8, 10], [15, 4]], C.cream); b.line(1, 4, 8, 10, C.grey); b.line(15, 4, 8, 10, C.grey); b.map(6, 7, ['x.x', 'xxx', '.x.'], { x: C.red }); b.set(7, 7, C.red); }));
  def('💋', mk((b) => { b.poly([[1, 8], [5, 4], [8, 6], [11, 4], [15, 8], [11, 12], [5, 12]], C.red); b.rect(2, 8, 12, 1, C.redD); b.set(5, 6, C.pink); b.set(10, 6, C.pink); }));
  def('💑', mk((b) => { b.ellipse(5, 5, 3, 3, C.skin); b.ellipse(5, 3.5, 3.3, 2.2, C.greyD); b.poly([[1, 15], [2, 9], [8, 9], [8, 15]], C.blue); b.ellipse(11, 5, 3, 3, C.skin); b.ellipse(11, 3.5, 3.3, 2.2, C.orange); b.rect(13, 3, 2, 6, C.orange); b.poly([[8, 15], [9, 9], [14, 9], [15, 15]], C.pink); b.map(6, 0, ['x.x', 'xxx', '.x.'], { x: C.red }); }));
  def('😍', face({ eyes: 'hearts', mouth: 'grin' }));
  def('🥰', face({ eyes: 'happy', mouth: 'smile', blush: true, heart: true }));
  def('😘', face({ eyes: 'wink', mouth: 'kiss', heart: true }));

  // faces
  def('😊', face({ eyes: 'happy', mouth: 'smile', blush: true }));
  def('🙂', face({ eyes: 'dot', mouth: 'smile' }));
  def('😆', face({ eyes: 'x', mouth: 'open' }));
  def('😂', face({ eyes: 'happy', mouth: 'grin', tears: true }));
  def('🤣', face({ eyes: 'closed', mouth: 'wail', tears: true }));
  def('😉', face({ eyes: 'wink', mouth: 'smile' }));
  def('😏', face({ eyes: 'smug', mouth: 'smirk' }));
  def('😎', face({ eyes: 'shades', mouth: 'smile' }));
  def('😴', face({ eyes: 'closed', mouth: 'o', zzz: true }));
  def('😭', face({ eyes: 'closed', mouth: 'wail', tears: true }));
  def('😢', face({ eyes: 'sad', mouth: 'frown', tear: true }));
  def('😟', face({ eyes: 'sad', mouth: 'frown' }));
  def('😳', face({ eyes: 'wide', mouth: 'o', blush: true }));
  def('😤', face({ eyes: 'angry', mouth: 'flat', puff: true }));
  def('😡', face({ base: '#f07050', eyes: 'angry', mouth: 'frown' }));
  def('😷', face({ eyes: 'dot', mouth: 'mask' }));
  def('😈', face({ base: '#a070e0', eyes: 'angry', mouth: 'grin', horns: true }));
  def('💀', mk((b) => { b.ellipse(8, 7, 6, 6, C.white); b.rect(5, 11, 6, 4, C.white); b.rect(4, 6, 3, 3, INK); b.rect(9, 6, 3, 3, INK); b.set(8, 10, INK); b.rect(6, 13, 1, 2, C.grey); b.rect(9, 13, 1, 2, C.grey); }));

  // people & gestures
  const person = (hair, top, opts = {}) => mk((b) => {
    b.ellipse(8, 5, 4, 4, C.skin);
    b.ellipse(8, 3.5, 4.4, 3, hair);
    if (opts.long) { b.rect(4, 3, 2, 7, hair); b.rect(10, 3, 2, 7, hair); }
    b.poly([[3, 15], [4, 10], [12, 10], [13, 15]], top);
    if (opts.skirt) b.poly([[3, 15], [4, 12], [12, 12], [13, 15]], opts.skirt);
    if (opts.extra) opts.extra(b);
  });
  def('👤', mk((b) => { b.ellipse(8, 5, 4, 4, C.grey); b.poly([[2, 15], [4, 10], [12, 10], [14, 15]], C.grey); b.set(6, 3, tint(C.grey, 0.5)); }));
  def('👭', mk((b) => { b.ellipse(5, 5, 3, 3, C.skin); b.ellipse(5, 4, 3.3, 2.4, C.orange); b.rect(2, 9, 6, 6, C.pink); b.ellipse(11, 5, 3, 3, C.skin); b.ellipse(11, 4, 3.3, 2.4, C.brownD); b.rect(8, 9, 6, 6, C.sky); b.rect(7, 11, 2, 1, C.skin); }));
  def('🚶', person(C.greyD, C.blue, { extra: (b) => { b.rect(5, 15, 2, 1, INK); b.rect(10, 15, 2, 1, INK); } }));
  def('🏃‍♀', mk((b) => { b.ellipse(9, 3.5, 3, 3, C.skin); b.ellipse(9, 2.5, 3.3, 2.2, C.pink); b.rect(11, 2, 3, 2, C.pink); b.poly([[6, 7], [11, 7], [10, 11], [6, 11]], C.red); b.line(6, 11, 3, 14, C.navy); b.line(9, 11, 12, 14, C.navy); b.line(6, 8, 3, 10, C.skin); b.line(10, 8, 13, 6, C.skin); }));
  def('🙇‍♀', mk((b) => { b.ellipse(6, 8, 3.5, 3, C.brownD); b.rect(3, 6, 7, 2, C.brownD); b.poly([[8, 6], [14, 9], [14, 15], [8, 15]], C.pink); b.rect(2, 13, 12, 2, C.pinkL); }));
  def('💇', mk((b) => { b.ellipse(8, 7, 5, 5, C.skin); b.poly([[2, 7], [4, 1], [12, 1], [14, 7], [13, 14], [11, 6], [5, 6], [3, 14]], C.rose); b.rect(6, 7, 1, 1, INK); b.rect(9, 7, 1, 1, INK); b.line(12, 9, 15, 6, C.grey); b.line(12, 6, 15, 9, C.grey); }));
  def('💃', mk((b) => { b.ellipse(9, 3, 2.5, 2.5, C.skin); b.ellipse(9, 2, 2.8, 2, C.black); b.poly([[7, 6], [11, 6], [13, 15], [4, 15]], C.red); b.poly([[4, 15], [6, 11], [8, 15]], C.redD); b.line(7, 7, 3, 4, C.skin); b.line(11, 7, 14, 9, C.skin); }));
  def('🤚', mk((b) => { b.rect(4, 6, 8, 8, C.skin); for (let i = 0; i < 4; i++) b.rect(4 + i * 2, 1 + (i === 0 || i === 3 ? 2 : 0), 2, 6, C.skin); b.poly([[12, 9], [15, 6], [15, 8], [12, 12]], C.skin); b.rect(5, 12, 6, 1, shade(C.skin, 0.12)); }));
  def('👋', mk((b) => { b.rect(4, 6, 8, 8, C.skin); for (let i = 0; i < 4; i++) b.rect(4 + i * 2, 1 + (i === 0 || i === 3 ? 2 : 0), 2, 6, C.skin); b.poly([[12, 9], [15, 6], [15, 8], [12, 12]], C.skin); b.line(1, 4, 2, 2, C.yellow); b.line(1, 8, 2, 7, C.yellow); }));
  def('👊', mk((b) => { b.rect(3, 4, 10, 9, C.skin); for (let i = 0; i < 4; i++) b.rect(3, 4 + i * 2, 10, 1, shade(C.skin, 0.1)); b.rect(2, 9, 3, 4, C.skin); b.rect(4, 13, 8, 2, shade(C.skin, 0.15)); }));
  def('🤝', mk((b) => { b.poly([[0, 6], [5, 4], [10, 6], [8, 10], [3, 10]], C.skin); b.poly([[16, 7], [11, 5], [6, 8], [8, 12], [13, 11]], C.tan); b.rect(0, 7, 2, 4, C.blue); b.rect(14, 8, 2, 4, C.red); }));
  def('🤗', face({ eyes: 'happy', mouth: 'smile', blush: true }));
  def('💪', mk((b) => { b.poly([[2, 14], [3, 8], [6, 4], [9, 2], [11, 4], [9, 6], [9, 9], [13, 9], [14, 12], [11, 15], [3, 15]], C.skin); b.ellipse(10, 11, 3, 2.5, shade(C.skin, 0.1)); b.line(7, 3, 9, 2, tint(C.skin, 0.5)); }));
  def('🎨', mk((b) => { b.ellipse(8, 8, 7, 6, C.tan); b.ellipse(10, 11, 1.6, 1.4, null); b.set(10, 11, null); b.rect(4, 5, 2, 2, C.red); b.rect(8, 3, 2, 2, C.blue); b.rect(12, 6, 2, 2, C.green); b.rect(4, 9, 2, 2, C.yellow); }));

  // weather & nature
  def('☀', mk((b) => { b.ellipse(8, 8, 4, 4, C.yellow); for (const [x, y] of [[8, 1], [8, 14], [1, 8], [14, 8], [3, 3], [13, 3], [3, 13], [13, 13]]) b.rect(x - 0.5, y - 0.5, 2, 2, C.orange); b.set(6, 6, C.yellowL); }));
  def('☁', mk((b) => { b.ellipse(5, 10, 4, 3.5, C.white); b.ellipse(10, 8, 5, 4.5, C.white); b.rect(3, 10, 11, 4, C.white); b.rect(3, 13, 11, 1, '#dde4f0'); }));
  def('🌤', mk((b) => { b.ellipse(10, 6, 4, 4, C.yellow); b.rect(9, 0, 2, 2, C.orange); b.rect(14, 5, 2, 2, C.orange); b.ellipse(5, 11, 4, 3, C.white); b.ellipse(9, 11, 4, 3.5, C.white); b.rect(2, 12, 11, 2, C.white); }));
  def('🌧', mk((b) => { b.ellipse(5, 6, 4, 3.5, '#dde4f0'); b.ellipse(10, 5, 5, 4, '#dde4f0'); b.rect(3, 6, 11, 3, '#dde4f0'); for (const x of [4, 8, 12]) b.line(x, 11, x - 1, 14, C.blue); }));
  def('⛈', mk((b) => { b.ellipse(5, 5, 4, 3.5, C.grey); b.ellipse(10, 4, 5, 4, C.grey); b.rect(3, 5, 11, 3, C.grey); b.poly([[8, 8], [11, 8], [9, 11], [11, 11], [6, 16], [8, 12], [6, 12]], C.yellow); }));
  def('🌙', mk((b) => { b.ellipse(8, 8, 6, 6, C.yellow); b.ellipse(11, 6, 5, 5.5, null); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = x + 0.5 - 11, dy = y + 0.5 - 6; if (dx * dx / 25 + dy * dy / 30 <= 1) b.d[y * S + x] = null; } b.set(4, 6, C.yellowL); }));
  def('✨', mk((b) => { b.poly([[6, 1], [7.5, 6], [12, 7.5], [7.5, 9], [6, 14], [4.5, 9], [0, 7.5], [4.5, 6]], C.yellow); b.poly([[12.5, 1], [13.3, 3], [15, 3.8], [13.3, 4.6], [12.5, 7], [11.7, 4.6], [10, 3.8], [11.7, 3]], C.yellowL); sparkle(b, 12, 12, C.yellowL, 1); }));
  def('⭐', mk((b) => { b.poly([[8, 0], [10, 5.5], [15.5, 5.5], [11, 9], [13, 15], [8, 11.5], [3, 15], [5, 9], [0.5, 5.5], [6, 5.5]], C.yellow); b.set(7, 4, C.yellowL); b.set(6, 6, C.yellowL); }));
  def('⚡', mk((b) => { b.poly([[9, 0], [3, 9], [8, 9], [6, 16], [13, 6], [8, 6], [11, 0]], C.yellow); b.line(9, 1, 5, 8, C.yellowL); }));
  def('💧', mk((b) => { b.poly([[8, 1], [12, 8], [12.5, 11], [10, 14.5], [6, 14.5], [3.5, 11], [4, 8]], C.sky); b.ellipse(8, 11, 4.5, 3.8, C.sky); b.rect(5, 9, 1, 3, C.white); b.rect(6, 12, 1, 1, tint(C.sky, 0.5)); }));
  def('💨', mk((b) => { b.rect(1, 5, 9, 2, C.white); b.rect(3, 9, 11, 2, C.white); b.rect(1, 13, 6, 1, C.white); b.ellipse(11, 4, 2.5, 2.5, C.white); b.ellipse(14, 9, 1.5, 2, C.white); }));
  def('🌸', mk((b) => { for (const [x, y] of [[8, 3], [13, 7], [11, 13], [5, 13], [3, 7]]) b.ellipse(x, y, 3.2, 3.2, C.pink); b.ellipse(8, 8.5, 2.5, 2.5, C.pinkL); b.rect(7, 8, 2, 1, C.rose); }));
  def('🌼', mk((b) => { for (const [x, y] of [[8, 3], [13, 7], [11, 13], [5, 13], [3, 7]]) b.ellipse(x, y, 3, 3, C.white); b.ellipse(8, 8.5, 2.8, 2.8, C.yellow); }));
  def('🌷', mk((b) => { b.rect(7, 9, 2, 7, C.greenD); b.poly([[9, 12], [14, 8], [13, 12]], C.leaf); b.poly([[3, 2], [5, 4], [8, 1], [11, 4], [13, 2], [13, 7], [8, 10], [3, 7]], C.rose); b.set(6, 5, C.pinkL); }));
  def('🌹', mk((b) => { b.rect(7, 9, 2, 7, C.greenD); b.poly([[2, 11], [7, 10], [5, 13]], C.leaf); b.ellipse(8, 5.5, 5, 4.5, C.red); b.line(6, 4, 10, 4, C.redD); b.line(5, 6, 9, 7, C.redD); b.set(8, 3, C.pink); }));
  def('💐', mk((b) => { b.poly([[5, 9], [11, 9], [9, 15], [7, 15]], C.lilac); b.ellipse(5, 5, 3, 3, C.pink); b.ellipse(11, 5, 3, 3, C.yellow); b.ellipse(8, 3, 3, 3, C.red); b.ellipse(8, 8, 2.5, 2.5, C.white); b.rect(7, 11, 2, 1, C.purple); }));
  def('🌿', mk((b) => { b.line(3, 15, 12, 1, C.greenD); for (const [x, y, d] of [[5, 11, -1], [7, 8, 1], [9, 5, -1], [10, 3, 1], [6, 12, 1], [8, 9, -1]]) b.ellipse(x + d * 2.5, y, 2.2, 1.4, C.leaf); }));
  def('🌲', mk((b) => { b.poly([[8, 0], [13, 6], [10, 6], [14, 11], [2, 11], [6, 6], [3, 6]], C.greenD); b.rect(7, 11, 2, 4, C.brown); b.set(7, 3, C.leaf); b.set(6, 8, C.leaf); }));
  def('🕊', mk((b) => { b.ellipse(8, 9, 5, 3, C.white); b.poly([[6, 8], [4, 1], [10, 6]], C.white); b.ellipse(13, 7, 2, 2, C.white); b.poly([[14.5, 7], [16, 7.5], [14.5, 8.2]], C.orange); b.poly([[2, 9], [0, 12], [4, 11]], C.white); b.set(13, 6, INK); }));
  def('🐱', mk((b) => { b.poly([[2, 2], [6, 5], [10, 5], [14, 2], [14, 9], [2, 9]], C.orange); b.ellipse(8, 10, 6, 5, C.orange); b.rect(5, 8, 1, 2, INK); b.rect(10, 8, 1, 2, INK); b.set(8, 11, C.pink); b.line(1, 11, 4, 11, C.white); b.line(12, 11, 15, 11, C.white); b.set(3, 4, C.pink); b.set(12, 4, C.pink); }));
  def('🦇', mk((b) => { b.ellipse(8, 8, 2.5, 3.5, C.black); b.poly([[6, 7], [0, 3], [1, 7], [0, 11], [3, 10], [5, 12], [6, 10]], C.black); b.poly([[10, 7], [16, 3], [15, 7], [16, 11], [13, 10], [11, 12], [10, 10]], C.black); b.set(7, 6, C.red); b.set(9, 6, C.red); b.set(6, 4, C.black); b.set(10, 4, C.black); }));
  def('🦖', mk((b) => { b.ellipse(7, 10, 5, 3.5, C.green); b.rect(9, 3, 4, 7, C.green); b.ellipse(12, 3, 3.5, 2.5, C.green); b.poly([[2, 10], [0, 14], [5, 12]], C.green); b.rect(4, 13, 2, 3, C.greenD); b.rect(8, 13, 2, 3, C.greenD); b.set(13, 2, INK); b.rect(13, 4, 3, 1, C.white); }));

  // food & drink
  def('🍊', fruit(C.orange));
  def('🍒', mk((b) => { b.line(5, 9, 9, 2, C.greenD); b.line(11, 10, 9, 2, C.greenD); b.poly([[9, 2], [13, 0], [13, 3]], C.leaf); b.ellipse(5, 11, 3.5, 3.5, C.red); b.ellipse(11, 12, 3.5, 3.5, C.red); b.set(4, 10, C.pinkL); b.set(10, 11, C.pinkL); }));
  def('🍋', mk((b) => { b.ellipse(8, 8, 7, 5, C.yellow); b.rect(0, 7, 2, 2, C.yellow); b.rect(14, 7, 2, 2, C.yellow); b.set(5, 6, C.yellowL); b.set(6, 5, C.yellowL); b.poly([[9, 3], [13, 1], [12, 4]], C.leaf); }));
  def('🍓', mk((b) => { b.poly([[2, 5], [14, 5], [12, 11], [8, 15], [4, 11]], C.red); b.poly([[4, 5], [8, 2], [12, 5], [10, 6], [8, 4], [6, 6]], C.green); for (const [x, y] of [[5, 7], [9, 7], [7, 10], [11, 9], [9, 12], [5, 10]]) b.set(x, y, C.yellowL); }));
  def('🍇', mk((b) => { for (const [x, y] of [[5, 6], [9, 6], [13, 6], [7, 9], [11, 9], [9, 12], [5, 10]]) b.ellipse(x, y, 2.4, 2.4, C.purple); b.line(9, 0, 9, 4, C.brownD); b.poly([[9, 2], [14, 0], [13, 3]], C.leaf); b.set(4, 5, C.lilac); b.set(8, 5, C.lilac); }));
  def('🍅', fruit(C.red));
  def('🍔', mk((b) => { b.ellipse(8, 5, 7, 4, C.orange); b.rect(1, 5, 14, 2, C.orange); b.rect(1, 7, 14, 1, C.green); b.rect(1, 8, 14, 2, C.brownD); b.rect(2, 10, 12, 1, C.yellow); b.rect(1, 11, 14, 3, C.orange); for (const x of [4, 7, 10]) b.set(x, 3, C.cream); }));
  def('🍗', mk((b) => { b.ellipse(6, 7, 5.5, 5, C.orange); b.ellipse(6, 7, 4, 3.5, '#d88a3a'); b.line(10, 11, 14, 15, C.cream); b.line(10, 10, 13, 14, C.cream); b.rect(13, 13, 3, 2, C.white); b.set(4, 5, C.yellowL); }));
  def('🍣', mk((b) => { b.rect(2, 8, 12, 5, C.white); b.rect(2, 12, 12, 1, '#dde4f0'); b.poly([[1, 8], [3, 4], [13, 4], [15, 8]], C.orange); for (const x of [4, 7, 10]) b.line(x, 5, x + 2, 7, C.pinkL); b.rect(7, 4, 2, 9, C.black); }));
  def('🍙', mk((b) => { b.poly([[8, 1], [15, 13], [1, 13]], C.white); b.rect(1, 12, 14, 2, C.white); b.rect(5, 9, 6, 5, C.black); b.set(6, 5, '#eef2f8'); }));
  def('🍞', mk((b) => { b.ellipse(8, 6, 7, 4, C.tan); b.rect(1, 6, 14, 8, C.tan); b.rect(2, 7, 12, 6, C.cream); b.rect(1, 13, 14, 1, C.brown); }));
  def('🧁', mk((b) => { b.poly([[3, 9], [13, 9], [11, 15], [5, 15]], C.sky); for (const x of [5, 8, 11]) b.line(x, 10, x, 14, tint(C.sky, 0.4)); b.ellipse(8, 7, 6, 3.5, C.pinkL); b.ellipse(8, 5, 4, 2.5, C.pinkL); b.ellipse(8, 2.5, 1.6, 1.6, C.red); }));
  def('🍰', mk((b) => { b.poly([[1, 8], [14, 4], [14, 13], [1, 14]], C.cream); b.poly([[1, 8], [14, 4], [14, 6], [1, 10]], C.white); b.rect(1, 11, 13, 1, C.pink); b.ellipse(10, 3, 2, 2, C.red); }));
  def('🎂', mk((b) => { b.rect(2, 8, 12, 7, C.pinkL); b.rect(2, 8, 12, 2, C.white); b.rect(2, 12, 12, 1, C.rose); for (const x of [5, 8, 11]) { b.rect(x, 4, 1, 4, C.sky); b.set(x, 2, C.orange); b.set(x, 3, C.yellow); } }));
  def('🍫', mk((b) => { b.rect(3, 1, 10, 14, C.brownD); for (let y = 1; y < 15; y += 4) b.rect(3, y, 10, 1, shade(C.brownD, 0.3)); b.rect(8, 1, 1, 14, shade(C.brownD, 0.3)); b.poly([[3, 9], [13, 6], [13, 15], [3, 15]], C.red); b.rect(5, 11, 6, 2, C.gold); }));
  def('🍯', mk((b) => { b.rect(3, 5, 10, 10, C.gold); b.rect(4, 3, 8, 2, C.brown); b.rect(3, 8, 10, 3, C.cream); b.rect(5, 9, 6, 1, C.brown); b.poly([[5, 5], [8, 5], [7, 8]], C.yellow); b.set(4, 12, C.yellowL); }));
  def('🍳', mk((b) => { b.ellipse(7, 8, 6, 6, C.greyD); b.rect(12, 7, 4, 2, C.black); b.ellipse(7, 8, 4, 3.5, C.white); b.ellipse(7, 8, 1.8, 1.8, C.yellow); }));
  def('🍽', mk((b) => { b.ellipse(8, 9, 6, 5, C.white); b.ellipse(8, 9, 4, 3.3, '#e8eef8'); b.rect(0, 2, 1, 13, C.grey); b.rect(15, 2, 1, 13, C.grey); b.rect(0, 2, 1, 4, C.greyD); }));
  def('☕', mk((b) => { b.rect(2, 6, 10, 8, C.white); b.rect(3, 6, 8, 2, C.brownD); b.ellipse(13, 9, 2.5, 2.5, C.white); b.set(13, 9, null); b.rect(1, 14, 12, 1, C.grey); b.line(5, 1, 6, 4, C.grey); b.line(8, 0, 9, 4, C.grey); }));
  def('🍹', glass(C.orange, { straw: true, umbrella: true }));
  def('🥤', mk((b) => { b.poly([[3, 4], [13, 4], [11, 15], [5, 15]], C.red); b.rect(2, 3, 12, 2, C.white); b.rect(9, 0, 2, 4, C.white); b.rect(5, 8, 6, 3, C.white); b.rect(6, 9, 4, 1, C.red); }));
  def('🥛', mk((b) => { b.poly([[4, 2], [12, 2], [11, 15], [5, 15]], C.white); b.rect(5, 2, 6, 2, '#e8eef8'); b.rect(6, 6, 1, 6, '#e8eef8'); }));
  def('🍷', mk((b) => { b.poly([[3, 1], [13, 1], [12, 6], [8, 9], [4, 6]], C.white); b.poly([[4, 4], [12, 4], [11.5, 6], [8, 8], [4.5, 6]], C.redD); b.rect(7, 9, 2, 5, C.white); b.rect(4, 14, 8, 1, C.white); }));
  def('🍀', mk((b) => { for (const [x, y] of [[5, 5], [11, 5], [5, 10], [11, 10]]) b.ellipse(x, y, 3, 3, C.green); b.line(8, 8, 12, 15, C.greenD); }));

  // places & buildings
  def('🏠', building(C.red, C.cream));
  def('🏚', building(C.brownD, '#c8b090', { door: C.black, extra: (b) => { b.line(3, 12, 6, 9, C.brownD); b.set(12, 13, C.brownD); b.set(5, 3, null); } }));
  def('🏙', mk((b) => { b.rect(1, 6, 4, 9, C.blueD); b.rect(5, 2, 5, 13, C.navy); b.rect(10, 5, 5, 10, C.blueD); for (let y = 4; y < 14; y += 2) { b.set(6, y, C.yellowL); b.set(8, y, C.yellowL); } for (let y = 8; y < 14; y += 2) { b.set(2, y, C.yellow); b.set(12, y + 1, C.yellow); } }));
  def('🌆', mk((b) => { b.rect(0, 0, 16, 9, C.orange); b.rect(0, 9, 16, 7, C.purple); b.ellipse(8, 9, 3, 3, C.yellow); b.rect(1, 7, 3, 9, C.navy); b.rect(5, 4, 3, 12, C.navy); b.rect(11, 6, 4, 10, C.navy); b.set(6, 6, C.yellowL); b.set(12, 8, C.yellowL); }, { outline: true }));
  def('🗼', mk((b) => { b.poly([[8, 0], [10, 8], [13, 15], [10, 15], [8, 11], [6, 15], [3, 15], [6, 8]], C.red); b.rect(5, 8, 6, 1, C.white); b.rect(4, 12, 8, 1, C.white); }));
  def('⛩', mk((b) => { b.rect(0, 2, 16, 2, C.red); b.rect(1, 1, 14, 1, C.black); b.rect(2, 6, 12, 1, C.red); b.rect(3, 4, 2, 12, C.red); b.rect(11, 4, 2, 12, C.red); b.rect(7, 4, 2, 2, C.red); }));
  def('⛲', mk((b) => { b.ellipse(8, 13, 7, 2.5, C.grey); b.rect(1, 12, 14, 2, C.sky); b.rect(7, 5, 2, 7, C.grey); b.ellipse(8, 5, 4, 1.5, C.grey); b.line(4, 2, 2, 10, C.sky); b.line(12, 2, 14, 10, C.sky); b.rect(7, 0, 2, 4, C.sky); }));
  def('🏖', mk((b) => { b.rect(0, 10, 16, 6, C.tan); b.rect(0, 8, 16, 2, C.sky); b.line(4, 15, 9, 4, C.brownD); b.poly([[2, 6], [9, 2], [15, 6]], C.red); b.poly([[6, 4], [9, 2], [11, 4]], C.white); }));
  def('🚉', mk((b) => { b.rect(2, 2, 12, 10, C.blue); b.rect(3, 3, 10, 4, C.sky); b.rect(7, 3, 2, 4, C.blue); b.rect(4, 9, 2, 2, C.yellow); b.rect(10, 9, 2, 2, C.yellow); b.rect(1, 13, 14, 1, C.greyD); b.rect(4, 12, 2, 2, C.black); b.rect(10, 12, 2, 2, C.black); }));
  def('🚆', mk((b) => { b.ellipse(8, 7, 6, 6, C.white); b.rect(2, 7, 12, 6, C.white); b.rect(4, 3, 8, 4, C.sky); b.rect(2, 9, 12, 1, C.red); b.rect(4, 11, 2, 1, C.yellow); b.rect(10, 11, 2, 1, C.yellow); b.line(3, 15, 5, 13, C.greyD); b.line(13, 15, 11, 13, C.greyD); }));
  def('🎰', mk((b) => { b.rect(1, 2, 12, 13, C.red); b.rect(2, 4, 10, 5, C.white); for (const x of [3, 6, 9]) b.rect(x, 5, 2, 3, x === 6 ? C.red : C.orange); b.rect(3, 11, 8, 2, C.gold); b.rect(13, 3, 1, 6, C.grey); b.ellipse(14, 3, 1.5, 1.5, C.redD); b.rect(1, 1, 12, 1, C.gold); }));

  // things
  def('📱', mk((b) => { b.rect(4, 0, 8, 16, C.black); b.rect(5, 2, 6, 11, C.sky); b.rect(7, 14, 2, 1, C.grey); b.rect(6, 3, 2, 1, C.white); }));
  def('📺', mk((b) => { b.rect(1, 3, 14, 10, C.greyD); b.rect(2, 4, 12, 8, C.sky); b.rect(3, 5, 4, 2, C.white); b.line(5, 0, 7, 3, C.grey); b.line(11, 0, 9, 3, C.grey); b.rect(4, 13, 2, 2, C.black); b.rect(10, 13, 2, 2, C.black); }));
  def('💻', mk((b) => { b.rect(3, 2, 10, 8, C.greyD); b.rect(4, 3, 8, 6, C.sky); b.poly([[1, 11], [15, 11], [16, 14], [0, 14]], C.grey); b.rect(6, 12, 4, 1, C.greyD); }));
  def('🎮', mk((b) => { b.poly([[2, 5], [14, 5], [16, 12], [13, 14], [10, 11], [6, 11], [3, 14], [0, 12]], C.greyD); b.rect(3, 7, 3, 1, C.white); b.rect(4, 6, 1, 3, C.white); b.set(11, 7, C.red); b.set(13, 8, C.blue); b.set(12, 9, C.green); b.set(10, 8, C.yellow); }));
  def('🕹', mk((b) => { b.rect(1, 10, 14, 5, C.red); b.rect(1, 10, 14, 1, C.pink); b.rect(7, 3, 2, 7, C.greyD); b.ellipse(8, 3, 3, 3, C.red); b.set(7, 2, C.pinkL); b.rect(11, 12, 2, 1, C.yellow); }));
  def('🎲', mk((b) => { b.rect(2, 2, 12, 12, C.white); b.rect(2, 12, 12, 2, '#dde4f0'); for (const [x, y] of [[4, 4], [11, 4], [7, 7], [4, 10], [11, 10]]) b.rect(x, y, 2, 2, C.red); }));
  def('🃏', mk((b) => { b.rect(3, 1, 10, 14, C.white); b.rect(3, 1, 10, 1, C.lilac); b.poly([[5, 9], [8, 4], [11, 9]], C.red); b.poly([[6, 9], [10, 9], [8, 13]], C.blue); b.set(4, 2, C.red); b.set(11, 13, C.red); }));
  def('🂡', mk((b) => { b.rect(3, 1, 10, 14, C.white); b.poly([[8, 4], [12, 9], [8, 11], [4, 9]], C.black); b.rect(7, 10, 2, 3, C.black); b.set(4, 2, C.black); }));
  def('🎴', mk((b) => { b.rect(4, 1, 10, 14, C.red); b.rect(2, 2, 10, 13, C.white); b.ellipse(7, 7, 3, 3, C.red); b.rect(3, 12, 8, 2, C.greenD); }));
  def('🎁', mk((b) => { b.rect(1, 6, 14, 9, C.red); b.rect(0, 4, 16, 3, C.redD); b.rect(7, 4, 2, 11, C.yellow); b.poly([[8, 4], [3, 0], [3, 4]], C.yellow); b.poly([[8, 4], [13, 0], [13, 4]], C.yellow); }));
  def('🎀', mk((b) => { b.poly([[8, 7], [1, 2], [1, 12]], C.rose); b.poly([[8, 7], [15, 2], [15, 12]], C.rose); b.ellipse(8, 7, 2, 2, C.red); b.line(7, 9, 4, 15, C.rose); b.line(9, 9, 12, 15, C.rose); b.set(3, 5, C.pinkL); }));
  def('🎉', mk((b) => { b.poly([[1, 15], [5, 3], [13, 11]], C.yellow); b.line(3, 11, 7, 13, C.red); b.line(4, 7, 10, 12, C.blue); for (const [x, y, c] of [[9, 1, C.red], [13, 3, C.green], [15, 7, C.blue], [11, 5, C.pink], [14, 0, C.yellow]]) b.rect(x, y, 1, 2, c); }));
  def('🎭', mk((b) => { b.ellipse(6, 7, 5, 6, C.white); b.rect(3, 5, 2, 2, INK); b.rect(7, 5, 2, 2, INK); b.rect(4, 10, 4, 1, INK); b.ellipse(11, 9, 4, 5, C.purple); b.rect(9, 8, 2, 1, INK); b.rect(12, 8, 2, 1, INK); b.rect(10, 12, 3, 1, INK); }));
  def('📸', mk((b) => { b.rect(1, 4, 14, 10, C.greyD); b.rect(4, 2, 5, 2, C.greyD); b.ellipse(8, 9, 3.5, 3.5, C.black); b.ellipse(8, 9, 2, 2, C.sky); b.rect(12, 5, 2, 1, C.yellow); sparkle(b, 13, 1, C.yellowL, 1); }));
  def('📍', mk((b) => { b.ellipse(8, 5, 5, 5, C.red); b.poly([[4, 7], [12, 7], [8, 15]], C.red); b.ellipse(8, 5, 2, 2, C.white); }));
  def('🗺', mk((b) => { b.poly([[0, 3], [5, 1], [11, 3], [16, 1], [16, 13], [11, 15], [5, 13], [0, 15]], C.cream); b.rect(5, 1, 1, 12, C.tan); b.rect(10, 3, 1, 12, C.tan); b.ellipse(8, 8, 3, 2.5, C.green); b.rect(2, 10, 3, 2, C.sky); b.set(13, 6, C.red); }));
  def('📖', book(C.blue, { open: true }));
  def('📗', book(C.green));
  def('📕', book(C.red));
  def('📚', mk((b) => { b.rect(1, 11, 14, 4, C.red); b.rect(2, 7, 12, 4, C.blue); b.rect(1, 3, 13, 4, C.green); for (const [y, c] of [[12, C.yellow], [8, C.white], [4, C.yellow]]) b.rect(11, y, 2, 2, c); }));
  def('🧾', mk((b) => { b.poly([[3, 1], [13, 1], [13, 15], [11, 13], [9, 15], [7, 13], [5, 15], [3, 13]], C.white); for (let y = 3; y < 12; y += 2) b.rect(5, y, y === 9 ? 4 : 6, 1, C.grey); }));
  def('📥', mk((b) => { b.poly([[1, 9], [5, 9], [6, 11], [10, 11], [11, 9], [15, 9], [15, 15], [1, 15]], C.blue); b.rect(7, 1, 2, 6, C.green); b.poly([[4, 6], [12, 6], [8, 10]], C.green); }));
  def('📂', mk((b) => { b.rect(1, 3, 6, 2, C.gold); b.rect(1, 5, 14, 10, C.gold); b.poly([[3, 8], [16, 8], [14, 15], [1, 15]], C.yellow); }));
  def('💾', mk((b) => { b.rect(1, 1, 14, 14, C.blue); b.rect(4, 1, 8, 5, C.grey); b.rect(9, 2, 2, 3, C.blueD); b.rect(3, 9, 10, 6, C.white); b.rect(4, 11, 8, 1, C.grey); }));
  def('📅', mk((b) => { b.rect(1, 3, 14, 12, C.white); b.rect(1, 3, 14, 4, C.red); b.rect(4, 1, 2, 4, C.greyD); b.rect(10, 1, 2, 4, C.greyD); for (let y = 9; y < 14; y += 2) for (let x = 3; x < 13; x += 3) b.rect(x, y, 2, 1, C.grey); }));
  def('📊', mk((b) => { b.rect(1, 1, 14, 14, C.white); b.rect(3, 9, 2, 5, C.blue); b.rect(7, 5, 2, 9, C.green); b.rect(11, 7, 2, 7, C.red); b.rect(2, 14, 12, 1, C.greyD); }));
  def('💼', mk((b) => { b.rect(1, 5, 14, 10, C.brown); b.rect(5, 2, 6, 3, C.brownD); b.rect(6, 3, 4, 2, null); b.rect(1, 9, 14, 1, C.brownD); b.rect(7, 8, 2, 3, C.gold); }));
  def('💡', mk((b) => { b.ellipse(8, 6, 5, 5, C.yellow); b.rect(6, 10, 4, 2, C.yellow); b.rect(6, 12, 4, 3, C.grey); b.rect(6, 13, 4, 1, C.greyD); b.rect(6, 4, 2, 2, C.yellowL); }));
  def('🔔', mk((b) => { b.poly([[8, 1], [12, 5], [13, 11], [15, 13], [1, 13], [3, 11], [4, 5]], C.gold); b.ellipse(8, 14, 2, 1.5, C.brown); b.rect(5, 5, 1, 5, C.yellowL); }));
  def('🔊', mk((b) => { b.rect(1, 5, 4, 6, C.grey); b.poly([[5, 5], [10, 1], [10, 15], [5, 11]], C.grey); b.line(12, 5, 13, 8, C.sky); b.line(13, 8, 12, 11, C.sky); b.line(14, 3, 15, 8, C.sky); b.line(15, 8, 14, 13, C.sky); }));
  def('🔇', mk((b) => { b.rect(1, 5, 4, 6, C.grey); b.poly([[5, 5], [10, 1], [10, 15], [5, 11]], C.grey); b.line(11, 5, 15, 11, C.red); b.line(15, 5, 11, 11, C.red); }));
  def('⚙', mk((b) => { b.ellipse(8, 8, 5.5, 5.5, C.grey); for (const [x, y] of [[7, 0], [7, 13], [0, 7], [13, 7], [2, 2], [12, 2], [2, 12], [12, 12]]) b.rect(x, y, 3, 3, C.grey); b.ellipse(8, 8, 2, 2, C.greyD); b.set(5, 5, C.white); }));
  def('⚠', mk((b) => { b.poly([[8, 0], [16, 15], [0, 15]], C.yellow); b.rect(7, 5, 2, 6, INK); b.rect(7, 12, 2, 2, INK); }));
  def('❓', mk((b) => { b.map(3, 1, ['..xxxxx..', '.xxxxxxx.', 'xxx...xxx', 'xx....xxx', '.....xxx.', '....xxx..', '...xxx...', '...xxx...', '.........', '...xxx...', '...xxx...'], { x: C.red }); }));
  def('🗑', mk((b) => { b.rect(3, 4, 10, 11, C.grey); b.rect(2, 2, 12, 2, C.greyD); b.rect(6, 0, 4, 2, C.greyD); for (const x of [5, 8, 11]) b.rect(x, 6, 1, 7, C.greyD); }));
  def('✏', mk((b) => { b.line(2, 14, 12, 4, C.yellow); b.line(3, 14, 13, 4, C.yellow); b.line(3, 13, 12, 4, C.gold); b.poly([[1, 15], [2, 12], [4, 14]], C.tan); b.rect(12, 2, 3, 3, C.pink); }));
  def('🪙', mk((b) => { b.ellipse(8, 8, 7, 7, C.gold); b.ellipse(8, 8, 5, 5, C.yellow); b.rect(7, 4, 2, 8, C.gold); b.set(5, 5, C.yellowL); }));
  def('💰', mk((b) => { b.ellipse(8, 10, 7, 5.5, C.tan); b.poly([[5, 2], [11, 2], [10, 5], [6, 5]], C.tan); b.rect(5, 5, 6, 1, C.brown); b.map(6, 7, ['.xxx.', 'x....', '.xxx.', '....x', '.xxx.'], { x: C.gold }); b.rect(8, 6, 1, 7, C.gold); }));
  def('💴', mk((b) => { b.rect(0, 3, 16, 10, '#e6d0a0'); b.rect(1, 4, 14, 8, '#f4e4c0'); b.ellipse(8, 8, 3, 3, C.tan); b.map(6, 6, ['x...x', '.x.x.', 'xxxxx', '..x..', 'xxxxx'], { x: C.brownD }); }));
  def('💸', mk((b) => { b.poly([[1, 6], [12, 4], [15, 12], [4, 14]], C.green); b.poly([[2, 7], [11, 5.5], [13.5, 11.5], [4.5, 13]], C.leaf); b.ellipse(8, 9, 2, 2, C.green); b.poly([[0, 3], [3, 1], [4, 4]], C.white); b.poly([[12, 1], [16, 0], [15, 3]], C.white); }));
  def('💎', mk((b) => { b.poly([[4, 2], [12, 2], [15, 6], [8, 15], [1, 6]], C.sky); b.rect(1, 6, 14, 1, C.blue); b.poly([[4, 2], [6, 6], [8, 2], [10, 6], [12, 2]], tint(C.sky, 0.5)); b.line(6, 7, 8, 13, C.blue); b.line(10, 7, 8, 13, C.white); }));
  def('🧪', mk((b) => { b.rect(6, 1, 4, 6, C.white); b.poly([[6, 6], [10, 6], [14, 14], [2, 14]], C.white); b.poly([[5, 9], [11, 9], [13.5, 13.5], [2.5, 13.5]], C.pink); b.rect(5, 0, 6, 2, C.brown); b.set(6, 11, C.pinkL); b.set(9, 12, C.white); }));
  def('🧼', mk((b) => { b.rect(2, 7, 12, 7, C.pink); b.rect(2, 7, 12, 2, C.pinkL); for (const [x, y, r] of [[5, 4, 2], [10, 2, 1.5], [13, 5, 1.5]]) { b.ellipse(x, y, r, r, C.white); } }));
  def('🧸', mk((b) => { b.ellipse(8, 11, 5, 4.5, C.brown); b.ellipse(8, 5, 4, 3.5, C.brown); b.ellipse(4, 2, 1.6, 1.6, C.brown); b.ellipse(12, 2, 1.6, 1.6, C.brown); b.ellipse(8, 6, 2, 1.4, C.tan); b.set(6, 4, INK); b.set(10, 4, INK); b.set(8, 6, INK); b.ellipse(8, 11, 2.5, 2.5, C.tan); }));
  def('🪀', mk((b) => { b.ellipse(8, 10, 6, 5, C.red); b.rect(2, 10, 12, 1, C.white); b.line(8, 0, 8, 6, C.grey); b.set(6, 8, C.pink); }));
  def('🧩', mk((b) => { b.rect(2, 4, 10, 10, C.green); b.ellipse(7, 3, 2, 2, C.green); b.ellipse(13, 9, 2, 2, C.green); b.rect(5, 13, 3, 1, null); b.set(4, 6, C.leaf); }));
  def('🧱', mk((b) => { b.rect(0, 2, 16, 12, C.red); for (const y of [5, 9]) b.rect(0, y, 16, 1, C.cream); for (const [x, y] of [[5, 2], [11, 2], [2, 6], [8, 6], [14, 6], [5, 10], [11, 10]]) b.rect(x, y, 1, 3, C.cream); }));
  def('🥊', mk((b) => { b.ellipse(8, 7, 6, 6, C.red); b.rect(4, 11, 8, 4, C.white); b.ellipse(3, 8, 2.5, 3, C.red); b.set(6, 4, C.pinkL); b.set(7, 3, C.pinkL); }));
  def('🥋', mk((b) => { b.poly([[1, 5], [5, 1], [11, 1], [15, 5], [13, 8], [12, 7], [12, 15], [4, 15], [4, 7], [3, 8]], C.white); b.poly([[6, 1], [8, 6], [10, 1]], C.skin); b.line(6, 1, 9, 8, '#dde4f0'); b.rect(4, 9, 8, 2, C.black); b.rect(9, 11, 2, 4, C.black); }));
  def('🗡', mk((b) => { b.line(3, 13, 13, 3, C.grey); b.line(4, 13, 14, 3, C.white); b.rect(2, 10, 4, 4, null); b.line(1, 11, 5, 15, C.gold); b.line(1, 15, 3, 13, C.brown); }));
  def('⚔', mk((b) => { b.line(2, 2, 13, 13, C.grey); b.line(13, 2, 2, 13, C.grey); b.line(3, 2, 13, 12, C.white); b.rect(1, 12, 3, 3, C.gold); b.rect(12, 12, 3, 3, C.gold); }));
  def('🕰', mk((b) => { b.rect(3, 0, 10, 16, C.brown); b.ellipse(8, 5, 4, 4, C.cream); b.line(8, 5, 8, 2, INK); b.line(8, 5, 10, 6, INK); b.rect(6, 10, 4, 4, C.brownD); b.rect(7, 10, 2, 3, C.gold); }));
  def('⌚', mk((b) => { b.rect(5, 0, 6, 16, C.greyD); b.ellipse(8, 8, 5, 5, C.grey); b.ellipse(8, 8, 3.5, 3.5, C.white); b.line(8, 8, 8, 5, INK); b.line(8, 8, 10, 8, INK); }));
  def('🕯', mk((b) => { b.rect(5, 6, 6, 9, C.cream); b.rect(5, 6, 6, 1, C.white); b.rect(7, 4, 1, 2, INK); b.poly([[7.5, 0], [10, 3], [7.5, 5], [5, 3]], C.orange); b.rect(7, 2, 1, 2, C.yellow); }));
  def('🛋', mk((b) => { b.rect(1, 6, 14, 6, C.purple); b.rect(3, 3, 10, 5, C.lilac); b.rect(0, 6, 3, 7, C.purple); b.rect(13, 6, 3, 7, C.purple); b.rect(2, 13, 2, 2, C.brownD); b.rect(12, 13, 2, 2, C.brownD); }));
  def('💺', mk((b) => { b.rect(3, 1, 9, 10, C.blue); b.rect(3, 10, 11, 3, C.blueD); b.rect(4, 13, 2, 3, C.greyD); b.rect(11, 13, 2, 3, C.greyD); b.rect(5, 2, 5, 2, C.sky); }));
  def('🚿', mk((b) => { b.rect(2, 1, 9, 2, C.grey); b.rect(2, 1, 2, 6, C.grey); b.poly([[8, 3], [13, 3], [15, 6], [6, 6]], C.grey); for (const x of [7, 10, 13]) { b.rect(x, 8, 1, 2, C.sky); b.rect(x - 1, 12, 1, 2, C.sky); } }));
  def('🛁', mk((b) => { b.rect(0, 7, 16, 2, C.white); b.poly([[1, 9], [15, 9], [13, 14], [3, 14]], C.white); b.rect(2, 8, 12, 1, C.sky); b.rect(3, 14, 2, 2, C.grey); b.rect(11, 14, 2, 2, C.grey); for (const [x, y] of [[4, 4], [7, 2], [11, 4]]) b.ellipse(x, y, 1.5, 1.5, C.white); }));
  def('🚽', mk((b) => { b.rect(2, 1, 6, 7, C.white); b.ellipse(10, 9, 5, 2.5, C.white); b.poly([[6, 10], [14, 10], [12, 15], [8, 15]], C.white); b.ellipse(10, 9, 3.5, 1.4, C.sky); b.rect(3, 2, 4, 1, '#e8eef8'); }));
  def('🚻', mk((b) => { b.rect(0, 0, 16, 16, C.blue); b.ellipse(4, 3, 1.7, 1.7, C.white); b.rect(2, 6, 4, 5, C.white); b.rect(2, 11, 1, 3, C.white); b.rect(5, 11, 1, 3, C.white); b.rect(7, 2, 2, 12, C.sky); b.ellipse(12, 3, 1.7, 1.7, C.white); b.poly([[12, 5.5], [15, 11], [9, 11]], C.white); b.rect(11, 11, 1, 3, C.white); b.rect(13, 11, 1, 3, C.white); }));
  def('🛍', mk((b) => { b.rect(2, 5, 12, 10, C.pink); b.rect(2, 5, 12, 2, C.rose); b.ellipse(8, 4, 3, 3, null); for (let y = 0; y < 6; y++) { b.set(5, y + 1, C.rose); b.set(10, y + 1, C.rose); } b.rect(5, 1, 6, 1, C.rose); }));
  def('🛒', mk((b) => { b.rect(0, 2, 3, 1, C.greyD); b.poly([[3, 3], [15, 4], [13, 10], [5, 10]], C.grey); for (const x of [6, 9, 12]) b.line(x, 4, x - 1, 9, C.white); b.rect(4, 11, 10, 1, C.greyD); b.ellipse(6, 14, 1.5, 1.5, C.black); b.ellipse(12, 14, 1.5, 1.5, C.black); }));
  def('🎒', mk((b) => { b.rect(3, 3, 10, 12, C.red); b.ellipse(8, 3, 5, 3, C.red); b.rect(5, 8, 6, 5, C.redD); b.rect(5, 8, 6, 1, C.gold); b.rect(6, 0, 4, 2, C.brownD); }));
  def('👜', mk((b) => { b.poly([[2, 7], [14, 7], [15, 15], [1, 15]], C.brown); b.ellipse(8, 6, 4, 4, null); for (const [x, y] of [[4, 6], [5, 3], [8, 2], [11, 3], [12, 6]]) b.set(x, y, C.brownD); b.line(5, 3, 4, 6, C.brownD); b.line(11, 3, 12, 6, C.brownD); b.rect(7, 9, 2, 2, C.gold); }));
  def('👕', mk((b) => { b.poly([[0, 4], [5, 1], [11, 1], [16, 4], [14, 8], [12, 7], [12, 15], [4, 15], [4, 7], [2, 8]], C.sky); b.poly([[6, 1], [8, 4], [10, 1]], C.white); }));
  def('👗', mk((b) => { b.rect(5, 0, 1, 3, C.rose); b.rect(10, 0, 1, 3, C.rose); b.poly([[5, 3], [11, 3], [10, 7], [15, 15], [1, 15], [6, 7]], C.rose); b.rect(5, 7, 6, 1, C.white); b.set(6, 4, C.pinkL); }));
  def('🕶', mk((b) => { b.rect(0, 5, 16, 1, C.black); b.ellipse(4, 8, 3.5, 3, C.black); b.ellipse(12, 8, 3.5, 3, C.black); b.set(3, 7, C.greyD); b.set(11, 7, C.greyD); }));
  def('🏎', mk((b) => { b.poly([[0, 10], [3, 7], [9, 6], [12, 8], [16, 9], [16, 12], [0, 12]], C.red); b.rect(6, 6, 3, 2, C.sky); b.ellipse(3, 12, 2, 2, C.black); b.ellipse(12, 12, 2, 2, C.black); b.rect(14, 6, 2, 3, C.redD); b.rect(1, 9, 3, 1, C.white); }));
  def('🎵', mk((b) => { b.rect(5, 2, 2, 10, INK); b.rect(5, 1, 8, 2, INK); b.rect(11, 2, 2, 8, INK); b.ellipse(4, 12, 3, 2.2, C.purple); b.ellipse(10, 10, 3, 2.2, C.purple); }, { outline: false }));
  def('💬', mk((b) => { b.ellipse(8, 7, 7.5, 5.5, C.white); b.poly([[3, 10], [2, 15], [7, 11]], C.white); for (const x of [4, 8, 12]) b.rect(x - 0.5, 6.5, 2, 2, C.greyD); }));
  def('💤', mk((b) => { b.map(1, 7, ['xxxxx', '...x.', '..x..', '.x...', 'xxxxx'], { x: C.blue }); b.map(8, 2, ['xxxx', '..x.', '.x..', 'xxxx'], { x: C.sky }); b.map(12, 0, ['xxx', '.x.', 'xxx'], { x: C.lilac }); }));
  def('♨', mk((b) => { b.ellipse(8, 12, 7, 3, C.red); b.ellipse(8, 11, 5, 1.5, C.sky); for (const x of [4, 8, 12]) { b.line(x, 9, x - 1, 6, C.red); b.line(x - 1, 6, x, 3, C.red); b.line(x, 3, x - 1, 0, C.red); } }));
  def('⛶', mk((b) => { for (const [x, y, dx, dy] of [[1, 1, 1, 1], [14, 1, -1, 1], [1, 14, 1, -1], [14, 14, -1, -1]]) { b.rect(Math.min(x, x + dx * 4), y, 5, 1, C.white); b.rect(x, Math.min(y, y + dy * 4), 1, 5, C.white); } }));
  def('7⃣', mk((b) => { b.rect(1, 1, 14, 14, C.blue); b.rect(1, 1, 14, 1, C.sky); b.map(4, 3, ['xxxxxxx', 'xxxxxxx', '....xx.', '...xx..', '..xx...', '..xx...', '.xx....', '.xx....', '.xx....', '.xx....'], { x: C.white }); }));
  def('↩', mk((b) => { b.rect(3, 5, 9, 2, C.white); b.rect(11, 5, 2, 8, C.white); b.rect(5, 11, 8, 2, C.white); b.poly([[0.5, 6], [5, 1.5], [5, 10.5]], C.white); }));
  def('↺', mk((b) => { b.ellipse(8, 9, 6, 6, C.white); b.ellipse(8, 9, 4, 4, null); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = x + 0.5 - 8, dy = y + 0.5 - 9; const d = dx * dx + dy * dy; if (d < 16 || (x > 8 && y < 9)) b.d[y * S + x] = null; } b.poly([[9, 0], [14, 3], [9, 6]], C.white); }));

  // ------------------------------------------------------- DOM swapping
  const urls = new Map();
  function url(k) {
    if (!urls.has(k)) urls.set(k, D[k]().toCanvas(1).toDataURL());
    return urls.get(k);
  }
  const KEYS = Object.keys(D).sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // an icon emoji (with or without its variation selector), or a plain
  // symbol's variation selector (♥️ -> ♥) so text symbols stay text
  const RE = new RegExp('(' + KEYS.map((k) => esc(k).replace(/‍/g, '\\u200D(?:\\uFE0F)?')).join('|') + ')\\uFE0F?|\\uFE0F', 'gu');
  function img(k) {
    const key = k.replace(/️/g, '');
    if (!D[key]) return null;
    const im = document.createElement('img');
    im.className = 'ic';
    im.src = url(key);
    im.alt = k;
    im.draggable = false;
    return im;
  }
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'TITLE']);
  function swapText(node) {
    const s = node.nodeValue;
    RE.lastIndex = 0;
    if (!RE.test(s)) return;
    const p = node.parentNode;
    if (!p || SKIP.has(p.nodeName) || (p.closest && p.closest('.no-ic'))) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    RE.lastIndex = 0;
    for (const m of s.matchAll(RE)) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      const im = m[1] ? img(m[1]) : null;
      if (im) frag.appendChild(im);
      last = m.index + m[0].length;
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(frag, node);
  }
  function walk(root) {
    if (root.nodeType === 3) { swapText(root); return; }
    if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach(swapText);
  }
  function start() {
    walk(document.body);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') swapText(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  global.ICONS = { img, url, list: () => KEYS.slice(), has: (k) => !!D[k.replace(/️/g, '')], swap: walk };
})(window);
