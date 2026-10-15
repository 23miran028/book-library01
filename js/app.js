(function(A){
  'use strict';
  const S = A.state;

  A.setTab = function(name){
    if (!['dash','books','reading','quotes','stats','settings'].includes(name)) name = 'dash';
    document.querySelectorAll('[data-tab]').forEach(el => {
      el.classList.toggle('tab-hidden', el.dataset.tab !== name);
    });
    document.querySelectorAll('[data-tab-target]').forEach(b => {
      b.classList.toggle('active', b.dataset.tabTarget === name);
    });
    try { localStorage.setItem(A.KEYS.TAB, name); } catch(e){}
    if (name === 'dash') setTimeout(A.drawCharts, 150);
    if (A.closeSidebar) A.closeSidebar();
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  function bindTabs(){
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.tabTarget;
        if (t === '__add'){ A.openModal(); return; }
        A.setTab(t);
      });
    });
  }

  function bindSidebar(){
    const toggle = A.$('sidebarToggle');
    const sidebar = A.$('sidebar');
    const overlay = A.$('sidebarOverlay');
    const closeBtn = A.$('sidebarClose');
    if (!sidebar) return;

    function open(){
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('open');
      document.body.classList.add('locked');
    }
    function close(){
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      if (!A.$('modalbg')?.classList.contains('open') &&
          !A.$('bookPage')?.classList.contains('open')){
        document.body.classList.remove('locked');
      }
    }
    A.closeSidebar = close;
    A.openSidebar = open;

    if (toggle) toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);

    updateSidebarAvatar();
  }

  function updateSidebarAvatar(){
    const letterEl = A.$('sidebarAvatarLetter');
    const statEl = A.$('sidebarUserStat');
    if (letterEl){
      const total = S.books.length;
      const read = S.books.filter(b => b.status === 'خوانده شده').length;
      const letter = total ? 'ک' : '—';
      letterEl.textContent = letter;
    }
    if (statEl){
      const total = S.books.length;
      const read = S.books.filter(b => b.status === 'خوانده شده').length;
      statEl.textContent = total
        ? `${A.fmt(total)} کتاب · ${A.fmt(read)} خوانده‌شده`
        : 'هنوز کتابی ثبت نشده';
    }
  }
  A.updateSidebarAvatar = updateSidebarAvatar;

  function bindForm(){
    A.$('form').addEventListener('submit', async e => {
      e.preventDefault();
      const title = A.$('title').value.trim();
      if (!title){ A.$('title').focus(); A.toast('عنوان کتاب را وارد کن.'); return; }
      const pages = Math.max(0, Math.round(A.num(A.$('pagesinput').value)));
      let pagesdone = Math.max(0, Math.round(A.num(A.$('pagesdone').value)));
      if (pages > 0) pagesdone = Math.min(pages, pagesdone);
      const status = A.$('status').value;
      if (status === 'خوانده شده' && pages > 0) pagesdone = pages;
      const currentId = A.$('id').value;
      const existing = currentId ? S.books.find(x=>x.id===currentId) : null;
      const pending = A._getPendingCover ? A._getPendingCover() : null;

      const book = A.sanitizeBook({
        id: currentId || undefined,
        title,
        author: A.$('author').value,
        subject: A.$('subject').value,
        status, score: A.$('score').value,
        pages, pagesdone, price: A.$('price').value,
        reason: A.$('reason').value, reread: A.$('reread').value,
        access: A.$('access').value, notes: A.$('notes').value,
        favorite: existing ? existing.favorite : false,
        spineColor: existing ? existing.spineColor : '',
        size: existing ? existing.size : '',
        shelf: existing ? existing.shelf : 'default',
        lying: existing ? existing.lying : false,
        series: A.$('series').value.trim(),
        seriesOrder: A.num(A.$('seriesOrder').value, 0),
        relatedIds: A._getRelatedIds ? A._getRelatedIds() : []
      });
      if (!book) return;

      const i = S.books.findIndex(x => x.id === book.id);
      if (i < 0) S.books.unshift(book); else S.books[i] = book;

      (async () => {
        if (A.coverStore){
          if (pending === '') await A.coverStore.delete(book.id);
          else if (pending && pending.startsWith('data:image/')) await A.coverStore.put(book.id, pending);
        }
        A.closeModal();
        A.saveBooks();
        A.toast(i < 0 ? 'کتاب اضافه شد.' : 'تغییرات ذخیره شد.');
      })();
    });

    A.$('title').addEventListener('blur', () => {
      const t = A.norm(A.$('title').value);
      const curId = A.$('id').value;
      if (!t) return;
      const dup = S.books.find(b => A.norm(b.title) === t && b.id !== curId);
      if (dup){
        A.$('dupWarning').style.display = 'block';
        A.$('dupWarning').innerHTML = `⚠️ کتابی با همین عنوان قبلاً ثبت شده: «${A.esc(dup.title)}» (${A.esc(dup.author||'—')})`;
      } else {
        A.$('dupWarning').style.display = 'none';
      }
    });

    ['close','cancel'].forEach(id => A.$(id).addEventListener('click', A.closeModal));
    A.$('modalbg').addEventListener('click', e => { if (e.target === A.$('modalbg')) A.closeModal(); });
    document.addEventListener('keydown', A.trapFocus);

    A.$('delete').addEventListener('click', () => {
      const id = A.$('id').value;
      const b = S.books.find(x => String(x.id) === id);
      if (!b) return;
      if (!confirm(`کتاب «${b.title}» حذف شود؟`)) return;
      S.lastDeleted = { book: b, index: S.books.indexOf(b) };
      S.books = S.books.filter(x => x.id !== b.id);
      A.closeModal();
      A.saveBooks();
      A.toast('کتاب حذف شد.', 'بازگردانی', () => {
        if (!S.lastDeleted) return;
        S.books.splice(Math.min(S.lastDeleted.index, S.books.length), 0, S.lastDeleted.book);
        S.lastDeleted = null;
        A.saveBooks();
      });
    });

    ['add','add2'].forEach(id => A.$(id).addEventListener('click', () => A.openModal()));
  }

  function bindTable(){
    A.$('tbody').addEventListener('click', e => {
      const fav = e.target.closest('[data-fav]');
      if (fav){
        const b = S.books.find(x => x.id === fav.dataset.fav);
        if (b){ b.favorite = !b.favorite; A.saveBooks(); }
        return;
      }
      const qp = e.target.closest('[data-quick-progress]');
      if (qp){ A.quickProgress(qp.dataset.quickProgress); return; }
      const exp = e.target.closest('[data-exp]');
      if (exp){
        const id = exp.dataset.exp;
        if (S.expanded.has(id)) S.expanded.delete(id); else S.expanded.add(id);
        A.renderTable(); return;
      }
      const ed = e.target.closest('[data-edit]');
      if (ed){
        const b = S.books.find(x => String(x.id) === ed.dataset.edit);
        if (b) A.openModal(b);
        return;
      }
      const tr = e.target.closest('tr');
      if (tr && !e.target.closest('button')){
        const favBtn = tr.querySelector('[data-fav]');
        if (favBtn) A.openBookPage(favBtn.dataset.fav);
      }
    });

    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (S.sortKey === key) S.sortDir = -S.sortDir;
        else { S.sortKey = key; S.sortDir = 1; }
        document.querySelectorAll('th[data-sort]').forEach(x => x.classList.remove('active'));
        th.classList.add('active');
        A.renderBooksView();
      });
    });

    A.$('statusChips').addEventListener('click', e => {
      const c = e.target.closest('[data-chip]'); if (!c) return;
      const v = c.dataset.chip;
      if (v === '__fav'){ S.currentStatus = ''; A.$('filterFav').value = 'fav'; }
      else { S.currentStatus = v; A.$('filterFav').value = ''; }
      A.renderChips();
      A.renderTable();
    });

    A.$('drawerBody').addEventListener('click', e => {
      const op = e.target.closest('[data-open-page]');
      if (op){
        A.closeDrawer();
        setTimeout(() => A.openBookPage(op.dataset.openPage), 180);
        return;
      }
      const ed = e.target.closest('[data-edit]');
      if (ed){
        const b = S.books.find(x => x.id === ed.dataset.edit);
        if (b){ A.closeDrawer(); A.openModal(b); }
        return;
      }
      const aq = e.target.closest('[data-add-quote]');
      if (aq){
        const b = S.books.find(x => x.id === aq.dataset.addQuote);
        if (b){
          A.closeDrawer();
          A.setTab('stats');
          setTimeout(() => {
            A.$('quoteBook').value = b.id;
            A.$('quoteText').focus();
            A.$('quoteForm').scrollIntoView({block:'center', behavior:'smooth'});
          }, 300);
        }
        return;
      }
      const qp = e.target.closest('[data-quick-progress]');
      if (qp){ A.quickProgress(qp.dataset.quickProgress); return; }
      const tf = e.target.closest('[data-toggle-fav]');
      if (tf){
        const b = S.books.find(x => x.id === tf.dataset.toggleFav);
        if (b){ b.favorite = !b.favorite; A.saveBooks(); A.openDrawer(b.id); }
        return;
      }
      const tl = e.target.closest('[data-toggle-lying]');
      if (tl){
        const b = S.books.find(x => x.id === tl.dataset.toggleLying);
        if (b){
          b.lying = !b.lying;
          A.saveBooks();
          A.openDrawer(b.id);
          A.toast(b.lying ? 'کتاب خوابیده شد.' : 'کتاب ایستاد.');
        }
        return;
      }
    });
  }

  function bindFilters(){
    let searchTimer;
    A.$('search').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(A.renderBooksView, 150);
    });
    ['filterSubject','filterScore','filterAccess','filterFav'].forEach(id => {
      A.$(id).addEventListener('change', A.renderBooksView);
    });

    const sv = A.$('showSeries');
    if (sv){
      sv.addEventListener('click', () => {
        A.$('search').value = '';
        A.$('filterSubject').value = '';
        A.$('filterScore').value = '';
        A.$('filterAccess').value = '';
        A.$('filterFav').value = '';
        S.currentStatus = '';
        A.showSeriesView = true;
        if (A.renderSeriesGroups) A.renderSeriesGroups();
      });
    }

    A.$('all').addEventListener('click', () => {
      A.$('search').value = '';
      A.$('filterSubject').value = '';
      A.$('filterScore').value = '';
      A.$('filterAccess').value = '';
      A.$('filterFav').value = '';
      S.currentStatus = '';
      A.renderChips(); A.renderBooksView(); A.setTab('books');
    });
    A.$('showqueue').addEventListener('click', () => {
      A.$('search').value = ''; A.$('filterSubject').value = ''; A.$('filterScore').value = ''; A.$('filterAccess').value = ''; A.$('filterFav').value = '';
      S.currentStatus = 'صف مطالعه';
      A.renderChips(); A.renderBooksView(); A.setTab('books');
    });
    A.$('showhalf').addEventListener('click', () => {
      A.$('search').value = ''; A.$('filterSubject').value = ''; A.$('filterScore').value = ''; A.$('filterAccess').value = ''; A.$('filterFav').value = '';
      S.currentStatus = 'نیمه کاره';
      A.renderChips(); A.renderBooksView(); A.setTab('books');
    });
    A.$('showFav').addEventListener('click', () => {
      A.$('search').value = ''; A.$('filterSubject').value = ''; A.$('filterScore').value = ''; A.$('filterAccess').value = '';
      A.$('filterFav').value = 'fav';
      S.currentStatus = '';
      A.renderChips(); A.renderBooksView(); A.setTab('books');
    });
    A.$('clear').addEventListener('click', () => {
      A.$('search').value = ''; A.$('filterSubject').value = ''; A.$('filterScore').value = ''; A.$('filterAccess').value = ''; A.$('filterFav').value = '';
      S.currentStatus = '';
      A.renderChips(); A.renderBooksView();
    });
  }

  function bindTasks(){
    try {
      const tasks = JSON.parse(localStorage.getItem(A.KEYS.CHECKS) || '{}');
      document.querySelectorAll('[data-task]').forEach(cb => {
        if (tasks[cb.dataset.task]) cb.checked = true;
        cb.addEventListener('change', () => {
          const cur = JSON.parse(localStorage.getItem(A.KEYS.CHECKS) || '{}');
          cur[cb.dataset.task] = cb.checked;
          try { localStorage.setItem(A.KEYS.CHECKS, JSON.stringify(cur)); } catch(e){}
        });
      });
    } catch(e){}
  }

  function bindBackup(){
    A.$('export').addEventListener('click', A.doExport);
    A.$('exportCsv').addEventListener('click', () => A.exportCSV('books'));
    A.$('exportQuotes')?.addEventListener('click', () => A.exportCSV('quotes'));
    A.$('printPage').addEventListener('click', () => window.print());
    A.$('import').addEventListener('click', () => A.$('file').click());
        // دکمه AI بعدی
    const aiNext = A.$('aiNextBookBtn');
    if (aiNext){
      aiNext.addEventListener('click', async () => {
        const out = A.$('aiNextBookOut');
        if (!out) return;
        if (!A.aiCloudReady()){
          out.textContent = '⚠️ ابتدا کلید AI را در تنظیمات وارد کن.';
          out.className = 'ai-next-out show';
          return;
        }
        out.textContent = '⏳ در حال تحلیل تاریخچه مطالعه‌ات…';
        out.className = 'ai-next-out show busy';
        const results = await A.aiNextBook();
        out.className = 'ai-next-out show';
        if (results === null){ out.textContent = '❌ ارتباط با AI برقرار نشد.'; return; }
        if (!results.length){ out.textContent = '🤷 کتاب مناسبی پیدا نشد.'; return; }
        out.innerHTML = `
          <div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">پیشنهاد بر اساس کتاب‌های قبلی و نقل‌قول‌هایت:</div>
          ${results.map(r => {
            const cover = A.coverGradient(r.book.title);
            const coverUrl = A.coverStore ? A.coverStore.get(r.book.id) : null;
            const coverStyle = coverUrl
              ? `background-image:url('${coverUrl}');background-size:cover;background-position:center`
              : `background:${cover}`;
            return `<div class="ai-next-item" data-ai-next-open="${A.esc(r.book.id)}">
              <div class="ai-next-cover" style="${coverStyle}"></div>
              <div class="ai-next-info">
                <b>${A.esc(r.book.title)}</b>
                <small>${A.esc(r.book.author || '—')} · ${A.esc(r.book.subject || '')}</small>
                <p>${A.esc(r.reason)}</p>
              </div>
            </div>`;
          }).join('')}`;
      });

      A.$('aiNextBookOut').addEventListener('click', e => {
        const item = e.target.closest('[data-ai-next-open]');
        if (item && A.openBookPage) A.openBookPage(item.dataset.aiNextOpen);
      });
    }

    // دکمه برچسب‌گذاری AI
    const aiTag = A.$('aiTagAllBtn');
    if (aiTag){
      aiTag.addEventListener('click', async () => {
        const out = A.$('aiTagOut');
        if (!out) return;
        if (!A.aiCloudReady()){
          out.textContent = '⚠️ ابتدا کلید AI را وارد کن.';
          out.className = 'ai-tag-out show';
          return;
        }
        if (!confirm('به همه نقل‌قول‌های بدون برچسب، AI برچسب اضافه کند؟\n(ممکن است چند دقیقه طول بکشد)')){
          return;
        }
        out.className = 'ai-tag-out show';
        out.textContent = '⏳ در حال پردازش…';
        const res = await A.aiAutoTagAll(({ current, total, done, failed }) => {
          out.textContent = `⏳ ${A.fmt(current)} از ${A.fmt(total)} — موفق: ${A.fmt(done)}${failed ? ` — ناموفق: ${A.fmt(failed)}` : ''}`;
        });
        if (res.error === 'no-key'){ out.textContent = '⚠️ کلید AI نیست.'; return; }
        if (res.skipped){ out.textContent = '✓ همه نقل‌قول‌ها از قبل برچسب داشتند.'; return; }
        out.textContent = `✅ انجام شد — ${A.fmt(res.done)} از ${A.fmt(res.total)} موفق${res.failed ? ` · ${A.fmt(res.failed)} ناموفق` : ''}`;
      });
    }

    A.$('file').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      await A.importBackup(f);
    });
  }

  function bindStorageSync(){
    window.addEventListener('storage', e => {
      if (e.key !== A.KEYS.BOOKS || e.newValue == null) return;
      try {
        const arr = JSON.parse(e.newValue);
        if (Array.isArray(arr)){
          S.books = arr.map(A.sanitizeBook).filter(Boolean);
          A.renderAll();
        }
      } catch(_){}
    });
  }

  function bindResize(){
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(A.drawCharts, 150); });
    window.addEventListener('orientationchange', () => setTimeout(A.drawCharts, 350));
    window.addEventListener('resize', () => {
      const current = document.querySelector('.bottom-nav button.active')?.dataset.tabTarget || 'dash';
      if (current !== '__add' && current !== '__settings') A.setTab(current);
    });
  }

  function bindShortcuts(){
    document.addEventListener('keydown', e => {
      const tag = e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); A.openCmdk(); return; }
      if (e.key === 'Escape'){
        if (A.$('cmdk').classList.contains('open')) A.closeCmdk();
        else if (A.$('modalbg').classList.contains('open')) A.closeModal();
        else if (A.$('drawer').classList.contains('open')) A.closeDrawer();
        return;
      }
      if (typing) return;
      if (e.key.toLowerCase() === 'n'){ e.preventDefault(); A.openModal(); }
      if (e.key === '/'){ e.preventDefault(); A.setTab('books'); setTimeout(()=>{ const s = A.$('search'); if (s) s.focus(); }, 200); }
      if (e.key.toLowerCase() === 't'){ e.preventDefault(); A.setTab('reading'); setTimeout(()=>A.$('timerToggle').focus(),300); }
      if (e.key.toLowerCase() === 'a' && e.shiftKey){
        e.preventDefault();
        A.$('filterFav').value = '';
        A.$('search').value = '';
        A.$('filterSubject').value = '';
        A.$('filterScore').value = '';
        A.$('filterAccess').value = '';
        S.currentStatus = A.ARCHIVE_STATUS;
        A.setTab('books');
        setTimeout(() => { A.renderChips(); A.renderBooksView(); }, 80);
      }
    });
  }

  function bindShortcutQuery(){
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    const filter = params.get('filter');
    function trigger(id){ const el = A.$(id); if (el) el.click(); }
    if (action === 'add')   setTimeout(() => trigger('add'), 500);
    if (action === 'timer') setTimeout(() => { const t = A.$('timerToggle'); if (t){ t.scrollIntoView({behavior:'smooth', block:'center'}); t.focus(); } }, 500);
    if (filter === 'queue') setTimeout(() => trigger('showqueue'), 500);
    if (action || filter) history.replaceState({}, '', location.pathname);
  }

  A.init = async function(){
    if (A.coverStore) await A.coverStore.init();
    await A.loadAll();

    A.populate('subject', A.SUBJECTS);
    A.populate('score', A.SCORES);
    A.populate('filterSubject', A.SUBJECTS, true, null, 'همه موضوعات');
    A.populate('filterScore', A.SCORES, true, null, 'همه امتیازها');

    bindTabs();
    bindSidebar();
    bindForm();
    bindTable();
    bindFilters();
    bindTasks();
    bindBackup();
    bindStorageSync();
    bindResize();
    bindShortcuts();
    A.bindSessions();
    A.bindTimer();
    A.bindTheme();
    A.bindModals();
    const sb = A.$('settingsBtn');
    if (sb) sb.addEventListener('click', () => A.setTab('settings'));
    A.bindBookCover();
    A.bindRelatedPicker();
    if (A.bindDailyQuote) A.bindDailyQuote();
    if (A.bindGestures) A.bindGestures();
    A.bindQuotes();
    A.bindViews();
    if (A.bindShelf) A.bindShelf();
    A.bindBookPage();
    A.bindAmbient();
    A.bindReports();
    A.bindRecommend();
    if (A.bindAI) A.bindAI();
    if (A.bindAICloud) A.bindAICloud();
    if (A.bindBookChat) A.bindBookChat();

    A.applyPrefs();
    A.renderAll();

    let savedTab = null;
    try { savedTab = localStorage.getItem(A.KEYS.TAB); } catch(e){}
    const validTabs = ['dash','books','reading','quotes','stats','settings'];
    const initialTab = validTabs.includes(savedTab) ? savedTab : 'dash';
    A.setTab(initialTab);

    // در دسکتاپ هم تب‌ها جدا می‌مانند — دیگر همه چیز با هم نمایش داده نمی‌شود

    bindShortcutQuery();

    // چک فونت حذف شد
  };

  A.init();
})(window.App);