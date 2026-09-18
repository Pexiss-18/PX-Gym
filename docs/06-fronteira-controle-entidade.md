# 6 · Classes de Fronteira, Controle e Entidade

[← Estados](05-estados.md) · [Índice](README.md) · [Próximo: Sequência →](07-sequencia.md)

Reclassificação que vira, na [§10](10-implementacao.md), as camadas da Clean Architecture. Em app mobile a fronteira tem dois lados: a **UI** (telas Expo Router) e os **recursos nativos/externos** (GPS, câmera, rede, Supabase, Overpass) — ambos são ponto de contato com algo fora do domínio.

| Estereótipo | No Px GYM | Onde mora |
|---|---|---|
| **«boundary-ui»** | Telas `…Screen` e hooks de leitura (`useLoadProgression`, `usePendingSync`, `useProgressPhotos`, `useAssessments`…) | `apps/mobile/src/app`, `apps/mobile/src/lib/use-*.ts` |
| **«boundary-nativo/externo»** | Interface (port) no domínio + implementação no adapter: `LocationGateway`/`ExpoLocationGateway`, `ConnectivityStatus`/`netInfoConnectivity`, `AuthGateway`/`SupabaseAuthGateway`, `WorkoutSyncGateway`/`SupabaseWorkoutSyncGateway`, `ProgressPhotoUploader`/`SupabaseProgressPhotoUploader`, `NearbyGymsFinder`/`OverpassGymFinder` | ports em `packages/core/src/ports`; adapters em `apps/mobile/src/lib` e `packages/db/src` |
| **«boundary-saída» (persistência)** | `SetLogRepository`/`DrizzleSetLogRepository`, `ProgressPhotoRepository`/`DrizzleProgressPhotoRepository`, `AssessmentRepository`/`SupabaseAssessmentRepository`, `NutritionPlanRepository`/`SupabaseNutritionPlanRepository` | ports no core; adapters em `apps/mobile/src/db` e `packages/db/src/repositories` |
| **«control»** | `…UseCase` — orquestra, não guarda estado, conhece só ports | `packages/core/src/use-cases` |
| **«entity»** | Classes da [§3](03-classes-e-dados.md) | `packages/core/src/entities`, `value-objects` |

Regra: 1 boundary de UI por tela; 1 gateway por recurso externo; 1 control por caso de uso; nenhum control importa `expo-*`, `drizzle-orm` ou `@supabase/supabase-js` (verificado: `packages/core` não importa nenhum pacote externo).

## Diagramas de robustez

### UC07 Registrar série

```mermaid
flowchart LR
    Ator((Praticante))
    B["ExercicioScreen «boundary-ui»"]
    H["useLoadProgression «boundary-ui»"]
    C["RegisterSetUseCase «control»"]
    C2["SyncPendingSetLogsUseCase «control»"]
    E1["SetLog «entity»"]
    E2["Load «entity/VO»"]
    R["SetLogRepository «boundary-saída · SQLite»"]
    Clock["Clock / IdGenerator «boundary-sistema»"]
    Net["ConnectivityStatus «boundary-nativo · NetInfo»"]
    G["WorkoutSyncGateway «boundary-externo · Supabase»"]

    Ator --> B
    B --> C
    B --> H
    H --> R
    C --> E1
    C --> E2
    C --> R
    C --> Clock
    B -. sync oportunista .-> C2
    C2 --> Net
    C2 --> R
    C2 --> G
```

### UC17 Encontrar academias por perto

```mermaid
flowchart LR
    Ator((Praticante))
    B["AcademiasScreen «boundary-ui»"]
    C["FindNearbyGymsUseCase «control»"]
    Loc["LocationGateway «boundary-nativo · expo-location»"]
    F["NearbyGymsFinder «boundary-externo · Overpass»"]
    E1["GeoPoint «entity/VO»"]
    E2["NearbyGym «entity»"]

    Ator --> B
    B --> C
    C --> Loc
    C --> F
    C --> E1
    C --> E2
```

### UC01 Entrar

```mermaid
flowchart LR
    Ator((Visitante))
    B["LoginScreen «boundary-ui»"]
    Ctx["AuthProvider «composition root»"]
    C["SignInUseCase «control»"]
    E["Email «entity/VO»"]
    A["AuthGateway «boundary-externo · Supabase Auth»"]

    Ator --> B
    B --> Ctx
    Ctx --> C
    C --> E
    C --> A
```

## Tabela de mapeamento por caso de uso

