// ═══════════════════════════════════════════════════════════
// PJe Sejud — Agrupador de Processos (Modal)
// Depende de: utils.js, infra.js
// ═══════════════════════════════════════════════════════════

var AGR_STORAGE_KEY = 'pje_agrupador_state';

function salvarEstadoAgrupador(state) {
  try {
    sessionStorage.setItem(AGR_STORAGE_KEY, JSON.stringify({
      processos: state.processos || [],
      processosErro: state.processosErro || [],
      scanning: state.scanning || false,
      keyword: state.keyword || '',
      mode: state.mode || 'auto',
      ts: Date.now()
    }));
  } catch(e) {}
}

function carregarEstadoAgrupador() {
  try {
    var raw = sessionStorage.getItem(AGR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
}

function limparEstadoAgrupador() {
  try { sessionStorage.removeItem(AGR_STORAGE_KEY); } catch(e) {}
}

// Paginação da tabela de resultados
var _agrPage = 0;
var _agrPageSize = 50;
// Ordenação: campo + direção (4 combinações)
// 'dataChegada-desc' | 'dataChegada-asc' | 'ultimoMovimento-desc' | 'ultimoMovimento-asc'
var _agrSort = 'dataChegada-desc';
// Filtro de fila: 'todas' ou nome exato da fila
var _agrFilaFilter = 'todas';
// Filtro de etiqueta: 'todas' ou nomeTagCompleto
var _agrEtiquetaFilter = 'todas';
// Modo de visualização: false = processos com match, true = multi-fila
var _agrShowingMultiFila = false;

// Abre os Autos Digitais numa NOVA ABA autenticados com a chave de acesso (ca).
// O PJe exige a chave — a URL só com processo.numero cai em "Sem permissão".
// A aba é aberta pelo background (chrome.tabs.create): leva os cookies da sessão
// e não esbarra no bloqueador de popup (o window.open após await perde o gesto).
async function abrirAutosNovaAba(idProcesso, idTaskInstance, numero) {
  function abrirBg(url) {
    try {
      chrome.runtime.sendMessage({ type: 'openTab', url: url }, function(){});
    } catch(e) {
      var _r = (window.open && window.open.__pje_original__) || window.open;
      _r.call(window, url, '_blank');
    }
  }
  if (!idProcesso) { abrirBg(getAutosUrl(numero)); return; } // sem id: melhor esforço
  try {
    var chave = await ProcessosAPI.getChaveAcesso(idProcesso);
    if (!chave) throw new Error('chave de acesso vazia');
    abrirBg(ProcessosAPI.buildAutosUrl(idProcesso, chave, idTaskInstance || ''));
  } catch(e) {
    console.warn('[Agrupador] Falha ao gerar chave dos autos p/ ' + numero + ': ' + e.message);
    mostrarToastAgr('⚠️ Não gerou a chave de acesso — abrindo autos sem chave.', 'warning');
    abrirBg(getAutosUrl(numero));
  }
}

function renderizarTabelaAgrupador(overlay, processos, funcLabel, scanning) {
  var tbody = overlay.querySelector('#pje-agr-table-body');
  var titleEl = overlay.querySelector('#pje-agr-results-title');
  if (!tbody) return;

  // Filtra por fila se necessário
  var filtrados = _agrFilaFilter === 'todas'
    ? processos
    : processos.filter(function(p) { return p.fila === _agrFilaFilter; });

  // Filtra por etiqueta se necessário
  filtrados = _agrEtiquetaFilter === 'todas'
    ? filtrados
    : filtrados.filter(function(p) {
        return (p.etiquetas || []).indexOf(_agrEtiquetaFilter) !== -1;
      });

  var totalPages = Math.ceil(filtrados.length / _agrPageSize);

  // Ordena antes de paginar (sempre reordena — scan pode adicionar novos itens)
  var sortField = _agrSort.split('-')[0];      // 'dataChegada' ou 'ultimoMovimento'
  var sortDir = _agrSort.split('-')[1];         // 'desc' ou 'asc'
  var sorted = filtrados.slice().sort(function(a, b) {
    var va = a[sortField] || 0, vb = b[sortField] || 0;
    return sortDir === 'desc' ? vb - va : va - vb;
  });

  var start = _agrPage * _agrPageSize;
  var pagina = sorted.slice(start, start + _agrPageSize);

  if (titleEl) {
    var titleExtra = _agrFilaFilter !== 'todas' ? ' · Filtro: ' + _agrFilaFilter.substring(0, 40) : '';
    titleEl.textContent = 'Agrupado por ' + funcLabel + ' (' + filtrados.length + ' processo' + (filtrados.length>1?'s':'') + ')' + (scanning ? ' [ESCANEANDO...]' : '') + titleExtra;
  }

  if (!window._agrVisited) window._agrVisited = {};
  var ICON_ABRIR = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  var ICON_AUTOS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var ICON_DECISAO = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';

  var rows = '';
  for (var i = 0; i < pagina.length; i++) {
    var p = pagina[i];
    var globalIdx = start + i + 1;
    var abrirUrl = p.idTaskInstance ? getMovimentarUrl(p.idProcesso, p.idTaskInstance) : '';
    var visitado = window._agrVisited[p.numero] ? ' agr-visited' : '';
    var btnAutos = '<button class="pje-btn-agr pje-btn-agr-outline" style="padding:4px 8px;font-size:11px;margin-left:4px" data-action="autos" data-numero="' + p.numero + '" data-id-processo="' + (p.idProcesso||'') + '" data-id-task="' + (p.idTaskInstance||'') + '" title="Ver Autos Digitais">' + ICON_AUTOS + '</button>';
    var btnDecisao = p._linkDecisao
      ? '<button class="pje-btn-agr pje-btn-agr-outline" style="padding:4px 8px;font-size:11px;margin-left:4px" data-action="decisao" data-url="' + String(p._linkDecisao).replace(/"/g,'&quot;') + '" data-numero="' + p.numero + '" title="Abrir última decisão">' + ICON_DECISAO + '</button>'
      : '';
    var acoesHTML = abrirUrl
      ? '<button class="pje-btn-agr pje-btn-agr-outline" style="padding:4px 8px;font-size:11px" data-action="abrir" data-url="' + abrirUrl.replace(/"/g,'&quot;') + '" data-numero="' + p.numero + '">' + ICON_ABRIR + ' Abrir</button>' + btnAutos + btnDecisao
      : '<span style="font-size:11px;color:#94a3b8">sem tarefa</span>' + btnAutos + btnDecisao;
    var badge = p.idTaskInstance ? '<span class="agr-badge agr-badge-success">✓ Pronto</span>' : '<span class="agr-badge agr-badge-warning">⚠ Sem task</span>';
    var fmtData = function(ts) { if (!ts) return '—'; return new Date(ts).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric'}); };
    var dataChegada = fmtData(p.dataChegada);
    var ultMov = fmtData(p.ultimoMovimento);
    var filaTxt = (p.filas && p.filas.length > 1)
      ? '<span style="font-weight:600;color:#dc2626">' + p.filas.length + ' filas</span><br><span style="font-size:9px;color:#94a3b8">' + p.filas.map(function(f){ return f.substring(0,40); }).join('<br>') + '</span>'
      : (p.fila||'').substring(0,50);
    var etiquetasHtml = (p.etiquetas && p.etiquetas.length)
      ? p.etiquetas.map(function(e) { return '<span style="display:inline-block;font-size:9px;padding:1px 6px;border-radius:4px;background:#f1f5f9;color:#475569;margin:1px">' + e + '</span>'; }).join(' ')
      : '<span style="font-size:10px;color:#cbd5e1">—</span>';
    rows += '<tr class="agr-row' + visitado + '"><td style="color:#94a3b8;font-size:11px">'+globalIdx+'</td><td class="mono">'+p.numero+'</td><td style="font-size:11px;color:#64748b;white-space:nowrap">'+dataChegada+'</td><td style="font-size:11px;color:#64748b;white-space:nowrap">'+ultMov+'</td><td style="font-size:11px;color:#64748b;line-height:1.3">'+filaTxt+'</td><td style="font-size:10px">'+etiquetasHtml+'</td><td>'+badge+'</td><td style="text-align:center;white-space:nowrap">'+acoesHTML+'</td></tr>';
  }
  tbody.innerHTML = rows;

  // Event delegation: Abrir / Ver Autos / Abrir última decisão
  tbody.querySelectorAll('button[data-action]').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var action = btn.getAttribute('data-action');
      var numero = btn.getAttribute('data-numero');
      if (action === 'abrir') {
        window._agrVisited[numero] = true;            // feedback visual: marca a linha
        var tr = btn.closest('tr'); if (tr) tr.classList.add('agr-visited');
        window.open(btn.getAttribute('data-url'), '_blank');
      } else if (action === 'autos') {
        // Abre os Autos Digitais numa NOVA ABA, autenticados com a chave de
        // acesso (ca) — sem ela o PJe devolve "Sem permissão" (error.seam).
        var idProc = btn.getAttribute('data-id-processo');
        var idTask = btn.getAttribute('data-id-task') || '';
        await abrirAutosNovaAba(idProc, idTask, numero);
      } else if (action === 'decisao') {
        var decUrl = btn.getAttribute('data-url');
        if (decUrl) window.open(decUrl, '_blank');
      }
    });
  });

  // Remove paginação antiga
  var oldPag = overlay.querySelector('#pje-agr-pagination');
  if (oldPag) oldPag.remove();

  // Adiciona paginação se necessário
  if (totalPages > 1) {
    var pagDiv = document.createElement('div');
    pagDiv.id = 'pje-agr-pagination';
    pagDiv.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0';
    pagDiv.innerHTML =
      '<button id="pje-agr-prev" style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#334155;font-size:11px;cursor:pointer"' + (_agrPage === 0 ? ' disabled' : '') + '>← Anterior</button>' +
      '<span style="font-size:11px;color:#64748b;font-weight:500">' + (_agrPage + 1) + ' de ' + totalPages + '</span>' +
      '<button id="pje-agr-next" style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#334155;font-size:11px;cursor:pointer"' + (_agrPage >= totalPages - 1 ? ' disabled' : '') + '>Próximo →</button>';

    var tableWrap = overlay.querySelector('#pje-agr-table-wrap');
    if (tableWrap && tableWrap.parentNode) {
      tableWrap.parentNode.insertBefore(pagDiv, tableWrap.nextSibling);
    }

    pagDiv.querySelector('#pje-agr-prev').addEventListener('click', function() {
      if (_agrPage > 0) { _agrPage--; renderizarTabelaAgrupador(overlay, processos, funcLabel, scanning); }
    });
    pagDiv.querySelector('#pje-agr-next').addEventListener('click', function() {
      if (_agrPage < totalPages - 1) { _agrPage++; renderizarTabelaAgrupador(overlay, processos, funcLabel, scanning); }
    });
  }
}

function fecharAgrupadorModal() {
  // Desconecta a UI do runtime — o scan (se houver) CONTINUA em background.
  _agrDesconectarUI();
  var overlay = document.getElementById('pje-agrupador-overlay');
  if (overlay) overlay.remove();
  document.body.style.overflow = '';
  // Persiste o estado parcial pra sobreviver a reload da página
  var rt = _agrRuntime();
  if (rt && (rt.scanning || rt.processos.length > 0)) _agrSalvarEstado(rt);
}

// 🔧 Extrai apenas o TEXTO DO DOCUMENTO (decisão/despacho/sentença), ignorando o
// boilerplate da tela de movimentação. Usa DOMParser (decodifica entidades, não
// executa scripts). Resolve os falsos positivos de casar regex no HTML bruto:
//  - tags/JS/CSS/atributos criam boundaries artificiais;
//  - o <select> "Próxima ação" tem opções como "Intimar o MP" / "Citar/Intimar"
//    que aparecem em TODAS as tarefas e casariam \bMP\b em todo processo.
// Por isso isolamos o container da folha (#paginaInteira/.folha) e removemos
// selects/options/botões como rede de segurança.
function extrairTextoVisivel(html) {
  try {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    // Remove tudo que não é conteúdo da decisão:
    //  - script/style/noscript/head/link/meta/title: não-visível
    //  - select/option: opções de transição ("Intimar o MP", "Citar/Intimar"...) — falso positivo
    //  - button: botões de transição ("Cumprir determinações"...)
    //  - .post-it: metadados do documento (ID, autor, data, tipo)
    doc.querySelectorAll('script, style, noscript, head, link, meta, title, select, option, button, .post-it').forEach(function(el){ el.remove(); });

    // Prioriza o container do documento (a folha da decisão). Isso exclui o
    // restante do boilerplate (modais, formulários de transição, etc.).
    var folhas = doc.querySelectorAll('#paginaInteira, .folha');
    if (folhas.length > 0) {
      var texto = '';
      folhas.forEach(function(f){ texto += (f.textContent || '') + ' '; });
      return texto;
    }
    // Fallback dentro do documento: área da página inteira
    var container = doc.querySelector('#areaPagina') || doc.querySelector('.impresso') || doc.body;
    return (container && container.textContent) || '';
  } catch(e) {
    // Fallback regex (raro — DOMParser é suportado em qualquer Chrome moderno)
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<head[\s\S]*?<\/head>/gi, ' ')
      .replace(/<select[\s\S]*?<\/select>/gi, ' ')
      .replace(/<button[\s\S]*?<\/button>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, function(m, c) { try { return String.fromCharCode(parseInt(c, 10)); } catch(_) { return ' '; } })
      .replace(/&[a-zA-Z]+;/g, ' ');
  }
}

