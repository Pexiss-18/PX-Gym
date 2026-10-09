# Px GYM

Aplicativo pessoal de musculação que reúne num só lugar a **evolução corporal**, a **progressão de carga nos treinos** e as **metas nutricionais**.

## Funcionalidades

- Registro de séries e cargas durante o treino, inclusive sem internet (offline-first)
- Gráficos de progressão de carga e de composição corporal
- Avaliações corporais periódicas (peso, % de gordura, medidas)
- Metas de macronutrientes e refeições do dia
- Fotos de progresso
- Leitor de QR Code dos aparelhos da academia
- Busca de academias próximas pelo GPS

## Estrutura do repositório

Monorepo com npm workspaces:

| Pasta | Conteúdo |
|---|---|
| `apps/mobile` | App mobile (Expo / React Native) |
| `apps/web` | App web (Next.js) |
| `packages/core` | Regras de domínio compartilhadas entre web e mobile |
| `packages/db` | Camada de dados |
| `packages/tokens` | Tokens do design system (cores, tipografia) |
| `supabase` | Migrações do banco remoto |
| `docs` | Documentação de análise e projeto (requisitos, UML, arquitetura) |

## Como rodar

Instale as dependências na raiz do projeto:

```bash
npm install
```

**Web:**

```bash
npm run dev
```

Depois, abra [http://localhost:3000](http://localhost:3000).

**Mobile:**

```bash
cd apps/mobile
npm start
```

Depois, leia o QR Code com o app Expo Go.

**Testes** (em `apps/mobile`, `packages/core` ou `packages/db`):

```bash
npm test
```

## Documentação

A especificação completa está em [`docs/`](docs/README.md): requisitos, casos de uso, diagramas de classes, estados, sequência, atividades, componentes e decisões de implementação. Contexto de produto em [`PRODUCT.md`](PRODUCT.md) e de design em [`DESIGN.md`](DESIGN.md).
