# Plano de implementação — Paridade Web e Android

O trabalho deve ser executado em camadas. Primeiro garantimos que o Android compila e que as operações são persistidas com segurança. Depois alinhamos funcionalidades e, por último, aplicamos a evolução visual.

A ordem é importante: uma reforma visual antes da correção do fluxo poderia deixar o aplicativo mais bonito, mas ainda operacionalmente inseguro.

---

## Fase 0 — Preparação e proteção dos dados

### Objetivo

Criar uma base segura para executar mudanças sem colocar pedidos reais em risco.

### O que mudar

1. Criar uma branch específica de desenvolvimento, por exemplo `codex/android-web-parity`.
2. Gerar uma cópia de segurança do banco atual.
3. Separar configuração de desenvolvimento e produção.
4. Criar usuários de teste para Separação, Depósito, Comprador, Diretoria e Faturamento.
5. Criar pedidos de teste cobrindo:
   - Pedido aguardando recebimento.
   - Pedido recebido e aguardando distribuição.
   - Pedido em separação.
   - Pedido com avarias.
   - Pedido parcialmente conferido.
   - Pedido 100% conferido.
   - Transferência interna do CD.

### Motivo

As próximas etapas alteram persistência, estados da esteira e concorrência. É necessário validar tudo sem depender de pedidos reais.

### Critérios de conclusão

- Backup confirmado.
- Base de testes disponível.
- Nenhuma credencial real versionada.
- Ambiente de desenvolvimento claramente separado da produção.

---

## Etapa 1 — Restaurar a compilação e estabelecer qualidade mínima

### 1.1 Corrigir o build Android

#### O que mudar

Adicionar a cor `Amber300` ao tema ou substituir seu uso por um token visual existente.

Arquivos principais:

- `android_app/app/src/main/java/br/com/mega12/app/ui/theme/Color.kt`
- `android_app/app/src/main/java/br/com/mega12/app/ui/screens/orders/OrderHistoryScreen.kt`

Depois, executar:

```powershell
.\gradlew.bat clean assembleDebug
```

#### Motivo

Atualmente o APK não compila. Nenhuma evolução Android pode ser considerada concluída enquanto o projeto não produzir um artefato instalável.

#### Critérios de conclusão

- `assembleDebug` concluído sem erros.
- APK gerado.
- Aplicativo inicializa em emulador e dispositivo físico.

### 1.2 Criar uma rotina de validação

#### O que mudar

Adicionar comandos padronizados para validar:

- Build Web.
- Lint Web.
- Build Android.
- Testes Android.
- Testes do backend.
- Verificação de dependências.

Idealmente, criar um script na raiz para executar as validações de forma consistente.

#### Motivo

As mudanças atravessarão três plataformas. Sem uma rotina comum, uma correção no Android poderá quebrar o backend ou o Web sem ser percebida.

#### Critérios de conclusão

Uma única rotina deve informar claramente o que passou, o que falhou e em qual módulo ocorreu a falha.

### 1.3 Tratar os erros críticos de lint do Web

#### O que mudar

Corrigir primeiro as violações das regras de Hooks, principalmente nos modais que chamam `useState`, `useEffect` ou `useMemo` condicionalmente.

Não é necessário eliminar todos os avisos nesta fase, mas todos os erros devem ser resolvidos.

#### Motivo

Hooks condicionais podem produzir estados trocados, telas inconsistentes e falhas difíceis de reproduzir.

#### Critérios de conclusão

- `npm run build` passa.
- `npm run lint` não retorna erros.
- Avisos restantes são documentados para tratamento posterior.

---

## Etapa 2 — Definir o contrato oficial da separação

### 2.1 Criar um modelo canônico

#### O que mudar

Definir formalmente as estruturas compartilhadas entre Web, backend e Android.

#### Pedido

- Identificador e versão.
- Status da esteira.
- Recebimento na Matriz.
- Distribuição concluída.
- Separação concluída.
- Responsáveis e datas.

#### Item

- Quantidade comprada.
- Quantidade recebida.
- Quantidade em ruptura.
- Reserva no CD.
- Distribuição por loja.
- Embalagem e conversões.

#### Conferência

- Loja.
- Item.
- Estado conferido.
- Responsável.
- Data e hora.
- Versão da alteração.

#### Avaria

- Produto.
- Loja afetada.
- Quantidade.
- Unidade — UN, CX, PCT, JG ou PAR.
- Quantidade equivalente em unidades.
- Motivo.
- Observação.
- Custo e prejuízo.
- Responsável.
- Data.

