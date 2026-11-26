# 8 · Diagramas de Atividades

[← Sequência](07-sequencia.md) · [Índice](README.md) · [Próximo: Componentes →](09-componentes.md)

Um diagrama por processo ponta a ponta. Os dois pontos de ramificação típicos de app mobile, **permissão** e **conectividade**, aparecem explicitamente. Nos processos com IA aparece um terceiro: **a resposta da IA passou nas regras?**

## 8.1 Registrar série e sincronizar (UC07 → UC20)

**Raias.** *Praticante*: ajusta a carga e marca. *App (primeiro plano)*: grava no SQLite, redesenha e dispara o descanso. *Sistema de Sincronização*: tenta o envio agora e em cada gatilho seguinte. *Supabase*: aceita ou recusa o `upsert`.

```mermaid
flowchart TD
    Start((Início)) --> A1["Praticante ajusta a carga (±2,5 kg)"]
    A1 --> A2["Toca o check da série"]
    A2 --> D0{"Escrita dessa série já em andamento?"}
    D0 -- Sim --> Ign["Ignora o toque"]
    D0 -- Não --> A3["Lê a última carga do exercício no SQLite"]
    A3 --> A4["Cria SetLog pending com UUID do cliente"]
    A4 --> A5["Grava no SQLite"]
    A5 --> A6["Tela marca a série, mostra delta e inicia descanso"]
    A6 --> A7["useLiveQuery atualiza curva, painel e pendências"]
    A6 --> D1{"Há conexão? (NetInfo)"}
    D1 -- Não --> A8["Fica pending; aguarda gatilho: reconexão, foreground, abertura ou manual"]
    A8 --> D1
    D1 -- Sim --> A9["upsert em set_logs (onConflict id)"]
    A9 --> D2{"Servidor confirmou?"}
    D2 -- Sim --> A10["Marca synced"]
    D2 -- Não --> A11["Resultado error; continua pending"]
    A11 --> A8
    A10 --> End((Fim))
    A7 --> End
```

## 8.2 Registrar foto de progresso (UC11)

**Raias.** *Praticante*: concede permissão e dispara. *App*: captura, ajusta, move o arquivo e grava. *Sistema de Sincronização*: sobe a foto quando houver rede. *Edge Function `photo-storage`* e *Cloudflare R2*.

```mermaid
flowchart TD
    Start((Início)) --> A1["Toca Tirar foto de hoje"]
    A1 --> D1{"Permissão de câmera concedida?"}
    D1 -- Não --> A2["Cartão explicando o uso da câmera"]
    A2 --> D2{"Usuário escolhe"}
    D2 -- Agora não --> Out((Volta sem foto))
    D2 -- Permitir câmera --> A3["Diálogo do sistema (ou configurações, se bloqueada)"]
    A3 --> D1
    D1 -- Sim --> A4["Preview com as faixas do recorte; usuário dispara"]
    A4 --> A5["Captura sem perda, recorta 9x16, 1080x1920, JPEG 92%"]
    A5 --> A6["Move para documents/progress-photos"]
    A6 --> D5{"Localização permitida e com sinal?"}
    D5 -- Sim --> A6b["Guarda latitude e longitude (só no aparelho)"]
    D5 -- Não --> A6c["Segue sem posição"]
    A6b --> A7["Grava ProgressPhoto pending no SQLite"]
    A6c --> A7
    A7 --> D3{"Há conexão?"}
    D3 -- Não --> A8["Galeria mostra a foto com ponto âmbar"]
    A8 --> A9["Aguarda gatilho de sync"]
    A9 --> D3
    D3 -- Sim --> A10["photo-storage reserva o espaço"]
    A10 --> D6{"Cabe na cota (2 MB, 300 MB, 9 GB)?"}
    D6 -- Não --> A12["507: avisa o administrador pelo ntfy; foto segue pending, sem aviso à pessoa"]
    A12 --> A8
    D6 -- Sim --> A13["PUT no R2 pela URL assinada e upsert da linha"]
    A13 --> D4{"Upload confirmado?"}
    D4 -- Sim --> A11["Marca synced: ponto volt"]
    D4 -- Não --> A8
    A11 --> End((Fim))
```

