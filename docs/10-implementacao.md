# 10 · Implementação: DDD, Clean Architecture e TDD

[← Componentes](09-componentes.md) · [Índice](README.md)

O documento das seções 1–9 é o insumo direto do código. A ordem de construção seguida no projeto — e a recomendada para qualquer feature nova — é **domínio → caso de uso → adapter → tela**, nunca começando pelo schema ou pela tela.

## DDD

### Aggregates

| Aggregate root | Entidades internas | Value objects | Repository | Gateways envolvidos |
|---|---|---|---|---|
| `SetLog` | — | `Load` (×2), `SyncStatus` | `SetLogRepository` | `WorkoutSyncGateway`, `ConnectivityStatus`, `Clock`, `IdGenerator` |
| `ProgressPhoto` | — | `UploadSyncStatus` | `ProgressPhotoRepository` | `ProgressPhotoUploader`, `ConnectivityStatus` |
| `Workout` | `Exercise` | `PlannedSet`, `WorkoutProgress` | `WorkoutRepository` (port sem implementação — treino ainda é mock) | — |
| `BodyAssessment` | — | `ExtractedAssessment`, `AssessmentMeasurement`, `Weight`, `BodyFatPct` | `AssessmentRepository` | — |
| `NutritionPlan` | — | `MacroTarget`, `MicroTarget`, `Macro` | `NutritionPlanRepository` | `NutritionPlanGenerator` (IA, usado pelo web) |
| `Usuario` (externo) | — | `Email` | — (identidade vive no Supabase Auth) | `AuthGateway` |
| `Gym` (read model) | — | `GeoPoint`, `Distance` | — (consulta descartável) | `NearbyGymsFinder`, `LocationGateway` |

Por que `SetLog` é raiz sozinho e não parte de um "Treino": uma série é registrada, sincronizada e apagada **individualmente**, offline, e cada uma tem id próprio. Um agregado maior obrigaria a regravar o treino inteiro a cada toque.

### Demais blocos

- **Value objects com validação na construção**: `Load.fromKg` (0–1000 kg, 2 casas, passo de 2,5 kg), `Weight`, `BodyFatPct`, `Macro`, `Distance`, `Duration`, `geoPoint` (lat ∈ [-90, 90], lng ∈ [-180, 180]) e `Email.parse` (normaliza e valida). Valor inválido lança `InvalidValueError` — nunca entra no domínio.
- **Domain services** (funções puras em `packages/core/src/services`): `computeStreakDays`, `computeWeekActivity`, `computeLoadProgression` (agrupa por dia, carga máxima, volume, recorde), `buildBodyHistory`/`historyDelta`, `diffMeasurements`/`measurementsFrom` (casa medidas por rótulo, tolerante a acento porque quem extrai é IA).
- **Gateways** (ports para recurso não persistente): `LocationGateway`, `ConnectivityStatus`, `AuthGateway`, `WorkoutSyncGateway`, `ProgressPhotoUploader`, `NearbyGymsFinder`, `NutritionPlanGenerator`, `Clock`, `IdGenerator`.
- **Erros de domínio**: `DomainError` → `InvalidValueError`, `BusinessRuleError`, `LocationUnavailableError`.
- **Linguagem ubíqua**: série, carga, carga anterior, progressão, descanso, sequência (streak), avaliação, plano. Nenhum `Manager`/`Helper`.

## Clean Architecture

### Mapeamento da estrutura da skill para o monorepo

A skill propõe `src/{domain,application,adapters,infra}` num app só. O Px GYM tem web + mobile compartilhando domínio, então as camadas viraram **pacotes**:

