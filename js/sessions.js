(function(A){
  'use strict';
  const S = A.state;

  A.readingSpeed = function(){
    const totalMins = S.sessions.reduce((s,x)=>s+(+x.minutes||0),0);
    const totalPages = S.sessions.reduce((s,x)=>s+(+x.pages||0),0);
    if (totalMins < 5 || totalPages < 1) return null;
    return totalPages / (totalMins/60);
  };

  A.streakInfo = function(){
    if (!S.sessions.length) return {current:0, best:0};
    const dates = [...new Set(S.sessions.map(s=>s.date))].sort();
    const today = A.localDateKey();
    const yest = A.localDateKey(new Date(Date.now()-86400000));
    let current = 0;
    if (dates.includes(today) || dates.includes(yest)){
      let cursor = dates.includes(today) ? new Date() : new Date(Date.now()-86400000);
      for(;;){
        const k = A.localDateKey(cursor);
        if (dates.includes(k)){ current++; cursor = new Date(cursor.getTime()-86400000); }
        else break;
      }
    }
    let best = 0, run = 0, prev = null;
    dates.forEach(d => {
      if (prev){
        const gap = (new Date(d) - new Date(prev)) / 86400000;
        if (gap === 1) run++; else run = 1;
      } else run = 1;
      if (run > best) best = run;
      prev = d;
    });
    return {current, best};
  };

  A.renderSessionBookOptions = function(){
    const el = A.$('sessionBook'); if (!el) return;
    const old = el.value;
    const sorted = S.books.slice().sort((a,b) => A.norm(a.title).localeCompare(A.norm(b.title),'fa'));
    el.innerHTML = sorted.length
      ? sorted.map(b => `<option value="${A.esc(b.id)}">${A.esc(b.title)}</option>`).join('')
      : '<option value="">ابتدا یک کتاب اضافه کن</option>';
    if (sorted.some(b => b.id === old)) el.value = old;
  };

  A.renderReadingTools = function(){
    if (!A.$('dailyGoal')) return;
    A.$('dailyGoal').value = S.dailyGoal;
    A.renderSessionBookOptions();
    if (A.renderTimerBookOptions) A.renderTimerBookOptions();

    const today = A.localDateKey(), now = new Date();
    const monday = new Date(now); monday.setHours(0,0,0,0);
    monday.setDate(now.getDate() - ((now.getDay()+6)%7));
    const mondayKey = A.localDateKey(monday);

    const todayRows = S.sessions.filter(x => x.date === today);
    const weekRows  = S.sessions.filter(x => x.date >= mondayKey && x.date <= today);
    const mins      = todayRows.reduce((a,x)=>a+(+x.minutes||0),0);
    const weekMins  = weekRows.reduce((a,x)=>a+(+x.minutes||0),0);
    const weekPages = weekRows.reduce((a,x)=>a+(+x.pages||0),0);

    A.$('todayMinutes').textContent = A.fmt(mins) + ' دقیقه امروز';
    A.$('goalPercent').textContent  = A.percent(Math.min(100, mins/S.dailyGoal*100));
    A.$('goalFill').style.width     = Math.min(100, mins/S.dailyGoal*100) + '%';
    A.$('weekMinutes').textContent  = A.fmt(weekMins) + ' دقیقه';
    A.$('weekPages').textContent    = A.fmt(weekPages);

    const recent = S.sessions.slice()
      .sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0))
      .slice(0,8);
    A.$('sessionList').innerHTML = recent.length
      ? recent.map(x => {
          const b = S.books.find(z => z.id === x.bookId);
          return `<div class="session-item"><div><b>${A.esc(b?.title || x.bookTitle || 'کتاب حذف‌شده')}</b><small>${A.esc(x.date)} · ${A.fmt(x.minutes)} دقیقه · ${A.fmt(x.pages)} صفحه</small>${x.notes?`<small>${A.esc(x.notes)}</small>`:''}</div><button type="button" data-delete-session="${A.esc(x.id)}" aria-label="حذف جلسه">حذف</button></div>`;
        }).join('')
      : '<div class="empty" style="padding:20px;font-size:12px">هنوز جلسه‌ای ثبت نشده است.</div>';
  };

  A.bindSessions = function(){
    A.$('sessionDate').value = A.localDateKey();

    A.$('dailyGoal').addEventListener('change', () => {
      S.dailyGoal = Math.max(5, Math.min(600, A.num(A.$('dailyGoal').value, 30)));
      A.$('dailyGoal').value = S.dailyGoal;
      A.saveGoal();
      A.renderReadingTools();
      A.toast('هدف روزانه ذخیره شد.');
    });

    A.$('sessionForm').addEventListener('submit', e => {
      e.preventDefault();
      const book = S.books.find(b => b.id === A.$('sessionBook').value);
      if (!book){ A.toast('ابتدا یک کتاب ثبت کن.'); return; }
      const minutes = Math.max(1, Math.min(1440, A.num(A.$('sessionMinutes').value, 0)));
      const pages   = Math.max(0, Math.min(10000, A.num(A.$('sessionPages').value, 0)));
      const date = A.$('sessionDate').value;
      if (!date || !minutes){ A.toast('تاریخ و مدت مطالعه را بررسی کن.'); return; }

      S.sessions.push({
        id: Date.now().toString(36)+Math.random().toString(36).slice(2,6),
        bookId: book.id, bookTitle: book.title, date, minutes, pages,
        fromPage: Math.max(0, A.num(A.$('sessionFrom').value)),
        notes: A.$('sessionNotes').value.trim().slice(0,500),
        createdAt: Date.now()
      });
      A.saveSessions();

      if (pages > 0 && book.pages > 0){
        book.pagesdone = Math.min(book.pages, (+book.pagesdone||0) + pages);
        if (book.pagesdone >= book.pages) book.status = 'خوانده شده';
        else if (book.status === 'خوانده نشده' || book.status === 'صف مطالعه') book.status = 'درحال خواندن';
      }
      A.saveBooks();

      A.$('sessionMinutes').value = 30;
      A.$('sessionPages').value = 0;
      A.$('sessionFrom').value = '';
      A.$('sessionNotes').value = '';
      A.$('sessionDate').value = A.localDateKey();
      A.toast('جلسه مطالعه ثبت شد.');
    });

    A.$('sessionList').addEventListener('click', e => {
      const btn = e.target.closest('[data-delete-session]'); if (!btn) return;
      const id = btn.dataset.deleteSession;
      if (!confirm('این جلسه از تاریخچه حذف شود؟ (پیشرفت کتاب به عقب برنمی‌گردد)')) return;
      S.sessions = S.sessions.filter(x => x.id !== id);
      A.saveSessions();
      A.renderReadingTools();
      A.toast('جلسه حذف شد.');
    });

    A.$('exportSessions').addEventListener('click', () => A.exportCSV('sessions'));
    A.$('clearSessions').addEventListener('click', () => {
      if (!S.sessions.length){ A.toast('تاریخچه‌ای برای پاک‌کردن وجود ندارد.'); return; }
      if (confirm(`تمام ${S.sessions.length} جلسه مطالعه حذف شود؟ پیشرفت کتاب‌ها حفظ خواهد شد.`)){
        S.sessions = [];
        A.saveSessions();
        A.renderReadingTools();
        A.toast('تاریخچه پاک شد.');
      }
    });
  };
})(window.App);