// 🔧 BUSCA EXATA COM WORD BOUNDARY — sobre o TEXTO VISÍVEL (não o HTML bruto).
// Recebe um ARRAY de palavras e exige que TODAS estejam presentes (AND condicional):
// o processo só é match se contiver cada palavra isolada em algum ponto do texto.
// \bKW\b só encontra "KW" isolado — nunca dentro de "cumpram", nem no boilerplate.
// Retorna { found, contextos: [{kw, contexto}] } — found true só se todas casaram.
function buscaPalavrasNoHTML(html, keywords) {
  var texto = extrairTextoVisivel(html);
  var contextos = [];
  for (var i = 0; i < keywords.length; i++) {
    var kw = keywords[i];
    var kwEscaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var m = new RegExp('\\b' + kwEscaped + '\\b', 'i').exec(texto);
    if (!m) return { found: false, contextos: contextos }; // AND: uma faltou → não é match
    var ctx = texto.substring(Math.max(0, m.index - 45), m.index + m[0].length + 45).replace(/\s+/g, ' ').trim();
    contextos.push({ kw: kw, contexto: ctx });
  }
  return { found: true, contextos: contextos };
}

// ═══════════════════════════════════════════════════════════
// RUNTIME DE SCAN — separa o scan da UI para sobreviver ao fechamento do modal.
// O scan vive em window._agrScanRuntime; a UI apenas se conecta/desconecta.
// Assim: fechar o modal NÃO mata o scan; reabrir reconecta ao progresso real;
// cancelar funciona de qualquer estado; a contagem sincroniza sozinha.
// ═══════════════════════════════════════════════════════════

var AGR_SPIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:fa-spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
var AGR_SEARCH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
var AGR_CANCEL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

function _agrRuntime() {
  if (!window._agrScanRuntime) {
    window._agrScanRuntime = {
      scanning: false, cancelled: false, finishedAt: 0,
      mode: 'auto', keyword: '', keywords: [], funcLabel: '',
      etapa: '',                  // texto da etapa atual ("Etapa 2/2: escaneando", ...)
      total: 0, done: 0, matches: 0,
      processos: [],              // matches encontrados (parciais durante o scan)
      processosErro: [],          // processos que falharam ao buscar (distinto de "não encontrado")
      multiFila: 0,
      mfToken: 0,            // invalida loops de multi-fila ao trocar de view/análise
      cancelFlag: { cancel: false },
      uiOverlay: null,            // overlay atualmente conectado (null se modal fechado)
      _lastRenderedCount: -1      // p/ evitar re-renderizar tabela sem match novo
    };
  }
  return window._agrScanRuntime;
}

function _agrSalvarEstado(rt) {
  salvarEstadoAgrupador({
    processos: rt.processos, scanning: rt.scanning,
    keyword: rt.keyword, keywords: rt.keywords, mode: rt.mode, funcLabel: rt.funcLabel,
    done: rt.done, total: rt.total, matches: rt.matches
  });
}

