# Px GYM — Documentação de Análise e Projeto (mobile)

Documento de especificação do aplicativo **Px GYM** (Expo/React Native, offline-first), produzido a partir do skill `mobile-design-doc`: UML (requisitos → casos de uso → classes → objetos → estados → fronteira/controle/entidade → sequência → atividades → componentes) + DDD, Clean Architecture e TDD.

A fonte é o código real deste repositório — cada diagrama cita as classes, arquivos e testes correspondentes.

## Índice

| # | Documento | O que contém |
|---|---|---|
| 1 | [Requisitos](01-requisitos.md) | Contexto (plataformas, grau de offline, recursos nativos), 20 RFs e 12 RNFs com critérios mensuráveis |
| 2 | [Casos de uso](02-casos-de-uso.md) | Atores (com herança e ator de sincronização), diagramas com `include`/`extend`, descrições textuais com fluxo sem rede e de permissão negada |
| 3 | [Classes e dados](03-classes-e-dados.md) | Diagrama de classes, persistência local × remota, DER do SQLite e do Postgres, RLS |
| 4 | [Objetos](04-objetos.md) | Instantâneo de um dia de treino com registros em três estados de sync |
| 5 | [Estados](05-estados.md) | Ciclo de sync da série e da foto, ciclo de negócio da avaliação, estados da busca de academias |
| 6 | [Fronteira, controle e entidade](06-fronteira-controle-entidade.md) | Diagramas de robustez e mapeamento boundary/control/entity por caso de uso |
| 7 | [Sequência](07-sequencia.md) | Registrar série (com sync assíncrona), desmarcar, foto, academias, login |
| 8 | [Atividades](08-atividades.md) | Fluxos ponta a ponta com decisão de permissão e de conectividade |
| 9 | [Componentes](09-componentes.md) | Camadas, adapters, infra e as regras de dependência verificáveis |
| 10 | [Implementação](10-implementacao.md) | DDD, Clean Architecture, plano e inventário de testes, rastreabilidade RF→UC→teste, melhorias aplicadas e lacunas |

Outros documentos desta pasta: **`projeto-mobile.md`** (+ `.html` e PDF) é o texto corrido entregue na disciplina — mesma verdade, formato narrativo; esta especificação é a visão UML/arquitetural.

## Resumo do sistema

Aplicativo pessoal de musculação: registra série e carga **durante o treino, sem rede**, mostra progressão de carga, composição corporal, metas de macros, fotos de progresso, leitor de QR dos aparelhos e busca de academias por GPS. O SQLite do aparelho é a fonte da verdade no treino; o Supabase é destino eventual, nunca pré-requisito.

## Stack: referência da skill × adotada

| Camada | Skill | Px GYM | Desvio |
|---|---|---|---|
| Framework | Expo + React Native + Expo Router | Expo SDK 57, RN 0.86, Expo Router 57, NativeWind 4 | — |
| Persistência local | `expo-sqlite` + Drizzle | `expo-sqlite` + Drizzle (com `useLiveQuery`) | — |
| Backend/BaaS | Supabase | Supabase (Postgres + Auth + Storage) | — |
| Câmera | `expo-camera` | `expo-camera` (`CameraView`: foto e QR) | Sem `CameraGateway`: a captura depende do preview, que é UI ([§6](06-fronteira-controle-entidade.md#desvios-conscientes)) |
| Geolocalização | `expo-location` | `expo-location` atrás de `LocationGateway` | — |
| Autenticação | Supabase Auth + `expo-secure-store` | Supabase Auth atrás de `AuthGateway`; sessão cifrada (LargeSecureStore) | Sessão maior que 2 KB não cabe no SecureStore puro |
| Sincronização | Fila (`outbox`) + NetInfo + sync sob demanda | Coluna `sync_status` + tombstones + NetInfo/AppState | Sem tabela `sync_queue`: o registro é o item da fila ([§3](03-classes-e-dados.md)) |
| Conflito | Last-write-wins por `updated_at` | LWW por linha via `upsert onConflict: id` | Registros imutáveis dispensam `updated_at` |
| Testes | Jest + Testing Library (+ Detox) | Jest (ts-jest) em Node: domínio, use cases, adapters e SQLite real | Ainda sem teste de tela e sem E2E ([§10](10-implementacao.md#lacunas-e-próximos-passos)) |
| Mapa | — | Apple Maps (iOS) / MapLibre + tiles OSM (Android) | Sem billing no Google Cloud |
| Academias | — | OpenStreetMap via Overpass API | Gratuito e sem chave |

## Checklist do skill

| # | Item | Status |
|---|---|---|
| 1 | Requisitos funcionais e não funcionais, com categorias mobile (offline, permissões, bateria/dados, armazenamento, sincronização, segurança, compatibilidade) | ✔ [§1](01-requisitos.md) |
| 2 | Diagrama de casos de uso com atores (+ herança, + Sistema de Sincronização), `include`, `extend` | ✔ [§2](02-casos-de-uso.md) |
| 3 | Descrição textual dos casos de uso, com fluxo sem rede e de permissão negada | ✔ [§2](02-casos-de-uso.md#descrição-textual-dos-casos-de-uso-principais) |
| 4 | Classes com composição, agregação, herança, multiplicidades e atributos de sync | ✔ [§3](03-classes-e-dados.md#diagrama-de-classes) |
| 5 | Persistência local (SQLite) e remota (Supabase) por entidade | ✔ [§3](03-classes-e-dados.md#persistência-local--remota) |
| 6 | DER local e remoto, com RLS documentado | ✔ [§3.1](03-classes-e-dados.md#31-diagramas-entidade-relacionamento-der) |
| 7 | Diagrama de objetos validando estado misto (parcialmente sincronizado) | ✔ [§4](04-objetos.md) |
| 8 | Diagrama de estados do ciclo de sincronização (+ ciclo de negócio) | ✔ [§5](05-estados.md) |
| 9 | Fronteira/controle/entidade por caso de uso, com boundary de UI separado do de recurso nativo | ✔ [§6](06-fronteira-controle-entidade.md) |
| 10 | Sequência dos casos de uso principais, incluindo o fluxo assíncrono de sincronização | ✔ [§7](07-sequencia.md) |
| 11 | Atividades cobrindo decisão de permissão e de conectividade | ✔ [§8](08-atividades.md) |
| 12 | Componentes com camadas e gateways (câmera/localização/auth/sync) | ✔ [§9](09-componentes.md) |
| 13 | Mapeamento DDD (aggregates, entidades, VOs, repositories, gateways) | ✔ [§10](10-implementacao.md#ddd) |
| 14 | Camadas da Clean Architecture sem SDK/ORM vazando para o domínio | ✔ [§10](10-implementacao.md#clean-architecture) — verificável por `grep` |
| 15 | Plano de testes TDD por caso de uso | ✔ [§10](10-implementacao.md#tdd) — 157 testes; faltam tela e E2E |

## Como rodar as verificações

```bash
cd packages/core && npx jest          # 113 testes: domínio e casos de uso
cd packages/db   && npx jest          #  19 testes: adapters Supabase
cd apps/mobile   && npx jest          #  25 testes: SQLite real e gateways nativos
cd apps/mobile   && npm run typecheck  # app + testes
```
