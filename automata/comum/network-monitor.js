// ============================================================
// Network Monitor — MAIN WORLD
// Intercepta XHR e fetch para contar requisições pendentes.
// Expondo via DOM attr + eventos para os content scripts.
// ============================================================
(function() {
  'use strict';

  let pending = 0;

  function update(val) {
    pending = Math.max(0, pending + val);
    document.documentElement.setAttribute('data-pje-pending', pending);
    if (pending === 0) {
      window.dispatchEvent(new CustomEvent('pje:network-idle', { detail: { pending: 0 } }));
    }
  }

  function _isRelevante(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('data:') || url.startsWith('blob:')) return false;
    // Ignora recursos estáticos
    if (/\.(png|jpg|jpeg|gif|svg|ico|css|woff|woff2|ttf|js|png|eot)(\?|#|$)/i.test(url)) return false;
    return true;
  }

  // ══ Intercepta XMLHttpRequest ══
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._pje_url = url;
    this._pje_method = method;
    return _open.apply(this, arguments);
  };

  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function() {
    const url = this._pje_url || '';
    if (_isRelevante(url)) {
      update(+1);
      const self = this;
      const onDone = function() {
        // BUG CORRIGIDO: antes havia `if (self.readyState === 4 || ...) return;`
        // — isso fazia o onDone RETORNAR quando o XHR completava (readyState 4),
        // exatamente quando deveria decrementar. O contador só subia, nunca descia,
        // e o aguardarRequisicoes dava timeout de 10s em todo aguardarLoading.
        // Agora só `_pje_done` evita duplo decremento (readystatechange + loadend).
        if (self._pje_done) return;
        self._pje_done = true;
        update(-1);
      };
      this.addEventListener('readystatechange', function() {
        if (this.readyState === 4) onDone();
      });
      this.addEventListener('loadend', onDone);
      this.addEventListener('error', onDone);
      this.addEventListener('abort', onDone);
      // Timeout de segurança
      setTimeout(function() { onDone(); }, 30000);
    }
    return _send.apply(this, arguments);
  };

  // ══ Intercepta fetch ══
  const _fetch = window.fetch;
  window.fetch = function(input, init) {
    let url = '';
    if (typeof input === 'string') url = input;
    else if (input instanceof Request) url = input.url;

    if (_isRelevante(url)) {
      update(+1);
      let decDone = false;
      const dec = function() { if (decDone) return; decDone = true; update(-1); };
      try {
        const p = _fetch.call(this, input, init);
        if (p && typeof p.then === 'function') {
          const tid = setTimeout(dec, 30000);
          return p.then(function(r) { clearTimeout(tid); dec(); return r; },
                        function(e) { clearTimeout(tid); dec(); throw e; });
        }
        dec();
        return p;
      } catch(e) { dec(); throw e; }
    }

    return _fetch.call(this, input, init);
  };

  console.log('[PJE Network] Monitor de rede ativo.');
})();
