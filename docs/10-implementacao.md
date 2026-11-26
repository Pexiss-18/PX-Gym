# 10 · Implementação: DDD, Clean Architecture e TDD

[← Componentes](09-componentes.md) · [Índice](README.md)

As seções 1 a 9 são o insumo direto do código. A ordem de construção seguida no projeto, e a recomendada para qualquer feature nova, é **domínio → caso de uso → adapter → tela**, nunca começando pelo schema ou pela tela. Nas features com IA vale uma regra a mais: **a IA propõe, a fórmula confere**. Toda saída do modelo passa por esquema e por regras determinísticas antes de virar dado.

## DDD

### Aggregates

| Aggregate root | Entidades internas | Value objects | Repository | Gateways envolvidos |
|---|---|---|---|---|
| `SetLog` | — | `Load` (×2), `SyncStatus` | `SetLogRepository` | `WorkoutSyncGateway`, `ConnectivityStatus`, `Clock`, `IdGenerator` |
| `ProgressPhoto` | — | `PhotoLocation`, `SyncStatus`, `Recorte` | `ProgressPhotoRepository` | `ProgressPhotoUploader`, `ProgressPhotoCloud`, `LocalPhotoFiles`, `CameraGateway`, `LocationGateway`, `ConnectivityStatus` |
| `WorkoutPlan` | — | `PlanDay`, `PlanExercise` | `ActiveWorkoutPlanSource` (servidor), `WorkoutPlanCache` (aparelho) | `PlanGenerationGateway` |
| `Workout` (read model do dia) | `Exercise` | `PlannedSet`, `WorkoutProgress` | — (montado por `montarTreinoDoDia`) | — |
| `TrainingProfile` | — | `Objetivo`, `Nivel`, `Sexo`, `RegiaoSensivel` | `TrainingProfileRepository` | — |
| `BodyAssessment` | — | `ExtractedAssessment`, `AssessmentMeasurement`, `Weight`, `BodyFatPct` | `AssessmentRepository` | `AssessmentPdfReader` |
| `NutritionPlan` | — | `MacroTarget`, `MicroTarget`, `Meal`, `MealOption`, `MealFood`, `Macro` | `NutritionPlanRepository` | `PlanGenerationGateway` (app), `NutritionPlanGenerator` (web) |
| `CicloAvaliacao` | `AtividadeDesenvolvida` | `Avaliacao`, `Criterio`, `RegistroAssinatura`, `Assinatura`, `Coordenada`, `CargaHoraria`, `Devolucao`, `StatusCiclo`, `StatusSincronizacao` | `CicloAvaliacaoRepository` | `PdfGateway`, `SincronizacaoGateway` |
| `Acompanhamento` | — | — | `AcompanhamentoRepository` | — |
| `TokenPersonal` | — | — | `TokenPersonalRepository` | `SessionStorage` |
| `Usuario` (externo) | — | `Email`, `Sessao`, `UsuarioAutenticado` | — (identidade vive no Supabase Auth) | `AuthGateway`, `SessionStorage` |
| `Gym` (read model) | — | `GeoPoint`, `Distance` | `NearbyGymsCache` (última busca) | `NearbyGymsFinder`, `LocationGateway` |

Por que `SetLog` é raiz sozinho e não parte de um "Treino": uma série é registrada, sincronizada e apagada **individualmente**, offline, e cada uma tem id próprio. Um agregado maior obrigaria a regravar o treino inteiro a cada toque. Pelo mesmo motivo o `WorkoutPlan` não segura séries: o plano diz o que fazer, e o `SetLog` registra o que foi feito. Eles só se encontram no `Workout` do dia, um read model descartável.

Por que `CicloAvaliacao` é raiz **grande**: ao contrário da série, o relatório tem invariantes que cruzam as partes (assinar exige horas e avaliações; devolver apaga assinaturas). Elas só podem ser garantidas se toda mudança passar pela raiz.

### Demais blocos

