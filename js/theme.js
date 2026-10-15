(function(A){
  'use strict';
  const S = A.state;
  function setVar(name, value){ document.documentElement.style.setProperty(name, value); }

  A.applyPrefs = function(){
    const prefs = S.prefs;
    document.body.style.fontSize = (Number(prefs.fontScale)||14) + 'px';
    const palette = A.PALETTES[prefs.accentTheme] || A.PALETTES.ocean;
    const vars = {
      '--bg':palette.bg,'--glow':palette.glow,'--panel':palette.panel,'--line':palette.line,
      '--surface-a':palette.surfaceA,'--surface-b':palette.surfaceB,'--input-bg':palette.input,
      '--btn-bg':palette.button,'--btn-hover':palette.hover,'--table-head':palette.table,
      '--chip-bg':palette.chip,'--chip-active':palette.chipActive,'--detail-bg':palette.detail,
      '--soft-panel':palette.soft,'--footer-a':palette.footerA,'--footer-b':palette.footerB,
      '--subtle-line':palette.subtle,'--blue':palette.blue,'--teal':palette.teal,
      '--accent-contrast':palette.contrast
    };
    Object.entries(vars).forEach(([k,v]) => setVar(k,v));

    const requested = prefs.modeTheme || 'dark';
    const mode = requested === 'system'
      ? ((window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark')
      : requested;
    document.body.dataset.mode = mode;
    document.body.dataset.palette = prefs.accentTheme;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'light' ? '#f2f6fc' : palette.bg;

    if (A.$('fontScale'))   A.$('fontScale').value   = prefs.fontScale;
    if (A.$('accentTheme')) A.$('accentTheme').value = prefs.accentTheme;
    if (A.$('modeTheme'))   A.$('modeTheme').value   = requested;

    document.querySelectorAll('[data-palette]').forEach(btn => {
      const active = btn.dataset.palette === prefs.accentTheme;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (typeof A.drawCharts === 'function') requestAnimationFrame(A.drawCharts);
  };

  function persist(){
    A.savePrefs();
    A.applyPrefs();
    A.toast('تنظیمات نمایش ذخیره شد.');
  }

  A.bindTheme = function(){
    A.$('fontScale').addEventListener('change', () => { S.prefs.fontScale = A.$('fontScale').value; persist(); });
    A.$('accentTheme').addEventListener('change', () => { S.prefs.accentTheme = A.$('accentTheme').value; persist(); });
    A.$('modeTheme').addEventListener('change', () => { S.prefs.modeTheme = A.$('modeTheme').value; persist(); });
    A.$('paletteSwatches').addEventListener('click', e => {
      const btn = e.target.closest('[data-palette]'); if (!btn) return;
      S.prefs.accentTheme = btn.dataset.palette;
      persist();
    });
    if (window.matchMedia){
      const media = window.matchMedia('(prefers-color-scheme: light)');
      const handler = () => { if (S.prefs.modeTheme === 'system') A.applyPrefs(); };
      if (media.addEventListener) media.addEventListener('change', handler);
      else if (media.addListener) media.addListener(handler);
    }
  };
})(window.App);