/** Um dia da faixa semanal do dashboard. */
export type WeekActivityDay = {
  /** AAAA-MM-DD. */
  date: string;
  /** Inicial do dia em pt-BR: D, S, T, Q, Q, S, S. */
  label: string;
  /** Houve pelo menos uma série registrada nesse dia. */
  done: boolean;
  /** É o dia de hoje. */
  isToday: boolean;
};

const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

/**
 * Os últimos 7 dias terminando hoje, marcando quais tiveram treino.
 *
 * Janela deslizante (não semana do calendário) porque o dashboard responde
 * "como foi minha última semana", não "que dia da semana é hoje".
 */
export function computeWeekActivity(
  sessionDates: string[],
  today: string,
  days = 7,
): WeekActivityDay[] {
  const done = new Set(sessionDates);
  const result: WeekActivityDay[] = [];

  for (let back = days - 1; back >= 0; back--) {
    const date = shiftDays(today, -back);
    result.push({
      date,
      label: WEEKDAY_INITIALS[weekdayIndex(date)]!,
      done: done.has(date),
      isToday: back === 0,
    });
  }
  return result;
}

function shiftDays(isoDate: string, delta: number): string {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function weekdayIndex(isoDate: string): number {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
