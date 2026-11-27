# Análise Comparativa dos 13 Módulos — Mega 12 · Franquias

> **Documento interno de implementação e continuidade**
>
> Data: 26/11/2026
> Escopo: submenu **Mega 12 · Franquias**, com os 13 itens do print enviado pelo usuário.
> Base de comparação: print do submenu, código atual do Mega 12, mockups e páginas públicas da plataforma de referência, documentação pública de APIs e catálogo do canal de vídeos.
>
> **Regra central:** o produto final é **100% Mega 12**. A plataforma de referência serve apenas para entender comportamento, fluxo e regras. Nenhum nome, marca, cor, fonte, asset, texto ou layout dela é incorporado à interface.

---

## 0. Regra de identidade e nomenclatura (obrigatória)

Esta regra vale para todo o projeto, em qualquer módulo, tela, componente, API ou documento entregue ao usuário.

### 0.1 O que é proibido

- Exibir o nome da plataforma de referência em títulos, subtítulos, botões, labels, placeholders, mensagens de erro, `aria-label`, `title`, e-mails, notificações, relatórios, PDFs ou exportações.
- Usar logo, ícone, ilustração, foto, print, fonte, paleta, textura ou qualquer asset da referência.
- Copiar textos, microcopy, nomes de funcionalidades ou estrutura de navegação literal.
- Criar URLs, nomes de arquivos, tabelas, colunas, variáveis ou comentários com a marca da referência.
- Inserir “em implantação”, “prévia”, “dados fictícios” ou texto de planejamento interno em telas de produção.

### 0.2 O que é obrigatório

- Toda a copy é Mega 12: **“Mega 12 · Gestão de Franquias”**, **“Rede”**, **“Matriz”**, **“Unidade”**, **“Supervisor”**, **“Equipe da loja”**.
- Toda a interface usa os tokens e componentes do Mega 12:
  - `--primary: #10B981` e variações;
  - base `slate`;
  - cartões `rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-700/80 dark:bg-slate-800/90`;
  - inputs `rounded-xl` com foco `emerald`;
  - títulos `font-black`/`font-bold`, textos auxiliares `text-xs text-slate-500 dark:text-slate-400`;
  - ícones `lucide-react`.
- A referência externa só pode ser citada em **documentos internos de pesquisa**, nunca no produto, no help center, nos materiais de venda ou nos textos enviados ao cliente.
- Em revisão de PR, rejeitar qualquer string da marca de referência na UI, nos assets ou nos textos gerados.

### 0.3 Checklist de revisão

- [ ] Nenhuma ocorrência da marca de referência em `web/src`, `backend/src`, assets ou textos de tela.
- [ ] Nenhuma cor/fonte/layout copiado; tudo segue o design system Mega 12.
- [ ] Nenhum texto de planejamento interno visível ao usuário.
- [ ] Nenhum dado fictício em produção.
- [ ] Nenhum formulário que aceite dados e não persista.
- [ ] Nenhuma tela sem estado de carregamento, vazio e erro.

---

## 1. Método, fontes e limites

### 1.1 O que foi comparado

| Fonte | Uso |
|---|---|
| Print do submenu enviado pelo usuário | Confirmar itens, ordem, rótulos e organização do menu. |
| `web/src/shared/franchiseModules.ts` | Fonte de verdade dos 13 módulos no código. |
| `web/src/modules/franchises/pageDefinitions.ts` | Conteúdo atual dos placeholders. |
| `web/src/components/FranchiseModulePage.tsx` | Estrutura visual atual das páginas. |
| `web/src/modules/franchises/pages/AnnouncementsPage.tsx` | Único módulo com persistência real. |
| Páginas públicas de produto e mockups | Entender a estrutura funcional e visual das telas de referência. |
| Documentação pública de APIs | Entender entidades, campos e operações por módulo. |
| Canal de vídeos | Confirmar que o conteúdo é institucional/cases, sem tutoriais por módulo. |

### 1.2 Limites

- A central de ajuda da referência é autenticada e não foi acessada.
- As telas autenticadas da referência não foram acessadas; a comparação visual usa mockups públicos.
- O print mostra apenas o submenu, não o conteúdo das páginas. Portanto, a comparação de página é feita contra o padrão do próprio Mega 12 e contra os mockups públicos.
- Não houve cópia de código, HTML, CSS, imagens ou textos. A implementação proposta é original.

---

## 2. O que o print confirma

O print mostra o submenu **“Mega 12 · Franquias”** com 13 itens. O código atual reproduz exatamente a mesma lista, na mesma ordem:

| # | Item do submenu | Rota atual | Estado atual |
|---:|---|---|---|
| 1 | Unidades | `/franquias/units` | Parcial: lista real de lojas, sem detalhe/edição. |
| 2 | Mega 12 · Pessoas e Docs | `/franquias/documents` | Placeholder. |
| 3 | Compras de Insumos | `/franquias/purchases` | Placeholder. |
| 4 | Comunicados | `/franquias/announcements` | Implementado: publicar, arquivar, buscar. |
| 5 | Checklists | `/franquias/checklists` | Placeholder. |
| 6 | Agenda | `/franquias/agenda` | Placeholder com link para o calendário existente. |
| 7 | Universidade Corporativa | `/franquias/university` | Placeholder. |
| 8 | Implantação de Unidades | `/franquias/implementation` | Placeholder. |
| 9 | Analytics | `/franquias/analytics` | Placeholder. |
| 10 | Jornada | `/franquias/journey` | Placeholder. |
| 11 | NES | `/franquias/nes` | Placeholder. |
| 12 | NPS | `/franquias/nps` | Placeholder. |
| 13 | Termos LGPD | `/franquias/lgpd` | Placeholder. |

