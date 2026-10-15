(function(A){
  'use strict';
  const S = A.state;

  const SUBJECT_HUE = {
    'دینی':200,'تاریخی':30,'خاطرات':340,'دفاع مقدس':10,
    'توسعه فردی':150,'رمان':280,'زن':320,'علمی':180,
    'غرب':260,'مبانی':220,'ازدواج':300,'سایر':210
  };
  function hueFor(subject){
    if (SUBJECT_HUE[subject] != null) return SUBJECT_HUE[subject];
    let h = 0;
    for (let i=0;i<(subject||'').length;i++) h = (h*31 + subject.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  A.renderDashboardHero = function(){
    const el = A.$('dashHero');
    if (!el) return;

    const current = S.books.find(b => b.status === 'درحال خواندن')
                 || S.books.find(b => b.status === 'نیمه کاره')
                 || S.books.find(b => b.status === 'صف مطالعه');

    const today = A.localDateKey();
    const todayMinutes = S.sessions.filter(s => s.date === today)
      .reduce((a,s) => a + (+s.minutes||0), 0);
    const goalPct = S.dailyGoal ? Math.min(100, todayMinutes/S.dailyGoal*100) : 0;
    const st = A.streakInfo();
    const subject = current?.subject || 'سایر';
    const hue = hueFor(subject);

    el.style.setProperty('--ambient-hue', hue);
    el.style.setProperty('--ambient-intensity', current ? '1' : '0.35');

    if (!current){
      el.innerHTML = `
        <div class="ambient-hero empty-hero">
          <div class="ambient-glow"></div>
          <div class="hero-content">
            <div class="hero-label">کتابخانه‌ات آماده است</div>
            <h2 class="hero-title">اولین کتابت را اضافه کن</h2>
            <div class="hero-actions">
              <button class="btn primary" id="heroAdd" type="button">＋ افزودن کتاب</button>
              <button class="btn" id="heroImport" type="button">↑ بازیابی پشتیبان</button>
            </div>
          </div>
        </div>`;
      A.$('heroAdd')?.addEventListener('click', () => A.openModal());
      A.$('heroImport')?.addEventListener('click', () => A.$('file').click());
      return;
    }

    const pct = A.prog(current);
    const cover = A.coverGradient(current.title);
    const initial = (current.title||'?').trim().charAt(0);
    const coverUrl = A.coverStore ? A.coverStore.get(current.id) : null;

    const coverInner = coverUrl
      ? `<img class="ambient-cover-img" src="${coverUrl}" alt="${A.esc(current.title)}" loading="lazy">`
      : `<span class="ambient-cover-letter">${A.esc(initial)}</span>`;

    const coverStyle = coverUrl
      ? `background:${cover};background-size:cover;background-position:center`
      : `background:${cover}`;

    el.innerHTML = `
      <div class="ambient-hero">
        <div class="ambient-glow"></div>
        <div class="ambient-cover ${coverUrl ? 'has-photo' : ''}" style="${coverStyle}" aria-hidden="true">
          <div class="ambient-cover-shine"></div>
          ${coverInner}
        </div>
        <div class="hero-content">
          <div class="hero-label">در حال خواندن · ${A.esc(current.subject || 'کتاب')}</div>
          <h2 class="hero-title">${A.esc(current.title)}</h2>
          <div class="hero-author">${A.esc(current.author || 'نویسنده نامشخص')}</div>
          <div class="hero-progress">
            <div class="hero-progress-bar"><i style="width:${pct}%"></i></div>
            <div class="hero-progress-txt">${A.fmt(current.pagesdone)} / ${A.fmt(current.pages)} صفحه · ${A.percent(pct)}</div>
          </div>
          <div class="hero-actions">
            <button class="btn primary" data-hero="continue" type="button">📖 ادامه مطالعه</button>
            <button class="btn" data-hero="timer" type="button">⏱ تایمر</button>
            <button class="btn" data-hero="quote" type="button">❝ نقل‌قول</button>
          </div>
        </div>
        <div class="hero-today">
          <div class="today-minutes">
            <div class="today-num">${A.fmt(todayMinutes)}</div>
            <div class="today-lbl">دقیقه امروز</div>
          </div>
          <div class="today-ring">
            <svg viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none"/>
              <circle class="fg" cx="22" cy="22" r="18" fill="none"
                stroke-dasharray="${(2*Math.PI*18).toFixed(2)}"
                stroke-dashoffset="${(2*Math.PI*18*(1-goalPct/100)).toFixed(2)}"/>
            </svg>
            <span>${A.fmt(goalPct)}٪</span>
          </div>
          ${st.current ? `<div class="today-streak">🔥 ${A.fmt(st.current)} روز</div>` : ''}
        </div>
      </div>`;

    el.querySelectorAll('[data-hero]').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.hero;
        if (a === 'continue'){ A.openBookPage(current.id); }
        else if (a === 'timer'){
          A.setTab('stats');
          setTimeout(() => {
            A.$('timerBook').value = current.id;
            A.$('timerToggle').scrollIntoView({block:'center',behavior:'smooth'});
            A.$('timerToggle').focus();
          }, 250);
        } else if (a === 'quote'){
          A.setTab('stats');
          setTimeout(() => {
            A.$('quoteBook').value = current.id;
            A.$('quoteText').focus();
            A.$('quoteForm').scrollIntoView({block:'center',behavior:'smooth'});
          }, 250);
        }
      });
    });
  };

  function last7Days(){
    const out = [];
    for (let i = 6; i >= 0; i--){
      const d = new Date(Date.now() - i*86400000);
      out.push(A.localDateKey(d));
    }
    return out;
  }

  A.renderWeeklySparkline = function(){
    const el = A.$('sparkMinutes');
    if (!el) return;
    const days = last7Days();
    const vals = days.map(k => S.sessions.filter(s => s.date === k)
      .reduce((a,s) => a + (+s.minutes||0), 0));
    const total = vals.reduce((a,b)=>a+b,0);
    const max = Math.max(1, ...vals);
    if (A.$('weekTotalKpi')) A.$('weekTotalKpi').textContent = A.fmt(total);

    const W = 100, H = 30;
    const stepX = W / (days.length - 1);
    const pts = vals.map((v,i) => {
      const x = i*stepX;
      const y = H - (v/max)*(H-8) - 4;
      return [x, y];
    });
    const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `0,${H} ${line} ${W},${H}`;
    const todayIdx = days.indexOf(A.localDateKey());

    el.innerHTML = `
      <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#54c8ff" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#54c8ff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="${area}" fill="url(#sparkFill)"/>
        <polyline points="${line}"/>
        ${pts.map((p,i) => `<circle class="spark-dot${i===todayIdx?' today':''}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===todayIdx?2.4:1.5}"/>`).join('')}
      </svg>`;
  };

  let tip = null;
  function getTip(){
    if (!tip){
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      document.body.appendChild(tip);
    }
    return tip;
  }
  function hideTip(){ if (tip) tip.classList.remove('show'); }

  A.bindChartTooltips = function(){
    ['statusChart','scoreChart'].forEach(id => {
      const c = A.$(id);
      if (!c || c.dataset.ttBound) return;
      c.dataset.ttBound = '1';
      c.style.cursor = 'crosshair';
      c.addEventListener('mousemove', e => {
        const rect = c.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const cx = rect.width/2, cy = rect.height/2;
        const dx = x - cx, dy = y - cy;
        const r = Math.sqrt(dx*dx + dy*dy);
        const outer = Math.min(rect.width, rect.height)/2 - 22;
        const inner = outer - 21;
        if (r < inner || r > outer){ hideTip(); return; }

        let angle = Math.atan2(dy, dx) + Math.PI/2;
        if (angle < 0) angle += Math.PI*2;

        const labels = id === 'statusChart' ? A.STATUSES : A.SCORES.filter(s=>s!=='-');
        const vals = id === 'statusChart'
          ? A.STATUSES.map(s => S.books.filter(b => b.status === s).length)
          : A.SCORES.filter(s=>s!=='-').map(s => S.books.filter(b => b.score === s).length);
        const total = vals.reduce((a,b)=>a+b,0);
        if (!total){ hideTip(); return; }

        let acc = 0;
        for (let i = 0; i < vals.length; i++){
          const share = vals[i]/total * Math.PI*2;
          if (angle >= acc && angle < acc + share){
            if (!vals[i]){ hideTip(); return; }
            const pct = (vals[i]/total*100).toFixed(1);
            const t = getTip();
            t.textContent = `${labels[i]} — ${A.fmt(vals[i])} (${pct}٪)`;
            t.style.left = (e.clientX + 14) + 'px';
            t.style.top  = (e.clientY - 34) + 'px';
            t.classList.add('show');
            return;
          }
          acc += share;
        }
        hideTip();
      });
      c.addEventListener('mouseleave', hideTip);
    });
  };

  A.bindAmbient = function(){
    A.renderDashboardHero();
    A.renderWeeklySparkline();
    A.bindChartTooltips();
  };
})(window.App);