/* The Moon's phase now, for the Moon in the sky over the wire. It is
   worked out here from the main terms of the Moon's and the Sun's motion (Meeus,
   Astronomical Algorithms, chapters 25 and 47), which lands within a
   fraction of a degree. The explorer at /moon/ does it properly. */
(function () {
  var R = Math.PI / 180;
  /* degrees the Moon stands east of the Sun: 0 new, 90 first quarter, 180 full */
  function elongation(ms) {
    var T = (ms / 86400000 - 10957.5) / 36525;
    var d = 297.8501921 + 445267.1114034 * T;
    var D = d * R, M = (357.5291092 + 35999.0502909 * T) * R;
    var P = (134.9633964 + 477198.8675055 * T) * R, F = (93.272095 + 483202.0175233 * T) * R;
    var moon = 6.289 * Math.sin(P) + 1.274 * Math.sin(2 * D - P) + 0.658 * Math.sin(2 * D)
      + 0.214 * Math.sin(2 * P) - 0.186 * Math.sin(M) - 0.114 * Math.sin(2 * F)
      + 0.059 * Math.sin(2 * D - 2 * P) + 0.057 * Math.sin(2 * D - M - P) + 0.053 * Math.sin(2 * D + P)
      + 0.046 * Math.sin(2 * D - M) + 0.041 * Math.sin(M - P) - 0.035 * Math.sin(D) - 0.030 * Math.sin(M + P);
    var sun = 1.915 * Math.sin(M) + 0.020 * Math.sin(2 * M);
    return (((d + moon - sun) % 360) + 360) % 360;
  }
  /* the four named instants hold for about half a day either side */
  function name(e) {
    var marks = ['new moon', 'first quarter', 'full moon', 'last quarter'];
    var between = ['waxing crescent', 'waxing gibbous', 'waning gibbous', 'waning crescent'];
    for (var k = 0; k < 4; k++) if (Math.abs(((e - k * 90 + 540) % 360) - 180) <= 6) return marks[k];
    return between[Math.floor(e / 90)];
  }
  /* The dark part of the disc, to be inked over the lit paper. Drawn
     as seen from the northern hemisphere. */
  function shade(e) {
    var r = 4.9, waning = e > 180, a = (waning ? 360 - e : e) * R;
    var rx = Math.abs(Math.cos(a)) * r;
    return { d: 'M0 ' + -r + 'A' + r + ' ' + r + ' 0 0 0 0 ' + r + 'A' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (a > Math.PI / 2 ? 1 : 0) + ' 0 ' + -r + 'Z', flip: waning };
  }
  function draw() {
    var e = elongation(Date.now()), s = shade(e);
    document.querySelectorAll('[data-moon]').forEach(function (el) {
      var path = el.querySelector('.moon-shade'), words = el.querySelector('[data-moon-phase]');
      if (path) { path.setAttribute('d', s.d); path.setAttribute('transform', 'translate(6 6)' + (s.flip ? ' scale(-1 1)' : '')); }
      if (words) words.textContent = name(e);
      el.setAttribute('aria-label', 'The Moon now: ' + name(e) + '. Open the Moon explorer');
    });
  }
  if (typeof module !== 'undefined') { module.exports = { elongation: elongation, name: name }; return; }
  draw();
  setInterval(draw, 30 * 60000);
})();
