# Px GYM — Documento de Projeto

**Aplicativo mobile offline-first para registro de treino, composição corporal e nutrição, com treino e dieta montados por IA.**

| | |
|---|---|
| **Documento** | Descrição de projeto — desenvolvimento mobile |
| **Autores** | Paulo Rogério · Assis Damasceno |
| **Plataforma** | Android e iOS (React Native / Expo) |
| **Data** | Agosto de 2026 · revisado em novembro de 2026 |
| **Stack do app** | Expo SDK 58 · React Native 0.88 · Expo Router 58 · expo-sqlite + Drizzle ORM · NativeWind |
| **Backend** | Supabase (Postgres, Auth, Storage, Edge Functions) · Cloudflare R2 · Google Gemini · OpenStreetMap |

> O Px GYM é usado no pior lugar possível para depender de rede: dentro da academia, entre uma série e outra, com uma mão só. Por isso o aplicativo foi construído com o banco local como fonte da verdade durante o treino: cada série marcada é gravada no SQLite do aparelho e só depois empurrada para o Supabase, quando houver conexão. Sobre essa base, o app monta o treino e a dieta com inteligência artificial a partir da avaliação corporal, sempre com a regra de que a IA propõe e a fórmula confere. Este documento descreve o escopo, a navegação, a estratégia offline-first, o backend, o uso de câmera e GPS, a arquitetura de código e o uso de IA no projeto.

### Sumário

