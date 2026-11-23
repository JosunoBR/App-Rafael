# Estimativa comercial revisada — Mega12 2.0

**Data:** 12/11/2026 · **Status:** cenário de negociação, ainda sem escopo fechado.  
**Referência atualizada:** Josué informou proposta original de **R$ 6.800**, arredondada a pedido do cliente para **R$ 6.000**, com entrega acima do combinado. O arquivo original não foi localizado nesta revisão na raiz; os valores e o excedente são informações do autor.

> **Recalibração comercial solicitada por Josué:** as faixas históricas adiante **não são proposta comercial**. O primeiro marco deve incluir **módulo de definição/publicação de metas por Rafael, página da loja para venda diária e memorando, fila de Bruna para aprovar ou devolver e correção com histórico**. Não há PDV nem conciliação automática. Minha avaliação provisória para **esse primeiro marco inteiro é R$ 7 mil a R$ 11 mil**, dependendo da fórmula das metas e das telas de conferência; não confundir com a tela isolada de R$ 3,5 mil a R$ 6 mil mencionada na conversa. As demais frentes (problemas/tarefas/fotos/reuniões, Android, campanhas) exigem marcos próprios e nova soma após levantamento. Nenhum valor anterior para a V2 completa deve ser apresentado como vigente.

> Esta revisão **substitui, para o escopo abaixo, a faixa do arquivo `ORCAMENTO_PRELIMINAR_SISTEMA_2.0.md`**. A estimativa antiga supunha fechamento detalhado de caixa, conferência completa, treinamento, chamados e amplo conjunto de módulos SULTS no web e no Android. Essas funções não são pressupostas nesta versão revisada.

## Escopo-base que estamos precificando

| Entrega | Limite desta estimativa |
|---|---|
| Lojas + Rafael + Bruna | Rafael define/publica meta e supermeta em **módulo da matriz**. Loja autenticada vê metas, lança **um total final de vendas por dia e memorando**, e acompanha devoluções. Bruna recebe fila, confere com sua fonte externa, aprova ou devolve com motivo; correção fica no histórico. Sem PDV, captura de cada cupom, decomposição por forma de pagamento ou conciliação automática. |
| Problemas e melhorias das unidades | Abertura por loja/supervisor, categoria, descrição, prioridade, fotos de antes, autor, data, histórico, evidência de correção e aprovação/devolução. Checklist simples de visita, se Rafael confirmar o roteiro. |
| Tarefas e planos de ação | Matriz/supervisão atribui à loja ou pessoa responsável, com prazo, status, comentários, anexos e conclusão validada. Ligação opcional a problema ou reunião. |
| Reuniões | Agenda de visitas/reuniões, data, horário, unidade, participantes e registro das **pautas**. Sem ata formal, decisões, tarefas automáticas, videochamada, gravação ou transcrição. |
| Campanhas | Datas festivas, ação planejada por loja, verba prevista/realizada, responsáveis, tarefas, comprovantes e comparação simples com vendas do período. **Sem integrações de anúncios, atribuição automática ou ROI contábil.** |
| Android | Adequar APK existente para supervisor/unidade acompanhar problemas, anexar fotos, executar tarefas, consultar reuniões e o que fizer sentido do painel de metas; preservar compras/doca existentes. Sem assumir todos os módulos do SULTS. |
| Fundação e entrega | Permissões por pessoa/loja, SQLite existente por empresa, API, auditoria, backup, ambiente de teste, QA web/Android e piloto antes de liberar para todas as unidades. |

O SULTS é **referência de fluxo**, não um compromisso de paridade total com seus mais de 25 módulos. A empresa apresenta checklist e não conformidade com fotos, plano corretivo e validação, tarefas atribuídas a unidades e agenda para reuniões. **Ata, decisões e vínculos com tarefas são proposta para a Mega12**, a confirmar com Rafael. Referências oficiais: https://www.sults.com.br/produtos/checklist/gestao-de-nao-conformidades ; https://www.sults.com.br/produtos/tarefas ; https://www.sults.com.br/produtos/agenda .

## Estimativa de esforço independente, com reutilização e IA

