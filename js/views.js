(function(A){
  'use strict';
  const S = A.state;

  // گرادیانت پویا از روی نام
  A.coverGradient = function(str){
    let h = 0;
    for (let i = 0; i < (str||'').length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    const hue  = h % 360;
    const hue2 = (hue + 45) % 360;
    return `linear-gradient(140deg, hsl(${hue} 55% 34%), hsl(${hue2} 65% 20%))`;
  };

  // حلقه پیشرفت SVG
  function ring(pct, size = 44, stroke = 4){
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
    const color = pct >= 100 ? '#10bb80' : pct >= 50 ? '#54c8ff' : '#f6c747';
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="bg" cx="${size/2}" cy="${size/2}" r="${r}"/>
      <circle class="fg" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>
    </svg>`;
  }

  A.renderGrid = function(filtered){
    const el = A.$('booksGrid');
    if (!el) return;
    const list = filtered || A.getFiltered();
    if (!list.length){ el.innerHTML = ''; return; }

    el.innerHTML = list.map((b, i) => {
      const pct = A.prog(b);
      const cover = A.coverGradient(b.title);

      // اگر عکس دارد، از عکس استفاده کن. اگر نه، گرادیانت.
      const coverUrl = A.coverStore ? A.coverStore.get(b.id) : null;
      const hasPhoto = !!coverUrl;
      const coverStyle = hasPhoto
        ? `background-image:url('${coverUrl}')`
        : `background:${cover}`;

      const badges = [];
      if (b.favorite) badges.push(`<span class="badge" style="color:#f6c747">★</span>`);
      if (b.access)   badges.push(`<span class="badge">${A.esc(b.access)}</span>`);

      return `<article class="book-card" data-book-id="${A.esc(b.id)}" style="animation-delay:${(i*18)}ms" tabindex="0" role="button" aria-label="${A.esc(b.title)}">
        <div class="book-cover ${hasPhoto ? 'has-photo' : ''}" style="${coverStyle}">
          <div class="book-badges">${badges.join('')}</div>
          ${hasPhoto ? '' : `<div class="book-cover-title">${A.esc(b.title)}</div>`}
          <div class="book-progress-ring">
            ${ring(pct)}
            <div class="txt">${pct >= 100 ? '✓' : A.fmt(pct)+'٪'}</div>
          </div>
        </div>
        <div class="book-meta">
          <b>${A.esc(b.title)}</b>
          <span class="muted">${A.esc(b.author || '—')}</span>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:6px">
            <span class="chip-mini" style="--c:${A.STATUS_COLORS[b.status]||'#268fe5'}">${A.esc(b.status)}</span>
            ${(b.score && b.score !== '-') ? `<span class="muted" style="font-size:10px">${A.esc(b.score)}</span>` : ''}
          </div>
        </div>
      </article>`;
    }).join('');
  };

  A.renderBooksView = function(){
    const filtered = A.getFiltered();
    const mode = ['shelf','grid','museum','list'].includes(S.prefs.viewMode) ? S.prefs.viewMode : 'shelf';
    const isFiltered = A.$('search').value.trim() || S.currentStatus ||
                       A.$('filterSubject').value || A.$('filterScore').value ||
                       A.$('filterAccess').value || A.$('filterFav').value;

    A.$('count').textContent = A.fmt(filtered.length) + ' کتاب';
    A.$('empty').hidden = filtered.length !== 0;
    A.$('empty').textContent = S.books.length === 0
      ? 'هنوز کتابی ثبت نشده. از دکمه «افزودن» یا گزینه «بازیابی» شروع کن.'
      : (isFiltered ? 'با این فیلترها کتابی پیدا نشد.' : 'کتابی برای نمایش نیست.');

    const showTable  = (mode === 'list')   && filtered.length > 0;
    const showGrid   = (mode === 'grid')   && filtered.length > 0;
    const showShelf  = (mode === 'shelf')  && filtered.length > 0;
    const showMuseum = (mode === 'museum');

    A.$('tablewrap').hidden = !showTable;
    A.$('booksGrid').hidden = !showGrid;
    if (A.$('libraryRoom')) A.$('libraryRoom').hidden = !showShelf;
    else if (A.$('libraryWall')) A.$('libraryWall').hidden = !showShelf;
    if (A.$('museum')) A.$('museum').hidden = !showMuseum;

    if (showTable) A.renderTable(filtered);
    if (showGrid)  A.renderGrid(filtered);
    if (showShelf && A.renderShelf) A.renderShelf(filtered);
    if (showMuseum && A.renderMuseum) A.renderMuseum();

    document.querySelectorAll('.books-view-toggle button').forEach(b =>
      b.classList.toggle('on', b.dataset.view === mode));
  };

  A.bindViews = function(){
    // سوییچ نمایش
    document.querySelectorAll('.books-view-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        S.prefs.viewMode = btn.dataset.view;
        A.savePrefs();
        A.renderBooksView();
      });
    });

    // کلیک روی کارت → صفحه کتاب (نه drawer، نه edit)
    const grid = A.$('booksGrid');
    if (grid && !grid.dataset.bound){
      grid.dataset.bound = '1';
      grid.addEventListener('click', e => {
        const card = e.target.closest('[data-book-id]');
        if (!card) return;
        e.preventDefault();
        e.stopPropagation();
        if (A.openBookPage) A.openBookPage(card.dataset.bookId);
      });
      grid.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('[data-book-id]');
        if (card){
          e.preventDefault();
          if (A.openBookPage) A.openBookPage(card.dataset.bookId);
        }
      });
    }
  };
})(window.App);