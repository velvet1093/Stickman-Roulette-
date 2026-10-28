// Little playable games, shown inside the modal sheet.
//   Skill games (console, arcade): kart, stack, rhythm, mash. Play solo or
//   against a girl: her score comes from her skill at that game.
//   Gambling / cards (casino, Yumeko): slots, blackjack, highlow.
// MINIGAMES.play(container, kind, opts) -> Promise<result>
(function (global) {
  'use strict';
  const W = 160, H = 200;
  const SKILL_GAMES = {
    kart: { name: 'Kart Dash', icon: '🏎️', par: 220, how: 'Dodge the cones! ◀ ▶ (or tap the left / right side).' },
    stack: { name: 'Block Stack', icon: '🧱', par: 9, how: 'Tap to drop the block. Line it up with the one below!' },
    rhythm: { name: 'Rhythm Hearts', icon: '🎵', par: 34, how: 'Tap a lane when its heart reaches the line.' },
    mash: { name: 'Brawl Mash', icon: '🥊', par: 34, how: 'Mash PUNCH as fast as you can for 6 seconds!' },
  };

  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  function btn(label, onClick, cls = '') {
    const b = mk('button', 'btn ' + cls, `<span class="lbl">${label}</span>`);
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return b;
  }
  function canvasBox(container) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H; c.className = 'mg-canvas';
    container.appendChild(c);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  }
  // key + pointer helpers that clean up after themselves
  function controls() {
    const offs = [];
    return {
      key(fn) { const h = (e) => { if (fn(e)) e.preventDefault(); }; window.addEventListener('keydown', h); offs.push(() => window.removeEventListener('keydown', h)); },
      on(el, ev, fn) { el.addEventListener(ev, fn); offs.push(() => el.removeEventListener(ev, fn)); },
      off() { offs.forEach((f) => f()); },
    };
  }
  function loop(step) {
    let last = performance.now(), live = true;
    const f = (now) => { if (!live) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; if (step(dt, now) === false) { live = false; return; } requestAnimationFrame(f); };
    requestAnimationFrame(f);
    return () => { live = false; };
  }
  const font = (x, px) => { x.font = `${px}px DotGothic16, monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; };

  // ------------------------------------------------------------ skill games
  function kart(container, done) {
    const [c, x] = canvasBox(container);
    const row = mk('div', 'row');
    let lane = 1, t = 0, dist = 0, lives = 3, flash = 0, spawn = 0;
    const obs = [];
    const move = (d) => { lane = Math.max(0, Math.min(2, lane + d)); };
    row.appendChild(btn('◀', () => move(-1))); row.appendChild(btn('▶', () => move(1)));
    container.appendChild(row);
    const ctl = controls();
    ctl.key((e) => { if (['ArrowLeft', 'KeyA'].includes(e.code)) { move(-1); return true; } if (['ArrowRight', 'KeyD'].includes(e.code)) { move(1); return true; } });
    ctl.on(c, 'pointerdown', (e) => { const r = c.getBoundingClientRect(); move(e.clientX - r.left < r.width / 2 ? -1 : 1); });
    const LX = [44, 80, 116];
    const stop = loop((dt) => {
      t += dt;
      const speed = 90 + t * 4;
      dist += speed * dt / 10;
      spawn -= dt;
      if (spawn <= 0) { spawn = Math.max(0.32, 0.65 - t * 0.015); obs.push({ lane: Math.floor(Math.random() * 3), y: -10 }); }
      for (const o of obs) o.y += speed * dt;
      for (const o of obs) if (!o.hit && o.lane === lane && Math.abs(o.y - 170) < 13) { o.hit = true; lives -= 1; flash = 0.4; dist = Math.max(0, dist - 30); }
      flash = Math.max(0, flash - dt);
      // draw
      x.fillStyle = '#3a8a4a'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#4a4a54'; x.fillRect(24, 0, 112, H);
      x.fillStyle = '#f4f4f4'; for (let y = -20 + ((t * speed) % 20); y < H; y += 20) { x.fillRect(61, y, 2, 10); x.fillRect(97, y, 2, 10); }
      x.fillStyle = '#e05a4a'; x.fillRect(22, 0, 2, H); x.fillRect(136, 0, 2, H);
      for (const o of obs) { if (o.hit) continue; x.fillStyle = '#f08a2a'; x.beginPath(); x.moveTo(LX[o.lane], o.y - 8); x.lineTo(LX[o.lane] - 6, o.y + 6); x.lineTo(LX[o.lane] + 6, o.y + 6); x.fill(); x.fillStyle = '#ffffff'; x.fillRect(LX[o.lane] - 4, o.y, 8, 2); }
      const px = LX[lane];
      if (!(flash > 0 && Math.floor(t * 20) % 2)) {
        x.fillStyle = '#d8343c'; x.fillRect(px - 7, 162, 14, 18); x.fillStyle = '#a8d8f0'; x.fillRect(px - 5, 165, 10, 5);
        x.fillStyle = '#1a1a22'; x.fillRect(px - 9, 164, 2, 5); x.fillRect(px + 7, 164, 2, 5); x.fillRect(px - 9, 174, 2, 5); x.fillRect(px + 7, 174, 2, 5);
      }
      font(x, 10); x.fillStyle = '#ffffff';
      x.fillText(`${Math.round(dist)} m`, 40, 10); x.fillText('♥'.repeat(Math.max(0, lives)), 125, 10); x.fillText(`${Math.max(0, Math.ceil(20 - t))}s`, 80, 10);
      if (t >= 20 || lives <= 0) { ctl.off(); done(Math.round(dist)); return false; }
    });
    return () => { stop(); ctl.off(); };
  }

  function stack(container, done) {
    const [c, x] = canvasBox(container);
    const layers = [{ x: 50, w: 60 }];
    let cur = { x: 0, w: 60, dir: 1 }, speed = 70, over = false, t = 0, msg = '';
    const drop = () => {
      if (over) return;
      const prev = layers[layers.length - 1];
      const l = Math.max(cur.x, prev.x), r = Math.min(cur.x + cur.w, prev.x + prev.w);
      if (r - l <= 0) { over = true; msg = 'Missed!'; return; }
      const perfect = Math.abs(cur.x - prev.x) < 2;
      const nw = perfect ? prev.w : r - l;
      layers.push({ x: perfect ? prev.x : l, w: nw });
      msg = perfect ? 'PERFECT!' : '';
      cur = { x: layers.length % 2 ? 0 : W - nw, w: nw, dir: layers.length % 2 ? 1 : -1 };
      speed += 7;
      if (layers.length > 20) over = true;
    };
    const row = mk('div', 'row'); row.appendChild(btn('⬇ Drop', drop)); container.appendChild(row);
    const ctl = controls();
    ctl.key((e) => { if (['Space', 'Enter', 'KeyE', 'ArrowDown'].includes(e.code)) { drop(); return true; } });
    ctl.on(c, 'pointerdown', drop);
    let endT = 0;
    const stop = loop((dt) => {
      t += dt;
      if (!over) { cur.x += cur.dir * speed * dt; if (cur.x < 0) { cur.x = 0; cur.dir = 1; } if (cur.x + cur.w > W) { cur.x = W - cur.w; cur.dir = -1; } }
      const base = Math.max(0, layers.length - 12);
      x.fillStyle = '#241c3a'; x.fillRect(0, 0, W, H);
      const cols = ['#f05a8a', '#5ab8f0', '#f4c83a', '#5ab85a', '#b070f0'];
      layers.forEach((L, i) => { if (i < base) return; const y = H - 14 - (i - base) * 12; x.fillStyle = cols[i % cols.length]; x.fillRect(L.x, y, L.w, 11); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(L.x, y, L.w, 2); });
      if (!over) { const y = H - 14 - (layers.length - base) * 12; x.fillStyle = cols[layers.length % cols.length]; x.fillRect(cur.x, y, cur.w, 11); }
      font(x, 10); x.fillStyle = '#ffffff'; x.fillText(`Height ${layers.length - 1}`, 80, 10);
      if (msg) { font(x, 14); x.fillStyle = '#ffe066'; x.fillText(msg, 80, 40); }
      if (over) { endT += dt; if (endT > 0.8) { ctl.off(); done(layers.length - 1); return false; } }
      if (t > 40 && !over) over = true;
    });
    return () => { stop(); ctl.off(); };
  }

  function rhythm(container, done) {
    const [c, x] = canvasBox(container);
    const LX = [40, 80, 120], LINE = 170;
    const notes = [];
    for (let i = 0; i < 28; i++) notes.push({ lane: Math.floor(Math.random() * 3), at: 1 + i * 0.62 + (i % 4 === 3 ? 0.31 : 0) });
    let t = 0, score = 0, fb = '', fbT = 0;
    const hit = (lane) => {
      let best = null, bd = 99;
      for (const n of notes) { if (n.done || n.lane !== lane) continue; const y = LINE - (n.at - t) * 110; const d = Math.abs(y - LINE); if (d < bd) { bd = d; best = n; } }
      if (best && bd < 14) { best.done = true; const p = bd < 5; score += p ? 2 : 1; fb = p ? 'PERFECT' : 'GOOD'; } else fb = 'MISS';
      fbT = 0.4;
    };
    const row = mk('div', 'row'); ['♥', '♥', '♥'].forEach((s, i) => row.appendChild(btn(['◀', '▲', '▶'][i], () => hit(i)))); container.appendChild(row);
    const ctl = controls();
    ctl.key((e) => { const m = { ArrowLeft: 0, KeyA: 0, ArrowUp: 1, ArrowDown: 1, KeyW: 1, KeyS: 1, Space: 1, ArrowRight: 2, KeyD: 2 }[e.code]; if (m !== undefined) { hit(m); return true; } });
    ctl.on(c, 'pointerdown', (e) => { const r = c.getBoundingClientRect(); hit(Math.min(2, Math.floor((e.clientX - r.left) / (r.width / 3)))); });
    const stop = loop((dt) => {
      t += dt; fbT = Math.max(0, fbT - dt);
      x.fillStyle = '#2a1a3a'; x.fillRect(0, 0, W, H);
      for (const lx of LX) { x.fillStyle = '#3a2a4e'; x.fillRect(lx - 14, 0, 28, H); }
      x.fillStyle = '#ffffff'; x.fillRect(20, LINE, 120, 2);
      for (const n of notes) {
        if (n.done) continue;
        const y = LINE - (n.at - t) * 110;
        if (y < -10 || y > H + 10) continue;
        if (y > LINE + 16) { n.done = true; continue; }
        x.fillStyle = ['#f05a8a', '#ffe066', '#5ab8f0'][n.lane];
        x.beginPath(); x.arc(LX[n.lane] - 3, y - 2, 4, 0, Math.PI * 2); x.arc(LX[n.lane] + 3, y - 2, 4, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.moveTo(LX[n.lane] - 7, y); x.lineTo(LX[n.lane] + 7, y); x.lineTo(LX[n.lane], y + 7); x.fill();
      }
      font(x, 10); x.fillStyle = '#ffffff'; x.fillText(`Score ${score}`, 80, 10);
      if (fbT > 0) { font(x, 14); x.fillStyle = fb === 'MISS' ? '#ff8a8a' : '#ffe066'; x.fillText(fb, 80, 140); }
      if (t > notes[notes.length - 1].at + 1) { ctl.off(); done(score); return false; }
    });
    return () => { stop(); ctl.off(); };
  }

  function mash(container, done, rival) {
    const [c, x] = canvasBox(container);
    let taps = 0, t = -1, punch = 0;
    const hit = () => { if (t < 0 || t > 6) return; taps += 1; punch = 0.12; };
    const row = mk('div', 'row'); row.appendChild(btn('👊 PUNCH!', hit, 'primary')); container.appendChild(row);
    const ctl = controls();
    ctl.key((e) => { if (['Space', 'Enter', 'KeyE'].includes(e.code)) { if (!e.repeat) hit(); return true; } });
    ctl.on(c, 'pointerdown', hit);
    const rivalRate = rival ? (SKILL_GAMES.mash.par / 6) * rival.skill : 0;
    const stop = loop((dt) => {
      t += dt; punch = Math.max(0, punch - dt);
      x.fillStyle = '#3a2048'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#5a3a6a'; x.fillRect(0, 150, W, 50);
      // fighters
      x.fillStyle = '#f4f2ec'; x.fillRect(40 + (punch ? 6 : 0), 110, 16, 40); x.fillStyle = '#e6e6ee'; x.fillRect(38, 96, 20, 16);
      if (punch) { x.fillStyle = '#ffe066'; x.fillRect(58, 118, 16, 6); }
      x.fillStyle = rival ? rival.color : '#8a8a96'; x.fillRect(104, 110, 16, 40); x.fillRect(102, 96, 20, 16);
      const mine = taps, theirs = rival ? Math.round(Math.max(0, Math.min(6, t)) * rivalRate) : 0;
      x.fillStyle = '#1a1424'; x.fillRect(10, 30, 140, 10);
      const share = mine + theirs ? mine / (mine + theirs) : 0.5;
      x.fillStyle = '#f05a8a'; x.fillRect(10, 30, 140 * share, 10);
      font(x, 10); x.fillStyle = '#ffffff';
      x.fillText(t < 0 ? 'Ready...' : t < 6 ? `${(6 - t).toFixed(1)}s` : 'K.O.!', 80, 14); x.fillText(`${mine}`, 30, 52); if (rival) x.fillText(`${theirs}`, 130, 52);
      if (t > 6.8) { ctl.off(); done(taps); return false; }
    });
    return () => { stop(); ctl.off(); };
  }

  // One skill game, with a rival's score at the end if she's playing too.
  function skill(container, kind, opts, resolve) {
    const G = SKILL_GAMES[kind];
    container.innerHTML = '';
    container.appendChild(mk('div', 'loc-desc', `${G.icon} <b>${G.name}</b> · ${G.how}${opts.rival ? `<br>Versus <b style="color:${opts.rival.color}">${opts.rival.name}</b>` : ''}`));
    const area = mk('div', 'mg-area');
    container.appendChild(area);
    const games = { kart, stack, rhythm, mash };
    let cleanup = null;
    const start = () => {
      area.innerHTML = '';
      cleanup = games[kind](area, (score) => {
        cleanup = null;
        const rival = opts.rival ? Math.max(1, Math.round(G.par * opts.rival.skill * (0.8 + Math.random() * 0.35))) : null;
        const won = rival === null ? null : score > rival;
        area.innerHTML = '';
        area.appendChild(mk('div', 'mg-result', `<div class="big">${score}</div>${rival !== null ? `<div>${opts.rival.name}: ${rival}</div><div class="${won ? 'win' : 'lose'}">${won ? 'You win!' : score === rival ? 'A draw!' : `${opts.rival.name} wins!`}</div>` : `<div>${score >= G.par ? 'Great score!' : score >= G.par * 0.6 ? 'Not bad!' : 'Practice makes perfect.'}</div>`}`));
        const row = mk('div', 'row');
        row.appendChild(btn('▶ Continue', () => resolve({ score, rival, won }), 'primary'));
        area.appendChild(row);
      });
    };
    const row = mk('div', 'row');
    row.appendChild(btn('▶ Start', start, 'primary'));
    area.appendChild(row);
    return () => { if (cleanup) cleanup(); };
  }

  // ------------------------------------------------------------- the casino
  const REEL = [['🍒', 30], ['🍋', 25], ['🔔', 18], ['⭐', 12], ['7️⃣', 9], ['💎', 6]];
  const PAY3 = { '🍒': 4, '🍋': 5, '🔔': 8, '⭐': 12, '7️⃣': 25, '💎': 50 };
  const spinSym = () => { let r = Math.random() * 100; for (const [s, w] of REEL) { r -= w; if (r <= 0) return s; } return '🍒'; };
  function slots(container, opts, resolve) {
    const wallet = opts.wallet;
    let bet = 10, net = 0, spinning = false;
    container.innerHTML = '';
    container.appendChild(mk('div', 'loc-desc', '🎰 <b>Lucky Sevens</b> · Three of a kind pays big (💎 ×50, 7️⃣ ×25, ⭐ ×12, 🔔 ×8, 🍋 ×5, 🍒 ×4). A pair gives your bet back.'));
    const reels = mk('div', 'mg-reels');
    const cells = [0, 1, 2].map(() => { const d = mk('div', 'mg-reel', '7️⃣'); reels.appendChild(d); return d; });
    container.appendChild(reels);
    const status = mk('div', 'mg-status', '');
    container.appendChild(status);
    const bets = mk('div', 'row');
    const drawBets = () => { bets.innerHTML = ''; [10, 50, 100].forEach((v) => bets.appendChild(btn(`¥${v}`, () => { bet = v; drawBets(); }, v === bet ? 'on' : ''))); };
    drawBets();
    container.appendChild(bets);
    const row = mk('div', 'row');
    const show = (t) => { status.innerHTML = `${t}<br><span class="muted">Money ¥${wallet.get()} · this visit ${net >= 0 ? '+' : '-'}¥${Math.abs(net)}</span>`; };
    const spin = () => {
      if (spinning) return;
      if (wallet.get() < bet) { show('Not enough money for that bet.'); return; }
      spinning = true; wallet.add(-bet); net -= bet;
      const res = [spinSym(), spinSym(), spinSym()];
      const stops = [700, 1100, 1500], t0 = performance.now();
      const anim = () => {
        const el = performance.now() - t0;
        cells.forEach((c, i) => { c.textContent = el < stops[i] ? REEL[Math.floor(Math.random() * REEL.length)][0] : res[i]; c.classList.toggle('stopped', el >= stops[i]); });
        if (el < stops[2]) { requestAnimationFrame(anim); return; }
        let win = 0;
        if (res[0] === res[1] && res[1] === res[2]) win = bet * PAY3[res[0]];
        else if (res[0] === res[1] || res[1] === res[2] || res[0] === res[2]) win = bet;
        if (win) { wallet.add(win); net += win; }
        spinning = false;
        show(win > bet ? `🎉 JACKPOT-ish! You win ¥${win}!` : win ? 'A pair: your bet comes back.' : 'No luck this time.');
        if (opts.onSpin) opts.onSpin(win, bet);
      };
      anim();
    };
    row.appendChild(btn('🎰 Spin', spin, 'primary'));
    row.appendChild(btn('Cash out', () => { if (!spinning) resolve({ net }); }));
    container.appendChild(row);
    show('Pick a bet and spin!');
    return () => {};
  }

  // Cards: a shuffled 52-card deck
  const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function deck() { const d = []; for (const s of SUITS) for (let r = 0; r < 13; r++) d.push({ s, r }); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
  const cardHtml = (c, hidden) => (hidden ? '<span class="mg-card back">✿</span>' : `<span class="mg-card ${c.s === '♥' || c.s === '♦' ? 'red' : ''}">${RANKS[c.r]}${c.s}</span>`);
  function handValue(h) { let v = 0, aces = 0; for (const c of h) { if (c.r === 0) { aces++; v += 11; } else v += Math.min(10, c.r + 1); } while (v > 21 && aces) { v -= 10; aces--; } return v; }

  function blackjack(container, opts, resolve) {
    const wallet = opts.wallet, dealer = opts.dealer || 'Dealer';
    const betsList = opts.bets || [10, 50, 100];
    let bet = betsList[0], net = 0, d = deck(), ph = [], dh = [], phase = 'bet', rounds = 0, wins = 0;
    container.innerHTML = '';
    container.appendChild(mk('div', 'loc-desc', `🃏 <b>Blackjack</b> vs ${dealer} · Get closer to 21 than the dealer without going over. The dealer stands on 17. Blackjack pays 3:2.`));
    const table = mk('div', 'mg-table');
    container.appendChild(table);
    const status = mk('div', 'mg-status', '');
    container.appendChild(status);
    const ctl = mk('div', 'mg-ctl');
    container.appendChild(ctl);
    const draw = () => { if (d.length < 10) d = deck(); return d.pop(); };
    const render = (msg) => {
      table.innerHTML = `<div class="mg-hand"><span class="who">${dealer}${phase === 'play' ? '' : dh.length ? ` (${handValue(dh)})` : ''}</span>${dh.map((c, i) => cardHtml(c, phase === 'play' && i === 1)).join('')}</div>
        <div class="mg-hand"><span class="who">You${ph.length ? ` (${handValue(ph)})` : ''}</span>${ph.map((c) => cardHtml(c)).join('')}</div>`;
      status.innerHTML = `${msg || ''}<br><span class="muted">Bet ¥${bet} · money ¥${wallet.get()} · this visit ${net >= 0 ? '+' : '-'}¥${Math.abs(net)}</span>`;
      ctl.innerHTML = '';
      const row = mk('div', 'row');
      if (phase === 'play') {
        row.appendChild(btn('Hit', hit, 'primary')); row.appendChild(btn('Stand', stand));
        if (ph.length === 2 && wallet.get() >= bet) row.appendChild(btn('Double', double));
      } else {
        const br = mk('div', 'row');
        betsList.forEach((v) => br.appendChild(btn(`¥${v}`, () => { bet = v; render(msg); }, v === bet ? 'on' : '')));
        ctl.appendChild(br);
        row.appendChild(btn('Deal', deal, 'primary'));
        row.appendChild(btn('Leave table', () => resolve({ net, rounds, wins })));
      }
      ctl.appendChild(row);
    };
    const finish = (result) => {
      phase = 'bet'; rounds++;
      let pay = 0, msg;
      if (result === 'blackjack') { pay = Math.floor(bet * 2.5); msg = '🂡 BLACKJACK! Paid 3:2.'; wins++; }
      else if (result === 'win') { pay = bet * 2; msg = 'You win!'; wins++; }
      else if (result === 'push') { pay = bet; msg = 'Push. Your bet comes back.'; }
      else msg = result === 'bust' ? 'Bust! Over 21.' : `${dealer} wins.`;
      if (pay) { wallet.add(pay); net += pay; }
      if (opts.onRound) msg += opts.onRound(result) || '';
      render(msg);
    };
    function deal() {
      if (wallet.get() < bet) { render('Not enough money for that bet.'); return; }
      wallet.add(-bet); net -= bet;
      ph = [draw(), draw()]; dh = [draw(), draw()]; phase = 'play';
      if (handValue(ph) === 21) { phase = 'done'; finish(handValue(dh) === 21 ? 'push' : 'blackjack'); return; }
      render('Hit or stand?');
    }
    function hit() { ph.push(draw()); if (handValue(ph) > 21) { phase = 'done'; finish('bust'); } else render('Hit or stand?'); }
    function stand() {
      phase = 'done';
      while (handValue(dh) < 17) dh.push(draw());
      const p = handValue(ph), q = handValue(dh);
      finish(q > 21 || p > q ? 'win' : p === q ? 'push' : 'lose');
    }
    function double() { wallet.add(-bet); net -= bet; bet *= 2; ph.push(draw()); const b = bet; if (handValue(ph) > 21) { phase = 'done'; finish('bust'); } else stand(); bet = b / 2; }
    render('Place your bet and deal.');
    return () => {};
  }

  // High or low: guess whether the next card beats this one. Cash out any time.
  function highlow(container, opts, resolve) {
    let d = deck(), cur = d.pop(), streak = 0, over = false;
    container.innerHTML = '';
    container.appendChild(mk('div', 'loc-desc', `🎴 <b>High or Low</b>${opts.rival ? ` with ${opts.rival.name}` : ''} · Will the next card be higher or lower? A tie keeps your streak. Stop whenever you like.`));
    const table = mk('div', 'mg-table'); container.appendChild(table);
    const status = mk('div', 'mg-status', ''); container.appendChild(status);
    const ctl = mk('div', 'mg-ctl'); container.appendChild(ctl);
    const render = (msg) => {
      table.innerHTML = `<div class="mg-hand"><span class="who">Card</span>${cardHtml(cur)}</div>`;
      status.innerHTML = `${msg}<br><span class="muted">Streak ${streak}</span>`;
      ctl.innerHTML = '';
      const row = mk('div', 'row');
      if (!over) { row.appendChild(btn('▲ Higher', () => guess(1), 'primary')); row.appendChild(btn('▼ Lower', () => guess(-1), 'primary')); }
      row.appendChild(btn(over ? '▶ Continue' : `Stop (streak ${streak})`, () => resolve({ streak, busted: over })));
      ctl.appendChild(row);
    };
    const guess = (g) => {
      const next = d.pop();
      const cmp = Math.sign(next.r - cur.r);
      cur = next;
      if (cmp === 0) render('A tie! Your streak holds.');
      else if (cmp === g) { streak++; render(streak >= 8 ? 'Eight in a row! Incredible!' : 'Correct!'); if (streak >= 8) { over = true; render('Eight in a row! Incredible!'); } }
      else { over = true; render(`Wrong! The streak ends at ${streak}.`); }
    };
    render('Higher or lower?');
    return () => {};
  }

  function play(container, kind, opts = {}) {
    return new Promise((resolve) => {
      let cleanup;
      const done = (r) => { if (cleanup) cleanup(); resolve(r); };
      if (SKILL_GAMES[kind]) cleanup = skill(container, kind, opts, done);
      else if (kind === 'slots') cleanup = slots(container, opts, done);
      else if (kind === 'blackjack') cleanup = blackjack(container, opts, done);
      else if (kind === 'highlow') cleanup = highlow(container, opts, done);
    });
  }

  global.MINIGAMES = { play, SKILL_GAMES, handValue };
})(window);
