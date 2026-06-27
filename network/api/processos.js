// ═══════════════════════════════════════════════════════════
// ProcessosAPI — Operações relacionadas a processos
// Depende de: ApiClient (client.js), fetchPaginaHTMLviaFetch (infra.js),
//             AutosScrap (scrap/autos.js), API_HOST (utils.js)
// ═══════════════════════════════════════════════════════════

var ProcessosAPI = (function() {

  // ── URLs absolutas (host do PJe resolvido por config.js → API_HOST) ──
  // Absolutas porque o content script pode rodar no iframe cnj.cloud; URLs
  // relativas seriam resolvidas contra o host errado.
  function chaveUrl(idProcesso) {
    return API_HOST + '/pje1grau/seam/resource/rest/pje-legacy/painelUsuario/gerarChaveAcessoProcesso/' + idProcesso;
  }
  function autosUrl(idProcesso, chave, idTaskInstance) {
    return API_HOST + '/pje1grau/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=' +
      idProcesso + '&ca=' + encodeURIComponent(chave) + '&idTaskInstance=' + (idTaskInstance || '');
  }
  function absUrl(path) {
    if (!path) return null;
    return path.indexOf('http') === 0 ? path : API_HOST + path;
  }

  // GET texto puro via background (chave de acesso). Cancelamento é propagado.
  async function _getText(url, cancelFlag) {
    try {
      var t = await fetchPaginaHTMLviaFetch(url, cancelFlag);
      return (t || '').trim();
    } catch(e) {
      if (cancelFlag && cancelFlag.cancel) throw e;
      return null;
    }
  }
  // GET HTML via background. Cancelamento é propagado; demais erros → null.
  async function _getHTML(url, cancelFlag) {
    try {
      return await fetchPaginaHTMLviaFetch(url, cancelFlag);
    } catch(e) {
      if (cancelFlag && cancelFlag.cancel) throw e;
      return null;
    }
  }

  // GET /gerarChaveAcessoProcesso/{idProcesso} → texto puro
  async function getChaveAcesso(idProcesso, cancelFlag) {
    var chave = await _getText(chaveUrl(idProcesso), cancelFlag);
    if (!chave || chave.length < 10) return null;
    return chave;
  }

  // Monta a URL absoluta dos autos digitais
  function buildAutosUrl(idProcesso, chave, idTaskInstance) {
    return autosUrl(idProcesso, chave, idTaskInstance);
  }

  // Busca o HTML dos autos digitais (via background)
  async function fetchAutosHTML(idProcesso, chave, idTaskInstance, cancelFlag) {
    return await _getHTML(autosUrl(idProcesso, chave, idTaskInstance), cancelFlag);
  }

  // Busca o HTML da página de movimentação (fallback de keyword match)
  async function fetchMovimentarHTML(idProcesso, idTaskInstance, cancelFlag) {
    return await _getHTML(
      API_HOST + '/pje1grau/Processo/movimentar.seam?newTaskId=' + idTaskInstance + '&idProcesso=' + idProcesso,
      cancelFlag
    );
  }

  // ══ Orquestra: autos → iframe da última decisão → HTML da decisão ══
  // Retorna { ok, html, link, motivo }:
  //   ok=true   → html = documento da última decisão (pronto p/ buscar keyword)
  //   ok=false  → motivo: 'chave_invalida' | 'autos_vazio'
  //                     | 'sem_link_decisao' | 'decisao_vazia'
  async function fetchUltimaDecisao(idProcesso, idTaskInstance, cancelFlag) {
    var chave = await getChaveAcesso(idProcesso, cancelFlag);
    if (!chave) return { ok: false, motivo: 'chave_invalida' };

    var autosHtml = await fetchAutosHTML(idProcesso, chave, idTaskInstance, cancelFlag);
    if (!autosHtml) return { ok: false, motivo: 'autos_vazio' };

    var link = (typeof AutosScrap !== 'undefined' && AutosScrap.extrairLinkUltimaDecisao)
      ? AutosScrap.extrairLinkUltimaDecisao(autosHtml) : null;
    if (!link) return { ok: false, motivo: 'sem_link_decisao', autosHtml: autosHtml };

    var decisaoHtml = await _getHTML(absUrl(link), cancelFlag);
    if (!decisaoHtml) return { ok: false, motivo: 'decisao_vazia', link: absUrl(link) };

    return { ok: true, html: decisaoHtml, link: absUrl(link), autosHtml: autosHtml };
  }

  return {
    getChaveAcesso: getChaveAcesso,
    buildAutosUrl: buildAutosUrl,
    fetchAutosHTML: fetchAutosHTML,
    fetchMovimentarHTML: fetchMovimentarHTML,
    fetchUltimaDecisao: fetchUltimaDecisao
  };
})();
