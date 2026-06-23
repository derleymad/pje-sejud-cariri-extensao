# Citação / Intimação (Geral)

Módulo principal de automação de citação e intimação em lote.

- **citar-intimar.js** — Painel kanban + sidebar de configuração (injetado no PJe)
- **citar-intimar.html** — Interface standalone para colar processos
- **auto-citar.js** — Robô que executa a movimentação dentro da tarefa do PJe

## Fluxo

1. Usuário abre o painel (botão no menu lateral do PJe ou HTML standalone)
2. Seleciona polo, tipo de ato, meio, prazo e cola os processos
3. Clica INICIAR → o kanban gerencia a fila sequencial
4. Para cada processo, abre a tarefa e o `auto-citar.js` executa a movimentação
5. Resultado aparece no kanban (concluído, erro, timeout)

## Polos suportados

- Passivo / Ativo (podem ser combinados)
- Ministério Público (solo, via CNPJ)
- Defensoria (em breve)
- Procuradoria (em breve)