#### Motivo

Hoje o Web e o Android possuem modelos diferentes. O Android desconhece campos importantes e pode reenviar uma representação incompleta do pedido.

#### Recomendação técnica

O backend deve ser a fonte oficial do contrato. Se possível, publicar um schema OpenAPI e gerar ou validar DTOs a partir dele.

#### Critérios de conclusão

- Campos e formatos documentados.
- Nomes iguais ou explicitamente mapeados nas três plataformas.
- Datas em ISO 8601.
- Quantidades e dinheiro com regras de arredondamento definidas.
- Nenhum cliente precisa adivinhar valores ausentes.

### 2.2 Atualizar os modelos Android

#### O que mudar

Adicionar ao Android os campos usados no fluxo atual:

- `storeConfigs`
- `fiscalConfig`
- `qtdReservaEstoque`
- `qtdRecebida`
- `ruptura`
- `motivoRuptura`
- `separacaoConcluida`
- `separadoPor`
- `dataSeparacao`
- `observacoesDoca`
- `totalPrejuizoAvarias`
- Dados completos de recebimento.
- Versão do pedido.

Separar modelos de rede dos modelos de domínio:

```text
data/api/dto
    PurchaseOrderDto
    SeparationCheckDto
    DamageDto

domain/model
    PurchaseOrder
    SeparationCheck
    Damage
```

Criar mapeadores entre DTO e domínio.

#### Motivo

Os modelos atuais são utilizados simultaneamente como resposta da API, regra de negócio e estado da interface. Essa mistura aumenta o risco de perda de campos e dificulta testes.

#### Critérios de conclusão

- Android lê pedidos criados pelo Web sem perder informações.
- Android não envia campos desconhecidos como valores vazios.
- Testes de serialização cobrem pedidos antigos e novos.

---

## Etapa 3 — Criar uma API segura e atômica para a separação

### 3.1 Parar de salvar o pedido inteiro a cada check

#### O que mudar

Substituir o uso de `POST /orders` nas ações da doca por endpoints pequenos e específicos.

Sugestão:

```http
GET    /orders/:id/separation
PATCH  /orders/:id/separation/checks/:storeId/:itemId
POST   /orders/:id/separation/damages
PATCH  /orders/:id/separation/damages/:damageId
DELETE /orders/:id/separation/damages/:damageId
POST   /orders/:id/send-to-faturamento
```

Exemplo de conferência:

```json
{
  "conferido": true,
  "expectedVersion": 18
}
```

#### Motivo

Uma ação simples não deve substituir todo o pedido. Endpoints atômicos evitam perda de dados, reduzem o tráfego, facilitam concorrência, melhoram auditoria e permitem autorizações específicas.

#### Critérios de conclusão

- Marcar um item altera somente aquele item.
- Uma falha não modifica a interface como se tivesse sido salva.
- Web e Android usam a mesma API operacional.

### 3.2 Implementar RBAC real nas rotas

#### O que mudar

Aplicar autorização explícita:

| Operação | Perfis permitidos |
|---|---|
| Consultar separação | Separação, depósito, diretoria |
| Conferir/desconferir item | Separação, depósito |
| Registrar avaria | Separação, depósito |
| Excluir avaria | Autor do registro ou diretoria |
| Liberar para faturamento | Separação, depósito, diretoria |
| Retroceder etapa | Perfis administrativos autorizados |

A checagem deve existir no backend. Restrições visuais no aplicativo não são controles de segurança.

#### Motivo

Algumas rotas atuais verificam apenas se existe usuário autenticado. Um usuário autenticado fora do setor não deve conseguir avançar a esteira.

#### Critérios de conclusão

- Testes retornam `403` para perfis sem permissão.
- Tentativas negadas entram na auditoria sem registrar dados sensíveis.
- Web e Android escondem ações não permitidas, mas o backend continua sendo a autoridade.

### 3.3 Implementar controle de concorrência

#### O que mudar

Adicionar `version` ao pedido ou ao estado da separação.

Cada alteração envia a versão conhecida. Se o servidor já estiver em uma versão posterior, retorna `409 Conflict`. A resposta deve trazer o estado atualizado para a interface se reconciliar.

#### Regras

