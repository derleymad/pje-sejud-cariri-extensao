// ═══════════════════════════════════════════════════════════
// PJe Sejud — Background Service Worker
// Usa fetch() DIRETO com cookies (host_permissions + cookies permission).
// NÃO abre abas — zero poluição de janelas, zero content scripts em scan.
// ═══════════════════════════════════════════════════════════

// Mapa de requests pendentes: id → AbortController
const pending = new Map();
let reqId = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // ── Cancela TODOS os fetches pendentes (abort instantâneo) ──
  if (request.type === 'cancelAllFetch') {
    console.log('[BG] Cancelando ' + pending.size + ' fetches pendentes...');
    pending.forEach((ac) => {
      try { ac.abort(); } catch(e) {}
    });
    pending.clear();
    sendResponse({ ok: true });
    return; // síncrono
  }

  if (request.type !== 'fetchPageHTML') return;

  const targetUrl = request.url;
  const id = ++reqId;
  const ac = new AbortController();

  // Timeout de 20s (o AbortController aborta o fetch automaticamente)
  const timer = setTimeout(() => {
    try { ac.abort(); } catch(e) {}
  }, 20000);

  pending.set(id, ac);

  console.log('[BG] Fetch direto:', targetUrl.substring(0, 100));

  fetch(targetUrl, {
    method: 'GET',
    credentials: 'include',   // envia cookies do domínio (host_permissions garante acesso)
    redirect: 'follow',
    signal: ac.signal,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  .then(function(response) {
    clearTimeout(timer);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.text();
  })
  .then(function(html) {
    pending.delete(id);
    // Detecta página de "Sem permissão" (sessão expirada / cookie inválido)
    if (html.indexOf('Sem permissão') !== -1 || html.indexOf('Efetuar Login') !== -1) {
      console.warn('[BG] Página de login/permissão retornada para:', targetUrl.substring(0, 80));
      sendResponse({ ok: false, error: 'Sem permissão (sessão expirada?)' });
    } else {
      console.log('[BG] Fetch OK:', html.length, 'chars');
      sendResponse({ ok: true, html: html });
    }
  })
  .catch(function(err) {
    clearTimeout(timer);
    pending.delete(id);
    if (err.name === 'AbortError') {
      console.log('[BG] Fetch cancelado (id=' + id + ')');
      sendResponse({ ok: false, error: 'cancelled' });
    } else {
      console.error('[BG] Fetch erro:', err.message, '|', targetUrl.substring(0, 80));
      sendResponse({ ok: false, error: err.message });
    }
  });

  return true; // resposta assíncrona
});

console.log('[PJe Sejud] Background worker ativo (modo: fetch direto — SEM abas)');
