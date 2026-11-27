# Pré-orçamento interno — Mega12 Sistema 2.0

> **Estimativa anterior, substituída para o escopo atual.** Após Josué limitar o fluxo das lojas a vendas diárias/metas e o recorte SULTS a problemas, tarefas, imagens e reuniões, consultar `ORCAMENTO_REVISADO_SISTEMA_2.0.md` para a avaliação comercial vigente. Os números abaixo representam um cenário mais amplo e não devem ser apresentados como preço da V2 delimitada.

**Data:** 12/11/2026  
**Estado:** estimativa de trabalho para preparação de proposta; **não é preço fechado nem documento para aceite**.  
**Base analisada:** `PLANEJAMENTO_IMPLANTACAO_SISTEMA_2.0.md`, `Portal ERP Jóia/` (React/Express, SQLite por empresa, app Android Compose), `App Erica/` (vendas e metas), `Sults/ANTIGRAVITY_SULTS_SPEC.md` e `Sults/PLANO_IMPLEMENTACAO.md`. Necessidades da conversa com Rafael e adições de Josué.

## 1. Decisão de trabalho

**Nenhuma implementação da V2 está autorizada neste momento.** O desenvolvimento começa somente após levantamento, delimitação de entregas e aprovação comercial. O aplicativo Android atual de compras/doca também é parte substancial do trabalho: os módulos de operação, supervisão, evidências e comunicação exigem novas telas, navegação por perfil, APIs, tratamento de rede e nova distribuição/teste do APK.

O escopo inclui a evolução da base web **e** do Android existente; `Sults` é especificação de referência, não software pronto para incorporar. O banco operacional previsto é SQLite por empresa, sujeito à avaliação de concorrência, durabilidade, backup e hospedagem antes da implantação em todas as lojas.

## 2. Entregas conhecidas para compor o orçamento-base

| Frente | O que inclui web, API, dados e Android quando aplicável | Aceite a definir |
|---|---|---|
| Levantamento e desenho | entrevistas com Rafael/Bruna/lojas, fluxos atuais, inventário de telas e dados, protótipo, regras, matriz de acesso e marcos | escopo e critérios assinados |
| Fundação e isolamento | autenticação por pessoa e unidade, revisão de tenant/RBAC, migrações SQLite, auditoria, backups, ambiente de homologação, anexos | testes de permissão, restauração e concorrência |
| Metas e App Erica no web | quatro áreas, metas por loja/mês, histórico, calendário, dashboard, projeção diária, gráfico, temas, simulação de comissão | paridade funcional/visual e cálculos em centavos |
| Vendas e conferência | lançamento diário, meios de pagamento, quantidade de vendas/ticket, anexos, estorno, fechamento, fila e devolução/aprovação por Bruna | fechamento de uma loja do início à conferência |
| Memorando e validade | fatos do dia, consulta anual, lotes/alertas, ciência e providências; integração real ao estoque só se especificada | registro, recuperação e histórico sem perda |
| SULTS: supervisão | modelos de checklist, execução por loja, fotos, não conformidades e plano de ação com revisão | ciclo de visita e correção completo |
| SULTS: comunicação e capacitação | comunicados segmentados, leitura, chamados básicos, conteúdo e progresso de treinamento | fluxo por perfil e histórico |
| Campanhas e investimento promocional | calendário de datas festivas, campanha por período/loja, orçamento e gasto realizado, peças/anexos, meta da ação, vendas/resultados informados, painel comparativo e histórico | aprovação da campanha, execução e análise simples |
| Android: fundação da V2 | refazer navegação por perfil/unidade, sessão, permissões, modelos/API, upload de evidências, estados de rede e distribuição | APK de homologação com fluxos existentes preservados |
| Android: SULTS operacional | checklists com fotos, planos de ação, chamados, comunicados, treinamentos e pendências; testar câmera, anexos e retomada de formulário | execução em aparelhos reais de perfis distintos |
| Android: metas e campanhas | acompanhamento de metas, vendas/memorando conforme perfil, leitura e tarefas de campanhas | paridade essencial com o web para o papel móvel |
| Qualidade e entrada em operação | testes de fluxo, segurança, migrações, desempenho, backup/restore, homologação com piloto, correções, publicação e treinamento | aceite por etapa e plano de retorno |

