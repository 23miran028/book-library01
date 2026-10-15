(function(A){
  'use strict';
  const S = A.state;
  let lastFocused = null;

  A.openModal = function(b){
    const f = A.$('form');
    f.reset();
    A.populate('subject', A.SUBJECTS);
    A.populate('score', A.SCORES);
    A.$('dupWarning').style.display = 'none';
    if (b){
      A.$('id').value = b.id;
      A.$('modaltitle').textContent = 'ویرایش کتاب';
      A.$('delete').style.display = 'block';
      A.$('title').value = b.title || '';
      A.$('author').value = b.author || '';
      A.setSelect('subject', b.subject || 'سایر');
      A.setSelect('status', b.status || 'خوانده نشده');
      A.setSelect('score', b.score || '-');
      A.setSelect('reread', b.reread || '-');
      A.$('access').value = b.access || '';
      A.$('pagesinput').value = b.pages ?? 0;
      A.$('pagesdone').value = b.pagesdone ?? 0;
      A.$('price').value = b.price ?? 0;
      A.$('reason').value = b.reason || '';
      A.$('notes').value = b.notes || '';
      A.$('series').value = b.series || '';
      A.$('seriesOrder').value = b.seriesOrder || 0;
      A._setRelatedIds(b.relatedIds || []);
      const coverUrl = A.coverStore ? A.coverStore.get(b.id) : null;
      if (A._setCoverPreview) A._setCoverPreview(coverUrl || '');
      A._fillSeriesList();
    } else {
      A.$('id').value = '';
      A.$('modaltitle').textContent = 'افزودن کتاب';
      A.$('delete').style.display = 'none';
      A.$('status').value = 'خوانده نشده';
      A.$('score').value = '-';
      A.$('reread').value = '-';
      A.$('pagesinput').value = 0;
      A.$('pagesdone').value = 0;
      A.$('price').value = 0;
      A.$('series').value = '';
      A.$('seriesOrder').value = 0;
      A._setRelatedIds([]);
      if (A._setCoverPreview) A._setCoverPreview('');
      A._fillSeriesList();
    }
    lastFocused = document.activeElement;
    A.$('modalbg').classList.add('open');
    document.body.classList.add('locked');
    setTimeout(() => { A.$('title').focus(); A.$('title').scrollIntoView({block:'center',behavior:'smooth'}); }, 60);
  };
  A.closeModal = function(){
    A.$('modalbg').classList.remove('open');
    document.body.classList.remove('locked');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
  };
  A.trapFocus = function(e){
    if (!A.$('modalbg').classList.contains('open')) return;
    if (e.key === 'Escape'){ e.preventDefault(); A.closeModal(); return; }
    if (e.key !== 'Tab') return;
    const nodes = A.$('form').querySelectorAll('button, [href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])');
    const list = [...nodes].filter(el => el.offsetParent !== null || el === document.activeElement);
    if (!list.length) return;
    const first = list[0], last = list[list.length-1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };

  A.openDrawer = function(id){
    const b = S.books.find(x => x.id === id); if (!b) return;
    const pct = A.prog(b);
    const sVal = A.SCORE_VALUE[b.score] || 0;
    const stars = sVal ? '★'.repeat(sVal) + '☆'.repeat(5 - sVal) : '—';
    const related = S.sessions.filter(s => s.bookId === b.id).slice(-5).reverse();
    A.$('drawerTitle').textContent = 'جزئیات کتاب';
    A.$('drawerBody').innerHTML = `
      <h2 class="drawer-book-title">${A.esc(b.title)}</h2>
      <div class="muted" style="margin-bottom:14px">${A.esc(b.author || 'نویسنده نامشخص')}</div>
      <div class="drawer-field"><span class="lbl">وضعیت</span><span>${A.statusPill(b.status)}</span></div>
      <div class="drawer-field"><span class="lbl">موضوع</span><span>${A.esc(b.subject || '—')}</span></div>
      <div class="drawer-field"><span class="lbl">امتیاز</span><span style="color:var(--yellow)">${stars}</span></div>
      <div class="drawer-field"><span class="lbl">پیشرفت</span><span>${A.fmt(b.pagesdone)} از ${A.fmt(b.pages)} صفحه (${A.percent(pct)})</span></div>
      <div class="drawer-field"><span class="lbl">دسترسی</span><span>${A.esc(b.access || '—')}</span></div>
      ${b.reason?`<div class="drawer-field"><span class="lbl">دلیل</span><span>${A.esc(b.reason)}</span></div>`:''}
      ${b.reread && b.reread!=='-'?`<div class="drawer-field"><span class="lbl">بازخوانی</span><span>${A.esc(b.reread)}</span></div>`:''}
      ${b.price?`<div class="drawer-field"><span class="lbl">هزینه</span><span>${A.money(b.price)}</span></div>`:''}
      ${b.notes?`<div class="drawer-field"><span class="lbl">یادداشت</span><span>${A.esc(b.notes)}</span></div>`:''}
      ${related.length?`<div style="margin-top:16px"><h3 style="font-size:13px;margin-bottom:8px">جلسه‌های اخیر</h3>${related.map(s=>`<div style="background:#081b35;border:1px solid var(--line);border-radius:9px;padding:9px 11px;margin-bottom:6px;font-size:12px"><b>${A.esc(s.date)}</b> · ${A.fmt(s.minutes)} دقیقه · ${A.fmt(s.pages)} صفحه${s.notes?`<div class="muted" style="margin-top:3px">${A.esc(s.notes)}</div>`:''}</div>`).join('')}</div>`:''}
      <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">
        <button class="btn primary" type="button" data-open-page="${A.esc(b.id)}">📖 صفحه کامل کتاب</button>
        <button class="btn" type="button" data-edit="${A.esc(b.id)}">✎ ویرایش</button>
        <button class="btn" type="button" data-add-quote="${A.esc(b.id)}">❝ نقل‌قول</button>
        <button class="btn" type="button" data-quick-progress="${A.esc(b.id)}">📊 پیشرفت</button>
        <button class="btn" type="button" data-toggle-fav="${A.esc(b.id)}">${b.favorite?'★':'☆'} علاقه‌مندی</button>
        <button class="btn" type="button" data-toggle-lying="${A.esc(b.id)}">${b.lying?'📕 ایستاده کن':'📗 خوابیده کن'}</button>
      </div>
    `;
    A.$('drawer').classList.add('open');
    A.$('drawerBg').classList.add('open');
    document.body.classList.add('locked');
  };
  A.closeDrawer = function(){
    A.$('drawer').classList.remove('open');
    A.$('drawerBg').classList.remove('open');
    document.body.classList.remove('locked');
  };

  A.quickProgress = function(id){
    const b = S.books.find(x => x.id === id); if (!b) return;
    const cur = b.pagesdone || 0;
    const total = b.pages || 0;
    const input = prompt(`صفحه فعلی برای «${b.title}» را وارد کن:\n(کل صفحات: ${A.fmt(total)})`, cur);
    if (input == null) return;
    const v = Math.max(0, Math.round(A.num(input)));
    b.pagesdone = total > 0 ? Math.min(total, v) : v;
    if (total > 0 && b.pagesdone >= total) b.status = 'خوانده شده';
    else if (b.pagesdone > 0 && (b.status === 'خوانده نشده' || b.status === 'صف مطالعه')) b.status = 'درحال خواندن';
    A.saveBooks();
    A.toast('پیشرفت به‌روزرسانی شد.');
    if (A.$('drawer').classList.contains('open')) A.openDrawer(id);
  };

  const cmds = [
    {icon:'▦',label:'داشبورد',hint:'',run:()=>A.setTab('dash')},
    {icon:'▤',label:'فهرست کتاب‌ها',hint:'',run:()=>A.setTab('books')},
    {icon:'⏱',label:'تایمر مطالعه',hint:'T',run:()=>{A.setTab('stats');setTimeout(()=>A.$('timerToggle').focus(),300)}},
    {icon:'◔',label:'آمار',hint:'',run:()=>A.setTab('stats')},
    {icon:'＋',label:'افزودن کتاب جدید',hint:'N',run:()=>A.openModal()},
    {icon:'⭐',label:'علاقه‌مندی‌ها',hint:'',run:()=>{A.$('filterFav').value='fav';A.setTab('books');A.renderTable()}},
    {icon:'↓',label:'پشتیبان JSON',run:()=>A.doExport()},
    {icon:'▤',label:'خروجی CSV کتاب‌ها',run:()=>A.exportCSV('books')},
    {icon:'⎙',label:'چاپ / PDF',run:()=>window.print()}
  ];
  let cmdkIndex = 0, cmdkItems = [];

  A.openCmdk = function(){
    A.$('cmdk').classList.add('open');
    document.body.classList.add('locked');
    A.$('cmdkInput').value = '';
    renderCmdk('');
    setTimeout(()=>A.$('cmdkInput').focus(), 60);
  };
  A.closeCmdk = function(){
    A.$('cmdk').classList.remove('open');
    document.body.classList.remove('locked');
  };
  function renderCmdk(q){
    const query = q.trim().toLocaleLowerCase();
    let items;
    if (!query) items = cmds.slice();
    else {
      const c = cmds.filter(x => x.label.toLocaleLowerCase().includes(query));
      const bms = S.books
        .filter(b => A.norm(b.title + ' ' + (b.author||'')).includes(A.norm(query)))
        .slice(0,6)
        .map(b => ({
          icon:'📘', label:b.title, hint:(b.author||'')+(b.favorite?' ⭐':''),
          run:()=>{ A.closeCmdk(); A.openDrawer(b.id); }
        }));
      const qms = (S.quotes||[])
        .filter(q => A.norm(q.text + ' ' + (q.tags||[]).join(' ')).includes(A.norm(query)))
        .slice(0,6)
        .map(q => ({
          icon:'❝',
          label: q.text.length > 60 ? q.text.slice(0,60) + '…' : q.text,
          hint: (S.books.find(b => b.id === q.bookId)?.title || q.bookTitle || '') + (q.page?` ص ${A.fmt(q.page)}`:''),
          run:()=>{
            A.closeCmdk();
            A.setTab('stats');
            setTimeout(() => {
              A.$('quoteFilterBook').value = q.bookId || '';
              A.renderQuotes();
              const first = A.$('quotesList').querySelector('.quote-item');
              if (first){ first.scrollIntoView({block:'center', behavior:'smooth'}); first.style.outline = '2px solid var(--blue)'; setTimeout(()=>first.style.outline='', 2000); }
            }, 250);
          }
        }));
      items = [...c, ...bms, ...qms];
    }
    cmdkItems = items; cmdkIndex = 0;
    A.$('cmdkList').innerHTML = items.length
      ? items.map((it,i) =>
          `<div class="cmdk-item ${i===0?'active':''}" data-cmdk="${i}"><span class="cmdk-icon">${it.icon}</span><span class="cmdk-label">${A.esc(it.label)}</span><span class="cmdk-hint">${A.esc(it.hint||'')}</span></div>`
        ).join('')
      : '<div class="cmdk-empty">نتیجه‌ای یافت نشد</div>';
  }
  function runCmdk(i){
    const it = cmdkItems[i];
    if (it){ it.run(); if (A.$('cmdk').classList.contains('open')) A.closeCmdk(); }
  }
  function updSel(){
    document.querySelectorAll('.cmdk-item').forEach((el,i)=>el.classList.toggle('active',i===cmdkIndex));
    const el = document.querySelector('.cmdk-item.active');
    if (el) el.scrollIntoView({block:'nearest'});
  }

  A.bindModals = function(){
    A.$('closeDrawer').onclick = A.closeDrawer;
    A.$('drawerBg').onclick   = A.closeDrawer;
    A.$('cmdkBtn').onclick    = A.openCmdk;
    A.$('cmdk').addEventListener('click', e => {
      if (e.target === A.$('cmdk')) A.closeCmdk();
      const it = e.target.closest('[data-cmdk]');
      if (it) runCmdk(+it.dataset.cmdk);
    });
    A.$('cmdkInput').addEventListener('input', e => renderCmdk(e.target.value));
    A.$('cmdkInput').addEventListener('keydown', e => {
      if (e.key==='ArrowDown'){ e.preventDefault(); cmdkIndex = Math.min(cmdkIndex+1, cmdkItems.length-1); updSel(); }
      else if (e.key==='ArrowUp'){ e.preventDefault(); cmdkIndex = Math.max(cmdkIndex-1, 0); updSel(); }
      else if (e.key==='Enter'){ e.preventDefault(); runCmdk(cmdkIndex); }
      else if (e.key==='Escape') A.closeCmdk();
    });
  };
  // ============ RELATED BOOKS + SERIES ============
  let _relatedIds = [];

  A._setRelatedIds = function(ids){
    _relatedIds = Array.isArray(ids) ? ids.slice(0,20) : [];
    A._renderRelatedChips();
  };

  A._getRelatedIds = function(){ return _relatedIds.slice(); };

  A._renderRelatedChips = function(){
    const el = A.$('relatedChips');
    if (!el) return;
    el.innerHTML = _relatedIds.map(id => {
      const b = A.state.books.find(x => x.id === id);
      if (!b) return '';
      return `<span class="related-chip" data-related-id="${A.esc(id)}">
        <span>${A.esc(b.title.slice(0,35))}</span>
        <button type="button" data-related-remove="${A.esc(id)}" aria-label="حذف">✕</button>
      </span>`;
    }).join('');
  };

  A._fillSeriesList = function(){
    const dl = A.$('seriesList');
    if (!dl) return;
    const set = new Set();
    A.state.books.forEach(b => { if (b.series) set.add(b.series); });
    dl.innerHTML = [...set].sort().map(s => `<option>${A.esc(s)}</option>`).join('');
  };

  A.bindRelatedPicker = function(){
    const input = A.$('relatedSearch');
    if (!input || input.dataset.bound) return;
    input.dataset.bound = '1';

    // ساخت results box
    const box = document.createElement('div');
    box.className = 'related-results';
    box.id = 'relatedResults';
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(box);

    function hide(){ box.classList.remove('open'); }
    function show(){ box.classList.add('open'); }

    function renderResults(q){
      const curId = A.$('id').value;
      const query = A.norm(q);
      const pool = A.state.books
        .filter(b => b.id !== curId)
        .filter(b => !_relatedIds.includes(b.id))
        .filter(b => !query || A.norm(b.title + ' ' + (b.author||'')).includes(query))
        .slice(0, 12);
      if (!pool.length){ box.innerHTML = '<div class="related-result" style="color:var(--muted);cursor:default">نتیجه‌ای نیست</div>'; return; }
      box.innerHTML = pool.map(b => `<div class="related-result" data-related-add="${A.esc(b.id)}">
        <b>${A.esc(b.title)}</b>
        <small>${A.esc(b.author || '—')} · ${A.esc(b.subject || '')}</small>
      </div>`).join('');
    }

    input.addEventListener('focus', () => { renderResults(input.value); show(); });
    input.addEventListener('input', () => { renderResults(input.value); show(); });

    input.addEventListener('blur', () => {
      setTimeout(hide, 200);
    });

    box.addEventListener('mousedown', e => {
      const add = e.target.closest('[data-related-add]');
      if (!add) return;
      e.preventDefault();
      const id = add.dataset.relatedAdd;
      if (!_relatedIds.includes(id) && _relatedIds.length < 20){
        _relatedIds.push(id);
        A._renderRelatedChips();
      }
      input.value = '';
      renderResults('');
    });

    // حذف چیپ
    const chipsEl = A.$('relatedChips');
    if (chipsEl){
      chipsEl.addEventListener('click', e => {
        const rm = e.target.closest('[data-related-remove]');
        if (!rm) return;
        const id = rm.dataset.relatedRemove;
        _relatedIds = _relatedIds.filter(x => x !== id);
        A._renderRelatedChips();
        if (box.classList.contains('open')) renderResults(input.value);
      });
    }
  };
})(window.App);