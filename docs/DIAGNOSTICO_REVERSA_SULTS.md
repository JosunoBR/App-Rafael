# Diagnóstico inicial de engenharia reversa: SULTS Android

Data: 26/11/2026 (horário de Brasília).

## Objetivo e fonte

Examinar a distribuição Android `SULTS_3.0.13_APKPure.xapk` como referência de comportamento para os módulos operacionais do App Rafael. O projeto `REA/craft-anything` foi examinado como ferramenta prevista de análise, sem modificar seu código. Este diagnóstico registra apenas informações verificadas no arquivo local; as regras de negócio ainda exigem inspeção do aplicativo em execução ou evidências adicionais.

SHA-256 do XAPK: `F8F48D5349E5772DF351460A50C4DC9AD05C3040A9E31ABCC187308AB04D31BA`.

## Evidências verificadas

| Evidência | Resultado | Limite da inferência |
|---|---|---|
| `manifest.json` do XAPK | Pacote `br.com.sults.app`, versão `3.0.13` (`version_code` 27), Android mínimo 24 e alvo 36. | Metadados da distribuição, não validação em dispositivo. |
| Estrutura do XAPK | APK principal, splits `armeabi_v7a`, `en`, `fr` e `mdpi`. | Para instalação de teste são necessários os splits compatíveis. |
| APK principal | 440 entradas, `classes.dex`, `classes2.dex`, `AndroidManifest.xml` e `assets/flutter_assets`. | Não foram descompilados DEX nem manifesto binário. |
| Split de arquitetura | `lib/armeabi-v7a/libapp.so` e `lib/armeabi-v7a/libflutter.so`. | Confirma presença de Flutter; não identifica serviços do servidor. |
| Assets | Ícones Material, `preloader.gif`, arquivos dos pacotes `awesome_notifications` e `flutter_sound`. | Presença de dependências não prova qual recurso é usado em cada tela. |
| Metadados de permissões | Notificações, rede, câmera, áudio, localização e armazenamento entre as entradas. | A lista do XAPK contém duplicatas e nomes atípicos; só o manifesto Android decodificado confirma permissões efetivas. |

## Avaliação do Craft Anything neste ambiente

O repositório local está em código-fonte Rust (`Cargo.toml` exige Rust 1.97 ou superior). A documentação lista `android_package_show`, `android_resources_read`, `android_components_list`, `android_flutter_identify`, `android_dart_snapshot_show` e `android_app_graph_build`. **Nenhuma dessas ferramentas foi executada:** `cargo`, `rustc` e `craft-anything-cli` não estão disponíveis no PATH nem foi encontrado binário compilado dentro da cópia local. Portanto, este documento ainda não é um relatório produzido pela engine do Craft Anything. O inventário do XAPK foi feito por leitura de ZIP com `System.IO.Compression` do PowerShell, sem extrair ou executar o app.

O código Dart compilado no `libapp.so` exige tratamento diferente de um aplicativo Java/Kotlin convencional. Não é seguro inferir endpoints, telas, autenticação ou regras de negócio apenas dos nomes dos arquivos do pacote.

## Próximos passos com evidência verificável

1. Disponibilizar `craft-anything-cli.exe` compatível com Windows ou instalar Rust 1.97+ e compilar a CLI do repositório local; executar `craft-anything-cli doctor` e conferir `craft-anything-cli commands`.
2. Usar os comandos de Android da CLI sobre o XAPK ou o APK principal, documentando saída, cobertura e falhas; começar por identificação de pacote, Flutter, componentes, recursos e grafo. O comportamento da CLI com XAPK deve ser confirmado antes de decidir pela extração do APK principal.
3. Observar o SULTS em execução com conta de teste autorizada para mapear navegação, perfis, formulários, estados, fluxos de confirmação e mensagens. Registrar apenas especificações de comportamento e evidências necessárias, sem copiar código, mídias ou textos proprietários.
4. Comparar os fluxos comprovados com `RELATORIO_MODULOS_SULTS_VIDEO_BRYAN_2026-11-19.md`, `Sults/ANTIGRAVITY_SULTS_SPEC.md` e com os módulos já presentes em `web/src/modules/` e `backend/src/`. Marcar cada requisito como observado, relato do Bryan, hipótese ou já implementado.
5. Priorizar os módulos aprovados para integração ao App Rafael, preservando autenticação, permissões por unidade e validação no backend. Não assumir que o protótipo separado em `Sults/` esteja completo ou pronto para produção.

## Pendências

- Falta o executável ou toolchain para rodar o Craft Anything nesta máquina.
- Não há acesso autenticado ao SULTS nem captura da execução vinculada a este XAPK nesta análise.
- Nenhuma tela, regra de negócio, contrato de API ou dado de produção foi confirmado pelo pacote estático.
