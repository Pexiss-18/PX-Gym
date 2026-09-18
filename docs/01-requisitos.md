# 1 · Levantamento de Requisitos

[← Índice](README.md) · [Próximo: Casos de uso →](02-casos-de-uso.md)

## Contexto que orienta os requisitos

| Pergunta | Resposta no Px GYM |
|---|---|
| **Domínio** | Registro de treino de musculação (séries e cargas), progressão de carga, composição corporal (avaliações físicas), metas nutricionais e fotos de progresso. |
| **Usuário-alvo** | Praticante individual de musculação. É o único papel do sistema: não há treinador, nutricionista nem administrador, e ninguém enxerga dados de outra pessoa. |
| **Plataformas** | Android (APK via EAS Build) e iOS (Expo Go 57). Expo **managed workflow**, sem pastas `android/`/`ios/` versionadas; o único módulo nativo fora do Expo Go é o MapLibre (mapa no Android), que só roda no APK. |
| **Grau de offline-first** | **Total para o fluxo de treino**: registrar e desmarcar séries, ver carga anterior e curva de progressão, tirar e ver fotos funcionam em modo avião. **Online-only por decisão**: avaliações, plano nutricional, gráficos de composição corporal e busca de academias — dados que nascem fora do aparelho. |
| **Recursos nativos** | **Câmera** (foto de progresso + leitor de QR do aparelho da academia), **geolocalização** (academias num raio de 4 km), **autenticação** (Supabase Auth, sessão cifrada no aparelho). |

Critério usado para decidir o que é offline: é offline tudo que o usuário **produz** no aparelho durante o treino (perder esse dado é perder o treino); é online o que ele apenas **consulta** e que muda em outro lugar (laudo, plano, mapa).

## Requisitos funcionais (RF)

