// ═══════════════════════════════════════════════════════════
// PJe Sejud — Duplicados + Kanban + Painéis
// Depende de: utils.js, infra.js
// ═══════════════════════════════════════════════════════════════

  function setModoDuplicados(modo) {
    // Sempre Direcionado (Completo removido)
    window._dupModo = 'direcionado';

    updateScanButtonText();
  }


  function updateScanButtonText() {
    var scanBtns = [
      document.getElementById('pje-btn-scan-duplicados'),
      document.getElementById('pje-btn-scan-duplicados-inline')
    ];
    scanBtns.forEach(function(btn) {
      if (btn && !btn.disabled) {
        btn.innerHTML = '<i class="fas fa-filter"></i> Escanear (Direcionado)';
      }
    });
  }

  // ══ Fila selector helpers ══

  function popularFilaSelector() {
    var container = document.getElementById('pje-dup-fila-selector');
    if (!container) return;
    var html = '';
    var prevSaved = window._dupFilasSelecionadas;
    FILAS.forEach(function(f, i) {
      var checked;
      if (prevSaved && prevSaved.length > 0) {
        checked = prevSaved.indexOf(i) !== -1;
      } else {
        // Default: apenas a primeira fila (ANALISAR DECISAO)
        checked = (i === 0);
      }
      html += '<span class="dup-fila-check' + (checked ? ' checked' : '') + '" data-index="' + i + '">' +
              '<input type="checkbox" ' + (checked ? 'checked' : '') + '>' +
              '<span class="check-icon">✓</span>' +
              f.substring(0, 55) + '</span>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.dup-fila-check').forEach(function(el) {
      el.addEventListener('click', function() {
        this.classList.toggle('checked');
        this.querySelector('input').checked = this.classList.contains('checked');
        salvarFilasSelecionadas();
      });
    });
    salvarFilasSelecionadas();
  }

  function popularFilaSelectorInline() {
    var container = document.getElementById('pje-dup-fila-selector-inline');
    if (!container) return;
    var html = '';
    var sel = window._dupFilasSelecionadas;
    FILAS.forEach(function(f, i) {
      var checked;
      if (sel && sel.length > 0) {
        checked = sel.indexOf(i) !== -1;
      } else {
        // Default: apenas a primeira fila marcada
        checked = (i === 0);
      }
      html += '<span class="dup-fila-check' + (checked ? ' checked' : '') + '" data-index="' + i + '">' +
              '<input type="checkbox" ' + (checked ? 'checked' : '') + '>' +
              '<span class="check-icon">✓</span>' +
              f.substring(0, 55) + '</span>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.dup-fila-check').forEach(function(el) {
      el.addEventListener('click', function() {
        this.classList.toggle('checked');
        this.querySelector('input').checked = this.classList.contains('checked');
        salvarFilasSelecionadas();
      });
    });
    // Sincroniza o estado inicial (default: primeira fila selecionada) e a contagem
    salvarFilasSelecionadas();
  }

  function salvarFilasSelecionadas() {
    var checks = document.querySelectorAll('#pje-dup-fila-selector .dup-fila-check, #pje-dup-fila-selector-inline .dup-fila-check');
    // Sincroniza ambos os seletores
    var sel = [];
    var primaryChecks = document.querySelectorAll('#pje-dup-fila-selector .dup-fila-check');
    if (primaryChecks.length === 0) primaryChecks = document.querySelectorAll('#pje-dup-fila-selector-inline .dup-fila-check');
    primaryChecks.forEach(function(el) {
      if (el.classList.contains('checked')) sel.push(parseInt(el.getAttribute('data-index')));
    });
    window._dupFilasSelecionadas = sel.length > 0 ? sel : null;
    // Atualiza contagem nos botoes
    var count = sel.length > 0 ? sel.length : 1;
    var countEls = document.querySelectorAll('#pje-dup-filas-count, #pje-dup-filas-count-inline');
    countEls.forEach(function(el) { el.textContent = count; });
  }

  function setupFilasDropdown(suffix) {
    suffix = suffix || '';
    var trigger = document.getElementById('pje-dup-filas-trigger' + suffix);
    var dropdown = document.getElementById('pje-dup-filas-dropdown' + suffix);
    if (!trigger || !dropdown) return;
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target) && e.target !== trigger) {
        dropdown.classList.remove('open');
      }
    });
  }

  function obterFilasSelecionadas() {
    var sel = window._dupFilasSelecionadas;
    if (!sel || sel.length === 0) return [FILAS[0]]; // default: primeira fila
    return sel.map(function(i) { return FILAS[i]; }).filter(Boolean);
  }

  async function escanearDuplicadosDirecionado() {
    var filasAlvo = obterFilasSelecionadas();
    if (filasAlvo.length === 0) {
      mostrarToast('<span>Selecione pelo menos uma fila</span>', 'warning');
      return;
    }
    window._dupScanning = true;
    var modalOpen = !!document.getElementById('pje-dup-modal-overlay');
    var btn = document.getElementById('pje-btn-scan-duplicados');
    var btnInline = document.getElementById('pje-btn-scan-duplicados-inline');
    var statusEl = document.getElementById('pje-scan-status');
    var gridInner = document.getElementById('pje-dup-grid-inner');
    if (modalOpen && btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Escaneando...'; }
    // 🛑 Mostra botão Cancelar no mode bar durante o scan
    var cancelBtn = document.getElementById('pje-dup-cancel-inline');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    // Scan button mostra spinner enquanto escaneia
    if (btnInline) {
      btnInline.disabled = true;
      btnInline.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:fa-spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Escaneando...';
    }
    var dashboard = document.getElementById('pje-dup-dashboard');
    if (dashboard) dashboard.style.display = 'none';
    var summaryEl = document.getElementById('pje-scan-summary');
    if (summaryEl) summaryEl.style.display = 'none';
    var dateEl = document.getElementById('pje-dup-date-filter') || document.getElementById('pje-dup-date-filter-inline');
    var campoDataEl = document.getElementById('pje-dup-campo-data-inline');
    var campoData = campoDataEl ? campoDataEl.value : 'dataChegada';
    var dias = parseInt(dateEl ? dateEl.value : '1');
    var threshold = dias > 0 ? Date.now() - (dias * 86400000) : 0;
    var campoLabel = campoData === 'ultimoMovimento' ? 'ultimoMovimento' : 'dataChegada';
    if (gridInner) {
      gridInner.innerHTML = '<div class="dup-grid-scanning"><div class="pje-scan-status-bar"><i class="fas fa-sync-alt fa-spin"></i> Modo Direcionado: buscando processos recentes em <strong>' + filasAlvo.length + '</strong> fila(s)...</div><i class="fas fa-sync-alt scan-spinner"></i><span class="scan-text">Filtrando por ' + campoLabel + ' + consultando /tarefas por processo</span></div>';
    }
    mostrarToast(
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-spin" style="animation:fa-spin 1s linear infinite;flex-shrink:0"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;margin-bottom:2px">Scan Direcionado</div><div id="pje-scan-toast-progress" style="font-size:11px;color:#64748b">Buscando processos...</div></div>',
      'info', { id: 'scan', persistente: true }
    );
    console.group('Scan Direcionado - ' + filasAlvo.length + ' fila(s), ultimos ' + (dias || 'todos') + ' dias, campo=' + campoData);
    var processosUnicos = {};
    var abortCtrl = new AbortController();
    window._dupAbort = function() { abortCtrl.abort(); };
    for (var f = 0; f < filasAlvo.length; f++) {
      if (abortCtrl.signal.aborted) break;
      try {
        var url = API + '/recuperarProcessosTarefaPendenteComCriterios/' + encodeURIComponent(filasAlvo[f]) + '/false';
        var pagina = 0, MAX_PAG = 10;
        do {
          var r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numeroProcesso: '', classe: null, tags: [], page: pagina, maxResults: 1000, competencia: '' }) });
          if (!r.ok) break;
          var data = await r.json();
          var entities = data.entities || [];
          entities.forEach(function(ent) {
            if (ent.numeroProcesso && ent.idProcesso && ent[campoData]) {
              if (threshold === 0 || ent[campoData] >= threshold) {
                if (!processosUnicos[ent.numeroProcesso]) {
                  processosUnicos[ent.numeroProcesso] = { idProcesso: ent.idProcesso, dataChegada: ent.dataChegada, ultimoMovimento: ent.ultimoMovimento, filaOrigem: filasAlvo[f] };
                }
              }
            }
          });
          pagina++;
          if (entities.length < 1000) break;
          var lastEnt = entities[entities.length - 1];
          if (lastEnt && lastEnt[campoData] && threshold > 0 && lastEnt[campoData] < threshold) break;
        } while (pagina < MAX_PAG);
      } catch(e) { console.error('Erro na fila ' + filasAlvo[f] + ': ' + e.message); }
    }
    var numerosUnicos = Object.keys(processosUnicos);
    // Se foi cancelado ou não achou processos, limpa UI e sai
    if (abortCtrl.signal.aborted || numerosUnicos.length === 0) {
      window._dupResults = []; window._dupTotalProc = 0; window._dupTotalFilas = filasAlvo.length; window._dupTodasFilas = []; window._dupScanning = false;
      var cancelBtnEarly = document.getElementById('pje-dup-cancel-inline'); if (cancelBtnEarly) cancelBtnEarly.style.display = 'none';
      if (btnInline) { btnInline.disabled = false; btnInline.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>Escanear'; }
      removerToast('scan');
      if (statusEl) statusEl.style.display = 'none';
      if (modalOpen && btn) { btn.disabled = false; updateScanButtonText(); }
      if (gridInner) gridInner.innerHTML = '<div class="dup-grid-empty"><i class="fas fa-' + (abortCtrl.signal.aborted ? 'ban" style="color:#dc2626;opacity:.5' : 'check-circle" style="color:#10b981;opacity:.5') + '"></i><p>' + (abortCtrl.signal.aborted ? 'Scan cancelado pelo usuário' : 'Nenhum processo encontrado nos ultimos ' + (dias || 'todos') + ' dias') + '</p></div>';
      if (abortCtrl.signal.aborted) { mostrarToast('<span>🚫 Scan cancelado</span>', 'warning', { duracao: 4000 }); salvarResultadosDuplicados(); console.groupEnd(); return; }
      mostrarToast('<span>Nenhum processo nos ultimos ' + (dias || 'todos') + ' dias</span>', 'info', { duracao: 5000 });
      salvarResultadosDuplicados();
      console.groupEnd();
      return;
    }
    if (statusEl) statusEl.textContent = 'Consultando /tarefas para ' + numerosUnicos.length + ' processos...';
    var progressEl = document.getElementById('pje-scan-toast-progress');
    var mapa = {}, LOTE2 = 6;
    for (var b = 0; b < numerosUnicos.length; b += LOTE2) {
      if (abortCtrl.signal.aborted) break;
      var loteNums = numerosUnicos.slice(b, Math.min(b + LOTE2, numerosUnicos.length));
      var tarefasTarefas = loteNums.map(function(num) {
        return fetch(API + '/tarefas', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numeroProcesso: num, competencia: '', etiquetas: [] }) })
          .then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
      });
      var resultadosTarefas = await Promise.allSettled(tarefasTarefas);
      resultadosTarefas.forEach(function(rt, k) {
        var num = loteNums[k], procInfo = processosUnicos[num];
        if (rt.status === 'fulfilled' && rt.value && Array.isArray(rt.value)) {
          var primeiro = rt.value[0];
          var filasDoProcesso = rt.value.map(function(t) { return t.nome; });
          if (filasDoProcesso.length >= 2) mapa[num] = { filas: filasDoProcesso, idProcesso: procInfo.idProcesso, idTaskInstance: primeiro.idTaskInstance || primeiro.id || '' };
        }
      });
      var consultados = Math.min(b + LOTE2, numerosUnicos.length);
      if (progressEl) progressEl.textContent = consultados + ' de ' + numerosUnicos.length + ' processos consultados';
    }
    delete window._dupAbort;
    var duplicados = [];
    for (var num in mapa) {
      if (mapa[num].filas.length >= 2) duplicados.push({ numero: num, filas: mapa[num].filas, idProcesso: mapa[num].idProcesso, idTaskInstance: mapa[num].idTaskInstance || '' });
    }
    duplicados.sort(function(a, b) { return b.filas.length - a.filas.length; });
    console.log('Direcionado: ' + duplicados.length + ' duplicados de ' + numerosUnicos.length + ' processos');
    console.groupEnd();
    window._dupResults = duplicados; window._dupTotalProc = numerosUnicos.length; window._dupTotalFilas = filasAlvo.length;
    window._dupTodasFilas = duplicados.reduce(function(acc, d) { d.filas.forEach(function(f) { if (acc.indexOf(f) === -1) acc.push(f); }); return acc; }, []).sort();
    window._dupScanning = false;
    // 🧹 Esconde botão Cancelar e restaura botão Escanear
    var cancelBtnDone = document.getElementById('pje-dup-cancel-inline');
    if (cancelBtnDone) cancelBtnDone.style.display = 'none';
    if (btnInline) { btnInline.disabled = false; btnInline.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>Escanear'; }
    salvarResultadosDuplicados();
    if (statusEl) statusEl.style.display = 'none';
    if (modalOpen && btn) { btn.disabled = false; updateScanButtonText(); }
    removerToast('scan');
    mostrarToast('<span>Scan Direcionado: <strong>' + duplicados.length + '</strong> duplicado(s)</span>', duplicados.length > 0 ? 'success' : 'info', { duracao: 6000 });
    if (modalOpen) {
      var toolbar = document.getElementById('pje-dup-toolbar');
      if (toolbar) toolbar.style.display = 'block';
      renderFilaFilters(); aplicarFiltrosDuplicados();
      var dashboard2 = document.getElementById('pje-dup-dashboard');
      if (dashboard2) {
        dashboard2.style.display = 'grid';
        var sc = document.getElementById('pje-dup-stat-count'); if (sc) sc.textContent = duplicados.length;
        var sf = document.getElementById('pje-dup-stat-filas'); if (sf) sf.textContent = window._dupTodasFilas.length;
        var st = document.getElementById('pje-dup-stat-total'); if (st) st.textContent = numerosUnicos.length.toLocaleString('pt-BR');
        var sl = document.getElementById('pje-dup-stat-lastscan'); if (sl) sl.textContent = formatarUltimoScan(window._dupLastScan || Date.now());
      }
      var summaryEl2 = document.getElementById('pje-scan-summary');
      if (summaryEl2) {
        summaryEl2.style.display = 'block';
        summaryEl2.innerHTML = '<div class="dup-sum-line"><span class="dup-sum-tag dup-tag-red">' + duplicados.length + ' duplicados</span><span class="dup-sum-of">de</span><span class="dup-sum-tag dup-tag-gray">' + numerosUnicos.length + ' processos</span></div>';
      }
    }
    var inlinePanel = document.getElementById('pje-dup-panel');
    if (inlinePanel && inlinePanel.style.display !== 'none' && window._pjeAtualizarPainelDuplicados) {
      window._pjeAtualizarPainelDuplicados();
    }
  }

  async function escanearDuplicados() {
    // Marca scanning global
    window._dupScanning = true;

    var modalOpen = !!document.getElementById('pje-dup-modal-overlay');
    var btn = $('#pje-btn-scan-duplicados');
    var statusEl = $('#pje-scan-status');
    var summaryEl = $('#pje-scan-summary');
    var gridInner = $('#pje-dup-grid-inner');

    if (modalOpen && btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Escaneando...';
    }
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Consultando ' + FILAS.length + ' filas...'; }
    if (summaryEl) summaryEl.style.display = 'none';

    var dashboard = $('#pje-dup-dashboard');
    if (dashboard) dashboard.style.display = 'none';
    var totalFilas = FILAS.length;
    if (gridInner) {
      gridInner.innerHTML = '<div class="dup-grid-scanning"><div class="pje-scan-status-bar"><i class="fas fa-sync-alt fa-spin"></i> Escaneando <strong>' + totalFilas + '</strong> filas em busca de processos duplicados...</div><i class="fas fa-sync-alt scan-spinner"></i><span class="scan-text">Isso pode levar alguns segundos...</span></div>';
    }

    var mapa = {};
    // Guarda contagem por fila para relatório de verificação
    var contagemPorFila = [];

    console.group('🔍 [PJe Duplicados] Scan iniciado — ' + totalFilas + ' filas');
    console.log('⏰ Início: ' + new Date().toLocaleTimeString('pt-BR'));

    // Toast de scanning persistente (shadcn-style)
    var scanToast = mostrarToast(
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-spin" style="animation:fa-spin 1s linear infinite;flex-shrink:0"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;margin-bottom:2px">Escaneando processos</div><div id="pje-scan-toast-progress" style="font-size:11px;color:#64748b">0 de ' + totalFilas + ' filas consultadas</div></div>',
      'info', { id: 'scan', persistente: true }
    );

    for (var f = 0; f < totalFilas; f++) {
      if (statusEl) statusEl.textContent = 'Fila ' + (f+1) + '/' + totalFilas + ': ' + FILAS[f].substring(0, 45) + '...';
      // Atualiza toast de progresso
      var progressEl = document.getElementById('pje-scan-toast-progress');
      if (progressEl) progressEl.textContent = (f+1) + ' de ' + totalFilas + ' filas consultadas';
      try {
        var url = API + '/recuperarProcessosTarefaPendenteComCriterios/'
                + encodeURIComponent(FILAS[f]) + '/false';
        var todosEntities = [];
        var totalNaFila = 0;
        var pagina = 0;
        var MAX_PAGINAS = 10; // segurança: máximo 10 mil processos por fila
        var truncado = false;

        // Paginação: busca todas as páginas até esgotar os resultados
        do {
          var r = await fetch(url, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numeroProcesso: '', classe: null, tags: [], page: pagina, maxResults: 1000, competencia: '' })
          });
          if (!r.ok) {
            if (pagina === 0) {
              console.warn('  ⚠ Fila ' + (f+1) + ' retornou HTTP ' + r.status + ': ' + FILAS[f].substring(0, 50));
              if (statusEl) statusEl.textContent += ' (' + r.status + ')';
              contagemPorFila.push({ fila: FILAS[f], count: 0, total: 0, status: r.status });
            }
            break;
          }
          var data = await r.json();
          var entities = data.entities || [];
          if (pagina === 0) totalNaFila = data.count || entities.length;
          todosEntities = todosEntities.concat(entities);
          pagina++;
          // Se veio menos que 1000, é a última página
          if (entities.length < 1000) break;
          // Pequena pausa entre páginas para não sobrecarregar
          if (entities.length >= 1000) await new Promise(function(r) { setTimeout(r, 150); });
        } while (pagina < MAX_PAGINAS);

        truncado = totalNaFila > todosEntities.length;

        // Log por fila no console
        console.log(
          '  📋 Fila ' + (f+1) + '/' + totalFilas + ': ' +
          todosEntities.length + '/' + totalNaFila + ' processos' +
          (truncado ? ' ⚠️ TRUNCADO (max ' + (MAX_PAGINAS * 1000) + ')' : '') +
          (pagina > 1 ? ' [' + pagina + ' páginas]' : '') +
          ' — ' + FILAS[f].substring(0, 55)
        );

        todosEntities.forEach(function(ent) {
          if (ent.numeroProcesso && ent.idProcesso) {
            if (!mapa[ent.numeroProcesso]) {
              mapa[ent.numeroProcesso] = { filas: [], idProcesso: ent.idProcesso };
            }
            if (mapa[ent.numeroProcesso].filas.indexOf(FILAS[f]) === -1) {
              mapa[ent.numeroProcesso].filas.push(FILAS[f]);
            }
          }
        });

        contagemPorFila.push({ fila: FILAS[f], count: todosEntities.length, total: totalNaFila, truncado: truncado });

        if (statusEl) {
          var aviso = todosEntities.length + '/' + totalNaFila;
          if (truncado) aviso += ' ⚠';
          if (pagina > 1) aviso += ' [' + pagina + 'p]';
          statusEl.textContent += ' (' + aviso + ')';
        }
      } catch(e) {
        console.error('  ❌ Fila ' + (f+1) + ' ERRO: ' + e.message + ' — ' + FILAS[f].substring(0, 50));
        if (statusEl) statusEl.textContent += ' (erro)';
        contagemPorFila.push({ fila: FILAS[f], count: 0, total: 0, erro: e.message });
      }
      await new Promise(function(r) { setTimeout(r, 200); });
    }

    // Filtra só duplicados (2+ filas diferentes)
    var duplicados = [];
    for (var num in mapa) {
      if (mapa[num].filas.length >= 2) {
        duplicados.push({ numero: num, filas: mapa[num].filas, idProcesso: mapa[num].idProcesso, idTaskInstance: '' });
      }
    }
    duplicados.sort(function(a, b) { return b.filas.length - a.filas.length; });

    // ══════════════════════════════════════════════════════════
    // 📊 RELATÓRIO DE VERIFICAÇÃO NO CONSOLE
    // ══════════════════════════════════════════════════════════
    var totalProcUnicos = Object.keys(mapa).length;
    console.log('── ── ── ── ── ── ── ── ── ── ── ──');
    console.log('📊 RESUMO DO SCAN:');
    console.log('   Total de filas consultadas: ' + totalFilas);
    console.log('   Total de processos únicos:  ' + totalProcUnicos.toLocaleString('pt-BR'));
    console.log('   Processos duplicados:       ' + duplicados.length + ' (' + (totalProcUnicos > 0 ? (duplicados.length / totalProcUnicos * 100).toFixed(1) : '0') + '%)');
    console.log('   Processos sem duplicação:   ' + (totalProcUnicos - duplicados.length).toLocaleString('pt-BR'));
    console.log('');

    // Tabela de contagem por fila
    console.log('📋 CONTAGEM POR FILA:');
    console.table(
      contagemPorFila.map(function(c) {
        return {
          'Fila': c.fila.substring(0, 70),
          'Processos': c.count + '/' + c.total + (c.truncado ? ' ⚠️' : ''),
          'Status': c.erro || ('HTTP ' + (c.status || '200'))
        };
      })
    );

    // Lista detalhada dos duplicados
    if (duplicados.length > 0) {
      console.log('');
      console.log('🔴 PROCESSOS DUPLICADOS (' + duplicados.length + '):');
      console.log('');
      duplicados.forEach(function(d, i) {
        console.log(
          '  ' + (i+1) + '. ' + d.numero +
          '  → ' + d.filas.length + ' filas' +
          '  (idProcesso: ' + d.idProcesso + ')'
        );
        d.filas.forEach(function(fila, j) {
          console.log('     [' + (j+1) + '] ' + fila);
        });
        console.log('');
      });

      // Resumo de distribuição: quantos processos em quantas filas
      var distStats = {};
      duplicados.forEach(function(d) {
        var n = d.filas.length;
        distStats[n] = (distStats[n] || 0) + 1;
      });
      console.log('📈 DISTRIBUIÇÃO DE DUPLICADOS:');
      Object.keys(distStats).sort(function(a,b){ return Number(a)-Number(b); }).forEach(function(k) {
        console.log('   ' + k + ' filas: ' + distStats[k] + ' processo(s)');
      });
    } else {
      console.log('');
      console.log('✅ NENHUM processo duplicado encontrado!');
      console.log('   Todos os ' + totalProcUnicos.toLocaleString('pt-BR') + ' processos estão em apenas 1 fila.');
    }

    console.log('── ── ── ── ── ── ── ── ── ── ── ──');
    console.log('⏰ Fim: ' + new Date().toLocaleTimeString('pt-BR'));
    console.groupEnd();

    if (statusEl) statusEl.style.display = 'none';
    if (modalOpen && btn) {
      btn.disabled = false;
      updateScanButtonText();
    }

    // Guarda resultados globalmente
    window._dupResults = duplicados;
    window._dupTotalProc = Object.keys(mapa).length;
    window._dupTotalFilas = totalFilas;
    window._dupTodasFilas = duplicados.reduce(function(acc, d) {
      d.filas.forEach(function(f) { if (acc.indexOf(f) === -1) acc.push(f); });
      return acc;
    }, []).sort();
    window._dupScanning = false;

    // Persiste no sessionStorage (sobrevive a refresh)
    salvarResultadosDuplicados();

    var total = window._dupTotalProc;

    // Se modal estiver aberto, atualiza os elementos visuais
    if (modalOpen) {
      var toolbar = $('#pje-dup-toolbar');
      if (toolbar) toolbar.style.display = 'block';
      renderFilaFilters();
      aplicarFiltrosDuplicados();

      if (summaryEl) {
        summaryEl.style.display = 'block';
        summaryEl.innerHTML =
          '<div class="dup-sum-line">' +
            '<span class="dup-sum-tag dup-tag-red">' + duplicados.length + ' duplicados</span>' +
            '<span class="dup-sum-of">de</span>' +
            '<span class="dup-sum-tag dup-tag-gray">' + total.toLocaleString('pt-BR') + ' processos</span>' +
            '<span class="dup-sum-of">em</span>' +
            '<span class="dup-sum-tag dup-tag-blue">' + totalFilas + ' filas</span>' +
          '</div>';
      }

      var dashboard = $('#pje-dup-dashboard');
      if (dashboard) {
        dashboard.style.display = 'grid';
        var statCount = $('#pje-dup-stat-count');
        var statFilas = $('#pje-dup-stat-filas');
        var statTotal = $('#pje-dup-stat-total');
        var statLastScan = $('#pje-dup-stat-lastscan');
        if (statLastScan) {
          statLastScan.textContent = formatarUltimoScan(window._dupLastScan || Date.now());
        }
        if (statCount) statCount.textContent = duplicados.length;
        if (statFilas) statFilas.textContent = window._dupTodasFilas.length;
        if (statTotal) statTotal.textContent = total.toLocaleString('pt-BR');
      }
    }

    // Atualiza também o painel inline (se visível)
    var inlinePanel = document.getElementById('pje-dup-panel');
    if (inlinePanel && inlinePanel.style.display !== 'none' && window._pjeAtualizarPainelDuplicados) {
      window._pjeAtualizarPainelDuplicados();
    }

    // Finaliza toast de scan com resultado
    removerToast('scan');
    if (duplicados.length > 0) {
      mostrarToast(
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;margin-bottom:1px">Scan concluído</div><div style="font-size:11px;color:#64748b">' + duplicados.length + ' duplicado(s) em ' + totalFilas + ' filas</div></div>',
        'success', { duracao: 6000 }
      );
    } else {
      mostrarToast(
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;margin-bottom:1px">Nenhum duplicado</div><div style="font-size:11px;color:#64748b">' + total + ' processos em ' + totalFilas + ' filas, todos únicos</div></div>',
        'info', { duracao: 5000 }
      );
    }

  }

  function fecharModalDuplicados() {
    var overlay = document.getElementById('pje-dup-modal-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = ''; // restaura scroll
  }

  // Estilos do modal de duplicados (chamado por criarPainel)
  function injetarEstilosModal() {
    if (document.getElementById('pje-dup-modal-style')) return;
    var s = document.createElement('style');
    s.id = 'pje-dup-modal-style';
    s.textContent = substituirCores(`
#pje-dup-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:2147483647;display:flex;align-items:center;justify-content:center}
#pje-dup-modal-box{background:#fff;border-radius:14px;width:96vw;max-width:1300px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35)}
#pje-dup-modal-header{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:16px 24px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
#pje-dup-modal-header h3{font-size:17px;font-weight:600;display:flex;align-items:center;gap:10px;margin:0}
#pje-dup-modal-close{background:rgba(255,255,255,.12);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center}
#pje-dup-modal-close:hover{background:rgba(255,255,255,.22)}
#pje-dup-modal-body{flex:1;overflow-y:auto;padding:24px;min-height:300px;background:#f8fafc}
#pje-dup-modal-footer{padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#64748b;background:#fff;border-radius:0 0 14px 14px;flex-shrink:0}
.dup-dashboard-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-bottom:18px}
.dup-stat-card{background:#fff;border-radius:12px;padding:16px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 4px rgba(0,0,0,.04);border:1px solid #e2e8f0}
.dup-stat-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.dup-stat-info{display:flex;flex-direction:column;gap:2px}
.dup-stat-value{font-size:28px;font-weight:800;color:#0f172a;line-height:1}
.dup-stat-label{font-size:12px;color:#64748b;font-weight:500}
.dup-search-wrap{position:relative;display:flex;align-items:center}
.dup-search-wrap i{position:absolute;left:12px;color:#94a3b8;font-size:13px;z-index:1}
.dup-search-wrap input{width:100%;padding:10px 14px 10px 38px;border:2px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:inherit;background:#fff;color:#1e293b;outline:none;box-sizing:border-box}
.dup-search-wrap input:focus{border-color:#0f172a;box-shadow:0 0 0 1px #0f172a,0 1px 2px rgba(0,0,0,.05)}
.dup-fila-filters{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.dup-fila-pill{padding:5px 12px;border:1.5px solid #e2e8f0;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;background:#fff;color:#64748b;white-space:nowrap;user-select:none;margin:2px 3px}
.dup-fila-pill:hover{border-color:#64748b;color:#475569}
.dup-fila-pill.active{background:#475569;border-color:#475569;color:#fff}
.dup-fila-pill.all{font-weight:700}
.dup-fila-pill .pill-count{font-size:10px;font-weight:700;background:rgba(0,0,0,.08);color:inherit;padding:1px 6px;border-radius:10px;margin-right:2px;min-width:18px;text-align:center;display:inline-block}
.dup-fila-pill.active .pill-count{background:rgba(255,255,255,.2)}
#pje-dup-grid-inner{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;align-content:start}
.pje-dup-card-kanban{background:#fff;border-radius:14px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,.04);border:1px solid #e2e8f0;display:flex;flex-direction:column}
.pje-dup-card-kanban:hover{box-shadow:0 6px 20px rgba(0,0,0,.08);transform:translateY(-2px);border-color:#cbd5e1}
.pje-dup-card-kanban .dup-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.pje-dup-card-kanban .dup-card-num{font-family:monospace;font-size:14px;font-weight:700;color:#0f172a}
.pje-dup-card-kanban .dup-card-badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:14px;background:#fef2f2;color:#dc2626}
.pje-dup-card-kanban .dup-card-filas{flex:1;display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.pje-dup-card-kanban .dup-card-fila-row{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:12px;color:#475569}
.pje-dup-card-kanban .dup-card-fila-row i{font-size:6px;color:#94a3b8;flex-shrink:0}
.pje-dup-card-kanban .dup-card-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:auto}
.pje-dup-card-kanban .dup-card-btn{padding:6px 14px;border:1.5px solid #64748b;border-radius:8px;background:#fff;color:#64748b;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px}
.pje-dup-card-kanban .dup-card-btn:hover{background:#475569;color:#fff}
.pje-dup-card-kanban .dup-card-copy{padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#94a3b8;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.pje-dup-card-kanban .dup-card-copy:hover{background:#f8fafc;color:#64748b;border-color:#64748b}
.dup-grid-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;color:#94a3b8;gap:12px;text-align:center;min-height:250px;width:100%;grid-column:1/-1}
.dup-grid-empty i{font-size:48px;opacity:.3}
.dup-grid-empty p{font-size:14px;font-weight:500}
.dup-grid-scanning{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:16px;min-height:300px;width:100%;grid-column:1/-1;text-align:center}
.dup-grid-scanning .scan-spinner{font-size:40px;color:#64748b;animation:fa-spin 1s linear infinite}
.dup-grid-scanning .scan-text{font-size:14px;color:#64748b;font-weight:500}
.pje-scan-status-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:14px;font-size:12px;color:#475569;font-weight:500}
.pje-scan-status-bar i{color:#64748b}
.pje-btn-scan{padding:6px 12px;border:1.5px solid #64748b;border-radius:8px;background:#fff;color:#64748b;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px}
.pje-btn-scan:hover{background:#f8fafc}
.pje-btn-scan:disabled{opacity:.5;cursor:not-allowed}
.dup-sum-line{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px}
.dup-sum-tag{padding:4px 10px;border-radius:6px;font-weight:700;font-size:12px}
.dup-tag-red{background:#fee2e2;color:#991b1b}
.dup-tag-gray{background:#f1f5f9;color:#475569}
.dup-tag-blue{background:#f1f5f9;color:#475569}
.dup-sum-of{color:#94a3b8;font-weight:500;font-size:10px}
@keyframes cardFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.dup-mode-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;padding:8px 12px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0}
.dup-mode-toggle{display:inline-flex;background:#e2e8f0;border-radius:8px;padding:2px;border:1px solid #cbd5e1}
.dup-mode-btn{min-height:32px;padding:4px 14px 3px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:#64748b;font-family:inherit;border-radius:6px;transition:all .15s;white-space:nowrap;position:relative}
.dup-mode-btn:hover{color:#334155}
.dup-mode-btn.active{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,.1);font-weight:700}
.dup-mode-btn.active::after{content:'';position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:14px;height:2px;background:#0f172a;border-radius:1px}
.dup-toggle-label{display:block;font-size:9px;font-weight:400;color:#94a3b8;margin-top:0;letter-spacing:0;line-height:1.1}
.dup-mode-btn.active .dup-toggle-label{color:#64748b}
.dup-config-label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.dup-date-select{height:32px;padding:0 28px 0 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-family:inherit;background:#fff;color:#0f172a;cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%2364748b' d='M1 1l4 4 4-4'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 8px center;transition:border-color .15s;outline:none}
.dup-date-select:hover{border-color:#94a3b8}
.dup-filas-trigger{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#0f172a;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s;white-space:nowrap}
.dup-filas-trigger:hover{border-color:#94a3b8;background:#f8fafc}
.dup-filas-trigger .count{background:#e2e8f0;color:#475569;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700}
.dup-filas-dropdown{display:none;position:absolute;top:100%;left:0;margin-top:4px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:2147483646;min-width:300px;max-height:260px;overflow-y:auto;padding:6px}
.dup-filas-dropdown.open{display:block}
.dup-filas-wrap{position:relative}
.dup-fila-check{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:6px;font-size:11px;font-weight:400;cursor:pointer;color:#334155;user-select:none;transition:background .1s}
.dup-fila-check:hover{background:#f1f5f9}
.dup-fila-check.checked{background:#f8fafc;color:#475569;font-weight:500}
.dup-fila-check input{display:none}
.dup-fila-check .check-icon{width:14px;height:14px;border:2px solid #cbd5e1;border-radius:3px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;font-size:9px;color:transparent}
.dup-fila-check.checked .check-icon{background:#64748b;border-color:#64748b;color:#fff}
.dup-select-all{font-size:10px;color:#475569;cursor:pointer;font-weight:600;user-select:none;white-space:nowrap;padding:5px 8px;border-radius:5px;transition:all .1s}
.dup-select-all:hover{background:#f1f5f9;color:#0f172a}
`);
    document.head.appendChild(s);
  }

  function salvarResultadosDuplicados() {
    try {
      var ts = Date.now();
      window._dupLastScan = ts;
      sessionStorage.setItem(DUP_STORAGE_KEY, JSON.stringify({
        results: window._dupResults || [],
        totalProc: window._dupTotalProc || 0,
        totalFilas: window._dupTotalFilas || 0,
        todasFilas: window._dupTodasFilas || [],
        ts: ts
      }));
    } catch(e) {}
  }
  function carregarResultadosDuplicados() {
    try {
      var raw = sessionStorage.getItem(DUP_STORAGE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      window._dupResults = data.results || [];
      window._dupTotalProc = data.totalProc || 0;
      window._dupTotalFilas = data.totalFilas || 0;
      window._dupTodasFilas = data.todasFilas || [];
      window._dupLastScan = data.ts || null;
      return window._dupResults.length > 0;
    } catch(e) { return false; }
  }
  // Flag de scanning global
  window._dupScanning = false;


  function renderKanban() {
    ['pending','running','complete','error'].forEach(col => {
      const body = $('#pje-kanban-col-' + col);
      if (!body) return;
      const items = jobs.filter(j => j.status === col).reverse();
      body.innerHTML = items.map(j => {
        const statusColors = { running: '#3b82f6', complete: '#10b981', error: '#ef4444', pending: '#f59e0b' };
        const statusLabels = { running: 'Em execução', complete: 'Concluído', error: 'Erro', pending: 'Aguardando' };
        const progressMap = { running: 65, complete: 100, error: 0, pending: 0 };
        const color = statusColors[j.status] || '#94a3b8';
        const label = statusLabels[j.status] || '?';
        const progress = progressMap[j.status] || 0;
        const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--';
        const startStr = j.start_time ? fmtTime(j.start_time) : '--:--';
        const endStr = j.end_time ? fmtTime(j.end_time) : '--:--';
        const durationStr = (j.start_time && j.end_time)
          ? Math.round((j.end_time - j.start_time) / 1000) + 's'
          : (j.start_time && j.status === 'running'
            ? Math.round((Date.now() - j.start_time) / 1000) + 's'
            : '');
        // fila info
        let filaHtml = '';
        if (j.fila) filaHtml += '<div class="bot-fila"><i class="fas fa-inbox"></i> ' + j.fila.substring(0,55) + '</div>';
        if (j.filaFinal) {
          const cls = j.filaOk ? 'bot-fila-final' : 'bot-fila-final unexpected';
          const icon = j.filaOk ? '✅' : '⚠️';
          filaHtml += '<div class="' + cls + '">' + icon + ' ' + j.filaFinal.substring(0,55) + '</div>';
        }
        // last log / error
        let lastLogHtml = '';
        if (j.erro) {
          lastLogHtml = '<div class="bot-last-log" style="color:#dc2626;background:#fef2f2"><i class="fas fa-exclamation-circle"></i> ' + j.erro.substring(0,80) + '</div>';
        } else if (j.status === 'complete') {
          lastLogHtml = '<div class="bot-last-log"><i class="fas fa-circle" style="font-size:5px;vertical-align:middle;margin-right:6px;color:#94a3b8"></i> Fluxo concluído</div>';
        } else if (j.status === 'running') {
          if (j.logs && j.logs.length) {
            var last = j.logs[j.logs.length - 1];
            lastLogHtml = '<div class="bot-last-log"><i class="fas fa-circle" style="font-size:5px;vertical-align:middle;margin-right:6px;color:#3b82f6"></i> ' + last.msg.substring(0,80) + '</div>';
          } else {
            lastLogHtml = '<div class="bot-last-log"><i class="fas fa-circle" style="font-size:5px;vertical-align:middle;margin-right:6px;color:#94a3b8"></i> Automatizando...</div>';
          }
        } else {
          lastLogHtml = '<div class="bot-last-log"><i class="fas fa-circle" style="font-size:5px;vertical-align:middle;margin-right:6px;color:#94a3b8"></i> Aguardando início...</div>';
        }
        // actions
        let actionsHtml = '';
        if (j.status === 'error') {
          actionsHtml = '<button class="card-action-btn card-action-retry" onclick="event.stopPropagation();" title="Tentar novamente"><i class="fas fa-redo"></i></button>';
        }
        return '<div class="bot-card ' + j.status + '" style="cursor:pointer" data-job-id="' + j.id + '">' +
          '<div class="bot-header">' +
            '<span class="bot-processo"><i class="fas fa-file-alt"></i> ' + j.numero + '</span>' +
            '<span class="bot-status-badge" style="background:' + color + '15;color:' + color + '">' + label + '</span>' +
          '</div>' +
          '<div class="progress-bar"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
          '<div class="bot-times"><span><i class="far fa-clock"></i> ' + startStr + '</span>' + (durationStr ? '<span style="font-weight:600;color:#0f172a">⏱ ' + durationStr + '</span>' : '') + '<span><i class="fas fa-flag-checkered"></i> ' + endStr + '</span></div>' +
          filaHtml +
          lastLogHtml +
          '<div class="bot-actions"' + (actionsHtml ? '' : ' style="display:none"') + '>' + actionsHtml + '</div>' +
        '</div>';
      }).join('') || '<div class="empty-state"><i class="fas fa-inbox"></i><p>Nenhum processo</p></div>';
    });
    // Counts
    ['pending','running','complete','error'].forEach(col => {
      const el = $('#pje-count-' + col);
      if (el) el.textContent = jobs.filter(j => j.status === col).length;
    });
  }

  function addJob(numero) {
    const id = 'job-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
    jobs.push({ id, numero, status: 'pending', fila: null, idProcesso: null, erro: null,
                start_time: null, end_time: null });
    log('Job adicionado:', id, numero);
    renderKanban();
    return id;
  }


  function updateJob(id, updates) {
    const j = jobs.find(j => j.id === id);
    if (j) {
      const oldStatus = j.status;
      Object.assign(j, updates);
      // Inicializa logs e screenshots quando o job começa a rodar
      if (updates.status === 'running' && oldStatus !== 'running') {
        if (!j.start_time) j.start_time = Date.now();
        if (!j.logs) j.logs = [];
        if (!j.screenshots) j.screenshots = [];
      }
      if ((updates.status === 'complete' || updates.status === 'error') && !j.end_time) {
        j.end_time = Date.now();
      }
      log('Job atualizado:', id, updates.status || '(sem status)', updates.erro || '');
    } else {
      warn('Job não encontrado para update:', id);
    }
    renderKanban();
  }

  // ── Modal de detalhes do card (estilo automata) ──

  function abrirModalDetalhes(job) {
    log('Abrindo detalhes do job:', job.id, job.numero);
    const antigo = $('#pje-card-modal-overlay');
    if (antigo) antigo.remove();

    // Carrega screenshots do localStorage (cross-frame)
    log('🔍 Buscando screenshots: idProcesso=' + job.idProcesso + ' screenshots=' + (job.screenshots ? job.screenshots.length : 'undefined'));
    if (job.idProcesso) {
      try {
        var ssKey = 'pje-ss-' + job.idProcesso;
        var rawSs = localStorage.getItem(ssKey);
        log('🔍 localStorage[' + ssKey + ']: ' + (rawSs ? 'ENCONTRADO (' + Math.round(rawSs.length/1024) + 'KB)' : 'NAO ENCONTRADO'));
        if (rawSs) {
          var parsed = JSON.parse(rawSs);
          job.screenshots = parsed;
          log('📸 ' + job.screenshots.length + ' screenshots carregados do localStorage para ' + job.numero);
        }
      } catch(e) {
        log('⚠ Erro ao carregar screenshots:', e.message);
      }
    }

    const statusColors = { running: '#3b82f6', complete: '#10b981', error: '#ef4444', pending: '#f59e0b' };
    const statusLabels = { running: 'Em execução', complete: 'Concluído', error: 'Erro', pending: 'Aguardando' };
    const color = statusColors[job.status] || '#94a3b8';
    const label = statusLabels[job.status] || '?';
    const progress = job.status === 'complete' ? 100 : (job.status === 'running' ? 65 : 0);

    const overlay = document.createElement('div');
    overlay.id = 'pje-card-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="pje-modal">' +
        '<div class="modal-header">' +
          '<h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>Detalhes do Processo</h3>' +
          '<button class="modal-close" id="pje-card-modal-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="detail-row">' +
            '<div class="detail-label"><i class="fas fa-file-alt"></i> Número do Processo</div>' +
            '<div class="detail-value mono">' + job.numero + '</div>' +
          '</div>' +
          '<div class="detail-row">' +
            '<div class="detail-label"><i class="fas fa-inbox"></i> Fila Inicial</div>' +
            '<div class="detail-value" style="font-size:13px">' + (job.fila || '(não definida)') + '</div>' +
          '</div>' +
          (job.filaFinal ? '<div class="detail-row">' +
            '<div class="detail-label"><i class="fas fa-flag-checkered"></i> Fila Final</div>' +
            '<div class="detail-value" style="font-size:13px;color:' + (job.filaOk ? '#166534' : '#d97706') + '">' + job.filaFinal + (job.filaOk ? '' : ' ⚠️ Fila inesperada') + '</div>' +
          '</div>' : '') +
          '<div class="detail-row">' +
            '<div class="detail-label"><i class="fas fa-flag"></i> Situação</div>' +
            '<div class="detail-value" style="color:' + color + '">' + label + '</div>' +
          '</div>' +
          '<div class="detail-row">' +
            '<div class="detail-label"><i class="fas fa-chart-bar"></i> Progresso</div>' +
            '<div class="progress-bar" style="margin:0 0 8px 0"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
          '</div>' +
          '<div class="detail-row">' +
            '<div class="detail-label"><i class="far fa-clock"></i> Horários</div>' +
            '<div class="detail-value">' +
              'Início: ' + (job.start_time ? new Date(job.start_time).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '--:--:--') + ' · ' +
              'Fim: ' + (job.end_time ? new Date(job.end_time).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '--:--:--') + ' · ' +
              'Duração: ' + (job.start_time ? (job.end_time ? Math.round((job.end_time - job.start_time)/1000) + 's' : Math.round((Date.now() - job.start_time)/1000) + 's (em andamento)') : '--') +
            '</div>' +
          '</div>' +
          '<div class="detail-row">' +
            '<div class="detail-label"><i class="fas fa-terminal"></i> Registro de Execução</div>' +
            '<div class="full-logs" id="modalLogs">' +
              (job.logs && job.logs.length ? job.logs.map(l => {
                const time = new Date(l.ts).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
                const isErr = l.msg.includes('⛔') || l.msg.includes('⚠');
                return '<div class="full-log-line" style="' + (isErr ? 'color:#fca5a5' : '') + '"><span class="full-log-time">' + time + '</span>' + l.msg.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
              }).join('') : '<div class="full-log-line"><span class="full-log-time">--:--</span>' + (job.status === 'running' ? 'Capturando logs a cada 2s...' : 'Aguardando logs da automação...') + '</div>') +
              (job.erro ? '<div class="full-log-line" style="color:#fca5a5"><span class="full-log-time">ERRO</span>' + job.erro + '</div>' : '') +
            '</div>' +
          '</div>' +
          (job.screenshots && job.screenshots.length ? '<div class="detail-row">' +
            '<div class="detail-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Capturas de Tela (' + job.screenshots.length + ')</div>' +
            '<div class="screenshot-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">' +
              job.screenshots.map(function(ss, i) {
                return '<div class="screenshot-thumb" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;cursor:pointer;transition:all .15s" title="' + (ss.label || 'Captura ' + (i+1)) + '" data-ss="' + i + '">' +
                  '<img src="' + ss.data + '" style="width:100%;height:auto;display:block" loading="lazy">' +
                  '<div style="padding:4px 6px;font-size:9px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + new Date(ss.ts).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) + '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
            // Lightbox para full-screen
            '<div id="pje-ss-lightbox" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);z-index:9999999;align-items:center;justify-content:center;cursor:pointer" onclick="this.style.display=\'none\'">' +
              '<img id="pje-ss-lightbox-img" style="max-width:95vw;max-height:95vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)">' +
            '</div>' +
          '</div>' : '') +
        '</div>' +
        '<div class="modal-footer">' +
          (job.idProcesso && job.fila ? '<button class="btn-modal btn-modal-primary" id="pje-card-modal-abrir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Abrir Tarefa</button>' : '') +
          '<button class="btn-modal btn-modal-secondary" id="pje-card-modal-fechar">Fechar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    // Show modal with animation
    requestAnimationFrame(() => { overlay.classList.add('open'); });

    const fechar = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.querySelector('#pje-card-modal-close').onclick = fechar;
    overlay.querySelector('#pje-card-modal-fechar').onclick = fechar;
    overlay.onclick = function(e) { if (e.target === overlay) fechar(); };

    const btnAbrir = overlay.querySelector('#pje-card-modal-abrir');
    if (btnAbrir) {
      btnAbrir.onclick = function() {
        const url = getTarefaUrl(job.idProcesso, job.fila || '');
        log('Abrindo tarefa pelo modal:', url);
        window.open(url, '_blank');
        fechar();
      };
    }

    // Lightbox de screenshots
    overlay.querySelectorAll('.screenshot-thumb').forEach(function(thumb) {
      thumb.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(this.getAttribute('data-ss'));
        var ss = job.screenshots[idx];
        if (!ss) return;
        var lb = overlay.querySelector('#pje-ss-lightbox');
        var img = overlay.querySelector('#pje-ss-lightbox-img');
        if (lb && img) { img.src = ss.data; lb.style.display = 'flex'; }
      });
      thumb.addEventListener('mouseenter', function() {
        this.style.borderColor = '#0f172a'; this.style.boxShadow = '0 2px 8px rgba(0,0,0,.12)';
      });
      thumb.addEventListener('mouseleave', function() {
        this.style.borderColor = '#e2e8f0'; this.style.boxShadow = 'none';
      });
    });

    const escHandler = function(e) {
      if (e.key === 'Escape') {
        var lb = overlay.querySelector('#pje-ss-lightbox');
        if (lb && lb.style.display === 'flex') { lb.style.display = 'none'; return; }
        fechar();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  function criarPainel(saved, modo) {
    saved = saved || carregarEstado();
    log('Criando painel kanban... (salvo: ' + (saved ? 'sim, ' + (saved.jobs?.length || 0) + ' jobs' : 'não') + ')');
    // Garante que o CSS do modal (mode toggle, fila dropdown) esteja injetado
    if (!document.getElementById('pje-dup-modal-style')) injetarEstilosModal();
    if (!$('#pje-kanban-style')) {
      const s = document.createElement('style'); s.id = 'pje-kanban-style';
      s.textContent = substituirCores(`
#pje-kanban-root{flex:1 1 auto;display:flex;flex-direction:column;overflow:hidden;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:0;min-height:0;width:100%}
#pje-kanban-body{display:flex;flex:1;overflow:hidden}
/* Sidebar */
#pje-kanban-sidebar{width:340px;min-width:340px;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow-y:auto;box-shadow:0 0 0 1px rgba(0,0,0,.02)}
#pje-kanban-sidebar-hdr{background:#fff;padding:14px 16px;border-bottom:1px solid #e2e8f0}
#pje-kanban-sidebar-hdr h3{margin:0 0 8px 0;font-size:14px;font-weight:600;color:#0f172a;display:flex;align-items:center;gap:8px}
#pje-kanban-sidebar-hdr label{margin-top:0 !important;padding:0 !important;font-size:12px !important;font-weight:500 !important;color:#334155 !important;display:flex !important;align-items:center !important;gap:6px !important}
/* ── Selects customizados (sidebar header + body) ── */
#pje-kanban-sidebar-hdr select,
#pje-kanban-sidebar-body select:not([multiple]){
  -webkit-appearance:none !important;appearance:none !important;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E") !important;
  background-repeat:no-repeat !important;
  background-position:right 12px center !important;
  padding-right:36px !important;
  cursor:pointer !important;
}
#pje-kanban-sidebar-hdr select{
  width:100% !important;max-width:100% !important;box-sizing:border-box !important;
  padding:9px 36px 9px 12px !important;
  border:1px solid #e2e8f0 !important;border-radius:8px !important;
  font-size:13px !important;font-family:inherit !important;
  background-color:#fff !important;color:#0f172a !important;
  transition:all .15s !important;
  outline:none !important;margin-top:6px !important;height:38px !important;
}
#pje-kanban-sidebar-hdr select:hover{border-color:#cbd5e1 !important}
#pje-kanban-sidebar-hdr select:focus{border-color:#0f172a !important;box-shadow:0 0 0 1px #0f172a !important;background-color:#fff !important}
/* Tool tabs */
.pje-tool-tabs{display:flex;gap:4px}
.pje-tool-tab{flex:1;padding:7px 6px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;font-size:11px;font-weight:600;cursor:pointer;text-align:center;transition:all .15s;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:4px}
.pje-tool-tab:hover{border-color:#3b82f6;color:#1e40af;background:#eff6ff}
.pje-tool-tab.active{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
.pje-tool-tab .badge{background:#ef4444;color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;min-width:16px;text-align:center;display:inline-block;transition:all .25s}
.pje-tool-tab .badge.pulse{animation:badgePulse .4s ease}
.pje-tool-tab .badge.zero{background:#94a3b8}
.pje-tool-tab.active .badge{background:rgba(255,255,255,.25)}
@keyframes badgePulse{0%{transform:scale(1)}50%{transform:scale(1.35)}100%{transform:scale(1)}}
/* Dashboard stats cards */
.dup-dashboard-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;animation:fadeSlideIn .35s ease}
@keyframes fadeSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.dup-stat-card{background:#fff;border-radius:12px;padding:16px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 2px rgba(0,0,0,.05);border:1px solid #e2e8f0;transition:all .2s}
.dup-stat-card:hover{border-color:#cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.dup-stat-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.dup-stat-info{display:flex;flex-direction:column;gap:1px}
.dup-stat-value{font-size:24px;font-weight:700;color:#0f172a;line-height:1;letter-spacing:-0.5px}
.dup-stat-label{font-size:11px;color:#64748b;font-weight:500}
.dup-stat-label{font-size:12px;color:#64748b;font-weight:500}
.dup-stat-timestamp{font-size:10px;color:#94a3b8;margin-top:2px}
/* Paginação */
.dup-pagination{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0}
.dup-pagination button{display:inline-flex;align-items:center;gap:4px;padding:7px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#334155;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit}
.dup-pagination button:hover:not(:disabled){background:#0f172a;border-color:#0f172a;color:#fff}
.dup-pagination button:disabled{opacity:.35;cursor:not-allowed}
.dup-pagination .dup-page-info{font-size:12px;color:#64748b;font-weight:500;padding:0 10px}
/* Toast (estrutura base — cores e conteúdo vêm inline no JS) */
@keyframes toastSlideIn{from{opacity:0;transform:translateX(120px)}to{opacity:1;transform:translateX(0)}}
@keyframes toastSlideOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(120px)}}
/* Scan status bar */
.pje-scan-status-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:14px;font-size:12px;color:#475569;font-weight:500}
.pje-scan-status-bar i{color:#64748b}
/* Duplicados Modal */
#pje-dup-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.65);backdrop-filter:blur(3px);z-index:9999999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
#pje-dup-modal-box{background:#fff;border-radius:16px;width:96vw;max-width:1300px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:modalPopIn .25s ease}
@keyframes modalPopIn{from{opacity:0;transform:scale(.96) translateY(-10px)}to{opacity:1;transform:scale(1) translateY(0)}}
#pje-dup-modal-header{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:16px 24px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
#pje-dup-modal-header h3{font-size:17px;font-weight:600;display:flex;align-items:center;gap:10px;margin:0}
#pje-dup-modal-close{background:rgba(255,255,255,.12);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:background .15s}
#pje-dup-modal-close:hover{background:rgba(255,255,255,.22)}
#pje-dup-modal-body{flex:1;overflow-y:auto;padding:24px;min-height:300px;background:#f8fafc}
#pje-dup-modal-footer{padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#64748b;background:#fff;border-radius:0 0 16px 16px;flex-shrink:0}
/* Tab panels */
.pje-tool-panel{display:none}
.pje-tool-panel.active{display:block}
/* ── shadcn/ui: Sidebar Body ── */
#pje-kanban-sidebar-body{display:flex;flex-direction:column;gap:16px;padding:20px 24px;background:#fff}
#pje-kanban-sidebar-body label{display:flex !important;align-items:center !important;gap:6px !important;font-size:12px !important;font-weight:500 !important;color:#334155 !important;text-transform:none !important;letter-spacing:0 !important;margin:8px 0 2px 0 !important;float:none !important;width:auto !important}
#pje-kanban-sidebar-body textarea,#pje-kanban-sidebar-body select,#pje-kanban-sidebar-body input{width:100% !important;max-width:100% !important;box-sizing:border-box !important;padding:8px 12px !important;border:1px solid #e2e8f0 !important;border-radius:8px !important;font-size:13px !important;font-family:inherit !important;background-color:#fff !important;color:#0f172a !important;transition:all .15s !important;outline:none !important;height:auto !important;line-height:1.5 !important}
#pje-kanban-sidebar-body textarea:focus,#pje-kanban-sidebar-body select:focus,#pje-kanban-sidebar-body input:focus{border-color:#0f172a !important;box-shadow:0 0 0 1px #0f172a !important}
#pje-kanban-sidebar-body textarea{min-height:120px !important;font-family:'SF Mono','Consolas','Fira Code',monospace !important;font-size:13px !important;resize:vertical !important;line-height:1.6 !important}
#pje-kanban-sidebar-body select:not([multiple]):hover{border-color:#cbd5e1 !important;background-color:#f8fafc !important}
#pje-kanban-sidebar-body select:not([multiple]):focus{border-color:#0f172a !important;box-shadow:0 0 0 1px #0f172a !important;background-color:#fff !important}
/* Tags de polo */
.pje-polo-tags{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px 0}
.pje-polo-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:9999px;font-size:12px;font-weight:500;cursor:default;transition:all .15s}
.pje-polo-tag.solo{background:#fef2f2;color:#991b1b;border-color:#fecaca}
.pje-polo-tag .pje-polo-tag-x{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:transparent;border:none;cursor:pointer;color:inherit;font-size:13px;line-height:1;transition:all .15s;padding:0;margin:0;opacity:.5}
.pje-polo-tag .pje-polo-tag-x:hover{background:#ef4444;color:#fff;opacity:1}
.pje-form-row{display:flex;gap:12px;margin:4px 0}
.pje-form-row>div{flex:1}
.pje-form-row label{margin:0 0 5px 0 !important}
/* shadcn Buttons */
.pje-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 18px;border:1px solid transparent;border-radius:8px;font-weight:500;font-size:13px;cursor:pointer;transition:all .15s}
.pje-btn-primary{background:#0f172a;border-color:#0f172a;color:#fff}
.pje-btn-primary:hover{background:#1e293b;border-color:#1e293b}
.pje-btn-primary:disabled{background:#94a3b8;border-color:#94a3b8;cursor:not-allowed;opacity:.6}
.pje-btn-ghost{background:#fff;border-color:#e2e8f0;color:#334155}
.pje-btn-ghost:hover{background:#0f172a;border-color:#0f172a;color:#fff}
.pje-btn-scan{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#334155;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s}
.pje-btn-scan:hover{background:#0f172a;border-color:#0f172a;color:#fff}
.pje-btn-scan:disabled{opacity:.35;cursor:not-allowed}
/* Duplicate panel inline (fixo no kanban) */
#pje-dup-panel-back:hover{background:#0f172a !important;color:#fff !important;border-color:#0f172a !important}
#pje-btn-scan-duplicados-inline:hover{background:#0f172a !important;color:#fff !important;border-color:#0f172a !important}
#pje-dup-grid-inner-inline{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;align-content:start}
#pje-dup-grid-inner-inline .dup-grid-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;color:#94a3b8;gap:12px;text-align:center;min-height:250px;width:100%;grid-column:1/-1}
#pje-dup-grid-inner-inline .dup-grid-empty i{font-size:48px;opacity:.3}
#pje-dup-grid-inner-inline .dup-grid-empty p{font-size:14px;font-weight:500}
/* Duplicate grid (modal legado) */
#pje-dup-grid{flex:1;padding:20px;overflow-y:auto;background:#f1f5f9;min-height:0}
#pje-dup-grid-inner{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;align-content:start}
.pje-dup-card-kanban{background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.05);border:1px solid #e2e8f0;transition:all .2s;display:flex;flex-direction:column;animation:cardFadeIn .3s ease}
.pje-dup-card-kanban:hover{border-color:#cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.pje-dup-card-kanban .dup-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.pje-dup-card-kanban .dup-card-num{font-family:'SF Mono','Consolas','Fira Code',monospace;font-size:13px;font-weight:600;color:#0f172a;letter-spacing:-0.2px}
.pje-dup-card-kanban .dup-card-badge{font-size:10px;font-weight:500;padding:3px 10px;border-radius:9999px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.pje-dup-card-kanban .dup-card-filas{flex:1;display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.pje-dup-card-kanban .dup-card-fila-row{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8fafc;border-radius:8px;font-size:11px;color:#475569}
.pje-dup-card-kanban .dup-card-fila-row i{font-size:5px;color:#94a3b8;flex-shrink:0}
.pje-dup-card-kanban .dup-card-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:auto}
.pje-dup-card-kanban .dup-card-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#334155;font-size:11px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit}
.pje-dup-card-kanban .dup-card-btn:hover{background:#0f172a;border-color:#0f172a;color:#fff}
.pje-dup-card-kanban .dup-card-copy{padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#94a3b8;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.pje-dup-card-kanban .dup-card-copy:hover{background:#f1f5f9;color:#0f172a;border-color:#cbd5e1}
#pje-dup-grid-inner-inline,#pje-dup-grid-inner{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;align-content:start}
/* Empty / loading states */
#pje-dup-grid .dup-grid-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8;gap:12px}
#pje-dup-grid .dup-grid-empty i{font-size:48px;opacity:.3}
#pje-dup-grid .dup-grid-empty p{font-size:14px;font-weight:500}
#pje-dup-grid .dup-grid-empty .dup-grid-stats{font-size:12px;color:#64748b;display:flex;gap:20px}
#pje-dup-grid .dup-grid-scanning{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px}
/* Empty state inline */
#pje-dup-grid-inner-inline .dup-grid-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:#94a3b8;gap:10px;text-align:center;min-height:200px;width:100%;grid-column:1/-1}
#pje-dup-grid-inner-inline .dup-grid-empty i{font-size:40px;opacity:.3}
#pje-dup-grid-inner-inline .dup-grid-empty p{font-size:13px;font-weight:500}
#pje-dup-grid .dup-grid-scanning .scan-spinner{font-size:36px;color:#64748b;animation:fa-spin 1s linear infinite}
#pje-dup-grid .dup-grid-scanning .scan-text{font-size:13px;color:#64748b;font-weight:500}
/* Dup filter toolbar */
#pje-dup-toolbar{padding:0 0 16px 0;display:flex;flex-direction:column;gap:10px}
.dup-search-wrap{position:relative;display:flex;align-items:center}
.dup-search-wrap i{position:absolute;left:12px;color:#94a3b8;font-size:13px;z-index:1}
.dup-search-wrap input{width:100%;padding:8px 14px 8px 36px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:inherit;background:#fff;color:#0f172a;outline:none;transition:all .15s;box-sizing:border-box;height:38px}
.dup-search-wrap input:focus{border-color:#0f172a;box-shadow:0 0 0 1px #0f172a,0 1px 2px rgba(0,0,0,.05)}
.dup-search-wrap input::placeholder{color:#94a3b8}
.dup-fila-filters{display:flex;flex-wrap:wrap;gap:6px}
.dup-fila-pill{padding:5px 14px;border:1px solid #e2e8f0;border-radius:9999px;font-size:11px;font-weight:500;cursor:pointer;transition:all .15s;background:#fff;color:#475569;white-space:nowrap;user-select:none;line-height:1.4}
.dup-fila-pill:hover{border-color:#94a3b8;color:#1e293b;background:#f8fafc}
.dup-fila-pill.active{background:#0f172a;border-color:#0f172a;color:#fff}
.dup-fila-pill.all{font-weight:600}
.dup-fila-pill .pill-count{font-size:10px;font-weight:600;background:rgba(0,0,0,.06);color:inherit;padding:1px 7px;border-radius:9999px;margin-right:4px;min-width:18px;text-align:center;display:inline-block}
.dup-fila-pill.active .pill-count{background:rgba(255,255,255,.15)}
/* Summary */
#pje-scan-summary{margin-top:10px}
.dup-sum-line{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px}
.dup-sum-tag{padding:4px 10px;border-radius:6px;font-weight:700;font-size:12px}
.dup-tag-red{background:#fee2e2;color:#991b1b}
.dup-tag-gray{background:#f1f5f9;color:#475569}
.dup-tag-blue{background:#f1f5f9;color:#475569}
.dup-sum-of{color:#94a3b8;font-weight:500;font-size:10px;text-transform:lowercase}
.pje-btn-row{display:flex;gap:10px;margin-top:24px}
/* ── shadcn/ui: Steps ── */
.pje-steps{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0}
.pje-step{font-size:12px;color:#475569;display:flex;align-items:center;gap:8px;font-weight:500}
.pje-step-num{background:#0f172a;color:#fff;width:20px;height:20px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0}
/* ── shadcn/ui: Kanban ── */
.kanban-container{flex:1;padding:16px 14px;overflow-x:auto;overflow-y:auto;background:#f8fafc;min-height:0}
.kanban-board{display:flex;gap:14px;min-width:860px;height:100%;min-height:0;align-items:stretch}
.kanban-column{flex:1;min-width:240px;background:#fff;border-radius:12px;display:flex;flex-direction:column;max-height:100%;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(0,0,0,0.04)}
.column-header{padding:12px 16px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;cursor:pointer;user-select:none;flex-shrink:0}
.column-header h3{font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;letter-spacing:0;margin:0}
.column-count{display:inline-flex;align-items:center;justify-content:center;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;min-width:22px;text-align:center;font-variant-numeric:tabular-nums}
.column-pending .column-header{background:#fff;color:#334155}
.column-pending .column-count{background:#f1f5f9;color:#475569}
.column-running .column-header{background:#fff;color:#334155}
.column-running .column-count{background:#dbeafe;color:#1d4ed8}
.column-complete .column-header{background:#fff;color:#334155}
.column-complete .column-count{background:#dcfce7;color:#166534}
.column-error .column-header{background:#fff;color:#334155}
.column-error .column-count{background:#fef2f2;color:#dc2626}
.column-body{flex:1;padding:12px;overflow-y:auto;min-height:100px}
.empty-state{text-align:center;padding:40px 20px;color:#94a3b8}
.empty-state i{font-size:32px;margin-bottom:8px;opacity:.25}
.empty-state p{font-size:12px;font-weight:500}
/* Column toggle */
.column-toggle{background:none;border:none;cursor:pointer;font-size:11px;padding:4px 6px;border-radius:4px;color:#94a3b8;opacity:0.5;transition:all .2s}
.column-header:hover .column-toggle{opacity:1}
.kanban-column.collapsed{flex:0 0 auto;min-width:auto;width:48px}
.kanban-column.collapsed .column-body{display:none}
.kanban-column.collapsed .column-header{border-radius:12px;flex-direction:column;gap:10px;padding:14px 6px;border-bottom:none;cursor:pointer;height:100%;justify-content:flex-start;align-items:center}
.kanban-column.collapsed .column-header h3{font-size:10px;writing-mode:vertical-rl;text-orientation:mixed;gap:4px}
.kanban-column.collapsed .column-toggle i{transform:rotate(180deg)}
.kanban-column.collapsed .column-count{font-size:11px;min-width:20px;padding:2px 6px}
/* ── shadcn/ui: Kanban Cards ── */
.bot-card{background:#fff;border-radius:10px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,0.04);transition:all .2s;border:1px solid #e2e8f0;border-left:3px solid;cursor:pointer;animation:cardFadeIn .25s ease}
@keyframes cardFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.bot-card:hover{box-shadow:0 1px 3px rgba(0,0,0,.08);border-color:#cbd5e1}
.bot-card.pending{border-left-color:#f59e0b}
.bot-card.running{border-left-color:#3b82f6}
.bot-card.complete{border-left-color:#10b981}
.bot-card.error{border-left-color:#ef4444}
.bot-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px}
.bot-processo{font-weight:600;font-size:12px;font-family:'SF Mono','Consolas','Fira Code',monospace;background:#f8fafc;padding:3px 8px;border-radius:6px;word-break:break-all;flex:1;color:#0f172a}
.bot-processo i{color:#94a3b8;font-size:10px}
.bot-status-badge{display:inline-flex;align-items:center;font-size:10px;padding:3px 10px;border-radius:9999px;font-weight:500;white-space:nowrap}
.progress-bar{height:3px;background:#f1f5f9;border-radius:3px;overflow:hidden;margin:8px 0}
.progress-fill{height:100%;background:#0f172a;transition:width .4s ease;width:0%;border-radius:3px}
.bot-times{display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin:6px 0 0 0;font-weight:500;font-variant-numeric:tabular-nums}
.bot-times i{margin-right:2px;opacity:.6}
.bot-fila{font-size:10px;color:#475569;margin-top:4px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bot-fila-final{font-size:10px;color:#166534;margin-top:2px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bot-fila-final.unexpected{color:#d97706}
.bot-last-log{font-size:10px;color:#64748b;margin-top:8px;padding:5px 8px;background:#f8fafc;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.bot-actions{display:flex;gap:6px;margin-top:8px;justify-content:flex-end}
.card-action-btn{display:inline-flex;align-items:center;padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:10px;font-weight:500;transition:all .15s}
.card-action-retry{background:#fff;color:#334155}
.card-action-retry:hover{background:#0f172a;border-color:#0f172a;color:#fff}
/* ── shadcn/ui: Modal ── */
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);backdrop-filter:blur(2px);z-index:999999;display:flex;align-items:center;justify-content:center;visibility:hidden;opacity:0;transition:all .2s}
.modal-overlay.open{visibility:visible;opacity:1}
.pje-modal{background:#fff;border-radius:14px;width:560px;max-width:92vw;max-height:88vh;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06),0 12px 40px rgba(0,0,0,.14);animation:modalIn .2s ease}
@keyframes modalIn{from{transform:scale(.96);opacity:0}to{transform:scale(1);opacity:1}}
.modal-header{background:#fff;color:#0f172a;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0}
.modal-header h3{font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;margin:0}
.modal-close{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#94a3b8;cursor:pointer;font-size:14px;transition:all .15s}
.modal-close:hover{background:#0f172a;border-color:#0f172a;color:#fff}
.modal-body{padding:24px;max-height:58vh;overflow-y:auto}
.detail-row{margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}
.detail-row:last-child{border-bottom:none}
.detail-label{font-size:11px;font-weight:500;text-transform:uppercase;color:#64748b;margin-bottom:6px;letter-spacing:.5px;display:flex;align-items:center;gap:6px}
.detail-label i{color:#94a3b8;width:14px}
.detail-value{font-size:14px;font-weight:500;color:#0f172a}
.detail-value.mono{font-family:'SF Mono','Consolas','Fira Code',monospace}
.full-logs{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;max-height:240px;overflow-y:auto;font-family:'SF Mono','Consolas','Fira Code',monospace;font-size:11px;line-height:1.6}
.full-log-line{padding:2px 0;border-bottom:1px solid #f1f5f9;color:#334155}
.full-log-line:last-child{border-bottom:none}
.full-log-time{color:#94a3b8;margin-right:10px}
.modal-footer{padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;gap:10px;justify-content:space-between;align-items:center;background:#fff}
.btn-modal{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s}
.btn-modal-primary{background:#0f172a;border:1px solid #0f172a;color:#fff}
.btn-modal-primary:hover{background:#1e293b}
.btn-modal-secondary{background:#fff;color:#334155;border:1px solid #e2e8f0}
.btn-modal-secondary:hover{background:#0f172a;border-color:#0f172a;color:#fff}
/* ── shadcn/ui: CSV label ── */
.pje-csv-label{cursor:pointer;font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;margin-top:6px;font-weight:500;transition:color .15s}
.pje-csv-label:hover{color:#0f172a;text-decoration:underline}`);
      document.head.appendChild(s);
    }

    // ── Encontra onde injetar o kanban ──
    // 1. #divRightPanel (painel direito do PJe Angular — integração nativa)
    // 2. #divPainelUsuarioContent (painel principal Angular)
    // 3. body (overlay full-screen — fallback para páginas JSF antigas)
    const painelRoot = document.querySelector('#divRightPanel')
                    || document.querySelector('#divPainelUsuarioContent')
                    || document.body;
    const isFullScreen = (painelRoot === document.body);
    const isRightPanel = painelRoot.id === 'divRightPanel';

    if ($('#pje-kanban-root')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'pje-kanban-root';

    if (isFullScreen) {
      // Overlay full-screen fixo — funciona em qualquer página
      wrapper.style.cssText = 'position:fixed !important; top:0 !important; left:0 !important; right:0 !important; bottom:0 !important; z-index:99999 !important; display:flex !important; flex-direction:column !important; overflow:hidden !important; background:#f1f5f9 !important;';
    } else if (isRightPanel) {
      // Dentro do #divRightPanel — esconde conteúdo nativo e ocupa o espaço
      wrapper._originalChildren = Array.from(painelRoot.children);
      wrapper._originalChildren.forEach(function(c) { c.style.display = 'none'; });
      // min-height:100vh garante que o painel preencha a tela toda
      // mesmo quando a sidebar do PJe tem menos conteúdo
      painelRoot.style.cssText = 'display:flex !important; flex-direction:column !important; overflow:hidden !important; min-height:100vh !important';
      wrapper.style.cssText = 'flex:1 !important; display:flex !important; flex-direction:column !important; overflow:hidden !important; background:#f1f5f9 !important; min-height:0 !important';
    } else {
      // Dentro do #divPainelUsuarioContent (Angular) — absolute ao lado da sidebar
      painelRoot.style.position = 'relative';
      const sidebar = document.querySelector('#divSideBar, .sideBarDefault');
      const sidebarWidth = sidebar ? sidebar.offsetWidth : 0;
      wrapper.style.cssText = 'position:absolute !important; top:0 !important; left:' + sidebarWidth + 'px !important; right:0 !important; bottom:0 !important; z-index:9999 !important; display:flex !important; flex-direction:column !important; overflow:hidden !important; background:#f1f5f9 !important;';
    }
    wrapper.innerHTML = `
<div id="pje-kanban-body">
  <div id="pje-kanban-sidebar">
    <div id="pje-kanban-sidebar-hdr">
      <h3 id="pje-tool-title"><i class="fas fa-file-signature"></i> <span id="pje-tool-title-text">Citar/Intimar</span></h3>
      <label style="margin-top:0"><i class="fas fa-exchange-alt"></i> Tipo de Movimentação</label>
      <select id="pje-tipo-movimentacao">
        <option value="">Selecione o tipo de movimentação...</option>
        <option value="citar">Intimação/Citação</option>
        <option value="alvara">Alvará</option>
        <option value="outros">Outros</option>
      </select>
    </div>
    <div id="pje-kanban-sidebar-body">
      <div class="pje-tool-panel active" id="pje-panel-citar">
      <div class="pje-steps">
        <div class="pje-step"><span class="pje-step-num">1</span> Selecione as opções</div>
        <div class="pje-step"><span class="pje-step-num">2</span> Cole os processos</div>
        <div class="pje-step"><span class="pje-step-num">3</span> Iniciar automação</div>
        <div class="pje-step"><span class="pje-step-num">4</span> Acompanhe o progresso</div>
      </div>
      <label><i class="fas fa-users"></i> Polo</label>
      <select id="pje-ci-polo-picker">
        <option value="">Selecionar polo...</option>
        <option value="passivo">Passivo</option>
        <option value="ativo">Ativo</option>
        <option value="ministerio_publico">Ministério Público</option>
        <option value="defensoria" disabled>Defensoria (em breve)</option>
        <option value="procuradoria" disabled>Procuradoria (em breve)</option>
      </select>
      <div class="pje-polo-tags" id="pje-ci-polo-tags"></div>
      <div class="pje-form-row">
        <div><label><i class="fas fa-caret-right"></i> Tipo de Ato</label><select id="pje-ci-tipo"><option value="intimar" selected>Intimar</option><option value="citar">Citar</option></select></div>
        <div><label><i class="fas fa-paper-plane"></i> Meio</label><select id="pje-ci-meio"><option value="sistema" selected>Sistema</option><option value="diario">Diário Eletrônico</option></select></div>
      </div>
      <div class="pje-form-row">
        <div><label><i class="fas fa-calendar-alt"></i> Prazo (dias)</label><input id="pje-ci-prazo" type="number" value="15" min="1" max="365"></div>
      </div>
      <label>Processos (um por linha)</label>
      <textarea id="pje-ci-textarea" placeholder="0000000-00.0000.0.00.0000&#10;0000001-00.0000.0.00.0000"></textarea>
      <label for="pje-csv-file" class="pje-csv-label"><i class="fas fa-file-import"></i> Importar CSV</label>
      <label class="pje-csv-label" id="pje-csv-download" style="margin-top:2px;cursor:pointer"><i class="fas fa-file-download"></i> Baixar CSV</label>
      <input type="file" id="pje-csv-file" accept=".csv" style="display:none">
      <div class="pje-btn-row">
        <button class="pje-btn pje-btn-ghost" id="pje-ci-fechar">Cancelar</button>
        <button class="pje-btn pje-btn-primary" id="pje-ci-iniciar"><i class="fas fa-play"></i> INICIAR</button>
      </div>
      </div><!-- /pje-panel-citar -->
      <div class="pje-tool-panel" id="pje-panel-alvara">
      <div class="pje-steps">
        <div class="pje-step"><span class="pje-step-num">1</span> Cole os processos</div>
        <div class="pje-step"><span class="pje-step-num">2</span> Iniciar automação</div>
        <div class="pje-step"><span class="pje-step-num">3</span> Acompanhe o progresso</div>
      </div>
     
      <label>Processos (um por linha)</label>
      <textarea id="pje-alvara-textarea" placeholder="0000000-00.0000.0.00.0000&#10;0000001-00.0000.0.00.0000"></textarea>
      <label for="pje-csv-file-alvara" class="pje-csv-label"><i class="fas fa-file-import"></i> Importar CSV</label>
      <label class="pje-csv-label" id="pje-csv-download-alvara" style="margin-top:2px;cursor:pointer"><i class="fas fa-file-download"></i> Baixar CSV</label>
      <input type="file" id="pje-csv-file-alvara" accept=".csv" style="display:none">
      <div class="pje-btn-row">
        <button class="pje-btn pje-btn-ghost" id="pje-alvara-fechar">Cancelar</button>
        <button class="pje-btn pje-btn-primary" id="pje-alvara-iniciar"><i class="fas fa-play"></i> EMITIR ALVARÁ</button>
      </div>
      </div><!-- /pje-panel-alvara -->
      <div class="pje-tool-panel" id="pje-panel-outros">
      <div class="pje-steps" style="border-left-color:#6b7280;background:#f9fafb">
        <div class="pje-step"><span class="pje-step-num" style="background:#6b7280">1</span> Selecione o tipo de movimentação acima</div>
        <div class="pje-step"><span class="pje-step-num" style="background:#6b7280">2</span> Configure as opções</div>
        <div class="pje-step"><span class="pje-step-num" style="background:#6b7280">3</span> Execute a automação</div>
      </div>
      <div style="font-size:13px;color:#6b7280;padding:20px 16px;background:#f9fafb;border-radius:10px;border:2px dashed #d1d5db;text-align:center;margin-bottom:14px">
        <i class="fas fa-tools" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.4"></i>
        <p style="margin:0 0 8px 0;font-weight:600;color:#374151">Outros Tipos de Movimentação</p>
        <p style="margin:0;font-size:12px;line-height:1.5">Em breve: novas automações para outros tipos de movimentação processual.</p>
      </div>
      </div><!-- /pje-panel-outros -->
    </div><!-- /sidebar-body -->
  </div><!-- /sidebar -->
  <div class="kanban-container">
            <div class="kanban-board" id="pje-kanban-board">
              <div class="kanban-column column-pending" id="kanban-pending">
                <div class="column-header">
                  <h3><i class="fas fa-clock"></i> Aguardando</h3>
                  <div style="display:flex;align-items:center;gap:10px">
                    <span class="column-count" id="pje-count-pending">0</span>
                    <button class="column-toggle"><i class="fas fa-chevron-left"></i></button>
                  </div>
                </div>
                <div class="column-body" id="pje-kanban-col-pending"></div>
              </div>
              <div class="kanban-column column-running" id="kanban-running">
                <div class="column-header">
                  <h3><i class="fas fa-spinner fa-pulse"></i> Em Execução</h3>
                  <div style="display:flex;align-items:center;gap:10px">
                    <span class="column-count" id="pje-count-running">0</span>
                    <button class="column-toggle"><i class="fas fa-chevron-left"></i></button>
                  </div>
                </div>
                <div class="column-body" id="pje-kanban-col-running"></div>
              </div>
              <div class="kanban-column column-complete" id="kanban-complete">
                <div class="column-header">
                  <h3><i class="fas fa-check-circle"></i> Concluídos</h3>
                  <div style="display:flex;align-items:center;gap:10px">
                    <span class="column-count" id="pje-count-complete">0</span>
                    <button class="column-toggle"><i class="fas fa-chevron-left"></i></button>
                  </div>
                </div>
                <div class="column-body" id="pje-kanban-col-complete"></div>
              </div>
              <div class="kanban-column column-error" id="kanban-error">
                <div class="column-header">
                  <h3><i class="fas fa-exclamation-triangle"></i> Com Erro</h3>
                  <div style="display:flex;align-items:center;gap:10px">
                    <span class="column-count" id="pje-count-error">0</span>
                    <button class="column-toggle"><i class="fas fa-chevron-left"></i></button>
                  </div>
                </div>
                <div class="column-body" id="pje-kanban-col-error"></div>
              </div>
            </div>
            <!-- Painel fixo de Processos em Múltiplas Filas -->
            <div id="pje-dup-panel" style="display:none;flex-direction:column;flex:1;min-height:0">
              <div id="pje-dup-panel-hdr" style="padding:12px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:1px solid #e2e8f0">
                <div>
                  <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a">Processos em Múltiplas Filas</h3>
                  <p style="margin:2px 0 0 0;font-size:12px;color:#94a3b8">Processos que aparecem em mais de uma fila simultaneamente</p>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                </div>
              </div>
              <div style="flex:1;min-height:0;overflow:auto;padding:12px 16px;background:#f8fafc">
                <div class="dup-mode-bar" id="pje-dup-mode-bar-inline">
                <span class="dup-config-label">PERIODO</span>
                <select class="dup-date-select" id="pje-dup-date-filter-inline">
                  <option value="1" selected>Ultimas 24h</option>
                  <option value="3">Ultimos 3 dias</option>
                  <option value="5">Ultimos 5 dias</option>
                  <option value="15">Ultimos 15 dias</option>
                  <option value="30">Ultimos 30 dias</option>
                  <option value="0">Todos</option>
                </select>
                <span class="dup-config-label">FILTRAR POR</span>
                <select class="dup-date-select" id="pje-dup-campo-data-inline">
                  <option value="dataChegada" selected>Data de Chegada</option>
                  <option value="ultimoMovimento">Último Movimento</option>
                </select>
                <span class="dup-config-label">FILAS</span>
                <div class="dup-filas-wrap">
                  <button class="dup-filas-trigger" id="pje-dup-filas-trigger-inline"><span class="count" id="pje-dup-filas-count-inline">1</span> fila selecionada</button>
                  <div class="dup-filas-dropdown" id="pje-dup-filas-dropdown-inline">
                    <div style="padding:6px 10px;border-bottom:1px solid #f1f5f9;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
                      <span style="font-size:11px;font-weight:600;color:#64748b">SELECIONAR FILAS</span>
                      <span class="dup-select-all" id="pje-dup-select-all-inline">Todas / Nenhuma</span>
                    </div>
                    <div class="dup-fila-selector" id="pje-dup-fila-selector-inline"></div>
                  </div>
                </div>
                <div style="flex:1"></div>
                <button type="button" id="pje-btn-scan-duplicados-inline" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#334155;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit;height:32px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>Escanear</button>
                <button type="button" id="pje-dup-cancel-inline" style="display:none;align-items:center;gap:6px;padding:6px 14px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;height:32px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Cancelar</button>
                <button type="button" id="pje-dup-csv-export" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#334155;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit;height:32px" title="Exportar CSV da tela atual"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>CSV</button>
              </div>
                <div id="pje-scan-status-inline" style="font-size:13px;color:#64748b;margin-bottom:16px;display:none"></div>
                <div class="dup-dashboard-stats" id="pje-dup-dashboard-inline" style="display:none">
                  <div class="dup-stat-card"><div class="dup-stat-icon" style="background:#fee2e7"><i class="fas fa-clone" style="color:#dc2626"></i></div><div class="dup-stat-info"><span class="dup-stat-value" id="pje-dup-stat-count-inline">0</span><span class="dup-stat-label">Processos Duplicados</span></div></div>
                  <div class="dup-stat-card"><div class="dup-stat-icon" style="background:#f1f5f9"><i class="fas fa-list" style="color:#64748b"></i></div><div class="dup-stat-info"><span class="dup-stat-value" id="pje-dup-stat-filas-inline">0</span><span class="dup-stat-label">Filas Afetadas</span></div></div>
                  <div class="dup-stat-card"><div class="dup-stat-icon" style="background:#d1fae5"><i class="fas fa-file-alt" style="color:#059669"></i></div><div class="dup-stat-info"><span class="dup-stat-value" id="pje-dup-stat-total-inline">0</span><span class="dup-stat-label">Total de Processos</span></div></div>
                  <div class="dup-stat-card"><div class="dup-stat-icon" style="background:#f1f5f9"><i class="fas fa-clock" style="color:#64748b"></i></div><div class="dup-stat-info"><span class="dup-stat-value" style="font-size:14px;font-weight:600" id="pje-dup-stat-lastscan-inline">—</span><span class="dup-stat-label">Último Escaneamento</span></div></div>
                </div>
                <div id="pje-dup-toolbar-inline" style="display:none;margin-bottom:14px">
                  <div class="dup-search-wrap" style="margin-bottom:8px"><i class="fas fa-search"></i><input type="text" id="pje-dup-search-inline" placeholder="Filtrar por número do processo..."></div>
                  <div class="dup-fila-filters" id="pje-dup-fila-filters-inline"></div>
                </div>
                <div id="pje-dup-grid-inner-inline" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;align-content:start">
                  <div class="dup-grid-empty"><i class="fas fa-search"></i><p>Clique em <strong>"Escanear"</strong> para buscar processos duplicados (Direcionado por data + API)</p></div>
                </div>
              </div>
            </div>
          </div>`;

    painelRoot.appendChild(wrapper);

    // Trava scroll do body pra evitar espaço em branco
    document.body.style.overflow = 'hidden';

    // ══ Select de tipo de movimentação ══
    function switchTab(panelName) {
      _acaoAtual = panelName;
      // Atualiza painéis
      wrapper.querySelectorAll('.pje-tool-panel').forEach(function(p) {
        p.classList.toggle('active', p.id === 'pje-panel-' + panelName);
      });
      // Atualiza título
      var titleEl = $('#pje-tool-title-text');
      var iconEl = wrapper.querySelector('#pje-tool-title i');
      if (titleEl) {
        if (panelName === 'alvara') {
          titleEl.textContent = 'Emitir Alvará';
        } else if (panelName === 'outros') {
          titleEl.textContent = 'Outros';
        } else {
          titleEl.textContent = 'Citar/Intimar';
        }
      }
      if (iconEl) {
        if (panelName === 'alvara') {
          iconEl.className = 'fas fa-scroll';
        } else if (panelName === 'outros') {
          iconEl.className = 'fas fa-tools';
        } else {
          iconEl.className = 'fas fa-file-signature';
        }
      }
      salvarEstado();
    }

    // Select change handler
    var selectMov = wrapper.querySelector('#pje-tipo-movimentacao');
    if (selectMov) {
      selectMov.addEventListener('change', function() {
        var val = selectMov.value;
        if (!val) return;
        switchTab(val);
      });
    }

    // Events - Citar
    $('#pje-ci-fechar').onclick = fechar;
    $('#pje-ci-iniciar').onclick = function() {
      _acaoAtual = 'citar';
      iniciar();
    };

    // Events - Alvará
    var alvaraFechar = $('#pje-alvara-fechar');
    if (alvaraFechar) alvaraFechar.onclick = fechar;
    var alvaraIniciar = $('#pje-alvara-iniciar');
    if (alvaraIniciar) alvaraIniciar.onclick = function() {
      _acaoAtual = 'alvara';
      iniciar();
    };

    // CSV Alvará
    var csvDownloadAlvara = $('#pje-csv-download-alvara');
    if (csvDownloadAlvara) csvDownloadAlvara.addEventListener('click', function() {
      downloadCSV('alvara');
    });
    var csvFileAlvara = $('#pje-csv-file-alvara');
    if (csvFileAlvara) csvFileAlvara.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        const txt = ev.target.result;
        const nums = txt.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g) || [];
        if (nums.length) {
          const ta = $('#pje-alvara-textarea');
          ta.value = (ta.value ? ta.value + '\n' : '') + nums.join('\n');
        }
      };
      reader.readAsText(file);
    });

    document.addEventListener('keydown', function escKanban(e) {
      if (e.key === 'Escape' && aberto) fechar();
    });
    $('#pje-csv-download').addEventListener('click', function() { downloadCSV('citar'); });
    $('#pje-csv-file').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        const txt = ev.target.result;
        const nums = txt.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g) || [];
        if (nums.length) {
          const ta = $('#pje-ci-textarea');
          ta.value = (ta.value ? ta.value + '\n' : '') + nums.join('\n');
        }
      };
      reader.readAsText(file);
    });

    // ══════════════════════════════════════════════════════════
    // Painel fixo de Duplicados (substitui o modal)
    // ══════════════════════════════════════════════════════════
    var dupPanel = wrapper.querySelector('#pje-dup-panel');
    var kanbanBoard = wrapper.querySelector('#pje-kanban-board');
    var kanbanSidebar = wrapper.querySelector('#pje-kanban-sidebar');
    var kanbanContainer = wrapper.querySelector('.kanban-container');
    var kanbanBody = wrapper.querySelector('#pje-kanban-body');

    function mostrarDuplicados() {
      if (kanbanSidebar) kanbanSidebar.style.display = 'none';
      if (kanbanBoard) kanbanBoard.style.display = 'none';
      if (kanbanBody) kanbanBody.style.overflow = 'auto';
      if (kanbanContainer) kanbanContainer.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
      if (dupPanel) dupPanel.style.display = 'flex';
      // Tenta carregar cache do sessionStorage
      if (!window._dupResults) carregarResultadosDuplicados();
      // Se tem cache, mostra; senão faz auto-scan com status visível
      if (window._dupResults && window._dupResults.length > 0) {
        atualizarPainelDuplicados();
      } else if (!window._dupScanning) {
        // Mostra status de scanning imediatamente
        var filasSel = obterFilasSelecionadas();
        var statusEl = document.getElementById('pje-scan-status-inline');
        var gridEl = document.getElementById('pje-dup-grid-inner-inline');
        var toolbarEl = document.getElementById('pje-dup-toolbar-inline');
        var dashboardEl = document.getElementById('pje-dup-dashboard-inline');
        var campoEl = document.getElementById('pje-dup-campo-data-inline');
        var campoLbl = campoEl && campoEl.value === 'ultimoMovimento' ? 'último movimento' : 'chegada';
        if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Modo Direcionado: buscando ' + filasSel.length + ' fila(s) por ' + campoLbl + '...'; }
        if (gridEl) gridEl.innerHTML = '<div class="dup-grid-empty"><i class="fas fa-sync-alt fa-spin" style="font-size:32px;opacity:.5;color:#64748b"></i><p>Consultando processos nas ultimas 24h por ' + campoLbl + ' em ' + filasSel.length + ' fila(s)...</p></div>';
        if (toolbarEl) toolbarEl.style.display = 'none';
        if (dashboardEl) dashboardEl.style.display = 'none';
        // Dispara scan direcionado
        setTimeout(function() { escanearDuplicadosDirecionado(); }, 200);
      }
    }
    // Expõe no window para acesso do dropdown menu
    window._pjeMostrarDuplicados = mostrarDuplicados;
    window._pjeMostrarAgrupador = abrirAgrupadorModal;

    function voltarKanban() {
      if (dupPanel) dupPanel.style.display = 'none';
      if (kanbanSidebar) kanbanSidebar.style.display = 'flex';
      if (kanbanBoard) kanbanBoard.style.display = 'flex';
      if (kanbanContainer) kanbanContainer.style.overflow = '';
      if (kanbanBody) kanbanBody.style.overflow = '';
      document.body.style.overflow = 'hidden';
    }
    // Expõe no window para acesso externo
    window._pjeVoltarKanban = voltarKanban;

    // Se abriu no modo duplicados, já mostra o painel (sem flash do kanban)
    if (modo === 'duplicados') {
      mostrarDuplicados();
    }

    function atualizarPainelDuplicados() {
      // Reseta paginação ao receber dados novos
      _dupPage = 0;
      var toolbar = document.getElementById('pje-dup-toolbar-inline');
      var dashboard = document.getElementById('pje-dup-dashboard-inline');
      var summaryEl = document.getElementById('pje-scan-summary-inline');
      var statusEl = document.getElementById('pje-scan-status-inline');
      if (statusEl) statusEl.style.display = 'none';

      var duplicados = window._dupResults || [];
      var total = window._dupTotalProc || 0;
      var totalFilas = window._dupTotalFilas || FILAS.length;

      if (toolbar) toolbar.style.display = duplicados.length > 0 ? 'block' : 'none';
      if (dashboard) dashboard.style.display = duplicados.length > 0 ? 'grid' : 'none';

      // Stats
      var statCount = document.getElementById('pje-dup-stat-count-inline');
      var statFilas = document.getElementById('pje-dup-stat-filas-inline');
      var statTotal = document.getElementById('pje-dup-stat-total-inline');
      var statLastScan = document.getElementById('pje-dup-stat-lastscan-inline');
      if (statCount) statCount.textContent = duplicados.length;
      if (statFilas) statFilas.textContent = (window._dupTodasFilas || []).length;
      if (statTotal) statTotal.textContent = total.toLocaleString('pt-BR');
      if (statLastScan && window._dupLastScan) {
        statLastScan.textContent = formatarUltimoScan(window._dupLastScan);
      }

      renderFilaFiltersInline();
      aplicarFiltrosDuplicadosInline();
    }
    // Expõe no window para o escanearDuplicados conseguir chamar
    window._pjeAtualizarPainelDuplicados = atualizarPainelDuplicados;

    function renderFilaFilters() {
      var container = $('#pje-dup-fila-filters');
      if (!container) return;
      var filas = window._dupTodasFilas || [];
      var counts = {};
      (window._dupResults || []).forEach(function(d) {
        d.filas.forEach(function(f) {
          counts[f] = (counts[f] || 0) + 1;
        });
      });
      var html = '<span class=\"dup-fila-pill all active\" data-fila=\"*\">Todas</span>';
      filas.forEach(function(f) {
        html += '<span class=\"dup-fila-pill active\" data-fila=\"' + f.replace(/\"/g,'') + '\"><span class=\"pill-count\">' + (counts[f]||0) + '</span> ' + f.substring(0,40) + '</span>';
      });
      container.innerHTML = html;
      container.querySelectorAll('.dup-fila-pill').forEach(function(pill) {
        pill.addEventListener('click', function() {
          var fila = this.getAttribute('data-fila');
          if (fila === '*') {
            var allActive = this.classList.contains('active');
            container.querySelectorAll('.dup-fila-pill').forEach(function(p) {
              p.classList.toggle('active', !allActive);
            });
          } else {
            this.classList.toggle('active');
            var allPill = container.querySelector('.dup-fila-pill.all');
            var anyInactive = container.querySelector('.dup-fila-pill:not(.all):not(.active)');
            if (allPill) allPill.classList.toggle('active', !anyInactive);
          }
          aplicarFiltrosDuplicados();
        });
      });
    }

    function aplicarFiltrosDuplicados() {
      var gridInner = $('#pje-dup-grid-inner');
      var searchInput = $('#pje-dup-search');
      if (!gridInner) return;
      var resultados = window._dupResults || [];
      var searchTerm = searchInput ? searchInput.value.toLowerCase().replace(/\D/g,'') : '';
      var dashboard = $('#pje-dup-dashboard');
      if (dashboard) {
        dashboard.style.display = resultados.length > 0 ? 'grid' : 'none';
      }
      var activeFilas = [];
      var filaContainer = $('#pje-dup-fila-filters');
      if (filaContainer) {
        filaContainer.querySelectorAll('.dup-fila-pill:not(.all).active').forEach(function(p) {
          activeFilas.push(p.getAttribute('data-fila'));
        });
      }
      var filtrados = resultados.filter(function(d) {
        if (searchTerm && d.numero.replace(/\D/g,'').indexOf(searchTerm) === -1) return false;
        if (activeFilas.length === 0) return false;
        var temFila = d.filas.some(function(f) { return activeFilas.indexOf(f) !== -1; });
        if (!temFila) return false;
        return true;
      });
      if (resultados.length === 0) {
        gridInner.innerHTML = '<div class=\"dup-grid-empty\"><i class=\"fas fa-check-circle\" style=\"color:#10b981;opacity:.5\"></i><p>Nenhum processo duplicado encontrado!</p><div class=\"dup-grid-stats\"><span>Todas as <strong>' + (window._dupTotalFilas || FILAS.length) + '</strong> filas estão limpas</span></div></div>';
        return;
      }
      if (filtrados.length === 0) {
        gridInner.innerHTML = '<div class=\"dup-grid-empty\"><i class=\"fas fa-filter\"></i><p>Nenhum resultado para os filtros atuais</p><div class=\"dup-grid-stats\"><span>' + resultados.length + ' duplicado(s) encontrado(s), mas nenhum corresponde aos filtros</span></div></div>';
        return;
      }
      var html = '';
      filtrados.forEach(function(d) {
        html += '<div class=\"pje-dup-card-kanban\">';
        html += '<div class=\"dup-card-header\">';
        html += '<span class=\"dup-card-num\">' + d.numero + '</span>';
        html += '<div style=\"display:flex;align-items:center;gap:6px\">';
        html += '<span class=\"dup-card-badge\">' + d.filas.length + ' filas</span>';
        html += '</div>';
        html += '</div>';
        html += '<div class=\"dup-card-filas\">';
        d.filas.forEach(function(fila) {
          html += '<div class=\"dup-card-fila-row\"><i class=\"fas fa-circle\"></i> ' + fila + '</div>';
        });
        html += '</div>';
        html += '<div class=\"dup-card-footer\">';
        html += '<button class=\"dup-card-btn\" data-numero=\"' + d.numero + '\"><i class=\"fas fa-file-alt\"></i> Autos</button>';
        html += '</div>';
        html += '</div>';
      });
      gridInner.innerHTML = html;
      gridInner.querySelectorAll('.dup-card-btn').forEach(function(abtn) {
        abtn.addEventListener('click', function() {
          var numero = this.getAttribute('data-numero');
          var url = getAutosUrl(numero);
          window.open(url, '_blank');
        });
      });
      gridInner.querySelectorAll('.dup-card-copy').forEach(function(cbtn) {
        cbtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var num = this.getAttribute('data-num');
          navigator.clipboard.writeText(num).then(function() {
            mostrarToast('<i class=\"fas fa-check-circle\" style=\"color:#10b981\"></i><span class=\"toast-msg\">Copiado: <strong>' + num + '</strong></span>', 'success');
          }).catch(function() {
            mostrarToast('<i class=\"fas fa-times-circle\" style=\"color:#ef4444\"></i><span class=\"toast-msg\">Erro ao copiar</span>', 'error');
          });
        });
      });
    }

    function renderFilaFiltersInline() {
      var container = document.getElementById('pje-dup-fila-filters-inline');
      if (!container) return;
      var filas = window._dupTodasFilas || [];
      var counts = {};
      (window._dupResults || []).forEach(function(d) {
        d.filas.forEach(function(f) { counts[f] = (counts[f] || 0) + 1; });
      });
      var html = '<span class="dup-fila-pill all active" data-fila="*">Todas</span>';
      filas.forEach(function(f) {
        html += '<span class="dup-fila-pill active" data-fila="' + f.replace(/"/g,'') + '"><span class="pill-count">' + (counts[f]||0) + '</span> ' + f.substring(0,40) + '</span>';
      });
      container.innerHTML = html;
      container.querySelectorAll('.dup-fila-pill').forEach(function(pill) {
        pill.addEventListener('click', function() {
          var fila = this.getAttribute('data-fila');
          if (fila === '*') {
            var allActive = this.classList.contains('active');
            container.querySelectorAll('.dup-fila-pill').forEach(function(p) { p.classList.toggle('active', !allActive); });
          } else {
            this.classList.toggle('active');
            var allPill = container.querySelector('.dup-fila-pill.all');
            var anyInactive = container.querySelector('.dup-fila-pill:not(.all):not(.active)');
            if (allPill) allPill.classList.toggle('active', !anyInactive);
          }
          aplicarFiltrosDuplicadosInline();
        });
      });
    }

    var _dupPage = 0;
    var _dupPageSize = 12;
    var _dupLastFilterKey = '';

    function aplicarFiltrosDuplicadosInline() {
      var gridInner = document.getElementById('pje-dup-grid-inner-inline');
      var searchInput = document.getElementById('pje-dup-search-inline');
      if (!gridInner) return;

      var resultados = window._dupResults || [];
      var searchTerm = searchInput ? searchInput.value.toLowerCase().replace(/\D/g,'') : '';

      var activeFilas = [];
      var filaContainer = document.getElementById('pje-dup-fila-filters-inline');
      if (filaContainer) {
        filaContainer.querySelectorAll('.dup-fila-pill:not(.all).active').forEach(function(p) {
          activeFilas.push(p.getAttribute('data-fila'));
        });
      }

      var filtrados = resultados.filter(function(d) {
        if (searchTerm && d.numero.replace(/\D/g,'').indexOf(searchTerm) === -1) return false;
        if (activeFilas.length === 0) return false;
        return d.filas.some(function(f) { return activeFilas.indexOf(f) !== -1; });
      });

      // Reseta página apenas quando os filtros realmente mudam
      var filterKey = searchTerm + '|' + activeFilas.slice().sort().join(',');
      if (filterKey !== _dupLastFilterKey) {
        _dupPage = 0;
        _dupLastFilterKey = filterKey;
      }

      if (resultados.length === 0) {
        var oldPag2 = document.getElementById('dup-pagination');
        if (oldPag2) oldPag2.remove();
        gridInner.innerHTML = '<div class="dup-grid-empty"><i class="fas fa-check-circle" style="color:#10b981;opacity:.5"></i><p>Nenhum processo duplicado encontrado!</p></div>';
        return;
      }
      if (filtrados.length === 0) {
        var oldPag3 = document.getElementById('dup-pagination');
        if (oldPag3) oldPag3.remove();
        gridInner.innerHTML = '<div class="dup-grid-empty"><i class="fas fa-filter"></i><p>Nenhum resultado para os filtros atuais</p></div>';
        return;
      }

      var totalPages = Math.ceil(filtrados.length / _dupPageSize);
      if (_dupPage >= totalPages) _dupPage = Math.max(0, totalPages - 1);

      var start = _dupPage * _dupPageSize;
      var pagina = filtrados.slice(start, start + _dupPageSize);

      var html = '';
      pagina.forEach(function(d) {
        html += '<div class="pje-dup-card-kanban">';
        html += '<div class="dup-card-header"><span class="dup-card-num">' + d.numero + '</span>';
        html += '<div style="display:flex;align-items:center;gap:4px">';
        html += '<span class="dup-card-badge">' + d.filas.length + ' filas</span></div></div>';
        html += '<div class="dup-card-filas">';
        d.filas.forEach(function(fila) {
          html += '<div class="dup-card-fila-row"><i class="fas fa-circle"></i> ' + fila.substring(0,60) + '</div>';
        });
        html += '</div>';
        html += '<div class="dup-card-footer">';
        html += '<button class="dup-card-btn" data-numero="' + d.numero + '"><i class="fas fa-file-alt"></i> Autos</button>';
        html += '</div></div>';
      });
      gridInner.innerHTML = html;

      // Limpa paginação antiga
      var oldPag = document.getElementById('dup-pagination');
      if (oldPag) oldPag.remove();

      // Paginação
      if (totalPages > 1) {
        var pagHtml = '<div class="dup-pagination" id="dup-pagination">';
        pagHtml += '<button' + (_dupPage === 0 ? ' disabled' : '') + ' id="dup-prev-page"><i class="fas fa-chevron-left"></i> Anterior</button>';
        pagHtml += '<span class="dup-page-info">' + (_dupPage + 1) + ' de ' + totalPages + '</span>';
        pagHtml += '<button' + (_dupPage >= totalPages - 1 ? ' disabled' : '') + ' id="dup-next-page">Próximo <i class="fas fa-chevron-right"></i></button>';
        pagHtml += '</div>';
        gridInner.insertAdjacentHTML('afterend', pagHtml);

        var prevBtn = document.getElementById('dup-prev-page');
        var nextBtn = document.getElementById('dup-next-page');
        if (prevBtn) prevBtn.addEventListener('click', function() {
          if (_dupPage > 0) { _dupPage--; aplicarFiltrosDuplicadosInline(); }
        });
        if (nextBtn) nextBtn.addEventListener('click', function() {
          if (_dupPage < totalPages - 1) { _dupPage++; aplicarFiltrosDuplicadosInline(); }
        });
      }

      gridInner.querySelectorAll('.dup-card-btn').forEach(function(abtn) {
        abtn.addEventListener('click', function() {
          var id = this.getAttribute('data-id');
          var fila = decodeURIComponent(this.getAttribute('data-fila') || '');
          window.open(getTarefaUrl(id, fila), '_blank');
        });
      });
      gridInner.querySelectorAll('.dup-card-copy').forEach(function(cbtn) {
        cbtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var num = this.getAttribute('data-num');
          navigator.clipboard.writeText(num).then(function() {
            mostrarToast('<i class="fas fa-check-circle" style="color:#10b981"></i><span class="toast-msg">Copiado: <strong>' + num + '</strong></span>', 'success');
          });
        });
      });
    }

    // Bind inline dup panel
    var csvBtn = wrapper.querySelector('#pje-dup-csv-export');
    if (csvBtn) csvBtn.addEventListener('click', function() {
      var data = window._dupResults || [];
      if (!data.length) {
        mostrarToast('<span>Nenhum dado para exportar.</span>', 'warning');
        return;
      }
      // Aplica os mesmos filtros da tela (busca + pills de fila)
      var searchInput = document.getElementById('pje-dup-search-inline');
      var searchTerm = searchInput ? searchInput.value.toLowerCase().replace(/\D/g,'') : '';
      var activeFilas = [];
      var filaContainer = document.getElementById('pje-dup-fila-filters-inline');
      if (filaContainer) {
        filaContainer.querySelectorAll('.dup-fila-pill:not(.all).active').forEach(function(p) {
          activeFilas.push(p.getAttribute('data-fila'));
        });
      }
      var filtrados = data.filter(function(d) {
        if (searchTerm && d.numero.replace(/\D/g,'').indexOf(searchTerm) === -1) return false;
        if (activeFilas.length === 0) return false;
        return d.filas.some(function(f) { return activeFilas.indexOf(f) !== -1; });
      });
      if (!filtrados.length) {
        mostrarToast('<span>Nenhum processo com os filtros atuais.</span>', 'warning');
        return;
      }
      var csv = 'Número;Qtde Filas;Filas;idProcesso\n';
      filtrados.forEach(function(d) {
        csv += (d.numero||'') + ';' + (d.filas ? d.filas.length : 0) + ';"' + (d.filas||[]).join(' | ') + '";' + (d.idProcesso||'') + '\n';
      });
      var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'pje-duplicados-' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      var infoFiltro = searchTerm ? ' (filtro: ' + searchTerm + ')' : '';
      mostrarToast('<span>CSV exportado com <strong>' + filtrados.length + '</strong> processo(s)!' + infoFiltro + '</span>', 'success', { duracao: 4000 });
    });
    var scanBtnInline = wrapper.querySelector('#pje-btn-scan-duplicados-inline');
    if (scanBtnInline) scanBtnInline.addEventListener('click', function() {
        escanearDuplicadosDirecionado();
      });
    var cancelBtnInline = wrapper.querySelector('#pje-dup-cancel-inline');
    if (cancelBtnInline) cancelBtnInline.addEventListener('click', function() {
      if (typeof window._dupAbort === 'function') window._dupAbort();
      window._dupScanning = false;
    });
    // Modo fixo: sempre Direcionado
    if (!window._dupModo) setModoDuplicados('direcionado');
    // Inline fila selector setup
    popularFilaSelectorInline();
    setupFilasDropdown("-inline");
    var selectAllInline = wrapper.querySelector('#pje-dup-select-all-inline');
    if (selectAllInline) {
      selectAllInline.addEventListener('click', function() {
        var checks = wrapper.querySelectorAll('#pje-dup-fila-selector-inline .dup-fila-check');
        var allChecked = Array.from(checks).every(function(c) { return c.classList.contains('checked'); });
        checks.forEach(function(c) {
          if (allChecked) { c.classList.remove('checked'); c.querySelector('input').checked = false; }
          else { c.classList.add('checked'); c.querySelector('input').checked = true; }
        });
        this.textContent = allChecked ? 'Selecionar todas' : 'Limpar selecao';
        salvarFilasSelecionadas();
      });
    }
    var searchInline = wrapper.querySelector('#pje-dup-search-inline');
    if (searchInline) {
      var searchTimerInline;
      searchInline.addEventListener('input', function() {
        clearTimeout(searchTimerInline);
        searchTimerInline = setTimeout(aplicarFiltrosDuplicadosInline, 250);
      });
    }

    // Auto-fecha kanban ao clicar em outro item da sidebar/navbar
    const sidebarHandler = function(e) {
      // Ignora cliques dentro do próprio kanban ou no botão Citar
      if (e.target.closest('#liCitarIntimar') || e.target.closest('#pje-kanban-root')) return;
      // Detecta cliques em QUALQUER elemento dentro da sidebar ou área de navegação
      // (o seletor original a[href] falhava pq o Angular usa <a> sem href)
      const navClick = e.target.closest(
        '#menu, #divSideBar, .sideBarDefault, [role="menubar"],' +
        'nav, [role="navigation"], .navbar, .sidebar,' +
        '.breadcrumb, .breadcrumb-item, [ng-click], [routerLink],' +
        'div.nivel, .nivel a, .nivel li'
      );
      if (navClick) { fechar(); return; }
      // Fallback: qualquer <a> ou <button> com texto/appearance de navegação
      const link = e.target.closest('a, button[routerLink], li[role="menuitem"]');
      if (link && !link.href) {
        // <a> sem href = link Angular → fecha
        fechar();
      }
    };
    document.addEventListener('click', sidebarHandler, true);
    // Guarda referência pra remover no fechar
    wrapper._sidebarHandler = sidebarHandler;

    // Hash change (navegação Angular)
    const hashHandler = function() {
      if (!window.location.hash.includes('conteudo-tarefa')) fechar();
    };
    window.addEventListener('hashchange', hashHandler);
    wrapper._hashHandler = hashHandler;

    // PopState (HTML5 History API navigation — fallback adicional)
    const popstateHandler = function() {
      if (!window.location.hash.includes('conteudo-tarefa')) fechar();
    };
    window.addEventListener('popstate', popstateHandler);
    wrapper._popstateHandler = popstateHandler;

    // ── Handler de clique nos cards (delegação de eventos) ──
    const kanbanArea = wrapper.querySelector('.kanban-container');
    // ── Delegação de cliques: cards e toggle de colunas ──
    wrapper.addEventListener('click', function(e) {
      // Toggle de coluna (header ou botão)
      var col = e.target.closest('.kanban-column');
      var toggleBtn = e.target.closest('.column-toggle');
      var header = e.target.closest('.column-header');
      if (col && (toggleBtn || header)) {
        window._toggleKanbanColumn(col.id);
        return;
      }
      // Cards
      var card = e.target.closest('.bot-card');
      if (!card) return;
      var jobId = card.getAttribute('data-job-id');
      if (!jobId) return;
      var job = jobs.find(function(j) { return j.id === jobId; });
      if (!job) return;
      abrirModalDetalhes(job);
    });

    renderKanban();

    // Inicializa seletor de polo (select nativo + tags)
    initPoloPicker();

    // Restaura formulário salvo (sobrevive a navegações)
    if (saved) {
      const ta = $('#pje-ci-textarea');
      if (ta && saved.textarea) ta.value = saved.textarea;
      const taAlvara = $('#pje-alvara-textarea');
      if (taAlvara && saved.textareaAlvara) taAlvara.value = saved.textareaAlvara;
      const tipo = $('#pje-ci-tipo');
      if (tipo && saved.tipo) tipo.value = saved.tipo;
      const meio = $('#pje-ci-meio');
      if (meio && saved.meio) meio.value = saved.meio;
      const prazo = $('#pje-ci-prazo');
      if (prazo && saved.prazo) prazo.value = saved.prazo;
      if (saved.polos && Array.isArray(saved.polos)) {
        _poloState = saved.polos.filter(function(v) { return POLO_NOMES[v]; });
        renderTags();
      }
    }

    // Ativa o select e painel conforme _acaoAtual
    var validPanels = ['citar', 'alvara', 'outros'];
    var targetPanel = validPanels.indexOf(_acaoAtual) !== -1 ? _acaoAtual : 'citar';
    var selectMovFinal = wrapper.querySelector('#pje-tipo-movimentacao');
    if (selectMovFinal) selectMovFinal.value = targetPanel;
    var panelEl = wrapper.querySelector('#pje-panel-' + targetPanel);
    if (panelEl) panelEl.classList.add('active');
    // Atualiza título
    var titleEl = $('#pje-tool-title-text');
    var iconEl = wrapper.querySelector('#pje-tool-title i');
    if (titleEl) {
      if (targetPanel === 'alvara') titleEl.textContent = 'Emitir Alvará';
      else if (targetPanel === 'outros') titleEl.textContent = 'Outros';
      else titleEl.textContent = 'Citar/Intimar';
    }
    if (iconEl) {
      if (targetPanel === 'alvara') iconEl.className = 'fas fa-scroll';
      else if (targetPanel === 'outros') iconEl.className = 'fas fa-tools';
      else iconEl.className = 'fas fa-file-signature';
    }
  }

  function downloadCSV(acao) {
    acao = acao || _acaoAtual || 'citar';
    var cols = ['numero','status','fila','filaFinal','erro'];
    var header = 'N\u00famero;Status;Fila Inicial;Fila Final;Erro';
    var statusMap = {pending:'Aguardando',running:'Em execu\u00e7\u00e3o',complete:'Conclu\u00eddo',error:'Erro'};
    var rows = jobs.map(function(j) {
      return [
        j.numero,
        statusMap[j.status]||j.status,
        j.fila||'',
        j.filaFinal||'',
        (j.erro||'').replace(/;/g,',')
      ].join(';');
    });
    var csv = header + '\n' + rows.join('\n');
    var blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'pje-kanban-' + acao + '-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    log('📥 CSV baixado com ' + jobs.length + ' registro(s)');
  }

  window._toggleKanbanColumn = function(colId) {
    var col = document.getElementById(colId);
    if (!col) return;
    var isCollapsed = col.classList.toggle('collapsed');
    var icon = col.querySelector('.column-toggle i');
    if (icon) icon.className = 'fas ' + (isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left');
  };


  function fechar() {
    log('Fechando kanban...');
    salvarEstado();  // persiste formulário + jobs antes de sumir
    const root = $('#pje-kanban-root');
    // Remove o modal de detalhes se estiver aberto
    const modalOverlay = $('#pje-card-modal-overlay');
    if (modalOverlay) modalOverlay.remove();
    // Salva handlers e refs antes de remover o elemento
    const sidebarHandler = root && root._sidebarHandler;
    const hashHandler = root && root._hashHandler;
    const popstateHandler = root && root._popstateHandler;
    const originalChildren = root && root._originalChildren;
    if (root) root.remove();
    // Restaura scroll do body
    document.body.style.overflow = '';
    if (sidebarHandler) document.removeEventListener('click', sidebarHandler, true);
    if (hashHandler) window.removeEventListener('hashchange', hashHandler);
    if (popstateHandler) window.removeEventListener('popstate', popstateHandler);
    // Restaura #divRightPanel: reexibe conteúdo original
    var cnt = document.querySelector('#divRightPanel');
    if (cnt) {
      cnt.style.cssText = '';
      cnt.style.minHeight = '';
      if (originalChildren) {
        originalChildren.forEach(function(c) { c.style.display = ''; });
      }
    }
    cnt = document.querySelector('#divPainelUsuarioContent');
    if (cnt && cnt !== document.body) cnt.style.position = '';
    aberto = false;
    log('Kanban fechado.');
  }
