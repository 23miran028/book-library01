(function(A){
  'use strict';
  const S = A.state;

  A.renderShelf = function(filtered){
    const el = A.$('libraryWall');
    if (!el) return;

    const list = filtered || A.getFiltered();
    if (!list.length){
      el.innerHTML = `
        <div class="shelf-empty">
          <div class="shelf-empty-icon">📚</div>
          <div>قفسه‌ات خالی است</div>
          <div style="font-size:11px;opacity:.7">اولین کتاب را اضافه کن</div>
        </div>`;
      return;
    }

    // گروه‌بندی بر اساس موضوع
    const groups = {};
    list.forEach(b => {
      const k = b.subject || 'سایر';
      if (!groups[k]) groups[k] = [];
      groups[k].push(b);
    });

    // ترتیب: موضوعات اصلی اول، بقیه بعد
    const orderedKeys = A.SUBJECTS.filter(s => groups[s])
      .concat(Object.keys(groups).filter(k => !A.SUBJECTS.includes(k)));

    const capacity = A.SHELF_CAPACITY || 8;
    const rows = [];

    orderedKeys.forEach(key => {
      const group = groups[key];

      // مرتب‌سازی بر اساس order (اگر صفر بود، ترتیب فعلی)
      const sorted = group.slice().sort((a, b) => {
        const oa = a.order || 0;
        const ob = b.order || 0;
        if (oa === 0 && ob === 0) return 0;
        if (oa === 0) return 1;
        if (ob === 0) return -1;
        return oa - ob;
      });

      const lying = sorted.filter(b => b.lying);
      const standing = sorted.filter(b => !b.lying);

      const rowChunks = [];
      for (let i = 0; i < standing.length; i += capacity){
        rowChunks.push(standing.slice(i, i + capacity));
      }
      if (!rowChunks.length) rowChunks.push([]);

      rowChunks.forEach((books, idx) => {
        rows.push({
          key,
          books,
          lying: idx === 0 ? lying : [],
          total: group.length,
          isFirst: idx === 0,
          isLast: idx === rowChunks.length - 1,
          chunkIdx: idx,
          chunkCount: rowChunks.length
        });
      });
    });

    el.innerHTML = rows.map((r, rowIdx) => {
      const isFull = r.books.length >= capacity;

      // کتاب‌های خوابیده — پشته‌ای
      let lyingHtml = '';
      if (r.lying.length === 1){
        const b = r.lying[0];
        const w = Math.min(150, 70 + Math.round(b.pages / 8));
        const c = A.bookSpineSolid(b);
        const isFinished = b.status === 'خوانده شده';
        lyingHtml = `<div class="shelf-stack" style="--stack-count:1">
          <button type="button"
              class="shelf-book-lying ${isFinished ? 'is-finished' : ''}"
              data-shelf-book="${A.esc(b.id)}"
              style="--w:${w}px;--c:${c}"
              title="${A.esc(b.title)} — ${A.esc(b.author || 'نویسنده نامشخص')}"
              aria-label="${A.esc(b.title)}">
            <span class="shelf-lying-band"></span>
            <span class="shelf-lying-title">${A.esc(b.title)}</span>
            ${b.favorite ? '<span class="shelf-lying-fav">★</span>' : ''}
          </button>
        </div>`;
      } else if (r.lying.length > 1){
        // پشته: زیرین‌ترین کتاب بزرگ‌ترین، بقیه روی آن‌ها با انحراف
        const stackHtml = r.lying.map((b, i) => {
          const w = Math.min(150, 70 + Math.round(b.pages / 8));
          const c = A.bookSpineSolid(b);
          const isFinished = b.status === 'خوانده شده';
          const offsetX = (i % 2 === 0 ? 1 : -1) * (i * 3);
          const offsetY = i * -16;
          return `<button type="button"
              class="shelf-book-lying stacked ${isFinished ? 'is-finished' : ''}"
              data-shelf-book="${A.esc(b.id)}"
              style="--w:${w}px;--c:${c};--ox:${offsetX}px;--oy:${offsetY}px;z-index:${10 - i}"
              title="${A.esc(b.title)} — ${A.esc(b.author || 'نویسنده نامشخص')}"
              aria-label="${A.esc(b.title)}">
            <span class="shelf-lying-band"></span>
            <span class="shelf-lying-title">${A.esc(b.title)}</span>
            ${b.favorite ? '<span class="shelf-lying-fav">★</span>' : ''}
          </button>`;
        }).join('');
        lyingHtml = `<div class="shelf-stack" style="--stack-count:${r.lying.length}">
          ${stackHtml}
          <span class="shelf-stack-count">${A.fmt(r.lying.length)} کتاب</span>
        </div>`;
      }

      // کتاب‌های ایستاده با عطف بافت‌دار
      const standingHtml = r.books.map((b, i) => {
        const w = A.bookThickness(b.pages);
        const h = A.bookHeight(b);
        const c = A.bookSpineSolid(b);
        const pct = A.prog(b);
        const isFinished = b.status === 'خوانده شده';
        const isLast = i === r.books.length - 1;
        const classes = ['shelf-book'];
        if (isFinished) classes.push('is-finished');
        if (isLast && !isFull) classes.push('is-leaning');

        return `<button type="button"
            class="${classes.join(' ')}"
            data-shelf-book="${A.esc(b.id)}"
            data-subject="${A.esc(r.key)}"
            draggable="true"
            style="--w:${w}px;--h:${h}px;--c:${c}"
            title="${A.esc(b.title)} — ${A.esc(b.author || 'نویسنده نامشخص')}"
            aria-label="${A.esc(b.title)}">
          <span class="shelf-spine-top"></span>
          <span class="shelf-spine-headband"></span>
          <span class="shelf-title">${A.esc(b.title)}</span>
          <span class="shelf-spine-band"></span>
          <span class="shelf-spine-tailband"></span>
          ${b.favorite ? '<span class="shelf-fav">★</span>' : ''}
          <span class="shelf-progress" style="height:${pct}%"></span>
        </button>`;
      }).join('');

      // پلاک زیر قفسه — فقط در آخرین ردیف هر گروه
      const plaque = r.isLast ? `
        <div class="shelf-plaque">
          <span class="shelf-plaque-subject">${A.esc(r.key)}</span>
          <span class="shelf-plaque-count">${A.fmt(r.total)} کتاب</span>
        </div>` : '';

      return `<div class="shelf-row" data-row="${rowIdx}" data-subject="${A.esc(r.key)}">
        ${lyingHtml ? `<div class="shelf-lying-row">${lyingHtml}</div>` : ''}
        <div class="shelf-books">${standingHtml}</div>
        <div class="shelf-board"></div>
        ${plaque}
      </div>`;
    }).join('');
  };

  A.bindShelf = function(){
    const el = A.$('libraryWall');
    if (!el || el.dataset.bound) return;
    el.dataset.bound = '1';

    let dragging = null;
    let dragGhost = null;

    function liftAndOpen(bookEl){
      if (!bookEl || bookEl.classList.contains('lifting')) return;
      const id = bookEl.dataset.shelfBook;
      bookEl.classList.add('lifting');
      setTimeout(() => A.openBookPage(id), 380);
      setTimeout(() => bookEl.classList.remove('lifting'), 900);
    }

    // کلیک
    el.addEventListener('click', e => {
      if (dragging) return;
      const book = e.target.closest('[data-shelf-book]');
      if (book) liftAndOpen(book);
    });

    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const book = e.target.closest('[data-shelf-book]');
      if (book){ e.preventDefault(); liftAndOpen(book); }
    });

    // شروع drag
    el.addEventListener('dragstart', e => {
      const book = e.target.closest('.shelf-book[draggable="true"]');
      if (!book){ e.preventDefault(); return; }
      dragging = book;
      book.classList.add('dragging');

      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', book.dataset.shelfBook);

        // ساخت ghost با ظاهر زیبا
        const rect = book.getBoundingClientRect();
        dragGhost = document.createElement('div');
        dragGhost.className = 'drag-ghost';
        dragGhost.style.width = rect.width + 'px';
        dragGhost.style.height = rect.height + 'px';
        dragGhost.style.background = getComputedStyle(book).background;
        dragGhost.style.borderRadius = getComputedStyle(book).borderRadius;
        dragGhost.innerHTML = `<span class="drag-ghost-title">${book.querySelector('.shelf-title')?.textContent || ''}</span>`;
        document.body.appendChild(dragGhost);
        e.dataTransfer.setDragImage(dragGhost, rect.width/2, rect.height/2);
      } catch(err){}
    });

    el.addEventListener('dragend', () => {
      if (dragging) dragging.classList.remove('dragging');
      if (dragGhost){ dragGhost.remove(); dragGhost = null; }
      document.querySelectorAll('.shelf-book.drop-before, .shelf-book.drop-after')
        .forEach(x => x.classList.remove('drop-before','drop-after'));
      // با تاخیر، تا کلیک خودکار بعد از drag نادیده گرفته شود
      setTimeout(() => { dragging = null; }, 50);
    });

    // drag over — پیش‌نمایش محل
    el.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragging) return;
      const target = e.target.closest('.shelf-book[draggable="true"]');
      if (!target || target === dragging) return;
      if (target.dataset.subject !== dragging.dataset.subject) return;

      const rect = target.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const isBefore = e.clientX < midX;   // سمت چپ هدف

      document.querySelectorAll('.shelf-book.drop-before, .shelf-book.drop-after')
        .forEach(x => x.classList.remove('drop-before','drop-after'));
      target.classList.add(isBefore ? 'drop-before' : 'drop-after');
    });

    // drop
    el.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragging) return;
      const target = e.target.closest('.shelf-book[draggable="true"]');
      if (!target || target === dragging) return;
      if (target.dataset.subject !== dragging.dataset.subject) return;

      const rect = target.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const isBefore = e.clientX < midX;

      const dragId = dragging.dataset.shelfBook;
      const targetId = target.dataset.shelfBook;
      const subject = dragging.dataset.subject;

      // کتاب‌های این موضوع به ترتیب فعلی
      const group = S.books
        .filter(b => (b.subject || 'سایر') === subject && !b.lying)
        .sort((a, b) => {
          const oa = a.order || 0;
          const ob = b.order || 0;
          if (oa === 0 && ob === 0) return 0;
          if (oa === 0) return 1;
          if (ob === 0) return -1;
          return oa - ob;
        });

      const fromIdx = group.findIndex(b => b.id === dragId);
      const toIdxRaw = group.findIndex(b => b.id === targetId);
      if (fromIdx < 0 || toIdxRaw < 0) return;

      // حذف از جای قبلی
      const [moved] = group.splice(fromIdx, 1);
      // محاسبه جای جدید (اگر از قبل رد شده، بعد از حذف یکی به عقب می‌افتد)
      let insertIdx = toIdxRaw;
      if (!isBefore) insertIdx += 1;
      if (fromIdx < toIdxRaw) insertIdx -= 1;
      group.splice(insertIdx, 0, moved);

      // ذخیره order جدید
      group.forEach((b, i) => {
        const real = S.books.find(x => x.id === b.id);
        if (real) real.order = i + 1;
      });

      A.saveBooks({ render: false });
      A.renderShelf();
      A.toast('ترتیب قفسه ذخیره شد.', 'بازگردانی', () => {
        // rollback ساده: order قبلی را نمی‌توان دقیق بازگرداند، پس فقط رندر مجدد
        A.renderShelf();
      });
    });
  };
})(window.App);