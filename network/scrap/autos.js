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

  return { extrairPolos: extrairPolos };
})();
