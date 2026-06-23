// =============================================
// PJE FILTRO MASTER - CARIRI v3.0
// PATCH: MODO SEGURO TOTAL NO IFRAME DA TAREFA/MINUTA
// =============================================
(function(){
  const __pjeHref = String(window.location.href || '');
  const __pjeName = String(window.name || '');
  const __pjeIsFrameTarefa = __pjeName === 'frame-tarefa' || __pjeHref.includes('/Processo/movimentar.seam') || __pjeHref.includes('movimentar.seam');
  if (__pjeIsFrameTarefa) {
    try {
      console.log('[PJE EXT] Modo seguro: RPC mínimo de Minutas/MiniPAC ativo no iframe.');
      document.documentElement.setAttribute('data-pje-ext-safe-disabled', '1');
      const W=ms=>new Promise(r=>setTimeout(r,ms));
      const X=xp=>{try{return document.evaluate(xp,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;}catch(e){return null;}};
      const C=el=>{if(!el)return;try{el.scrollIntoView({block:'center',inline:'center'});}catch(e){} ['mousedown','mouseup','click'].forEach(t=>{try{el.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,view:window}));}catch(e){}});};
      const V=(el,v)=>{if(!el)return false;try{el.focus();}catch(e){} try{el.removeAttribute('readonly');}catch(e){} try{HTMLInputElement.prototype.value&&Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));}catch(e){try{el.value=String(v);}catch(x){}} ['keydown','input','keyup','change','blur'].forEach(t=>{try{el.dispatchEvent(new Event(t,{bubbles:true,cancelable:true}));}catch(e){}}); try{if(window.jQuery) window.jQuery(el).val(String(v)).trigger('input').trigger('change').trigger('blur');}catch(e){} return String(el.value||'').trim()===String(v).trim();};
      const IDC=(a,b,c)=>Array.from(document.querySelectorAll('[id]')).find(el=>(!a||el.id.includes(a))&&(!b||el.id.includes(b))&&(!c||el.id.includes(c)));
      async function S2(container,texto){
        if(!container)throw new Error('Select2 não encontrado para: '+texto);
        C(container.closest('.select2-selection')||container.parentElement||container); await W(700);
        const input=document.querySelector('.select2-container--open .select2-search__field, .select2-search__field'); if(!input)throw new Error('Campo de busca Select2 não apareceu para: '+texto);
        input.focus(); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true}));
        for(const ch of texto){try{input.dispatchEvent(new KeyboardEvent('keydown',{key:ch,bubbles:true,cancelable:true}));}catch(e){} input.value+=ch; input.dispatchEvent(new Event('input',{bubbles:true})); try{input.dispatchEvent(new KeyboardEvent('keyup',{key:ch,bubbles:true,cancelable:true}));}catch(e){} await W(80);}
        await W(1000); const opts=[...document.querySelectorAll('.select2-results__option:not(.select2-results__option--disabled):not(.loading-results)')]; const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const alvo=opts.find(o=>norm(o.textContent).trim()===norm(texto))||opts.find(o=>norm(o.textContent).includes(norm(texto)))||opts[0]; if(!alvo)throw new Error('Nenhuma opção encontrada para: '+texto); C(alvo); await W(800);
      }
      async function selDoc(kind,texto){const c=kind==='documento'?(X('//*[contains(@id,"selectMenuTipoDocumento") and contains(@id,"container")]')||document.querySelector('[id*="selectMenuTipoDocumento"][id*="container"], [id*="TipoDocumento"][id*="container"]')):(X('//*[contains(@id,"selectModeloDocumento") and contains(@id,"container")]')||document.querySelector('[id*="selectModeloDocumento"][id*="container"], [id*="ModeloDocumento"][id*="container"]')); await S2(c,texto);}
      async function preparar(modelo){await selDoc('documento','Despacho'); await W(1000); await selDoc('modelo',modelo||'Cobrança de Mandados NV 1'); await W(900); const mero=X('//*[contains(@id,"homologadorEventoTreeParamPesquisaInput")]')||document.querySelector('[id*="homologadorEventoTreeParamPesquisaInput"]'); if(mero)V(mero,'mero'); await W(350); C(X('//*[contains(@id,"btnPesquisar")]')||document.querySelector('[id*="btnPesquisar"]'));}
      async function salvar(){const b=X('//*[contains(@id,"BotaoSalvar")]')||document.querySelector('[id*="BotaoSalvar"]'); if(!b)throw new Error('Botão Salvar não encontrado.'); C(b); await W(2500);}
      async function setPrazoMiniPAC(valor, obrigatorio){
        let pr=null;
        for(let tentativa=0; tentativa<18; tentativa++){
          pr=X('//*[contains(@id,"Minipac") and contains(@id,"tableDestinatarios:0:prazo")]')||document.querySelector('[id*="Minipac"][id*="tableDestinatarios:0:prazo"], [id*="tableDestinatarios:0:prazo"], input[id*="prazo"]');
          if(pr && !pr.disabled){C(pr); if(V(pr,valor)){await W(250); return true;} V(pr,''); await W(80); if(V(pr,valor)){await W(250); return true;}}
          await W(250);
        }
        if(obrigatorio) throw new Error('MiniPAC: campo de prazo não encontrado/preenchido.');
        return false;
      }
      async function minipac(cfg){
        const polo=(cfg&&cfg.polo)||'ativo', tipo=(cfg&&cfg.tipoAto)||'Intimaçao', prazo=String((cfg&&cfg.prazo)||'15');
        const header=X('//*[contains(@id,"Minipac") and contains(@id,"toggleMiniPac_header")]')||IDC('Minipac','toggleMiniPac_header'); if(!header)throw new Error('MiniPAC: cabeçalho toggleMiniPac_header não encontrado.'); C(header); await W(800);
        const bp=polo==='passivo'?(X('//*[contains(@id,"Minipac") and contains(@id,"poloPassivoBotao")]')||IDC('Minipac','poloPassivoBotao')):(X('//*[contains(@id,"Minipac") and contains(@id,"poloAtivoBotao")]')||IDC('Minipac','poloAtivoBotao')); if(!bp)throw new Error('MiniPAC: botão do polo não encontrado: '+polo); C(bp); await W(1000);
        const tc=X('//*[contains(@id,"Minipac") and contains(@id,"tableDestinatarios:0:tipoAtoComboCol-container")]')||document.querySelector('[id*="Minipac"][id*="tableDestinatarios:0:tipoAtoComboCol-container"], [id*="tipoAtoComboCol-container"]'); await S2(tc,tipo); await W(500);
        let okPrazo=await setPrazoMiniPAC(prazo,false);
        const ec=X('//*[contains(@id,"Minipac") and contains(@id,"tableDestinatarios:0:ECol")]')||IDC('Minipac','tableDestinatarios:0:ECol')||document.querySelector('[id*="tableDestinatarios:0:ECol"]'); if(!ec)throw new Error('MiniPAC: botão ECol não encontrado.'); C(ec); await W(900);
        if(!okPrazo) okPrazo=await setPrazoMiniPAC(prazo,true); else await setPrazoMiniPAC(prazo,false);
        const gr=X('//*[contains(@id,"Minipac") and contains(@id,"gravarButton")]')||IDC('Minipac','gravarButton')||document.querySelector('[id*="gravarButton"]'); if(!gr)throw new Error('MiniPAC: botão Gravar não encontrado.'); C(gr); await W(800);
      }
      window.addEventListener('message',async e=>{if(!e.data||e.data.pjeMinutas!==true)return;try{if(e.data.tipo==='MINUTA_DESPACHO'){await preparar(e.data.modelo);window.parent.postMessage({pjeMinutas:true,tipo:'AGUARDANDO_USUARIO'},'*');}if(e.data.tipo==='MINUTA_SALVAR'){await salvar();window.parent.postMessage({pjeMinutas:true,tipo:'SALVO_ABRIR_TRANSICAO'},'*');}if(e.data.tipo==='MINIPAC_CONFIG'){await minipac(e.data.config||{});window.parent.postMessage({pjeMinutas:true,tipo:'MINIPAC_OK'},'*');}}catch(err){window.parent.postMessage({pjeMinutas:true,tipo:'ERRO',msg:String(err&&err.message||err)},'*');}});
    } catch(e) { console.error('[PJE Minutas RPC]', e); }
    return;
  }

// =============================================
// PJE FILTRO MASTER - CARIRI  v3.0
// =============================================

// --- FEATURE 1: Selector de Competência ---
const COMPETENCIAS = [
  "", "Cível", "Criminal", "Família", "Fazenda Pública",
  "Juizado Especial Cível", "Juizado Especial Criminal",
  "Sucessões", "Vara Única", "Infância e Juventude"
];
const LS_KEY = 'pje_competencia_salva';
let autoPesquisaExecutada = false;

function aplicarValorNoAngular(inputOriginal, valor) {
  inputOriginal.value = valor;
  ['input', 'change', 'blur'].forEach(ev => inputOriginal.dispatchEvent(new Event(ev, { bubbles: true })));
}
function clicarBotaoPesquisar() {
  const r = document.evaluate(
    '/html/body/app-root/selector/div/div/div[2]/right-panel/div/div/div[3]/tarefas/div/div[2]/filtro-tarefas-pendentes/div/form/fieldset/div[4]/button[1]',
    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
  );
  const botao = r.singleNodeValue
    || document.querySelector('filtro-tarefas-pendentes form fieldset button[type="submit"]')
    || document.querySelector('filtro-tarefas-pendentes form fieldset div:nth-child(4) button:first-child');
  if (botao) { botao.click(); autoPesquisaExecutada = true; }
}
function injetarEmTodosOsCampos() {
  document.querySelectorAll('input[id="itCompetencia"]').forEach((inputOriginal, index) => {
    if (inputOriginal.parentNode.querySelector('.pje-custom-applied')) return;
    const select = document.createElement('select');
    select.className = 'form-control pje-custom-applied'; select.id = `pje-select-custom-${index}`;
    select.style.cssText = `display:block!important;width:100%!important;margin-bottom:8px!important;border:2px solid #007bff!important;background-color:white!important;color:black!important;z-index:999!important;`;
    COMPETENCIAS.forEach(comp => { const opt = document.createElement('option'); opt.value = comp; opt.text = comp || "-- Selecione a Competência --"; select.appendChild(opt); });
    const salva = localStorage.getItem(LS_KEY);
    if (salva && COMPETENCIAS.includes(salva)) {
      select.value = salva;
      setTimeout(() => aplicarValorNoAngular(inputOriginal, salva), 300);
      if (!autoPesquisaExecutada) {
        setTimeout(() => clicarBotaoPesquisar(), 800);
        setTimeout(() => { if (!autoPesquisaExecutada) clicarBotaoPesquisar(); }, 1500);
      }
    }
    select.onchange = (e) => { localStorage.setItem(LS_KEY, e.target.value); aplicarValorNoAngular(inputOriginal, e.target.value); };
    inputOriginal.parentNode.insertBefore(select, inputOriginal);
    inputOriginal.style.setProperty('display', 'none', 'important');
  });
}

// --- FEATURE 2: Botão Token ---
const TOKEN_URL = 'https://pje.tjce.jus.br/pje1grau/publico/usuario/token.seam';
const TOKEN_ITEM_ID = 'liTokenPJe';
function injetarBotaoToken() {
  if (document.getElementById(TOKEN_ITEM_ID)) return;
  const menu = document.querySelector('ul#menu[role="menubar"]') || document.querySelector('ul[aria-label="Menu lateral do PJe"]');
  if (!menu) return;
  const li = document.createElement('li');
  li.id = TOKEN_ITEM_ID; li.setAttribute('tabindex', '0'); li.style.cssText = `cursor:pointer;list-style:none;`;
  li.innerHTML = `<a href="${TOKEN_URL}" target="_blank" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-decoration:none;color:inherit;padding:8px 4px;font-size:11px;gap:4px;" title="Token"><span style="font-size:20px;line-height:1;">🔑</span><span>Token</span></a>`;
  li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') window.open(TOKEN_URL, '_blank'); });
  menu.appendChild(li);
}

// --- FEATURE 3: Autos Digitais ---
function criarOverlayAutos(url) {
  const existente = document.getElementById('pje-autos-overlay'); if (existente) existente.remove();
  console.log('[PJE overlay] criarOverlayAutos autoTarefas=' + window._pjeAutoTarefas + ' url=' + url.substring(0,70));
  // Se não é abertura automática de tarefas, limpa modal stale
  if (!window._pjeAutoTarefas) { document.getElementById('pje-tarefas-modal')?.remove(); }
  const overlay = document.createElement('div'); overlay.id = 'pje-autos-overlay';
  overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;background:#fff;display:flex;flex-direction:column;`;
  window._pjeOverlayCreated = true; // impede fallback de criar segundo overlay
  if (window._pjeAutoTarefas) { overlay.dataset.autoTarefas = '1'; overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `display:flex;align-items:center;padding:6px 12px;gap:10px;background:#1a237e;color:white;min-height:42px;flex-shrink:0;`;
  toolbar.innerHTML = `<span style="font-size:16px;">📄</span><span style="flex:1;font-size:13px;font-weight:bold;">Autos Digitais</span>
    <button id="pje-autos-nova-aba" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.4);color:white;cursor:pointer;padding:5px 12px;border-radius:4px;font-size:12px;">↗ Nova aba</button>
    <button id="pje-autos-fechar" style="background:#e53935;border:none;color:white;cursor:pointer;padding:5px 14px;border-radius:4px;font-size:13px;font-weight:bold;">✕ Fechar</button>`;
  const loading = document.createElement('div');
  loading.style.cssText = `position:absolute;top:42px;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:#f5f5f5;font-size:15px;color:#555;`;
  loading.textContent = '⏳ Carregando autos...';
  const iframe = document.createElement('iframe'); iframe.src = (window._pjeAutoTarefas ? url.split('#')[0] + '#tarefas' : url); window._pjeAutoTarefas = false; iframe.style.cssText = `flex:1;border:none;width:100%;`; iframe.onload = () => loading.remove();
  overlay.appendChild(toolbar); overlay.appendChild(loading); overlay.appendChild(iframe); document.body.appendChild(overlay);
  document.getElementById('pje-autos-fechar').onclick = () => overlay.remove();
  document.getElementById('pje-autos-nova-aba').onclick = () => { window.open.__pje_original__.call(window, url, '_blank'); overlay.remove(); };
  document.addEventListener('keydown', function escHandler(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } });
}
function ehUrlAutosDigitais(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.includes('tjce.jus.br') && !url.includes('cnj.cloud')) return false;
  if (url.includes('token.seam')) return false;
  // SÓ intercepta URLs de Autos Digitais (listAutosDigitais).
  // URLs de tarefa (conteudo-tarefa, movimentar.seam) NÃO são overlay —
  // devem abrir em nova aba para que a automação (auto-citar) rode lá.
  if (!url.includes('listAutosDigitais') && !url.includes('listAutoDigitais')) return false;
  return true;
}
function iniciarInterceptacaoAutos() {
  if (!window.open.__pje_original__) {
    const _original = window.open.bind(window);
    const _novo = function(url, target, features) {
      if (ehUrlAutosDigitais(url)) { criarOverlayAutos(url); return { closed: false, focus: () => {}, close: () => {} }; }
      return _original(url, target, features);
    };
    _novo.__pje_original__ = _original; window.open = _novo;
  }
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[target="_blank"]');
    if (link && ehUrlAutosDigitais(link.href)) { e.preventDefault(); e.stopImmediatePropagation(); criarOverlayAutos(link.href); }
  }, true);
  const obsAutos = new MutationObserver(() => {
    document.querySelectorAll('pje-link-autos-digitais a[target="_blank"]').forEach(a => {
      if (ehUrlAutosDigitais(a.href) && !a.dataset.pjePatched) {
        a.dataset.pjePatched = 'true'; const url = a.href; a.removeAttribute('target');
        a.addEventListener('click', (e) => { e.preventDefault(); criarOverlayAutos(url); });
      }
    });
  });
  obsAutos.observe(document.body, { childList: true, subtree: true });
}
iniciarInterceptacaoAutos();

// --- FEATURE 4: Checkboxes de Atividades ---
function injetarEstiloCheckboxes() {
  if (document.getElementById('pje-checkbox-styles')) return;
  const style = document.createElement('style');
  style.id = 'pje-checkbox-styles';
  style.textContent = `
    .propertyView.col-md-12.pje-enhanced { display:flex!important;align-items:center!important;gap:14px!important;padding:12px 18px!important;margin:4px 0!important;border-radius:10px!important;border:1.5px solid transparent!important;background:#fafafa!important;cursor:pointer!important;transition:background .15s,border-color .15s!important;box-sizing:border-box!important;position:relative!important;user-select:none!important; }
    .propertyView.col-md-12.pje-enhanced:hover { background:#e8f0fe!important;border-color:#90caf9!important; }
    .propertyView.col-md-12.pje-checked { background:#e3f2fd!important;border-color:#1565c0!important; }
    .propertyView.col-md-12.pje-enhanced .value { order:1!important;display:flex!important;align-items:center!important;float:none!important;width:auto!important;flex-shrink:0!important;padding:0!important;margin:0!important; }
    .propertyView.col-md-12.pje-enhanced .name { order:2!important;flex:1!important;float:none!important;width:auto!important;padding:0!important;margin:0!important; }
    .propertyView.col-md-12.pje-enhanced .name label { font-size:14px!important;font-weight:500!important;color:#212121!important;cursor:pointer!important;display:block!important;margin:0!important;float:none!important;width:auto!important;vertical-align:unset!important; }
    .propertyView.col-md-12.pje-checked .name label { color:#0d47a1!important;font-weight:600!important; }
    .propertyView.col-md-12.pje-enhanced input[type="checkbox"] { appearance:none!important;-webkit-appearance:none!important;width:24px!important;min-width:24px!important;height:24px!important;border:2.5px solid #90a4ae!important;border-radius:6px!important;background:white!important;cursor:pointer!important;position:relative!important;transition:all .15s!important;margin:0!important;flex-shrink:0!important;display:block!important; }
    .propertyView.col-md-12.pje-enhanced input[type="checkbox"]:checked { background:#1565c0!important;border-color:#1565c0!important; }
    .propertyView.col-md-12.pje-enhanced input[type="checkbox"]:checked::after { content:''!important;position:absolute!important;left:6px!important;top:2px!important;width:7px!important;height:13px!important;border:2.5px solid white!important;border-top:none!important;border-left:none!important;transform:rotate(45deg)!important;display:block!important; }
  `;
  document.head.appendChild(style);
}
function toggleCheckbox(checkbox, row) {
  checkbox.checked = !checkbox.checked;
  row.classList.toggle('pje-checked', checkbox.checked);
  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
}
function melhorarCheckboxesAtividades() {
  injetarEstiloCheckboxes();
  document.querySelectorAll('.propertyView.col-md-12:not(.pje-enhanced)').forEach(row => {
    const checkbox = row.querySelector('.value input[type="checkbox"]');
    const labelEl  = row.querySelector('.name label');
    if (!checkbox || !labelEl) return;
    labelEl.removeAttribute('for');
    row.classList.add('pje-enhanced');
    if (checkbox.checked) row.classList.add('pje-checked');
    checkbox.addEventListener('click', (e) => { e.stopPropagation(); row.classList.toggle('pje-checked', checkbox.checked); checkbox.dispatchEvent(new Event('change', { bubbles: true })); });
    row.addEventListener('click', (e) => { if (e.target === checkbox) return; toggleCheckbox(checkbox, row); });
  });
}

// ============================================================
// ============================================================
// --- FEATURE 6: Botão de Atalho "Tarefas Pendentes" ---
// ============================================================
// Na página JSF de consulta do processo, injeta um botão flutuante
// que abre o popup de tarefas pendentes com um clique — sem precisar
// procurar o botão original escondido na interface.
// ============================================================

