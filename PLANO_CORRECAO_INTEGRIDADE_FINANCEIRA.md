# Plano de Implementação — Correções de Integridade Financeira e Segurança

## 1. Objetivo

Corrigir os problemas de código identificados na auditoria do módulo financeiro, priorizando segurança, prevenção de duplicidades, consistência de parcelas, tratamento correto de datas, recorrências, baixas e isolamento dos testes.

Este plano não trata o pedido `PED-120528` nem propõe correção individual de pedidos. Parcelas de valor zero em pedidos ainda em cotação são consideradas um estado operacional possível quando o usuário está preservando uma lista incompleta.

## 2. Princípios da implementação

- Não apagar ou consolidar registros financeiros automaticamente sem conciliação humana.
- Fazer migrações de banco transacionais, idempotentes e precedidas de backup verificável.
- Manter regras de negócio no backend; o frontend deve apenas antecipar validações para melhorar a experiência.
- Gravar datas em formato ISO `YYYY-MM-DD`; formatar `DD/MM/YYYY` somente para exibição e exportação.
- Toda operação financeira de escrita deve ser atômica, idempotente, auditável e protegida contra concorrência.
- Pedidos incompletos podem manter parcelas zeradas internamente, mas elas não devem poluir totais de contas a pagar nem ser tratadas como obrigações efetivas.

## 3. Escopo dos problemas

### Críticos

1. Exposição da senha do usuário `root` em mensagens de log.
2. Geração de recorrências interrompida por variável não declarada.
3. Comparação e ordenação textual de datas brasileiras.
4. Testes automatizados executados contra o banco operacional.

### Altos

5. Trava de duplicidade incorreta para lançamentos parcelados.
6. Verificação e inserção separadas, permitindo corrida concorrente.
7. Importador legado sem proteção adequada contra reimportação.
8. Ausência de restrições únicas para parcelas vinculadas a pedidos.
9. Colisão entre parcela de mercadoria e título de frete.
10. Baixa financeira aceita valores inválidos.
11. Comprovantes podem ficar órfãos no disco.

### Médios

12. O `dailyList` de resumo produzido pelo backend agrupa somente pelo dia do mês. A tela atual já se protege disso e agrupa pela data completa em consultas com mais de um mês; portanto, trata-se de uma inconsistência latente da API, não de um erro visual ativo.
13. Uso de UTC para datas civis brasileiras pode adiantar um dia.
14. Excesso de falhas silenciosas e ausência de telemetria operacional.
15. Bundle web excessivamente grande e efeitos React potencialmente inconsistentes.

## 4. Estratégia de entrega

As correções devem ser entregues em pequenas etapas. Cada etapa deve possuir migração, testes e mecanismo de reversão próprios.

---

## Fase 0 — Contenção e preparação

### Ações

1. Criar backup atômico do banco e validar que ele abre e possui as tabelas esperadas.
2. Gerar relatório somente leitura contendo:
   - grupos possivelmente duplicados;
   - parcelas repetidas por `orderId + installmentId`;
   - títulos pagos com valor pago ausente ou inválido;
   - arquivos de comprovante sem vínculo e vínculos sem arquivo;
   - registros de teste existentes;
   - parcelas zeradas, separadas de obrigações com valor positivo.
3. Não excluir duplicidades automaticamente. Produzir uma lista para decisão do responsável financeiro.
4. Definir uma flag temporária para desabilitar o importador legado até ele receber idempotência.

### Critérios de aceite

- Backup restaurável validado.
- Relatório de integridade reproduzível e sem alteração de dados.
- Importação legada indisponível para uso acidental.

---

## Fase 1 — Proteção da conta `root` sem remoção

### Ações

1. Manter nesta etapa o usuário `root` e o mecanismo atual de inicialização da conta.
2. Remover imediatamente de `backend/src/config/database.js` qualquer mensagem que mostre a senha ou permita inferi-la.
3. Garantir que logs de autenticação, inicialização, erros e auditoria nunca incluam:
   - senha em texto puro;
   - hash da senha;
   - token de autenticação;
   - cabeçalho `Authorization`.
4. Criar um sanitizador central de logs para campos sensíveis, aplicado antes de serializar contexto de erro ou requisição.
5. Registrar em auditoria alterações de papel, ativação e recuperação da conta administrativa, sem armazenar credenciais.
6. Documentar a remoção futura da credencial fixa como melhoria de segurança adiada, sem torná-la bloqueante para este plano.

