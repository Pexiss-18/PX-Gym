# Px GYM — Documentação de Análise e Projeto (mobile)

Especificação do aplicativo **Px GYM** (Expo/React Native, offline-first), produzida a partir do skill `mobile-design-doc`: UML (requisitos → casos de uso → classes → objetos → estados → fronteira/controle/entidade → sequência → atividades → componentes) + DDD, Clean Architecture e TDD.

A fonte é o código real deste repositório: cada diagrama cita as classes, arquivos e testes correspondentes. **Atualizada em 26/11/2026**, no commit `79623d2`, com 657 testes passando.

## Índice

| # | Documento | O que contém |
|---|---|---|
| 1 | [Requisitos](01-requisitos.md) | Contexto (plataformas, grau de offline, recursos nativos, serviços externos), 40 RFs em seis grupos e 15 RNFs com critérios mensuráveis |
| 2 | [Casos de uso](02-casos-de-uso.md) | 12 atores (com herança, ator de sincronização e os papéis do relatório), 5 diagramas com `include`/`extend`, 44 casos de uso e as descrições textuais com fluxo sem rede, de permissão negada e de falha da IA |
| 3 | [Classes e dados](03-classes-e-dados.md) | Três diagramas de classes (treino e planos; fotos, academias e sessão; relatório do ciclo), persistência local × remota, DER do SQLite e do Postgres, funções do banco, RLS |
| 4 | [Objetos](04-objetos.md) | Dia de treino com registros em três estados de sync e uma foto apagada esperando a nuvem; avaliação nova chegando depois do treino |
| 5 | [Estados](05-estados.md) | Ciclo de sync da série e da foto (com exclusão e restauração), avaliação, busca de academias, pedido de geração por IA e relatório do ciclo |
| 6 | [Fronteira, controle e entidade](06-fronteira-controle-entidade.md) | Diagramas de robustez e o mapeamento boundary/control/entity dos 44 casos de uso, no app e nas Edge Functions |
| 7 | [Sequência](07-sequencia.md) | Registrar série (com sync), desmarcar, foto (com R2), academias (com fontes em cadeia), login, gerar treino com IA, avaliação pelo PDF, apagar e restaurar foto |
| 8 | [Atividades](08-atividades.md) | Fluxos ponta a ponta com decisão de permissão, de conectividade e de "a IA passou nas regras?" |
| 9 | [Componentes](09-componentes.md) | Camadas do app, o servidor (Edge Functions, R2, Gemini), modo mock e as regras de dependência verificáveis |
| 10 | [Implementação](10-implementacao.md) | DDD, Clean Architecture, pirâmide de testes com a contagem real, rastreabilidade RF → UC → teste, histórico de evolução e lacunas |

Outros documentos desta pasta:

- **`projeto-mobile.md`** (+ `projeto-mobile.html` e `Px GYM - Documento de Projeto.pdf`) é o texto corrido entregue na disciplina. É a mesma verdade em formato narrativo; esta especificação é a visão UML e arquitetural. Para regerar o HTML e o PDF depois de editar o `.md`: `node docs/build-projeto.mjs` (ver o cabeçalho do script).
- **`apresentacao/`** reúne os decks HTML das apresentações (proposta, fase domínio e interface, SINTEC, câmera e GPS, prova) e os roteiros. Ver [`apresentacao/README.md`](apresentacao/README.md).

## Resumo do sistema

O Px GYM é um aplicativo de musculação que registra série e carga **durante o treino, sem rede**, e monta o treino e a dieta com IA a partir da avaliação corporal da pessoa. A avaliação pode ser digitada ou lida do PDF pela IA. O app mostra a progressão de carga, a composição corporal, o cardápio da semana, fotos de progresso (guardadas no aparelho e copiadas para a nuvem), leitor de QR dos aparelhos, guia de execução dos exercícios e academias por perto. Tem ainda um módulo de relatório do ciclo de treino, entre aluno, personal e coordenação, que roda em memória.