(function iniciarFeature6() {
  // Só roda em páginas JSF de processo (consulta de autos)
  const url = window.location.href;
  // Só na página de Autos Digitais (listAutosDigitais.seam) — não em movimentar.seam etc.
  const ehPaginaProcesso = url.includes('listAutosDigitais') ||
                           url.includes('listAutoDigitais');
  if (!ehPaginaProcesso) return;

  // Estilos do botão flutuante
  const style = document.createElement('style');
  style.textContent = `
    #pje-btn-tarefas {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      background: #1d4ed8;
      color: #fff;
      border: none;
      border-radius: 50px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,.3);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background .15s, transform .1s;
    }
    #pje-btn-tarefas:hover { background: #1e40af; transform: scale(1.04); }
    #pje-btn-tarefas:active { transform: scale(.97); }
  `;
  document.head.appendChild(style);

  function abrirTarefas() {
    // Tenta chamar RichFaces diretamente (se disponível na página)
    try {
      if (typeof RichFaces !== 'undefined' && RichFaces.showModalPanel) {
        RichFaces.showModalPanel('popupTarefas');
        return;
      }
    } catch(e) {}

    // Fallback: encontra e clica no botão original que abre o popup
    const botaoOriginal =
      document.querySelector('a[onclick*="popupTarefas"][onclick*="show"], ' +
                             'a[onclick*="showModalPanel"][onclick*="Tarefa"], ' +
                             'input[onclick*="popupTarefas"], ' +
                             'button[onclick*="popupTarefas"]') ||
      // Procura qualquer elemento cujo onclick mencione showModalPanel + Tarefa
      (() => {
        for (const el of document.querySelectorAll('a, input[type="button"], button')) {
          const oc = (el.getAttribute('onclick') || '').toLowerCase();
          if (oc.includes('showmodalpanel') || oc.includes('show') && oc.includes('tarefa')) return el;
        }
        return null;
      })();

    if (botaoOriginal) {
      botaoOriginal.click();
    } else {
      console.warn('[PJE Tarefas] Botão nativo não encontrado na página atual.');
    }
  }

  function injetarBotao() {
    if (document.getElementById('pje-btn-tarefas')) return;
    const btn = document.createElement('button');
    btn.id = 'pje-btn-tarefas';
    btn.innerHTML = '📋 Tarefas';
    btn.title = 'Ver tarefas pendentes do processo';
    btn.onclick = abrirTarefas;
    document.body.appendChild(btn);
  }

  // Injeta imediatamente e com retries (JSF pode demorar)
  injetarBotao();
  setTimeout(injetarBotao, 1000);
  setTimeout(injetarBotao, 3000);

  // Auto-abre o modal se o popup foi chamado com #tarefas
  // Usa polling: aguarda o botão JSF nativo aparecer (pode demorar 2-5s)
  if (window.location.hash === '#tarefas') {
    console.log('[PJE #tarefas] handler ativado em: ' + window.location.href.substring(0, 80));

    // CRÍTICO: injeta no contexto REAL da página (main world) para suprimir confirm/alert.
    // Content scripts rodam em isolated world → window.confirm deles não afeta a página.
    // A única forma é injetar uma <script> tag no DOM da página.
    // Sinaliza para suppress_dialogs.js (main world) via atributo DOM
    document.documentElement.setAttribute('data-pje-suppress', '1');
    console.log('[PJE #tarefas] supressão de dialogs ativada via DOM attr');
    // Se é tela de seleção de perfil → desiste imediatamente (não polui CPU)
    if (document.getElementById('papeisUsuarioForm') ||
        document.querySelector('form[name*="papeis"]') ||
        (document.title || '').toLowerCase().includes('selecione') ||
        !document.getElementById('navbar')) {
      console.log('[PJE #tarefas] tela de perfil ou sem navbar → desistindo');
      window.parent.postMessage({ pjeTarefasCapturado: true, tarefas: [], html: '', titulo: '' }, '*');
      return;
    }
    let tentativas = 0;
    const pollTarefas = setInterval(() => {
      tentativas++;
      if (tentativas === 1) {
        // Log de diagnóstico: lista todos os elementos interativos da página
        const _allEls = [];
        document.querySelectorAll('a[onclick], input[onclick], button[onclick], a[href*="javascript"]').forEach(el => {
          _allEls.push((el.id||'?') + ':' + (el.textContent||el.value||'').trim().substring(0,20) + ':' + (el.getAttribute('onclick')||'').substring(0,50));
        });
        console.log('[PJE #tarefas] botoes onclick (' + _allEls.length + '):', _allEls.join(' || '));
      }
      // Botão nativo JSF que dispara o modal de tarefas
      const botaoNativo =
        document.querySelector('a[onclick*="popupTarefas"]') ||
        document.querySelector('input[onclick*="popupTarefas"]') ||
        document.querySelector('button[onclick*="popupTarefas"]') ||
        // "Exibir tarefa atual" — mostra painel com tarefa/prazo atual do processo (preferido)
        document.getElementById('navbar:linkExibirTarefaAtualProcesso') ||
        document.querySelector('a[id*="ExibirTarefa"]') ||
        // "Histórico de Tarefas" — lista todas as tarefas do processo
        document.getElementById('navbar:linkAbasHistoricoTarefas') ||
        document.querySelector('a[id*="HistoricoTarefa"]') ||
        (() => {
          // Busca por texto ou showmodalpanel + tarefa como último recurso
          for (const el of document.querySelectorAll('a, input[type="button"], button')) {
            const oc = (el.getAttribute('onclick') || '').toLowerCase();
            const txt = (el.textContent || el.value || '').trim().toLowerCase();
            if (txt === 'tarefas' || txt === 'tarefas pendentes') return el;
            if (oc.includes('showmodalpanel') && oc.includes('tarefa')) return el;
          }
          return null;
        })();

      if (botaoNativo) {
        clearInterval(pollTarefas);
        console.log('[PJE #tarefas] botão encontrado: ' + (botaoNativo.id||botaoNativo.textContent||'').substring(0,40));
        // Observa aparecimento do painel de tarefas para extrair e enviar ao pai
        // Helper: extrai e envia tarefas do painel
        function _enviarTarefas(painel) {
          // Extrai nomes das tarefas dos links/texto do painel
          const _tarefas = [];
          if (painel) {
            // Links com nome da tarefa (padrão: a[href*="conteudo-tarefa"] ou a[onclick*="openPopUp"])
            painel.querySelectorAll('a[onclick*="openPopUp"], a[onclick*="Tarefa"], a[onclick*="tarefa"]').forEach(el => {
              const txt = (el.textContent || '').trim();
              if (txt && txt.length > 2 && !_tarefas.includes(txt)) _tarefas.push(txt);
            });
            // Fallback: todos os links de células da tabela de tarefas
            if (!_tarefas.length) {
              painel.querySelectorAll('td a, td[id*="tar"] a').forEach(el => {
                const txt = (el.textContent || '').trim();
                if (txt && txt.length > 3 && !_tarefas.includes(txt)) _tarefas.push(txt);
              });
            }
            // Fallback 2: texto dos elementos td
            if (!_tarefas.length) {
              painel.querySelectorAll('td').forEach(el => {
                const txt = (el.textContent || '').trim();
                if (txt && txt.length > 3 && txt.length < 200 && !_tarefas.includes(txt)) _tarefas.push(txt);
              });
            }
          }
          window.parent.postMessage({
            pjeTarefasCapturado: true,
            html: painel ? painel.innerHTML : '',
            tarefas: _tarefas,
            titulo: (document.title || '').substring(0, 80)
          }, '*');
        }

        // Observer: aguarda o painel aparecer após o click
        let _obs_fired = false;
        const _obs = new MutationObserver(() => {
          const painel = document.getElementById('popupTarefas') ||
                         document.querySelector('[id*="Tarefa"][id*="Panel"]') ||
                         document.querySelector('[id*="Tarefa"][id*="Content"]') ||
                         document.querySelector('[id*="HistoricoTarefa"][id*="content"]') ||
                         document.querySelector('[id*="ExibirTarefa"][id*="content"]') ||
                         document.querySelector('[id*="tarefaAtual"]') ||
                         document.querySelector('.rich-modalpanel-body') ||
                         document.querySelector('[id*="popupTarefa"]');
          if (!painel) return;
          const txt = (painel.textContent || '').trim();
          if (txt.length < 10) return;
          _obs_fired = true;
          _obs.disconnect();
          console.log('[PJE #tarefas] painel capturado! chars=' + (painel.innerHTML||'').length);
          _enviarTarefas(painel);
        });
        _obs.observe(document.body, { childList: true, subtree: true, attributes: true });
        botaoNativo.click();

        // Polling: captura painel mesmo quando DOM não muda (já estava visível)
        let _poll_count = 0;
        const _pollPanel = setInterval(() => {
          _poll_count++;
          if (_obs_fired) { clearInterval(_pollPanel); return; }
          const _pan = document.getElementById('popupTarefas') ||
                       document.querySelector('[id*="Tarefa"][id*="Panel"]') ||
                       document.querySelector('[id*="Tarefa"][id*="Content"]') ||
                       document.querySelector('.rich-modalpanel-body') ||
                       document.querySelector('[id*="popupTarefa"]');
          if (_pan && (_pan.textContent||'').trim().length > 10) {
            _obs_fired = true; _obs.disconnect(); clearInterval(_pollPanel);
            console.log('[PJE #tarefas] painel via polling! chars=' + (_pan.innerHTML||'').length);
            _enviarTarefas(_pan);
          }
          if (_poll_count >= 20) clearInterval(_pollPanel); // 10s
        }, 500);

        // Fallback após 3s: se A4J falhou (SyntaxError nos scripts do PJe),
        // faz o POST manualmente diretamente do overlay (same-origin!)
        setTimeout(() => {
          if (_obs_fired) return;
          const _vs = (document.querySelector('[name="javax.faces.ViewState"]') || {}).value;
          const _form = document.querySelector('form[id]');
          const _fid  = _form ? _form.id : 'j_id27';
          // Extrai compId do onclick do botão
          const _oc = botaoNativo.getAttribute('onclick') || '';
          const _mComp = _oc.match(/['"]((?:j_id|btnTarefa)\w*(?::\w+)*)['"]/);
          const _cid = _mComp ? _mComp[1] : null;

          if (!_vs || !_cid) {
            // Tenta componentes do form em sequência
            const _cands = ['j_id28','j_id29','j_id30','j_id31','j_id32','j_id33'].map(s => _fid+':'+s);
            function _tryP(i) {
              if (i >= _cands.length) { _obs.disconnect(); return; }
              const _b = new URLSearchParams({ AJAXREQUEST: _fid, 'javax.faces.ViewState': _vs||'',
                [_cands[i]]: _cands[i], CURRENT_COMPONENT: _cands[i], CURRENT_FORM: _fid });
              fetch(window.location.href.split('?')[0], {
                method:'POST', credentials:'include',
                headers:{'Content-Type':'application/x-www-form-urlencoded','Faces-Request':'partial/ajax'},
                body: _b.toString()
              }).then(r=>r.text()).then(txt=>{
                if (txt.includes('redirect') || txt.includes('error.seam')) { _tryP(i+1); return; }
                const _p = new DOMParser().parseFromString(txt,'text/html');
                const _pan = _p.getElementById('popupTarefas') || _p.querySelector('[id*="Tarefa"]') || _p.body;
                if (_pan && (_pan.textContent||'').trim().length > 20) {
                  _obs_fired = true; _obs.disconnect();
                  _enviarTarefas(_pan);
                } else { _tryP(i+1); }
              }).catch(()=>_tryP(i+1));
            }
            _tryP(0);
            return;
          }

          const _body = new URLSearchParams({ AJAXREQUEST: _fid, 'javax.faces.ViewState': _vs,
            [_cid]: _cid, CURRENT_COMPONENT: _cid, CURRENT_FORM: _fid });
          fetch(window.location.href.split('?')[0], {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/x-www-form-urlencoded','Faces-Request':'partial/ajax'},
            body: _body.toString()
          }).then(r=>r.text()).then(txt=>{
            _obs.disconnect();
            if (txt.includes('redirect') || txt.includes('error.seam')) return;
            const _p = new DOMParser().parseFromString(txt,'text/html');
            const _pan = _p.getElementById('popupTarefas') || _p.querySelector('[id*="Tarefa"]') || _p.body;
            if (_pan && (_pan.textContent||'').trim().length > 20) { _enviarTarefas(_pan); }
          }).catch(()=>{ _obs.disconnect(); });
        }, 3000);

        // Timeout de segurança: desiste após 12s
        setTimeout(() => { if (!_obs_fired) _obs.disconnect(); }, 12000);
        return;
      }

      // Fallback: RichFaces disponível
      try {
        if (typeof RichFaces !== 'undefined' && RichFaces.showModalPanel) {
          clearInterval(pollTarefas);
          RichFaces.showModalPanel('popupTarefas');
          return;
        }
      } catch(e) {}

      if (tentativas === 10) console.log('[PJE #tarefas] ainda aguardando botão após 5s...');
      if (tentativas >= 60) { console.log('[PJE #tarefas] TIMEOUT sem encontrar botão'); clearInterval(pollTarefas); }
    }, 500);
  }
})();

// ── Botão de Tarefas no painel Angular (lista de processos) ──────────────────
// Quando um processo é aberto no painel direito do Angular SPA,
// injeta botão "📋 Tarefas" na toolbar que abre a consulta do processo
// em popup e auto-dispara o popup de tarefas.
// ────────────────────────────────────────────────────────────────────────────

// Botão 📋 Tarefas no painel Angular — acesso direto entre frames (same-origin)
// Roda na página TOP-LEVEL (que tem iframe#ngFrame como filho).
// Acessa ngFrame → frame-tarefa diretamente pelo DOM (mesma origem).



function pjeBloquearBotaoTarefasPorEditorOuMovimentar() {
  try {
    const href = window.location.href || '';
    if (href.includes('/Processo/movimentar.seam') || href.includes('movimentar.seam')) return true;

    for (const f of document.querySelectorAll('iframe')) {
      const src = f.src || f.getAttribute('src') || '';
      if (src.includes('/Processo/movimentar.seam') || src.includes('movimentar.seam')) return true;
      try {
        const doc = f.contentDocument;
        if (doc && doc.body) {
          const txt = (doc.body.innerText || doc.body.textContent || '').slice(0, 12000).toLowerCase();
          if (doc.querySelector('.cke, iframe.cke_wysiwyg_frame, [contenteditable="true"], textarea[id*="editor"], textarea[name*="editor"], [id*="minuta"], [name*="minuta"]')) return true;
          if (txt.includes('minuta') || txt.includes('documento não foi salvo') || txt.includes('há informações não salvas no documento') || txt.includes('descartar alterações')) return true;
        }
      } catch(e) {}
    }
  } catch(e) {}
  return false;
}
function pjeRemoverBotaoTarefasInjetado() {
  document.getElementById('pje-btn-tarefas-ng')?.remove();
  document.getElementById('pje-btn-tarefas')?.remove();
}

function injetarBotaoTarefasAngular() {
  if (typeof pjeBloquearBotaoTarefasPorEditorOuMovimentar === 'function' && pjeBloquearBotaoTarefasPorEditorOuMovimentar()) {
    if (typeof pjeRemoverBotaoTarefasInjetado === 'function') pjeRemoverBotaoTarefasInjetado();
    return;
  }
  // Roda no Angular SPA dentro do ngFrame (frontend.prd.cnj.cloud)
  // A página ng2 (top) não tem acesso ao frame-tarefa pois é cross-origin
  const href = window.location.href;
  if (!href.includes('cnj.cloud') && !href.includes('painel-usuario-interno')) return;

  // Busca frame-tarefa em todos os iframes da página (inclui shadow DOM alternativo)
  let frameTarefa =
    document.querySelector('iframe#frame-tarefa') ||
    document.querySelector('iframe[name="frame-tarefa"]') ||
    document.querySelector('pje-frames iframe') ||
    document.querySelector('[id*="frame-tarefa"]');

  // Busca mais agressiva: percorre todos iframes buscando pelo name/id
  if (!frameTarefa) {
    for (const f of document.querySelectorAll('iframe')) {
      if ((f.id || '').includes('frame-tarefa') || (f.name || '').includes('frame-tarefa') ||
          (f.src || '').includes('movimentar.seam')) {
        frameTarefa = f; break;
      }
    }
  }

  if (!frameTarefa) {
    const old = document.getElementById('pje-btn-tarefas-ng');
    if (old) old.remove();
    return;
  }

  if (document.getElementById('pje-btn-tarefas-ng')) return;

  // Segurança absoluta: em frame de movimentação/minuta/documento, não injeta Tarefas.
  try {
    const srcFrameTarefa = frameTarefa.src || frameTarefa.getAttribute('src') || '';
    if (srcFrameTarefa.includes('/Processo/movimentar.seam') || srcFrameTarefa.includes('movimentar.seam')) {
      if (typeof pjeRemoverBotaoTarefasInjetado === 'function') pjeRemoverBotaoTarefasInjetado();
      return;
    }
  } catch(e) {}

  // Extrai número do processo
  let urlConsulta = null;

  // 0. MELHOR FONTE: link de Autos Digitais que o próprio Angular já tem no DOM
  //    (pje-link-autos-digitais ou qualquer <a> apontando para listAutoDigitais)
  for (const a of document.querySelectorAll(
    'pje-link-autos-digitais a, a[href*="listAutoDigitais"], a[href*="autos"]'
  )) {
    if (a.href && a.href.includes('listAutoDigitais')) {
      urlConsulta = a.href.split('#')[0]; // remove hash anterior se houver
      break;
    }
  }

  // 1. Fallback: extrai idProcesso do src do iframe e constrói URL
  const src = frameTarefa.src || frameTarefa.getAttribute('src') || '';
  console.log('[PJE Tarefas] iframe src:', src);
  if (!urlConsulta) {
    const mSrc = src.match(/[?&]idProcesso[=](\d+)/i) ||
                 src.match(/[?&]processo[=:](\d+)/i);
    if (mSrc) {
      // Base path extraído do src do frame-tarefa (evita hardcodar /pje1grau/ vs /pjelgrau/)
      const baseMatch = src.match(/https?:\/\/[^/]+(\/[^/]+)/);
      const basePath = baseMatch ? baseMatch[1] : '/pje1grau';
      urlConsulta = `https://pje.tjce.jus.br${basePath}/Processo/ConsultaProcessetalhe/listAutoDigitais.seam?processo.codigo=${mSrc[1]}`;
    }
  }
  console.log('[PJE Tarefas] urlConsulta:', urlConsulta);

  // 2. Do conteúdo interno do iframe (same-origin)
  if (!urlConsulta) {
    try {
      const txt = frameTarefa.contentDocument && frameTarefa.contentDocument.body
        ? (frameTarefa.contentDocument.body.innerText || '')
        : '';
      const m = txt.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
      if (m) urlConsulta = `https://pje.tjce.jus.br/pje1grau/Processo/ConsultaProcessetalhe/listAutoDigitais.seam?processo.numero=${m[0]}`;
    } catch(e) {}
  }

  // 3. Do header do Angular (título do processo aberto no painel direito)
  if (!urlConsulta) {
    for (const el of document.querySelectorAll(
      'span[class*="tarefa-numero"], span[class*="numero-processo"], ' +
      '[class*="header-processo"] span, [class*="cabecalho"] span, ' +
      'a[class*="selecionarProcesso"] span, .pmr-destaque-selecionado'
    )) {
      const m = (el.textContent || '').match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
      if (m) { urlConsulta = `https://pje.tjce.jus.br/pje1grau/Processo/ConsultaProcessetalhe/listAutoDigitais.seam?processo.numero=${m[0]}`; break; }
    }
  }

  // 4. Último recurso: qualquer número de processo visível no DOM
  if (!urlConsulta) {
    const m = document.body.innerText.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
    if (m) urlConsulta = `https://pje.tjce.jus.br/pje1grau/Processo/ConsultaProcessetalhe/listAutoDigitais.seam?processo.numero=${m[0]}`;
  }

  if (!urlConsulta) { console.log('[PJE Tarefas] iframe encontrado mas número do processo não detectado. src:', src); return; }
  console.log('[PJE Tarefas] injetando botão Tarefas. URL:', urlConsulta);

  // Injeta botão flutuante na página top-level
  if (!document.getElementById('pje-tarefas-ng-style')) {
    const s = document.createElement('style');
    s.id = 'pje-tarefas-ng-style';
    s.textContent = `
      #pje-btn-tarefas-ng {
        position: fixed; top: 120px; right: 18px; z-index: 99990;
        background: #1d4ed8; color: #fff; border: none; border-radius: 6px;
        padding: 6px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
        box-shadow: 0 3px 10px rgba(0,0,0,.25);
        display: flex; align-items: center; gap: 6px;
        transition: background .15s; white-space: nowrap;
      }
      #pje-btn-tarefas-ng:hover { background: #1e40af; }
    `;
    document.head.appendChild(s);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'pje-btn-tarefas-ng';
  btn.innerHTML = '📋 Tarefas';
  btn.title = 'Ver tarefas pendentes do processo';
  btn.dataset.url = urlConsulta;
  btn.onclick = () => {
    const url = btn.dataset.url;
    if (!url) return;
    const frameTarefa2 =
      document.querySelector('iframe#frame-tarefa') ||
      document.querySelector('iframe[name="frame-tarefa"]') ||
      document.querySelector('pje-frames iframe');
    if (!frameTarefa2) return;
    // Seta flags para controle do overlay invisível (sem loading modal para não bloquear UI)
    window._pjeAutoTarefas = true;
    window._pjeOverlayCreated = false;
    // Safety: remove overlay oculto após 15s mesmo se tarefas não chegarem
    clearTimeout(window._pjeOverlayTimeout);
    window._pjeOverlayTimeout = setTimeout(function() {
      var _ov = document.getElementById('pje-autos-overlay');
      if (_ov && _ov.dataset.autoTarefas) {
        console.log('[PJE overlay] removendo overlay oculto por timeout');
        _ov.remove();
      }
      window._pjeAutoTarefas = false;
      window._pjeOverlayCreated = false;
    }, 15000);

    // Lê o href do link Angular EM TEMPO REAL (pode ter token `ca=` gerado após setup)
    var _linkAutos = document.querySelector('pje-link-autos-digitais a') ||
                     document.querySelector('a[href*="listAuto"]');
    var _urlAtual = _linkAutos ? (_linkAutos.href || _linkAutos.getAttribute('href') || '') : '';

    // Tenta acionar Angular via .click() (mais confiável que dispatchEvent)
    if (_linkAutos) {
      try { _linkAutos.click(); } catch(e) {}
      // Aguarda 300ms para ver se Angular chamou window.open
      // Se não chamou, usa window.open direto (Feature 3 interceptará)
      setTimeout(function() {
        // Só cria overlay se não foi criado ainda (evita criar segundo overlay
        // após o oculto ter sido removido pela captura das tarefas)
        if (!window._pjeOverlayCreated && !document.getElementById('pje-autos-overlay')) {
          var _urlFinal = _urlAtual || url;
          if (typeof criarOverlayAutos === 'function') {
            criarOverlayAutos(_urlFinal.split('#')[0]);
          } else {
            window.open(_urlFinal.split('#')[0], '_blank');
          }
        }
        window._pjeOverlayCreated = false; // reset para próxima vez
      }, 1200);
    } else {
      // Sem link Angular → abre diretamente
      if (typeof criarOverlayAutos === 'function') {
        criarOverlayAutos(url.split('#')[0]);
      } else {
        window.open(url.split('#')[0], '_blank');
      }
    }
  };
  document.body.appendChild(btn);
}


// ============================================================
// --- FEATURE 5: Automação Sequencial ---
// ============================================================
// ARQUITETURA: all_frames=true → content script roda no frame
// principal (Angular) E no iframe (frame-tarefa / JSF).
// Comunicação via postMessage.
// ============================================================

// ── HANDLER DO IFRAME (frame-tarefa / movimentar.seam) ──────
// Este bloco só executa quando o script está rodando DENTRO do iframe JSF
if (window.location.href.includes('movimentar.seam') || window.name === 'frame-tarefa') {
  window.addEventListener('message', function(e) {
    if (!e.data) return;

    // ── Handler: buscar dados de tarefas via fetch (pedido do ngFrame) ──
    if (e.data.pjeGetTarefas) {
      var _orig3 = e.source || window.parent;
      var _url3  = e.data.url || '';
      var _mC3   = _url3.match(/processo\.codigo=(\d+)/i);
      var _cod3  = _mC3 ? _mC3[1] : null;
      var _b3    = window.location.origin + window.location.pathname.split('/').slice(0,2).join('/');
      var _urlGet3 = _cod3
        ? _b3 + '/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?processo.codigo=' + _cod3
        : _url3;
      console.log('[PJE Tarefas] GET autos:', _urlGet3);

      if (!_urlGet3) {
        _orig3.postMessage({ pjeTarefasData: true, html: '<p style="color:red">URL nao encontrada.</p>', processo: '' }, '*');
        return;
      }

      // PASSO 1: GET para obter ViewState e IDs do form principal
      fetch(_urlGet3, { credentials: 'include' })
        .then(function(r1) {
          if (!r1.ok) throw new Error('GET ' + r1.status);
          return r1.text();
        })
        .then(function(html1) {
          var _p1  = new DOMParser();
          var _d1  = _p1.parseFromString(html1, 'text/html');
          var _vs  = (_d1.querySelector('[name="javax.faces.ViewState"]') || {}).value;
          var _ttl = (_d1.querySelector('title') || {}).textContent || '';
          var _ids = Array.from(_d1.querySelectorAll('[id]')).map(function(e){ return e.id; }).filter(Boolean);

          console.log('[PJE Tarefas] ViewState=' + (_vs||'').substring(0,20) + ' ids=' + _ids.slice(0,10).join(','));

          if (!_vs) {
            _orig3.postMessage({ pjeTarefasData: true,
              html: '<p style="color:red">ViewState nao encontrado. IDs: ' + _ids.slice(0,15).join(', ') + '</p>',
              processo: _ttl }, '*');
            return;
          }

          // Coleta candidatos ao botão Tarefas:
          // 1. elementos do form j_id27 com onclick (excluindo papeisUsuarioForm)
          // 2. qualquer input/a com onclick que NÃO seja de papeisUsuarioForm
          var _candidates = [];
          _d1.querySelectorAll('[id]').forEach(function(el) {
            if (!el.id || el.id.indexOf('papeisUsuario') !== -1) return;
            var _oc = el.getAttribute('onclick') || '';
            if (_oc && _oc.indexOf('A4J') !== -1) {
              // extrai compId do A4J.AJAX.Submit call
              var _mComp = _oc.match(/['"](j_id\d+(?::\w+)*)['"]/);
              if (_mComp) _candidates.push(_mComp[1]);
              _candidates.push(el.id);
            }
          });

          // Fallback: tenta componentes do form j_id27 em sequência
          var _formId = 'j_id27';
          ['j_id28','j_id29','j_id30','j_id31','j_id32','j_id33','j_id34','j_id35'].forEach(function(s) {
            var cid = _formId + ':' + s;
            if (_ids.indexOf(cid) !== -1 && _candidates.indexOf(cid) === -1) _candidates.push(cid);
          });

          // Adiciona IDs que tenham "tarefa" ou "Tarefa" no nome
          _ids.forEach(function(id) {
            if (/tarefa/i.test(id) && _candidates.indexOf(id) === -1) _candidates.push(id);
          });

          console.log('[PJE Tarefas] candidatos: ' + _candidates.join(', '));

          // PASSO 2: Tenta POSTar com cada candidato até obter resposta válida
          var _postUrl = _b3 + '/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam';

          function _tryPost(i) {
            if (i >= _candidates.length) {
              _orig3.postMessage({ pjeTarefasData: true,
                html: '<p style="color:orange">Nenhum componente retornou tarefas (' + _candidates.length + ' tentativas).</p>',
                processo: _ttl }, '*');
              return;
            }
            var _cid = _candidates[i];
            var _body = new URLSearchParams();
            _body.append('AJAXREQUEST', _formId);
            _body.append('javax.faces.ViewState', _vs);
            _body.append(_cid, _cid);
            _body.append('CURRENT_COMPONENT', _cid);
            _body.append('CURRENT_FORM', _formId);

            console.log('[PJE Tarefas] POST[' + i + '] comp=' + _cid);
            fetch(_postUrl, {
              method: 'POST', credentials: 'include',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                         'Faces-Request': 'partial/ajax' },
              body: _body.toString()
            })
            .then(function(r2) {
              return r2.text().then(function(txt) {
                console.log('[PJE Tarefas] POST[' + i + '] status=' + r2.status + ' resp120=' + txt.substring(0,120));
                // Verifica se o redirect para error indica componente errado
                if (txt.indexOf('content="redirect"') !== -1 || txt.indexOf('error.seam') !== -1) {
                  _tryPost(i + 1);
                  return;
                }
                // Se contém HTML de tarefas
                var _p2  = new DOMParser();
                var _d2  = _p2.parseFromString(txt, 'text/html');
                var _pan = _d2.getElementById('popupTarefas') ||
                           _d2.querySelector('[id*="Tarefa"]') ||
                           _d2.querySelector('[class*="modal"]') ||
                           _d2.body;
                var _htm = (_pan ? _pan.innerHTML : txt).substring(0, 20000);
                _orig3.postMessage({ pjeTarefasData: true,
                  html: '<div style="font-size:13px">' + _htm + '</div>',
                  processo: _ttl }, '*');
              });
            })
            .catch(function() { _tryPost(i + 1); });
          }

          _tryPost(0);
        })
        .catch(function(err) {
          _orig3.postMessage({ pjeTarefasData: true,
            html: '<p style="color:red">Erro: ' + err.message + '</p>',
            processo: '' }, '*');
        });

      return; // não cai no handler do sequencial
    }

    // ── Handler: automação sequencial ──
    if (e.data.pjeSeq !== true) return;

    const tipo  = e.data.tipo;
    const texto = (e.data.texto || '').trim().toLowerCase();
    const source = e.source || window.parent;

    if (tipo === 'FIND_CLICK') {
      let found = null;

      // 1) Checkbox de atividade (.propertyView) — ex: "Citar/Intimar"
      for (const pv of document.querySelectorAll('.propertyView')) {
        const label = pv.querySelector('.name label, label');
        if (!label) continue;
        if (!label.textContent.trim().toLowerCase().includes(texto)) continue;
        const cb = pv.querySelector('input[type="checkbox"]');
        if (cb) { found = cb; break; }
      }

      // 2) Botões e links normais
      if (!found) {
        for (const el of document.querySelectorAll('button, input[type="submit"], a')) {
          const t = (el.textContent || el.value || el.title || '').trim().toLowerCase();
          if (t.includes(texto)) { found = el; break; }
        }
      }

      if (found) {
        const isCheckbox = found.type === 'checkbox';
        const labelText  = found.textContent || found.value || e.data.texto;
        found.click();
        source.postMessage({ pjeSeq: true, tipo: 'RESULT', success: true, isCheckbox, label: labelText.trim().substring(0,50) }, '*');
      } else {
        source.postMessage({ pjeSeq: true, tipo: 'RESULT', success: false, label: e.data.texto }, '*');
      }

    } else if (tipo === 'FIND_SALVAR') {
      const termos = ['salvar', 'confirmar', 'encaminhar', 'registrar', 'gravar', 'ok', 'enviar'];
      let found = null;
      for (const el of document.querySelectorAll('button, input[type="submit"], a[role="button"]')) {
        const t = (el.textContent || el.value || el.title || '').trim().toLowerCase();
        if (termos.some(term => t.includes(term))) { found = el; break; }
      }
      if (found) {
        found.click();
        source.postMessage({ pjeSeq: true, tipo: 'RESULT_SALVAR', success: true, label: (found.textContent || found.value || '').trim() }, '*');
      } else {
        source.postMessage({ pjeSeq: true, tipo: 'RESULT_SALVAR', success: false }, '*');
      }


    } else if (tipo === 'REDISTRIBUIR') {
      const _jur = e.data.jurisdicao    || 'Núcleo de Justiça 4.0';
      const _org = e.data.orgaoJulgador || 'Núcleo de Justiça 4.0 - Juizados Especiais Adjuntos';
      (async () => {
        const _esp = ms => new Promise(r => setTimeout(r, ms));

        // Seleciona opção no Select2: abre, digita char a char e pressiona Enter
        async function _select2(containerSel, texto) {
          const container = document.querySelector(containerSel);
          if (!container) return { ok:false, msg:'Select2 não encontrado: ' + containerSel };

          const selBtn = container.closest('.select2-selection') || container.parentElement;
          const baseId = container.id.replace('select2-','').replace('-container','');
          const underlying = baseId ? document.getElementById(baseId) : null;

          // Abre o dropdown
          if (underlying && typeof jQuery !== 'undefined') {
            try { jQuery(underlying).select2('open'); } catch(e) {}
          }
          selBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, cancelable:true, view:window }));
          await _esp(150);
          selBtn.click();
          await _esp(500);

          const inp = document.querySelector('.select2-search__field');
          if (!inp) return { ok:false, msg:'Campo de busca do Select2 não apareceu' };
          inp.focus();

          // Digita char a char simulando teclado real (keydown + input + keyup)
          // Para quando restar apenas 1 resultado e pressiona Enter
          function _tecla(ch) {
            inp.dispatchEvent(new KeyboardEvent('keydown',  { key:ch, bubbles:true, cancelable:true }));
            inp.value += ch;
            inp.dispatchEvent(new Event('input', { bubbles:true }));
            inp.dispatchEvent(new KeyboardEvent('keyup',   { key:ch, bubbles:true }));
          }
          // Clica diretamente na opção — evita Enter que pode borbulhar para o form
          function _clicarOpcao(opt) {
            opt.dispatchEvent(new MouseEvent('mouseenter', { bubbles:true }));
            opt.dispatchEvent(new MouseEvent('mouseover',  { bubbles:true }));
            opt.dispatchEvent(new MouseEvent('mousedown',  { bubbles:true, cancelable:true, view:window }));
            opt.dispatchEvent(new MouseEvent('mouseup',    { bubbles:true, cancelable:true, view:window }));
            opt.click();
          }
          function _temOpts() {
            return [...document.querySelectorAll('.select2-results__option:not(.select2-results__option--disabled,.loading-results)')];
          }

          for (const ch of texto) {
            _tecla(ch);
            await _esp(150);
            const opts = _temOpts();
            // Assim que restar 1 opção visível → clica nela diretamente
            if (opts.length === 1) {
              await _esp(150);
              _clicarOpcao(opts[0]);
              await _esp(500);
              const rend = document.querySelector(containerSel);
              if (rend && rend.title && rend.title !== 'Selecione')
                return { ok:true, label: rend.title.substring(0,60) };
              return { ok:true, label: opts[0].textContent.trim().substring(0,60) };
            }
          }

          // Se ainda não selecionou, tenta clicar na opção que contém o texto
          await _esp(400);
          const optsFinais = _temOpts();
          if (optsFinais.length > 0) {
            const alvo = optsFinais.find(o =>
              o.textContent.trim().toLowerCase().includes(texto.toLowerCase())
            ) || optsFinais[0];
            _clicarOpcao(alvo);
            await _esp(500);
            const rend = document.querySelector(containerSel);
            if (rend && rend.title && rend.title !== 'Selecione')
              return { ok:true, label: rend.title.substring(0,60) };
            return { ok:true, label: alvo.textContent.trim().substring(0,60) };
          }

          document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
          return { ok:false, msg:'Nenhuma opção encontrada para: ' + texto };
        }

        // Aguarda elemento ficar visível no DOM
        async function _aguardarEl(sel, ms) {
          const fim = Date.now() + (ms || 8000);
          while (Date.now() < fim) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) return el;
            await _esp(300);
          }
          return null;
        }

        const _err = msg => source.postMessage({ pjeSeq:true, tipo:'RESULT_REDISTRIBUIR', success:false, msg }, '*');

        try {
          // PASSO 1: Motivo → "Criação de unidade judiciária"
          const r1 = await _select2('[id*="tipoRedistribuicao-container"]', 'Criação de unidade judiciária');
          if (!r1.ok) { _err('Motivo: ' + r1.msg); return; }
          await _esp(1000);

          // PASSO 2: Radio "Competência Exclusiva" (CE) → dispara AJAX A4J
          const radio = await _aguardarEl('input[type="radio"][value="CE"][id*="radioEnumTipoDistribuicaoCriacaoUnidadeJudiciaria"]', 5000);
          if (!radio) { _err('Radio Competência Exclusiva não encontrado após selecionar motivo'); return; }
          radio.click();
          await _esp(2500); // aguarda AJAX A4J recarregar seção de jurisdição

          // PASSO 3: Jurisdição
          const elJuris = await _aguardarEl('[id*="jurisdicaoComboCompetenciaExclusiva-container"]', 8000);
          if (!elJuris) { _err('Select Jurisdição não apareceu após AJAX'); return; }
          const r3 = await _select2('[id*="jurisdicaoComboCompetenciaExclusiva-container"]', _jur);
          if (!r3.ok) { _err('Jurisdição: ' + r3.msg); return; }
          await _esp(1200); // aguarda AJAX carregar órgãos julgadores

          // PASSO 4: Órgão Julgador
          const elOrgao = await _aguardarEl('[id*="orgaoJulgadorComboCompetenciaExclusiva-container"]', 8000);
          if (!elOrgao) { _err('Select Órgão Julgador não apareceu após selecionar Jurisdição'); return; }
          const r4 = await _select2('[id*="orgaoJulgadorComboCompetenciaExclusiva-container"]', _org);
          if (!r4.ok) { _err('Órgão Julgador: ' + r4.msg); return; }
          await _esp(600);

          // PASSO 5: Clica botão Redistribuir
          const btnRedis = await _aguardarEl('[id*="btnGravarRedistribuicao"]', 5000);
          if (!btnRedis) { _err('Botão Redistribuir não encontrado'); return; }

          // Clica e envia postMessage de forma síncrona e imediata:
          // o A4J (async) só dispara depois — o click e o postMessage já foram
          btnRedis.click();
          source.postMessage({ pjeSeq:true, tipo:'RESULT_REDISTRIBUIR', success:true,
            msg: (r3.label || _jur) + ' → ' + (r4.label || _org) }, '*');
        } catch(err) {
          _err(err.message);
        }
      })();


    } else if (tipo === 'EXPEDIR') {
      // --- FEATURE: Expedição de Documentos (Sistema e Correios) ---
      (async () => {
        const _esp = ms => new Promise(r => setTimeout(r, ms));
        const _err = msg => source.postMessage({ pjeSeq: true, tipo: 'RESULT_EXPEDIR', success: false, msg }, '*');

        async function _aguEl(sel, ms) {
          const fim = Date.now() + (ms || 8000);
          while (Date.now() < fim) {
            const el = document.querySelector(sel);
            if (el) return el;
            await _esp(300);
          }
          return null;
        }

        async function _sel2(containerSel, texto) {
          const container = document.querySelector(containerSel);
          if (!container) return { ok: false, msg: 'Select2 não encontrado: ' + containerSel };
          const selBtn = container.closest('.select2-selection') || container.parentElement;
          const baseId = container.id.replace('select2-', '').replace('-container', '');
          const underlying = baseId ? document.getElementById(baseId) : null;
          if (underlying && typeof jQuery !== 'undefined') {
            try { jQuery(underlying).select2('open'); } catch(e) {}
          } else {
            selBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            await _esp(150);
            selBtn.click();
          }
          await _esp(500);
          const inp = document.querySelector('.select2-search__field');
          if (!inp) return { ok: false, msg: 'Campo de busca do Select2 não apareceu' };
          inp.focus();
          function _t(ch) {
            inp.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
            inp.value += ch;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true, cancelable: true }));
          }
          function _opts() {
            return [...document.querySelectorAll('.select2-results__option:not(.select2-results__option--disabled):not(.loading-results)')];
          }
          function _clica(opt) {
            opt.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            opt.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true, view: window }));
            opt.click();
          }
          for (const ch of texto) {
            _t(ch); await _esp(150);
            const opts = _opts();
            if (opts.length === 1) { await _esp(150); _clica(opts[0]); await _esp(500); break; }
          }
          await _esp(400);
          const optsF = _opts();
          if (optsF.length > 0) {
            const alvo = optsF.find(o => o.textContent.trim().toLowerCase().includes(texto.toLowerCase())) || optsF[0];
            _clica(alvo); await _esp(500);
          }
          const rend = document.querySelector(containerSel);
          const lbl = rend && rend.title && rend.title !== 'Selecione' ? rend.title : texto;
          return { ok: true, label: lbl.substring(0, 60) };
        }

        try {
          const _polo    = e.data.polo    || 'ativo';
          const _meio    = e.data.meio    || 'Sistema';
          const _tipoAto = e.data.tipoAto || 'Intima\u00e7\u00e3o';
          const _prazo   = e.data.prazo   || 15;
          const _modelo  = e.data.modelo  || '';

          // ── PASSO 1: Clicar no polo ────────────────────────────────────────
          // Ativo:  partesTree:j__id126:0::j_id128
          // Passivo: partesTree:j__id126:1::j_id131
          const poloSel = _polo === 'passivo'
            ? '[id*="j__id126:1::j_id131"]'
            : '[id*="j__id126:0::j_id128"]';
          const poloEl = await _aguEl(poloSel, 7000);
          if (!poloEl) { _err('Polo ' + _polo + ' não encontrado (' + poloSel + ')'); return; }
          poloEl.click();
          await _esp(600);

          // ── PASSO 2: Tipo de ato ───────────────────────────────────────────
          const tipoContainer = await _aguEl('[id*="tipoAtoCombo-container"]', 7000);
          if (!tipoContainer) { _err('Campo tipoAtoCombo não encontrado'); return; }
          const r2 = await _sel2('[id*="tipoAtoCombo-container"]', _tipoAto);
          if (!r2.ok) { _err('tipoAtoCombo: ' + r2.msg); return; }
          await _esp(800);

          // ── PASSO 2a: Meio de comunicação ─────────────────────────────────
          const meioContainer = await _aguEl('[id*="meioCom-container"]', 6000);
          if (meioContainer) {
            const rM = await _sel2('[id*="meioCom-container"]', _meio);
            if (!rM.ok) { _err('meioCom: ' + rM.msg); return; }
            await _esp(600);
          }

          // ── PASSO 2b: Prazo ───────────────────────────────────────────────
          const prazoEl = await _aguEl('[id*="quantidadePrazoAto"]', 5000);
          if (prazoEl) {
            prazoEl.focus(); prazoEl.select && prazoEl.select();
            prazoEl.value = String(_prazo);
            prazoEl.dispatchEvent(new Event('input',  { bubbles: true }));
            prazoEl.dispatchEvent(new Event('change', { bubbles: true }));
            prazoEl.dispatchEvent(new Event('blur',   { bubbles: true }));
            await _esp(400);
          }

          // ── PASSO 3: Próximo (1º) ─────────────────────────────────────────
          const btnProx1 = await _aguEl('[id*="prepararExpediente"][id$="j_id250"]', 7000);
          if (!btnProx1) { _err('Botão Próximo (1) não encontrado (j_id250)'); return; }
          btnProx1.click();
          await _esp(1800);

          // ══════════════════════════════════════════════════════════════════
          // BIFURCAÇÃO: CORREIOS vs SISTEMA
          // ══════════════════════════════════════════════════════════════════
          if (_meio === 'Correios' || _meio === 'Central de Mandados') {

            // ── PASSO 3b: Próximo (2º) — extra para Correios ───────────────
            // ID: ...prepararExpediente-{taskId}:j_id469
            const btnProx1b = await _aguEl('[id*="prepararExpediente"][id$="j_id469"]', 7000);
            if (!btnProx1b) { _err('Botão Próximo (2) Correios não encontrado (j_id469)'); return; }
            btnProx1b.click();
            await _esp(1800);

            // ── PASSO 4: Lápis ────────────────────────────────────────────
            const lapisWrap = await _aguEl('[id*="tabelaDestinatarios:0:j_id473"]', 7000);
            if (!lapisWrap) { _err('Botão lápis não encontrado'); return; }
            (lapisWrap.querySelector('i') || lapisWrap).click();
            await _esp(1500);

            // ── PASSO 5: Radio "Modelo" (selectInstrumentoRadio:1) ─────────
            const radioMod = await _aguEl('[id*="selectInstrumentoRadio:1"]', 7000);
            if (!radioMod) { _err('Radio Modelo não encontrado (selectInstrumentoRadio:1)'); return; }
            radioMod.click();
            await _esp(1200);

            // ── PASSO 5b: Selecionar modelo no Select2 ────────────────────
            // ID varia por sessão: j_id557-n1, j_id557-n3, etc.
            if (!_modelo) { _err('Nome do modelo não informado (campo Modelo vazio)'); return; }
            const modeloContainer = await _aguEl('[id*="j_id557"][id*="-container"]', 7000);
            if (!modeloContainer) { _err('Select2 de modelo não encontrado (j_id557-*-container)'); return; }

            // Abre o Select2 — tenta jQuery primeiro, depois clique manual
            const _containerSel = '[id*="j_id557"][id*="-container"]';
            const _baseId = modeloContainer.id.replace('select2-','').replace(/-[a-z0-9]+-container$/,'');
            const _underlying = _baseId ? document.getElementById(_baseId) : null;
            if (_underlying && typeof jQuery !== 'undefined') {
              try { jQuery(_underlying).select2('open'); } catch(e) {}
            } else {
              const _selBtn = modeloContainer.closest('.select2-selection') || modeloContainer.parentElement;
              _selBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
              await _esp(200);
              _selBtn.click();
            }
            await _esp(700);

            // Digita no campo de busca
            const _modInp = document.querySelector('.select2-search__field');
            if (!_modInp) { _err('Campo de busca do modelo não apareceu'); return; }
            _modInp.value = '';
            _modInp.focus();
            for (const ch of _modelo) {
              _modInp.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
              _modInp.value += ch;
              _modInp.dispatchEvent(new Event('input', { bubbles: true }));
              _modInp.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true, cancelable: true }));
              await _esp(150);
            }
            await _esp(800); // aguarda resultados carregarem

            // Clica na opção correspondente
            const _modOpts = [...document.querySelectorAll('.select2-results__option:not(.select2-results__option--disabled):not(.loading-results)')];
            if (!_modOpts.length) { _err('Nenhuma opção de modelo encontrada para: ' + _modelo); return; }
            const _modAlvo = _modOpts.find(o => o.textContent.trim().toLowerCase().includes(_modelo.toLowerCase())) || _modOpts[0];
            const _modLabel = _modAlvo.textContent.trim();

            // Sequência completa de eventos para garantir que Select2 registre a seleção
            _modAlvo.dispatchEvent(new MouseEvent('mouseover',  { bubbles: true }));
            _modAlvo.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            _modAlvo.dispatchEvent(new MouseEvent('mousedown',  { bubbles: true, cancelable: true, view: window }));
            _modAlvo.dispatchEvent(new MouseEvent('mouseup',    { bubbles: true, cancelable: true, view: window }));
            _modAlvo.click();
            await _esp(400);

            // Confirma seleção via jQuery se disponível (força commit no Select2/JSF)
            if (_underlying && typeof jQuery !== 'undefined') {
              try { jQuery(_underlying).trigger('change'); } catch(e) {}
            }
            await _esp(400);

            // Verifica se o texto foi preenchido no container
            const _rendContainer = document.querySelector(_containerSel);
            const _rendLabel = _rendContainer && _rendContainer.title && _rendContainer.title !== 'Selecione'
              ? _rendContainer.title : _modLabel;

            const rMod = { label: _rendLabel.substring(0, 60) };
            // Aguarda o sistema carregar o modelo selecionado
            // Estratégia: espera o botão Próximo (j_id585) ficar disponível
            await _esp(1000); // pausa inicial
            await _aguEl('[id*="prepararExpediente"][id$="j_id585"]', 10000);
            await _esp(1000); // pausa extra após carregamento

            // ── PASSO 7: Próximo (j_id585) ────────────────────────────────
            const btnProx2c = await _aguEl('[id*="prepararExpediente"][id$="j_id585"]', 7000);
            if (!btnProx2c) { _err('Botão Próximo final não encontrado (j_id585)'); return; }
            btnProx2c.click();
            await _esp(1800);

            // ── 7b+7c: Vincular (só para Central de Mandados) ─────────────
            let mandadosLog = '';
            if (_meio === 'Central de Mandados') {
              const _aguCheck2 = async (ms) => {
                const fim = Date.now() + (ms || 8000);
                while (Date.now() < fim) {
                  const todos = [...document.querySelectorAll('[id*="docTable"][id$=":check"]')]
                    .filter(el => /docTable\d+:\d+:check$/.test(el.id));
                  if (todos.length > 0) return todos;
                  await _esp(300);
                }
                return [];
              };
              const listaCheck2 = await _aguCheck2(8000);
              if (!listaCheck2.length) { _err('Checkbox de documento não encontrado (Central de Mandados)'); return; }
              if (!listaCheck2[0].checked) listaCheck2[0].click();
              await _esp(600);

              const btnVincular2 = await _aguEl('[id*="btnVincular"]', 7000);
              if (!btnVincular2) { _err('Botão Vincular não encontrado (Central de Mandados)'); return; }
              btnVincular2.click();
              await _esp(1200);
              mandadosLog = ` | Check ✓ | Vincular ✓`;
            }

            // ── PASSO 8: Assinar digitalmente mobile (sempre por último) ──
            const btnAss2 = await _aguEl('[id*="btn-assinadormobile"]', 8000);
            if (!btnAss2) { _err('Botão Assinar não encontrado'); return; }
            btnAss2.click();
            await _esp(500);

            source.postMessage({
              pjeSeq: true, tipo: 'RESULT_EXPEDIR', success: true,
              msg: `[${_meio}] Polo ${_polo} \u2713 | ${r2.label} \u2713 | Prazo ${_prazo}d \u2713 | Pr\u00f3ximo\u00d72 \u2713 | L\u00e1pis \u2713 | Modelo "${rMod.label}" \u2713 | Pr\u00f3ximo \u2713 | Assinar \u2713${mandadosLog}`
            }, '*');

          } else {
            // ── SISTEMA ───────────────────────────────────────────────────

            // ── PASSO 4: Lápis ────────────────────────────────────────────
            const lapisWrap = await _aguEl('[id*="tabelaDestinatarios:0:j_id473"]', 7000);
            if (!lapisWrap) { _err('Botão lápis não encontrado'); return; }
            (lapisWrap.querySelector('i') || lapisWrap).click();
            await _esp(1500);

            // ── PASSO 5: Radio "Documento do processo" (:0) ───────────────
            const radioDoc = await _aguEl('[id*="selectInstrumentoRadio:0"]', 7000);
            if (!radioDoc) { _err('Radio Documento do processo não encontrado (:0)'); return; }
            radioDoc.click();
            await _esp(1200);

            // ── PASSO 6: Primeiro documento (mais recente) ────────────────
            const _aguDocs = async (ms) => {
              const fim = Date.now() + (ms || 8000);
              while (Date.now() < fim) {
                const todos = [...document.querySelectorAll('[id*="docExistentesTable"]')]
                  .filter(el => /docExistentesTable:\d+:j_id531/.test(el.id));
                if (todos.length > 0) return todos;
                await _esp(300);
              }
              return [];
            };
            const listaDoc = await _aguDocs(8000);
            if (!listaDoc.length) { _err('Nenhum documento encontrado'); return; }
            listaDoc[0].click();
            await _esp(800);

            // ── PASSO 7: Próximo (2º) ─────────────────────────────────────
            const btnProx2 = await _aguEl('[id*="prepararExpediente"][id$="j_id585"]', 7000);
            if (!btnProx2) { _err('Botão Próximo (2) não encontrado (j_id585)'); return; }
            btnProx2.click();
            await _esp(1800);

            // ── PASSO 7b: Checkbox do documento mais recente ─────────────
            const _aguCheck = async (ms) => {
              const fim = Date.now() + (ms || 8000);
              while (Date.now() < fim) {
                const todos = [...document.querySelectorAll('[id*="docTable"][id$=":check"]')]
                  .filter(el => /docTable\d+:\d+:check$/.test(el.id));
                if (todos.length > 0) return todos;
                await _esp(300);
              }
              return [];
            };
            const listaCheck = await _aguCheck(8000);
            if (!listaCheck.length) { _err('Checkbox de documento não encontrado'); return; }
            if (!listaCheck[0].checked) listaCheck[0].click();
            await _esp(600);

            // ── PASSO 7c: Vincular ────────────────────────────────────────
            const btnVincular = await _aguEl('[id*="btnVincular"]', 7000);
            if (!btnVincular) { _err('Botão Vincular não encontrado'); return; }
            btnVincular.click();
            await _esp(1200);

            // ── PASSO 8: Assinar digitalmente mobile ──────────────────────
            const btnAssinar = await _aguEl('[id*="btn-assinadormobile"]', 8000);
            if (!btnAssinar) { _err('Botão Assinar não encontrado'); return; }
            btnAssinar.click();
            await _esp(500);

            source.postMessage({
              pjeSeq: true, tipo: 'RESULT_EXPEDIR', success: true,
              msg: `[Sistema] Polo ${_polo} \u2713 | ${r2.label} \u2713 | ${_meio} \u2713 | Prazo ${_prazo}d \u2713 | Pr\u00f3ximo \u2713 | L\u00e1pis \u2713 | Doc (${listaDoc.length}) \u2713 | Pr\u00f3ximo \u2713 | Check (${listaCheck.length}) \u2713 | Vincular \u2713 | Assinar \u2713`
            }, '*');
          }

        } catch(err) {
          _err(err.message);
        }
      })();

    } else if (tipo === 'PING') {
      // Verifica se o iframe está carregado com conteúdo útil
      const temConteudo = document.querySelectorAll('.propertyView').length > 0
                       || !!document.querySelector('form[id*="taskInstance"]')
                       || !!document.querySelector('#j_id85_body');
      source.postMessage({ pjeSeq: true, tipo: 'PONG', temConteudo, pvCount: document.querySelectorAll('.propertyView').length }, '*');
    }
  });

  // Notifica o frame pai que o iframe está pronto
  try { window.parent.postMessage({ pjeSeq: true, tipo: 'IFRAME_READY' }, '*'); } catch(e) {}

  // Iframe não precisa executar o resto do código (features 1-4 e botões)
  // Encerra aqui para o contexto do iframe
} else {

// ── FRAME PRINCIPAL (Angular) ────────────────────────────────

let seqSelecao   = [];
let seqModoAtivo = false;
let seqCancelado = false;
let seqClickHandler = null;
let seqRelatorio = [];   // coleta todas as linhas de log para exportação
let seqConfig    = {};   // configuração usada na execução atual

function injetarEstilosSeq() {
  if (document.getElementById('pje-seq-styles')) return;
  const s = document.createElement('style'); s.id = 'pje-seq-styles';
  s.textContent = `
    #pje-seq-btn{background:#7c3aed;color:white;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:13px;font-weight:bold;margin-left:6px;white-space:nowrap;transition:background .15s;}
    #pje-seq-btn:hover{background:#5b21b6;}
    #pje-seq-btn.modo-ativo{background:#dc2626;animation:pje-pulse 1.2s infinite;}
    @keyframes pje-pulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.5)}50%{box-shadow:0 0 0 7px rgba(220,38,38,0)}}
    .pje-card-sel{outline:3px solid #7c3aed!important;outline-offset:-2px!important;background:rgba(124,58,237,.06)!important;}
    #pje-seq-banner{position:fixed;top:0;left:0;right:0;z-index:999997;background:#7c3aed;color:white;padding:10px 20px;text-align:center;font-size:14px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.3);}
    #pje-seq-banner span{cursor:pointer;text-decoration:underline;margin-left:16px;}
    #pje-seq-contador{position:fixed;bottom:22px;right:22px;z-index:999998;background:#16a34a;color:white;border-radius:50px;padding:10px 20px;font-size:14px;font-weight:bold;box-shadow:0 4px 16px rgba(0,0,0,.3);cursor:pointer;display:none;}
    #pje-seq-contador:hover{background:#15803d;}
    #pje-seq-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;display:flex;align-items:center;justify-content:center;}
    #pje-seq-modal{background:white;border-radius:14px;padding:28px 32px;width:480px;max-width:95vw;box-shadow:0 8px 40px rgba(0,0,0,.25);font-family:sans-serif;}
    #pje-seq-modal h2{margin:0 0 14px;font-size:17px;color:#1e1b4b;}
    #pje-seq-lista-sel{max-height:120px;overflow-y:auto;margin:6px 0 12px;font-size:12px;color:#374151;border:1px solid #e5e7eb;border-radius:8px;padding:6px 10px;background:#f9fafb;}
    #pje-seq-modal label{display:block;font-size:13px;color:#555;margin-bottom:4px;margin-top:12px;}
    #pje-seq-modal input,#pje-seq-modal select{width:100%;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;}
    #pje-seq-modal input:focus,#pje-seq-modal select:focus{outline:none;border-color:#7c3aed;}
    .pje-seq-btns{display:flex;gap:10px;margin-top:22px;}
    .pje-seq-btns button{flex:1;padding:10px;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;}
    #pje-seq-iniciar{background:#7c3aed;color:white;}
    #pje-seq-cancelar-modal{background:#f3f4f6;color:#374151;}
    #pje-seq-progress-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999999;display:flex;align-items:center;justify-content:center;}
    #pje-seq-progress-box{background:white;border-radius:14px;padding:28px 32px;width:440px;max-width:95vw;box-shadow:0 8px 40px rgba(0,0,0,.3);font-family:sans-serif;}
    #pje-seq-progress-box h3{margin:0 0 16px;font-size:16px;color:#1e1b4b;}
    #pje-seq-barra-outer{background:#e5e7eb;border-radius:99px;height:10px;margin:10px 0 16px;}
    #pje-seq-barra-inner{background:#7c3aed;height:10px;border-radius:99px;transition:width .3s;width:0%;}
    #pje-seq-status{font-size:13px;color:#555;min-height:36px;}
    #pje-seq-log{max-height:150px;overflow-y:auto;margin-top:12px;font-size:12px;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;transition:max-height .4s ease;}
    .pje-seq-log-ok{color:#15803d;}.pje-seq-log-err{color:#dc2626;}.pje-seq-log-info{color:#555;}
    #pje-seq-parar{margin-top:16px;width:100%;padding:9px;border:none;border-radius:8px;background:#fef2f2;color:#dc2626;font-weight:600;cursor:pointer;font-size:13px;}
    #pje-seq-tabs{display:flex;gap:0;margin:8px 0 4px;border-bottom:2px solid #e5e7eb;}
    .pje-seq-tab{flex:1;padding:7px 10px;border:none;border-radius:6px 6px 0 0;background:#f3f4f6;color:#555;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;}
    .pje-seq-tab:hover{background:#e5e7eb;}
    .pje-seq-tab.pje-seq-tab-ativo{background:#7c3aed;color:white;}
  `;
  document.head.appendChild(s);
}

// ── postMessage helpers ──────────────────────────────────────

function getIframeWindow() {
  const fr = document.querySelector('iframe#frame-tarefa, iframe[name="frame-tarefa"]');
  return fr ? (fr.contentWindow || window.frames['frame-tarefa']) : null;
}

function enviarParaIframe(msg, timeoutMs) {
  return new Promise((resolve) => {
    const tipo_resp = msg.tipo === 'FIND_CLICK' ? 'RESULT' : msg.tipo === 'FIND_SALVAR' ? 'RESULT_SALVAR' : msg.tipo === 'REDISTRIBUIR' ? 'RESULT_REDISTRIBUIR' : msg.tipo === 'EXPEDIR' ? 'RESULT_EXPEDIR' : 'PONG';
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, timeoutMs || 5000);

    function handler(e) {
      if (!e.data || e.data.pjeSeq !== true) return;
      if (e.data.tipo !== tipo_resp) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve(e.data);
    }
    window.addEventListener('message', handler);

    const iw = getIframeWindow();
    if (iw) {
      iw.postMessage({ pjeSeq: true, ...msg }, '*');
    } else {
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve(null);
    }
  });
}