| Camada da skill | No Px GYM | Conteúdo |
|---|---|---|
| `domain/entities`, `value-objects` | `packages/core/src/entities`, `value-objects` | Entidades e VOs puros |
| `domain/repositories`, `domain/gateways` | `packages/core/src/ports/index.ts` | Todas as interfaces |
| `application/use-cases` | `packages/core/src/use-cases` | 10 casos de uso |
| (serviços de domínio) | `packages/core/src/services` | Cálculos puros |
| (fakes para teste) | `packages/core/src/testing/fakes.ts` | Implementações em memória dos ports |
| `adapters/screens` | `apps/mobile/src/app` (+ `components`) | Telas Expo Router |
| `adapters/repositories` (local) | `apps/mobile/src/db/*-repository.ts` | Drizzle/SQLite |
| `adapters/repositories` (remoto), `adapters/gateways/sync`, `auth` | `packages/db/src` | Supabase (compartilhável com o web) |
| `adapters/gateways/location`, conectividade | `apps/mobile/src/lib/location.ts`, `system.ts` | expo-location, NetInfo, expo-crypto |
| hooks de apresentação | `apps/mobile/src/lib/use-*.ts`, `remote.ts` | Leitura reativa/remota para as telas |
| composition roots | `apps/mobile/src/lib/{workout,photos,gyms}.ts`, `auth-context.tsx` | Onde use case encontra adapter |
| `infra/db` | `apps/mobile/src/db/{index,schema}.ts`, `apps/mobile/drizzle/` | Client SQLite + migrations |
| `infra/supabase` | `packages/db/src/client.ts`, `apps/mobile/src/lib/supabase.ts`, `supabase/migrations/` | Client, LargeSecureStore, schema remoto + RLS |
| `infra/sync/sync-engine.ts` | `apps/mobile/src/lib/use-workout-sync.ts` | Gatilhos NetInfo/AppState + trava de reentrada |
| `infra/sync/background-task.ts` | **não existe** | Nenhum RNF exige sync com o app fechado (ver lacunas) |

### Regra de dependência

Camada externa depende da interna, nunca o contrário. Checagem prática (rodar da raiz):

```bash
# domínio/aplicação não podem importar nada externo — saída esperada: vazia
grep -rhoE 'from "[^".][^"]*"' packages/core/src

# telas não podem fazer SQL — saída esperada: só o _layout.tsx (migrations no boot)
grep -rlE 'from "(drizzle-orm|@/db)' apps/mobile/src/app
```

## TDD

Ciclo red → green → refactor, de dentro para fora. Os testes rodam em Node puro — nenhum precisa de emulador, aparelho, rede ou projeto Supabase.

```bash
cd packages/core && npx jest     # domínio + casos de uso
cd packages/db   && npx jest     # adapters Supabase com client falso
cd apps/mobile   && npx jest     # repositórios Drizzle (SQLite real) + gateways com Expo mockado
cd apps/mobile   && npm run typecheck   # app + testes (tsconfig.test.json)
```

### Pirâmide atual — 157 testes

| Nível da skill | Onde | Arquivos (testes) | Técnica |
|---|---|---|---|
| **1. Domínio** | `packages/core/src/__tests__` | `value-objects` (21), `load-progression` (10), `streak` (8), `week-activity` (7), `body-metrics` (15), `auth` → parte `Email` | Objeto puro, zero mock |
| **2. Caso de uso** | `packages/core/src/__tests__` | `sync` (17), `find-nearby-gyms` (13), `auth` (16 no total), `register-set` (3), `generate-nutrition-plan` (3) | **Fakes em memória** dos ports (`InMemorySetLogs`, `FakeSyncGateway`, `FakeLocation`, `FakeConnectivity`, `FakeAuthGateway`…) |
| **3. Gateway/adapter isolado** | `apps/mobile/src/lib/__tests__`, `packages/db/src/__tests__` | `location` (10), `system` (5), `auth-gateway` (15), `workout-sync` (4) | `jest.mock('expo-location')`, `jest.mock('@react-native-community/netinfo')`; client Supabase falso; erros reais do `supabase-js` |
| **4. Repository contra SQLite real** | `apps/mobile/src/db/__tests__` | `set-log-repository` (7), `progress-photo-repository` (3) | `node:sqlite` em memória + **as mesmas migrations** de `apps/mobile/drizzle/` + driver `drizzle-orm/sqlite-proxy` |
| **5. Sync engine** | coberto nos níveis 2 e 3 | `sync.test.ts` (offline, erro, retry, idempotência, tombstones, parcial) + `workout-sync.test.ts` | — |
| **6. Componente/tela** | **não existe ainda** | — | Precisa de `jest-expo` + Testing Library (conflito de peer deps no SDK 57) |
| **7. E2E** | **não existe** | — | Candidato: Maestro no emulador Android |