- Quem conferiu pode desfazer a própria conferência.
- Outro operador visualiza o item como bloqueado.
- Diretoria pode corrigir com justificativa e auditoria.
- O servidor decide quem é o autor; o cliente não deve enviar um nome livre como autoridade.

#### Motivo

Dois operadores podem trabalhar no mesmo pedido. Sem controle de versão, o último salvamento pode apagar o trabalho do primeiro.

#### Critérios de conclusão

- Dois dispositivos não sobrescrevem silenciosamente o mesmo item.
- Conflitos geram feedback claro.
- A interface atualiza o responsável real pela conferência.

### 3.4 Fortalecer a finalização

#### O que mudar

O endpoint `send-to-faturamento` deve validar no backend:

1. Pedido está em `Em Separação`.
2. Recebimento na Matriz foi confirmado, exceto transferência interna.
3. Existem lojas e itens válidos.
4. Todos os itens efetivos foram conferidos.
5. Não existem quantidades negativas.
6. Compra = lojas + reserva + ajustes documentados.
7. Avarias possuem motivo e quantidade válida.
8. O pedido ainda não foi finalizado.
9. A versão enviada é atual.

O backend deve preencher:

- `status = Faturamento`
- `separacaoConcluida = true`
- `separadoPor`
- `dataSeparacao`
- Log de auditoria.

#### Motivo

A validação existente no cliente pode ser manipulada ou estar desatualizada. Uma mudança de etapa precisa ser transacional e validada no servidor.

#### Critérios de conclusão

- Pedido incompleto nunca avança.
- Duplo clique não finaliza duas vezes.
- A resposta retorna o pedido final persistido.
- Auditoria identifica quem concluiu e quando.

---

## Etapa 4 — Corrigir o estado e a persistência no Android

### 4.1 Criar um estado de tela dedicado

#### O que mudar

Substituir variáveis dispersas por um `SeparationUiState`:

```kotlin
data class SeparationUiState(
    val loading: Boolean,
    val refreshing: Boolean,
    val order: PurchaseOrder?,
    val selectedStoreId: String?,
    val pendingItemIds: Set<String>,
    val error: UiError?,
    val syncStatus: SyncStatus
)
```

Separar ações:

```kotlin
sealed interface SeparationAction {
    data class SelectStore(...)
    data class ToggleItem(...)
    data class RegisterDamage(...)
    data class DeleteDamage(...)
    data object FinalizeOrder
    data object Retry
}
```

#### Motivo

A tela atual concentra UI, cálculos e persistência em um único arquivo extenso. Um estado explícito torna o comportamento previsível e testável.

#### Critérios de conclusão

- Rotação da tela não perde pedido ou loja selecionada.
- Loading de um item não bloqueia todos os demais.
- Erros aparecem associados à ação que falhou.

### 4.2 Tornar a atualização otimista segura

#### O que mudar

Ao conferir um produto:

1. Marcar o item como “salvando”.
2. Atualizar visualmente.
3. Enviar a operação atômica.
4. Substituir pelo estado confirmado pelo servidor.
5. Em falha, desfazer a atualização e mostrar ação “Tentar novamente”.

#### Motivo

A resposta imediata é boa para fluidez, mas só é segura quando existe rollback.

#### Critérios de conclusão

- Nenhum item permanece visualmente conferido após falha.
- Botão não aceita múltiplos toques enquanto está salvando.
- Operador vê claramente “salvando”, “salvo” ou “erro”.

### 4.3 Usar as lojas reais do pedido

#### O que mudar

Remover `SeparationEngine.DEFAULT_STORES` da tela operacional.

A ordem de resolução deve ser:

1. `order.storeConfigs`.
2. Configuração recuperada do backend.
3. Estado de erro caso nenhuma configuração válida exista.

#### Motivo

Fallback silencioso com lojas fixas pode direcionar mercadoria para a filial errada.

#### Critérios de conclusão

- Loja desativada não aparece.
- Alteração feita no Web aparece no Android.
- Pedido sem configuração válida não permite separação e explica o problema.

### 4.4 Implementar atualização do pedido

#### O que mudar

Atualizar automaticamente por:

- Pull-to-refresh.
- Retorno à tela.
- Intervalo controlado enquanto a tela estiver aberta.
- Futuramente, WebSocket ou Server-Sent Events.

#### Motivo

O operador precisa enxergar rapidamente o trabalho realizado em outros dispositivos.

#### Critérios de conclusão

- Mudança feita em outro aparelho aparece sem relogar.
- Atualização não apaga seleção atual.
- Consumo de bateria e rede permanece controlado.