1. [Visão geral e escopo](#1--visão-geral-e-escopo)
2. [Interface e navegação · Expo Router](#2--interface-e-navegação)
3. [Estratégia offline-first · SQLite](#3--estratégia-offline-first)
4. [Backend e sincronização · Supabase](#4--backend-e-sincronização)
5. [Integração com hardware e sensores](#5--hardware-e-sensores)
6. [Arquitetura e padrões de código](#6--arquitetura-e-padrões-de-código)
7. [Inteligência artificial · Gemini](#7--inteligência-artificial)

---

## 1 · Visão geral e escopo

### Tema e objetivo

O Px GYM reúne em um único aplicativo informações que hoje vivem separadas na rotina de quem treina: **o registro do treino** (qual carga foi usada em cada série), **a evolução da composição corporal** (peso, percentual de gordura, massa magra, medidas), **o plano de treino e a dieta** (o que fazer em cada dia e o que comer) e **as fotos de progresso**. O objetivo é que o usuário consiga responder "estou evoluindo?" em poucos toques, saber o que treinar hoje e registrar a série sem fricção.

O problema central não é só de organização, é de *contexto de uso*. O momento em que o dado precisa ser registrado é logo depois de terminar a série, e é exatamente quando o usuário está em pé, suado, com o celular numa mão e, com frequência, sem sinal: sala de peso livre no subsolo, Wi-Fi da academia sobrecarregado, plano de dados no fim do mês. Um app que exija rede para salvar uma série simplesmente não é usável nesse cenário. Daí a decisão que organiza todo o resto do projeto: **o registro do treino funciona 100% offline**, e a nuvem é um destino eventual, nunca um pré-requisito. Isso vale também para o plano de treino: ele nasce no servidor, mas fica copiado no aparelho.

Um segundo problema que o app resolve é a **progressão de carga**. Planilhas e apps genéricos guardam o histórico, mas obrigam o usuário a garimpar "quanto eu levantei da última vez?". No Px GYM, a meta de carga de cada série já vem preenchida com a maior carga da última sessão daquele exercício, a carga anterior aparece junto ao campo de registro, e a curva de progressão é desenhada na mesma tela.

O terceiro é **montar o plano**. Quem treina sozinho raramente sabe dividir os grupos musculares na semana, ou calcular quanta proteína comer para o próprio peso. O app pede o perfil uma vez (objetivo, experiência, dias disponíveis, lesões) e a avaliação corporal, que pode ser digitada ou lida do PDF da bioimpedância. Com isso, a IA monta o treino da semana e a dieta com cardápio. Ela só escolhe exercícios de um catálogo fechado, e as metas de calorias e macros são conferidas por fórmula antes de chegar à tela (seção 7).

### Público-alvo

O usuário final é o **praticante individual de musculação** que acompanha o próprio progresso: treina com regularidade, faz avaliação física periódica (a cada algumas semanas) e quer um plano que acompanhe essa evolução. Ele é o dono de todos os seus dados, e nenhum usuário enxerga dados de outro. Essa decisão aparece diretamente na segurança do backend: todas as tabelas têm Row Level Security ligada com política de dono (`auth.uid() = user_id`), conforme a seção 4.

O app também tem um módulo de **relatório do ciclo de treino**, construído na fase "domínio e interface primeiro". Nele, o aluno registra os treinos do ciclo, o **personal** avalia e assina, e a **coordenação** da academia aprova ou devolve. As regras e as telas desse módulo estão prontas e testadas, mas ele ainda roda com repositórios em memória.

Existe ainda uma aplicação web (Next.js) que fala com o mesmo Supabase. Na primeira versão do projeto era por ela que a avaliação em PDF entrava. Hoje o próprio app faz isso, e o web ficou parado (seção 6).

### Casos de uso principais

A coluna "offline" indica o comportamento sem conexão; a justificativa de cada caso está na seção 3.

| Caso de uso | O que o usuário faz | Offline |
|---|---|---|
| Entrar ou criar conta | Autentica com e-mail e senha; a sessão fica guardada cifrada no aparelho. | Só reabrir |
| Ver o dia | Abre o app e vê sequência de dias treinados, faixa da semana, treino do dia, resumo corporal e meta de calorias. | Parcial |
| Preencher o perfil de treino | Informa objetivo, experiência, dias por semana, tempo por treino, idade, altura e regiões com dor. | Não |
| Registrar a avaliação corporal | Digita peso, gordura, massa muscular e medidas, ou envia o PDF da bioimpedância e confere o que a IA leu. | Não |
| Gerar o treino ou a dieta | Pede à IA o treino da semana ou a dieta com cardápio, a partir da avaliação mais recente. | Não |
| Pedir mudança no plano | Escreve "minha academia não tem leg press" ou "não como carne vermelha" e recebe o plano ajustado. | Não |
| Executar o treino do dia | Abre o dia sugerido (ou escolhe outro) e acompanha quantas séries já fechou. | **Sim** |
| Registrar uma série | Ajusta a carga, marca a série concluída e dispara o cronômetro de descanso. | **Sim** |
| Desmarcar uma série | Corrige um toque errado; o descanso é cancelado e o registro é removido. | **Sim** |
| Ver progressão de carga | Consulta a curva de carga do exercício e a comparação com a sessão anterior. | **Sim** |
| Ver como fazer o exercício | Lê o passo a passo e os músculos trabalhados, com atalho para vídeos. | **Sim** |
| Abrir exercício pelo QR | Aponta a câmera para o QR code do aparelho e cai direto na tela daquele exercício. | **Sim** |
| Registrar foto de progresso | Tira a foto pela câmera do app; ela é salva no aparelho na hora, em retrato 9:16. | **Sim** |
| Ver, ampliar e apagar fotos | Revisa as fotos por data, abre em tela cheia com data e local e apaga as que não quer. | **Sim** |
| Acompanhar composição corporal | Vê gráficos de peso, gordura e massa magra e a variação das medidas. | Não |
| Consultar a dieta e o cardápio | Vê as metas do dia e o cardápio, que alterna as opções de cada refeição ao longo da semana. | Não |
| Encontrar academias por perto | Usa o GPS para listar e mapear academias num raio de 4 km. | Última busca |
| Conferir a sincronização | Vê quantos registros ainda estão pendentes e força um envio manual. | **Sim** |
| Fechar o relatório do ciclo | Aluno registra treinos e assina; personal avalia e assina; coordenação aprova ou devolve. | Em memória |

> **Fora de escopo nesta fase.** Rede social ou compartilhamento; registro de refeições consumidas (o app mostra a meta e o cardápio, não o que foi comido); edição manual do plano de treino pelo usuário (ajustes passam pelo pedido de mudança); sincronização em segundo plano com o app fechado; e a persistência do relatório do ciclo, que ainda vive em memória.

---

## 2 · Interface e navegação

*(Expo Router)*

A navegação é organizada em três camadas do Expo Router: um **Stack raiz**, que decide entre área pública e área logada; um **Drawer**, que guarda os destinos secundários e as telas de tela cheia; e um **Tabs**, com os quatro destinos do dia a dia.

### Mapeamento de telas

| Tela | Rota / arquivo | Papel |
|---|---|---|
| Login | `(auth)/login` | E-mail e senha; entrada padrão de quem não tem sessão. |
| Cadastro | `(auth)/cadastro` | Criação de conta no Supabase Auth. |
| Código do personal | `(auth)/token` | Entrada do personal sem conta, com o código que o aluno gerou. |
| Início | `(app)/(tabs)/index` | Sequência de dias, faixa da semana, treino do dia, resumo corporal e meta de calorias. |
| Treino do dia | `(app)/(tabs)/treino/index` | Plano ativo, escolha do dia, exercícios com progresso, gerar e pedir mudança, atalho para o QR. |
| Exercício | `(app)/(tabs)/treino/[exercicioId]` | Série a série: carga, marcação, descanso, curva de progressão e guia de execução. |
| Nutrição | `(app)/(tabs)/nutricao` | Meta diária, macros, orientação, cardápio do dia; gerar e pedir mudança. |
| Perfil | `(app)/(tabs)/perfil` | Identidade da conta e atalhos para perfil de treino, fotos e configurações. |
| Perfil de treino | `(app)/perfil-treino` | O que a IA precisa saber para montar o treino e a dieta. |
| Progresso | `(app)/progresso` | Gráficos de peso, gordura e massa magra; variação das medidas. |
| Avaliações | `(app)/avaliacoes/index` | Histórico de avaliações com origem (PDF ou digitada) e status. |
| Nova avaliação | `(app)/avaliacoes/nova` | Envio do PDF (a IA preenche) ou digitação; a pessoa confere e salva. |
| Fotos de progresso | `(app)/fotos` | Galeria local por data, com indicador de sincronização e visualizador em tela cheia. |
| Câmera | `(app)/camera` | Captura da foto de progresso (tela cheia), com as faixas do recorte 9:16. |
| Leitor de QR | `(app)/scanner` | Leitura do QR do aparelho (tela cheia). |
| Academias por perto | `(app)/academias` | Mapa e lista de academias próximas pelo GPS. |
| Configurações | `(app)/configuracoes` | Conta, estado da sincronização, envio manual e versão. |
| Relatórios do ciclo | `(app)/relatorios/…` | Histórico, relatório, treinos do ciclo, avaliação e assinatura. |

### Estrutura de roteamento

O Expo Router deriva as rotas da árvore de arquivos. Grupos entre parênteses, como `(auth)`, `(app)` e `(tabs)`, organizam a hierarquia de layouts *sem* aparecer na URL, o que permite separar público de privado sem poluir os caminhos.

```text
src/app/_layout.tsx            Stack raiz · AuthProvider · CasosDeUsoProvider
│                              migrations do SQLite e as rotas protegidas
├── (auth)/_layout.tsx         Stack público — só monta sem sessão
│   ├── login.tsx
│   ├── cadastro.tsx
│   └── token.tsx              código do personal
│
└── (app)/_layout.tsx          Drawer — só monta com sessão
    │                          chama useWorkoutSync() uma vez
    ├── (tabs)/_layout.tsx     Tabs (barra flutuante própria)
    │   ├── index.tsx          Início
    │   ├── treino/_layout.tsx  Stack aninhada (fluxo sequencial)
    │   │   ├── index.tsx      treino do dia
    │   │   └── [exercicioId].tsx  rota dinâmica
    │   ├── nutricao.tsx
    │   └── perfil.tsx
    ├── perfil-treino.tsx
    ├── progresso.tsx
    ├── avaliacoes/_layout.tsx  Stack: lista e nova avaliação
    │   ├── index.tsx
    │   └── nova.tsx
    ├── relatorios/_layout.tsx  Stack do relatório do ciclo
    │   ├── index.tsx          histórico
    │   └── [cicloId]/         relatório, atividades, avaliação, assinatura
    ├── fotos.tsx
    ├── academias.tsx
    ├── configuracoes.tsx
    ├── camera.tsx             tela cheia · swipeEnabled: false
    └── scanner.tsx            tela cheia · swipeEnabled: false
```

*Figura 1 — Árvore de rotas. Cada `_layout.tsx` instala um navegador; os arquivos irmãos viram telas dele.*

#### Por que cada padrão foi escolhido

- **Tabs para os quatro destinos do dia a dia** (Início, Treino, Nutrição, Perfil): são as telas alcançadas dezenas de vezes por semana e precisam estar a um toque, com o polegar, sem abrir menu.
- **Stack aninhada dentro da aba Treino:** lista → exercício é um fluxo sequencial com volta natural. Aninhar a Stack dentro da aba preserva a barra de abas e mantém o histórico do fluxo isolado das outras abas.
- **Drawer para os destinos secundários** (Relatórios do ciclo, Progresso, Avaliações, Fotos, Academias, Configurações): telas de consulta, visitadas com frequência baixa. Colocá-las em abas competiria com o fluxo de treino. O Drawer volta pelo histórico (`backBehavior="history"`), então a câmera volta para Fotos, e não para o Início.
- **Telas de tela cheia no Drawer com gesto desativado:** câmera e leitor de QR ocupam a tela inteira e usam gestos próprios. O swipe lateral do Drawer fica desligado nelas (`swipeEnabled: false`) para não roubar o toque.

#### Rotas protegidas

A proteção é declarativa, no layout raiz: `Stack.Protected` monta o grupo `(app)` apenas quando existe sessão e o grupo `(auth)` apenas quando não existe. Não há redirecionamento manual espalhado pelas telas. Quem sai da conta simplesmente vê o grupo protegido desmontar, e nenhuma tela interna continua no ar.

```tsx
// src/app/_layout.tsx — a sessão vem do AuthContext (AutenticarUsuarioUseCase)
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Protected guard={!!sessao}>
    <Stack.Screen name="(app)" />
  </Stack.Protected>
  <Stack.Protected guard={!sessao}>
    <Stack.Screen name="(auth)" />
  </Stack.Protected>
</Stack>
```

O mesmo layout raiz segura a splash nativa até três coisas estarem prontas: fontes carregadas, sessão restaurada do armazenamento seguro e **migrations do SQLite aplicadas**. Nenhuma tela toca o banco antes disso. A sessão e os casos de uso chegam às telas por Context API (`AuthProvider` e `CasosDeUsoProvider`), sem passar por props.

#### Links profundos

O app registra o esquema `pxgym://` e usa rotas tipadas (`typedRoutes`), o que faz o TypeScript validar cada caminho de navegação em tempo de compilação. É o esquema que permite ao QR code do aparelho apontar para `pxgym://treino/<exercicioId>` e abrir a tela do exercício direto, como detalhado na seção 5.

---

## 3 · Estratégia offline-first

*(SQLite)*

Durante o treino, o SQLite do aparelho **é** a fonte da verdade. O app nunca espera resposta de rede para confirmar uma ação do usuário: grava local, redesenha a tela e trata o envio para a nuvem como tarefa de segundo plano.

### Funcionamento offline

Sem conexão, o usuário abre o app já autenticado (a sessão fica cifrada no aparelho) e faz o treino inteiro:

- Abre o **treino ativo** pela cópia guardada no aparelho. O dia sugerido é calculado do histórico local, e ele pode escolher outro.
- Marca e desmarca séries, ajusta a carga e usa o cronômetro de descanso.
- Vê a **carga anterior** de cada exercício e a curva de progressão, ambas calculadas a partir do próprio banco local, não de um endpoint.
- Lê o guia de execução do exercício, que vem embutido no app.
- Vê a sequência de dias treinados e a faixa dos últimos sete dias, recalculadas a cada série marcada.
- Tira, vê e apaga fotos de progresso. Os arquivos moram no aparelho, então a galeria abre igual com ou sem rede, e a foto apagada some na hora.
- Confere em Configurações quantos registros e fotos ainda estão pendentes de envio e pode tentar sincronizar manualmente.

Algumas telas **dependem de rede** por natureza, e isso é uma decisão explícita, não um esquecimento. Gerar ou mudar o treino e a dieta, ler o PDF da avaliação e salvar avaliação e perfil dependem do servidor e da IA. **Progresso**, **Avaliações** e **Nutrição** leem dados do Supabase. **Academias por perto** consulta o OpenStreetMap em tempo real. Nesses casos o app não mostra tela vazia nem spinner infinito: cada uma tem estado de erro próprio, com explicação e ação de repetir. As ações que precisam de rede recusam **antes** de tentar, com a mensagem "Sem internet agora". As Academias mostram a última busca guardada, com a data dela.

> **Critério usado para decidir o que é offline.** É offline aquilo que o usuário **produz** ou **precisa durante o treino**, porque perder esse dado é perder o treino. Por isso o plano de treino, que nasce no servidor, tem cópia no aparelho. É online aquilo que nasce em outro lugar e que ele consulta fora da academia (a avaliação, a dieta, o mapa): cachear isso traria complexidade de invalidação sem resolver o problema real.

### Modelagem de dados local

O banco local é um `expo-sqlite` chamado `pxgym.db`, acessado pelo **Drizzle ORM** com esquema tipado e migrations versionadas, aplicadas no boot. Três tabelas sustentam o modo offline:

#### `set_logs` — registros de série

| Coluna | Tipo | Por que precisa estar no aparelho |
|---|---|---|
| `id` | text (PK) | UUID gerado no cliente; é o mesmo id usado no Postgres, o que torna o envio idempotente. |
| `session_date` | text | Dia da sessão no fuso do aparelho; base da sequência de dias, da faixa semanal e do dia sugerido do plano. |
| `exercise_id`, `exercise_name` | text | Id do catálogo de exercícios. O nome é copiado junto para o histórico continuar legível offline, mesmo que o plano mude. |
| `set_number`, `target_reps` | integer | Posição da série no exercício e repetições-alvo daquela série. |
| `previous_load_kg` | real | Fotografia da carga anterior no momento do registro; permite mostrar "+2,5 kg" sem recalcular o histórico. |
| `load_kg` | real | A carga efetivamente usada. É o dado que o app existe para guardar. |
| `completed_at` | integer (ms) | Momento da conclusão; ordena a curva de progressão. |
| `sync_status` | text | `pending` · `synced` · `deleted`: é a fila de sincronização (adiante). |

Três índices acompanham as consultas reais da interface: por `session_date` (treino do dia), por `exercise_id + completed_at` (curva de progressão) e por `sync_status` (varredura da fila).

#### `progress_photos` — fotos de progresso

| Coluna | Tipo | Por que precisa estar no aparelho |
|---|---|---|
| `id` | text (PK) | UUID do cliente, reaproveitado como nome do arquivo na nuvem. |
| `user_id` | text | Dono da foto; vira a pasta do arquivo na nuvem. |
| `local_uri` | text | Caminho do arquivo no diretório de documentos do app; é o que a galeria exibe, sempre. |
| `remote_path` | text · nulo | Preenchido só depois do upload; nulo significa "ainda só existe aqui". |
| `taken_at` | integer (ms) | Data de captura, usada para agrupar e ordenar a galeria. |
| `note` | text · nulo | Observação opcional. |
| `latitude`, `longitude` | real · nulo | Onde a foto foi tirada. **Fica só no aparelho**: não sobe para a nuvem. |
| `sync_status` | text | `pending` · `synced` · `deleted`. |

#### `workout_plan_cache` — cópia do treino ativo

Uma linha por pessoa, com o plano gerado pela IA guardado em JSON. É sobrescrita a cada leitura bem-sucedida do servidor e lida quando não há rede ou o servidor não responde. Não tem fila, porque o app nunca escreve no plano, só o lê.

A reatividade das telas vem do próprio banco: o SQLite é aberto com `enableChangeListener`, e as telas consultam por `useLiveQuery`. Marcar uma série reexecuta as consultas afetadas e atualiza na hora o progresso do exercício, a sequência de dias, a faixa semanal, a curva e o dia sugerido do plano, sem estado global duplicado e sem "puxar para atualizar".

### Fila de ações

Não existe uma tabela separada de "operações pendentes". **A fila é uma coluna da própria linha** (`sync_status`): o registro que o usuário acabou de criar já é, ao mesmo tempo, o dado que a tela mostra e o item que falta enviar. Isso evita manter duas verdades sobre o mesmo fato e elimina a chance de a fila e o dado divergirem.

O caso delicado é a **exclusão**. Se o usuário desmarca uma série que já foi para a nuvem e o app apaga a linha local, não sobra nada para avisar o servidor de que aquele registro morreu, e a próxima leitura o traria de volta. Por isso a exclusão de um registro já sincronizado não apaga: marca a linha como `deleted` (um *tombstone*), que fica invisível para toda a interface e só é removida de vez depois que o servidor confirma a exclusão.

<!-- figura-svg: ciclo-serie -->
```text
              marcar série → INSERT no SQLite
                        │
                        ▼
   ┌──────────────────────┐   upsert aceito   ┌──────────────────────┐   desmarcar   ┌──────────────────────┐
   │       pending        │ ────────────────► │        synced        │ ────────────► │       deleted        │
   │ existe só no aparelho│ ◄╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │   local + Supabase   │               │      (tombstone)     │
   └──────────────────────┘  falha de rede:   └──────────────────────┘               └──────────────────────┘
                │             continua pending                                                   │
                ▼                                                                                ▼
   desmarcar antes do envio:                                                    DELETE remoto confirmado
   DELETE local, nada a avisar                                                  e só então DELETE local
```

*Figura 2 — Ciclo de vida de um registro de série. A seta tracejada é o caminho de falha; nenhuma transição bloqueia a interface.*

As fotos seguem a mesma lógica, com dois cuidados a mais. Primeiro, a captura sai do cache da câmera (que o sistema operacional pode limpar a qualquer momento) e é **movida para o diretório de documentos do app** antes de a linha ser gravada. Segundo, **até uma foto ainda `pending` vira tombstone ao ser apagada**: o upload pode ter chegado ao servidor sem a confirmação voltar, e sem o tombstone a restauração da nuvem a traria de volta.

---

## 4 · Backend e sincronização

*(Supabase)*

O backend é o Supabase: Postgres, Auth, Storage e Edge Functions no mesmo projeto. Os arquivos das fotos ficam no Cloudflare R2. O aplicativo fala com o backend por três vias: **envia** o que produziu offline (séries e fotos), **grava direto** o que só faz sentido online (perfil e avaliação) e **pede ao servidor** o que precisa de IA (treino, dieta e leitura do PDF).

### Modelagem de dados remota

| Tabela | Colunas principais | Origem e papel |
|---|---|---|
| `auth.users` | `id`, `email`, `user_metadata.papel` | Gerenciada pelo Supabase Auth. Todas as tabelas do app referenciam esse `id` com `on delete cascade`. |
| `set_logs` | `id` (uuid do cliente), `user_id`, `session_date`, `exercise_id`, `exercise_name`, `set_number`, `target_reps`, `previous_load_kg`, `load_kg`, `completed_at` | Espelho remoto da tabela local. Escrita exclusivamente pelo mobile. |
| `progress_photos` | `id`, `user_id`, `storage_path`, `taken_at`, `note` | Metadados da foto; o arquivo vive no R2 em `<user_id>/<photo_id>.jpg`. Escrita pelo mobile, sem o local. |
| `user_profiles` | `user_id`, sexo, nascimento, altura, objetivo, nível, dias por semana, minutos por treino, restrições, regiões sensíveis, exercícios indisponíveis, alimentos que não come | O perfil que a IA usa. O app grava; as duas listas aprendidas são escritas pelo servidor. |
| `body_assessments` | `id`, `user_id`, `source` (`pdf`/`manual`), `pdf_path`, `status`, `extracted_data` (jsonb) | Avaliação corporal. O app grava a avaliação já conferida, com status `reviewed`. |
| `plan_generations` | `id`, `user_id`, `assessment_id`, `part`, `kind`, `status`, `feedback`, `profile` (jsonb), `model` | Cada pedido à IA. É a fila (`queued`) e a base dos limites. Só o servidor escreve. |
| `workout_plans` | `id`, `user_id`, `assessment_id`, `name`, `rationale`, `days` (jsonb), `sources`, `model`, `active` | Treino gerado. No máximo um ativo por pessoa (índice único parcial). Só o servidor escreve. |
| `nutrition_plans` | `id`, `user_id`, `assessment_id`, `calories_target`, `macros`, `micros`, `meals` (jsonb), `diet_guidance`, `sources`, `active` | Dieta gerada, com as refeições e suas opções. Vale a ativa mais recente. |
| `photo_storage_reservations`, `admin_alerts` | reserva por foto; último aviso por tipo | Trava de custo das fotos e controle dos avisos ao administrador. Só o servidor alcança. |
| storage: `assessments` | `<user_id>/<arquivo>.pdf` | Bucket privado dos PDFs de avaliação. |

O esquema é versionado em oito migrations SQL no repositório (`supabase/migrations/`), o que mantém o banco reproduzível e revisável junto com o código. As escritas que precisam ser atômicas, como "desativar o treino anterior e gravar o novo" ou "reservar espaço sem passar do teto", são **funções no banco** (RPC) que só a `service_role` pode chamar.

### Estratégia de sincronização

A sincronização é **por gatilhos, não por intervalo**: nada de polling consumindo bateria. O envio é tentado em quatro momentos:

- **Ao montar a área logada**, isto é, sempre que o app abre com sessão válida.
- **Quando o NetInfo anuncia que a conexão voltou** (assinatura de eventos de rede).
- **Quando o app volta do segundo plano** para o primeiro (evento do `AppState`).
- **Quando o usuário aperta "sincronizar agora"** em Configurações, a válvula manual para quem quer ver o número de pendências zerar.

Os três primeiros gatilhos ficam concentrados num único hook (`useWorkoutSync`), montado no layout da área logada, com trava de reentrada para que dois gatilhos simultâneos não disparem duas rodadas ao mesmo tempo. Cada rodada faz, em ordem: envia as séries pendentes e propaga as exclusões; remove na nuvem as fotos apagadas (liberando espaço); envia as fotos pendentes; e, por último, **baixa as fotos que estão na nuvem e não estão no aparelho**. É isso que devolve a galeria a quem reinstalou o app ou trocou de celular.

<!-- figura-svg: caminho-escrita -->
```text
IMEDIATO — SEM REDE
═══════════════════════════════════════════════════════════════════════════════
  toque na série  ──►  RegisterSetUseCase  ──►  SQLite: pending  ──►  useLiveQuery
  tela do exercício    regra de domínio         fonte da verdade      telas redesenham

DEPOIS — QUANDO HOUVER CONEXÃO
───────────────────────────────────────────────────────────────────────────────
  gatilho         ──►  SyncPendingSetLogs  ──►  Gateway Supabase ──►  Postgres
  abertura             lê pending +             upsert                set_logs
  NetInfo              tombstones               onConflict: id        RLS por dono
  foreground           checa conectividade      delete por lote
  manual
                          ▲                                            │
                          └──────────  sucesso: marca synced  ◄─────────┘
                                       / apaga o tombstone local
```

*Figura 3 — Caminho de escrita. A faixa de cima acontece em milissegundos e sem rede; a de baixo acontece quando dá, e falhar nela não custa nada ao usuário.*

No sentido inverso, **nuvem → aparelho**, a avaliação, a dieta e o perfil são buscados sob demanda, com refetch a cada vez que a tela ganha foco. O treino ativo também, mas a resposta atualiza a cópia local. Cada tela expressa três estados explícitos: carregando, erro e pronto.

#### Tratamento de conflitos

A política adotada é **"o registro pertence a quem o criou, e o último envio vence"** (*last-write-wins* por linha), sustentada por quatro decisões:

- **Identidade gerada no cliente.** O UUID nasce no aparelho, então o mesmo registro tem o mesmo `id` nos dois bancos. O envio é um `upsert onConflict: id`: reenviar dez vezes produz exatamente o mesmo resultado de enviar uma.
- **Escrita de mão única.** Séries e fotos só são escritas pelo aplicativo mobile; nenhum processo do servidor edita esses registros. Os planos, ao contrário, só são escritos pelo servidor, e o app só os lê. Nos dois casos, ninguém disputa a mesma linha.
- **Exclusão com tombstone.** Uma série ou foto apagada offline não "ressuscita" na próxima sincronização, porque a exclusão viaja como intenção registrada e só some do aparelho depois de confirmada.
- **Ordem e falha segura.** Nas séries, primeiro os pendentes e depois as exclusões. Nas fotos, primeiro as exclusões, para liberar espaço. A rodada inteira falha em silêncio: o que não subiu continua `pending` para a próxima janela, e nenhum erro de rede interrompe o usuário no meio do treino.

O limite conhecido dessa escolha é o cenário de **dois aparelhos com a mesma conta editando a mesma série**: o último a sincronizar sobrescreve o outro. Como o produto é de uso individual e a sessão de treino acontece num aparelho por vez, o custo de um relógio vetorial ou de uma coluna `updated_at` com resolução por versão não se justifica hoje. A porta fica aberta, porque a resolução acontece num único ponto do código (o gateway de sincronização).

### Autenticação e permissões

Sim, o app tem login: **e-mail e senha via Supabase Auth**. A sessão é o que alimenta o guarda de rotas da seção 2, e não existe "modo visitante". O papel da pessoa no relatório do ciclo (aluno, personal ou coordenação) vem do `user_metadata` da conta; sem papel, vale aluno. O personal sem conta entra com um código que o aluno gera, que expira e pode ser revogado.

A persistência da sessão precisou de um cuidado específico. O armazenamento seguro do sistema (Keychain no iOS, Keystore no Android) tem limite prático de cerca de 2 KB por valor, pequeno demais para a sessão do Supabase. A solução implementada é o padrão **LargeSecureStore**: gera-se uma chave AES-256, ela é guardada no armazenamento seguro do sistema, e a sessão é gravada *cifrada* (AES-CTR) no armazenamento comum. A credencial nunca toca o disco em texto puro. O *refresh* automático do token só roda com o app em primeiro plano.

No banco, **todas as tabelas têm Row Level Security habilitada**. As de dados do usuário têm políticas de dono; as de controle (pedidos, treinos, reservas, alertas) só são legíveis pelo dono, ou nem isso, e só o servidor escreve nelas. Nos arquivos, as políticas de Storage comparam a **primeira pasta do caminho** com o identificador do usuário autenticado, de modo que ninguém lê o PDF de outra pessoa mesmo conhecendo o caminho. As fotos no R2 não têm acesso público: o app só alcança um arquivo por uma URL assinada, válida por cinco minutos, que a Edge Function `photo-storage` emite para a pasta do próprio usuário.

```sql
-- padrão aplicado às tabelas de dados do usuário
alter table set_logs enable row level security;

create policy "set_logs_select_own" on set_logs
  for select using (auth.uid() = user_id);
create policy "set_logs_insert_own" on set_logs
  for insert with check (auth.uid() = user_id);

-- tabelas que só o servidor escreve: o dono só lê
create policy "workout_plans_select_own" on workout_plans
  for select using (auth.uid() = user_id);

-- arquivos: a pasta raiz do objeto precisa ser o id do usuário
create policy "assessments_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'assessments'
      and (storage.foldername(name))[1] = auth.uid()::text
  );
```

O aplicativo usa só a chave anônima pública do projeto, e é a RLS, não o cliente, que define o que cada sessão enxerga. Nenhuma chave de serviço vai embarcada no app: a `service_role`, a chave do Gemini e as do R2 vivem só como *secrets* das Edge Functions.

---

## 5 · Hardware e sensores

### Uso da câmera

A câmera aparece em **dois fluxos distintos**, cada um com sua tela dedicada de tela cheia.

#### Fluxo 1 — Foto de progresso

A foto de progresso é a evidência visual que acompanha os números da avaliação: o mesmo enquadramento, a cada poucas semanas. Para que as fotos sejam comparáveis entre si, **toda foto é guardada no mesmo formato**: retrato 9:16, 1080×1920 pixels, JPEG 92% (cerca de 0,3 a 0,5 MB). O usuário chega pela galeria (`/fotos`) ou pelo Perfil, e a captura é gravada **antes de qualquer chamada de rede**:

1. A tela pede a permissão de câmera com uma explicação em português, e com uma saída ("Agora não") para quem não quiser conceder. Permissão bloqueada de vez leva às configurações do sistema.
2. O preview mostra faixas escuras nas laterais: é o que o recorte vai tirar.
3. A captura sai da câmera sem perda. O `CameraGateway` recorta o maior retângulo 9:16 centralizado (a regra é do domínio, em `recorteRetrato`), redimensiona para 1080×1920, salva em JPEG uma única vez e apaga o original do cache.
4. O arquivo é **movido para o diretório de documentos do app**, em `progress-photos/<uuid>.jpg`. O cache pode ser esvaziado pelo sistema operacional a qualquer momento; o diretório de documentos, não.
5. Se a localização estiver liberada, o app guarda onde a foto foi tirada. O toque no disparador é o gesto que autoriza o diálogo de permissão. Sem permissão ou sem sinal, a foto é salva sem posição: a foto é o que importa.
6. Uma linha é gravada no SQLite com `local_uri`, data, posição e `sync_status = pending`. A galeria já mostra a foto neste ponto, com ou sem internet.
7. Havendo conexão, o mesmo caso de uso já tenta o envio; não havendo, a foto entra na fila e sobe no próximo gatilho. O envio pede à `photo-storage` uma URL assinada, envia os bytes direto do disco para o R2 e grava a linha remota (sem a posição). Só então `remote_path` é preenchido e o status vira `synced`.

Repare que a galeria **sempre lê o arquivo local**, mesmo depois de sincronizada: a nuvem é backup, não a origem da exibição. Por isso rolar as fotos é instantâneo e não consome dados. O ponto colorido em cada foto (volt para sincronizada, âmbar para pendente) torna visível a diferença entre "está no meu celular" e "está salva na nuvem". Um toque abre a foto em tela cheia, com a data, o local em graus e o atalho "Ver no mapa"; segurar a foto (ou o botão no visualizador) a apaga.

#### Fluxo 2 — Leitura de QR code do aparelho

Achar o exercício certo numa lista, com o celular na mão e o aparelho ocupado, é fricção pura. O leitor resolve isso: cada aparelho da academia recebe um QR code com `pxgym://treino/<exercicioId>` (ou o identificador puro), e apontar a câmera abre a tela daquele exercício diretamente, pronta para registrar a carga. Vale qualquer exercício do catálogo: se ele não está no treino de hoje, a tela abre no dia do plano que o contém. O leitor trava depois da primeira leitura válida para não navegar duas vezes, e um código que não é de exercício produz uma mensagem clara em vez de uma tela em branco. Esse fluxo é **totalmente offline**.

> **Permissões.** Os textos de permissão são declarados no `app.json` em português e explicam a finalidade concreta. Câmera: *"O Px GYM usa a câmera pra registrar fotos de progresso e ler QR codes dos aparelhos."* Localização: *"…pra mostrar academias perto de você e registrar onde suas fotos de progresso foram tiradas — essa posição fica só no seu aparelho."* No Android, `CAMERA`, `ACCESS_COARSE_LOCATION` e `ACCESS_FINE_LOCATION` são declaradas explicitamente. Nenhuma permissão é pedida na abertura do app: cada uma é solicitada na tela em que faz sentido, com a explicação à vista.

### Uso da geolocalização

A localização serve a três casos concretos. O principal é **encontrar academias perto de onde o usuário está agora**, o cenário de quem viaja, mudou de bairro ou quer treinar perto do trabalho; sem localização, a única alternativa seria digitar um endereço, justamente o tipo de fricção que o app evita. Os outros dois são **registrar onde cada foto de progresso foi tirada** e o **check-in opcional** de um treino no relatório do ciclo.

A captura é **pontual e apenas em primeiro plano**. Não há rastreamento em segundo plano: nenhuma permissão do tipo "sempre", nenhum serviço de localização contínua e, portanto, nenhum consumo de bateria fora do momento em que a posição é pedida. A posição da busca de academias é descartada depois do uso. A da foto fica só no SQLite do aparelho: não sobe para a nuvem e não volta quando a foto é restaurada.

- **Precisão "balanceada"**, e não a máxima: para um raio de busca de 4 km, a precisão de alguns metros do GPS fino seria desperdício de tempo e bateria.
- **Plano B para o fix que não sai.** GPS frio, ambiente fechado ou emulador podem fazer a leitura de posição atual falhar. Nesse caso o app cai na última posição conhecida do sistema, sem limite de idade: para um raio de 4 km ela serve tão bem quanto uma leitura nova, e é melhor que uma tela de erro.
- **Fontes de dados sem chave e sem custo, em cadeia.** As academias vêm do OpenStreetMap: primeiro o Overpass principal (o mais completo), depois o Nominatim (o mais estável) e por fim os espelhos do Overpass. A primeira que responder vale. A busca que deu certo fica guardada no aparelho; se todas as fontes caírem, a tela mostra a última busca, recalculada para a posição atual e com a data dela. Um adaptador para a Google Places API está implementado e desligado, pronto para ser ligado se um dia houver faturamento: a tela não muda, só o adaptador.
- **Mapa nativo por plataforma:** Apple Maps no iOS e MapLibre com tiles do OpenStreetMap no Android, resolvidos por extensão de arquivo de plataforma, sem `if` espalhado pela tela.

Como toda a tela depende de rede e de sensor, ela trata os fracassos separadamente: "não achamos sua localização" e "não deu pra buscar agora" são mensagens diferentes, com ação de repetir.

---

## 6 · Arquitetura e padrões de código

O projeto é um monorepo com dois aplicativos, três pacotes compartilhados e as funções do servidor. A regra que organiza tudo: **o domínio não conhece nem o React, nem o Expo, nem o Supabase**.

### Organização do projeto

```text
px-gym/
├── apps/
│   ├── mobile/                    Expo · React Native
│   │   ├── src/app/               rotas (Expo Router) — só composição de tela
│   │   ├── src/components/        UI reutilizável (cartões, gráficos, visualizador)
│   │   ├── src/adapters/          gateways nativos, contexto, hooks, telas do relatório
│   │   ├── src/db/                SQLite: schema, cliente e repositórios Drizzle
│   │   ├── src/lib/               composition roots e hooks de leitura
│   │   └── drizzle/               migrations do banco local
│   └── web/                       Next.js — versão anterior do envio da avaliação
├── packages/
│   ├── core/                      domínio puro — sem React, Expo ou Supabase
│   │   ├── domain/entities/       SetLog, WorkoutPlan, BodyAssessment, CicloAvaliacao…
│   │   ├── domain/value-objects/  Load, Weight, Email, Criterio, Assinatura…
│   │   ├── domain/services/       treino do dia, progressão, recorte da foto…
│   │   ├── domain/contracts/      interfaces que a infraestrutura implementa
│   │   ├── application/use-cases/ RegisterSet, GenerateWorkoutPlan, AssinarRelatorio…
│   │   └── testing/               fakes em memória usados pelos testes
│   ├── db/                        adaptadores Supabase (repositórios e gateways)
│   └── tokens/                    tokens de design compartilhados entre web e mobile
└── supabase/
    ├── migrations/                esquema remoto versionado em SQL
    └── functions/                 Edge Functions: generate-plan, extract-assessment,
                                   photo-storage e o código compartilhado (_shared)
```

*Figura 4 — Estrutura de diretórios. Os dois aplicativos consomem os mesmos pacotes de domínio e de design; o servidor tem as próprias regras em `_shared`.*

#### Separação de responsabilidades

A separação segue **ports & adapters** (arquitetura limpa). O domínio declara as interfaces de que precisa, e cada tecnologia entra como implementação intercambiável:

| Camada | O que contém | Do que ela não pode depender |
|---|---|---|
| **Domínio**<br>`packages/core` | Entidades, objetos de valor, casos de uso, serviços de cálculo e os *ports*, como `SetLogRepository`, `WorkoutPlanCache`, `PlanGenerationGateway`, `CameraGateway`, `LocationGateway`, `ConnectivityStatus`, `Clock` e `IdGenerator`. | De nada. Não importa React, React Native, Expo, Drizzle nem Supabase; por isso roda em Node puro nos testes. |
| **Banco local**<br>`mobile/src/db` | Esquema Drizzle, migrations e os repositórios que implementam os ports contra o SQLite, além da conversão linha ↔ entidade. | De componentes ou telas. Nenhuma consulta SQL vive dentro de uma tela. |
| **Gateways nativos**<br>`mobile/src/adapters` | Câmera (com o recorte), GPS, armazenamento seguro da sessão, última busca de academias, fontes do OpenStreetMap e os repositórios em memória do relatório. | Da interface: um gateway não desenha nada. |
| **Backend**<br>`packages/db` | Cliente Supabase, repositórios, gateway de sincronização, chamadas às Edge Functions e mapeadores. | De React e da UI; é compartilhado com o app web. |
| **Composição**<br>`mobile/src/lib` | Os *composition roots* que instanciam cada caso de uso com seus adaptadores concretos e os *hooks* que ligam isso às telas. | É o único lugar onde "SQLite" e "Supabase" se encontram na mesma linha. |
| **Apresentação**<br>`mobile/src/app` · `components` | Telas e componentes visuais: leem por *hooks* e escrevem chamando casos de uso. | Não faz consulta SQL, não chama a API do Supabase, não formula regra de progressão. |

<!-- figura-svg: camadas -->
```text
  ┌────────────────────┐        ┌────────────────────────┐        ┌────────────────────────┐
  │    Apresentação    │        │   Domínio · @px/core   │        │     Infraestrutura     │
  │ telas Expo Router  │ ─────► │  entidades e regras    │ ◄───── │    Drizzle / SQLite    │
  │ componentes        │        │  casos de uso          │        │    Supabase · R2       │
  │ hooks de leitura   │        │  ports (interfaces)    │        │    NetInfo · câmera    │
  │                    │        │  383 testes            │        │    · GPS               │
  └────────────────────┘        └────────────────────────┘        └────────────────────────┘

  as setas são a direção das dependências: nada dentro do domínio aponta para fora.
  trocar SQLite, Supabase ou a fonte de academias não toca em uma linha de regra.
```

*Figura 5 — Direção das dependências. Nos testes, os adaptadores reais são substituídos por implementações falsas em memória; é o que permite testar sincronização, geração de plano e progressão de carga sem banco, sem rede, sem IA e sem emulador.*

O ganho prático dessa separação é testabilidade. São **657 testes automatizados**, todos rodando em segundos: 383 no domínio e nos casos de uso (com 95% das linhas cobertas), 47 nos adaptadores do Supabase, 168 no app (repositórios contra SQLite real, gateways, hooks, telas e um fluxo ponta a ponta do relatório) e 59 nas Edge Functions. Eles cobrem o comportamento da sincronização (offline, erro, tombstones, restauração de fotos), o treino do dia, as regras da IA, o relatório do ciclo e as permissões.

Outra consequência do desenho é o **modo mock**. Com `EXPO_PUBLIC_MODO_MOCK=1`, o app troca os adaptadores reais por implementações em memória, sem abrir o SQLite nem criar o cliente do Supabase. O login passa a ser por contas de demonstração, e o GPS e as fotos são simulados. É o mesmo domínio e as mesmas telas, sem nenhuma dependência externa: foi assim que a fase "domínio e interface primeiro" foi construída e apresentada. O padrão é o modo real.

### Gerenciamento de estado de conexão

O estado de rede é tratado em **dois níveis diferentes**, de propósito.

**Como decisão de domínio.** A conectividade entra no núcleo como um *port* (`ConnectivityStatus`), e os casos de uso que dependem de rede o consultam antes de tentar qualquer envio. O de sincronização devolve o resultado `offline` sem gastar requisição; os de gerar plano e ler PDF recusam com a mensagem certa antes de subir qualquer coisa. A implementação real usa o NetInfo, com um detalhe que importa: enquanto o sistema ainda está sondando a rede, o indicador de "internet alcançável" vem indefinido, e o app só bloqueia o envio quando ele afirma *explicitamente* que não há internet. Nos testes, esse mesmo port vira uma implementação falsa que devolve o que o cenário pedir.

**Como reação a eventos.** Um único *hook*, montado no layout da área logada, assina o NetInfo e o `AppState`: conexão restabelecida ou app voltando ao primeiro plano disparam uma rodada de sincronização em segundo plano, com trava de reentrada.

Do lado da interface, a escolha é **não interromper**. Falha de sincronização não vira alerta nem modal: quem está no meio de uma série não precisa lidar com um erro de rede que o app já sabe contornar. O estado fica disponível onde o usuário pode agir sobre ele:

- **Configurações** mostra, ao vivo, quantos registros, remoções e fotos estão pendentes (consulta reativa ao SQLite) e oferece o botão de sincronizar agora, distinguindo "sem conexão" de "o servidor não respondeu".
- **A galeria de fotos** marca cada item com um indicador de já sincronizado ou ainda local.
- **Telas que dependem de leitura remota** (Progresso, Avaliações, Nutrição, Academias) têm estado de erro próprio, com explicação e ação de repetir.

---

## 7 · Inteligência artificial

*(Gemini)*

O app usa IA em três lugares: **montar o treino**, **montar a dieta** e **ler o PDF da avaliação**. Nos três, a IA roda no servidor, dentro de uma Edge Function do Supabase. O app nunca fala com o provedor e nunca carrega a chave. A regra que atravessa tudo é **"a IA propõe, a fórmula confere"**: o modelo escolhe e escreve, mas nenhum número dele chega à tela sem passar por esquema e por regras determinísticas.

### O provedor e o custo

O projeto tem orçamento zero, então só serve o que tem plano gratuito sem cartão. O escolhido foi o **Google Gemini Flash-Lite**, pelo AI Studio, com cota diária gratuita. Para não depender de um único modelo, as funções usam uma **cadeia** (`gemini-3.5-flash-lite` e depois `gemini-3.1-flash-lite`, com cotas independentes), cuja ordem pode ser trocada por *secret* sem novo deploy. As funções só conhecem a interface `ProvedorIA`: trocar de modelo ou de empresa é escrever outro adaptador, e as regras não mudam.

| Situação | O que acontece |
|---|---|
| Modelo sem cota (HTTP 429) | Tenta o próximo da cadeia. |
| Resposta fora do formato, ou que as regras não conseguem consertar | Conta como falha do modelo e tenta o próximo. |
| Todos sem cota | O pedido fica **na fila** (`queued`), e o app oferece "Tentar de novo". |
| Todos falharam de verdade | O pedido fica em `error` e o app pede para tentar em instantes. |

Para a cota durar e ninguém abusar, o servidor limita cada pessoa a 8 pedidos em 24 horas, 2 planos do zero por avaliação (para treino e para dieta, separadamente) e 5 pedidos de mudança por avaliação. A leitura de PDF tem limite próprio, de 6 por dia. Os mesmos pré-requisitos (internet, perfil preenchido, avaliação revisada) são conferidos **no aparelho antes** do pedido, para nem gastar a viagem.

### Treino

A função `generate-plan` recebe o pedido, lê o perfil e a avaliação pelo cliente do próprio usuário (sujeito à RLS) e manda para o modelo três coisas. A primeira é o **acervo científico**: 25 artigos resumidos, sobre volume, frequência, proximidade da falha, proteína e déficit calórico, entre outros temas. A segunda é o **catálogo fechado** de 58 exercícios, enviado como `enum` no esquema da resposta. A terceira são os dados da pessoa, só com números e perfil, sem nome nem e-mail. A resposta passa por `ajustarTreino`, que:

- descarta exercício inventado ou repetido no dia;
- veta o que a academia da pessoa não tem e o que sobrecarrega uma região marcada como sensível (o modelo menor não respeita restrição de lesão só por instrução, então o veto é feito por código);
- exige um dia por dia de treino pedido e traz séries, repetições e descanso para faixas sãs;
- usa o nome e o grupo muscular do catálogo, não os da IA;
- guarda só as fontes que existem no acervo.

O plano não traz cargas. A meta de cada série sai do **histórico de séries do aparelho**, e o dia sugerido também. A IA decide o que treinar, e o registro real decide quanto.

### Dieta

A dieta segue o mesmo caminho, com regras de nutrição. A **fórmula de Mifflin-St Jeor** dá a taxa metabólica basal; com o fator de atividade e o ajuste pelo objetivo, sai a referência de calorias. As faixas também vão para a IA, para ela mirar. Depois, `ajustarDieta` confere:

- calorias a até 15% da referência e **nunca abaixo da taxa basal**;
- proteína entre 1,4 e 2,4 g por kg e gordura entre 0,6 e 1,2 g por kg;
- carboidrato fechando a conta.

As refeições têm um passo a mais. A IA escolhe os alimentos e o peso de cada refeição no dia, mas erra a soma: numa chamada real, propôs 2.000 kcal para uma meta de 3.000. Por isso `conferirRefeicoes` **recalcula** as calorias de cada opção a partir dos macros dos alimentos e escala as porções. Quando há alimento proteico e não proteico na opção, resolve um sistema 2×2 que acerta calorias e proteína ao mesmo tempo. A medida caseira ("4 colheres de sopa") é refeita a partir dos gramas finais. O resultado é que **qualquer combinação de opções fecha o dia na meta**. O app monta o cardápio da semana alternando as opções de cada refeição, de modo que dias seguidos não repetem a mesma combinação, e a pessoa pode trocar uma opção na mão.

### Pedido de mudança e preferências aprendidas

Depois de gerado, o plano pode ser ajustado em texto livre. A função manda à IA o plano atual e o pedido, com a instrução de mudar **só** o que foi pedido. O que o pedido ensinou (um aparelho que a academia não tem, um alimento que a pessoa não come) é filtrado pelo catálogo e gravado no perfil, e passa a valer em todos os planos seguintes sem a pessoa repetir.

### Avaliação pelo PDF

Quem fez bioimpedância recebe um PDF. O app sobe o arquivo para a pasta da pessoa no Storage, e a função `extract-assessment` o envia ao Gemini como anexo, pedindo peso, gordura, massa muscular, medidas e data num esquema fixo. Valor implausível vira vazio, e documento que não é avaliação é recusado, com o PDF apagado. **Nada é salvo nesse passo**: os números voltam para preencher o formulário, a pessoa confere, corrige e só então salva. Por isso a avaliação nasce revisada.

### Avaliação nova, plano novo

Cada plano guarda de qual avaliação veio. Quando chega uma avaliação revisada mais nova que a do plano ativo, as abas Treino e Nutrição mostram o cartão **"Avaliação nova"**, com o botão para atualizar. O cartão nunca gera sozinho, porque cada geração do zero conta no limite.

> **Estado atual do projeto.** Estão implementados: autenticação com sessão cifrada e rotas protegidas; treino e dieta gerados por IA com regras de conferência, pedido de mudança, fila e limites; treino do dia montado do plano e do histórico, disponível offline; registro de série offline com progressão de carga; sincronização por gatilhos com tombstones; avaliação digitada ou lida do PDF; fotos em 9:16 com local, envio diferido ao R2, exclusão e restauração; leitor de QR; guia de execução; busca de academias com fontes em cadeia; painéis de progresso; o relatório do ciclo com regras e telas; e 657 testes automatizados. Os próximos passos são persistir o relatório do ciclo, dar cópia offline à dieta, retomar sozinho os pedidos da fila e testar ponta a ponta em aparelho.
