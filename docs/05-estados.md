# 5 · Diagramas de Estados

[← Objetos](04-objetos.md) · [Índice](README.md) · [Próximo: Fronteira, controle e entidade →](06-fronteira-controle-entidade.md)

O Px GYM tem dois ciclos de **sincronização** (série e foto) e três ciclos de **negócio** independentes: a avaliação física, o pedido de geração de plano e o relatório do ciclo de treino. Tem também a máquina de estados da **busca de academias**, que organiza a tela com mais caminhos alternativos. Como pede a skill, os ciclos de sync e os de negócio ficam em diagramas separados.

## 5.1 Ciclo de sincronização de `SetLog`

Persistidos: `pending`, `synced`, `deleted` (coluna `sync_status`). **Transitórios**, que existem só durante a execução do caso de uso: *Sincronizando*, *Erro*, *PropagandoExclusão*.

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

- **Não existe `Sincronizado → Pendente`.** A skill prevê "nova edição local", mas aqui o `SetLog` é imutável: corrigir carga é desmarcar e marcar de novo, o que gera um id novo. Isso elimina conflito de edição.
- A troca de estado nunca é "solta": só acontece por `SetLog.markSynced()` / `markDeleted()` (entidade) e pelos casos de uso `RegisterSet`, `UnregisterSet` e `SyncPendingSetLogs`.
- *Erro* não é persistido de propósito. Como a sincronização só roda em gatilhos (sem laço), não há risco de martelar o servidor, e a linha `pending` já faz o papel de "retry". A consequência é que um registro que o servidor sempre rejeita bloqueia o lote inteiro; isso está nas [lacunas](10-implementacao.md#lacunas-e-próximos-passos).

## 5.2 Ciclo de vida de `ProgressPhoto`

```mermaid
stateDiagram-v2
    state "Capturada (cache da câmera)" as Cache
    state "Ajustada (9x16, 1080x1920, JPEG 92%)" as Ajustada
    state "Pendente · pending (documents + SQLite)" as Pendente
    state "Enviando" as Enviando
    state "Sincronizada · synced" as Sincronizada
    state "Apagada · deleted (tombstone)" as Apagada
    state "Na nuvem, fora do aparelho" as SoNuvem

    [*] --> Cache : takePictureAsync (qualidade 1)
    Cache --> Ajustada : recorteRetrato + ImageManipulator (original descartado)
    Ajustada --> Pendente : persistCapture move o arquivo, SaveProgressPhotoUseCase grava a linha
    Pendente --> Enviando : online (na hora da captura ou no próximo gatilho)
    Enviando --> Sincronizada : reserva ok, PUT no R2 e upsert da linha remota
    Enviando --> Pendente : falha ou nuvem cheia (507)
    Sincronizada --> Sincronizada : galeria continua lendo o arquivo local

    Pendente --> Apagada : apagar (arquivo local sai na hora)
    Sincronizada --> Apagada : apagar (arquivo local sai na hora)
    Apagada --> [*] : R2 confirmou a remoção, então DELETE local
    Apagada --> Apagada : sem rede ou nuvem falhou

    [*] --> SoNuvem : reinstalação ou celular novo
    SoNuvem --> Sincronizada : RestoreProgressPhotosUseCase baixa (sem posição)
```

- O passo *Cache → Pendente* é o que torna a foto durável: o cache pode ser limpo pelo sistema a qualquer momento, e `documents/` não.
- **Até foto `pending` vira tombstone** ao ser apagada. O upload pode ter chegado ao servidor sem a confirmação voltar, e aí a restauração a traria de volta. O tombstone mantém o id em `knownIds`, e a restauração não o toca.
- **Nuvem cheia não é erro para a pessoa.** O 507 da `photo-storage` vira `CloudStorageFullError`: a rodada para de enviar (as próximas também seriam recusadas), a foto fica `pending` e só o administrador é avisado.

## 5.3 Ciclo de negócio de `BodyAssessment`

```mermaid
stateDiagram-v2
    state "processing" as Processing
    state "pending_review" as PendingReview
    state "reviewed" as Reviewed
    state "error" as Err

    [*] --> Reviewed : app grava a avaliação conferida (digitada ou lida do PDF)
    [*] --> Processing : PDF enviado no web (pipeline legado)
    Processing --> PendingReview : IA extraiu os dados
    Processing --> Err : extração falhou
    PendingReview --> Reviewed : usuário revisou no web
    Reviewed --> [*]
```

No app, a avaliação **nasce revisada**. A pessoa conferiu cada número no formulário, tanto quando digitou quanto quando a IA leu o PDF. Por isso o fluxo do app não passa por `processing` nem `pending_review`: a leitura do PDF (`extract-assessment`) só devolve números, sem gravar nada. Os outros estados continuam no modelo porque o web ainda os produz e a lista de avaliações os mostra. A regra "só gera plano de avaliação revisada" mora em três lugares, por defesa em profundidade: `GenerateWorkoutPlanUseCase`/`GenerateDietPlanUseCase` (usam `latestReviewed`), a Edge Function `generate-plan` (409 se não estiver revisada) e o antigo `GenerateNutritionPlanUseCase`.

## 5.4 Estados da busca de academias

Os estados são exatamente os resultados do `FindNearbyGymsUseCase`; a tela só os desenha.

```mermaid
stateDiagram-v2
    state "Buscando" as Buscando
    state "Precisa de permissão" as Permissao
    state "Permissão bloqueada" as Bloqueada
    state "Sem localização" as SemLocal
    state "Busca falhou" as Falhou
    state "Encontradas (busca nova)" as Encontradas
    state "Encontradas (última busca guardada)" as DoCache

    [*] --> Buscando : tela abre (só consulta a permissão)
    Buscando --> Permissao : undetermined ou denied
    Buscando --> Bloqueada : denied sem poder perguntar
    Buscando --> SemLocal : sem fix e sem última posição
    Buscando --> Encontradas : alguma fonte respondeu (guarda a busca)
    Buscando --> DoCache : todas as fontes caíram e a busca guardada tem academia no raio
    Buscando --> Falhou : todas caíram e não há busca guardada útil
    Permissao --> Buscando : toque em Permitir localização (askPermission)
    Bloqueada --> Buscando : volta das configurações do sistema (AppState active)
    SemLocal --> Buscando : Tentar de novo
    Falhou --> Buscando : Tentar de novo
    DoCache --> Buscando : Tentar de novo
```

*Encontradas (última busca guardada)* mostra a data da busca (`cachedAt`), com as distâncias recalculadas para a posição **atual**. Se a pessoa saiu de perto e nenhuma academia guardada fica no raio, o estado é *Busca falhou*, e não "nenhuma academia", porque essa resposta seria falsa.

## 5.5 Pedido de geração de plano (`plan_generations`)

Cada toque em "Gerar", "Pedir mudança" ou "Tentar de novo" é um pedido. A tabela é ao mesmo tempo a **fila** (pedidos `queued`) e a **base dos limites** (os pedidos `done` contam por avaliação, os que não são `error` contam por dia). Só o servidor escreve nela.

```mermaid
stateDiagram-v2
    state "generating" as Gerando
    state "queued (cota da IA esgotada)" as Fila
    state "done" as Feito
    state "error" as Erro

    [*] --> Recusado : limite (429), perfil (422), avaliação não revisada (409)
    [*] --> Gerando : pedido aceito (initial ou revision)
    Gerando --> Feito : resposta passou nas regras e a RPC gravou o plano
    Gerando --> Fila : todos os modelos sem cota (HTTP 202)
    Gerando --> Erro : modelos falharam ou resposta sem conserto (HTTP 502)
    Fila --> Gerando : Tentar de novo (generationId, só o dono)
    Feito --> [*]
    Erro --> [*]
    Recusado --> [*]
```

- *Recusado* não chega a virar linha: a recusa acontece antes do `insert`. Os mesmos pré-requisitos são conferidos antes no aparelho, para nem gastar a viagem.
- Ao entrar em *Feito*, a RPC desativa o plano anterior da mesma parte na mesma transação. Por isso nunca existem dois treinos ativos, nem um instante sem nenhum.
- Os pedidos antigos `part = both`, de quando treino e dieta saíam juntos, não são retomados por esta versão.

## 5.6 Ciclo de negócio do relatório (`StatusCiclo`)

```mermaid
stateDiagram-v2
    state "em_andamento" as Andamento
    state "aguardando_aprovacao" as Aguardando
    state "aprovado" as Aprovado
    state "devolvido" as Devolvido

    [*] --> Andamento : CicloAvaliacao.abrir
    Andamento --> Andamento : registrar treinos, avaliar, autoavaliar, primeira assinatura
    Andamento --> Aguardando : segunda assinatura (horas mínimas e duas avaliações cumpridas)
    Aguardando --> Aprovado : coordenação aprova
    Aguardando --> Devolvido : coordenação devolve (motivo com 10+ caracteres, apaga as assinaturas)
    Devolvido --> Devolvido : corrigir treinos e avaliações, assinar de novo
    Devolvido --> Aguardando : as duas assinaturas de novo
    Aprovado --> [*] : PDF liberado depois que as assinaturas sincronizarem
```

`editavel` é verdadeiro só em `em_andamento` e `devolvido` **e enquanto ninguém assinou**: a primeira assinatura trava o conteúdo, e só a devolução (que apaga as assinaturas) o destrava. Fora disso, registrar treino ou avaliação lança `BusinessRuleError`. Cada item do relatório (treino, avaliação, assinatura) tem também o próprio `StatusSincronizacao` (`pending → synced`, ou `error` → volta para a fila na próxima rodada). Diferente das séries, aqui o `error` **é persistido**, porque a tela do relatório mostra o que falhou e o `SincronizacaoService` prioriza o que espera há mais tempo.
