// Suprime confirm/alert/prompt do PJe quando extensão estiver em modo tarefas.
// Comunicação com content script via atributo DOM (compartilhado entre worlds).
(function() {
  var _oc = window.confirm;
  var _oa = window.alert;
  var _op = window.prompt;

  window.confirm = function(msg) {
    if (document.documentElement.getAttribute('data-pje-suppress') === '1') {
      console.log('[PJE suppress] confirm() bloqueado:', (msg||'').substring(0,80));
      return false;
    }
    return _oc ? _oc.apply(this, arguments) : true;
  };

  window.alert = function(msg) {
    if (document.documentElement.getAttribute('data-pje-suppress') === '1') {
      console.log('[PJE suppress] alert() bloqueado:', (msg||'').substring(0,80));
      return;
    }
    if (_oa) _oa.apply(this, arguments);
  };

  window.prompt = function(msg, def) {
    if (document.documentElement.getAttribute('data-pje-suppress') === '1') {
      return null;
    }
    return _op ? _op.apply(this, arguments) : null;
  };
})();
