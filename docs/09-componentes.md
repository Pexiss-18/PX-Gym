# 9 · Diagrama de Componentes

[← Atividades](08-atividades.md) · [Índice](README.md) · [Próximo: Implementação →](10-implementacao.md)

Visão estrutural do monorepo — a materialização das camadas da [§10](10-implementacao.md). Setas apontam de quem depende para quem é dependido.

```mermaid
flowchart TB
    subgraph UI["UI · Expo Router (apps/mobile/src/app, components, lib/use-*)"]
        Screens["Telas: Exercicio, Academias, Camera, Fotos, Configuracoes, Login…"]
        Hooks["Hooks de leitura: useLoadProgression, usePendingSync, useProgressPhotos, useAssessments"]
        SyncHook["useWorkoutSync (Sistema de Sincronização)"]
    end

    subgraph Roots["Composition roots (apps/mobile/src/lib)"]
        WRoot["workout.ts"]
        PRoot["photos.ts"]
        GRoot["gyms.ts"]
        ARoot["auth-context.tsx"]
    end

    subgraph Core["@px/core · Domain + Application (packages/core)"]
        UseCases["Use cases: RegisterSet, UnregisterSet, SyncPendingSetLogs, SaveProgressPhoto, SyncPendingPhotos, FindNearbyGyms, SignIn, SignUp"]
        Entities["Entities e VOs: SetLog, Load, ProgressPhoto, Workout, BodyAssessment, NutritionPlan, GeoPoint, Email"]
        Services["Serviços: streak, load-progression, week-activity, body-history, measurements"]
        Ports[["Ports: SetLogRepository, ProgressPhotoRepository, WorkoutSyncGateway, ProgressPhotoUploader, LocationGateway, NearbyGymsFinder, AuthGateway, ConnectivityStatus, Clock, IdGenerator"]]
    end

    subgraph MobileAdapters["Adapters do mobile (apps/mobile/src/db, src/lib)"]
        DrizzleRepos["DrizzleSetLogRepository, DrizzleProgressPhotoRepository"]
        LocImpl["ExpoLocationGateway"]
        NetImpl["netInfoConnectivity, systemClock, cryptoIds"]
        UpImpl["SupabaseProgressPhotoUploader, persistCapture"]
        OsmImpl["OverpassGymFinder (GooglePlacesGymFinder desligado)"]
    end

    subgraph DbAdapters["@px/db · Adapters Supabase (packages/db)"]
        SyncImpl["SupabaseWorkoutSyncGateway"]
        AuthImpl["SupabaseAuthGateway"]
        RemoteRepos["SupabaseAssessmentRepository, SupabaseNutritionPlanRepository"]
        Client["createPxSupabaseClient"]
    end

    subgraph Infra["Frameworks & Drivers"]
        SQLite[("expo-sqlite + drizzle-orm")]
        ExpoLoc["expo-location"]
        ExpoCam["expo-camera"]
        ExpoFS["expo-file-system"]
        NetInfo["@react-native-community/netinfo"]
        SupaJS["@supabase/supabase-js + LargeSecureStore (expo-secure-store)"]
        Overpass["Overpass API (HTTP)"]
    end

    Screens --> Roots
    Screens --> Hooks
    Screens --> ExpoCam
    SyncHook --> Roots
    Hooks --> SQLite
    Hooks --> RemoteRepos
    Roots --> UseCases
    Roots --> MobileAdapters
    Roots --> DbAdapters
    UseCases --> Entities
    UseCases --> Services
    UseCases --> Ports

    DrizzleRepos -. implementa .-> Ports
    LocImpl -. implementa .-> Ports
    NetImpl -. implementa .-> Ports
    UpImpl -. implementa .-> Ports
    OsmImpl -. implementa .-> Ports
    SyncImpl -. implementa .-> Ports
    AuthImpl -. implementa .-> Ports

    DrizzleRepos --> SQLite
    LocImpl --> ExpoLoc
    NetImpl --> NetInfo
    UpImpl --> ExpoFS
    UpImpl --> SupaJS
    OsmImpl --> Overpass
    SyncImpl --> Client
    AuthImpl --> Client
    RemoteRepos --> Client
    Client --> SupaJS
```

## Regras de leitura (e como são garantidas)

| Regra | Situação | Como conferir |
|---|---|---|
| `Core` não tem seta saindo para `Adapters`/`Infra` | **Cumprida** — `packages/core/src` não importa nenhum pacote externo | `grep -rhoE 'from "[^".][^"]*"' packages/core/src` não retorna nada |
| `expo-*`, `drizzle-orm` e `supabase-js` só em adapters/infra | **Cumprida**, com duas exceções justificadas: `camera.tsx`/`scanner.tsx` usam `CameraView` (componente de UI), e o `_layout.tsx` raiz aplica as migrations no boot | `grep -rlE 'from "(drizzle-orm|@/db)' apps/mobile/src/app` → só `_layout.tsx` |
| Telas não fazem SQL nem chamam o Supabase | **Cumprida** — leituras reativas moram em `lib/use-*.ts` e leituras remotas em `lib/remote.ts` | idem |
| O "onde SQLite e Supabase se encontram" é um lugar só | **Cumprida** — os composition roots de `apps/mobile/src/lib` | leitura de `workout.ts`, `photos.ts` |

## Detalhes por plataforma

- **Mapa**: `gym-map.tsx` (iOS, Apple Maps via `react-native-maps`, sem chave) e `gym-map.android.tsx` (MapLibre + tiles raster do OSM). O Metro escolhe pela extensão — nenhum `if (Platform.OS)` na tela.
- **Web (`apps/web`)**: fala com o mesmo projeto Supabase, mas **não** importa nenhum pacote `@px/*` hoje — tem cliente, tipos e regras próprios (domínio duplicado; ver lacunas).