---

## Etapa 5 — Paridade funcional da separação

### 5.1 Bloqueio por recebimento

#### O que mudar

Apresentar uma tela de estado quando o pedido não tiver `recebidoMatriz`.

Deve mostrar:

- Pedido.
- Fornecedor.
- Previsão.
- Mensagem clara.
- Outros pedidos disponíveis para separação.

#### Motivo

Evita separar mercadoria que ainda não foi recebida fisicamente.

#### Critérios de conclusão

- Pedido não recebido não exibe check-list operacional.
- Transferências do CD seguem a exceção documentada.

### 5.2 Conferência por item e loja

#### O que mudar

Exibir para cada produto:

- Foto.
- Código interno.
- Descrição.
- Embalagem.
- Quantidade original.
- Avarias deduzidas.
- Quantidade efetiva.
- Responsável pela conferência.
- Estado de sincronização.

#### Regras

- Item com quantidade efetiva zero não deve bloquear conclusão.
- Item conferido por outro usuário deve ficar bloqueado.
- Operador pode filtrar somente pendentes.
- Área inteira do cartão deve ser acionável.

#### Motivo

Essa é a ação mais repetida do usuário. Deve exigir o mínimo de precisão manual e de toques.

#### Critérios de conclusão

- Quantidades iguais às do Web.
- Responsável e horário persistidos.
- Filtro e busca não alteram os dados.

### 5.3 Avarias completas

#### O que mudar

Implementar:

- Escolha do produto.
- Loja afetada.
- Quantidade.
- Unidade.
- Motivo padronizado.
- Observação opcional.
- Conversão em unidades.
- Prejuízo calculado.
- Lista de registros.
- Edição/exclusão conforme permissão.

#### Validações

- Quantidade maior que zero.
- Unidade compatível com embalagem.
- Dedução não pode exceder a quantidade destinada à loja.
- Motivo obrigatório.
- Confirmação antes de excluir.

#### Motivo

Hoje o Android registra apenas parte das informações disponíveis no Web e não oferece uma correção segura.

#### Critérios de conclusão

- Totais do Android e Web são idênticos.
- Uma caixa é convertida corretamente para unidades.
- Inclusão e exclusão recalculam o total efetivo imediatamente.

### 5.4 Finalização da separação

#### O que mudar

Adicionar uma barra inferior persistente:

- Enquanto pendente: progresso e “Ir para próxima pendência”.
- Quando completa: “Liberar para faturamento”.
- Durante envio: botão bloqueado e feedback de processamento.
- Em sucesso: confirmação e remoção da fila de pendentes.

Antes da confirmação, mostrar:

- Pedido.
- Responsável.
- Total conferido.
- Lojas concluídas.
- Total de avarias.
- Destino: faturamento.

#### Motivo

O usuário precisa entender claramente quando terminou e qual será a consequência da ação.

#### Critérios de conclusão

- Não finaliza abaixo de 100%.
- Não finaliza duas vezes.
- Só sai da tela depois de confirmação do servidor.
- O pedido aparece no Web como `Faturamento`.

---

## Etapa 6 — Refatoração visual do Android

### 6.1 Criar tokens compartilhados de design

#### O que mudar

Definir tokens Compose para:

- Cores da marca.
- Cores semânticas.
- Espaçamento.
- Raios.
- Elevação.
- Tipografia.
- Tamanhos mínimos de toque.

Paleta sugerida:

- Slate: base e superfícies.
- Emerald: ações e sucesso.
- Purple: identidade do módulo de separação.
- Amber: atenção e bloqueio.
- Rose: avaria e erro.
- Blue: informação, não conclusão principal.

#### Motivo

Hoje diversas cores estão codificadas diretamente nas telas. Isso gera inconsistência e dificulta temas claro/escuro.

#### Critérios de conclusão

- Nenhuma tela principal depende de cores hexadecimais isoladas.
- Modo claro e escuro possuem contraste adequado.
- Estados iguais usam as mesmas cores em todas as telas.

### 6.2 Refatorar a tela em componentes

#### Estrutura sugerida

```text
ui/screens/separation/
    SeparationRoute.kt
    SeparationScreen.kt
    SeparationViewModel.kt
    SeparationUiState.kt

ui/screens/separation/components/
    SeparationHeader.kt
    OrderSelector.kt
    GlobalProgressCard.kt
    StoreSelector.kt
    StoreSummaryCard.kt
    ProductCheckCard.kt
    DamagePanel.kt
    FinalizeBar.kt
    FinalizeDialog.kt
```

