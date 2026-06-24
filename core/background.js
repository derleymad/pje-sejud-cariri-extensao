// ═══════════════════════════════════════════════════════════
// PJe Sejud — Background Service Worker
// fetch() DIRETO com retry + backoff exponencial.
// Zero abas. Retry automático em caso de rate limit.
// ═══════════════════════════════════════════════════════════

const pending = new Map();
let reqId = 0;

// Circuit breaker: rastreia falhas consecutivas
let falhasConsecutivas = 0;
const LIMITE_FALHAS = 5;

// ── Fetch com retry e backoff exponencial ──
async function fetchComRetry(url, ac, maxRetries) {
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    if (ac.signal.aborted) throw { name: 'AbortError' };

    // Circuit breaker: se muitas falhas seguidas, espera mais
    if (falhasConsecutivas >= LIMITE_FALHAS && attempt > 0) {
      var pausaCB = 10000; // 10s de pausa
      console.warn('[BG] ⚠️ Circuit breaker: ' + falhasConsecutivas + ' falhas consecutivas. Pausando ' + (pausaCB/1000) + 's...');
      await new Promise(function(resolve) {
        var t = setTimeout(resolve, pausaCB);
        ac.signal.addEventListener('abort', function() { clearTimeout(t); resolve(); }, { once: true });
      });
      falhasConsecutivas = 0; // reset após pausar
    }

    try {
      var r = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        redirect: 'follow',
        signal: ac.signal,
        headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var html = await r.text();
      // Sucesso → zera falhas
      falhasConsecutivas = 0;
      return html;
    } catch(err) {
      if (err.name === 'AbortError') throw err;

      falhasConsecutivas++;

      if (attempt < maxRetries) {
        // Backoff exponencial: 3s, 6s, 12s
        var espera = Math.min(3000 * Math.pow(2, attempt), 15000);
        console.warn('[BG] Fetch falhou (tentativa ' + (attempt+1) + '/' + (maxRetries+1) + '). Esperando ' + (espera/1000) + 's antes de retry... | ' + (err.message || '').substring(0, 60));
        await new Promise(function(resolve) {
          var t = setTimeout(resolve, espera);
          ac.signal.addEventListener('abort', function() { clearTimeout(t); resolve(); }, { once: true });
        });
        continue;
      }
      throw err;
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // ── Cancela TODOS os fetches pendentes ──
  if (request.type === 'cancelAllFetch') {
    console.log('[BG] Cancelando ' + pending.size + ' fetches...');
    pending.forEach((ac) => { try { ac.abort(); } catch(e) {} });
    pending.clear();
    falhasConsecutivas = 0;
    sendResponse({ ok: true });
    return;
  }

  if (request.type !== 'fetchPageHTML') return;

  var targetUrl = request.url;
  var id = ++reqId;
  var ac = new AbortController();

  // Timeout total de 60s (incluindo retries)
  var timer = setTimeout(function() {
    try { ac.abort(); } catch(e) {}
  }, 60000);

  pending.set(id, ac);

  console.log('[BG] Fetch:', targetUrl.substring(0, 80));

  // Executa fetch com retry (3 tentativas)
  fetchComRetry(targetUrl, ac, 3)
    .then(function(html) {
      clearTimeout(timer);
      pending.delete(id);
      if (html.indexOf('Sem permissão') !== -1 || html.indexOf('Efetuar Login') !== -1) {
        console.warn('[BG] Login/permissão:', targetUrl.substring(0, 60));
        sendResponse({ ok: false, error: 'Sem permissão (sessão expirada?)' });
      } else {
        console.log('[BG] OK:', html.length, 'chars');
        sendResponse({ ok: true, html: html });
      }
    })
    .catch(function(err) {
      clearTimeout(timer);
      pending.delete(id);
      if (err.name === 'AbortError') {
        console.log('[BG] Cancelado');
        sendResponse({ ok: false, error: 'cancelled' });
      } else {
        console.error('[BG] Falhou após retries:', err.message);
        sendResponse({ ok: false, error: err.message });
      }
    });

  return true; // resposta assíncrona
});

console.log('[PJe Sejud] Background worker ativo (fetch + retry + circuit breaker)');
