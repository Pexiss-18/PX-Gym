# Roteiro: apresentação como prova (10 min)

Deck: `docs/apresentacao/apresentacao-prova.html` (13 slides). Regerar: `node docs/apresentacao/prova/build.mjs`.
O roteiro fecha em **9:20**, o que deixa folga. Cada item do enunciado tem o seu slide, e o título dele repete as palavras do enunciado.

| # | Slide | Item do enunciado | Tempo | Acumulado |
|---|---|---|---|---|
| 1 | Capa | — | 0:20 | 0:20 |
| 2 | O que é o Px GYM | Apresentação do aplicativo | 0:50 | 1:10 |
| 3 | O cliente principal e o problema | Cliente principal · Problema | 0:50 | 2:00 |
| 4 | Público-alvo | Público-alvo | 0:35 | 2:35 |
| 5 | Perfis de usuário | Perfis | 0:40 | 3:15 |
| 6 | Principais recursos | Recursos | 0:45 | 4:00 |
| 7 | Câmera e geolocalização | Câmera e GPS | 0:50 | 4:50 |
| 8 | O que é offline e o que é online | Online × offline | 0:45 | 5:35 |
| 9 | Metodologia de sincronização | Sincronização | 1:00 | 6:35 |
| 10 | Como o Supabase é usado | Supabase | 0:45 | 7:20 |
| 11 | Outros serviços na nuvem | Outros serviços | 0:40 | 8:00 |
| 12 | Segurança no acesso à nuvem | Segurança | 1:00 | 9:00 |
| 13 | Obrigado | — | 0:20 | 9:20 |

## Fala

**1 · Capa.** “O Px GYM é um app de musculação para Android e iOS, feito em Expo e React Native com o Supabase como back-end.”

**2 · O que é.** Ler a frase em destaque. Depois: o app junta três coisas que hoje ficam separadas, que são o treino com a progressão de carga, a evolução do corpo (avaliações, medidas e fotos) e um treino e uma dieta gerados por IA a partir da avaliação. O print é a tela inicial real.

**3 · Cliente e problema.** O cliente principal é quem treina e quer saber se está evoluindo. O problema tem quatro partes: os dados ficam espalhados, a carga é tratada como detalhe, a academia não tem sinal e montar treino e dieta custa caro. O ponto que diferencia o app é o terceiro: **registrar uma série nunca depende da internet**.

**4 · Público-alvo.** Praticantes no centro. Ao redor deles estão os personais, que acompanham por ciclos de avaliação, e as academias, pela coordenação. Por último, quem treina sem sinal ou sem dinheiro, porque o app funciona offline e é gratuito.

**5 · Perfis.** Percorrer a tabela. O papel vem da sessão. O personal entra por um **token com validade**, sem criar conta. A coordenação aprova ou devolve o relatório que o personal assinou. Fechar com o ator de tempo, a sincronização.

**6 · Recursos.** Uma coluna por momento: durante o treino, acompanhando a evolução e planejando. Destacar a carga em passos de 2,5 kg sem teclado, o PDF da avaliação lido pela IA e o pedido de ajuste (“não tenho esse aparelho”).

**7 · Câmera e GPS.** A câmera aparece em dois usos: a foto de progresso, salva primeiro no celular, e o QR Code do aparelho, que abre o exercício. O GPS também tem dois: grava onde a foto foi tirada e acha academias num raio de 4 km pelo OpenStreetMap. Os dois ficam atrás de interfaces do domínio, por isso as regras são testadas sem celular. A permissão só é pedida no toque.

**8 · Online × offline.** O lado esquerdo é tudo o que acontece no treino. O celular é a fonte da verdade (SQLite) e manda para a nuvem depois. O lado direito precisa de servidor: login, IA e dados lidos do Supabase.

**9 · Sincronização (o slide mais importante, sem pressa).** Seguir os cinco passos. São três pontos-chave:
1. O **id nasce no celular** (UUID) e o envio é um **upsert por id**, então reenviar não duplica.
2. Os **três estados**: pending, synced e deleted. Uma série desmarcada vira tombstone e só sai do celular depois que a nuvem confirma.
3. Os **gatilhos** são o login, a volta ao app e a reconexão da rede. Se falhar, o registro continua pendente sem alerta. As fotos seguem o mesmo padrão e ainda são baixadas de volta ao reinstalar.

**10 · Supabase.** Quatro partes. O **Auth** emite o JWT. O **Postgres** guarda os dados, com o esquema versionado em migrations. O **Storage** guarda o PDF da avaliação. As **Edge Functions** são três (gerar plano, ler PDF e autorizar foto), e só elas guardam segredos.

**11 · Outros serviços.** O Gemini gera os planos e a fórmula confere: “a IA propõe, a fórmula confere”. O R2 guarda as fotos por URL assinada de 5 min. O OpenStreetMap fornece as academias, o ntfy avisa o admin e o EAS gera o APK.

**12 · Segurança.** Ler o subtítulo: o app só tem a chave pública, e quem decide o acesso é o servidor. Depois as três colunas. No aparelho, a sessão é cifrada. No banco há **RLS em todas as tabelas**. Nas funções, o JWT é conferido, os segredos ficam em secrets e há limites de uso. Por último, o diagrama de baixo mostra o caminho de uma chamada.

**13 · Encerramento.** “Treino registrado sem internet, nuvem como cópia segura. Obrigado.”

## Perguntas prováveis

- **E se dois aparelhos editarem a mesma série?** Cada registro tem dono único (o usuário) e id gerado no aparelho que o criou. Na prática não há escrita concorrente na mesma linha: o upsert por id faz a última escrita valer.
- **A chave anon no app não é um risco?** Não. Ela é pública por definição. Sem o JWT de um usuário, o RLS não devolve nenhuma linha, e com o JWT devolve só as dele.
- **Por que R2 e não o Storage do Supabase para as fotos?** O gratuito do R2 tem 10 GB contra 1 GB. O código trava o uso abaixo do limite gratuito (9 GB no total, 300 MB por pessoa).
- **A IA pode errar a dieta?** Pode, e por isso a fórmula recalcula as porções e confere calorias e proteína antes de salvar. A lesão informada no perfil vira veto por código, porque o modelo ignorou a restrição escrita no teste real.
- **Personal e coordenação já usam o Supabase?** O fluxo do ciclo de avaliação (personal e coordenação) tem domínio, telas e testes prontos e roda no modo de demonstração. O aluno é o perfil que usa o back-end real.
