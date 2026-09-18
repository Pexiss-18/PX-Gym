# 7 · Diagramas de Sequência

[← Fronteira, controle e entidade](06-fronteira-controle-entidade.md) · [Índice](README.md) · [Próximo: Atividades →](08-atividades.md)

Os participantes têm os mesmos nomes da tabela da [§6](06-fronteira-controle-entidade.md#tabela-de-mapeamento-por-caso-de-uso) e a ordem das chamadas é a que os testes da [§10](10-implementacao.md) verificam. Toda ação de escrita mostra **dois momentos separados**: (1) gravação local, síncrona do ponto de vista do usuário e que não falha por falta de rede; (2) sincronização remota, assíncrona e condicionada à conectividade.

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
    participant Cam as CameraView «expo-camera»
    participant FS as persistCapture «expo-file-system»
    participant C as SaveProgressPhotoUseCase «control»
    participant R as DrizzleProgressPhotoRepository «SQLite»
    participant N as ConnectivityStatus «NetInfo»
    participant Up as SupabaseProgressPhotoUploader «Storage»

    P ->> B: abre a câmera
    alt permissão não concedida
        B -->> P: cartão "Acesso à câmera" + Permitir / Agora não
    end
    P ->> B: toca o disparador
    B ->> Cam: takePictureAsync({quality: 0.85})
    Cam -->> B: uri no cache
    B ->> FS: persistCapture(uri)
    FS -->> B: file:///documents/progress-photos/uuid.jpg
    B ->> C: execute({userId, localUri})
    C ->> R: save(photo pending)
    C ->> N: isOnline()
    alt online
        C ->> Up: upload(photo)
        alt ok
            Up -->> C: userId/photoId.jpg
            C ->> R: markUploaded(id, path)
        else falha
            Up -->> C: erro (foto segue pending)
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
    participant Loc as ExpoLocationGateway «expo-location»
    participant F as OverpassGymFinder «OSM»

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
    F -->> C: academias candidatas
    C ->> C: haversine, corta pelo raio, ordena
    C -->> B: found {center, gyms}
    B -->> P: mapa + lista por distância
```

## 7.5 UC01 — Entrar (com falha de rede)

```mermaid
sequenceDiagram
    actor V as Visitante
    participant B as LoginScreen «boundary»
    participant Ctx as AuthProvider «composition root»
    participant C as SignInUseCase «control»
    participant A as SupabaseAuthGateway «Supabase Auth»
    participant Root as Stack.Protected «layout raiz»

    V ->> B: e-mail + senha, Entrar
    B ->> Ctx: signIn(email, senha)
    Ctx ->> C: execute({email, password})
    alt e-mail malformado ou senha vazia
        C -->> Ctx: rejected (sem ir à rede)
    else dados válidos
        C ->> A: signIn(email normalizado, senha)
        alt aceito
            A -->> C: ok
            C -->> Ctx: signed-in
            Note over Root: onAuthStateChange entrega a sessão e o grupo (app) monta
        else sem rede / projeto pausado
            A -->> C: network
            C -->> Ctx: rejected: network
        else credencial errada
            A -->> C: invalid-credentials
            C -->> Ctx: rejected: invalid-credentials
        end
    end
    Ctx -->> B: mensagem em pt-BR (ou nada, se entrou)
```