**Conclusão:** o submenu está correto e consistente com o print. O problema não é a navegação; é o conteúdo das páginas. Hoje, 11 dos 13 itens são placeholders e 1 é parcial. Apenas Comunicados tem persistência real.

---

## 3. Diagnóstico visual atual

### 3.1 O que está consistente

- O shell do sistema (Sidebar + Header + `<main>`) é o mesmo em todas as rotas.
- O submenu usa o mesmo componente de navegação e os mesmos ícones.
- As páginas de franquias já usam Tailwind, dark mode, `rounded-2xl`, `emerald` e `lucide-react`.
- Comunicados já segue o padrão de cartões, inputs, badges e estados de erro/sucesso do sistema.

### 3.2 O que destoa

| Problema | Evidência | Impacto |
|---|---|---|
| Cabeçalho em gradiente escuro em todas as páginas | `FranchiseModulePage.tsx` e `AnnouncementsPage.tsx` usam `from-slate-900 via-slate-800 to-emerald-950` | O restante do sistema usa cabeçalho branco com ícone e título. O gradiente é adequado para a Home, não para 13 páginas internas. |
| Texto de planejamento interno na tela | “Fluxo de trabalho”, “Dados necessários”, “Campos de…”, “Estrutura prevista”, “Cadastro e consulta em implantação” | O usuário vê documentação, não uma ferramenta. Passa impressão de produto inacabado. |
| Formulário que não salva | `FranchiseDraftForm.tsx` avisa: “Os dados preenchidos aqui não são enviados nem salvos” | Risco de perda de dados digitados, contra a diretriz de UX do projeto. |
| Lista vazia genérica | Tabela de registros sem ação primária clara | O usuário não sabe o que fazer para começar. |
| Acesso restrito ao root | `canAccessTab` retorna verdadeiro apenas para `root`/`usr_root` | Nenhum perfil operacional consegue usar os módulos. |
| Falta de detalhe/edição | Unidades só lista; demais módulos não têm formulário real | Não há ciclo completo de trabalho. |
| Falta de estados | Sem skeleton, erro e vazio com ação na maioria dos módulos | Percepção de travamento e falta de feedback. |

### 3.3 O que os placeholders mostram hoje

Os 11 placeholders seguem, com pequenas variações, o mesmo esqueleto:

1. Banner em gradiente com logo, eyebrow, título, descrição e badge de status.
2. Card **“Fluxo de trabalho”** com 3 etapas.
3. Card **“Dados necessários”** com dependências.
4. Card **“Prévia do formulário”** com campos e o aviso de que nada é salvo.
5. Card **“Registros de…”** com tabela vazia.

Exemplos de conteúdo:

| Módulo | Fluxo exibido | Campos exibidos |
|---|---|---|
| Compras de Insumos | Solicitar → Conferir e separar → Registrar entrega | Unidade solicitante, Item, Quantidade, Justificativa, Situação |
| Checklists | Definir modelo → Realizar vistoria → Tratar apontamentos | Unidade, Supervisor, Data, Itens verificados, Evidências |
| NPS | Definir público → Coletar avaliações → Analisar resultados | Título, Pergunta, Público, Período, Respostas |
| Termos LGPD | Revisar termo → Disponibilizar → Registrar aceite | Título, Versão, Arquivo, Público, Data do aceite |

**Consequência:** a página explica o módulo, mas não permite executá-lo. O usuário entende a intenção e não encontra a ação.

### 3.4 Padrão de página recomendado

Criar um `FranchisePageHeader` único, alinhado às telas principais do Mega 12 (Unidades, Catálogo, Usuários):

```text
┌────────────────────────────────────────────────────────────────────┐
│ [ícone]  Título do módulo            [badge de contagem]  [ação]  │
│          Descrição curta em uma linha                             │
└────────────────────────────────────────────────────────────────────┘
```

Regras:

- Cartão branco `rounded-2xl border border-slate-200/80 p-5 shadow-xs dark:border-slate-700/80 dark:bg-slate-800/90`.
- Ícone em tile `p-2.5 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400`.
- Título `text-base font-bold` ou `text-xl sm:text-2xl font-black`, conforme a hierarquia da tela.
- Descrição `text-xs text-slate-500 dark:text-slate-400`.
- Badge de contagem/status ao lado do título.
- Ação primária à direita: `rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700`.
- Ações secundárias em `border border-slate-200` ou `bg-slate-50`.
- **Não** repetir o logo Mega 12 em cada página: o logo já está no shell.
- **Não** usar gradiente escuro em todas as páginas. Reservar o gradiente para a Home ou para uma eventual “Visão geral” da rede.

---

## 4. Matriz comparativa dos 13 módulos

### 4.1 Resumo de status

| Status | Quantidade | Módulos |
|---|---:|---|
| Implementado | 1 | Comunicados |
| Parcial | 1 | Unidades |
| Placeholder | 11 | Pessoas e Docs, Compras, Checklists, Agenda, Universidade, Implantação, Analytics, Jornada, NES, NPS, Termos LGPD |

### 4.2 Matriz funcional e técnica

