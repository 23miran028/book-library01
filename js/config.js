window.App = window.App || {};
(function(A){
  'use strict';

  A.FONT = '"Vazirmatn", Tahoma, sans-serif';

  A.KEYS = {
    BOOKS:    'persianBookLibrary.v2',
    CHECKS:   'persianBookLibrary.checks.v2',
    TAB:      'persianBookLibrary.tab.v1',
    SESSIONS: 'persianBookLibrary.sessions.v1',
    GOAL:     'persianBookLibrary.goal.v1',
    PREFS:    'persianBookLibrary.prefs.v1',
    QUOTES:   'persianBookLibrary.quotes.v1'
  };

  A.SUBJECTS = ['دینی','تاریخی','خاطرات','دفاع مقدس','توسعه فردی','رمان','زن','علمی','غرب','مبانی','ازدواج','سایر'];
  A.STATUSES = ['خوانده شده','درحال خواندن','نیمه کاره','صف مطالعه','خوانده نشده','رها کردم'];
  A.SCORES   = ['بسیار تاثیر گذار','خوب','معمولی','ضعیف','-'];
  A.SCORE_VALUE = {'بسیار تاثیر گذار':5, 'خوب':4, 'معمولی':3, 'ضعیف':2, '-':0};
  A.STATUS_COLORS = {'خوانده شده':'#10bb80','درحال خواندن':'#f6c747','نیمه کاره':'#ff9b38','صف مطالعه':'#9564f5','خوانده نشده':'#268fe5','رها کردم':'#64748b'};
  A.SCORE_COLORS  = {'بسیار تاثیر گذار':'#10bb80','خوب':'#268fe5','معمولی':'#f6c747','ضعیف':'#f45162','-':'#546e8a'};
  A.STATUS_ORDER  = {'خوانده شده':0,'درحال خواندن':1,'نیمه کاره':2,'صف مطالعه':3,'خوانده نشده':4,'رها کردم':5};
  A.ARCHIVE_STATUS = 'رها کردم';

  A.PREF_DEFAULT = { fontScale:'14', accentTheme:'ocean', modeTheme:'dark', viewMode:'shelf', aiApiKey:'', aiEnabled:true };

  // ===== تنظیمات قفسه کتابخانه =====
  A.VIEW_MODE_DEFAULT = 'shelf';
  A.SHELF_CAPACITY = 8;   // چند کتاب در هر ردیف قفسه
  A.BOOK_SIZES = {
    small:  { h: 150, minPages: 0   },
    medium: { h: 170, minPages: 200 },
    large:  { h: 190, minPages: 500 }
  };
  A.LEGACY_PALETTES = { blue:'ocean', green:'forest', purple:'violet', gold:'sunset' };

  A.PALETTES = {
    ocean:  {bg:'#06152b',glow:'#102b4d',panel:'#0b2345',line:'#1b416b',surfaceA:'#0d2648',surfaceB:'#081b35',input:'#071a33',button:'#12345b',hover:'#173f6b',table:'#102b4d',chip:'#0e2c50',chipActive:'#1a4d7a',detail:'#0a1e38',soft:'#071a33',footerA:'#0b2345',footerB:'#152b43',subtle:'#173656',blue:'#268fe5',teal:'#54c8ff',contrast:'#ffffff'},
    forest: {bg:'#061c19',glow:'#123a32',panel:'#0b2b24',line:'#205347',surfaceA:'#104034',surfaceB:'#08261f',input:'#08241e',button:'#12483b',hover:'#195b4a',table:'#103b32',chip:'#10392f',chipActive:'#195744',detail:'#082a23',soft:'#08241e',footerA:'#0b2b24',footerB:'#123b32',subtle:'#205347',blue:'#20b995',teal:'#76e7c0',contrast:'#04261f'},
    violet: {bg:'#130d27',glow:'#302050',panel:'#1d1435',line:'#48336f',surfaceA:'#2a1c49',surfaceB:'#18112d',input:'#170f2b',button:'#342354',hover:'#49316e',table:'#261a40',chip:'#24183e',chipActive:'#49316e',detail:'#1a112e',soft:'#170f2b',footerA:'#1d1435',footerB:'#302050',subtle:'#48336f',blue:'#a78bfa',teal:'#d0baff',contrast:'#21113a'},
    sunset: {bg:'#211509',glow:'#503016',panel:'#321f0d',line:'#6e4822',surfaceA:'#432912',surfaceB:'#28190b',input:'#291909',button:'#513113',hover:'#68421b',table:'#3b2510',chip:'#38230f',chipActive:'#67421c',detail:'#28190b',soft:'#291909',footerA:'#321f0d',footerB:'#4b2e13',subtle:'#6e4822',blue:'#e6ad35',teal:'#ffdc88',contrast:'#2c1b05'},
    rose:   {bg:'#250d1b',glow:'#4a1a34',panel:'#321326',line:'#65304e',surfaceA:'#401832',surfaceB:'#26101f',input:'#290f20',button:'#4b1b37',hover:'#64244a',table:'#38152c',chip:'#35142a',chipActive:'#67274d',detail:'#281020',soft:'#290f20',footerA:'#321326',footerB:'#4a1a34',subtle:'#65304e',blue:'#ed6b9f',teal:'#ffb7d1',contrast:'#3d1027'},
    teal:   {bg:'#061b22',glow:'#103a46',panel:'#0a2933',line:'#1a5360',surfaceA:'#0d3540',surfaceB:'#071f28',input:'#08232b',button:'#10414c',hover:'#155765',table:'#0e333e',chip:'#0c303a',chipActive:'#165362',detail:'#08232b',soft:'#08232b',footerA:'#0a2933',footerB:'#103a46',subtle:'#1a5360',blue:'#19b8b2',teal:'#78efe4',contrast:'#062a2a'}
  };
})(window.App);