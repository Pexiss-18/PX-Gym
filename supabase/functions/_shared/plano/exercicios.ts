/**
 * Catálogo fechado de exercícios. A IA só escolhe ids daqui — é o que mantém
 * o histórico de carga (set_logs.exercise_id) e o QR dos aparelhos coerentes
 * de um plano pro outro.
 */
export type ExercicioDoCatalogo = {
  id: string;
  nome: string;
  grupo: string;
  equipamento: "barra" | "halteres" | "maquina" | "cabo" | "peso-corporal";
  /** Regiões que o exercício sobrecarrega — pesa contra as restrições do usuário. */
  atencao?: string;
};

export const EXERCICIOS: ExercicioDoCatalogo[] = [
  // Peito
  { id: "supino-reto", nome: "Supino reto com barra", grupo: "Peito", equipamento: "barra", atencao: "ombro" },
  { id: "supino-reto-halteres", nome: "Supino reto com halteres", grupo: "Peito", equipamento: "halteres" },
  { id: "supino-inclinado-barra", nome: "Supino inclinado com barra", grupo: "Peito", equipamento: "barra", atencao: "ombro" },
  { id: "supino-inclinado-halteres", nome: "Supino inclinado com halteres", grupo: "Peito", equipamento: "halteres" },
  { id: "supino-maquina", nome: "Supino na máquina", grupo: "Peito", equipamento: "maquina" },
  { id: "crucifixo-halteres", nome: "Crucifixo com halteres", grupo: "Peito", equipamento: "halteres" },
  { id: "crucifixo-cabo", nome: "Crucifixo no cabo", grupo: "Peito", equipamento: "cabo" },
  { id: "peck-deck", nome: "Peck deck", grupo: "Peito", equipamento: "maquina" },
  { id: "flexao-de-bracos", nome: "Flexão de braços", grupo: "Peito", equipamento: "peso-corporal", atencao: "punho" },
  // Costas
  { id: "barra-fixa", nome: "Barra fixa", grupo: "Costas", equipamento: "peso-corporal", atencao: "ombro (acima da cabeça)" },
  { id: "puxada-frontal", nome: "Puxada frontal na polia", grupo: "Costas", equipamento: "cabo", atencao: "ombro (acima da cabeça)" },
  { id: "puxada-triangulo", nome: "Puxada com triângulo", grupo: "Costas", equipamento: "cabo", atencao: "ombro (acima da cabeça)" },
  { id: "remada-curvada", nome: "Remada curvada com barra", grupo: "Costas", equipamento: "barra", atencao: "lombar" },
  { id: "remada-unilateral-halter", nome: "Remada unilateral com halter", grupo: "Costas", equipamento: "halteres" },
  { id: "remada-baixa", nome: "Remada baixa no cabo", grupo: "Costas", equipamento: "cabo" },
  { id: "remada-maquina", nome: "Remada na máquina", grupo: "Costas", equipamento: "maquina" },
  { id: "pulldown-braco-reto", nome: "Pulldown com braços estendidos", grupo: "Costas", equipamento: "cabo" },
  { id: "levantamento-terra", nome: "Levantamento terra", grupo: "Costas", equipamento: "barra", atencao: "lombar" },
  // Ombros
  { id: "desenvolvimento-barra", nome: "Desenvolvimento com barra", grupo: "Ombros", equipamento: "barra", atencao: "ombro (acima da cabeça)" },
  { id: "desenvolvimento-halteres", nome: "Desenvolvimento com halteres", grupo: "Ombros", equipamento: "halteres", atencao: "ombro (acima da cabeça)" },
  { id: "desenvolvimento-maquina", nome: "Desenvolvimento na máquina", grupo: "Ombros", equipamento: "maquina", atencao: "ombro (acima da cabeça)" },
  { id: "elevacao-lateral", nome: "Elevação lateral com halteres", grupo: "Ombros", equipamento: "halteres" },
  { id: "elevacao-lateral-cabo", nome: "Elevação lateral no cabo", grupo: "Ombros", equipamento: "cabo" },
  { id: "elevacao-frontal", nome: "Elevação frontal com halteres", grupo: "Ombros", equipamento: "halteres", atencao: "ombro" },
  { id: "crucifixo-inverso", nome: "Crucifixo inverso", grupo: "Ombros", equipamento: "halteres" },
  { id: "face-pull", nome: "Face pull", grupo: "Ombros", equipamento: "cabo" },
  { id: "encolhimento-halteres", nome: "Encolhimento com halteres", grupo: "Ombros", equipamento: "halteres" },
  // Bíceps
  { id: "rosca-direta", nome: "Rosca direta com barra", grupo: "Bíceps", equipamento: "barra" },
  { id: "rosca-alternada", nome: "Rosca alternada com halteres", grupo: "Bíceps", equipamento: "halteres" },
  { id: "rosca-martelo", nome: "Rosca martelo", grupo: "Bíceps", equipamento: "halteres" },
  { id: "rosca-scott", nome: "Rosca Scott", grupo: "Bíceps", equipamento: "maquina" },
  { id: "rosca-cabo", nome: "Rosca no cabo", grupo: "Bíceps", equipamento: "cabo" },
  // Tríceps
  { id: "triceps-corda", nome: "Tríceps na polia com corda", grupo: "Tríceps", equipamento: "cabo" },
  { id: "triceps-barra-polia", nome: "Tríceps na polia com barra", grupo: "Tríceps", equipamento: "cabo" },
  { id: "triceps-frances", nome: "Tríceps francês", grupo: "Tríceps", equipamento: "halteres", atencao: "ombro (acima da cabeça), cotovelo" },
  { id: "triceps-testa", nome: "Tríceps testa", grupo: "Tríceps", equipamento: "barra", atencao: "cotovelo" },
  { id: "mergulho-paralelas", nome: "Mergulho nas paralelas", grupo: "Tríceps", equipamento: "peso-corporal", atencao: "ombro" },
  // Quadríceps
  { id: "agachamento-livre", nome: "Agachamento livre", grupo: "Quadríceps", equipamento: "barra", atencao: "lombar, joelho" },
  { id: "agachamento-goblet", nome: "Agachamento goblet", grupo: "Quadríceps", equipamento: "halteres", atencao: "joelho" },
  { id: "agachamento-hack", nome: "Agachamento hack", grupo: "Quadríceps", equipamento: "maquina", atencao: "joelho" },
  { id: "leg-press", nome: "Leg press 45°", grupo: "Quadríceps", equipamento: "maquina", atencao: "joelho" },
  { id: "cadeira-extensora", nome: "Cadeira extensora", grupo: "Quadríceps", equipamento: "maquina", atencao: "joelho" },
  { id: "afundo", nome: "Afundo com halteres", grupo: "Quadríceps", equipamento: "halteres", atencao: "joelho" },
  { id: "agachamento-bulgaro", nome: "Agachamento búlgaro", grupo: "Quadríceps", equipamento: "halteres", atencao: "joelho" },
  // Posteriores e glúteos
  { id: "stiff", nome: "Stiff com barra", grupo: "Posteriores", equipamento: "barra", atencao: "lombar" },
  { id: "levantamento-terra-romeno", nome: "Levantamento terra romeno com halteres", grupo: "Posteriores", equipamento: "halteres", atencao: "lombar" },
  { id: "mesa-flexora", nome: "Mesa flexora", grupo: "Posteriores", equipamento: "maquina" },
  { id: "cadeira-flexora", nome: "Cadeira flexora", grupo: "Posteriores", equipamento: "maquina" },
  { id: "elevacao-pelvica", nome: "Elevação pélvica", grupo: "Glúteos", equipamento: "barra", atencao: "lombar" },
  { id: "gluteo-cabo", nome: "Extensão de quadril no cabo", grupo: "Glúteos", equipamento: "cabo" },
  { id: "cadeira-abdutora", nome: "Cadeira abdutora", grupo: "Glúteos", equipamento: "maquina" },
  { id: "cadeira-adutora", nome: "Cadeira adutora", grupo: "Adutores", equipamento: "maquina" },
  // Panturrilha
  { id: "panturrilha-em-pe", nome: "Panturrilha em pé", grupo: "Panturrilha", equipamento: "maquina" },
  { id: "panturrilha-sentado", nome: "Panturrilha sentado", grupo: "Panturrilha", equipamento: "maquina" },
  // Core
  { id: "prancha", nome: "Prancha", grupo: "Core", equipamento: "peso-corporal" },
  { id: "abdominal-supra", nome: "Abdominal supra", grupo: "Core", equipamento: "peso-corporal" },
  { id: "abdominal-infra", nome: "Elevação de pernas", grupo: "Core", equipamento: "peso-corporal" },
  { id: "abdominal-cabo", nome: "Abdominal no cabo", grupo: "Core", equipamento: "cabo" },
];

export const EXERCICIO_POR_ID = new Map(EXERCICIOS.map((exercicio) => [exercicio.id, exercicio]));
