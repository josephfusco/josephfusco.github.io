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
    items.slice(0, 5).forEach(function (it) {
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
      html += '<li><time datetime="' + esc(it.date || '') + '">' + esc(label) + '</time>'
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

  fetch(API)
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (data) {
      if (data.items && data.items.length) render(data.items);
      else fallback();
    })
    .catch(fallback);
})();