| Módulo | O que a referência entrega | Estado atual no Mega 12 | Lacuna principal | Dados/API necessários | Prioridade |
|---|---|---|---|---|---|
| **Unidades** | Cadastro e perfil da unidade, contatos, áreas, grupo/região, situação, vínculos e visão consolidada | Lista real de lojas com busca por nome/código, colunas de código, cluster e situação | Detalhe da unidade, edição, contatos, áreas, vínculos com pessoas e permissões por unidade | `stores` existente + `franchise_store_profiles`, `franchise_store_contacts`; `/api/franchise-units` | P1 |
| **Mega 12 · Pessoas e Docs** | Diretório de pessoas e repositório de documentos com categoria, versão, visibilidade e comprovantes | Placeholder com formulário que não persiste | CRUD de pessoas, upload/versionamento, controle de acesso, busca e histórico | `franchise_people`, `franchise_documents`, `franchise_document_versions`, `franchise_document_acl`; upload seguro | P1 |
| **Compras de Insumos** | Catálogo/mix por unidade, carrinho, etapas do pedido, aprovação, separação, entrega e repetição | Placeholder; formulário não persiste | Catálogo, carrinho, workflow, detalhe do pedido, status e histórico | `franchise_supply_items`, `franchise_supply_orders`, `franchise_supply_order_items`, `franchise_supply_order_events`; `/api/franchise-supplies` | P2 |
| **Comunicados** | Editor, público por regra, agendamento, leitura por pessoa/unidade, anexos e relatório | Publicar/arquivar, público toda a rede ou unidades, busca e histórico | Confirmação de leitura, agendamento, categorias, anexos, exportação e notificações | Tabelas atuais + `franchise_announcement_reads`, `_categories`, `_attachments`; `/api/franchise-announcements` | P1 |
| **Checklists** | Modelos com seções/perguntas/pesos/críticas, aplicação com foto/GPS/assinatura, score, plano de ação e versionamento | Placeholder | Módulo inteiro: modelos, aplicações, respostas, evidências, score e planos de ação | `franchise_checklist_templates`, `_sections`, `_questions`, `_options`, `_versions`, `_assessments`, `_answers`, `_attachments`, `_action_plans`; `/api/franchise-checklists` | P2 |
| **Agenda** | Calendário compartilhado (mês/semana/dia/lista), eventos por unidade/pessoa/categoria, visitas e lembretes | Placeholder com link para o calendário existente | Integrar/reaproveitar o calendário, tipos de evento, participantes, recorrência e lembretes | `franchise_agenda_events`, `_participants`, `_reminders`; `/api/franchise-agenda` | P1/P2 |
| **Universidade Corporativa** | Cursos, módulos/aulas, trilhas por cargo, provas, certificados e progresso por pessoa/curso/unidade | Placeholder | Cursos/trilhas, matrícula, progresso, provas e certificados | `franchise_courses`, `_lessons`, `_trails`, `_trail_courses`, `_enrollments`, `_lesson_progress`, `_exams`, `_certificates`; `/api/franchise-courses` | P3 |
| **Implantação de Unidades** | Modelos por tipo de unidade, cronograma/Gantt, tarefas com evidência, marcos, portfólio e equipe | Placeholder | Projetos, tarefas, dependências, marcos, evidências e dashboard | `franchise_implementation_projects`, `_tasks`, `_dependencies`, `_milestones`, `_evidence`, `_team`; `/api/franchise-implementations` | P2/P3 |
| **Analytics** | Indicadores de checklists/NPS/NES/compras, ranking, tendência, não conformidades e exportação | Placeholder | Camada de indicadores e gráficos; depende dos módulos de origem | Consultas agregadas; `franchise_saved_views` opcional; `/api/franchise-analytics` | P2 |
| **Jornada** | Registro de visitas/check-in/check-out/tempo em loja/atividades do supervisor | Placeholder | Escopo a confirmar; timeline, geolocalização, ajustes e cobertura | `franchise_journeys`, `_visits`, `_events`; `/api/franchise-journeys` | P3 |
| **NES** | Net Emotional Score: 5 sentimentos por área, por unidade, dashboard e histórico | Placeholder; o documento principal assume eNPS/clima | Registrar sentimento por área, dashboard, histórico e anexos | `franchise_nes_areas`, `franchise_nes_records`; `/api/franchise-nes` | P3 |
| **NPS** | Pesquisa com pergunta padrão, follow-up, público, prazo, cálculo por unidade e ranking | Placeholder | Pesquisas, respostas, cálculo e dashboard | `franchise_nps_surveys`, `_questions`, `_responses`; `/api/franchise-nps` | P3 |
| **Termos LGPD** | Termos com versões, publicação, bloqueio no login, assinatura eletrônica e relatório de adesão | Placeholder | CRUD/versões, aceite com evidências, relatório e bloqueio | `franchise_terms`, `_versions`, `_acceptances`; `/api/franchise-terms` | P3 |

> **Observação importante:** os 13 itens do submenu são um recorte definido pela operação do Mega 12. Eles não correspondem 1:1 ao menu da plataforma de referência. “Pessoas e Docs”, “Analytics”, “Jornada” e “NES” precisam de decisão de escopo antes da implementação.

---

## 5. Estrutura alvo por módulo

Os blocos abaixo descrevem a tela com os componentes do Mega 12. Nenhum nome, cor ou texto da referência é usado.

### 5.1 Unidades

**Objetivo:** ser a fonte de verdade das lojas da rede e o ponto de partida dos demais módulos.

**Tela principal**

- Cabeçalho padrão com ícone `Store`, título “Unidades”, descrição e botão “Nova unidade”.
- Quatro KPIs: unidades ativas, unidades inativas, grupos, pendências de cadastro.
- Barra de ferramentas: busca por nome/código, filtro de grupo, filtro de situação, botão “Exportar”.
- Tabela: Unidade, Código, Grupo, Região, Responsável, Situação, Última atualização, Ações.
- Paginação server-side e ordenação por coluna.

**Detalhe**

- Drawer ou rota `/franquias/unidades/:id` com abas:
  - **Cadastro:** nome, código, grupo, região, endereço, situação.
  - **Contatos:** responsáveis, telefone, e-mail.
  - **Pessoas:** vínculos com pessoas e cargos.
  - **Documentos:** atalho para Pessoas e Docs filtrado pela unidade.
  - **Histórico:** auditoria de alterações.

**Ações**

- Criar, editar, ativar/inativar, vincular responsável, abrir módulos relacionados.

**API**

- `GET /api/franchise-units?search=&status=&group=&page=&pageSize=`
- `GET /api/franchise-units/:id`
- `POST /api/franchise-units`
- `PATCH /api/franchise-units/:id`
- `POST /api/franchise-units/:id/status`
- `GET /api/franchise-units/:id/audit`