// Aguarda iframe carregar com conteúdo (.propertyView) via postMessage PING
// Verifica DUAS vezes seguidas para garantir estabilidade do DOM
async function aguardarIframe(timeoutMs) {
  const inicio = Date.now();
  let confirmacoes = 0;
  while (Date.now() - inicio < timeoutMs) {
    const resp = await enviarParaIframe({ tipo: 'PING' }, 1200);
    if (resp && resp.temConteudo) {
      confirmacoes++;
      if (confirmacoes >= 2) {
        // Confirmado 2 vezes seguidas = DOM estável
        console.log(`[PJE Seq] iframe estável. propertyViews: ${resp.pvCount}`);
        return true;
      }
      await new Promise(r => setTimeout(r, 400)); // pequena pausa entre confirmações
    } else {
      confirmacoes = 0; // reseta se perdeu resposta
      await new Promise(r => setTimeout(r, 500));
    }
  }
  console.warn('[PJE Seq] timeout aguardando iframe');
  return false;
}

// ── Seleção ──────────────────────────────────────────────────

function obterTitulo(el) {
  const a = el.querySelector('a');
  return a ? a.textContent.trim().split('\n')[0].trim().substring(0,70) : 'Processo';
}

function atualizarContador() {
  const c = document.getElementById('pje-seq-contador');
  if (!c) return;
  c.style.display = seqSelecao.length > 0 ? 'block' : 'none';
  if (seqSelecao.length > 0) c.textContent = `✅ ${seqSelecao.length} selecionado(s) — clique para continuar`;
}

