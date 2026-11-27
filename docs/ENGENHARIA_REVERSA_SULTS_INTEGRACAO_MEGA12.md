# Engenharia Reversa do SULTS 3.0.13 e Integração dos Módulos no Sistema Mega 12

> **Documento de continuidade para outra IA / equipe de desenvolvimento**
>
> Data: 27/11/2026
> Alvo analisado: `REA/SULTS_3.0.13_APKPure.xapk`
> Sistema de destino: App Rafael / Mega 12 (Express + SQLite + React + Vite + Capacitor)
> Objetivo: incorporar ao sistema próprio as funcionalidades dos 13 módulos do menu “Mega 12 · Franquias”, com identidade Mega 12, sem depender do SULTS.

---

## 0. Resposta direta à pergunta central

**O APK não contém a estrutura física do sistema do SULTS.** Ele não contém:

- código-fonte do sistema web;
- banco de dados;
- regras de negócio;
- APIs internas;
- telas do sistema;
- modelos de dados;
- integrações de backend.

O APK é uma **casca Flutter com WebView** que abre o site do SULTS:

```text
https://app.sults.com.br?SultsApp=3.0.13&SultsAppPlataform=android
```

O sistema real do SULTS é **server-side**, em Java/JSF + PrimeFaces, servido em subdomínios por cliente (por exemplo, `mega12.sults.com.br` e `mega12.app.sults.com.br`). A interface que o usuário vê é renderizada pelo servidor do SULTS, não pelo APK.

Consequência prática:

1. **Não é possível “extrair o backend” do APK.** Ele não está lá.
2. **Nem a parte visual está no APK.** O APK só tem ícone, splash e a casca nativa. A UI real vem do site autenticado.
3. O que o APK entrega de útil é:
   - a arquitetura da casca nativa;
   - o protocolo de comunicação WebView ↔ Flutter;
   - as capacidades nativas usadas pelo SULTS (login persistente, gravação de áudio, download, abertura de navegador, notificações push, versão);
   - as permissões e os serviços Android;
   - os endpoints de registro de dispositivo para push.
4. A engenharia reversa correta é **comportamental e funcional**: observar o que o sistema faz (telas, fluxos, regras, relatórios), documentar e **reimplementar com código próprio** no Mega 12.

Este documento é exatamente essa especificação de continuidade. Ele não copia código, assets, textos ou identidade visual do SULTS. Ele descreve comportamento e propõe uma implementação original com a identidade Mega 12.

> **Regra para a próxima IA:** trate o SULTS apenas como referência funcional. Não copie HTML, CSS, JavaScript, imagens, fontes, textos proprietários, nomes de produtos ou marcas. Implemente do zero, com a linguagem visual e os padrões do Mega 12.

---

## 1. Sumário executivo

### 1.1 O que foi descoberto

| Achado | Evidência |
|---|---|
| O app é Flutter com WebView | `libapp.so` contém `flutter_webview_plugin`, `WebviewScaffold`, `WebViewJSChannelController` |
| O app carrega o site do SULTS | String `https://app.sults.com.br?SultsApp=3.0.13&SultsAppPlataform=android` |
| O app se identifica no User-Agent | `SultsApp/3.0.13` e `SultsAppPlataform/android` |
| O sistema real é Java/JSF + PrimeFaces | Login do tenant em `mega12.sults.com.br` com `primefaces 6.1`, tema Poseidon 1.15.3 |
| O login é multi-marca por subdomínio | JS de login monta `https://<cliente>.app.sults.com.br` |
| O app guarda a lista de logins | Canal `UserLoginJSChannel`, ações `putLogin`, `getLoginList`, `removeLogin` |
| O app grava áudio | Canal `AudioRecorderJSChannel`, `startRecorder`, `stopRecoderAudio`, `playRecoderAudio` |
| O app baixa arquivos e abre navegador | Canais `DownloadFileFromUrlJSChannel`, `OpenInBrowserJSChannel` |
| O app expõe a versão ao site | Canal `AppVersionJSChannel` |
| O app usa Firebase Cloud Messaging | Serviços `FlutterFirebaseMessagingService`, receiver `com.google.firebase.MESSAGING_EVENT`, canal `sults-notifications` |
| O app registra o dispositivo no backend do SULTS | `https://api.sults.com.br/api/notification/register-device` e `/notification/update-device/2` |
| Não há módulos de negócio no APK | O snapshot Dart só lista `main.dart`, `firebase_options.dart`, serviços de áudio/HTTP/notificação/versão, validadores e canais WebView |

### 1.2 O que o APK contém de código Dart (lista completa observada)

```text
package:SULTS/main.dart
package:SULTS/firebase_options.dart
package:SULTS/services/audio/audio_service_mp3.dart
package:SULTS/services/http/http_request.dart
package:SULTS/services/notification/device_token_service.dart
package:SULTS/services/notification/firebase_config_service.dart
package:SULTS/services/notification/handle_notification_service.dart
package:SULTS/services/version_controll/version_controll.dart
package:SULTS/validator/url_validation.dart
package:SULTS/validator/user_login_validator.dart
package:SULTS/webview_channel/webview_channel_app_version.dart
package:SULTS/webview_channel/webview_channel_audio_recorder.dart
package:SULTS/webview_channel/webview_channel_controller.dart
package:SULTS/webview_channel/webview_channel_user_login.dart
package:SULTS/webview_channel/webview_useragent.dart
```

Não existe, no APK, nenhum arquivo de:

- checklist;
- comunicado;
- NPS;
- NES;
- jornada;
- universidade;
- implantação;
- analytics;
- pessoas/documentos;
- compras de insumos;
- termos LGPD.

Isso confirma que essas funcionalidades estão no servidor do SULTS.

### 1.3 Estratégia adotada

```text
SULTS (referência funcional)
        │
        ├── observação de telas/fluxos (com acesso autorizado ou vídeos)
        ├── relatórios e vídeos já existentes no projeto
        ├── spec funcional já iniciada em Sults/ANTIGRAVITY_SULTS_SPEC.md
        └── análise da casca Android (este documento)
        │
        ▼
Especificação própria Mega 12
        │
        ├── modelo de dados SQLite
        ├── API Express
        ├── telas React com design system Mega 12
        ├── RBAC e auditoria
        ├── notificações e offline
        └── testes e implantação
```

---

## 2. Escopo, fontes e método

### 2.1 Fontes analisadas

| Fonte | Uso |
|---|---|
| `REA/SULTS_3.0.13_APKPure.xapk` | Pacote Android completo (XAPK) |
| `REA/extracted/br.com.sults.app.apk` | APK base |
| `REA/extracted/config.armeabi_v7a.apk` | Split com `libapp.so` e `libflutter.so` |
| `aapt2` do Android SDK 36 | Manifesto e recursos |
| `libapp.so` (snapshot Dart AOT) | Strings, canais, endpoints, classes |
| `classes.dex` / `classes2.dex` | Plugins Android, Firebase, notificações |
| `https://app.sults.com.br` | Página de login e JS de autenticação |
| `https://mega12.sults.com.br` | Login do tenant Mega 12 (JSF/PrimeFaces) |
| `https://mega12.app.sults.com.br` | Login do app do tenant Mega 12 |
| `RELATORIO_MODULOS_SULTS_VIDEO_BRYAN_2026-11-19.md` | Relato operacional dos módulos |
| `Sults/ANTIGRAVITY_SULTS_SPEC.md` | Spec funcional já iniciada |
| `Sults/PLANO_IMPLEMENTACAO.md` | Plano de implementação já iniciado |
| Código atual `backend/` e `web/` | Padrões, schema, RBAC, design |

### 2.2 Identificação do pacote

| Campo | Valor |
|---|---|
| Pacote | `br.com.sults.app` |
| Nome | SULTS |
| Versão | `3.0.13` |
| Version code | `27` |
| Min SDK | 24 |
| Target SDK | 36 |
| Splits | `config.armeabi_v7a`, `config.en`, `config.fr`, `config.mdpi` |
| Tamanho do XAPK | 17.129.732 bytes |
| SHA-256 do XAPK | `F8F48D5349E5772DF351460A50C4DC9AD05C3040A9E31ABCC187308AB04D31BA` |
| `libapp.so` | 4.489.820 bytes |
| `libflutter.so` | 7.425.452 bytes |
| `classes.dex` | 4.029.068 bytes |
| `classes2.dex` | ~1,7 MB |

### 2.3 Limites desta análise

- Não houve login autenticado no SULTS. Portanto, **as telas internas, regras exatas, campos e relatórios não foram observados diretamente**.
- As descrições funcionais deste documento combinam:
  - evidências do APK;
  - relato do Bryan (vídeo de 19/11/2026);
  - spec já existente em `Sults/`;
  - padrões conhecidos de sistemas de gestão de franquias;
  - decisões de produto propostas para o Mega 12.
- Tudo o que é proposta — e não evidência — está marcado como **[P]** (proposta) ou **[C]** (a confirmar).
- O Craft Anything foi instalado, mas a CLI ainda estava compilando no momento da redação. Ele não é necessário para a integração; é uma ferramenta auxiliar de inspeção.

### 2.4 Convenções de evidência

| Marca | Significado |
|---|---|
| **[E]** | Evidência verificada no APK, no site ou no código atual |
| **[R]** | Relato do Bryan / vídeo / documento existente |
| **[P]** | Proposta de produto Mega 12 (implementação original) |
| **[C]** | Decisão em aberto; precisa de confirmação humana |

---

## 3. Arquitetura do SULTS observada

### 3.1 Visão em camadas

```text
┌──────────────────────────────────────────────────────────────┐
│ App Android (Flutter)                                        │
│  • WebView (flutter_webview_plugin)                          │
│  • User-Agent: ... SultsApp/3.0.13 SultsAppPlataform/android │
│  • Bridges JS: login, áudio, download, navegador, versão     │
│  • Firebase Messaging + Awesome Notifications                │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼───────────────────────────────────┐
│ Site SULTS                                                   │
│  • app.sults.com.br (login/roteamento multi-marca)           │
│  • <cliente>.app.sults.com.br (sistema do tenant)            │
│  • Java Server Faces + PrimeFaces 6.1 + Poseidon 1.15.3      │
│  • Sessão JSESSIONID; cookies por tenant                     │
│  • CSP, HSTS, AWS API Gateway, S3, Twilio Flex               │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│ Backend SULTS (não acessível)                                │
│  • Regras de negócio, banco, APIs, relatórios, permissões    │
│  • Push: api.sults.com.br/api/notification/*                 │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Fluxo de login multi-marca

Evidências no JS público de `app.sults.com.br`:

1. O usuário informa a empresa (`scliente`).
2. O site monta `https://<scliente>.<domínio-base>` (ex.: `mega12.app.sults.com.br`).
3. A lista de logins é mantida:
   - no app: via `UserLoginJSChannel` (SharedPreferences nativo);
   - no navegador: `localStorage` ou cookie `LOGINS`.
4. O app injeta a lista no site com JavaScript:

```js
(() => { let logins = LOGINS_FROM_DART ; FUNCTION_CALLBACK })();
```

5. O site responde com `postMessage` para o app.

**Implicação para o Mega 12:** não precisamos replicar esse mecanismo. O nosso login já é único (JWT) e o nosso sistema é single-tenant. O que interessa é a **experiência**: login simples, persistência de sessão, múltiplos perfis e acesso por unidade.

### 3.3 Bridges nativas observadas

