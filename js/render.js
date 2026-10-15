(function(A){
  'use strict';
  const S = A.state;

  A.renderKpis = function(){
    const books = S.books;
    const total  = books.length;
    const read   = books.filter(b => b.status === 'خوانده شده').length;
    const active = books.filter(b => b.status === 'درحال خواندن').length;
    const half   = books.filter(b => b.status === 'نیمه کاره').length;
    const queue  = books.filter(b => b.status === 'صف مطالعه').length;
    const unread = books.filter(b => b.status === 'خوانده نشده').length;
    const allPages = books.reduce((s,b) => s + (+b.pages || 0), 0);
    const avg = A.weightedAvgScore();
    const rated = books.filter(b => A.SCORE_VALUE[b.score] > 0).length;

    A.$('total').textContent      = A.fmt(total);
    A.$('totalpages').textContent = A.fmt(allPages) + ' صفحه';
    A.$('read').textContent       = A.fmt(read);
    A.$('readpct').textContent    = A.percent(total ? read/total*100 : 0) + ' از کل';
    A.$('active').textContent     = A.fmt(active);
    A.$('half').textContent       = A.fmt(half);
    A.$('queue').textContent      = A.fmt(queue);
    A.$('unread').textContent     = A.fmt(unread);
    A.$('unreadpct').textContent  = A.percent(total ? unread/total*100 : 0) + ' از کل';
    A.$('rating').textContent     = avg == null ? '—' : A.fmt1(avg);
    A.$('ratedcount').textContent = A.fmt(rated) + ' کتاب امتیازدار';
    A.$('pages').textContent      = A.fmt(allPages);
    A.$('pagesread').textContent  = A.fmt(books.reduce((s,b) => s + (+b.pagesdone || 0), 0));
    const withPages = books.filter(b => +b.pages > 0);
    A.$('avgprogress').textContent = A.percent(withPages.length
      ? withPages.reduce((s,b) => s + A.prog(b), 0) / withPages.length : 0);
    A.$('cost').textContent = A.money(books.reduce((s,b) => s + (+b.price || 0), 0));
    const sp = A.readingSpeed();
    A.$('speed').textContent = sp == null ? '—' : A.fmt1(sp) + ' صفحه/ساعت';
    const st = A.streakInfo();
    A.$('streakNum').textContent  = A.fmt(st.current);
    A.$('bestStreak').textContent = A.fmt(st.best);
  };

  A.detailRow = function(b){
    const parts = [];
    if (b.reason) parts.push(`<b>دلیل:</b> ${A.esc(b.reason)}`);
    if (b.reread && b.reread !== '-') parts.push(`<b>بازخوانی:</b> ${A.esc(b.reread)}`);
    if (b.access) parts.push(`<b>دسترسی:</b> ${A.esc(b.access)}`);
    if (b.price)  parts.push(`<b>هزینه:</b> ${A.money(b.price)}`);
    const meta = parts.length ? parts.join(' · ') : '<b>اطلاعات تکمیلی ثبت نشده.</b>';
    const notes = b.notes ? `<div style="margin-top:6px"><b>یادداشت:</b> ${A.esc(b.notes)}</div>` : '';
    return `<tr class="detailrow"><td colspan="8">${meta}${notes}</td></tr>`;
  };

  A.renderTable = function(prefiltered){
    const filtered = prefiltered || A.getFiltered();

    A.$('tbody').innerHTML = filtered.map(b => {
      const open = S.expanded.has(b.id);
      const pct = A.prog(b);
      return `<tr class="${open?'expanded':''}">
        <td data-cell="title">
          <b>${A.esc(b.title)}</b>
          <button type="button" class="star-btn ${b.favorite?'on':''}" data-fav="${A.esc(b.id)}" aria-label="علاقه‌مندی">${b.favorite?'★':'☆'}</button>
          <button type="button" class="expand" data-exp="${A.esc(b.id)}" aria-expanded="${open}" aria-label="جزئیات">${open ? '▾' : '▸'}</button>
        </td>
        <td data-label="نویسنده">${A.esc(b.author || '—')}</td>
        <td data-label="موضوع">${A.esc(b.subject || '—')}</td>
        <td data-label="وضعیت">${A.statusPill(b.status)}</td>
        <td data-label="پیشرفت"><span class="progress" data-quick-progress="${A.esc(b.id)}" title="کلیک برای به‌روزرسانی"><i style="width:${pct}%"></i></span><span class="progress-info">${A.percent(pct)}</span></td>
        <td data-label="امتیاز">${A.scorePill(b.score)}</td>
        <td data-label="دسترسی">${A.esc(b.access || '—')}</td>
        <td data-cell="actions"><button class="btn sm" type="button" data-edit="${A.esc(b.id)}">✎ ویرایش</button></td>
      </tr>` + (open ? A.detailRow(b) : '');
    }).join('');
  };

  A.renderFilters = function(){
    const subjSet = new Set(A.SUBJECTS);
    S.books.forEach(b => { if (b.subject) subjSet.add(b.subject); });
    A.populate('filterSubject', [...subjSet], true, A.$('filterSubject').value, 'همه موضوعات');
    A.populate('filterScore', A.SCORES, true, A.$('filterScore').value, 'همه امتیازها');
    const accessSet = new Set();
    S.books.forEach(b => { if (b.access) accessSet.add(b.access); });
    A.populate('filterAccess', [...accessSet].sort(), true, A.$('filterAccess').value, 'همه دسترسی‌ها');
  };

  A.renderChips = function(){
    const favCount = S.books.filter(b=>b.favorite).length;
    const all = [{v:'', l:'همه', c:'#a9c0dd', n:S.books.length}];
    A.STATUSES.forEach(s => all.push({v:s, l:s, c:A.STATUS_COLORS[s], n: S.books.filter(b => b.status === s).length}));
    if (favCount) all.push({v:'__fav', l:'⭐ علاقه‌مندی', c:'#f6c747', n: favCount});
    A.$('statusChips').innerHTML = all.map(x =>
      `<button type="button" class="chip ${S.currentStatus === x.v ? 'on' : ''}" data-chip="${A.esc(x.v)}"><i class="dot" style="background:${x.c}"></i>${A.esc(x.l)} <span class="muted">(${A.fmt(x.n)})</span></button>`
    ).join('');
  };

  A.renderRecommend = function(){
    if (A.renderSmartRecommend) A.renderSmartRecommend();
  };

  A.renderAll = function(){
    A.renderKpis();
    A.renderFilters();
    A.renderChips();
    if (A.renderBooksView) A.renderBooksView(); else A.renderTable();
    A.drawCharts();
    if (A.drawRadar) A.drawRadar();
    A.renderRecommend();
    A.renderReadingTools();
    if (A.updateSidebarAvatar) A.updateSidebarAvatar();
    if (A.refreshQuoteBookOptions) A.refreshQuoteBookOptions();
    if (A.renderQuotes) A.renderQuotes();
    if (A.renderReviewQueue) A.renderReviewQueue();
    if (A.refreshBookPage) A.refreshBookPage();
    if (A.renderDashboardHero) A.renderDashboardHero();
    if (A.renderWeeklySparkline) A.renderWeeklySparkline();
    if (A.renderReports) A.renderReports();
  };
})(window.App);