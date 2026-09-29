/**
 * Dias consecutivos de treino terminando hoje (ou ontem, se hoje ainda não
 * treinou — a streak só quebra quando um dia inteiro passa em branco).
 * Datas no formato AAAA-MM-DD, mesmo formato do SetLog.sessionDate.
 */
export function computeStreakDays(
  sessionDates: string[],
  today: string,
): number {
  if (sessionDates.length === 0) return 0;
  const days = new Set(sessionDates);

  let cursor = days.has(today) ? today : previousDay(today);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = previousDay(cursor);
  }
  return streak;
}

function previousDay(isoDate: string): string {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d - 1);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}
