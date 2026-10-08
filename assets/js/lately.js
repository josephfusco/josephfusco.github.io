/* Lately, read in the reader's moment: skeleton first, the .org feed
   when it answers, the build-time record when it does not. */
(function () {
  var list = document.querySelector('[data-lately]');
  if (!list) return;

  var API = location.hostname === 'josephfus.co'
    ? '/wp-activity'
    : 'https://josephfus.co/wp-activity';

  /* the .org feed arrives with its entities intact: decode once, then
     escape on the way into the page */
  var decoder = document.createElement('textarea');
  function decode(s) {
    decoder.innerHTML = String(s == null ? '' : s);
    return decoder.value;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Releases and the SVN sync that follows each one say the same
     thing as the work they ship; they are bookkeeping, not work. */
  var NOISE = [
    /^chore\(main\): release\b/i,
    /^update to version \S+ from github$/i
  ];

  /* What was done, said plainly: no commit-type prefix, no pin. */
  function clean(s) {
    s = s.replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF\uFE0F\s]+/, '');
    s = s.replace(/^[a-z][\w-]*(?:\([^)]*\))?!?:\s+/, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function render(items) {
    var html = '';
    var day = '';
    var seen = {};
    var shown = 0;
    items.forEach(function (it) {
      if (shown >= 12) return;
      /* Two shapes come back: a title with a verb phrase beside it, or
         the whole sentence in what with subject left empty. Keep only
         what it was done to; the verb is the same handful every day. */
      var subject = decode(it.subject).trim();
      var what = decode(it.what).trim();
      if (!subject) {
        var split = what.match(/^([^:]{3,60}):\s+([\s\S]+)$/);
        subject = split ? split[2] : what;
      }
      if (/plugins svn/i.test(what) || NOISE.some(function (re) { return re.test(subject); })) return;
      subject = clean(subject);
      /* an issue and the pull request that closes it share a title */
      var key = subject.toLowerCase().replace(/\u2026$/, '');
      if (!subject || seen[key]) return;
      seen[key] = 1;
      shown++;
      var d = it.date ? new Date(it.date + 'T00:00:00') : null;
      var label = d && !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      /* the day is written once, the way the archive writes a year once */
      if (label && label !== day) {
        day = label;
        html += '<li class="lately-day"><time datetime="' + esc(it.date || '') + '">' + esc(label) + '</time></li>';
      }
      html += '<li><span class="lately-line"><a href="' + esc(it.url) + '">' + esc(subject) + '</a></span></li>';
    });
    list.innerHTML = html;
    list.removeAttribute('aria-busy');
  }

  function fallback() {
    var el = document.getElementById('lately-fallback');
    if (!el) return;
    try { render(JSON.parse(el.textContent)); } catch (e) { /* skeleton stays */ }
  }

  /* The live relay keeps a short window; the build-time record keeps a
     long one. Take the live items first, then whatever the record has
     that the relay no longer does, so the feed is both fresh and deep. */
  function stored() {
    var el = document.getElementById('lately-fallback');
    if (!el) return [];
    try { return JSON.parse(el.textContent) || []; } catch (e) { return []; }
  }

  function merge(live) {
    var seen = {};
    var out = [];
    live.concat(stored()).forEach(function (it) {
      var key = it && (it.url || (it.date + it.what));
      if (!key || seen[key]) return;
      seen[key] = 1;
      out.push(it);
    });
    return out;
  }

  fetch(API)
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (data) {
      var live = (data.items && data.items.length) ? data.items : [];
      var all = merge(live);
      if (all.length) render(all);
      else fallback();
    })
    .catch(fallback);
})();
