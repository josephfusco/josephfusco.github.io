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

  function render(items) {
    var html = '';
    var day = '';
    items.slice(0, 20).forEach(function (it) {
      var d = it.date ? new Date(it.date + 'T00:00:00') : null;
      var label = d && !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      /* Two shapes come back: a title with a verb phrase beside it, or
         the whole sentence in what with subject left empty. Make them
         one shape — what was done, and what it was done to — and drop
         the repository, which is the same on nearly every line. */
      var subject = decode(it.subject).trim();
      var what = decode(it.what).trim();
      var verb = what;
      if (!subject) {
        var split = what.match(/^([^:]{3,60}):\s+([\s\S]+)$/);
        if (split) { verb = split[1]; subject = split[2]; }
      }
      verb = verb
        .replace(/\s+(?:on|in)\s+the\s+.+?\s+repository$/i, '')
        .replace(/\s+(?:on|in)\s+[^\s/]+\/[^\s]+$/i, '')
        .trim();
      var tail = subject && verb.toLowerCase() !== subject.toLowerCase() ? verb.toLowerCase() : '';
      /* the day is written once, the way the archive writes a year once */
      if (label && label !== day) {
        day = label;
        html += '<li class="lately-day"><time datetime="' + esc(it.date || '') + '">' + esc(label) + '</time></li>';
      }
      html += '<li>'
        + '<span class="lately-line"><a href="' + esc(it.url) + '">' + esc(subject || what) + '</a>'
        + (tail ? ' <span class="lately-what">' + esc(tail) + '</span>' : '')
        + '</span></li>';
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
