# Proposta de Implantação — Mega 12 (Sistema 2.0)
**Módulos:** Frente de Lojas, Calculadora de Metas & Conferência Financeira  
**Cliente:** Rafael (Rede Mega 12)  
**Responsável Técnico:** Josué  
**Data:** Novembro de 2026  

---

## 📌 1. Objetivo do Projeto

Expandir o ecossistema do **Sistema Mega 12** para a ponta da operação (as 20 lojas físicas da rede), integrando o lançamento diário de caixa das unidades, o painel de conferência e conciliação da Bruna no setor financeiro e a calculadora de metas e supermetas da diretoria baseada no histórico oficial da planilha `VENDAS ANUAL ALS`.

A implantação substitui planilhas descentralizadas, trocas de mensagens e anotações manuais por um fluxo digital seguro, ágil e em tempo real.

---

## 🛠️ 2. Escopo Detalhado da Implantação (3 Módulos)

### Módulo 1: Portal de Acesso das Lojas (Frente Operacional)
*Interface moderna, intuitiva e focada na agilidade da operadora/gerente no fechamento diário.*

- **Acesso Individualizado por Filial:** Login seguro para cada uma das 20 lojas, com visão restrita aos dados da sua própria unidade.
- **Lançamento Diário do Resultado do Caixa:**
  - Data do movimento.
  - Decomposição dos valores por modalidade:
    - **Dinheiro em Espécie (R$)**
    - **Pix (R$)**
    - **Cartão de Débito (R$)**
    - **Cartão de Crédito (R$)**
    - **Despesas Locais / Sangrias** (pagamentos feitos pelo caixa da loja, se houver).
  - **Quantidade de Vendas (Atendimentos):** Campo numérico simples que permite ao sistema calcular automaticamente o **Ticket Médio** diário e mensal da loja, sem retrabalho no fim do mês.
  - **Memorando Diário Operacional:** Campo de registro de ocorrências relevantes do dia (ex.: chuva forte, horários estendidos de feriado, eventos locais).
- **Acompanhamento das Vendas Mensais da Loja:**
  - Extrato do mês com status visual de cada dia:
    - 🟡 *Aguardando Conferência*
    - 🟢 *Aprovado pelo Financeiro*
    - 🔴 *Ajuste Solicitado pela Bruna* (com o motivo detalhado exibido para correção rápida e reenvio).
  - **Painel Visual da Meta:** Barra de progresso destacando o faturamento do dia, acumulado do mês e o valor faltante para atingir a **Meta** e a **Supermeta (+10%)**.

---

### Módulo 2: Matriz e Calculadora de Metas da Rede (Diretoria / Rafael)
*Desenvolvido com base integral nas regras e fórmulas da planilha `VENDAS ANUAL ALS.xlsx`, mantendo a visualização geral em grade, porém em um formato web dinâmico, limpo e automático.*

- **Visão Geral Comparativa (Matriz Anual):** Tabela anual comparativa com o histórico consolidado de **2021 a 2026** para todas as 20 lojas da rede.
- **Seletor Mensal e por Loja:** Navegação rápida mês a mês (Janeiro a Dezembro) com recálculo instantâneo das metas.
- **Fórmulas Oficiais Integradas:**
  - **Ponto de Equilíbrio da Loja:**
    $$\text{Ponto de Equilíbrio} = \frac{\text{Despesas Fixas da Filial}}{31\%}$$
    *(Baseado na margem de contribuição líquida da rede de ~31% a 32%).*
  - **Meta Normal:** Estipulada para a filial garantir cobertura de custos e lucro operacional.
  - **Meta Super 10 (Supermeta):**
    $$\text{Supermeta} = \text{Meta Normal} + 10\% = \text{Meta Normal} \times 1{,}10$$
  - **Cálculo de Comissão da Meta Normal:** $\text{Meta Normal} \times 0{,}3\%$ (0,3% sobre a meta atingida).
  - **Cálculo de Comissão da Supermeta:** $\text{Supermeta} \times 0{,}9\%$ (0,9% sobre a supermeta atingida).
  - **Simulador de DRE da Filial:** Cálculo instantâneo de Simples Nacional (8%), Custo de Mercadoria/CMV (60%) e Projeção de Lucro Líquido.
- **Ritmo de Vendas Diário:** Cálculo automático de quanto a loja precisa vender por dia útil restante no mês para bater a meta e a supermeta.

---

### Módulo 3: Central de Gerenciamento & Conferência Financeira (Bruna / Financeiro)
*Painel desenhado para automatizar a rotina de conferência, eliminando as horas gastas diariamente conferindo comprovantes em papel e mensagens de WhatsApp.*

- **Fila Diária de Conferência:** Painel consolidando todas as lojas que enviaram o fechamento no dia, com filtros por data, por loja e por status (Pendente, Conciliado ou Divergente).
- **Detalhamento do Caixa:** Visualização clara do que a loja declarou em cada forma de pagamento para confronto rápido com extratos bancários e relatórios das maquininhas.
- **Ações Rápidas de Devolutiva:**
  - **Botão `[Aprovar / Conciliar]`:** Valida o caixa, bloqueia alterações acidentais pela loja e oficializa os números no faturamento da rede.
  - **Botão `[Solicitar Ajuste / Devolver]`:** Abre um modal onde a Bruna aponta a divergência encontrada (ex.: *"Divergência de R$ 150,00 no Pix com o extrato. Favor conferir comprovante das 16h40"*). A loja é imediatamente alertada no sistema para corrigir e reenviar.
- **Trilha de Auditoria:** Histórico com data, hora e responsável por cada aprovação ou devolução.

---

## ⏱️ 3. Cronograma de Implantação

**Duração Total Estimada:** **4 semanas**

- **Semana 1:** Estruturação de banco de dados, isolamento de acessos por loja e API de caixa.
- **Semana 2:** Construção da interface das lojas (Lançamento diário, validações numéricas e extrato mensal).
- **Semana 3:** Construção do painel da Bruna (fila de conferência, botões de aprovação/devolutivas e auditoria).
- **Semana 4:** Implementação da Matriz de Metas da Diretoria (`VENDAS ANUAL ALS`), homologação com lojas piloto e liberação para a rede.

---

## 💰 4. Orçamento do Ponto Ideal & Condições Comerciais

Aproveitando toda a infraestrutura de servidores (VPS Linux), banco de dados e arquitetura já desenvolvida e consolidada no Mega 12, foi possível otimizar os custos de implantação para um patamar altamente acessível para a rede:

### Investimento Total: R$ 8.800,00

#### Condições de Pagamento Facilitadas:
- **Opção Principal (4 parcelas mensais):**  
  **4x de R$ 2.200,00** (Entrada no início + 30, 60 e 90 dias).
- **Opção em 3 parcelas:**  
  **3x de R$ 2.933,33** (Entrada + 30 e 60 dias).

> *Equivalência de Custo:* O investimento representa apenas **R$ 440,00 por loja** para informatizar toda a operação de caixa, metas diárias e conferência financeira das 20 filiais da rede.

---

*(Opcional / Pós-Entrega): Modelo de sustentação e suporte contínuo para as 20 filiais, backups em nuvem e pequenas evoluções por R$ 1.250,00/mês (apenas R$ 62,50 por loja/mês).*