// Desenha o estado real do runtime na UI conectada (se ainda viva).
function _agrRenderUI(rt) {
  var overlay = rt.uiOverlay;
  if (!overlay || !document.body.contains(overlay)) { rt.uiOverlay = null; return; }

  var btn       = overlay.querySelector('#pje-agr-btn-analisar');
  var btnCancel = overlay.querySelector('#pje-agr-btn-cancelar');
  var btnLimpar = overlay.querySelector('#pje-agr-btn-limpar');
  var stats     = overlay.querySelector('#pje-agr-stats');
  var empty     = overlay.querySelector('#pje-agr-empty');
  var results   = overlay.querySelector('#pje-agr-results');

  function atualizarStats() {
    if (!stats) return;
    var totalData = _agrShowingMultiFila ? (rt.processosMultiFila || []) : rt.processos;
    overlay.querySelector('#pje-agr-stat-total').textContent = totalData.length;
    overlay.querySelector('#pje-agr-stat-grupos').textContent = _agrShowingMultiFila ? 'Multi-Fila' : ('1 (' + rt.funcLabel + ')');
    overlay.querySelector('#pje-agr-stat-multifila').textContent = rt.multiFila || 0;
    var fu = []; (rt.processos || []).forEach(function(p){ if(fu.indexOf(p.fila)===-1) fu.push(p.fila); });
    overlay.querySelector('#pje-agr-stat-por-fila').textContent = fu.length;
    // Card de erros: processos que falharam ao buscar (distinto de "não encontrado")
    overlay.querySelector('#pje-agr-stat-erros').textContent = (rt.processosErro || []).length;
    var cardErros = overlay.querySelector('#pje-agr-stat-card-erros');
    if (cardErros) {
      var errosLista = rt.processosErro || [];
      if (errosLista.length > 0) {
        var lista = errosLista.map(function(e) { return e.numero + ' (' + e.erro + ')'; }).join('\n');
        cardErros.title = errosLista.length + ' processo(s) com ERRO na busca (não foi possível ler a página):\n\n' + lista;
      } else {
        cardErros.title = 'Nenhum erro na busca.';
      }
    }
    // Cards clicáveis: Total ↔ Multi-Fila alternam a visualização
    var cardTotal = overlay.querySelector('#pje-agr-stat-card-total');
    var cardMf = overlay.querySelector('#pje-agr-stat-card-multifila');
    if (cardTotal && cardMf) {
      // Reset visual
      cardMf.style.border = '';
      cardMf.style.background = '';
      cardTotal.style.border = '';
      cardTotal.style.background = '';

      cardMf.style.cursor = (rt.multiFila || 0) > 0 ? 'pointer' : 'help';
      cardTotal.style.cursor = _agrShowingMultiFila ? 'pointer' : 'default';
      cardMf.title = (rt.multiFila || 0) > 0 ? 'Clique para ver os ' + rt.multiFila + ' processo(s) em múltiplas filas' : 'Nenhum processo em múltiplas filas.';
      cardTotal.title = _agrShowingMultiFila ? 'Clique para voltar aos resultados' : '';

      // Destaque visual no card ativo
      if (_agrShowingMultiFila) {
        cardMf.style.border = '2px solid #f97316';
        cardMf.style.background = '#fff7ed';
      } else {
        cardTotal.style.border = '2px solid #10b981';
        cardTotal.style.background = '#f0fdf4';
      }

      cardMf.onclick = async function() {
        if ((rt.multiFila || 0) === 0) return;
        var meuToken = ++rt.mfToken;   // invalida loops de multi-fila anteriores
        _agrShowingMultiFila = true;
        _agrPage = 0;
        overlay._agrProcessosData = rt.processosMultiFila || [];
        renderizarTabelaAgrupador(overlay, rt.processosMultiFila || [], 'Multi-Fila (' + rt.multiFila + ' processo' + (rt.multiFila>1?'s':'') + ')', false);
        atualizarStats();

        // Busca /tarefas para cada processo multi-fila (sequencial, 1 por vez)
        var mfList = rt.processosMultiFila || [];
        if (!mfList.length) return;
        mostrarToastAgr('🏷️ Buscando filas de ' + mfList.length + ' processo(s)...', 'info');
        for (var j = 0; j < mfList.length; j++) {
          // Se o usuário trocou de view (Total / nova Multi-Fila / nova análise), interrompe
          if (rt.mfToken !== meuToken) break;
          var proc = mfList[j];
          try {
            var r = await fetch(API + '/tarefas', {
              method: 'POST', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ numeroProcesso: proc.numero, competencia: '', etiquetas: [] })
            });
            if (!r.ok) continue;
            var tarefas = await r.json();
            if (Array.isArray(tarefas) && tarefas.length > 0) {
              var todasFilas = tarefas.map(function(t) { return t.nome; }).filter(Boolean);
              proc.filas = todasFilas;
              proc.filasNomes = todasFilas;
              proc.fila = todasFilas[0] || proc.fila;
              console.log('[Agrupador] /tarefas para ' + proc.numero + ': ' + todasFilas.length + ' filas → ' + todasFilas.join(', '));
            }
          } catch(e) { console.warn('[Agrupador] /tarefas erro para ' + proc.numero + ': ' + e.message); }
          // Re-render a cada 5 processos ou no último — só se ainda estamos nesta view
          if (rt.mfToken === meuToken && (j % 5 === 0 || j === mfList.length - 1)) {
            renderizarTabelaAgrupador(overlay, mfList, 'Multi-Fila (' + mfList.length + ' processo' + (mfList.length>1?'s':'') + ')', false);
          }
          if (rt.mfToken !== meuToken) break;
          if (j < mfList.length - 1) await new Promise(function(r) { setTimeout(r, 400); });
        }
        if (rt.mfToken === meuToken) mostrarToastAgr('✅ ' + mfList.length + ' processo(s) multi-fila analisado(s).', 'success');
      };
      cardTotal.onclick = function() {
        if (!_agrShowingMultiFila) return;
        rt.mfToken++;   // cancela qualquer loop de busca de filas em andamento
        _agrShowingMultiFila = false;
        _agrPage = 0;
        overlay._agrProcessosData = rt.processos;
        renderizarTabelaAgrupador(overlay, rt.processos, rt.funcLabel, false);
        atualizarStats();
      };
    }
    // Atualiza o select de filtro de fila
    var filaSelect = overlay.querySelector('#pje-agr-fila-select');
    if (filaSelect) {
      var currentVal = _agrFilaFilter;
      filaSelect.innerHTML = '<option value="todas">Todas as filas</option>';
      fu.forEach(function(f) {
        var short = f.length > 50 ? f.substring(0, 47) + '…' : f;
        filaSelect.innerHTML += '<option value="' + f.replace(/"/g,'&quot;') + '"' + (currentVal === f ? ' selected' : '') + '>' + short + '</option>';
      });
    }
    // Atualiza o select de filtro de etiqueta
    var etiqSelect = overlay.querySelector('#pje-agr-etiqueta-select');
    if (etiqSelect) {
      var etiqAtual = _agrEtiquetaFilter;
      var etiqs = [];
      (rt.processos || []).forEach(function(p) {
        (p.etiquetas || []).forEach(function(e) { if (etiqs.indexOf(e) === -1) etiqs.push(e); });
      });
      etiqSelect.innerHTML = '<option value="todas">Todas etiquetas</option>';
      etiqs.sort().forEach(function(e) {
        var short = e.length > 40 ? e.substring(0, 37) + '…' : e;
        etiqSelect.innerHTML += '<option value="' + e.replace(/"/g,'&quot;') + '"' + (etiqAtual === e ? ' selected' : '') + '>' + short + '</option>';
      });
    }
  }
  function renderTabela(scanning) {
    if (rt._lastRenderedCount === rt.processos.length && !_agrShowingMultiFila) return;
    if (_agrShowingMultiFila) {
      overlay._agrProcessosData = rt.processosMultiFila || [];
      _agrPage = 0;
      renderizarTabelaAgrupador(overlay, rt.processosMultiFila || [], 'Multi-Fila (' + (rt.multiFila||0) + ' processo' + ((rt.multiFila||0)>1?'s':'') + ')', scanning);
      return;
    }
    overlay._agrProcessosData = rt.processos;
    _agrPage = 0;
    renderizarTabelaAgrupador(overlay, rt.processos, rt.funcLabel, scanning);
    rt._lastRenderedCount = rt.processos.length;
  }

  if (rt.scanning) {
    // ── Scan em andamento ──
    var label = rt.etapa || 'Processando';
    if (rt.total > 0) label += ': ' + rt.done + '/' + rt.total + ' (' + rt.matches + ' match)';
    if (btn) { btn.disabled = true; btn.innerHTML = AGR_SPIN + ' ' + label; }
    if (btnCancel) {
      btnCancel.style.display = '';
      btnCancel.disabled = rt.cancelled;
      btnCancel.innerHTML = rt.cancelled ? AGR_SPIN + ' Cancelando...' : AGR_CANCEL + ' Cancelar';
    }
    if (btnLimpar) btnLimpar.style.display = 'none';

    if (rt.processos.length > 0) {
      if (stats) stats.style.display = 'grid';
      if (empty) empty.style.display = 'none';
      if (results) results.style.display = 'block';
      atualizarStats();
      renderTabela(true);
    } else {
      // Sem matches ainda: limpa a área de resultados, só o botão mostra progresso
      if (stats) stats.style.display = 'none';
      if (results) results.style.display = 'none';
      if (empty) empty.style.display = 'none';
    }
  } else {
    // ── Scan finalizado (ou ocioso) ──
    if (btnCancel) btnCancel.style.display = 'none';
    if (btnLimpar) btnLimpar.style.display = '';
    if (btn) { btn.disabled = false; btn.innerHTML = AGR_SEARCH + ' Analisar Processos'; }

    if (rt.processos.length > 0) {
      if (stats) stats.style.display = 'grid';
      if (empty) empty.style.display = 'none';
      if (results) results.style.display = 'block';
      atualizarStats();
      renderTabela(false);
    } else {
      if (stats) stats.style.display = 'none';
      if (results) results.style.display = 'none';
      if (empty) {
        empty.style.display = 'flex';
        var t = empty.querySelector('.agr-empty-title');
        if (t) t.textContent = rt.funcLabel ? ('Nenhum processo com ' + rt.funcLabel) : 'Nenhum processo analisado';
        var d = empty.querySelector('.agr-empty-desc');
        if (d) d.innerHTML = rt.funcLabel
          ? ('Nenhum processo com <strong>' + rt.funcLabel + '</strong> foi encontrado no HTML das páginas. Tente selecionar outras filas ou verifique a keyword.')
          : 'Selecione as filas e clique em <strong>Analisar Processos</strong>.';
      }
    }
  }
}

// Liga o overlay atual ao runtime (chamado ao abrir o modal).
function _agrConectarUI(overlay) {
  var rt = _agrRuntime();

  // Se não há scan ativo e nada no runtime, tenta restaurar último resultado do sessionStorage (pós-reload)
  if (!rt.scanning && rt.processos.length === 0 && !rt.finishedAt) {
    var saved = carregarEstadoAgrupador();
    if (saved && saved.processos && saved.processos.length > 0) {
      // saved.scanning true aqui significa scan interrompido por reload — tratar como finalizado
      rt.processos = saved.processos;
      rt.keyword = saved.keyword || '';
      rt.keywords = saved.keywords || (saved.keyword ? [saved.keyword] : []);
      rt.funcLabel = saved.funcLabel || (saved.keyword ? ('"' + saved.keyword + '"') : 'CEJUSC');
      rt.mode = saved.mode || 'auto';
      rt.finishedAt = saved.ts || 1;
    }
  }

  rt.uiOverlay = overlay;
  rt._lastRenderedCount = -1; // força re-render na (re)conexão

  // Reconecta o botão Cancelar ao runtime (funciona após reabrir)
  var btnCancel = overlay.querySelector('#pje-agr-btn-cancelar');
  if (btnCancel) btnCancel.onclick = _agrCancelar;

  _agrRenderUI(rt);
}

