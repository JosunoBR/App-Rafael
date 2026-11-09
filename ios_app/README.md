# 🍏 Aplicativo iOS (iPhone & iPad) - Rede Mega 12

Projeto oficial do aplicativo iOS da **Rede Mega 12**, estruturado para rodar no iPhone e iPad com suporte a **SwiftUI nativo** e **Compose Multiplatform (Kotlin)**.

---

## 📁 Estrutura de Arquivos da Pasta `ios_app/`

```
ios_app/
├── Mega12App.xcodeproj/               # Projeto oficial do Xcode (iOS 16+)
│   ├── project.pbxproj                # Configurações de compilação, bundle id e targets
│   └── xcshareddata/xcschemes/        # Esquema oficial de execução Mega12App
├── Mega12App/                         # Código-fonte do aplicativo iOS
│   ├── Mega12App.swift                # Ponto de entrada @main do aplicativo
│   ├── ContentView.swift              # Interface gráfica principal e ponte de visualização
│   ├── LaunchScreen.storyboard        # Tela de abertura nativa oficial (Splash Screen)
│   ├── Info.plist                     # Permissões da Apple (Câmera, Galeria, ATS seguro)
│   └── Assets.xcassets/               # Ícones corporativos e cores da marca (Verde Esmeralda)
├── shared/                            # Ponte Kotlin Multiplatform (KMP)
│   └── src/                           # Código compartilhado com o app Android
├── build.gradle.kts                   # Configuração de compilação KMP para iOS
└── README.md                          # Este manual de execução
```

---

## 🚀 Como Abrir e Executar

### Opção 1: No Xcode (Direto em um Mac)
1. Abra o arquivo do projeto:
   ```bash
   open ios_app/Mega12App.xcodeproj
   ```
2. No topo da janela do Xcode, selecione qualquer simulador de iPhone (ex: **iPhone 15 Pro** ou **iPhone 16**).
3. Pressione **Cmd + R** (ou clique no botão **Play ▶️**).
4. O aplicativo abrirá imediatamente exibindo os módulos de **Comprador** (termômetro de margem, lançamento de pedidos) e **Conferente de Doca** (romaneio e avarias).

### Opção 2: Na Nuvem (Sem ter um Mac físico)
Configuramos a esteira de automação no arquivo [`.github/workflows/ios-build.yml`](../.github/workflows/ios-build.yml).
* Sempre que você enviar alterações para o repositório no GitHub, um servidor Mac com Xcode na nuvem compilará e validará o projeto automaticamente.

---

## 🛡️ Conformidade com as Diretrizes da Apple (App Store Guidelines)

O projeto já foi pré-configurado para aprovação sem fricção:
1. **Diretriz 5.1.1(v) - Exclusão de Conta:**
   * A aba de Configurações possui o botão obrigatório de **"Solicitar Exclusão da Conta"**.
2. **Diretriz 5.1 - Privacidade & ATS:**
   * O `Info.plist` possui justificativas claras em português para uso da Câmera (fotos de avarias e produtos) e restrição total de tráfego seguro HTTPS via `grupomega.cloud`.
3. **Criptografia Isenta:**
   * `ITSAppUsesNonExemptEncryption` definido como `false`, dispensando burocracia de relatórios de exportação no App Store Connect.