**Interdependência:** cada módulo exige pelo menos modelo de dados, regra no servidor, interface web, autorização, auditoria e testes. Quando usado no Android, acrescenta contratos, navegação, estados offline/erro, tratamento de mídia, QA em dispositivos e nova versão do APK. Reaproveitar código do App Erica como referência de comportamento; portar telas Compose do Android atual apenas onde a arquitetura permitir.

## 3. Campanhas e investimentos: recorte inicial e perguntas

O módulo inicial deve permitir cadastrar `campanha` (nome, objetivo, data comercial, período, público/unidades, responsável, status), `planejamento` (meta incremental, produtos, desconto, peças, canais, verba prevista, aprovação), `execução` (gasto por canal/ação, comprovantes, alterações e participação das lojas) e `resultado` (vendas no período, comparação com período-base, custo e comentários de contexto). Exibir **investimento realizado e variação de vendas**, sem anunciar ROI/lucro líquido como fato enquanto não houver regra de margem, atribuição e custos validada. Relacionar campanhas a calendário, metas e memorandos sem contar a mesma venda duas vezes.

**Decisões com Rafael:** se haverá aprovação de verba, níveis por loja/canal, custo de agência/tráfego/arte, campanha nacional versus local, cupons ou produtos participantes, dados do PDV, orçamento por mês, regra de resultado incremental e necessidade de anexar notas/comprovantes. Integrações com Meta Ads/Google Ads, mídia, PDV, automação de mensagens e atribuição avançada **não estão incluídas** na faixa inicial; dimensionar após conhecer origem dos dados e APIs.

## 4. Estimativa interna de esforço

As horas abaixo são **estimativas próprias de engenharia**, baseadas no código e nas entregas identificadas. Incluem implementação, integração e uma parcela de verificação dentro de cada frente; a linha de qualidade cobre testes integrados, homologação e implantação. Não são horas já trabalhadas. A amplitude reflete lacunas no levantamento.

| Frente | Horas mín. | Horas máx. |
|---|---:|---:|
| Levantamento, fluxos, protótipos e requisitos | 50 | 90 |
| Fundação: segurança, perfis, SQLite, anexos e homologação | 90 | 150 |
| Web: metas, App Erica, histórico e calendário | 120 | 190 |
| Web: vendas, caixa, conferência Bruna | 120 | 190 |
| Memorandos, validade e histórico | 80 | 130 |
| SULTS: supervisão, checklists, evidências, planos | 150 | 250 |
| SULTS: comunicados, chamados básicos e treinamentos | 140 | 230 |
| Campanhas e verbas promocionais (sem integrações externas) | 100 | 180 |
| Android: arquitetura, login, navegação, mídias e APIs | 100 | 160 |
| Android: checklists, ações, chamados, comunicados, treinamento | 180 | 300 |
| Android: metas, vendas/memorando e campanhas | 90 | 150 |
| Testes integrados, homologação, APK, piloto e implantação | 110 | 180 |
| **Total conhecido — núcleo V2** | **1.330** | **2.200** |

**Cenário de cálculo, não preço de mercado comprovado:** com **R$ 110 por hora** como hipótese comercial de Josué, o núcleo corresponde a **R$ 146.300 a R$ 242.000**. Uma **reserva interna de risco de 15%** elevaria a faixa de planejamento a aproximadamente **R$ 168.245 a R$ 278.300**; não somar reserva automaticamente ao cliente sem decidir o modelo de contrato. Rever o valor/hora com custos próprios, tributos, despesas, capacidade mensal, terceiros e margem. O Sebrae recomenda considerar custos, despesas e mercado na formação do preço; salários de empregado, como os do guia da Robert Half, **não equivalem a preço/hora de projeto**.