**Aceite**

- A lista reflete o banco real, sem dados fictícios.
- Busca com debounce de 300 ms e `AbortController`.
- Estados de carregamento, vazio e erro com ação “Tentar novamente”.
- Apenas perfis autorizados veem unidades do próprio escopo.

---

### 5.2 Mega 12 · Pessoas e Docs

**Objetivo:** centralizar pessoas da rede e documentos operacionais com controle de acesso.

**Tela principal**

- Abas: **Pessoas** e **Documentos**.
- Pessoas: tabela com Nome, Cargo, Unidade, E-mail, Situação, Ações.
- Documentos: tabela com Título, Categoria, Versão, Unidade, Visibilidade, Atualizado em, Ações.
- Busca, filtros por unidade/categoria/situação e botão “Novo”.

**Cadastro de pessoa**

- Nome, e-mail, telefone, cargo, unidade, situação, observações.
- Validação de e-mail e duplicidade.

**Documento**

- Título, categoria, unidade, visibilidade (rede/unidade/restrito), arquivo.
- Upload com allowlist (`pdf`, `png`, `jpg`, `jpeg`), limite de 10 MB e verificação de tipo real.
- Versionamento: cada novo upload cria uma versão; a anterior fica no histórico.
- Download auditado.

**API**

- `GET/POST/PATCH /api/franchise-people`
- `GET/POST/PATCH /api/franchise-documents`
- `POST /api/franchise-documents/:id/versions`
- `GET /api/franchise-documents/:id/download`
- `GET /api/franchise-documents/:id/audit`

**Aceite**

- Nenhum arquivo executável é aceito.
- Download só para quem tem permissão.
- Histórico de versões preservado.
- Nenhum dado sensível em log.

---

### 5.3 Compras de Insumos

**Objetivo:** permitir que a unidade solicite insumos do catálogo da matriz, com aprovação e acompanhamento.

**Tela principal**

- Abas: **Catálogo**, **Meus pedidos**, **Aprovações** (conforme perfil).
- Catálogo em cards: imagem, nome, descrição curta, unidade de medida, quantidade mínima, preço de referência e botão “Adicionar”.
- Carrinho lateral/drawer: itens, quantidades, unidade solicitante, justificativa, total e botão “Enviar solicitação”.
- Pedidos: tabela com número, unidade, itens, total, etapa, data e ações.
- Detalhe do pedido: itens, totais, linha do tempo de etapas e histórico.

**Fluxo**

```text
Solicitado → Em análise → Aprovado → Separado → Entregue
                         ↘ Cancelado
```

**API**

- `GET /api/franchise-supplies/catalog?storeId=&search=`
- `POST /api/franchise-supplies/orders`
- `GET /api/franchise-supplies/orders?status=&storeId=&page=`
- `GET /api/franchise-supplies/orders/:id`
- `POST /api/franchise-supplies/orders/:id/approve`
- `POST /api/franchise-supplies/orders/:id/separate`
- `POST /api/franchise-supplies/orders/:id/deliver`
- `POST /api/franchise-supplies/orders/:id/cancel`
- `POST /api/franchise-supplies/orders/:id/repeat`

**Aceite**

- Não é possível pedir item fora do mix da unidade.
- Quantidade mínima e estoque validados no backend.
- Aprovação registra autor, data e observação.
- Pedido cancelado não pode ser entregue.

---

### 5.4 Comunicados

**Objetivo:** comunicar a rede com rastreabilidade de leitura.

**Tela principal**

- Botão “Novo comunicado”.
- Filtros: publicados/arquivados, categoria, unidade, período.
- Busca por título, mensagem e autor.
- Lista em cartões: título, autor, data, público, progresso de leitura e ações “Ler”/“Arquivar”.

**Compositor**

- Título (máx. 160), mensagem (máx. 10.000), categoria, anexos.
- Público: toda a rede ou unidades selecionadas.
- Agendamento: data/hora de início e fim (opcional).
- Confirmação de leitura obrigatória (checkbox).
- Pré-visualização antes de publicar.

**Detalhe**

- Conteúdo completo, anexos, público e relatório de leitura.
- Relatório: pessoa, unidade, data/hora, confirmação.
- Exportação CSV.

**API**

- `GET/POST /api/franchise-announcements`
- `POST /api/franchise-announcements/:id/archive`
- `GET /api/franchise-announcements/:id/reads`
- `POST /api/franchise-announcements/:id/read`
- `GET /api/franchise-announcements/:id/export`

**Aceite**

- Leitura registrada uma única vez por usuário/unidade.
- Arquivar preserva o histórico.
- Comunicado agendado não aparece antes da hora.
- Nenhum comunicado é apagado fisicamente.

---

### 5.5 Checklists

**Objetivo:** padronizar inspeções, gerar score e abrir planos de ação.

**Tela principal**

- Abas: **Modelos**, **Aplicações**, **Planos de ação**.
- Modelos: lista com nome, categoria, versão vigente, quantidade de perguntas e situação.
- Aplicações: lista com unidade, modelo, supervisor, data, score e situação.
- Planos de ação: lista com origem, responsável, prazo, situação e atraso.

**Construtor de modelo**

- Seções e perguntas.
- Tipos de resposta: sim/não, conforme/não conforme, múltipla escolha, número, data, escala, estrelas, foto, documento, assinatura.
- Peso, questão crítica, obrigatoriedade, foto obrigatória, comentário e “não se aplica”.
- Regras condicionais (mostrar/ocultar pergunta).
- Versão e vigência: nova versão vale a partir da próxima aplicação.

**Aplicação**