function toggleCard(el) {
  const link = el.querySelector('a');
  const texto = (el.innerText || el.textContent || '');
  const mNum = texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
  const numero = mNum ? mNum[0] : (link ? link.textContent.trim().split('\n')[0].trim().substring(0,30) : null);

  const idx = seqSelecao.findIndex(s => s.el === el || (numero && s.numero === numero));
  if (idx >= 0) {
    const oldEl = seqSelecao[idx].el;
    seqSelecao.splice(idx,1);
    el.classList.remove('pje-card-sel');
    if (oldEl && oldEl !== el) oldEl.classList.remove('pje-card-sel');
  }
  else {
    seqSelecao.push({
      el,
      titulo: obterTitulo(el),
      href: link ? link.getAttribute('href') : null,
      numero
    });
    el.classList.add('pje-card-sel');
  }
  atualizarContador();
}

function obterCardDoClique(target) {
  return target.closest('processo-datalist-card') || target.closest('li[class*="ng-star"]') || target.closest('[class*="datalist"]');
}

function obterCardsProcessosVisiveis() {
  const porNumero = new Map();
  const rxNum = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const candidatos = Array.from(document.querySelectorAll('processo-datalist-card, li[class*="ng-star"], .datalist-content, [class*="datalist-content"]'));
  for (const el of candidatos) {
    if (!el || el.closest('#pje-seq-banner,#pje-seq-contador,#pje-seq-modal-overlay')) continue;
    const rect = el.getBoundingClientRect?.();
    if (rect && (rect.width === 0 || rect.height === 0)) continue;
    const texto = el.innerText || el.textContent || '';
    const m = texto.match(rxNum);
    if (!m) continue;
    const numero = m[0];
    const atual = porNumero.get(numero);
    if (!atual) { porNumero.set(numero, el); continue; }
    const atualLen = (atual.innerText || atual.textContent || '').length;
    const novoLen = texto.length;
    if (novoLen < atualLen) porNumero.set(numero, el);
  }
  return [...porNumero.values()];
}

function selecionarTodosProcessosVisiveis() {
  const cards = obterCardsProcessosVisiveis();
  let novos = 0;
  cards.forEach(card => {
    const texto = card.innerText || card.textContent || '';
    const m = texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
    const numero = m ? m[0] : null;
    const jaSelecionado = seqSelecao.some(s => s.el === card || (numero && s.numero === numero)) || card.classList.contains('pje-card-sel');
    if (!jaSelecionado) {
      const link = card.querySelector('a');
      seqSelecao.push({
        el: card,
        titulo: obterTitulo(card),
        href: link ? link.getAttribute('href') : null,
        numero: numero || (link ? link.textContent.trim().split('\n')[0].trim().substring(0,30) : null)
      });
      card.classList.add('pje-card-sel');
      novos++;
    }
  });
  atualizarContador();
  console.log(`[PJE Seq] Selecionar todos visíveis: ${cards.length} processo(s) único(s), ${novos} novo(s).`);
}


function ativarModo() {
  seqModoAtivo = true; injetarEstilosSeq();
  if (!document.getElementById('pje-seq-banner')) {
    const b = document.createElement('div'); b.id = 'pje-seq-banner';
    b.innerHTML = `⚡ MODO SELEÇÃO — Clique nos processos desejados
      <span id="pje-seq-selecionar-todos">☑ Selecionar todos visíveis</span>
      <span id="pje-seq-confirmar-banner">✅ Confirmar</span>
      <span id="pje-seq-cancelar-banner">✕ Cancelar</span>`;
    document.body.prepend(b);
    document.getElementById('pje-seq-selecionar-todos').onclick = selecionarTodosProcessosVisiveis;
    document.getElementById('pje-seq-confirmar-banner').onclick = confirmarSel;
    document.getElementById('pje-seq-cancelar-banner').onclick = desativarModo;
  }
  if (!document.getElementById('pje-seq-contador')) {
    const c = document.createElement('div'); c.id='pje-seq-contador';
    document.body.appendChild(c); c.onclick = confirmarSel;
  }
  const btn = document.getElementById('pje-seq-btn');
  if (btn) { btn.textContent='✕ Cancelar'; btn.classList.add('modo-ativo'); }
  seqClickHandler = (e) => {
    if (!seqModoAtivo) return;
    if (e.target.closest('#pje-seq-banner,#pje-seq-contador,#pje-seq-btn')) return;
    const card = obterCardDoClique(e.target);
    if (!card) return;
    e.preventDefault(); e.stopImmediatePropagation();
    toggleCard(card);
  };
  document.addEventListener('click', seqClickHandler, true);
}

function desativarModo() {
  seqModoAtivo = false;
  ['pje-seq-banner','pje-seq-contador'].forEach(id => { const el=document.getElementById(id); if(el)el.remove(); });
  seqSelecao.forEach(({el}) => el.classList.remove('pje-card-sel'));
  seqSelecao = [];
  if (seqClickHandler) { document.removeEventListener('click', seqClickHandler, true); seqClickHandler=null; }
  const btn = document.getElementById('pje-seq-btn');
  if (btn) { btn.textContent='⚡ Sequencial'; btn.classList.remove('modo-ativo'); }
}

function confirmarSel() {
  if (!seqSelecao.length) { desativarModo(); return; }
  const itens = [...seqSelecao]; desativarModo();
  mostrarDialogSequencial(itens);
}

// ── Dialog ───────────────────────────────────────────────────

