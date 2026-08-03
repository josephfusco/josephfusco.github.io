/* Pigeons on the ground at the foot of the page.

   Rock pigeons, drawn to the same silhouette language as the wire
   birds but standing rather than perched, and doing what pigeons
   actually do on pavement: walking with the head thrust that makes
   the gait look mechanical, pecking, preening a shoulder, puffing
   up, and now and then a male bowing and turning a circle at a
   female who ignores him.

   The head is its own group so it can move independently of the
   body, which is the whole trick: a pigeon's head stays still in
   space while the body walks under it, then darts forward to a new
   fixed point. Everything else follows from that. */
(function () {
  'use strict';

  var yard = document.querySelector('[data-pigeons]');
  if (!yard) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var COUNT = Math.max(2, Math.min(4, Math.round(innerWidth / 420)));
  var STEP = 420;            /* one stride, in milliseconds */
  var birds = [];
  var busy = false;          /* one pigeon acts at a time; a yard is calm */

  function pigeonSVG(puff) {
    /* Rock pigeon in side profile, 46 by 32, standing on y 29.
       The landmarks that make it a pigeon and not a songbird: a long
       body rather than a ball, a back that slopes gently from nape to
       tail, a breast carried forward of the feet, a small head on a
       thick short neck, a stubby bill, and a broad tail angled down
       behind. The folded wing is drawn as a hairline of paper across
       the flank, the way a real one breaks the silhouette. */
    var b = puff * 0.9;
    var breast = 33 + b * 0.7;
    var belly = 21.4 + b * 0.5;
    return '<svg viewBox="0 0 46 30" fill="currentColor" aria-hidden="true">'
      /* Built from overlapping parts rather than one outline, the way
         a bird is built: a long body, a deep breast set forward, a
         small head, and a tail drawn first so it emerges from under
         the rump instead of sticking out of the flank. */
      + '<path class="pg-tail" d="M18 15.8 C13 17 8.6 18.2 4.6 19.6 L5.2 22.2 C9.6 21.8 14.2 21.2 18.4 20.6 Z"/>'
      + '<g class="pg-body">'
      + '<ellipse cx="21" cy="17" rx="9.4" ry="' + (6.1 + b * 0.5).toFixed(1) + '"'
      + ' transform="rotate(-6 21 17)"/>'
      + '<circle cx="27" cy="17.6" r="' + (5.6 + b * 0.4).toFixed(1) + '"/>'
      /* the nape: fills the hollow between crown and shoulder so the
         head reads as joined to the bird, not perched on it */
      + '<path d="M31.6 9.4 C29.4 10.6 27 12 24.4 12.6 C21.8 13.2 20 13.6 19 14.4'
      + ' L20.5 18 C24 16.4 28.4 14.6 31.8 13.2 Z"/>'
      + '</g>'
      /* the folded wing, a line of paper laid across the flank */
      + '<path class="pg-wing" d="M26.4 16.6 C22.6 18.4 18.6 19.2 14.8 19.2"'
      + ' stroke="var(--bg)" stroke-width="0.6" fill="none" opacity="0.4" stroke-linecap="round"/>'
      + '<path class="pg-leg" d="M21.4 22.6 L20.7 26.9 M20.7 26.9 L19.1 27.9 M20.7 26.9 L22.3 27.9 M20.7 26.9 L20.7 28"'
      + ' stroke="currentColor" stroke-width="0.85" fill="none" stroke-linecap="round"/>'
      + '<path class="pg-leg pg-leg-b" d="M25.4 22.6 L26 26.9 M26 26.9 L24.4 27.9 M26 26.9 L27.6 27.9 M26 26.9 L26 28"'
      + ' stroke="currentColor" stroke-width="0.85" fill="none" stroke-linecap="round"/>'
      + '<g class="pg-head">'
      + '<path d="M29.5 16 C29.2 13 30.4 11.2 32.4 10.4 L35.4 13.4 C34 15.2 31.6 16.4 29.5 16 Z"/>'
      + '<circle cx="33.6" cy="10.6" r="3.5"/>'
      + '<path d="M36.4 9.6 C38 9.8 39.2 10.4 39.5 11.2 C38.9 11.9 37.6 12.2 36.3 12.1 Z"/>'
      + '</g></svg>';
  }

  function place(p, x) {
    p.x = x;
    p.el.style.left = x + '%';
  }

  /* The gait: the head holds a fixed point while the body catches up,
     then the head darts to the next one. Two strides per call. */
  function walk(p, done) {
    var dir = p.face;
    var strides = 2 + Math.floor(Math.random() * 4);
    var span = strides * (1.1 + Math.random() * 0.5);
    var to = p.x + dir * span;
    if (to < 3 || to > 92) { turn(p, done); return; }
    p.el.animate(
      [{ translate: '0 0' }, { translate: (dir * span * yard.clientWidth / 100) + 'px 0' }],
      { duration: strides * STEP, easing: 'linear', fill: 'forwards' }
    ).finished.then(function () {
      place(p, to);
      p.el.style.translate = '';
      done();
    }).catch(done);
    /* head: still, then a dart forward, once per stride */
    var frames = [];
    for (var i = 0; i < strides; i++) {
      frames.push({ offset: i / strides, translate: (dir * -3.2) + 'px 0' });
      frames.push({ offset: (i + 0.42) / strides, translate: (dir * -3.2) + 'px 0' });
      frames.push({ offset: (i + 0.62) / strides, translate: '0 0' });
    }
    frames.push({ offset: 1, translate: '0 0' });
    p.head.animate(frames, { duration: strides * STEP, easing: 'ease-out' });
    /* body rocks a little over the legs */
    p.body.animate(
      [{ rotate: '0deg' }, { rotate: '1.6deg' }, { rotate: '0deg' }, { rotate: '-1.4deg' }, { rotate: '0deg' }],
      { duration: STEP, iterations: strides, easing: 'ease-in-out' }
    );
  }

  function turn(p, done) {
    p.face = -p.face;
    p.svg.animate(
      [{ scale: '1 1' }, { scale: '0.15 1' }, { scale: '1 1' }],
      { duration: 420, easing: 'ease-in-out' }
    );
    setTimeout(function () {
      p.svg.style.transform = p.face < 0 ? 'scaleX(-1)' : '';
      setTimeout(done, 220);
    }, 210);
  }

  function peck(p, done) {
    var n = 2 + Math.floor(Math.random() * 3);
    p.head.animate(
      [
        { rotate: '0deg', translate: '0 0' },
        { rotate: '58deg', translate: '-3px 7px' },
        { rotate: '58deg', translate: '-3px 7px' },
        { rotate: '0deg', translate: '0 0' },
      ],
      { duration: 520, iterations: n, easing: 'cubic-bezier(0.4, 0, 0.5, 1)' }
    ).finished.then(done).catch(done);
  }

  function preen(p, done) {
    p.head.animate(
      [
        { rotate: '0deg', translate: '0 0' },
        { rotate: '-128deg', translate: '-12px 4px' },
        { rotate: '-120deg', translate: '-13px 5px' },
        { rotate: '-132deg', translate: '-11px 3px' },
        { rotate: '0deg', translate: '0 0' },
      ],
      { duration: 1900, easing: 'ease-in-out' }
    ).finished.then(done).catch(done);
  }

  function puff(p, done) {
    p.body.animate(
      [{ scale: '1 1' }, { scale: '1.09 1.12' }, { scale: '1.02 1.03' }, { scale: '1 1' }],
      { duration: 1300, easing: 'ease-in-out' }
    );
    p.el.animate(
      [{ translate: '0 0' }, { translate: '0 -1px' }, { translate: '0 0' }],
      { duration: 1300, easing: 'ease-in-out' }
    ).finished.then(done).catch(done);
  }

  /* The bow and turn: chest out, head low, a full circle, repeated.
     The other pigeon carries on eating. */
  function court(p, done) {
    var rounds = 2;
    p.body.animate(
      [{ scale: '1 1' }, { scale: '1.12 1.14' }, { scale: '1.12 1.14' }, { scale: '1 1' }],
      { duration: 1500 * rounds, easing: 'ease-in-out' }
    );
    p.head.animate(
      [
        { rotate: '0deg', translate: '0 0' },
        { rotate: '34deg', translate: '-4px 5px' },
        { rotate: '-6deg', translate: '1px -1px' },
        { rotate: '34deg', translate: '-4px 5px' },
        { rotate: '0deg', translate: '0 0' },
      ],
      { duration: 1500, iterations: rounds, easing: 'ease-in-out' }
    );
    p.el.animate(
      [
        { translate: '0 0' }, { translate: '10px 0' },
        { translate: '14px 0' }, { translate: '4px 0' }, { translate: '0 0' },
      ],
      { duration: 1500, iterations: rounds, easing: 'ease-in-out' }
    ).finished.then(done).catch(done);
  }

  var ACTS = [
    { run: peck, weight: 34 },
    { run: walk, weight: 30 },
    { run: preen, weight: 14 },
    { run: puff, weight: 10 },
    { run: turn, weight: 8 },
    { run: court, weight: 4 },
  ];

  function pick() {
    var total = ACTS.reduce(function (a, x) { return a + x.weight; }, 0);
    var roll = Math.random() * total;
    for (var i = 0; i < ACTS.length; i++) {
      roll -= ACTS[i].weight;
      if (roll <= 0) return ACTS[i].run;
    }
    return peck;
  }

  function tick() {
    var wait = 1400 + Math.random() * 3600;
    setTimeout(function () {
      if (document.hidden || busy || !birds.length) { tick(); return; }
      busy = true;
      var p = birds[Math.floor(Math.random() * birds.length)];
      pick()(p, function () { busy = false; tick(); });
    }, wait);
  }

  var taken = [];
  function spot() {
    for (var tries = 0; tries < 40; tries++) {
      var x = 6 + Math.random() * 78;
      var clear = true;
      for (var i = 0; i < taken.length; i++) {
        if (Math.abs(taken[i] - x) < 9) { clear = false; break; }
      }
      if (clear) { taken.push(x); return x; }
    }
    var fallback = 6 + Math.random() * 78;
    taken.push(fallback);
    return fallback;
  }

  for (var i = 0; i < COUNT; i++) {
    var el = document.createElement('span');
    el.className = 'pigeon';
    var puffiness = Math.random();
    el.innerHTML = pigeonSVG(puffiness);
    var scale = 0.92 + Math.random() * 0.22;
    el.style.width = Math.round(46 * scale) + 'px';
    el.style.height = Math.round(30 * scale) + 'px';
    yard.appendChild(el);
    var p = {
      el: el,
      svg: el.querySelector('svg'),
      head: el.querySelector('.pg-head'),
      body: el.querySelector('.pg-body'),
      face: Math.random() < 0.5 ? -1 : 1,
      /* real flocks clump and leave gaps; even spacing reads as a fence */
      x: spot(),
    };
    if (p.face < 0) p.svg.style.transform = 'scaleX(-1)';
    place(p, p.x);
    birds.push(p);
  }
  tick();
})();