- **Value objects com validação na construção**: `Load.fromKg` (0–1000 kg, 2 casas, passo de 2,5 kg), `Weight`, `BodyFatPct`, `Macro`, `Distance`, `Duration`, `geoPoint` (lat ∈ [-90, 90], lng ∈ [-180, 180]), `Email.parse` (normaliza e valida), `Criterio.criar` (0–10 em passos de 0,5), `Coordenada.criar`, `Assinatura.criar` (SVG em base64, recusa quadro vazio) e `CargaHoraria.criar` (mínimo ≤ período). Valor inválido lança `InvalidValueError` e nunca entra no domínio.
- **Domain services** (funções puras em `packages/core/src/domain/services`): `indiceDoTreinoDeHoje` e `montarTreinoDoDia` (treino do dia a partir do plano e do histórico), `avaliacaoMaisNovaQueOPlano`, `recorteRetrato` + `FORMATO_FOTO_PROGRESSO`, `computeStreakDays`, `computeWeekActivity`, `computeLoadProgression` (agrupa por dia, carga máxima, volume, recorde), `buildBodyHistory`/`historyDelta`, `diffMeasurements`/`measurementsFrom` (casa medidas por rótulo, tolerante a acento porque quem extrai é IA), `RegraGeracaoPdfService`, `RegraDevolucaoService` e `SincronizacaoService` (respondem sem mudar estado e explicam o "não").
- **Gateways** (ports para recurso não persistente): `LocationGateway`, `CameraGateway`, `ConnectivityStatus`, `AuthGateway`, `SessionStorage`, `WorkoutSyncGateway`, `ProgressPhotoUploader`, `ProgressPhotoCloud`, `LocalPhotoFiles`, `PlanGenerationGateway`, `AssessmentPdfReader`, `NearbyGymsFinder`, `NearbyGymsCache`, `PdfGateway`, `SincronizacaoGateway`, `NutritionPlanGenerator`, `Clock`, `IdGenerator`.
- **Erros de domínio**: `DomainError` → `InvalidValueError`, `BusinessRuleError`, `LocationUnavailableError`, `CloudStorageFullError`.
- **Resultado tipado**: os casos de uso mais novos devolvem `Resultado<T>` (`sucesso` ou `falha` com `tipo`: `dados-invalidos`, `regra-de-negocio`, `nao-encontrado`, `sem-permissao`, `falha-externa`). `falhaDoErro` converte o que o domínio lançou. A tela decide pela categoria e mostra a mensagem, sem `try/catch`.
- **Linguagem ubíqua**: série, carga, carga anterior, progressão, descanso, sequência (streak), avaliação, perfil, plano, dia do plano, pedido de mudança, cardápio, ciclo, critério, assinatura, devolução. Nenhum `Manager`/`Helper`.

## Clean Architecture

### Mapeamento da estrutura da skill para o monorepo

A skill propõe `src/{domain,application,adapters,infra}` num app só. O Px GYM tem web + mobile compartilhando o domínio e um servidor em Deno, então as camadas viraram **pacotes**:

| Camada da skill | No Px GYM | Conteúdo |
|---|---|---|
| `domain/entities`, `value-objects` | `packages/core/src/domain/entities`, `value-objects` | Entidades e VOs puros |
| `domain/repositories`, `domain/gateways` | `packages/core/src/domain/contracts` (`index.ts` e `ciclo.ts`) | Todas as interfaces |
| (serviços de domínio) | `packages/core/src/domain/services` | Cálculos e regras puras |
| `application/use-cases` | `packages/core/src/application/use-cases` | 27 arquivos, um assunto por arquivo (incluindo `resultado.ts` e o modelo de leitura `leitura-ciclo.ts`) |
| (fakes para teste) | `packages/core/src/testing` (`fakes.ts`, `fakes-ciclo.ts`, `cenario-ciclo.ts`) | Implementações em memória dos ports e cenários prontos |
| `adapters/screens` | `apps/mobile/src/app` (+ `components`, `adapters/screens`) | Telas Expo Router |
| `adapters/repositories` (local) | `apps/mobile/src/db/*-repository.ts`, `workout-plan-cache.ts` | Drizzle/SQLite |
| `adapters/repositories` (remoto), `gateways/sync`, `auth`, funções | `packages/db/src` | Supabase (compartilhável com o web) |
| `adapters/gateways` nativos | `apps/mobile/src/adapters/gateways`, `adapters/auth`, `lib/system.ts`, `lib/photos.ts` | expo-location, expo-camera, expo-image-manipulator, SecureStore, AsyncStorage, NetInfo, expo-crypto, R2 |
| adapters em memória | `apps/mobile/src/adapters/memoria` | Relatório do ciclo e modo mock |
| hooks de apresentação | `apps/mobile/src/lib/use-*.ts`, `remote.ts`, `adapters/hooks` | Leitura reativa/remota para as telas |
| composition roots | `apps/mobile/src/lib/{workout,plans,remote,photos,gyms}.ts`, `adapters/composicao.ts`, `adapters/instancia.ts`, `adapters/context` | Onde use case encontra adapter |
| `infra/db` | `apps/mobile/src/db/{index,schema}.ts`, `apps/mobile/drizzle/` | Client SQLite + migrations |
| `infra/supabase` | `packages/db/src/client.ts`, `apps/mobile/src/lib/supabase.ts`, `supabase/migrations/` | Client, LargeSecureStore, schema remoto + RLS + RPCs |
| (servidor) | `supabase/functions/*/index.ts` e `_shared/` | Edge Functions: boundary HTTP, controles, port `ProvedorIA` e regras |
| `infra/sync/sync-engine.ts` | `apps/mobile/src/lib/use-workout-sync.ts` | Gatilhos NetInfo/AppState + trava de reentrada |
| `infra/sync/background-task.ts` | **não existe** | Nenhum RNF exige sync com o app fechado (ver lacunas) |