function mostrarDialogSequencial(itens) {
  injetarEstilosSeq();
  const ov = document.createElement('div'); ov.id='pje-seq-modal-overlay';
  const ut=localStorage.getItem('pje_seq_ultima_atividade')||'';
  const urj=localStorage.getItem('pje_seq_redis_jurisdicao')||'Núcleo de Justiça 4.0';
  const uro=localStorage.getItem('pje_seq_redis_orgao')||'Núcleo de Justiça 4.0 - Juizados Especiais Adjuntos';
  const ut2=localStorage.getItem('pje_seq_ultima_transicao')||'';
  const ut3=localStorage.getItem('pje_seq_ultima_atividade2')||'';
  const ut4=localStorage.getItem('pje_seq_ultima_transicao2')||'';
  const ud=localStorage.getItem('pje_seq_delay')||'3000';
  ov.innerHTML=`<div id="pje-seq-modal">
    <h2>⚡ Automação Sequencial — ${itens.length} processo(s)</h2>
    <div id="pje-seq-lista-sel">${itens.map((it,i)=>`<div style="padding:2px 0;">${i+1}. ${it.titulo}</div>`).join('')}</div>
    <div id="pje-seq-tabs">
      <button class="pje-seq-tab pje-seq-tab-ativo" data-tab="padrao">⚡ Padrão</button>
      <button class="pje-seq-tab" data-tab="redistribuir">🔀 Redistribuir</button>
      <button class="pje-seq-tab" data-tab="expedir">📄 Expedir</button>
    </div>
    <div id="pje-seq-tab-padrao">
      <label>1. Atividade(s) no formulário — separe por vírgula para mais de uma</label>
      <input id="pje-seq-input-atividade" type="text" placeholder="Ex: Citar/Intimar  ou  Citar/Intimar, Certificar" value="${ut}">
      <label>2. Opção de transição (ex: Prosseguir, Arquivar)</label>
      <input id="pje-seq-input-transicao" type="text" placeholder="Ex: 01 - Prosseguir, Arquivar..." value="${ut2}">
      <label>3. Atividade(s) 2 no formulário — separe por vírgula para mais de uma</label>
      <input id="pje-seq-input-atividade2" type="text" placeholder="Ex: Certificar decurso  ou  Despachar, Certificar" value="${ut3}">
      <label>4. Segunda transição (opcional, ex: Confirmar, Sim)</label>
      <input id="pje-seq-input-transicao2" type="text" placeholder="Deixe vazio se não houver segunda transição" value="${ut4}">
      <label>Aguardar carregamento do processo</label>
      <select id="pje-seq-input-delay">
        <option value="2000" ${ud==='2000'?'selected':''}>2 segundos</option>
        <option value="3000" ${ud==='3000'?'selected':''}>3 segundos (recomendado)</option>
        <option value="5000" ${ud==='5000'?'selected':''}>5 segundos (lento)</option>
        <option value="8000" ${ud==='8000'?'selected':''}>8 segundos</option>
      </select>
      <div class="pje-seq-btns">
        <button id="pje-seq-cancelar-modal">Cancelar</button>
        <button id="pje-seq-iniciar">▶ Iniciar</button>
      </div>
    </div>
    <div id="pje-seq-tab-redistribuir" style="display:none">
      <label>Jurisdição (destino)</label>
      <input id="pje-seq-redis-jurisdicao" type="text" value="${urj}" placeholder="Ex: Núcleo de Justiça 4.0">
      <label>Órgão Julgador (destino)</label>
      <input id="pje-seq-redis-orgao" type="text" value="${uro}" placeholder="Ex: Núcleo de Justiça 4.0 - Juizados Especiais Adjuntos">
      <label>Aguardar carregamento do processo</label>
      <select id="pje-seq-redis-delay">
        <option value="2000" ${ud==='2000'?'selected':''}>2 segundos</option>
        <option value="3000" ${ud==='3000'?'selected':''}>3 segundos (recomendado)</option>
        <option value="5000" ${ud==='5000'?'selected':''}>5 segundos (lento)</option>
        <option value="8000" ${ud==='8000'?'selected':''}>8 segundos</option>
      </select>
      <div class="pje-seq-btns">
        <button id="pje-seq-cancelar-redistribuir">Cancelar</button>
        <button id="pje-seq-iniciar-redistribuir">🔀 Redistribuir</button>
      </div>
    </div>
    <div id="pje-seq-tab-expedir" style="display:none">
      <p style="font-size:13px;color:#555;margin:0 0 14px">
        Expedição automática de documentos em lote.
      </p>
      <label>Polo destinatário</label>
      <select id="pje-seq-expedir-polo">
        <option value="ativo">Polo Ativo</option>
        <option value="passivo">Polo Passivo</option>
      </select>
      <label>Tipo de ato</label>
      <select id="pje-seq-expedir-tipo">
        <option value="Intimaçao">Intimaçao</option>
        <option value="Citaçao">Citaçao</option>
      </select>
      <label>Meio de comunicação</label>
      <select id="pje-seq-expedir-meio">
        <option value="Sistema">Sistema</option>
        <option value="Correios">Correios</option>
        <option value="Central de Mandados">Central de Mandados</option>
      </select>
      <label id="pje-seq-expedir-modelo-label" style="display:none">Modelo (Correios)</label>
      <input type="text" id="pje-seq-expedir-modelo" style="display:none" placeholder="Ex: Carta AR - Intimaçao">
      <label>Prazo (dias)</label>
      <input type="number" id="pje-seq-expedir-prazo" value="${localStorage.getItem('pje_seq_expedir_prazo')||'15'}" min="1" step="1" placeholder="Ex: 15" style="width:100px">
      <label>Aguardar carregamento do processo</label>
      <select id="pje-seq-expedir-delay">
        <option value="2000" ${ud==='2000'?'selected':''}>2 segundos</option>
        <option value="3000" ${ud==='3000'?'selected':''}>3 segundos (recomendado)</option>
        <option value="5000" ${ud==='5000'?'selected':''}>5 segundos (lento)</option>
        <option value="8000" ${ud==='8000'?'selected':''}>8 segundos</option>
      </select>
      <div class="pje-seq-btns" style="margin-top:16px">
        <button id="pje-seq-cancelar-expedir">Cancelar</button>
        <button id="pje-seq-iniciar-expedir" style="background:#0e7490;color:white">📄 Expedir</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
  document.getElementById('pje-seq-cancelar-modal').onclick = () => ov.remove();
  document.getElementById('pje-seq-cancelar-redistribuir').onclick = () => ov.remove();
  document.getElementById('pje-seq-cancelar-expedir').onclick = () => ov.remove();
  document.getElementById('pje-seq-expedir-meio').addEventListener('change', function() {
    const correios = this.value === 'Correios' || this.value === 'Central de Mandados';
    document.getElementById('pje-seq-expedir-modelo-label').style.display = correios ? '' : 'none';
    document.getElementById('pje-seq-expedir-modelo').style.display       = correios ? '' : 'none';
  });
  document.querySelectorAll('.pje-seq-tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.pje-seq-tab').forEach(b => b.classList.remove('pje-seq-tab-ativo'));
      btn.classList.add('pje-seq-tab-ativo');
      const tab = btn.dataset.tab;
      document.getElementById('pje-seq-tab-padrao').style.display       = tab === 'padrao'       ? '' : 'none';
      document.getElementById('pje-seq-tab-redistribuir').style.display = tab === 'redistribuir' ? '' : 'none';
      document.getElementById('pje-seq-tab-expedir').style.display      = tab === 'expedir'      ? '' : 'none';
    };
  });
  document.getElementById('pje-seq-iniciar-redistribuir').onclick = () => {
    const j = document.getElementById('pje-seq-redis-jurisdicao').value.trim();
    const o = document.getElementById('pje-seq-redis-orgao').value.trim();
    const d = parseInt(document.getElementById('pje-seq-redis-delay').value);
    if (!j) { document.getElementById('pje-seq-redis-jurisdicao').focus(); return; }
    if (!o) { document.getElementById('pje-seq-redis-orgao').focus(); return; }
    localStorage.setItem('pje_seq_redis_jurisdicao', j);
    localStorage.setItem('pje_seq_redis_orgao', o);
    localStorage.setItem('pje_seq_delay', String(d));
    ov.remove();
    executarRedistribuir(itens, j, o, d);
  };

  document.getElementById('pje-seq-iniciar-expedir').onclick = () => {
    const d = parseInt(document.getElementById('pje-seq-expedir-delay').value);
    const tipoAto = document.getElementById('pje-seq-expedir-tipo').value;
    const polo    = document.getElementById('pje-seq-expedir-polo').value;
    const meio    = document.getElementById('pje-seq-expedir-meio').value;
    const modelo  = document.getElementById('pje-seq-expedir-modelo').value.trim();
    const prazo   = parseInt(document.getElementById('pje-seq-expedir-prazo').value) || 15;
    localStorage.setItem('pje_seq_delay', String(d));
    localStorage.setItem('pje_seq_expedir_prazo', String(prazo));
    ov.remove();
    executarExpedicao(itens, d, tipoAto, prazo, polo, meio, modelo);
  };

  document.getElementById('pje-seq-iniciar').onclick = () => {
    const ativ=document.getElementById('pje-seq-input-atividade').value.trim();
    const t=document.getElementById('pje-seq-input-transicao').value.trim();
    const ativ2=document.getElementById('pje-seq-input-atividade2').value.trim();
    const t2=document.getElementById('pje-seq-input-transicao2').value.trim();
    const d=parseInt(document.getElementById('pje-seq-input-delay').value);
    if (!t) { document.getElementById('pje-seq-input-transicao').focus(); return; }
    localStorage.setItem('pje_seq_ultima_atividade',ativ);
    localStorage.setItem('pje_seq_ultima_transicao',t);
    localStorage.setItem('pje_seq_ultima_atividade2',ativ2);
    localStorage.setItem('pje_seq_ultima_transicao2',t2);
    localStorage.setItem('pje_seq_delay',String(d));
    ov.remove();
    executarSequencial(itens,ativ,t,ativ2,t2,d);
  };
}

// ── Execução ─────────────────────────────────────────────────

function esperar(ms) { return new Promise(r=>setTimeout(r,ms)); }

// Clica no processo buscando sempre pelo texto/href no DOM atual
// NÃO usa item.el pois Angular pode reusar o elemento para outro processo
function clicarProcessoFresco(item) {
  // 1) Busca por número/texto do processo (mais confiável — texto não muda)
  if (item.numero) {
    const num = item.numero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase();
    for (const a of document.querySelectorAll('processo-datalist-card a, li[class*="ng-star"] a')) {
      const txt = a.textContent.trim().toLowerCase();
      if (txt.includes(item.numero.toLowerCase())) {
        console.log(`[PJE Seq] clicando por numero: ${item.numero}`);
        a.click(); return true;
      }
    }
  }

  // 2) Busca por href como fallback
  if (item.href) {
    const a = document.querySelector(`a[href="${item.href}"]`);
    if (a) { console.log('[PJE Seq] clicando por href'); a.click(); return true; }
  }

  // 3) Fallback: título parcial na lista de processo (processo-datalist-card)
  if (item.titulo) {
    const tituloParc = item.titulo.substring(0, 20).toLowerCase();
    for (const a of document.querySelectorAll('processo-datalist-card a')) {
      if (a.textContent.toLowerCase().includes(tituloParc)) {
        console.log(`[PJE Seq] clicando por titulo parcial: ${tituloParc}`);
        a.click(); return true;
      }
    }
  }

  console.warn(`[PJE Seq] clicarProcessoFresco: processo não encontrado. numero="${item.numero}"`);
  return false;
}

// Retorna o botão específico de transições da tarefa (#btnTransicoesTarefa)
function getBtnTransicoes() {
  // Busca pelo ID exato primeiro, depois por tooltip específico
  return document.getElementById('btnTransicoesTarefa')
      || document.querySelector('button[id^="btnTransicoesTarefa"]')
      || document.querySelector('button[tooltip*="Encaminhar"], button[aria-describedby][class*="dropdown-toggle"]');
}

// Abre SOMENTE o dropdown de transições da tarefa — sem abrir outros menus
function abrirDropdownTransicoes() {
  const btn = getBtnTransicoes();
  if (!btn) return false;
  const pai = btn.closest('.dropdown, .btn-group');
  const jaAberto = pai && pai.classList.contains('open');
  if (!jaAberto) btn.click();
  return true;
}

// Busca link de transição SOMENTE dentro do dropdown oficial de transições
// NÃO usa fallback genérico para evitar clicar em outros elementos (ex: etiquetas)
function encontrarTransicaoAngular(texto) {
  const alvo = String(texto || '').trim().toLowerCase();
  if (!alvo) return null;
  function normalizar(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function label(el) { return (el.textContent || el.innerText || el.title || el.getAttribute('title') || '').trim(); }
  function visivel(el) { const r = el.getBoundingClientRect?.(); return !r || (r.width > 0 && r.height > 0); }

  const seletores = [
    '#nTransicoesTarefa a',
    'ul[id*="TransicoesTarefa"] a',
    'ul[id*="transicoesTarefa"] a',
    '[id*="TransicoesTarefa"] a',
    '[id*="transicoesTarefa"] a',
    '.dropdown-transicoes a',
    'ul[class*="transicoes"] a'
  ];
  const alvoNorm = normalizar(alvo);
  const candidatos = [];

  for (const sel of seletores) {
    for (const el of document.querySelectorAll(sel)) {
      if (!visivel(el)) continue;
      const container = el.closest('ul, .dropdown-menu, [id*="TransicoesTarefa"], [id*="transicoesTarefa"]');
      if (!container) continue;
      const contexto = ((container.id || '') + ' ' + (container.className || '')).toLowerCase();
      if (!contexto.includes('transic') && !contexto.includes('dropdown')) continue;
      const txt = label(el);
      if (!txt) continue;
      candidatos.push({ el, norm: normalizar(txt) });
    }
  }

  for (const c of candidatos) {
    if (c.norm === alvoNorm || c.norm.replace(/^\d+\s*-\s*/, '') === alvoNorm) return c.el;
  }
  for (const c of candidatos) {
    if (c.norm.includes(alvoNorm) || alvoNorm.includes(c.norm)) return c.el;
  }
  return null;
}

// Aguarda a transição aparecer no dropdown — abre o dropdown se necessário
async function aguardarTransicao(texto, timeoutMs) {
  const inicio = Date.now();
  let tentouAbrir = false;
  while (Date.now() - inicio < timeoutMs) {
    const el = encontrarTransicaoAngular(texto);
    if (el) return el;
    // Após 600ms, abre o dropdown de transições para forçar renderização
    if (!tentouAbrir && Date.now() - inicio > 600) {
      tentouAbrir = abrirDropdownTransicoes();
      console.log(`[PJE Seq] abrirDropdown: ${tentouAbrir}, btn: ${getBtnTransicoes()?.id}`);
      if (tentouAbrir) await new Promise(r => setTimeout(r, 500));
    } else {
      await new Promise(r => setTimeout(r, 400));
    }
  }
  return null;
}

function logSeq(msg,tipo='info') {
  const log=document.getElementById('pje-seq-log'); if(!log)return;
  const d=document.createElement('div'); d.className=`pje-seq-log-${tipo}`; d.textContent=msg;
  log.appendChild(d); log.scrollTop=log.scrollHeight;
  const ts = new Date().toLocaleTimeString('pt-BR');
  seqRelatorio.push({ ts, msg, tipo });
}
function atualizarProgress(atual,total,msg) {
  const pct=Math.round((atual/total)*100);
  const b=document.getElementById('pje-seq-barra-inner'),s=document.getElementById('pje-seq-status'),c=document.getElementById('pje-seq-contagem');
  if(b)b.style.width=pct+'%'; if(s)s.textContent=msg; if(c)c.textContent=`${atual} / ${total}`;
}

async function executarExpedicao(itens, delayMs, tipoAto, prazo, polo, meio, modelo) {
  seqCancelado = false;
  const total = itens.length;
  const ov = document.createElement('div');
  ov.id = 'pje-seq-progress-overlay';
  ov.innerHTML = `<div id="pje-seq-progress-box">
    <h3>📄 Expedição em Lote</h3>
    <div id="pje-seq-status">Iniciando...</div>
    <div id="pje-seq-barra-outer"><div id="pje-seq-barra-inner"></div></div>
    <small id="pje-seq-contagem" style="color:#888">0 / ${total}</small>
    <div id="pje-seq-log"></div>
    <button id="pje-seq-parar">Parar</button>
  </div>`;
  document.body.appendChild(ov);
  document.getElementById('pje-seq-parar').onclick = () => {
    seqCancelado = true;
    atualizarProgress(total, total, 'Interrompido.');
    setTimeout(() => ov.remove(), 3000);
  };
  seqRelatorio = [];
  seqConfig = { atividade: 'Expedir', transicao: '-', delay: delayMs, total, inicio: new Date().toLocaleString('pt-BR') };
  let ok = 0, erros = 0;
  try {
    for (let i = 0; i < itens.length; i++) {
      if (seqCancelado) break;
      const item = itens[i];
      atualizarProgress(i, total, `Abrindo ${item.titulo.substring(0, 40)}...`);
      logSeq(`[${i+1}/${total}] ${item.titulo.substring(0, 55)}`, 'info');

      const clicou = clicarProcessoFresco(item);
      if (!clicou) { logSeq('Processo não encontrado no DOM', 'err'); erros++; continue; }

      atualizarProgress(i, total, `Aguardando ${delayMs/1000}s...`);
      await esperar(delayMs);
      if (seqCancelado) break;

      const iframeOk = await aguardarIframe(5000);
      if (iframeOk) { logSeq('iframe pronto', 'ok'); await esperar(300); }
      else { logSeq('iframe não confirmou, tentando mesmo assim...', 'info'); }
      if (seqCancelado) break;

      atualizarProgress(i, total, 'Executando expedição...');
      const resp = await enviarParaIframe({ tipo: 'EXPEDIR', tipoAto: tipoAto || 'Intimaçao', prazo: prazo || 15, polo: polo || 'ativo', meio: meio || 'Sistema', modelo: modelo || '' }, 30000);
      if (resp && resp.success) {
        logSeq(resp.msg || 'Expedição iniciada', 'ok');
        ok++;
      } else {
        logSeq(resp ? resp.msg : 'Timeout sem resposta do iframe', 'err');
        erros++;
      }
      if (i < itens.length - 1) {
        // Aguarda estabilização após assinatura digital
        await esperar(2000);
        // Clique extra para confirmar seleção do próximo processo
        if (i + 1 < itens.length) {
          const proximoItem = itens[i + 1];
          const clicouConfirm = clicarProcessoFresco(proximoItem);
          if (clicouConfirm) {
            logSeq(`↩ Confirmando seleção: ${proximoItem.titulo.substring(0, 40)}...`, 'info');
            await esperar(1200);
          }
        }
      }
    }
  } catch(err) {
    logSeq('Erro inesperado: ' + err.message, 'err');
    console.error('executarExpedicao', err);
  }
  const msgFim = seqCancelado ? 'Parado.' : (ok + erros > 0 ? `Concluído! ${ok} expedidos, ${erros} erros.` : 'Concluído!');
  atualizarProgress(total, total, msgFim);
  logSeq('--- FIM ---', 'info');
  const logDiv = document.getElementById('pje-seq-log');
  if (logDiv) { logDiv.style.maxHeight = '340px'; logDiv.scrollTop = 0; }

  const pararBtn = document.getElementById('pje-seq-parar');
  if (pararBtn) pararBtn.outerHTML = `<div id="pje-seq-acoes-fim" style="display:flex;gap:8px;margin-top:14px">
    <button id="pje-seq-baixar" style="flex:1;padding:9px;border:none;border-radius:8px;background:#7c3aed;color:white;font-weight:600;cursor:pointer;font-size:13px">⬇ Baixar Relatório</button>
    <button id="pje-seq-fechar-rel" style="flex:1;padding:9px;border:none;border-radius:8px;background:#f3f4f6;color:#374151;font-weight:600;cursor:pointer;font-size:13px">✕ Fechar</button>
  </div>`;
  document.getElementById('pje-seq-fechar-rel').onclick = () => ov.remove();
  document.getElementById('pje-seq-baixar').onclick = () => {
    const d = seqConfig;
    const linhas = [
      '='.repeat(60), 'RELATÓRIO DE EXPEDIÇÃO EM LOTE — PJe Sejud Cariri', '='.repeat(60),
      `Data/Hora de início: ${d.inicio}`, `Data/Hora de fim: ${new Date().toLocaleString('pt-BR')}`,
      `Total de processos: ${d.total}`, `Expedidos: ${ok}`, `Erros: ${erros}`, '',
      '='.repeat(60), 'LOG DETALHADO', '='.repeat(60),
      ...seqRelatorio.map(r => `${r.ts} ${r.tipo === 'err' ? '[ERRO]' : r.tipo === 'ok' ? '[OK]  ' : '[INFO]'} ${r.msg}`),
      '='.repeat(60), msgFim, '='.repeat(60),
    ];
    const blob = new Blob([linhas.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio-expedicao-${new Date().toISOString().slice(0,16).replace('T','_').replace(/:/g,'h')}.txt`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  };
}