## 8.3 Encontrar academias (UC17)

**Raias.** *Praticante*: abre a tela e concede permissão. *App*: `FindNearbyGymsUseCase` + `LocationGatewayExpo` + última busca guardada. *GPS do aparelho*. *OpenStreetMap (Overpass e Nominatim)*.

```mermaid
flowchart TD
    Start((Início)) --> A1["Abre Academias"]
    A1 --> A2["Consulta a permissão sem abrir diálogo"]
    A2 --> D1{"Permissão?"}
    D1 -- bloqueada --> A3["Mostra Abrir configurações"]
    A3 --> A4["Usuário libera no sistema e volta ao app"]
    A4 --> A2
    D1 -- não decidida ou negada --> A5["Mostra Permitir localização"]
    A5 --> A6["Toque: diálogo do sistema"]
    A6 --> D1
    D1 -- concedida --> A7["Pede posição atual (precisão balanceada)"]
    A7 --> D2{"Saiu fix novo?"}
    D2 -- Não --> A8["Usa a última posição conhecida"]
    A8 --> D3{"Existe alguma?"}
    D3 -- Não --> E1["Não achamos sua localização + Tentar de novo"]
    E1 --> A7
    D3 -- Sim --> A9
    D2 -- Sim --> A9["Overpass principal, Nominatim, espelhos (a primeira que responder)"]
    A9 --> D4{"Alguma fonte respondeu?"}
    D4 -- Sim --> A10["Guarda a busca no aparelho; haversine, corta pelo raio, ordena"]
    D4 -- Não --> D5{"Busca guardada com academia no raio da posição atual?"}
    D5 -- Sim --> A12["Mostra a última busca, com a data dela"]
    D5 -- Não --> E2["Não deu pra buscar agora + Tentar de novo"]
    E2 --> A9
    A10 --> A11["Mapa + lista por distância"]
    A12 --> A11
    A11 --> End((Fim))
```

## 8.4 Gerar a dieta (UC27)

**Raias.** *Praticante*: pede a dieta. *App*: `GenerateDietPlanUseCase`. *Edge Function `generate-plan`*: limites, IA e regras. *Gemini*. *Postgres*: RPC que grava tudo ou nada.

```mermaid
flowchart TD
    Start((Início)) --> A1["Toca Gerar minha dieta (ou Atualizar, no cartão da avaliação nova)"]
    A1 --> D1{"Internet, perfil e avaliação revisada no aparelho?"}
    D1 -- Não --> E1["Mensagem com o que falta e atalho para resolver"]
    E1 --> End0((Fim))
    D1 -- Sim --> A2["Envia {assessmentId, part: nutrition} com o JWT"]
    A2 --> D2{"Dentro dos limites? (8 por dia, 2 dietas por avaliação)"}
    D2 -- Não --> E2["429: orienta pedir mudança ou enviar avaliação nova"]
    E2 --> End0
    D2 -- Sim --> A3["Registra o pedido (generating)"]
    A3 --> A4["Próximo modelo da cadeia recebe acervo, perfil, avaliação e faixas-alvo"]
    A4 --> D3{"Modelo respondeu?"}
    D3 -- cota esgotada --> D4{"Ainda há modelo na cadeia?"}
    D4 -- Sim --> A4
    D4 -- "Não (só cota)" --> E3["Pedido na fila (202): Tentar de novo mais tarde"]
    E3 --> End0
    D3 -- Sim --> A5["Valida o JSON com o esquema"]
    A5 --> A6["Fórmula confere as metas: calorias a até 15% de Mifflin-St Jeor, nunca abaixo da basal, proteína e gordura por kg"]
    A6 --> A7["Recalcula cada opção a partir dos alimentos e escala as porções (sistema 2x2 de calorias e proteína)"]
    A7 --> D5{"Regras conseguiram consertar?"}
    D5 -- Não --> D6{"Ainda há modelo na cadeia?"}
    D6 -- Sim --> A4
    D6 -- Não --> E4["502: pedido em error, Tentar de novo"]
    E4 --> End0
    D5 -- Sim --> A8["RPC desativa a dieta anterior e grava a nova (done)"]
    A8 --> A9["App lê a dieta gravada e mostra metas e cardápio do dia"]
    A9 --> End((Fim))
```