#### Motivo

A tela atual possui muitas responsabilidades e aproximadamente 861 linhas. A divisão reduz regressões e facilita reutilização.

#### Critérios de conclusão

- Componentes possuem responsabilidades pequenas.
- Estado fica no ViewModel.
- Componentes visuais recebem dados e callbacks, sem acessar diretamente o repositório.

### 6.3 Aproximar a identidade do Web

#### O que mudar

##### Cabeçalho

- Gradiente slate/roxo.
- Logo.
- Status.
- Fornecedor.
- Número do pedido.
- Progresso global.

##### Lojas

- Chips horizontais sempre visíveis.
- Verde para concluída.
- Âmbar para parcial.
- Slate para pendente.
- Marcador claro da loja selecionada.

##### Produtos

- Cartões grandes e arredondados.
- Foto destacada.
- Quantidade à direita.
- Check grande.
- Selo do conferente.

##### Avarias

- Painel recolhível.
- Formulário em bottom sheet.
- Resumo de quantidades deduzidas.

#### Motivo

A intenção não é copiar HTML no Compose, mas fazer os dois sistemas parecerem partes do mesmo produto.

#### Critérios de conclusão

- Usuário reconhece imediatamente a mesma hierarquia nos dois sistemas.
- Estados usam símbolos e cores equivalentes.
- Nenhuma ação comum exige mais toques no Android que no Web sem justificativa.

---

## Etapa 7 — Ergonomia para o time de separação

### 7.1 Reduzir toques repetitivos

#### Implementar

- Filtro “Somente pendentes”.
- Busca por código e descrição.
- Botão “Próxima loja pendente”.
- Avanço automático após concluir uma loja.
- Preservação da última loja selecionada.
- Foco automático no campo de busca.
- Suporte ao botão voltar sem perder rascunho.

#### Motivo

Em um processo repetitivo, pequenas economias de tempo por item acumulam ganhos relevantes durante o turno.

### 7.2 Código de barras

#### Implementar em duas etapas

Primeiro:

- Campo compatível com leitores Bluetooth/USB que digitam o código e enviam Enter.

Depois:

- Leitura pela câmera, se necessária.

#### Comportamento

- Produto encontrado: destacar, vibrar e abrir ação de conferência.
- Já conferido: informar responsável.
- Não encontrado: alerta claro sem modificar dados.
- Código pertencente a outra loja: explicar o contexto.

#### Motivo

Leitores físicos são mais rápidos e confiáveis na doca. A câmera pode ser adicionada depois sem bloquear o ganho inicial.

### 7.3 Feedback tátil e sonoro

#### Implementar

- Vibração curta: conferência aceita.
- Vibração dupla: conflito ou item já conferido.
- Feedback mais forte: erro de rede.
- Som opcional configurável.

#### Motivo

O operador nem sempre consegue manter atenção visual contínua no aparelho.

### 7.4 Modo offline controlado

#### Recomendação

Não implementar offline completo imediatamente. Primeiro corrigir a operação online.

Em uma segunda entrega:

- Room para cache local.
- Fila de operações.
- Identificador idempotente por ação.
- Reenvio automático.
- Tela de conflitos.
- Indicação persistente de operações pendentes.

#### Motivo

Offline sem controle de conflito pode duplicar ou sobrescrever conferências. É uma funcionalidade valiosa, mas deve ser construída sobre endpoints idempotentes.

---

## Etapa 8 — Segurança Android

### 8.1 Restringir HTTP

#### O que mudar

- Permitir HTTP somente no build `debug`.
- Exigir HTTPS no `release`.
- Remover confiança ampla em certificados instalados pelo usuário no build de produção.

#### Motivo

Token e dados operacionais não devem trafegar sem criptografia.

### 8.2 Proteger a sessão

#### O que mudar

- Não serializar o token dentro do objeto completo do usuário.
- Armazenar credenciais com solução protegida pelo Android Keystore.
- Limpar sessão após token inválido ou expirado.
- Implementar renovação controlada, caso o backend suporte refresh token.

#### Motivo

`SharedPreferences` comum não é apropriado para credenciais de produção.

### 8.3 Remover logs sensíveis

#### O que mudar

Configurar o interceptor HTTP:

