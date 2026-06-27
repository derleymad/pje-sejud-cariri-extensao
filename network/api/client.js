// ═══════════════════════════════════════════════════════════
//ApiClient — Todas as chamadas passam pelo background worker
// NUNCA faz fetch() direto do content script.
// Uso:
//   const data = await ApiClient.post('/tarefas', { numeroProcesso: '...' });
//   const html = await ApiClient.fetchHTML('https://pje.tjce.jus.br/...');
// ═══════════════════════════════════════════════════════════

var ApiClient = (function() {

  // ── POST/GET JSON via background worker ──
  function request(url, options) {
    options = options || {};
    return new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage({
        type: 'apiCall',
        url: url,
        method: options.method || 'GET',
        body: options.body ? JSON.stringify(options.body) : null,
        headers: options.headers || { 'Content-Type': 'application/json' }
      }, function(response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response && response.ok) resolve(response.data);
        else reject(new Error(response ? response.error : 'sem resposta do background'));
      });
    });
  }

  // ── POST JSON ──
  function post(url, body) {
    return request(url, { method: 'POST', body: body });
  }

  // ── GET JSON ──
  function get(url) {
    return request(url, { method: 'GET' });
  }

  // ── Fetch HTML via background (usa o handler fetchPageHTML existente) ──
  function fetchHTML(url, cancelFlag) {
    if (cancelFlag && cancelFlag.cancel) return Promise.reject(new Error('cancelled'));
    // Reaproveita o fetchPaginaHTMLviaFetch do infra.js (já testado e estável)
    if (typeof fetchPaginaHTMLviaFetch === 'function') {
      return fetchPaginaHTMLviaFetch(url, cancelFlag);
    }
    return request(url, { method: 'GET' });
  }

  // ── GET texto puro (ex: chave de acesso) ──
  function getText(url) {
    return new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage({
        type: 'apiCall',
        url: url,
        method: 'GET',
        rawText: true
      }, function(response) {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (response && response.ok) resolve(response.data);
        else reject(new Error(response ? response.error : 'sem resposta'));
      });
    });
  }

  return { post: post, get: get, fetchHTML: fetchHTML, getText: getText, request: request };
})();
