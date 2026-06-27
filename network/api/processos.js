// ═══════════════════════════════════════════════════════════
// ProcessosAPI — Operações relacionadas a processos
// Depende de: ApiClient (client.js)
// ═══════════════════════════════════════════════════════════

var ProcessosAPI = (function() {

  // GET /gerarChaveAcessoProcesso/{idProcesso} → texto puro
  async function getChaveAcesso(idProcesso) {
    var chave = await ApiClient.getText(
      '/pje1grau/seam/resource/rest/pje-legacy/painelUsuario/gerarChaveAcessoProcesso/' + idProcesso
    );
    return (chave || '').trim();
  }

  // Monta a URL dos autos digitais
  function buildAutosUrl(idProcesso, chave, idTaskInstance) {
    return '/pje1grau/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=' +
      idProcesso + '&ca=' + encodeURIComponent(chave) + '&idTaskInstance=' + (idTaskInstance || '');
  }

  // Busca o HTML dos autos digitais (via background)
  async function fetchAutosHTML(idProcesso, chave, idTaskInstance, cancelFlag) {
    var url = buildAutosUrl(idProcesso, chave, idTaskInstance);
    return await ApiClient.fetchHTML(url, cancelFlag);
  }

  // Busca o HTML da página de movimentação (para keyword match)
  async function fetchMovimentarHTML(idProcesso, idTaskInstance, cancelFlag) {
    var url = '/pje1grau/Processo/movimentar.seam?newTaskId=' + idTaskInstance + '&idProcesso=' + idProcesso;
    return await ApiClient.fetchHTML(url, cancelFlag);
  }

  return {
    getChaveAcesso: getChaveAcesso,
    buildAutosUrl: buildAutosUrl,
    fetchAutosHTML: fetchAutosHTML,
    fetchMovimentarHTML: fetchMovimentarHTML
  };
})();
