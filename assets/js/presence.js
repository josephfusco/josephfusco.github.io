/* Presence: other readers of this page appear as bird-named crosshairs.
   Progressive enhancement — fails silently without the relay.
   Blueprint mode: the footer toggle x-rays the page. */
(function () {
  'use strict';

  /* The tab has presence too: the favicon dims when you step away */
  var icon = document.querySelector('link[rel="icon"]');
  if (icon) {
    var iconHome = icon.href;
    var iconAway = iconHome.replace('mark.svg', 'mark-away.svg');
    if (iconAway !== iconHome) {
      document.addEventListener('visibilitychange', function () {
        icon.href = document.hidden ? iconAway : iconHome;
      });
    }
  }

  /* Registry: every enhancement this site layers on, probed at runtime.
     Blueprint mode renders this registry as a live systems panel. */
  var FEATURES = [
    { label: 'view transitions', on: function () { return 'startViewTransition' in document; } },
    { label: 'speculation rules', on: function () { return !!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')); } },
    { label: 'scroll timelines', on: function () { return CSS.supports('animation-timeline: scroll()'); } },
    { label: 'scroll-state queries', on: function () { return CSS.supports('container-type: scroll-state'); } },
    { label: 'anchor positioning', on: function () { return CSS.supports('anchor-name: --a'); } },
    { label: 'sibling-index()', on: function () { return CSS.supports('animation-delay', 'calc(sibling-index() * 1ms)'); } },
    { label: 'light-dark()', on: function () { return CSS.supports('color', 'light-dark(#fff, #000)'); } },
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

  /* ---- Blueprint mode (x-rays in via a same-document view transition) ---- */
  var toggle = document.querySelector('.blueprint-toggle');
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', function () {
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

  function ensureLayer() {
    if (layer) return;
    layer = document.createElement('div');
    layer.className = 'presence-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
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
    if (label) label.textContent = p.name + STATE_META[s].suffix;
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

  function render() {
    var dh = docHeight();
    var instant = layer && layer.classList.contains('no-anim');
    peers.forEach(function (p) {
      if (!p.pos || !p.el) return;
      var x = p.pos.x * innerWidth;
      var y = p.pos.y * dh - scrollY;
      if (!instant && p.lastX != null) {
        var dx = x - p.lastX;
        var dy = y - p.lastY;
        p.el.classList.toggle('jump', dx * dx + dy * dy > JUMP_PX * JUMP_PX);
      }
      p.lastX = x;
      p.lastY = y;
      p.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      p.el.style.visibility = (y < -40 || y > innerHeight + 40) ? 'hidden' : 'visible';
    });
  }

  function updateCount() {
    var n = 0;
    peers.forEach(function (p) { if (!p.ghost) n++; });
    var haunted = peers.has(GHOST_ID);
    var label = n
      ? n + ' other ' + (n > 1 ? 'birds' : 'bird') + ' here with you'
      : 'just you here';
    if (haunted) label += ', plus a ghost';
    document.querySelectorAll('[data-presence-count]').forEach(function (el) {
      el.textContent = label;
    });
  }

  function addPeer(p) {
    ensureLayer();
    var entry = { name: p.name, color: p.color, pos: p.pos || null, state: p.state || 'active', el: cursorEl(p) };
    peers.set(p.id, entry);
    applyState(entry);
    reveal(entry, 3000);
  }

  /* Registry: every message the relay can send, and what it does */
  var MESSAGES = {
    welcome: function (m) { m.peers.forEach(addPeer); },
    join: function (m) { addPeer(m.peer); },
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
    leave: function (m) {
      var p = peers.get(m.id);
      if (p && p.el) p.el.remove();
      peers.delete(m.id);
    },
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
      peers.forEach(function (p, k) { if (!p.ghost && p.el) { p.el.remove(); peers.delete(k); } });
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
    ws.send(JSON.stringify({
      type: 'move',
      pos: { x: e.clientX / innerWidth, y: (e.clientY + scrollY) / docHeight() },
    }));
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
    pToggle.addEventListener('click', function () {
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
    var g = peers.get(GHOST_ID);
    if (g && g.el) g.el.remove();
    peers.delete(GHOST_ID);
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

  function scheduleHaunt(ms) {
    clearTimeout(ghostTimer);
    ghostTimer = setTimeout(haunt, ms);
  }

})();
