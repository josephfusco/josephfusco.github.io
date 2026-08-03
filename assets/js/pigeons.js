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
    /* Side view in a 34 by 26 box, ground at y 23. Rock pigeon
       proportions: a deep barrel chest carried low on short legs, a
       small round head on a thick short neck, a stubby bill, and a
       tail about a third of the body held just clear of the ground. */
    var b = puff * 0.9;                       /* how puffed this one is */
    var chest = 25.4 + b * 0.5;
    var belly = 18.4 + b * 0.4;
    return '<svg viewBox="0 0 34 26" fill="currentColor" aria-hidden="true">'
      /* tail: broad and flat, carried nearly level, a third of the bird */
      + '<path class="pg-tail" d="M10.6 12.4 L1.2 14.8 L1.5 17.8 L11.2 16.4 Z"/>'
      /* body: shoulder high at the back, deep chest forward and low */
      + '<path class="pg-body" d="M10.2 13'
      + ' C10 9.6 13.4 7.2 17.8 7.2'
      + ' C21.6 7.2 24.4 9 ' + chest.toFixed(1) + ' 11.6'
      + ' C26.2 14 24.8 16.6 21.6 17.8'
      + ' C18.4 19 14 19 12 ' + belly.toFixed(1)
      + ' C10.6 16.4 10.2 14.8 10.2 13 Z"/>'
      /* legs: short, set back, three toes forward */
      + '<path class="pg-leg" d="M15.8 18.4 L15 22.3 M15 22.3 L13.3 23.2 M15 22.3 L16.7 23.2 M15 22.3 L15 23.3"'
      + ' stroke="currentColor" stroke-width="0.85" fill="none" stroke-linecap="round"/>'
      + '<path class="pg-leg pg-leg-b" d="M19.6 18.4 L20.1 22.3 M20.1 22.3 L18.4 23.2 M20.1 22.3 L21.8 23.2 M20.1 22.3 L20.1 23.3"'
      + ' stroke="currentColor" stroke-width="0.85" fill="none" stroke-linecap="round"/>'
      /* head, neck and bill as one continuous shape, its base buried
         in the shoulders so no seam shows when the head moves */
      + '<g class="pg-head">'
      + '<path d="M20.6 13.8'
      + ' C20.4 10.8 21.8 8.4 24.2 7.2'
      + ' C26.2 6.2 28.6 6.4 29.6 8'
      + ' L31.9 8.7 L29.5 9.7'
      + ' C28.8 11 27 12.1 24.6 12.9'
      + ' C23.2 13.4 21.6 14.1 20.6 13.8 Z"/>'
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

  for (var i = 0; i < COUNT; i++) {
    var el = document.createElement('span');
    el.className = 'pigeon';
    var puffiness = Math.random();
    el.innerHTML = pigeonSVG(puffiness);
    var scale = 0.92 + Math.random() * 0.22;
    el.style.width = Math.round(34 * scale) + 'px';
    el.style.height = Math.round(26 * scale) + 'px';
    yard.appendChild(el);
    var p = {
      el: el,
      svg: el.querySelector('svg'),
      head: el.querySelector('.pg-head'),
      body: el.querySelector('.pg-body'),
      face: Math.random() < 0.5 ? -1 : 1,
      x: 8 + i * (74 / COUNT) + Math.random() * 8,
    };
    if (p.face < 0) p.svg.style.transform = 'scaleX(-1)';
    place(p, p.x);
    birds.push(p);
  }
  tick();
})();