### Regra de dependência

A camada externa depende da interna, nunca o contrário. Checagem prática, para rodar da raiz:

```bash
# domínio/aplicação não podem importar nada externo — saída esperada: vazia
grep -rhoE 'from "[^".][^"]*"' packages/core/src

# telas não podem fazer SQL — saída esperada: só o _layout.tsx (migrations no boot)
grep -rlE 'from "(drizzle-orm|@/db)' apps/mobile/src/app

# telas não falam com o Supabase — saída esperada: vazia
grep -rlE 'supabase|@px/db' apps/mobile/src/app apps/mobile/src/adapters/screens
```

As três foram rodadas em 26/11/2026 com a saída esperada.

## TDD

Ciclo red → green → refactor, de dentro para fora. Os testes rodam em Node puro (Jest) ou em Deno: nenhum precisa de emulador, aparelho, rede, projeto Supabase ou chave de IA.

```bash
cd packages/core && npm test            # domínio + casos de uso (npm run test:coverage aplica o mínimo de 80%)
cd packages/db   && npm test            # adapters Supabase com client falso
cd apps/mobile   && npm test            # repositórios Drizzle (SQLite real), gateways, hooks, telas, E2E
cd apps/mobile   && npm run typecheck   # app + testes (tsconfig.test.json)
npm run test:functions                  # (raiz) Edge Functions em Deno: regras, IA, R2, ntfy
npm run check:functions                 # (raiz) typecheck das três funções
```

### Pirâmide atual — 657 testes

Contagem de 26/11/2026, todos passando: `@px/core` 383, `@px/db` 47, mobile 168 e Deno 59.