| Canal | Ações / uso | Equivalente no Mega 12 |
|---|---|---|
| `UserLoginJSChannel` | `putLogin`, `getLoginList`, `removeLogin` | Sessão JWT + “lembrar-me”; não precisa de lista multi-marca |
| `UserAgenteJSChannel` | envia `navigator.userAgent` ao app | User-Agent padrão; detecção de app via Capacitor |
| `AudioRecorderJSChannel` | gravar/parar/tocar áudio; arquivo `/audio_recorder_*` | MediaRecorder (web) / plugin de voz no Capacitor |
| `DownloadFileFromUrlJSChannel` | baixar arquivos | Download via Blob/`<a download>`; Capacitor Filesystem |
| `OpenInBrowserJSChannel` | abrir link no navegador | `window.open` / Capacitor Browser |
| `AppVersionJSChannel` | expor versão ao site | `@capacitor/app` / `App.getInfo()` |
| `WebViewJSChannelController` | controller dos canais | Sem equivalente necessário; usar APIs web |

### 3.4 Notificações push observadas

| Item | Evidência |
|---|---|
| Firebase Cloud Messaging | Serviços e receivers no manifesto |
| Canal Android | `sults-notifications` |
| Registro de dispositivo | `https://api.sults.com.br/api/notification/register-device` |
| Atualização de token | `/notification/update-device/2` |
| Ação de clique | `FLUTTER_NOTIFICATION_CLICK` |
| Notificações locais/agendadas | `awesome_notifications` |
| Permissões | `POST_NOTIFICATIONS`, `WAKE_LOCK`, `RECEIVE` (C2DM) |

**Implicação:** o Mega 12 precisa de uma infraestrutura própria de notificações. Para o web app, o caminho mais simples é:

1. **Fase 1:** central de notificações in-app (sino + lista + badge) e e-mail.
2. **Fase 2:** Web Push (VAPID) para navegadores compatíveis.
3. **Fase 3:** Capacitor Push Notifications (FCM) para o app Android/iOS.

Não é necessário replicar o Firebase do SULTS. Podemos usar o mesmo Firebase do projeto Mega 12 ou Web Push puro. **[C]**

### 3.5 Permissões Android observadas

- `POST_NOTIFICATIONS`
- `INTERNET`, `ACCESS_NETWORK_STATE`
- `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`
- `VIDEO_CAPTURE`, `AUDIO_CAPTURE`
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`
- `WAKE_LOCK`
- `BLUETOOTH`
- permissões de badge de launcher (Samsung, HTC, Sony, Huawei, Oppo etc.)
- `com.google.android.c2dm.permission.RECEIVE`

**Leitura para o Mega 12:** essas permissões revelam as capacidades que o SULTS usa no dia a dia: câmera para evidências, microfone para áudio, localização para visitas/check-in, arquivos para documentos e notificações para avisos. O nosso app (web + Capacitor) deve pedir permissão **no momento do uso**, com explicação clara, e nunca de forma antecipada.

### 3.6 Stack do servidor SULTS

Evidências no HTML/headers:

- Java Server Faces (`javax.faces.resource`);
- PrimeFaces 6.1;
- tema Poseidon 1.15.3;
- `JSESSIONID` (sessão server-side);
- CSP com `connect-src` para `*.sults.com.br`, S3, API Gateway, Google APIs, YouTube, Vimeo, Twilio Flex;
- HSTS;
- `X-Content-Type-Options: nosniff`;
- `frame-ancestors` restrito;
- página de “navegador não suportado” para browsers antigos.

**Implicação:** o SULTS é um sistema maduro, server-rendered, com forte dependência de sessão e de recursos Java. Não faz sentido copiar essa stack. O Mega 12 já tem uma stack moderna (React + Express + SQLite) e deve continuar nela.

---

## 4. O que o APK NÃO permite fazer (e por quê)

| Tentativa | Resultado |
|---|---|
| Extrair endpoints de checklist/NPS/etc. | Não existem no APK; estão no servidor |
| Extrair schema do banco | Não existe no APK |
| Extrair telas | Não existem no APK; são HTML remoto |
| Extrair regras de pontuação de checklist | Não existem no APK |
| Extrair textos oficiais dos módulos | Não existem no APK |
| Reutilizar o código do SULTS | Não há código de negócio no APK |
| Copiar a UI | A UI é remota e proprietária; copiar seria violação |
| Descobrir a API interna | Só com acesso autenticado e engenharia de tráfego, o que não é necessário nem recomendado |

**O que é legítimo e útil:**

- observar o comportamento com uma conta autorizada (telas, fluxos, relatórios);
- documentar funcionalidades em linguagem própria;
- reimplementar com código e design próprios;
- usar os vídeos/relatos já existentes;
- usar a spec funcional já iniciada como ponto de partida.

---

## 5. Situação atual do sistema Mega 12

### 5.1 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 |
| Roteamento | `react-router-dom` 7 |
| Ícones | `lucide-react` |
| App mobile | Capacitor 8 (Android/iOS) |
| Backend | Node.js + Express 4 |
| Banco | SQLite via `sql.js` (`mega12.db`) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Segurança | `helmet`, CORS, idempotência |
| Exportação | `jspdf`, `jspdf-autotable`, `xlsx`, `exceljs` |
| Testes | scripts Node + testes manuais |

### 5.2 Estrutura relevante

```text
backend/
  server.js
  src/
    config/database.js          # schema e migrações idempotentes
    config/environment.js
    controllers/
    middlewares/auth.middleware.js
    middlewares/rbac.middleware.js
    repositories/
    routes/index.js
    services/
web/
  src/
    App.tsx
    components/
    design-system/
    layouts/AppLayout.tsx
    modules/
    routes/
    shared/
    utils/api.ts
```

### 5.3 Módulos do menu “Mega 12 · Franquias” já mapeados

`web/src/shared/franchiseModules.ts` já contém os 13 módulos:

| ID | Rótulo | Status atual |
|---|---|---|
| `franchise_units` | Unidades | Placeholder (lista `stores`) |
| `franchise_documents` | Mega 12 · Pessoas e Docs | Placeholder |
| `franchise_purchases` | Compras de Insumos | Placeholder |
| `franchise_announcements` | Comunicados | **Implementado parcialmente** |
| `franchise_checklists` | Checklists | Placeholder |
| `franchise_agenda` | Agenda | Placeholder (link para calendário existente) |
| `franchise_university` | Universidade Corporativa | Placeholder |
| `franchise_implementation` | Implantação de Unidades | Placeholder |
| `franchise_analytics` | Analytics | Placeholder |
| `franchise_journey` | Jornada | Placeholder |
| `franchise_nes` | NES | Placeholder |
| `franchise_nps` | NPS | Placeholder |
| `franchise_lgpd` | Termos LGPD | Placeholder |

### 5.4 O que já existe e deve ser reaproveitado

- `stores`: cadastro básico de unidades (`id`, `name`, `shortName`, `cluster`, `defaultWeight`, `active`).
- `users`: login, papel, `storeId`, permissões JSON.
- `franchise_announcements`, `franchise_announcement_targets`, `franchise_announcement_audit`: base do módulo Comunicados.
- `AnnouncementsPage.tsx`: padrão visual e funcional de uma tela de módulo.
- `FranchiseModulePage.tsx`: casca dos placeholders; deve ser substituída módulo a módulo.
- `permissions.ts` / `permissionsCatalog.ts`: RBAC granular.
- `AppLayout.tsx` / `Sidebar.tsx`: navegação e submenu.
- `apiFetch`: cliente HTTP com token, idempotência e tratamento de erros.
- `data/produtos`, `data/comprovantes`, `data/calendar-memos`: padrão de arquivos em disco.
- `calendarMemos.service.js`: padrão de upload em streaming com limite de 20 MB.
- `franchiseAnnouncements.service.js`: padrão de service com validação, transação e auditoria.

### 5.5 Lacunas e riscos atuais

| Item | Risco | Ação recomendada |
|---|---|---|
| `canAccessTab` libera franquias apenas para `root` | Nenhum outro perfil acessa os módulos | Criar permissões granulares e liberar por papel |
| Rota de comunicados exige `root` | Diretoria não publica; unidade não lê | Trocar por `requirePermission` |
| CORS aberto (`cors()`) | Qualquer origem acessa a API | Allowlist de origens |
| JWT de 30 dias em `localStorage` | XSS pode roubar token | Access token curto + refresh em cookie `httpOnly` |
| `bcrypt` custo 10 | Aceitável, mas pode melhorar | Custo 12 ou Argon2id |
| CSP desativada no Helmet | Superfície de XSS | Definir CSP compatível |
| Sem rate limiting | Força bruta/abuso | `express-rate-limit` em auth e uploads |
| Sem validação padronizada | Dados inválidos | Validadores por módulo (ou Zod) |
| Sem central de notificações | Comunicados não notificam | Implementar notificações in-app + push |
| Sem storage abstraction | Arquivos espalhados | `fileStorage` service (disco/S3) |
| Sem testes automatizados de API | Regressões | `supertest` + testes de serviço |
| Placeholders parecem “prontos” | Expectativa errada | Marcar claramente “em implementação” |

---

## 6. Especificação funcional dos 13 módulos

> **Como ler:** cada módulo tem objetivo, atores, entidades, fluxo, regras, notificações, indicadores, integração e prioridade. As regras marcadas **[P]** são decisões de produto propostas; confirme antes de codificar.

### 6.1 Unidades

**Objetivo:** ser o cadastro mestre das lojas, com dados operacionais, status, vínculos de pessoas e acesso por perfil. Todos os outros módulos dependem dele.

**Atores:**

- Root/Diretoria: criar, editar, ativar/suspender, vincular usuários.
- Supervisor: consultar unidades da sua região.
- Unidade: consultar apenas a própria unidade.

**Entidades:**

- `stores` (existente, estendida)
- `unit_profiles` (dados complementares)
- `user_units` (vínculo N:N usuário ↔ unidade)
- `unit_contacts` (contatos)
- `unit_audit` (trilha)

**Campos propostos:**

| Campo | Tipo | Regra |
|---|---|---|
| `id` | TEXT | UUID ou código legado |
| `code` | TEXT | Único, 2–20 caracteres |
| `name` | TEXT | Obrigatório, 3–120 |
| `shortName` | TEXT | Opcional, até 40 |
| `cnpj` | TEXT | 14 dígitos, único, validado |
| `cluster` | TEXT | A/B/C ou regional |
| `regional` | TEXT | Opcional |
| `status` | TEXT | `planning`, `implementation`, `active`, `suspended`, `closed` |
| `openingDate` | DATE | Opcional |
| `address*` | TEXT | CEP, logradouro, número, complemento, bairro, cidade, UF |
| `latitude` / `longitude` | REAL | Opcional; usado em jornada |
| `phone` / `email` | TEXT | Opcional |
| `managerUserId` | TEXT | FK `users.id` |
| `notes` | TEXT | Até 2000 |
| `active` | INTEGER | 0/1 (compatibilidade) |

**Fluxo:**

1. Listar com busca, filtro por status/cluster/UF.
2. Criar unidade (status inicial `planning` ou `active`).
3. Editar dados cadastrais.
4. Ativar/suspender (com motivo e auditoria).
5. Vincular usuários e pessoas.
6. Abrir visão 360°: pessoas, documentos, checklists, NPS, insumos, implantação.

**Regras:**

- [P] CNPJ válido e único; validar dígitos.
- [P] Não excluir unidade com histórico; usar `closed`/soft delete.
- [P] Perfil `unidade` só vê a própria unidade; supervisor vê as unidades vinculadas.
- [P] Toda alteração gera auditoria (quem, quando, antes/depois).
- [P] Código da unidade é imutável após criação (ou alterável só por root com auditoria).

**Indicadores:** unidades ativas, por cluster/UF, em implantação, suspensas, tempo médio de implantação.

**Integração:** estender `stores` com migrações idempotentes; criar `unit_profiles` se preferir não inflar `stores`; `user_units` para multi-unidade.

**Prioridade:** Fase 1 (base).

---

### 6.2 Mega 12 · Pessoas e Docs

**Objetivo:** diretório de pessoas (colaboradores) e repositório de documentos da rede, das unidades e das pessoas, com controle de acesso, versões e validade.

**Atores:**

- Root/Diretoria/RH: gerenciar pessoas e documentos.
- Supervisor: consultar equipe das suas unidades.
- Unidade: consultar pessoas e documentos da própria unidade.
- Colaborador: consultar os próprios documentos (opcional).

**Entidades:**

- `people` (pessoa física vinculada a uma unidade; não é login)
- `person_documents` (documentos pessoais)
- `document_folders` (pastas hierárquicas)
- `documents` (documentos da rede/unidade)
- `document_versions`
- `document_permissions` (ACL por papel/usuário/unidade)
- `document_reads` (ciência/leitura)
- `document_audit`

**Campos de pessoa:**

| Campo | Regra |
|---|---|
| `id` | UUID |
| `unitId` | FK `stores.id` |
| `name` | 3–120 |
| `cpf` | 11 dígitos, único, validado, **criptografado/mascarado** |
| `cargo` | Texto |
| `email` / `phone` | Opcional |
| `admissionDate` / `terminationDate` | Datas |
| `birthDate` | Data (opcional; dado pessoal) |
| `status` | `active`, `vacation`, `leave`, `terminated` |
| `userId` | FK opcional `users.id` |
| `notes` | Até 2000 |

**Campos de documento:**

- `title`, `category`, `description`
- `scope`: `network`, `unit`, `person`
- `unitId` / `personId` (conforme escopo)
- `storageKey`, `mime`, `sizeBytes`, `sha256`
- `version`, `expiresAt`, `visibility`
- `createdBy`, `createdAt`, `updatedAt`
- `status`: `draft`, `published`, `archived`

**Fluxo:**

1. Cadastrar pessoa e vincular à unidade.
2. Criar pastas (rede, unidade, pessoa).
3. Enviar documento (upload).
4. Definir visibilidade e validade.
5. Publicar; notificar destinatários.
6. Registrar leitura/ciência.
7. Nova versão substitui a anterior (histórico preservado).
8. Alertar documentos vencendo/vencidos.

**Regras:**

- [P] CPF e dados sensíveis criptografados em repouso; exibir mascarado por padrão.
- [P] Download somente com permissão; nunca URL pública adivinhável.
- [P] Toda leitura/download gera auditoria.
- [P] Documento com `expiresAt` gera alerta 30/15/7 dias antes.
- [P] Exclusão é lógica; versões anteriores permanecem.
- [P] Limite de upload e allowlist de MIME (PDF, imagens, Office).
- [P] Varredura antivírus é desejável; se não houver, aceitar risco documentado.

**Indicadores:** documentos por categoria, vencimentos, taxa de leitura, armazenamento, pessoas por unidade.

**Integração:** novas tabelas; `fileStorage` service; vínculo com LGPD (dados pessoais).

**Prioridade:** Fase 1 (junto com Unidades).

---

### 6.3 Compras de Insumos

**Objetivo:** requisições internas de materiais de expediente, sacolas e suprimentos de consumo das lojas, com aprovação, separação e entrega. **Não confundir** com `purchase_orders` (compras de fornecedores) já existentes.

**Atores:**

- Unidade: criar e acompanhar requisição.
- Matriz/Comprador: aprovar/rejeitar.
- Estoque/CD: separar e expedir.
- Diretoria: acompanhar indicadores.

**Entidades:**

- `supply_items` (catálogo de insumos)
- `supply_requests`
- `supply_request_items`
- `supply_request_events` (timeline)
- `supply_stock_movements` (entrada/saída)
- `supply_settings` (limites, aprovação)

**Status da requisição:**

```text
draft → submitted → approved → separating → shipped → received → closed
                    ↘ rejected
                    ↘ cancelled
