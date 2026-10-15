(function(A){
  'use strict';

  A.$ = x => document.getElementById(x);
  A.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  A.toEn = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  A.num = (v, def=0) => { const n = Number(A.toEn(v).replace(/[^\d.\-]/g,'')); return isFinite(n) ? n : def; };
  A.norm = s => String(s ?? '').toLowerCase()
    .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/ة/g,'ه')
    .replace(/[\u200c\u200e\u200f]/g,' ')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/\s+/g,' ').trim();

  const NF0 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });
  const NF1 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
  A.fmt  = n => NF0.format(Math.round(+n || 0));
  A.fmt1 = n => NF1.format(+n || 0);
  A.percent = n => A.fmt(n) + '٪';
  A.money = n => A.fmt(n) + ' تومان';

  A.prog = b => (+b.pages > 0) ? Math.min(100, Math.round((+b.pagesdone || 0) / +b.pages * 100)) : 0;

  A.pill = (text, color) =>
    `<span class="pill" style="background:${color}22;color:${color};border-color:${color}55">${A.esc(text)}</span>`;
  A.statusPill = s => A.pill(s || 'خوانده نشده', A.STATUS_COLORS[s] || '#268fe5');
  A.scorePill  = s => (!s || s === '-') ? '<span class="muted">—</span>' : A.pill(s, A.SCORE_COLORS[s] || '#546e8a');

  A.populate = function(id, arr, blank=false, current=null, blankLabel='همه'){
    const el = A.$(id);
    const all = (blank ? [''] : []).concat(arr);
    if (current && !all.includes(current)) all.push(current);
    el.innerHTML = all.map(s => s === '' ? `<option value="">${A.esc(blankLabel)}</option>` : `<option>${A.esc(s)}</option>`).join('');
  };
  A.setSelect = function(id, value){
    if (value == null) return;
    const el = A.$(id);
    if (![...el.options].some(o => o.value === value || o.textContent === value)){
      const o = document.createElement('option');
      o.value = value; o.textContent = value;
      el.appendChild(o);
    }
    el.value = value;
  };

  let toastTimer;
  A.toast = function(msg, actionLabel, action){
    const t = A.$('toast');
    t.innerHTML = `<span>${A.esc(msg)}</span>`;
    if (actionLabel && action){
      const b = document.createElement('button');
      b.className = 'toast-action'; b.type = 'button'; b.textContent = actionLabel;
      b.onclick = () => { action(); t.classList.remove('show'); };
      t.appendChild(b);
    }
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 6000);
  };

  A.localDateKey = (d=new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  A.downloadText = function(filename, content, type='text/csv;charset=utf-8;'){
    const blob = new Blob(['\ufeff', content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  A.csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
})(window.App);