| Nível | Onde | Testes | Técnica |
|---|---|---|---|
| **1. Domínio** | `packages/core/src/domain/__tests__` | **196**: `ciclo-avaliacao` (36), `value-objects` (21), `carga-horaria-status` (19), `criterio` (19), `coordenada-assinatura` (16), `body-metrics` (15), `acompanhamento-token` (14), `servicos-ciclo` (11), `load-progression` (10), `treino-do-dia` (9), `streak` (8), `enquadramento-foto` (7), `week-activity` (7), `avaliacao-nova` (4) | Objeto puro, zero mock |
| **2. Caso de uso** | `packages/core/src/application/__tests__` | **187**: `sync` (24), `fluxo-relatorio` (22), `auth` (21), `find-nearby-gyms` (20), `register-manual-assessment` (18), `registrar-e-avaliar` (16), `workout-plan` (13), `training-profile` (12), `photo-lifecycle` (11), `sincronizar-e-token` (10), `diet-plan` (9), `read-assessment-pdf` (5), `register-set` (3), `generate-nutrition-plan` (3) | **Fakes em memória** dos ports (`InMemorySetLogs`, `FakeSyncGateway`, `FakeLocation`, `FakeConnectivity`, `FakeAuthGateway`, `FakePlanGenerationGateway`, `InMemoryWorkoutPlans`…) e cenários (`cenario-ciclo.ts`) |
| **3. Adapter isolado** | `packages/db/src/__tests__`, `apps/mobile/src/adapters/{gateways,auth,memoria}/__tests__`, `apps/mobile/src/lib/__tests__` | **122**: db 47 (`auth-gateway` 16, `training-plans` 11, `progress-photos` 10, `assessments` 6, `workout-sync` 4); mobile 75 (`memoria` 16, `SessionStorageSecureStore` 11, `CameraGatewayExpo` 11, `LocationGatewayExpo` 10, `OverpassGymFinder` 6, `NominatimGymFinder` 5, `system` 5, `FirstAvailableGymFinder` 4, `modo` 4, `NearbyGymsCacheAsyncStorage` 3) | Client Supabase falso com os erros reais do `supabase-js` e de `functions.invoke`; `jest.mock` de `expo-location`, `expo-camera`, `expo-image-manipulator`, NetInfo, SecureStore, AsyncStorage e `fetch` |
| **4. Repository contra SQLite real** | `apps/mobile/src/db/__tests__` | **17**: `set-log-repository` (7), `progress-photo-repository` (7), `workout-plan-cache` (3) | `node:sqlite` em memória + **as mesmas migrations** de `apps/mobile/drizzle/` + driver `drizzle-orm/sqlite-proxy` |
| **5. Edge Functions** | `supabase/functions/_shared/*/*_test.ts` | **59**: plano e IA (41), fotos/R2/ntfy (13), avaliação do PDF (5) | Deno test com provedor de IA falso, `fetch` falso e relógio fixo; as regras rodam sem rede e sem chave |
| **6. Hooks, Context e lib de apresentação** | `apps/mobile/src/adapters/{context,hooks}/__tests__`, `apps/mobile/src/lib/__tests__` | **31**: `AuthContext` (10), `hooks` (10), `guia-exercicios` (5), `weekly-menu` (4), `assessment-form` (2) | `jest-expo` + Testing Library (`renderHook`) |
| **7. Componente/tela** | `apps/mobile/src/adapters/screens/__tests__`, `apps/mobile/src/components/__tests__` | **44**: `HistoricoERelatorioScreen` (11), `photo-viewer` (9), `AssinaturaEAvaliacaoScreen` (8), `AtividadesFormScreen` (7), `LoginETokenScreen` (6), `exercise-guide-card` (3) | `jest-expo` + `@testing-library/react-native`, com os adapters em memória |
| **8. E2E** | `apps/mobile/src/adapters/__tests__/e2e` | **1**: `fluxo-relatorio.e2e` (login → registrar treinos → avaliar → assinar → aprovar → PDF) | Árvore de telas real com a composição em memória; **não** roda em aparelho |

**Cobertura** (Jest, `--coverage`, 26/11/2026): `@px/core` com 95,4% das linhas, 93,0% dos branches e 91,3% das funções; no mobile, a camada `src/adapters` (gateways, contexto, hooks, telas do relatório e memória) tem 98,3% das linhas, 91,2% dos branches e 96,1% das funções. As telas de `src/app` e a `lib` ficam fora da medição: as telas dependem de SQLite e Supabase reais, e a lib tem testes próprios, mas não entra no limite. O limite mínimo de 80% em linhas, funções, branches e statements está no `jest.config` de ambos, e o `test:coverage` falha abaixo dele.

A câmera e o GPS reais nunca são exercitados em teste automatizado. Os dois entram por gateways (`CameraGatewayExpo`, `LocationGatewayExpo`) testados com os módulos Expo mockados, e a validação em aparelho é manual. O RNF de offline tem teste dedicado com conectividade falsa (`FakeConnectivity(false)`) nos casos de uso e com o NetInfo mockado no adapter (`isInternetReachable: null/false`). A IA real só é chamada à mão, por `npm run try:plan` (lê a chave de `supabase/functions/.env`).

## Rastreabilidade RF → caso de uso → teste

