# Px GYM

Aplicativo de musculação que reúne num só lugar a **evolução corporal**, a **progressão de carga nos treinos**, o **treino e a dieta montados por IA** e as **fotos de progresso**. O registro do treino funciona sem internet: o banco do aparelho é a fonte da verdade, e a nuvem é destino eventual.

## Funcionalidades

- **Treino offline-first:** registro de séries e cargas durante o treino, inclusive em modo avião, com meta de carga tirada da última sessão, cronômetro de descanso e curva de progressão por exercício
- **Treino e dieta gerados por IA** (Google Gemini) a partir da avaliação corporal e do perfil de treino. Só entram exercícios de um catálogo fechado, as metas de calorias e macros são conferidas por fórmula (Mifflin-St Jeor) e as porções do cardápio são recalculadas: *a IA propõe, a fórmula confere*
- **Pedido de mudança** em texto livre ("minha academia não tem leg press"), com o que a IA aprende guardado no perfil
- **Avaliação corporal** digitada ou lida do PDF da bioimpedância pela IA, sempre conferida pela pessoa antes de salvar; aviso quando há avaliação mais nova que a do plano
- Gráficos de composição corporal (peso, gordura, massa magra, medidas)
- **Fotos de progresso** em 9:16, com o local de onde foram tiradas (que fica só no aparelho), visualizador em tela cheia, exclusão e restauração da nuvem (Cloudflare R2)
- Leitor de QR code dos aparelhos da academia e guia de execução dos exercícios
- Busca de academias próximas pelo GPS (OpenStreetMap), com a última busca guardada
- Relatório do ciclo de treino entre aluno, personal e coordenação (regras e telas prontas, dados em memória)

## Estrutura do repositório

Monorepo com npm workspaces:

| Pasta | Conteúdo |
|---|---|
| `apps/mobile` | App mobile (Expo SDK 58 / React Native 0.88 / Expo Router) |
| `apps/web` | App web (Next.js), versão anterior do envio de avaliação; parado |
| `packages/core` | Domínio e casos de uso compartilhados (sem dependências externas) |
| `packages/db` | Adapters do Supabase: repositórios, sincronização, chamadas às Edge Functions |
| `packages/tokens` | Tokens do design system (cores, tipografia) |
| `supabase/migrations` | Esquema remoto versionado (tabelas, RLS e funções) |
| `supabase/functions` | Edge Functions em Deno: `generate-plan`, `extract-assessment`, `photo-storage` |
| `docs` | Documentação de análise e projeto (requisitos, UML, arquitetura) e apresentações |

## Como rodar

Instale as dependências na raiz do projeto:

```bash
npm install
```

**Mobile:**

```bash
cd apps/mobile
npm start          # mesma rede
npm run tunnel     # túnel pelo cloudflared, para redes que isolam os aparelhos
```

Depois, leia o QR Code com o Expo Go. O app precisa de `apps/mobile/.env` com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Com `EXPO_PUBLIC_MODO_MOCK=1`, ele roda sem SQLite nem Supabase, com contas de demonstração. O APK é gerado pelo EAS (`eas build -p android --profile preview`, de dentro de `apps/mobile`).

**Edge Functions:** as chaves ficam como *secrets* do Supabase, nunca no app: `GEMINI_API_KEY` (e, opcionalmente, `GEMINI_MODELS`), `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` e `NTFY_TOPIC`. Para testar a IA de verdade, localmente, use `npm run try:plan`, que lê `supabase/functions/.env`.

**Web:**

```bash
npm run dev
```

Depois, abra [http://localhost:3000](http://localhost:3000).

## Testes

```bash
cd packages/core && npm test      # 383: domínio e casos de uso
cd packages/db   && npm test      #  47: adapters Supabase
cd apps/mobile   && npm test      # 168: SQLite real, gateways, hooks, telas e E2E
npm run test:functions            #  59: Edge Functions (Deno)
```

`npm run test:coverage` (em `packages/core` e `apps/mobile`) exige no mínimo 80% de cobertura.

## Documentação

A especificação completa está em [`docs/`](docs/README.md): requisitos, casos de uso, diagramas de classes, objetos, estados, sequência, atividades, componentes, DDD, Clean Architecture, plano de testes e lacunas. O documento corrido da disciplina está em [`docs/projeto-mobile.md`](docs/projeto-mobile.md) (HTML e PDF gerados por `node docs/build-projeto.mjs --pdf`). O contexto de produto está em [`PRODUCT.md`](PRODUCT.md), e o de design, em [`DESIGN.md`](DESIGN.md).
