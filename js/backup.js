(function(A){
  'use strict';
  const S = A.state;

  A.doExport = function(){
    // هشدار اگر عکس زیاد داریم
    const withCovers = S.books.filter(b => b.coverImage).length;
    if (withCovers > 30){
      const sizeMB = (withCovers * 60 / 1024).toFixed(1);
      if (!confirm(`شما ${withCovers} کتاب با عکس دارید. فایل پشتیبان تقریباً ${sizeMB} مگابایت می‌شود.\n\nادامه؟`)) return;
    }
    const checks = (() => { try { return JSON.parse(localStorage.getItem(A.KEYS.CHECKS) || '{}'); } catch(e){ return {}; } })();
    const chats  = (() => { try { return JSON.parse(localStorage.getItem('persianBookLibrary.chats.v1') || '{}'); } catch(e){ return {}; } })();
    const covers = A.coverStore ? A.coverStore.exportAll() : {};
    const payload = {
      version: 5,
      app: 'persianBookLibrary',
      exportedAt: new Date().toISOString(),
      books: S.books,
      sessions: S.sessions,
      dailyGoal: S.dailyGoal,
      prefs: S.prefs,
      quotes: S.quotes,
      checks,
      chats,
      viewMode: S.prefs.viewMode || 'list',
      covers
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `book-library-backup-${A.localDateKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    A.toast('فایل پشتیبان کامل دانلود شد.');
  };

  A.importBackup = async function(file){
    try {
      const obj = JSON.parse(await file.text());
      let arr, sess, goal, prefsIn, checksIn, coversIn;
      if (Array.isArray(obj)) arr = obj;
      else if (obj && Array.isArray(obj.books)){
        arr = obj.books; sess = obj.sessions; goal = obj.dailyGoal;
        prefsIn = obj.prefs; checksIn = obj.checks;
        coversIn = obj.covers;
      } else throw new Error('bad shape');

      // عکس‌های inline در پشتیبان قدیمی را استخراج کن
      const inlineCovers = {};
      arr.forEach(b => {
        if (b && b.id && typeof b.coverImage === 'string' && b.coverImage.startsWith('data:image/')){
          inlineCovers[String(b.id)] = b.coverImage;
        }
      });

      const clean = arr.map(A.sanitizeBook).filter(Boolean);
      const summary =
        `کتاب‌ها: ${clean.length}\n` +
        (Array.isArray(sess) ? `جلسه‌های مطالعه: ${sess.length}\n` : '') +
        (goal ? `هدف روزانه: ${goal} دقیقه\n` : '') +
        (prefsIn ? 'تنظیمات نمایش: بله\n' : '') +
        (checksIn ? 'وضعیت یادآورها: بله\n' : '');
      if (!confirm(`اطلاعات فعلی جایگزین شود؟\n\n${summary}\n(قابل بازگشت نیست)`)) return;

      S.books = clean;
      if (Array.isArray(sess)){
        S.sessions = sess.filter(x => x && x.id && x.date)
          .map(x => ({...x, minutes: Math.max(0, A.num(x.minutes)), pages: Math.max(0, A.num(x.pages))}));
      }
      if (goal) S.dailyGoal = Math.max(5, Math.min(600, A.num(goal, 30)));
      const quotesIn = (obj && !Array.isArray(obj) && Array.isArray(obj.quotes)) ? obj.quotes : null;

      // ذخیره عکس‌ها در IndexedDB
      if (A.coverStore){
        if (coversIn && typeof coversIn === 'object'){
          try { await A.coverStore.importAll(coversIn); } catch(e){}
        }
        if (Object.keys(inlineCovers).length){
          try { await A.coverStore.importAll(inlineCovers); } catch(e){}
        }
      }

      try {
        localStorage.setItem(A.KEYS.BOOKS, JSON.stringify(S.books));
        localStorage.setItem(A.KEYS.SESSIONS, JSON.stringify(S.sessions));
        localStorage.setItem(A.KEYS.GOAL, String(S.dailyGoal));
        if (Array.isArray(quotesIn)){
          S.quotes = quotesIn.filter(x => x && x.id && x.text);
          localStorage.setItem(A.KEYS.QUOTES, JSON.stringify(S.quotes));
        }
        if (prefsIn && typeof prefsIn === 'object'){
          S.prefs = {...A.PREF_DEFAULT, ...prefsIn};
          if (A.LEGACY_PALETTES[S.prefs.accentTheme])
            S.prefs.accentTheme = A.LEGACY_PALETTES[S.prefs.accentTheme];
          localStorage.setItem(A.KEYS.PREFS, JSON.stringify(S.prefs));
          A.applyPrefs();
        }
        if (checksIn && typeof checksIn === 'object'){
          localStorage.setItem(A.KEYS.CHECKS, JSON.stringify(checksIn));
          document.querySelectorAll('[data-task]').forEach(cb => { cb.checked = !!checksIn[cb.dataset.task]; });
        }
        const chatsIn = (obj && !Array.isArray(obj) && obj.chats) ? obj.chats : null;
        if (chatsIn && typeof chatsIn === 'object'){
          localStorage.setItem('persianBookLibrary.chats.v1', JSON.stringify(chatsIn));
        }
      } catch(e){}
      A.saveBooks({render: false});
      A.saveSessions({render: false});
      A.saveQuotes({render: false});
      A.renderAll();
      A.toast('بازیابی با موفقیت انجام شد.');
    } catch(err){
      alert('فایل پشتیبان معتبر نیست یا ساختار آن پشتیبانی نمی‌شود.');
    }
  };

  A.exportCSV = function(kind){
    if (kind === 'quotes'){
      const rows = [['تاریخ ثبت','کتاب','صفحه','متن','برچسب‌ها','مرحله مرور','مرور بعدی'],
        ...S.quotes.map(q => [
          A.localDateKey(new Date(q.createdAt || Date.now())),
          S.books.find(b=>b.id===q.bookId)?.title || q.bookTitle || '',
          q.page || '',
          q.text,
          (q.tags||[]).join(', '),
          q.reviewStage || 0,
          q.nextReview || ''
        ])];
      A.downloadText('quotes.csv', rows.map(r=>r.map(A.csvCell).join(',')).join('\r\n'));
      A.toast('خروجی نقل‌قول‌ها آماده شد.');
      return;
    }
    if (kind === 'sessions'){
      const rows = [['تاریخ','عنوان کتاب','مدت (دقیقه)','صفحات','از صفحه','یادداشت'],
        ...S.sessions.map(x => [
          x.date,
          x.bookTitle || (S.books.find(b=>b.id===x.bookId)?.title) || '',
          x.minutes, x.pages, x.fromPage, x.notes
        ])];
      A.downloadText('reading-sessions.csv', rows.map(r=>r.map(A.csvCell).join(',')).join('\r\n'));
      A.toast('خروجی جلسه‌ها آماده شد.');
      return;
    }
    const rows = [
      ['عنوان','نویسنده','موضوع','وضعیت','امتیاز','کل صفحات','صفحات خوانده‌شده','پیشرفت درصد','هزینه تومان','دلیل مطالعه','دوباره می‌خوانم','دسترسی','علاقه‌مندی','یادداشت'],
      ...S.books.map(b => [b.title,b.author,b.subject,b.status,b.score,b.pages,b.pagesdone,A.prog(b),b.price,b.reason,b.reread,b.access,b.favorite?'★':'',b.notes])
    ];
    A.downloadText('book-library.csv', rows.map(r=>r.map(A.csvCell).join(',')).join('\r\n'));
    A.toast('خروجی کتاب‌ها آماده شد.');
  };
})(window.App);