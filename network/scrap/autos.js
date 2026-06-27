// ═══════════════════════════════════════════════════════════
// AutosScrap — Extrai dados do HTML dos autos digitais
// Depende de: nada (puro parser de HTML)
// ═══════════════════════════════════════════════════════════

var AutosScrap = (function() {

  // Extrai polo ativo e passivo com advogados do HTML dos autos
  // Retorna: { pessoasAtivo: [...], pessoasPassivo: [...], advogados: [...] }
  function extrairPolos(html) {
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

    var todosAdvs = [];
    function addUnicos(lista) { lista.forEach(function(a) { if (todosAdvs.indexOf(a) === -1) todosAdvs.push(a); }); }
    pessoasAtivo.forEach(function(p) { addUnicos(p.advogados); });
    pessoasPassivo.forEach(function(p) { addUnicos(p.advogados); });

    return { pessoasAtivo: pessoasAtivo, pessoasPassivo: pessoasPassivo, advogados: todosAdvs };
  }

  // Extrai o link (src) da ÚLTIMA DECISÃO exibida nos autos digitais.
  // No PJe a decisão mais recente é carregada num iframe de visualização:
  //   <iframe id="frameHtml" src="/pje1grau/seam/resource/rest/pje-legacy/documento/download/212309112" ...>
  // Retorna o caminho (relativo ou absoluto) do documento, ou null.
  function extrairLinkUltimaDecisao(html) {
    if (!html) return null;
    // 1) iframe de visualização da decisão (frameHtml) — caminho preferido
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var iframe = doc.querySelector('iframe#frameHtml[src*="documento/download"]')
               || doc.querySelector('iframe#frameHtml[src]')
               || doc.querySelector('iframe[src*="documento/download"]');
      if (iframe) {
        var src = (iframe.getAttribute('src') || '').trim();
        if (src) return src;
      }
    } catch(e) {}
    // 2) Fallback: último link documento/download/{id} presente no HTML bruto
    var m = html.match(/\/pje1grau\/[^"'\s<>]*?documento\/download\/\d+/gi);
    if (m && m.length) return m[m.length - 1];
    return null;
  }

  return { extrairPolos: extrairPolos, extrairLinkUltimaDecisao: extrairLinkUltimaDecisao };
})();
