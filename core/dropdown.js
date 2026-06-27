// ═══════════════════════════════════════════════════════════
// PJe Sejud — Injeção do Menu Dropdown + Observer Global
// Deve ser o ÚLTIMO script no manifest.json
// Depende de: todos os módulos anteriores
// ═══════════════════════════════════════════════════════════════

  // Flag de habilitação (toggle do popup). Cache em memória + listener de mudança.
  var _sejudEnabled = true;
  try {
    chrome.storage.local.get({ pje_enabled: true }, function(d) { _sejudEnabled = !!d.pje_enabled; });
    chrome.storage.onChanged.addListener(function(changes, area) {
      if (area === 'local' && changes.pje_enabled) _sejudEnabled = !!changes.pje_enabled.newValue;
    });
  } catch(e) {}

  function injetarEstilosMenuDropdown() {
    if (document.getElementById('pje-menu-dropdown-style')) return;
    var s = document.createElement('style');
    s.id = 'pje-menu-dropdown-style';
    s.textContent = substituirCores(`
#pje-ext-menu-btn{text-decoration:none !important;color:inherit !important}
#pje-ext-menu-btn:hover .ext-icon img{filter:drop-shadow(0 0 4px rgba(0,0,0,.15))}
#pje-ext-menu-btn:hover span{color:#0f172a !important}
/* ── shadcn/ui: Dropdown Menu ── */
#pje-ext-dropdown{
  position:fixed;z-index:2147483646;
  background:#fff;border-radius:12px;
  box-shadow:0 1px 3px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.1);
  min-width:240px;max-width:280px;overflow:hidden;
  opacity:0;transform:translateX(-8px) scale(.94);
  transform-origin:top left;
  pointer-events:none;
  transition:opacity .22s cubic-bezier(.22,.1,.2,1),transform .22s cubic-bezier(.22,.1,.2,1);
  border:1px solid #e2e8f0;
}
#pje-ext-dropdown.open{
  opacity:1;transform:translateX(0) scale(1);
  pointer-events:auto;
}
#pje-ext-dropdown .dd-arrow{
  position:absolute;left:-7px;top:16px;
  width:0;height:0;
  border-top:7px solid transparent;border-bottom:7px solid transparent;
  border-right:7px solid #fff;
  filter:drop-shadow(-1px 0 1px rgba(0,0,0,.04));
  opacity:0;transform:translateX(3px);
  transition:opacity .18s cubic-bezier(.22,.1,.2,1) .04s,transform .18s cubic-bezier(.22,.1,.2,1) .04s;
}
#pje-ext-dropdown.open .dd-arrow{opacity:1;transform:translateX(0)}
#pje-ext-dropdown .dd-header{
  background:#fff;color:#0f172a;
  padding:12px 14px;font-size:13px;font-weight:600;
  display:flex;align-items:center;gap:10px;
  border-bottom:1px solid #e2e8f0;
}
#pje-ext-dropdown .dd-body{padding:6px}
#pje-ext-dropdown .dd-item{
  display:flex;width:100%;box-sizing:border-box;align-items:center;
  padding:8px 10px;border-radius:7px;cursor:pointer;
  transition:background .12s;gap:10px;border:none;background:none;
  font-family:inherit;font-size:12px;font-weight:500;color:#334155;text-align:left;
}
#pje-ext-dropdown .dd-item:hover{background:#f1f5f9;color:#0f172a}
#pje-ext-dropdown .dd-item:active{background:#e2e8f0}
#pje-ext-dropdown .dd-item-icon{flex-shrink:0;width:16px;height:16px;display:flex;align-items:center;justify-content:center}
#pje-ext-dropdown .dd-item-text{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;font-size:12px}
#pje-ext-dropdown .dd-divider{height:1px;background:#e2e8f0;margin:4px 6px}`);
    document.head.appendChild(s);
  }

  function injetarBotao() {
    if (!_sejudEnabled) {
      // extensão desabilitada pelo toggle do popup — remove o botão/dropdown se existir
      var liOff = document.getElementById('liCitarIntimar');
      if (liOff) liOff.remove();
      var ddOff = document.getElementById('pje-ext-dropdown');
      if (ddOff) ddOff.remove();
      return;
    }
    // Só injeta nas páginas principais (não em tarefas, movimentar, erro, iframe)
    var href = window.location.href;
    if (href.includes('movimentar.seam') || href.includes('conteudo-tarefa') || href.includes('error.seam') || href.includes('listAutosDigitais')) return;
    // ULTRASSIMPLES: igual ao Token do content.js que funciona em produção
    var menu = document.querySelector('ul#menu[role="menubar"]') || document.querySelector('ul[aria-label="Menu lateral do PJe"]');
    if (!menu) return;
    try {
      var li = document.getElementById('liCitarIntimar');
      if (!li) {
        li = document.createElement('li');
        li.id = 'liCitarIntimar';
        li.setAttribute('tabindex', '0');
        li.style.cssText = 'cursor:pointer;list-style:none;';
        // Ícone via emoji (sem dependência de imagem externa!)
        li.innerHTML = '<a title="Sejud Cariri" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-decoration:none;color:inherit;padding:8px 4px;font-size:11px;gap:4px;"><span style="font-size:20px;line-height:1;">⚙️</span><span style="font-size:10px;margin-top:2px">Sejud</span></a>';
        li.addEventListener('click', function() { abrir('citar', 'kanban'); });
        menu.appendChild(li);
        log('✅ Botão Sejud injetado no menu!');
      }
      // SEMPRE carrega o ícone real e o dropdown (remove versão antiga se existir)
      setTimeout(function() { injetarDropdownCompleto(menu); }, 100);
    } catch(e) {
      console.error('[Sejud] Erro ao injetar botão:', e);
    }
  }

  function injetarDropdownCompleto(menu) {
    try {
      var li = document.getElementById('liCitarIntimar');
      if (!li) return;
      // Remove dropdown antigo (criado pela primeira IIFE) para recriar com handlers corretos
      var oldDd = document.getElementById('pje-ext-dropdown');
      if (oldDd) oldDd.remove();
      injetarEstilosMenuDropdown();
      // Substitui o emoji pelo ícone real
      var iconUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL('icon.png') : 'icon.png';
      var a = li.querySelector('a');
      if (a) {
        a.id = 'pje-ext-menu-btn';
        a.innerHTML = '<span class="ext-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;"><img src="' + iconUrl + '" width="24" height="24" style="display:block;border-radius:4px" alt="Sejud"></span>';
      }
      // Cria dropdown
      var dropdown = document.createElement('div');
      dropdown.id = 'pje-ext-dropdown';
      dropdown.innerHTML = '<div class="dd-arrow"></div><div class="dd-header"><img src="' + iconUrl + '" width="20" height="20" style="border-radius:3px;flex-shrink:0"><span>PJe Sejud Cariri</span></div><div class="dd-body"><button class="dd-item" id="pje-dd-automacao"><span class="dd-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v4M6 2 2 6M6 2l4 4M4 21h16M5 21l1.5-5M19 21l-1.5-5M10 12v-2h4l-4 6v-2H6"/></svg></span><span class="dd-item-text">Automação de Processos</span></button><div class="dd-divider"></div><button class="dd-item" id="pje-dd-agrupador"><span class="dd-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg></span><span class="dd-item-text">Agrupador de Processos</span></button><div class="dd-divider"></div><button class="dd-item" id="pje-dd-duplicados"><span class="dd-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16V4a2 2 0 0 1 2-2h10"/></svg></span><span class="dd-item-text">Processos em Múltiplas Filas</span></button></div>';
      // Analisador de Polos — desativado temporariamente
      // <button class="dd-item" id="pje-dd-polos">...Analisar Polos...</button>
      document.body.appendChild(dropdown);
      // Bind eventos
      var btn = a;
      var hideTimer, isDropdownHovered = false;
      function pos() {
        var br = btn.getBoundingClientRect(), mr = menu.getBoundingClientRect ? menu.getBoundingClientRect() : br;
        var l = Math.max(br.right, mr.right) + 12, t = br.top - 4;
        if (l + 300 > innerWidth) l = br.left - 312;
        if (t < 8) t = 8;
        if (t + 400 > innerHeight) t = innerHeight - 420;
        dropdown.style.left = l + 'px'; dropdown.style.top = t + 'px';
      }
      function close() { clearTimeout(hideTimer); dropdown.classList.remove('open'); }
      btn.addEventListener('mouseenter', function() { clearTimeout(hideTimer); pos(); dropdown.classList.add('open'); });
      btn.addEventListener('mouseleave', function() { hideTimer = setTimeout(function() { if (!isDropdownHovered) close(); }, 200); });
      dropdown.addEventListener('mouseenter', function() { isDropdownHovered = true; clearTimeout(hideTimer); });
      dropdown.addEventListener('mouseleave', function() { isDropdownHovered = false; close(); });
      window.addEventListener('scroll', function() { close(); }, true);
      dropdown.querySelector('#pje-dd-automacao').addEventListener('click', function() { close(); abrir('citar', 'kanban'); });
      dropdown.querySelector('#pje-dd-agrupador').addEventListener('click', function() { close(); abrirAgrupadorModal(); });
      dropdown.querySelector('#pje-dd-duplicados').addEventListener('click', function() { close(); abrir('citar', 'duplicados'); });
      // dropdown.querySelector('#pje-dd-polos').addEventListener('click', function() { close(); abrirAnalisadorPolos(); }); // Analisador de Polos — desativado temporariamente
      log('✅ Dropdown Sejud completo!');
    } catch(e) { console.error('[Sejud] Erro dropdown:', e); }
  }

  // Expõe no window para o observer global acessar
  window._pjeInjetarBotao = injetarBotao;
  console.log('[Sejud] injetarBotao exposto no window._pjeInjetarBotao');

// ══════════════════════════════════════════════════════════
// Observer + Interval GLOBAIS (fora da IIFE, igual content.js)
// ══════════════════════════════════════════════════════════
console.log('[Sejud] Configurando observer global...');
setTimeout(function() {
  console.log('[Sejud] setTimeout 800ms global');
  if (window._pjeInjetarBotao) window._pjeInjetarBotao();
}, 800);
var _sejudObserver = new MutationObserver(function() {
  if (!document.getElementById('liCitarIntimar') && window._pjeInjetarBotao) window._pjeInjetarBotao();
});
_sejudObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
console.log('[Sejud] Observer global ativo');
// Fallback silencioso: se o MutationObserver falhar, tenta injetar a cada 5s
// (sem console.log para não poluir — o observer já cobre o caso comum)
setInterval(function() {
  if (!document.getElementById('liCitarIntimar') && window._pjeInjetarBotao) {
    window._pjeInjetarBotao();
  }
}, 5000);

