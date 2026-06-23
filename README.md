# PJe Sejud Cariri — Extensão para Chrome

Automatize tarefas repetitivas do PJe (Processo Judicial Eletrônico) do Tribunal de Justiça do Ceará. Esta extensão roda dentro do próprio sistema do PJe e faz o trabalho pesado por você — sem precisar abrir abas extras nem instalar nada no computador.

---

## O que esta extensão faz?

### 🔍 Agrupador de Processos

Encontre processos por palavra-chave dentro do conteúdo das decisões e despachos. Útil para localizar todos os processos de um determinado assunto (ex: "CEJUSC", "saúde", "liminar").

- Cole palavras-chave e ele busca em lote
- Abre a página do processo e lê o HTML — igual você faria manualmente
- Mostra em uma tabela com número, data de chegada, última movimentação
- **Exporta para CSV** com os filtros aplicados
- **Não abre abas no seu Chrome** — tudo é feito internamente

### 👥 Analisador de Polos

Descubra quem são as partes de cada processo. Para cada número de processo:

- Consulta a API do PJe para localizar o processo
- Gera chave de acesso e busca a página de autos
- Extrai **polo ativo**, **polo passivo** e todos os **advogados**
- Mostra visualmente com cards coloridos por polo
- **Exporta para CSV**

### 🔄 Processos em Múltiplas Filas

Encontre processos que aparecem em mais de uma fila simultaneamente — sinal de duplicação ou erro de triagem.

- Filtre por período (24h, 3, 5, 15, 30 dias ou todos)
- Escolha o campo de data: **Data de Chegada** ou **Último Movimento**
- Selecione quais filas verificar
- Botão **Cancelar** durante a varredura
- **Exporta para CSV** com os filtros da tela

### ⚡ Automação Citar/Intimar e Alvará

Automatize a movimentação de processos em lote:

- **Citar/Intimar**: preenche polos, destinatários, prazos, avança telas e assina digitalmente
- **Alvará**: emite alvarás eletrônicos automaticamente
- Kanban de acompanhamento (Aguardando, Executando, Concluído, Erro)
- **Proteção contra processo errado**: se outra aba do PJe estiver aberta, a automação só age no processo correto — nunca no errado

---

## Como instalar

1. Baixe este repositório (botão verde **Code → Download ZIP**)
2. Extraia o ZIP em uma pasta
3. Abra o Chrome e vá para `chrome://extensions`
4. Ative o **Modo do desenvolvedor** (canto superior direito)
5. Clique em **Carregar sem compactação** e selecione a pasta extraída
6. Faça login no PJe (`pje.tjce.jus.br`)
7. Pronto! O menu **Sejud** aparece no canto inferior esquerdo do PJe

---

## Como usar

1. Faça login no PJe normalmente
2. No menu lateral, passe o mouse sobre o ícone **Sejud**
3. Escolha a ferramenta no menu que aparece:
   - **Automação de Processos** — Citar/Intimar e Alvará em lote
   - **Agrupador de Processos** — buscar por palavra-chave
   - **Processos em Múltiplas Filas** — encontrar duplicados
   - **Analisar Polos** — ver partes e advogados

---

## O que mudou recentemente

- Agrupador **não abre mais abas** no Chrome — agora usa busca interna, muito mais rápido
- Botão **Cancelar** funciona de verdade em todas as ferramentas
- Citar/Intimar agora avisa quando o botão **Assinar** não aparece (antes fingia que deu certo)
- Citar/Intimar agora avisa quando o processo vai para a **fila errada** (antes ignorava)
- Automação **nunca mexe no processo errado** — proteção contra abas abertas de outros processos
- Novo módulo: **Analisador de Polos** — veja partes e advogados de cada processo

---

## Suporte

Encontrou algum problema? Abra uma issue em:  
https://github.com/derleymad/pje-sejud-cariri-extensao/issues
