// ============================================================
// Configuração de hosts e endpoints — PJe Sejud Cariri
// ============================================================
// Altere este arquivo para ajustar URLs de produção,
// treinamento ou homologação sem mexer no código principal.
// ============================================================

var PJE_CONFIG = {

  // ── Mapeamento de hostname → URL base da API ──
  // Chaves EXATAS têm prioridade. Depois tenta match parcial.
  // "default" é o fallback quando nenhuma chave bate.
  hostMap: {
    // Produção
    'pje.tjce.jus.br':           'https://pje.tjce.jus.br',
    'pje-front-cp.tjce.jus.br':  'https://pje.tjce.jus.br',
    // Treinamento
    'pje-treinamento-release.tjce.jus.br': 'https://pje-treinamento-release.tjce.jus.br',
    // Homologação
    'pje-homologacao.tjce.jus.br':        'https://pje-homologacao.tjce.jus.br',
    // Fallbacks parciais (menos específicos)
    'treinamento':  'https://pje-treinamento-release.tjce.jus.br',
    'homolog':      'https://pje-homologacao.tjce.jus.br',
    'front-cp':     'https://pje-treinamento-release.tjce.jus.br',
    'cnj.cloud':    'https://pje.tjce.jus.br',      // iframe Angular (produção)
    'default':      null   // null = usa 'https://' + window.location.hostname
  },

  // ── Caminhos da API REST (prefixo base) ──
  apiBasePath: '/pje1grau/seam/resource/rest/pje-legacy/painelUsuario',

  // ── Endpoints ──
  endpoints: {
    // Consulta processos por fila (citar-intimar.js: infoDoProcesso)
    consultarProcesso: '/recuperarProcessosTarefaPendenteComCriterios/',

    // Verifica fila atual pós-movimentação (auto-citar.js: verificarFilaAtual)
    verificarFila:     '/tarefas'
  },

  // ── URL de abertura de tarefa (navegação) ──
  // {host} {idProcesso} {fila}
  tarefaPath: '/pje1grau/ng2/dev.seam#/painel-usuario-interno/conteudo-tarefa/',

  // ── Hosts para o HTML standalone (citar-intimar.html) ──
  htmlHosts: [
    'https://pje-treinamento-release.tjce.jus.br',
    'https://pje.tjce.jus.br',
    'https://pje-homologacao.tjce.jus.br'
  ],

  // ── Opções fixas ──
  filas: [
    '[Sec] - Outras Diligências - ANALISAR DECISÃO',
    '[Sec] - Outras Diligências - ANALISAR DESPACHO',
    '[Sec] - Outras Diligências - ANALISAR ATO ORDINATÓRIO',
    '[Sec] - Expediente - PREPARAR CITAÇÃO E(OU) INTIMAÇÃO',
    '[Sec] - Expediente - PREPARAR PARA EXPEDIR',
    '[Sec] - Expediente - CERTIFICAR EXPEDIÇÃO DE ALVARÁ ELETRÔNICO',
    '[Gab] - Minutar Despacho ou Decisão - ANALISAR DECISÃO',
    '[Gab] - Protocolo - ANALISAR PETIÇÃO',
    '[Gab] - Outras diligências - ANALISAR DECISÃO',
    '[Cent] - Processar - DAR CUMPRIMENTO',
    '[Cent] - Cumprimento - CERTIDÃO DE DEVOLUÇÃO',
    '[Dist] - Processamento - TRIAR'
  ],

  timeoutTask: 120000  // 2 minutos por tarefa

};

// ═══════════════════════════════════════════════════
// Helpers (usados internamente pelos outros scripts)
// ═══════════════════════════════════════════════════

PJE_CONFIG.getApiHost = function() {
  var hostname = window.location.hostname;
  var map = this.hostMap;
  for (var key in map) {
    if (key === 'default') continue;
    if (hostname.includes(key)) return map[key];
  }
  return map['default'] || ('https://' + hostname);
};

PJE_CONFIG.getApiBase = function() {
  return this.getApiHost() + this.apiBasePath;
};

PJE_CONFIG.getEndpoint = function(nome) {
  return this.getApiBase() + this.endpoints[nome];
};

PJE_CONFIG.getTarefaUrl = function(idProcesso, fila) {
  return this.getApiHost() + this.tarefaPath + idProcesso + '/' + encodeURIComponent(fila);
};

// Log de inicialização
console.log('[PJe Config] hostname=' + window.location.hostname +
            ' → apiHost=' + PJE_CONFIG.getApiHost() +
            ' → apiBase=' + PJE_CONFIG.getApiBase());
