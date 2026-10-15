(function(A){
  'use strict';

  const DB_NAME = 'persianBookLibrary.covers';
  const DB_VERSION = 1;
  const STORE = 'covers';

  let db = null;
  const cache = new Map();      // bookId -> dataUrl
  let readyPromise = null;

  function openDB(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE)){
          database.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  A.coverStore = {
    init: function(){
      if (readyPromise) return readyPromise;
      readyPromise = (async () => {
        try {
          db = await openDB();
          const all = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          all.forEach(item => cache.set(String(item.id), item.data));
          console.log('[cover-store] آماده — ' + cache.size + ' عکس');
          return true;
        } catch(e){
          console.warn('[cover-store] init failed:', e);
          return false;
        }
      })();
      return readyPromise;
    },

    get: id => cache.get(String(id)) || null,

    has: id => cache.has(String(id)),

    put: async function(id, dataUrl){
      const sid = String(id);
      cache.set(sid, dataUrl);
      if (!db) return false;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).put({ id: sid, data: dataUrl, updated: Date.now() });
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    },

    delete: async function(id){
      const sid = String(id);
      cache.delete(sid);
      if (!db) return false;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).delete(sid);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    },

    count: () => cache.size,

    exportAll: function(){
      const out = {};
      cache.forEach((v, k) => { out[k] = v; });
      return out;
    },

    importAll: async function(obj){
      if (!obj || typeof obj !== 'object') return 0;
      let n = 0;
      for (const [id, data] of Object.entries(obj)){
        if (typeof data === 'string' && data.startsWith('data:image/')){
          try { await A.coverStore.put(id, data); n++; } catch(e){}
        }
      }
      return n;
    }
  };
})(window.App);