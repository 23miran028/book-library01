(function(){
  'use strict';

  const isSecure = location.protocol === 'https:' ||
                   location.hostname === 'localhost' ||
                   location.hostname === '127.0.0.1';
  const isFile = location.protocol === 'file:';

  const offlineBanner = document.getElementById('offlineBanner');
  const updateBanner  = document.getElementById('updateBanner');

  function syncBanners(){
    const anyVisible = (offlineBanner && !offlineBanner.hidden) ||
                       (updateBanner && !updateBanner.hidden);
    document.body.classList.toggle('has-top-banner', anyVisible);
  }
  function updateOnlineStatus(){
    if (!offlineBanner) return;
    offlineBanner.hidden = navigator.onLine;
    syncBanners();
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  function showUpdateBanner(){
    if (!updateBanner) return;
    updateBanner.hidden = false;
    syncBanners();
    const reloadBtn = updateBanner.querySelector('[data-reload]');
    if (reloadBtn) reloadBtn.onclick = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('SKIP_WAITING');
      }
      setTimeout(() => window.location.reload(), 250);
    };
    const dismissBtn = updateBanner.querySelector('[data-dismiss]');
    if (dismissBtn) dismissBtn.onclick = () => {
      updateBanner.hidden = true;
      syncBanners();
    };
  }

  if ('serviceWorker' in navigator && isSecure && !isFile) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' })
        .then(reg => {
          console.log('[PWA] Service Worker فعال شد ✓', reg.scope);
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateBanner();
              }
            });
          });
        })
        .catch(err => console.warn('[PWA] ثبت SW ناموفق:', err));

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    });
  } else if (isFile) {
    console.info('[PWA] برای تجربه آفلاین کامل، صفحه را از طریق سرور محلی باز کن (نه file://).\nراهنما: python -m http.server 8000');
  }

  let deferredPrompt = null;
  const installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });

  if (installBtn){
    installBtn.onclick = async () => {
      if (!deferredPrompt){
        alert('برای نصب:\n• اندروید/کروم: منوی مرورگر → «افزودن به صفحه اصلی»\n• iOS Safari: دکمه اشتراک‌گذاری → «Add to Home Screen»');
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] نتیجه نصب:', outcome);
      deferredPrompt = null;
      installBtn.hidden = true;
    };
  }

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.hidden = true;
    deferredPrompt = null;
    console.log('[PWA] برنامه نصب شد ✓');
  });

  if (window.matchMedia('(display-mode: standalone)').matches){
    if (installBtn) installBtn.hidden = true;
  }
})();