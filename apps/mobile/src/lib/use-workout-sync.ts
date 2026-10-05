import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "@/adapters/hooks/useAuth";
import { MODO_MOCK } from "./modo";
import { trySyncSetLogs } from "./workout";
import { trySyncPhotos } from "./photos";

/**
 * Mantém o SQLite e o Supabase em dia: tenta sincronizar os registros e as
 * fotos pendentes ao entrar no app, quando a conexão volta (NetInfo) e quando
 * o app volta pro foreground. Falhas são silenciosas — tudo continua pending
 * e a próxima janela tenta de novo. No modo mock não há o que sincronizar.
 */
export function useWorkoutSync() {
  const { sessao } = useAuth();
  const userId = sessao?.usuario.id;

  useEffect(() => {
    if (!userId || MODO_MOCK) return;

    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        await trySyncSetLogs(userId);
        await trySyncPhotos();
      } finally {
        running = false;
      }
    };

    void run();

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) void run();
    });
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
    });

    return () => {
      unsubscribeNet();
      appStateSub.remove();
    };
  }, [userId]);
}
