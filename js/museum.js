(function(A){
  'use strict';
  const S = A.state;

  A.renderMuseum = function(){
    const el = A.$('museum');
    if (!el) return;

    const finished = S.books.filter(b => b.status === 'خوانده شده');
    if (!finished.length){
      el.innerHTML = `
        <div class="museum-empty">
          <div class="museum-empty-icon">🏛</div>
          <div class="museum-empty-title">موزه‌ات خالی است</div>
          <div class="museum-empty-sub">هر کتابی که تمام کنی، اینجا به نمایش درمی‌آید</div>
        </div>`;
      return;
    }

    // مرتب‌سازی: ۵ ستاره‌ها اول، بقیه بر اساس امتیاز
    const sorted = finished.slice().sort((a, b) => {
      const sa = A.SCORE_VALUE[a.score] || 0;
      const sb = A.SCORE_VALUE[b.score] || 0;
      if (sb !== sa) return sb - sa;
      return A.norm(a.title).localeCompare(A.norm(b.title), 'fa');
    });

    const totalStars = sorted.reduce((s, b) => s + (A.SCORE_VALUE[b.score] || 0), 0);
    const avgRating = sorted.length ? (totalStars / sorted.length).toFixed(1) : '0';
    const fiveStars = sorted.filter(b => (A.SCORE_VALUE[b.score] || 0) === 5).length;

    el.innerHTML = `
      <div class="museum-header">
        <div class="museum-title">
          <span class="museum-icon">🏛</span>
          <div>
            <h2>موزه کتاب‌ها</h2>
            <p class="muted">${A.fmt(sorted.length)} کتاب خوانده‌شده</p>
          </div>
        </div>
        <div class="museum-stats">
          <div class="museum-stat">
            <span class="muted">میانگین امتیاز</span>
            <b>${avgRating}</b>
          </div>
          <div class="museum-stat">
            <span class="muted">۵ ستاره</span>
            <b>${A.fmt(fiveStars)}</b>
          </div>
        </div>
      </div>

      <div class="museum-display">
        ${sorted.map((b, i) => {
          const stars = A.SCORE_VALUE[b.score] || 0;
          const starHtml = stars ? '★'.repeat(stars) + '☆'.repeat(5 - stars) : '—';
          const cover = A.coverGradient(b.title);
          const coverUrl = A.coverStore ? A.coverStore.get(b.id) : null;
          const coverStyle = coverUrl
            ? `background-image:url('${coverUrl}');background-size:cover;background-position:center`
            : `background:${cover}`;
          return `<article class="museum-item" data-museum-id="${A.esc(b.id)}" style="animation-delay:${(i*25)}ms" tabindex="0" role="button" aria-label="${A.esc(b.title)}">
            <div class="museum-pedestal">
              <div class="museum-cover" style="${coverStyle}">
                <div class="museum-cover-shine"></div>
              </div>
            </div>
            <div class="museum-info">
              <h3>${A.esc(b.title)}</h3>
              <p class="muted">${A.esc(b.author || '—')}</p>
              <div class="museum-stars" title="${stars ? stars + ' از ۵' : 'بدون امتیاز'}">${starHtml}</div>
              ${b.subject ? `<span class="museum-subject">${A.esc(b.subject)}</span>` : ''}
            </div>
          </article>`;
        }).join('')}
      </div>`;
  };

  A.bindMuseum = function(){
    const el = A.$('museum');
    if (!el || el.dataset.bound) return;
    el.dataset.bound = '1';

    function open(id){
      if (A.openBookPage) A.openBookPage(id);
    }

    el.addEventListener('click', e => {
      const item = e.target.closest('[data-museum-id]');
      if (item) open(item.dataset.museumId);
    });
    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const item = e.target.closest('[data-museum-id]');
      if (item){ e.preventDefault(); open(item.dataset.museumId); }
    });
  };
})(window.App);