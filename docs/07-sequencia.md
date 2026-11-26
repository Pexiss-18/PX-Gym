# 7 · Diagramas de Sequência

[← Fronteira, controle e entidade](06-fronteira-controle-entidade.md) · [Índice](README.md) · [Próximo: Atividades →](08-atividades.md)

Os participantes têm os mesmos nomes da tabela da [§6](06-fronteira-controle-entidade.md#tabela-de-mapeamento-por-caso-de-uso), e a ordem das chamadas é a que os testes da [§10](10-implementacao.md) verificam. Toda ação de escrita mostra **dois momentos separados**: (1) a gravação local, síncrona do ponto de vista do usuário e que não falha por falta de rede; (2) a sincronização remota, assíncrona e condicionada à conectividade. As ações que só existem online (gerar plano, ler PDF) mostram o oposto: a conferência no aparelho **antes** de gastar a viagem.

## 7.1 UC07 — Registrar série (offline-first + sincronização)

```mermaid
sequenceDiagram
    actor P as Praticante
    participant B as ExercicioScreen «boundary»
    participant C as RegisterSetUseCase «control»
    participant R as DrizzleSetLogRepository «SQLite»
    participant E as SetLog «entity»
    participant L as useLiveQuery «boundary»
    participant S as SyncPendingSetLogsUseCase «control»
    participant N as ConnectivityStatus «NetInfo»
    participant G as SupabaseWorkoutSyncGateway «Supabase»

    P ->> B: toca o check da série (carga no stepper)
    B ->> C: execute({exerciseId, setNumber, targetReps, loadKg})
    C ->> R: lastLoadKgForExercise(exerciseId)
    R -->> C: 62.5 (ignora tombstones)
    C ->> E: SetLog.create(id do cliente, previousLoad, load)
    E -->> C: setLog (pending)
    C ->> R: save(setLog)
    R -->> C: ok
    C -->> B: {setLog, deltaKg: +2.5}
    B -->> P: check volt + háptico + descanso de 90 s
    R -->> L: change listener do SQLite
    L -->> B: curva de progressão e contagem atualizadas

    par sincronização oportunista (não bloqueia a tela)
        B ->> S: execute()
        S ->> N: isOnline()
        alt offline
            N -->> S: false
            S -->> B: {status: offline}
        else online
            N -->> S: true
            S ->> R: pending() e deletedIds()
            R -->> S: [setLog], []
            S ->> G: pushSetLogs([setLog])
            alt upsert aceito
                G -->> S: ok
                S ->> R: markSynced([id])
                S -->> B: {status: synced, synced: 1}
            else backend recusa ou não responde
                G -->> S: erro
                S -->> B: {status: error} (setLog continua pending)
            end
        end
    end
```

## 7.2 UC10 + UC21 — Desmarcar série já sincronizada

```mermaid
sequenceDiagram
    actor P as Praticante
    participant B as ExercicioScreen «boundary»
    participant U as UnregisterSetUseCase «control»
    participant R as DrizzleSetLogRepository «SQLite»
    participant W as useWorkoutSync «Sistema de Sincronização»
    participant S as SyncPendingSetLogsUseCase «control»
    participant G as SupabaseWorkoutSyncGateway «Supabase»

    P ->> B: toca o check de uma série marcada
    B ->> U: execute({logId})
    U ->> R: byId(logId)
    R -->> U: setLog (synced)
    alt setLog pending
        U ->> R: remove([logId])
    else setLog synced
        U ->> R: markDeleted([logId])
        Note over R: tombstone some das leituras
    end
    B -->> P: série desmarcada, descanso cancelado

    Note over W: mais tarde: NetInfo reconecta
    W ->> S: execute()
    S ->> R: pending(), deletedIds()
    R -->> S: [], [logId]
    S ->> G: deleteSetLogs([logId]) (filtra por user_id)
    alt delete confirmado
        G -->> S: ok
        S ->> R: remove([logId])
    else falha
        G -->> S: erro
        Note over R: tombstone preservado para a próxima janela
    end
```

## 7.3 UC11 — Registrar foto de progresso

```mermaid
sequenceDiagram
    actor P as Praticante
    participant B as CameraScreen «boundary»
    participant Cam as CameraGatewayExpo «expo-camera + image-manipulator»
    participant FS as persistCapture «expo-file-system»
    participant C as SaveProgressPhotoUseCase «control»
    participant Loc as LocationGatewayExpo «expo-location»
    participant R as DrizzleProgressPhotoRepository «SQLite»
    participant N as ConnectivityStatus «NetInfo»
    participant Up as R2ProgressPhotoCloud «adapter»
    participant EF as photo-storage «Edge Function»
    participant R2 as Cloudflare R2

    P ->> B: abre a câmera
    B ->> Cam: permissao()
    alt negada ou bloqueada
        Cam -->> B: negada / bloqueada
        B -->> P: cartão "Acesso à câmera" + Permitir (ou Abrir configurações) / Agora não
    end
    P ->> B: toca o disparador
    B ->> Cam: capturar()
    Note over Cam: takePictureAsync(qualidade 1), recorteRetrato 9x16, 1080x1920, JPEG 92%, apaga o original
    Cam -->> B: {uri no cache, 1080, 1920}
    B ->> FS: persistCapture(uri)
    FS -->> B: file:///documents/progress-photos/uuid.jpg
    B ->> C: execute({userId, localUri, askLocation: true})
    C ->> Loc: permission() e, se preciso, requestPermission()
    alt concedida
        C ->> Loc: currentPosition()
        Loc -->> C: lat, lng
    else negada ou sem sinal
        Note over C: foto segue sem posição
    end
    C ->> R: save(photo pending, com location)
    C ->> N: isOnline()
    alt online
        C ->> Up: upload(photo)
        Up ->> EF: {action: upload, photoId, size}
        EF ->> EF: reserve_photo_storage (cota global e do usuário)
        alt espaço reservado
            EF -->> Up: {url assinada 5 min, headers, path}
            Up ->> R2: PUT bytes (do disco, pelo nativo)
            R2 -->> Up: 200
            Up ->> Up: upsert da linha em progress_photos (sem posição)
            Up -->> C: userId/photoId.jpg
            C ->> R: markUploaded(id, path)
        else nuvem cheia
            EF -->> Up: 507 {code: user_quota | global_quota}
            Note over EF: aviso ao administrador pelo ntfy (no máximo 1 por dia)
            Up -->> C: CloudStorageFullError (foto segue pending)
        end
    end
    C -->> B: photo
    B -->> P: volta para a galeria, já com a foto
```

## 7.4 UC17 — Encontrar academias por perto

```mermaid
sequenceDiagram
    actor P as Praticante
    participant B as AcademiasScreen «boundary»
    participant C as FindNearbyGymsUseCase «control»
    participant Loc as LocationGatewayExpo «expo-location»
    participant F as FirstAvailableGymFinder «OSM»
    participant K as NearbyGymsCacheAsyncStorage «AsyncStorage»

    P ->> B: abre Academias
    B ->> C: execute({radiusMeters: 4000})
    C ->> Loc: permission()
    alt não concedida
        Loc -->> C: undetermined
        C -->> B: needs-permission
        B -->> P: cartão "Acesso à localização"
        P ->> B: Permitir localização
        B ->> C: execute({radiusMeters: 4000, askPermission: true})
        C ->> Loc: permission() e requestPermission()
        Loc -->> C: granted
    else já concedida
        Loc -->> C: granted
    end
    C ->> Loc: currentPosition()
    alt fix novo
        Loc -->> C: GeoPoint
    else sem fix novo
        Note over Loc: cai para getLastKnownPositionAsync
        Loc -->> C: GeoPoint (última conhecida) ou LocationUnavailableError
    end
    C ->> F: search(center, 4000)
    Note over F: Overpass principal, depois Nominatim, depois espelhos do Overpass
    alt alguma fonte respondeu
        F -->> C: academias candidatas
        C ->> K: save({center, gyms, savedAt})
        C ->> C: haversine, corta pelo raio, ordena
        C -->> B: found {center, gyms}
    else todas caíram
        F -->> C: erro
        C ->> K: load()
        K -->> C: última busca
        C ->> C: recalcula distâncias para a posição atual
        C -->> B: found {center, gyms, cachedAt} ou search-failed
    end
    B -->> P: mapa + lista por distância (com a data, se veio da última busca)
```

## 7.5 UC01 — Entrar (com falha de rede)

```mermaid
sequenceDiagram
    actor V as Visitante
    participant B as LoginScreen «boundary»
    participant Ctx as AuthContext «composition root»
    participant C as AutenticarUsuarioUseCase «control»
    participant A as SupabaseAuthGateway «Supabase Auth»
    participant S as SessionStorageSecureStore «SecureStore»
    participant Root as Stack.Protected «layout raiz»

    V ->> B: e-mail + senha, Entrar
    B ->> Ctx: entrar(email, senha)
    Ctx ->> C: execute({email, senha})
    alt e-mail malformado ou senha vazia
        C -->> Ctx: recusado: invalid-email ou missing-password (sem ir à rede)
    else dados válidos
        C ->> A: signIn(email normalizado, senha)
        alt aceito
            A -->> C: {ok, sessao (papel do user_metadata)}
            C ->> S: salvar(sessao)
            C -->> Ctx: autenticado(sessao)
            Note over Root: a sessão muda e o grupo (app) monta
        else sem rede ou projeto pausado
            A -->> C: network
            C -->> Ctx: recusado: network
        else credencial errada
            A -->> C: invalid-credentials
            C -->> Ctx: recusado: invalid-credentials
        end
    end
    Ctx -->> B: mensagem em pt-BR (ou nada, se entrou)
```

## 7.6 UC26 — Gerar o treino com IA

```mermaid
sequenceDiagram
    actor P as Praticante
    participant B as TreinoScreen «boundary»
    participant C as GenerateWorkoutPlanUseCase «control»
    participant N as ConnectivityStatus «NetInfo»
    participant Pr as SupabaseTrainingProfileRepository
    participant A as SupabaseAssessmentRepository
    participant G as SupabasePlanGenerationGateway
    participant EF as generate-plan «Edge Function»
    participant IA as Gemini Flash-Lite
    participant DB as Postgres «RPC»
    participant K as DrizzleWorkoutPlanCache «SQLite»

    P ->> B: Gerar meu treino
    B ->> C: generate(userId)
    C ->> N: isOnline()
    C ->> Pr: get(userId)
    C ->> A: latestReviewed(userId)
    alt sem internet, sem perfil ou sem avaliação revisada
        C -->> B: falha com a mensagem (nada sai do aparelho)
    else tudo certo
        C ->> G: generateWorkout(userId, {assessmentId})
        G ->> EF: POST {assessmentId, part: workout} + JWT
        EF ->> EF: lê perfil e avaliação (RLS), confere limites (8/dia, 2 por avaliação)
        EF ->> DB: insert plan_generations (generating)
        loop modelos da cadeia, até um passar nas regras
            EF ->> IA: sistema (acervo, catálogo, vetos) + dados + JSON Schema
            IA -->> EF: treino em JSON
            EF ->> EF: zod + ajustarTreino (catálogo, vetos, faixas)
        end
        alt treino aceito
            EF ->> DB: complete_workout_generation (desativa o anterior, grava, done)
            EF -->> G: 200 {workoutPlanId, workout, sources}
            G -->> C: {status: done, plan}
            C ->> K: put(plan)
            C -->> B: sucesso(done)
            B -->> P: treino novo em todas as telas
        else todos os modelos sem cota
            EF ->> DB: status queued
            EF -->> G: 202 {generationId}
            G -->> C: {status: queued, generationId}
            C -->> B: sucesso(queued)
            B -->> P: "Seu pedido está na fila" + Tentar de novo (UC29)
        else limite atingido
            EF -->> G: 429 {error}
            G -->> C: BusinessRuleError(mensagem do servidor)
            C -->> B: falha (regra de negócio)
        end
    end
```

No pedido de mudança (UC28), o corpo é `{ feedback, part }`. A função lê o treino ativo, usa a avaliação **dele** e, depois de gravar, acrescenta ao perfil os exercícios que a pessoa disse não ter. No "Tentar de novo" (UC29), o corpo é `{ generationId }`, e a função só aceita se o pedido for do mesmo usuário e estiver `queued`. A dieta (UC27) segue a mesma sequência com `part: nutrition`, `ajustarDieta` + `conferirRefeicoes` no lugar de `ajustarTreino` e a RPC `complete_nutrition_generation`. Sem cópia no aparelho, o gateway lê a dieta gravada (`nutrition_plans`) para devolvê-la inteira.

## 7.7 UC25 + UC24 — Avaliação lida do PDF

```mermaid
sequenceDiagram
    actor P as Praticante
    participant B as NovaAvaliacaoScreen «boundary»
    participant Pk as DocumentPicker «expo-document-picker»
    participant C1 as ReadAssessmentPdfUseCase «control»
    participant Rd as SupabaseAssessmentPdfReader
    participant St as Storage «bucket assessments»
    participant EF as extract-assessment «Edge Function»
    participant IA as Gemini Flash-Lite
    participant C2 as RegisterManualAssessmentUseCase «control»
    participant A as SupabaseAssessmentRepository

    P ->> B: Enviar PDF
    B ->> Pk: getDocumentAsync(application/pdf)
    Pk -->> B: arquivo
    B ->> C1: execute(userId, bytes)
    alt não começa com %PDF ou passa de 15 MB
        C1 -->> B: falha dados-invalidos (nada sobe)
    else sem internet
        C1 -->> B: falha externa (nada sobe)
    else ok
        C1 ->> Rd: read(userId, bytes)
        Rd ->> St: upload userId/uuid.pdf (RLS)
        Rd ->> EF: POST {pdfPath} + JWT
        EF ->> EF: pasta do próprio usuário? até 6 PDFs em 24 h? %PDF?
        EF ->> St: download
        EF ->> IA: PDF em base64 + JSON Schema + data de hoje
        alt é uma avaliação
            IA -->> EF: peso, gordura, massa, medidas, data
            EF -->> Rd: 200 {assessment, model}
            Rd -->> C1: {pdfPath, extracted}
            C1 -->> B: sucesso
            B -->> P: formulário preenchido para conferir
        else não é avaliação, cota ou falha
            EF ->> St: remove(pdfPath)
            EF -->> Rd: 422, 503 ou 502 {error}
            Rd -->> C1: BusinessRuleError(mensagem)
            C1 -->> B: falha
            B -->> P: mensagem + "digite os números"
        end
    end
    P ->> B: confere, corrige e salva
    B ->> C2: execute({userId, pesos, medidas, data, pdfPath})
    C2 ->> C2: faixas, data não futura, PDF na pasta do usuário
    C2 ->> A: createManual(avaliação reviewed, source pdf)
    A -->> C2: avaliação salva
    C2 -->> B: sucesso
    B -->> P: volta para Avaliações
```

## 7.8 UC33 + UC34 — Apagar uma foto e restaurar no celular novo

```mermaid
sequenceDiagram
    actor P as Praticante
    participant B as FotosScreen «boundary»
    participant D as DeleteProgressPhotoUseCase «control»
    participant R as DrizzleProgressPhotoRepository «SQLite»
    participant F as LocalPhotoFiles «expo-file-system»
    participant Cl as R2ProgressPhotoCloud «photo-storage + R2»
    participant W as useWorkoutSync «Sistema de Sincronização»
    participant Rs as RestoreProgressPhotosUseCase «control»

    P ->> B: segura a foto e confirma "Apagar"
    B ->> D: execute(id)
    D ->> R: markDeleted(id)
    D ->> F: remove(localUri)
    B -->> P: foto some da galeria na hora
    alt online
        D ->> Cl: remove(photo)
        Cl -->> D: ok (objeto e reserva apagados)
        D ->> R: remove(id)
    else offline ou falha
        Note over R: tombstone espera o próximo gatilho
    end

    Note over W: celular novo: login e primeira rodada de sync
    W ->> Rs: execute(userId)
    Rs ->> R: knownIds(userId) (inclui tombstones)
    Rs ->> Cl: list(userId)
    Cl -->> Rs: fotos na nuvem
    loop cada foto que o aparelho não conhece
        Rs ->> Cl: download(remota) por URL assinada
        Cl -->> Rs: file:///documents/progress-photos/id.jpg
        Rs ->> R: save(ProgressPhoto synced, location null)
    end
```
