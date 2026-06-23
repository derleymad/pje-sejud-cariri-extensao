// ═══════════════════════════════════════════════════════════
// PJe Sejud — Página de Configurações (options.html)
// Filas finais de Citar/Intimar: o processo só conclui se estiver em uma delas.
// ═══════════════════════════════════════════════════════════════

// Filas finais padrão (hardcoded no auto-citar.js — mantidas como default aqui)
var FILAS_DEFAULT = [
  '[Sec] - Prazo - AGUARDAR DECURSO DE PRAZO DE RECURSO',
  '[Sec] - Prazo - AGUARDAR DECURSO DE PRAZO',
  '[Sec] - Expediente - AGUARDAR LEITURA OU EXPIRAÇÃO',
  '[Sec] - Expedientes  - AGUARDAR ENVIO PARA O DJEN'
];
var STORAGE_KEY = 'pje_filas_finais';

document.getElementById('ver').textContent =
  'PJe Sejud Cariri · v' + (chrome.runtime.getManifest().version || '?');

var listEl = document.getElementById('fila-list');
var customEl = document.getElementById('fila-custom');
var toastEl = document.getElementById('toast');

// Renderiza a lista de checkboxes (default + extras que não são default)
function render(filasSelecionadas) {
  var selecionadas = filasSelecionadas.slice();
  // Conjunto de filas conhecidas (default + as selecionadas que não são default)
  var conhecidas = FILAS_DEFAULT.slice();
  selecionadas.forEach(function(f) {
    if (conhecidas.indexOf(f) === -1) conhecidas.push(f);
  });

  listEl.innerHTML = '';
  conhecidas.forEach(function(f) {
    var isDefault = FILAS_DEFAULT.indexOf(f) !== -1;
    var checked = selecionadas.indexOf(f) !== -1;
    var row = document.createElement('label');
    row.className = 'fila-check' + (checked ? ' checked' : '');
    var inp = document.createElement('input');
    inp.type = 'checkbox'; inp.checked = checked; inp.dataset.fila = f;
    inp.addEventListener('change', function() {
      row.classList.toggle('checked', inp.checked);
    });
    var nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = f + (isDefault ? '' : '  (personalizada)');
    row.appendChild(inp); row.appendChild(nome);
    listEl.appendChild(row);
  });

  // Botão remover nas personalizadas: usa um × ao lado (via duplo clique remove)
  // — mantemos simples: custom textarea cuida de adicionar novas.
}

// Carrega do storage
chrome.storage.local.get({ pje_filas_finais: null }, function(data) {
  var filas = (data.pje_filas_finais && data.pje_filas_finais.length)
    ? data.pje_filas_finais : FILAS_DEFAULT.slice();
  // Default → checkboxes; personalizadas (não-default) também como checkboxes
  var defaultSet = {};
  FILAS_DEFAULT.forEach(function(f){ defaultSet[f] = true; });
  var personalizadas = filas.filter(function(f){ return !defaultSet[f]; });
  render(filas);
  customEl.value = personalizadas.join('\n');
});

// Salvar
document.getElementById('btn-salvar').addEventListener('click', function() {
  var selecionadas = [];
  listEl.querySelectorAll('input[type=checkbox]').forEach(function(inp) {
    if (inp.checked) selecionadas.push(inp.dataset.fila);
  });
  customEl.value.split('\n').forEach(function(linha) {
    var t = linha.trim();
    if (t && selecionadas.indexOf(t) === -1) selecionadas.push(t);
  });
  if (selecionadas.length === 0) {
    toastEl.textContent = '⚠️ Selecione ao menos uma fila';
    toastEl.style.color = '#dc2626';
  } else {
    chrome.storage.local.set({ pje_filas_finais: selecionadas }, function() {
      toastEl.textContent = '✓ Salvo! ' + selecionadas.length + ' fila(s)';
      toastEl.style.color = '';
      render(selecionadas);
      // Re-sincroniza o textarea com as personalizadas
      var defaultSet = {};
      FILAS_DEFAULT.forEach(function(f){ defaultSet[f] = true; });
      customEl.value = selecionadas.filter(function(f){ return !defaultSet[f]; }).join('\n');
    });
  }
  toastEl.classList.add('show');
  setTimeout(function() { toastEl.classList.remove('show'); }, 2200);
});

// Restaurar padrão
document.getElementById('btn-restaurar').addEventListener('click', function() {
  render(FILAS_DEFAULT);
  customEl.value = '';
  toastEl.textContent = 'Padrão restaurado — clique em Salvar';
  toastEl.style.color = '#f59e0b';
  toastEl.classList.add('show');
  setTimeout(function() { toastEl.classList.remove('show'); }, 2200);
});

// Voltar (fecha a aba)
document.getElementById('back').addEventListener('click', function(e) {
  e.preventDefault();
  chrome.tabs.getCurrent(function(tab) { if (tab) chrome.tabs.remove(tab.id); });
});
