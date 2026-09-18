# 5 · Diagramas de Estados

[← Objetos](04-objetos.md) · [Índice](README.md) · [Próximo: Fronteira, controle e entidade →](06-fronteira-controle-entidade.md)

O Px GYM tem dois ciclos de **sincronização** (série e foto), um ciclo de **negócio** independente (avaliação física) e a máquina de estados da **busca de academias**, que organiza a tela mais cheia de caminhos alternativos. Os ciclos de sync e de negócio ficam em diagramas separados, como pede a skill.

## 5.1 Ciclo de sincronização de `SetLog`

Persistidos: `pending`, `synced`, `deleted` (coluna `sync_status`). **Transitórios** (existem só durante a execução do caso de uso): *Sincronizando*, *Erro*, *PropagandoExclusão*.

```mermaid
stateDiagram-v2
    [*] --> Pendente : RegisterSetUseCase (id do cliente)

    state "Pendente · pending" as Pendente
    state "Sincronizando" as Sincronizando
    state "Sincronizado · synced" as Sincronizado
    state "Erro (transitório)" as Erro
    state "Excluído localmente · deleted" as Excluido
    state "Propagando exclusão" as Propagando

    Pendente --> Sincronizando : gatilho (abertura, NetInfo, foreground, manual) e online
    Pendente --> Pendente : gatilho offline (resultado offline, sem requisição)
    Sincronizando --> Sincronizado : upsert onConflict id confirmado
    Sincronizando --> Erro : backend recusa ou não responde
    Erro --> Pendente : linha continua pending, próximo gatilho tenta de novo
    Pendente --> [*] : desmarcar antes do envio (DELETE local, nada a avisar)

    Sincronizado --> Excluido : desmarcar (UnregisterSetUseCase marca tombstone)
    Excluido --> Propagando : gatilho e online (depois dos pendentes)
    Propagando --> [*] : delete remoto confirmado, então DELETE local
    Propagando --> Excluido : falha (tombstone preservado)
```

Regras que o diagrama impõe e onde estão no código:

- **Não existe `Sincronizado → Pendente`.** A skill prevê "nova edição local"; aqui o `SetLog` é imutável — corrigir carga é desmarcar e marcar de novo, gerando um id novo. Isso elimina conflito de edição.
- A troca de estado nunca é "solta": só acontece por `SetLog.markSynced()` / `markDeleted()` (entidade) e pelos casos de uso `RegisterSet`, `UnregisterSet` e `SyncPendingSetLogs`.
- *Erro* não é persistido de propósito: como a sincronização só roda em gatilhos (sem laço), não há risco de martelar o servidor, e a linha `pending` já é o "retry". A consequência — um registro que o servidor rejeita sempre bloqueia o lote — está nas [lacunas](10-implementacao.md#lacunas-e-próximos-passos).

## 5.2 Ciclo de upload de `ProgressPhoto`

```mermaid
stateDiagram-v2
    state "Capturada (cache da câmera)" as Cache
    state "Pendente · pending (documents + SQLite)" as Pendente
    state "Enviando" as Enviando
    state "Sincronizada · synced" as Sincronizada

    [*] --> Cache : takePictureAsync (JPEG 0.85)
    Cache --> Pendente : persistCapture move o arquivo e SaveProgressPhotoUseCase grava a linha
    Pendente --> Enviando : online (na hora da captura ou no próximo gatilho)
    Enviando --> Sincronizada : bytes no bucket e upsert da linha remota
    Enviando --> Pendente : falha (cada foto falha sozinha)
    Sincronizada --> Sincronizada : galeria continua lendo o arquivo local
```

O passo *Cache → Pendente* é o que torna a foto durável: o cache pode ser limpo pelo sistema a qualquer momento; `documents/` não. Foto não tem exclusão pelo app hoje, por isso não há estado `deleted`.

## 5.3 Ciclo de negócio de `BodyAssessment` (produzido pelo web)

```mermaid
stateDiagram-v2
    state "processing" as Processing
    state "pending_review" as PendingReview
    state "reviewed" as Reviewed
    state "error" as Err

    [*] --> Processing : PDF enviado no web
    Processing --> PendingReview : IA extraiu os dados
    Processing --> Err : extração falhou
    PendingReview --> Reviewed : usuário revisou no web
    Reviewed --> [*]
```

O mobile **só lê** esse ciclo: a lista de avaliações mostra o status, e as métricas corporais usam avaliações `reviewed` ou `pending_review` que tenham dados extraídos. A regra "só gera plano nutricional de avaliação revisada" mora no `GenerateNutritionPlanUseCase` do core.

## 5.4 Estados da busca de academias

Os estados são exatamente os resultados do `FindNearbyGymsUseCase` — a tela só os desenha.

```mermaid
stateDiagram-v2
    state "Buscando" as Buscando
    state "Precisa de permissão" as Permissao
    state "Permissão bloqueada" as Bloqueada
    state "Sem localização" as SemLocal
    state "Busca falhou" as Falhou
    state "Encontradas" as Encontradas

    [*] --> Buscando : tela abre (só consulta a permissão)
    Buscando --> Permissao : undetermined ou denied
    Buscando --> Bloqueada : denied sem poder perguntar
    Buscando --> SemLocal : sem fix e sem última posição
    Buscando --> Falhou : Overpass fora ou sem rede
    Buscando --> Encontradas : mapa + lista por distância
    Permissao --> Buscando : toque em Permitir localização (askPermission)
    Bloqueada --> Buscando : volta das configurações do sistema (AppState active)
    SemLocal --> Buscando : Tentar de novo
    Falhou --> Buscando : Tentar de novo
```
