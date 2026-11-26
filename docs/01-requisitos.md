# 1 · Levantamento de Requisitos

[← Índice](README.md) · [Próximo: Casos de uso →](02-casos-de-uso.md)

## Contexto que orienta os requisitos

| Pergunta | Resposta no Px GYM |
|---|---|
| **Domínio** | Treino de musculação (séries e cargas, progressão), treino e dieta montados por IA a partir da avaliação corporal, composição corporal, fotos de progresso, academias por perto e o relatório do ciclo de treino entre aluno, personal e coordenação. |
| **Usuário-alvo** | O **praticante** de musculação, que usa o app sozinho e só vê os próprios dados. No módulo de relatórios do ciclo entram mais dois papéis: o **personal**, que avalia e assina, e a **coordenação**, que aprova ou devolve. |
| **Plataformas** | Android (APK pelo EAS Build) e iOS (Expo Go), no Expo **managed workflow**, sem pastas `android/` e `ios/` versionadas. O único módulo nativo que o Expo Go não tem é o MapLibre (mapa no Android), que só roda no APK. |
| **Grau de offline-first** | **Total no fluxo de treino**: abrir o treino ativo, registrar e desmarcar séries, ver carga anterior e curva de progressão, tirar, ver e apagar fotos, ler o QR do aparelho e abrir o guia do exercício funcionam em modo avião. **Online por decisão**: gerar ou mudar treino e dieta, ler o PDF da avaliação, registrar avaliação e buscar academias. São operações que dependem do servidor ou de serviço externo. |
| **Recursos nativos** | **Câmera** (foto de progresso em 9:16 e leitor de QR do aparelho), **geolocalização** (academias num raio de 4 km, local da foto e check-in do treino do ciclo), **seletor de documentos** (PDF da avaliação), **autenticação** (Supabase Auth com a sessão cifrada no aparelho) e **háptico**. |
| **Serviços externos** | Supabase (Postgres, Auth, Storage e Edge Functions), Google Gemini Flash-Lite pelo AI Studio, Cloudflare R2 (arquivos das fotos), OpenStreetMap (Overpass e Nominatim) e ntfy (aviso ao administrador). Todos no plano gratuito. |

Para decidir o que é offline, o critério foi este: é offline tudo que a pessoa **produz** ou **consulta durante o treino**, porque perder esse dado é perder o treino. É online o que nasce fora do aparelho, como o plano gerado pela IA, a leitura do PDF e o mapa. O treino gerado é uma exceção calculada: ele nasce no servidor, mas fica copiado no aparelho, porque sem ele a aba Treino não abre na academia.

## Requisitos funcionais (RF)