```

**Campos da requisição:**

- `id`, `unitId`, `requesterId`
- `status`, `priority` (`normal`, `urgent`)
- `justification`, `notes`
- `requestedAt`, `approvedAt`, `shippedAt`, `receivedAt`
- `approvedBy`, `shippedBy`, `receivedBy`
- `totalItems`, `totalQuantity`, `estimatedCost`
- `trackingCode` (opcional)

**Itens:**

- `supplyItemId`, `description`, `unitOfMeasure`
- `quantityRequested`, `quantityApproved`, `quantityShipped`, `quantityReceived`
- `unitPrice`, `totalPrice`

**Fluxo:**

1. Unidade monta a requisição a partir do catálogo.
2. Envia para aprovação.
3. Matriz aprova total ou parcialmente, ou rejeita com motivo.
4. Estoque separa, registra saída e expede.
5. Unidade confirma recebimento (com divergências).
6. Requisição é encerrada; estoque é ajustado.

**Regras:**

- [P] Quantidade > 0; item ativo; unidade ativa.
- [P] Aprovação obrigatória acima de limite configurável.
- [P] Não editar após `approved`; correções via nova requisição ou evento.
- [P] Divergência de recebimento gera ocorrência e notificação.
- [P] Baixa de estoque só em `shipped` (ou `received`, conforme política).
- [P] Limite mensal por unidade (opcional).
- [P] Anexos: comprovante de entrega, foto de divergência.

**Indicadores:** requisições abertas, tempo médio de atendimento, taxa de atendimento, itens mais pedidos, custo por unidade, divergências.

**Integração:** novas tabelas `supply_*`; vínculo com `stores`, `users`; arquivos; notificações.

**Prioridade:** Fase 4.

---

### 6.4 Comunicados

**Objetivo:** publicar avisos oficiais para toda a rede ou unidades específicas, com confirmação de leitura e métricas.

**Status atual:** parcialmente implementado (`AnnouncementsPage`, `franchiseAnnouncements.service`), mas:
- só root acessa;
- não há confirmação de leitura;
- não há anexos, categoria, urgência, fixação ou expiração;
- não há notificações;
- não há feed por unidade.

**Atores:**

- Root/Diretoria: publicar, arquivar, ver métricas.
- Supervisor/Gerente: ler e confirmar.
- Unidade: ler e confirmar.
- Todos: feed na home.

**Entidades:**

- `franchise_announcements` (existente, estendida)
- `franchise_announcement_targets` (existente)
- `franchise_announcement_reads` (nova)
- `franchise_announcement_attachments` (nova)
- `franchise_announcement_audit` (existente)

**Extensões propostas:**

| Campo | Uso |
|---|---|
| `category` | `geral`, `operacional`, `rh`, `financeiro`, `urgente` |
| `priority` | `normal`, `high`, `critical` |
| `requiresConfirmation` | 0/1 |
| `pinned` | 0/1 |
| `publishedAt` | Data de publicação |
| `expiresAt` | Expiração |
| `revision` | Controle de versão |

**Fluxo:**

1. Redigir (título, mensagem, categoria, prioridade).
2. Selecionar público (toda a rede ou unidades).
3. Anexar arquivos (opcional).
4. Publicar; notificar.
5. Usuário lê e confirma.
6. Métricas: quem leu, quem não leu, tempo médio.
7. Arquivar (histórico preservado).

**Regras:**

- [P] Título 1–160; mensagem 1–10.000.
- [P] Comunicado crítico exige confirmação explícita.
- [P] Uma confirmação por usuário; registrar data/hora/IP/UA.
- [P] Não editar após publicado; criar revisão.
- [P] Expiração remove do feed ativo, mas preserva histórico.
- [P] Feed filtrado por unidade e papel.
- [P] Push/e-mail para críticos e para quem não leu após X horas.

**Indicadores:** taxa de leitura, pendentes por unidade, tempo médio de leitura, comunicados ativos.

**Integração:** migrar a rota para `requirePermission('franchise:announcements:publish')`; adicionar tabelas; criar feed na home e central de notificações.

**Prioridade:** Fase 2 (evolução do que já existe).

---

### 6.5 Checklists

**Objetivo:** vistorias padronizadas dos supervisores nas lojas, com pontuação, evidências, geolocalização, assinatura e geração automática de planos de ação 5W2H.

**Atores:**

- Root/Diretoria: modelos e relatórios.
- Supervisor: realizar vistoria.
- Unidade: responder planos de ação.
- Auditor: consultar.

**Entidades:**

- `checklist_templates`
- `checklist_sections`
- `checklist_questions`
- `checklist_options`
- `checklist_inspections`
- `checklist_answers`
- `checklist_evidences`
- `action_plans`
- `action_plan_events`
- `checklist_audit`

**Tipos de pergunta:**

| Tipo | Uso |
|---|---|
| `yes_no` | Conforme/não conforme |
| `scale` | 0–10 ou 1–5 |
| `text` | Resposta livre |
| `number` | Medição |
| `photo` | Evidência obrigatória |
| `signature` | Assinatura do responsável |
| `select` | Múltipla escolha |

**Campos da pergunta:**

- `prompt`, `helpText`
- `type`, `weight`, `critical`
- `requiresPhotoOnFail`
- `order`, `active`
- `sectionId`

**Fluxo:**

1. Criar modelo (seções e perguntas, pesos, críticas).
2. Agendar ou iniciar vistoria (unidade, supervisor, data).
3. Responder (online/offline), com fotos e observações.
4. Finalizar: calcular score, registrar geolocalização e assinatura.
5. Para cada não conformidade crítica, abrir plano de ação automaticamente.
6. Unidade resolve com evidências.
7. Supervisor valida ou reprova.
8. Analytics consolida.

**Regras:**

- [P] Score = soma ponderada das respostas / total possível × 100.
- [P] Pergunta crítica reprovada abre plano de ação com prazo padrão.
- [P] Foto obrigatória em não conformidade crítica.
- [P] Vistoria finalizada é imutável; correções via revisão auditada.
- [P] Geolocalização opcional; se ativa, validar raio da unidade.
- [P] Offline: rascunho local + fila de sincronização.
- [P] Evidências com hash e metadados (data, autor, coordenadas).
- [P] Planos de ação com 5W2H: o quê, por quê, onde, quem, quando, como, quanto.

**Indicadores:** score médio por unidade/modelo, evolução, não conformidades recorrentes, planos abertos/vencidos, tempo de resolução.

**Integração:** novas tabelas; `stores`, `users`; arquivos; notificações; offline (IndexedDB).

**Prioridade:** Fase 3 (núcleo operacional).

---

### 6.6 Agenda

**Objetivo:** calendário compartilhado de visitas, reuniões, treinamentos e marcos de implantação.

**Atores:**

- Todos: visualizar a própria agenda.
- Root/Diretoria/Supervisor: criar e gerenciar.
- Unidade: visualizar eventos da unidade.

**Entidades:**

- `agenda_events`
- `agenda_attendees`
- `agenda_reminders`
- `agenda_recurrences` (opcional)

**Campos:**

- `title`, `description`, `type` (`visit`, `meeting`, `training`, `implementation`, `other`)
- `unitId` (opcional), `checklistId` (opcional), `courseId` (opcional), `projectId` (opcional)
- `startsAt`, `endsAt`, `allDay`, `timezone`
- `location`, `meetingUrl`
- `visibility` (`private`, `unit`, `network`)
- `status` (`scheduled`, `confirmed`, `completed`, `cancelled`)
- `createdBy`

**Fluxo:**

1. Criar evento e convidar participantes.
2. Convidado aceita/recusa.
3. Lembretes (1 dia, 1 hora).
4. Realizar; registrar ata/anexos.
5. Concluir.

**Regras:**

- [P] Fuso `America/Sao_Paulo`.
- [P] Detectar conflito de horário do mesmo participante.
- [P] Recorrência simples (diária/semanal/mensal) na fase 2.
- [P] Visibilidade respeita o RBAC.
- [P] Exportação `.ics`.
- [P] Integrar com `units_calendar` e `calendar_memos` existentes, sem duplicar dados.

**Indicadores:** visitas por supervisor, taxa de comparecimento, eventos por unidade.

**Integração:** nova tabela; unificar visualização com o calendário existente; notificações.

**Prioridade:** Fase 2 (junto com Comunicados).

---

### 6.7 Universidade Corporativa

**Objetivo:** disponibilizar treinamentos internos, videoaulas, materiais e questionários, com acompanhamento de conclusão.

**Atores:**

- Root/Diretoria: criar cursos e trilhas.
- Supervisor: atribuir treinamentos.
- Colaborador: assistir/aulas e responder questionários.
- Unidade: acompanhar a equipe.

**Entidades:**

- `lms_courses`
- `lms_modules`
- `lms_lessons`
- `lms_materials`
- `lms_quizzes`
- `lms_questions`
- `lms_options`
- `lms_enrollments`
- `lms_progress`
- `lms_attempts`
- `lms_certificates`

**Tipos de conteúdo:**

- vídeo (YouTube/Vimeo/link ou upload)
- PDF
- texto
- link externo
- questionário

**Fluxo:**

1. Criar curso (título, descrição, capa, público).
2. Adicionar módulos e aulas.
3. Adicionar materiais e questionário.
4. Publicar e atribuir (por papel, unidade ou pessoa).
5. Colaborador consome; progresso é registrado.
6. Questionário com nota mínima.
7. Certificado emitido (PDF).
8. Relatórios de conclusão.

**Regras:**

- [P] Progresso por aula; conclusão do curso = 100% + nota mínima.
- [P] Tentativas limitadas configuráveis.
- [P] Treinamento obrigatório com prazo e alerta.
- [P] Certificado com código verificável.
- [P] Vídeo: preferir links (YouTube/Vimeo) para não sobrecarregar o storage.
- [P] Controle de acesso por unidade/papel.
- [P] LGPD: não expor notas individualmente para colegas; apenas para gestores.

**Indicadores:** taxa de conclusão, nota média, tempo de estudo, obrigatórios pendentes.

**Integração:** novas tabelas; arquivos; notificações; certificados em PDF (jsPDF já existe).

**Prioridade:** Fase 5.

---

### 6.8 Implantação de Unidades

**Objetivo:** gerenciar a abertura de novas lojas com cronograma, tarefas, responsáveis, evidências e checklist de go-live.

**Atores:**

- Root/Diretoria: criar projeto e aprovar marcos.
- Equipe de implantação: executar tarefas.
- Unidade: acompanhar.

**Entidades:**

- `implantation_templates`
- `implantation_template_tasks`
- `implantation_projects`
- `implantation_tasks`
- `implantation_task_dependencies`
- `implantation_evidences`
- `implantation_milestones`

**Fases propostas:**

1. Planejamento e viabilidade.
2. Jurídico/documentos.
3. Obra e infraestrutura.
4. Contratação e treinamento.
5. Estoque e sistemas.
6. Checklist pré-inauguração.
7. Inauguração.
8. Pós-inauguração (30/60/90 dias).

**Campos da tarefa:**

- `title`, `description`
- `phase`, `status` (`pending`, `in_progress`, `blocked`, `done`, `cancelled`)
- `assigneeId`, `startDate`, `dueDate`, `completedAt`
- `dependsOn` (tarefa)
- `evidenceRequired`
- `order`

**Fluxo:**

1. Criar projeto a partir de template.
2. Ajustar datas e responsáveis.
3. Executar tarefas; anexar evidências.
4. Validar marcos.
5. Concluir projeto; unidade passa para `active`.
6. Acompanhar 30/60/90 dias.

**Regras:**

- [P] Dependências impedem conclusão fora de ordem.
- [P] Atraso gera alerta e reprogramação.
- [P] Evidência obrigatória em tarefas críticas.
- [P] Go-live só com checklist 100% concluído.
- [P] Vínculo com `stores.status`.
- [P] Orçamento opcional (previsto vs. realizado).

**Indicadores:** progresso, dias até a abertura, tarefas atrasadas, marcos, custo.

**Integração:** novas tabelas; `stores`; Agenda; Checklists; Documentos.

**Prioridade:** Fase 4.

---

### 6.9 Analytics

**Objetivo:** consolidar indicadores dos módulos em painéis por rede, unidade, período e modelo.

**Atores:**

- Root/Diretoria: visão completa.
- Supervisor: unidades vinculadas.
- Unidade: própria unidade.

**Entidades:**

- Nenhuma tabela transacional nova obrigatória.
- `analytics_saved_reports` (opcional)
- `analytics_report_schedules` (opcional)
- Views SQL/materialized aggregates.

**Indicadores mínimos:**

| Módulo | Indicadores |
|---|---|
| Checklists | score médio, evolução, não conformidades, planos abertos/vencidos |
| Comunicados | taxa de leitura, pendentes, tempo médio |
| Compras | requisições abertas, lead time, atendimento, custo |
| Universidade | conclusão, nota média, obrigatórios |
| Implantação | progresso, atrasos, dias até abertura |
| NPS | NPS, resposta, detratores |
| NES | eNPS, participação, dimensões |
| Jornada | visitas, cobertura, tempo em loja |

**Fluxo:**

1. Selecionar filtros (período, unidade, cluster, modelo).
2. Consultar endpoints agregados.
3. Exibir cards, gráficos e tabelas.
4. Exportar PDF/Excel.
5. (Opcional) agendar relatório.

**Regras:**

- [P] Somente leitura.
- [P] Escopo por unidade/perfil.
- [P] Não expor PII em agregados.
- [P] Período máximo (ex.: 24 meses) para evitar consultas pesadas.
- [P] Cache de 5–15 minutos.
- [P] Gráficos acessíveis (não depender só de cor).

**Integração:** endpoints `/api/franchise-analytics/*`; consultas SQL; componentes de gráfico.

**Prioridade:** Fase 3 (após checklists) e evolução contínua.

---

### 6.10 Jornada

**Objetivo:** registrar a jornada de serviço dos supervisores: visitas, check-in/check-out, tempo em loja e atividades realizadas.

**Atores:**

- Supervisor: registrar jornada.
- Diretoria: acompanhar.
- Unidade: confirmar visita (opcional).

**Entidades:**

- `journeys`
- `journey_visits`
- `journey_checkins`
- `journey_activities`
- `journey_adjustments`

**Campos:**

- `supervisorId`, `unitId`, `date`
- `checkinAt`, `checkoutAt`, `latitude`, `longitude`, `accuracy`
- `activityType` (`checklist`, `meeting`, `training`, `audit`, `other`)
- `notes`, `status`
- `adjustmentReason` (se manual)

**Fluxo:**

1. Supervisor inicia a jornada.
2. Check-in na unidade (geolocalização).
3. Realiza atividades (checklist, reunião).
4. Check-out.
5. Registra deslocamento/observações.
6. Diretoria acompanha cobertura.

**Regras:**

- [P] Geolocalização somente durante a jornada; nunca rastreamento contínuo.
- [P] Raio de tolerância (ex.: 300 m) para validar check-in.
- [P] Ajuste manual exige justificativa e aprovação.
- [P] Consentimento LGPD e política de privacidade claros.
- [P] Não usar como controle de ponto oficial sem validação jurídica.
- [P] Integração com Agenda e Checklists.

**Indicadores:** visitas por dia/supervisor, cobertura de unidades, tempo médio em loja, pontualidade.

**Integração:** novas tabelas; `stores`; `agenda_events`; `checklist_inspections`.

**Prioridade:** Fase 5.

---

### 6.11 NES

**Objetivo:** pesquisa interna de clima/saúde da loja, aplicada periodicamente, com respostas anônimas e indicadores agregados.

> **A confirmar:** o significado exato de “NES” no SULTS. O relato do Bryan descreve “um negócio para saber como é que tá as lojas, se tá tudo bem, dá para fazer uns questionários”. Neste documento, NES é tratado como **pesquisa interna de clima/engajamento** (estilo eNPS), distinta do NPS de cliente. **[C]**

**Atores:**

- Root/Diretoria/RH: criar campanha e ver resultados.
- Colaboradores: responder anonimamente.
- Supervisor: ver apenas agregados da sua unidade (se mínimo de respostas).

**Entidades:**

- `nes_campaigns`
- `nes_questions`
- `nes_options`
- `nes_responses`
- `nes_answers`
- `nes_invites` (token anônimo)

**Fluxo:**

1. Criar campanha (período, público, perguntas).
2. Gerar convites anônimos (link/token de uso único).
3. Colaborador responde.
4. Agregar resultados.
5. Gerar plano de ação.
6. Acompanhar evolução.

**Regras:**

- [P] Anonimato real: não gravar `userId` na resposta; usar token de uso único.
- [P] Exibir resultados somente com mínimo de respostas (ex.: 5) por grupo.
- [P] Não coletar PII em perguntas abertas; orientar.
- [P] Participação opcional; sem penalidade.
- [P] Dados agregados e retention definida.

**Indicadores:** eNPS, participação, médias por dimensão, evolução, comentários categorizados.

**Integração:** novas tabelas; Analytics; LGPD.

**Prioridade:** Fase 5.

---

### 6.12 NPS

**Objetivo:** medir satisfação de clientes das lojas com pesquisa 0–10, classificar promotores/neutros/detratores e acompanhar recuperação de detratores.

**Atores:**

- Root/Diretoria: campanhas e visão geral.
- Unidade: visão da própria loja.
- Cliente: responder (link/QR/WhatsApp).
- Atendimento: tratar detratores.

**Entidades:**

- `nps_campaigns`
- `nps_invites`
- `nps_responses`
- `nps_tags`
- `nps_followups`

**Campos:**

- `score` (0–10)
- `comment` (opcional)
- `unitId`, `campaignId`
- `channel` (`qr`, `link`, `whatsapp`, `email`, `app`)
- `customerName`/`customerContact` (opcional, com consentimento)
- `consent` (LGPD)
- `createdAt`

**Fluxo:**

1. Criar campanha.
2. Distribuir convites (QR na loja, link, WhatsApp).
3. Cliente responde.
4. Classificar: promotor (9–10), neutro (7–8), detrator (0–6).
5. Alertar unidade para detratores.
6. Registrar follow-up.
7. Consolidar NPS.

**Regras:**

- [P] Uma resposta por convite; evitar duplicidade.
- [P] NPS = %promotores − %detratores.
- [P] Comentário opcional; não exigir PII.
- [P] Consentimento para contato.
- [P] Mínimo de respostas para exibir por unidade.
- [P] Não incentivar resposta com benefício que distorça o resultado.

**Indicadores:** NPS, taxa de resposta, detratores, tempo de recuperação, evolução por loja.

**Integração:** novas tabelas; notificações; Analytics; LGPD.

**Prioridade:** Fase 5.

---

### 6.13 Termos LGPD

**Objetivo:** versionar termos/políticas, coletar aceite com evidências e atender solicitações de titulares.

**Atores:**

- Root/Diretoria/DPO: publicar versões, consultar aceites.
- Todos os usuários: aceitar.
- DPO: atender solicitações.

**Entidades:**

- `lgpd_terms`
- `lgpd_term_versions`
- `lgpd_acceptances`
- `lgpd_requests`
- `lgpd_audit`

**Campos do termo:**

- `title`, `description`, `type` (`privacy`, `cookies`, `code_of_conduct`, `image_use`, `other`)
- `version`, `contentHash`, `publishedAt`, `effectiveAt`
- `requiresAcceptance`, `audience`

**Aceite:**

- `termVersionId`, `userId`
- `acceptedAt`, `ip`, `userAgent`, `contentHash`
- `method` (`login`, `profile`, `link`)

**Fluxo:**

1. Publicar nova versão.
2. Marcar como obrigatória.
3. No próximo login/acesso, bloquear até aceitar.
4. Registrar evidências.
5. Relatório de aceites/pendentes.
6. Solicitação de titular: acesso, correção, exclusão, portabilidade.
7. Auditoria.

**Regras:**

- [P] Versões imutáveis; conteúdo com hash.
- [P] Evidência completa (data, IP, UA, hash).
- [P] Reaceite em nova versão obrigatória.
- [P] Dados sensíveis criptografados; acesso mínimo.
- [P] Retention e exclusão conforme política.
- [P] Bloqueio gradual: funcionalidades críticas exigem aceite.

**Indicadores:** taxa de aceite, pendentes por unidade, versões ativas, solicitações.

**Integração:** novas tabelas; middleware de aceite; auditoria; Auth.

**Prioridade:** Fase 5 (mas o quanto antes para conformidade).

---

## 7. Modelo de dados proposto (SQLite)

### 7.1 Princípios

- IDs `TEXT` (UUID v4) para novas tabelas.
- Datas em ISO 8601 UTC (`TEXT`).
- `createdAt`, `updatedAt`, `createdBy`, `updatedBy` em tabelas mutáveis.
- Soft delete (`deletedAt`) quando houver histórico.
- `version INTEGER` para concorrência otimista em registros editáveis.
- Constraints `CHECK` para enums.
- FKs com `ON DELETE` explícito.
- Índices em colunas de filtro/ordenação.
- Auditoria append-only.
- Nada de PII em logs.

### 7.2 Reaproveitamento do schema atual

| Necessidade | Decisão |
|---|---|
| Unidades | Reutilizar `stores` e estender com colunas |
| Usuários | Reutilizar `users`; criar `user_units` para multi-unidade |
| Comunicados | Estender `franchise_announcements` |
| Pessoas | Nova `people` (não confundir com `users`) |
| Arquivos | Nova `files` + storage em disco/S3 |
| Auditoria | Nova `franchise_audit_log` |
| Notificações | Novas `notifications`, `notification_reads`, `device_tokens` |

### 7.3 DDL base (resumo)

> As migrações devem ser idempotentes, no padrão de `backend/src/config/database.js` (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE` em try/catch). Não criar um segundo banco.

```sql
-- Vínculo N:N usuário ↔ unidade
CREATE TABLE IF NOT EXISTS user_units (
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unitId TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role TEXT,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (userId, unitId)
);
CREATE INDEX IF NOT EXISTS idx_user_units_unit ON user_units(unitId);

-- Perfil complementar da unidade
CREATE TABLE IF NOT EXISTS unit_profiles (
  unitId TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  code TEXT UNIQUE,
  cnpj TEXT UNIQUE,
  regional TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('planning','implementation','active','suspended','closed')),
  openingDate TEXT,
  zipCode TEXT, street TEXT, number TEXT, complement TEXT,
  district TEXT, city TEXT, state TEXT,
  latitude REAL, longitude REAL,
  phone TEXT, email TEXT,
  managerUserId TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Pessoas (colaboradores)
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  unitId TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  userId TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 3 AND 120),
  cpfEncrypted TEXT,
  cpfHash TEXT UNIQUE,
  cargo TEXT,
  email TEXT,
  phone TEXT,
  admissionDate TEXT,
  terminationDate TEXT,
  birthDate TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','vacation','leave','terminated')),
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_people_unit ON people(unitId, status);

-- Documentos e versões
CREATE TABLE IF NOT EXISTS document_folders (
  id TEXT PRIMARY KEY,
  parentId TEXT REFERENCES document_folders(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK(scope IN ('network','unit','person')),
  unitId TEXT REFERENCES stores(id) ON DELETE CASCADE,
  personId TEXT REFERENCES people(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  folderId TEXT REFERENCES document_folders(id) ON DELETE SET NULL,
  scope TEXT NOT NULL CHECK(scope IN ('network','unit','person')),
  unitId TEXT REFERENCES stores(id) ON DELETE CASCADE,
  personId TEXT REFERENCES people(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  currentVersion INTEGER NOT NULL DEFAULT 1,
  expiresAt TEXT,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK(status IN ('draft','published','archived')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  documentId TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  storageKey TEXT NOT NULL,
  originalName TEXT NOT NULL,
  mime TEXT NOT NULL,
  sizeBytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  uploadedBy TEXT NOT NULL,
  uploadedAt TEXT NOT NULL,
  UNIQUE(documentId, version)
);

-- Arquivos genéricos (evidências, anexos, certificados)
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  storageKey TEXT NOT NULL UNIQUE,
  originalName TEXT NOT NULL,
  mime TEXT NOT NULL,
  sizeBytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  scope TEXT,
  ownerType TEXT,
  ownerId TEXT,
  uploadedBy TEXT NOT NULL,
  uploadedAt TEXT NOT NULL,
  deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_files_owner ON files(ownerType, ownerId);

-- Comunicados: leitura/ciência
CREATE TABLE IF NOT EXISTS franchise_announcement_reads (
  announcementId TEXT NOT NULL REFERENCES franchise_announcements(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  readAt TEXT,
  confirmedAt TEXT,
  ip TEXT,
  userAgent TEXT,
  PRIMARY KEY (announcementId, userId)
);

-- Checklists
CREATE TABLE IF NOT EXISTS checklist_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist_sections (
  id TEXT PRIMARY KEY,
  templateId TEXT NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  orderIndex INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checklist_questions (
  id TEXT PRIMARY KEY,
  sectionId TEXT NOT NULL REFERENCES checklist_sections(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  helpText TEXT,
  type TEXT NOT NULL CHECK(type IN ('yes_no','scale','text','number','photo','signature','select')),
  weight REAL NOT NULL DEFAULT 1,
  critical INTEGER NOT NULL DEFAULT 0,
  requiresPhotoOnFail INTEGER NOT NULL DEFAULT 0,
  orderIndex INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS checklist_inspections (
  id TEXT PRIMARY KEY,
  templateId TEXT NOT NULL REFERENCES checklist_templates(id),
  unitId TEXT NOT NULL REFERENCES stores(id),
  supervisorId TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','in_progress','completed','cancelled')),
  score REAL,
  startedAt TEXT,
  finishedAt TEXT,
  latitude REAL, longitude REAL, accuracy REAL,
  signatureFileId TEXT REFERENCES files(id),
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_inspections_unit ON checklist_inspections(unitId, finishedAt);

CREATE TABLE IF NOT EXISTS checklist_answers (
  id TEXT PRIMARY KEY,
  inspectionId TEXT NOT NULL REFERENCES checklist_inspections(id) ON DELETE CASCADE,
  questionId TEXT NOT NULL REFERENCES checklist_questions(id),
  value TEXT,
  conforming INTEGER,
  observation TEXT,
  answeredAt TEXT NOT NULL,
  UNIQUE(inspectionId, questionId)
);

CREATE TABLE IF NOT EXISTS checklist_evidences (
  inspectionId TEXT NOT NULL REFERENCES checklist_inspections(id) ON DELETE CASCADE,
  answerId TEXT REFERENCES checklist_answers(id) ON DELETE CASCADE,
  fileId TEXT NOT NULL REFERENCES files(id),
  PRIMARY KEY (inspectionId, fileId)
);

CREATE TABLE IF NOT EXISTS action_plans (
  id TEXT PRIMARY KEY,
  inspectionId TEXT REFERENCES checklist_inspections(id) ON DELETE SET NULL,
  unitId TEXT NOT NULL REFERENCES stores(id),
  title TEXT NOT NULL,
  description TEXT,
  what TEXT, why TEXT, where TEXT, who TEXT, when TEXT, how TEXT, howMuch TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK(status IN ('open','in_progress','resolved','validated','rejected','cancelled')),
  dueDate TEXT,
  resolvedAt TEXT,
  validatedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_action_plans_unit ON action_plans(unitId, status, dueDate);

-- Agenda
CREATE TABLE IF NOT EXISTS agenda_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'other'
    CHECK(type IN ('visit','meeting','training','implementation','other')),
  unitId TEXT REFERENCES stores(id) ON DELETE SET NULL,
  startsAt TEXT NOT NULL,
  endsAt TEXT NOT NULL,
  allDay INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  meetingUrl TEXT,
  visibility TEXT NOT NULL DEFAULT 'unit'
    CHECK(visibility IN ('private','unit','network')),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK(status IN ('scheduled','confirmed','completed','cancelled')),
  createdBy TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agenda_starts ON agenda_events(startsAt);

-- Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  entityType TEXT,
  entityId TEXT,
  readAt TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, readAt, createdAt);

CREATE TABLE IF NOT EXISTS device_tokens (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('android','ios','web')),
  token TEXT NOT NULL UNIQUE,
  lastSeenAt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

-- Auditoria
CREATE TABLE IF NOT EXISTS franchise_audit_log (
  id TEXT PRIMARY KEY,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  action TEXT NOT NULL,
  actorId TEXT,
  actorName TEXT,
  beforeJson TEXT,
  afterJson TEXT,
  ip TEXT,
  userAgent TEXT,
  occurredAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_franchise_audit_entity ON franchise_audit_log(entityType, entityId, occurredAt);
```

> As tabelas de Compras, LMS, Implantação, Jornada, NES, NPS e LGPD seguem o mesmo padrão. O documento lista as entidades na seção 6; a próxima IA deve criar as migrações conforme a prioridade.

### 7.4 Convenções de nomes

- Tabelas no plural, `snake_case`.
- Novas tabelas de franquias com prefixo do domínio (`supply_`, `lms_`, `implantation_`, `journey_`, `nes_`, `nps_`, `lgpd_`).
- Não usar `camelCase` em colunas SQL.
- Respeitar o padrão existente (`stores`, `users`, `franchise_announcements`).

---

## 8. Contratos de API (Express)

### 8.1 Convenções

- Base: `/api`.
- Prefixos por domínio:
  - `/api/franchise-units`
  - `/api/franchise-people`
  - `/api/franchise-documents`
  - `/api/franchise-supplies`
  - `/api/franchise-announcements` (existente)
  - `/api/franchise-checklists`
  - `/api/franchise-agenda`
  - `/api/franchise-lms`
  - `/api/franchise-implementation`
  - `/api/franchise-analytics`
  - `/api/franchise-journey`
  - `/api/franchise-nes`
  - `/api/franchise-nps`
  - `/api/franchise-lgpd`
- Autenticação: `Authorization: Bearer <JWT>`.
- Idempotência: header `Idempotency-Key` em mutações (middleware existente).
- Paginação: `?page=1&pageSize=20` (máx. 100).
- Busca: `?search=`.
- Filtros: `?status=&unitId=&from=&to=`.
- Ordenação: `?sort=createdAt&dir=desc` com allowlist.
- Resposta de lista: `{ "items": [...], "total": 123, "page": 1, "pageSize": 20 }`.
- Resposta de erro: `{ "error": "Mensagem segura", "code": "VALIDATION_ERROR", "details": {...} }`.
- Nunca retornar stack trace ao cliente.
- Validar tudo no backend; nunca confiar no frontend.

### 8.2 Permissões (RBAC)

Criar códigos no `permissionsCatalog.ts` e validar no backend com `requirePermission`:

| Código | Uso |
|---|---|
| `nav:franchise` | Acessar o menu Mega 12 · Franquias |
| `franchise:units:view` | Ver unidades |
| `franchise:units:manage` | Criar/editar unidades |
| `franchise:people:view` | Ver pessoas |
| `franchise:people:manage` | Gerenciar pessoas |
| `franchise:documents:view` | Ver documentos |
| `franchise:documents:manage` | Gerenciar documentos |
| `franchise:supplies:request` | Criar requisição de insumo |
| `franchise:supplies:approve` | Aprovar requisição |
| `franchise:supplies:fulfill` | Separar/expedir |
| `franchise:announcements:view` | Ver comunicados |
| `franchise:announcements:publish` | Publicar comunicados |
| `franchise:announcements:metrics` | Ver métricas de leitura |
| `franchise:checklists:view` | Ver checklists |
| `franchise:checklists:perform` | Realizar vistoria |
| `franchise:checklists:manage` | Criar modelos e validar planos |
| `franchise:agenda:view` | Ver agenda |
| `franchise:agenda:manage` | Gerenciar agenda |
| `franchise:lms:view` | Ver cursos |
| `franchise:lms:manage` | Gerenciar cursos |
| `franchise:implementation:view` | Ver implantação |
| `franchise:implementation:manage` | Gerenciar implantação |
| `franchise:analytics:view` | Ver analytics |
| `franchise:journey:view` | Ver jornadas |
| `franchise:journey:perform` | Registrar jornada |
| `franchise:nes:view` | Ver pesquisas NES |
| `franchise:nes:respond` | Responder NES |
| `franchise:nps:view` | Ver NPS |
| `franchise:nps:respond` | Responder NPS |
| `franchise:lgpd:view` | Ver termos/aceites |
| `franchise:lgpd:manage` | Gerenciar termos |

**Papéis atuais:** `root`, `diretoria`, `comprador`, `deposito`, `separacao`, `faturamento`, `unidade`.

**Papéis propostos [P]:** `supervisor`, `gerente`, `colaborador`, `rh`, `dpo`. Avaliar impacto no login e na navegação antes de criar.

### 8.3 Endpoints por módulo (mínimo viável)

#### Unidades

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/franchise-units` | `franchise:units:view` | Lista com filtros |
| GET | `/franchise-units/:id` | `franchise:units:view` | Detalhe + vínculos |
| POST | `/franchise-units` | `franchise:units:manage` | Criar |
| PUT | `/franchise-units/:id` | `franchise:units:manage` | Atualizar |
| POST | `/franchise-units/:id/status` | `franchise:units:manage` | Ativar/suspender |
| POST | `/franchise-units/:id/users` | `franchise:units:manage` | Vincular usuário |
| DELETE | `/franchise-units/:id/users/:userId` | `franchise:units:manage` | Desvincular |

#### Pessoas e documentos

| Método | Rota | Permissão |
|---|---|---|
| GET/POST | `/franchise-people` | `franchise:people:view` / `manage` |
| GET/PUT | `/franchise-people/:id` | idem |
| GET/POST | `/franchise-documents` | `franchise:documents:view` / `manage` |
| POST | `/franchise-documents/:id/versions` | `franchise:documents:manage` |
| GET | `/franchise-documents/:id/download` | `franchise:documents:view` |
| POST | `/franchise-documents/:id/read` | `franchise:documents:view` |
| GET | `/franchise-documents/expiring` | `franchise:documents:view` |

#### Compras de insumos

| Método | Rota | Permissão |
|---|---|---|
| GET | `/franchise-supplies/catalog` | `franchise:supplies:request` |
| GET/POST | `/franchise-supplies/requests` | `request` |
| GET | `/franchise-supplies/requests/:id` | `request` |
| POST | `/franchise-supplies/requests/:id/submit` | `request` |
| POST | `/franchise-supplies/requests/:id/approve` | `approve` |
| POST | `/franchise-supplies/requests/:id/reject` | `approve` |
| POST | `/franchise-supplies/requests/:id/ship` | `fulfill` |
| POST | `/franchise-supplies/requests/:id/receive` | `request` |
| GET | `/franchise-supplies/stock` | `fulfill` |

#### Comunicados (evolução)

| Método | Rota | Permissão |
|---|---|---|
| GET | `/franchise-announcements` | `view` |
| GET | `/franchise-announcements/feed` | `view` |
| POST | `/franchise-announcements` | `publish` |
| POST | `/franchise-announcements/:id/read` | `view` |
| POST | `/franchise-announcements/:id/confirm` | `view` |
| GET | `/franchise-announcements/:id/metrics` | `metrics` |
| POST | `/franchise-announcements/:id/archive` | `publish` |

#### Checklists

| Método | Rota | Permissão |
|---|---|---|
| GET/POST | `/franchise-checklists/templates` | `view` / `manage` |
| GET/POST | `/franchise-checklists/inspections` | `view` / `perform` |
| GET | `/franchise-checklists/inspections/:id` | `view` |
| PUT | `/franchise-checklists/inspections/:id/answers` | `perform` |
| POST | `/franchise-checklists/inspections/:id/finalize` | `perform` |
| POST | `/franchise-checklists/inspections/:id/sync` | `perform` |
| GET/POST | `/franchise-checklists/action-plans` | `view` / `manage` |
| POST | `/franchise-checklists/action-plans/:id/resolve` | `view` |
| POST | `/franchise-checklists/action-plans/:id/validate` | `manage` |

#### Agenda

| Método | Rota | Permissão |
|---|---|---|
| GET/POST | `/franchise-agenda/events` | `view` / `manage` |
| GET/PUT/DELETE | `/franchise-agenda/events/:id` | `view` / `manage` |
| POST | `/franchise-agenda/events/:id/respond` | `view` |
| GET | `/franchise-agenda/events.ics` | `view` |

#### LMS

| Método | Rota | Permissão |
|---|---|---|
| GET/POST | `/franchise-lms/courses` | `view` / `manage` |
| GET/PUT | `/franchise-lms/courses/:id` | `view` / `manage` |
| POST | `/franchise-lms/courses/:id/publish` | `manage` |
| POST | `/franchise-lms/courses/:id/enroll` | `view` |
| POST | `/franchise-lms/lessons/:id/progress` | `view` |
| POST | `/franchise-lms/quizzes/:id/attempts` | `view` |
| GET | `/franchise-lms/certificates/:id` | `view` |

#### Implantação

| Método | Rota | Permissão |
|---|---|---|
| GET/POST | `/franchise-implementation/projects` | `view` / `manage` |
| GET/PUT | `/franchise-implementation/projects/:id` | `view` / `manage` |
| POST | `/franchise-implementation/projects/:id/tasks` | `manage` |
| PUT | `/franchise-implementation/tasks/:id` | `manage` |
| POST | `/franchise-implementation/tasks/:id/evidence` | `manage` |
| GET | `/franchise-implementation/projects/:id/gantt` | `view` |

#### Analytics

| Método | Rota | Permissão |
|---|---|---|
| GET | `/franchise-analytics/overview` | `view` |
| GET | `/franchise-analytics/checklists` | `view` |
| GET | `/franchise-analytics/announcements` | `view` |
| GET | `/franchise-analytics/supplies` | `view` |
| GET | `/franchise-analytics/lms` | `view` |
| GET | `/franchise-analytics/nps` | `view` |
| GET | `/franchise-analytics/nes` | `view` |
| GET | `/franchise-analytics/export` | `view` |

#### Jornada / NES / NPS / LGPD

| Módulo | Rotas principais |
|---|---|
| Jornada | `POST /franchise-journey/checkin`, `POST /franchise-journey/checkout`, `GET /franchise-journey/visits` |
| NES | `GET/POST /franchise-nes/campaigns`, `POST /franchise-nes/responses`, `GET /franchise-nes/campaigns/:id/results` |
| NPS | `GET/POST /franchise-nps/campaigns`, `POST /franchise-nps/responses`, `GET /franchise-nps/campaigns/:id/results` |
| LGPD | `GET/POST /franchise-lgpd/terms`, `POST /franchise-lgpd/terms/:id/accept`, `GET /franchise-lgpd/acceptances`, `POST /franchise-lgpd/requests` |

### 8.4 Exemplo: finalizar checklist

**Request**

```http
POST /api/franchise-checklists/inspections/8f1.../finalize
Authorization: Bearer <token>
Idempotency-Key: 6b2...
Content-Type: application/json
```

```json
{
  "answers": [
    { "questionId": "q1", "value": "no", "observation": "Extintor vencido", "evidenceFileIds": ["f1"] },
    { "questionId": "q2", "value": "yes", "observation": "" }
  ],
  "latitude": -23.5505,
  "longitude": -46.6333,
  "signatureFileId": "f2"
}
```

**Response 200**

```json
{
  "id": "8f1...",
  "status": "completed",
  "score": 78.5,
  "actionPlans": [
    { "id": "ap1", "title": "Regularizar extintor", "priority": "critical", "dueDate": "2026-12-05" }
  ]
}
```

### 8.5 Exemplo: sincronização offline

```http
POST /api/franchise-checklists/inspections/:id/sync
```

```json
{
  "clientUpdatedAt": "2026-11-27T12:00:00Z",
  "version": 3,
  "answers": [ ... ],
  "deletedAnswerIds": [ ... ]
}
```

Resposta:

- `200` se aplicado;
- `409` com `currentVersion` e `serverUpdatedAt` se houver conflito;
- o cliente resolve e reenvia.

---

## 9. Integração no frontend React

### 9.1 Rotas

O `routePaths.ts` já gera rotas para os 13 módulos:

```text
/franquias/unidades
/franquias/pessoas-e-docs
/franquias/compras-de-insumos
/franquias/comunicados
/franquias/checklists
/franquias/agenda
/franquias/universidade-corporativa
/franquias/implantacao-de-unidades
/franquias/analytics
/franquias/jornada
/franquias/nes
/franquias/nps
/franquias/termos-lgpd
```

**Ação:** substituir o `FranchiseModulePage` genérico por páginas reais, uma a uma, mantendo o mesmo caminho.

### 9.2 Estrutura de pastas proposta

```text
web/src/modules/franchises/
  units/
    pages/UnitsPage.tsx
    components/UnitFormModal.tsx
    components/UnitDetailDrawer.tsx
    api.ts
    types.ts
  people/
    pages/PeoplePage.tsx
    components/PersonFormModal.tsx
    components/DocumentsPanel.tsx
  supplies/
    pages/SupplyRequestsPage.tsx
    components/SupplyRequestForm.tsx
    components/ApprovalModal.tsx
  announcements/         # já existe
  checklists/
    pages/ChecklistsPage.tsx
    pages/InspectionPage.tsx
    components/TemplateEditor.tsx
    components/AnswerForm.tsx
    components/ActionPlanModal.tsx
  agenda/
    pages/AgendaPage.tsx
  lms/
    pages/CoursesPage.tsx
    pages/CoursePlayerPage.tsx
  implementation/
    pages/ProjectsPage.tsx
    pages/ProjectDetailPage.tsx
  analytics/
    pages/AnalyticsPage.tsx
    components/KpiCards.tsx
    components/Charts.tsx
  journey/
    pages/JourneyPage.tsx
  nes/
    pages/NesCampaignsPage.tsx
    pages/NesRespondPage.tsx
  nps/
    pages/NpsCampaignsPage.tsx
    pages/NpsRespondPage.tsx
  lgpd/
    pages/TermsPage.tsx
    pages/AcceptanceReportPage.tsx
  shared/
    components/FranchisePageHeader.tsx
    components/StatusBadge.tsx
    components/EmptyState.tsx
    components/ConfirmDialog.tsx
    api.ts
```

### 9.3 Padrão visual (identidade Mega 12)

Referência de componentes já usados no sistema (`AnnouncementsPage.tsx`, `UnitsManagementPage.tsx`, `ProductsCatalogPage.tsx`, `UsersPage.tsx`):

- Cabeçalho em cartão branco `rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:...`, com tile de ícone, título, descrição e ação primária;
- gradiente escuro `from-slate-900 via-slate-800 to-emerald-950` reservado à Home ou a uma visão geral opcional, não repetido em todas as páginas;
- logo Mega 12 no shell, sem repetir em cada página;
- eyebrow “Mega 12 · Gestão de Franquias”;
- título e descrição;
- botão primário emerald;
- cards `rounded-2xl border border-slate-200 bg-white shadow-sm dark:...`;
- inputs `rounded-xl` com foco emerald;
- tabelas responsivas com `overflow-x-auto`;
- badges de status;
- modais acessíveis;
- estados de carregamento (skeleton), vazio e erro;
- dark mode;
- ícones `lucide-react`;
- tipografia e espaçamento consistentes.

**Regra de identidade e nomenclatura (obrigatória):**

- A interface do Mega 12 não menciona, exibe ou referencia o nome da plataforma de referência em nenhum lugar: títulos, subtítulos, botões, labels, placeholders, mensagens de erro, `aria-label`, URLs, nomes de arquivos, imagens, ícones, e-mails ou documentos gerados.
- Toda a copy é Mega 12: “Mega 12 · Gestão de Franquias”, “Rede”, “Matriz”, “Unidade”.
- Nenhum asset, fonte, cor, textura, ilustração, print ou trecho de texto da referência é incorporado. A implementação é original.
- A referência externa serve apenas para entender comportamento e regras. O nome dela pode aparecer somente em documentos internos de pesquisa, nunca no produto.
- Em revisão de PR, rejeitar qualquer string da marca de referência na UI, nos assets ou nos textos enviados ao usuário.

**Não copiar** cores, fontes, layout, textos ou assets da referência. A identidade é Mega 12.

### 9.4 Componentes compartilhados a criar

| Componente | Função |
|---|---|
| `FranchisePageHeader` | Header padrão dos módulos |
| `KpiCard` | Indicador com rótulo, valor e variação |
| `StatusBadge` | Status colorido + texto (não só cor) |
| `EmptyState` | Estado vazio com ação |
| `ErrorState` | Erro com “tentar novamente” |
| `SkeletonTable` | Carregamento |
| `ConfirmDialog` | Confirmação de ações destrutivas |
| `PermissionGate` | Renderiza só com permissão |
| `FileUpload` | Upload com progresso, limite e allowlist |
| `RichTextEditor` | Comunicados (opcional) |
| `DateRangeFilter` | Filtro de período |
| `DataTable` | Tabela com ordenação, paginação e acessibilidade |
| `ChartCard` | Container de gráfico |
| `NotificationBell` | Central de notificações |

### 9.5 Acessibilidade e ergonomia (obrigatório)

- Todo input com `<label>` associado.
- Botões com `aria-label` quando só ícone.
- Foco visível e ordem de tabulação lógica.
- `Esc` fecha modais; `Enter` submete.
- Foco automático no primeiro campo do modal.
- Mensagens de erro inline, claras e com `role="alert"`.
- Contraste mínimo 4.5:1 para texto e 3:1 para controles.
- Não usar cor como único indicador de status.
- Tabelas com `<th scope="col">`.
- `aria-live` para atualizações assíncronas.
- Respeitar `prefers-reduced-motion`.

### 9.6 Performance e resiliência

- Paginação server-side.
- Debounce de busca (300 ms).
- `AbortController` para cancelar requisições antigas.
- Skeleton em vez de tela em branco.
- Atualização otimista com rollback em erro.
- Bloqueio de duplo clique em submit.
- Cache curto para listas e indicadores.
- Lazy loading de rotas com `React.lazy`.
- Imagens comprimidas e `loading="lazy"`.

### 9.7 Offline (checklists e jornada)

- Rascunho em IndexedDB (recomendado `idb`) ou localStorage para textos pequenos.
- Fila de sincronização com `Idempotency-Key`.
- Resolução de conflito por `version` + `updatedAt`.
- Indicador de “offline” e “pendente de sincronização”.
- Nunca perder respostas digitadas.
- Fotos: armazenar blobs no IndexedDB e enviar depois; comprimir antes.

---

## 10. Segurança, LGPD e auditoria

### 10.1 Segurança da aplicação

| Controle | Ação |
|---|---|
| Validação de entrada | Validar tipos, tamanhos, enums e regras no backend |
| SQL Injection | Usar sempre queries parametrizadas (`queryAll`, `execute`) |
| XSS | Escapar saída; CSP; não usar `dangerouslySetInnerHTML` sem sanitização |
| CSRF | Se usar cookies, token CSRF; hoje é Bearer, mas revisar |
| CORS | Allowlist de origens (hoje aberto) |
| Rate limiting | Auth, uploads e endpoints públicos |
| Upload | Allowlist MIME, limite de tamanho, nome seguro, hash, varredura |
| Segredos | `.env` fora do Git; rotação; nunca logar |
| JWT | Expiração curta + refresh; não armazenar em localStorage se possível |
| Senhas | bcrypt custo 12 ou Argon2id |
| Headers | Helmet com CSP, HSTS, `X-Frame-Options`, `nosniff` |
| Logs | Sem PII, sem tokens, sem senhas; request ID |
| Dependências | `npm audit` e atualização periódica |
| Backup | Rotina e teste de restauração |

### 10.2 LGPD

- Base legal e finalidade para cada dado.
- Minimização: coletar só o necessário.
- Dados sensíveis (CPF, saúde, biometria) criptografados.
- Consentimento para NPS/contato e para geolocalização.
- Direitos do titular: acesso, correção, exclusão, portabilidade.
- Retenção e descarte definidos.
- Registro de acesso a dados sensíveis.
- Encarregado (DPO) e canal de solicitações.
- Termos versionados com evidência de aceite.
- Relatório de impacto (RIPD) se necessário.

### 10.3 Auditoria

Registrar, no mínimo:

- login/logout e falhas de login;
- criação/edição/exclusão de unidades, pessoas, documentos;
- publicação/leitura/confirmação de comunicados;
- criação/finalização de checklists e planos de ação;
- aprovação/expedição de insumos;
- aceite de termos;
- acesso a documentos sensíveis;
- alterações de permissões.

Formato:

```json
{
  "entityType": "checklist_inspection",
  "entityId": "8f1...",
  "action": "finalized",
  "actorId": "usr_...",
  "actorName": "Supervisor",
  "beforeJson": null,
  "afterJson": { "score": 78.5 },
  "ip": "203.0.113.10",
  "userAgent": "...",
  "occurredAt": "2026-11-27T12:00:00Z"
}
```

Nunca registrar senhas, tokens, CPF completo ou conteúdo sensível em `beforeJson`/`afterJson`.

---

## 11. Notificações

### 11.1 Eventos mínimos

| Evento | Destinatário | Canal |
|---|---|---|
| Comunicado publicado | Público-alvo | In-app + push/e-mail |
| Comunicado crítico não lido | Pendentes | E-mail/push após X horas |
| Checklist atribuído | Supervisor | In-app + push |
| Plano de ação aberto | Unidade | In-app + e-mail |
| Plano vencendo | Responsável | In-app + e-mail |
| Insumo aprovado/rejeitado | Unidade | In-app |
| Insumo expedido | Unidade | In-app + e-mail |
| Documento vencendo | Responsável | In-app + e-mail |
| Treinamento atribuído/vencendo | Colaborador | In-app + e-mail |
| Tarefa de implantação atrasada | Responsável | In-app + e-mail |
| NPS detrator | Unidade | In-app + e-mail |
| Termo LGPD pendente | Usuário | In-app + bloqueio |

### 11.2 Implementação

**Fase 1 (in-app):**

- Tabela `notifications`.
- Endpoint `GET /api/notifications`, `POST /api/notifications/:id/read`.
- Sino no header com badge.
- Página de notificações.

**Fase 2 (Web Push):**

- Service worker.
- VAPID keys.
- `PushSubscription` por usuário.
- Envio com `web-push`.

**Fase 3 (Capacitor/FCM):**

- `@capacitor/push-notifications`.
- Tokens em `device_tokens`.
- Deep link para a tela do evento.
- Android channel “Mega 12”.

---

## 12. Roadmap de implementação

### Fase 0 — Fundação (1 sprint)

- [ ] Criar permissões `franchise:*` no catálogo.
- [ ] Trocar `canAccessTab` para respeitar permissões.
- [ ] Criar `franchise_audit_log`.
- [ ] Criar `files` + `fileStorage` (disco local com abstração para S3).
- [ ] Criar `notifications` + central in-app.
- [ ] Criar componentes compartilhados (`FranchisePageHeader`, `KpiCard`, `StatusBadge`, `EmptyState`, `DataTable`).
- [ ] Padronizar validação e erros.
- [ ] Adicionar rate limiting e CORS allowlist.
- [ ] Testes de fumaça.

**Critério de saída:** menu acessível por permissão; upload e notificações funcionando; auditoria gravando.

### Fase 1 — Unidades + Pessoas e Docs (2 sprints)

- [ ] Migrações `unit_profiles`, `user_units`, `people`, `documents`, `document_versions`.
- [ ] CRUD de unidades.
- [ ] CRUD de pessoas.
- [ ] Upload/download de documentos com ACL.
- [ ] Alertas de vencimento.
- [ ] Telas com busca, filtros e detalhe 360°.
- [ ] Testes de API e UI.

**Critério de saída:** uma unidade real cadastrada, pessoas vinculadas e documentos publicados com permissão.

### Fase 2 — Comunicados + Agenda (1–2 sprints)

- [ ] Evoluir comunicados (categoria, prioridade, anexos, confirmação).
- [ ] Feed por unidade.
- [ ] Métricas de leitura.
- [ ] Notificações in-app.
- [ ] Agenda com convites, lembretes e visão unificada.
- [ ] Exportação `.ics`.

**Critério de saída:** comunicado crítico publicado, lido e confirmado; evento de agenda criado e notificado.

### Fase 3 — Checklists + Planos de Ação + Analytics (3 sprints)

- [ ] Templates, seções, perguntas e pesos.
- [ ] Vistoria online/offline.
- [ ] Evidências fotográficas.
- [ ] Score e finalização.
- [ ] Planos de ação 5W2H.
- [ ] Painel Analytics de checklists.
- [ ] Testes de sincronização e conflito.

**Critério de saída:** vistoria completa offline, sincronizada, com plano de ação e indicador no painel.

### Fase 4 — Compras de Insumos + Implantação (2–3 sprints)

- [ ] Catálogo de insumos.
- [ ] Requisição, aprovação, separação e recebimento.
- [ ] Estoque e movimentos.
- [ ] Projetos de implantação, tarefas e Gantt.
- [ ] Evidências e go-live.
- [ ] Notificações.

**Critério de saída:** requisição completa do pedido à entrega; projeto de implantação com marcos.

### Fase 5 — Universidade + Jornada + NES + NPS + LGPD (3–4 sprints)

- [ ] Cursos, aulas, quizzes e certificados.
- [ ] Jornada com check-in/check-out.
- [ ] NES anônimo.
- [ ] NPS com follow-up.
- [ ] Termos LGPD com aceite e evidências.
- [ ] Relatórios e integrações.

**Critério de saída:** curso concluído com certificado; NPS respondido; termo aceito com evidência.

---

## 13. Backlog priorizado (histórias)

| ID | História | Módulo | Critério de aceite |
|---|---|---|---|
| F0-01 | Criar permissões de franquias | Fundação | Menu e APIs respeitam permissões |
| F0-02 | Auditoria append-only | Fundação | Toda mutação crítica gera log |
| F0-03 | Upload seguro | Fundação | Allowlist, limite, hash e download autorizado |
| F0-04 | Central de notificações | Fundação | Sino, lista, marcar como lida |
| F1-01 | CRUD de unidades | Unidades | Criar/editar/ativar com validação e auditoria |
| F1-02 | Vínculo usuário-unidade | Unidades | Usuário vê apenas unidades vinculadas |
| F1-03 | CRUD de pessoas | Pessoas | CPF validado e mascarado |
| F1-04 | Documentos com versão | Docs | Nova versão preserva histórico |
| F1-05 | Alerta de vencimento | Docs | Notificação 30/15/7 dias |
| F2-01 | Confirmação de leitura | Comunicados | Relatório de pendentes por unidade |
| F2-02 | Comunicado crítico | Comunicados | Push/e-mail e confirmação obrigatória |
| F2-03 | Agenda com convites | Agenda | Aceite/recusa e lembrete |
| F3-01 | Editor de template | Checklists | Seções, perguntas, pesos e críticas |
| F3-02 | Vistoria offline | Checklists | Respostas preservadas sem rede |
| F3-03 | Finalização com score | Checklists | Score e geolocalização registrados |
| F3-04 | Plano de ação automático | Checklists | Não conformidade crítica abre plano |
| F3-05 | Painel de checklists | Analytics | Score por unidade e evolução |
| F4-01 | Requisição de insumos | Compras | Fluxo completo até recebimento |
| F4-02 | Projeto de implantação | Implantação | Tarefas, marcos e go-live |
| F5-01 | Curso com quiz | Universidade | Conclusão e certificado |
| F5-02 | Check-in de jornada | Jornada | Geolocalização e tempo em loja |
| F5-03 | NES anônimo | NES | Respostas sem vínculo com usuário |
| F5-04 | NPS com follow-up | NPS | Detrator gera tarefa de recuperação |
| F5-05 | Aceite LGPD | LGPD | Evidência com hash, IP e data |

---

## 14. Testes e qualidade

### 14.1 Backend

- Testes de serviço com banco em memória/temporário.
- Testes de contrato para cada endpoint.
- Testes de autorização (perfil A não acessa dado de B).
- Testes de validação (payload inválido → 400).
- Testes de idempotência (mesma chave → mesmo resultado).
- Testes de concorrência (versão otimista).
- Testes de upload (MIME, tamanho, nome).
- Testes de auditoria.

Ferramentas sugeridas: `node:test` + `supertest` (sem nova dependência pesada) ou Jest.

### 14.2 Frontend

- Testes de componentes críticos (formulários, tabelas, modais).
- Testes de acessibilidade (axe).
- Testes E2E com Playwright para fluxos principais:
  - publicar comunicado e confirmar leitura;
  - realizar checklist e gerar plano;
  - solicitar insumo e aprovar;
  - aceitar termo LGPD.
- Testes de responsividade (360 px, 768 px, 1280 px).
- Testes de teclado.

### 14.3 Critérios de qualidade

- `npm run build` sem erros.
- `oxlint` sem erros.
- Nenhum `console.log` de PII.
- Nenhuma senha/token em código.
- Cobertura mínima acordada para serviços críticos.
- Migrações idempotentes testadas em banco existente.

---

## 15. Decisões em aberto (perguntas para o usuário)

1. **Prioridade:** começamos por Unidades + Pessoas/Docs, ou por Checklists?
2. **Perfis:** quais papéis reais existem na Mega 12? Supervisor, gerente, RH, DPO, colaborador?
3. **NES:** qual o significado e o objetivo exato? Pesquisa de clima? Saúde da loja? Anônima?
4. **NPS:** é NPS de cliente da loja? Como os convites são enviados (QR, WhatsApp, link)?
5. **Universidade:** vídeos próprios ou links (YouTube/Vimeo)? Certificados são necessários?
6. **Compras de insumos:** existe catálogo fechado? Quem aprova? Há limite por unidade?
7. **Implantação:** existe um template padrão de abertura? Quais fases?
8. **Jornada:** a geolocalização é obrigatória? Há política de privacidade assinada?
9. **Termos LGPD:** há texto jurídico e DPO definidos? Quais termos são obrigatórios?
10. **Notificações:** preferem Web Push, e-mail ou FCM via app Capacitor?
11. **Armazenamento:** disco local no servidor atual ou S3/MinIO?
12. **Migração:** haverá exportação de dados do SULTS? Em que formato?
13. **Acesso autenticado:** você consegue fornecer capturas de tela/vídeos dos 13 módulos para refinarmos a UX?
14. **Mobile:** o app continua como web responsivo + Capacitor, ou haverá app nativo separado?
15. **Multi-unidade:** um usuário pode acessar mais de uma loja?

> Sem essas respostas, a próxima IA deve implementar o **núcleo genérico** (Fases 0–2) e deixar os módulos específicos atrás de feature flags/permissões.

---

## 16. Protocolo para capturar a referência visual do SULTS

Como o APK não contém a UI, a referência visual precisa vir do sistema em execução. Para manter segurança e conformidade:

1. **Não compartilhe sua senha.** Use o próprio navegador/dispositivo.
2. Para cada módulo, capture:
   - tela de listagem (filtros, colunas, ações);
   - tela de detalhe;
   - formulário de criação/edição;
   - estado vazio;
   - mensagem de erro;
   - versão mobile (se usar).
3. Grave um vídeo curto (30–60 s) navegando no fluxo principal.
4. Anote regras que não aparecem na tela (quem aprova, prazos, notificações).
5. Sanitize qualquer captura que contenha dados pessoais, tokens ou informações sensíveis.
6. Não exporte HAR/network com cookies/tokens; se precisar, remova os headers sensíveis.
7. Entregue as capturas em `REA/referencia-visual/` (fora do Git, se contiver dados).

Com esse material, a próxima IA consegue reproduzir a **experiência** (não o código) com a identidade Mega 12.

---

## 17. Instalação e uso do Craft Anything (ferramenta auxiliar)

### 17.1 O que foi instalado

| Item | Caminho |
|---|---|
| Projeto clonado | `REA/craft-anything/` |
| Binário portátil (GUI) | `REA/craft-anything-bin/craft-anything-0.6.1-windows-x64-portable/craft-anything.exe` |
| Rust | `%USERPROFILE%\.cargo\bin` (rustc 1.100.0) |
| Alvo de build da CLI | `REA/craft-anything-target/` |
| XAPK extraído | `REA/extracted/` |
| Análise | `REA/analysis/` |
| jadx | `REA/jadx/` |

### 17.2 Build da CLI (se ainda não estiver pronta)

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
$env:CARGO_TARGET_DIR="C:\Users\Josue\Documents\App Rafael\REA\craft-anything-target"
Set-Location "C:\Users\Josue\Documents\App Rafael\REA\craft-anything"
cargo build --release -p craft-anything-cli
```

Executável esperado:

```text
REA\craft-anything-target\release\craft-anything-cli.exe
```

Verificação:

```powershell
REA\craft-anything-target\release\craft-anything-cli.exe doctor
```

### 17.3 O que o Craft Anything pode (e não pode) fazer aqui

**Pode:**

- inspecionar o APK (pacote, componentes, recursos, Flutter, snapshot Dart);
- listar canais, strings e metadados;
- ajudar a documentar a casca nativa.

**Não pode:**

- extrair o backend do SULTS;
- acessar o sistema autenticado sem credenciais;
- reconstruir regras de negócio que não estão no APK;
- substituir a especificação funcional e a validação com o usuário.

---

## 18. Anexos

### 18.1 Arquivos de evidência gerados

```text
REA/analysis/
  AndroidManifest.xml.txt
  resources.txt
  libapp_strings.txt
  endpoints.txt
  paths.txt
  app_clusters.txt
  app_region.txt
  sults-web-index.html
  web/
    pages_auth_auth.min.js
    assets_jquery.min.js
    manifest.json
    mega12_pwa_manifest.json
    app_headers.txt
    app_root_ua.html
    unsupported.html
  manifest.py
  dex_strings.py
  extract.py
  clusters.py
  app_region.py
```

### 18.2 Comandos úteis

```powershell
# Hash do XAPK
Get-FileHash "REA\SULTS_3.0.13_APKPure.xapk" -Algorithm SHA256

# Manifesto
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\aapt2.exe" `
  dump xmltree "REA\extracted\br.com.sults.app.apk" --file AndroidManifest.xml

# Strings do snapshot Dart
python "REA\analysis\extract.py"

# Abrir o app (GUI)
"REA\craft-anything-bin\craft-anything-0.6.1-windows-x64-portable\craft-anything.exe"
```

### 18.3 Mapa SULTS → Mega 12

| Módulo SULTS | Módulo Mega 12 | Tabelas principais | Status |
|---|---|---|---|
| Unidades | `franchise_units` | `stores`, `unit_profiles`, `user_units` | Placeholder |
| Mega 12 Pessoas e Docs | `franchise_documents` | `people`, `documents`, `document_versions`, `files` | Placeholder |
| Compras de Insumos | `franchise_purchases` | `supply_*` | Placeholder |
| Comunicados | `franchise_announcements` | `franchise_announcements`, `..._reads` | Parcial |
| Checklists | `franchise_checklists` | `checklist_*`, `action_plans` | Placeholder |
| Agenda | `franchise_agenda` | `agenda_events` | Placeholder |
| Universidade Corporativa | `franchise_university` | `lms_*` | Placeholder |
| Implantação de Unidades | `franchise_implementation` | `implantation_*` | Placeholder |
| Analytics | `franchise_analytics` | views/agregados | Placeholder |
| Jornada | `franchise_journey` | `journey_*` | Placeholder |
| NES | `franchise_nes` | `nes_*` | Placeholder |
| NPS | `franchise_nps` | `nps_*` | Placeholder |
| Termos LGPD | `franchise_lgpd` | `lgpd_*` | Placeholder |

### 18.4 Glossário

| Termo | Definição |
|---|---|
| Tenant | Cliente/marca do SULTS; cada um tem subdomínio |
| JSF | JavaServer Faces; framework server-side do SULTS |
| PrimeFaces | Biblioteca de componentes JSF |
| WebView | Componente Android que renderiza uma página web |
| Bridge | Canal de comunicação JavaScript ↔ código nativo |
| FCM | Firebase Cloud Messaging |
| VAPID | Chave de identificação para Web Push |
| RBAC | Controle de acesso baseado em papéis |
| LGPD | Lei Geral de Proteção de Dados |
| 5W2H | Método de plano de ação (o quê, por quê, onde, quem, quando, como, quanto) |
| NPS | Net Promoter Score (satisfação de cliente) |
| NES | Net Emotional Score (5 sentimentos por área) ou pesquisa interna de clima; definição a confirmar na decisão 1 da análise comparativa |
| eNPS | Employee Net Promoter Score |
| SLA | Acordo de nível de serviço / prazo |
| GED | Gestão eletrônica de documentos |

---

## 19. Instruções finais para a próxima IA

1. **Leia primeiro** este documento, a `docs/ANALISE_COMPARATIVA_MODULOS_MEGA12.md` e o estado atual do repositório (`git status`, `docs/DIAGNOSTICO_REVERSA_SULTS.md`, `RELATORIO_MODULOS_SULTS_VIDEO_BRYAN_2026-11-19.md`).
2. **Não copie** código, assets, textos ou identidade visual da plataforma de referência. **Não exiba o nome dela na UI**: o produto é 100% Mega 12.
3. **Não crie** um segundo backend, banco ou monorepo. Integre no sistema existente.
4. **Siga** os padrões atuais: Express + SQLite + React + Tailwind, services, repositories, RBAC, idempotência, auditoria.
5. **Migrações idempotentes** em `backend/src/config/database.js`.
6. **Valide tudo** no backend; nunca confie no cliente.
7. **Implemente por fases**; não tente entregar os 13 módulos de uma vez.
8. **Comece pela Fundação** (permissões, auditoria, arquivos, notificações, componentes).
9. **Depois Unidades + Pessoas/Docs**, pois são a base dos demais.
10. **Comunicados** já existe: evolua em vez de reescrever.
11. **Checklists** é o módulo de maior valor operacional; trate offline e evidências com cuidado.
12. **Teste** autorização, validação, idempotência e concorrência.
13. **Documente** decisões e atualize este arquivo.
14. **Pergunte** antes de assumir regras de negócio não confirmadas.
15. **Mantenha a identidade Mega 12** em todas as telas, sem qualquer menção à marca de referência no produto, nos assets ou nos textos enviados ao usuário.

---

> **Conclusão:** o APK do SULTS não é a fonte do sistema; é a prova de como o SULTS entrega a experiência (WebView + bridges + push). A integração no Mega 12 deve ser feita por **especificação funcional própria + backend próprio + frontend próprio**, usando o SULTS apenas como referência de comportamento. Este documento é o ponto de partida para essa construção.
