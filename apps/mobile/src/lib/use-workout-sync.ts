import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "./auth-context";
import { trySyncSetLogs } from "./workout";

/**
 * Mantém o SQLite e o Supabase em dia: tenta sincronizar os registros
 * pendentes ao entrar no app, quando a conexão volta (NetInfo) e quando o
 * app volta pro foreground. Falhas são silenciosas — os registros continuam
 * pending e a próxima janela tenta de novo.
 */
export function useWorkoutSync() {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;

    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        await trySyncSetLogs(userId);
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
