/* Presence: other readers of this page appear as bird-named crosshairs.
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
    { label: 'ghost archive', on: function () { return !!(window.__ghostSeen); } },
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
  if (reduced || !('WebSocket' in window)) return;

  /* Invisibility: a human off-switch. Respects Global Privacy Control. */
  var OFF_KEY = 'presence:off';
  var invisible = false;
  try {
    invisible = localStorage.getItem(OFF_KEY) === '1' || navigator.globalPrivacyControl === true;
  } catch (e) { /* storage unavailable */ }

  var DEV = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  var WS_URL = (DEV ? 'ws://' + location.hostname + ':4001' : 'wss://presence.josephfus.co/ws')
    + '?path=' + encodeURIComponent(location.pathname);
  var GHOST_URL = DEV ? 'http://' + location.hostname + ':4001/ghost' : 'https://presence.josephfus.co/ghost';

  var peers = new Map();
  var layer = null;
  var ws = null;
  var retry = 0;

  function docHeight() {
    return Math.max(document.documentElement.scrollHeight, innerHeight);
  }

  var wire = document.querySelector('.powerline');
  var PIGEON = '<svg viewBox="0 0 15 13" fill="currentColor" aria-hidden="true"><path d="M1 10.5 L4.5 8.2 C4 5.8 5.6 3.6 8.2 3.4 C9 2.2 10.6 1.9 11.6 2.6 C12 2.9 12.3 3.4 12.4 3.9 L14.6 4.6 L12.5 5.3 C12.3 7.8 10.5 9.6 8 9.8 L8.6 12.6 L7.6 12.2 L7 12.7 L6.4 9.7 C5.7 9.5 5 9.1 4.6 8.6 Z"/></svg>';
  /* The flock is not the cursors. Pigeons are the room's census:
     one per reader present, you included, perched where birds perch.
     Cursors stay human; pigeons stay birds. */
  var flock = new Map();
  var SLOTS = [0.14, 0.21, 0.29, 0.44, 0.57, 0.69, 0.8, 0.88, 0.36, 0.63, 0.75, 0.25];
  var slotCursor = 0;
  var navigatingAway = false;

  function curvePoint(t) {
    var x = (1 - t) * (1 - t) * 2.5 + 2 * t * (1 - t) * 55 + t * t * 100;
    var y = (1 - t) * (1 - t) * 3.6 + 2 * t * (1 - t) * 15 + t * t * 6.5;
    return { left: x, top: y * 2.8 - 19.5 };
  }

  function addPigeon(key) {
    if (!wire || flock.has(key)) return;
    var slot = SLOTS[slotCursor++ % SLOTS.length];
    var el = document.createElement('span');
    el.className = 'wire-bird';
    el.innerHTML = PIGEON;
    var pt = curvePoint(slot);
    el.style.left = pt.left + '%';
    el.style.top = pt.top + 'px';
    wire.appendChild(el);
    var bird = { el: el, flown: false, returnTimer: null };
    flock.set(key, bird);
    el.classList.add('land');
    el.addEventListener('animationend', function (e) {
      if (e.animationName === 'bird-land') el.classList.remove('land');
    });
  }

  function removePigeon(key) {
    var b = flock.get(key);
    if (!b) return;
    clearTimeout(b.returnTimer);
    if (b.el) b.el.remove();
    flock.delete(key);
  }

  function flyAway(bird, dir) {
    if (bird.flown || !bird.el) return;
    bird.flown = true;
    var el = bird.el;
    el.style.setProperty('--fx', (dir * (140 + Math.random() * 240)) + 'px');
    el.style.setProperty('--fy', (-(70 + Math.random() * 110)) + 'px');
    el.style.setProperty('--fr', (dir * (10 + Math.random() * 12)) + 'deg');
    el.classList.add('fly');
    var done = function (e) {
      if (e.animationName !== 'bird-fly') return;
      el.removeEventListener('animationend', done);
      el.classList.remove('fly');
      el.style.visibility = 'hidden';
      bird.returnTimer = setTimeout(function () {
        el.style.visibility = '';
        el.classList.add('land');
        bird.flown = false;
      }, 9000 + Math.random() * 16000);
    };
    el.addEventListener('animationend', done);
  }

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
    flock.forEach(function (b) { flyAway(b, Math.random() < 0.5 ? -1 : 1); });
    setTimeout(function () { location.href = a.href; }, 300);
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
    d.className = 'peer-cursor' + (peer.ghost ? ' ghost' : '');
    d.style.setProperty('--peer-color', peer.color);
    d.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none">' +
      '<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M12 0v5M12 19v5M0 12h5M19 12h5" stroke="currentColor" stroke-width="1.5"/>' +
      '</svg><span class="peer-label"></span>' +
      '<span class="typing" aria-hidden="true"><span></span><span></span><span></span></span>';
    d.querySelector('.peer-label').textContent = peer.name;
    d.style.visibility = 'hidden';
    layer.appendChild(d);
    return d;
  }

  /* Registry: every state a peer can be in, and how it renders */
  var STATE_META = {
    active: { suffix: '' },
    idle:   { suffix: ' · idle' },
    away:   { suffix: ' · away' },
    typing: { suffix: '' },
  };

  function applyState(p) {
    if (!p.el) return;
    var base = 'peer-cursor' + (p.ghost ? ' ghost' : '');
    var s = STATE_META[p.state] ? p.state : 'active';
    p.el.className = base
      + (s !== 'active' ? ' state-' + s : '')
      + (p.labelShown ? ' show-label' : '');
    var label = p.el.querySelector('.peer-label');
    if (label) {
      label.textContent = p.ghost
        ? p.name + STATE_META[s].suffix
        : (p.own ? 'you' : '') + STATE_META[s].suffix;
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

  function spawnTrail(x, y, color, ghost) {
    if (!layer) return;
    var t = document.createElement('span');
    t.className = 'trail' + (ghost ? ' trail-ghost' : '');
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
            spawnTrail(p.lastX, p.lastY, p.ghost ? '' : p.color, p.ghost);
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
      if (p.ghost) return;
      if (p.own) ownHere++; else n++;
    });
    var haunted = peers.has(GHOST_ID);
    var ownElsewhere = 0;
    for (var k in ownTabs) if (!peers.has(isNaN(+k) ? k : +k)) ownElsewhere++;
    var tabs = 1 + ownHere + ownElsewhere;
    var elsewhere = Math.max(0, censusTotal - 1 - n - ownHere - ownElsewhere);
    var label = n
      ? n + ' other' + (n > 1 ? 's' : '') + ' here with you'
      : 'just you here';
    if (tabs > 1) label += ', in ' + tabs + ' tabs';
    if (elsewhere) label += ', ' + elsewhere + ' elsewhere on the site';
    if (haunted) label += ', plus a ghost';
    if (!n && !haunted && !elsewhere && tabs === 1) label = 'just you here (a second tab makes two)';
    document.querySelectorAll('[data-presence-count]').forEach(function (el) {
      el.textContent = label;
    });
  }

  function addPeer(p) {
    ensureLayer();
    var entry = { name: p.name, color: p.color, pos: p.pos || null, state: p.state || 'active', el: cursorEl(p) };
    entry.svg = entry.el.querySelector('svg');
    entry.el.style.opacity = '0';
    if (!p.ghost) addPigeon(p.id);
    entry.dot = miniDot(p.ghost ? 'mini-ghost' : '', p.color);
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
      peers.forEach(function (p, k) { if (!p.ghost) removePeer(k, false); });
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
    if (!ws || ws.readyState !== 1) return;
    var now = Date.now();
    if (now - lastSent < 50) return;
    lastSent = now;
    checkStartle(e.clientX, e.clientY);
    selfPos = { x: e.clientX / innerWidth, y: (e.clientY + scrollY) / docHeight() };
    ws.send(JSON.stringify({ type: 'move', pos: selfPos }));
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
    pToggle.textContent = invisible ? '🕊 invisible' : '🕊 visible to others';
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
    if (!invisible) connect();
    scheduleHaunt(Math.random() < 0.25 ? 90000 : 4000 + Math.random() * 6000);
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

  /* ---- Ghosts: replay one past visitor's cursor timeline at a time ---- */
  var GHOST_ID = 'ghost';
  var ghostTimer = null;

  function ghostLabel(iso) {
    var d = new Date(iso);
    var mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
    var age = mins < 60 ? mins + 'm ago'
      : mins < 2880 ? Math.round(mins / 60) + 'h ago'
      : Math.round(mins / 1440) + 'd ago';
    var h = d.getHours();
    var tod = (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
    return 'a ghost from ' + tod + ', ' + age;
  }

  function endGhost() {
    removePeer(GHOST_ID, true);
    scheduleHaunt(15000 + Math.random() * 30000);
  }

  function playGhost(trace) {
    ensureLayer();
    var gname = ghostLabel(trace.recorded);
    peers.set(GHOST_ID, {
      name: gname,
      color: 'currentColor',
      ghost: true,
      state: 'active',
      pos: null,
      el: cursorEl({ name: gname, color: '', ghost: true }),
    });
    reveal(peers.get(GHOST_ID), 4000);
    var i = 0;
    var j = 0;
    var states = trace.states || [];
    function step() {
      if (i >= trace.points.length) { endGhost(); return; }
      var pt = trace.points[i];
      var g = peers.get(GHOST_ID);
      if (!g) return;
      g.pos = { x: pt[1], y: pt[2] };
      while (j < states.length && states[j][0] <= pt[0]) {
        g.state = states[j][1];
        applyState(g);
        j++;
      }
      render();
      i++;
      if (i < trace.points.length) {
        var dt = Math.min(Math.max(trace.points[i][0] - pt[0], 16), 3000); // cap long dwells
        ghostTimer = setTimeout(step, dt);
      } else {
        ghostTimer = setTimeout(endGhost, 1200);
      }
    }
    step();
  }

  function haunt() {
    if (document.hidden) { scheduleHaunt(30000); return; }
    fetch(GHOST_URL + '?path=' + encodeURIComponent(location.pathname))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (g) {
        if (g && g.points && g.points.length) { window.__ghostSeen = true; playGhost(g); }
        else scheduleHaunt(60000);
      })
      .catch(function () { scheduleHaunt(120000); });
  }

  var ghostTaskCtrl = null;

  function scheduleHaunt(ms) {
    clearTimeout(ghostTimer);
    if (ghostTaskCtrl) { ghostTaskCtrl.abort(); ghostTaskCtrl = null; }
    if (window.TaskController && window.scheduler && scheduler.postTask) {
      ghostTaskCtrl = new TaskController();
      scheduler.postTask(haunt, { delay: ms, priority: 'background', signal: ghostTaskCtrl.signal })
        .catch(function () { /* aborted */ });
    } else {
      ghostTimer = setTimeout(haunt, ms);
    }
  }

})();