O SQLite do aparelho é a fonte da verdade no treino; o Supabase é destino eventual, nunca pré-requisito. Na IA vale a regra **"a IA propõe, a fórmula confere"**: catálogo fechado de exercícios, faixas de séries e descanso, calorias pela fórmula de Mifflin-St Jeor e porções recalculadas. Tudo roda no **plano gratuito**: Gemini Flash-Lite pelo AI Studio, Supabase, Cloudflare R2 (com trava de custo no servidor) e OpenStreetMap.

## Stack: referência da skill × adotada

| Camada | Skill | Px GYM | Desvio |
|---|---|---|---|
| Framework | Expo + React Native + Expo Router | Expo SDK 58, React Native 0.88, React 19.3, Expo Router 58, NativeWind 4, TypeScript 6 | — |
| Persistência local | `expo-sqlite` + Drizzle | `expo-sqlite` + Drizzle (com `useLiveQuery`): séries, fotos e cópia do treino | — |
| Backend/BaaS | Supabase | Supabase: Postgres + Auth + Storage (PDF) + **Edge Functions** (Deno) | Arquivos das fotos no **Cloudflare R2**, não no Storage (custo) |
| IA | — | Google Gemini Flash-Lite (Interactions API), atrás do port `ProvedorIA`, só nas Edge Functions | Escolhido por ter plano gratuito sem cartão |
| Câmera | `expo-camera` | `expo-camera` atrás de `CameraGateway` (foto) e `CameraView` direto (QR); `expo-image-manipulator` para o recorte 9:16 | No QR a câmera fica na tela ([§6](06-fronteira-controle-entidade.md#desvios-conscientes)) |
| Geolocalização | `expo-location` | `expo-location` atrás de `LocationGateway` (academias, local da foto, check-in) | — |
| Autenticação | Supabase Auth + `expo-secure-store` | Supabase Auth atrás de `AuthGateway`; sessão cifrada (LargeSecureStore) e `SessionStorage` do domínio | A sessão do Supabase passa de 2 KB e não cabe no SecureStore puro |
| Sincronização | Fila (`outbox`) + NetInfo + sync sob demanda | Coluna `sync_status` + tombstones + NetInfo/AppState; restauração das fotos | Sem tabela `sync_queue`: o registro é o item da fila ([§3](03-classes-e-dados.md)) |
| Conflito | Last-write-wins por `updated_at` | LWW por linha via `upsert onConflict: id` | Registros imutáveis dispensam `updated_at` |
| Testes | Jest + Testing Library (+ Detox) | Jest (ts-jest) em Node, `jest-expo` + Testing Library para hooks, telas e E2E em memória; Deno test nas Edge Functions | Sem E2E em aparelho ([§10](10-implementacao.md#lacunas-e-próximos-passos)) |
| Mapa | — | Apple Maps (iOS) / MapLibre + tiles OSM (Android) | Sem billing no Google Cloud |
| Academias | — | OpenStreetMap: Overpass, Nominatim e espelhos, com a última busca guardada | Gratuito e sem chave |

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
| 14 | Camadas da Clean Architecture sem SDK/ORM vazando para o domínio | ✔ [§10](10-implementacao.md#clean-architecture), verificável por `grep` |
| 15 | Plano de testes TDD por caso de uso | ✔ [§10](10-implementacao.md#tdd): 657 testes, telas e E2E em memória; falta E2E em aparelho |

## Como rodar as verificações

```bash
cd packages/core && npm test             # 383 testes: domínio e casos de uso
cd packages/db   && npm test             #  47 testes: adapters Supabase
cd apps/mobile   && npm test             # 168 testes: SQLite real, gateways, hooks, telas e E2E
cd apps/mobile   && npm run typecheck    # app + testes
npm run test:functions                   #  59 testes (Deno): regras da IA, R2, ntfy, leitura do PDF
```

Os diagramas são Mermaid e renderizam direto no GitHub. Os 39 diagramas desta pasta passam no parser do Mermaid 11.
