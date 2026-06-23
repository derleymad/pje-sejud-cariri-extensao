// ============================================================
// Auto Emitir Alvará Eletrônico — SAE
// Roda na página conteudo-tarefa E no iframe movimentar.seam
// Fluxo mais simples que o Citar/Intimar:
//   Encaminhar → Cumprir Determinações → Marcar checkbox → Prosseguir → Verificar
// ============================================================
(function() {
  // 🛡️ GUARD: NUNCA executa automação em abas de scan (abertas pelo background
  // worker só para ler HTML do PJe). O background.js marca essas abas com
  // o hash #pje-scan-tab na URL.
  if (window.location.hash.indexOf('pje-scan-tab') !== -1) {
    console.log('[Auto Alvará] 🛡️ Aba de scan detectada — automação DESATIVADA nesta aba.');
    return;
  }

  const href = window.location.href;
  const isMain = href.includes('conteudo-tarefa');
  const isFrame = href.includes('movimentar.seam');
  if (!isMain && !isFrame) return;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const log = (...a) => console.log('[Auto Alvará]', ...a);

  // Espera ATÉ o elemento existir (polling determinístico)
  async function ateExistir(sel, timeout, ctx) {
    const fim = Date.now() + (timeout || 20000);
    const doc = ctx || document;
    while (Date.now() < fim) {
      const el = typeof sel === 'function' ? sel(doc) : doc.querySelector(sel);
      if (el) return el;
      await wait(250);
    }
    return null;
  }

  // Espera ATÉ o elemento DESAPARECER do DOM (ou ficar hidden)
  async function ateDesaparecer(sel, timeout) {
    const fim = Date.now() + (timeout || 20000);
    while (Date.now() < fim) {
      const el = typeof sel === 'function' ? sel(document) : document.querySelector(sel);
      if (!el) return true;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
      await wait(80);
    }
    return false;
  }

  function clicar(el) {
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    try {
      el.click();
    } catch(e) {
      log('⚠ Erro ao clicar (ignorado): ' + e.message);
    }
    return true;
  }

  // ── Cookie cross-subdomain ──
  function setCookie(nome, valor) {
    document.cookie = nome + '=' + encodeURIComponent(valor) + ';path=/;domain=.tjce.jus.br;max-age=120;SameSite=Lax';
  }
  function getCookie(nome) {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + nome + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  // ══════════════════════════════════════════════════════════
  // MAIN: conteudo-tarefa → clica Encaminhar → Cumprir determinações
  // Mesma arquitetura postMessage do auto-citar.js
  // ══════════════════════════════════════════════════════════
  if (isMain) {

    const dentroDoNgFrame = (function() {
      try { return window.self !== window.top && window.top.location.href.includes('dev.seam'); } catch(e) { return true; }
    })();

    // ────────────────────────────────────────────────────────
    // LADO A: rodando DENTRO do ngFrame → escuta postMessage
    // ────────────────────────────────────────────────────────
    if (dentroDoNgFrame) {
      log('NGFRAME: aguardando comando de alvará via postMessage...');

      window.addEventListener('message', async function ngAlvaraHandler(e) {
        if (!e.data || e.data.pjeAutoAlvara !== true) return;
        const cfg = e.data.cfg;
        if (!cfg || cfg.acao !== 'alvara') return;

        // ⛔ Só executa UMA vez
        if (window._pjeAutoAlvaraDone) return;
        window._pjeAutoAlvaraDone = true;

        log('NGFRAME: comando alvará recebido!', cfg.numero);

        // Guarda config para o movimentar.seam (chrome.storage + cookie)
        setCookie('pje_ac', JSON.stringify(cfg));
        chrome.storage.local.set({ pje_ac_config: cfg }, () => {});

        // ── PASSO 1: Clicar Encaminhar ──
        log('NGFRAME: aguardando btnTransicoesTarefa...');
        let btn = null;
        for (let i = 0; i < 80; i++) {
          btn = document.querySelector('#btnTransicoesTarefa') ||
                document.querySelector('button[id*="btnTransicoesTarefa"]');
          if (btn && btn.offsetParent !== null) break;
          btn = null;
          await wait(250);
        }
        if (!btn) {
          log('NGFRAME ERRO: btnTransicoesTarefa não encontrado. ' + document.querySelectorAll('button').length + ' botões no DOM');
          return;
        }
        clicar(btn);
        log('NGFRAME: ✓ Encaminhar clicado');
        await wait(1000);

        // ── PASSO 2: Clicar "Cumprir determinações" no dropdown ──
        log('NGFRAME: aguardando dropdown Cumprir determinações...');
        let cumprirLink = null;
        for (let i = 0; i < 40; i++) {
          const todos = document.querySelectorAll(
            'a[id*="Transic"], .dropdown-menu a, [role="menu"] a, ' +
            'ul.dropdown-menu a, .dropdown a, .dropdown-menu li a, ' +
            'a.dropdown-item, [class*="dropdown"] a, ' +
            'button + ul a, button + div a, .show a, .open a'
          );
          for (const a of todos) {
            const txt = (a.textContent || '').trim().toLowerCase();
            if (txt.includes('cumprir') && txt.includes('determina')) {
              cumprirLink = a; break;
            }
          }
          if (cumprirLink) break;
          await wait(250);
        }
        if (cumprirLink) {
          clicar(cumprirLink);
          log('NGFRAME: ✓ Cumprir determinações clicado:', (cumprirLink.textContent || '').trim().substring(0, 50));
        } else {
          log('NGFRAME: ⚠ Cumprir determinações não encontrado no dropdown');
        }
      });

      // Fallback via cookie se o postMessage demorar
      setTimeout(async () => {
        let cfg;
        for (let i = 0; i < 10; i++) {
          const raw = getCookie('pje_ac');
          if (raw) { try { cfg = JSON.parse(raw); } catch(e) {} }
          if (cfg && cfg.acao === 'alvara') break;
          await wait(500);
        }
        if (cfg && cfg.acao === 'alvara') {
          log('NGFRAME: fallback alvará via cookie disparado');
          window.postMessage({ pjeAutoAlvara: true, cfg: cfg }, '*');
        }
      }, 3000);

      return; // ngFrame fica só escutando
    }

    // ────────────────────────────────────────────────────────
    // LADO B: TOP-LEVEL → lê cookie e envia postMessage ao ngFrame
    // ────────────────────────────────────────────────────────
    log('TOP-LEVEL: lendo cookie alvará e aguardando ngFrame...');

    (async function topLevelAlvaraFlow() {
      let cfg;
      // Tenta chrome.storage.local primeiro (cross-origin OK)
      try {
        const stored = await new Promise(resolve => {
          chrome.storage.local.get('pje_ac_config', resolve);
        });
        if (stored && stored.pje_ac_config && stored.pje_ac_config.acao === 'alvara') {
          cfg = stored.pje_ac_config;
          log('TOP-LEVEL alvará: config lida do chrome.storage.local ✅');
        }
      } catch(e) {
        log('TOP-LEVEL alvará: chrome.storage indisponível, tentando cookie...');
      }
      // Fallback: cookie
      if (!cfg) {
        for (let i = 0; i < 15; i++) {
          const raw = getCookie('pje_ac');
          if (raw) { try { cfg = JSON.parse(raw); } catch(e) {} }
          if (cfg && cfg.acao === 'alvara') break;
          await wait(500);
        }
      }
      // Limpa storage após leitura
      if (cfg) {
        chrome.storage.local.remove('pje_ac_config', () => {});
      }
      if (!cfg || cfg.acao !== 'alvara') return log('TOP-LEVEL: config de alvará não recebida (nem storage nem cookie)');
      log('TOP-LEVEL alvará:', cfg.numero);

      // Aguarda o ngFrame existir no DOM
      let ngFrame = null;
      for (let i = 0; i < 40; i++) {
        ngFrame = document.getElementById('ngFrame') || document.querySelector('iframe[id*="ngFrame"]');
        if (ngFrame) break;
        await wait(250);
      }
      if (!ngFrame) return log('TOP-LEVEL ERRO: ngFrame não encontrado');

      function enviarComando() {
        log('TOP-LEVEL: enviando comando alvará para ngFrame...');
        try {
          ngFrame.contentWindow.postMessage({ pjeAutoAlvara: true, cfg: cfg }, '*');
        } catch(e) {
          log('TOP-LEVEL ERRO ao enviar postMessage:', e.message);
        }
      }

      if (ngFrame.contentDocument && ngFrame.contentDocument.readyState === 'complete') {
        setTimeout(enviarComando, 500);
      } else {
        ngFrame.addEventListener('load', () => {
          log('TOP-LEVEL: ngFrame carregou, enviando comando alvará');
          setTimeout(enviarComando, 800);
        });
      }
    })();

    return;
  }

  // ══════════════════════════════════════════════════════════
  // IFRAME: movimentar.seam → marcar checkbox + prosseguir
  // ══════════════════════════════════════════════════════════
  log('IFRAME alvará carregado, aguardando config...');

  (async function iframeAlvaraFlow() {
    // Se a extensão foi desabilitada pelo toggle do popup, não executa a automação
    try {
      var en = await new Promise(function(resolve) { chrome.storage.local.get({ pje_enabled: true }, resolve); });
      if (en && en.pje_enabled === false) return log('⏸️ Extensão desabilitada — automação de alvará não executada');
    } catch(e) {}

    // ── Wrapper: usa o módulo de loadings se disponível ──
    async function aguardarLoading(timeout) {
      const t = timeout || 15000;
      if (window._pjeLoadings && window._pjeLoadings.aguardarRequisicoes) {
        return await window._pjeLoadings.aguardarRequisicoes(t);
      }
      if (window._pjeLoadings && window._pjeLoadings.aguardar) {
        return await window._pjeLoadings.aguardar(['richfacesMask'], t);
      }
      return await ateDesaparecer('#mpLoadingMovimentarDiv', t);
    }

    // Buffer de logs da automação
    const logsAutomacao = [];

    function logar(msg) {
      const ts = Date.now();
      logsAutomacao.push({ ts, msg });
      if (logsAutomacao.length > 50) logsAutomacao.shift();
      log(msg);
    }

    // Espera config via cookie (ngFrame seta no mesmo domínio)
    let cfg;
    try {
      const stored = await new Promise(resolve => {
        chrome.storage.local.get('pje_ac_config', resolve);
      });
      if (stored && stored.pje_ac_config && stored.pje_ac_config.acao === 'alvara') {
        cfg = stored.pje_ac_config;
        log('IFRAME alvará: config do storage');
      }
    } catch(e) {}
    if (!cfg) {
      for (let i = 0; i < 30; i++) {
        const raw = getCookie('pje_ac');
        if (raw) { try { cfg = JSON.parse(raw); } catch(e) {} }
        if (cfg && cfg.acao === 'alvara') break;
        await wait(500);
      }
    }
    if (!cfg || cfg.acao !== 'alvara') return log('ERRO: timeout esperando config de alvará');

    // ══ VERIFICAÇÃO DE SEGURANÇA ══
    const idProcessoPagina = extrairIdProcesso();
    const idProcessoCookie = cfg.idProcesso || cfg.numero || '';
    if (idProcessoPagina && idProcessoCookie) {
      if (String(idProcessoPagina) !== String(idProcessoCookie)) {
        log('⛔ ABORTANDO: idProcesso da página (' + idProcessoPagina +
            ') ≠ idProcesso do cookie (' + idProcessoCookie + ') — outra aba/processo!');
        return;
      }
      log('✓ Segurança OK: idProcesso ' + idProcessoPagina + ' confere');
    }

    // ── Captura de tela (JPEG qualidade 8%, via html2canvas injetado) ──
    var _html2canvasReady = false;
    var _html2canvasLoader = null;

    function carregarHtml2canvas() {
      if (_html2canvasLoader) return _html2canvasLoader;
      _html2canvasLoader = new Promise(function(resolve) {
        if (typeof html2canvas !== 'undefined') {
          _html2canvasReady = true;
          log('✓ html2canvas já disponível (content script)');
          resolve(true);
          return;
        }
        try {
          var script = document.createElement('script');
          script.src = chrome.runtime.getURL('automata/comum/html2canvas.min.js');
          script.onload = function() {
            _html2canvasReady = true;
            log('✓ html2canvas carregado via tag <script>');
            resolve(true);
          };
          script.onerror = function() {
            log('⚠ Falha ao carregar html2canvas via tag <script>');
            resolve(false);
          };
          (document.head || document.documentElement).appendChild(script);
        } catch(e) {
          log('⚠ Erro ao injetar html2canvas:', e.message);
          resolve(false);
        }
      });
      return _html2canvasLoader;
    }

    carregarHtml2canvas();

    async function capturarTela() {
      if (!_html2canvasReady) {
        await carregarHtml2canvas();
        if (!_html2canvasReady) return null;
      }
      try {
        var canvas = await html2canvas(document.body, {
          scale: 0.35,
          logging: false,
          allowTaint: true,
          useCORS: true,
          backgroundColor: '#fff'
        });
        var dataUrl = canvas.toDataURL('image/jpeg', 0.08);
        log('📸 Screenshot capturado: ' + Math.round(dataUrl.length / 1024) + 'KB');
        return dataUrl;
      } catch(e) {
        log('⚠ Erro ao capturar tela:', e.message);
        return null;
      }
    }

    // ── Sincronização de progresso + screenshots via localStorage (GLOBAL, cross-frame) ──
    const idProgress = idProcessoPagina || (cfg && (cfg.idProcesso || cfg.numero)) || '';
    let progressInterval = null;
    if (idProgress) {
      const STORAGE_SS_KEY = 'pje-ss-' + idProgress;
      const enviarProgresso = async () => {
        try {
          var tela = await capturarTela();
          var info = { logs: logsAutomacao.slice() };
          if (tela) info.screenshot = tela;
          const payload = {
            key: 'pje-ac-progress-' + idProgress, status: 'progress',
            idProcesso: idProgress, info: info, ts: Date.now()
          };
          if (!window._pjeKanbanChannel) window._pjeKanbanChannel = new BroadcastChannel('pje-kanban');
          window._pjeKanbanChannel.postMessage(payload);
          localStorage.setItem('pje-ac-progress-' + idProgress, JSON.stringify(payload));
          // Canal 4: chrome.storage.local (cross-origin! cnj.cloud ↔ pje.tjce.jus.br)
          // Único canal que cruza origens — sem ele, o kanban no frontend Angular não
          // recebe progresso em tempo real (cards/logs só atualizam no done/fail final).
          try {
            const sigKey = 'pje-kanban-signal-progress-' + idProgress;
            chrome.storage.local.set({ [sigKey]: payload }, () => {
              if (chrome.runtime.lastError) log('⚠ chrome.storage progress: ' + chrome.runtime.lastError.message);
            });
          } catch(e) {}
          // Armazena screenshots em localStorage + postMessage cross-origin
          if (tela) {
            var ssEntry = { data: tela, ts: Date.now(), label: (logsAutomacao.length ? logsAutomacao[logsAutomacao.length-1].msg : '').substring(0, 60) };
            var ssList = [];
            try { ssList = JSON.parse(localStorage.getItem(STORAGE_SS_KEY) || '[]'); } catch(e) {}
            if (ssList.length >= 20) ssList.shift();
            ssList.push(ssEntry);
            localStorage.setItem(STORAGE_SS_KEY, JSON.stringify(ssList));
            try {
              var ssMsg = { pjeSsStore: true, idProcesso: idProgress, entry: ssEntry };
              if (window.parent && window.parent !== window) window.parent.postMessage(ssMsg, '*');
              window.postMessage(ssMsg, '*');
            } catch(e) {}
            log('📸 Screenshot armazenado no localStorage (' + ssList.length + ' total, ' + Math.round(tela.length/1024) + 'KB)');
          }
        } catch(e) {}
      };
      enviarProgresso();
      progressInterval = setInterval(enviarProgresso, 2000);
    }

    log('Iniciando fluxo alvará:', cfg.numero);
    logar('🚀 Automação de Alvará iniciada — ' + cfg.numero);

    // Aguarda página JSF pronta
    await aguardarPaginaPronta();

    // ══ PASSO 1: Marcar checkbox "Emitir alvará eletrônico - SAE" ══
    const CHECKBOX_LABEL = 'Emitir alvará eletrônico - SAE';

    log('🔍 Procurando checkbox: "' + CHECKBOX_LABEL + '"...');
    const checkboxMarcado = await marcarCheckboxPorLabel(CHECKBOX_LABEL);

    if (!checkboxMarcado) {
      log('⛔ ERRO: Checkbox de alvará não encontrado!');
      logar('⛔ Checkbox "' + CHECKBOX_LABEL + '" não encontrado no iframe');

      // Sinaliza falha
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
      sinalizarKanban(idProgress, 'fail', { erro: 'Checkbox de alvará não encontrado' });
      setCookie('pje_ac', '');
      try { window.close(); } catch(e) {}
      return;
    }
    log('✓ Checkbox marcado!');
    logar('✅ Checkbox "' + CHECKBOX_LABEL + '" marcado');

    // Aguarda loading sumir após marcar checkbox
    await aguardarLoading(5000);
    await wait(400);

    // ══ PASSO 2: Clicar "01 - Prosseguir nas opções selecionadas" ══
    log('🔍 Procurando botão "Prosseguir nas opções selecionadas"...');
    const prosseguirOk = await clicarProsseguirOpcoes();

    if (!prosseguirOk) {
      log('⛔ ERRO: Botão "Prosseguir nas opções selecionadas" não encontrado!');
      logar('⛔ Botão "Prosseguir" não encontrado');

      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
      sinalizarKanban(idProgress, 'fail', { erro: 'Botão Prosseguir não encontrado' });
      setCookie('pje_ac', '');
      try { window.close(); } catch(e) {}
      return;
    }
    log('✓ Prosseguir clicado!');
    logar('➡️ Prosseguindo nas opções selecionadas');

    // Aguarda o fluxo concluir (loading + transição)
    await aguardarLoading(10000);
    await wait(2000);

    // ══ VERIFICAÇÃO PÓS-ALVARÁ: confirmar fila final ══
    const FILA_FINAL_ALVARA = '[Sec] - Expediente - CERTIFICAR EXPEDIÇÃO DE ALVARÁ ELETRÔNICO';

    const idConcluido = cfg.idProcesso || extrairIdProcesso();
    const numeroProcesso = cfg.numero || '';

    if (idConcluido && numeroProcesso) {
      log('🔍 Verificando fila pós-alvará para ' + numeroProcesso + '...');

      // Aguarda um pouco mais para o PJe processar a movimentação
      await wait(3000);

      const resultadoFila = await verificarFilaAtual(numeroProcesso, FILA_FINAL_ALVARA);
      const infoFila = {
        fila: resultadoFila.fila,
        filaOk: resultadoFila.ok,
        filas: resultadoFila.filas || []
      };

      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }

      if (resultadoFila.ok) {
        logar('✅ Alvará confirmado na fila: ' + resultadoFila.fila);
        sinalizarKanban(idConcluido, 'done', infoFila);
        log('✓ Sinalizado conclusão para kanban: ' + idConcluido + ' — fila: ' + resultadoFila.fila);
      } else {
        log('⚠ Processo não encontrado na fila final esperada: ' + resultadoFila.fila);
        logar('⚠️ Alvará emitido mas processo em fila: ' + resultadoFila.fila);
        // Ainda sinaliza como concluído (o alvará foi emitido), mas com warning
        sinalizarKanban(idConcluido, 'done', infoFila);
        log('✓ Sinalizado conclusão (com warning de fila): ' + idConcluido);
      }
    } else if (idConcluido) {
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
      sinalizarKanban(idConcluido, 'done', {});
      log('✓ Sinalizado conclusão para kanban: ' + idConcluido);
    }

    // Limpa o cookie
    setCookie('pje_ac', '');
    log('FLUXO ALVARÁ CONCLUÍDO!');
  })();

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════

  // ── Marca checkbox encontrando o label pelo texto ──
  // Referência: PJe_automata utils/checkbox.py marcar_checkbox_por_label()
  async function marcarCheckboxPorLabel(textoLabel) {
    // Estratégia 1: Procura <label> contendo o texto e clica nele
    // O PJe usa <label> para os checkboxes, e clicar no label já marca o checkbox
    for (let tentativa = 0; tentativa < 15; tentativa++) {
      if (tentativa > 0) await wait(1000);

      const labels = document.querySelectorAll('label');
      for (const lbl of labels) {
        const txt = (lbl.textContent || '').trim();
        if (txt.toLowerCase().includes(textoLabel.toLowerCase())) {
          // Verifica se está visível
          if (lbl.offsetParent === null) continue;
          clicar(lbl);
          log('✅ Clicou no label: "' + txt.substring(0, 80) + '"');
          await wait(500);
          return true;
        }
      }

      // Estratégia 2: Procura span/texto próximo a um checkbox
      const spans = document.querySelectorAll('span, td, div');
      for (const el of spans) {
        const txt = (el.textContent || '').trim();
        if (txt.toLowerCase().includes(textoLabel.toLowerCase()) && txt.length < 120) {
          // Tenta encontrar o checkbox ou label associado
          const checkbox = el.querySelector('input[type="checkbox"]');
          if (checkbox) {
            clicar(checkbox);
            log('✅ Clicou no checkbox dentro de elemento com texto: "' + txt.substring(0, 80) + '"');
            await wait(500);
            return true;
          }
          // Tenta clicar no label pai
          const parentLabel = el.closest('label');
          if (parentLabel) {
            clicar(parentLabel);
            log('✅ Clicou no label pai: "' + txt.substring(0, 80) + '"');
            await wait(500);
            return true;
          }
        }
      }
    }

    log('⚠ Label "' + textoLabel + '" não encontrado após 15 tentativas');
    return false;
  }

  // ── Clica no botão "Prosseguir nas opções selecionadas" ──
  // Referência: PJe_automata bot_alvara.py etapa_prosseguir()
  async function clicarProsseguirOpcoes() {
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      if (tentativa > 0) await wait(1000);

      // Procura botões com texto "Prosseguir"
      const botoes = document.querySelectorAll(
        'input[type="submit"], input[type="button"], button, a.btn, a[onclick]'
      );
      for (const btn of botoes) {
        const txt = (btn.value || btn.textContent || '').trim();
        if (txt.toLowerCase().includes('prosseguir') && txt.toLowerCase().includes('opç')) {
          if (btn.offsetParent !== null) {
            clicar(btn);
            log('✅ Clicou em: "' + txt.substring(0, 80) + '"');
            await wait(1000);
            return true;
          }
        }
      }

      // Fallback: procura qualquer elemento com texto "Prosseguir"
      const todos = document.querySelectorAll('a, button, input');
      for (const el of todos) {
        const txt = (el.value || el.textContent || '').trim().toLowerCase();
        if (txt.includes('prosseguir')) {
          if (el.offsetParent !== null) {
            clicar(el);
            log('✅ Fallback: clicou em "' + txt.substring(0, 80) + '"');
            await wait(1000);
            return true;
          }
        }
      }
    }

    log('⚠ Botão "Prosseguir nas opções selecionadas" não encontrado');
    return false;
  }

  // ── Helper: verifica fila atual do processo ──
  // Similar ao auto-citar.js mas com FILA_FINAL específica do alvará
  async function verificarFilaAtual(numeroProcesso, filaFinalEsperada) {
    var apiHost = (window.PJE_CONFIG && window.PJE_CONFIG.getApiHost()) || window.location.origin;
    var url = (window.PJE_CONFIG && window.PJE_CONFIG.getEndpoint('verificarFila'))
              || (apiHost + '/pje1grau/seam/resource/rest/pje-legacy/painelUsuario/tarefas');
    log('🔍 Consultando fila atual do processo ' + numeroProcesso + '...');
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      if (tentativa > 0) await wait(4000);
      try {
        const resp = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'x-pje-legacy-app': 'pje-tjce-1g'
          },
          body: JSON.stringify({ numeroProcesso, competencia: '', etiquetas: [] })
        });
        if (!resp.ok) { log('  ⚠ API retornou ' + resp.status + ' (tentativa ' + (tentativa+1) + '/6)'); continue; }
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) { log('  ⚠ Nenhuma fila retornada'); continue; }

        const filasEncontradas = data.map(f => f.nome || f.get?.('nome') || '');
        log('  📋 Filas: ' + JSON.stringify(filasEncontradas));

        // Verifica se está na fila final do alvará
        const filaFinal = filasEncontradas.find(nome =>
          nome.toUpperCase().includes(filaFinalEsperada.toUpperCase())
        );
        if (filaFinal) {
          log('  ✓ Processo na fila esperada: ' + filaFinal);
          return { ok: true, fila: filaFinal };
        }
        const filaAtual = filasEncontradas[0] || 'desconhecida';
        log('  ⚠ Processo NÃO está na fila final. Fila atual: ' + filaAtual);
        return { ok: false, fila: filaAtual, filas: filasEncontradas };
      } catch(e) {
        log('  ⚠ Erro ao consultar API: ' + e.message);
      }
    }
    log('  ⛔ Timeout consultando fila após 6 tentativas');
    return { ok: false, fila: 'timeout', filas: [] };
  }

  // ── Helper: sinaliza status para o kanban ──
  function sinalizarKanban(idProcesso, status, info) {
    const ts = Date.now();
    const payloadInfo = Object.assign({}, info, { logs: logsAutomacao.slice() });

    // Canal 1: localStorage
    try {
      const key = 'pje-ac-' + status + '-' + idProcesso;
      localStorage.setItem(key, JSON.stringify({ status, idProcesso, info: payloadInfo, ts }));
      log('  📡 Sinalizado via localStorage: ' + key);
    } catch(e) {}

    // Canal 2: cookie
    try {
      const cookieVal = encodeURIComponent(JSON.stringify({ status, idProcesso, info: payloadInfo, ts }));
      document.cookie = 'pje_ac_status_' + idProcesso + '=' + cookieVal +
        ';path=/;domain=.tjce.jus.br;max-age=120;SameSite=Lax';
      log('  📡 Sinalizado via cookie: pje_ac_status_' + idProcesso);
    } catch(e) {}

    // Canal 3: BroadcastChannel
    try {
      if (!window._pjeKanbanChannel) {
        window._pjeKanbanChannel = new BroadcastChannel('pje-kanban');
      }
      window._pjeKanbanChannel.postMessage({
        key: 'pje-ac-' + status + '-' + idProcesso, status, idProcesso, info: payloadInfo, ts
      });
      log('  📡 Sinalizado via BroadcastChannel: pje-ac-' + status + '-' + idProcesso);
    } catch(e) {}
  }

  // ── Helper: extrai idProcesso da URL ──
  function extrairIdProcesso() {
    const h = window.location.href;
    let m = h.match(/conteudo-tarefa\/(\d+)/);
    if (m) return m[1];
    m = h.match(/[?&]idProcesso=(\d+)/i);
    if (m) return m[1];
    try {
      const frameEl = window.frameElement;
      if (frameEl) {
        const src = frameEl.getAttribute('src') || '';
        m = src.match(/[?&]idProcesso=(\d+)/i);
        if (m) return m[1];
      }
    } catch(e) {}
    return null;
  }

  // ── Helper: aguarda página JSF estar pronta ──
  async function aguardarPaginaPronta() {
    log('Verificando prontidão da página JSF...');
    const inicio = Date.now();
    const timeout = 30000;

    while (Date.now() - inicio < timeout) {
      // ViewState presente
      const vs = document.querySelector('input[name="javax.faces.ViewState"]');
      if (!vs || !vs.value) { await wait(200); continue; }

      // Pelo menos um checkbox ou label visível na página
      const algumLabel = document.querySelector('label');
      if (!algumLabel) { await wait(200); continue; }

      log('Página JSF pronta em ' + (Date.now() - inicio) + 'ms');
      return true;
    }

    log('⚠ Página JSF não ficou pronta em 30s');
    return false;
  }
})();
