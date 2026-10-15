(function(A){
  'use strict';

  const state = {
    session: null,
    downloading: false,
    ready: false
  };

  A.aiStatus = function(){ return { ...state }; };

  async function checkAvailability(){
    if (!('LanguageModel' in window)) return 'unavailable';
    try { return await LanguageModel.availability(); }
    catch(e){ return 'unavailable'; }
  }

  async function ensureSession(onProgress){
    if (state.session) return state.session;
    const avail = await checkAvailability();
    if (avail === 'unavailable') throw new Error('unavailable');
    state.session = await LanguageModel.create({
      initialPrompts: [{
        role: 'system',
        content: 'تو یک دستیار فارسی‌زبان برای یک برنامه مدیریت کتابخانه شخصی هستی. همیشه فارسی روان و کوتاه جواب بده. لحن گرم و مفید داشته باش.'
      }],
      monitor(m){
        m.addEventListener('downloadprogress', e => {
          state.downloading = true;
          const pct = Math.round((e.loaded / e.total) * 100);
          if (onProgress) onProgress(pct);
        });
      }
    });
    state.downloading = false;
    state.ready = true;
    return state.session;
  }

  function isAvailable(){
    return 'LanguageModel' in window;
  }

  // ============ ۱) چرا این کتاب؟ (در پنل پیشنهاد) ============
  A.aiWhyThisBook = async function(book){
    if (!isAvailable() || !book) return null;
    try {
      const session = await ensureSession();
      const status = book.status || '';
      const reason = book.reason ? `دلیل ثبت‌شده: ${book.reason}.` : '';
      const score = book.score && book.score !== '-' ? `امتیاز من به این کتاب: ${book.score}.` : '';
      const prompt = `کاربر من در حال انتخاب کتاب است. این کتاب را به من پیشنهاد بده و در ۲ یا ۳ جمله بگو چرا. عنوان: «${book.title}». نویسنده: ${book.author||'نامشخص'}. موضوع: ${book.subject||'سایر'}. وضعیت: ${status}. ${reason} ${score} فقط به فارسی و خیلی کوتاه بنویس.`;
      const raw = await session.prompt(prompt);
      // طبق توصیه رسمی: هرگز innerHTML، همیشه textContent
      return String(raw || '').trim();
    } catch(err){
      console.warn('[AI] whyThisBook failed:', err);
      return null;
    }
  };

  // ============ ۲) خلاصه‌سازی یادداشت‌ها/نقل‌قول‌ها ============
  A.aiSummarizeText = async function(text, kind='quote'){
    if (!isAvailable() || !text) return null;
    try {
      const session = await ensureSession();
      const label = kind === 'quote' ? 'نقل‌قول‌های' : 'یادداشت‌های';
      const prompt = `این ${label} من از یک کتاب است. در ۲ تا ۳ جمله، هسته اصلی و پیام مشترک را به فارسی خلاصه کن. بدون مقدمه، مستقیم جواب بده:\n\n${text.slice(0, 4000)}`;
      const raw = await session.prompt(prompt);
      return String(raw || '').trim();
    } catch(err){
      console.warn('[AI] summarize failed:', err);
      return null;
    }
  };

  // ============ ۳) پیشنهاد برچسب برای نقل‌قول ============
  A.aiSuggestTags = async function(text){
    if (!isAvailable() || !text) return null;
    try {
      const session = await ensureSession();
      const prompt = `این نقل‌قول را بخوان و حداکثر ۳ برچسب کوتاه فارسی (یک یا دو کلمه‌ای، بدون #) برایش پیشنهاد بده. فقط با کاما جدا کن و هیچ توضیح اضافه‌ای نده:\n\n"${text.slice(0, 1500)}"`;
      const raw = await session.prompt(prompt);
      if (!raw) return null;
      return String(raw).split(/[,،\n]/).map(s => s.trim().replace(/^#/, '')).filter(Boolean).slice(0,3);
    } catch(err){
      console.warn('[AI] suggestTags failed:', err);
      return null;
    }
  };

  // ============ ۴) بازنویسی روان‌تر یادداشت ============
  A.aiPolish = async function(text){
    if (!isAvailable() || !text) return null;
    try {
      const session = await ensureSession();
      const prompt = `این متن یادداشت من است. آن را روان‌تر و خواناتر بازنویسی کن، اما معنی را تغییر نده. فقط متن بازنویسی‌شده را برگردان:\n\n"${text.slice(0, 2000)}"`;
      const raw = await session.prompt(prompt);
      return String(raw || '').trim();
    } catch(err){
      console.warn('[AI] polish failed:', err);
      return null;
    }
  };

  A.aiDestroy = function(){
    if (state.session){
      try { state.session.destroy(); } catch(e){}
      state.session = null;
      state.ready = false;
    }
  };

  A.bindAI = function(){
    // پاک‌سازی سشن هنگام بستن صفحه
    window.addEventListener('beforeunload', A.aiDestroy);

    // دکمه «چرا این کتاب؟» در پنل پیشنهاد هوشمند
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-ai-why]');
      if (!btn) return;
      const bookId = btn.dataset.aiWhy;
      const book = A.state.books.find(b => b.id === bookId);
      if (!book) return;

      const host = document.getElementById('aiWhyOut');
      if (!host) return;
      host.textContent = '⏳ در حال فکر کردن…';
      host.classList.add('show','busy');

      // اگر مدل نیاز به دانلود دارد، به کاربر خبر بده
      const avail = await checkAvailability();
      if (avail === 'downloadable' || avail === 'downloading'){
        host.textContent = '📥 بار اول مدل AI دانلود می‌شود (چند صد مگابایت)…';
      }

      const out = await A.aiWhyThisBook(book);
      host.classList.remove('busy');
      host.textContent = out || '🤖 نتوانستم جواب بگیرم. مرورگر/حافظه را بررسی کن.';
    });

    // دکمه خلاصه‌سازی نقل‌قول‌های یک کتاب (در صفحه کتاب)
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-ai-summarize-book]');
      if (!btn) return;
      const bookId = btn.dataset.aiSummarizeBook;
      const quotes = (A.state.quotes||[]).filter(q => q.bookId === bookId);
      if (!quotes.length){ A.toast('نقل‌قولی برای خلاصه‌سازی نیست.'); return; }

      const host = btn.parentElement.querySelector('.bp-ai-out');
      if (!host) return;
      host.textContent = '⏳ در حال خلاصه‌سازی…';
      host.classList.add('show');
      const out = await A.aiSummarizeText(quotes.map(q=>q.text).join('\n\n'), 'quote');
      host.textContent = out || '🤖 خلاصه‌سازی ممکن نشد.';
    });

    // پیشنهاد برچسب در فرم نقل‌قول
    const tagBtn = document.getElementById('aiSuggestTags');
    if (tagBtn){
      tagBtn.addEventListener('click', async () => {
        const text = document.getElementById('quoteText').value.trim();
        if (!text){ A.toast('اول متن نقل‌قول را بنویس.'); return; }
        tagBtn.textContent = '⏳';
        tagBtn.disabled = true;
        const tags = await A.aiSuggestTags(text);
        tagBtn.textContent = '🤖';
        tagBtn.disabled = false;
        if (tags && tags.length){
          const input = document.getElementById('quoteTags');
          const existing = input.value.split(/[,،]/).map(s=>s.trim()).filter(Boolean);
          const merged = [...new Set([...existing, ...tags])].slice(0,10);
          input.value = merged.join('، ');
          A.toast('برچسب‌ها پیشنهاد شد.');
        } else {
          A.toast('پیشنهادی نگرفتم.');
        }
      });
    }
  };
})(window.App);