async function executarSequencial(itens, nomeAtividade, nomeTransicao, nomeAtividade2, nomeTransicao2, delayMs) {
  seqCancelado = false;
  const total = itens.length;
  const ov = document.createElement('div'); ov.id='pje-seq-progress-overlay';
  ov.innerHTML=`<div id="pje-seq-progress-box">
    <h3>⚡ Automação Sequencial</h3>
    <div id="pje-seq-status">Iniciando...</div>
    <div id="pje-seq-barra-outer"><div id="pje-seq-barra-inner"></div></div>
    <small id="pje-seq-contagem" style="color:#888;">0 / ${total}</small>
    <div id="pje-seq-log"></div>
    <button id="pje-seq-parar">⏹ Parar</button>
  </div>`;
  document.body.appendChild(ov);
  document.getElementById('pje-seq-parar').onclick=()=>{seqCancelado=true;atualizarProgress(total,total,'⏹ Interrompido.');setTimeout(()=>ov.remove(),3000);};

  seqRelatorio = [];
  seqConfig = { atividade: nomeAtividade, transicao: nomeTransicao,
                atividade2: nomeAtividade2, transicao2: nomeTransicao2,
                delay: delayMs, total, inicio: new Date().toLocaleString('pt-BR') };
  let ok=0, erros=0;
  try { for (let i=0; i<itens.length; i++) {
    if (seqCancelado) break;
    const item = itens[i];
    const { titulo } = item;
    atualizarProgress(i,total,`[${i+1}/${total}] Abrindo: ${titulo.substring(0,40)}...`);
    logSeq(`[${i+1}/${total}] ${titulo.substring(0,55)}`, 'info');

    // Clica no processo — busca elemento fresco no DOM
    const clicou = clicarProcessoFresco(item);
    if (!clicou) { logSeq('  ✗ Processo não encontrado no DOM','err'); erros++; continue; }
    logSeq('  ✓ Clique 1', 'ok');

    // Segundo clique após 1s para garantir que o Angular carregou o processo
    await esperar(1000);
    clicarProcessoFresco(item);
    logSeq('  ✓ Clique 2 (confirmação)', 'ok');

    // ESPERA CONFIGURADA: aguarda o tempo que o usuário definiu (mínimo garantido)
    atualizarProgress(i,total,`[${i+1}/${total}] Aguardando ${delayMs/1000}s...`);
    await esperar(delayMs);
    if (seqCancelado) break;

    // Depois da espera mínima, confirma se iframe está pronto (até +5s extras)
    atualizarProgress(i,total,`[${i+1}/${total}] Verificando iframe...`);
    const iframeOk = await aguardarIframe(5000);
    if (iframeOk) {
      logSeq('  ✓ iframe pronto', 'ok');
      await esperar(300); // buffer extra após confirmação
    } else {
      logSeq('  ⚠ iframe não confirmou, tentando mesmo assim...','info');
    }
    if (seqCancelado) break;

    // PASSO 1: Atividade(s) no iframe — suporta múltiplas separadas por vírgula
    if (nomeAtividade) {
      const _ativs1 = nomeAtividade.split(',').map(s => s.trim()).filter(Boolean);
      for (const _at of _ativs1) {
        if (seqCancelado) break;
        atualizarProgress(i,total,`[${i+1}/${total}] Marcando: "${_at}"...`);
        const respAtiv = await enviarParaIframe({ tipo:'FIND_CLICK', texto: _at }, 6000);
        if (respAtiv && respAtiv.success) {
          logSeq(`  ✓ Atividade: "${respAtiv.label}"`, 'ok');
          await esperar(800);
        } else {
          logSeq(`  ⚠ Atividade "${_at}" não encontrada (continuando...)`, 'info');
          await esperar(400);
        }
      }
    }
    if (seqCancelado) break;

    // PASSO 2: Transição no frame Angular (ex: "01 - Prosseguir")
    // Aguarda ativamente a transição aparecer (abre dropdown se necessário)
    atualizarProgress(i,total,`[${i+1}/${total}] Buscando transição: "${nomeTransicao}"...`);
    logSeq(`  ⏳ Aguardando transição...`, 'info');
    const btnTransicao = await aguardarTransicao(nomeTransicao, 8000);

    if (btnTransicao) {
      const labelBtn = (btnTransicao.textContent || btnTransicao.title || '').trim().substring(0,60);
      logSeq(`  ✓ Transição 1: "${labelBtn}"`, 'ok');
      btnTransicao.click();
      await esperar(1500);

      // PASSO 3 (opcional): Atividade 2 no iframe + Segunda transição no Angular
      if (nomeAtividade2 || nomeTransicao2) {
        // 3a) Aguarda iframe recarregar após a 1ª transição
        atualizarProgress(i,total,`[${i+1}/${total}] Aguardando iframe recarregar...`);
        await esperar(delayMs);
        const iframeOk2 = await aguardarIframe(5000);
        if (iframeOk2) {
          logSeq('  ✓ iframe pronto (passo 3)', 'ok');
          await esperar(300);
        } else {
          logSeq('  ⚠ iframe não confirmou no passo 3, tentando mesmo assim...', 'info');
        }

        // 3b) Atividade(s) 2 no iframe JSF — suporta múltiplas separadas por vírgula
        if (nomeAtividade2) {
          const _ativs2 = nomeAtividade2.split(',').map(s => s.trim()).filter(Boolean);
          for (const _at2 of _ativs2) {
            if (seqCancelado) break;
            atualizarProgress(i,total,`[${i+1}/${total}] Marcando atividade 2: "${_at2}"...`);
            const respAtiv2 = await enviarParaIframe({ tipo:'FIND_CLICK', texto: _at2 }, 6000);
            if (respAtiv2 && respAtiv2.success) {
              logSeq(`  ✓ Atividade 2: "${respAtiv2.label}"`, 'ok');
              await esperar(800);
            } else {
              logSeq(`  ⚠ Atividade 2 "${_at2}" não encontrada (continuando...)`, 'info');
              await esperar(400);
            }
          }
        }

        // 3b) Segunda transição no frame Angular
        if (nomeTransicao2) {
          atualizarProgress(i,total,`[${i+1}/${total}] Buscando 2ª transição: "${nomeTransicao2}"...`);
          logSeq(`  ⏳ Aguardando 2ª transição...`, 'info');
          const btnTransicao2 = await aguardarTransicao(nomeTransicao2, 8000);
          if (btnTransicao2) {
            const label2 = (btnTransicao2.textContent || btnTransicao2.title || '').trim().substring(0,60);
            logSeq(`  ✓ Transição 2: "${label2}"`, 'ok');
            btnTransicao2.click();
            await esperar(1500);
          } else {
            logSeq(`  ⚠ 2ª transição "${nomeTransicao2}" não encontrada (continuando...)`, 'info');
          }
        }
      }

      ok++;
    } else {
      logSeq(`  ✗ Transição "${nomeTransicao}" não encontrada (timeout 8s)`, 'err'); erros++;
    }
    await esperar(400);
  }

  } catch(err) {
    logSeq(`  ✗ Erro inesperado: ${err.message}`, 'err');
    console.error('[PJE Seq] Erro no loop:', err);
  }

  const msgFim = seqCancelado ? `⏹ Parado. ${ok}✓ ${erros}✗` : `✅ Concluído! ${ok} executados, ${erros} erros.`;
  atualizarProgress(total, total, msgFim);
  logSeq('--- FIM ---','info');

  // ── Transforma o painel em modo relatório ──────────────────────────────────
  const logDiv = document.getElementById('pje-seq-log');
  if (logDiv) { logDiv.style.maxHeight = '340px'; logDiv.scrollTop = 0; }

  const pararBtn = document.getElementById('pje-seq-parar');
  if (pararBtn) {
    pararBtn.outerHTML = `
      <div id="pje-seq-acoes-fim" style="display:flex;gap:8px;margin-top:14px;">
        <button id="pje-seq-baixar"
          style="flex:1;padding:9px;border:none;border-radius:8px;background:#7c3aed;color:white;font-weight:600;cursor:pointer;font-size:13px;">
          ⬇ Baixar Relatório
        </button>
        <button id="pje-seq-fechar-rel"
          style="flex:1;padding:9px;border:none;border-radius:8px;background:#f3f4f6;color:#374151;font-weight:600;cursor:pointer;font-size:13px;">
          ✕ Fechar
        </button>
      </div>`;

    document.getElementById('pje-seq-fechar-rel').onclick = () => ov.remove();

    document.getElementById('pje-seq-baixar').onclick = () => {
      const d = seqConfig;
      const linhas = [
        '='.repeat(60),
        'RELATÓRIO DE AUTOMAÇÃO SEQUENCIAL — PJe Sejud Cariri',
        '='.repeat(60),
        `Data/Hora de início : ${d.inicio}`,
        `Data/Hora de fim    : ${new Date().toLocaleString('pt-BR')}`,
        `Total de processos  : ${d.total}`,
        `Executados com ✓    : ${ok}`,
        `Erros / avisos      : ${erros}`,
        '',
        'CONFIGURAÇÃO UTILIZADA:',
        `  Atividade 1     : ${d.atividade  || '(nenhuma)'}`,
        `  Transição 1     : ${d.transicao  || '(nenhuma)'}`,
        `  Atividade 2     : ${d.atividade2 || '(nenhuma)'}`,
        `  Transição 2     : ${d.transicao2 || '(nenhuma)'}`,
        `  Delay           : ${d.delay/1000}s por processo`,
        '',
        '='.repeat(60),
        'LOG DETALHADO:',
        '='.repeat(60),
        ...seqRelatorio.map(r => `[${r.ts}] ${r.tipo === 'err' ? '✗' : r.tipo === 'ok' ? '✓' : ' '} ${r.msg}`),
        '',
        '='.repeat(60),
        msgFim,
        '='.repeat(60),
      ];
      const blob = new Blob([linhas.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'relatorio_pje_' + new Date().toISOString().slice(0,16).replace('T','_').replace(/:/g,'h') + '.txt';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    };
  }
}

// ── Redistribuição em lote ───────────────────────────────────

async function executarRedistribuir(itens, jurisdicao, orgaoJulgador, delayMs) {
  seqCancelado = false;
  const total = itens.length;
  const ov = document.createElement('div');
  ov.id = 'pje-seq-progress-overlay';
  ov.innerHTML = `<div id="pje-seq-progress-box">
    <h3>🔀 Redistribuição em Lote</h3>
    <div id="pje-seq-status">Iniciando...</div>
    <div id="pje-seq-barra-outer"><div id="pje-seq-barra-inner"></div></div>
    <small id="pje-seq-contagem" style="color:#888;">0 / ${total}</small>
    <div id="pje-seq-log"></div>
    <button id="pje-seq-parar">⏹ Parar</button>
  </div>`;
  document.body.appendChild(ov);
  document.getElementById('pje-seq-parar').onclick = () => {
    seqCancelado = true;
    atualizarProgress(total, total, '⏹ Interrompido.');
    setTimeout(() => ov.remove(), 3000);
  };

  seqRelatorio = [];
  seqConfig = { atividade:'', transicao:'Redistribuir', atividade2:'',
                transicao2: jurisdicao + ' → ' + orgaoJulgador,
                delay: delayMs, total, inicio: new Date().toLocaleString('pt-BR') };
  let ok = 0, erros = 0;

  try {
    for (let i = 0; i < itens.length; i++) {
      if (seqCancelado) break;
      const item = itens[i];
      atualizarProgress(i, total, `[${i+1}/${total}] Abrindo: ${item.titulo.substring(0,40)}...`);
      logSeq(`[${i+1}/${total}] ${item.titulo.substring(0,55)}`, 'info');

      const clicou = clicarProcessoFresco(item);
      if (!clicou) { logSeq('  ✗ Processo não encontrado no DOM', 'err'); erros++; continue; }
      await esperar(1000);
      clicarProcessoFresco(item);

      atualizarProgress(i, total, `[${i+1}/${total}] Aguardando ${delayMs/1000}s...`);
      await esperar(delayMs);
      if (seqCancelado) break;

      const iframeOk = await aguardarIframe(5000);
      if (iframeOk) { logSeq('  ✓ iframe pronto', 'ok'); await esperar(300); }
      else logSeq('  ⚠ iframe não confirmou, tentando mesmo assim...', 'info');
      if (seqCancelado) break;

      atualizarProgress(i, total, `[${i+1}/${total}] Redistribuindo...`);
      const resp = await enviarParaIframe({ tipo:'REDISTRIBUIR', jurisdicao, orgaoJulgador }, 40000);
      if (resp && resp.success) {
        logSeq('  ✓ ' + (resp.msg || 'Redistribuído'), 'ok'); ok++;
      } else {
        logSeq('  ✗ ' + (resp ? resp.msg : 'Timeout — sem resposta do iframe'), 'err'); erros++;
      }

      if (i < itens.length - 1) await esperar(3000);
    }
  } catch(err) {
    logSeq('Erro inesperado: ' + err.message, 'err');
    console.error('executarRedistribuir:', err);
  }

  const msgFim = seqCancelado
    ? `⏹ Parado. ${ok}✓ ${erros}✗`
    : `✅ Concluído! ${ok} redistribuídos, ${erros} erros.`;
  atualizarProgress(total, total, msgFim);
  logSeq('--- FIM ---', 'info');

  const logDiv = document.getElementById('pje-seq-log');
  if (logDiv) { logDiv.style.maxHeight = '340px'; logDiv.scrollTop = 0; }

  const pararBtn = document.getElementById('pje-seq-parar');
  if (pararBtn) {
    pararBtn.outerHTML = `
      <div id="pje-seq-acoes-fim" style="display:flex;gap:8px;margin-top:14px;">
        <button id="pje-seq-baixar"
          style="flex:1;padding:9px;border:none;border-radius:8px;background:#7c3aed;color:white;font-weight:600;cursor:pointer;font-size:13px;">
          ⬇ Baixar Relatório
        </button>
        <button id="pje-seq-fechar-rel"
          style="flex:1;padding:9px;border:none;border-radius:8px;background:#f3f4f6;color:#374151;font-weight:600;cursor:pointer;font-size:13px;">
          ✕ Fechar
        </button>
      </div>`;
    document.getElementById('pje-seq-fechar-rel').onclick = () => ov.remove();
    document.getElementById('pje-seq-baixar').onclick = () => {
      const linhas = [
        '='.repeat(60),
        'RELATÓRIO DE REDISTRIBUIÇÃO EM LOTE — PJe Sejud Cariri',
        '='.repeat(60),
        `Data/Hora de início : ${seqConfig.inicio}`,
        `Data/Hora de fim    : ${new Date().toLocaleString('pt-BR')}`,
        `Total de processos  : ${total}`,
        `Redistribuídos ✓    : ${ok}`,
        `Erros               : ${erros}`,
        '',
        'DESTINO CONFIGURADO:',
        `  Jurisdição    : ${jurisdicao}`,
        `  Órgão Julgador: ${orgaoJulgador}`,
        '',
        '='.repeat(60),
        'LOG DETALHADO:',
        '='.repeat(60),
        ...seqRelatorio.map(r => `[${r.ts}] ${r.tipo==='err'?'✗':r.tipo==='ok'?'✓':' '} ${r.msg}`),
        '', '='.repeat(60), msgFim, '='.repeat(60),
      ];
      const blob = new Blob([linhas.join('\n')], { type:'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = 'relatorio_redistribuicao_' + new Date().toISOString().slice(0,16).replace('T','_').replace(/:/g,'h') + '.txt';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    };
  }
}

// ── Botão na toolbar ─────────────────────────────────────────


// ── Sequencial por Lista de Processos ───────────────────────────────────────
function pjeSeqExtrairNumerosListaDireta(texto) {
  const rx = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
  const arr = String(texto || '').match(rx) || [];
  const seen = new Set();
  return arr.filter(n => !seen.has(n) && seen.add(n));
}
function pjeSeqInputPesquisaTarefas() {
  return document.evaluate('//*[@id="inputPesquisaTarefas"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue || document.getElementById('inputPesquisaTarefas') || document.querySelector('input[id*="inputPesquisaTarefas"]');
}
function pjeSeqDispararPesquisa(el) {
  try { el.dispatchEvent(new Event('input', { bubbles:true, cancelable:true })); } catch(e) {}
  try { el.dispatchEvent(new Event('change', { bubbles:true, cancelable:true })); } catch(e) {}
  try { el.dispatchEvent(new KeyboardEvent('keyup', { bubbles:true, cancelable:true, key:'Enter', code:'Enter', keyCode:13, which:13 })); } catch(e) {}
}
function pjeSeqEncontrarLinkProcesso(numero) {
  for (const a of document.querySelectorAll('processo-datalist-card a, li[class*="ng-star"] a, [class*="datalist"] a, a')) {
    if ((a.innerText || a.textContent || '').includes(numero)) return a;
  }
  return null;
}
async function pjeSeqPesquisarEClicarProcesso(numero, timeoutMs) {
  const input = pjeSeqInputPesquisaTarefas();
  if (!input) return { ok:false, motivo:'Campo inputPesquisaTarefas não encontrado' };
  input.focus(); input.value = ''; pjeSeqDispararPesquisa(input); await esperar(250);
  input.focus(); input.value = numero; pjeSeqDispararPesquisa(input);
  const inicio = Date.now();
  while (Date.now() - inicio < (timeoutMs || 10000)) {
    const link = pjeSeqEncontrarLinkProcesso(numero);
    if (link) { link.click(); return { ok:true, motivo:'Processo encontrado/clicado' }; }
    await esperar(400);
  }
  return { ok:false, motivo:'Processo não apareceu após pesquisa' };
}
async function pjeSeqExecutarPassosLista(i, total, atividade, transicao, atividade2, transicao2, delayMs) {
  await esperar(delayMs);
  const iframeOk = await aguardarIframe(5000);
  if (iframeOk) { logSeq('  ✓ iframe pronto', 'ok'); await esperar(300); }
  else logSeq('  ⚠ iframe não confirmou, tentando mesmo assim...', 'info');

  if (atividade) {
    for (const at of atividade.split(',').map(s => s.trim()).filter(Boolean)) {
      if (seqCancelado) return { ok:false, motivo:'Interrompido pelo usuário' };
      const r = await enviarParaIframe({ tipo:'FIND_CLICK', texto:at }, 6000);
      if (r && r.success) logSeq(`  ✓ Atividade: ${r.label}`, 'ok');
      else logSeq(`  ⚠ Atividade não encontrada: ${at}`, 'info');
      await esperar(500);
    }
  }

  atualizarProgress(i,total,`[${i+1}/${total}] Verificando transição: "${transicao}"...`);
  const b = await aguardarTransicao(transicao, 8000);
  if (!b) {
    const motivo = `Transição não encontrada/indisponível: "${transicao}"`;
    logSeq(`  ✗ ${motivo}`, 'err');
    return { ok:false, motivo };
  }
  logSeq(`  ✓ Transição encontrada: ${(b.textContent || b.title || '').trim().substring(0,60)}`, 'ok');
  b.click();
  await esperar(1500);

  if (atividade2 || transicao2) {
    await esperar(Math.max(1500, Math.min(delayMs, 5000)));
    await aguardarIframe(5000);
    if (atividade2) {
      for (const at2 of atividade2.split(',').map(s => s.trim()).filter(Boolean)) {
        const r2 = await enviarParaIframe({ tipo:'FIND_CLICK', texto:at2 }, 6000);
        if (r2 && r2.success) logSeq(`  ✓ Atividade 2: ${r2.label}`, 'ok');
        else logSeq(`  ⚠ Atividade 2 não encontrada: ${at2}`, 'info');
        await esperar(500);
      }
    }
    if (transicao2) {
      const b2 = await aguardarTransicao(transicao2, 8000);
      if (b2) { logSeq(`  ✓ Transição 2 encontrada: ${(b2.textContent || b2.title || '').trim().substring(0,60)}`, 'ok'); b2.click(); await esperar(1500); }
      else logSeq(`  ⚠ 2ª transição não encontrada: ${transicao2}`, 'info');
    }
  }
  return { ok:true, motivo:'Executado' };
}
function mostrarDialogSequencialListaDireta() {
  injetarEstilosSeq();
  const ut=localStorage.getItem('pje_seq_ultima_atividade')||'', tt=localStorage.getItem('pje_seq_ultima_transicao')||'', ut2=localStorage.getItem('pje_seq_ultima_atividade2')||'', tt2=localStorage.getItem('pje_seq_ultima_transicao2')||'', ud=localStorage.getItem('pje_seq_delay')||'3000';
  const ov=document.createElement('div'); ov.id='pje-seq-modal-overlay';
  ov.innerHTML=`<div id="pje-seq-modal"><h2>📋 Sequencial por lista de processos</h2><p style="font-size:13px;color:#555;margin:0 0 12px">Cole abaixo os números dos processos. Se a transição informada não estiver disponível em algum processo, o relatório final indicará o número e o motivo.</p><label>Lista de processos</label><textarea id="pje-seq-lista-processos-direta" style="width:100%;height:180px;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:8px;font-family:Consolas,monospace;font-size:12px;" placeholder="0000000-00.0000.0.00.0000&#10;0000001-00.0000.0.00.0000"></textarea><label>Atividade(s) — opcional</label><input id="pje-seq-lista-atividade-direta" type="text" value="${ut}"><label>Transição</label><input id="pje-seq-lista-transicao-direta" type="text" value="${tt}" placeholder="Ex: 01 - Prosseguir"><label>Atividade(s) 2 — opcional</label><input id="pje-seq-lista-atividade2-direta" type="text" value="${ut2}"><label>Segunda transição — opcional</label><input id="pje-seq-lista-transicao2-direta" type="text" value="${tt2}"><label>Aguardar carregamento</label><select id="pje-seq-lista-delay-direta"><option value="2000" ${ud==='2000'?'selected':''}>2 segundos</option><option value="3000" ${ud==='3000'?'selected':''}>3 segundos</option><option value="5000" ${ud==='5000'?'selected':''}>5 segundos</option><option value="8000" ${ud==='8000'?'selected':''}>8 segundos</option></select><div class="pje-seq-btns"><button id="pje-seq-lista-cancelar-direta" type="button">Cancelar</button><button id="pje-seq-lista-iniciar-direta" type="button" style="background:#0f766e;color:white">▶ Iniciar por lista</button><button id="pje-seq-lista-manual-direta" type="button" style="background:#1d4ed8;color:white">🔎 Modo Manual</button></div></div>`;
  document.body.appendChild(ov);
  document.getElementById('pje-seq-lista-cancelar-direta').onclick=()=>ov.remove();
  document.getElementById('pje-seq-lista-iniciar-direta').onclick=()=>{ const nums=pjeSeqExtrairNumerosListaDireta(document.getElementById('pje-seq-lista-processos-direta').value); const at=document.getElementById('pje-seq-lista-atividade-direta').value.trim(), tr=document.getElementById('pje-seq-lista-transicao-direta').value.trim(), at2=document.getElementById('pje-seq-lista-atividade2-direta').value.trim(), tr2=document.getElementById('pje-seq-lista-transicao2-direta').value.trim(), d=parseInt(document.getElementById('pje-seq-lista-delay-direta').value)||3000; if(!nums.length){document.getElementById('pje-seq-lista-processos-direta').focus();return;} if(!tr){document.getElementById('pje-seq-lista-transicao-direta').focus();return;} localStorage.setItem('pje_seq_ultima_atividade',at); localStorage.setItem('pje_seq_ultima_transicao',tr); localStorage.setItem('pje_seq_ultima_atividade2',at2); localStorage.setItem('pje_seq_ultima_transicao2',tr2); localStorage.setItem('pje_seq_delay',String(d)); ov.remove(); pjeSeqExecutarSequencialListaDireta(nums,at,tr,at2,tr2,d); };
  document.getElementById('pje-seq-lista-manual-direta').onclick = async () => {
    const area = document.getElementById('pje-seq-lista-processos-direta');
    const nums = pjeSeqExtrairNumerosListaDireta(area ? area.value : '');
    if (!nums.length) { if (area) area.focus(); return; }
    ov.remove();
    await pjeSeqExecutarListaManual(nums);
  };
  setTimeout(()=>document.getElementById('pje-seq-lista-processos-direta')?.focus(),80);
}
async function pjeSeqExecutarSequencialListaDireta(numeros, atividade, transicao, atividade2, transicao2, delayMs) {
  seqCancelado=false; const total=numeros.length; const resultados=[]; const ov=document.createElement('div'); ov.id='pje-seq-progress-overlay'; ov.innerHTML=`<div id="pje-seq-progress-box"><h3>📋 Sequencial por lista</h3><div id="pje-seq-status">Iniciando...</div><div id="pje-seq-barra-outer"><div id="pje-seq-barra-inner"></div></div><small id="pje-seq-contagem" style="color:#888;">0 / ${total}</small><div id="pje-seq-log"></div><button id="pje-seq-parar">⏹ Parar</button></div>`; document.body.appendChild(ov); document.getElementById('pje-seq-parar').onclick=()=>{seqCancelado=true;atualizarProgress(total,total,'⏹ Interrompido.');}; seqRelatorio=[]; let ok=0,erros=0; const inicioRel=new Date().toLocaleString('pt-BR');
  for(let i=0;i<numeros.length;i++){ if(seqCancelado){resultados.push({numero:numeros[i],status:'INTERROMPIDO',motivo:'Interrompido pelo usuário'});break;} const n=numeros[i]; atualizarProgress(i,total,`[${i+1}/${total}] Pesquisando: ${n}...`); logSeq(`[${i+1}/${total}] ${n}`,'info'); const busca=await pjeSeqPesquisarEClicarProcesso(n,10000); if(!busca.ok){logSeq(`  ✗ ${busca.motivo}`,'err'); resultados.push({numero:n,status:'ERRO',motivo:busca.motivo}); erros++; continue;} logSeq('  ✓ Processo localizado/clicado','ok'); await esperar(1000); const l2=pjeSeqEncontrarLinkProcesso(n); if(l2)l2.click(); const r=await pjeSeqExecutarPassosLista(i,total,atividade,transicao,atividade2,transicao2,delayMs); if(r.ok){ok++; resultados.push({numero:n,status:'OK',motivo:'Executado'});} else {erros++; resultados.push({numero:n,status:'ERRO',motivo:r.motivo || 'Não executado'});} await esperar(400); }
  const msgFim=seqCancelado?`⏹ Parado. ${ok}✓ ${erros}✗`:`✅ Concluído! ${ok} executados, ${erros} erros.`; atualizarProgress(total,total,msgFim); logSeq('--- FIM ---','info'); const p=document.getElementById('pje-seq-parar'); if(p)p.outerHTML=`<div id="pje-seq-acoes-fim" style="display:flex;gap:8px;margin-top:14px;"><button id="pje-seq-baixar-lista" style="flex:1;padding:9px;border:none;border-radius:8px;background:#7c3aed;color:white;font-weight:600;cursor:pointer;">⬇ Baixar Relatório</button><button id="pje-seq-fechar-rel" style="flex:1;padding:9px;border:none;border-radius:8px;background:#f3f4f6;color:#374151;font-weight:600;cursor:pointer;">✕ Fechar</button></div>`; document.getElementById('pje-seq-fechar-rel')?.addEventListener('click',()=>ov.remove()); document.getElementById('pje-seq-baixar-lista')?.addEventListener('click',()=>{const pendentes=resultados.filter(r=>r.status!=='OK'); const linhas=['='.repeat(70),'RELATÓRIO — SEQUENCIAL POR LISTA','='.repeat(70),`Início: ${inicioRel}`,`Fim: ${new Date().toLocaleString('pt-BR')}`,`Total: ${total}`,`Executados: ${ok}`,`Pendentes/erros: ${erros}`,'','CONFIGURAÇÃO:',`Transição: ${transicao}`,`Atividade: ${atividade||'(nenhuma)'}`,`Atividade 2: ${atividade2||'(nenhuma)'}`,`Transição 2: ${transicao2||'(nenhuma)'}`,'','PROCESSOS SEM EXECUÇÃO / PARA VERIFICAR:']; if(!pendentes.length) linhas.push('Nenhum.'); else pendentes.forEach(r=>linhas.push(`${r.numero} | ${r.status} | ${r.motivo}`)); linhas.push('','RESULTADO COMPLETO:'); resultados.forEach(r=>linhas.push(`${r.numero} | ${r.status} | ${r.motivo}`)); linhas.push('','LOG DETALHADO:'); seqRelatorio.forEach(r=>linhas.push(`[${r.ts}] ${r.tipo} ${r.msg}`)); linhas.push('',msgFim,'='.repeat(70)); const blob=new Blob([linhas.join('\n')],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='relatorio_pje_lista_'+new Date().toISOString().slice(0,16).replace('T','_').replace(/:/g,'h')+'.txt'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(url); a.remove();},1000);});
}


// ── Lista Manual: abre processo, abre autos e aguarda comando do usuário ─────
function pjeSeqClicarAbrirAutosManual() {
  const xpath = '//*[@id="frameTarefas"]/div/div[2]/button[3]';
  const css = '#frameTarefas > div > div:nth-child(2) > button:nth-child(3)';
  function tentar(doc) {
    if (!doc) return false;
    try {
      const el = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue || doc.querySelector(css);
      if (el) { el.click(); return true; }
    } catch(e) {}
    return false;
  }
  if (tentar(document)) return true;
  for (const fr of document.querySelectorAll('iframe')) {
    try { if (tentar(fr.contentDocument)) return true; } catch(e) {}
  }
  return false;
}

async function pjeSeqExecutarListaManual(numeros) {
  seqCancelado = false;
  const total = numeros.length;
  seqRelatorio = [];

  // Importante: não usa overlay em tela cheia para não bloquear cliques no iframe.
  document.getElementById('pje-seq-progress-overlay')?.remove();

  let painel = document.getElementById('pje-seq-manual-box');
  if (!painel) {
    painel = document.createElement('div');
    painel.id = 'pje-seq-manual-box';
    painel.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:999999;background:#111827;color:white;border-radius:12px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.35);font-family:sans-serif;max-width:360px;min-width:280px;pointer-events:auto;';
    painel.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:6px;">🔎 Lista Manual</div>
      <div id="pje-seq-manual-info" style="font-size:13px;margin-bottom:10px;line-height:1.35;color:#e5e7eb;">Iniciando...</div>
      <div style="display:flex;gap:8px;">
        <button id="pje-seq-proximo-manual" type="button" style="flex:1;padding:10px 12px;border:none;border-radius:8px;background:#16a34a;color:white;font-weight:700;cursor:pointer;font-size:14px;">➡ Próximo</button>
        <button id="pje-seq-parar-manual" type="button" style="padding:10px 12px;border:none;border-radius:8px;background:#dc2626;color:white;font-weight:700;cursor:pointer;font-size:14px;">Parar</button>
      </div>
      <div id="pje-seq-manual-log" style="font-size:11px;color:#cbd5e1;margin-top:8px;max-height:80px;overflow:auto;"></div>`;
    document.body.appendChild(painel);
  }

  const setInfo = (txt) => { const el = document.getElementById('pje-seq-manual-info'); if (el) el.textContent = txt; };
  const addLog = (txt) => { const el = document.getElementById('pje-seq-manual-log'); if (el) { const d = document.createElement('div'); d.textContent = txt; el.appendChild(d); el.scrollTop = el.scrollHeight; } console.log('[PJE Lista Manual]', txt); };
  document.getElementById('pje-seq-parar-manual').onclick = () => { seqCancelado = true; setInfo('⏹ Interrompido.'); };

  function aguardarCliqueProximo(i, numero) {
    return new Promise(resolve => {
      const btn = document.getElementById('pje-seq-proximo-manual');
      if (!btn) return resolve();
      btn.disabled = false;
      btn.textContent = (i >= total - 1) ? '✅ Finalizar' : '➡ Próximo';
      btn.onclick = () => { btn.disabled = true; resolve(); };
      setInfo(`⏸ ${i+1}/${total} — analise ${numero}. A tela está liberada: você pode clicar no iframe e escolher a transição. Depois clique em Próximo.`);
    });
  }

  for (let i = 0; i < numeros.length; i++) {
    if (seqCancelado) break;
    const numero = numeros[i];
    setInfo(`🔎 ${i+1}/${total} — pesquisando ${numero}...`);
    addLog(`Pesquisando ${numero}`);

    const busca = await pjeSeqPesquisarEClicarProcesso(numero, 10000);
    if (!busca || !busca.ok) {
      addLog(`Erro: ${busca ? busca.motivo : 'falha ao pesquisar'}`);
      await aguardarCliqueProximo(i, numero);
      continue;
    }

    await esperar(1000);
    const link2 = pjeSeqEncontrarLinkProcesso(numero);
    if (link2) link2.click();
    addLog(`Processo aberto: ${numero}`);

    setInfo(`📄 ${i+1}/${total} — tentando abrir autos de ${numero}...`);
    await esperar(1200);
    try { await aguardarIframe(4000); } catch(e) {}
    await esperar(600);

    const abriu = pjeSeqClicarAbrirAutosManual();
    addLog(abriu ? 'Autos abertos.' : 'Botão de autos não encontrado; siga manualmente se necessário.');

    await aguardarCliqueProximo(i, numero);
  }

  setInfo(seqCancelado ? '⏹ Modo manual interrompido.' : '✅ Lista manual finalizada.');
  const btn = document.getElementById('pje-seq-proximo-manual');
  if (btn) { btn.textContent = 'Fechar'; btn.disabled = false; btn.onclick = () => document.getElementById('pje-seq-manual-box')?.remove(); }
}

function injetarBotaoSequencial() {
  injetarEstilosSeq();
  if (document.getElementById('pje-seq-btn')) return;

  // Tenta múltiplos seletores de toolbar em ordem de especificidade
  const toolbar =
    document.querySelector('.acoes-processos') ||
    document.querySelector('p-datalist .p-datalist-header') ||
    document.querySelector('[class*="acoes-processo"]') ||
    (() => { const el = document.querySelector('button i[class*="marcar-todos"]'); return el ? el.closest('div') : null; })() ||
    (() => { const el = document.querySelector('processos-tarefa'); return el ? el.querySelector('div') : null; })() ||
    // Fallback: linha que contém o checkbox "marcar todos" (□)
    (() => {
      for (const inp of document.querySelectorAll('input[type="checkbox"]')) {
        const parent = inp.closest('div');
        if (parent && (parent.className || '').includes('header')) return parent;
      }
      return null;
    })() ||
    // Último recurso: qualquer header de lista de processos
    document.querySelector('p-datalist, processos-tarefa, [class*="datalist"]');

  if (!toolbar) return;
  if (toolbar.querySelector('#pje-seq-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'pje-seq-btn';
  btn.innerHTML = '⚡ Sequencial';
  btn.title = 'Ativar seleção para automação sequencial';
  btn.onclick = () => { if (seqModoAtivo) confirmarSel(); else ativarModo(); };
  toolbar.appendChild(btn);
  const btnLista = document.createElement('button');
  btnLista.type = 'button';
  btnLista.id = 'pje-seq-lista-btn';
  btnLista.innerHTML = '📋 Lista';
  btnLista.title = 'Abrir Sequencial por lista de números de processos';
  btnLista.onclick = (e) => { e.preventDefault(); e.stopPropagation(); mostrarDialogSequencialListaDireta(); };
  toolbar.appendChild(btnLista);
  if (typeof injetarBotaoMinutas === 'function') injetarBotaoMinutas(toolbar);
  if (typeof injetarBotaoEtiquetas === 'function') injetarBotaoEtiquetas(toolbar);
  console.log('[PJE] botões Sequencial + Etiquetas injetados em:', toolbar.tagName, toolbar.className);
}

// ── Modal customizado de Tarefas ────────────────────────────────────────────
function pjeMostrarModalTarefasLoading() {
  document.getElementById('pje-tarefas-modal')?.remove();
  if (!document.getElementById('pje-tarefas-modal-style')) {
    const s = document.createElement('style');
    s.id = 'pje-tarefas-modal-style';
    s.textContent = `
      #pje-tarefas-modal {
        position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;
        background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;
      }
      #pje-tarefas-modal-box {
        background:#fff;border-radius:8px;min-width:480px;max-width:82vw;
        max-height:82vh;overflow:hidden;display:flex;flex-direction:column;
        box-shadow:0 8px 32px rgba(0,0,0,.35);
      }
      #pje-tarefas-modal-header {
        background:#1d4ed8;color:#fff;padding:11px 16px;
        display:flex;justify-content:space-between;align-items:center;
        font-weight:700;font-size:14px;gap:8px;
      }
      #pje-tarefas-modal-body {
        padding:16px;overflow-y:auto;max-height:65vh;font-size:13px;
      }
      #pje-tarefas-modal-body table { width:100%;border-collapse:collapse; }
      #pje-tarefas-modal-body td,
      #pje-tarefas-modal-body th { padding:6px 8px;border:1px solid #e5e7eb;vertical-align:top; }
      #pje-tarefas-modal-body th { background:#f1f5f9;font-weight:600; }
      #pje-tarefas-modal-close {
        background:none;border:none;color:#fff;font-size:22px;
        cursor:pointer;line-height:1;padding:0 2px;
      }
    `;
    document.head.appendChild(s);
  }
  const modal = document.createElement('div');
  modal.id = 'pje-tarefas-modal';
  modal.innerHTML = `
    <div id="pje-tarefas-modal-box">
      <div id="pje-tarefas-modal-header">
        <span id="pje-tarefas-modal-titulo">📋 Tarefas Pendentes</span>
        <button id="pje-tarefas-modal-close">✕</button>
      </div>
      <div id="pje-tarefas-modal-body">
        <p style="text-align:center;color:#6b7280;padding:24px 0">
          ⏳ Carregando tarefas...
        </p>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('pje-tarefas-modal-close').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function pjeAtualizarModalTarefas(htmlContent, numProcesso) {
  const body = document.getElementById('pje-tarefas-modal-body');
  if (!body) return;
  if (numProcesso) {
    const titulo = document.getElementById('pje-tarefas-modal-titulo');
    if (titulo) titulo.textContent = '📋 Tarefas — ' + numProcesso;
  }
  body.innerHTML = htmlContent ||
    '<p style="text-align:center;color:#6b7280">Nenhuma tarefa encontrada.</p>';
}

// Recebe resposta do frame-tarefa com os dados de tarefas
window.addEventListener('message', (e) => {
  if (e.data && e.data.pjeTarefasData) {
    pjeAtualizarModalTarefas(e.data.html, e.data.processo);
  }
  // Tarefas capturadas pelo overlay oculto (Feature 4 + Feature 3)
  if (e.data && e.data.pjeTarefasCapturado) {
    // Cancela o timeout de segurança
    clearTimeout(window._pjeOverlayTimeout);
    // Remove overlay oculto (se ainda existir)
    const _ov = document.getElementById('pje-autos-overlay');
    if (_ov && _ov.dataset.autoTarefas) _ov.remove();
    // Remove supressão de dialogs
    document.documentElement.removeAttribute('data-pje-suppress');
    // Remove qualquer modal antigo
    document.getElementById('pje-tarefas-modal')?.remove();
    // Monta HTML formatado com os nomes das tarefas
    let _html = '';
    const _tarefas = e.data.tarefas || [];
    if (_tarefas.length) {
      _html = '<div style="padding:12px">' +
        '<p style="font-weight:bold;margin:0 0 10px;color:#1a3a5c;font-size:14px">📋 Tarefas do Processo</p>' +
        '<ul style="margin:0;padding-left:18px">' +
        _tarefas.map(t => '<li style="margin-bottom:8px;font-size:13px">' + t + '</li>').join('') +
        '</ul></div>';
    } else if (e.data.html) {
      _html = '<div style="font-size:12px;padding:8px;max-height:300px;overflow-y:auto">' + e.data.html + '</div>';
    } else {
      _html = '<p style="padding:8px;color:orange">Nenhuma tarefa encontrada.</p>';
    }
    // Cria o modal do zero e exibe
    if (typeof pjeMostrarModalTarefasLoading === 'function') pjeMostrarModalTarefasLoading();
    if (typeof pjeAtualizarModalTarefas === 'function') pjeAtualizarModalTarefas(_html, e.data.titulo || '');
  }
});

// Fecha o else do bloco de contexto do frame principal
} // end else (frame principal)


// ════════════════════════════════════════════════════════════════════════
// --- FEATURE 7: Etiquetas PJe — versão leve sem travamento ---
// Baseada no modelo enviado pelo usuário.
// IMPORTANTE: não carrega todas as etiquetas ao abrir o painel para evitar travamento.
// O carregamento do PJe é manual, paginado e limitado.
// ════════════════════════════════════════════════════════════════════════
const _pjeCache = { token:'', localizacao:'', app:'pje-tjce-1g', xCookies:'', processos:{} };
const _REGEX_NUM_PJE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
const _PJE_HOST = 'https://pje.tjce.jus.br';
const PJE_ETIQ_FAV_KEY = 'pje_etiquetas_favoritas_v2';
const PJE_ETIQ_CACHE_KEY = 'pje_etiquetas_lista_cache_v5';
const PJE_ETIQ_REMOVIDAS_KEY = 'pje_etiquetas_removidas_v3';
const PJE_ETIQ_PAGE_SIZE = 20;
const PJE_ETIQ_MAX_SCAN = 350;

const PJE_ETIQUETAS_FALLBACK = [
  'JUIZADO - Alvará SAE',
  'JUIZADO - Certificar Trânsito',
  'JUIZADO - Citar/Intimar',
  'JUIZADO - Decurso de Prazo',
  'JUIZADO - Evoluir Classe',
  'JUIZADO - Mandado',
  'JUIZADO - Ofício',
  'JUIZADO - Preparar Comunicação',
  'JUIZADO - Redistribuir'
];

let _etiqDragging = null;
let _etiqAberto = false;
let _dropOk = false;
let _etiqPagina = 1;
let _etiqBusca = '';
let _etiqCarregando = false;
let _etiqLista = [];
let _etiqFavoritas = [];
let _etiqRemovidas = [];

function _pjeEscapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function _pjeNormEtiqueta(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function _pjeUniqEtiquetas(lista) {
  const map = new Map();
  (lista || []).forEach(t => {
    const nome = _pjeNormEtiqueta(t);
    if (!nome || nome.length < 2 || nome.length > 80) return;
    const key = nome.toLowerCase();
    if (!map.has(key)) map.set(key, nome);
  });

  const arr = [...map.values()];
  const prioridades = PJE_ETIQUETAS_FALLBACK.map(x => _pjeNormEtiqueta(x).toLowerCase());

  return arr.sort((a, b) => {
    const ia = prioridades.indexOf(_pjeNormEtiqueta(a).toLowerCase());
    const ib = prioridades.indexOf(_pjeNormEtiqueta(b).toLowerCase());
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b, 'pt-BR');
  });
}
function _pjeCarregarFavoritas() {
  try { _etiqFavoritas = JSON.parse(localStorage.getItem(PJE_ETIQ_FAV_KEY) || '[]').filter(Boolean); }
  catch(e) { _etiqFavoritas = []; }
  _etiqFavoritas = _pjeUniqEtiquetas(_etiqFavoritas);
}
function _pjeSalvarFavoritas() { localStorage.setItem(PJE_ETIQ_FAV_KEY, JSON.stringify(_etiqFavoritas)); }
function _pjeCarregarCacheEtiquetas() {
  try { _etiqLista = JSON.parse(localStorage.getItem(PJE_ETIQ_CACHE_KEY) || '[]').filter(Boolean); }
  catch(e) { _etiqLista = []; }
  try { _etiqRemovidas = JSON.parse(localStorage.getItem(PJE_ETIQ_REMOVIDAS_KEY) || '[]').filter(Boolean); }
  catch(e) { _etiqRemovidas = []; }

  const removidas = new Set(_etiqRemovidas.map(x => _pjeNormEtiqueta(x).toLowerCase()));
  _etiqLista = _pjeUniqEtiquetas([...PJE_ETIQUETAS_FALLBACK, ..._etiqLista])
    .filter(nome => !removidas.has(_pjeNormEtiqueta(nome).toLowerCase()))
    .slice(0, 300);
}
function _pjeSalvarCacheEtiquetas() {
  localStorage.setItem(PJE_ETIQ_CACHE_KEY, JSON.stringify(_pjeUniqEtiquetas(_etiqLista).slice(0, 300)));
  localStorage.setItem(PJE_ETIQ_REMOVIDAS_KEY, JSON.stringify(_pjeUniqEtiquetas(_etiqRemovidas).slice(0, 300)));
}
function _pjeEhFavorita(nome) { return _etiqFavoritas.map(x => x.toLowerCase()).includes(_pjeNormEtiqueta(nome).toLowerCase()); }

function _pjeRemoverEtiquetaDaLista(nome) {
  nome = _pjeNormEtiqueta(nome);
  if (!nome) return;
  const key = nome.toLowerCase();

  _etiqLista = _etiqLista.filter(x => _pjeNormEtiqueta(x).toLowerCase() !== key);
  _etiqFavoritas = _etiqFavoritas.filter(x => _pjeNormEtiqueta(x).toLowerCase() !== key);

  if (PJE_ETIQUETAS_FALLBACK.some(x => _pjeNormEtiqueta(x).toLowerCase() === key)) {
    if (!_etiqRemovidas.some(x => _pjeNormEtiqueta(x).toLowerCase() === key)) _etiqRemovidas.push(nome);
  }

  _pjeSalvarFavoritas();
  _pjeSalvarCacheEtiquetas();
  renderizarEtiquetasPainel();
}

function _pjeToggleFavorita(nome) {
  nome = _pjeNormEtiqueta(nome);
  const idx = _etiqFavoritas.findIndex(x => x.toLowerCase() === nome.toLowerCase());
  if (idx >= 0) _etiqFavoritas.splice(idx, 1);
  else _etiqFavoritas.push(nome);
  _etiqFavoritas = _pjeUniqEtiquetas(_etiqFavoritas);
  _pjeSalvarFavoritas();
  renderizarEtiquetasPainel();
}

function _pjeFindTokenStorage() {
  const jwtRegex = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/;
  const storages = [];
  try { storages.push(localStorage); } catch(e) {}
  try { storages.push(sessionStorage); } catch(e) {}
  for (const st of storages) {
    for (let i = 0; i < st.length; i++) {
      const val = st.getItem(st.key(i)) || '';
      const direto = val.match(jwtRegex);
      if (direto) return direto[0];
      try {
        const obj = JSON.parse(val);
        for (const c of [obj.access_token, obj.accessToken, obj.token, obj.id_token, obj.idToken].filter(Boolean)) {
          const m = String(c).match(jwtRegex);
          if (m) return m[0];
        }
      } catch(e) {}
    }
  }
  return '';
}
function _pjeFindLocalizacaoStorage() {
  try {
    for (const k of ['pje_usuario_localizacao','pje-localizacao','usuarioLocalizacao','idLocalizacao','localizacao']) {
      const v = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (v && /^\d+$/.test(v)) return v;
    }
    const tudo = [...Object.keys(localStorage).map(k => localStorage.getItem(k)), ...Object.keys(sessionStorage).map(k => sessionStorage.getItem(k))].join(' ');
    const m = tudo.match(/"idLocalizacao"\s*:\s*(\d+)/) || tudo.match(/"localizacao"\s*:\s*(\d+)/) || tudo.match(/"idOrgaoJulgadorCargo"\s*:\s*(\d+)/);
    if (m) return m[1];
  } catch(e) {}
  return '407072';
}

(function iniciarCapturaHeadersEtiquetas() {
  if (window.__pjeEtiqFetchPatch) return;
  window.__pjeEtiqFetchPatch = true;
  const _orig = window.fetch.bind(window);
  window.fetch = async function(resource, init) {
    try {
      const h = (init && init.headers) || {};
      const g = k => (h[k] || h[k.toLowerCase()] || (h.get ? h.get(k) : '') || '');
      const auth = g('Authorization') || g('authorization');
      if (auth && auth.startsWith('Bearer ')) _pjeCache.token = auth.slice(7);
      const loc = g('x-pje-usuario-localizacao'); if (loc) _pjeCache.localizacao = loc;
      const app = g('x-pje-legacy-app');          if (app) _pjeCache.app = app;
      const ck  = g('x-pje-cookies');             if (ck)  _pjeCache.xCookies = ck;
    } catch(e) {}
    const resp = await _orig(resource, init);
    try {
      const url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
      if (url.includes('painelUsuario') || url.includes('tarefa') || url.includes('processo')) {
        resp.clone().json().then(data => {
          const listas = [data, data?.lista, data?.processos, data?.content, data?.data, data?.items, data?.tarefas].filter(Array.isArray);
          for (const lista of listas) {
            lista.forEach(p => {
              const id = String(p.id || p.idProcesso || p.codigoProcesso || p.processoCodigo || p.processo?.id || p.processo?.idProcesso || '');
              const num = String(p.numeroProcesso || p.numero || p.nrProcesso || p.processo?.numero || p.processo?.numeroProcesso || '');
              const m = num.match(_REGEX_NUM_PJE);
              if (id && m) _pjeCache.processos[m[0]] = { id, numero: m[0] };
            });
          }
        }).catch(() => {});
      }
    } catch(e) {}
    return resp;
  };
})();

function _iniciarObserverIframes() {
  if (window.__pjeEtiqIframeObs) return;
  window.__pjeEtiqIframeObs = true;
  const _registrar = (src) => {
    if (!src) return;
    const mId = String(src).match(/[?&]idProcesso=(\d+)/i) || String(src).match(/processo\.codigo=(\d+)/i) || String(src).match(/[?&]processo=(\d+)/i);
    if (!mId) return;
    const id = mId[1];
    for (const sel of ['.datalist-content.selecionado','[class*="selecionado"]','.pmr-destaque-selecionado','[class*="cabecalho"]','h4','h3']) {
      for (const el of document.querySelectorAll(sel)) {
        const m = (el.innerText || el.textContent || '').match(_REGEX_NUM_PJE);
        if (m) { _pjeCache.processos[m[0]] = { id, numero: m[0] }; console.log('[PJE Etiquetas] cache via iframe:', m[0], id); return; }
      }
    }
  };
  document.querySelectorAll('iframe').forEach(f => _registrar(f.src || f.getAttribute('src') || ''));
  new MutationObserver(muts => {
    muts.forEach(mut => {
      mut.addedNodes.forEach(node => {
        if (node.nodeName === 'IFRAME') _registrar(node.src || node.getAttribute('src') || '');
        node.querySelectorAll?.('iframe').forEach(f => _registrar(f.src || f.getAttribute('src') || ''));
      });
      if (mut.type === 'attributes' && mut.target.nodeName === 'IFRAME') _registrar(mut.target.src || mut.target.getAttribute('src') || '');
    });
  }).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['src'] });
}