```kotlin
if (BuildConfig.DEBUG) {
    level = HttpLoggingInterceptor.Level.BASIC
} else {
    level = HttpLoggingInterceptor.Level.NONE
}
```

Nunca registrar:

- Token.
- Senha.
- Corpo completo de autenticação.
- Dados pessoais.
- Conteúdo financeiro.

#### Motivo

O nível `BODY` pode expor credenciais e dados de pedidos nos logs do dispositivo.

### 8.4 Proteger backup e captura

#### O que mudar

- Avaliar `android:allowBackup="false"` para produção.
- Excluir preferências sensíveis de backup.
- Considerar bloqueio de captura apenas em telas realmente sensíveis.

#### Motivo

Sessões e dados operacionais não devem ser restaurados ou extraídos de forma indevida.

---

## Etapa 9 — Testes

### 9.1 Backend

Criar testes para:

- Perfil autorizado e não autorizado.
- Pedido sem recebimento.
- Conferência de item.
- Desconferência pelo autor.
- Tentativa de desconferência por terceiro.
- Registro e exclusão de avaria.
- Quantidade de avaria superior à alocação.
- Conflito de versão.
- Finalização incompleta.
- Finalização completa.
- Dupla finalização.
- Auditoria gerada.

### 9.2 Android — domínio e ViewModel

Criar testes para:

- Cálculo de quantidade efetiva.
- Conversão UN/CX/PCT.
- Progresso por loja e global.
- Item com quantidade zero.
- Atualização otimista com sucesso.
- Rollback em falha.
- Conflito `409`.
- Estado offline.
- Finalização.

### 9.3 Android — Compose UI

Testar:

- Pedido aguardando recebimento.
- Seleção de loja.
- Filtro de pendentes.
- Item conferido por outro usuário.
- Formulário de avaria.
- Botão de finalização habilitado somente em 100%.
- Tamanhos de fonte maiores.
- Modo claro e escuro.

### 9.4 Teste integrado Web–Android

Executar um roteiro real:

1. Web cria o pedido.
2. Web confirma recebimento.
3. Web distribui para lojas.
4. Android carrega o pedido.
5. Dois Androids conferem lojas diferentes.
6. Web acompanha o progresso.
7. Android registra avaria.
8. Web visualiza a mesma avaria.
9. Android finaliza.
10. Web recebe o pedido no faturamento.
11. Auditoria confirma responsáveis e horários.

#### Critério final

Nenhuma etapa pode depender de atualização manual do banco ou correção posterior de dados.

---

## Etapa 10 — Implantação gradual

### Primeira entrega

- Build Android corrigido.
- Contrato completo.
- Endpoints atômicos.
- Persistência confiável.
- RBAC.
- Concorrência.
- Finalização.

### Segunda entrega

- Nova interface Compose.
- Avarias completas.
- Navegação aprimorada.
- Busca, filtros e leitor físico.

### Terceira entrega

- Histórico e produtividade.
- Atualização em tempo real.
- Offline controlado.
- Leitura por câmera, se necessária.

### Estratégia de liberação

1. Testes internos.
2. Piloto com um ou dois separadores.
3. Monitoramento de erros e tempo de operação.
4. Ajustes de ergonomia.
5. Expansão para todo o time.
6. Desativação da versão anterior somente após estabilidade confirmada.

---

## Indicadores para avaliar a melhoria

Após a implantação, medir:

- Tempo médio para concluir uma loja.
- Toques médios por produto.
- Taxa de falha de sincronização.
- Quantidade de conferências corrigidas.
- Conflitos entre operadores.
- Avarias registradas corretamente.
- Pedidos parados em `Em Separação`.
- Tempo entre fim da separação e entrada no faturamento.
- Erros reportados pelo time.
- Uso de busca e código de barras.

---

## Sequência recomendada de execução

```text
Build e qualidade
        ↓
Contrato de dados
        ↓
API atômica + RBAC
        ↓
Concorrência e auditoria
        ↓
Estado e persistência Android
        ↓
Paridade funcional
        ↓
Nova interface
        ↓
Ergonomia operacional
        ↓
Segurança
        ↓
Testes integrados
        ↓
Piloto e implantação
```

## Meta prática da primeira entrega

Um separador deve conseguir conferir um pedido completo no Android, com dois dispositivos simultâneos, registrar avarias e liberar para faturamento sem perda ou sobrescrita de dados.

Depois dessa garantia, a modernização visual pode avançar com segurança.