| RF | Caso de uso | Control / adapter | Teste de aceitação |
|---|---|---|---|
| RF01 | UC01 | `AutenticarUsuarioUseCase`, `SupabaseAuthGateway` | `auth.test.ts` › *e-mail malformado é recusado sem ir à rede*, *repassa o motivo do provedor (ex.: sem rede) em vez de culpar a senha*; `auth-gateway.test.ts` |
| RF02 | UC02 | `SignUpUseCase`, `SupabaseAuthGateway` | `auth.test.ts` › SignUpUseCase; `auth-gateway.test.ts` › *signUp sem sessão* |
| RF03 | UC03 | `EncerrarSessaoUseCase` | `auth.test.ts` › *sair apaga a sessão local mesmo se o provedor falhar* |
| RF04 | UC01 | `RestaurarSessaoUseCase`, `SessionStorageSecureStore` | `auth.test.ts` › *devolve a sessão guardada que ainda vale*; `SessionStorageSecureStore.test.ts`; `AuthContext.test.tsx` |
| RF05 | UC04 | `computeStreakDays`, `computeWeekActivity`, `buildBodyHistory` | `streak.test.ts`, `week-activity.test.ts`, `body-metrics.test.ts` |
| RF06 | UC05 | `indiceDoTreinoDeHoje`, `montarTreinoDoDia`, `Workout.progress()` | `treino-do-dia.test.ts` (9 cenários de dia e carga) |
| RF07 | UC07 | `RegisterSetUseCase`, `DrizzleSetLogRepository` | `register-set.test.ts`; `set-log-repository.test.ts` › *save + byId* |
| RF08 | UC08 | `RegisterSetUseCase`, `lastLoadKgForExercise`, `montarTreinoDoDia` | `register-set.test.ts`; `set-log-repository.test.ts`; `treino-do-dia.test.ts` › *vira um Workout com as séries do plano e a carga da última sessão* |
| RF09 | UC09/UC10 | estado da `ExercicioScreen` | — manual (sem teste de tela para essa tela; bug real corrigido no commit `627313e`) |
| RF10 | UC10/UC21 | `UnregisterSetUseCase`, `SyncPendingSetLogsUseCase`, `deleteSetLogs` | `sync.test.ts` › UnregisterSetUseCase e *sync de tombstones*; `workout-sync.test.ts` › *delete filtra pelos ids E pelo dono* |
| RF11 | UC08 | `computeLoadProgression` | `load-progression.test.ts` |
| RF12 | UC06 | `parseExerciseId` (tela), `guiaDoExercicio`, `useWorkoutWithExercise` | `guia-exercicios.test.ts` › *cobre todo exercício que a IA pode escolher* (o catálogo do QR); parse na tela — manual |
| RF13 | UC11/UC12 | `SaveProgressPhotoUseCase`, `CameraGatewayExpo`, `recorteRetrato` | `sync.test.ts` › SaveProgressPhotoUseCase; `CameraGatewayExpo.test.ts` › *recorta o 9:16 centralizado*, *redimensiona pra 1080×1920 e salva em JPEG 92%*; `enquadramento-foto.test.ts`; `progress-photo-repository.test.ts` › *guarda e devolve a posição* |
| RF14 | UC13/UC32 | `useProgressPhotos`, `PhotoViewer` | `progress-photo-repository.test.ts` › *listByUser*; `photo-viewer.test.tsx` (data, local, mapa, deslizar) |
| RF15 | UC14 | `buildBodyHistory`, `diffMeasurements` | `body-metrics.test.ts` |
| RF16 | UC15 | `SupabaseAssessmentRepository` | `assessments.test.ts` (origem `pdf` × `manual`) |
| RF17 | UC16 | `cardapioDoDia`, `opcaoDoDia`, `totalDoDia` | `weekly-menu.test.ts` › *dias seguidos trocam as opções*, *troca feita na mão vale por cima do rodízio* |
| RF18 | UC17/UC18 | `FindNearbyGymsUseCase`, `FirstAvailableGymFinder`, `NearbyGymsCacheAsyncStorage`, `LocationGatewayExpo` | `find-nearby-gyms.test.ts` (ranking, permissão, falhas, última busca); `FirstAvailableGymFinder.test.ts`; `OverpassGymFinder.test.ts`; `NominatimGymFinder.test.ts`; `LocationGatewayExpo.test.ts` |
| RF19 | UC20–UC22, UC34 | `SyncPendingSetLogsUseCase`, `SyncPendingPhotosUseCase`, `RestoreProgressPhotosUseCase`, `netInfoConnectivity` | `sync.test.ts`; `photo-lifecycle.test.ts`; `system.test.ts` |
| RF20 | UC19 | `SyncResult.error` × `offline`, `usePendingSync` | `sync.test.ts` › *falha no push devolve error (≠ offline)* |
| RF21 | UC23 | `SaveTrainingProfileUseCase`, `SupabaseTrainingProfileRepository` | `training-profile.test.ts` (faixas, preferências aprendidas preservadas); `training-plans.test.ts` › *salva com upsert pelo user_id*; Deno › *perfil: recusa dias e idade fora da faixa* |
| RF22 | UC24 | `RegisterManualAssessmentUseCase`, `createManual` | `register-manual-assessment.test.ts` › *só com o peso: já nasce revisada, manual e sem PDF* (18 testes de faixa e data) |
| RF23 | UC25 | `ReadAssessmentPdfUseCase`, `SupabaseAssessmentPdfReader`, `extract-assessment` | `read-assessment-pdf.test.ts` › *arquivo que não é PDF é recusado sem subir*, *PDF acima de 15 MB…*; `assessments.test.ts` › *sobe na pasta do usuário e pede a leitura*; Deno `extrair_test.ts`; `assessment-form.test.ts` |
| RF24 | UC26 | `GenerateWorkoutPlanUseCase`, `SupabasePlanGenerationGateway`, `gerarTreino`, `ajustarTreino` | `workout-plan.test.ts` › *gera a partir da avaliação revisada mais recente e guarda o treino no aparelho*; Deno › *treino: exercício inventado ou repetido é descartado*, *regiões sensíveis: o que sobrecarrega a região é vetado* |
| RF25 | UC27 | `GenerateDietPlanUseCase`, `gerarDieta`, `ajustarDieta`, `conferirRefeicoes` | `diet-plan.test.ts`; Deno › *regras: Mifflin-St Jeor*, *dieta: proposta absurda é trazida pra faixa*, *refeições: proteína e calorias da opção acertadas juntas (sistema 2×2)*, *dieta: emagrecimento nunca desce abaixo da taxa basal* |
| RF26 | UC28 | `requestChange`, revisão na `generate-plan` | `workout-plan.test.ts` › *pedido de mudança vai com o texto da pessoa*; Deno › *mudança no treino: … o que ela aprende volta filtrado*, *mudança na dieta…* |
| RF27 | UC29 | `resume`, `ErroDeCota`, `gerarComReserva` | `workout-plan.test.ts` › *cota da IA esgotada: o pedido fica na fila*, *retoma um pedido da fila pelo id*; Deno › *reserva: todos sem cota propaga ErroDeCota* |
| RF28 | UC26–UC28 | limites na `generate-plan` | `workout-plan.test.ts` › *limite do servidor volta como regra de negócio, com a mensagem dele*; os contadores da função — manual (consulta ao Postgres) |
| RF29 | UC30 | `avaliacaoMaisNovaQueOPlano`, `NewAssessmentCard` | `avaliacao-nova.test.ts` (4 cenários) |
| RF30 | UC05 | `LoadActiveWorkoutPlanUseCase`, `DrizzleWorkoutPlanCache` | `workout-plan.test.ts` › *sem internet, usa o treino guardado no aparelho*, *servidor fora do ar: também usa o guardado*; `workout-plan-cache.test.ts` |
| RF31 | UC31 | `guiaDoExercicio`, `linkDoVideo`, `ExerciseGuideCard` | `guia-exercicios.test.ts`; `exercise-guide-card.test.tsx` |
| RF32 | UC33 | `DeleteProgressPhotoUseCase`, `SupabaseProgressPhotoStore.remove`, `photo-storage` | `photo-lifecycle.test.ts` › *offline: some da galeria na hora e fica tombstone pro sync*; `progress-photos.test.ts` › *remove: linha primeiro, depois o objeto no R2*; Deno › *apagar: DELETE assinado; 204 e 404 contam como apagado* |
| RF33 | UC34 | `RestoreProgressPhotosUseCase` | `photo-lifecycle.test.ts` › *não ressuscita foto apagada que ainda espera remoção na nuvem* |
| RF34 | UC35 | `RegistrarAtividadesUseCase`, `CicloAvaliacao.registrarAtividade` | `registrar-e-avaliar.test.ts` › *tudo ou nada*; `ciclo-avaliacao.test.ts` › *recusa treino fora das datas do ciclo*; `AtividadesFormScreen.test.tsx` |
| RF35 | UC36/UC37 | `AvaliarDesempenhoUseCase`, `RealizarAutoAvaliacaoUseCase`, `Criterio` | `registrar-e-avaliar.test.ts`; `criterio.test.ts` (passo 0,5 e faixas) |
| RF36 | UC38 | `AssinarRelatorioUseCase`, `Assinatura` | `fluxo-relatorio.test.ts` › *aluno e depois personal assinam: o relatório vai pra aprovação*, *com pendências, recusa e lista o que falta*; `AssinaturaEAvaliacaoScreen.test.tsx` |
| RF37 | UC39/UC40 | `AprovarRelatorioUseCase`, `DevolverRelatorioUseCase`, `RegraDevolucaoService` | `fluxo-relatorio.test.ts` › *coordenação devolve com motivo: assinaturas apagadas*, *aluno e personal não aprovam*; `servicos-ciclo.test.ts` |
| RF38 | UC41 | `GerarPdfUseCase`, `RegraGeracaoPdfService` | `servicos-ciclo.test.ts`; `sincronizar-e-token.test.ts` › *online: envia tudo, grava synced e libera o PDF do ciclo aprovado* |
| RF39 | UC42 | `AcessarViaTokenUseCase`, `TokenPersonal` | `sincronizar-e-token.test.ts` › *token expirado*, *token revogado*; `acompanhamento-token.test.ts`; `LoginETokenScreen.test.tsx` |
| RF40 | UC43/UC44 | `ListarRelatoriosUseCase`, `SincronizarFilaUseCase`, `podeVer` | `sincronizar-e-token.test.ts` › *uma falha não para a fila; o item volta como error na próxima*; `HistoricoERelatorioScreen.test.tsx`; `fluxo-relatorio.e2e.test.tsx` |

