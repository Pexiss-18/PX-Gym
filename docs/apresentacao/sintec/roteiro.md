# Roteiro — Px GYM no II SINTEC 2026

**Quarta, 21/10/2026, 09:30 · online (Google Meet) · avaliador: Wanderson Gomes de Souza**

**Tempo: 10 minutos.** O roteiro termina em **8:40** e deixa ~1:20 de folga para atraso no
compartilhamento de tela, uma pausa ou um slide que se estenda. Os tempos são acumulados.
Se aos 5:00 você ainda não tiver saído do slide 6, corte o slide 7 (só leia o título) e os
prints (passe direto, 15 s cada).

**Quem fala:** Paulo abre e conduz os slides 1 a 6 (0:00–4:40); Assis assume do 7 ao 13
(4:40–8:40). Quem não está falando avança os slides, para a troca não custar tempo. Nas perguntas,
cada um responde sobre a sua parte.

Antes de começar: abra `apresentacao-sintec.html` no Chrome, aperte `F` (tela cheia) e
compartilhe **a aba** no Meet (“Compartilhar aba do Chrome”), não a janela inteira.

---

### 1 · Capa — 0:00 a 0:20 · Paulo
Bom dia. Somos Paulo Rogério e Assis Damasceno, com orientação do professor Lázaro Eduardo da Silva.
Vamos apresentar o Px GYM, um aplicativo móvel na área de Produtos Digitais.

### 2 · Objetivo — 0:20 a 1:05 · Paulo
O objetivo é um só lugar para ver “como estou evoluindo” e registrar o treino sem atrito: em pé,
entre séries, com uma mão e, muitas vezes, sem sinal. Na prática: registrar séries e cargas em um
toque, mesmo offline; transformar isso em progresso visível; e gerar treino e dieta a partir da
avaliação, com uma IA conferida por regras.

### 3 · Justificativa — 1:05 a 2:00 · Paulo
Não falta app de treino. O problema é que a informação está espalhada (aponte o diagrama): carga na
planilha, exercício num app, dieta em outro e a avaliação num PDF. A progressão de carga, principal
sinal de evolução no treino de força, vira um campo secundário. E a academia tem internet ruim: um
app que depende de rede perde o dado na hora de salvar. Tudo roda em planos gratuitos.

### 4 · Metodologia — 2:00 a 2:50 · Paulo
Desenvolvimento incremental: cada etapa termina com algo que roda e tem teste. Web em agosto, o app
móvel em nove etapas, a especificação UML em setembro, domínio e interface e, em outubro, a IA.
Quatro práticas guiaram tudo: DDD, Clean Architecture, TDD e offline-first.

### 5 · Arquitetura — 2:50 a 3:45 · Paulo
O núcleo de regras é TypeScript puro e roda sem celular, por isso é fácil de testar. Telas chamam
casos de uso, que usam o domínio, e tudo que é externo fica atrás de interfaces. Na nuvem, o
Supabase: login, Postgres com RLS (cada usuário só vê os próprios dados), fotos e uma Edge Function
que fala com o Gemini. A chave da IA nunca vai para o celular.

### 6 · Offline-first — 3:45 a 4:40 · Paulo
O coração do app. O toque grava no SQLite do celular, com o id gerado no aparelho, e a tela
atualiza na hora. A sincronização acontece no login, ao voltar ao app ou quando a rede volta, por
upsert por id: reenviar não duplica. Série desmarcada vira marca de remoção e só sai do servidor na
próxima sincronização. *Passando a palavra para o Assis, que mostra o app funcionando.*

### 7 · O que o app faz hoje — 4:40 a 5:15 · Assis
Só os títulos e um destaque de cada: carga em passos de 2,5 kg sem teclado, gráficos de evolução e
relatório assinado pelo personal, QR Code dos aparelhos e academias por perto.

### 8 · IA — 5:15 a 6:20 · Assis
A regra é: a IA propõe, a fórmula confere. O Gemini devolve treino e dieta em JSON, e regras
conferem cada número: calorias a até 15% da referência de Mifflin-St Jeor, proteína entre 1,4 e
2,4 g/kg, exercícios só do catálogo. No teste real o modelo ignorou uma restrição de lesão; por isso
a lesão do perfil veta o exercício por código. Back-end pronto e testado; a tela no app é a próxima
entrega.

### 9 e 10 · Prints — 6:20 a 7:20 · Assis
Trinta segundos por slide. Nomeie as telas sem ler as legendas.

### 11 · Considerações finais — 7:20 a 8:20 · Assis
O objetivo central foi cumprido: o treino é registrado sem internet e vira progresso visível.
São 453 testes automatizados, custo zero de infraestrutura e APK Android pelo EAS Build. Próximos
passos: a tela do plano gerado pela IA, registro de refeições com a tabela TACO, artigos científicos
citados em cada plano e testes com praticantes reais.

### 12 · Referências — 8:20 a 8:30 · Assis
Deixe na tela por alguns segundos.

### 13 · Encerramento — 8:30 a 8:40 · Assis
Obrigado. Ficamos à disposição para perguntas.

---

## Perguntas prováveis

- **Por que não guardar direto no Supabase?** Porque na academia a rede falha. O celular é a fonte
  da verdade durante o treino, e a nuvem é cópia e histórico.
- **E se a mesma série for enviada duas vezes?** O id nasce no aparelho e o envio é upsert por id:
  o segundo envio sobrescreve o primeiro, sem duplicar.
- **A IA não pode errar a dieta?** Pode, por isso ela não decide sozinha: toda proposta passa por
  faixas calculadas (Mifflin-St Jeor, g/kg de proteína e gordura), e o app lista o que foi ajustado.
- **Por que Gemini?** Tem plano gratuito sem cartão (500 pedidos/dia no Flash-Lite). O provedor
  fica atrás de um adaptador, então trocar de modelo não mexe no domínio.
- **Como garantem a qualidade?** São 453 testes automatizados (Jest no domínio, nos repositórios
  e nas telas; Deno nas regras da IA), rodados a cada mudança.
- **Dados de saúde e privacidade?** O RLS do Postgres faz cada usuário ler só os próprios
  registros, e a sessão fica cifrada no aparelho.
