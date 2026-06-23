// ═══════════════════════════════════════════════════════════
// PJe Sejud — Utilitários Compartilhados (Toast, Tempo, Cores, Config)
// Carregado primeiro: define $, $$, API_HOST, API, FILAS, etc.
// ═══════════════════════════════════════════════════════════════

  console.log('[Sejud] SCRIPT CARREGADO em ' + window.location.href.substring(0, 80));

  var $  = s => document.querySelector(s);
  var $$ = s => [...document.querySelectorAll(s)];

  // ── API Host / Endpoints (de config.js ou fallback) ──

  var CFG = window.PJE_CONFIG;
  var API_HOST = CFG ? CFG.getApiHost() : (function() {
    var h = window.location.hostname;
    // Se estiver no iframe Angular (cnj.cloud), usa o host do PJe real
    if (h.includes('cnj.cloud')) return 'https://pje.tjce.jus.br';
    return h.includes('treinamento') ? 'https://pje-treinamento-release.tjce.jus.br'
         : h.includes('homolog')      ? 'https://pje-homologacao.tjce.jus.br'
         : h.includes('front-cp')     ? 'https://pje-treinamento-release.tjce.jus.br'
         : 'https://' + h;
  })();
  var API = API_HOST + (CFG ? CFG.apiBasePath : '/pje1grau/seam/resource/rest/pje-legacy/painelUsuario');

  var TIMEOUT_TASK = (CFG && CFG.timeoutTask) ? CFG.timeoutTask : 120000;

  var FILAS = (CFG && CFG.filas) ? CFG.filas : [
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
  ];


  var log = (...a) => console.log('[Citar/Intimar]', ...a);
  var warn = (...a) => console.warn('[Citar/Intimar]', ...a);
  var err = (...a) => console.error('[Citar/Intimar]', ...a);

  var THEME = window.PJE_THEME || {}; // fallback seguro se theme.js falhar
  var aplicarTema = (THEME.aplicar || function(css) { return css; });
  var substituirCores = (THEME.aplicarCores || function(str) { return str; });

  function tempoRelativo(ts) {
    var diff = Math.max(0, Math.floor((Date.now() - ts) / 1000)); // segundos
    if (diff < 10) return 'agora mesmo';
    if (diff < 60) return 'há ' + diff + ' segundo' + (diff > 1 ? 's' : '');
    var min = Math.floor(diff / 60);
    if (min < 60) return 'há ' + min + ' minuto' + (min > 1 ? 's' : '');
    var hrs = Math.floor(min / 60);
    if (hrs < 24) return 'há ' + hrs + ' hora' + (hrs > 1 ? 's' : '');
    var dias = Math.floor(hrs / 24);
    return 'há ' + dias + ' dia' + (dias > 1 ? 's' : '');
  }

  // ── Helper: formata timestamp completo (relativo + absoluto) ──
  function formatarUltimoScan(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    var rel = tempoRelativo(ts);
    var abs = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) + ' · ' + d.toLocaleDateString('pt-BR');
    return rel + ' (' + abs + ')';
  }


  var DUP_STORAGE_KEY = 'pje-dup-results';

  function mostrarToast(msgHTML, tipo, opts) {
    opts = opts || {};
    tipo = tipo || 'info';
    var container = document.getElementById('pje-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pje-toast-container';
      container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(container);
    }
    // Remove toast anterior com mesmo ID
    if (opts.id) {
      var old = document.getElementById('pje-toast-' + opts.id);
      if (old) { old.style.animation = 'toastSlideOut .2s ease forwards'; setTimeout(function() { if (old.parentNode) old.remove(); }, 250); }
    }
    var toast = document.createElement('div');
    if (opts.id) toast.id = 'pje-toast-' + opts.id;
    var borderColor = tipo === 'success' ? '#10b981' : tipo === 'warning' ? '#f59e0b' : tipo === 'error' ? '#ef4444' : '#0f172a';
    var bgTint = tipo === 'success' ? '#f0fdf4' : tipo === 'warning' ? '#fffbeb' : tipo === 'error' ? '#fef2f2' : '#fff';
    toast.style.cssText = 'background:' + bgTint + ';border-radius:10px;padding:12px 16px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.08);display:flex;align-items:center;gap:10px;font-size:13px;font-weight:500;color:#0f172a;max-width:420px;pointer-events:auto;animation:toastSlideIn .3s ease;border:1px solid #e2e8f0;border-left:3px solid ' + borderColor + ';';
    toast.innerHTML = msgHTML;
    container.appendChild(toast);

    if (!opts.persistente) {
      var removed = false;
      var doRemove = function() {
        if (removed) return; removed = true;
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      };
      toast.addEventListener('animationend', function(e) {
        if (e.animationName === 'toastSlideOut') doRemove();
      });
      setTimeout(function() {
        toast.style.animation = 'toastSlideOut .2s ease forwards';
        setTimeout(doRemove, 250);
      }, opts.duracao || 4000);
    }
    return toast;
  }

  function removerToast(id) {
    var toast = document.getElementById('pje-toast-' + id);
    if (toast) {
      toast.style.animation = 'toastSlideOut .2s ease forwards';
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 250);
    }
  }
