# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Praticante individual de musculação/fitness que acompanha o próprio progresso: registra avaliações corporais periódicas, executa e registra treinos de força (com foco em progressão de carga ao longo do tempo) e acompanha metas nutricionais diárias (macros e refeições). Uso solo, sem papel de treinador/administrador nesta fase inicial.

## Product Purpose

Px GYM centraliza em um único lugar o que hoje fica espalhado entre planilhas, apps de treino e apps de dieta: evolução corporal, cargas de treino e metas nutricionais. Sucesso é o usuário conseguir, em poucos toques, ver "como estou evoluindo" e registrar o treino/refeição do dia sem fricção — inclusive em pé, no meio da academia, no celular.

## Positioning

Diferente de apps de treino genéricos (foco em biblioteca de exercícios) ou apps de dieta genéricos (foco em contagem de calorias), Px GYM une avaliação corporal, progressão de carga e metas nutricionais numa única visão de progresso, com a progressão de carga como cidadã de primeira classe (não um campo secundário).

## Operating Context

- Uso majoritariamente mobile, muitas vezes dentro da academia, entre séries (sessões curtas, uma mão, boa legibilidade sob luz de academia/pouca atenção).
- Uso desktop mais provável em momentos de planejamento/revisão (olhar evolução, ajustar metas).
- Rotina esperada: registrar carga por série durante o treino; check diário/periódico de refeições e macros; avaliação corporal em intervalos (ex.: semanal/mensal), não diária.

## Capabilities and Constraints

Módulo inicial (mockado, sem backend ainda):
- Dashboard com avaliação corporal atual (peso, % gordura, medidas) e progresso.
- Módulo de treino: lista de exercícios do dia, checkbox de conclusão, registro de carga por exercício/série com foco em visualizar progressão.
- Módulo de nutrição: metas de macros (proteína, carboidrato, gordura) e refeições do dia.

Persistência de dados real (banco de dados) fica para uma fase posterior — decisão em aberto. Autenticação/multi-usuário fora de escopo nesta fase.

## Brand Commitments

Nome do produto: **Px GYM**. Identidade visual (paleta, tipografia, tom) ainda não definida — a definir na fase de new-work, inspirando-se no brief visual fornecido pelo usuário (referência: Dribbble "Fitness Website Design", tema dark/moderno com cor de destaque vibrante).

## Evidence on Hand

Nenhum dado real disponível ainda. Todo conteúdo desta fase (avaliações, cargas, refeições) é mockado no frontend e deve ser tratado como dado de demonstração, não como fato do produto.

## Product Principles

1. Progressão de carga é o centro do módulo de treino, não um campo a mais — o usuário deve ver "subi de peso" de forma óbvia.
2. Fricção mínima durante o treino: registrar carga/marcar série deve caber em um toque.
3. Progresso corporal e nutricional contado visualmente (barras/gráficos), não só em números.
4. Mobile é o caso de uso primário; desktop expande a mesma informação, não a reinventa.

## Accessibility & Inclusion

Nenhum requisito específico confirmado pelo usuário ainda. Seguir padrão de acessibilidade AA por padrão (contraste, alvos de toque, leitura por teclado/leitor de tela) dado o contexto de uso em academia (atenção dividida, luz variável).
