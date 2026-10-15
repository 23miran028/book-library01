(function(A){
  'use strict';
  const TABS = ['dash', 'books', 'stats'];
  let startX = 0, startY = 0, startT = 0, tracking = false;

  A.bindGestures = function(){
    const app = document.querySelector('.app');
    if (!app) return;

    app.addEventListener('touchstart', e => {
      if (window.innerWidth > 700){ tracking = false; return; }
      const t = e.touches[0]; if (!t) return;
      // نادیده بگیر روی عناصر تعاملی
      const blocked = e.target.closest(
        'button, input, select, textarea, a, ' +
        '[data-shelf-book], [draggable="true"], ' +
        '.book-card, .shelf-book-lying, .museum-item, ' +
        '.chips, .tools, .chat-wrap, .timer-card, .bp-tabs'
      );
      if (blocked){ tracking = false; return; }
      startX = t.clientX; startY = t.clientY;
      startT = Date.now();
      tracking = true;
    }, { passive: true });

    app.addEventListener('touchend', e => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0]; if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startT;
      if (dt > 700) return;
      if (Math.abs(dx) < 80) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.65) return;

      const cur = document.querySelector('.bottom-nav button.active')?.dataset.tabTarget || 'dash';
      const idx = TABS.indexOf(cur);
      if (idx < 0) return;
      // در RTL: swipe به چپ = تب بعدی، swipe به راست = تب قبلی
      const next = dx < 0 ? idx + 1 : idx - 1;
      if (next < 0 || next >= TABS.length) return;
      A.setTab(TABS[next]);
      if (navigator.vibrate) try { navigator.vibrate(10); } catch(e){}
    }, { passive: true });
  };
})(window.App);