Formato: `RFxx — Verbo + objeto + condição`. A coluna **UC** liga cada requisito ao caso de uso da [seção 2](02-casos-de-uso.md). A rastreabilidade até os testes está na [seção 10](10-implementacao.md#rastreabilidade-rf--caso-de-uso--teste).

### Conta e sessão

| ID | Descrição | Prioridade | Ator/Origem | UC |
|---|---|---|---|---|
| RF01 | App deve autenticar o usuário por e-mail e senha, recusando e-mail malformado e senha vazia sem ir à rede | Alta | Visitante | UC01 |
| RF02 | App deve criar conta validando formato de e-mail, senha com no mínimo 6 caracteres e confirmação de senha; se o provedor exigir confirmação por e-mail, deve avisar em vez de ficar carregando | Alta | Visitante | UC02 |
| RF03 | App deve encerrar a sessão com confirmação, inclusive sem rede | Média | Praticante | UC03 |
| RF04 | App deve manter a sessão entre aberturas, abrindo direto na área logada, mesmo offline | Alta | Praticante | UC01 |

### Treino

| ID | Descrição | Prioridade | Ator/Origem | UC |
|---|---|---|---|---|
| RF05 | App deve exibir o painel do dia: sequência de dias treinados, faixa dos últimos 7 dias, treino do dia, resumo corporal e meta de calorias | Alta | Praticante | UC04 |
| RF06 | App deve montar o treino do dia a partir do plano ativo: sugerir o dia seguinte ao da última sessão que bate com o plano, permitir escolher outro dia e mostrar o progresso de séries de cada exercício | Alta | Praticante | UC05 |
| RF07 | App deve registrar uma série concluída com a carga usada, gravando no aparelho sem depender de rede | Alta | Praticante | UC07 |
| RF08 | App deve mostrar a carga anterior do exercício e o delta de progressão ao registrar a série; a meta de carga de cada série é a maior carga da última sessão daquele exercício | Alta | Praticante | UC08 |
| RF09 | App deve iniciar o cronômetro de descanso ao concluir uma série e cancelá-lo se a série for desmarcada | Média | Praticante | UC09, UC10 |
| RF10 | App deve permitir desmarcar uma série; se ela já estiver na nuvem, a exclusão deve ser propagada ao backend na próxima sincronização | Alta | Praticante | UC10 |
| RF11 | App deve exibir a curva de progressão de carga do exercício, atualizada ao vivo a cada série | Média | Praticante | UC08 |
| RF12 | App deve abrir a tela do exercício ao ler o QR code do aparelho (`pxgym://treino/<id>` ou id puro) de qualquer exercício do catálogo, inclusive de outro dia do plano, e avisar quando o código não é de exercício | Média | Praticante | UC06 |
| RF30 | App deve abrir o treino ativo sem internet, a partir da cópia guardada no aparelho na última leitura ou geração | Alta | Praticante | UC05 |
| RF31 | App deve mostrar, na tela do exercício, o guia de execução (nível, músculos, passo a passo) e um atalho para vídeos do exercício | Baixa | Praticante | UC31 |

### Perfil, avaliação e planos gerados por IA

| ID | Descrição | Prioridade | Ator/Origem | UC |
|---|---|---|---|---|
| RF21 | App deve salvar o perfil de treino (sexo, nascimento, altura, objetivo, nível, dias por semana, minutos por treino, regiões com dor e restrições), com idade entre 14 e 90 anos, altura entre 120 e 230 cm, 2 a 6 dias e 20 a 120 minutos, preservando o que a IA aprendeu nos pedidos de mudança | Alta | Praticante | UC23 |
| RF22 | App deve registrar a avaliação corporal digitada (peso obrigatório entre 30 e 300 kg; gordura entre 2% e 70%; massa muscular menor que o peso; medidas entre 10 e 250 cm; data que não esteja no futuro), já como revisada | Alta | Praticante | UC24 |
| RF23 | App deve ler o PDF da avaliação com IA e preencher o formulário com os números lidos, para a pessoa conferir antes de salvar; recusa arquivo que não é PDF ou que passa de 15 MB, e o servidor limita a 6 leituras por dia | Média | Praticante | UC25 |
| RF16 | App deve listar as avaliações com a origem (PDF ou digitada) e o status | Média | Praticante | UC15 |
| RF15 | App deve exibir a evolução de peso, gordura e massa magra e a variação das medidas entre avaliações | Média | Praticante | UC14 |
| RF24 | App deve gerar o treino da semana com IA a partir da avaliação revisada mais recente e do perfil, usando só exercícios do catálogo fechado e deixando de fora os que sobrecarregam regiões marcadas ou que a academia não tem | Alta | Praticante | UC26 |
| RF25 | App deve gerar a dieta com IA com metas de calorias e macros conferidas por fórmula e refeições com 2 ou 3 opções equivalentes, cujas porções são calculadas pela fórmula | Alta | Praticante | UC27 |
| RF17 | App deve exibir a dieta ativa: meta diária, macros, orientação e o cardápio do dia, que alterna as opções ao longo da semana e aceita troca manual de opção | Média | Praticante | UC16 |
| RF26 | App deve aceitar pedido de mudança no treino ou na dieta em texto livre (3 a 500 caracteres) e guardar no perfil o que o pedido ensinou (aparelho que a academia não tem, alimento que a pessoa não come) | Média | Praticante | UC28 |
| RF27 | App deve colocar o pedido na fila quando a cota da IA acabar e permitir retomá-lo depois | Média | Praticante | UC29 |
| RF28 | Servidor deve limitar a geração a 8 pedidos por pessoa em 24 h, 2 planos do zero por avaliação e por parte (treino ou dieta) e 5 pedidos de mudança por avaliação e por parte | Alta | Equipe | UC26–UC28 |
| RF29 | App deve avisar, no treino e na dieta, quando existe avaliação revisada mais nova que a usada no plano ativo, e oferecer gerar o plano de novo | Média | Praticante | UC30 |

### Fotos de progresso

| ID | Descrição | Prioridade | Ator/Origem | UC |
|---|---|---|---|---|
| RF13 | App deve capturar a foto de progresso pela câmera, recortá-la em retrato 9:16 (1080×1920) e guardá-la no armazenamento permanente do aparelho antes de qualquer envio; quando houver permissão, guarda também onde a foto foi tirada | Alta | Praticante | UC11, UC12 |
| RF14 | App deve exibir a galeria a partir dos arquivos locais, indicando quais já estão na nuvem, e abrir cada foto em tela cheia com data e local | Média | Praticante | UC13, UC32 |
| RF32 | App deve apagar a foto na hora para a pessoa e remover a cópia da nuvem assim que houver conexão | Média | Praticante | UC33 |
| RF33 | App deve trazer de volta as fotos que estão na nuvem e não estão no aparelho (reinstalação ou celular novo), sem ressuscitar foto recém-apagada | Média | Sistema de Sincronização | UC34 |

### Academias e sincronização

| ID | Descrição | Prioridade | Ator/Origem | UC |
|---|---|---|---|---|
| RF18 | App deve encontrar academias num raio de 4 km a partir da localização atual, em mapa e lista ordenada por distância; se todas as fontes caírem, mostra a última busca guardada, recalculada para a posição atual e com a data dela | Média | Praticante | UC17, UC18 |
| RF19 | App deve sincronizar automaticamente séries, exclusões, fotos pendentes, fotos apagadas e fotos a restaurar ao abrir, ao reconectar e ao voltar ao primeiro plano | Alta | Sistema de Sincronização | UC20–UC22, UC34 |
| RF20 | App deve mostrar quantos registros estão pendentes e permitir sincronizar manualmente, diferenciando "sem conexão" de "servidor não respondeu" | Média | Praticante | UC19 |

### Relatório do ciclo de treino

| ID | Descrição | Prioridade | Ator/Origem | UC |
|---|---|---|---|---|
| RF34 | App deve permitir ao aluno registrar um ou mais treinos do ciclo (data dentro do ciclo, descrição, horas de 0 a 4, check-in de GPS opcional), tudo ou nada | Média | Aluno | UC35 |
| RF35 | App deve permitir ao personal avaliar o aluno e ao aluno se autoavaliar por critérios com nota de 0 a 10 em passos de 0,5 (faixas MB ≥ 9, B ≥ 7, R ≥ 5, F) | Média | Personal, Aluno | UC36, UC37 |
| RF36 | App deve coletar a assinatura desenhada de aluno e personal, só depois de cumpridas as horas mínimas e registradas as duas avaliações; com as duas assinaturas o relatório vai para aprovação | Média | Aluno, Personal | UC38 |
| RF37 | App deve permitir à coordenação aprovar o relatório ou devolvê-lo com motivo de pelo menos 10 caracteres; a devolução apaga as assinaturas | Média | Coordenação | UC39, UC40 |
| RF38 | App deve gerar o PDF só de relatório aprovado e com as assinaturas já sincronizadas | Baixa | Aluno, Coordenação | UC41 |
| RF39 | App deve permitir ao personal sem conta entrar com o código que o aluno gerou, recusando código expirado ou revogado | Baixa | Personal | UC42 |
| RF40 | App deve listar os relatórios de quem está logado (aluno e personal veem os próprios; a coordenação vê todos) e sincronizar a fila de itens do relatório | Baixa | Todos | UC43, UC44 |

> **O módulo de relatórios ainda não persiste.** Ele foi construído na fase "domínio e interface primeiro". Os casos de uso, as regras e as telas estão prontos e testados, mas os repositórios são `Map` em memória com dados de demonstração, e o PDF e a sincronização são simulados. Ligar SQLite e Supabase nele está nas [lacunas](10-implementacao.md#lacunas-e-próximos-passos).

## Requisitos não funcionais (RNF)

Formato: `RNFxx — categoria: descrição + critério mensurável`. Todas as categorias mobile da skill foram avaliadas, inclusive as que ainda não se aplicam.

| ID | Categoria | Descrição e critério | Prioridade | Origem |
|---|---|---|---|---|
| RNF01 | Offline-first | Com o aparelho em modo avião, 100% das ações do fluxo de treino (RF06–RF12, RF30, RF31) e das fotos (RF13, RF14, RF32) funcionam e ficam gravadas; nada se perde ao fechar o app. | Alta | Equipe |
| RNF02 | Offline-first | Telas que dependem de rede (Avaliações, Progresso, Nutrição, geração de planos, Academias) nunca ficam com spinner infinito: mostram estado de erro com explicação e ação de repetir. Sem internet, os casos de uso de geração e leitura de PDF recusam **antes** de chamar o servidor. | Alta | Equipe |
| RNF03 | Permissões | Câmera e localização são pedidas **só** na tela que as usa e **só** depois de um toque do usuário, nunca na abertura do app. Toda tela de permissão tem saída ("Agora não"); permissão bloqueada de vez oferece "Abrir configurações". Os textos de permissão, em pt-BR, explicam a finalidade (declarados no `app.json`). | Alta | Equipe |
| RNF04 | Privacidade | Localização só em primeiro plano ("when in use"), leitura pontual, precisão `Balanced`. A posição da busca de academias não é gravada. O local da foto fica só no SQLite do aparelho: não sobe com a imagem e não volta na restauração. | Alta | Equipe |
| RNF05 | Bateria e dados | Sincronização só por gatilhos (abertura, reconexão, foreground, manual), sem polling. A galeria lê o arquivo local (0 bytes de rede para rolar). Foto em 1080×1920, JPEG 92% (cerca de 0,3 a 0,5 MB). Os bytes vão do aparelho direto ao R2 por URL assinada, sem passar pelo JavaScript nem pelo servidor. | Média | Equipe |
| RNF06 | Armazenamento local | Fotos no diretório de documentos do app (nunca no cache, que o sistema pode limpar). Tombstones são apagados depois da confirmação remota. Não há política de limpeza de dados antigos, porque uma série ocupa cerca de 200 bytes e o treino em cache é uma linha por pessoa. Fica registrado como trabalho futuro. | Baixa | Equipe |
| RNF07 | Sincronização / consistência | Id UUID gerado no cliente e envio por `upsert onConflict: id`, então reenviar N vezes é o mesmo que enviar 1. Política *last-write-wins* por linha. Séries e fotos são imutáveis (corrigir é apagar e registrar de novo), então não há edição concorrente a resolver. Ordem: pendentes antes de exclusões nas séries e exclusões antes de envios nas fotos, para liberar espaço. Falha mantém tudo `pending`. | Alta | Equipe |
| RNF08 | Segurança | A sessão fica persistida cifrada (AES-256-CTR, com a chave no Keychain/Keystore via `expo-secure-store`, no padrão *LargeSecureStore*). RLS em todas as tabelas remotas (`auth.uid() = user_id`) e no Storage (primeira pasta = `auth.uid()`). Tabelas de controle (`plan_generations`, `workout_plans`, reservas de foto, alertas) só são escritas pelas Edge Functions. As chaves `service_role`, `GEMINI_API_KEY` e as do R2 vivem só como *secrets* do Supabase, nunca no app. | Alta | Equipe |
| RNF09 | Compatibilidade | Android e iOS nas versões mínimas do Expo SDK 58. Validado em emulador Android (Pixel 7) com APK de preview e em iPhone pelo Expo Go. No Android, a tela Academias exige o APK, porque o MapLibre não existe no Expo Go. | Média | Equipe |
| RNF10 | Usabilidade | O estado de sincronização fica sempre visível (ponto volt ou âmbar em cada foto, contagem de pendências em Configurações). Falha de sync nunca abre modal no meio do treino. A carga é ajustada por stepper de 2,5 kg (sem teclado), com háptico ao marcar e desmarcar. Os formulários têm a barra "Confirmar" acima do teclado e o campo focado sempre à vista. | Alta | Equipe |
| RNF11 | Desempenho | Marcar uma série não espera rede: grava no SQLite e a tela se redesenha pela consulta reativa (`useLiveQuery`). Meta de resposta ao toque abaixo de 100 ms, **ainda não medida** formalmente. A geração por IA mostra o progresso enquanto espera e nunca bloqueia outras telas. | Média | Equipe |
| RNF12 | Manutenibilidade / testabilidade | O domínio (`packages/core`) não importa nenhum pacote externo (verificável por grep) e roda em Node puro. Todo caso de uso tem teste com fakes em memória. A cobertura mínima de 80% (linhas, funções, branches) é exigida pelo Jest em `@px/core` e no mobile. | Alta | Equipe |
| RNF13 | Custo | Orçamento zero: só planos gratuitos e sem cartão de crédito para uso. O R2 tem trava de custo no servidor: 9 GB no total, 300 MB por pessoa e 2 MB por foto. O espaço é reservado antes de a URL de envio ser assinada, e o administrador recebe aviso pelo ntfy a partir de 80% e quando enche. A pessoa nunca vê esse aviso: a foto só fica aguardando envio. | Alta | Equipe |
| RNF14 | Confiabilidade da IA | **"A IA propõe, a fórmula confere."** Toda resposta da IA passa por validação de esquema e por regras determinísticas. O treino é conferido contra o catálogo, os vetos e as faixas de séries, repetições e descanso. As calorias ficam a até 15% da referência de Mifflin-St Jeor e nunca abaixo da taxa basal, a proteína entre 1,4 e 2,4 g/kg e a gordura entre 0,6 e 1,2 g/kg; as porções das refeições são recalculadas. Resposta que as regras não conseguem consertar conta como falha do modelo, e o próximo modelo é tentado. | Alta | Equipe |
| RNF15 | Disponibilidade da IA | Cadeia de modelos com cotas independentes (`gemini-3.5-flash-lite` e depois `gemini-3.1-flash-lite`), com a ordem trocável por *secret* sem novo deploy. Se todos esgotarem a cota, o pedido vai para a fila (HTTP 202) em vez de falhar. | Média | Equipe |

## Como os requisitos viram arquitetura

| Requisito | Decisão de projeto que ele força | Onde aparece |
|---|---|---|
| RNF01, RNF07 | SQLite local como fonte da verdade no treino; fila de sync = coluna `sync_status`; tombstone para exclusão | [§3](03-classes-e-dados.md), [§5](05-estados.md) |
| RF30 | Cópia do treino ativo no SQLite (`workout_plan_cache`) e `LoadActiveWorkoutPlanUseCase` que cai na cópia quando o servidor não responde | [§3](03-classes-e-dados.md), [§7](07-sequencia.md#76-uc26--gerar-o-treino-com-ia) |
| RNF03 | Fluxo alternativo "permissão negada ou bloqueada" nos casos de uso UC11, UC17 e UC35; decisão de permissão nos diagramas de atividade | [§2](02-casos-de-uso.md), [§8](08-atividades.md) |
| RNF04, RNF05 | Gateways de localização e câmera pontuais (`LocationGatewayExpo`, `CameraGatewayExpo`); sync por eventos no hook `useWorkoutSync` | [§6](06-fronteira-controle-entidade.md), [§9](09-componentes.md) |
| RNF08 | `LargeSecureStore` no client Supabase; RLS por tabela; Edge Functions com `service_role` só no servidor | [§3.1](03-classes-e-dados.md#31-diagramas-entidade-relacionamento-der) |
| RNF12 | Ports no domínio, adapters na borda, composition roots em `apps/mobile/src/lib` e `apps/mobile/src/adapters/composicao.ts` | [§9](09-componentes.md), [§10](10-implementacao.md) |
| RNF13 | Função `reserve_photo_storage` com *advisory lock*; URL de envio assinada com tamanho e tipo; `claim_admin_alert` para no máximo um aviso por dia | [§3.1](03-classes-e-dados.md#schema-remoto--supabase--postgres-supabasemigrations), [§7](07-sequencia.md#73-uc11--registrar-foto-de-progresso) |
| RNF14, RNF15 | Port `ProvedorIA` na Edge Function, `gerarComReserva` com a cadeia de modelos, regras em `_shared/plano/regras.ts` e tabela `plan_generations` como fila e base dos limites | [§5](05-estados.md#55-pedido-de-geração-de-plano-plan_generations), [§8](08-atividades.md#84-gerar-a-dieta-uc27) |
