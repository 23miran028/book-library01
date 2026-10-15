(function(A){
  'use strict';

  // null = دست‌نخورده، '' = حذف شود، 'data:...' = عکس جدید
  let pendingImage = null;

  function setPreviewVisual(src){
    const preview = A.$('coverPreview');
    const clearBtn = A.$('coverClear');
    if (!preview) return;
    if (src){
      preview.style.backgroundImage = `url('${src}')`;
      preview.classList.add('has-image');
      if (clearBtn) clearBtn.hidden = false;
    } else {
      preview.style.backgroundImage = '';
      preview.classList.remove('has-image');
      if (clearBtn) clearBtn.hidden = true;
    }
  }

  A._setCoverPreview = function(src){
    pendingImage = null;
    setPreviewVisual(src || '');
  };

  A._getPendingCover = function(){ return pendingImage; };

  function setPending(src){
    pendingImage = src || '';
    setPreviewVisual(src);
  }

  A.compressImage = function(file, maxW = 500, maxH = 750, quality = 0.82){
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')){ reject(new Error('not-image')); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          const ratio = Math.min(maxW / w, maxH / h, 1);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch(err){ reject(err); }
        };
        img.onerror = () => reject(new Error('bad-image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('read-fail'));
      reader.readAsDataURL(file);
    });
  };

  A.bindBookCover = function(){
    const input = A.$('coverInput');
    const preview = A.$('coverPreview');
    const clearBtn = A.$('coverClear');
    const uploadBtn = A.$('coverUpload');
    if (!input || !preview) return;

    if (uploadBtn) uploadBtn.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      A.compressImage(file).then(url => {
        if (url) setPending(url);
      }).catch(() => A.toast('عکس پشتیبانی نمی‌شود.'));
    });

    if (clearBtn){
      clearBtn.addEventListener('click', () => setPending(''));
    }

    preview.addEventListener('click', () => input.click());

    preview.addEventListener('dragover', e => {
      e.preventDefault();
      preview.classList.add('drag-over');
    });
    preview.addEventListener('dragleave', () => preview.classList.remove('drag-over'));
    preview.addEventListener('drop', e => {
      e.preventDefault();
      preview.classList.remove('drag-over');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      A.compressImage(file).then(url => {
        if (url) setPending(url);
      }).catch(() => A.toast('عکس پشتیبانی نمی‌شود.'));
    });

    document.addEventListener('paste', e => {
      if (!A.$('modalbg')?.classList.contains('open')) return;
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items){
        if (it.type.startsWith('image/')){
          const file = it.getAsFile();
          if (file){
            A.compressImage(file).then(url => { if (url) setPending(url); });
            e.preventDefault();
            return;
          }
        }
      }
    });
  };
})(window.App);