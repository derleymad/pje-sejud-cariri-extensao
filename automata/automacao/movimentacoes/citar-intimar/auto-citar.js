// ============================================================
// Auto Citar/Intimar
// Roda na página conteudo-tarefa E no iframe movimentar.seam
// Cada passo só avança quando o elemento É ENCONTRADO no DOM
// ============================================================
(function() {
  // 🛡️ GUARD: NUNCA executa automação em abas de scan (abertas pelo background
  // worker só para ler HTML do PJe). Essas abas carregam movimentar.seam e
  // disparavam o fluxo completo de citação — assinando o processo errado!
  // O background.js marca essas abas com o hash #pje-scan-tab na URL.
  if (window.location.hash.indexOf('pje-scan-tab') !== -1) {
    console.log('[Auto Citar] 🛡️ Aba de scan detectada — automação DESATIVADA nesta aba.');
    return;
  }

  const href = window.location.href;
  const isMain = href.includes('conteudo-tarefa');
  const isFrame = href.includes('movimentar.seam');
  if (!isMain && !isFrame) return;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const log = (...a) => console.log('[Auto Citar]', ...a);

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

  // Espera ATÉ o elemento existir E ter pelo menos N filhos dentro dele
  async function ateTerFilhos(selPai, selFilho, minFilhos, timeout) {
    const fim = Date.now() + (timeout || 20000);
    minFilhos = minFilhos || 1;
    while (Date.now() < fim) {
      const pai = typeof selPai === 'function' ? selPai(document) : document.querySelector(selPai);
      if (pai) {
        const filhos = pai.querySelectorAll(selFilho);
        if (filhos.length >= minFilhos) return filhos;
      }
      await wait(300);
    }
    return null;
  }

  // Espera ATÉ o elemento DESAPARECER do DOM (ou ficar hidden)
  async function ateDesaparecer(sel, timeout) {
    const fim = Date.now() + (timeout || 20000);
    while (Date.now() < fim) {
      const el = typeof sel === 'function' ? sel(document) : document.querySelector(sel);
      if (!el) return true; // não existe mais no DOM
      // Verifica se está invisível (display:none, visibility:hidden, ou z-index negativo)
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
      await wait(80); // polling rápido (mesmo ritmo do loadings.js)
    }
    return false; // timeout
  }

  function clicar(el) {
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    try {
      el.click();
    } catch(e) {
      // Erros da página (ex: abrirPopUpRecibo is not defined) não
      // devem interromper nosso fluxo — o click já foi disparado.
      log('⚠ Erro ao clicar (ignorado): ' + e.message);
    }
    return true;
  }

  // Normaliza texto: remove acentos e lowercase (equivalente ao unicodedata.normalize('NFKD') do Python)
  function normalizarTexto(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // ── Cookie cross-subdomain (compartilhado entre *.tjce.jus.br) ──
  function setCookie(nome, valor) {
    document.cookie = nome + '=' + encodeURIComponent(valor) + ';path=/;domain=.tjce.jus.br;max-age=120;SameSite=Lax';
  }
  function getCookie(nome) {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + nome + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  // ══════════════════════════════════════════════════════════
  // MAIN: conteudo-tarefa → clica Encaminhar → Citar/Intimar
  //
  // ARQUITETURA: o top-level (dev.seam) contém um iframe#ngFrame
  // (pje-front-cp.tjce.jus.br) que é cross-origin. O top-level
  // NÃO pode acessar o DOM do ngFrame, e o ngFrame pode não
  // receber cookies (SameSite). Solução: postMessage.
  //
  // Fluxo:
  //   Top-level → lê cookie pje_ac → envia cfg via postMessage
  //   ngFrame   → escuta postMessage → executa os cliques
  // ══════════════════════════════════════════════════════════
  if (isMain) {

    // Detecta se estamos dentro do ngFrame ou no top-level
    const dentroDoNgFrame = (function() {
      try { return window.self !== window.top && window.top.location.href.includes('dev.seam'); } catch(e) { return true; }
    })();

    // ────────────────────────────────────────────────────────
    // LADO A: rodando DENTRO do ngFrame → escuta postMessage
    // ────────────────────────────────────────────────────────
    if (dentroDoNgFrame) {
      log('NGFRAME: aguardando comando via postMessage...');

      window.addEventListener('message', async function ngHandler(e) {
        if (!e.data || e.data.pjeAutoCitar !== true) return;
        const cfg = e.data.cfg;
        if (!cfg || (!cfg.polo && (!cfg.polos || !cfg.polos.length))) {
          if (cfg && cfg.acao && cfg.acao !== 'citar') return; // ação é alvará, ignora
          return;
        }

        // ⛔ Só executa UMA vez — evita reexecução pelos retries do top-level
        if (window._pjeAutoCitarDone) return;
        window._pjeAutoCitarDone = true;

        log('NGFRAME: comando recebido!', cfg.polos || cfg.polo, cfg.tipo, cfg.meio, cfg.prazo);

        // Guarda config para o movimentar.seam (chrome.storage + cookie)
        setCookie('pje_ac', JSON.stringify(cfg));
        chrome.storage.local.set({ pje_ac_config: cfg }, () => {
          log('NGFRAME: config salva no storage para IFRAME');
        });

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

        // ── PASSO 2: Clicar "Citar/Intimar" no dropdown ──
        log('NGFRAME: aguardando dropdown Citar/Intimar...');
        let citarIntimar = null;
        for (let i = 0; i < 40; i++) {
          const todos = document.querySelectorAll(
            'a[id*="Transic"], .dropdown-menu a, [role="menu"] a, ' +
            'ul.dropdown-menu a, .dropdown a, .dropdown-menu li a, ' +
            'a.dropdown-item, [class*="dropdown"] a, ' +
            'button + ul a, button + div a, .show a, .open a'
          );
          for (const a of todos) {
            const txt = (a.textContent || '').trim().toLowerCase();
            if (txt.includes('citar') && txt.includes('intimar')) {
              citarIntimar = a; break;
            }
          }
          // Fallback: "Citar" ou "Intimar"
          if (!citarIntimar) {
            for (const a of todos) {
              const txt = (a.textContent || '').trim().toLowerCase();
              if (txt === 'citar/intimar' || txt.includes('citar')) {
                citarIntimar = a; break;
              }
            }
          }
          if (citarIntimar) break;
          await wait(250);
        }
        if (citarIntimar) {
          clicar(citarIntimar);
          log('NGFRAME: ✓ Citar/Intimar clicado:', (citarIntimar.textContent || '').trim().substring(0, 50));
        } else {
          log('NGFRAME: ⚠ Citar/Intimar não encontrado no dropdown');
        }
      });

      // Também tenta via cookie se o postMessage demorar (fallback)
      setTimeout(async () => {
        let cfg;
        for (let i = 0; i < 10; i++) {
          const raw = getCookie('pje_ac');
          if (raw) { try { cfg = JSON.parse(raw); } catch(e) {} }
          if (cfg && cfg.acao && cfg.acao !== 'citar') { cfg = null; break; } // ação é alvará, ignora
          if (cfg && (cfg.polo || (cfg.polos && cfg.polos.length))) break;
          await wait(500);
        }
        if (cfg && cfg.polo) {
          log('NGFRAME: fallback via cookie disparado');
          window.postMessage({ pjeAutoCitar: true, cfg: cfg }, '*');
        }
      }, 3000);

      return; // ngFrame fica só escutando
    }

    // ────────────────────────────────────────────────────────
    // LADO B: TOP-LEVEL → lê cookie e envia postMessage ao ngFrame
    // ────────────────────────────────────────────────────────
    log('TOP-LEVEL: lendo cookie e aguardando ngFrame...');

    (async function topLevelFlow() {
      // Lê config PRIMEIRO do chrome.storage.local (cross-origin OK)
      // Depois fallback para cookie (same-origin)
      let cfg;
      try {
        const stored = await new Promise(resolve => {
          chrome.storage.local.get('pje_ac_config', resolve);
        });
        if (stored && stored.pje_ac_config) {
          cfg = stored.pje_ac_config;
          log('TOP-LEVEL: config lida do chrome.storage.local ✅');
        }
      } catch(e) {
        log('TOP-LEVEL: chrome.storage indisponível, tentando cookie...');
      }

      // Fallback: cookie
      if (!cfg) {
        for (let i = 0; i < 15; i++) {
          const raw = getCookie('pje_ac');
          if (raw) { try { cfg = JSON.parse(raw); } catch(e) {} }
          if (cfg && (cfg.polo || (cfg.polos && cfg.polos.length))) break;
          await wait(500);
        }
      }

      // Limpa storage após leitura (evita reuso em outra aba)
      if (cfg) {
        chrome.storage.local.remove('pje_ac_config', () => {});
      }

      if (!cfg || (!cfg.polo && (!cfg.polos || !cfg.polos.length))) {
        if (cfg && cfg.acao && cfg.acao !== 'citar') return log('TOP-LEVEL: config é para ação ' + cfg.acao + ' — ignorando');
        return log('TOP-LEVEL: config não recebida (nem storage nem cookie)');
      }
      log('TOP-LEVEL:', cfg.polos || cfg.polo, cfg.tipo, cfg.meio, cfg.prazo);

      // Aguarda o ngFrame existir no DOM
      let ngFrame = null;
      for (let i = 0; i < 40; i++) {
        ngFrame = document.getElementById('ngFrame') || document.querySelector('iframe[id*="ngFrame"]');
        if (ngFrame) break;
        await wait(250);
      }
      if (!ngFrame) return log('TOP-LEVEL ERRO: ngFrame não encontrado');

      // Envia o comando UMA ÚNICA VEZ após o ngFrame estar carregado.
      // Nada de retries — se o ngFrame recarregar, os retries causariam
      // re-execução do fluxo, matando a instância do movimentar.seam.
      function enviarComando() {
        log('TOP-LEVEL: enviando comando para ngFrame...');
        try {
          ngFrame.contentWindow.postMessage({ pjeAutoCitar: true, cfg: cfg }, '*');
        } catch(e) {
          log('TOP-LEVEL ERRO ao enviar postMessage:', e.message);
        }
      }

      if (ngFrame.contentDocument && ngFrame.contentDocument.readyState === 'complete') {
        // ngFrame já carregou
        setTimeout(enviarComando, 500);
      } else {
        ngFrame.addEventListener('load', () => {
          log('TOP-LEVEL: ngFrame carregou, enviando comando');
          setTimeout(enviarComando, 800);
        });
      }
    })();

    return;
  }

  // ══════════════════════════════════════════════════════════
  // IFRAME: movimentar.seam → formulário JSF
  // ══════════════════════════════════════════════════════════
  log('IFRAME carregado, aguardando config...');

  (async function iframeFlow() {
    // Se a extensão foi desabilitada pelo toggle do popup, não executa a automação
    try {
      var en = await new Promise(function(resolve) { chrome.storage.local.get({ pje_enabled: true }, resolve); });
      if (en && en.pje_enabled === false) return log('⏸️ Extensão desabilitada — automação de citação não executada');
    } catch(e) {}

    // ── Wrapper: usa o módulo de loadings se disponível ──
    async function aguardarLoading(timeout) {
      const t = timeout || 15000;

      // Estratégia principal: espera requisições de rede (XHR/fetch) terminarem.
      // O network-monitor.js (MAIN world) expõe o contador em data-pje-pending.
      // MUITO mais confiável que checar máscara visual (que o RichFaces
      // esconde com z-index:-1 e nunca remove do DOM).
      if (window._pjeLoadings && window._pjeLoadings.aguardarRequisicoes) {
        return await window._pjeLoadings.aguardarRequisicoes(t);
      }

      // Fallback: verifica máscara visual (menos confiável)
      if (window._pjeLoadings && window._pjeLoadings.aguardar) {
        return await window._pjeLoadings.aguardar(['richfacesMask'], t);
      }

      // Fallback último: ateDesaparecer direto
      return await ateDesaparecer('#mpLoadingMovimentarDiv', t);
    }
    // Referência global para helpers (evita problemas de escopo em funções aninhadas)
    window._aguardarLoading = aguardarLoading;

    // Buffer de logs da automação (precisa ser antes de qualquer logar())
    const logsAutomacao = [];

    // Espera config via cookie (já setado pelo ngFrame, same-origin)
    let cfg;
    // Tenta chrome.storage.local como fallback extra
    try {
      const stored = await new Promise(resolve => {
        chrome.storage.local.get('pje_ac_config', resolve);
      });
      if (stored && stored.pje_ac_config) {
        cfg = stored.pje_ac_config;
        log('IFRAME: config do storage:', cfg.polos || cfg.polo);
      }
    } catch(e) {}
    // Cookie como principal (ngFrame seta no mesmo domínio)
    if (!cfg) {
      for (let i = 0; i < 30; i++) {
        const raw = getCookie('pje_ac');
        if (raw) { try { cfg = JSON.parse(raw); } catch(e) {} }
        if (cfg && (cfg.polo || (cfg.polos && cfg.polos.length))) break;
        await wait(500);
      }
    }
    if (!cfg || (!cfg.polo && (!cfg.polos || !cfg.polos.length))) {
      // Se for alvará ou outra ação, não executa o fluxo de citar
      if (cfg && cfg.acao && cfg.acao !== 'citar') return log('Config é para ação ' + cfg.acao + ' — ignorando no auto-citar');
      return log('ERRO: timeout esperando config');
    }

    // ══ VERIFICAÇÃO DE SEGURANÇA (RÍGIDA) ══
    // Impede cross-tab contamination: se a config pertence a OUTRO processo,
    // aborta IMEDIATAMENTE. Antes era "branda" (só logava) e a automação
    // rodava em abas erradas — assinando documentos do processo errado!
    const idProcessoPagina = extrairIdProcesso();
    const idProcessoConfig = cfg.idProcesso || cfg.numero || '';
    if (idProcessoPagina && idProcessoConfig && String(idProcessoPagina) !== String(idProcessoConfig)) {
      log('⛔ ABORTANDO: config é de outro processo (' + idProcessoConfig + ' ≠ página=' + idProcessoPagina + '). Não posso automatizar o processo errado.');
      logar('⛔ Abortado: configuração é de outro processo.');
      // NÃO limpa o cookie/storage — pertence à aba legítima.
      // Sinaliza falha para o kanban (se houver) para que o job não fique pendente.
      try { sinalizarKanban(idProcessoConfig, 'fail', { erro: 'Aborted: config é de outro processo (cross-tab guard)' }); } catch(e) {}
      return;
    }
    if (idProcessoPagina && idProcessoConfig && String(idProcessoPagina) === String(idProcessoConfig)) {
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
      if (!_html2canvasReady) { await carregarHtml2canvas(); if (!_html2canvasReady) return null; }
      try {
        var canvas = await html2canvas(document.body, {
          scale: 0.35, logging: false, allowTaint: true, useCORS: true, backgroundColor: '#fff'
        });
        return canvas.toDataURL('image/jpeg', 0.08);
      } catch(e) { return null; }
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
          // Canal 1: BroadcastChannel
          if (!window._pjeKanbanChannel) window._pjeKanbanChannel = new BroadcastChannel('pje-kanban');
          window._pjeKanbanChannel.postMessage(payload);
          // Canal 2: localStorage progress
          localStorage.setItem('pje-ac-progress-' + idProgress, JSON.stringify(payload));
          // Canal 4: chrome.storage.local (cross-origin! cnj.cloud ↔ pje.tjce.jus.br)
          // Único canal que cruza origens — sem ele, o kanban no frontend Angular (cnj.cloud)
          // NÃO recebe progresso em tempo real: cards e logs só atualizam no done/fail final.
          try {
            const sigKey = 'pje-kanban-signal-progress-' + idProgress;
            chrome.storage.local.set({ [sigKey]: payload }, () => {
              if (chrome.runtime.lastError) log('⚠ chrome.storage progress: ' + chrome.runtime.lastError.message);
            });
          } catch(e) {}
          // Canal 3: localStorage screenshots + postMessage cross-origin
          if (tela) {
            var ssEntry = { data: tela, ts: Date.now(), label: (logsAutomacao.length ? logsAutomacao[logsAutomacao.length-1].msg : '').substring(0, 60) };
            // Salva no localStorage desta origem (pje-treinamento-release)
            var ssList = [];
            try { ssList = JSON.parse(localStorage.getItem(STORAGE_SS_KEY) || '[]'); } catch(e) {}
            if (ssList.length >= 20) ssList.shift();
            ssList.push(ssEntry);
            localStorage.setItem(STORAGE_SS_KEY, JSON.stringify(ssList));
            // Envia via postMessage para frames pai (pje-front-cp) — cross-origin!
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
      progressInterval = setInterval(enviarProgresso, 5000);
    }

    // NÃO limpa o cookie aqui! Se a página recarregar durante o fluxo,
    // precisamos do cookie para reexecutar. Só limpa no final.

    // Suporta formato antigo (polo: string) e novo (polos: array)
    const polos = cfg.polos || (cfg.polo ? [cfg.polo] : ['passivo']);
    let tipoAto = cfg.tipo  || 'intimar';
    let meioCom = cfg.meio  || 'sistema';
    const prazo  = cfg.prazo || 15;

    // Ministério Público: força intimar + sistema (igual Python bot_citar.py linha 74-76)
    if (polos.includes('ministerio_publico')) {
      tipoAto = 'intimar';
      meioCom = 'sistema';
      log('🔒 MP detectado nos polos: forçando intimar + sistema (igual Python)');
    }

    log('Iniciando fluxo:', { polos, tipoAto, meioCom, prazo });
    logar('🚀 Automação iniciada — ' + polos.length + ' polo(s), ' + tipoAto + ', ' + meioCom + ', prazo ' + prazo + 'd');

    // Aguarda página JSF estar REALMENTE pronta (RichFaces, A4J, ViewState)
    await aguardarPaginaPronta();

    // ══ PASSO 1: Selecionar polo(s) na árvore de partes ══
    // O clique em "Citar/Intimar" no dropdown já trouxe direto
    // pra wizard "Escolher destinatários".
    // Suporta múltiplos polos (ex: [ativo, passivo, ministerio_publico])
    for (const polo of polos) {
      log('Aguardando polo ' + polo + '...');

      // ── Ministério Público: fluxo via CNPJ (autocomplete), NÃO via árvore ──
      // Referência: Python bot_citar.py etapa_selecionar_polo (linhas 182-191)
      //            e pje_actions.py preencher_destinatario_mp (linhas 1362-1518)
      if (polo === 'ministerio_publico') {
        log('🔍 MP detectado: usando CNPJ 06.928.790/0001-56 via autocomplete...');
        const mpOk = await preencherDestinatarioMP();
        if (!mpOk) {
          log('⛔ ERRO: Falha ao preencher destinatário do MP');
          continue;
        }
        log('✓ Destinatário MP selecionado!');

        // Espera loading sumir após autocomplete + procuradoria
        await (window._aguardarLoading || aguardarLoading)(10000);
        await wait(400);

        // Verifica se a tabela carregou
        const temLinhas = await ateTerFilhos('[id*="destinatariosTable"]', 'tr.rich-table-row', 1, 15000);
        if (!temLinhas) {
          log('⚠ Destinatários MP não carregaram (timeout 15s)');
        } else {
          log('✓ Tabela carregada com ' + temLinhas.length + ' linha(s) após preencher MP');
          await wait(500);
        }
        continue; // MP já foi preenchido, pula resto do loop de polo normal
      }

      const nomePolo = polo === 'passivo' ? 'Polo passivo' : 'Polo ativo';
      const linkPolo = await ateExistir(() => {
        return $$('.selecao-partes a, [id*="partes"] a, [id*="polo"] a, .rich-tree-node a, .rich-tree-node-text a').find(a => {
          const t = (a.textContent || '').toLowerCase();
          return t.includes(nomePolo.toLowerCase());
        });
      }, 12000);
      if (!linkPolo) { log('⚠ Polo ' + polo + ' não encontrado, pulando...'); continue; }
      clicar(linkPolo);
      log('✓ Polo ' + polo + ' clicado');

      // ⛔ Espera o LOADING do RichFaces sumir antes de verificar a tabela.
      // O loading é: <div id="mpLoadingMovimentarDiv" class="rich-mpnl-mask-div-opaque">
      // Enquanto ele estiver visível, o AJAX ainda está em progresso e a tabela
      // pode estar incompleta ou desatualizada.
      const loadingSumiu = await (window._aguardarLoading || aguardarLoading)(10000);
      if (!loadingSumiu) {
        log('  ⚠ Rede ocupada após 10s — prosseguindo mesmo assim...');
      } else {
        log('  ✓ Loading sumiu');
      }
      // Buffer extra pós-loading para o DOM se estabilizar
      await wait(400);

      // Agora sim: espera a tabela ter PELO MENOS 1 linha
      const temLinhas = await ateTerFilhos('[id*="destinatariosTable"]', 'tr.rich-table-row', 1, 15000);
      if (!temLinhas) {
        log('⚠ Destinatários não carregaram após clicar em ' + polo + ' (timeout 15s)');
      } else {
        log('✓ Tabela carregada com ' + temLinhas.length + ' linha(s) após clicar em ' + polo);
        await wait(500); // buffer extra para renderização completa do Select2
      }
    } // fim do loop de polos

    // ══ ESTABILIZAÇÃO PÓS-POLOS ══
    // Após clicar em todos os polos, a tabela pode estar recebendo
    // múltiplos AJAXs em paralelo (um por polo). Espera o número de
    // linhas ESTABILIZAR (mesmo count 2x consecutivas com 600ms).
    log('Aguardando tabela estabilizar após todos os polos...');
    const linhasEstaveis = await (async () => {
      const inicio = Date.now();
      let ultimoCount = 0;
      let estavel = 0;
      while (Date.now() - inicio < 20000) {
        const rows = document.querySelectorAll('[id*="destinatariosTable"] tr.rich-table-row');
        const count = rows.length;
        if (count > 0 && count === ultimoCount) {
          estavel++;
          if (estavel >= 2) { log('  ✓ Tabela estabilizada com ' + count + ' linha(s)'); return rows; }
        } else {
          if (count !== ultimoCount) log('  📊 Linhas: ' + ultimoCount + ' → ' + count + ' (recontando...)');
          ultimoCount = count;
          estavel = 0;
        }
        await wait(600);
      }
      log('  ⚠ Timeout na estabilização, usando ' + ultimoCount + ' linha(s)');
      return document.querySelectorAll('[id*="destinatariosTable"] tr.rich-table-row');
    })();

    // Wrapper do log() que também grava no buffer (máx 50 linhas)
    function logar(msg) {
      const ts = Date.now();
      logsAutomacao.push({ ts, msg });
      if (logsAutomacao.length > 50) logsAutomacao.shift(); // mantém só as últimas 50
      log(msg); // também exibe no console
    }

    // Filas esperadas após conclusão (pós-assinar) — padrão.
    // Podem ser customizadas pelo usuário na página de Configurações (chrome.storage).
    // Referência: PJe_automata bots/bot_citar.py FILA_FINAL
    const FILA_FINAL_DEFAULT = [
      '[Sec] - Prazo - AGUARDAR DECURSO DE PRAZO DE RECURSO',
      '[Sec] - Prazo - AGUARDAR DECURSO DE PRAZO',
      '[Sec] - Expediente - AGUARDAR LEITURA OU EXPIRAÇÃO',
      '[Sec] - Expedientes  - AGUARDAR ENVIO PARA O DJEN',
    ];
    // Lê as filas finais configuradas pelo usuário (ou o padrão se não configurado).
    async function getFilasFinais() {
      try {
        var data = await new Promise(function(resolve) {
          chrome.storage.local.get({ pje_filas_finais: null }, resolve);
        });
        if (data && data.pje_filas_finais && data.pje_filas_finais.length) {
          return data.pje_filas_finais;
        }
      } catch(e) {}
      return FILA_FINAL_DEFAULT;
    }

    // ── Helper: consulta API do PJe para saber em qual fila o processo está ──
    // Referência: PJe_automata services/sso_login.py consultar_filas()
    async function verificarFilaAtual(numeroProcesso) {
      var apiHost = (window.PJE_CONFIG && window.PJE_CONFIG.getApiHost()) || window.location.origin;
      var url = (window.PJE_CONFIG && window.PJE_CONFIG.getEndpoint('verificarFila'))
                || (apiHost + '/pje1grau/seam/resource/rest/pje-legacy/painelUsuario/tarefas');
      const FILA_FINAL = await getFilasFinais();   // filas configuradas nas Opções (ou padrão)
      log('🔍 Consultando fila atual do processo ' + numeroProcesso + '...');
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        if (tentativa > 0) await wait(2000); // espera 2s entre tentativas (retry principal faz o loop maior)
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
          if (!resp.ok) { log('  ⚠ API retornou ' + resp.status + ' (tentativa ' + (tentativa+1) + '/4)'); continue; }
          const data = await resp.json();
          if (!Array.isArray(data) || data.length === 0) { log('  ⚠ Nenhuma fila retornada'); continue; }

          const filasEncontradas = data.map(f => f.nome || f.get?.('nome') || '');
          log('  📋 Filas: ' + JSON.stringify(filasEncontradas));

          // Verifica se está em alguma FILA_FINAL
          const filaFinal = filasEncontradas.find(nome =>
            FILA_FINAL.some(ff => nome.toUpperCase().includes(ff.toUpperCase()))
          );
          if (filaFinal) {
            log('  ✓ Processo na fila esperada: ' + filaFinal);
            return { ok: true, fila: filaFinal };
          }
          // Se não está em nenhuma final, retorna a primeira fila (onde está atualmente)
          const filaAtual = filasEncontradas[0] || 'desconhecida';
          log('  ⚠ Processo NÃO está em fila esperada. Fila atual: ' + filaAtual);
          return { ok: false, fila: filaAtual, filas: filasEncontradas };
        } catch(e) {
          log('  ⚠ Erro ao consultar API: ' + e.message);
        }
      }
      log('  ⛔ Timeout consultando fila após 2 tentativas');
      return { ok: false, fila: 'timeout', filas: [] };
    }

    // ── Helper: sinaliza status para o kanban via múltiplos canais ──
    // localStorage + cookie + BroadcastChannel (cross-tab robusto).
    // O kanban (citar-intimar.js) escuta esses 3 canais.
    function sinalizarKanban(idProcesso, status, info) {
      // status: 'done' | 'fail'
      // info: objeto com detalhes (ex: {destinatario, campo, valorEsperado})

      // Para o envio de progresso (chegou ao final)
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }

      const ts = Date.now();

      // Inclui logs da automação no payload
      const payloadInfo = Object.assign({}, info, { logs: logsAutomacao.slice() });

      // Canal 1: localStorage (cross-tab, mesmo domínio)
      try {
        const key = 'pje-ac-' + status + '-' + idProcesso;
        const payload = JSON.stringify({ status, idProcesso, info: payloadInfo, ts });
        localStorage.setItem(key, payload);
        log('  📡 Sinalizado via localStorage: ' + key);
      } catch(e) { log('  ⚠ localStorage indisponível:', e.message); }

      // Canal 2: cookie (cross-subdomain — sobrevive a iframes cross-origin)
      try {
        const cookieVal = encodeURIComponent(JSON.stringify({ status, idProcesso, info: payloadInfo, ts }));
        document.cookie = 'pje_ac_status_' + idProcesso + '=' + cookieVal +
          ';path=/;domain=.tjce.jus.br;max-age=120;SameSite=Lax';
        log('  📡 Sinalizado via cookie: pje_ac_status_' + idProcesso);
      } catch(e) { log('  ⚠ cookie indisponível:', e.message); }

      // Canal 3: BroadcastChannel (cross-tab moderno, mais rápido que storage)
      try {
        if (!window._pjeKanbanChannel) {
          window._pjeKanbanChannel = new BroadcastChannel('pje-kanban');
        }
        window._pjeKanbanChannel.postMessage({ key: 'pje-ac-' + status + '-' + idProcesso, status, idProcesso, info: payloadInfo, ts });
        log('  📡 Sinalizado via BroadcastChannel: pje-ac-' + status + '-' + idProcesso);
      } catch(e) { log('  ⚠ BroadcastChannel indisponível:', e.message); }

      // Canal 4: chrome.storage.local (cross-origin! frontend.cnj.cloud ↔ pje.tjce.jus.br)
      try {
        const storageKey = 'pje-kanban-signal-' + status + '-' + idProcesso;
        chrome.storage.local.set({ [storageKey]: { status, idProcesso, info: payloadInfo, ts } }, () => {
          if (!chrome.runtime.lastError) {
            log('  📡 Sinalizado via chrome.storage: ' + storageKey);
          }
        });
      } catch(e) { log('  ⚠ chrome.storage indisponível:', e.message); }
    }

    // ══ PASSO 2: Configurar TODOS os destinatários da tabela ══
    // Após clicar no polo, a tabela pode ter várias linhas (índices 0, 1, 2...).
    // Cada linha tem: tipoAtoCombo (Comunicação), meioCom (Meio) e prazo.
    // Precisamos configurar TODAS as linhas, não só a primeira.
    const tipoAtoTexto = tipoAto === 'citar' ? 'Citação' : 'Intimação';
    const meioTexto = { sistema: 'Sistema', diario: 'Diário', correios: 'Correios', mandados: 'Central de Mandados' }[meioCom] || meioCom;

    if (!linhasEstaveis || linhasEstaveis.length === 0) {
      log('⚠ Nenhuma linha de destinatário encontrada após estabilização — pulando configuração');
    } else {
      const linhas = linhasEstaveis;
      log('Encontrados ' + linhas.length + ' destinatário(s)');

      let teveFalha = false;

      for (let i = 0; i < linhas.length; i++) {
        const rowIdx = i; // índices começam em 0
        log('── Destinatário ' + (i + 1) + '/' + linhas.length + ' ──');

        // 2a) Comunicação (tipoAtoCombo)
        const tipoOk = await selecionarSelect2PorLinha(rowIdx, 'tipoAtoCombo', tipoAtoTexto);
        if (!tipoOk) {
          log('⛔ Destinatário ' + (i + 1) + ': tipo de comunicação "' + tipoAtoTexto + '" não disponível');
          sinalizarKanban(idProcessoPagina, 'fail', { destinatario: i+1, campo: 'tipoAto', valorEsperado: tipoAtoTexto });
          teveFalha = true;
          continue; // pula para o próximo destinatário
        }
        // Espera o loading sumir (Select2 dispara AJAX no change)
        await (window._aguardarLoading || aguardarLoading)(5000);
        await wait(200);

        // 2b) Meio (meioCom) — tem onchange="showLoading();A4J.AJAX.Submit(...)"
        const meioOk = await selecionarSelect2PorLinha(rowIdx, 'meioCom', meioTexto);
        if (!meioOk) {
          log('⛔ Destinatário ' + (i + 1) + ': NÃO está cadastrado no meio "' + meioTexto + '"');
          sinalizarKanban(idProcessoPagina, 'fail', { destinatario: i+1, campo: 'meio', valorEsperado: meioTexto });
          teveFalha = true;
          continue; // pula para o próximo destinatário
        }
        // Espera o loading sumir (AJAX do meioCom pode recarregar campos dependentes)
        await (window._aguardarLoading || aguardarLoading)(5000);
        await wait(200);

        // 2c) Prazo
        const inpPrazo = document.querySelector(
          `[id*="destinatariosTable:${rowIdx}:quantidadePrazoAto"]`
        );
        if (inpPrazo) {
          inpPrazo.focus(); inpPrazo.value = String(prazo);
          inpPrazo.dispatchEvent(new Event('input',  { bubbles: true }));
          inpPrazo.dispatchEvent(new Event('change', { bubbles: true }));
          inpPrazo.dispatchEvent(new Event('blur',   { bubbles: true }));
          log('  ✓ Prazo: ' + prazo);
        } else {
          log('  ⚠ Campo prazo não encontrado na linha ' + rowIdx);
        }
        await wait(200);
      }

      if (teveFalha) {
        log('⛔ Destinatário(s) com falha — fechando aba de automação...');
        await wait(1500); // aguarda sinais propagarem (localStorage + cookie + BroadcastChannel)
        try { window.close(); } catch(e) {}
        return; // interrompe o fluxo
      }
    }
    log('✓ Todos os destinatários configurados');
    logar('✅ Destinatário(s) configurado(s): ' + tipoAtoTexto + ' / ' + meioTexto + ' / Prazo ' + prazo + 'd');
    await wait(500);

    // ══ VALIDAÇÃO: Verifica campos obrigatórios ANTES de avançar ══
    // Se algum Select2 ainda mostra "Selecione" ou há <span class="text-danger">,
    // o Próximo vai recusar e mostrar erro. Detectamos isso ANTES.
    log('🔍 Validando preenchimento dos destinatários...');
    const errosValidacao = [];
    // ⛔ Usa a tabela específica (tbody:tb > tr direto) igual ao loop de config
    const linhasAtuais = document.querySelectorAll('[id*="destinatariosTable:tb"] > tr.rich-table-row');
    // Fallback: seletor antigo caso o :tb não exista
    const linhasFallback = document.querySelectorAll('[id*="destinatariosTable"] > tbody > tr.rich-table-row');
    const linhasValidacao = linhasAtuais.length > 0 ? linhasAtuais : linhasFallback;
    for (let i = 0; i < linhasValidacao.length; i++) {
      const row = linhasValidacao[i];
      const rowIdx = i;

      // Verifica spans de erro (campo obrigatório) em qualquer célula da linha
      const spansErro = row.querySelectorAll('.text-danger');
      for (const span of spansErro) {
        const td = span.closest('td');
        const thId = td ? td.id : '';
        // Extrai qual coluna: j_id223=Comunicação, j_id231=Meio, j_id248=Prazo, etc.
        const colMatch = thId.match(/j_id(\d+)/);
        const colName = colMatch ? (colMatch[1] === '223' ? 'Comunicação' :
                                     colMatch[1] === '231' ? 'Meio' :
                                     colMatch[1] === '248' ? 'Prazo' :
                                     colMatch[1] === '244' ? 'Tipo Prazo' :
                                     'coluna ' + colMatch[1]) : '?';
        errosValidacao.push('Linha ' + rowIdx + ': ' + colName + ' — ' + (span.textContent || '').trim());
      }

      // Verifica se o Select2 da Comunicação (tipoAtoCombo) ainda está "Selecione"
      const renderedCom = row.querySelector('.select2-selection__rendered');
      // Só verifica se NÃO tem span de erro (evita duplicata)
      if (!spansErro.length && renderedCom) {
        const txt = (renderedCom.textContent || renderedCom.title || '').trim();
        if (txt === 'Selecione' || txt === '') {
          errosValidacao.push('Linha ' + rowIdx + ': Comunicação ainda está "' + txt + '"');
        }
      }

      // Verifica se o Select2 do Meio (meioCom) foi preenchido
      // (pode já vir preenchido como "Sistema" dependendo da config)
    }

    if (errosValidacao.length > 0) {
      log('⛔ VALIDAÇÃO FALHOU! ' + errosValidacao.length + ' campo(s) obrigatório(s) não preenchido(s):');
      errosValidacao.forEach(e => log('  ❌ ' + e));
      log('⛔ Fluxo ABORTADO — corrija os campos antes de prosseguir.');
      return; // ABORTA o fluxo!
    }
    log('✓ Validação OK — todos os campos obrigatórios preenchidos');

    // ══ PASSO 5: Próximo ──
    log('Aguardando Próximo 1...');
    const btn1 = await ateExistir(() => {
      return $$('input[type="submit"], button, input[type="button"]').find(el =>
        /pr[oó]ximo/i.test(el.value || el.textContent || ''));
    }, 10000);
    if (!btn1) return log('ERRO: botão Próximo (1) não encontrado');
    clicar(btn1);
    log('✓ Próximo 1');
    logar('➡️ Avançando para tela de preparar ato (Próximo 1)');

    // ⛔ Espera o LOADING do RichFaces sumir (transição de wizard)
    const loadingSumiu1 = await (window._aguardarLoading || aguardarLoading)(10000);
    if (loadingSumiu1) { log('✓ Rede ociosa'); }
    else { log('⚠ Rede ocupada após 10s — prosseguindo...'); }
    await wait(400);

    // ══ PASSO 6-9: Preparar ato para CADA destinatário ══
    // Referência: PJe_automata bot_citar.py etapa_preparar_ato (linhas 261-305)
    // Fluxo por destinatário:
    //   1. Clicar no lápis (Editar) pelo índice da linha
    //   2. Selecionar radio "Documento do processo"
    //   3. Encontrar documento (Decisão/Ato/Sentença/Despacho) → "Usar como ato de comunicação"
    //   4. Clicar Confirmar
    //   5. Repetir para o próximo índice até linhaDestinatarioExiste() retornar false
    // Se qualquer passo falhar, ABORTA o fluxo (não tenta skipar).

    // Aguarda a tela de preparar ato carregar totalmente
    log('Aguardando tela de preparar ato...');
    await wait(3000);

    let idx = 0;
    while (await linhaDestinatarioExiste(idx)) {
      log('── Preparando ato destinatário ' + (idx + 1) + ' ──');

      // 1. Clicar no lápis (Editar) da linha
      log('  🔍 Clicando no lápis Editar...');
      const lapisOk = await clicarLapisEditar(idx);
      if (!lapisOk) {
        log('⛔ ERRO: Botão lápis Editar não encontrado para destinatário ' + (idx + 1) + ' — abortando');
        return;
      }
      log('  ✓ Lápis Editar clicado');

      // 2. Selecionar radio "Documento do processo"
      log('  🔍 Selecionando radio "Documento do processo"...');
      const radioOk = await selecionarRadioDocumentoProcesso();
      if (!radioOk) {
        log('⛔ ERRO: Radio "Documento do processo" não encontrado para destinatário ' + (idx + 1) + ' — abortando');
        return;
      }
      log('  ✓ Radio "Documento do processo" selecionado');

      // 3. Selecionar documento e clicar "Usar como ato de comunicação"
      log('  🔍 Buscando documento da decisão...');
      const docOk = await selecionarDocumentoDecisao();
      if (!docOk) {
        log('⛔ ERRO: Nenhum documento (Decisão/Ato/Sentença/Despacho) encontrado para destinatário ' + (idx + 1) + ' — abortando');
        return;
      }
      log('  ✓ Documento selecionado');

      // 4. Clicar Confirmar
      log('  🔍 Clicando Confirmar...');
      const confOk = await clicarConfirmar();
      if (!confOk) {
        log('⛔ ERRO: Botão Confirmar não encontrado para destinatário ' + (idx + 1) + ' — abortando');
        return;
      }
      log('  ✓ Confirmar clicado');

      await wait(1000);
      idx++;
    }

    if (idx === 0) {
      log('⚠ Nenhum destinatário encontrado na tabelaDestinatarios');
    }
    log('✓ Ato preparado para ' + idx + ' destinatário(s)');
    logar('📄 Ato preparado para ' + idx + ' destinatário(s) com documento da decisão');

    // Polling: espera Próximo 2 aparecer
    await ateExistir(() => {
      return $$('input[type="submit"], button, input[type="button"]').find(el =>
        /pr[oó]ximo/i.test(el.value || el.textContent || ''));
    }, 20000);
    await wait(400);

    // ══ PASSO 10: Próximo 2 ══
    log('Aguardando Próximo 2...');
    const btn2 = await ateExistir(() => {
      return $$('input[type="submit"], button, input[type="button"]').find(el =>
        /pr[oó]ximo/i.test(el.value || el.textContent || ''));
    }, 8000);
    if (btn2) { clicar(btn2); log('✓ Próximo 2'); }
    else log('⚠ Próximo 2 não encontrado');

    // Polling: espera botão Assinar aparecer
    if (btn2) {
      await ateExistir('[id*="btn-assinadormobile"], input[value*="Assinar digitalmente Mobile"]', 20000);
      await wait(400);
    }

    // ══ PASSO 11: Assinar digitalmente Mobile ══
    log('Aguardando Assinar digitalmente Mobile...');
    const assinar = await ateExistir('[id*="btn-assinadormobile"], input[value*="Assinar digitalmente Mobile"]', 8000);
    let assinado = false;
    if (assinar) { clicar(assinar); log('✓ Assinar digitalmente Mobile'); logar('✍️ Ato assinado digitalmente (Mobile)'); assinado = true; }
    else {
      log('⛔ Assinar digitalmente Mobile não encontrado — fluxo incompleto');
      logar('⛔ Botão Assinar não encontrado — automação falhou');
      // Sinaliza FALHA: o fluxo não chegou até a assinatura.
      const idFalha = cfg.idProcesso || extrairIdProcesso();
      if (idFalha) {
        try { sinalizarKanban(idFalha, 'fail', { erro: 'Botão Assinar não encontrado — fluxo não concluído' }); } catch(e) {}
      }
      setCookie('pje_ac', '');
      return; // Encerra — não faz sentido verificar fila se não assinou
    }

    // ══ VERIFICAÇÃO PÓS-ASSINAR: confirma fila final com retry ══
    // O PJe demora alguns segundos para processar a assinatura mobile
    // e mover o processo para a fila final. Aguardamos e tentamos várias vezes.
    const idConcluido = cfg.idProcesso || extrairIdProcesso();
    const numeroProcesso = cfg.numero || '';
    if (idConcluido && numeroProcesso) {
      log('🔍 Verificando fila pós-assinatura para ' + numeroProcesso + ' (com retry)...');
      await wait(5000); // Aguarda 5s iniciais para o PJe processar a assinatura

      let resultadoFila = null;
      for (let tentativa = 0; tentativa < 6; tentativa++) {
        if (tentativa > 0) {
          log('  🔄 Retry fila ' + (tentativa+1) + '/6...');
          await wait(8000); // +8s entre tentativas
        }
        resultadoFila = await verificarFilaAtual(numeroProcesso);
        log('  📋 Tentativa ' + (tentativa+1) + ': fila=' + resultadoFila.fila + ' | ok=' + resultadoFila.ok);
        if (resultadoFila.ok) break; // Achou fila esperada → para
      }

      const infoFila = {
        fila: resultadoFila.fila,
        filaOk: resultadoFila.ok,
        filas: resultadoFila.filas || []
      };
      if (resultadoFila.ok) {
        sinalizarKanban(idConcluido, 'done', infoFila);
        log('✓ Sinalizado conclusão para kanban: ' + idConcluido + ' — fila: ' + resultadoFila.fila);
      } else {
        // ⛔ Fila errada = FALHA (antes sinalizava 'done' mesmo com fila errada!)
        log('⛔ Processo NÃO foi para fila esperada após 6 tentativas: ' + resultadoFila.fila);
        logar('⛔ Fila final incorreta: ' + resultadoFila.fila);
        sinalizarKanban(idConcluido, 'fail', {
          erro: 'Fila final incorreta após assinar: ' + resultadoFila.fila,
          fila: resultadoFila.fila,
          filaOk: false,
          filas: resultadoFila.filas || []
        });
        log('✓ Sinalizado FALHA (fila incorreta) para kanban: ' + idConcluido);
      }
    } else if (idConcluido) {
      sinalizarKanban(idConcluido, 'done', {});
      log('✓ Sinalizado conclusão para kanban: ' + idConcluido);
    }

    // Só limpa o cookie no final — se a página recarregar durante o fluxo,
    // a nova instância ainda consegue ler a config e continuar.
    setCookie('pje_ac', '');
    log('FLUXO CONCLUÍDO!');
  })();

  // ── Helper: preenche destinatário do MP via CNPJ (autocomplete) ──
  // Referência: Python pje_actions.py preencher_destinatario_mp (linhas 1362-1518)
  // Fluxo:
  //   1. Encontra input[id$=":destinatario"]
  //   2. Digita CNPJ 06.928.790/0001-56
  //   3. ArrowDown + Enter + Tab no autocomplete
  //   4. Clica no botão de procuradoria (fa-users)
  //   5. Abre modal → Select2 → MINISTÉRIO PÚBLICO → Confirmar
  async function preencherDestinatarioMP() {
    const CNPJ_MP = '06.928.790/0001-56';

    // 1. Encontra o input de destinatário (ID termina com :destinatario)
    const inputDest = await ateExistir('input[id$=":destinatario"]', 10000);
    if (!inputDest) {
      log('⛔ Input destinatário não encontrado para MP');
      return false;
    }
    log('🔍 Input destinatário encontrado');

    // 2. Limpa e digita o CNPJ char a char (delay 50ms = igual Python)
    inputDest.focus();
    inputDest.click();
    inputDest.value = '';
    for (const ch of CNPJ_MP) {
      inputDest.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
      inputDest.value += ch;
      inputDest.dispatchEvent(new Event('input', { bubbles: true }));
      inputDest.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
      await wait(50);
    }
    log('📝 CNPJ digitado: ' + CNPJ_MP);

    // 3. Aguarda o dropdown de autocomplete aparecer
    await wait(2000);

    // 4. Seleciona via ArrowDown + Enter + Tab (estratégia 1 do Python)
    inputDest.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, keyCode: 40 }));
    await wait(600);
    inputDest.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, keyCode: 13 }));
    await wait(1500);
    inputDest.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, keyCode: 9 }));
    await wait(1000);
    log('✅ ArrowDown + Enter + Tab no autocomplete');

    // Aguarda network idle
    await (window._aguardarLoading || aguardarLoading)(10000);
    await wait(3000);

    // 5. Clica no botão de selecionar procuradoria (ícone fa-users)
    let btnProc = document.querySelector('a[id$=":idAbrirModaProcuradoria"]');
    if (!btnProc) {
      btnProc = document.querySelector('a[title*="procuradoria" i]');
    }
    if (!btnProc) {
      const usersIcon = document.querySelector('a i.fa-users, a i.fa.fa-users');
      if (usersIcon) btnProc = usersIcon.closest('a');
    }

    if (btnProc) {
      clicar(btnProc);
      log('✅ Clicou no botão de selecionar procuradoria');
      await wait(2000);

      // 6. Fluxo do modal de procuradoria
      const modalOk = await selecionarProcuradoriaModal();
      if (!modalOk) {
        log('⚠️ Modal de procuradoria: falha ao selecionar MP');
      }
    } else {
      log('⚠️ Botão de procuradoria não encontrado — pode já estar preenchido');
    }

    log('✅ Destinatário MP preenchido com sucesso');
    return true;
  }

  // ── Helper: modal de procuradoria (Select2 → MP → Confirmar) ──
  // Referência: Python pje_actions.py _selecionar_procuradoria_modal (linhas 1525-1567)
  async function selecionarProcuradoriaModal() {
    // 1. Abre o dropdown do Select2
    // O Select2 fica num iframe/popup sobre o conteúdo
    // ID: span[id$=":selProcuradoria-container"]
    let select2 = document.querySelector('span[id$=":selProcuradoria-container"]');
    if (!select2) {
      // Fallback: qualquer .select2-selection__rendered visível
      const allRendered = document.querySelectorAll('.select2-selection__rendered');
      for (const r of allRendered) {
        if (r.offsetParent !== null) { select2 = r; break; }
      }
    }
    if (!select2) {
      log('  ⚠ Select2 de procuradoria não encontrado');
      return false;
    }

    // Abre o dropdown
    select2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    await wait(100);
    select2.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    select2.click();
    await wait(1000);
    log('  🔽 Dropdown de procuradoria aberto');

    // 2. Seleciona a opção do MP (contém "MINISTERIO" ou "MINISTÉRIO PÚBLICO")
    const opts = document.querySelectorAll('.select2-results__option:not(.loading-results)');
    const mpOpt = Array.from(opts).find(o => {
      const t = (o.textContent || '').toUpperCase();
      return t.includes('MINISTERIO') || t.includes('MINISTÉRIO');
    });
    if (!mpOpt) {
      log('  ⚠ Opção MINISTÉRIO PÚBLICO não encontrada no Select2');
      return false;
    }

    mpOpt.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    mpOpt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    mpOpt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    mpOpt.click();
    await wait(1000);
    log('  ✅ MINISTÉRIO PÚBLICO selecionado no Select2');

    // 3. Clica em Confirmar
    const btnConf = document.querySelector('input[value="Confirmar"]') ||
                    document.querySelector('input[value="Confirmar"][type="button"]') ||
                    Array.from(document.querySelectorAll('button')).find(b =>
                      /confirmar/i.test(b.textContent || '')
                    );
    if (btnConf) {
      clicar(btnConf);
      await wait(2000);
      await (window._aguardarLoading || aguardarLoading)(8000);
      log('  ✅ Confirmar clicado — modal de procuradoria fechado');
    } else {
      log('  ⚠ Botão Confirmar não encontrado no modal');
    }

    return true;
  }

  // ── Helper: seleciona documento da decisão (critérios do automata) ──
  // Percorre a tabela docExistentesTable (ordenada por data decrescente).
  // Seleciona o PRIMEIRO documento cujo tipo seja:
  // Decisão, Ato Ordinatório, Sentença ou Despacho.
  // Clica no botão <a title="Usar como ato de comunicação"> da linha.
  async function selecionarDocumentoDecisao() {
    const TIPOS_ALVO = ['decisao', 'ato ordinatório', 'ato ordinatario',
                        'sentenca', 'sentença', 'despacho'];
    const tiposNorm = TIPOS_ALVO.map(t => normalizarTexto(t));

    // Busca todas as linhas do tbody da tabela
    const rows = document.querySelectorAll('table[id*="docExistentesTable"] tbody tr');
    if (!rows.length) {
      log('⚠ Nenhuma linha na docExistentesTable');
      return false;
    }

    log('📄 ' + rows.length + ' documento(s) na tabela, buscando tipo: ' + TIPOS_ALVO.join(', '));

    let indiceMatch = -1;
    let textoMatch = '';

    for (let i = 0; i < rows.length; i++) {
      try {
        const textoLinha = (rows[i].textContent || '').trim();
        const textoNorm = normalizarTexto(textoLinha);

        for (const tipo of tiposNorm) {
          if (textoNorm.includes(tipo)) {
            // ⛔ Só considera match se a row TEM o botão "Usar como ato de comunicação".
            // Pula rows que só têm "Visualizar" (documento já usado em outro destinatário).
            const temBtnUsar = rows[i].querySelector('a[title="Usar como ato de comunicação"]') ||
                               rows[i].querySelector('i.fa-check-square-o');
            if (!temBtnUsar) {
              log('  ⏭ Row ' + i + ' match tipo mas sem botão "Usar como ato" — pulando');
              continue;
            }
            indiceMatch = i;
            textoMatch = textoLinha.substring(0, 120);
            log('  🎯 Match na linha ' + i + ': "' + textoMatch + '"');
            break;
          }
        }
        if (indiceMatch >= 0) break;
      } catch(e) {
        log('  ⚠ Erro ao ler linha ' + i + ':', e.message);
      }
    }

    if (indiceMatch < 0) {
      log('❌ Nenhum documento do tipo ' + TIPOS_ALVO.join(', ') + ' encontrado!');
      // Diagnóstico: lista os textos das primeiras 10 linhas
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        try {
          log('  Linha ' + i + ': "' + (rows[i].textContent || '').trim().substring(0, 150) + '"');
        } catch(e) {}
      }
      return false;
    }

    // Clica no botão "Usar como ato de comunicação" da linha encontrada
    // O botão é: <a class="btn btn-default btn-sm" title="Usar como ato de comunicação">
    //            <i class="fa fa-check-square-o"></i></a>
    const rowAlvo = rows[indiceMatch];
    // ⛔ SÓ dois fallbacks (igual automata pje_actions.py:929-935).
    // NUNCA usar a.btn.btn-default (pega Visualizar, Remover, etc!)
    let btnUsar = rowAlvo.querySelector('a[title="Usar como ato de comunicação"]');

    if (!btnUsar) {
      // Fallback: <a> que contenha ícone fa-check-square-o
      const icon = rowAlvo.querySelector('i.fa-check-square-o, i.fa.fa-check-square-o');
      if (icon) btnUsar = icon.closest('a');
    }

    if (!btnUsar) {
      log('⚠ Botão "Usar como ato de comunicação" não encontrado na linha ' + indiceMatch);
      // Diagnóstico: lista os links disponíveis na row
      const links = rowAlvo.querySelectorAll('a');
      for (const a of links) {
        log('  Link: title="' + (a.title || '') + '" class="' + (a.className || '') + '"');
      }
      return false;
    }

    clicar(btnUsar);
    log('✓ Clicado em "Usar como ato de comunicação" na linha ' + indiceMatch);
    return true;
  }

  // ── Helper: verifica se a linha de destinatário existe ──
  // Referência: PJe_automata pje_actions.py linha_destinatario_existe (linhas 652-691)
  // Verifica múltiplos padrões de ID pois o PJe usa nomes diferentes em cada fase:
  //   - destinatariosTable (tela de configurar ato/meio/prazo)
  //   - tabelaDestinatarios (tela de preparar ato, após Próximo)
  async function linhaDestinatarioExiste(indice) {
    // Padrão 1: lápis Editar na tabelaDestinatarios (tela de preparar ato)
    if (document.querySelector('a[title="Editar"][id*="tabelaDestinatarios:' + indice + ':"]')) return true;
    // Padrão 2: input de prazo (tela de configurar ato/meio/prazo)
    if (document.querySelector('input[id*="destinatariosTable:' + indice + ':quantidadePrazoAto"]')) return true;
    // Padrão 3: qualquer elemento com tabelaDestinatarios:{indice}:
    if (document.querySelector('[id*="tabelaDestinatarios:' + indice + ':"]')) return true;
    return false;
  }

  // ── Helper: clica no lápis Editar da linha especificada ──
  // Referência: PJe_automata pje_actions.py clicar_lapis_editar (linhas 732-773)
  async function clicarLapisEditar(indiceLinha) {
    // Seletor específico por índice (igual referência)
    let btn = document.querySelector('a[title="Editar"][id*="tabelaDestinatarios:' + indiceLinha + ':"]');
    // Fallback: ícone fa-pencil dentro de a[title="Editar"]
    if (!btn) {
      const icon = document.querySelector('a[title="Editar"] i.fa-pencil');
      if (icon) btn = icon.closest('a');
    }
    if (!btn) return false;
    clicar(btn);
    await (window._aguardarLoading || aguardarLoading)(8000);
    await wait(500);
    return true;
  }

  // ── Helper: seleciona radio "Documento do processo" ──
  // Referência: PJe_automata pje_actions.py selecionar_radio_documento_processo (linhas 812-851)
  async function selecionarRadioDocumentoProcesso() {
    // Estratégia 1: clicar no label "Documento do processo"
    const labels = document.querySelectorAll('label');
    for (const lbl of labels) {
      if ((lbl.textContent || '').trim().toLowerCase().includes('documento do processo')) {
        clicar(lbl);
        await (window._aguardarLoading || aguardarLoading)(8000);
        await wait(400);
        // Aguarda docExistentesTable carregar
        await ateExistir('[id*="docExistentesTable"]', 15000);
        await wait(600);
        return true;
      }
    }
    // Estratégia 2: radio com value="DP"
    const radio = document.querySelector('input[type="radio"][value="DP"]');
    if (radio) {
      clicar(radio);
      await (window._aguardarLoading || aguardarLoading)(8000);
      await wait(400);
      await ateExistir('[id*="docExistentesTable"]', 15000);
      await wait(600);
      return true;
    }
    return false;
  }

  // ── Helper: clica no botão Confirmar ──
  // Referência: PJe_automata pje_actions.py clicar_confirmar (linhas 776-809)
  async function clicarConfirmar() {
    // ⛔ Confirmar é <input type="button" value="Confirmar"> — NÃO type="submit"!
    // Timeout de 10s (igual referência)
    const conf = await ateExistir(() => {
      return $$('input[type="button"][value="Confirmar"], input[value="Confirmar"], button').find(el =>
        /confirmar/i.test(el.value || el.textContent || '')
      );
    }, 10000);
    if (!conf) return false;
    clicar(conf);
    await (window._aguardarLoading || aguardarLoading)(8000);
    await wait(500);
    return true;
  }

  // ── Helper: extrai idProcesso da URL da página ──
  function extrairIdProcesso() {
    const h = window.location.href;
    // Formato conteudo-tarefa: .../conteudo-tarefa/1474836/...
    let m = h.match(/conteudo-tarefa\/(\d+)/);
    if (m) return m[1];
    // Formato movimentar.seam: ...?idProcesso=2099840&...
    m = h.match(/[?&]idProcesso=(\d+)/i);
    if (m) return m[1];
    // Formato via iframe name ou atributo
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
  // IMPORTANTE: content script roda em mundo ISOLADO — não pode
  // usar typeof A4J / typeof jQuery (são objetos do mundo MAIN).
  // Só checks via DOM (atributos, elementos visíveis) funcionam.
  async function aguardarPaginaPronta() {
    log('Verificando prontidão da página JSF...');
    const inicio = Date.now();
    const timeout = 15000;

    while (Date.now() - inicio < timeout) {
      // 1) ViewState presente → JSF form parseado
      const vs = document.querySelector('input[name="javax.faces.ViewState"]');
      if (vs && vs.value) {
        // Basta ViewState + existência de algum elemento chave
        // (Select2 e wizard podem demorar mais com A4J polls)
        const hasBody = document.querySelector('#pageBody, .principal, [id*="wizard"]');
        if (hasBody) {
          log('Página JSF pronta em ' + (Date.now() - inicio) + 'ms');
          return true;
        }
      }
      await wait(300);
    }

    log('⚠ Página JSF não ficou pronta em 15s — prosseguindo mesmo assim');
    return false;
  }

  // ── Helper: selecionar opção em Select2 ──
  // IMPORTANTE: roda em mundo ISOLADO — jQuery/Select2 não
  // estão disponíveis. Usa só DOM events (mousedown/mouseup/click).
  async function selecionarSelect2(idParcial, texto) {
    // Encontra o <select> subjacente (DOM puro, funciona em mundo isolado)
    const selectEl = await ateExistir(`select[id*="${idParcial}"], [id*="${idParcial}"]`, 8000);
    if (!selectEl) return log('⚠ Select2 não encontrado: ' + idParcial);

    // Acha o trigger VISÍVEL do Select2 (span.select2-selection)
    let trigger = selectEl.closest('.select2-selection');
    if (!trigger) {
      const parent = selectEl.closest('td, div, .rich-table-cell') || selectEl.parentElement;
      if (parent) trigger = parent.querySelector('.select2-selection');
    }
    if (!trigger) return log('⚠ Trigger Select2 não encontrado: ' + idParcial);

    // 1) ABRE o dropdown clicando no span visível
    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    await wait(200);
    trigger.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    trigger.click();
    await wait(700);

    // 2) CAMPO DE BUSCA: digita char a char
    const inp = await ateExistir('.select2-search__field', 5000);
    if (!inp) {
      log('⚠ Select2 não abriu: ' + idParcial + ' — tentando setar direto no <select>...');
      if (selectEl.tagName === 'SELECT') {
        const optEl = Array.from(selectEl.options).find(o =>
          (o.textContent || o.text || '').trim().toLowerCase().includes(texto.toLowerCase())
        );
        if (optEl) {
          selectEl.value = optEl.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          selectEl.dispatchEvent(new Event('blur', { bubbles: true }));
          selectEl.dispatchEvent(new Event('select2:select', { bubbles: true }));
          log('✓ Valor direto no select: "' + (optEl.textContent || optEl.text).trim() + '"');
          return;
        }
      }
      return log('⚠ Fallback também falhou: ' + idParcial);
    }
    inp.focus(); inp.value = '';

    for (const ch of texto) {
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
      inp.value += ch;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true, cancelable: true }));
      await wait(80);
    }
    await wait(800);

    // 3) CLICA na opção encontrada (sequência completa de eventos)
    const opt = document.querySelector(
      '.select2-results__option:not(.loading-results):not(.select2-results__option--disabled)'
    );
    if (!opt) return log('⚠ Nenhuma opção Select2 encontrada: ' + idParcial);

    opt.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    opt.dispatchEvent(new MouseEvent('mouseover',  { bubbles: true }));
    opt.dispatchEvent(new MouseEvent('mousedown',  { bubbles: true, cancelable: true, view: window }));
    opt.dispatchEvent(new MouseEvent('mouseup',    { bubbles: true, cancelable: true, view: window }));
    opt.click();
    await wait(400);

    // 4) COMMITA: fecha dropdown e força change no <select> subjacente
    //    Isso garante que o JSF/Select2 registre a mudança mesmo em mundo isolado.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(150);

    // Seta o value no <select> original (garantia extra)
    if (selectEl.tagName === 'SELECT') {
      const optEl = Array.from(selectEl.options).find(o =>
        (o.textContent || o.text || '').trim().toLowerCase().includes(texto.toLowerCase())
      );
      if (optEl) {
        selectEl.value = optEl.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        selectEl.dispatchEvent(new Event('blur',   { bubbles: true }));
      }
    }

    // Verifica se o container foi atualizado
    const rendered = trigger.querySelector('.select2-selection__rendered') || trigger;
    const newTitle = (rendered.title || rendered.textContent || '').trim();
    log('Select2 ' + idParcial + ' → ' + newTitle);
  }

  // ── Helper: selecionarSelect2 para uma LINHA específica da tabela ──
  // Abre o dropdown, clica na opção com o texto correspondente (sem digitar).
  async function selecionarSelect2PorLinha(rowIdx, idParcial, texto) {
    // Seletor específico: destinatariosTable:{rowIdx}:tipoAtoCombo, etc.
    const selEspecifico = `[id*="destinatariosTable:${rowIdx}:${idParcial}"]`;
    const selectEl = await ateExistir(`select${selEspecifico}`, 8000);
    if (!selectEl) { log('  ⚠ Select2 ' + idParcial + ' não encontrado na linha ' + rowIdx); return false; }

    let trigger = selectEl.closest('.select2-selection');
    if (!trigger) {
      const parent = selectEl.closest('td, div, .rich-table-cell') || selectEl.parentElement;
      if (parent) trigger = parent.querySelector('.select2-selection');
    }
    if (!trigger) { log('  ⚠ Trigger Select2 não encontrado na linha ' + rowIdx); return false; }

    // Abre o dropdown — até 3 tentativas
    let dropdownAberto = false;
    for (let tentativa = 0; tentativa < 3 && !dropdownAberto; tentativa++) {
      if (tentativa > 0) {
        await wait(400);
        // Re-localiza o trigger (pode ter sido recriado pelo RichFaces)
        trigger = selectEl.closest('.select2-selection');
        if (!trigger) {
          const p = selectEl.closest('td, div, .rich-table-cell') || selectEl.parentElement;
          if (p) trigger = p.querySelector('.select2-selection');
        }
        if (!trigger) break;
      }
      // Abre o Select2: mousedown → mouseup → click
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      await wait(100);
      trigger.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true, view: window }));
      trigger.click();
      await wait(600);

      // Verifica se o dropdown abriu (opções visíveis)
      const optsCheck = document.querySelectorAll('.select2-results__option:not(.loading-results)');
      dropdownAberto = optsCheck.length > 0;
    }

    if (!dropdownAberto) {
      // Fallback: seta o value direto no <select> subjacente
      log('  ⚠ Select2 não abriu na linha ' + rowIdx + ' (' + idParcial + ') — tentando setar direto no <select>...');
      if (selectEl.tagName === 'SELECT') {
        const optEl = Array.from(selectEl.options).find(o =>
          (o.textContent || o.text || '').trim().toLowerCase().includes(texto.toLowerCase())
        );
        if (optEl) {
          selectEl.value = optEl.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          selectEl.dispatchEvent(new Event('blur',   { bubbles: true }));
          selectEl.dispatchEvent(new Event('select2:select', { bubbles: true }));
          log('  ✓ Valor setado direto no select: "' + (optEl.textContent || optEl.text).trim() + '"');
          return true;
        }
      }
      log('  ⚠ Opção "' + texto + '" NÃO encontrada no <select> nativo da linha ' + rowIdx + ' (' + idParcial + ')');
      return false;
    }

    // Procura a opção que CONTÉM o texto desejado (ignora case) e CLICA
    const todasOpts = document.querySelectorAll('.select2-results__option:not(.loading-results):not(.select2-results__option--disabled)');
    const opt = Array.from(todasOpts).find(o => {
      const txt = (o.textContent || '').trim();
      return txt.toLowerCase().includes(texto.toLowerCase());
    });

    if (!opt) {
      // Fecha o dropdown e tenta via DIGITAÇÃO no campo de busca
      // (força o Select2 a fazer AJAX search, carregando as opções)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await wait(400);

      log('  ⌨️ Tentando via digitação no Select2 ' + idParcial + ': "' + texto + '"...');
      // Reabre o dropdown
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      await wait(100);
      trigger.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true, view: window }));
      trigger.click();
      await wait(700);

      // Encontra o campo de busca e digita o texto char a char
      const inp = document.querySelector('.select2-search__field');
      if (inp) {
        inp.focus(); inp.value = '';
        for (const ch of texto) {
          inp.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
          inp.value += ch;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true, cancelable: true }));
          await wait(60);
        }
        await wait(1000); // Aguarda AJAX do Select2 retornar

        // Clica na primeira opção encontrada
        const optTyped = document.querySelector('.select2-results__option:not(.loading-results):not(.select2-results__option--disabled)');
        if (optTyped) {
          optTyped.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          optTyped.dispatchEvent(new MouseEvent('mousedown',  { bubbles: true, cancelable: true, view: window }));
          optTyped.dispatchEvent(new MouseEvent('mouseup',    { bubbles: true, cancelable: true, view: window }));
          optTyped.click();
          await wait(400);
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          await wait(150);
          log('  ✓ Opção via digitação: "' + (optTyped.textContent || '').trim() + '"');
          return true;
        }
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }

      // Último fallback: seta direto no <select> nativo
      if (selectEl.tagName === 'SELECT') {
        const optEl = Array.from(selectEl.options).find(o =>
          (o.textContent || o.text || '').trim().toLowerCase().includes(texto.toLowerCase())
        );
        if (optEl) {
          selectEl.value = optEl.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          selectEl.dispatchEvent(new Event('blur',   { bubbles: true }));
          selectEl.dispatchEvent(new Event('select2:select', { bubbles: true }));
          log('  ✓ Valor setado direto no <select>: "' + (optEl.textContent || optEl.text).trim() + '"');
          return true;
        }
      }

      log('  ⚠ Opção "' + texto + '" NÃO disponível no Select2 ' + idParcial + ' da linha ' + rowIdx);
      return false;
    }

    // Clica na opção encontrada
    opt.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    opt.dispatchEvent(new MouseEvent('mousedown',  { bubbles: true, cancelable: true, view: window }));
    opt.dispatchEvent(new MouseEvent('mouseup',    { bubbles: true, cancelable: true, view: window }));
    opt.click();
    await wait(400);

    // Fecha o dropdown (Escape)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(150);

    // Sincroniza o <select> subjacente com o valor escolhido
    if (selectEl.tagName === 'SELECT') {
      const optEl = Array.from(selectEl.options).find(o =>
        (o.textContent || o.text || '').trim().toLowerCase().includes(texto.toLowerCase())
      );
      if (optEl) {
        selectEl.value = optEl.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        selectEl.dispatchEvent(new Event('blur',   { bubbles: true }));
      }
    }

    const rendered = trigger.querySelector('.select2-selection__rendered') || trigger;
    const newTitle = (rendered.title || rendered.textContent || '').trim();
    log('  ✓ Linha ' + rowIdx + ' ' + idParcial + ' → ' + newTitle);
    return true;
  }
})();
