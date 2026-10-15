(function(A){
  'use strict';
  const S = A.state;
  let activeId = null;
  let activeTab = 'summary';

  function ringLarge(pct, size = 130, stroke = 9){
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
    const color = pct >= 100 ? '#10bb80' : pct >= 50 ? '#54c8ff' : '#f6c747';
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ring-lg">
      <circle class="bg" cx="${size/2}" cy="${size/2}" r="${r}" fill="none"/>
      <circle class="fg" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" fill="none"/>
    </svg>`;
  }

  function fmtFa(v){ return A.fmt(v); }

  function relDate(dateStr){
    if (!dateStr) return '';
    const today = A.localDateKey();
    const d = new Date(dateStr);
    const diff = Math.round((new Date(today) - d) / 86400000);
    if (diff === 0) return 'امروز';
    if (diff === 1) return 'دیروز';
    if (diff < 7) return `${fmtFa(diff)} روز پیش`;
    if (diff < 30) return `${fmtFa(Math.round(diff/7))} هفته پیش`;
    return dateStr;
  }

  function renderSummary(b, sessions, quotes){
    const totalMin = sessions.reduce((a,s)=>a+(+s.minutes||0),0);
    const totalPages = sessions.reduce((a,s)=>a+(+s.pages||0),0);
    const avgMin = sessions.length ? Math.round(totalMin/sessions.length) : 0;
    return `
      <div class="bp-stats">
        <div><span class="muted">جلسه‌ها</span><b>${fmtFa(sessions.length)}</b></div>
        <div><span class="muted">زمان کل</span><b>${fmtFa(totalMin)} <small>دقیقه</small></b></div>
        <div><span class="muted">صفحات این کتاب</span><b>${fmtFa(totalPages)}</b></div>
        <div><span class="muted">میانگین هر جلسه</span><b>${fmtFa(avgMin)} <small>دقیقه</small></b></div>
      </div>
      ${b.notes ? `<div class="bp-notes"><h4>یادداشت</h4><p>${A.esc(b.notes)}</p></div>` : ''}
      <div class="bp-info">
        ${b.reason ? `<div><span class="muted">دلیل</span><b>${A.esc(b.reason)}</b></div>` : ''}
        ${b.reread && b.reread!=='-' ? `<div><span class="muted">بازخوانی</span><b>${A.esc(b.reread)}</b></div>` : ''}
        ${b.price ? `<div><span class="muted">هزینه</span><b>${A.money(b.price)}</b></div>` : ''}
        ${b.access ? `<div><span class="muted">دسترسی</span><b>${A.esc(b.access)}</b></div>` : ''}
      </div>`;
  }

  function renderSessions(sessions){
    if (!sessions.length){
      return `<div class="empty" style="padding:36px 20px;font-size:13px">هنوز جلسه‌ای برای این کتاب ثبت نشده.</div>`;
    }
    return `<div class="bp-timeline">${sessions.map(s => `
      <div class="bp-tl-item">
        <div class="bp-tl-dot"></div>
        <div class="bp-tl-body">
          <div class="bp-tl-head">
            <b>${A.esc(relDate(s.date))}</b>
            <span class="muted" style="font-size:11px">${A.esc(s.date)}</span>
          </div>
          <div class="bp-tl-meta">
            <span class="bp-chip">⏱ ${fmtFa(s.minutes)} دقیقه</span>
            ${s.pages ? `<span class="bp-chip">📄 ${fmtFa(s.pages)} صفحه</span>` : ''}
            ${s.fromPage ? `<span class="bp-chip">از ص ${fmtFa(s.fromPage)}</span>` : ''}
          </div>
          ${s.notes ? `<div class="bp-tl-notes">${A.esc(s.notes)}</div>` : ''}
        </div>
      </div>`).join('')}</div>`;
  }

  function renderQuotes(quotes){
    if (!quotes.length){
      return `<div class="empty" style="padding:36px 20px;font-size:13px">هنوز نقل‌قولی برای این کتاب ثبت نشده.</div>`;
    }
    return `<div class="bp-quotes">${quotes.map(q => `
      <div class="bp-quote">
        <div class="bp-quote-mark">❝</div>
        <div class="bp-quote-text">${A.esc(q.text)}</div>
        <div class="bp-quote-foot">
          ${q.page ? `<span class="muted" style="font-size:11px">ص ${fmtFa(q.page)}</span>` : '<span></span>'}
          ${q.tags && q.tags.length ? `<div class="review-tags">${q.tags.map(A.tagChip).join('')}</div>` : ''}
        </div>
      </div>`).join('')}</div>`;
  }

  function renderHero(b){
    const pct = A.prog(b);
    const cover = A.coverGradient(b.title);
    const sVal = A.SCORE_VALUE[b.score] || 0;
    const stars = sVal ? '★'.repeat(sVal) + '☆'.repeat(5 - sVal) : '—';
    const coverUrl = A.coverStore ? A.coverStore.get(b.id) : null;
    const coverStyle = coverUrl
      ? `background-image:url('${coverUrl}');background-size:cover;background-position:center;background-color:#1a1a1a`
      : `background:${cover}`;
    return `
      <div class="bp-hero">
        <div class="bp-cover ${b.coverImage ? 'has-photo' : ''}" style="${coverStyle}">
          <div class="bp-cover-shine"></div>
          ${!b.coverImage ? `
            <div class="bp-cover-inner">
              <div class="bp-cover-title">${A.esc(b.title)}</div>
              <div class="bp-cover-author">${A.esc(b.author || 'نویسنده نامشخص')}</div>
            </div>` : ''}
        </div>
        <div class="bp-hero-info">
          <div class="bp-pills">
            ${A.statusPill(b.status)}
            ${b.subject ? `<span class="bp-pill-sub">${A.esc(b.subject)}</span>` : ''}
            ${b.access ? `<span class="bp-pill-acc">${A.esc(b.access)}</span>` : ''}
            ${b.favorite ? `<span class="bp-pill-fav">★ علاقه‌مندی</span>` : ''}
            ${b.series ? `<span class="series-badge">📚 <b>${A.esc(b.series)}</b>${b.seriesOrder ? ` · جلد ${A.fmt(b.seriesOrder)}` : ''}</span>` : ''}
          </div>
          <h1 class="bp-title">${A.esc(b.title)}</h1>
          <div class="bp-author">${A.esc(b.author || 'نویسنده نامشخص')}</div>
          <div class="bp-stars">${stars}</div>
          <div class="bp-progress-block">
            <div class="bp-ring-wrap">
              ${ringLarge(pct)}
              <div class="bp-ring-txt">
                <b>${pct >= 100 ? '✓' : fmtFa(pct) + '٪'}</b>
                <span>${pct >= 100 ? 'تمام' : 'پیشرفت'}</span>
              </div>
            </div>
            <div class="bp-pages">
              <div class="muted">صفحه</div>
              <div class="bp-pages-num">${fmtFa(b.pagesdone)} <span class="muted">از</span> ${fmtFa(b.pages)}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderActions(b){
    return `
      <div class="bp-actions">
        <button class="btn primary" data-bp="edit" type="button">✎ ویرایش</button>
        <button class="btn" data-bp="quote" type="button">❝ نقل‌قول</button>
        <button class="btn" data-bp="progress" type="button">📖 پیشرفت</button>
        <button class="btn" data-bp="timer" type="button">⏱ تایمر</button>
        <button class="btn" data-bp="fav" type="button">${b.favorite ? '★' : '☆'} علاقه‌مندی</button>
        <button class="btn" data-ai-summarize-book="${A.esc(b.id)}" type="button">🤖 خلاصه نقل‌قول‌ها</button>
        <button class="btn" data-ai-similar="${A.esc(b.id)}" type="button">🔍 کتاب‌های مشابه</button>
      </div>
      <div class="bp-ai-out"></div>
      <div class="similar-box" id="similarBox" hidden></div>`;
  }

  function renderTabs(sessions, quotes){
    const tabs = [
      {k:'summary', l:'خلاصه'},
      {k:'sessions', l:`جلسه‌ها (${fmtFa(sessions.length)})`},
      {k:'quotes', l:`نقل‌قول (${fmtFa(quotes.length)})`},
      {k:'notes', l:'یادداشت'},
      {k:'chat', l:'🤖 چت با کتاب'}
    ];
    return `<div class="bp-tabs" role="tablist">${tabs.map(t =>
      `<button type="button" class="${activeTab===t.k?'on':''}" data-bp-tab="${t.k}" role="tab">${t.l}</button>`
    ).join('')}</div>`;
  }

  function render(){
    const b = S.books.find(x => x.id === activeId);
    if (!b){ A.closeBookPage(); return; }
    const sessions = S.sessions.filter(s => s.bookId === b.id)
      .sort((a,c)=>(c.date||'').localeCompare(a.date||''));
    const quotes = (S.quotes||[]).filter(q => q.bookId === b.id)
      .sort((a,c)=>(c.createdAt||0)-(a.createdAt||0));

    let tabContent;
    if (activeTab === 'sessions') tabContent = renderSessions(sessions);
    else if (activeTab === 'quotes') tabContent = renderQuotes(quotes);
    else if (activeTab === 'notes') tabContent = b.notes
      ? `<div class="bp-notes-big">${A.esc(b.notes)}</div>`
      : `<div class="empty" style="padding:36px 20px;font-size:13px">یادداشتی برای این کتاب ثبت نشده.</div>`;
    else if (activeTab === 'chat') tabContent = A.renderBookChat ? A.renderBookChat(b.id) : '<div class="empty">ماژول چت بارگذاری نشد.</div>';
    else tabContent = renderSummary(b, sessions, quotes);

    A.$('bookPageBody').innerHTML = `
      <button class="bp-close" type="button" data-bp="close" aria-label="بستن">✕</button>
      ${renderHero(b)}
      ${renderActions(b)}
      ${renderTabs(sessions, quotes)}
      <div class="bp-tab-content">${tabContent}</div>
      ${renderRelated(b)}
      ${renderSeries(b)}
    `;
  }

  A.openBookPage = function(id){
    const b = S.books.find(x => x.id === id);
    if (!b) return;
    activeId = id;
    activeTab = 'summary';
    render();
    A.$('bookPage').classList.add('open');
    A.$('bookPage').setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    const simBox = document.getElementById('similarBox');
    if (simBox){ simBox.hidden = true; simBox.innerHTML = ''; }
    if (activeTab === 'chat'){
      setTimeout(() => {
        const inp = A.$('chatInput');
        if (inp) inp.focus();
        const box = A.$('chatMessages');
        if (box) box.scrollTop = box.scrollHeight;
      }, 80);
    }
  };

  A.closeBookPage = function(){
    A.$('bookPage').classList.remove('open');
    A.$('bookPage').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    activeId = null;
  };

  A.refreshBookPage = function(){
    if (A.$('bookPage')?.classList.contains('open')) render();
  };

  A.bindBookPage = function(){
    const page = A.$('bookPage');
    if (!page) return;

    page.addEventListener('click', e => {
      // بستن با کلیک روی backdrop
      if (e.target === page){ A.closeBookPage(); return; }

      // تب
      const tab = e.target.closest('[data-bp-tab]');
      if (tab){
        activeTab = tab.dataset.bpTab;
        render();
        return;
      }

      // اکشن‌ها
      const btn = e.target.closest('[data-bp]');
      if (!btn) return;
      const action = btn.dataset.bp;
      const b = S.books.find(x => x.id === activeId);
      if (!b) return;

      if (action === 'close'){ A.closeBookPage(); return; }

      if (action === 'edit'){
        A.closeBookPage();
        setTimeout(() => A.openModal(b), 200);
        return;
      }
      if (action === 'quote'){
        A.closeBookPage();
        A.setTab('stats');
        setTimeout(() => {
          A.$('quoteBook').value = b.id;
          A.$('quoteText').focus();
          A.$('quoteForm').scrollIntoView({block:'center', behavior:'smooth'});
        }, 260);
        return;
      }
      if (action === 'progress'){ A.quickProgress(b.id); return; }
      if (action === 'timer'){
        A.closeBookPage();
        A.setTab('stats');
        setTimeout(() => {
          A.$('timerBook').value = b.id;
          A.$('timerToggle').scrollIntoView({block:'center', behavior:'smooth'});
          A.$('timerToggle').focus();
        }, 260);
        return;
      }
      if (action === 'fav'){
        b.favorite = !b.favorite;
        A.saveBooks();
        A.toast(b.favorite ? 'به علاقه‌مندی‌ها اضافه شد.' : 'از علاقه‌مندی‌ها حذف شد.');
        return;
      }
    });

    // پیشنهاد کتاب مشابه
    page.addEventListener('click', async e => {
      const sim = e.target.closest('[data-ai-similar]');
      if (sim){
        const bookId = sim.dataset.aiSimilar;
        const box = document.getElementById('similarBox');
        if (!box) return;
        box.hidden = false;
        box.innerHTML = '<div class="similar-loading">⏳ در حال تحلیل کتابخانه‌ات…</div>';
        box.scrollIntoView({block:'nearest', behavior:'smooth'});

        if (!A.aiCloudReady()){
          box.innerHTML = '<div class="similar-empty">⚠️ برای این قابلیت باید کلید AI را در تنظیمات وارد کنی.</div>';
          return;
        }

        const book = S.books.find(x => x.id === bookId);
        const results = await A.aiSimilarBooks(book);

        if (results === null){
          box.innerHTML = '<div class="similar-empty">❌ ارتباط با AI برقرار نشد. اینترنت یا کلید را بررسی کن.</div>';
          return;
        }
        if (!results.length){
          box.innerHTML = '<div class="similar-empty">🤷 کتاب مشابهی در کتابخانه‌ات پیدا نشد.</div>';
          return;
        }

        box.innerHTML = `
          <div class="similar-head">
            <span>🔍 پیشنهادهای مشابه</span>
            <button type="button" class="btn sm" data-similar-close="1" style="padding:3px 9px;min-height:auto;font-size:11px">✕</button>
          </div>
          <div class="similar-list">
            ${results.map(r => {
              const cover = A.coverGradient(r.book.title);
              return `<div class="similar-item" data-similar-open="${A.esc(r.book.id)}">
                <div class="similar-cover" style="background:${cover}">
                  ${A.esc(r.book.title.split(/\s+/).slice(0,2).join(' '))}
                </div>
                <div class="similar-body">
                  <b>${A.esc(r.book.title)}</b>
                  <div class="muted" style="font-size:11px;margin-bottom:5px">${A.esc(r.book.author || '—')} · ${A.esc(r.book.subject || '')}</div>
                  <div class="similar-reason">${A.esc(r.reason)}</div>
                </div>
              </div>`;
            }).join('')}
          </div>`;
        return;
      }

      const closeBtn = e.target.closest('[data-similar-close]');
      if (closeBtn){
        const box = document.getElementById('similarBox');
        if (box){ box.hidden = true; box.innerHTML = ''; }
        return;
      }

      const openItem = e.target.closest('[data-similar-open]');
      if (openItem){
        const id = openItem.dataset.similarOpen;
        A.closeBookPage();
        setTimeout(() => A.openBookPage(id), 220);
        return;
      }
    });
    };

    // Esc
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && page.classList.contains('open')){
        e.preventDefault();
        A.closeBookPage();
      }
    });
  
  function renderRelated(b){
    const ids = (b.relatedIds || []).filter(id => A.state.books.some(x => x.id === id));
    if (!ids.length) return '';
    const items = ids.map(id => {
      const rb = A.state.books.find(x => x.id === id);
      if (!rb) return '';
      const cover = A.coverGradient(rb.title);
      const coverUrl = A.coverStore ? A.coverStore.get(rb.id) : null;
      const coverStyle = coverUrl
        ? `background-image:url('${coverUrl}');background-size:cover;background-position:center`
        : `background:${cover}`;
      return `<button type="button" class="bp-related-item" data-bp-related="${A.esc(rb.id)}">
        <span class="bp-related-cover" style="${coverStyle}"></span>
        <span class="bp-related-info">
          <b>${A.esc(rb.title)}</b>
          <small>${A.esc(rb.author || '—')}</small>
        </span>
      </button>`;
    }).join('');
    return `<div class="bp-section">
      <h4 class="bp-section-title">🔗 کتاب‌های مرتبط</h4>
      <div class="bp-related-grid">${items}</div>
    </div>`;
  }

  function renderSeries(b){
    if (!b.series) return '';
    const siblings = A.state.books
      .filter(x => x.series === b.series && x.id !== b.id)
      .sort((x, y) => (x.seriesOrder || 0) - (y.seriesOrder || 0));
    if (!siblings.length) return '';
    const items = siblings.map(rb => {
      const cover = A.coverGradient(rb.title);
      const coverUrl = A.coverStore ? A.coverStore.get(rb.id) : null;
      const coverStyle = coverUrl
        ? `background-image:url('${coverUrl}');background-size:cover;background-position:center`
        : `background:${cover}`;
      return `<button type="button" class="bp-related-item" data-bp-related="${A.esc(rb.id)}">
        <span class="bp-related-cover" style="${coverStyle}"></span>
        <span class="bp-related-info">
          <b>${A.esc(rb.title)}</b>
          <small>${rb.seriesOrder ? `جلد ${A.fmt(rb.seriesOrder)}` : ''} ${A.esc(rb.author || '')}</small>
        </span>
      </button>`;
    }).join('');
    return `<div class="bp-section">
      <h4 class="bp-section-title">📚 جلدهای دیگر «${A.esc(b.series)}»</h4>
      <div class="bp-related-grid">${items}</div>
    </div>`;
  }

  // اضافه به bindBookPage
  const _origBind = A.bindBookPage;
  A.bindBookPage = function(){
    if (_origBind) _origBind();
    const page = A.$('bookPage');
    if (!page || page.dataset.relatedBound) return;
    page.dataset.relatedBound = '1';
    page.addEventListener('click', e => {
      const rel = e.target.closest('[data-bp-related]');
      if (rel){
        const id = rel.dataset.bpRelated;
        A.closeBookPage();
        setTimeout(() => A.openBookPage(id), 200);
      }
    });
  };
})(window.App);