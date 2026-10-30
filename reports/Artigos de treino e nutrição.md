# Vinte e cinco artigos para o acervo do Px GYM

Para começar o acervo, a melhor base são **25 artigos**: 13 de treino e 12 de nutrição. São quase todos meta-análises recentes ou posicionamentos oficiais, e **21 deles são de acesso aberto**. No treino, a base é o novo **posicionamento do ACSM de 2026** ([Currier 2026](https://doi.org/10.1249/MSS.0000000000003897)), que substitui o de 2009. Ao lado dele entram a meta-regressão de volume e frequência de **Pelland 2025/26** ([Pelland](https://doi.org/10.1007/s40279-025-02344-w)) e a meta-análise em rede de **Currier 2023** ([Currier 2023](https://doi.org/10.1136/bjsports-2023-106807)). Na nutrição, o pilar é a meta-análise de proteína de **Morton 2018**, a mais citada da área (~1.140 citações no OpenAlex) ([Morton](https://doi.org/10.1136/bjsports-2017-097608)). Em volta dela ficam os posicionamentos da ISSN (abertos) e o consenso do COI sobre suplementos ([Maughan 2018](https://doi.org/10.1136/bjsports-2018-099027)). Em conjunto, esses papers mudam as regras do app em pontos concretos:

- **Volume:** é a variável que mais pesa na hipertrofia. A dose mínima é de 4 séries por músculo por semana.
- **Carga e falha:** a carga quase não muda a hipertrofia, desde que a série termine perto da falha. Chegar à falha total não é obrigatório.
- **Proteína:** 1,6 g/kg/dia é o ponto de retornos decrescentes.
- **Déficit:** acima de ~500 kcal/dia, ele trava o ganho de massa magra.
- **Suplementos:** só creatina e cafeína valem como padrão para quem treina força.

Todas as contagens de citação vêm do **OpenAlex**, que costuma registrar 30–50% menos que o Google Scholar. Por isso servem para comparar os papers entre si, não como número absoluto. Vários valores prescritivos foram tirados de tabelas do texto completo e não foram conferidos de novo. A seção de conflitos marca cada um deles, para você checar antes de gravar no `acervo.ts`.

## O núcleo cabe em 25 entradas porque os papers novos absorvem os antigos

Hoje o arquivo `supabase/functions/_shared/plano/acervo.ts` tem só a interface, sem nenhum artigo. Então dá para começar enxuto. Dois critérios guiaram a escolha. O primeiro foi preferir sínteses que já agregam dezenas de estudos. O posicionamento ACSM 2026, por exemplo, é uma revisão guarda-chuva de **137 revisões sistemáticas com mais de 30 mil participantes** ([Currier 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823)). O segundo foi preferir textos de acesso aberto, porque o resumo de cada entrada precisa ser conferível e o acervo inteiro vai no prompt.

O `id` em cada linha é só uma sugestão de slug no padrão do projeto. A coluna "Números que mudam a prescrição" é o que deveria ir para o campo `resumo`. A coluna "Citações" traz a contagem do OpenAlex de 27/10/2026.

### Treino (força e hipertrofia), em ordem de prioridade

| # | id sugerido | Referência e DOI | Tipo de estudo | Citações | Acesso aberto | Números que mudam a prescrição |
|---|---|---|---|---|---|---|
| 1 | `currier-2026-acsm` | Currier BS, D'Souza AC, Fiatarone Singh MA, … Phillips SM. ACSM Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. *Med Sci Sports Exerc* 2026;58(4):851–872. DOI 10.1249/MSS.0000000000003897 | Posicionamento oficial (revisão guarda-chuva) | 76 (em ~7 meses) | Sim (PMC12965823) | Treinar todos os grandes grupos musculares **≥2×/semana**. Com volume igual, a hipertrofia é a mesma treinando 1 ou >5 dias/semana. O exercício feito primeiro na sessão ganha mais força. Ordem, peso livre vs máquina e periodização não mudam a hipertrofia. |
| 2 | `pelland-2026-volume-frequencia` | Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains. *Sports Med* 56:481–505. DOI 10.1007/s40279-025-02344-w (preprint 10.51224/srxiv.460) | Meta-regressão bayesiana multinível, 67 estudos, n=2058 | 18 (recente) | Publicado: não. Preprint: sim | Hipertrofia: dose mínima de **4 séries/músculo/semana**, eficiência máxima entre **5 e 10 séries**, retornos decrescentes sem "U invertido" até ~30–40 séries. A série em que o músculo atua como sinergista conta como **0,5**. Força: platô funcional perto de **4 séries/semana**. A frequência aumenta a força (12,7% com 1 sessão vs 17,3% com 2). |
| 3 | `currier-2023-nma` | Currier BS, McLeod JC, Banfield L, … Phillips SM. Resistance training prescription for muscle strength and hypertrophy in healthy adults: a systematic review and Bayesian network meta-analysis. *Br J Sports Med* 2023;57(18):1211–1220. DOI 10.1136/bjsports-2023-106807 | Meta-análise em rede bayesiana (178 ECRs de força, 119 de hipertrofia) | 178 | Sim | Melhor para hipertrofia: **várias séries, carga mais alta, 2×/semana** (SMD 0,66). Melhor para força: **>80% 1RM, várias séries, 3×/semana** (SMD 1,60). Todas as prescrições produziram hipertrofia parecida. |
| 4 | `robinson-2024-proximidade-falha` | Robinson ZP, Pelland JC, Remmert JF, Refalo MC, Jukic I, Steele J, Zourdos MC. Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy. *Sports Med* 2024;54:2209–2231. DOI 10.1007/s40279-024-02069-2 | Série de meta-regressões (RIR estimado) | 63 | Sim | A hipertrofia melhora quanto mais perto da falha a série termina. O ganho de força é parecido numa faixa ampla de RIR. |
| 5 | `refalo-2023-falha` | Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ. Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy. *Sports Med* 2023;53(3). DOI 10.1007/s40279-022-01784-y | Revisão sistemática e meta-análise, 15 estudos | 61 | Sim | Treinar até a falha momentânea não deu vantagem sobre parar antes (ES 0,12, IC −0,13 a 0,37). Juntando todas as definições de falha, a vantagem foi trivial (ES 0,19). A relação parece não linear. |
| 6 | `lopez-2021-carga` | López P, Radaelli R, Taaffe DR, … Kraemer WJ, et al. Resistance Training Load Effects on Muscle Hypertrophy and Strength Gain: Systematic Review and Network Meta-analysis. *Med Sci Sports Exerc* 2021;53(6). DOI 10.1249/MSS.0000000000002585 | Meta-análise em rede, 28 estudos, n=747 | 340 | Sim | Com séries até a falha, a hipertrofia é igual com carga baixa (>15RM), moderada (9–15RM) ou alta (≤8RM). Para força, carga alta supera carga baixa (SMD 0,60–0,63). |
| 7 | `acsm-2009-progressao` | American College of Sports Medicine (Ratamess NA et al.). Progression Models in Resistance Training for Healthy Adults. *Med Sci Sports Exerc* 2009;41(3):687–708. DOI 10.1249/MSS.0b013e3181915670 | Posicionamento oficial | 4.330 | Não, segundo o OpenAlex (status de leitura gratuita a conferir) | Aumentar a carga em **2–10%** quando o aluno fizer **1–2 repetições acima** da meta. Iniciantes: 8–12RM, 2–3 dias/semana. Intermediários: 3–4 dias/semana. Avançados: 4–5 dias/semana. |
| 8 | `plotkin-2022-progressao-reps` | Plotkin D, Coleman M, Van Every D, … Schoenfeld BJ, et al. Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations. *PeerJ* 2022;10:e14142. DOI 10.7717/peerj.14142 | ECR, n=43 treinados, 8 semanas | 76 | Sim | Progredir em repetições com a carga fixa funcionou tão bem quanto progredir em carga, tanto na hipertrofia quanto no 1RM. |
| 9 | `singer-2024-descanso` | Singer A, Wolf M, Generoso L, et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. *Front Sports Act Living* 2024;6:1429789. DOI 10.3389/fspor.2024.1429789 | Meta-análise bayesiana, 9 estudos | 14 | Sim | Descansar **>60 s** dá um pequeno benefício na hipertrofia. A evidência de ganho extra acima de **90 s** é equívoca. |
| 10 | `pallares-2021-amplitude` | Pallarés JG, Hernández-Belmonte A, Martínez-Cava A, Vetrovsky T, Steffl M, Courel-Ibáñez J. Effects of range of motion on resistance training adaptations. *Scand J Med Sci Sports* 2021;31(10):1866–1881. DOI 10.1111/sms.14006 | Revisão sistemática e meta-análise com GRADE, 16 estudos | 80 | Sim | A amplitude completa supera a parcial em força (ES 0,56) e em hipertrofia de membros inferiores (ES 0,88). |
| 11 | `schumann-2022-concorrente` | Schumann M, Feuerbacher JF, Sünkeler M, Freitag N, Rønnestad BR, Doma K, Lundberg TR. Compatibility of concurrent aerobic and strength training for skeletal muscle size and function. *Sports Med* 2022;52(3):601–612. DOI 10.1007/s40279-021-01587-7 | Revisão sistemática e meta-análise, 43 estudos | 155 | Sim | Fazer aeróbico junto com musculação não prejudica a hipertrofia (SMD −0,01) nem a força máxima. A força explosiva cai (SMD −0,28), sobretudo quando os dois são feitos na mesma sessão. Com **≥3 h** de intervalo, a queda deixa de ser significativa. |
| 12 | `bell-2023-deload` | Bell L, Strafford BW, Coleman M, Androulakis Korakakis P, Nolan D. Integrating deloading into strength and physique sports training programmes: an international Delphi consensus approach. *Sports Med Open* 2023;9:87. DOI 10.1186/s40798-023-00633-0 | Consenso Delphi de especialistas | 17 | Sim | No deload, reduzir o volume (séries, repetições, dias ou exercícios), manter a intensidade e treinar mais longe da falha. Não houve consenso sobre intervalo ou duração fixos. |
| 13 | `oms-2020-atividade-fisica` | Bull FC, Al-Ansari SS, Biddle S, et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. *Br J Sports Med* 2020;54(24):1451–1462. DOI 10.1136/bjsports-2020-102955 | Diretriz oficial | 11.595 | Sim (CC BY) | **150–300 min/semana de atividade moderada** ou 75–150 min de vigorosa. Fortalecimento muscular **≥2 dias/semana**. A partir de 65 anos, treino multicomponente **≥3 dias/semana**. |

Os quatro primeiros itens já respondem a quase todas as perguntas que o gerador de treino precisa fazer. O ACSM 2026 confirma em nível de revisão guarda-chuva o que as meta-análises mostram uma a uma. O volume semanal é a variável principal ([Pelland](https://doi.org/10.51224/srxiv.460)). A carga é livre para hipertrofia e precisa ser alta para força ([López](https://doi.org/10.1249/MSS.0000000000002585); [Currier 2023](https://doi.org/10.1136/bjsports-2023-106807)). A frequência serve para distribuir o volume ao longo da semana ([Currier 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823)).

Os itens 7 e 8 cobrem a progressão, onde ainda falta meta-análise. O **ACSM 2009** continua sendo o único modelo de progressão explicitamente quantificado ([ACSM 2009](https://doi.org/10.1249/MSS.0b013e3181915670)). O **Plotkin 2022** autoriza progredir em repetições quando o equipamento tem saltos de carga grandes demais, como halteres ou máquinas com placas pesadas ([Plotkin](https://doi.org/10.7717/peerj.14142)). Os itens 9 a 13 cobrem a estrutura do programa (descanso, amplitude, cardio, deload) e os mínimos de saúde. O app deveria checar todo plano semanal contra esses mínimos ([OMS 2020](https://doi.org/10.1136/bjsports-2020-102955)).

### Nutrição esportiva, em ordem de prioridade

| # | id sugerido | Referência e DOI | Tipo de estudo | Citações | Acesso aberto | Números que mudam a prescrição |
|---|---|---|---|---|---|---|
| 1 | `morton-2018-proteina` | Morton RW, Murphy KT, McKellar SR, Schoenfeld BJ, Henselmans M, Helms E, Aragon AA, Devries MC, Banfield L, Krieger JW, Phillips SM. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. *Br J Sports Med* 2018;52(6):376–384. DOI 10.1136/bjsports-2017-097608 | Revisão sistemática, meta-análise e meta-regressão, 49 ECRs, n=1863 | ~1.140 | Sim | Acima de **1,62 g/kg/dia** de proteína total, não há ganho extra de massa livre de gordura. O limite superior do IC é de ~**2,2 g/kg/dia** (valor a conferir). O efeito diminui com a idade. |
| 2 | `nunes-2022-proteina` | Nunes EA, Colenso-Semple L, McKellar SR, … Phillips SM. Systematic review and meta-analysis of protein intake to support muscle mass and function in healthy adults. *J Cachexia Sarcopenia Muscle* 2022;13(2):795–810. DOI 10.1002/jcsm.12922 | Revisão sistemática e meta-análise de três níveis, 74 ECRs, com GRADE | ~280 | Sim | O benefício em massa magra aparece em quem tem **<65 anos a partir de 1,6 g/kg/dia**. Em quem tem **≥65 anos**, aparece já com **1,2–1,59 g/kg/dia**. O efeito é pequeno (SMD 0,22). |
| 3 | `schoenfeld-aragon-2018-por-refeicao` | Schoenfeld BJ, Aragon AA. How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution. *J Int Soc Sports Nutr* 2018;15:10. DOI 10.1186/s12970-018-0215-1 | Revisão crítica | ~125 | Sim | **0,4 g/kg por refeição em ≥4 refeições**, para chegar a 1,6 g/kg/dia. Para chegar a 2,2 g/kg/dia, até **0,55 g/kg por refeição**. |
| 4 | `helms-2014-preparacao` | Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. *J Int Soc Sports Nutr* 2014;11:20. DOI 10.1186/1550-2783-11-20 | Revisão narrativa com recomendações | ~225 | Sim | Ajustar as calorias para perder **0,5–1% do peso corporal por semana**. Proteína de **2,3–3,1 g/kg de massa magra** durante o déficit. |
| 5 | `murphy-koehler-2022-deficit` | Murphy C, Koehler K. Energy deficiency impairs resistance training gains in lean mass but not strength: A meta-analysis and meta-regression. *Scand J Med Sci Sports* 2022;32(1):125–137. DOI 10.1111/sms.14075 | Meta-análise e meta-regressão de ECRs | ~60 | Sim | Um déficit de **~500 kcal/dia** impediu o ganho de massa magra (ES −0,57), mas a força foi preservada. Os autores recomendam evitar déficits acima de 500 kcal/dia. |
| 6 | `iraki-2019-off-season` | Iraki J, Fitschen P, Espinar S, Helms E. Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review. *Sports* 2019;7(7):154. DOI 10.3390/sports7070154 | Revisão narrativa | ~80 | Sim | Superávit de **10–20%**, mirando ganho de **0,25–0,5% do peso por semana** em iniciantes e intermediários. Avançados devem ser mais conservadores. Proteína de 1,6–2,2 g/kg/dia em 3–6 refeições. |
| 7 | `mifflin-1990-tmb` | Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. A new predictive equation for resting energy expenditure in healthy individuals. *Am J Clin Nutr* 1990;51(2):241–247. DOI 10.1093/ajcn/51.2.241 | Estudo que propôs a equação | ~2.540 | Não | Homens: TMB = 10×kg + 6,25×cm − 5×idade + 5. Mulheres: a mesma conta − 161. Segundo Frankenfield 2005, é a equação que acerta dentro de ±10% em mais pessoas. |
| 8 | `thomas-2016-acsm-nutricao` | Thomas DT, Erdman KA, Burke LM. Nutrition and Athletic Performance. *Med Sci Sports Exerc* 2016;48(3):543–568. DOI 10.1249/MSS.0000000000000852 (versão AND/DC: 10.1016/j.jand.2015.12.006) | Posicionamento conjunto ACSM/AND/DC | 1.303 (MSSE), 1.352 (JAND) | Não, segundo o OpenAlex (status a conferir) | Proteína de 1,2–2,0 g/kg/dia. Carboidrato de **3–5 g/kg/dia** (treino leve) e **5–7 g/kg/dia** (~1 h/dia). Gordura de **20–35% da energia**. Valores de tabela, a conferir. |
| 9 | `henselmans-2022-carboidrato` | Henselmans M, Bjørnsen T, Hedderman R, Vårvik FT. The Effect of Carbohydrate Intake on Strength and Resistance Training Performance: A Systematic Review. *Nutrients* 2022;14(4):856. DOI 10.3390/nu14040856 | Revisão sistemática, 49 estudos | 61 | Sim | Comer mais carboidrato não melhora o desempenho de quem treina alimentado com **até 10 séries por músculo por sessão**. Em 15 de 17 estudos longos, não houve efeito. |
| 10 | `aragon-2026-issn-emagrecimento` | Aragon A, Campbell B, Schoenfeld B, Stout J, Kalman D, Arciero P, Arent S, Kreider R, Taylor L, Bannock L, Wildman R, Kerksick C, Antonio J. International Society of Sports Nutrition position stand: diets for body weight reduction. *J Int Soc Sports Nutr* 2026;23(1):2740266. DOI 10.1080/15502783.2026.2740266 | Posicionamento ISSN | ~0 (out/2026) | Sim (PMC13665703) | A proporção entre carboidrato e gordura pode seguir a preferência do usuário. O jejum intermitente não supera a restrição contínua. Dietas abaixo de 1.200 kcal não dão vantagem a longo prazo. A dieta cetogênica tende a reduzir mais a massa livre de gordura. |
| 11 | `maughan-2018-coi-suplementos` | Maughan RJ, Burke LM, Dvorak J, … Engebretsen L. IOC consensus statement: dietary supplements and the high-performance athlete. *Br J Sports Med* 2018;52(7):439–455. DOI 10.1136/bjsports-2018-099027 | Consenso do COI | 1.000 | Sim | Só **cafeína, creatina, tamponantes e nitrato** têm boa evidência. Cafeína: **3–6 mg/kg ~60 min antes** do treino. Creatina: 20 g/dia por 5–7 dias, depois **3–5 g/dia**. Vitamina D só depois de exame. |
| 12 | `kreider-2017-creatina` | Kreider RB, Kalman DS, Antonio J, Ziegenfuss TN, Wildman R, Collins R, Candow DG, Kleiner SM, Almada AL, Lopez HL. International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine. *J Int Soc Sports Nutr* 2017;14:18. DOI 10.1186/s12970-017-0173-z | Posicionamento ISSN | 855 | Sim | Uso de até **30 g/dia por 5 anos** foi seguro e bem tolerado em pessoas saudáveis. Uma ingestão habitual de **~3 g/dia** já traz benefício. |

A ordem segue a lógica de uma dieta montada pelo app. Primeiro vem a meta de proteína ([Morton](https://doi.org/10.1136/bjsports-2017-097608); [Nunes](https://doi.org/10.1002/jcsm.12922)) e a forma de distribuí-la nas refeições ([Schoenfeld & Aragon](https://doi.org/10.1186/s12970-018-0215-1)). Depois vem o tamanho do déficit ou do superávit ([Helms 2014](https://doi.org/10.1186/1550-2783-11-20); [Murphy & Koehler](https://doi.org/10.1111/sms.14075); [Iraki](https://doi.org/10.3390/sports7070154)), em seguida a estimativa do gasto energético ([Mifflin](https://doi.org/10.1093/ajcn/51.2.241)) e, por último, a divisão entre carboidrato e gordura ([Thomas 2016](https://doi.org/10.1249/MSS.0000000000000852); [Henselmans 2022](https://doi.org/10.3390/nu14040856); [Aragon 2026](https://doi.org/10.1080/15502783.2026.2740266)).

O Henselmans 2022 corrige uma leitura comum do Thomas 2016. As faixas de 6–12 g/kg de carboidrato valem para endurance e não devem ser o padrão de quem só faz musculação. Os dois papers de suplementos bastam para o módulo básico. A creatina tem números de efeito mais novos ([Ashtary-Larky 2025](https://doi.org/10.1080/15502783.2025.2586523)), mas a dose e a segurança continuam vindo de Maughan e Kreider.

## Outros bons artigos ficam como segunda camada, sem pesar no prompt

Os papers desta lista valem para consulta ou para uma segunda leva. A maioria repete o que o núcleo já cobre, é anterior a ele ou trata de um nicho. Os números estão nas notas e ficaram de fora para manter o prompt curto.

| Tema | Referência e DOI | Tipo | Citações | AA | Por que fica em segundo plano |
|---|---|---|---|---|---|
| Treino: volume | Schoenfeld, Ogborn, Krieger 2017, *J Sports Sci*. DOI 10.1080/02640414.2016.1210197 | Meta-regressão | 667 | Não | Clássico (cada série semanal a mais ≈ +0,37% de crescimento), superado por Pelland. |
| Treino: carga | Schoenfeld, Grgic, Ogborn, Krieger 2017, *JSCR*. DOI 10.1519/JSC.0000000000002200 | RS/MA | 851 | Não | Hipertrofia igual com carga baixa ou alta. López e Currier 2023 cobrem o mesmo ponto em acesso aberto. |
| Treino: carga | Schoenfeld, Grgic, Van Every, Plotkin 2021, *Sports*. DOI 10.3390/sports9020032 | Revisão | 332 | Sim | Revisa o "contínuo de repetições". É conceitual. |
| Treino: falha | Grgic, Schoenfeld, Orazem, Sabol 2022, *JSHS*. DOI 10.1016/j.jshs.2021.01.007 | RS/MA | 204 | Sim | Falha e não falha deram resultado parecido. Refinado por Robinson 2024. |
| Treino: falha | Refalo et al. 2024, *J Sports Sci*. DOI 10.1080/02640414.2024.2321021 | ECR em treinados | 29 | Sim | Hipertrofia igual treinando até a falha ou com 1–2 RIR. Falhar gerou mais fadiga. |
| Treino: frequência | Schoenfeld, Grgic, Krieger 2019, *J Sports Sci*. DOI 10.1080/02640414.2018.1555906 | RS/MA | 182 | Não | Com volume igual, a frequência não muda a hipertrofia. Absorvido por Pelland e ACSM 2026. |
| Treino: frequência | Grgic et al. 2018, *Sports Med*. DOI 10.1007/s40279-018-0872-x | RS/MA | 365 | Verde | Frequência e força. Contradito em parte por Pelland. |
| Treino: frequência | Schoenfeld, Ogborn, Krieger 2016, *Sports Med*. DOI 10.1007/s40279-016-0543-8 | RS/MA | 306 | Não | Superado pela versão de 2019. |
| Treino: volume | Baz-Valle et al. 2022, *J Hum Kinet*. DOI 10.2478/hukin-2022-0017 | RS | 83 | Sim | Sugere 12–20 séries por músculo por semana para treinados. |
| Treino: volume e força | Ralston et al. 2017, *Sports Med*. DOI 10.1007/s40279-017-0762-7 | MA | 221 | Sim | Volume semanal e força. |
| Treino: progressão | Kraemer & Ratamess 2004, *MSSE*. DOI 10.1249/01.MSS.0000121945.36635.61 | Revisão | 1.974 | Não | Base do ACSM 2009. |
| Treino: geral | Garber et al. 2011 (ACSM), *MSSE*. DOI 10.1249/MSS.0b013e318213fefb | Posicionamento | 9.304 | Verde | Cardio, flexibilidade (≥2 dias/semana, 60 s por exercício) e treino neuromotor. Redundante com a OMS para o app. |
| Treino: periodização | Moesgaard et al. 2022, *Sports Med*. DOI 10.1007/s40279-021-01636-1 | RS/MA, 35 estudos | 66 | Não | A periodização melhora o 1RM (ES 0,31) e não muda a hipertrofia. A periodização ondulada supera a linear só em treinados. Bom candidato para a próxima leva. |
| Treino: periodização | Williams et al. 2017, *Sports Med*. DOI 10.1007/s40279-017-0734-y | MA | 202 | Não | Volume não equalizado. Conflita com Moesgaard. |
| Treino: ordem | Nunes JP et al. 2021, *Eur J Sport Sci*. DOI 10.1080/17461391.2020.1733672 | RS/MA | 86 | Não | Ganha mais força o exercício feito primeiro. Absorvido pelo ACSM 2026. |
| Treino: divisão | Ramos-Campo et al. 2024, *JSCR*. DOI 10.1519/JSC.0000000000004774 | RS/MA | 4 | Não | Com volume igual, treino dividido e full-body dão o mesmo resultado. |
| Treino: variação | Kassiano et al. 2022, *JSCR*. DOI 10.1519/JSC.0000000000004258 | RS | 45 (Crossref) | Não | Variar de forma sistemática ajuda. Variar de forma aleatória ou excessiva atrapalha. |
| Treino: amplitude | Wolf et al. 2023, *Int J Strength Cond*. DOI 10.47206/ijsc.v3i1.182 | MA | 31 | Sim | Vantagem trivial da amplitude completa. |
| Treino: amplitude | Varovic et al. 2025, *Int J Sports Med*. DOI 10.1055/a-2615-4935 | MA bayesiana | 4 | Preprint | Treinar com o músculo alongado tem efeito trivial na hipertrofia regional. |
| Treino: amplitude | Maeo et al. 2021, *MSSE*. DOI 10.1249/MSS.0000000000002523 | ECR intra-sujeito | 68 (Crossref) | Sim | Mesa flexora sentada fez os isquiotibiais crescerem 14%, contra 9% na deitada. |
| Treino: descanso | Schoenfeld et al. 2016, *JSCR*. DOI 10.1519/JSC.0000000000001272 | ECR | 180 | Não | Descansar 3 min superou descansar 1 min em treinados. |
| Treino: descanso | Grgic et al. 2017, *Eur J Sport Sci*. DOI 10.1080/17461391.2017.1340524 | RS | 125 | Não | Superado por Singer 2024. |
| Treino: deload | Coleman et al. 2024, *PeerJ*. DOI 10.7717/peerj.16777 | ECR, n=39 | 10 | Sim | Uma semana parado não tirou hipertrofia, mas reduziu a força. |
| Treino: cardio | Wilson et al. 2012, *JSCR*. DOI 10.1519/JSC.0b013e31823a3e2d | MA | 539 | Não | Interferência maior com corrida. Superado por Schumann. |
| Nutrição: proteína | Jäger et al. 2017 (ISSN proteína), *JISSN*. DOI 10.1186/s12970-017-0177-8 | Posicionamento | ~870 | Sim | 1,4–2,0 g/kg/dia e 20–40 g por dose. Números não foram relidos (ver conflitos). Forte candidato a entrar no núcleo depois da checagem. |
| Nutrição: proteína | Tagawa et al. 2021, *Nutr Rev*. DOI 10.1093/nutrit/nuaa104 | MA dose-resposta | ~120 | Sim | Retornos decrescentes acima de 1,3 g/kg/dia. |
| Nutrição: proteína | Tagawa et al. 2022, *Sports Med Open*. DOI 10.1186/s40798-022-00508-w | MA dose-resposta | ~50 | Sim | A força para de subir perto de 1,5 g/kg/dia. |
| Nutrição: proteína | Mazzulla et al. 2020, *J Nutr*. DOI 10.1093/jn/nxz249 | IAAO | ~30 | Sim | Mecanístico. Estimativa de ~2,0 g/kg não verificada. |
| Nutrição: proteína por refeição | Trommelen et al. 2023, *Cell Rep Med*. DOI 10.1016/j.xcrm.2023.101324 | ECR agudo | ~80 | Sim | 100 g de proteína superaram 25 g, com resposta por mais de 12 h. Não há teto rígido por refeição. |
| Nutrição: proteína por refeição | Areta et al. 2013, *J Physiol*. DOI 10.1113/jphysiol.2012.244897 | ECR agudo | ~490 | Verde | Clássico da distribuição de proteína ao longo do dia. |
| Nutrição: déficit | Helms, Zinn, Rowlands, Brown 2014, *IJSNEM*. DOI 10.1123/ijsnem.2013-0054 | RS | ~125 | Não | 2,3–3,1 g/kg de massa magra (o mesmo número do item 4). |
| Nutrição: déficit | Hector & Phillips 2018, *IJSNEM*. DOI 10.1123/ijsnem.2017-0273 | Revisão | ~135 | Sim | 1,6–2,4 g/kg/dia durante a perda de peso. |
| Nutrição: déficit | Longland et al. 2016, *AJCN*. DOI 10.3945/ajcn.115.119339 | ECR | ~270 | Sim | 2,4 g/kg superou 1,2 g/kg com déficit de ~40%. |
| Nutrição: déficit | Refalo, Trexler, Helms 2025, *Strength Cond J*. DOI 10.1519/SSC.0000000000000888 | Meta-regressão bayesiana | ~6 | Sim | Dose-resposta linear e sem platô no déficit. Exploratório. |
| Nutrição: déficit | Garthe et al. 2011, *IJSNEM*. DOI 10.1123/ijsnem.21.2.97 | ECR | ~210 | Não | Perder 0,7% do peso por semana preservou mais massa magra que perder 1,4%. |
| Nutrição: superávit | Helms et al. 2023, *Sports Med Open*. DOI 10.1186/s40798-023-00651-y | ECR, 17 concluintes | ~15 | Sim | Um superávit de 15% aumentou mais a gordura, sem ganho claro de músculo sobre 5%. |
| Nutrição: superávit | Slater et al. 2019, *Front Nutr*. DOI 10.3389/fnut.2019.00131 | Revisão | ~90 | Sim | O superávit ideal ainda é desconhecido. |
| Nutrição: geral | Roberts et al. 2020, *J Hum Kinet*. DOI 10.2478/hukin-2019-0096 | Revisão | ~65 | Sim | Atualiza Helms 2014 e Iraki 2019. |
| Nutrição: dietas | Aragon et al. 2017 (ISSN dietas), *JISSN*. DOI 10.1186/s12970-017-0174-y | Posicionamento | ~300 | Sim | Superado em parte por Aragon 2026. |
| Nutrição: gasto energético | Frankenfield et al. 2005, *J Am Diet Assoc*. DOI 10.1016/j.jada.2005.02.005 | RS | ~760 | Não | Justifica usar Mifflin. |
| Nutrição: gasto energético | O'Neill, Corish, Horner 2023, *Sports Med*. DOI 10.1007/s40279-023-01896-z | RS/MA, 29 estudos | não obtido | Sim | Em atletas, a equação de Ten-Haaf foi a mais precisa (80,2% dentro de ±10%). Cunningham também não diferiu do medido. |
| Nutrição: gasto energético | Cunningham 1980, *AJCN*. DOI 10.1093/ajcn/33.11.2372 | Reanálise | ~545 | Não | TMB = 500 + 22 × massa livre de gordura. Útil quando há % de gordura. |
| Nutrição: gasto energético | Tinsley et al. 2019, *APNM*. DOI 10.1139/apnm-2018-0412 | Validação | ~35 | Não | As equações subestimam a TMB de atletas de físico. |
| Nutrição: gasto energético | Jagim et al. 2018, *JSCR*. DOI 10.1519/JSC.0000000000002111 | Validação | ~90 | Não | Todas as equações subestimaram a TMB de atletas. |
| Nutrição: timing | Kerksick et al. 2017 (ISSN timing), *JISSN*. DOI 10.1186/s12970-017-0189-4 | Posicionamento | 617 | Sim | Reposição rápida de glicogênio: 1,2 g/kg/h. O tamanho da refeição antes do treino muda a necessidade de proteína depois. |
| Nutrição: timing | Schoenfeld, Aragon, Krieger 2013, *JISSN*. DOI 10.1186/1550-2783-10-53 | Meta-regressão | 201 | Sim | O horário da proteína não importa. O total diário é o que manda. |
| Nutrição: timing | Aragon & Schoenfeld 2013, *JISSN*. DOI 10.1186/1550-2783-10-5 | Revisão | 139 | Sim | Questiona a "janela anabólica". |
| Nutrição: timing | Schoenfeld et al. 2017, *PeerJ*. DOI 10.7717/peerj.2825 | ECR | 33 | Sim | 25 g de proteína antes ou depois do treino deram o mesmo resultado. |
| Nutrição: timing | Casuso & Goossens 2025, *Nutrients*. DOI 10.3390/nu17132070 | MA, 5 ECRs | novo | Sim | Sem efeito na massa magra. |
| Nutrição: geral | Kerksick et al. 2018 (ISSN review), *JISSN*. DOI 10.1186/s12970-018-0242-y | Revisão | 943 | Sim | Revisão ampla e aberta de dieta e suplementos. |
| Nutrição: carboidrato | Burke et al. 2011, *J Sports Sci*. DOI 10.1080/02640414.2011.585473 | Consenso COI | 981 | Sim | Carboidrato durante o exercício (30–60 g/h). Mais útil para endurance. |
| Nutrição: carboidrato | Slater & Phillips 2011, *J Sports Sci*. DOI 10.1080/02640414.2011.574722 | Revisão | 195 | Não | Esportes de força. |
| Nutrição: carboidrato | Escobar et al. 2016, *Br J Nutr*. DOI 10.1017/S0007114516003949 | Revisão | 29 | Sim | 3–7 g/kg pode ser mais do que o necessário. |
| Nutrição: carboidrato | Henselmans et al. 2026, *Nutrients*. DOI 10.3390/nu18121961 | ECR cruzado | novo | Sim | +50 g de carboidrato por dia não mudou as adaptações. |
| Nutrição: carboidrato | Hamidvand et al. 2025, *Physiol Rep*. DOI 10.14814/phy2.70683 | MA | novo | Sim | O glicogênio cai cerca de 11,2 mmol/kg por série. |
| Nutrição: hidratação | Sawka et al. 2007 (ACSM), *MSSE*. DOI 10.1249/mss.0b013e31802ca597 | Posicionamento | 1.496 | Não | Manter a perda de peso por suor abaixo de 2%. |
| Nutrição: hidratação | McDermott et al. 2017 (NATA), *J Athl Train*. DOI 10.4085/1062-6050-52.9.02 | Posicionamento | 434 | Verde | Medir a taxa de suor e evitar hiponatremia. |
| Nutrição: cetogênica | Leaf et al. 2024 (ISSN cetogênica), *JISSN*. DOI 10.1080/15502783.2024.2368167 | Posicionamento | 21 | Sim | Cetose exige menos de 50 g de carboidrato por dia. Efeito neutro ou negativo no desempenho. |
| Nutrição: cetogênica | Ashtary-Larky et al. 2022, *Crit Rev Food Sci Nutr*. DOI 10.1080/10408398.2021.1890689 | MA | 50 | Não | Cetogênica com musculação reduziu 1,26 kg de massa livre de gordura. |
| Nutrição: cetogênica | Vargas-Molina et al. 2022, *IJERPH*. DOI 10.3390/ijerph191912629 | MA | 17 | Sim | Sem diferença de massa livre de gordura. Conflita com o anterior. |
| Nutrição: cafeína | Guest et al. 2021 (ISSN cafeína), *JISSN*. DOI 10.1186/s12970-020-00383-4 | Posicionamento | 663 | Sim | Dose mínima eficaz pode ser de 2 mg/kg. Com 9 mg/kg, muitos efeitos colaterais. |
| Nutrição: cafeína | Grgic et al. 2020, *BJSM*. DOI 10.1136/bjsports-2018-100278 | Revisão guarda-chuva | 374 | Sim | Cafeína melhora força e resistência muscular. |
| Nutrição: cafeína | Grgic et al. 2018, *JISSN*. DOI 10.1186/s12970-018-0216-0 | MA | 364 | Sim | Força: SMD 0,20. |
| Nutrição: creatina | Ashtary-Larky et al. 2025, *JISSN*. DOI 10.1080/15502783.2025.2586523 | MA, 61 ECRs | novo | Sim | +1,39 kg de massa livre de gordura. É o maior e mais recente estudo. |
| Nutrição: creatina | Desai et al. 2024, *JSCR*. DOI 10.1519/JSC.0000000000004862 | MA | 22 | Verde | +1,14 kg de massa magra. |
| Nutrição: creatina | Burke R et al. 2023, *Nutrients*. DOI 10.3390/nu15092116 | MA bayesiana | 80 | Sim | Hipertrofia direta pequena (ES 0,11). |
| Nutrição: creatina | Antonio et al. 2021, *JISSN*. DOI 10.1186/s12970-021-00412-w | Revisão | 238 | Sim | Mitos sobre creatina (rins, cabelo, necessidade de saturação). |
| Nutrição: creatina | Wax et al. 2021, *Nutrients*. DOI 10.3390/nu13061915 | Revisão | 182 | Sim | Revisão geral. |
| Nutrição: creatina | Candow et al. 2023, *Nutrients*. DOI 10.3390/nu15204343 | MA | — | Sim | Só o DOI foi verificado. Os achados não foram extraídos. |
| Nutrição: suplementos | Jäger et al. 2025 (ISSN ômega-3), *JISSN*. DOI 10.1080/15502783.2024.2441775 | Posicionamento | 43 | Sim | Sem benefício para hipertrofia em jovens. |
| Nutrição: suplementos | Rathmacher et al. 2025 (ISSN HMB), *JISSN*. DOI 10.1080/15502783.2024.2434734 | Posicionamento | 33 | Sim | Seguro. A eficácia em treinados não foi extraída. |
| Nutrição: suplementos | Burke LM et al. 2026, *Int J Sports Med*. DOI 10.1055/a-2891-6315 | Revisão | novo | Sim | Classificação ABCD de suplementos do AIS. |
| Nutrição: suplementos | Maughan et al. 2018 (versão IJSNEM). DOI 10.1123/ijsnem.2018-0020 | Consenso | 536 | Sim | Mesmo texto do item 11. Não duplicar no acervo. |

## Antes de gravar, confira estes números e conflitos

Esta seção separa três tipos de problema: valores que os pesquisadores **não releram no texto completo**, pontos em que a evidência se contradiz e regras que **não estão nos papers**.

### Números que não foram verificados no texto completo

Nenhum valor desta lista deveria entrar no `resumo` sem uma checagem rápida no PDF.

**Morton 2018:** o intervalo de confiança do ponto de corte (**1,03–2,20 g/kg/dia**) não aparece no resumo do artigo. Ele é a base do "até 2,2 g/kg" ([Morton](https://doi.org/10.1136/bjsports-2017-097608)).

**Jäger 2017 (ISSN proteína):** os pontos do posicionamento não foram relidos porque o Europe PMC deu erro ([Jäger](https://doi.org/10.1186/s12970-017-0177-8)). São eles: 1,4–2,0 g/kg/dia, mais de 3,0 g/kg para recomposição corporal, 0,25 g/kg ou 20–40 g por dose e 30–40 g de caseína antes de dormir.

**Thomas 2016:** a tabela não pôde ser baixada (HTTP 402/403). As faixas de carboidrato de 3–5, 5–7, 6–10 e 8–12 g/kg, a gordura de 20–35% e os valores de hidratação são "valores padrão a conferir" ([Thomas](https://doi.org/10.1249/MSS.0000000000000852)).

**Revisões de fisiculturismo:**

- Iraki 2019: carboidrato de 3–5 g/kg e gordura de 0,5–1,5 g/kg ([Iraki](https://doi.org/10.3390/sports7070154)).
- Helms 2014: gordura de 15–30% da energia ([Helms 2014](https://doi.org/10.1186/1550-2783-11-20)).
- Slater & Phillips 2011: carboidrato de 4–7 g/kg ([Slater & Phillips](https://doi.org/10.1080/02640414.2011.574722)).

**Outros valores sem releitura:**

- Aragon & Schoenfeld 2013: refeições antes e depois do treino separadas por no máximo 3–4 h, com 0,4–0,5 g/kg de proteína cada ([Aragon & Schoenfeld](https://doi.org/10.1186/1550-2783-10-5)).
- Kreider 2017: dose de saturação de 0,3 g/kg/dia ([Kreider](https://doi.org/10.1186/s12970-017-0173-z)).
- ACSM 2007: pré-hidratação de 5–7 mL/kg ([Sawka](https://doi.org/10.1249/mss.0b013e31802ca597)).
- Aragon 2017: 2,3–3,1 g/kg de massa livre de gordura ([Aragon 2017](https://doi.org/10.1186/s12970-017-0174-y)).
- Mazzulla 2020: ~2,0 g/kg ([Mazzulla](https://doi.org/10.1093/jn/nxz249)).
- Areta 2013: 4×20 g a cada 3 h ([Areta](https://doi.org/10.1113/jphysiol.2012.244897)).
- Garthe 2013 ([Garthe 2013](https://doi.org/10.1080/17461391.2011.643923)).
- Garber 2011: 2–4 séries, 8–12 repetições e ≥48 h entre sessões do mesmo grupo muscular ([Garber](https://doi.org/10.1249/MSS.0b013e318213fefb)).

**Pelland:** as faixas de eficiência (4, 5–10, 11–18, 19–29 e 30–42 séries) e o efeito de **0,24% por série** vêm do **preprint**. A versão publicada pode ter mudado um pouco ([preprint Pelland](https://doi.org/10.51224/srxiv.460)).

**Refalo 2025:** a afirmação de que o benefício continua até ~3,2 g/kg de peso corporal vem de um blog. **Não entra** ([Refalo 2025](https://doi.org/10.1519/SSC.0000000000000888)).

**DOIs e metadados pendentes:**

- O DOI do posicionamento ISSN de esportes de combate 2025 (10.1080/15502783.2025.2467909) não foi resolvido.
- O DOI da equação de Ten-Haaf não foi verificado.
- A contagem de citações de O'Neill 2023 não foi obtida.
- Uma revisão de 2025 de Wolf et al. sobre treino com o músculo alongado foi excluída por falta de verificação.

**Acesso aberto ambíguo:** o OpenAlex classifica ACSM 2009 e Thomas 2016 como fechados. As notas, porém, dizem que o ACSM 2009 é "free on journal site" e que o Thomas 2016 saiu gratuito no JAND. Confirme antes de assumir que estão abertos.

### Onde a evidência se contradiz

**Frequência e força.** Pelland encontra um efeito próprio da frequência sobre a força. Isso contradiz Grgic 2018, para quem a frequência era só um jeito de acumular volume. Os autores atribuem a diferença aos modelos não lineares e à contagem fracionada de séries ([Pelland](https://doi.org/10.51224/srxiv.460); [Grgic 2018](https://doi.org/10.1007/s40279-018-0872-x)).

**Proximidade da falha.** Robinson 2024 vê benefício contínuo, para a hipertrofia, em parar mais perto da falha. Refalo 2023 não vê vantagem na falha momentânea. As duas coisas se conciliam: chegar perto da falha importa, mas a falha em si acrescenta pouco. O ECR de Refalo 2024 confirma essa leitura ([Robinson](https://doi.org/10.1007/s40279-024-02069-2); [Refalo 2023](https://doi.org/10.1007/s40279-022-01784-y); [Refalo 2024](https://doi.org/10.1080/02640414.2024.2321021)).

**Descanso.** O ACSM 2009 recomenda 1–2 min de descanso para hipertrofia, o que Schoenfeld 2016 e Singer 2024 contradizem de leve. O ACSM 2026 considera a hipertrofia inconclusiva nesse ponto ([Singer](https://doi.org/10.3389/fspor.2024.1429789); [Currier 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823)).

**Periodização.** Moesgaard 2022 só vê vantagem da periodização ondulada em treinados. Williams 2017 vê benefício maior em destreinados, mas sem equalizar o volume ([Moesgaard](https://doi.org/10.1007/s40279-021-01636-1); [Williams](https://doi.org/10.1007/s40279-017-0734-y)).

**Amplitude.** Wolf 2023 sugere uma possível vantagem das parciais com o músculo alongado. Varovic 2025 acha o efeito trivial, mas as condições comparadas diferiam só ~21,8% no comprimento muscular ([Varovic](https://doi.org/10.1055/a-2615-4935)).

**Cardio.** Wilson 2012 achou interferência, sobretudo com corrida. Schumann 2022 não achou nenhuma na hipertrofia, mas suas amostras eram pouco treinadas ([Schumann](https://doi.org/10.1007/s40279-021-01587-7)).

**Dieta cetogênica.** Ashtary-Larky 2022 viu −1,26 kg de massa livre de gordura. Vargas-Molina 2022, com só 111 treinados, não viu diferença. A divergência provavelmente vem de desenhos ad libitum vs dietas com energia controlada ([Ashtary-Larky 2022](https://doi.org/10.1080/10408398.2021.1890689); [Vargas-Molina](https://doi.org/10.3390/ijerph191912629)).

**Déficit.** O limite de ~500 kcal/dia de Murphy & Koehler é uma heurística. Ele saiu de uma meta-regressão pequena, com populações heterogêneas e muitos participantes destreinados ([Murphy & Koehler](https://doi.org/10.1111/sms.14075)).

### Regras que não estão nos papers

Várias regras práticas das notas são **sínteses dos pesquisadores, não achados**. Exemplos:

- volume por nível: 6–10, 10–20 e 20–30 séries;
- incrementos de carga de 2–5% para membros superiores;
- deload a cada 4–8 semanas, com 40–60% das séries;
- manter os exercícios por mesociclos de 4–8 semanas;
- cardio de 20–30 min;
- tetos de gordura corporal para usuários "magros".

Elas podem virar regra de negócio no código, mas não devem aparecer no `resumo` como se fossem conclusão de um paper.

## Pelland, ACSM 2026 e as meta-análises recentes aposentam os clássicos

No treino, **Pelland 2025/26 substitui Schoenfeld 2017** como referência de volume e substitui Schoenfeld 2016/2019 e Grgic 2018 em frequência ([Pelland](https://doi.org/10.1007/s40279-025-02344-w)). O **ACSM 2026 substitui formalmente o ACSM 2009** ([Currier 2026](https://doi.org/10.1249/MSS.0000000000003897)). Mesmo assim, vale manter o de 2009 por um motivo: é a única fonte que quantifica a progressão (2–10% de carga) e os níveis iniciante, intermediário e avançado. As faixas de 6–12RM para hipertrofia do ACSM 2009 estão **desatualizadas** frente às meta-análises de carga ([López](https://doi.org/10.1249/MSS.0000000000002585)).

**Robinson 2024** transforma Refalo 2023 e Grgic 2022 numa dose-resposta contínua. **Currier 2023** é a síntese mais ampla e alimenta o ACSM 2026. Nas demais variáveis, a substituição segue o mesmo padrão:

| Tema | Paper que vale | Paper que fica para trás |
|---|---|---|
| Descanso | Singer 2024 ([Singer](https://doi.org/10.3389/fspor.2024.1429789)) | Grgic 2017 |
| Cardio | Schumann 2022 | Wilson 2012 |
| Periodização | Moesgaard 2022 (volume equalizado) | Williams 2017 |
| Amplitude | Varovic 2025 | Wolf 2023 e Maeo 2021 (relativiza a vantagem do músculo alongado) |

Na nutrição, os papers mais recentes atualizam os anteriores sem trocar as regras de base:

- **Aragon 2026 substitui em parte Aragon 2017** no emagrecimento. Ele soma o ponto sobre a cetogênica reduzir mais a massa livre de gordura ([Aragon 2026](https://doi.org/10.1080/15502783.2026.2740266)).
- **Leaf 2024** é o posicionamento atual sobre dieta cetogênica.
- **Refalo 2025** atualiza Helms 2014 sobre proteína no déficit, mas é exploratório.
- **O'Neill 2023** supera os estudos isolados de validação de equações (Jagim 2018, Tinsley 2019) em atletas ([O'Neill](https://doi.org/10.1007/s40279-023-01896-z)).
- **Casuso & Goossens 2025** é a meta-análise mais nova sobre horário da proteína e confirma Schoenfeld 2013 ([Casuso](https://doi.org/10.3390/nu17132070)).
- Em creatina, **Ashtary-Larky 2025** (61 ECRs), Desai 2024 e Burke 2023 atualizam o tamanho do efeito. A dose e a segurança seguem com Kreider 2017 e o COI 2018.
- **Trommelen 2023** derruba o mito de um teto de 20–30 g por refeição, mas não invalida a recomendação de 0,4 g/kg em 4 ou mais refeições ([Trommelen](https://doi.org/10.1016/j.xcrm.2023.101324)).
- **Helms 2023** refina Iraki 2019 a favor de superávits pequenos em treinados ([Helms 2023](https://doi.org/10.1186/s40798-023-00651-y)).
- **Henselmans 2022 e 2026** reduzem a necessidade de carboidrato que o Thomas 2016 sugere para quem faz só musculação.

Para a maior parte dos pontos de nutrição não há nada mais novo: nenhum paper posterior substitui Morton e Nunes em proteína diária, o Thomas 2016 em macronutrientes, o ACSM 2007 e o NATA 2017 em hidratação, nem o COI 2018 em suplementos.

## Conclusão

Os papers de maior impacto continuam importantes, mas o mais útil para o prompt é o mais recente. Os campeões de citação (ACSM 2009 com 4.330, Mifflin com ~2.540, ACSM 2007 com 1.496) são em geral fechados e anteriores às sínteses que os substituíram. Já os papers que mais mudam a prescrição (Pelland, ACSM 2026, Robinson, Aragon 2026) ainda têm poucas citações porque acabaram de sair. Ordenar só por citação levaria o app a repetir faixas superadas, como 6–12RM para hipertrofia, 1–2 min de descanso e carboidrato de endurance para quem só treina força.

Na prática, o núcleo de 25 entradas cobre todas as decisões que o gerador toma. Cada `resumo` cabe em uma ou duas frases numéricas, e o custo de tokens fica baixo. Três itens merecem atenção antes de entrar no acervo: o Thomas 2016 (números não relidos e acesso ambíguo), o Pelland (números do preprint) e o Jäger 2017, que ficou fora do núcleo só por falta de verificação. Há também lacunas sem meta-análise boa: modelos de progressão autorregulada, limite de séries úteis por sessão e multiplicadores de atividade para calcular o gasto total. Nesses pontos o app vai depender de regras de negócio, e convém deixá-las explícitas no código, não atribuídas a um artigo.
