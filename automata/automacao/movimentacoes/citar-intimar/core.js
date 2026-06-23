// ═══════════════════════════════════════════════════════════
// PJe Sejud — Automação + Cross-tab + Estado
// Depende de: utils.js, infra.js, duplicados.js
// ═══════════════════════════════════════════════════════════════

  var aberto = false;
  var jobs = [];            // { id, numero, status, fila, idProcesso, erro }
  var _acaoAtual = 'citar'; // 'citar' ou 'alvara'

  var STORAGE_KEY = 'pje-kanban-estado';

  function salvarEstado() {
    try {
      const estado = {
        jobs: jobs,
        acao: _acaoAtual,
        textarea: ($('#pje-ci-textarea')?.value || ''),
        textareaAlvara: ($('#pje-alvara-textarea')?.value || ''),
        tipo: ($('#pje-ci-tipo')?.value || 'intimar'),
        meio: ($('#pje-ci-meio')?.value || 'sistema'),
        prazo: ($('#pje-ci-prazo')?.value || '15'),
        polos: getPolosSelecionados(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
      log('Estado salvo:', jobs.length + ' jobs');
    } catch(e) { warn('Erro ao salvar estado:', e.message); }
  }

  function carregarEstado() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  var MAX_CONCURRENT = 3; // máximo de processos em execução simultânea

  // Guard contra dispatches concorrentes
  var _dispatching = false;

  async function dispatcharProximo() {
    // Evita dispatches concorrentes (chamado por polling + storage + broadcast)
    if (_dispatching) return;
    _dispatching = true;

    try {
      const isAlvara = _acaoAtual === 'alvara';
      const btn = isAlvara ? $('#pje-alvara-iniciar') : $('#pje-ci-iniciar');

      const running = jobs.filter(j => j.status === 'running');
      const slots = MAX_CONCURRENT - running.length;

      if (slots <= 0) {
        log('⏳ ' + running.length + '/' + MAX_CONCURRENT + ' em execução — aguardando vaga...');
        salvarEstado();
        return;
      }

      // Pega até `slots` jobs pendentes
      const pendentes = jobs.filter(j => j.status === 'pending').slice(0, slots);

      if (pendentes.length === 0) {
        if (running.length === 0) {
          log('✅ FILA CONCLUÍDA! ' + jobs.length + ' processo(s) processado(s).');
          if (btn) btn.disabled = false;
        } else {
          log('⏳ ' + running.length + '/' + MAX_CONCURRENT + ' em execução, sem pendentes...');
        }
        salvarEstado();
        return;
      }

      log('🚀 Disparando ' + pendentes.length + ' processo(s) (' + running.length + ' já em execução, ' + slots + ' vaga(s))');

      // Dispara todos os pendentes em paralelo (até o limite de slots)
      for (const proximo of pendentes) {
        const n = proximo.numero;
        log('── Dispatch: ' + n + ' ──');

        try {
          updateJob(proximo.id, { status: 'running', timeoutAt: Date.now() + TIMEOUT_TASK });
          salvarEstado();
          renderKanban();

          log('🔍 Consultando API para: ' + n);
          const info = await infoDoProcesso(n);
          updateJob(proximo.id, { status: 'running', fila: info.fila, idProcesso: info.id, timeoutAt: Date.now() + TIMEOUT_TASK });

          log('→ Abrindo com automação completa: ' + n);
          abrirEAutomatizar(n, info.id, info.fila);

          log('✓ Despachado (running). Aguardando conclusão na outra aba...');
          salvarEstado();
          renderKanban();
        } catch(erro) {
          err('✗ Erro ao consultar/abrir ' + n + ':', erro.message);
          updateJob(proximo.id, { status: 'error', erro: erro.message, end_time: Date.now() });
          salvarEstado();
          renderKanban();
          // Continua com os próximos pendentes (não interrompe o lote)
        }
      }
    } finally {
      _dispatching = false;
    }
  }


  async function iniciar() {
    if (_acaoAtual === 'outros') {
      warn('Tipo de movimentação "Outros" ainda não implementado.');
      return;
    }
    const isAlvara = _acaoAtual === 'alvara';
    const textarea = isAlvara ? $('#pje-alvara-textarea') : $('#pje-ci-textarea');
    const btn = isAlvara ? $('#pje-alvara-iniciar') : $('#pje-ci-iniciar');
    if (!textarea) { warn('Textarea não encontrada para acao=' + _acaoAtual); return; }
    const numeros = (textarea.value || '').match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g) || [];

    if (!numeros.length) { warn('Nenhum número de processo encontrado na textarea'); return; }

    const acaoLabel = isAlvara ? 'ALVARÁ' : 'CITAR/INTIMAR';
    log('🚀 INICIANDO ' + acaoLabel + ' — adicionando ' + numeros.length + ' processo(s) à fila (timeout ' + (TIMEOUT_TASK/1000) + 's, máx ' + MAX_CONCURRENT + ' simultâneos):', numeros);

    // Adiciona TODOS como pending
    for (const n of numeros) {
      addJob(n);
    }
    salvarEstado();

    // Reabilita o botão imediatamente — usuário pode adicionar mais processos
    if (btn) btn.disabled = false;

    // Dispara os primeiros (até MAX_CONCURRENT)
    dispatcharProximo();
  }

  function abrir(tab, modo) {
    log('Abrindo kanban... (aberto=' + aberto + ', tab=' + (tab || 'default') + ', modo=' + (modo || 'kanban') + ')');
    // Se já está aberto, navega sem fechar
    if (aberto) {
      if (modo === 'duplicados' && window._pjeMostrarDuplicados) {
        window._pjeMostrarDuplicados();
      } else if (window._pjeVoltarKanban) {
        window._pjeVoltarKanban();
      }
      return;
    }
    aberto = true;
    const saved = carregarEstado();
    jobs = saved?.jobs || [];
    // Se foi especificado um tab, usa ele; senão, restaura o salvo ou default 'citar'
    if (tab === 'alvara' || tab === 'citar') {
      _acaoAtual = tab;
    } else if (saved && saved.acao) {
      _acaoAtual = saved.acao;
    }
    log('Estado carregado: ' + jobs.length + ' job(s), acao=' + _acaoAtual);
    criarPainel(saved, modo);
    // Verifica se algum job running já concluiu em outra aba
    verificarConclusoes();
  }
  // Expõe para o botão do topo (SEMPRE disponível após IIFE carregar)
  window._sejudAbrir = function() { abrir('citar', 'kanban'); };
  // Expõe para o botão de duplicados
  window._sejudAbrirDuplicados = function() { abrir('citar', 'duplicados'); };
  // Expõe para o botão de agrupador
  window._sejudAbrirAgrupador = function() { abrirAgrupadorModal(); };


  function lerSinal(idProcesso) {
    // Canal 1: localStorage — conclusão/falha (remove após ler)
    for (const status of ['done', 'fail']) {
      try {
        const raw = localStorage.getItem('pje-ac-' + status + '-' + idProcesso);
        if (raw) {
          const data = JSON.parse(raw);
          localStorage.removeItem('pje-ac-' + status + '-' + idProcesso);
          return data; // { status, idProcesso, info, ts }
        }
      } catch(e) {}
    }
    // Canal 1b: localStorage — progresso (NÃO remove, é atualizado continuamente)
    try {
      const rawProgress = localStorage.getItem('pje-ac-progress-' + idProcesso);
      if (rawProgress) {
        const data = JSON.parse(rawProgress);
        // Só retorna se for recente (< 10s), senão é progresso stale
        if (Date.now() - data.ts < 10000) {
          return data;
        }
      }
    } catch(e) {}
    // Canal 2: cookie (cross-subdomain fallback)
    try {
      const cookies = document.cookie.split(';');
      for (const c of cookies) {
        const [name, val] = c.trim().split('=');
        if (name === 'pje_ac_status_' + idProcesso) {
          const data = JSON.parse(decodeURIComponent(val));
          // Limpa o cookie
          document.cookie = name + '=;path=/;domain=.tjce.jus.br;max-age=0;SameSite=Lax';
          return data;
        }
      }
    } catch(e) {}
    return null;
  }

  function aplicarSinal(idProcesso, data) {
    const j = jobs.find(j => String(j.idProcesso) === String(idProcesso));
    if (!j) {
      // Job não encontrado neste frame — normal em execução multi-frame
      return false;
    }

    // ⛔ Se o job NÃO está rodando, só aceita o sinal se for um caso de "late signal":
    const isKanbanTimeout = j.status === 'error' && j.erro && (
      j.erro.includes('Timeout') || j.erro.includes('timeout') || j.erro.includes('excedidos')
    );
    if (j.status !== 'running') {
      if (isKanbanTimeout && (data.status === 'done' || data.status === 'fail')) {
        log('🔧 Job ' + j.numero + ' sofreu timeout do kanban — aplicando resultado real: ' + data.status);
      } else if (data.status === 'progress') {
        return false;
      } else {
        return false;
      }
    }

    const info = data.info || {};
    // Armazena logs da automação
    if (info.logs && Array.isArray(info.logs)) {
      if (info.logs.length > 0 || !j.logs || !j.logs.length) {
        j.logs = info.logs;
      }
    }
    // Armazena screenshots (em memória E localStorage)
    if (info.screenshot) {
      if (!j.screenshots) j.screenshots = [];
      if (j.screenshots.length >= 20) j.screenshots.shift();
      var ssEntry = { data: info.screenshot, ts: Date.now(), label: (info.logs && info.logs.length ? info.logs[info.logs.length-1].msg : '').substring(0, 60) };
      j.screenshots.push(ssEntry);
      // Também salva no localStorage como array acumulativo (cross-frame)
      if (j.idProcesso) {
        try {
          var ssKey = 'pje-ss-' + j.idProcesso;
          var ssList = [];
          try { ssList = JSON.parse(localStorage.getItem(ssKey) || '[]'); } catch(e) {}
          if (ssList.length >= 20) ssList.shift();
          ssList.push(ssEntry);
          localStorage.setItem(ssKey, JSON.stringify(ssList));
        } catch(e) {}
      }
      if (j.status === 'running') log('📸 Screenshot #' + j.screenshots.length + ' armazenado para ' + j.numero + ' (' + Math.round(info.screenshot.length / 1024) + 'KB)');
    }
    if (data.status === 'done') {
      // Armazena info da fila final (se veio na resposta)
      if (info.fila) {
        j.filaFinal = info.fila;
        j.filaOk = info.filaOk !== false; // true se undefined ou true
      }
      j.end_time = Date.now();
      // Se a fila final não é a esperada, é ERRO (não sucesso)
      if (info.fila && info.filaOk === false) {
        j.status = 'error';
        j.erro = 'Fila inesperada: ' + info.fila;
        log('⛔ Job com fila inesperada: ' + j.numero + ' — ' + j.erro);
      } else {
        j.status = 'complete';
        j.erro = null;
        log('🎉 Job concluído: ' + j.numero + ' (idProcesso=' + idProcesso + ')' +
            (j.filaFinal ? ' fila=' + j.filaFinal : ''));
      }
    } else if (data.status === 'progress') {
      // Atualiza logs em tempo real (sem mudar status)
      log('🔄 Progresso: ' + j.numero + ' — ' + info.logs.length + ' logs, último: ' + (info.logs[info.logs.length-1].msg||'').substring(0,60));
      return true; // true = re-renderiza o card (mostra última log line)
    } else if (data.status === 'fail') {
      j.status = 'error';
      j.end_time = Date.now();
      j.erro = (info.erro || info.msg || '') ||
               ('Destinatário ' + (info.destinatario || '?') + ' não cadastrado no ' +
                (info.campo || '?') + ' "' + (info.valorEsperado || '?') + '"');
      log('⛔ Job com falha: ' + j.numero + ' — ' + j.erro);
    }
    return true;
  }

  function verificarTimeouts() {
    const agora = Date.now();
    let alterou = false;
    for (const j of jobs) {
      if (j.status !== 'running') continue;
      if (j.timeoutAt && agora > j.timeoutAt) {
        j.status = 'error';
        j.end_time = agora;
        j.erro = 'Timeout: 2 minutos excedidos sem conclusão';
        log('⏰ Timeout: ' + j.numero + ' — 2min excedidos, movendo para erro');
        alterou = true;
      }
    }
    if (alterou) {
      salvarEstado();
      renderKanban();
      // Se liberou vaga, tenta disparar próximo
      if (!jobs.some(j => j.status === 'running') && jobs.some(j => j.status === 'pending')) {
        dispatcharProximo();
      }
    }
  }

  function verificarConclusoes() {
    let alterou = false;
    const agora = Date.now();

    // ══ Fase 1: Jobs rodando — verifica timeout e sinais ══
    const running = jobs.filter(j => j.status === 'running');
    for (const j of running) {
      // ⏰ Verifica timeout (2 min por task)
      if (j.timeoutAt && agora > j.timeoutAt) {
        j.status = 'error';
        j.end_time = agora;
        j.erro = 'Timeout: 2 minutos excedidos sem conclusão';
        log('⏰ Timeout: ' + j.numero + ' — 2min excedidos, movendo para erro');
        alterou = true;
        continue;
      }

      if (!j.idProcesso) continue;
      const sinal = lerSinal(j.idProcesso);
      if (sinal) {
        if (aplicarSinal(j.idProcesso, sinal)) alterou = true;
      }
    }

    // ══ Fase 2: Jobs com timeout do kanban — verifica se chegou sinal real tardio ══
    // Quando o kanban aplica timeout mas a automação conclui depois,
    // o sinal real (done/fail) fica no localStorage/cookie e sobrescreve o timeout.
    const timedOut = jobs.filter(j =>
      j.status === 'error' && j.idProcesso && j.erro && (
        j.erro.includes('Timeout') || j.erro.includes('timeout') || j.erro.includes('excedidos')
      )
    );
    for (const j of timedOut) {
      const sinal = lerSinal(j.idProcesso);
      if (sinal && (sinal.status === 'done' || sinal.status === 'fail')) {
        log('🔧 Sinal tardio detectado para job com timeout: ' + j.numero + ' → ' + sinal.status);
        if (aplicarSinal(j.idProcesso, sinal)) alterou = true;
      }
    }

    if (alterou) {
      salvarEstado();
      renderKanban();
    }

    // Se não tem mais running mas tem pending → dispara próximo
    const aindaRunning = jobs.filter(j => j.status === 'running');
    const temPendente = jobs.some(j => j.status === 'pending');
    if (temPendente && aindaRunning.length === 0) {
      dispatcharProximo();
    }
  }

  // Evento storage (OUTRA aba/iframe escreve no localStorage)
  window.addEventListener('storage', function(e) {
    if (e.key && (e.key.startsWith('pje-ac-done-') || e.key.startsWith('pje-ac-fail-') || e.key.startsWith('pje-ac-progress-'))) {
      log('📡 Storage event: ' + e.key);
      verificarConclusoes();
    }
  });

  // Listener postMessage cross-origin para screenshots do auto-citar.js
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.pjeSsStore) return;
    try {
      var d = e.data;
      var ssKey = 'pje-ss-' + d.idProcesso;
      var ssList = [];
      try { ssList = JSON.parse(localStorage.getItem(ssKey) || '[]'); } catch(ex) {}
      if (ssList.length >= 20) ssList.shift();
      ssList.push(d.entry);
      localStorage.setItem(ssKey, JSON.stringify(ssList));
      log('📸 Screenshot cross-origin recebido e salvo: pje-ss-' + d.idProcesso + ' (' + ssList.length + ' total)');
    } catch(ex) {}
  });

  // BroadcastChannel (cross-tab moderno, mais rápido que storage event)
  // Usa os dados da mensagem diretamente, sem re-ler localStorage/cookie.
  try {
    const kanbanChannel = new BroadcastChannel('pje-kanban');
    kanbanChannel.addEventListener('message', function(e) {
      const d = e.data;
      if (!d || !d.idProcesso || !d.status) return;
      log('📡 BroadcastChannel: ' + d.key);
      if (aplicarSinal(d.idProcesso, d)) {
        salvarEstado();
        renderKanban();
      }
      // Se concluiu/falhou, tenta disparar próximo
      if (d.status === 'done' || d.status === 'fail') {
        dispatcharProximo();
      }
    });
  } catch(e) { log('⚠ BroadcastChannel indisponível'); }

  // chrome.storage.onChanged (cross-origin: frontend.cnj.cloud ↔ pje.tjce.jus.br)
  try {
    chrome.storage.onChanged.addListener(function(changes, area) {
      if (area !== 'local') return;
      for (var key in changes) {
        if (key.startsWith('pje-kanban-signal-')) {
          var d = changes[key].newValue;
          if (!d || !d.idProcesso || !d.status) continue;
          log('📡 chrome.storage: ' + key + ' → ' + d.status + ' fila=' + (d.info?.fila || '?'));
          if (aplicarSinal(d.idProcesso, d)) {
            // Re-render após aplicar sinal
            renderKanban();
            salvarEstado();
            if (d.status === 'done' || d.status === 'fail') verificarFilaConcluida();
          }
        }
      }
    });
    log('👂 chrome.storage.onChanged listener ativo');
  } catch(e) { log('⚠ chrome.storage.onChanged indisponível'); }

  // ══ Polling de fallback (15 em 15s): verifica só timeout ══
  // Progresso e conclusão chegam em tempo real via BroadcastChannel/storage.
  // Este intervalo serve apenas como rede de segurança para timeout (2min).
  setInterval(function() {
    if (jobs.some(j => j.status === 'running')) {
      // Só verifica timeout, sem re-renderizar progresso (evita flicker na coluna)
      verificarTimeouts();
    }
  }, 15000);

