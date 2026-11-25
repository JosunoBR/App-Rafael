# Histórico mensal e sugestão de metas

O cadastro de unidades continua sendo `stores`. Nenhuma loja é criada pela importação. Nomes e situação da loja são consultados a cada carregamento; o relacionamento usa seu ID, que permanece válido após renomear a unidade.

## Fluxo

1. A planilha alimenta o histórico no SQLite, com a origem dos registros e preservação de células vazias (`NULL`) e zeros.
2. `/unidades/historico` apresenta o mesmo mês em cada ano, para faturamento e lucro líquido. A seleção de todos os meses e a consulta às abas originais permitem conferir todos os registros, inclusive custos, metas originais, resumos e notas.
3. `/metas` consulta esse mesmo histórico. A sugestão é o faturamento do mesmo mês do ano imediatamente anterior × 1,08, arredondado em centavos. Sem base, não há sugestão. Uma base informada igual a zero gera sugestão zero.
4. O calendário conta segunda a sábado, excluindo domingos e feriados nacionais, inclusive no sábado. A quantidade de dias não altera a meta mensal; serve para comparar os anos e dividir a meta diária. Consciência Negra passa a integrar o calendário nacional em 2024. Carnaval e Corpus Christi permanecem como dias de trabalho nesta regra.
5. A média da evolução do lucro usa apenas pares de anos consecutivos anteriores ao ano da meta, para o mesmo mês. Em reais: diferença média. Em percentual: média de `(atual - anterior) / abs(anterior) × 100`; base zero não entra no percentual. Meses sem faturamento informado ou com faturamento zero na aba individual aparecem com um traço (—) no comparativo de lucro e ficam fora dessa média; custos calculados automaticamente nesses períodos não são exibidos como prejuízo. Perdas de meses com faturamento continuam sendo exibidas. Os valores da fonte são preservados na consulta às abas originais. Lucro ausente não é estimado.
6. A diretoria pode preencher metas com as sugestões, ajustar valores e salvar no SQLite. A sugestão de +8% permanece independente do valor planejado. O salvamento é transacional, validado no servidor, autenticado, auditado e verifica a versão para impedir sobrescritas concorrentes.

## Tabelas

- `goal_imports`: versão do arquivo (SHA-256), origem, responsável e data da importação; uma versão ativa.
- `goal_source_sheets`: todos os registros originais de cada aba, incluindo totais e informações auxiliares.
- `goal_store_links`: vínculo entre o nome de origem e `stores.id`. Não é outro cadastro de lojas. Registros sem correspondência ficam pendentes, sem criar lojas.
- `goal_sales_history`: faturamento por origem, ano e mês; relacionamento com a loja por `goal_store_links`.
- `goal_profit_history`: lucro e faturamento informados nas abas individuais, por ano e mês; relacionamento pela aba vinculada à loja.
- `goal_monthly_baselines`: PE, metas e comissões originais de cada mês.
- `goal_cost_centers` e `goal_cost_items`: centros de custo, totais e itens; relacionados pela identificação de custo em `goal_store_links`.
- `goal_monthly_totals`: totais mensais registrados na planilha.
- `store_goals`: metas planejadas com FK para `stores.id`, ano/mês, centavos, versão e autoria.
- `store_goal_audit`: auditoria de importação, relacionamentos e mudanças nas metas.

As tabelas são criadas automaticamente ao iniciar o backend. A primeira consulta ao histórico importa a carga preparada, apenas se ainda não houver histórico. Reimportar o mesmo arquivo não duplica registros nem substitui metas planejadas. Importações novas são arquivadas em versões, preservando as anteriores. Lojas com histórico ou metas são inativadas quando retiradas do cadastro, preservando seus relacionamentos.

Os nomes alternativos conhecidos da fonte são comparados com `name`/`shortName` do cadastro; nenhum ID de loja é fixado no código. Os vínculos podem ser conferidos e ajustados pela diretoria nos dados adicionais da página de metas. Porto União não é associado automaticamente a Guarapuava.

## Atualizar a carga da planilha

Na raiz do projeto, depois de substituir `VENDAS ANUAL ALS.xlsx`:

```powershell
node scripts/generateGoalsData.js
```

Isso prepara `backend/src/data/goalsWorkbookSeed.json`, incluindo todas as abas. A primeira consulta importa a carga em uma base vazia. Para uma base com histórico, a diretoria deve acionar `POST /api/goals/import` com sua sessão autenticada. Não execute gravações diretas no arquivo SQLite enquanto outro processo do backend estiver utilizando a base (o sistema utiliza sql.js em memória).

As rotas `GET /api/goals/history` e `GET /api/goals/history/source-sheet` permitem consultar o histórico com permissão `nav:units_history` ou `nav:goals`. Leitura de metas exige `nav:goals`; gravação exige diretoria/root ou permissão explícita `goals:manage`. Importação e alteração dos vínculos são restritas à diretoria/root.

## Validação local

```powershell
npm --prefix web run test:goals
npm --prefix backend run test:goals
npm --prefix web run build
```

O teste do backend cria seu próprio SQLite em uma pasta temporária, sem acessar produção. Opcionalmente, definir `GOALS_PLAYWRIGHT_PATH` para uma instalação de Playwright habilita o teste de navegador com Edge: histórico mensal, abas originais, sugestões, gravação/reabertura, cadastro dinâmico, busca e layouts claro/escuro e móvel. Todas as chamadas desse teste são restritas ao computador local.

## BI das unidades

O BI consulta `GET /api/units-bi`, autenticado com permissão `nav:units_bi` (diretoria/root também possuem acesso). O endpoint utiliza o mesmo histórico importado do SQLite, as metas salvas em `store_goals` e os fechamentos diários aprovados. Não usa mais as listas de demonstração.

A abertura seleciona o último período com dados disponíveis; mês e ano podem ser alterados para consultar toda a série histórica. O painel apresenta faturamento, lucro, comparação do mesmo mês entre os anos, evolução mensal no ano, desempenho por unidade e metas. Sem meta salva, a sugestão de +8% é identificada como sugestão. A evolução percentual compara apenas unidades com valores nos dois períodos, com a cobertura apresentada na tela.

Um valor mensal do histórico prevalece sobre fechamentos diários da mesma unidade e competência, evitando dupla contagem. Quando o histórico não tem valor e há fechamentos aprovados, estes alimentam o faturamento do período. A curva diária e a distribuição de pagamentos utilizam exclusivamente os fechamentos aprovados; dados mensais não são repartidos artificialmente por dia nem por pagamento. Ausência de informação é apresentada com traço, e não como zero.

Validações adicionais: `npm --prefix web run test:units-bi` e `npm --prefix backend run test:units-bi`. Definir `GOALS_PLAYWRIGHT_PATH` no teste do backend permite validar o BI em navegador local, usando banco temporário isolado.
