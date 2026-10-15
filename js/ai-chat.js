(function(A){
  'use strict';
  const S = A.state;
  const CHATS_KEY = 'persianBookLibrary.chats.v1';

  let chats = {};
  try { chats = JSON.parse(localStorage.getItem(CHATS_KEY) || '{}') || {}; } catch(e){ chats = {}; }

  function saveChats(){
    try {
      const trimmed = {};
      Object.entries(chats).forEach(([k, v]) => {
        trimmed[k] = Array.isArray(v) ? v.slice(-40) : [];
      });
      chats = trimmed;
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch(e){}
  }

  function getHistory(bookId){ return chats[bookId] || []; }

  A.clearBookChat = function(bookId){
    delete chats[bookId];
    saveChats();
  };

  function suggestionsFor(book){
    return [
      `«${book.title}» درباره چیست؟`,
      `چه ایده‌های اصلی در این کتاب هست؟`,
      `این کتاب برای چه کسی مناسب است؟`,
      `چطور می‌توانم از این کتاب بیشترین بهره را ببرم؟`
    ];
  }

  A.renderBookChat = function(bookId){
    const b = S.books.find(x => x.id === bookId);
    if (!b) return '<div class="empty">کتاب پیدا نشد.</div>';

    const history = getHistory(bookId);
    const hasKey = A.aiCloudReady && A.aiCloudReady();

    const messagesHtml = history.length
      ? history.map(m => `
          <div class="chat-msg chat-${m.role}">
            <div class="chat-bubble">${A.esc(m.content).replace(/\n/g,'<br>')}</div>
          </div>`).join('')
      : `
        <div class="chat-empty">
          <div class="chat-empty-icon">🤖</div>
          <div class="chat-empty-title">درباره «${A.esc(b.title)}» بپرس</div>
          <div class="chat-suggestions">
            ${suggestionsFor(b).map(q => `<button type="button" class="chat-suggest" data-chat-suggest="${A.esc(q)}">${A.esc(q)}</button>`).join('')}
          </div>
        </div>`;

    return `
      <div class="chat-wrap" data-chat-book="${A.esc(bookId)}">
        <div class="chat-messages" id="chatMessages">${messagesHtml}</div>
        ${history.length ? `<button type="button" class="chat-clear" data-chat-clear="${A.esc(bookId)}">🗑 پاک‌کردن گفتگو</button>` : ''}
        <form class="chat-input-row" id="chatForm">
          <input type="text" id="chatInput" placeholder="${hasKey ? 'سؤالت را بنویس…' : 'ابتدا کلید AI را در تنظیمات وارد کن'}" autocomplete="off" ${hasKey ? '' : 'disabled'}>
          <button type="submit" class="btn primary" ${hasKey ? '' : 'disabled'} aria-label="ارسال">↑</button>
        </form>
      </div>`;
  };

  function refreshChat(bookId){
    const wrap = document.querySelector(`[data-chat-book="${bookId}"]`);
    if (!wrap) return;
    const html = A.renderBookChat(bookId);
    const temp = document.createElement('div');
    temp.innerHTML = html;
    wrap.replaceWith(temp.firstElementChild);
    const msgBox = A.$('chatMessages');
    if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
    const newInput = document.querySelector(`[data-chat-book="${bookId}"] #chatInput`);
    if (newInput) newInput.focus();
  }

  A.bindBookChat = function(){
    const page = A.$('bookPage');
    if (!page || page.dataset.chatBound) return;
    page.dataset.chatBound = '1';

    page.addEventListener('submit', async e => {
      if (e.target.id !== 'chatForm') return;
      e.preventDefault();
      const wrap = e.target.closest('[data-chat-book]');
      if (!wrap) return;
      const bookId = wrap.dataset.chatBook;
      const text = e.target.querySelector('#chatInput').value.trim();
      if (!text) return;

      const b = S.books.find(x => x.id === bookId);
      if (!b) return;

      chats[bookId] = chats[bookId] || [];
      chats[bookId].push({ role: 'user', content: text, ts: Date.now() });
      saveChats();
      refreshChat(bookId);

      const msgBox = A.$('chatMessages');
      const loading = document.createElement('div');
      loading.className = 'chat-msg chat-assistant';
      loading.id = 'chatLoading';
      loading.innerHTML = `<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>`;
      if (msgBox){
        msgBox.appendChild(loading);
        msgBox.scrollTop = msgBox.scrollHeight;
      }

      const prior = chats[bookId].slice(0, -1);
      const reply = await A.aiChat(b, prior, text);

      loading.remove();

      chats[bookId].push({
        role: 'assistant',
        content: reply || '❌ متأسفانه پاسخ نگرفتم. اتصال اینترنت و کلید Groq/OpenRouter را بررسی کن.',
        ts: Date.now()
      });
      saveChats();
      refreshChat(bookId);
    });

    page.addEventListener('click', e => {
      const sug = e.target.closest('[data-chat-suggest]');
      if (sug){
        const wrap = sug.closest('[data-chat-book]');
        const input = wrap.querySelector('#chatInput');
        if (input){
          input.value = sug.dataset.chatSuggest;
          wrap.querySelector('#chatForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
        return;
      }
      const clr = e.target.closest('[data-chat-clear]');
      if (clr){
        if (!confirm('کل گفتگوی این کتاب پاک شود؟')) return;
        A.clearBookChat(clr.dataset.chatClear);
        refreshChat(clr.dataset.chatClear);
      }
    });
  };
})(window.App);