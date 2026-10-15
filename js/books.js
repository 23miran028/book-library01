(function(A){
  'use strict';
  const S = A.state;

  A.weightedAvgScore = function(){
    let sum = 0, cnt = 0;
    S.books.forEach(b => { const v = A.SCORE_VALUE[b.score] || 0; if (v > 0){ sum += v; cnt++; } });
    return cnt ? sum/cnt : null;
  };

  A.getFiltered = function(){
    const q = A.norm(A.$('search').value);
    const st = S.currentStatus;
    const su = A.$('filterSubject').value;
    const sc = A.$('filterScore').value;
    const ac = A.$('filterAccess').value;
    const fav = A.$('filterFav').value;
    let arr = S.books.filter(b => {
      if (st && b.status !== st) return false;
      if (su && (b.subject || 'سایر') !== su) return false;
      if (sc && b.score !== sc) return false;
      if (ac && b.access !== ac) return false;
      if (fav === 'fav' && !b.favorite) return false;
      if (q && !A.norm(b.title+' '+(b.author||'')+' '+(b.reason||'')+' '+(b.notes||'')).includes(q)) return false;
      return true;
    });
    if (S.sortKey){
      const dir = S.sortDir;
      arr = arr.slice().sort((a,b) => {
        let va, vb;
        switch(S.sortKey){
          case 'title':    va = A.norm(a.title); vb = A.norm(b.title); break;
          case 'author':   va = A.norm(a.author||''); vb = A.norm(b.author||''); break;
          case 'subject':  va = A.norm(a.subject||''); vb = A.norm(b.subject||''); break;
          case 'status':   va = A.STATUS_ORDER[a.status] ?? 9; vb = A.STATUS_ORDER[b.status] ?? 9; break;
          case 'progress': va = A.prog(a); vb = A.prog(b); break;
          case 'score':    va = A.SCORE_VALUE[a.score] || 0; vb = A.SCORE_VALUE[b.score] || 0; break;
          case 'access':   va = a.access || ''; vb = b.access || ''; break;
          default: return 0;
        }
        if (va < vb) return -dir;
        if (va > vb) return dir;
        return 0;
      });
    }
    arr = arr.slice().sort((a,b) => (b.favorite?1:0) - (a.favorite?1:0));
    return arr;
  };
})(window.App);