### Critérios de aceite

- O usuário `root` continua disponível e com o comportamento atual de inicialização.
- Nenhum log de inicialização, autenticação ou erro apresenta senha, hash, token ou cabeçalho de autorização.
- Testes automatizados verificam a redação de campos sensíveis em logs.

---

## Fase 2 — Modelo de datas consistente

### Ações

1. Criar utilitário único para datas civis, por exemplo:
   - `parseCivilDate()`;
   - `formatIsoDate()`;
   - `formatBrDate()`;
   - `todayInTimeZone('America/Sao_Paulo')`.
2. Migrar `dataVencimento` e `dataPagamento` para ISO `YYYY-MM-DD` no banco.
3. Substituir comparações textuais sobre `DD/MM/YYYY` por comparações ISO.
4. Corrigir consultas de recorrência, exclusão futura, ordenação e filtros.
5. Eliminar o uso de `toISOString().substring(0, 10)` para datas civis brasileiras.
6. Manter formatação brasileira apenas na API de apresentação, tela, PDF e planilha.

### Migração

1. Criar colunas temporárias ou uma tabela nova.
2. Converter datas dentro de transação.
3. Rejeitar e listar valores que não possam ser convertidos.
4. Validar contagem, mínimo, máximo e amostras antes de trocar as tabelas.
5. Preservar o backup anterior até a homologação.

### Critérios de aceite

- Ordenação correta atravessando meses e anos.
- Cancelamento de recorrência remove somente vencimentos futuros esperados.
- Operações realizadas à noite no Brasil mantêm a data local correta.

---

## Fase 3 — Recorrências confiáveis

### Ações

1. Declarar e reinicializar o contador da série dentro de cada iteração.
2. Trocar o algoritmo baseado em `MAX()` textual por competência ISO normalizada.
3. Criar chave natural da ocorrência recorrente:
   - `recorrenciaId`;
   - competência ou data de vencimento;
   - tipo do título, quando necessário.
4. Criar índice único parcial para impedir duas ocorrências da mesma série e vencimento.
5. Executar a expansão da janela dentro de transação.
6. Não ocultar falhas: retornar estado de erro monitorável sem interromper a listagem dos títulos.
7. Tornar a expansão segura para múltiplas instâncias do servidor.

### Testes obrigatórios

- Dia 28, 29, 30 e 31.
- Fevereiro em ano bissexto e não bissexto.
- Virada de dezembro para janeiro.
- Duas execuções simultâneas.
- Cancelamento parcial de uma série.
- Reexecução sem criar duplicidade.

---

## Fase 4 — Criação parcelada atômica e idempotente

### Ações

1. Gerar todas as parcelas em memória antes de consultar ou gravar o banco.
2. Validar duplicidade com os valores, vencimentos e descrições efetivos de cada parcela, não com o montante total.
3. Introduzir `creationGroupId` ou `sourceOperationId` para identificar o lote originador.
4. Executar validação e inserção na mesma transação.
5. Persistir e reutilizar a chave de idempotência por operação, inclusive entre dispositivos e reinícios.
6. No frontend, impedir submissão quando `saving === true`, além de desabilitar visualmente o botão.
7. Retornar o lote completo criado, com identificadores de todas as parcelas.

### Critérios de aceite

- Duplo clique, Enter repetido e duas requisições simultâneas geram somente um lote.
- Reenvio com a mesma chave retorna o resultado anterior.
- Reutilização da chave com conteúdo diferente retorna conflito.
- Falha na terceira parcela desfaz todo o lote.

---

## Fase 5 — Sincronização de pedidos e distinção de títulos

### Ações

1. Definir identidade canônica da parcela:
   - `orderId`;
   - `installmentId` estável;
   - `tipoTitulo` (`mercadoria` ou `frete`).
2. Não usar apenas `numeroParcela` como identidade.
3. Persistir `tipoTitulo` também em `financial_entries`.
4. Criar índice único parcial para `orderId + installmentId + tipoTitulo`.
5. Transformar `syncSingleOrder()` em operação transacional de upsert.
6. Preservar baixa, comprovantes e dados conciliados durante a sincronização.
7. Nunca excluir automaticamente um título pago ou conciliado.
8. Registrar em auditoria criação, atualização, preservação e remoção decorrentes da sincronização.

