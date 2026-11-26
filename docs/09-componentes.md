# 9 · Diagrama de Componentes

[← Atividades](08-atividades.md) · [Índice](README.md) · [Próximo: Implementação →](10-implementacao.md)

Esta é a visão estrutural do monorepo, a materialização das camadas da [§10](10-implementacao.md). As setas apontam de quem depende para quem é dependido.

## 9.1 O aplicativo mobile

```mermaid
flowchart TB
    subgraph UI["UI · Expo Router (apps/mobile/src/app, components, adapters/screens)"]
        Screens["Telas: Início, Treino, Exercício, Nutrição, Avaliações, Nova avaliação, Perfil de treino, Fotos, Câmera, Scanner, Academias, Configurações, Relatórios, Login"]
        Hooks["Hooks de leitura: useTodayWorkout, useLoadProgression, usePendingSync, useProgressPhotos, useAssessments, useLatestPlan, useRelatorio"]
        SyncHook["useWorkoutSync (Sistema de Sincronização)"]
    end

    subgraph Roots["Composition roots"]
        WRoot["lib/workout.ts · treino"]
        PlRoot["lib/plans.ts · perfil e planos"]
        RRoot["lib/remote.ts · avaliações e dieta"]
        PRoot["lib/photos.ts · fotos"]
        GRoot["lib/gyms.ts · academias"]
        CRoot["adapters/composicao.ts + instancia.ts · sessão e relatórios"]
    end

    subgraph Core["@px/core · domain + application (packages/core)"]
        UseCases["Use cases: RegisterSet, SyncPendingSetLogs, GenerateWorkoutPlan, LoadActiveWorkoutPlan, GenerateDietPlan, SaveTrainingProfile, RegisterManualAssessment, ReadAssessmentPdf, Save/Sync/Delete/RestoreProgressPhoto, FindNearbyGyms, AutenticarUsuario, relatório do ciclo"]
        Entities["Entities e VOs: SetLog, Load, WorkoutPlan, TrainingProfile, BodyAssessment, NutritionPlan, ProgressPhoto, Gym, Sessao, CicloAvaliacao, Criterio, Assinatura"]
        Services["Serviços: treino-do-dia, avaliacao-nova, enquadramento-foto, load-progression, streak, body-history, regras do ciclo"]
        Ports[["Ports (domain/contracts): repositórios, gateways, Clock, IdGenerator, ConnectivityStatus"]]
    end

    subgraph MobileAdapters["Adapters do mobile (apps/mobile/src/db, adapters, lib)"]
        DrizzleRepos["DrizzleSetLogRepository, DrizzleProgressPhotoRepository, DrizzleWorkoutPlanCache"]
        NativeGw["LocationGatewayExpo, CameraGatewayExpo, SessionStorageSecureStore, NearbyGymsCacheAsyncStorage"]
        NetImpl["netInfoConnectivity, systemClock, cryptoIds"]
        PhotoCloud["R2ProgressPhotoCloud, persistCapture"]
        GymFinders["FirstAvailableGymFinder: OverpassGymFinder, NominatimGymFinder"]
        Memoria["Repositórios em memória e gateways simulados (relatório do ciclo)"]
    end

    subgraph DbAdapters["@px/db · adapters Supabase (packages/db)"]
        SyncImpl["SupabaseWorkoutSyncGateway"]
        AuthImpl["SupabaseAuthGateway"]
        RemoteRepos["SupabaseAssessmentRepository, SupabaseNutritionPlanRepository, SupabaseTrainingProfileRepository, SupabaseWorkoutPlanRepository"]
        FnGw["SupabasePlanGenerationGateway, SupabaseAssessmentPdfReader, SupabaseProgressPhotoStore"]
        Client["createPxSupabaseClient"]
    end

    subgraph Infra["Frameworks & Drivers"]
        SQLite[("expo-sqlite + drizzle-orm")]
        Expo["expo-location, expo-camera, expo-image-manipulator, expo-file-system, expo-document-picker, expo-secure-store"]
        NetInfo["@react-native-community/netinfo"]
        SupaJS["@supabase/supabase-js + LargeSecureStore"]
        OSM["Overpass e Nominatim (HTTP)"]
    end

    Screens --> Roots
    Screens --> Hooks
    SyncHook --> Roots
    Hooks --> Roots
    Roots --> UseCases
    Roots --> MobileAdapters
    Roots --> DbAdapters
    UseCases --> Entities
    UseCases --> Services
    UseCases --> Ports

    DrizzleRepos -. implementa .-> Ports
    NativeGw -. implementa .-> Ports
    NetImpl -. implementa .-> Ports
    PhotoCloud -. implementa .-> Ports
    GymFinders -. implementa .-> Ports
    Memoria -. implementa .-> Ports
    SyncImpl -. implementa .-> Ports
    AuthImpl -. implementa .-> Ports
    RemoteRepos -. implementa .-> Ports
    FnGw -. implementa .-> Ports

    DrizzleRepos --> SQLite
    NativeGw --> Expo
    NetImpl --> NetInfo
    PhotoCloud --> Expo
    PhotoCloud --> FnGw
    GymFinders --> OSM
    SyncImpl --> Client
    AuthImpl --> Client
    RemoteRepos --> Client
    FnGw --> Client
    Client --> SupaJS
```

## 9.2 O servidor