## Histórico de evolução desde a primeira versão deste documento

A primeira versão (18/09/2026) descrevia 157 testes, o treino do dia fixo em código e o plano nutricional vindo do web. As mudanças que a atualizaram, em ordem:

| Quando | Commit | O que mudou na arquitetura |
|---|---|---|
| 29/09 | `ba24db4` | Fase "domínio e interface primeiro": `packages/core` reorganizado em `domain/{entities,value-objects,services,contracts}` e `application/use-cases`; `Resultado<T>`; agregado `CicloAvaliacao` e o relatório do ciclo; `CameraGateway`, `SessionStorage`, `AuthContext`; testes de tela e E2E com `jest-expo` + Testing Library; cobertura mínima de 80%. |
| 05/10 | `71dbe41` | Modo mock sem SQLite nem Supabase (`desligadoNoMock`). |
| 13/10 | `3996d3a`, `e55c519` | Edge Function `generate-plan` (Gemini, port `ProvedorIA`, regras); app volta ao modo real por padrão. |
| 16 a 27/10 | `8ca974b`, `e8633c5` | Guia de execução dos exercícios; acervo científico e catálogo fechado. |
| 29 e 30/10 | `5d8827b`, `b8cdf1d` | Foto em 9:16 com o local; exclusão por tombstone, restauração e ida das fotos para o Cloudflare R2 com trava de custo e aviso por ntfy. |
| 03/11 | `49fba64` | Expo SDK 58, React Native 0.88, React 19.3. |
| 10 e 13/11 | `6e1c0e0`, `ced75b7` | Treino e dieta em pedidos separados; avaliação digitada; perfil de treino; treino gerado por IA na aba Treino, com cópia no SQLite. **O treino fixo em código (`mock-data.ts`) deixou de ser usado pelas telas.** |
| 17/11 | `0ac4ea9`, `d0eb4b8`, `b8d5bf2`, `826a6c2`, `87893f0`, `294c9f3` | Academias com fontes em cadeia e última busca guardada; sessão real separada da do mock; visualizador de fotos; dieta com cardápio da semana conferido pela fórmula; barra "Confirmar" do teclado; avaliação lida do PDF (`extract-assessment`) e seletor de data. |
| 26/11 | `79623d2` | Aviso de avaliação nova no treino e na dieta (`avaliacaoMaisNovaQueOPlano`, `assessmentId` no `WorkoutPlan`). |

