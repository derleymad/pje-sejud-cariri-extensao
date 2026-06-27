// ═══════════════════════════════════════════════════════════
// FilasAPI — Operações relacionadas a filas do PJe
// Depende de: ApiClient (client.js)
// ═══════════════════════════════════════════════════════════

var FilasAPI = (function() {

  // POST /tarefas → descobre em quais filas o processo está
  // Retorna: array de filas [{ id, nome, quantidadePendente }]
  async function checkFilas(numeroProcesso) {
    var data = await ApiClient.post('/tarefas', {
      numeroProcesso: numeroProcesso,
      competencia: '',
      etiquetas: []
    });
    return Array.isArray(data) ? data : [];
  }

  // Verifica se processo está em mais de uma fila
  // Retorna: { multiFila: bool, filas: [...], qtd: number }
  async function isMultiFila(numeroProcesso) {
    var filas = await checkFilas(numeroProcesso);
    var nomes = filas.map(function(f) { return f.nome; }).filter(Boolean);
    return { multiFila: nomes.length >= 2, filas: nomes, qtd: nomes.length };
  }

  // POST /recuperarProcessosTarefaPendenteComCriterios/{fila}/false
  // Retorna: array de processos da fila
  async function getProcessos(fila, page, maxResults) {
    var data = await ApiClient.post(
      '/recuperarProcessosTarefaPendenteComCriterios/' + encodeURIComponent(fila) + '/false',
      { numeroProcesso: '', classe: null, tags: [], page: page || 0, maxResults: maxResults || 500, competencia: '' }
    );
    return (data && data.entities) ? data.entities : [];
  }

  // Busca um processo específico em uma fila
  // Retorna: { idProcesso, idTaskInstance, etiquetas, ... } ou null
  async function getProcessoNaFila(fila, numeroProcesso) {
    var data = await ApiClient.post(
      '/recuperarProcessosTarefaPendenteComCriterios/' + encodeURIComponent(fila) + '/false',
      { numeroProcesso: numeroProcesso, classe: null, tags: [], page: 0, maxResults: 1, competencia: '' }
    );
    var ent = (data && data.entities || [])[0];
    if (!ent) return null;
    return {
      numero: ent.numeroProcesso,
      idProcesso: ent.idProcesso,
      idTaskInstance: ent.idTaskInstance || '',
      fila: fila,
      dataChegada: ent.dataChegada || null,
      ultimoMovimento: ent.ultimoMovimento || null,
      etiquetas: (ent.tagsProcessoList || []).map(function(t) { return t.nomeTagCompleto; }).filter(Boolean),
      poloAtivo: ent.poloAtivo || '',
      poloPassivo: ent.poloPassivo || ''
    };
  }

  return {
    checkFilas: checkFilas,
    isMultiFila: isMultiFila,
    getProcessos: getProcessos,
    getProcessoNaFila: getProcessoNaFila
  };
})();