**SULTS ampliado:** a especificação de referência também descreve CRM/expansão, implantação, loja B2B, disco virtual, centro de marca, análises e funções mais complexas de universidade/chamados. “Todas as funções do SULTS no APK” pode significar essa lista inteira. **Não presumir que estão na faixa núcleo.** Reserva preliminar adicional de **600 a 1.100 horas** para web/API e Android juntos, a repartir por módulos após priorização. Se forem contratadas integralmente, planejamento bruto de **1.930 a 3.300 horas**; a R$ 110/h, **R$ 212.300 a R$ 363.000**, antes de reserva e custos externos. É uma ordem de grandeza, não um preço fechado para recursos ainda não definidos.

**Prazo:** com uma pessoa dedicando 110 horas produtivas/mês, o núcleo equivale a aproximadamente **12 a 20 meses**; com equipe e frentes paralelas, recalcular cronograma pela dependência entre backend, web, Android e validação. O ritmo real depende da disponibilidade de Rafael, Bruna, lojas e fontes de dados.

## 5. Como converter a estimativa em proposta comercial

### Calibração comercial para Josué (12/11/2026)

Josué informou que o projeto anterior foi contratado por **R$ 6.000** e que entregou mais do que o combinado. O orçamento original não foi localizado entre os arquivos identificáveis na raiz nesta revisão; portanto, o número de R$ 6.000 é informação do autor, sem auditoria das cláusulas antigas. **Não usar esse preço subdimensionado como custo/hora histórico nem aplicar um multiplicador simples.**

Para negociar como desenvolvedor independente que utiliza IA e reaproveita a base existente, uma **faixa de apresentação preliminar de R$ 120.000 a R$ 160.000 para o núcleo V2 inteiro** é uma hipótese comercial mais prudente que anunciar de imediato a faixa interna a R$ 110/h. O ponto de partida de conversa pode ser **R$ 140.000**, sempre com backlog fechado, entregas por marcos e cronograma revisado. A faixa é 20 a 26,7 vezes o preço de R$ 6.000; o aumento decorre da ampliação real para web, lojas, conferência, SULTS, campanhas, reformulação Android, testes e implantação, e não de um reajuste do mesmo produto. **Não reduzir escopo amplo para caber em R$ 6.000 a R$ 30.000.**

Para entrada comercial de menor compromisso, **contratar apenas a primeira etapa** (fundação, área das lojas/metas e um fluxo operacional definido) em faixa indicativa de **R$ 35.000 a R$ 55.000**; esse valor **não inclui** toda a V2, todo o SULTS no APK nem o conjunto de campanhas. Abater do total somente trabalhos efetivamente reutilizados e explicitamente previstos no contrato seguinte. Módulos SULTS ampliados, integrações e requisitos novos exigem preço adicional; a faixa interna ampliada da seção 4 continua referência para dimensioná-los.

Essa calibração representa um **desconto comercial substancial** frente à conta de horas da seção 4. Antes de assumir preço fixo, verificar a taxa efetiva: `preço líquido de tributos e despesas / horas realmente necessárias`. Se o backlog permanecer em 2.200 horas, R$ 120.000 equivalem a cerca de **R$ 54,55 por hora bruta**, antes de impostos, ferramentas e suporte; no extremo de R$ 160.000, **R$ 72,73/h bruta**. Se esse retorno não sustentar o tempo estimado, aumentar o preço, reduzir as entregas ou ampliar o prazo/equipe com custos explícitos. A IA pode acelerar tarefas, mas não elimina alinhamento com a operação, homologação e responsabilidade por dados financeiros e APKs.

