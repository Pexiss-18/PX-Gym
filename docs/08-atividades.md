# 8 · Diagramas de Atividades

[← Sequência](07-sequencia.md) · [Índice](README.md) · [Próximo: Componentes →](09-componentes.md)

Um diagrama por processo ponta a ponta. Os dois pontos de ramificação típicos de app mobile — **permissão** e **conectividade** — aparecem explicitamente.

## 8.1 Registrar série e sincronizar (UC07 → UC20)

**Raias.** *Praticante*: ajusta carga e marca. *App (primeiro plano)*: grava no SQLite, redesenha, dispara o descanso. *Sistema de Sincronização*: tenta o envio agora e em cada gatilho seguinte. *Supabase*: aceita ou recusa o `upsert`.

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

**Raias.** *Praticante*: concede permissão e dispara. *App*: captura, move o arquivo, grava. *Sistema de Sincronização*: sobe a foto quando houver rede. *Supabase Storage*.

```mermaid
flowchart TD
    Start((Início)) --> A1["Toca Tirar foto de hoje"]
    A1 --> D1{"Permissão de câmera concedida?"}
    D1 -- Não --> A2["Cartão explicando o uso da câmera"]
    A2 --> D2{"Usuário escolhe"}
    D2 -- Agora não --> Out((Volta sem foto))
    D2 -- Permitir câmera --> A3["Diálogo do sistema"]
    A3 --> D1
    D1 -- Sim --> A4["Preview; usuário dispara"]
    A4 --> A5["Captura JPEG 0,85 no cache"]
    A5 --> A6["Move para documents/progress-photos"]
    A6 --> A7["Grava ProgressPhoto pending no SQLite"]
    A7 --> D3{"Há conexão?"}
    D3 -- Não --> A8["Galeria mostra a foto com ponto âmbar"]
    A8 --> A9["Aguarda gatilho de sync"]
    A9 --> D3
    D3 -- Sim --> A10["Envia bytes ao bucket e upsert da linha"]
    A10 --> D4{"Upload confirmado?"}
    D4 -- Sim --> A11["Marca synced: ponto volt"]
    D4 -- Não --> A8
    A11 --> End((Fim))
```

## 8.3 Encontrar academias (UC17)

**Raias.** *Praticante*: abre a tela e concede permissão. *App*: `FindNearbyGymsUseCase` + `ExpoLocationGateway`. *GPS do aparelho*. *OpenStreetMap (Overpass)*.

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
    D2 -- Sim --> A9["Consulta Overpass num raio de 4 km"]
    A9 --> D4{"Resposta ok?"}
    D4 -- Não --> E2["Não deu pra buscar agora + Tentar de novo"]
    E2 --> A9
    D4 -- Sim --> A10["Distância haversine, corta pelo raio, ordena"]
    A10 --> A11["Mapa + lista por distância"]
    A11 --> End((Fim))
```

Em nenhum dos três processos a posição, a falta de rede ou a falta de permissão derruba o app ou prende o usuário: todo caminho termina em um estado com ação possível (repetir, sair, abrir configurações) — é o RNF02/RNF03 visto como fluxo.
