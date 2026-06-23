// ============================================================
// Tema de cores — PJe Sejud Cariri
// ============================================================
// Altere as cores abaixo e TODO o kanban se atualiza.
// Não precisa mexer em mais nada.
//
// Para usar um tom específico (ex: #07a teal):
//   1. substitua as cores da família "primary" pelos tons de teal
//   2. recarregue a página
//
// Cores organizadas em famílias:
//   primary*  = azul (botões, tabs, links, foco)
//   success*  = verde (concluído)
//   error*    = vermelho (erro)
//   warning*  = âmbar (pendente)
//   alvara*   = roxo (painel alvará)
//   gray*     = cinzas neutros
// ============================================================

window.PJE_THEME = {

  // ══════════════════════════════════════════════════════════
  // 🔵 Cor Primária (azul padrão)
  // ══════════════════════════════════════════════════════════
  primary50:      '#eff6ff',   // fundo hover claro (scan bar, hover items)
  primary100:     '#dbeafe',   // tags polo, fundo stats icon
  primary200:     '#bfdbfe',   // bordas claras, count badges, retry hover
  primary400:     '#3b82f6',   // cor principal: botões outline, links, ícones
  primary500:     '#2563eb',   // hover médio, card-action-retry
  primary600:     '#1d4ed8',   // botão primário bg, tab ativa, pill ativa
  primary700:     '#1e40af',   // texto escuro sobre fundo primary100
  primary800:     '#1e3a5f',   // header gradient, título sidebar, detail labels
  primary900:     '#0f172a',   // header gradient escuro, modal header
  primaryShadow:  'rgba(59,130,246,.15)',   // sombra de foco
  primaryShadowDark: 'rgba(29,78,216,.35)',  // sombra botão primário

  // ══════════════════════════════════════════════════════════
  // 🟢 Cor Sucesso (verde)
  // ══════════════════════════════════════════════════════════
  success:        '#10b981',
  successDark:    '#059669',
  successDarker:  '#166534',
  successLight:   '#bbf7d0',
  successLightest:'#f0fdf4',

  // ══════════════════════════════════════════════════════════
  // 🔴 Cor Erro (vermelho)
  // ══════════════════════════════════════════════════════════
  error:          '#ef4444',
  errorDark:      '#dc2626',
  errorDarker:    '#991b1b',
  errorLight:     '#fecaca',
  errorLightest:  '#fef2f2',

  // ══════════════════════════════════════════════════════════
  // 🟡 Cor Aviso (âmbar)
  // ══════════════════════════════════════════════════════════
  warning:        '#f59e0b',
  warningDark:    '#92400e',
  warningLight:   '#fde68a',
  warningLightest:'#fffbeb',

  // ══════════════════════════════════════════════════════════
  // 🟣 Cor Alvará (roxo)
  // ══════════════════════════════════════════════════════════
  alvara:         '#7c3aed',
  alvaraLight:    '#f5f3ff',
  alvaraStep:     '#8b5cf6',

  // ══════════════════════════════════════════════════════════
  // ⚪ Cinzas / Neutros
  // ══════════════════════════════════════════════════════════
  gray50:         '#f8fafc',
  gray100:        '#f1f5f9',
  gray200:        '#e2e8f0',
  gray300:        '#cbd5e1',
  gray400:        '#94a3b8',
  gray500:        '#64748b',
  gray600:        '#475569',
  gray700:        '#334155',
  gray800:        '#1e293b',
  gray900:        '#0f172a',

  // ══════════════════════════════════════════════════════════
  // 🔧 Detalhes
  // ══════════════════════════════════════════════════════════
  white:          '#ffffff',
  badgeBg:        '#e53935',
  progressGradStart: '#1e3a5f',
  progressGradEnd:   '#2d5a8a',
  logBg:          '#1e293b',
  logBorder:      '#334155',
  logText:        '#cbd5e1',
  logTime:        '#3b7ab8',
  logError:       '#fca5a5',
};

// ══════════════════════════════════════════════════════════
// Helpers de tema (usados internamente)
// ══════════════════════════════════════════════════════════

// Aplica placeholders {{chave}} numa string CSS
window.PJE_THEME.aplicar = function(css) {
  var result = css;
  for (var key in window.PJE_THEME) {
    if (window.PJE_THEME.hasOwnProperty(key) && typeof window.PJE_THEME[key] === 'string') {
      while (result.indexOf('{{' + key + '}}') !== -1) {
        result = result.replace('{{' + key + '}}', window.PJE_THEME[key]);
      }
    }
  }
  return result;
};

// Substitui cores hardcoded pelos valores atuais do tema.
// Chamado automaticamente pelos componentes — não precisa chamar direto.
window.PJE_THEME.aplicarCores = function(str) {
  return str
    // ── Família Primária ──
    .replace(/#eff6ff/g, window.PJE_THEME.primary50)
    .replace(/#dbeafe/g, window.PJE_THEME.primary100)
    .replace(/#bfdbfe/g, window.PJE_THEME.primary200)
    .replace(/#3b82f6/g, window.PJE_THEME.primary400)
    .replace(/#2563eb/g, window.PJE_THEME.primary500)
    .replace(/#1d4ed8/g, window.PJE_THEME.primary600)
    .replace(/#1e40af/g, window.PJE_THEME.primary700)
    .replace(/#1e3a5f/g, window.PJE_THEME.primary800)
    .replace(/#0f172a/g, window.PJE_THEME.primary900)
    .replace(/rgba\(59,130,246,\.15\)/g, window.PJE_THEME.primaryShadow)
    .replace(/rgba\(29,78,216,\.35\)/g, window.PJE_THEME.primaryShadowDark)
    .replace(/rgba\(29,78,216,\.3\)/g, window.PJE_THEME.primaryShadowDark)
    // ── Sucesso ──
    .replace(/#10b981/g, window.PJE_THEME.success)
    .replace(/#059669/g, window.PJE_THEME.successDark)
    .replace(/#166534/g, window.PJE_THEME.successDarker)
    .replace(/#bbf7d0/g, window.PJE_THEME.successLight)
    .replace(/#f0fdf4/g, window.PJE_THEME.successLightest)
    // ── Erro ──
    .replace(/#ef4444/g, window.PJE_THEME.error)
    .replace(/#dc2626/g, window.PJE_THEME.errorDark)
    .replace(/#991b1b/g, window.PJE_THEME.errorDarker)
    .replace(/#fecaca/g, window.PJE_THEME.errorLight)
    .replace(/#fef2f2/g, window.PJE_THEME.errorLightest)
    // ── Aviso ──
    .replace(/#f59e0b/g, window.PJE_THEME.warning)
    .replace(/#92400e/g, window.PJE_THEME.warningDark)
    .replace(/#fde68a/g, window.PJE_THEME.warningLight)
    .replace(/#fffbeb/g, window.PJE_THEME.warningLightest)
    // ── Alvará ──
    .replace(/#7c3aed/g, window.PJE_THEME.alvara)
    .replace(/#f5f3ff/g, window.PJE_THEME.alvaraLight)
    .replace(/#8b5cf6/g, window.PJE_THEME.alvaraStep)
    // ── Gradientes e detalhes ──
    .replace(/#2d5a8a/g, window.PJE_THEME.progressGradEnd);
};

console.log('[PJe Theme] Tema carregado. Cores primárias: ' + window.PJE_THEME.primary400);
