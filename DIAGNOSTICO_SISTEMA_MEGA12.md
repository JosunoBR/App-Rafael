# 📋 Relatório Executivo de Diagnóstico & Checkup Geral do Sistema
> **Sistema de Compras, Separação e Gestão Financeira — Rede Mega 12**  
> **Data da Auditoria:** 16 de Setembro de 2026  
> **Ambiente Avaliado:** Produção (Railway) & Repositório Local  
> **Pilares de Referência:** *Security by Design* & *Clean Code & Architecture* (conforme [AGENTS.md](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/AGENTS.md))

---

## 📌 1. Visão Geral Executiva

Este documento consolida a auditoria e o checkup preventivo realizado em todas as funções, regras de negócio e fluxos do ecossistema da **Rede Mega 12**.

O objetivo desta avaliação foi mapear cenários que possam gerar falhas operacionais, inconsistências fiscais/financeiras ou lentidão, analisando **o sistema como um todo**, de modo a garantir que a solução de um problema nunca cause efeitos colaterais em outros módulos.

---

## 📊 2. Matriz Geral de Riscos e Oportunidades

| # | Módulo | Severidade | Cenário / Risco Potencial | Impacto Sistêmico | Solução Preventiva Recomendada |
|---|---|---|---|---|---|
| **1** | **Segurança & RBAC** | 🔴 **Alta** | Rotas de modificação/exclusão com `optionalAuth` | Risco de alteração indevida de catálogo ou limpeza de estoque por requisições anônimas | Proteger mutações (`POST`, `PUT`, `DELETE`) com `authMiddleware` obrigatório |
| **2** | **Banco de Dados / I/O** | 🔴 **Alta** | Gravação repetitiva de disco (`fs.writeFileSync`) a cada INSERT em lote | Sobrecarga de I/O em pedidos grandes (100 itens = 100 regravações do banco em fração de segundos) | Implementar persistência única ao final da transação ou *Debounced Save* |
| **3** | **Financeiro / ERP** | 🟡 **Média** | `DELETE` de pedido apagando títulos já pagos no Contas a Pagar | Perda de rastreabilidade contábil e distorção no fluxo de caixa histórico | Bloquear exclusão se houver boleto com status `Pago`, ou marcar pedido como `Cancelado` |
| **4** | **Performance / Memória** | 🟡 **Média** | Fotos de produtos em Base64 de alta resolução no JSON de pedidos | Lentidão na listagem de pedidos (`GET /api/orders`) e consumo excessivo de memória | Omitir fotos na listagem geral e comprimir imagens antes do envio (Canvas/WebP) |
| **5** | **Separação por Loja** | 🟢 **Baixa** | Quantidade não numérica (`NaN`) propagando cotas inválidas nas 20 lojas | Romaneio impresso com falhas e conferência de doca travada | Sanitizar total com `Math.floor(Number(q) \|\| 0)` no início do cálculo |
| **6** | **Concorrência** | 🟡 **Média** | Edição simultânea (tablet doca vs desktop escritório) sem checagem de versão | Sobrescrita acidental da última alteração (*Blind Overwrite*) | Implementar bloqueio otimista comparando timestamp `updatedAt` |
| **7** | **Importador Excel** | 🟢 **Baixa** | Importação de planilhas sem quantidade/preço prévios | Bloqueio de importação como rascunho/grade de catálogo | *(Já corrigido)* Aceitar itens com descrição para digitação posterior na tela |

---

## 🔍 3. Detalhamento dos Diagnósticos por Módulo

---

### 🛡️ 3.1. Segurança e Controle de Acesso (RBAC & Rotas da API)

