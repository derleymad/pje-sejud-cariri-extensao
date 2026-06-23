// ============================================================
// Mapeamento de Loadings do PJe
// Cada tela/etapa do PJe pode ter um loading diferente.
// Adicione novos seletores conforme for descobrindo.
// ============================================================
(function() {
  if (!window.location.origin.includes('tjce.jus.br')) return;

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const log = (...a) => console.log('[Loadings]', ...a);

  const POLL_FAST = 80; // polling rápido para resposta quase instantânea

  // ══════════════════════════════════════════════════════════
  // REGISTRO DE LOADINGS POR ETAPA
  // ══════════════════════════════════════════════════════════
  const LOADINGS = {

    // ── Loading principal do RichFaces (máscara opaca) ──
    // Aparece ao: clicar em polos, mudar Select2, transições de wizard,
    // radio buttons, e praticamente qualquer ação AJAX no movimentar.seam
    richfacesMask: {
      sel: '#mpLoadingMovimentarDiv',
      desc: 'RichFaces modal mask (mpLoadingMovimentarDiv)',
      visivel: function(el) {
        const style = window.getComputedStyle(el);
        // RichFaces NUNCA remove esta div. Quando o loading termina,
        // ele seta z-index: -1 para esconder atrás do conteúdo.
        // Também pode setar display:none ou opacity:0.
        if (parseInt(style.zIndex) < 0) return false;
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (parseFloat(style.opacity) <= 0.01) return false;
        return true;
      }
    },

    // ── Status indicator do RichFaces (cantos) ──
    richfacesStatus: {
      sel: '#_viewRoot\\:status, span.rich-status, [id*="_viewRoot:status"]',
      desc: 'RichFaces status indicator',
      visivel: function(el) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        // O status é um span que mostra texto durante AJAX e fica vazio/zero quando idle
        const txt = (el.textContent || '').trim();
        if (txt.length === 0) return false;
        if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
        return true;
      }
    },

    // ── BlockUI / jQuery block ──
    blockUI: {
      sel: '.blockUI, .blockOverlay, .blockPage, div.blockUI',
      desc: 'jQuery BlockUI overlay',
      visivel: function(el) {
        return el.offsetParent !== null && window.getComputedStyle(el).display !== 'none';
      }
    },

    // ── Loading do Angular (ng2) ──
    angularSpinner: {
      sel: '.loading-spinner, .ng-loading, [id*="loading"], .spinner, .pje-loading',
      desc: 'Angular/SPA loading spinner',
      visivel: function(el) {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }
    },

    // ── Modal de carregamento "Aguarde..." ──
    modalAguarde: {
      sel: '[id*="aguarde"], [id*="loadingModal"], [id*="carregando"]',
      desc: 'Modal "Aguarde/Carregando"',
      visivel: function(el) {
        return el.offsetParent !== null;
      }
    },

    // ── Overlay de loading dentro do iframe de movimentação ──
    movimentacaoLoading: {
      // ⛔ SÓ a máscara opaca, NÃO os divs de conteúdo.
      // [id*="mpLoading"] pegava mpLoadingMovimentarContentDiv etc que nunca somem.
      sel: '.rich-mpnl-mask-div-opaque',
      desc: 'RichFaces modal panel mask (genérico)',
      visivel: function(el) {
        const style = window.getComputedStyle(el);
        if (parseInt(style.zIndex) < 0) return false;
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (parseFloat(style.opacity) <= 0.01) return false;
        return true;
      }
    },

    // ── AJAX status do JSF (_viewRoot:status) ──
    jsfAjaxStatus: {
      sel: '[id*="_viewRoot:status"], span[id*="ajaxStatus"], [id*="statusModal"]',
      desc: 'JSF AJAX status indicator',
      visivel: function(el) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        // Status só está ativo quando tem texto visível
        const txt = (el.textContent || '').trim();
        if (txt.length === 0) return false;
        if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
        return true;
      }
    },
  };

  // ══════════════════════════════════════════════════════════
  // API PÚBLICA (exposta no window para os outros scripts)
  // ══════════════════════════════════════════════════════════

  /**
   * Verifica se um loading específico está visível agora.
   */
  function _check(nome) {
    const cfg = LOADINGS[nome];
    if (!cfg) return false;
    try {
      const el = document.querySelector(cfg.sel);
      return el && cfg.visivel(el);
    } catch(e) { return false; }
  }

  /**
   * Espera TODOS os loadings conhecidos desaparecerem.
   *
   * FAST PATH: verifica primeiro o richfacesMask (loading principal).
   * Assim que ele some, confirma com um 2º check e retorna rápido.
   * Secundários são verificados depois, sem atrasar o fluxo.
   *
   * @param {string|string[]} etapas - Nomes das etapas ou 'todos'
   * @param {number} timeout - Timeout em ms (default 20000)
   * @returns {Promise<boolean>} - true se todos sumiram
   */
  async function aguardarLoadings(etapas, timeout) {
    if (!etapas || etapas === 'todos') {
      etapas = Object.keys(LOADINGS);
    }
    if (!Array.isArray(etapas)) etapas = [etapas];

    const fim = Date.now() + (timeout || 20000);
    const inicio = Date.now();

    // Separa o loading PRINCIPAL dos secundários
    const principal = etapas.includes('richfacesMask') ? 'richfacesMask' : null;
    const secundarias = etapas.filter(n => n !== principal);

    // ══ FAST PATH: espera só a máscara principal (80ms poll) ══
    if (principal) {
      while (Date.now() < fim) {
        if (!_check(principal)) {
          // Confirmação: 2º check após 1 tick para garantir que sumiu mesmo
          await wait(POLL_FAST);
          if (!_check(principal)) break;
        }
        await wait(POLL_FAST);
      }
    }

    // ══ Secundários: verificação rápida ══
    for (const nome of secundarias) {
      while (Date.now() < fim) {
        if (!_check(nome)) break;
        await wait(POLL_FAST);
      }
    }

    const decorrido = Date.now() - inicio;

    // Verifica se ALGUM loading ainda está visível
    const ainda = etapas.filter(n => _check(n));
    if (ainda.length === 0) {
      // Silencioso se foi rápido (< 200ms)
      if (decorrido > 300) log('✓ Loadings OK em ' + decorrido + 'ms');
      return true;
    }

    // Timeout — diagnóstico
    log('⚠ Timeout loadings (' + decorrido + 'ms):');
    ainda.forEach(n => {
      const cfg = LOADINGS[n];
      if (cfg) log('  ⚠ ' + cfg.desc + ' (' + cfg.sel + ')');
    });
    return false;
  }

  /**
   * Espera as requisições de rede pendentes chegarem a zero.
   * Usa o contador exposto pelo network-monitor.js (MAIN world)
   * via atributo DOM data-pje-pending.
   *
   * @param {number} timeout - Timeout em ms (default 20000)
   * @returns {Promise<boolean>} - true se idle, false se timeout
   */
  async function aguardarRequisicoes(timeout) {
    const fim = Date.now() + (timeout || 20000);
    const inicio = Date.now();
    // RichFaces A4J agenda o XHR com requestDelay:100 (visto em
    // j_id53:org.richfaces.queue.global). Se declararmos idle antes disso, retornamos
    // antes do XHR disparar (idle falso) — o POLL_FAST (80ms) é menor que o delay.
    // Grace period: só considera idle após 250ms sem ver pendência, OU após uma
    // pendência ter aparecido e sumido.
    const GRACE = 250;
    let viuPendente = false;

    while (Date.now() < fim) {
      const pend = parseInt(document.documentElement.getAttribute('data-pje-pending') || '0', 10) || 0;
      if (pend > 0) viuPendente = true;

      if (pend === 0 && (viuPendente || (Date.now() - inicio) >= GRACE)) {
        // Confirmação: espera mais 1 tick e verifica de novo
        await wait(POLL_FAST);
        const pend2 = parseInt(document.documentElement.getAttribute('data-pje-pending') || '0', 10) || 0;
        if (pend2 === 0) {
          const decorrido = Date.now() - inicio;
          if (decorrido > 200) log('✓ Rede ociosa em ' + decorrido + 'ms' + (viuPendente ? '' : ' (sem requisição)'));
          return true;
        }
        viuPendente = true; // apareceu na confirmação
        continue;
      }
      await wait(POLL_FAST);
    }

    const pend = parseInt(document.documentElement.getAttribute('data-pje-pending') || '0', 10) || 0;
    log('⚠ Timeout rede (' + (Date.now()-inicio) + 'ms): ' + pend + ' requisições ainda pendentes');
    return false;
  }

  /**
   * Lista todos os loadings atualmente visíveis na tela.
   * Útil para diagnóstico e descoberta de novos loadings.
   */
  function listarLoadingsVisiveis() {
    const visiveis = [];
    for (const [nome, cfg] of Object.entries(LOADINGS)) {
      try {
        const els = document.querySelectorAll(cfg.sel);
        for (const el of els) {
          if (cfg.visivel(el)) {
            visiveis.push({
              nome: nome,
              desc: cfg.desc,
              sel: cfg.sel,
              classes: el.className || '',
              id: el.id || ''
            });
          }
        }
      } catch(e) {}
    }
    return visiveis;
  }

  /**
   * Registra um novo loading dinamicamente.
   */
  function registrarLoading(nome, sel, desc, visivel) {
    LOADINGS[nome] = {
      sel: sel,
      desc: desc || nome,
      visivel: visivel || function(el) {
        const style = window.getComputedStyle(el);
        return !(style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0');
      }
    };
    log('📝 Loading registrado: ' + nome + ' → ' + (desc || sel));
  }

  // Expõe API no window para outros content scripts
  window._pjeLoadings = {
    aguardar: aguardarLoadings,
    aguardarRequisicoes: aguardarRequisicoes,
    listar: listarLoadingsVisiveis,
    registrar: registrarLoading,
    LOADINGS: LOADINGS
  };

  log('✓ Módulo de loadings OK — ' + Object.keys(LOADINGS).length + ' mapeados (poll ' + POLL_FAST + 'ms)');
  log('  Use _pjeLoadings.listar() para ver loadings visíveis.');
  log('  Use _pjeLoadings.registrar("nome", "seletor", "desc") para adicionar.');
})();
