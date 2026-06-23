// ═══════════════════════════════════════════════════════════
// PJe Sejud — Analisador de Polos (Modal)
// Para cada processo: consulta API → chaveAcesso → autos HTML
// Extrai polo ativo, polo passivo, advogados e última decisão.
// Depende de: utils.js, infra.js, fetchPaginaHTMLviaFetch
// ═══════════════════════════════════════════════════════════════

function abrirAnalisadorPolos() {
  if (document.getElementById('pje-polos-overlay')) return;

  injetarEstilosPolos();

  var overlay = document.createElement('div');
  overlay.id = 'pje-polos-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.7);backdrop-filter:blur(4px);z-index:2147483647;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML =
    '<div id="pje-polos-box" style="background:#fff;border-radius:14px;width:96vw;max-width:1300px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35);">' +
      '<div id="pje-polos-header" style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:16px 24px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">' +
        '<h3 style="font-size:17px;font-weight:600;display:flex;align-items:center;gap:10px;margin:0">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
          'Analisador de Polos' +
        '</h3>' +
        '<button id="pje-polos-close" style="background:rgba(255,255,255,.12);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:background .15s" title="Fechar (Esc)">✕</button>' +
      '</div>' +
      '<div id="pje-polos-body" style="flex:1;overflow-y:auto;padding:24px;min-height:300px;background:#f8fafc;display:flex;flex-direction:column;gap:20px">' +
        '<label style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.3px">Processos (um por linha)</label>' +
        '<textarea id="pje-polos-textarea" placeholder="0000000-00.0000.0.00.0000&#10;0000001-00.0000.0.00.0000" style="width:100%;min-height:120px;padding:14px 16px;border:2px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:Consolas,monospace;background:#fff;color:#1e293b;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6"></textarea>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
          '<button class="pje-polos-btn pje-polos-btn-primary" id="pje-polos-btn-analisar">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
            'Analisar Polos' +
          '</button>' +
          '<button class="pje-polos-btn pje-polos-btn-outline" id="pje-polos-btn-cancelar" style="display:none">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' +
            'Cancelar' +
          '</button>' +
          '<span id="pje-polos-progress" style="font-size:13px;color:#64748b;display:none"></span>' +
        '</div>' +
        '<div id="pje-polos-results" style="display:none">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
            '<span id="pje-polos-results-title" style="font-size:13px;font-weight:600;color:#475569"></span>' +
            '<button class="pje-polos-btn pje-polos-btn-ghost" id="pje-polos-btn-csv" style="padding:6px 12px;font-size:11px">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
              'Exportar CSV' +
            '</button>' +
          '</div>' +
          '<div style="overflow-x:auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0">' +
            '<table class="pje-polos-table" style="width:100%;border-collapse:collapse">' +
              '<thead><tr><th style="width:30px">#</th><th style="min-width:170px">Número</th><th style="min-width:280px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Polo Ativo</th><th style="min-width:280px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Polo Passivo</th><th style="min-width:220px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Advogados</th><th style="min-width:200px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px"><path d="M14 14l-4 4-3-3 4-4"/><path d="M21 3l-6 6"/><path d="M3 21l6-6"/></svg>Última Decisão</th></tr></thead>' +
              '<tbody id="pje-polos-tbody"></tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="pje-polos-footer" style="padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#64748b;background:#fff;border-radius:0 0 14px 14px;flex-shrink:0">' +
        '<span>🖱️ Cole os processos e clique em Analisar Polos</span>' +
        '<span style="color:#94a3b8">v' + (window.PJE_CONFIG && window.PJE_CONFIG.version || '4.4') + '</span>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  overlay.querySelector('#pje-polos-close').addEventListener('click', fecharPolos);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) fecharPolos(); });
  function escHandler(e) { if (e.key === 'Escape') { fecharPolos(); document.removeEventListener('keydown', escHandler); } }
  document.addEventListener('keydown', escHandler);

  var txt = overlay.querySelector('#pje-polos-textarea');
  var btnAnalisar = overlay.querySelector('#pje-polos-btn-analisar');
  var btnCancelar = overlay.querySelector('#pje-polos-btn-cancelar');
  var progressEl = overlay.querySelector('#pje-polos-progress');
  var resultsEl = overlay.querySelector('#pje-polos-results');
  var tbody = overlay.querySelector('#pje-polos-tbody');
  var titleEl = overlay.querySelector('#pje-polos-results-title');
  var csvBtn = overlay.querySelector('#pje-polos-btn-csv');

  var _polosCancel = { cancel: false };
  var _polosResults = [];

  // ══ Ícones SVG Lucide-style (sem emojis) ══
  var ICON_USER = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var ICON_BRIEFCASE = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>';

  // ══ Renderiza card de pessoa (estilo shadcn) ══
  function renderPessoaCard(p, corBorda, corBg, corTexto) {
    var advHtml = '';
    if (p.advogados && p.advogados.length) {
      advHtml = '<div style="margin-top:4px">';
      p.advogados.forEach(function(a) {
        advHtml += '<div style="display:flex;align-items:flex-start;gap:4px;padding:1px 0;font-size:10px;color:#64748b">' +
          '<span style="flex-shrink:0;margin-top:2px;color:#94a3b8">' + ICON_BRIEFCASE + '</span>' +
          '<span style="line-height:1.4">' + a + '</span></div>';
      });
      advHtml += '</div>';
    }
    return '<div style="margin-bottom:4px;border-left:2px solid ' + corBorda + ';padding:3px 0 3px 8px;background:' + corBg + ';border-radius:0 4px 4px 0">' +
      '<div style="display:flex;align-items:flex-start;gap:4px">' +
        '<span style="flex-shrink:0;margin-top:1px;color:' + corTexto + '">' + ICON_USER + '</span>' +
        '<span style="font-size:11px;font-weight:600;color:#0f172a;line-height:1.4">' + p.nome + '</span>' +
      '</div>' + advHtml + '</div>';
  }

  function atualizarTabela() {
    var html = '';
    _polosResults.forEach(function(p, i) {
      // Polo Ativo — cards com verde
      var cardsAtivo = '';
      if (p.pessoasAtivo && p.pessoasAtivo.length) {
        p.pessoasAtivo.forEach(function(pa) { cardsAtivo += renderPessoaCard(pa, '#10b981', '#f0fdf4', '#059669'); });
      } else { cardsAtivo = '<span style="font-size:11px;color:#94a3b8">—</span>'; }

      // Polo Passivo — cards com laranja
      var cardsPassivo = '';
      if (p.pessoasPassivo && p.pessoasPassivo.length) {
        p.pessoasPassivo.forEach(function(pp) { cardsPassivo += renderPessoaCard(pp, '#f97316', '#fff7ed', '#ea580c'); });
      } else { cardsPassivo = '<span style="font-size:11px;color:#94a3b8">—</span>'; }

      // Advogados únicos
      var cardsAdvs = '';
      if (p.advogadosLista && p.advogadosLista.length) {
        p.advogadosLista.forEach(function(a) {
          cardsAdvs += '<div style="display:flex;align-items:flex-start;gap:4px;padding:1px 0;font-size:10px;color:#475569;line-height:1.4">' +
            '<span style="flex-shrink:0;margin-top:2px;color:#8b5cf6">' + ICON_BRIEFCASE + '</span>' +
            '<span>' + a + '</span></div>';
        });
      } else { cardsAdvs = '<span style="font-size:11px;color:#94a3b8">—</span>'; }

      html += '<tr>' +
        '<td style="color:#94a3b8;font-size:11px;vertical-align:top;padding-top:10px">' + (i+1) + '</td>' +
        '<td style="font-family:SF Mono,Consolas,monospace;font-size:12px;font-weight:600;color:#0f172a;vertical-align:top;padding-top:10px">' + p.numero + '</td>' +
        '<td style="vertical-align:top;padding:6px 8px">' + cardsAtivo + '</td>' +
        '<td style="vertical-align:top;padding:6px 8px">' + cardsPassivo + '</td>' +
        '<td style="vertical-align:top;padding:6px 8px">' + cardsAdvs + '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8">Nenhum resultado.</td></tr>';
    titleEl.textContent = _polosResults.length + ' processo(s) analisado(s)';
  }

  // ══ PARSER HTML ══
  function extrairPolosDoHTML(html) {
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');

      function extrairPolo(id) {
        var container = doc.getElementById(id);
        if (!container) return [];
        var pessoas = [];
        var tbodyEl = container.querySelector('tbody');
        if (!tbodyEl) return [];
        var rows = tbodyEl.querySelectorAll('tr');
        rows.forEach(function(row) {
          if (row.querySelector('th')) return;
          var spanPrincipal = row.querySelector('td > span:first-child span, td > span:first-child');
          if (!spanPrincipal) return;
          var nomeCompleto = (spanPrincipal.textContent || '').trim();
          var advogados = [];
          var trees = row.querySelectorAll('ul.tree li small');
          trees.forEach(function(small) {
            var txt = (small.textContent || '').trim();
            if (txt && (txt.toUpperCase().indexOf('OAB') !== -1 || txt.toUpperCase().indexOf('ADVOGADO') !== -1)) {
              if (advogados.indexOf(txt) === -1) advogados.push(txt);
            }
          });
          pessoas.push({ nome: nomeCompleto, advogados: advogados });
        });
        return pessoas;
      }

      var pessoasAtivo = extrairPolo('poloAtivo');
      var pessoasPassivo = extrairPolo('poloPassivo');

      // Advogados únicos globais
      var todosAdvs = [];
      function addUnicos(lista) { lista.forEach(function(a) { if (todosAdvs.indexOf(a) === -1) todosAdvs.push(a); }); }
      pessoasAtivo.forEach(function(p) { addUnicos(p.advogados); });
      pessoasPassivo.forEach(function(p) { addUnicos(p.advogados); });

      var ultimaDecisao = extrairUltimaDecisao(doc, html);

      return { pessoasAtivo: pessoasAtivo, pessoasPassivo: pessoasPassivo, advogadosLista: todosAdvs, ultimaDecisao: ultimaDecisao };
    } catch(e) {
      console.error('[Analisador Polos] Erro ao parsear HTML:', e.message);
      return { pessoasAtivo: [], pessoasPassivo: [], advogadosLista: [], ultimaDecisao: null };
    }
  }

  // ══ Chave de acesso (via background worker) ══
  async function getChaveAcesso(idProcesso) {
    var chaveUrl = API_HOST + '/pje1grau/seam/resource/rest/pje-legacy/painelUsuario/gerarChaveAcessoProcesso/' + idProcesso;
    try {
      var chave = await fetchPaginaHTMLviaFetch(chaveUrl, _polosCancel);
      if (!chave) throw new Error('Sem resposta');
      chave = (chave || '').trim();
      if (!chave || chave.length < 10) throw new Error('Chave inválida');
      return chave;
    } catch(e) { console.error('[Polos] Erro chave:', e.message); return null; }
  }

  btnAnalisar.addEventListener('click', async function() {
    var numeros = (txt.value || '').match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g) || [];
    if (!numeros.length) {
      mostrarToastAgr('⚠️ Nenhum número de processo válido encontrado.', 'warning');
      return;
    }

    btnAnalisar.disabled = true;
    btnCancelar.style.display = 'inline-flex';
    progressEl.style.display = 'inline';
    resultsEl.style.display = 'block';
    _polosCancel.cancel = false;
    _polosResults = [];
    atualizarTabela();

    for (var i = 0; i < numeros.length; i++) {
      if (_polosCancel.cancel) break;
      var num = numeros[i];
      progressEl.textContent = '[' + (i+1) + '/' + numeros.length + '] ' + num + '...';

      try {
        var info = await consultarProcessoAgrupador(num);
        if (!info || !info.idProcesso) {
          _polosResults.push({ numero: num, pessoasAtivo: [], pessoasPassivo: [], advogadosLista: [] });
          atualizarTabela();
          continue;
        }

        var chave = await getChaveAcesso(info.idProcesso);
        if (!chave) {
          _polosResults.push({ numero: num, pessoasAtivo: [], pessoasPassivo: [], advogadosLista: [] });
          atualizarTabela();
          continue;
        }

        var autosUrl = API_HOST + '/pje1grau/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=' + info.idProcesso + '&ca=' + encodeURIComponent(chave) + '&idTaskInstance=' + (info.idTaskInstance || '');
        var html = await fetchPaginaHTMLviaFetch(autosUrl, _polosCancel);
        if (!html) {
          _polosResults.push({ numero: num, pessoasAtivo: [], pessoasPassivo: [], advogadosLista: [] });
          atualizarTabela();
          continue;
        }

        var polos = extrairPolosDoHTML(html);
        _polosResults.push({
          numero: num,
          pessoasAtivo: polos.pessoasAtivo || [],
          pessoasPassivo: polos.pessoasPassivo || [],
          advogadosLista: polos.advogadosLista || []
        });
      } catch(e) {
        _polosResults.push({ numero: num, pessoasAtivo: [], pessoasPassivo: [], advogadosLista: [] });
      }

      atualizarTabela();
      if (i < numeros.length - 1 && !_polosCancel.cancel) await new Promise(function(r) { setTimeout(r, 200); });
    }

    btnAnalisar.disabled = false;
    btnCancelar.style.display = 'none';
    progressEl.style.display = 'none';
    _polosCancel.cancel = false;
    mostrarToastAgr('✅ Análise concluída: <strong>' + _polosResults.length + '</strong> processo(s).', 'success');
  });

  btnCancelar.addEventListener('click', function() {
    _polosCancel.cancel = true;
    try { chrome.runtime.sendMessage({ type: 'cancelAllFetch' }, function(){}); } catch(e) {}
    btnAnalisar.disabled = false;
    btnCancelar.style.display = 'none';
    progressEl.textContent = 'Cancelado.';
  });

  csvBtn.addEventListener('click', function() {
    if (!_polosResults.length) { mostrarToastAgr('⚠️ Nenhum dado para exportar.', 'warning'); return; }
    var csv = 'Número;Polo Ativo;Polo Passivo;Advogados\n';
    _polosResults.forEach(function(p) {
      var ativoTxt = (p.pessoasAtivo||[]).map(function(pa) { return pa.nome + (pa.advogados.length ? ' [' + pa.advogados.join('; ') + ']' : ''); }).join(' | ');
      var passivoTxt = (p.pessoasPassivo||[]).map(function(pp) { return pp.nome + (pp.advogados.length ? ' [' + pp.advogados.join('; ') + ']' : ''); }).join(' | ');
      var advsTxt = (p.advogadosLista||[]).join(' | ');
      csv += (p.numero||'') + ';"' + (ativoTxt||'—').replace(/"/g,'""') + '";"' + (passivoTxt||'—').replace(/"/g,'""') + '";"' + (advsTxt||'—').replace(/"/g,'""') + '"\n';
    });
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'pje-polos-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    mostrarToastAgr('📥 CSV exportado com ' + _polosResults.length + ' processo(s)!', 'success');
  });
}

function fecharPolos() {
  var overlay = document.getElementById('pje-polos-overlay');
  if (overlay) overlay.remove();
  document.body.style.overflow = '';
}

function injetarEstilosPolos() {
  if (document.getElementById('pje-polos-style')) return;
  var s = document.createElement('style');
  s.id = 'pje-polos-style';
  s.textContent = `
.pje-polos-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
.pje-polos-btn-primary{border:none;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff}
.pje-polos-btn-primary:hover{background:linear-gradient(135deg,#1e293b,#334155);transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,23,42,.25)}
.pje-polos-btn-outline{border:1.5px solid #fecaca;background:#fef2f2;color:#dc2626}
.pje-polos-btn-outline:hover{background:#fee2e2;border-color:#fca5a5;color:#b91c1c}
.pje-polos-btn-ghost{border:1px solid #e2e8f0;background:#fff;color:#475569}
.pje-polos-btn-ghost:hover{background:#f8fafc;color:#0f172a}
.pje-polos-table th{padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.3px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.pje-polos-table td{padding:6px 10px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}
.pje-polos-table tr:hover td{background:#fafafa}
`;
  document.head.appendChild(s);
}

console.log('[PJe Sejud] Analisador de Polos carregado.');
