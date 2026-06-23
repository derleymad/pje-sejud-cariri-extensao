// ═══════════════════════════════════════════════════════════
// PJe Sejud — Popup da extensão (ícone na barra)
// Mostra versão, toggle habilitar/desabilitar, nota de dev e atalho p/ configurações.
// ═══════════════════════════════════════════════════════════════

// Versão a partir do manifest
document.getElementById('ext-version').textContent =
  'v' + (chrome.runtime.getManifest().version || '?');

var toggle = document.getElementById('toggle-enabled');
var statusEl = document.getElementById('enabled-status');

// Carrega estado atual do toggle
chrome.storage.local.get({ pje_enabled: true }, function(data) {
  toggle.checked = !!data.pje_enabled;
  statusEl.textContent = toggle.checked ? 'Ativa no PJe' : 'Desativada';
});

// Salva ao alternar
toggle.addEventListener('change', function() {
  chrome.storage.local.set({ pje_enabled: toggle.checked }, function() {
    statusEl.textContent = toggle.checked ? 'Ativa no PJe' : 'Desativada';
    // Feedback visual breve no botão (efeito)
    statusEl.style.transition = 'color .2s';
    statusEl.style.color = toggle.checked ? '#059669' : '#dc2626';
    setTimeout(function() { statusEl.style.color = ''; }, 1200);
  });
});

// Botão configurações → abre options.html em nova aba
document.getElementById('btn-config').addEventListener('click', function() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL('ui/options.html') });
  }
});
