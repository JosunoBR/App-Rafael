# Acompanhamento da versão 2.0: proposta, prévia e implantação

**Atualizado em 23/11/2026.** Documento de acompanhamento da interface. Fonte de escopo: `PLANEJAMENTO_IMPLANTACAO_SISTEMA_2.0.md`, principalmente seções 3 e 4. O termo **prévia visual** significa componentes com exemplos locais: não há persistência, autorização definitiva no servidor nem integração real com o APK.

| Item proposto | O que existe hoje no código | Próximo trabalho funcional |
|---|---|---|
| Acesso de loja e dados por unidade | Cadastro de lojas e usuários no Mega 12; prévia da página da loja em `web/src/modules/storePortal` | Relacionar usuários e lojas no backend; filtrar cada consulta e gravação por unidade autorizada. |
| Metas, supermeta, histórico e ritmo diário | Páginas de prévia em `web/src/modules/goalsExecutive` e em `web/src/modules/unitsManagement/pages/StoresHistoryPage.tsx`; dados locais simulados | Validar fórmulas, planilha, calendários e importação; gravar metas publicadas e histórico em SQLite. |
| Caixa diário consolidado, despesas e memorando | Modal e calendário de prévia em `web/src/modules/storePortal`; páginas de caixa em `web/src/modules/unitsManagement`; prévia adicional na página root | Confirmar campos e significado do total caixa; criar persistência, edição controlada e histórico; evitar cadastrar cada venda individual. |
| Conferência e devolução pela Bruna | `UnitsManagementPage.tsx` com fila e estados locais simulados | API, aprovação/devolução no banco, auditoria e controle de permissões. |
| BI de lojas | `StoresBiPage.tsx` com interface visual | Usar apenas dados validados das lojas; definir indicadores e fontes. |
| Feriados e dias sem expediente | Prévia visual nos módulos de loja e conferência | Definir quem solicita/aprova, impacto em metas e calendário versionado. |
| Validade de produtos e alertas | Especificação técnica completa aprovada (23/11/2026): Coleta opcional na Doca/Separação, Rastreio por loja destinatária, Lista proativa de 30 dias na Loja, Alerta simultâneo de 15 dias (Loja + Perfil Bryan) com snooze de 2h ("Vou conferir") e confirmação ("Conferido"), e Lembrete crítico no Dia D de retirada de venda | Implantar quando a tela das unidades (metas, caixas e conferência) estiver totalmente operacional: criar tabela SQLite `store_product_validities`, inputs na Doca, tela de 30 dias e modal de alerta na Loja, e Central de Monitoramento do Bryan. |
| Requisições de insumos de loja | Novo card de prévia root; pedidos de compra centrais já existem, mas são outro processo | Catálogo de insumos e fluxo loja → matriz/depósito, sem duplicar pedidos de fornecedor. |
| Comunicados e confirmação de leitura | Novo card de prévia root | Editor, destinatários por unidade, leitura, avisos urgentes e histórico. |
| Checklist de supervisão | Novo card de prévia root | Modelos, respostas, fotos de evidência, pontuação e vínculo a pendências. |
| Problemas, melhorias, tarefas e planos 5W2H | Novo card de prévia root | Ocorrência, prioridade, responsável, prazo, fotos, comentários, conclusão e aprovação. |
| Agenda, reuniões e pautas | Novo card de prévia root | Calendário simples, participantes, pauta e encaminhamentos; sem videoconferência. |
| Pessoas e documentos corporativos | Novo card de prévia root; existem usuários e anexos de pedidos no Mega 12 | Ficha por unidade, pastas, acesso aos arquivos e histórico de versões, se confirmado o detalhamento. |
| Universidade corporativa | Novo card de prévia root | Cursos, materiais, participantes e progresso; confirmar a profundidade dos questionários. |
| Implantação de novas unidades | Novo card de prévia root | Etapas, tarefas, responsáveis e evidências de abertura. |
| Android para rotinas SULTS | APK atual possui compras, financeiro e separação; nenhuma dessas novas prévias foi incluída nele | Especificar telas por perfil; implementar depois de validar o fluxo web/API, imagens e eventual operação sem internet. |
| Campanhas e investimentos promocionais | Somente levantamento no planejamento | Detalhar objetivos, datas, verbas, aprovações e indicadores antes de desenhar a tela. |
| DRE | Previsto como trabalho posterior ou paralelo | Permanecer fora desta prévia. |

## Prévia criada nesta etapa

- Rota web `/versao-2/previa`, com acesso **somente root** no controle visual de navegação.
- Áreas navegáveis **Loja e financeiro**, **Operação SULTS** e **Pessoas e rede**, com cartões, campos e etapas ilustrativas para debate.
- Selecionar uma área/módulo altera apenas o que aparece na tela. Nenhum botão de negócio, envio de foto, formulário de gravação, endpoint ou tabela foi criado nesta etapa.
- A restrição de acesso existe somente no frontend da prévia; qualquer módulo futuro com dados reais exigirá verificação de acesso no backend e por loja.

## Próxima revisão de escopo

1. Validar com Rafael, Bryan e Bruna as telas e responsabilidades de cada perfil; confirmar a transcrição e os processos efetivamente usados no SULTS.
2. Definir prioridades e disponibilidade no **web versus Android**; separar módulos que exigem fotos, leitura/aceite ou uso offline.
3. Registrar decisão por módulo nesta tabela: `planejado → prévia visual → regras validadas → backend/API → web integrado → Android integrado → testado/homologado`.
4. Manter separados o orçamento fechado de caixa/metas/conferência e a ampliação para módulos SULTS/Android até acordo comercial explícito.

## Atualização em 26/11/2026: páginas de Franquias no Mega 12

- O protótipo na pasta `Sults` tem apenas um painel de cartões e um menu demonstrativo; não há páginas de módulos nem API operacional a incorporar.
- Criadas 13 rotas próprias em `/franquias/`, acessadas pelo submenu **Mega 12 · Franquias**. Cada tela tem descrição, fluxo, campos previstos e listagem adequada ao módulo. Os módulos não confirmados por Bryan estão sinalizados.
- As novas páginas usam a logo Mega 12, o estilo visual do sistema e acesso temporário restrito ao root no frontend. A tela de unidades consulta o cadastro atual via `/config/stores`; Comunicados grava no SQLite; as outras telas são prévias editáveis sem persistência ou registros simulados.
- Próxima etapa: validar as regras e os campos por módulo, criar migrações SQLite, endpoints e autorização no servidor, depois conectar as telas e o aplicativo Android aos dados reais.

### Avanço do módulo Comunicados

- Tela própria para publicar avisos para toda a rede ou unidades selecionadas, consultar o histórico e arquivar.
- Dados gravados nas tabelas SQLite de comunicados, destinatários e auditoria; endpoints protegidos para root.
- Teste isolado em banco temporário cobre acesso, validação de unidades, publicação, histórico e arquivamento.
- Confirmação de leitura e exibição na loja dependem da próxima etapa.

### Formulários das demais páginas

- Páginas restantes receberam formulários próprios de prévia, campos específicos e, para compras, checklists e implantação, linhas de itens editáveis apenas em memória. O preenchimento não grava no SQLite.
- Agenda oferece acesso ao calendário existente, que já grava memorandos diários; compromisso, participantes e pauta continuam em preparação.
- Próximos módulos exigem regras aprovadas, modelo de dados específico, permissões no backend e migrações SQLite antes de habilitar gravação.
