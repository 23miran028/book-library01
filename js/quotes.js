(function(A){
  'use strict';
  const S = A.state;
  const REVIEW_INTERVALS = [1, 7, 30];

   const TAG_PALETTE = ['#268fe5','#10bb80','#f6c747','#9564f5','#f45162','#ff9b38','#54c8ff','#ec4899','#22d3c5','#e879c8'];
  A.tagColor = function(tag){
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
    return TAG_PALETTE[h % TAG_PALETTE.length];
  };
  A.tagChip = function(tag){
    const c = A.tagColor(tag);
    return `<span style="color:${c};background:${c}22;border:1px solid ${c}55" data-tag-click="${A.esc(tag)}">#${A.esc(tag)}</span>`;
  }; 
  function addDays(dateKey, days){
    const d = new Date(dateKey);
    d.setDate(d.getDate() + days);
    return A.localDateKey(d);
  }

  A.addQuote = function(q){
    const quote = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      bookId: q.bookId, bookTitle: q.bookTitle,
      page: Math.max(0, A.num(q.page)),
      text: String(q.text||'').trim().slice(0,2000),
      tags: Array.isArray(q.tags) ? q.tags.slice(0,10) : [],
      createdAt: Date.now(),
      reviewStage: 0,
      nextReview: addDays(A.localDateKey(), 1),
      lastReviewed: null
    };
    if (!quote.text) return null;
    S.quotes.unshift(quote);
    A.saveQuotes();
    return quote;
  };

  A.deleteQuote = function(id){
    S.quotes = S.quotes.filter(q => q.id !== id);
    A.saveQuotes();
  };

  A.reviewQuote = function(id, action){
    const q = S.quotes.find(x => x.id === id); if (!q) return;
    if (action === 'good'){
      q.reviewStage = Math.min(3, (q.reviewStage||0) + 1);
      q.nextReview = q.reviewStage >= 3 ? null
        : addDays(A.localDateKey(), REVIEW_INTERVALS[q.reviewStage] ?? 30);
    } else if (action === 'again'){
      q.reviewStage = 0;
      q.nextReview = addDays(A.localDateKey(), 1);
    } else if (action === 'done'){
      q.reviewStage = 3;
      q.nextReview = null;
    }
    q.lastReviewed = A.localDateKey();
    A.saveQuotes();
  };

  A.dueQuotes = function(){
    const today = A.localDateKey();
    return S.quotes.filter(q => q.nextReview && q.nextReview <= today);
  };

  A.refreshQuoteBookOptions = function(){
    const el = A.$('quoteBook'); if (!el) return;
    const old = el.value;
    const sorted = S.books.slice().sort((a,b) => A.norm(a.title).localeCompare(A.norm(b.title),'fa'));
    el.innerHTML = sorted.length
      ? sorted.map(b => `<option value="${A.esc(b.id)}">${A.esc(b.title)}</option>`).join('')
      : '<option value="">ابتدا کتاب اضافه کن</option>';
    if (sorted.some(b => b.id === old)) el.value = old;
  };

  A.renderReviewQueue = function(){
    const el = A.$('reviewQueue'); if (!el) return;
    const due = A.dueQuotes();
    A.$('reviewCount').textContent = A.fmt(due.length);
    if (!due.length){
      el.innerHTML = '<div class="empty" style="padding:16px;font-size:12px">✨ امروز چیزی برای مرور نیست.</div>';
      return;
    }
    const q = due[0];
    const book = S.books.find(b => b.id === q.bookId);
    el.innerHTML = `
      <div class="review-card">
        <div class="muted" style="font-size:11.5px;margin-bottom:6px">
          ${A.esc(book?.title || q.bookTitle || '—')}${q.page?` · ص ${A.fmt(q.page)}`:''}
        </div>
        <div class="review-text">${A.esc(q.text)}</div>
        ${q.tags.length?`<div class="review-tags">${q.tags.map(A.tagChip).join('')}</div>`:''}
        <div class="review-actions">
          <button class="btn sm" data-review="${q.id}" data-act="again">↺ دوباره</button>
          <button class="btn sm primary" data-review="${q.id}" data-act="good">✓ خوب</button>
          <button class="btn sm" data-review="${q.id}" data-act="done">★ بلد شدم</button>
        </div>
        <div class="muted" style="font-size:10.5px;text-align:center;margin-top:8px">
          مرحله ${A.fmt((q.reviewStage||0)+1)} از ۳ · ${A.fmt(due.length)} مورد در صف
        </div>
      </div>`;
  };

  A.renderQuotes = function(){
    const el = A.$('quotesList'); if (!el) return;
    A.refreshQuoteBookOptions();

    const filterBook = A.$('quoteFilterBook').value;
    const filterTag  = A.$('quoteFilterTag').value;
    let list = S.quotes.slice();
    if (filterBook) list = list.filter(q => q.bookId === filterBook);
    if (filterTag)  list = list.filter(q => (q.tags||[]).includes(filterTag));

    const bookSet = new Map();
    S.quotes.forEach(q => { if (q.bookId) bookSet.set(q.bookId, q.bookTitle || q.bookId); });
    A.$('quoteFilterBook').innerHTML = '<option value="">همه کتاب‌ها</option>' +
      [...bookSet.entries()].map(([id,t]) => `<option value="${A.esc(id)}">${A.esc(t)}</option>`).join('');
    A.$('quoteFilterBook').value = filterBook;

    const tagSet = new Set();
    S.quotes.forEach(q => (q.tags||[]).forEach(t => tagSet.add(t)));
    A.$('quoteFilterTag').innerHTML = '<option value="">همه برچسب‌ها</option>' +
      [...tagSet].sort().map(t => `<option value="${A.esc(t)}">${A.esc(t)}</option>`).join('');
    A.$('quoteFilterTag').value = filterTag;

    if (!list.length){
      el.innerHTML = '<div class="empty" style="padding:16px;font-size:12px">هنوز نقل‌قولی ثبت نشده.</div>';
      return;
    }
    el.innerHTML = list.slice(0,30).map(q => {
      const book = S.books.find(b => b.id === q.bookId);
      const stage = q.reviewStage || 0;
      const stageLbl = stage >= 3 ? '✓ تمام' : `مرحله ${A.fmt(stage+1)}`;
      return `<div class="quote-item">
        <div class="quote-head">
          <b>${A.esc(book?.title || q.bookTitle || '—')}</b>
          ${q.page?`<span class="muted">ص ${A.fmt(q.page)}</span>`:''}
          <span class="quote-stage">${stageLbl}</span>
        </div>
        <div class="quote-text">${A.esc(q.text)}</div>
        ${q.tags.length?`<div class="review-tags">${q.tags.map(A.tagChip).join('')}</div>`:''}
        <div class="quote-foot">
          <span class="muted" style="font-size:10.5px">${A.esc(q.nextReview?`مرور بعدی: ${q.nextReview}`:'مرور تمام شد')}</span>
          <button class="btn sm" data-del-quote="${q.id}" style="background:#662b38;color:#ffdce0">حذف</button>
        </div>
      </div>`;
    }).join('');
  };

  A.bindQuotes = function(){
    A.$('quoteForm').addEventListener('submit', e => {
      e.preventDefault();
      const book = S.books.find(b => b.id === A.$('quoteBook').value);
      if (!book){ A.toast('ابتدا یک کتاب انتخاب کن.'); return; }
      const text = A.$('quoteText').value.trim();
      if (!text){ A.toast('متن نقل‌قول را وارد کن.'); return; }
      const tags = A.$('quoteTags').value.split(/[,،]/).map(s=>s.trim()).filter(Boolean).slice(0,10);
      const q = A.addQuote({ bookId: book.id, bookTitle: book.title,
        page: A.$('quotePage').value, text, tags });
      if (q){
        A.$('quoteText').value = ''; A.$('quotePage').value = ''; A.$('quoteTags').value = '';
        A.toast('نقل‌قول ثبت شد.');
      }
    });

    A.$('quoteFilterBook').addEventListener('change', A.renderQuotes);
    A.$('quoteFilterTag').addEventListener('change', A.renderQuotes);

    A.$('quotesList').addEventListener('click', e => {
      const btn = e.target.closest('[data-del-quote]'); if (!btn) return;
      if (!confirm('این نقل‌قول حذف شود؟')) return;
      A.deleteQuote(btn.dataset.delQuote);
      A.toast('حذف شد.');
    });

    A.$('reviewQueue').addEventListener('click', e => {
      const btn = e.target.closest('[data-review]'); if (!btn) return;
      A.reviewQuote(btn.dataset.review, btn.dataset.act);
      A.renderReviewQueue();
      A.renderQuotes();
    });

    // کلیک روی هر برچسب → فیلتر می‌شود
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-tag-click]'); if (!t) return;
      const tag = t.dataset.tagClick;
      A.setTab('stats');
      setTimeout(() => {
        A.$('quoteFilterTag').value = tag;
        A.renderQuotes();
        A.$('quotesPanel').scrollIntoView({block:'start', behavior:'smooth'});
      }, 200);
    });
  };
})(window.App);