| Caso de uso | Boundary (UI) | Boundary (nativo/externo/saída) | Control | Entities |
|---|---|---|---|---|
| UC01 Entrar | `LoginScreen` | `AuthGateway` → `SupabaseAuthGateway` | `SignInUseCase` | `Email` |
| UC02 Criar conta | `CadastroScreen` | `AuthGateway` → `SupabaseAuthGateway` | `SignUpUseCase` | `Email` |
| UC03 Sair da conta | `ConfiguracoesScreen`, `PerfilScreen` | `AuthGateway.signOut` | — (delegação direta, sem regra de negócio) | — |
| UC04 Ver painel do dia | `InicioScreen` + `useStreakDays`, `useWeekActivity`, `useBodyMetrics` | `SetLogRepository` (SQLite), `AssessmentRepository` (Supabase) | serviços `computeStreakDays`, `computeWeekActivity`, `buildBodyHistory` | `SetLog`, `BodyAssessment`, `Workout` |
| UC05 Executar treino do dia | `TreinoScreen` + `useTodayDoneByExercise` | `SetLogRepository` | `Workout.progress()` | `Workout`, `Exercise`, `SetLog` |
| UC06 Abrir exercício por QR | `ScannerScreen` | `CameraView` (expo-camera, componente de UI) | `parseExerciseId` (na tela) | `Exercise` |
| UC07 Registrar série | `ExercicioScreen` | `SetLogRepository`, `Clock`, `IdGenerator` | `RegisterSetUseCase` | `SetLog`, `Load` |
| UC08 Calcular progressão | `LoadProgressionCard` + `useLoadProgression` | `SetLogRepository` | `computeLoadProgression` | `SetLog` |
| UC10 Desmarcar série | `ExercicioScreen` | `SetLogRepository` | `UnregisterSetUseCase` | `SetLog` |
| UC11/UC12 Registrar foto | `CameraScreen` | `CameraView`, `persistCapture` (expo-file-system), `ProgressPhotoRepository`, `ProgressPhotoUploader`, `ConnectivityStatus` | `SaveProgressPhotoUseCase` | `ProgressPhoto` |
| UC13 Ver galeria | `FotosScreen` + `useProgressPhotos` | `ProgressPhotoRepository` (SQLite) | — (leitura) | `ProgressPhoto` |
| UC14 Composição corporal | `ProgressoScreen` + `useAssessments` | `AssessmentRepository` | `buildBodyHistory`, `historyDelta`, `diffMeasurements` | `BodyAssessment` |
| UC15 Avaliações | `AvaliacoesScreen` + `useAssessments` | `AssessmentRepository` | — (leitura) | `BodyAssessment` |
| UC16 Metas nutricionais | `NutricaoScreen` + `useLatestPlan` | `NutritionPlanRepository` | — (leitura) | `NutritionPlan` |
| UC17/UC18 Academias | `AcademiasScreen` | `LocationGateway` → `ExpoLocationGateway`, `NearbyGymsFinder` → `OverpassGymFinder` | `FindNearbyGymsUseCase` | `GeoPoint`, `Gym`, `NearbyGym` |
| UC19 Sincronizar agora | `ConfiguracoesScreen` + `usePendingSync` | como UC20 | como UC20 | como UC20 |
| UC20–UC22 Sincronizar pendências | (nenhuma — hook `useWorkoutSync` no layout da área logada) | `WorkoutSyncGateway` → `SupabaseWorkoutSyncGateway`, `ProgressPhotoUploader`, `ConnectivityStatus` → NetInfo | `SyncPendingSetLogsUseCase`, `SyncPendingPhotosUseCase` | `SetLog`, `ProgressPhoto` |

## Desvios conscientes

- **Câmera como componente, não gateway.** A skill sugere `CameraGateway`. No React Native a captura depende do preview (`<CameraView ref>`), que é UI; por isso a câmera fica na tela e o que vira port é o que vem depois dela — persistir o arquivo e enviar (`ProgressPhotoUploader`). Um `CameraGateway` só faria sentido com captura sem preview (ex.: `expo-image-picker`).
- **UC06 sem use case.** `parseExerciseId` (regex + busca no treino do dia) está na tela. Quando o treino deixar de ser mock, a validação deve ir para um `OpenExerciseByQrUseCase` que consulte o `WorkoutRepository`.
- **UC03 sem use case.** Sair não tem regra; a tela chama `AuthGateway.signOut` via `AuthProvider`.
