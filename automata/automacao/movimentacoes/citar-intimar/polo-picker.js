// ═══════════════════════════════════════════════════════════
// PJe Sejud — Seletor de Polo (Ativo/Passivo/Outros)
// Depende de: utils.js
// ═══════════════════════════════════════════════════════════════

  var POLO_SOLO = ['ministerio_publico', 'defensoria', 'procuradoria'];
  // Estado interno (independente do DOM, não sofre injeção do PJe)
  var _poloState = [];

  var POLO_NOMES = {
    passivo: 'Passivo', ativo: 'Ativo',
    ministerio_publico: 'Ministério Público',
    defensoria: 'Defensoria', procuradoria: 'Procuradoria'
  };

  function getPolosSelecionados() {
    return _poloState.length ? _poloState.slice() : ['passivo'];
  }


  function adicionarPolo(value) {
    var isSolo = POLO_SOLO.indexOf(value) !== -1;
    if (isSolo) {
      // Solo: remove tudo, fica só ele
      _poloState = [value];
    } else {
      // Grupo polo: remove só as entidades solo, depois adiciona
      _poloState = _poloState.filter(function(v) { return POLO_SOLO.indexOf(v) === -1; });
      if (_poloState.indexOf(value) === -1) _poloState.push(value);
    }
    renderTags();
  }


  function removerPolo(value) {
    _poloState = _poloState.filter(function(v) { return v !== value; });
    renderTags();
  }


  // Opções permanentemente desabilitadas (não implementadas ainda)
  var POLO_NAO_IMPLEMENTADO = ['defensoria', 'procuradoria'];

  function renderTags() {
    var tagsEl = $('#pje-ci-polo-tags');
    var picker = $('#pje-ci-polo-picker');
    if (!tagsEl) return;
    tagsEl.innerHTML = '';

    // Sincroniza opções do select
    if (picker) {
      Array.from(picker.options).forEach(function(opt) {
        if (!opt.value) return; // placeholder sempre visível
        // Reforça disabled das não implementadas (PJe pode stripar do HTML)
        if (POLO_NAO_IMPLEMENTADO.indexOf(opt.value) !== -1) {
          opt.disabled = true;
          return;
        }
        // Esconde opções já selecionadas
        opt.disabled = _poloState.indexOf(opt.value) !== -1;
      });
    }

    if (_poloState.length === 0) {
      tagsEl.style.display = 'none';
      return;
    }

    _poloState.forEach(function(v) {
      var tag = document.createElement('span');
      tag.className = 'pje-polo-tag' + (POLO_SOLO.indexOf(v) !== -1 ? ' solo' : '');
      tag.innerHTML = POLO_NOMES[v] + ' <span class="pje-polo-tag-x" data-value="' + v + '">&times;</span>';
      tagsEl.appendChild(tag);
    });

    tagsEl.style.display = 'flex';
  }

  function initPoloPicker() {
    var picker = $('#pje-ci-polo-picker');
    var tagsEl = $('#pje-ci-polo-tags');
    if (!picker || !tagsEl) return;

    // Ao selecionar uma opção no <select>
    picker.addEventListener('change', function() {
      var value = picker.value;
      if (!value) return; // placeholder
      adicionarPolo(value);
      picker.value = ''; // reseta pro placeholder
    });

    // Remove tag via X (delegação no container de tags)
    tagsEl.addEventListener('click', function(e) {
      var xBtn = e.target.closest('.pje-polo-tag-x');
      if (!xBtn) return;
      removerPolo(xBtn.getAttribute('data-value'));
    });

    // Default: passivo + ativo
    _poloState = ['passivo', 'ativo'];
    renderTags();
  }
