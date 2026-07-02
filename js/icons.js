/*
 * Inline SVG icons (Lucide-style stroke set).
 *
 * Icons are rendered as self-contained <svg> elements with explicit
 * presentation attributes (fill / stroke / stroke-width / size) rather than a
 * shared <use> sprite driven by CSS. The sprite + CSS `currentColor` approach
 * renders "huge and black" in some engines (older WebKit/WebView, or when the
 * stylesheet is served with the wrong MIME type) because CSS does not reliably
 * cross the <use> shadow tree. Presentation attributes always inherit, so this
 * renders correctly even before — or entirely without — the stylesheet.
 *
 *   Icons.svg('mask', 'icon-l')  -> "<svg class='icon icon-l' ...>…</svg>"
 *   Icons.hydrate(root)          -> swap every [data-icon] placeholder for its <svg>
 */
(function () {
  'use strict';

  const PATHS = {
    play: '<polygon points="6 4 20 12 6 20 6 4"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    mask: '<path d="M6.5 12.5 8 5.9A2.4 2.4 0 0 1 10.35 4h3.3A2.4 2.4 0 0 1 16 5.9l1.5 6.6"/><path d="M3 12.5h18"/><circle cx="7.6" cy="17.2" r="2.6"/><circle cx="16.4" cy="17.2" r="2.6"/><path d="M10.2 16.4c.6-.6 3-.6 3.6 0"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'chevrons-down': '<path d="m7 6 5 5 5-5"/><path d="m7 13 5 5 5-5"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    bookmark: '<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><path d="M7.5 7.5h.01"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  };

  // Build a complete <svg> for `name`. `cls` adds size modifiers (e.g. 'icon-l').
  function svg(name, cls) {
    const paths = PATHS[name] || '';
    const klass = cls ? 'icon ' + cls : 'icon';
    return '<svg class="' + klass + '" viewBox="0 0 24 24" width="24" height="24" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }

  // Replace every <span data-icon="name" class="icon …"> placeholder with its <svg>,
  // carrying over any size classes present on the placeholder.
  function hydrate(root) {
    const els = (root || document).querySelectorAll('[data-icon]');
    els.forEach((el) => {
      const name = el.getAttribute('data-icon');
      // keep size modifiers (icon-s/icon-l/icon-xl); drop the bare 'icon' token
      const extra = (el.getAttribute('class') || '')
        .split(/\s+/)
        .filter((c) => c && c !== 'icon')
        .join(' ');
      el.outerHTML = svg(name, extra);
    });
  }

  window.Icons = { svg, hydrate, PATHS };
})();
