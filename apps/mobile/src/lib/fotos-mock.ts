import { useSyncExternalStore } from "react";

/*
 * Fotos de progresso no modo mock: galeria em memória e "câmera" simulada.
 * Nada de SQLite, Supabase, expo-camera nem pedido de permissão — a captura
 * gera uma foto de demonstração que a galeria desenha sem arquivo.
 */

export type FotoMock = {
  id: string;
  /** Sem arquivo: a galeria desenha a miniatura de demonstração. */
  demo: true;
  takenAt: Date;
  syncStatus: "pending" | "synced";
};

const DIA = 24 * 60 * 60 * 1000;

let fotos: FotoMock[] = [7, 14].map((diasAtras, i) => ({
  id: `foto-demo-${i + 1}`,
  demo: true as const,
  takenAt: new Date(Date.now() - diasAtras * DIA),
  syncStatus: "synced" as const,
}));

const ouvintes = new Set<() => void>();

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** "Tira" uma foto: entra na galeria como pendente de envio, na hora. */
export function tirarFotoMock(): FotoMock {
  const foto: FotoMock = {
    id: `foto-demo-${fotos.length + 1}-${Date.now()}`,
    demo: true,
    takenAt: new Date(),
    syncStatus: "pending",
  };
  fotos = [foto, ...fotos];
  ouvintes.forEach((o) => o());
  return foto;
}

/** Galeria em memória, mais recente primeiro. */
export function useFotosMock(): FotoMock[] {
  return useSyncExternalStore(assinar, () => fotos);
}