// Desliga a UI do runtime sem matar o scan (chamado ao fechar o modal).
function _agrDesconectarUI() {
  var rt = _agrRuntime();
  rt.uiOverlay = null;
}

// Cancela o scan em andamento (idempotente — vale de qualquer estado/UI).
function _agrCancelar() {
  var rt = _agrRuntime();
  if (!rt.scanning) return;
  rt.cancelled = true;
  rt.cancelFlag.cancel = true;
  try { chrome.runtime.sendMessage({ type: 'cancelAllFetch' }, function(){}); } catch(e){}
  _agrRenderUI(rt);
}

// Zera tudo (botão Limpar): cancela scan, limpa runtime e sessionStorage.
function _agrLimparRuntime() {
  var rt = _agrRuntime();
  rt.cancelled = true;
  rt.cancelFlag.cancel = true;
  _agrShowingMultiFila = false;
  _agrEtiquetaFilter = 'todas';
  _agrFilaFilter = 'todas';
  try { chrome.runtime.sendMessage({ type: 'cancelAllFetch' }, function(){}); } catch(e){}
  window._agrScanRuntime = null;
  window._agrVisited = {};   // limpa marcação de processos abertos
  _agrProcessosCache = {};
  limparEstadoAgrupador();
}

function injetarEstilosAgrupador() {
  if (document.getElementById('pje-agrupador-style')) return;
  var s = document.createElement('style');
  s.id = 'pje-agrupador-style';
  s.textContent = substituirCores(`
#pje-agrupador-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.7);backdrop-filter:blur(4px);z-index:2147483647;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease}
#pje-agrupador-box{background:#fff;border-radius:14px;width:96vw;max-width:1100px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35);animation:modalIn .25s ease}
#pje-agrupador-header{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:16px 24px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
#pje-agrupador-header h3{font-size:17px;font-weight:600;display:flex;align-items:center;gap:10px;margin:0}
#pje-agrupador-close{background:rgba(255,255,255,.12);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:background .15s}
#pje-agrupador-close:hover{background:rgba(255,255,255,.22)}
#pje-agrupador-body{flex:1;overflow-y:auto;padding:24px;min-height:300px;background:#f8fafc;display:flex;flex-direction:column;gap:20px}
#pje-agrupador-footer{padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#64748b;background:#fff;border-radius:0 0 14px 14px;flex-shrink:0}

/* ── Mode Toggle ── */
.agr-mode-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.agr-mode-toggle{display:inline-flex;background:#e2e8f0;border-radius:8px;padding:2px;border:1px solid #cbd5e1}
.agr-mode-btn{min-height:34px;padding:6px 16px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:#64748b;font-family:inherit;border-radius:6px;transition:all .15s;white-space:nowrap;display:flex;align-items:center;gap:6px}
.agr-mode-btn:hover{color:#334155}
.agr-mode-btn.active{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,.1);font-weight:700}

/* ── Textarea ── */
#pje-agrupador-textarea{width:100%;min-height:180px;padding:14px 16px;border:2px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:'SF Mono','Fira Code',Consolas,monospace;background:#fff;color:#1e293b;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6;transition:border-color .15s,box-shadow .15s}
#pje-agrupador-textarea:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.1)}
#pje-agrupador-textarea::placeholder{color:#94a3b8;font-family:inherit;font-style:italic}

/* ── Buttons ── */
.pje-btn-agr{display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
.pje-btn-agr-primary{border:none;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff}
.pje-btn-agr-primary:hover{background:linear-gradient(135deg,#1e293b,#334155);transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,23,42,.25)}
.pje-btn-agr-primary:active{transform:translateY(0)}
.pje-btn-agr-outline{border:1.5px solid #e2e8f0;background:#fff;color:#475569}
.pje-btn-agr-outline:hover{border-color:#cbd5e1;background:#f8fafc;color:#0f172a}
.pje-btn-agr-ghost{border:none;background:transparent;color:#94a3b8;padding:10px 18px}
.pje-btn-agr-ghost:hover{background:#f1f5f9;color:#64748b}
.pje-btn-agr-cancel{border:1.5px solid #fecaca;background:#fef2f2;color:#dc2626}
.pje-btn-agr-cancel:hover{background:#fee2e2;border-color:#fca5a5;color:#b91c1c;transform:translateY(-1px);box-shadow:0 4px 12px rgba(220,38,38,.15)}
.pje-btn-agr-cancel:active{transform:translateY(0)}
.pje-btn-agr-cancel:disabled{opacity:.5;cursor:not-allowed;transform:none}
.agr-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}

/* ── Stats Cards ── */
.agr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.agr-stat-card{background:#fff;border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 3px rgba(0,0,0,.04);border:1px solid #e2e8f0;transition:all .2s}
.agr-stat-card:hover{border-color:#cbd5e1;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.agr-stat-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.agr-stat-info{display:flex;flex-direction:column;gap:2px}
.agr-stat-value{font-size:24px;font-weight:700;color:#0f172a;line-height:1;letter-spacing:-0.5px}
.agr-stat-label{font-size:12px;color:#64748b;font-weight:500}

/* ── Empty State ── */
.agr-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:16px;color:#94a3b8;text-align:center;min-height:220px;border:2px dashed #e2e8f0;border-radius:12px;background:rgba(248,250,252,.5)}
.agr-empty-icon{opacity:.3;transition:opacity .3s}
.agr-empty-title{font-size:15px;font-weight:600;color:#64748b}
.agr-empty-desc{font-size:12px;color:#94a3b8;max-width:380px;line-height:1.5}

/* ── Results Table ── */
.agr-results{background:#fff;border-radius:12px;border:1px solid #e2e8f0}
.agr-results-header{padding:14px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;color:#475569}
.agr-table{width:100%;border-collapse:collapse}
.agr-table th{padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.3px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.agr-table td{padding:10px 14px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}
.agr-table tr:hover td{background:#f8fafc}
.agr-table tr.agr-visited td{background:#ecfdf5}
.agr-table tr.agr-visited td:first-child{box-shadow:inset 3px 0 0 #10b981}
.agr-table tr.agr-visited .mono{color:#059669;font-weight:700}
.agr-table tr.agr-visited:hover td{background:#d1fae5}
.agr-table .mono{font-family:'SF Mono','Fira Code',monospace;font-size:12px;color:#0f172a}
.agr-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}
.agr-badge-success{background:#ecfdf5;color:#059669}
.agr-badge-info{background:#f8fafc;color:#475569}
.agr-badge-warning{background:#fffbeb;color:#d97706}

/* ── Funcionalidade Select ── */
.agr-func-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.agr-func-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.agr-func-select{-webkit-appearance:none;appearance:none;height:36px;padding:0 36px 0 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:600;font-family:inherit;background-color:#fff;color:#0f172a;cursor:pointer;transition:all .15s;outline:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;min-width:220px}
.agr-func-select:hover{border-color:#64748b}
.agr-func-select:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.1)}

/* ── Fila Selector (Análise Automática) ── */
.agr-filas-section{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:10px}
.agr-filas-section-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.agr-filas-trigger{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
.agr-filas-trigger:hover{border-color:#64748b;background:#f8fafc}
.agr-filas-trigger .count{background:#f1f5f9;color:#475569;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;min-width:16px;text-align:center}
.agr-filas-wrap{position:relative}
.agr-filas-dropdown{display:none;position:absolute;top:100%;left:0;margin-top:4px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.14);z-index:2147483646;min-width:320px;max-height:280px;overflow-y:auto;padding:6px}
.agr-filas-dropdown.open{display:block}
.agr-fila-check{display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:7px;font-size:12px;font-weight:500;cursor:pointer;color:#334155;user-select:none;transition:background .1s}
.agr-fila-check:hover{background:#f1f5f9}
.agr-fila-check.checked{background:#f8fafc;color:#475569;font-weight:600}
.agr-fila-check input{display:none}
.agr-fila-check .check-icon{width:15px;height:15px;border:2px solid #cbd5e1;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;font-size:9px;color:transparent}
.agr-fila-check.checked .check-icon{background:#64748b;border-color:#64748b;color:#fff}
.agr-select-all{font-size:10px;color:#64748b;cursor:pointer;font-weight:600;user-select:none;white-space:nowrap;padding:5px 8px;border-radius:5px;transition:all .1s}
.agr-select-all:hover{background:#f1f5f9;color:#0f172a}

/* ── Tags de busca (múltiplas palavras-chave, AND) ── */
#pje-agr-tags-wrap{display:flex}
#pje-agr-tags-wrap:focus-within{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.1)}
.agr-tag{display:inline-flex;align-items:center;gap:5px;padding:3px 4px 3px 10px;border-radius:14px;background:linear-gradient(135deg,#1e3a5f,#0f172a);color:#fff;font-size:11px;font-weight:600;line-height:1;white-space:nowrap;animation:modalIn .15s ease}
.agr-tag-x{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:none;border-radius:50%;background:rgba(255,255,255,.2);color:#fff;font-size:13px;line-height:1;cursor:pointer;font-family:inherit;padding:0;transition:background .12s}
.agr-tag-x:hover{background:rgba(255,255,255,.4)}
`);
  document.head.appendChild(s);
}