### Tratamento de parcelas zeradas

1. Permitir parcelas zeradas dentro de pedidos em `Em Cotação` para preservar o rascunho.
2. Na tela financeira, ocultá-las por padrão dos totais de obrigações, oferecendo filtro explícito de “Previsões incompletas”.
3. Impedir baixa, confirmação ou liberação de título com valor zero.
4. Quando o pedido receber valor positivo, atualizar as parcelas existentes em vez de criar novas.
5. Exibir alerta ao tentar avançar o pedido na esteira com parcelas zeradas.

### Critérios de aceite

- Frete e mercadoria com o mesmo número permanecem separados.
- Sincronizações simultâneas não duplicam títulos.
- Rascunhos zerados continuam preservados sem inflar o contas a pagar.

---

## Fase 6 — Importações seguras

### Ações

1. Remover ou adaptar o importador legado para usar o mesmo serviço transacional do importador atual.
2. Calcular hash do arquivo e registrar uma entidade de importação contendo:
   - hash;
   - nome original;
   - competência;
   - usuário;
   - modo;
   - data;
   - quantidade e total.
3. Bloquear reimportação acidental do mesmo arquivo e permitir exceção somente com confirmação e auditoria.
4. Fazer deduplicação linha a linha usando documento, parcela, vencimento, valor e loja normalizados.
5. Exibir prévia com linhas novas, repetidas, inválidas e divergentes antes da confirmação.
6. Importar o lote em uma única transação.

### Critérios de aceite

- Reimportar o mesmo arquivo não cria registros.
- Linhas parcialmente repetidas são identificadas individualmente.
- Falha no lote não deixa importação parcial.

---

## Fase 7 — Baixas e comprovantes

### Ações

1. Validar no backend:
   - valor pago finito e maior que zero;
   - limite de pagamento conforme a regra de negócio;
   - data de pagamento válida;
   - impossibilidade de liquidar título cancelado ou de valor zero;
   - comportamento explícito para baixa parcial.
2. Definir estados distintos se baixa parcial for permitida: `Parcialmente Pago` e `Pago`.
3. Gravar comprovante em arquivo temporário.
4. Confirmar metadados no banco e só então promover o arquivo para o nome definitivo.
5. Remover arquivo temporário em qualquer falha.
6. Na exclusão autorizada, mover comprovantes para quarentena recuperável, preservando auditoria.
7. Corrigir a verificação de caminho usando `path.relative()` e rejeitar caminhos absolutos ou que escapem da pasta.
8. Registrar auditoria também para exclusão de lançamentos.

### Critérios de aceite

- Valores zero, negativos, `NaN` e indevidos são rejeitados.
- Falha de banco não deixa novo comprovante órfão.
- Exclusão possui autoria, motivo, instante e snapshot recuperável.

---

## Fase 8 — Resumos, filtros e experiência da interface

### Ações

1. Preservar a regra atual da tela, que agrupa pela data completa quando o filtro atravessa mais de um mês.
2. Unificar visualmente o selo `DIA + número` e a data completa em um único componente de data, eliminando informação repetida. Sugestão: destacar `08 SET` no bloco principal e apresentar `2026` de forma secundária, mantendo a data completa acessível e inequívoca.
3. Corrigir o `dailyList` do backend para usar a data ISO completa como chave antes que esse contrato seja utilizado por outras telas ou integrações.
4. Excluir parcelas zeradas dos totais financeiros padrão, mantendo contador separado.
5. Exibir claramente os estados:
   - rascunho incompleto;
   - previsto;
   - confirmado;
   - vence hoje;
   - atrasado;
   - parcialmente pago;
   - pago;
   - cancelado.
6. Corrigir efeitos React com dependências incompletas nos fluxos de pedido e financeiro.
7. Remover geração de IDs com `Date.now()` e `Math.random()` durante renderização.
8. Introduzir carregamento sob demanda para PDF, Excel, dashboards e telas administrativas, reduzindo o bundle inicial.

### Critérios de aceite