Câmera e GPS nunca são exercitados de verdade em teste automatizado: o GPS entra por `ExpoLocationGateway` com `expo-location` mockado, e a câmera fica fora (validação manual no aparelho). O RNF de offline tem teste dedicado com conectividade falsa (`FakeConnectivity(false)`) nos casos de uso e com o NetInfo mockado no adapter (`isInternetReachable: null/false`).

## Rastreabilidade RF → caso de uso → teste

| RF | Caso de uso | Control / adapter | Teste de aceitação |
|---|---|---|---|
| RF01 | UC01 | `SignInUseCase`, `SupabaseAuthGateway` | `auth.test.ts` › SignInUseCase; `auth-gateway.test.ts` › *signIn sem rede não diz que a senha está errada* |
| RF02 | UC02 | `SignUpUseCase`, `SupabaseAuthGateway` | `auth.test.ts` › SignUpUseCase (curta, confirmação, e-mail em uso, *confirmation-sent*); `auth-gateway.test.ts` › *signUp sem sessão* |
| RF03 | UC03 | `SupabaseAuthGateway.signOut` | `auth-gateway.test.ts` › *signOut não explode sem rede* |
| RF04 | UC01 | `LargeSecureStore` | — manual (depende de Keychain/Keystore) |
| RF05 | UC04 | `computeStreakDays`, `computeWeekActivity`, `buildBodyHistory` | `streak.test.ts`, `week-activity.test.ts`, `body-metrics.test.ts` |
| RF06 | UC05 | `Workout.progress()` | — (treino mock; testar quando houver `WorkoutRepository` real) |
| RF07 | UC07 | `RegisterSetUseCase`, `DrizzleSetLogRepository` | `register-set.test.ts`; `set-log-repository.test.ts` › *save + byId* |
| RF08 | UC08 | `RegisterSetUseCase`, `lastLoadKgForExercise` | `register-set.test.ts`; `set-log-repository.test.ts` › *lastLoadKgForExercise* e *tombstone…* |
| RF09 | UC09/UC10 | estado da `ExercicioScreen` | — manual (sem teste de tela; bug real corrigido no commit `627313e`) |
| RF10 | UC10/UC21 | `UnregisterSetUseCase`, `SyncPendingSetLogsUseCase`, `deleteSetLogs` | `sync.test.ts` › UnregisterSetUseCase e *sync de tombstones*; `workout-sync.test.ts` › *delete filtra pelos ids E pelo dono* |
| RF11 | UC08 | `computeLoadProgression` | `load-progression.test.ts` |
| RF12 | UC06 | `parseExerciseId` (tela) | — (lógica na tela; ver desvios da §6) |
| RF13 | UC11/UC12 | `SaveProgressPhotoUseCase`, `DrizzleProgressPhotoRepository` | `sync.test.ts` › SaveProgressPhotoUseCase; `progress-photo-repository.test.ts` |
| RF14 | UC13 | `useProgressPhotos`, repositório | `progress-photo-repository.test.ts` › *listByUser* e *markUploaded* |
| RF15 | UC14 | `buildBodyHistory`, `diffMeasurements` | `body-metrics.test.ts` |
| RF16 | UC15 | `SupabaseAssessmentRepository` | — (sem teste de adapter ainda) |
| RF17 | UC16 | `SupabaseNutritionPlanRepository` | — (idem) |
| RF18 | UC17/UC18 | `FindNearbyGymsUseCase`, `ExpoLocationGateway` | `find-nearby-gyms.test.ts` (ranking, permissão, falhas); `location.test.ts` (fallback de GPS, bloqueio, coordenada inválida) |
| RF19 | UC20–UC22 | `SyncPendingSetLogsUseCase`, `SyncPendingPhotosUseCase`, `netInfoConnectivity` | `sync.test.ts`; `system.test.ts` |
| RF20 | UC19 | `SyncResult.error` × `offline`, `usePendingSync` | `sync.test.ts` › *falha no push devolve error (≠ offline)* |