function _escanearCards() {
  document.querySelectorAll('a[href*="processo.codigo="], a[href*="idProcesso="], a[href*="processo="]').forEach(a => {
    const href = a.getAttribute('href') || a.href || '';
    const m = href.match(/processo\.codigo=([^&\s]+)/) || href.match(/idProcesso=([^&\s]+)/) || href.match(/[?&]processo=([^&\s]+)/);
    if (!m) return;
    const id = String(m[1]).trim();
    let cur = a;
    for (let i = 0; i < 12 && cur; i++) {
      const nm = (cur.innerText || cur.textContent || '').match(_REGEX_NUM_PJE);
      if (nm) { _pjeCache.processos[nm[0]] = { id, numero:nm[0] }; return; }
      cur = cur.parentElement;
    }
  });
}

function encontrarCardProcesso(el) {
  let cur = el;
  for (let i = 0; i < 20 && cur; i++) {
    if (cur.nodeType === 1) {
      const m = (cur.innerText || cur.textContent || '').match(_REGEX_NUM_PJE);
      if (m) return { elemento:cur, numeroProcesso:m[0] };
    }
    cur = cur.parentElement;
  }
  return null;
}

function _buildHeaders() {
  const token = _pjeCache.token || _pjeFindTokenStorage();
  const localizacao = _pjeCache.localizacao || _pjeFindLocalizacaoStorage();
  const h = {
    'accept':'application/json, text/plain, */*',
    'content-type':'application/json',
    'x-pje-legacy-app':_pjeCache.app || 'pje-tjce-1g',
    'x-pje-usuario-localizacao':localizacao
  };
  if (token) h['authorization'] = `Bearer ${token}`;
  if (_pjeCache.xCookies) h['x-pje-cookies'] = _pjeCache.xCookies;
  return h;
}

async function obterIdProcesso(numeroProcesso) {
  if (_pjeCache.processos[numeroProcesso]?.id) return _pjeCache.processos[numeroProcesso].id;
  _escanearCards();
  if (_pjeCache.processos[numeroProcesso]?.id) return _pjeCache.processos[numeroProcesso].id;
  const h = { accept:'application/json' };
  const token = _pjeCache.token || _pjeFindTokenStorage();
  const localizacao = _pjeCache.localizacao || _pjeFindLocalizacaoStorage();
  if (token) h.authorization = `Bearer ${token}`;
  if (localizacao) h['x-pje-usuario-localizacao'] = localizacao;
  if (_pjeCache.app) h['x-pje-legacy-app'] = _pjeCache.app;
  for (const path of [
    `/pje1grau/seam/resource/rest/pje-legacy/processos/buscar?numero=${encodeURIComponent(numeroProcesso)}`,
    `/pje1grau/seam/resource/rest/pje-legacy/painelUsuario/processos?numero=${encodeURIComponent(numeroProcesso)}&page=0&size=1`,
  ]) {
    try {
      const r = await fetch(_PJE_HOST + path, { credentials:'include', headers:h });
      if (!r.ok) continue;
      const d = await r.json();
      const lista = Array.isArray(d) ? d : (d?.lista || d?.content || d?.data || [d]);
      for (const p of lista) {
        const id = String(p.id || p.idProcesso || p.codigoProcesso || p.processoCodigo || '');
        const num = String(p.numeroProcesso || p.numero || numeroProcesso);
        if (id) { _pjeCache.processos[num] = { id, numero:num }; if (num === numeroProcesso || !p.numeroProcesso) return id; }
      }
    } catch(e) {}
  }
  return '';
}

function exibirEtiquetaNoCard(cardElemento, tag) {
  if (!cardElemento) return;
  const nome = _pjeNormEtiqueta(tag);
  if (!nome) return;
  const labels = Array.from(cardElemento.querySelectorAll('.label-etiqueta, .pje-etiq-local'));
  if (labels.some(el => (el.textContent || '').replace('×','').trim().toLowerCase() === nome.toLowerCase())) return;
  const destino = cardElemento.querySelector('.col-sm-11.no-padding.pt-5') || cardElemento.querySelector('a.selecionarProcesso')?.parentElement || cardElemento;
  const div = document.createElement('div');
  div.className = 'label label-info label-etiqueta ng-star-inserted pje-etiq-local';
  div.style.cssText = 'display:inline-block;background:#5bc0de;color:#fff;border-radius:3px;padding:3px 7px;margin:4px 4px 0 0;font-size:12px;font-weight:600;line-height:1.2;vertical-align:middle;';
  div.innerHTML = '<span>' + _pjeEscapeHtml(nome) + '</span>';
  destino.appendChild(div);
}

async function aplicarEtiqueta(tag, idProcesso, numeroProcesso) {
  const tagFinal = _pjeNormEtiqueta(tag);
  if (!tagFinal) {
    mostrarToastEtiq('⚠️ Etiqueta vazia ou inválida.', 'err');
    return false;
  }

  let idFinal = idProcesso || await obterIdProcesso(numeroProcesso);
  if (!idFinal) {
    mostrarToastEtiq(`⚠️ ID não encontrado para ${numeroProcesso}.
Clique no processo 1x, aguarde carregar e tente novamente.`, 'err');
    return false;
  }

  const payload = JSON.stringify([{ tag: tagFinal, idProcesso:String(idFinal), numeroProcesso }]);
  const url = _PJE_HOST + '/pje1grau/seam/resource/rest/pje-legacy/painelUsuario/processoTags/inserir';
  try {
    const r = await fetch(url, { method:'POST', credentials:'include', mode:'cors', headers:_buildHeaders(), body:payload });
    if (r.ok) { mostrarToastEtiq(`✅ "${tagFinal}" aplicada em ${numeroProcesso}`, 'ok'); return true; }
    const txt = await r.text().catch(() => '');
    mostrarToastEtiq(`❌ Erro ${r.status}: ${txt.slice(0,180)}`, 'err');
    return false;
  } catch(e) {
    mostrarToastEtiq(`❌ Rede: ${e.message}`, 'err');
    return false;
  }
}

function extrairEtiquetasDoDOMGerenciador() {
  const nomes = [];
  const palavrasIgnorar = /^(salvar|fechar|cancelar|excluir|editar|nova etiqueta|adicionar|pesquisar|buscar|limpar|sim|não|ok|ações|etiquetas|gerenciar etiquetas)$/i;

  // NÃO varrer o body inteiro: isso causava "página não está respondendo".
  const containers = Array.from(document.querySelectorAll(
    '[role="dialog"], .modal, .modal-dialog, .modal-content, .cdk-overlay-pane, .ui-dialog, p-dialog, ngb-modal-window, [class*="modal"], [class*="dialog"]'
  )).filter(el => (el.textContent || '').toLowerCase().includes('etiqueta'));

  const raiz = containers[0];
  if (!raiz) {
    console.warn('[PJE Etiquetas] Janela de gerenciamento não encontrada para extração segura.');
    return nomes;
  }

  const candidatos = Array.from(raiz.querySelectorAll(
    '.label-etiqueta, [class*="etiqueta"], [class*="tag"], td, li, span, label, a, button'
  )).slice(0, PJE_ETIQ_MAX_SCAN);

  for (const el of candidatos) {
    const txt = _pjeNormEtiqueta(el.textContent || el.value || el.title || '');
    if (!txt || txt.length < 2 || txt.length > 80) continue;
    if (txt.includes('\n')) continue;
    if (_REGEX_NUM_PJE.test(txt)) continue;
    if (palavrasIgnorar.test(txt)) continue;
    if (/^\d+$/.test(txt)) continue;
    if (txt.split(' ').length > 8) continue;
    nomes.push(txt.replace(/^🏷️?\s*/, ''));
  }
  return _pjeUniqEtiquetas(nomes);
}

async function carregarTodasEtiquetasPJe(forcar) {
  // DESATIVADO temporariamente para evitar travamento da página.
  // O carregamento via btn-gerenciar-etiquetas pode abrir uma árvore DOM grande no PJe.
  // Nesta versão leve, usamos apenas etiquetas padrão + favoritas + etiquetas adicionadas manualmente.
  mostrarToastEtiq('⚠️ Carregamento automático do PJe desativado para evitar travamento. Use o campo "Adicionar etiqueta".', 'err');
  return;
}

_iniciarObserverIframes();
_pjeCarregarFavoritas();
_pjeCarregarCacheEtiquetas();

function injetarEstilosEtiquetas() {
  if (document.getElementById('pje-etiq-style')) return;
  const s = document.createElement('style');
  s.id = 'pje-etiq-style';
  s.textContent = `
    #pje-etiq-btn{background:#0f766e;color:white;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:13px;font-weight:bold;margin-left:6px;white-space:nowrap;transition:background .15s;}
    #pje-etiq-btn:hover{background:#0d9488;}
    #pje-etiq-painel{position:fixed;z-index:99999;background:#fff;border:1.5px solid #d1d5db;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.18);padding:12px 14px;width:390px;height:auto;min-width:310px;min-height:260px;max-width:92vw;max-height:88vh;top:70px;right:24px;overflow:auto;resize:both;display:flex;flex-direction:column;}
    #pje-etiq-painel h4{margin:0 0 8px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:6px;cursor:move;display:flex;align-items:center;justify-content:space-between;gap:8px;user-select:none;}
    #pje-etiq-fechar{border:none;background:#ef4444;color:white;border-radius:6px;padding:2px 8px;font-size:13px;font-weight:700;cursor:pointer;line-height:1.4;}
    #pje-etiq-fechar:hover{background:#dc2626;}
    #pje-etiq-painel.pje-etiq-arrastando{opacity:.92;box-shadow:0 12px 38px rgba(0,0,0,.28);}
    .pje-etiq-topbar{display:flex;gap:6px;margin-bottom:8px;}
    .pje-etiq-topbar input{flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;}
    .pje-etiq-topbar button,.pje-etiq-page button{padding:5px 8px;border:none;border-radius:6px;background:#e5e7eb;color:#374151;cursor:pointer;font-size:12px;font-weight:600;}
    .pje-etiq-topbar button:hover,.pje-etiq-page button:hover{background:#d1d5db;}
    .pje-etiq-section-title{font-size:11px;font-weight:700;color:#4b5563;margin:6px 0 4px;text-transform:uppercase;letter-spacing:.04em;}
    .pje-etiq-chip-area{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;overflow:auto;}
    .pje-etiq-chip-row{display:inline-flex;align-items:center;border-radius:20px;box-shadow:0 2px 6px rgba(0,0,0,.12);overflow:hidden;background:#0f766e;margin:2px;}
    .pje-etiq-chip{display:inline-flex;align-items:center;padding:6px 10px;color:white;font-size:12px;font-weight:600;cursor:grab;user-select:none;max-width:285px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .pje-etiq-star{border:none;background:rgba(255,255,255,.18);color:#fff;cursor:pointer;padding:6px 7px;font-size:12px;}
    .pje-etiq-star.fav{background:#f59e0b;color:#111827;}
    .pje-etiq-del{border:none;background:rgba(185,28,28,.90);color:#fff;cursor:pointer;padding:6px 7px;font-size:12px;font-weight:700;}
    .pje-etiq-del:hover{background:#991b1b;}
    .pje-etiq-chip:active{cursor:grabbing;opacity:.75;}
    .pje-etiq-favs{max-height:120px;}
    .pje-etiq-lista{min-height:110px;max-height:300px;}
    .pje-etiq-page{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:8px;font-size:12px;color:#4b5563;}
    .pje-etiq-instrucao{font-size:11px;color:#6b7280;text-align:center;margin-top:6px;line-height:1.35;}
    .pje-etiq-drop-over{outline:3px dashed #0f766e !important;outline-offset:2px;background:rgba(15,118,110,.06) !important;}
    #pje-etiq-toast{position:fixed;bottom:28px;right:28px;z-index:999999;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:500;opacity:0;transition:opacity .3s;pointer-events:none;max-width:460px;white-space:pre-line;}
    #pje-etiq-toast.show{opacity:1;}
  `;
  document.head.appendChild(s);
}

