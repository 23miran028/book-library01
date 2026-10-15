(function(A){
  'use strict';
  const S = A.state;
  let timerRunning = false, timerStartAt = 0, timerAccumMs = 0, timerInterval = null;

  function elapsed(){ return timerAccumMs + (timerRunning ? Date.now() - timerStartAt : 0); }
  function fmtTime(ms){
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec/3600);
    const m = Math.floor((totalSec%3600)/60);
    const s = totalSec%60;
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  function tick(){ A.$('timerDisplay').textContent = fmtTime(elapsed()); }

  A.renderTimerBookOptions = function(){
    const el = A.$('timerBook'); if (!el) return;
    const old = el.value;
    const active = S.books.filter(b => b.status === 'درحال خواندن');
    const pool = active.length ? active : S.books;
    el.innerHTML = pool.length
      ? pool.map(b => `<option value="${A.esc(b.id)}">${A.esc(b.title)}</option>`).join('')
      : '<option value="">ابتدا یک کتاب اضافه کن</option>';
    if ([...el.options].some(o => o.value === old)) el.value = old;
  };

  function start(){
    if (timerRunning) return;
    if (!A.$('timerBook').value){ A.toast('ابتدا کتاب این جلسه را انتخاب کن.'); return; }
    timerRunning = true;
    timerStartAt = Date.now();
    A.$('timerToggle').textContent = '⏸ توقف';
    A.$('timerToggle').classList.remove('primary');
    A.$('timerDisplay').classList.add('running');
    timerInterval = setInterval(tick, 500);
  }
  function stopAndLog(){
    if (!timerRunning) return;
    timerAccumMs += Date.now() - timerStartAt;
    timerRunning = false;
    clearInterval(timerInterval); timerInterval = null;
    A.$('timerToggle').textContent = '▶ شروع';
    A.$('timerToggle').classList.add('primary');
    A.$('timerDisplay').classList.remove('running');
    tick();

    const minutes = Math.round(timerAccumMs / 60000);
    if (minutes >= 1){
      const book = S.books.find(b => b.id === A.$('timerBook').value);
      if (book){
        S.sessions.push({
          id: Date.now().toString(36)+Math.random().toString(36).slice(2,6),
          bookId: book.id, bookTitle: book.title,
          date: A.localDateKey(), minutes, pages: 0, fromPage: 0,
          notes: '(ثبت با تایمر)', createdAt: Date.now()
        });
        A.saveSessions();
        A.toast(`جلسه ${A.fmt(minutes)} دقیقه‌ای برای «${book.title}» ثبت شد.`);
        A.renderReadingTools();
      } else {
        A.toast('کتابی برای این جلسه انتخاب نشده بود.');
      }
    }
    timerAccumMs = 0;
    tick();
  }
  function reset(){
    if (timerRunning){ clearInterval(timerInterval); timerInterval = null; timerRunning = false; }
    timerAccumMs = 0; timerStartAt = 0;
    A.$('timerToggle').textContent = '▶ شروع';
    A.$('timerToggle').classList.add('primary');
    A.$('timerDisplay').classList.remove('running');
    tick();
  }

  A.bindTimer = function(){
    A.$('timerToggle').addEventListener('click', () => timerRunning ? stopAndLog() : start());
    A.$('timerReset').addEventListener('click', reset);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && timerRunning) tick(); });
    tick();
  };
})(window.App);