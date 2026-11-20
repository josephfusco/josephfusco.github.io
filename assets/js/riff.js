/* Riff's own player, at the foot of this page as it is at the foot of a
   WordPress one. Nothing of it is on the page until a track is pressed:
   then the kit script/build-riff.py wrote down (the markup, the settings,
   the names of its modules) is put in place and the stylesheets and
   scripts come from the Riff itself. The player keeps its queue for the
   tab, so a page opened while it holds one brings the player back.
   While it holds one, a link on this site is followed without leaving
   the page: a page that loads takes the audio with it, and the song
   would stop and start. */
(function () {
  var KIT = '/assets/riff/kit.json';
  var ready = null;

  function add(tag, attrs, parent) {
    return new Promise(function (done, fail) {
      var el = document.createElement(tag);
      Object.keys(attrs).forEach(function (k) { el[k] = attrs[k]; });
      el.onload = done;
      el.onerror = fail;
      (parent || document.head).appendChild(el);
    });
  }

  /* The order WordPress keeps: styles, the player's markup and settings,
     the import map before any module, wp.hooks and the rest one after
     another, and the module last. */
  function player() {
    if (ready) return ready;
    ready = fetch(KIT)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (kit) {
        return Promise.all(kit.styles.map(function (href) {
          return add('link', { rel: 'stylesheet', href: href });
        })).then(function () {
          var map = document.createElement('script');
          map.type = 'importmap';
          map.textContent = JSON.stringify({ imports: kit.imports });
          document.head.appendChild(map);

          var data = document.createElement('script');
          data.type = 'application/json';
          data.id = 'riff-data';
          data.textContent = JSON.stringify(kit.data);
          document.body.appendChild(data);

          var holder = document.createElement('template');
          holder.innerHTML = kit.root;
          /* Riff closes its player from Up next, on a phone. Here the bar
             gets a button of its own for it, which asks Riff to do the
             same: stop, empty the queue and forget it, so the next page
             opens without a player. */
          var end = holder.content.querySelector('.riff-bar-end');
          if (end) {
            end.insertAdjacentHTML('beforeend', '<button type="button" class="riff-btn riff-close-player" data-riff-action="dismiss" aria-label="Close player">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.75 6.75L17.25 17.25M17.25 6.75L6.75 17.25"/></svg></button>');
          }
          document.body.appendChild(holder.content);

          return kit.scripts.reduce(function (before, src) {
            return before.then(function () { return add('script', { src: src }, document.body); });
          }, Promise.resolve());
        }).then(function () {
          return new Promise(function (done, fail) {
            document.addEventListener('riff:ready', function () { done(window.riff); }, { once: true });
            add('script', { type: 'module', src: kit.module }, document.body).catch(fail);
          });
        });
      });
    return ready;
  }

  /* a queue kept from the page before: the player comes back for it, once
     the page is really being looked at */
  function kept() {
    try { return !!sessionStorage.getItem('riff:state'); } catch (e) { return false; }
  }
  function back() { if (kept()) player().catch(function () {}); }
  if (document.prerendering) document.addEventListener('prerenderingchange', back, { once: true });
  else back();

  /* ---- An album's rows, where a page lists one ---- */
  var box = null;
  var list = null;
  var tracks = [];
  /* tracks the page leaves out of the album, by id */
  var without = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* an apostrophe is an apostrophe, not a foot mark */
  function title(t) {
    return String(t.title || '').replace(/(\w)'(\w)/g, '$1’$2');
  }

  function clock(s) {
    s = Math.max(0, Math.round(s || 0));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function render() {
    list.innerHTML = tracks.map(function (t, i) {
      return '<li><button type="button" data-riff-play="' + i + '" aria-pressed="false" aria-label="Play ' + esc(title(t)) + '">' +
        '<span class="riff-mark" aria-hidden="true">' + (i + 1) + '</span>' + esc(title(t)) + '</button>' +
        '<time datetime="PT' + Math.round(t.duration || 0) + 'S">' + clock(t.duration) + '</time></li>';
    }).join('');
    list.removeAttribute('aria-busy');
    mark();
  }

  /* which of these rows the player holds, if any, and whether it plays */
  function at() {
    var now = window.riff && window.riff.current();
    return now ? tracks.findIndex(function (t) { return String(t.id) === String(now.id); }) : -1;
  }

  function mark() {
    if (!list) return;
    var on = at();
    var playing = on > -1 && window.riff.playing();
    [].forEach.call(list.querySelectorAll('[data-riff-play]'), function (button, i) {
      if (i === on) button.parentNode.setAttribute('aria-current', 'true');
      else button.parentNode.removeAttribute('aria-current');
      button.setAttribute('aria-pressed', i === on && playing ? 'true' : 'false');
      button.setAttribute('aria-label', (i === on && playing ? 'Pause ' : 'Play ') + title(tracks[i]));
    });
  }
  ['ready', 'track', 'play', 'pause', 'ended', 'queue'].forEach(function (name) {
    document.addEventListener('riff:' + name, mark);
  });

  document.addEventListener('click', function (e) {
    /* closing the player says nothing; the rows look once Riff has let go */
    if (e.target.closest('[data-riff-action="dismiss"]')) setTimeout(mark, 0);

    var button = list && e.target.closest('[data-riff-play]');
    if (!button || !list.contains(button)) return;
    var i = Number(button.getAttribute('data-riff-play'));
    var here = box;
    var these = tracks;
    player().then(function (riff) {
      if (these === tracks && i === at()) riff.toggle();
      else riff.play(these, i);
    }).catch(function () {
      /* no player to be had: the album still plays at the Riff */
      var link = here.querySelector('a[href]');
      if (link) location.href = link.href;
    });
  });

  /* The album of the page showing. Without the list there is nothing to
     press; the album's link above still goes to the Riff. */
  function album() {
    box = document.querySelector('[data-riff]');
    list = box && box.querySelector('[data-riff-tracks]');
    tracks = [];
    if (!list) return;
    var mine = list;
    without = (box.getAttribute('data-riff-without') || '').split(/[\s,]+/).filter(Boolean);
    fetch(box.getAttribute('data-riff') + 'wp-json/riff/v1/tracks?per_page=100&album=' + encodeURIComponent(box.getAttribute('data-riff-album')))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        var found = (data.items || []).filter(function (t) {
          return t && t.src && t.type === 'audio' && !t.locked && without.indexOf(String(t.id)) < 0;
        });
        if (!found.length) return Promise.reject();
        /* another page may be showing by the time the Riff answers */
        if (mine !== list) return;
        tracks = found;
        render();
      })
      .catch(function () { mine.remove(); });
  }
  album();

  /* ---- A link followed without leaving the page ----
     Only <main> changes hands, so the header, the footer and the player
     after them stay as they are, and the one <audio> never stops. With
     no queue in the player a link loads its page, as a link does. */
  var main = document.getElementById('main');
  /* the page's own class on <body>, before Riff adds any of its own */
  var own = document.body.className;
  var shown = location.pathname + location.search;
  var turn = 0;
  /* a page the wire's script has to start on: it is always loaded */
  var LOADED = '[data-flock-stage], [data-ambient]';
  /* what stays, and still says which page this is */
  var CURRENT = '.site-nav a, .footer-tools a';
  var HEAD = ['link[rel="canonical"]', 'meta[name="description"]'];

  function holding() {
    return !!(window.riff && window.riff.current());
  }

  function bring(url, done, fail) {
    var mine = ++turn;
    var landed = url.href;
    /* A folder asked for without its slash is sent on to the address
       with one, and the host sends it there over http, which a page on
       https may not fetch. So a bare path that fails is asked for
       again as the folder it may be. */
    var bare = !/\/$|\.[a-z0-9]+$/i.test(url.pathname);
    var folder = url.origin + url.pathname + '/' + url.search;
    fetch(url.href, { headers: { Accept: 'text/html' } })
      .catch(function (e) {
        if (!bare) throw e;
        landed = folder + url.hash;
        return fetch(folder, { headers: { Accept: 'text/html' } });
      })
      .then(function (r) {
        if (!r.ok || !/^text\/html/.test(r.headers.get('content-type') || '')) return Promise.reject();
        if (r.redirected && r.url.indexOf(location.origin + '/') === 0) landed = r.url.split('#')[0] + url.hash;
        return r.text();
      })
      .then(function (html) {
        if (mine !== turn) return;
        var next = new DOMParser().parseFromString(html, 'text/html');
        var content = next.getElementById('main');
        if (!content || next.querySelector(LOADED)) return Promise.reject();
        done(next, content, landed);
      })
      .catch(function () { if (mine === turn) fail(); });
  }

  function show(next, content) {
    document.title = next.title;
    own.split(/\s+/).filter(Boolean).forEach(function (c) { document.body.classList.remove(c); });
    own = next.body.className;
    own.split(/\s+/).filter(Boolean).forEach(function (c) { document.body.classList.add(c); });
    HEAD.forEach(function (sel) {
      var theirs = next.head.querySelector(sel);
      var ours = document.head.querySelector(sel);
      if (theirs && ours) ours.replaceWith(document.importNode(theirs, true));
    });
    var theirs = next.querySelectorAll(CURRENT);
    [].forEach.call(document.querySelectorAll(CURRENT), function (a, i) {
      if (theirs[i] && theirs[i].hasAttribute('aria-current')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var note = document.querySelector('.field-note');
    var their = next.querySelector('.field-note');
    if (note && their) note.classList.toggle('field-note--after-trail', their.classList.contains('field-note--after-trail'));

    main.innerHTML = content.innerHTML;
    /* a script set down as markup does not run; one made here does */
    [].forEach.call(main.querySelectorAll('script'), function (old) {
      if (old.type && !/javascript|module/.test(old.type)) return;
      var fresh = document.createElement('script');
      [].forEach.call(old.attributes, function (a) { fresh.setAttribute(a.name, a.value); });
      fresh.textContent = old.textContent;
      old.replaceWith(fresh);
    });
    shown = location.pathname + location.search;
    album();
    /* presence.js moves to the new page's room on this */
    document.dispatchEvent(new CustomEvent('site:page'));
  }

  /* the change is drawn as a page that loads is drawn, where the browser can */
  function drawn(change) {
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return change();
    var t = document.startViewTransition(change);
    t.ready.catch(function () {});
    t.finished.catch(function () {});
  }

  /* true when the link is taken here; false leaves it to the browser */
  function go(href) {
    var url = new URL(href, location.href);
    if (!main || !holding() || url.origin !== location.origin || document.querySelector(LOADED)) return false;
    /* from here on the scroll is kept by hand, for the way back */
    history.scrollRestoration = 'manual';
    history.replaceState({ y: scrollY }, '');
    bring(url, function (next, content, landed) {
      drawn(function () {
        history.pushState({ y: 0 }, '', landed);
        show(next, content);
        var target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (target) target.scrollIntoView();
        else scrollTo({ top: 0, behavior: 'instant' });
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      });
    }, function () { location.href = url.href; });
    return true;
  }
  /* presence.js sends its birds off before a link is followed, and asks here */
  window.siteGo = go;

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
    if (a.pathname + a.search === shown && a.hash) return;
    if (go(a.href)) e.preventDefault();
  });

  /* back and forward, among the pages brought in this way */
  addEventListener('popstate', function (e) {
    if (location.pathname + location.search === shown) return;
    var y = (e.state && e.state.y) || 0;
    bring(new URL(location.href), function (next, content) {
      drawn(function () {
        show(next, content);
        scrollTo({ top: y, behavior: 'instant' });
      });
    }, function () { location.reload(); });
  });

  var settle = null;
  addEventListener('scroll', function () {
    if (history.scrollRestoration !== 'manual') return;
    clearTimeout(settle);
    settle = setTimeout(function () { history.replaceState({ y: scrollY }, ''); }, 150);
  }, { passive: true });
})();