- O cabeçalho apresenta a data uma única vez, com leitura rápida e sem perder dia, mês ou ano.
- A tela e o resumo da API não misturam datas iguais de meses ou anos diferentes.
- Totais padrão representam apenas obrigações com valor positivo.
- Re-renderizações não alteram IDs nem disparam salvamentos inesperados.

---

## Fase 9 — Isolamento e ampliação dos testes

### Ações

1. Versionar os testes necessários; remover `backend/tests/` da regra ampla de exclusão do Git.
2. Configurar banco temporário por execução, usando diretório exclusivo criado pelo runner.
3. Fazer o backend recusar a execução de testes quando o caminho do banco coincidir com produção.
4. Adicionar factories para pedido, parcela, recorrência, importação e usuário.
5. Cobrir:
   - criação parcelada repetida e concorrente;
   - sincronização simultânea;
   - frete e mercadoria com mesma numeração;
   - recorrências e viradas de data;
   - fuso horário de São Paulo;
   - importação repetida;
   - baixa inválida e parcial;
   - falha durante gravação de comprovante;
   - parcelas zeradas em rascunhos;
   - migração e rollback.
6. Executar lint, TypeScript, testes backend e build em CI.
7. Fazer warnings críticos de hooks e imutabilidade falharem gradualmente no CI.

### Critérios de aceite

- A bateria de testes não modifica `backend/data/mega12.db`.
- Execuções repetidas produzem o mesmo resultado.
- Os testes críticos de concorrência passam de forma consistente.

---

## Fase 10 — Observabilidade e operação

### Ações

1. Substituir `catch` vazios por tratamento explícito ou comentário justificado.
2. Padronizar erros com código, mensagem segura e `correlationId`.
3. Criar métricas e alertas para:
   - tentativa de duplicidade;
   - falha de recorrência;
   - falha de sincronização;
   - importação rejeitada;
   - baixa inválida;
   - comprovante órfão;
   - erro de persistência.
4. Sanitizar descrições, documentos e dados pessoais nos logs.
5. Criar rotina somente leitura de verificação periódica de integridade.

## 5. Sequência recomendada de pull requests

1. `security/redact-root-credentials-from-logs`
2. `test/isolate-database-and-version-financial-tests`
3. `finance/normalize-civil-dates`
4. `finance/fix-recurring-horizon`
5. `finance/atomic-installment-creation`
6. `finance/order-installment-identity`
7. `finance/idempotent-spreadsheet-import`
8. `finance/validate-payments-and-receipts`
9. `finance/summary-and-zero-draft-ux`
10. `observability/financial-error-reporting`

Cada PR deve ser pequeno o suficiente para revisão independente e deve incluir testes antes de ser integrado.

## 6. Plano de implantação

1. Homologar com uma cópia anonimizada do banco.
2. Executar o relatório de pré-migração.
3. Criar e validar backup.
4. Colocar o financeiro em janela curta de manutenção durante a migração de datas e índices.
5. Executar migração transacional.
6. Validar contagens e totais antes de liberar escrita.
7. Liberar inicialmente para um grupo pequeno de usuários.
8. Monitorar duplicidades, recorrências, sincronizações e baixas.
9. Expandir para todos os usuários após o período de observação.

## 7. Estratégia de rollback

- Manter backup completo anterior à migração.
- Não misturar migração destrutiva com mudança funcional no mesmo passo.
- Usar feature flags para novo importador, nova sincronização e tratamento visual de parcelas zeradas.
- Em caso de falha, bloquear novas escritas, preservar logs e restaurar o banco inteiro; não tentar desfazer parcialmente operações financeiras.

## 8. Definição global de concluído

O plano será considerado concluído quando:

- a conta `root` continuar operacional sem expor senha, hash ou token em logs;
- criações, sincronizações e importações forem atômicas e idempotentes;
- o banco impedir duplicidades estruturais;
- recorrências funcionarem corretamente em datas-limite e sob concorrência;
- frete e mercadoria não colidirem;
- baixas inválidas forem rejeitadas no backend;
- comprovantes tiverem ciclo de vida consistente e auditável;
- parcelas zeradas de rascunhos forem preservadas sem inflar totais financeiros;
- testes rodarem exclusivamente em banco temporário e fizerem parte do repositório;
- build, lint crítico e testes automatizados passarem no CI;
- migração, implantação e rollback estiverem documentados e ensaiados.
