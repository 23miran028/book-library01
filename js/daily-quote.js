(function(A){
  'use strict';
  const S = A.state;
  const KEY = 'persianBookLibrary.dailyQuote.v1';

  function hashDate(dateKey){
    let h = 2166136261;
    for (let i = 0; i < dateKey.length; i++){
      h ^= dateKey.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pickToday(quotes){
    if (!quotes.length) return null;
    const key = A.localDateKey();
    return quotes[hashDate(key) % quotes.length];
  }

  A.renderDailyQuote = function(){
    const el = A.$('dailyQuoteCard');
    if (!el) return;

    const quotes = (S.quotes || []).filter(q => q.text && q.text.length > 20);
    if (!quotes.length){
      el.hidden = true;
      return;
    }

    const q = pickToday(quotes);
    if (!q){ el.hidden = true; return; }

    const book = S.books.find(b => b.id === q.bookId);
    const tags = (q.tags || []).slice(0, 3);
    el.hidden = false;
    el.innerHTML = `
      <div class="dq-card" data-dq-book="${A.esc(q.bookId || '')}">
        <div class="dq-corner dq-corner-tl"></div>
        <div class="dq-corner dq-corner-br"></div>
        <div class="dq-label">نقل‌قول امروز</div>
        <div class="dq-mark">❝</div>
        <blockquote class="dq-text">${A.esc(q.text)}</blockquote>
        <div class="dq-foot">
          <div class="dq-source">
            ${book ? `<b>${A.esc(book.title)}</b>` : `<b>${A.esc(q.bookTitle || '—')}</b>`}
            ${q.page ? `<span> · ص ${A.fmt(q.page)}</span>` : ''}
          </div>
          ${tags.length ? `<div class="dq-tags">${tags.map(t => `<span>#${A.esc(t)}</span>`).join('')}</div>` : ''}
        </div>
        <button type="button" class="dq-refresh" title="نقل‌قول دیگر">↻</button>
      </div>`;
  };

  A.bindDailyQuote = function(){
    const el = A.$('dailyQuoteCard');
    if (!el || el.dataset.bound) return;
    el.dataset.bound = '1';

    el.addEventListener('click', e => {
      if (e.target.closest('.dq-refresh')){
        e.stopPropagation();
        // نقل‌قول بعدی از فهرست
        const quotes = (S.quotes || []).filter(q => q.text && q.text.length > 20);
        if (quotes.length < 2) return;
        const current = el.querySelector('.dq-text')?.textContent || '';
        const others = quotes.filter(q => q.text !== current);
        const next = others[Math.floor(Math.random() * others.length)];
        if (!next) return;
        // رندر موقت
        const book = S.books.find(b => b.id === next.bookId);
        const card = el.querySelector('.dq-card');
        if (card){
          card.querySelector('.dq-text').textContent = next.text;
          const sourceEl = card.querySelector('.dq-source');
          if (sourceEl){
            sourceEl.innerHTML = `
              ${book ? `<b>${A.esc(book.title)}</b>` : `<b>${A.esc(next.bookTitle || '—')}</b>`}
              ${next.page ? `<span> · ص ${A.fmt(next.page)}</span>` : ''}`;
          }
        }
        return;
      }
      const card = e.target.closest('.dq-card');
      if (card && card.dataset.dqBook){
        if (A.openBookPage) A.openBookPage(card.dataset.dqBook);
      }
    });
  };
})(window.App);