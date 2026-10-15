(function(A){
  'use strict';
  const S = A.state;

  // نقشه هدف → موضوعات مرتبط
  const GOAL_SUBJECTS = {
    calm:   ['رمان','خاطرات','زن'],
    focus:  ['دینی','مبانی'],
    drive:  ['توسعه فردی','دینی','دفاع مقدس'],
    learn:  ['تاریخی','علمی','غرب','مبانی']
  };
  const TIME_OPTIONS = [10, 30, 60, 120];
  // تقریب: ۲ دقیقه برای هر صفحه
  const PAGES_PER_MIN = 0.5;

  // state داخلی
  let timeChoice = 30;
  let goalChoice = 'drive';

  function score(b, timeMin, goal){
    let s = 0;

    // وضعیت
    if (b.status === 'درحال خواندن')  s += 6;
    else if (b.status === 'نیمه کاره') s += 4;
    else if (b.status === 'صف مطالعه') s += 3;
    else if (b.status === 'خوانده نشده') s += 1;
    else return -1; // خوانده شده دیگر پیشنهاد نمی‌شود

    // تطابق هدف
    const goalSubs = GOAL_SUBJECTS[goal] || [];
    if (goalSubs.includes(b.subject)) s += 5;

    // تطابق زمان — صفحات باقی‌مانده در محدوده
    const remaining = Math.max(0, (+b.pages||0) - (+b.pagesdone||0));
    const capacity = timeMin / PAGES_PER_MIN;
    if (remaining > 0 && remaining <= capacity) s += 4;    // کاملاً جا می‌شود
    else if (remaining > 0 && remaining <= capacity * 2) s += 2;
    else if (remaining === 0) s -= 1;

    // علاقه
    if (b.favorite) s += 2;

    // امتیاز بالای کتاب
    s += (A.SCORE_VALUE[b.score] || 0) * 0.4;

    return s;
  }

  function candidates(timeMin, goal){
    return S.books
      .filter(b => b.status !== 'خوانده شده')
      .map(b => ({ b, s: score(b, timeMin, goal) }))
      .filter(x => x.s >= 0)
      .sort((a,c) => c.s - a.s);
  }

  function reasonFor(b, timeMin, goal){
    const parts = [];
    if (b.status === 'درحال خواندن') parts.push('همین حالا در دست داری');
    else if (b.status === 'نیمه کاره') parts.push('نیمه‌کاره مانده');
    const goalSubs = GOAL_SUBJECTS[goal] || [];
    if (goalSubs.includes(b.subject)) parts.push(`مناسب هدف این نشست`);
    const remaining = Math.max(0, (+b.pages||0) - (+b.pagesdone||0));
    const capacity = timeMin / PAGES_PER_MIN;
    if (remaining > 0 && remaining <= capacity) parts.push(`در ${A.fmt(timeMin)} دقیقه تمام می‌شود`);
    if (!parts.length) parts.push('از گزینه‌های موجود در کتابخانه‌ات');
    return parts.join(' · ');
  }

  A.renderSmartRecommend = function(){
    const el = A.$('reco'); if (!el) return;
    if (!S.books.length){
      el.innerHTML = '<div class="cover">—</div><div><b>هنوز کتابی نیست</b><p class="muted">اولین کتابت را اضافه کن.</p></div>';
      return;
    }

    const list = candidates(timeChoice, goalChoice);
    const top = list[0];
    const others = list.slice(1, 4);

    const chips = (arr, active, attr) =>
      arr.map(v => `<button type="button" class="r-chip ${v===active?'on':''}" data-${attr}="${v}">${typeof v === 'number' ? A.fmt(v) : ({calm:'آرامش',focus:'تمرکز',drive:'انگیزه',learn:'دانش'}[v] || v)}</button>`).join('');

    el.innerHTML = `
      <div class="reco-controls">
        <div class="reco-row"><span class="muted">چقدر وقت داری؟</span>${chips(TIME_OPTIONS, timeChoice, 'rtime')}</div>
        <div class="reco-row"><span class="muted">دنبال چه هستی؟</span>${chips(['calm','focus','drive','learn'], goalChoice, 'rgoal')}</div>
      </div>
      ${top ? `
        <div class="reco-main">
          <div class="cover reco-cover">${A.esc(top.b.title.split(/\s+/).slice(0,3).join(' '))}</div>
          <div style="flex:1;min-width:0">
            <div class="reco-title">${A.esc(top.b.title)}</div>
            <div class="muted" style="font-size:11.5px;margin-bottom:6px">${A.esc(top.b.author || 'نویسنده نامشخص')}</div>
            <div class="reco-reason">${A.esc(reasonFor(top.b, timeChoice, goalChoice))}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
              <button class="btn primary sm" data-reco-start="${A.esc(top.b.id)}" type="button">📖 شروع کنیم</button>
              <button class="btn sm" data-ai-why="${A.esc(top.b.id)}" type="button">🤖 چرا این کتاب؟</button>
            </div>
            <div class="ai-why-out" id="aiWhyOut"></div>
          </div>
        </div>
        ${others.length ? `
          <div class="reco-others">
            <div class="muted" style="font-size:11px;margin:10px 0 6px">گزینه‌های بعدی</div>
            ${others.map(x => `<div class="reco-alt" data-reco-start="${A.esc(x.b.id)}">
              <b>${A.esc(x.b.title)}</b>
              <span class="muted">${A.esc(x.b.subject || '')}</span>
            </div>`).join('')}
          </div>` : ''}
      ` : `
        <div class="empty" style="padding:20px;font-size:12px">کتاب مناسبی پیدا نشد — همه را خوانده‌ای یا در وضعیت پیشنهادی نیستند.</div>
      `}
    `;
  };

  A.bindRecommend = function(){
    const el = A.$('reco');
    if (!el) return;

    el.addEventListener('click', e => {
      const tc = e.target.closest('[data-rtime]');
      if (tc){ timeChoice = +tc.dataset.rtime; A.renderSmartRecommend(); return; }
      const gc = e.target.closest('[data-rgoal]');
      if (gc){ goalChoice = gc.dataset.rgoal; A.renderSmartRecommend(); return; }

      const st = e.target.closest('[data-reco-start]');
      if (st){ A.openBookPage(st.dataset.recoStart); return; }
    });
  };
})(window.App);