O treino (UC26) é o mesmo processo, com outras regras no passo de conferência. Os exercícios precisam existir no catálogo, ficar fora dos vetados (regiões sensíveis e indisponíveis) e não se repetir no dia. O plano precisa ter um dia por dia pedido, e séries, repetições e descanso ficam em faixas sãs. O nome e o grupo muscular vêm do catálogo, não da IA. Depois de gravar, o app guarda a cópia do treino no SQLite.

## 8.5 Registrar a avaliação (UC24 com UC25)

```mermaid
flowchart TD
    Start((Início)) --> A1["Abre Nova avaliação"]
    A1 --> D1{"Tem o PDF da avaliação?"}
    D1 -- Não --> A6["Digita os números"]
    D1 -- Sim --> A2["Escolhe o PDF no seletor"]
    A2 --> D2{"É PDF, até 15 MB, e há internet?"}
    D2 -- Não --> E1["Mensagem; pode digitar os números"]
    E1 --> A6
    D2 -- Sim --> A3["Sobe para assessments/usuario/uuid.pdf e chama extract-assessment"]
    A3 --> D3{"A IA achou uma avaliação?"}
    D3 -- "Não, ou limite e cota" --> E2["PDF apagado; mensagem sugerindo digitar"]
    E2 --> A6
    D3 -- Sim --> A4["Formulário preenchido com os números lidos"]
    A4 --> A5["Pessoa confere e corrige"]
    A5 --> A7
    A6 --> A7["Salvar"]
    A7 --> D4{"Peso presente e tudo nas faixas? Data não futura?"}
    D4 -- Não --> E3["Diz o que corrigir"]
    E3 --> A7
    D4 -- Sim --> A8["Grava a avaliação como reviewed (source pdf ou manual)"]
    A8 --> A9["Treino e dieta passam a mostrar o cartão Avaliação nova"]
    A9 --> End((Fim))
```

## 8.6 Fechar o relatório do ciclo (UC35 → UC41)

**Raias.** *Aluno*: registra treinos, se autoavalia e assina. *Personal*: avalia e assina. *Coordenação*: aprova ou devolve. *App*: o agregado `CicloAvaliacao` decide o que é permitido; a fila sobe cada item.

```mermaid
flowchart TD
    Start((Início)) --> A1["Aluno registra os treinos do ciclo (check-in opcional pelo GPS)"]
    A1 --> A2["Personal avalia por critérios; aluno se autoavalia"]
    A2 --> D1{"Horas mínimas cumpridas e as duas avaliações feitas?"}
    D1 -- Não --> E1["Tela lista as pendências"]
    E1 --> A1
    D1 -- Sim --> A3["Aluno e personal assinam no quadro"]
    A3 --> D2{"As duas assinaturas?"}
    D2 -- Não --> A3
    D2 -- Sim --> A4["Ciclo vai sozinho para aguardando aprovação"]
    A4 --> D3{"Coordenação decide"}
    D3 -- Devolver --> D4{"Motivo com 10 caracteres ou mais?"}
    D4 -- Não --> E2["Pede um motivo melhor"]
    E2 --> D3
    D4 -- Sim --> A5["Devolvido: assinaturas apagadas, conteúdo destravado"]
    A5 --> A1
    D3 -- Aprovar --> A6["Aprovado"]
    A6 --> D5{"Assinaturas já sincronizadas?"}
    D5 -- Não --> A7["Sincroniza a fila"]
    A7 --> D5
    D5 -- Sim --> A8["Gera o PDF do relatório"]
    A8 --> End((Fim))
```

Em nenhum desses processos a posição, a falta de rede, a falta de permissão ou uma resposta ruim da IA derruba o app ou prende o usuário. Todo caminho termina num estado com ação possível: repetir, sair, abrir configurações, digitar à mão ou tentar depois. É o RNF02/RNF03 visto como fluxo.
