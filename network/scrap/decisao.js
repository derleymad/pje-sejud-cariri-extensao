// ═══════════════════════════════════════════════════════════
// DecisaoScrap — Extrai texto visível e busca palavras-chave
// Depende de: nada (puro parser)
// ═══════════════════════════════════════════════════════════

var DecisaoScrap = (function() {

  // Extrai apenas o TEXTO do documento (ignora scripts, selects, boilerplate)
  function extrairTextoVisivel(html) {
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, noscript, head, link, meta, title, select, option, button, .post-it')
        .forEach(function(el) { el.remove(); });
      var folhas = doc.querySelectorAll('#paginaInteira, .folha');
      if (folhas.length > 0) {
        var texto = '';
        folhas.forEach(function(f) { texto += (f.textContent || '') + ' '; });
        return texto;
      }
      var container = doc.querySelector('#areaPagina') || doc.querySelector('.impresso') || doc.body;
      return (container && container.textContent) || '';
    } catch(e) {
      return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    }
  }

  // Busca EXATA com word boundary — exige que TODAS as keywords estejam presentes (AND)
  // Retorna: { found: bool, contextos: [{ kw, contexto }] }
  function buscarKeyword(html, keywords) {
    var texto = extrairTextoVisivel(html);
    var contextos = [];
    for (var i = 0; i < keywords.length; i++) {
      var kw = keywords[i];
      var kwEscaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var m = new RegExp('\\b' + kwEscaped + '\\b', 'i').exec(texto);
      if (!m) return { found: false, contextos: contextos };
      var ctx = texto.substring(Math.max(0, m.index - 45), m.index + m[0].length + 45).replace(/\s+/g, ' ').trim();
      contextos.push({ kw: kw, contexto: ctx });
    }
    return { found: true, contextos: contextos };
  }

  return { extrairTextoVisivel: extrairTextoVisivel, buscarKeyword: buscarKeyword };
})();