- Selecionar unidade e modelo.
- Check-in com geolocalização (quando autorizado).
- Responder seções, anexar fotos e assinatura.
- Finalizar: calcula score, destaca críticas e permite abrir plano de ação.

**API**

- `GET/POST/PATCH /api/franchise-checklists/templates`
- `POST /api/franchise-checklists/templates/:id/versions`
- `GET/POST /api/franchise-checklists/assessments`
- `POST /api/franchise-checklists/assessments/:id/answers`
- `POST /api/franchise-checklists/assessments/:id/finish`
- `GET/POST/PATCH /api/franchise-checklists/action-plans`
- `POST /api/franchise-checklists/action-plans/:id/events`

**Aceite**

- Score reproduzível e auditável.
- Questão crítica reprovada zera ou bloqueia conforme regra definida.
- Evidência obrigatória impede conclusão sem foto/assinatura.
- Aplicação concluída não pode ser editada sem permissão e trilha de auditoria.

---

### 5.6 Agenda

**Objetivo:** coordenar visitas, reuniões e compromissos da rede.

**Tela principal**

- Visões: mês, semana, dia e lista.
- Filtros: unidade, pessoa, categoria e período.
- Legenda de cores por categoria.
- Botão “Novo compromisso”.

**Evento**

- Título, categoria, unidade, participantes, início/fim, dia inteiro, recorrência, lembrete e observações.
- Para visitas: planejado vs. realizado, vínculo com checklist e registro de jornada.

**Reaproveitamento**

- Avaliar o calendário existente (`/unidades/calendario`) antes de criar outro.
- Se o calendário atual não suportar participantes/unidade/recorrência, criar `franchise_agenda_events` e manter a integração por `storeId`.

**API**

- `GET/POST/PATCH /api/franchise-agenda/events`
- `POST /api/franchise-agenda/events/:id/cancel`
- `GET /api/franchise-agenda/events?from=&to=&storeId=&personId=`

**Aceite**

- Evento não aparece para quem não tem acesso à unidade.
- Conflito de horário é sinalizado, não bloqueado sem confirmação.
- Lembrete é registrado e não duplicado.

---

### 5.7 Universidade Corporativa

**Objetivo:** treinar a equipe da rede com trilhas, aulas, provas e certificados.

**Tela principal**

- Abas: **Catálogo**, **Minhas trilhas**, **Gestão** (admin).
- Cards de curso: capa, título, categoria, carga horária, progresso e status.
- Detalhe do curso: módulos, aulas, prova e certificado.
- Minhas trilhas: sequência de cursos, progresso e pendências.

**Gestão**

- Criar curso, módulos e aulas (vídeo/texto/PDF).
- Criar trilha por cargo/perfil.
- Matricular pessoas/unidades.
- Relatório: conclusão por pessoa, curso e unidade.
- Certificado com nome, curso, carga horária, data e código de validação.

**API**

- `GET/POST/PATCH /api/franchise-courses`
- `POST /api/franchise-courses/:id/lessons`
- `GET/POST /api/franchise-courses/trails`
- `POST /api/franchise-courses/:id/enroll`
- `POST /api/franchise-courses/lessons/:id/progress`
- `POST /api/franchise-courses/:id/exam/attempt`
- `GET /api/franchise-courses/certificates/:code`

**Aceite**

- Progresso só avança com conclusão registrada.
- Prova com nota mínima configurável.
- Certificado não pode ser emitido sem conclusão.
- Conteúdo protegido por permissão.

---

### 5.8 Implantação de Unidades

**Objetivo:** abrir novas unidades no prazo, com tarefas, evidências e marcos.

**Tela principal**

- Visões: **Portfólio** (cards), **Lista**, **Kanban**, **Gantt**, **Marcos**.
- Card do projeto: nome, unidade, progresso, situação, datas, tarefas e fases.
- Filtros: situação, responsável, unidade, período.

**Detalhe**

- Cabeçalho com progresso e datas.
- Tarefas agrupadas por fase, com responsável, prazo, dependência e evidência.
- Marcos e linha do tempo.
- Equipe e anexos.
- Feed de alterações.

**API**

- `GET/POST/PATCH /api/franchise-implementations`
- `POST /api/franchise-implementations/:id/tasks`
- `PATCH /api/franchise-implementations/:id/tasks/:taskId`
- `POST /api/franchise-implementations/:id/tasks/:taskId/evidence`
- `POST /api/franchise-implementations/:id/milestones`
- `GET /api/franchise-implementations/:id/timeline`

**Aceite**

- Tarefa concluída exige evidência quando configurada.
- Dependência não permite concluir antes da predecessora.
- Atraso é calculado por data prevista vs. conclusão.
- Portfólio reflete o estado real.

---

### 5.9 Analytics

**Objetivo:** transformar dados dos módulos em indicadores para a diretoria.

**Tela principal**

- KPIs: score médio, aplicações, não conformidades abertas, planos atrasados.
- Filtros: período, unidade, modelo, módulo.
- Gráficos: evolução, ranking de unidades, distribuição de respostas, status de planos.
- Tabela: unidade, aplicações, score, pendências, tendência.
- Exportação CSV/PDF.

**Regra de dados**

- Não exibir números fictícios.
- Sem dados, mostrar estado vazio explicativo com link para o módulo de origem.
- Indicadores só aparecem após lançamentos reais.

**API**

- `GET /api/franchise-analytics/summary?from=&to=&storeId=`
- `GET /api/franchise-analytics/checklists`
- `GET /api/franchise-analytics/nps`
- `GET /api/franchise-analytics/nes`
- `GET /api/franchise-analytics/supplies`

**Aceite**

- Cada número tem origem rastreável.
- Filtros afetam todos os cartões e gráficos.
- Exportação reflete o filtro aplicado.

---

### 5.10 Jornada

**Objetivo (a confirmar):** registrar visitas e tempo de serviço dos supervisores.

**Tela principal proposta**

