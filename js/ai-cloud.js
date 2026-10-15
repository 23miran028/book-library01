(function(A){
  'use strict';

  const MODEL = 'qwen/qwen3.6-plus:free'; // یا meta-llama/llama-3.3-70b-instruct:free // یک مدل رایگان مناسب
  const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

  function getKey(){
    return (A.state.prefs && A.state.prefs.aiApiKey) || '';
  }
  A.aiCloudReady = function(){ return !!getKey(); };

  async function callGroq(messages, maxTokens = 400){
    const key = getKey();
    if (!key) throw new Error('no-key');
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'HTTP-Referer': location.origin || 'http://localhost:8000',
        'X-Title': 'Persian Book Library'
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.6,
        max_tokens: maxTokens
      })
    });
    if (!res.ok){
      const errText = await res.text();
      throw new Error('groq-' + res.status + ': ' + errText.slice(0, 200));
    }
    const data = await res.json();
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
  }

  // ============ توابع هم‌نام با ai-local برای override ============

  A.aiWhyThisBook = async function(book){
    if (!book) return null;
    const status = book.status || '';
    const reason = book.reason ? `دلیل ثبت‌شده: ${book.reason}.` : '';
    const score = book.score && book.score !== '-' ? `امتیاز من: ${book.score}.` : '';
    const messages = [
      { role: 'system', content: 'تو یک دستیار فارسی‌زبان برای یک برنامه مدیریت کتابخانه شخصی هستی. همیشه فارسی روان، گرم و کوتاه جواب بده. بدون مقدمه.' },
      { role: 'user', content: `کاربر در حال انتخاب کتاب است. این کتاب را در ۲ تا ۳ جمله پیشنهاد بده و بگو چرا:\nعنوان: «${book.title}»\nنویسنده: ${book.author||'نامشخص'}\nموضوع: ${book.subject||'سایر'}\nوضعیت: ${status}\n${reason}\n${score}` }
    ];
    try { return await callGroq(messages, 220); }
    catch(err){ console.warn('[AI Cloud] whyThisBook:', err); return null; }
  };

  A.aiSummarizeText = async function(text, kind='quote'){
    if (!text) return null;
    const label = kind === 'quote' ? 'نقل‌قول‌ها' : 'یادداشت‌ها';
    const messages = [
      { role: 'system', content: 'تو یک دستیار فارسی‌زبان هستی. همیشه فارسی روان و کوتاه جواب بده.' },
      { role: 'user', content: `این ${label} من از یک کتاب است. در ۲ تا ۳ جمله، هسته اصلی و پیام مشترک را خلاصه کن. بدون مقدمه:\n\n${text.slice(0, 6000)}` }
    ];
    try { return await callGroq(messages, 300); }
    catch(err){ console.warn('[AI Cloud] summarize:', err); return null; }
  };

  A.aiSuggestTags = async function(text){
    if (!text) return null;
    const messages = [
      { role: 'system', content: 'فقط برچسب‌ها را برگردان، بدون توضیح.' },
      { role: 'user', content: `حداکثر ۳ برچسب کوتاه فارسی (۱ یا ۲ کلمه‌ای، بدون #) برای این نقل‌قول پیشنهاد بده. با کاما جدا کن:\n\n"${text.slice(0, 2000)}"` }
    ];
    try {
      const raw = await callGroq(messages, 80);
      if (!raw) return null;
      return raw.split(/[,،\n]/).map(s => s.trim().replace(/^#/, '').replace(/[.。]$/, '')).filter(Boolean).slice(0,3);
    } catch(err){ console.warn('[AI Cloud] tags:', err); return null; }
  };

  A.aiPolish = async function(text){
    if (!text) return null;
    const messages = [
      { role: 'system', content: 'فقط متن بازنویسی‌شده را برگردان، بدون توضیح.' },
      { role: 'user', content: `این یادداشت را روان‌تر و خواناتر بازنویسی کن، معنی را تغییر نده:\n\n"${text.slice(0, 3000)}"` }
    ];
    try { return await callGroq(messages, 500); }
    catch(err){ console.warn('[AI Cloud] polish:', err); return null; }
  };

  // ============ پیشنهاد کتاب مشابه ============
  A.aiSimilarBooks = async function(book){
    if (!book) return null;
    if (!A.aiCloudReady()) return null;

    const others = A.state.books.filter(b => b.id !== book.id);
    if (!others.length) return [];

    const quotes = (A.state.quotes||[]).filter(q => q.bookId === book.id).slice(0,5);
    const summary = [
      `عنوان: ${book.title}`,
      book.author ? `نویسنده: ${book.author}` : '',
      book.subject ? `موضوع: ${book.subject}` : '',
      book.reason ? `دلیل مطالعه‌ام: ${book.reason}` : '',
      book.notes ? `یادداشت من: ${book.notes.slice(0, 400)}` : '',
      quotes.length ? `نقل‌قول‌های من: ${quotes.map(q=>q.text.slice(0,150)).join(' | ')}` : ''
    ].filter(Boolean).join('\n');

    const catalog = others.map(b => ({
      id: b.id,
      t: b.title,
      a: b.author || '',
      s: b.subject || '',
      st: b.status || ''
    }));
    const catalogText = catalog.map(c => `[${c.id}] «${c.t}» — ${c.a} — ${c.s} — ${c.st}`).join('\n');

    const sys = `تو یک مشاور کتاب فارسی‌زبان هستی. کاربر یک کتاب را خوانده و می‌خواهد از میان کتابخانه شخصی‌اش، کتاب‌های مشابه یا مکمل پیدا کند.

کتاب مرجع کاربر:
${summary}

فهرست کتاب‌های دیگر او:
${catalogText}

قواعد:
- حداکثر ۳ کتاب از فهرست بالا پیشنهاد بده
- هر پیشنهاد باید id دقیقاً از داخل براکت‌ها باشد
- دلیل هر پیشنهاد کوتاه، در یک جمله، به فارسی باشد
- اگر واقعاً کتاب مرتبطی نیست، فقط یک پیشنهاد با بهترین گزینه بده
- خروجی را دقیقاً به این قالب JSON بده، بدون هیچ متن اضافه:

[{"id":"شناسه","reason":"دلیل کوتاه"}]`;

    const messages = [
      { role: 'system', content: sys },
      { role: 'user', content: 'پیشنهاد بده.' }
    ];

    try {
      const raw = await callGroq(messages, 500);
      if (!raw) return [];
      const cleaned = String(raw).replace(/```json/g,'').replace(/```/g,'').trim();
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start === -1 || end === -1) return [];
      const parsed = JSON.parse(cleaned.slice(start, end+1));
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(x => {
          const target = A.state.books.find(b => String(b.id) === String(x.id));
          return target ? { book: target, reason: String(x.reason || '').slice(0,200) } : null;
        })
        .filter(Boolean)
        .slice(0,3);
    } catch(err){
      console.warn('[AI Cloud] similarBooks:', err);
      return null;
    }
  };


  // ============ برچسب‌گذاری خودکار همه نقل‌قول‌ها ============
  A.aiAutoTagAll = async function(onProgress){
    const S = A.state;
    const targets = (S.quotes || []).filter(q => !q.tags || !q.tags.length);
    if (!targets.length) return { done: 0, total: 0, skipped: true };
    if (!A.aiCloudReady()) return { done: 0, total: targets.length, error: 'no-key' };

    let done = 0, failed = 0;
    for (let i = 0; i < targets.length; i++){
      const q = targets[i];
      try {
        const tags = await A.aiSuggestTags(q.text);
        if (tags && tags.length){
          q.tags = tags.slice(0, 5);
          done++;
          A.saveQuotes({ render: false });
        } else failed++;
      } catch(e){ failed++; }
      if (onProgress) onProgress({ current: i+1, total: targets.length, done, failed });
      // تاخیر برای رعایت rate limit
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 700));
    }
    A.saveQuotes();
    return { done, total: targets.length, failed };
  };

  // ============ پیشنهاد کتاب بعدی بر اساس تاریخچه ============
  A.aiNextBook = async function(){
    const S = A.state;
    if (!A.aiCloudReady()) return null;

    const finished = S.books.filter(b => b.status === 'خوانده شده')
      .sort((a, b) => (b.order || 0) - (a.order || 0))
      .slice(-8);
    const reading = S.books.filter(b => b.status === 'درحال خواندن' || b.status === 'نیمه کاره');
    const candidates = S.books.filter(b =>
      b.status === 'صف مطالعه' || b.status === 'خوانده نشده'
    );
    if (!candidates.length) return [];

    const recentFinished = finished.map(b =>
      `«${b.title}» — ${b.subject||'—'} — امتیاز: ${b.score||'—'}`
    ).join('\n');

    const recentQuotes = (S.quotes || [])
      .slice(-10)
      .map(q => q.text.slice(0, 120))
      .join(' | ');

    const currentBooks = reading.map(b =>
      `«${b.title}» (${A.prog(b)}٪ خوانده‌شده)`
    ).join('، ');

    const catalog = candidates.map(b =>
      `[${b.id}] «${b.title}» — ${b.author||'—'} — ${b.subject||'—'}`
    ).join('\n');

    const sys = `تو یک مشاور کتاب فارسی‌زبان متخصص هستی. کاربر کتابخانه شخصی دارد و می‌خواهد بدانی بعدی چه بخواند.

اطلاعات کاربر:
کتاب‌های تمام‌شده اخیر:
${recentFinished || '—'}

کتاب‌های در حال خواندن: ${currentBooks || '—'}

نمونه نقل‌قول‌های اخیر کاربر: ${recentQuotes || '—'}

کتاب‌های موجود برای پیشنهاد:
${catalog}

قواعد:
- حداکثر ۳ کتاب از فهرست بالا پیشنهاد بده
- id دقیقاً از براکت‌ها باشد
- دلیل کوتاه یک‌جمله‌ای به فارسی
- خروجی فقط JSON معتبر، بدون متن اضافه:

[{"id":"...","reason":"..."}]`;

    try {
      const raw = await callGroq([
        { role: 'system', content: sys },
        { role: 'user', content: 'پیشنهاد بده.' }
      ], 600);
      if (!raw) return [];
      const cleaned = String(raw).replace(/```json/g,'').replace(/```/g,'').trim();
      const s = cleaned.indexOf('[');
      const e = cleaned.lastIndexOf(']');
      if (s === -1 || e === -1) return [];
      const parsed = JSON.parse(cleaned.slice(s, e+1));
      if (!Array.isArray(parsed)) return [];
      return parsed.map(x => {
        const target = S.books.find(b => String(b.id) === String(x.id));
        return target ? { book: target, reason: String(x.reason || '').slice(0,250) } : null;
      }).filter(Boolean).slice(0, 3);
    } catch(err){
      console.warn('[AI Cloud] nextBook:', err);
      return null;
    }
  };

  // ============ چت با کتاب ============
  A.aiChat = async function(book, priorMessages, userQuestion){
    if (!book || !userQuestion) return null;
    if (!A.aiCloudReady()) return null;

    const quotes = (A.state.quotes||[]).filter(q => q.bookId === book.id);
    const sessions = A.state.sessions.filter(s => s.bookId === book.id);
    const totalMin = sessions.reduce((a,s)=>a+(+s.minutes||0),0);
    const totalPages = sessions.reduce((a,s)=>a+(+s.pages||0),0);

    const context = [
      `عنوان: ${book.title}`,
      book.author ? `نویسنده: ${book.author}` : '',
      book.subject ? `موضوع: ${book.subject}` : '',
      book.status ? `وضعیت: ${book.status}` : '',
      book.pages ? `صفحات: ${book.pagesdone}/${book.pages}` : '',
      book.reason ? `دلیل مطالعه‌ام: ${book.reason}` : '',
      book.notes ? `یادداشت من: ${book.notes.slice(0, 700)}` : '',
      quotes.length ? `نقل‌قول‌های من از این کتاب (${quotes.length} مورد):\n${quotes.slice(0,5).map(q=>`- ${q.text.slice(0,180)}`).join('\n')}` : '',
      sessions.length ? `آمار من: ${sessions.length} جلسه، ${totalMin} دقیقه، ${totalPages} صفحه` : ''
    ].filter(Boolean).join('\n');

    const sys = `تو یک دستیار کتاب‌خوان فارسی‌زبان هستی که درباره این کتاب با کاربر گفتگو می‌کنی.

اطلاعات کتاب و کاربر:
${context}

قواعد:
- همیشه فارسی روان، گرم و دوستانه جواب بده
- کوتاه باش (معمولاً ۲ تا ۴ جمله)
- اگر اطلاعات کافی نداری، صادق باش و حدس نزن
- می‌توانی از یادداشت‌ها و نقل‌قول‌های کاربر الهام بگیری
- اگر کاربر سؤال شخصی پرسید، بر اساس آمار و یادداشت‌هایش راهنمایی کن`;

    const msgs = [
      { role: 'system', content: sys },
      ...priorMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userQuestion }
    ];

    try {
      return await callGroq(msgs, 600);
    } catch(err){
      console.warn('[AI Cloud] chat:', err);
      return null;
    }
  };

  // ============ تست اتصال ============
  A.aiTestConnection = async function(){
    const messages = [
      { role: 'system', content: 'پاسخ فقط یک کلمه فارسی باشد.' },
      { role: 'user', content: 'بنویس: سلام' }
    ];
    try {
      const out = await callGroq(messages, 20);
      return { ok: true, reply: out };
    } catch(err){
      return { ok: false, error: String(err.message || err) };
    }
  };

  // fallback به نسخه محلی اگر کلید Groq موجود نیست
  const localWhy = A.aiWhyThisBook;
  const localSum = A.aiSummarizeText;
  const localTag = A.aiSuggestTags;
  const localPol = A.aiPolish;

  A.aiWhyThisBook = async function(book){
    if (A.aiCloudReady() && A.state.prefs.aiEnabled !== false){
      const r = await callGroq([
        { role:'system', content:'تو دستیار فارسی‌زبان کتابخانه شخصی هستی. کوتاه و گرم جواب بده.' },
        { role:'user', content:`این کتاب را در ۲-۳ جمله پیشنهاد بده و بگو چرا:\n«${book.title}» — ${book.author||'نامشخص'} — ${book.subject||'سایر'} — وضعیت: ${book.status||''}` }
      ], 220);
      if (r) return r;
    }
    return localWhy ? localWhy(book) : null;
  };

  A.aiSummarizeText = async function(text, kind='quote'){
    if (A.aiCloudReady() && A.state.prefs.aiEnabled !== false){
      const r = await callGroq([
        { role:'system', content:'فارسی روان و کوتاه جواب بده.' },
        { role:'user', content:`در ۲-۳ جمله هسته اصلی این متن را خلاصه کن:\n\n${text.slice(0,6000)}` }
      ], 300);
      if (r) return r;
    }
    return localSum ? localSum(text, kind) : null;
  };

  A.aiSuggestTags = async function(text){
    if (A.aiCloudReady() && A.state.prefs.aiEnabled !== false){
      const raw = await callGroq([
        { role:'system', content:'فقط برچسب‌ها را برگردان.' },
        { role:'user', content:`حداکثر ۳ برچسب فارسی کوتاه برای این متن بده، با کاما جدا کن:\n"${text.slice(0,2000)}"` }
      ], 80);
      if (raw) return raw.split(/[,،\n]/).map(s=>s.trim().replace(/^#/,'')).filter(Boolean).slice(0,3);
    }
    return localTag ? localTag(text) : null;
  };

  A.aiPolish = async function(text){
    if (A.aiCloudReady() && A.state.prefs.aiEnabled !== false){
      const r = await callGroq([
        { role:'system', content:'فقط متن بازنویسی‌شده را برگردان.' },
        { role:'user', content:`این را روان‌تر بنویس:\n"${text.slice(0,3000)}"` }
      ], 500);
      if (r) return r;
    }
    return localPol ? localPol(text) : null;
  };

  // ============ اتصال UI ============
  A.bindAICloud = function(){
    const keyInput = document.getElementById('aiApiKey');
    const testBtn  = document.getElementById('aiTestBtn');
    const statusEl = document.getElementById('aiStatus');
    const toggle   = document.getElementById('aiEnabled');

    if (keyInput){
      keyInput.value = A.state.prefs.aiApiKey || '';
      const saveKey = () => {
        A.state.prefs.aiApiKey = keyInput.value.trim();
        A.savePrefs();
        updateStatus();
      };
      keyInput.addEventListener('input', saveKey);
      keyInput.addEventListener('change', saveKey);
      keyInput.addEventListener('paste', () => setTimeout(saveKey, 10));
    }
    if (toggle){
      toggle.checked = A.state.prefs.aiEnabled !== false;
      toggle.addEventListener('change', () => {
        A.state.prefs.aiEnabled = toggle.checked;
        A.savePrefs();
      });
    }
    if (testBtn){
      testBtn.addEventListener('click', async () => {
        // مستقیم از input بخوان (نه از state) تا مطمئن باشیم مقدار جدید است
        if (keyInput){
          A.state.prefs.aiApiKey = keyInput.value.trim();
          A.savePrefs();
        }
        if (!A.aiCloudReady()){ setStatus('ابتدا API Key را وارد کن.', 'warn'); return; }
        setStatus('⏳ در حال تست…', 'busy');
        const r = await A.aiTestConnection();
        if (r.ok) setStatus('✅ اتصال برقرار است. پاسخ مدل: ' + r.reply, 'ok');
        else setStatus('❌ خطا: ' + r.error, 'err');
      });
    }
    function setStatus(msg, kind){
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.dataset.kind = kind || '';
    }
    function updateStatus(){
      if (!statusEl) return;
      if (A.aiCloudReady()) setStatus('🔑 کلید ثبت شده — آماده استفاده', 'ok');
      else setStatus('⚠️ کلید وارد نشده', 'warn');
    }
    updateStatus();
  };
})(window.App);