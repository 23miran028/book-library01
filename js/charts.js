(function(A){
  'use strict';

  function legend(id, labels, vals, colors){
    A.$(id).innerHTML = labels.map((s,i) =>
      `<span><i class="dot" style="background:${colors[i%colors.length]}"></i>${A.esc(s)} (${A.fmt(vals[i])})</span>`
    ).join('');
  }
  function chartColor(name, fallback){
    return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
  }

  function donut(canvasId, legendId, labels, vals, colors){
    const c = A.$(canvasId);
    if (!c) return;
    const ctx = c.getContext('2d');
    const d = window.devicePixelRatio || 1;
    const w = c.clientWidth || 250, h = c.clientHeight || 185;

    // محافظ: اگر canvas هنوز اندازه نگرفته، رندر را به تعویق بینداز
    if (w < 60 || h < 60){
      setTimeout(() => donut(canvasId, legendId, labels, vals, colors), 100);
      return;
    }

    c.width = w*d; c.height = h*d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const total = vals.reduce((a,b) => a+b, 0);
    const x = w/2, y = h/2;
    const r = Math.max(20, Math.min(w,h)/2 - 22);
    const inner = Math.max(8, r - 21);
    if (total > 0){
      let a = -Math.PI/2;
      vals.forEach((v,i) => {
        if (!v) return;
        const z = a + v/total * Math.PI*2;
        ctx.beginPath();
        ctx.arc(x, y, r, a, z);
        ctx.arc(x, y, inner, z, a, true);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        a = z;
      });
      ctx.fillStyle = chartColor('--chart-text','#edf5ff');
      ctx.font = `700 20px ${A.FONT}`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(A.fmt(total), x, y - 6);
      ctx.fillStyle = chartColor('--chart-muted','#a9c0dd');
      ctx.font = `400 11px ${A.FONT}`;
      ctx.fillText('کتاب', x, y + 14);
    } else {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.arc(x, y, inner, 0, Math.PI*2, true);
      ctx.fillStyle = chartColor('--chart-track','#142c4b'); ctx.fill();
      ctx.fillStyle = chartColor('--chart-muted','#a9c0dd');
      ctx.font = `400 12px ${A.FONT}`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('هنوز داده‌ای نیست', x, y);
    }
    legend(legendId, labels, vals, colors);
  }

  function bars(canvasId, legendId, labels, vals, colors){
    const c = A.$(canvasId);
    if (!c) return;
    const ctx = c.getContext('2d');
    const d = window.devicePixelRatio || 1;
    const w = c.clientWidth || 250, h = c.clientHeight || 185;

    // محافظ: اگر canvas هنوز اندازه نگرفته، رندر را به تعویق بینداز
    if (w < 60 || h < 60){
      setTimeout(() => bars(canvasId, legendId, labels, vals, colors), 100);
      return;
    }

    c.width = w*d; c.height = h*d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!labels.length){
      ctx.fillStyle = chartColor('--chart-muted','#a9c0dd');
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font = `400 12px ${A.FONT}`;
      ctx.fillText('هنوز داده‌ای نیست', w/2, h/2);
      legend(legendId, [], [], colors); return;
    }
    const max = Math.max(1, ...vals);
    const left = Math.min(120, w * .5);
    const bw = w - left - 30;
    const rh = Math.min(30, (h - 8) / labels.length);
    labels.forEach((s,i) => {
      const y = 4 + i*rh;
      ctx.font = `500 10.5px ${A.FONT}`;
      ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillStyle = chartColor('--chart-label','#c7d9ee');
      ctx.fillText(s, left - 6, y + rh/2);
      ctx.fillStyle = chartColor('--chart-track','#183454');
      ctx.fillRect(left, y + 3, bw, rh - 7);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(left, y + 3, bw * vals[i] / max, rh - 7);
      ctx.textAlign='left';
      ctx.fillStyle = chartColor('--chart-text','#edf5ff');
      ctx.fillText(A.fmt(vals[i]), left + bw + 4, y + rh/2);
    });
    legend(legendId, labels, vals, colors);
  }

  function subjectCounts(){
    const map = {};
    A.state.books.forEach(b => { const s = b.subject || 'سایر'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).sort((a,b) => b[1] - a[1]);
  }

  A.drawCharts = function(){
    const books = A.state.books;
    const statusVals = A.STATUSES.map(s => books.filter(b => b.status === s).length);
    donut('statusChart','statusLegend', A.STATUSES, statusVals, A.STATUSES.map(s => A.STATUS_COLORS[s]));
    const subs = subjectCounts();
    bars('subjectChart','subjectLegend', subs.map(e=>e[0]), subs.map(e=>e[1]),
         subs.map((_,i)=>['#268fe5','#10bb80','#f6c747','#9564f5','#f45162','#ff9b38','#54c8ff','#cf66c9','#22d3c5','#e879c8','#9aa7ff','#a3b5c9'][i%12]));
    const scoredTypes = A.SCORES.filter(s => s !== '-');
    const scoreVals = scoredTypes.map(s => books.filter(b => b.score === s).length);
    donut('scoreChart','scoreLegend', scoredTypes, scoreVals, scoredTypes.map(s => A.SCORE_COLORS[s]));
  };
  function radar(canvasId, legendId, labels, values, color){
    const c = A.$(canvasId);
    if (!c) return;
    const ctx = c.getContext('2d');
    const d = window.devicePixelRatio || 1;
    const w = c.clientWidth || 250, h = c.clientHeight || 250;

    // محافظ: اگر canvas هنوز اندازه نگرفته، رندر را به تعویق بینداز
    if (w < 80 || h < 80){
      setTimeout(() => radar(canvasId, legendId, labels, values, color), 100);
      return;
    }

    c.width = w * d; c.height = h * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (!labels.length){
      ctx.fillStyle = chartColor('--chart-muted','#a9c0dd');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `400 12px ${A.FONT}`;
      ctx.fillText('هنوز داده‌ای نیست', w/2, h/2);
      A.$(legendId).innerHTML = '';
      return;
    }

    const cx = w/2, cy = h/2;
    const radius = Math.max(30, Math.min(w, h) / 2 - 42);
    const n = labels.length;
    const max = Math.max(1, ...values);
    const step = (Math.PI * 2) / n;

    // شبکه‌های پشت
    ctx.strokeStyle = chartColor('--chart-track','#183454');
    ctx.lineWidth = 1;
    for (let r = 1; r <= 4; r++){
      ctx.beginPath();
      const rr = (radius * r) / 4;
      for (let i = 0; i < n; i++){
        const a = -Math.PI/2 + i * step;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // خطوط محور
    for (let i = 0; i < n; i++){
      const a = -Math.PI/2 + i * step;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      ctx.stroke();
    }

    // چندضلعی داده
    ctx.beginPath();
    for (let i = 0; i < n; i++){
      const a = -Math.PI/2 + i * step;
      const rr = (values[i] / max) * radius;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color + '55';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // نقاط
    for (let i = 0; i < n; i++){
      const a = -Math.PI/2 + i * step;
      const rr = (values[i] / max) * radius;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = chartColor('--chart-text','#edf5ff');
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // برچسب‌ها
    ctx.fillStyle = chartColor('--chart-label','#c7d9ee');
    ctx.font = `600 10px ${A.FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++){
      const a = -Math.PI/2 + i * step;
      const lx = cx + Math.cos(a) * (radius + 20);
      const ly = cy + Math.sin(a) * (radius + 20);
      ctx.fillText(labels[i], lx, ly);
    }

    legend(legendId, labels, values, labels.map(() => color));
  }

  A.drawRadar = function(){
    if (!A.$('radarChart')) return;
    // شمارش کتاب‌ها بر اساس موضوع
    const map = {};
    A.state.books.forEach(b => {
      const s = b.subject || 'سایر';
      map[s] = (map[s] || 0) + 1;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = sorted.map(x => x[0]);
    const values = sorted.map(x => x[1]);
    radar('radarChart', 'radarLegend', labels, values, chartColor('--teal', '#22d3c5'));
  };
})(window.App);