```mermaid
flowchart LR
    subgraph App["App mobile"]
        Gw["@px/db: SupabasePlanGenerationGateway, SupabaseAssessmentPdfReader, SupabaseProgressPhotoStore"]
        Upload["R2ProgressPhotoCloud (PUT/GET direto no R2)"]
    end

    subgraph Supabase["Supabase"]
        subgraph Fn["Edge Functions (Deno)"]
            GP["generate-plan"]
            EA["extract-assessment"]
            PS["photo-storage"]
        end
        subgraph Shared["supabase/functions/_shared"]
            Plano["plano: acervo (25 artigos), catálogo (58 exercícios), esquema, prompt, regras, gerar-plano"]
            Aval["avaliacao: extrair"]
            IAp[["ia: ProvedorIA, gerarComReserva"]]
            Gem["ia/gemini.ts (Interactions API)"]
            Fotos["fotos: r2 (assinatura SigV4), alerta (ntfy)"]
        end
        PG[("Postgres + RLS + RPCs")]
        Auth["Auth (JWT)"]
        St[("Storage: assessments")]
    end

    Gemini["Google Gemini Flash-Lite"]
    R2[("Cloudflare R2: px-gym-fotos")]
    Ntfy["ntfy (administrador)"]

    Gw --> GP
    Gw --> EA
    Gw --> PS
    Gw --> St
    Upload --> R2
    GP --> Plano
    GP --> IAp
    EA --> Aval
    EA --> IAp
    EA --> St
    PS --> Fotos
    Gem -. implementa .-> IAp
    Gem --> Gemini
    Fotos --> R2
    Fotos --> Ntfy
    GP --> PG
    EA --> Auth
    GP --> Auth
    PS --> Auth
    PS --> PG
```

O desenho do servidor repete o do app em pequeno. `ProvedorIA` é o port da IA: `generate-plan` e `extract-assessment` só conhecem ele, e trocar de modelo ou de empresa é escrever outro adapter no lugar de `gemini.ts`. As regras (`regras.ts`) não importam o provedor, e os testes Deno as exercitam com um provedor falso. O Deno não importa o workspace `@px/core`, por isso os esquemas e o catálogo vivem em `_shared` e espelham os tipos do core. As faixas do perfil, por exemplo, estão nos três lugares (banco, função e caso de uso) com a mesma regra.

## Regras de leitura (e como são garantidas)

| Regra | Situação | Como conferir (da raiz) |
|---|---|---|
| `Core` não tem seta saindo para `Adapters`/`Infra` | **Cumprida**: `packages/core/src` não importa nenhum pacote externo | `grep -rhoE 'from "[^".][^"]*"' packages/core/src` não retorna nada |
| Telas não fazem SQL nem chamam o Supabase | **Cumprida**: leituras reativas moram em `lib/use-*.ts`, leituras remotas em `lib/remote.ts` e `lib/plans.ts` | `grep -rlE 'from "(drizzle-orm\|@/db)' apps/mobile/src/app` → só `_layout.tsx` (migrations no boot); `grep -rlE 'supabase\|@px/db' apps/mobile/src/app apps/mobile/src/adapters/screens` → nada |
| `expo-*` nas telas só onde é UI ou entrada do usuário | **Cumprida**, com exceções justificadas: `expo-camera` (preview `<CameraView>` na câmera e no scanner), `expo-document-picker` e `expo-file-system` (a Nova avaliação lê os bytes do PDF escolhido), `expo-haptics`, `expo-image`, `expo-constants` (versão) | `grep -rhoE 'from "expo-[a-z-]+"' apps/mobile/src/app \| sort \| uniq -c` |
| O "onde SQLite e Supabase se encontram" é um lugar só por assunto | **Cumprida**: os composition roots de `apps/mobile/src/lib` e `apps/mobile/src/adapters/composicao.ts` | leitura de `workout.ts`, `plans.ts`, `photos.ts` |
| Chaves de servidor fora do app | **Cumprida**: `GEMINI_API_KEY`, `R2_*`, `NTFY_TOPIC` e `service_role` só como *secrets* das Edge Functions | `grep -rn "GEMINI\|R2_\|service_role" apps/mobile/src` → nada |

## Detalhes por plataforma e por modo

- **Mapa**: `gym-map.tsx` (iOS, Apple Maps via `react-native-maps`, sem chave) e `gym-map.android.tsx` (MapLibre + tiles raster do OSM, carregado sob demanda para não derrubar o Expo Go). O Metro escolhe pela extensão, sem nenhum `if (Platform.OS)` na tela.
- **Modo mock** (`EXPO_PUBLIC_MODO_MOCK=1`, em `lib/modo.ts`): o SQLite e o cliente Supabase viram `desligadoNoMock` (um `Proxy` que lança ao uso), as migrations e o `useWorkoutSync` não rodam, o login é por `AuthGatewayStub` com contas de demonstração, e o GPS e as fotos são simulados. Na navegação ficam só Relatórios e Fotos; o resto sai pelo `Drawer.Protected`. O padrão é o modo real.
- **Web (`apps/web`)**: fala com o mesmo projeto Supabase, mas **não** importa nenhum pacote `@px/*` (tem cliente, tipos e regras próprios) e ainda usa o pipeline antigo de PDF → Claude, que depende de chave paga. Ver [lacunas](10-implementacao.md#lacunas-e-próximos-passos).
