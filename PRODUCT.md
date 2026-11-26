# Product

<!-- impeccable:product-schema 1 -->

## Platform

mobile (iOS e Android, Expo / React Native). Existe um web (Next.js) da primeira fase, hoje parado.

## Users

O principal usuário é o praticante individual de musculação que acompanha o próprio progresso. Ele registra a carga de cada série durante o treino, faz avaliação corporal periódica (digitada ou pelo PDF da bioimpedância) e segue o treino e a dieta que o app monta para ele. Usa o app sozinho e só vê os próprios dados.

No módulo de relatório do ciclo de treino entram mais dois papéis: o **personal**, que avalia o aluno e assina o relatório (com conta ou com um código que o aluno gera), e a **coordenação** da academia, que aprova ou devolve o relatório.

## Product Purpose

O Px GYM centraliza num único lugar o que hoje fica espalhado entre planilhas, apps de treino e apps de dieta: evolução corporal, cargas de treino, plano de treino, dieta e fotos de progresso. O usuário tem sucesso quando consegue, em poucos toques, ver "como estou evoluindo", saber o que treinar hoje e registrar a série sem fricção, inclusive em pé, no meio da academia, sem sinal.

## Positioning

Apps de treino genéricos focam em biblioteca de exercícios; apps de dieta focam em contagem de calorias. O Px GYM une avaliação corporal, progressão de carga e planos numa única visão de progresso. A progressão de carga é cidadã de primeira classe, não um campo secundário. A IA monta o treino e a dieta a partir da avaliação da pessoa, mas sempre com a regra "a IA propõe, a fórmula confere": catálogo fechado de exercícios e metas conferidas por fórmula, para o número na tela ser confiável.

## Operating Context

- Uso majoritariamente mobile, dentro da academia, entre séries: sessões curtas, uma mão, atenção dividida, luz variável e, com frequência, sem internet (subsolo, Wi-Fi lotado).
- Planejamento e revisão (gerar ou ajustar o plano, registrar a avaliação, olhar a evolução) acontecem fora do treino, com conexão.
- Rotina esperada: registrar carga a cada série; abrir a dieta e o cardápio do dia; avaliação corporal a cada algumas semanas, que dispara a sugestão de atualizar o plano.

## Capabilities and Constraints

Implementado (no ar, com dados reais):
- Login e cadastro (Supabase Auth), com a sessão cifrada no aparelho.
- Treino do dia montado do plano gerado por IA, disponível offline; registro de séries offline com progressão de carga, descanso e curva por exercício; guia de execução; leitor de QR dos aparelhos.
- Perfil de treino; avaliação corporal digitada ou lida do PDF; gráficos de composição corporal.
- Treino e dieta gerados pela IA (Gemini, em Edge Functions), com pedido de mudança em texto livre, fila quando a cota acaba e limites diários; dieta com cardápio da semana.
- Fotos de progresso em 9:16, com local só no aparelho, envio diferido ao Cloudflare R2, exclusão e restauração.
- Academias por perto (OpenStreetMap) com mapa e lista.
- Relatório do ciclo de treino (aluno, personal, coordenação) com regras e telas prontas, mas dados em memória.

Restrições:
- Orçamento zero: só serviços com plano gratuito e sem cartão para uso (Gemini Flash-Lite, Supabase, R2 com trava de custo, OpenStreetMap).
- Registro de refeições consumidas não existe: o app mostra a meta e o cardápio, não o que foi comido.

## Brand Commitments

Nome do produto: **Px GYM**. Tema escuro com acento "volt" (verde-limão vibrante), tipografia Geist e Geist Mono, cartões de vidro. O sistema completo está em [`DESIGN.md`](DESIGN.md), com os tokens em `packages/tokens`. Textos do app em português do Brasil, em tom direto e próximo ("Tirar foto de hoje", "Não deu pra buscar agora").

## Evidence on Hand

O app roda com dados reais no Supabase e foi testado em emulador Android (APK) e em iPhone (Expo Go). Há 657 testes automatizados. Não existe ainda pesquisa formal com usuários nem métrica de uso.

## Product Principles

1. A progressão de carga é o centro do módulo de treino, não um campo a mais: o usuário deve ver "subi de peso" de forma óbvia.
2. Fricção mínima durante o treino: registrar carga e marcar série cabe em um toque e nunca espera a rede.
3. Nada se perde sem internet: o que a pessoa produz no treino fica no aparelho e sobe depois, sem alerta no meio da série.
4. A IA propõe, a fórmula confere: nenhum número da IA chega à tela sem passar por regra determinística.
5. Progresso corporal e nutricional contado visualmente (barras e gráficos), não só em números.

## Accessibility & Inclusion

Não há requisito específico confirmado com usuários. Segue o padrão AA por padrão (contraste, alvos de toque grandes, leitura por leitor de tela), pelo contexto de uso na academia (atenção dividida, luz variável). Ajuste de carga por stepper sem teclado e feedback háptico ao marcar a série.