function mostrarToastEtiq(msg, tipo) {
  let t = document.getElementById('pje-etiq-toast');
  if (!t) { t = document.createElement('div'); t.id = 'pje-etiq-toast'; document.body.appendChild(t); }
  t.style.background = tipo === 'ok' ? '#065f46' : tipo === 'err' ? '#991b1b' : '#1f2937';
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 5000);
}

function criarChipEtiqueta(nome, cor) {
  nome = _pjeNormEtiqueta(nome);
  const row = document.createElement('span');
  row.className = 'pje-etiq-chip-row';
  row.style.background = cor || (_pjeEhFavorita(nome) ? '#f59e0b' : '#0f766e');

  const chip = document.createElement('span');
  chip.className = 'pje-etiq-chip';
  chip.textContent = nome;
  chip.title = nome;
  chip.draggable = true;
  chip.addEventListener('dragstart', e => { _etiqDragging = nome; e.dataTransfer.setData('text/plain', nome); });
  chip.addEventListener('dragend', () => { _etiqDragging = null; document.querySelectorAll('.pje-etiq-drop-over').forEach(x => x.classList.remove('pje-etiq-drop-over')); });

  const star = document.createElement('button');
  star.type = 'button';
  star.className = 'pje-etiq-star' + (_pjeEhFavorita(nome) ? ' fav' : '');
  star.textContent = _pjeEhFavorita(nome) ? '★' : '☆';
  star.title = _pjeEhFavorita(nome) ? 'Remover dos favoritos' : 'Favoritar etiqueta';
  star.onclick = (e) => { e.preventDefault(); e.stopPropagation(); _pjeToggleFavorita(nome); };

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'pje-etiq-del';
  del.textContent = '×';
  del.title = 'Remover esta etiqueta da lista';
  del.onclick = (e) => { e.preventDefault(); e.stopPropagation(); _pjeRemoverEtiquetaDaLista(nome); };

  row.appendChild(chip);
  row.appendChild(star);
  row.appendChild(del);
  return row;
}

function renderizarEtiquetasPainel() {
  const p = document.getElementById('pje-etiq-painel');
  if (!p) return;
  const favArea = p.querySelector('#pje-etiq-favs');
  const listArea = p.querySelector('#pje-etiq-lista');
  const pageInfo = p.querySelector('#pje-etiq-page-info');
  if (!favArea || !listArea || !pageInfo) return;

  favArea.innerHTML = '';
  _etiqFavoritas.forEach(nome => favArea.appendChild(criarChipEtiqueta(nome, '#f59e0b')));
  if (!_etiqFavoritas.length) favArea.innerHTML = '<span style="font-size:12px;color:#9ca3af">Nenhuma favorita ainda. Clique na estrela ☆ para destacar.</span>';

  const filtradas = _pjeUniqEtiquetas(_etiqLista).filter(nome => !_etiqBusca || nome.toLowerCase().includes(_etiqBusca.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtradas.length / PJE_ETIQ_PAGE_SIZE));
  if (_etiqPagina > totalPages) _etiqPagina = totalPages;
  if (_etiqPagina < 1) _etiqPagina = 1;
  const ini = (_etiqPagina - 1) * PJE_ETIQ_PAGE_SIZE;
  const page = filtradas.slice(ini, ini + PJE_ETIQ_PAGE_SIZE);

  listArea.innerHTML = '';
  page.forEach(nome => listArea.appendChild(criarChipEtiqueta(nome, _pjeEhFavorita(nome) ? '#f59e0b' : '#0f766e')));
  if (!page.length) listArea.innerHTML = '<span style="font-size:12px;color:#9ca3af">Nenhuma etiqueta encontrada.</span>';
  pageInfo.textContent = `${filtradas.length} etiqueta(s) • página ${_etiqPagina}/${totalPages}`;

  const prev = p.querySelector('#pje-etiq-prev');
  const next = p.querySelector('#pje-etiq-next');
  if (prev) prev.disabled = _etiqPagina <= 1;
  if (next) next.disabled = _etiqPagina >= totalPages;
}


function _pjeEtiqSalvarPosicaoPainel(p) {
  try { localStorage.setItem('pje_etiq_painel_pos', JSON.stringify({ left: p.style.left, top: p.style.top })); } catch(e) {}
}
function _pjeEtiqAplicarPosicaoSalva(p) {
  try {
    const pos = JSON.parse(localStorage.getItem('pje_etiq_painel_pos') || '{}');
    if (pos.left && pos.top) { p.style.left = pos.left; p.style.top = pos.top; p.style.right = 'auto'; }
  } catch(e) {}
}
function _pjeEtiqSalvarTamanhoPainel(p) {
  try {
    const rect = p.getBoundingClientRect();
    localStorage.setItem('pje_etiq_painel_size', JSON.stringify({ width: Math.round(rect.width), height: Math.round(rect.height) }));
  } catch(e) {}
}
function _pjeEtiqAplicarTamanhoSalvo(p) {
  try {
    const s = JSON.parse(localStorage.getItem('pje_etiq_painel_size') || '{}');
    if (s.width && s.height) {
      p.style.width = Math.max(310, Math.min(Number(s.width), window.innerWidth * 0.92)) + 'px';
      p.style.height = Math.max(260, Math.min(Number(s.height), window.innerHeight * 0.88)) + 'px';
    }
  } catch(e) {}
}
function _pjeEtiqAtivarResizePainel(p) {
  if (!p || p.dataset.resizeOk === '1') return;
  p.dataset.resizeOk = '1';
  let timer = null;
  try {
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => _pjeEtiqSalvarTamanhoPainel(p), 250);
    });
    ro.observe(p);
  } catch(e) {
    p.addEventListener('mouseup', () => _pjeEtiqSalvarTamanhoPainel(p));
  }
}
function _pjeEtiqAtivarArrastePainel(p) {
  if (!p || p.dataset.dragOk === '1') return;
  p.dataset.dragOk = '1';
  const header = p.querySelector('#pje-etiq-header') || p.querySelector('h4');
  if (!header) return;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0, movendo = false;
  header.addEventListener('mousedown', function(e) {
    if (e.target && e.target.closest && e.target.closest('#pje-etiq-fechar')) return;
    movendo = true;
    const rect = p.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY; startLeft = rect.left; startTop = rect.top;
    p.style.left = rect.left + 'px'; p.style.top = rect.top + 'px'; p.style.right = 'auto';
    p.classList.add('pje-etiq-arrastando');
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!movendo) return;
    const largura = p.offsetWidth || 390;
    const altura = p.offsetHeight || 300;
    let left = startLeft + (e.clientX - startX);
    let top = startTop + (e.clientY - startY);
    left = Math.max(6, Math.min(left, window.innerWidth - largura - 6));
    top = Math.max(6, Math.min(top, window.innerHeight - Math.min(altura, window.innerHeight - 12) - 6));
    p.style.left = left + 'px'; p.style.top = top + 'px';
  });
  document.addEventListener('mouseup', function() {
    if (!movendo) return;
    movendo = false;
    p.classList.remove('pje-etiq-arrastando');
    _pjeEtiqSalvarPosicaoPainel(p);
  });
}

function garantirPainel() {
  injetarEstilosEtiquetas();
  if (!document.getElementById('pje-etiq-toast')) {
    const t = document.createElement('div'); t.id = 'pje-etiq-toast'; document.body.appendChild(t);
  }
  let p = document.getElementById('pje-etiq-painel');
  if (!p) {
    p = document.createElement('div');
    p.id = 'pje-etiq-painel';
    p.innerHTML = `
      <h4 id="pje-etiq-header"><span>🏷️ Etiquetas — arraste para o processo</span><button id="pje-etiq-fechar" type="button" title="Fechar">×</button></h4>
      <div class="pje-etiq-topbar">
        <input id="pje-etiq-busca" type="text" placeholder="Buscar etiqueta...">
      </div>
      <div class="pje-etiq-topbar">
        <input id="pje-etiq-manual" type="text" placeholder="Adicionar etiqueta pelo nome exato...">
        <button id="pje-etiq-add" type="button">+ Adicionar</button>
      </div>
      <div class="pje-etiq-section-title">⭐ Favoritas</div>
      <div class="pje-etiq-chip-area pje-etiq-favs" id="pje-etiq-favs"></div>
      <div class="pje-etiq-section-title">Todas as etiquetas</div>
      <div class="pje-etiq-chip-area pje-etiq-lista" id="pje-etiq-lista"></div>
      <div class="pje-etiq-page">
        <button id="pje-etiq-prev" type="button">← Anterior</button>
        <span id="pje-etiq-page-info"></span>
        <button id="pje-etiq-next" type="button">Próxima →</button>
      </div>
      <div class="pje-etiq-instrucao">As etiquetas JUIZADO aparecem por padrão. Use ☆ para favoritar, × para remover e arraste o canto inferior direito para redimensionar.</div>`;
    document.body.appendChild(p);

    p.querySelector('#pje-etiq-busca').oninput = (e) => { _etiqBusca = e.target.value || ''; _etiqPagina = 1; renderizarEtiquetasPainel(); };
    const addBtn = p.querySelector('#pje-etiq-add');
    const manualInput = p.querySelector('#pje-etiq-manual');
    if (addBtn && manualInput) {
      addBtn.onclick = () => {
        const nome = _pjeNormEtiqueta(manualInput.value || '');
        if (!nome) return;
        _etiqRemovidas = _etiqRemovidas.filter(x => _pjeNormEtiqueta(x).toLowerCase() !== nome.toLowerCase());
        _etiqLista = _pjeUniqEtiquetas([nome, ..._etiqLista]).slice(0, 300);
        _pjeSalvarCacheEtiquetas();
        manualInput.value = '';
        _etiqBusca = '';
        const busca = p.querySelector('#pje-etiq-busca');
        if (busca) busca.value = '';
        _etiqPagina = 1;
        renderizarEtiquetasPainel();
      };
      manualInput.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
    }
    p.querySelector('#pje-etiq-prev').onclick = () => { _etiqPagina--; renderizarEtiquetasPainel(); };
    p.querySelector('#pje-etiq-next').onclick = () => { _etiqPagina++; renderizarEtiquetasPainel(); };
  }
  p.style.display = _etiqAberto ? 'flex' : 'none';

  _pjeEtiqAplicarPosicaoSalva(p);
  _pjeEtiqAplicarTamanhoSalvo(p);
  _pjeEtiqAtivarArrastePainel(p);
  _pjeEtiqAtivarResizePainel(p);
  const fecharEtiq = p.querySelector('#pje-etiq-fechar');
  if (fecharEtiq && fecharEtiq.dataset.bound !== '1') {
    fecharEtiq.dataset.bound = '1';
    fecharEtiq.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      _etiqAberto = false;
      p.style.display = 'none';
    };
  }
  renderizarEtiquetasPainel();
}

function ativarDrop() {
  if (_dropOk) return;
  _dropOk = true;
  document.addEventListener('dragover', e => {
    if (!_etiqDragging) return;
    document.querySelectorAll('.pje-etiq-drop-over').forEach(x => x.classList.remove('pje-etiq-drop-over'));
    const card = encontrarCardProcesso(e.target);
    if (card) { e.preventDefault(); card.elemento.classList.add('pje-etiq-drop-over'); }
  }, true);
  document.addEventListener('drop', async e => {
    if (!_etiqDragging) return;
    document.querySelectorAll('.pje-etiq-drop-over').forEach(x => x.classList.remove('pje-etiq-drop-over'));
    const card = encontrarCardProcesso(e.target);
    if (!card) return;
    e.preventDefault(); e.stopPropagation();
    const tag = _pjeNormEtiqueta(_etiqDragging);
    _etiqDragging = null;
    mostrarToastEtiq(`⏳ Aplicando "${tag.trim()}" em ${card.numeroProcesso}...`, 'info');
    const ok = await aplicarEtiqueta(tag, _pjeCache.processos[card.numeroProcesso]?.id || '', card.numeroProcesso);
    if (ok) exibirEtiquetaNoCard(card.elemento, tag);
  }, true);
}

function injetarBotaoEtiquetas(toolbar) {
  if (document.getElementById('pje-etiq-btn')) return;
  injetarEstilosEtiquetas();
  const btn = document.createElement('button');
  btn.id = 'pje-etiq-btn';
  btn.innerHTML = '🏷️ Etiquetas';
  btn.title = 'Etiquetas por drag-and-drop';
  btn.onclick = () => { _etiqAberto = !_etiqAberto; garantirPainel(); };
  toolbar.appendChild(btn);
  ativarDrop(); garantirPainel();
}

function _manterPainelEtiquetas() {
  injetarEstilosEtiquetas();
  ativarDrop();
  _escanearCards();
  // Não renderiza a lista a cada 500ms; isso evita travamento.
  if (_etiqAberto && !document.getElementById('pje-etiq-painel')) garantirPainel();
  if (!document.getElementById('pje-etiq-toast')) {
    const t = document.createElement('div'); t.id = 'pje-etiq-toast'; document.body.appendChild(t);
  }
}

// --- OBSERVERS E INTERVALOS ---
const observer = new MutationObserver(() => {
  injetarEmTodosOsCampos(); injetarBotaoToken();
  melhorarCheckboxesAtividades(); injetarBotaoTarefasAngular();
  if (typeof _manterPainelEtiquetas === 'function') _manterPainelEtiquetas();
  if (typeof injetarBotaoSequencial === 'function') injetarBotaoSequencial();
});
observer.observe(document.body, { childList: true, subtree: true });

setInterval(() => {
  injetarEmTodosOsCampos(); injetarBotaoToken();
  melhorarCheckboxesAtividades(); injetarBotaoTarefasAngular();
  if (typeof _manterPainelEtiquetas === 'function') _manterPainelEtiquetas();
  if (typeof injetarBotaoSequencial === 'function') injetarBotaoSequencial();
}, 500);


// ======================= FEATURE 8: MINUTAR + MINIPAC =======================
function pjeMinutasObterFrameTarefa(){return document.querySelector('iframe[name="frame-tarefa"], iframe#frame-tarefa, iframe[src*="movimentar.seam"]');}
function pjeMinutasWait(ms){return new Promise(r=>setTimeout(r,ms));}
function pjeMinutasXPathPrincipal(xpath){try{return document.evaluate(xpath,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;}catch(e){return null;}}
async function pjeMinutasEncaminharParaAssinaturaAngular(){try{if(typeof abrirDropdownTransicoes==='function')abrirDropdownTransicoes();else{const b=document.querySelector('#btnTransicoesTarefa, #btnTransicoesTarefa i, button[id*="btnTransicoesTarefa"]');if(b)b.click();}}catch(e){}await pjeMinutasWait(900);let t=pjeMinutasXPathPrincipal('//*[@id="frameTarefas"]/div/div[2]/div[2]/ul/li[2]/a');if(!t)t=document.querySelector('#frameTarefas > div > div:nth-child(2) > div:nth-child(2) > ul > li:nth-child(2) > a');if(!t){try{if(typeof aguardarTransicao==='function')t=await aguardarTransicao('Encaminhar para assinatura',3000);}catch(e){}}if(!t)t=Array.from(document.querySelectorAll('#frameTarefas a, a, button, li, span')).find(el=>(el.textContent||'').trim().toLowerCase().includes('encaminhar para assinatura'));if(!t){alert('Minutas: não encontrei a transição "Encaminhar para assinatura".');return;}(t.closest('a,button')||t).click();}
function pjeMinutasMostrarPainelContinuar(){document.getElementById('pje-minutas-continuar-box')?.remove();const box=document.createElement('div');box.id='pje-minutas-continuar-box';box.style.cssText='position:fixed;right:18px;bottom:18px;z-index:999999;background:#111827;color:white;border-radius:12px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.35);font-family:sans-serif;max-width:360px;min-width:280px;';box.innerHTML=`<div style="font-weight:700;font-size:14px;margin-bottom:6px;">⚖️ Minutas — Despacho</div><div style="font-size:13px;margin-bottom:10px;line-height:1.35;color:#e5e7eb;">Tipo/modelo preparados. Preencha/conferira o despacho. Quando terminar, clique abaixo para salvar e encaminhar para assinatura.</div><div style="display:flex;gap:8px;"><button id="pje-minutas-salvar-assinar" type="button" style="flex:1;padding:10px 12px;border:none;border-radius:8px;background:#16a34a;color:white;font-weight:700;cursor:pointer;font-size:13px;">💾 Salvar e assinatura</button><button id="pje-minutas-cancelar-painel" type="button" style="padding:10px 12px;border:none;border-radius:8px;background:#dc2626;color:white;font-weight:700;cursor:pointer;font-size:13px;">Fechar</button></div>`;document.body.appendChild(box);document.getElementById('pje-minutas-cancelar-painel').onclick=()=>box.remove();document.getElementById('pje-minutas-salvar-assinar').onclick=()=>{const fr=pjeMinutasObterFrameTarefa();if(!fr||!fr.contentWindow){alert('Iframe da tarefa não encontrado.');return;}fr.contentWindow.postMessage({pjeMinutas:true,tipo:'MINUTA_SALVAR'},'*');};}
function pjeAbrirModalMinutas(){document.getElementById('pje-minutas-modal-overlay')?.remove();const ov=document.createElement('div');ov.id='pje-minutas-modal-overlay';ov.style='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999999;display:flex;align-items:center;justify-content:center;';ov.innerHTML=`<div style="background:white;padding:20px;border-radius:10px;width:520px;max-width:95vw;font-family:sans-serif;box-shadow:0 8px 40px rgba(0,0,0,.35);"><h3 style="margin:0 0 14px;color:#075985;">⚖️ Minutar</h3><div style="display:flex;gap:8px;margin-bottom:14px;"><button class="pje-min-tab" data-tab="despacho" style="flex:1;padding:8px;border:none;border-radius:6px;background:#1d4ed8;color:white;font-weight:700;cursor:pointer;">Despacho</button><button class="pje-min-tab" data-tab="minipac" style="flex:1;padding:8px;border:none;border-radius:6px;background:#e5e7eb;color:#374151;font-weight:700;cursor:pointer;">Configurar MiniPAC</button></div><div id="pje-min-tab-despacho"><div style="font-size:13px;color:#555;margin-bottom:12px;line-height:1.4;">Função: <b>Despacho</b><br>Modelo padrão: <b>Cobrança de Mandados NV 1</b></div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Modelo da minuta</label><input id="pje-minuta-modelo" style="width:100%;box-sizing:border-box;margin-bottom:12px;padding:8px;border:1px solid #d1d5db;border-radius:6px;" value="Cobrança de Mandados NV 1"><button id="pje-minuta-iniciar" style="background:#1d4ed8;color:white;padding:9px;border:none;border-radius:6px;width:100%;font-weight:700;cursor:pointer;">▶ Preparar despacho no processo aberto</button></div><div id="pje-min-tab-minipac" style="display:none;"><div style="font-size:13px;color:#555;margin-bottom:12px;line-height:1.4;">Configura somente o MiniPAC do processo aberto.</div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Polo</label><select id="pje-minipac-polo" style="width:100%;box-sizing:border-box;margin-bottom:10px;padding:8px;border:1px solid #d1d5db;border-radius:6px;"><option value="ativo">Polo Ativo</option><option value="passivo">Polo Passivo</option></select><label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Tipo de comunicação</label><select id="pje-minipac-tipo" style="width:100%;box-sizing:border-box;margin-bottom:10px;padding:8px;border:1px solid #d1d5db;border-radius:6px;"><option value="Citaçao">Citaçao</option><option value="Intimaçao">Intimaçao</option></select><label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Prazo</label><input id="pje-minipac-prazo" type="number" min="1" value="15" style="width:100%;box-sizing:border-box;margin-bottom:12px;padding:8px;border:1px solid #d1d5db;border-radius:6px;"><button id="pje-minipac-configurar" style="background:#0f766e;color:white;padding:9px;border:none;border-radius:6px;width:100%;font-weight:700;cursor:pointer;">⚙️ Configurar MiniPAC</button></div><button id="pje-minuta-fechar" style="margin-top:10px;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb;cursor:pointer;">Cancelar</button></div>`;document.body.appendChild(ov);document.querySelectorAll('.pje-min-tab').forEach(btn=>{btn.onclick=()=>{const tab=btn.dataset.tab;document.querySelectorAll('.pje-min-tab').forEach(b=>{b.style.background='#e5e7eb';b.style.color='#374151';});btn.style.background=tab==='despacho'?'#1d4ed8':'#0f766e';btn.style.color='white';document.getElementById('pje-min-tab-despacho').style.display=tab==='despacho'?'':'none';document.getElementById('pje-min-tab-minipac').style.display=tab==='minipac'?'':'none';};});document.getElementById('pje-minuta-fechar').onclick=()=>ov.remove();document.getElementById('pje-minuta-iniciar').onclick=()=>{const modelo=document.getElementById('pje-minuta-modelo').value.trim()||'Cobrança de Mandados NV 1';const fr=pjeMinutasObterFrameTarefa();if(!fr||!fr.contentWindow){alert('Abra primeiro uma tarefa de minuta/despacho.');return;}ov.remove();fr.contentWindow.postMessage({pjeMinutas:true,tipo:'MINUTA_DESPACHO',modelo},'*');};document.getElementById('pje-minipac-configurar').onclick=()=>{const fr=pjeMinutasObterFrameTarefa();if(!fr||!fr.contentWindow){alert('Abra primeiro uma tarefa com MiniPAC.');return;}const config={polo:document.getElementById('pje-minipac-polo').value,tipoAto:document.getElementById('pje-minipac-tipo').value,prazo:document.getElementById('pje-minipac-prazo').value||'15'};ov.remove();fr.contentWindow.postMessage({pjeMinutas:true,tipo:'MINIPAC_CONFIG',config},'*');};}
function injetarBotaoMinutas(toolbar){if(!toolbar||document.getElementById('pje-btn-minutas'))return;const btn=document.createElement('button');btn.id='pje-btn-minutas';btn.type='button';btn.innerHTML='⚖️ Minutar';btn.title='Automação de minutas e MiniPAC';btn.style.cssText='background:#0ea5e9;color:white;border:none;border-radius:6px;padding:5px 10px;margin-left:6px;cursor:pointer;font-weight:700;white-space:nowrap;';btn.onclick=pjeAbrirModalMinutas;toolbar.appendChild(btn);}
function pjeMinutasTentarInserirBotao(){try{if(document.getElementById('pje-btn-minutas'))return;const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').includes('Sequencial'));if(b&&b.parentElement){injetarBotaoMinutas(b.parentElement);return;}if(typeof injetarBotaoSequencial==='function')injetarBotaoSequencial();}catch(e){console.warn('[PJE Minutas] Falha ao inserir botão:',e);}}
window.addEventListener('message',async e=>{if(!e.data||e.data.pjeMinutas!==true)return;if(e.data.tipo==='AGUARDANDO_USUARIO')pjeMinutasMostrarPainelContinuar();if(e.data.tipo==='SALVO_ABRIR_TRANSICAO'){await pjeMinutasWait(700);await pjeMinutasEncaminharParaAssinaturaAngular();}if(e.data.tipo==='MINIPAC_OK')alert('MiniPAC configurado com sucesso.');if(e.data.tipo==='ERRO')alert('Erro em Minutar: '+(e.data.msg||'erro não informado'));});
setTimeout(pjeMinutasTentarInserirBotao,800);setTimeout(pjeMinutasTentarInserirBotao,1800);setTimeout(pjeMinutasTentarInserirBotao,3500);setInterval(pjeMinutasTentarInserirBotao,3000);
// ===================== FIM FEATURE 8: MINUTAR + MINIPAC =====================

})();
