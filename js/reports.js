(function(A){
  'use strict';
  const S = A.state;

  function rangeFor(kind){
    const now = new Date();
    const today = A.localDateKey(now);
    let from, to = today, label;
    if (kind === 'this-month'){
      from = A.localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
      label = 'این ماه';
    } else if (kind === 'last-month'){
      const y = now.getFullYear(), m = now.getMonth() - 1;
      from = A.localDateKey(new Date(y, m, 1));
      to   = A.localDateKey(new Date(y, m + 1, 0));
      label = 'ماه قبل';
    } else if (kind === 'last-3'){
      from = A.localDateKey(new Date(now.getTime() - 90*86400000));
      label = '۳ ماه اخیر';
    } else if (kind === 'this-year'){
      from = A.localDateKey(new Date(now.getTime() - 365*86400000));
      label = 'سال اخیر';
    } else {
      from = '1970-01-01'; label = 'همه زمان‌ها';
    }
    return { from, to, label };
  }

  function prevRange(r){
    const from = new Date(r.from);
    const to = new Date(r.to);
    const days = Math.max(1, Math.round((to - from) / 86400000));
    const pTo = new Date(from.getTime() - 86400000);
    const pFrom = new Date(pTo.getTime() - (days - 1) * 86400000);
    return { from: A.localDateKey(pFrom), to: A.localDateKey(pTo) };
  }

  function filterSessions(range){
    return S.sessions.filter(s => s.date >= range.from && s.date <= range.to);
  }

  function stats(rows){
    const minutes = rows.reduce((a,s)=>a+(+s.minutes||0),0);
    const pages = rows.reduce((a,s)=>a+(+s.pages||0),0);
    const daySet = new Set(rows.map(s=>s.date));
    return { minutes, pages, count: rows.length, activeDays: daySet.size };
  }

  function sparkline(rows, range){
    // باکت روزانه
    const from = new Date(range.from);
    const to = new Date(range.to);
    const days = Math.max(1, Math.round((to - from) / 86400000) + 1);
    const step = Math.max(1, Math.ceil(days / 40));
    const buckets = {};
    rows.forEach(s => { buckets[s.date] = (buckets[s.date]||0) + (+s.minutes||0); });
    const keys = [];
    for (let d = 0; d < days; d += step){
      const date = new Date(from.getTime() + d*86400000);
      keys.push(A.localDateKey(date));
    }
    const vals = keys.map(k => buckets[k] || 0);
    const max = Math.max(1, ...vals);
    const W = 100, H = 32;
    const stepX = W / Math.max(1, vals.length - 1);
    const pts = vals.map((v,i) => [i*stepX, H - (v/max)*(H-6) - 3]);
    const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `0,${H} ${line} ${W},${H}`;
    return `<svg class="report-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="rSpark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--teal)" stop-opacity=".45"/>
        <stop offset="100%" stop-color="var(--teal)" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#rSpark)"/>
      <polyline points="${line}"/>
      ${pts.filter((_,i)=>i%Math.max(1,Math.floor(vals.length/8))===0).map(p =>
        `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.3"/>`).join('')}
    </svg>`;
  }

  function delta(cur, prev, unit=''){
    if (prev === 0 && cur === 0) return `<span class="muted">—</span>`;
    if (prev === 0) return `<span class="up">▲ جدید</span>`;
    const diff = cur - prev;
    const pct = Math.round(diff / prev * 100);
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';
    return `<span class="${cls}">${arrow} ${A.fmt(Math.abs(pct))}٪</span>`;
  }

  function topBooks(rows){
    const map = {};
    rows.forEach(s => {
      if (!s.bookId) return;
      if (!map[s.bookId]) map[s.bookId] = { id: s.bookId, minutes: 0, pages: 0, count: 0 };
      map[s.bookId].minutes += (+s.minutes||0);
      map[s.bookId].pages   += (+s.pages||0);
      map[s.bookId].count   += 1;
    });
    return Object.values(map).sort((a,b) => b.minutes - a.minutes).slice(0,5);
  }

  A.renderReports = function(){
    const host = A.$('reportsBody');
    if (!host) return;
    const kind = A.$('reportRange').value || 'this-month';
    const r = rangeFor(kind);
    const p = prevRange(r);
    const rows = filterSessions(r);
    const prevRows = filterSessions(p);
    const cs = stats(rows);
    const ps = stats(prevRows);

    const top = topBooks(rows);
    const best = (() => {
      const byDay = {};
      rows.forEach(s => { byDay[s.date] = (byDay[s.date]||0) + (+s.minutes||0); });
      const entries = Object.entries(byDay);
      if (!entries.length) return null;
      return entries.sort((a,b)=>b[1]-a[1])[0];
    })();

    const avgPerDay = cs.activeDays ? Math.round(cs.minutes / cs.activeDays) : 0;

    host.innerHTML = `
      <div class="report-summary">
        <div class="report-stat">
          <span class="muted">دقیقه مطالعه</span>
          <b>${A.fmt(cs.minutes)}</b>
          ${delta(cs.minutes, ps.minutes)}
        </div>
        <div class="report-stat">
          <span class="muted">صفحات خوانده‌شده</span>
          <b>${A.fmt(cs.pages)}</b>
          ${delta(cs.pages, ps.pages)}
        </div>
        <div class="report-stat">
          <span class="muted">تعداد جلسه</span>
          <b>${A.fmt(cs.count)}</b>
          ${delta(cs.count, ps.count)}
        </div>
        <div class="report-stat">
          <span class="muted">روزهای فعال</span>
          <b>${A.fmt(cs.activeDays)}</b>
          ${delta(cs.activeDays, ps.activeDays)}
        </div>
      </div>

      ${rows.length ? `
        <div class="report-spark-wrap">${sparkline(rows, r)}</div>
        <div class="report-meta-row">
          <span>میانگین هر روز فعال: <b>${A.fmt(avgPerDay)}</b> دقیقه</span>
          ${best ? `<span>بهترین روز: <b>${A.esc(best[0])}</b> · ${A.fmt(best[1])} دقیقه</span>` : ''}
        </div>

        ${top.length ? `
          <div class="report-top">
            <h4>پرمطالعه‌ترین کتاب‌های این دوره</h4>
            ${top.map((b,i) => {
              const book = S.books.find(x => x.id === b.id);
              const title = book?.title || 'کتاب حذف‌شده';
              return `<div class="report-top-row">
                <span class="report-rank">${A.fmt(i+1)}</span>
                <div style="flex:1;min-width:0">
                  <div class="report-top-title">${A.esc(title)}</div>
                  <div class="report-top-meta muted">${A.fmt(b.minutes)} دقیقه · ${A.fmt(b.count)} جلسه</div>
                </div>
                <div class="report-bar"><i style="width:${Math.round(b.minutes/top[0].minutes*100)}%"></i></div>
              </div>`;
            }).join('')}
          </div>` : ''}
      ` : `
        <div class="empty" style="padding:28px 16px;font-size:12.5px">در این بازه مطالعه‌ای ثبت نشده است.</div>
      `}
    `;
  };

  A.bindReports = function(){
    const el = A.$('reportRange');
    if (!el) return;
    el.addEventListener('change', A.renderReports);
  };
})(window.App);