- Lista/linha do tempo por supervisor e por unidade.
- Filtros: período, supervisor, unidade.
- Registro: check-in, check-out, duração, atividades, observações e localização (quando autorizada).
- Indicadores: visitas por dia, cobertura de unidades, tempo médio em loja, pontualidade.

**API proposta**

- `GET/POST /api/franchise-journeys`
- `POST /api/franchise-journeys/:id/checkin`
- `POST /api/franchise-journeys/:id/checkout`
- `GET /api/franchise-journeys/summary`

**Aceite**

- Geolocalização só durante a jornada, nunca rastreamento contínuo.
- Ajuste manual exige justificativa e aprovação.
- Consentimento LGPD registrado.
- Não usar como controle de ponto oficial sem validação jurídica.

---

### 5.11 NES

**Objetivo:** medir a satisfação emocional da unidade por área, com escala de 5 sentimentos.

> **Decisão pendente:** o documento principal trata NES como pesquisa interna de clima/eNPS. A referência pública descreve **Net Emotional Score**: 5 sentimentos (nervoso, triste, normal, feliz, encantado) por área e por unidade, com dashboard. A implementação deve seguir a definição validada com a operação do Mega 12.

**Tela principal**

- Score geral e distribuição dos 5 sentimentos.
- Tabela por unidade: status, score, interações, sentimento por área.
- Gráfico de evolução mensal por área.
- Filtros: unidade, grupo, área, período.
- Registro: unidade, área, sentimento, observação e anexos.

**API**

- `GET/POST /api/franchise-nes/records`
- `GET /api/franchise-nes/summary?from=&to=&storeId=`
- `GET/PUT /api/franchise-nes/areas`

**Aceite**

- Escala de 5 sentimentos consistente.
- Média por área e por unidade reproduzível.
- Histórico preservado.
- Acesso por perfil e por unidade.

---

### 5.12 NPS

**Objetivo:** medir a satisfação e a recomendação por unidade.

**Tela principal**

- Lista de pesquisas: título, público, período, respostas, situação.
- Criar pesquisa: pergunta de recomendação (0–10), pergunta aberta de motivo, público, prazo e anonimato.
- Dashboard: NPS, promotores, neutros, detratores, evolução, top 10 melhores/piores unidades.
- Relatório por unidade e período.

**Cálculo**

```text
NPS = % promotores (9–10) − % detratores (0–6)
```

**API**

- `GET/POST/PATCH /api/franchise-nps/surveys`
- `POST /api/franchise-nps/surveys/:id/responses`
- `GET /api/franchise-nps/surveys/:id/results`
- `GET /api/franchise-nps/summary?from=&to=&storeId=`

**Aceite**

- Uma resposta por pessoa/pesquisa, salvo pesquisa anônima.
- Cálculo do NPS conferido por teste automatizado.
- Respostas abertas visíveis apenas para perfis autorizados.
- Sem dados fictícios.

---

### 5.13 Termos LGPD

**Objetivo:** publicar termos, colher aceite com evidências e comprovar aderência.

**Tela principal**

- Lista de termos: nome, categoria, última versão, publicado por, publicado em, situação.
- Criar/editar termo com editor de texto.
- Versões: histórico, vigência e publicação.
- Relatório de aceite: pessoa, unidade, versão, data/hora, IP, user agent e hash.

**Fluxo**

```text
Rascunho → Publicado → Aceite registrado → Relatório
```

**API**

- `GET/POST/PATCH /api/franchise-terms`
- `POST /api/franchise-terms/:id/versions`
- `POST /api/franchise-terms/:id/publish`
- `POST /api/franchise-terms/:id/accept`
- `GET /api/franchise-terms/:id/acceptances`
- `GET /api/franchise-terms/pending`

**Aceite**

- Aceite vinculado à versão exata.
- Evidências imutáveis (hash, data, IP, user agent).
- Termo obrigatório bloqueia o acesso até o aceite.
- Revisão jurídica antes da publicação.
- Retenção e exclusão conforme LGPD.

---

## 6. Design system Mega 12

### 6.1 Tokens

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#10B981` | Ações primárias, foco, destaques. |
| `--primary-hover` | `#059669` | Hover de botões. |
| `--primary-light` | `#ECFDF5` | Fundos suaves. |
| `--bg-main` | `#F8FAFC` | Fundo da aplicação. |
| `--card-bg` | `#FFFFFF` | Cartões. |
| `--card-border` | `#E2E8F0` | Bordas. |
| `--text-primary` | `#0F172A` | Texto principal. |
| `--text-secondary` | `#64748B` | Texto auxiliar. |

Dark mode: `#0B0F17` (fundo), `#131B2A` (cartão), `#1E293B` (borda), `#F8FAFC`/`#94A3B8` (textos).

### 6.2 Componentes

| Componente | Padrão Mega 12 |
|---|---|
| Cabeçalho de módulo | Cartão branco, ícone em tile, título, descrição, badge, ação primária. |
| KPI | Cartão `rounded-2xl`, rótulo `text-xs`, valor `text-2xl font-black`, variação com seta. |
| Tabela | `overflow-x-auto`, `th scope="col"`, cabeçalho `bg-slate-50`, linhas `divide-y`, hover suave. |
| Badge | `rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase`, cor + texto. |
| Botão primário | `rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700`. |
| Botão secundário | `rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700`. |
| Input | `rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20`. |
| Drawer/modal | Fundo `bg-slate-950/50`, cartão `rounded-2xl`, foco preso, `Esc` fecha. |
| Estado vazio | Ícone, título curto, explicação e ação primária. |
| Skeleton | `animate-pulse` com blocos `bg-slate-200 dark:bg-slate-800`. |
| Toast | Canto inferior direito, ícone, mensagem curta, fecha sozinho. |

### 6.3 Layout