## Lacunas e próximos passos

| Lacuna | Impacto | Próximo passo |
|---|---|---|
| Relatório do ciclo sem persistência | Repositórios `Map` com dados de demonstração; PDF e sincronização simulados; fechar o app apaga o que foi feito | Migrations de ciclo, atividades, avaliações e assinaturas; repositórios Drizzle + Supabase atrás dos mesmos ports; `PdfGateway` com `expo-print` |
| Registro rejeitado pelo servidor trava o lote de séries | Um único `SetLog` inválido (ex.: RLS) mantém todo o `upsert` falhando | Em `error`, reenviar linha a linha e marcar a culpada com `sync_attempts`/`last_error` (migration local) |
| Dieta sem cópia no aparelho | Sem rede, a aba Nutrição mostra erro (o treino abre) | `NutritionPlanCache` no mesmo molde do `WorkoutPlanCache`, se a dieta passar a ser consultada na academia |
| Fila da IA só com retomada manual | Pedido `queued` espera a pessoa tocar "Tentar de novo" | Retomar sozinho no próximo gatilho de sync, respeitando a cota |
| Sem E2E em aparelho | Cronômetro de descanso, câmera, GPS e fluxos de permissão só validados à mão | Maestro no emulador Android: login → série offline → reconectar → foto |
| Sem sync em background | Pendências só sobem com o app aberto | `expo-background-task`, só se surgir RNF que exija |
| Sem política de limpeza local | Banco cresce indefinidamente (lento: ~200 B por série) | Apagar `synced` com mais de N meses, mantendo agregados de progressão |
| Conflito multi-aparelho | Dois aparelhos na mesma conta: o último envio vence | Aceito (uso individual); se mudar, `updated_at` + resolução no gateway |
| Exclusão de conta não limpa o R2 | Objetos e reservas ficam (as reservas continuam contando, de propósito) | Rotina do administrador que apaga a pasta do usuário e as reservas |
| Operações classe A/B do R2 sem trava | Abuso improvável, mas sem teto | Contador por usuário na `photo-storage`, se o uso crescer |
| Bucket `progress-photos` do Storage sem uso | Sobra da migration 0003 | Migration que remove o bucket e as políticas |
| Catálogo de exercícios em dois lugares | Edge Function (`exercicios.ts`) e guia no app; o Deno não importa o `@px/core` | Já coberto por teste (`guia-exercicios.test.ts` falha se o guia não cobrir o catálogo); gerar um do outro se crescer |
| Plano gratuito do Gemini | O provedor pode usar os dados para treinar o modelo; cotas mudam sem aviso | Aviso de privacidade na UI; trocar o adapter `ProvedorIA` se o produto tiver dados de terceiros |
| Prescrição de treino e dieta | Responsabilidade de orientação por IA | Aviso visível na UI de que o plano não substitui profissional |
| `apps/web` não usa `@px/core`/`@px/db` | Regras duplicadas; pipeline PDF → Claude depende de chave paga e está parado | Migrar o web para os pacotes compartilhados e para as Edge Functions quando voltar a evoluir |
| `RecordCardioSessionUseCase` e `CardioSession` sem uso | Código morto no core | Remover ou implementar a tela de corrida |
| `mock-data.ts` só nos dados de exemplo | Usado só por `dados-exemplo.ts` (botão em `__DEV__`) | Trocar por um plano de exemplo no formato `WorkoutPlan` |
| Dependências de teste implícitas | `apps/mobile` e `packages/db` usam o `jest`/`ts-jest` içados da raiz (declarados só no `@px/core`) | Declarar como `devDependencies` num momento em que for seguro rodar `npm install` |
| `expo lint` com erros antigos | O lint não roda limpo e, rodado pela primeira vez, se autoconfigura | Resolver os erros e versionar o `eslint.config.js` |
| Desempenho não medido | Meta de 100 ms do RNF11 sem número | Medir com o Performance Monitor no APK |
