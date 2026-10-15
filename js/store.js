(function(A){
  'use strict';

  A.state = {
    books: [],
    sessions: [],
    dailyGoal: 30,
    prefs: {...A.PREF_DEFAULT},
    quotes: [],
    coversReady: false,
    sortKey: '',
    sortDir: 1,
    expanded: new Set(),
    lastDeleted: null,
    currentStatus: ''
  };

  // ===== محاسبات بصری کتاب =====
  // ضخامت عطف بر اساس تعداد صفحات (۲۴ تا ۵۴ پیکسل)
  A.bookThickness = function(pages){
    const p = Math.max(0, +pages || 0);
    return Math.max(24, Math.min(54, 24 + Math.round(p / 25)));
  };

  // اندازه کتاب از روی صفحات یا مقدار دستی
  A.bookSize = function(b){
    if (b && A.BOOK_SIZES[b.size]) return b.size;
    const p = Math.max(0, +(b && b.pages) || 0);
    if (p >= 500) return 'large';
    if (p >= 200) return 'medium';
    return 'small';
  };

  // ارتفاع کتاب بر اساس اندازه
  A.bookHeight = function(b){
    return (A.BOOK_SIZES[A.bookSize(b)] || A.BOOK_SIZES.medium).h;
  };

  // رنگ عطف: اگر دستی ست شده باشد از آن، وگرنه از گرادیانت نام
  A.bookSpineColor = function(b){
    if (b && b.spineColor) return b.spineColor;
    return A.coverGradient ? A.coverGradient(b ? b.title : '') : 'linear-gradient(135deg,#2a4a7a,#152b43)';
  };

  // رنگ پس‌زمینه یکدست عطف (برای متن روی spine)
  A.bookSpineSolid = function(b){
    const hex = (b && b.spineColor) ? b.spineColor : null;
    if (hex) return hex;
    let h = 0;
    const s = (b && b.title) || '';
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue} 45% 32%)`;
  };

  A.sanitizeBook = function(b){
    if (!b || typeof b !== 'object') return null;
    const title = String(b.title || '').trim().slice(0,150);
    if (!title) return null;
    const pages = Math.max(0, Math.round(A.num(b.pages)));
    let pagesdone = Math.max(0, Math.round(A.num(b.pagesdone)));
    if (pages > 0) pagesdone = Math.min(pages, pagesdone);
    const status = A.STATUSES.includes(b.status) ? b.status : 'خوانده نشده';
    if (status === 'خوانده شده' && pages > 0) pagesdone = pages;
    const score = A.SCORES.includes(b.score) ? b.score : '-';
    return {
      id: String(b.id || (Date.now().toString(36) + Math.random().toString(36).slice(2,7))),
      title, author: String(b.author || '').slice(0,150),
      subject: String(b.subject || 'سایر').slice(0,60),
      status, score, pages, pagesdone,
      price: Math.max(0, Math.round(A.num(b.price))),
      reason: String(b.reason || '').slice(0,80),
      reread: ['آره','نه','-'].includes(b.reread) ? b.reread : '-',
      access: String(b.access || '').slice(0,10),
      notes: String(b.notes || '').slice(0,2000),
      favorite: !!b.favorite,
      // فیلدهای بصری (اختیاری — اگر خالی باشند خودکار محاسبه می‌شوند)
      spineColor: b.spineColor ? String(b.spineColor).slice(0,40) : '',
      size: ['small','medium','large'].includes(b.size) ? b.size : '',
      shelf: String(b.shelf || 'default').slice(0,20),
      lying: !!b.lying,
      series: String(b.series || '').slice(0,80),
      seriesOrder: Math.max(0, Math.round(A.num(b.seriesOrder, 0))),
      relatedIds: Array.isArray(b.relatedIds)
        ? b.relatedIds.map(String).filter(Boolean).slice(0,20)
        : [],
      order: Math.max(0, Math.round(A.num(b.order, 0)))
    };
  };

  A.seedRowToBook = r => ({
    id: String(r[0]), title: r[1], author: r[2], subject: r[3], status: r[4],
    price: r[5], score: r[6], pages: r[7], pagesdone: r[8],
    reason: r[9], reread: r[10], access: r[11]
  });
  A.seedToBooks = function(){
    const src = (typeof window !== 'undefined' && Array.isArray(window.__SEED_BOOKS__))
      ? window.__SEED_BOOKS__ : [];
    return src.map(r => A.sanitizeBook(Array.isArray(r) ? A.seedRowToBook(r) : r)).filter(Boolean);
  };

  A.loadAll = async function(){
    try {
      const raw = JSON.parse(localStorage.getItem(A.KEYS.BOOKS) || 'null');
      if (Array.isArray(raw)){
        // مهاجرت عکس‌های inline از نسخه قدیمی
        let migrated = 0;
        if (A.coverStore && A.coverStore.put){
          for (const b of raw){
            if (b && b.id && typeof b.coverImage === 'string' && b.coverImage.startsWith('data:image/')){
              try { await A.coverStore.put(String(b.id), b.coverImage); migrated++; } catch(e){}
            }
          }
        }
        A.state.books = raw.map(A.sanitizeBook).filter(Boolean);
        if (migrated > 0){
          try { localStorage.setItem(A.KEYS.BOOKS, JSON.stringify(A.state.books)); } catch(e){}
          console.log('[cover-store] ' + migrated + ' عکس از localStorage منتقل شد');
        }
      } else {
        A.state.books = A.seedToBooks();
      }
    } catch(e){ A.state.books = A.seedToBooks(); }

    try {
      const raw = JSON.parse(localStorage.getItem(A.KEYS.SESSIONS) || '[]');
      A.state.sessions = Array.isArray(raw)
        ? raw.filter(x => x && x.id && x.date)
             .map(x => ({...x, minutes: Math.max(0, A.num(x.minutes)), pages: Math.max(0, A.num(x.pages))}))
        : [];
    } catch(e){ A.state.sessions = []; }

    try {
      const g = localStorage.getItem(A.KEYS.GOAL);
      A.state.dailyGoal = g === null ? 30 : Math.max(5, Math.min(600, A.num(g, 30)));
    } catch(e){}

    try {
      const saved = JSON.parse(localStorage.getItem(A.KEYS.PREFS) || '{}');
      A.state.prefs = {...A.PREF_DEFAULT, ...saved};
    } catch(e){ A.state.prefs = {...A.PREF_DEFAULT}; }
    if (A.LEGACY_PALETTES[A.state.prefs.accentTheme])
      A.state.prefs.accentTheme = A.LEGACY_PALETTES[A.state.prefs.accentTheme];

    try {
      const q = JSON.parse(localStorage.getItem(A.KEYS.QUOTES) || '[]');
      A.state.quotes = Array.isArray(q) ? q.filter(x => x && x.id && x.text) : [];
    } catch(e){ A.state.quotes = []; }
  };

  // ============ ذخیره‌سازی ============
  // قاعده: هر save فقط ذخیره می‌کند. رندر جداگانه صدا زده می‌شود.
  // این کار از حلقه بی‌پایان و کندی جلوگیری می‌کند.

  function safeRender(name){
    try { if (typeof A[name] === 'function') A[name](); }
    catch(e){ console.warn('[store] render failed:', name, e); }
  }

  A.saveBooks = function(opts){
    try { localStorage.setItem(A.KEYS.BOOKS, JSON.stringify(A.state.books)); }
    catch(e){ A.toast('ذخیره‌سازی ناموفق بود.'); }
    if (!opts || opts.render !== false){
      safeRender('renderAll');
    }
  };

  A.saveSessions = function(opts){
    try { localStorage.setItem(A.KEYS.SESSIONS, JSON.stringify(A.state.sessions)); }
    catch(e){ A.toast('ذخیره تاریخچه ناموفق بود.'); }
    if (!opts || opts.render !== false){
      safeRender('renderKpis');
      safeRender('renderReadingTools');
      safeRender('renderDashboardHero');
      safeRender('renderWeeklySparkline');
    }
  };

  A.savePrefs = function(opts){
    try { localStorage.setItem(A.KEYS.PREFS, JSON.stringify(A.state.prefs)); } catch(e){}
    if (!opts || opts.render !== false){
      safeRender('applyPrefs');
    }
  };

  A.saveGoal = function(opts){
    try { localStorage.setItem(A.KEYS.GOAL, String(A.state.dailyGoal)); } catch(e){}
    if (!opts || opts.render !== false){
      safeRender('renderReadingTools');
    }
  };

  A.saveQuotes = function(opts){
    try { localStorage.setItem(A.KEYS.QUOTES, JSON.stringify(A.state.quotes)); }
    catch(e){ A.toast('ذخیره نقل‌قول‌ها ناموفق بود.'); }
    if (!opts || opts.render !== false){
      safeRender('renderQuotes');
      safeRender('renderReviewQueue');
      safeRender('refreshQuoteBookOptions');
    }
  };
})(window.App);