function abrirAgrupadorModal() {
  try {
    console.log('[PJe Agrupador] abrirAgrupadorModal() iniciado');
    injetarEstilosAgrupador();
    fecharAgrupadorModal();

    var overlay = document.createElement('div');
    overlay.id = 'pje-agrupador-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.7);backdrop-filter:blur(4px);z-index:2147483647;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML =
      '<div id="pje-agrupador-box" style="background:#fff;border-radius:14px;width:96vw;max-width:1100px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35);">' +
        // ── Header ──
        '<div id="pje-agrupador-header">' +
          '<h3>' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' +
              '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>' +
              '<path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>' +
              '<path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>' +
            '</svg>' +
            'Agrupador de Processos' +
          '</h3>' +
          '<button id="pje-agrupador-close" title="Fechar (Esc)">✕</button>' +
        '</div>' +
        // ── Body ──
        '<div id="pje-agrupador-body">' +
          // Mode toggle
          '<div class="agr-mode-bar">' +
            '<span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.3px">Modo</span>' +
            '<div class="agr-mode-toggle" id="pje-agr-mode-toggle">' +
              '<button class="agr-mode-btn active" data-mode="auto">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><circle cx="12" cy="12" r="10"/><path d="m12 7v5l3 3"/></svg>' +
                'Análise Automática' +
              '</button>' +
              '<button class="agr-mode-btn" data-mode="manual">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
                'Lista Manual' +
              '</button>' +
            '</div>' +
          '</div>' +
          // Funcionalidade
          '<div class="agr-func-row" style="margin-top:4px">' +
            '<span class="agr-func-label">Funcionalidade</span>' +
            '<select class="agr-func-select" id="pje-agr-func-select">' +
              '<option value="cejusc" selected>Agrupar por CEJUSC</option>' +
              '<option value="custom">Personalizada...</option>' +
            '</select>' +
            '<div id="pje-agr-tags-wrap" style="display:none;flex:1;min-width:240px;max-width:520px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;padding:4px 8px;flex-wrap:wrap;gap:6px;align-items:center;min-height:36px;transition:border-color .15s,box-shadow .15s">' +
              '<div id="pje-agr-tags-list" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"></div>' +
              '<input type="text" id="pje-agr-tag-input" placeholder="Digite uma palavra e pressione Enter..." style="flex:1;min-width:140px;border:none;outline:none;font-size:12px;font-family:inherit;background:transparent;color:#0f172a;height:30px;padding:0 4px">' +
            '</div>' +
          '</div>' +
          // Fila Selector (apenas Análise Automática)
          '<div class="agr-filas-section" id="pje-agr-filas-section">' +
            '<span class="agr-filas-section-label">Filas</span>' +
            '<div class="agr-filas-wrap">' +
              '<button class="agr-filas-trigger" id="pje-agr-filas-trigger">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>' +
                '<span class="count" id="pje-agr-filas-count">13</span> filas selecionadas' +
              '</button>' +
              '<div class="agr-filas-dropdown" id="pje-agr-filas-dropdown">' +
                '<div style="padding:6px 10px;border-bottom:1px solid #f1f5f9;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">' +
                  '<span style="font-size:11px;font-weight:600;color:#64748b">SELECIONAR FILAS</span>' +
                  '<span class="agr-select-all" id="pje-agr-select-all">Todas / Nenhuma</span>' +
                '</div>' +
                '<div id="pje-agr-fila-selector"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          // Textarea (apenas Lista Manual)
          '<textarea id="pje-agrupador-textarea" placeholder="Cole os números dos processos aqui...&#10;Um por linha ou separados por vírgula/ponto-e-vírgula&#10;&#10;Exemplo:&#10;0000001-12.2024.8.06.0001&#10;0000002-34.2024.8.06.0001" style="display:none"></textarea>' +
          // Actions
          '<div class="agr-actions">' +
            '<button class="pje-btn-agr pje-btn-agr-primary" id="pje-agr-btn-analisar">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
              'Analisar Processos' +
            '</button>' +
            '<button class="pje-btn-agr pje-btn-agr-outline" id="pje-agr-btn-limpar">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>' +
              'Limpar' +
            '</button>' +
            '<button class="pje-btn-agr pje-btn-agr-cancel" id="pje-agr-btn-cancelar" style="display:none">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' +
              'Cancelar' +
            '</button>' +
          '</div>' +
          // Stats
          '<div class="agr-stats" id="pje-agr-stats" style="display:none">' +
            '<div class="agr-stat-card" id="pje-agr-stat-card-total">' +
              '<div class="agr-stat-icon" style="background:#f0fdf4"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>' +
              '<div class="agr-stat-info"><span class="agr-stat-value" id="pje-agr-stat-total">0</span><span class="agr-stat-label">Total Processos</span></div>' +
            '</div>' +
            '<div class="agr-stat-card">' +
              '<div class="agr-stat-icon" style="background:#f8fafc"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/></svg></div>' +
              '<div class="agr-stat-info"><span class="agr-stat-value" id="pje-agr-stat-grupos">0</span><span class="agr-stat-label">Grupos Encontrados</span></div>' +
            '</div>' +
            '<div class="agr-stat-card" id="pje-agr-stat-card-multifila" style="position:relative;cursor:help" title="">' +
              '<div class="agr-stat-icon" style="background:#fff7ed"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
              '<div class="agr-stat-info"><span class="agr-stat-value" id="pje-agr-stat-multifila">0</span><span class="agr-stat-label">Multi-Fila (ignorados)</span></div>' +
            '</div>' +
            '<div class="agr-stat-card">' +
              '<div class="agr-stat-icon" style="background:#f3e8ff"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></div>' +
              '<div class="agr-stat-info"><span class="agr-stat-value" id="pje-agr-stat-por-fila">0</span><span class="agr-stat-label">Filas Distintas</span></div>' +
            '</div>' +
            '<div class="agr-stat-card" id="pje-agr-stat-card-erros" style="position:relative;cursor:help" title="">' +
              '<div class="agr-stat-icon" style="background:#fef2f2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
              '<div class="agr-stat-info"><span class="agr-stat-value" id="pje-agr-stat-erros">0</span><span class="agr-stat-label">Erros na Busca</span></div>' +
            '</div>' +
          '</div>' +
          // Empty state (default)
          '<div class="agr-empty" id="pje-agr-empty">' +
            '<div class="agr-empty-icon">' +
              '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>' +
                '<path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>' +
                '<path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>' +
              '</svg>' +
            '</div>' +
            '<div class="agr-empty-title">Nenhum processo analisado</div>' +
            '<div class="agr-empty-desc">Cole uma lista de números de processo acima e clique em <strong>Analisar Processos</strong> para agrupar automaticamente por similaridade, fila ou outros critérios.</div>' +
          '</div>' +
          // Results (hidden initially)
          '<div class="agr-results" id="pje-agr-results" style="display:none">' +
            '<div class="agr-results-header">' +
              '<span id="pje-agr-results-title">Resultados</span>' +
              '<div style="display:flex;gap:8px">' +
                '<button class="pje-btn-agr pje-btn-agr-ghost" id="pje-agr-btn-sort" style="padding:6px 12px;font-size:11px" title="Ordenar">' +
                  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M6 12h12M9 18h6"/></svg>' +
                  'Ordenar' +
                '</button>' +
                '<select id="pje-agr-fila-select" style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;font-family:inherit;color:#475569;background:#fff;cursor:pointer;max-width:200px;outline:none">' +
                  '<option value="todas">Todas as filas</option>' +
                '</select>' +
                '<select id="pje-agr-etiqueta-select" style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;font-family:inherit;color:#475569;background:#fff;cursor:pointer;max-width:200px;outline:none">' +
                  '<option value="todas">Todas etiquetas</option>' +
                '</select>' +
                '<button class="pje-btn-agr pje-btn-agr-ghost" id="pje-agr-btn-export" style="padding:6px 12px;font-size:11px">' +
                  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                  'Exportar CSV' +
                '</button>' +
              '</div>' +
            '</div>' +
            '<div style="overflow-x:auto" id="pje-agr-table-wrap">' +
              '<table class="agr-table" style="width:100%">' +
                '<thead><tr><th style="width:40px">#</th><th>Número do Processo</th><th style="width:100px">Data Chegada</th><th style="width:100px">Últ. Movim.</th><th style="width:160px">Fila</th><th style="width:180px">Etiquetas</th><th style="width:80px">Status</th><th style="width:150px">Ações</th></tr></thead>' +
                '<tbody id="pje-agr-table-body">' +
                  '<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8">Nenhum resultado ainda. Selecione filas e clique em <strong>Analisar Processos</strong>.</td></tr>' +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
        // ── Footer ──
        '<div id="pje-agrupador-footer">' +
          '<span>🖱️ Dica: você pode colar do Excel ou exportar CSV</span>' +
          '<span style="color:#94a3b8">v' + (window.PJE_CONFIG && window.PJE_CONFIG.version || '4.3') + '</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // ── Bind events ──
    overlay.querySelector('#pje-agrupador-close').addEventListener('click', fecharAgrupadorModal);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) fecharAgrupadorModal();
    });

    function escHandler(e) {
      if (e.key === 'Escape') {
        fecharAgrupadorModal();
        document.removeEventListener('keydown', escHandler);
      }
    }
    document.addEventListener('keydown', escHandler);

    var funcSelect = overlay.querySelector('#pje-agr-func-select');
    var tagsWrap = overlay.querySelector('#pje-agr-tags-wrap');
    var tagInput = overlay.querySelector('#pje-agr-tag-input');
    var tagsList = overlay.querySelector('#pje-agr-tags-list');

    // Tags de busca (múltiplas palavras-chave) — persiste entre aberturas do modal
    if (!window._agrTags) window._agrTags = [];
    var agrTags = window._agrTags;

    function renderAgrTags() {
      if (!tagsList) return;
      tagsList.innerHTML = '';
      agrTags.forEach(function(tag, i) {
        var el = document.createElement('span');
        el.className = 'agr-tag';
        var lbl = document.createElement('span');
        lbl.textContent = tag;
        el.appendChild(lbl);
        var x = document.createElement('button');
        x.type = 'button'; x.className = 'agr-tag-x'; x.title = 'Remover'; x.textContent = '×';
        x.addEventListener('click', function() { agrTags.splice(i, 1); window._agrTags = agrTags; renderAgrTags(); });
        el.appendChild(x);
        tagsList.appendChild(el);
      });
    }

    if (funcSelect && tagsWrap) {
      funcSelect.addEventListener('change', function() {
        tagsWrap.style.display = funcSelect.value === 'custom' ? 'flex' : 'none';
        if (funcSelect.value === 'custom' && tagInput) tagInput.focus();
      });
    }

    if (tagInput) {
      tagInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          var val = tagInput.value.trim().toUpperCase();
          tagInput.value = '';
          if (val.length < 2) { mostrarToastAgr('⚠️ Mínimo de <strong>2 caracteres</strong> por palavra.', 'warning'); return; }
          if (agrTags.indexOf(val) !== -1) return; // duplicata: ignora silenciosamente
          agrTags.push(val);
          window._agrTags = agrTags;
          renderAgrTags();
        } else if (e.key === 'Backspace' && tagInput.value === '' && agrTags.length > 0) {
          agrTags.pop();
          window._agrTags = agrTags;
          renderAgrTags();
        }
      });
    }
    renderAgrTags();

    var modeBtns = overlay.querySelectorAll('.agr-mode-btn');
    var filasSection = overlay.querySelector('#pje-agr-filas-section');
    var textarea = overlay.querySelector('#pje-agrupador-textarea');
    modeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        modeBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var mode = btn.getAttribute('data-mode');
        if (mode === 'auto') {
          filasSection.style.display = 'flex';
          textarea.style.display = 'none';
        } else {
          filasSection.style.display = 'none';
          textarea.style.display = 'block';
          textarea.placeholder = 'Cole os números dos processos aqui...\nUm por linha ou separados por vírgula/ponto-e-vírgula\n\nExemplo:\n0000001-12.2024.8.06.0001\n0000002-34.2024.8.06.0001';
        }
      });
    });

    var agrFilasSelecionadas = window._agrFilasSelecionadas || null;
    
    function popularAgrFilaSelector() {
      var container = overlay.querySelector('#pje-agr-fila-selector');
      if (!container) return;
      var html = '';
      var marcarTodas = !agrFilasSelecionadas || agrFilasSelecionadas.length === 0;
      FILAS.forEach(function(f, i) {
        var checked = marcarTodas || (agrFilasSelecionadas && agrFilasSelecionadas.indexOf(i) !== -1);
        html += '<span class="agr-fila-check' + (checked ? ' checked' : '') + '" data-index="' + i + '">' +
                '<input type="checkbox" ' + (checked ? 'checked' : '') + '>' +
                '<span class="check-icon">✓</span>' +
                f.substring(0, 60) + '</span>';
      });
      container.innerHTML = html;
      container.querySelectorAll('.agr-fila-check').forEach(function(el) {
        el.addEventListener('click', function() {
          this.classList.toggle('checked');
          this.querySelector('input').checked = this.classList.contains('checked');
          salvarAgrFilasSelecionadas();
        });
      });
      atualizarAgrFilasCount();
    }

    function salvarAgrFilasSelecionadas() {
      var checks = overlay.querySelectorAll('#pje-agr-fila-selector .agr-fila-check');
      var sel = [];
      checks.forEach(function(el) {
        if (el.classList.contains('checked')) sel.push(parseInt(el.getAttribute('data-index')));
      });
      agrFilasSelecionadas = sel.length > 0 && sel.length < FILAS.length ? sel : null;
      window._agrFilasSelecionadas = agrFilasSelecionadas;
      atualizarAgrFilasCount();
    }

    function atualizarAgrFilasCount() {
      var countEl = overlay.querySelector('#pje-agr-filas-count');
      if (!countEl) return;
      var count = agrFilasSelecionadas ? agrFilasSelecionadas.length : FILAS.length;
      countEl.textContent = count;
      var trigger = overlay.querySelector('#pje-agr-filas-trigger');
      if (trigger) {
        var label = trigger.querySelector('.count');
        if (label) label.textContent = count;
      }
    }

    function obterAgrFilasSelecionadas() {
      if (!agrFilasSelecionadas || agrFilasSelecionadas.length === 0) return FILAS.slice();
      return agrFilasSelecionadas.map(function(i) { return FILAS[i]; }).filter(Boolean);
    }

    var agrFilaTrigger = overlay.querySelector('#pje-agr-filas-trigger');
    var agrFilaDropdown = overlay.querySelector('#pje-agr-filas-dropdown');
    if (agrFilaTrigger && agrFilaDropdown) {
      agrFilaTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        agrFilaDropdown.classList.toggle('open');
      });
      document.addEventListener('click', function(e) {
        if (!agrFilaDropdown.contains(e.target) && e.target !== agrFilaTrigger) {
          agrFilaDropdown.classList.remove('open');
        }
      });
    }

    var agrSelectAll = overlay.querySelector('#pje-agr-select-all');
    if (agrSelectAll) {
      agrSelectAll.addEventListener('click', function() {
        var checks = overlay.querySelectorAll('#pje-agr-fila-selector .agr-fila-check');
        var todasMarcadas = Array.from(checks).every(function(el) { return el.classList.contains('checked'); });
        checks.forEach(function(el) {
          if (todasMarcadas) {
            el.classList.remove('checked');
            el.querySelector('input').checked = false;
          } else {
            el.classList.add('checked');
            el.querySelector('input').checked = true;
          }
        });
        salvarAgrFilasSelecionadas();
      });
    }

    popularAgrFilaSelector();

    overlay.querySelector('#pje-agr-btn-limpar').addEventListener('click', function() {
      var ta = overlay.querySelector('#pje-agrupador-textarea');
      if (ta) ta.value = '';
      agrFilasSelecionadas = null;
      window._agrFilasSelecionadas = null;
      popularAgrFilaSelector();
      _agrLimparRuntime();   // cancela scan em andamento, zera runtime e sessionStorage
      // Reconecta a UI ao runtime recém-zerado (mostra estado vazio)
      var rt = _agrRuntime();
      rt.uiOverlay = overlay;
      rt.funcLabel = '';
      rt._lastRenderedCount = -1;
      _agrRenderUI(rt);
    });

    overlay.querySelector('#pje-agr-btn-analisar').addEventListener('click', async function() {
      var rt = _agrRuntime();
      if (rt.scanning) { mostrarToastAgr('⚠️ Já há uma análise em andamento. Cancele primeiro.', 'warning'); return; }

      var activeMode = overlay.querySelector('.agr-mode-btn.active');
      var mode = activeMode ? activeMode.getAttribute('data-mode') : 'auto';
      var ta = overlay.querySelector('#pje-agrupador-textarea');
      var texto = (ta.value || '').trim();

      // Palavras-chave resolvidas ANTES do scan: preset (CEJUSC) ou tags personalizadas.
      // Múltiplas tags = busca AND (o processo precisa conter TODAS, em qualquer ponto).
      var funcSelectKw = overlay.querySelector('#pje-agr-func-select');
      var isCustomKw = funcSelectKw && funcSelectKw.value === 'custom';
      var keywords = isCustomKw ? (window._agrTags || []).slice()
                                 : [funcSelectKw ? funcSelectKw.value : 'cejusc'];
      keywords = keywords.map(function(k){ return (k||'').toUpperCase().trim(); })
                         .filter(function(k){ return k.length >= 2; });

      if (keywords.length === 0) {
        mostrarToastAgr('⚠️ Adicione pelo menos uma palavra-chave (digite e pressione <strong>Enter</strong>).', 'warning');
        var ti = overlay.querySelector('#pje-agr-tag-input'); if (ti) ti.focus();
        return;
      }
      var funcLabel = keywords.map(function(k){ return '"' + k + '"'; }).join(' + ');
      var kwStr = keywords.join(' + ');

      // Reseta filtros e modo de visualização para o novo scan
      _agrShowingMultiFila = false;
      _agrEtiquetaFilter = 'todas';
      _agrFilaFilter = 'todas';

      // Inicializa o runtime — a partir daqui ele é a fonte de verdade do scan
      rt.scanning = true; rt.cancelled = false; rt.finishedAt = 0;
      rt.mode = mode; rt.keywords = keywords; rt.keyword = kwStr; rt.funcLabel = funcLabel;
      rt.etapa = 'Preparando'; rt.total = 0; rt.done = 0; rt.matches = 0;
      rt.processos = []; rt.processosErro = []; rt.multiFila = 0;
      rt.mfToken = (rt.mfToken || 0) + 1;   // cancela loop de multi-fila de uma análise anterior
      rt.cancelFlag = { cancel: false }; rt._lastRenderedCount = -1;
      var cancelFlag = rt.cancelFlag;
      _agrSalvarEstado(rt);
      _agrRenderUI(rt);

      var processos = [];
      _agrProcessosCache = {};

      try {
        if (mode === 'auto') {
          var filasAlvo = obterAgrFilasSelecionadas();
          if (filasAlvo.length === 0) {
            rt.scanning = false; _agrSalvarEstado(rt); _agrRenderUI(rt);
            mostrarToastAgr('⚠️ Selecione pelo menos <strong>uma fila</strong> para analisar.', 'warning');
            return;
          }

          // ── Etapa 1: recupera processos das filas (concorrência 4) ──
          var procMap = {};
          rt.etapa = 'Etapa 1/2: verificando filas'; _agrRenderUI(rt);
          await parallelLimit(filasAlvo, async function(fila) {
            try {
              var url = API + '/recuperarProcessosTarefaPendenteComCriterios/' + encodeURIComponent(fila) + '/false';
              var r = await fetch(url, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({numeroProcesso:'',classe:null,tags:[],page:0,maxResults:500,competencia:''}) });
              if (!r.ok) return;
              var data = await r.json();
              (data.entities||[]).forEach(function(ent) {
                if (!ent.numeroProcesso || !ent.idProcesso) return;
                var etiquetas = (ent.tagsProcessoList || []).map(function(t) { return t.nomeTagCompleto; }).filter(Boolean);
                if (!procMap[ent.numeroProcesso]) {
                  procMap[ent.numeroProcesso] = { numero: ent.numeroProcesso, idProcesso: ent.idProcesso, idTaskInstance: ent.idTaskInstance || '', fila: fila, filas: [fila], filasNomes: [ent.nomeTarefa || fila], dataChegada: ent.dataChegada || null, ultimoMovimento: ent.ultimoMovimento || null, etiquetas: etiquetas };
                } else {
                  procMap[ent.numeroProcesso].filas.push(fila);
                  procMap[ent.numeroProcesso].filasNomes.push(ent.nomeTarefa || fila);
                }
              });
            } catch(e) { console.error('[Agrupador] Erro fila ' + fila.substring(0,30) + ': ' + e.message); }
          }, 4, cancelFlag);

          rt.processosMultiFila = [];
          for (var num in procMap) {
            var p = procMap[num];
            if (p.filas.length === 1) processos.push(p);
            else { rt.multiFila++; rt.processosMultiFila.push(p); }
          }
          console.log('[Agrupador] Etapa 1: ' + processos.length + ' OK, ' + rt.multiFila + ' multi-fila pulados');

          if (cancelFlag.cancel) { rt.scanning = false; rt.processos = []; _agrSalvarEstado(rt); _agrRenderUI(rt); mostrarToastAgr('🚫 Análise cancelada.', 'warning'); return; }

          // ── Etapa 2: scan das páginas em busca da keyword (concorrência 10) ──
          var comTask = processos.filter(function(p){ return !!p.idTaskInstance; });
          rt.etapa = 'Etapa 2/2: escaneando'; rt.total = comTask.length; rt.done = 0; rt.matches = 0;
          _agrSalvarEstado(rt); _agrRenderUI(rt);

          if (comTask.length > 0) {
            await parallelLimit(comTask, async function(proc) {
              try {
                // 🔎 Busca o HTML da ÚLTIMA DECISÃO via autos (iframe frameHtml).
                // Fallback p/ movimentar caso os autos não exponham o iframe da decisão.
                var dec = (typeof ProcessosAPI !== 'undefined' && ProcessosAPI.fetchUltimaDecisao)
                  ? await ProcessosAPI.fetchUltimaDecisao(proc.idProcesso, proc.idTaskInstance, cancelFlag)
                  : null;
                var htmlAlvo;
                if (dec && dec.ok && dec.html) {
                  htmlAlvo = dec.html;
                  proc._linkDecisao = dec.link || '';
                } else {
                  console.warn('[Agrupador] Autos sem decisão (' + (dec && dec.motivo) + ') p/ ' + proc.numero + ' — usando página de movimentar');
                  htmlAlvo = await fetchPaginaHTMLviaFetch(getMovimentarUrlFetch(proc.idProcesso, proc.idTaskInstance), cancelFlag);
                }
                var result = DecisaoScrap.buscarKeyword(htmlAlvo, keywords);
                proc._match = result.found;
                proc._matchInfo = result.contextos;
                if (result.found) {
                  rt.matches++;
                  rt.processos.push(proc);
                  var ctxStr = result.contextos.map(function(c){ return c.kw + ': "' + c.contexto + '"'; }).join(' | ');
                  console.log('[Agrupador] ✅ [' + kwStr + '] ENCONTRADO em ' + proc.numero + ' — ' + ctxStr);
                  _agrSalvarEstado(rt);   // persiste match parcial (sobrevive a fechar/reload)
                } else {
                  console.log('[Agrupador] ❌ [' + kwStr + '] NÃO encontrado em ' + proc.numero + ' (requer todas as palavras)');
                }
              } catch(e) {
                proc._match = false;
                rt.processosErro.push({ numero: proc.numero, idProcesso: proc.idProcesso, erro: e.message });
                console.error('%c[Agrupador] ⛔ ERRO ao buscar ' + proc.numero + ': ' + e.message, 'color:#dc2626;font-weight:bold');
              }
              rt.done++;
              _agrRenderUI(rt);   // sincroniza a contagem na UI a cada página
              // Pausa de 500ms entre cada busca para não saturar o servidor
              if (!cancelFlag.cancel) await new Promise(function(r) { setTimeout(r, 500); });
            }, 1, cancelFlag);
          }
          console.log('[Agrupador] Etapa 2 concluída:', rt.done, 'páginas |', rt.matches, 'matches');
        } else {
          // ══ MODO MANUAL: /tarefas → multi-fila? → recuperarProcessos ══
          if (!texto) {
            rt.scanning = false; _agrRenderUI(rt);
            mostrarToastAgr('⚠️ Digite ou cole números de processo para analisar.', 'warning');
            ta.focus();
            return;
          }
          var numeros = texto.split(/[\n,;]+/).filter(function(l){return l.trim().length>0}).map(function(l){return l.trim()});

          rt.etapa = 'Consultando /tarefas'; rt.total = numeros.length; rt.done = 0; rt.matches = 0;
          rt.processosMultiFila = [];
          _agrSalvarEstado(rt); _agrRenderUI(rt);

          for (var mi = 0; mi < numeros.length; mi++) {
            if (cancelFlag.cancel) break;
            var num = numeros[mi];

            try {
              // Passo 1: /tarefas → verifica em quantas filas está
              var tR = await fetch(API + '/tarefas', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numeroProcesso: num, competencia: '', etiquetas: [] })
              });
              if (!tR.ok) { console.warn('[Agrupador] /tarefas HTTP ' + tR.status + ' para ' + num); continue; }
              var tarefas = await tR.json();
              if (!Array.isArray(tarefas) || tarefas.length === 0) { console.warn('[Agrupador] /tarefas vazio para ' + num); continue; }

              var filasEncontradas = tarefas.map(function(t){ return t.nome; });
              console.log('[Agrupador] ' + num + ': ' + filasEncontradas.length + ' fila(s) → ' + filasEncontradas.join(', '));

              // Multi-fila → apenas marca, não busca keyword
              if (filasEncontradas.length >= 2) {
                rt.multiFila++;
                rt.processosMultiFila.push({ numero: num, filas: filasEncontradas, filasNomes: filasEncontradas, fila: filasEncontradas[0], idProcesso: '', idTaskInstance: '' });
                console.log('[Agrupador] ⚠️ Multi-fila: ' + num + ' (' + filasEncontradas.length + ' filas) — ignorado (não busca keyword)');
                continue;
              }

              // Passo 2: recuperarProcessosTarefaPendenteComCriterios com a PRIMEIRA fila
              var filaNome = filasEncontradas[0];
              var pR = await fetch(API + '/recuperarProcessosTarefaPendenteComCriterios/' + encodeURIComponent(filaNome) + '/false', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numeroProcesso: num, classe: null, tags: [], page: 0, maxResults: 1, competencia: '' })
              });
              if (!pR.ok) { console.warn('[Agrupador] recuperarProcessos HTTP ' + pR.status + ' para ' + num + ' fila=' + filaNome); continue; }
              var pData = await pR.json();
              var ent = (pData.entities || [])[0];
              if (!ent || !ent.idProcesso) { console.warn('[Agrupador] Processo ' + num + ' não encontrado na fila ' + filaNome); continue; }

              var etiquetas = (ent.tagsProcessoList || []).map(function(t){ return t.nomeTagCompleto; }).filter(Boolean);
              processos.push({
                numero: ent.numeroProcesso || num,
                idProcesso: ent.idProcesso,
                idTaskInstance: ent.idTaskInstance || '',
                fila: filaNome, filas: [filaNome], filasNomes: [ent.nomeTarefa || filaNome],
                dataChegada: ent.dataChegada || null,
                ultimoMovimento: ent.ultimoMovimento || null,
                etiquetas: etiquetas
              });
              console.log('[Agrupador] ✓ ' + num + ': fila=' + filaNome.substring(0,40) + ' | etiquetas=' + (etiquetas.join(',') || 'nenhuma'));
              rt.done++;
              _agrRenderUI(rt);

            } catch(e) { console.error('[Agrupador] Erro manual ' + num + ': ' + e.message); }

            // Pausa entre processos
            if (mi < numeros.length - 1 && !cancelFlag.cancel) await new Promise(function(r){ setTimeout(r, 500); });
          }

          // ── Etapa 2: scan das páginas (concorrência 10) ──
          if (processos.length > 0) {
            var comTaskM = processos.filter(function(p){ return !!p.idTaskInstance; });
            rt.etapa = 'Escaneando páginas'; rt.total = comTaskM.length; rt.done = 0; rt.matches = 0;
            _agrSalvarEstado(rt); _agrRenderUI(rt);

            if (comTaskM.length > 0) {
              await parallelLimit(comTaskM, async function(procM) {
                try {
                  // 🔎 Busca o HTML da ÚLTIMA DECISÃO via autos (iframe frameHtml).
                  var decM = (typeof ProcessosAPI !== 'undefined' && ProcessosAPI.fetchUltimaDecisao)
                    ? await ProcessosAPI.fetchUltimaDecisao(procM.idProcesso, procM.idTaskInstance, cancelFlag)
                    : null;
                  var htmlAlvoM;
                  if (decM && decM.ok && decM.html) {
                    htmlAlvoM = decM.html;
                    procM._linkDecisao = decM.link || '';
                  } else {
                    console.warn('[Agrupador] Autos sem decisão (' + (decM && decM.motivo) + ') p/ ' + procM.numero + ' — usando página de movimentar');
                    htmlAlvoM = await fetchPaginaHTMLviaFetch(getMovimentarUrlFetch(procM.idProcesso, procM.idTaskInstance), cancelFlag);
                  }
                  var resultM = DecisaoScrap.buscarKeyword(htmlAlvoM, keywords);
                  procM._match = resultM.found;
                  procM._matchInfo = resultM.contextos;
                  if (resultM.found) {
                    rt.matches++;
                    rt.processos.push(procM);
                    var ctxStrM = resultM.contextos.map(function(c){ return c.kw + ': "' + c.contexto + '"'; }).join(' | ');
                    console.log('[Agrupador] ✅ [' + kwStr + '] ENCONTRADO em ' + procM.numero + ' — ' + ctxStrM);
                    _agrSalvarEstado(rt);
                  }
                } catch(e) {
                  procM._match = false;
                  rt.processosErro.push({ numero: procM.numero, idProcesso: procM.idProcesso, erro: e.message });
                  console.error('%c[Agrupador] ⛔ ERRO ao buscar ' + procM.numero + ': ' + e.message, 'color:#dc2626;font-weight:bold');
                }
                rt.done++;
                _agrRenderUI(rt);
                // Pausa de 500ms entre cada busca para não saturar o servidor
                if (!cancelFlag.cancel) await new Promise(function(r) { setTimeout(r, 500); });
              }, 1, cancelFlag);
            }
          }
        }
      } catch(e) {
        console.error('[Agrupador] Erro na análise:', e);
      }

      // ── Finaliza o scan no runtime (UI conectada ou não) ──
      rt.scanning = false; rt.cancelled = false; rt.finishedAt = Date.now();
      _agrSalvarEstado(rt);
      _agrRenderUI(rt);

      var totalMatch = rt.processos.length;
      var totalErros = (rt.processosErro || []).length;
      var msg;
      if (cancelFlag.cancel) {
        msg = totalMatch > 0
          ? '🚫 Cancelada — <strong>' + totalMatch + '</strong> com ' + funcLabel + ' encontrados até então.'
          : '🚫 Análise cancelada.';
      } else if (totalMatch > 0) {
        msg = mode === 'auto'
          ? '🔍 <strong>' + totalMatch + '</strong> com ' + funcLabel + ' — ' + rt.multiFila + ' multi-fila pulados'
          : '📋 <strong>' + totalMatch + '</strong> com ' + funcLabel;
      } else {
        msg = '📭 Nenhum processo com <strong>' + funcLabel + '</strong> encontrado nas páginas.';
      }
      if (totalErros > 0) {
        msg += '<br>⚠️ <strong>' + totalErros + '</strong> processo(s) com ERRO na busca — passe o mouse sobre o card "Erros na Busca" para ver quais.';
        console.log('%c[Agrupador] ⚠️ ' + totalErros + ' processo(s) com erro:', 'color:#dc2626;font-weight:bold');
        (rt.processosErro || []).forEach(function(e, i) {
          console.log('%c  ' + (i+1) + '. ' + e.numero + ' — ' + e.erro, 'color:#dc2626');
        });
      }
      mostrarToastAgr(msg, totalMatch > 0 && !cancelFlag.cancel ? 'success' : (cancelFlag.cancel ? 'warning' : 'info'));
    });

    var btnSort = overlay.querySelector('#pje-agr-btn-sort');
    if (btnSort) {
      var sortStates = [
        { value: 'dataChegada-desc',   label: 'Chegada: Mais recente', icon: 'M3 6h18M6 12h12M9 18h6' },
        { value: 'dataChegada-asc',    label: 'Chegada: Mais antigo',  icon: 'M3 18h18M6 12h12M9 6h6' },
        { value: 'ultimoMovimento-desc', label: 'Movim.: Mais recente', icon: 'M3 6h18M6 12h12M9 18h6' },
        { value: 'ultimoMovimento-asc',  label: 'Movim.: Mais antigo',  icon: 'M3 18h18M6 12h12M9 6h6' }
      ];
      function atualizarBtnSort() {
        var state = sortStates.find(function(s) { return s.value === _agrSort; }) || sortStates[0];
        btnSort.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + state.icon + '"/></svg>' + state.label;
      }
      atualizarBtnSort();
      btnSort.addEventListener('click', function() {
        var idx = sortStates.findIndex(function(s) { return s.value === _agrSort; });
        _agrSort = sortStates[(idx + 1) % sortStates.length].value;
        atualizarBtnSort();
        _agrPage = 0;
        var data = overlay._agrProcessosData || [];
        if (data.length) renderizarTabelaAgrupador(overlay, data, '', false);
      });
    }

    var filaSelect = overlay.querySelector('#pje-agr-fila-select');
    if (filaSelect) {
      filaSelect.addEventListener('change', function() {
        _agrFilaFilter = this.value;
        _agrPage = 0;
        var data = overlay._agrProcessosData || [];
        var label = _agrShowingMultiFila ? 'Multi-Fila' : '';
        if (data.length) renderizarTabelaAgrupador(overlay, data, label, false);
      });
    }

    var etiqSelect = overlay.querySelector('#pje-agr-etiqueta-select');
    if (etiqSelect) {
      etiqSelect.addEventListener('change', function() {
        _agrEtiquetaFilter = this.value;
        _agrPage = 0;
        var data = overlay._agrProcessosData || [];
        var label = _agrShowingMultiFila ? 'Multi-Fila' : '';
        if (data.length) renderizarTabelaAgrupador(overlay, data, label, false);
      });
    }

    var btnExport = overlay.querySelector('#pje-agr-btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', function() {
        var data = overlay._agrProcessosData || [];
        if (!data.length) {
          mostrarToastAgr('⚠️ Nenhum dado para exportar.', 'warning');
          return;
        }
        // Aplica os mesmos filtros da tabela (fila + ordenação)
        var filtrados = _agrFilaFilter === 'todas'
          ? data
          : data.filter(function(p) { return p.fila === _agrFilaFilter; });
        var sortField = _agrSort.split('-')[0];
        var sortDir = _agrSort.split('-')[1];
        filtrados.sort(function(a, b) {
          var va = a[sortField] || 0, vb = b[sortField] || 0;
          return sortDir === 'desc' ? vb - va : va - vb;
        });
        if (!filtrados.length) {
          mostrarToastAgr('⚠️ Nenhum processo nesta fila.', 'warning');
          return;
        }
        var rtCsv = _agrRuntime();
        var matchLabel = rtCsv.keyword || '';
        var filaInfo = _agrFilaFilter !== 'todas' ? ' · Filtro: ' + _agrFilaFilter.substring(0, 60) : '';
        var csv = 'Número;Data Chegada;Última Movimentação;idProcesso;idTaskInstance;Fila;Etiquetas;Match\n';
        filtrados.forEach(function(p) {
          var fmtCsvData = function(ts) { if (!ts) return ''; return new Date(ts).toLocaleDateString('pt-BR'); };
          var etiquetasTxt = (p.etiquetas || []).join(', ');
          csv += (p.numero||'') + ';' + fmtCsvData(p.dataChegada) + ';' + fmtCsvData(p.ultimoMovimento) + ';' + (p.idProcesso||'') + ';' + (p.idTaskInstance||'') + ';' + (p.fila||'') + ';"' + etiquetasTxt.replace(/"/g,'""') + '";' + matchLabel + '\n';
        });
        var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = 'pje-agrupador-' + new Date().toISOString().slice(0,10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        mostrarToastAgr('📥 CSV exportado com ' + filtrados.length + ' processo(s)!' + filaInfo, 'success');
      });
    }

    // Reconecta a UI ao runtime: se há scan em andamento, mostra o progresso real
    // (e o botão Cancelar volta a funcionar); se há resultado finalizado, mostra;
    // senão, tenta sessionStorage (pós-reload) e por fim empty state.
    var rt = _agrRuntime();
    var wasScanning = rt.scanning;
    _agrConectarUI(overlay);
    if (wasScanning) {
      mostrarToastAgr('⚠️ Scan em andamento em background: ' + rt.done + '/' + rt.total + ' (' + rt.matches + ' match).', 'warning');
    } else if (rt.processos.length > 0) {
      console.log('[PJe Agrupador] Estado restaurado: ' + rt.processos.length + ' processos');
    }

    console.log('[PJe Agrupador] Modal aberto com sucesso!');
  } catch(e) {
    console.error('[PJe Agrupador] Erro ao abrir modal:', e);
  }
}