| Frente | Horas estimadas |
|---|---:|
| Levantamento, regras e protótipos | 25–45 |
| Perfis, segurança, SQLite e ambiente isolado | 50–85 |
| Web: vendas diárias, metas e histórico | 80–140 |
| Web/API: problemas, visitas, fotos e validação | 90–160 |
| Web/API: tarefas e planos de ação | 80–130 |
| Reuniões, ata e ações vinculadas | 45–80 |
| Campanhas e investimento básico | 70–120 |
| Android: perfis, problemas, fotos, tarefas, reuniões e metas pertinentes | 130–240 |
| Testes integrados, correções, piloto e APK | 70–120 |
| **Total preliminar** | **640–1.120** |

Estas horas são **hipóteses de planejamento próprias** e devem ser revistas com fluxos e telas aceitos. A IA reduz parte da implementação repetitiva, mas exige revisão de regras, integração, segurança, homologação e manutenção. Para uma pessoa com 110 horas produtivas por mês, a faixa equivale a aproximadamente **6–10 meses**, sem promessa de calendário.

## Sugestão de preço

**Valor de abertura da negociação: R$ 65.000** para o escopo-base acima, com faixa de acordo de **R$ 50.000 a R$ 80.000** conforme detalhes e prazo. Esse preço não resulta de multiplicar os R$ 6.000 do contrato anterior: considera o novo trabalho e o fato de que o preço antigo incluiu entregas adicionais. Equivale a cerca de **8,3 a 13,3 vezes** aquele contrato, para entregas novas no web, banco e Android.

Não apresentar a faixa inteira como preço fechado de qualquer combinação de pedidos. Para reduzir investimento inicial, contratar **primeiro marco de R$ 15.000 a R$ 25.000** com fundação estritamente necessária, login por loja e metas/vendas diárias web; **demais frentes ficam fora desse marco**. Preços dos marcos restantes serão fechados após validação do backlog e só se abate trabalho realmente reutilizado.

**Piso de prudência:** R$ 50.000 no extremo de 1.120 horas renderia ~**R$ 44,64/h bruta** antes de tributos e despesas; com essa quantidade de trabalho, renegociar preço, prazo ou escopo. R$ 65.000 / 880 horas (ponto médio) = **R$ 73,86/h bruta**. O Sebrae orienta formar preço equilibrando custos/despesas e condições de mercado: https://meuatendimento.sebrae.com.br/sites/PortalSebrae/artigos/como-definir-o-preco-de-venda-de-um-produto-ou-servico%2Ccc9836627a963410VgnVCM1000003b74010aRCRD .

## Quanto poderia ter sido cobrado pelo projeto atual?

**Avaliação retrospectiva, não perícia do contrato:** pelo sistema efetivamente visível no repositório (compras e cotações, regras fiscais, distribuição para lojas, estoque central, financeiro, usuários, PDFs/Excel, web e app Android com fluxos de compras/doca), uma **faixa comercial plausível para um desenvolvedor independente com IA seria R$ 30.000 a R$ 45.000**, se todas essas entregas fizeram parte do serviço concluído. **R$ 35.000 a R$ 40.000** seria um ponto de negociação defensável. Trata-se de opinião de precificação, não valor verificável sem proposta original, horas trabalhadas, qualidade final e condições de suporte.

R$ 6.000 são cerca de **13% a 20%** dessa faixa retrospectiva, indicando provável subprecificação do conjunto entregue; não significa que o contrato antigo possa ser alterado unilateralmente. Usar o aprendizado para documentar escopo, critérios de aceite, revisões e cobrança de solicitações novas.

## Alterações que exigem nova cotação

Conciliação automática de caixa ou detalhamento por meios de pagamento (a **conferência manual de Bruna está incluída no primeiro marco**); integração com PDV; controle de validade/estoque por lote; notificações push; modo offline com sincronização; vídeo, geolocalização e assinatura; videochamada ou gravação; treinamento/certificação; chamados com SLA; todos os módulos SULTS; integrações de anúncios e cálculo avançado de retorno de campanha; suporte recorrente e hospedagem. Se algum for prioritário, dimensionar e **adicionar ao preço** antes de contratar.

## Perguntas que fecham a proposta

1. Quem registra problemas: supervisor, loja ou ambos? Há roteiro/checklist obrigatório? Quem valida a correção?
2. Reunião significa somente agenda, ou pauta, presença, ata, anexos e tarefas com prazo? Precisa de reunião remota integrada?
3. Android deve permitir lançar vendas ou só consultar metas? Quais perfis usarão fotos/tarefas no aparelho?
4. Campanhas incluem aprovação de verba, custo por canal e materiais para as lojas? De onde virão os resultados?
5. Qual horário/regra para corrigir vendas e quem pode publicar metas por unidade?
