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

  /* These are the birds from the wire, standing on the ground. The
     geometry is the factory's, dial for dial, including the small
     feet at the base of the path; a pigeon's legs are short and half
     hidden under it anyway. The only change is the seam: the same
     closed outline is split along the neck so the head can hold
     still in space while the body walks under it, which is the whole
     of a pigeon's gait. */
  function pigeonSVG(puff) {
    var p = 0.68 + puff * 0.2;
    var n = 0.02 + puff * 0.06;
    var t = 0.75 + puff * 0.14;
    var b = 0.85 + puff * 0.14;
    var backY = 4.6 - n * 1.4 + p * 0.4;
    var headR = 1.5 - p * 0.25;
    var headCx = 8.7 + n * 0.3;
    var headCy = backY - 0.4 - n * 1.5;
    var beakX = headCx + headR + 1.3 * b;
    var beakY = headCy + 0.25;
    var bellyY = 9.7 + p * 0.9;
    var chestX = 10.3 + p * 0.6;
    var tailX = 1.9 - t * 1.2;
    var tailY = backY + 2.2 + t * 2.6;
    function f(v) { return Math.round(v * 100) / 100; }

    var ax = headCx - headR - 0.7, ay = headCy + 0.7;   /* nape */
    var bx = headCx + headR * 0.75, by = beakY + 0.75;  /* throat */

    var head = 'M' + f(ax) + ' ' + f(ay)
      + ' C' + f(headCx - headR + 0.1) + ' ' + f(headCy - headR)
      + ' ' + f(headCx + headR * 0.9) + ' ' + f(headCy - headR)
      + ' ' + f(headCx + headR) + ' ' + f(headCy + 0.1)
      + ' L' + f(beakX) + ' ' + f(beakY)
      + ' L' + f(bx) + ' ' + f(by)
      + ' C' + f(bx - 0.5) + ' ' + f(by + 1.3) + ' ' + f(ax + 0.5) + ' ' + f(ay + 1.7)
      + ' ' + f(ax) + ' ' + f(ay) + ' Z';

    var body = 'M' + f(tailX) + ' ' + f(tailY)
      + ' L4.5 ' + f(backY + 1.3)
      + ' C5.2 ' + f(backY - 0.1) + ' 6.6 ' + f(backY - 0.5) + ' ' + f(ax) + ' ' + f(ay)
      + ' C' + f(ax + 0.5) + ' ' + f(ay + 1.6) + ' ' + f(bx - 0.5) + ' ' + f(by + 1.2)
      + ' ' + f(bx) + ' ' + f(by)
      + ' C' + f(chestX) + ' ' + f(headCy + 2.6) + ' ' + f(chestX - 0.4) + ' ' + f(bellyY - 1.2)
      + ' 8.6 ' + f(bellyY)
      + ' C8.2 ' + f(bellyY + 0.4) + ' 7.6 ' + f(bellyY + 0.35) + ' 6.9 ' + f(bellyY + 0.25)
      + ' C5.4 ' + f(bellyY + 0.3) + ' 4.5 ' + f(bellyY - 0.4) + ' 4.2 ' + f(backY + 3) + ' Z';

    /* short legs in place of the wire grip: a pigeon stands low */
    var foot = 12.5;
    function leg(hx, tilt) {
      return '<path class="pg-leg" d="M' + f(hx) + ' ' + f(bellyY) + ' L' + f(hx + tilt) + ' ' + foot
        + ' M' + f(hx + tilt) + ' ' + foot + ' L' + f(hx + tilt - 0.6) + ' ' + (foot + 0.42)
        + ' M' + f(hx + tilt) + ' ' + foot + ' L' + f(hx + tilt + 0.6) + ' ' + (foot + 0.42)
        + ' M' + f(hx + tilt) + ' ' + foot + ' L' + f(hx + tilt) + ' ' + (foot + 0.45) + '"'
        + ' stroke="currentColor" stroke-width="0.34" fill="none" stroke-linecap="round"/>';
    }

    return '<svg viewBox="0 0 15 13.4" fill="currentColor" aria-hidden="true">'
      + leg(7.1, -0.25) + leg(8.5, 0.2)
      + '<path class="pg-body" d="' + body + '"/>'
      + '<g class="pg-head"><path d="' + head + '"/></g>'
      + '</svg>';
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
    var move = p.el.animate(
      [{ translate: '0 0' }, { translate: (dir * span * yard.clientWidth / 100) + 'px 0' }],
      { duration: strides * STEP, easing: 'linear', fill: 'forwards' }
    );
    move.finished.then(function () {
      /* set the new home before releasing the animation, or the bird
         snaps back for a frame and reads as a jump */
      p.el.style.left = to + '%';
      p.x = to;
      move.cancel();
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
      [{ rotate: '0deg' }, { rotate: '0.8deg' }, { rotate: '0deg' }, { rotate: '-0.7deg' }, { rotate: '0deg' }],
      { duration: STEP, iterations: strides, easing: 'ease-in-out' }
    );
  }

  function turn(p, done) {
    p.face = -p.face;
    /* a pigeon turns by shuffling round, so the body narrows as it
       comes side on and widens again facing the other way */
    p.svg.animate(
      [
        { scale: '1 1' }, { scale: '0.62 1.02' },
        { scale: '0.34 1.03' }, { scale: '0.66 1.02' }, { scale: '1 1' },
      ],
      { duration: 760, easing: 'ease-in-out' }
    );
    p.el.animate(
      [{ translate: '0 0' }, { translate: '0 -0.5px' }, { translate: '0 0' }],
      { duration: 760, easing: 'ease-in-out' }
    );
    setTimeout(function () {
      p.svg.style.transform = p.face < 0 ? 'scaleX(-1)' : '';
    }, 380);
    setTimeout(done, 800);
  }

  function peck(p, done) {
    var n = 2 + Math.floor(Math.random() * 3);
    var beat = 620;
    p.head.animate(
      [
        { offset: 0, rotate: '0deg', translate: '0 0' },
        { offset: 0.32, rotate: '44deg', translate: '-2px 6px' },
        { offset: 0.46, rotate: '46deg', translate: '-2px 6.5px' },
        { offset: 0.8, rotate: '0deg', translate: '0 0' },
        { offset: 1, rotate: '0deg', translate: '0 0' },
      ],
      { duration: beat, iterations: n, easing: 'ease-in-out' }
    );
    /* the whole bird tips a little with the head, as it must */
    p.body.animate(
      [
        { offset: 0, rotate: '0deg' },
        { offset: 0.32, rotate: '5deg' },
        { offset: 0.8, rotate: '0deg' },
        { offset: 1, rotate: '0deg' },
      ],
      { duration: beat, iterations: n, easing: 'ease-in-out' }
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
    var scale = 2.6 + Math.random() * 0.5;
    el.style.width = Math.round(15 * scale) + 'px';
    el.style.height = Math.round(13.4 * scale) + 'px';
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