## Melhorias aplicadas ao alinhar o app a este documento

Feitas junto com esta documentação, cada uma com teste:

1. **`LocationGateway` no domínio + `ExpoLocationGateway`.** A tela de Academias chamava `expo-location` direto e tinha o fallback de GPS dentro dela. Agora permissão, posição (com fallback) e busca são orquestradas pelo `FindNearbyGymsUseCase`, que devolve um resultado por estado. Ganho de UX: permissão **bloqueada** mostra "Abrir configurações" e a busca recomeça ao voltar ao app.
2. **`geoPoint()` validado.** Coordenada vinda do sensor passa por validação de faixa antes de entrar no domínio (o "Coordenada" da skill).
3. **`AuthGateway` + `SignInUseCase`/`SignUpUseCase` + `Email`.** A validação de senha saiu da tela de cadastro. Dois bugs corrigidos: (a) **sem rede o login dizia "E-mail ou senha inválidos"** — agora diz que o servidor não respondeu; (b) **cadastro com confirmação de e-mail deixava o botão carregando para sempre** — agora avisa que o link foi enviado.
4. **Sync distingue `offline` de `error`.** Antes, qualquer exceção virava "Sem conexão agora" em Configurações (inclusive com o projeto Supabase pausado). O caso de uso agora devolve `error` e conta o que chegou a subir; fotos devolvem `{uploaded, failed}`.
5. **Telas sem SQL.** `FotosScreen` e `ConfiguracoesScreen` consultavam o SQLite com Drizzle; as consultas foram para `lib/use-local-data.ts` (`useProgressPhotos`, `usePendingSync`).
6. **Testes de adapters (níveis 3 e 4 da pirâmide)**, que não existiam: 44 testes novos em `packages/db` e `apps/mobile`, incluindo repositórios contra SQLite real com as migrations do app. Core passou de 77 para 113 testes.

## Lacunas e próximos passos

| Lacuna | Impacto | Próximo passo |
|---|---|---|
| Treino do dia é mock (`mock-data.ts`) | RF06 parcial; QR valida contra lista fixa | Migration de `workout_plans`/`workout_days`/`workout_exercises`, repo real do `WorkoutRepository`, `OpenExerciseByQrUseCase` |
| Registro rejeitado pelo servidor trava o lote | Um único `SetLog` inválido (ex.: RLS) mantém todo o `upsert` falhando | Em `error`, reenviar linha a linha e marcar a culpada com `sync_attempts`/`last_error` (migration local) |
| Sem testes de tela e E2E | Cronômetro de descanso e fluxos de permissão só validados à mão | `jest-expo` + Testing Library quando o conflito de peer deps do SDK 57 for resolvido; Maestro para login → série offline → reconectar |
| Sem sync em background | Pendências só sobem com o app aberto | `expo-task-manager`/`expo-background-task` — só se surgir RNF que exija |
| Sem política de limpeza local | Banco cresce indefinidamente (lento: ~200 B/série) | Apagar `synced` com mais de N meses, mantendo agregados de progressão |
| Conflito multi-aparelho | Dois aparelhos na mesma conta: último envio vence | Aceito (uso individual); se mudar, `updated_at` + resolução no gateway |
| `apps/web` não usa `@px/core`/`@px/db` | Regras duplicadas | Migrar o web para os pacotes compartilhados quando voltar a evoluir |
| `RecordCardioSessionUseCase` e `CardioSession` sem uso | Código morto no core | Remover ou implementar a tela de corrida |
| Adapters remotos de leitura sem teste | `SupabaseAssessmentRepository`/`SupabaseNutritionPlanRepository` | Mesmo padrão de client falso de `workout-sync.test.ts` |
| Dependências de teste implícitas | `apps/mobile` e `packages/db` usam o `jest`/`ts-jest` içados da raiz (declarados só no `@px/core`) | Declarar como `devDependencies` num momento em que for seguro rodar `npm install` (o `node_modules` fica fora do OneDrive, via junction) |
