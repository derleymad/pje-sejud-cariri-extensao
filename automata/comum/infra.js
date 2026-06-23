// ═══════════════════════════════════════════════════════════
// PJe Sejud — Infraestrutura Compartilhada (API, Iframes, URLs)
// Depende de: utils.js ($, API_HOST, API, FILAS)
// ═══════════════════════════════════════════════════════════════

  // ── Agrupador iframe hook: envia HTML da página para o parent ──
  (function() {
    if (window.name && window.name.indexOf('_pje_agr_') === 0) {
      var reqId = window.name;
      var count = 0;
      var MAX = 10;
      var INTERVAL = 1000;
      console.log('[Agrupador iframe] Hook ativo, enviando HTML a cada ' + INTERVAL + 'ms (max ' + MAX + 'x)');
      console.log('[Agrupador iframe] URL: ' + window.location.href.substring(0, 120));
      var timer = setInterval(function() {
        try {
          var html = document.documentElement.outerHTML;
          var bodyText = (document.body && document.body.textContent || '').replace(/\s+/g, ' ').trim();
          // Mostra preview do texto visível para debug
          console.log('[Agrupador iframe] Seq=' + count + ': HTML=' + html.length + ' chars | BodyText=' + bodyText.length + ' chars');
          console.log('[Agrupador iframe] BodyText (primeiros 1000):', bodyText.substring(0, 1000));
          console.log('[Agrupador iframe] BodyText (ultimos 1000):', bodyText.substring(Math.max(0, bodyText.length - 1000)));
          // Procura por CEJUSC e variações
          var upperHtml = html.toUpperCase();
          var kwFound = upperHtml.indexOf('CEJUSC') !== -1;
          console.log('[Agrupador iframe] CEJUSC no HTML? ' + kwFound + ' | no BodyText? ' + (bodyText.toUpperCase().indexOf('CEJUSC') !== -1));
          window.parent.postMessage({
            type: '_pje_agr_response',
            id: reqId,
            html: html,
            seq: count
          }, '*');
          count++;
          if (count >= MAX) {
            clearInterval(timer);
            console.log('[Agrupador iframe] ULTIMO envio #' + count + ': HTML=' + html.length + ' chars');
            console.log('[Agrupador iframe] BODYTEXT COMPLETO:');
            console.log(bodyText);
          }
        } catch(e) {
          clearInterval(timer);
          console.error('[Agrupador iframe] Erro:', e.message);
        }
      }, INTERVAL);
    }
  })();

  function getTarefaUrl(idProcesso, fila) {
    return API_HOST + (CFG ? CFG.tarefaPath : '/pje1grau/ng2/dev.seam#/painel-usuario-interno/conteudo-tarefa/')
           + idProcesso + '/' + encodeURIComponent(fila);
  }


  function getAutosUrl(numero) {
    // Mesmo padrão do content.js — o interceptor de window.open captura e abre no overlay
    return API_HOST + '/pje1grau/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?processo.numero=' + encodeURIComponent(numero);
  }


  function getMovimentarUrl(idProcesso, idTaskInstance) {
    return API_HOST + '/pje1grau/Processo/movimentar.seam?newTaskId=' + idTaskInstance + '&idProcesso=' + idProcesso + '&iframe=true';
  }

  // URL sem &iframe=true para fetch (evita redirect pra error.seam em cross-origin)
  function getMovimentarUrlFetch(idProcesso, idTaskInstance) {
    return API_HOST + '/pje1grau/Processo/movimentar.seam?newTaskId=' + idTaskInstance + '&idProcesso=' + idProcesso;
  }

  // Executa tarefas assíncronas em paralelo com limite de concorrência
  // items: array de itens, fn: função(item, index) => Promise, limit: max simultâneos

  async function parallelLimit(items, fn, limit, cancelFlag) {
    if (!items.length) return [];
    var results = new Array(items.length);
    var idx = 0;
    var cancelled = false;
    async function worker() {
      while (idx < items.length && !cancelled) {
        if (cancelFlag && cancelFlag.cancel) { cancelled = true; break; }
        var i = idx++;
        try { results[i] = await fn(items[i], i); } catch(e) { results[i] = { __error: e }; }
      }
    }
    var actualLimit = Math.min(limit, items.length);
    var workers = [];
    for (var w = 0; w < actualLimit; w++) workers.push(worker());
    await Promise.all(workers);
    return results;
  }


  // Busca HTML da página via iframe escondido (evita CORS — mesmo origem)
  // NOTA: preterido, usar fetchPaginaHTMLviaFetch (mais rápido, sem DOM)

  function fetchPaginaHTML(url, cancelFlag) {
    return new Promise(function(resolve, reject) {
      if (cancelFlag && cancelFlag.cancel) { reject(new Error('cancelled')); return; }
      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
      iframe.src = url;
      var timeout = setTimeout(function() {
        try { document.body.removeChild(iframe); } catch(e) {}
        reject(new Error('timeout'));
      }, 8000);
      iframe.onload = function() {
        clearTimeout(timeout);
        if (cancelFlag && cancelFlag.cancel) {
          try { document.body.removeChild(iframe); } catch(e) {}
          reject(new Error('cancelled'));
          return;
        }
        setTimeout(function() {
          try {
            if (cancelFlag && cancelFlag.cancel) { reject(new Error('cancelled')); return; }
            var doc = iframe.contentDocument || iframe.contentWindow.document;
            var html = doc.documentElement.outerHTML;
            document.body.removeChild(iframe);
            resolve(html);
          } catch(e) {
            document.body.removeChild(iframe);
            reject(e);
          }
        }, 300); // espera renderizar (reduzido de 500ms)
      };
      iframe.onerror = function() {
        clearTimeout(timeout);
        try { document.body.removeChild(iframe); } catch(e) {}
        reject(new Error('iframe load error'));
      };
      document.body.appendChild(iframe);
    });
  }

  // Detecta se a URL destino é cross-origin em relação à página atual.
  // Content scripts no iframe cnj.cloud buscando pje.tjce.jus.br sempre esbarram em
  // CORS — o fetch direto é inútil, então vai direto pro background (aba com cookies).
  function _agrIsCrossOrigin(url) {
    try {
      return new URL(url).hostname !== window.location.hostname;
    } catch(e) { return false; }
  }

  // Busca HTML da página: fetch direto (same-origin) → background service worker (aba com cookies).
  function fetchPaginaHTMLviaFetch(url, cancelFlag) {
    if (cancelFlag && cancelFlag.cancel) throw new Error('cancelled');

    return (async function() {
      // Fetch DIRETO só vale a pena same-origin. Em cross-origin (ex: content script
      // no iframe cnj.cloud buscando pje.tjce.jus.br) o browser bloqueia por CORS e o
      // fetch sempre falha — pular direto pro background economiza essa tentativa.
      if (!_agrIsCrossOrigin(url)) {
        try {
          console.log('[fetchHTML] Tentando fetch DIRETO (same-origin): ' + url.substring(0, 100));
          var r = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            redirect: 'follow',
            headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
          });
          if (r.ok) {
            var html = await r.text();
            var hasErro = html.indexOf('Sem permissão') !== -1;
            if (!hasErro) {
              console.log('[fetchHTML] DIRETO OK: ' + html.length + ' chars');
              return html;
            }
            console.warn('[fetchHTML] DIRETO retornou "Sem permissão", indo pro background...');
          } else {
            console.warn('[fetchHTML] DIRETO HTTP ' + r.status + ', indo pro background...');
          }
        } catch(e) {
          console.warn('[fetchHTML] DIRETO falhou (' + e.message + '), indo pro background...');
        }
      } else {
        console.log('[fetchHTML] Cross-origin (' + window.location.hostname + ' → ' + new URL(url).hostname + '): direto pro background');
      }

      // Background service worker — agora usa fetch() direto (zero abas!)
      if (cancelFlag && cancelFlag.cancel) throw new Error('cancelled');
      return new Promise(function(resolve, reject) {
        function tentarBG(retry) {
          if (cancelFlag && cancelFlag.cancel) { reject(new Error('cancelled')); return; }
          chrome.runtime.sendMessage(
            { type: 'fetchPageHTML', url: url },
            function(response) {
              if (chrome.runtime.lastError) {
                var errMsg = chrome.runtime.lastError.message || '';
                console.warn('[fetchHTML] BG erro (' + (retry+1) + '/3): ' + errMsg);
                if (retry < 2 && errMsg.includes('Extension context invalidated')) {
                  setTimeout(function() { tentarBG(retry + 1); }, 2000);
                  return;
                }
                reject(new Error('Background indisponível: ' + errMsg));
                return;
              }
              if (cancelFlag && cancelFlag.cancel) { reject(new Error('cancelled')); return; }
              if (response && response.ok) {
                console.log('[fetchHTML] BG OK: ' + response.html.length + ' chars');
                resolve(response.html);
              } else {
                console.error('[fetchHTML] BG falhou: ' + (response ? response.error : 'sem resposta'));
                reject(new Error(response ? response.error : 'sem resposta do background'));
              }
            }
          );
        }
        tentarBG(0);
      });
    })();
  }

  // Cache de processos consultados via API (numero → { idProcesso, idTaskInstance, fila })
  var _agrProcessosCache = {};

  async function consultarProcessoAgrupador(numero) {
    if (_agrProcessosCache[numero]) return _agrProcessosCache[numero];
    for (var f = 0; f < FILAS.length; f++) {
      try {
        var url = API + '/recuperarProcessosTarefaPendenteComCriterios/' + encodeURIComponent(FILAS[f]) + '/false';
        var r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numeroProcesso: numero, classe: null, tags: [], page: 0, maxResults: 1, competencia: '' }) });
        if (!r.ok) continue;
        var data = await r.json();
        var ent = (data.entities || [])[0];
        if (ent && ent.idProcesso) {
          // idTaskInstance já vem na resposta — este é o newTaskId CORRETO
          // NÃO usar /tarefas — o 'id' de lá é ID da fila, não da task
          var result = { numero: numero, idProcesso: ent.idProcesso, idTaskInstance: ent.idTaskInstance || '', fila: FILAS[f], dataChegada: ent.dataChegada || null, ultimoMovimento: ent.ultimoMovimento || null };
          _agrProcessosCache[numero] = result;
          console.log('[consultarProcessoAgrupador] ' + numero + ': idProcesso=' + ent.idProcesso + ' | idTaskInstance=' + (ent.idTaskInstance || '') + ' | fila=' + FILAS[f].substring(0,40));
          return result;
        }
      } catch(e) {}
    }
    return null;
  }

  function mostrarToastAgr(msg, tipo) {
    var toast = document.createElement('div');
    var borderColor = tipo === 'success' ? '#10b981' : tipo === 'warning' ? '#f59e0b' : '#64748b';
    toast.style.cssText = 'position:fixed;top:24px;right:24px;z-index:2147483648;background:#fff;padding:14px 20px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);border-left:4px solid '+borderColor+';font-size:13px;font-weight:500;color:#334155;display:flex;align-items:center;gap:10px;animation:modalIn .25s ease';
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300); }, 3000);
  }

  async function infoDoProcesso(numero) {
    log('Consultando API para processo:', numero);
    for (const fila of FILAS) {
      const url = API + '/recuperarProcessosTarefaPendenteComCriterios/'
                + encodeURIComponent(fila) + '/false';
      const r = await fetch(url, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroProcesso: numero })
      });
      if (!r.ok) { warn('API retornou ' + r.status + ' para fila: ' + fila.substring(0, 30)); continue; }
      const data = await r.json();
      const ent = (data.entities || [])[0];
      if (ent && ent.idProcesso) {
        log('Processo encontrado: id=' + ent.idProcesso + ' fila=' + fila.substring(0, 40));
        return { id: ent.idProcesso, fila };
      }
    }
    throw new Error('Processo não encontrado em nenhuma fila');
  }

  function abrirTarefa(numero, idProcesso, fila) {
    const url = getTarefaUrl(idProcesso, fila);
    log('Abrindo tarefa em nova aba:', numero);
    window.open(url, '_blank');
  }

  function abrirEAutomatizar(numero, idProcesso, fila) {
    const isAlvara = _acaoAtual === 'alvara';

    let cfgObj;
    if (isAlvara) {
      cfgObj = { acao: 'alvara', numero, idProcesso, fila };
    } else {
      cfgObj = {
        acao: 'citar',
        ativo: true,
        polos: getPolosSelecionados(),
        tipo:  $('#pje-ci-tipo').value,
        meio:  $('#pje-ci-meio').value,
        prazo: $('#pje-ci-prazo').value,
        numero, idProcesso, fila
      };
    }

    const cfgStr = JSON.stringify(cfgObj);

    // Salva em chrome.storage.local (funciona cross-origin!)
    try {
      chrome.storage.local.set({ pje_ac_config: cfgObj }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[abrirEAutomatizar] chrome.storage falhou:', chrome.runtime.lastError.message);
        } else {
          log('💾 Config salva no chrome.storage.local (cross-origin OK)');
        }
      });
    } catch(e) {
      console.warn('[abrirEAutomatizar] chrome.storage indisponível:', e.message);
    }

    // Cookie como fallback (só funciona same-origin)
    try {
      document.cookie = 'pje_ac=' + encodeURIComponent(cfgStr) +
        ';path=/;domain=.tjce.jus.br;max-age=120;SameSite=Lax';
      log('📝 Cookie pje_ac setado (fallback)');
    } catch(e) {
      log('⚠ Cookie indisponível:', e.message);
    }

    const url = getTarefaUrl(idProcesso, fila);
    window.open(url, '_blank');
  }
