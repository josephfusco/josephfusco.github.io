/* Presence: other readers of this page appear as unnamed crosshairs.
   Progressive enhancement — fails silently without the relay.
   Blueprint mode: the footer toggle x-rays the page. */
(function () {
  'use strict';

  /* The tab has presence too. Before a bird is assigned: static orange,
     gray when hidden. After: the favicon wears this tab's own bird color,
     dims when you step away, and flashes when someone new arrives. */
  var icon = document.querySelector('link[rel="icon"]');
  var iconStaticHome = icon ? icon.href : '';
  var iconStaticAway = iconStaticHome.replace('mark.svg', 'mark-away.svg');
  var selfColor = null;
  var iconFlashTimer = null;
  var MARK_RECTS = "<rect x='350' y='250' width='100' height='100'/><rect x='50' y='350' width='100' height='100'/><rect x='50' y='450' width='100' height='100'/><rect x='150' y='450' width='100' height='100'/><rect x='250' y='450' width='100' height='100'/><rect x='250' y='350' width='100' height='100'/><rect x='250' y='250' width='100' height='100'/><rect x='250' y='150' width='100' height='100'/><rect x='250' y='50' width='100' height='100'/><rect x='350' y='50' width='100' height='100'/><rect x='450' y='50' width='100' height='100'/>";

  function markURI(color, dim) {
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'><g fill='" + color + "'"
      + (dim ? " opacity='0.45'" : "") + ">" + MARK_RECTS + "</g></svg>";
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function refreshIcon(flash) {
    if (!icon) return;
    if (!selfColor) {
      if (iconStaticAway !== iconStaticHome) icon.href = document.hidden ? iconStaticAway : iconStaticHome;
      return;
    }
    icon.href = markURI(selfColor, document.hidden && !flash);
  }

  function flashIcon() {
    if (!document.hidden) return;
    refreshIcon(true);
    clearTimeout(iconFlashTimer);
    iconFlashTimer = setTimeout(function () { refreshIcon(false); }, 3000);
  }

  document.addEventListener('visibilitychange', function () { refreshIcon(false); });

  /* Registry: every enhancement this site layers on, probed at runtime.
     Blueprint mode renders this registry as a live systems panel. */
  var FEATURES = [
    { label: 'view transitions', on: function () { return 'startViewTransition' in document; } },
    { label: 'speculation rules', on: function () { return !!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')); } },
    { label: 'scroll timelines', on: function () { return CSS.supports('animation-timeline: scroll()'); } },
    { label: 'view-transition classes', on: function () { return CSS.supports('view-transition-class', 'none'); } },
    { label: 'anchor positioning', on: function () { return CSS.supports('anchor-name: --a'); } },
    { label: 'sibling-index()', on: function () { return CSS.supports('animation-delay', 'calc(sibling-index() * 1ms)'); } },
    { label: '@starting-style', on: function () { return CSS.supports('transition-behavior', 'allow-discrete'); } },
    { label: 'invoker commands', on: function () { return typeof CommandEvent !== 'undefined'; } },
    { label: 'scheduler API', on: function () { return !!(window.scheduler && scheduler.postTask); } },
    { label: 'presence relay', on: function () { return !!(window.__presenceLive); } },
  ];

  function renderSystems() {
    var panel = document.querySelector('.blueprint-systems');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'blueprint-systems';
      panel.setAttribute('aria-hidden', 'true');
      document.body.appendChild(panel);
    }
    panel.innerHTML = '<b>systems</b>' + FEATURES.map(function (f) {
      var ok = false;
      try { ok = f.on(); } catch (e) { /* unsupported probe */ }
      return '<i>' + (ok ? '\u2713' : '\u00b7') + ' ' + f.label + '</i>';
    }).join('');
  }

  /* Invoker Commands where supported; plain clicks elsewhere */
  var COMMANDS_OK = typeof CommandEvent !== 'undefined';
  var commandBus = document.getElementById('main');

  function onActivate(btn, name, fn) {
    if (!btn) return;
    btn.hidden = false;
    if (COMMANDS_OK && commandBus && btn.hasAttribute('commandfor')) {
      commandBus.addEventListener('command', function (e) {
        if (e.command === name && e.source === btn) fn();
      });
    } else {
      btn.addEventListener('click', fn);
    }
  }

  /* ---- Blueprint mode (x-rays in via a same-document view transition) ---- */
  var toggle = document.querySelector('.blueprint-toggle');
  if (toggle) {
    onActivate(toggle, '--blueprint', function () {
      var flip = function () {
        var on = document.documentElement.toggleAttribute('data-blueprint');
        toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) renderSystems();
      };
      var noMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (document.startViewTransition && !noMotion) document.startViewTransition(flip);
      else flip();
    });
  }

  /* ---- Presence layer ---- */
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The signature writes itself, stroke by stroke, when the footer
     first comes into view. Skipped under reduced motion. */
  var ink = document.querySelector('.signature-ink');
  if (ink && !reduced && 'IntersectionObserver' in window) {
    ink.classList.add('will-sign');
    var inkIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          ink.classList.remove('will-sign');
          ink.classList.add('signing');
          inkIO.disconnect();
        }
      });
    }, { threshold: 0.4 });
    inkIO.observe(ink);
  }

  if (reduced || !('WebSocket' in window)) return;

  /* Invisibility: a human off-switch. Respects Global Privacy Control. */
  var OFF_KEY = 'presence:off';
  var invisible = false;
  try {
    invisible = localStorage.getItem(OFF_KEY) === '1' || navigator.globalPrivacyControl === true;
  } catch (e) { /* storage unavailable */ }

  var DEV = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  var WS_URL = (DEV ? 'ws://' + location.hostname + ':4001' : 'wss://' + location.host + '/ws')
    + '?path=' + encodeURIComponent(location.pathname);

  var peers = new Map();
  var lastCountLabel = null;
  var layer = null;
  var ws = null;
  var retry = 0;

  function docHeight() {
    return Math.max(document.documentElement.scrollHeight, innerHeight);
  }

  var wire = document.querySelector('.powerline');
    /* ---- The bird factory ----
     Six real wire birds of upstate New York. Each species pins the
     dials (puff, neck, tail, beak) to its field silhouette; individuals
     vary only inside their species envelope. share = how often it turns
     up, size relative to a pigeon, weight = pull on the wire, moves =
     its field-guide tell. */
  var SPECIES = [
    { name: 'Rock Pigeon',       share: 0.32, puff: [0.68, 0.9],  neck: [0.02, 0.08], tail: [0.75, 0.9],  beak: [0.85, 1.0],  size: [1.0, 1.12],  weight: 1.0,  moves: ['resettle', 'bob'] },
    { name: 'House Sparrow',     share: 0.18, puff: [0.62, 0.8],  neck: [0.0, 0.06],  tail: [0.8, 0.92],  beak: [0.82, 0.9],  size: [0.62, 0.7],  weight: 0.4,  moves: ['turn', 'headBob', 'bob', 'resettle'] },
    { name: 'Mourning Dove',     share: 0.16, puff: [0.42, 0.55], neck: [0.1, 0.18],  tail: [1.15, 1.3],  beak: [0.8, 0.88],  size: [0.88, 0.96], weight: 0.7,  moves: ['resettle'] },
    { name: 'European Starling', share: 0.14, puff: [0.28, 0.4],  neck: [0.22, 0.32], tail: [0.6, 0.68],  beak: [1.1, 1.2],   size: [0.76, 0.84], weight: 0.55, moves: ['turn', 'bob', 'headBob'] },
    { name: 'House Finch',       share: 0.12, puff: [0.55, 0.72], neck: [0.05, 0.12], tail: [0.85, 0.95], beak: [0.78, 0.86], size: [0.58, 0.66], weight: 0.35, moves: ['turn', 'bob', 'headBob', 'resettle'] },
    { name: 'Eastern Kingbird',  share: 0.08, puff: [0.3, 0.42],  neck: [0.35, 0.45], tail: [0.9, 1.0],   beak: [0.95, 1.05], size: [0.68, 0.76], weight: 0.5,  moves: ['turn', 'resettle', 'turn'] },
  ];
  function pickSpecies(r) {
    var roll = r(), acc = 0;
    for (var i = 0; i < SPECIES.length; i++) {
      acc += SPECIES[i].share;
      if (roll < acc) return SPECIES[i];
    }
    return SPECIES[0];
  }
  function makeBorb(rng, species) {
    var r = rng || Math.random;
    var sp = species || pickSpecies(r);
    function dial(range) { return range[0] + r() * (range[1] - range[0]); }
    var p = dial(sp.puff);
    var n = dial(sp.neck);
    var t = dial(sp.tail);
    var b = dial(sp.beak);
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
    var d = 'M' + f(tailX) + ' ' + f(tailY)
      + ' L4.5 ' + f(backY + 1.3)
      + ' C5.2 ' + f(backY - 0.1) + ' 6.6 ' + f(backY - 0.5) + ' ' + f(headCx - headR - 0.7) + ' ' + f(headCy + 0.7)
      + ' C' + f(headCx - headR + 0.1) + ' ' + f(headCy - headR) + ' ' + f(headCx + headR * 0.9) + ' ' + f(headCy - headR)
      + ' ' + f(headCx + headR) + ' ' + f(headCy + 0.1)
      + ' L' + f(beakX) + ' ' + f(beakY)
      + ' L' + f(headCx + headR * 0.75) + ' ' + f(beakY + 0.75)
      + ' C' + f(chestX) + ' ' + f(headCy + 2.6) + ' ' + f(chestX - 0.4) + ' ' + f(bellyY - 1.2) + ' 8.6 ' + f(bellyY)
      + ' L9.1 12.5 L8.1 12.1 L7.4 12.6 L6.9 ' + f(bellyY + 0.25)
      + ' C5.4 ' + f(bellyY + 0.3) + ' 4.5 ' + f(bellyY - 0.4) + ' 4.2 ' + f(backY + 3)
      + ' Z';
    return {
      svg: '<svg viewBox="0 0 15 13" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>',
      species: sp,
      size: dial(sp.size),
    };
  }

  var BIRD_BASE = 1.6; /* display scale: 15x13 viewBox to ~24x21px */

  /* In the air every bird is wings: two frames, alternated like a sprite */
  var WING_UP = 'M0.8 4.9 C2.6 2.7 5 1.6 6.9 1.9 C7.3 1.2 8.2 1 8.9 1.4 L10.9 0.7 L9.9 2.2 C11.7 2.2 13.6 3 14.6 4.6 C12.8 4.4 11.2 4.5 10 5.1 C9.6 7.3 8.3 8.6 6.9 8.8 L7.3 10.6 L6.4 10.2 L5.8 10.7 L5.4 8.7 C4.2 8.3 3.3 7.2 3.1 5.8 C2.3 5.5 1.5 5.2 0.8 4.9 Z';
  var WING_DOWN = 'M2.6 9.9 C3.4 8 4.6 6.9 6 6.5 C5.8 5 6.3 3.6 7.4 2.9 C7.9 2.2 8.8 2 9.5 2.4 L11.5 1.7 L10.4 3.2 C10.9 4.1 11 5.2 10.6 6.3 C11.9 6.9 12.9 8.2 13.4 10 C11.9 9.1 10.6 8.7 9.5 8.8 L9.8 10.9 L8.9 10.5 L8.3 11 L7.9 8.9 C6.9 8.9 5.9 9.2 2.6 9.9 Z';

  function flightSVG() {
    return '<svg viewBox="0 0 15 13" fill="currentColor" aria-hidden="true">'
      + '<path class="w-up" d="' + WING_UP + '"/>'
      + '<path class="w-down" d="' + WING_DOWN + '"/></svg>';
  }

  /* The wire: flat at rest, flexed by the weight of whoever perches */
  /* perBird is sag per pigeon-weight; lighter species pull less */
  var WIRE_GEOM = { y: 12, scale: 2.8, minSag: 0.6, perBird: 2.8, maxSag: 6.5 };
  var wirePathEl = document.querySelector('.wire-svg path');
  var currentSag = WIRE_GEOM.minSag;

  function setSag() {
    var load = 0;
    flock.forEach(function (b) { if (!b.flown) load += (b.weight || 1); });
    currentSag = Math.min(WIRE_GEOM.minSag + load * WIRE_GEOM.perBird, WIRE_GEOM.maxSag);
    if (wirePathEl) {
      wirePathEl.style.d = 'path("M0 ' + WIRE_GEOM.y + ' Q 50 ' + (WIRE_GEOM.y + currentSag) + ' 100 ' + WIRE_GEOM.y + '")';
    }
    flock.forEach(function (b) {
      if (b.flown || !b.el || b.slot == null) return;
      var pt = curvePoint(b.slot);
      b.el.style.left = pt.left + '%';
      b.el.style.top = (pt.top + b.topAdj) + 'px';
    });
  }

  /* Flight styles as data: [progress, fx, fy, rotate, opacity, scale].
     Every flight opens with the crouch: birds push off before they rise. */
  var FLIGHTS = [
    /* burst-climb, bobbing */
    [[0, 0, 0, 0, 1, 1], [0.07, 0.01, -0.025, 0, 1, 1.05],
     [0.2, 0.14, 0.5, 0.5, 1, 1], [0.38, 0.32, 0.68, 1, 1, 0.96],
     [0.56, 0.52, 0.62, 1, 1, 0.9], [0.75, 0.74, 0.95, 1, 0.9, 0.82],
     [1, 1, 1.15, 1, 0, 0.7]],
    /* the pigeon move: crouch, drop off the wire, swoop away */
    [[0, 0, 0, 0, 1, 1], [0.07, 0.01, -0.02, 0, 1, 1.05],
     [0.2, 0.09, -0.17, -0.6, 1, 1], [0.4, 0.32, -0.04, 0, 1, 0.95],
     [0.6, 0.58, 0.52, 1, 1, 0.86], [0.8, 0.8, 0.78, 1, 0.9, 0.78],
     [1, 1, 1, 1, 0, 0.68]],
  ];

  /* Static specimens anywhere in the page hydrate a named species:
     data-species is an index into SPECIES, drawn deterministically */
  document.querySelectorAll('[data-species]').forEach(function (el) {
    var i = parseInt(el.getAttribute('data-species'), 10) || 0;
    var sp = SPECIES[i % SPECIES.length];
    el.innerHTML = makeBorb(seedFrom('specimen:' + i), sp).svg;
    el.title = sp.name;
  });

  /* Seeded randomness: each page keeps its own regulars */
  function seedFrom(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 15), h | 1);
      h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
      return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* The flock is not the cursors. Pigeons are the room's census:
     one per reader present, you included, perched where birds perch.
     Cursors stay human; pigeons stay birds. */
  var flock = new Map();
  var SLOTS = (function () {
    var base = [0.14, 0.21, 0.29, 0.44, 0.57, 0.69, 0.8, 0.88, 0.36, 0.63, 0.75, 0.25];
    var r = seedFrom('slots:' + location.pathname);
    for (var i = base.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var tmp = base[i]; base[i] = base[j]; base[j] = tmp;
    }
    return base;
  })();
  var slotCursor = 0;
  var navigatingAway = false;

  function curvePoint(t) {
    var y = WIRE_GEOM.y + 2 * t * (1 - t) * currentSag;
    return { left: t * 100, top: y * WIRE_GEOM.scale - 19.5 };
  }

  function addPigeon(key) {
    if (!wire || flock.has(key)) return;
    var idx = slotCursor++;
    var slot = SLOTS[idx % SLOTS.length];
    var rng = seedFrom(location.pathname + ':' + (idx % SLOTS.length));
    var el = document.createElement('span');
    el.className = 'wire-bird';
    var born = makeBorb(rng);
    var markup = born.svg;
    el.innerHTML = markup;
    var scale = born.size * BIRD_BASE;
    el.style.width = Math.round(15 * scale) + 'px';
    el.style.height = Math.round(13 * scale) + 'px';
    var svgEl = el.querySelector('svg');
    var flip = rng() < 0.45;
    if (flip) svgEl.style.transform = 'scaleX(-1)';
    var pt = curvePoint(slot);
    el.style.left = pt.left + '%';
    el.style.top = (pt.top + (21 - Math.round(13 * scale))) + 'px';
    wire.appendChild(el);
    /* temperament comes with the species: doves sit, phoebes pump, sparrows hop */
    var moves = born.species.moves.map(function (k) { return MICRO[k]; });
    el.style.transformOrigin = '50% 100%';
    var bird = { el: el, svgEl: svgEl, scale: scale, markup: markup, flip: flip, slot: slot, topAdj: (21 - Math.round(13 * scale)), moves: moves, weight: born.species.weight, flown: false, returnTimer: null };
    flock.set(key, bird);
    /* the regulars fly home when you arrive */
    bird.flown = true;
    el.style.visibility = 'hidden';
    setTimeout(function () { arrive(bird, Math.random() < 0.5 ? -1 : 1); }, Math.random() * 700);
  }

  function removePigeon(key) {
    var b = flock.get(key);
    if (!b) return;
    clearTimeout(b.returnTimer);
    if (b.el) b.el.remove();
    flock.delete(key);
    setSag();
  }

  var WIRE_RECOIL = [
    { transform: 'translateY(0)' }, { transform: 'translateY(2.5px)' },
    { transform: 'translateY(-1.5px)' }, { transform: 'translateY(0.8px)' },
    { transform: 'translateY(0)' },
  ];

  /* Long flights hold a glide: flap-flap-flap, wings out, flap-flap */
  function scheduleGlide(el, dur) {
    if (dur < 680) return;
    setTimeout(function () {
      el.classList.add('glide');
      setTimeout(function () { el.classList.remove('glide'); }, 180 + Math.random() * 140);
    }, dur * (0.38 + Math.random() * 0.15));
  }

  function bounceWire() {
    var w = document.querySelector('.wire-svg');
    if (w) w.animate(WIRE_RECOIL, { duration: 620, easing: 'ease-out' });
    /* everything perched rides the same oscillation */
    flock.forEach(function (b) {
      if (!b.flown && b.el) b.el.animate(WIRE_RECOIL, { duration: 620, easing: 'ease-out' });
    });
  }

  function flyAway(bird, dir) {
    if (bird.flown || !bird.el) return;
    bird.flown = true;
    var el = bird.el;
    bird.lastDir = dir;
    setTimeout(setSag, 120);
    var flip = dir < 0 ? 'scaleX(-1)' : '';
    el.innerHTML = flightSVG();
    bird.svgEl = el.querySelector('svg');
    bird.svgEl.style.transform = flip;
    el.classList.add('airborne');
    /* smaller birds beat faster */
    el.style.setProperty('--flapms', Math.round(70 + bird.scale * 30) + 'ms');
    var fx = dir * (160 + Math.random() * 280);
    var fy = -(90 + Math.random() * 130);
    var fr = dir * (6 + Math.random() * 12);
    var dur = 620 + Math.random() * 320;
    var frames = FLIGHTS[Math.floor(Math.random() * FLIGHTS.length)].map(function (f) {
      return {
        offset: f[0],
        transform: 'translate(' + fx * f[1] + 'px,' + fy * f[2] + 'px) rotate(' + fr * f[3] + 'deg) scale(' + f[5] + ')',
        opacity: f[4],
      };
    });
    bounceWire();
    scheduleGlide(el, dur);
    var flight = el.animate(frames, { duration: dur, easing: 'cubic-bezier(0.18, 0.65, 0.45, 1)', fill: 'forwards' });
    flight.finished.then(function () {
      flight.cancel();
      el.classList.remove('airborne');
      el.style.visibility = 'hidden';
      bird.returnTimer = setTimeout(function () {
        arrive(bird, bird.lastDir || 1);
      }, 9000 + Math.random() * 16000);
    }).catch(function () { /* removed mid-flight */ });
  }

  /* An arrival is a takeoff reversed: in from the side it left,
     wings beating, decelerating into the perch. The wire takes the weight. */
  function arrive(bird, side) {
    if (!bird.el) return;
    var el = bird.el;
    var fx = side * (160 + Math.random() * 240);
    var fy = -(90 + Math.random() * 120);
    var fr = -side * (6 + Math.random() * 10);
    var dur = 700 + Math.random() * 260;
    el.innerHTML = flightSVG();
    bird.svgEl = el.querySelector('svg');
    var flip = side > 0 ? 'scaleX(-1)' : '';
    bird.svgEl.style.transform = flip;
    el.classList.add('airborne');
    el.style.setProperty('--flapms', Math.round(70 + bird.scale * 30) + 'ms');
    el.style.visibility = '';
    var frames = FLIGHTS[Math.floor(Math.random() * FLIGHTS.length)].slice().reverse().map(function (f) {
      return {
        offset: Math.round((1 - f[0]) * 100) / 100,
        transform: 'translate(' + fx * f[1] + 'px,' + fy * f[2] + 'px) rotate(' + fr * f[3] + 'deg) scale(' + f[5] + ')',
        opacity: f[4],
      };
    });
    var flight = el.animate(frames, { duration: dur, easing: 'cubic-bezier(0.3, 0.55, 0.3, 1)', fill: 'backwards' });
    scheduleGlide(el, dur);
    /* the flare: nose up just before the wire */
    setTimeout(function () {
      if (bird.svgEl) {
        bird.svgEl.animate(
          [{ transform: flip + ' rotate(0deg)' }, { transform: flip + ' rotate(' + (side * 14) + 'deg)' }, { transform: flip + ' rotate(0deg)' }],
          { duration: dur * 0.3, easing: 'ease-out' }
        );
      }
    }, dur * 0.68);
    flight.finished.then(function () {
      flight.cancel();
      el.classList.remove('airborne');
      el.innerHTML = bird.markup;
      bird.svgEl = el.querySelector('svg');
      bird.svgEl.style.transform = flip;
      bird.flown = false;
      bounceWire();
      setSag();
    }).catch(function () { /* removed mid-arrival */ });
  }

  /* Perched birds live a little: a turn, a bob, a resettle. Rare and small. */
  var MICRO = {
    turn: function (bird) {
      bird.el.animate(
        [{ translate: '0 0' }, { translate: '0 -3px' }, { translate: '0 0' }],
        { duration: 200, easing: 'ease-out' }
      );
      setTimeout(function () {
        bird.flip = !bird.flip;
        if (bird.svgEl) bird.svgEl.style.transform = bird.flip ? 'scaleX(-1)' : '';
      }, 100);
    },
    bob: function (bird) {
      bird.el.animate(
        [{ translate: '0 0' }, { translate: '0 1.5px' }, { translate: '0 0' }],
        { duration: 280, easing: 'ease-in-out' }
      );
    },
    resettle: function (bird) {
      bird.el.animate(
        [{ scale: '1 1' }, { scale: '1.05 0.93' }, { scale: '0.98 1.03' }, { scale: '1 1' }],
        { duration: 340, easing: 'ease-in-out' }
      );
    },
    /* the pigeon walk, in place */
    headBob: function (bird) {
      bird.el.animate(
        [{ translate: '0 0' }, { translate: '1.5px 0.8px' }, { translate: '0 0' },
         { translate: '1.5px 0.8px' }, { translate: '0 0' }],
        { duration: 540, easing: 'ease-in-out' }
      );
    },
  };

  setInterval(function () {
    if (document.hidden) return;
    var perched = [];
    flock.forEach(function (b) { if (!b.flown && b.el) perched.push(b); });
    if (!perched.length || Math.random() < 0.5) return;
    var bird = perched[Math.floor(Math.random() * perched.length)];
    var set = bird.moves || [MICRO.bob];
    set[Math.floor(Math.random() * set.length)](bird);
  }, 7500);

  /* A cursor that comes too close disturbs the bird */
  function checkStartle(cx, cy) {
    flock.forEach(function (bird) {
      if (bird.flown || !bird.el) return;
      var r = bird.el.getBoundingClientRect();
      if (!r.width) return;
      var bx = r.left + r.width / 2;
      var by = r.top + r.height / 2;
      var dx = cx - bx;
      var dy = cy - by;
      if (dx * dx + dy * dy < 2200) flyAway(bird, dx > 0 ? -1 : 1);
    });
  }

  /* A click that leaves the page startles the whole flock */
  document.addEventListener('click', function (e) {
    if (navigatingAway || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.origin !== location.origin) return;
    if (a.pathname === location.pathname && a.hash) return;
    var hasBirds = false;
    flock.forEach(function (b) { if (!b.flown) hasBirds = true; });
    if (!hasBirds || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    navigatingAway = true;
    var clickX = e.clientX || innerWidth / 2;
    flock.forEach(function (b) {
      var r = b.el && b.el.getBoundingClientRect();
      var dir = r && r.left + r.width / 2 > clickX ? 1 : -1;
      setTimeout(function () { flyAway(b, dir); }, Math.random() * 130);
    });
    setTimeout(function () { location.href = a.href; }, 420);
  });

  var minimap = document.querySelector('.stage-live');
  var selfDot = null;
  var selfPos = null;

  function ensureLayer() {
    if (layer) return;
    layer = document.createElement('div');
    layer.className = 'presence-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }

  function miniDot(cls, color) {
    if (!minimap) return null;
    var d = document.createElement('span');
    d.className = 'mini-dot' + (cls ? ' ' + cls : '');
    if (color) d.style.color = color;
    minimap.appendChild(d);
    return d;
  }

  function cursorEl(peer) {
    var d = document.createElement('div');
    d.className = 'peer-cursor';
    d.style.setProperty('--peer-color', peer.color);
    d.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none">' +
      '<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M12 0v5M12 19v5M0 12h5M19 12h5" stroke="currentColor" stroke-width="1.5"/>' +
      '</svg><span class="peer-label"></span>' +
      '<span class="typing" aria-hidden="true"><span></span><span></span><span></span></span>';
    d.style.visibility = 'hidden';
    layer.appendChild(d);
    return d;
  }

  /* Registry: every state a peer can be in, and how it renders */
  var STATE_META = {
    active: { suffix: '' },
    idle:   { suffix: ', idle' },
    away:   { suffix: ', away' },
    typing: { suffix: '' },
  };

  function applyState(p) {
    if (!p.el) return;
    var base = 'peer-cursor';
    var s = STATE_META[p.state] ? p.state : 'active';
    p.el.className = base
      + (s !== 'active' ? ' state-' + s : '')
      + (p.labelShown ? ' show-label' : '');
    var label = p.el.querySelector('.peer-label');
    if (label) {
      label.textContent = (p.own ? 'you' : '') + STATE_META[s].suffix;
    }
  }

  /* Labels appear on arrival, on state changes, and when movement resumes
     after a pause. Then they get out of the way of the words. */
  function reveal(p, ms) {
    if (!p.el) return;
    p.labelShown = true;
    p.el.classList.add('show-label');
    clearTimeout(p.revealTimer);
    p.revealTimer = setTimeout(function () {
      p.labelShown = false;
      if (p.el) p.el.classList.remove('show-label');
    }, ms || 2500);
  }

  var JUMP_PX = 260; // beyond this, teleport — no swoosh across other people's screens

  function spawnTrail(x, y, color) {
    if (!layer) return;
    var t = document.createElement('span');
    t.className = 'trail';
    if (color) t.style.color = color;
    t.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    layer.appendChild(t);
    t.addEventListener('animationend', function () { t.remove(); });
  }

  function render() {
    var dh = docHeight();
    var instant = layer && layer.classList.contains('no-anim');
    var now = Date.now();
    peers.forEach(function (p) {
      if (!p.pos || !p.el) return;
      var x = p.pos.x * innerWidth;
      var y = p.pos.y * dh - scrollY;
      var moved = false;
      if (!instant && p.lastX != null) {
        var dx = x - p.lastX;
        var dy = y - p.lastY;
        moved = dx !== 0 || dy !== 0;
        var jumped = dx * dx + dy * dy > JUMP_PX * JUMP_PX;
        p.el.classList.toggle('jump', jumped);
        if (moved && !jumped) {
          /* banking: the bird tilts into its turn, settles when it rests */
          if (p.svg) {
            var bank = Math.max(-8, Math.min(8, dx * 0.12));
            p.svg.style.rotate = bank + 'deg';
            clearTimeout(p.bankTimer);
            p.bankTimer = setTimeout(function () {
              if (p.svg) p.svg.style.rotate = '0deg';
            }, 260);
          }
          /* ink trail: a wake that evaporates */
          if (!p.lastTrailAt || now - p.lastTrailAt > 50) {
            p.lastTrailAt = now;
            spawnTrail(p.lastX, p.lastY, p.color);
          }
        }
      }
      p.lastX = x;
      p.lastY = y;
      p.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      var off = y < -40 || y > innerHeight + 40;
      p.el.style.visibility = off ? 'hidden' : 'visible';
      if (p.el.style.opacity === '0' && !off) p.el.style.opacity = '';
      /* the minimap: the Presence API card demos the live room */
      if (p.dot) {
        p.dot.style.left = (p.pos.x * 100) + '%';
        p.dot.style.top = (p.pos.y * 100) + '%';
      }
    });
    if (minimap && selfPos) {
      if (!selfDot) selfDot = miniDot('mini-self', '');
      if (selfDot) {
        selfDot.style.left = (selfPos.x * 100) + '%';
        selfDot.style.top = (selfPos.y * 100) + '%';
      }
    }
  }

  function updateCount() {
    var n = 0;
    var ownHere = 0;
    peers.forEach(function (p) {
      if (p.own) ownHere++; else n++;
    });
    var ownElsewhere = 0;
    for (var k in ownTabs) if (!peers.has(isNaN(+k) ? k : +k)) ownElsewhere++;
    var tabs = 1 + ownHere + ownElsewhere;
    var elsewhere = Math.max(0, censusTotal - 1 - n - ownHere - ownElsewhere);
    var label = n
      ? n + ' other' + (n > 1 ? 's' : '') + ' here with you'
      : 'just you here';
    if (tabs > 1) label += ', in ' + tabs + ' tabs';
    if (elsewhere) label += ', ' + elsewhere + ' elsewhere on the site';
    if (!n && !elsewhere && tabs === 1) label = 'just you here (a second tab makes two)';
    document.querySelectorAll('[data-presence-count]').forEach(function (el) {
      el.textContent = label;
    });
    /* The dot rests still; it pulses only when the room changes */
    if (label !== lastCountLabel) {
      var first = lastCountLabel === null;
      lastCountLabel = label;
      if (!first) document.querySelectorAll('.presence-dot').forEach(function (d) {
        d.classList.remove('tick');
        void d.offsetWidth;
        d.classList.add('tick');
      });
    }
  }

  function addPeer(p) {
    ensureLayer();
    var entry = { name: p.name, color: p.color, pos: p.pos || null, state: p.state || 'active', el: cursorEl(p) };
    entry.svg = entry.el.querySelector('svg');
    entry.el.style.opacity = '0';
    addPigeon(p.id);
    entry.dot = miniDot('', p.color);
    peers.set(p.id, entry);
    applyState(entry);
    reveal(entry, 3000);
  }

  /* Departures dissolve upward; everything a peer owns goes with them */
  function removePeer(id, gently) {
    var p = peers.get(id);
    if (!p) return;
    peers.delete(id);
    removePigeon(id);
    if (p.dot) p.dot.remove();
    clearTimeout(p.revealTimer);
    clearTimeout(p.bankTimer);
    if (!p.el) return;
    if (gently) {
      var el = p.el;
      el.classList.add('depart');
      setTimeout(function () { el.remove(); }, 520);
    } else {
      p.el.remove();
    }
  }

  var censusTotal = 0;
  var selfId = null;

  /* Your other tabs recognize each other; they are you, not strangers */
  var ownTabs = {};
  var bc = ('BroadcastChannel' in window) ? new BroadcastChannel('presence-tabs') : null;
  if (bc) {
    bc.onmessage = function (ev) {
      var d = ev.data || {};
      if (d.id == null || d.id === selfId) return;
      ownTabs[d.id] = Date.now();
      var p = peers.get(d.id);
      if (p && !p.own) { p.own = true; applyState(p); }
      updateCount();
    };
  }
  function announceSelf() {
    if (bc && selfId != null) bc.postMessage({ id: selfId });
  }
  setInterval(function () {
    announceSelf();
    var cutoff = Date.now() - 12000;
    for (var k in ownTabs) if (ownTabs[k] < cutoff) delete ownTabs[k];
  }, 5000);

  /* The seal stirs when someone walks in */
  function waveGlyph() {
    var mark = document.querySelector('.site-header .site-mark');
    if (!mark) return;
    mark.classList.add('wave-once');
    setTimeout(function () { mark.classList.remove('wave-once'); }, 1700);
  }

  /* Registry: every message the relay can send, and what it does */
  var MESSAGES = {
    welcome: function (m) {
      selfId = m.self && m.self.id;
      if (m.self && m.self.color) { selfColor = m.self.color; refreshIcon(false); }
      addPigeon('self');
      announceSelf();
      m.peers.forEach(addPeer);
    },
    join: function (m) {
      addPeer(m.peer);
      var id = m.peer.id;
      setTimeout(function () {
        var p = peers.get(id);
        if (ownTabs[id]) { if (p && !p.own) { p.own = true; applyState(p); updateCount(); } }
        else if (p) { waveGlyph(); flashIcon(); }
      }, 350);
    },
    census: function (m) { censusTotal = m.total || 0; },
    move: function (m) {
      var p = peers.get(m.id);
      if (!p) return;
      var now = Date.now();
      if (!p.lastMoveAt || now - p.lastMoveAt > 4000) reveal(p);
      p.lastMoveAt = now;
      p.pos = m.pos;
    },
    state: function (m) {
      var p = peers.get(m.id);
      if (p) { p.state = m.s; applyState(p); reveal(p); }
    },
    leave: function (m) { removePeer(m.id, true); },
  };

  function connect() {
    try { ws = new WebSocket(WS_URL); } catch (e) { return; }

    ws.onopen = function () {
      retry = 0;
      window.__presenceLive = true;
      ws.send(JSON.stringify({ type: 'hello', path: location.pathname }));
    };

    ws.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      var handle = MESSAGES[m.type];
      if (!handle) return;
      handle(m);
      updateCount();
      render();
    };

    ws.onclose = function () {
      peers.forEach(function (p, k) { removePeer(k, false); });
      censusTotal = 0;
      updateCount();
      if (!invisible && retry < 5) setTimeout(connect, 1000 * Math.pow(2, retry++));
    };
  }

  /* ---- My state: active / idle / away / typing ---- */
  var myState = 'active';
  var lastInput = Date.now();

  function sendState(s) {
    if (s === myState) return;
    myState = s;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'state', s: s }));
  }

  ['mousemove', 'keydown', 'scroll', 'touchstart', 'pointerdown'].forEach(function (ev) {
    addEventListener(ev, function () {
      lastInput = Date.now();
      if (!document.hidden && myState !== 'typing') sendState('active');
    }, { passive: true });
  });

  setInterval(function () {
    if (document.hidden || myState === 'typing') return;
    if (Date.now() - lastInput > 45000) sendState('idle');
  }, 5000);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { sendState('away'); }
    else { lastInput = Date.now(); sendState('active'); }
  });

  /* Typing: the fact of typing only — never what is typed */
  document.querySelectorAll('input[type="email"]').forEach(function (inp) {
    var tTimer;
    inp.addEventListener('input', function () {
      sendState('typing');
      clearTimeout(tTimer);
      tTimer = setTimeout(function () { sendState('active'); }, 3000);
    });
    inp.addEventListener('blur', function () {
      if (myState === 'typing') sendState('active');
    });
  });

  var lastSent = 0;
  addEventListener('mousemove', function (e) {
    var now = Date.now();
    if (now - lastSent < 50) return;
    lastSent = now;
    /* The birds are the reader's own business; only the broadcast
       needs the socket */
    checkStartle(e.clientX, e.clientY);
    selfPos = { x: e.clientX / innerWidth, y: (e.clientY + scrollY) / docHeight() };
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'move', pos: selfPos }));
    render();
  }, { passive: true });

  var scrollCalm;
  function instantRender() {
    if (layer) layer.classList.add('no-anim');
    render();
    clearTimeout(scrollCalm);
    scrollCalm = setTimeout(function () {
      if (layer) layer.classList.remove('no-anim');
    }, 120);
  }
  addEventListener('scroll', instantRender, { passive: true });
  addEventListener('resize', instantRender, { passive: true });

  /* ---- The off-switch ---- */
  var pToggle = document.querySelector('.presence-toggle');
  function reflectToggle() {
    if (!pToggle) return;
    pToggle.hidden = false;
    pToggle.setAttribute('aria-pressed', invisible ? 'true' : 'false');
    pToggle.innerHTML = '<span class="tool-glyph">\u2316</span> ' + (invisible ? 'invisible' : 'visible to others');
    pToggle.title = invisible
      ? 'Nobody can see your cursor and nothing is recorded. Click to rejoin.'
      : 'Others can see your cursor as an anonymous bird. Click to go invisible.';
  }
  reflectToggle();
  if (pToggle) {
    onActivate(pToggle, '--presence', function () {
      invisible = !invisible;
      try { localStorage.setItem(OFF_KEY, invisible ? '1' : '0'); } catch (e) { /* fine */ }
      reflectToggle();
      if (invisible) { if (ws) ws.close(); }
      else { retry = 0; connect(); }
    });
  }

  function beginPresence() {
    /* Your own bird perches whether or not the relay answers;
       the wire is never empty for the reader on it */
    addPigeon('self');
    updateCount();
    if (!invisible) connect();
  }

  /* Speculation-rules prerendered pages are not real visits: wait until shown */
  if (document.prerendering) {
    document.addEventListener('prerenderingchange', beginPresence, { once: true });
  } else {
    beginPresence();
  }

  /* bfcache restore: the old socket is dead and retries are spent — start over */
  addEventListener('pageshow', function (e) {
    if (e.persisted && !invisible && (!ws || ws.readyState > 1)) {
      retry = 0;
      connect();
    }
  });

})();