1. **Etapa contratável de diagnóstico:** confirmar fluxo real, inventário do APK, dados históricos/PDV, lista fechada de funções SULTS e campanhas; entregar backlog priorizado, protótipos, arquitetura/risco SQLite e orçamento refinado por marco. Preço e prazo desta etapa devem ser definidos antes de oferecê-la.
2. **Contrato por entregas:** discriminar preço para (A) fundação + área de lojas/metas, (B) operação diária/Bruna, (C) SULTS web e Android, (D) campanhas, (E) piloto e implantação. Cada marco com critérios de aceite, número de revisões e condições de pagamento. Só iniciar o seguinte após definição e aceite do anterior.
3. **Mudanças solicitadas depois:** registrar pedido, valor ao negócio, dependências, estimativa de web/API/SQLite/Android/QA, impacto de prazo e preço; apresentar aditivo e obter aceite **antes** de desenvolver. Reservar uma lista de melhorias futuras sem incorporá-las silenciosamente ao valor fechado.
4. **Custos recorrentes e terceiros à parte:** hospedagem e armazenamento persistente do SQLite, backup, mídia/fotos/vídeos, envio de notificações/e-mails, contas de distribuição, serviços externos, dispositivos de teste e manutenção mensal. Detalhar quem contrata e paga cada item.
5. **Suporte após entrega:** definir janela de correção de defeitos do escopo aceito e proposta separada para manutenção, atualizações do Android, backups/monitoramento e novas funcionalidades.

## 6. Riscos que mudam preço ou prazo

- **Dados e operação:** fonte oficial das vendas, importação histórica, divergência entre PDV e lançamento, conciliação real com Bruna, calendário por loja e regras de comissão.
- **Tecnologia:** `Portal ERP Jóia` usa SQL.js com exportação do banco SQLite para arquivo a cada gravação; validar concorrência, integridade e persistência em hospedagem com várias lojas antes de prometer escala. O Android atual tem rotas de compras/doca e não implementa SULTS; o segundo projeto é majoritariamente especificação e scaffold.
- **Escopo SULTS:** fotos, vídeo, quiz, certificado, assinatura, geolocalização, notificações, SLA e uso offline exigem definição separada por processo, dispositivos e volume. Sincronização offline com conflito é uma frente própria se necessária.
- **Comercial:** campanhas podem exigir integrações pagas e métricas de atribuição que não saem apenas de vendas diárias; módulos adicionais devem ser orçados por solicitação.

## 7. Perguntas para fechar o orçamento com Rafael

1. Quais telas **web** e **Android** de cada módulo serão usadas por loja, supervisão, Bruna e diretoria? Precisa de iOS ou somente Android?
2. “SULTS completo” inclui CRM/expansão, implantação, B2B, disco virtual, centro de marca, certificações, SLA, assinaturas, geolocalização e trabalho offline? O que é obrigatório no primeiro lançamento?
3. Que relatórios do PDV e comprovantes sustentam vendas, metas, caixa e resultados de campanha? Integração automática está desejada?
4. Quem cadastra e aprova campanhas/verbas, qual relatório de resultado é necessário e quais canais terão gasto importado automaticamente?
5. Quantas lojas, usuários simultâneos, visitas com fotos e treinamentos em vídeo são esperados? Onde ficará o SQLite persistente e os anexos?
6. Qual data-alvo e quais entregas são imprescindíveis para o piloto? Quem fará o aceite e em quanto tempo responderá a cada validação?

**Referências externas para método de preço, não para estimativa de horas:** Sebrae, “Como definir o preço de venda de um produto ou serviço” (https://meuatendimento.sebrae.com.br/sites/PortalSebrae/artigos/como-definir-o-preco-de-venda-de-um-produto-ou-servico%2Ccc9836627a963410VgnVCM1000003b74010aRCRD); Robert Half, “Desenvolvedor(a) Mobile Pleno em Curitiba — Guia Salarial 2026” (https://www.roberthalf.com/br/pt/vagas-detalhes/desenvolvedora-mobile-pleno/curitiba). Os números de horas e a hipótese de R$ 110/h são **nossos**, e não valores retirados dessas fontes.