Formato: `RFxx — Verbo + objeto + condição`. A coluna **UC** liga cada requisito ao caso de uso da [seção 2](02-casos-de-uso.md); a rastreabilidade até os testes está na [seção 10](10-implementacao.md#rastreabilidade-rf--caso-de-uso--teste).

| ID | Descrição | Prioridade | Ator/Origem | UC |
|---|---|---|---|---|
| RF01 | App deve autenticar o usuário por e-mail e senha, recusando e-mail malformado e senha vazia sem ir à rede | Alta | Visitante | UC01 |
| RF02 | App deve criar conta validando formato de e-mail, senha com no mínimo 6 caracteres e confirmação de senha; se o provedor exigir confirmação por e-mail, deve avisar em vez de ficar carregando | Alta | Visitante | UC02 |
| RF03 | App deve encerrar a sessão com confirmação, inclusive sem rede | Média | Praticante | UC03 |
| RF04 | App deve manter a sessão entre aberturas, abrindo direto na área logada, mesmo offline | Alta | Praticante | UC01 |
| RF05 | App deve exibir o painel do dia: sequência de dias treinados, faixa dos últimos 7 dias, treino do dia e resumo corporal | Alta | Praticante | UC04 |
| RF06 | App deve listar os exercícios do treino do dia com o progresso de séries de cada um | Alta | Praticante | UC05 |
| RF07 | App deve registrar uma série concluída com a carga usada, gravando no aparelho sem depender de rede | Alta | Praticante | UC07 |
| RF08 | App deve mostrar a carga anterior do exercício e o delta de progressão ao registrar a série | Alta | Praticante | UC08 |
| RF09 | App deve iniciar o cronômetro de descanso ao concluir uma série e cancelá-lo se a série for desmarcada | Média | Praticante | UC09, UC10 |
| RF10 | App deve permitir desmarcar uma série; se ela já estiver na nuvem, a exclusão deve ser propagada ao backend na próxima sincronização | Alta | Praticante | UC10 |
| RF11 | App deve exibir a curva de progressão de carga do exercício, atualizada ao vivo a cada série | Média | Praticante | UC08 |
| RF12 | App deve abrir a tela do exercício ao ler o QR code do aparelho (`pxgym://treino/<id>` ou id puro), avisando quando o código não pertence ao treino do dia | Média | Praticante | UC06 |
| RF13 | App deve capturar foto de progresso pela câmera e guardá-la no armazenamento permanente do aparelho antes de qualquer envio | Alta | Praticante | UC11, UC12 |
| RF14 | App deve exibir a galeria de fotos a partir dos arquivos locais, indicando quais já estão na nuvem | Média | Praticante | UC13 |
| RF15 | App deve exibir a evolução de peso, gordura e massa magra e a variação das medidas entre avaliações | Média | Praticante | UC14 |
| RF16 | App deve listar as avaliações físicas com o status de processamento | Média | Praticante | UC15 |
| RF17 | App deve exibir as metas de calorias e macronutrientes do plano nutricional vigente | Média | Praticante | UC16 |
| RF18 | App deve encontrar academias num raio de 4 km a partir da localização atual, em mapa e lista ordenada por distância | Média | Praticante | UC17, UC18 |
| RF19 | App deve sincronizar automaticamente séries, exclusões e fotos pendentes ao abrir, ao reconectar e ao voltar ao primeiro plano | Alta | Sistema de Sincronização | UC20–UC22 |
| RF20 | App deve mostrar quantos registros estão pendentes e permitir sincronizar manualmente, diferenciando "sem conexão" de "servidor não respondeu" | Média | Praticante | UC19 |

> **Parcial:** RF06 usa um treino do dia fixo em código (`apps/mobile/src/lib/mock-data.ts`). Não existe tabela de planos de treino; a montagem de treino é trabalho futuro e já tem o port `WorkoutRepository` esperando implementação.

## Requisitos não funcionais (RNF)

Formato: `RNFxx — categoria: descrição + critério mensurável`. Todas as categorias mobile da skill estão avaliadas, inclusive as que ainda não se aplicam.

| ID | Categoria | Descrição e critério | Prioridade | Origem |
|---|---|---|---|---|
| RNF01 | Offline-first | Com o aparelho em modo avião, 100% das ações do fluxo de treino (RF07–RF11, RF13, RF14) funcionam e ficam gravadas; nada é perdido ao fechar o app. | Alta | Equipe |
| RNF02 | Offline-first | Telas que dependem de rede (Avaliações, Nutrição, Progresso, Academias) nunca ficam com spinner infinito: mostram estado de erro com ícone "sem nuvem", explicação e ação de repetir. | Alta | Equipe |
| RNF03 | Permissões | Câmera e localização são pedidas **só** na tela que as usa e **só** após um toque do usuário, nunca no cold start. Toda tela de permissão tem saída ("Agora não"); permissão bloqueada de vez oferece "Abrir configurações". Textos de permissão em pt-BR explicam a finalidade (declarados no `app.json`). | Alta | Equipe |
| RNF04 | Permissões / privacidade | Localização apenas em primeiro plano ("when in use"), leitura pontual, precisão `Balanced`; a posição não é gravada no SQLite nem enviada ao Supabase. | Alta | Equipe |
| RNF05 | Bateria e dados | Sincronização só por gatilhos (abertura, reconexão, foreground, manual) — zero polling. Galeria lê arquivo local (0 bytes de rede para rolar). Foto em JPEG qualidade 0,85. | Média | Equipe |
| RNF06 | Armazenamento local | Fotos ficam no diretório de documentos do app (nunca no cache, que o SO pode limpar). Tombstones são apagados após a confirmação remota. **Sem política de limpeza de dados antigos** — não se aplica ainda: uma série ocupa ~200 bytes. Registrado como trabalho futuro. | Baixa | Equipe |
| RNF07 | Sincronização / consistência | Id UUID gerado no cliente; envio por `upsert onConflict: id` (reenviar N vezes = enviar 1). Política *last-write-wins* por linha. Séries são imutáveis (corrigir = desmarcar e marcar de novo), então não há edição concorrente a resolver. Ordem: pendentes antes de exclusões. Falha mantém tudo `pending`. | Alta | Equipe |
| RNF08 | Segurança | Sessão persistida cifrada (AES-256-CTR, chave no Keychain/Keystore via `expo-secure-store` — padrão *LargeSecureStore*); credencial nunca em texto puro no `AsyncStorage`. RLS em todas as tabelas remotas (`auth.uid() = user_id`) e no Storage (primeira pasta = `auth.uid()`). Nenhuma chave `service_role` no app. | Alta | Equipe |
| RNF09 | Compatibilidade | Android e iOS nas versões mínimas do Expo SDK 57. Validado em emulador Android (Pixel 7) com APK de preview e em iPhone via Expo Go 57. Tela Academias no Android exige o APK (MapLibre não existe no Expo Go). | Média | Equipe |
| RNF10 | Usabilidade | Estado de sincronização sempre visível: ponto volt/âmbar em cada foto e contagem de pendências em Configurações. Falha de sync nunca abre modal no meio do treino. Carga ajustada por stepper de 2,5 kg (sem teclado), feedback háptico em marcar/desmarcar. | Alta | Equipe |
| RNF11 | Desempenho | Marcar uma série não espera rede: grava no SQLite e a tela se redesenha pela consulta reativa (`useLiveQuery`). Meta: resposta ao toque abaixo de 100 ms — **não medida** formalmente. | Média | Equipe |
| RNF12 | Manutenibilidade / testabilidade | O domínio (`packages/core`) não importa nenhum pacote externo (verificável por grep) e roda em Node puro; todo caso de uso tem teste com fakes em memória. | Alta | Equipe |

## Como os requisitos viram arquitetura

| Requisito | Decisão de projeto que ele força | Onde aparece |
|---|---|---|
| RNF01, RNF07 | SQLite local como fonte da verdade durante o treino; fila de sync = coluna `sync_status`; tombstone para exclusão | [§3](03-classes-e-dados.md), [§5](05-estados.md) |
| RNF03 | Fluxo alternativo "permissão negada/bloqueada" nos casos de uso UC11, UC17; decisão de permissão nos diagramas de atividade | [§2](02-casos-de-uso.md), [§8](08-atividades.md) |
| RNF04, RNF05 | Gateway de localização pontual (`ExpoLocationGateway`); sync por eventos no hook `useWorkoutSync` | [§6](06-fronteira-controle-entidade.md), [§9](09-componentes.md) |
| RNF08 | `LargeSecureStore` no client Supabase; políticas RLS por tabela | [§3.1](03-classes-e-dados.md#31-diagramas-entidade-relacionamento-der) |
| RNF12 | Ports no domínio, adapters na borda, composition roots em `apps/mobile/src/lib` | [§9](09-componentes.md), [§10](10-implementacao.md) |
