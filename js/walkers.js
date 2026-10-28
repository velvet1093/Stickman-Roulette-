// Small 16x24 overworld sprites (4 directions x 3 walk frames) for the
// open-world town. Same palettes as the big portraits, simplified.
(function (global) {
  'use strict';
  const { Buf } = PX;
  const W = 16, H = 24;
  const SKIN = '#fde3cc', SKIN_D = '#efc3a2';
  const CLOTH_KEYS = ['top', 'trim', 'bottomC', 'legs', 'shoes', 'sleeves', 'tie', 'sash', 'apron', 'bikini', 'openShirt', 'stripes', 'dots', 'belt', 'accent', 'ribbon', 'nightcap', 'headTowel', 'gownTrim', 'band'];

  const DEFS = {
    player: {
      hair: ['#e6e6ee', '#ffffff', '#aeb0c4'], style: 'long', ahoge: true, eye: '#b0303c',
      top: '#f4f2ec', trim: '#d6aa44', bottom: 'pants', bottomC: '#2c2834', legs: '#2c2834', shoes: '#1c1820', tails: true, tie: '#2f4fb0', gloves: true,
    },
    nami: {
      hair: ['#f2913d', '#fbbd6c', '#cf6a22'], style: 'ponytail', eye: '#a5582f', accent: '#3f63c9',
      top: '#8ec5f0', trim: '#f4b847', bottom: 'skirt', bottomC: '#8ec5f0', legs: SKIN, shoes: '#3a5fc0', sash: '#f4b847', bareArms: true,
    },
    aqua: {
      hair: ['#8fd3f7', '#d0f1ff', '#53a5dc'], style: 'long', loop: true, eye: '#3f86e0',
      top: '#3b5fc8', trim: '#5ccf8a', bottom: 'skirt', bottomC: '#3b5fc8', legs: '#f4f7ff', shoes: '#2f4fb0', sleeves: '#f4f7ff',
    },
    yumeko: {
      hair: ['#2f2943', '#5b5584', '#1d1829'], style: 'hime', eye: '#bf3043',
      top: '#c8303a', trim: '#f4f0f0', bottom: 'skirt', bottomC: '#4a4458', legs: '#2e2838', shoes: '#8a4a2a', tie: '#2a2030',
    },
    kurumi: {
      hair: ['#2a2432', '#56506c', '#18141e'], style: 'long', twin: 'low', eye: '#c8283a', hideEye: 'right',
      top: '#2a2832', trim: '#d8343c', bottom: 'skirt', bottomC: '#4a58b8', legs: '#1e1a24', shoes: '#141018', tie: '#d8343c',
    },
    rem: {
      hair: ['#7cb4f0', '#c4e0ff', '#4a84cc'], style: 'bob', band: '#ffffff', eye: '#3c7ce0', hideEye: 'left', accent: '#b070d8',
      top: '#2e2c38', trim: '#ffffff', bottom: 'skirt', bottomC: '#2e2c38', legs: '#ffffff', shoes: '#1e1a24', apron: '#ffffff',
    },
    zerotwo: {
      hair: ['#f4a6c0', '#ffd4e2', '#d87898'], style: 'long', horns: '#d83c4c', band: '#ffffff', eye: '#34a888',
      top: '#c83a3a', trim: '#e6c04a', bottom: 'skirt', bottomC: '#c83a3a', legs: '#1e1a24', shoes: '#f4f4f8', tie: '#f08a2a',
    },
    krul: {
      hair: ['#f4b0c8', '#ffd8e6', '#d888a8'], style: 'long', twin: 'high', ears: true, eye: '#d0203a', bats: true,
      top: '#1e1a24', trim: '#d6aa44', bottom: 'skirt', bottomC: '#1e1a24', legs: '#141018', shoes: '#141018', tie: '#c8203a', cape: true,
    },
    marin: {
      hair: ['#f6da7c', '#fff4c0', '#d8b454'], style: 'long', tips: '#f4a6bc', eye: '#e0507a',
      top: '#fbfaf6', trim: '#ffffff', bottom: 'skirt', bottomC: '#a8cce6', legs: SKIN, shoes: '#7a4a2a', tie: '#5a7088', choker: true,
    },
    frieren: {
      hair: ['#eceef6', '#ffffff', '#b4b8cc'], style: 'bob', twin: 'high', ears: true, eye: '#4aa080',
      top: '#f6f4ee', trim: '#d6aa44', bottom: 'skirt', bottomC: '#f6f4ee', legs: '#24223a', shoes: '#9a6a3a', belt: '#2a2832',
    },
  };

  // Beach and onsen looks: colors come from the portrait palettes.
  function outfitDef(id, outfit, o = {}) {
    const base = DEFS[id];
    const plain = { tie: null, trim: null, apron: null, belt: null, sash: null, tails: false, gloves: false, sleeves: null, bareArms: true, legs: SKIN, shoes: SKIN };
    if (outfit === 'cosplay') {
      const base2 = Object.assign({}, base, plain);
      switch (o.cos) {
        case 'rizu': return Object.assign(base2, { hair: ['#e0304a', '#ff7088', '#a81e34'], style: 'long', twin: 'high', tips: null, choker: false, ears: true, horns: '#1e1a24', eye: '#5aa868', top: SKIN, bikini: '#1e1a24', bottom: 'pants', bottomC: '#1e1a24', sleeves: '#1e1a24', bareArms: false, shoes: '#1e1a24', wings: true });
        case 'magical': return Object.assign(base2, { top: '#f88ab8', bottom: 'skirt', bottomC: '#f88ab8', trim: '#ffffff', sleeves: '#ffffff', bareArms: false, gloves: true, shoes: '#f88ab8', belt: '#ffffff' });
        default: return Object.assign(base2, { hair: ['#2a2236', '#4a4060', '#1e1a24'], style: 'bob', tips: null, choker: false, eye: '#8a7ad0', band: '#1e1a24', top: '#1e1a24', sleeves: '#1e1a24', bareArms: false, apron: '#a8a0b4', bottom: 'gown', bottomC: '#1e1a24', gownTrim: '#f4f2f8', legs: '#2a2632', shoes: '#1e1a24' });
      }
    }
    if (outfit === 'casual') {
      const k = SPRITES.casualLook(id, o);
      const base2 = Object.assign({}, base, plain);
      switch (k.style) {
        case 'sundress': return Object.assign(base2, { top: k.c, bottom: 'skirt', bottomC: k.c, shoes: k.shoe, sash: null, belt: k.trim });
        case 'hoodie': return Object.assign(base2, { top: k.c, sleeves: k.c, bareArms: false, bottom: id === 'player' ? 'pants' : 'skirt', bottomC: k.alt, legs: id === 'player' ? k.alt : SKIN, shoes: k.shoe });
        case 'blouse': return Object.assign(base2, { top: k.c, bottom: 'hakama', bottomC: k.alt, legs: k.alt, shoes: k.shoe, tie: k.trim });
        case 'sweater': return Object.assign(base2, { top: k.c, sleeves: k.c, bareArms: false, bottom: 'hakama', bottomC: k.alt, legs: k.alt, shoes: k.shoe });
        case 'jacket': return Object.assign(base2, { top: k.in, openShirt: k.c, bottom: 'pants', bottomC: k.alt, shoes: k.shoe });
        case 'croptop': return Object.assign(base2, { top: k.c, bottom: 'pants', bottomC: k.alt, shoes: k.shoe, midriff: true });
        default: return Object.assign(base2, { top: k.in, openShirt: k.c, bareArms: false, bottom: 'pants', bottomC: k.alt, legs: k.alt, shoes: k.shoe });
      }
    }
    if (outfit === 'pajama') {
      const pj = SPRITES.pjLook(id, o);
      const slip = pj.slip || SKIN;
      const nc = pj.cap ? pj.capC : null;
      const base2 = Object.assign({}, base, plain, { nightcap: nc, band: nc ? null : base.band, ahoge: nc ? false : base.ahoge, loop: nc ? false : base.loop });
      switch (pj.style) {
        case 'tee': return Object.assign(base2, { top: pj.c, bottom: 'pants', bottomC: pj.alt, shoes: slip, bareArms: false, sleeves: SKIN });
        case 'set': return Object.assign(base2, { top: pj.c, sleeves: pj.c, bareArms: false, bottom: 'pants', bottomC: pj.alt, legs: pj.alt, shoes: slip, dots: pj.pattern === 'dots' ? pj.trim : null, stripes: pj.pattern === 'stripes' ? PX.tint(pj.c, 0.3) : null });
        case 'yukata': return Object.assign(base2, { top: pj.c, sleeves: pj.c, bareArms: false, bottom: 'hakama', bottomC: pj.c, legs: pj.c, shoes: slip, belt: pj.trim });
        case 'gown': return Object.assign(base2, { top: pj.c, bottom: 'gown', bottomC: pj.c, shoes: slip, trim: pj.frill ? pj.trim : null, gownTrim: pj.trim });
        default: return Object.assign(base2, { top: pj.c, sleeves: pj.c, bareArms: false, bottom: 'skirt', bottomC: pj.c, shoes: slip });
      }
    }
    if (outfit === 'towel') {
      const c = SPRITES.towelColor(id, o);
      if (id === 'player') return Object.assign({}, base, plain, { top: SKIN, bottom: 'skirt', bottomC: c });
      return Object.assign({}, base, plain, { top: c, bottom: 'skirt', bottomC: c, headTowel: c });
    }
    if (id === 'player') return Object.assign({}, base, plain, { top: SKIN, bottom: 'pants', bottomC: o.trunks || SPRITES.SWIM.player.trunks, shoes: '#c8a070', openShirt: o.shirt === false ? null : SPRITES.SWIM.player.shirt });
    const sw = SPRITES.swimLook(id, o);
    if (sw.style === 'bikini') return Object.assign({}, base, plain, { top: SKIN, bikini: sw.suit, bottom: sw.sarong || sw.skirt ? 'skirt' : 'pants', bottomC: sw.sarong || sw.suit, shoes: '#c8a070' });
    return Object.assign({}, base, plain, { top: sw.suit, bottom: sw.frill ? 'skirt' : 'pants', bottomC: sw.suit, shoes: '#c8a070', trim: sw.trim, suitLegs: true });
  }

  // dir: 'down' | 'up' | 'left' | 'right'; frame: 0 stand, 1/2 steps
  function build(id, dir, frame, outfit, o = {}) {
    let d = outfit ? outfitDef(id, outfit, o) : DEFS[id];
    if (!outfit && id === 'player' && o.coat) d = Object.assign({}, d, { top: o.coat });
    if (o.tint && o.tint[SPRITES.lookKey(outfit, o)]) {
      // wardrobe part colours: match each flat colour to the portrait's parts
      d = Object.assign({}, d);
      for (const k of CLOTH_KEYS) if (typeof d[k] === 'string' && d[k][0] === '#') d[k] = SPRITES.tintFlat(id, outfit, o, d[k], k);
    }
    const [hb, hl, hd] = d.hair;
    const flip = dir === 'right';
    const side = dir === 'left' || dir === 'right';
    const up = dir === 'up';
    const b = new Buf(W, H);
    const step = frame === 0 ? 0 : frame === 1 ? 1 : -1;

    // long hair behind the body
    if (!up && (d.style === 'long' || d.style === 'hime')) {
      if (side) b.rect(7, 5, 7, d.style === 'hime' ? 16 : 15, hb);
      else b.rect(2, 6, 12, d.style === 'hime' ? 15 : 14, hb);
      if (d.tips) { if (side) b.rect(7, 16, 7, 4, d.tips); else b.rect(2, 16, 12, 4, d.tips); }
    }
    if (d.twin) {
      const hi = d.twin === 'high';
      if (side) b.poly(hi ? [[10, 3], [15, 6], [15, 17], [12, 19], [11, 8]] : [[10, 8], [14, 10], [14, 21], [11, 22], [10, 12]], hb);
      else {
        b.poly(hi ? [[3, 3], [0, 7], [0, 17], [2, 19], [4, 9]] : [[2, 8], [0, 12], [0, 21], [2, 22], [3, 12]], hb);
        b.poly(hi ? [[12, 3], [15, 7], [15, 17], [13, 19], [11, 9]] : [[13, 8], [15, 12], [15, 21], [13, 22], [12, 12]], hb);
      }
    }
    if (d.style === 'ponytail' && !up) {
      if (side) b.poly([[10, 3], [15, 5], [15, 12], [12, 14], [11, 8]], hb);
      else b.poly([[11, 2], [15, 4], [16, 11], [13, 14], [12, 8]], hb);
    }

    // bat wings (Rizu-kyun cosplay)
    if (d.wings && !side) { b.poly([[3, 14], [0, 10], [0, 17], [2, 18]], '#1e1a24'); b.poly([[12, 14], [15, 10], [15, 17], [13, 18]], '#1e1a24'); }
    if (d.wings && side) b.poly([[10, 14], [15, 9], [15, 16], [12, 18]], '#1e1a24');
    // a red-lined cape behind her
    if (d.cape) { if (up) b.rect(3, 13, 10, 10, '#1e1a24'); else if (side) { b.rect(9, 14, 5, 9, '#1e1a24'); b.rect(10, 15, 3, 7, '#8a1e2e'); } else { b.rect(3, 16, 10, 7, '#1e1a24'); b.rect(4, 17, 8, 6, '#8a1e2e'); } }
    // legs & shoes
    const legY = 19;
    if (side) {
      b.rect(6 + step, legY, 2, 3, d.legs); b.rect(8 - step, legY, 2, 3, d.legs);
      b.rect(5 + step, 22, 3, 1, d.shoes); b.rect(8 - step, 22, 3, 1, d.shoes);
    } else {
      b.rect(5, legY - (step > 0 ? 1 : 0), 2, 3, d.legs); b.rect(9, legY - (step < 0 ? 1 : 0), 2, 3, d.legs);
      b.rect(5, 22 - (step > 0 ? 1 : 0), 2, 1, d.shoes); b.rect(9, 22 - (step < 0 ? 1 : 0), 2, 1, d.shoes);
    }

    // coat tails
    if (d.tails) {
      if (side) b.poly([[9, 15], [12, 15], [13, 21], [10, 19]], d.top);
      else if (up) b.poly([[4, 16], [12, 16], [13, 21], [8, 19], [3, 21]], d.top);
      else { b.poly([[4, 16], [5, 16], [4, 21], [3, 20]], d.top); b.poly([[11, 16], [12, 16], [13, 20], [12, 21]], d.top); }
    }

    // torso
    const bx = side ? 5 : 4, bw = side ? 6 : 8;
    b.rect(bx, 13, bw, 6, d.top);
    if (d.bottom === 'skirt') b.rect(bx - 1, 17, bw + 2, 3, d.bottomC);
    else if (d.bottom === 'hakama') b.rect(bx - 1, 17, bw + 2, 5, d.bottomC);
    else if (d.bottom === 'gown') { b.rect(bx - 1, 16, bw + 2, 3, d.bottomC); b.rect(bx - 2, 19, bw + 4, 3, d.bottomC); if (d.gownTrim) b.rect(bx - 2, 21, bw + 4, 1, d.gownTrim); }
    else b.rect(bx, 18, bw, 2, d.bottomC);
    if (d.sash) b.rect(bx - 1, 16, bw + 2, 1, d.sash);
    if (d.apron && !up) b.rect(side ? 5 : 6, 15, side ? 3 : 4, 5, d.apron);
    if (d.bikini && !up) { if (side) b.rect(5, 14, 3, 2, d.bikini); else { b.rect(5, 14, 2, 2, d.bikini); b.rect(9, 14, 2, 2, d.bikini); } }
    if (d.bikini && up) b.rect(bx, 14, bw, 1, d.bikini);
    if (d.openShirt) { if (side) b.rect(8, 13, 3, 5, d.openShirt); else { b.rect(bx, 13, 2, 5, d.openShirt); b.rect(bx + bw - 2, 13, 2, 5, d.openShirt); } }
    if (d.suitLegs) b.rect(bx, 18, bw, 1, d.bottomC);
    if (d.midriff && !up) b.rect(bx + 1, 17, bw - 2, 1, SKIN);
    if (d.stripes) for (let x = bx + 1; x < bx + bw; x += 2) b.rect(x, 13, 1, 7, d.stripes);
    if (d.dots) for (let y = 14; y < 20; y += 2) for (let x = bx + (y % 4 ? 1 : 0); x < bx + bw; x += 3) b.set(x, y, d.dots);
    if (d.belt) b.rect(bx, 16, bw, 1, d.belt);
    if (d.sash && !side) { b.set(2, 18, d.sash); b.set(13, 18, d.sash); b.set(2, 19, d.sash); b.set(13, 19, d.sash); }
    if (!up) {
      if (d.tie && !side) { b.rect(7, 13, 2, 3, d.tie); }
      if (d.trim && !side && !d.sash) { b.set(5, 14, d.trim); b.set(10, 14, d.trim); }
      if (d.style === 'long' && d.loop) { b.rect(6, 14, 4, 1, d.trim); }
    }

    // arms swing opposite the legs
    const armC = d.openShirt ? d.openShirt : d.bareArms ? SKIN : d.sleeves || d.top;
    const handC = d.gloves ? '#ffffff' : SKIN;
    if (side) {
      b.rect(7 - step, 14, 2, 3, armC); b.rect(7 - step, 17, 2, 1, handC);
    } else {
      b.rect(3, 14 + (step < 0 ? 0 : 0), 1, 3, armC); b.rect(12, 14, 1, 3, armC);
      b.set(3, 17 - (step > 0 ? 1 : 0), handC); b.set(12, 17 - (step < 0 ? 1 : 0), handC);
    }

    // head: hair cap behind, face, then bangs on top
    if (up) {
      b.ellipse(8, 7.5, 7, 6.6, hb);
      if (d.style === 'long' || d.style === 'hime') b.rect(2, 8, 12, d.style === 'hime' ? 13 : 12, hb);
      if (d.tips) b.rect(2, 16, 12, 4, d.tips);
      if (d.style === 'bob') b.rect(2, 8, 12, 5, hb);
      if (d.style === 'ponytail') { b.rect(2, 8, 12, 4, hb); b.poly([[10, 3], [14, 5], [14, 12], [11, 14], [10, 8]], hb); }
      b.rect(6, 13, 4, 1, hd);
      b.clip = true;
      b.line(8, 3, 8, 18, hd);
      b.clip = false;
    } else if (side) {
      b.ellipse(8.5, 7, 6.6, 6.4, hb);
      b.rect(9, 7, 5, d.style === 'bob' ? 7 : 6, hb);
      b.ellipse(6.2, 9.2, 4.4, 4, SKIN);
      b.rect(6, 13, 3, 1, SKIN_D);
      b.poly([[1.5, 8], [3, 4], [6, 1.5], [10, 1.5], [13, 4], [10, 5], [9, 7], [7, 5], [5, 7], [4, 6]], hb);
      if (d.style === 'hime') b.rect(2, 5, 6, 2, hb);
    } else {
      b.ellipse(8, 7, 7, 6.6, hb);
      b.ellipse(8, 9.3, 5.3, 4.2, SKIN);
      b.rect(6, 13, 4, 1, SKIN_D);
      if (d.style === 'hime') {
        b.rect(2, 2, 12, 5, hb);
        b.rect(1, 6, 3, 8, hb); b.rect(12, 6, 3, 8, hb);
      } else {
        b.poly([[1.5, 8], [2.5, 3.5], [6, 1], [10, 1], [13.5, 3.5], [14.5, 8], [13, 6.5], [12, 7.5], [10.5, 5.5], [9, 7.5], [7.5, 5.5], [5.5, 7.5], [4.5, 5.5], [3, 7]], hb);
        if (d.style === 'long' || d.style === 'bob') { b.rect(1, 7, 2, d.style === 'bob' ? 6 : 8, hb); b.rect(13, 7, 2, d.style === 'bob' ? 6 : 8, hb); }
      }
    }
    // shine
    b.clip = true;
    if (!up) { b.set(5, 3, hl); b.set(6, 3, hl); b.set(10, 3, hl); }
    else { b.set(5, 4, hl); b.set(11, 4, hl); }
    b.clip = false;

    // accessories on top
    if (d.band && !d.headTowel) b.rect(side ? 5 : 3, 2, side ? 8 : 10, 1, d.band);
    if (d.bats) { b.rect(2, 2, 2, 2, '#1e1a24'); b.set(1, 1, '#1e1a24'); b.rect(12, 2, 2, 2, '#1e1a24'); b.set(14, 1, '#1e1a24'); }
    if (d.choker && !up && !side) b.rect(6, 13, 4, 1, '#1e1a24');
    if (d.nightcap) { b.rect(3, 0, 10, 3, d.nightcap); b.rect(2, 3, 12, 1, PX.tint(d.nightcap, 0.45)); b.rect(12, 1, 2, 2, d.nightcap); b.set(14, 3, d.nightcap); b.set(15, 4, '#ffffff'); b.set(14, 4, '#ffffff'); }
    if (d.headTowel) { b.rect(5, 0, 6, 2, d.headTowel); b.set(5, 0, PX.tint(d.headTowel, 0.5)); }
    if (d.horns) { b.set(4, 0, d.horns); b.set(5, 1, d.horns); b.set(11, 0, d.horns); b.set(10, 1, d.horns); }
    if (d.ears && !up) {
      if (side) { b.set(12, 8, SKIN); b.set(13, 7, SKIN); }
      else { b.set(0, 8, SKIN); b.set(1, 8, SKIN); b.set(15, 8, SKIN); b.set(14, 8, SKIN); b.set(0, 7, SKIN); b.set(15, 7, SKIN); }
    }
    if (d.ahoge) { b.set(8, 0, hb); b.set(9, 0, hb); b.set(7, 1, hb); b.set(8, 1, hb); }
    if (d.loop) { b.ellipse(8, 1, 2.2, 1.6, hb); b.set(8, 1, null); b.rect(7, 2, 3, 1, '#3a6fd0'); }
    if (d.accent && !up) b.rect(side ? 10 : 11, 2, 2, 2, d.accent);
    if (d.accent && up) b.rect(10, 2, 2, 2, d.accent);
    if (d.ribbon) {
      if (up) { b.rect(7, 2, 3, 2, d.ribbon); b.set(6, 1, d.ribbon); b.set(10, 1, d.ribbon); }
      else { b.rect(13, 2, 2, 2, d.ribbon); b.set(15, 1, d.ribbon); }
    }

    // face
    if (!up) {
      const lash = '#2a1828';
      if (side) {
        b.rect(3, 8, 3, 1, lash); b.rect(3, 9, 2, 2, d.eye); b.set(3, 9, '#ffffff');
        b.set(4, 12, '#d08a8a');
      } else {
        b.rect(4, 8, 3, 1, lash); b.rect(9, 8, 3, 1, lash); b.set(4, 9, lash); b.set(11, 9, lash);
        b.rect(5, 9, 2, 2, d.eye); b.rect(9, 9, 2, 2, d.eye);
        b.set(5, 9, '#ffffff'); b.set(10, 9, '#ffffff');
        b.set(7, 12, '#d08a8a'); b.set(8, 12, '#d08a8a');
      }
    }

    if (d.hideEye && !up && !side) {
      // a lock of bangs sweeping down over one eye, joined to the fringe
      if (d.hideEye === 'left') {
        b.poly([[2, 5], [8, 5], [8, 8], [7, 11], [5, 12], [3, 11], [2, 8]], hb);
        b.line(4, 6, 5, 11, hd); b.line(7, 6, 6, 9, hl);
      } else {
        b.poly([[8, 5], [14, 5], [14, 8], [13, 11], [11, 12], [9, 11], [8, 8]], hb);
        b.line(12, 6, 11, 11, hd); b.line(9, 6, 10, 9, hl);
      }
    }
    b.outline(0.55);
    if (flip) {
      const out = new Buf(W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out.d[y * W + (W - 1 - x)] = b.d[y * W + x];
      return out;
    }
    return b;
  }

  // Sprite left/right are drawn facing left, so 'left' is the base.
  const cache = new Map();
  function get(id, dir = 'down', frame = 0, outfit = null, o = null) {
    const k = id + dir + frame + (outfit || '') + (o ? JSON.stringify(o) : '');
    if (!cache.has(k)) cache.set(k, build(id, dir, frame, outfit, o || {}).toCanvas(1));
    return cache.get(k);
  }

  global.WALKERS = { get, W, H, DEFS };
})(window);
