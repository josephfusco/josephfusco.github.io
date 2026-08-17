/* Lately, read in the reader's moment: skeleton first, the .org feed
   when it answers, the build-time record when it does not. */
(function () {
  var list = document.querySelector('[data-lately]');
  if (!list) return;

  var API = location.hostname === 'josephfus.co'
    ? '/wp-activity'
    : 'https://josephfus.co/wp-activity';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(items) {
    var html = '';
    items.slice(0, 4).forEach(function (it) {
      var d = it.date ? new Date(it.date + 'T00:00:00') : null;
      var label = d && !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      html += '<li><time datetime="' + esc(it.date || '') + '">' + esc(label) + '</time>'
        + '<span><a href="' + esc(it.url) + '">' + esc(it.subject || it.what) + '</a></span></li>';
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