- Container `mx-auto w-full max-w-7xl`.
- Espaçamento `space-y-5` ou `space-y-6`, padding `p-4 sm:p-6`.
- Grade responsiva: 1 coluna no mobile, 2–4 no desktop.
- Tabelas largas com `overflow-x-auto`; no mobile, preferir cards quando a tabela tiver mais de 5 colunas.
- Sidebar e Header existentes; não criar shell paralelo.

### 6.4 Acessibilidade e ergonomia

- Todo input com `<label>` associado.
- Botões só de ícone com `aria-label`.
- Foco visível e ordem de tabulação lógica.
- `Esc` fecha modais; `Enter` submete.
- Foco automático no primeiro campo do modal.
- Erros inline com `role="alert"`.
- Contraste mínimo 4.5:1.
- Não usar cor como único indicador de status.
- `aria-live` para atualizações assíncronas.
- Respeitar `prefers-reduced-motion`.

### 6.5 Microcopy

- Direta, em português, sem jargão interno.
- Exemplos:
  - “Nenhuma unidade cadastrada. Cadastre a primeira unidade para começar.”
  - “Não foi possível carregar os comunicados. Tentar novamente.”
  - “Comunicado publicado. O histórico foi preservado.”
- Nunca usar “em implantação”, “prévia”, “dados fictícios” ou “será habilitado quando…” em produção.

---

## 7. Permissões e navegação

### 7.1 Situação atual

`canAccessTab` libera todos os módulos de franquias apenas para `root`/`usr_root`. Isso impede o uso por diretoria, supervisores e unidades.

### 7.2 Proposta

Adicionar ao catálogo de permissões:

| Permissão | Descrição | Root | Diretoria | Supervisor | Unidade |
|---|---|:---:|:---:|:---:|:---:|
| `nav:franchise_units` | Acessar Unidades | ✔ | ✔ | ✔ | ✔ (própria) |
| `franchise:units:manage` | Criar/editar unidades | ✔ | ✔ | — | — |
| `nav:franchise_documents` | Acessar Pessoas e Docs | ✔ | ✔ | ✔ | ✔ (própria) |
| `franchise:documents:manage` | Gerenciar documentos | ✔ | ✔ | — | — |
| `nav:franchise_purchases` | Acessar Compras | ✔ | ✔ | — | ✔ |
| `franchise:purchases:approve` | Aprovar pedidos | ✔ | ✔ | — | — |
| `nav:franchise_announcements` | Acessar Comunicados | ✔ | ✔ | ✔ | ✔ |
| `franchise:announcements:manage` | Publicar/arquivar | ✔ | ✔ | — | — |
| `nav:franchise_checklists` | Acessar Checklists | ✔ | ✔ | ✔ | ✔ (aplicar) |
| `franchise:checklists:manage` | Criar modelos/planos | ✔ | ✔ | — | — |
| `nav:franchise_agenda` | Acessar Agenda | ✔ | ✔ | ✔ | ✔ |
| `nav:franchise_university` | Acessar Universidade | ✔ | ✔ | ✔ | ✔ |
| `franchise:university:manage` | Gerenciar cursos | ✔ | ✔ | — | — |
| `nav:franchise_implementation` | Acessar Implantação | ✔ | ✔ | — | — |
| `franchise:implementation:manage` | Gerenciar projetos | ✔ | ✔ | — | — |
| `nav:franchise_analytics` | Acessar Analytics | ✔ | ✔ | ✔ | — |
| `nav:franchise_journey` | Acessar Jornada | ✔ | ✔ | ✔ | — |
| `nav:franchise_nes` | Acessar NES | ✔ | ✔ | ✔ | ✔ (responder) |
| `nav:franchise_nps` | Acessar NPS | ✔ | ✔ | ✔ | ✔ (responder) |
| `nav:franchise_lgpd` | Acessar Termos LGPD | ✔ | ✔ | ✔ | ✔ (aceitar) |
| `franchise:lgpd:manage` | Gerenciar termos | ✔ | ✔ | — | — |

### 7.3 Escopo por unidade

- Criar vínculo `userId` ↔ `storeId` (ou usar o vínculo já existente no cadastro de usuários).
- Filtrar listas e detalhes por esse vínculo no backend, nunca apenas no frontend.
- Registrar tentativas de acesso indevido na auditoria.

### 7.4 Navegação

- Manter os 13 itens e a ordem do print.
- Rotas atuais estão corretas: `/franquias/<slug>`.
- Detalhes: `/franquias/<slug>/:id`.
- Breadcrumb apenas em telas de detalhe.
- Deep links compartilháveis.

---

## 8. Roadmap e prioridades

### Fase 0 — Fundação (1 sprint)

- `FranchisePageHeader`, `KpiCard`, `StatusBadge`, `EmptyState`, `ErrorState`, `SkeletonTable`, `ConfirmDialog`, `DataTable`, `ChartCard`.
- Substituir o acesso root-only por permissões reais.
- Padronizar respostas de API, paginação, validação e auditoria.
- Definir armazenamento de arquivos e limites.
- Remover textos de planejamento das telas.

### Fase 1 — Núcleo operacional (2 sprints)

- Unidades: detalhe, edição, contatos, vínculos.
- Pessoas e Docs: CRUD, upload, versões, ACL.
- Comunicados: leitura, agendamento, categorias, anexos, exportação.
- Agenda: integrar/reaproveitar o calendário existente.

### Fase 2 — Operação e análise (3 sprints)

- Checklists: modelos, aplicações, evidências, score, planos de ação.
- Analytics: indicadores de checklists.
- Compras de Insumos: catálogo, carrinho, workflow.

### Fase 3 — Expansão (2–3 sprints)

- Implantação de Unidades: portfólio, tarefas, marcos, evidências.
- Universidade Corporativa: cursos, trilhas, provas, certificados.
- Jornada: após definição de escopo.

