# Plano de Modernização do App Mobile: Catálogo & BI

Este plano visa equiparar o App Android ao Sistema Web, adicionando o Catálogo Visual de Produtos e as ferramentas de Inteligência de Negócio (BI) para auxiliar a diretoria em viagens e feiras.

## User Review Required

> [!IMPORTANT]
> **Remoção de "Metas":** Conforme alinhado, não existem "metas de desconto". O app apenas apresentará o volume acumulado para dar poder de barganha manual ao comprador.

> [!NOTE]
> **Performance de Imagens:** Utilizaremos a biblioteca Coil para carregamento eficiente das fotos dos produtos via URL, evitando travamentos no catálogo.

## Proposed Changes

### 1. 🖼️ Módulo de Catálogo Visual

#### [NEW] [ProductCatalogScreen.kt](file:///home/josue/Documentos/App%20Rafael/android_app/app/src/main/java/br/com/mega12/app/ui/screens/buyer/ProductCatalogScreen.kt)
*   Interface em Grid com cards de produtos contendo foto, descrição, preço e margem.
*   Filtros por fornecedor e categoria.
*   Botão de "Adicionar ao Pedido" diretamente do catálogo.

#### [MODIFY] [NavGraph.kt](file:///home/josue/Documentos/App%20Rafael/android_app/app/src/main/java/br/com/mega12/app/ui/navigation/NavGraph.kt)
*   Adicionar a rota do Catálogo de Produtos.

---

### 2. 📊 Módulo de Dashboard & Barganha

#### [NEW] [ExecutiveDashboardScreen.kt](file:///home/josue/Documentos/App%20Rafael/android_app/app/src/main/java/br/com/mega12/app/ui/screens/dashboard/ExecutiveDashboardScreen.kt)
*   Cards de resumo: Faturamento PDV, Lucro Real, Margem Média e Ticket Médio.
*   Gráfico de barras simplificado de compras mensais.

#### [NEW] [BargainDossierComponent.kt](file:///home/josue/Documentos/App%20Rafael/android_app/app/src/main/java/br/com/mega12/app/ui/components/BargainDossierComponent.kt)
*   Componente reutilizável que mostra o "Dossiê" do fornecedor selecionado: Total investido, total de peças e histórico recente.

---

### 3. 🎨 Identidade Visual (Emerald Green)

#### [MODIFY] [Color.kt](file:///home/josue/Documentos/App%20Rafael/android_app/app/src/main/java/br/com/mega12/app/ui/theme/Color.kt)
*   Ajustar a paleta para o `Emerald 600` (#10B981) e `Dark Slate` (#0F172A) usados na Web.

#### [MODIFY] [CommonComponents.kt](file:///home/josue/Documentos/App%20Rafael/android_app/app/src/main/java/br/com/mega12/app/ui/components/CommonComponents.kt)
*   Estilizar botões e cards com bordas arredondadas e sombras suaves (Material 3).

---

### ⚙️ Integração de Dados

#### [MODIFY] [Mega12ViewModel.kt](file:///home/josue/Documentos/App%20Rafael/android_app/app/src/main/java/br/com/mega12/app/ui/viewmodel/Mega12ViewModel.kt)
*   Implementar lógica de cálculo de métricas agregadas (Dashboard) diretamente no ViewModel para refletir os dados do banco SQLite.

## Verification Plan

### Manual Verification
1.  **Catálogo:** Abrir a tela de catálogo e verificar se as fotos carregam corretamente.
2.  **Dashboard:** Comparar os valores de "Faturamento PDV" e "Lucro Real" com os dados do sistema Web para garantir paridade de cálculo.
3.  **Barganha:** Selecionar um fornecedor no pedido e verificar se o resumo de compras acumuladas aparece corretamente.
