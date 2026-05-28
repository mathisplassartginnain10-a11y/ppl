(function () {
  'use strict';

  var SVG =
    '<svg class="ppl-elixir-svg" viewBox="0 0 200 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient id="pplElixirGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
    '<stop offset="0%" stop-color="#5b8af0" stop-opacity="0.55"/>' +
    '<stop offset="55%" stop-color="#93b8fb" stop-opacity="0.75"/>' +
    '<stop offset="100%" stop-color="#7c6cf6" stop-opacity="0.5"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<g class="ppl-elixir-prop">' +
    '<ellipse cx="14" cy="21" rx="7" ry="7" stroke-dasharray="2 3"/>' +
    '<line x1="14" y1="14" x2="14" y2="28"/>' +
    '<line x1="7" y1="21" x2="21" y2="21"/>' +
    '</g>' +
    '<path class="ppl-elixir-body" d="M 188 21 L 118 21 Q 98 21 82 19.5 L 48 18.5 Q 28 18 12 19.5 L 4 20.5 Q 2 20.5 2 21 Q 2 21.5 4 21.5 L 12 22.5 Q 28 24 48 23.5 L 82 22.5 Q 98 21 118 21 L 188 21 Z"/>' +
    '<ellipse class="ppl-elixir-canopy" cx="58" cy="17" rx="14" ry="5.5"/>' +
    '<path class="ppl-elixir-wing" d="M 62 21.5 L 98 21.5 L 92 27.5 L 52 27.5 Z"/>' +
    '<path class="ppl-elixir-tail" d="M 168 21 L 188 12 L 186 21 L 188 30 Z"/>' +
    '<path class="ppl-elixir-wing" d="M 172 21 L 182 21 L 180 24 L 170 24 Z" opacity="0.6"/>' +
    '<text class="ppl-elixir-label" x="78" y="25">ELIXIR</text>' +
    '</svg>';

  function plane(cls, uid) {
    var svg = SVG.replace(/pplElixirGrad/g, 'pplElixirGrad' + uid);
    var d = document.createElement('div');
    d.className = 'ppl-sky-plane ' + cls;
    d.innerHTML = svg;
    return d;
  }

  var mesh = document.querySelector('.mesh-bg');

  function mount() {
    if (document.getElementById('ppl-sky')) return;
    var sky = document.createElement('div');
    sky.id = 'ppl-sky';
    sky.className = 'ppl-sky';
    sky.setAttribute('aria-hidden', 'true');
    sky.appendChild(plane('ppl-sky-plane--ltr', 'A'));
    sky.appendChild(plane('ppl-sky-plane--rtl', 'B'));
    var m = document.querySelector('.mesh-bg');
    if (m && m.parentNode) {
      m.parentNode.insertBefore(sky, m.nextSibling);
    } else {
      document.body.insertBefore(sky, document.body.firstChild);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