### Fase 4 — Voz da rede e conformidade (2–3 sprints)

- NES: escala de sentimentos por área.
- NPS: pesquisas e dashboard.
- Termos LGPD: versões, aceite, relatório.

> A ordem pode mudar conforme prioridade de negócio. O importante é não iniciar um módulo dependente (Analytics, NPS, NES) antes da fonte de dados estar estável.

---

## 9. Critérios de aceite visual e funcional

### 9.1 Visual

- [ ] Cabeçalho segue o padrão das telas principais do Mega 12.
- [ ] Nenhuma ocorrência da marca de referência na UI ou nos assets.
- [ ] Nenhum texto de planejamento interno visível.
- [ ] Cores, fontes e componentes exclusivos do Mega 12.
- [ ] Dark mode funcional em todas as telas.
- [ ] Layout responsivo de 360 px a 1440 px.
- [ ] Foco visível, navegação por teclado e `Esc` em modais.
- [ ] Estados de carregamento, vazio e erro em todas as listas.
- [ ] Nenhum layout shift perceptível ao carregar.

### 9.2 Funcional

- [ ] Todo formulário persiste no backend.
- [ ] Toda ação destrutiva pede confirmação.
- [ ] Toda lista tem busca, filtro e paginação.
- [ ] Todo detalhe tem histórico/auditoria.
- [ ] Permissões validadas no backend.
- [ ] Nenhum dado fictício em produção.
- [ ] Erros retornam mensagem amigável e log interno seguro.
- [ ] Datas e valores no formato brasileiro.
- [ ] Exportações refletem o filtro aplicado.

### 9.3 Segurança

- [ ] Validação de entrada no frontend e no backend.
- [ ] Prepared statements em todas as queries.
- [ ] Upload com allowlist, limite e verificação de tipo real.
- [ ] Nenhum segredo, token ou PII em log.
- [ ] Auditoria de ações críticas.
- [ ] LGPD: base legal, retenção, exclusão e consentimento.

---

## 10. Decisões pendentes

| # | Decisão | Impacto | Recomendação |
|---:|---|---|---|
| 1 | **NES**: eNPS/clima interno ou Net Emotional Score (5 sentimentos por área)? | Define modelo de dados, tela e cálculo. | Validar com a operação. A referência pública aponta para Net Emotional Score; o documento principal assume eNPS. |
| 2 | **Jornada**: visitas de supervisores ou onboarding de franqueados? | Define entidades, telas e integrações. | Confirmar com o Bryan/operação antes de iniciar. |
| 3 | **Analytics**: só checklists ou visão cross-module (NPS, NES, compras)? | Define escopo da Fase 2. | Começar por checklists e evoluir. |
| 4 | **Compras**: insumos internos ou compras completas com cotação/aprovação? | Define fluxo e integração com o módulo de compras existente. | Começar por insumos internos, sem duplicar o fluxo de compras atual. |
| 5 | **LGPD**: tipo de assinatura e retenção? | Define evidências e obrigações legais. | Revisão jurídica antes da publicação. |
| 6 | **Arquivos**: disco local ou object storage? | Define upload, backup e escala. | Object storage com URL assinada; limite e allowlist. |
| 7 | **Notificações**: in-app, e-mail ou push? | Define infraestrutura e custo. | In-app primeiro; e-mail/push depois. |
| 8 | **Permissões**: quem vê qual unidade? | Define o modelo de acesso. | Vínculo usuário↔unidade no backend. |
| 9 | **Cabeçalho**: manter gradiente ou padronizar cartão branco? | Define identidade visual das 13 páginas. | Padronizar cartão branco; gradiente só na Home. |

---

## 11. Anexo de rastreabilidade (interno)

> **Este anexo é apenas para pesquisa interna.** Nada aqui deve ser copiado para telas, textos, assets, help center ou materiais do Mega 12. As URLs e nomes de arquivos contêm a marca da fonte apenas para fins de auditoria.

### 11.1 Evidências locais

- `REA/analysis/sults_docs/product_pages.json` — títulos, headings e imagens das páginas públicas.
- `REA/analysis/sults_docs/product_content.txt` — conteúdo textual das páginas de produto.
- `REA/analysis/sults_docs/schemas_digest.md` — endpoints e schemas das APIs públicas.
- `REA/analysis/sults_docs/mockups/` — mockups públicos usados na comparação visual.
- `REA/analysis/youtube/videos.tsv` — catálogo do canal (conteúdo institucional/cases).

### 11.2 Fontes públicas consultadas

- Páginas de produto: Checklist, Universidade Corporativa, Implantação de Unidades, Agenda, NPS, Comunicados, Compras, LGPD e NES.
- Documentação de desenvolvedores: API v1 e v2 (Unidades, Checklist, Compras, Comunicados, Chamados, Implantação, Projetos, Expansão).
- Canal de vídeos: catálogo de 47 vídeos, majoritariamente cases e institucional; sem tutoriais por módulo.
- Central de ajuda: autenticada; não acessada.

### 11.3 O que não foi usado

- Nenhum código, HTML, CSS, JavaScript, imagem, fonte ou texto proprietário foi copiado.
- Nenhuma credencial foi solicitada ou utilizada.
- Nenhuma tela autenticada foi acessada.

---

## 12. Próximo passo recomendado

1. Validar as decisões pendentes (especialmente NES e Jornada).
2. Aprovar o padrão de cabeçalho e a remoção dos textos de planejamento.
3. Implementar a Fase 0 (componentes compartilhados + permissões + API).
4. Começar por **Unidades** e **Pessoas e Docs**, que são a base dos demais módulos.
5. Em paralelo, finalizar **Comunicados** com confirmação de leitura e agendamento.
6. Só depois iniciar **Checklists**, que alimenta **Analytics** e **Planos de Ação**.
