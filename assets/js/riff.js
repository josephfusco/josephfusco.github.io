/* Riff's own player, at the foot of this page as it is at the foot of a
   WordPress one. Nothing of it is on the page until a track is pressed:
   then the kit script/build-riff.py wrote down (the markup, the settings,
   the names of its modules) is put in place and the stylesheets and
   scripts come from the Riff itself. The player keeps its queue for the
   tab, so a page opened while it holds one brings the player back. */
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
  var box = document.querySelector('[data-riff]');
  var list = box && box.querySelector('[data-riff-tracks]');
  if (!list) return;

  var API = box.getAttribute('data-riff') + 'wp-json/riff/v1/tracks?per_page=100&album=' + encodeURIComponent(box.getAttribute('data-riff-album'));
  var tracks = [];
  /* tracks the page leaves out of the album, by id */
  var without = (box.getAttribute('data-riff-without') || '').split(/[\s,]+/).filter(Boolean);

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

  /* closing the player says nothing; the rows look once Riff has let go */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-riff-action="dismiss"]')) setTimeout(mark, 0);
  });

  list.addEventListener('click', function (e) {
    var button = e.target.closest('[data-riff-play]');
    if (!button) return;
    var i = Number(button.getAttribute('data-riff-play'));
    player().then(function (riff) {
      if (i === at()) riff.toggle();
      else riff.play(tracks, i);
    }).catch(function () {
      /* no player to be had: the album still plays at the Riff */
      var link = box.querySelector('a[href]');
      if (link) location.href = link.href;
    });
  });

  /* Without the list there is nothing to press; the album's link above
     still goes to the Riff. */
  fetch(API)
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (data) {
      tracks = (data.items || []).filter(function (t) {
        return t && t.src && t.type === 'audio' && !t.locked && without.indexOf(String(t.id)) < 0;
      });
      if (!tracks.length) return Promise.reject();
      render();
    })
    .catch(function () { list.remove(); });
})();
