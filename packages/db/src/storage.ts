/** Caminho padronizado: {userId}/... — as políticas RLS do storage dependem disso. */

export function assessmentPdfPath(userId: string, assessmentId: string) {
  return `${userId}/${assessmentId}.pdf`;
}

// A chave das fotos de progresso ({userId}/{photoId}.jpg) é montada só no
// servidor, na Edge Function photo-storage, com o userId do JWT.