#### O Cenário de Risco:
Nos arquivos de rotas do backend ([product.routes.js](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/backend/src/routes/product.routes.js#L8-L13), [supplier.routes.js](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/backend/src/routes/supplier.routes.js#L10) e [stock.routes.js](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/backend/src/routes/stock.routes.js#L10-L13)), diversas operações de modificação estão configuradas com `optionalAuth` em vez de `authMiddleware`.
- Exemplo crítico: `DELETE /api/stock/clear/all` (que limpa todo o estoque central) pode ser executada sem token de autenticação.
- O endpoint `POST /api/config/restore-backup` valida usuário `root` dentro do controller, mas na camada de rota não possui o middleware `requireRole('diretoria')`.

#### Impacto Sistêmico:
Se qualquer script ou requisição não autenticada alcançar o backend público na nuvem, dados de fornecedores, produtos ou estoque podem ser manipulados.

#### Solução Recomendada:
1. Manter `optionalAuth` estritamente em consultas de leitura (`GET`), caso haja catálogo público para fornecedores.
2. Exigir `authMiddleware` em **todas** as rotas com métodos `POST`, `PUT` e `DELETE`.
3. Adicionar `requireRole('diretoria')` explícito nas operações críticas de exclusão e restauração.

---

### ⚡ 3.2. Desempenho do Banco de Dados e I/O de Disco (SQLite `sql.js`)

#### O Cenário de Risco:
O backend utiliza a biblioteca `sql.js` (SQLite compilado em WebAssembly mantido em memória RAM).  
No arquivo [database.js](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/backend/src/config/database.js#L557), a função utilitária `execute()` chama `saveDatabaseToDisk()` a cada comando SQL executado.
```javascript
async function execute(sql, params = []) {
  const db = await getDatabase();
  db.run(sql, params);
  saveDatabaseToDisk(); // <-- Exporta a memória inteira e grava no disco a cada chamada
}
```
Ao salvar um pedido com 80 itens e 14 parcelas ([orderRepository.js](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/backend/src/repositories/orderRepository.js#L243)), o sistema executa um loop com ~95 INSERTs seguidos. Isso faz com que o arquivo `.db` inteiro seja serializado e regravado no disco **95 vezes consecutivas em menos de 1 segundo**.

#### Impacto Sistêmico:
- Conforme o banco de dados cresce para dezenas de megabytes, o tempo de salvamento de pedidos aumenta exponencialmente.
- No Railway (container Linux com volume persistente) ou em máquinas Windows, gravações repetitivas concorrentes geram bloqueios de arquivo (`EBUSY / EPERM`) e podem ocasionar timeouts na requisição do front-end.

#### Solução Recomendada:
- **Gravação em Lote (Batch Transaction):** Criar uma função `executeBatch(statements)` ou desativar o salvamento automático dentro do loop, chamando `saveDatabaseToDisk()` **uma única vez** ao término da gravação de todos os itens e parcelas do pedido.
- Alternativamente, aplicar uma rotina de *Debounce* de 250ms na persistência em disco.

---

### 💰 3.3. Gestão Financeira & Rastreabilidade de Contas a Pagar

#### O Cenário de Risco:
Em [order.service.js](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/backend/src/services/order.service.js#L149), o método `deleteOrder(id)` executa:
```javascript
await orderRepository.delete(id);
await financialRepo.deleteByOrderId(id);
```

#### Impacto Sistêmico:
Se um pedido for excluído mas algum de seus boletos já tiver sido baixado como `Pago` no módulo de Contas a Pagar (ou conciliado no extrato bancário da empresa), a exclusão física apagará o registro contábil de que o pagamento existiu.
- O fluxo de caixa consolidado perde o histórico do pagamento.
- Os relatórios de fechamento mensal não baterão com o extrato bancário real.

#### Solução Recomendada:
1. **Regra de Bloqueio Contábil:** Antes de deletar um pedido, verificar se há títulos vinculados com status `'Pago'`.
2. Se houver títulos pagos: recusar a exclusão física e exigir que o usuário marque o pedido como `'Cancelado'`, mantendo o histórico de auditoria financeiro intacto.

---

### 🖼️ 3.4. Memória e Carga de Rede (Imagens em Base64 nos Pedidos)

#### O Cenário de Risco:
O sistema permite anexar fotos de produtos nos itens de compra. Quando o usuário cola uma imagem diretamente da área de transferência ou faz upload de foto da câmera sem redimensionamento, ela é convertida para uma string Base64 que pode ter entre 2MB e 5MB.  
Ao salvar um pedido com 20 produtos fotografados, o payload JSON do pedido ultrapassa **40MB**.

#### Impacto Sistêmico:
- A rota `GET /api/orders` carrega todos os pedidos com todos os itens serializados.
- O Node.js precisa alocar centenas de megabytes de strings na memória RAM, correndo risco de encerramento por falta de memória (*Out of Memory*).
- O navegador do usuário fica lento ao processar o JSON e o `localStorage` atinge o limite de cota de 5MB do navegador.

#### Solução Recomendada:
1. **Separação de Payloads:** Na rota de listagem (`GET /api/orders`), omitir as fotos dos itens ou trafegar apenas metadados/thumbnails leves. As fotos completas só devem ser entregues quando o usuário clicar para abrir o pedido detalhado (`GET /api/orders/:id`).
2. **Compressão no Front-end:** Utilizar o `<canvas>` do navegador para redimensionar automaticamente qualquer imagem colada para no máximo 600x600 pixels em formato WebP/JPEG leve (< 80KB) antes de anexar ao produto.

---

### 📦 3.5. Separação por Loja, Estoque Central e Romaneio de Doca

#### O Cenário de Risco:
No motor de separação ([separationEngine.ts](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/web/src/shared/separationEngine.ts#L29)), a distribuição calcula cotas proporcionais para as 20 lojas físicas e reserva do CD.  
Se uma linha de produto for importada ou digitada com quantidade indefinida ou `NaN`, o cálculo de cotas propaga `NaN` para os clusters A, B e C.

#### Impacto Sistêmico:
- Na impressão do romaneio de doca para expedição física, as quantidades das lojas saem corrompidas ou zeradas.
- O conferente de doca não consegue registrar a bipagem de entrada/saída.

#### Solução Recomendada:
- Sanitizar a entrada de quantidade no cálculo:
  `const safeQuantity = Math.max(0, Math.floor(Number(totalQuantity) || 0));`
  Garantindo que nenhuma operação de divisão gere cotas inválidas.

---

### 🔄 3.6. Concorrência e Sincronização LocalStorage vs Banco de Dados

#### O Cenário de Risco:
O sistema possui cache local no navegador para permitir resposta imediata de interface.  
Se um conferente estiver usando o tablet no depósito conferindo avarias de um pedido e, simultaneamente, o comprador no escritório estiver alterando as condições de pagamento do mesmo pedido, quem clicar em "Salvar" por último sobrescreverá todas as informações do outro sem aviso (*Blind Overwrite*).

#### Impacto Sistêmico:
Perda silenciosa de dados operacionais ou comerciais recém-editados.

#### Solução Recomendada:
- **Controle Otimista de Concorrência:**
  Ao salvar o pedido no backend, comparar o timestamp `updatedAt` enviado pelo cliente com o timestamp que está atualmente gravado no banco de dados.
  Se o banco possuir um `updatedAt` mais recente, o servidor avisa:
  *"Este pedido foi alterado por outro usuário enquanto você editava. Deseja revisar as alterações antes de salvar?"*

---

### 🧮 3.7. Motor de Cálculo Oficial e Relatórios (PDF / Excel)

#### Situação Atual:
- A regra oficial central:
  $$\mathbf{Total\ Geral} = \mathbf{Total\ Bruto} + \mathbf{Total\ IPI} - \mathbf{Desconto\ Comercial}$$
  *(Frete nunca entra no total geral comercial)*
- **Status:** 100% alinhado no motor unificado ([orderCalculationEngine.ts](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/web/src/shared/orderCalculationEngine.ts)), na geração de espelhos em PDF ([pdfExporter.ts](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/web/src/utils/pdfExporter.ts)), no exportador Excel ([excelExporter.ts](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/web/src/utils/excelExporter.ts)) e na validação do backend ([order.service.js](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/backend/src/services/order.service.js)).

---

## 🎯 4. Plano de Ação Recomendado (Sem Riscos de Quebra)

Para aplicar melhorias sem causar impactos colaterais nos pedidos já em andamento, recomenda-se a seguinte ordem de execução:

1. **Fase 1 (Segurança Imediata):**  
   Ajustar os middlewares de rota para que métodos `POST`, `PUT` e `DELETE` em produtos, fornecedores e estoque exijam token JWT válido.
2. **Fase 2 (Otimização de Banco SQLite):**  
   Ajustar a rotina de salvamento de pedidos para que o arquivo `.db` seja gravado em disco uma única vez após o término de todos os itens do pedido.
3. **Fase 3 (Blindagem Financeira):**  
   Impedir exclusão física de pedidos que já tenham boletos baixados como pagos.
4. **Fase 4 (Compressão de Imagens):**  
   Ativar a compressão automática em Canvas no front-end para garantir que uploads de fotos não sobrecarreguem o tráfego nem o banco.

---

> *Documento gerado automaticamente pela ferramenta de auditoria e diagnóstico do sistema Mega 12 para análise e aprovação da diretoria.*
