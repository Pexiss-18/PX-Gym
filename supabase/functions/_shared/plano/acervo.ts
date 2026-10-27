/**
 * Acervo científico que embasa os planos. Cada artigo entra resumido (só o
 * que muda a prescrição) e vai inteiro no prompt; a IA devolve os ids que
 * usou, e o app mostra "baseado em".
 *
 * Curadoria manual: prefira artigos de acesso aberto e mantenha o resumo
 * curto — o plano gratuito limita os tokens por minuto.
 */
export type Artigo = {
  /** Slug estável, ex.: "schoenfeld-2017-volume". */
  id: string;
  titulo: string;
  /** Autores, periódico, ano e DOI/link. */
  referencia: string;
  /** Onde o artigo se aplica. */
  temas: ("treino" | "nutricao")[];
  /** Achados e números que orientam a prescrição. */
  resumo: string;
};

// Curadoria de 27/10/2026 — relatório em reports/Artigos de treino e nutrição.md.
// Números marcados "conferir" no relatório (faixas de carboidrato/gordura do
// Thomas 2016 e tiers do Pelland, que vêm do preprint) ainda pedem checagem no
// texto completo.
export const ACERVO: Artigo[] = [
  // ── Treino ──────────────────────────────────────────────────────────────
  {
    id: "currier-2026-acsm",
    titulo: "ACSM Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults",
    referencia: "Currier BS et al. Med Sci Sports Exerc 2026;58(4):851–872. DOI 10.1249/MSS.0000000000003897",
    temas: ["treino"],
    resumo:
      "Treinar todos os grandes grupos ≥2×/semana. Com volume igual, a hipertrofia é a mesma em 1 ou >5 dias/semana. O exercício feito primeiro ganha mais força. Ordem, peso livre vs máquina e periodização não mudam a hipertrofia.",
  },
  {
    id: "pelland-2026-volume-frequencia",
    titulo: "The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains",
    referencia: "Pelland JC et al. Sports Med 2026;56:481–505. DOI 10.1007/s40279-025-02344-w (preprint 10.51224/srxiv.460)",
    temas: ["treino"],
    resumo:
      "Hipertrofia: mínimo de 4 séries/músculo/semana; melhor custo-benefício em 5–10; mais séries ainda ajudam, com retorno decrescente. Série como sinergista conta 0,5. Força: platô perto de 4 séries/semana; mais frequência ajuda a força.",
  },
  {
    id: "currier-2023-nma",
    titulo: "Resistance training prescription for muscle strength and hypertrophy in healthy adults: a systematic review and Bayesian network meta-analysis",
    referencia: "Currier BS et al. Br J Sports Med 2023;57(18):1211–1220. DOI 10.1136/bjsports-2023-106807",
    temas: ["treino"],
    resumo:
      "Hipertrofia: várias séries, carga mais alta, 2×/semana. Força: >80% 1RM, várias séries, 3×/semana. Todas as prescrições testadas geraram hipertrofia parecida.",
  },
  {
    id: "robinson-2024-proximidade-falha",
    titulo: "Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy",
    referencia: "Robinson ZP et al. Sports Med 2024;54:2209–2231. DOI 10.1007/s40279-024-02069-2",
    temas: ["treino"],
    resumo:
      "Quanto mais perto da falha a série termina, maior a hipertrofia. O ganho de força é parecido numa faixa ampla de RIR.",
  },
  {
    id: "refalo-2023-falha",
    titulo: "Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy",
    referencia: "Refalo MC et al. Sports Med 2023;53(3). DOI 10.1007/s40279-022-01784-y",
    temas: ["treino"],
    resumo:
      "Treinar até a falha momentânea não deu vantagem significativa de hipertrofia sobre parar antes dela.",
  },
  {
    id: "lopez-2021-carga",
    titulo: "Resistance Training Load Effects on Muscle Hypertrophy and Strength Gain: Systematic Review and Network Meta-analysis",
    referencia: "López P et al. Med Sci Sports Exerc 2021;53(6). DOI 10.1249/MSS.0000000000002585",
    temas: ["treino"],
    resumo:
      "Perto da falha, a hipertrofia é igual com carga baixa (>15RM), moderada (9–15RM) ou alta (≤8RM). Para força, carga alta supera a baixa.",
  },
  {
    id: "acsm-2009-progressao",
    titulo: "Progression Models in Resistance Training for Healthy Adults",
    referencia: "American College of Sports Medicine (Ratamess NA et al.). Med Sci Sports Exerc 2009;41(3):687–708. DOI 10.1249/MSS.0b013e3181915670",
    temas: ["treino"],
    resumo:
      "Aumentar a carga 2–10% quando o aluno fizer 1–2 repetições acima da meta. Iniciante: 8–12RM, 2–3 dias/semana; intermediário: 3–4; avançado: 4–5.",
  },
  {
    id: "plotkin-2022-progressao-reps",
    titulo: "Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations",
    referencia: "Plotkin D et al. PeerJ 2022;10:e14142. DOI 10.7717/peerj.14142",
    temas: ["treino"],
    resumo:
      "Progredir em repetições com carga fixa funcionou tão bem quanto progredir em carga, para hipertrofia e 1RM. Útil quando o salto de peso do aparelho é grande.",
  },
  {
    id: "singer-2024-descanso",
    titulo: "Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy",
    referencia: "Singer A et al. Front Sports Act Living 2024;6:1429789. DOI 10.3389/fspor.2024.1429789",
    temas: ["treino"],
    resumo:
      "Descansar mais de 60 s entre séries dá um pequeno ganho de hipertrofia; acima de 90 s o benefício extra é incerto.",
  },
  {
    id: "pallares-2021-amplitude",
    titulo: "Effects of range of motion on resistance training adaptations: A systematic review and meta-analysis",
    referencia: "Pallarés JG et al. Scand J Med Sci Sports 2021;31(10):1866–1881. DOI 10.1111/sms.14006",
    temas: ["treino"],
    resumo:
      "Amplitude completa supera a parcial em força e em hipertrofia de membros inferiores. Usar amplitude completa por padrão.",
  },
  {
    id: "schumann-2022-concorrente",
    titulo: "Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function",
    referencia: "Schumann M et al. Sports Med 2022;52(3):601–612. DOI 10.1007/s40279-021-01587-7",
    temas: ["treino"],
    resumo:
      "Aeróbico junto com musculação não prejudica hipertrofia nem força máxima. A força explosiva cai, sobretudo na mesma sessão; com ≥3 h de intervalo, a queda some.",
  },
  {
    id: "bell-2023-deload",
    titulo: "Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach",
    referencia: "Bell L et al. Sports Med Open 2023;9:87. DOI 10.1186/s40798-023-00633-0",
    temas: ["treino"],
    resumo:
      "No deload, reduzir o volume (séries, repetições ou dias), manter a carga e treinar mais longe da falha. Não há intervalo fixo consensual.",
  },
  {
    id: "oms-2020-atividade-fisica",
    titulo: "World Health Organization 2020 guidelines on physical activity and sedentary behaviour",
    referencia: "Bull FC et al. Br J Sports Med 2020;54(24):1451–1462. DOI 10.1136/bjsports-2020-102955",
    temas: ["treino"],
    resumo:
      "150–300 min/semana de atividade moderada ou 75–150 de vigorosa, mais fortalecimento muscular ≥2 dias/semana. Acima de 65 anos, treino multicomponente ≥3 dias/semana.",
  },

  // ── Nutrição ────────────────────────────────────────────────────────────
  {
    id: "morton-2018-proteina",
    titulo: "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults",
    referencia: "Morton RW et al. Br J Sports Med 2018;52(6):376–384. DOI 10.1136/bjsports-2017-097608",
    temas: ["nutricao"],
    resumo:
      "Acima de ~1,6 g/kg/dia de proteína total não há ganho extra de massa magra; o efeito diminui com a idade.",
  },
  {
    id: "nunes-2022-proteina",
    titulo: "Systematic review and meta-analysis of protein intake to support muscle mass and function in healthy adults",
    referencia: "Nunes EA et al. J Cachexia Sarcopenia Muscle 2022;13(2):795–810. DOI 10.1002/jcsm.12922",
    temas: ["nutricao"],
    resumo:
      "Com treino de força, mais proteína aumenta a massa magra: abaixo de 65 anos a partir de 1,6 g/kg/dia; a partir de 65, já com 1,2–1,59 g/kg/dia.",
  },
  {
    id: "schoenfeld-aragon-2018-por-refeicao",
    titulo: "How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution",
    referencia: "Schoenfeld BJ, Aragon AA. J Int Soc Sports Nutr 2018;15:10. DOI 10.1186/s12970-018-0215-1",
    temas: ["nutricao"],
    resumo:
      "Distribuir a proteína em ≥4 refeições de ~0,4 g/kg (até 0,55 g/kg por refeição para chegar a 2,2 g/kg/dia).",
  },
  {
    id: "helms-2014-preparacao",
    titulo: "Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation",
    referencia: "Helms ER, Aragon AA, Fitschen PJ. J Int Soc Sports Nutr 2014;11:20. DOI 10.1186/1550-2783-11-20",
    temas: ["nutricao"],
    resumo:
      "No emagrecimento, ajustar calorias para perder 0,5–1% do peso por semana, com proteína de 2,3–3,1 g/kg de massa magra.",
  },
  {
    id: "murphy-koehler-2022-deficit",
    titulo: "Energy deficiency impairs resistance training gains in lean mass but not strength: A meta-analysis and meta-regression",
    referencia: "Murphy C, Koehler K. Scand J Med Sci Sports 2022;32(1):125–137. DOI 10.1111/sms.14075",
    temas: ["nutricao"],
    resumo:
      "Déficit de ~500 kcal/dia já impede o ganho de massa magra, mas preserva a força. Evitar déficits maiores que 500 kcal/dia quando o objetivo inclui ganhar músculo.",
  },
  {
    id: "iraki-2019-off-season",
    titulo: "Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review",
    referencia: "Iraki J et al. Sports 2019;7(7):154. DOI 10.3390/sports7070154",
    temas: ["nutricao"],
    resumo:
      "Para ganhar massa: superávit de 10–20%, mirando +0,25–0,5% do peso por semana (avançados, menos). Proteína de 1,6–2,2 g/kg/dia em 3–6 refeições.",
  },
  {
    id: "mifflin-1990-tmb",
    titulo: "A new predictive equation for resting energy expenditure in healthy individuals",
    referencia: "Mifflin MD et al. Am J Clin Nutr 1990;51(2):241–247. DOI 10.1093/ajcn/51.2.241",
    temas: ["nutricao"],
    resumo:
      "TMB homens = 10×kg + 6,25×cm − 5×idade + 5; mulheres = mesma conta − 161. É a equação que mais acerta (±10%) em adultos saudáveis.",
  },
  {
    id: "thomas-2016-acsm-nutricao",
    titulo: "Nutrition and Athletic Performance (ACSM/AND/DC joint position statement)",
    referencia: "Thomas DT, Erdman KA, Burke LM. Med Sci Sports Exerc 2016;48(3):543–568. DOI 10.1249/MSS.0000000000000852",
    temas: ["nutricao"],
    resumo:
      "Proteína 1,2–2,0 g/kg/dia. Carboidrato 3–5 g/kg/dia em treino leve e 5–7 g/kg/dia com ~1 h/dia de treino. Gordura 20–35% da energia.",
  },
  {
    id: "henselmans-2022-carboidrato",
    titulo: "The Effect of Carbohydrate Intake on Strength and Resistance Training Performance: A Systematic Review",
    referencia: "Henselmans M et al. Nutrients 2022;14(4):856. DOI 10.3390/nu14040856",
    temas: ["nutricao"],
    resumo:
      "Mais carboidrato não melhora o desempenho de quem treina alimentado com até ~10 séries por músculo por sessão. Para musculação, não exigir carboidrato alto.",
  },
  {
    id: "aragon-2026-issn-emagrecimento",
    titulo: "International Society of Sports Nutrition position stand: diets for body weight reduction",
    referencia: "Aragon A et al. J Int Soc Sports Nutr 2026;23(1):2740266. DOI 10.1080/15502783.2026.2740266",
    temas: ["nutricao"],
    resumo:
      "A proporção carboidrato/gordura pode seguir a preferência do usuário. Jejum intermitente não supera restrição contínua. Dietas abaixo de 1.200 kcal não dão vantagem a longo prazo. Cetogênica tende a perder mais massa magra.",
  },
  {
    id: "maughan-2018-coi-suplementos",
    titulo: "IOC consensus statement: dietary supplements and the high-performance athlete",
    referencia: "Maughan RJ et al. Br J Sports Med 2018;52(7):439–455. DOI 10.1136/bjsports-2018-099027",
    temas: ["nutricao"],
    resumo:
      "Só cafeína, creatina, tamponantes e nitrato têm boa evidência. Cafeína 3–6 mg/kg ~60 min antes. Creatina 3–5 g/dia (opcional: 20 g/dia por 5–7 dias antes). Vitamina D só após exame.",
  },
  {
    id: "kreider-2017-creatina",
    titulo: "International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine",
    referencia: "Kreider RB et al. J Int Soc Sports Nutr 2017;14:18. DOI 10.1186/s12970-017-0173-z",
    temas: ["nutricao"],
    resumo:
      "Creatina é segura em pessoas saudáveis (até 30 g/dia por 5 anos nos estudos). ~3 g/dia contínuos já trazem benefício.",
  },
];
